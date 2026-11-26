// Plays the cloud save rules of shop.js and sim.js in node vms, one per device, against two fake clouds that behave like the
// native bridges. The Android one holds one copy with its stamp and refuses a put whose base is another stamp. The iPhone one
// keeps a key per device, never refuses, and delivers each write to the others when told to (lag holds it back), as iCloud's
// key-value store does.
//   node scripts/check_cloud.mjs
// The rules: every copy gets a stamp, each device keeps the stamp of the copy it last agreed with and the signature of its game
// then, a copy that comes (whenever it comes) is taken by a game that has not changed since, and when both sides changed the one
// with more play is kept; what either side bought is paid to the kept one once, and a refund removes Skip ads and x2 from both.
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const good = JSON.parse(fs.readFileSync(path.join(root, 'scripts', 'fixtures', 'save-v11.json'), 'utf8').trim());
const src = ['i18n.js', 'lang/en.js', 'data.js', 'sim.js', 'shop.js'].map(f => [f, fs.readFileSync(path.join(root, f), 'utf8')]);

const H = 3600000;
const T9 = Date.UTC(2026, 0, 1, 9);
const T12 = T9 + 3 * H;
const T17 = T9 + 8 * H;
const PID = 'com.aytutuna.mainstreet.';
const CLOUD_EVERY = 30000;
let now = T9;
let tick = 0;
let failed = false;
const fail = msg => { console.error('FAIL: ' + msg); failed = true; };
const expect = (ok, msg) => { if (!ok) fail(msg); };

function newCloud() {
  const c = { json: null, at: 0, dev: '', stamp: '' };
  c.ev = refused => ({ t: 'cloud', json: c.json, at: c.at, dev: c.dev, stamp: c.stamp, refused: !!refused });
  return c;
}

// a key-value store with one key per device: a device writes its own key, and the others see it after it is delivered
function newKeys() {
  return { ios: true, keys: {}, devs: [] };
}

// the clock of the page and the server move together; every timer of the given devices that falls due is run, in order, and
// what the native side answered is delivered after each
function elapse(ms, ...devs) {
  const end = tick + ms;
  for (;;) {
    let first = null;
    for (const d of devs) for (const t of d.timers) if (t.at <= end && (!first || t.at < first.t.at)) first = { d, t };
    if (!first) break;
    const step = Math.max(0, first.t.at - tick);
    tick += step;
    now += step;
    if (first.t.every) first.t.at += first.t.every;
    else first.d.timers = first.d.timers.filter(t => t !== first.t);
    first.t.fn();
    devs.forEach(d => d.pump());
  }
  now += end - tick;
  tick = end;
}

const iosEv = (e, more) => ({ t: 'cloud', json: e ? e.json : null, at: e ? e.at : 0, dev: e ? e.dev : '', stamp: e ? e.stamp : '', refused: false, put: '', more: !!more });

// one device: its own page (vm), its own local storage, and the native side answering its messages one pump later, as the
// real bridges do. hold keeps the answers back, fail makes puts fail, drop loses them without a word, stale is what a cache that has not synced answers to a read
function device(cloud, st = {}, opts = {}) {
  const dev = { st, cloud, posts: [], inbox: [], hold: false, fail: false, drop: false, out: false, unavail: false, fails: [], seen: {}, lagged: [], offline: false, mine: '', synced: false, timers: [] };
  let timerId = 0;
  const addTimer = (fn, ms, every) => {
    dev.timers.push({ id: ++timerId, at: tick + (ms || 0), fn, every });
    return timerId;
  };
  const dropTimer = id => { dev.timers = dev.timers.filter(t => t.id !== id); };
  if (cloud.ios) {
    cloud.devs.push(dev);
    dev.seen = { ...cloud.keys };
  }
  const els = {};
  const ctx = {
    console,
    localStorage: {
      getItem: k => (k in st ? st[k] : null),
      setItem: (k, v) => { st[k] = String(v); },
      removeItem: k => { delete st[k]; }
    },
    performance: { now: () => tick },
    btoa: s => Buffer.from(s).toString('base64'),
    atob: s => Buffer.from(s, 'base64').toString(),
    document: { write() {}, addEventListener() {}, documentElement: {}, hidden: false },
    navigator: { language: 'en', userAgent: cloud.ios ? '' : 'Android' },
    location: { search: '', protocol: 'app:' },
    setTimeout: (fn, ms) => addTimer(fn, ms, 0),
    clearTimeout: dropTimer,
    setInterval: (fn, ms) => addTimer(fn, ms, ms),
    clearInterval: dropTimer,
    $: id => (els[id] = els[id] || { hidden: true, addEventListener() {}, style: {} }),
    View: { ready: () => true },
    tl: k => k,
    loadFail: (msg, hold) => dev.fails.push([msg, hold]),
    banner() {},
    afterLoad() {},
    showAway() {},
    webkit: { messageHandlers: { store: { postMessage: m => { dev.posts.push(m); native(m); } } } },
    __now: () => now
  };
  ctx.window = ctx;
  vm.createContext(ctx);
  for (const [f, code] of src) vm.runInContext(code, ctx, { filename: f });
  vm.runInContext('clock = function () { return __now(); };', ctx);
  // most checks play one game on two devices without the one-at-a-time rule: their claim holds from the start, is never put
  // and never loses to another's. opts.claim lets the page claim as it does
  if (!opts.claim) vm.runInContext('cloudClaim = function () { claim = { dev: devId(), at: 0 }; S.hold = claim; };', ctx);

  const nativeIos = m => {
    if (m.dev) dev.mine = m.dev;
    if (m.cmd === 'cloudState') dev.inbox.push({ t: 'cloudState', state: dev.synced || Object.keys(dev.seen).some(k => k !== dev.mine) ? 'available' : 'pending' });
    else if (m.cmd === 'cloudGet') {
      const list = Object.keys(dev.seen).filter(k => k !== dev.mine).map(k => dev.seen[k]);
      if (!list.length) dev.inbox.push(iosEv(null));
      list.forEach((e, i) => dev.inbox.push(iosEv(e, i < list.length - 1)));
    } else if (m.cmd === 'cloudPut') {
      if (dev.drop) return;
      const e = { json: m.json, at: m.at, dev: m.dev, stamp: m.stamp };
      dev.seen[m.dev] = e;
      if (dev.offline) dev.late = e;
      else dev.out_(e);
      if (!dev.noAck) dev.inbox.push({ t: 'cloudPut', ok: true, stamp: m.stamp });
    }
  };
  // the write reaches the store and is delivered to the other devices, each unless it lags
  dev.out_ = e => {
    cloud.keys[e.dev] = e;
    cloud.devs.forEach(o => {
      if (o === dev) return;
      if (o.lag || o.offline) o.lagged.push(e);
      else {
        o.seen[e.dev] = e;
        o.inbox.push(iosEv(e));
      }
    });
  };
  // iCloud brings what it held back
  dev.catchUp = () => {
    dev.lag = false;
    dev.synced = true;
    const list = dev.lagged.splice(0);
    list.forEach((e, i) => {
      dev.seen[e.dev] = e;
      dev.inbox.push(iosEv(e, i < list.length - 1));
    });
    // the bridge sends the copies first and the state after them
    dev.inbox.push({ t: 'cloudState', state: 'available' });
    dev.pump();
  };
  dev.online = () => {
    dev.offline = false;
    if (dev.late) dev.out_(dev.late);
    dev.late = null;
    dev.catchUp();
  };
  const native = m => {
    if (cloud.ios) return nativeIos(m);
    if (dev.unavail && (m.cmd === 'cloudState' || m.cmd === 'cloudGet')) return dev.inbox.push({ t: 'cloudState', state: 'unavailable' });
    if (m.cmd === 'cloudState') dev.inbox.push({ t: 'cloudState', state: 'available' });
    else if (m.cmd === 'cloudGet') dev.inbox.push(cloud.ev());
    else if (m.cmd === 'cloudPut') {
      if (dev.drop) return;
      if (dev.fail) dev.inbox.push({ t: 'cloudPut', ok: false, stamp: m.stamp });
      else if (dev.out) dev.inbox.push({ t: 'cloudPut', ok: false, stamp: m.stamp });
      else if (!m.force && cloud.json !== null && cloud.stamp !== (m.base || '')) dev.inbox.push({ ...cloud.ev(), refused: true, put: m.stamp });
      else {
        cloud.json = m.json;
        cloud.at = m.at;
        cloud.dev = m.dev;
        cloud.stamp = m.stamp;
        if (!dev.noAck) dev.inbox.push({ t: 'cloudPut', ok: true, stamp: m.stamp });
      }
    }
  };
  dev.pump = () => {
    while (dev.inbox.length && !dev.hold) vm.runInContext('window.nativeStore(' + JSON.stringify(dev.inbox.shift()) + ')', ctx);
  };
  dev.run = code => {
    const r = vm.runInContext(code, ctx);
    dev.pump();
    return r;
  };
  // the page starts: what is saved here is loaded, the cloud is asked, and play waits for the first answer
  dev.launch = () => dev.run('cloudLook(function () { load(); loaded = true; onSaved = cloudSoon; })');
  dev.change = (gems, ap) => dev.run('S.gems += ' + gems + '; S.ads.ap += ' + (ap || 0) + '; save()');
  dev.put = () => dev.run('cloudPut()');
  dev.puts = () => dev.posts.filter(m => m.cmd === 'cloudPut');
  dev.gems = () => dev.run('S.gems');
  dev.base = () => dev.run('S.cl.base');
  dev.id = () => dev.run('devId()');
  dev.shown = id => !els[id].hidden;
  dev.dirty = () => dev.run('cloudSig(S) !== S.cl.sig');
  // the cloud tells this device that the copy changed (iCloud), or it asks (a return, Play Games)
  dev.push = ev => { dev.inbox.push(ev); dev.pump(); };
  dev.ask = () => dev.run('cloudAsk()');
  return dev;
}

// two devices that have agreed on one cloud copy: the first made the game and put it, the second was installed after
function pair(setup) {
  const cloud = newCloud();
  now = T9;
  const a = device(cloud);
  a.run('S = fresh(); S.gems = 100; S.ads.ap = 1000; ' + (setup || '') + 'save()');
  a.launch();
  a.put();
  const b = device(cloud);
  b.launch();
  expect(a.base() === cloud.stamp && b.base() === cloud.stamp && cloud.stamp, 'the pair did not agree on the first copy');
  expect(!a.dirty() && !b.dirty(), 'a device that took or wrote the copy counts as changed');
  a.posts.length = b.posts.length = 0;
  return [a, b, cloud];
}

// the same pair on the key-value store: the first made the game and wrote its key, the second was installed after
function pairIos(setup) {
  const cloud = newKeys();
  now = T9;
  const a = device(cloud);
  a.run('S = fresh(); S.gems = 100; S.ads.ap = 1000; ' + (setup || '') + 'save()');
  a.launch();
  a.put();
  const b = device(cloud);
  b.launch();
  expect(a.base() === cloud.keys[a.id()].stamp && b.base() === a.base(), 'the iOS pair did not agree on the first copy');
  expect(!a.dirty() && !b.dirty(), 'a device that took or wrote the copy counts as changed');
  a.posts.length = b.posts.length = 0;
  return [a, b, cloud];
}

