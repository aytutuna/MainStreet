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

// a game with the first store filled to its last level, and the second opened: the stand-in type, which has the same
// departments as the supercenter, so the checks below can buy the same things in both
function twoStores() {
  run('reset()');
  run('fillStore()');
  run('S.cash = 1e9');
  if (!run('openStore(TY.test)')) fail('the second store did not open after a full first one');
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
  if (!near(run('here().m'), run('TYPES[0].mul') * Math.pow(1.45, 3), 1e-9) || !near(run('here().c'), run('TYPES[0].cost') * Math.pow(1.35, 2), 1e-9)) fail('a store moved to three times keeps neither its income nor its prices');
  if (run('S.cash') !== o.cash) fail('the v11 save lost its cash');
  if (!aliased()) fail('the migrated store is not the one on screen');
  // and a v11 save made before any move is the supercenter at its type's income and prices
  o.store = 1;
  store[key] = JSON.stringify(o);
  run('S = fresh()');
  run('load()');
  if (run('here().m') !== run('TYPES[0].mul') || run('here().c') !== run('TYPES[0].cost')) fail('a first store got a factor');
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
  run('S.clk = 3 * CLOCK / 24');
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

// the warp is there right after a store opens and pays an hour of the chain, counting only this store's share in its run
{
  twoStores();
  run('S.gems = 100');
  run('S.run = 0');
  const hour = run('chainRate() * WARP_SECS');
  const got = run('warp()');
  if (!near(got, hour, 1e-9) || run('S.gems') !== 50) fail('the warp paid ' + got + ' for ' + hour + ' right after a store opened');
  if (!(run('S.run') < got / 100)) fail('the warp put the whole chain into the run of one store');
}

// time away: the run and "served this store" take the share of the store on screen, whichever one it is
{
  twoStores();
  run('S.run = 0');
  run('S.st.sr = 0');
  run('S.pend = 0; S.pr = 0');
  const a = run('away(7200)');
  const c = run('claimAway()');
  if (!(c > 0) || !(run('S.run') < c / 100)) fail('an away claim put the chain into the run of one store (' + run('S.run') + ' of ' + c + ')');
  run('view(0)');
  run('S.run = 0');
  run('S.st.sr = 0');
  run('S.pend = 0; S.pr = 0');
  const b = run('away(7200)');
  const here = run('atStore(0, function () { return Math.floor((served() + gardenServed()) * 7200 * openShare()); })');
  if (run('S.st.sr') !== here || !(here > b.n * 0.5)) fail('served this store after away on store 1 is ' + run('S.st.sr') + ', not ' + here);
  const c2 = run('claimAway()');
  if (!near(run('S.run'), c2, 0.01)) fail('the away pay of the store on screen did not reach its run');
}

// the share of the pending pay the store on screen made is saved, kept for a v11 save, and spent by a claim
{
  twoStores();
  run('S.pend = 1000; S.pr = 250');
  const o = JSON.parse(run('saved()'));
  if (o.pr !== 250) fail('the share of the away pay is not saved');
  store[key] = JSON.stringify(o);
  run('S = fresh()');
  run('load()');
  if (run('S.pr') !== 250) fail('the share of the away pay did not load');
  delete o.pr;
  store[key] = JSON.stringify(o);
  run('S = fresh()');
  run('load()');
  if (run('S.pr') !== run('S.pend')) fail('a save with no share did not count all of its pay as the one store');
  const v = JSON.parse(JSON.stringify(fixture));
  v.pend = 500;
  store[key] = JSON.stringify(v);
  run('S = fresh()');
  run('load()');
  if (run('S.pr') !== run('S.pend')) fail('a v11 save did not keep its whole pending pay as the one store');
  run('S.pend = 1000; S.pr = 250; S.run = 0');
  run('claimAway()');
  if (run('S.pr') !== 0 || run('S.pend') !== 0 || !near(run('S.run'), 250, 1e-9)) fail('a claim did not spend the share (run ' + run('S.run') + ')');
  run('S.pend = 1000; S.pr = 250; S.run = 0; S.ps = 3600');
  run('claimAway(true, true)');
  if (run('S.pr') !== 0 || !near(run('S.run'), 500, 1e-9)) fail('a doubled claim did not double the share (run ' + run('S.run') + ')');
}

// the store shuts from 00:00 to 06:00
{
  run('reset()');
  const at = h => { run('S.clk = ' + h + ' * CLOCK / 24'); return run('shut()'); };
  const got = [at(5.98), at(6), at(12), at(23.98), at(0)].join();
  if (got !== 'true,false,false,false,true') fail('the store is shut at 05:59, 06:00, 12:00, 23:59 and 00:00 as ' + got);
  if (run('openShare()') !== 0.75) fail('the store is open ' + run('openShare()') + ' of the day');
  run("S.pk.night = 1");
  if (run('openShare()') !== 1 || at(3)) fail('the night perk does not keep the store open');
  run('reset()');
  const held = run('S.clk');
  play(10);
  if (run('S.clk') !== held) fail('the clock ran before the first purchase');
  run('S.cash = 1e6; buyBest(); buyBest()');
  const t0 = run('S.clk');
  let secs = 0;
  while (!run('shut()') && secs < 2000) {
    play(1);
    secs++;
  }
  if (Math.abs(secs - 18 * 60) > 2) fail('a new game met its first night after ' + secs + ' s, not 18 minutes');
  // the shoppers already inside pay on their way out
  play(120);
  const cash = run('S.cash');
  play(20);
  if (run('S.cash') !== cash) fail('the store sold while it was shut ' + (run('S.cash') - cash) + ' ' + run('shut()') + ' ' + run('dayHour()'));
}

// time away pays the seconds the store is open in the span, from where the clock stands
{
  run('reset()');
  run('fillStore()');
  run('S.day.n = 1');
  const base = run('baseRate() * (S.iap.x2 ? 2 : 1) * (1 + HEAD * S.pl.head)');
  const paid = (h, secs) => {
    run('S.clk = ' + h + ' * CLOCK / 24; S.pend = 0; S.pr = 0; S.x2 = 0');
    return run('away(' + secs + ').gain') / base;
  };
  if (paid(0, 300) !== 0) fail('away from 00:00 paid ' + paid(0, 300) + ' s');
  if (!near(paid(12, 300), 300, 1e-9)) fail('away from noon did not pay the full span');
  // a game hour is 60 s: from 23:55 there are 5 s before midnight, then the 360 s night, then open again
  if (!near(paid(23 + 55 / 60, 900), 5 + 900 - 5 - 360, 1e-9)) fail('a span over midnight paid ' + paid(23 + 55 / 60, 900) + ' s, not 540');
  // from 05:55 the night ends after 5 s
  if (!near(paid(5 + 55 / 60, 900), 895, 1e-9)) fail('a span out of the night paid ' + paid(5 + 55 / 60, 900) + ' s, not 895');
  const day = run('CLOCK');
  run('S.pk.night = 0');
  if (!near(paid(7, 5 * day), 5 * day * 0.75, 1e-9)) fail('five days paid ' + paid(7, 5 * day) / (5 * day) + ' of the time, not 0.75');
  // the x2 boost drains only while open
  run('S.clk = 0; S.x2 = 100; S.pend = 0');
  run('away(300)');
  if (run('S.x2') !== 100) fail('the x2 boost ran down during the night');
}

// star gems are paid the first time a star is earned in a store type and department, not again in another store
{
  const atLvl = (v, id, l) => JSON.parse(run('JSON.stringify(atLevel("' + id + '", ' + l + '))'));
  const toStar = n => {
    if (!run('(function () { var j = 0; var fails = 0; while (lv("produce") < STAR_AT[' + n + ']) { if (buy("produce", j) === null) { j = (j + 1) % BZ.produce.items.length; if (++fails > 50) return false; } else fails = 0; } return true; })()')) fail('nothing could be bought toward star ' + (n + 1));
  };
  run('reset()');
  run('S.cash = 1e30');
  run('S.gems = 0');
  toStar(0);
  if (run('S.gems') !== run('STAR_GEMS[0]')) fail('the first star paid ' + run('S.gems') + ' gems');
  run("openStore(TY.super)");
  run('S.cash = 1e30');
  const g = run('S.gems');
  toStar(0);
  if (run('S.gems') !== g) fail('the same star paid again in a second store of the type');
  run('openStore(TY.test)');
  run('S.cash = 1e30');
  toStar(0);
  if (run('S.gems') !== g + run('STAR_GEMS[0]')) fail('a star in another store type did not pay');
  // a save keeps the record, and a save from before it counts the stars it has as paid
  const o = JSON.parse(run('saved()'));
  store[key] = JSON.stringify(o);
  run('S = fresh()');
  run('load()');
  if (JSON.stringify(run('S.sg')) !== JSON.stringify(o.sg)) fail('the star record was not kept');
  const v = JSON.parse(JSON.stringify(fixture));
  v.gems = 40;
  v.b.produce = atLvl(v, 'produce', 12);
  delete v.ms;
  store[key] = JSON.stringify(v);
  run('S = fresh()');
  run('load()');
  if (run('S.gems') !== 40 || run("S.sg['super.produce']") !== 1) fail('a migrated save lost gems or did not count its star as paid');
  run('S.cash = 1e30');
  toStar(0);
  if (run('S.gems') !== 40) fail('a star the migrated save already had paid again');
  toStar(1);
  if (run('S.gems') !== 40 + run('STAR_GEMS[1]')) fail('the next star of a migrated save paid ' + (run('S.gems') - 40));
}

// the next store is paid for by the newest one, whichever store is on screen
{
  twoStores();
  run('fillStore()');
  run('view(0)');
  const viewed = run('repGain()');
  if (!run('canMove()')) fail('the move was not offered with the newest store at its gate, viewed from the first store');
  run('view(1)');
  if (run('repGain()') !== viewed) fail('the reputation depends on the store on screen');
  const rep = run('S.rep');
  run('S.cash = 1e12');
  run('view(0)');
  if (!run('move()')) fail('the newest store could not open the next one from another view');
  const gained = run('S.rep') - rep;
  if (gained !== viewed) fail('the move paid ' + gained + ', not ' + viewed);
  run('view(0)');
  if (run('canMove()') || run('move()') || run('S.rep') !== rep + gained) fail('the move was offered again for a store that has not reached its gate');
}

// a rush, a gift and the VIP timer go on when the view changes stores
{
  twoStores();
  run("rush = { kind: 'bus', left: 60, got: 0 }");
  run("gift = { kind: 'cart', left: 20, jack: false }");
  run('S.vt = 77');
  run('view(0)');
  if (!run('rush && rush.left === 60') || !run('gift && gift.left === 20') || run('S.vt') !== 77) fail('a rush, a gift or the VIP timer was dropped by switching stores');
  run('rush = null; gift = null');
}

// what a store earned and served is its own
{
  twoStores();
  run('S.run = 5; S.st.sr = 3');
  const first = run('S.cs[0].run');
  run('view(0)');
  if (run('S.run') !== first || run('S.cs[1].run') !== 5 || run('S.cs[1].sr') !== 3) fail('the run was not swapped with the store');
  run('view(1)');
  if (run('S.run') !== 5 || run('S.st.sr') !== 3) fail('the run did not come back with its store');
  const before = run('S.cs[0].run');
  play(5);
  if (!(run('S.cs[0].run') > before)) fail('a store off screen did not earn for its own run');
  if (run('atStore(0, function () { return S.run; })') !== run('S.cs[0].run')) fail('atStore does not see the run of the store');
  run('S.cs[0].sr = 9');
  store[key] = run('saved()');
  run('S = fresh()');
  run('load()');
  if (run('S.cs[0].sr') !== 9) fail('the run of a store was not saved');
  // a save from before it gives its run to the store on screen
  const v = JSON.parse(JSON.stringify(fixture));
  v.run = 1234;
  store[key] = JSON.stringify(v);
  run('S = fresh()');
  run('load()');
  if (run('S.run') !== 1234) fail('a migrated save lost its run');
}

// a rush that follows the view is measured against the store it ends in
{
  twoStores();
  run('S.cash = 1e12');
  run('view(0)');
  ctx.__ev = [];
  run("onPerk = function (ev, o) { if (ev === 'rushend') __ev.push(o.extra); }");
  run('callRush(true)');
  const steady = run('rate()');
  const len = run('rush.len');
  run('rush.got = 2 * rate() * rush.len');
  play(len + 2);
  run('onPerk = null');
  if (ctx.__ev.length !== 1 || !near(ctx.__ev[0], steady * len, 0.1)) fail('the rush after a switch added ' + ctx.__ev.join() + ', not about ' + steady * len);
}

// a v12 save from before each store kept its run has one run, which is the newest store's
{
  twoStores();
  run('view(0)');
  const o = JSON.parse(run('saved()'));
  for (const e of o.cs) { delete e.run; delete e.sr; }
  o.run = 99;
  o.st.srv = 100;
  o.st.sr = 7;
  store[key] = JSON.stringify(o);
  run('S = fresh()');
  run('load()');
  if (run('S.cs[1].run') !== 99 || run('S.cs[1].sr') !== 7 || run('S.run') !== 0 || run('S.st.sr') !== 0) fail('the one run of an older save stayed with the store on screen');
}

// opening stores stops at the cap
run('reset()');
run('fillStore()');
for (let i = 0; i < run('MAX_STORES') + 5; i++) run('openStore(nextType())');
if (run('nStores()') !== run('MAX_STORES')) fail('the chain grew past ' + run('MAX_STORES'));

// the Diner and Pizzeria is the second store type: it opens as store two, builds its own eight departments in order and
// the places it has, words them its own way, and earns and saves like the supercenter
{
  run('reset()');
  run('fillStore()');
  run('S.cash = 1e9');
  if (run('nextType().id') !== 'diner') fail('the type after the supercenter is not the diner');
  if (!run('move()') || run('here().t') !== 'diner' || run('S.cur') !== 1 || !aliased()) fail('a full supercenter did not open the diner as store two');
  const depts = run('kind().depts');
  if (depts.length !== 8 || depts.some(id => run('ITEMS.' + id + '.of.length') !== 30 || run('BZ.' + id + '.items.reduce(function (n, x) { return n + x.at.length; }, 0)') !== 30)) fail('a diner department does not have 30 upgrades');
  // it starts with its first department; each next one opens only after the one before
  if (run('opened()') !== 1 || !run("has('grill')") || run("avail('pizza')") || !run("avail('fry')")) fail('the diner does not start with the grill alone');
  if (run("avail('produce')") || run("buy('produce', 0)") !== null) fail('a supercenter department could be bought in the diner');
  for (let i = 1; i < depts.length; i++) {
    run('S.cash = 1e30');
    run("S.b['" + depts[i - 1] + "'] = atLevel('" + depts[i - 1] + "', 30)");
    if (!run("avail('" + depts[i] + "')")) fail(depts[i] + ' did not open after ' + depts[i - 1]);
    if (!run("buy('" + depts[i] + "', 0)")) fail(depts[i] + ' could not be bought');
  }
  // its places: the six it has, in its own words; a taxi it has no use for stays shut
  const pd = run('Object.keys(kind().pd).sort()');
  if (pd.join() !== 'dock,garden,hall,lot,lounge,rest') fail('the diner has the places ' + pd.join());
  if (run('PL.hall.name') !== 'Counter' || run("PL.lot.after") !== 'fry' || run("PL.rest.name") !== 'Walk-in Cooler' || run('PL.hall.items.length') !== 3) fail('a place is not worded as the diner words it');
  run('S.cash = 1e30');
  if (run("placeCost('taxi')") !== 0 || run("buyPlace('taxi', 0)") !== null) fail('a taxi stand could be bought in the diner');
  if (run("placeCost('hall')") <= 0) fail('the counter did not open with the grill');
  run('view(0)');
  if (run('PL.hall.name') !== 'Checkouts' || run('PL.lot.after') !== 'bakery') fail('the supercenter lost its wording after the diner was on screen');
  run('view(1)');
  // filled, it fills its own places only, earns, and plays on screen as the model says
  run('S.cs[1].b = {}');
  run('fillStore()');
  if (run('S.pl.taxi') !== 0 || run('S.pl.serv') !== 0 || run('S.pl.head') !== 0) fail('a diner that was filled has a place it does not have');
  if (run('S.pl.hall') !== 10 || run('S.pl.rest') !== 8 || run('S.pl.lounge') !== 10 || run('S.pl.garden') !== 4) fail('a filled diner is missing a place level');
  if (run('opened()') !== 8 || !(run('rate()') > 0)) fail('a filled diner does not earn');
  const a1 = run('S.all');
  const model = run('rate()');
  play(600);
  const got = run('S.all') - a1;
  if (!near(got, model * 600 + run('offRate()') * 600, 0.12)) fail('a filled diner on screen earned ' + got + ' in 600 s, the model says ' + (model + run('offRate()')) * 600);
  // and it saves and loads as the type it is
  run('save()');
  const parsed = JSON.parse(store[key]);
  if (parsed.cs[1] && parsed.cs[1].t !== 'diner' && parsed.cs[0].t !== 'diner') fail('the diner was saved as another type');
  run('S = fresh()');
  run('load()');
  if (run('here().t') !== 'diner' || run('PL.hall.name') !== 'Counter' || run('opened()') !== 8 || !aliased()) fail('the diner did not come back as saved');
}

// the Hardware and Auto store is the third store type: it opens after the diner with its own eight departments, six places
// in its own words, earns like the model says and saves as the type it is
{
  run('reset()');
  run('fillStore()');
  run('S.cash = 1e9');
  run('move()');
  run('fillStore()');
  run('S.cash = 1e12');
  if (run('nextType().id') !== 'hardware') fail('the type after the diner is not hardware');
  if (!run('move()') || run('here().t') !== 'hardware' || run('S.cur') !== 2 || run('nStores()') !== 3 || !aliased()) fail('a full diner did not open the hardware store as store three');
  const depts = run('kind().depts');
  if (depts.join() !== 'hand,paint,oil,batt,lawn,power,tires,storage') fail('the hardware store has the departments ' + depts.join());
  if (depts.some(id => run('ITEMS.' + id + '.of.length') !== 30 || run('BZ.' + id + '.items.reduce(function (n, x) { return n + x.at.length; }, 0)') !== 30)) fail('a hardware department does not have 30 upgrades');
  if (run('opened()') !== 1 || !run("has('hand')") || run("avail('oil')") || !run("avail('paint')")) fail('the hardware store does not start with hand tools alone');
  for (const other of ['produce', 'grill']) if (run("avail('" + other + "')") || run("buy('" + other + "', 0)") !== null) fail(other + ' could be bought in the hardware store');
  for (let i = 1; i < depts.length; i++) {
    run('S.cash = 1e30');
    run("S.b['" + depts[i - 1] + "'] = atLevel('" + depts[i - 1] + "', 30)");
    if (!run("avail('" + depts[i] + "')")) fail(depts[i] + ' did not open after ' + depts[i - 1]);
    if (!run("buy('" + depts[i] + "', 0)")) fail(depts[i] + ' could not be bought');
  }
  const pd = run('Object.keys(kind().pd).sort()');
  if (pd.join() !== 'dock,garden,hall,lot,lounge,rest') fail('the hardware store has the places ' + pd.join());
  if (run('PL.hall.name') !== 'Counter' || run('PL.garden.name') !== 'Nursery' || run('PL.rest.name') !== 'Welding Corner' || run('PL.lounge.name') !== 'Break Room' || run('PL.hall.items.length') !== 3) fail('a place is not worded as the hardware store words it');
  if (run('PL.lot.after') !== 'paint' || run('PL.dock.after') !== 'hand' || run('PL.garden.after') !== 'tires' || run('PL.rest.after') !== 'lawn' || run('PL.lounge.after') !== 'storage') fail('a hardware place comes after the wrong department');
  run('S.cash = 1e30');
  if (run("placeCost('taxi')") !== 0 || run("buyPlace('taxi', 0)") !== null) fail('a taxi stand could be bought in the hardware store');
  run('view(1)');
  if (run('PL.hall.name') !== 'Counter' || run('PL.garden.name') !== 'Patio') fail('the diner lost its wording after the hardware store was on screen');
  run('view(0)');
  if (run('PL.hall.name') !== 'Checkouts' || run('PL.garden.name') === 'Nursery') fail('the supercenter lost its wording after the hardware store was on screen');
  run('view(2)');
  run('S.cs[2].b = {}');
  run('fillStore()');
  if (run('S.pl.taxi') !== 0 || run('S.pl.serv') !== 0 || run('S.pl.head') !== 0) fail('a hardware store that was filled has a place it does not have');
  if (run('S.pl.hall') !== 10 || run('S.pl.rest') !== 8 || run('S.pl.lounge') !== 10 || run('S.pl.garden') !== 4) fail('a filled hardware store is missing a place level');
  if (run('opened()') !== 8 || !(run('rate()') > 0)) fail('a filled hardware store does not earn');
  const a1 = run('S.all');
  const model = run('rate()');
  play(600);
  const got = run('S.all') - a1;
  if (!near(got, model * 600 + run('offRate()') * 600, 0.12)) fail('a filled hardware store on screen earned ' + got + ' in 600 s, the model says ' + (model + run('offRate()')) * 600);
  // the third store pays more than the second by its type's factors
  if (!(run('TY.hardware.mul') > run('TY.diner.mul') && run('TY.hardware.cost') > run('TY.diner.cost'))) fail('the hardware store is not worth more than the diner');
  run('save()');
  const parsed = JSON.parse(store[key]);
  if (!parsed.cs[2] || parsed.cs[2].t !== 'hardware') fail('the hardware store was saved as another type');
  run('S = fresh()');
  run('load()');
  if (run('nStores()') !== 3 || run('here().t') !== 'hardware' || run('PL.garden.name') !== 'Nursery' || run('opened()') !== 8 || !aliased()) fail('the hardware store did not come back as saved');
}

// goals read the same in every store: a goal about a department reads the first store whose type has it, and a done goal
// stays done on the diner's screen
{
  run('reset()');
  run('fillStore()');
  run('S.cash = 1e9');
  run('move()');
  const gi = run("GOALS.findIndex(function (g) { return g.to === 'kitchen' && g.n > 1; })");
  const read = () => run('GOALS[' + gi + '].f()');
  const was = read();
  if (was !== 30 && was !== run('S.cs[0].b.kitchen.l')) fail('a supercenter goal does not read the supercenter from the diner');
  run('S.goal = [' + gi + ', ' + gi + ', ' + gi + ']');
  run('S.gd = {}');
  if (!run('goals()[0].done') || !run('S.gd[' + gi + ']')) fail('a goal done in the supercenter does not read done on the diner screen');
  run('S.cs[0].b.kitchen.l = 1');
  if (!run('goals()[0].done')) fail('a done goal turned undone');
  if (run('homeIndex(\'grill\')') !== 1 || run('homeIndex(\'kitchen\')') !== 0) fail('a goal reads the wrong store');
}

if (failed) process.exit(1);
console.log('chain ok');
