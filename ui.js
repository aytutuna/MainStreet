var SND_KEY = 'mainstreet.snd';
var SND = {
  buy: ['triangle', 0.07, 0.16, [523, 784]],
  coin: ['square', 0.05, 0.1, [880, 1175]],
  till: ['sine', 0.05, 0.12, [1568, 2093]],
  done: ['triangle', 0.1, 0.25, [523, 659, 784, 1047]],
  mile: ['triangle', 0.08, 0.22, [523, 659, 784, 1047, 1319, 1568]],
  unlock: ['triangle', 0.09, 0.2, [392, 523, 659, 784]],
  tap: ['sine', 0.04, 0.05, [1000]],
  gift: ['triangle', 0.07, 0.2, [784, 988, 1175, 1568]],
  stock: ['sine', 0.06, 0.1, [196]]
};
var VOL = { till: 0.3, stock: 0.4, tap: 0.5, buy: 0.6, done: 0.6, unlock: 0.6, mile: 0.6, gift: 0.6, coins: 0.35, gems: 0.35,
  card: 0.4, close: 0.4, broke: 0.4, rush: 0.55, amb: 0.5 };
// sounds heard over and over get a slightly different pitch each time
var VARY = { till: 1, stock: 1, tap: 1, coins: 1, gems: 1 };
var hum = null;
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
var toastTimer = 0;
var testTaps = 0;
var FREE_KEY = 'mainstreet.free';
var free = false;
var chips = [];
var goalHold = -1;
var goalUntil = 0;
var HINT_KEY = 'mainstreet.hints';
var hinted = {};
var dailyAsked = -1;
var RADIO_KEY = 'mainstreet.radio';
var radio = { sel: 'mix', vol: 0.5, tip: 0 };
var mus = null;
var cur = null;
var nxt = null;
var order = [];
var skips = 0;
var unsure = false;
var unsureT = 0;
var restT = 0;
var streamOn = false;
var stUrl = 0;
var stEl = null;
var stState = '';
var stTitle = '';
var otherOn = false;
var adOpen = false;
var duck = 1;
var radioOpen = '';
var MIXER_KEY = 'mainstreet.mixer';
// store sounds and effects as the mixer sliders hold them; the music level is radio.vol
var lvl = { amb: 1 / 3, fx: 0.8 };
var humG = null;
// the button that closes each panel a tap outside or a swipe can dismiss; the away box is left out since it pays out
var CLOSE = { pack: 'pack-x', shop: 'shop-x', daily: 'daily-x', sell: 'sell-x', regs: 'regs-x', boost: 'boost-x', radio: 'radio-x', langs: 'langs-x',
  sound: 'sound-x', erase: 'erase-x', stats: 'stats-x', menu: 'm-ok', ach: 'ach-x', look: 'look-x' };
var dragging = false;
var IOS = /iP(hone|ad|od)/.test(navigator.userAgent) || navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1;

function $(id) {
  return document.getElementById(id);
}

function money(v) {
  var m = tl('num.money', { n: short(v) });
  // the symbol stays on the side the language put it, whatever the line's direction is
  return I18N.rtl ? '⁦' + m + '⁩' : m;
}

function wake() {
  if (!snd) return;
  if (navigator.audioSession) navigator.audioSession.type = 'ambient';
  if (!ac && window.AudioContext) {
    ac = new AudioContext();
    out = ac.createGain();
    out.connect(ac.destination);
    mus = ac.createGain();
    mus.gain.value = radio.vol * duck;
    mus.connect(ac.destination);
    Object.keys(VOL).forEach(loadSound);
  }
  if (ac && ac.state !== 'running') ac.resume();
  ambience();
  radioSync();
}

function loadSound(name) {
  var req = new XMLHttpRequest();
  req.open('GET', 'assets/sounds/' + name + '.wav');
  req.responseType = 'arraybuffer';
  req.onload = function () {
    if (req.status !== 200) return;
    ac.decodeAudioData(req.response, function (b) {
      buf[name] = b;
      if (name === 'amb') ambience();
    }, function () {});
  };
  req.send();
}

// rate shifts the pitch, vol scales the loudness
function sfx(name, rate, vol) {
  if (!ac || !snd || document.hidden) return;
  if (ac.state === 'suspended' && otherOn && !adOpen) ac.resume();
  else if (ac.state !== 'running') return;
  rest();
  if (VARY[name]) rate = (rate || 1) * (0.95 + Math.random() * 0.1);
  if (buf[name]) {
    var s = ac.createBufferSource();
    var v = ac.createGain();
    v.gain.value = VOL[name] * (vol || 1) * lvl.fx * (name === 'till' || name === 'stock' ? near() : 1);
    s.playbackRate.value = rate || 1;
    s.buffer = buf[name];
    s.connect(v);
    v.connect(out);
    s.start();
    return;
  }
  var t = ac.currentTime;
  var c = SND[name];
  if (!c) return;
  c[3].forEach(function (f, i) {
    var at = t + i * c[1];
    var o = ac.createOscillator();
    var g = ac.createGain();
    o.type = c[0];
    o.frequency.value = f * (rate || 1);
    g.gain.setValueAtTime(0.0001, at);
    g.gain.linearRampToValueAtTime(0.05 * (vol || 1) * lvl.fx, at + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, at + c[2]);
    o.connect(g);
    g.connect(ac.destination);
    o.start(at);
    o.stop(at + c[2] + 0.02);
  });
}

function tell(msg) {
  var h = window.webkit && window.webkit.messageHandlers && window.webkit.messageHandlers.notify;
  if (h) h.postMessage(msg);
}

// the system asks once, the first time the player has something to be told about
function askNotify() {
  if (S.ask) return;
  S.ask = 1;
  tell({ cmd: 'ask' });
}

// the shopping mall murmur, looped under everything while sound is on and no other music plays
function ambience() {
  if (!ac || !buf.amb) return;
  if (!snd || otherOn) {
    if (hum) hum.stop();
    hum = null;
    return;
  }
  if (hum) return;
  hum = ac.createBufferSource();
  humG = ac.createGain();
  ambVol();
  hum.buffer = buf.amb;
  hum.loop = true;
  hum.connect(humG);
  humG.connect(out);
  hum.start();
}

function ambVol() {
  if (humG) humG.gain.setTargetAtTime(VOL.amb * lvl.amb * near(), ac.currentTime, 0.15);
}

// the store's own sounds get louder as the camera closes in and fade as it pulls back
function near() {
  return window.View ? Math.max(0.2, Math.min(1.8, Math.pow(View.zoom(), 0.9))) : 1;
}

function saveMixer() {
  try {
    localStorage.setItem(MIXER_KEY, JSON.stringify(lvl));
  } catch (e) {}
}

var SLIDERS = [
  ['sv-mus', function () { return radio.vol; }, function (v) { radio.vol = v; radioVol(); }],
  ['sv-amb', function () { return lvl.amb; }, function (v) { lvl.amb = v; ambVol(); }],
  ['sv-fx', function () { return lvl.fx; }, function (v) { lvl.fx = v; }]
];

function paintSound() {
  SLIDERS.forEach(function (s) {
    var v = Math.round(s[1]() * 100);
    $(s[0]).value = v;
    $(s[0] + '-n').textContent = v + '%';
  });
  $('sound-off').hidden = snd;
}

function openSound() {
  paintSound();
  $('sound').hidden = false;
  sfx('card');
}

function wireSound() {
  SLIDERS.forEach(function (s) {
    var el = $(s[0]);
    el.addEventListener('input', function () {
      s[2](this.value / 100);
      $(s[0] + '-n').textContent = this.value + '%';
    });
    el.addEventListener('change', function () {
      if (s[0] === 'sv-mus') saveRadio();
      else saveMixer();
      if (s[0] === 'sv-fx') sfx('buy');
    });
  });
  $('sound-x').addEventListener('click', function () { $('sound').hidden = true; });
  $('m-mix').addEventListener('click', function () {
    $('menu').hidden = true;
    openSound();
  });
  $('r-mix').addEventListener('click', function () {
    $('radio').hidden = true;
    openSound();
  });
}

function station(id) {
  for (var i = 0; i < RADIO.length; i++) if (RADIO[i].id === id) return RADIO[i];
  return null;
}

function langGroup() {
  var l = (navigator.language || 'en').toLowerCase();
  return RADIO_LANG[l] || RADIO_LANG[l.slice(0, 2)] || '';
}

// the phone's group comes first, the rest stay in the order of data.js
function radioGroups() {
  var groups = [];
  RADIO.forEach(function (s) { if (groups.indexOf(s.g) < 0) groups.push(s.g); });
  var mine = groups.indexOf(langGroup());
  if (mine > 0) groups.unshift(groups.splice(mine, 1)[0]);
  return groups;
}

function saveRadio() {
  try {
    localStorage.setItem(RADIO_KEY, JSON.stringify(radio));
  } catch (e) {}
}

function radioVol() {
  var v = radio.vol * duck;
  if (mus) mus.gain.setTargetAtTime(v, ac.currentTime, 0.2);
  if (!streamOn) return;
  if (native()) post({ cmd: 'radio', vol: v });
  else if (stEl) stEl.volume = v;
}

// a rush plays over the radio a little quieter
function duckRadio() {
  var d = rush ? 0.6 : 1;
  if (d === duck) return;
  duck = d;
  radioVol();
}

function mixPick() {
  if (!order.length) {
    for (var i = 0; i < MIX.length; i++) order.push(i);
    for (i = order.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var t = order[i];
      order[i] = order[j];
      order[j] = t;
    }
  }
  return order.pop();
}

// a play() that a pause or a new source cuts short is not an error
function go(el, fail) {
  var p = el.play();
  if (p) p.catch(function (e) { if (fail && e.name === 'NotSupportedError') fail(); });
}

function mixEl() {
  var i = mixPick();
  var a = new Audio('assets/music/' + MIX[i].f + '.m4a');
  a.n = i;
  a.preload = 'auto';
  var src = ac.createMediaElementSource(a);
  src.connect(mus);
  a.addEventListener('playing', function () { skips = 0; });
  a.addEventListener('ended', function () {
    src.disconnect();
    mixNext();
  });
  a.addEventListener('error', function () {
    src.disconnect();
    a.bad = true;
    if (a === cur) mixSkip();
  });
  // the web view pauses its media when another app takes the audio focus
  a.addEventListener('pause', function () {
    if (!a.hold && !a.ended) askOther();
  });
  return a;
}

// the next song is already loading while one plays, so they follow each other without a gap
function mixSkip() {
  if (++skips < MIX.length) mixNext();
}

function mixNext() {
  var a = cur = nxt || mixEl();
  nxt = mixEl();
  if (a.bad) return mixSkip();
  go(a, function () { if (a === cur) mixSkip(); });
  radioPaint();
}

function streamPlay() {
  var u = station(radio.sel).urls[stUrl];
  stState = 'buffering';
  if (native()) post({ cmd: 'radio', url: u, vol: radio.vol * duck });
  else if (/\.m3u8/.test(u) && !new Audio().canPlayType('application/vnd.apple.mpegurl')) return streamFail();
  else {
    if (!stEl) {
      stEl = new Audio();
      stEl.addEventListener('playing', function () { streamEvent('playing'); });
      stEl.addEventListener('waiting', function () { streamEvent('buffering'); });
      stEl.addEventListener('error', function () { if (streamOn) streamFail(); });
    }
    stEl.src = u;
    stEl.volume = radio.vol * duck;
    go(stEl);
  }
  radioPaint();
}

function streamEvent(state) {
  stState = state;
  radioPaint();
}

// the alternate url is tried next, then the station is given up on
function streamFail() {
  if (++stUrl < station(radio.sel).urls.length) return streamPlay();
  stState = 'error';
  radioPaint();
}

function streamStop() {
  streamOn = false;
  stState = '';
  stTitle = '';
  if (native()) post({ cmd: 'radio', stop: true });
  else if (stEl) {
    stEl.pause();
    stEl.removeAttribute('src');
    stEl.load();
  }
}

// the radio only plays while the game is in front, sound is on, no ad is open and no other music is playing
function radioSync() {
  var on = snd && !document.hidden && !adOpen && !otherOn && !unsure && radio.sel !== 'off';
  var mix = on && radio.sel === 'mix';
  if (mix && ac) {
    if (!cur) mixNext();
    else if (cur.paused) {
      cur.hold = false;
      go(cur);
    }
  } else if (cur && !cur.paused) {
    cur.hold = true;
    cur.pause();
  }
  var st = on && !mix;
  if (st && !streamOn) {
    streamOn = true;
    stUrl = 0;
    streamPlay();
  } else if (!st && streamOn) streamStop();
  ambience();
  radioPaint();
  if (otherOn) rest();
  else if (ac && ac.state === 'suspended' && snd && !adOpen && !document.hidden) ac.resume();
  if (mix && cur && !radio.tip && langGroup()) {
    radio.tip = 1;
    saveRadio();
    banner('<b>' + tl('radio.mix.name') + '</b><small>' + tl('radio.try', { group: tl('radio.group.' + langGroup()) }) + '</small>', 0);
  }
}

