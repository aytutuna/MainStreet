// Pacing of the chain sim, headless: player profiles run on data.js and sim.js in a node vm with fixed seeds, and the
// run prints when the second store opens, the longest wait between purchases, taps per store, gems, the largest amounts
// reached and when the last new thing turns up.
//   node scripts/pace.mjs [--profile claimer,pick,ads,paid,checkin,active] [--seed 7] [--hours 4] [--days N] [--dt 1]
//   node scripts/pace.mjs --check      the claimer's first store must take 30-45 minutes and no amount may pass short()
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const src = ['i18n.js', 'lang/en.js', 'data.js', 'sim.js'].map(f => [f, fs.readFileSync(path.join(root, f), 'utf8')]);

const args = process.argv.slice(2);
const flag = n => args.includes('--' + n);
const val = (n, d) => (args.includes('--' + n) ? args[args.indexOf('--' + n) + 1] : d);
const CHECK = flag('check');
const SEED = +val('seed', 7);
const DT = +val('dt', 1);
// seconds of real time a profile may run before it is cut off
// a run ends once this many stores are open: later stores slow the sim down, and the stand-in types open them in minutes
const LONG = flag('long');
const STORES = +val('stores', LONG ? 10 : 6);
const BUDGET = +val('budget', LONG ? 900 : 16) * 1000;

// what each profile does. claims: goals, daily, missions, achievements; taps: gifts, regulars and the tills in a rush;
// ads: every rewarded offer within the day's caps; warp: use the hour of income when the next buy is far off
const PROFILES = {
  claimer: { claims: true, taps: true, rush: true, hours: LONG ? 60 : 4 },
  pick: { hours: LONG ? 60 : 4 },  // buys only what the game highlights, claims nothing
  ads: { claims: true, taps: true, rush: true, ads: true, warp: 'ad', hours: LONG ? 60 : 4 },
  paid: { claims: true, taps: true, rush: true, ads: true, warp: 'pack', iap: true, hours: LONG ? 60 : 4 },
  checkin: { claims: true, taps: true, rush: true, days: LONG ? 45 : 7, sessions: [8, 11, 14, 17, 20, 23].map(h => [h, 5]) },
  active: { claims: true, taps: true, rush: true, days: LONG ? 14 : 2, sessions: [[8, 60], [14, 60], [20, 60]] }
};

function load() {
  const store = {};
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
  for (const [f, code] of src) vm.runInContext(code, ctx, { filename: f });
  return ctx;
}

// Stand-ins for the types that are not built yet, so the run can reach the end of a month. They exist only here: the same
// departments and places as the supercenter, and the income and price factors the curve in data.js gives each type.
// Types 1 and 2 are the game's own; a built type 3 or later replaces its stand-in when it is merged (--types counts all)
const TYPES_N = +val('types', 10);
const MR = +val('mr', 3);
const CR = +val('cr', 15);
// the third type costs this much more than the diner; the later ones CR times the one before
const C3 = +val('c3', 1.5);
function standIns(X) {
  const have = X.TYPES.filter(t => !t.test);
  for (let n = have.length + 1; n <= TYPES_N; n++) {
    const prev = have[have.length - 1];
    const t = {
      id: 'pace' + n, plan: 'super', depts: X.TYPES[0].depts.slice(), places: X.TYPES[0].places.slice(),
      mul: prev.mul * MR, cost: prev.cost * (n === 3 ? C3 : CR)
    };
    t.di = {}; t.depts.forEach((id, i) => { t.di[id] = i; });
    t.pd = {}; t.places.forEach(id => { t.pd[id] = 1; });
    X.TYPES.push(t);
    X.TY[t.id] = t;
    have.push(t);
  }
}

