import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { clone } from 'three/addons/utils/SkeletonUtils.js';

var BASE = 'assets/models/';
var TILT = 52 * Math.PI / 180;

// The mall stands on the kits' one unit grid, walls on the half lines. An entrance hall runs across the front, a
// corridor goes north from it, and the shop units, five wide and four deep, sit two to a row either side of it.
var DEPTH = 4;
var FRONT = 2.5;
var BACK = -0.5;
var EDGE = 6.5;
var SIDE = 1.5;

var FOLK = 'abcdef'.split('').reduce(function (a, c) { return a.concat(['chars/character-female-' + c, 'chars/character-male-' + c]); }, []);

// what each shop is fitted with, in the order it arrives: model, lx, lz, facing. lx runs from the back wall (-2.5)
// to the open front on the corridor (2.5), lz across the unit. b faces the front; l and r face the aisle down the
// middle from either side. The counter is always at the front on the r side
var SHOPS = {
  fruit: { kit: 'shop', floor: 'shop/floor-wood', items: [
    ['shop/display-fruit', -1.75, 0, 'b'], ['shop/display-fruit', -0.6, -1.25, 'l'], ['shop/display-fruit', -1.75, -1, 'b'],
    ['shop/display-fruit', 0.5, -1.25, 'l'], ['shop/display-fruit', -1.75, 1, 'b'], ['shop/display-fruit', -0.6, 1.25, 'r'],
    ['shop/shopping-basket', 1.6, -1.3, 'l']] },
  bakery: { kit: 'shop', floor: 'shop/floor-wood', items: [
    ['shop/display-bread', -1.75, 0, 'b'], ['shop/display-bread', -0.6, -1.25, 'l'], ['shop/display-bread', -1.75, -1, 'b'],
    ['shop/display-bread', 0.5, -1.25, 'l'], ['shop/display-bread', -1.75, 1, 'b'], ['shop/display-small', -0.6, 1.4, 'r'],
    ['shop/display-small', 1.6, -1.4, 'l']] },
  flower: { kit: 'shop', floor: 'shop/floor', items: [
    ['shop/display-flowers', -1.45, -0.75, 'b'], ['shop/display-small', 0.1, -1.4, 'l'], ['shop/display-flowers', -1.45, 0.75, 'b'],
    ['shop/display-small', 0.7, -1.4, 'l'], ['shop/display-small', -0.1, 1.4, 'r'], ['shop/display-small', 1.3, -1.4, 'l'],
    ['shop/display-small', -0.7, 1.4, 'r']] },
  grocery: { kit: 'shop', floor: 'shop/floor', items: [
    ['shop/shelf-boxes', -1.75, 0, 'b'], ['shop/display-cans', -0.6, -1.2, 'l'], ['shop/shelf-bags', -1.75, -1, 'b'],
    ['shop/shelf-boxes', 0.5, -1.25, 'l'], ['shop/shelf-bags', -1.75, 1, 'b'], ['shop/shelf-bags', -0.6, 1.25, 'r'],
    ['shop/shopping-cart', 1.6, -1.3, 'l']] },
  frozen: { kit: 'shop', floor: 'shop/floor', items: [
    ['shop/freezers-standing', -1.7, 0, 'b'], ['shop/freezer', -0.6, -1.3, 'l'], ['shop/freezers-standing', -1.7, -1, 'b'],
    ['shop/freezer', 0.5, -1.3, 'l'], ['shop/freezers-standing', -1.7, 1, 'b'], ['shop/freezer', -0.6, 1.3, 'r'],
    ['shop/freezer', 1.6, -1.3, 'l']] },
  clothes: { kit: 'shop', floor: 'shop/floor-wood', items: [
    ['shop/clothing-rack', -1.75, 0, 'b'], ['shop/clothing-table', -0.6, -1.2, 'l'], ['shop/clothing-rack', -1.75, -1, 'b'],
    ['shop/mannequin', 0.5, -1.4, 'l'], ['shop/clothing-rack', -1.75, 1, 'b'], ['shop/clothing-table', -0.6, 1.2, 'r'],
    ['shop/mannequin', 1.6, -1.4, 'l']] },
  gifts: { kit: 'shop', floor: 'shop/floor', items: [
    ['shop/gacha-machine', -1.85, 0, 'b'], ['arcade/prizes', -0.6, -1.4, 'l'], ['shop/gacha-machine', -1.85, -1, 'b'],
    ['shop/display-small', 0.5, -1.4, 'l'], ['shop/gacha-machine', -1.85, 1, 'b'], ['arcade/prizes', -0.6, 1.4, 'r'],
    ['shop/display-small', 1.4, -1.4, 'l']] },
  arcade: { kit: 'arcade', floor: 'arcade/floor', play: true, items: [
    ['arcade/arcade-machine', -1.85, 0, 'b'], ['arcade/pinball', -0.6, -1.25, 'l'], ['arcade/arcade-machine', -1.85, -0.8, 'b'],
    ['arcade/pinball', 0.5, -1.25, 'l'], ['arcade/arcade-machine', -1.85, 0.8, 'b'], ['arcade/arcade-machine', -0.6, 1.4, 'r'],
    ['arcade/vending-machine', 1.6, -1.4, 'l']] },
  games: { kit: 'arcade', floor: 'arcade/floor', play: true, items: [
    ['arcade/claw-machine', -1.75, 0, 'b'], ['arcade/gambling-machine', -0.6, -1.4, 'l'], ['arcade/claw-machine', -1.75, -1, 'b'],
    ['arcade/gambling-machine', 0.2, -1.4, 'l'], ['arcade/claw-machine', -1.75, 1, 'b'], ['arcade/ticket-machine', -0.6, 1.45, 'r'],
    ['arcade/prize-wheel', 1.2, -1.5, 'l']] },
  sports: { kit: 'arcade', floor: 'arcade/floor', play: true, items: [
    ['arcade/basketball-game', -1.65, 0, 'b'], ['arcade/air-hockey', -0.5, -1.25, 'l'], ['arcade/dance-machine', -1.65, -1.05, 'b'],
    ['arcade/air-hockey', 1.0, -1.25, 'l'], ['arcade/dance-machine', -1.65, 1.05, 'b'], ['arcade/ticket-machine', -0.6, 1.45, 'r'],
    ['arcade/vending-machine', 1.9, -1.4, 'l']] }
};
var COUNTER = [1.4, 1.2];