// one device plays at a time. a claims at launch, b opens a minute later and claims too; each cloud tells the other device
function claimPair(ios) {
  const cloud = ios ? newKeys() : newCloud();
  const sync = d => (ios ? d.pump() : d.ask());
  now = T9;
  const q = device(cloud);
  q.run('S = fresh(); S.gems = 100; S.ads.ap = 1000; save()');
  q.launch();
  q.put();
  const a = device(cloud, {}, { claim: true });
  const b = device(cloud, {}, { claim: true });
  a.run("devKey = 'aa'");
  b.run("devKey = 'bb'");
  return { cloud, sync, q, a, b };
}

for (const ios of [false, true]) {
  const name = ios ? 'iPhone' : 'Android';
  // b opens while a plays: a stops and shows the card, and puts nothing more; b plays on
  {
    const { cloud, sync, a, b } = claimPair(ios);
    a.launch();
    expect(a.run('claim.at') === T9 && a.puts().length === 1 && a.puts()[0].json.indexOf('"hold":{"dev":"aa","at":' + T9) > 0, name + ': the launch did not claim and put at once');
    now = T9 + 60000;
    a.change(2, 30);
    b.launch();
    expect(b.run('claim.at') === now && b.puts().length === 1, name + ': the second device did not claim at its launch');
    sync(a);
    expect(a.run('cloudOff') && a.shown('taken') && a.run('cloudHeld()') && a.run('claim') === null, name + ': the first device did not stop under the claim of the other');
    const n = a.puts().length;
    a.change(3, 10);
    now += 60000;
    a.put();
    a.run('cloudSoon()');
    expect(a.puts().length === n, name + ': a taken-over device kept putting');
    expect(!b.run('cloudOff') && !b.shown('taken'), name + ': the device that claimed last was stopped');
    // a taps Play here: b's newest game is loaded, a claims, and b is the one that stops
    b.change(40, 600);
    b.put();
    a.run('document.hidden = false');
    a.run('cloudHere()');
    expect(a.gems() === b.gems(), name + ': Play here did not load the newest game (gems ' + a.gems() + ' and ' + b.gems() + ')');
    expect(!a.run('cloudOff') && a.run('claim.at') === now && !a.shown('taken'), name + ': Play here did not claim and lift the card');
    sync(b);
    expect(b.run('cloudOff') && b.shown('taken'), name + ': the other device did not stop after Play here');
  }
  // both open in the same second: the larger id keeps playing, on both devices
  {
    const { cloud, sync, a, b } = claimPair(ios);
    now = T9 + 3600000;
    a.launch();
    b.launch();
    sync(a);
    sync(b);
    sync(a);
    expect(a.run('cloudOff') && !b.run('cloudOff'), name + ': two devices that opened in the same second did not settle on one (a off ' + a.run('cloudOff') + ', b off ' + b.run('cloudOff') + ')');
    b.change(1, 5);
    b.put();
    sync(a);
    expect(a.run('cloudOff') && !b.run('cloudOff'), name + ': the loser came back by itself');
  }
  // a purchase made just before the takeover reaches the other device
  {
    const { cloud, sync, a, b } = claimPair(ios);
    a.launch();
    now = T9 + 60000;
    a.run('grant("gems2", "TA")');
    expect(a.puts().length === 2, name + ': a credited purchase did not go out at once');
    b.launch();
    expect(b.gems() === 600, name + ': the other device did not get the purchase (gems ' + b.gems() + ')');
    // one that comes in on the device that was taken over stays on it until the player comes back to it
    sync(a);
    expect(a.run('cloudOff'), name + ': the first device did not stop');
    const n = a.puts().length;
    a.run('grant("gems3", "TB")');
    expect(a.puts().length === n && a.run('cloudOff') && a.gems() === 600 + 1200, name + ': a purchase on a taken-over device was put (gems ' + a.gems() + ')');
    sync(b);
    expect(b.gems() === 600 && !b.run('cloudOff'), name + ': the holder got a purchase from a taken-over device (gems ' + b.gems() + ')');
    b.change(5, 800);
    b.put();
    now += 60000;
    a.run('cloudHere()');
    elapse(10000, a, b);
    expect(a.gems() === 600 + 1200 + 5 && !a.run('cloudOff'), name + ': the newest game with the purchase was not loaded on return (gems ' + a.gems() + ')');
    sync(b);
    b.run('cloudHere()');
    expect(b.gems() === a.gems(), name + ': the other device did not get the joined game (gems ' + b.gems() + ' and ' + a.gems() + ')');
  }
  // the same when the holder has played on since: it keeps its game and gets the purchase once the first device is back
  for (const played of [false, true]) {
    const { cloud, sync, a, b } = claimPair(ios);
    a.launch();
    now = T9 + 60000;
    b.launch();
    sync(a);
    expect(a.run('cloudOff'), name + ': the first device did not stop');
    a.run('grant("gems2", "TA")');
    if (played) b.change(7, 90);
    sync(b);
    if (!ios) b.ask();
    expect(b.gems() === 100 + (played ? 7 : 0) && !b.run('cloudOff'), name + ': the holder got the purchase early (played ' + played + ', gems ' + b.gems() + ')');
    if (played) b.put();
    now += 60000;
    a.run('cloudHere()');
    elapse(10000, a, b);
    sync(b);
    b.run('cloudHere()');
    elapse(10000, a, b);
    expect(a.gems() === 100 + 500 + (played ? 7 : 0) && b.gems() === a.gems(), name + ': the purchase did not reach the cloud on return (played ' + played + ', a ' + a.gems() + ', b ' + b.gems() + ')');
  }
}

// a purchase credited on the Android device that has not yet learned of the other's claim is refused with the claim's copy; it stays
// on that device, and reaches the cloud when the player comes back to it
{
  const { cloud, a, b } = claimPair(false);
  a.launch();
  now = T9 + 60000;
  b.launch();
  a.run('grant("gems2", "TA")');
  expect(a.run('cloudOff') && a.shown('taken'), 'Android: the refusal of a purchase did not stop the first device');
  expect(JSON.parse(cloud.json).gems === 100 && JSON.parse(cloud.json).hold.dev === 'bb', 'Android: the purchase reached the cloud copy of the holder (gems ' + JSON.parse(cloud.json).gems + ')');
  now += 60000;
  a.run('cloudHere()');
  elapse(10000, a, b);
  expect(JSON.parse(cloud.json).gems === 600 && JSON.parse(cloud.json).hold.dev === 'aa', 'Android: the purchase did not reach the cloud on return (gems ' + JSON.parse(cloud.json).gems + ')');
  b.run('cloudHere()');
  elapse(10000, a, b);
  expect(b.gems() === 600, 'Android: the holder did not get the purchase after the return (gems ' + b.gems() + ')');
}

// a purchase credited while a put is in flight goes out as soon as that put is answered
{
  const [a, , c] = pair();
  a.hold = true;
  a.change(1, 1);
  a.put();
  a.run('grant("gems1", "T1")');
  expect(a.puts().length === 1, 'a purchase put went out before the put in flight was answered');
  a.hold = false;
  a.pump();
  expect(a.puts().length === 2 && JSON.parse(c.json).gems === 181, 'a purchase credited during a put did not go out when it was answered (gems ' + JSON.parse(c.json).gems + ')');
}

// coming back while taken over claims the game again: the card goes, the newest copy is judged first and the time away is not
// paid to a game that is about to be replaced
for (const ios of [false, true]) {
  const name = ios ? 'iPhone' : 'Android';
  const { sync, a, b } = claimPair(ios);
  a.launch();
  now = T9 + 60000;
  b.launch();
  sync(a);
  expect(a.run('cloudOff') && a.shown('taken'), name + ': the first device did not stop');
  b.change(40, 600);
  b.put();
  now += 600000;
  a.hold = true;
  a.run('cloudBack()');
  a.run('var ranWith = null; cloudAfter(function () { cloudApply(); ranWith = S.gems; })');
  expect(!a.run('cloudOff') && a.run('cloudHeld()') && a.run('ranWith') === null, name + ': the return did not leave the stopped state and wait for the cloud');
  a.hold = false;
  a.pump();
  expect(a.run('ranWith') === b.gems() && a.gems() === b.gems(), name + ': the time away was handled before the newest copy was taken (' + a.run('ranWith') + ', want ' + b.gems() + ')');
  expect(a.run('claim && claim.at') === now && !a.shown('taken') && !a.run('cloudHeld()') && !a.run('cloudOff'), name + ': the return did not claim and lift the card');
  sync(b);
  expect(b.run('cloudOff') && b.shown('taken'), name + ': the other device was not stopped by the return');
}

// the later claim on Android is refused when the earlier one put in between; it takes that copy and claims again at once, and the
// earlier device learns of it on its next poll
{
  const { cloud, a, b } = claimPair(false);
  b.hold = true;
  b.launch();
  a.launch();
  now = T9 + 1000;
  b.hold = false;
  b.pump();
  const bid = b.id();
  expect(JSON.parse(cloud.json).hold.dev === 'bb' && b.puts().length === 2, 'Android: a refused claim that took the copy waited for the throttle');
  expect(bid === 'bb' && !a.run('cloudOff'), 'Android: the earlier device stopped before it asked');
  elapse(46000, a, b);
  expect(a.run('cloudOff') && a.shown('taken') && !b.run('cloudOff'), 'Android: the earlier device did not stop within a poll after the later claim');
}

// a put that never got its answer before the takeover does not keep Play here from claiming
for (const ios of [false, true]) {
  const name = ios ? 'iPhone' : 'Android';
  const { sync, a, b } = claimPair(ios);
  a.launch();
  a.drop = true;
  now = T9 + 30000;
  a.change(1, 40);
  a.put();
  expect(a.run('S.cl.fly') !== null, name + ': the put in flight is not there');
  a.drop = false;
  now = T9 + 60000;
  b.launch();
  sync(a);
  expect(a.run('cloudOff') && a.run('S.cl.fly') === null, name + ': a put without an answer was left in flight under the card');
  const n = a.puts().length;
  a.run('cloudHere()');
  expect(a.puts().length === n + 1 && a.run('claim') !== null && !a.shown('taken'), name + ': Play here did not claim after a put without an answer');
}

// time and active play are not counted while the game is held: taken over, waiting for the time, or waiting for the cloud
{
  const { sync, a, b } = claimPair(true);
  a.launch();
  a.run('lastTouch = performance.now()');
  a.run('playTick()');
  const p = a.run('S.ads.pt + "," + S.ads.ap');
  expect(a.run('S.ads.ap') >= 1 && a.run('S.ads.pt') >= 1, 'the play counters did not run on a playing game');
  now = T9 + 60000;
  b.launch();
  sync(a);
  a.run('playTick()');
  expect(a.run('S.ads.pt + "," + S.ads.ap') === p, 'a taken-over game counted play');
  a.run('cloudOff = false; timeHeld = true');
  a.run('playTick()');
  expect(a.run('S.ads.pt + "," + S.ads.ap') === p, 'a game waiting for the time counted play');
  a.run('timeHeld = false; cloudRet = { got: false, run: null, t: 0 }');
  a.run('playTick()');
  expect(a.run('S.ads.pt + "," + S.ads.ap') === p, 'a game waiting for the cloud counted play');
  a.run('cloudRet = null');
  a.run('playTick()');
  expect(a.run('S.ads.pt + "," + S.ads.ap') !== p, 'the play counters did not run again once the game was free');
}

