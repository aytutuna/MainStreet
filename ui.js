var SND_KEY = 'mainstreet.snd';
var SND = {
  buy: ['triangle', 0.07, 0.16, [523, 784]],
  coin: ['square', 0.05, 0.1, [880, 1175]],
  till: ['sine', 0.05, 0.12, [1568, 2093]],
  done: ['triangle', 0.1, 0.25, [523, 659, 784, 1047]],
  mile: ['triangle', 0.08, 0.22, [523, 659, 784, 1047, 1319, 1568]],
  unlock: ['triangle', 0.09, 0.2, [392, 523, 659, 784]],
  tap: ['sine', 0.04, 0.05, [1000]],
  stock: ['sine', 0.06, 0.1, [196]]
};
var VOL = { till: 0.3, stock: 0.4, tap: 0.5, buy: 0.6, done: 0.6, unlock: 0.6, mile: 0.6 };
var BUZZ_KEY = 'mainstreet.buzz';
var buf = {};
var out = null;
var ac = null;
var snd = true;
var vib = true;
var cardId = null;
var cardRow = null;
var cardSel = -1;
var lastTick = 0;
var shown = {};
var insets = [0, 0];
var rows = {};
var bestOpt = null;
var gains = {};
var bestAt = 0;
var sheetOpen = false;
var bq = [];
var bqBusy = false;
var testTaps = 0;
var FREE_KEY = 'mainstreet.free';
var free = false;
var chips = [];
var HINT_KEY = 'mainstreet.hints';
var hinted = {};
var dailyAsked = -1;

function $(id) {
  return document.getElementById(id);
}

function money(v) {
  return '$' + short(v);
}

function wake() {
  if (!snd) return;
  if (navigator.audioSession) navigator.audioSession.type = 'ambient';
  if (!ac && window.AudioContext) {
    ac = new AudioContext();
    out = ac.createGain();
    out.connect(ac.destination);
    Object.keys(VOL).forEach(loadSound);
  }
  if (ac && ac.state !== 'running') ac.resume();
}

function loadSound(name) {
  var req = new XMLHttpRequest();
  req.open('GET', 'assets/sounds/' + name + '.wav');
  req.responseType = 'arraybuffer';
  req.onload = function () {
    if (req.status !== 200) return;
    ac.decodeAudioData(req.response, function (b) { buf[name] = b; }, function () {});
  };
  req.send();
}

function sfx(name) {
  if (!ac || !snd || document.hidden || ac.state !== 'running') return;
  if (buf[name]) {
    var s = ac.createBufferSource();
    var v = ac.createGain();
    v.gain.value = VOL[name];
    s.buffer = buf[name];
    s.connect(v);
    v.connect(out);
    s.start();
    return;
  }
  var t = ac.currentTime;
  var c = SND[name];
  c[3].forEach(function (f, i) {
    var at = t + i * c[1];
    var o = ac.createOscillator();
    var g = ac.createGain();
    o.type = c[0];
    o.frequency.value = f;
    g.gain.setValueAtTime(0.0001, at);
    g.gain.linearRampToValueAtTime(0.05, at + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, at + c[2]);
    o.connect(g);
    g.connect(ac.destination);
    o.start(at);
    o.stop(at + c[2] + 0.02);
  });
}

function buzz(kind) {
  if (!vib) return;
  kind = kind || 'light';
  if (navigator.vibrate) navigator.vibrate(kind === 'success' ? [12, 40, 12] : kind === 'medium' ? 20 : 10);
  else if (window.webkit && window.webkit.messageHandlers && window.webkit.messageHandlers.buzz) {
    window.webkit.messageHandlers.buzz.postMessage(kind);
  }
}

function clock2(v) {
  var m = Math.floor(v / 60);
  var s = Math.floor(v % 60);
  return m + ':' + (s < 10 ? '0' : '') + s;
}

function fitInsets() {
  var top = $('meters').getBoundingClientRect().bottom + 6;
  var bot = innerHeight - (sheetOpen ? $('sheet').getBoundingClientRect().top : $('bottom').getBoundingClientRect().top) + 6;
  if (cardId && !sheetOpen) bot += 25;
  if (top !== insets[0] || bot !== insets[1]) {
    insets = [top, bot];
    View.inset(top, bot);
  }
}

// writes to the page only when a value changed; c is the cache of one element or one group
function set(c, key, el, prop, value) {
  if (c[key] === value) return false;
  c[key] = value;
  el[prop] = value;
  return true;
}

function flag(c, key, el, name, on) {
  on = !!on;
  if (c[key] === on) return;
  c[key] = on;
  el.classList.toggle(name, on);
}

function popAt(text, x, y, cls) {
  var d = document.createElement('div');
  d.className = 'pop ' + (cls || '');
  d.textContent = text;
  $('fly').appendChild(d);
  // the text grows by about 15% while it pops
  var half = d.offsetWidth * 0.58 + 4;
  d.style.left = Math.max(half, Math.min($('fly').clientWidth - half, x)) + 'px';
  d.style.top = Math.max(70, y) + 'px';
  var keys = [{ transform: 'translate(-50%, 0) scale(0.6)', opacity: 0 }, { transform: 'translate(-50%, -14px) scale(1.15)', opacity: 1, offset: 0.2 },
    { transform: 'translate(-50%, -52px) scale(1)', opacity: 0 }];
  // a buy's pill stays readable longer and rises less
  if (cls === 'item') keys = [{ transform: 'translate(-50%, 0) scale(0.7)', opacity: 0 }, { transform: 'translate(-50%, -8px) scale(1.08)', opacity: 1, offset: 0.15 },
    { transform: 'translate(-50%, -20px) scale(1)', opacity: 1, offset: 0.75 }, { transform: 'translate(-50%, -30px) scale(1)', opacity: 0 }];
  var a = d.animate(keys, { duration: cls === 'item' ? 1800 : 1100, easing: 'ease-out' });
  a.onfinish = function () { d.remove(); };
}

function flyIcons(src, x, y, n, targetId) {
  var ar = $('app').getBoundingClientRect();
  var to = $(targetId).getBoundingClientRect();
  var tx = to.left - ar.left + 26;
  var ty = to.top - ar.top + to.height / 2;
  for (var i = 0; i < n; i++) {
    var d = document.createElement('img');
    d.src = src;
    d.className = 'fc';
    d.style.left = x - 10 + 'px';
    d.style.top = y - 10 + 'px';
    $('fly').appendChild(d);
    var sx = (Math.random() - 0.5) * 50;
    var a = d.animate([{ transform: 'translate(0, 0) scale(1)', opacity: 1 }, { transform: 'translate(' + sx + 'px, -24px) scale(1.2)', opacity: 1, offset: 0.25 },
      { transform: 'translate(' + (tx - x + 10) + 'px, ' + (ty - y + 10) + 'px) scale(0.6)', opacity: 0.4 }],
    { duration: 650 + i * 40, delay: i * 45, easing: 'cubic-bezier(.4,0,.7,.7)', fill: 'backwards' });
    a.onfinish = function (e) { e.target.effect.target.remove(); };
  }
  setTimeout(function () { bumpEl(targetId === 'gems' ? 'gem-n' : 'cash-n'); }, 560);
}

