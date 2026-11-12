var View = (function () {
  var BASE = 'assets/';
  var IT = 64; // space under the top bar
  var IB = 118; // space over the Next button
  var GRASS = '#47975a';
  var WALK = '#dad4cb';
  var CURB = '#a09a92';
  var ASPHALT = '#534f52';
  var DIRT = '#b08c5a';
  var CAR_DIR = { east: 1, west: 2 };
  var FACE = { right: 0, up: 6, left: 12, down: 18 };
  var IMG = {};
  var PROC = { plaza: 1, court: 1 };
  var cv;
  var ctx;
  var cw = 0;
  var ch = 0;
  var dpr = 1;
  var z = 1;
  var view = 'town';
  var cam = { y: 0, from: 0, to: 0, t0: 0, dur: 0, q: [], fade: 0, fadeT: 0 };
  var cnt = {};
  var townBG;
  var schoolBG;
  var landCv = {};
  var sorted;
  var fx = { puffs: [], floats: [], coins: [], conf: [] };
  var people = [];
  var cars = [];
  var coinAt = 0;
  var last = 0;
  var loaded = 0;
  var wanted = 0;
  var ready = false;
  var rng = 7;
  var onTap = function () {};
  var drag = null;

  function rand() {
    rng = (rng * 16807) % 2147483647;
    return rng / 2147483647;
  }

  function mk(w, h) {
    var c = document.createElement('canvas');
    c.width = w;
    c.height = h;
    var g = c.getContext('2d');
    g.imageSmoothingEnabled = false;
    return c;
  }

  function load(name) {
    if (IMG[name] || PROC[name] || name === '-') return;
    wanted++;
    var i = new Image();
    i.onload = function () {
      loaded++;
      if (loaded === wanted) init2();
    };
    i.onerror = i.onload;
    i.src = BASE + name + '.png';
    IMG[name] = i;
  }

  function names() {
    PIECES.forEach(function (p) {
      for (var k in p.s) load(p.s[k]);
    });
    INSIDE.forEach(function (p) { load(p.spr); });
    ['lockfence', 'coin', 'park_5', 'clinic_3', 'f_class', 'f_rest', 'f_lib', 'f_cafe', 'f_hall', 'f_path', 'wall', 'wall_v',
      'yfence', 'adult_2', 'adult_3', 'adult_4', 'adult_5', 'adult_6', 'adult_8'].forEach(load);
    for (var i = 1; i <= 8; i++) load('kid_' + i);
  }

  function frame(g, w, h) {
    var f = IMG.lockfence;
    for (var x = 0; x < w; x++) {
      g.drawImage(f, x === 0 ? 0 : x === w - 1 ? 32 : 16, 0, 16, 16, x * 16, 0, 16, 16);
      g.drawImage(f, x === 0 ? 0 : x === w - 1 ? 32 : 16, 32, 16, 16, x * 16, (h - 1) * 16, 16, 16);
    }
    for (var y = 1; y < h - 1; y++) {
      g.drawImage(f, 0, 16, 16, 16, 0, y * 16, 16, 16);
      g.drawImage(f, 32, 16, 16, 16, (w - 1) * 16, y * 16, 16, 16);
    }
  }

  function grid(g, w, h, col) {
    g.strokeStyle = col;
    g.lineWidth = 1;
    g.beginPath();
    for (var x = 0; x <= w; x += 16) {
      g.moveTo(x + 0.5, 0);
      g.lineTo(x + 0.5, h);
    }
    for (var y = 0; y <= h; y += 16) {
      g.moveTo(0, y + 0.5);
      g.lineTo(w, y + 0.5);
    }
    g.stroke();
  }

  function init2() {
    var p = mk(384, 352);
    var g = p.getContext('2d');
    g.fillStyle = WALK;
    g.fillRect(0, 0, 384, 352);
    grid(g, 384, 352, '#cdc6bc');
    IMG.plaza = p;
    var c = mk(144, 112);
    g = c.getContext('2d');
    g.fillStyle = '#4d7aa8';
    g.fillRect(0, 0, 144, 112);
    g.strokeStyle = '#e8eef5';
    g.lineWidth = 2;
    g.strokeRect(20, 22, 104, 68);
    g.beginPath();
    g.moveTo(72, 22);
    g.lineTo(72, 90);
    g.stroke();
    g.beginPath();
    g.arc(72, 56, 14, 0, 6.3);
    g.stroke();
    frame(g, 9, 7);
    IMG.court = c;
    buildTown();
    buildSchool();
    ready = true;
    sync(false, 0);
    seed();
    view = 'town';
    focusNow();
  }

  function buildTown() {
    townBG = mk(TW * 16, TH * 16);
    var g = townBG.getContext('2d');
    g.fillStyle = GRASS;
    g.fillRect(0, 0, TW * 16, TH * 16);
    var W = TW * 16;
    STREETS.forEach(function (n) {
      g.fillStyle = WALK;
      g.fillRect(0, n * 16, W, 16);
      g.fillRect(0, (n + 4) * 16, W, 16);
      g.fillStyle = ASPHALT;
      g.fillRect(0, (n + 1) * 16, W, 48);
      g.fillStyle = CURB;
      g.fillRect(0, (n + 1) * 16, W, 2);
      g.fillRect(0, (n + 4) * 16 - 2, W, 2);
      g.fillStyle = '#ece8d6';
      for (var x = 8; x < W; x += 32) g.fillRect(x, (n + 2.5) * 16 - 1, 16, 2);
    });
  }

  function buildSchool() {
    schoolBG = mk(SW * 32, SH * 32);
    var g = schoolBG.getContext('2d');
    g.fillStyle = '#262830';
    g.fillRect(0, 0, SW * 32, SH * 32);
    var key;
    for (key in ROOMS) {
      var r = ROOMS[key];
      var f = r.floor;
      if (key === 'yard') continue;
      for (var y = f[1]; y < f[1] + f[3]; y++) {
        for (var x = f[0] - (r.door ? 1 : 0); x < f[0] + f[2]; x++) g.drawImage(IMG[r.tile], 0, (y % 2) * 32, 32, 32, x * 32, y * 32, 32, 32);
      }
    }
    g.fillStyle = GRASS;
    g.fillRect(0, 40 * 32, SW * 32, 12 * 32);
    for (var py = 38; py < SH; py++) {
      for (var px = 1; px <= 2; px++) g.drawImage(IMG.f_path, 0, (py % 2) * 32, 32, 32, px * 32, py * 32, 32, 32);
    }
    var doors = {};
    for (key in ROOMS) if (ROOMS[key].door) doors[ROOMS[key].door] = 1;
    for (var hy = 2; hy < 38; hy++) g.drawImage(IMG.f_hall, 0, (hy % 2) * 32, 10, 32, 96, hy * 32, 10, 32);
    // a wall is 12 px thick; bands of back wall are clipped to it
    function wallH(x0, x1, y, gap, from, to) {
      g.save();
      g.beginPath();
      g.rect(from, y * 32, to - from, 64);
      g.clip();
      for (var x = x0; x <= x1; x++) {
        if (gap && gap.indexOf(x) >= 0) continue;
        var c = x === x0 ? 0 : x === x1 ? 2 : 1;
        for (var r2 = 0; r2 < 2; r2++) g.drawImage(IMG.wall, c * 32, r2 * 32, 32, 32, x * 32, (y + r2) * 32, 32, 32);
      }
      g.restore();
    }
    function wallV(x, y0, y1) {
      for (var y = y0; y <= y1; y++) {
        if (x === 106 && doors[y]) {
          g.fillStyle = '#a88a5c';
          g.fillRect(x, y * 32 + 4, 12, 24);
          g.fillStyle = '#5a6a94';
          g.fillRect(x, y * 32, 12, 4);
          g.fillRect(x, y * 32 + 28, 12, 4);
          continue;
        }
        g.drawImage(IMG.wall_v, 10, 0, 12, 32, x, y * 32, 12, 32);
        g.fillStyle = '#2a2f4a';
        g.fillRect(x, y * 32, 1, 32);
        g.fillRect(x + 11, y * 32, 1, 32);
      }
    }
    wallH(0, 11, 0, null, 20, 364);
    ['class1', 'class2', 'rest', 'lib', 'cafe'].forEach(function (id) {
      wallH(3, 11, ROOMS[id].floor[1] - 2, null, 106, 364);
    });
    wallV(20, 2, 37);
    wallV(352, 2, 37);
    wallV(106, 2, 37);
    wallH(0, 11, 38, [1, 2], 20, 364);
  }

  function seed() {
    sorted = INSIDE.slice().sort(function (a, b) {
      return ((a.flat ? 0 : 1) - (b.flat ? 0 : 1)) || (a.y - b.y) || ((a.person ? 1 : 0) - (b.person ? 1 : 0)) || (a.x - b.x);
    });
  }

  function pick(spr, c) {
    var best = -1;
    for (var k in spr) if (+k <= c && +k > best) best = +k;
    var s = best < 0 ? null : spr[best];
    return s === '-' ? null : s;
  }

  // updates what every piece shows; returns the pieces that changed when animating
  function sync(animate, now, delay) {
    PROJECTS.forEach(function (p) { cnt[p.id] = got(p.id); });
    cnt.sch = counter('sch');
    var changed = [];
    PIECES.forEach(function (p) {
      var n = pick(p.s, cnt[p.k]);
      if (n !== p.cur) {
        if (animate && n) {
          p.t0 = now + (delay || 0);
          changed.push(p);
        }
        p.cur = n;
      }
    });
    INSIDE.forEach(function (p) {
      var n = p.s <= cnt[p.r] ? p.spr : null;
      if (n !== p.cur) {
        if (animate && n) {
          p.t0 = now + (delay || 0);
          changed.push(p);
        }
        p.cur = n;
      }
    });
    return changed;
  }

  function locked(id) {
    var l = LANDS[id];
    return l.till ? got(l.till) === 0 : true;
  }

  function resize() {
    var r = cv.getBoundingClientRect();
    dpr = window.devicePixelRatio || 1;
    cw = r.width;
    ch = r.height;
    cv.width = Math.round(cw * dpr);
    cv.height = Math.round(ch * dpr);
    z = cw / 384;
    clamp();
  }

  function worldH() {
    return view === 'town' ? TH * 16 : SH * 32;
  }

  function clamp() {
    var lo = -IT / z;
    var hi = worldH() - (ch - IB) / z;
    cam.y = Math.max(lo, Math.min(hi, cam.y));
  }

  function centerOn(wy) {
    var y = wy - ((IT + ch - IB) / 2) / z;
    return Math.max(-IT / z, Math.min(worldH() - (ch - IB) / z, y));
  }

  function focusNow() {
    var y;
    var n = upNext();
    if (n && PROJ[n.p].room) {
      view = 'school';
      y = roomY(n.p);
    } else {
      view = 'town';
      y = n ? blockY(n.p) : 44 * 16;
    }
    cam.y = centerOn(y);
    clamp();
  }

  function blockY(id) {
    var l = LANDS[id];
    if (l) {
      var a = l.rects[0];
      var b = l.rects[l.rects.length - 1];
      return (a[1] + b[1] + b[3]) / 2 * 16;
    }
    var key = id === 'homes' ? 'homes' : 'main';
    var sum = 0;
    var n = 0;
    PIECES.forEach(function (p) {
      if (p.k === key && p.z) {
        sum += p.y;
        n++;
      }
    });
    return sum / n * 16;
  }

  function roomY(id) {
    var f = ROOMS[id].floor;
    return (f[1] + f[3] / 2) * 32;
  }

  function ease(u) {
    return u < 0.5 ? 2 * u * u : 1 - Math.pow(-2 * u + 2, 2) / 2;
  }

  // queue a camera move; returns how long it takes in seconds
  function go(v, wy) {
    var t = 0;
    cam.q = [];
    var pan = function (y, d) {
      cam.q.push({ t: 'pan', y: y, d: d });
      t += d;
    };
    var d = function (y0, y1) {
      return Math.max(0.35, Math.min(1.1, Math.abs(y0 - y1) / 1100));
    };
    if (v === view) {
      pan(centerOn(wy), d(cam.y, centerOn(wy)));
    } else if (v === 'school') {
      pan(centerOn(44 * 16), d(cam.y, centerOn(44 * 16)));
      cam.q.push({ t: 'view', v: v, y: centerOn(wy) });
      t += 0.5;
    } else {
      cam.q.push({ t: 'view', v: v, y: centerOn(wy) });
      t += 0.5;
    }
    cam.cur = null;
    return t;
  }

  function stepCam(now) {
    if (!cam.cur && cam.q.length) {
      var a = cam.q.shift();
      cam.cur = a;
      a.t0 = now;
      if (a.t === 'pan') {
        cam.from = cam.y;
        cam.to = a.y;
      } else {
        a.d = 0.5;
        a.sw = false;
      }
    }
    var c = cam.cur;
    if (!c) return;
    var u = Math.min(1, (now - c.t0) / 1000 / c.d);
    if (c.t === 'pan') {
      cam.y = cam.from + (cam.to - cam.from) * ease(u);
    } else {
      cam.fade = u < 0.5 ? u * 2 : (1 - u) * 2;
      if (u >= 0.5 && !c.sw) {
        c.sw = true;
        view = c.v;
        cam.y = c.y;
        clamp();
      }
    }
    if (u >= 1) {
      cam.cur = null;
      cam.fade = 0;
    }
  }

  function busy() {
    return !!cam.cur || cam.q.length > 0;
  }

  function mean(list, scale) {
    var x = 0;
    var y = 0;
    list.forEach(function (p) {
      x += p.x;
      y += p.y;
    });
    return { x: x / list.length * scale, y: y / list.length * scale };
  }

  // a step was just bought: move the camera, then drop the new pieces in
  function stepped(res, now) {
    var step = res.step;
    var room = !!PROJ[step.p].room;
    var v = room ? 'school' : 'town';
    var changed = sync(true, now, 0);
    var mine = changed.filter(function (p) {
      return room ? p.r === step.p : p.k === step.p;
    });
    var focus;
    if (mine.length) focus = mean(mine, room ? 32 : 16);
    else focus = { x: 192, y: room ? roomY(step.p) : blockY(step.p) };
    var t = go(v, focus.y);
    changed.forEach(function (p) {
      p.t0 = now + t * 1000 + 80;
    });
    changed.slice(0, 10).forEach(function (p) {
      var s = room ? 32 : 16;
      fx.puffs.push({ x: p.x * s, y: p.y * s + (room ? 32 : 0), t0: p.t0 });
    });
    fx.floats.push({ x: focus.x, y: focus.y - 20, text: '+$' + fmt(step.inc) + '/s', t0: now + t * 1000 + 150 });
    return t;
  }

  function fmt(v) {
    if (v >= 1e6) return (v / 1e6).toFixed(v >= 1e7 ? 0 : 1).replace('.0', '') + 'M';
    if (v >= 1e4) return Math.round(v / 1e3) + 'k';
    return String(Math.round(v));
  }

  function confetti() {
    var cols = ['#e8b030', '#c4432f', '#4f9a40', '#4a8ad0', '#f0f0f0'];
    for (var i = 0; i < 90; i++) {
      fx.conf.push({ x: cw * rand(), y: -20 - rand() * 200, vx: (rand() - 0.5) * 60, vy: 120 + rand() * 160,
        c: cols[i % 5], r: 3 + rand() * 4, a: rand() * 6 });
    }
  }

  function sprite(p, now) {
    var im = IMG[p.cur];
    if (!im) return;
    var w = im.width;
    var h = im.height;
    var x = p.x * 16 - w / 2;
    var y = p.y * 16 - h;
    if (p.car) {
      ctx.drawImage(im, 0, 0, 80, 80, p.x * 16 - 20, p.y * 16 - 35.5, 40, 40);
      return;
    }
    var u = p.t0 ? (now - p.t0) / 1000 : 9;
    if (u < 0) return;
    var a = 1;
    if (u < 0.55) {
      var v = u / 0.55;
      y -= (1 - v) * (1 - v) * 22 - Math.sin(v * 9.4) * (1 - v) * 2;
      a = Math.min(1, v * 4);
    }
    if (a < 1) ctx.globalAlpha = a;
    ctx.drawImage(im, Math.round(x), Math.round(y));
    ctx.globalAlpha = 1;
  }

  function person(sheet, face, fr, walk, x, feet, k) {
    var im = IMG[sheet];
    if (!im) return;
    var sx = (FACE[face] + fr) * 32;
    var sy = walk ? 64 : 0;
    ctx.drawImage(im, sx, sy, 32, 64, Math.round(x - 16 * k), Math.round(feet - 64 * k), 32 * k, 64 * k);
  }

  function sign(l, rect) {
    var cx = (rect[0] + rect[2] / 2) * 16;
    var cy = (rect[1] + rect[3] / 2) * 16;
    var w = 150;
    var h = 46;
    ctx.fillStyle = '#78502c';
    ctx.strokeStyle = '#462c1a';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(cx - w / 2, cy - h / 2, w, h, 5);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#ffeec8';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'alphabetic';
    ctx.font = 'bold 15px system-ui, sans-serif';
    ctx.fillText(l.name.toUpperCase(), cx + 8, cy - 3);
    ctx.font = '9px system-ui, sans-serif';
    ctx.fillText(l.sub, cx + 8, cy + 12);
    ctx.fillStyle = '#f0c83c';
    ctx.fillRect(cx - w / 2 + 11, cy - 1, 11, 9);
    ctx.strokeStyle = '#5a3c14';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(cx - w / 2 + 16.5, cy - 1, 4, Math.PI, 0);
    ctx.stroke();
  }

  function landCanvas(id, i) {
    var key = id + i;
    if (landCv[key]) return landCv[key];
    var r = LANDS[id].rects[i];
    var c = mk(r[2] * 16, r[3] * 16);
    var g = c.getContext('2d');
    g.fillStyle = DIRT;
    g.fillRect(0, 0, c.width, c.height);
    g.fillStyle = '#a07c4e';
    for (var y = 32; y < c.height - 16; y += 32) g.fillRect(20, y, c.width - 40, 2);
    var v = LANDS[id].view;
    if (v === 'lot_home') {
      g.globalAlpha = 0.55;
      g.drawImage(IMG.lot_home, 8, 0);
      g.drawImage(IMG.lot_home, 200, 0);
      g.globalAlpha = 1;
    } else if (v && i === 0) {
      g.globalAlpha = 0.4;
      var im = IMG[v];
      var at = v === 'park_5' ? [96, 288] : [192];
      at.forEach(function (cx) {
        g.drawImage(im, Math.round(cx - im.width / 2), c.height - 24 - im.height);
      });
      g.globalAlpha = 1;
    }
    frame(g, r[2], r[3]);
    landCv[key] = c;
    return c;
  }

  function drawTown(now) {
    var y0 = Math.max(0, Math.floor(cam.y));
    var vh = Math.min(TH * 16 - y0, Math.ceil(ch / z) + 2);
    var top = cam.y - 40;
    var bot = cam.y + ch / z + 240;
    if (vh > 0) ctx.drawImage(townBG, 0, y0, TW * 16, vh, 0, y0, TW * 16, vh);
    var id;
    for (id in LANDS) {
      if (!locked(id)) continue;
      LANDS[id].rects.forEach(function (r, i) {
        if (r[1] * 16 > bot || (r[1] + r[3]) * 16 < top) return;
        ctx.drawImage(landCanvas(id, i), r[0] * 16, r[1] * 16);
      });
    }
    PIECES.forEach(function (p) {
      if (p.z === 0 && p.cur && p.y * 16 > top && p.y * 16 - 200 < bot) {
        var im = IMG[p.cur];
        ctx.drawImage(im, Math.round(p.x * 16 - im.width / 2), Math.round(p.y * 16 - im.height));
      }
    });
    var items = [];
    PIECES.forEach(function (p) {
      if (p.z && p.cur && p.y * 16 > top && p.y * 16 - 340 < bot) items.push({ y: p.y * 16, p: p });
    });
    cars.forEach(function (c) {
      if (c.y > top && c.y < bot + 30) items.push({ y: c.y + 6, c: c });
    });
    people.forEach(function (w) {
      if (!w.inside && w.y > top && w.y < bot + 30) items.push({ y: w.y, w: w });
    });
    items.sort(function (a, b) { return a.y - b.y; });
    items.forEach(function (it2) {
      if (it2.p) sprite(it2.p, now);
      else if (it2.c) {
        var c = it2.c;
        ctx.drawImage(IMG[c.sheet], c.dir * 80, 0, 80, 80, Math.round(c.x - 20), Math.round(c.y - 22), 40, 40);
      } else {
        var w = it2.w;
        person(w.sheet, w.face, Math.floor(now / 130 + w.ph) % 6, true, w.x, w.y, 0.5);
      }
    });
    for (id in LANDS) {
      if (!locked(id)) continue;
      var l = LANDS[id];
      var rect = l.rects[0];
      if (l.at) {
        for (var i = 0; i < l.rects.length; i++) if (l.rects[i][1] === l.at) rect = l.rects[i];
      }
      if (rect[1] * 16 < bot && (rect[1] + rect[3]) * 16 > top) sign(l, rect);
    }
  }

  function pill(text, cx, cy, size, dim) {
    ctx.font = 'bold ' + size + 'px system-ui, sans-serif';
    var w = ctx.measureText(text).width;
    ctx.fillStyle = dim ? 'rgba(20,20,30,0.6)' : 'rgba(20,20,30,0.82)';
    ctx.beginPath();
    ctx.roundRect(cx - w / 2 - 6, cy - size / 2 - 4, w + 12, size + 8, 5);
    ctx.fill();
    ctx.fillStyle = dim ? '#d2d2dc' : '#fff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, cx, cy + 1);
  }

  function drawSchool(now) {
    var y0 = Math.max(0, Math.floor(cam.y));
    var vh = Math.min(SH * 32 - y0, Math.ceil(ch / z) + 2);
    if (vh > 0) ctx.drawImage(schoolBG, 0, y0, SW * 32, vh, 0, y0, SW * 32, vh);
    var top = cam.y - 80;
    var bot = cam.y + ch / z + 40;
    if (cnt.yard >= 1) {
      var fy = SH - 1;
      var f = IMG.yfence;
      for (var x = 0; x < SW; x++) {
        var t = x === 0 ? 5 : x === 3 ? 3 : x === SW - 1 ? 4 : 1;
        if (x === 1 || x === 2) continue;
        ctx.drawImage(f, t * 32, 0, 32, 32, x * 32, fy * 32, 32, 32);
      }
      for (var y = 40; y < fy; y++) {
        ctx.drawImage(f, 0, 0, 32, 32, 0, y * 32, 32, 32);
        ctx.drawImage(f, 64, 0, 32, 32, (SW - 1) * 32, y * 32, 32, 32);
      }
    }
    var list = [];
    sorted.forEach(function (p) {
      if (p.cur && p.y * 32 > top && p.y * 32 < bot + 120) list.push(p);
    });
    var rest = list.filter(function (p) { return !p.person; });
    var folks = list.filter(function (p) { return p.person; });
    var movers = people.filter(function (w) { return w.inside; });
    var all = rest.map(function (p) { return { y: (p.flat ? -1000 : 0) + p.y * 32 + 32, p: p }; });
    folks.forEach(function (p) { all.push({ y: p.y * 32 + 33, p: p }); });
    movers.forEach(function (w) { all.push({ y: w.y, w: w }); });
    all.sort(function (a, b) { return a.y - b.y; });
    all.forEach(function (o) {
      if (o.w) {
        person(o.w.sheet, o.w.face, Math.floor(now / 110 + o.w.ph) % 6, true, o.w.x, o.w.y, 1);
        return;
      }
      var p = o.p;
      var u = p.t0 ? (now - p.t0) / 1000 : 9;
      if (u < 0) return;
      var drop = 0;
      if (u < 0.55) {
        var v = u / 0.55;
        drop = (1 - v) * (1 - v) * 22 - Math.sin(v * 9.4) * (1 - v) * 2;
        ctx.globalAlpha = Math.min(1, v * 4);
      }
      if (p.person) {
        var fr = Math.floor(now / 330 + p.x * 1.7 + p.y) % 6;
        person(p.spr, p.d, fr, false, p.x * 32 + 16, (p.y + 1) * 32 + 3 - drop, 1);
      } else {
        var im = IMG[p.spr];
        var span = p.span || Math.max(1, Math.round(im.width / 32));
        ctx.drawImage(im, Math.round(p.x * 32 + span * 16 - im.width / 2), Math.round((p.y + 1) * 32 - im.height - (p.lift || 0) - drop));
      }
      ctx.globalAlpha = 1;
    });
    for (var key in ROOMS) {
      if (key === 'hall') continue;
      var r = ROOMS[key];
      var fl = r.floor;
      var res = PROJ[key];
      var n = cnt[key];
      var cx = (fl[0] + fl[2] / 2) * 32;
      if (n === 0) {
        pill(r.name, cx, (fl[1] + fl[3] / 2 - 0.2) * 32, 15, false);
        pill('not built yet', cx, (fl[1] + fl[3] / 2 + 0.35) * 32, 11, true);
      } else {
        var wy = key === 'yard' ? 40.2 * 32 : (fl[1] - 2) * 32;
        pill(r.name + '  ' + n + '/' + res.steps.length, cx, wy + 10, 11, false);
      }
    }
  }

  function effects(now) {
    fx.puffs = fx.puffs.filter(function (p) { return now - p.t0 < 700; });
    fx.puffs.forEach(function (p) {
      var u = (now - p.t0) / 700;
      if (u < 0) return;
      ctx.globalAlpha = (1 - u) * 0.8;
      ctx.fillStyle = '#efe9df';
      for (var i = 0; i < 6; i++) {
        var a = i * 1.05 + 0.3;
        var r = 2 + u * 5;
        ctx.beginPath();
        ctx.arc(p.x + Math.cos(a) * (3 + u * 14), p.y - 3 - Math.abs(Math.sin(a)) * u * 8, r, 0, 6.3);
        ctx.fill();
      }
    });
    ctx.globalAlpha = 1;
    fx.floats = fx.floats.filter(function (f) { return now - f.t0 < 1500; });
    fx.floats.forEach(function (f) {
      var u = (now - f.t0) / 1500;
      if (u < 0) return;
      ctx.globalAlpha = u < 0.7 ? 1 : (1 - u) / 0.3;
      ctx.font = 'bold 14px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'alphabetic';
      ctx.lineWidth = 3;
      ctx.strokeStyle = '#2a1c10';
      ctx.fillStyle = '#ffd84a';
      ctx.strokeText(f.text, f.x, f.y - u * 30);
      ctx.fillText(f.text, f.x, f.y - u * 30);
    });
    ctx.globalAlpha = 1;
    fx.coins.forEach(function (c) {
      if (c.v !== view) return;
      var b = Math.sin((now - c.t0) / 300) * 2;
      var s = Math.min(1, (now - c.t0) / 250);
      ctx.globalAlpha = Math.max(0, Math.min(1, (c.t0 + 11000 - now) / 800));
      var im = IMG.coin;
      ctx.drawImage(im, c.x - im.width * s, c.y - 14 + b - im.height * s, im.width * 2 * s, im.height * 2 * s);
    });
    ctx.globalAlpha = 1;
  }

  function spawnCoin(now) {
    var here = fx.coins.filter(function (c) { return c.v === view; });
    if (here.length >= 3 || now < coinAt) return;
    coinAt = now + 7000 + rand() * 6000;
    var spots = [];
    if (view === 'town') {
      PIECES.forEach(function (p) {
        if (p.z && p.cur && /^(house|farm|bakery|cafe|market|icecream|restaurant|stor)/.test(p.cur)) {
          spots.push({ x: p.x * 16 + (rand() - 0.5) * 30, y: p.y * 16 - IMG[p.cur].height * 0.55 });
        }
      });
    } else {
      for (var k in ROOMS) {
        if (k !== 'hall' && cnt[k] > 0) {
          var f = ROOMS[k].floor;
          spots.push({ x: (f[0] + 1 + rand() * (f[2] - 2)) * 32, y: (f[1] + 1 + rand() * (f[3] - 2)) * 32 });
        }
      }
    }
    if (!spots.length) return;
    var s = spots[Math.floor(rand() * spots.length)];
    fx.coins.push({ x: s.x, y: s.y, t0: now, v: view });
  }

  // residents and cars move on the streets that have something built next to them
  function activeStreets() {
    var a = [];
    STREETS.forEach(function (n) {
      var on = n >= 183 ? cnt.homes >= 2 : n >= 82 ? cnt.main >= 2 : n === 54 || n === 28 ? cnt.sch >= 1 : false;
      if (on) a.push(n);
    });
    return a;
  }

  function populate() {
    var st = activeStreets();
    var want = Math.min(18, Math.floor(cnt.homes * 0.7 + cnt.main * 0.5 + cnt.sch));
    var tw = people.filter(function (p) { return !p.inside; });
    while (st.length && tw.length < want) {
      var n = st[Math.floor(rand() * st.length)];
      var east = rand() < 0.5;
      var w = { sheet: rand() < 0.3 ? 'adult_' + [3, 4, 5, 6, 8][Math.floor(rand() * 5)] : 'kid_' + (1 + Math.floor(rand() * 8)),
        x: rand() * 384, y: (rand() < 0.5 ? n : n + 4) * 16 + 14, sp: 12 + rand() * 10, face: east ? 'right' : 'left',
        ph: rand() * 6 };
      people.push(w);
      tw.push(w);
    }
    st.forEach(function (n) {
      [1.75, 3.25].forEach(function (off, d) {
        var have = cars.filter(function (c) { return c.lane === n * 10 + d; });
        var need = cnt.main >= 8 || cnt.homes >= 8 ? 2 : 1;
        for (var i = have.length; i < need; i++) {
          var sp = 26 + ((n * 7 + d * 13) % 18);
          cars.push({ lane: n * 10 + d, x: (d ? 0 : 384) + (d ? 1 : -1) * i * 230 + rand() * 40, y: (n + off) * 16, sp: d ? sp : -sp,
            dir: d ? CAR_DIR.east : CAR_DIR.west, sheet: ['car_01', 'car_03', 'car_05', 'car_10'][(n + d + i) % 4] });
        }
      });
    });
    var yard = cnt.yard >= 7 ? 3 : 0;
    var hallN = cnt.sch >= 2 ? Math.min(5, cnt.sch) : 0;
    var ins = people.filter(function (p) { return p.inside; });
    var have2 = ins.filter(function (p) { return p.kind === 'hall'; }).length;
    for (var i2 = have2; i2 < hallN; i2++) {
      people.push({ inside: 1, kind: 'hall', sheet: 'kid_' + (1 + (i2 * 3) % 8), x: 48 + (i2 % 2) * 32, y: (6 + i2 * 6) * 32,
        sp: 22 + i2 * 3, face: i2 % 2 ? 'up' : 'down', ph: i2 * 1.3, y0: 4 * 32, y1: 37 * 32 });
    }
    var have3 = ins.filter(function (p) { return p.kind === 'yard'; }).length;
    for (var i3 = have3; i3 < yard; i3++) {
      people.push({ inside: 1, kind: 'yard', sheet: 'kid_' + (1 + (i3 * 2 + 3) % 8), x: 130 + i3 * 40, y: (43 + i3 * 3) * 32 + 20,
        sp: 20 + i3 * 4, face: 'right', ph: i3 * 2, x0: 100, x1: 330 });
    }
  }

  function move(dt) {
    people.forEach(function (w) {
      if (w.inside) {
        if (w.kind === 'hall') {
          w.y += (w.face === 'down' ? 1 : -1) * w.sp * dt;
          if (w.y > w.y1) w.face = 'up';
          if (w.y < w.y0) w.face = 'down';
        } else {
          w.x += (w.face === 'right' ? 1 : -1) * w.sp * dt;
          if (w.x > w.x1) w.face = 'left';
          if (w.x < w.x0) w.face = 'right';
        }
        return;
      }
      w.x += (w.face === 'right' ? 1 : -1) * w.sp * dt;
      if (w.x > 400) w.x = -16;
      if (w.x < -16) w.x = 400;
    });
    cars.forEach(function (c) {
      c.x += c.sp * dt;
      if (c.sp > 0 && c.x > 430) c.x = -50;
      if (c.sp < 0 && c.x < -50) c.x = 430;
    });
  }

  function hit(sx, sy) {
    var wy = sy / z + cam.y;
    var wx = sx / z;
    var best = null;
    fx.coins.forEach(function (c) {
      if (c.v === view && Math.abs(c.x - wx) < 20 && Math.abs(c.y - 8 - wy) < 22) best = c;
    });
    if (best) {
      fx.coins.splice(fx.coins.indexOf(best), 1);
      return { kind: 'coin', x: best.x, y: best.y };
    }
    if (view === 'town') {
      var row = wy / 16;
      for (var i = 0; i < BLOCKS.length; i++) {
        if (row >= BLOCKS[i][0] && row < BLOCKS[i][1]) return { kind: 'block', id: BLOCKS[i][2] };
      }
      return null;
    }
    var ty = wy / 32;
    for (var key in ROOMS) {
      var f = ROOMS[key].floor;
      if (key !== 'hall' && ty >= f[1] - 2 && ty < f[1] + f[3]) return { kind: 'room', id: key };
    }
    return null;
  }

  function init(canvas, tap) {
    cv = canvas;
    ctx = cv.getContext('2d');
    onTap = tap;
    names();
    resize();
    window.addEventListener('resize', resize);
    cv.addEventListener('pointerdown', function (e) {
      cv.setPointerCapture(e.pointerId);
      drag = { y: e.clientY, cam: cam.y, x0: e.clientX, y0: e.clientY, t: performance.now(), moved: false };
    });
    cv.addEventListener('pointermove', function (e) {
      if (!drag) return;
      if (Math.abs(e.clientY - drag.y0) > 7) drag.moved = true;
      if (drag.moved && !busy()) {
        cam.y = drag.cam - (e.clientY - drag.y) / z;
        clamp();
      }
    });
    function up(e) {
      if (!drag) return;
      var d = drag;
      drag = null;
      if (!d.moved && performance.now() - d.t < 600 && e.type === 'pointerup') {
        var r = cv.getBoundingClientRect();
        var h = hit(e.clientX - r.left, e.clientY - r.top);
        if (h) onTap(h);
        else onTap({ kind: 'none' });
      }
    }
    cv.addEventListener('pointerup', up);
    cv.addEventListener('pointercancel', up);
  }

  function draw(now) {
    if (!ready) return;
    var dt = Math.min(0.1, (now - last) / 1000);
    last = now;
    stepCam(now);
    move(dt);
    fx.conf.forEach(function (c) {
      c.x += c.vx * dt;
      c.y += c.vy * dt;
      c.a += dt * 5;
    });
    fx.conf = fx.conf.filter(function (c) { return c.y < ch + 20; });
    spawnCoin(now);
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = view === 'town' ? GRASS : '#262830';
    ctx.fillRect(0, 0, cv.width, cv.height);
    ctx.setTransform(dpr * z, 0, 0, dpr * z, 0, -cam.y * dpr * z);
    ctx.imageSmoothingEnabled = false;
    if (view === 'town') drawTown(now);
    else drawSchool(now);
    effects(now);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    fx.conf.forEach(function (c) {
      ctx.fillStyle = c.c;
      ctx.save();
      ctx.translate(c.x, c.y);
      ctx.rotate(c.a);
      ctx.fillRect(-c.r, -c.r / 2, c.r * 2, c.r);
      ctx.restore();
    });
    if (cam.fade > 0) {
      ctx.fillStyle = 'rgba(0,0,0,' + cam.fade + ')';
      ctx.fillRect(0, 0, cw, ch);
    }
  }

  // go to a place right away, without the walk
  function jump(v, wy) {
    view = v;
    cam.cur = null;
    cam.q = [];
    cam.y = centerOn(wy);
    clamp();
  }

  function refresh() {
    sync(false, 0);
    populate();
  }

  return {
    init: init, draw: draw, inset: function (t, b) { IT = t; IB = b; clamp(); }, ready: function () { return ready; }, stepped: stepped, go: go, jump: jump, refresh: refresh,
    confetti: confetti, resize: resize, busy: busy, populate: populate, roomY: roomY, blockY: blockY, locked: locked,
    view: function () { return view; }, focusNow: focusNow, cam: cam, scale: function () { return z; }, fmt: fmt, sync: sync,
    pop: function (x, y, now) { fx.puffs.push({ x: x, y: y, t0: now }); },
    float: function (x, y, text, now) { fx.floats.push({ x: x, y: y, text: text, t0: now }); }
  };
})();
