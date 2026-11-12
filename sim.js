var free = true; // TODO: unlimited money while testing, set to false before release

var KEY = 'mainstreet.v4';
var OLD_KEYS = ['mainstreet.v3', 'mainstreet.v2', 'mainstreet.v1', 'mainstreet.won'];
var MAX_AWAY = 8 * 3600;
var START_CASH = 60;
var BASE = 1;

var STEPS = [];
var PROJ = {};
PROJECTS.forEach(function (p) {
  p.first = STEPS.length;
  p.steps.forEach(function (s, i) {
    STEPS.push({ p: p.id, i: i, name: s[0], cost: s[1], inc: s[2] });
  });
  p.end = STEPS.length;
  PROJ[p.id] = p;
});

var S = fresh();

function fresh() {
  return { v: 4, cash: START_CASH, k: 0, ts: Date.now(), snd: 1 };
}

// steps bought in a project
function got(id) {
  var p = PROJ[id];
  return Math.max(0, Math.min(S.k, p.end) - p.first);
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

function rate() {
  var r = BASE;
  PROJECTS.forEach(function (p) {
    var sum = 0;
    for (var i = p.first; i < Math.min(S.k, p.end); i++) sum += STEPS[i].inc;
    r += sum * (done(p.id) ? 2 : 1);
  });
  return r;
}

function upNext() {
  return S.k < STEPS.length ? STEPS[S.k] : null;
}

function canBuy() {
  var n = upNext();
  return !!n && (free || S.cash >= n.cost);
}

// seconds until the next step is affordable
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
  S.k++;
  var fin = done(n.p);
  return { step: n, fin: fin, end: S.k >= STEPS.length };
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
  if (!o || typeof o !== 'object' || o.v !== 4) return null;
  if (!isFinite(o.cash) || !isFinite(o.k) || !isFinite(o.ts)) return null;
  var k = Math.floor(o.k);
  if (k < 0 || k > STEPS.length) return null;
  return { v: 4, cash: Math.max(0, o.cash), k: k, ts: o.ts, snd: o.snd === 0 ? 0 : 1 };
}

// loads the save and returns the away summary, or null
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
