import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { newCity, LAWN, DIRT, PLAZA, WILD } from './city.js';

var C = 'commercial/building-';
var S = 'suburban/building-type-';

export var POOL = {
  shop: [C + 'a', C + 'b', C + 'c', C + 'd', C + 'f', C + 'g', C + 'h'],
  mid: [C + 'i', C + 'j', C + 'k', C + 'l', C + 'e', C + 'a', C + 'b', C + 'f', C + 'g'],
  office: [C + 'm', C + 'l', C + 'i', C + 'j', C + 'f', C + 'g'],
  flat: [C + 'i', C + 'j', C + 'k', C + 'l', C + 'h', C + 'd'],
  house: 'abcdefghijklmnopqrstu'.split('').map(function (c) { return S + c; })
};

var BRICK = [0xffd6c4, 0xffc9b0, 0xffe6b8, 0xfff0d0, 0xcfe4ff, 0xd8f0d0, 0xffd9e8, 0xf4ecdf, 0xe8d8ff, 0xffddb8];
var CARCOL = [0xd9433a, 0x2a5fa8, 0xf0c040, 0x2f8f5a, 0xe8e8ee, 0x555a66, 0xe8802a];
var AWN = [0xd9433a, 0x2f8f5a, 0x2a5fa8, 0xe8a020, 0x8a4a9a, 0xd9433a];

export var CARS = ['sedan', 'suv', 'taxi', 'van', 'hatchback-sports', 'sedan-sports', 'suv-luxury', 'truck', 'delivery'].map(function (n) { return 'car/' + n; });
export var FOLK = 'abcdef'.split('').reduce(function (a, c) { return a.concat(['chars/character-female-' + c, 'chars/character-male-' + c]); }, []);

// what each business shows at each stage: one model, or a few side by side
var SHOPS = {
  homes: { m: [S + 'a', S + 'd', S + 'f'], sign: '\u{1F3E0} Homes', col: '#4f9a40', tint: 0xfff7ea },
  bakery: { m: [C + 'c', C + 'a', C + 'f'], sign: '\u{1F950} Bakery', col: '#c4432f', tint: 0xffe2b0, awn: 0xd9433a, prop: 'bread' },
  cafe: { m: [C + 'c', C + 'b', C + 'g'], sign: '\u2615 Cafe', col: '#7a4a2a', tint: 0xf0c8a0, awn: 0x7a4a2a, prop: 'tables' },
  grocery: { m: [C + 'e', C + 'k', C + 'j'], sign: '\u{1F96C} Grocery', col: '#3f8f4a', tint: 0xdff2c8, awn: 0x2f8f5a, prop: 'crates' },
  icecream: { m: [C + 'c', C + 'h', C + 'd'], sign: '\u{1F366} Ice Cream', col: '#e85d9a', tint: 0xffd8ea, awn: 0xe85d9a, prop: 'cone' },
  flower: { m: [C + 'h', C + 'd', C + 'f'], sign: '\u{1F337} Flowers', col: '#9a5fc8', tint: 0xefe0ff, awn: 0x8a4a9a, prop: 'flowers' },
  books: { m: [C + 'a', C + 'b', C + 'g'], sign: '\u{1F4DA} Books', col: '#2a5588', tint: 0xcfe0ff, awn: 0x2a5fa8, prop: 'shelf' },
  toys: { m: [C + 'h', C + 'i', C + 'l'], sign: '\u{1F9F8} Toys', col: '#e8a020', tint: 0xfff0b0, awn: 0xe8a020, prop: 'blocks' },
  restaurant: { m: [C + 'e', C + 'k', C + 'j'], sign: '\u{1F37D} Restaurant', col: '#b83a3a', tint: 0xffc2a8, awn: 0xb83a3a, prop: 'tables' },
  school: { m: [C + 'e', C + 'k', [C + 'k', C + 'e'], [C + 'k', C + 'j']], sign: '\u{1F3EB} School', col: '#2f6e8f', tint: 0xe6a080 },
  hosp: { m: [C + 'j', C + 'n', [C + 'n', C + 'j']], sign: '\u{1F3E5} Hospital', col: '#d03a3a', tint: 0xffffff }
};

var EXTRA = [
  'roads/road-straight', 'roads/road-crossing', 'roads/road-crossroad', 'roads/road-intersection', 'roads/road-bend-sidewalk',
  'roads/road-curve', 'roads/road-end', 'roads/road-end-round', 'roads/road-roundabout', 'roads/light-curved',
  'roads/light-curved-double', 'roads/traffic-light', 'roads/construction-barrier', 'roads/construction-cone',
  'roads/dumpster', 'suburban/tree-large', 'suburban/tree-small', 'suburban/fence',
  'car/tractor-shovel', 'car/police', 'car/firetruck', 'car/ambulance', 'commercial/detail-parasol-a', 'commercial/detail-parasol-b', 'nature/flower_redA', 'nature/flower_yellowA', 'nature/flower_purpleA',
  'nature/statue_column'
];

export function modelList() {
  var all = {};
  var add = function (l) { l.forEach(function (n) { all[n] = 1; }); };
  for (var k in POOL) add(POOL[k]);
  add(CARS);
  add(FOLK);
  add(EXTRA);
  for (var s in SHOPS) {
    SHOPS[s].m.forEach(function (m) { add(Array.isArray(m) ? m : [m]); });
  }
  return Object.keys(all);
}

function label(text, col, w, h, ink) {
  var k = document.createElement('canvas');
  k.width = w || 256;
  k.height = h || 64;
  var x = k.getContext('2d');
  x.fillStyle = col;
  x.fillRect(0, 0, k.width, k.height);
  x.strokeStyle = 'rgba(255,255,255,0.85)';
  x.lineWidth = 4;
  x.strokeRect(3, 3, k.width - 6, k.height - 6);
  x.fillStyle = ink || '#fff';
  x.font = 'bold ' + Math.floor(k.height * 0.5) + 'px system-ui, sans-serif';
  x.textAlign = 'center';
  x.textBaseline = 'middle';
  x.fillText(text, k.width / 2, k.height / 2 + 2);
  var t = new THREE.CanvasTexture(k);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

var flatMat = {};
function color(c) {
  if (!flatMat[c]) flatMat[c] = new THREE.MeshLambertMaterial({ color: c });
  return flatMat[c];
}

function box(w, h, d, col, x, y, z) {
  var m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), color(col));
  m.position.set(x, y + h / 2, z);
  m.castShadow = true;
  m.receiveShadow = true;
  return m;
}

// bakes the meshes of a group into one mesh per material
function mergeGroup(g) {
  g.updateMatrixWorld(true);
  var by = {};
  var drop = [];
  g.traverse(function (o) {
    if (!o.isMesh || o.userData.keep) return;
    var geo = o.geometry.clone();
    geo.applyMatrix4(o.matrixWorld);
    var k = o.material.uuid;
    (by[k] = by[k] || { mat: o.material, geoms: [], cast: o.castShadow, recv: o.receiveShadow }).geoms.push(geo);
    drop.push(o);
  });
  drop.forEach(function (o) { o.parent.remove(o); });
  var inv = new THREE.Matrix4().copy(g.matrixWorld).invert();
  for (var k in by) {
    var geo = mergeGeometries(by[k].geoms, false);
    if (!geo) continue;
    geo.applyMatrix4(inv);
    var m = new THREE.Mesh(geo, by[k].mat);
    m.castShadow = by[k].cast;
    m.receiveShadow = by[k].recv;
    g.add(m);
  }
  return g;
}

