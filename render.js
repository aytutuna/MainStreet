// World heights are measured up from the base line, so anything on the sidewalk or road has a negative height.
var BASE_H = 126;
var WALK_H = 30;
var LANE_UP = 68;
var LANE_DOWN = 106;
var GH = 640;
var ROAD = 1;
var DS = 2;
var HUD_H = 56;

var INK = '#3a3a50';
var KERB = '#8b8bab';
var LINE = '#d8d0e0';
var AMBER = '#f8d239';
var GREEN = '#64b63b';
var RED = '#e63f38';
var SLATE = '#565972';
var FLAME = [0, 4, 8, 12, 15];

var IMG = {};
var canvas;
var ctx;
var back;
var VW = 288;
var VH = 400;
var SC = 1;
var DPR = 1;
var cam = { x: 0, y: 0, vx: 0, vy: 0, tx: 0, ty: 0, go: false };
var sel = 0;
var clock = 0;
var by = 0;
var cx = 0;
var floats = [];
var sparks = [];
var smoke = [];
var popT = [];
var walkers = [];
var lanes = [];
var birds = [];
var heli = null;
var walkTimer = 0;

var GLYPHS = {
  '0': '111101101101111', '1': '010110010010111', '2': '111001111100111', '3': '111001111001111',
  '4': '101101111001001', '5': '111100111001111', '6': '111100111101111', '7': '111001001001001',
  '8': '111101111101111', '9': '111101111001111', '+': '000010111010000', '$': '011110010011110',
  '.': '000000000000010', '!': '010010010000010',
  A: '010101111101101', B: '110101110101110', C: '011100100100011', D: '110101101101110',
  E: '111100110100111', F: '111100110100100', G: '011100101101011', H: '101101111101101',
  I: '111010010010111', J: '001001001101010', K: '101101110101101', L: '100100100100111',
  M: '101111111101101', N: '110101101101101', O: '010101101101010', P: '110101110100100',
  Q: '010101101111011', R: '110101110101101', S: '011100010001110', T: '111010010010010',
  U: '101101101101111', V: '101101101101010', W: '101101111111101', X: '101101010101101',
  Y: '101101010010010', Z: '111001010100111'
};

var seed = 1;
function rnd() {
  seed = (seed * 1103515245 + 12345) & 0x7fffffff;
  return (seed >> 8) / 0x800000;
}

// IMG only holds images that arrived, so a retry fetches just the ones that failed
function loadSprites(list, done, fail) {
  var need = list.filter(function (n) {
    return !IMG[n];
  });
  var left = need.length;
  var bad = 0;
  if (!left) {
    done();
    return;
  }
  var settle = function () {
    if (--left === 0) (bad ? fail : done)();
  };
  need.forEach(function (n) {
    var im = new Image();
    im.onload = function () {
      IMG[n] = im;
      settle();
    };
    im.onerror = function () {
      bad++;
      settle();
    };
    im.src = 'assets/' + n + '.png';
  });
}

function text(s, x, y, col, k) {
  ctx.fillStyle = col;
  for (var i = 0; i < s.length; i++) {
    var g = GLYPHS[s[i]];
    if (g) {
      for (var j = 0; j < 15; j++) {
        if (g[j] === '1') ctx.fillRect(x + (j % 3) * k, y + ((j / 3) | 0) * k, k, k);
      }
    }
    x += 4 * k;
  }
}

function outlined(s, x, y, col, k) {
  var o = [[-1, 0], [1, 0], [0, -1], [0, 1]];
  for (var i = 0; i < 4; i++) text(s, x + o[i][0] * k, y + o[i][1] * k, INK, k);
  text(s, x, y, col, k);
}

function textW(s, k) {
  return (s.length * 4 - 1) * k;
}

// glyph size that stays readable whatever the scale: about px CSS pixels tall
function glyphK(px) {
  return Math.max(1, Math.ceil(px * DPR / (5 * SC)));
}

function setView(cssW, cssH, dpr) {
  var d = cssW * dpr;
  DPR = dpr;
  SC = Math.max(1, Math.round(d / 288));
  VW = Math.ceil(d / SC);
  VH = Math.ceil(cssH * dpr / SC);
  if (!ctx || canvas.width !== VW || canvas.height !== VH) {
    // resizing clears the canvas, so it is only done when the size really changed
    canvas.width = VW;
    canvas.height = VH;
    ctx = canvas.getContext('2d');
    ctx.imageSmoothingEnabled = false;
  }
  canvas.style.width = VW * SC / dpr + 'px';
  canvas.style.height = VH * SC / dpr + 'px';
  camClamp();
}

function worldW() {
  return D.lots[D.lots.length - 1].x + D.lots[D.lots.length - 1].w;
}

function lastVisible() {
  return Math.min(nextClosed(), D.lots.length - 1);
}

function endX() {
  var l = D.lots[lastVisible()];
  return l.x + l.w;
}

function openEnd() {
  var e = 0;
  for (var i = 0; i < D.lots.length; i++) if (isOpen(i)) e = D.lots[i].x + D.lots[i].w;
  return e;
}

function openCount() {
  var n = 0;
  for (var i = 0; i < D.lots.length; i++) if (isOpen(i)) n++;
  return n;
}

