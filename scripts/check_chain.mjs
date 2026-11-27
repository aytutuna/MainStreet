// The chain of stores in sim.js, in a node vm: what a store type builds, stores earning together on and off screen, away
// pay for every store, and a save that holds them all, including a v11 save from before the chain.
//   node scripts/check_chain.mjs
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const fixture = JSON.parse(fs.readFileSync(path.join(root, 'scripts', 'fixtures', 'save-v11.json'), 'utf8').trim());

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
// the shoppers and regulars are random; a fixed sequence keeps the comparison with the model the same on every run
run('var seed = 7; Math.random = function () { seed = (seed * 1664525 + 1013904223) % 4294967296; return seed / 4294967296; }');

let failed = false;
const fail = msg => { console.error('FAIL: ' + msg); failed = true; };
const key = run('KEY');

// plays secs seconds in 0.1 s steps
function play(secs) {
  for (let i = 0; i < secs * 10; i++) {
    run('tick(0.1)');
    now += 100;
  }
}
const aliased = () => run('S.cs[S.cur].b === S.b && S.cs[S.cur].pl === S.pl && S.cs[S.cur].pi === S.pi && S.cs[S.cur].ms === S.ms');
const near = (a, b, tol) => Math.abs(a - b) <= tol * Math.abs(b);

// a game with the first store filled to its last level, and the second opened
function twoStores() {
  run('reset()');
  run('fillStore()');
  run('S.cash = 1e9');
  if (!run('move()')) fail('the second store did not open after a full first one');
}

// a fresh game is one supercenter whose objects are the ones on screen
run('reset()');
if (run('nStores()') !== 1 || run('here().t') !== 'super' || !aliased()) fail('a new game is not one supercenter with its objects on screen');

// the supercenter has the first ten departments; the rest are never built, whatever is open before them
run('reset()');
run('fillStore()');
const built = run('BIZ.filter(function (b) { return has(b.id); }).map(function (b) { return b.id; })');
const want = run('TY.super.depts');
if (built.length !== 10 || built.join() !== want.join()) fail('fillStore built ' + built.join() + ', not the first ten departments');
if (run("avail('clothes')") || run("buy('clothes', 0)") !== null) fail('a department the type does not have could be opened');
if (run("options().some(function (o) { return o.k === 'lv' && !built(o.id); })")) fail('options offers a department the type does not have');
run("S.b.clothes = atLevel('clothes', 1)");
if (!run("has('clothes')")) fail('test setup: clothes not set');
run('delete S.b.clothes');

// store one earns on its own while store two is on screen, at the model rate, and the wallet is shared
twoStores();
if (run('nStores()') !== 2 || run('S.cur') !== 1 || !aliased()) fail('opening a store did not show it');
const r0 = run('storeRate(0)');
const r1 = run('rate()');
const cash0 = run('S.cash');
play(600);
const gain = run('S.cash') - cash0;
if (!(r0 > 0) || !(gain >= r0 * 600 * 0.99)) fail('the store off screen earned ' + gain + ' in 600 s, the model says ' + r0 * 600);
if (!(gain <= r0 * 600 + r1 * 600 * 1.05 + 1)) fail('the two stores earned more than both models together');
if (!near(run('offRate()'), r0, 1e-9)) fail('offRate is not the rate of the one store off screen');

// the model a store off screen earns by, against the same store played on screen from the opening, with shoppers, tills and
// stockers. The played store runs a few percent over it: the first shelves are full and a regular's visit pays a little more
run('reset()');
run('fillStore()');
const a1 = run('S.all');
const modelOne = run('rate()');
play(600);
const played = run('S.all') - a1;
if (!near(played, modelOne * 600, 0.1)) fail('a full store played on screen earned ' + played + ' in 600 s, the model says ' + modelOne * 600 + ' (' + (played / (modelOne * 600)).toFixed(3) + ')');

// switching the view: the store that was on screen goes on by the model, the other one is what stands on screen now
twoStores();
const s1 = run('JSON.stringify(S.cs[0].b)');
const lv1 = run('S.cs[1].b.produce.l');
run('view(0)');
if (run('S.cur') !== 0 || !aliased() || run('JSON.stringify(S.b)') !== s1) fail('view(0) did not show the first store');
if (run('S.cs[1].b.produce.l') !== lv1) fail('the store left off screen changed');
run('view(1)');
run('S.cash = 1e12');
if (!run("buy('produce', 0)")) fail('test setup: nothing bought in the second store');
const bought = run('JSON.stringify(S.b)');
run('view(0)');
run('view(1)');
if (!aliased() || run('JSON.stringify(S.b)') !== bought || run('JSON.stringify(S.cs[0].b)') !== s1) fail('a purchase in one store moved to the other on switching');

