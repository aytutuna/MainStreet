// The country round the store: ground height, lakes, rivers, tracks and where the trees, rocks and flowers stand.
// Heights are above the lot's lawn. The lot, the street and the yards stay flat; the hills grow out from there.
export var DOM = [-150, 150, -150, 64];
// the camera never gets further out than this, so nothing grows past it
var SEEN = [-112, 112, -116, 54];
export var FLAT = [[-48, 48, -42, 44], [-80, 80, 2, 22]];

var LAKES = [
  { x: -12, z: -66, a: 28, b: 13, lv: -1, s: 3 },
  { x: 72, z: -50, a: 12, b: 9, lv: -0.8, s: 8 }
];

// control points run downhill; drop is the least the water falls per unit, floor where it stops
var STREAMS = [
  { pts: [[58, -128], [46, -108], [36, -92], [26, -78], [16, -68], [8, -64]], w0: 2.2, w1: 4.2, drop: 0.03, end: 0 },
  { pts: [[-32, -64], [-50, -60], [-62, -46], [-66, -26], [-66, -6], [-66, 12], [-66, 34], [-74, 54], [-90, 70]], w0: 4.2, w1: 4.8, drop: 0.004, end: -2.4 }
];

// the dirt tracks the street turns into where it leaves the flat ground, and the bridge over the stream on the west
export var TRACKS = [
  { pts: [[76, 12], [90, 13], [102, 10], [112, 2], [118, -8]], w: 2.6 },
  { pts: [[-76, 12], [-90, 14], [-102, 20], [-110, 30], [-114, 42]], w: 2.6 }
];
export var BRIDGE = { x: -66, z: 12 };

function clamp(v) { return v < 0 ? 0 : v > 1 ? 1 : v; }
export function smooth(a, b, x) {
  var t = clamp((x - a) / (b - a));
  return t * t * (3 - 2 * t);
}
function hash(i, j) {
  var h = Math.imul(i, 374761393) + Math.imul(j, 668265263);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}
export function noise(x, z) {
  var i = Math.floor(x);
  var j = Math.floor(z);
  var u = x - i;
  var v = z - j;
  u = u * u * (3 - 2 * u);
  v = v * v * (3 - 2 * v);
  var a = hash(i, j);
  var b = hash(i + 1, j);
  var c = hash(i, j + 1);
  var d = hash(i + 1, j + 1);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}
function smin(a, b, k) {
  var h = clamp(0.5 + 0.5 * (b - a) / k);
  return b + (a - b) * h - k * h * (1 - h);
}

// how far a point is outside the flat ground
export function away(x, z) {
  var d = 1e9;
  for (var i = 0; i < FLAT.length; i++) {
    var r = FLAT[i];
    d = Math.min(d, Math.hypot(Math.max(r[0] - x, 0, x - r[1]), Math.max(r[2] - z, 0, z - r[3])));
  }
  return d;
}

var PEAKS = [[66, -30, 20, 9], [-8, -98, 24, 22], [32, -88, 20, 17], [-48, -86, 20, 16], [66, -78, 20, 14], [-88, -50, 20, 12], [-70, 80, 20, 8], [-34, -122, 30, 26], [30, -126, 30, 24]];

function hills(x, z) {
  var d = away(x, z);
  var h = 0.8 + noise(x / 30 + 3, z / 30) * 11 + noise(x / 14, z / 14 + 9) * 4 + noise(x / 7, z / 7 + 4) * 1.4;
  h += smooth(8, 44, d) * 5 + Math.max(0, d - 42) * 0.2;
  for (var i = 0; i < PEAKS.length; i++) {
    var p = PEAKS[i];
    h += p[3] * Math.exp(-(((x - p[0]) * (x - p[0]) + (z - p[1]) * (z - p[1])) / (p[2] * p[2])));
  }
  var m = 1 - Math.abs(noise(x / 34 + 20, z / 34 + 7) * 2 - 1);
  h += smooth(-84, -140, z) * (8 + m * m * 14) + smooth(70, 140, Math.abs(x)) * m * m * 10;
  return smooth(0, 18, d) * h;
}

