var cv = document.getElementById('view');
var WIDE = '(min-width: 600px) and (orientation: landscape)';

// area of each level 1 sprite with alpha of 128 or more: x, y, w, h, then the whole image size, for the thumbnails
var CROP = {
  bakery: [0, 64, 160, 176, 160, 240],
  barn: [48, 146, 128, 126, 224, 272],
  cafe: [0, 88, 160, 152, 160, 240],
  clinic: [0, 4, 256, 332, 256, 336],
  condo: [0, 148, 288, 236, 288, 384],
  coop: [48, 56, 96, 88, 192, 144],
  cottage: [8, 149, 135, 79, 160, 240],
  depot: [0, 128, 256, 208, 256, 336],
  farmhouse: [18, 68, 124, 147, 160, 240],
  fire: [0, 44, 256, 292, 256, 336],
  hotel: [0, 112, 288, 272, 288, 384],
  icecream: [0, 40, 160, 200, 160, 240],
  market: [0, 105, 160, 135, 160, 240],
  office: [0, 160, 288, 224, 288, 384],
  orchard: [14, 186, 190, 46, 240, 240],
  park: [7, 156, 146, 63, 160, 240],
  pier: [0, 0, 128, 112, 128, 320],
  playground: [8, 152, 144, 80, 160, 240],
  police: [0, 160, 256, 176, 256, 336],
  restaurant: [0, 160, 256, 176, 256, 336],
  school: [0, 110, 256, 226, 256, 336],
  station: [0, 53, 384, 122, 384, 176],
  supermarket: [0, 183, 288, 201, 288, 384],
  veg: [65, 83, 62, 43, 192, 144],
  villa: [0, 96, 236, 224, 256, 336],
  warehouse: [0, 84, 224, 140, 224, 224],
  wheat: [65, 83, 62, 43, 192, 144]
};

var LOTS = { small: 'Small lot', medium: 'Medium lot', large: 'Large lot', farmland: 'Farmland', shore: 'Shore', fixed: 'Special lot' };
var DIFF = { cap: 'Room', rate: 'Output', reach: 'Reach', serve: 'Customers', shelf: 'Shelf', bonus: 'Happiness', radius: 'Radius',
  tourists: 'Tourists', pay: 'Pay', store: 'Storage', export: 'Exports', train: 'Train', trucks: 'Trucks' };
// wave, seconds between notes, decay, pitches
var SND = {
  tap: ['triangle', 0.05, 0.07, [440]],
  built: ['triangle', 0.08, 0.18, [392, 523]],
  request: ['sine', 0.08, 0.22, [440, 554, 659]],
  order: ['sine', 0.06, 0.16, [660, 880]],
  area: ['triangle', 0.1, 0.32, [330, 415, 494, 659]],
  won: ['sine', 0.16, 0.6, [262, 330, 392, 523, 659]]
};
var GOOD = { request: 1, built: 1, upgraded: 1, delivered: 1, area: 1 };
var NOTE_TIME = 1500;
var SND_KEY = 'mainstreet.snd';
var WON_KEY = 'mainstreet.won';
var AWAY_CARD = 30;

var lastTime = 0;
var lastSave = 0;
var hiddenAt = 0;
var swapAt = 0;
var shownGroup = '';
var tab = 'map';
var sel = -1;
var openId = '';
var ringAt = '';
var shown = '';
var paint = null;
var markT = 0;
var inbox = [];
var feed = [];
var shownNote = null;
var noteUntil = 0;
var asked = null;
var cardAt = 0;
var topId = '';
var askedId = '';
var pulse = false;
var touching = false;
var wonSeen = false;
var snd = true;
var ac = null;
var el = {};

try {
  snd = localStorage.getItem(SND_KEY) !== '0';
  wonSeen = localStorage.getItem(WON_KEY) === '1';
} catch (e) {}

function $(id) {
  return document.getElementById(id);
}

function h(tag, cls, text) {
  var e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text !== undefined) e.textContent = text;
  return e;
}

function put(e, text) {
  if (e._t === text) return;
  e._t = text;
  e.textContent = text;
}

function icon(name, cls) {
  var e = h('img', 'ico' + (cls ? ' ' + cls : ''));
  e.src = 'assets/ico_' + name + '.png';
  e.alt = '';
  return e;
}

function swap(img, name) {
  var src = 'assets/ico_' + name + '.png';
  if (img._s === src) return;
  img._s = src;
  img.src = src;
}

function settling() {
  return performance.now() - swapAt < 350;
}

function btn(label, cls, fn) {
  var b = h('button', 'btn' + (cls ? ' ' + cls : ''), label);
  b.type = 'button';
  if (fn) {
    b.addEventListener('click', function (e) {
      if (!settling()) fn(e);
    });
  }
  return b;
}

function money(n) {
  return '$' + Math.round(n).toLocaleString('en-US');
}

function compact(n) {
  n = Math.round(n);
  var u = n >= 999.5e6 ? [1e9, 'B'] : n >= 999.5e3 ? [1e6, 'M'] : n >= 1e3 ? [1e3, 'k'] : null;
  if (!u) return '$' + n;
  var v = n / u[0];
  return '$' + (v < 10 ? v.toFixed(1).replace('.0', '') : Math.round(v)) + u[1];
}

function plural(n, one, many) {
  n = Math.round(n);
  return n + ' ' + (n === 1 ? one : many || one + 's');
}

function low(s) {
  return s.toLowerCase();
}

function upper(s) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function called(ids) {
  return ids.map(function (g) {
    return low(GD[g] ? GD[g].name : B[g].name);
  }).join(' and ');
}

