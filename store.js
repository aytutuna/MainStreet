import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { clone } from 'three/addons/utils/SkeletonUtils.js';
import { PLAN, PW } from './plan.js';

var BASE = 'assets/models/';
var TILT = 52 * Math.PI / 180;

// The store is one open sales floor in a complete building, laid out in plan.js: x -15..15, z 2.5 (the glass front)
// back to -22.5, and the stockroom behind it to -28.5. In front: the parking lot, the sidewalk and the street.
var FRONT = 2.5;
var WING_X = 21.8;
var BACK = -22.5;
var EDGE = 15;
var SB = -28.5;
var LOT = [4, 9.6];
var WALK_N = 10.05;
var LANE_W = 11.25;
var LANE_E = 12.75;
var WALK_S = 13.95;
var AISLE = 6.8;
var DRIVE = 18;
var ROAD = 24.8;
var WALKS = [-9.5, 9.5];
var CROSS = PLAN.bank.cross;
var EXIT = PLAN.bank.exit;
// the kits are drawn at different sizes; these bring them to the shop kit's people
var SCALE = { car: 0.47, roads: 3, nature: 1.4, furn: 0.9, food: 0.5, sub: 3.2, toy: 1.1, forest: 0.9, golf: 0.45, pets: 0.08, tool: 0.03, pw: PW };

var FOLK = 'abcdef'.split('').reduce(function (a, c) { return a.concat(['chars/character-female-' + c, 'chars/character-male-' + c]); }, []);
var CARS = ['car/sedan', 'car/suv', 'car/suv-luxury', 'car/hatchback-sports', 'car/van'];

// Fixtures, with the surfaces their goods stand on, in the model's own frame (front toward +z). A shelf is stocked on
// both faces, two levels each; an end cap on its front only; tables, crates and pallets carry heaps, one kind of goods
// per section; coolers hold goods behind their glass, on two levels, and chests in their tub. A bunker is a chest
// left open. `stock` is overstock on a pallet, which nobody shops from
var WHITE = '@13,3>2,2';
var RED = '@13,3>2,1';
var KIND = {
  shelf: { ref: 'shop/shelf-boxes', two: true, rows: [0.18, 0.56], x: [-0.33, 0.33], z: [0.04, 0.32] },
  end: { ref: 'shop/shelf-end', rows: [0.18, 0.56], x: [-0.33, 0.33], z: [-0.36, -0.06] },
  table: { ref: 'shop/clothing-table', top: 0.35, x: [-0.4, 0.4], z: [-0.25, 0.1] },
  stand: { ref: 'shop/clothing-table@3,3>9,2', top: 0.35, x: [-0.4, 0.4], z: [-0.25, 0.1] },
  crate: { ref: 'shop/display-bread', top: 0.22, x: [-0.26, 0.26], z: [-0.2, 0.24] },
  pallet: { ref: 'shop/display-cans', top: 0.3, x: [-0.35, 0.35], z: [-0.35, 0.35] },
  cooler: { ref: 'shop/freezers-standing', rows: [0.1, 0.5], x: [-0.42, 0.42], z: [-0.33, -0.1] },
  coolerW: { ref: 'shop/freezers-standing' + WHITE, rows: [0.1, 0.5], x: [-0.42, 0.42], z: [-0.33, -0.1] },
  coolerR: { ref: 'shop/freezers-standing' + RED, rows: [0.1, 0.5], x: [-0.42, 0.42], z: [-0.33, -0.1] },
  tank: { ref: 'shop/freezers-standing@13,3>15,3;3,2>6,1', rows: [0.2, 0.6], x: [-0.42, 0.42], z: [-0.44, -0.16] },
  chest: { ref: 'shop/freezer', top: 0.06, x: [-0.34, 0.34], z: [-0.25, 0.25], flat: true },
  bunker: { ref: 'shop/freezer', top: 0.06, x: [-0.34, 0.34], z: [-0.25, 0.25], flat: true, open: true },
  stock: { ref: 'skate/pallet', top: 0.16, x: [-0.24, 0.24], z: [-0.24, 0.24], none: true }
};

// recoloured packaging: the label cell of each item moved round the atlas
function tints(ref, from, to) {
  return to.map(function (c) { return ref + '@' + from + '>' + c; });
}
var BOX = tints('shop/shelf-boxes.box', '15,2', ['15,2', '3,1', '4,1', '12,2', '8,1', '0,1']);
var PARCEL = 'shop/shelf-boxes.box@2,2>10,2;3,2>11,2;15,2>8,2~x';
var CARTON = tints('shop/shelf-boxes.carton', '7,1', ['7,1', '2,1', '12,2', '14,2', '10,1']);
var BAG = tints('shop/shelf-bags.bag', '15,2', ['15,2', '3,1', '4,1', '12,2', '10,1', '0,1']);


// what stands on overstock pallets
var OVERSTOCK = { boxes: ['furn/cardboardBoxClosed*1.2'] };

var IT = 64;
var IB = 118;
var cv;
var renderer;
var scene;
var cam;
var sun;
var onTap = function () {};
var cw = 1;
var ch = 1;
var ready = false;
var lib;
var root;
var bestId = null;
var VIEW_AZ = 0;
var focus = { x: 0, z: 0, dist: 30, az: VIEW_AZ };
var goal = null;
var azGoal = null;
var DMIN = 8;
var DMAX = 80;
var BOUNDS = [-26, 26, -36, 14];
var bump = {};
var tagsEl;
var arrowEl;
var loadingEl;
var ptr = {};
var drag = null;
var pinch = null;
var ray = new THREE.Raycaster();
var ndc = new THREE.Vector2();
var plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
var hitA = new THREE.Vector3();
var hitB = new THREE.Vector3();
var proj = new THREE.Vector3();
var picks = [];
var puffs = [];
var shops = {};
var order = [];
var outer = [];
var places = {};
var people = [];
var cars = [];
var bays = [];
var shadowDirty = true;

// WKWebView has no Safari token in its user agent, so GLTFLoader would pick the ImageBitmap path, which iOS 16 flips wrongly
var textureFix = function (parser) {
  return {
    name: 'TextureFix',
    beforeRoot: function () {
      var ua = navigator.userAgent;
      if (/AppleWebKit/.test(ua) && !/Chrome|Chromium|Edg/.test(ua)) parser.textureLoader = new THREE.TextureLoader(parser.options.manager);
    }
  };
};

// A ref names a model file, and optionally one product out of it, colours and a size:
//   shop/shelf-boxes          the shelf without the goods it comes with (see BARE)
//   shop/shelf-boxes.box      one of those goods on its own, standing on the origin
//   food/can@14,2>4,1         atlas cells moved to other cells, which recolours a label, a garment or a wrapper
//   furn/loungeSofa%carpet=5b7fc4   a named material in another colour
//   food/carrot~z             laid on its side, turned a quarter about z (or x)
//   holiday/present-a-cube*0.4      drawn that much bigger or smaller than the rest of its kit
var REF = /^([^.@%~*]+)(?:\.([\w-]+))?(?:@([\d,>;]+))?(?:%([\w=;]*))?(?:~([xz]))?(?:\*([\d.]+))?$/;
function parseRef(ref) {
  var m = REF.exec(ref);
  return {
    file: m[1],
    part: m[2] || null,
    cells: m[3] ? m[3].split(';').map(function (c) { return c.split('>').map(function (p) { return p.split(',').map(Number); }); }) : null,
    mats: m[4] ? m[4].split(';').map(function (c) { return c.split('='); }) : null,
    lay: m[5] || null,
    k: m[6] ? +m[6] : 1
  };
}

// fixtures whose goods are separate nodes; the bare fixture is stocked with other things in place
// the tools pack has near black wood and plastic, which would read as holes in the shelves
var TOOLTINT = { wood: 'c08a52', plastic: '4f5868', metal: 'e7e7e7', screw: 'e7e7e7' };

var BARE = { 'shop/shelf-boxes': 1, 'shop/shelf-bags': 1, 'shop/shelf-end': 1, 'shop/display-cans': 1, 'shop/display-bread': 1,
  'shop/clothing-table': 1, 'shop/hand-truck': 1 };

// The kit's coolers are solid boxes with their glass painted on (atlas cell 3,2). For goods to show, the glass gets
// its own see-through material, the body face behind it goes, and a lit inner box closes the opening
var glassMat = new THREE.MeshLambertMaterial({ color: 0xd8eef8, transparent: true, opacity: 0.25, depthWrite: false });
var innerMat = new THREE.MeshLambertMaterial({ color: 0xe6eef6, side: THREE.BackSide });
var waterMat = new THREE.MeshLambertMaterial({ color: 0x7fc8e8, transparent: true, opacity: 0.35, depthWrite: false });
var tankMat = new THREE.MeshLambertMaterial({ color: 0x4fa6c8, side: THREE.BackSide });
var shelfMat = new THREE.MeshLambertMaterial({ color: 0xc9d3de });
var COOLER = {
  'shop/freezers-standing': { face: 2, at: -0.055, inner: [-0.5, 0.5, 0.1, 0.9, -0.5, -0.06], shelf: 0.49 },
  'shop/freezer': { face: 1, at: 0.31, inner: [-0.4, 0.4, 0.06, 0.3, -0.3, 0.3] }
};

function cell(uv, a, b, c) {
  return [Math.floor((uv.getX(a) + uv.getX(b) + uv.getX(c)) / 3 * 16), Math.floor((uv.getY(a) + uv.getY(b) + uv.getY(c)) / 3 * 4)];
}

// splits a cooler's geometry into body and glass, leaving out the body face behind the glass
function openCooler(geom, cfg) {
  var g = geom.index ? geom.toNonIndexed() : geom;
  var pos = g.attributes.position;
  var uv = g.attributes.uv;
  var keep = [];
  var glass = [];
  var e1 = new THREE.Vector3();
  var e2 = new THREE.Vector3();
  var v = [new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3()];
  for (var t = 0; t < pos.count; t += 3) {
    var c = cell(uv, t, t + 1, t + 2);
    for (var i = 0; i < 3; i++) v[i].fromBufferAttribute(pos, t + i);
    e1.subVectors(v[1], v[0]);
    e2.subVectors(v[2], v[0]);
    var n = e1.cross(e2).toArray();
    var mid = (v[0].getComponent(cfg.face) + v[1].getComponent(cfg.face) + v[2].getComponent(cfg.face)) / 3;
    var big = Math.abs(n[cfg.face]) > Math.abs(n[(cfg.face + 1) % 3]) && Math.abs(n[cfg.face]) > Math.abs(n[(cfg.face + 2) % 3]) && n[cfg.face] > 0;
    if (c[0] === 3 && c[1] === 2) glass.push(t);
    else if (!(c[0] === 13 && c[1] === 3 && big && mid < cfg.at)) keep.push(t);
  }
  function pick(list) {
    var out = new THREE.BufferGeometry();
    Object.keys(g.attributes).forEach(function (k) {
      var a = g.attributes[k];
      var arr = new Float32Array(list.length * 3 * a.itemSize);
      list.forEach(function (t, j) {
        for (var q = 0; q < 3 * a.itemSize; q++) arr[j * 3 * a.itemSize + q] = a.array[t * a.itemSize + q];
      });
      out.setAttribute(k, new THREE.BufferAttribute(arr, a.itemSize));
    });
    return out;
  }
  var b = cfg.inner;
  var box = new THREE.BoxGeometry(b[1] - b[0], b[3] - b[2], b[5] - b[4]);
  box.translate((b[0] + b[1]) / 2, (b[2] + b[3]) / 2, (b[4] + b[5]) / 2);
  box.deleteAttribute('uv');
  var shelf = null;
  if (cfg.shelf) {
    shelf = new THREE.BoxGeometry(b[1] - b[0] - 0.02, 0.012, b[5] - b[4] - 0.02);
    shelf.translate((b[0] + b[1]) / 2, cfg.shelf, (b[4] + b[5]) / 2);
    shelf.deleteAttribute('uv');
  }
  return { body: pick(keep), glass: pick(glass), inner: box, shelf: shelf };
}

// moves every triangle whose middle lies in one atlas cell to another cell; the kits' atlases are 16 columns by 4 rows
function recolour(geom, cells) {
  var uv = geom.attributes.uv;
  if (!uv) return;
  var idx = geom.index ? geom.index.array : null;
  var n = idx ? idx.length : uv.count;
  var done = new Uint8Array(uv.count);
  // cells are judged on the UVs as they were: triangles of a quad share corners, and moved corners would mislead
  var src = uv.array.slice();
  var w = uv.itemSize;
  for (var t = 0; t < n; t += 3) {
    var a = idx ? idx[t] : t;
    var b = idx ? idx[t + 1] : t + 1;
    var c = idx ? idx[t + 2] : t + 2;
    var cu = Math.floor((src[a * w] + src[b * w] + src[c * w]) / 3 * 16);
    var cv = Math.floor((src[a * w + 1] + src[b * w + 1] + src[c * w + 1]) / 3 * 4);
    for (var i = 0; i < cells.length; i++) {
      var f = cells[i][0];
      var to = cells[i][1];
      if (f[0] !== cu || f[1] !== cv) continue;
      [a, b, c].forEach(function (v) {
        if (done[v]) return;
        done[v] = 1;
        uv.setXY(v, src[v * w] + (to[0] - f[0]) / 16, src[v * w + 1] + (to[1] - f[1]) / 4);
      });
      break;
    }
  }
  uv.needsUpdate = true;
}

// a model's meshes that share a material are drawn as one
function joinParts(parts) {
  var by = {};
  var out = [];
  parts.forEach(function (p) {
    var g = p.geom;
    var key = p.mat.uuid + (g.index ? 'i' : 'n') + Object.keys(g.attributes).sort().join();
    if (!by[key]) {
      by[key] = { mat: p.mat, list: [] };
      out.push(by[key]);
    }
    by[key].list.push(g);
  });
  return out.map(function (e) { return { geom: e.list.length > 1 ? mergeGeometries(e.list, false) : e.list[0], mat: e.mat }; });
}

// pw/Gondola_Island_10.goods is the goods of Gondola_Island_10_Stocked; pw/ProduceTable_15.goods-Apples those of ProduceTable_15_Apples
var GOODS = /^goods(-(\w+))?$/;

function loadModels(list, progress, done) {
  var loader = new GLTFLoader();
  loader.register(textureFix);
  var mats = {};
  var models = {};
  var files = {};
  list.forEach(function (ref) {
    var f = parseRef(ref).file;
    (files[f] = files[f] || []).push(ref);
  });
  var names = Object.keys(files);
  var n = 0;
  function material(src, kit, tint) {
    var see = src.transparent || src.opacity < 1;
    var key = kit + '|' + (src.map ? 'map' : tint ? '' : src.name + src.color.getHex()) + (tint || '') + (see ? 't' + src.opacity : '');
    if (mats[key]) return mats[key];
    if (src.map) {
      src.map.magFilter = THREE.NearestFilter;
      src.map.minFilter = THREE.NearestFilter;
      src.map.generateMipmaps = false;
      src.map.colorSpace = THREE.SRGBColorSpace;
    }
    var c = tint ? new THREE.Color(parseInt(tint, 16)) : src.map ? new THREE.Color(1, 1, 1) : src.color;
    var opt = src.map ? { map: src.map, color: c } : { color: c };
    if (see) {
      opt.transparent = true;
      opt.opacity = src.opacity;
      opt.depthWrite = false;
    }
    mats[key] = new THREE.MeshLambertMaterial(opt);
    return mats[key];
  }
  var missing = { parts: [], box: { x0: -0.3, x1: 0.3, z0: -0.3, z1: 0.3, y0: 0, h: 0.3 }, gltf: null };
  function one() {
    progress(++n / names.length);
    if (n === names.length) done();
  }
  // what a stocked Pipework fixture has over its empty one is its goods: the triangles of the stocked file that the empty
  // file lacks, one part per product (a run of joined vertices) with a rank for the shelves to empty in
  function goods(empty, full, k) {
    function pos(o) {
      var geom = o.geometry.index ? o.geometry.toNonIndexed() : o.geometry.clone();
      geom.applyMatrix4(o.matrixWorld);
      return geom;
    }
    function find(sc) {
      var out = null;
      sc.updateMatrixWorld(true);
      sc.traverse(function (o) { if (o.isMesh && !out) out = o; });
      return out;
    }
    function key(a, i) {
      return Math.round(a.getX(i) * 1000) + ',' + Math.round(a.getY(i) * 1000) + ',' + Math.round(a.getZ(i) * 1000);
    }
    function mid(a, t) {
      var x = 0;
      var y = 0;
      var z = 0;
      for (var j = 0; j < 3; j++) {
        x += a.getX(t * 3 + j);
        y += a.getY(t * 3 + j);
        z += a.getZ(t * 3 + j);
      }
      return Math.round(x / 3 * 1000) + ',' + Math.round(y / 3 * 1000) + ',' + Math.round(z / 3 * 1000);
    }
    var eo = find(empty.scene);
    var fo = find(full.scene);
    var ea = pos(eo).attributes.position;
    var fg = pos(fo);
    var fa = fg.attributes.position;
    var seen = {};
    var t;
    for (t = 0; t < ea.count / 3; t++) seen[mid(ea, t)] = 1;
    var own = [];
    for (t = 0; t < fa.count / 3; t++) if (!seen[mid(fa, t)]) own.push(t);
    // triangles that share a corner belong to the same product
    var up = {};
    function root(a) {
      while (up[a] !== a) a = up[a];
      return a;
    }
    own.forEach(function (t) {
      var r0 = null;
      for (var j = 0; j < 3; j++) {
        var c = key(fa, t * 3 + j);
        if (up[c] === undefined) up[c] = c;
        var rc = root(c);
        if (r0 === null) r0 = rc;
        else up[rc] = r0;
      }
    });
    var by = {};
    var names = [];
    own.forEach(function (t) {
      var c = root(key(fa, t * 3));
      if (!by[c]) {
        by[c] = [];
        names.push(c);
      }
      by[c].push(t);
    });
    var mat = material(fo.material, 'pw');
    var nm = fg.attributes.normal;
    var uv = fg.attributes.uv;
    return names.map(function (c, i) {
      var ts = by[c];
      var p = new Float32Array(ts.length * 9);
      var n = new Float32Array(ts.length * 9);
      var u = new Float32Array(ts.length * 6);
      ts.forEach(function (t, a) {
        for (var j = 0; j < 3; j++) {
          var v = t * 3 + j;
          p[a * 9 + j * 3] = fa.getX(v) * k;
          p[a * 9 + j * 3 + 1] = fa.getY(v) * k;
          p[a * 9 + j * 3 + 2] = fa.getZ(v) * k;
          n[a * 9 + j * 3] = nm.getX(v);
          n[a * 9 + j * 3 + 1] = nm.getY(v);
          n[a * 9 + j * 3 + 2] = nm.getZ(v);
          u[a * 6 + j * 2] = uv.getX(v);
          u[a * 6 + j * 2 + 1] = uv.getY(v);
        }
      });
      var geom = new THREE.BufferGeometry();
      geom.setAttribute('position', new THREE.BufferAttribute(p, 3));
      geom.setAttribute('normal', new THREE.BufferAttribute(n, 3));
      geom.setAttribute('uv', new THREE.BufferAttribute(u, 2));
      var rk = (i + 1) * 0.6180339887;
      return { geom: geom, mat: mat, u: rk - Math.floor(rk) };
    });
  }
  function make(g, ref, full) {
    var r = parseRef(ref);
    var kit = r.file.split('/')[0];
    var k = (SCALE[kit] || 1) * r.k;
    if (full) {
      models[ref] = { parts: goods(g, full, k), box: { x0: 0, x1: 0, z0: 0, z1: 0, y0: 0, h: 0 }, gltf: null };
      return;
    }
    // the tools lie in the side plane of their file; turned, they face the camera
    var spin = new THREE.Matrix4().makeRotationY(-Math.PI / 2);
    var skinned = false;
    g.scene.traverse(function (o) { if (o.isSkinnedMesh) skinned = true; });
    g.scene.updateMatrixWorld(true);
    var meshes = [];
    var origin = null;
    g.scene.traverse(function (o) {
      if (!o.isMesh) return;
      if (r.part) {
        // a node of several materials loads as a group of meshes; repeated names get a suffix, so this is the first one
        var own = o.name === r.part ? o : o.parent && o.parent.name === r.part ? o.parent : null;
        if (!own || origin && origin !== own) return;
        origin = own;
      } else if (BARE[r.file] && o.parent && o.parent.isMesh) return;
      meshes.push(o);
    });
    var at = new THREE.Matrix4();
    if (origin) at.makeTranslation(-origin.matrixWorld.elements[12], -origin.matrixWorld.elements[13], -origin.matrixWorld.elements[14]);
    var parts = [];
    var box = new THREE.Box3();
    meshes.forEach(function (o) {
      var geom = o.geometry.clone();
      if (!o.isSkinnedMesh) geom.applyMatrix4(new THREE.Matrix4().multiplyMatrices(at, o.matrixWorld));
      ['color', 'tangent', 'uv1', 'uv2'].forEach(function (a) { if (geom.attributes[a]) geom.deleteAttribute(a); });
      var cool = COOLER[r.file] && !r.part ? COOLER[r.file] : null;
      if (r.cells && !cool) recolour(geom, r.cells);
      var tint = null;
      // an empty material name tints the whole model
      (r.mats || []).forEach(function (mt) { if (!mt[0] || mt[0] === o.material.name) tint = mt[1]; });
      if (kit === 'tool') {
        geom.applyMatrix4(spin);
        if (!tint) tint = TOOLTINT[o.material.name] || null;
      }
      geom.computeBoundingBox();
      box.union(geom.boundingBox);
      if (cool) {
        var oc = openCooler(geom, cool);
        if (r.cells) recolour(oc.body, r.cells);
        // glass recoloured blue holds water: a fish tank
        var wet = !!r.cells && r.cells.some(function (c) { return c[0][0] === 3 && c[0][1] === 2; });
        parts.push({ geom: oc.body, mat: material(o.material, kit, tint) }, { geom: oc.glass, mat: wet ? waterMat : glassMat }, { geom: oc.inner, mat: wet ? tankMat : innerMat });
        if (oc.shelf) parts.push({ geom: oc.shelf, mat: shelfMat });
      } else parts.push({ geom: geom, mat: material(o.material, kit, tint) });
    });
    if (r.lay) {
      var turn = new THREE.Matrix4()[r.lay === 'x' ? 'makeRotationX' : 'makeRotationZ'](Math.PI / 2);
      parts.forEach(function (p) { p.geom.applyMatrix4(turn); });
      box.makeEmpty();
      parts.forEach(function (p) {
        p.geom.computeBoundingBox();
        box.union(p.geom.boundingBox);
      });
    }
    // the furniture kit puts its models' corner at the origin; the tools are off centre and float
    var sm = new THREE.Matrix4().makeScale(k, k, k);
    if (kit === 'furn') sm.multiply(new THREE.Matrix4().makeTranslation(-(box.min.x + box.max.x) / 2, 0, -(box.min.z + box.max.z) / 2));
    if (kit === 'tool') sm.multiply(new THREE.Matrix4().makeTranslation(-(box.min.x + box.max.x) / 2, -box.min.y, -(box.min.z + box.max.z) / 2));
    if (!skinned) {
      parts.forEach(function (p) { p.geom.applyMatrix4(sm); });
      box.applyMatrix4(sm);
      parts = joinParts(parts);
    } else box.set(new THREE.Vector3(-0.2, 0, -0.2), new THREE.Vector3(0.2, 0.75, 0.2));
    models[ref] = { parts: parts, box: { x0: box.min.x, x1: box.max.x, z0: box.min.z, z1: box.max.z, y0: box.min.y, h: box.max.y }, gltf: skinned ? g : null };
  }
  names.forEach(function (f) {
    loader.load(BASE + f + '.glb', function (g) {
      var wants = files[f].filter(function (ref) { return GOODS.test(parseRef(ref).part); });
      files[f].forEach(function (ref) { if (wants.indexOf(ref) < 0) make(g, ref); });
      var left = wants.length;
      if (!left) return one();
      wants.forEach(function (ref) {
        var suffix = GOODS.exec(parseRef(ref).part)[2] || 'Stocked';
        loader.load(BASE + f + '_' + suffix + '.glb', function (full) {
          make(g, ref, full);
          if (!--left) one();
        }, undefined, function () {
          console.warn('missing model', f + '_' + suffix);
          if (!--left) one();
        });
      });
    }, undefined, function () {
      console.warn('missing model', f);
      one();
    });
  });
  return { model: function (ref) { return models[ref] || missing; } };
}

// every model the store can show, gathered from the tables
function modelList() {
  var seen = {};
  function walk(v) {
    if (typeof v === 'string') {
      if (v.indexOf('/') > 0) seen[v.replace(/^\w+:/, '')] = 1;
    } else if (Array.isArray(v)) v.forEach(walk);
    else if (v && typeof v === 'object') Object.keys(v).forEach(function (k) { walk(v[k]); });
  }
  Object.keys(KIND).forEach(function (k) { seen[KIND[k].ref] = 1; });
  walk(PLAN.areas);
  walk(PLAN.front);
  walk(PLAN.decor);
  walk(PLAN.wing);
  walk(FLOWERS);
  walk(OVERSTOCK.boxes);
  walk(['food/plate-rectangle*0.55', 'skate/pallet', 'shop/character-employee@5,3>2,2', 'shop/freezers-standing@13,3>2,2',
    'shop/freezers-standing@13,3>2,1', PARCEL, STAFF]);
  ['shop/wall', 'shop/wall-window', 'shop/column', 'shop/floor', 'shop/floor%=d5d5d8', 'shop/cash-register', 'shop/character-employee', 'arcade/cash-register', 'pw/Checkout_Lane_30', 'pw/LaneLight_Pole_01',
    'pw/Basket_Stack_01', 'pw/SelfCheckout_Kiosk_01', 'pw/SelfCheckout_Attendant_01', 'pw/ServiceDesk_20', 'pw/CartCorral_Indoor_20', 'pw/ShoppingCart_Nested_3_01',
    'shop/hand-truck', 'shop/shopping-basket', 'shop/shopping-basket*0.62', 'furn/cardboardBoxClosed', 'furn/cardboardBoxOpen', 'furn/rugDoormat',
    'furn/bench', 'furn/trashcan', 'furn/pottedPlant', 'sub/planter', 'roads/road-straight', 'roads/road-crossing', 'roads/light-square',
    'roads/light-curved', 'roads/construction-fence', 'roads/construction-light', 'roads/construction-barrier', 'roads/construction-cone',
    'roads/dumpster', 'roads/road-sign-street', 'car/taxi', 'car/delivery', 'car/tractor-shovel', 'car/box', 'car/truck-flat',
    'nature/tree_oak', 'nature/tree_default', 'nature/tree_fat', 'nature/tree_detailed', 'nature/tree_pineRoundC', 'nature/plant_bush',
    'nature/plant_bushLarge', 'food/bag', 'food/bag-flat', 'nature/flower_redA', 'nature/flower_yellowA', 'nature/flower_purpleA',
    'forest/fence', 'nature/tree_small', 'furn/plantSmall2*1.6', 'sub/building-type-a', 'sub/building-type-c', 'sub/building-type-e', 'sub/building-type-h',
    'sub/building-type-k', 'sub/tree-large'].forEach(function (r) { seen[r] = 1; });
  FOLK.forEach(function (r) { seen[r] = 1; });
  CARS.forEach(function (r) { seen[r] = 1; });
  return Object.keys(seen);
}

// a day lasts eight minutes: five of daylight, a dusk, two of night and a dawn. Only the light changes, so the shadows
// stay put and need no redraw
var DAY = 480;
var hemi;
var skyDay = new THREE.Color(0xa9d8ee);
var skyNight = new THREE.Color(0x27335c);
var hemiDay = new THREE.Color(0xffffff);
var hemiNight = new THREE.Color(0x8fa0d8);
var lampOn = new THREE.Color(0xffe2a0);
var dayT = 60;

function daylight() {
  var t = dayT % DAY;
  if (t < 300) return 1;
  if (t < 340) return 1 - (t - 300) / 40;
  if (t < 440) return 0;
  return (t - 440) / 40;
}

function dayStep(dt) {
  dayT += dt;
  var l = daylight();
  var k = l * l * (3 - 2 * l);
  sun.intensity = 0.35 + 1.65 * k;
  hemi.intensity = 1.3 + 1.1 * k;
  hemi.color.copy(hemiNight).lerp(hemiDay, k);
  scene.background.copy(skyNight).lerp(skyDay, k);
  scene.fog.color.copy(scene.background);
  bulbMat.emissive.copy(lampOn).multiplyScalar(1 - k);
  doorMats.forEach(function (m) { m.emissive.setScalar(0.3 + 0.7 * (1 - k)); });
  poolMat.opacity = 0.5 * (1 - k);
  poolMat.visible = k < 0.98;
}

function sceneUp() {
  var dpr = window.devicePixelRatio || 1;
  renderer = new THREE.WebGLRenderer({ canvas: cv, antialias: dpr < 2, powerPreference: 'high-performance' });
  cv.addEventListener('webglcontextrestored', function () { shadowDirty = true; });
  renderer.setPixelRatio(Math.min(2, dpr));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.shadowMap.autoUpdate = false;
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0xa9d8ee);
  scene.fog = new THREE.Fog(0xa9d8ee, 90, 200);
  cam = new THREE.PerspectiveCamera(40, 1, 1, 400);
  hemi = new THREE.HemisphereLight(0xffffff, 0xb4bedc, 2.4);
  scene.add(hemi);
  sun = new THREE.DirectionalLight(0xfff3dc, 2.0);
  sun.position.set(-12, 30, 10);
  sun.target.position.set(0, 0, -6);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  var sc = sun.shadow.camera;
  sc.left = -22;
  sc.right = 22;
  sc.top = 26;
  sc.bottom = -26;
  sc.near = 2;
  sc.far = 80;
  sun.shadow.bias = -0.0006;
  sun.shadow.normalBias = 0.02;
  scene.add(sun);
  scene.add(sun.target);
  root = new THREE.Group();
  scene.add(root);
}