function flyCoins(x, y, n) {
  flyIcons('assets/coin.png', x, y, n, 'cash');
}

function flyGems(x, y, n) {
  flyIcons('assets/ui_gem.png', x, y, n, 'gems');
}

function bumpEl(id) {
  var e = $(id);
  e.classList.remove('bump');
  void e.offsetWidth;
  e.classList.add('bump');
}

function centerOf(el) {
  var r = el.getBoundingClientRect();
  var a = $('app').getBoundingClientRect();
  return { x: r.left - a.left + r.width / 2, y: r.top - a.top + r.height / 2 };
}

// milestone and unlock banners wait for each other and for the camera
function banner(html, delay, big) {
  if (bq.length > 2) bq.shift();
  bq.push({ h: html, d: delay || 0, big: big });
  if (!bqBusy) nextBanner();
}

function nextBanner() {
  var q = bq.shift();
  if (!q) {
    bqBusy = false;
    return;
  }
  bqBusy = true;
  setTimeout(function () {
    var b = $('banner');
    b.innerHTML = q.h;
    b.hidden = false;
    b.style.animation = 'none';
    void b.offsetWidth;
    b.style.animation = '';
    if (q.big) View.confetti();
    setTimeout(function () {
      b.hidden = true;
      nextBanner();
    }, 2000);
  }, q.d * 1000);
}

// a piece's name and picture, k being its place in plan.js; the view draws them from the store's own pieces
function upName(id, k) {
  return View.upName(id, k);
}

function upIcon(id, k) {
  return View.upIcon(id, k) || 'assets/' + BZ[id].ic + '.png';
}

function placeIcon(id, k) {
  return View.placeIcon(id, k) || 'assets/' + PL[id].ic + '.png';
}

// a rate a second as a number a minute, with a decimal under 10 so a small one never reads 0
function perMin(v) {
  v *= 60;
  if (v >= 1000) return short(v);
  if (v >= 10) return String(Math.round(v));
  var r = Math.round(v * 10) / 10;
  return r ? String(r) : v > 0 ? '<0.1' : '0';
}

function plural(n, word) {
  return short(n) + ' ' + word + (n === 1 ? '' : 's');
}

// how many of the departments are open, which is also the one that opens next
function nextDept() {
  for (var i = 0; i < BIZ.length; i++) if (!has(BIZ[i].id)) return i;
  return BIZ.length;
}

// a department two or more places past the next one to open keeps its price to itself
function far(id) {
  return BZ[id].i - nextDept() >= 2;
}

// a button's price, or why it cannot be bought: locked, or too dear for now
function buyBtn(k, b, label, c, locked) {
  var poor = !locked && S.cash < c;
  set(k, 'up', b, 'innerHTML', locked ? 'Locked' : label + '<small>' + money(c) + '</small>');
  set(k, 'upd', b, 'disabled', locked || poor);
  flag(k, 'lk', b, 'lk', locked);
  flag(k, 'poor', b, 'poor', poor);
}

// the first purchase is what the opening prompt waits for
function started() {
  var n = 0;
  BIZ.forEach(function (b) { n += lv(b.id); });
  PLACES.forEach(function (p) { n += S.pl[p.id]; });
  return n > 1 || S.store > 1 || S.day.n > 0;
}

function makeRow(id) {
  var b = BZ[id] || PL[id];
  var el = document.createElement('div');
  el.className = 'biz';
  el.innerHTML = '<img class="ic" src="assets/' + b.ic + '.png" alt="">' +
    '<div class="mid"><div class="l1"><b></b><span></span></div><div class="pr"><i></i><em></em></div><div class="l3"><img alt=""><span></span></div></div>' +
    '<div class="btns"><button type="button" class="up"></button></div>';
  var r = { id: id, el: el, k: {}, nm: el.querySelector('b'), lv: el.querySelector('.l1 span'), bar: el.querySelector('.pr'),
    fill: el.querySelector('.pr i'), bt: el.querySelector('.pr em'), ms: el.querySelector('.l3 span'), nx: el.querySelector('.l3 img'),
    up: el.querySelector('.up') };
  r.nm.textContent = b.name;
  el.querySelector('.ic').addEventListener('click', function () { focusBiz(id); });
  r.up.addEventListener('click', function () {
    if (room(id)) openPlace(id);
    else upgrade(id);
  });
  return r;
}

function starRow(n) {
  var out = '';
  for (var i = 0; i < STAR_AT.length; i++) out += i < n ? '<i class="on">\u2605</i>' : '<i>\u2606</i>';
  return out;
}

// a place is a room once it stands: Checkouts and the Stockroom from the start, the rest when built
function room(id) {
  return BZ[id] ? has(id) : !!PL[id].open || S.pl[id] > 0;
}

// what a level of each room of the east wing does, and what the room does in all
var ROOMFX = {
  serv: function (n) { return '+' + perMin(inRate() / (1 + SERV * S.pl.serv) * SERV * (n || 1)) + ' shoppers/min'; },
  rest: function (n) { return '+' + Math.round(REST * 100 * (n || 1)) + '% spent by every shopper'; },
  lounge: function (n) { return '-' + Math.round((1 - Math.pow(LOUNGE, n || 1)) * 100) + '% till and stocking time'; },
  head: function (n) { return '+' + Math.round(HEAD * 100 * (n || 1)) + '% income, ' + (n || 1) + ' h more away'; }
};

// what one more level of an item does, as the one thing it changes
function effect(id, x, j) {
  if (BZ[id]) return stat(id, x);
  if (ROOMFX[id]) return ROOMFX[id]();
  var was = [inRate(), capacity(), stockCap()];
  S.pi[id][j]++;
  S.pl[id]++;
  var now = [inRate(), capacity(), stockCap()];
  S.pi[id][j]--;
  S.pl[id]--;
  // past the shoppers who come there is nothing more for tills or stockers to do
  var want = id === 'hall' ? inRate() : served();
  var up = Math.min(want, id === 'hall' ? now[1] : now[2]) - Math.min(want, id === 'hall' ? was[1] : was[2]);
  if (id === 'hall' && up > 0) return '+' + perMin(up) + ' shoppers/min at the tills';
  if (id === 'dock' && up > 0) return 'Restocks +' + perMin(up) + ' shoppers/min';
  if (id === 'dock' && now[2] > was[2]) return 'Restocks ' + perMin(was[2]) + ' to ' + perMin(now[2]) + ' shoppers/min';
  if (now[0] > was[0]) return '+' + perMin(now[0] - was[0]) + ' shoppers/min';
  var g = gains[id + ':' + j];
  if (g > 0.005) return '+' + money(g) + '/s';
  return id === 'hall' ? '+' + HALL_BOOST * 100 + '% sales' : '';
}