function clock(sec) {
  sec = Math.max(0, Math.ceil(sec));
  return Math.floor(sec / 60) + ':' + ('0' + (sec % 60)).slice(-2);
}

function howLong(sec) {
  var m = Math.max(1, Math.round(sec / 60));
  if (m < 60) return m + ' min';
  return Math.floor(m / 60) + ' h' + (m % 60 ? ' ' + (m % 60) + ' min' : '');
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

function thumb(id) {
  var art = id === 'train' ? 'station' : id;
  var c = CROP[art];
  var e = h('span', 'thumb');
  if (!c) return e;
  var s = Math.min(60 / c[2], 52 / c[3]);
  e.style.backgroundImage = 'url(assets/bld_' + art + '_1.png)';
  e.style.backgroundSize = c[4] * s + 'px ' + c[5] * s + 'px';
  e.style.backgroundPosition = (30 - c[2] * s / 2 - c[0] * s) + 'px ' + (26 - c[3] * s / 2 - c[1] * s) + 'px';
  return e;
}

function does(b, st) {
  if (b.cap) return 'Room for ' + st.cap + ' residents';
  if (b.makes && b.needs) return 'Makes ' + called([b.makes]) + ' and sells it, ' + st.rate + ' a minute';
  if (b.makes) return 'Makes ' + called([b.makes]) + ', ' + st.rate + ' a minute';
  if (b.sells) return 'Sells ' + called(b.sells).replace(/ and /g, ', ');
  if (b.bonus) return '+' + st.bonus + ' happiness to homes within ' + st.radius + ' tiles';
  if (b.trucks) return 'Runs ' + st.trucks + ' delivery trucks';
  if (b.store) return 'Room for ' + st.store + ' more of each good';
  if (b.tourists) return 'Brings tourists to the shops';
  if (b.pay) return 'Pays ' + st.pay + ' a minute for each worker';
  if (b.export) return 'Sells spare goods and brings trains';
  return '';
}

function needs(b, st) {
  var p = [];
  if (st.workers) p.push(plural(st.workers, 'worker'));
  if (b.needs) p.push(called(b.needs));
  return p.length ? 'Needs ' + p.join(', ') : 'Needs no workers';
}

function change(a, b) {
  var out = [];
  for (var k in DIFF) if (a[k] !== undefined && b[k] !== undefined && a[k] !== b[k]) out.push(DIFF[k] + ' ' + a[k] + ' to ' + b[k]);
  return out.slice(0, 3).join(', ');
}

function homeName(i) {
  var p = S.plots[i];
  var same = S.plots.filter(function (q, j) {
    return q.b === p.b && PLOTS[j].area === PLOTS[i].area;
  });
  return B[p.b].name + (same.length > 1 ? ' ' + (same.indexOf(p) + 1) : '') + ' in ' + AR[PLOTS[i].area].name;
}

// go: the asked action can be taken now, wait: it is under way or waits for a builder, none: nothing to show
function reqState(r) {
  if (!r || !validLot(r.plot)) return 'none';
  if (r.busy) return 'wait';
  var q = +r.plot;
  var w = r.do === 'build' ? (S.plots[q].b ? 'taken' : why(q, r.want)) : whyUp(q);
  if (!w) return 'go';
  return w === 'all crews busy' || w === 'under construction' ? 'wait' : 'none';
}

function showFix(f, home) {
  if (f.do === 'build') choose(+f.plot, f.want, 'asked');
  else choose(+f.plot, '', 'pulse');
  if (validLot(home) && +home !== +f.plot) mark([+home]);
}

function mark(list) {
  View.mark(list);
  clearTimeout(markT);
  markT = setTimeout(function () {
    View.mark([]);
  }, 6000);
}

function waiting(i, cost) {
  var t = town();
  return !!S.open[PLOTS[i].area] && (t.busy >= t.crews || (!t.free && t.cash < cost));
}

function reason(w) {
  return upper(w).replace('All crews busy', 'All ' + town().crews + ' builders are busy, one frees up when a build finishes');
}

function arm(b, label, sure, act, ready) {
  var t = 0;
  b.addEventListener('click', function () {
    if (settling()) return;
    if (!b._armed) {
      if (ready && !ready()) return;
      b._armed = true;
      put(b, sure);
      t = setTimeout(function () {
        b._armed = false;
        put(b, label);
      }, 3000);
      return;
    }
    clearTimeout(t);
    b._armed = false;
    put(b, label);
    act();
  });
  put(b, label);
}

function setRing(i, r) {
  var key = i + ':' + r;
  if (key === ringAt) return;
  ringAt = key;
  if (r) View.ring(i, r);
  else View.ring();
}

function choose(i, open, ask) {
  sel = i;
  tab = 'map';
  openId = open || '';
  askedId = ask === 'asked' ? openId : '';
  pulse = ask === 'pulse';
  ringAt = '';
  View.select(i);
  View.ring();
  View.mark([]);
  View.focus(i);
  sync();
}

function setTab(t) {
  if (sel >= 0) View.select(-1);
  sel = -1;
  openId = '';
  askedId = '';
  pulse = false;
  ringAt = '';
  View.ring();
  tab = t;
  sync();
}

function head(title, sub, id) {
  var box = h('div', 'head');
  if (id) box.appendChild(thumb(id));
  var nm = h('div', 'name');
  nm.appendChild(h('h2', '', title));
  nm.appendChild(h('p', '', sub));
  var pips = null;
  if (id) {
    pips = h('div', 'pips');
    for (var k = 0; k < 5; k++) pips.appendChild(h('i'));
    nm.appendChild(pips);
  }
  box.appendChild(nm);
  var x = btn('×', 'x', function () {
    setTab('map');
  });
  x.setAttribute('aria-label', 'Close');
  box.appendChild(x);
  return { node: box, pips: pips };
}

function optRow(i, o) {
  var b = B[o.id];
  var st = stats(o.id, 1);
  var radius = st.reach || st.radius || 0;
  var row = h('div', 'opt');
  var main = h('div', 'main');
  var top = h('button');
  top.type = 'button';
  top.appendChild(thumb(o.id));
  var body = h('div', 'info');
  if (askedId === o.id) body.appendChild(h('em', 'tag', 'Asked for'));
  body.appendChild(h('b', '', o.name));
  body.appendChild(h('span', '', does(b, st)));
  body.appendChild(h('span', 'need', needs(b, st)));
  var why = h('span', 'why');
  body.appendChild(why);
  top.appendChild(body);
  main.appendChild(top);
  var go = btn('', 'go buy', function () {
    if (!build(i, o.id)) return;
    sfx('tap');
    buzz();
    sync();
  });
  go.appendChild(h('b', '', 'Build'));
  go.appendChild(h('small', '', money(o.cost)));
  main.appendChild(go);
  row.appendChild(main);
  var more = h('div', 'more');
  var text = radius ? (st.reach ? 'Reaches homes within ' + radius + ' tiles. They can shop here. ' : 'Covers homes within ' + radius + ' tiles. ') : '';
  more.appendChild(h('p', '', text + 'Takes ' + plural(o.build, 'second') + ' to build.'));
  row.appendChild(more);
  top.addEventListener('click', function () {
    if (settling() || row.classList.contains('locked')) return;
    openId = openId === o.id ? '' : o.id;
    setRing(i, openId ? radius : 0);
    sync();
  });
  return {
    id: o.id,
    node: row,
    update: function (now) {
      var w = now.why;
      put(why, w ? reason(w) : '');
      var locked = !!w && !waiting(i, o.cost);
      var open = openId === o.id && !locked;
      if (open) setRing(i, radius);
      row.classList.toggle('locked', locked);
      row.classList.toggle('open', open);
      row.classList.toggle('asked', askedId === o.id);
      top.setAttribute('aria-expanded', open);
      more.hidden = !open;
      go.disabled = !!w;
    }
  };
}

function lotSheet(i) {
  var q = PLOTS[i];
  var box = h('div');
  box.appendChild(head(LOTS[q.kind], AR[q.area].name).node);
  var os = options(i).sort(function (a, c) {
    return (c.id === askedId) - (a.id === askedId);
  });
  var rows = os.map(function (o) {
    var r = optRow(i, o);
    box.appendChild(r.node);
    return r;
  });
  return {
    node: box,
    update: function () {
      var now = {};
      options(i).forEach(function (o) {
        now[o.id] = o;
      });
      rows.forEach(function (r) {
        r.update(now[r.id]);
      });
    }
  };
}

function wantRow(i, w) {
  var row = h('div', 'want');
  var top = h('div', 'row');
  var tick = icon('dot', 'big');
  top.appendChild(tick);
  top.appendChild(h('span', 'grow', upper(w.text)));
  var fix = null;
  var fixBtn = btn('', '', function () {
    if (fix && fix.do && !fix.busy) showFix(fix, i);
  });
  top.appendChild(fixBtn);
  row.appendChild(top);
  var why = h('p', 'line sub');
  row.appendChild(why);
  return {
    node: row,
    update: function (now) {
      swap(tick, now.met ? 'tick' : 'dot');
      fix = now.met ? null : fixFor(i, now.w);
      var can = !!(fix && fix.do);
      fixBtn.hidden = !can;
      if (can) {
        put(fixBtn, fix.busy ? 'Under way' : 'Fix: ' + fix.msg.split('. ').pop().replace(/\.$/, ''));
        fixBtn.disabled = !!fix.busy;
      }
      put(why, fix && fix.why ? fix.why : '');
    }
  };
}

function buildingSheet(i, state) {
  var p = S.plots[i];
  var b = B[p.b];
  var home = !!b.cap;
  var box = h('div');
  var hd = head(b.name, AR[PLOTS[i].area].name, p.b);
  box.appendChild(hd.node);
  var line = h('p', 'line big');
  var bar = h('div', 'bar');
  var fill = h('i');
  bar.appendChild(fill);
  var left = h('p', 'line sub');
  box.appendChild(line);
  box.appendChild(bar);
  box.appendChild(left);
  var up = btn('', 'go wide', function () {
    if (!upgrade(i)) return;
    sfx('tap');
    buzz();
    sync();
  });
  var upl = h('b');
  var ups = h('small');
  up.appendChild(upl);
  up.appendChild(ups);
  var why = h('p', 'line sub');
  var gap = h('div', 'gap');
  box.appendChild(gap);
  box.appendChild(up);
  box.appendChild(why);
  var pair = h('div', 'pair');
  var pz = btn('Pause', '', function () {
    pause(i);
    sync();
  });
  var dz = btn('', 'stop');
  arm(dz, 'Bulldoze', 'Tap again to bulldoze', function () {
    demolish(i);
    buzz();
    sync();
  });
  pair.appendChild(pz);
  pair.appendChild(dz);
  box.appendChild(pair);
  var facts = {};
  ['staff', 'hold', 'shelf', 'reach'].forEach(function (k) {
    facts[k] = h('p', 'line');
    box.appendChild(facts[k]);
  });
  var happy = h('p', 'line mood');
  var face = icon('face_ok', 'big');
  var htext = h('span');
  happy.appendChild(face);
  happy.appendChild(htext);
  happy.hidden = !home || state !== 'y';
  box.appendChild(happy);
  var wbox = h('div');
  wbox.appendChild(h('h3', '', 'To reach the next level'));
  var wrows = (state === 'y' && home ? wants(i) : []).map(function (w) {
    var r = wantRow(i, w);
    wbox.appendChild(r.node);
    return r;
  });
  wbox.hidden = !wrows.length;
  box.appendChild(wbox);
  pz.hidden = home || state !== 'y';
  pair.hidden = state === 'd';
  gap.hidden = up.hidden = why.hidden = state !== 'y';
  return {
    node: box,
    update: function () {
      var inf = info(i);
      var pl = S.plots[i];
      var lvl = pl.l;
      if (hd.pips) {
        [].forEach.call(hd.pips.children, function (c, k) {
          c.className = k < lvl ? 'on' : k === pl.n - 1 ? 'up' : '';
        });
      }
      if (state !== 'y') {
        setRing(i, 0);
        if (state === 'd') {
          put(line, 'Being demolished');
          fill.style.width = Math.round((1 - inf.left / DEMOLISH_TIME) * 100) + '%';
          put(left, '');
        } else {
          put(line, 'Under construction');
          fill.style.width = Math.round((1 - inf.left / b.build[inf.to - 1]) * 100) + '%';
          put(left, plural(Math.ceil(inf.left), 'second') + ' left');
          put(facts.reach, inf.next ? does(b, inf.next) : '');
        }
        return;
      }
      var st = inf.now;
      var s = inf.status.split(', upgrading')[0];
      var text;
      if (home) text = pl.res + ' of ' + st.cap + ' residents';
      else if (pl.off) text = 'Paused';
      else if (s === 'working') {
        if (b.makes) text = 'Making ' + Math.round(inf.make) + ' ' + called([b.makes]) + ' a minute';
        else if (b.sells) text = 'Selling, earning ' + money(inf.cash) + ' a minute';
        else if (b.bonus) text = 'Looking after homes within ' + st.radius + ' tiles';
        else text = 'Working';
      } else text = upper(s);
      put(line, text);
      bar.hidden = !inf.busy;
      if (inf.busy) {
        fill.style.width = Math.round((1 - inf.left / b.build[inf.to - 1]) * 100) + '%';
        put(left, 'Upgrading to level ' + inf.to + ', ' + plural(Math.ceil(inf.left), 'second') + ' left');
      } else put(left, '');
      put(facts.staff, inf.need ? inf.staff + ' of ' + plural(inf.need, 'worker') + (inf.staff < inf.need ? ', the town is short of workers' : '') : '');
      var shelf = [];
      (b.needs || []).concat(b.sells || []).forEach(function (g) {
        if (shelf.indexOf(g) < 0) shelf.push(g);
      });
      put(facts.hold, b.makes && !b.needs ? 'Holds ' + Math.floor(pl.hold) + ' of ' + holdCap(b, lvl) + ' ' + called([b.makes]) : '');
      put(facts.shelf, shelf.length ? 'Shelf: ' + shelf.map(function (g) {
        return low(GD[g].name) + ' ' + Math.floor(pl.shelf[g]);
      }).join(', ') : '');
      var r = st.reach || st.radius || 0;
      put(facts.reach, r ? (st.reach ? 'Reach ' : 'Covers homes within ') + r + ' tiles' : '');
      setRing(i, r);
      if (home) {
        swap(face, pl.h >= 60 ? 'face_good' : pl.h >= 35 ? 'face_ok' : 'face_bad');
        put(htext, 'Happiness ' + Math.round(pl.h));
        wrows.forEach(function (w, k) {
          w.update(inf.wants[k]);
        });
      }
      put(pz, pl.off ? 'Resume' : 'Pause');
      if (lvl >= 5) {
        up.hidden = true;
        put(why, 'Fully built');
        return;
      }
      put(upl, 'Upgrade for ' + money(b.cost[lvl]));
      put(ups, change(inf.now, inf.next) || 'Takes ' + b.build[lvl] + ' seconds');
      up.disabled = !!inf.why;
      up.classList.toggle('pulse', pulse && !inf.why);
      put(why, inf.why ? reason(inf.why) : '');
    }
  };
}

function reqRow(id) {
  var row = h('div', 'row');
  var g = h('div', 'grow');
  var msg = h('b');
  var flag = h('span', 'flag');
  g.appendChild(msg);
  g.appendChild(flag);
  row.appendChild(g);
  var cur = null;
  var show = btn('Show me', '', function () {
    if (cur && reqState(cur) === 'go') showFix(cur, cur.home);
  });
  var wait = h('span', 'waits', 'Under way');
  row.appendChild(show);
  row.appendChild(wait);
  return {
    node: row,
    update: function () {
      cur = S.req.filter(function (r) {
        return r.id === id;
      })[0];
      if (!cur) return;
      var home = validLot(cur.home) && S.plots[cur.home].b;
      put(msg, cur.msg);
      put(flag, (home ? homeName(cur.home) + '. ' : '') + 'Reward ' + money(cur.reward));
      var st = reqState(cur);
      show.hidden = st !== 'go';
      wait.hidden = st !== 'wait';
    }
  };
}

function orderCard(o) {
  var card = h('div', 'opt open order');
  var inner = h('div', 'more');
  var top = h('div', 'top');
  var title = h('div', 'grow');
  title.appendChild(h('b', '', o.from === 'train' ? 'Train order' : 'Town order'));
  var timer = h('span', 'flag');
  title.appendChild(timer);
  top.appendChild(title);
  var go = btn('Deliver', 'go', function () {
    if (!deliver(o.id)) return;
    sfx('order');
    buzz();
    sync();
  });
  top.appendChild(go);
  inner.appendChild(top);
  var rows = {};
  for (var g in o.need) {
    var r = h('div', 'need-row');
    r.appendChild(icon(g, 'big'));
    r.appendChild(h('span', '', GD[g].name));
    rows[g] = { b: h('b'), tick: icon('tick') };
    r.appendChild(rows[g].tick);
    r.appendChild(rows[g].b);
    inner.appendChild(r);
  }
  inner.appendChild(h('p', 'line sub', 'Counts what is in store and at the farms'));
  inner.appendChild(h('p', 'line', 'Pays ' + money(o.reward) + (o.tourists ? ' and brings ' + plural(o.tourists, 'tourist') : '')));
  card.appendChild(inner);
  return {
    node: card,
    update: function () {
      var all = true;
      for (var g in o.need) {
        var have = Math.floor(stockOf(g));
        var ok = have >= o.need[g];
        all = all && ok;
        put(rows[g].b, ok ? String(o.need[g]) : have + ' of ' + o.need[g]);
        rows[g].b.className = ok ? 'ok' : 'no';
        rows[g].tick.hidden = !ok;
      }
      timer.hidden = !o.left;
      put(timer, o.left ? clock(o.left) + ' left' : '');
      go.disabled = !all;
    }
  };
}

function reqSheet() {
  var box = h('div');
  var items = [];
  box.appendChild(h('h3', '', 'Orders'));
  if (!S.orders.length) box.appendChild(h('p', 'line sub', 'No orders yet. They arrive once the town has a few residents.'));
  S.orders.forEach(function (o) {
    var x = orderCard(o);
    items.push(x);
    box.appendChild(x.node);
  });
  box.appendChild(h('h3', '', 'Requests'));
  if (!S.req.length) box.appendChild(h('p', 'line sub', 'Nobody is asking for anything right now.'));
  S.req.forEach(function (r) {
    var x = reqRow(r.id);
    items.push(x);
    box.appendChild(x.node);
  });
  return {
    node: box,
    update: function () {
      items.forEach(function (x) {
        x.update();
      });
    }
  };
}

function makers(id) {
  return BUILDINGS.filter(function (b) {
    return b.makes === id && !b.needs;
  }).map(function (b) {
    return low(b.name).replace(/ch$/, 'che') + 's';
  }).join(' and ');
}

function goodsSheet() {
  var box = h('div');
  var rows = {};
  var trucks = h('p', 'line big');
  box.appendChild(trucks);
  GOODS.forEach(function (g) {
    var row = h('div', 'row');
    row.appendChild(icon(g.id, 'big'));
    var m = h('div', 'grow');
    m.appendChild(h('b', '', g.name));
    var bar = h('div', 'bar');
    var fill = h('i');
    bar.appendChild(fill);
    m.appendChild(bar);
    var store = h('span', 'flag');
    var flow = h('span', 'flag');
    var flag = h('span', 'flag warn');
    m.appendChild(store);
    m.appendChild(flow);
    m.appendChild(flag);
    row.appendChild(m);
    box.appendChild(row);
    rows[g.id] = { fill: fill, store: store, flow: flow, flag: flag, at: makers(g.id) };
  });
  return {
    node: box,
    update: function () {
      var t = town();
      put(trucks, plural(t.trucks, 'truck') + ', ' + t.out + ' out');
      goods().forEach(function (g) {
        var r = rows[g.id];
        r.fill.style.width = Math.min(100, Math.round(g.n / g.cap * 100)) + '%';
        put(r.store, Math.floor(g.n) + ' of ' + g.cap + ' in store' + (g.held >= 1 ? ', ' + Math.floor(g.held) + ' at ' + (r.at || 'the makers') : ''));
        var f = g.made >= 0.5 ? 'Made ' + Math.round(g.made) + ' a minute' : 'Not made yet';
        if (g.used >= 0.5) f += ', used ' + Math.round(g.used);
        put(r.flow, f);
        put(r.flag, g.short ? 'Shops are running out' : g.full ? 'Store is full' : '');
      });
    }
  };
}

function townSheet() {
  var box = h('div');
  var lines = {};
  var intro = 'Copy the code to keep your town, or paste one above to load it.';
  box.appendChild(h('h3', '', 'Next goal'));
  lines.goal = h('p', 'line big');
  box.appendChild(lines.goal);
  var gbar = h('div', 'bar');
  var gfill = h('i');
  gbar.appendChild(gfill);
  box.appendChild(gbar);
  lines.have = h('p', 'line sub');
  box.appendChild(lines.have);
  box.appendChild(h('h3', '', 'Town'));
  ['pop', 'happy', 'work', 'short', 'crew'].forEach(function (k) {
    lines[k] = h('p', k === 'crew' || k === 'short' ? 'line sub' : 'line big');
    box.appendChild(lines[k]);
  });
  box.appendChild(h('h3', '', 'Areas'));
  var areas = AREAS.map(function (a) {
    var row = h('div', 'row');
    var g = h('div', 'grow');
    g.appendChild(h('b', '', a.name));
    var bar = h('div', 'bar');
    var fill = h('i');
    bar.appendChild(fill);
    g.appendChild(bar);
    row.appendChild(g);
    var num = h('span', 'num');
    row.appendChild(num);
    box.appendChild(row);
    return { a: a, fill: fill, num: num };
  });
  box.appendChild(h('div', 'gap'));
  var sound = btn('', 'wide', function () {
    snd = !snd;
    try {
      localStorage.setItem(SND_KEY, snd ? '1' : '0');
    } catch (e) {}
    wake();
    sync();
  });
  box.appendChild(sound);
  box.appendChild(h('h3', '', 'Save code'));
  var note = h('p', 'line sub', intro);
  var field = h('textarea');
  field.setAttribute('aria-label', 'Save code');
  field.setAttribute('autocapitalize', 'off');
  field.setAttribute('autocomplete', 'off');
  field.spellcheck = false;
  box.appendChild(field);
  var pair = h('div', 'pair');
  var copy = btn('Copy code', '', function () {
    var c = code();
    field.value = c;
    var select = function () {
      field.readOnly = true;
      field.focus();
      field.select();
      field.setSelectionRange(0, c.length);
      field.readOnly = false;
      put(note, 'Copy the selected code.');
    };
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(c).then(function () {
        put(note, 'Code copied.');
      }, select);
    } else select();
  });
  var use = btn('', '');
  arm(use, 'Load code', 'Tap again to replace this town', function () {
    if (!restore(field.value)) {
      put(note, 'That is not a save code.');
      return;
    }
    inbox.length = feed.length = 0;
    View.clear();
    wonSeen = !!town().won;
    el.won.hidden = true;
    try {
      if (wonSeen) localStorage.setItem(WON_KEY, '1');
      else localStorage.removeItem(WON_KEY);
    } catch (e) {}
    put(note, save() ? 'Town loaded.' : 'Town loaded, but storage is full or blocked so it will not be kept.');
    setTab('map');
  }, function () {
    if (field.value.trim()) return true;
    put(note, 'Paste a code first.');
    return false;
  });
  pair.appendChild(copy);
  pair.appendChild(use);
  box.appendChild(pair);
  box.appendChild(note);
  var rs = btn('Reset town', 'stop wide', function () {
    sure.hidden = false;
    rs.hidden = true;
  });
  box.appendChild(rs);
  var sure = h('div');
  sure.hidden = true;
  sure.appendChild(h('p', 'line', 'Erase this town and start again?'));
  var yn = h('div', 'pair');
  yn.appendChild(btn('Keep it', '', function () {
    sure.hidden = true;
    rs.hidden = false;
  }));
  yn.appendChild(btn('Erase', 'stop', function () {
    reset();
    wonSeen = false;
    try {
      localStorage.removeItem(WON_KEY);
    } catch (e) {}
    feed.length = 0;
    View.clear();
    save();
    setTab('map');
  }));
  sure.appendChild(yn);
  box.appendChild(sure);
  var credit = h('a', 'credit', 'Art: LimeZu (https://limezu.itch.io/)');
  credit.href = 'https://limezu.itch.io/';
  credit.target = '_blank';
  credit.rel = 'noopener';
  box.appendChild(credit);
  return {
    node: box,
    update: function () {
      var t = town();
      var g = goalNow();
      put(lines.goal, g.text);
      gbar.hidden = lines.have.hidden = !!g.done;
      if (!g.done) gfill.style.width = Math.min(100, Math.round(g.have / g.need * 100)) + '%';
      put(lines.have, g.done ? '' : g.happyNeed ? plural(g.have, 'resident') + ' of ' + g.need + ', happiness ' + g.happy + ' of ' + g.happyNeed : g.have + ' of ' + plural(g.need, 'resident'));
      put(lines.pop, plural(t.pop, 'resident') + ', room for ' + t.cap);
      put(lines.happy, 'Happiness ' + Math.round(t.happy) + (t.happy < MOVE_IN ? '. People will not move in while it is under ' + MOVE_IN : '. People move in while it is over ' + MOVE_IN));
      var need = Math.floor(t.need);
      var work = Math.floor(t.work);
      put(lines.work, plural(need, 'job') + ', ' + plural(work, 'worker'));
      lines.work.classList.toggle('warn', need > work);
      put(lines.short, need > work ? 'More jobs than workers, so shops and farms run slow. Build homes.' : '');
      put(lines.crew, t.busy + ' of ' + plural(t.crews, 'builder') + ' busy. A new one joins with every 40 residents.');
      areas.forEach(function (r) {
        var open = S.open[r.a.id];
        r.fill.style.width = (open ? 100 : Math.min(100, Math.round(t.pop / r.a.unlock * 100))) + '%';
        put(r.num, open ? 'Open' : t.pop + ' of ' + r.a.unlock);
      });
      put(sound, snd ? 'Sound: on' : 'Sound: off');
    }
  };
}

