// The popup queue in ui.js against a fake page: banners and first-time cards wait for an open card, sheet or box and for
// each other, and each first-time card shows once.
//   node scripts/check_queue.mjs
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const src = fs.readFileSync(path.join(root, 'ui.js'), 'utf8');
const grab = re => {
  const m = src.match(re);
  if (!m) throw new Error('not found in ui.js: ' + re);
  return m[0];
};
const code = [
  /function banner\(html[\s\S]*?\r?\n\}\r?\n/,
  /function nextBanner[\s\S]*?\r?\n\}\r?\n/,
  /function veilUp[\s\S]*?\r?\n\}\r?\n/,
  /function covered[\s\S]*?\r?\n\}\r?\n/,
  /var INTRO = \{[\s\S]*?\r?\n\};/,
  /var introQ = \[\];/,
  /function introLive[\s\S]*?\r?\n\}\r?\n/,
  /function nightAd[\s\S]*?\r?\n\}\r?\n/,
  /var INTRO_WHEN = \{[\s\S]*?\r?\n\};/,
  /function want[\s\S]*?\r?\n\}\r?\n/,
  /function pumpIntro[\s\S]*?\r?\n\}\r?\n/,
  /function paintNight[\s\S]*?\r?\n\}\r?\n/
].map(grab).join('\n');

// timers on a clock of our own
let t = 0;
let seq = 0;
let timers = [];
const setTimeoutFake = (fn, ms) => { timers.push({ at: t + (ms || 0), id: ++seq, fn }); return seq; };
const advance = ms => {
  const end = t + ms;
  for (;;) {
    timers.sort((a, b) => a.at - b.at || a.id - b.id);
    if (!timers.length || timers[0].at > end) break;
    const x = timers.shift();
    t = x.at;
    x.fn();
  }
  t = end;
};

const els = {};
const el = id => (els[id] = els[id] || { id, hidden: true, textContent: '', innerHTML: '', style: {}, dataset: {} });
const VEILS = ['intro', 'boost', 'daily', 'shop'];
const shown = [];
const ctx = {
  setTimeout: setTimeoutFake,
  clearTimeout() {},
  $: el,
  document: { hidden: false, querySelector: () => VEILS.map(el).find(v => !v.hidden) || null },
  View: { confetti() {} },
  hideToast() {},
  say(text) { shown.push(text); },
  words: b => b.innerHTML,
  put: (e, k, v) => { e[k] = v; },
  tl: k => k,
  sfx() {},
  fmtClock: n => String(n),
  SHUT: [0, 6],
  NIGHT: { gems: 25 },
  STAR_MUL: 4,
  STAR_AT: [10, 20, 30],
  X2_COST: 20,
  I18N: { locale: 'en' },
  fmtn: n => String(n),
  rush: null,
  gift: null,
  vipIn: () => false,
  watching: null,
  S: { intro: {}, gems: 0 },
  cardId: null,
  sheetOpen: false,
  bq: [],
  bqBusy: false,
  closed: false,
  started: () => true,
  shut: () => ctx.closed,
  nStores: () => 1,
  perkDue: () => false,
  canWatch: () => false,
  adLabel: () => 'Watch'
};
vm.createContext(ctx);
vm.runInContext(code, ctx);
const run = c => vm.runInContext(c, ctx);

let failed = false;
const check = (name, ok) => { if (!ok) { console.error('FAIL: ' + name); failed = true; } };
const banner = () => el('banner');
const pump = () => run('pumpIntro()');
const idle = () => { advance(5000); };

// a banner fired while a card is open waits, and shows when it closes
ctx.cardId = 'hall';
run("banner('<b>one</b>', 0)");
advance(3000);
check('a banner stayed hidden behind a card', banner().hidden);
ctx.cardId = null;
advance(400);
check('the banner showed once the card closed', !banner().hidden && banner().innerHTML.includes('one'));
advance(2100);
check('the banner went away again', banner().hidden);

// one at a time, in order, and a box or the sheet holds them too
ctx.sheetOpen = true;
run("banner('<b>two</b>', 0)");
run("banner('<b>three</b>', 0)");
advance(2000);
check('banners stayed hidden behind the sheet', banner().hidden);
ctx.sheetOpen = false;
advance(300);
check('the first banner came first', !banner().hidden && banner().innerHTML.includes('two'));
advance(1000);
check('the second banner waits for the first', banner().innerHTML.includes('two'));
advance(1500);
check('the second banner followed', !banner().hidden && banner().innerHTML.includes('three'));
idle();
el('boost').hidden = false;
run("banner('<b>four</b>', 0)");
advance(1000);
check('a banner stayed hidden behind a box', banner().hidden);
run("banner('<b>five</b>', 0, false, true)");
advance(300);
check('the answer to a tap in the box showed at once', !banner().hidden && banner().innerHTML.includes('five'));
idle();
el('boost').hidden = true;
advance(400);
check('the banner that waited showed after the box closed', !banner().hidden && banner().innerHTML.includes('four'));
idle();

