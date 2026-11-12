import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

// The town is laid on a grid of 1 unit tiles (x east, z south). Streets run on tile centres; the sidewalk is the ring of
// half tiles around the road and a lot starts at its edge. Models face +z, so a building north of a street is turned 0 and
// one south of it half a circle.

var PAVE = 0xc9d0f0;
var ASPH = 0x5f6478;
export var LAWN = 0x93cc78;
export var DIRT = 0xb9915f;
export var PLAZA = 0xd9d3c6;

var DIRS = { N: [0, -1], E: [1, 0], S: [0, 1], W: [-1, 0] };
var ORDER = ['N', 'E', 'S', 'W'];
var FACE = { S: 0, E: Math.PI / 2, N: Math.PI, W: -Math.PI / 2 };

// small seeded generator so the town is the same on every visit
export function seeded(n) {
  return function () {
    n |= 0;
    n = (n + 0x6d2b79f5) | 0;
    var t = Math.imul(n ^ (n >>> 15), 1 | n);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// the side a model's side ends up on when it is turned k quarter turns about +y
function turn(d, k) {
  var v = DIRS[d];
  for (var i = 0; i < k; i++) v = [v[1], -v[0]];
  return v[0] === 0 ? (v[1] < 0 ? 'N' : 'S') : (v[0] > 0 ? 'E' : 'W');
}

var CHUNK = 10;

// The town grows out of the ground round its businesses. Each seed is a business: x, z, the radius built so far and a
// slower radius behind it; what lies between the two is still rising. Seeds only build their own district, roads are
// built by any seed a little ahead of the houses, and district WILD (the land round the town) is always there.
export var SEEDS = 16;
export var WILD = 99;
export var ROAD = 9;
export var GROW = {
  seed: { value: Array.from({ length: SEEDS }, function () { return new THREE.Vector4(0, 0, -1, -1); }) },
  dist: { value: new Float32Array(SEEDS) }
};
var GLSL = [
  'float gk = aD > 50.0 ? 1.0 : 0.0;',
  'for (int i = 0; i < ' + SEEDS + '; i++) {',
  '  vec4 s = uSeed[i];',
  '  if (gk >= 1.0 || s.z <= 0.0) continue;',
  '  if (aD < 8.5 && abs(uDist[i] - aD) > 0.5) continue;',
  '  float d = distance(aC, s.xy) - (aD > 8.5 ? 2.0 : 0.0);',
  '  gk = max(gk, d <= s.w ? 1.0 : (d < s.z ? (s.z - d) / max(s.z - s.w, 0.001) : 0.0));',
  '}',
  'gk = smoothstep(0.0, 1.0, gk);',
  'transformed.y = transformed.y * gk - (gk <= 0.0 ? 0.4 : 0.0);'
].join('\n');

function growPatch(mat) {
  mat.onBeforeCompile = function (sh) {
    sh.uniforms.uSeed = GROW.seed;
    sh.uniforms.uDist = GROW.dist;
    sh.vertexShader = 'attribute vec2 aC;\nattribute float aD;\nuniform vec4 uSeed[' + SEEDS + '];\nuniform float uDist[' + SEEDS + '];\n' +
      sh.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\n' + GLSL);
  };
  mat.customProgramCacheKey = function () { return 'grow'; };
  return mat;
}
var growDepth = growPatch(new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking }));