function idleSheet() {
  var box = h('div');
  box.appendChild(h('h3', '', 'Your town'));
  box.appendChild(h('p', 'line', 'Tap an empty lot to build, or a building to look after it.'));
  return { node: box, update: function () {} };
}

function show(key, make, group) {
  group = group || key;
  // a rebuild under a finger would drop the scroll and swallow the tap
  if (key !== shown && touching && group === shownGroup) key = shown;
  if (key !== shown) {
    shown = key;
    var top = el.sheet.scrollTop;
    var r = make();
    el.sheet.replaceChildren(r.node);
    el.sheet.classList.toggle('idle', key === 'idle');
    el.sheet.scrollTop = group === shownGroup ? top : 0;
    shownGroup = group;
    swapAt = performance.now();
    paint = r.update;
  }
  paint();
  el.sheet.classList.toggle('more', el.sheet.scrollHeight - el.sheet.scrollTop - el.sheet.clientHeight > 4);
}

function sheet() {
  if (sel >= 0) {
    var p = S.plots[sel];
    var kind = !p.b ? 'e' : p.dem > 0 ? 'd' : p.l < 1 ? 'n' : 'y' + p.l;
    if (kind === 'e') {
      show('e' + sel + askedId, function () {
        return lotSheet(sel);
      }, 'e' + sel);
      return;
    }
    show('b' + sel + p.b + kind + (pulse ? 'p' : ''), function () {
      return buildingSheet(sel, kind.charAt(0));
    }, 'b' + sel);
    return;
  }
  if (tab === 'req') {
    var sig = S.req.map(function (r) {
      return r.id;
    }).join() + '|' + S.orders.map(function (o) {
      return o.id;
    }).join();
    show('req' + sig, reqSheet, 'req');
  } else if (tab === 'goods') show('goods', goodsSheet);
  else if (tab === 'town') show('town', townSheet);
  else show('idle', idleSheet);
}