function shown(p, lvl) {
  return lvl >= p.at && (p.to === undefined || lvl <= p.to);
}

function siteName(i) {
  var l = D.lots[i];
  return 'site' + l.w + '_' + Math.min(2, Math.floor(S.lots[i].t / l.build * 3));
}

function lotTop(i) {
  var l = D.lots[i];
  var s = S.lots[i];
  if (s.st === 0) return IMG.forsale.height;
  if (s.st === 1) return IMG[siteName(i)].height;
  var top = 32;
  l.parts.forEach(function (p) {
    if (shown(p, s.lvl)) top = Math.max(top, p.y + IMG[p.n].height);
  });
  return top;
}

function camLimits() {
  var top = 0;
  for (var i = 0; i <= lastVisible(); i++) top = Math.max(top, lotTop(i));
  return {
    x: Math.max(0, endX() + 90 - VW),
    y: Math.max(0, top + BASE_H + HUD_H - VH)
  };
}

function camClamp() {
  var m = camLimits();
  cam.x = Math.max(0, Math.min(m.x, cam.x));
  cam.y = Math.max(0, Math.min(m.y, cam.y));
}

function camGo(x, y) {
  var m = camLimits();
  cam.tx = Math.max(0, Math.min(m.x, x));
  cam.ty = Math.max(0, Math.min(m.y, y));
  cam.go = true;
  cam.vx = 0;
  cam.vy = 0;
}

// centres a lot and raises the camera far enough to show its top
function camTo(i) {
  var l = D.lots[i];
  camGo(l.x + l.w / 2 - VW / 2, lotTop(i) + BASE_H + HUD_H - VH);
}

function onScreen(i) {
  var l = D.lots[i];
  return l.x >= cam.x && l.x + l.w <= cam.x + VW && lotTop(i) + BASE_H + HUD_H - VH <= cam.y;
}

// brings the thing just bought into view; trucks are hired at the far end of the street
function lookAt(id) {
  var i = lotIndex(id);
  if (i >= 0) {
    if (!onScreen(i)) camTo(i);
    return;
  }
  var tk = T.trucks[T.trucks.length - 1];
  var x = id === 'drones' ? hubX() : id === 'heli' ? padSpot().x : id === 'trucks' ? route().len : tk ? tk.x : cam.x + VW / 2;
  if (x < cam.x + 20 || x > cam.x + VW - 20) camGo(x - VW / 2, cam.y);
}

function select(i) {
  sel = i;
}

function camStep(dt) {
  if (cam.go) {
    var k = Math.min(1, dt * 7);
    cam.x += (cam.tx - cam.x) * k;
    cam.y += (cam.ty - cam.y) * k;
    if (Math.abs(cam.tx - cam.x) < 0.4 && Math.abs(cam.ty - cam.y) < 0.4) {
      cam.x = cam.tx;
      cam.y = cam.ty;
      cam.go = false;
    }
    return;
  }
  if (!cam.vx && !cam.vy) return;
  var m = camLimits();
  cam.x += cam.vx * dt;
  cam.y += cam.vy * dt;
  var f = Math.exp(-4 * dt);
  cam.vx *= f;
  cam.vy *= f;
  if (cam.x < 0 || cam.x > m.x) cam.vx = 0;
  if (cam.y < 0 || cam.y > m.y) cam.vy = 0;
  if (Math.abs(cam.vx) < 4) cam.vx = 0;
  if (Math.abs(cam.vy) < 4) cam.vy = 0;
  camClamp();
}

// the whole ground comes from D.ground and D.deco: tile indices into the district's sheet, an optional band
// (heights above the base line) and the scatter, with the road shared by every district
function buildBack() {
  var g = D.ground;
  var gw = worldW() + 400;
  back = document.createElement('canvas');
  back.width = gw;
  back.height = GH;
  var c = back.getContext('2d');
  c.imageSmoothingEnabled = false;
  var b = GH - BASE_H;
  var tile = function (sheet, i, x0, y0, x1, y1) {
    for (var y = y0; y < y1; y += 16) {
      for (var x = x0; x < x1; x += 16) {
        var w = Math.min(16, x1 - x);
        var h = Math.min(16, y1 - y);
        c.drawImage(IMG[sheet], i * 16, 0, w, h, x, y, w, h);
      }
    }
  };
  tile(g.sheet, g.base, 0, 0, gw, b);
  if (g.band) {
    var top = Math.max(0, b - g.band.to);
    var bot = b - g.band.from;
    tile(g.sheet, g.band.tile, 0, top, gw, bot);
    if (g.band.edge) {
      c.fillStyle = g.band.edge;
      c.fillRect(0, bot - 2, gw, 2);
    }
  }
  D.deco.forEach(function (d) {
    if (d.t !== undefined) tile(g.sheet, d.t, d.x, b - d.y - d.h, d.x + d.w, b - d.y);
  });
  D.deco.filter(function (d) {
    return d.n;
  }).sort(function (p, q) {
    return q.y - p.y;
  }).forEach(function (d) {
    for (var k = 0; k < (d.rep || 1); k++) c.drawImage(IMG[d.n], d.x + k * IMG[d.n].width, b - d.y - IMG[d.n].height);
  });
  tile(g.sheet, g.walk, 0, b, gw, b + WALK_H);
  tile('tiles', ROAD, 0, b + WALK_H, gw, b + 110);
  tile(g.sheet, g.verge, 0, b + 110, gw, GH);
  c.fillStyle = KERB;
  c.fillRect(0, b + WALK_H - 2, gw, 2);
  c.fillRect(0, b + 110, gw, 2);
  c.fillStyle = '#6c6e85';
  c.fillRect(0, b + WALK_H, gw, 1);
  c.fillRect(0, b + 109, gw, 1);
  c.fillStyle = LINE;
  for (var x = 4; x < gw; x += 32) c.fillRect(x, b + 70, 16, 2);
  for (x = 44; x < gw; x += 560) c.drawImage(IMG.hydrant, x, b + 22 - 32);
}