// what a department item's level changes for each shopper or stocker
function stat(id, x) {
  if (x.stat === 'sell') return '+' + money(perSell(id) * bmul()) + ' a shopper';
  if (x.stat === 'draw') return '+' + (DRAW * 60).toFixed(DRAW * 60 < 1 ? 2 : 1) + ' shoppers/min';
  return '-' + Math.round((1 - STAFF) * 100) + '% stocking time';
}

// an open room's card: a department's stars or a place's load, and a row for each of its items
function makeRoom(id) {
  var b = BZ[id] || PL[id];
  var el = document.createElement('div');
  el.className = 'dept';
  el.innerHTML = '<div class="biz dh"><img class="ic" src="assets/' + b.ic + '.png" alt="">' +
    '<div class="mid"><div class="l1"><b></b><span></span></div><div class="pr"><i></i><em></em></div><div class="l3 hint" hidden></div></div></div><div class="its"></div>';
  var r = { id: id, kind: 'room', el: el, k: {}, nm: el.querySelector('b'), lv: el.querySelector('.l1 span'), bar: el.querySelector('.pr'),
    fill: el.querySelector('.pr i'), bt: el.querySelector('.pr em'), hint: el.querySelector('.hint'), its: [] };
  r.nm.textContent = b.name;
  el.querySelector('.ic').addEventListener('click', function () { focusBiz(id); });
  b.items.forEach(function (x, j) {
    var row = document.createElement('div');
    row.className = 'biz it';
    row.innerHTML = '<img class="ic" alt=""><div class="mid"><div class="l1"><b></b><span></span></div><div class="l3 fx"><span></span></div>' +
      '<div class="l3 nx"><span></span></div></div><div class="btns"><button type="button" class="up"></button></div>';
    var q = { el: row, k: {}, pic: row.querySelector('.ic'), n: row.querySelector('.l1 span'), fx: row.querySelector('.fx span'),
      nx: row.querySelector('.nx span'), up: row.querySelector('.up') };
    row.querySelector('b').textContent = x.name;
    q.up.addEventListener('click', function () {
      cardSel = j;
      upgrade(id, j);
    });
    row.addEventListener('click', function () {
      cardSel = j;
      upRoom(r);
    });
    r.its.push(q);
    el.querySelector('.its').appendChild(row);
  });
  return r;
}

// the header of a department's card: its level and stars, and the way to the next star
function deptHead(r) {
  var id = r.id;
  var k = r.k;
  var e = S.b[id];
  var n = deptStars(id);
  var from = n ? STAR_AT[n - 1] : 0;
  set(k, 'lv', r.lv, 'innerHTML', 'Lv ' + e.l + '/' + UPS + ' ' + starRow(n));
  r.fill.style.width = (n >= STAR_AT.length ? 100 : (e.l - from) / (STAR_AT[n] - from) * 100) + '%';
  set(k, 'bt', r.bt, 'textContent', n >= STAR_AT.length ? 'All stars: sales here x' + Math.pow(STAR_MUL, n) :
    STAR_AT[n] - e.l + ' more for star ' + (n + 1) + ': sales here x' + STAR_MUL);
}

// the header of a place's card; Checkouts and the Stockroom show how loaded they are
function placeHead(r) {
  var id = r.id;
  var k = r.k;
  var p = PL[id];
  var box = r.el.firstChild;
  set(k, 'lv', r.lv, 'textContent', 'Lv ' + S.pl[id] + '/' + p.cost.length);
  flag(k, 'nobar', box, 'nobar', id !== 'hall' && id !== 'dock');
  var hint = loadBar(r, box, id) || (ROOMFX[id] && S.pl[id] ? 'Now: ' + ROOMFX[id](S.pl[id]) : '');
  set(k, 'hh', r.hint, 'hidden', !hint);
  set(k, 'ht', r.hint, 'textContent', hint);
}

// the bar of Checkouts and the Stockroom: the shoppers asked of them against what they can take, red when that is
// the limit. Returns what to do about it, or '' when it is not
function loadBar(r, box, id) {
  var k = r.k;
  var hall = id === 'hall';
  if (!hall && id !== 'dock') return '';
  var n = hall ? inRate() : served();
  var cap = hall ? capacity() : stockCap();
  r.fill.style.width = Math.min(100, n / cap * 100) + '%';
  set(k, 'bt', r.bt, 'textContent', 'Shoppers ' + perMin(n) + '/min \u00b7 ' + (hall ? 'tills ' : 'restock ') + perMin(cap) + '/min');
  flag(k, 'rd', box, 'rd', hall && linesFull() || !hall && shelvesOut());
  var lim = cap < n;
  flag(k, 'lim', box, 'lim', lim);
  return lim ? (hall ? 'Add lanes or self checkouts' : 'Hire stockers') : '';
}

// the piece an item adds next, or -1 when it is done
function nextOf(id, j) {
  return PL[id] ? placePiece(id, j) : nextPiece(id, j);
}

// the item the game would have bought next, else the first with levels left
function defaultItem(id) {
  var pick = -1;
  (PL[id] || BZ[id]).items.forEach(function (x, j) {
    if (nextOf(id, j) < 0) return;
    if (bestOpt && bestOpt.id === id && bestOpt.item === j || pick < 0) pick = j;
  });
  return pick;
}

// tells the store where the card's next piece goes, when that changed
function markNext(r, piece) {
  var key = r.id + ':' + piece;
  if (r.k.mk === key) return;
  r.k.mk = key;
  View.mark(r.id, piece);
}

