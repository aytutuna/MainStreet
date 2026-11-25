var KEY = 'mainstreet.v11';
var OLD_KEYS = ['mainstreet.v10', 'mainstreet.v9', 'mainstreet.v8', 'mainstreet.v7', 'mainstreet.v6', 'mainstreet.v5', 'mainstreet.v4', 'mainstreet.v3', 'mainstreet.v2', 'mainstreet.v1', 'mainstreet.won'];
var MAX_AWAY = 8 * 3600;
var START_CASH = 5;
// each store is worth this much more income than the one before; the move needs GATE0 department stars in store 1
// and GATE_STEP more in each one after, up to every star in the store
var STORE_MUL = 1.45;
// and from store 3 on everything costs this much more than in the one before, so income does not outrun the prices
var STORE_COST = 1.35;
var GATE0 = 16;
var GATE_STEP = 2;
var HALL_BOOST = 0.1;
var X2_COST = 20;
var AWAY_X2 = 5;
var X2_SECS = 1800;
var WARP_COST = 50;
var WARP_SECS = 3600;
var DAILY = [
  { cash: 2 }, { gems: 5 }, { x2: 30 }, { cash: 30 }, { gems: 10 }, { cash: 60 }, { gems: 25, x2: 60, cash: 120 }
];

// shoppers a second: on foot (more for a bigger store and the garden), by car for each Parking level, by taxi for
// each Taxi Stand level, and garden visitors who only buy a plant
var WALK0 = 0.1;
var PER_DEPT = 0.006;
var DRAW = 0.0025;
var PER_LOT = 0.035;
var PER_TAXI = 0.02;
var PER_GARDEN = 0.015;
var GARDEN_IN = 0.025;
// each Customer Service level brings this much more of every kind of shopper
var SERV = 0.04;
// each Restrooms level makes shoppers spend this much more
var REST = 0.03;
// each Break Room level cuts the time a till or a stocker takes to this share
var LOUNGE = 0.96;
// each Head Office level adds this much income and an hour of time away that still pays
var HEAD = 0.02;
// seconds at the till for one shopper at Checkouts level 0, each level a little faster; GAP is the walk up to it
var LANE_T = 5;
var SELF_T = 8;
var PLANT_T = 3;
var GAP = { lane: 1, self: 2, garden: 1.5 };
var CAP = 4;
var PATIENCE = 6;
var SHOP_T = 30;
var PLANT = 0.3;
// goods are counted in shoppers: a box holds what BOX shoppers take from a department, a dolly carries its boxes, and a
// full department holds SHELF loads. A stocker takes SHELVE seconds to put a load out
var SHELF = 6;
var SHELVE = 4;
var BOX = 8;
// each Staff level cuts the stockers' work in its department to this share
var STAFF = 0.7;

// a game day lasts CLOCK real seconds. The store shuts from SHUT[0] to SHUT[1] o'clock, two game hours that are two minutes
// of play, and the clock starts at START_H
var CLOCK = 1440;
var SHUT = [23, 1];
var START_H = 6;
var speed = 1;
var shutNow = null;
// server time: the last answer from the time source plus the monotonic time since it, so a changed phone clock moves
// nothing. Until the first answer, and in tests, it is the phone's clock
var synced = null;
var ZONE_HOURS = 20;
var DAILY_GAP = 20 * 3600000;
var clock = function () { return synced ? synced.ms + performance.now() - synced.at : Date.now(); };
var onShopper = null;
var onMission = null;
var onYesterday = null;
var SAVE_V = 11;
var onSaveFail = null;
var onSaved = null;
var saveFailed = false;
// a save from a newer build is left alone
var blocked = false;
var BZ = {};
BIZ.forEach(function (b, i) {
  var it = ITEMS[b.id];
  b.i = i;
  b.items = it.it.map(function (e) { return { name: e[0], stat: e[1], at: [] }; });
  for (var k = 0; k < it.of.length; k++) b.items[+it.of.charAt(k)].at.push(k);
  b.first = +it.of.charAt(0);
  b.sn = 0;
  b.items.forEach(function (e) { if (e.stat === 'sell') b.sn += e.at.length; });
  BZ[b.id] = b;
});
PLACES.forEach(function (p) {
  // got: how many of each item the place starts with, like the first lane and the first stocker
  p.items = p.it.map(function (n, j) { return { name: n, at: [], got: p.got ? p.got[j] : 0 }; });
  p.rk = [];
  for (var k = 0; k < p.of.length; k++) {
    var e = p.items[+p.of.charAt(k)];
    p.rk.push(e.at.length);
    e.at.push(k);
  }
});

var S = fresh();

function fresh() {
  var s = { v: 11, cash: START_CASH, gems: 0, rep: 0, pk: {}, store: 1, run: 0, all: 0, pend: 0, ps: 0, x2: 0, call: 0, vt: rnd(VIP.first), b: {}, ms: {},
    st: { srv: 0, lost: 0, sr: 0, t: 0 }, goal: [0, 1, 2], gn: 3, gd: {}, day: { n: 0, d: -1, t: 0 }, tz: { o: zone(), at: clock() }, mi: { d: -1, m: [], b: 0 }, rg: { o: {}, days: 0, gifts: 0, combo: 0 }, lk: { on: 'classic', own: {} }, ac: { o: {}, m: {} },
    ask: 0, clk: START_H * CLOCK / 24, iap: { noads: 0, x2: 0, starter: 0, noadsTx: '', x2Tx: '', noadsUser: '', x2User: '', noadsAt: 0, x2At: 0, wait: {}, tx: [], rf: [], paid: [] }, cl: { base: '', sig: '', bap: 0, old: [], seen: {}, force: 0, fly: null }, er: 0, ads: { d: -1, n: {}, pt: 0, ap: 0, li: 0, sd: 0 }, hold: { dev: '', at: 0 }, ts: clock() };
  noPlaces(s);
  s.b.produce = atLevel('produce', 1);
  return s;
}

// a store with no places: S.pl is each place's total level, S.pi the level of each of its items
function noPlaces(s) {
  s.pl = {};
  s.pi = {};
  PLACES.forEach(function (p) {
    s.pl[p.id] = 0;
    s.pi[p.id] = atPlace(p.id, 0);
  });
}

// numbers: 1.2K, 3.4M, 5.6B, 7.8T and so on up to Dc, then 1.5e42
var SUFFIX = null;

function short(v) {
  if (!isFinite(v)) return '∞';
  if (!SUFFIX) SUFFIX = tl('num.suffixes').split(',');
  if (v < 1000) return fmtn(v < 10 && v !== Math.floor(v) ? Math.round(v * 10) / 10 : Math.floor(v));
  var i = Math.floor(Math.log10(v) / 3);
  var x = v / Math.pow(1000, i);
  if (x >= 999.5) {
    x /= 1000;
    i++;
  }
  if (i < SUFFIX.length) return fmtn(Number(x.toPrecision(3))) + SUFFIX[i];
  var e = Math.floor(Math.log10(v));
  var m = Number((v / Math.pow(10, e)).toPrecision(2));
  if (m >= 10) {
    m = 1;
    e++;
  }
  return fmtn(m) + 'e' + e;
}

function lv(id) {
  return S.b[id] ? S.b[id].l : 0;
}

function has(id) {
  return lv(id) > 0;
}

// a department can be opened once the one before it in the list is open
function avail(id) {
  var i = BZ[id].i;
  return has(id) || i === 0 || has(BIZ[i - 1].id);
}

// a department at level l has the first l upgrades of plan.js in; an item's level is how many of its own are among them
function atLevel(id, l) {
  var it = BZ[id].items.map(function (e) {
    var n = 0;
    e.at.forEach(function (k) { if (k < l) n++; });
    return n;
  });
  return { l: l, it: it };
}

// a place at level l has the first l pieces of its next list in; an item's level is how many of its own are among them
function atPlace(id, l) {
  return PL[id].items.map(function (e) {
    var n = 0;
    e.at.forEach(function (k) { if (k < l) n++; });
    return n;
  });
}

// whether a place has piece k of its next list, which is its item's rank-th piece; -1 is what stands from the start
function placeHas(id, k) {
  var p = PL[id];
  return k < 0 || S.pi[id][+p.of.charAt(k)] > p.rk[k];
}

// the levels in a department's items of one stat
function statLv(id, stat) {
  var e = S.b[id];
  var n = 0;
  if (e) BZ[id].items.forEach(function (x, j) { if (x.stat === stat) n += e.it[j]; });
  return n;
}

function starsAt(l) {
  var n = 0;
  STAR_AT.forEach(function (a) { if (l >= a) n++; });
  return n;
}

function deptStars(id) {
  return starsAt(lv(id));
}

// the plan.js indexes of the pieces a department has, which are the first it[j] of each item
function pieces(id) {
  var e = S.b[id];
  var out = [];
  if (e) BZ[id].items.forEach(function (x, j) { out = out.concat(x.at.slice(0, e.it[j])); });
  return out;
}

function drawLv() {
  var n = 0;
  BIZ.forEach(function (b) { n += statLv(b.id, 'draw'); });
  return n;
}

function gmul() {
  return Math.pow(STORE_MUL, S.store - 1) * (1 + HALL_BOOST * S.pl.hall) * (1 + REST * S.pl.rest) * pv('sales') * regMul() * achMul();
}

// the regulars owned, each adding a little to sales and the whole set a little more
function regOwned() {
  var n = 0;
  for (var i = 0; i < REGS.length; i++) if (S.rg.o[REGS[i].id]) n++;
  return n;
}

function regMul() {
  var n = regOwned();
  return 1 + REGC.sales * n + (n === REGS.length ? REGC.set : 0);
}

function bmul() {
  return (S.x2 > 0 ? 2 : 1) * (S.iap.x2 ? 2 : 1) * (1 + HEAD * S.pl.head);
}

function maxAway() {
  return MAX_AWAY + 3600 * (S.pl.head + pv('away'));
}

// what the break room does to the time a till or a stocker takes
function pace() {
  return Math.pow(LOUNGE, S.pl.lounge) * pv('pace');
}

