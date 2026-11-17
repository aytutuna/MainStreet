var KEY = 'mainstreet.v11';
var OLD_KEYS = ['mainstreet.v10', 'mainstreet.v9', 'mainstreet.v8', 'mainstreet.v7', 'mainstreet.v6', 'mainstreet.v5', 'mainstreet.v4', 'mainstreet.v3', 'mainstreet.v2', 'mainstreet.v1', 'mainstreet.won'];
var MAX_AWAY = 8 * 3600;
var START_CASH = 5;
var STAR_BONUS = 0.02;
var STAR_DIV = 1e15;
var HALL_BOOST = 0.1;
var X2_COST = 20;
var X2_SECS = 1800;
var WARP_COST = 50;
var WARP_SECS = 3600;
var DAILY = [
  { cash: 10 }, { gems: 5 }, { x2: 30 }, { cash: 30 }, { gems: 10 }, { cash: 60 }, { gems: 25, x2: 60, cash: 120 }
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
// seconds at the till for one shopper at Checkouts level 0, each level a little faster; GAP is the walk up to it
var LANE_T = 5;
var SELF_T = 8;
var PLANT_T = 3;
var GAP = { lane: 1, self: 2, garden: 1.5 };
var CAP = 4;
var PATIENCE = 6;
var SHOP_T = 30;
var PLANT = 0.3;
// goods are counted by what they sell for. A dolly carries LOAD0 dollars of them at Stockroom level 0 and LOAD times
// that at each level, and a full department holds SHELF loads. A stocker takes SHELVE seconds to put a load out
var SHELF = 6;
var SHELVE = 4;
var LOAD0 = 300;
var LOAD = 100;
// each Staff level cuts the stockers' work in its department to this share
var STAFF = 0.7;

var speed = 1;
var clock = function () { return Date.now(); };
var onShopper = null;
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
  p.items = p.it.map(function (n) { return { name: n, at: [] }; });
  p.rk = [];
  for (var k = 0; k < p.of.length; k++) {
    var e = p.items[+p.of.charAt(k)];
    p.rk.push(e.at.length);
    e.at.push(k);
  }
});
// the departments by how far the stockers walk to them, nearest first
var NEAR = BIZ.slice().sort(function (a, b) { return a.w - b.w; });

var S = fresh();

