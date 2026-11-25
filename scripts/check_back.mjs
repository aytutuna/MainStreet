// Checks closeTop() from ui.js against a fake page: Back must never fall through to quitting under the net and find cards.
//   node scripts/check_back.mjs
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
const code = grab(/var CLOSE = \{[\s\S]*?\};/) + '\n' + grab(/function closeVeil[\s\S]*?\r?\n\}\r?\n/) + '\n' + grab(/function closeTop[\s\S]*?\r?\n\}\r?\n/);

const els = {};
const el = id => (els[id] = els[id] || { id, hidden: true, click() { this.hidden = true; } });
const order = ['net', 'find', 'shop', 'away', 'daily'];
const ctx = {
  $: id => el(id),
  document: { querySelectorAll: () => order.map(el).filter(v => !v.hidden) },
  sheetOpen: false,
  cardId: 'hall',
  closeSheet() { ctx.sheetOpen = false; },
  closeCard() { ctx.cardId = null; }
};
vm.createContext(ctx);
vm.runInContext(code, ctx);
vm.runInContext('CLOSE.shop = "shop-x"; CLOSE.daily = "daily-x";', ctx);
el('shop-x').click = () => { el('shop').hidden = true; };
el('daily-x').click = () => { el('daily').hidden = true; };

let failed = false;
const check = (name, ok) => { if (!ok) { console.error('FAIL: ' + name); failed = true; } };

for (const card of ['net', 'find']) {
  el(card).hidden = false;
  ctx.cardId = 'hall';
  check(card + ' over a card: Back answers true', ctx.closeTop() === true);
  check(card + ' over a card: card stays open', ctx.cardId === 'hall');

  el('shop').hidden = false;
  check(card + ' over the shop: Back answers true', ctx.closeTop() === true);
  check(card + ' over the shop: shop stays open', !el('shop').hidden);
  el('shop').hidden = true;
  el(card).hidden = true;
}

el('shop').hidden = false;
check('shop alone closes', ctx.closeTop() === true && el('shop').hidden);
check('card closes next', ctx.closeTop() === true && ctx.cardId === null);
check('nothing open returns false', ctx.closeTop() === false);

if (failed) process.exit(1);
console.log('back ok');