// what each sales level adds to a shopper's basket: a full department sells what UPS levels of sales used to, however
// many of its upgrades are sales ones
function perSell(id) {
  return BZ[id].s * UPS / BZ[id].sn * Math.pow(STAR_MUL, deptStars(id)) * gmul();
}

function spendAt(id) {
  return perSell(id) * statLv(id, 'sell');
}

// what a shopper pays at the till: something from every open department
function basket() {
  var v = 0;
  BIZ.forEach(function (b) { v += spendAt(b.id); });
  return v;
}

function plant() {
  return basket() * PLANT;
}

function opened() {
  var n = 0;
  BIZ.forEach(function (b) { if (has(b.id)) n++; });
  return n;
}

function dayHour() {
  return S.clk * 24 / CLOCK;
}

// closed for the night unless the store stays open all night
function shut() {
  var h = dayHour();
  return !pv('night') && (h >= SHUT[0] || h < SHUT[1]);
}

// the share of a day the store is open
function openShare() {
  return pv('night') ? 1 : 1 - ((SHUT[1] - SHUT[0] + 24) % 24) / 24;
}

function stamp() {
  return fmtClock(Math.floor(S.clk * 1440 / CLOCK));
}

// the first purchase is what the opening prompt waits for
function started() {
  var n = 0;
  BIZ.forEach(function (b) { n += lv(b.id); });
  PLACES.forEach(function (p) { n += S.pl[p.id]; });
  return n > 1 || S.store > 1 || S.day.n > 0;
}

function flow() {
  var p = S.pl;
  var m = 1 + SERV * p.serv;
  return { walk: (WALK0 + PER_DEPT * opened() + DRAW * drawLv() + PER_GARDEN * p.garden) * m, car: PER_LOT * p.lot * m, taxi: PER_TAXI * p.taxi * m, garden: GARDEN_IN * p.garden };
}

function inRate() {
  var f = flow();
  return f.walk + f.car + f.taxi;
}

function svc(k) {
  var l = S.pl.hall;
  return (k === 'lane' ? LANE_T * Math.pow(0.9, l) : k === 'self' ? SELF_T * Math.pow(0.93, l) : PLANT_T) * pace();
}

// shoppers a second the open tills can take
function capacity() {
  var c = 0;
  TILLS.forEach(function (t) { if (placeHas('hall', t.lv - 1)) c += 1 / (svc(t.k) + GAP[t.k]); });
  return c;
}

function served() {
  return Math.min(inRate(), capacity());
}

function gardenServed() {
  return S.pl.garden ? Math.min(flow().garden, 1 / (svc('garden') + GAP.garden)) : 0;
}

// the stockers, and how many boxes each one's dolly carries
function crewAt() {
  return [1 + S.pi.dock[0], 2 + S.pi.dock[1]];
}

// shoppers one dolly load keeps supplied
function dolly() {
  return BOX * crewAt()[1];
}

function walkT(id) {
  return BZ[id].w * pace();
}

function shelveT() {
  return SHELVE * pace();
}

function trip(id) {
  return 2 * walkT(id) + shelveT();
}

// stocker seconds a second it takes to keep a department full for n shoppers a second
function need(id, n) {
  return spendAt(id) ? n * trip(id) / dolly() * Math.pow(STAFF, statLv(id, 'staff')) : 0;
}

// what a load is worth on the shelves once the department's clerks have put it out
function lift(id) {
  return Math.pow(STAFF, -statLv(id, 'staff'));
}

// shoppers a second the stockers can keep every open department full for
function stockCap() {
  var t = 0;
  BIZ.forEach(function (b) { t += need(b.id, 1); });
  return crewAt()[0] / t;
}

// the departments with goods to sell, best first by what a stocker's second there earns. The stockers serve them in
// that order, so when they cannot carry everything the departments that earn least per stocker second run short
function ranked() {
  var out = BIZ.filter(function (b) { return spendAt(b.id) > 0; });
  var v = {};
  out.forEach(function (b) { v[b.id] = spendAt(b.id) / need(b.id, 1); });
  return out.sort(function (a, b) { return v[b.id] - v[a.id]; });
}

// what the shoppers pay for at the tills a second while the store runs steady. Stockers keep the departments that
// earn most per stocker second full first; past what they can carry the rest are empty part of the time
function sold() {
  var n = served();
  var left = crewAt()[0];
  var v = 0;
  ranked().forEach(function (b) {
    var t = need(b.id, n);
    if (!t) return;
    v += n * spendAt(b.id) * Math.min(1, left / t);
    left = Math.max(0, left - t);
  });
  return v;
}

// income a second while the store runs steady, before the x2 boost
function baseRate() {
  return sold() + gardenServed() * plant();
}

function rate() {
  return baseRate() * bmul();
}

function storeCost() {
  return Math.pow(STORE_COST, Math.max(0, S.store - 2));
}

// a piece's price is set by its place in plan.js, so buying one item never moves the price of another
function pieceCost(id, k) {
  if (k < 0) return Infinity;
  var b = BZ[id];
  return b.c0 * Math.pow(b.g, k) * (1 - pv('cheap')) * storeCost();
}

// the cheapest n pieces a department still lacks; an item's pieces are in plan order, so these can all be bought
function cost(id, n) {
  if (n === undefined) n = 1;
  var have = pieces(id);
  var c = 0;
  for (var k = 0; k < UPS && n > 0; k++) {
    if (have.indexOf(k) >= 0) continue;
    c += pieceCost(id, k);
    n--;
  }
  return n > 0 ? Infinity : c;
}

// unlimited money for testing: spending is free, and the real balance waits in FREE so saves never hold the top-up
var FREE = null;
var TOP = 1e60;

function setFree(on) {
  if (on && FREE === null) {
    FREE = S.cash;
    S.cash = TOP;
  } else if (!on && FREE !== null) {
    S.cash = FREE;
    FREE = null;
  }
}

// a balance below the top-up means S was just loaded, sold or reset: that is the real one
function topUp() {
  if (FREE === null) return;
  if (S.cash < TOP / 10) FREE = S.cash;
  S.cash = TOP;
}

function earn(v) {
  if (FREE !== null) FREE += v;
  S.cash += v;
  S.run += v;
  S.all += v;
}

// the next piece of an item, or -1 when it has all of them. An unopened department can only buy its first piece
function nextPiece(id, j) {
  var e = S.b[id];
  var x = BZ[id].items[j];
  if (!e) return j === BZ[id].first ? 0 : -1;
  return e.it[j] < x.at.length ? x.at[e.it[j]] : -1;
}

// one more level of item j, which adds that item's next piece. Returns what changed: the piece, an unlock, a star
// earned and its gems
function buy(id, j) {
  if (!avail(id) || nextPiece(id, j) < 0) return null;
  var c = pieceCost(id, nextPiece(id, j));
  if (c > S.cash) return null;
  S.cash -= c;
  var b = S.b[id] || (S.b[id] = atLevel(id, 0));
  var was = b.l;
  var piece = nextPiece(id, j);
  b.it[j]++;
  b.l++;
  mis('buy', 1);
  var res = { id: id, item: j, piece: piece, from: was, to: b.l, unlock: was === 0, star: 0, gems: 0 };
  STAR_AT.forEach(function (a, i) {
    if (was >= a || b.l < a) return;
    res.star = i + 1;
    if ((S.ms[id] || 0) > i) return;
    S.ms[id] = i + 1;
    S.gems += STAR_GEMS[i];
    res.gems += STAR_GEMS[i];
  });
  if (res.unlock) mis('open', 1, id);
  if (res.star) mis('star', 1, id);
  return res;
}

// the price of item j's next piece, or without j of the cheapest piece left; 0 when there is none to buy
function placeCost(id, j) {
  var p = PL[id];
  if (!has(p.after)) return 0;
  var k = -1;
  if (j !== undefined) k = placePiece(id, j);
  else p.items.forEach(function (x, i) {
    var q = placePiece(id, i);
    if (q >= 0 && (k < 0 || q < k)) k = q;
  });
  return k >= 0 ? p.cost[k] * (1 - pv('cheap')) * storeCost() : 0;
}

// the piece of a place's next list that item j adds next, or -1 when it has them all
function placePiece(id, j) {
  var e = PL[id].items[j];
  var n = S.pi[id][j];
  return n < e.at.length ? e.at[n] : -1;
}

function buyPlace(id, j) {
  var piece = placePiece(id, j);
  var c = placeCost(id, j);
  if (piece < 0 || !c || S.cash < c) return null;
  S.cash -= c;
  S.pi[id][j]++;
  S.pl[id]++;
  mis('buy', 1);
  return { id: id, item: j, piece: piece, place: true };
}

// Shoppers come in on foot, by car or by taxi, fill a basket and pay at a till, and the money comes in then. A till
// serves whoever is at its front; a lane holds CAP, a self checkout one. When every line is full a shopper waits a
// little at the front, then puts the basket back and leaves. The view walks each shopper it has a figure for: it
// sets v, calls atFront when they reach the checkouts and sets here once they stand at their till. Shoppers and
// stockers are not saved; a loaded store starts with full shelves and fills with shoppers in a few seconds
var shoppers = [];
var tills = [];
var due = {};
var sid = 0;
var lostT = 0;
// what the player can tap: a gift that shows up for a few seconds now and then, and a rush that doubles the arrivals for
// a while. The ui sets hold while the player is busy elsewhere, so nothing new starts then
var hold = false;
var gift = null;
var giftT = 0;
var rush = null;
var rushT = 0;
// the rush's extra arrivals still owed, and how many of them the view has a figure for
var xdue = { walk: 0, car: 0, taxi: 0 };
var extraRoom = 1e9;
// seconds left of the calm after a rush, when full lines and empty shelves are not blamed on the store
var calmT = 0;
// what the till pays a second, averaged over the last half minute outside a rush
var inc = 0;
var incRate = 0;
var onPerk = null;
// how full each department's shelves are, 0 to 1, and the stockers: the department each is taking a load to and
// how far into the trip it is (the view walks them by that)
var fill = {};
var crew = [];
var outT = 0;