// While another app plays, the audio context idles between effects so the app can tell that music from the game's own
function rest() {
  clearTimeout(restT);
  if (!otherOn || !native()) return;
  restT = setTimeout(function () {
    if (otherOn && ac && !adOpen && !document.hidden) ac.suspend();
  }, 2500);
}

// Whether another app plays is not known after coming to the front until the app answers, so the radio waits for it
function askOther() {
  if (!native()) return;
  unsure = true;
  clearTimeout(unsureT);
  unsureT = setTimeout(function () {
    unsure = false;
    radioSync();
  }, 2000);
  post({ cmd: 'radio', check: true });
}

function radioEvent(ev) {
  if (ev.t === 'other') {
    otherOn = !!ev.on;
    unsure = false;
    clearTimeout(unsureT);
    radioSync();
  } else if (streamOn && ev.url === station(radio.sel).urls[stUrl]) {
    if (ev.state === 'error') return streamFail();
    stState = ev.state;
    stTitle = ev.title || stTitle;
    radioPaint();
  }
}

// a stream that gave out, or that the system paused, can be started again from the panel
function stOff() {
  return stState === 'error' || stState === 'paused';
}

function nowText() {
  if (otherOn) return tl('radio.now.other');
  if (radio.sel === 'off') return tl('radio.now.off');
  if (!snd) return tl('radio.now.sound_off');
  if (radio.sel === 'mix') return cur ? tl('radio.now.song', { title: MIX[cur.n].t, artist: MIX[cur.n].a }) : tl('radio.mix.name');
  var s = station(radio.sel);
  if (stState === 'error') return tl('radio.now.error');
  if (stState === 'paused') return tl('radio.now.paused', { name: s.name });
  if (stState === 'buffering') return tl('radio.now.connecting', { name: s.name });
  return stTitle ? tl('radio.now.playing', { name: s.name, title: stTitle }) : s.name;
}

function radioPaint() {
  var t = nowText();
  set(shown, 'npt', $('np'), 'title', t);
  set(shown, 'nph', $('np'), 'hidden', radio.sel === 'off' || !snd);
  set(shown, 'rnow', $('r-now'), 'textContent', t);
  var st = stOff() && streamOn ? 'bad' : streamOn && stState === 'buffering' ? 'load' : '';
  if (set(shown, 'rbad', {}, 'x', st) && !$('radio').hidden) paintRadio();
}

function radioRow(id, name, line, pick, done) {
  var on = radio.sel === id && !(stOff() && streamOn);
  // a station takes a few seconds to connect, so its button says so until the sound starts
  var load = on && streamOn && stState === 'buffering';
  var label = load ? '<i class="spin"></i>' + tl('radio.loading') : on ? done : radio.sel === id ? tl(stState === 'paused' ? 'radio.resume' : 'radio.retry') : pick;
  return '<div class="offer"><div><b>' + name + '</b><span>' + line + '</span></div><button type="button" class="btn' + (on ? '' : ' alt') + '" data-r="' + id + '"' +
    (on ? ' disabled' : '') + '>' + label + '</button></div>';
}

function paintRadio() {
  $('r-vol').value = Math.round(radio.vol * 100);
  var h = radioRow('off', tl('radio.off.name'), tl('radio.off.line'), tl('radio.turn_off'), tl('radio.off.state')) +
    radioRow('mix', tl('radio.mix.name'), tl('radio.mix.line', { n: MIX.length }), tl('radio.play'), tl('radio.on'));
  radioGroups().forEach(function (g) {
    var open = g === radioOpen;
    h += '<button type="button" class="btn alt rg" data-g="' + g + '">' + tl('radio.group.' + g) + '<i>' + (open ? '-' : '+') + '</i></button>';
    if (open) RADIO.forEach(function (s) { if (s.g === g) h += radioRow(s.id, s.name, s.line, tl('radio.play'), tl('radio.on')); });
  });
  $('r-list').innerHTML = h;
}

function openRadio() {
  var s = station(radio.sel);
  radioOpen = s ? s.g : radioGroups()[0];
  paintRadio();
  radioPaint();
  $('radio').hidden = false;
  sfx('card');
}

function pickRadio(id) {
  if (streamOn) streamStop();
  radio.sel = id;
  saveRadio();
  radioSync();
  paintRadio();
}

function openLangs() {
  var h = '';
  LANGS.forEach(function (l) {
    if (!ready(l[0])) return;
    h += '<button type="button" class="btn' + (l[0] === I18N.code ? '' : ' alt') + '" data-l="' + l[0] + '" lang="' + l[2] + '" dir="auto">' + l[1] + '</button>';
  });
  $('lang-list').innerHTML = h;
  $('menu').hidden = true;
  $('langs').hidden = false;
  sfx('card');
}

function wireLangs() {
  // one language is no choice
  $('m-lang').hidden = LANG_READY.length < 2;
  $('m-lang').textContent = tl('menu.language', { name: langEntry(I18N.code)[1] });
  $('m-lang').addEventListener('click', openLangs);
  $('langs-x').addEventListener('click', function () { $('langs').hidden = true; });
  $('lang-list').addEventListener('click', function (e) {
    var b = e.target.closest('button');
    if (b) setLang(b.dataset.l);
  });
}