function fresh() {
  var s = { v: 11, cash: START_CASH, gems: 0, stars: 0, run: 0, all: 0, pend: 0, x2: 0, b: {}, ms: {},
    st: { srv: 0, lost: 0, sales: 0 }, goal: [0, 1, 2], gn: 3, gd: {}, day: { n: 0, d: -1 }, ts: clock() };
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

// numbers: 1.2K, 3.4M, 5.6B, 7.8T, then aa, ab, ...
function short(v) {
  if (!isFinite(v)) return '999zz';
  if (v < 1000) return v < 10 && v !== Math.floor(v) ? String(Math.round(v * 10) / 10) : String(Math.floor(v));
  var i = Math.min(Math.floor(Math.log10(v) / 3), 5 + 26 * 26);
  var x = v / Math.pow(1000, i);
  if (x >= 999.95) {
    x /= 1000;
    i++;
  }
  var tag = i < 5 ? ' KMBT'.charAt(i) : String.fromCharCode(97 + Math.floor((i - 5) / 26)) + String.fromCharCode(97 + (i - 5) % 26);
  return Number(x.toPrecision(3)) + tag;
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
  return (1 + STAR_BONUS * S.stars) * (1 + HALL_BOOST * S.pl.hall);
}

function bmul() {
  return S.x2 > 0 ? 2 : 1;
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

function flow() {
  var p = S.pl;
  return { walk: WALK0 + PER_DEPT * opened() + DRAW * drawLv() + PER_GARDEN * p.garden, car: PER_LOT * p.lot, taxi: PER_TAXI * p.taxi, garden: GARDEN_IN * p.garden };
}

function inRate() {
  var f = flow();
  return f.walk + f.car + f.taxi;
}

function svc(k) {
  var l = S.pl.hall;
  return k === 'lane' ? LANE_T * Math.pow(0.9, l) : k === 'self' ? SELF_T * Math.pow(0.93, l) : PLANT_T;
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

// what one dolly load sells for; the boosts that raise what shoppers spend raise it too
function haul() {
  return LOAD0 * Math.pow(LOAD, S.pl.dock) * gmul();
}

function walkT(id) {
  return BZ[id].w;
}

function trip(id) {
  return 2 * walkT(id) + SHELVE;
}

// stocker seconds a second it takes to keep a department full for n shoppers a second
function need(id, n) {
  return n * spendAt(id) * trip(id) / haul() * Math.pow(STAFF, statLv(id, 'staff'));
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

// what the shoppers pay for at the tills a second while the store runs steady. Stockers keep the departments nearest
// the stock doors full first; past what they can carry the ones further off are empty part of the time
function sold() {
  var n = served();
  var left = crewAt()[0];
  var v = 0;
  NEAR.forEach(function (b) {
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

function cost(id, n) {
  if (lv(id) + n > UPS) return Infinity;
  var b = BZ[id];
  return b.c0 * Math.pow(b.g, lv(id)) * (Math.pow(b.g, n) - 1) / (b.g - 1);
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
  var c = cost(id, 1);
  if (c > S.cash) return null;
  S.cash -= c;
  var b = S.b[id] || (S.b[id] = atLevel(id, 0));
  var was = b.l;
  var piece = nextPiece(id, j);
  b.it[j]++;
  b.l++;
  var res = { id: id, item: j, piece: piece, from: was, to: b.l, unlock: was === 0, star: 0, gems: 0 };
  STAR_AT.forEach(function (a, i) {
    if (was >= a || b.l < a) return;
    res.star = i + 1;
    if ((S.ms[id] || 0) > i) return;
    S.ms[id] = i + 1;
    S.gems += STAR_GEMS[i];
    res.gems += STAR_GEMS[i];
  });
  return res;
}

function placeCost(id) {
  var p = PL[id];
  var l = S.pl[id];
  return l < p.cost.length && has(p.after) ? p.cost[l] : 0;
}

// the piece of a place's next list that item j adds next, or -1 when it has them all
function placePiece(id, j) {
  var e = PL[id].items[j];
  var n = S.pi[id][j];
  return n < e.at.length ? e.at[n] : -1;
}

function buyPlace(id, j) {
  var piece = placePiece(id, j);
  var c = placeCost(id);
  if (piece < 0 || !c || S.cash < c) return null;
  S.cash -= c;
  S.pi[id][j]++;
  S.pl[id]++;
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
    at: null, done: false };
  shoppers.push(c);
  if (onShopper) onShopper('in', c);
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
  var full = SHELF * haul();
  BIZ.forEach(function (b) {
    var id = b.id;
    var sp = spendAt(id);
    if (!sp) return;
    if (fill[id] > 0) {
      v += Math.min(sp, fill[id] * full);
      fill[id] = Math.max(0, fill[id] - sp / full);
    } else outT = 20;
  });
  return v;
}

function pay(c, t) {
  var v = (c.garden ? plant() : c.bk) * bmul();
  earn(v);
  S.st.srv++;
  gone(c);
  if (onShopper) onShopper('paid', c, v, t);
}

function lose(c) {
  S.st.lost++;
  lostT = 20;
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

// the open department nearest the stock doors with room for one more load besides the ones on their way
function pickDept() {
  for (var i = 0; i < NEAR.length; i++) {
    var id = NEAR[i].id;
    if (!has(id)) continue;
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
  crew.forEach(function (w) {
    var left = dt;
    while (left > 0) {
      if (!w.id) {
        w.id = pickDept();
        if (!w.id) return;
        w.t = 0;
        w.out = walkT(w.id);
        w.T = trip(w.id);
      }
      var a = Math.max(w.t, w.out);
      var d = Math.min(left, w.T - w.t);
      w.t += d;
      left -= d;
      var b = Math.min(w.t, w.out + SHELVE);
      if (b > a) fill[w.id] = Math.min(1, fill[w.id] + (b - a) / SHELVE / SHELF * lift(w.id));
      if (w.t >= w.T) w.id = null;
    }
  });
}

function tick(dt) {
  dt *= speed;
  if (S.x2 > 0) S.x2 = Math.max(0, S.x2 - dt);
  lostT -= dt;
  var f = flow();
  for (var k in due) {
    due[k] += f[k] * dt;
    while (due[k] >= 1) {
      due[k]--;
      come(k);
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
}

// time away: the store runs at its steady rate; the pay is held until claimAway
function away(sec) {
  var s = Math.max(0, Math.min(sec, MAX_AWAY));
  var xs = Math.min(s, S.x2);
  var gain = baseRate() * (s + xs);
  var n = Math.floor((served() + gardenServed()) * s);
  S.x2 = Math.max(0, S.x2 - s);
  S.pend += gain;
  S.st.srv += n;
  return { secs: s, gain: gain, n: n };
}

function claimAway() {
  var v = S.pend;
  S.pend = 0;
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
      if (nextPiece(id, j) >= 0) add({ k: 'lv', id: id, item: j, cost: cost(id, 1), gain: levelGain(id, j, r0) });
    });
  });
  PLACES.forEach(function (p) {
    var c = placeCost(p.id);
    if (c) p.items.forEach(function (x, j) {
      if (placePiece(p.id, j) >= 0) add({ k: 'place', id: p.id, item: j, cost: c, gain: placeGain(p.id, j, r0) });
    });
  });
  return out;
}

// what one more level of an item adds to income a second: makes the change, measures the rate and takes it back
function trial(f, r0) {
  if (r0 === undefined) r0 = baseRate();
  f(1);
  var r1 = baseRate();
  f(-1);
  return (r1 - r0) * bmul();
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
function gLv(id, n, gems, x2) {
  return gl(n === 1 ? 'Open the ' + BZ[id].name : BZ[id].name + ' to level ' + n, gems, n, function () { return lv(id); }, x2);
}
function gEarn(n, gems, x2) {
  return gl('Earn $' + short(n) + ' in total', gems, n, function () { return S.all; }, x2);
}
function gServe(n, gems, x2) {
  return gl('Serve ' + n.toLocaleString('en-US') + ' shoppers', gems, n, function () { return S.st.srv; }, x2);
}
function gPl(id, n, t, gems) {
  return gl(t, gems, n, function () { return S.pl[id]; });
}
// a goal added with the stockroom
function nw(g) {
  g.nw = true;
  return g;
}
var GOALS = [
  gServe(10, 3), gLv('produce', 10, 3), gLv('bakery', 1, 4), gPl('hall', 1, 'Open lane 2', 5), nw(gPl('dock', 1, 'Hire a second stocker', 4)),
  gPl('lot', 1, 'Build the Parking', 4),
  gServe(100, 3), gLv('bakery', 10, 4), gEarn(1000, 3), gLv('dairy', 1, 5), gLv('produce', 20, 5, 15), gLv('meat', 1, 6),
  gEarn(1e5, 5), gLv('bakery', 20, 6), gServe(500, 5), gLv('frozen', 1, 8), gLv('dairy', 20, 8, 30), gPl('taxi', 1, 'Open the Taxi Stand', 8),
  gPl('hall', 3, 'Put in self checkouts', 10), nw(gPl('dock', 3, 'Stockroom to level 3', 10)), gEarn(1e7, 8), gLv('pantry', 1, 10), gLv('produce', 30, 12), gLv('snacks', 1, 10),
  gPl('lot', 3, 'Parking to level 3', 10), gLv('toys', 1, 12), gServe(2000, 10), gEarn(1e9, 10, 30), gLv('tech', 1, 15),
  gPl('hall', 5, 'Open lane 3', 15), gLv('kitchen', 1, 20), gEarn(1e11, 15), gLv('kitchen', 20, 15, 30), gLv('toys', 25, 15),
  gl('Sell the store', 30, 1, function () { return S.st.sales; }), gServe(10000, 20), gEarn(1e13, 20, 60), gLv('clothes', 1, 25),
  gPl('garden', 1, 'Open the Garden Center', 25), gLv('home', 1, 30), gLv('office', 1, 30), gPl('hall', 10, 'Checkouts to level 10', 30),
  nw(gPl('dock', 10, 'Stockroom to level 10', 30)),
  gLv('pets', 1, 35), gEarn(1e15, 25), gLv('sports', 1, 35), gServe(50000, 30), gLv('tools', 1, 40), gLv('auto', 1, 40),
  gl('Earn 100 Store stars', 40, 100, function () { return S.stars; }), gLv('seasonal', 1, 50), gEarn(1e21, 30)
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
    return { i: i, t: g.t, n: g.n, v: v, done: v >= g.n || !!S.gd[i], gems: g.g, x2: g.x2 };
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

function stars() {
  return Math.floor(Math.sqrt(S.run / STAR_DIV));
}

function sell() {
  var n = stars();
  if (n < 1) return 0;
  claimAway();
  S.stars += n;
  S.st.sales++;
  S.cash = START_CASH;
  S.run = 0;
  noPlaces(S);
  S.b = { produce: atLevel('produce', 1) };
  clearShoppers();
  return n;
}

function dayNum(ms) {
  var d = new Date(ms);
  return Math.floor((ms - d.getTimezoneOffset() * 60000) / 86400000);
}

// the streak goes on when the last claim was yesterday, and starts again after a missed day
function daily() {
  var today = dayNum(clock());
  var d = S.day;
  return { can: d.d !== today, idx: d.d === today - 1 || d.d === today ? d.n % 7 : 0 };
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
  S.day = { n: info.idx + 1, d: dayNum(clock()) };
  r.idx = info.idx;
  return r;
}

function buyX2() {
  if (S.gems < X2_COST) return false;
  S.gems -= X2_COST;
  S.x2 += X2_SECS;
  return true;
}

function warp() {
  if (S.gems < WARP_COST) return 0;
  S.gems -= WARP_COST;
  var v = Math.min(rate() * WARP_SECS, Math.max(S.run, 100));
  earn(v);
  return v;
}

function save() {
  S.ts = clock();
  try {
    localStorage.setItem(KEY, saved());
  } catch (e) {}
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
  if (!o || typeof o !== 'object' || typeof o.v !== 'number' || o.v < 7 || o.v > 11 || !o.b || typeof o.b !== 'object') return null;
  if (!isFinite(o.cash) || !isFinite(o.ts)) return null;
  var s = fresh();
  s.b = {};
  s.cash = num(o.cash, 0);
  s.gems = Math.floor(num(o.gems, 0));
  s.stars = Math.floor(num(o.stars, 0));
  s.run = num(o.run, 0);
  s.all = Math.max(s.run, num(o.all, 0));
  s.pend = num(o.pend, 0);
  s.x2 = num(o.x2, 0);
  var pl = o.pl && typeof o.pl === 'object' ? o.pl : {};
  PLACES.forEach(function (p) {
    var l = Math.min(p.cost.length, Math.floor(num(pl[p.id], 0)));
    var it = atPlace(p.id, l);
    // v11 keeps the level of each item; the first l pieces are what the older saves had
    var at = o.v >= 11 && o.pi && o.pi[p.id];
    if (Array.isArray(at) && at.length === p.items.length) {
      it = p.items.map(function (x, j) { return Math.min(x.at.length, Math.floor(num(at[j], 0))); });
      l = it.reduce(function (a, c) { return a + c; }, 0);
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
      if (sum >= 1) b = { l: sum, it: it };
    }
    s.b[z.id] = b;
    s.ms[z.id] = o.v >= 11 && o.ms ? Math.min(STAR_AT.length, Math.floor(num(o.ms[z.id], 0))) : starsAt(b.l);
  });
  if (o.st) {
    s.st.srv = Math.floor(num(o.st.srv, 0));
    s.st.lost = Math.floor(num(o.st.lost, 0));
    s.st.sales = Math.floor(num(o.st.sales, 0));
  }
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
  if (o.day && isFinite(o.day.n) && isFinite(o.day.d)) s.day = { n: Math.floor(o.day.n), d: Math.floor(o.day.d) };
  return s;
}

// the mall's shops are gone with the store rebuild, but its stars, gems, boosts and daily streak carry over
function carry(o) {
  if (!o || typeof o !== 'object') return;
  S = fresh();
  S.stars = Math.floor(num(o.stars, 0));
  S.gems = Math.floor(num(o.gems, 0));
  S.x2 = num(o.x2, 0);
  if (o.st) S.st.sales = Math.floor(num(o.st.sales, 0));
  if (o.day && isFinite(o.day.n) && isFinite(o.day.d)) S.day = { n: Math.floor(o.day.n), d: Math.floor(o.day.d) };
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
    var o = raw ? validate(JSON.parse(raw)) : null;
    if (o) {
      S = o;
      var sec = (clock() - o.ts) / 1000;
      if (sec > 60) back = away(sec);
      if (old) save();
    }
  } catch (e) {}
  return back;
}

function saved() {
  var c = S.cash;
  if (FREE !== null) S.cash = FREE;
  var out = JSON.stringify(S);
  S.cash = c;
  return out;
}

function exportCode() {
  return btoa(saved());
}

function importCode(code) {
  try {
    var o = validate(JSON.parse(atob(code.trim())));
    if (!o) return false;
    S = o;
    S.ts = clock();
    clearShoppers();
    save();
    return true;
  } catch (e) {
    return false;
  }
}

function reset() {
  S = fresh();
  clearShoppers();
  try {
    localStorage.removeItem(KEY);
  } catch (e) {}
}

function testIncome(hours) {
  earn(rate() * 3600 * hours);
}