function upRoom(r) {
  var id = r.id;
  var p = PL[id];
  if (p) placeHead(r);
  else deptHead(r);
  var c = p ? placeCost(id) : cost(id, 1);
  if (cardSel < 0 || nextOf(id, cardSel) < 0) cardSel = defaultItem(id);
  var at = cardSel < 0 ? -1 : nextOf(id, cardSel);
  markNext(r, at);
  (p || BZ[id]).items.forEach(function (x, j) {
    var q = r.its[j];
    var qk = q.k;
    var lvl = p ? S.pi[id][j] : S.b[id].it[j];
    var done = lvl >= x.at.length;
    var piece = x.at[done ? x.at.length - 1 : lvl];
    var name = p ? p.next[piece] : upName(id, piece);
    var hl = !!bestOpt && bestOpt.id === id && bestOpt.item === j;
    flag(qk, 'best', q.el, 'best', hl);
    flag(qk, 'done', q.el, 'done', done);
    flag(qk, 'sel', q.el, 'sel', j === cardSel);
    set(qk, 'n', q.n, 'textContent', lvl + '/' + x.at.length);
    set(qk, 'fx', q.fx, 'textContent', done ? '' : effect(id, x, j));
    set(qk, 'nx', q.nx, 'textContent', done ? 'Complete' : 'Next: ' + name);
    if (set(qk, 'pc', q.pic, 'title', name)) q.pic.src = p ? placeIcon(id, piece + 1) : upIcon(id, piece);
    if (done || !c) {
      set(qk, 'up', q.up, 'innerHTML', 'Done');
      set(qk, 'upd', q.up, 'disabled', true);
      flag(qk, 'lk', q.up, 'lk', false);
      flag(qk, 'poor', q.up, 'poor', false);
    } else buyBtn(qk, q.up, 'Buy', c, false);
    flag(qk, 'uphl', q.up, 'hl', hl);
  });
}

function upRow(r) {
  if (r.kind === 'room') {
    upRoom(r);
    return;
  }
  var id = r.id;
  var k = r.k;
  var hl = bestOpt && bestOpt.id === id;
  flag(k, 'best', r.el, 'best', hl);
  var p = PL[id];
  // a card for an area that is not open yet marks where its first piece goes
  if (r === cardRow) markNext(r, p ? (has(p.after) ? 0 : -1) : (avail(id) ? 0 : -1));
  if (p) {
    var c = placeCost(id);
    var l = S.pl[id];
    var open = has(p.after);
    var built = room(id);
    var hall = id === 'hall';
    var dock = id === 'dock';
    flag(k, 'lock', r.el, 'lock', !open);
    set(k, 'lv', r.lv, 'textContent', l ? 'Lv ' + l + '/' + p.cost.length : '');
    flag(k, 'nobar', r.el, 'nobar', !hall && !dock);
    var hint = loadBar(r, r.el, id);
    set(k, 'ms', r.ms, 'textContent', !open ? 'Open ' + BZ[p.after].name + ' first' : !built ? 'Next: ' + p.next[0] : hint ? hint : c ? p.items.map(function (x) { return x.name; }).join(', ') : 'Everything is built');
    var newLv = set(k, 'nxl', r.nx.dataset, 'lv', open && !built ? 1 : '');
    if (set(k, 'nxk', r.nx, 'title', open && !built ? p.next[0] : '') || newLv) {
      if (open && !built) r.nx.src = placeIcon(id, 1);
      else r.nx.removeAttribute('src');
    }
    if (built) {
      set(k, 'up', r.up, 'innerHTML', 'Items');
      set(k, 'upd', r.up, 'disabled', false);
      flag(k, 'lk', r.up, 'lk', false);
      flag(k, 'poor', r.up, 'poor', false);
    } else buyBtn(k, r.up, 'Build', c, !open);
    flag(k, 'uphl', r.up, 'hl', hl);
    return;
  }
  var e = S.b[id];
  flag(k, 'lock', r.el, 'lock', !e && !avail(id));
  flag(k, 'new', r.el, 'new', !e);
  flag(k, 'nobar', r.el, 'nobar', !e);
  if (!e) {
    var u = cost(id, 1);
    set(k, 'lv', r.lv, 'textContent', '');
    set(k, 'ms', r.ms, 'textContent', avail(id) ? upName(id, 0) + ': every shopper buys here' : far(id) ? 'Opens later' : 'Open ' + BIZ[BZ[id].i - 1].name + ' first');
    if (set(k, 'nxk', r.nx, 'title', avail(id) ? upName(id, 0) : '')) {
      if (avail(id)) r.nx.src = upIcon(id, 0);
      else r.nx.removeAttribute('src');
    }
    buyBtn(k, r.up, 'Open', u, !avail(id));
    flag(k, 'uphl', r.up, 'hl', hl);
    return;
  }
  var n = deptStars(id);
  var from = n ? STAR_AT[n - 1] : 0;
  set(k, 'lv', r.lv, 'innerHTML', 'Lv ' + e.l + '/' + UPS + ' ' + starRow(n));
  set(k, 'ms', r.ms, 'textContent', n >= STAR_AT.length ? 'All three stars: sales here x' + Math.pow(STAR_MUL, n) :
    'Star ' + (n + 1) + ' at level ' + STAR_AT[n] + ': sales here x' + STAR_MUL);
  if (set(k, 'nxk', r.nx, 'title', '')) r.nx.removeAttribute('src');
  set(k, 'up', r.up, 'innerHTML', 'Items');
  set(k, 'upd', r.up, 'disabled', false);
  flag(k, 'lk', r.up, 'lk', false);
  flag(k, 'poor', r.up, 'poor', false);
  flag(k, 'uphl', r.up, 'hl', hl);
  r.fill.style.width = (n >= STAR_AT.length ? 100 : (e.l - from) / (STAR_AT[n] - from) * 100) + '%';
  set(k, 'bt', r.bt, 'textContent', money(spendAt(id) * bmul()) + ' a shopper');
}

function buildList() {
  var list = $('list');
  BIZ.forEach(function (b) {
    rows[b.id] = makeRow(b.id);
    list.appendChild(rows[b.id].el);
    PLACES.forEach(function (p) {
      if (p.after !== b.id) return;
      rows[p.id] = makeRow(p.id);
      list.appendChild(rows[p.id].el);
    });
  });
}

function openSheet(id) {
  closeCard();
  sheetOpen = true;
  $('app').classList.add('sheet-open');
  $('sheet').hidden = false;
  $('list').scrollTop = 0;
  var o = rows[id] || bestOpt && rows[bestOpt.id];
  if (o) $('list').scrollTop = Math.max(0, o.el.offsetTop - 70);
  fitInsets();
}

function closeSheet() {
  sheetOpen = false;
  $('app').classList.remove('sheet-open');
  $('sheet').hidden = true;
  fitInsets();
}

function showCard(id) {
  closeSheet();
  var fresh = cardId !== id;
  cardId = id;
  if (fresh) cardSel = -1;
  if (cardRow) cardRow.el.remove();
  cardRow = room(id) ? makeRoom(id) : makeRow(id);
  $('card-row').appendChild(cardRow.el);
  upRow(cardRow);
  $('card').hidden = false;
  $('app').classList.add('card-open');
  fitInsets();
  View.select(id, fresh);
}

