// The country round the store: ground height, lakes, rivers, tracks and where the trees, rocks and flowers stand.
// Heights are above the lot's lawn. The lot, the street and the yards stay flat; the hills grow out from there.
export var DOM = [-150, 150, -150, 64];
// the camera never gets further out than this, so nothing grows past it
var LAWNS = [[27.8, 47.5, -40, 8], [-47.5, -28, -40, 8]];
var SEEN = [-72, 72, -84, 50];
// the store and its drives, the street, and the houses and gardens across it; the lawns beyond the drives may roll
export var FLAT = [[-31, 31, -43, 10], [-50, 50, 2, 44], [-80, 80, 2, 22]];

export var LAKES = [
  { x: -6, z: -57, a: 25, b: 9, lv: -1, s: 3 },
  { x: 44, z: -54, a: 9, b: 6, lv: -0.8, s: 8 }
];

// control points run downhill; drop is the least the water falls per unit, floor where it stops. A stream with into
// runs down to that lake; cut gives it the sheer rock walls of a canyon
var STREAMS = [
  { pts: [[44, -112], [34, -94], [26, -78], [20, -66], [12, -58], [4, -56]], w0: 2.2, w1: 4.2, drop: 0.03, end: 0, into: 0 },
  { pts: [[-24, -58], [-36, -54], [-47, -51], [-56, -43], [-58, -28], [-57, -6], [-57, 12], [-57, 34], [-66, 54], [-84, 70]], w0: 4.2, w1: 4.8, drop: 0.004, end: -2.4 },
  { pts: [[92, -96], [80, -84], [70, -72], [62, -62], [55, -57], [49, -55]], w0: 1.6, w1: 2.6, drop: 0.05, end: 0, into: 1, cut: 1 }
];

// the dirt tracks the street turns into where it leaves the flat ground, and the bridge over the stream on the west
export var TRACKS = [
  { pts: [[76, 12], [90, 13], [102, 10], [112, 2], [118, -8]], w: 2.6 },
  { pts: [[-76, 12], [-90, 14], [-102, 20], [-110, 30], [-114, 42]], w: 2.6 }
];
export var BRIDGE = { x: -57, z: 12 };
// the lake house: a level pad on the south shore behind the back lot, the door to the lot and its dock out into the lake
export var CABIN = { x: 11, z: -46, h: 0.9, r: 4.5 };

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

var PEAKS = [[-10, -72, 12, 14], [16, -70, 11, 12], [-34, -68, 11, 12], [40, -66, 10, 10], [-4, -86, 16, 20], [26, -82, 14, 16], [-32, -80, 14, 15], [50, -66, 16, 14], [-62, -70, 16, 14], [78, -20, 14, 10], [-80, -34, 14, 12], [-70, 80, 20, 8], [-30, -122, 30, 26], [30, -126, 30, 24],
  // the ridges either side of the store, and the high ground the east canyon cuts through
  [-68, -22, 10, 13], [-72, 2, 11, 11], [-66, -44, 9, 12], [60, -22, 9, 12], [62, -2, 9, 10], [64, -40, 8, 12],
  [66, -52, 9, 15], [58, -74, 9, 17], [78, -62, 10, 19], [84, -80, 11, 18]];