// the entrance hall fills its two sides, a level at a time; the middle stays free for the way in
var HALL_ITEMS = [
  [1, 'shop/shopping-cart', -5.8, 1.6, 0], [1, 'shop/shopping-cart', -5.4, 1.6, 0], [1, 'shop/shopping-cart', -5.0, 1.6, 0],
  [1, 'shop/shopping-basket', -4.3, 1.85, 0], [2, 'shop/cash-register-self', 3.0, 0.3, 0], [2, 'shop/cash-register-self', 4.3, 0.3, 0],
  [3, 'shop/bottle-return', -3.2, 1.9, Math.PI], [3, 'shop/bottle-return', -2.6, 1.9, Math.PI],
  [4, 'arcade/vending-machine', 5.0, 1.9, Math.PI], [4, 'arcade/vending-machine', 5.6, 1.9, Math.PI]
];

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
var focus = { x: 0, z: -2, dist: 17, az: VIEW_AZ };
var goal = null;
var azGoal = null;
var DMIN = 8;
var DMAX = 70;
var BOUNDS = [-7, 7, -21, 6];
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
var rows = [];
var outer = [];
var hall;
var people = [];
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

function loadModels(list, progress, done) {
  var loader = new GLTFLoader();
  loader.register(textureFix);
  var mats = {};
  var models = {};
  var n = 0;
  function material(src, kit) {
    var key = kit + '|' + (src.map ? 'map' : src.name + src.color.getHex());
    if (mats[key]) return mats[key];
    if (src.map) {
      src.map.magFilter = THREE.NearestFilter;
      src.map.minFilter = THREE.NearestFilter;
      src.map.generateMipmaps = false;
      src.map.colorSpace = THREE.SRGBColorSpace;
    }
    mats[key] = src.map ? new THREE.MeshLambertMaterial({ map: src.map }) : new THREE.MeshLambertMaterial({ color: src.color });
    return mats[key];
  }
  var missing = { parts: [], box: { x0: -0.3, x1: 0.3, z0: -0.3, z1: 0.3, y0: 0, h: 0.3 }, gltf: null };
  function one() {
    progress(++n / list.length);
    if (n === list.length) done();
  }
  list.forEach(function (ref) {
    var kit = ref.split('/')[0];
    loader.load(BASE + ref + '.glb', function (g) {
      var parts = [];
      var box = new THREE.Box3();
      var skinned = g.animations.length > 0;
      g.scene.updateMatrixWorld(true);
      g.scene.traverse(function (o) {
        if (!o.isMesh) return;
        var geom = o.geometry.clone();
        if (!o.isSkinnedMesh) geom.applyMatrix4(o.matrixWorld);
        ['color', 'tangent', 'uv1', 'uv2'].forEach(function (a) { if (geom.attributes[a]) geom.deleteAttribute(a); });
        parts.push({ geom: geom, mat: material(o.material, kit) });
      });
      if (skinned) box.set(new THREE.Vector3(-0.2, 0, -0.2), new THREE.Vector3(0.2, 0.75, 0.2));
      else box.setFromObject(g.scene);
      models[ref] = { parts: parts, box: { x0: box.min.x, x1: box.max.x, z0: box.min.z, z1: box.max.z, y0: box.min.y, h: box.max.y }, gltf: skinned ? g : null };
      one();
    }, undefined, function () {
      console.warn('missing model', ref);
      one();
    });
  });
  return { model: function (ref) { return models[ref] || missing; } };
}

