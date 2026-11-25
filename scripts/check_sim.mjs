// Loads the game's data and simulation in a node vm and checks them without a browser.
//   node scripts/check_sim.mjs            plays 20 minutes, saves, loads and compares, loads the v11 sample save
//   node scripts/check_sim.mjs --update   rewrites the sample save and the piece counts below from the current code
// The piece counts are what a saved item level means. When they change, saves from before mean something else, so the
// save version has to go up with a migration; then run with --update.
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const fixture = path.join(root, 'scripts', 'fixtures', 'save-v11.json');
const update = process.argv.includes('--update');

const PIECES = {
  version: 'mainstreet.v11',
  count: '[["produce",7,5,7,5,4,2],["bakery",7,8,6,7,2],["dairy",7,8,6,7,2],["meat",8,6,4,4,6,2],["frozen",8,10,3,7,2],["pantry",7,6,5,6,4,2],["snacks",6,7,5,5,5,2],["toys",7,7,8,6,2],["tech",8,2,5,7,6,2],["kitchen",8,7,6,2,5,2],["clothes",6,5,8,3,6,2],["home",7,7,7,7,2],["office",7,7,6,8,2],["pets",6,6,6,5,5,2],["sports",4,6,7,4,7,2],["tools",6,4,6,7,5,2],["auto",5,5,6,4,8,2],["seasonal",8,4,7,3,6,2]]'
};

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

let failed = false;
const fail = msg => { console.error('FAIL: ' + msg); failed = true; };

// a department's pieces, item by item
const counts = JSON.stringify(run('BIZ.map(function (b) { return [b.id].concat(BZ[b.id].items.map(function (e) { return e.at.length; })); })'));
const key = run('KEY');

const sample = path.join(root, 'scripts', 'fixtures');
if (update) {
  now = Date.UTC(2026, 0, 1, 12);
  run('reset()');
  for (let i = 0; i < 20 * 60 * 30; i++) {
    run('tick(1 / 30)');
    now += 1000 / 30;
    if (i % 30 === 0) run('buyBest()');
  }
  run('save()');
  fs.mkdirSync(sample, { recursive: true });
  fs.writeFileSync(fixture, store[key] + '\n');
  let me = fs.readFileSync(fileURLToPath(import.meta.url), 'utf8');
  me = me.replace(/(version: ')[^']*(',\n  count: ').*(')/, `$1${key}$2${counts.replace(/\$/g, '$$$$')}$3`);
  fs.writeFileSync(fileURLToPath(import.meta.url), me);
  console.log('updated');
  process.exit(0);
}

if (key === PIECES.version && counts !== PIECES.count) {
  fail('the pieces in ITEMS changed but the save version is still ' + key + '; add a migration and a new version, then run with --update');
}

run('reset()');
const start = run('S.cash');
for (let i = 0; i < 20 * 60 * 30; i++) {
  run('tick(1 / 30)');
  now += 1000 / 30;
  if (i % 30 === 0) run('buyBest()');
}
const earned = run('S.all');
if (!(earned > start)) fail('20 minutes of play earned nothing');
if (!(run('Object.keys(S.b).length') >= 2)) fail('buyBest bought nothing past the first department');

run('save()');
const first = store[key];
if (!first) fail('save() wrote nothing');
run('S = fresh()');
run('load()');
const second = run('saved()');
if (JSON.parse(second).cash !== JSON.parse(first).cash) fail('cash changed across a save and load');
// loading fills in what an older save lacks, so the first load may add keys; after that a round trip changes nothing
run('save()');
run('S = fresh()');
run('load()');
if (run('saved()') !== second) fail('the save differs after a second save and load');

delete store[key];
store[key] = fs.readFileSync(fixture, 'utf8').trim();
const sampleSave = JSON.parse(store[key]);
run('S = fresh()');
run('load()');
const got = JSON.parse(run('saved()'));
if (got.v !== sampleSave.v || got.cash !== sampleSave.cash || got.gems !== sampleSave.gems) fail('the v11 sample save did not load as written');
if (Object.keys(got.b).join() !== Object.keys(sampleSave.b).join()) fail('the v11 sample save lost departments');

// the time zone is held for 20 hours after it was taken, so flipping it does not give a second day
run('reset()');
const zone0 = run('S.tz.o');
const day0 = run('dayNum(clock())');
run('Date.prototype.getTimezoneOffset = function () { return -840; }');
run('zoneCheck()');
run('Date.prototype.getTimezoneOffset = function () { return 600; }');
run('zoneCheck()');
if (run('S.tz.o') !== zone0 || run('dayNum(clock())') !== day0) fail('a zone flip within 20 hours moved the day');
now += 21 * 3600000;
run('zoneCheck()');
if (run('S.tz.o') !== 600) fail('a changed zone was not taken on after 20 hours');

// a daily reward needs 20 hours since the last one, whatever the day number says
run('S.day = { n: 0, d: -1, t: 0 }');
if (!run('claimDaily()')) fail('the first daily reward was refused');
run('S.day.d -= 1');
if (run('daily().can')) fail('a second daily reward came within 20 hours');
now += 21 * 3600000;
if (!run('daily().can')) fail('the daily reward did not come back after 20 hours');

// a claim late one evening and a visit the next morning keeps the streak a day later
run('S.day = { n: 3, d: dayNum(clock()) - 1, t: clock() - 9 * 3600000 }');
if (run('daily().can') || !run('daily().gap')) fail('the gap was not reported as the reason');
now += 24 * 3600000;
if (!run('daily().can') || run('daily().idx') !== 3) fail('a claim 33 hours ago lost the streak');
now += 48 * 3600000;
if (run('daily().idx') !== 0) fail('a claim 105 hours ago kept the streak');

// doubling the away pay costs 5 gems an hour away, whatever x2 or a boost is running
for (const [x2, boost] of [[0, 0], [1, 0], [0, 7200], [1, 7200]]) {
  for (const [hours, gems] of [[1, 5], [8, 40], [20, 40]]) {
    run('reset()');
    run('S.iap.x2 = ' + x2 + '; S.x2 = ' + boost);
    run('away(' + hours * 3600 + ')');
    if (run('awayCost()') !== gems) fail(hours + ' h away cost ' + run('awayCost()') + ' gems (x2 ' + x2 + ', boost ' + boost + '), not ' + gems);
  }
}

// a VIP that is due but held back keeps its zero through a save and load
run('reset()');
run('S.vt = 0.4; perkStep(1, true)');
run('save()');
run('S = fresh()');
run('load()');
if (run('S.vt') !== 0) fail('a due VIP timer came back as ' + run('S.vt'));

if (failed) process.exit(1);
console.log('sim ok: earned ' + Math.round(earned) + ', ' + Object.keys(got.b).length + ' departments in the sample');