export function planTown(lib) {
  var c = newCity(lib);
  var rng = c.rng;

  function streets() {
    c.big('road-roundabout', 0, 0, 0, 3, ['0,-2', '2,0', '0,2', '-2,0']);
    c.tile(0, -2);
    c.hline(0, -25, -2);
    c.tile(-26, 0, 'road-end-round');
    c.hline(0, 2, 26);
    c.hline(2, -1, 1);
    c.vline(-1, 3, 52);
    c.vline(1, 3, 52);
    [5, 10, 15, 20].forEach(function (z) { c.tile(0, z); });
    c.hline(5, -15, -2);
    c.tile(-15, 5, 'road-straight');
    c.hline(5, 2, 26);
    c.hline(10, -15, -2);
    c.tile(-15, 10, 'road-straight');
    c.hline(10, 2, 26);
    c.hline(15, -25, -2);
    c.tile(-26, 15, 'road-end-round');
    c.hline(15, 2, 26);
    c.hline(20, -17, -2);
    c.hline(20, 2, 26);
    c.vline(14, 1, 19);
    c.vline(26, 1, 19);
    c.arcRoad(-15.5, 7.5, 2.5, 90, 270);
    c.tile(-17, 20, 'road-end-round');
    // the median and the grounds that must not become sidewalk
    c.greenRect(-0.5, 2.5, 0.5, 35);
  }

  // trees and lamps along a straight run of sidewalk: axis 'x' means a street running east to west at z
  function furnish(axis, at, from, to, side, lampEvery, treeEvery, skip) {
    // side -1: north / west walk, +1: south / east walk
    var off = 0.75 * side;
    for (var u = from; u <= to; u += 0.5) {
      var x = axis === 'x' ? u : at + off;
      var z = axis === 'x' ? at + off : u;
      if (skip && skip(x, z)) continue;
      var k = Math.round((u - from) * 2);
      if (lampEvery && k % (lampEvery * 2) === 0) {
        var toRoad = axis === 'x' ? [0, -side] : [-side, 0];
        var rot = Math.atan2(-toRoad[0], -toRoad[1]);
        c.tryProp('roads/light-curved', x, z, rot, { walk: true, onWalk: true, tag: 'lamp' });
      } else if (treeEvery && (k - lampEvery) % (treeEvery * 2) === 0) {
        c.tryProp('suburban/tree-large', x, z, rng() * 6, { walk: true, onWalk: true, s: 1.5, tag: 'tree', shrink: 0.04 });
      }
    }
  }

  function furnishAll() {
    var clear = function (x, z) {
      // keep the corners of a junction and the mouths of side streets free
      for (var k in c.tiles) {
        var t = c.tiles[k];
        if (t.big) continue;
        var n = t.pick && t.pick.name;
        if (n !== 'road-crossroad' && n !== 'road-intersection' && n !== 'road-crossing') continue;
        if (Math.abs(t.x - x) < 1.25 && Math.abs(t.z - z) < 1.25) return true;
      }
      return Math.hypot(x, z) < 2.8;
    };
    // east-west streets
    [[0, -25, 26], [5, -15, 26], [10, -15, 26], [15, -25, 26], [20, -17, -2], [20, 2, 26]].forEach(function (s) {
      furnish('x', s[0], s[1], s[2], -1, 3, 1.5, clear);
      furnish('x', s[0], s[1] + 0.75, s[2], 1, 3, 1.5, clear);
    });
    [[14, 1, 19], [26, 1, 19]].forEach(function (v) {
      furnish('z', v[0], v[1] + 0.75, v[2], -1, 3, 1.5, clear);
      furnish('z', v[0], v[1] + 0.75, v[2], 1, 3, 1.5, clear);
    });
    // the boulevard: both outer walks, and the median with a lamp and a tree in turn
    furnish('z', -1, 3, 50, -1, 3, 1.5, clear);
    furnish('z', 1, 3, 50, 1, 3, 1.5, clear);
    for (var z = 3.5; z < 50; z += 1.5) {
      if (clear(0, z) && Math.abs(z - 5) < 1.3 || Math.abs(z - 10) < 1.3 || Math.abs(z - 15) < 1.3 || Math.abs(z - 20) < 1.3) continue;
      var k = Math.round((z - 3.5) / 1.5);
      if (k % 2) c.tryProp('roads/light-curved-double', 0, z, Math.PI / 2, { walk: true, tag: 'lamp' });
      else c.tryProp('suburban/tree-large', 0, z, rng() * 6, { walk: true, s: 1.5, tag: 'tree', shrink: 0.04 });
    }
  }

  function bizModel(ref, r, h, tint) {
    var refs = Array.isArray(ref) ? ref : [ref];
    var g = new THREE.Group();
    var total = c.span(refs).w * r.s;
    var u = -total / 2;
    var tx = r.dir[1];
    var tz = -r.dir[0];
    refs.forEach(function (rf) {
      var m = lib.model(rf);
      var w = (m.box.x1 - m.box.x0) * r.s;
      var cen = u + w / 2;
      var px = r.px + tx * cen;
      var pz = r.pz + tz * cen;
      var o = c.origin(m, px, pz, r.rot, r.s);
      var mat = c.matrix(o[0], 0, o[1], r.rot, r.s);
      m.parts.forEach(function (p) {
        var mesh = new THREE.Mesh(p.geom, tint ? c.tintMat(p.mat, tint) : p.mat);
        mesh.matrixAutoUpdate = false;
        mesh.matrix.copy(mat);
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        g.add(mesh);
      });
      h.v = Math.max(h.v, m.box.h * r.s);
      u += w + 0.04;
    });
    return g;
  }

  function signFor(id, r, h) {
    var sp = SHOPS[id];
    var m = new THREE.Mesh(new THREE.PlaneGeometry(0.6, 0.15), new THREE.MeshBasicMaterial({ map: label(sp.sign, sp.col, 256, 64) }));
    var d = r.dir;
    m.scale.set(Math.min(1.1, Math.min(1, r.w) / 0.7), 1, 1);
    m.position.set(r.px + d[0] * 0.012, 0.36, r.pz + d[1] * 0.012);
    m.rotation.y = r.rot;
    return m;
  }

  // a fenced dirt lot with a crane, a digger, barriers and a price board
  function site(id, r, name, price) {
    var g = new THREE.Group();
    var local = new THREE.Group();
    local.position.set(r.px, 0, r.pz);
    local.rotation.y = r.rot;
    g.add(local);
    var w = r.w;
    var dp = r.d;
    local.add(box(w, 0.01, dp, DIRT, 0, 0.012, -dp / 2));
    // the fence round three sides, the front is open at a gate
    var add = function (ref, x, z, rot, s) {
      var m = lib.model(ref);
      var mat = new THREE.Matrix4().compose(new THREE.Vector3(x, 0.012, z), new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), rot),
        new THREE.Vector3(s, s, s));
      m.parts.forEach(function (p) {
        var mesh = new THREE.Mesh(p.geom, p.mat);
        mesh.matrixAutoUpdate = false;
        mesh.matrix.copy(mat);
        mesh.castShadow = true;
        local.add(mesh);
      });
    };
    var step = 0.48;
    var nz = Math.max(1, Math.round((dp - 0.1) / step));
    for (var i = 0; i < nz; i++) {
      var z = -0.1 - (i + 0.5) * (dp - 0.1) / nz;
      add('suburban/fence', -w / 2 + 0.03, z, Math.PI / 2, 1.0);
      add('suburban/fence', w / 2 - 0.03, z, Math.PI / 2, 1.0);
    }
    var nx = Math.max(1, Math.round((w - 0.06) / step));
    for (var j = 0; j < nx; j++) {
      var x = -w / 2 + 0.03 + (j + 0.5) * (w - 0.06) / nx;
      add('suburban/fence', x, -dp + 0.03, 0, 1.0);
    }
    // the front: two runs and a gate between them
    var fw = (w - 0.06 - 0.36) / 2;
    var fn = Math.max(1, Math.round(fw / step));
    for (var q = 0; q < fn; q++) {
      var off = (q + 0.5) * fw / fn;
      add('suburban/fence', -w / 2 + 0.03 + off, -0.03, 0, 1.0);
      add('suburban/fence', w / 2 - 0.03 - off, -0.03, 0, 1.0);
    }
    add('roads/construction-barrier', 0, -0.03, 0, 1.8);
    add('roads/construction-cone', -0.2, 0.06, 0, 1.8);
    add('roads/construction-cone', 0.2, 0.06, 0, 1.8);
    add('roads/dumpster', w / 2 - 0.22, -dp + 0.25, 0.3, 1.1);
    if (w > 1.3) add('car/tractor-shovel', -w / 2 + 0.35, -dp / 2, 0.7, 0.26);
    // the tower crane
    var cx = -w / 2 + 0.3;
    var cz = -dp + 0.3;
    local.add(box(0.04, 1.5, 0.04, 0xffc044, cx, 0.012, cz));
    local.add(box(0.9, 0.03, 0.04, 0xffc044, cx + 0.3, 1.46, cz));
    local.add(box(0.12, 0.08, 0.06, 0x4a4f5e, cx - 0.22, 1.42, cz));
    local.add(box(0.012, 0.35, 0.012, 0x4a4f5e, cx + 0.62, 1.1, cz));
    // the price board on two posts
    var board = new THREE.Mesh(new THREE.PlaneGeometry(0.62, 0.2), new THREE.MeshBasicMaterial({ map: label(name + '  $' + price, '#2f4f6f', 384, 96) }));
    board.position.set(0, 0.32, -0.1);
    local.add(board);
    local.add(box(0.03, 0.22, 0.03, 0x6b4a2a, -0.28, 0.012, -0.1));
    local.add(box(0.03, 0.22, 0.03, 0x6b4a2a, 0.28, 0.012, -0.1));
    return mergeGroup(g);
  }

  // each milestone of a business changes it: the model changes at 10, 50 and 100 (the stage models spread over the list),
  // bunting hangs from it at 25 and gold trim crowns it at 100
  function stageDeco(st, g, r, h) {
    var local = new THREE.Group();
    local.position.set(r.px, 0, r.pz);
    local.rotation.y = r.rot;
    var w = Math.min(r.w * 0.9, 1.3);
    if (st === 3 || st === 5) {
      local.add(box(w, 0.008, 0.008, 0x555a6a, 0, 0.56, 0.015));
      for (var i = 0; i < 7; i++) local.add(box(0.05, 0.07, 0.01, AWN[i % AWN.length], -w / 2 + (i + 0.5) * w / 7, 0.5, 0.018));
    }
    if (st === 5) {
      local.add(box(w, 0.04, 0.05, 0xf0c040, 0, h.v - 0.02, 0.012));
      [-1, 1].forEach(function (k) { local.add(box(0.05, h.v, 0.05, 0xf0c040, k * w / 2, 0, 0.012)); });
    }
    g.add(local);
  }

  function onBiz(r) {
    var id = r.it.biz;
    var sp = SHOPS[id];
    var models = [site(id, r, BZ[id].name, short(BZ[id].c0))];
    var heights = [0.9];
    var pick = sp.m.length === 4 ? [0, 1, 2, 3, 3] : [0, 1, 1, 2, 2];
    for (var st = 1; st <= 5; st++) {
      var ref = sp.m[pick[st - 1]];
      var hh = { v: 0 };
      var g = bizModel(ref, r, hh, sp.tint);
      g.add(signFor(id, r, hh));
      deco(id, g, r, hh, ref);
      stageDeco(st, g, r, hh);
      mergeGroup(g);
      models.push(g);
      heights.push(hh.v);
    }
    var info = { foot: r.foot, rec: r, build: function () { return models; }, pick: function (st) { return st; } };
    info.h = Math.max.apply(null, heights);
    info.at = [r.px + r.dir[0] * 0.3, 0, r.pz + r.dir[1] * 0.3];
    info.top = function () {
      return [r.px - r.dir[0] * r.d / 2, (heights[Math.max(0, info.shown)] || 0.9) + (sp.prop ? 0.5 : 0.1), r.pz - r.dir[1] * r.d / 2];
    };
    c.claim({ x0: info.at[0] - 0.2, x1: info.at[0] + 0.2, z0: info.at[2] - 0.2, z1: info.at[2] + 0.2 }, id + ' gate', true);
    c.biz[id] = info;
  }

  var SIGNS = ['\u{1F355} Pizza', '\u2702 Barber', '\u{1F48A} Pharmacy', '\u{1F3E6} Bank', '\u{1F527} Hardware', '\u{1F455} Clothes', '\u{1F4F1} Phones',
    '\u{1F354} Burgers', '\u{1F956} Deli', '\u{1F488} Salon', '\u{1F4F7} Photo', '\u{1F453} Optician', '\u{1F381} Gifts', '\u{1F9C1} Sweets',
    '\u{1F3AE} Games', '\u{1F4EE} Post'];
  var SIGNCOL = ['#c4432f', '#2a5fa8', '#2f8f5a', '#7a4a2a', '#8a4a9a', '#d98a20', '#3a6f8f', '#b83a3a'];
  var atlas = null;
  var signN = 0;

  function atlasMat() {
    if (atlas) return atlas;
    var k = document.createElement('canvas');
    k.width = 1024;
    k.height = 256;
    var x = k.getContext('2d');
    SIGNS.forEach(function (t, i) {
      var cx = (i % 4) * 256;
      var cy = Math.floor(i / 4) * 64;
      x.fillStyle = SIGNCOL[i % SIGNCOL.length];
      x.fillRect(cx, cy, 256, 64);
      x.strokeStyle = 'rgba(255,255,255,0.85)';
      x.lineWidth = 4;
      x.strokeRect(cx + 3, cy + 3, 250, 58);
      x.fillStyle = '#fff';
      x.font = 'bold 30px system-ui, sans-serif';
      x.textAlign = 'center';
      x.textBaseline = 'middle';
      x.fillText(t, cx + 128, cy + 34);
    });
    var t = new THREE.CanvasTexture(k);
    t.colorSpace = THREE.SRGBColorSpace;
    atlas = new THREE.MeshBasicMaterial({ map: t });
    return atlas;
  }

  function awning(r, col, w, y) {
    var base = c.matrix(r.px, 0, r.pz, r.rot, 1);
    var n = Math.max(2, Math.round(w / 0.1));
    var sw = w / n;
    for (var i = 0; i < n; i++) {
      var local = new THREE.Matrix4().makeTranslation(-w / 2 + (i + 0.5) * sw, y, 0.09).multiply(new THREE.Matrix4().makeRotationX(0.45));
      c.solidM(sw, 0.012, 0.19, i % 2 ? 0xfaf6ee : col, base.clone().multiply(local));
    }
  }

  function shopfront(r) {
    var w = Math.min(r.w * 0.86, 1.1);
    var i = signN++ % SIGNS.length;
    var col = AWN[Math.floor(rng() * AWN.length)];
    var v = Math.floor(rng() * 4);
    var base = c.matrix(r.px, 0, r.pz, r.rot, 1);
    var at = function (lx, y, lz) { return base.clone().multiply(new THREE.Matrix4().makeTranslation(lx, y, lz)); };
    if (v === 0) awning(r, col, w, 0.26);
    else if (v === 1) {
      // a flat canopy and flower boxes under the windows
      c.solidM(w, 0.02, 0.16, col, at(0, 0.27, 0.08));
      c.solidM(0.012, 0.25, 0.012, 0xdfe4f0, at(-w / 2 + 0.02, 0.14, 0.15));
      c.solidM(0.012, 0.25, 0.012, 0xdfe4f0, at(w / 2 - 0.02, 0.14, 0.15));
      [-0.25, 0.25].forEach(function (lx) {
        c.solidM(0.3, 0.05, 0.07, 0x8a5a34, at(lx * w, 0.5, 0.04));
        c.solidM(0.26, 0.05, 0.05, 0x56b45c, at(lx * w, 0.55, 0.04));
      });
    } else if (v === 2) {
      // half an awning, and a banner hanging from the corner
      awning({ px: r.px, pz: r.pz, rot: r.rot }, col, w * 0.55, 0.26);
      c.solidM(0.012, 0.2, 0.06, 0xd9433a, at(w / 2 - 0.02, 0.42, 0.04));
      c.solidM(0.08, 0.2, 0.012, col, at(w / 2 + 0.02, 0.45, 0.06));
    } else {
      c.solidM(w, 0.02, 0.12, col, at(0, 0.3, 0.06));
      c.solidM(0.2, 0.12, 0.02, 0x2f4a3f, at(w / 2 - 0.15, 0.06, 0.3));
      c.solidM(0.03, 0.1, 0.02, 0x6b4a2a, at(w / 2 - 0.23, 0.05, 0.29));
      c.solidM(0.03, 0.1, 0.02, 0x6b4a2a, at(w / 2 - 0.07, 0.05, 0.29));
    }
    var g = new THREE.PlaneGeometry(w * 0.8, w * 0.2);
    var u0 = (i % 4) / 4;
    var v1 = 1 - Math.floor(i / 4) / 4;
    var uv = g.attributes.uv;
    for (var k = 0; k < uv.count; k++) uv.setXY(k, u0 + uv.getX(k) / 4, v1 - 0.25 + uv.getY(k) * 0.25);
    g.applyMatrix4(c.matrix(r.px + r.dir[0] * 0.012, 0.36, r.pz + r.dir[1] * 0.012, r.rot, 1));
    c.addGeom(atlasMat(), g);
  }

  // props on the roof of a business that say what it sells
  function roofProp(kind, g, x, y, z) {
    var add = function (mesh) {
      mesh.castShadow = true;
      g.add(mesh);
    };
    var m = function (geo, col, px, py, pz) {
      var mesh = new THREE.Mesh(geo, color(col));
      mesh.position.set(px, py, pz);
      add(mesh);
      return mesh;
    };
    if (kind === 'cone') {
      var cn = m(new THREE.ConeGeometry(0.1, 0.28, 12), 0xd9a45a, x, y + 0.14, z);
      cn.rotation.x = Math.PI;
      m(new THREE.SphereGeometry(0.11, 12, 8), 0xf58ab8, x, y + 0.34, z);
      m(new THREE.SphereGeometry(0.05, 8, 6), 0xd9433a, x, y + 0.46, z);
    } else if (kind === 'tables') {
      m(new THREE.CylinderGeometry(0.1, 0.09, 0.22, 14), 0xffffff, x, y + 0.11, z);
      m(new THREE.CylinderGeometry(0.085, 0.085, 0.02, 14), 0x6b4226, x, y + 0.2, z);
      m(new THREE.TorusGeometry(0.06, 0.018, 6, 12), 0xffffff, x + 0.13, y + 0.12, z);
    } else if (kind === 'bread') {
      m(new THREE.BoxGeometry(0.3, 0.12, 0.14), 0xc98a3a, x, y + 0.06, z);
      m(new THREE.CylinderGeometry(0.07, 0.07, 0.3, 10), 0xd9a04a, x, y + 0.17, z).rotation.z = Math.PI / 2;
    } else if (kind === 'crates') {
      m(new THREE.BoxGeometry(0.2, 0.12, 0.2), 0xa8793a, x, y + 0.06, z);
      m(new THREE.SphereGeometry(0.07, 10, 8), 0xd9433a, x - 0.04, y + 0.17, z);
      m(new THREE.SphereGeometry(0.06, 10, 8), 0x7cc04a, x + 0.06, y + 0.16, z + 0.03);
    } else if (kind === 'flowers') {
      m(new THREE.CylinderGeometry(0.08, 0.06, 0.1, 10), 0xc9693a, x, y + 0.05, z);
      [[0, 0.17, 0, 0xf06aa0], [0.07, 0.15, 0.03, 0xf7d23a], [-0.07, 0.15, -0.02, 0xb070e0]].forEach(function (q) {
        m(new THREE.SphereGeometry(0.06, 8, 6), q[3], x + q[0], y + q[1], z + q[2]);
      });
    } else if (kind === 'shelf') {
      [[0x2a5fa8, 0], [0xd9433a, 0.06], [0x2f8f5a, 0.12]].forEach(function (q, i) {
        m(new THREE.BoxGeometry(0.26, 0.05, 0.16), q[0], x, y + 0.025 + q[1], z + (i % 2) * 0.01);
      });
    } else if (kind === 'blocks') {
      m(new THREE.BoxGeometry(0.12, 0.12, 0.12), 0xd9433a, x - 0.08, y + 0.06, z);
      m(new THREE.BoxGeometry(0.12, 0.12, 0.12), 0x2a5fa8, x + 0.07, y + 0.06, z);
      m(new THREE.BoxGeometry(0.12, 0.12, 0.12), 0xf7d23a, x - 0.005, y + 0.18, z);
    }
  }

  // extras of each business, added to the group of one stage
  function deco(id, g, r, h, ref) {
    var sp = SHOPS[id];
    var local = new THREE.Group();
    local.position.set(r.px, 0, r.pz);
    local.rotation.y = r.rot;
    g.add(local);
    var refs = Array.isArray(ref) ? ref : [ref];
    var depth = lib.model(refs[0]).box;
    depth = (depth.z1 - depth.z0) * r.s;
    var width = Math.min(c.span(ref).w * r.s * 0.86, 1.4);
    if (sp.awn) {
      var n = Math.max(2, Math.round(width / 0.1));
      var sw = width / n;
      for (var i = 0; i < n; i++) {
        var st = new THREE.Mesh(new THREE.BoxGeometry(sw, 0.012, 0.19), color(i % 2 ? 0xfaf6ee : sp.awn));
        st.position.set(-width / 2 + (i + 0.5) * sw, 0.26, 0.09);
        st.rotation.x = 0.45;
        st.castShadow = true;
        local.add(st);
      }
    }
    if (sp.prop) roofProp(sp.prop, local, 0, h.v, -depth * 0.4);
    if (id === 'hosp') {
      var cross = 0xd92a2a;
      local.add(box(0.22, 0.06, 0.012, cross, 0, 0.56, 0.01));
      local.add(box(0.06, 0.22, 0.012, cross, 0, 0.48, 0.01));
      local.add(box(0.6, 0.025, 0.2, 0xffffff, 0, 0.27, 0.1));
      local.add(box(0.025, 0.27, 0.025, 0xdfe4f0, -0.27, 0, 0.18));
      local.add(box(0.025, 0.27, 0.025, 0xdfe4f0, 0.27, 0, 0.18));
      var k = document.createElement('canvas');
      k.width = k.height = 128;
      var x = k.getContext('2d');
      x.fillStyle = '#5a5f78';
      x.beginPath();
      x.arc(64, 64, 62, 0, 7);
      x.fill();
      x.strokeStyle = '#fff';
      x.lineWidth = 6;
      x.beginPath();
      x.arc(64, 64, 54, 0, 7);
      x.stroke();
      x.fillStyle = '#fff';
      x.font = 'bold 76px system-ui, sans-serif';
      x.textAlign = 'center';
      x.textBaseline = 'middle';
      x.fillText('H', 64, 68);
      var tx = new THREE.CanvasTexture(k);
      tx.colorSpace = THREE.SRGBColorSpace;
      var pad = new THREE.Mesh(new THREE.CircleGeometry(0.3, 24), new THREE.MeshBasicMaterial({ map: tx }));
      pad.rotation.x = -Math.PI / 2;
      pad.position.set(0.2, h.v + 0.012, -depth / 2);
      local.add(pad);
    }
    if (id === 'school') {
      local.add(box(0.025, 0.7, 0.025, 0xdfe4f0, -width / 2 - 0.1, 0, 0.18));
      local.add(box(0.2, 0.12, 0.01, 0xd92a2a, -width / 2, 0.58, 0.18));
      local.add(box(0.2, 0.012, 0.2, 0xe8d9a8, 0, 0.42, 0.1));
    }
  }

  // a vehicle with a body colour of its own (the school bus)
  function tintedCar(ref, x, z, rot, col) {
    var m = lib.model(ref);
    var f = c.rect(m, x, z, rot, 0.3);
    if (!c.free(f, false)) return;
    c.claim(f, 'bus');
    var mat = c.matrix(x, 0, z, rot, 0.3);
    m.parts.forEach(function (p) {
      var g = p.geom.clone();
      g.applyMatrix4(mat);
      c.addGeom(c.tintMat(p.mat, col), g);
    });
  }

  function lotsAlong(axis, front, from, to, face, items, o) {
    o = o || {};
    o.pools = POOL;
    if (o.tints === undefined) o.tints = o.house ? null : BRICK;
    var recs = c.row(axis, front, from, to, face, items, o);
    return c.commit(recs, onBiz, o.house ? null : shopfront);
  }

  function B(id) {
    return { biz: id, ms: SHOPS[id].m };
  }

  var XE = 25;
  var XW = -24;

  // fills the strip between two rows that stand back to back
  function yard(x0, x1, top, bot, kind, z0, z1) {
    var zt = z0 === undefined ? -1e9 : z0;
    var zb = z1 === undefined ? 1e9 : z1;
    (top || []).forEach(function (r) { zt = Math.max(zt, r.foot.z1); });
    (bot || []).forEach(function (r) { zb = Math.min(zb, r.foot.z0); });
    if (kind === 'paved') {
      var pa = z0 === undefined ? zt : z0;
      var pb = z1 === undefined ? zb : z1;
      (top || []).forEach(function (r) { pa = Math.min(pa, r.foot.z0); });
      (bot || []).forEach(function (r) { pb = Math.max(pb, r.foot.z1); });
      c.slab(x0, pa, x1, pb, 0x565b6e, 0.012, 0.004);
      var ya = pa + 0.25;
      var yb = pb - 0.25;
      if (yb - ya < 1.15) yb = ya;
      for (var zc = ya + 0.35; zc < yb - 0.3; zc += 0.8) {
        for (var x = x0 + 0.35; x < x1 - 0.25; x += 0.5) {
          if (rng() < 0.3) continue;
          if (c.tryProp(CARS[Math.floor(rng() * CARS.length)], x, zc, rng() < 0.5 ? 0 : Math.PI, { s: 0.26, tag: 'car', shrink: 0.02, lod: { wall: CARCOL[Math.floor(rng() * CARCOL.length)], rf: 0.3, roof: 0x2b2f3d } })) {
            c.slab(x - 0.25, zc - 0.34, x - 0.235, zc + 0.34, 0xffffff, 0.018, 0.002);
            c.slab(x + 0.235, zc - 0.34, x + 0.25, zc + 0.34, 0xffffff, 0.018, 0.002);
          }
        }
      }
    } else {
      var mid = (zt + zb) / 2;
      var k = 0;
      for (var u = x0 + 0.4; u < x1 - 0.3; u += 0.9) {
        var tz = mid + (k % 2 ? 0.25 : -0.25);
        if (!c.tryProp('suburban/tree-large', u, tz, rng() * 6, { s: 1.5 + rng() * 0.3, tag: 'tree', shrink: 0.04 })) {
          c.boxProp(u, tz, 0.36, 0.17, 0.3, 0x56b45c, 'bush');
        }
        k++;
      }
    }
  }

  function lawn(x0, z0, x1, z1, col) {
    c.slab(x0, z0, x1, z1, col || LAWN, 0.012, 0.004);
  }

  function lineBox(x0, z0, x1, z1, col, y) {
    c.slab(x0, z0, x1, z1, col, y || 0.018, 0.003);
  }

  // houses round the outside of the crescent, each looking at the middle of the curve
  function arcHouses() {
    var cx = -15.5;
    var cz = 7.5;
    var R0 = 3.5 + 0.62;
    for (var a = 112; a <= 248; a += 19) {
      var rad = a * Math.PI / 180;
      var ref = POOL.house[Math.floor(rng() * POOL.house.length)];
      var m = lib.model(ref);
      var fx = -Math.cos(rad);
      var fz = Math.sin(rad);
      var rot = Math.atan2(fx, fz);
      var o = c.origin(m, cx + R0 * Math.cos(rad), cz - R0 * Math.sin(rad), rot, 1);
      var f = c.rect(m, o[0], o[1], rot, 1);
      var k = 0.28;
      f.x0 += k;
      f.x1 -= k;
      f.z0 += k;
      f.z1 -= k;
      c.put(ref, o[0], o[1], rot, {});
      c.claim(f, ref + '@arc');
    }
  }

  // a tall building at each end of a row, where it meets a cross street
  function cornered(items) {
    var tall = [C + 'm', C + 'l', C + 'i'];
    return [{ m: tall[Math.floor(rng() * 3)] }].concat(items, [{ m: tall[Math.floor(rng() * 3)] }]);
  }

  function blocks() {
    var house = { gap: 0.18, setback: 0.35, house: true };
    var R = {};
    // north of Civic Avenue
    R.nw = lotsAlong('x', -1, XW, -17.4, 'S', [{ fill: 'house' }], house);
    R.ne = lotsAlong('x', -1, 2, XE, 'S', [B('hosp'), { m: C + 'k', tag: 'police', tint: 0xb8ccf0 }, { fill: 'office' }]);
    // Civic Avenue south side and Park Street north side, east
    R.a1 = lotsAlong('x', 1, 9, 13, 'N', [{ fill: 'shop' }]);
    R.a2 = lotsAlong('x', 4, 9, 13, 'S', [{ fill: 'shop' }]);
    R.a3 = lotsAlong('x', 1, 15, XE, 'N', cornered([{ fill: 'office' }]));
    R.a4 = lotsAlong('x', 4, 15, XE, 'S', [{ m: C + 'k', tag: 'fire', tint: 0xff9c88 }, { fill: 'mid' }]);
    // Park Street south side, Main Street north side
    R.b1 = lotsAlong('x', 6, 2, 13, 'N', cornered([{ fill: 'mid' }]));
    R.b2 = lotsAlong('x', 6, 15, XE, 'N', cornered([{ fill: 'office' }]));
    R.b3 = lotsAlong('x', 9, 2, 13, 'S', [B('bakery'), B('cafe'), B('grocery'), { fill: 'shop' }]);
    R.b4 = lotsAlong('x', 9, 15, XE, 'S', [B('icecream'), B('flower'), B('books'), B('toys'), { fill: 'shop' }]);
    // Main Street south side, South Street north side
    R.c1 = lotsAlong('x', 11, 9, 13, 'N', [{ fill: 'mid' }]);
    R.c2 = lotsAlong('x', 11, 15, XE, 'N', cornered([{ fill: 'mid' }]));
    R.c3 = lotsAlong('x', 14, 9, 13, 'S', [B('restaurant'), { fill: 'shop' }]);
    R.c4 = lotsAlong('x', 14, 15, XE, 'S', [{ fill: 'flat' }]);
    // South Street south side, Depot Street north side, Depot Street south side
    R.d1 = lotsAlong('x', 16, 2, 13, 'N', cornered([{ fill: 'flat' }]));
    R.d2 = lotsAlong('x', 16, 15, XE, 'N', cornered([{ fill: 'mid' }]));
    R.d3 = lotsAlong('x', 19, 2, 13, 'S', [{ fill: 'shop' }]);
    R.d4 = lotsAlong('x', 19, 15, XE, 'S', [{ fill: 'mid' }]);
    R.e1 = lotsAlong('x', 21, 2, XE, 'N', [{ m: C + 'j', tag: 'bus' }, { fill: 'mid' }]);
    // west
    R.w1 = lotsAlong('x', 1, XW, -2, 'N', [{ fill: 'house' }], house);
    R.w2 = lotsAlong('x', 4, -15, -2, 'S', [{ fill: 'house' }, B('homes'), { fill: 'house' }, { m: S + 'o', tag: 'church' }], house);
    R.w3 = lotsAlong('x', 9, -15, -2, 'S', [{ fill: 'house' }], house);
    R.w4 = lotsAlong('x', 11, -15, -2, 'N', [{ fill: 'house' }], house);
    R.w5 = lotsAlong('x', 14, XW, -2, 'S', [{ fill: 'house' }], house);
    R.w6 = lotsAlong('x', 16, XW, -2, 'N', [{ fill: 'house' }], house);
    R.w7 = lotsAlong('x', 19, -16, -2, 'S', [{ fill: 'house' }], house);
    R.w8 = lotsAlong('x', 21, -16, -2, 'N', [{ fill: 'house' }], house);
    // the crescent and the court
    arcHouses();
    R.ct = lotsAlong('z', -18, 17.5, 23.5, 'E', [{ fill: 'house' }], house);
    return R;
  }

  // a sign over a door, as a flat panel on the front of a record
  function signAt(r, text, col, y, w) {
    var m = new THREE.Mesh(new THREE.PlaneGeometry(w || 0.6, (w || 0.6) / 4), new THREE.MeshBasicMaterial({ map: label(text, col, 256, 64) }));
    m.position.set(r.px + r.dir[0] * 0.012, y || 0.36, r.pz + r.dir[1] * 0.012);
    m.rotation.y = r.rot;
    c.root.add(m);
    return m;
  }

  function hedge(x0, z0, x1, z1, gap) {
    var n = Math.max(1, Math.round(Math.hypot(x1 - x0, z1 - z0) / 0.4));
    for (var i = 0; i <= n; i++) {
      var u = i / n;
      var x = x0 + (x1 - x0) * u;
      var z = z0 + (z1 - z0) * u;
      if (gap && Math.abs(x - gap[0]) < gap[1] && Math.abs(z - gap[2]) < gap[3]) continue;
      c.boxProp(x, z, 0.42, 0.15, 0.2, 0x4faa57, 'hedge');
    }
  }

  // a vehicle parked behind the building of a record
  function behind(r, ref, k) {
    var x = r.px + r.dir[1] * (k || 0) - r.dir[0] * (r.d + 0.45);
    var z = r.pz - r.dir[0] * (k || 0) - r.dir[1] * (r.d + 0.45);
    c.tryProp(ref, x, z, r.rot, { s: 0.26, tag: 'vehicle' });
  }

  function steeple(r) {
    var g = new THREE.Group();
    var x = r.px + r.dir[1] * (r.w / 2 - 0.2) - r.dir[0] * 0.3;
    var z = r.pz - r.dir[0] * (r.w / 2 - 0.2) - r.dir[1] * 0.3;
    g.add(box(0.3, 0.8, 0.3, 0xf1ece2, x, 0, z));
    g.add(box(0.12, 0.2, 0.012, 0x2f4a78, x, 0.45, z + 0.153));
    var cone = new THREE.Mesh(new THREE.ConeGeometry(0.24, 0.5, 4), color(0x8a4a3a));
    cone.position.set(x, 0.8 + 0.25, z);
    cone.rotation.y = Math.PI / 4;
    cone.castShadow = true;
    g.add(cone);
    g.add(box(0.02, 0.16, 0.02, 0xffc044, x, 1.3, z));
    g.add(box(0.1, 0.02, 0.02, 0xffc044, x, 1.4, z));
    c.root.add(g);
  }

  // the park is a business of its own, built up in layers over four levels
  function parkBiz() {
    var x0 = 2;
    var x1 = 9;
    var z0 = 1;
    var z1 = 4;
    var r = { px: (x0 + x1) / 2, pz: z1, rot: 0, dir: [0, 1], w: x1 - x0, d: z1 - z0, s: 1 };
    var foot = c.claim({ x0: x0, x1: x1, z0: z0, z1: z1 }, 'park');
    var layers = [site('park', r, 'Park', short(PARK.cost[0]))];
    var mk = function () { return new THREE.Group(); };
    var addProp = function (g, ref, x, z, rot, sc) {
      var m = lib.model(ref);
      var mat = c.matrix(x, 0, z, rot || 0, sc || 1);
      m.parts.forEach(function (p) {
        var mesh = new THREE.Mesh(p.geom, p.mat);
        mesh.matrixAutoUpdate = false;
        mesh.matrix.copy(mat);
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        g.add(mesh);
      });
    };
    var l1 = mk();
    l1.add(box(x1 - x0, 0.01, z1 - z0, 0x7ccf62, (x0 + x1) / 2, 0.012, (z0 + z1) / 2));
    l1.add(box(x1 - x0 - 0.3, 0.012, 0.28, PLAZA, (x0 + x1) / 2, 0.02, 2.5));
    l1.add(box(0.28, 0.012, z1 - z0 - 0.3, PLAZA, 5.5, 0.02, 2.5));
    [2.5, 3.6, 7.5, 8.6].forEach(function (x, i) { addProp(l1, 'suburban/tree-large', x, i % 2 ? 1.5 : 3.5, i, 1.6); });
    [3.6, 7.4].forEach(function (x) { addProp(l1, 'roads/light-curved', x, 2.1, Math.PI, 1); });
    layers.push(l1);
    var l2 = mk();
    var plaza = new THREE.Mesh(new THREE.CylinderGeometry(0.95, 0.95, 0.012, 24), color(PLAZA));
    plaza.position.set(5.5, 0.026, 2.5);
    l2.add(plaza);
    var basin = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.55, 0.1, 20), color(0xd5d9e8));
    basin.position.set(5.5, 0.07, 2.5);
    basin.castShadow = true;
    l2.add(basin);
    var water = new THREE.Mesh(new THREE.CylinderGeometry(0.44, 0.44, 0.02, 20), color(0x6cc7ee));
    water.position.set(5.5, 0.125, 2.5);
    l2.add(water);
    l2.add(box(0.1, 0.34, 0.1, 0xe8eaf4, 5.45, 0.1, 2.45));
    layers.push(l2);
    var l3 = mk();
    var pond = new THREE.Mesh(new THREE.CylinderGeometry(0.62, 0.62, 0.014, 22), color(0x62b9e6));
    pond.scale.set(1.2, 1, 0.8);
    pond.position.set(7.8, 0.022, 3.1);
    l3.add(pond);
    [[7.2, 3.6], [8.4, 3.55], [7.8, 2.45]].forEach(function (q) { l3.add(box(0.36, 0.18, 0.3, 0x56b45c, q[0], 0, q[1])); });
    [4.6, 6.4].forEach(function (x) {
      l3.add(box(0.3, 0.05, 0.1, 0x8a5a34, x, 0.09, 3.6));
      l3.add(box(0.3, 0.1, 0.02, 0x8a5a34, x, 0.14, 3.67));
    });
    layers.push(l3);
    var l4 = mk();
    [[3.2, 1.9], [3.8, 1.9], [7.2, 1.9], [7.8, 1.9], [3.2, 3.4], [3.8, 3.4]].forEach(function (q, i) {
      addProp(l4, ['nature/flower_redA', 'nature/flower_yellowA', 'nature/flower_purpleA'][i % 3], q[0], q[1], i, 1.4);
    });
    addProp(l4, 'nature/statue_column', 5.5, 3.5, 0, 0.55);
    [2.4, 8.7].forEach(function (x) { addProp(l4, 'suburban/tree-small', x, 2.5, 0, 1.9); });
    layers.push(l4);
    layers.forEach(function (l, i) { if (i) mergeGroup(l); });
    c.biz.park = { foot: foot, rec: r, cum: true, build: function () { return layers; }, pick: function (st) { return st; }, h: 1, at: [5.5, 0, 4.3],
      top: function () { return [5.5, 0.7, 2.5]; } };
  }

  // a park bench: seat and back, facing +z when rot is 0
  function bench(x, z, rot) {
    var g = new THREE.Group();
    g.add(box(0.34, 0.04, 0.12, 0x8a5a34, 0, 0.08, 0));
    g.add(box(0.34, 0.1, 0.02, 0x8a5a34, 0, 0.13, -0.06));
    g.add(box(0.03, 0.08, 0.1, 0x555a6a, -0.14, 0, 0));
    g.add(box(0.03, 0.08, 0.1, 0x555a6a, 0.14, 0, 0));
    g.position.set(x, 0, z);
    g.rotation.y = rot || 0;
    c.root.add(g);
    var ex = Math.abs(Math.cos(rot || 0)) * 0.17 + Math.abs(Math.sin(rot || 0)) * 0.07;
    var ez = Math.abs(Math.cos(rot || 0)) * 0.07 + Math.abs(Math.sin(rot || 0)) * 0.17;
    c.claim({ x0: x - ex, x1: x + ex, z0: z - ez, z1: z + ez }, 'bench', true);
  }

  // a belt of trees round the town, where nothing else stands
  function belt() {
    var k = 0;
    var tree = function (x, z) {
      var t = k++ % 3;
      var jx = (rng() - 0.5) * 0.4;
      var jz = (rng() - 0.5) * 0.4;
      if (t === 2) c.tryProp('suburban/tree-small', x + jx, z + jz, rng() * 6, { s: 1.7 + rng() * 0.4, tag: 'tree', shrink: 0.05 });
      else c.tryProp('suburban/tree-large', x + jx, z + jz, rng() * 6, { s: 1.5 + rng() * 0.5, tag: 'tree', shrink: 0.04 });
    };
    for (var r = 0; r < 3; r++) {
      for (var x = -33; x <= 33; x += 0.8) {
        tree(x, -5 - r * 0.8 + (x * 7 % 2) * 0.2);
        tree(x, 24.8 + r * 0.8);
      }
      for (var z = -4.4; z <= 24.8; z += 0.8) {
        tree(-25.8 - r * 0.8, z);
        tree(27.6 + r * 0.8, z);
      }
    }
  }

  // allotments and a greenhouse on a rectangle of ground
  function garden(x0, z0, x1, z1) {
    lawn(x0, z0, x1, z1, 0x9ad07d);
    var cols = Math.floor((x1 - x0 - 0.9) / 0.75);
    for (var i = 0; i < cols; i++) {
      var bx = x0 + 0.15 + i * 0.75;
      var f = c.claim({ x0: bx, x1: bx + 0.42, z0: z0 + 0.2, z1: z1 - 0.9 }, 'bed', true);
      c.slab(f.x0, f.z0, f.x1, f.z1, 0x7a5230, 0.016, 0.006);
      for (var z = f.z0 + 0.15; z < f.z1 - 0.1; z += 0.28) {
        var ref = ['nature/flower_redA', 'nature/flower_yellowA', 'nature/flower_purpleA'][(i + Math.round(z * 3)) % 3];
        c.put(ref, bx + 0.21, z, i * 2 + z, { y: 0.02, s: 1.5 });
      }
    }
    // the greenhouse: a glass box with a shallow roof, and a shed beside it
    var gx = x0 + 0.2;
    var gz = z1 - 0.8;
    c.claim({ x0: gx, x1: gx + 1.0, z0: gz, z1: gz + 0.55 }, 'greenhouse', true);
    var gh = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.32, 0.55), new THREE.MeshLambertMaterial({ color: 0xbfe8e0, transparent: true, opacity: 0.6 }));
    gh.position.set(gx + 0.5, 0.16, gz + 0.275);
    gh.castShadow = true;
    c.root.add(gh);
    var roof = new THREE.Mesh(new THREE.BoxGeometry(1.04, 0.04, 0.6), color(0xdfe4f0));
    roof.position.set(gx + 0.5, 0.34, gz + 0.275);
    c.root.add(roof);
    c.root.add(box(0.03, 0.32, 0.03, 0xdfe4f0, gx, 0, gz));
    c.root.add(box(0.03, 0.32, 0.03, 0xdfe4f0, gx + 1.0, 0, gz));
    c.claim({ x0: gx + 1.15, x1: gx + 1.5, z0: gz + 0.1, z1: gz + 0.45 }, 'shed', true);
    c.root.add(box(0.35, 0.22, 0.35, 0x8a5a34, gx + 1.325, 0, gz + 0.275));
  }

  function court(x0, z0, x1, z1) {
    c.claim({ x0: x0, x1: x1, z0: z0, z1: z1 }, 'court', true);
    c.slab(x0, z0, x1, z1, 0x4a7ab8, 0.016, 0.004);
    lineBox(x0 + 0.05, z0 + 0.05, x1 - 0.05, z0 + 0.08, 0xffffff);
    lineBox(x0 + 0.05, z1 - 0.08, x1 - 0.05, z1 - 0.05, 0xffffff);
    lineBox(x0 + 0.05, z0 + 0.05, x0 + 0.08, z1 - 0.05, 0xffffff);
    lineBox(x1 - 0.08, z0 + 0.05, x1 - 0.05, z1 - 0.05, 0xffffff);
    [x0 + 0.12, x1 - 0.12].forEach(function (x) {
      c.root.add(box(0.02, 0.3, 0.02, 0x555a6a, x, 0, (z0 + z1) / 2));
      c.root.add(box(0.012, 0.1, 0.16, 0xffffff, x, 0.28, (z0 + z1) / 2));
    });
  }

  function special(R) {
    // the school in the middle of its campus
    lotsAlong('x', -1, -14.7, -10.5, 'S', [B('school')]);
    c.slab(-17.4, -3.9, -14.8, -1.0, 0x565b6e);
    tintedCar('car/delivery', -16.1, -2.5, 0, 0xffd23a);
    [[-16.9, -2.0], [-16.1, -2.0], [-15.3, -2.0], [-16.9, -3.1], [-16.1, -3.1], [-15.3, -3.1]].forEach(function (q, i) {
      c.tryProp(CARS[(i * 2) % CARS.length], q[0], q[1], i % 2 ? 0 : Math.PI, { s: 0.26, tag: 'car' });
    });
    lawn(-10.4, -3.9, -8, -1.0);
    lawn(-14.7, -3.9, -10.5, -1.0);
    c.tryProp('suburban/tree-large', -9.4, -1.8, 0, { s: 1.6, tag: 'tree' });
    c.tryProp('suburban/tree-large', -8.6, -3.1, 0, { s: 1.6, tag: 'tree' });
    // the school grounds behind the building: trees along the back, a swing set and a slide on sand
    for (var tx = -14.4; tx < -8.3; tx += 0.9) c.tryProp('suburban/tree-large', tx, -3.8, tx, { s: 1.6, tag: 'tree' });
    c.claim({ x0: -13.6, x1: -10.4, z0: -3.4, z1: -2.5 }, 'playground', true);
    c.slab(-13.6, -3.4, -10.4, -2.5, 0xe6d3a0, 0.016, 0.004);
    [-13.2, -12.4].forEach(function (x) {
      c.solid(x, 0.02, -3.0, 0.03, 0.3, 0.03, 0xdd5544);
      c.solid(x + 0.5, 0.02, -3.0, 0.03, 0.3, 0.03, 0xdd5544);
      c.solid(x + 0.25, 0.3, -3.0, 0.6, 0.03, 0.03, 0xdd5544);
      c.solid(x + 0.25, 0.1, -3.0, 0.04, 0.2, 0.02, 0x333344);
    });
    c.solid(-11.2, 0.02, -2.95, 0.5, 0.04, 0.3, 0xffc044);
    c.solid(-10.95, 0.02, -2.95, 0.04, 0.3, 0.3, 0x2f6e8f);
    // the forecourt of the school: a flagpole, benches and flower beds
    c.claim({ x0: -9.3, x1: -9.1, z0: -2.5, z1: -2.3 }, 'flagpole', true);
    c.solid(-9.2, 0, -2.4, 0.03, 0.9, 0.03, 0xdfe4f0);
    c.solid(-9.0, 0.7, -2.4, 0.3, 0.16, 0.02, 0xdd3a3a);
    [-9.9, -8.5].forEach(function (x) { bench(x, -1.5, 0); });
    [-10.1, -9.7, -8.7, -8.3].forEach(function (x, i) {
      c.claim({ x0: x - 0.15, x1: x + 0.15, z0: -2.0, z1: -1.8 }, 'bed', true);
      c.solid(x, 0, -1.9, 0.3, 0.05, 0.2, 0x7a5230);
      c.put(['nature/flower_redA', 'nature/flower_yellowA'][i % 2], x, -1.9, i, { y: 0.05, s: 1.4 });
    });
    for (var ty = -3.6; ty < -2.6; ty += 0.5) c.tryProp('suburban/tree-large', -8.5 - (ty + 3.6), ty, ty, { s: 1.6, tag: 'tree' });
    // the sports yard: a pitch, a court, a hedge round it
    c.claim({ x0: -8, x1: -2, z0: -4, z1: -1 }, 'sports yard');
    lawn(-8, -4, -2, -1, 0x8fd078);
    c.slab(-7.7, -3.6, -4.6, -1.6, 0x56a64a, 0.016, 0.004);
    lineBox(-7.65, -3.58, -4.65, -3.54, 0xffffff);
    lineBox(-7.65, -1.66, -4.65, -1.62, 0xffffff);
    lineBox(-7.65, -3.58, -7.61, -1.62, 0xffffff);
    lineBox(-4.69, -3.58, -4.65, -1.62, 0xffffff);
    lineBox(-6.17, -3.58, -6.13, -1.62, 0xffffff);
    c.slab(-4.3, -3.5, -2.4, -1.6, 0x4a7ab8, 0.016, 0.004);
    lineBox(-4.25, -3.46, -2.45, -3.43, 0xffffff);
    lineBox(-4.25, -1.67, -2.45, -1.64, 0xffffff);
    lineBox(-4.25, -3.46, -4.22, -1.64, 0xffffff);
    lineBox(-2.48, -3.46, -2.45, -1.64, 0xffffff);
    hedge(-8, -4, -2, -4);
    hedge(-8, -4, -8, -1.2);
    hedge(-2, -4, -2, -1.2);
    hedge(-8, -1.15, -2, -1.15, [-5, 0.5, -1.15, 0.2]);
    // the library at the circle
    var lib1 = lotsAlong('x', -3, -1.16, 1.16, 'S', [C + 'n']);
    signAt(lib1[0], 'Library', '#7a4a2a', 0.34, 0.9);
    [[-1.6, -2.5], [1.6, -2.5]].forEach(function (q) {
      c.tryProp('suburban/tree-large', q[0], q[1], 0, { s: 1.5, walk: true, tag: 'tree' });
    });
    c.tryProp('suburban/tree-large', -1.6, -3.5, 0, { s: 1.5, tag: 'tree' });
    c.tryProp('suburban/tree-large', 1.6, -3.5, 0, { s: 1.5, tag: 'tree' });
    R.ne.forEach(function (r) {
      if (r.it.tag === 'police') {
        signAt(r, '\u{1F46E} Police', '#2a4a8a', 0.4, 0.8);
        behind(r, 'car/police', 0);
      }
    });
    parkBiz();
    R.w2.forEach(function (r) { if (r.it.tag === 'church') steeple(r); });
    R.a4.forEach(function (r) {
      if (r.it.tag === 'fire') {
        signAt(r, '\u{1F692} Fire Station', '#b83a3a', 0.4, 0.9);
        behind(r, 'car/firetruck', -0.4);
      }
    });
    var hr = c.biz.hosp.rec;
    behind(hr, 'car/ambulance', -0.6);
    c.slab(hr.px - 0.9, hr.pz - hr.d - 0.75, hr.px + 0.9, hr.pz - hr.d - 0.15, 0xd9d6cc, 0.018, 0.003);
    square();
    scenery();
    entrance();
    // the crescent green: a path with benches and a statue
    c.slab(-15.6, 6.45, -2.4, 6.75, PLAZA, 0.018, 0.003);
    c.slab(-10, 6.1, -8, 7.1, PLAZA, 0.018, 0.003);
    c.claim({ x0: -15.6, x1: -2.4, z0: 6.45, z1: 6.75 }, 'path', true);
    c.put('nature/statue_column', -9, 6.6, 0, { s: 0.6 });
    [-14, -12, -6.5, -4.5].forEach(function (x) { bench(x, 6.95, Math.PI); });
    [-13, -5.5].forEach(function (x) { c.tryProp('roads/light-curved', x, 6.2, 0, { s: 1, tag: 'lamp' }); });
    yard(-14.5, -2, null, R.w3, 'garden', 6, undefined);
    // the bus station on Depot Street
    R.e1.forEach(function (r) {
      if (r.it.tag === 'bus') {
        signAt(r, 'Bus Station', '#2f6e8f', 0.34, 0.9);
        [-0.9, 0, 0.9].forEach(function (k) { behind(r, 'car/delivery', k); });
      }
    });
    garden(-24, 3.2, -19.5, 10.4);
    garden(-24, 17.8, -20.2, 21.4);
    court(-23.6, 21.9, -21.2, 23.7);
    belt();
  }

  // the town square on Main Street: plaza, fountain, benches, trees, cafe umbrellas
  function square() {
    var x0 = 2;
    var x1 = 9;
    var z0 = 11;
    var z1 = 14;
    c.slab(x0, z0, x1, z1, PLAZA, 0.016, 0.004);
    c.slab(x0 + 0.2, z0 + 0.2, x1 - 0.2, z1 - 0.2, 0xe9e2d2, 0.02, 0.002);
    var cx = 5.5;
    var cz = 12.5;
    var plaza = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 0.8, 0.012, 24), color(0xcfc6b2));
    plaza.position.set(cx, 0.03, cz);
    c.root.add(plaza);
    var basin = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.46, 0.1, 20), color(0xd5d9e8));
    basin.position.set(cx, 0.08, cz);
    basin.castShadow = true;
    c.root.add(basin);
    var water = new THREE.Mesh(new THREE.CylinderGeometry(0.36, 0.36, 0.02, 20), color(0x6cc7ee));
    water.position.set(cx, 0.135, cz);
    c.root.add(water);
    c.root.add(box(0.08, 0.3, 0.08, 0xe8eaf4, cx - 0.04, 0.12, cz - 0.04));
    [[3, 11.5], [8, 11.5], [3, 13.5], [8, 13.5]].forEach(function (q) { c.put('suburban/tree-large', q[0], q[1], 1, { s: 1.5, y: 0.02 }); });
    [[4.2, 11.4, 0], [6.8, 11.4, 0], [4.2, 13.6, Math.PI], [6.8, 13.6, Math.PI]].forEach(function (q) { bench(q[0], q[1], q[2]); });
    // cafe tables with umbrellas
    [[2.7, 12.5, 'a'], [3.4, 12.8, 'b'], [7.6, 12.5, 'b'], [8.3, 12.8, 'a']].forEach(function (q) {
      var m = lib.model('commercial/detail-parasol-' + q[2]);
      var mat = c.matrix(q[0], 0.02, q[1], 0, 1);
      m.parts.forEach(function (p) {
        var g = p.geom.clone();
        g.applyMatrix4(mat);
        c.addGeom(p.mat, g);
      });
    });
    c.put('nature/statue_column', 5.5, 13.65, 0, { s: 0.5, y: 0.02 });
    // a checker of two paving tones round the fountain, flower beds, lamps, kiosks and a clock tower
    for (var i = 0; i < 14; i++) {
      for (var j = 0; j < 6; j++) {
        if ((i + j) % 2) c.slab(x0 + 0.2 + i * 0.5, z0 + 0.2 + j * 0.43, x0 + 0.7 + i * 0.5, z0 + 0.63 + j * 0.43, 0xe2d8c2, 0.022, 0.002);
      }
    }
    [[4.7, 12.5], [6.3, 12.5], [5.5, 11.7], [5.5, 13.3]].forEach(function (q, k) {
      c.root.add(box(0.3, 0.05, 0.14, 0x7a5230, q[0], 0.02, q[1]));
      c.put(['nature/flower_redA', 'nature/flower_yellowA', 'nature/flower_purpleA', 'nature/flower_redA'][k], q[0], q[1], k, { y: 0.07, s: 1.6 });
    });
    [[2.4, 11.3], [8.6, 11.3], [2.4, 13.7], [8.6, 13.7]].forEach(function (q) { c.put('roads/light-curved-double', q[0], q[1], Math.PI / 2, { y: 0.02 }); });
    [[3.4, 11.5, 0], [7.6, 13.5, Math.PI]].forEach(function (q) {
      c.root.add(box(0.5, 0.3, 0.32, 0xf0d8a8, q[0], 0.02, q[1]));
      for (var s2 = 0; s2 < 6; s2++) c.root.add(box(0.085, 0.015, 0.2, s2 % 2 ? 0xfaf6ee : 0xd9433a, q[0] - 0.21 + s2 * 0.085, 0.32, q[1] + (q[2] ? -0.2 : 0.2)));
    });
    c.root.add(box(0.26, 0.95, 0.26, 0xe8dcc0, 2.7, 0.02, 12.6));
    var ck = document.createElement('canvas');
    ck.width = ck.height = 64;
    var cx2 = ck.getContext('2d');
    cx2.fillStyle = '#fff';
    cx2.beginPath();
    cx2.arc(32, 32, 30, 0, 7);
    cx2.fill();
    cx2.strokeStyle = '#333';
    cx2.lineWidth = 4;
    cx2.beginPath();
    cx2.moveTo(32, 32);
    cx2.lineTo(32, 12);
    cx2.moveTo(32, 32);
    cx2.lineTo(46, 36);
    cx2.stroke();
    var face = new THREE.Mesh(new THREE.CircleGeometry(0.1, 20), new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(ck) }));
    face.position.set(2.7, 0.82, 12.735);
    c.root.add(face);
    c.root.add(box(0.32, 0.08, 0.32, 0x8a4a3a, 2.7, 0.97, 12.6));
  }

  // hills, lakes and fields frame the town; the boulevard leaves through a welcome sign
  function scenery() {
    var hill = function (x, z, rx, ry, rz, col) {
      var h = new THREE.Mesh(new THREE.SphereGeometry(1, 20, 12), color(col));
      h.scale.set(rx, ry, rz);
      h.position.set(x, -ry * 0.25, z);
      h.receiveShadow = true;
      c.root.add(h);
    };
    var cols = [0x74b862, 0x6aae5c, 0x7fc06a, 0x62a456];
    for (var a = 0; a < 360; a += 14) {
      var rad = a * Math.PI / 180;
      var x = Math.cos(rad) * (54 + (a % 3) * 4);
      var z = 10 + Math.sin(rad) * (40 + (a % 4) * 3);
      if (Math.abs(x) < 6 && z > 20) continue;
      var sz = 8 + (a * 7 % 5) * 1.6;
      hill(x, z, sz * 1.5, 3 + (a * 3 % 4), sz, cols[(a / 14) % 4 | 0]);
    }
    hill(0, 64, 12, 6, 9, 0x6aae5c);
    // a lake in the north west and a pond in the north east
    var lake = function (x, z, r, sx) {
      var sand = new THREE.Mesh(new THREE.CylinderGeometry(r + 0.7, r + 0.7, 0.02, 32), color(0xe8d9a8));
      sand.scale.set(sx, 1, 0.75);
      sand.position.set(x, 0.011, z);
      c.root.add(sand);
      var w = new THREE.Mesh(new THREE.CylinderGeometry(r, r, 0.03, 32), color(0x5bb8e8));
      w.scale.set(sx, 1, 0.75);
      w.position.set(x, 0.02, z);
      c.root.add(w);
    };
    lake(-38, -9, 7, 1.4);
    lake(36, -12, 4, 1.2);
    // fields east and west of the belt
    [[33.5, -3, 5, 4, 0xd9c86a], [33.5, 2.5, 5, 4, 0xb9d06a], [33.5, 8, 5, 4, 0x9bc65a], [33.5, 13.5, 5, 4, 0xd9b86a], [33.5, 19, 5, 4, 0xb9d06a],
      [-33.5, 4, 5, 4, 0xb9d06a], [-33.5, 9.5, 5, 4, 0xd9c86a], [-33.5, 15, 5, 4, 0x9bc65a], [-33.5, 20.5, 5, 4, 0xd9b86a]].forEach(function (f) {
      c.slab(f[0] - f[2] / 2, f[1] - f[3] / 2, f[0] + f[2] / 2, f[1] + f[3] / 2, f[4], 0.012, 0.004);
      for (var i = 0; i < f[2]; i += 0.5) c.slab(f[0] - f[2] / 2 + i, f[1] - f[3] / 2, f[0] - f[2] / 2 + i + 0.12, f[1] + f[3] / 2, 0x000000 + (f[4] & 0xfefefe) / 2 | 0, 0.016, 0.002);
    });
    // fields beside the boulevard
    [[-8, 33], [-8, 41], [8, 33], [8, 41]].forEach(function (f, i) {
      c.slab(f[0] - 3.5, f[1] - 3.5, f[0] + 3.5, f[1] + 3.5, [0xd9c86a, 0xb9d06a][i % 2], 0.012, 0.004);
    });
  }

  function entrance() {
    var z = 28;
    c.claim({ x0: -0.45, x1: 0.45, z0: z - 0.1, z1: z + 0.1 }, 'welcome', true);
    c.solid(-0.4, 0, z, 0.05, 0.7, 0.05, 0x6b4a2a);
    c.solid(0.4, 0, z, 0.05, 0.7, 0.05, 0x6b4a2a);
    var m = new THREE.Mesh(new THREE.PlaneGeometry(0.85, 0.28), new THREE.MeshBasicMaterial({ map: label('Welcome to Main Street', '#2f6e3a', 512, 128) }));
    m.position.set(0, 0.55, z + 0.03);
    c.root.add(m);
    var back = new THREE.Mesh(new THREE.PlaneGeometry(0.85, 0.28), new THREE.MeshBasicMaterial({ map: label('Come again soon', '#2f6e3a', 512, 128) }));
    back.position.set(0, 0.55, z - 0.03);
    back.rotation.y = Math.PI;
    c.root.add(back);
  }

  function grounds(R) {
    // behind the rows
    yard(2, XE, null, R.ne, 'paved', -4.4, undefined);
    yard(XW, -17.4, null, R.nw, 'garden', -4.4, undefined);
    yard(9, 13, R.a1, R.a2, 'paved');
    yard(15, XE, R.a3, R.a4, 'paved');
    yard(2, 13, R.b1, R.b3, 'paved');
    yard(15, XE, R.b2, R.b4, 'paved');
    yard(9, 13, R.c1, R.c3, 'paved');
    yard(15, XE, R.c2, R.c4, 'paved');
    yard(2, 13, R.d1, R.d3, 'paved');
    yard(15, XE, R.d2, R.d4, 'paved');
    yard(2, XE, R.e1, null, 'paved', undefined, 24.4);
    yard(XW, -2, R.w1, null, 'garden', undefined, 4);
    yard(-16, -2, R.w4, R.w5, 'garden');
    yard(XW, -2, R.w6, R.w7, 'garden');
    yard(-16, -2, R.w8, null, 'garden', undefined, 24.4);
    yard(XW, -19.4, R.w6, null, 'garden', undefined, 24.4);
  }

  function signals() {
    [5, 10, 15, 20].forEach(function (z) {
      [[-1.75, z - 0.75], [1.75, z - 0.75], [-1.75, z + 0.75], [1.75, z + 0.75]].forEach(function (q) {
        c.tryProp('roads/traffic-light', q[0], q[1], q[0] < 0 ? Math.PI / 2 : -Math.PI / 2, { walk: true, onWalk: true, tag: 'signal' });
      });
    });
  }

  streets();
  c.placeRoads(function (x, z) { return false; });
  c.layWalks();
  var R = blocks();
  furnishAll();
  signals();
  special(R);
  grounds(R);
  c.region = district;
  c.finish();
  return c;
}

// which seed builds a spot: the homes and the school build the west, the shops build downtown, the hospital and the park
// the civic strip. The land round the town and the boulevard into it are there from the start.
export var WEST = 0;
export var DOWN = 1;
export var CIVIC = 2;
export function district(x, z, k) {
  if (x < -25.5 || x > 27.3 || z < -4.6 || z > 24.6) return WILD;
  if (k === 'road' && Math.abs(x) < 1.6 && z > 1.6) return WILD;
  if (x < -1.6) return WEST;
  if (z < 0.6 || x < 9.4 && z < 4.6) return CIVIC;
  return DOWN;
}