function enter() {
  seed = 11;
  floats = [];
  sparks = [];
  smoke = [];
  popT = [];
  heli = null;
  lanes = [{ dir: -1, y: LANE_DOWN, cars: [], wait: 1 }, { dir: 1, y: LANE_UP, cars: [], wait: 4 }];
  birds = [];
  for (var i = 0; i < 2; i++) birds.push({ x: 60 + i * 130, y: 12 + i * 5, v: 0, t: i, wait: i + 1, dir: 1 });
  walkers = [];
  sel = 0;
  cam.x = 0;
  cam.y = 0;
  cam.vx = cam.vy = 0;
  cam.go = false;
  buildBack();
  fillWalkers(true);
}

function img(n, x, y) {
  ctx.drawImage(IMG[n], Math.round(x), Math.round(y));
}

function bar(x, y, w, p, bg, fg) {
  ctx.fillStyle = INK;
  ctx.fillRect(x - 1, y - 1, w + 2, 7);
  ctx.fillStyle = bg;
  ctx.fillRect(x, y, w, 5);
  ctx.fillStyle = fg;
  ctx.fillRect(x, y, Math.round(w * p), 5);
}

function glow(x, y, rad, col, a) {
  ctx.fillStyle = col;
  ctx.globalAlpha = a;
  ctx.beginPath();
  for (var dy = -rad; dy <= rad; dy++) {
    var hw = Math.round(Math.sqrt(rad * rad - dy * dy));
    ctx.rect(x - hw, y + dy, hw * 2, 1);
  }
  ctx.fill();
  ctx.globalAlpha = 1;
}

function drawFire(x, y, size) {
  if (size < 1) return;
  size = Math.min(size, 4);
  var h = FLAME[size];
  var f = Math.floor(clock * 8) % 6;
  var top = y - 20;
  var mid = x + 8;
  glow(mid, top - 4, 5 + size, '#f2b22b', 0.1);
  glow(mid, top - 4, 3 + (size >> 1), '#f2b22b', 0.12);
  if (size >= 4) {
    ctx.drawImage(IMG.fire, ((f + 2) % 6) * 16, 22 - h, 16, h, x - 5, top - h, 16, h);
    ctx.drawImage(IMG.fire, ((f + 4) % 6) * 16, 22 - h, 16, h, x + 5, top - h, 16, h);
  }
  ctx.drawImage(IMG.fire, f * 16, 22 - h, 16, h, x, top - h, 16, h);
  if (size >= 3) {
    ctx.fillStyle = AMBER;
    for (var k = 0; k < 3; k++) {
      var ph = (clock * 1.3 + k * 0.33) % 1;
      ctx.globalAlpha = 1 - ph;
      ctx.fillRect(Math.round(mid - 6 + k * 6 + Math.sin(clock * 5 + k) * 2), Math.round(top - h - ph * 14), 1, 1);
    }
    ctx.globalAlpha = 1;
  }
}

// named per-lot effects: draw is called for each shown part, tick once a frame with the lot
var FX = {
  stand: {
    draw: function (l, s, p, x, y) {
      if (p.n.indexOf('bbq') === 0) drawFire(x, y, p.n === 'bbq3' ? 4 : s.lvl);
    },
    tick: function (l, s, dt) {
      if (s.lvl < 4 || Math.floor(clock * 3) === Math.floor((clock - dt) * 3)) return;
      smoke.push({ x: l.x + 78, h: 35, t: 0, vx: 3, big: true });
      if (s.lvl >= 7) smoke.push({ x: l.x + 62, h: 35, t: 0, vx: 3, big: true });
    }
  }
};

function drawSmoke(dt) {
  for (var i = smoke.length - 1; i >= 0; i--) {
    var s = smoke[i];
    s.t += dt;
    var life = s.big ? 1.6 : 0.9;
    if (s.t > life) {
      smoke.splice(i, 1);
      continue;
    }
    var x = Math.round(s.x + s.vx * s.t - cx);
    var y = Math.round(by - s.h - s.t * (s.big ? 18 : 10));
    var n = s.big ? 4 : s.t > 0.45 ? 7 : 5;
    var h = n >> 1;
    ctx.globalAlpha = (s.big ? 0.8 : 0.9) * (1 - s.t / life);
    ctx.fillStyle = '#d8d0e0';
    ctx.fillRect(x - h + 1, y - h, n - 2, n);
    ctx.fillRect(x - h, y - h + 1, n, n - 2);
    ctx.globalAlpha = 1;
  }
}