// the first iCloud sync brings the copies before the state: a new install does not end its wait on the state with no copy, so it
// neither starts nor claims an empty game over the real one
{
  const [a, b, c] = pairIos();
  a.change(50, 3000);
  a.put();
  b.pump();
  b.change(7, 100);
  b.put();
  const d = device(c, {}, { claim: true });
  d.run("devKey = 'dd'");
  d.seen = {};
  d.lag = true;
  d.lagged.push(c.keys[a.id()], c.keys[b.id()]);
  d.launch();
  expect(d.run('!!cloudFind') && d.shown('find'), 'the new install did not wait for iCloud');
  d.catchUp();
  expect(d.gems() === 157 && !d.run('!!cloudFind'), 'the new install did not start from the copies of the first sync (gems ' + d.gems() + ')');
  expect(d.puts().length === 1 && JSON.parse(d.puts()[0].json).gems === 157, 'the new install put something other than the game it found');
  const swift = fs.readFileSync(path.join(root, 'ios', 'MainStreet', 'CloudBridge.swift'), 'utf8');
  const body = swift.slice(swift.indexOf('@objc private func changed'));
  expect(body.indexOf('self.send(') > 0 && body.indexOf('self.send(') < body.indexOf('self.state('), 'CloudBridge.swift sends the state before the copies of a change');
}

// a copy that was written before the claim, delivered after it, is judged by play and does not stop the claimer
{
  const { cloud, a, b } = claimPair(true);
  a.launch();
  b.lag = true;
  now = T9 + 60000;
  a.change(7, 500);
  a.put();
  b.launch();
  b.catchUp();
  expect(!b.run('cloudOff') && b.gems() === 107, 'a copy written before the claim stopped the device that claimed after it (gems ' + b.gems() + ')');
}

// scenario A on the iPhone's store: the iPhone is hidden at 9:00, the iPad plays to 12:00, the iPhone returns at 17:00 with an
// iCloud that has not delivered the iPad's copy yet, taps once and closes within seconds. Its put goes to its own key, so the
// iPad's copy is still there; when it arrives the iPhone takes it, and the iPad keeps its game
{
  const [a, b, c] = pairIos();
  const bid = b.id();
  const aid = a.id();
  a.lag = true;
  now = T12;
  b.change(50, 10800);
  b.put();
  const gems = b.gems();
  const bStamp = b.base();
  now = T17;
  a.run('cloudBack()');
  expect(!a.run('cloudHeld()'), 'the answer without the iPad copy did not end the return wait');
  a.change(1, 3);
  a.put();
  expect(c.keys[bid].stamp === bStamp && JSON.parse(c.keys[bid].json).gems === gems, 'the iPhone put overwrote the iPad key');
  expect(a.puts().length === 1 && a.base() === c.keys[aid].stamp, 'the put of the iPhone was not written to its own key');
  a.catchUp();
  expect(a.gems() === gems, 'the iPad copy did not win over one tap (gems ' + a.gems() + ', iPad ' + gems + ')');
  expect(!a.dirty(), 'the iPhone did not agree with the iPad copy afterwards');
  b.pump();
  expect(b.gems() === gems, 'the iPad took the iPhone copy that had less play (gems ' + b.gems() + ')');
  b.put();
  a.pump();
  expect(a.gems() === gems && b.gems() === gems, 'the two devices do not hold the iPad game');
}

// a new install finds several devices' copies: it starts from the one with the most play, whichever comes first, and judges the
// others against it
for (const aMore of [false, true]) {
  const [a, b, c] = pairIos();
  a.change(5, aMore ? 600 : 100);
  a.put();
  b.change(7, aMore ? 100 : 600);
  b.put();
  const d = device(c);
  d.launch();
  const want = aMore ? 105 : 107;
  expect(d.gems() === want, 'the new install did not start from the copy with the most play (gems ' + d.gems() + ', want ' + want + ')');
  expect(!d.puts().length && d.run('cloudFound.length') === 0, 'the new install put or kept copies after starting');
  expect(d.run('S.ads.ap') === 1600, 'the other copy was not joined into the game kept');
}

// time on screen is not play: a device that only watched its cash grow does not outrank one that played for 20 minutes
{
  const [a, b, c] = pair();
  b.change(50, 1200);
  b.put();
  const gems = b.gems();
  a.run('S.ads.pt += 1800');
  a.change(1, 3);
  a.ask();
  expect(a.gems() === gems && a.base() === c.stamp, 'minutes of play lost to a device that only had the game on screen (gems ' + a.gems() + ')');
}

// scenario B: the answer at launch lacks the copy iCloud is still bringing; it comes after
{
  const [a, b, c] = pairIos();
  const s0 = { ...c.keys };
  now = T12;
  b.change(7, 500);
  b.put();
  const a2 = device(c, a.st);
  a2.seen = s0;
  a2.lag = true;
  a2.lagged.push(c.keys[b.id()]);
  a2.launch();
  expect(!a2.puts().length && a2.gems() === 100, 'the answer without the copy changed or wrote the game');
  a2.catchUp();
  expect(a2.gems() === b.gems() && a2.base() === b.base(), 'the copy that came after the launch answer was not taken');
  expect(!a2.puts().length, 'a game that only took a copy put it back');
}

// a read slower than CLOUD_BACK: play goes on, and the copy that comes late is judged against what was played meanwhile
for (const aMore of [false, true]) {
  const [a, b, c] = pair();
  now = T12;
  b.change(50, aMore ? 20 : 10800);
  b.put();
  now = T17;
  a.hold = true;
  a.run('cloudBack()');
  expect(a.run('cloudHeld()'), 'the return did not wait for the cloud');
  elapse(4000, a);
  expect(!a.run('cloudHeld()'), 'the return still waits after CLOUD_BACK');
  a.change(3, aMore ? 20000 : 5);
  a.put();
  a.hold = false;
  a.pump();
  const g = a.gems();
  if (aMore) {
    expect(g === 103 && a.base() === c.stamp, 'the game with more play did not keep itself over a late copy (gems ' + g + ')');
    // the put it kept itself over was refused, so it goes out again at once, not after the next throttle
    expect(!a.dirty() && JSON.parse(c.json).gems === 103, 'the game kept was not written over the older copy');
    now = T17 + 60000;
    b.ask();
    expect(b.gems() === 103, 'the other device did not take the game kept');
  } else {
    expect(g === 150 && !a.dirty(), 'a few seconds of play outranked hours on the other device (gems ' + g + ')');
  }
}

// the time is unknown (hidden before the time answer): nothing is put, and a copy that comes waits and is judged afterwards
{
  const [a, b, c] = pair();
  now = T12;
  b.change(50, 10800);
  b.put();
  const stamp = c.stamp;
  a.run('timeHeld = true');
  a.change(1, 2);
  a.put();
  expect(!a.puts().length, 'a put went out while the time was unknown');
  a.push(c.ev());
  expect(a.gems() === 101 && a.run('cloudPend.length === 1'), 'a copy that came while the time was unknown was not parked');
  a.run('timeHeld = false; cloudApply()');
  expect(a.gems() === 150 && a.base() === stamp, 'the parked copy was not judged when the time came');
}

// a put refused because another device wrote first: the copy that comes with the refusal is judged, the put is not repeated blindly
for (const aMore of [false, true]) {
  const [a, b, c] = pair();
  b.change(40, 100);
  b.put();
  const s1 = c.stamp;
  a.change(5, aMore ? 5000 : 10);
  a.put();
  expect(!a.run('S.cl.fly'), 'the refused put is still in flight');
  if (aMore) {
    // kept after the refusal and put at once on the base the refusal brought, with no throttle in between
    expect(c.stamp !== s1 && JSON.parse(c.json).gems === 105 && a.base() === c.stamp && !a.dirty(), 'the game kept was not written on the new base (gems ' + a.gems() + ')');
  } else {
    expect(a.gems() === 140 && a.base() === s1 && !a.dirty(), 'the copy with more play was not taken after the refusal (gems ' + a.gems() + ')');
  }
}

// both devices bought gem packs on a deal while apart: the game kept has both packs and both bonuses, once
for (const aMore of [false, true]) {
  const [a, b, c] = pair();
  const buy = (d, id, tx, bonus) => d.run("S.iap.deal = { id: '" + id + "', bonus: " + bonus + ', until: clock() + 3600000 }; grant("' + id + '", "' + tx + '"); dealBonus("' + id + '", clock(), "' + tx + '")');
  // apart: a purchase goes out at once, so the two devices are cut off while they buy
  a.fail = b.fail = true;
  buy(a, 'gems2', 'TA', 100);
  buy(b, 'gems3', 'TB', 240);
  a.fail = b.fail = false;
  a.change(0, aMore ? 5000 : 10);
  b.change(0, 100);
  b.put();
  a.put();
  const want = 100 + 500 + 100 + 1200 + 240;
  expect(a.gems() === want, 'the game kept (A more play ' + aMore + ') has gems ' + a.gems() + ', want ' + want);
  a.put();
  now += 60000;
  b.ask();
  expect(b.gems() === want && a.gems() === want, 'both devices did not end with both packs: A ' + a.gems() + ' B ' + b.gems());
  expect(a.run('S.iap.paid.length') === 2 && a.run('S.iap.tx.join()').split(',').sort().join() === 'TA,TB', 'the kept game does not list both purchases');
  // the store lists both: nothing is paid again
  const list = JSON.stringify([{ id: PID + 'gems2', tx: 'TA', at: now }, { id: PID + 'gems3', tx: 'TB', at: now }]);
  a.run('recover(' + list + ')');
  b.run('recover(' + list + ')');
  expect(a.gems() === want && b.gems() === want, 'a pack was paid again from the store list');
  // meeting the same copy again adds nothing
  a.push(c.ev());
  a.run("takeCloud(cloudCopy = saved(), 'again')");
  expect(a.gems() === want, 'a repeated meeting paid a pack twice');
}

// Skip ads and x2 travel with the copy, and a refund removes them from both sides, whichever copy is kept
{
  const flags = f => 'S.iap.' + f + ' = 1; S.iap.' + f + "Tx = 'N1'; S.iap." + f + "User = 'U1'; ";
  for (const f of ['noads', 'x2']) {
    const refund = d => d.run('S.iap.' + f + " = 0; S.iap." + f + "Tx = ''; S.iap." + f + "User = ''; S.iap.rf = ['N1 U1 ' + clock()]");
    const on = d => d.run('S.iap.' + f);
    // the other device had no flag and keeps its game: it gets the flag
    {
      const [a, b, c] = pair();
      a.run(flags(f));
      a.change(1, 10);
      a.put();
      b.change(1, 5000);
      b.ask();
      expect(on(b) === 1 && b.run('S.iap.' + f + 'Tx') === 'N1', f + ' bought on one device did not reach the game kept on the other');
    }
    // refunded here, the other device's copy that still carries it is taken whole or kept: the flag stays off
    for (const mine of [false, true]) {
      const [a, b, c] = pair(flags(f));
      refund(a);
      a.change(1, mine ? 9000 : 10);
      b.change(1, 100);
      b.put();
      a.ask();
      expect(on(a) === 0 && a.run('S.iap.rf.some(function (e) { return e.indexOf("N1 U1 ") === 0; })'), f + ' came back from a copy that still carried the refunded purchase (kept here: ' + mine + ')');
      a.put();
      expect(!JSON.parse(c.json).iap[f], 'the refunded ' + f + ' was written to the cloud (kept here: ' + mine + ')');
    }
    // refunded on the other device: the copy that lists the refund removes it here, kept or taken
    for (const mine of [false, true]) {
      const [a, b, c] = pair(flags(f));
      refund(b);
      b.change(1, 100);
      b.put();
      if (mine) a.change(1, 9000);
      a.ask();
      expect(on(a) === 0, f + ' survived a copy that lists its refund (kept here: ' + mine + ')');
    }
  }
}