function clearShoppers() {
  shoppers = [];
  tills = TILLS.map(function (t, i) { return { i: i, k: t.k, lv: t.lv, q: [], t: 0 }; });
  tills.push({ i: TILLS.length, k: 'garden', lv: 0, q: [], t: 0 });
  due = { walk: 0.8, car: 0.4, taxi: 0, garden: 0.5 };
  lostT = 0;
  perkOff();
  BIZ.forEach(function (b) { fill[b.id] = 1; });
  crew = [];
  outT = 0;
}
clearShoppers();

function tillOpen(t) {
  return t.k === 'garden' ? S.pl.garden > 0 : placeHas('hall', t.lv - 1);
}

function come(by) {
  var c = { id: ++sid, by: by, garden: by === 'garden', t: by === 'garden' ? SHOP_T / 2 : SHOP_T, age: 0, v: false, here: false, front: false, wait: 0,
    at: null, done: false, reg: null, tipped: false };
  // now and then the shopper is one of the regulars
  if (by !== 'garden' && speed === 1) {
    if (S.vt <= 0 && !hold && !vipIn()) {
      c.reg = 'vip';
      S.vt = rnd(VIP.gap);
    } else if (Math.random() < REGC.odds) c.reg = pickReg();
  }
  shoppers.push(c);
  if (onShopper) onShopper('in', c);
}

function vipIn() {
  for (var i = 0; i < shoppers.length; i++) if (shoppers[i].reg === 'vip') return true;
  return false;
}

// the shortest line with room, or a free self checkout when the lines have people in them
function join(c) {
  var lane = null;
  var free = [];
  tills.forEach(function (t) {
    if (!tillOpen(t) || (t.k === 'garden') !== c.garden) return;
    if (t.k === 'self') {
      if (!t.q.length) free.push(t);
    } else if (t.q.length < (t.k === 'garden' ? 2 : CAP) && (!lane || t.q.length < lane.q.length)) lane = t;
  });
  var t = lane;
  if (free.length && (!lane || lane.q.length > 0 || Math.random() < 0.35)) t = free[Math.floor(Math.random() * free.length)];
  if (!t) return false;
  t.q.push(c);
  c.at = t;
  if (!c.garden) c.bk = take();
  c.here = false;
  if (onShopper) onShopper('till', c);
  return true;
}

function atFront(c) {
  if (c.front || c.done) return;
  c.front = true;
  c.wait = PATIENCE;
  join(c);
}

function gone(c) {
  c.done = true;
  c.at = null;
  var i = shoppers.indexOf(c);
  if (i >= 0) shoppers.splice(i, 1);
}

// what a shopper has in the basket by the time it goes to a till: a shopper's worth from every department with goods
// left on its shelves
function take() {
  var v = 0;
  var full = SHELF * dolly();
  BIZ.forEach(function (b) {
    var id = b.id;
    var sp = spendAt(id);
    if (!sp) return;
    if (fill[id] > 0) {
      v += sp * Math.min(1, fill[id] * full);
      fill[id] = Math.max(0, fill[id] - 1 / full);
    } else if (!rush && calmT <= 0) outT = 20;
  });
  return v;
}

function pay(c, t) {
  var v = (c.garden ? plant() : c.bk) * bmul();
  earn(v);
  if (rush) rush.got += v;
  else inc += v;
  S.st.srv++;
  S.st.sr++;
  mis('serve', 1);
  mis('earn', v);
  gone(c);
  if (onShopper) onShopper('paid', c, v, t);
}

function lose(c) {
  // a rush's walk-outs are a passing spike: no warning, and they do not count
  if (!rush && calmT <= 0) {
    S.st.lost++;
    lostT = 20;
  }
  c.lost = true;
  gone(c);
  if (onShopper) onShopper('lost', c);
}

function serve(t, dt) {
  while (t.q.length) {
    var c = t.q[0];
    if (c.v && !c.here && speed === 1) return;
    var need = svc(t.k) + (c.v ? 0 : GAP[t.k]) - t.t;
    if (dt < need) {
      t.t += dt;
      return;
    }
    dt -= need;
    t.t = 0;
    t.q.shift();
    pay(c, t);
  }
}

function linesFull() {
  return lostT > 0;
}

function shelvesOut() {
  return outT > 0;
}

// the department that earns most per stocker second with room for one more load besides the ones on their way
function pickDept(r) {
  for (var i = 0; i < r.length; i++) {
    var id = r[i].id;
    var on = 0;
    crew.forEach(function (w) { if (w.id === id) on++; });
    if (fill[id] + (on + 1) * lift(id) / SHELF <= 1) return id;
  }
  return null;
}

// a stocker's trip: out to the department, the load onto its shelves a little at a time, and back to the stock door.
// A long step at a test speed runs on into the next trip
function stockStep(dt) {
  outT -= dt;
  var n = crewAt()[0];
  while (crew.length < n) crew.push({ id: null, t: 0, out: 0, T: 0 });
  crew.length = n;
  var r = ranked();
  crew.forEach(function (w) {
    var left = dt;
    while (left > 0) {
      if (!w.id) {
        w.id = pickDept(r);
        if (!w.id) return;
        w.t = 0;
        w.out = walkT(w.id);
        w.T = trip(w.id);
      }
      var a = Math.max(w.t, w.out);
      var d = Math.min(left, w.T - w.t);
      w.t += d;
      left -= d;
      var b = Math.min(w.t, w.out + shelveT());
      if (b > a) fill[w.id] = Math.min(1, fill[w.id] + (b - a) / shelveT() / SHELF * lift(w.id));
      if (w.t >= w.T) w.id = null;
    }
  });
}

function tick(dt) {
  dt *= speed;
  // the clock waits for the first purchase, so the opening never meets a closing
  if (started()) S.clk = (S.clk + dt) % CLOCK;
  var off = shut();
  if (S.x2 > 0 && !off) S.x2 = Math.max(0, S.x2 - dt);
  if (S.call > 0) S.call = Math.max(0, S.call - dt);
  lostT -= dt;
  calmT -= dt;
  if (shutNow !== null && off !== shutNow) {
    // a rush has nobody to bring in once the doors shut
    if (off && rush) rush.left = 0;
    if (onPerk) onPerk(off ? 'close' : 'open');
  }
  shutNow = off;
  // the steady rate a rush is measured against is the last one from while open
  if (!rush && !off) incRate += (inc / dt - incRate) * Math.min(1, dt / 30);
  if (!rush) inc = 0;
  var f = flow();
  for (var k in due) {
    if (off) {
      due[k] = Math.min(due[k], 0.99);
      continue;
    }
    due[k] += f[k] * dt;
    while (due[k] >= 1) {
      due[k]--;
      come(k);
    }
    // a rush's extra shoppers only come in while the view has figures to spare; the rest never arrive, so none is lost
    if (rush && k !== 'garden') {
      xdue[k] += f[k] * dt * ((rush.kind === 'sale' ? RUSH.sale : RUSH.mul) - 1);
      while (xdue[k] >= 1) {
        xdue[k]--;
        if (extraRoom > 0) {
          extraRoom--;
          come(k);
        }
      }
    }
  }
  for (var i = shoppers.length - 1; i >= 0; i--) {
    var c = shoppers[i];
    c.age += dt;
    // a figure stuck somewhere lets go, and its shopper carries on unseen
    if (c.v && c.age > 240) {
      c.v = false;
      c.here = true;
    }
    if (c.at) continue;
    if (c.front) {
      if (join(c)) continue;
      c.wait -= dt;
      if (c.wait <= 0) lose(c);
    } else if (!c.v || speed !== 1) {
      c.t -= dt;
      if (c.t <= 0) atFront(c);
    }
  }
  tills.forEach(function (t) { serve(t, dt); });
  stockStep(dt);
  perkStep(dt);
}

function rushSecs() {
  return RUSH.secs + pv('rush');
}

function rnd(r) {
  return r[0] + Math.random() * (r[1] - r[0]);
}

function perkOff() {
  var was = gift || rush;
  gift = null;
  rush = null;
  xdue.walk = xdue.car = xdue.taxi = 0;
  calmT = 0;
  inc = incRate = 0;
  giftT = rnd(GIFT.gap);
  rushT = rnd(RUSH.gap);
  if (was && onPerk) onPerk('off');
}

function perkStep(dt) {
  if (!hold && S.vt > 0) S.vt = Math.max(0, S.vt - dt);
  if (gift) {
    gift.left -= dt;
    if (gift.left <= 0) {
      gift = null;
      giftT = rnd(GIFT.gap);
      if (onPerk) onPerk('giftgone');
    }
  } else if (!hold && (giftT -= dt) <= 0) {
    gift = { kind: ['cart', 'wallet', 'vip'][Math.floor(Math.random() * 3)], left: rnd(GIFT.life), jack: Math.random() < GIFT.jack };
    if (onPerk) onPerk('gift', gift);
  }
  if (rush) {
    rush.left -= dt;
    if (rush.left <= 0) {
      var r = rush;
      rush = null;
      rushT = rnd(RUSH.gap);
      calmT = 8;
      // what the rush added to the steady income
      r.extra = Math.max(0, r.got - incRate * r.len);
      if (onPerk) onPerk('rushend', r);
    }
  } else if (!hold && !shut() && (rushT -= dt) <= 0) startRush();
}

function startRush() {
  rush = { kind: Math.random() < 0.5 ? 'bus' : 'sale', left: rushSecs(), got: 0 };
  rush.len = rush.left;
  if (onPerk) onPerk('rush', rush);
}

// the manager's button: a free rush once the cooldown is over, or any time for the gems or the ad that paid for it
function callRush(paid) {
  if (rush || shut() || (S.call > 0 && !paid)) return false;
  S.call = CALL.cool;
  startRush();
  return true;
}

function callRushGems() {
  if (rush || shut() || S.gems < CALL.gems) return false;
  S.gems -= CALL.gems;
  return callRush(true);
}