function drawSparks(dt) {
  var dirs = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, 1], [1, -1], [-1, -1]];
  for (var i = sparks.length - 1; i >= 0; i--) {
    var s = sparks[i];
    s.t += dt;
    if (s.t > 0.8) {
      sparks.splice(i, 1);
      continue;
    }
    var x = Math.round(s.x - cx);
    var y = Math.round(by - s.h);
    var r = 4 + s.t * 30;
    ctx.globalAlpha = 1 - s.t / 0.8;
    for (var j = 0; j < 8; j++) {
      ctx.fillStyle = j % 2 ? AMBER : '#f8f8f8';
      ctx.fillRect(Math.round(x + dirs[j][0] * r) - 1, Math.round(y + dirs[j][1] * r) - 1, 2, 2);
    }
    if (s.t < 0.25) {
      ctx.fillStyle = '#f8f8f8';
      ctx.fillRect(x - 5, y, 11, 1);
      ctx.fillRect(x, y - 5, 1, 11);
    }
    ctx.globalAlpha = 1;
  }
}

function drawFloats(dt) {
  for (var i = floats.length - 1; i >= 0; i--) {
    var f = floats[i];
    var life = f.say ? 2 : 1.4;
    f.t += dt;
    if (f.t > life) {
      floats.splice(i, 1);
      continue;
    }
    var k = f.say ? glyphK(14) : glyphK(11);
    var w = textW(f.s, k);
    if (w > VW - 8) {
      k = Math.max(1, k - 1);
      w = textW(f.s, k);
    }
    var x = Math.round(f.x - cx - w / 2);
    x = Math.max(4, Math.min(VW - w - 4, x));
    var y = Math.round(by - f.h - f.t * (f.say ? 14 : 18));
    y = Math.max(HUD_H, y);
    if (f.t > life - 0.4) ctx.globalAlpha = (life - f.t) / 0.4;
    outlined(f.s, x, y, f.say ? '#f8f8f8' : AMBER, k);
    ctx.globalAlpha = 1;
  }
}

function lotIndex(id) {
  for (var i = 0; i < D.lots.length; i++) if (D.lots[i].id === id) return i;
  return -1;
}

function partCenter(l, p) {
  var im = IMG[p.n];
  return { x: l.x + p.x + im.width / 2, h: p.y + im.height / 2 };
}

// where the sparks and the label of a purchase go
function spot(id, lvl) {
  var i = lotIndex(id);
  if (i >= 0) {
    var l = D.lots[i];
    for (var j = 0; j < l.parts.length; j++) {
      if (l.parts[j].at === lvl) return partCenter(l, l.parts[j]);
    }
    return { x: l.x + l.w / 2, h: Math.min(lotTop(i), 120) / 2 };
  }
  if (id === 'drones' && T.drones.length) return { x: T.drones[T.drones.length - 1].x, h: 44 };
  if (id === 'heli' && heli) return { x: heli.x, h: heli.h + 28 };
  var tk = T.trucks[T.trucks.length - 1];
  return { x: tk ? tk.x : cam.x + VW / 2, h: 36 - LANE_DOWN };
}

function sayOf(id, lvl) {
  var i = lotIndex(id);
  if (i >= 0) return lvl ? D.lots[i].rungs[lvl - 1].say : 'Building!';
  if (id === 'trucks') return FLEET.trucks[lvl - 1].say;
  if (id === 'speed') return FLEET.speed.rungs[lvl - 1].say;
  if (id === 'drones') return FLEET.drones[lvl - 1].say;
  return FLEET.heli.say;
}

// a burst of purchases would stack unreadable labels, so only the newest three stay
function pushSay(s, x, h) {
  var n = 0;
  for (var i = floats.length - 1; i >= 0; i--) {
    if (floats[i].say && ++n >= 3) floats.splice(i, 1);
  }
  floats.push({ s: s, x: x, h: h + 20 * n, t: 0, say: true });
}

function celebrate() {
  while (bought.length) {
    var b = bought.shift();
    var p = spot(b[0], b[1]);
    sparks.push({ x: p.x, h: p.h, t: 0 });
    pushSay(sayOf(b[0], b[1]).toUpperCase(), p.x, p.h + 16);
    sfx('buy');
  }
  while (opened.length) {
    var i = opened.shift();
    var l = D.lots[i];
    sparks.push({ x: l.x + l.w / 2, h: 40, t: 0 });
    pushSay('OPEN!', l.x + l.w / 2, 60);
    sfx('open');
  }
}