function resize() {
  var r = cv.getBoundingClientRect();
  cw = Math.max(1, Math.round(r.width));
  ch = Math.max(1, Math.round(r.height));
  if (renderer) renderer.setSize(cw, ch, false);
  if (cam) {
    cam.aspect = cw / ch;
    var dy = IT + (ch - IT - IB) / 2 - ch / 2;
    cam.setViewOffset(cw, ch, 0, -dy, cw, ch);
    cam.updateProjectionMatrix();
  }
  if (barsCv) {
    var dpr = Math.min(2, window.devicePixelRatio || 1);
    barsCv.width = Math.round(cw * dpr);
    barsCv.height = Math.round(ch * dpr);
  }
}

function place() {
  var cx = Math.cos(TILT);
  cam.position.set(focus.x + focus.dist * Math.sin(focus.az) * cx, focus.dist * Math.sin(TILT), focus.z + focus.dist * Math.cos(focus.az) * cx);
  cam.near = Math.max(0.5, focus.dist * 0.3);
  cam.far = focus.dist * 4 + 80;
  cam.updateProjectionMatrix();
  cam.lookAt(focus.x, 0, focus.z);
  cam.updateMatrixWorld(true);
  cutaway();
}

// outer walls on the camera's side drop to their foot, so the floor behind them stays in view
function cutaway() {
  var sx = Math.sin(focus.az);
  var sz = Math.cos(focus.az);
  outer.forEach(function (w) {
    var d = w.n[0] * sx + w.n[1] * sz;
    if (w.both) d = Math.abs(d);
    var s = d > 0.3 ? 0.12 : 1;
    if (w.g.scale.y !== s) {
      w.g.scale.y = s;
      shadowDirty = true;
    }
  });
}

// everything in the store faces the doors, so the camera turns no more than an eighth either way
var TURN = Math.PI / 4;

function clamp() {
  focus.az = Math.max(-TURN, Math.min(TURN, focus.az));
  focus.dist = Math.max(DMIN, Math.min(DMAX, focus.dist));
  focus.x = Math.max(BOUNDS[0], Math.min(BOUNDS[1], focus.x));
  focus.z = Math.max(BOUNDS[2], Math.min(BOUNDS[3], focus.z));
}

function under(sx, sy, out) {
  ndc.set(sx / cw * 2 - 1, -(sy / ch * 2 - 1));
  ray.setFromCamera(ndc, cam);
  return ray.ray.intersectPlane(plane, out);
}

function stepCam(dt) {
  if (azGoal !== null) {
    focus.az += (azGoal - focus.az) * Math.min(1, dt * 8);
    if (Math.abs(azGoal - focus.az) < 0.002) {
      focus.az = azGoal;
      azGoal = null;
    }
    place();
  }
  if (!goal) return;
  goal.t += dt;
  var u = Math.min(1, goal.t / goal.d);
  var e = u * u * (3 - 2 * u);
  focus.x = goal.x0 + (goal.x - goal.x0) * e;
  focus.z = goal.z0 + (goal.z - goal.z0) * e;
  focus.dist = goal.k0 + (goal.k - goal.k0) * e;
  if (u >= 1) goal = null;
}

// how far back the camera sits to show `w` units across the screen
function fit(w) {
  var h = Math.atan(Math.tan(cam.fov * Math.PI / 360) * cw / ch);
  return Math.max(DMIN, Math.min(DMAX, w / 2 / Math.tan(h) + 2));
}

function flyTo(x, z, dist, secs) {
  var d = Math.hypot(x - focus.x, z - focus.z);
  goal = { x0: focus.x, z0: focus.z, k0: focus.dist, x: x, z: z, k: dist === undefined ? focus.dist : dist, t: 0, d: secs || Math.min(1.2, 0.4 + d / 30) };
  return goal.d;
}

function bind() {
  cv.addEventListener('pointerdown', function (e) {
    if (e.isPrimary) {
      ptr = {};
      pinch = null;
      drag = null;
    }
    cv.setPointerCapture(e.pointerId);
    azGoal = null;
    ptr[e.pointerId] = { x: e.clientX, y: e.clientY };
    var ids = Object.keys(ptr);
    goal = null;
    if (ids.length === 1) {
      var r = cv.getBoundingClientRect();
      var g = under(e.clientX - r.left, e.clientY - r.top, new THREE.Vector3());
      drag = { id: e.pointerId, x0: e.clientX, y0: e.clientY, g: g, t: performance.now(), moved: false, button: e.button, az: focus.az };
    } else if (ids.length === 2) {
      var a = ptr[ids[0]];
      var b = ptr[ids[1]];
      pinch = { d: Math.hypot(a.x - b.x, a.y - b.y) || 1, k: focus.dist, ang: Math.atan2(b.y - a.y, b.x - a.x), az: focus.az };
      if (drag) drag.moved = true;
    }
  });
  cv.addEventListener('pointermove', function (e) {
    if (!ptr[e.pointerId]) return;
    ptr[e.pointerId] = { x: e.clientX, y: e.clientY };
    var r = cv.getBoundingClientRect();
    if (pinch) {
      var ids = Object.keys(ptr);
      var a = ptr[ids[0]];
      var b = ptr[ids[1]];
      var mx = (a.x + b.x) / 2 - r.left;
      var my = (a.y + b.y) / 2 - r.top;
      var before = under(mx, my, hitA);
      var bx = before ? before.x : focus.x;
      var bz = before ? before.z : focus.z;
      focus.dist = pinch.k * pinch.d / (Math.hypot(a.x - b.x, a.y - b.y) || 1);
      var da = Math.atan2(b.y - a.y, b.x - a.x) - pinch.ang;
      focus.az = pinch.az + Math.atan2(Math.sin(da), Math.cos(da));
      clamp();
      place();
      var after = under(mx, my, hitB);
      if (after) {
        focus.x += bx - after.x;
        focus.z += bz - after.z;
      }
      clamp();
      place();
      return;
    }
    if (!drag || e.pointerId !== drag.id) return;
    if (Math.abs(e.clientX - drag.x0) > 7 || Math.abs(e.clientY - drag.y0) > 7) drag.moved = true;
    if (!drag.moved) return;
    if (drag.button === 2 || e.shiftKey) {
      focus.az = drag.az - (e.clientX - drag.x0) * 0.008;
      clamp();
      place();
      return;
    }
    var p = under(e.clientX - r.left, e.clientY - r.top, hitA);
    if (p && drag.g) {
      focus.x += drag.g.x - p.x;
      focus.z += drag.g.z - p.z;
      clamp();
      place();
    }
  });
  function up(e) {
    delete ptr[e.pointerId];
    var left = Object.keys(ptr);
    if (pinch && left.length < 2) {
      pinch = null;
      var q = ptr[left[0]];
      if (q) {
        var r2 = cv.getBoundingClientRect();
        drag = { id: +left[0], x0: q.x, y0: q.y, g: under(q.x - r2.left, q.y - r2.top, new THREE.Vector3()), t: 0, moved: true, az: focus.az };
      } else drag = null;
      return;
    }
    if (!drag || e.pointerId !== drag.id) return;
    var d = drag;
    drag = null;
    if (!d.moved && performance.now() - d.t < 600 && e.type === 'pointerup') {
      var r = cv.getBoundingClientRect();
      onTap(hit(e.clientX - r.left, e.clientY - r.top));
    }
  }
  cv.addEventListener('pointerup', up);
  cv.addEventListener('pointercancel', up);
  cv.addEventListener('contextmenu', function (e) { e.preventDefault(); });
  cv.addEventListener('wheel', function (e) {
    e.preventDefault();
    var r = cv.getBoundingClientRect();
    var mx = e.clientX - r.left;
    var my = e.clientY - r.top;
    var b = under(mx, my, hitA);
    var bx = b ? b.x : focus.x;
    var bz = b ? b.z : focus.z;
    focus.dist *= Math.exp(e.deltaY * 0.0012);
    clamp();
    place();
    var a = under(mx, my, hitB);
    if (a) {
      focus.x += bx - a.x;
      focus.z += bz - a.z;
    }
    clamp();
    place();
  }, { passive: false });
}

function hit(sx, sy) {
  ndc.set(sx / cw * 2 - 1, -(sy / ch * 2 - 1));
  ray.setFromCamera(ndc, cam);
  var h = ray.intersectObjects(picks.filter(function (p) { return p.visible; }), false);
  if (h.length) return { kind: 'biz', id: h[0].object.userData.id };
  return { kind: 'none' };
}

function mesh(ref, x, z, rot, y) {
  var m = lib.model(ref);
  var g = new THREE.Group();
  m.parts.forEach(function (p) {
    var o = new THREE.Mesh(p.geom, p.mat);
    o.castShadow = true;
    o.receiveShadow = true;
    g.add(o);
  });
  g.position.set(x, (y || 0) - Math.min(0, m.box.y0), z);
  g.rotation.y = rot || 0;
  return g;
}