function closeCard() {
  cardId = null;
  if (cardRow) cardRow.el.remove();
  cardRow = null;
  $('card').hidden = true;
  $('app').classList.remove('card-open');
  fitInsets();
  View.select(null);
}

function focusBiz(id) {
  View.frame(id);
}

function afterBuy(res) {
  var t = View.event(res, performance.now());
  var name = (BZ[res.id] || PL[res.id]).name;
  if (res.star) {
    sfx('mile');
    banner('<b>' + name + ': ' + res.star + (res.star === 1 ? ' star' : ' stars') + ', sales here x' + STAR_MUL + '</b>' + (res.gems ? '<small>+' + res.gems + ' gems</small>' : ''),
      t + 0.3, res.star === STAR_AT.length);
    if (res.gems) flyGems(innerWidth / 2, innerHeight * 0.3, Math.min(6, res.gems));
  } else if (res.unlock) {
    sfx('unlock');
    banner('<b>New: ' + name + '</b><small>' + upName(res.id, res.piece) + ', and every shopper buys here now</small>', t + 0.3, true);
  } else if (res.place) {
    var p = PL[res.id];
    sfx('mile');
    banner('<b>' + name + ' level ' + S.pl[res.id] + '</b><small>' + p.next[res.piece] + '</small>', t + 0.3, S.pl[res.id] === p.cost.length);
  } else sfx('buy');
  buzz(res.star || res.unlock || res.place ? 'medium' : 'light');
  nudge();
}

// after anything that changes the money or what can be bought
function nudge() {
  updateBest();
  View.populate();
  save();
}

function upgrade(id, j) {
  wake();
  var res;
  if (j === undefined) j = PL[id] ? 0 : BZ[id].first;
  // read what the level adds before it is bought, since some of it depends on the level
  var x = (PL[id] || BZ[id]).items[j];
  var gain = PL[id] ? effect(id, x, j) : stat(id, x);
  if (PL[id]) res = buyPlace(id, j);
  else res = buy(id, j);
  if (!res) return;
  afterBuy(res);
  var at = View.pieceScreen(res.id, res.piece);
  if (!at) return;
  // above whatever panel is open, so the text is never under it
  var pane = sheetOpen ? $('sheet') : $('card').hidden ? $('bottom') : $('card');
  var top = pane.getBoundingClientRect().top - $('app').getBoundingClientRect().top;
  // above the piece's name bubble; under it when the piece is too high for that
  var hud = $('meters').getBoundingClientRect().bottom - $('app').getBoundingClientRect().top;
  var y = at.y - 96;
  if (y < hud + 6) y = at.y + 24;
  popAt(gain || '+ ' + x.name, at.x, Math.min(y, top - 40), 'item');
}

function claimGoalAt(i, el) {
  var g = claimGoal(i);
  if (!g) return;
  var c = centerOf(el);
  popAt('+' + g.gems + ' gems', c.x, c.y + 20, 'gem');
  flyGems(c.x, c.y + 10, Math.min(8, g.gems));
  if (g.x2) banner('<b>Goal done</b><small>Income x2 for ' + g.x2 + ' min</small>', 0);
  sfx('done');
  buzz('success');
  nudge();
  updateGoals();
}

// each shopper that pays shows its money over the till, when the till is on screen
function onSale(ev, c, v, t) {
  var at = View.shopper(ev, c, t);
  if (ev === 'paid' && at) popAt('+' + money(v), at.x, at.y, 'small');
}

function updateHud() {
  var cash = free ? 'Unlimited' : money(S.cash);
  set(shown, 'cash', $('cash-n'), 'textContent', cash);
  flag(shown, 'cl', $('cash'), 'long', cash.length > 6);
  set(shown, 'rate', $('rate'), 'textContent', '+' + money(rate()) + '/s');
  set(shown, 'gems', $('gem-n'), 'textContent', short(S.gems));
  set(shown, 'stars', $('star-n'), 'textContent', Math.min(rating(), gate()) + '/' + gate());
  set(shown, 'store', $('store-n'), 'textContent', 'Store ' + S.store);
  var x = $('x2');
  set(shown, 'x2h', x, 'hidden', !(S.x2 > 0));
  if (S.x2 > 0) set(shown, 'x2t', x, 'textContent', 'x2  ' + clock2(S.x2));
}

// each meter shows its rate a minute, or what is wrong when it is the limit
function meter(id, v, k, val, word) {
  var b = $(id);
  // a sliver stays in the track so an empty meter still reads as red
  var w = Math.max(4, Math.round(Math.max(0, Math.min(1, v)) * 100));
  flag(k, id + 'a', b, 'amber', v < 0.8 && v >= 0.5);
  flag(k, id + 'r', b, 'red', v < 0.5);
  if (k[id] !== w) {
    k[id] = w;
    b.querySelector('u').style.width = w + '%';
  }
  set(k, id + 't', b.querySelector('em'), 'textContent', v < 0.8 ? word : val);
  if (v < 0.8) meterHint(id);
}

var METER_HINT = {
  'm-in': ['Few shoppers', 'Tap Shoppers to bring more in'],
  'm-tills': ['The checkouts are the limit', 'Tap Checkouts to open more tills'],
  'm-shelf': ['The shelves are the limit', 'Tap Shelves to hire stockers']
};

// the first time a meter runs low, once ever, and not over a box or before the first purchase
function meterHint(id) {
  if (hinted[id] || !started() || veilUp()) return;
  hinted[id] = 1;
  try {
    localStorage.setItem(HINT_KEY, JSON.stringify(hinted));
  } catch (e) {}
  banner('<b>' + METER_HINT[id][0] + '</b><small>' + METER_HINT[id][1] + '</small>', 0.5);
}

function veilUp() {
  return !!document.querySelector('.veil:not([hidden])');
}

function updateMeters() {
  var k = shown;
  var cap = capacity();
  var inr = inRate();
  var st = stockCap();
  meter('m-in', inr / cap, k, perMin(inr) + '/min', 'Too few');
  meter('m-tills', cap / inr, k, perMin(cap) + '/min', 'Too slow');
  meter('m-shelf', st / served(), k, perMin(st) + '/min', 'Low');
}

// what brings the most shoppers for the money: Parking, the Taxi Stand or the cheapest draw item in a department
function drawPlace() {
  var pick = null;
  var best = 0;
  var sc = placeCost('serv');
  if (sc && firstLeft('serv') >= 0) {
    best = inRate() / (1 + SERV * S.pl.serv) * SERV / sc;
    pick = 'serv';
  }
  [['lot', PER_LOT], ['taxi', PER_TAXI]].forEach(function (p) {
    var c = placeCost(p[0]);
    if (c && p[1] / c > best) {
      best = p[1] / c;
      pick = p[0];
    }
  });
  BIZ.forEach(function (z) {
    if (!has(z.id) || DRAW * sm / cost(z.id, 1) <= best) return;
    var left = z.items.some(function (x, j) { return x.stat === 'draw' && nextPiece(z.id, j) >= 0; });
    if (!left) return;
    best = DRAW / cost(z.id, 1);
    pick = z.id;
  });
  return pick || (S.pl.lot < PL.lot.cost.length ? 'lot' : 'taxi');
}

