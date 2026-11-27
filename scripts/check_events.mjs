// Night closing and what the player can tap, in sim.js in a node vm: Open tonight, gifts, rushes and the VIP turning up
// behind an open card without running down, and a rush that is saved and comes back.
//   node scripts/check_events.mjs
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const store = {};
let now = Date.UTC(2026, 0, 1, 12);
const ctx = {
  console,
  localStorage: {
    getItem: k => (k in store ? store[k] : null),
    setItem: (k, v) => { store[k] = String(v); },
    removeItem: k => { delete store[k]; }
  },
  performance: { now: () => 0 },
  btoa: s => Buffer.from(s).toString('base64'),
  atob: s => Buffer.from(s, 'base64').toString(),
  document: { write() {}, addEventListener() {}, documentElement: {} },
  navigator: { language: 'en' },
  location: { search: '', protocol: 'app:' }
};
ctx.window = ctx;
vm.createContext(ctx);
for (const f of ['i18n.js', 'lang/en.js', 'data.js', 'sim.js']) {
  vm.runInContext(fs.readFileSync(path.join(root, f), 'utf8'), ctx, { filename: f });
}
vm.runInContext('clock = function () { return __now(); };', Object.assign(ctx, { __now: () => now }));
const run = code => vm.runInContext(code, ctx);
run('var seed = 11; Math.random = function () { seed = (seed * 1664525 + 1013904223) % 4294967296; return seed / 4294967296; }');

let failed = false;
const fail = msg => { console.error('FAIL: ' + msg); failed = true; };

function play(secs) {
  for (let i = 0; i < secs * 10; i++) {
    run('tick(0.1)');
    now += 100;
  }
}
// a started game, with the clock at a game hour
function game(hour) {
  run('reset()');
  run('fillStore()');
  run('S.clk = ' + hour + ' * CLOCK / 24');
  run('shutNow = shut()');
}

// the first closing is told once, at midnight
game(23.9);
const seen = [];
ctx.__seen = seen;
run('onPerk = function (ev) { __seen.push(ev); }');
play(10);
if (!run('shut()') || seen.filter(e => e === 'close').length !== 1) fail('the store did not close once at midnight: ' + seen.join());

// Open tonight for gems keeps it open until six and costs the gems
run('S.gems = 100');
if (!run('openTonight()')) fail('Open tonight with 100 gems was refused');
if (run('S.gems') !== 100 - run('NIGHT.gems')) fail('Open tonight cost ' + (100 - run('S.gems')) + ' gems, not ' + run('NIGHT.gems'));
if (run('shut()')) fail('the store is shut after Open tonight');
play(120);
if (run('shut()') || !run('S.ot')) fail('the store was shut again before the morning');
const earnedOpen = run('S.run');
play(60);
if (!(run('S.run') > earnedOpen)) fail('nothing sold while open tonight');
play(240);
if (run('dayHour()') < 6 || run('S.ot') !== 0) fail('tonight was still open past six: ' + run('S.ot'));
play(30);
if (run('shut()')) fail('closed in the morning');
// the next night shuts as usual
run('S.clk = 23.99 * CLOCK / 24');
play(5);
if (!run('shut()')) fail('the night after Open tonight did not close');

// not enough gems, or the store is open: nothing is spent
run('S.gems = 3');
if (run('openTonight()') || run('S.gems') !== 3) fail('Open tonight went through without the gems');
run('S.gems = 100');
run('S.clk = 12 * CLOCK / 24');
if (run('openTonight()') || run('S.gems') !== 100) fail('Open tonight was taken in the daytime');
// an ad pays it with no gems
run('S.clk = 1 * CLOCK / 24');
run('S.gems = 0');
if (!run('openTonight(true)') || run('S.gems') !== 0 || run('shut()')) fail('the ad did not open tonight');
// the night perk stays what it was
game(1);
run('S.rep = 1e9; S.pk.night = 1');
if (run('shut()')) fail('the night perk no longer keeps the store open');