// income floats: always for the selected lot, a few at a time for the others, and never off screen
function popMoney(i, dt) {
  var s = S.lots[i];
  popT[i] = (popT[i] || 0) + dt;
  if (popT[i] < (i === sel ? 1.2 : 3) || s.acc < 1) return;
  var l = D.lots[i];
  var h = Math.min(lotTop(i), 110) + 6;
  var mid = l.x + l.w / 2;
  if (mid < cx + 12 || mid > cx + VW - 12 || by - h < HUD_H || by - h > VH) {
    s.acc = 0;
    popT[i] = 0;
    return;
  }
  if (i !== sel && floats.filter(function (f) {
    return f.auto;
  }).length >= 3) return;
  popT[i] = 0;
  floats.push({ s: '+$' + short(Math.floor(s.acc)), x: l.x + l.w / 2 + Math.round(rnd() * 16 - 8), h: h, t: 0, auto: true });
  s.acc = 0;
}

function drawLot(i, dt) {
  var l = D.lots[i];
  var s = S.lots[i];
  var x = l.x - cx;
  if (s.st === 0) {
    img('forsale', x + (l.w - IMG.forsale.width) / 2, by - IMG.forsale.height + 2);
    return;
  }
  if (s.st === 1) {
    var site = IMG[siteName(i)];
    img(siteName(i), x, by - site.height);
    bar(Math.round(x + l.w / 2 - 32), by - site.height - 12, 64, s.t / l.build, SLATE, GREEN);
    return;
  }
  var dry = l.hold > 0 && s.stock <= 0;
  l.parts.forEach(function (p) {
    if (!shown(p, s.lvl)) return;
    var n = dry && IMG[p.n + '_shut'] ? p.n + '_shut' : p.n;
    var py = by - p.y;
    img(n, x + p.x, py - IMG[n].height);
    if (l.fx) FX[l.fx].draw(l, s, p, Math.round(x + p.x), py);
  });
  var hub = hubPad();
  if (hub && hub.lot === l) img('helipad', x + (l.w - IMG.helipad.width) / 2, by - hub.h - 20 - IMG.helipad.height);
}

function drawStock(i) {
  var l = D.lots[i];
  var s = S.lots[i];
  if (s.st !== 2 || l.hold === 0) return;
  var x = Math.round(l.x + l.w / 2 - cx);
  var r = s.stock / l.hold;
  var p = S.heli ? 1 : Math.min(1, r);
  bar(x - 20, by + 4, 40, p, SLATE, r > 0.5 ? GREEN : r > 0.2 ? AMBER : RED);
  if (s.stock > 0) return;
  var bob = Math.round(Math.sin(clock * 6) * 2);
  var y = by - 14 + bob;
  ctx.fillStyle = INK;
  ctx.fillRect(x - 7, y - 7, 14, 14);
  ctx.fillRect(x - 2, y + 7, 4, 4);
  ctx.fillStyle = AMBER;
  ctx.fillRect(x - 6, y - 6, 12, 12);
  ctx.fillRect(x - 1, y + 6, 2, 3);
  text('!', x - 1, y - 4, INK, 1);
}

function drawMarker() {
  var l = D.lots[sel];
  var x = l.x - cx;
  ctx.globalAlpha = 0.55 + 0.45 * Math.sin(clock * 5);
  ctx.fillStyle = AMBER;
  ctx.fillRect(x + 4, by + WALK_H - 5, l.w - 8, 2);
  ctx.fillRect(x + 4, by + WALK_H - 11, 2, 8);
  ctx.fillRect(x + l.w - 6, by + WALK_H - 11, 2, 8);
  ctx.globalAlpha = 1;
}

function drawEnd() {
  var e = endX();
  var n = 0;
  for (var x = e + 20; x < worldW() + 300; x += 44) {
    var im = IMG[D.ground.end[n++ % D.ground.end.length]];
    var px = x + ((x * 7) % 13) - cx;
    if (px > -50 && px < VW) ctx.drawImage(im, px, by - im.height + 6 + ((x * 3) % 17));
  }
}

function fillWalkers(spread) {
  var n = openCount();
  var fed = 0;
  var stock = 0;
  for (var i = 0; i < D.lots.length; i++) {
    if (!isOpen(i) || D.lots[i].hold === 0) continue;
    stock++;
    if (S.lots[i].stock > 0) fed++;
  }
  var share = stock ? fed / stock : 1;
  var want = Math.min(14, Math.round(n * 1.7 * (0.4 + 0.6 * share)));
  var cur = walkers.filter(function (w) {
    return !w.leave;
  }).length;
  if (cur < want) {
    var end = openEnd();
    walkers.push({
      skin: 1 + ((rnd() * 5) | 0),
      x: spread ? rnd() * end : -16,
      off: 8 + ((rnd() * 18) | 0),
      dir: 1,
      tx: -1,
      wait: 0,
      t: rnd() * 5,
      v: 13 + rnd() * 9,
      leave: false
    });
  } else if (cur > want) {
    for (i = walkers.length - 1; i >= 0; i--) {
      if (!walkers[i].leave) {
        walkers[i].leave = true;
        break;
      }
    }
  }
}

function pickTarget() {
  var list = [];
  var sum = 0;
  for (var i = 0; i < D.lots.length; i++) {
    if (!isOpen(i)) continue;
    var l = D.lots[i];
    var w = l.hold > 0 && S.lots[i].stock <= 0 ? 0.15 : 1;
    sum += w;
    list.push([i, w]);
  }
  var r = rnd() * sum;
  for (var j = 0; j < list.length; j++) {
    r -= list[j][1];
    if (r <= 0) return list[j][0];
  }
  return list.length ? list[0][0] : -1;
}