function topLine() {
  var at = performance.now();
  if (!shownNote || at >= noteUntil) {
    shownNote = feed.shift() || null;
    noteUntil = at + NOTE_TIME;
  }
  if (shownNote) {
    asked = null;
    el.ask.hidden = false;
    el.ask.classList.toggle('done', shownNote.good);
    put(el.askText, shownNote.text);
    el.askMore.hidden = el.askBtn.hidden = el.askWait.hidden = true;
    return;
  }
  el.ask.classList.remove('done');
  var r = S.req[0];
  // a request the finger is on stays until the tap lands
  if (asked && asked !== 'order' && performance.now() - cardAt < 400) r = S.req.filter(function (q) {
    return q.id === asked.id;
  })[0] || r;
  var ready = S.orders.some(function (o) {
    for (var g in o.need) if (stockOf(g) < o.need[g]) return false;
    return true;
  });
  topId = r ? r.id : '';
  asked = r || (ready ? 'order' : null);
  el.ask.hidden = !asked;
  if (!asked) return;
  var st = r ? reqState(r) : 'go';
  put(el.askText, r ? r.msg : 'An order is ready to deliver.');
  el.askBtn.hidden = st !== 'go';
  el.askWait.hidden = st !== 'wait';
  el.askMore.hidden = S.req.length < 2;
  put(el.askMore, '+' + (S.req.length - 1));
  put(el.askBtn, r ? 'Show me' : 'Orders');
}