// splines through the control points, sampled about every 2.5 units, with the water level at each
function spline(c, step) {
  var out = [];
  for (var i = 0; i < c.length - 1; i++) {
    var p0 = c[Math.max(0, i - 1)];
    var p1 = c[i];
    var p2 = c[i + 1];
    var p3 = c[Math.min(c.length - 1, i + 2)];
    var n = Math.max(2, Math.round(Math.hypot(p2[0] - p1[0], p2[1] - p1[1]) / (step || 2.5)));
    for (var k = 0; k < n; k++) {
      var t = k / n;
      var f = function (a, b, c2, d) { return 0.5 * (2 * b + (-a + c2) * t + (2 * a - 5 * b + 4 * c2 - d) * t * t + (-a + 3 * b - 3 * c2 + d) * t * t * t); };
      out.push([f(p0[0], p1[0], p2[0], p3[0]), f(p0[1], p1[1], p2[1], p3[1])]);
    }
  }
  out.push(c[c.length - 1].slice());
  return out;
}
STREAMS.forEach(function (s, si) {
  s.line = spline(s.pts);
  var n = s.line.length;
  var lv = LAKES[0].lv;
  var r = si === 0 ? 99 : lv;
  var rem = 0;
  s.line.forEach(function (p, i) { if (i) rem += Math.hypot(p[0] - s.line[i - 1][0], p[1] - s.line[i - 1][1]); });
  s.line.forEach(function (p, i) {
    var step = i ? Math.hypot(p[0] - s.line[i - 1][0], p[1] - s.line[i - 1][1]) : 0;
    rem -= step;
    var h = hills(p[0], p[1]) - 1.2;
    r = Math.min(r - s.drop * step, h);
    if (si === 0) r = Math.max(Math.min(r, lv + 0.06 * rem), lv);
    else r = Math.max(r, s.end);
    p[2] = r;
    p[3] = s.w0 + (s.w1 - s.w0) * i / (n - 1);
  });
});

// nearest stream: distance to its middle, the width and the level there
function stream(x, z) {
  var best = null;
  var bd = 1e9;
  for (var si = 0; si < STREAMS.length; si++) {
    var l = STREAMS[si].line;
    for (var i = 0; i < l.length - 1; i++) {
      var a = l[i];
      var b = l[i + 1];
      var dx = b[0] - a[0];
      var dz = b[1] - a[1];
      var t = clamp(((x - a[0]) * dx + (z - a[1]) * dz) / (dx * dx + dz * dz));
      var d = Math.hypot(x - a[0] - dx * t, z - a[1] - dz * t);
      if (d < bd) {
        bd = d;
        best = { d: d, lv: a[2] + (b[2] - a[2]) * t, w: a[3] + (b[3] - a[3]) * t };
      }
    }
  }
  return best;
}

function lakeR(k, x, z) {
  var r = Math.hypot((x - k.x) / k.a, (z - k.z) / k.b);
  return r * (1 + (noise(x / 15 + k.s, z / 15 - k.s) - 0.5) * 0.55);
}

export function ground(x, z) {
  var g = hills(x, z);
  for (var i = 0; i < LAKES.length; i++) {
    var k = LAKES[i];
    var r = lakeR(k, x, z);
    if (r < 1.5) g = Math.min(g, k.lv - 2.4 + smooth(0.3, 1.25, r) * (Math.max(g, k.lv + 0.5) - k.lv + 2.4));
  }
  var s = stream(x, z);
  if (s && s.d < s.w + 14) {
    var u = s.d / s.w;
    var p = s.d < s.w ? s.lv - 1.3 + 1.3 * u * u : s.lv + (s.d - s.w) * 0.5 + (s.d - s.w) * (s.d - s.w) * 0.04;
    g = smin(g, p, 0.7);
  }
  return g - 0.03;
}

// the level of the water that covers a point, or null where there is no pool or stream
export function waterAt(x, z) {
  var s = stream(x, z);
  if (s && s.d < s.w + 5) return s.lv - 0.03;
  for (var i = 0; i < LAKES.length; i++) if (lakeR(LAKES[i], x, z) < 1.7) return LAKES[i].lv - 0.03;
  return null;
}

// how far above the water a point is, large where there is none
export function shore(x, z) {
  var w = waterAt(x, z);
  return w === null ? 99 : ground(x, z) - w;
}

export function onTrack(x, z, m) {
  for (var j = 0; j < TRACKS.length; j++) {
    var l = TRACKS[j].line;
    for (var i = 0; i < l.length; i++) if (Math.hypot(x - l[i][0], z - l[i][1]) < TRACKS[j].w / 2 + m) return true;
  }
  return false;
}
TRACKS.forEach(function (t) { t.line = spline(t.pts, 1.2); });