// fixed pieces are merged into one mesh per material, so a row of the mall is a few draw calls
function Batch() {
  var sets = {};
  var mtx = new THREE.Matrix4();
  var q = new THREE.Quaternion();
  var up = new THREE.Vector3(0, 1, 0);
  var one = new THREE.Vector3(1, 1, 1);
  // goods carry a rank from 0 to 1: a department draws the ones below how full its shelves are. A rank of -1 stays
  // on the shelf whatever the stock
  function put(geom, mat, x, y, z, rot, k, rank) {
    var goods = rank !== undefined;
    var key = mat.uuid + (geom.index ? 'i' : 'n') + Object.keys(geom.attributes).sort().join() + (goods ? 'g' : '');
    if (!sets[key]) sets[key] = { mat: mat, list: [], goods: goods, rank: [] };
    q.setFromAxisAngle(up, rot || 0);
    mtx.compose(new THREE.Vector3(x, y, z), q, k ? new THREE.Vector3(k, k, k) : one);
    sets[key].list.push(geom.clone().applyMatrix4(mtx));
    if (goods) sets[key].rank.push(rank);
  }
  this.sets = sets;
  this.add = function (ref, x, z, rot, y, skip) {
    var m = lib.model(ref);
    m.parts.forEach(function (p) { if (p.mat !== skip) put(p.geom, p.mat, x, (y || 0) - Math.min(0, m.box.y0), z, rot); });
  };
  this.model = function (ref, x, y, z, rot, k) {
    lib.model(ref).parts.forEach(function (p) { put(p.geom, p.mat, x, y, z, rot, k); });
  };
  this.plane = function (mat, w, h, x, y, z, rot, rank) {
    var g = new THREE.PlaneGeometry(w, h);
    put(g, mat, x, y, z, rot, 0, rank);
  };
  this.raw = function (ref, x, z, rot, y, k, rank) {
    lib.model(ref).parts.forEach(function (p) { put(p.geom, p.mat, x, y, z, rot, k, rank === undefined ? -1 : rank); });
  };
  // the goods of a stocked Pipework fixture, each product at its own rank shifted by salt
  this.pile = function (ref, x, z, rot, y, salt) {
    lib.model(ref).parts.forEach(function (p) {
      var r = p.u + salt;
      put(p.geom, p.mat, x, y || 0, z, rot, 0, r - Math.floor(r));
    });
  };
  this.take = function (o) {
    Object.keys(o.sets).forEach(function (key) {
      var from = o.sets[key];
      if (!sets[key]) sets[key] = { mat: from.mat, list: [], rank: [] };
      sets[key].goods = from.goods;
      sets[key].list = sets[key].list.concat(from.list);
      sets[key].rank = sets[key].rank.concat(from.rank);
    });
  };
  // a flat slab of one colour, for paving, asphalt and paint
  this.slab = function (mat, x0, x1, z0, z1, y, h) {
    var g = new THREE.BoxGeometry(x1 - x0, h || 0.02, z1 - z0);
    g.deleteAttribute('uv');
    put(g, dye(g, mat), (x0 + x1) / 2, (y || 0) - (h || 0.02) / 2, (z0 + z1) / 2, 0);
  };
  // a box of one colour with no texture, from y0 up to y1
  this.block = function (mat, x0, x1, z0, z1, y0, y1) {
    var g = new THREE.BoxGeometry(x1 - x0, y1 - y0, z1 - z0);
    g.deleteAttribute('uv');
    put(g, dye(g, mat), (x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2, 0);
  };
  // any flat geometry, lying at height y
  this.geom = function (g, mat, y) {
    put(g, mat.userData.flat ? dye(g, mat) : mat, 0, y, 0, 0);
  };
  this.bulb = function (x, y, z) {
    put(bulbGeo, bulbMat, x, y, z, 0);
  };
  this.pool = function (x, z) {
    put(poolGeo, poolMat, x, 0.07, z, 0);
  };
  this.light = function (x, z) {
    put(roomGeo, poolMat, x, 0.06, z, 0);
  };
  this.group = function (shadow) {
    var g = new THREE.Group();
    Object.keys(sets).forEach(function (k) {
      var list = sets[k].list;
      var o;
      if (sets[k].goods) {
        // lowest rank first, so the mesh can draw just the first part of its index
        var ord = list.map(function (x, i) { return i; }).sort(function (a, c) { return sets[k].rank[a] - sets[k].rank[c]; });
        var cum = [0];
        list = ord.map(function (i) {
          cum.push(cum[cum.length - 1] + (list[i].index ? list[i].index.count : list[i].attributes.position.count));
          return list[i];
        });
        o = new THREE.Mesh(mergeGeometries(list, false), sets[k].mat);
        o.userData.shelf = { rank: ord.map(function (i) { return sets[k].rank[i]; }), cum: cum };
      } else o = new THREE.Mesh(mergeGeometries(list, false), sets[k].mat);
      o.castShadow = shadow !== false && !sets[k].goods && !sets[k].mat.transparent && sets[k].mat !== poolMat && sets[k].mat !== bulbMat && sets[k].mat !== innerMat;
      o.receiveShadow = true;
      g.add(o);
    });
    return g;
  };
}

// draws the goods whose rank is below how full the shelves are. The sim's fill is read off window, since this module
// has a function of that name
function shelve(g, f) {
  g.traverse(function (o) {
    var sh = o.userData.shelf;
    if (!sh) return;
    var lo = 0;
    var hi = sh.rank.length;
    while (lo < hi) {
      var mid = (lo + hi) >> 1;
      if (sh.rank[mid] < f) lo = mid + 1;
      else hi = mid;
    }
    if (o.geometry.drawRange.count !== sh.cum[lo]) o.geometry.setDrawRange(0, sh.cum[lo]);
  });
}

function shelves(s) {
  var f = window.fill[s.id];
  if (f === s.stocked) return;
  s.stocked = f;
  if (s.merged) shelve(s.merged, f);
  s.pcs.forEach(function (pc) { if (pc && pc.gb) shelve(pc.gb, f); });
}

var bulbMat = new THREE.MeshLambertMaterial({ color: 0xfff3d0, emissive: 0x000000 });
var bulbGeo = new THREE.SphereGeometry(0.09, 8, 6);
function fade() {
  var c = document.createElement('canvas');
  c.width = c.height = 64;
  var x = c.getContext('2d');
  var g = x.createRadialGradient(32, 32, 0, 32, 32, 32);
  g.addColorStop(0, 'rgba(255,255,255,1)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  x.fillStyle = g;
  x.fillRect(0, 0, 64, 64);
  return new THREE.CanvasTexture(c);
}
var poolMat = new THREE.MeshBasicMaterial({ color: 0xffc870, map: fade(), transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending });
var poolGeo = new THREE.PlaneGeometry(2.8, 2.8).rotateX(-Math.PI / 2);
poolGeo.deleteAttribute('normal');
var roomGeo = new THREE.PlaneGeometry(4.4, 4.4).rotateX(-Math.PI / 2);
roomGeo.deleteAttribute('normal');
var LAMP = { 'roads/light-curved': [1.9, -0.55], 'roads/light-square': [1.72, -0.58] };

// a street lamp, and the bulb under the end of its arm
function lamp(b, ref, x, z, rot) {
  b.add(ref, x, z, rot);
  var l = LAMP[ref];
  b.bulb(x + l[1] * Math.sin(rot), l[0], z + l[1] * Math.cos(rot));
  b.pool(x + l[1] * Math.sin(rot), z + l[1] * Math.cos(rot));
}

var MAT = {};
function flat(c) {
  if (!MAT[c]) {
    MAT[c] = new THREE.MeshLambertMaterial({ color: c });
    MAT[c].userData.flat = true;
  }
  return MAT[c];
}

// plain colours in a batch share one material, the colour carried by each vertex, so a lot of colours is one draw call
var vcMat = new THREE.MeshLambertMaterial({ vertexColors: true });
function dye(g, mat) {
  if (!mat.userData.flat) return mat;
  var n = g.attributes.position.count;
  var a = new Float32Array(n * 3);
  for (var i = 0; i < n; i++) mat.color.toArray(a, i * 3);
  g.setAttribute('color', new THREE.BufferAttribute(a, 3));
  return vcMat;
}
var GRASS = 0x84c26c;
var PAVE = 0xd9d3c7;
var ASPHALT = 0x5b5e66;
var GRAVEL = 0xa39886;
var PAINT = 0xf4f2ea;

function floors(b, ref, x0, x1, z0, z1) {
  for (var x = x0 + 0.5; x < x1; x++) for (var z = z0 + 0.5; z < z1; z++) b.add(ref, x, z, 0);
}

var FACE = { s: 0, b: Math.PI / 2, n: Math.PI, k: -Math.PI / 2 };
// the way a fixture faces: a letter, or an angle in radians
function faceRot(f) {
  return typeof f === 'number' ? f : FACE[f];
}

function figure(ref, clip) {
  var m = lib.model(ref);
  var g = new THREE.Group();
  if (!m.gltf) return { obj: g, mixer: null, acts: {}, cur: null };
  var obj = clone(m.gltf.scene);
  var cells = parseRef(ref).cells;
  obj.traverse(function (o) {
    if (!o.isMesh) return;
    if (cells) {
      o.geometry = o.geometry.clone();
      recolour(o.geometry, cells);
    }
    o.material = m.parts[0].mat;
    o.castShadow = false;
  });
  g.add(obj);
  var f = { obj: g, mixer: new THREE.AnimationMixer(obj), acts: {}, cur: null, ref: ref };
  ['idle', 'walk', 'pick-up', 'sit'].forEach(function (c) {
    var a = THREE.AnimationClip.findByName(m.gltf.animations, c);
    if (a) f.acts[c] = f.mixer.clipAction(a);
  });
  act(f, clip || 'idle', 0);
  f.mixer.update(0);
  return f;
}

// staff stand on the same soft blob as shoppers; every blob but the stockers' is one instance of a single mesh
var figs = [];
var blobs;
var blobM = new THREE.Matrix4();
var blobP = new THREE.Vector3();
function crew(ref, clip) {
  var f = figure(ref, clip);
  figs.push(f.obj);
  return f;
}

function blobsStep() {
  var n = 0;
  for (var i = 0; i < figs.length && n < 256; i++) {
    var o = figs[i];
    var p = o;
    while (p.parent && p.visible) p = p.parent;
    if (!p.isScene || !o.visible) continue;
    o.getWorldPosition(blobP);
    blobM.makeRotationX(-Math.PI / 2).setPosition(blobP.x, 0.035, blobP.z);
    blobs.setMatrixAt(n++, blobM);
  }
  blobs.count = n;
  blobs.instanceMatrix.needsUpdate = true;
}

function act(f, name, fade) {
  var a = f.acts[name];
  if (!a || f.cur === a) return;
  a.reset().play();
  if (f.cur && fade) {
    a.crossFadeFrom(f.cur, fade, false);
  } else if (f.cur) f.cur.stop();
  f.cur = a;
}


function rotY(x, z, r) {
  var c = Math.cos(r);
  var s = Math.sin(r);
  return [x * c + z * s, -x * s + z * c];
}

// only round things are piled two deep; everything else is one layer. Heavy models are capped per section
var HEAP = { can: 1, apple: 1, orange: 1, lemon: 1, tomato: 1, onion: 1, coconut: 1, pear: 1, paprika: 1, avocado: 1, 'pumpkin-basic': 1, mushroom: 1 };
var CAP = { watermelon: 4, grapes: 6, pineapple: 8, cheese: 4, strawberry: 4, can: 12, 'soda-bottle': 16, lollypop: 12, popsicle: 16, mussel: 16,
  'vehicle-suv': 2, 'vehicle-racer': 2, 'vehicle-truck': 2, 'vehicle-monster-truck': 2, 'vehicle-speedster': 2, 'vehicle-vintage-racer': 2,
  'train-locomotive': 2, 'train-wagon': 2, 'train-tender': 2, 'cake-birthday': 1, cake: 1, pie: 1, turkey: 1, 'whole-ham': 2, broccoli: 6,
  cauliflower: 6, cabbage: 6, 'animal-fish': 3, 'tent-canvas': 1, 'resource-planks': 2, barrel: 4, workbench: 1,
  'kart-oobi': 1, snowman: 2, reindeer: 2, nutcracker: 4, 'wheel-default': 6, 'wheel-dark': 6, 'wheel-racing': 6, cone: 6, lantern: 4 };

function base(ref) {
  return parseRef(ref.replace(/^\w+:/, '')).file.split('/')[1];
}

// A few goods are built from several models: berries on a tray, bananas as a hand
function composite(ref) {
  var m = /^(\w+):(.+)$/.exec(ref);
  if (!m) return null;
  if (m[1] === 'flat') {
    var tray = 'food/plate-rectangle*0.55';
    var tb = lib.model(tray).box;
    var out = [[tray, 0, 0, 0, 0, 1]];
    var b = lib.model(m[2]).box;
    var step = (b.x1 - b.x0) * 0.95;
    for (var i = -0.5; i <= 0.5; i++) for (var j = -0.5; j <= 0.5; j++) out.push([m[2], i * step, j * step, i * 0.7 + j, tb.h - tb.y0 - 0.01, 1]);
    return { parts: out, box: { x0: tb.x0, x1: tb.x1, z0: tb.z0, z1: tb.z1, y0: 0, h: tb.h - tb.y0 + b.h - b.y0 } };
  }
  // a hand of four bananas fanned out from one stem
  var bb = lib.model(m[2]).box;
  var parts = [];
  var hb = { x0: 9, x1: -9, z0: 9, z1: -9, y0: 0, h: bb.h - bb.y0 };
  for (var k = 0; k < 4; k++) {
    var px = (k - 1.5) * 0.05;
    var pr = (k - 1.5) * 0.35;
    parts.push([m[2], px, 0, pr, 0, 1]);
    [[bb.x0, bb.z0], [bb.x1, bb.z0], [bb.x0, bb.z1], [bb.x1, bb.z1]].forEach(function (q) {
      var p = rotY(q[0], q[1], pr);
      hb.x0 = Math.min(hb.x0, px + p[0]);
      hb.x1 = Math.max(hb.x1, px + p[0]);
      hb.z0 = Math.min(hb.z0, p[1]);
      hb.z1 = Math.max(hb.z1, p[1]);
    });
  }
  return { parts: parts, box: hb };
}

var item = 0;

// Goods on a flat surface: as many of one item as fit in the rectangle x0..x1, z0..z1 (in the fixture's own frame,
// front toward +z), at height y. Round produce gets a second layer in the hollows of the first. Long items are turned
// if more of them fit that way, and an item too tall for its shelf or too big for its section is shrunk to fit
function fill(out, ref, x0, x1, z0, z1, y, heap, room) {
  var comp = composite(ref);
  var b = comp ? comp.box : lib.model(ref).box;
  var name = base(ref);
  var k = 1;
  if (room && b.h - b.y0 > room) k = room / (b.h - b.y0);
  var w = (b.x1 - b.x0) * k;
  var d = (b.z1 - b.z0) * k;
  var gap = heap ? 0.004 : 0.012;
  function fit(a, c) {
    return [Math.floor((x1 - x0 + gap) / (a + gap)), Math.floor((z1 - z0 + gap) / (c + gap))];
  }
  var s = fit(w, d);
  var t = fit(d, w);
  var turn = t[0] * t[1] > s[0] * s[1];
  var n = turn ? t : s;
  if (n[0] < 1 || n[1] < 1) {
    // bigger than the section either way: one, shrunk to fit
    var f = Math.min((x1 - x0) / w, (z1 - z0) / d);
    k *= f;
    w *= f;
    d *= f;
    n = [1, 1];
    turn = false;
  }
  var cap = CAP[name] || 10;
  while (n[0] * n[1] > cap) {
    if (n[0] >= n[1]) n[0]--;
    else n[1]--;
  }
  var iw = turn ? d : w;
  var id = turn ? w : d;
  var ax = x0 + (x1 - x0 - n[0] * iw - (n[0] - 1) * gap) / 2;
  var az = z0 + (z1 - z0 - n[1] * id - (n[1] - 1) * gap) / 2;
  // the item's own middle is not always its origin
  var c = turn ? rotY((b.x0 + b.x1) / 2 * k, (b.z0 + b.z1) / 2 * k, Math.PI / 2) : [(b.x0 + b.x1) / 2 * k, (b.z0 + b.z1) / 2 * k];
  var r = turn ? Math.PI / 2 : 0;
  var count = 0;
  // every item is numbered, and a piled item carries its layer, so a department can take whole items off its shelves
  function put(x, z, yy, rr, layer) {
    var num = item++;
    if (!comp) {
      out.push([ref, x, z, rr, yy, k, num, layer]);
      return;
    }
    comp.parts.forEach(function (p) {
      var q = rotY(p[1] * k, p[2] * k, rr);
      out.push([p[0], x + q[0], z + q[1], rr + p[3], yy + p[4] * k, k * p[5], num, layer]);
    });
  }
  var piled = heap && HEAP[name];
  for (var i = 0; i < n[0] && count < cap; i++) {
    for (var j = 0; j < n[1] && count < cap; j++) {
      put(ax + iw / 2 + i * (iw + gap) - c[0], az + id / 2 + j * (id + gap) - c[1], y, r, piled ? 0 : undefined);
      count++;
    }
  }
  if (!piled) return;
  var h = (b.h - b.y0) * k * 0.55;
  for (var i2 = 0; i2 < n[0] - 1 && count < cap * 1.6; i2++) {
    for (var j2 = 0; j2 < Math.max(1, n[1] - 1) && count < cap * 1.6; j2++) {
      var dz = n[1] > 1 ? id / 2 + gap / 2 : 0;
      put(ax + iw + i2 * (iw + gap) + gap / 2 - c[0], az + id / 2 + dz + j2 * (id + gap) - c[1], y + h, r + 0.6, 1);
      count++;
    }
  }
}

// the goods a fixture is stocked with, in its own frame. Shelves and coolers take [top, bottom] for a face, or a list
// of those for sections side by side; two-faced shelves take one face for each side. Tables, crates, pallets and
// chests take a list of goods, one per section across the top
function stock(kd, goods, out) {
  if (!goods) return;
  if (kd.none) {
    var ob = OVERSTOCK[goods];
    fill(out, ob[0], kd.x[0], kd.x[1], kd.z[0], kd.z[1], kd.top, false);
    var hb = lib.model(ob[0]).box;
    var layer = out.length;
    for (var o = 0; o < layer; o++) if (o % 3 !== 2) out.push([out[o][0], out[o][1], out[o][2], out[o][3] + 0.1, kd.top + hb.h - hb.y0 + 0.002, out[o][5]]);
    return;
  }
  if (kd.rows) {
    var faces = !kd.two ? [goods] : typeof goods[0] === 'string' ? [goods, goods] : [goods[0], goods[1] || goods[0]];
    faces.forEach(function (face, si) {
      var sd = si === 0 ? 1 : -1;
      var secs = typeof face[0] === 'string' ? [face] : face;
      var w = (kd.x[1] - kd.x[0]) / secs.length;
      secs.forEach(function (g, gi) {
        kd.rows.forEach(function (y, ri) {
          var top = ri === kd.rows.length - 1;
          var room = top ? (kd.ref === 'shop/freezers-standing' ? 0.32 : 0.3) : kd.rows[ri + 1] - y - 0.05;
          var ref = g[kd.rows.length - 1 - ri];
          var part = [];
          var za = sd > 0 ? kd.z[0] : -kd.z[1];
          var zb = sd > 0 ? kd.z[1] : -kd.z[0];
          fill(part, ref, kd.x[0] + gi * w + 0.01, kd.x[0] + (gi + 1) * w - 0.01, za, zb, y, false, room);
          part.forEach(function (p) {
            if (sd < 0) p[3] += Math.PI;
            out.push(p);
          });
        });
      });
    });
    return;
  }
  var n = goods.length;
  var sw = (kd.x[1] - kd.x[0]) / n;
  goods.forEach(function (ref, i) {
    fill(out, ref, kd.x[0] + i * sw + 0.01, kd.x[0] + (i + 1) * sw - 0.01, kd.z[0], kd.z[1], kd.top, !kd.flat, kd.flat ? 0.2 : 0.3);
  });
}

// a TV's picture: a bright canvas just in front of its screen, lit day and night
var screenMat = (function () {
  var c = document.createElement('canvas');
  c.width = 64;
  c.height = 40;
  var x = c.getContext('2d');
  var g = x.createLinearGradient(0, 0, 0, 40);
  g.addColorStop(0, '#6fc3ff');
  g.addColorStop(0.6, '#bfe8ff');
  g.addColorStop(0.61, '#69c25a');
  g.addColorStop(1, '#3e8f3a');
  x.fillStyle = g;
  x.fillRect(0, 0, 64, 40);
  x.fillStyle = '#ffe27a';
  x.beginPath();
  x.arc(48, 11, 6, 0, 7);
  x.fill();
  var t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return new THREE.MeshBasicMaterial({ map: t });
})();

// where an item goes when the shelves empty: the golden ratio spreads neighbours apart, and each fixture starts its
// sequence somewhere else. A piled item's rank keeps the second layer after the first, so nothing is left floating
function shelfRank(k, fx, num, layer) {
  var r = (num + 1) * 0.6180339887 + k * 0.37 + Math.abs(fx[1]) * 3.7 + Math.abs(fx[2]) * 5.3;
  r -= Math.floor(r);
  return layer === undefined ? r : (layer + r) / 2;
}

// one fixture (or a row of n alike) with its goods, merged into a batch, the places shoppers stand to look at it and
// its footprint. Placed in world coordinates by the middle of its footprint; its front faces `fx[3]`
function fixture(fx, k) {
  item = 0;
  var b = new Batch();
  var kd = KIND[fx[0]];
  var ref = kd ? kd.ref : fx[0];
  var box = lib.model(ref).box;
  var rot = faceRot(fx[3]);
  var copies = fx[6] || 1;
  var width = box.x1 - box.x0;
  var depth = box.z1 - box.z0;
  var sn = Math.sin(rot);
  var cs = Math.cos(rot);
  var spots = [];
  var c = rotY((box.x0 + box.x1) / 2, (box.z0 + box.z1) / 2, rot);
  for (var ci = 0; ci < copies; ci++) {
    var off = (ci - (copies - 1) / 2) * width;
    var wx = fx[1] + cs * off;
    var wz = fx[2] - sn * off;
    var ox = wx - c[0];
    var oz = wz - c[1];
    b.add(ref, ox, oz, rot, 0, kd && kd.open ? glassMat : null);
    var goods = [];
    if (kd) stock(kd, copies > 1 ? fx[4] && fx[4][ci] : fx[4], goods);
    (fx[5] || []).forEach(function (e) { goods.push(e.slice(0, 5).concat([e[5] || 1, item++])); });
    // goods are given by the height of the surface they stand on
    goods.forEach(function (g) {
      var p = rotY(g[1], g[2], rot);
      var gk = g[5] || 1;
      var gb = lib.model(g[0]).box;
      var rk = kd && kd.none || fx[7] === 'staff' ? -1 : shelfRank(k, fx, g[6], g[7]);
      b.raw(g[0], ox + p[0], oz + p[1], rot + g[3], g[4] - gb.y0 * gk, gk, rk);
      if (g[0].indexOf('televisionModern') >= 0) {
        var sp = rotY(g[1], g[2] + gb.z1 * gk + 0.004, rot);
        b.plane(screenMat, (gb.x1 - gb.x0) * gk * 0.86, (gb.h - gb.y0) * gk * 0.62, ox + sp[0], g[4] + (gb.h - gb.y0) * gk * 0.58, oz + sp[1], rot + g[3], rk);
      }
    });
    if (kd && kd.none || fx[7] === 'staff') continue;
    var st = depth / 2 + 0.28;
    spots.push({ at: [wx + sn * st, wz + cs * st], face: rot + Math.PI });
    if (kd && kd.two) spots.push({ at: [wx - sn * st, wz - cs * st], face: rot });
  }
  return { b: b, spots: spots, foot: [{ x: fx[1], z: fx[2], hw: width * copies / 2, hd: depth / 2, a: rot }] };
}

var WOODMAT;
var CARPET;
var POLISH;
var VINYL;
var ROOMMAT = {};

function tiled(c, unit) {
  var t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(1 / unit, 1 / unit);
  t.anisotropy = 4;
  return new THREE.MeshLambertMaterial({ map: t });
}

// floor finishes for the patches: a colour, wood boards, carpet or the polish of the aisles
function finishMat(f) {
  if (typeof f === 'number') return flat(f);
  if (f === 'wood') {
    if (!WOODMAT) {
      var wc = document.createElement('canvas');
      wc.width = wc.height = 256;
      var g = wc.getContext('2d');
      g.fillStyle = '#9a5a36';
      g.fillRect(0, 0, 256, 256);
      for (var r = 0; r < 4; r++) {
        for (var q = 0; q < 2; q++) {
          var sh = 188 + ((r * 7 + q * 13) % 5) * 4;
          g.fillStyle = 'rgb(' + sh + ',' + (sh - 68) + ',' + (sh - 112) + ')';
          g.fillRect(((q * 128 + (r % 2) * 64) % 256) + 2, r * 64 + 2, 124, 60);
        }
      }
      WOODMAT = tiled(wc, 2);
    }
    return WOODMAT;
  }
  if (f === 'vinyl') {
    if (!VINYL) {
      var vc = document.createElement('canvas');
      vc.width = vc.height = 128;
      var v = vc.getContext('2d');
      v.fillStyle = '#dfe8d0';
      v.fillRect(0, 0, 128, 128);
      v.fillStyle = '#c5d6b6';
      v.fillRect(0, 0, 64, 64);
      v.fillRect(64, 64, 64, 64);
      VINYL = tiled(vc, 1.4);
    }
    return VINYL;
  }
  if (f === 'lino' || f === 'tile' || f === 'boards') {
    if (!ROOMMAT[f]) {
      var rc = document.createElement('canvas');
      rc.width = rc.height = 128;
      var q = rc.getContext('2d');
      if (f === 'boards') {
        q.fillStyle = '#b98f63';
        q.fillRect(0, 0, 128, 128);
        for (var r = 0; r < 4; r++) {
          q.fillStyle = r % 2 ? '#d2aa7b' : '#c69d6e';
          q.fillRect(2 + (r % 2) * 40, r * 32 + 2, 84, 28);
          q.fillRect(86 + (r % 2) * 40 - 128 * (r % 2), r * 32 + 2, 40, 28);
        }
      } else {
        q.fillStyle = f === 'tile' ? '#e4f1f3' : '#d4dae6';
        q.fillRect(0, 0, 128, 128);
        q.fillStyle = f === 'tile' ? '#bcdde4' : '#c4ccdc';
        var n = f === 'tile' ? 4 : 2;
        for (var a = 0; a < n; a++) for (var c = 0; c < n; c++) if ((a + c) % 2) q.fillRect(a * 128 / n, c * 128 / n, 128 / n, 128 / n);
      }
      ROOMMAT[f] = tiled(rc, f === 'tile' ? 0.8 : f === 'boards' ? 1.6 : 1.4);
    }
    return ROOMMAT[f];
  }
  if (f === 'polish') {
    if (!POLISH) {
      var pc = document.createElement('canvas');
      pc.width = pc.height = 128;
      var p = pc.getContext('2d');
      p.fillStyle = '#d9d8d3';
      p.fillRect(0, 0, 128, 128);
      p.fillStyle = '#c3c1ba';
      p.fillRect(0, 0, 128, 3);
      p.fillRect(0, 0, 3, 128);
      POLISH = tiled(pc, 2);
    }
    return POLISH;
  }
  if (!CARPET) {
    var cc = document.createElement('canvas');
    cc.width = cc.height = 64;
    var x = cc.getContext('2d');
    x.fillStyle = '#8b9bb6';
    x.fillRect(0, 0, 64, 64);
    x.fillStyle = '#8091ad';
    for (var i = 0; i < 64; i += 4) x.fillRect(i, 0, 1, 64);
    CARPET = tiled(cc, 1);
  }
  return CARPET;
}

// a flat polygon of floor (points [x, z]), optionally with holes
function patch(pts, holes) {
  var sh = new THREE.Shape();
  pts.forEach(function (p, i) { if (i) sh.lineTo(p[0], -p[1]); else sh.moveTo(p[0], -p[1]); });
  (holes || []).forEach(function (h) {
    var pa = new THREE.Path();
    h.forEach(function (p, i) { if (i) pa.lineTo(p[0], -p[1]); else pa.moveTo(p[0], -p[1]); });
    sh.holes.push(pa);
  });
  var g = new THREE.ShapeGeometry(sh);
  g.rotateX(-Math.PI / 2);
  return g;
}

var FONT = 'ui-rounded, "SF Pro Rounded", "Arial Rounded MT Bold", system-ui, sans-serif';
function font(px) {
  return '800 ' + px + 'px ' + FONT;
}

function rr(g, x, y, w, h, r) {
  g.beginPath();
  g.roundRect(x, y, w, h, r);
}

// the largest size at or under fs that fits every line in w; leaves the font set
function fitFont(g, lines, w, fs) {
  g.font = font(fs);
  while (fs > 8 && lines.some(function (l) { return g.measureText(l).width > w; })) g.font = font(fs -= 2);
  return fs;
}

// deals look like shelf price cards, the rest of the standing boards like chalkboards, flat ones like plates
function boardKind(text, post) {
  return !post ? 'plate' : /\d|SALE/.test(text) ? 'deal' : 'chalk';
}

function paintDeal(g, w, h, text) {
  var t = text.split(' ');
  var i = t.findIndex(function (s) { return /\d/.test(s); });
  if (i < 0) i = t.length - 1;
  var head = t.slice(0, i).join(' ') || 'THIS WEEK';
  var price = t.slice(i).join(' ');
  if (/^\d+\.\d\d$/.test(price)) price = '$' + price;
  var e = h * 0.05;
  rr(g, 0, 0, w, h, h * 0.16);
  g.fillStyle = '#a82a22';
  g.fill();
  rr(g, e, e, w - 2 * e, h - 2 * e, h * 0.12);
  var gr = g.createLinearGradient(0, 0, 0, h);
  gr.addColorStop(0, '#ffe46a');
  gr.addColorStop(1, '#ffc928');
  g.fillStyle = gr;
  g.fill();
  g.save();
  g.clip();
  var hb = h * 0.34;
  g.fillStyle = '#e0382c';
  g.fillRect(0, 0, w, hb);
  g.fillStyle = '#ff8c7c';
  g.fillRect(0, hb - 3, w, 3);
  g.fillStyle = 'rgba(120,60,0,0.22)';
  g.fillRect(0, hb, w, 5);
  g.restore();
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  fitFont(g, [head], w * 0.8, Math.floor(hb * 0.62));
  g.fillStyle = '#7a1710';
  g.fillText(head, w / 2, hb * 0.5 + 3);
  g.fillStyle = '#fff';
  g.fillText(head, w / 2, hb * 0.5);
  var py = hb + (h - e - hb) * 0.5;
  fitFont(g, [price], w * 0.84, Math.floor((h - hb - e) * 0.95));
  g.fillStyle = 'rgba(255,255,255,0.65)';
  g.fillText(price, w / 2, py + 4);
  g.fillStyle = '#3a1410';
  g.fillText(price, w / 2, py);
  rr(g, e + 2, e + 2, w - 2 * e - 4, h - 2 * e - 4, h * 0.1);
  g.strokeStyle = 'rgba(120,60,0,0.3)';
  g.lineWidth = 3;
  g.stroke();
}

function paintChalk(g, w, h, lines) {
  rr(g, 0, 0, w, h, h * 0.14);
  g.fillStyle = '#7d5129';
  g.fill();
  g.strokeStyle = '#4a2d14';
  g.lineWidth = 4;
  g.stroke();
  rr(g, 5, 5, w - 10, h - 10, h * 0.11);
  g.strokeStyle = '#b8814a';
  g.lineWidth = 3;
  g.stroke();
  var f = h * 0.11;
  rr(g, f, f, w - 2 * f, h - 2 * f, h * 0.05);
  var gr = g.createLinearGradient(0, 0, 0, h);
  gr.addColorStop(0, '#3b4843');
  gr.addColorStop(1, '#2a3531');
  g.fillStyle = gr;
  g.fill();
  g.save();
  g.clip();
  rr(g, f + 5, f + 5, w - 2 * f, h - 2 * f, h * 0.05);
  g.strokeStyle = 'rgba(0,0,0,0.35)';
  g.lineWidth = 9;
  g.stroke();
  g.restore();
  rr(g, f + 9, f + 9, w - 2 * f - 18, h - 2 * f - 18, h * 0.03);
  g.setLineDash([10, 8]);
  g.strokeStyle = 'rgba(255,255,255,0.25)';
  g.lineWidth = 2.5;
  g.stroke();
  g.setLineDash([]);
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  var fs = fitFont(g, lines, w * 0.76, Math.floor((h - 2 * f - 24) / lines.length * 0.74));
  g.fillStyle = '#f6f2e4';
  g.shadowColor = 'rgba(255,255,255,0.4)';
  g.shadowBlur = 5;
  lines.forEach(function (l, i) { g.fillText(l, w / 2, h / 2 + (i + 0.5 - lines.length / 2) * fs * 1.05); });
  g.shadowBlur = 0;
}

function paintPlate(g, w, h, lines) {
  rr(g, 0, 0, w, h, h * 0.2);
  g.fillStyle = '#2f3446';
  g.fill();
  var e = h * 0.07;
  rr(g, e, e, w - 2 * e, h - 2 * e, h * 0.15);
  var gr = g.createLinearGradient(0, 0, 0, h);
  gr.addColorStop(0, '#fffaf0');
  gr.addColorStop(1, '#f1e2bc');
  g.fillStyle = gr;
  g.fill();
  g.save();
  g.clip();
  g.fillStyle = '#f2c230';
  g.fillRect(0, h - e - h * 0.1, w, h * 0.1);
  g.restore();
  rr(g, e + 2, e + 2, w - 2 * e - 4, h - 2 * e - 4, h * 0.13);
  g.strokeStyle = 'rgba(80,50,0,0.22)';
  g.lineWidth = 3;
  g.stroke();
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  var fs = fitFont(g, lines, w * 0.84, Math.floor((h - 2 * e - h * 0.1) / lines.length * 0.7));
  g.fillStyle = '#2f3446';
  lines.forEach(function (l, i) { g.fillText(l, w / 2, h * 0.47 + (i + 0.5 - lines.length / 2) * fs * 1.05); });
}

// a board's face painted in a w by h cell at (x, y) of a canvas. The board is asp times wider than high, so the cell
// is drawn in the board's own proportions and squeezed in
function paintBoard(g, x, y, w, h, text, asp, post) {
  g.save();
  g.translate(x, y);
  g.scale(w / (h * asp), 1);
  var kind = boardKind(text, post);
  if (kind === 'deal') paintDeal(g, h * asp, h, text);
  else (kind === 'chalk' ? paintChalk : paintPlate)(g, h * asp, h, text.split('\n'));
  g.restore();
}

// a board of its own: one plane
function boardFace(e) {
  var c = document.createElement('canvas');
  c.width = 400;
  c.height = Math.round(400 * e.h / e.w);
  paintBoard(c.getContext('2d'), 0, 0, c.width, c.height, e.text, e.w / e.h, e.post);
  var t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  var m = new THREE.Mesh(new THREE.PlaneGeometry(e.w, e.h), new THREE.MeshLambertMaterial({ map: t, alphaTest: 0.5 }));
  m.position.set(e.x, e.y, e.z);
  m.rotation.y = e.r || 0;
  return m;
}

// the boards of the areas share one picture, so a whole area's boards are drawn in the same call as its fixtures
var BA = { w: 2048, h: 2048, cw: 400, ch: 160, cols: 5, n: 0, cells: {}, c: null, tex: null, mat: null };
function boardAtlas(b, e) {
  if (!BA.c) {
    BA.c = document.createElement('canvas');
    BA.c.width = BA.w;
    BA.c.height = BA.h;
    BA.tex = new THREE.CanvasTexture(BA.c);
    BA.tex.colorSpace = THREE.SRGBColorSpace;
    BA.tex.anisotropy = 4;
    BA.mat = new THREE.MeshLambertMaterial({ map: BA.tex, alphaTest: 0.5 });
  }
  var asp = e.w / e.h;
  var key = e.text + '|' + asp.toFixed(2) + (e.post ? 'p' : '');
  if (BA.cells[key] === undefined) {
    BA.cells[key] = BA.n++;
    var k = BA.cells[key];
    paintBoard(BA.c.getContext('2d'), (k % BA.cols) * BA.cw, Math.floor(k / BA.cols) * BA.ch, BA.cw, BA.ch, e.text, asp, e.post);
    BA.tex.needsUpdate = true;
  }
  var k2 = BA.cells[key];
  var g = new THREE.PlaneGeometry(e.w, e.h);
  var uv = g.attributes.uv;
  for (var i = 0; i < uv.count; i++) {
    uv.setXY(i, ((k2 % BA.cols) + uv.getX(i)) * BA.cw / BA.w, 1 - (Math.floor(k2 / BA.cols) + 1 - uv.getY(i)) * BA.ch / BA.h);
  }
  if (e.r) g.rotateY(e.r);
  g.translate(e.x, e.y, e.z);
  b.geom(g, BA.mat, 0);
}

// a sign stand: a base plate with a post up the board's back
function post(b, e) {
  var c = boardKind(e.text, true) === 'chalk' ? 0x7d5129 : 0x50566a;
  b.block(flat(c), e.x - 0.1, e.x + 0.1, e.z - 0.12, e.z + 0.06, 0, 0.03);
  b.block(flat(c), e.x - 0.025, e.x + 0.025, e.z - 0.06, e.z - 0.01, 0.03, e.y);
}

function board(e) {
  var o = new THREE.Group();
  o.add(boardFace(e));
  var b = new Batch();
  post(b, e);
  o.add(b.group());
  return o;
}

// each department's own colour on its sign
var DEPT = { produce: '#3f9e47', bakery: '#d98a3d', dairy: '#4a8fd6', meat: '#c8453d', frozen: '#4cb6d8', pantry: '#a87a3d',
  snacks: '#e0592f', toys: '#e04a8e', tech: '#5d6ad6', kitchen: '#d9a21f', clothes: '#a05cc4', home: '#7a9a5a', office: '#3a7a9a',
  pets: '#e8855a', sports: '#2f9e8a', tools: '#d96a20', auto: '#5c6270', seasonal: '#c43a4a' };
var signIcons = {};

function star(g, x, y, r) {
  g.beginPath();
  for (var i = 0; i < 10; i++) {
    var a = -Math.PI / 2 + i * Math.PI / 5;
    var d = i % 2 ? r * 0.45 : r;
    g.lineTo(x + Math.cos(a) * d, y + Math.sin(a) * d);
  }
  g.closePath();
}

function paintSign(g, id, gold, im) {
  var W = 768, H = 204, e = 10, bh = 34;
  rr(g, 0, 0, W, H, 36);
  var gr = g.createLinearGradient(0, 0, 0, H);
  gr.addColorStop(0, gold ? '#ffe27a' : '#3b4258');
  gr.addColorStop(1, gold ? '#c4931a' : '#262b3b');
  g.fillStyle = gr;
  g.fill();
  g.strokeStyle = gold ? '#7a5a10' : '#171a24';
  g.lineWidth = 4;
  g.stroke();
  rr(g, e, e, W - 2 * e, H - 2 * e, 28);
  gr = g.createLinearGradient(0, 0, 0, H);
  gr.addColorStop(0, gold ? '#fff0b0' : '#fffaf0');
  gr.addColorStop(1, gold ? '#f3d37a' : '#f2e4c0');
  g.fillStyle = gr;
  g.fill();
  g.save();
  g.clip();
  g.fillStyle = gold ? '#e0b43a' : DEPT[id];
  g.fillRect(0, H - e - bh, W, bh);
  g.fillStyle = 'rgba(255,255,255,0.35)';
  g.fillRect(0, H - e - bh, W, 3);
  rr(g, e + 6, e + 6, W - 2 * e, H - 2 * e, 28);
  g.strokeStyle = 'rgba(70,40,0,0.16)';
  g.lineWidth = 12;
  g.stroke();
  g.restore();
  if (gold) {
    g.fillStyle = '#fff2a8';
    g.strokeStyle = '#8a6410';
    g.lineWidth = 3;
    for (var i = -1; i <= 1; i++) {
      star(g, W / 2 + i * 44, H - e - bh / 2, 14);
      g.fill();
      g.stroke();
    }
  }
  var cy = (e + H - e - bh) / 2;
  g.beginPath();
  g.arc(100, cy, 66, 0, Math.PI * 2);
  g.fillStyle = '#fff';
  g.fill();
  g.beginPath();
  g.arc(100, cy, 58, 0, Math.PI * 2);
  g.fillStyle = DEPT[id];
  g.fill();
  if (im) {
    g.imageSmoothingEnabled = false;
    g.drawImage(im, 100 - 44, cy - 44, 88, 88);
  }
  var t = BZ[id].name.toUpperCase();
  var lines = [t];
  var fs = fitFont(g, lines, 550, 100);
  var w = t.split(' ');
  if (fs < 56 && w.length > 1) {
    var half = Math.ceil(w.length / 2);
    lines = [w.slice(0, half).join(' '), w.slice(half).join(' ')];
    fs = fitFont(g, lines, 550, 70);
  }
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillStyle = '#2a2f40';
  lines.forEach(function (l, i) { g.fillText(l, 460, cy + 3 + (i + 0.5 - lines.length / 2) * fs * 1.05); });
}

function signTex(id, gold) {
  var c = document.createElement('canvas');
  c.width = 768;
  c.height = 204;
  var tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  var ic = BZ[id].ic;
  var im = signIcons[ic];
  if (!im) {
    im = signIcons[ic] = new Image();
    im.src = 'assets/' + ic + '.png';
  }
  paintSign(c.getContext('2d'), id, gold, im.complete ? im : null);
  if (!im.complete) im.addEventListener('load', function () {
    paintSign(c.getContext('2d'), id, gold, im);
    tex.needsUpdate = true;
  });
  return tex;
}

// the department's name on a plate hung from the ceiling on two cables and tilted a little toward the camera; the
// cables go into the piece's batch, the plate is one box
var SIGN_Y = 1.75;
var SIGN_TILT = -0.22;
function makeSign(s, b) {
  var sg = s.a.sign;
  var w = sg[2];
  var h = w * 0.266;
  var x = sg[0];
  var z = sg[1];
  var top = SIGN_Y + Math.cos(SIGN_TILT) * h / 2;
  var tz = z + Math.sin(SIGN_TILT) * h / 2;
  [-1, 1].forEach(function (sd) {
    var cx = x + sd * (w / 2 - 0.16);
    b.block(flat(0x6c7388), cx - 0.008, cx + 0.008, tz - 0.008, tz + 0.008, top, 2.8);
    b.block(flat(0x50566a), cx - 0.03, cx + 0.03, tz - 0.03, tz + 0.03, 2.8, 2.83);
  });
  var edge = flat(0x262b3b);
  var mat = new THREE.MeshLambertMaterial({ map: signTex(s.id, false), alphaTest: 0.5 });
  var face = new THREE.Mesh(new THREE.BoxGeometry(w, h, 0.05), [edge, edge, edge, edge, mat, edge]);
  face.position.set(x, SIGN_Y, z);
  face.rotation.x = SIGN_TILT;
  s.signMat = mat;
  return face;
}

// light falling on the floor from above, day and night
function floorLight(pts) {
  var g = new THREE.Group();
  var mat = new THREE.MeshBasicMaterial({ color: 0xfff0c8, map: fade(), transparent: true, opacity: 0.28, depthWrite: false, blending: THREE.AdditiveBlending });
  pts.forEach(function (q) {
    var m = new THREE.Mesh(new THREE.PlaneGeometry(3.2, 3.2).rotateX(-Math.PI / 2), mat);
    m.position.set(q[0], 0.03, q[1]);
    g.add(m);
  });
  return g;
}

// a light bar hung on two rods from a rail over the point
function lightBar(b, x, z) {
  b.block(flat(0x50566a), x - 0.6, x + 0.6, z - 0.02, z + 0.02, 2.5, 2.54);
  b.block(flat(0x50566a), x - 0.5, x - 0.48, z - 0.01, z + 0.01, 2.14, 2.5);
  b.block(flat(0x50566a), x + 0.48, x + 0.5, z - 0.01, z + 0.01, 2.14, 2.5);
  b.block(flat(0xfff3d0), x - 0.55, x + 0.55, z - 0.07, z + 0.07, 2.06, 2.14);
}

var STAFF_COUNTER = 'shop/character-employee@5,3>2,2';

// a Pipework model with its footprint and the spots shoppers stand at, placed like fixture() by the middle of its footprint.
// e.pw has n (copies side by side), stock (the model has goods that leave with the stock), spots (0 none, 1 front, 2 both
// sides) and on (goods of other kits standing on it, in its own frame)
function pwFixture(e, k) {
  var o = e.pw;
  var b = new Batch();
  var box = lib.model(e.m).box;
  var rot = e.r || 0;
  var n = o.n || 1;
  var width = box.x1 - box.x0;
  var depth = box.z1 - box.z0;
  var sn = Math.sin(rot);
  var cs = Math.cos(rot);
  var spots = [];
  var c = rotY((box.x0 + box.x1) / 2, (box.z0 + box.z1) / 2, rot);
  var nspot = o.spots === undefined ? 1 : o.spots;
  for (var i = 0; i < n; i++) {
    var off = (i - (n - 1) / 2) * width;
    var wx = e.x + cs * off;
    var wz = e.z - sn * off;
    var ox = wx - c[0];
    var oz = wz - c[1];
    b.add(e.m, ox, oz, rot, e.y);
    if (o.stock) b.pile(e.g, ox, oz, rot, e.y || 0, k * 0.37 + i * 0.21 + Math.abs(e.x) * 3.7 + Math.abs(e.z) * 5.3);
    (o.on || []).forEach(function (g, gi) {
      var p = rotY(g[1], g[2], rot);
      var gk = g[5] || 1;
      var gb = lib.model(g[0]).box;
      b.raw(g[0], ox + p[0], oz + p[1], rot + (g[3] || 0), (e.y || 0) + (g[4] || 0) - gb.y0 * gk, gk, shelfRank(k, [0, e.x + i, e.z], gi));
    });
    var st = depth / 2 + 0.28;
    if (nspot) spots.push({ at: [wx + sn * st, wz + cs * st], face: rot + Math.PI });
    if (nspot > 1) spots.push({ at: [wx - sn * st, wz - cs * st], face: rot });
  }
  return { b: b, spots: spots, foot: [{ x: e.x, z: e.z, hw: width * n / 2, hd: depth / 2, a: rot }] };
}

// what one upgrade puts in the area: fixtures and models are merged into its batch; boards, staff, the sign and
// the floor lights are objects of their own, kept in pc.x
function entry(pc, s, e) {
  var b = pc.b;
  if (e.pw) {
    var px = pwFixture(e, s.i);
    b.take(px.b);
    pc.spots = pc.spots.concat(px.spots);
    pc.foot = pc.foot.concat(px.foot);
  } else if (Array.isArray(e)) {
    var fx = fixture(e, s.i);
    b.take(fx.b);
    pc.spots = pc.spots.concat(fx.spots);
    pc.foot = pc.foot.concat(fx.foot);
  } else if (e.m) {
    var k = e.k || 1;
    var r = e.r || 0;
    var mb = lib.model(e.m).box;
    if (e.flat && e.y >= 0.3 && mb.h * k > 0.35 && (pc.k + 1) % 5) k = 0.35 / mb.h;
    if (pc.still) b.model(e.m, e.x, (e.y || 0) - mb.y0 * k, e.z, r, k);
    else b.raw(e.m, e.x, e.z, r, (e.y || 0) - mb.y0 * k, k);
    var c = rotY((mb.x0 + mb.x1) / 2 * k, (mb.z0 + mb.z1) / 2 * k, r);
    if (!e.flat) pc.foot.push({ x: e.x + c[0], z: e.z + c[1], hw: (mb.x1 - mb.x0) * k / 2, hd: (mb.z1 - mb.z0) * k / 2, a: r });
  } else if (e.box) {
    var q = e.box;
    b.block(flat(e.c), q[0], q[1], q[2], q[3], q[4], q[5]);
    if (!e.flat) pc.foot.push({ x: (q[0] + q[1]) / 2, z: (q[2] + q[3]) / 2, hw: (q[1] - q[0]) / 2, hd: (q[3] - q[2]) / 2, a: 0 });
  } else if (e.text) {
    boardAtlas(b, e);
    if (e.post) {
      post(b, e);
      pc.foot.push({ x: e.x, z: e.z - 0.03, hw: 0.1, hd: 0.09, a: 0 });
    }
  } else if (e.slab) {
    var sl = e.slab;
    b.slab(flat(e.c), sl[0], sl[1], sl[2], sl[3], sl[4] || 0.014, sl[5] || 0.01);
  } else if (e.light) {
    e.light.forEach(function (q) { b.light(q[0], q[1]); });
  } else if (e.lamp) {
    lamp(b, e.lamp, e.x, e.z, e.r || 0);
    pc.foot.push({ x: e.x, z: e.z, hw: 0.08, hd: 0.08, a: 0 });
  } else if (e.patch) b.geom(patch(e.patch), finishMat(e.finish), 0.045);
  else if (e.sign) {
    pc.sign = e.sign;
    if (e.sign === 1) pc.x.add(makeSign(s, b));
  } else if (e.staff) {
    var f = crew(STAFF_COUNTER, 'idle');
    f.obj.position.set(e.staff[0], 0, e.staff[1]);
    f.obj.rotation.y = faceRot(e.staff[2]);
    pc.x.add(f.obj);
    pc.staff = f;
    pc.foot.push({ x: e.staff[0], z: e.staff[1], hw: 0.2, hd: 0.2, a: 0 });
  } else if (e.helper) {
    var h = { f: crew('shop/character-employee', 'walk'), i: 0, wait: 0, path: null };
    if (nav.dirty) navBuild();
    var c = nearFree(s.a.cx, s.a.cz);
    h.f.obj.position.set(c < 0 ? s.a.cx : NX0 + (c % NX + 0.5) * NC, 0, c < 0 ? s.a.cz : NZ0 + (((c / NX) | 0) + 0.5) * NC);
    pc.x.add(h.f.obj);
    pc.helper = h;
  } else if (e.lights) {
    pc.glow = true;
    pc.x.add(floorLight(e.lights));
    e.lights.forEach(function (q) { lightBar(b, q[0], q[1]); });
  }
}

// what stands in the front, the stockroom and outside from the first day: the same entries as an upgrade, all kept in one
// merged batch; the footprints of the front's keep people off them
var fixed = [];
var still = { b: new Batch(), x: new THREE.Group(), spots: [], foot: [], still: true };
function decor(list, solid) {
  var n = still.foot.length;
  list.forEach(function (e) { entry(still, { a: {}, i: 0 }, e); });
  if (solid) fixed = fixed.concat(still.foot.slice(n));
}

function makePiece(s, k) {
  var u = s.a.ups[k];
  var pc = { s: s, k: k, name: u.name, b: new Batch(), x: new THREE.Group(), spots: [], foot: [], on: false, g: null, gb: null };
  u.piece.forEach(function (e) { entry(pc, s, e); });
  pc.x.visible = false;
  return pc;
}

function pieceOf(s, k) {
  if (!s.pcs[k]) s.pcs[k] = makePiece(s, k);
  return s.pcs[k];
}

// the pieces that are standing, built or not
function standing(s) {
  return s.pcs.filter(function (pc) { return pc && pc.on; });
}

// where shoppers can look at something in the area
function lookable(s) {
  return standing(s).filter(function (pc) { return pc.spots.length; });
}

// the fence on an edge two sites share is drawn by the one that opens later, which is the one still closed when the
// other is open
function sharedWithLater(s, x, z) {
  return BIZ.some(function (bz, i) {
    var r = PLAN.areas[bz.id].vacant;
    if (i <= s.i || x < r[0] - 0.05 || x > r[1] + 0.05 || z < r[2] - 0.05 || z > r[3] + 0.05) return false;
    return Math.min(x - r[0], r[1] - x, z - r[2], r[3] - z) < 0.05;
  });
}

// an area that is not open yet: bare concrete fenced off along the edges that open onto aisles, a pallet of boxes, a
// hand truck and a coming soon board
function vacantSite(s) {
  var r = s.a.vacant;
  var g = new THREE.Group();
  var b = new Batch();
  b.slab(flat(0xb9b6ae), r[0], r[1], r[2], r[3], 0.012, 0.01);
  var mx = (r[0] + r[1]) / 2;
  var mz = (r[2] + r[3]) / 2;
  b.add('skate/pallet', mx - 0.9, mz, 0.3);
  var pb = [];
  stock(KIND.stock, 'boxes', pb);
  pb.forEach(function (q) {
    var p = rotY(q[1], q[2], 0.3);
    b.raw(q[0], mx - 0.9 + p[0], mz + p[1], 0.3 + q[3], q[4] - lib.model(q[0]).box.y0 * q[5], q[5]);
  });
  b.add('shop/hand-truck', mx + 0.8, mz + 0.3, 0.5);
  var edges = [[r[0], r[2], r[1], r[2], 0], [r[0], r[3], r[1], r[3], 0], [r[0], r[2], r[0], r[3], 1], [r[1], r[2], r[1], r[3], 1]];
  edges.forEach(function (e) {
    var len = Math.hypot(e[2] - e[0], e[3] - e[1]);
    var n = Math.floor(len / 0.8);
    for (var i = 0; i < n; i++) {
      var x = e[0] + (e[2] - e[0]) * (i + 0.5) / n;
      var z = e[1] + (e[3] - e[1]) * (i + 0.5) / n;
      if (x < -14.4 || x > 14.4 || z < BACK + 0.3 || sharedWithLater(s, x, z)) continue;
      b.add('roads/construction-barrier', x, z, e[4] ? 0 : Math.PI / 2);
    }
  });
  g.add(b.group());
  g.add(board({ text: 'COMING SOON\n' + BZ[s.id].name.toUpperCase(), x: mx, z: mz + 0.9, y: 0.6, w: 1.2, h: 0.5, post: true }));
  return g;
}

function buildAreas() {
  var hole = function (x0, x1) { return [[x0, -4.7], [x1, -4.7], [x1, -18.2], [x0, -18.2]]; };
  BIZ.forEach(function (bz, i) {
    var a = PLAN.areas[bz.id];
    var r = a.vacant;
    if (ITEMS[bz.id].of.length !== a.ups.length) console.error('ITEMS in data.js does not match the upgrades of', bz.id);
    var s = { id: bz.id, a: a, i: i, cx: a.cx, cz: a.cz, pcs: [], shown: -1, key: null, merged: null, open: false };
    shops[bz.id] = s;
    order.push(bz.id);
    s.group = new THREE.Group();
    root.add(s.group);
    s.vacant = vacantSite(s);
    s.group.add(s.vacant);
    var fb = new Batch();
    a.floor.forEach(function (f, j) { fb.geom(patch(f.poly), finishMat(f.finish), 0.02 + j * 0.002); });
    s.floorG = fb.group(false);
    s.group.add(s.floorG);
    s.lights = new Batch();
    [0.3, 0.7].forEach(function (u) { s.lights.light(r[0] + (r[1] - r[0]) * u, (r[2] + r[3]) / 2); });
    s.pick = addPick(bz.id, (r[0] + r[1]) / 2, (r[2] + r[3]) / 2, r[1] - r[0], r[3] - r[2]);
  });
  var fl = new Batch();
  floors(fl, 'shop/floor', -EDGE, EDGE, BACK, FRONT);
  floors(fl, 'shop/floor%=d5d5d8', -EDGE, EDGE, SB, BACK);
  floors(fl, 'shop/floor%=d5d5d8', EDGE, WING_X + 0.2, SB, FRONT);
  root.add(fl.group());
  var lp = new THREE.Mesh(patch([[-9.6, -1.2], [9.6, -1.2], [9.6, -21.7], [-9.6, -21.7]], [hole(1.25, 6.9), hole(-6.9, -1.25)]), finishMat('polish'));
  lp.position.y = 0.026;
  lp.receiveShadow = true;
  root.add(lp);
}

// once nothing in an area is moving, its pieces are drawn as one merged batch, a few draw calls for the lot
function settle(s) {
  if (s.merged) {
    s.group.remove(s.merged);
    s.merged.traverse(function (o) { if (o.geometry) o.geometry.dispose(); });
    s.merged = null;
  }
  var all = new Batch();
  var any = false;
  if (s.open) {
    all.take(s.lights);
    any = true;
  }
  s.pcs.forEach(function (pc) {
    if (!pc || !pc.on || pc.rising) return;
    all.take(pc.b);
    if (pc.g) {
      s.group.add(pc.x);
      s.group.remove(pc.g);
      pc.gb.traverse(function (o) { if (o.geometry) o.geometry.dispose(); });
      pc.g = null;
      pc.gb = null;
    }
    any = true;
  });
  if (!any) return;
  s.merged = all.group();
  s.group.add(s.merged);
  s.stocked = -1;
  shadowDirty = true;
}


// a lane's number on a round lit badge turned up toward the camera, standing on its impulse rack
function laneSign(n) {
  var c = document.createElement('canvas');
  c.width = 128;
  c.height = 128;
  var x = c.getContext('2d');
  x.fillStyle = '#262b3b';
  x.fillRect(0, 0, 128, 128);
  // a cylinder's cap maps u along z and v along x
  x.translate(64, 64);
  x.rotate(-Math.PI / 2);
  x.translate(-64, -64);
  x.beginPath();
  x.arc(64, 64, 58, 0, Math.PI * 2);
  x.fillStyle = '#1b1f2c';
  x.fill();
  x.lineWidth = 9;
  x.strokeStyle = '#f2c230';
  x.stroke();
  x.fillStyle = '#ffe27a';
  x.font = font(n > 9 ? 62 : 80);
  x.textAlign = 'center';
  x.textBaseline = 'middle';
  x.fillText(String(n), 64, 70);
  var t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  var lit = new THREE.MeshLambertMaterial({ map: t, emissive: 0xffffff, emissiveMap: t, emissiveIntensity: 0.7 });
  var m = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.15, 0.05, 28), [flat(0x262b3b), lit, flat(0x262b3b)]);
  m.rotation.x = 0.9;
  return m;
}