function toastText(n) {
  var pay = n.reward ? ', +' + money(n.reward) : '';
  if (n.kind === 'area') return n.text + ' unlocked';
  if (n.kind === 'request') {
    var act = n.text.split('. ').pop();
    var nm = B[n.bid] ? B[n.bid].name : '';
    if (nm && /^Build/.test(act)) return nm + ' built' + pay;
    if (nm && /^Upgrade/.test(act)) return nm + ' upgraded' + pay;
    return 'Request done' + pay;
  }
  if (n.kind === 'lapsed') return 'Nobody needs that any more';
  if (n.kind === 'delivered') return 'Order delivered' + pay;
  if (n.kind === 'order') return n.text === 'train' ? 'The train brought an order' : 'New order from town';
  if (n.kind === 'built') return n.text + ' built';
  if (n.kind === 'upgraded') return n.text + ' is now level ' + n.lvl;
  if (n.kind === 'demolished') return n.text + ' demolished';
  return '';
}

var CUE = { built: 'built', upgraded: 'built', request: 'request', delivered: 'order', area: 'area' };

function isBuilt(x, n) {
  return x.bid === n.bid && (x.kind === 'built' || x.kind === 'upgraded');
}

function toasts() {
  inbox.splice(0).forEach(function (n) {
    var text = toastText(n);
    if (!text) return;
    if (CUE[n.kind]) sfx(CUE[n.kind]);
    if (n.kind === 'request') {
      // the request and the build it asked for are one event
      var at = -1;
      feed.forEach(function (x, j) {
        if (isBuilt(x, n)) at = j;
      });
      var pay = n.reward ? ', +' + money(n.reward) : '';
      if (at >= 0) {
        text = feed[at].text.replace(/ is now level [0-9]/, ' upgraded') + pay;
        feed.splice(at, 1);
      } else if (shownNote && isBuilt(shownNote, n)) {
        shownNote.text = shownNote.text.replace(/ is now level [0-9]/, ' upgraded') + pay;
        shownNote.kind = n.kind;
        noteUntil = performance.now() + NOTE_TIME;
        return;
      }
    }
    feed.push({ text: text, bid: n.bid, kind: n.kind, good: !!GOOD[n.kind] });
  });
  if (feed.length > 4) feed.splice(0, feed.length - 4);
}

