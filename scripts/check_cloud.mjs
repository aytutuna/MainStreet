// Plays the cloud save rules of shop.js and sim.js in a node vm, with a fake native side that records what the page puts.
//   node scripts/check_cloud.mjs
// The rule: every copy is judged by its own time whenever it arrives, the newest wins with no question asked, nothing is put
// before the cloud has been read since the launch or the return, and a refund removes Skip ads and x2 whichever copy is kept.
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const good = fs.readFileSync(path.join(root, 'scripts', 'fixtures', 'save-v11.json'), 'utf8').trim();

const H = 3600000;
const T9 = Date.UTC(2026, 0, 1, 9);
const T12 = T9 + 3 * H;
const T17 = T9 + 8 * H;

const store = {};
const posts = [];
let now = T17;
let tick = 0;
const ctx = {
  console,
  localStorage: {
    getItem: k => (k in store ? store[k] : null),
    setItem: (k, v) => { store[k] = String(v); },
    removeItem: k => { delete store[k]; }
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
  banner() {},
  afterLoad() {},
  showAway() {},
  webkit: { messageHandlers: { store: { postMessage: m => posts.push(m) } } }
};
ctx.window = ctx;
vm.createContext(ctx);
for (const f of ['i18n.js', 'lang/en.js', 'data.js', 'sim.js', 'shop.js']) {
  vm.runInContext(fs.readFileSync(path.join(root, f), 'utf8'), ctx, { filename: f });
}
vm.runInContext('clock = function () { return __now(); };', Object.assign(ctx, { __now: () => now }));
const run = code => vm.runInContext(code, ctx);

let failed = false;
const fail = msg => { console.error('FAIL: ' + msg); failed = true; };

const base = JSON.parse(good);
const copy = (ts, iap) => JSON.stringify({ ...base, ts, iap: { ...base.iap, ...iap } });
const nativeEv = ev => run('window.nativeStore(' + JSON.stringify(ev) + ')');
const puts = () => posts.filter(m => m.cmd === 'cloudPut');
const lastPut = () => JSON.parse(puts()[puts().length - 1].json);

// a played game that was last in the foreground at 9:00, back at 17:00, cloud signed in and read at launch
function device(ts) {
  posts.length = 0;
  run('S = fresh()');
  run('S.ads.pt = 700; S.ts = ' + ts + '; cloudTs = ' + ts);
  run("loaded = true; blocked = false; cloudSeen = true; cloudState = 'available'; cloudPend = null; cloudRet = null; timeHeld = false; cloudTaken = false");
  run('cloudAt = -1e9; cloudSent = ""');
}

const ipad = (ts, iap) => ({ t: 'cloud', json: copy(ts, iap), at: ts, dev: 'ipad' });

// 1. the iPad's copy comes after the return's answer and before the first put: it is taken, not parked, and the put carries it
device(T9);
run('cloudBack()');
nativeEv({ t: 'cloud', json: null, at: 0, dev: '' });
nativeEv(ipad(T12));
if (run('S.ts') !== T12) fail('a newer copy that came after the return answer was not taken (S.ts ' + run('S.ts') + ')');
run('save()');
tick += 5000;
run('cloudPut()');
if (puts().length) fail('a game that only matches the copy it took was written back over it');
run('S.gems += 1; cloudPut()');
if (!puts().length || lastPut().ts < T12) fail('the first put after a change did not carry the newer copy');

// 1b. the copy comes after this device already put: judged by its own time, it still wins
device(T9);
run('cloudBack()');
nativeEv({ t: 'cloud', json: null, at: 0, dev: '' });
run('S.ts = ' + T17 + '; cloudPut()');
if (!puts().length) fail('nothing was put once the cloud had answered');
nativeEv(ipad(T12));
if (run('S.ts') !== T12) fail('a copy older than this device\'s own put was refused (S.ts ' + run('S.ts') + ')');

// 1c. a stale answer at launch, a put, then the real value
device(T9);
nativeEv({ t: 'cloud', json: copy(T9 - H), at: 0, dev: 'ipad' });
run('S.ts = ' + T17 + '; cloudPut()');
nativeEv(ipad(T12));
if (run('S.ts') !== T12) fail('the real value after a stale answer was refused (S.ts ' + run('S.ts') + ')');

// 1d. the same copy again is old news
device(T9);
nativeEv(ipad(T12));
run('S.ts = ' + (T12 + 1000));
run('cloudBack()');
nativeEv({ t: 'cloud', json: copy(T12), at: T12, dev: 'ipad' });
if (run('S.ts') !== T12 + 1000) fail('a copy already taken replaced the game again');

// 1e. nothing is put on return until the cloud has answered
device(T9);
run('cloudBack()');
run('cloudPut()');
if (puts().length) fail('a put went out before the return\'s read was answered');
if (!posts.some(m => m.cmd === 'cloudGet')) fail('the return did not ask the cloud');

// 2. a refund recorded here is not undone by the other device's copy that still has the purchase
for (const f of ['noads', 'x2']) {
  device(T9);
  run('S.iap.rf = ["T"]; S.iap.' + f + ' = 0');
  const o = {};
  o[f] = 1;
  o[f + 'Tx'] = 'T';
  o.rf = [];
  run('takeCloud(' + JSON.stringify(copy(T12, o)) + ')');
  if (run('S.iap.' + f) !== 0) fail(f + ' came back from the copy of a device that had not seen the refund');
  run('S.ts = ' + T17 + '; cloudPut()');
  if (lastPut().iap[f]) fail('the refunded ' + f + ' was put back to the cloud');
}

// 3. a slow cloud: the return goes on after CLOUD_BACK, but nothing is put until the late answer, which is taken at once
device(T9);
run('cloudBack()');
run('cloudGot()');
run('S.ts = ' + T17 + '; cloudPut()');
if (puts().length) fail('this device\'s stale game was put while the cloud had not answered');
nativeEv({ t: 'cloud', json: copy(T12), at: T12, dev: 'ipad' });
if (run('S.ts') !== T12) fail('the late answer was not taken (S.ts ' + run('S.ts') + ')');
run('S.gems += 1; cloudPut()');
if (!puts().length || lastPut().ts !== T12) fail('the put after the late answer did not carry it');

// 3b. the answer comes while the time is unknown and the player hides before the time answer
device(T9);
run('cloudBack(); timeHeld = true');
nativeEv(ipad(T12));
run('cloudPut()');
if (puts().length) fail('a copy waiting for the time answer was put over');
run('timeHeld = false; cloudApply()');
if (run('S.ts') !== T12) fail('the copy that waited for the time was not taken');
run('S.gems += 1; cloudPut()');
if (!puts().length || lastPut().ts !== T12) fail('the put after the waiting copy did not carry it');

// 4. a hold in the middle of a session: the copy that comes during it is taken when the time answer ends it
device(T9);
run('timeHeld = true; timeFirst = 1; timeN = 1; timeGot = 0; timeDone = null');
nativeEv(ipad(T12));
run('gotTime({ n: 1, ms: ' + T17 + ', sent: Date.now(), recv: Date.now() })');
if (run('timeHeld')) fail('the time answer did not end the hold');
if (run('S.ts') !== T12) fail('the copy parked during a mid-session hold was not taken (S.ts ' + run('S.ts') + ')');
run('S.gems += 1; cloudPut()');
if (!puts().length || lastPut().ts !== T12) fail('puts stayed blocked after a mid-session hold');

// 5. an answer from iCloud's cache that has not synced: taken if newer, but nothing is written until a fresh answer
device(T9);
run('cloudBack()');
nativeEv({ t: 'cloud', json: copy(T9 - H), at: 0, dev: 'ipad', fresh: false });
run('S.gems += 1; cloudPut()');
if (puts().length) fail('a put went out on a cache answer that had not synced');
nativeEv(ipad(T12));
if (run('S.ts') !== T12) fail('the real value after a cache answer was not taken');
run('S.gems += 1; cloudPut()');
if (!puts().length || lastPut().ts !== T12) fail('the put after the fresh answer did not carry the copy');

// 6. a read that gets no answer is asked again, and nothing is put meanwhile
device(T9);
run('cloudBack()');
run('cloudGot()');
posts.length = 0;
run('cloudRetry()');
if (!posts.some(m => m.cmd === 'cloudGet')) fail('a read without an answer was not asked again');
run('S.gems += 1; cloudPut()');
if (puts().length) fail('a put went out while the read had no answer');
nativeEv(ipad(T12));
run('cloudRetry()');
if (posts.filter(m => m.cmd === 'cloudGet').length !== 1) fail('the read was asked again after it had been answered');

// 7. an open game that only earns does not overwrite the other device's changes, one that changed does
device(T9);
nativeEv(ipad(T12));
for (let k = 0; k < 3; k++) {
  now += 15000;
  tick += 15000;
  run('save()');
  run('cloudAt = -1e9; cloudPut()');
}
if (puts().length) fail('an idle open game kept writing its own copy');
run('S.gems += 5; cloudAt = -1e9; cloudPut()');
if (puts().length !== 1) fail('a changed game was not written');

// a copy older than what this device read is still refused
device(T12);
run('S.iap.tx = ["a"]');
nativeEv(ipad(T9));
if (run('S.ts') !== T12) fail('an older copy replaced a newer game');

if (failed) process.exit(1);
console.log('cloud ok');