// the store's name in lit letters on a fascia over an entrance, leaning toward the camera; a second picture of the letters
// alone makes them glow at night
function paintDoor(g, name, glow) {
  var W = 768, H = 164;
  g.fillStyle = glow ? '#000' : '#262b3b';
  g.fillRect(0, 0, W, H);
  rr(g, 12, 12, W - 24, H - 24, 34);
  if (!glow) {
    var gr = g.createLinearGradient(0, 0, 0, H);
    gr.addColorStop(0, '#363d54');
    gr.addColorStop(1, '#1b1f2c');
    g.fillStyle = gr;
    g.fill();
  }
  g.strokeStyle = '#f2c230';
  g.lineWidth = 7;
  g.stroke();
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  fitFont(g, [name], W - 200, 104);
  g.lineWidth = 6;
  g.lineJoin = 'round';
  if (!glow) {
    g.strokeStyle = '#a8700c';
    g.strokeText(name, W / 2, H / 2 + 5);
  }
  g.fillStyle = '#ffe27a';
  g.fillText(name, W / 2, H / 2 + 5);
  [60, W - 60].forEach(function (sx) {
    star(g, sx, H / 2, 24);
    g.fill();
  });
}

function doorSign(en) {
  function tex(glow) {
    var c = document.createElement('canvas');
    c.width = 768;
    c.height = 164;
    paintDoor(c.getContext('2d'), en.name, glow);
    var t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 4;
    return t;
  }
  var m = new THREE.MeshLambertMaterial({ map: tex(false), emissiveMap: tex(true), emissive: 0x000000 });
  var rim = flat(0x262b3b);
  var w = en.w - 0.1;
  var b = new THREE.Mesh(new THREE.BoxGeometry(w, w * 164 / 768, 0.08), [rim, rim, rim, rim, m, rim]);
  b.position.set(en.x, 1.3, FRONT + 0.08);
  b.rotation.x = -0.5;
  b.castShadow = true;
  root.add(b);
  doorMats.push(m);
}
var doorMats = [];

// a staffed lane: the counter, its cashier, the light pole with the lane number on it, and the baskets left at the end. Its line runs north up the west side of the counter, the one paying at the front
function lane(hall, li, lv, x) {
  var zc = PLAN.bank.z;
  var m = new THREE.Group();
  m.position.set(x, 0, zc);
  // the belt runs south toward the cashier's end, so the shopper pays at the south end of the lane's west side
  m.add(mesh('pw/Checkout_Lane_30', -0.15, -0.35, -Math.PI / 2));
  var cashier = crew('shop/character-employee', 'idle');
  cashier.obj.position.set(0.4, 0, -0.1);
  cashier.obj.rotation.y = -Math.PI / 2;
  m.add(cashier.obj);
  var rack = new Batch();
  rack.add('pw/LaneLight_Pole_01', -0.4, -1.12, 0);
  rack.add('pw/Basket_Stack_01', -0.15, 0.55, 0);
  m.add(rack.group());
  var sign = laneSign(li + 1);
  sign.position.set(-0.4, 1.1, -1.12);
  m.add(sign);
  m.visible = false;
  root.add(m);
  hall.items.push({ g: m, lv: lv });
  hall.staff.push(cashier);
  hall.solids.push({ r: [x - 0.45, x + 0.05, zc - 1.15, zc + 0.75], lv: lv }, { r: [x + 0.25, x + 0.6, zc - 0.3, zc + 0.2], lv: lv });
  var qx = x - 0.72;
  return { k: 'lane', x: qx, till: [x - 0.15, 0.5, zc + 0.1], cashier: cashier, head: [x + 0.4, zc - 0.1],
    spot: function (n) { return n ? [qx, zc - 0.85 - 0.5 * (n - 1), 0] : [qx, zc + 0.15, Math.PI / 2]; } };
}

// a self checkout faces east, its shopper standing east of it
function kiosk(hall, ki, lv, x) {
  var zc = PLAN.bank.z;
  hall.lv[lv] = hall.lv[lv] || new Batch();
  hall.lv[lv].add('pw/SelfCheckout_Kiosk_01', x, zc, Math.PI / 2);
  hall.solids.push({ r: [x - 0.2, x + 0.2, zc - 0.35, zc + 0.35], lv: lv });
  return { k: 'self', x: x + 0.55, z: zc, till: [x, 0.7, zc] };
}

function buildShell() {
  var cb = new Batch();
  var cols = [];
  [2.5, -2.5, -7.5, -12.5, -15.5, -18.5, -22.5, -28.5].forEach(function (z) { cols.push([-EDGE, z]); });
  [2.5, -2.5, -7.5, -12.5, -17.5, -22.5, -28.5].forEach(function (z) { cols.push([EDGE, z]); });
  [2.5, -3, -8, -14, -28.5].forEach(function (z) { cols.push([WING_X, z]); });
  PLAN.entrances.forEach(function (en) { cols.push([en.x - en.w / 2, FRONT], [en.x + en.w / 2, FRONT]); });
  PLAN.docks.forEach(function (d) { cols.push([d - 1, SB], [d + 1, SB]); });
  cols.forEach(function (c) { cb.add('shop/column', c[0], c[1], 0); });
  root.add(cb.group());
  var west = new Batch();
  var east = new Batch();
  var back = new Batch();
  var north = new Batch();
  var glassWall = new Batch();
  wallPieces(west, -EDGE, FRONT, -EDGE, SB, 1, 0, [[PLAN.tireBay.z, PLAN.tireBay.w]]);
  wallPieces(east, EDGE, FRONT, EDGE, SB, -1, 0, [[1.0, 1], [-23.0, 1]]);
  var wingE = new Batch();
  wallPieces(wingE, WING_X, FRONT, WING_X, SB, -1, 0, []);
  wallPieces(north, EDGE, SB, WING_X + 0.3, SB, 0, 1, []);
  wallPieces(glassWall, EDGE, FRONT, WING_X + 0.3, FRONT, 0, -1, [], 'shop/wall-window');
  wallPieces(back, -EDGE, BACK, EDGE, BACK, 0, 1, PLAN.doors.map(function (d) { return [d, 1]; }));
  wallPieces(north, -EDGE, SB, EDGE, SB, 0, 1, PLAN.docks.map(function (d) { return [d, 2]; }));
  wallPieces(glassWall, -EDGE, FRONT, EDGE, FRONT, 0, -1, PLAN.entrances.map(function (en) { return [en.x, en.w]; }), 'shop/wall-window');
  var tz = PLAN.tireBay.z;
  var tw = PLAN.tireBay.w;
  west.block(flat(0xd9dce6), -EDGE - 0.15, -EDGE + 0.15, tz - tw / 2, tz + tw / 2, 0.82, 0.98);
  for (var sl = 0; sl < 4; sl++) west.block(flat(0x9aa0b4), -EDGE - 0.16, -EDGE + 0.16, tz - tw / 2, tz + tw / 2, 0.84 + sl * 0.04, 0.855 + sl * 0.04);
  var wg = west.group();
  var eg = east.group();
  var fg = glassWall.group();
  fg.scale.y = 0.55;
  var weg = wingE.group();
  root.add(wg, eg, weg, north.group(), fg);
  outer.push({ g: wg, n: [-1, 0] }, { g: eg, n: [1, 0], both: 1 }, { g: weg, n: [1, 0] });
  // the wall between the sales floor and the stockroom stays low, so the camera sees into the stockroom
  var bg = back.group();
  bg.scale.y = 0.12;
  root.add(bg);
  var bay = new Batch();
  for (var hz = 0; hz < 6; hz++) bay.slab(flat(hz % 2 ? 0x2a2d36 : 0xf2c230), -EDGE - 0.5, -EDGE + 0.5, tz - tw / 2 + hz * tw / 6, tz - tw / 2 + (hz + 1) * tw / 6, 0.03, 0.01);
  root.add(bay.group());
  PLAN.docks.forEach(function (d) {
    var l = new THREE.Mesh(new THREE.BoxGeometry(2, 0.2, 0.6), flat(0x50566a));
    l.position.set(d, 0.9, SB);
    root.add(l);
  });
  PLAN.doors.forEach(function (d, i) { stockDoor(d, i); });
  var hb = new Batch();
  for (var z = -3.1; z > BACK + 0.4; z -= 1.1) {
    if (z < -14.5 && z > -20.2) continue;
    hb.add('nature/plant_bushLarge', -EDGE - 0.65, z, z * 1.7);
  }
  for (z = 1.9; z > SB + 0.4; z -= 1.1) hb.add('nature/plant_bush', WING_X + 0.85, z, z * 1.7);
  root.add(hb.group());
  PLAN.entrances.forEach(function (en) { doorSign(en); });
}

// a run of wall from (x0, z0) to (x1, z1), one piece per unit, its decorated side toward (inX, inZ); a gap is
// [centre, width] along the run
function wallPieces(b, x0, z0, x1, z1, inX, inZ, gaps, ref) {
  var n = Math.round(Math.hypot(x1 - x0, z1 - z0));
  var rot = Math.atan2(inX, inZ);
  for (var i = 0; i < n; i++) {
    var u = (i + 0.5) / n;
    var x = x0 + (x1 - x0) * u;
    var z = z0 + (z1 - z0) * u;
    var t = z0 === z1 ? x : z;
    if (gaps.some(function (g) { return Math.abs(t - g[0]) < g[1] / 2; })) continue;
    b.add(ref || 'shop/wall', x, z, rot);
  }
}

function buildFront() {
  var bk = PLAN.bank;
  var b = new Batch();
  var hall = { items: [], shown: -1, add: true, tills: [], staff: [], solids: [], lv: {} };
  PLAN.entrances.forEach(function (en) {
    [-0.5, 0.5].forEach(function (o) { b.add('furn/rugDoormat', en.x + o, FRONT - 0.45, 0, 0.004); });
    b.add('pw/Basket_Stack_01', en.basket[0], en.basket[1], 0);
    b.light(en.x, -0.3);
    hall.solids.push({ r: [en.basket[0] - 0.2, en.basket[0] + 0.2, en.basket[1] - 0.2, en.basket[1] + 0.2], lv: 0 });
    // the greeter stands by the baskets from the first day
    var g = crew('shop/character-employee', 'idle');
    g.obj.position.set(en.greeter[0], 0, en.greeter[1]);
    g.obj.rotation.y = en.greeter[2];
    root.add(g.obj);
    hall.items.push({ g: g.obj, lv: 0 });
    hall.staff.push(g);
    hall.solids.push({ r: [en.greeter[0] - 0.2, en.greeter[0] + 0.2, en.greeter[1] - 0.2, en.greeter[1] + 0.2], lv: 0 });
  });
  [-4.4, 0, 4.4].forEach(function (x) { b.light(x, -0.3); });
  root.add(b.group());
  var li = 0;
  var ki = 0;
  // the first till stands at the east end, by the grocery entrance
  var cx = bk.x + TILLS.reduce(function (w, t) { return w + (t.k === 'lane' ? 1.9 : 1.3); }, 0);
  TILLS.forEach(function (t) {
    if (t.k === 'lane') {
      cx -= 1.9;
      hall.tills.push(lane(hall, li++, t.lv, cx + 0.95));
    } else {
      cx -= 1.3;
      hall.tills.push(kiosk(hall, ki++, t.lv, cx + 0.35));
    }
  });
  hall.tills.push(gardenTill);
  hall.staff.push(gardenTill.cashier);
  // the attendant who watches the self checkouts, and the service desk by the grocery entrance
  var att = crew('shop/character-employee', 'idle');
  att.obj.position.set(-7.0, 0, 0.3);
  att.obj.rotation.y = Math.PI / 2;
  att.obj.visible = false;
  root.add(att.obj);
  hall.items.push({ g: att.obj, lv: 3 });
  hall.staff.push(att);
  hall.solids.push({ r: [-7.2, -6.6, 0.1, 0.5], lv: 3 });
  hall.lv[3] = hall.lv[3] || new Batch();
  hall.lv[3].add('pw/SelfCheckout_Attendant_01', -6.72, 0.3, -Math.PI / 2);
  var desk = new THREE.Group();
  for (var di = 0; di < PLAN.desk.n; di++) {
    var dm = mesh('pw/ServiceDesk_20', PLAN.desk.x + di * 1.0, PLAN.desk.z, Math.PI);
    if (PLAN.desk.n < 3 || di !== 1) {
      var cl = crew('shop/character-employee', 'idle');
      cl.obj.position.set(0, 0, -0.42);
      dm.add(cl.obj);
      hall.staff.push(cl);
    }
    desk.add(dm);
  }
  desk.add(board({ text: 'SERVICE', x: PLAN.desk.x + (PLAN.desk.n - 1) / 2, z: 0.1, y: 1.7, w: 1.6, h: 0.45, post: true }));
  desk.visible = false;
  root.add(desk);
  hall.items.push({ g: desk, lv: 7 });
  hall.solids.push({ r: [PLAN.desk.x - 0.5, PLAN.desk.x + 1.0 * PLAN.desk.n - 0.5, PLAN.desk.z - 0.3, PLAN.desk.z + 0.9], lv: 7 });
  PLAN.front.forEach(function (it) {
    var w = 0.5;
    hall.lv[it[0]] = hall.lv[it[0]] || new Batch();
    if (it[1] === 'carts') {
      hall.lv[it[0]].add('pw/CartCorral_Indoor_20', it[2] + 0.5, it[3], 0);
      hall.lv[it[0]].add('pw/ShoppingCart_Nested_3_01', it[2] + 0.5, it[3], Math.PI / 2);
      w = 1.2;
    } else hall.lv[it[0]].add(it[1], it[2], it[3], it[4]);
    hall.solids.push({ r: [it[2] - 0.3, it[2] + w - 0.1, it[3] - 0.3, it[3] + 0.3], lv: it[0] });
  });
  // what a level adds without people in it is one merged batch
  Object.keys(hall.lv).forEach(function (lv) {
    var g = hall.lv[lv].group();
    g.visible = false;
    root.add(g);
    hall.items.push({ g: g, lv: +lv });
  });
  places.hall = hall;
  addPick('hall', 0, 0.5, EDGE * 2, 3.2);
  buildDoors();
  decor(PLAN.decor.front, true);
}

// glass doors that slide apart when someone comes near; a fixed pane either side, a rail across the top
var glass = new THREE.MeshLambertMaterial({ color: 0xbfe6f2, transparent: true, opacity: 0.38, depthWrite: false });
var ents = [];
function buildDoors() {
  var pane = new THREE.BoxGeometry(0.72, 0.9, 0.03);
  var edge = new THREE.BoxGeometry(0.03, 0.9, 0.05);
  PLAN.entrances.forEach(function (en) {
    var rail = new THREE.Mesh(new THREE.BoxGeometry(en.w, 0.08, 0.16), flat(0x50566a));
    rail.position.set(en.x, 0.96, FRONT);
    root.add(rail);
    var d = { x: en.x, open: 0, panes: [] };
    [-1, 1].forEach(function (sd) {
      var fixed = new THREE.Mesh(pane, glass);
      fixed.position.set(en.x + sd * (en.w / 2 - 0.42), 0.47, FRONT + 0.05);
      root.add(fixed);
      var g = new THREE.Group();
      g.add(new THREE.Mesh(pane, glass));
      [-0.35, 0.35].forEach(function (ex) {
        var e = new THREE.Mesh(edge, flat(0x8d93a6));
        e.position.x = ex;
        g.add(e);
      });
      g.position.set(en.x + sd * 0.36, 0.47, FRONT - 0.05);
      root.add(g);
      d.panes.push({ g: g, sd: sd, x: en.x });
    });
    ents.push(d);
  });
}

function doorsStep(dt) {
  ents.forEach(function (d) {
    var near = false;
    for (var i = 0; i < people.length && !near; i++) {
      var p = people[i].f.obj.position;
      if (people[i].path && Math.abs(p.x - d.x) < 1.6 && Math.abs(p.z - FRONT) < 1.4) near = true;
    }
    var want = near ? 1 : 0;
    if (want === d.open) return;
    d.open = want > d.open ? Math.min(1, d.open + dt * 2.5) : Math.max(0, d.open - dt * 1.5);
    var e = d.open * d.open * (3 - 2 * d.open);
    d.panes.forEach(function (q) { q.g.position.x = q.x + q.sd * (0.36 + e * 0.7); });
  });
}

function addPick(id, x, z, w, d) {
  var pick = new THREE.Mesh(new THREE.BoxGeometry(w, 1.2, d), new THREE.MeshBasicMaterial({ visible: false }));
  pick.position.set(x, 0.6, z);
  pick.userData.id = id;
  root.add(pick);
  picks.push(pick);
  return pick;
}

// a place that shows a different set of pieces at each of its levels; level 0 is the bare site
function levels(n) {
  var out = [];
  for (var i = 0; i <= n; i++) out.push(new Batch());
  return out;
}

function finishPlace(id, batches) {
  var pl = { items: [], shown: -1 };
  batches.forEach(function (b, lv) {
    var g = b.group();
    g.visible = false;
    root.add(g);
    pl.items.push({ g: g, lv: lv, only: lv === 0 });
  });
  places[id] = pl;
  return pl;
}

// The garden center is a fenced yard outside the west wall, next to Home & More, its gate on the lot. Before it is built
// the corner is a lawn with a bench or two; each level then adds tables of flowers, potted plants, young trees and
// lights. The fence comes in one unit pieces with a post at each end, so every run, and the gate opening, ends on a post
var DX = -7.5;
var GARDEN = [-12.75 + DX, -7.8 + DX, -2.1, 2.86];
var GATE_X = -10.475 + DX;
var TILL_G = [-9.2 + DX, 3.4];
var gardenTill;
var FLOWERS = ['shop/display-flowers', 'shop/display-flowers@7,1>3,1;11,1>15,2', 'shop/display-flowers@7,1>11,1;15,2>2,1',
  'shop/display-flowers@7,1>9,1;11,1>3,1'];

function buildGarden() {
  var lv = levels(4);
  [[-10.2, 1.2], [-11.2, -1.0], [-9.6, -0.2]].forEach(function (p, i) { lv[0].add(i % 2 ? 'nature/flower_yellowA' : 'nature/flower_redA', p[0] + DX, p[1], i); });
  lv[0].add('furn/bench', -10.4 + DX, 0.4, -Math.PI / 2);
  lv[0].add('furn/bench', -10.4 + DX, 2.2, -Math.PI / 2);
  var x0 = GARDEN[0];
  var x1 = GARDEN[1];
  var z0 = GARDEN[2];
  var z1 = GARDEN[3];
  var step = (x1 - x0) / 5;
  // the levels add up, so each piece is in the batch of the level that brings it
  lv[1].slab(flat(GRAVEL), x0, x1, z0, z1, 0.006, 0.02);
  lv[1].slab(flat(PAVE), x0 + 2 * step, x0 + 3 * step, z1, LOT[0], 0.004, 0.02);
  for (var i = 0; i < 5; i++) {
    if (i !== 2) lv[1].add('forest/fence', x0 + (i + 0.5) * step, z1, 0);
    lv[1].add('forest/fence', x0 + (i + 0.5) * step, z0, 0);
    lv[1].add('forest/fence', x0, z0 + (i + 0.5) * (z1 - z0) / 5, Math.PI / 2);
  }
  [-0.74, 0.74].forEach(function (o) { lv[1].block(flat(0x50566a), GATE_X + o - 0.03, GATE_X + o + 0.03, z1 - 0.03, z1 + 0.03, 0, 1.0); });
  lv[1].block(flat(0x2f3446), GATE_X - 0.8, GATE_X + 0.8, z1 - 0.04, z1 + 0.02, 0.78, 1.08);
  boardAtlas(lv[1], { text: 'GARDEN CENTER', x: GATE_X, y: 0.93, z: z1 + 0.03, w: 1.5, h: 0.28 });
  lv[1].add('skate/pallet', x0 + 0.5, 2.55, 0.2);
  for (var sb = 0; sb < 6; sb++) lv[1].add('food/bag', x0 + 0.5 + (sb % 2 - 0.5) * 0.2, 2.55 + (sb % 3 - 1) * 0.1, sb, 0.16 + (sb >> 1) * 0.06);
  // flower displays in pairs, a row more each level, with the gate's path between the two columns
  [[1, 2.0], [2, 0.6], [3, -0.8]].forEach(function (r, ri) {
    [-11.55 + DX, -9.4 + DX].forEach(function (x, ci) {
      lv[r[0]].add(FLOWERS[(ri + ci) % 4], x - 0.42, r[1], 0);
      lv[r[0]].add(FLOWERS[(ri + ci + 2) % 4], x + 0.42, r[1], 0);
    });
  });
  for (var t = 0; t < 6; t++) lv[3].add('furn/pottedPlant', -12.0 + DX + t * 0.72, -1.72, t);
  [[-19.0, 2.6], [-16.2, 2.3], [-16.0, -0.9]].forEach(function (p, i) {
    lv[3].add('surv/bucket', p[0], p[1], i);
    lv[3].add(['nature/flower_redA', 'nature/flower_yellowA', 'nature/flower_purpleA'][i], p[0], p[1], i, 0.17);
  });
  [[x0 + 0.25, 1.3], [x0 + 0.25, -0.1], [x1 - 0.3, 1.3], [x1 - 0.3, -0.1]].forEach(function (p, i) { lv[4].add('nature/tree_small', p[0], p[1], i); });
  lamp(lv[4], 'roads/light-square', x0 + 0.2, -1.85, Math.PI);
  lamp(lv[4], 'roads/light-square', x1 - 0.2, -1.85, Math.PI);
  var pl = finishPlace('garden', lv);
  pl.add = true;
  // the garden's own till outside the gate, its cashier on the east side and the one paying on the west; the next
  // in line waits behind on the paving
  var desk = mesh('arcade/cash-register', TILL_G[0], TILL_G[1], -Math.PI / 2);
  var cashier = crew('shop/character-employee', 'idle');
  cashier.obj.position.set(0, 0, -0.5);
  desk.add(cashier.obj);
  desk.visible = false;
  root.add(desk);
  pl.items.push({ g: desk, lv: 1 });
  var qx = TILL_G[0] - 0.55;
  gardenTill = { k: 'garden', till: [TILL_G[0], 0.8, TILL_G[1]], cashier: cashier, head: [TILL_G[0] + 0.5, TILL_G[1]],
    spot: function (n) { return n ? [qx, TILL_G[1] + 0.5 * n, Math.PI] : [qx, TILL_G[1], Math.PI / 2]; } };
  pl.pick = addPick('garden', (x0 + x1) / 2, (z0 + z1) / 2, x1 - x0, z1 - z0);
}