// the player taps the gift: what it pays, or null when it has gone
function takeGift() {
  if (!gift) return null;
  var r = { kind: gift.kind, cash: 0, gems: 0, x2: 0, jack: gift.jack };
  var p = Math.random();
  if (gift.jack) {
    if (p < GIFT.jmix) {
      r.x2 = GIFT.jx2;
      S.x2 += r.x2;
    } else {
      r.cash = Math.max(1, rate() * rnd(GIFT.jcash));
      earn(r.cash);
    }
  } else if (p < GIFT.x2) {
    r.x2 = GIFT.x2Secs;
    S.x2 += r.x2;
  } else if (p < GIFT.x2 + GIFT.gems) {
    r.gems = Math.round(rnd(GIFT.gemN));
    S.gems += r.gems;
  } else {
    r.cash = Math.max(1, rate() * rnd(GIFT.cash));
    earn(r.cash);
  }
  gift = null;
  giftT = rnd(GIFT.gap);
  S.rg.gifts++;
  mis('gift', 1);
  return r;
}

// a tap on till i during a rush gives the shopper being served a head start, a little longer for the nth tap of a combo
function rushTap(i, n) {
  var t = tills[i];
  if (!rush || !t || !t.q.length || (t.q[0].v && !t.q[0].here)) return false;
  var was = t.t;
  t.t = Math.min(t.t + RUSH.tap * (1 + RUSH.combo * Math.min(n - 1, RUSH.top)), svc(t.k) + (t.q[0].v ? 0 : GAP[t.k]) - 0.05);
  if (t.t > was) mis('rush', 1);
  S.rg.combo = Math.max(S.rg.combo, n);
  return true;
}

// what each regular's feat has counted so far; the regular is owned for good once it reaches REGS' n
var REGV = {
  mabel: function () { return rating(); },
  gus: function () { return S.st.srv; },
  ollie: function () { return S.rg.gifts; },
  priya: function () { return S.rg.combo; },
  hana: function () { return S.all; },
  theo: function () { return has('tech') ? 1 : 0; },
  walt: function () { return S.rg.days; },
  rosa: function () { return S.store; },
  nina: function () {
    var n = 0;
    for (var k in S.pk) n += S.pk[k];
    return n;
  },
  ivy: function () { return S.pl.garden > 0 ? 1 : 0; },
  bruno: function () {
    var n = 0;
    BIZ.forEach(function (b) { n = Math.max(n, deptStars(b.id)); });
    return n;
  },
  felix: function () { return rating(); }
};

// the regulars whose feats got done since the last look, now owned
function feats() {
  var got = [];
  REGS.forEach(function (r) {
    if (S.rg.o[r.id] || REGV[r.id]() < r.n) return;
    S.rg.o[r.id] = 1;
    got.push(r);
  });
  return got;
}

// what each achievement counts. A store's departments and stars start again with a move, so the best so far is kept
var ACHM = { dep: 18, rate: 54, star: 3 };
var ACHV = {
  srv: function () { return S.st.srv; },
  all: function () { return S.all; },
  store: function () { return S.store; },
  dep: function () { return opened(); },
  rate: function () { return rating(); },
  star: function () { return REGV.bruno(); },
  reg: regOwned,
  rush: function () { return S.rg.combo; },
  gift: function () { return S.rg.gifts; },
  day: function () { return S.rg.days; },
  pk: REGV.nina,
  pkmax: function () { return PERKS.filter(function (p) { return S.pk[p.id] >= p.cost.length; }).length; }
};

function achVal(a) {
  var v = ACHV[a.k]();
  return a.k in ACHM ? Math.max(S.ac.m[a.k] || 0, v) : v;
}

// sales the gold achievements add, never more than ACH_CAP
function achMul() {
  var v = 0;
  ACHS.forEach(function (a) { if (S.ac.o[a.id]) v += ACH_TIER[a.t].sales || 0; });
  return 1 + Math.min(ACH_CAP, v);
}

// the achievements reached since the last check, now earned and paid
function achieve() {
  var got = [];
  for (var k in ACHM) S.ac.m[k] = Math.min(ACHM[k], achVal({ k: k }));
  ACHS.forEach(function (a) {
    if (S.ac.o[a.id] || achVal(a) < a.n) return;
    S.ac.o[a.id] = 1;
    S.gems += ACH_TIER[a.t].gems;
    got.push(a);
  });
  return got;
}

// a look can be used once its store or achievement is reached and, if it has a price, bought
function lookState(id) {
  var l = LK[id];
  if (S.lk.on === id) return 'on';
  if (l.store ? S.store < l.store : l.ach && !S.ac.o[l.ach]) return 'lock';
  return !l.gems || S.lk.own[id] ? 'use' : 'buy';
}

function setLook(id) {
  var st = lookState(id);
  if (st === 'buy') {
    if (S.gems < LK[id].gems) return false;
    S.gems -= LK[id].gems;
    S.lk.own[id] = 1;
  } else if (st !== 'use') return false;
  S.lk.on = id;
  return true;
}

var rgNext = {};

// a regular who is not on a cooldown, or null; one that is picked stays away for the cooldown
function pickReg() {
  var now = clock();
  var free = REGS.filter(function (r) { return S.rg.o[r.id] && (rgNext[r.id] || 0) <= now; });
  if (!free.length) return null;
  var r = free[Math.floor(Math.random() * free.length)];
  rgNext[r.id] = now + REGC.cool * 1000;
  return r.id;
}

// the player taps a regular among the shoppers: a tip worth a few seconds of income, once a visit
function tipReg(c) {
  if (!c.reg || c.tipped) return 0;
  c.tipped = true;
  var vip = c.reg === 'vip';
  var v = Math.max(1, rate() * rnd(vip ? VIP.tip : REGC.tip));
  earn(v);
  c.gems = 0;
  if (vip && Math.random() < VIP.gems) {
    c.gems = Math.round(rnd(VIP.gemN));
    S.gems += c.gems;
  }
  return v;
}

// time away: the store runs at its steady rate; the pay is held until claimAway
function away(sec) {
  var s = Math.max(0, Math.min(sec, maxAway()));
  // the night closing is not played out: the away rate just takes the open share of the day, and the x2 boost only
  // runs down while the store is open, as it does when played
  var up = openShare();
  var xs = Math.min(s * up, S.x2);
  var gain = baseRate() * (s * up + xs) * (S.iap.x2 ? 2 : 1) * (1 + HEAD * S.pl.head);
  var n = Math.floor((served() + gardenServed()) * s * up);
  if (started()) S.clk = (S.clk + sec) % CLOCK;
  shutNow = shut();
  S.x2 -= xs;
  S.call = Math.max(0, S.call - s);
  perkOff();
  S.pend += gain;
  S.ps += s;
  S.st.srv += n;
  S.st.sr += n;
  return { secs: s, real: sec, gain: gain, n: n };
}

// what to tell the player while the app is closed: when the store fills up and when the daily reward is there to take.
// Nothing before the first purchase, when the store has not started and the daily reward is still locked. The times are
// worked out on server time and handed over as the phone's clock, which is what the system schedules by
function reminders() {
  var now = clock();
  var out = [];
  if (!started()) return out;
  var phone = Date.now() - now;
  out.push({ id: 'full', at: now + maxAway() * 1000 + phone, body: tl('notify.full') });
  var o = (S.tz ? S.tz.o : new Date(now).getTimezoneOffset()) * 60000;
  var ten = function (n) { return n * 86400000 + o + 10 * 3600000; };
  var today = dayNum(now);
  var at = daily().can ? ten(today) : Math.max(ten(today + 1), S.day.t + DAILY_GAP);
  // a reward already waiting is mentioned at the next 10:00, not at once
  if (at <= now) at = ten(today + 1);
  out.push({ id: 'daily', at: at + phone, body: tl('notify.daily') });
  return out;
}

// AWAY_X2 gems for each hour away, counted from the time away so boosts and x2 do not change the price
function awayCost() {
  return Math.max(AWAY_X2, Math.ceil(S.ps / 3600 - 1e-9) * AWAY_X2);
}

// free: the doubling was paid for by an ad
function claimAway(dbl, free) {
  if (!(S.pend > 0)) return 0;
  var c = awayCost();
  if (dbl && !free && S.gems < c) return 0;
  var v = S.pend;
  if (dbl) {
    if (!free) S.gems -= c;
    v *= 2;
  }
  S.pend = 0;
  S.ps = 0;
  earn(v);
  return v;
}

// every way to spend money, with what it adds per second and the time it takes to wait for it and then pay for itself
function options() {
  var out = [];
  var r0 = baseRate();
  var r = Math.max(r0 * bmul(), 1e-9);
  function add(o) {
    o.wait = Math.max(0, o.cost - S.cash) / r;
    o.T = o.wait + o.cost / Math.max(o.gain, 1e-12);
    out.push(o);
  }
  BIZ.forEach(function (z) {
    var id = z.id;
    if (!avail(id)) return;
    z.items.forEach(function (x, j) {
      var k = nextPiece(id, j);
      if (k >= 0) add({ k: 'lv', id: id, item: j, cost: pieceCost(id, k), gain: levelGain(id, j, r0) });
    });
  });
  PLACES.forEach(function (p) {
    p.items.forEach(function (x, j) {
      var c = placeCost(p.id, j);
      if (c) add({ k: 'place', id: p.id, item: j, cost: c, gain: placeGain(p.id, j, r0) });
    });
  });
  return out;
}

// what one more level of an item adds to income a second: makes the change, measures the rate and takes it back
function trial(f, r0) {
  if (r0 === undefined) r0 = baseRate();
  var was = r0 * bmul();
  f(1);
  var now = baseRate() * bmul();
  f(-1);
  return now - was;
}

function levelGain(id, j, r0) {
  return trial(function (d) {
    var b = S.b[id] || (S.b[id] = atLevel(id, 0));
    b.it[j] += d;
    b.l += d;
    if (!b.l) delete S.b[id];
  }, r0);
}

function placeGain(id, j, r0) {
  return trial(function (d) {
    S.pi[id][j] += d;
    S.pl[id] += d;
  }, r0);
}