// a restore on a second device moves the purchase to its own RevenueCat user and empties the first one's list: that is no refund
{
  const [a, b, c] = pair("S.iap.noads = 1; S.iap.noadsTx = 'N1'; S.iap.noadsUser = 'U1'; ");
  b.run("var snd = 1; refundDoubt = {}; lastUser = ''");
  b.run("window.nativeStore({ t: 'owned', ids: ['" + PID + "noads'], tx: [{ id: '" + PID + "noads', tx: 'N2', at: 1 }], user: 'U2', restore: true })");
  b.put();
  a.run("refundDoubt = {}");
  a.ask();
  a.run("window.nativeStore({ t: 'owned', ids: [], tx: [], user: 'U1' })");
  a.run("window.nativeStore({ t: 'owned', ids: [], tx: [], user: 'U1', sync: true })");
  expect(a.run('S.iap.noads') === 1 && b.run('S.iap.noads') === 1, 'a restore on the second device took Skip ads away');
}

// the finding's sequence: B restores under its own user, A's list no longer has the purchase and A strips it, then the copies
// meet. Neither device may end without it; a real refund on B's user takes it from both
{
  const own = (d, user, ids, tx, how) => d.run("window.nativeStore({ t: 'owned', ids: " + JSON.stringify(ids) + ', tx: ' + JSON.stringify(tx) + ", user: '" + user + "', " + how + ': true })');
  const listed = [{ id: PID + 'noads', tx: 'N1', at: 1 }];
  const [a, b, c] = pair("S.iap.noads = 1; S.iap.noadsTx = 'N1'; S.iap.noadsUser = 'U1'; ");
  b.run("refundDoubt = {}");
  own(b, 'U2', [PID + 'noads'], listed, 'restore');
  b.put();
  a.run("refundDoubt = {}");
  a.run("window.nativeStore({ t: 'owned', ids: [], tx: [], user: 'U1' })");
  own(a, 'U1', [], [], 'sync');
  // its put on the old base is refused and the restored copy that comes with the refusal brings the purchase back
  expect(a.run('S.iap.rf.some(function (e) { return e.indexOf("N1 U1 ") === 0; })') && a.run('S.iap.noads') === 1 && a.run('S.iap.noadsUser') === 'U2', 'the first device did not get Skip ads back from the restored copy');
  a.put();
  b.ask();
  expect(b.run('S.iap.noads') === 1, 'a restore was taken as a refund on the device that restored');
  // a restore again gives it back for good
  own(b, 'U2', [PID + 'noads'], listed, 'restore');
  b.put();
  a.ask();
  expect(a.run('S.iap.noads') === 1 && b.run('S.iap.noads') === 1, 'the restored purchase was switched off again');
  // a real refund: B's user no longer lists it
  now += 1000;
  b.run("refundDoubt = {}");
  own(b, 'U2', [], [], 'sync');
  expect(b.run('S.iap.noads') === 0, 'a refund on the restoring user did not strip B');
  b.put();
  a.ask();
  expect(a.run('S.iap.noads') === 0, 'a refund did not reach the other device');
}

// the same pair, and then the player taps Restore on the first device: RevenueCat moves the purchase back to its user. It stays
// on both devices, however the refunds of the first round are joined in, and a refund after that still takes it away
{
  const own = (d, user, ids, tx, how) => d.run("window.nativeStore({ t: 'owned', ids: " + JSON.stringify(ids) + ', tx: ' + JSON.stringify(tx) + ", user: '" + user + "', " + how + ': true })');
  const listed = [{ id: PID + 'noads', tx: 'N1', at: 1 }];
  const [a, b, c] = pair("S.iap.noads = 1; S.iap.noadsTx = 'N1'; S.iap.noadsUser = 'U1'; ");
  const noads = d => d.run('S.iap.noads') + ' ' + d.run('S.iap.noadsUser');
  now += 1000;
  b.run('refundDoubt = {}');
  own(b, 'U2', [PID + 'noads'], listed, 'restore');
  b.put();
  now += 1000;
  a.run('refundDoubt = {}');
  a.run("window.nativeStore({ t: 'owned', ids: [], tx: [], user: 'U1' })");
  own(a, 'U1', [], [], 'sync');
  a.put();
  b.ask();
  expect(noads(a) === '1 U2' && noads(b) === '1 U2', 'the setup of the restore sequence went wrong: ' + noads(a) + ' and ' + noads(b));
  // Restore on the first device
  now += 1000;
  own(a, 'U1', [PID + 'noads'], listed, 'restore');
  expect(noads(a) === '1 U1', 'the restore did not bring the purchase to its user');
  a.change(1, 10);
  a.put();
  // the other user's list no longer has it
  now += 1000;
  b.run('refundDoubt = {}');
  b.ask();
  own(b, 'U2', [], [], 'sync');
  b.change(1, 10);
  b.put();
  a.ask();
  expect(noads(a) === '1 U1', 'the restore on the first device did not stick (' + noads(a) + ')');
  b.ask();
  a.put();
  b.ask();
  expect(b.run('S.iap.noads') === 1 && a.run('S.iap.noads') === 1, 'the restored purchase did not come back to the second device (' + noads(a) + ' and ' + noads(b) + ')');
  // a real refund after all that
  now += 1000;
  a.run('refundDoubt = {}');
  own(a, 'U1', [], [], 'sync');
  expect(a.run('S.iap.noads') === 0, 'a refund after the restores did not strip the first device');
  a.put();
  b.ask();
  expect(b.run('S.iap.noads') === 0, 'a refund after the restores did not reach the second device');
}

// erase all progress is a forced put: it replaces the copy whatever the base, and the other device takes the erased game
{
  const [a, b, c] = pair();
  b.change(40, 100);
  b.put();
  a.run('reset()');
  a.run('cloudPut(true)');
  const forced = a.puts()[a.puts().length - 1];
  expect(forced.force === true && forced.base !== c.stamp, 'the erase was not a put that ignores the base');
  expect(c.stamp === forced.stamp && JSON.parse(c.json).gems === 0, 'the erase did not replace the cloud copy');
  expect(a.base() === c.stamp && !a.dirty(), 'the erased game does not agree with its copy');
  b.ask();
  expect(b.gems() === 0, 'the other device did not take the erased game');
  // an answer of an earlier put that comes after the erase does not move the base
  const [a2, , c2] = pair();
  a2.hold = true;
  a2.change(1, 1);
  a2.put();
  const old = a2.puts()[0].stamp;
  a2.run('reset()');
  a2.run('cloudPut(true)');
  a2.hold = false;
  a2.pump();
  expect(a2.base() === c2.stamp && c2.stamp !== old, 'the answer of a put before the erase moved the base');
}

// a copy from a newer build blocks writing, in a running game
{
  const [a, , c] = pair();
  a.push({ t: 'cloud', json: JSON.stringify({ ...good, v: good.v + 1 }), at: T17, dev: 'x', stamp: 'x:1', refused: false });
  expect(a.run('blocked') === true && a.fails.some(f => f[1] === true), 'a copy from a newer build did not stop saving');
  const n = a.puts().length;
  a.change(1, 1);
  a.put();
  expect(a.puts().length === n && c.stamp !== 'x:1', 'a copy from a newer build was put over');
}

// a reinstall: no save here, the cloud's copy becomes the first save and agrees with the cloud
{
  const [a, , c] = pair();
  a.change(9, 400);
  a.put();
  const d = device(c);
  d.launch();
  expect(d.gems() === 109 && d.base() === c.stamp && !d.dirty(), 'the reinstall did not start from the cloud copy');
  d.run('save()');
  d.put();
  expect(!d.puts().length, 'a reinstall wrote back a copy it only took');
}

// a reinstall where the player started before the copy arrived: the copy has far more play and wins, the new game's put is refused
for (const putFirst of [false, true]) {
  const [a, , c] = pair();
  a.change(9, 4000);
  a.put();
  const d = device(c);
  d.hold = true;
  d.launch();
  d.run('cloudEnd()');
  expect(d.run('S.ads.ap') === 0 && d.base() === '', 'the new game did not start empty');
  d.change(2, 30);
  if (putFirst) d.put();
  expect(JSON.parse(c.json).gems === 109, 'the new game was written over the cloud copy');
  d.hold = false;
  d.push(c.ev());
  expect(d.gems() === 109 && d.base() === c.stamp, 'the cloud copy did not win over a game started before it arrived (gems ' + d.gems() + ')');
}

// a copy without a stamp (from an older build) is judged like any other and does not make the game refuse itself for ever
{
  const cloud = newCloud();
  cloud.json = JSON.stringify({ ...good, ts: T9 });
  cloud.at = T9;
  cloud.dev = 'old';
  const d = device(cloud);
  d.launch();
  expect(d.gems() === good.gems && d.base() === '', 'a copy without a stamp was not seeded');
  d.change(1, 10);
  d.put();
  expect(cloud.stamp !== '' && JSON.parse(cloud.json).gems === good.gems + 1, 'a game on a copy without a stamp could not be put');
}

// a put that failed is sent again, in the same page and after a reload
{
  const [a, , c] = pair();
  a.fail = true;
  a.change(1, 1);
  a.put();
  expect(a.puts().length === 1 && !a.run('S.cl.fly') && a.dirty(), 'a failed put left the game marked as sent');
  a.fail = false;
  a.put();
  expect(a.puts().length === 2 && JSON.parse(c.json).gems === 101, 'a failed put was not sent again');
  // a put whose answer never came, then the page reloads: the copy did not land, so the next put goes out
  const [a2, , c2] = pair();
  a2.drop = true;
  a2.change(1, 1);
  a2.put();
  const stamp0 = c2.stamp;
  const w = device(c2, a2.st);
  w.launch();
  expect(w.run('S.cl.fly !== null') === false && w.dirty(), 'a put that never landed stayed in flight after the reload');
  w.put();
  expect(c2.stamp !== stamp0 && JSON.parse(c2.json).gems === 101, 'the put that never landed was not sent again after the reload');
  // the same, but the put had landed: the copy is this device's own and the game agrees with it
  const [a3, , c3] = pair();
  a3.hold = true;
  a3.change(1, 1);
  a3.put();
  a3.inbox.length = 0;
  const w3 = device(c3, a3.st);
  w3.launch();
  expect(c3.stamp === a3.puts()[0].stamp && w3.base() === c3.stamp && !w3.dirty(), 'a put that landed without its answer was not recognized after the reload');
  w3.put();
  expect(w3.puts().length === 0, 'a put that had landed was sent again');
}

// two puts in flight: the second waits for the answer of the first and goes out on the base it made
{
  const [a, , c] = pair();
  a.hold = true;
  a.change(1, 1);
  a.put();
  a.change(1, 1);
  a.put();
  expect(a.puts().length === 1, 'a second put went out before the first was answered');
  a.hold = false;
  a.pump();
  expect(a.dirty(), 'the change made during the put is not marked for a put');
  a.put();
  expect(a.puts().length === 2 && a.puts()[1].base === a.puts()[0].stamp && JSON.parse(c.json).gems === 102, 'the second put did not follow on the first');
  expect(!a.dirty() && a.base() === c.stamp, 'the game does not agree with the copy it wrote last');
}

// a change is put by the timer once the throttle is over, not before
{
  const [a, , c] = pair();
  a.change(1, 1);
  expect(!a.puts().length, 'a change was put before the throttle');
  elapse(CLOUD_EVERY - 1000, a);
  expect(!a.puts().length, 'a change was put before the throttle was over');
  elapse(2000, a);
  expect(a.puts().length === 1 && JSON.parse(c.json).gems === 101, 'the timer did not put the change');
}