// The east wing: four rooms along the east wall, each a place whose levels add one piece from plan.js. Before a room is
// bought it holds a coming soon board; its floor and walls are part of the building
var WING_IDS = ['serv'];

function buildWing() {
  decor(PLAN.decor.wing, true);
  WING_IDS.forEach(function (id) {
    var r = PLAN.wing[id];
    var cx = (r.rect[0] + r.rect[1]) / 2;
    var cz = (r.rect[2] + r.rect[3]) / 2;
    var pl = { items: [], shown: -1, add: true, staff: [], foot: [] };
    var site = board({ text: 'COMING SOON\n' + PL[id].name.toUpperCase(), x: cx, z: cz, y: 0.6, w: 1.3, h: 0.5, post: true });
    site.visible = false;
    root.add(site);
    pl.items.push({ g: site, lv: 0, only: true });
    r.ups.forEach(function (u, k) {
      var pc = { k: k, b: new Batch(), x: new THREE.Group(), spots: [], foot: [] };
      u.piece.forEach(function (e) { entry(pc, { a: { cx: cx, cz: cz }, i: k }, e); });
      var g = new THREE.Group();
      g.add(pc.b.group(), pc.x);
      g.visible = false;
      root.add(g);
      pl.items.push({ g: g, lv: k + 1 });
      pl.foot[k + 1] = pc.foot;
      if (pc.staff) pl.staff.push({ f: pc.staff, g: g });
    });
    places[id] = pl;
    pl.pick = addPick(id, cx, cz, r.rect[1] - r.rect[0], r.rect[3] - r.rect[2]);
  });
}

// a pylon sign by the street with the store's name; "Market" until most of the store is open
function buildPylon() {
  var g = new THREE.Group();
  [-1, 1].forEach(function (sd) {
    var post = new THREE.Mesh(new THREE.BoxGeometry(0.16, 2.4, 0.16), flat(0x50566a));
    post.position.set(sd * 0.9, 1.2, -0.16);
    post.castShadow = true;
    g.add(post);
  });
  var c = document.createElement('canvas');
  c.width = 512;
  c.height = 256;
  var tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  var mat = new THREE.MeshLambertMaterial({ map: tex, emissiveMap: tex, emissive: 0x000000 });
  var board = new THREE.Mesh(new THREE.BoxGeometry(2.3, 1.15, 0.14), [flat(0x3a3d4a), flat(0x3a3d4a), flat(0x3a3d4a), flat(0x3a3d4a), mat, flat(0x3a3d4a)]);
  board.position.y = 2.0;
  board.castShadow = true;
  g.add(board);
  g.position.set(21.2, 0, 8.8);
  root.add(g);
  pylon = { c: c, tex: tex, mat: mat, big: null };
}
var pylon;

function paintPylon() {
  var big = order.filter(has).length >= 8;
  var key = (big ? 'b' : 's') + S.store;
  if (pylon.big === key) return;
  pylon.big = key;
  var x = pylon.c.getContext('2d');
  var n = S.store > 1;
  x.fillStyle = '#2a2e3f';
  x.fillRect(0, 0, 512, 256);
  rr(x, 12, 12, 488, 232, 38);
  var gr = x.createLinearGradient(0, 0, 0, 256);
  gr.addColorStop(0, '#fffaf0');
  gr.addColorStop(1, '#f2e4c0');
  x.fillStyle = gr;
  x.fill();
  x.save();
  x.clip();
  x.fillStyle = '#d63a2f';
  x.fillRect(0, 186, 512, 70);
  x.fillStyle = 'rgba(255,255,255,0.35)';
  x.fillRect(0, 186, 512, 3);
  rr(x, 18, 18, 488, 232, 38);
  x.strokeStyle = 'rgba(70,40,0,0.16)';
  x.lineWidth = 12;
  x.stroke();
  x.restore();
  x.fillStyle = '#ffd23a';
  x.strokeStyle = '#8a6410';
  x.lineWidth = 5;
  star(x, 84, 98, 50);
  x.fill();
  x.stroke();
  x.fillStyle = '#2a2f40';
  x.textAlign = 'center';
  x.textBaseline = 'middle';
  var tx = n ? 262 : 300;
  fitFont(x, ['STREET'], n ? 200 : 280, 84);
  x.fillText('MAIN', tx, 66);
  x.fillText('STREET', tx, 140);
  x.fillStyle = '#fff';
  x.font = font(46);
  x.fillText(big ? 'SUPERCENTER' : 'MARKET', 256, 222);
  if (n) {
    x.beginPath();
    x.arc(434, 100, 54, 0, Math.PI * 2);
    x.fillStyle = '#d63a2f';
    x.fill();
    x.lineWidth = 7;
    x.strokeStyle = '#fff';
    x.stroke();
    x.fillStyle = '#fff';
    x.font = font(S.store > 9 ? 54 : 70);
    x.fillText('#' + S.store, 434, 106);
  }
  pylon.tex.needsUpdate = true;
}

// in front of the store: a paved apron, the parking lot with a walkway to each entrance, the sidewalk and the street,
// and across the street a row of houses. Behind and beside: the yard with the service road, the tire bay drive, woods
function buildOutside() {
  var b = new Batch();
  b.slab(flat(GRASS), -150, 150, -150, 150, -0.03, 0.02);
  b.slab(flat(PAVE), -EDGE - 3, 22.9, FRONT, LOT[0], 0, 0.02);
  b.slab(flat(PAVE), -60, 60, LOT[1], 10.5, 0, 0.02);
  b.slab(flat(PAVE), -60, 60, 13.5, 14.4, 0, 0.02);
  b.slab(flat(ASPHALT), -60, 60, 10.5, 13.5, 0, 0.015);
  for (var x = -60; x <= 60; x += 3) b.add(Math.abs(x) < 1 ? 'roads/road-crossing' : 'roads/road-straight', x, 12, 0, 0.002);
  for (var lx = -48; lx <= 48; lx += 8) lamp(b, 'roads/light-curved', lx + 4, 14.15, 0);
  var houses = ['sub/building-type-a', 'sub/building-type-c', 'sub/building-type-e', 'sub/building-type-h', 'sub/building-type-k'];
  for (var hx = -30, hi = 0; hx <= 30; hx += 6, hi++) {
    b.add(houses[hi % houses.length], hx, 17.6, Math.PI);
    b.add('sub/tree-large', hx + 3, 15.6, hi);
  }
  // the yard behind the store, the service road down the east side and the tire bay's drive on the west
  b.slab(flat(ASPHALT), -EDGE - 4, 26.5, -40, SB - 0.3, 0.008, 0.02);
  b.slab(flat(ASPHALT), 23, 26.5, -40, 10.5, 0.008, 0.02);
  b.slab(flat(ASPHALT), 23, 26.5, 9.6, 10.5, 0.016, 0.01);
  PLAN.docks.forEach(function (d) { b.slab(flat(0x8b8f99), d - 1.2, d + 1.2, SB - 0.6, SB - 0.3, 0.12, 0.12); });
  b.add('roads/dumpster', -EDGE - 1.8, -34.3, 0);
  b.slab(flat(ASPHALT), -26.5, -22.5, -21, 10.5, 0.008, 0.02);
  b.slab(flat(ASPHALT), -26.5, -22.5, 9.6, 10.5, 0.016, 0.01);
  var tz = PLAN.tireBay.z;
  b.slab(flat(0xcfc9bd), -22.5, -EDGE - 0.3, tz - 3.2, tz + 3.2, 0.006, 0.02);
  b.slab(flat(0xf2c230), -21.4, -17.4, tz - 1.55, tz - 1.5, 0.02, 0.008);
  b.slab(flat(0xf2c230), -21.4, -17.4, tz + 1.5, tz + 1.55, 0.02, 0.008);
  b.slab(flat(0xf2c230), -21.4, -21.35, tz - 1.55, tz + 1.55, 0.02, 0.008);
  [[-EDGE - 0.9, tz - 3.0], [-EDGE - 0.9, tz + 3.0], [-22.0, tz - 3.0], [-22.0, tz + 3.0]].forEach(function (q) { b.add('roads/construction-cone', q[0], q[1], 0); });
  b.add('furn/cardboardBoxClosed', -EDGE - 1.2, tz + 2.2, 0.2);
  b.add('car/wheel-dark', -EDGE - 1.5, tz + 2.6, 0, 0);
  b.add('car/wheel-default', -EDGE - 2.2, tz + 2.6, 0, 0);
  // woods round the site, leaving the lot, the service road and the tire bay's drive clear
  var n = 0;
  for (var gz = 6; gz > -62; gz -= 2.6) {
    for (var gx = -46; gx <= 46; gx += 2.6) {
      n++;
      var jx = gx + Math.sin(n * 12.9) * 0.9;
      var jz = gz + Math.cos(n * 7.3) * 0.9;
      if (jx > -31 && jx < 29.5 && jz > -43 && jz < 11.5) continue;
      if (Math.sin(n * 3.1) > 0.75) continue;
      b.add(TREES[n % 5], jx, jz, n);
      if (n % 3 === 0) b.add('nature/plant_bushLarge', jx + 1.1, jz + 0.7, n);
      if (n % 4 === 1) b.add(['nature/flower_redA', 'nature/flower_yellowA', 'nature/flower_purpleA'][n % 3], jx - 0.9, jz + 1.0, n);
    }
  }
  decor(PLAN.decor.out);
  root.add(b.group());
  buildLot();
  buildTaxi();
  buildDock();
  buildGarden();
  buildPylon();
}
var TREES = ['nature/tree_oak', 'nature/tree_default', 'nature/tree_fat', 'nature/tree_detailed', 'nature/tree_pineRoundC'];

// parking bays: two rows across the front split by a walkway to each entrance; the lot paints more of them at each level
function buildLot() {
  var lv = levels(4);
  var X0 = -17;
  var X1 = 17;
  lv[0].slab(flat(GRAVEL), X0, X1, LOT[0], LOT[1], 0.006, 0.02);
  for (var fx = X0 + 0.6; fx < X1; fx += 1.15) {
    if (WALKS.some(function (w) { return Math.abs(fx - w) < 1.6; })) continue;
    lv[0].add('roads/construction-fence', fx, LOT[0] + 0.25, Math.PI / 2);
    lv[0].add('roads/construction-fence', fx, LOT[1] - 0.25, Math.PI / 2);
  }
  for (var fz = LOT[0] + 0.85; fz < LOT[1] - 0.4; fz += 1.15) {
    lv[0].add('roads/construction-fence', X0 + 0.2, fz, 0);
    lv[0].add('roads/construction-fence', X1 - 0.2, fz, 0);
  }
  lv[0].add('car/tractor-shovel', -3.5, 6.6, 1.2);
  lv[0].add('car/truck-flat', 3.2, 6.9, -Math.PI / 2);
  lv[0].add('car/box', 3.0, 6.9, 0.1, 0.3);
  lv[0].add('car/box', 3.5, 6.9, -0.2, 0.3);
  lv[0].add('car/box', -14.6, 5.0, 0.4);
  lv[0].add('car/box', -14.15, 5.1, -0.1);
  lv[0].add('roads/construction-light', -5.9, LOT[0] + 0.3, 0);
  lv[0].add('roads/construction-light', 5.9, LOT[1] - 0.3, 0);
  [[-6.6, 5.2], [-13.2, 8.5], [6.8, 8.6], [-7.4, 7.9]].forEach(function (c) { lv[0].add('roads/construction-cone', c[0], c[1], 0); });
  for (var l = 1; l <= 4; l++) {
    lv[l].slab(flat(ASPHALT), X0, X1, LOT[0], LOT[1], 0.008, 0.02);
    WALKS.forEach(function (w) { lv[l].slab(flat(PAVE), w - 1.4, w + 1.4, LOT[0], LOT[1], 0.012, 0.02); });
  }
  var paint = flat(PAINT);
  for (var hu = 1; hu <= 4; hu++) {
    [-6.5, 6.5].forEach(function (hx) {
      lv[hu].slab(flat(0x3c63a8), hx - 0.42, hx + 0.42, 4.15, 5.45, 0.018, 0.008);
      lv[hu].slab(paint, hx - 0.12, hx + 0.12, 4.55, 4.9, 0.026, 0.008);
    });
  }
  var rowsZ = [[4.0, 5.6, -1], [8.0, 9.6, 1]];
  var lines = {};
  for (var bx = X0 + 0.5; bx < X1; bx++) {
    if (WALKS.some(function (w) { return Math.abs(bx - w) < 2; })) continue;
    for (var r = 0; r < 2; r++) {
      var rz = rowsZ[r];
      var unlock = Math.abs(bx) < 7.5 ? 1 + r : 3 + r;
      bays.push({ x: bx, z: (rz[0] + rz[1]) / 2, nose: rz[2], lv: unlock, car: null });
      [bx - 0.5, bx + 0.5].forEach(function (px) {
        var key = px + ':' + r;
        if (lines[key]) return;
        lines[key] = 1;
        for (var u = unlock; u <= 4; u++) lv[u].slab(paint, px - 0.03, px + 0.03, rz[0] + 0.1, rz[1] - 0.1, 0.02, 0.008);
      });
    }
  }
  // zebra stripes where each walkway crosses the aisle
  WALKS.forEach(function (w) {
    for (var zl = 1; zl <= 4; zl++) for (var zs = -1.2; zs < 1.3; zs += 0.5) lv[zl].slab(paint, w + zs - 0.16, w + zs + 0.16, 6.1, 7.5, 0.024, 0.008);
  });
  [[1, -5.7, 3.9], [1, 5.7, 3.9], [3, -13.5, 3.9], [3, 13.5, 3.9], [4, -5.7, 9.8], [4, 5.7, 9.8], [4, -13.5, 9.8], [4, 13.5, 9.8]].forEach(function (p) {
    for (var u = p[0]; u <= 4; u++) lamp(lv[u], 'roads/light-square', p[1], p[2], p[2] < 5 ? Math.PI : 0);
  });
  // potted trees along the walkways' edges, clear of the bays beside them
  WALKS.forEach(function (w, wi) {
    [[-1.22, 4.3], [1.22, 4.3], [-1.22, 9.3], [1.22, 9.3]].forEach(function (q, i) { lv[4].add('furn/pottedPlant', w + q[0], q[1], i + wi); });
  });
  var pl = finishPlace('lot', lv);
  pl.pick = addPick('lot', 0, (LOT[0] + LOT[1]) / 2, 34, LOT[1] - LOT[0]);
}

// the taxi stand on the curb in the middle of the lot
function buildTaxi() {
  var lv = levels(4);
  for (var l = 1; l <= 4; l++) {
    lv[l].add('roads/road-sign-street', 1.4, 10.3, Math.PI);
    lv[l].slab(flat(0xf2c230), -1.3, 1.3, 10.55, 10.62, 0.02, 0.008);
    lv[l].slab(flat(0xf2c230), -1.3, -1.23, 10.55, 11.95, 0.02, 0.008);
    lv[l].slab(flat(0xf2c230), 1.23, 1.3, 10.55, 11.95, 0.02, 0.008);
  }
  for (var u = 2; u <= 4; u++) {
    lv[u].add('furn/bench', -0.5, 9.95, Math.PI);
    lv[u].add('furn/trashcan', 0.6, 9.95, 0);
  }
  for (var w = 3; w <= 4; w++) {
    lv[w].add('furn/bench', -1.6, 9.95, Math.PI);
    lamp(lv[w], 'roads/light-curved', -2.4, 9.85, Math.PI);
  }
  lv[4].add('sub/planter', 2.4, 9.95, 0);
  lv[4].add('nature/flower_purpleA', 2.2, 9.95, 0, 0.18);
  lv[4].add('nature/flower_yellowA', 2.6, 9.95, 0, 0.18);
  var pl = finishPlace('taxi', lv);
  pl.pick = addPick('taxi', 0, 10.4, 3.4, 1.6);
}

// the stockroom behind the sales floor: racking, pallets and boxes, a baler and a stack of boxes for each level that loads
// the dollies heavier. A new stocker shows by itself, with a puff, where it waits
function rackRow(b, x0, x1, z) {
  var n = Math.floor((x1 - x0) / 0.8);
  if (n < 1) return;
  var goods = [];
  for (var i = 0; i < n; i++) goods.push([[BOX[i % 6], CARTON[(i + 1) % 5]], [BAG[(i + 2) % 6], BOX[(i + 3) % 6]]]);
  b.take(fixture(['shelf', (x0 + x1) / 2, z, 's', goods, null, n], 0).b);
}

function buildDock() {
  dollies = [0, 1, 2, 3, 4, 5].map(dollyGroup);
  shadows = new THREE.InstancedMesh(blobGeo, blobMat, 8);
  shadows.count = 0;
  shadows.frustumCulled = false;
  root.add(shadows);
  blobs = new THREE.InstancedMesh(blobGeo, blobMat, 256);
  blobs.count = 0;
  blobs.frustumCulled = false;
  root.add(blobs);
  var sb = new Batch();
  var doors = PLAN.doors;
  var docks = PLAN.docks;
  var x = -14.4;
  doors.concat([99]).forEach(function (d) {
    rackRow(sb, x, Math.min(14.4, d - 2), -24.9);
    x = d + 2;
  });
  x = -14.4;
  docks.concat([99]).forEach(function (d) {
    rackRow(sb, x, Math.min(14.4, d - 1.4), -27.8);
    x = d + 1.4;
  });
  docks.forEach(function (d, i) {
    [[d - 0.85, -26.5], [d + 0.85, -26.5 + (i % 2 ? 0.2 : 0)]].forEach(function (q) { sb.take(fixture(['stock', q[0], q[1], 's', 'boxes'], 0).b); });
    for (var k = 0; k < 5 + i; k++) sb.add(k % 3 ? 'furn/cardboardBoxClosed' : 'furn/cardboardBoxOpen', d + 0.3 + (k % 3) * 0.26, -26.2 + (k >> 1) * 0.1, k * 0.7, (k >> 2) * 0.25);
  });
  root.add(sb.group());
  decor(PLAN.decor.stock);
  var baler = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.9, 0.7), flat(0x6b7387));
  baler.position.set(13.2, 0.45, -26.3);
  baler.castShadow = true;
  root.add(baler);
  [-1, 1].forEach(function (sd) { root.add(mesh('furn/trashcan', 14.2, -26.3 + sd * 0.5, 0)); });
  // the trucks backed up to the first two docks
  [0, 1].forEach(function (i) {
    var t = mesh('car/delivery', docks[i], SB - 1.95, Math.PI);
    t.scale.setScalar(1.7);
    root.add(t);
  });
  var lv = levels(10);
  [[3, -14.0], [6, -13.3], [9, -12.6]].forEach(function (p) {
    for (var i = 0; i < 6; i++) lv[p[0]].add(PARCEL, p[1] + (i % 2 - 0.5) * 0.3, -26.2 + (i % 3 - 1) * 0.1, (i % 3 - 1) * 0.15, (i >> 1) * 0.1);
  });
  var pl = finishPlace('dock', lv);
  pl.add = true;
  pl.pick = addPick('dock', 0, -25.5, 28, 5);
}

var puffMat = new THREE.MeshBasicMaterial({ color: 0xf2efe8, transparent: true, opacity: 0.8, depthWrite: false });

function dust(x0, x1, z0, z1, now, n) {
  for (var i = 0; i < n; i++) {
    var m = new THREE.Mesh(new THREE.SphereGeometry(0.08, 6, 5), puffMat.clone());
    var side = i % 4;
    var u = Math.random();
    var x = side < 2 ? x0 + (x1 - x0) * u : (side === 2 ? x0 : x1);
    var z = side < 2 ? (side === 0 ? z0 : z1) : z0 + (z1 - z0) * u;
    m.position.set(x, 0.06, z);
    root.add(m);
    puffs.push({ m: m, t0: now + Math.random() * 120, vx: (x - (x0 + x1) / 2) * 0.3, vz: (z - (z0 + z1) / 2) * 0.3 });
  }
}

function dustAt(g, now, n) {
  var b = new THREE.Box3().setFromObject(g);
  if (b.isEmpty()) return;
  dust(b.min.x, b.max.x, b.min.z, b.max.z, now, n || 8);
}

function puffsStep(now) {
  for (var i = puffs.length - 1; i >= 0; i--) {
    var p = puffs[i];
    var u = (now - p.t0) / 900;
    if (u < 0) continue;
    if (u >= 1) {
      root.remove(p.m);
      p.m.geometry.dispose();
      p.m.material.dispose();
      puffs.splice(i, 1);
      continue;
    }
    p.m.position.x += p.vx * 0.016;
    p.m.position.z += p.vz * 0.016;
    p.m.position.y = 0.06 + u * 0.3;
    p.m.scale.setScalar(0.6 + u * 1.8);
    p.m.material.opacity = 0.8 * (1 - u);
  }
}

// The sales floor as a grid of 0.25 cells, blocked where a wall, a counter or a fixture stands, grown by about half a
// person. Shoppers, staff and stockers find their way on it with A*, pulled straight where the floor is open
var NC = 0.25;
var NX = 148;
var NZ = 100;
var NX0 = -15;
var NZ0 = -22.5;
var NR = 0.2;
var nav = { b: new Uint8Array(NX * NZ), dirty: true, cache: {}, g: new Float32Array(NX * NZ), from: new Int32Array(NX * NZ), seen: new Int32Array(NX * NZ), closed: new Int32Array(NX * NZ), stamp: 0 };

function markRect(x0, x1, z0, z1, g) {
  if (g === undefined) g = NR;
  var i0 = Math.max(0, Math.floor((x0 - g - NX0) / NC));
  var i1 = Math.min(NX - 1, Math.floor((x1 + g - NX0) / NC));
  var j0 = Math.max(0, Math.floor((z0 - g - NZ0) / NC));
  var j1 = Math.min(NZ - 1, Math.floor((z1 + g - NZ0) / NC));
  for (var i = i0; i <= i1; i++) {
    var cx = NX0 + (i + 0.5) * NC;
    if (cx < x0 - g || cx > x1 + g) continue;
    for (var j = j0; j <= j1; j++) {
      var cz = NZ0 + (j + 0.5) * NC;
      if (cz >= z0 - g && cz <= z1 + g) nav.b[j * NX + i] = 1;
    }
  }
}

// a fixture is grown by half a person; something small, a plant or a lamp, only by enough to keep people off it
function markObb(o) {
  var r = Math.max(o.hw, o.hd) <= 0.2 ? 0.06 : NR;
  var c = Math.cos(o.a);
  var s = Math.sin(o.a);
  var ex = Math.abs(c) * o.hw + Math.abs(s) * o.hd + r;
  var ez = Math.abs(s) * o.hw + Math.abs(c) * o.hd + r;
  var i0 = Math.max(0, Math.floor((o.x - ex - NX0) / NC));
  var i1 = Math.min(NX - 1, Math.floor((o.x + ex - NX0) / NC));
  var j0 = Math.max(0, Math.floor((o.z - ez - NZ0) / NC));
  var j1 = Math.min(NZ - 1, Math.floor((o.z + ez - NZ0) / NC));
  for (var i = i0; i <= i1; i++) {
    for (var j = j0; j <= j1; j++) {
      var dx = NX0 + (i + 0.5) * NC - o.x;
      var dz = NZ0 + (j + 0.5) * NC - o.z;
      if (Math.abs(dx * c - dz * s) < o.hw + r && Math.abs(dx * s + dz * c) < o.hd + r) nav.b[j * NX + i] = 1;
    }
  }
}

function navBuild() {
  nav.b.fill(0);
  nav.cache = {};
  nav.dirty = false;
  markRect(-16, -14.7, -23, 3);
  markRect(14.7, 15.3, -23, 3);
  markRect(21.5, 22.4, -23, 3);
  var x = -16;
  PLAN.doors.concat([16.5]).forEach(function (d) {
    markRect(x, d === 16.5 ? 16 : d - 0.5, -22.8, -22.2);
    x = d + 0.5;
  });
  x = -16;
  PLAN.entrances.concat([{ x: 17.5, w: 0 }]).forEach(function (en) {
    markRect(x, en.w ? en.x - en.w / 2 + 0.36 : 22.4, FRONT - 0.3, FRONT + 0.3);
    x = en.x + en.w / 2 - 0.36;
  });
  order.forEach(function (id) {
    var s = shops[id];
    if (!s.open) {
      var r = s.a.vacant;
      markRect(r[0], r[1], r[2], r[3], 0);
      return;
    }
    standing(s).forEach(function (pc) { pc.foot.forEach(markObb); });
  });
  places.hall.solids.forEach(function (q) { if (placeHas('hall', q.lv - 1)) markRect(q.r[0], q.r[1], q.r[2], q.r[3]); });
  fixed.forEach(markObb);
  WING_IDS.forEach(function (id) {
    places[id].foot.forEach(function (fs, lv) { if (placeHas(id, lv - 1)) fs.forEach(markObb); });
  });
  // the doorway from the sales floor into the wing
  carve(14.3, 15.9, 0.55, 1.45);
}

// opens the cells whose middle lies in a rectangle, for a doorway
function carve(x0, x1, z0, z1) {
  for (var i = 0; i < NX; i++) {
    var cx = NX0 + (i + 0.5) * NC;
    if (cx < x0 || cx > x1) continue;
    for (var j = 0; j < NZ; j++) {
      var cz = NZ0 + (j + 0.5) * NC;
      if (cz >= z0 && cz <= z1) nav.b[j * NX + i] = 0;
    }
  }
}

function blockedAt(x, z) {
  var i = Math.floor((x - NX0) / NC);
  var j = Math.floor((z - NZ0) / NC);
  return i < 0 || j < 0 || i >= NX || j >= NZ || nav.b[j * NX + i] === 1;
}

function free(x, z) {
  if (nav.dirty) navBuild();
  return !blockedAt(x, z);
}

// the free cell nearest to a point, or -1
function nearFree(x, z) {
  var i = Math.max(0, Math.min(NX - 1, Math.floor((x - NX0) / NC)));
  var j = Math.max(0, Math.min(NZ - 1, Math.floor((z - NZ0) / NC)));
  for (var r = 0; r < 10; r++) {
    var best = -1;
    var bd = 1e9;
    for (var di = -r; di <= r; di++) {
      for (var dj = -r; dj <= r; dj++) {
        if (Math.max(Math.abs(di), Math.abs(dj)) !== r) continue;
        var a = i + di;
        var b = j + dj;
        if (a < 0 || b < 0 || a >= NX || b >= NZ || nav.b[b * NX + a]) continue;
        var d = Math.hypot(NX0 + (a + 0.5) * NC - x, NZ0 + (b + 0.5) * NC - z);
        if (d < bd) {
          bd = d;
          best = b * NX + a;
        }
      }
    }
    if (best >= 0) return best;
  }
  return -1;
}

// whether someone can stand at a point: a free cell lies within a step of it
function canStand(x, z) {
  if (nav.dirty) navBuild();
  var c = nearFree(x, z);
  return c >= 0 && Math.hypot(NX0 + (c % NX + 0.5) * NC - x, NZ0 + (((c / NX) | 0) + 0.5) * NC - z) < 0.3;
}

function clearLine(ax, az, bx, bz) {
  var n = Math.ceil(Math.hypot(bx - ax, bz - az) / 0.05);
  for (var i = 1; i < n; i++) if (blockedAt(ax + (bx - ax) * i / n, az + (bz - az) * i / n)) return false;
  return true;
}

var STEPS8 = [[1, 0, 1], [-1, 0, 1], [0, 1, 1], [0, -1, 1], [1, 1, 1.4142], [1, -1, 1.4142], [-1, 1, 1.4142], [-1, -1, 1.4142]];

// A* over the cells with eight neighbours, no cutting corners and an octile guess; null when there is no way
var heapC = [];
var heapF = [];