// the woods that stand close round the store, so the view from the yard always has some
var GROVES = [[-40, -52, 9], [-20, -49, 5], [-4, -47, 5], [14, -50, 7], [34, -54, 10], [55, -46, 9], [-58, -40, 9], [60, -16, 8], [-56, -10, 6], [58, 22, 9], [-60, 30, 8], [-30, 60, 12], [30, 58, 12], [-8, 56, 8]];

// how wooded a place is, 0 to 1
export function forest(x, z) {
  var f = noise(x / 24 + 11, z / 24 - 5) * 0.75 + noise(x / 9, z / 9) * 0.25;
  var d = away(x, z);
  var belt = smooth(3, 8, d) * (1 - smooth(22, 40, d)) * 0.3;
  var g = 0;
  for (var i = 0; i < GROVES.length; i++) {
    var q = GROVES[i];
    g = Math.max(g, 1 - Math.hypot(x - q[0], z - q[1]) / (q[2] * (1 + (noise(x / 5 + i, z / 5) - 0.5) * 0.9)));
  }
  return smooth(0.4, 0.56, f + smooth(-60, -120, z) * 0.18 + belt) + smooth(0, 0.3, g) * (1 - smooth(0.4, 0.56, f + belt));
}
export function meadow(x, z) {
  return smooth(0.5, 0.66, noise(x / 11 + 40, z / 11 + 2));
}

var CONIFER = ['nature/tree_pineTallA*1.7', 'nature/tree_pineTallB*1.5', 'nature/tree_pineTallC*1.6', 'nature/tree_pineTallD*1.5', 'nature/tree_pineSmallB*2.1', 'nature/tree_pineSmallC*2.1', 'nature/tree_pineRoundD*2.4'];
var BROAD = ['nature/tree_default*1.5', 'nature/tree_simple*1.6', 'nature/tree_oak*2', 'nature/tree_tall*1.5', 'nature/tree_fat*2.2'];
var FALL = ['nature/tree_fat_fall*2.2', 'nature/tree_oak_fall*2', 'nature/tree_simple_fall*1.6'];
var LONE = ['nature/tree_oak*2.3', 'nature/tree_plateau*2.3', 'nature/tree_default*1.8'];
var BUSH = ['nature/plant_bush*2.5', 'nature/plant_bushLarge*2.5', 'nature/plant_bushSmall*2.8'];
var CLIFF = ['nature/stone_largeA*2.4', 'nature/stone_largeB*2.4', 'nature/stone_largeC*2.4', 'nature/stone_largeA*1.6'];
var STONE = ['nature/stone_largeA*1.2', 'nature/stone_largeB*1.2', 'nature/stone_largeC*1.2', 'nature/stone_smallA*1.6', 'nature/stone_smallB*1.6'];
var FLOWER = ['nature/flower_redB*1.5', 'nature/flower_yellowB*1.5', 'nature/flower_purpleB*1.5', 'nature/flower_redA*1.5', 'nature/flower_yellowA*1.5', 'nature/flower_purpleA*1.5'];
var GRASS = ['nature/grass_leafs*2', 'nature/grass_large*1.5', 'nature/grass_leafs*1.6'];
var CANOE = 'nature/canoe*2.2';
var REED = ['nature/plant_flatTall*2.2'];
var PAD = ['nature/lily_large*3', 'nature/lily_small*3'];
export var REFS = [[CANOE], CONIFER, BROAD, FALL, LONE, BUSH, CLIFF, STONE, FLOWER, GRASS, REED, PAD];