function wireRadio() {
  $('m-radio').addEventListener('click', function () {
    $('menu').hidden = true;
    openRadio();
  });
  $('np').addEventListener('click', openRadio);
  $('radio-x').addEventListener('click', function () { $('radio').hidden = true; });
  $('r-vol').addEventListener('input', function () {
    radio.vol = this.value / 100;
    radioVol();
  });
  $('r-vol').addEventListener('change', saveRadio);
  $('r-list').addEventListener('click', function (e) {
    var b = e.target.closest('button');
    var d = b && b.dataset;
    if (!d) return;
    if (d.r) {
      sfx('tap');
      pickRadio(d.r);
    } else if (d.g) {
      radioOpen = radioOpen === d.g ? '' : d.g;
      paintRadio();
    }
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
  if (dragging) return;
  var top = $('top').getBoundingClientRect().bottom + 6;
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

// labels that must stay on one line shrink until they fit, so a long translation loses size instead of letters
var FIT = '#cash b, #rate, .chip span, #tabs button span, #st-grid b, .l1 b, .pr em, .btn, .offer b';
var fitEpoch = 0;
var fitSteps = [1, 0.92, 0.84, 0.76, 0.7, 0.65];
var fitQueue = [];

// one measure, one write: the size is worked out from how far the text overflows and snapped to a few steps, so digits
// changing in a pill do not make it jitter. Once shrunk a label only shrinks more until its box or the language changes.
function fitOne(el) {
  if (!el.offsetParent) return;
  var cw = el.clientWidth;
  var key = fitEpoch + '|' + cw + '|' + el.textContent;
  if (el.fit === key) return;
  var layout = fitEpoch + '|' + cw;
  if (el.fitLayout !== layout) {
    el.fitLayout = layout;
    el.fitBase = 0;
    el.style.fontSize = '';
  }
  el.fit = key;
  var sw = el.scrollWidth;
  if (sw <= cw) return;
  var cur = parseFloat(getComputedStyle(el).fontSize);
  if (!el.fitBase) el.fitBase = cur;
  var base = el.fitBase;
  var want = cur * cw / sw;
  // the largest step that still fits, the smallest when none does
  var i = 0;
  while (i < fitSteps.length - 1 && base * fitSteps[i] > want) i++;
  var px = base * fitSteps[i];
  if (px < cur - 0.01) el.style.fontSize = px + 'px';
}

function fitAll(root) {
  var all = root.querySelectorAll(FIT);
  for (var i = 0; i < all.length; i++) fitOne(all[i]);
}

function fitFlush() {
  var q = fitQueue;
  fitQueue = [];
  for (var i = 0; i < q.length; i++) {
    var t = q[i];
    if (q.indexOf(t) !== i || !t.isConnected) continue;
    if (t === document) fitAll(document);
    else {
      var up = t.closest(FIT);
      if (up) fitOne(up);
      fitAll(t);
    }
  }
}

function fitWire() {
  var queued = false;
  function ask(node) {
    fitQueue.push(node);
    if (queued) return;
    queued = true;
    requestAnimationFrame(function () {
      queued = false;
      fitFlush();
    });
  }
  new MutationObserver(function (recs) {
    for (var i = 0; i < recs.length; i++) {
      var t = recs[i].target;
      if (t.nodeType === 3) t = t.parentNode;
      if (t && t.closest && !t.closest('#fly, .pop')) ask(t);
    }
  }).observe($('app'), { childList: true, characterData: true, subtree: true, attributes: true, attributeFilter: ['hidden'] });
  function all() {
    fitEpoch++;
    ask(document);
  }
  window.addEventListener('resize', all);
  if (document.fonts) {
    document.fonts.ready.then(all);
    // a face that arrives late (the extended Latin Lilita, a system fallback) changes every width again
    document.fonts.addEventListener('loadingdone', all);
  }
  ask(document);
}

// writes only when the value changed, for texts repainted every frame
function put(el, prop, v) {
  var k = '_' + prop;
  if (el[k] === v) return;
  el[k] = v;
  el[prop] = v;
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
    land(targetId === 'gems' ? 'gems' : 'coins', i);
  }
  setTimeout(function () { bumpEl(targetId === 'gems' ? 'gem-n' : 'cash-n'); }, 560);
}

// a ring that swells and fades where something was tapped
function ring(x, y) {
  var d = document.createElement('i');
  d.className = 'ring';
  d.style.left = x + 'px';
  d.style.top = y + 'px';
  $('fly').appendChild(d);
  var a = d.animate([{ transform: 'translate(-50%, -50%) scale(0.2)', opacity: 0.9 }, { transform: 'translate(-50%, -50%) scale(2.6)', opacity: 0 }],
    { duration: 520, easing: 'ease-out' });
  a.onfinish = function () { d.remove(); };
}

// each flying icon ticks as it reaches the counter, a little higher each time
function land(name, i) {
  setTimeout(function () { sfx(name, 1 + i * 0.04); }, 650 + i * 85);
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
    hideToast();
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
  if (v >= 10) return fmtn(Math.round(v));
  var r = Math.round(v * 10) / 10;
  return r ? fmtn(r) : v > 0 ? '<0.1' : '0';
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
  set(k, 'up', b, 'innerHTML', locked ? tl('common.locked') : label + '<small>' + money(c) + '</small>');
  // too dear stays tappable, so the tap can say there is not enough cash yet
  set(k, 'upd', b, 'disabled', locked);
  flag(k, 'lk', b, 'lk', locked);
  flag(k, 'poor', b, 'poor', poor);
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
  serv: function (n) { return tl('fx.shoppers_min', { v: perMin(inRate() / (1 + SERV * S.pl.serv) * SERV * (n || 1)) }); },
  rest: function (n) { return tl('fx.rest', { n: Math.round(REST * 100 * (n || 1)) }); },
  lounge: function (n) { return tl('fx.lounge', { n: Math.round((1 - Math.pow(LOUNGE, n || 1)) * 100) }); },
  head: function (n) { return tl('fx.head', { n: Math.round(HEAD * 100 * (n || 1)), h: n || 1 }); }
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
  if (id === 'hall' && up > 0) return tl('fx.shoppers_min', { v: perMin(up) });
  if (id === 'dock' && up > 0) return tl('fx.restocked_min', { v: perMin(up) });
  if (id === 'dock' && now[2] > was[2]) return tl('fx.restocked_min', { v: perMin(now[2] - was[2]) });
  if (now[0] > was[0]) return tl('fx.shoppers_min', { v: perMin(now[0] - was[0]) });
  var g = gains[id + ':' + j];
  if (g > 0.005) return tl('fx.money_s', { v: money(g) });
  return id === 'hall' ? tl('fx.sales_pct', { n: HALL_BOOST * 100 }) : '';
}

// what a department item's level changes for each shopper or stocker
function stat(id, x) {
  if (x.stat === 'sell') return tl('fx.per_shopper', { v: money(perSell(id) * bmul()) });
  if (x.stat === 'draw') {
    var n = DRAW * 60 * (1 + SERV * S.pl.serv);
    return tl('fx.shoppers_min', { v: n.toFixed(n < 1 ? 2 : 1) });
  }
  return tl('fx.stocking', { n: Math.round((1 - STAFF) * 100) });
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
    row.innerHTML = '<div class="pic"><img class="ic" alt=""></div><div class="l1"><b></b></div><div class="segs"></div>' +
      '<div class="l3 fx"><span></span></div><div class="btns"><button type="button" class="up"></button></div>';
    var q = { el: row, k: {}, pic: row.querySelector('.ic'), nm: row.querySelector('b'), n: row.querySelector('.segs'), fx: row.querySelector('.fx span'),
      up: row.querySelector('.up') };
    for (var s = 0; s < (x.got || 0) + x.at.length; s++) q.n.appendChild(document.createElement('i'));
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
  set(k, 'lv', r.lv, 'innerHTML', tl('card.lv', { n: e.l, max: UPS }) + ' ' + starRow(n));
  r.fill.style.width = (n >= STAR_AT.length ? 100 : (e.l - from) / (STAR_AT[n] - from) * 100) + '%';
  set(k, 'bt', r.bt, 'textContent', n >= STAR_AT.length ? tl('card.sales_x', { mul: Math.pow(STAR_MUL, n) }) :
    tl('card.next_star', { n: STAR_AT[n] - e.l, star: n + 1, mul: Math.pow(STAR_MUL, n + 1) }));
}

// the header of a place's card; Checkouts and the Stockroom show how loaded they are
function placeHead(r) {
  var id = r.id;
  var k = r.k;
  var p = PL[id];
  var box = r.el.firstChild;
  set(k, 'lv', r.lv, 'textContent', tl('card.lv', { n: S.pl[id], max: p.cost.length }));
  flag(k, 'nobar', box, 'nobar', id !== 'hall' && id !== 'dock');
  loadBar(r, box, id);
  var hint = ROOMFX[id] && S.pl[id] ? tl('card.now', { fx: ROOMFX[id](S.pl[id]) }) : '';
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
  set(k, 'bt', r.bt, 'textContent', tl(hall ? 'card.load.tills' : 'card.load.restock', { n: perMin(n), cap: perMin(cap) }));
  flag(k, 'rd', box, 'rd', hall && linesFull() || !hall && shelvesOut());
  var lim = cap < n;
  flag(k, 'lim', box, 'lim', lim);
  return lim ? tl(hall ? 'card.fix.lanes' : 'card.fix.stockers') : '';
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
    var c = done ? 0 : p ? placeCost(id, j) : pieceCost(id, piece);
    set(qk, 'nm', q.nm, 'textContent', done ? x.name : name);
    var hl = !!bestOpt && bestOpt.id === id && bestOpt.item === j;
    flag(qk, 'best', q.el, 'best', hl);
    flag(qk, 'done', q.el, 'done', done);
    flag(qk, 'sel', q.el, 'sel', j === cardSel);
    var got = x.got || 0;
    if (set(qk, 'n', q.n, 'title', got + lvl + '/' + (got + x.at.length))) {
      for (var s = 0; s < q.n.children.length; s++) q.n.children[s].className = s < got + lvl ? 'on' : '';
    }
    set(qk, 'fx', q.fx, 'textContent', done ? '' : effect(id, x, j));
    if (set(qk, 'pc', q.pic, 'title', name)) q.pic.src = p ? placeIcon(id, piece + 1) : upIcon(id, piece);
    if (done || !c) {
      set(qk, 'up', q.up, 'innerHTML', '✓');
      set(qk, 'upd', q.up, 'disabled', true);
      flag(qk, 'lk', q.up, 'lk', false);
      flag(qk, 'poor', q.up, 'poor', false);
    } else buyBtn(qk, q.up, '', c, false);
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
    set(k, 'lv', r.lv, 'textContent', l ? tl('card.lv', { n: l, max: p.cost.length }) : '');
    flag(k, 'nobar', r.el, 'nobar', !hall && !dock);
    var hint = loadBar(r, r.el, id);
    set(k, 'ms', r.ms, 'textContent', !open ? tl('card.open_first', { name: BZ[p.after].name }) : !built ? tl('card.next', { name: p.next[0] }) : hint ? hint :
      c ? p.items.map(function (x) { return x.name; }).join(tl('common.list_sep')) : tl('card.all_built'));
    var newLv = set(k, 'nxl', r.nx.dataset, 'lv', open && !built ? 1 : '');
    if (set(k, 'nxk', r.nx, 'title', open && !built ? p.next[0] : '') || newLv) {
      if (open && !built) r.nx.src = placeIcon(id, 1);
      else r.nx.removeAttribute('src');
    }
    if (built) {
      set(k, 'up', r.up, 'innerHTML', tl('card.items'));
      set(k, 'upd', r.up, 'disabled', false);
      flag(k, 'lk', r.up, 'lk', false);
      flag(k, 'poor', r.up, 'poor', false);
    } else buyBtn(k, r.up, tl('card.build'), c, !open);
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
    set(k, 'ms', r.ms, 'textContent', avail(id) ? tl('card.in_basket', { name: upName(id, 0) }) : far(id) ? tl('card.opens_later') : tl('card.open_first', { name: BIZ[BZ[id].i - 1].name }));
    if (set(k, 'nxk', r.nx, 'title', avail(id) ? upName(id, 0) : '')) {
      if (avail(id)) r.nx.src = upIcon(id, 0);
      else r.nx.removeAttribute('src');
    }
    buyBtn(k, r.up, tl('card.open'), u, !avail(id));
    flag(k, 'uphl', r.up, 'hl', hl);
    return;
  }
  var n = deptStars(id);
  var from = n ? STAR_AT[n - 1] : 0;
  set(k, 'lv', r.lv, 'innerHTML', tl('card.lv', { n: e.l, max: UPS }) + ' ' + starRow(n));
  set(k, 'ms', r.ms, 'textContent', n >= STAR_AT.length ? tl('card.stars_all', { mul: Math.pow(STAR_MUL, n) }) :
    tl('card.star_at', { star: n + 1, level: STAR_AT[n], mul: Math.pow(STAR_MUL, n + 1) }));
  if (set(k, 'nxk', r.nx, 'title', '')) r.nx.removeAttribute('src');
  set(k, 'up', r.up, 'innerHTML', tl('card.items'));
  set(k, 'upd', r.up, 'disabled', false);
  flag(k, 'lk', r.up, 'lk', false);
  flag(k, 'poor', r.up, 'poor', false);
  flag(k, 'uphl', r.up, 'hl', hl);
  r.fill.style.width = (n >= STAR_AT.length ? 100 : (e.l - from) / (STAR_AT[n] - from) * 100) + '%';
  set(k, 'bt', r.bt, 'textContent', tl('card.per_shopper', { v: money(spendAt(id) * bmul()) }));
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
  closeCard(true);
  if (!sheetOpen) sfx('card');
  sheetOpen = true;
  $('app').classList.add('sheet-open');
  $('sheet').hidden = false;
  $('list').scrollTop = 0;
  var o = rows[id] || bestOpt && rows[bestOpt.id];
  if (o) $('list').scrollTop = Math.max(0, o.el.offsetTop - 70);
  fitInsets();
}

// quiet when another panel takes its place or the store reloads
function closeSheet(quiet) {
  if (sheetOpen && quiet !== true) sfx('close');
  sheetOpen = false;
  $('app').classList.remove('sheet-open');
  $('sheet').hidden = true;
  fitInsets();
}

function showCard(id) {
  closeSheet(true);
  if ($('card').hidden) sfx('card');
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

function closeCard(quiet) {
  if (!$('card').hidden && quiet !== true) sfx('close');
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
  bumpCombo();
  var name = (BZ[res.id] || PL[res.id]).name;
  if (res.star) {
    sfx('mile');
    View.punch();
    pulse(0.9);
    banner('<b>' + tl('banner.star', { name: name, n: res.star, mul: Math.pow(STAR_MUL, res.star) }) + '</b>' + (res.gems ? '<small>' + tl('common.gems_plus', { n: res.gems }) + '</small>' : ''),
      t + 0.3, res.star === STAR_AT.length);
    if (res.gems) flyGems(innerWidth / 2, innerHeight * 0.3, Math.min(6, res.gems));
    View.burst(res.id, t, [30, 44, 50][res.star - 1]);
    if (res.star === STAR_AT.length) View.burst(res.id, t + 0.4, 30);
    setTimeout(askNotify, 2500);
  } else if (res.unlock) {
    sfx('unlock');
    View.punch();
    pulse(0.9);
    banner('<b>' + tl('banner.new_dept', { name: name }) + '</b><small>' + tl('banner.new_dept.line', { item: upName(res.id, res.piece) }) + '</small>', t + 0.3, true);
  } else if (res.place) {
    var p = PL[res.id];
    sfx('mile');
    pulse(0.6);
    banner('<b>' + tl('banner.place_level', { name: name, n: S.pl[res.id] }) + '</b><small>' + p.next[res.piece] + '</small>', t + 0.3, S.pl[res.id] === p.cost.length);
  } else {
    sfx('buy', Math.pow(1.0595, Math.min(combo - 1, 8)));
    pulse(0.3);
  }
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
  // only a button that is short of cash can be tapped and still not buy
  if (!res) {
    sfx('broke');
    bumpEl('cash-n');
    buzz('light');
    return;
  }
  afterBuy(res);
  var at = View.pieceScreen(res.id, res.piece);
  if (!at) return;
  // above whatever panel is open, so the text is never under it
  var pane = sheetOpen ? $('sheet') : $('card').hidden ? $('bottom') : $('card');
  var top = pane.getBoundingClientRect().top - $('app').getBoundingClientRect().top;
  // above the piece's name bubble; under it when the piece is too high for that
  var hud = $('top').getBoundingClientRect().bottom - $('app').getBoundingClientRect().top;
  var y = at.y - 96;
  // the pill rises 30px as it fades
  if (y - 30 < hud + 6) y = at.y + 24;
  popAt(gain || '+ ' + (PL[id] ? PL[id].next[res.piece] : upName(id, res.piece)), at.x, Math.min(y, top - 40), 'item');
  if (res.star) ring(at.x, at.y);
}

// coins falling from the top of the screen, one tick of the coin sound as each wave lands
function rain(n) {
  var w = $('fly').clientWidth;
  var h = $('fly').clientHeight;
  for (var i = 0; i < n; i++) {
    var d = document.createElement('img');
    d.src = 'assets/coin.png';
    d.className = 'fc';
    d.style.left = Math.random() * (w - 20) + 'px';
    d.style.top = '-24px';
    $('fly').appendChild(d);
    var a = d.animate([{ transform: 'translateY(0) rotate(0deg)' }, { transform: 'translateY(' + (h + 40) + 'px) rotate(' + Math.round(Math.random() * 540 - 270) + 'deg)' }],
      { duration: 1300 + Math.random() * 900, delay: i * 50, easing: 'cubic-bezier(.4,0,.8,.6)', fill: 'backwards' });
    a.onfinish = function (e) { e.target.effect.target.remove(); };
  }
  for (var k = 0; k < 5; k++) setTimeout(function (r) { sfx('coins', r); }, 350 + k * 330, 1 + k * 0.05);
}

// the new store opens: coins and confetti over the screen, and two banners one after the other
function moveParty(rep) {
  View.punch();
  pulse(1);
  View.burst(null, 0.2, 50);
  View.burst(null, 0.7, 40);
  rain(28);
  banner('<b>' + tl('banner.store_open', { n: S.store }) + '</b><small>' + tl('banner.income_x', { n: storeMul(S.store) }) + '</small>', 0.2, true);
  banner('<b>' + tl('banner.rep', { n: rep }) + '</b><small>' + tl('banner.rep.line') + '</small>', 0.1);
  setTimeout(function () { if (!veilUp() && !sheetOpen && !cardId && !document.hidden) openSell(); }, 4500);
}

function claimGoalAt(i, el) {
  var g = claimGoal(i);
  if (!g) return;
  goalHold = -1;
  var c = centerOf(el);
  popAt(tl('common.gems_plus', { n: g.gems }), c.x, c.y + 20, 'gem');
  flyGems(c.x, c.y + 10, Math.min(8, g.gems));
  if (g.x2) banner('<b>' + tl('banner.goal_done') + '</b><small>' + tl('common.income_x2_min', { n: g.x2 }) + '</small>', 0);
  sfx('done');
  buzz('success');
  nudge();
  updateGoals();
}

// each shopper that pays shows its money over the till, when the till is on screen. A sale well above the recent average,
// as after a star or an upgrade, comes out bigger and hotter
var saleAvg = 0;

function onSale(ev, c, v, t) {
  var at = View.shopper(ev, c, t);
  if (ev !== 'paid') return;
  // graded on the sale without a boost, and plant sales stay out of the average
  var u = v / bmul();
  var r = 1;
  if (!c.garden) {
    r = saleAvg ? u / saleAvg : 1;
    saleAvg = saleAvg ? saleAvg + (u - saleAvg) * 0.05 : u;
  }
  if (at) popAt(plus(money(v)), at.x, at.y, r >= 1.8 ? 'small max' : r >= 1.25 ? 'small hot' : r < 0.6 ? 'small dim' : 'small');
}

// two or more upgrades within two seconds of each other make a combo, and each one's sound goes up a semitone
var combo = 0;
var comboAt = 0;
var comboTimer = 0;

function bumpCombo() {
  var now = performance.now();
  combo = now - comboAt < 2000 ? combo + 1 : 1;
  comboAt = now;
  clearTimeout(comboTimer);
  var el = $('combo');
  if (combo < 2) {
    el.hidden = true;
    return;
  }
  el.textContent = tl('hud.combo', { n: combo });
  el.hidden = false;
  el.style.animation = 'none';
  void el.offsetWidth;
  el.style.animation = '';
  comboTimer = setTimeout(function () { el.hidden = true; }, 1600);
}

// a quick glow round the screen's edge
function pulse(k) {
  var d = $('flash');
  d.animate([{ opacity: 0 }, { opacity: k, offset: 0.25 }, { opacity: 0 }], { duration: 320, easing: 'ease-out' });
}

function updateHud() {
  // dev only: unlimited money is a test option
  var cash = free ? 'Unlimited' : money(S.cash);
  set(shown, 'cash', $('cash-n'), 'textContent', cash);
  set(shown, 'rate', $('rate'), 'textContent', shut() ? tl('hud.closed') : tl('hud.rate', { v: money(rate()) }));
  set(shown, 'clk', $('clk'), 'textContent', shut() ? tl('hud.closed_at', { t: stamp() }) : stamp());
  flag(shown, 'clc', $('clk'), 'shut', shut());
  set(shown, 'gems', $('gem-n'), 'textContent', short(S.gems));
  set(shown, 'stars', $('star-n'), 'textContent', Math.min(rating(), gate()) + '/' + gate());
  set(shown, 'store', $('store-n'), 'textContent', tl('hud.store', { n: S.store }));
  if (!$('away').hidden) awayBtn();
  var x = $('x2');
  set(shown, 'x2h', x, 'hidden', !(S.x2 > 0));
  if (S.x2 > 0) set(shown, 'x2t', x, 'textContent', tl('hud.x2', { t: clock2(S.x2) }));
  var cl = $('call');
  set(shown, 'ch', cl, 'hidden', !!rush || !started());
  set(shown, 'ct', $('call-t'), 'textContent', shut() ? tl('hud.closed') : S.call > 0 ? clock2(S.call) : '');
  flag(shown, 'cr', cl, 'ready', S.call <= 0 && !shut());
  set(shown, 'cd', cl, 'disabled', shut());
  var r = $('rush');
  set(shown, 'rh', r, 'hidden', !rush);
  if (rush) {
    set(shown, 'rt', r.firstChild, 'textContent', tl(rush.kind === 'bus' ? 'hud.rush.bus' : 'hud.rush.flash'));
    set(shown, 'rw', r.querySelector('u').style, 'width', Math.round(rush.left / rush.len * 100) + '%');
  }
  duckRadio();
}

// whether an unmaxed item is left that the meter's fix button would send the player to
function drawLeft() {
  var open = BIZ.some(function (z) {
    return has(z.id) && z.items.some(function (x, j) { return x.stat === 'draw' && nextPiece(z.id, j) >= 0; });
  });
  return open || firstLeft('serv') >= 0 || firstLeft('lot') >= 0 || firstLeft('taxi') >= 0;
}

// the three meters live in the Stats sheet; the main screen only warns when one is red
var METERS = [
  { id: 'st-in', h: 'w-in', warn: 'hud.warn.in', left: drawLeft, go: function () { openDraw(); } },
  { id: 'st-tills', h: 'w-tills', warn: 'hud.warn.tills', left: function () { return firstLeft('hall') >= 0 || firstLeft('lounge') >= 0; },
    go: function () { tapMeter('hall', capacity); } },
  { id: 'st-shelf', h: 'w-shelf', warn: 'hud.warn.shelves', left: function () { return firstLeft('dock') >= 0 || firstLeft('lounge') >= 0; },
    go: function () { tapMeter('dock', stockCap); } }
];

// a row shows its rate a minute, why it is where it is, and a button for the fix
function meter(id, v, k, val, why, more) {
  var b = $(id);
  // a sliver stays in the track so an empty meter still reads as red
  var w = Math.max(4, Math.round(Math.max(0, Math.min(1, v)) * 100));
  flag(k, id + 'a', b, 'amber', v < 0.8 && v >= 0.5);
  flag(k, id + 'r', b, 'red', v < 0.5);
  if (k[id] !== w) {
    k[id] = w;
    b.querySelector('u').style.width = w + '%';
  }
  set(k, id + 't', b.querySelector('em'), 'textContent', val);
  set(k, id + 'w', b.querySelector('.why'), 'textContent', why);
  set(k, id + 'm', b.querySelector('.more'), 'textContent', more);
  flag(k, id + 'f', b.querySelector('.fix'), 'alt', v >= 0.8);
  set(k, id + 'h', b.querySelector('.fix').style, 'display', METERS.filter(function (m) { return m.id === id; })[0].left() ? '' : 'none');
}

// the first time a meter runs red, once ever, and not over a box or before the first purchase
function meterHint(i) {
  var h = METERS[i].h;
  if (hinted[h] || !started() || veilUp() || bqBusy || toastTimer) return;
  hinted[h] = 1;
  try {
    localStorage.setItem(HINT_KEY, JSON.stringify(hinted));
  } catch (e) {}
  var t = $('mtoast');
  var a = $('app').getBoundingClientRect();
  var m = $('warn').getBoundingClientRect();
  t.innerHTML = '<b>' + tl(METERS[i].warn) + '</b><small>' + tl('hud.warn_tip') + '</small>';
  t.hidden = false;
  t.style.left = '0px';
  var w = t.offsetWidth;
  var left = Math.max(8, Math.min(a.width - w - 8, m.left - a.left + m.width / 2 - w / 2));
  t.style.left = left + 'px';
  t.style.top = m.bottom - a.top + 10 + 'px';
  t.style.setProperty('--caret', Math.round(m.left - a.left + m.width / 2 - left) + 'px');
  toastTimer = setTimeout(hideToast, 4000);
}

function hideToast() {
  clearTimeout(toastTimer);
  toastTimer = 0;
  $('mtoast').hidden = true;
}

function veilUp() {
  return !!document.querySelector('.veil:not([hidden])');
}

function updateMeters() {
  var k = shown;
  var cap = capacity();
  var inr = inRate();
  var st = stockCap();
  var srv = served();
  var v = [inr / cap, cap / inr, st / srv];
  var bad = -1;
  for (var i = 0; i < 3; i++) if (v[i] < 0.5 && (bad < 0 || v[i] < v[bad]) && METERS[i].left()) bad = i;
  set(k, 'wh', $('warn'), 'hidden', bad < 0);
  if (bad >= 0) {
    set(k, 'wt', $('warn'), 'textContent', tl('hud.warn', { t: tl(METERS[bad].warn) }));
    meterHint(bad);
  }
  if ($('stats').hidden) return;
  var f = flow();
  var more = isFinite(st) ? perMin(st) : '-';
  meter('st-in', v[0], k, tl('stats.per_min', { v: perMin(inr) }), tl(v[0] < 0.8 ? 'stats.in.low' : 'stats.in.ok'),
    tl('stats.in.more', { walk: perMin(f.walk), car: perMin(f.car), taxi: perMin(f.taxi) }));
  meter('st-tills', v[1], k, tl('stats.per_min', { v: perMin(cap) }), tl(v[1] < 0.8 ? 'stats.tills.low' : 'stats.tills.ok'),
    tl('stats.tills.more', { cap: perMin(cap), come: perMin(inr) }));
  meter('st-shelf', v[2], k, tl('stats.per_min', { v: more }), tl(v[2] < 0.8 ? 'stats.shelf.low' : 'stats.shelf.ok'),
    tl('stats.shelf.more', { cap: more, need: perMin(srv) }));
}

// the figures of the Stats sheet, in the order they show
var STATS = [
  ['stats.income_s', function () { return tl('stats.per_sec', { v: money(rate()) }); }],
  ['stats.income_m', function () { return tl('stats.per_min', { v: money(rate() * 60) }); }],
  ['stats.served_store', function () { return short(S.st.sr); }],
  ['stats.served_all', function () { return short(S.st.srv); }],
  ['stats.lost', function () { return short(S.st.lost); }],
  ['stats.earned_store', function () { return money(S.run); }],
  ['stats.earned_all', function () { return money(S.all); }],
  ['stats.stars', function () { return tl('common.x_of_y', { a: rating(), b: STAR_AT.length * BIZ.length }); }],
  ['stats.store', function () { return tl('stats.store_val', { n: S.store, mul: storeMul(S.store) }); }],
  ['stats.time', function () { return playTime(S.st.t); }],
  ['stats.gems', function () { return short(S.gems); }],
  ['stats.regulars', function () { return tl('common.x_of_y', { a: regOwned(), b: REGS.length }); }],
  ['stats.achievements', function () {
    var n = 0;
    ACHS.forEach(function (a) { if (S.ac.o[a.id]) n++; });
    return tl('common.x_of_y', { a: n, b: ACHS.length });
  }]
];
var dRows = {};

function playTime(s) {
  if (s < 60) return tl('common.sec', { n: Math.floor(s) });
  var h = Math.floor(s / 3600);
  var m = Math.floor(s % 3600 / 60);
  return h ? tl('common.h_min', { h: h, m: m }) : tl('common.min', { n: m });
}

function buildStats() {
  $('st-grid').innerHTML = STATS.map(function (x) { return '<div><span>' + tl(x[0]) + '</span><b></b></div>'; }).join('');
  BIZ.forEach(function (b) {
    var el = document.createElement('div');
    el.innerHTML = '<span></span><em></em><i class="bar"><u></u></i>';
    el.firstChild.textContent = b.name;
    dRows[b.id] = { el: el, em: el.querySelector('em'), u: el.querySelector('u') };
    $('st-dept').appendChild(el);
  });
  METERS.forEach(function (m) {
    $(m.id).querySelector('.fix').addEventListener('click', function () {
      $('stats').hidden = true;
      hideToast();
      m.go();
    });
  });
}

function paintStats() {
  var k = shown;
  var vals = $('st-grid').querySelectorAll('b');
  STATS.forEach(function (x, i) { set(k, 'sg' + i, vals[i], 'textContent', x[1]()); });
  var open = BIZ.filter(function (b) { return spendAt(b.id) > 0; });
  var spend = {};
  open.forEach(function (b) { spend[b.id] = spendAt(b.id) * bmul(); });
  open.sort(function (a, b) { return spend[b.id] - spend[a.id]; });
  var top = open.length ? spend[open[0].id] : 1;
  var all = basket() * bmul();
  var key = open.map(function (b) { return b.id; }).join();
  if (k.sdo !== key) {
    k.sdo = key;
    BIZ.forEach(function (b) { dRows[b.id].el.hidden = true; });
    open.forEach(function (b) {
      dRows[b.id].el.hidden = false;
      $('st-dept').appendChild(dRows[b.id].el);
    });
  }
  open.forEach(function (b) {
    var r = dRows[b.id];
    set(k, 'sd' + b.id, r.em, 'textContent', tl('stats.dept_share', { v: money(spend[b.id]), pct: Math.round(spend[b.id] / all * 100) }));
    set(k, 'sw' + b.id, r.u.style, 'width', Math.round(spend[b.id] / top * 100) + '%');
  });
  set(k, 'sde', $('st-none'), 'hidden', open.length > 0);
}

function openStats() {
  hideToast();
  $('stats').hidden = false;
  updateMeters();
  paintStats();
  sfx('card');
}

// what brings the most shoppers for the money: Parking, the Taxi Stand or the cheapest draw item in a department
function drawPlace() {
  var pick = null;
  var best = 0;
  var sm = 1 + SERV * S.pl.serv;
  var sc = placeCost('serv');
  if (sc && firstLeft('serv') >= 0) {
    best = inRate() / sm * SERV / sc;
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
    if (!has(z.id)) return;
    var c = Infinity;
    z.items.forEach(function (x, j) { if (x.stat === 'draw') c = Math.min(c, pieceCost(z.id, nextPiece(z.id, j))); });
    if (DRAW * sm / c <= best) return;
    best = DRAW * sm / c;
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

// the first item of an open place with levels left, or -1
function firstLeft(id) {
  for (var j = 0; j < PL[id].items.length; j++) if (placePiece(id, j) >= 0 && placeCost(id, j) > 0) return j;
  return -1;
}

// what f() gains for the price from one more level of an item of a place
function perCoin(id, j, f) {
  if (j < 0) return 0;
  var c = placeCost(id, j);
  if (!c || placePiece(id, j) < 0) return 0;
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
  var j = firstLeft(id);
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
    $('goals').insertBefore(c, $('gdots'));
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

// the goal the single chip shows: one that can be claimed, else the closest, unless the dots button picked one lately
function pickGoal(gs) {
  if (goalHold >= 0 && goalHold < gs.length && Date.now() < goalUntil) return goalHold;
  var at = 0;
  var best = -1;
  gs.forEach(function (g, i) {
    var s = g.done ? 2 : g.v / g.n;
    if (s > best) {
      best = s;
      at = i;
    }
  });
  return at;
}

function updateGoals() {
  var gs = goals();
  var at = pickGoal(gs);
  var dots = $('gdots');
  set(shown, 'gdh', dots, 'hidden', gs.length < 2);
  chips.forEach(function (c, i) {
    var g = gs[i];
    var d = dots.children[i];
    c.g = g;
    set(c.k, 'h', c.el, 'hidden', !g || i !== at);
    set(c.k, 'dh', d, 'hidden', !g);
    flag(c.k, 'dn', d, 'on', i === at);
    flag(c.k, 'dr', d, 'rdy', g && g.done);
    if (!g) return;
    c.el.dataset.i = g.i;
    set(c.k, 't', c.t, 'textContent', g.t);
    flag(c.k, 'd', c.el, 'done', g.done);
    c.bar.style.width = (g.v / g.n * 100) + '%';
    set(c.k, 'g', c.tag, 'textContent', g.done ? tl('goal.claim', { n: g.gems }) : plus(g.gems));
  });
  if (!$('daily').hidden) {
    if (missSig !== missionSig()) paintMissions();
    else missBars();
  }
  var cd = daily().can || missionDue();
  set(shown, 'dd', $('daily-dot'), 'hidden', !cd);
  set(shown, 'sd', $('sell-dot'), 'hidden', !canMove() && !perkDue());
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
  if (m < 60) return tl('common.min', { n: m });
  return m % 60 ? tl('common.h_min', { h: Math.floor(m / 60), m: m % 60 }) : tl('common.h', { n: Math.floor(m / 60) });
}

// the box for what the store took while the player was away, or what is still waiting from before; a is the new
// time away if there is one
function showAway(a) {
  if (S.pend <= 0) return false;
  var txt = tl('away.waiting', { v: money(S.pend) });
  if (a) {
    txt = tl('away.report', { time: hours(a.real), n: a.n, v: money(a.gain) });
    if (S.pend - a.gain > 0.5) txt += ' ' + tl('away.before', { v: money(S.pend - a.gain) });
    if (a.real > maxAway()) txt += ' ' + tl('away.cap', { n: maxAway() / 3600 });
  }
  $('away-txt').innerHTML = txt;
  $('away').hidden = false;
  awayBtn();
  var c = centerOf($('away-amt'));
  countAway(S.pend);
  flyCoins(c.x, c.y, 12);
  sfx('coin');
  return true;
}

// gems can change while the box is open, from the daily reward on top of it
function awayBtn() {
  var c = awayCost();
  set(shown, 'awc', $('away-x2'), 'innerHTML', tl('away.double') + ' <img src="assets/ui_gem.png" alt="">' + c);
  set(shown, 'awd', $('away-x2'), 'disabled', S.gems < c);
  set(shown, 'awn', $('away-need'), 'textContent', gemsLeft(c));
  paintAwayAd();
}

function countAway(v) {
  var t0 = performance.now();
  (function step(now) {
    var f = Math.min(1, (now - t0) / 1200);
    $('away-amt').textContent = money(v * (1 - Math.pow(1 - f, 3)));
    if (f < 1 && !$('away').hidden) requestAnimationFrame(step);
  })(t0);
}

function takeAway(dbl, from, free) {
  var c = centerOf($(from));
  var v = claimAway(dbl, free);
  if (!v) return;
  if (sweep) sweep.redo = true;
  $('away').hidden = true;
  popAt(plus(money(v)), c.x, c.y, 'big');
  flyCoins(c.x, c.y, dbl ? 16 : 10);
  sfx('mile');
  if (dbl) buzz('success');
  askNotify();
  nudge();
}

function dayText(d) {
  var p = [];
  if (d.cash) p.push(tl('daily.cash_min', { n: d.cash }));
  if (d.gems) p.push(tl('common.gems', { n: d.gems }));
  if (d.x2) p.push(tl('common.x2_min', { n: d.x2 }));
  return p.join(tl('common.list_sep'));
}

var missSig = '';

// what the open sheet shows, so it is only painted again when that changes
function missionSig() {
  return missions().map(function (m) { return (m.p >= m.n) + ':' + m.c; }).join() + S.mi.b + S.mi.d;
}

function missLine(m) {
  var v = m.k === 'earn' ? short(Math.floor(m.p)) + '/' + short(m.n) : Math.floor(m.p) + '/' + m.n;
  return m.k === 'open' || m.k === 'star' ? missionText(m) : tl('daily.progress', { text: missionText(m), v: v });
}

// progress moves in place; rebuilding the rows every pass could eat a tap on a claim button
function missBars() {
  var rs = $('miss').children;
  missions().forEach(function (m, i) {
    if (!rs[i]) return;
    put(rs[i].firstChild, 'textContent', missLine(m));
    put(rs[i].querySelector('u').style, 'width', m.p / m.n * 100 + '%');
  });
}

// the day's missions with a claim for each finished one, and the bonus for all three
function paintMissions() {
  missSig = missionSig();
  var box = $('miss');
  box.innerHTML = '';
  function row(text, bar, tag, on, go) {
    var r = document.createElement('div');
    r.className = 'mrow' + (on ? ' ready' : '');
    r.innerHTML = '<span></span><i><u></u></i>';
    r.firstChild.textContent = text;
    r.querySelector('u').style.width = bar * 100 + '%';
    var b = document.createElement('button');
    b.type = 'button';
    b.className = 'btn';
    b.textContent = tag;
    b.disabled = !on;
    b.addEventListener('click', function () {
      var c = centerOf(b);
      var r = go();
      if (!r) return paintMissions();
      if (r.x2) banner('<b>' + tl('daily.all_done') + '</b><small>' + tl('daily.all_done.line', { gems: r.gems, min: r.x2 }) + '</small>', 0);
      flyGems(c.x, c.y, Math.min(8, r.gems));
      sfx('done');
      buzz('success');
      nudge();
      updateGoals();
      paintMissions();
    });
    r.appendChild(b);
    box.appendChild(r);
  }
  missions().forEach(function (m, i) {
    var done = m.p >= m.n;
    row(missLine(m), m.p / m.n, m.c ? tl('common.done') : plus(m.g), done && !m.c, function () { return claimMission(i); });
  });
  var all = missions().every(function (m) { return m.c; });
  row(tl('daily.all_three', { gems: MISS_BONUS.gems, min: MISS_BONUS.x2 }), all ? 1 : missions().filter(function (m) { return m.c; }).length / 3, S.mi.b ? tl('common.done') : tl('daily.bonus'), bonusReady(), claimBonus);
}

function openDaily() {
  paintMissions();
  var info = daily();
  var done = info.can ? info.idx : (S.day.n % 7 === 0 && S.day.n > 0 ? 7 : S.day.n % 7);
  var box = $('days');
  box.innerHTML = '';
  DAILY.forEach(function (d, i) {
    var c = document.createElement('div');
    c.className = 'day' + (i < done ? ' done' : '') + (info.can && i === info.idx ? ' today' : '') + (i === 6 ? ' last' : '');
    var ic = d.gems && d.x2 ? 'ui_gift' : d.gems ? 'ui_gem' : d.x2 ? 'ui_bolt' : 'coin';
    c.dataset.ok = tl('daily.done_mark');
    c.innerHTML = '<b>' + tl('daily.day', { n: i + 1 }) + '</b><img src="assets/' + ic + '.png" alt=""><span>' + dayText(d) + '</span>';
    box.appendChild(c);
  });
  $('daily-txt').textContent = info.can ? tl('daily.streak', { n: info.idx + 1 }) : info.gap ? tl('daily.wait') : tl('daily.claimed');
  $('daily-ok').hidden = !info.can;
  $('daily-x').textContent = tl(info.can ? 'common.later' : 'common.close');
  $('daily').hidden = false;
}

// the reward opens by itself once a day, after the first purchase and never over a card, the list or another box
function autoDaily() {
  var day = dayNum(clock());
  if (dailyAsked === day || !started() || !daily().can || veilUp() || cardId || sheetOpen) return;
  dailyAsked = day;
  openDaily();
}

// before the first purchase a line says what to tap
function updateHint() {
  var h = $('hint');
  var on = !started() && !sheetOpen && (!cardId || cardId === 'produce');
  set(shown, 'hh', h, 'hidden', !on);
  if (on) set(shown, 'ht', h, 'textContent', cardId ? tl('hud.hint.buy') : tl('hud.hint.produce', { dept: BZ.produce.name }));
}

function gemsLeft(cost) {
  return S.gems < cost ? tl('common.need_gems', { n: short(cost - S.gems) }) : '';
}

function paintBoost() {
  put($('boost-gems'), 'textContent', tl('boost.have', { n: short(S.gems) }));
  put($('x2-txt'), 'textContent', S.x2 > 0 ? tl('boost.x2.active', { t: clock2(S.x2) }) : tl('boost.x2.idle'));
  put($('x2-need'), 'textContent', gemsLeft(X2_COST));
  put($('b-x2'), 'innerHTML', '<img src="assets/ui_gem.png" alt="">' + X2_COST);
  put($('b-x2'), 'disabled', S.gems < X2_COST);
  var full = rate() * WARP_SECS;
  var v = Math.min(full, Math.max(S.run, 100));
  var weak = v < rate() * 600 || v <= 0;
  put($('warp-txt'), 'textContent', tl(v < full ? 'boost.warp.so_far' : 'boost.warp.hour', { v: money(v) }));
  put($('warp-need'), 'textContent', gemsLeft(WARP_COST) || (weak ? tl('boost.warp.weak') : ''));
  put($('b-warp'), 'innerHTML', '<img src="assets/ui_gem.png" alt="">' + WARP_COST);
  put($('b-warp'), 'disabled', S.gems < WARP_COST || weak);
  put($('call-txt'), 'textContent', S.call > 0 ? tl('boost.call.ready_in', { t: clock2(S.call) }) : tl('boost.call.brings', { n: CALL.cool / 60 }));
  put($('call-need'), 'textContent', rush ? tl('boost.call.rush_on') : shut() ? tl('boost.call.closed') : S.call > 0 ? gemsLeft(CALL.gems) : '');
  put($('b-call'), 'innerHTML', S.call > 0 ? '<img src="assets/ui_gem.png" alt="">' + CALL.gems : tl('boost.call.btn'));
  put($('b-call'), 'disabled', !!rush || shut() || (S.call > 0 && S.gems < CALL.gems));
  put($('reg-txt'), 'textContent', tl('boost.regs', { a: regOwned(), b: REGS.length, pct: Math.round((regMul() - 1) * 100) }));
  paintAds();
}

function storeMul(n) {
  return Math.round(Math.pow(STORE_MUL, n - 1) * 100) / 100;
}

function perkDue() {
  return PERKS.some(function (p) { return perkCost(p.id) && perkCost(p.id) <= S.rep; });
}

// what a perk is worth at level l, in words
function perkFx(id, l) {
  var v = PK[id].val[l];
  switch (id) {
    case 'open': return v[1] ? tl('perk.fx.open2', { a: BZ.produce.name, x: v[0], b: BZ.bakery.name, y: v[1] }) : tl('perk.fx.open1', { dept: BZ.produce.name, n: v[0] });
    case 'cash': return money(START_CASH + v);
    case 'cheap': return v ? tl('perk.fx.off', { n: Math.round(v * 100) }) : tl('perk.fx.full');
    case 'pace': return v < 1 ? tl('perk.fx.quicker', { n: Math.round((1 - v) * 100) }) : tl('perk.fx.normal');
    case 'away': return tl('common.h', { n: MAX_AWAY / 3600 + S.pl.head + v });
    case 'rush': return tl('common.sec', { n: RUSH.secs + v });
    case 'night': return tl(v ? 'perk.fx.night_open' : 'perk.fx.night_closed');
    case 'sales': return 'x' + v;
  }
  return v ? tl('common.gems_plus', { n: v }) : tl('perk.fx.base');
}

var PERK_IC = {
  open: '<path d="M4 10v10h16V10" fill="#f0c040"/><path d="M2.5 10 5 4h14l2.5 6z" fill="#c4432f"/><path d="M9 20v-6h6v6" fill="#fff"/>',
  cash: '<circle cx="12" cy="12" r="9" fill="#f0c040"/><circle cx="12" cy="12" r="5.5" fill="none" stroke-width="1.4"/><path d="M12 9v6" stroke-width="1.6"/>',
  cheap: '<path d="M3 12V4h8l10 10-8 8z" fill="#4f9a40"/><circle cx="7.5" cy="8.5" r="1.6" fill="#fff"/>',
  pace: '<circle cx="12" cy="13.5" r="8" fill="#fff"/><path d="M12 13.5V8.5M10 3h4M12 3v2.5M12 13.5l3.5 2" fill="none"/>',
  away: '<rect x="4" y="5" width="16" height="15" rx="2" fill="#fff"/><path d="M4 10h16M8 3v4M16 3v4" fill="none"/>',
  night: '<circle cx="12" cy="12" r="9" fill="#2d3a63"/><path d="M12 6.5V12l3.5 2.5" fill="none" stroke="#fff"/>',
  rush: '<path d="M13.5 2 5 13.5h6L9.5 22 19 9.5h-6z" fill="#f0c040"/>',
  sales: '<path d="M12 20.5S3.5 15.5 3.5 9.5a4.5 4.5 0 0 1 8.5-2 4.5 4.5 0 0 1 8.5 2c0 6-8.5 11-8.5 11z" fill="#e0647a"/>',
  gems: '<path d="M6 3h12l4 6-10 12L2 9z" fill="#5fc4ee"/><path d="M2 9h20M9 3l-2 6 5 12 5-12-2-6" fill="none" stroke-width="1.2"/>',
  medal: '<path d="M7 2l3 7M17 2l-3 7" fill="none" stroke="#c4432f" stroke-width="3.2"/><circle cx="12" cy="15" r="6.5" fill="#f0c040"/><path d="M12 11.5l1.1 2.3 2.5.3-1.8 1.7.5 2.5-2.3-1.2-2.3 1.2.5-2.5-1.8-1.7 2.5-.3z" fill="#fff" stroke-width="0.8"/>'
};

function icon(id, cls) {
  return '<svg class="' + (cls || 'pk') + '" viewBox="0 0 24 24" fill="none" stroke="#3b2a1e" stroke-width="1.8" stroke-linejoin="round" stroke-linecap="round" aria-hidden="true">' + PERK_IC[id] + '</svg>';
}

function paintPerks() {
  $('perks').innerHTML = PERKS.map(function (p) {
    var l = S.pk[p.id] || 0;
    var c = perkCost(p.id);
    var pips = '';
    for (var i = 0; i < p.cost.length; i++) pips += '<u' + (i < l ? ' class="on"' : '') + '></u>';
    return '<div class="perk"><div class="ph">' + icon(p.id) + '<div><b>' + p.name + '</b><div class="pips">' + pips + '</div></div></div><span>' + tl(c ? 'perk.line.next' : 'perk.line.max', { what: p.what, now: perkFx(p.id, l), next: c ? perkFx(p.id, l + 1) : '' }) + '</span>' +
      (c ? '<button type="button" class="btn" data-p="' + p.id + '"' + (c > S.rep ? ' disabled' : '') + '>' + tl('perk.cost', { n: c }) + '</button>' : '<em>' + tl('perk.maxed') + '</em>') + '</div>';
  }).join('');
}

// the sign, the star ring and what the move pays; painted again when a perk takes reputation
function paintSell() {
  var r = rating();
  var g = gate();
  var ok = canMove();
  var got = Math.min(r, g);
  var circ = 2 * Math.PI * 36;
  var stars = '';
  [[34, 28], [262, 22], [22, 66], [276, 62]].forEach(function (q) {
    stars += '<polygon transform="translate(' + q[0] + ' ' + q[1] + ')" points="0,-7 2,-2.4 6.7,-2.2 3.2,1 4.1,5.7 0,3.2 -4.1,5.7 -3.2,1 -6.7,-2.2 -2,-2.4" fill="#f0c040"/>';
  });
  $('sell-art').innerHTML = '<svg viewBox="0 0 300 110" aria-hidden="true"><defs><linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#8fd4ff"/>' +
    '<stop offset="1" stop-color="#f6ecd2"/></linearGradient></defs><rect width="300" height="110" fill="url(#sky)"/><rect y="94" width="300" height="16" fill="#4f9a40"/>' + stars +
    '<rect x="96" y="60" width="9" height="40" fill="#6a5640"/><rect x="195" y="60" width="9" height="40" fill="#6a5640"/>' +
    '<rect x="64" y="12" width="172" height="64" rx="10" fill="#c4432f" stroke="#3b2a1e" stroke-width="3"/><rect x="71" y="19" width="158" height="50" rx="6" fill="none" stroke="#fff" stroke-width="2"/>' +
    '<text x="150" y="37" text-anchor="middle" fill="#fff" font-size="12" font-weight="800" letter-spacing="3">' + tl('sell.sign') + '</text>' +
    '<text x="150" y="64" text-anchor="middle" fill="#fff" font-size="29" font-weight="800">' + (S.store + 1) + '</text></svg>';
  $('sell-txt').innerHTML = '<div class="sring"><svg viewBox="0 0 88 88" aria-hidden="true"><circle cx="44" cy="44" r="36" fill="none" stroke="#ead9ae" stroke-width="9"/>' +
    '<circle cx="44" cy="44" r="36" fill="none" stroke="' + (ok ? '#4f9a40' : '#f0c040') + '" stroke-width="9" stroke-linecap="round" stroke-dasharray="' + (circ * got / g).toFixed(1) + ' ' + circ.toFixed(1) +
    '" transform="rotate(-90 44 44)"/></svg><div><b>' + got + '/' + g + '</b><span>' + tl('sell.stars') + '</span></div></div><div class="srows">' +
    '<span>' + tl('sell.open_depts', { a: opened(), b: BIZ.length }) + '</span><span>' + tl('sell.income', { a: storeMul(S.store), b: storeMul(S.store + 1) }) + '</span>' +
    '<span class="' + (ok ? 'go' : '') + '">' + (ok ? tl('sell.ready') : tl('sell.reach', { n: g })) + (r > g ? ' ' + tl('sell.extra', { n: r - g }) : '') + '</span></div>';
  $('sell-rep').innerHTML = icon('medal', 'big') + '<div><b>+' + repGain() + '</b><span>' + tl('sell.rep_for_move') + '</span></div><small>' + tl('sell.rep_have', { n: S.rep }) + '</small>';
  $('sell-ok').classList.toggle('ready', ok);
}

function openSell() {
  var ok = canMove();
  paintSell();
  paintPerks();
  var keep = [['ui_gem', tl('common.gems', { n: short(S.gems) })], ['ui_star', tl('sell.keep.rep')], ['ui_goal', tl('sell.keep.goals')], ['ui_bolt', tl('sell.keep.boosts')]];
  var lose = [['coin', tl('sell.lose.cash')], ['@open', tl('sell.lose.depts')], ['@cheap', tl('sell.lose.places')], ['ui_star', tl('sell.lose.stars')]];
  var list = function (a) {
    return a.map(function (x) {
      return '<li>' + (x[0][0] === '@' ? icon(x[0].slice(1), 'mini') : '<img src="assets/' + x[0] + '.png" alt="">') + x[1] + '</li>';
    }).join('');
  };
  $('sell-keep').innerHTML = '<div class="keep"><h4>' + tl('sell.you_keep') + '</h4><ul>' + list(keep) + '</ul></div><div class="lose"><h4>' + tl('sell.starts_again') + '</h4><ul>' + list(lose) + '</ul></div>';
  $('sell-ok').textContent = ok ? tl('sell.move', { n: S.store + 1 }) : tl('sell.see');
  $('sell-ok').classList.toggle('alt', !ok);
  $('sell').hidden = false;
}

// a regular whose feat got done arrives with a card banner; the whole set gets one more
function checkRegs() {
  var got = feats();
  if (!got.length) return;
  var all = regOwned() === REGS.length;
  sfx('card');
  buzz('success');
  banner(got.length === 1 ? '<b>' + tl('regs.new', { name: got[0].name }) + '</b><small>' + tl('regs.new.line', { n: Math.round(REGC.sales * 100) }) + '</small>' :
    '<b>' + tl('regs.new_many', { n: got.length }) + '</b><small>' + tl(got.length > 2 ? 'regs.names_more' : 'regs.names2', { a: got[0].name, b: got[1].name, n: got.length - 2 }) + '</small>', 0);
  if (all) banner('<b>' + tl('regs.all') + '</b><small>' + tl('regs.all.line', { n: Math.round(REGC.set * 100) }) + '</small>', 0, true);
  if (!$('regs').hidden) paintRegs();
  save();
}

// how far a feat has got: a count for a small goal, else a share
function regProg(r) {
  var v = Math.min(r.n, REGV[r.id]());
  return r.n === 1 ? '' : r.n <= 20 ? Math.floor(v) + '/' + r.n : tl('common.pct', { n: Math.floor(v / r.n * 100) });
}

// the regulars met, with a portrait and the feat for each one still to come
function paintRegs() {
  var n = regOwned();
  $('regs-txt').textContent = tl('regs.intro', { a: n, b: REGS.length, pct: Math.round((regMul() - 1) * 100), each: Math.round(REGC.sales * 100), set: Math.round(REGC.set * 100) });
  $('reg-list').innerHTML = REGS.map(function (r, i) {
    var met = S.rg.o[r.id];
    return '<div class="offer reg' + (met ? '' : ' lock') + '"><img src="' + View.regIcon(i) + '" alt=""><div><b>' + (met ? r.name : tl('regs.unknown')) + '</b>' +
      '<span>' + (met ? r.line : regProg(r) ? tl('regs.feat_prog', { feat: r.feat, v: regProg(r) }) : r.feat) + '</span></div></div>';
  }).join('');
}

// an achievement reached arrives with a card banner; a first look at an old save gets one summary
function checkAch() {
  var got = achieve();
  if (!got.length) return;
  var gems = 0;
  got.forEach(function (a) { gems += ACH_TIER[a.t].gems; });
  var a = got[0];
  sfx('card');
  buzz('success');
  banner(got.length === 1 ? '<b>' + a.name + '</b><small>' + tl(ACH_TIER[a.t].sales ? 'ach.badge_sales' : 'ach.badge', { tier: ACH_TIER[a.t].name, n: gems, pct: ACH_TIER[a.t].sales * 100 }) + '</small>' :
    '<b>' + tl('ach.many', { n: got.length }) + '</b><small>' + tl('ach.many.line', { n: gems }) + '</small>', 0, got.some(function (g) { return g.t === 2; }));
  if (!$('ach').hidden) paintAch();
  if (!$('look').hidden) paintLook();
  save();
}

function paintAch() {
  var n = 0;
  ACHS.forEach(function (a) { if (S.ac.o[a.id]) n++; });
  $('ach-txt').textContent = tl('ach.intro', { a: n, b: ACHS.length, now: Math.round((achMul() - 1) * 100), max: Math.round(ACH_CAP * 100) });
  $('ach-list').innerHTML = ACHS.map(function (a) {
    var done = S.ac.o[a.id];
    var t = ACH_TIER[a.t];
    var v = Math.min(a.n, achVal(a));
    return '<div class="offer ach t' + a.t + (done ? '' : ' lock') + '"><u class="badge"><img src="assets/ui_star.png" alt=""></u><div><b>' + a.name + ' <i>' + t.name + '</i></b>' +
      '<span>' + a.text + '</span><em class="bar"><u style="width:' + v / a.n * 100 + '%"></u></em>' +
      '<span>' + tl(t.sales ? 'ach.reward_sales' : 'ach.reward', { prog: done ? tl('ach.earned') : a.n <= 100 ? tl('common.x_of_y', { a: Math.floor(v), b: a.n }) : tl('common.pct', { n: Math.floor(v / a.n * 100) }), n: t.gems, pct: t.sales * 100 }) + '</span></div></div>';
  }).join('');
}

function paintLook() {
  $('look-txt').textContent = tl('look.intro', { n: short(S.gems) });
  $('look-list').innerHTML = LOOKS.map(function (l) {
    var st = lookState(l.id);
    var need = l.store ? tl('look.need_store', { n: l.store }) : l.ach ? tl('look.need_ach', { name: ACHS.filter(function (a) { return a.id === l.ach; })[0].name }) : '';
    var btn = st === 'on' ? '<button type="button" class="btn" disabled>' + tl('look.in_use') + '</button>' :
      st === 'lock' ? '<button type="button" class="btn" disabled>' + tl('common.locked') + '</button>' :
      '<button type="button" class="btn" data-l="' + l.id + '"' + (st === 'buy' && S.gems < l.gems ? ' disabled' : '') + '>' + (st === 'buy' ? '<img src="assets/ui_gem.png" alt="">' + l.gems : tl('look.use')) + '</button>';
    return '<div class="offer look' + (st === 'lock' ? ' lock' : '') + '"><u class="sw" style="background:linear-gradient(135deg,' + l.sign.bg[0] + ' 50%,' + l.sign.edge + ' 50%)"></u><div><b>' + l.name + '</b><span>' + l.text + '</span>' +
      (st === 'lock' ? '<span class="need">' + need + '</span>' : '') + '</div>' + btn + '</div>';
  }).join('');
}

function setSound() {
  $('m-snd').textContent = tl(snd ? 'menu.sound_on' : 'menu.sound_off');
  $('m-buzz').textContent = tl(vib ? 'menu.vibration_on' : 'menu.vibration_off');
}

function afterLoad() {
  saleAvg = 0;
  goalHold = -1;
  goalUntil = 0;
  closeCard(true);
  closeSheet(true);
  View.refresh();
  View.focusNow();
  updateBest();
  updateGoals();
}

function wire() {
  $('card-x').addEventListener('click', closeCard);
  $('gdots').addEventListener('click', function () {
    var gs = goals();
    goalHold = (pickGoal(gs) + 1) % gs.length;
    goalUntil = Date.now() + 10000;
    sfx('tap');
    updateGoals();
  });
  $('t-biz').addEventListener('click', function () {
    openSheet();
  });
  $('sheet-x').addEventListener('click', function () {
    closeSheet();
  });
  $('t-boost').addEventListener('click', function () {
    paintBoost();
    $('boost').hidden = false;
  });
  $('boost-x').addEventListener('click', function () { $('boost').hidden = true; });
  $('b-reg').addEventListener('click', function () {
    sfx('card');
    paintRegs();
    $('regs').hidden = false;
  });
  $('regs-x').addEventListener('click', function () { $('regs').hidden = true; });
  $('ach-x').addEventListener('click', function () { $('ach').hidden = true; });
  $('look-x').addEventListener('click', function () { $('look').hidden = true; });
  $('look-list').addEventListener('click', function (e) {
    var b = e.target.closest('button');
    var id = b && b.dataset.l;
    if (!id || !setLook(id)) return;
    View.look();
    sfx('done');
    buzz('success');
    paintLook();
    save();
  });
  $('sell-look').addEventListener('click', function () {
    paintLook();
    $('look').hidden = false;
  });
  $('m-look').addEventListener('click', function () {
    $('menu').hidden = true;
    paintLook();
    $('look').hidden = false;
  });
  $('m-ach').addEventListener('click', function () {
    $('menu').hidden = true;
    paintAch();
    $('ach').hidden = false;
  });
  $('b-x2').addEventListener('click', function () {
    if (!buyX2()) return;
    sfx('done');
    banner('<b>' + tl('banner.double_income') + '</b><small>' + tl('banner.double_income.line', { t: clock2(S.x2) }) + '</small>', 0);
    nudge();
  });
  $('b-warp').addEventListener('click', function () {
    var v = warp();
    if (!v) return;
    var c = centerOf($('b-warp'));
    popAt(plus(money(v)), c.x, c.y, 'big');
    flyCoins(c.x, c.y, 8);
    sfx('mile');
    nudge();
  });
  $('b-call').addEventListener('click', function () {
    if (!(S.call > 0 ? callRushGems() : callRush())) return;
    $('boost').hidden = true;
    nudge();
  });
  $('call').addEventListener('click', function () {
    if (S.call > 0) {
      paintBoost();
      $('boost').hidden = false;
    } else callRush();
  });
  $('t-daily').addEventListener('click', openDaily);
  $('daily-x').addEventListener('click', function () { $('daily').hidden = true; });
  $('daily-ok').addEventListener('click', function () {
    var c = centerOf($('daily-ok'));
    var r = claimDaily();
    if (!r) return;
    if (r.cash) {
      popAt(plus(money(r.cash)), c.x, c.y, 'big');
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
    offerStarter();
  });
  $('perks').addEventListener('click', function (e) {
    var id = e.target.dataset && e.target.dataset.p;
    if (!id || !buyPerk(id)) return;
    sfx('done');
    buzz('success');
    paintPerks();
    paintSell();
    nudge();
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
      b.textContent = tl('sell.tap_again');
      setTimeout(function () {
        b.dataset.armed = '';
        if (!$('sell').hidden) openSell();
      }, 3000);
      return;
    }
    b.dataset.armed = '';
    var rep = repGain();
    var moved = move();
    $('sell').hidden = true;
    if (!moved) return;
    afterLoad();
    sfx('mile');
    buzz('success');
    moveParty(rep);
    nudge();
  });
  $('gear').addEventListener('click', function () {
    setSound();
    if (window.APPVER) {
      $('m-ver').textContent = tl('menu.version', { v: APPVER.v, b: APPVER.b });
      $('m-ver').hidden = false;
    }
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
    ambience();
    radioSync();
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
  $('m-reset').addEventListener('click', function () {
    $('menu').hidden = true;
    $('erase').hidden = false;
  });
  $('erase-x').addEventListener('click', function () {
    $('erase').hidden = true;
    $('menu').hidden = false;
  });
  $('erase-yes').addEventListener('click', function () {
    reset();
    speed = 1;
    dailyAsked = -1;
    afterLoad();
    cloudPut(true);
    $('erase').hidden = true;
    $('menu').hidden = true;
  });
  if (window.TESTER) wireTest();
  $('away-ok').addEventListener('click', function () { takeAway(false, 'away-ok'); });
  $('away-x2').addEventListener('click', function () { takeAway(true, 'away-x2'); });
  // WebKit only lets audio start from some events, so listen to all of them
  document.addEventListener('pointerup', wake);
  document.addEventListener('touchend', wake);
  document.addEventListener('click', wake);
  window.addEventListener('resize', fitInsets);
  var hiddenAt = 0;
  document.addEventListener('visibilitychange', function () {
    if (document.hidden) {
      if (ac) ac.suspend();
      if (sweep) sweep.redo = true;
      radioSync();
      save();
      cloudPut();
      tell({ cmd: 'set', list: reminders() });
      if (!hiddenAt) hiddenAt = clock();
      cloudTook = false;
      return;
    }
    if (ac && snd) ac.resume();
    askOther();
    radioSync();
    if (!hiddenAt) return;
    // the game waits for the server time, so the time away comes from two server answers
    timeWait(function () {
      cloudApply();
      var sec = (clock() - hiddenAt) / 1000;
      hiddenAt = 0;
      lastTick = performance.now();
      // a copy taken meanwhile already paid the time since it was saved
      if (sec > 60 && !cloudTook) {
        var a = away(sec);
        if (showAway(a)) updateBest();
      }
    });
  });
}

// the test menu exists only in tester builds: five taps on the menu title show it
var SWEEP = [64, 128, 256, 400];
var SWEEP_SECS = 600;
var sweep = null;

function wireTest() {
  var box = document.createElement('div');
  box.id = 'test';
  box.hidden = true;
  box.innerHTML =
    '<div class="row" id="t-speed"><button type="button" data-s="1" class="btn alt">x1</button><button type="button" data-s="10" class="btn alt">x10</button><button type="button" data-s="100" class="btn alt">x100</button></div>' +
    '<div class="row"><button type="button" id="t-hour" class="btn alt">+1 h income</button><button type="button" id="t-gems" class="btn alt">+100 gems</button></div>' +
    '<button type="button" id="t-free" class="btn alt"></button>' +
    '<button type="button" id="t-goals" class="btn alt">Finish goals</button>' +
    '<button type="button" id="t-fill" class="btn alt">Fill store</button>' +
    '<button type="button" id="t-sweep" class="btn alt">Figure pool sweep</button>' +
    '<button type="button" id="t-adid" class="btn alt">Ad test id</button>' +
    '<pre id="t-out" class="small" hidden></pre>';
  $('m-reset').parentNode.insertBefore(box, $('m-reset'));
  $('m-title').addEventListener('click', function () {
    if (++testTaps >= 5) box.hidden = false;
  });
  [].forEach.call(box.querySelectorAll('#t-speed button'), function (b) {
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
  $('t-fill').addEventListener('click', function () {
    fillStore();
    View.refresh();
    nudge();
  });
  $('t-sweep').addEventListener('click', startSweep);
  $('t-adid').addEventListener('click', function () {
    if (native()) post({ cmd: 'adId' });
    else testAdId('');
  });
  paintFree();
  paintSpeed();
}

function testOut(text) {
  var o = $('t-out');
  if (!o) return;
  o.hidden = false;
  o.textContent = text;
}

function testAdId(id) {
  testOut('Ad test id: ' + (id || 'none'));
}

// each pool size runs for a set time at normal speed; the table shows frames per second, the income rate the HUD shows,
// what the store really earned per minute, earned over shown, and shoppers served per minute. A step that was in the
// background starts over, since the away income and the frame gap would skew it
function startSweep() {
  if (sweep) return;
  speed = 1;
  paintSpeed();
  sweep = { i: 0, rows: [] };
  sweepStart(performance.now());
}

function sweepStart(t) {
  View.pool(SWEEP[sweep.i]);
  sweep.t = t;
  sweep.frames = 0;
  sweep.open = 0;
  sweep.srv = S.st.srv;
  sweep.all = S.all;
  sweep.earned = 0;
  sweep.served = 0;
  sweep.shown = 0;
  sweep.last = t;
  sweep.said = -1;
  sweep.redo = false;
}

function sweepFrame(t) {
  if (sweep.redo) return sweepStart(t);
  // closed time is left out of every figure, so each pool size is measured over open time only
  if (!shut()) {
    sweep.frames++;
    sweep.open += (t - sweep.last) / 1000;
    sweep.shown += rate() * (t - sweep.last) / 1000;
    sweep.earned += S.all - sweep.all;
    sweep.served += S.st.srv - sweep.srv;
  }
  sweep.all = S.all;
  sweep.srv = S.st.srv;
  sweep.last = t;
  var secs = sweep.open;
  if (secs < SWEEP_SECS) {
    var left = Math.ceil(SWEEP_SECS - secs);
    if (left !== sweep.said) {
      sweep.said = left;
      testOut('Pool ' + SWEEP[sweep.i] + ': ' + left + ' s left\n' + sweep.rows.join('\n'));
    }
    return;
  }
  var earned = sweep.earned;
  sweep.rows.push(SWEEP[sweep.i] + ' figures: ' + (sweep.frames / secs).toFixed(1) + ' fps, ' +
    short(sweep.shown * 60 / secs) + ' shown/min, ' + short(earned * 60 / secs) + ' earned/min, ' +
    (sweep.shown > 0 ? (earned / sweep.shown).toFixed(2) : '-') + ' earned/shown, ' +
    (sweep.served * 60 / secs).toFixed(1) + ' served/min');
  if (++sweep.i < SWEEP.length) return sweepStart(t);
  testOut(sweep.rows.join('\n'));
  View.pool(64);
  sweep = null;
}

function paintFree() {
  $('t-free').textContent = 'Unlimited money: ' + (free ? 'on' : 'off');
}

function paintSpeed() {
  [].forEach.call(document.querySelectorAll('#t-speed button'), function (b) { b.classList.toggle('on', +b.dataset.s === speed); });
}

// a tapped gift pays cash, now and then gems or a minute of x2
function collectGift() {
  var r = takeGift();
  if (!r) return;
  var at = View.giftTaken() || { x: innerWidth / 2, y: innerHeight / 2 };
  ring(at.x, at.y);
  if (r.x2) {
    popAt(r.x2 < 60 ? tl('common.x2_s', { n: r.x2 }) : tl('common.x2_min', { n: r.x2 / 60 }), at.x, at.y - 20, 'big');
    bumpEl('x2');
  } else if (r.gems) {
    popAt(tl('common.gems_plus', { n: r.gems }), at.x, at.y - 20, 'big gem');
    flyGems(at.x, at.y, r.gems);
  } else {
    popAt(plus(money(r.cash)), at.x, at.y - 20, 'big');
    flyCoins(at.x, at.y, r.jack ? 16 : 8);
  }
  sfx('gift');
  if (r.jack) {
    sfx('gems');
    banner('<b>' + tl('banner.jackpot') + '</b><small>' + (r.x2 ? tl('common.income_x2_min', { n: r.x2 / 60 }) : plus(money(r.cash))) + '</small>', 0, true);
  }
  buzz('success');
  nudge();
}

// a tap on a till in a rush serves its front shopper a little sooner. Taps less than a second apart build a combo that
// shows over the till, sounds a little higher with each tap and adds to the head start
var rc = 0;
var rcAt = 0;
var rcTimer = 0;

function tapTill(i) {
  var now = performance.now();
  var n = now - rcAt < 1000 ? rc + 1 : 1;
  if (!rushTap(i, n)) return;
  rc = n;
  rcAt = now;
  var at = View.tillScreen(i);
  var el = $('rcombo');
  clearTimeout(rcTimer);
  if (at) ring(at.x, at.y);
  if (n < 2) {
    el.hidden = true;
    if (at) popAt(tl('hud.faster'), at.x, at.y - 24, 'small');
  } else if (at) {
    el.textContent = 'x' + n;
    el.style.left = at.x + 'px';
    el.style.top = at.y - 44 + 'px';
    el.style.fontSize = Math.min(40, 20 + n * 2) + 'px';
    el.hidden = false;
    el.style.animation = 'none';
    void el.offsetWidth;
    el.style.animation = '';
    rcTimer = setTimeout(function () { el.hidden = true; }, 1000);
  }
  if (at && n % 5 === 0) flyCoins(at.x, at.y, 3);
  sfx('tap', 1.5 * Math.pow(1.0595, Math.min(n - 1, 12)));
  buzz(n % 5 === 0 ? 'medium' : 'light');
}

function onPerkEvent(ev, o) {
  if (ev === 'gift') View.gift(o.kind, o.jack);
  else if (ev === 'giftgone') View.giftLeaves();
  else if (ev === 'rush') {
    View.rush(o.kind);
    banner('<b>' + tl(o.kind === 'bus' ? 'banner.bus' : 'banner.flash') + '</b><small>' + tl(o.kind === 'bus' ? 'banner.bus.line' : 'banner.flash.line') + '</small>', 0);
    sfx(buf.rush ? 'rush' : 'done');
    buzz('medium');
  } else if (ev === 'rushend') {
    View.rushEnd();
    banner('<b>' + tl('banner.rush_over', { v: money(o.extra) }) + '</b>', 0.3);
    sfx('done');
  } else if (ev === 'close') {
    banner('<b>' + tl('banner.close') + '</b><small>' + tl('banner.close.line', { t: fmtClock(SHUT[1] * 60) }) + '</small>', 0);
    sfx('done');
  } else if (ev === 'open') {
    banner('<b>' + tl('banner.open') + '</b><small>' + tl('banner.open.line') + '</small>', 0);
    sfx('done');
  } else {
    View.giftOff();
    View.rushEnd();
  }
}

// a tapped regular tips a few seconds of income
function tapReg(h) {
  var v = tipReg(h.c);
  if (!v) return;
  ring(h.x, h.y);
  var vip = h.c.reg === 'vip';
  popAt(vip ? tl('hud.vip_tip') : RG[h.c.reg].name, h.x, h.y - 46, 'small');
  popAt(plus(money(v)), h.x, h.y - 20, 'big');
  flyCoins(h.x, h.y, vip ? 14 : 5);
  if (h.c.gems) flyGems(h.x, h.y, h.c.gems);
  sfx('gift', 1.25, 0.7);
  if (vip) sfx('coins');
  buzz('medium');
  nudge();
}

function onTap(h) {
  wake();
  if (h.kind === 'gift') collectGift();
  else if (h.kind === 'reg') tapReg(h);
  else if (h.kind === 'till') tapTill(h.i);
  else if (h.kind === 'biz') showCard(h.id);
  else if (sheetOpen) closeSheet();
  else closeCard();
}

function loop(t) {
  requestAnimationFrame(loop);
  if (timeHeld) {
    lastTick = t;
    return;
  }
  var dt = Math.min(1, (t - lastTick) / 1000);
  if (sweep) sweepFrame(t);
  tick(dt);
  S.st.t += dt;
  topUp();
  lastTick = t;
  if (t - bestAt > 250) {
    bestAt = t;
    updateBest();
    updateGoals();
    updateDeals();
    checkRegs();
    checkAch();
    autoDaily();
    updateMeters();
    if (!$('stats').hidden) paintStats();
    updateHint();
    ambVol();
    fitInsets();
    hold = !started() || !!cardId || sheetOpen || veilUp();
  }
  View.draw(t);
  updateHud();
  updateOpen();
}

function closeVeil(v) {
  var x = $(CLOSE[v.id]);
  if (x) x.click();
  else v.hidden = true;
}

// the panel on top: the last open veil, else the upgrades sheet, else a card. False when nothing can close
function closeTop() {
  var v = document.querySelectorAll('.veil:not([hidden])');
  if (v.length) {
    v = v[v.length - 1];
    if (!CLOSE[v.id]) return false;
    closeVeil(v);
    return true;
  }
  if (sheetOpen) closeSheet();
  else if (cardId) closeCard();
  else return false;
  return true;
}

// true when something between the touch and the panel is scrolled down, so a pull down belongs to it
function scrolled(t, root) {
  for (var n = t; n && n !== document; n = n.parentNode) {
    if (n.scrollTop > 0) return true;
    if (n === root) break;
  }
  return false;
}

function panelOf(t) {
  if (!t.closest || t.closest('input[type=range]')) return null;
  var box = t.closest('.veil .box');
  if (box) {
    var v = box.parentNode;
    return CLOSE[v.id] ? { el: box, done: function () { closeVeil(v); } } : null;
  }
  if (t.closest('#sheet')) return { el: $('sheet'), done: closeSheet };
  if (t.closest('#card')) return { el: $('card'), done: closeCard };
  return null;
}

function dragPanel(d, y) {
  d.el.style.transition = 'none';
  d.el.style.transform = 'translateY(' + Math.max(0, y) + 'px)';
}

function dragEnd(d, dy, ms) {
  var el = d.el;
  var go = dy > 110 || dy > 40 && dy / ms > 0.6;
  el.style.transition = 'transform 0.18s ease-out';
  el.style.transform = go ? 'translateY(' + innerHeight + 'px)' : '';
  setTimeout(function () {
    el.style.transition = '';
    el.style.transform = '';
    dragging = false;
    if (go) d.done();
    fitInsets();
  }, 190);
}

function wireClose() {
  // a tap on the dark backdrop, outside the box; a box that just opened ignores the tap that may be meant for the game
  var shownAt = {};
  [].forEach.call(document.querySelectorAll('.veil'), function (v) {
    new MutationObserver(function () {
      if (!v.hidden) shownAt[v.id] = Date.now();
    }).observe(v, { attributes: true, attributeFilter: ['hidden'] });
  });
  document.addEventListener('click', function (e) {
    var v = e.target;
    if (v.classList && v.classList.contains('veil') && CLOSE[v.id] && Date.now() - (shownAt[v.id] || 0) > 400) closeVeil(v);
  });
  var d = null;
  var edge = null;
  document.addEventListener('touchstart', function (e) {
    var t = e.touches[0];
    d = null;
    edge = null;
    if (e.touches.length !== 1) return;
    // a swipe that starts on the 3D view pans the camera
    if (IOS && t.clientX <= 24 && !e.target.closest('#view, #tags')) edge = { x: t.clientX, y: t.clientY };
    var p = panelOf(e.target);
    if (p && !scrolled(e.target, p.el)) d = { el: p.el, done: p.done, x: t.clientX, y: t.clientY, at: Date.now(), on: false, dy: 0 };
  }, { passive: true });
  document.addEventListener('touchmove', function (e) {
    if (!edge) return;
    var t = e.touches[0];
    var ex = t.clientX - edge.x;
    if (Math.abs(t.clientY - edge.y) > ex) edge = null;
    else if (ex > 70) {
      edge = null;
      d = null;
      closeTop();
    }
  }, { passive: true });
  // not passive, so the page does not scroll under a drag; only the panels listen
  var move = function (e) {
    if (!d) return;
    var t = e.touches[0];
    var dx = t.clientX - d.x;
    var dy = t.clientY - d.y;
    if (!d.on) {
      if (Math.abs(dx) > 8 && Math.abs(dx) > Math.abs(dy) || dy < -8) {
        d = null;
        return;
      }
      if (dy <= 8) return;
      d.on = true;
      dragging = true;
    }
    d.dy = dy;
    if (e.cancelable) e.preventDefault();
    dragPanel(d, dy - 8);
  };
  ['sheet', 'card'].forEach(function (id) { $(id).addEventListener('touchmove', move, { passive: false }); });
  [].forEach.call(document.querySelectorAll('.veil'), function (v) { v.addEventListener('touchmove', move, { passive: false }); });
  var drop = function () {
    edge = null;
    if (d && d.on) dragEnd(d, d.dy - 8, Math.max(1, Date.now() - d.at));
    d = null;
  };
  document.addEventListener('touchend', drop);
  document.addEventListener('touchcancel', drop);
}

function start() {
  applyText();
  try {
    snd = localStorage.getItem(SND_KEY) !== '0';
    vib = localStorage.getItem(BUZZ_KEY) !== '0';
    if (window.TESTER) free = localStorage.getItem(FREE_KEY) === '1';
    else localStorage.removeItem(FREE_KEY);
    hinted = JSON.parse(localStorage.getItem(HINT_KEY)) || {};
    radio = JSON.parse(localStorage.getItem(RADIO_KEY)) || radio;
    var mx = JSON.parse(localStorage.getItem(MIXER_KEY)) || {};
    if (+mx.amb >= 0 && +mx.amb <= 1) lvl.amb = +mx.amb;
    if (+mx.fx >= 0 && +mx.fx <= 1) lvl.fx = +mx.fx;
  } catch (e) {}
  if (radio.sel !== 'off' && radio.sel !== 'mix' && !station(radio.sel)) radio.sel = 'mix';
  radio.vol = +radio.vol === +radio.vol ? Math.min(1, Math.max(0, +radio.vol)) : 0.5;
  timeWait(launch);
}

// runs on the first server time answer: no save is made or read before it
function launch() {
  cloudLook(begin);
}

function begin(fromCloud) {
  var gone = load();
  if (blocked) {
    loadFail(tl('save.newer'));
    return;
  }
  onSaveFail = function () { banner('<b>' + tl('save.failed') + '</b>', 0); };
  zoneCheck();
  View.init($('view'), onTap);
  buildList();
  buildGoals();
  paintSpeed();
  wire();
  wireShop();
  wireRadio();
  wireLangs();
  fitWire();
  wireSound();
  wireClose();
  buildStats();
  shopStart();
  setFree(free);
  $('stars').addEventListener('click', openSell);
  $('mtoast').addEventListener('click', hideToast);
  $('warn').addEventListener('click', openStats);
  $('t-stats').addEventListener('click', openStats);
  $('stats-x').addEventListener('click', function () { $('stats').hidden = true; });
  onShopper = onSale;
  onPerk = onPerkEvent;
  onYesterday = function (g, x) {
    banner('<b>' + tl('banner.yesterday', { n: g }) + '</b>' + (x ? '<small>' + tl('common.income_x2_min', { n: x / 60 }) + '</small>' : ''), 0);
  };
  onMission = function (m) {
    banner('<b>' + tl('banner.mission_done') + '</b><small>' + missionText(m) + '</small>', 0);
    sfx('done');
  };
  var wait = setInterval(function () {
    if (!View.ready()) return;
    clearInterval(wait);
    View.refresh();
    updateBest();
    View.focusNow();
    updateGoals();
    if (cloudTaken) {
      showAway(cloudAway);
      banner('<b>' + tl('cloud.loaded') + '</b><small>' + tl('cloud.loaded_note') + '</small>', 0);
    } else if (!cloudShown) {
      showAway(gone);
      if (fromCloud) banner('<b>' + tl('cloud.loaded') + '</b><small>' + tl('cloud.back_note') + '</small>', 0);
    }
    lastTick = performance.now();
    requestAnimationFrame(loop);
    setInterval(function () { if (!timeHeld && !document.hidden) save(); }, 5000);
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