function hills(x, z) {
  var d = away(x, z);
  var h = 0.8 + noise(x / 30 + 3, z / 30) * 11 + noise(x / 14, z / 14 + 9) * 4 + noise(x / 7, z / 7 + 4) * 1.4;
  h += smooth(-60, -95, z) * 9 + smooth(8, 44, d) * 5 + Math.max(0, d - 42) * 0.2;
  for (var i = 0; i < PEAKS.length; i++) {
    var p = PEAKS[i];
    h += p[3] * Math.exp(-(((x - p[0]) * (x - p[0]) + (z - p[1]) * (z - p[1])) / (p[2] * p[2])));
  }
  var m = 1 - Math.abs(noise(x / 34 + 20, z / 34 + 7) * 2 - 1);
  h += smooth(-84, -140, z) * (8 + m * m * 14) + smooth(70, 140, Math.abs(x)) * m * m * 10;
  return smooth(0, 10, d) * h;
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
STREAMS.forEach(function (s) {
  s.line = spline(s.pts);
  var n = s.line.length;
  var lv = LAKES[s.into || 0].lv;
  var r = s.into !== undefined ? 99 : lv;
  var rem = 0;
  s.line.forEach(function (p, i) { if (i) rem += Math.hypot(p[0] - s.line[i - 1][0], p[1] - s.line[i - 1][1]); });
  s.line.forEach(function (p, i) {
    var step = i ? Math.hypot(p[0] - s.line[i - 1][0], p[1] - s.line[i - 1][1]) : 0;
    rem -= step;
    var h = hills(p[0], p[1]) - 1.2;
    r = Math.min(r - s.drop * step, h);
    if (s.into !== undefined) r = Math.max(Math.min(r, lv + 0.06 * rem), lv);
    else r = Math.max(r, s.end);
    p[2] = r;
    p[3] = s.w0 + (s.w1 - s.w0) * i / (n - 1);
  });
});

// nearest point of one stream: distance to its middle, the width and the level there
function streamAt(si, x, z) {
  var best = null;
  var bd = 1e9;
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
      best = { d: d, lv: a[2] + (b[2] - a[2]) * t, w: a[3] + (b[3] - a[3]) * t, cut: STREAMS[si].cut };
    }
  }
  return best;
}