function best(opts) {
  var b = null;
  (opts || options()).forEach(function (o) {
    if (!b || o.T < b.T) b = o;
  });
  return b;
}

function doOption(o) {
  return o.k === 'lv' ? buy(o.id, o.item) : buyPlace(o.id, o.item);
}

function buyBest() {
  var o = best();
  return o && o.cost <= S.cash ? doOption(o) : null;
}

// goals, in the order they appear; the first three are shown and each finished one is replaced by the next
function gl(t, gems, n, f, x2) {
  return { t: t, g: gems, n: n, f: f, x2: x2 || 0 };
}
// to is the department or place a goal is about, and j the item of a place
function goTo(g, id, j) {
  g.to = id;
  g.j = j;
  return g;
}
function gLv(id, n, gems, x2) {
  return goTo(gl(n === 1 ? tl('goal.open', { dept: BZ[id].name }) : tl('goal.dept_level', { dept: BZ[id].name, n: n }), gems, n, function () { return lv(id); }, x2), id);
}
function gEarn(n, gems, x2) {
  return gl(tl('goal.earn', { amount: short(n) }), gems, n, function () { return S.all; }, x2);
}
function gServe(n, gems, x2) {
  return gl(tl('goal.serve', { n: n }), gems, n, function () { return S.st.srv; }, x2);
}
function gPl(id, n, t, gems) {
  return goTo(gl(t, gems, n, function () { return S.pl[id]; }), id);
}
// a goal on one item of a place, since the place's level also counts its other items
function gIt(id, j, n, t, gems) {
  return goTo(gl(t, gems, n, function () { return S.pi[id][j]; }), id, j);
}
// a goal added with the stockroom
function nw(g) {
  g.nw = true;
  return g;
}
var GOALS = [
  gServe(10, 3), gLv('produce', 10, 3), gLv('bakery', 1, 4), gIt('hall', 0, 1, tl('goal.lane', { n: 2 }), 5), nw(gIt('dock', 0, 1, tl('goal.stocker'), 4)),
  gPl('lot', 1, tl('goal.parking'), 4),
  gServe(100, 3), gLv('bakery', 10, 4), gEarn(1000, 3), gLv('dairy', 1, 5), gLv('produce', 20, 5, 15), gLv('meat', 1, 6),
  gEarn(1e5, 5), gLv('bakery', 20, 6), gServe(500, 5), gLv('frozen', 1, 8), gLv('dairy', 20, 8, 30), gPl('taxi', 1, tl('goal.taxi'), 8),
  gIt('hall', 1, 1, tl('goal.self'), 10), nw(gPl('dock', 3, tl('goal.stockroom_level', { n: 3 }), 10)), gEarn(1e7, 8), gLv('pantry', 1, 10), gLv('produce', 30, 12), gLv('snacks', 1, 10),
  gPl('lot', 3, tl('goal.parking_level', { n: 3 }), 10), gLv('toys', 1, 12), gServe(2000, 10), gEarn(1e9, 10, 30), gLv('tech', 1, 15),
  gIt('hall', 0, 2, tl('goal.lane', { n: 3 }), 15), gLv('kitchen', 1, 20), gEarn(1e11, 15), gLv('kitchen', 20, 15, 30), gLv('toys', 25, 15),
  goTo(gl(tl('goal.move'), 30, 1, function () { return S.store - 1; }), 'sell'), gServe(10000, 20), gEarn(1e13, 20, 60), gLv('clothes', 1, 25),
  gPl('garden', 1, tl('goal.garden'), 25), gLv('home', 1, 30), gLv('office', 1, 30), gPl('hall', 10, tl('goal.checkouts_level', { n: 10 }), 30),
  nw(gPl('dock', 10, tl('goal.stockroom_level', { n: 10 }), 30)),
  gLv('pets', 1, 35), gEarn(1e15, 25), gLv('sports', 1, 35), gServe(50000, 30), gLv('tools', 1, 40), gLv('auto', 1, 40),
  goTo(gl(tl('goal.store', { n: 3 }), 40, 2, function () { return S.store - 1; }), 'sell'), gLv('seasonal', 1, 50), gEarn(1e21, 30)
];

// a v8 save's goal numbers, moved to where those goals are now; the new ones before them are passed over
function v8Goals(o) {
  var at = [];
  GOALS.forEach(function (g, i) { if (!g.nw) at.push(i); });
  function to(i) {
    return i >= 0 && i < at.length ? at[i] : -1;
  }
  if (Array.isArray(o.goal)) o.goal = o.goal.map(to);
  var gd = {};
  if (o.gd) for (var k in o.gd) gd[to(+k)] = 1;
  o.gd = gd;
  var n = Math.floor(num(o.gn, 3));
  o.gn = n < at.length ? at[n] : GOALS.length;
}

function goals() {
  return S.goal.map(function (i) {
    var g = GOALS[i];
    var v = Math.min(g.n, g.f());
    return { i: i, t: g.t, n: g.n, v: v, done: v >= g.n || !!S.gd[i], gems: g.g, x2: g.x2, to: g.to, j: g.j };
  });
}

function claimGoal(i) {
  var at = S.goal.indexOf(i);
  if (at < 0) return null;
  var g = goals()[at];
  if (!g.done) return null;
  S.gems += g.gems;
  S.x2 += g.x2 * 60;
  delete S.gd[i];
  if (S.gn < GOALS.length) S.goal[at] = S.gn++;
  else S.goal.splice(at, 1);
  return g;
}

function finishGoals() {
  S.goal.forEach(function (i) { S.gd[i] = 1; });
}

// the department stars in the store, which is what the move is gated on
function rating() {
  var n = 0;
  BIZ.forEach(function (b) { n += deptStars(b.id); });
  return n;
}

function gate() {
  return Math.min(STAR_AT.length * BIZ.length, GATE0 + GATE_STEP * (S.store - 1));
}

function canMove() {
  return rating() >= gate();
}

// reputation a move pays: a point for each star and each open department, and one for each digit earned in the store
function repGain() {
  return rating() + opened() + Math.floor(Math.log10(S.run + 1));
}

// what a perk is worth at the level bought
function pv(id) {
  return PK[id].val[S.pk[id] || 0];
}

// reputation the next level of a perk takes, 0 at the top
function perkCost(id) {
  return PK[id].cost[S.pk[id] || 0] || 0;
}

function buyPerk(id) {
  var c = perkCost(id);
  if (!c || c > S.rep) return false;
  S.rep -= c;
  S.pk[id] = (S.pk[id] || 0) + 1;
  return true;
}

// the departments a store starts with
function startBiz() {
  var v = pv('open');
  var b = { produce: atLevel('produce', v[0]) };
  if (v[1]) b.bakery = atLevel('bakery', v[1]);
  return b;
}

function move() {
  if (!canMove()) return false;
  claimAway();
  S.rep += repGain();
  S.store++;
  S.cash = START_CASH + pv('cash');
  S.run = 0;
  S.st.sr = 0;
  S.ms = {};
  noPlaces(S);
  S.b = startBiz();
  // stars the start already has pay their gems, as if earned
  for (var id in S.b) {
    for (var i = 0; i < starsAt(S.b[id].l); i++) {
      S.ms[id] = i + 1;
      S.gems += STAR_GEMS[i];
    }
  }
  clearShoppers();
  repick();
  return true;
}

function zone() {
  return new Date(clock()).getTimezoneOffset();
}

// days are counted in the time zone saved at first launch. A new zone is taken on at most once in ZONE_HOURS, so
// flipping the phone's zone back and forth does not make a second day
function dayNum(ms) {
  var o = S.tz ? S.tz.o : new Date(ms).getTimezoneOffset();
  return Math.floor((ms - o * 60000) / 86400000);
}

function zoneCheck() {
  var o = zone();
  if (o !== S.tz.o && clock() - S.tz.at >= ZONE_HOURS * 3600000) S.tz = { o: o, at: clock() };
}

// the streak goes on when the last claim was yesterday, and starts again after a missed day. A clock set back keeps
// the streak and claims nothing until its day comes round
function daily() {
  var today = dayNum(clock());
  var d = S.day;
  var can = d.d < today && clock() - d.t >= DAILY_GAP;
  return { can: can, idx: d.d >= today - 1 || dayNum(d.t + DAILY_GAP) >= today - 1 ? d.n % 7 : 0, gap: d.d < today && !can };
}

function dailyReward(i) {
  var d = DAILY[i];
  return { gems: d.gems || 0, x2: d.x2 || 0, cash: d.cash ? Math.max(25, baseRate() * d.cash * 60) : 0 };
}

function claimDaily() {
  var info = daily();
  if (!info.can) return null;
  var r = dailyReward(info.idx);
  S.gems += r.gems;
  S.x2 += r.x2 * 60;
  if (r.cash) earn(r.cash);
  S.day = { n: info.idx + 1, d: dayNum(clock()), t: clock() };
  S.rg.days++;
  r.idx = info.idx;
  return r;
}

// three missions a day, picked the first time the day needs them. Targets are about 8 minutes of the income and
// traffic of that moment, so they stay in reach as the store grows
var MISS_BONUS = { gems: 5, x2: 20 };
var MISS_KINDS = ['serve', 'earn', 'gift', 'rush', 'buy', 'open', 'star'];

// two significant digits
function nice(v) {
  var p = Math.pow(10, Math.max(0, Math.floor(Math.log10(v)) - 1));
  return Math.round(v / p) * p;
}

// upgrades still to buy in the departments and places that can be bought from now
function upsLeft() {
  var n = 0;
  BIZ.forEach(function (z) {
    if (!avail(z.id)) return;
    z.items.forEach(function (x, j) { n += x.at.length - (S.b[z.id] ? S.b[z.id].it[j] : 0); });
  });
  PLACES.forEach(function (p) {
    if (has(p.after)) p.items.forEach(function (x, j) { n += x.at.length - S.pi[p.id][j]; });
  });
  return n;
}

