var SND_KEY = 'mainstreet.snd';
var MODE_KEY = 'mainstreet.mode';
var SND = {
  buy: ['triangle', 0.07, 0.16, [523, 784]],
  coin: ['square', 0.05, 0.1, [880, 1175]],
  till: ['sine', 0.05, 0.12, [1568, 2093]],
  done: ['triangle', 0.1, 0.25, [523, 659, 784, 1047]],
  mile: ['triangle', 0.08, 0.22, [523, 659, 784, 1047, 1319, 1568]],
  unlock: ['triangle', 0.09, 0.2, [392, 523, 659, 784]]
};
var ac = null;
var snd = true;
var cardId = null;
var cardRow = null;
var lastTick = 0;
var shown = {};
var insets = [0, 0];
var mode = 1;
var rows = {};
var bestOpt = null;
var bestAt = 0;
var sheetOpen = false;
var bq = [];
var bqBusy = false;
var testTaps = 0;
var FREE_KEY = 'mainstreet.free';
var free = false;
var chips = [];

function $(id) {
  return document.getElementById(id);
}

function money(v) {
  return '$' + short(v);
}

function wake() {
  if (!snd) return;
  if (navigator.audioSession) navigator.audioSession.type = 'ambient';
  if (!ac && window.AudioContext) ac = new AudioContext();
  if (ac && ac.state !== 'running') ac.resume();
}

