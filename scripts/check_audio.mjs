// While the page asks the app whether other music plays, nothing may resume the audio context: the web view's own output
// would answer for it. Runs wake, sfx, radioSync and askOther from ui.js against a fake context.
//   node scripts/check_audio.mjs
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const src = fs.readFileSync(path.join(root, 'ui.js'), 'utf8').replace(/\r\n/g, '\n');

function fn(name) {
  const i = src.indexOf('function ' + name + '(');
  if (i < 0) throw new Error('missing ' + name);
  const end = src.indexOf('\n}\n', i);
  return src.slice(i, end + 3);
}

const posts = [];
const ac = {
  state: 'running',
  suspend() { this.state = 'suspended'; return Promise.resolve(); },
  resume() { this.state = 'running'; }
};
const ctx = {
  ac, snd: true, adOpen: false, otherOn: false, unsure: false, unsureT: 0, restT: 0, cur: null, streamOn: false,
  out: {}, buf: {}, VARY: {}, radio: { sel: 'mix', vol: 1 }, duck: 1,
  document: { hidden: false }, navigator: {},
  setTimeout: () => 1, clearTimeout() {},
  native: () => true,
  post: m => posts.push({ m, state: ac.state }),
  mixNext() {}, go() {}, streamPlay() {}, streamStop() {}, ambience() {}, radioPaint() {}, saveRadio() {}, banner() {},
  langGroup: () => '', tl: () => '', rest() {}, loadSound() {}, VOL: {}
};
vm.createContext(ctx);
vm.runInContext(['wake', 'radioSync', 'askOther'].map(fn).join('\n'), ctx);
const fails = [];
const is = (what, ok) => { if (!ok) fails.push(what); };

// return to the front: the visibility handler asks, then syncs the radio
ctx.askOther();
ctx.radioSync();
is('radioSync resumed the context while asking', ac.state === 'suspended');
ctx.wake();
is('a tap resumed the context while asking', ac.state === 'suspended');

// the check goes out with the context still held
vm.runInContext('setTimeout = function (f, t) { if (t === 400) f(); return 1; }', ctx);
ctx.unsure = false;
ctx.askOther();
await null;
const sent = posts.filter(p => p.m.check).pop();
is('the check was not posted', !!sent);
is('the check was posted with the context running', sent && sent.state === 'suspended');

// once the app has answered, the context goes on
ctx.unsure = false;
ctx.radioSync();
is('the context stayed held after the answer', ac.state === 'running');

if (fails.length) {
  console.error('check_audio: ' + fails.join('; '));
  process.exit(1);
}
console.log('check_audio ok');
