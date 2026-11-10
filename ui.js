var els = {};
var rows = {};
var tab = 'street';
var tapped = false;
var running = false;
var ready = false;
var failed = false;
var gen = 0;
var raf = 0;
var last = 0;
var saveIn = 5;
var paintIn = 0;
var frames = 0;
var ptr = null;
var ac = null;
var ask = -1;
var movesKey = '';

function $(id) {
  return document.getElementById(id);
}

function set(el, s) {
  if (el.textContent !== s) el.textContent = s;
}

function span(s) {
  if (!isFinite(s)) return '';
  if (s < 60) return Math.max(1, Math.ceil(s)) + 's';
  if (s < 3600) return Math.ceil(s / 60) + 'm';
  return (s < 36000 ? (s / 3600).toFixed(1) : Math.round(s / 3600)) + 'h';
}

function eta(it) {
  return span(wait(it.cost() - S.cash));
}

// short beeps made in code, silent until the first touch lets the audio start
var SND = { buy: [523, 659], restock: [440], open: [523, 659, 784] };

function sfx(name) {
  if (!ac || !S.snd || ac.state !== 'running') return;
  var t = ac.currentTime;
  SND[name].forEach(function (f, i) {
    var o = ac.createOscillator();
    var g = ac.createGain();
    o.type = 'square';
    o.frequency.value = f;
    g.gain.setValueAtTime(0.04, t + i * 0.07);
    g.gain.exponentialRampToValueAtTime(0.0001, t + i * 0.07 + 0.09);
    o.connect(g);
    g.connect(ac.destination);
    o.start(t + i * 0.07);
    o.stop(t + i * 0.07 + 0.1);
  });
}

function wake() {
  if (!ac && window.AudioContext) ac = new AudioContext();
  if (ac && ac.state !== 'running') ac.resume();
}

function fit() {
  var w = els.stage.clientWidth;
  var h = els.stage.clientHeight;
  if (!w || !h) return;
  setView(w, h, window.devicePixelRatio || 1);
  if (ready) draw(0);
}

function maxOf(it) {
  if (it.kind === 'lot') return D.lots[it.lot].rungs.length;
  if (it.id === 'trucks') return FLEET.trucks.length;
  if (it.id === 'speed') return FLEET.speed.rungs.length;
  if (it.id === 'drones') return FLEET.drones.length;
  return 1;
}

function pick(i, pan) {
  select(i);
  setTab('street');
  if (pan) camTo(i);
  refresh();
}

function nativeApp() {
  return !!(window.webkit && window.webkit.messageHandlers && window.webkit.messageHandlers.buzz);
}

function buzz() {
  if (navigator.vibrate) navigator.vibrate(10);
  else if (nativeApp()) window.webkit.messageHandlers.buzz.postMessage(10);
}

function afterBuy(id) {
  save();
  buzz();
  lookAt(id);
  refresh();
}

function makeRow(it) {
  var r = document.createElement('div');
  r.className = 'row';
  r.innerHTML = '<div class="head"><b class="name"></b><span class="lvl"></span></div>' +
    '<div class="note"></div><div class="far"></div>' +
    '<button type="button" class="buy"><b></b><span></span></button>';
  var o = {
    el: r,
    name: r.querySelector('.name'),
    lvl: r.querySelector('.lvl'),
    note: r.querySelector('.note'),
    far: r.querySelector('.far'),
    buy: r.querySelector('.buy'),
    top: r.querySelector('.buy b'),
    sub: r.querySelector('.buy span')
  };
  if (it.kind === 'lot') {
    r.tabIndex = 0;
    r.setAttribute('role', 'button');
    r.addEventListener('click', function () {
      pick(it.lot, true);
    });
    r.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' && e.target === r) pick(it.lot, true);
    });
  }
  o.buy.addEventListener('click', function (e) {
    e.stopPropagation();
    if (buy(it.id)) afterBuy(it.id);
  });
  (it.kind === 'lot' ? els.street : els.fleet).appendChild(r);
  rows[it.id] = o;
}