// buying in a store goes on its own side, and the prices are the store's own
twoStores();
run('S.cs[1].c = 3');
const priced = run("pieceCost('produce', 0)");
run('S.cs[1].c = 1');
if (!near(priced, run("pieceCost('produce', 0)") * 3, 1e-9)) fail('the store price factor does not scale piece prices');

// away pay counts every store
{
  run('reset()');
  run('fillStore()');
  run('S.iap.x2 = 0');
  run('away(3600)');
  const one = run('S.pend');
  twoStores();
  run('view(0)');
  run('S.cash = 1e12');
  run('S.cs[1].b = {}');
  run('S.pend = 0; S.ps = 0');
  run('away(3600)');
  const two = run('S.pend');
  if (!near(two, one, 0.001)) fail('away pay for a full store and an empty one is ' + two + ', not the full store alone ' + one);
  // two full stores earn twice
  twoStores();
  run("S.cs[1].b = JSON.parse(JSON.stringify(S.cs[0].b)); S.cs[1].pl = JSON.parse(JSON.stringify(S.cs[0].pl)); S.cs[1].pi = JSON.parse(JSON.stringify(S.cs[0].pi)); view(1)");
  run('S.pend = 0; S.ps = 0');
  run('away(3600)');
  if (!near(run('S.pend'), one * 2, 0.001)) fail('away pay for two full stores is ' + run('S.pend') + ', not twice ' + one);
}

// a save round trip holds every store, the one on screen at the top
twoStores();
run("S.cs.push({ t: 'test', m: 2, c: 3, b: { produce: atLevel('produce', 12) }, ms: { produce: 1 }, pl: {}, pi: {} }); noPlaces(S.cs[2]); view(2)");
run('S.cs[1].c = 1.5');
run('save()');
const first = store[key];
const parsed = JSON.parse(first);
if (parsed.v !== 12 || parsed.cs.length !== 3 || parsed.cur !== 2 || parsed.cs[2].b !== undefined || !parsed.b || !parsed.cs[0].b) fail('the saved layout is not the current store at the top and the others in cs');
if (first.length > 1e6) fail('the save is over 1 MB');
run('S = fresh()');
run('load()');
const second = run('saved()');
if (!aliased() || run('nStores()') !== 3 || run('S.cur') !== 2) fail('the stores did not come back as saved');
if (run('S.cs[2].t') !== 'test' || run('S.cs[2].m') !== 2 || run('S.cs[1].c') !== 1.5) fail('a store type, income or price factor was lost');
// loading fills in what a save lacks (the stars of a department), so it is the second round trip that changes nothing
const sigLoaded = run('cloudSig(S)');
run('save()');
run('S = fresh()');
run('load()');
if (run('saved()') !== second) fail('the save changed across a second save and load');
if (run('cloudSig(S)') !== sigLoaded) fail('the cloud signature changed across a save and load');
run('S.cs[0].b.produce.l += 1');
if (run('cloudSig(S)') === sigLoaded) fail('a change in a store off screen did not change the cloud signature');

// a type or a store count nobody knows is not trusted
{
  const o = JSON.parse(first);
  o.cs[0].t = 'nope';
  o.cs = o.cs.concat(Array.from({ length: 60 }, () => ({ t: 'super' })));
  o.cur = 99;
  store[key] = JSON.stringify(o);
  run('S = fresh()');
  run('load()');
  if (run('S.cs[0].t') !== 'super' || run('nStores()') !== run('MAX_STORES') || run('S.cur') !== run('MAX_STORES') - 1 || !aliased()) fail('an unknown type, too many stores or a wrong current store was taken as written');
}

// a full chain of the largest size stays far under the iCloud limit
run('reset()');
run('fillStore()');
for (let i = 1; i < run('MAX_STORES'); i++) run("S.cs.push({ t: 'test', m: 1, c: 1, b: JSON.parse(JSON.stringify(S.b)), ms: JSON.parse(JSON.stringify(S.ms)), pl: JSON.parse(JSON.stringify(S.pl)), pi: JSON.parse(JSON.stringify(S.pi)) })");
if (run('saved().length') > 300000) fail('thirty full stores make a save of ' + run('saved().length') + ' bytes');