function updateWalkers(dt) {
  walkTimer += dt;
  if (walkTimer > 0.8) {
    walkTimer = 0;
    fillWalkers(false);
  }
  for (var i = walkers.length - 1; i >= 0; i--) {
    var w = walkers[i];
    w.t += dt;
    var open = w.lot >= 0 && w.lot !== undefined && isOpen(w.lot);
    if (w.wait > 0) {
      var dry = open && D.lots[w.lot].hold > 0 && S.lots[w.lot].stock <= 0;
      w.wait -= dt * (dry ? 3 : 1);
      continue;
    }
    if (w.leave) {
      w.dir = -1;
      w.x -= w.v * dt;
      if (w.x < -24) walkers.splice(i, 1);
      continue;
    }
    if (w.tx < 0 || w.lot === undefined || !isOpen(w.lot)) {
      w.lot = pickTarget();
      if (w.lot < 0) continue;
      var l = D.lots[w.lot];
      w.tx = l.x + 16 + rnd() * (l.w - 32);
    }
    w.dir = w.tx > w.x ? 1 : -1;
    w.x += w.dir * w.v * dt;
    if (Math.abs(w.tx - w.x) < 2) {
      w.wait = 2 + rnd() * 5;
      w.tx = -1;
    }
  }
}

function carPic(ln) {
  var open = openCount();
  if (open >= 4 && rnd() < 0.2) return { bus: true, w: 112, f: (rnd() * 6) | 0 };
  var c = 1 + ((rnd() * 8) | 0);
  var n = 'car_' + (ln.dir > 0 ? 'r' : 'l') + c;
  return { pic: n, w: IMG[n].width };
}

function updateCars(dt) {
  lanes.forEach(function (ln) {
    ln.wait -= dt;
    if (ln.wait <= 0) {
      var x0 = ln.dir < 0 ? cam.x + VW + 100 : cam.x - 100;
      var clear = ln.cars.every(function (c) {
        return Math.abs(c.x - x0) > 150;
      });
      if (clear && ln.dir < 0) {
        clear = T.trucks.every(function (tk) {
          return Math.abs(tk.x - x0) > 200;
        });
      }
      if (clear) {
        var c = carPic(ln);
        c.x = x0;
        c.v = c.bus ? 34 + rnd() * 12 : 46 + rnd() * 24;
        ln.cars.push(c);
        ln.wait = 2 + rnd() * 4;
      } else {
        ln.wait = 0.5;
      }
    }
    for (var i = ln.cars.length - 1; i >= 0; i--) {
      var o = ln.cars[i];
      var blocked = false;
      var ahead = function (x, hw) {
        var d = (x - o.x) * ln.dir;
        if (d > 0 && d < o.w / 2 + hw + 10) blocked = true;
      };
      ln.cars.forEach(function (q) {
        if (q !== o) ahead(q.x, q.w / 2);
      });
      if (ln.dir < 0) {
        T.trucks.forEach(function (tk) {
          ahead(tk.x, 62);
        });
      }
      if (!blocked) o.x += ln.dir * o.v * dt;
      if (Math.abs(o.x - (cam.x + VW / 2)) > VW / 2 + 320) ln.cars.splice(i, 1);
    }
  });
}

function updateBirds(dt) {
  var e = Math.max(120, openEnd());
  birds.forEach(function (p) {
    p.t += dt;
    p.wait -= dt;
    if (p.wait <= 0) {
      p.v = rnd() < 0.5 ? 0 : (rnd() < 0.5 ? -9 : 9);
      if (p.v) p.dir = p.v > 0 ? 1 : -1;
      p.wait = 1.5 + rnd() * 3;
    }
    p.x = Math.max(8, Math.min(e - 24, p.x + p.v * dt));
  });
}

function drawWalker(w) {
  var f = w.wait > 0 ? 0 : Math.floor(w.t * 8) % 6;
  var col = ((w.dir < 0 ? 6 : 0) + f) * 16;
  ctx.drawImage(IMG['walk' + w.skin], col, 0, 16, 32, Math.round(w.x - 8 - cx), by + w.off - 32, 16, 32);
}

function drawCar(ln, c) {
  var x = Math.round(c.x - c.w / 2 - cx);
  if (c.bus) ctx.drawImage(IMG[ln.dir > 0 ? 'bus_r' : 'bus_l'], c.f * 112, 0, 112, 64, x, by + ln.y - 64, 112, 64);
  else img(c.pic, x, by + ln.y - 48);
}

function truckSheet() {
  return IMG[S.speed >= 5 ? 'truck5' : S.speed >= 3 ? 'truck3' : S.speed >= 2 ? 'truck2' : 'truck'];
}