function missionPool() {
  var pool = [
    { k: 'serve', n: Math.max(10, nice((served() + gardenServed()) * 480)) },
    { k: 'earn', n: Math.max(20, nice(baseRate() * (1 + HEAD * S.pl.head) * 480)) },
    { k: 'gift', n: 4 }, { k: 'rush', n: 12 }
  ];
  if (upsLeft() >= 6) pool.push({ k: 'buy', n: 6 });
  // a department to open or a star to earn only when about 15 minutes of income pays for it
  var room = rate() * 900;
  var next = BIZ.filter(function (b) { return !has(b.id) && avail(b.id) && cost(b.id, 1) <= room; })[0];
  if (next) pool.push({ k: 'open', n: 1, id: next.id });
  var star = null;
  BIZ.forEach(function (b) {
    var st = deptStars(b.id);
    if (!has(b.id) || st >= STAR_AT.length) return;
    var c = cost(b.id, STAR_AT[st] - lv(b.id));
    if (c <= room && (!star || c < star.c)) star = { id: b.id, c: c };
  });
  if (star) pool.push({ k: 'star', n: 1, id: star.id });
  var open = BIZ.filter(function (b) { return has(b.id); }).length;
  pool.forEach(function (m) {
    m.p = 0;
    m.g = 3 + Math.floor(open / 3) + pv('gems');
    m.c = 0;
  });
  return pool;
}

function pickMissions() {
  var pool = missionPool();
  var out = [];
  while (out.length < 3) out.push(pool.splice(Math.floor(Math.random() * pool.length), 1)[0]);
  return out;
}

// after a move the targets of what is not done yet are picked again for the new store
function repick() {
  var cur = missions();
  var pool = missionPool();
  cur.forEach(function (m, i) {
    if (m.p >= m.n) return;
    var free = pool.filter(function (x) { return !cur.some(function (y) { return y.k === x.k; }); });
    if (free.length) cur[i] = free[Math.floor(Math.random() * free.length)];
  });
}

// a day's unclaimed rewards are paid when the next day's missions are picked
function missions() {
  var d = dayNum(clock());
  if (S.mi.d < d) {
    var g = 0;
    var x = 0;
    S.mi.m.forEach(function (m) {
      if (m.p >= m.n && !m.c) {
        m.c = 1;
        g += m.g;
      }
    });
    if (S.mi.m.length && !S.mi.b && S.mi.m.every(function (m) { return m.c; })) {
      g += MISS_BONUS.gems;
      x = MISS_BONUS.x2 * 60;
    }
    S.gems += g;
    S.x2 += x;
    S.mi = { d: d, m: [], b: 0 };
    S.mi.m = pickMissions();
    if (g && onYesterday) onYesterday(g, x);
  }
  return S.mi.m;
}

function missionText(m) {
  switch (m.k) {
    case 'serve': return tl('goal.serve', { n: m.n });
    case 'earn': return tl('mission.earn', { amount: short(m.n) });
    case 'gift': return tl('mission.gift', { n: m.n });
    case 'rush': return tl('mission.rush', { n: m.n });
    case 'buy': return tl('mission.buy', { n: m.n });
    case 'open': return tl('goal.open', { dept: BZ[m.id].name });
  }
  return tl('mission.star', { dept: BZ[m.id].name });
}

function mis(k, n, id) {
  missions().forEach(function (m) {
    if (m.k !== k || m.p >= m.n || (m.id && m.id !== id)) return;
    m.p = Math.min(m.n, m.p + n);
    if (m.p >= m.n && onMission) onMission(m);
  });
}

function claimMission(i) {
  var m = missions()[i];
  if (!m || m.p < m.n || m.c) return null;
  m.c = 1;
  S.gems += m.g;
  return m;
}

function bonusReady() {
  return !S.mi.b && missions().every(function (m) { return m.c; });
}

function claimBonus() {
  if (!bonusReady()) return null;
  S.mi.b = 1;
  S.gems += MISS_BONUS.gems;
  S.x2 += MISS_BONUS.x2 * 60;
  return MISS_BONUS;
}

// something waits to be claimed
function missionDue() {
  return bonusReady() || missions().some(function (m) { return m.p >= m.n && !m.c; });
}

function buyX2() {
  if (S.gems < X2_COST) return false;
  S.gems -= X2_COST;
  S.x2 += X2_SECS;
  return true;
}

function warp(free) {
  if (!free && S.gems < WARP_COST) return 0;
  if (!free) S.gems -= WARP_COST;
  var v = Math.min(rate() * WARP_SECS, Math.max(S.run, 100));
  earn(v);
  return v;
}

function save() {
  if (blocked) return;
  S.ts = Math.max(clock(), S.er);
  try {
    localStorage.setItem(KEY, saved());
    if (onSaved) onSaved();
  } catch (e) {
    if (!saveFailed && onSaveFail) {
      onSaveFail();
      saveFailed = true;
    }
  }
}

// the text of a save that is about to be replaced by a new game
function keep(raw) {
  try {
    localStorage.setItem(KEY + '.bak', raw);
  } catch (e) {}
}

function waits(w) {
  var r = {};
  if (w && typeof w === 'object') for (var k in w) if (typeof w[k] === 'number' && w[k] > 0) r[k] = w[k];
  return r;
}

function num(v, d) {
  return isFinite(v) && v >= 0 ? +v : d;
}

// the pieces a level meant before v10
function oldPieces(l) {
  var at = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 12, 14, 16, 18, 20, 25, 50, 100, 200, 300, 400];
  var n = 0;
  while (n < at.length && l >= at[n]) n++;
  return n;
}