// a v11 save from before the chain becomes store one of the chain: gems, purchases, ledger, claim and settings stay
{
  const o = JSON.parse(JSON.stringify(fixture));
  o.gems = 777;
  o.rep = 12;
  o.store = 4;
  o.iap = { ...o.iap, noads: 1, noadsTx: 'T1', noadsUser: 'U1', noadsAt: 5, tx: ['A', 'B'], paid: [{ tx: 'A', id: 'gems1', at: 7, gems: 80, x2: 0, rep: 0, deal: 0, ask: 0 }], rf: ['R'] };
  o.hold = { dev: 'd1', at: 99 };
  o.cl = { base: 'b:1', sig: 'x', bap: 4, old: ['o1'], seen: { d2: 's' }, force: 0, fly: null };
  o.lk = { on: 'fresh', own: { fresh: 1 } };
  o.pk = { sales: 1 };
  // a department past the type's ten is not built any more
  o.b.clothes = { l: 5, it: [2, 1, 1, 1, 0, 0] };
  store[key] = JSON.stringify(o);
  run('S = fresh()');
  run('load()');
  const got = JSON.parse(run('saved()'));
  const same = (a, b, what) => { if (JSON.stringify(a) !== JSON.stringify(b)) fail('the v11 save lost ' + what); };
  if (got.v !== 12 || got.cs.length !== 1 || got.cs[0].t !== 'super' || got.cur !== 0) fail('the v11 save is not one supercenter');
  if (got.gems !== 777 || got.rep !== 12) fail('the v11 save lost gems or reputation');
  same(got.iap.tx, ['A', 'B'], 'the transaction list');
  same(got.iap.paid, o.iap.paid, 'the paid ledger');
  same(got.iap.rf, ['R'], 'the refund list');
  if (got.iap.noads !== 1 || got.iap.noadsTx !== 'T1' || got.iap.noadsUser !== 'U1' || got.iap.noadsAt !== 5) fail('the v11 save lost Skip ads');
  same(got.hold, o.hold, 'the claim');
  same(got.cl.old, ['o1'], 'the cloud stamps');
  same(got.lk.on, o.lk.on, 'the look in use');
  same(got.lk.own, o.lk.own, 'the looks owned');
  if (got.lk.top !== 4) fail('the v11 save lost the store number its looks need');
  same(got.pk, o.pk, 'the perks');
  same(got.goal, o.goal, 'the goals');
  if (got.b.clothes) fail('the v11 save kept a department the supercenter does not have');
  same(Object.keys(got.b), Object.keys(o.b).filter(k => k !== 'clothes'), 'a department of the supercenter');
  if (!near(run('here().m'), Math.pow(1.45, 3), 1e-9) || !near(run('here().c'), Math.pow(1.35, 2), 1e-9)) fail('a store moved to three times keeps neither its income nor its prices');
  if (run('S.cash') !== o.cash) fail('the v11 save lost its cash');
  if (!aliased()) fail('the migrated store is not the one on screen');
  // and a v11 save made before any move is the plain supercenter
  o.store = 1;
  store[key] = JSON.stringify(o);
  run('S = fresh()');
  run('load()');
  if (run('here().m') !== 1 || run('here().c') !== 1) fail('a first store got a factor');
}

// a look bought at store 5 stays usable, and so do the free ones of the stores before it
{
  const o = JSON.parse(JSON.stringify(fixture));
  o.store = 5;
  o.lk = { on: 'rustic', own: { seaside: 1 } };
  store[key] = JSON.stringify(o);
  run('S = fresh()');
  run('load()');
  const st = ['classic', 'fresh', 'rustic', 'seaside'].map(id => run("lookState('" + id + "')")).join();
  if (st !== 'use,use,on,use') fail('looks of a v11 save at store 5 read ' + st);
  if (run("lookState('neon')") !== 'lock') fail('a look that needs an achievement is open');
  run("S.lk.on = 'classic'");
  if (run("setLook('seaside')") !== true) fail('a look the player paid for could not be put on');
}