function heapPush(c, f) {
  var i = heapC.length;
  heapC.push(c);
  heapF.push(f);
  while (i > 0) {
    var p = (i - 1) >> 1;
    if (heapF[p] <= f) break;
    heapC[i] = heapC[p];
    heapF[i] = heapF[p];
    i = p;
  }
  heapC[i] = c;
  heapF[i] = f;
}

function heapPop() {
  var top = heapC[0];
  var c = heapC.pop();
  var f = heapF.pop();
  var n = heapC.length;
  if (n) {
    var i = 0;
    for (;;) {
      var l = i * 2 + 1;
      if (l >= n) break;
      if (l + 1 < n && heapF[l + 1] < heapF[l]) l++;
      if (heapF[l] >= f) break;
      heapC[i] = heapC[l];
      heapF[i] = heapF[l];
      i = l;
    }
    heapC[i] = c;
    heapF[i] = f;
  }
  return top;
}

function cellPath(s, g) {
  var gi = g % NX;
  var gj = (g / NX) | 0;
  var st = ++nav.stamp;
  heapC.length = 0;
  heapF.length = 0;
  nav.g[s] = 0;
  nav.from[s] = -1;
  nav.seen[s] = st;
  heapPush(s, 0);
  while (heapC.length) {
    var cur = heapPop();
    if (cur === g) {
      var out = [];
      for (var c = g; c >= 0; c = nav.from[c]) out.push(c);
      return out.reverse();
    }
    if (nav.closed[cur] === st) continue;
    nav.closed[cur] = st;
    var ci = cur % NX;
    var cj = (cur / NX) | 0;
    for (var k = 0; k < 8; k++) {
      var d = STEPS8[k];
      var ni = ci + d[0];
      var nj = cj + d[1];
      if (ni < 0 || nj < 0 || ni >= NX || nj >= NZ || nav.b[nj * NX + ni]) continue;
      if (d[0] && d[1] && (nav.b[cj * NX + ni] || nav.b[nj * NX + ci])) continue;
      var n = nj * NX + ni;
      var ng = nav.g[cur] + d[2];
      if (nav.seen[n] === st && ng >= nav.g[n]) continue;
      nav.seen[n] = st;
      nav.g[n] = ng;
      nav.from[n] = cur;
      var dx = Math.abs(ni - gi);
      var dz = Math.abs(nj - gj);
      heapPush(n, ng + dx + dz - 0.5858 * Math.min(dx, dz));
    }
  }
  return null;
}

// the way from one point to another across the floor: points to walk to, the last one the goal; null if blocked
function route(ax, az, bx, bz) {
  if (nav.dirty) navBuild();
  var s = nearFree(ax, az);
  var g = nearFree(bx, bz);
  if (s < 0 || g < 0) return null;
  var key = s * NX * NZ + g;
  var hit = nav.cache[key];
  if (hit === undefined) {
    var cells = cellPath(s, g);
    if (!cells) hit = null;
    else {
      var pts = cells.map(function (c) { return [NX0 + (c % NX + 0.5) * NC, NZ0 + (((c / NX) | 0) + 0.5) * NC]; });
      var out = [pts[0]];
      var at = 0;
      while (at < pts.length - 1) {
        var far = at + 1;
        for (var k = pts.length - 1; k > at + 1; k--) {
          if (clearLine(pts[at][0], pts[at][1], pts[k][0], pts[k][1])) {
            far = k;
            break;
          }
        }
        out.push(pts[far]);
        at = far;
      }
      hit = out;
    }
    nav.cache[key] = hit;
  }
  if (!hit) return null;
  var r = hit.map(function (p) { return { x: p[0], z: p[1] }; });
  if (Math.hypot(r[0].x - ax, r[0].z - az) > 0.05) r.unshift({ x: ax, z: az });
  r.shift();
  if (!r.length || Math.hypot(r[r.length - 1].x - bx, r[r.length - 1].z - bz) > 0.05) r.push({ x: bx, z: bz });
  return r;
}

// pieces and rows that appear grow up out of the floor
var rising = [];
function rise(g, now, len, s, pc) {
  g.visible = true;
  g.scale.y = 0.01;
  shadowDirty = true;
  if (pc) pc.rising = true;
  rising.push({ g: g, t0: now, len: len || 500, s: s, pc: pc });
}

function riseStep(now) {
  for (var i = rising.length - 1; i >= 0; i--) {
    var r = rising[i];
    var u = Math.min(1, (now - r.t0) / r.len);
    var e = 1 - Math.pow(1 - u, 3);
    r.g.scale.y = Math.max(0.01, e * (1 + 0.15 * Math.sin(u * Math.PI)));
    if (u >= 1) {
      r.g.scale.y = 1;
      rising.splice(i, 1);
      shadowDirty = true;
      cutaway();
      if (r.pc) {
        r.pc.rising = false;
        if (!r.s.pcs.some(function (pc) { return pc && pc.rising; })) settle(r.s);
      }
    }
  }
}

function syncPlace(id, animate, now) {
  var pl = places[id];
  var l = S.pl[id];
  var key = S.pi[id].join();
  if (l === pl.shown && key === pl.key) return;
  pl.items.forEach(function (it) {
    var want = it.only ? l === it.lv : (pl.add ? placeHas(id, it.lv - 1) : it.lv === l);
    if (want && !it.g.visible && animate && pl.shown >= 0) {
      rise(it.g, now, 450);
      dustAt(it.g, now, pl.add ? 8 : 20);
    } else it.g.visible = want;
  });
  pl.shown = l;
  pl.key = key;
  if (id === 'hall' || pl.foot) nav.dirty = true;
  shadowDirty = true;
}

// brings the area to the pieces the sim says it has, in whatever order its items were bought, rising when one is new
function syncArea(s, animate, now) {
  var own = has(s.id);
  var have = own ? pieces(s.id).sort(function (p, q) { return p - q; }) : [];
  var n = have.length;
  var key = have.join();
  if (key === s.key) return;
  var grew = false;
  for (var i = 0; i < s.a.ups.length; i++) {
    var inn = have.indexOf(i) >= 0;
    var pc = inn ? pieceOf(s, i) : s.pcs[i];
    if (!pc) continue;
    if (inn && !pc.on && animate && s.shown >= 0) {
      pc.on = true;
      pc.x.visible = true;
      pc.gb = pc.b.group();
      pc.g = new THREE.Group();
      pc.g.add(pc.gb, pc.x);
      s.group.add(pc.g);
      s.stocked = -1;
      rise(pc.g, now, 450, s, pc);
      dustAt(pc.g, now);
      grew = true;
    } else if (inn) {
      pc.on = true;
      pc.x.visible = true;
      if (!pc.g && !pc.x.parent) s.group.add(pc.x);
    } else {
      pc.on = false;
      pc.x.visible = false;
    }
  }
  if (animate && s.shown === 0 && n > 0) {
    var r = s.a.vacant;
    dust(r[0], r[1], r[2], r[3], now, 30);
  }
  s.open = own;
  s.vacant.visible = !own;
  s.floorG.visible = own;
  if (!grew && !s.pcs.some(function (pc) { return pc && pc.rising; })) settle(s);
  var on = standing(s);
  var glow = on.some(function (pc) { return pc.glow; });
  var gold = on.some(function (pc) { return pc.sign === 'gold'; });
  if (s.signMat && (s.glow !== glow || s.gold !== gold)) {
    if (s.gold !== gold) {
      s.signMat.map.dispose();
      s.signMat.map = signTex(s.id, gold);
    }
    s.signMat.emissive.set(glow ? 0x333333 : 0x000000);
    s.signMat.emissiveMap = glow ? s.signMat.map : null;
    s.signMat.needsUpdate = true;
    s.glow = glow;
    s.gold = gold;
  }
  if (animate && s.shown >= 0 && n > s.shown) truckFor();
  s.shown = n;
  s.key = key;
  nav.dirty = true;
  shadowDirty = true;
}

function sync(animate, now) {
  order.forEach(function (id) { syncArea(shops[id], animate, now); });
  PLACES.forEach(function (p) { syncPlace(p.id, animate, now); });
  ['lot', 'taxi', 'garden'].concat(WING_IDS).forEach(function (id) { places[id].pick.visible = has(PL[id].after); });
  paintPylon();
  cutaway();
}

// the sun's shadows cover the store from the street to the stockroom
function fitShadow() {
  sun.target.position.set(0, 0, -9);
  sun.position.set(-12, 30, 7);
  var sc = sun.shadow.camera;
  sc.left = -25;
  sc.right = 25;
  sc.top = 26;
  sc.bottom = -26;
  sc.far = 100;
  sc.updateProjectionMatrix();
  shadowDirty = true;
}

function pop(now) {
  for (var id in bump) {
    var u = (now - bump[id]) / 650;
    var s = shops[id];
    if (!s) {
      delete bump[id];
      continue;
    }
    var k = u >= 1 ? 1 : 1 + 0.04 * Math.sin(u * Math.PI) * (1 - u);
    s.group.scale.set(k, k, k);
    s.group.position.set(s.cx * (1 - k), 0, s.cz * (1 - k));
    if (u >= 1) {
      delete bump[id];
      shadowDirty = true;
    }
  }
}

// Traffic. Cars run both ways along the street; a shopper's car turns into the lot from the east, parks in a free bay
// and leaves by the west exit once its driver is back. Taxis stop at the stand, the delivery van backs into the loading
// bay, and everything waits for people on the crossing and for the car in front
var blobGeo = new THREE.CircleGeometry(0.2, 16);
var blobMat = new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.18, depthWrite: false });
var carShadow = new THREE.PlaneGeometry(0.8, 1.3);

function vehicle(ref) {
  var g = mesh(ref, 0, 0, 0);
  g.traverse(function (o) { if (o.isMesh) o.castShadow = false; });
  var sh = new THREE.Mesh(carShadow, blobMat);
  sh.rotation.x = -Math.PI / 2;
  sh.position.y = 0.03;
  g.add(sh);
  root.add(g);
  return g;
}

function addCar(ref, path, kind, extra) {
  var o = vehicle(ref);
  o.position.set(path[0].x, 0, path[0].z);
  var c = { o: o, path: path, i: 1, kind: kind, speed: 0, wait: 0 };
  for (var k in extra) c[k] = extra[k];
  var q = path[1];
  o.rotation.y = Math.atan2(q.x - path[0].x, q.z - path[0].z);
  cars.push(c);
  return c;
}

function road(dir) {
  return dir > 0 ? [{ x: -62, z: LANE_E }, { x: 62, z: LANE_E }] : [{ x: 62, z: LANE_W }, { x: -62, z: LANE_W }];
}

var trafficT = 0;
var carT = 4;
var taxiT = 8;
var truckQ = 0;
var truckT = 25;
var docked = 0;

function truckFor() {
  truckQ = Math.min(2, truckQ + 1);
}

function freeBay() {
  var l = S.pl.lot;
  var free = bays.filter(function (b) { return b.lv <= l && !b.car; });
  if (!free.length) return null;
  free.sort(function (a, b) { return Math.abs(a.x) - Math.abs(b.x) + (Math.random() - 0.5) * 3; });
  return free[0];
}

function trafficStep(dt) {
  trafficT -= dt;
  carT -= dt;
  taxiT -= dt;
  truckT -= dt;
  var through = cars.filter(function (c) { return c.kind === 'pass'; }).length;
  if (trafficT <= 0 && through < 5) {
    var d = Math.random() < 0.5 ? 1 : -1;
    addCar(CARS[Math.floor(Math.random() * CARS.length)], road(d), 'pass', { lane: d });
    trafficT = 2 + Math.random() * 3;
  }
  if (carT <= 0 && carQ.length) {
    var bay = freeBay();
    if (bay) {
      var p = [{ x: 62, z: LANE_W }, { x: DRIVE + 0.6, z: LANE_W, lane: -1 }, { x: DRIVE, z: 10.2 }, { x: DRIVE, z: AISLE + 0.4 }, { x: DRIVE - 0.6, z: AISLE },
        { x: bay.x + 0.6, z: AISLE }, { x: bay.x, z: AISLE + bay.nose * 0.6 }, { x: bay.x, z: bay.z, park: true }];
      bay.car = addCar(CARS[Math.floor(Math.random() * CARS.length)], p, 'shop', { bay: bay, lane: -1, cust: carQ.shift() });
    }
    carT = 1.2 + Math.random();
  }
  // with no bay free the driver parks down the street and walks over
  if (carQ.length && carQ[0].age > 15) onFoot(carQ.shift());
  if (taxiT <= 0 && taxiQ.length && cars.filter(function (c) { return c.kind === 'taxi'; }).length < 3) {
    addCar('car/taxi', [{ x: 62, z: LANE_W }, { x: 0, z: LANE_W, stop: 2.2, drop: taxiQ.splice(0, 2), lane: -1 }, { x: -62, z: LANE_W, lane: -1 }],
      'taxi', { lane: -1 });
    taxiT = 3;
  }
  if (taxiQ.length && taxiQ[0].age > 25) onFoot(taxiQ.shift());
  if (truckT <= 0) {
    truckFor();
    truckT = 60;
  }
  if (truckQ > 0 && !cars.some(function (c) { return c.kind === 'truck'; })) {
    truckQ--;
    // down the service road to the yard, then backing into a dock
    var dx = PLAN.docks[2 + (docked++ & 1)];
    var dz = SB - 1.95;
    var van = addCar('car/delivery', [{ x: 62, z: LANE_W }, { x: ROAD + 0.6, z: LANE_W, lane: -1 }, { x: ROAD, z: 10.2 }, { x: ROAD, z: -37 }, { x: dx, z: -37 },
      { x: dx, z: dz, rev: true, stop: 5, unload: true }, { x: dx, z: -37 }, { x: ROAD, z: -37 }, { x: ROAD, z: 10.2 }, { x: ROAD - 0.6, z: LANE_W, lane: -1 },
      { x: -62, z: LANE_W, lane: -1 }], 'truck', { lane: 0 });
    van.o.scale.setScalar(1.7);
  }
  for (var i = cars.length - 1; i >= 0; i--) {
    var c = cars[i];
    if (carStep(c, dt)) {
      root.remove(c.o);
      cars.splice(i, 1);
    }
  }
}

function blocked(c) {
  var o = c.o.position;
  var q = c.path[c.i];
  var dx = q.x - o.x;
  var dz = q.z - o.z;
  var d = Math.hypot(dx, dz) || 1;
  var fx = dx / d;
  var fz = dz / d;
  for (var i = 0; i < cars.length; i++) {
    var e = cars[i];
    if (e === c || e.parked || c.kind === 'truck') continue;
    var rx = e.o.position.x - o.x;
    var rz = e.o.position.z - o.z;
    var ahead = rx * fx + rz * fz;
    var side = Math.abs(rx * fz - rz * fx);
    if (ahead > 0.2 && ahead < 1.7 && side < 0.6) return true;
  }
  // people on the crossing or the walkway
  if (Math.abs(o.z - 12) < 2 && Math.abs(o.x) < 4.5 && o.x * fx < 0) {
    for (var j = 0; j < people.length; j++) {
      var p = people[j].f.obj.position;
      if (people[j].path && Math.abs(p.x) < 1.6 && p.z > 10.3 && p.z < 13.7) return true;
    }
  }
  var wx = o.x < 0 ? WALKS[0] : WALKS[1];
  if (Math.abs(o.z - AISLE) < 0.8 && Math.abs(o.x - wx) < 3.4 && (o.x - wx) * fx < 0) {
    for (var k = 0; k < people.length; k++) {
      var pp = people[k].f.obj.position;
      if (people[k].path && Math.abs(pp.x - wx) < 1.5 && Math.abs(pp.z - AISLE) < 0.8) return true;
    }
  }
  return false;
}

function carStep(c, dt) {
  if (c.parked) return false;
  if (c.wait > 0) {
    c.wait -= dt;
    return false;
  }
  var o = c.o.position;
  var q = c.path[c.i];
  var dx = q.x - o.x;
  var dz = q.z - o.z;
  var d = Math.hypot(dx, dz);
  var onRoad = Math.abs(o.z - 12) < 1.6;
  var top = onRoad ? 3.2 : 1.5;
  var want = blocked(c) ? 0 : top;
  if (q.stop || q.park) want = Math.min(want, Math.max(0.35, d * 1.6));
  c.speed += Math.max(-6 * dt, Math.min(3 * dt, want - c.speed));
  var step = c.speed * dt;
  if (d > 0.001) {
    var head = Math.atan2(dx, dz) + (q.rev ? Math.PI : 0);
    var da = Math.atan2(Math.sin(head - c.o.rotation.y), Math.cos(head - c.o.rotation.y));
    c.o.rotation.y += da * Math.min(1, dt * (onRoad ? 6 : 4));
  }
  if (d <= Math.max(step, 0.02)) {
    o.x = q.x;
    o.z = q.z;
    c.i++;
    if (q.park) {
      c.parked = true;
      c.speed = 0;
      spawnFrom('car', c, 0, c.cust);
      return false;
    }
    if (q.stop) {
      c.wait = q.stop;
      c.speed = 0;
      if (q.drop) q.drop.forEach(function (r, n) { spawnFrom('taxi', c, n, r); });
      if (q.unload) shadowDirty = true;
    }
    return c.i >= c.path.length;
  }
  o.x += dx / d * step;
  o.z += dz / d * step;
  return false;
}

// the driver is back: reverse out of the bay and leave by the west exit
function leaveBay(c) {
  var b = c.bay;
  c.parked = false;
  c.path = [{ x: b.x, z: b.z }, { x: b.x, z: AISLE, rev: true }, { x: b.x - 0.6, z: AISLE }, { x: -DRIVE + 0.6, z: AISLE }, { x: -DRIVE, z: AISLE + 0.4 },
    { x: -DRIVE, z: 10.2 }, { x: -DRIVE - 0.6, z: LANE_W, lane: -1 }, { x: -62, z: LANE_W, lane: -1 }];
  c.i = 1;
  c.speed = 0;
  setTimeout(function () { if (b.car === c) b.car = null; }, 2500);
}

// Every shopper the sim lets in gets a figure when one is free. It comes by car, by taxi or on foot, takes a basket
// inside the doors, looks round one or two departments and goes to the line the sim gives it at the front aisle,
// and leaves with its bags the way it came. Cars and taxis wait here for a bay or a turn
var carQ = [];
var taxiQ = [];
var passT = 0;
var seed = 0;

function arrive(c) {
  if (!ready || speed !== 1) return;
  c.v = true;
  if (c.garden) gardenRoute(c);
  else if (c.by === 'car') carQ.push(c);
  else if (c.by === 'taxi') taxiQ.push(c);
  else onFoot(c);
}

function onFoot(c) {
  spawnFrom('walk', null, 0, c);
}

// a coin that jumps off the till when a shopper pays
var pops = [];
var coinGeo = new THREE.CylinderGeometry(0.08, 0.08, 0.03, 14);
var coinMat = new THREE.MeshLambertMaterial({ color: 0xffd23a, emissive: 0x6a4a00 });
var tillAt = 0;

function paid(till, now) {
  var m = new THREE.Mesh(coinGeo, coinMat);
  m.rotation.x = Math.PI / 2;
  m.position.set(till[0], till[1] + 0.1, till[2]);
  root.add(m);
  pops.push({ m: m, t0: now, y: till[1] + 0.1 });
  if (focus.dist < 30 && now - tillAt > 1500 && window.sfx) {
    tillAt = now;
    sfx('till');
  }
}

function popsStep(now) {
  for (var i = pops.length - 1; i >= 0; i--) {
    var p = pops[i];
    var u = (now - p.t0) / 900;
    if (u >= 1) {
      root.remove(p.m);
      pops.splice(i, 1);
      continue;
    }
    p.m.position.y = p.y + Math.sin(u * Math.PI * 0.8) * 0.55;
    p.m.rotation.z = u * 9;
    p.m.scale.setScalar(1 - u * u * 0.8);
  }
}

function carried(f, ref, y) {
  var m = mesh(ref, -0.26, 0.03, 0.3, y);
  m.traverse(function (o) { o.castShadow = false; });
  m.visible = false;
  f.obj.add(m);
  return m;
}

function person(i) {
  var f = figure(FOLK[i % FOLK.length], 'walk');
  var bag = carried(f, 'food/bag', 0.03);
  var basket = carried(f, 'shop/shopping-basket*0.62', 0.07);
  var plant = carried(f, 'furn/plantSmall2*1.6', 0.12);
  figs.push(f.obj);
  f.obj.traverse(function (o) { if (o.isMesh) o.castShadow = false; });
  f.obj.visible = false;
  root.add(f.obj);
  return { f: f, bag: bag, basket: basket, plant: plant, path: null, i: 0, wait: 0, speed: 1.05 + (i % 5) * 0.08 };
}

function busy(p) {
  return p.path || p.lane || p.hold;
}

function spare() {
  var n = 0;
  people.forEach(function (p) { if (busy(p)) n++; });
  return 64 - n;
}

function idlePerson() {
  for (var i = 0; i < people.length; i++) if (!busy(people[i])) return people[i];
  if (people.length >= 64) return null;
  var p = person(people.length * 7 + 3);
  people.push(p);
  return p;
}

function spotsOf(pc) {
  return pc.spots.filter(function (q) { return canStand(q.at[0], q.at[1]); });
}

function pickShop(not) {
  var open = order.filter(function (id) { return id !== not && has(id) && lookable(shops[id]).some(function (pc) { return spotsOf(pc).length; }); });
  if (!open.length) return null;
  var tot = 0;
  var w = open.map(function (id) {
    var v = Math.sqrt(lv(id)) + 1;
    tot += v;
    return v;
  });
  var r = Math.random() * tot;
  for (var i = 0; i < open.length; i++) {
    r -= w[i];
    if (r <= 0) return shops[open[i]];
  }
  return shops[open[open.length - 1]];
}

// adds the way from the last point of a path to (x, z); false if the floor has none
function walkTo(pts, x, z) {
  var last = pts[pts.length - 1];
  var r = route(last.x, last.z, x, z);
  if (!r) return false;
  r.forEach(function (q) { pts.push(q); });
  return true;
}

// into an area to one of its pieces and a look at the goods
function visit(s, pts) {
  var pcs = lookable(s).filter(function (pc) { return spotsOf(pc).length; });
  if (!pcs.length) return false;
  for (var tries = 0; tries < 6; tries++) {
    var sps = spotsOf(pcs[Math.floor(Math.random() * pcs.length)]);
    var sp = sps[Math.floor(Math.random() * sps.length)];
    if (!walkTo(pts, sp.at[0], sp.at[1])) continue;
    var stand = pts[pts.length - 1];
    stand.wait = 1.6 + Math.random();
    stand.act = 'pick-up';
    stand.face = sp.face;
    return true;
  }
  return false;
}

// the walk from an entrance to a basket, round one or two areas and down to the front aisle, where the shopper
// picks a checkout
function storeRoute(pts, ei) {
  var en = PLAN.entrances[ei];
  var jx = (Math.random() - 0.5) * 0.4;
  pts.push({ x: en.x + jx, z: FRONT + 0.4 }, { x: en.x + jx, z: 1.8 });
  pts.push({ x: en.basket[0] + 0.45, z: en.basket[1], wait: 0.7, act: 'pick-up', face: -Math.PI / 2, basket: true });
  var s = pickShop();
  visit(s, pts);
  if (Math.random() < 0.4) {
    var t = pickShop(s.id);
    if (t) visit(t, pts);
  }
  var ax = Math.max(-6.4, Math.min(6.4, pts[pts.length - 1].x)) + (Math.random() - 0.5) * 1.2;
  if (!walkTo(pts, ax, CROSS)) pts.push({ x: ax, z: CROSS });
  pts[pts.length - 1].pick = true;
  return pts;
}

function start(p, pts, extra) {
  p.path = pts;
  p.i = 1;
  p.wait = 0;
  p.car = null;
  p.lane = null;
  p.hold = false;
  p.cust = null;
  p.after = null;
  p.cum = [0];
  pts.forEach(function (q, k) { if (k) p.cum.push(p.cum[k - 1] + Math.hypot(q.x - pts[k - 1].x, q.z - pts[k - 1].z)); });
  p.trip = 0;
  pts.forEach(function (q, k) { if (q.pick) p.trip = p.cum[k]; });
  p.in = 0;
  for (var j = 0; j < pts.length && !p.in; j++) if (pts[j].z < FRONT && j) p.in = p.cum[j];
  for (var k in extra) p[k] = extra[k];
  p.f.obj.position.set(pts[0].x, 0, pts[0].z);
  p.f.obj.visible = true;
  p.bag.visible = false;
  p.basket.visible = false;
  p.plant.visible = false;
  act(p.f, 'walk', 0.2);
}

// where a shopper who has paid walks out: down the lane or past the kiosk to the front, along it to the nearest
// entrance and out the way it came
function leave(p, x, z) {
  var ei = x < 0 ? 0 : 1;
  var en = PLAN.entrances[ei];
  p.path = [{ x: x, z: z }, { x: x, z: EXIT }, { x: en.x, z: EXIT }, { x: en.x, z: FRONT + 0.4 }].concat(p.after(ei));
  p.i = 1;
  act(p.f, 'walk', 0.2);
}

// at the front aisle the sim sends the shopper to a line; while every line is full it steps out of the aisle and waits
function front(p) {
  var c = p.cust;
  var o = p.f.obj.position;
  p.trip = 0;
  if (c.lost) return giveUp(p);
  if (c.done) return outWith(p);
  p.path = [{ x: o.x, z: o.z }, c.garden ? { x: o.x, z: o.z, stop: true, face: Math.PI / 2 } : { x: o.x, z: CROSS - 0.45, stop: true, face: 0 }];
  p.i = 1;
  if (c.at) toTill(p);
  else atFront(c);
}

function toTill(p) {
  var c = p.cust;
  var t = places.hall.tills[c.at.i];
  var o = p.f.obj.position;
  p.hold = false;
  p.path = null;
  if (t.k !== 'self') {
    p.lane = t;
    if (p.f.cur !== p.f.acts.walk) act(p.f, 'walk', 0.2);
    return;
  }
  p.path = [{ x: o.x, z: o.z }, { x: t.x, z: CROSS }, { x: t.x, z: t.z, stop: true, here: true, face: -Math.PI / 2, act: 'pick-up' }];
  p.i = 1;
  act(p.f, 'walk', 0.2);
}

// a line: the one at the front pays, the rest stand behind and step up when it moves. A lane is reached along the
// front aisle and then down its west side
function queueStep(p, dt) {
  var t = p.lane;
  var c = p.cust;
  var o = p.f.obj.position;
  var slot = Math.max(0, c.at ? c.at.q.indexOf(c) : 0);
  var at = t.spot(slot);
  var tx = at[0];
  var tz = at[1];
  if (t.k === 'lane' && Math.abs(o.x - tx) > 0.01 && o.z < CROSS + 0.05) tz = CROSS;
  var dx = tx - o.x;
  var dz = tz - o.z;
  var d = Math.hypot(dx, dz);
  if (d > 0.01) {
    var step = Math.min(d, p.speed * dt);
    o.x += dx / d * step;
    o.z += dz / d * step;
    var want = Math.atan2(dx, dz);
    p.f.obj.rotation.y += Math.atan2(Math.sin(want - p.f.obj.rotation.y), Math.cos(want - p.f.obj.rotation.y)) * Math.min(1, dt * 10);
    if (p.f.cur !== p.f.acts.walk) act(p.f, 'walk', 0.2);
    return;
  }
  if (p.f.cur !== p.f.acts.idle) act(p.f, 'idle', 0.2);
  p.f.obj.rotation.y = at[2];
  if (slot === 0 && !c.here) {
    c.here = true;
    act(t.cashier, 'pick-up', 0.2);
  }
}

// paid: a bag instead of the basket (a garden shopper keeps its plant), and out the way it came
function done(p, t) {
  var o = p.f.obj.position;
  p.lane = null;
  p.hold = false;
  p.i = 1;
  if (t.k === 'garden') {
    act(t.cashier, 'idle', 0.3);
    p.path = [{ x: o.x, z: o.z }].concat(p.after(0));
    act(p.f, 'walk', 0.2);
    return;
  }
  p.basket.visible = false;
  p.bag.visible = true;
  if (t.k === 'lane') {
    act(t.cashier, 'idle', 0.3);
    leave(p, o.x, o.z);
  } else {
    var ei = o.x < 0 ? 0 : 1;
    var en = PLAN.entrances[ei];
    p.path = [{ x: o.x, z: o.z }, { x: t.x, z: EXIT }, { x: en.x, z: EXIT }, { x: en.x, z: FRONT + 0.4 }].concat(p.after(ei));
    act(p.f, 'walk', 0.2);
  }
}

// paid while nobody watched it (at a test speed): straight out with the bag
function outWith(p) {
  var o = p.f.obj.position;
  p.basket.visible = false;
  p.bag.visible = !p.cust.garden;
  if (p.cust.garden) {
    p.path = [{ x: o.x, z: o.z }].concat(p.after(0));
    p.i = 1;
    act(p.f, 'walk', 0.2);
  } else leave(p, o.x, o.z);
}

// the lines stayed full: the basket goes back on the stack inside the doors and the shopper leaves without buying
function giveUp(p) {
  var o = p.f.obj.position;
  p.hold = false;
  p.lane = null;
  p.i = 1;
  say(p, 'Lines too long!');
  if (p.cust.garden) {
    p.plant.visible = false;
    p.path = [{ x: o.x, z: o.z }].concat(p.after(0));
  } else {
    var ei = o.x < 0 ? 0 : 1;
    var en = PLAN.entrances[ei];
    var stack = { x: en.basket[0] + 0.45, z: en.basket[1] + 0.1, wait: 0.7, act: 'pick-up', face: -Math.PI / 2, drop: true };
    var pts = [{ x: o.x, z: o.z }];
    if (!walkTo(pts, stack.x, stack.z)) pts.push({ x: o.x, z: EXIT });
    pts.push(stack);
    p.path = pts.concat([{ x: en.x, z: stack.z }, { x: en.x, z: FRONT + 0.4 }], p.after(ei));
  }
  act(p.f, 'walk', 0.2);
}