function showWon(t) {
  wonSeen = true;
  try {
    localStorage.setItem(WON_KEY, '1');
  } catch (e) {}
  var items = ['Time played: ' + howLong(t.t), 'Residents: ' + t.pop, 'Buildings: ' + t.buildings, 'Orders delivered: ' + t.delivered];
  el.wonList.replaceChildren.apply(el.wonList, items.map(function (s) {
    return h('li', '', s);
  }));
  el.won.hidden = false;
  sfx('won');
}

function sync() {
  var t = town();
  var need = Math.floor(t.need);
  var work = Math.floor(t.work);
  put(el.cash, t.free ? '∞' : compact(t.cash));
  put(el.pop, String(t.pop));
  if (t.won && !wonSeen && el.away.hidden) showWon(t);
  put(el.work, need + '/' + work);
  el.work.parentNode.classList.toggle('warn', need > work);
  swap(el.face, t.happy >= 60 ? 'face_good' : t.happy >= 35 ? 'face_ok' : 'face_bad');
  put(el.happy, String(Math.round(t.happy)));
  var say = (t.free ? 'Unlimited money' : money(t.cash)) + ', ' + plural(t.pop, 'resident') + ', workers needed ' + need + ' of ' + work +
    ', happiness ' + Math.round(t.happy) + '. Open town details';
  if (el.stats._a !== say) el.stats.setAttribute('aria-label', el.stats._a = say);
  el.stats.classList.toggle('on', tab === 'town' && sel < 0);
  var n = S.req.length + S.orders.length;
  el.badge.hidden = !n;
  put(el.badge, String(n));
  [].forEach.call(el.tabs, function (b) {
    b.classList.toggle('on', b.dataset.tab === (sel >= 0 ? 'map' : tab));
  });
  el.goodsBtn.classList.toggle('on', tab === 'goods' && sel < 0);
  topLine();
  sheet();
  toasts();
  var at = [];
  S.req.forEach(function (r) {
    var i = validLot(r.home) ? +r.home : validLot(r.plot) ? +r.plot : -1;
    if (i >= 0 && at.indexOf(i) < 0) at.push(i);
  });
  View.bubbles(at);
}