function stream(x, z) {
  var best = null;
  for (var si = 0; si < STREAMS.length; si++) {
    var s = streamAt(si, x, z);
    if (!best || s.d < best.d) best = s;
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
  // every stream carves its own valley, with no cut-off distance, so the sides rise until they meet the hills instead of
  // stepping back up in a wall
  for (var si = 0; si < STREAMS.length; si++) {
    var s = streamAt(si, x, z);
    var u = s.d / s.w;
    var e = s.d - s.w;
    // a canyon keeps a narrow bank either side of the water, then its walls go up almost sheer
    var p = s.d < s.w ? s.lv - 1.3 + 1.3 * u * u : s.cut ? s.lv + 0.3 + Math.max(0, e - 2.5) * 3.2 : s.lv + e * 0.5 + e * e * 0.04;
    g = smin(g, p, s.cut ? 0.4 : 0.7);
  }
  var pad = smooth(CABIN.r + 4, CABIN.r, Math.hypot(x - CABIN.x, (z - CABIN.z) * 1.3));
  g += (CABIN.h - g) * pad;
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
var GROVES = [[-34, -48, 11], [-18, -45, 6], [-26, -46, 7], [-4, -48, 6], [8, -45, 7], [24, -48, 11], [27, -45, 6], [38, -55, 14], [-44, -64, 13], [48, -52, 13], [-14, -72, 14], [14, -74, 13], [66, -10, 11], [70, 20, 11], [-70, -8, 8], [-70, 28, 11], [-30, 60, 17], [30, 58, 17], [-8, 56, 11]];

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
  return smooth(0.28, 0.44, f + smooth(-60, -120, z) * 0.18 + belt) + smooth(0, 0.3, g) * (1 - smooth(0.28, 0.44, f + belt));
}
export function meadow(x, z) {
  return smooth(0.5, 0.66, noise(x / 11 + 40, z / 11 + 2));
}

// the same toon trees and plants as the yards, a size up out here
var CONIFER = ['flora/kk-tree-4-a%forest=9cc79a*0.7', 'flora/kk-tree-4-b%forest=9cc79a*0.56', 'flora/kk-tree-4-a*0.62'];
var BROAD = ['flora/kk-tree-1-a*0.87', 'flora/kk-tree-1-b*0.74', 'flora/kk-tree-3-a*1.05', 'flora/kk-tree-3-b*0.84',
  'flora/kk-tree-1-a%forest=b9d8a2*0.87', 'flora/kk-tree-1-b%forest=b9d8a2*0.74', 'flora/kk-tree-3-a%forest=b9d8a2*1.05'];
var FALL = ['flora/kk-tree-1-a%forest=ffb48a*0.87', 'flora/kk-tree-3-b%forest=ffc47a*0.84'];
var LONE = ['flora/kk-tree-3-b*1', 'flora/kk-tree-1-b*0.9', 'flora/kk-tree-3-a*1.2'];
var BUSH = ['flora/kk-bush-1-b*1.4', 'flora/kk-bush-3-a*1.4', 'flora/kk-bush-3-b*0.9', 'flora/kk-bush-3-c*0.6', 'flora/kk-bush-4-e*0.55', 'flora/bush-flowers%Bush_Leaves=b8cc98*0.75'];
var CLIFF = ['flora/kk-rock-3-a*1.6', 'flora/kk-rock-3-e*1.3', 'flora/kk-rock-1-e*1.3'];
var STONE = ['flora/kk-rock-1-a*0.9', 'flora/kk-rock-1-e*0.6', 'flora/kk-rock-3-a*0.7'];
var FLOWER = ['flora/flower-2-clump*0.8', 'flora/flower-3-clump*0.8', 'flora/flower-4-clump*0.8', 'flora/flower-5-clump*0.8'];
var GRASS = ['flora/fern-1*0.22', 'flora/fern-1*0.18'];
var CANOE = 'nature/canoe*2.2';
var REED = ['nature/plant_flatTall*2.2'];
var PAD = ['nature/lily_large*3', 'nature/lily_small*3'];
// big boulders in a few heaps where the camera looks: lake shores, the hills beside the store, the canyon's mouth
var BOULDER = ['flora/kk-rock-3-e*1.4', 'flora/kk-rock-1-e*1.5', 'flora/kk-rock-3-a*1.6'];
export var OUTCROPS = [[-36, -46, 3], [20, -50, 3], [40, -22, 4], [39, 3, 2], [-40, -26, 4], [-41, -5, 2], [52, -61, 3], [-16, -67, 3], [27, -63, 2]];
export function nearRock(x, z, m) { return OUTCROPS.some(function (o) { return Math.hypot(x - o[0], z - o[1]) < m; }); }
export var REFS = [BOULDER, [CANOE], CONIFER, BROAD, FALL, LONE, BUSH, CLIFF, STONE, FLOWER, GRASS, REED, PAD];

// Everything that grows or lies about, as [ref, x, z, turn, size, water]. Trees come on a jittered grid, thick where the
// wood is and thin in the meadows; flowers and grass in patches; stones and reeds at the water
// blocked says where something already stands on the lawns
var LAMPS = [[-26.6, 0], [-26.6, -14]];
function inYards(x, z) { return x > -48 && x < 48 && z > -42 && z < 44; }
// the cabin's yard and the water round its dock stay clear
function byCabin(x, z, m) { return Math.hypot(x - CABIN.x, z - CABIN.z) < m || Math.hypot(x - CABIN.x + 2, z + 53) < m - 3; }
export function scenery(blocked) {
  var seed = 11;
  function rand() {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 4294967296;
  }
  function pick(l) { return l[Math.floor(rand() * l.length)]; }
  var out = { trees: [], low: [], rocks: [], flowers: [], water: [] };
  var CELL = 2.9;
  function slope(x, z) {
    return Math.hypot(ground(x + 1, z) - ground(x - 1, z), ground(x, z + 1) - ground(x, z - 1)) / 2;
  }
  for (var cx = SEEN[0]; cx < SEEN[1]; cx += CELL) {
    for (var cz = SEEN[2]; cz < SEEN[3]; cz += CELL) {
      var x = cx + rand() * CELL;
      var z = cz + rand() * CELL;
      var d = away(x, z);
      // the yards keep the woods plan.js gives them
      if (d < 1.5 || inYards(x, z) || byCabin(x, z, 9) || nearRock(x, z, 5) || shore(x, z) < 1.1 || onTrack(x, z, 2.5)) continue;
      var h = ground(x, z);
      var sl = slope(x, z);
      var f = forest(x, z);
      var near = shore(x, z) < 7 ? 0.35 : 0;
      var turn = rand() * 6.283;
      var k = 0.8 + rand() * 0.5 + (rand() < 0.15 ? 0.6 : 0);
      if (sl > 1.1) {
        if (rand() < 0.07) out.rocks.push([pick(CLIFF), x, z, turn, 0.6 + rand() * 0.8]);
        continue;
      }
      // woods close up into a canopy, their edges break up into bushes and the odd sapling, the meadows stay open
      var wood = smooth(0.3, 0.62, f);
      // far out, where only the zoomed-out view reaches, the woods take fewer and bigger trees
      var far = smooth(14, 40, d);
      if (rand() < (wood * 0.95 + near * (1 - f)) * (1 - 0.35 * far)) {
        var high = h > 8 || rand() < 0.2 + 0.4 * smooth(-60, -120, z);
        var ref = high || (f > 0.6 && rand() < 0.3) ? pick(CONIFER) : rand() < 0.05 ? pick(FALL) : pick(BROAD);
        out.trees.push([ref, x, z, turn, k * (1 + h * 0.012) * (0.75 + 0.35 * wood) * (1 + 0.35 * far), 1]);
        for (var bn = rand() < 0.75 - 0.4 * far ? 1 + Math.floor(rand() * 2) : 0; bn > 0; bn--) out.low.push([pick(BUSH), x + (rand() - 0.5) * 3, z + (rand() - 0.5) * 3, turn, 0.9 + rand() * 0.8]);
      } else if (f > 0.15 && f < 0.45 && rand() < 0.55) {
        for (var en = 1 + Math.floor(rand() * 3); en > 0; en--) out.low.push([pick(BUSH), x + (rand() - 0.5) * 2.4, z + (rand() - 0.5) * 2.4, turn, 0.8 + rand() * 0.9]);
      } else if (f < 0.3 && rand() < 0.03 && d > 8) {
        out.trees.push([pick(LONE), x, z, turn, 1 + rand() * 0.35, 1]);
      } else if (f < 0.6 && rand() < 0.12) {
        out.low.push([pick(GRASS), x, z, turn, 0.9 + rand() * 0.9]);
      }
    }
  }
  // patches of flowers in the meadows near the lot, one colour mostly, a few of another. Tight and dense, so a patch
  // still reads from the far view
  for (var n = 0; n < 6000 && out.flowers.length < 150; n++) {
    var px = SEEN[0] + rand() * (SEEN[1] - SEEN[0]);
    var pz = SEEN[2] + rand() * (SEEN[3] - SEEN[2]);
    // half of them in the strip of meadow right behind the lot, the only ground the top bars leave in view when zoomed out
    if (n % 2) {
      px = -36 + rand() * 72;
      pz = -50 + rand() * 6;
    }
    if (away(px, pz) < 2.5 || inYards(px, pz) || byCabin(px, pz, 8) || away(px, pz) > 36 || shore(px, pz) < 1.6 || forest(px, pz) > 0.3 || onTrack(px, pz, 2) || slope(px, pz) > 0.5) continue;
    if (meadow(px, pz) < 0.35 && rand() < 0.7) continue;
    var base = pick(FLOWER);
    var rad = 0.9 + rand() * 1.1;
    for (var q = 4 + Math.floor(rand() * 3); q > 0; q--) {
      var a = rand() * 6.283;
      var r = Math.sqrt(rand()) * rad;
      var fx = px + Math.cos(a) * r;
      var fz = pz + Math.sin(a) * r;
      if (shore(fx, fz) < 1.2) continue;
      out.flowers.push([rand() < 0.85 ? base : pick(FLOWER), fx, fz, rand() * 6.283, 1.2 + rand() * 0.6]);
    }
  }
  // stones on the banks and in the shallows, reeds where the bank meets the water, lily pads on the lake
  for (var tries = 0; tries < 12000; tries++) {
    var wx = SEEN[0] + rand() * (SEEN[1] - SEEN[0]);
    var wz = SEEN[2] + rand() * (SEEN[3] - SEEN[2]);
    var s = shore(wx, wz);
    if (s > 3.5 || away(wx, wz) < 5 || byCabin(wx, wz, 7) || onTrack(wx, wz, 2)) continue;
    var lv = waterAt(wx, wz);
    if (s > 0.1 && s < 0.9 && rand() < 0.09) out.rocks.push([pick(STONE), wx, wz, rand() * 6.283, 0.8 + rand() * 1.1]);
    else if (s < 0.1 && s > -0.45 && rand() < 0.012) out.water.push([pick(STONE), wx, wz, rand() * 6.283, 0.8 + rand() * 1.1, lv]);
    else if (s > -0.2 && s < 0.5 && rand() < 0.07) {
      for (var r2 = 0; r2 < 6; r2++) out.water.push([pick(REED), wx + (rand() - 0.5) * 1.6, wz + (rand() - 0.5) * 1.6, rand() * 6.283, 0.8 + rand() * 0.7, null]);
    } else if (s < -0.5 && s > -1.5 && rand() < 0.012) {
      for (var p = 0; p < 3; p++) out.water.push([pick(PAD), wx + (rand() - 0.5) * 2.2, wz + (rand() - 0.5) * 2.2, rand() * 6.283, 0.9 + rand() * 0.6, lv + 0.02]);
    }
  }
  // the side and back lawns keep to bushes and a few flower patches
  LAWNS.forEach(function (r) {
    var w = r[1] - r[0];
    var d = r[3] - r[2];
    for (var n2 = Math.round(w * d / 90); n2 > 0; n2--) {
      var lx = r[0] + 1 + rand() * (w - 2);
      var lz = r[2] + 1 + rand() * (d - 2);
      var bl = rand();
      if (blocked(lx, lz) || LAMPS.some(function (q) { return Math.hypot(lx - q[0], lz - q[1]) < 3.5; })) continue;
      if (bl < 0.5) for (var m = 3; m > 0; m--) out.low.push([pick(BUSH), lx + (rand() - 0.5) * 3, lz + (rand() - 0.5) * 3, rand() * 6.283, 1 + rand() * 0.7]);
      else if (bl < 0.8) for (var q2 = 3; q2 > 0; q2--) out.flowers.push([pick(FLOWER), lx + (rand() - 0.5) * 2.4, lz + (rand() - 0.5) * 2.4, rand() * 6.283, 1.2 + rand() * 0.6]);
    }
  });
  // a tree line along the back of the lot, broken where the cabin's yard opens to it
  for (var tx = -30; tx < 31; tx += 2.2 + rand() * 1.2) {
    var tz = -41.8 - rand() * 2.2;
    if (byCabin(tx, tz, 7.5) || nearRock(tx, tz, 4) || shore(tx, tz) < 0.5) continue;
    if (rand() < 0.7) out.trees.push([rand() < 0.4 ? pick(CONIFER) : pick(BROAD), tx, tz, rand() * 6.283, 0.8 + rand() * 0.35, 1]);
    else for (var tb = 2; tb > 0; tb--) out.low.push([pick(BUSH), tx + (rand() - 0.5) * 2, tz + (rand() - 0.5) * 2, rand() * 6.283, 0.9 + rand() * 0.6]);
  }
  OUTCROPS.forEach(function (o) {
    for (var bi = 0; bi < o[2]; bi++) {
      var ba = rand() * 6.283;
      var br = bi ? 1.6 + rand() * 1.6 : 0;
      var bx = o[0] + Math.cos(ba) * br;
      var bz = o[1] + Math.sin(ba) * br;
      if (shore(bx, bz) < 0.4) continue;
      out.rocks.push([pick(BOULDER), bx, bz, rand() * 6.283, bi ? 0.8 + rand() * 0.7 : 1.7 + rand() * 0.5]);
    }
  });
  // one canoe pulled up on the sand; the one out on the lake drifts, and the view moves it
  for (var cz = -46; cz > -62 && shore(-26, cz) > 0.45; cz -= 0.5);
  out.low.push([CANOE, -26, cz + 0.3, 1.2, 1]);
  return out;
}