// what the sim tells the view about its shoppers; for a payment it returns where on screen the till is, if it shows
function shopperEvent(ev, c, t) {
  if (ev === 'in') return arrive(c);
  var p = c.p;
  if (!p || p.cust !== c) return null;
  if (ev === 'till') toTill(p);
  else if (ev === 'lost') giveUp(p);
  else if (ev === 'paid') {
    var tt = places.hall.tills[t.i];
    done(p, tt);
    paid(tt.till, performance.now());
    toScreen(tt.till[0], tt.till[1] + 0.45, tt.till[2], sp);
    if (focus.dist < 45 && sp.z < 1 && sp.x > 20 && sp.x < cw - 20 && sp.y > IT + 20 && sp.y < ch - IB) return { x: sp.x, y: sp.y };
  }
  return null;
}

// a few words over a shopper's head, or the name of an upgrade over the piece it added
var says = [];

function say(p, text) {
  if (says.filter(function (w) { return w.p; }).length > 2) return;
  var el = document.createElement('div');
  el.className = 'say';
  el.textContent = text;
  tagsEl.appendChild(el);
  says.push({ p: p, el: el, t0: performance.now(), len: 2200 });
}

function popName(x, z, text, id) {
  var el = document.createElement('div');
  el.className = 'say';
  el.textContent = text;
  tagsEl.appendChild(el);
  says.push({ at: [x, 1.0, z], id: id, el: el, t0: performance.now(), len: 2800 });
}

function saysStep(now) {
  for (var i = says.length - 1; i >= 0; i--) {
    var w = says[i];
    var u = (now - w.t0) / w.len;
    if (w.p) {
      var o = w.p.f.obj.position;
      toScreen(o.x, 1.7, o.z, sp);
    } else toScreen(w.at[0], w.at[1], w.at[2], sp);
    if (u >= 1 || w.p && !w.p.f.obj.visible || sp.z > 1) {
      w.el.remove();
      says.splice(i, 1);
      continue;
    }
    var hw = w.at ? w.el.offsetWidth / 2 + 6 : 0;
    var px = hw ? Math.max(hw, Math.min(cw - hw, sp.x)) : sp.x;
    w.el.style.transform = 'translate(' + Math.round(px) + 'px,' + Math.round(sp.y - u * 12) + 'px) translate(-50%,-100%)';
    w.el.style.opacity = u > 0.8 ? ((1 - u) * 5).toFixed(2) : '1';
  }
}

function spawnFrom(kind, c, n, cu) {
  // with every figure in use the shopper does not come in: nobody unseen stands in a line
  var p = pickShop() && idlePerson();
  if (!p) {
    if (kind === 'car') leaveBay(c);
    gone(cu);
    return false;
  }
  var pts = [];
  var back;
  var ei;
  if (kind === 'car') {
    var b = c.bay;
    var ex = b.x + 0.5;
    ei = b.x < 0 ? 0 : 1;
    pts.push({ x: ex, z: b.z }, { x: ex, z: AISLE }, { x: WALKS[ei], z: AISLE }, { x: WALKS[ei], z: LOT[0] - 0.2 });
    back = function (e) { return [{ x: WALKS[e], z: LOT[0] - 0.2 }, { x: WALKS[e], z: AISLE }, { x: ex, z: AISLE }, { x: ex, z: b.z }]; };
  } else if (kind === 'taxi') {
    var tx = -0.4 + n * 0.5;
    ei = Math.random() < 0.5 ? 0 : 1;
    pts.push({ x: tx, z: 10.9 }, { x: tx, z: WALK_N }, { x: WALKS[ei], z: WALK_N }, { x: WALKS[ei], z: LOT[0] - 0.2 });
    var gone2 = 16 + Math.random() * 4;
    back = function (e) { return [{ x: WALKS[e], z: LOT[0] - 0.2 }, { x: WALKS[e], z: WALK_N }, { x: (e ? 1 : -1) * gone2, z: WALK_N }]; };
  } else {
    var sd = Math.random() < 0.5 ? -1 : 1;
    var south = Math.random() < 0.4;
    var wz = south ? WALK_S : WALK_N;
    var off = 18 + Math.random() * 4;
    var off2 = 18 + Math.random() * 4;
    ei = sd < 0 ? 0 : 1;
    pts.push({ x: sd * off, z: wz }, { x: WALKS[ei], z: wz });
    if (south) pts.push({ x: WALKS[ei], z: WALK_N });
    pts.push({ x: WALKS[ei], z: LOT[0] - 0.2 });
    back = function (e) {
      var out = [{ x: WALKS[e], z: LOT[0] - 0.2 }, { x: WALKS[e], z: WALK_N }];
      if (south) out.push({ x: WALKS[e], z: WALK_S });
      out.push({ x: (e ? 1 : -1) * off2, z: wz });
      return out;
    };
  }
  storeRoute(pts, ei);
  start(p, pts, { car: kind === 'car' ? c : null, cust: cu });
  cu.p = p;
  p.after = back;
  // the store opens with a few shoppers already inside: one past the baskets, one in an area, one on its way to pay
  if (seed > 0) {
    seed--;
    var k = 0;
    while (!pts[k].basket) k++;
    k = [pts.length - 2, Math.round((k + pts.length - 2) / 2), k][seed];
    p.i = k + 1;
    p.f.obj.position.set(pts[k].x, 0, pts[k].z);
    p.basket.visible = true;
  }
  return true;
}

// A garden visitor only wants a plant: along the sidewalk, up the grass west of the lot (clear of the cars' exit),
// in through the gate to a flower display, and out again to pay at the garden's till by the gate
function gardenRoute(c) {
  var p = idlePerson();
  if (!p) {
    gone(c);
    return;
  }
  var sd = Math.random() < 0.5 ? -1 : 1;
  var gx = GATE_X;
  var rows = [2.0, 0.6, -0.8].slice(0, Math.min(3, S.pl.garden));
  var z = rows[Math.floor(Math.random() * rows.length)];
  var west = Math.random() < 0.5;
  var ex = sd * (16 + Math.random() * 4) - 2;
  var lane = -11.6 + DX;
  var pts = [{ x: ex, z: WALK_N }, { x: lane, z: WALK_N }, { x: lane, z: LOT[0] + 0.3 }, { x: gx, z: LOT[0] - 0.1 }, { x: gx, z: z + 0.7 },
    { x: gx, z: z, wait: 1.8, act: 'pick-up', face: west ? -Math.PI / 2 : Math.PI / 2, plant: true }, { x: gx, z: GARDEN[3] + 0.45, pick: true }];
  start(p, pts, { cust: c });
  c.p = p;
  var out = [{ x: gx, z: LOT[0] - 0.1 }, { x: lane, z: LOT[0] + 0.3 }, { x: lane, z: WALK_N }, { x: ex, z: WALK_N }];
  p.after = function () { return out; };
}

function crowdStep(dt) {
  passT -= dt;
  if (passT <= 0) {
    var p = spare() > 8 && idlePerson();
    if (p) {
      var sd = Math.random() < 0.5 ? -1 : 1;
      var wz = Math.random() < 0.5 ? WALK_N : WALK_S;
      start(p, [{ x: sd * 60, z: wz + (Math.random() - 0.5) * 0.3 }, { x: -sd * 60, z: wz }]);
    }
    passT = 3 + Math.random() * 3;
  }
  people.forEach(function (p) {
    if (p.lane) {
      if (p.f.mixer) p.f.mixer.update(dt);
      queueStep(p, dt);
      return;
    }
    if (p.hold) {
      if (p.f.mixer) p.f.mixer.update(dt);
      return;
    }
    if (!p.path) return;
    var o = p.f.obj;
    var far = Math.abs(o.position.x) > 26;
    if (p.f.mixer && !far) p.f.mixer.update(dt);
    if (p.wait > 0) {
      p.wait -= dt;
      if (p.wait <= 0) act(p.f, 'walk', 0.2);
      return;
    }
    var q = p.path[p.i];
    var dx = q.x - o.position.x;
    var dz = q.z - o.position.z;
    var d = Math.hypot(dx, dz);
    var step = p.speed * dt * (far ? 2.5 : 1);
    if (d > 0.001) {
      var want = Math.atan2(dx, dz);
      var da = Math.atan2(Math.sin(want - o.rotation.y), Math.cos(want - o.rotation.y));
      o.rotation.y += da * Math.min(1, dt * 10);
    }
    if (d > step) {
      o.position.x += dx / d * step;
      o.position.z += dz / d * step;
      return;
    }
    o.position.x = q.x;
    o.position.z = q.z;
    p.i++;
    if (q.wait) {
      p.wait = q.wait;
      if (q.face !== undefined) o.rotation.y = q.face;
      act(p.f, q.act || 'idle', 0.2);
    }
    if (q.basket) p.basket.visible = true;
    if (q.drop) p.basket.visible = false;
    if (q.plant) p.plant.visible = true;
    if (q.pick) {
      front(p);
      return;
    }
    // standing at a self checkout, or out of the aisle waiting for room in a line
    if (q.stop) {
      p.path = null;
      p.hold = true;
      o.rotation.y = q.face;
      act(p.f, q.act || 'idle', 0.2);
      if (q.here) p.cust.here = true;
      return;
    }
    if (p.i >= p.path.length) {
      p.path = null;
      p.cust = null;
      o.visible = false;
      if (p.car) leaveBay(p.car);
    }
  });
}

// an associate walks the area, stopping at a piece now and then to put goods out
function staffStep(s, h, dt) {
  if (h.f.mixer) h.f.mixer.update(dt);
  var o = h.f.obj;
  if (!h.path) {
    if (!free(o.x, o.z)) {
      var c = nearFree(o.x, o.z);
      if (c >= 0) o.position.set(NX0 + (c % NX + 0.5) * NC, 0, NZ0 + (((c / NX) | 0) + 0.5) * NC);
    }
    var pcs = lookable(s);
    if (!pcs.length) return;
    var sps = spotsOf(pcs[Math.floor(Math.random() * pcs.length)]);
    if (!sps.length) return;
    var sp = sps[Math.floor(Math.random() * sps.length)];
    var r = route(o.position.x, o.position.z, sp.at[0], sp.at[1]);
    if (!r) return;
    r[r.length - 1].wait = 2.5;
    r[r.length - 1].face = sp.face;
    h.path = [{ x: o.position.x, z: o.position.z }].concat(r);
    h.i = 1;
    act(h.f, 'walk', 0.2);
  }
  if (h.wait > 0) {
    h.wait -= dt;
    if (h.wait <= 0) h.path = null;
    return;
  }
  var q = h.path[h.i];
  var dx = q.x - o.position.x;
  var dz = q.z - o.position.z;
  var d = Math.hypot(dx, dz);
  var step = 0.9 * dt;
  if (d > 0.001) o.rotation.y = Math.atan2(dx, dz);
  if (d > step) {
    o.position.x += dx / d * step;
    o.position.z += dz / d * step;
    return;
  }
  o.position.x = q.x;
  o.position.z = q.z;
  h.i++;
  if (q.wait) {
    h.wait = q.wait;
    o.rotation.y = q.face;
    act(h.f, 'pick-up', 0.2);
  } else if (h.i >= h.path.length) h.path = null;
}

// The stockers come out of the stock doors in the back wall from the stockroom behind it. A stocker's place on its
// trip comes from the sim's clock for it, so the walk takes as long as the sim says at any speed
var STAFF = 'shop/character-employee@5,3>4,2';
// where the stockers wait: in the lane in front of the racking, the dolly in front
// stockers walk the lane at LANE; they wait a little further back
var LANE = -23.1;
var STAND = PLAN.idle.map(function (q) { return { x: q[0], z: q[1], face: Math.PI }; });
// where the dolly stands beside a stocker working a shelf, in his own frame, in the order tried
var PARK = [[0.5, 0.02], [-0.5, 0.02], [0, -0.45], [0.45, -0.3], [-0.45, -0.3]];
var DOOR_C = 0x8d93a6;
var LEAF_C = 0xe0823d;
var stockers = [];
var dollies = [];
var stockN = -1;
// the stockers' ground shadows are one instanced mesh, to keep the draw calls down
var shadows;
var blobAt = new THREE.Matrix4();
var sdoors = [];

// a stock door: posts and a lintel in the wall, one leaf that swings out into the sales floor; all of it as low as the
// wall it stands in
function stockDoor(d) {
  var c = flat(DOOR_C);
  var dg = new THREE.Group();
  dg.scale.y = 0.12;
  [[d - 0.4, 0.2, 1], [d + 0.4, 0.2, 1], [d, 0.6, 0.12]].forEach(function (q, i) {
    var m = new THREE.Mesh(new THREE.BoxGeometry(q[1], i < 2 ? 1 : 0.12, 0.6), c);
    m.position.set(q[0], i < 2 ? 0.5 : 0.94, BACK);
    dg.add(m);
  });
  var piv = new THREE.Group();
  piv.position.set(d - 0.3, 0, BACK);
  var leaf = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.86, 0.04), flat(LEAF_C));
  leaf.position.set(0.3, 0.43, 0);
  piv.add(leaf);
  dg.add(piv);
  root.add(dg);
  sdoors.push({ x: d, open: 0, leaf: piv });
}

function stockDoorStep(dt, k, near) {
  var d = sdoors[k];
  var want = near ? 1 : 0;
  if (want === d.open) return;
  d.open = want > d.open ? Math.min(1, d.open + dt * 3) : Math.max(0, d.open - dt * 1.2);
  var e = d.open * d.open * (3 - 2 * d.open);
  d.leaf.rotation.y = -e * 1.6;
  // the shadow map is redrawn once the leaf stops, not on every frame of the swing
  if (d.open === 0 || d.open === 1) shadowDirty = true;
}

// a dolly with n boxes stacked on it, drawn as one mesh
function dollyGroup(n) {
  var b = new Batch();
  b.add('shop/hand-truck', 0, 0, 0);
  for (var i = 0; i < n; i++) b.add(PARCEL, 0, 0, 0, 0.07 + i * 0.1);
  return b.group(false);
}

function newStocker(i) {
  var f = figure(STAFF, 'idle');
  var hold = new THREE.Group();
  var rig = dollies.map(function (g) {
    var c = g.clone();
    c.visible = false;
    hold.add(c);
    return c;
  });
  f.obj.add(hold);
  f.obj.visible = false;
  root.add(f.obj);
  return { f: f, hold: hold, rig: rig, n: -1, i: i, id: null, t: 0, park: PARK[0], shown: false };
}

// the way out for one trip: the lane, the nearest door for this stocker and piece, then across the floor to a spot of
// the area. The stocker picks the piece once and keeps it until the trip ends
function plan(k, w) {
  var s = shops[w.id];
  var h = STAND[k.i];
  var pcs = lookable(s).filter(function (pc) { return spotsOf(pc).length; });
  var r = null;
  var door = PLAN.doors[0];
  k.face = Math.PI;
  // a piece with room for the dolly beside it, when there is one among the first few picks
  for (var tries = 0; tries < 8 && pcs.length; tries++) {
    var sps = spotsOf(pcs[Math.floor(Math.random() * pcs.length)]);
    var sp = sps[Math.floor(Math.random() * sps.length)];
    var rr = null;
    var d0 = 0;
    var best = 1e9;
    PLAN.doors.forEach(function (d) {
      var q = route(d, BACK + 0.6, sp.at[0], sp.at[1]);
      if (!q) return;
      var len = Math.abs(h.x - d) + q.reduce(function (t, p) { return { x: p.x, z: p.z, d: t.d + Math.hypot(p.x - t.x, p.z - t.z) }; }, { x: d, z: BACK + 0.6, d: 0 }).d;
      if (len < best) {
        best = len;
        rr = q;
        d0 = d;
      }
    });
    if (!rr) continue;
    r = rr;
    door = d0;
    k.face = sp.face;
    if (parkAt(k, rr[rr.length - 1])) break;
  }
  if (!r) r = [{ x: door, z: BACK + 0.6 }];
  var raw = [h, { x: h.x, z: LANE }, { x: door, z: LANE }, { x: door, z: BACK + 0.6 }].concat(r);
  var pts = [raw[0]];
  var cum = [0];
  raw.forEach(function (q, j) {
    var a = pts[pts.length - 1];
    var d = Math.hypot(q.x - a.x, q.z - a.z);
    if (j && d > 0.01) {
      pts.push(q);
      cum.push(cum[cum.length - 1] + d);
    }
  });
  k.pts = pts;
  k.cum = cum;
}

// the first of PARK that clears the floor for a stocker standing at `end`; sets k.park, and says whether there was one
function parkAt(k, end) {
  var cs = Math.cos(k.face);
  var sn = Math.sin(k.face);
  k.park = PARK[0];
  return PARK.some(function (q) {
    var clear = free(end.x + q[0] * cs + q[1] * sn, end.z - q[0] * sn + q[1] * cs);
    if (clear) k.park = q;
    return clear;
  });
}

// where on the path, and which way it runs there
function along(k, d) {
  var c = k.cum;
  var i = 1;
  while (i < c.length - 1 && c[i] < d) i++;
  var a = k.pts[i - 1];
  var b = k.pts[i];
  var u = Math.max(0, Math.min(1, (d - c[i - 1]) / ((c[i] - c[i - 1]) || 1)));
  k.x = a.x + (b.x - a.x) * u;
  k.z = a.z + (b.z - a.z) * u;
  k.dx = b.x - a.x;
  k.dz = b.z - a.z;
}

// a box set down on a shelf, heard when that stocker is on screen and the camera is close
var thudAt = 0;
function thud(p) {
  var now = performance.now();
  if (focus.dist > 30 || now - thudAt < 1500 || !window.sfx) return;
  toScreen(p.x, 0.8, p.z, sp);
  if (sp.z > 1 || sp.x < 0 || sp.x > cw || sp.y < IT || sp.y > ch - IB) return;
  thudAt = now;
  sfx('stock');
}

function stockerStep(k, w, dt) {
  var o = k.f.obj;
  if (w.id && (k.id !== w.id || w.t < k.t)) plan(k, w);
  k.id = w.id;
  k.t = w.t;
  var home = STAND[k.i];
  var head = home.face;
  var x = home.x;
  var z = home.z;
  var boxes = crewAt()[1];
  var park = 0;
  var clip = 'idle';
  var rate = 1;
  var shelving = false;
  var back = w.T - w.out - SHELVE;
  if (w.id) {
    if (w.t < w.out) {
      along(k, k.cum[k.cum.length - 1] * w.t / w.out);
      head = Math.atan2(k.dx, k.dz);
      park = Math.max(0, 1 - (w.out - w.t) / 0.8);
      clip = 'walk';
      rate = k.cum[k.cum.length - 1] / w.out;
    } else if (w.t < w.out + SHELVE) {
      along(k, k.cum[k.cum.length - 1]);
      head = k.face;
      park = 1;
      clip = 'pick-up';
      shelving = true;
      boxes = Math.ceil(boxes * (1 - (w.t - w.out) / SHELVE));
    } else {
      along(k, k.cum[k.cum.length - 1] * (1 - (w.t - w.out - SHELVE) / back));
      head = Math.atan2(-k.dx, -k.dz);
      park = Math.max(0, 1 - (w.t - w.out - SHELVE) / 0.8);
      clip = 'walk';
      boxes = 0;
      rate = k.cum[k.cum.length - 1] / back;
    }
    x = k.x;
    z = k.z;
  }
  o.position.set(x, 0, z);
  k.shelving = shelving;
  if (shelving && !k.sh) thud(o.position);
  k.sh = shelving;
  if (!k.shown) {
    k.shown = true;
    o.rotation.y = head;
  }
  o.rotation.y += Math.atan2(Math.sin(head - o.rotation.y), Math.cos(head - o.rotation.y)) * Math.min(1, dt * 8);
  var e = park * park * (3 - 2 * park);
  k.hold.position.set(k.park[0] * e, 0, 0.42 * (1 - e) + k.park[1] * e);
  if (boxes !== k.n) {
    k.n = boxes;
    k.rig.forEach(function (g, j) { g.visible = j === boxes; });
  }
  act(k.f, clip, 0.2);
  if (k.f.mixer) k.f.mixer.update(dt * (clip === 'walk' ? Math.max(0.6, Math.min(2.8, rate / 1.1)) : 1));
}

function crewStep(dt, now) {
  var live = window.crew;
  var n = live.length;
  if (stockN >= 1 && n > stockN) {
    for (var j = stockN; j < n; j++) dust(STAND[j].x - 0.3, STAND[j].x + 0.3, STAND[j].z - 0.3, STAND[j].z + 0.3, now, 10);
  }
  stockN = n;
  var near = PLAN.doors.map(function () { return false; });
  for (var i = 0; i < Math.max(n, stockers.length); i++) {
    var k = stockers[i];
    if (i >= n) {
      if (k) {
        k.f.obj.visible = false;
        k.shown = false;
        k.id = null;
      }
      continue;
    }
    if (!k) k = stockers[i] = newStocker(i);
    k.f.obj.visible = true;
    stockerStep(k, live[i], dt);
    var p = k.f.obj.position;
    PLAN.doors.forEach(function (d, di) { if (Math.hypot(p.x - d, p.z - BACK) < 1.1) near[di] = true; });
    blobAt.makeRotationX(-Math.PI / 2).setPosition(p.x, 0.035, p.z);
    shadows.setMatrixAt(i, blobAt);
  }
  shadows.count = n;
  shadows.instanceMatrix.needsUpdate = true;
  near.forEach(function (v, di) { stockDoorStep(dt, di, v); });
}

function resetCrowd() {
  stockN = -1;
  people.forEach(function (p) {
    p.path = null;
    p.lane = null;
    p.hold = false;
    p.cust = null;
    p.f.obj.visible = false;
  });
  carQ = [];
  taxiQ = [];
  says.forEach(function (w) { w.el.remove(); });
  says = [];
  cars.forEach(function (c) { root.remove(c.o); });
  cars = [];
  bays.forEach(function (b) { b.car = null; });
  truckQ = 0;
}

function tagIds() {
  return order.concat(PLACES.map(function (p) { return p.id; }));
}

function makeTags() {
  tagsEl = document.getElementById('tags');
  barsCv = document.createElement('canvas');
  barsCv.style.cssText = 'position:absolute;left:0;top:0;width:100%;height:100%;pointer-events:none';
  barsX = barsCv.getContext('2d');
  tagsEl.appendChild(barsCv);
  resize();
  tagIds().forEach(function (id) {
    var el = document.createElement('div');
    el.className = 'tag';
    el.innerHTML = '<b></b><i><u></u></i>';
    el.addEventListener('click', function () { onTap({ kind: 'biz', id: id }); });
    tagsEl.appendChild(el);
    var t = { el: el, text: '', x: 0, y: 0, line: el.firstChild, bar: el.querySelector('u'), cls: '' };
    (shops[id] || places[id]).tag = t;
  });
  arrowEl = document.createElement('div');
  arrowEl.id = 'arrow';
  arrowEl.innerHTML = '<svg viewBox="0 0 24 30"><path d="M12 29 L2 14 H8 V2 H16 V14 H22 Z"/></svg>';
  arrowEl.hidden = true;
  tagsEl.appendChild(arrowEl);
}

function bstate(id) {
  var p = PL[id];
  if (p) {
    var busy = id === 'hall' ? Math.min(1, inRate() / capacity()) : id === 'dock' ? Math.min(1, served() / stockCap()) : 0;
    var out = id === 'hall' ? linesFull() : id === 'dock' && shelvesOut();
    if (PLAN.wing[id]) busy = S.pl[id] / p.cost.length;
    return { name: p.name, lv: S.pl[id], own: S.pl[id] > 0 || !!p.open, price: placeCost(id), avail: has(p.after), frac: busy, alert: out,
      said: id === 'dock' ? 'Shelves empty!' : 'Lines full!' };
  }
  var e = S.b[id];
  var l = e ? e.l : 0;
  var n = starsAt(l);
  var from = n ? STAR_AT[n - 1] : 0;
  return { name: BZ[id].name, lv: l, stars: n, own: !!e, price: cost(id, 1), avail: avail(id), frac: !e ? 0 : n >= STAR_AT.length ? 1 : (l - from) / (STAR_AT[n] - from),
    alert: !!e && window.fill[id] <= 0, said: 'Sold out' };
}

function toScreen(x, y, z, out) {
  proj.set(x, y, z).project(cam);
  out.x = (proj.x + 1) / 2 * cw;
  out.y = (1 - proj.y) / 2 * ch;
  out.z = proj.z;
  return out;
}

var sp = { x: 0, y: 0, z: 0 };
var anchorXY = {};

function anchor(id) {
  if (id === 'hall') return [0, 1.3, 1.0];
  if (id === 'lot') return [-4, 0.8, (LOT[0] + LOT[1]) / 2];
  if (id === 'taxi') return [0, 1.2, 10.2];
  if (id === 'dock') return [0, 1.0, -25.5];
  if (id === 'garden') return [(GARDEN[0] + GARDEN[1]) / 2, 1.0, (GARDEN[2] + GARDEN[3]) / 2];
  if (PLAN.wing[id]) return [(PLAN.wing[id].rect[0] + PLAN.wing[id].rect[1]) / 2, 0.4, PLAN.wing[id].rect[3] - 1.2];
  var s = shops[id];
  // at the front edge, and clear of the sign plate, which would hide under the tag from the game camera
  return [s.cx, 0.2, Math.max(s.a.vacant[3] - 0.2, s.a.sign[1] + 1.1)];
}

function overlay(now) {
  tagIds().forEach(function (id) {
    var s = shops[id] || places[id];
    var t = s.tag;
    var st = bstate(id);
    var a = anchor(id);
    toScreen(a[0], a[1], a[2], sp);
    var open = PL[id] ? st.own || st.avail : true;
    var vis = open && sp.z < 1 && sp.x > -60 && sp.x < cw + 60 && sp.y > IT + 34 && sp.y < ch - IB;
    if (open && sp.z < 1) anchorXY[id] = { x: sp.x, y: sp.y, top: sp.y };
    else delete anchorXY[id];
    var show = vis && (st.own || st.avail || focus.dist < 40) && !says.some(function (w) { return w.id === id; });
    if (t.shown !== show) {
      t.shown = show;
      t.el.style.display = show ? '' : 'none';
    }
    if (show) {
      var line = st.alert ? st.name + '  ' + st.said : st.own ? (st.lv ? st.name + '  Lv ' + st.lv + (PL[id] ? '' : '/' + UPS + '  ' + '★'.repeat(st.stars)) : st.name) : st.avail ? st.name + '  $' + short(st.price) : st.name + '  locked';
      if (line !== t.text) {
        t.text = line;
        t.line.textContent = line;
        t.h = t.el.offsetHeight;
      }
      var cls = 'tag' + (st.own ? ' own' : st.avail ? ' buy' : ' lock') + (!st.own && st.avail && S.cash >= st.price ? ' ready' : '') + (st.alert ? ' alert' : '') + (selId ? (selId === id ? ' sel' : ' dim') : '');
      if (cls !== t.cls) {
        t.cls = cls;
        t.el.className = cls;
      }
      var fw = st.own ? (st.frac * 100).toFixed(1) + '%' : '';
      if (fw !== t.fw) {
        t.fw = fw;
        t.bar.style.width = fw;
      }
      var full = st.frac >= 1 ? 'full' : '';
      if (full !== t.full) {
        t.full = full;
        t.bar.className = full;
      }
      var sc = Math.max(0.6, Math.min(1.1, 30 / focus.dist + 0.12));
      var tx = Math.round(sp.x);
      var ty = Math.round(sp.y);
      var below = selId === id;
      if (tx !== t.x || ty !== t.y || sc !== t.sc || below !== t.below) {
        t.x = tx;
        t.y = ty;
        t.sc = sc;
        t.below = below;
        // the open card's tag hangs under the outline, clear of the pieces inside it
        t.el.style.transform = 'translate(' + tx + 'px,' + ty + 'px) translate(-50%,' + (below ? '8px' : '-100%') + ') scale(' + sc + ')';
      }
      anchorXY[id].top = ty - (t.h || 24) * sc;
    }
  });
  var a2 = bestId && anchorXY[bestId];
  if (!a2) {
    arrowEl.hidden = true;
    return;
  }
  // the arrow points down at the place's tag
  var bob2 = Math.abs(Math.sin(now / 260)) * 9;
  var x = a2.x;
  var y = a2.top - 22 - bob2;
  var cx = Math.max(24, Math.min(cw - 24, x));
  var cy = Math.max(IT + 24, Math.min(ch - IB - 24, y));
  var rot = 0;
  if (cx !== x || cy !== y) rot = Math.atan2(a2.y - cy, a2.x - cx) - Math.PI / 2;
  arrowEl.hidden = false;
  arrowEl.style.transform = 'translate(' + Math.round(cx) + 'px,' + Math.round(cy) + 'px) translate(-50%,-50%) rotate(' + rot.toFixed(3) + 'rad)';
}