function simulate(name, cfg) {
  const began = Date.now();
  const X = load();
  const run = code => vm.runInContext(code, X);
  let now = new Date(2026, 10, 24, 8, 0, 0).getTime();
  X.__now = () => now;
  run('clock = function () { return __now(); };');
  let seed = SEED;
  X.__rand = () => { seed = (seed * 1664525 + 1013904223) % 4294967296; return seed / 4294967296; };
  run('Math.random = __rand;');
  if (val('set', '')) run(val('set', ''));
  standIns(X);
  // the other stores' income is worked out again every 10 s instead of every second: it moves only when something is bought
  run('OFF_EVERY = 10');
  run('reset()');
  if (cfg.iap) { X.S.iap.noads = 1; X.S.iap.x2 = 1; }
  const LIMIT = 1000 ** X.tl('num.suffixes').split(',').length;

  const P = {
    t: 0, play: 0, lastBuy: 0, buys: 0, taps: {}, gaps: {}, gemIn: 0, gemOut: 0, packs: 0, adN: 0, adDay: -1, adUsed: {},
    second: null, moves: [], seen: {}, lastNew: { t: 0, what: 'start' }, tapAcc: 0, giftAt: null, gift: null,
    early: {}, maxCash: 0, maxRate: 0, maxAll: 0, over: null, list: null, pick: null, boughtAt: 0, long: [], miss: {}, optsAt: 0, secAcc: 0
  };
  const band = t => (t < 6 * 3600 ? 'h' + Math.floor(t / 3600) : 'd' + (Math.floor(t / 86400) + 1));

  const gems = f => {
    const g0 = X.S.gems;
    const r = f();
    const d = X.S.gems - g0;
    if (d > 0) P.gemIn += d; else P.gemOut -= d;
    return r;
  };
  const newThing = what => { if (!(what in P.seen)) { P.seen[what] = P.t; P.lastNew = { t: P.t, what }; } };

  function adLeft(k) {
    const d = X.dayNum(now);
    if (d > P.adDay) { P.adDay = d; P.adUsed = {}; }
    return X.AD_CAP[k] - (P.adUsed[k] || 0);
  }
  const useAd = k => { P.adUsed[k] = (P.adUsed[k] || 0) + 1; P.adN++; };
  const adsOn = () => cfg.ads && X.S.ads.pt >= X.AD_START;

  function front(dt) {
    now += dt * 1000;
    P.t += dt;
    P.play += dt;
    X.S.ads.pt += dt;
    X.tick(dt);
    if (!cfg.taps) return;
    if (X.gift && X.gift !== P.gift) { P.gift = X.gift; P.giftAt = P.t; }
    if (X.gift && P.t - P.giftAt >= 2) X.takeGift();
    X.shoppers.forEach(c => {
      if (!c.reg || c.tipped) return;
      if (c.seen === undefined) c.seen = P.t;
      if (P.t - c.seen >= 2) gems(() => X.tipReg(c));
    });
    if (X.rush) {
      P.tapAcc += 3 * dt;
      while (P.tapAcc >= 1) {
        P.tapAcc--;
        const busy = X.tills.filter(t => t.q.length);
        if (!busy.length) break;
        X.rushTap(busy[Math.floor(X.__rand() * busy.length)].i, 3);
      }
    } else P.tapAcc = 0;
    if (cfg.rush && !X.rush && !X.shut() && X.S.call <= 0 && X.started()) X.callRush();
  }

  function claims() {
    if (!cfg.claims) return;
    missionTimes();
    X.feats();
    gems(() => X.achieve());
    if (X.started() && X.daily().can) gems(() => X.claimDaily());
    X.goals().forEach(g => { if (g.done) gems(() => X.claimGoal(g.i)); });
    X.missions().forEach((m, i) => { if (m.p >= m.n && !m.c) gems(() => X.claimMission(i)); });
    if (X.bonusReady()) gems(() => X.claimBonus());
  }

  // minutes of play a mission takes from the first time it is seen to its target, by kind
  function missionTimes() {
    X.S.mi.m.forEach(m => {
      if (m.seen === undefined) m.seen = P.play;
      if (m.p >= m.n && m.took === undefined) {
        m.took = P.play - m.seen;
        (P.miss[m.k] = P.miss[m.k] || []).push(m.took / 60);
      }
    });
  }

  function ads() {
    if (!adsOn()) return;
    const S = X.S;
    if (S.x2 <= 0 && adLeft('x2') > 0) { useAd('x2'); S.x2 += X.X2_SECS; }
    if (adLeft('gems') > 0) { useAd('gems'); gems(() => { S.gems += X.AD_GEMS; }); }
    if (adLeft('rush') > 0 && !X.rush && !X.shut() && S.call > 0 && X.started()) { useAd('rush'); X.callRush(true); }
    if (X.shut() && adLeft('night') > 0) { useAd('night'); X.openTonight(true); }
  }

  const PERK_IDS = ['open', 'sales', 'cheap', 'pace', 'cash', 'gems', 'away', 'night', 'rush'];
  function perks() {
    for (;;) {
      let pick = null;
      PERK_IDS.forEach(id => {
        const c = X.perkCost(id);
        if (!c || c > X.S.rep) return;
        const l = X.S.pk[id] || 0;
        if (!pick || l < pick.l) pick = { id, l };
      });
      if (!pick) break;
      X.buyPerk(pick.id);
    }
  }

  function record(o) {
    P.buys++;
    if (P.list && P.list[0] === o) P.list.shift(); else P.list = null;
    P.boughtAt = P.t;
    // a check-in player's waits are counted in the minutes played, not the hours between visits
    const at = cfg.sessions ? P.play : P.t;
    const b = band(P.t);
    P.gaps[b] = Math.max(P.gaps[b] || 0, at - P.lastBuy);
    if (at - P.lastBuy >= 60) P.long.push([at - P.lastBuy, at]);
    P.lastBuy = at;
    P.taps[X.S.cur] = (P.taps[X.S.cur] || 0) + 1;
    newThing(X.here().t + '.' + o.id);
  }

  // what the player buys: the game's own best pick, once it is affordable. Working out the options is the slow part, so
  // the list is kept for several seconds and the item just bought is dropped from it
  function best() {
    if (!P.list || !P.list.length || P.t - P.optsAt >= (P.t - P.boughtAt < 30 ? 8 : 60)) {
      P.list = X.options().sort((a, b) => a.T - b.T);
      P.optsAt = P.t;
    }
    P.pick = P.list[0];
    return P.pick;
  }

  function warp() {
    if (!cfg.warp || X.shut() || !X.started()) return;
    const S = X.S;
    const o = P.pick;
    if (!o || o.cost <= S.cash) return;
    const wait = (o.cost - S.cash) / Math.max(X.chainRate(), 1e-9);
    if (wait < 300 || X.chainRate() * X.WARP_SECS < o.cost - S.cash) return;
    if (adsOn() && adLeft('warp') > 0) { useAd('warp'); X.warp(true); }
    else {
      if (S.gems < X.WARP_COST && cfg.warp === 'pack') { P.packs++; S.gems += 500; }
      if (S.gems >= X.WARP_COST) gems(() => X.warp(false));
      else return;
    }
    P.list = null;
  }

  // short of the stars the next store needs, a player buys the pieces of the nearest star once the money is there, even
  // when they add nothing to the income (the game's best pick never would)
  function starPick() {
    if (X.rating() >= X.gate() || X.here() !== X.S.cs[X.nStores() - 1]) return null;
    let at = null;
    X.BIZ.forEach(z => {
      if (!X.has(z.id)) return;
      const st = X.deptStars(z.id);
      if (st >= X.STAR_AT.length) return;
      const c = X.cost(z.id, X.STAR_AT[st] - X.lv(z.id));
      if (c <= X.S.cash && (!at || c < at.c)) at = { id: z.id, c };
    });
    if (!at) return null;
    return X.options().filter(o => o.k === 'lv' && o.id === at.id).sort((a, b) => a.cost - b.cost)[0] || null;
  }

  function actions() {
    claims();
    ads();
    for (let n = 0; n < 4; n++) {
      const o = (cfg.claims && starPick()) || best();
      if (!o || o.cost > X.S.cash) break;
      const r = gems(() => X.doOption(o));
      if (!r) break;
      record(o);
    }
    warp();
    if (X.canMove()) {
      claims();
      const stores = X.nStores();
      gems(() => X.move());
      if (X.nStores() > stores) {
        P.moves.push(P.t);
        if (P.second === null) { P.second = P.t; P.secondPlay = P.play; }
        newThing('store.' + X.here().t + '.' + X.nStores());
      }
      perks();
      P.list = null;
    }
    const S = X.S;
    const rate = X.chainRate();
    for (const [k, v] of [['cash', S.cash], ['income', rate], ['total', S.all]]) {
      if (v > (P['max' + k[0].toUpperCase() + k.slice(1)] || 0)) P['max' + k[0].toUpperCase() + k.slice(1)] = v;
      if ((v >= LIMIT || !isFinite(v)) && !P.over) P.over = k + ' at ' + (P.t / 60).toFixed(0) + ' min';
    }
    P.maxRate = Math.max(P.maxRate, X.rate());
    for (const m of [2, 5, 10, 20]) if (!(m in P.early) && P.play >= m * 60) P.early[m] = [X.S.all, P.buys];
  }

  // the run ends a while after the last store opens, so the things that store brings are counted
  function done() {
    if (X.nStores() < STORES) return false;
    if (P.fullPlay === undefined) P.fullPlay = P.play;
    return P.play - P.fullPlay >= (LONG ? 1800 : 0);
  }

  function session(secs, stop) {
    for (let i = 0; i < secs && !(stop && stop()) && !P.cut && !done(); i += DT) {
      if (Date.now() - began > BUDGET) P.cut = true;
      front(DT);
      P.secAcc += DT;
      if (P.secAcc >= 2) { P.secAcc = 0; actions(); }
    }
  }

  function away(secs) {
    now += secs * 1000;
    P.t += secs;
    if (secs <= 60) return;
    X.away(secs);
    const dbl = adsOn() && adLeft('away') > 0;
    if (dbl) useAd('away');
    gems(() => X.claimAway(dbl, dbl));
    P.list = null;
    actions();
  }

  const stop = CHECK && cfg === PROFILES.claimer ? () => P.second !== null || P.play >= 3600 : null;
  if (!cfg.sessions) {
    session(Math.round(+val('hours', cfg.hours) * 3600), stop);
  } else {
    const days = +val('days', cfg.days);
    const day0 = now - 8 * 3600000;
    for (let d = 0; d < days; d++) {
      for (const [h, min] of cfg.sessions) {
        if (P.cut || done()) break;
        const at = day0 + d * 86400000 + h * 3600000;
        if (at > now) away(Math.round((at - now) / 1000));
        session(min * 60);
      }
    }
  }
  if (flag('debug')) console.log('debug', JSON.stringify({ cash: X.S.cash, pick: P.pick, cur: X.S.cur, n: X.nStores(), rating: X.rating(), gate: X.gate(), can: X.canMove(), shut: X.shut(), opts: X.options().slice(0, 3) }));
  return P;
}