function modelList() {
  var seen = {};
  function add(r) { seen[r] = 1; }
  ['shop', 'arcade'].forEach(function (k) {
    ['wall', 'column', 'floor', 'cash-register', 'character-employee'].forEach(function (m) { add(k + '/' + m); });
  });
  add('shop/floor-wood');
  add('shop/hand-truck');
  Object.keys(SHOPS).forEach(function (id) { SHOPS[id].items.forEach(function (it) { add(it[0]); }); });
  HALL_ITEMS.forEach(function (it) { add(it[1]); });
  FOLK.forEach(add);
  add('arcade/character-gamer');
  return Object.keys(seen);
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
  cam = new THREE.PerspectiveCamera(40, 1, 1, 400);
  scene.add(new THREE.HemisphereLight(0xffffff, 0xb4bedc, 2.4));
  sun = new THREE.DirectionalLight(0xfff3dc, 2.0);
  sun.position.set(-9, 22, 8);
  sun.target.position.set(0, 0, -8);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  var sc = sun.shadow.camera;
  sc.left = -16;
  sc.right = 16;
  sc.top = 18;
  sc.bottom = -18;
  sc.near = 2;
  sc.far = 60;
  sun.shadow.bias = -0.0006;
  sun.shadow.normalBias = 0.02;
  scene.add(sun);
  scene.add(sun.target);
  root = new THREE.Group();
  scene.add(root);
}

function ground() {
  var g = new THREE.Mesh(new THREE.PlaneGeometry(200, 200), new THREE.MeshLambertMaterial({ color: 0x84c26c }));
  g.rotation.x = -Math.PI / 2;
  g.position.y = -0.03;
  g.receiveShadow = true;
  root.add(g);
  // the paved square in front of the doors and round the building
  var p = new THREE.Mesh(new THREE.PlaneGeometry(EDGE * 2 + 3, 40), new THREE.MeshLambertMaterial({ color: 0xc9c4bb }));
  p.rotation.x = -Math.PI / 2;
  p.position.set(0, -0.015, FRONT + 5 - 20);
  p.receiveShadow = true;
  root.add(p);
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
}

function place() {
  var cx = Math.cos(TILT);
  cam.position.set(focus.x + focus.dist * Math.sin(focus.az) * cx, focus.dist * Math.sin(TILT), focus.z + focus.dist * Math.cos(focus.az) * cx);
  cam.near = Math.max(0.5, focus.dist * 0.3);
  cam.far = focus.dist * 4 + 60;
  cam.updateProjectionMatrix();
  cam.lookAt(focus.x, 0, focus.z);
  cam.updateMatrixWorld(true);
  cutaway();
}

// outer walls on the camera's side drop to their foot, so the rooms behind them stay in view; so do the walls
// between rows when the camera looks straight along the corridor
function cutaway() {
  var sx = Math.sin(focus.az);
  var sz = Math.cos(focus.az);
  outer.forEach(function (w) {
    var d = w.n[0] * sx + w.n[1] * sz;
    var cut = w.on() ? d > 0.3 : Math.abs(d) > 0.8;
    var s = cut ? 0.12 : 1;
    if (w.g.scale.y !== s) {
      w.g.scale.y = s;
      shadowDirty = true;
    }
  });
}

function clamp() {
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
      focus.az = pinch.az + (Math.atan2(b.y - a.y, b.x - a.x) - pinch.ang);
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
  this.add = function (ref, x, z, rot) {
    lib.model(ref).parts.forEach(function (p) {
      var key = p.mat.uuid + (p.geom.index ? 'i' : 'n') + Object.keys(p.geom.attributes).sort().join();
      if (!sets[key]) sets[key] = { mat: p.mat, list: [] };
      q.setFromAxisAngle(up, rot || 0);
      mtx.compose(new THREE.Vector3(x, 0, z), q, new THREE.Vector3(1, 1, 1));
      sets[key].list.push(p.geom.clone().applyMatrix4(mtx));
    });
  };
  this.group = function () {
    var g = new THREE.Group();
    Object.keys(sets).forEach(function (k) {
      var o = new THREE.Mesh(mergeGeometries(sets[k].list, false), sets[k].mat);
      o.castShadow = true;
      o.receiveShadow = true;
      g.add(o);
    });
    return g;
  };
}

// a straight run of wall from (x0, z0) to (x1, z1), one piece per unit, decorated side toward `inX, inZ`
function wallRun(b, kit, x0, z0, x1, z1, inX, inZ) {
  var n = Math.round(Math.hypot(x1 - x0, z1 - z0));
  var rot = Math.atan2(inX, inZ);
  for (var i = 0; i < n; i++) {
    var u = (i + 0.5) / n;
    b.add(kit + '/wall', x0 + (x1 - x0) * u, z0 + (z1 - z0) * u, rot);
  }
}