function buildRows() {
  els.street.innerHTML = '';
  els.fleet.innerHTML = '';
  rows = {};
  ITEMS.forEach(makeRow);
  els.empty = document.createElement('p');
  els.empty.className = 'empty';
  els.empty.textContent = 'Nothing to hire yet. Keep opening lots.';
  els.fleet.appendChild(els.empty);
}

function updateRows() {
  var fleetShown = 0;
  ITEMS.forEach(function (it) {
    var r = rows[it.id];
    var vis = it.show();
    r.el.hidden = !vis;
    if (!vis) return;
    var lot = it.kind === 'lot';
    var full = !lot || it.lot === sel;
    if (!lot) fleetShown++;
    r.el.classList.toggle('full', full);
    r.el.style.order = lot ? (it.lot === sel ? -1 : it.lot) : 0;
    var st = lot ? S.lots[it.lot].st : 2;
    var done = it.done();
    var busy = !!(it.busy && it.busy());
    var ok = canBuy(it);
    set(r.name, it.name);
    set(r.lvl, st === 0 ? 'For sale' : st === 1 ? 'Building' : it.level() + '/' + maxOf(it));
    set(r.note, done ? 'Fully built' : it.note());
    var left = busy ? Math.ceil(D.lots[it.lot].build - S.lots[it.lot].t) : 0;
    var price = done ? '' : '$' + short(it.cost());
    var t = ok || done ? '' : eta(it);
    set(r.far, done ? 'Max' : busy ? left + 's left' : price + (t ? ' in ' + t : ''));
    set(r.top, done ? 'Maxed' : busy ? 'Building' : 'Buy ' + price);
    set(r.sub, done || busy ? (busy ? left + 's left' : '') : ok ? '' : '$' + short(it.cost() - S.cash) + ' more' + (t ? ', about ' + t : ''));
    r.buy.classList.toggle('locked', !ok);
    r.buy.setAttribute('aria-disabled', ok ? 'false' : 'true');
    r.el.classList.toggle('sel', lot && it.lot === sel);
  });
  els.empty.hidden = fleetShown > 0;
}

function hintText() {
  if (S.stars) return '';
  if (S.lots[0].lvl === 0 && !tapped) return 'Tap the ' + D.lots[0].name.toLowerCase() + ' to restock it and earn.';
  if (S.lots[0].lvl === 0) return 'Buy the first upgrade below. Every purchase changes the street.';
  if (S.lots[1] && S.lots[1].st === 0) return free ? 'Buy the ' + D.lots[1].name.toLowerCase() + ' from its row.' : 'Save up for the ' + D.lots[1].name.toLowerCase() + ', then buy it from its row.';
  return '';
}

function updateTown() {
  var n = openCount();
  set($('dname'), D.name);
  $('dbar').style.width = Math.round(100 * n / D.lots.length) + '%';
  set($('dprog'), n + ' of ' + D.lots.length + ' lots open');
  var can = canMove();
  set($('starline'), S.stars ? 'Stars: ' + S.stars + ', income x' + starMult().toFixed(1) :
    can ? 'No stars yet. Move on to earn one.' : 'No stars yet. Open the last lot to earn one.');
  var all = DISTRICTS.every(function (d, i) {
    return S.done[i] || i === S.dist;
  });
  var targets = [];
  if (can) {
    if (all && DISTRICTS.length > 1) DISTRICTS.forEach(function (d, i) { targets.push(i); });
    else targets.push(S.dist + 1 < DISTRICTS.length ? S.dist + 1 : S.dist);
  }
  var key = targets.join(',') + (can ? 'y' : 'n');
  if (key !== movesKey) {
    movesKey = key;
    els.moves.innerHTML = '';
    if (!can) {
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'wide locked';
      b.setAttribute('aria-disabled', 'true');
      b.textContent = 'Move on: open the last lot first';
      els.moves.appendChild(b);
    }
    targets.forEach(function (t) {
      var m = document.createElement('button');
      m.type = 'button';
      m.className = 'wide go';
      m.textContent = (t === S.dist ? 'Replay ' : 'Move on to ') + DISTRICTS[t].name;
      m.addEventListener('click', function () {
        ask = t;
        $('asktext').textContent = (t === S.dist ? 'Replay ' : 'Move on to ') + DISTRICTS[t].name + '? Cash, lots and your fleet reset. You keep your stars and get one more, and the sound setting stays.';
        $('askyes').textContent = t === S.dist ? 'Replay' : 'Move on';
        $('ask').hidden = false;
        els.moves.hidden = true;
        $('ask').scrollIntoView({ block: 'nearest' });
      });
      els.moves.appendChild(m);
    });
  }
  set($('snd'), 'Sound: ' + (S.snd ? 'on' : 'off'));
}