function openPlace(id, j) {
  wake();
  showCard(id);
  focusBiz(id);
  if (j === undefined || !cardRow.its) return;
  // the row that gets the ping is the selected one too, so the picture marks the same item
  if (nextOf(id, j) >= 0) {
    cardSel = j;
    upRoom(cardRow);
  }
  var el = cardRow.its[j].el;
  el.scrollIntoView({ block: 'center' });
  el.classList.remove('ping');
  void el.offsetWidth;
  el.classList.add('ping');
}

// the first item of a place that still has levels left, else the one after it
function openItem(id, first, then) {
  var p = PL[id];
  openPlace(id, S.pi[id][first] < p.items[first].at.length ? first : then);
}

// the first item of a place with levels left, or -1
function firstLeft(id) {
  for (var j = 0; j < PL[id].items.length; j++) if (placePiece(id, j) >= 0) return j;
  return -1;
}

// what f() gains for the price from one more level of an item of a place
function perCoin(id, j, f) {
  var c = placeCost(id);
  if (!c || j < 0 || placePiece(id, j) < 0) return 0;
  var was = f();
  S.pi[id][j]++;
  S.pl[id]++;
  var now = f();
  S.pi[id][j]--;
  S.pl[id]--;
  return (now - was) / c;
}

// a meter of tills or shelves: its own place, unless a level of the Break Room does more for the price
function tapMeter(id, f) {
  var j = S.pi[id][0] < PL[id].items[0].at.length ? 0 : 1;
  var lj = firstLeft('lounge');
  if (perCoin('lounge', lj, f) > perCoin(id, j, f)) openPlace('lounge', lj);
  else openPlace(id, j);
}

function openDraw() {
  var id = drawPlace();
  openPlace(id, drawItem(id));
}

// the draw item to buy in the place drawPlace picked
function drawItem(id) {
  if (PL[id]) return Math.max(0, firstLeft(id));
  var items = BZ[id].items;
  for (var j = 0; j < items.length; j++) {
    if (items[j].stat === 'draw' && nextPiece(id, j) >= 0) return j;
  }
  return 0;
}

function updateBest() {
  var opts = options();
  bestOpt = best(opts);
  gains = {};
  opts.forEach(function (o) { gains[o.id + ':' + o.item] = o.gain; });
  View.setBest(bestOpt ? bestOpt.id : null);
}

function buildGoals() {
  for (var i = 0; i < 3; i++) {
    var c = document.createElement('button');
    c.type = 'button';
    c.className = 'chip';
    c.innerHTML = '<span></span><i><u></u></i><em></em>';
    c.dataset.k = i;
    c.addEventListener('click', function () {
      var g = chips[+this.dataset.k].g;
      if (!g) return;
      if (g.done) claimGoalAt(g.i, this);
      else goalTo(g);
    });
    chips.push({ el: c, k: {}, g: null, t: c.querySelector('span'), bar: c.querySelector('u'), tag: c.querySelector('em') });
    $('goals').appendChild(c);
  }
}

// an unfinished goal takes the player to what it is about: the card, or the list while that is still locked
function goalTo(g) {
  var id = g.to;
  if (!id) return;
  sfx('tap');
  if (id === 'sell') openSell();
  else if (BZ[id] ? !avail(id) : !has(PL[id].after)) openSheet(id);
  else openPlace(id, g.j);
}

function updateGoals() {
  var gs = goals();
  chips.forEach(function (c, i) {
    var g = gs[i];
    c.g = g;
    set(c.k, 'h', c.el, 'hidden', !g);
    if (!g) return;
    c.el.dataset.i = g.i;
    set(c.k, 't', c.t, 'textContent', g.t);
    flag(c.k, 'd', c.el, 'done', g.done);
    c.bar.style.width = (g.v / g.n * 100) + '%';
    set(c.k, 'g', c.tag, 'textContent', g.done ? 'Claim +' + g.gems : '+' + g.gems);
  });
  var cd = daily().can;
  set(shown, 'dd', $('daily-dot'), 'hidden', !cd);
  set(shown, 'sd', $('sell-dot'), 'hidden', !canMove());
}

function updateOpen() {
  if (sheetOpen) BIZ.forEach(function (b) { upRow(rows[b.id]); });
  if (sheetOpen) PLACES.forEach(function (p) { upRow(rows[p.id]); });
  if (cardRow && cardRow.kind !== (room(cardId) ? 'room' : undefined)) showCard(cardId);
  else if (cardRow) upRow(cardRow);
  if (!$('boost').hidden) paintBoost();
}

function hours(secs) {
  var m = Math.round(secs / 60);
  return m >= 60 ? Math.floor(m / 60) + ' h' + (m % 60 ? ' ' + (m % 60) + ' min' : '') : m + ' min';
}

// the box for what the store took while the player was away, or what is still waiting from before; a is the new
// time away if there is one
function showAway(a) {
  if (S.pend <= 0) return false;
  var txt = 'Earnings from last time are still waiting: <b>' + money(S.pend) + '</b>.';
  if (a) {
    txt = 'You were away for ' + hours(a.real) + '. The store served ' + a.n.toLocaleString('en-US') + ' shoppers and took <b>' + money(a.gain) + '</b>.';
    if (S.pend - a.gain > 0.5) txt += ' <b>' + money(S.pend - a.gain) + '</b> from before is still waiting.';
    if (a.real > maxAway()) txt += ' It only earns for ' + maxAway() / 3600 + ' h while you are away.';
  }
  $('away-txt').innerHTML = txt;
  $('away-ok').textContent = 'Collect ' + money(S.pend);
  $('away').hidden = false;
  return true;
}

function dayText(d) {
  var p = [];
  if (d.cash) p.push(d.cash + ' min of income');
  if (d.gems) p.push(d.gems + ' gems');
  if (d.x2) p.push('x2 for ' + d.x2 + ' min');
  return p.join(', ');
}