// copies what it knows by id; anything unknown is dropped and anything missing starts over
function validate(o) {
  if (!o || typeof o !== 'object' || typeof o.v !== 'number' || o.v < 7 || o.v > SAVE_V || !o.b || typeof o.b !== 'object') return null;
  if (!isFinite(o.cash) || !isFinite(o.ts)) return null;
  var s = fresh();
  s.b = {};
  s.cash = num(o.cash, 0);
  s.gems = Math.floor(num(o.gems, 0));
  s.rep = Math.floor(num(o.rep, 0));
  PERKS.forEach(function (p) {
    if (o.pk && o.pk[p.id] > 0) s.pk[p.id] = Math.min(p.cost.length, Math.floor(num(o.pk[p.id], 0)));
  });
  s.run = num(o.run, 0);
  s.all = Math.max(s.run, num(o.all, 0));
  s.pend = num(o.pend, 0);
  s.ps = num(o.ps, 0);
  s.x2 = num(o.x2, 0);
  s.call = Math.min(CALL.cool, num(o.call, 0));
  s.vt = Math.min(VIP.gap[1], num(o.vt, s.vt));
  s.ask = o.ask ? 1 : 0;
  s.clk = num(o.clk, s.clk) % CLOCK;
  var ip = o.iap || {};
  s.iap = { noads: ip.noads ? 1 : 0, x2: ip.x2 ? 1 : 0, starter: ip.starter === 2 ? 2 : ip.starter ? 1 : 0, offered: ip.offered ? 1 : 0,
    noadsTx: typeof ip.noadsTx === 'string' ? ip.noadsTx : '', x2Tx: typeof ip.x2Tx === 'string' ? ip.x2Tx : '', noadsUser: typeof ip.noadsUser === 'string' ? ip.noadsUser : '', x2User: typeof ip.x2User === 'string' ? ip.x2User : '', noadsAt: num(ip.noadsAt, 0), x2At: num(ip.x2At, 0),
    wait: waits(ip.wait),
    tx: (Array.isArray(ip.tx) ? ip.tx : []).filter(function (t) { return typeof t === 'string'; }).slice(-100),
    rf: (Array.isArray(ip.rf) ? ip.rf : []).filter(function (t) { return typeof t === 'string'; }).slice(-20),
    paid: (Array.isArray(ip.paid) ? ip.paid : []).filter(function (e) { return e && typeof e.tx === 'string'; }).map(function (e) {
      return { tx: e.tx, id: typeof e.id === 'string' ? e.id : '', at: num(e.at, 0), gems: Math.floor(num(e.gems, 0)), x2: num(e.x2, 0), rep: Math.floor(num(e.rep, 0)), deal: num(e.deal, 0), ask: num(e.ask, 0) };
    }).slice(-100),
    deal: ip.deal && typeof ip.deal.id === 'string' && num(ip.deal.bonus, 0) > 0 ? { id: ip.deal.id, bonus: Math.floor(num(ip.deal.bonus, 0)), until: num(ip.deal.until, 0), at: num(ip.deal.at, 0) } : null,
    held: ip.held && typeof ip.held.id === 'string' && num(ip.held.bonus, 0) > 0 ? { id: ip.held.id, bonus: Math.floor(num(ip.held.bonus, 0)), until: num(ip.held.until, 0), at: num(ip.held.at, 0) } : null };
  var cl = o.cl || {};
  var fl = cl.fly;
  s.cl = { base: typeof cl.base === 'string' ? cl.base : '', sig: typeof cl.sig === 'string' ? cl.sig : '',
    bap: num(cl.bap, 0), force: cl.force ? 1 : 0, old: (Array.isArray(cl.old) ? cl.old : []).filter(function (t) { return typeof t === 'string'; }).slice(-8),
    seen: seenMap(cl.seen),
    fly: fl && typeof fl.stamp === 'string' && typeof fl.sig === 'string' ? { stamp: fl.stamp, sig: fl.sig, ap: num(fl.ap, 0), force: fl.force ? 1 : 0 } : null };
  s.er = num(o.er, 0);
  var hd = o.hold || {};
  s.hold = { dev: typeof hd.dev === 'string' ? hd.dev : '', at: num(hd.at, 0) };
  var ad = o.ads || {};
  s.ads = { d: Math.floor(num(ad.d, -1)), n: {}, pt: num(ad.pt, 0), ap: num(ad.ap, 0), li: num(ad.li, 0), sd: num(ad.sd, 0) };
  for (var k in AD_CAP) s.ads.n[k] = Math.min(AD_CAP[k], Math.floor(num(ad.n && ad.n[k], 0)));
  var pl = o.pl && typeof o.pl === 'object' ? o.pl : {};
  PLACES.forEach(function (p) {
    var l = Math.min(p.cost.length, Math.floor(num(pl[p.id], 0)));
    var it = atPlace(p.id, l);
    // v11 keeps the level of each item; the first l pieces are what the older saves had
    var at = o.v >= 11 && o.pi && o.pi[p.id];
    if (Array.isArray(at) && at.length === p.items.length) {
      var had = at.reduce(function (a, c) { return a + Math.floor(num(c, 0)); }, 0);
      it = p.items.map(function (x, j) { return Math.min(x.at.length, Math.floor(num(at[j], 0))); });
      l = it.reduce(function (a, c) { return a + c; }, 0);
      // an item with fewer pieces than it had keeps the pieces in total, spread as a new level would
      if (had > l) {
        l = Math.min(p.cost.length, had);
        it = atPlace(p.id, l);
      }
    }
    s.pl[p.id] = l;
    s.pi[p.id] = it;
  });
  s.ts = o.ts;
  BIZ.forEach(function (z) {
    var e = o.b[z.id];
    if (!e || !(e.l >= 1)) return;
    var l = Math.floor(e.l);
    // before v10 a department went to level 400 and showed 21 pieces on the way; it keeps its share of them
    if (o.v < 10) l = Math.max(1, Math.round(oldPieces(l) * UPS / 21));
    l = Math.min(UPS, l);
    var b = atLevel(z.id, l);
    // v11 keeps the level of each item; the first l pieces are what the older saves had
    if (o.v >= 11 && Array.isArray(e.it) && e.it.length === z.items.length) {
      var it = z.items.map(function (x, j) { return Math.min(x.at.length, Math.floor(num(e.it[j], 0))); });
      var sum = it.reduce(function (a, c) { return a + c; }, 0);
      var all = e.it.reduce(function (a, c) { return a + Math.floor(num(c, 0)); }, 0);
      // an item with fewer pieces than it had keeps the pieces in total, spread as a new level would
      if (all > sum) b = atLevel(z.id, Math.min(UPS, all));
      else if (sum >= 1) b = { l: sum, it: it };
    }
    s.b[z.id] = b;
    s.ms[z.id] = o.v >= 11 && o.ms && z.id in o.ms ? Math.min(STAR_AT.length, Math.floor(num(o.ms[z.id], 0))) : starsAt(b.l);
  });
  if (o.st) {
    s.st.srv = Math.floor(num(o.st.srv, 0));
    s.st.lost = Math.floor(num(o.st.lost, 0));
    s.st.sr = Math.min(s.st.srv, Math.floor(num(o.st.sr, 0)));
    s.st.t = num(o.st.t, 0);
  }
  // before the move a store sale was counted in st.sales
  s.store = Math.min(1000, Math.max(1, Math.floor(num(o.store, 0)) || 1 + Math.floor(num(o.st && o.st.sales, 0))));
  // the goal list was rewritten with the tills, so a v7 save starts it again; a v8 one had no stockroom goals
  if (o.v === 8) v8Goals(o);
  var gn = o.v === 7 ? 3 : Math.min(GOALS.length, Math.floor(num(o.gn, 3)));
  if (o.v === 7) {
    o.goal = [0, 1, 2];
    o.gd = null;
  }
  var seen = {};
  s.goal = (Array.isArray(o.goal) ? o.goal : []).filter(function (i) {
    var ok = i >= 0 && i < gn && !seen[i];
    seen[i] = 1;
    return ok;
  }).slice(0, 3);
  s.gn = gn;
  while (s.goal.length < 3 && s.gn < GOALS.length) s.goal.push(s.gn++);
  if (o.gd) for (var k in o.gd) if (s.goal.indexOf(+k) >= 0) s.gd[k] = 1;
  if (o.day && isFinite(o.day.n) && isFinite(o.day.d)) s.day = { n: Math.floor(o.day.n), d: Math.floor(o.day.d), t: num(o.day.t, 0) };
  if (o.tz && isFinite(o.tz.o) && isFinite(o.tz.at)) s.tz = { o: Math.floor(o.tz.o), at: o.tz.at };
  // a save from before the regulars starts the daily count from the streak it has
  s.rg.days = s.day.n;
  if (o.rg && typeof o.rg === 'object') {
    REGS.forEach(function (r) { if (o.rg.o && o.rg.o[r.id]) s.rg.o[r.id] = 1; });
    s.rg.days = Math.floor(num(o.rg.days, 0));
    s.rg.gifts = Math.floor(num(o.rg.gifts, 0));
    s.rg.combo = Math.floor(num(o.rg.combo, 0));
  }
  if (o.lk && typeof o.lk === 'object') {
    LOOKS.forEach(function (l) { if (o.lk.own && o.lk.own[l.id]) s.lk.own[l.id] = 1; });
    if (typeof o.lk.on === 'string' && LK.hasOwnProperty(o.lk.on)) s.lk.on = o.lk.on;
  }
  if (o.ac && typeof o.ac === 'object') {
    ACHS.forEach(function (a) { if (o.ac.o && o.ac.o[a.id]) s.ac.o[a.id] = 1; });
    for (var m in ACHM) s.ac.m[m] = Math.min(ACHM[m], Math.floor(num(o.ac.m && o.ac.m[m], 0)));
  }
  var mi = o.mi;
  if (mi && isFinite(mi.d) && Array.isArray(mi.m) && mi.m.length === 3) {
    var ms = mi.m.map(function (m) {
      var n = num(m && m.n, 0);
      if (!m || MISS_KINDS.indexOf(m.k) < 0 || !(n > 0)) return null;
      var r = { k: m.k, n: n, p: Math.min(n, num(m.p, 0)), g: Math.floor(num(m.g, 3)), c: m.c ? 1 : 0 };
      if (m.k === 'open' || m.k === 'star') {
        if (!BZ.hasOwnProperty(m.id)) return null;
        r.id = m.id;
      }
      return r;
    });
    if (ms.indexOf(null) < 0) s.mi = { d: Math.floor(mi.d), m: ms, b: mi.b ? 1 : 0 };
  }
  return s;
}

// the mall's shops are gone with the store rebuild, but its stores, gems, boosts and daily streak carry over
function carry(o) {
  if (!o || typeof o !== 'object') return;
  S = fresh();
  S.gems = Math.floor(num(o.gems, 0));
  S.x2 = num(o.x2, 0);
  S.store = 1 + Math.floor(num(o.st && o.st.sales, 0));
  if (o.day && isFinite(o.day.n) && isFinite(o.day.d)) S.day = { n: Math.floor(o.day.n), d: Math.floor(o.day.d), t: 0 };
  save();
}

// returns the away summary when the save is old enough, else null
// the store from before shoppers paid at the tills keeps its departments and places
function load() {
  var back = null;
  try {
    var raw = localStorage.getItem(KEY);
    var old = raw ? null : localStorage.getItem('mainstreet.v10') || localStorage.getItem('mainstreet.v9') || localStorage.getItem('mainstreet.v8') || localStorage.getItem('mainstreet.v7');
    var mall = raw || old ? null : localStorage.getItem('mainstreet.v6');
    OLD_KEYS.forEach(function (k) { localStorage.removeItem(k); });
    if (mall) carry(JSON.parse(mall));
    raw = raw || old || localStorage.getItem(KEY);
    var j = null;
    try {
      j = raw ? JSON.parse(raw) : null;
    } catch (e) {}
    if (j && j.v > SAVE_V) blocked = true;
    var o = j ? validate(j) : null;
    if (raw && !o && !blocked) keep(raw);
    // a new game is made now, so its start comes from the server time
    if (!o && !mall) S = fresh();
    if (o) {
      S = o;
      var edited = cloudSig(o) !== o.cl.sig;
      var sec = (clock() - o.ts) / 1000;
      if (sec > 60) back = away(sec);
      // what the away pay unlocks is not a change of the player's
      if (!edited) S.cl.sig = cloudSig(S);
      if (old) save();
    }
  } catch (e) {}
  return back;
}

function hasSave() {
  try {
    return [KEY].concat(OLD_KEYS.slice(0, 5)).some(function (k) { return localStorage.getItem(k) !== null; });
  } catch (e) {
    return false;
  }
}

// the save another device kept, as the first save of this one: it agrees with the cloud copy it came from. A newer one than
// this build reads is stored as it is, so load() blocks on it and nothing overwrites it
function cloudSeed(raw, stamp) {
  try {
    var j = JSON.parse(raw);
    if (!j || typeof j.v !== 'number') return false;
    if (j.v > SAVE_V) {
      localStorage.setItem(KEY, raw);
      return true;
    }
    var o = validate(j);
    if (!o) return false;
    o.cl = { base: stamp || '', sig: cloudSig(o), bap: o.ads.ap, force: 0, old: [], seen: {}, fly: null };
    localStorage.setItem(KEY, JSON.stringify(o));
    return true;
  } catch (e) {
    return false;
  }
}

// the last stamp judged from each other device, a few devices at most
function seenMap(m) {
  var out = {};
  if (m && typeof m === 'object') Object.keys(m).slice(-8).forEach(function (k) { if (typeof m[k] === 'string') out[k] = m[k]; });
  return out;
}

// refunds of both copies are listed in whichever one is kept
function joinTx(a, b) {
  var seen = {};
  return a.concat(b).filter(function (t) { return seen[t] ? false : (seen[t] = 1); }).slice(-100);
}

// play seconds (time on screen with a touch in the last minute) within which two games count as played equally
var CLOUD_TIE = 45;

// the away summary of the last copy taken, and whether one was taken since the app went to the background
var cloudAway = null;
var cloudTook = false;

// what counts as a change of the player's: income that only piles up cash is none
function cloudSig(o) {
  var rg = o.rg && [o.rg.o, o.rg.days, o.rg.gifts, o.rg.combo];
  var mi = o.mi && [o.mi.b, o.mi.m.map(function (m) { return m.c; })];
  return JSON.stringify([o.gems, o.rep, o.store, o.b, o.pl, o.pi, o.ms, o.goal, o.gn, o.gd, o.lk, o.ac, o.pk, o.iap, o.ads && o.ads.n, rg, mi, o.day && o.day.n]);
}