function floors(b, ref, x0, x1, z0, z1) {
  for (var x = x0 + 0.5; x < x1; x++) for (var z = z0 + 0.5; z < z1; z++) b.add(ref, x, z, 0);
}

// a shop's own frame: lx toward the corridor, lz across; the east units mirror the west ones, so every counter is
// on the south side
function toWorld(s, lx, lz) {
  return [s.cx + s.sg * lx, s.cz + lz];
}
function faceRot(s, f) {
  var d = f === 'b' ? [1, 0] : f === 'l' ? [0, 1] : f === 'r' ? [0, -1] : [-1, 0];
  return Math.atan2(s.sg * d[0], d[1]);
}

function figure(ref, clip) {
  var m = lib.model(ref);
  var g = new THREE.Group();
  if (!m.gltf) return { obj: g, mixer: null, acts: {}, cur: null };
  var obj = clone(m.gltf.scene);
  obj.traverse(function (o) {
    if (!o.isMesh) return;
    o.material = lib.model(ref).parts[0].mat;
    o.castShadow = true;
  });
  g.add(obj);
  var f = { obj: g, mixer: new THREE.AnimationMixer(obj), acts: {}, cur: null, ref: ref };
  ['idle', 'walk', 'pick-up'].forEach(function (c) {
    var a = THREE.AnimationClip.findByName(m.gltf.animations, c);
    if (a) f.acts[c] = f.mixer.clipAction(a);
  });
  act(f, clip || 'idle', 0);
  return f;
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

function rowZ(p) {
  return BACK - DEPTH * p;
}

function buildRows() {
  var n = Math.ceil(order.length / 2);
  for (var p = 0; p < n; p++) {
    var z1 = rowZ(p);
    var z0 = z1 - DEPTH;
    var row = { p: p, z0: z0, z1: z1, parts: [], shown: false, rise: 0 };
    var base = new Batch();
    floors(base, 'shop/floor', -SIDE, SIDE, z0, z1);
    var ends = [-EDGE, -SIDE, SIDE, EDGE];
    ends.forEach(function (x) { base.add(x < 0 ? shopAt(p, 0).kit + '/column' : shopAt(p, 1).kit + '/column', x, z0, 0); });
    var north = new Batch();
    var west = new Batch();
    var east = new Batch();
    [0, 1].forEach(function (side) {
      var s = shopAt(p, side);
      if (!s) return;
      floors(base, s.cfg.floor, s.cx - 2.5, s.cx + 2.5, z0, z1);
      var xo = side ? EDGE : -EDGE;
      var xi = side ? SIDE : -SIDE;
      wallRun(north, s.kit, xo, z0, xi, z0, 0, 1);
      wallRun(side ? east : west, s.kit, xo, z1, xo, z0, side ? -1 : 1, 0);
    });
    var cap = new Batch();
    wallRun(cap, 'shop', -SIDE, z0, SIDE, z0, 0, 1);
    var parts = [[base, null], [north, [0, -1]], [west, [-1, 0]], [east, [1, 0]], [cap, [0, -1]]];
    parts.forEach(function (pt, i) {
      var g = pt[0].group();
      g.visible = false;
      root.add(g);
      row.parts.push(g);
      if (i === 4) row.cap = g;
      if (pt[1]) {
        (function (r, last) {
          outer.push({ g: g, n: pt[1], on: function () { return !last || r.p === shownRows() - 1; } });
        })(row, i === 1 || i === 4);
      }
    });
    rows.push(row);
  }
}

function shopAt(p, side) {
  return shops[order[p * 2 + side]];
}

function shownRows() {
  var n = 0;
  while (n < order.length && has(order[n])) n++;
  return Math.min(rows.length, Math.floor(n / 2) + 1);
}

function buildShops() {
  BIZ.forEach(function (b, k) {
    var cfg = SHOPS[b.id];
    if (!cfg) return;
    var p = k >> 1;
    var side = k & 1;
    var s = { id: b.id, cfg: cfg, kit: cfg.kit, k: k, p: p, sg: side ? -1 : 1, cx: side ? 4 : -4, cz: rowZ(p) - DEPTH / 2, items: [], shown: -1 };
    shops[b.id] = s;
    order.push(b.id);
  });
  order.forEach(function (id) {
    var s = shops[id];
    s.group = new THREE.Group();
    root.add(s.group);
    cfgItems(s);
    var c = toWorld(s, COUNTER[0], COUNTER[1]);
    s.counter = mesh(s.kit + '/cash-register', c[0], c[1], faceRot(s, 'b'));
    s.group.add(s.counter);
    var e = toWorld(s, COUNTER[0] - 0.7, COUNTER[1]);
    s.clerk = figure(s.kit + '/character-employee', 'idle');
    s.clerk.obj.position.set(e[0], 0, e[1]);
    s.clerk.obj.rotation.y = faceRot(s, 'b');
    s.group.add(s.clerk.obj);
    var st = new THREE.Group();
    for (var i = 0; i < 3; i++) {
      var coin = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.035, 14), new THREE.MeshLambertMaterial({ color: 0xffd23a, emissive: 0x6a4a00 }));
      coin.position.set(i === 1 ? 0.03 : 0, i * 0.037, i === 1 ? 0.02 : 0);
      st.add(coin);
    }
    var sk = toWorld(s, COUNTER[0] + 0.15, COUNTER[1] - 0.25);
    st.position.set(sk[0], lib.model(s.kit + '/cash-register').box.h + 0.02, sk[1]);
    s.group.add(st);
    s.stack = st;
    var h = toWorld(s, 0, 0);
    s.truck = mesh('shop/hand-truck', h[0], h[1], faceRot(s, 'l') + 0.4);
    s.group.add(s.truck);
    var pick = new THREE.Mesh(new THREE.BoxGeometry(5, 1.2, DEPTH), new THREE.MeshBasicMaterial({ visible: false }));
    pick.position.set(s.cx, 0.6, s.cz);
    pick.userData.id = id;
    root.add(pick);
    picks.push(pick);
    s.pick = pick;
  });
}