const X_STORES = P => P.moves.length + 1 >= STORES;
const mmss = s => Math.floor(s / 60) + ':' + String(Math.round(s % 60)).padStart(2, '0');
const num = v => (v >= 1000 ? v.toExponential(2) : v.toFixed(0));

const names = CHECK ? ['claimer'] : val('profile', Object.keys(PROFILES)).toString().split(',');
let failed = false;
const t0 = Date.now();
for (const name of names) {
  const cfg = PROFILES[name];
  if (!cfg) { console.error('unknown profile ' + name); process.exit(2); }
  const s = Date.now();
  const P = simulate(name, cfg);
  const days = P.t / 86400;
  console.log(name + ' (seed ' + SEED + ', ' + (P.t / 3600).toFixed(1) + ' h wall, ' + (P.play / 3600).toFixed(1) + ' h played, ' + ((Date.now() - s) / 1000).toFixed(1) + ' s run)');
  console.log('  second store at   ' + (P.second === null ? 'not reached' : mmss(P.second) + ' min from start' + (cfg.sessions ? ' (' + mmss(P.secondPlay) + ' min played)' : '')) + (P.moves.length > 1 ? '; stores opened at ' + P.moves.map(mmss).join(' ') : ''));
  console.log('  longest wait      ' + (cfg.sessions ? '(played time) ' : '') + Object.keys(P.gaps).map(b => b + ' ' + mmss(P.gaps[b])).join('  '));
  if (flag('gaps')) console.log('  waits over 1 min  ' + P.long.slice(0, 24).map(g => mmss(g[0]) + ' at ' + mmss(g[1])).join(', '));
  console.log('  taps per store    ' + Object.keys(P.taps).slice(0, 6).map(i => 'store ' + (+i + 1) + ': ' + P.taps[i]).join('  ') + '  (' + P.buys + ' buys)');
  console.log('  earned (buys)     ' + Object.keys(P.early).map(m => 'at ' + m + ' min ' + num(P.early[m][0]) + ' (' + P.early[m][1] + ')').join('  '));
  console.log('  gems              ' + P.gemIn.toFixed(0) + ' earned, ' + P.gemOut.toFixed(0) + ' spent; ' + (P.gemIn / (P.play / 3600)).toFixed(0) + ' per hour played' + (days >= 1 ? ', ' + (P.gemIn / days).toFixed(0) + ' per day' : '') + (P.packs ? '; ' + P.packs + ' packs bought' : '') + (P.adN ? '; ' + P.adN + ' ads' : ''));
  console.log('  largest           cash ' + num(P.maxCash) + ', income ' + num(P.maxIncome) + '/s (screen ' + num(P.maxRate) + '/s), total ' + num(P.maxTotal));
  console.log('  last new thing    ' + (P.lastNew.t / 86400).toFixed(2) + ' days (' + mmss(P.lastNew.t) + ' min, ' + P.lastNew.what + ')' + (P.lastNew.t > P.t - 600 ? ' - still appearing at the end of the run' : ''));
  if (X_STORES(P)) console.log('  stopped with ' + STORES + ' stores open (--stores)');
  if (P.cut) console.log('  cut off by the time budget (--budget ' + BUDGET / 1000 + ' s) after ' + (P.t / 3600).toFixed(2) + ' h');
  if (LONG) console.log('  missions (min)    ' + Object.keys(P.miss).map(k => k + ' ' + P.miss[k].sort((a, b) => a - b)[Math.floor(P.miss[k].length / 2)].toFixed(1) + ' (' + P.miss[k].length + ')').join('  '));
  console.log('  past last suffix  ' + (P.over || 'no'));
  if (CHECK) {
    const min = P.second === null ? Infinity : P.second / 60;
    if (min < 30 || min > 45) { console.error('FAIL: the claimer opens the second store after ' + (min === Infinity ? 'more than 60' : min.toFixed(1)) + ' minutes, not 30-45'); failed = true; }
    if (P.over) { console.error('FAIL: an amount passes the last suffix (' + P.over + ')'); failed = true; }
  }
}
console.log('total ' + ((Date.now() - t0) / 1000).toFixed(1) + ' s');
process.exit(failed ? 1 : 0);