// Everything that grows or lies about, as [ref, x, z, turn, size, water]. Trees come on a jittered grid, thick where the
// wood is and thin in the meadows; flowers and grass in patches; stones and reeds at the water
export function scenery() {
  var seed = 11;
  function rand() {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 4294967296;
  }
  function pick(l) { return l[Math.floor(rand() * l.length)]; }
  var out = { trees: [], low: [], rocks: [], flowers: [], water: [] };
  var CELL = 3.6;
  function slope(x, z) {
    return Math.hypot(ground(x + 1, z) - ground(x - 1, z), ground(x, z + 1) - ground(x, z - 1)) / 2;
  }
  for (var cx = SEEN[0]; cx < SEEN[1]; cx += CELL) {
    for (var cz = SEEN[2]; cz < SEEN[3]; cz += CELL) {
      var x = cx + rand() * CELL;
      var z = cz + rand() * CELL;
      var d = away(x, z);
      if (d < 3 || shore(x, z) < 1.1 || onTrack(x, z, 2.5)) continue;
      var h = ground(x, z);
      var sl = slope(x, z);
      var f = forest(x, z);
      var near = shore(x, z) < 7 ? 0.35 : 0;
      var turn = rand() * 6.283;
      var k = 0.85 + rand() * 0.5;
      if (sl > 0.7) {
        if (rand() < 0.07) out.rocks.push([pick(CLIFF), x, z, turn, 0.6 + rand() * 0.8]);
        continue;
      }
      if (rand() < f * 0.8 + near * (1 - f)) {
        var high = h > 8 || rand() < 0.2 + 0.4 * smooth(-60, -120, z);
        var ref = high || (f > 0.6 && rand() < 0.3) ? pick(CONIFER) : rand() < 0.04 ? pick(FALL) : pick(BROAD);
        out.trees.push([ref, x, z, turn, k * (1 + h * 0.012), 1]);
        if (rand() < 0.3) out.low.push([pick(BUSH), x + (rand() - 0.5) * 3, z + (rand() - 0.5) * 3, turn, 0.8 + rand() * 0.6]);
      } else if (f < 0.3 && rand() < 0.05 && d > 8) {
        out.trees.push([pick(LONE), x, z, turn, 1 + rand() * 0.35, 1]);
      } else if (f < 0.6 && rand() < 0.45) {
        out.low.push([pick(GRASS), x, z, turn, 0.9 + rand() * 0.9]);
      }
    }
  }
  // patches of flowers in the meadows, one colour mostly, a few of another
  for (var n = 0; n < 3000 && out.flowers.length < 900; n++) {
    var px = SEEN[0] + rand() * (SEEN[1] - SEEN[0]);
    var pz = SEEN[2] + rand() * (SEEN[3] - SEEN[2]);
    if (away(px, pz) < 2.5 || shore(px, pz) < 1.6 || forest(px, pz) > 0.3 || onTrack(px, pz, 2) || slope(px, pz) > 0.5) continue;
    if (meadow(px, pz) < 0.35 && rand() < 0.7) continue;
    var base = pick(FLOWER);
    var rad = 1.6 + rand() * 2.6;
    for (var q = 5 + Math.floor(rand() * 8); q > 0; q--) {
      var a = rand() * 6.283;
      var r = Math.sqrt(rand()) * rad;
      var fx = px + Math.cos(a) * r;
      var fz = pz + Math.sin(a) * r;
      if (shore(fx, fz) < 1.2) continue;
      out.flowers.push([rand() < 0.8 ? base : pick(FLOWER), fx, fz, rand() * 6.283, 0.9 + rand() * 0.5]);
    }
  }
  // stones on the banks and in the shallows, reeds where the bank meets the water, lily pads on the lake
  for (var tries = 0; tries < 12000; tries++) {
    var wx = SEEN[0] + rand() * (SEEN[1] - SEEN[0]);
    var wz = SEEN[2] + rand() * (SEEN[3] - SEEN[2]);
    var s = shore(wx, wz);
    if (s > 3.5 || away(wx, wz) < 5 || onTrack(wx, wz, 2)) continue;
    var lv = waterAt(wx, wz);
    if (s > 0.1 && s < 0.9 && rand() < 0.04) out.rocks.push([pick(STONE), wx, wz, rand() * 6.283, 0.8 + rand() * 1.1]);
    else if (s < 0.1 && s > -0.45 && rand() < 0.012) out.water.push([pick(STONE), wx, wz, rand() * 6.283, 0.8 + rand() * 1.1, lv]);
    else if (s > -0.2 && s < 0.5 && rand() < 0.03) {
      for (var r2 = 0; r2 < 4; r2++) out.water.push([pick(REED), wx + (rand() - 0.5) * 1.6, wz + (rand() - 0.5) * 1.6, rand() * 6.283, 0.8 + rand() * 0.7, null]);
    } else if (s < -0.5 && s > -1.5 && rand() < 0.012) {
      for (var p = 0; p < 3; p++) out.water.push([pick(PAD), wx + (rand() - 0.5) * 2.2, wz + (rand() - 0.5) * 2.2, rand() * 6.283, 0.9 + rand() * 0.6, lv + 0.02]);
    }
  }
  // a canoe out on the lake and one pulled up on the sand
  out.water.push([CANOE, -4, -64, 0.6, 1, waterAt(-4, -64) + 0.02]);
  for (var cz = -46; cz > -62 && shore(-26, cz) > 0.45; cz -= 0.5);
  out.low.push([CANOE, -26, cz + 0.3, 1.2, 1]);
  return out;
}