function openDaily() {
  var info = daily();
  var done = info.can ? info.idx : (S.day.n % 7 === 0 && S.day.n > 0 ? 7 : S.day.n % 7);
  var box = $('days');
  box.innerHTML = '';
  DAILY.forEach(function (d, i) {
    var c = document.createElement('div');
    c.className = 'day' + (i < done ? ' done' : '') + (info.can && i === info.idx ? ' today' : '') + (i === 6 ? ' last' : '');
    var ic = d.gems && d.x2 ? 'ui_gift' : d.gems ? 'ui_gem' : d.x2 ? 'ui_bolt' : 'coin';
    c.innerHTML = '<b>Day ' + (i + 1) + '</b><img src="assets/' + ic + '.png" alt=""><span>' + dayText(d) + '</span>';
    box.appendChild(c);
  });
  $('daily-txt').textContent = info.can ? 'Day ' + (info.idx + 1) + ' of 7. Come back every day to keep the streak.' : 'Claimed for today. Come back tomorrow to keep the streak.';
  $('daily-ok').hidden = !info.can;
  $('daily-x').textContent = info.can ? 'Later' : 'Close';
  $('daily').hidden = false;
}

// the reward opens by itself once a day, after the first purchase and never over another box
function autoDaily() {
  var day = dayNum(clock());
  if (dailyAsked === day || !started() || !daily().can || veilUp()) return;
  dailyAsked = day;
  openDaily();
}

// before the first purchase a line says what to tap
function updateHint() {
  var h = $('hint');
  var on = !started() && !sheetOpen && (!cardId || cardId === 'produce');
  set(shown, 'hh', h, 'hidden', !on);
  if (on) set(shown, 'ht', h, 'textContent', cardId ? 'Tap the glowing Buy button' : 'Tap Produce to buy your first stand');
}

function gemsLeft(cost) {
  return S.gems < cost ? 'Need ' + plural(cost - S.gems, 'more gem') + '.' : '';
}

function paintBoost() {
  $('boost-gems').textContent = 'You have ' + plural(S.gems, 'gem') + '.';
  $('x2-txt').textContent = S.x2 > 0 ? 'Active: ' + clock2(S.x2) + ' left. Buying adds 30 min.' : 'All income x2 for 30 minutes.';
  $('x2-need').textContent = gemsLeft(X2_COST);
  $('b-x2').innerHTML = '<img src="assets/ui_gem.png" alt="">' + X2_COST;
  $('b-x2').disabled = S.gems < X2_COST;
  var full = rate() * WARP_SECS;
  var v = Math.min(full, Math.max(S.run, 100));
  var weak = v < rate() * 600 || v <= 0;
  $('warp-txt').textContent = 'Get ' + money(v) + ' now' + (v < full ? ', as much as this store has earned so far.' : ', an hour of income.');
  $('warp-need').textContent = gemsLeft(WARP_COST) || (weak ? 'Worth less than 10 minutes of income. Better later.' : '');
  $('b-warp').innerHTML = '<img src="assets/ui_gem.png" alt="">' + WARP_COST;
  $('b-warp').disabled = S.gems < WARP_COST || weak;
}

function storeMul(n) {
  return Math.round(Math.pow(STORE_MUL, n - 1) * 100) / 100;
}

function openSell() {
  var r = rating();
  var g = gate();
  var open = opened();
  var ok = canMove();
  $('sell-txt').innerHTML = 'Open: <b>' + open + ' of ' + BIZ.length + '</b> departments \u00b7 stars <b>' + Math.min(r, g) + ' of ' + g + '</b>' +
    (r > g ? ' (+' + (r - g) + ' extra)' : '') + '. ' + (ok ? 'Ready to move.' : 'Open every department and reach ' + g + ' stars to move.') +
    ' Store ' + (S.store + 1) + ' earns <b>x' + storeMul(S.store + 1) + '</b> income, up from x' + storeMul(S.store) + '.';
  $('sell-keep').textContent = 'You keep your ' + plural(S.gems, 'gem') + ', goals and boosts. Everything else starts again: cash, departments, and the Parking, Checkouts, Taxi Stand and Garden Center. Department stars pay gems again.';
  $('sell-ok').textContent = ok ? 'Move to store ' + (S.store + 1) : 'See departments';
  $('sell-ok').classList.toggle('alt', !ok);
  $('sell').hidden = false;
}

function setSound() {
  $('m-snd').textContent = 'Sound: ' + (snd ? 'on' : 'off');
  $('m-buzz').textContent = 'Vibration: ' + (vib ? 'on' : 'off');
}

function codeOk(code) {
  try {
    return !!validate(JSON.parse(atob(code.trim())));
  } catch (e) {
    return false;
  }
}

function flash(id, text, old) {
  $(id).textContent = text;
  setTimeout(function () { $(id).textContent = old; }, 1500);
}

function afterLoad() {
  closeCard();
  closeSheet();
  View.refresh();
  View.focusNow();
  updateBest();
  updateGoals();
}