function sfx(name) {
  if (!ac || !snd || ac.state !== 'running') return;
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

function buzz() {
  if (navigator.vibrate) navigator.vibrate(10);
  else if (window.webkit && window.webkit.messageHandlers && window.webkit.messageHandlers.buzz) {
    window.webkit.messageHandlers.buzz.postMessage(10);
  }
}

function secs(v) {
  if (v < 10) return (Math.round(v * 10) / 10) + 's';
  if (v < 60) return Math.round(v) + 's';
  var m = Math.floor(v / 60);
  return m + 'm' + (Math.round(v % 60) ? ' ' + Math.round(v % 60) + 's' : '');
}

function clock2(v) {
  var m = Math.floor(v / 60);
  var s = Math.floor(v % 60);
  return m + ':' + (s < 10 ? '0' : '') + s;
}

function fitInsets() {
  var top = $('goals').getBoundingClientRect().bottom + 6;
  var bot = innerHeight - (sheetOpen ? $('sheet').getBoundingClientRect().top : $('bottom').getBoundingClientRect().top) + 6;
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
  d.style.left = x + 'px';
  d.style.top = y + 'px';
  $('fly').appendChild(d);
  var a = d.animate([{ transform: 'translate(-50%, 0) scale(0.6)', opacity: 0 }, { transform: 'translate(-50%, -14px) scale(1.15)', opacity: 1, offset: 0.2 },
    { transform: 'translate(-50%, -52px) scale(1)', opacity: 0 }], { duration: 1100, easing: 'ease-out' });
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

function amount(id) {
  return mode === 0 ? Math.max(1, maxBuy(id)) : mode;
}

function msText(l) {
  var m = nextMs(l);
  if (!m) return 'All milestones reached';
  return 'Level ' + m.lv + ': sales here x' + m.mul + (m.i === 0 ? ', and a clerk to help' : '');
}

function perMin(v) {
  return Math.round(v * 60);
}

function makeRow(id) {
  var b = BZ[id] || PL[id];
  var el = document.createElement('div');
  el.className = 'biz';
  el.innerHTML = '<img class="ic" src="assets/' + b.ic + '.png" alt="">' +
    '<div class="mid"><div class="l1"><b></b><span></span></div><div class="pr"><i></i><em></em></div><div class="l3"></div></div>' +
    '<div class="btns"><button type="button" class="up"></button></div>';
  var r = { id: id, el: el, k: {}, nm: el.querySelector('b'), lv: el.querySelector('.l1 span'), bar: el.querySelector('.pr'),
    fill: el.querySelector('.pr i'), bt: el.querySelector('.pr em'), ms: el.querySelector('.l3'), up: el.querySelector('.up') };
  r.nm.textContent = b.name;
  el.querySelector('.ic').addEventListener('click', function () { focusBiz(id); });
  r.up.addEventListener('click', function () { upgrade(id); });
  return r;
}

function upRow(r) {
  var id = r.id;
  var k = r.k;
  var hl = bestOpt && bestOpt.id === id;
  flag(k, 'best', r.el, 'best', hl);
  var p = PL[id];
  if (p) {
    var c = placeCost(id);
    var l = S.pl[id];
    var open = has(p.after);
    var hall = id === 'hall';
    flag(k, 'lock', r.el, 'lock', !open);
    set(k, 'lv', r.lv, 'textContent', l ? 'Lv ' + l + '/' + p.cost.length : '');
    // the checkouts' bar shows how busy the tills are: shoppers coming in against what the tills can take
    flag(k, 'nobar', r.el, 'nobar', !hall);
    flag(k, 'rd', r.el, 'rd', hall && linesFull());
    if (hall) {
      r.fill.style.width = Math.min(100, inRate() / capacity() * 100) + '%';
      set(k, 'bt', r.bt, 'textContent', perMin(inRate()) + ' come in, tills take ' + perMin(capacity()) + ' a min');
    }
    set(k, 'ms', r.ms, 'textContent', !open ? 'Open ' + BZ[p.after].name + ' first' : c ? 'Next: ' + p.next[l] : 'Everything is built');
    set(k, 'up', r.up, 'innerHTML', c ? (l || p.open ? 'Upgrade' : 'Build') + '<small>' + money(c) + '</small>' : 'Done<small>all levels</small>');
    set(k, 'upd', r.up, 'disabled', !c || S.cash < c);
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
    set(k, 'ms', r.ms, 'textContent', avail(id) ? 'Every shopper spends ' + money(spendAt(id, 1)) + ' here' : 'Open ' + BIZ[BZ[id].i - 1].name + ' first');
    set(k, 'up', r.up, 'innerHTML', 'Open<small>' + money(u) + '</small>');
    set(k, 'upd', r.up, 'disabled', !avail(id) || S.cash < u);
    flag(k, 'uphl', r.up, 'hl', hl);
    return;
  }
  var n = amount(id);
  var cc = cost(id, n);
  var m = nextMs(e.l);
  var from = m && m.i ? MS[m.i - 1][0] : 0;
  set(k, 'lv', r.lv, 'textContent', 'Lv ' + e.l);
  set(k, 'ms', r.ms, 'textContent', msText(e.l));
  set(k, 'up', r.up, 'innerHTML', 'Level up' + (n > 1 ? ' x' + n : '') + '<small>' + money(cc) + '</small>');
  set(k, 'upd', r.up, 'disabled', S.cash < cc);
  flag(k, 'uphl', r.up, 'hl', hl);
  r.fill.style.width = (m ? (e.l - from) / (m.lv - from) * 100 : 100) + '%';
  set(k, 'bt', r.bt, 'textContent', money(spendAt(id, e.l) * bmul()) + ' a shopper');
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

function openSheet() {
  closeCard();
  sheetOpen = true;
  $('app').classList.add('sheet-open');
  $('sheet').hidden = false;
  $('list').scrollTop = 0;
  var o = bestOpt && rows[bestOpt.id];
  if (o) $('list').scrollTop = Math.max(0, o.el.offsetTop - 70);
  fitInsets();
}

function closeSheet() {
  sheetOpen = false;
  $('app').classList.remove('sheet-open');
  $('sheet').hidden = true;
  fitInsets();
}

function setMode(m) {
  mode = m;
  try {
    localStorage.setItem(MODE_KEY, String(m));
  } catch (e) {}
  [].forEach.call(document.querySelectorAll('#modes button'), function (b) { b.classList.toggle('on', +b.dataset.m === m); });
}

function showCard(id) {
  closeSheet();
  cardId = id;
  if (cardRow) cardRow.el.remove();
  cardRow = makeRow(id);
  $('card-row').appendChild(cardRow.el);
  upRow(cardRow);
  $('card').hidden = false;
  $('app').classList.add('card-open');
  fitInsets();
}

function closeCard() {
  cardId = null;
  if (cardRow) cardRow.el.remove();
  cardRow = null;
  $('card').hidden = true;
  $('app').classList.remove('card-open');
  fitInsets();
}

function focusBiz(id) {
  var sp = View.spot(id);
  View.go(sp.x, sp.y);
}

function afterBuy(res) {
  var t = View.event(res, performance.now());
  var ms = res.ms || [];
  var name = (BZ[res.id] || PL[res.id]).name;
  if (ms.length) {
    var m = ms[ms.length - 1];
    sfx('mile');
    banner('<b>' + name + ' level ' + m.lv + '!</b><small>Sales here x' + m.mul + (ms[0].lv === MS[0][0] ? ', a clerk joins' : '') + (res.gems ? '  +' + res.gems + ' gems' : '') + '</small>', t + 0.3, m.lv >= 25);
    if (res.gems) flyGems(innerWidth / 2, innerHeight * 0.3, Math.min(6, res.gems));
  } else if (res.unlock) {
    sfx('unlock');
    banner('<b>New: ' + name + '</b><small>Every shopper buys here now</small>', t + 0.3, true);
  } else if (res.place) {
    var p = PL[res.id];
    sfx('mile');
    banner('<b>' + name + ' level ' + S.pl[res.id] + '</b><small>' + p.next[S.pl[res.id] - 1] + '</small>', t + 0.3, S.pl[res.id] === p.cost.length);
  } else sfx('buy');
  buzz();
  nudge();
}

// after anything that changes the money or what can be bought
function nudge() {
  updateBest();
  View.populate();
  save();
}

function upgrade(id) {
  wake();
  var res;
  if (PL[id]) res = buyPlace(id);
  else res = buy(id, has(id) ? amount(id) : 1);
  if (res) afterBuy(res);
}

function pressBest() {
  wake();
  var o = best();
  if (!o || o.cost > S.cash) return;
  var res = doOption(o);
  if (res) afterBuy(res);
}

function claimGoalAt(i, el) {
  var g = claimGoal(i);
  if (!g) return;
  var c = centerOf(el);
  popAt('+' + g.gems + ' gems', c.x, c.y + 20, 'gem');
  flyGems(c.x, c.y + 10, Math.min(8, g.gems));
  if (g.x2) banner('<b>Goal done</b><small>Income x2 for ' + g.x2 + ' min</small>', 0);
  sfx('done');
  buzz();
  nudge();
  updateGoals();
}

// each shopper that pays shows its money over the till, when the till is on screen
function onSale(ev, c, v, t) {
  var at = View.shopper(ev, c, t);
  if (ev === 'paid' && at) popAt('+' + money(v), at.x, at.y, 'small');
}

function updateHud() {
  set(shown, 'cash', $('cash-n'), 'textContent', free ? 'Unlimited' : money(S.cash));
  set(shown, 'rate', $('rate'), 'textContent', '+' + money(rate()) + '/s');
  set(shown, 'gems', $('gem-n'), 'textContent', String(S.gems));
  set(shown, 'stars', $('star-n'), 'textContent', String(S.stars));
  var x = $('x2');
  set(shown, 'x2h', x, 'hidden', !(S.x2 > 0));
  if (S.x2 > 0) set(shown, 'x2t', x, 'textContent', 'x2  ' + clock2(S.x2));
}

function updateBest() {
  bestOpt = best();
  View.setBest(bestOpt ? bestOpt.id : null);
}

function bestText(o) {
  var name = (BZ[o.id] || PL[o.id]).name;
  var l = lv(o.id);
  if (o.k === 'place') return [S.pl[o.id] || PL[o.id].open ? name + ' level ' + (S.pl[o.id] + 1) : 'Build the ' + name, PL[o.id].next[S.pl[o.id]]];
  if (!l) return ['Open ' + name, 'A new department: every shopper buys here'];
  if (o.n > 1) return [name + ': ' + o.n + ' levels', 'Reaches the level ' + o.ms + ' milestone'];
  return ['Level up ' + name, 'Lv ' + l + ' to ' + (l + 1) + ',  +' + money(o.gain) + '/s'];
}

function paintBest() {
  var o = bestOpt;
  var b = $('best');
  set(shown, 'bestH', b, 'hidden', !o);
  if (!o) return;
  var ok = S.cash >= o.cost;
  var t = bestText(o);
  var wait = ok ? '' : '  -  ' + secs(Math.max(1, (o.cost - S.cash) / Math.max(rate(), 1e-9))) + ' to go';
  set(shown, 'bestT', $('best-txt'), 'innerHTML', '<b>' + t[0] + '</b><small>' + t[1] + wait + '</small>');
  set(shown, 'bestC', $('best-cost'), 'textContent', money(o.cost));
  flag(shown, 'bestW', b, 'wait', !ok);
  set(shown, 'bestD', b, 'disabled', !ok);
  $('best-fill').style.width = (ok ? 0 : Math.min(100, S.cash / o.cost * 100)) + '%';
}

function buildGoals() {
  for (var i = 0; i < 3; i++) {
    var c = document.createElement('button');
    c.type = 'button';
    c.className = 'chip';
    c.innerHTML = '<span></span><i><u></u></i><em></em>';
    c.addEventListener('click', function () {
      if (this.dataset.i !== '' && this.classList.contains('done')) claimGoalAt(+this.dataset.i, this);
    });
    chips.push({ el: c, k: {}, t: c.querySelector('span'), bar: c.querySelector('u'), tag: c.querySelector('em') });
    $('goals').appendChild(c);
  }
}

function updateGoals() {
  var gs = goals();
  chips.forEach(function (c, i) {
    var g = gs[i];
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
  set(shown, 'sd', $('sell-dot'), 'hidden', stars() < 10);
}

function updateOpen() {
  if (sheetOpen) BIZ.forEach(function (b) { upRow(rows[b.id]); });
  if (sheetOpen) PLACES.forEach(function (p) { upRow(rows[p.id]); });
  if (cardRow) upRow(cardRow);
  if (!$('boost').hidden) paintBoost();
}

function showAway(a) {
  if (a.gain <= 0) return false;
  var m = Math.round(a.secs / 60);
  var t = m >= 60 ? Math.floor(m / 60) + ' h' + (m % 60 ? ' ' + (m % 60) + ' min' : '') : m + ' min';
  var txt = 'You were away for ' + t + '. The store served ' + a.n.toLocaleString('en-US') + ' shoppers and took <b>' + money(a.gain) + '</b>.';
  $('away-txt').innerHTML = txt;
  $('away-ok').textContent = a.gain > 0 ? 'Collect ' + money(a.gain) : 'OK';
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

function paintBoost() {
  $('boost-gems').textContent = 'You have ' + S.gems + ' gems.';
  $('x2-txt').textContent = S.x2 > 0 ? 'Active: ' + clock2(S.x2) + ' left. Buying adds 30 min.' : 'All income x2 for 30 minutes.';
  $('b-x2').innerHTML = '<img src="assets/ui_gem.png" alt="">' + X2_COST;
  $('b-x2').disabled = S.gems < X2_COST;
  var v = Math.min(rate() * WARP_SECS, Math.max(S.run, 100));
  $('warp-txt').textContent = 'Get ' + money(v) + ' now, up to 1 hour of income.';
  $('b-warp').innerHTML = '<img src="assets/ui_gem.png" alt="">' + WARP_COST;
  $('b-warp').disabled = S.gems < WARP_COST;
}

function openSell() {
  var n = stars();
  var now = 1 + STAR_BONUS * S.stars;
  var then = 1 + STAR_BONUS * (S.stars + n);
  $('sell-txt').innerHTML = n >= 1 ?
    'Selling now gives <b>' + n + ' Store stars</b>. Each star adds ' + Math.round(STAR_BONUS * 100) + '% to all income, forever. Your income goes from x' + now.toFixed(2) + ' to x' + then.toFixed(2) + '.' +
    (n < 10 ? ' Waiting for about 10 stars makes the sale worth more.' : '') :
    'You need to earn about ' + money(STAR_DIV) + ' in this run to get the first star. So far: ' + money(S.run) + '.';
  $('sell-keep').textContent = 'You keep: stars, gems, goals and boosts. Everything else starts again: cash, departments, and the Parking, Checkouts, Taxi Stand and Garden Center.';
  $('sell-ok').textContent = n >= 1 ? 'Sell for ' + n + ' stars' : 'Not yet';
  $('sell-ok').disabled = n < 1;
  $('sell').hidden = false;
}

function setSound() {
  $('m-snd').textContent = 'Sound: ' + (snd ? 'on' : 'off');
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
  $('best').addEventListener('click', pressBest);
  $('card-x').addEventListener('click', closeCard);
  $('t-biz').addEventListener('click', openSheet);
  $('sheet-x').addEventListener('click', closeSheet);
  [].forEach.call(document.querySelectorAll('#modes button'), function (b) {
    b.addEventListener('click', function () { setMode(+b.dataset.m); });
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
    if (!b.dataset.armed) {
      b.dataset.armed = '1';
      b.textContent = 'Tap again to sell';
      setTimeout(function () {
        b.dataset.armed = '';
        if (!$('sell').hidden) openSell();
      }, 3000);
      return;
    }
    b.dataset.armed = '';
    var n = sell();
    $('sell').hidden = true;
    if (!n) return;
    afterLoad();
    sfx('mile');
    banner('<b>Store sold</b><small>+' + n + ' Store stars, income x' + (1 + STAR_BONUS * S.stars).toFixed(2) + '</small>', 0.2, true);
    nudge();
  });
  $('gear').addEventListener('click', function () {
    setSound();
    $('menu').hidden = false;
  });
  $('m-ok').addEventListener('click', function () { $('menu').hidden = true; });
  $('m-snd').addEventListener('click', function () {
    snd = !snd;
    try {
      localStorage.setItem(SND_KEY, snd ? '1' : '0');
    } catch (e) {}
    wake();
    setSound();
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
  $('m-load').addEventListener('click', function () {
    var ok = importCode($('m-code').value);
    flash('m-load', ok ? 'Loaded' : 'Not a code', 'Load code');
    if (!ok) return;
    afterLoad();
    $('menu').hidden = true;
  });
  var armed = false;
  $('m-reset').addEventListener('click', function () {
    if (!armed) {
      armed = true;
      $('m-reset').textContent = 'Tap again to erase';
      setTimeout(function () {
        armed = false;
        $('m-reset').textContent = 'Reset store';
      }, 3000);
      return;
    }
    armed = false;
    reset();
    speed = 1;
    afterLoad();
    $('m-reset').textContent = 'Reset store';
    $('menu').hidden = true;
    maybeDaily();
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
    maybeDaily();
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
    if (sec > 60 && showAway(away(sec))) updateBest();
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

function maybeDaily() {
  if (daily().can && $('away').hidden) openDaily();
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
    fitInsets();
  }
  View.draw(t);
  updateHud();
  paintBest();
  updateOpen();
}

function start() {
  try {
    snd = localStorage.getItem(SND_KEY) !== '0';
    free = localStorage.getItem(FREE_KEY) === '1';
    var m = localStorage.getItem(MODE_KEY);
    if (m !== null && [0, 1, 10, 100].indexOf(+m) >= 0) mode = +m;
  } catch (e) {}
  var gone = load();
  View.init($('view'), onTap);
  buildList();
  buildGoals();
  setMode(mode);
  paintSpeed();
  wire();
  setFree(free);
  paintFree();
  onShopper = onSale;
  var wait = setInterval(function () {
    if (!View.ready()) return;
    clearInterval(wait);
    View.refresh();
    updateBest();
    View.focusNow();
    updateGoals();
    var shownAway = gone ? showAway(gone) : false;
    if (!shownAway) maybeDaily();
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