function showAway(sum) {
  put(el.awayTime, 'You were gone for ' + howLong(sum.sec) + '.');
  var items = [];
  if (sum.earned >= 1 && !town().free) items.push('Earned ' + money(sum.earned));
  if (sum.pop > 0) items.push(plural(sum.pop, 'new resident'));
  if (sum.pop < 0) items.push(plural(-sum.pop, 'resident') + ' moved out');
  if (sum.built > 0) items.push(plural(sum.built, 'building') + ' finished');
  if (sum.areas > 0) items.push(plural(sum.areas, 'new area') + ' opened');
  if (S.orders.length) items.push(plural(S.orders.length, 'order') + ' waiting');
  if (!items.length) items.push('Things were quiet');
  el.awayList.replaceChildren.apply(el.awayList, items.map(function (s) {
    return h('li', '', s);
  }));
  el.away.hidden = false;
}

function fit() {
  View.inset(matchMedia(WIDE).matches ? 0 : el.panel.offsetHeight, $('top').getBoundingClientRect().bottom);
}

function tap(i) {
  if (i >= 0) choose(i);
  else if (sel >= 0 || tab !== 'map') setTab('map');
}

function loop(now) {
  requestAnimationFrame(loop);
  if (now - lastTime < 30) return;
  var dt = Math.min(1, (now - lastTime) / 1000);
  lastTime = now;
  tick(dt);
  var seen = takeNotes();
  View.feed(takeMoves(), takeTrips(), seen);
  for (var k = 0; k < seen.length; k++) inbox.push(seen[k]);
  View.draw(now);
  if (!shownNote && (S.req[0] ? S.req[0].id : '') !== topId) topLine();
  if (now - lastSave > 5000) {
    save();
    lastSave = now;
  }
}

