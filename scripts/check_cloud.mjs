// Plays the cloud save rules of shop.js and sim.js in node vms, one per device, against a fake cloud that behaves like the native
// bridges: it keeps the stamp of the copy it holds and refuses a put whose base is another stamp.
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

// one device: its own page (vm), its own local storage, and the native side answering its messages one pump later, as the
// real bridges do. hold keeps the answers back, fail makes puts fail, drop loses them without a word, stale is what a cache that has not synced answers to a read
function device(cloud, st = {}) {
  const dev = { st, cloud, posts: [], inbox: [], hold: false, fail: false, drop: false, stale: null, fails: [] };
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
    $: () => ({ hidden: false, addEventListener() {}, style: {} }),
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

  const native = m => {
    if (m.cmd === 'cloudState') dev.inbox.push({ t: 'cloudState', state: 'available' });
    else if (m.cmd === 'cloudGet') dev.inbox.push(dev.stale || cloud.ev());
    else if (m.cmd === 'cloudPut') {
      if (dev.drop) return;
      if (dev.fail) dev.inbox.push({ t: 'cloudPut', ok: false, stamp: m.stamp });
      else if (!m.force && cloud.json !== null && cloud.stamp !== (m.base || '')) dev.inbox.push(cloud.ev(true));
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
  dev.change = (gems, pt) => dev.run('S.gems += ' + gems + '; S.ads.pt += ' + (pt || 0) + '; save()');
  dev.put = () => dev.run('cloudPut()');
  dev.puts = () => dev.posts.filter(m => m.cmd === 'cloudPut');
  dev.gems = () => dev.run('S.gems');
  dev.base = () => dev.run('S.cl.base');
  dev.dirty = () => dev.run('cloudSig(S) !== S.cl.sig');
  // the cloud tells this device that the copy changed (iCloud), or it asks (a return, Play Games)
  dev.push = ev => { dev.inbox.push(ev); dev.pump(); };
  dev.ask = () => dev.run("post({ cmd: 'cloudGet' })");
  return dev;
}

// two devices that have agreed on one cloud copy: the first made the game and put it, the second was installed after
function pair(setup) {
  const cloud = newCloud();
  now = T9;
  const a = device(cloud);
  a.run('S = fresh(); S.gems = 100; S.ads.pt = 1000; ' + (setup || '') + 'save()');
  a.launch();
  a.put();
  const b = device(cloud);
  b.launch();
  expect(a.base() === cloud.stamp && b.base() === cloud.stamp && cloud.stamp, 'the pair did not agree on the first copy');
  expect(!a.dirty() && !b.dirty(), 'a device that took or wrote the copy counts as changed');
  a.posts.length = b.posts.length = 0;
  return [a, b, cloud];
}

// scenario A: the iPhone is hidden at 9:00, the iPad plays to 12:00, the iPhone returns at 17:00 and taps once before the
// iPad's copy, which iCloud brings late, arrives. The iPad's copy wins; the one tap is the only loss
for (const hide of [false, true]) {
  const [a, b, c] = pair();
  const s0 = c.ev();
  now = T12;
  b.change(50, 10800);
  b.put();
  const s1 = c.ev();
  const gems = b.gems();
  now = T17;
  a.stale = s0;
  a.run('cloudBack()');
  expect(!a.run('cloudHeld()'), 'the cache answer did not end the return wait');
  a.change(1, 3);
  if (hide) {
    a.put();
    expect(c.stamp === s1.stamp, 'a put on an old base overwrote the iPad copy');
  }
  a.push(s1);
  expect(a.gems() === gems, 'the iPad copy did not win over one tap (gems ' + a.gems() + ', iPad ' + gems + ')');
  expect(a.base() === s1.stamp && !a.dirty(), 'the iPhone did not agree with the iPad copy afterwards');
  a.put();
  expect(c.stamp === s1.stamp, 'the iPhone wrote over the iPad copy it had just taken');
}

// scenario B: the cache answer at launch is the copy the game already agrees with, the real one comes after
{
  const [a, b, c] = pair();
  const s0 = c.ev();
  now = T12;
  b.change(7, 500);
  b.put();
  const a2 = device(c, a.st);
  a2.stale = s0;
  a2.launch();
  expect(!a2.puts().length && a2.gems() === 100, 'the stale answer changed or wrote the game');
  a2.push(c.ev());
  expect(a2.gems() === b.gems() && a2.base() === c.stamp, 'the real copy after a stale answer was not taken');
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
    expect(a.dirty(), 'the game kept was not marked for a put');
    a.put();
    expect(JSON.parse(c.json).gems === 103, 'the game kept was not written over the older copy');
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
  expect(a.gems() === 101 && a.run('cloudPend !== null'), 'a copy that came while the time was unknown was not parked');
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
    expect(c.stamp === s1 && a.base() === s1 && a.dirty() && a.gems() === 105, 'the game with more play was not kept after the refusal (gems ' + a.gems() + ')');
    a.put();
    expect(c.stamp !== s1 && JSON.parse(c.json).gems === 105 && a.base() === c.stamp, 'the game kept was not written on the new base');
  } else {
    expect(a.gems() === 140 && a.base() === s1 && !a.dirty(), 'the copy with more play was not taken after the refusal (gems ' + a.gems() + ')');
  }
}

// both devices bought gem packs on a deal while apart: the game kept has both packs and both bonuses, once
for (const aMore of [false, true]) {
  const [a, b, c] = pair();
  const buy = (d, id, tx, bonus) => d.run("S.iap.deal = { id: '" + id + "', bonus: " + bonus + ', until: clock() + 3600000 }; grant("' + id + '", "' + tx + '"); dealBonus("' + id + '", clock(), "' + tx + '")');
  buy(a, 'gems2', 'TA', 100);
  buy(b, 'gems3', 'TB', 240);
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
    const refund = d => d.run('S.iap.' + f + " = 0; S.iap." + f + "Tx = ''; S.iap.rf = ['N1']");
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
      expect(on(a) === 0 && a.run('S.iap.rf.indexOf("N1") >= 0'), f + ' came back from a copy that still carried the refunded purchase (kept here: ' + mine + ')');
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
  expect(d.run('S.ads.pt') === 0 && d.base() === '', 'the new game did not start empty');
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

if (failed) process.exit(1);
console.log('cloud ok');
