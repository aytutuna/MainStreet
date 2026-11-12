var View = (function () {
  var BASE = 'assets/';
  var IT = 64; // space under the top bar
  var IB = 118; // space over the Next button
  var CHUNK = 256;
  var GRASS = '#47975a';
  var PLANT = '#58a862';
  var WALK = '#dad4cb';
  var SEAM = '#cdc6bc';
  var CURB = '#a09a92';
  var ASPHALT = '#534f52';
  var LINE = '#ece8d6';
  var HEDGE = '#3c8449';
  var DIRT = '#b08c5a';
  var COLORS = [null, WALK, CURB, ASPHALT, LINE, PLANT, CURB, ASPHALT];
  var FACE = { right: 0, up: 6, left: 12, down: 18 };
  var IMG = {};
  var PROC = { court: 1 };
  var cv;
  var ctx;
  var cw = 0;
  var ch = 0;
  var dpr = 1;
  var zt = 1; // town zoom, css px per art px
  var zs = 1; // school zoom
  var zmin = 0.2;
  var zmax = 2;
  var zfocus = 1;
  var view = 'town';
  var cam = { x: 0, y: 0, from: null, q: [], cur: null, fade: 0 };
  var cnt = {};
  var schoolBG;
  var chunks = {};
  var queue = [];
  var pat = {};
  var landCv = {};
  var sorted;
  var fx = { puffs: [], floats: [], coins: [], conf: [] };
  var people = [];
  var cars = [];
  var routes = [];
  var coinAt = 0;
  var last = 0;
  var loaded = 0;
  var wanted = 0;
  var ready = false;
  var rng = 7;
  var onTap = function () {};
  var ptr = {};
  var drag = null;
  var pinch = null;
  var stretch = [];
  var tmp = { x: 0, y: 0, dx: 0, dy: 0 };

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
    if (name.indexOf(':') > 0) {
      var p = name.split(':');
      load(p[0]);
      stretch.push([name, p[0], +p[1]]);
      IMG[name] = 1;
      return;
    }
    wanted++;
    var i = new Image();
    i.onload = function () {
      loaded++;
      if (loaded === wanted) init2();
    };
    i.onerror = function () {
      IMG[name] = mk(1, 1);
      i.onload();
    };
    i.src = BASE + name + '.png';
    IMG[name] = i;
  }

  function names() {
    PIECES.forEach(function (p) {
      for (var k in p.s) load(p.s[k]);
    });
    INSIDE.forEach(function (p) { load(p.spr); });
    ['lockfence', 'coin', 'park_5', 'clinic_3', 'f_class', 'f_rest', 'f_lib', 'f_cafe', 'f_hall', 'f_path', 'wall', 'wall_v',
      'yfence', 'adult_2', 'adult_3', 'adult_4', 'adult_5', 'adult_6', 'adult_8', 'car_01', 'car_03', 'car_05', 'car_10'].forEach(load);
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


  // a lot sprite is 11 tiles wide and 12 deep; a deeper lot repeats its middle row
  function tall(src, h) {
    var c = mk(176, h * 16);
    var g = c.getContext('2d');
    g.drawImage(src, 0, 0, 176, 80, 0, 0, 176, 80);
    for (var y = 80; y < h * 16 - 96; y += 16) g.drawImage(src, 0, 80, 176, 16, 0, y, 176, 16);
    g.drawImage(src, 0, 96, 176, 96, 0, h * 16 - 96, 176, 96);
    return c;
  }

  function init2() {
    var c = mk(144, 112);
    var g = c.getContext('2d');
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
    stretch.forEach(function (s) { IMG[s[0]] = tall(IMG[s[1]], s[2]); });
    pat.walk = tile('walk');
    pat.hedge = tile('hedge');
    routes = CAR_ROUTES.map(function (r) { return route(r); });
    buildSchool();
    sync(false, 0);
    seed();
    for (var cy = 0; cy * CHUNK < TH * 16; cy++) {
      for (var cx = 0; cx * CHUNK < TW * 16; cx++) queue.push([cx, cy]);
    }
    bake(function () {
      ready = true;
      view = 'town';
      focusNow();
    });
  }

  function hex(s) {
    return [parseInt(s.substr(1, 2), 16), parseInt(s.substr(3, 2), 16), parseInt(s.substr(5, 2), 16)];
  }

  function tile(kind) {
    var c = mk(16, 16);
    var g = c.getContext('2d');
    if (kind === 'walk') {
      g.fillStyle = WALK;
      g.fillRect(0, 0, 16, 16);
      g.fillStyle = SEAM;
      g.fillRect(0, 0, 16, 1);
      g.fillRect(0, 0, 1, 16);
    } else {
      g.fillStyle = HEDGE;
      g.fillRect(0, 0, 16, 16);
      for (var i = 0; i < 16; i++) {
        for (var j = 0; j < 16; j++) {
          var h = (i * 5 + j * 3) % 8;
          if (h === 0) {
            g.fillStyle = '#58a45a';
            g.fillRect(i, j, 2, 1);
          } else if (h === 4 && (i + j) % 2 === 0) {
            g.fillStyle = '#2d6a3b';
            g.fillRect(i, j, 1, 2);
          }
        }
      }
    }
    return g.createPattern(c, 'repeat');
  }

  // a 256 px square of the ground, with one extra pixel so scaled squares never leave a seam
  function buildChunk(cx, cy) {
    var S = CHUNK + 1;
    var c = mk(S, S);
    var g = c.getContext('2d');
    var x0 = cx * CHUNK;
    var y0 = cy * CHUNK;
    g.fillStyle = GRASS;
    g.fillRect(0, 0, S, S);
    g.save();
    g.translate(-x0, -y0);
    ZONES.forEach(function (z) {
      var zx = z[1] * 16;
      var zy = z[2] * 16;
      var zw = z[3] * 16;
      var zh = z[4] * 16;
      if (z[0] === 'lawn' || zx > x0 + S || zx + zw < x0 || zy > y0 + S || zy + zh < y0) return;
      g.fillStyle = z[0] === 'plaza' ? pat.walk : z[0] === 'hedge' ? pat.hedge : ASPHALT;
      g.fillRect(zx, zy, zw, zh);
      if (z[0] === 'park') {
        g.fillStyle = LINE;
        [3, 6].forEach(function (r) {
          for (var x = 0; x <= z[3]; x += 2) g.fillRect(zx + x * 16, zy + r * 16 + 1, 1, 46);
        });
      }
    });
    g.restore();
    var rs = ROADS.filter(function (r) { return r.b[2] * 16 > x0 && r.b[0] * 16 < x0 + S && r.b[3] * 16 > y0 && r.b[1] * 16 < y0 + S; });
    var ov = function (x0, y0, x1, y1) {
      return OVER.some(function (o) {
        return o.k === 'disc' ? o.x + o.r > x0 && o.x - o.r < x1 && o.y + o.r > y0 && o.y - o.r < y1 :
          o.x + o.w > x0 && o.x < x1 && o.y + o.h > y0 && o.y < y1;
      });
    };
    // only the 16 px tiles that a road or an overlay can reach are looked at pixel by pixel
    var id = g.getImageData(0, 0, S, S);
    var d = id.data;
    var cols = COLORS.map(function (k) { return k ? hex(k) : null; });
    var seam = hex(SEAM);
    var touched = false;
    for (var ty = 0; ty <= 16; ty++) {
      for (var tx = 0; tx <= 16; tx++) {
        var tcx = cx * 16 + tx + 0.5;
        var tcy = cy * 16 + ty + 0.5;
        var act = ov(tcx - 1, tcy - 1, tcx + 1, tcy + 1);
        for (var q = 0; q < rs.length && !act; q++) {
          if (tcx < rs[q].b[0] || tcx > rs[q].b[2] || tcy < rs[q].b[1] || tcy > rs[q].b[3]) continue;
          near(rs[q], tcx, tcy);
          act = near_d <= rs[q].w / 2 + rs[q].sw + 0.72;
        }
        if (!act) continue;
        touched = true;
        for (var py = ty * 16; py < Math.min(S, ty * 16 + 16); py++) {
          for (var px = tx * 16; px < Math.min(S, tx * 16 + 16); px++) {
            var wx = x0 + px;
            var wy = y0 + py;
            var k = groundAt((wx + 0.5) / 16, (wy + 0.5) / 16, rs);
            if (!k) continue;
            var col = k === 1 && (wx % 16 === 0 || wy % 16 === 0) ? seam : cols[k];
            var o = (py * S + px) * 4;
            d[o] = col[0];
            d[o + 1] = col[1];
            d[o + 2] = col[2];
          }
        }
      }
    }
    if (touched) g.putImageData(id, 0, 0);
    return c;
  }

  // the whole ground is built before the game starts, a few squares per turn so the page stays alive
  function bake(done) {
    var t0 = performance.now();
    while (queue.length && performance.now() - t0 < 10) {
      var q = queue.shift();
      chunks[q[0] + ',' + q[1]] = buildChunk(q[0], q[1]);
    }
    if (queue.length) setTimeout(bake, 0, done);
    else done();
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

  function sync(animate, now, delay) {
    PROJECTS.forEach(function (p) { cnt[p.id] = got(p.id); });
    cnt.sch = counter('sch');
    cnt.town = 1;
    var changed = [];
    PIECES.forEach(function (p) {
      var n = pickAt(p.s, cnt[p.k]);
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

  function zoom() {
    return view === 'town' ? zt : zs;
  }

  function resize() {
    var r = cv.getBoundingClientRect();
    dpr = window.devicePixelRatio || 1;
    cw = r.width;
    ch = r.height;
    cv.width = Math.round(cw * dpr);
    cv.height = Math.round(ch * dpr);
    zs = cw / 384;
    zfocus = zs * 1.1;
    zmax = zfocus * 2;
    zmin = Math.min(cw / (TW * 16), (ch - IT - IB) / (TH * 16));
    zt = Math.max(zmin, Math.min(zmax, zt === 1 ? zfocus : zt));
    clamp();
  }

  // keep the map on screen; when its whole width or height fits, it sits in the middle
  function clamp() {
    var z = zoom();
    var ww = view === 'town' ? TW * 16 : SW * 32;
    var wh = view === 'town' ? TH * 16 : SH * 32;
    var vw = cw / z;
    var room = (ch - IT - IB) / z;
    cam.x = ww <= vw ? (ww - vw) / 2 : Math.max(0, Math.min(ww - vw, cam.x));
    var lo = -IT / z;
    cam.y = wh <= room ? lo + (wh - room) / 2 : Math.max(lo, Math.min(wh - (ch - IB) / z, cam.y));
  }

  function centerOn(wx, wy, z) {
    cam.x = wx - cw / 2 / z;
    cam.y = wy - (IT + (ch - IT - IB) / 2) / z;
  }

  function centerOf() {
    var z = zoom();
    return { x: cam.x + cw / 2 / z, y: cam.y + (IT + (ch - IT - IB) / 2) / z, z: z };
  }

  function blockAt(id) {
    var l = LANDS[id];
    if (l && l.at) {
      var r = l.rects[l.at];
      return { x: (r[0] + r[2] / 2) * 16, y: (r[1] + r[3] / 2) * 16 };
    }
    var x = 0;
    var y = 0;
    var n = 0;
    BLOCKS.forEach(function (b) {
      if (b[4] !== id) return;
      x += b[0] + b[2] / 2;
      y += b[1] + b[3] / 2;
      n++;
    });
    return { x: x / n * 16, y: y / n * 16 };
  }

  function focusNow() {
    var n = upNext();
    cam.cur = null;
    cam.q = [];
    cam.fade = 0;
    if (n && PROJ[n.p].room) {
      view = 'school';
      centerOn(192, roomY(n.p), zs);
    } else {
      view = 'town';
      zt = Math.max(zmin, Math.min(zmax, zfocus));
      var b = blockAt(n ? n.p : 'school');
      centerOn(b.x, b.y, zt);
    }
    clamp();
  }

  function roomY(id) {
    var f = ROOMS[id].floor;
    return (f[1] + f[3] / 2) * 32;
  }

  function ease(u) {
    return u < 0.5 ? 2 * u * u : 1 - Math.pow(-2 * u + 2, 2) / 2;
  }

  function go(v, wy, wx) {
    var t = 0;
    cam.q = [];
    cam.cur = null;
    cam.fade = 0;
    var x = wx === undefined ? 192 : wx;
    var c = centerOf();
    if (v === 'town') {
      var zz = view === 'town' ? Math.max(zt, zfocus) : zfocus;
      if (view === 'town') {
        var d = Math.max(0.45, Math.min(1.4, Math.hypot(c.x - x, c.y - wy) / 1200 + Math.abs(Math.log(zz / zt)) * 0.5));
        cam.q.push({ t: 'pan', x: x, y: wy, z: zz, d: d });
        t = d;
      } else {
        cam.q.push({ t: 'view', v: v, x: x, y: wy, z: zz });
        t = 0.5;
      }
    } else if (view === 'school') {
      var d1 = Math.max(0.35, Math.min(1.1, Math.abs(c.y - wy) / 1100));
      cam.q.push({ t: 'pan', x: 192, y: wy, z: zs, d: d1 });
      t = d1;
    } else {
      var b = blockAt('school');
      var d2 = Math.max(0.5, Math.min(1.4, Math.hypot(c.x - b.x, c.y - b.y) / 1200 + Math.abs(Math.log(zfocus / zt)) * 0.5));
      cam.q.push({ t: 'pan', x: b.x, y: b.y, z: Math.max(zt, zfocus), d: d2 });
      cam.q.push({ t: 'view', v: v, x: 192, y: wy, z: zs });
      t = d2 + 0.5;
    }
    return t;
  }

  function stepCam(now) {
    if (!cam.cur && cam.q.length) {
      var a = cam.q.shift();
      cam.cur = a;
      a.t0 = now;
      if (a.t === 'pan') cam.from = centerOf();
      else {
        a.d = 0.5;
        a.sw = false;
      }
    }
    var c = cam.cur;
    if (!c) return;
    var u = Math.min(1, (now - c.t0) / 1000 / c.d);
    if (c.t === 'pan') {
      var e = ease(u);
      var z = cam.from.z * Math.pow(c.z / cam.from.z, e);
      if (view === 'town') zt = z;
      centerOn(cam.from.x + (c.x - cam.from.x) * e, cam.from.y + (c.y - cam.from.y) * e, z);
      clamp();
    } else {
      cam.fade = u < 0.5 ? u * 2 : (1 - u) * 2;
      if (u >= 0.5 && !c.sw) {
        c.sw = true;
        view = c.v;
        if (view === 'town') zt = c.z;
        centerOn(c.x, c.y, zoom());
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

  function stepped(res, now) {
    var step = res.step;
    var room = !!PROJ[step.p].room;
    var v = room ? 'school' : 'town';
    var changed = sync(true, now, 0);
    var mine = changed.filter(function (p) {
      return room ? p.r === step.p : p.k === step.p;
    });
    var focus;
    if (mine.length) {
      focus = mean(mine, room ? 32 : 16);
      if (!room) focus.y -= 40;
    } else focus = room ? { x: 192, y: roomY(step.p) } : blockAt(step.p);
    var t = go(v, focus.y, focus.x);
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
    if (p.car !== undefined) {
      car(im, p.car, p.x * 16, p.y * 16);
      return;
    }
    var x = p.x * 16 - im.width / 2;
    var y = p.y * 16 - im.height;
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

  // a car from its sheet (frames: down, west, east, up), centred on (x, y)
  function car(im, f, x, y) {
    ctx.drawImage(im, f * 80, 0, 80, 80, Math.round(x - 20), Math.round(y - (f === 1 || f === 2 ? 22 : 21)), 40, 40);
  }

  function person(sheet, face, fr, walk, x, feet, k) {
    var im = IMG[sheet];
    if (!im) return;
    var sx = (FACE[face] + fr) * 32;
    var sy = walk ? 64 : 0;
    ctx.drawImage(im, sx, sy, 32, 64, Math.round(x - 16 * k), Math.round(feet - 64 * k), 32 * k, 64 * k);
  }

  // a pupil at a desk: head and shoulders only, the legs are under the desk
  function seated(sheet, face, fr, x, feet) {
    var im = IMG[sheet];
    if (!im) return;
    ctx.drawImage(im, (FACE[face] + fr) * 32, 24, 32, 28, Math.round(x - 16), Math.round(feet - 33), 32, 28);
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
      LOTS.forEach(function (l) {
        g.drawImage(IMG['lot_home:' + (l[2] - l[1])], (l[0] - r[0]) * 16, (l[1] - r[1]) * 16);
      });
      g.globalAlpha = 1;
    } else if (v && i === 0) {
      g.globalAlpha = 0.4;
      var im = IMG[v];
      var at = v === 'park_5' ? [120, 368, 616] : [c.width / 2];
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
    var z = zt;
    var vx0 = cam.x;
    var vx1 = cam.x + cw / z;
    var vy0 = cam.y;
    var vy1 = cam.y + ch / z;
    var cx0 = Math.max(0, Math.floor(vx0 / CHUNK));
    var cx1 = Math.min(Math.floor((TW * 16 - 1) / CHUNK), Math.floor(vx1 / CHUNK));
    var cy0 = Math.max(0, Math.floor(vy0 / CHUNK));
    var cy1 = Math.min(Math.floor((TH * 16 - 1) / CHUNK), Math.floor(vy1 / CHUNK));
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 0, TW * 16, TH * 16);
    ctx.clip();
    for (var cy = cy0; cy <= cy1; cy++) {
      for (var cx = cx0; cx <= cx1; cx++) {
        ctx.drawImage(chunks[cx + ',' + cy], cx * CHUNK, cy * CHUNK);
      }
    }
    ctx.restore();
    var top = vy0 - 40;
    var left = vx0 - 200;
    var right = vx1 + 200;
    var id;
    for (id in LANDS) {
      if (!locked(id)) continue;
      LANDS[id].rects.forEach(function (r, i) {
        if (r[1] * 16 > vy1 || (r[1] + r[3]) * 16 < vy0 || r[0] * 16 > vx1 || (r[0] + r[2]) * 16 < vx0) return;
        ctx.drawImage(landCanvas(id, i), r[0] * 16, r[1] * 16);
      });
    }
    var items = [];
    PIECES.forEach(function (p) {
      var px = p.x * 16;
      var py = p.y * 16;
      if (!p.cur || py < top || py - 340 > vy1 || px < left || px > right) return;
      if (p.z === 0) {
        var im = IMG[p.cur];
        ctx.drawImage(im, Math.round(px - im.width / 2), Math.round(py - im.height));
      } else items.push({ y: py, p: p });
    });
    cars.forEach(function (c) {
      if (c.y > top && c.y < vy1 + 40 && c.x > left && c.x < right) items.push({ y: c.y + 8, c: c });
    });
    people.forEach(function (w) {
      if (!w.inside && w.y > top && w.y < vy1 + 40 && w.x > left && w.x < right) items.push({ y: w.y, w: w });
    });
    items.sort(function (a, b) { return a.y - b.y; });
    items.forEach(function (it2) {
      if (it2.p) sprite(it2.p, now);
      else if (it2.c) car(IMG[it2.c.sheet], it2.c.f, it2.c.x, it2.c.y);
      else {
        var w = it2.w;
        person(w.sheet, w.face, Math.floor(now / 130 + w.ph) % 6, true, w.x, w.y, 0.5);
      }
    });
    for (id in LANDS) {
      if (!locked(id)) continue;
      var l = LANDS[id];
      var rect = l.rects[l.at || 0];
      if (rect[1] * 16 < vy1 && (rect[1] + rect[3]) * 16 > vy0) sign(l, rect);
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
    var z = zs;
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
        if (p.sit) seated(p.spr, p.d, fr, p.x * 32 + 16, (p.y + 1) * 32 + 3 - drop);
        else person(p.spr, p.d, fr, false, p.x * 32 + 16, (p.y + 1) * 32 + 3 - drop, 1);
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
    fx.coins = fx.coins.filter(function (c) { return now - c.t0 < 11800; });
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

  // a route in px: the waypoints smoothed so that a turn is a curve, with the running length at every point
  function route(r) {
    var pts = r.p.map(function (q) { return [q[0] * 16, q[1] * 16]; });
    for (var k = 0; k < 2; k++) {
      var out = [pts[0]];
      for (var i = 0; i < pts.length - 1; i++) {
        var a = pts[i];
        var b = pts[i + 1];
        out.push([a[0] * 0.75 + b[0] * 0.25, a[1] * 0.75 + b[1] * 0.25], [a[0] * 0.25 + b[0] * 0.75, a[1] * 0.25 + b[1] * 0.75]);
      }
      out.push(pts[pts.length - 1]);
      pts = out;
    }
    var len = [0];
    for (var j = 1; j < pts.length; j++) len.push(len[j - 1] + Math.hypot(pts[j][0] - pts[j - 1][0], pts[j][1] - pts[j - 1][1]));
    return { n: r.n, pts: pts, len: len, total: len[len.length - 1] };
  }

  function along(r, s, o) {
    var i = 1;
    while (i < r.len.length - 1 && r.len[i] < s) i++;
    var u = (s - r.len[i - 1]) / ((r.len[i] - r.len[i - 1]) || 1);
    var a = r.pts[i - 1];
    var b = r.pts[i];
    o.x = a[0] + (b[0] - a[0]) * u;
    o.y = a[1] + (b[1] - a[1]) * u;
  }

  function place(c) {
    along(c.r, c.s, tmp);
    c.x = tmp.x;
    c.y = tmp.y;
    along(c.r, Math.min(c.r.total, c.s + 10), tmp);
    c.hx = tmp.x - c.x;
    c.hy = tmp.y - c.y;
    c.f = Math.abs(c.hx) > Math.abs(c.hy) ? (c.hx > 0 ? 2 : 1) : c.hy > 0 ? 0 : 3;
  }

  function walker(p, dt) {
    var L = p.line;
    var len = Math.hypot(L[2] - L[0], L[3] - L[1]);
    p.t += p.dir * p.sp * dt / 16 / len;
    if (p.t > 1) {
      p.t = 1;
      p.dir = -1;
    } else if (p.t < 0) {
      p.t = 0;
      p.dir = 1;
    }
    p.x = (L[0] + (L[2] - L[0]) * p.t) * 16;
    p.y = (L[1] + (L[3] - L[1]) * p.t) * 16;
    var dx = (L[2] - L[0]) * p.dir;
    var dy = (L[3] - L[1]) * p.dir;
    p.face = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : dy > 0 ? 'down' : 'up';
  }

  function populate() {
    var want = Math.min(10, Math.floor(cnt.homes * 0.5 + cnt.main * 0.4 + cnt.sch * 1.5));
    var live = people.filter(function (p) { return !p.inside; });
    var open = WALKS.filter(function (w) { return cnt[w.k] >= w.n; });
    var wantP = Math.min(18, Math.floor(cnt.homes * 0.7 + cnt.main * 0.5 + cnt.sch));
    while (open.length && live.length < wantP) {
      var w = open[Math.floor(rand() * open.length)];
      var p = { sheet: rand() < 0.3 ? 'adult_' + [3, 4, 5, 6, 8][Math.floor(rand() * 5)] : 'kid_' + (1 + Math.floor(rand() * 8)),
        line: w.p, t: rand(), dir: rand() < 0.5 ? 1 : -1, sp: 12 + rand() * 10, ph: rand() * 6, x: 0, y: 0, face: 'right' };
      walker(p, 0);
      people.push(p);
      live.push(p);
    }
    var ok = routes.filter(function (r) { return cnt.homes >= 2 + r.n / 3 || cnt.main >= 1 + r.n / 3; });
    while (cars.length < want && ok.length) {
      var rt = ok[cars.length % ok.length];
      var c = { id: cars.length + 1, r: rt, s: rand() * rt.total, sp: 28 + rand() * 14, hold: 0,
        sheet: ['car_01', 'car_03', 'car_05', 'car_10'][cars.length % 4], x: 0, y: 0, f: 0, hx: 0, hy: 0 };
      cars.push(c);
      place(c);
    }
    var yard = cnt.yard >= 7 ? 3 : 0;
    var hallN = cnt.sch >= 2 ? Math.min(5, cnt.sch) : 0;
    var ins = people.filter(function (q) { return q.inside; });
    var have2 = ins.filter(function (q) { return q.kind === 'hall'; }).length;
    for (var i2 = have2; i2 < hallN; i2++) {
      people.push({ inside: 1, kind: 'hall', sheet: 'kid_' + (1 + (i2 * 3) % 8), x: 48 + (i2 % 2) * 32, y: (6 + i2 * 6) * 32,
        sp: 22 + i2 * 3, face: i2 % 2 ? 'up' : 'down', ph: i2 * 1.3, y0: 4 * 32, y1: 37 * 32 });
    }
    var have3 = ins.filter(function (q) { return q.kind === 'yard'; }).length;
    for (var i3 = have3; i3 < yard; i3++) {
      people.push({ inside: 1, kind: 'yard', sheet: 'kid_' + (1 + (i3 * 2 + 3) % 8), x: 130 + i3 * 40, y: (43 + i3 * 3) * 32 + 20,
        sp: 20 + i3 * 4, face: 'right', ph: i3 * 2, x0: 100, x1: 330 });
    }
  }

  // a car waits for the one ahead in its own direction, and for a lower numbered car it would otherwise drive into
  function blocked(c) {
    var n = Math.hypot(c.hx, c.hy) || 1;
    var ux = c.hx / n;
    var uy = c.hy / n;
    for (var i = 0; i < cars.length; i++) {
      var o = cars[i];
      if (o === c) continue;
      var dx = o.x - c.x;
      var dy = o.y - c.y;
      var d = Math.hypot(dx, dy);
      if (d > 30 || d === 0) continue;
      if ((dx * ux + dy * uy) / d < 0.35) continue;
      var on = Math.hypot(o.hx, o.hy) || 1;
      if ((o.hx * ux + o.hy * uy) / on > 0.5 || o.id < c.id) return true;
    }
    return false;
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
      walker(w, dt);
    });
    cars.forEach(function (c) {
      if (blocked(c) && c.hold < 4) {
        c.hold += dt;
        return;
      }
      c.hold = 0;
      c.s += c.sp * dt;
      if (c.s >= c.r.total) c.s = 0;
      place(c);
    });
  }

  function hit(sx, sy) {
    var z = zoom();
    var wy = sy / z + cam.y;
    var wx = sx / z + cam.x;
    var best = null;
    fx.coins.forEach(function (c) {
      if (c.v === view && Math.abs(c.x - wx) < 20 && Math.abs(c.y - 8 - wy) < 22) best = c;
    });
    if (best) {
      fx.coins.splice(fx.coins.indexOf(best), 1);
      return { kind: 'coin', x: best.x, y: best.y };
    }
    if (view === 'town') {
      var tx = wx / 16;
      var ty = wy / 16;
      for (var i = 0; i < BLOCKS.length; i++) {
        var b = BLOCKS[i];
        if (tx >= b[0] && tx < b[0] + b[2] && ty >= b[1] && ty < b[1] + b[3]) return { kind: 'block', id: b[4] };
      }
      return null;
    }
    var ry = wy / 32;
    for (var key in ROOMS) {
      var f = ROOMS[key].floor;
      if (key !== 'hall' && ry >= f[1] - 2 && ry < f[1] + f[3]) return { kind: 'room', id: key };
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
      if (e.isPrimary) {
        ptr = {};
        pinch = null;
        drag = null;
      }
      cv.setPointerCapture(e.pointerId);
      ptr[e.pointerId] = { x: e.clientX, y: e.clientY };
      var ids = Object.keys(ptr);
      if (ids.length === 1) {
        drag = { id: e.pointerId, x: e.clientX, y: e.clientY, cx: cam.x, cy: cam.y, x0: e.clientX, y0: e.clientY, t: performance.now(), moved: false };
      } else if (ids.length === 2 && view === 'town') {
        var a = ptr[ids[0]];
        var b = ptr[ids[1]];
        pinch = { d: Math.hypot(a.x - b.x, a.y - b.y) || 1, z: zt };
        if (drag) drag.moved = true;
      }
    });
    cv.addEventListener('pointermove', function (e) {
      if (!ptr[e.pointerId]) return;
      ptr[e.pointerId] = { x: e.clientX, y: e.clientY };
      if (pinch) {
        if (busy()) return;
        var ids = Object.keys(ptr);
        var a = ptr[ids[0]];
        var b = ptr[ids[1]];
        var r = cv.getBoundingClientRect();
        var mx = (a.x + b.x) / 2 - r.left;
        var my = (a.y + b.y) / 2 - r.top;
        var wx = mx / zt + cam.x;
        var wy = my / zt + cam.y;
        zt = Math.max(zmin, Math.min(zmax, pinch.z * Math.hypot(a.x - b.x, a.y - b.y) / pinch.d));
        cam.x = wx - mx / zt;
        cam.y = wy - my / zt;
        clamp();
        return;
      }
      if (!drag || e.pointerId !== drag.id) return;
      if (Math.abs(e.clientX - drag.x0) > 7 || Math.abs(e.clientY - drag.y0) > 7) drag.moved = true;
      if (drag.moved && !busy()) {
        var z = zoom();
        cam.x = drag.cx - (e.clientX - drag.x) / z;
        cam.y = drag.cy - (e.clientY - drag.y) / z;
        clamp();
      }
    });
    function up(e) {
      delete ptr[e.pointerId];
      var left = Object.keys(ptr);
      if (pinch && left.length < 2) {
        pinch = null;
        var q = ptr[left[0]];
        drag = q ? { id: +left[0], x: q.x, y: q.y, cx: cam.x, cy: cam.y, x0: 0, y0: 0, t: 0, moved: true } : null;
        return;
      }
      if (!drag || e.pointerId !== drag.id) return;
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
    var z = zoom();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = view === 'town' ? GRASS : '#262830';
    ctx.fillRect(0, 0, cv.width, cv.height);
    ctx.setTransform(dpr * z, 0, 0, dpr * z, -cam.x * dpr * z, -cam.y * dpr * z);
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

  function refresh() {
    sync(false, 0);
    people.length = 0;
    cars.length = 0;
    fx.coins.length = 0;
    populate();
  }

  return {
    init: init, draw: draw, inset: function (t, b) { IT = t; IB = b; clamp(); }, ready: function () { return ready; },
    stepped: stepped, go: go, refresh: refresh, confetti: confetti, populate: populate, roomY: roomY, blockAt: blockAt,
    view: function () { return view; }, focusNow: focusNow,
    float: function (x, y, text, now) { fx.floats.push({ x: x, y: y, text: text, t0: now }); }
  };
})();