export function newCity(lib) {
  var rng = seeded(11);
  var batches = {};
  var lodBatches = {};
  var lowBatches = {};
  var flat = [];
  var claims = [];
  var warns = [];
  var tiles = {};
  var roadCells = {};
  var green = {};
  var walkCells = {};
  var special = {};
  var arcs = [];
  var city = { root: new THREE.Group(), rng: rng, warns: warns, tiles: tiles, biz: {}, crossings: [], region: function () { return 1; } };
  // the piece being put: every part of one model rises together, from the middle of its footprint
  var curC = null;
  var curKind = 'thing';

  function warn(msg) {
    warns.push(msg);
  }

  function rect(m, x, z, rot, s) {
    var c = Math.cos(rot);
    var sn = Math.sin(rot);
    var f = { x0: 1e9, x1: -1e9, z0: 1e9, z1: -1e9 };
    [m.box.x0, m.box.x1].forEach(function (px) {
      [m.box.z0, m.box.z1].forEach(function (pz) {
        var wx = x + s * (px * c + pz * sn);
        var wz = z + s * (-px * sn + pz * c);
        f.x0 = Math.min(f.x0, wx);
        f.x1 = Math.max(f.x1, wx);
        f.z0 = Math.min(f.z0, wz);
        f.z1 = Math.max(f.z1, wz);
      });
    });
    return f;
  }

  function matrix(x, y, z, rot, s) {
    return new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), rot),
      new THREE.Vector3(s, s, s));
  }

  // adds a model to the merged static meshes at its own origin
  function put(ref, x, z, rot, o) {
    o = o || {};
    var s = o.s || 1;
    var m = lib.model(ref);
    var mat = matrix(x, o.y || 0, z, rot || 0, s);
    var f = rect(m, x, z, rot || 0, s);
    curC = [(f.x0 + f.x1) / 2, (f.z0 + f.z1) / 2];
    m.parts.forEach(function (p) {
      var g = p.geom.clone();
      g.applyMatrix4(mat);
      var mt = o.tint ? tintMat(p.mat, o.tint) : p.mat;
      if (o.lod) {
        var lk = mt.uuid + '|' + chunkOf(g);
        var lb = lodBatches[lk] || (lodBatches[lk] = { mat: mt, geoms: [] });
        lb.geoms.push(mark(g));
      } else addGeom(mt, g);
    });
    if (o.lod) lowModel(m, mat, o.lod);
    curC = null;
    return f;
  }

  // a clone shares its source's userData, so each copy gets its own
  function mark(g) {
    g.userData = { c: curC, k: curKind };
    return g;
  }

  // where the origin goes so that the middle of the front face lands on (px, pz)
  function origin(m, px, pz, rot, s) {
    var cx = (m.box.x0 + m.box.x1) / 2;
    var c = Math.cos(rot);
    var sn = Math.sin(rot);
    return [px - s * (cx * c + m.box.z1 * sn), pz - s * (-cx * sn + m.box.z1 * c)];
  }

  function overlap(a, b, e) {
    return a.x0 < b.x1 - e && a.x1 > b.x0 + e && a.z0 < b.z1 - e && a.z1 > b.z0 + e;
  }

  function cellsOver(f, into, minArea) {
    for (var ix = Math.floor(f.x0 * 2); ix < Math.ceil(f.x1 * 2); ix++) {
      for (var iz = Math.floor(f.z0 * 2); iz < Math.ceil(f.z1 * 2); iz++) {
        var ox = Math.min(f.x1, ix / 2 + 0.5) - Math.max(f.x0, ix / 2);
        var oz = Math.min(f.z1, iz / 2 + 0.5) - Math.max(f.z0, iz / 2);
        if (ox * oz > minArea && into[ix + ',' + iz]) return true;
      }
    }
    return false;
  }

  // a footprint is claimed once; it may not cross a road, a sidewalk or anything claimed before. walk: may stand on a sidewalk
  function claim(f, tag, walk) {
    if (cellsOver(f, roadCells, 0.03)) warn(tag + ' is on the road at ' + f.x0.toFixed(2) + ',' + f.z0.toFixed(2));
    else if (!walk && cellsOver(f, walkCells, 0.03)) warn(tag + ' is on a sidewalk at ' + f.x0.toFixed(2) + ',' + f.z0.toFixed(2));
    for (var i = 0; i < claims.length; i++) {
      if (overlap(f, claims[i], 0.02)) warn(tag + ' overlaps ' + claims[i].tag + ' at ' + f.x0.toFixed(2) + ',' + f.z0.toFixed(2));
    }
    f.tag = tag;
    claims.push(f);
    return f;
  }

  function slab(x0, z0, x1, z1, col, y, h) {
    flat.push({ x0: x0, z0: z0, x1: x1, z1: z1, col: col, y: y === undefined ? 0.012 : y, h: h || 0.004, k: curKind === 'road' ? 'road' : 'ground' });
  }

  // a model standing on its own spot, claimed with a footprint a little smaller than its box
  function free(f, walk) {
    if (cellsOver(f, roadCells, 0.0001)) return false;
    if (!walk && cellsOver(f, walkCells, 0.0001)) return false;
    for (var i = 0; i < claims.length; i++) if (overlap(f, claims[i], 0.005)) return false;
    return true;
  }

  // optional furniture: placed only where nothing else stands
  function tryProp(ref, x, z, rot, o) {
    o = o || {};
    var m = lib.model(ref);
    var f = rect(m, x, z, rot || 0, o.s || 1);
    if (!free(f, o.walk)) return null;
    if (o.onWalk && !cellsOver({ x0: x - 0.01, x1: x + 0.01, z0: z - 0.01, z1: z + 0.01 }, walkCells, 0)) return null;
    put(ref, x, z, rot, o);
    f.tag = o.tag || ref;
    claims.push(f);
    return f;
  }

  var solidMats = {};
  function solid(x, y, z, w, h, d, col) {
    var g = new THREE.BoxGeometry(w, h, d);
    g.translate(x, y + h / 2, z);
    var m = solidMats[col] || (solidMats[col] = new THREE.MeshLambertMaterial({ color: col }));
    addGeom(m, g);
  }

  // the simple stand-in shown at overview zoom: a walls box and a roof box in the given colours
  function lowModel(m, mat, lod) {
    var b = m.box;
    var h = b.h;
    var roof = lod.roof === undefined ? 0x50556a : lod.roof;
    var rf = lod.rf === undefined ? 0.12 : lod.rf;
    var part = function (hh, y, col) {
      var g = new THREE.BoxGeometry(b.x1 - b.x0, hh, b.z1 - b.z0);
      g.translate((b.x0 + b.x1) / 2, y + hh / 2, (b.z0 + b.z1) / 2);
      g.applyMatrix4(mat);
      var mt = solidMats[col] || (solidMats[col] = new THREE.MeshLambertMaterial({ color: col }));
      var lb = lowBatches[mt.uuid] || (lowBatches[mt.uuid] = { mat: mt, geoms: [] });
      lb.geoms.push(mark(g));
    };
    part(h * (1 - rf), 0, lod.wall);
    part(h * rf, h * (1 - rf), roof);
  }

  var tints = {};
  function tintMat(mat, tint) {
    var k = mat.uuid + tint;
    if (!tints[k]) tints[k] = new THREE.MeshLambertMaterial({ map: mat.map, color: tint, emissive: new THREE.Color(tint).multiplyScalar(0.1) });
    return tints[k];
  }
  // static pieces are merged per material and per square of CHUNK tiles, so frustum culling can drop what is off screen
  function chunkOf(g) {
    g.computeBoundingBox();
    var b = g.boundingBox;
    return Math.floor((b.min.x + b.max.x) / 2 / CHUNK) + ',' + Math.floor((b.min.z + b.max.z) / 2 / CHUNK);
  }
  function addGeom(mat, g) {
    var k = mat.uuid + '|' + chunkOf(g);
    var b = batches[k] || (batches[k] = { mat: mat, geoms: [] });
    b.geoms.push(mark(g));
  }
  // a block with its own transform (tilted awnings and the like)
  function solidM(w, h, d, col, m) {
    var g = new THREE.BoxGeometry(w, h, d);
    g.applyMatrix4(m);
    var mt = solidMats[col] || (solidMats[col] = new THREE.MeshLambertMaterial({ color: col }));
    addGeom(mt, g);
  }

  // a plain coloured block placed only where nothing stands
  function boxProp(x, z, w, h, d, col, tag, walk) {
    var f = { x0: x - w / 2, x1: x + w / 2, z0: z - d / 2, z1: z + d / 2 };
    if (!free(f, walk)) return null;
    solid(x, 0, z, w, h, d, col);
    f.tag = tag;
    claims.push(f);
    return f;
  }

  function tile(x, z, piece) {
    tiles[x + ',' + z] = { x: x, z: z, piece: piece };
  }
  function cellsOf(x0, z0, x1, z1, into) {
    for (var ix = Math.round(x0 * 2); ix < Math.round(x1 * 2); ix++) {
      for (var iz = Math.round(z0 * 2); iz < Math.round(z1 * 2); iz++) into[ix + ',' + iz] = 1;
    }
  }
  function hline(z, x0, x1) {
    for (var x = x0; x <= x1; x++) tile(x, z);
  }
  function vline(x, z0, z1) {
    for (var z = z0; z <= z1; z++) tile(x, z);
  }
  function greenRect(x0, z0, x1, z1) {
    cellsOf(x0, z0, x1, z1, green);
  }

  // a big piece owns several tiles; ports are the plain tiles that may connect to it
  function big(piece, cx, cz, rot, w, ports) {
    var h = w / 2;
    for (var x = cx - h + 0.5; x < cx + h; x++) {
      for (var z = cz - h + 0.5; z < cz + h; z++) special[x + ',' + z] = { ports: ports };
    }
    tiles['big' + cx + ',' + cz] = { x: cx, z: cz, piece: piece, rot: rot, big: w };
  }

  function connected(x, z) {
    var set = {};
    ORDER.forEach(function (d) {
      var k = (x + DIRS[d][0]) + ',' + (z + DIRS[d][1]);
      if (special[k]) {
        if (special[k].ports.indexOf(x + ',' + z) >= 0) set[d] = 1;
      } else if (tiles[k]) set[d] = 1;
    });
    return set;
  }

  var BASE = { 'road-straight': 'EW', 'road-intersection': 'EWS', 'road-crossroad': 'NESW', 'road-bend-sidewalk': 'WS', 'road-end': 'E', 'road-end-round': 'E' };

  function pickPiece(t) {
    if (t.piece === 'road-straight') return { name: t.piece, rot: 0 };
    var c = connected(t.x, t.z);
    var n = Object.keys(c).length;
    var name;
    if (t.piece) name = t.piece;
    else if (n >= 4) name = 'road-crossroad';
    else if (n === 3) name = 'road-intersection';
    else if (n === 2) name = (c.N && c.S) || (c.E && c.W) ? 'road-straight' : 'road-bend-sidewalk';
    else name = 'road-end';
    var want = ORDER.filter(function (d) { return c[d]; }).sort().join('');
    for (var k = 0; k < 4; k++) {
      var open = BASE[name].split('').map(function (d) { return turn(d, k); }).sort().join('');
      if (open === want) return { name: name, rot: k * Math.PI / 2 };
      if (name.indexOf('road-end') === 0 && c[turn('E', k)]) return { name: name, rot: k * Math.PI / 2 };
    }
    warn('road piece at ' + t.x + ',' + t.z + ' has no fit for ' + want);
    return { name: name, rot: 0 };
  }

  // places the road pieces; stripes mark the first tile of every leg that meets a junction
  function placeRoads(noStripe) {
    curKind = 'road';
    for (var k in tiles) if (!tiles[k].big) tiles[k].pick = pickPiece(tiles[k]);
    for (var j in tiles) {
      var tj = tiles[j];
      if (tj.big || (tj.pick.name !== 'road-crossroad' && tj.pick.name !== 'road-intersection')) continue;
      ORDER.forEach(function (d) {
        var n = tiles[(tj.x + DIRS[d][0]) + ',' + (tj.z + DIRS[d][1])];
        if (!n || n.big || n.pick.name !== 'road-straight' || (noStripe && noStripe(n.x, n.z))) return;
        n.pick = { name: 'road-crossing', rot: n.pick.rot };
        city.crossings.push({ x: n.x, z: n.z, across: n.pick.rot === 0 || Math.abs(n.pick.rot - Math.PI) < 0.01 ? 'z' : 'x' });
      });
    }
    for (var q in tiles) {
      var t = tiles[q];
      var h = t.big ? t.big / 2 : 0.5;
      var name = t.big ? t.piece : t.pick.name;
      var rot = t.big ? t.rot * Math.PI / 2 : t.pick.rot;
      put('roads/' + name, t.x, t.z, rot);
      cellsOf(t.x - h, t.z - h, t.x + h, t.z + h, roadCells);
      slab(t.x - h, t.z - h, t.x + h, t.z + h, PAVE, 0, 0.004);
      if (name === 'road-curve') {
        // the ground inside the bend is lawn, the rest of the tile is pavement
        var k = Math.round(rot / (Math.PI / 2));
        var a = DIRS[turn('W', k)];
        var b = DIRS[turn('S', k)];
        var cx = t.x + (a[0] + b[0]) * h;
        var cz = t.z + (a[1] + b[1]) * h;
        slab(Math.min(cx, cx - (a[0] + b[0]) * 1.0), Math.min(cz, cz - (a[1] + b[1]) * 1.0), Math.max(cx, cx - (a[0] + b[0]) * 1.0),
          Math.max(cz, cz - (a[1] + b[1]) * 1.0), 0x93cc78, 0.004, 0.004);
      }
    }
    curKind = 'thing';
  }

  // a curved road drawn in the style of the kit: asphalt, a pale kerb each side, a dashed line. Angles run anticlockwise
  // on the map (0 is east, 90 north); r is the centre line, the road is one tile wide.
  function arcRoad(cx, cz, r, a0, a1) {
    arcs.push({ cx: cx, cz: cz, r: r, a0: a0, a1: a1 });
    curKind = 'road';
    var A0 = a0 * Math.PI / 180;
    var A1 = (a1 - a0) * Math.PI / 180;
    var ring = function (ri, ro, from, len, y, col) {
      var g = new THREE.RingGeometry(ri, ro, Math.max(2, Math.ceil(len * 14)), 1, from, len);
      g.rotateX(-Math.PI / 2);
      g.translate(cx, y, cz);
      var mt = solidMats[col] || (solidMats[col] = new THREE.MeshLambertMaterial({ color: col, side: THREE.DoubleSide }));
      addGeom(mt, g);
    };
    ring(r - 0.5, r + 0.5, A0, A1, 0.015, ASPH);
    ring(r - 0.5, r - 0.44, A0, A1, 0.02, 0xc9d0f0);
    ring(r + 0.44, r + 0.5, A0, A1, 0.02, 0xc9d0f0);
    ring(r + 0.5, r + 1.0, A0, A1, 0.016, PAVE);
    ring(r - 1.0, r - 0.5, A0, A1, 0.016, PAVE);
    for (var a = a0 + 3; a < a1 - 3; a += 8) ring(r - 0.012, r + 0.012, a * Math.PI / 180, 0.07, 0.021, 0xe6e9f6);
    for (var ix = Math.floor((cx - r - 1) * 2); ix < Math.ceil((cx + r + 1) * 2); ix++) {
      for (var iz = Math.floor((cz - r - 1) * 2); iz < Math.ceil((cz + r + 1) * 2); iz++) {
        var x = ix / 2 + 0.25;
        var z = iz / 2 + 0.25;
        var d = Math.hypot(x - cx, z - cz);
        var ang = Math.atan2(-(z - cz), x - cx) * 180 / Math.PI;
        if (ang < 0) ang += 360;
        if (Math.abs(d - r) <= 0.62 && ang >= a0 - 4 && ang <= a1 + 4) roadCells[ix + ',' + iz] = 1;
      }
    }
    curKind = 'thing';
  }

  // the curved sidewalks are drawn as rings, so their half tiles get no slab
  function onArcWalk(x, z) {
    return arcs.some(function (a) {
      var d = Math.hypot(x - a.cx, z - a.cz);
      var ang = Math.atan2(-(z - a.cz), x - a.cx) * 180 / Math.PI;
      if (ang < 0) ang += 360;
      return Math.abs(d - a.r) > 0.5 && Math.abs(d - a.r) <= 1.5 && ang >= a.a0 - 4 && ang <= a.a1 + 4;
    });
  }

  // sidewalk on every half tile that touches the road, unless it is reserved as green
  function layWalks() {
    var seen = {};
    for (var k in roadCells) {
      var p = k.split(',');
      for (var dx = -1; dx <= 1; dx++) {
        for (var dz = -1; dz <= 1; dz++) {
          var kk = (+p[0] + dx) + ',' + (+p[1] + dz);
          if (!roadCells[kk] && !green[kk]) seen[kk] = 1;
        }
      }
    }
    curKind = 'road';
    for (var w in seen) {
      var q = w.split(',');
      walkCells[w] = 1;
      if (onArcWalk((+q[0] + 0.5) / 2, (+q[1] + 0.5) / 2)) continue;
      slab(+q[0] / 2, +q[1] / 2, +q[0] / 2 + 0.5, +q[1] / 2 + 0.5, PAVE, 0.016, 0.004);
    }
    curKind = 'thing';
  }

  // a stage of a business is one model or a list of models standing side by side
  function span(ref) {
    var refs = Array.isArray(ref) ? ref : [ref];
    var w = 0.04 * (refs.length - 1);
    var d = 0;
    refs.forEach(function (r) {
      var b = lib.model(r).box;
      w += b.x1 - b.x0;
      d = Math.max(d, b.z1 - b.z0);
    });
    return { w: w, d: d };
  }
  function wOf(it) {
    var w = 0;
    (it.ms || [it.m]).forEach(function (r) { w = Math.max(w, span(r).w); });
    return w;
  }
  function dOf(it) {
    var d = 0;
    (it.ms || [it.m]).forEach(function (r) { d = Math.max(d, span(r).d); });
    return d;
  }

  // picks buildings from a pool whose widths, scaled a little, fill len
  function fit(len, pool, gap) {
    var best = null;
    var bestErr = 1e9;
    for (var tries = 0; tries < 500; tries++) {
      var list = [];
      var sum = 0;
      for (var guard = 0; guard < 30; guard++) {
        var ref = pool[Math.floor(rng() * pool.length)];
        var w = wOf({ m: ref });
        if ((len - gap * list.length) / (sum + w) < 0.94 && list.length) break;
        list.push(ref);
        sum += w;
        if ((len - gap * (list.length - 1)) / sum <= 1.06) break;
      }
      var sc = (len - gap * (list.length - 1)) / sum;
      var err = Math.abs(sc - 1);
      if (sc >= 0.94 && sc <= 1.06 && err < bestErr) {
        best = list;
        bestErr = err;
        if (err < 0.012) break;
      }
    }
    return best;
  }

  // one row along a street. face is the way the fronts look; items are model names, {m, biz} or {fill: pool}.
  // front is the lot line (x for a row along z, z for a row along x). Returns the placed records.
  function row(axis, front, from, to, face, items, o) {
    o = o || {};
    var gap = o.gap === undefined ? 0.03 : o.gap;
    var len = to - from;
    var fixed = 0;
    var fills = 0;
    items.forEach(function (it) {
      if (it.fill) fills++;
      else fixed += wOf(typeof it === 'string' ? { m: it } : it);
    });
    var rest = len - fixed - gap * (items.length - 1);
    var list = [];
    items.forEach(function (it) {
      if (it.fill) {
        var pool = typeof it.fill === 'string' ? o.pools[it.fill] : it.fill;
        var got = fit(rest / fills + gap, pool, gap);
        if (!got) {
          warn('no fit for ' + (rest / fills).toFixed(2) + ' at ' + axis + front + ' from ' + from);
          return;
        }
        got.forEach(function (r) { list.push({ m: r }); });
      } else list.push(typeof it === 'string' ? { m: it } : it);
    });
    var sum = 0;
    list.forEach(function (it) { sum += wOf(it); });
    var s = (len - gap * (list.length - 1)) / sum;
    if (o.noscale) s = 1;
    if (s < 0.9 || s > 1.12) warn('row at ' + axis + front + ' from ' + from + ' scales by ' + s.toFixed(2));
    var u = from + (len - sum * s - gap * (list.length - 1)) / 2;
    var d = DIRS[face];
    var out = [];
    var lastTint = null;
    list.forEach(function (it) {
      var w = wOf(it) * s;
      var c = u + w / 2;
      var px = axis === 'x' ? c : front;
      var pz = axis === 'x' ? front : c;
      var rec = { it: it, face: face, tint: null, rot: FACE[face], s: s, w: w, d: dOf(it) * s, px: px, pz: pz, dir: d };
      if (o.tints) {
        var tn;
        do tn = o.tints[Math.floor(rng() * o.tints.length)]; while (tn === lastTint && o.tints.length > 1);
        lastTint = tn;
        rec.tint = it.tint || tn;
      }
      out.push(rec);
      u += w + gap;
    });
    return out;
  }

  // makes the placed records real: ordinary buildings are merged, businesses are handed to the plan's builder
  function commit(recs, onBiz, onShop) {
    recs.forEach(function (r) {
      if (r.it.biz) {
        // the lot is as wide and deep as the biggest stage of the business
        var tx = r.dir[1];
        var tz = -r.dir[0];
        var a = [r.px - tx * r.w / 2, r.pz - tz * r.w / 2];
        var b2 = [r.px + tx * r.w / 2 - r.dir[0] * r.d, r.pz + tz * r.w / 2 - r.dir[1] * r.d];
        r.foot = claim({ x0: Math.min(a[0], b2[0]), x1: Math.max(a[0], b2[0]), z0: Math.min(a[1], b2[1]), z1: Math.max(a[1], b2[1]) }, r.it.biz);
        onBiz(r);
        return;
      }
      var mm = lib.model(r.it.m);
      var og = origin(mm, r.px, r.pz, r.rot, r.s);
      var lod = r.it.m.indexOf('suburban/') === 0 ? { wall: 0xeeeeee, roof: 0x58c47a, rf: 0.32 } : { wall: r.tint || 0xdcdce8, roof: 0x50556a, rf: 0.1 };
      var f = put(r.it.m, og[0], og[1], r.rot, { s: r.s, tint: r.tint, lod: lod });
      if (onShop && r.it.m.indexOf('commercial/') === 0) onShop(r);
      r.foot = claim(f, r.it.m + '@' + r.px.toFixed(1) + ',' + r.pz.toFixed(1));
    });
    return recs;
  }

  var grown = {};
  function growMat(mat) {
    return grown[mat.uuid] || (grown[mat.uuid] = growPatch(mat.clone()));
  }

  // a piece rises from the middle of its footprint; road vertices each grow from where they are, so streets spread
  function tagGrowth(g, c, k) {
    var pos = g.attributes.position;
    var n = pos.count;
    if (!c) {
      g.computeBoundingBox();
      var bb = g.boundingBox;
      c = [(bb.min.x + bb.max.x) / 2, (bb.min.z + bb.max.z) / 2];
    }
    var d = city.region(c[0], c[1], k);
    var spread = k === 'road' && d !== WILD;
    if (spread) d = ROAD;
    var ac = new Float32Array(n * 2);
    var ad = new Float32Array(n);
    for (var i = 0; i < n; i++) {
      ac[i * 2] = spread ? pos.getX(i) : c[0];
      ac[i * 2 + 1] = spread ? pos.getZ(i) : c[1];
      ad[i] = d;
    }
    g.setAttribute('aC', new THREE.BufferAttribute(ac, 2));
    g.setAttribute('aD', new THREE.BufferAttribute(ad, 1));
    return g;
  }

  function merged(list) {
    list.forEach(function (g) { tagGrowth(g, g.userData.c, g.userData.k); });
    return mergeGeometries(list, false);
  }

  function finish() {
    var root = city.root;
    for (var k in batches) {
      var b = batches[k];
      var geo = merged(b.geoms);
      b.geoms.forEach(function (g) { g.dispose(); });
      if (!geo) continue;
      var mesh = new THREE.Mesh(geo, growMat(b.mat));
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      mesh.customDepthMaterial = growDepth;
      mesh.userData.grow = true;
      root.add(mesh);
    }
    var lods = { near: [], far: [] };
    [[lodBatches, 'near'], [lowBatches, 'far']].forEach(function (set) {
      for (var q in set[0]) {
        var lg = merged(set[0][q].geoms);
        set[0][q].geoms.forEach(function (g) { g.dispose(); });
        if (!lg) continue;
        var lm = new THREE.Mesh(lg, growMat(set[0][q].mat));
        lm.customDepthMaterial = growDepth;
        lm.userData.grow = true;
        lm.castShadow = set[1] === 'near';
        lm.receiveShadow = true;
        lm.visible = set[1] === 'near';
        root.add(lm);
        lods[set[1]].push(lm);
      }
    });
    city.lods = lods;
    var boxes = {};
    flat.forEach(function (f) {
      var g = new THREE.BoxGeometry(f.x1 - f.x0, f.h, f.z1 - f.z0);
      g.translate((f.x0 + f.x1) / 2, f.y + f.h / 2, (f.z0 + f.z1) / 2);
      g.deleteAttribute('uv');
      var col = new THREE.Color(f.col);
      var n = g.attributes.position.count;
      var a = new Float32Array(n * 3);
      for (var i = 0; i < n; i++) {
        a[i * 3] = col.r;
        a[i * 3 + 1] = col.g;
        a[i * 3 + 2] = col.b;
      }
      g.setAttribute('color', new THREE.BufferAttribute(a, 3));
      tagGrowth(g, null, f.k);
      (boxes[chunkOf(g)] = boxes[chunkOf(g)] || []).push(g);
    });
    var flatMat = growPatch(new THREE.MeshLambertMaterial({ vertexColors: true, polygonOffset: true, polygonOffsetFactor: 1, polygonOffsetUnits: 1 }));
    for (var bk in boxes) {
      var fm = new THREE.Mesh(mergeGeometries(boxes[bk], false), flatMat);
      fm.receiveShadow = true;
      fm.userData.grow = true;
      root.add(fm);
      boxes[bk].forEach(function (g) { g.dispose(); });
    }
    return root;
  }

  city.put = put;
  city.tryProp = tryProp;
  city.tintMat = tintMat;
  city.addGeom = addGeom;
  city.solidM = solidM;
  city.boxProp = boxProp;
  city.solid = solid;
  city.free = free;
  city.span = span;
  city.origin = origin;
  city.rect = rect;
  city.matrix = matrix;
  city.claim = claim;
  city.slab = slab;
  city.tile = tile;
  city.hline = hline;
  city.vline = vline;
  city.big = big;
  city.arcRoad = arcRoad;
  city.greenRect = greenRect;
  city.placeRoads = placeRoads;
  city.layWalks = layWalks;
  city.row = row;
  city.commit = commit;
  city.finish = finish;
  city.warn = warn;
  return city;
}