// an open game that only earns cash writes nothing
{
  const [a, , c] = pair();
  const stamp = c.stamp;
  for (let k = 0; k < 3; k++) {
    now += 15000;
    a.run('S.cash += 1000; save()');
    a.put();
  }
  expect(!a.puts().length, 'an idle open game kept writing its own copy');
  expect(c.stamp === stamp, 'income alone changed the cloud copy');
}

// a copy that a slow read brought, older than the one the game has moved on to, is old news, also when it was parked
{
  const [a, , c] = pair();
  const x = c.ev();
  a.change(1, 1);
  a.put();
  const f = c.stamp;
  a.push(x);
  expect(a.gems() === 101 && a.base() === f, 'an older copy that came late was taken');
  a.run('timeHeld = true');
  a.push(x);
  a.run('timeHeld = false; cloudApply()');
  expect(a.gems() === 101 && a.base() === f, 'an older copy parked while the time was unknown was taken');
  // the read is answered before the put's own answer comes
  const [a2, , c2] = pair();
  const x2 = c2.ev();
  a2.hold = true;
  a2.change(1, 1);
  a2.put();
  a2.inbox.push(x2);
  a2.hold = false;
  a2.pump();
  expect(a2.gems() === 101 && a2.base() === c2.stamp, 'a read from before the game\'s own put undid it (gems ' + a2.gems() + ')');
}

// Android signed out of Play Games cannot write and never agrees with a copy, so what it played counts when the account's copy comes
{
  const [a, b, c] = pair();
  b.change(10, 100);
  b.put();
  a.out = true;
  for (let k = 0; k < 3; k++) {
    a.change(5, 3000);
    a.put();
  }
  expect(a.dirty() && a.base() !== c.stamp, 'a put that could not be written moved the base');
  a.out = false;
  a.push(c.ev());
  expect(a.gems() === 115 && a.base() === c.stamp && a.dirty(), 'the weeks played signed out were lost to the account copy (gems ' + a.gems() + ')');
  a.put();
  expect(JSON.parse(c.json).gems === 115, 'the game kept was not written');
}

// the iPhone signed out of iCloud still writes: its puts answer ok and move its base to stamps only it knows. The account's copy
// that comes later is judged by the play since the split: more of it and the game is taken, less and the game is kept
for (const bMore of [true, false]) {
  const [a, b, c] = pairIos();
  a.offline = true;
  for (let k = 0; k < 3; k++) {
    a.change(5, 300);
    a.put();
  }
  expect(a.puts().length === 3 && a.run('S.cl.fly') === null && !a.dirty(), 'a put with no account was not answered ok');
  b.change(10, bMore ? 5000 : 100);
  b.put();
  a.online();
  const g = a.gems();
  expect(bMore ? g === 110 : g === 115, 'the account copy with ' + (bMore ? 'more' : 'less') + ' play since the split was judged wrong (gems ' + g + ')');
  b.pump();
  b.put();
  a.put();
  expect(a.gems() === b.gems(), 'the two devices did not end on one game after the iPhone came back (' + a.gems() + ' and ' + b.gems() + ')');
}

// an iPhone reinstall gets a new device id, so its game is written to a key of its own and the old install's key is still
// there when iCloud delivers it: the game started meanwhile is judged against it by play
{
  const [a, , c] = pairIos();
  a.change(9, 4000);
  a.put();
  const d = device(c);
  d.seen = {};
  d.lag = true;
  d.lagged.push(c.keys[a.id()]);
  d.launch();
  d.run('cloudEnd()');
  expect(d.run('S.ads.ap') === 0 && d.base() === '', 'the new game did not start empty');
  d.change(2, 30);
  d.put();
  expect(JSON.parse(c.keys[a.id()].json).gems === 109, 'the new install wrote over the key of the old install');
  d.catchUp();
  expect(d.gems() === 109 && d.base() === c.keys[a.id()].stamp, 'the old install copy did not win over a game started before it arrived (gems ' + d.gems() + ')');
}

// erasing, on the key-value store: the erased game replaces the other device's game whatever it played since, and a copy written
// before the erase that iCloud delivers late does not bring the erased game back
{
  const [a, b] = pairIos();
  now = T12;
  b.change(40, 80000);
  b.put();
  a.pump();
  now = T17;
  b.change(1, 1);
  a.run('reset()');
  a.run('cloudPut(true)');
  b.pump();
  expect(b.gems() === 0, 'a game erased on the other device did not replace the one with more play (gems ' + b.gems() + ')');
  expect(b.run('S.er') === T17 && a.run('S.er') === T17, 'the erase time did not reach both devices');
}
{
  const [a, b] = pairIos();
  a.lag = true;
  now = T12;
  b.change(40, 80000);
  b.put();
  now = T17;
  a.run('reset()');
  a.run('cloudPut(true)');
  a.catchUp();
  expect(a.gems() === 0 && !a.run('cloudShown') && a.run('S.er') === T17, 'a copy written before the erase brought the erased game back (gems ' + a.gems() + ')');
  b.pump();
  expect(b.gems() === 0, 'the other device did not take the erased game');
}

// iCloud sends every other device's key again with each read, and the page forgets old stamps after a few: a copy that was judged
// once is not judged again, or the game would agree with a stale key, drop its play base and put for nothing
{
  const [a, b, c] = pairIos();
  b.change(5, 50);
  b.put();
  a.pump();
  expect(a.base() === c.keys[b.id()].stamp, 'the second device did not take the first copy');
  for (let i = 0; i < 9; i++) {
    a.change(1, 60);
    a.put();
  }
  const base = a.base();
  const bap = a.run('S.cl.bap');
  const n = a.puts().length;
  a.run('cloudAsk()');
  expect(a.base() === base && a.run('S.cl.bap') === bap && !a.dirty(), 'a stale key that was judged before was judged again (base ' + a.base() + ', want ' + base + ')');
  elapse(CLOUD_EVERY * 2, a);
  expect(a.puts().length === n, 'a stale key made the game put again');
  expect(!a.timers.some(t => t.every === 45000), 'the iPhone polls the cloud');
  const [x] = pair();
  expect(x.timers.some(t => t.every === 45000), 'Android does not poll the cloud');
}

// an erase is the player's last word over a claim made before it: the other device's later copy still carries that claim, and
// does not bring the erased game back when the device that erased takes its place again
{
  const { a, b } = claimPair(true);
  a.launch();
  a.lag = true;
  now = T9 + 60000;
  b.launch();
  b.lag = true;
  now = T9 + 120000;
  a.run('reset()');
  a.run('cloudPut(true)');
  expect(a.run('S.ts === S.er') && a.run('S.er') === T9 + 120000, 'the erase did not set its time once');
  now = T9 + 130000;
  b.change(40, 80000);
  b.put();
  a.catchUp();
  expect(a.run('cloudOff'), 'the erasing device was not stopped by the earlier claim');
  a.run('cloudHere()');
  expect(a.gems() === 0 && !a.run('cloudOff'), 'a copy that carries a claim from before the erase brought the erased game back (gems ' + a.gems() + ')');
  b.catchUp();
  expect(b.gems() === 0, 'the other device did not take the erased game');
}

// the answer of a forced erase put that landed comes after another device took over: the erase is done, so Play here judges the
// newest copy and the claim put does not write over it
for (const ios of [false, true]) {
  const name = ios ? 'iPhone' : 'Android';
  const { sync, a, b } = claimPair(ios);
  a.launch();
  now = T9 + 60000;
  a.run('reset()');
  a.noAck = true;
  a.run('cloudPut(true)');
  const e = a.puts()[a.puts().length - 1].stamp;
  now = T9 + 120000;
  b.launch();
  sync(a);
  expect(a.run('cloudOff'), name + ': the erasing device was not stopped');
  b.change(40, 600);
  b.put();
  a.push({ t: 'cloudPut', ok: true, stamp: e });
  expect(a.run('S.cl.force') === 0, name + ': the answer of a landed erase after the takeover was dropped');
  now += 60000;
  a.run('cloudHere()');
  elapse(10000, a, b);
  expect(a.gems() === 40 && b.gems() === 40, name + ': Play here wrote over the newest copy after an erase (a ' + a.gems() + ', b ' + b.gems() + ', want 40)');
}
// an erase put that did not land stays pending, and Play here puts it again: the other device never saw the erase and played on
// the old game, and the forced put wins against it with that device's purchase paid into the erased game
for (const ios of [false, true]) {
  const name = ios ? 'iPhone' : 'Android';
  const { sync, a, b } = claimPair(ios);
  a.launch();
  now = T9 + 60000;
  a.run('reset()');
  const erased = a.gems();
  if (ios) a.drop = true;
  else a.fail = true;
  a.run('cloudPut(true)');
  const e = a.puts()[a.puts().length - 1].stamp;
  if (ios) a.push({ t: 'cloudPut', ok: false, stamp: e });
  expect(!(ios ? a.cloud.keys[a.id()] && a.cloud.keys[a.id()].stamp === e : a.cloud.stamp === e), name + ': the erase put landed in the fake cloud');
  a.drop = a.fail = false;
  now = T9 + 120000;
  b.launch();
  sync(a);
  expect(a.run('cloudOff') && a.run('S.cl.force') === 1, name + ': the erasing device was not stopped with its erase pending');
  expect(b.gems() === 100, name + ': the other device did not keep the old game (gems ' + b.gems() + ')');
  b.run('grant("gems2", "TB")');
  b.put();
  now += 60000;
  a.run('cloudHere()');
  elapse(10000, a, b);
  const sent = a.puts()[a.puts().length - 1];
  expect(a.run('S.cl.force') === 0 && sent.force === true && sent.stamp !== e, name + ': Play here did not put the pending erase again');
  sync(b);
  b.run('cloudHere()');
  elapse(10000, a, b);
  sync(a);
  a.run('cloudHere()');
  elapse(10000, a, b);
  expect(a.gems() === erased + 500 && b.gems() === erased + 500, name + ': the devices did not end on the erased game with the purchase kept (a ' + a.gems() + ', b ' + b.gems() + ', want ' + (erased + 500) + ')');
}

// the erased game stays, but what the other device bought still reaches it and the cloud, though that device never plays again
{
  const { cloud, sync, a, b } = claimPair(false);
  a.launch();
  now = T9 + 60000;
  a.run('reset()');
  const erased = a.gems();
  a.fail = true;
  a.run('cloudPut(true)');
  a.fail = false;
  now = T9 + 120000;
  b.launch();
  sync(a);
  b.run('grant("gems2", "TB")');
  b.put();
  now += 60000;
  a.run('cloudHere()');
  elapse(10000, a);
  expect(a.gems() === erased + 500 && a.run('S.er') === T9 + 60000, 'Android: a purchase in the copy a pending erase kept out was not paid (gems ' + a.gems() + ')');
  expect(JSON.parse(cloud.json).gems === erased + 500, 'Android: the erased game was put over the purchase of the other device (cloud gems ' + JSON.parse(cloud.json).gems + ')');
}
// a copy from before the erase that carries a purchase: it is paid into the erased game, which stays erased
for (const flag of [false, true]) {
  const [a, b] = pairIos();
  a.lag = true;
  now = T12;
  b.change(40, 80000);
  if (flag) b.run('S.iap.noads = 1; S.iap.noadsTx = "TN"; S.iap.noadsUser = "u"; S.iap.noadsAt = ' + T12);
  else b.run('grant("gems2", "TB")');
  b.put();
  now = T17;
  a.run('reset()');
  a.run('cloudPut(true)');
  const erased = a.gems();
  const game = 'JSON.stringify([S.b, S.pl, S.store, S.gn, S.ms])';
  const before = a.run(game);
  a.catchUp();
  elapse(CLOUD_EVERY * 2, a);
  const what = flag ? 'Skip ads' : 'gems';
  expect(a.run('S.er') === T17 && a.run(game) === before, 'iPhone: a copy from before the erase brought its game back (' + what + ')');
  if (flag) expect(a.run('S.iap.noads') === 1, 'iPhone: Skip ads in a copy from before the erase was not paid');
  else expect(a.gems() === erased + 500, 'iPhone: gems in a copy from before the erase were not paid (gems ' + a.gems() + ')');
  const sent = a.puts()[a.puts().length - 1];
  expect(JSON.parse(sent.json)[flag ? 'iap' : 'gems'] && (flag ? JSON.parse(sent.json).iap.noads === 1 : JSON.parse(sent.json).gems === erased + 500), 'iPhone: the paid ' + what + ' did not reach the cloud');
}

