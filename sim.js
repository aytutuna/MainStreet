var KEY = 'mainstreet.v5';
var OLD_KEYS = ['mainstreet.v4', 'mainstreet.v3', 'mainstreet.v2', 'mainstreet.v1', 'mainstreet.won'];
var MAX_AWAY = 8 * 3600;
var START_CASH = 5;
var STAR_BONUS = 0.02;
var STAR_DIV = 1e15;
var MGR_WEIGHT = 0.5;
var X2_COST = 20;
var X2_SECS = 1800;
var WARP_COST = 50;
var WARP_SECS = 3600;
var DAILY = [
  { cash: 10 }, { gems: 5 }, { x2: 30 }, { cash: 30 }, { gems: 10 }, { cash: 60 }, { gems: 25, x2: 60, cash: 120 }
];

var speed = 1;
var clock = function () { return Date.now(); };
var onPay = null;
var BZ = {};
BIZ.forEach(function (b, i) {
  b.i = i;
  BZ[b.id] = b;
});

var S = fresh();

function fresh() {
  var s = { v: 5, cash: START_CASH, gems: 0, stars: 0, run: 0, all: 0, pend: 0, park: 0, x2: 0, b: {}, ms: {},
    st: { col: 0, sales: 0 }, goal: [0, 1, 2], gn: 3, gd: {}, day: { n: 0, d: -1 }, ts: clock() };
  s.b.homes = { l: 1, m: 0, t: 0, w: 0 };
  return s;
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

function managed(id) {
  return !!S.b[id] && !!S.b[id].m;
}

// a business can be bought once the one before it in the list is owned
function avail(id) {
  var i = BZ[id].i;
  return has(id) || i === 0 || has(BIZ[i - 1].id);
}

function msAt(l) {
  var mul = 1;
  var spd = 0;
  for (var i = 0; i < MS.length && l >= MS[i][0]; i++) {
    mul *= MS[i][1];
    spd += MS[i][2];
  }
  return { mul: mul, spd: spd };
}

function nextMs(l) {
  for (var i = 0; i < MS.length; i++) if (l < MS[i][0]) return { i: i, lv: MS[i][0], mul: MS[i][1], spd: MS[i][2] };
  return null;
}

function gmul() {
  return (1 + STAR_BONUS * S.stars) * (1 + PARK.boost * S.park);
}

function bmul() {
  return S.x2 > 0 ? 2 : 1;
}

function cycleAt(id, l) {
  return BZ[id].cy / Math.pow(2, msAt(l).spd);
}

function revAt(id, l) {
  return BZ[id].r * l * msAt(l).mul * gmul();
}

function cycle(id) {
  return cycleAt(id, lv(id));
}

function rev(id) {
  return revAt(id, lv(id)) * bmul();
}

function perSec(id, l) {
  return l > 0 ? revAt(id, l) / cycleAt(id, l) : 0;
}

function rate() {
  var r = 0;
  BIZ.forEach(function (b) { r += perSec(b.id, lv(b.id)); });
  return r * bmul();
}

function autoRate() {
  var r = 0;
  BIZ.forEach(function (b) {
    if (managed(b.id)) r += perSec(b.id, lv(b.id));
  });
  return r * bmul();
}

function cost(id, n) {
  var b = BZ[id];
  return b.c0 * Math.pow(b.g, lv(id)) * (Math.pow(b.g, n) - 1) / (b.g - 1);
}

function maxBuy(id) {
  var b = BZ[id];
  var u = b.c0 * Math.pow(b.g, lv(id));
  var n = Math.floor(Math.log(1 + S.cash * (b.g - 1) / u) / Math.log(b.g) + 1e-9);
  while (n > 0 && cost(id, n) > S.cash) n--;
  return Math.max(0, n);
}

// what the view of a business shows: how many of its levels of detail are reached
function shape(id) {
  var v = VIEW[id];
  var at = v ? (v.lv || v) : STAGE;
  var l = id === 'park' ? S.park : lv(v && v.of ? v.of : id);
  var n = 0;
  for (var i = 0; i < at.length; i++) if (l >= at[i]) n++;
  return n;
}

function earn(v) {
  S.cash += v;
  S.run += v;
  S.all += v;
}

// returns what changed: unlock, milestones crossed and their gems, whether the building changes
function buy(id, n) {
  n = n || 1;
  if (!avail(id) || n < 1) return null;
  var c = cost(id, n);
  if (c > S.cash) return null;
  S.cash -= c;
  var b = S.b[id] || (S.b[id] = { l: 0, m: 0, t: 0, w: 0 });
  var was = b.l;
  var stage = shape(id);
  b.l += n;
  var res = { id: id, n: n, from: was, to: b.l, unlock: was === 0, ms: [], gems: 0, stage: shape(id) !== stage };
  for (var i = S.ms[id] || 0; i < MS.length; i++) {
    if (b.l < MS[i][0]) break;
    S.gems += MS_GEMS[i];
    res.gems += MS_GEMS[i];
    S.ms[id] = i + 1;
  }
  for (var j = 0; j < MS.length; j++) {
    if (was < MS[j][0] && b.l >= MS[j][0]) res.ms.push({ lv: MS[j][0], mul: MS[j][1], spd: MS[j][2] });
  }
  return res;
}

function hire(id) {
  var b = S.b[id];
  if (!b || b.m || S.cash < BZ[id].m) return false;
  S.cash -= BZ[id].m;
  b.m = 1;
  if (b.w) collect(id);
  return true;
}

function parkCost() {
  return S.park < PARK.cost.length && has(PARK.after) ? PARK.cost[S.park] : 0;
}

function buyPark() {
  var c = parkCost();
  if (!c || S.cash < c) return false;
  S.cash -= c;
  S.park++;
  return true;
}

function collect(id) {
  var b = S.b[id];
  if (!b || !b.w) return 0;
  var v = b.w;
  b.w = 0;
  b.t = 0;
  S.st.col++;
  earn(v);
  return v;
}

function tick(dt) {
  dt *= speed;
  var bm = bmul();
  if (S.x2 > 0) S.x2 = Math.max(0, S.x2 - dt);
  for (var i = 0; i < BIZ.length; i++) {
    var id = BIZ[i].id;
    var b = S.b[id];
    if (!b || b.w) continue;
    var cy = cycleAt(id, b.l);
    b.t += dt;
    if (b.t < cy) continue;
    if (b.m) {
      var n = Math.floor(b.t / cy);
      b.t -= n * cy;
      var v = n * revAt(id, b.l) * bm;
      earn(v);
      if (onPay) onPay(id, v);
    } else {
      b.w = revAt(id, b.l) * bm;
      b.t = 0;
    }
  }
}

// time away: managed businesses pay, the others are left with cash waiting. The pay is held until claimAway
function away(sec) {
  var s = Math.max(0, Math.min(sec, MAX_AWAY));
  var xs = Math.min(s, S.x2);
  var gain = 0;
  var ready = 0;
  BIZ.forEach(function (z) {
    var b = S.b[z.id];
    if (!b) return;
    if (b.m) gain += perSec(z.id, b.l) * (s + xs);
    else if (!b.w) {
      b.t += s;
      if (b.t >= cycleAt(z.id, b.l)) {
        b.w = revAt(z.id, b.l) * (xs >= s ? 2 : 1);
        b.t = 0;
        ready++;
      }
    }
  });
  S.x2 = Math.max(0, S.x2 - s);
  S.pend += gain;
  return { secs: s, gain: gain, ready: ready };
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
  var r = Math.max(rate(), 1e-9);
  function add(o) {
    o.wait = Math.max(0, o.cost - S.cash) / r;
    o.T = o.wait + o.cost / Math.max(o.gain, 1e-12);
    out.push(o);
  }
  BIZ.forEach(function (z) {
    var id = z.id;
    var l = lv(id);
    if (!avail(id)) return;
    var now = perSec(id, l) * bmul();
    add({ k: 'lv', id: id, n: 1, cost: cost(id, 1), gain: perSec(id, l + 1) * bmul() - now });
    var m = nextMs(l);
    if (m && m.lv - l > 1 && l > 0) add({ k: 'lv', id: id, n: m.lv - l, cost: cost(id, m.lv - l), gain: perSec(id, m.lv) * bmul() - now, ms: m.lv });
    if (l > 0 && !managed(id)) add({ k: 'mgr', id: id, n: 1, cost: z.m, gain: now * MGR_WEIGHT });
  });
  var pc = parkCost();
  if (pc) add({ k: 'park', id: 'park', n: 1, cost: pc, gain: r * PARK.boost / (1 + PARK.boost * S.park) });
  return out;
}

function best() {
  var b = null;
  options().forEach(function (o) {
    if (!b || o.T < b.T) b = o;
  });
  return b;
}

function doOption(o) {
  if (o.k === 'lv') return buy(o.id, o.n);
  if (o.k === 'mgr') return hire(o.id) ? { id: o.id, mgr: true } : null;
  return buyPark() ? { id: 'park', park: true } : null;
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
  return gl(n === 1 ? 'Unlock the ' + BZ[id].name : BZ[id].name + ' to level ' + n, gems, n, function () { return lv(id); }, x2);
}
function gEarn(n, gems, x2) {
  return gl('Earn $' + short(n) + ' in total', gems, n, function () { return S.all; }, x2);
}
function gMgr(n, gems) {
  return gl('Hire ' + n + (n === 1 ? ' manager' : ' managers'), gems, n, function () {
    var c = 0;
    BIZ.forEach(function (b) { if (managed(b.id)) c++; });
    return c;
  });
}
function gCol(n, gems) {
  return gl('Collect cash ' + n + ' times', gems, n, function () { return S.st.col; });
}
var GOALS = [
  gCol(5, 3), gLv('homes', 10, 3), gLv('bakery', 1, 4), gMgr(1, 5), gCol(25, 3), gLv('bakery', 10, 4), gEarn(1000, 3),
  gLv('cafe', 1, 5), gLv('homes', 25, 5, 15), gMgr(3, 8), gEarn(1e5, 5), gLv('grocery', 1, 6), gLv('bakery', 25, 6),
  gCol(100, 5), gLv('icecream', 1, 8), gLv('cafe', 25, 8, 30), gMgr(5, 10), gEarn(1e7, 8), gLv('flower', 1, 10),
  gl('Open the Park', 10, 1, function () { return S.park; }), gLv('homes', 100, 12), gLv('books', 1, 10), gLv('toys', 1, 12),
  gEarn(1e9, 10, 30), gMgr(8, 15), gLv('restaurant', 1, 15), gLv('school', 1, 20), gEarn(1e11, 15),
  gl('Upgrade the Park to level 3', 12, 3, function () { return S.park; }), gLv('school', 25, 15, 30), gLv('class', 1, 15),
  gLv('lib', 1, 15), gLv('cafeteria', 1, 15), gLv('yard', 1, 20), gLv('hosp', 1, 25),
  gl('Sell the town', 30, 1, function () { return S.st.sales; }), gEarn(1e15, 20, 60), gMgr(15, 25),
  gEarn(1e18, 25), gl('Earn 100 Town stars', 40, 100, function () { return S.stars; }), gEarn(1e21, 30)
];

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
  S.park = 0;
  S.b = { homes: { l: 1, m: 0, t: 0, w: 0 } };
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
  return { gems: d.gems || 0, x2: d.x2 || 0, cash: d.cash ? Math.max(25, autoRate() * d.cash * 60) : 0 };
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
    localStorage.setItem(KEY, JSON.stringify(S));
  } catch (e) {}
}