function wire() {
  $('card-x').addEventListener('click', closeCard);
  $('t-biz').addEventListener('click', function () {
    sfx('tap');
    openSheet();
  });
  $('sheet-x').addEventListener('click', function () {
    sfx('tap');
    closeSheet();
  });
  $('t-boost').addEventListener('click', function () {
    paintBoost();
    $('boost').hidden = false;
  });
  $('boost-x').addEventListener('click', function () { $('boost').hidden = true; });
  $('b-x2').addEventListener('click', function () {
    if (!buyX2()) return;
    sfx('done');
    banner('<b>Double income</b><small>Active for ' + clock2(S.x2) + '</small>', 0);
    nudge();
  });
  $('b-warp').addEventListener('click', function () {
    var v = warp();
    if (!v) return;
    var c = centerOf($('b-warp'));
    popAt('+' + money(v), c.x, c.y, 'big');
    flyCoins(c.x, c.y, 8);
    sfx('mile');
    nudge();
  });
  $('t-daily').addEventListener('click', openDaily);
  $('daily-x').addEventListener('click', function () { $('daily').hidden = true; });
  $('daily-ok').addEventListener('click', function () {
    var c = centerOf($('daily-ok'));
    var r = claimDaily();
    if (!r) return;
    if (r.cash) {
      popAt('+' + money(r.cash), c.x, c.y, 'big');
      flyCoins(c.x, c.y, 8);
    }
    if (r.gems) flyGems(c.x, c.y, Math.min(8, r.gems));
    sfx('done');
    buzz('success');
    $('daily').hidden = true;
    nudge();
    updateGoals();
  });
  $('t-sell').addEventListener('click', openSell);
  $('sell-x').addEventListener('click', function () {
    $('sell').hidden = true;
    $('sell-ok').dataset.armed = '';
  });
  $('sell-ok').addEventListener('click', function () {
    var b = $('sell-ok');
    if (!canMove()) {
      $('sell').hidden = true;
      openSheet();
      return;
    }
    if (!b.dataset.armed) {
      b.dataset.armed = '1';
      b.textContent = 'Tap again to move';
      setTimeout(function () {
        b.dataset.armed = '';
        if (!$('sell').hidden) openSell();
      }, 3000);
      return;
    }
    b.dataset.armed = '';
    var moved = move();
    $('sell').hidden = true;
    if (!moved) return;
    afterLoad();
    sfx('mile');
    buzz('success');
    banner('<b>Welcome to store ' + S.store + '</b><small>Income x' + storeMul(S.store) + '</small>', 0.2, true);
    nudge();
  });
  $('gear').addEventListener('click', function () {
    setSound();
    $('menu').hidden = false;
  });
  $('m-ok').addEventListener('click', function () {
    sfx('tap');
    $('menu').hidden = true;
  });
  $('m-snd').addEventListener('click', function () {
    snd = !snd;
    try {
      localStorage.setItem(SND_KEY, snd ? '1' : '0');
    } catch (e) {}
    wake();
    setSound();
  });
  $('m-buzz').addEventListener('click', function () {
    vib = !vib;
    try {
      localStorage.setItem(BUZZ_KEY, vib ? '1' : '0');
    } catch (e) {}
    setSound();
    buzz();
  });
  $('m-copy').addEventListener('click', function () {
    var code = exportCode();
    $('m-code').value = code;
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(code).then(function () {
        flash('m-copy', 'Copied', 'Copy code');
      }, function () {
        $('m-code').select();
      });
    } else {
      $('m-code').select();
    }
  });
  var loadArmed = false;
  var help = $('m-help').textContent;
  $('m-load').addEventListener('click', function () {
    if (!codeOk($('m-code').value)) {
      loadArmed = false;
      flash('m-load', 'Not a code', 'Load code');
      return;
    }
    if (!loadArmed) {
      loadArmed = true;
      $('m-load').textContent = 'Tap again';
      $('m-help').textContent = 'Loading replaces this game with the one in the code.';
      setTimeout(function () {
        loadArmed = false;
        $('m-load').textContent = 'Load code';
        $('m-help').textContent = help;
      }, 3000);
      return;
    }
    loadArmed = false;
    importCode($('m-code').value);
    $('m-load').textContent = 'Load code';
    $('m-help').textContent = help;
    afterLoad();
    $('menu').hidden = true;
  });
  var armed = false;
  $('m-reset').addEventListener('click', function () {
    if (!armed) {
      armed = true;
      $('m-reset').textContent = 'Tap again: erases gems, stores and streak';
      setTimeout(function () {
        armed = false;
        $('m-reset').textContent = 'Erase all progress';
      }, 3000);
      return;
    }
    armed = false;
    reset();
    speed = 1;
    dailyAsked = -1;
    afterLoad();
    $('m-reset').textContent = 'Erase all progress';
    $('menu').hidden = true;
  });
  // the test menu: five taps on the title
  $('m-title').addEventListener('click', function () {
    if (++testTaps >= 5) $('test').hidden = false;
  });
  [].forEach.call(document.querySelectorAll('#t-speed button'), function (b) {
    b.addEventListener('click', function () {
      speed = +b.dataset.s;
      paintSpeed();
    });
  });
  $('t-hour').addEventListener('click', function () {
    testIncome(1);
    nudge();
  });
  $('t-gems').addEventListener('click', function () {
    S.gems += 100;
    nudge();
  });
  $('t-free').addEventListener('click', function () {
    free = !free;
    setFree(free);
    try {
      localStorage.setItem(FREE_KEY, free ? '1' : '0');
    } catch (e) {}
    paintFree();
    nudge();
  });
  $('t-goals').addEventListener('click', function () {
    finishGoals();
    updateGoals();
  });
  $('away-ok').addEventListener('click', function () {
    var c = centerOf($('away-ok'));
    var v = claimAway();
    $('away').hidden = true;
    if (v > 0) {
      popAt('+' + money(v), c.x, c.y, 'big');
      flyCoins(c.x, c.y, 10);
      sfx('mile');
    }
    nudge();
  });
  document.addEventListener('pointerup', wake);
  window.addEventListener('resize', fitInsets);
  var hiddenAt = 0;
  document.addEventListener('visibilitychange', function () {
    if (document.hidden) {
      save();
      hiddenAt = Date.now();
      return;
    }
    if (!hiddenAt) return;
    var sec = (Date.now() - hiddenAt) / 1000;
    hiddenAt = 0;
    lastTick = performance.now();
    if (sec > 60) {
      var a = away(sec);
      if (showAway(a)) updateBest();
    }
  });
}

function paintFree() {
  $('t-free').textContent = 'Unlimited money: ' + (free ? 'on' : 'off');
}

function paintSpeed() {
  [].forEach.call(document.querySelectorAll('#t-speed button'), function (b) { b.classList.toggle('on', +b.dataset.s === speed); });
}

function onTap(h) {
  wake();
  if (h.kind === 'biz') showCard(h.id);
  else closeCard();
}

function loop(t) {
  requestAnimationFrame(loop);
  tick(Math.min(1, (t - lastTick) / 1000));
  topUp();
  lastTick = t;
  if (t - bestAt > 250) {
    bestAt = t;
    updateBest();
    updateGoals();
    autoDaily();
    updateMeters();
    updateHint();
    fitInsets();
  }
  View.draw(t);
  updateHud();
  updateOpen();
}

function start() {
  try {
    snd = localStorage.getItem(SND_KEY) !== '0';
    vib = localStorage.getItem(BUZZ_KEY) !== '0';
    free = localStorage.getItem(FREE_KEY) === '1';
    hinted = JSON.parse(localStorage.getItem(HINT_KEY)) || {};
  } catch (e) {}
  var gone = load();
  View.init($('view'), onTap);
  buildList();
  buildGoals();
  paintSpeed();
  wire();
  setFree(free);
  paintFree();
  $('stars').addEventListener('click', openSell);
  $('m-in').addEventListener('click', openDraw);
  $('m-tills').addEventListener('click', function () { tapMeter('hall', capacity); });
  $('m-shelf').addEventListener('click', function () { tapMeter('dock', stockCap); });
  onShopper = onSale;
  var wait = setInterval(function () {
    if (!View.ready()) return;
    clearInterval(wait);
    View.refresh();
    updateBest();
    View.focusNow();
    updateGoals();
    showAway(gone);
    lastTick = performance.now();
    requestAnimationFrame(loop);
    setInterval(save, 5000);
    if (location.protocol !== 'file:') {
      // file:// blocks the manifest fetch and logs an error
      var man = document.createElement('link');
      man.rel = 'manifest';
      man.href = 'manifest.webmanifest';
      document.head.appendChild(man);
      if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js');
    }
  }, 50);
}

start();