function init(canvas, tap) {
  cv = canvas;
  onTap = tap;
  loadingEl = document.getElementById('loading');
  try {
    sceneUp();
  } catch (e) {
    fail('This device cannot start the 3D view (WebGL is not available).');
    return;
  }
  resize();
  window.addEventListener('resize', resize);
  bind();
  [['turn-l', -1], ['turn-r', 1]].forEach(function (b) {
    document.getElementById(b[0]).addEventListener('click', function () {
      azGoal = Math.max(-TURN, Math.min(TURN, (azGoal === null ? Math.round(focus.az / TURN) * TURN : azGoal) + b[1] * TURN));
    });
  });
  var bar = document.getElementById('load-bar');
  lib = loadModels(modelList(), function (p) { if (bar) bar.style.width = Math.round(p * 100) + '%'; }, function () {
    setTimeout(function () {
      try {
        build();
      } catch (e) {
        console.error(e);
        fail('The store could not be built. Please reload.');
      }
    }, 30);
  });
}

function fail(msg) {
  loadingEl.firstChild.innerHTML = '<b>Main Street</b><p>' + msg + '</p>';
}

function build() {
  buildOutside();
  buildAreas();
  buildShell();
  buildFront();
  buildWing();
  root.add(still.b.group(), still.x);
  makeTags();
  fitShadow();
  sync(false, 0);
  focusNow();
  ready = true;
  loadingEl.classList.add('done');
}

var lastT = 0;

function draw(now) {
  if (!ready) return;
  var dt = Math.min(0.1, (now - lastT) / 1000);
  lastT = now;
  var flying = !!goal;
  stepCam(dt);
  if (flying) {
    clamp();
    place();
  }
  dayStep(dt);
  trafficStep(dt);
  crowdStep(dt);
  doorsStep(dt);
  popsStep(now);
  saysStep(now);
  order.forEach(function (id) {
    var s = shops[id];
    if (!s.open) return;
    shelves(s);
    s.pcs.forEach(function (pc) {
      if (!pc || !pc.on) return;
      if (pc.staff && pc.staff.mixer) pc.staff.mixer.update(dt);
      if (pc.helper && !pc.rising) staffStep(s, pc.helper, dt);
    });
  });
  places.hall.staff.forEach(function (f) { if (f.mixer && f.obj.parent.visible && f.obj.visible) f.mixer.update(dt); });
  WING_IDS.forEach(function (id) { places[id].staff.forEach(function (w) { if (w.f.mixer && w.g.visible) w.f.mixer.update(dt); }); });
  crewStep(dt, now);
  blobsStep();
  puffsStep(now);
  riseStep(now);
  selStep(now);
  flashStep(now);
  pop(now);
  if (shadowDirty) {
    renderer.shadowMap.needsUpdate = true;
    shadowDirty = false;
  }
  renderer.render(scene, cam);
  overlay(now);
  bars();
}

function confetti() {
  var cols = ['#f0c040', '#e8553a', '#4f9a40', '#3f78b8', '#e85d9a'];
  for (var i = 0; i < 30; i++) {
    var d = document.createElement('i');
    var x = Math.random() * cw;
    d.style.cssText = 'position:absolute;left:0;top:0;width:8px;height:12px;background:' + cols[i % cols.length];
    tagsEl.appendChild(d);
    var dx = (Math.random() - 0.5) * 120;
    var a = d.animate([
      { transform: 'translate(' + x + 'px,-20px) rotate(0deg)' },
      { transform: 'translate(' + (x + dx) + 'px,' + ch + 'px) rotate(' + Math.round(Math.random() * 720) + 'deg)' }
    ], { duration: 1300 + Math.random() * 900, easing: 'ease-in' });
    a.onfinish = (function (el) { return function () { el.remove(); }; })(d);
  }
}

function spot(id) {
  var s = shops[id];
  if (s) return { x: s.cx, y: s.cz };
  if (id === 'lot') return { x: 0, y: (LOT[0] + LOT[1]) / 2 };
  if (id === 'taxi') return { x: 0, y: 10 };
  if (id === 'dock') return { x: 0, y: -25 };
  if (id === 'garden') return { x: (GARDEN[0] + GARDEN[1]) / 2, y: (GARDEN[2] + GARDEN[3]) / 2 };
  if (PLAN.wing[id]) return { x: (PLAN.wing[id].rect[0] + PLAN.wing[id].rect[1]) / 2, y: (PLAN.wing[id].rect[2] + PLAN.wing[id].rect[3]) / 2 };
  return { x: 0, y: 0.5 };
}

function go(x, z) {
  flyTo(x, z, Math.min(focus.dist, fit(11)));
}

// the start view: the grocery entrance and the produce market at the phone's portrait width
function focusNow() {
  goal = null;
  azGoal = null;
  focus.x = 9;
  focus.z = -3.5;
  focus.dist = fit(16);
  focus.az = VIEW_AZ;
  clamp();
  place();
}

// the middle of a piece on the floor
function pieceAt(pc) {
  if (pc.helper) return [pc.helper.f.obj.position.x, pc.helper.f.obj.position.z];
  if (!pc.foot.length) return [pc.s.cx, pc.s.cz];
  var x0 = 1e9;
  var x1 = -1e9;
  var z0 = 1e9;
  var z1 = -1e9;
  pc.foot.forEach(function (o) {
    x0 = Math.min(x0, o.x - o.hw);
    x1 = Math.max(x1, o.x + o.hw);
    z0 = Math.min(z0, o.z - o.hd);
    z1 = Math.max(z1, o.z + o.hd);
  });
  return [(x0 + x1) / 2, (z0 + z1) / 2];
}

function onScreen(x, z) {
  toScreen(x, 0.6, z, sp);
  return sp.z < 1 && sp.x > 24 && sp.x < cw - 24 && sp.y > IT + 70 && sp.y < ch - IB - 24;
}

// the size of a piece as built, whatever the rise has done to it so far
function pieceSize(pc) {
  if (!pc.gb) return 1;
  var sy = pc.g.scale.y;
  pc.g.scale.y = 1;
  pc.g.updateMatrixWorld(true);
  var box = new THREE.Box3().setFromObject(pc.gb);
  pc.g.scale.y = sy;
  pc.g.updateMatrixWorld(true);
  var v = box.getSize(new THREE.Vector3());
  return box.isEmpty() ? 1 : Math.max(v.x, v.z, v.y * 0.7);
}

// the middle of the geometry of a piece, or of its footprint
function pieceMid(pc) {
  if (!pc.gb || pc.helper) return pieceAt(pc);
  var box = new THREE.Box3().setFromObject(pc.gb);
  if (box.isEmpty()) return pieceAt(pc);
  return [(box.min.x + box.max.x) / 2, (box.min.z + box.max.z) / 2];
}

// The open card's area: a pulsing outline on the floor, and the spot where the selected item's next piece will go
var GOLD = 0xffd34a;
var NAVY = 0x2f3446;
function glowMat(color, op, add) {
  return new THREE.MeshBasicMaterial({ color: color, transparent: true, opacity: op, depthWrite: false, blending: add ? THREE.AdditiveBlending : THREE.NormalBlending });
}
var areaEdge = glowMat(GOLD, 1);
var areaDark = glowMat(NAVY, 0.55);
var areaFill = glowMat(GOLD, 0.1);
var markEdge = glowMat(GOLD, 1);
var markPad = glowMat(GOLD, 0.3);
var arrowMat = new THREE.MeshBasicMaterial({ color: 0xf2c230 });
var hullMat = new THREE.MeshBasicMaterial({ color: NAVY });
// a flat arrow pointing down, its middle on the origin; the marker turns it to face the camera
var arrowGeo = (function () {
  var a = new THREE.Shape();
  [[0, 0], [0.34, 0.38], [0.13, 0.38], [0.13, 0.85], [-0.13, 0.85], [-0.13, 0.38], [-0.34, 0.38]].forEach(function (p, i) {
    if (i) a.lineTo(p[0], p[1]);
    else a.moveTo(p[0], p[1]);
  });
  return new THREE.ExtrudeGeometry(a, { depth: 0.1, bevelEnabled: false }).translate(0, -0.425, -0.05);
})();
var sel = null;
var selId = null;
var mark = null;
var pboxes = {};
var flashes = [];
var flashN = 0;
var ringGeo = new THREE.RingGeometry(0.8, 1, 36).rotateX(-Math.PI / 2);
var diskGeo = new THREE.CircleGeometry(1, 24).rotateX(-Math.PI / 2);

function rrPath(p, w, d, r) {
  var x = -w / 2;
  var y = -d / 2;
  r = Math.min(r, w / 2 - 0.01, d / 2 - 0.01);
  p.moveTo(x + r, y);
  p.lineTo(x + w - r, y);
  p.quadraticCurveTo(x + w, y, x + w, y + r);
  p.lineTo(x + w, y + d - r);
  p.quadraticCurveTo(x + w, y + d, x + w - r, y + d);
  p.lineTo(x + r, y + d);
  p.quadraticCurveTo(x, y + d, x, y + d - r);
  p.lineTo(x, y + r);
  p.quadraticCurveTo(x, y, x + r, y);
  return p;
}

// a rounded rectangle lying on the floor, or just its border when t is given
function rrGeo(w, d, r, t) {
  var s = rrPath(new THREE.Shape(), w, d, r);
  if (t) s.holes.push(rrPath(new THREE.Path(), w - 2 * t, d - 2 * t, Math.max(0.02, r - t)));
  return new THREE.ShapeGeometry(s, 4).rotateX(-Math.PI / 2);
}

function flatMesh(geo, mat, x, y, z, order) {
  var m = new THREE.Mesh(geo, mat);
  m.position.set(x, y, z);
  m.renderOrder = order;
  return m;
}

function dropFlat(g) {
  root.remove(g);
  g.traverse(function (o) { if (o.geometry && o.geometry !== arrowGeo) o.geometry.dispose(); });
}

// an area's floor, as the box its tap target covers: [x0, x1, z0, z1]
function areaRect(id) {
  for (var i = 0; i < picks.length; i++) {
    var p = picks[i];
    if (p.userData.id !== id) continue;
    var g = p.geometry.parameters;
    return [p.position.x - g.width / 2, p.position.x + g.width / 2, p.position.z - g.depth / 2, p.position.z + g.depth / 2];
  }
  return null;
}

// how far back the camera sits to show a whole area in the part of the screen between the meters and the card
function frameDist(r) {
  var w = r[1] - r[0] + 1.6;
  var d = r[3] - r[2] + 3;
  return fit(Math.max(w, d * Math.sin(TILT) * cw / Math.max(80, ch - IT - IB)));
}

function frame(id) {
  var r = areaRect(id);
  if (r) flyTo((r[0] + r[1]) / 2, (r[2] + r[3]) / 2, frameDist(r));
}

function select(id, go) {
  if (!sel || sel.id !== id) {
    if (sel) dropFlat(sel.g);
    sel = null;
    selId = id;
    var r = id && areaRect(id);
    if (r) {
      var w = r[1] - r[0] - 0.3;
      var d = r[3] - r[2] - 0.3;
      // the line stays about as wide on screen however far the camera sits
      var t = Math.max(0.18, frameDist(r) * 0.011);
      var g = new THREE.Group();
      g.position.set((r[0] + r[1]) / 2, 0.09, (r[2] + r[3]) / 2);
      g.add(flatMesh(rrGeo(w, d, 0.5), areaFill, 0, 0, 0, 3));
      g.add(flatMesh(rrGeo(w + t * 0.8, d + t * 0.8, 0.55, t * 1.45), areaDark, 0, -0.005, 0, 3));
      g.add(flatMesh(rrGeo(w, d, 0.5, t), areaEdge, 0, 0, 0, 4));
      root.add(g);
      sel = { id: id, g: g };
    }
  }
  if (!id) setMark(null);
  else if (go) frame(id);
}

// the extent of a piece on the floor and how high it stands: { x0, x1, z0, z1, top }
function pieceBox(id, k) {
  var key = id + ':' + k;
  if (pboxes[key]) return pboxes[key];
  var s = shops[id];
  var pc = s ? pieceOf(s, k) : null;
  var box = new THREE.Box3();
  if (pc) {
    var g = pc.b.group();
    box = boxOf(g);
    g.traverse(function (o) { if (o.geometry) o.geometry.dispose(); });
  } else if (places[id] && places[id].items[k + 1]) box = boxOf(places[id].items[k + 1].g);
  var out;
  if (!box.isEmpty() && box.getSize(new THREE.Vector3()).length() < 10) out = { x0: box.min.x, x1: box.max.x, z0: box.min.z, z1: box.max.z, top: box.max.y };
  else {
    // staff, a sign, floor lights and levels that spread over a whole site have no model of their own to measure
    var at;
    var top = 1;
    if (pc && pc.foot.length) {
      out = { x0: 1e9, x1: -1e9, z0: 1e9, z1: -1e9, top: 1 };
      pc.foot.forEach(function (o) {
        out.x0 = Math.min(out.x0, o.x - o.hw);
        out.x1 = Math.max(out.x1, o.x + o.hw);
        out.z0 = Math.min(out.z0, o.z - o.hd);
        out.z1 = Math.max(out.z1, o.z + o.hd);
      });
    } else {
      if (pc && pc.sign && s.a.sign) {
        at = [s.a.sign[0], s.a.sign[1]];
        top = s.a.sign[2];
      } else if (pc) at = pieceAt(pc);
      else {
        var sp0 = spot(id);
        at = [sp0.x, sp0.y];
      }
      out = { x0: at[0] - 0.5, x1: at[0] + 0.5, z0: at[1] - 0.5, z1: at[1] + 0.5, top: top };
    }
  }
  pboxes[key] = out;
  return out;
}

function setMark(id, k) {
  if (mark) dropFlat(mark.g);
  mark = null;
  if (!id || k < 0 || (!shops[id] && !places[id])) return;
  var b = pieceBox(id, k);
  var w = Math.max(0.9, b.x1 - b.x0 + 0.3);
  var d = Math.max(0.9, b.z1 - b.z0 + 0.3);
  var g = new THREE.Group();
  g.position.set((b.x0 + b.x1) / 2, 0.1, (b.z0 + b.z1) / 2);
  g.add(flatMesh(rrGeo(w, d, 0.2), markPad, 0, 0, 0, 5));
  g.add(flatMesh(rrGeo(w, d, 0.2, 0.09), markEdge, 0, 0.002, 0, 6));
  var ar = new THREE.Mesh(arrowGeo, arrowMat);
  var hull = new THREE.Mesh(arrowGeo, hullMat);
  hull.scale.set(1.3, 1.22, 1);
  hull.position.z = -0.06;
  ar.add(hull);
  ar.rotation.order = 'YXZ';
  ar.scale.setScalar(0.8);
  ar.renderOrder = 7;
  g.add(ar);
  root.add(g);
  mark = { g: g, ar: ar, y: Math.min(b.top, 2.2) + 0.45 + 0.34 };
}

function selStep(now) {
  var u = 0.5 + 0.5 * Math.sin(now / 320);
  if (sel) {
    areaEdge.opacity = 0.6 + 0.4 * u;
    areaFill.opacity = 0.05 + 0.09 * u;
  }
  if (mark) {
    // seen from far off the marker grows, so it stays a spot a thumb could cover
    mark.g.scale.setScalar(Math.max(1, Math.min(2, focus.dist / 28)));
    mark.ar.rotation.set(-TILT, focus.az, 0);
    markEdge.opacity = 0.7 + 0.3 * u;
    markPad.opacity = 0.2 + 0.25 * u;
    mark.ar.position.y = mark.y + Math.abs(Math.sin(now / 260)) * 0.3;
  }
}

// a bought piece flashes: a ring runs out over the floor from it and a glow blooms and fades
function flash(id, k, now) {
  if (!shops[id] && !places[id]) return;
  var b = pieceBox(id, k);
  if (!flashes.length) {
    for (var i = 0; i < 3; i++) {
      var f = { ring: flatMesh(ringGeo, glowMat(0xfff0a0, 1), 0, 0.12, 0, 8), glow: flatMesh(diskGeo, glowMat(0xffc830, 0.8, true), 0, 0.11, 0, 8), t0: -1e9, r: 1 };
      f.ring.visible = f.glow.visible = false;
      root.add(f.ring, f.glow);
      flashes.push(f);
    }
  }
  var fl = flashes[flashN++ % 3];
  fl.t0 = now;
  fl.r = Math.max(0.6, Math.max(b.x1 - b.x0, b.z1 - b.z0) / 2 + 0.2, focus.dist * 0.04);
  fl.ring.position.set((b.x0 + b.x1) / 2, 0.12, (b.z0 + b.z1) / 2);
  fl.glow.position.set((b.x0 + b.x1) / 2, 0.11, (b.z0 + b.z1) / 2);
  fl.ring.visible = fl.glow.visible = true;
}

function flashStep(now) {
  for (var i = 0; i < flashes.length; i++) {
    var f = flashes[i];
    if (!f.ring.visible) continue;
    var u = (now - f.t0) / 800;
    if (u >= 1) {
      f.ring.visible = f.glow.visible = false;
      continue;
    }
    var e = 1 - Math.pow(1 - u, 3);
    f.ring.scale.setScalar(f.r * (0.5 + 2.4 * e));
    f.ring.material.opacity = 1 - u;
    f.glow.scale.setScalar(f.r * (0.6 + 0.7 * e));
    f.glow.material.opacity = 0.85 * (1 - u) * (1 - u);
  }
}

// where a piece is on the screen, kept inside the part of it the game uses
function pieceScreen(id, k) {
  if (!shops[id] && !places[id]) return null;
  var b = pieceBox(id, k);
  toScreen((b.x0 + b.x1) / 2, Math.min(1.4, b.top * 0.6), (b.z0 + b.z1) / 2, sp);
  if (sp.z > 1) return null;
  return { x: Math.max(40, Math.min(cw - 40, sp.x)), y: Math.max(IT + 90, Math.min(ch - IB - 30, sp.y)) };
}

// each upgrade shows: its piece rises, its name pops over it, and the camera goes to it, closer for a small piece
function event(res, now) {
  var s = shops[res.id];
  if (s) bump[res.id] = now;
  sync(true, now);
  flash(res.id, res.piece, now);
  var out = 0.25;
  // with the area's card open the camera stays on the area
  var framed = !!sel && sel.id === res.id;
  if (s && res.to) {
    var pc = s.pcs[res.piece];
    var at = pc ? pieceMid(pc) : [s.cx, s.cz];
    if (pc) popName(at[0], at[1], pc.name, res.id);
    var size = pc ? pieceSize(pc) : 1;
    var close = fit(size < 0.6 ? 6 : size < 1.5 ? 8 : 11);
    if (!onScreen(at[0], at[1]) || !framed && (res.unlock || focus.dist > close * 1.2)) out = flyTo(at[0], at[1], Math.min(focus.dist, close)) + 0.1;
  } else if (res.place && !framed) {
    var p = spot(res.id);
    out = flyTo(p.x, p.y, Math.min(focus.dist, fit(PLAN.wing[res.id] ? 11 : EDGE * 2 + 2))) + 0.1;
  }
  return out;
}

function refresh() {
  rising.length = 0;
  order.forEach(function (id) {
    var s = shops[id];
    s.pcs.forEach(function (pc) {
      if (!pc) return;
      pc.rising = false;
      pc.on = false;
      pc.x.visible = false;
      if (pc.g) {
        pc.g.remove(pc.x);
        s.group.remove(pc.g);
        pc.gb.traverse(function (o) { if (o.geometry) o.geometry.dispose(); });
        pc.g = null;
        pc.gb = null;
      }
    });
    s.shown = -1;
    s.key = null;
  });
  PLACES.forEach(function (p) { places[p.id].shown = -1; });
  sync(false, 0);
  nav.dirty = true;
  resetCrowd();
  seed = 3;
  for (var i = 0; i < 3; i++) come('walk');
  seed = 0;
}

// a small picture of a group of objects, from a three quarter view framed to them, as a data url
var iconRT;
var icons = {};
function boxOf(group) {
  var box = new THREE.Box3();
  var v = new THREE.Vector3();
  group.updateMatrixWorld(true);
  group.traverse(function (o) {
    if (!o.isMesh || (o.material && o.material.blending === THREE.AdditiveBlending)) return;
    if (o.isSkinnedMesh) {
      o.getWorldPosition(v);
      box.expandByPoint(new THREE.Vector3(v.x - 0.4, 0, v.z - 0.4)).expandByPoint(new THREE.Vector3(v.x + 0.4, 1.5, v.z + 0.4));
    } else box.union(new THREE.Box3().setFromObject(o));
  });
  return box;
}

function snap(group, box) {
  if (!box) box = boxOf(group);
  if (box.isEmpty()) return null;
  if (box.getSize(new THREE.Vector3()).length() > 20) {
    // a piece spread over the whole site: the first mesh and what stands round it
    var part = null;
    group.traverse(function (o) {
      if (part || !o.isMesh) return;
      var bb = new THREE.Box3().setFromObject(o);
      if (bb.getSize(new THREE.Vector3()).length() < 8) part = bb;
    });
    var c = part ? part.getCenter(new THREE.Vector3()) : new THREE.Vector3(box.min.x + 0.8, 0, (box.min.z + box.max.z) / 2);
    box = new THREE.Box3(new THREE.Vector3(c.x - 0.8, 0, c.z - 0.8), new THREE.Vector3(c.x + 0.8, Math.max(0.6, Math.min(box.max.y, 1.2)), c.z + 0.8));
  }
  var scn = new THREE.Scene();
  scn.add(new THREE.HemisphereLight(0xffffff, 0xb4bedc, 2.4));
  var sunl = new THREE.DirectionalLight(0xfff3dc, 2);
  sunl.position.set(-3, 6, 4);
  scn.add(sunl);
  scn.add(group);
  var mid = box.getCenter(new THREE.Vector3());
  var rad = box.getSize(new THREE.Vector3()).length() / 2;
  var cm = new THREE.PerspectiveCamera(30, 1, 0.1, 100);
  var dir = new THREE.Vector3(0.55, 0.62, 0.85).normalize();
  cm.position.copy(mid).addScaledVector(dir, rad / Math.sin(cm.fov * Math.PI / 360) * 1.05);
  cm.lookAt(mid);
  if (!iconRT) {
    iconRT = new THREE.WebGLRenderTarget(128, 128, { samples: 4 });
    iconRT.texture.colorSpace = THREE.SRGBColorSpace;
  }
  var was = renderer.getRenderTarget();
  var col = new THREE.Color();
  renderer.getClearColor(col);
  var alpha = renderer.getClearAlpha();
  renderer.setRenderTarget(iconRT);
  renderer.setClearColor(0x000000, 0);
  renderer.clear();
  renderer.render(scn, cm);
  var px = new Uint8Array(128 * 128 * 4);
  renderer.readRenderTargetPixels(iconRT, 0, 0, 128, 128, px);
  renderer.setRenderTarget(was);
  renderer.setClearColor(col, alpha);
  var c = document.createElement('canvas');
  c.width = c.height = 128;
  var img = c.getContext('2d').createImageData(128, 128);
  for (var y = 0; y < 128; y++) img.data.set(px.subarray((127 - y) * 512, (128 - y) * 512), y * 512);
  c.getContext('2d').putImageData(img, 0, 0);
  return c.toDataURL('image/png');
}

// piece k of an area (its place in plan.js), rendered once from the real model with its goods. A skinned figure's bounds
// reach back to the origin, so boxOf frames a figure by where it stands, turned toward the icon camera
function upIcon(id, k) {
  var key = id + ':' + k;
  if (icons[key] !== undefined) return icons[key];
  var s = shops[id];
  if (!s || !s.a.ups[k]) return null;
  var seen = figs.length;
  var sm = s.signMat;
  var pc = makePiece(s, k);
  figs.length = seen;
  s.signMat = sm;
  var g = new THREE.Group();
  pc.x.visible = true;
  var bg = pc.b.group();
  g.add(bg, pc.x);
  pc.x.traverse(function (o) { if (o.material && o.material.blending === THREE.AdditiveBlending) o.visible = false; });
  var fig = pc.staff || pc.helper && pc.helper.f;
  var box = null;
  if (fig) {
    fig.obj.rotation.y = 0.57;
    var fp = fig.obj.position;
    box = new THREE.Box3(new THREE.Vector3(fp.x - 0.4, 0, fp.z - 0.4), new THREE.Vector3(fp.x + 0.4, 1.0, fp.z + 0.4));
  }
  var url = snap(g, box);
  g.traverse(function (o) { if (o.geometry) o.geometry.dispose(); });
  icons[key] = url;
  return url;
}

// what level k of a place adds, or null when it only changes the paint
function placeIcon(id, k) {
  var key = id + '#' + k;
  if (icons[key] !== undefined) return icons[key];
  var pl = places[id];
  var g = new THREE.Group();
  // the parking lot's levels are paving, bays and lamps spread over the whole front
  if (id === 'lot') return (icons[key] = null);
  if (pl) {
    // people stand apart from the piece, so a level with some without them is drawn without them
    var its = pl.items.filter(function (it) { return it.lv === k && k > 0; });
    var bare = its.filter(function (it) { var sk = false; it.g.traverse(function (o) { if (o.isSkinnedMesh) sk = true; }); return !sk; });
    its = bare.length ? bare : its;
    its.forEach(function (it) { g.add(clone(it.g)); });
    // a level that spreads over the whole site is drawn by the first piece and what stands near it
    if (g.children.length > 1 && boxOf(g).getSize(new THREE.Vector3()).length() > 20) {
      var first = boxOf(g.children[0]).getCenter(new THREE.Vector3());
      g.children.slice(1).forEach(function (c) {
        if (boxOf(c).getCenter(new THREE.Vector3()).distanceTo(first) > 4) g.remove(c);
      });
    }
  }
  if (id === 'dock' && k > 0) {
    // a stocker arrives or the dollies carry more: the new stocker with his dolly
    var fig = figure(STAFF, 'idle');
    var dolly = PL.dock.of.charAt(k - 1) === '1';
    var dol = dollyGroup(2 + (dolly ? PL.dock.rk[k - 1] + 1 : 0));
    var at = g.children.length ? boxOf(g).getCenter(new THREE.Vector3()) : new THREE.Vector3();
    dol.position.set(at.x, 0, at.z + 0.6);
    fig.obj.position.set(at.x, 0, at.z + 0.18);
    if (!dolly) g.add(fig.obj);
    g.add(dol);
  }
  g.traverse(function (o) { o.visible = true; });
  g.updateMatrixWorld(true);
  icons[key] = snap(g);
  return icons[key];
}

var barsCv;
var barsX;

// progress bars over the characters' heads, all on one canvas: a cashier's scan, a shopper's trip, a stocker's trip
function bars() {
  var dpr = barsCv.width / cw;
  barsX.setTransform(dpr, 0, 0, dpr, 0, 0);
  barsX.clearRect(0, 0, cw, ch);
  if (focus.dist >= 56) return;
  function draw(x, y, z, f, col) {
    toScreen(x, y, z, sp);
    if (sp.z > 1 || sp.x < 10 || sp.x > cw - 10 || sp.y < IT || sp.y > ch - IB) return;
    var w = 30;
    var bx = Math.round(sp.x - w / 2);
    var by = Math.round(sp.y - 11);
    barsX.fillStyle = '#14141c';
    barsX.fillRect(bx - 2, by - 2, w + 4, 9);
    barsX.fillStyle = '#4a4d5c';
    barsX.fillRect(bx, by, w, 5);
    barsX.fillStyle = col;
    barsX.fillRect(bx, by, Math.max(1, Math.round(w * Math.max(0, Math.min(1, f)))), 5);
  }
  people.forEach(function (p) {
    if (!p.f.obj.visible) return;
    var o = p.f.obj.position;
    var c = p.cust;
    if (p.lane || p.hold) {
      var t = c && c.at;
      if (t && c.here && t.q[0] === c) draw(o.x, 1.15, o.z, t.t / Math.max(0.01, svc(t.k)), '#f0c040');
    } else if (p.path && p.trip > 0 && c) {
      var a = p.path[p.i - 1];
      var b = p.path[p.i] || a;
      var seg = Math.hypot(b.x - a.x, b.z - a.z);
      var walked = seg - Math.hypot(b.x - o.x, b.z - o.z);
      if (o.z < FRONT) draw(o.x, 1.15, o.z, (p.cum[p.i - 1] + Math.max(0, walked) - p.in) / Math.max(0.01, p.trip - p.in), '#5fd35a');
    }
  });
  places.hall.tills.forEach(function (t, i) {
    var st = tills[i];
    if (!t.head || !st || !st.q.length || !st.q[0].here) return;
    draw(t.head[0], 1.15, t.head[1], st.t / Math.max(0.01, svc(st.k)), '#f0c040');
  });
  var live = window.crew;
  stockers.forEach(function (k, i) {
    var w = live[i];
    if (!w || !w.id || !k.f.obj.visible) return;
    var o = k.f.obj.position;
    draw(o.x, 1.15, o.z, w.t / w.T, k.shelving ? '#4fc3f7' : '#ff9a3c');
  });
}

window.View = {
  init: init,
  draw: draw,
  inset: function (t, b) {
    IT = t;
    IB = b;
    if (cam) resize();
  },
  ready: function () { return ready; },
  event: event,
  go: go,
  refresh: refresh,
  confetti: confetti,
  populate: function () { sync(true, performance.now()); },
  focusNow: focusNow,
  screenOf: function (id) {
    var a = anchorXY[id];
    return a ? { x: a.x, y: a.y } : null;
  },
  spot: spot,
  select: select,
  frame: frame,
  mark: setMark,
  pieceScreen: pieceScreen,
  setBest: function (id) { bestId = id; },
  shopper: shopperEvent,
  upName: function (id, k) { var u = PLAN.areas[id].ups[k]; return u ? u.name : ''; },
  upIcon: upIcon,
  placeIcon: placeIcon
};