function num(v, d) {
  return isFinite(v) && v >= 0 ? +v : d;
}

// copies what it knows by id; anything unknown is dropped and anything missing starts over
function validate(o) {
  if (!o || typeof o !== 'object' || o.v !== 5 || !o.b || typeof o.b !== 'object') return null;
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
  s.park = Math.min(PARK.cost.length, Math.floor(num(o.park, 0)));
  s.ts = o.ts;
  BIZ.forEach(function (z) {
    var e = o.b[z.id];
    if (!e || !(e.l >= 1)) return;
    s.b[z.id] = { l: Math.floor(e.l), m: e.m ? 1 : 0, t: num(e.t, 0), w: num(e.w, 0) };
  });
  BIZ.forEach(function (z) {
    var m = o.ms && o.ms[z.id];
    if (m >= 1) s.ms[z.id] = Math.min(MS.length, Math.floor(m));
  });
  if (o.st) {
    s.st.col = Math.floor(num(o.st.col, 0));
    s.st.sales = Math.floor(num(o.st.sales, 0));
  }
  var gn = Math.min(GOALS.length, Math.floor(num(o.gn, 3)));
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

// returns the away summary when the save is old enough, else null
function load() {
  var gone = null;
  try {
    OLD_KEYS.forEach(function (k) { localStorage.removeItem(k); });
    var raw = localStorage.getItem(KEY);
    var o = raw ? validate(JSON.parse(raw)) : null;
    if (o) {
      S = o;
      var sec = (clock() - o.ts) / 1000;
      if (sec > 60) gone = away(sec);
    }
  } catch (e) {}
  return gone;
}

function exportCode() {
  return btoa(JSON.stringify(S));
}

function importCode(code) {
  try {
    var o = validate(JSON.parse(atob(code.trim())));
    if (!o) return false;
    S = o;
    S.ts = clock();
    save();
    return true;
  } catch (e) {
    return false;
  }
}

function reset() {
  S = fresh();
  try {
    localStorage.removeItem(KEY);
  } catch (e) {}
}

function testIncome(hours) {
  earn(rate() * 3600 * hours);
}
