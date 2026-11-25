// A deal waiting on a slow purchase survives a tap on another pack, and that pack's answer is not freed by the deal's.
//   node scripts/check_deal.mjs
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const posts = [];
let now = Date.UTC(2026, 0, 1, 12);
const ctx = {
  console,
  localStorage: { getItem: () => null, setItem() {}, removeItem() {} },
  performance: { now: () => 0 },
  btoa: s => Buffer.from(s).toString('base64'),
  atob: s => Buffer.from(s, 'base64').toString(),
  document: { write() {}, addEventListener() {}, documentElement: {}, hidden: false },
  navigator: { language: 'en', userAgent: '' },
  location: { search: '', protocol: 'app:' },
  setTimeout: () => 1,
  clearTimeout() {},
  setInterval: () => 1,
  $: () => ({ hidden: true, addEventListener() {}, style: {} }),
  View: { ready: () => true },
  tl: k => k,
  loadFail() {},
  banner() {},
  sfx() {},
  buzz() {},
  afterLoad() {},
  showAway() {},
  webkit: { messageHandlers: { store: { postMessage: m => posts.push(m) } } }
};
ctx.window = ctx;
vm.createContext(ctx);
for (const f of ['i18n.js', 'lang/en.js', 'data.js', 'sim.js', 'shop.js']) {
  vm.runInContext(fs.readFileSync(path.join(root, f), 'utf8'), ctx, { filename: f });
}
ctx.__now = () => now;
const run = code => vm.runInContext(code, ctx);
run('clock = function () { return __now(); }');
run('S = fresh(); loaded = true; storeUp = true');
run("DEAL.packs = ['gems2']");
const pid = run('PID');
run("prices[PID + 'gems1'] = '$0.99'; prices[PID + 'gems2'] = '$4.99'");

let failed = false;
const fail = msg => { console.error('FAIL: ' + msg); failed = true; };
const ev = e => run('window.nativeStore(' + JSON.stringify(e) + ')');

run("buyProduct('gems2')");
if (!run('S.iap.deal && S.iap.deal.id === "gems2"')) fail('tapping the deal pack did not keep the deal');
// the buttons are freed after the wait, then the player taps another pack
run("buying = ''");
run("buyProduct('gems1')");
if (!run('S.iap.deal && S.iap.deal.id === "gems2"')) fail('tapping another pack cleared the deal still waiting');
if (run('buying') !== 'gems1') fail('the second tap did not start its purchase');

ev({ t: 'bought', id: pid + 'gems2', tx: 'a', at: now + 1000 });
if (run('buying') !== 'gems1') fail("the deal pack's answer freed the purchase of the other pack");
if (run('S.iap.deal') !== null) fail('the deal bonus was not paid when the late answer came');
ev({ t: 'bought', id: pid + 'gems1', tx: 'b', at: now + 2000 });
if (run('buying') !== '') fail('the answer of the pack in flight did not free the buttons');

// the deal of the next day, for another pack, is tapped while the first answer is still to come
run("S = fresh(); buying = ''; prices[PID + 'gems3'] = '$9.99'");
run("DEAL.packs = ['gems2']");
run("buyProduct('gems2')");
run("buying = ''; DEAL.packs = ['gems3']");
run("buyProduct('gems3')");
const g0 = run('S.gems');
ev({ t: 'bought', id: pid + 'gems2', tx: 'c', at: now + 3000 });
if (run('S.gems') - g0 !== run("product('gems2').gems + Math.round(product('gems2').gems * DEAL.bonus)")) fail('the earlier deal bonus was lost to the next deal');

// a pending answer for a second deal pack leaves the live held deal alone and stretches its own window to the wait
run("S = fresh(); buying = ''; prices[PID + 'gems3'] = '$9.99'");
run("DEAL.packs = ['gems2']; buyProduct('gems2')");
ev({ t: 'pending', id: pid + 'gems2' });
run("DEAL.packs = ['gems3']; buyProduct('gems3')");
ev({ t: 'pending', id: pid + 'gems3' });
if (run('S.iap.held && S.iap.held.id') !== 'gems2') fail('a second pending answer replaced the held deal');
if (run("S.iap.deal && S.iap.deal.until === S.iap.wait.gems3") !== true) fail('the second deal did not last as long as its wait');

if (failed) process.exit(1);
console.log('deal ok');