// a v11 save nobody changed since its last sync keeps the signature, so a copy from another device is still taken
{
  const o = JSON.parse(JSON.stringify(fixture));
  ctx.__raw = o;
  o.cl = { base: 'b:1', sig: run('cloudSig11(__raw)'), bap: 0, old: [], seen: {}, force: 0, fly: null };
  store[key] = JSON.stringify(o);
  run('S = fresh()');
  run('load()');
  if (run('S.cl.sig') !== run('cloudSig(S)')) fail('an unchanged v11 save reads as edited');
  o.gems += 1;
  store[key] = JSON.stringify(o);
  run('S = fresh()');
  run('load()');
  if (run('S.cl.sig') === run('cloudSig(S)')) fail('a changed v11 save reads as unchanged');
}

// the goal list never waits on a department no type builds
{
  run('reset()');
  const last = run('GOALS.length - 1');
  let claimed = 0;
  let top = -1;
  for (let n = 0; n < 200 && run('S.goal.length'); n++) {
    run('finishGoals()');
    for (const i of run('S.goal.slice()')) {
      if (run('!reach(GOALS[' + i + '])')) fail('goal ' + i + ' is about a department nothing builds');
      run('claimGoal(' + i + ')');
      claimed++;
      top = Math.max(top, i);
    }
  }
  if (run('S.goal.length') || top !== last) fail('the goal list stopped at ' + top + ' of ' + last);
  if (claimed >= run('GOALS.length')) fail('no goal was passed over');
  // a v11 save that holds one of those goals moves on
  const o = JSON.parse(JSON.stringify(fixture));
  const dead = run("GOALS.findIndex(function (g) { return g.to === 'clothes'; })");
  o.goal = [dead, dead + 1, dead + 2];
  o.gn = dead + 3;
  store[key] = JSON.stringify(o);
  run('S = fresh()');
  run('load()');
  if (run('S.goal.some(function (i) { return !reach(GOALS[i]); })') || run('S.goal.length') !== 3) fail('a saved goal nothing can finish stayed');
}

// the department and star achievements count every store
{
  run('reset()');
  run('fillStore()');
  run('S.cash = 1e12');
  run('move()');
  run('fillStore()');
  const got = run('achieve().map(function (a) { return a.id; })');
  for (const id of ['dep2', 'dep3', 'rate1', 'rate2']) if (!got.includes(id)) fail(id + ' was not earned with two full stores');
  if (run("lookState('neon')") === 'lock') fail('the look that needs 12 departments stayed locked');
}

// what the chain earns, not the store on screen, sizes the warp, the gifts and the HUD
{
  twoStores();
  const one = run('rate()');
  const all = run('chainRate()');
  if (!(all > one * 1000)) fail('the chain rate ' + all + ' is not the filled store plus the new one ' + one);
  if (!near(all, run('rate() + storeRate(0)'), 1e-9)) fail('the chain rate is not the sum of both stores');
  run('S.run = 1e30');
  const w = run('warp(true)');
  if (!near(w, all * run('WARP_SECS'), 1e-9)) fail('the warp paid ' + w + ', not an hour of the chain');
  run('S.x2 = 100');
  if (!near(run('chainRate()'), run('rate() + storeRate(0) * 2'), 1e-9)) fail('the x2 boost is not on the stores off screen');
  run('S.x2 = 0');
}

// the shoppers of a store off screen count while playing, and the away cap follows the best Head Office
{
  twoStores();
  const before = run('S.st.srv');
  play(30);
  if (!(run('S.st.srv') - before > 10)) fail('the store off screen served nobody in 30 s');
  run("S.cs[0].pl.head = 3");
  run("S.cs[1].pl.head = 0");
  if (run('maxAway()') !== run('MAX_AWAY') + 3 * 3600 + 3600 * run("pv('away')")) fail('the away cap depends on the store on screen');
}

// a full chain gives no reputation for a move that opens nothing; the seed money perk pays for a new store
{
  twoStores();
  run('S.pk.cash = 2');
  run('fillStore()');
  const c = run('S.cash');
  run('move()');
  if (run('S.cash') - c < run("PK.cash.val[2]")) fail('the seed money perk paid nothing');
  for (let i = 0; i < run('MAX_STORES'); i++) run('openStore(nextType())');
  run('fillStore()');
  const rep = run('S.rep');
  if (run('canMove()') || run('move()') || run('S.rep') !== rep) fail('a move in a full chain paid reputation');
}