function drawTruck(tk, dt) {
  var moving = tk.phase === 'drive';
  var f = moving ? Math.floor(clock * 8) % 6 : 0;
  var x = Math.round(tk.x - 67 - cx);
  var y = by + LANE_DOWN - 75;
  var l = S.speed;
  if (l >= 4 && moving) {
    ctx.fillStyle = '#d8d0e0';
    for (var i = 0; i < 3; i++) {
      var len = 10 + ((Math.floor(clock * 12) + i * 2) % 3) * 5;
      ctx.fillRect(x + 136 + (i % 2) * 4, y + 44 + i * 7, len, 1);
    }
  }
  ctx.drawImage(truckSheet(), f * 134, 0, 134, 75, x, y, 134, 75);
  if (l >= 6) {
    var on = Math.floor(clock * 4) % 2;
    glow(x + 105, y + 10, 7, on ? RED : AMBER, 0.25);
    ctx.fillStyle = INK;
    ctx.fillRect(x + 101, y + 12, 8, 2);
    ctx.fillStyle = on ? RED : AMBER;
    ctx.fillRect(x + 102, y + 9, 6, 3);
    ctx.fillStyle = on ? '#ff8575' : '#fff59a';
    ctx.fillRect(x + 103, y + 9, 4, 1);
  }
  tk.puff = (tk.puff || 0) - dt;
  if (l >= 1 && moving && tk.puff <= 0 && cam.x < tk.x && tk.x < cam.x + VW + 200) {
    tk.puff = 20 / truckSpeed();
    smoke.push({ x: tk.x + 67, h: 12 - LANE_DOWN, t: 0, vx: 4, big: false });
  }
}

function drawParcels(tk) {
  if (tk.phase !== 'stop') return;
  for (var i = 0; i < 3; i++) {
    var u = (tk.t - 0.4 - i * 0.45) / 0.5;
    if (u < 0 || u > 1) continue;
    var x = tk.x + 36 + (i * 8 - 12 - 36) * u;
    var y = by + 34 - 30 * u - 40 * u * (1 - u);
    img('parcel' + (i + 1), x - 8 - cx, y - 16);
  }
}

function drawDrone(d, k) {
  var go = d.to >= 0 ? d.t / DRONE_TRIP : 0;
  var h = 44 - Math.max(0, (go - 0.8) * 5) * 22 + Math.sin(clock * 3 + k) * 3;
  var x = Math.round(d.x - 18 * DS - cx);
  var y = Math.round(by - h - 20 * DS);
  ctx.globalAlpha = 0.25;
  ctx.fillStyle = INK;
  ctx.fillRect(Math.round(d.x - cx) - 10, by + 22, 20, 3);
  ctx.globalAlpha = 1;
  if (d.to >= 0 && go < 0.8) {
    ctx.fillStyle = INK;
    ctx.fillRect(Math.round(d.x - cx), y + 18 * DS, 1, 4);
    ctx.drawImage(IMG.dparcel, Math.round(d.x - cx) - 5, y + 18 * DS + 4);
  }
  ctx.drawImage(IMG.drone, (Math.floor(clock * 12 + k) % 6) * 36, 0, 36, 20, x, y, 36 * DS, 20 * DS);
}

function lotPad() {
  for (var i = 0; i < D.lots.length; i++) {
    var l = D.lots[i];
    for (var j = 0; j < l.parts.length; j++) {
      var p = l.parts[j];
      if (p.n === 'helipad' && isOpen(i) && shown(p, S.lots[i].lvl)) return { x: l.x + p.x + 60, h: p.y + 20 };
    }
  }
  return null;
}

// buying the helicopter puts a pad on the roof of the lot that unlocks it until a lot upgrade builds a better one
function hubPad() {
  if (!S.heli || lotPad()) return null;
  for (var i = 0; i < D.lots.length; i++) {
    var l = D.lots[i];
    if (isOpen(i) && l.unlocks && l.unlocks.indexOf('heli') >= 0) return { x: l.x + l.w / 2, h: lotTop(i) - 50, lot: l };
  }
  return null;
}

function padSpot() {
  return lotPad() || hubPad();
}

function updateHeli(dt) {
  if (!S.heli) {
    heli = null;
    return;
  }
  var pad = padSpot();
  if (!heli) {
    heli = { x: pad ? pad.x : cam.x + VW / 2, h: pad ? pad.h : 150, tx: 0, th: 0, wait: 0, dir: -1, home: true };
    heli.tx = heli.x;
    heli.th = heli.h;
  }
  if (heli.wait > 0) {
    heli.wait -= dt;
    return;
  }
  var dx = heli.tx - heli.x;
  var dh = heli.th - heli.h;
  var dist = Math.hypot(dx, dh);
  if (dist < 2) {
    if (pad && heli.home === false && rnd() < 0.5) {
      heli.tx = pad.x;
      heli.th = pad.h;
      heli.home = true;
      heli.wait = 0;
      return;
    }
    heli.wait = heli.home && pad ? 4 + rnd() * 4 : 1.5 + rnd() * 2;
    var i = pickTarget();
    if (i < 0) return;
    var l = D.lots[i];
    heli.tx = l.x + 16 + rnd() * (l.w - 32);
    heli.th = 120 + rnd() * 40;
    heli.home = false;
    return;
  }
  var v = Math.min(dist, 42 * dt);
  heli.x += dx / dist * v;
  heli.h += dh / dist * v;
  if (Math.abs(dx) > 3) heli.dir = dx > 0 ? 1 : -1;
}

