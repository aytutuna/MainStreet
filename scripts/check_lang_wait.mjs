// Checks setLang() from i18n.js: a pick that waits for a purchase must not reload the page after its panel was closed.
//   node scripts/check_lang_wait.mjs
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const timers = [];
const panel = { hidden: false };
let reloads = 0;
const ctx = {
  document: { getElementById: () => panel, title: '', write() {}, addEventListener() {}, documentElement: {} },
  navigator: { language: 'en' },
  localStorage: { getItem: () => null, setItem() {} },
  location: { pathname: '/', search: '', protocol: 'app:', replace() { reloads++; } },
  setTimeout: fn => timers.push(fn),
  buying: 'gems1',
  save() {},
  cloudPut() {}
};
vm.createContext(ctx);
vm.runInContext(fs.readFileSync(path.join(root, 'i18n.js'), 'utf8'), ctx, { filename: 'i18n.js' });
for (const f of ['lang/en.js', 'lang/de.js']) vm.runInContext(fs.readFileSync(path.join(root, f), 'utf8'), ctx, { filename: f });

const tick = () => timers.splice(0).forEach(fn => fn());
let failed = false;
const check = (name, ok) => { if (!ok) { console.error('FAIL: ' + name); failed = true; } };

ctx.setLang('de');
tick();
check('still buying, panel open: no reload', reloads === 0);
ctx.buying = '';
tick();
check('purchase done, panel open: reloads', reloads === 1);

ctx.buying = 'gems1';
panel.hidden = false;
ctx.setLang('de');
panel.hidden = true;
ctx.buying = '';
tick();
check('panel closed while waiting: no reload', reloads === 1);
tick();
check('dropped pick does not come back', reloads === 1);

if (failed) process.exit(1);
console.log('lang wait ok');