function refresh() {
  set(els.cash, free ? 'Unlimited' : '$' + short(Math.floor(S.cash)));
  set(els.rate, '$' + short(rateNow(), 1) + '/s');
  els.stars.hidden = !S.stars;
  if (S.stars) set(els.stars, '★ ' + S.stars + '  x' + starMult().toFixed(1));
  updateRows();
  updateTown();
  var h = hintText();
  els.hint.hidden = !h;
  set(els.hint, h);
  var dots = { street: false, fleet: false, town: canMove() };
  ITEMS.forEach(function (it) {
    if (canBuy(it)) dots[it.kind === 'lot' ? 'street' : 'fleet'] = true;
  });
  for (var i = 0; i < els.tabs.length; i++) {
    els.tabs[i].classList.toggle('dot', dots[els.tabs[i].getAttribute('data-tab')]);
  }
}

function setTab(t) {
  tab = t;
  ['street', 'fleet', 'town'].forEach(function (n) {
    $('list-' + n).hidden = n !== t;
  });
  for (var i = 0; i < els.tabs.length; i++) {
    var on = els.tabs[i].getAttribute('data-tab') === t;
    els.tabs[i].classList.toggle('on', on);
    els.tabs[i].setAttribute('aria-pressed', on ? 'true' : 'false');
  }
  els.sheet.scrollTop = 0;
}

// a newer call makes the callbacks of an older one do nothing
function loadStreet(earned) {
  var mine = ++gen;
  ready = false;
  failed = false;
  running = false;
  cancelAnimationFrame(raf);
  set($('loading'), 'Loading');
  $('loading').hidden = false;
  movesKey = '';
  els.away.hidden = true;
  buildRows();
  loadSprites(D.sprites, function () {
    if (mine !== gen) return;
    $('loading').hidden = true;
    fit();
    enter();
    ready = true;
    showAway(earned);
    setTab('street');
    refresh();
    go();
  }, function () {
    if (mine !== gen) return;
    failed = true;
    set($('loading'), 'Could not load the street. Tap to try again.');
  });
}

function showAway(n) {
  if (n < 1) return;
  $('awaytext').textContent = 'While you were away you earned $' + short(Math.floor(n)) + '.';
  els.away.hidden = false;
}

function frame(now) {
  if (!running) return;
  raf = requestAnimationFrame(frame);
  var ms = now - last;
  if (ms < 28) return;
  last = now;
  var dt = ms / 1000;
  frames++;
  if (dt > 5) {
    var n = away(dt);
    if (dt > 30) showAway(n);
    dt = 0.05;
  } else {
    for (var left = dt; left > 0; left -= 0.25) tick(Math.min(left, 0.25));
  }
  draw(Math.min(dt, 0.25));
  paintIn -= dt;
  if (paintIn <= 0) {
    refresh();
    paintIn = 0.25;
  }
  saveIn -= dt;
  if (saveIn <= 0) {
    els.warn.hidden = save();
    saveIn = 5;
  }
}

function go() {
  if (running) return;
  running = true;
  last = performance.now();
  raf = requestAnimationFrame(frame);
}