function cfgItems(s) {
  s.cfg.items.forEach(function (it) {
    var w = toWorld(s, it[1], it[2]);
    var rot = faceRot(s, it[3]);
    var g = mesh(it[0], w[0], w[1], rot);
    g.visible = false;
    s.group.add(g);
    var box = lib.model(it[0]).box;
    // where a shopper stands to look at it: in front of it, clear of its front edge
    var d = it[3] === 'b' ? [1, 0] : it[3] === 'l' ? [0, 1] : [0, -1];
    var off = box.z1 + 0.3;
    s.items.push({ g: g, lx: it[1], lz: it[2], at: [it[1] + d[0] * off, it[2] + d[1] * off], face: it[3] });
  });
}

function buildHall() {
  var b = new Batch();
  floors(b, 'shop/floor', -EDGE, EDGE, BACK, FRONT);
  [-EDGE, -SIDE, SIDE, EDGE].forEach(function (x) {
    b.add('shop/column', x, BACK, 0);
    b.add('shop/column', x, FRONT, 0);
  });
  var g = b.group();
  root.add(g);
  var back = new Batch();
  wallRun(back, 'shop', -EDGE, BACK, -SIDE, BACK, 0, 1);
  wallRun(back, 'shop', SIDE, BACK, EDGE, BACK, 0, 1);
  var bg = back.group();
  root.add(bg);
  outer.push({ g: bg, n: [0, -1], on: function () { return false; } });
  var front = new Batch();
  wallRun(front, 'shop', -EDGE, FRONT, -SIDE, FRONT, 0, -1);
  wallRun(front, 'shop', SIDE, FRONT, EDGE, FRONT, 0, -1);
  var fg = front.group();
  root.add(fg);
  outer.push({ g: fg, n: [0, 1], on: function () { return true; } });
  var sides = new Batch();
  wallRun(sides, 'shop', -EDGE, FRONT, -EDGE, BACK, 1, 0);
  var sg = sides.group();
  root.add(sg);
  outer.push({ g: sg, n: [-1, 0], on: function () { return true; } });
  var sides2 = new Batch();
  wallRun(sides2, 'shop', EDGE, FRONT, EDGE, BACK, -1, 0);
  var sg2 = sides2.group();
  root.add(sg2);
  outer.push({ g: sg2, n: [1, 0], on: function () { return true; } });
  hall = { items: [], shown: -1 };
  HALL_ITEMS.forEach(function (it) {
    var m = mesh(it[1], it[2], it[3], it[4]);
    m.visible = false;
    root.add(m);
    hall.items.push({ g: m, lv: it[0] });
  });
  var pick = new THREE.Mesh(new THREE.BoxGeometry(EDGE * 2, 1.2, FRONT - BACK), new THREE.MeshBasicMaterial({ visible: false }));
  pick.position.set(0, 0.6, (FRONT + BACK) / 2);
  pick.userData.id = 'hall';
  root.add(pick);
  picks.push(pick);
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

function dustAt(g, now) {
  var b = new THREE.Box3().setFromObject(g);
  dust(b.min.x, b.max.x, b.min.z, b.max.z, now, 8);
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

// pieces and rows that appear grow up out of the floor
var rising = [];
function rise(g, now, len) {
  g.visible = true;
  g.scale.y = 0.01;
  rising.push({ g: g, t0: now, len: len || 500 });
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
    }
  }
}