// a deal that is still open and that the other side's ledger does not show as used up (by that very tap, not by another
// device's purchase of the same pack), the one set on this device first
function openDeal(list, paid) {
  for (var i = 0; i < list.length; i++) {
    var d = list[i];
    if (d && d.until > clock() && !(d.at && paid.some(function (e) { return e.deal === d.at; }))) return d;
  }
  return null;
}

// a refund is "transaction user time". It takes a flag away only when it names the transaction and user the flag holds and is
// later than the grant, so a purchase restored after its refund was seen stays, and a restore under another user is no refund
function refunded(i, f, rf) {
  var key = i[f + 'Tx'] + ' ' + i[f + 'User'] + ' ';
  var at = i[f + 'At'] || 0;
  return rf.some(function (e) { return e.indexOf(key) === 0 && (+e.slice(key.length) || 0) > at; });
}

// two copies of one game meet and k is the one kept; mine says which of the two is this device's. What l bought and k never
// credited is paid to k once, by transaction id; a refund listed by either takes the purchase away; what only grows never
// goes back. A deal or a wait that l still has but k's ledger shows as used is not brought back
function meet(k, l, lMine) {
  var ki = k.iap;
  var li = l.iap;
  var rf = joinTx(ki.rf, li.rf);
  var had = ki.paid.slice();
  // known by id in either list; a ledger that is full has forgotten what it dropped, so an entry older than all it holds was
  // credited long ago (the list is not in time order: meeting a copy appends its older entries at the end)
  var known = {};
  ki.tx.concat(ki.paid.map(function (e) { return e.tx; })).forEach(function (t) { known[t] = 1; });
  var full = ki.paid.length >= 100 ? Math.min.apply(null, ki.paid.map(function (e) { return e.at; })) : 0;
  li.paid.forEach(function (e) {
    if (known[e.tx] || e.at < full) return;
    known[e.tx] = 1;
    k.gems += e.gems;
    k.x2 += e.x2;
    k.rep += e.rep;
    ki.tx.push(e.tx);
    ki.paid.push(e);
  });
  ki.tx = ki.tx.slice(-100);
  ki.paid = ki.paid.slice(-100);
  ki.rf = rf;
  ['noads', 'x2'].forEach(function (f) {
    if (ki[f] && refunded(ki, f, rf)) {
      ki[f] = 0;
      ki[f + 'Tx'] = ki[f + 'User'] = '';
      ki[f + 'At'] = 0;
    }
    if (!ki[f] && li[f] && !refunded(li, f, rf)) {
      ki[f] = 1;
      ki[f + 'Tx'] = li[f + 'Tx'];
      ki[f + 'User'] = li[f + 'User'];
      ki[f + 'At'] = li[f + 'At'];
    }
  });
  ki.starter = Math.max(ki.starter, li.starter);
  ki.offered = ki.offered || li.offered;
  // what k holds is its own to judge; only l's entries can be old news
  var kd = openDeal([ki.deal], []);
  var ld = openDeal([li.deal], had);
  ki.deal = lMine ? ld || kd : kd || ld;
  var kh = openDeal([ki.held], []);
  var lh = openDeal([li.held], had);
  ki.held = lMine ? lh || kh : kh || lh;
  for (var w in li.wait) {
    var gone = had.some(function (e) { return e.id === w && e.ask === li.wait[w]; });
    if (!gone && li.wait[w] > clock()) ki.wait[w] = Math.max(ki.wait[w] || 0, li.wait[w]);
  }
  var a = l.ads;
  var c = k.ads;
  if (c.d === a.d) for (var n in c.n) c.n[n] = Math.max(c.n[n], a.n[n] || 0);
  else if (a.d > c.d) {
    c.d = a.d;
    c.n = a.n;
  }
  c.pt = Math.max(c.pt, a.pt);
  c.ap = Math.max(c.ap, a.ap);
  k.er = Math.max(k.er, l.er);
  // a started starter window is not restarted
  c.sd = c.sd && a.sd ? Math.min(c.sd, a.sd) : c.sd || a.sd;
}

// the game now agrees with the cloud copy under stamp, whose signature and play time are given; the base it leaves is
// remembered, so a read that was slow and comes late is known to be old news
function agree(stamp, sig, ap) {
  var c = S.cl;
  if (c.base && c.base !== stamp) c.old = c.old.concat([c.base]).slice(-8);
  c.base = stamp;
  c.sig = sig;
  c.bap = ap;
  c.force = 0;
}

// the save of another device (written under stamp) meets this game. Each side keeps the stamp of the cloud copy it last
// agreed with, the signature of the game and its play time then. A game that has not changed since takes a copy that can have
// grown from that base (a copy with less play than the base cannot have, a cloud that took a write on an old base is such
// a one); otherwise both sides changed and the one with more play since then is kept, the other's purchases paid to it.
// True when the copy replaced this game. current is true for the copy a refused put brings, which is what the cloud holds now
function takeCloud(raw, stamp, current) {
  var o = null;
  try {
    var j = JSON.parse(raw);
    // a copy from a newer build is left in the cloud; this build stops writing so it cannot be overwritten
    if (j && j.v > SAVE_V) {
      blocked = true;
      return false;
    }
    o = validate(j);
  } catch (e) {}
  if (!o) return false;
  stamp = stamp || '';
  var c = S.cl;
  // written before this game was erased, or by a claim from before it: it cannot bring the erased game back
  if (o.ts < S.er || (o.hold.at < S.er && o.er < S.er)) return false;
  // nothing new: the copy this game agrees with, or one it has agreed with before and moved on from
  if (stamp && (stamp === c.base || (!current && c.old.indexOf(stamp) >= 0))) return false;
  // the copy is this device's own last put, which landed without its answer reaching the game
  if (stamp && c.fly && stamp === c.fly.stamp) {
    agree(stamp, c.fly.sig, c.fly.ap);
    c.fly = null;
    return false;
  }
  // an erase that has not reached the cloud yet is the player's last word: nothing replaces it, and its forced put follows
  if (c.force) return false;
  var theirs = cloudSig(o);
  var their = o.ads.ap;
  // a game erased on the other device is the player's last word there, whatever was played here
  var erasedThere = o.er > S.er;
  var follows = cloudSig(S) === c.sig && (their >= c.bap || erasedThere);
  if (!follows && !erasedThere) {
    var mine = S.ads.ap - c.bap;
    var other = their - c.bap;
    // two devices open at once each get the other's copy after a put and have played about as long; a gap that small is
    // latency, not play, so the device that stays is the one with the larger id on both of them, and nobody flips back
    var gap = mine - other;
    var mid = stamp.split(':')[0];
    var me = typeof devId === 'function' ? devId() : '';
    var tie = Math.abs(gap) <= CLOUD_TIE && mid && me && mid !== me ? me > mid : S.ts >= o.ts;
    if (Math.abs(gap) > CLOUD_TIE ? gap > 0 : tie) {
      meet(S, o, false);
      agree(stamp, theirs, their);
      return false;
    }
  }
  meet(o, S, true);
  var joined = cloudSig(o);
  o.cl = { base: stamp, sig: theirs, bap: their, force: 0, old: c.base && c.base !== stamp ? c.old.concat([c.base]).slice(-8) : c.old, seen: c.seen, fly: null };
  S = o;
  clearShoppers();
  // the copy was saved when the other device last ran: the time since is time away
  var sec = (clock() - o.ts) / 1000;
  cloudAway = sec > 60 ? away(sec) : null;
  if (joined === theirs) S.cl.sig = cloudSig(S);
  cloudTook = true;
  try {
    localStorage.setItem(KEY, saved());
  } catch (e) {}
  return true;
}

// this game was taken over and holds a purchase the other's copy lacks: it becomes the copy's game with this ledger and these
// flags joined in, to be put for the holder to judge. The copy's play stays, or the hand-off would outrank the game it joins.
// False when the copy has it all
function cloudHandOff(raw, stamp) {
  var o = null;
  try {
    var j = JSON.parse(raw);
    if (j && j.v > SAVE_V) return false;
    o = validate(j);
  } catch (e) {}
  if (!o) return false;
  var sig = cloudSig(o);
  var ap = o.ads.ap;
  var had = [o.gems, o.x2, o.rep, o.iap.noads, o.iap.x2].join();
  meet(o, S, true);
  if ([o.gems, o.x2, o.rep, o.iap.noads, o.iap.x2].join() === had) return false;
  o.ads.ap = ap;
  var c = S.cl;
  o.cl = { base: stamp || '', sig: sig, bap: ap, force: 0, old: c.old, seen: c.seen, fly: null };
  S = o;
  clearShoppers();
  try {
    localStorage.setItem(KEY, saved());
  } catch (e) {}
  return true;
}

function saved() {
  var c = S.cash;
  if (FREE !== null) S.cash = FREE;
  var out = JSON.stringify(S);
  S.cash = c;
  return out;
}

function reset() {
  var iap = S.iap;
  var ads = S.ads;
  var cl = S.cl;
  S = fresh();
  S.iap = iap;
  S.ads = ads;
  // stamps from before the erase stay known, so a late read of the erased game's copy is not taken back
  S.cl.old = cl.old.concat(cl.base ? [cl.base] : []).slice(-8);
  S.cl.seen = cl.seen;
  S.er = S.ts = Math.round(clock());
  S.cl.force = 1;
  clearShoppers();
  try {
    localStorage.removeItem(KEY);
  } catch (e) {}
}

function testIncome(hours) {
  earn(rate() * 3600 * hours);
}

// every department and place at its last level
function fillStore() {
  BIZ.forEach(function (z) { S.b[z.id] = atLevel(z.id, ITEMS[z.id].of.length); });
  PLACES.forEach(function (p) {
    S.pi[p.id] = atPlace(p.id, p.of.length);
    S.pl[p.id] = p.of.length;
  });
}