function hide() {
  var was = running;
  running = false;
  ptr = null;
  cancelAnimationFrame(raf);
  // a tab that was already idle must not overwrite what another tab saved
  if (was) els.warn.hidden = save();
}

function resume() {
  if (running || !ready) return;
  if (newerSave()) {
    location.reload();
    return;
  }
  buildBack();
  var gap = (Date.now() - S.saved) / 1000;
  var n = away(gap);
  if (gap > 30) showAway(n);
  refresh();
  go();
}

function copySave() {
  save();
  var code = btoa(localStorage.getItem(KEY));
  var shown = function () {
    window.prompt('Copy your save code', code);
  };
  if (!navigator.clipboard) return shown();
  navigator.clipboard.writeText(code).then(function () {
    set($('export'), 'Copied');
    setTimeout(function () {
      set($('export'), 'Copy save code');
    }, 2000);
  }, shown);
}

function useSave() {
  var code = window.prompt('This replaces your current game. Paste a save code');
  if (!code) return;
  try {
    var raw = atob(code.trim());
    var o = JSON.parse(raw);
    if (!(o.dist >= 0 && o.dist < DISTRICTS.length) || !Array.isArray(o.lots)) throw new Error('not a save');
    // stop first, hiding the page would otherwise save the old game over it
    running = false;
    cancelAnimationFrame(raf);
    localStorage.setItem(KEY, raw);
    location.reload();
  } catch (e) {
    window.alert('That is not a save code.');
  }
}

function logical(e) {
  var r = canvas.getBoundingClientRect();
  return { x: (e.clientX - r.left) * VW / r.width, y: (e.clientY - r.top) * VH / r.height };
}

function tapAt(e) {
  var p = logical(e);
  var i = lotAt(p.x, p.y);
  if (i < 0) return;
  tapped = true;
  var n = tap(i);
  if (n) {
    addFloat(i, n);
    sfx('restock');
  }
  if (sel !== i) pick(i, !onScreen(i));
  else refresh();
}

// the wheel pans the street sideways, with shift it pans up and down; the ease in camGo smooths the notches
function wheel(e) {
  if (e.ctrlKey) return;
  e.preventDefault();
  var k = e.deltaMode === 1 ? 24 : e.deltaMode === 2 ? 400 : 1;
  var d = (Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY) * k * 1.5 * DPR / SC;
  var x = cam.go ? cam.tx : cam.x;
  var y = cam.go ? cam.ty : cam.y;
  if (e.shiftKey) camGo(x, y - d);
  else camGo(x + d, y);
}

function down(e) {
  // a primary pointer replaces one whose end was never delivered
  if (ptr && !e.isPrimary) return;
  canvas.setPointerCapture(e.pointerId);
  var moving = cam.go || cam.vx !== 0 || cam.vy !== 0;
  cam.go = false;
  cam.vx = cam.vy = 0;
  ptr = { id: e.pointerId, x: e.clientX, y: e.clientY, cx: cam.x, cy: cam.y, pan: false, stop: moving, pts: [] };
}

function drag(e) {
  if (!ptr || e.pointerId !== ptr.id) return;
  var dx = e.clientX - ptr.x;
  var dy = e.clientY - ptr.y;
  if (!ptr.pan && Math.hypot(dx, dy) > (e.pointerType === 'mouse' ? 5 : 10)) {
    ptr.pan = true;
    canvas.classList.add('drag');
  }
  if (!ptr.pan) return;
  var k = SC / DPR;
  cam.x = ptr.cx - dx / k;
  cam.y = ptr.cy + dy / k;
  camClamp();
  ptr.pts.push({ t: e.timeStamp, x: cam.x, y: cam.y });
  if (ptr.pts.length > 6) ptr.pts.shift();
}