// one ad a day, and Open tonight is kept by a save but not by time away
if (run('AD_CAP.night') !== 1) fail('the Open tonight ad cap is ' + run('AD_CAP.night'));
game(1);
run('S.ads.n.night = 5');
run('S.ot = 1');
run('save()');
run('S = fresh()');
run('load()');
if (run('S.ads.n.night') !== 1) fail('the ad count came back as ' + run('S.ads.n.night'));
if (run('S.ot') !== 1) fail('Open tonight was lost by a save');
run('away(3 * 3600)');
if (run('S.ot')) fail('Open tonight went on after time away');
// a short absence in the same night keeps it, and is paid as open
game(23.9);
play(10);
run('S.gems = 100');
run('openTonight()');
const gain = run('away(90).gain');
if (run('S.ot') !== 1 || run('shut()')) fail('a minute and a half away shut tonight again');
if (!(Math.abs(gain - run('baseRate() * 90 * (1 + HEAD * S.pl.head)')) < 1e-6 * gain) || !(gain > 0)) fail('the paid night was not paid as open: ' + gain);
// later nights are still out of the pay
game(23.9);
play(10);
run('S.gems = 100');
run('openTonight()');
const g2 = run('away(1800).gain');
if (run('S.ot') !== 0 || !(g2 < run('baseRate() * 1800') * 0.9)) fail('time past the morning was paid whole or kept the skip: ' + g2);

// a gift, a rush and the VIP turn up behind an open card, and none of them runs down until it closes
game(10);
run('perkOff()');
run('hold = true');
run('giftT = 0; rushT = 0');
play(0.3);
if (!run('gift') || !run('rush')) fail('a gift and a rush did not turn up behind a card');
const g0 = run('gift.left');
const r0 = run('rush.left');
play(20);
if (run('gift.left') !== g0 || run('rush.left') !== r0) fail('a gift or rush ran down behind a card');
run('hold = false');
play(3);
if (!(run('gift.left') < g0 - 2.5) || !(run('rush.left') < r0 - 2.5)) fail('the countdown did not start when the card closed');

game(10);
run('perkOff()');
run('hold = true; S.vt = 0');
run('come("walk")');
if (!run('shoppers.some(function (c) { return c.reg === "vip"; })')) fail('no VIP behind a card');
if (!(run('S.vt') > 0)) fail('the VIP timer was not set');
run('shoppers.forEach(function (c) { c.v = true; })');
const t0 = run('shoppers.filter(function (c) { return c.reg === "vip"; })[0].age');
play(5);
if (run('shoppers.filter(function (c) { return c.reg === "vip"; })[0].age') !== t0) fail('a VIP ran down behind a card');
run('hold = false');
play(1);
if (!(run('shoppers.filter(function (c) { return c.reg === "vip"; })[0].age') > t0)) fail('the VIP did not go on when the card closed');

// the VIP timer survives a save and a move to another store
game(10);
run('S.vt = 77');
run('save()');
run('S = fresh()');
run('load()');
if (Math.abs(run('S.vt') - 77) > 1) fail('the VIP timer came back as ' + run('S.vt'));
run('S.cash = 1e12; fillStore(); openStore(nextType())');
if (Math.abs(run('S.vt') - 77) > 1) fail('the VIP timer reset by a move: ' + run('S.vt'));

// nothing turns up before the first purchase
run('reset()');
run('giftT = 0; rushT = 0');
play(2);
if (run('gift') || run('rush')) fail('a gift or a rush before the first purchase');

// a running rush is saved with what it has left and comes back
game(10);
run('perkOff()');
run('startRush()');
play(10);
run('incRate = 7');
const left = run('rush.left');
const got = run('rush.got');
const kind = run('rush.kind');
run('save()');
run('S = fresh()');
run('rush = null');
run('load()');
if (!run('rush') || Math.abs(run('rush.left') - left) > 0.05 || Math.abs(run('rush.got') - got) > 0.01) fail('the rush came back as ' + run('rush && rush.left') + ' left, not ' + left);
if (run('rush.kind') !== kind) fail('the rush kind changed');
if (run('incRate') !== 7) fail('the steady rate was not kept with the rush: ' + run('incRate'));
// a rush that ended before the save does not come back, and two minutes away end it
play(run('rush.left') + 2);
run('save()');
run('S = fresh()');
run('load()');
if (run('rush')) fail('a finished rush came back');
run('startRush()');
run('save()');
now += 120 * 1000;
run('S = fresh()');
run('rush = null');
run('load()');
if (run('rush')) fail('a rush went on through two minutes away');

if (failed) process.exit(1);
console.log('events ok');