// copies that wait for the server time are not taken once the first of them has taken this device over
{
  const { cloud, a, b } = claimPair(true);
  a.launch();
  now = T9 + 60000;
  b.launch();
  const first = cloud.keys[b.id()];
  const other = JSON.parse(first.json);
  other.gems = 999;
  other.ads.ap += 5000;
  other.hold = { dev: 'zz', at: T9 + 90000 };
  a.run('timeHeld = true');
  a.push({ t: 'cloud', json: first.json, at: first.at, dev: first.dev, stamp: first.stamp, more: true });
  a.push({ t: 'cloud', json: JSON.stringify(other), at: first.at, dev: 'zz', stamp: 'zz:1', more: false });
  a.run('timeHeld = false; cloudApply()');
  expect(a.run('cloudOff') && a.gems() === 100, 'a pending copy was taken into a game that was already taken over (gems ' + a.gems() + ')');
}

// a wait for an approval that another device saw come through is over here too, and only that one
{
  const [a] = pair();
  const e = { tx: 'TW', id: 'gems2', at: 1, gems: 500, x2: 0, rep: 0, deal: 0, ask: 777 };
  a.run('var K = fresh(); K.iap.wait = { gems2: 777, gems3: 888 }; var L = fresh(); L.iap.paid = [' + JSON.stringify(e) + ']; L.iap.tx = ["TW"]; meet(K, L, false)');
  expect(a.run('K.gems') === 500 && a.run('K.iap.wait.gems2') === undefined && a.run('K.iap.wait.gems3') === 888, 'a wait stayed after a purchase made elsewhere settled it (wait ' + a.run('JSON.stringify(K.iap.wait)') + ')');
  a.run('K = fresh(); K.iap.wait = { gems2: 999 }; meet(K, L, false)');
  expect(a.run('K.iap.wait.gems2') === 999, 'a wait of another ask was cleared by an older purchase');
}

// regulars, mission claims and the daily streak are progress too
{
  const [a, b] = pair();
  a.run('S.rg.o.ollie = 1; save()');
  expect(a.dirty(), 'meeting a regular was not counted as a change');
  a.put();
  b.ask();
  expect(b.run('!!S.rg.o.ollie'), 'a regular met on one device did not reach the other');
  b.run('S.cl.sig = cloudSig(S); S.mi = { d: 0, m: [{ c: 1 }], b: 0 }');
  expect(b.dirty(), 'a mission claim was not counted as a change');
  b.run('S.cl.sig = cloudSig(S); S.day.n++');
  expect(b.dirty(), 'the daily streak was not counted as a change');
}

// a deal still open on this device is not replaced by an old one of the kept copy
for (const more of [false, true]) {
  const [a, b] = pair("S.iap.held = { id: 'gems2', bonus: 100, until: clock() - 1000, at: clock() - 5000 }; ");
  a.run("S.iap.held = { id: 'gems3', bonus: 240, until: clock() + 86400000, at: clock() }; S.iap.wait.gems3 = clock() + 86400000");
  a.change(0, more ? 9000 : 10);
  b.change(1, 5000);
  b.put();
  a.ask();
  expect(a.run('S.iap.held && S.iap.held.id') === 'gems3', 'the open held deal was replaced by an old one (more play here: ' + more + ')');
  const g = a.gems();
  a.run('grant("gems3", "TA"); dealBonus("gems3", clock(), "TA")');
  expect(a.gems() === g + 1200 + 240, 'the bonus of the pending purchase was lost (more play here: ' + more + ', got ' + (a.gems() - g) + ')');
}

// a deal that was used on one device does not come back from the other's older copy
{
  const [a, b] = pair();
  a.run("S.iap.held = { id: 'gems2', bonus: 100, until: clock() + 86400000, at: clock() }; S.iap.wait.gems2 = clock() + 86400000");
  a.change(0, 10);
  a.put();
  b.ask();
  expect(b.run('S.iap.held && S.iap.held.id') === 'gems2' && b.run('S.iap.wait.gems2 > 0'), 'the pending purchase did not reach the other device');
  now += 600000;
  const g = a.gems();
  a.run('grant("gems2", "TA"); dealBonus("gems2", clock(), "TA")');
  expect(a.gems() === g + 500 + 100, 'the approved purchase did not pay its bonus');
  a.change(0, 10);
  a.put();
  b.ask();
  expect(b.run('JSON.stringify(S.iap.held)') === 'null' && b.run('S.iap.wait.gems2') === undefined, 'a used deal came back from the older copy');
  b.run('grant("gems2", "TA2")');
  expect(b.gems() === g + 500 + 100 + 500, 'a later plain purchase paid a bonus again (gems ' + b.gems() + ')');
  b.put();
  a.ask();
  expect(a.run('JSON.stringify(S.iap.held)') === 'null' && a.run('S.iap.wait.gems2') === undefined, 'a used deal came back to the device that used it');
}

// the first put after a return or a launch waits, so the copy iCloud is still bringing from the iPad is taken before the game
// writes
{
  const [a, b, c] = pairIos();
  a.lag = true;
  now = T12;
  b.change(50, 10800);
  b.put();
  const gems = b.gems();
  now = T17;
  elapse(100000, a);
  now = T17;
  a.run('cloudBack()');
  a.change(1, 3);
  expect(a.run('cloudAt + CLOUD_EVERY - performance.now()') > 0, 'the first put after a return is not delayed');
  expect(!a.puts().length, 'a put went out before the delay was over');
  a.catchUp();
  expect(a.gems() === gems && a.base() === b.base(), 'the iPad copy that came before the delayed put was not taken');
  const w = device(c, a.st);
  w.launch();
  expect(w.run('cloudAt + CLOUD_EVERY - performance.now()') > 0, 'the first put after a launch is not delayed');
}

// two devices open at once and played about alike: the copy does not swap between the two games on every round
{
  const [a, b, c] = pair();
  a.run("devKey = 'z'");
  b.run("devKey = 'b'");
  for (let k = 0; k < 6; k++) {
    now += 30000;
    a.change(1, 30);
    a.put();
    b.change(1, 30);
    a.change(1, 0);
    b.ask();
    b.put();
    a.ask();
    a.put();
  }
  expect(a.gems() === 112 && a.base() === c.stamp, 'the device with the larger id lost play to one that played about the same (gems ' + a.gems() + ')');
  b.ask();
  expect(a.gems() === b.gems(), 'the two devices did not settle on one game (' + a.gems() + ' and ' + b.gems() + ')');
}

// a ledger that is full has forgotten old entries: meeting a copy that lists them pays nothing again
{
  const [a, b, c] = pair();
  for (let i = 0; i < 100; i++) {
    now += 1000;
    a.run('grant("gems1", "T' + i + '")');
  }
  a.put();
  b.ask();
  expect(b.run('S.iap.paid.length') === 100, 'the copy with a full ledger was not taken');
  b.fail = true;
  for (let i = 0; i < 2; i++) {
    now += 1000;
    b.run('grant("gems1", "X' + i + '")');
  }
  b.fail = false;
  b.change(0, 9000);
  a.change(1, 10);
  a.put();
  const g = b.gems();
  b.ask();
  expect(b.gems() === g, 'a full ledger paid ' + (b.gems() - g) + ' gems again');
  expect(b.run('S.iap.paid.length') === 100 && b.run('new Set(S.iap.paid.map(function (e) { return e.tx; })).size') === 100, 'the ledger holds the same purchase twice');
}

// a full ledger is not sorted: meeting a copy appends its older entries at the end, and the cutoff is the oldest entry held
{

  const [a, b] = pair();
  a.run(`S.iap.paid = []; S.iap.tx = [];
    for (var i = 0; i < 99; i++) S.iap.paid.push({ tx: 'K' + i, id: 'gems1', at: 100 + i, gems: 1, x2: 0, rep: 0, deal: 0, ask: 0 });
    var other = fresh();
    other.iap.paid = [{ tx: 'L50', id: 'gems1', at: 50, gems: 1, x2: 0, rep: 0, deal: 0, ask: 0 }];
    meet(S, other, false);
    credit(product('gems1'), 'K99');`);
  expect(a.run('S.iap.paid.length') === 100 && a.run('S.iap.paid[0].at') !== 50, 'the ledger of the finding was not built');
  const g = a.gems();
  a.run(`var m = fresh();
    m.iap.paid = [{ tx: 'M60', id: 'gems1', at: 60, gems: 7, x2: 0, rep: 0, deal: 0, ask: 0 }];
    meet(S, m, false)`);
  expect(a.gems() === g + 7, 'a purchase older than the first entry of a full ledger was dropped (gems ' + (a.gems() - g) + ')');
}

// both devices met the deal of the day: a deal held for approval here survives the other device's purchase of the same pack
{
  const [a, b] = pair();
  a.run("S.iap.deal = { id: 'gems2', bonus: 100, until: clock() + 86400000, at: clock() + 5 }; grant('gems2', 'TA'); dealBonus('gems2', clock(), 'TA')");
  b.run("S.iap.held = { id: 'gems2', bonus: 100, until: clock() + 86400000, at: clock() }; S.iap.wait.gems2 = clock() + 86400000");
  a.change(0, 9000);
  b.change(0, 100);
  a.put();
  b.ask();
  expect(b.run('S.iap.held && S.iap.held.id') === 'gems2' && b.run('S.iap.wait.gems2 > 0'), 'the deal held for approval was dropped by the other device\'s purchase');
  const g = b.gems();
  b.run('grant("gems2", "TB"); dealBonus("gems2", clock(), "TB")');
  expect(b.gems() === g + 500 + 100, 'the approved purchase lost its bonus (gems ' + (b.gems() - g) + ')');
}

// Play Games cannot be reached: the first launch stops waiting without a copy, and the game is not told there is none
{
  const cloud = newCloud();
  cloud.json = JSON.stringify({ ...good, ts: T9 });
  const d = device(cloud);
  d.unavail = true;
  d.launch();
  expect(d.run('loaded') === true && d.run('cloudState') === 'unavailable', 'an unreachable cloud did not end the wait');
  expect(d.gems() !== good.gems, 'a copy was taken from an unreachable cloud');
}

// an erase whose forced put failed stays an erase: the copy the cloud holds does not replace it, and the put is forced when it goes
{
  const [a, b, c] = pair();
  b.change(40, 80000);
  b.put();
  a.fail = true;
  a.run('reset()');
  a.run('cloudPut(true)');
  a.ask();
  expect(a.gems() === 0, 'a copy with more play undid an erase that had not reached the cloud');
  const w = device(c, a.st);
  w.fail = true;
  w.launch();
  expect(w.run('S.cl.force') === 1 && w.gems() === 0, 'the erase was forgotten across a reload');
  a.fail = false;
  a.put();
  const sent = a.puts()[a.puts().length - 1];
  expect(sent.force === true && JSON.parse(c.json).gems === 0, 'the erase did not reach the cloud with force on its next put');
  expect(a.run('S.cl.force') === 0 && a.base() === c.stamp, 'the erase is still pending after its forced put landed');
  b.ask();
  expect(b.gems() === 0, 'the other device did not take the erased game');
}