function up(e) {
  if (!ptr || e.pointerId !== ptr.id) return;
  var p = ptr;
  ptr = null;
  canvas.classList.remove('drag');
  if (e.type === 'pointercancel') return;
  if (!p.pan) {
    // a press that only stopped a gliding street is not a tap
    if (!p.stop) tapAt(e);
    return;
  }
  var a = p.pts[0];
  var b = p.pts[p.pts.length - 1];
  if (!a || b.t === a.t || e.timeStamp - b.t > 80) return;
  cam.vx = (b.x - a.x) / (b.t - a.t) * 1000;
  cam.vy = (b.y - a.y) / (b.t - a.t) * 1000;
}

function start() {
  canvas = $('view');
  els.stage = $('stage');
  els.street = $('list-street');
  els.fleet = $('list-fleet');
  els.sheet = $('sheet');
  els.cash = $('cash');
  els.rate = $('rate');
  els.stars = $('stars');
  els.hint = $('hint');
  els.away = $('away');
  els.warn = $('warn');
  els.moves = $('moves');
  els.tabs = document.querySelectorAll('#tabs button');
  loadStreet(load());
  $('loading').addEventListener('click', function () {
    if (failed) loadStreet(0);
  });

  var refit = function () {
    if (ready) fit();
  };
  if (window.ResizeObserver) new ResizeObserver(refit).observe(els.stage);
  window.addEventListener('resize', refit);
  canvas.addEventListener('pointerdown', down);
  canvas.addEventListener('pointermove', drag);
  canvas.addEventListener('pointerup', up);
  canvas.addEventListener('pointercancel', up);
  canvas.addEventListener('wheel', wheel, { passive: false });
  document.addEventListener('pointerup', wake);
  document.addEventListener('click', wake);
  $('handle').addEventListener('click', function () {
    var c = $('panel').classList.toggle('collapsed');
    els.sheet.scrollTop = 0;
    $('handle').setAttribute('aria-expanded', c ? 'false' : 'true');
    $('handle').setAttribute('aria-label', c ? 'Open the sheet' : 'Collapse the sheet');
  });
  for (var i = 0; i < els.tabs.length; i++) {
    els.tabs[i].addEventListener('click', function (e) {
      setTab(e.currentTarget.getAttribute('data-tab'));
    });
  }
  $('awayok').addEventListener('click', function () {
    els.away.hidden = true;
  });
  $('snd').addEventListener('click', function () {
    S.snd = !S.snd;
    save();
    refresh();
  });
  if (nativeApp()) set($('savenote'), 'Your game is saved on this phone. Move it to another phone with a save code.');
  $('export').addEventListener('click', copySave);
  $('import').addEventListener('click', useSave);
  $('askno').addEventListener('click', function () {
    $('ask').hidden = true;
    els.moves.hidden = false;
  });
  $('askyes').addEventListener('click', function () {
    if (!move(ask)) return;
    $('ask').hidden = true;
    els.moves.hidden = false;
    loadStreet(0);
  });
  $('reset').addEventListener('click', function () {
    $('sure').hidden = false;
    $('reset').hidden = true;
    $('sure').scrollIntoView({ block: 'nearest' });
  });
  $('no').addEventListener('click', function () {
    $('sure').hidden = true;
    $('reset').hidden = false;
  });
  $('yes').addEventListener('click', function () {
    reset();
    tapped = false;
    $('sure').hidden = true;
    $('reset').hidden = false;
    $('ask').hidden = true;
    els.moves.hidden = false;
    loadStreet(0);
  });
  document.addEventListener('visibilitychange', function () {
    if (document.hidden) hide();
    else resume();
  });
  window.addEventListener('pageshow', function () {
    if (!document.hidden) resume();
  });
  window.addEventListener('pagehide', hide);

  try {
    if (navigator.storage && navigator.storage.persist) navigator.storage.persist();
  } catch (e) {}
  if (location.protocol !== 'file:') {
    // file:// blocks the manifest fetch and logs an error
    var man = document.createElement('link');
    man.rel = 'manifest';
    man.href = 'manifest.webmanifest';
    document.head.appendChild(man);
    if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js');
  }
}

start();