function start() {
  el.sheet = $('sheet');
  el.panel = $('panel');
  el.ask = $('ask');
  el.askText = el.ask.querySelector('p');
  el.askBtn = el.ask.querySelector('.go');
  el.askMore = el.ask.querySelector('.more');
  el.askWait = el.ask.querySelector('.waits');
  el.won = $('won');
  el.wonList = $('wonlist');
  el.cash = $('st-cash').querySelector('b');
  el.pop = $('st-pop').querySelector('b');
  el.work = $('st-work').querySelector('b');
  el.happy = $('st-happy').querySelector('b');
  el.face = $('st-happy').querySelector('img');
  el.stats = $('stats');
  el.goodsBtn = $('goodsbtn');
  el.tabs = document.querySelectorAll('#tabs button');
  el.badge = document.querySelector('#tabs i');
  el.away = $('away');
  el.awayTime = $('awaytime');
  el.awayList = $('awaylist');

  var back = load();
  View.init(cv, tap);
  [].forEach.call(el.tabs, function (b) {
    b.addEventListener('click', function () {
      setTab(b.dataset.tab);
    });
  });
  el.stats.addEventListener('click', function () {
    setTab(tab === 'town' && sel < 0 ? 'map' : 'town');
  });
  el.goodsBtn.addEventListener('click', function () {
    setTab(tab === 'goods' && sel < 0 ? 'map' : 'goods');
  });
  el.ask.addEventListener('pointerdown', function () {
    cardAt = performance.now();
  });
  el.askBtn.addEventListener('click', function () {
    if (asked === 'order') {
      setTab('req');
      return;
    }
    var r = asked && S.req.filter(function (q) {
      return q.id === asked.id;
    })[0];
    if (!r || r.msg !== el.askText.textContent) topLine();
    else if (reqState(r) === 'go') showFix(r, r.home);
  });
  el.askMore.addEventListener('click', function () {
    setTab('req');
  });
  $('wonok').addEventListener('click', function () {
    el.won.hidden = true;
  });
  el.sheet.addEventListener('pointerdown', function () {
    touching = true;
  });
  ['pointerup', 'pointercancel', 'lostpointercapture'].forEach(function (e) {
    document.addEventListener(e, function () {
      touching = false;
    });
  });
  el.sheet.addEventListener('scroll', function () {
    el.sheet.classList.toggle('more', el.sheet.scrollHeight - el.sheet.scrollTop - el.sheet.clientHeight > 4);
  });
  $('awayok').addEventListener('click', function () {
    el.away.hidden = true;
  });
  document.addEventListener('pointerup', wake);
  document.addEventListener('visibilitychange', function () {
    if (document.hidden) {
      save();
      hiddenAt = Date.now();
      return;
    }
    if (!hiddenAt) return;
    var sec = (Date.now() - hiddenAt) / 1000;
    hiddenAt = 0;
    lastTime = performance.now();
    if (sec < 2) return;
    var sum = away(sec);
    if (sec > AWAY_CARD) showAway(sum);
  });
  var watch = new ResizeObserver(fit);
  watch.observe(el.panel);
  watch.observe($('top'));
  window.addEventListener('resize', fit);
  fit();
  try {
    sync();
  } catch (e) {}
  if (back) showAway(back);
  setInterval(sync, 250);
  requestAnimationFrame(loop);
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
