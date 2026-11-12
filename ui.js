var SND_KEY = 'mainstreet.snd';
var SND = {
  buy: ['triangle', 0.07, 0.16, [523, 784]],
  coin: ['square', 0.05, 0.1, [880, 1175]],
  done: ['triangle', 0.1, 0.25, [523, 659, 784, 1047]]
};
var ac = null;
var snd = true;
var cardId = null;
var lastTick = 0;
var shownRate = '';
var insets = [0, 0];

function $(id) {
  return document.getElementById(id);
}

function money(v) {
  if (v >= 1e9) return '$' + (v / 1e9).toFixed(2).replace(/\.?0+$/, '') + 'B';
  if (v >= 1e6) return '$' + (v / 1e6).toFixed(2).replace(/\.?0+$/, '') + 'M';
  return '$' + Math.floor(v).toLocaleString('en-US');
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

function lower(s) {
  return s.charAt(0).toLowerCase() + s.slice(1);
}

function projectInc(p) {
  var sum = 0;
  for (var i = p.first; i < Math.min(S.k, p.end); i++) sum += STEPS[i].inc;
  return sum * (done(p.id) ? 2 : 1);
}

function fitInsets() {
  var top = $('top').offsetHeight + 6;
  var bot = $('bottom').offsetHeight + 6;
  if (top !== insets[0] || bot !== insets[1]) {
    insets = [top, bot];
    View.inset(top, bot);
  }
}

function updateNext() {
  var n = upNext();
  var b = $('next');
  if (!n) {
    b.hidden = true;
    fitInsets();
    return;
  }
  b.hidden = false;
  var ok = canBuy();
  var html = 'Next: ' + PROJ[n.p].name + ', ' + lower(n.name);
  if (!ok) html += '<small>' + Math.ceil(waitFor()) + ' s to go</small>';
  var t = $('next-txt');
  if (t.getAttribute('data-h') !== html) {
    t.innerHTML = html;
    t.setAttribute('data-h', html);
  }
  $('next-cost').textContent = money(n.cost);
  b.classList.toggle('wait', !ok);
  $('next-fill').style.width = (ok ? 0 : Math.min(100, S.cash / n.cost * 100)) + '%';
  fitInsets();
}

function updateHud() {
  $('cash-n').textContent = free ? '∞' : money(S.cash);
  var r = '+' + money(rate()) + '/s';
  if (r !== shownRate) {
    $('rate').textContent = r;
    shownRate = r;
  }
  var sw = $('swap');
  sw.hidden = got('class1') === 0;
  sw.textContent = View.view() === 'town' ? 'School' : 'Town';
}

// the card for a project, a locked block or the whole school
function showCard(id) {
  cardId = id;
  var proj = PROJ[id];
  var land = LANDS[id];
  var name = proj ? proj.name : land.name;
  var n = 0;
  var m = 1;
  var inc = 0;
  var before = '';
  var cur = upNext();
  var here = false;
  if (id === 'school') {
    m = 0;
    PROJECTS.forEach(function (p) {
      if (!p.room) return;
      n += got(p.id);
      m += total(p.id);
      inc += projectInc(p);
    });
    before = 'Main Street';
    here = !!cur && !!PROJ[cur.p].room;
  } else if (proj) {
    n = got(id);
    m = total(id);
    inc = projectInc(proj);
    before = PROJECTS[PROJECTS.indexOf(proj) - 1] ? PROJECTS[PROJECTS.indexOf(proj) - 1].name : '';
    here = !!cur && cur.p === id;
  }
  var info;
  if (!proj && id !== 'school') info = land.sub + '.';
  else if (n === m) info = n + ' of ' + m + ', done. +' + money(inc) + '/s';
  else if (n > 0 || here) info = n + ' of ' + m + '. +' + money(inc) + '/s';
  else info = 'Opens after ' + before + '.';
  $('card-name').textContent = name;
  $('card-bar').style.width = (n / m * 100) + '%';
  $('card-info').textContent = info;
  var go = $('card-go');
  go.hidden = !here;
  if (here) {
    go.textContent = 'Upgrade: ' + lower(cur.name) + '  ' + money(cur.cost);
    go.disabled = !canBuy();
  }
  $('card').hidden = false;
  fitInsets();
}

function closeCard() {
  cardId = null;
  $('card').hidden = true;
  fitInsets();
}

function press() {
  wake();
  var res = buy();
  if (!res) return;
  var t = View.stepped(res, performance.now());
  View.populate();
  sfx('buy');
  buzz();
  save();
  updateHud();
  updateNext();
  if (cardId) showCard(cardId);
  if (res.fin) setTimeout(function () { celebrate(res); }, t * 1000 + 700);
}

function celebrate(res) {
  View.confetti();
  sfx('done');
  var b = $('banner');
  b.innerHTML = PROJ[res.step.p].name + ' done!<small>Its income doubles</small>';
  if (res.end) b.innerHTML = 'The School is done!<small>Its income doubles</small>';
  b.hidden = false;
  b.style.animation = 'none';
  void b.offsetWidth;
  b.style.animation = '';
  setTimeout(function () {
    b.hidden = true;
    if (res.end) $('end').hidden = false;
  }, 2600);
}

function showAway(a) {
  var m = Math.round(a.secs / 60);
  var t = m >= 60 ? Math.floor(m / 60) + ' h' + (m % 60 ? ' ' + (m % 60) + ' min' : '') : m + ' min';
  $('away-txt').textContent = 'You were away for ' + t + ' and the town earned ' + money(a.gain) + '.';
  $('away').hidden = false;
}

function schoolRoom() {
  var n = upNext();
  return n && PROJ[n.p].room ? n.p : 'class1';
}

function onTap(h) {
  wake();
  if (h.kind === 'coin') {
    View.float(h.x, h.y - 10, '+' + money(collect()), performance.now());
    sfx('coin');
  } else if (h.kind === 'none') {
    closeCard();
  } else if (h.kind === 'block' && h.id === 'school' && got('class1') > 0) {
    closeCard();
    View.go('school', View.roomY(schoolRoom()));
  } else {
    showCard(h.id);
  }
}

function setSound() {
  $('m-snd').textContent = 'Sound: ' + (snd ? 'on' : 'off');
}

function flash(id, text, old) {
  $(id).textContent = text;
  setTimeout(function () { $(id).textContent = old; }, 1500);
}

function wire() {
  $('next').addEventListener('click', press);
  $('card-go').addEventListener('click', press);
  $('card-x').addEventListener('click', closeCard);
  $('swap').addEventListener('click', function () {
    closeCard();
    if (View.view() === 'town') View.go('school', View.roomY(schoolRoom()));
    else View.go('town', View.blockY('school'));
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
    View.refresh();
    View.focusNow();
    closeCard();
    $('menu').hidden = true;
  });
  var armed = false;
  $('m-reset').addEventListener('click', function () {
    if (!armed) {
      armed = true;
      $('m-reset').textContent = 'Tap again to erase';
      setTimeout(function () {
        armed = false;
        $('m-reset').textContent = 'Reset town';
      }, 3000);
      return;
    }
    armed = false;
    reset();
    View.refresh();
    View.focusNow();
    closeCard();
    $('m-reset').textContent = 'Reset town';
    $('menu').hidden = true;
    $('end').hidden = true;
  });
  $('away-ok').addEventListener('click', function () { $('away').hidden = true; });
  $('end-ok').addEventListener('click', function () { $('end').hidden = true; });
  document.addEventListener('pointerup', wake);
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
    if (sec > 60) showAway(away(sec));
  });
}

function loop(t) {
  tick(Math.min(1, (t - lastTick) / 1000));
  lastTick = t;
  View.draw(t);
  updateHud();
  updateNext();
  requestAnimationFrame(loop);
}

function start() {
  try {
    snd = localStorage.getItem(SND_KEY) !== '0';
  } catch (e) {}
  var gone = load();
  View.init($('view'), onTap);
  wire();
  var wait = setInterval(function () {
    if (!View.ready()) return;
    clearInterval(wait);
    View.refresh();
    View.focusNow();
    if (gone) showAway(gone);
    lastTick = performance.now();
    requestAnimationFrame(loop);
    setInterval(save, 5000);
  }, 50);
}

start();