// banners held behind a card are all kept, in order
ctx.cardId = 'hall';
for (let i = 1; i <= 5; i++) run("banner('<b>B" + i + "</b>', 0)");
check('held banners were dropped: ' + run('bq.length') + ' kept', run('bq.length') === 5);
ctx.cardId = null;
const order = [];
for (let i = 0; i < 5; i++) {
  advance(400);
  order.push(banner().innerHTML);
  advance(2000);
}
check('the held banners did not all show in order: ' + order.join(), order.every((h, i) => h.includes('B' + (i + 1))));
// banners held behind a card are not cut by newer ones while the queue drains
ctx.cardId = 'hall';
for (let i = 1; i <= 6; i++) run("banner('<b>H" + i + "</b>', 0)");
ctx.cardId = null;
advance(400);
for (let i = 7; i <= 9; i++) run("banner('<b>H" + i + "</b>', 0)");
const seenH = [banner().innerHTML];
for (let i = 0; i < 8; i++) {
  advance(2000);
  seenH.push(banner().innerHTML);
}
check('held banners were cut while the queue drained: ' + seenH.join(), [1, 2, 3, 4, 5, 6, 7, 8, 9].every(n => seenH.some(h => h.includes('H' + n + '<'))));
idle();
// a banner that says it is no longer live is dropped
ctx.rush = {};
ctx.cardId = 'hall';
run("banner('<b>flash</b>', 0, false, false, { live: function () { return !!rush; } })");
ctx.rush = null;
ctx.cardId = null;
advance(1000);
check('a banner for a rush that was over showed', banner().hidden || !banner().innerHTML.includes('flash'));
idle();

// a first-time card waits for an open card and shows once
ctx.cardId = 'hall';
run("want('stars')");
pump();
check('a first-time card opened over a card', el('intro').hidden);
ctx.cardId = null;
pump();
check('the star card did not open when the card closed', !el('intro').hidden && el('intro-h').textContent === 'intro.stars.title');
check('the star card was not marked as shown', ctx.S.intro.stars === 1);
// the next one waits for this one to be closed
ctx.gift = {};
run("want('gifts')");
pump();
check('two first-time cards at once', el('intro-h').textContent === 'intro.stars.title');
el('intro').hidden = true;
pump();
check('the gift card did not follow', !el('intro').hidden && el('intro-h').textContent === 'intro.gifts.title');
el('intro').hidden = true;
// shown once
run("want('stars')");
pump();
check('a card shown before came again', el('intro').hidden);

// a card waits for a banner on screen
run("banner('<b>six</b>', 0)");
advance(300);
ctx.rush = {};
run("want('rush')");
pump();
check('a card opened over a banner', el('intro').hidden);
advance(2200);
pump();
check('the card did not follow the banner', !el('intro').hidden && el('intro-h').textContent === 'intro.rush.title');
el('intro').hidden = true;

// a banner waits for a first-time card
ctx.vipIn = () => true;
run("want('vip')");
pump();
run("banner('<b>seven</b>', 0)");
advance(2000);
check('a banner showed over a first-time card', banner().hidden);
el('intro').hidden = true;
advance(300);
check('the banner did not follow the card', !banner().hidden && banner().innerHTML.includes('seven'));
idle();

// the closing card is for a store that is shut, with its two ways to stay open
ctx.closed = false;
run("want('night')");
pump();
check('the closing card showed for an open store', el('intro').hidden);
check('the closing card was used up by an open store', !ctx.S.intro.night);
ctx.closed = true;
run("want('night')");
pump();
check('the closing card did not show at closing time', !el('intro').hidden && el('intro-h').textContent === 'intro.night.title');
check('the night buttons are missing', !el('intro-night').hidden && el('intro-gems').disabled === true && el('intro-ad').hidden === true);
ctx.S.gems = 30;
run('paintNight()');
check('the gems button stayed off with 30 gems', el('intro-gems').disabled === false);
ctx.S.gems = 0;
el('intro').hidden = true;
run("want('night')");
pump();
check('the closing card came twice', el('intro').hidden);

// a card for an event that is gone is dropped and not used up
ctx.rush = null;
ctx.S.intro.rush = 0;
run("want('rush')");
pump();
check('a rush card showed for no rush', el('intro').hidden);
check('a rush card was used up for no rush', !ctx.S.intro.rush);
ctx.gift = null;
run("want('gifts')");
ctx.S.intro.gifts = 0;
pump();
check('a gift card showed for no gift', el('intro').hidden && !ctx.S.intro.gifts);

// a state that turns true gets its card
ctx.nStores = () => 2;
pump();
check('the chain card did not show for a second store', !el('intro').hidden && el('intro-h').textContent === 'intro.chain.title');
check('the night buttons stayed on another card', el('intro-night').hidden);

// the rush ad is not used up when the rush cannot start
{
  const shop = fs.readFileSync(path.join(root, 'shop.js'), 'utf8');
  const m = shop.match(/function adGive[\s\S]*?\r?\n}\r?\n/);
  if (!m) throw new Error('adGive not found');
  const used = {};
  const c2 = { centerOf: () => ({ x: 0, y: 0 }), $: el, adUsed: () => used, banner() {}, callRush: () => c2.ok, sfx() {}, buzz() {}, nudge() {}, tl: k => k, clock2: () => '', X2_SECS: 1, S: { x2: 0, gems: 0 } };
  vm.createContext(c2);
  vm.runInContext(m[0], c2);
  used.rush = 1;
  c2.ok = false;
  vm.runInContext("adGive('rush')", c2);
  check('the rush ad stayed used up with no rush started', used.rush === 0);
  used.rush = 1;
  c2.ok = true;
  vm.runInContext("adGive('rush')", c2);
  check('the rush ad was given back for a rush that started', used.rush === 1);
}

// hold is only a card, the sheet or a box, so hints, the goal bar and toasts never stop a gift, a rush or the VIP
check('hold counts something besides a card, the sheet or a box', /hold = !started\(\) \|\| !!cardId \|\| sheetOpen \|\| veilUp\(\);/.test(src));
ctx.cardId = null;
ctx.sheetOpen = false;
VEILS.forEach(v => { el(v).hidden = true; });
check('something is covering the store with nothing open', run('covered()') === false);

if (failed) process.exit(1);
console.log('queue ok');