function sync(animate, now) {
  var nr = shownRows();
  rows.forEach(function (r) {
    var on = r.p < nr;
    if (on && !r.shown) {
      r.parts.forEach(function (g, i) {
        if (i === 4) return;
        if (animate) rise(g, now, 700);
        else g.visible = true;
      });
      if (animate) dust(-EDGE, EDGE, r.z0, r.z1, now, 24);
    }
    if (!on) r.parts.forEach(function (g) { g.visible = false; });
    r.shown = on;
    r.cap.visible = on && r.p === nr - 1;
  });
  order.forEach(function (id) {
    var s = shops[id];
    var open = rows[s.p].shown;
    s.group.visible = open;
    s.pick.visible = open;
    var own = has(id);
    var n = own ? Math.min(s.items.length, shape(id)) : 0;
    if (n !== s.shown) {
      s.items.forEach(function (it, i) {
        var want = i < n;
        if (want && !it.g.visible && animate && s.shown >= 0) {
          rise(it.g, now, 450);
          dustAt(it.g, now);
        } else it.g.visible = want;
        if (!want) it.g.visible = false;
      });
      s.shown = n;
      shadowDirty = true;
    }
    s.truck.visible = !own;
    s.counter.visible = own;
    var m = own && managed(id);
    if (m !== s.clerk.obj.visible) {
      s.clerk.obj.visible = m;
      shadowDirty = true;
    }
  });
  var hl = S.hall;
  if (hl !== hall.shown) {
    hall.items.forEach(function (it) {
      var want = it.lv <= hl;
      if (want && !it.g.visible && animate && hall.shown >= 0) {
        rise(it.g, now, 450);
        dustAt(it.g, now);
      } else it.g.visible = want;
    });
    hall.shown = hl;
    shadowDirty = true;
  }
  var last = rowZ(nr) - 0.5;
  BOUNDS = [-EDGE, EDGE, last + 1.5, FRONT + 2];
  cutaway();
}

function pop(now) {
  for (var id in bump) {
    var u = (now - bump[id]) / 650;
    var s = shops[id];
    if (!s) {
      delete bump[id];
      continue;
    }
    var k = u >= 1 ? 1 : 1 + 0.1 * Math.sin(u * Math.PI) * (1 - u);
    s.group.scale.set(k, k, k);
    s.group.position.set(s.cx * (1 - k), 0, s.cz * (1 - k));
    if (u >= 1) {
      delete bump[id];
      shadowDirty = true;
    }
  }
}

// Shoppers come in through the doors, walk to a shop, look at one of its pieces, pay at the counter and leave.
// Each open shop draws a few, more as it levels
function wantPeople() {
  var n = 0;
  order.forEach(function (id) { if (has(id)) n += Math.min(3, 1 + Math.floor(lv(id) / 20)); });
  return Math.min(22, n + S.hall);
}

var spawnT = 0;
var blobGeo = new THREE.CircleGeometry(0.2, 16);
var blobMat = new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.18, depthWrite: false });

function person(i) {
  var ref = FOLK[i % FOLK.length];
  var f = figure(ref, 'walk');
  var blob = new THREE.Mesh(blobGeo, blobMat);
  blob.rotation.x = -Math.PI / 2;
  blob.position.y = 0.035;
  f.obj.add(blob);
  f.obj.traverse(function (o) { if (o.isMesh && o !== blob) o.castShadow = false; });
  f.obj.visible = false;
  root.add(f.obj);
  return { f: f, path: null, i: 0, wait: 0, speed: 1.1 + (i % 5) * 0.08 };
}