// a refusal of an earlier put does not end the put that is in flight now
{
  const [a, b, c] = pair();
  b.change(40, 80000);
  b.put();
  a.drop = true;
  a.change(1, 1);
  a.put();
  const p = a.puts()[0].stamp;
  a.run('reset()');
  a.run('cloudPut(true)');
  const e = a.run('S.cl.fly.stamp');
  expect(e !== p, 'the erase did not become the put in flight');
  a.push({ ...c.ev(true), put: p });
  expect(a.run('S.cl.fly && S.cl.fly.stamp') === e, 'the refusal of an earlier put ended the one in flight');
  a.push({ t: 'cloudPut', ok: true, stamp: e });
  expect(a.base() === e && !a.run('S.cl.fly'), 'the answer of the erase was ignored');
}

// the iPhone never gates a put on the iCloud identity, which is nil with iCloud Drive off while the key-value store still syncs
{
  const swift = fs.readFileSync(path.join(root, 'ios', 'MainStreet', 'CloudBridge.swift'), 'utf8');
  expect(!/ubiquityIdentityToken\s*==\s*nil/.test(swift), 'CloudBridge.swift still reads the iCloud identity token');
  // the key of earlier builds is read only while no per-device key exists, or it could shadow the old install's newer key; a
  // read and a change from another device apply the same rule, since a fresh install gets the key only through the change, and
  // a held legacy key makes the state available. (the Swift cannot run here: this checks the source, CI builds it)
  const legacy = swift.slice(swift.indexOf('func legacy('), swift.indexOf('func copiesIn('));
  const copiesIn = swift.slice(swift.indexOf('func copiesIn('), swift.indexOf('func others('));
  const get = swift.slice(swift.indexOf('func get('), swift.indexOf('func state('));
  const state = swift.slice(swift.indexOf('func state('), swift.indexOf('func legacy('));
  const changed = swift.slice(swift.indexOf('@objc private func changed'));
  expect(/forKey: "save"/.test(legacy) && /allSatisfy\(\{\s*!\$0\.hasPrefix\(prefix\)\s*\}\)/.test(legacy) && !/legacyRead/.test(swift), 'CloudBridge.swift reads the legacy key beside per-device keys');
  expect(/legacy\(\)/.test(copiesIn) && /copiesIn\(/.test(get) && /copiesIn\(keys\)/.test(changed) && !/\.filter \{ \$0\.hasPrefix/.test(changed), 'CloudBridge.swift does not apply the legacy rule to a change from iCloud');
  expect(/legacy\(\) != nil/.test(state), 'CloudBridge.swift reports pending with only the legacy key held');
}

{
  const [a] = pairIos();
  a.run('fillStore(); save()');
  console.log('a save with every department and place at its last level: ' + a.run('saved().length') + ' bytes');
}

// Android cannot be run here: the source is checked for the two rules that were broken. A saved game that cannot be read is
// not an empty one (no null copy, no write over it), and 'available' follows every read that worked after another state
{
  const kt = fs.readFileSync(path.join(root, 'android', 'app', 'src', 'main', 'java', 'com', 'aytutuna', 'mainstreet', 'CloudBridge.kt'), 'utf8');
  expect(/catch \(e: Exception\) \{\s*null\s*\}/.test(kt) && kt.includes('if (bytes.isEmpty()) JSONObject()'), 'CloudBridge.kt reads an unreadable saved game as an empty one');
  expect(kt.includes('if (saved == null) return@open state("unavailable")') && kt.includes('return@open done(stamp, false)'), 'CloudBridge.kt does not stop on a saved game it cannot read');
  expect(kt.includes('if (lastState != "available") state("available")'), 'CloudBridge.kt does not send available after a failed read');
}


// the return handler of ui.js, cut out as it is and run in the device's page; the time away it pays is logged
const uiSrc = fs.readFileSync(path.join(root, 'ui.js'), 'utf8').split('\r\n').join('\n');
const visFrom = uiSrc.indexOf('  var hiddenAt = 0;');
const visTo = uiSrc.indexOf('\n  });\n}', visFrom) + '\n  });'.length;
const visCode = uiSrc.slice(visFrom, visTo).replace('var a = away(sec);', 'var a = uiAway(sec);');
expect(visFrom >= 0 && visCode.indexOf('uiAway') > 0, 'the return handler of ui.js was not found');
function installVis(d) {
  d.run('var visH = null; var awayLog = []; var ac = null; var sweep = null; var lastTick = 0;' +
    'var remindOn = true; function musicSync() {} function tell() {} function askOther() {} function updateBest() {}' +
    'function uiAway(s) { awayLog.push(Math.round(s)); return away(s); }' +
    "document.addEventListener = function (t, f) { if (t === 'visibilitychange') visH = f; };");
  d.run(visCode);
  d.hide = () => d.run('document.hidden = true; visH()');
  d.show = () => d.run('document.hidden = false; visH()');
  d.time = () => d.run('gotTime({ n: timeN, ms: __now(), sent: Date.now(), recv: Date.now() })');
  d.away = () => d.run('awayLog');
}

// the fresh copy another device starts never replaces the game of the device that was taken over: the first device holds a purchase and a game far ahead of
// the fresh copy another device started when its first iCloud sync was slow, and Play here still brings its own game back
{
  const { cloud, a, b } = claimPair(true);
  a.launch();
  a.run('S.store = 3; S.rep = 77; S.ads.ap += 50000; save()');
  a.run('grant("gems2", "TA")');
  elapse(CLOUD_EVERY + 1000, a, b);
  a.put();
  b.seen = {};
  b.lag = true;
  b.lagged = [];
  now += 60000;
  b.launch();
  elapse(11000, a, b);
  a.pump();
  expect(a.run('cloudOff'), 'iPhone: the first device did not stop under the fresh game');
  expect(a.run('S.store') === 3 && a.run('S.rep') === 77 && a.run('S.ads.ap') > 50000, 'iPhone: the fresh copy replaced the game of the device that was taken over');
  b.lagged = Object.keys(cloud.keys).filter(k => k !== b.id()).map(k => cloud.keys[k]);
  b.catchUp();
  elapse(5000, a, b);
  now += 60000;
  a.run('cloudHere()');
  elapse(10000, a, b);
  expect(a.run('S.store') === 3 && a.run('S.rep') === 77 && a.gems() >= 600, 'iPhone: Play here did not bring the first device\'s own game back (store ' + a.run('S.store') + ', rep ' + a.run('S.rep') + ')');
}

// the bonus of a deal is paid inside the credit, so every copy of the purchase carries it
{
  const stub = 'sfx = function () {}; buzz = function () {}; ';
  const buyDeal = (d, id, tx, bonus) => d.run(stub + "S.iap.deal = { id: '" + id + "', bonus: " + bonus + ', until: clock() + 3600000, at: clock() }; window.nativeStore({ t: "bought", id: "' + PID + id + '", tx: "' + tx + '", at: clock() })');
  for (const ios of [false, true]) {
    const name = ios ? 'iPhone' : 'Android';
    // the holder buys on a deal and the other device opens within the throttle
    {
      const { sync, a, b } = claimPair(ios);
      a.launch();
      elapse(CLOUD_EVERY + 1000, a, b);
      buyDeal(a, 'gems2', 'TA', 100);
      expect(a.gems() === 700, name + ': the deal bonus was not paid (gems ' + a.gems() + ')');
      elapse(10000, a, b);
      b.launch();
      elapse(5000, a, b);
      sync(a);
      b.change(2, 600);
      b.put();
      elapse(60000, a, b);
      a.run('cloudHere()');
      elapse(10000, a, b);
      expect(a.gems() === 702 && b.gems() === 702, name + ': a deal bonus was lost to the takeover (a ' + a.gems() + ', b ' + b.gems() + ', want 702)');
    }
    // a late purchase answer on the device that was taken over
    {
      const { sync, a, b } = claimPair(ios);
      a.launch();
      now = T9 + 60000;
      b.launch();
      sync(a);
      buyDeal(a, 'gems2', 'TA', 100);
      sync(b);
      if (!ios) b.ask();
      expect(b.gems() === 100, name + ': the holder got a late purchase before the first device was back (gems ' + b.gems() + ')');
      elapse(120000, a, b);
      b.change(3, 600);
      b.put();
      now += 60000;
      a.run('cloudHere()');
      elapse(10000, a, b);
      sync(b);
      b.run('cloudHere()');
      elapse(10000, a, b);
      expect(a.gems() === 703 && b.gems() === 703, name + ': the bonus of a late purchase was lost after Play here (a ' + a.gems() + ', b ' + b.gems() + ', want 703)');
    }
  }
  // a purchase on a deal while the other device plays on: every copy ends with the bonus
  const [a, b, c] = pair();
  b.change(1, 5000);
  buyDeal(a, 'gems2', 'TA', 100);
  b.ask();
  b.put();
  elapse(CLOUD_EVERY + 1000, a, b);
  a.ask();
  expect(a.gems() === 701 && b.gems() === 701 && JSON.parse(c.json).gems === 701, 'Android: a deal bonus did not reach every copy (a ' + a.gems() + ', b ' + b.gems() + ', cloud ' + JSON.parse(c.json).gems + ', want 701)');
  // a bonus that went out late joins a copy that already has the purchase
  const k = { tx: 'TX', id: 'gems2', at: 1, gems: 500, x2: 0, rep: 0, deal: 0, ask: 0 };
  a.run('var K = fresh(); K.gems = 5; K.iap.paid = [' + JSON.stringify(k) + ']; K.iap.tx = ["TX"]; var L = fresh(); L.iap.paid = [' + JSON.stringify({ ...k, gems: 600, deal: 7 }) + ']; meet(K, L, true)');
  expect(a.run('K.gems') === 105 && a.run('K.iap.paid[0].gems') === 600, 'meet did not pay the bonus of a known purchase (gems ' + a.run('K.gems') + ')');
}

// a deal or a held deal that the ledger brought in has already paid is not kept: the next purchase of the pack would pay its
// bonus a second time
{
  const [a] = pair();
  const paid = { tx: 'TX', id: 'gems2', at: 1, gems: 600, x2: 0, rep: 0, deal: 7, ask: 0 };
  const open = at => ({ id: 'gems2', bonus: 100, until: now + 3600000, at });
  // the ledger lists the purchase the deal was used on
  a.run('var K = fresh(); K.iap.held = ' + JSON.stringify(open(7)) + '; K.iap.deal = ' + JSON.stringify(open(7)) + '; var L = fresh(); L.iap.paid = [' + JSON.stringify(paid) + ']; meet(K, L, true)');
  expect(a.run('K.iap.held') === null && a.run('K.iap.deal') === null, 'meet kept a deal that the ledger it brought in had used');
  // the purchase was known and only its bonus comes in
  a.run('var K = fresh(); K.iap.held = ' + JSON.stringify(open(7)) + '; K.iap.paid = [' + JSON.stringify({ ...paid, gems: 500, deal: 0 }) + ']; K.iap.tx = ["TX"]; var L = fresh(); L.iap.paid = [' + JSON.stringify(paid) + ']; meet(K, L, true)');
  expect(a.run('K.iap.held') === null, 'meet kept a held deal whose bonus the ledger brought in');
  // another deal stays
  a.run('var K = fresh(); K.iap.held = ' + JSON.stringify(open(8)) + '; var L = fresh(); L.iap.paid = [' + JSON.stringify(paid) + ']; meet(K, L, true)');
  expect(a.run('K.iap.held && K.iap.held.at') === 8, 'meet dropped a deal the ledger had not used');
}

// a Restore answer that comes late on a taken-over device stays on it until the player is back: it moves Skip ads to the restoring
// user, and the holder, whose user no longer lists it, strips its own flag but not the restored one
{
  const owned = (d, user, ids, tx, how) => d.run("refundDoubt = {}; window.nativeStore({ t: 'owned', ids: " + JSON.stringify(ids) + ', tx: ' + JSON.stringify(tx) + ", user: '" + user + "'" + (how ? ', ' + how + ': true' : '') + ' })');
  for (const ios of [false, true]) {
    const name = ios ? 'iPhone' : 'Android';
    const { sync, a, b } = claimPair(ios);
    a.launch();
    a.run("S.iap.noads = 1; S.iap.noadsTx = 'N1'; S.iap.noadsUser = 'U2'; S.iap.noadsAt = clock(); save()");
    a.put();
    now += 60000;
    b.launch();
    sync(a);
    expect(a.run('cloudOff') && b.run('S.iap.noads') === 1, name + ': the first device did not stop');
    now += 5000;
    const n = a.puts().length;
    owned(a, 'U1', [PID + 'noads'], [{ id: PID + 'noads', tx: 'N1', at: 1 }], 'restore');
    expect(a.puts().length === n, name + ': a late restore was put by a device that was taken over');
    now += 5000;
    owned(b, 'U2', [], []);
    owned(b, 'U2', [], [], 'sync');
    b.change(1, 200);
    b.put();
    elapse(5 * 60000, a, b);
    if (!ios) b.ask();
    a.run('cloudHere()');
    elapse(10000, a, b);
    sync(b);
    b.run('cloudHere()');
    elapse(10000, a, b);
    expect(a.run('S.iap.noads') === 1 && b.run('S.iap.noads') === 1, name + ': Skip ads that the account owns was stripped after the return (a ' + a.run('S.iap.noads') + ', b ' + b.run('S.iap.noads') + ')');
  }
}

// a purchase credited on the device that was taken over reaches the cloud on its return, and the game with more play is the one kept
for (const ios of [false, true]) {
  const name = ios ? 'iPhone' : 'Android';
  const { sync, a, b } = claimPair(ios);
  a.launch();
  a.change(0, 5000);
  now = T9 + 60000;
  b.launch();
  sync(a);
  expect(a.run('cloudOff') && a.run('S.ads.ap') > 5000, name + ': the first device did not stop with its play');
  b.change(7, 20);
  a.run('grant("gems2", "TA")');
  sync(b);
  if (!ios) b.ask();
  expect(b.gems() === 100 + 7 && b.run('S.ads.ap') < 2000, name + ': the holder changed before the first device was back (gems ' + b.gems() + ')');
  now += 60000;
  a.run('cloudHere()');
  elapse(10000, a, b);
  sync(b);
  b.run('cloudHere()');
  elapse(10000, a, b);
  expect(b.gems() === 100 + 500 && a.gems() === b.gems() && b.run('S.ads.ap') > 5000, name + ': the game with more play did not reach the other device with the purchase (a ' + a.gems() + ', b ' + b.gems() + ', ap ' + b.run('S.ads.ap') + ')');
}

// whichever device id is larger, the purchase of the device that was taken over reaches both on its return
for (const ios of [false, true]) {
  for (const ids of [['zz', 'bb'], ['aa', 'bb']]) {
    const name = (ios ? 'iPhone' : 'Android') + ' ' + ids.join('/');
    const { sync, a, b } = claimPair(ios);
    a.run("devKey = '" + ids[0] + "'");
    b.run("devKey = '" + ids[1] + "'");
    a.launch();
    now = T9 + 60000;
    b.launch();
    sync(a);
    expect(a.run('cloudOff'), name + ': the first device did not stop');
    b.change(7, 20);
    a.run('grant("gems2", "TA")');
    sync(b);
    if (!ios) b.ask();
    expect(b.gems() === 107 && !b.run('cloudOff'), name + ': the holder changed before the first device was back (gems ' + b.gems() + ')');
    now += 60000;
    a.run('cloudHere()');
    elapse(10000, a, b);
    sync(b);
    b.run('cloudHere()');
    elapse(10000, a, b);
    expect(a.gems() >= 600 && b.gems() >= 600, name + ': the purchase did not reach both devices whichever id is larger (a ' + a.gems() + ', b ' + b.gems() + ')');
  }
}

// Play here tapped while the return waits for the cloud keeps the return: the time away is paid once, and the next short
// absence is not paid for the play in between
for (const ios of [false, true]) {
  const name = ios ? 'iPhone' : 'Android';
  const { sync, a, b } = claimPair(ios);
  a.launch();
  installVis(a);
  now = T9 + 60000;
  b.launch();
  sync(a);
  now += 60000;
  a.hide();
  now += H;
  a.hold = true;
  a.show();
  a.time();
  a.run('cloudHere()');
  a.hold = false;
  a.pump();
  expect(a.run('hiddenAt') === 0 && a.away().length <= 1, name + ': the return was dropped by Play here (hiddenAt ' + a.run('hiddenAt') + ')');
  now += 2 * H;
  a.hide();
  now += 120000;
  a.show();
  a.time();
  a.pump();
  expect(a.away().length > 0 && a.away()[a.away().length - 1] === 120, name + ': the next return paid played time as away time ' + JSON.stringify(a.away()));
}

// leaving again before the cloud answers does not finish the return or claim from the background; the next return runs it all
for (const ios of [false, true]) {
  const name = ios ? 'iPhone' : 'Android';
  const { sync, a, b } = claimPair(ios);
  a.launch();
  installVis(a);
  b.launch();
  now = T9 + 60000;
  sync(a);
  now += 60000;
  a.hide();
  now += H;
  a.hold = true;
  a.show();
  a.time();
  now += 1000;
  a.hide();
  a.hold = false;
  a.pump();
  elapse(5000, a);
  sync(b);
  expect(a.run('hiddenAt') > 0 && !b.run('cloudOff'), name + ': a device in the background finished its return and claimed (hiddenAt ' + a.run('hiddenAt') + ', b off ' + b.run('cloudOff') + ')');
  const posts = a.posts.length;
  now += 8 * H;
  a.show();
  a.time();
  a.pump();
  const sent = a.posts.slice(posts).map(m => m.cmd);
  expect(sent.includes('cloudGet') && sent.includes('time') && a.run('hiddenAt') === 0 && a.run('claim') !== null, name + ': the next return did not run in full (' + sent.join(',') + ', hiddenAt ' + a.run('hiddenAt') + ')');
}

// a put whose answer never reached the page (the app was killed) must not keep the next launch from claiming and putting
for (const ios of [false, true]) {
  const name = ios ? 'iPhone' : 'Android';
  const cloud = ios ? newKeys() : newCloud();
  now = T9;
  const a = device(cloud, {}, { claim: true });
  a.run('S = fresh(); S.gems = 100; S.ads.ap = 1000; save()');
  a.launch();
  now = T9 + 60000;
  a.change(5, 100);
  a.noAck = true;
  a.put();
  expect(a.run('S.cl.fly') !== null, name + ': the put in flight is not there');
  now = T12;
  const a2 = device(cloud, a.st, { claim: true });
  a2.launch();
  expect(a2.puts().length >= 1 && a2.run('claim') !== null, name + ': the launch after a lost answer did not claim and put (puts ' + a2.puts().length + ')');
  a2.change(50, 600);
  elapse(CLOUD_EVERY, a2);
  a2.put();
  const key = ios ? JSON.parse(cloud.keys[a2.id()].json) : JSON.parse(cloud.json);
  expect(key.gems === a2.gems(), name + ': a later put did not go out after a lost answer (cloud ' + key.gems + ', local ' + a2.gems() + ')');
}
{
  const [, b, c] = pairIos();
  now = T9 + 60000;
  b.change(5, 100);
  b.noAck = true;
  b.put();
  now = T12;
  const b2 = device(c, b.st, { claim: true });
  b2.launch();
  expect(b2.puts().length >= 1, 'iPhone: with a second device, the launch after a lost answer did not put');
}


// Android: the return's read is slower than CLOUD_BACK, so the device claims on the timeout; the read then brings the holder's
// copy and the device takes it, and the answer of the claim put that follows (refused or failed) is no longer known as the claim's.
// The claim must still go out, so the holder is stopped within a poll and nothing has to change on this device
for (const slowPutFails of [false, true]) {
  const { cloud, a, b } = claimPair(false);
  const autosave = d => d.run("setInterval(function () { if (!timeHeld && !cloudHeld() && !document.hidden) save(); }, 5000)");
  a.launch();
  installVis(a);
  autosave(a);
  a.change(1, 50);
  a.put();
  now += 1000;
  tick += 1000;
  a.hide();
  now += 60000;
  tick += 60000;
  b.launch();
  installVis(b);
  autosave(b);
  b.change(3, 400);
  b.put();
  now += 60000;
  tick += 60000;
  a.hold = true;
  a.show();
  a.time();
  if (slowPutFails) a.fail = true;
  elapse(4100, a, b);
  a.fail = false;
  a.hold = false;
  a.pump();
  elapse(5 * 60000, a, b);
  const how = slowPutFails ? 'failed' : 'refused';
  expect(b.run('cloudOff'), 'Android: with a ' + how + ' claim put after a slow read, the holder was never stopped (cloud hold ' + JSON.stringify(JSON.parse(cloud.json).hold) + ')');
  expect(!a.run('cloudOff') && a.run('claim') && JSON.parse(cloud.json).hold.dev === a.run('claim.dev'), 'Android: the claim of the device that came back is not in the cloud after a ' + how + ' put');
}
// a put that gets no answer within the poll's give-up time does not drop the claim it carried
{
  const { cloud, a } = claimPair(false);
  a.launch();
  elapse(10000, a);
  const before = cloud.stamp;
  a.drop = true;
  a.run('claimDue = true; cloudPut()');
  a.drop = false;
  expect(a.run('S.cl.fly && S.cl.fly.claim') && cloud.stamp === before, 'Android: the claim put was not left in flight');
  elapse(2 * 60000, a);
  expect(!a.run('claimDue') && cloud.stamp !== before && JSON.parse(cloud.json).hold.dev === 'aa', 'Android: a claim put that was given up was never sent again');
}

// the reminders note follows the system setting, but only once the player was asked: a refusal and a later allow clears it
{
  const code = uiSrc.slice(uiSrc.indexOf('function notifyState('), uiSrc.indexOf('function claimGoalAt('));
  const box = { S: {}, remindDenied: false, REMIND_DENIED_KEY: 'k', setSound() {}, localStorage: { v: null, setItem(k, v) { this.v = v; } } };
  vm.runInNewContext(code, box);
  box.notifyState('denied');
  expect(!box.remindDenied && box.localStorage.v === null, 'reminders: a notify state before the first ask was taken');
  box.S.ask = 1;
  box.notifyState('denied');
  expect(box.remindDenied && box.localStorage.v === '1', 'reminders: a refusal was not kept');
  box.notifyState('granted');
  expect(!box.remindDenied && box.localStorage.v === '0', 'reminders: allowing in Settings did not clear the refusal');
}

if (failed) process.exit(1);
console.log('cloud ok');
