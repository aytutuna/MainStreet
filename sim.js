var free = true; // TODO: unlimited money while testing, set to false before release

var KEY = 'mainstreet.v4';
var OLD_KEYS = ['mainstreet.v3', 'mainstreet.v2', 'mainstreet.v1', 'mainstreet.won'];
var MAX_AWAY = 8 * 3600;
var START_CASH = 60;
var BASE = 1;

var PROJ = {};
PROJECTS.forEach(function (p) {
  PROJ[p.id] = p;
});

var S = fresh();

function fresh() {
  return { v: 4, cash: START_CASH, n: {}, ts: Date.now() };
}

function got(id) {
  return Math.min(S.n[id] || 0, PROJ[id].steps.length);
}

function total(id) {
  return PROJ[id].steps.length;
}

function done(id) {
  return got(id) >= total(id);
}

// the school counts as 0 until its first room starts, then 1 plus the rooms finished
function counter(key) {
  if (key !== 'sch') return got(key);
  if (!got('class1')) return 0;
  var f = 1;
  PROJECTS.forEach(function (p) {
    if (p.room && done(p.id)) f++;
  });
  return f;
}

function projectInc(p) {
  var sum = 0;
  for (var i = 0; i < got(p.id); i++) sum += p.steps[i][2];
  return sum * (done(p.id) ? 2 : 1);
}

function rate() {
  var r = BASE;
  PROJECTS.forEach(function (p) { r += projectInc(p); });
  return r;
}

function upNext() {
  for (var i = 0; i < PROJECTS.length; i++) {
    var p = PROJECTS[i];
    var n = got(p.id);
    if (n < p.steps.length) {
      var s = p.steps[n];
      return { p: p.id, i: n, name: s[0], cost: s[1], inc: s[2] };
    }
  }
  return null;
}

function canBuy() {
  var n = upNext();
  return !!n && (free || S.cash >= n.cost);
}

function waitFor() {
  var n = upNext();
  if (!n || free || S.cash >= n.cost) return 0;
  return (n.cost - S.cash) / rate();
}

// returns the step bought, with whether it finished its project and the whole town
function buy() {
  var n = upNext();
  if (!n || !canBuy()) return null;
  if (!free) S.cash -= n.cost;
  S.n[n.p] = got(n.p) + 1;
  return { step: n, fin: done(n.p), end: !upNext() };
}

function tick(dt) {
  S.cash += rate() * dt;
}

function coin() {
  return Math.max(5, Math.round(rate() * 8));
}

function collect() {
  var v = coin();
  S.cash += v;
  return v;
}

function away(sec) {
  var s = Math.max(0, Math.min(sec, MAX_AWAY));
  var gain = rate() * s;
  S.cash += gain;
  return { secs: s, gain: gain };
}

function save() {
  S.ts = Date.now();
  try {
    localStorage.setItem(KEY, JSON.stringify(S));
  } catch (e) {}
}

function validate(o) {
  if (!o || typeof o !== 'object' || o.v !== 4 || !o.n || typeof o.n !== 'object') return null;
  if (!isFinite(o.cash) || !isFinite(o.ts)) return null;
  var n = {};
  PROJECTS.forEach(function (p) {
    var v = Math.floor(o.n[p.id]);
    if (v > 0) n[p.id] = Math.min(v, p.steps.length);
  });
  return { v: 4, cash: Math.max(0, o.cash), n: n, ts: o.ts };
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
      var sec = (Date.now() - o.ts) / 1000;
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
    S.ts = Date.now();
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
