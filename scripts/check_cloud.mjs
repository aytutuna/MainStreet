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

const iosEv = (e, more) => ({ t: 'cloud', json: e ? e.json : null, at: e ? e.at : 0, dev: e ? e.dev : '', stamp: e ? e.stamp : '', refused: false, put: '', more: !!more });

// one device: its own page (vm), its own local storage, and the native side answering its messages one pump later, as the
// real bridges do. hold keeps the answers back, fail makes puts fail, drop loses them without a word, stale is what a cache that has not synced answers to a read
function device(cloud, st = {}, opts = {}) {
  const dev = { st, cloud, posts: [], inbox: [], hold: false, fail: false, drop: false, out: false, unavail: false, fails: [], seen: {}, lagged: [], offline: false, mine: '' };
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
    navigator: { language: 'en', userAgent: '' },
    location: { search: '', protocol: 'app:' },
    setTimeout: () => 1,
    clearTimeout() {},
    setInterval: () => 1,
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
    if (m.cmd === 'cloudState') dev.inbox.push({ t: 'cloudState', state: Object.keys(dev.seen).some(k => k !== dev.mine) ? 'available' : 'pending' });
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
      dev.inbox.push({ t: 'cloudPut', ok: true, stamp: m.stamp });
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
    dev.lagged.splice(0).forEach(e => {
      dev.seen[e.dev] = e;
      dev.inbox.push(iosEv(e));
    });
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
        dev.inbox.push({ t: 'cloudPut', ok: true, stamp: m.stamp });
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
    // and one that comes in on the device that was taken over waits for Play here, then is joined into the newest game
    sync(a);
    expect(a.run('cloudOff'), name + ': the first device did not stop');
    const n = a.puts().length;
    a.run('grant("gems3", "TB")');
    expect(a.puts().length === n && a.gems() === 600 + 1200, name + ': a purchase on a taken-over device went out or was lost');
    b.change(5, 800);
    b.put();
    now += 60000;
    a.run('cloudHere()');
    expect(a.gems() === 600 + 1200 + 5 && !a.run('cloudOff'), name + ': the purchase made while stopped was not joined into the newest game (gems ' + a.gems() + ')');
    sync(b);
    b.run('cloudHere()');
    expect(b.gems() === a.gems(), name + ': the other device did not get the joined game (gems ' + b.gems() + ' and ' + a.gems() + ')');
  }
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
  a.run('cloudGot()');
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
    const refund = d => d.run('S.iap.' + f + " = 0; S.iap." + f + "Tx = ''; S.iap." + f + "User = ''; S.iap.rf = ['N1 U1']");
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
      expect(on(a) === 0 && a.run('S.iap.rf.indexOf("N1 U1") >= 0'), f + ' came back from a copy that still carried the refunded purchase (kept here: ' + mine + ')');
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
  expect(a.run('S.iap.rf.indexOf("N1 U1") >= 0') && a.run('S.iap.noads') === 1 && a.run('S.iap.noadsUser') === 'U2', 'the first device did not get Skip ads back from the restored copy');
  a.put();
  b.ask();
  expect(b.run('S.iap.noads') === 1, 'a restore was taken as a refund on the device that restored');
  // a restore again gives it back for good
  own(b, 'U2', [PID + 'noads'], listed, 'restore');
  expect(b.run('S.iap.rf.every(function (e) { return e.indexOf("N1 ") !== 0 || e === "N1 U1"; })'), 'a restore left its own transaction in the refunds');
  b.put();
  a.ask();
  expect(a.run('S.iap.noads') === 1 && b.run('S.iap.noads') === 1, 'the restored purchase was switched off again');
  // a real refund: B's user no longer lists it
  b.run("refundDoubt = {}");
  own(b, 'U2', [], [], 'sync');
  expect(b.run('S.iap.noads') === 0, 'a refund on the restoring user did not strip B');
  b.put();
  a.ask();
  expect(a.run('S.iap.noads') === 0, 'a refund did not reach the other device');
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
  tick += 100000;
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

if (failed) process.exit(1);
console.log('cloud ok');