// a chain build keeps its own save and takes the game of mainstreet.v11 once, leaving that one as it is
{
  for (const k of Object.keys(store)) delete store[k];
  const raw = JSON.stringify(fixture);
  store['mainstreet.v11'] = raw;
  run('S = fresh()');
  if (!run('hasSave()')) fail('a v11 save is not found by a chain build');
  run('load()');
  if (run('S.gems') !== fixture.gems || store['mainstreet.v11'] !== raw || !store[key]) fail('the first run did not take mainstreet.v11 into its own slot and leave it');
  if (run('SLOT') !== 'chain' || key === 'mainstreet.v11') fail('the chain build shares the main save slot');
  run('reset()');
  run('S = fresh()');
  run('load()');
  if (run('S.gems') !== 0 || run('hasSave()')) fail('an erased chain game came back from mainstreet.v11');
}

// the chain rate follows the stores while the doors are shut and after a copy is taken
{
  twoStores();
  const full = run('chainRate()');
  run('S.clk = 23.5 * CLOCK / 24');
  run("S.cs[0].b = { produce: atLevel('produce', 1) }");
  play(2);
  if (!run('shut()') || !(run('chainRate()') < full / 10)) fail('the chain rate stayed at what the replaced store earned');
  if (run('takeCloud.toString().indexOf("offRefresh()")') < 0) fail('taking a cloud copy does not refresh the rate of the other stores');
}

// the daily cash is the same whichever store is on screen
{
  twoStores();
  const i = run('DAILY.findIndex(function (d) { return d.cash; })');
  const there = run('dailyReward(' + i + ').cash');
  run('view(0)');
  const away = run('dailyReward(' + i + ').cash');
  if (there !== away) fail('the daily cash is ' + there + ' on one store and ' + away + ' on the other');
  if (!near(there, run('chainBase() * DAILY[' + i + '].cash * 60'), 1e-9)) fail('the daily cash is not minutes of the whole chain');
}

// a store off screen does not count in this store's earned and served
{
  twoStores();
  run('S.st.sr = 0');
  const all = run('S.all');
  play(5);
  if (run('S.st.sr') > 5 || !(run('S.run') < (run('S.all') - all) / 100)) fail('the store off screen counted as this store (served ' + run('S.st.sr') + ')');
  if (!(run('offEarned') > 0 && run('offServedN') > 0)) fail('the sweep cannot tell the store off screen apart');
}

// damaged values in one store do not drop the game
{
  twoStores();
  const o = JSON.parse(run('saved()'));
  o.cs[0].t = 'constructor';
  o.cs[0].ms = 'x';
  o.gems = 321;
  store[key] = JSON.stringify(o);
  run('S = fresh()');
  run('load()');
  if (run('S.gems') !== 321 || run('nStores()') !== 2 || run('S.cs[0].t') !== 'super') fail('a store with a bad type or stars dropped the game');
}

// a done goal for a department nothing builds is paid at migration, and an in-flight put keeps the signature
{
  const o = JSON.parse(JSON.stringify(fixture));
  ctx.__raw = o;
  const dead = run("GOALS.findIndex(function (g) { return g.to === 'clothes'; })");
  o.goal = [dead, dead + 1, dead + 2];
  o.gn = dead + 3;
  o.gd = { [dead]: 1 };
  o.cl = { base: 'b:1', sig: run('cloudSig11(__raw)'), bap: 0, old: [], seen: {}, force: 0, fly: null };
  o.cl.fly = { stamp: 's:1', sig: o.cl.sig, ap: 0, force: 0 };
  store[key] = JSON.stringify(o);
  run('S = fresh()');
  run('load()');
  if (run('S.gems') !== o.gems + run('GOALS[' + dead + '].g')) fail('the done goal for a removed department was not paid');
  if (run('S.cl.fly.sig') !== run('cloudSig(S)')) fail('the in-flight put kept the old signature');
}

// opening stores stops at the cap
run('reset()');
run('fillStore()');
for (let i = 0; i < run('MAX_STORES') + 5; i++) run('openStore(nextType())');
if (run('nStores()') !== run('MAX_STORES')) fail('the chain grew past ' + run('MAX_STORES'));

if (failed) process.exit(1);
console.log('chain ok');