function pickShop() {
  var open = order.filter(function (id) { return has(id) && shops[id].shown > 0; });
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

function route(s) {
  var it = s.items[Math.floor(Math.random() * s.shown)];
  var lane = s.sg > 0 ? -0.55 : 0.55;
  var jx = (Math.random() - 0.5) * 0.5;
  var pts = [];
  function at(lx, lz, wait, a, face) {
    var w = toWorld(s, lx, lz);
    pts.push({ x: w[0], z: w[1], wait: wait || 0, act: a, face: face });
  }
  pts.push({ x: jx * 2, z: FRONT + 4.5 });
  pts.push({ x: jx, z: FRONT + 0.2 });
  pts.push({ x: lane + jx * 0.3, z: BACK - 0.3 });
  pts.push({ x: lane + jx * 0.3, z: s.cz - jx * 0.6 });
  at(2.3, 0);
  at(it.at[0], 0);
  var look = faceRot(s, it.face) + Math.PI;
  at(it.at[0], it.at[1], s.cfg.play ? 3.5 : 1.6, s.cfg.play ? 'idle' : 'pick-up', look);
  at(it.at[0], 0.3);
  at(COUNTER[0] + 0.75, 0.3);
  at(COUNTER[0] + 0.75, COUNTER[1], 1.2, 'idle', faceRot(s, 'f'));
  at(2.6, 0.5);
  pts.push({ x: -lane + jx * 0.3, z: s.cz + 0.5 });
  pts.push({ x: -lane * 0.6, z: BACK - 0.3 });
  pts.push({ x: -jx, z: FRONT + 0.2 });
  pts.push({ x: -jx * 2, z: FRONT + 4.5 });
  return pts;
}

function peopleStep(dt) {
  spawnT -= dt;
  var busy = 0;
  people.forEach(function (p) { if (p.path) busy++; });
  if (busy < wantPeople() && spawnT <= 0) {
    var s = pickShop();
    var idle = null;
    for (var i = 0; i < people.length; i++) if (!people[i].path) { idle = people[i]; break; }
    if (!idle && people.length < 22) {
      idle = person(people.length);
      people.push(idle);
    }
    if (s && idle) {
      idle.path = route(s);
      idle.i = 1;
      idle.wait = 0;
      idle.f.obj.position.set(idle.path[0].x, 0, idle.path[0].z);
      idle.f.obj.visible = true;
      act(idle.f, 'walk', 0);
    }
    spawnT = 0.9 + Math.random() * 0.8;
  }
  people.forEach(function (p) {
    if (!p.path) return;
    var o = p.f.obj;
    if (p.f.mixer) p.f.mixer.update(dt);
    if (p.wait > 0) {
      p.wait -= dt;
      if (p.wait <= 0) act(p.f, 'walk', 0.2);
      return;
    }
    var q = p.path[p.i];
    var dx = q.x - o.position.x;
    var dz = q.z - o.position.z;
    var d = Math.hypot(dx, dz);
    var step = p.speed * dt;
    if (d > 0.001) {
      var want = Math.atan2(dx, dz);
      var da = Math.atan2(Math.sin(want - o.rotation.y), Math.cos(want - o.rotation.y));
      o.rotation.y += da * Math.min(1, dt * 10);
    }
    if (d <= step) {
      o.position.x = q.x;
      o.position.z = q.z;
      if (q.wait) {
        p.wait = q.wait;
        if (q.face !== undefined) o.rotation.y = q.face;
        act(p.f, q.act || 'idle', 0.2);
      }
      p.i++;
      if (p.i >= p.path.length) {
        p.path = null;
        o.visible = false;
      }
      return;
    }
    o.position.x += dx / d * step;
    o.position.z += dz / d * step;
  });
}

function resetPeople() {
  people.forEach(function (p) {
    p.path = null;
    p.f.obj.visible = false;
  });
  spawnT = 0;
}

function makeTags() {
  tagsEl = document.getElementById('tags');
  order.concat(['hall']).forEach(function (id) {
    var el = document.createElement('div');
    el.className = 'tag';
    el.innerHTML = '<b></b><i><u></u></i>';
    el.addEventListener('click', function () { onTap({ kind: 'biz', id: id }); });
    var coin = document.createElement('button');
    coin.type = 'button';
    coin.className = 'coin';
    coin.hidden = true;
    coin.addEventListener('click', function (e) {
      var r = coin.getBoundingClientRect();
      e.stopPropagation();
      onTap({ kind: 'coin', id: id, x: r.left + r.width / 2, y: r.top + r.height / 2 });
    });
    tagsEl.appendChild(el);
    tagsEl.appendChild(coin);
    var t = { el: el, coin: coin, text: '', wait: -1, x: 0, y: 0, line: el.firstChild, bar: el.querySelector('u'), cls: '' };
    if (id === 'hall') hall.tag = t;
    else shops[id].tag = t;
  });
  arrowEl = document.createElement('div');
  arrowEl.id = 'arrow';
  arrowEl.innerHTML = '<svg viewBox="0 0 24 30"><path d="M12 29 L2 14 H8 V2 H16 V14 H22 Z"/></svg>';
  arrowEl.hidden = true;
  tagsEl.appendChild(arrowEl);
}

function bstate(id) {
  if (id === 'hall') return { name: 'Entrance', lv: S.hall, own: S.hall > 0, price: hallCost(), avail: has(HALL.after), frac: 0, wait: 0 };
  var e = S.b[id];
  return { name: BZ[id].name, lv: e ? e.l : 0, own: !!e, price: cost(id, 1), avail: avail(id),
    frac: e ? (e.w ? 1 : Math.min(1, e.t / cycleAt(id, e.l))) : 0, wait: e ? e.w : 0 };
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
  if (id === 'hall') return [0, 1.5, (FRONT + BACK) / 2];
  var s = shops[id];
  var c = toWorld(s, -0.3, 0);
  return [c[0], 0.9, c[1]];
}

function overlay(now) {
  order.concat(['hall']).forEach(function (id) {
    var s = id === 'hall' ? hall : shops[id];
    var t = s.tag;
    var st = bstate(id);
    var a = anchor(id);
    toScreen(a[0], a[1], a[2], sp);
    var open = id === 'hall' ? st.own || st.avail : rows[s.p].shown;
    var vis = open && sp.z < 1 && sp.x > -60 && sp.x < cw + 60 && sp.y > IT + 34 && sp.y < ch - IB + 30;
    if (open && sp.z < 1) anchorXY[id] = { x: sp.x, y: sp.y };
    else delete anchorXY[id];
    var show = vis && (st.own || st.avail || focus.dist < 40);
    if (t.shown !== show) {
      t.shown = show;
      t.el.style.display = show ? '' : 'none';
    }
    if (show) {
      var line = st.own ? st.name + '  Lv ' + st.lv : st.avail ? st.name + '  $' + short(st.price) : st.name + '  locked';
      if (line !== t.text) {
        t.text = line;
        t.line.textContent = line;
      }
      var cls = 'tag' + (st.own ? ' own' : st.avail ? ' buy' : ' lock') + (!st.own && st.avail && S.cash >= st.price ? ' ready' : '');
      if (cls !== t.cls) {
        t.cls = cls;
        t.el.className = cls;
      }
      if (st.own) t.bar.style.width = (st.frac * 100).toFixed(1) + '%';
      t.bar.className = st.wait > 0 ? 'full' : '';
      var sc = Math.max(0.78, Math.min(1.1, 30 / focus.dist + 0.2));
      var tx = Math.round(sp.x);
      var ty = Math.round(sp.y);
      if (tx !== t.x || ty !== t.y || sc !== t.sc) {
        t.x = tx;
        t.y = ty;
        t.sc = sc;
        t.el.style.transform = 'translate(' + tx + 'px,' + ty + 'px) translate(-50%,-100%) scale(' + sc + ')';
      }
    }
    if (id === 'hall') return;
    s.stack.visible = st.wait > 0;
    // the cash waits on the counter
    var c = s.stack.position;
    toScreen(c.x, c.y + 0.25, c.z, sp);
    var coin = st.wait > 0 && open && sp.z < 1 && sp.y > IT + 20 && sp.y < ch - IB + 30;
    if (coin) {
      if (t.wait !== st.wait) {
        t.wait = st.wait;
        t.coin.textContent = '$' + short(st.wait);
      }
      var bob = Math.sin(now / 260 + sp.x) * 3;
      t.coin.style.transform = 'translate(' + Math.round(sp.x) + 'px,' + Math.round(sp.y + bob) + 'px) translate(-50%,-50%)';
    }
    if (t.coin.hidden === coin) t.coin.hidden = !coin;
  });
  var a2 = bestId && anchorXY[bestId];
  if (!a2) {
    arrowEl.hidden = true;
    return;
  }
  var wait = bstate(bestId).wait > 0;
  var bob2 = Math.abs(Math.sin(now / 260)) * 9;
  var x = a2.x;
  var y = a2.y - (wait ? 90 : 52) - bob2;
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
  ground();
  [['turn-l', -1], ['turn-r', 1]].forEach(function (b) {
    document.getElementById(b[0]).addEventListener('click', function () {
      azGoal = (azGoal === null ? Math.round(focus.az / (Math.PI / 4)) * Math.PI / 4 : azGoal) + b[1] * Math.PI / 4;
    });
  });
  var bar = document.getElementById('load-bar');
  lib = loadModels(modelList(), function (p) { if (bar) bar.style.width = Math.round(p * 100) + '%'; }, function () {
    setTimeout(function () {
      try {
        start();
      } catch (e) {
        console.error(e);
        fail('The mall could not be built. Please reload.');
      }
    }, 30);
  });
}

function fail(msg) {
  loadingEl.firstChild.innerHTML = '<b>Main Street</b><p>' + msg + '</p>';
}

function start() {
  buildShops();
  buildRows();
  buildHall();
  makeTags();
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
  peopleStep(dt);
  if (focus.dist < 50) {
    order.forEach(function (id) {
      var c = shops[id].clerk;
      if (c.obj.visible && c.mixer && shops[id].group.visible) c.mixer.update(dt);
    });
  }
  puffsStep(now);
  riseStep(now);
  pop(now);
  if (rising.length || shadowDirty) {
    renderer.shadowMap.needsUpdate = true;
    shadowDirty = false;
  }
  renderer.render(scene, cam);
  overlay(now);
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
  if (s) return { x: s.cx * 0.5, y: s.cz };
  return { x: 0, y: (FRONT + BACK) / 2 };
}

function go(x, z) {
  flyTo(x, z, Math.min(focus.dist, fit(9)));
}

function focusNow(id) {
  goal = null;
  azGoal = null;
  var b = best();
  var p = spot(id || (b ? b.id : order[0]));
  focus.x = 0;
  focus.z = p.y;
  focus.dist = fit(14);
  focus.az = VIEW_AZ;
  clamp();
  place();
}

function event(res, now) {
  if (shops[res.id]) bump[res.id] = now;
  sync(true, now);
  var big = res.unlock || res.hall || (res.ms && res.ms.length);
  var p = spot(res.id);
  var out = 0.25;
  if (big) out = flyTo(0, p.y, Math.min(focus.dist, fit(14))) + 0.1;
  return out;
}

function refresh() {
  rows.forEach(function (r) { r.shown = false; });
  order.forEach(function (id) { shops[id].shown = -1; });
  hall.shown = -1;
  sync(false, 0);
  resetPeople();
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
  setBest: function (id) { bestId = id; }
};