function drawHeli() {
  var x = Math.round(heli.x - 40 - cx);
  var y = Math.round(by - heli.h - 56);
  var air = heli.h > 40;
  if (air) {
    ctx.globalAlpha = 0.22;
    ctx.fillStyle = INK;
    ctx.fillRect(x + 18, by + 22, 44, 4);
    ctx.globalAlpha = 1;
  }
  var im = IMG[Math.floor(clock * 14) % 2 ? 'heli1' : 'heli2'];
  if (heli.dir > 0) {
    ctx.save();
    ctx.translate(x + 80, y);
    ctx.scale(-1, 1);
    ctx.drawImage(im, 0, 0);
    ctx.restore();
  } else {
    ctx.drawImage(im, x, y);
  }
}

function lampX() {
  var list = [];
  for (var x = 8; x < worldW() + 200; x += 264) list.push(x);
  return list;
}

function animate(dt) {
  for (var i = 0; i <= lastVisible(); i++) {
    var l = D.lots[i];
    if (S.lots[i].st === 2 && l.fx) FX[l.fx].tick(l, S.lots[i], dt);
  }
  updateWalkers(dt);
  updateCars(dt);
  updateBirds(dt);
  updateHeli(dt);
}

function draw(dt) {
  clock += dt;
  camStep(dt);
  cx = Math.round(cam.x);
  by = VH + Math.round(cam.y) - BASE_H;
  animate(dt);

  ctx.fillStyle = '#3f9946';
  ctx.fillRect(0, 0, VW, VH);
  var sy = GH - VH - Math.round(cam.y);
  var dy = Math.max(0, -sy);
  sy += dy;
  ctx.drawImage(back, cx, sy, Math.min(VW, back.width - cx), VH - dy, 0, dy, Math.min(VW, back.width - cx), VH - dy);

  drawEnd();
  var last = lastVisible();
  for (var i = 0; i <= last; i++) {
    var l = D.lots[i];
    if (l.x + l.w < cx || l.x > cx + VW) continue;
    drawLot(i, dt);
  }

  var objs = [];
  var add = function (y, f) {
    objs.push({ y: y, f: f });
  };
  walkers.forEach(function (w) {
    if (w.x > cx - 20 && w.x < cx + VW + 20) add(by + w.off, function () { drawWalker(w); });
  });
  lampX().forEach(function (x, k) {
    if (x < cx - 40 || x > cx + VW) return;
    add(by + 26, function () {
      img('lamp', x - cx, by + 26 - 64);
      if (k === 0) ctx.drawImage(IMG.crow, (Math.floor(clock * 4) % 6) * 32, 0, 32, 32, x - cx - 4, by + 26 - 74, 32, 32);
    });
  });
  birds.forEach(function (p) {
    if (p.x < cx - 20 || p.x > cx + VW) return;
    add(by + p.y, function () {
      var f = Math.floor(p.t * (p.v ? 6 : 2)) % 6;
      ctx.drawImage(IMG.bird, ((p.dir > 0 ? 0 : 6) + f) * 32, 0, 32, 16, Math.round(p.x - 16 - cx), by + p.y - 16, 32, 16);
    });
  });
  lanes.forEach(function (ln) {
    ln.cars.forEach(function (c) {
      add(by + ln.y, function () { drawCar(ln, c); });
    });
  });
  T.trucks.forEach(function (tk) {
    add(by + LANE_DOWN + 1, function () { drawTruck(tk, dt); });
  });
  objs.sort(function (a, b) {
    return a.y - b.y;
  });
  objs.forEach(function (o) {
    o.f();
  });

  T.trucks.forEach(drawParcels);
  drawSmoke(dt);
  celebrate();
  for (i = 0; i <= last; i++) {
    l = D.lots[i];
    if (S.lots[i].st === 2) popMoney(i, dt);
    if (l.x + l.w < cx || l.x > cx + VW) continue;
    drawStock(i);
  }
  if (sel <= last) drawMarker();
  T.drones.forEach(function (d, k) {
    drawDrone(d, k);
  });
  if (heli) drawHeli();
  drawSparks(dt);
  drawFloats(dt);
}

// the lot under a canvas point, with a 12 pixel margin; the nearest one wins where margins meet
function lotAt(lx, ly) {
  var wx = lx + Math.round(cam.x);
  var h = by - ly;
  var best = -1;
  var bd = 1e9;
  for (var i = 0; i <= lastVisible(); i++) {
    var l = D.lots[i];
    if (wx < l.x - 12 || wx > l.x + l.w + 12) continue;
    if (h > lotTop(i) + 12 || h < -WALK_H - 12) continue;
    var d = Math.abs(wx - (l.x + l.w / 2));
    if (d < bd) {
      bd = d;
      best = i;
    }
  }
  return best;
}

function addFloat(i, n) {
  var l = D.lots[i];
  floats.push({ s: '+$' + short(Math.floor(n)), x: l.x + l.w / 2 + Math.round(rnd() * 16 - 8), h: Math.min(lotTop(i), 110) + 6, t: 0 });
  sparks.push({ x: l.x + l.w / 2, h: Math.min(lotTop(i), 100) / 2, t: 0 });
}
