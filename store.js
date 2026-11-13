import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { clone } from 'three/addons/utils/SkeletonUtils.js';

var BASE = 'assets/models/';
var TILT = 52 * Math.PI / 180;

// The mall stands on the kits' one unit grid, walls on the half lines. An entrance hall runs across the front, a
// corridor goes north from it, and the shop units, six wide and five deep, sit two to a row either side of it.
// In front: a paved square, the parking lot, the sidewalk and the street.
var DEPTH = 5;
var UNIT = 6;
var FRONT = 2.5;
var BACK = -0.5;
var SIDE = 1.5;
var EDGE = SIDE + UNIT;
var LOT = [4, 9.6];
var WALK_N = 10.05;
var LANE_W = 11.25;
var LANE_E = 12.75;
var WALK_S = 13.95;
var AISLE = 6.8;
var DRIVE = 10.6;

// the kits are drawn at different sizes; these bring them to the shop kit's people
var SCALE = { car: 0.47, roads: 3, nature: 1.4, furn: 1.4, food: 0.5, sub: 3.2 };

var FOLK = 'abcdef'.split('').reduce(function (a, c) { return a.concat(['chars/character-female-' + c, 'chars/character-male-' + c]); }, []);
var CARS = ['car/sedan', 'car/suv', 'car/suv-luxury', 'car/hatchback-sports', 'car/van'];

// Every shop has twelve spots for its stands, in the order they are filled. lx runs from the back wall (-3) to the
// open front on the corridor (3), lz across the unit, north (-2.5) to south (2.5). b stands against the back wall,
// s against the north wall facing south, n against the south wall facing north; the two islands stand in the middle
// facing the aisles either side. A stand is pushed flush against its wall whatever its depth
var SPOTS = [['b', -0.5], ['s', -1], ['b', 0.5], ['n', -1], ['s', 0], ['b', -1.5], ['in', -0.6], ['b', 1.5], ['s', 1], ['n', 0],
  ['is', 0.6], ['s', 2]];

// what each shop is fitted with: its twelve stands, what goes on its counter, and the kit of its walls and floor
var SHOPS = {
  fruit: { kit: 'shop', floor: 'shop/floor-wood', top: ['food/watermelon', 'food/pineapple'],
    fix: ['display-fruit', 'display-fruit', 'display-fruit', 'display-fruit', 'display-fruit', 'display-cans', 'display-fruit', 'display-fruit',
      'display-fruit', 'display-small', 'display-fruit', 'display-cans'] },
  bakery: { kit: 'shop', floor: 'shop/floor-wood', top: ['food/cake', 'food/croissant'],
    fix: ['display-bread', 'display-bread', 'display-bread', 'display-small', 'display-bread', 'display-bread', 'display-bread', 'display-bread',
      'display-bread', 'display-small', 'display-bread', 'display-bread'] },
  flower: { kit: 'shop', floor: 'shop/floor', top: ['furn/plantSmall1', 'furn/plantSmall2'],
    fix: ['display-flowers', 'display-flowers', 'display-flowers', 'display-small', 'display-flowers', 'display-flowers', 'display-flowers', 'display-flowers',
      'display-flowers', 'display-small', 'display-flowers', 'display-flowers'] },
  grocery: { kit: 'shop', floor: 'shop/floor', top: ['food/apple', 'food/soda-bottle'],
    fix: ['shelf-boxes', 'shelf-bags', 'shelf-bags', 'display-cans', 'shelf-boxes', 'shelf-end', 'display-cans', 'shelf-end', 'shelf-bags',
      'display-fruit', 'display-cans', 'shelf-boxes'] },
  frozen: { kit: 'shop', floor: 'shop/floor', top: ['food/ice-cream', 'food/popsicle'],
    fix: ['freezers-standing', 'freezer', 'freezers-standing', 'freezer', 'freezer', 'freezers-standing', 'freezer', 'freezers-standing', 'freezer',
      'freezer', 'freezer', 'freezer'] },
  clothes: { kit: 'shop', floor: 'shop/floor-wood', top: ['shop/shopping-basket', 'furn/plantSmall3'],
    fix: ['clothing-rack', 'clothing-table', 'clothing-rack', 'mannequin', 'clothing-rack', 'clothing-rack', 'clothing-table', 'clothing-rack',
      'mannequin', 'clothing-table', 'clothing-table', 'mannequin'] },
  gifts: { kit: 'shop', floor: 'shop/floor', top: ['food/lollypop', 'food/candy-bar'],
    fix: ['gacha-machine', 'arcade/prizes', 'gacha-machine', 'display-small', 'arcade/prizes', 'gacha-machine', 'display-small', 'gacha-machine',
      'arcade/prizes', 'display-small', 'display-small', 'arcade/prizes'] },
  arcade: { kit: 'arcade', floor: 'arcade/floor', play: true, top: ['food/soda-can', 'food/popsicle'],
    fix: ['arcade-machine', 'arcade-machine', 'arcade-machine', 'pinball', 'arcade-machine', 'arcade-machine', 'pinball', 'arcade-machine',
      'arcade-machine', 'pinball', 'pinball', 'vending-machine'] },
  games: { kit: 'arcade', floor: 'arcade/floor', play: true, top: ['food/lollypop', 'food/cookie-chocolate'],
    fix: ['claw-machine', 'gambling-machine', 'claw-machine', 'ticket-machine', 'gambling-machine', 'claw-machine', 'prize-wheel', 'claw-machine',
      'gambling-machine', 'ticket-machine', 'prize-wheel', 'gambling-machine'] },
  sports: { kit: 'arcade', floor: 'arcade/floor', play: true, top: ['food/soda-can', 'food/donut-sprinkles'],
    fix: ['basketball-game', 'dance-machine', 'basketball-game', 'ticket-machine', 'dance-machine', 'basketball-game', 'air-hockey', 'basketball-game',
      'dance-machine', 'vending-machine', 'air-hockey', 'ticket-machine'] }
};

// what a shop gets at each of its 21 steps (STAGE): one more stand, its sign, plants, a rug, goods on the counter,
// a second clerk, and lights and a gold rim on the sign
var STEPS = ['fix', 'fix', 'sign', 'fix', 'plantN', 'fix', 'fix', 'rug', 'fix', 'fix', 'top', 'fix', 'plantS', 'fix', 'fix', 'top', 'fix', 'fix',
  'helper', 'glow', 'gold'];
var COUNTER = [1.9, 1.7];

// the entrance hall fills its two sides a level at a time, and the square in front with it; the middle is the way in
var HALL_ITEMS = [
  [1, 'shop/shopping-cart', -6.8, 1.7, 0], [1, 'shop/shopping-cart', -6.4, 1.7, 0], [1, 'shop/shopping-cart', -6.0, 1.7, 0],
  [1, 'shop/shopping-basket', -5.3, 1.9, 0], [1, 'furn/bench', -4.5, 3.25, Math.PI], [1, 'furn/bench', 4.5, 3.25, Math.PI],
  [1, 'furn/trashcan', -3.7, 3.3, 0], [1, 'furn/trashcan', 3.7, 3.3, 0],
  [2, 'shop/cash-register-self', 3.6, 0.3, 0], [2, 'shop/cash-register-self', 4.9, 0.3, 0], [2, 'shop/cash-register-self', 6.2, 0.3, 0],
  [2, 'sub/planter', -6.6, 3.25, 0], [2, 'sub/planter', 6.6, 3.25, 0],
  [3, 'shop/bottle-return', -3.6, 1.95, Math.PI], [3, 'shop/bottle-return', -3.0, 1.95, Math.PI], [3, 'furn/pottedPlant', -2.1, 0.1, 0],
  [3, 'furn/pottedPlant', 2.1, 0.1, 0], [3, 'roads/light-curved', -2.3, 3.75, Math.PI], [3, 'roads/light-curved', 2.3, 3.75, Math.PI],
  [4, 'arcade/vending-machine', 5.4, 1.95, Math.PI], [4, 'arcade/vending-machine', 6.0, 1.95, Math.PI], [4, 'arcade/vending-machine', 6.6, 1.95, Math.PI],
  [4, 'nature/tree_oak', -6.6, 3.25, 0], [4, 'nature/tree_oak', 6.6, 3.25, 0]
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
var focus = { x: 0, z: 0, dist: 30, az: VIEW_AZ };
var goal = null;
var azGoal = null;
var DMIN = 8;
var DMAX = 80;
var BOUNDS = [-12, 12, -30, 15];
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
    var k = SCALE[kit] || 1;
    loader.load(BASE + ref + '.glb', function (g) {
      var parts = [];
      var skinned = false;
      g.scene.traverse(function (o) { if (o.isSkinnedMesh) skinned = true; });
      g.scene.updateMatrixWorld(true);
      var box = new THREE.Box3().setFromObject(g.scene);
      // the furniture kit puts its models' corner at the origin
      var shift = new THREE.Matrix4().makeTranslation(kit === 'furn' ? -(box.min.x + box.max.x) / 2 : 0, 0, kit === 'furn' ? -(box.min.z + box.max.z) / 2 : 0);
      var sm = new THREE.Matrix4().makeScale(k, k, k).multiply(shift);
      g.scene.traverse(function (o) {
        if (!o.isMesh) return;
        var geom = o.geometry.clone();
        if (!o.isSkinnedMesh) geom.applyMatrix4(new THREE.Matrix4().multiplyMatrices(sm, o.matrixWorld));
        ['color', 'tangent', 'uv1', 'uv2'].forEach(function (a) { if (geom.attributes[a]) geom.deleteAttribute(a); });
        parts.push({ geom: geom, mat: material(o.material, kit) });
      });
      if (skinned) box.set(new THREE.Vector3(-0.2, 0, -0.2), new THREE.Vector3(0.2, 0.75, 0.2));
      else box.applyMatrix4(sm);
      models[ref] = { parts: parts, box: { x0: box.min.x, x1: box.max.x, z0: box.min.z, z1: box.max.z, y0: box.min.y, h: box.max.y }, gltf: skinned ? g : null };
      one();
    }, undefined, function () {
      console.warn('missing model', ref);
      one();
    });
  });
  return { model: function (ref) { return models[ref] || missing; } };
}

function fixRef(s, name) {
  return name.indexOf('/') > 0 ? name : s.kit + '/' + name;
}

function modelList() {
  var seen = {};
  function add(r) { seen[r] = 1; }
  ['shop', 'arcade'].forEach(function (k) {
    ['wall', 'column', 'floor', 'cash-register', 'character-employee'].forEach(function (m) { add(k + '/' + m); });
  });
  ['shop/floor-wood', 'shop/hand-truck', 'furn/cardboardBoxClosed', 'furn/cardboardBoxOpen', 'furn/pottedPlant', 'furn/plantSmall1', 'furn/rugRectangle',
    'furn/rugDoormat', 'furn/bench', 'furn/trashcan', 'sub/planter', 'roads/road-straight', 'roads/road-crossing', 'roads/light-square',
    'roads/light-curved', 'roads/construction-fence', 'roads/construction-light', 'roads/construction-barrier', 'roads/construction-cone',
    'roads/dumpster', 'roads/road-sign-street', 'car/taxi', 'car/delivery', 'car/tractor-shovel', 'car/box', 'car/truck-flat',
    'nature/tree_oak', 'nature/tree_default', 'nature/tree_fat', 'nature/tree_detailed', 'nature/tree_pineRoundC', 'nature/plant_bush',
    'nature/plant_bushLarge', 'food/bag', 'nature/flower_redA', 'nature/flower_yellowA', 'nature/flower_purpleA', 'sub/building-type-a',
    'sub/building-type-c', 'sub/building-type-e', 'sub/building-type-h', 'sub/building-type-k', 'sub/tree-large'].forEach(add);
  Object.keys(SHOPS).forEach(function (id) {
    var c = SHOPS[id];
    c.fix.forEach(function (f) { add(fixRef(c, f)); });
    c.top.forEach(add);
  });
  HALL_ITEMS.forEach(function (it) { add(it[1]); });
  FOLK.forEach(add);
  CARS.forEach(add);
  add('arcade/character-gamer');
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
  var one = new THREE.Vector3(1, 1, 1);
  function put(geom, mat, x, y, z, rot) {
    var key = mat.uuid + (geom.index ? 'i' : 'n') + Object.keys(geom.attributes).sort().join();
    if (!sets[key]) sets[key] = { mat: mat, list: [] };
    q.setFromAxisAngle(up, rot || 0);
    mtx.compose(new THREE.Vector3(x, y, z), q, one);
    sets[key].list.push(geom.clone().applyMatrix4(mtx));
  }
  this.add = function (ref, x, z, rot, y) {
    var m = lib.model(ref);
    m.parts.forEach(function (p) { put(p.geom, p.mat, x, (y || 0) - Math.min(0, m.box.y0), z, rot); });
  };
  // a flat slab of one colour, for paving, asphalt and paint
  this.slab = function (mat, x0, x1, z0, z1, y, h) {
    var g = new THREE.BoxGeometry(x1 - x0, h || 0.02, z1 - z0);
    g.deleteAttribute('uv');
    put(g, mat, (x0 + x1) / 2, (y || 0) - (h || 0.02) / 2, (z0 + z1) / 2, 0);
  };
  this.bulb = function (x, y, z) {
    put(bulbGeo, bulbMat, x, y, z, 0);
  };
  this.pool = function (x, z) {
    put(poolGeo, poolMat, x, 0.07, z, 0);
  };
  this.group = function (shadow) {
    var g = new THREE.Group();
    Object.keys(sets).forEach(function (k) {
      var o = new THREE.Mesh(mergeGeometries(sets[k].list, false), sets[k].mat);
      o.castShadow = shadow !== false && sets[k].mat !== poolMat && sets[k].mat !== bulbMat;
      o.receiveShadow = true;
      g.add(o);
    });
    return g;
  };
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
  if (!MAT[c]) MAT[c] = new THREE.MeshLambertMaterial({ color: c });
  return MAT[c];
}
var GRASS = 0x84c26c;
var PAVE = 0xd9d3c7;
var ASPHALT = 0x5b5e66;
var GRAVEL = 0xa39886;
var DIRT = 0x9b7b55;
var PAINT = 0xf4f2ea;

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

// a shop's own frame: lx toward the corridor, lz north to south; the east units mirror the west ones
function toWorld(s, lx, lz) {
  return [s.cx + s.sg * lx, s.cz + lz];
}
var DIR = { b: [1, 0], s: [0, 1], n: [0, -1], k: [-1, 0] };
function faceRot(s, f) {
  var d = DIR[f];
  return Math.atan2(s.sg * d[0], d[1]);
}

function figure(ref, clip) {
  var m = lib.model(ref);
  var g = new THREE.Group();
  if (!m.gltf) return { obj: g, mixer: null, acts: {}, cur: null };
  var obj = clone(m.gltf.scene);
  obj.traverse(function (o) {
    if (!o.isMesh) return;
    o.material = m.parts[0].mat;
    o.castShadow = true;
  });
  g.add(obj);
  var f = { obj: g, mixer: new THREE.AnimationMixer(obj), acts: {}, cur: null, ref: ref };
  ['idle', 'walk', 'pick-up', 'sit'].forEach(function (c) {
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

function shopAt(p, side) {
  return shops[order[p * 2 + side]];
}

function shownRows() {
  var n = 0;
  while (n < order.length && has(order[n])) n++;
  return Math.min(rows.length, Math.floor(n / 2) + 1);
}

function buildRows() {
  var n = Math.ceil(order.length / 2);
  for (var p = 0; p < n; p++) {
    var z1 = rowZ(p);
    var z0 = z1 - DEPTH;
    var row = { p: p, z0: z0, z1: z1, parts: [], shown: false };
    var base = new Batch();
    floors(base, 'shop/floor', -SIDE, SIDE, z0, z1);
    [-EDGE, -SIDE, SIDE, EDGE].forEach(function (x) { base.add((x < 0 ? shopAt(p, 0) : shopAt(p, 1)).kit + '/column', x, z0, 0); });
    // hedges along the outside walls
    [-1, 1].forEach(function (sd) {
      for (var z = z1 - 0.6; z > z0; z -= 1.1) base.add(p % 2 ? 'nature/plant_bushLarge' : 'nature/plant_bush', sd * (EDGE + 0.65), z, z * 1.7);
    });
    var north = new Batch();
    var west = new Batch();
    var east = new Batch();
    [0, 1].forEach(function (side) {
      var s = shopAt(p, side);
      floors(base, s.cfg.floor, s.cx - UNIT / 2, s.cx + UNIT / 2, z0, z1);
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
    row.site = buildSite(z0, z1, p);
    row.woods = buildWoods(z0, z1, p);
    rows.push(row);
  }
}

// the ground where the next row will stand: dirt behind a site fence, cones, lights, a digger and a stack of crates
function buildSite(z0, z1, p) {
  var b = new Batch();
  b.slab(flat(DIRT), -EDGE, EDGE, z0, z1, 0.01, 0.03);
  var x0 = -EDGE - 0.3;
  var x1 = EDGE + 0.3;
  for (var x = x0 + 0.6; x < x1; x += 1.15) b.add('roads/construction-fence', x, z0 - 0.15, Math.PI / 2);
  for (var z = z0 + 0.6; z < z1 - 0.2; z += 1.15) {
    b.add('roads/construction-fence', x0, z, 0);
    b.add('roads/construction-fence', x1, z, 0);
  }
  b.add('roads/construction-light', x0 + 0.2, z1 - 0.4, 0);
  b.add('roads/construction-light', x1 - 0.2, z1 - 0.4, 0);
  b.add('roads/construction-cone', -2, z1 - 0.7, 0);
  b.add('roads/construction-cone', -1.2, z1 - 0.9, 0);
  b.add('roads/construction-cone', 2.4, z1 - 0.8, 0);
  b.add('car/tractor-shovel', p % 2 ? 3.5 : -3.5, (z0 + z1) / 2, p % 2 ? -0.6 : 0.5);
  b.add('car/box', p % 2 ? -4.5 : 4.4, z0 + 1.2, 0.2);
  b.add('car/box', p % 2 ? -3.95 : 4.95, z0 + 1.25, -0.1);
  b.add('car/box', p % 2 ? -4.25 : 4.65, z0 + 1.2, 0, 0.33);
  b.add('roads/dumpster', p % 2 ? 5.6 : -5.6, z0 + 1.0, 0);
  var g = b.group();
  g.visible = false;
  root.add(g);
  return g;
}

// land further on is still wooded, and gets cleared a row at a time
var TREES = ['nature/tree_oak', 'nature/tree_default', 'nature/tree_fat', 'nature/tree_detailed', 'nature/tree_pineRoundC'];
function buildWoods(z0, z1, p) {
  var b = new Batch();
  var n = p * 40;
  for (var z = z1 - 0.9; z > z0; z -= 2.1) {
    for (var x = -EDGE + 0.4; x < EDGE; x += 2.2) {
      n++;
      b.add(TREES[n % 5], x + Math.sin(n * 12.9) * 0.6, z + Math.cos(n * 7.3) * 0.5, n);
    }
  }
  var g = b.group();
  g.visible = false;
  root.add(g);
  return g;
}

function buildShops() {
  BIZ.forEach(function (b, k) {
    var cfg = SHOPS[b.id];
    if (!cfg) return;
    var p = k >> 1;
    var side = k & 1;
    shops[b.id] = { id: b.id, cfg: cfg, kit: cfg.kit, k: k, p: p, sg: side ? -1 : 1, cx: (side ? 1 : -1) * (SIDE + UNIT / 2), cz: rowZ(p) - DEPTH / 2,
      items: [], pieces: [], shown: -1 };
    order.push(b.id);
  });
  order.forEach(function (id) {
    var s = shops[id];
    s.group = new THREE.Group();
    root.add(s.group);
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
    var sk = toWorld(s, COUNTER[0] + 0.1, COUNTER[1] + 0.25);
    st.position.set(sk[0], lib.model(s.kit + '/cash-register').box.h + 0.02, sk[1]);
    s.group.add(st);
    s.stack = st;
    // an empty unit being fitted out
    s.vacant = new THREE.Group();
    var h = toWorld(s, 0.4, 0.3);
    s.vacant.add(mesh('shop/hand-truck', h[0], h[1], faceRot(s, 'k') + 0.5));
    var bx = toWorld(s, -0.6, -0.4);
    s.vacant.add(mesh('furn/cardboardBoxClosed', bx[0], bx[1], 0.3));
    s.vacant.add(mesh('furn/cardboardBoxOpen', bx[0] + 0.45, bx[1] + 0.2, -0.4));
    s.vacant.add(mesh('furn/cardboardBoxClosed', bx[0] + 0.05, bx[1], 0.1, 0.39));
    s.group.add(s.vacant);
    buildPieces(s);
    var pick = new THREE.Mesh(new THREE.BoxGeometry(UNIT, 1.2, DEPTH), new THREE.MeshBasicMaterial({ visible: false }));
    pick.position.set(s.cx, 0.6, s.cz);
    pick.userData.id = id;
    root.add(pick);
    picks.push(pick);
    s.pick = pick;
  });
}

// where a stand goes so that its back meets its wall, and where a shopper stands to look at it
function spotFor(s, spot, ref) {
  var box = lib.model(ref).box;
  var f = spot[0];
  var lx;
  var lz;
  if (f === 'b') {
    lx = -2.68 - box.z0;
    lz = spot[1];
  } else if (f === 's') {
    lx = spot[1];
    lz = -2.18 - box.z0;
  } else if (f === 'n') {
    lx = spot[1];
    lz = 2.18 + box.z0;
  } else {
    lx = spot[1];
    lz = 0;
    f = f === 'in' ? 'n' : 's';
  }
  var d = DIR[f];
  var off = box.z1 + 0.28;
  return { lx: lx, lz: lz, f: f, at: [lx + d[0] * off, lz + d[1] * off] };
}

function signTex(name, gold) {
  var c = document.createElement('canvas');
  c.width = 256;
  c.height = 96;
  var x = c.getContext('2d');
  x.fillStyle = gold ? '#e0b43a' : '#2f3446';
  x.fillRect(0, 0, 256, 96);
  x.fillStyle = gold ? '#3a2a08' : '#fff6e0';
  x.font = 'bold 40px sans-serif';
  x.textAlign = 'center';
  x.textBaseline = 'middle';
  var words = name.split(' ');
  if (words.length > 1 && x.measureText(name).width > 236) {
    x.font = 'bold 34px sans-serif';
    x.fillText(words[0], 128, 30);
    x.fillText(words.slice(1).join(' '), 128, 68);
  } else x.fillText(name, 128, 50);
  var t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

// a blade sign on the column at the shop's south front corner, out over the corridor where the camera can read it
function makeSign(s) {
  var g = new THREE.Group();
  var c = toWorld(s, 3, 2.5);
  var mat = new THREE.MeshLambertMaterial({ map: signTex(BZ[s.id].name, false) });
  var w = 0.72;
  var board = new THREE.Mesh(new THREE.PlaneGeometry(w, 0.27), mat);
  board.position.set(c[0] + s.sg * (w / 2 + 0.3), 0.86, c[1] + 0.012);
  g.add(board);
  var back = board.clone();
  back.rotation.y = Math.PI;
  back.position.z = c[1] - 0.012;
  g.add(back);
  var arm = new THREE.Mesh(new THREE.BoxGeometry(w + 0.34, 0.035, 0.035), flat(0x3a3d4a));
  arm.position.set(c[0] + s.sg * (w / 2 + 0.17), 1.01, c[1]);
  g.add(arm);
  s.signMat = mat;
  return g;
}

function buildPieces(s) {
  var fixN = 0;
  var topN = 0;
  STEPS.forEach(function (k, i) {
    var g = null;
    if (k === 'fix') {
      var ref = fixRef(s.cfg, s.cfg.fix[fixN]);
      var sp = spotFor(s, SPOTS[fixN], ref);
      var w = toWorld(s, sp.lx, sp.lz);
      g = mesh(ref, w[0], w[1], faceRot(s, sp.f));
      s.items.push({ g: g, at: sp.at, f: sp.f, step: i });
      fixN++;
    } else if (k === 'sign') g = makeSign(s);
    else if (k === 'plantN') {
      var a = toWorld(s, 2.7, -1.95);
      g = mesh('furn/pottedPlant', a[0], a[1], 0.4);
    } else if (k === 'plantS') {
      var b2 = toWorld(s, 0.72, 2.0);
      g = mesh('furn/pottedPlant', b2[0], b2[1], 1.1);
    } else if (k === 'rug') {
      var r = toWorld(s, 2.05, 0);
      g = mesh('furn/rugRectangle', r[0], r[1], Math.PI / 2, 0.004);
    } else if (k === 'top') {
      var ref2 = s.cfg.top[topN];
      var t = toWorld(s, COUNTER[0] - 0.05, COUNTER[1] - 0.25 + topN * 0.5);
      var cb = lib.model(s.kit + '/cash-register').box;
      g = mesh(ref2, t[0], t[1], topN * 1.3, s.kit === 'arcade' ? cb.h : cb.h - 0.13);
      topN++;
    } else if (k === 'helper') {
      g = new THREE.Group();
      s.helper = { f: figure(s.kit + '/character-employee', 'walk'), i: 0, wait: 0, path: null };
      g.add(s.helper.f.obj);
    }
    if (g) {
      g.visible = false;
      s.group.add(g);
    }
    s.pieces.push({ k: k, g: g });
  });
}

function buildHall() {
  var b = new Batch();
  floors(b, 'shop/floor', -EDGE, EDGE, BACK, FRONT);
  [-EDGE, -SIDE, SIDE, EDGE].forEach(function (x) {
    b.add('shop/column', x, BACK, 0);
    b.add('shop/column', x, FRONT, 0);
  });
  b.add('furn/rugDoormat', -0.45, FRONT - 0.4, 0, 0.004);
  b.add('furn/rugDoormat', 0.45, FRONT - 0.4, 0, 0.004);
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
  [[-1, -EDGE], [1, EDGE]].forEach(function (sd) {
    var w = new Batch();
    wallRun(w, 'shop', sd[1], FRONT, sd[1], BACK, -sd[0], 0);
    var wg = w.group();
    root.add(wg);
    outer.push({ g: wg, n: [sd[0], 0], on: function () { return true; } });
  });
  var hall = { items: [], shown: -1 };
  HALL_ITEMS.forEach(function (it) {
    var m = mesh(it[1], it[2], it[3], it[4]);
    var l = LAMP[it[1]];
    if (l) {
      var bulb = new THREE.Mesh(bulbGeo, bulbMat);
      bulb.position.set(0, l[0], l[1]);
      m.add(bulb);
      var pool = new THREE.Mesh(poolGeo, poolMat);
      pool.position.set(0, 0.035, l[1]);
      m.add(pool);
    }
    m.visible = false;
    root.add(m);
    hall.items.push({ g: m, lv: it[0] });
  });
  places.hall = hall;
  addPick('hall', 0, (FRONT + BACK) / 2, EDGE * 2, FRONT - BACK);
  buildDoors();
}

// glass doors that slide apart when someone comes near; a fixed pane either side, a rail across the top
var glass = new THREE.MeshLambertMaterial({ color: 0xbfe6f2, transparent: true, opacity: 0.38, depthWrite: false });
var doors = { open: 0, panes: [] };
function buildDoors() {
  var rail = new THREE.Mesh(new THREE.BoxGeometry(SIDE * 2, 0.08, 0.16), flat(0x50566a));
  rail.position.set(0, 0.96, FRONT);
  root.add(rail);
  var pane = new THREE.BoxGeometry(0.72, 0.9, 0.03);
  var edge = new THREE.BoxGeometry(0.03, 0.9, 0.05);
  [-1, 1].forEach(function (sd) {
    var fixed = new THREE.Mesh(pane, glass);
    fixed.position.set(sd * 1.08, 0.47, FRONT + 0.05);
    root.add(fixed);
    var g = new THREE.Group();
    var p = new THREE.Mesh(pane, glass);
    g.add(p);
    [-0.35, 0.35].forEach(function (ex) {
      var e = new THREE.Mesh(edge, flat(0x8d93a6));
      e.position.x = ex;
      g.add(e);
    });
    g.position.set(sd * 0.36, 0.47, FRONT - 0.05);
    root.add(g);
    doors.panes.push({ g: g, sd: sd });
  });
}

function doorsStep(dt) {
  var near = false;
  for (var i = 0; i < people.length && !near; i++) {
    var p = people[i].f.obj.position;
    if (people[i].path && Math.abs(p.x) < 1.6 && Math.abs(p.z - FRONT) < 1.4) near = true;
  }
  var want = near ? 1 : 0;
  if (want === doors.open) return;
  doors.open = want > doors.open ? Math.min(1, doors.open + dt * 2.5) : Math.max(0, doors.open - dt * 1.5);
  var e = doors.open * doors.open * (3 - 2 * doors.open);
  doors.panes.forEach(function (d) { d.g.position.x = d.sd * (0.36 + e * 0.7); });
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

// in front of the doors: a paved square, then the parking lot with a walkway down its middle, the sidewalk and the
// street, and across the street a row of houses
function buildOutside() {
  var b = new Batch();
  b.slab(flat(GRASS), -90, 90, -90, 90, -0.03, 0.02);
  b.slab(flat(PAVE), -EDGE - 0.5, EDGE + 0.5, FRONT, LOT[0], 0, 0.02);
  b.slab(flat(PAVE), -60, 60, LOT[1], 10.5, 0, 0.02);
  b.slab(flat(PAVE), -60, 60, 13.5, 14.4, 0, 0.02);
  b.slab(flat(ASPHALT), -60, 60, 10.5, 13.5, 0, 0.015);
  for (var x = -60; x <= 60; x += 3) b.add(Math.abs(x) < 1 ? 'roads/road-crossing' : 'roads/road-straight', x, 12, 0, 0.002);
  for (var lx = -48; lx <= 48; lx += 8) lamp(b, 'roads/light-curved', lx + 4, 14.15, 0);
  // across the street
  var houses = ['sub/building-type-a', 'sub/building-type-c', 'sub/building-type-e', 'sub/building-type-h', 'sub/building-type-k'];
  for (var hx = -30, hi = 0; hx <= 30; hx += 6, hi++) {
    b.add(houses[hi % houses.length], hx, 17.6, Math.PI);
    b.add('sub/tree-large', hx + 3, 15.6, hi);
  }
  // trees round the site, thicker further out
  var trees = ['nature/tree_oak', 'nature/tree_default', 'nature/tree_fat', 'nature/tree_detailed', 'nature/tree_pineRoundC'];
  var ti = 0;
  for (var z = 1.5; z > -30; z -= 3.2) {
    if (z < -7 || z > 0) b.add(trees[ti++ % 5], EDGE + 2.4, z, ti);
    b.add(trees[ti++ % 5], -EDGE - 2.4, z, ti);
  }
  // woods behind the last row and either side, leaving the loading bay and the lot clear
  var n = 0;
  for (var gz = 3; gz > -44; gz -= 2.3) {
    for (var gx = -26; gx <= 26; gx += 2.2) {
      n++;
      var jx = gx + Math.sin(n * 12.9) * 0.7;
      var jz = gz + Math.cos(n * 7.3) * 0.7;
      var inner = Math.abs(jx) < EDGE + 3.6;
      if (inner && jz > -27.5 || Math.abs(jx) < 12.6 && jz > -7.5) continue;
      if (Math.sin(n * 3.1) > 0.75) continue;
      b.add(trees[n % 5], jx, jz, n);
    }
  }
  // a little garden on the west side and the loading bay on the east
  [[-10.2, 1.2], [-11.2, -1.4], [-9.6, -3.6]].forEach(function (p, i) { b.add(i % 2 ? 'nature/flower_yellowA' : 'nature/flower_redA', p[0], p[1], i); });
  b.add('furn/bench', -10.4, 0, -Math.PI / 2);
  b.add('furn/bench', -10.4, -2.4, -Math.PI / 2);
  b.slab(flat(ASPHALT), EDGE + 0.7, 11.2, -6.5, LOT[0], 0, 0.016);
  b.add('roads/dumpster', EDGE + 1.2, -5.6, Math.PI / 2);
  b.add('furn/cardboardBoxClosed', EDGE + 1.0, -3.6, 0.2);
  b.add('furn/cardboardBoxClosed', EDGE + 1.05, -3.25, -0.3);
  b.add('furn/cardboardBoxOpen', EDGE + 1.4, -3.4, 0.6);
  b.add('shop/hand-truck', EDGE + 1.1, -2.6, 1.2);
  root.add(b.group());
  buildLot();
  buildTaxi();
}

// parking bays: two rows either side of the aisle, each split by the walkway; the lot paints more of them at each level
function buildLot() {
  var lv = levels(4);
  // before it is built: graded gravel behind a site fence, a digger and a load of curbs waiting
  lv[0].slab(flat(GRAVEL), -11.2, 11.2, LOT[0], LOT[1], 0.006, 0.02);
  for (var fx = -10.6; fx < 11; fx += 1.15) {
    if (Math.abs(fx) < 1.6) continue;
    lv[0].add('roads/construction-fence', fx, LOT[0] + 0.25, Math.PI / 2);
    lv[0].add('roads/construction-fence', fx, LOT[1] - 0.25, Math.PI / 2);
  }
  for (var fz = LOT[0] + 0.85; fz < LOT[1] - 0.4; fz += 1.15) {
    lv[0].add('roads/construction-fence', -11.0, fz, 0);
    lv[0].add('roads/construction-fence', 11.0, fz, 0);
  }
  lv[0].add('car/tractor-shovel', -5.5, 6.6, 1.2);
  lv[0].add('car/truck-flat', 6.2, 6.9, -Math.PI / 2);
  lv[0].add('car/box', 6.0, 6.9, 0.1, 0.3);
  lv[0].add('car/box', 6.5, 6.9, -0.2, 0.3);
  lv[0].add('car/box', 8.6, 5.0, 0.4);
  lv[0].add('car/box', 9.05, 5.1, -0.1);
  lv[0].add('roads/construction-light', -1.9, LOT[0] + 0.3, 0);
  lv[0].add('roads/construction-light', 1.9, LOT[1] - 0.3, 0);
  [[-2.6, 5.2], [-8.2, 8.5], [2.8, 8.6], [-3.4, 7.9]].forEach(function (c) { lv[0].add('roads/construction-cone', c[0], c[1], 0); });
  lv[0].add('roads/construction-barrier', -1.0, 6.8, Math.PI / 2);
  lv[0].add('roads/construction-barrier', 1.0, 6.8, Math.PI / 2);
  for (var l = 1; l <= 4; l++) {
    lv[l].slab(flat(ASPHALT), -11.2, 11.2, LOT[0], LOT[1], 0.008, 0.02);
    lv[l].slab(flat(PAVE), -1.4, 1.4, LOT[0], LOT[1], 0.012, 0.02);
  }
  var paint = flat(PAINT);
  var rowsZ = [[4.0, 5.6, -1], [8.0, 9.6, 1]];
  for (var side = -1; side <= 1; side += 2) {
    for (var i = 0; i < 8; i++) {
      var bx = side * (2 + i);
      for (var r = 0; r < 2; r++) {
        var rz = rowsZ[r];
        var unlock = i < 4 ? 1 + r : 3 + r;
        bays.push({ x: bx, z: (rz[0] + rz[1]) / 2, nose: rz[2], lv: unlock, car: null });
        for (var u = unlock; u <= 4; u++) {
          lv[u].slab(paint, bx - 0.53, bx - 0.47, rz[0] + 0.1, rz[1] - 0.1, 0.02, 0.008);
          lv[u].slab(paint, bx + 0.47, bx + 0.53, rz[0] + 0.1, rz[1] - 0.1, 0.02, 0.008);
        }
      }
    }
  }
  // zebra stripes where the walkway crosses the aisle
  for (var zl = 1; zl <= 4; zl++) for (var zs = -1.2; zs < 1.3; zs += 0.5) lv[zl].slab(paint, zs - 0.16, zs + 0.16, 6.1, 7.5, 0.024, 0.008);
  [[1, -5.7, 3.9], [1, 5.7, 3.9], [3, -9.9, 3.9], [3, 9.9, 3.9], [4, -5.7, 9.8], [4, 5.7, 9.8]].forEach(function (p) {
    for (var u = p[0]; u <= 4; u++) lamp(lv[u], 'roads/light-square', p[1], p[2], p[2] < 5 ? Math.PI : 0);
  });
  [4].forEach(function (u) {
    lv[u].add('sub/planter', -1.9, 4.35, 0);
    lv[u].add('sub/planter', 1.9, 4.35, 0);
    lv[u].add('sub/planter', -1.9, 9.25, 0);
    lv[u].add('sub/planter', 1.9, 9.25, 0);
  });
  var pl = finishPlace('lot', lv);
  pl.pick = addPick('lot', 0, (LOT[0] + LOT[1]) / 2, 22, LOT[1] - LOT[0]);
}

// the taxi stand on the sidewalk east of the walkway
function buildTaxi() {
  var lv = levels(4);
  for (var l = 1; l <= 4; l++) {
    lv[l].add('roads/road-sign-street', 7.1, 10.3, Math.PI);
    lv[l].slab(flat(0xf2c230), 4.4, 7.0, 10.55, 10.62, 0.02, 0.008);
    lv[l].slab(flat(0xf2c230), 4.4, 4.47, 10.55, 11.95, 0.02, 0.008);
    lv[l].slab(flat(0xf2c230), 6.93, 7.0, 10.55, 11.95, 0.02, 0.008);
  }
  for (var u = 2; u <= 4; u++) {
    lv[u].add('furn/bench', 5.2, 9.95, Math.PI);
    lv[u].add('furn/trashcan', 6.3, 9.95, 0);
  }
  for (var w = 3; w <= 4; w++) {
    lv[w].add('furn/bench', 4.1, 9.95, Math.PI);
    lamp(lv[w], 'roads/light-curved', 3.3, 9.85, Math.PI);
  }
  lv[4].add('sub/planter', 7.8, 9.95, 0);
  lv[4].add('nature/flower_purpleA', 7.6, 9.95, 0, 0.18);
  lv[4].add('nature/flower_yellowA', 8.0, 9.95, 0, 0.18);
  var pl = finishPlace('taxi', lv);
  pl.pick = addPick('taxi', 5.7, 10.4, 3.4, 1.6);
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

function syncPlace(id, animate, now) {
  var pl = places[id];
  var l = S.pl[id];
  if (l === pl.shown) return;
  pl.items.forEach(function (it) {
    var want = it.only ? l === it.lv : it.lv <= l && (id === 'hall' || it.lv === l);
    if (want && !it.g.visible && animate && pl.shown >= 0) {
      rise(it.g, now, 450);
      dustAt(it.g, now, id === 'hall' ? 8 : 20);
    } else it.g.visible = want;
  });
  pl.shown = l;
  shadowDirty = true;
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
      if (animate) dust(-EDGE, EDGE, r.z0, r.z1, now, 30);
    }
    if (!on) r.parts.forEach(function (g) { g.visible = false; });
    r.shown = on;
    r.cap.visible = on && r.p === nr - 1;
    r.site.visible = r.p === nr;
    r.woods.visible = r.p > nr;
  });
  order.forEach(function (id) {
    var s = shops[id];
    var open = rows[s.p].shown;
    s.group.visible = open;
    s.pick.visible = open;
    var own = has(id);
    var n = own ? Math.min(s.pieces.length, shape(id)) : 0;
    if (n !== s.shown) {
      s.pieces.forEach(function (pc, i) {
        var want = i < n;
        if (pc.k === 'glow' || pc.k === 'gold') return;
        if (!pc.g) return;
        if (want && !pc.g.visible && animate && s.shown >= 0) {
          rise(pc.g, now, 450);
          dustAt(pc.g, now);
        } else pc.g.visible = want;
      });
      var glow = n > STEPS.indexOf('glow');
      var gold = n > STEPS.indexOf('gold');
      if (s.signMat && (s.glow !== glow || s.gold !== gold)) {
        if (s.gold !== gold) s.signMat.map = signTex(BZ[id].name, gold);
        s.signMat.emissive.set(glow ? 0x333333 : 0x000000);
        s.signMat.emissiveMap = glow ? s.signMat.map : null;
        s.signMat.needsUpdate = true;
        s.glow = glow;
        s.gold = gold;
      }
      if (animate && s.shown >= 0 && n > s.shown) truckFor();
      s.shown = n;
      shadowDirty = true;
    }
    s.vacant.visible = !own;
    s.counter.visible = own;
    var m = own && managed(id);
    if (m !== s.clerk.obj.visible) {
      s.clerk.obj.visible = m;
      shadowDirty = true;
    }
  });
  PLACES.forEach(function (p) { syncPlace(p.id, animate, now); });
  places.lot.pick.visible = has(PL.lot.after);
  places.taxi.pick.visible = has(PL.taxi.after);
  var last = rowZ(nr) - DEPTH - 1;
  BOUNDS = [-12, 12, last, 15];
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
    var k = u >= 1 ? 1 : 1 + 0.08 * Math.sin(u * Math.PI) * (1 - u);
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

function inMall() {
  var n = 0;
  people.forEach(function (p) { if (p.path && p.shopper) n++; });
  return n;
}

function trafficStep(dt) {
  trafficT -= dt;
  carT -= dt;
  taxiT -= dt;
  var through = cars.filter(function (c) { return c.kind === 'pass'; }).length;
  if (trafficT <= 0 && through < 5) {
    var d = Math.random() < 0.5 ? 1 : -1;
    addCar(CARS[Math.floor(Math.random() * CARS.length)], road(d), 'pass', { lane: d });
    trafficT = 2 + Math.random() * 3;
  }
  var room = inMall() < wantPeople();
  if (carT <= 0 && S.pl.lot > 0 && room && !vanInDrive()) {
    var bay = freeBay();
    if (bay) {
      var p = [{ x: 62, z: LANE_W }, { x: DRIVE + 0.6, z: LANE_W, lane: -1 }, { x: DRIVE, z: 10.2 }, { x: DRIVE, z: AISLE + 0.4 }, { x: DRIVE - 0.6, z: AISLE },
        { x: bay.x + 0.6, z: AISLE }, { x: bay.x, z: AISLE + bay.nose * 0.6 }, { x: bay.x, z: bay.z, park: true }];
      bay.car = addCar(CARS[Math.floor(Math.random() * CARS.length)], p, 'shop', { bay: bay, lane: -1 });
    }
    carT = 9 / S.pl.lot + Math.random() * 3;
  }
  if (taxiT <= 0 && S.pl.taxi > 0 && cars.filter(function (c) { return c.kind === 'taxi'; }).length < 2) {
    addCar('car/taxi', [{ x: 62, z: LANE_W }, { x: 5.7, z: LANE_W, stop: room ? 2.2 : 1.2, drop: room ? (Math.random() < 0.4 ? 2 : 1) : 0, lane: -1 }, { x: -62, z: LANE_W, lane: -1 }],
      'taxi', { lane: -1 });
    taxiT = 22 / S.pl.taxi + Math.random() * 6;
  }
  if (truckQ > 0 && !cars.some(function (c) { return c.kind === 'truck'; })) {
    truckQ--;
    addCar('car/delivery', [{ x: 62, z: LANE_W }, { x: DRIVE + 0.6, z: LANE_W, lane: -1 }, { x: DRIVE, z: 10.2 }, { x: DRIVE, z: 0.5, stop: 5, unload: true },
      { x: DRIVE, z: AISLE, rev: true }, { x: DRIVE - 0.8, z: AISLE }, { x: -DRIVE, z: AISLE }, { x: -DRIVE, z: 10.2 }, { x: -DRIVE - 0.6, z: LANE_W, lane: -1 },
      { x: -62, z: LANE_W, lane: -1 }], 'truck', { lane: 0 });
  }
  for (var i = cars.length - 1; i >= 0; i--) {
    var c = cars[i];
    if (carStep(c, dt)) {
      root.remove(c.o);
      cars.splice(i, 1);
    }
  }
}

function vanInDrive() {
  return cars.some(function (c) { return c.kind === 'truck' && c.i >= 3 && c.i <= 4; });
}

function blocked(c) {
  if (c.kind === 'shop' && c.i === 2 && vanInDrive()) return true;
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
  if (Math.abs(o.z - AISLE) < 0.8 && Math.abs(o.x) < 3.4 && o.x * fx < 0) {
    for (var k = 0; k < people.length; k++) {
      var pp = people[k].f.obj.position;
      if (people[k].path && Math.abs(pp.x) < 1.5 && Math.abs(pp.z - AISLE) < 0.8) return true;
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
      spawnFrom('car', c);
      return false;
    }
    if (q.stop) {
      c.wait = q.stop;
      c.speed = 0;
      if (q.drop) for (var n = 0; n < q.drop; n++) spawnFrom('taxi', c, n);
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

// Shoppers come by car, by taxi or on foot, walk in through the doors, look at one of a shop's stands, pay at the
// counter and go back the way they came. Each open shop draws a few, more as it levels
function wantPeople() {
  var n = 0;
  order.forEach(function (id) { if (has(id)) n += Math.min(4, 1 + Math.floor(lv(id) / 15)); });
  return Math.min(26, n + S.pl.hall * 2);
}

var walkT = 1;
var passT = 0;

// a coin that jumps off the counter when a shopper pays
var pops = [];
var coinGeo = new THREE.CylinderGeometry(0.08, 0.08, 0.03, 14);
var coinMat = new THREE.MeshLambertMaterial({ color: 0xffd23a, emissive: 0x6a4a00 });
var tillAt = 0;

function paid(s, now) {
  var c = s.stack.position;
  var m = new THREE.Mesh(coinGeo, coinMat);
  m.rotation.x = Math.PI / 2;
  m.position.set(c.x, c.y + 0.1, c.z);
  root.add(m);
  pops.push({ m: m, t0: now, y: c.y + 0.1 });
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

function person(i) {
  var f = figure(FOLK[i % FOLK.length], 'walk');
  var bag = mesh('food/bag', -0.24, 0.02, 0.3, 0.03);
  bag.traverse(function (o) { o.castShadow = false; });
  bag.visible = false;
  f.obj.add(bag);
  var blob = new THREE.Mesh(blobGeo, blobMat);
  blob.rotation.x = -Math.PI / 2;
  blob.position.y = 0.035;
  f.obj.add(blob);
  f.obj.traverse(function (o) { if (o.isMesh && o !== blob) o.castShadow = false; });
  f.obj.visible = false;
  root.add(f.obj);
  return { f: f, bag: bag, path: null, i: 0, wait: 0, speed: 1.05 + (i % 5) * 0.08 };
}

function idlePerson() {
  for (var i = 0; i < people.length; i++) if (!people[i].path) return people[i];
  if (people.length >= 40) return null;
  var p = person(people.length * 7 + 3);
  people.push(p);
  return p;
}

function pickShop() {
  var open = order.filter(function (id) { return has(id) && shops[id].shown > 0 && rows[shops[id].p].shown; });
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

// the walk from the doors to a stand, the counter and back to the doors
function shopRoute(s, pts) {
  var shown = s.items.filter(function (it) { return it.g.visible; });
  var it = shown[Math.floor(Math.random() * shown.length)];
  var lane = s.sg > 0 ? -0.55 : 0.55;
  var jx = (Math.random() - 0.5) * 0.5;
  function at(lx, lz, wait, a, face) {
    var w = toWorld(s, lx, lz);
    pts.push({ x: w[0], z: w[1], wait: wait || 0, act: a, face: face });
  }
  pts.push({ x: jx, z: FRONT + 0.3 });
  pts.push({ x: lane + jx * 0.3, z: BACK - 0.3 });
  pts.push({ x: lane + jx * 0.3, z: s.cz - jx * 0.6 });
  at(3.3, 0);
  var a = it.at[1] < 0 ? -0.95 : 0.95;
  at(1.35, a);
  at(it.at[0], a);
  var look = faceRot(s, it.f) + Math.PI;
  at(it.at[0], it.at[1], s.cfg.play ? 3.5 : 1.6, s.cfg.play ? 'idle' : 'pick-up', look);
  at(it.at[0], 0.95);
  at(COUNTER[0] + 0.75, 0.95);
  at(COUNTER[0] + 0.75, COUNTER[1], 1.2, 'idle', faceRot(s, 'k'));
  pts[pts.length - 1].pay = s;
  at(3.3, 0.9);
  pts.push({ x: -lane + jx * 0.3, z: s.cz + 0.5 });
  pts.push({ x: -lane * 0.6, z: BACK - 0.3 });
  pts.push({ x: -jx, z: FRONT + 0.3 });
  return pts;
}

function walkway(x) {
  return [{ x: x, z: LOT[0] - 0.2 }];
}

function start(p, pts, extra) {
  p.path = pts;
  p.i = 1;
  p.wait = 0;
  p.shopper = true;
  p.car = null;
  for (var k in extra) p[k] = extra[k];
  p.f.obj.position.set(pts[0].x, 0, pts[0].z);
  p.f.obj.visible = true;
  p.bag.visible = false;
  act(p.f, 'walk', 0);
}

function spawnFrom(kind, c, n) {
  var s = pickShop();
  var p = s && idlePerson();
  if (!p) {
    if (kind === 'car') leaveBay(c);
    return;
  }
  var pts = [];
  var back = [];
  if (kind === 'car') {
    var b = c.bay;
    var ex = b.x + 0.5;
    pts.push({ x: ex, z: b.z }, { x: ex, z: AISLE }, { x: Math.sign(b.x) * 1.0, z: AISLE }, { x: Math.sign(b.x) * 0.7, z: LOT[0] - 0.2 });
    back = [{ x: Math.sign(b.x) * 0.7, z: LOT[0] - 0.2 }, { x: Math.sign(b.x) * 1.0, z: AISLE }, { x: ex, z: AISLE }, { x: ex, z: b.z }];
  } else if (kind === 'taxi') {
    var tx = 5.4 + n * 0.5;
    pts.push({ x: tx, z: 10.9 }, { x: tx, z: WALK_N }, { x: 0.9, z: WALK_N }, { x: 0.7, z: LOT[0] - 0.2 });
    back = [{ x: 0.7, z: LOT[0] - 0.2 }, { x: 0.9, z: WALK_N }, { x: 30 + Math.random() * 30, z: WALK_N }];
  } else {
    var sd = Math.random() < 0.5 ? -1 : 1;
    var south = Math.random() < 0.4;
    var wz = south ? WALK_S : WALK_N;
    pts.push({ x: sd * 60, z: wz }, { x: sd * 0.6, z: wz });
    if (south) pts.push({ x: sd * 0.6, z: WALK_N });
    pts.push({ x: sd * 0.6, z: LOT[0] - 0.2 });
    back = [{ x: -sd * 0.6, z: LOT[0] - 0.2 }, { x: -sd * 0.6, z: WALK_N }];
    if (south) back.push({ x: -sd * 0.6, z: WALK_S });
    back.push({ x: -sd * 60, z: wz });
  }
  shopRoute(s, pts);
  pts = pts.concat(back);
  start(p, pts, { car: kind === 'car' ? c : null });
}

function crowdStep(dt) {
  walkT -= dt;
  passT -= dt;
  if (walkT <= 0) {
    if (inMall() < wantPeople()) spawnFrom('walk');
    walkT = 5 + Math.random() * 4;
  }
  if (passT <= 0) {
    var p = idlePerson();
    if (p) {
      var sd = Math.random() < 0.5 ? -1 : 1;
      var wz = Math.random() < 0.5 ? WALK_N : WALK_S;
      start(p, [{ x: sd * 60, z: wz + (Math.random() - 0.5) * 0.3 }, { x: -sd * 60, z: wz }], { shopper: false });
    }
    passT = 3 + Math.random() * 3;
  }
  people.forEach(function (p) {
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
    if (d <= step) {
      o.position.x = q.x;
      o.position.z = q.z;
      if (q.wait) {
        p.wait = q.wait;
        if (q.face !== undefined) o.rotation.y = q.face;
        act(p.f, q.act || 'idle', 0.2);
      }
      if (q.pay) {
        p.bag.visible = !q.pay.cfg.play;
        paid(q.pay, performance.now());
      }
      p.i++;
      if (p.i >= p.path.length) {
        p.path = null;
        o.visible = false;
        if (p.car) leaveBay(p.car);
      }
      return;
    }
    o.position.x += dx / d * step;
    o.position.z += dz / d * step;
  });
}

// the second clerk walks the shop, stopping at a stand now and then to fill it
function helperStep(s, dt) {
  var h = s.helper;
  if (!h || !h.f.obj.parent.visible || !s.group.visible) return;
  if (h.f.mixer) h.f.mixer.update(dt);
  var o = h.f.obj;
  if (!h.path) {
    var shown = s.items.filter(function (it) { return it.g.visible; });
    var it = shown[Math.floor(Math.random() * shown.length)];
    var a = it.at[1] < 0 ? -0.95 : 0.95;
    var pts = [[1.0, a], [it.at[0], a], [it.at[0], it.at[1]]].map(function (q) { var w = toWorld(s, q[0], q[1]); return { x: w[0], z: w[1] }; });
    pts[2].wait = 2.5;
    pts[2].face = faceRot(s, it.f) + Math.PI;
    var hm = toWorld(s, 1.0, a);
    if (h.i === 0) o.position.set(hm[0], 0, hm[1]);
    h.path = pts;
    h.i = 0;
    act(h.f, 'walk', 0.2);
  }
  if (h.wait > 0) {
    h.wait -= dt;
    if (h.wait <= 0) {
      h.path = null;
      h.i = 1;
    }
    return;
  }
  var q = h.path[h.i];
  var dx = q.x - o.position.x;
  var dz = q.z - o.position.z;
  var d = Math.hypot(dx, dz);
  var step = 0.9 * dt;
  if (d > 0.001) o.rotation.y = Math.atan2(dx, dz);
  if (d <= step) {
    o.position.x = q.x;
    o.position.z = q.z;
    h.i++;
    if (q.wait) {
      h.wait = q.wait;
      o.rotation.y = q.face;
      act(h.f, 'pick-up', 0.2);
    }
    if (h.i >= h.path.length && !q.wait) h.path = null;
    return;
  }
  o.position.x += dx / d * step;
  o.position.z += dz / d * step;
}

function resetCrowd() {
  people.forEach(function (p) {
    p.path = null;
    p.f.obj.visible = false;
  });
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
  tagIds().forEach(function (id) {
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
  if (p) return { name: p.name, lv: S.pl[id], own: S.pl[id] > 0, price: placeCost(id), avail: has(p.after), frac: 0, wait: 0 };
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
  if (id === 'lot') return [-6, 0.8, (LOT[0] + LOT[1]) / 2];
  if (id === 'taxi') return [5.7, 1.2, 10.2];
  var s = shops[id];
  var c = toWorld(s, -0.3, 0);
  return [c[0], 0.9, c[1]];
}

function overlay(now) {
  tagIds().forEach(function (id) {
    var s = shops[id] || places[id];
    var t = s.tag;
    var st = bstate(id);
    var a = anchor(id);
    toScreen(a[0], a[1], a[2], sp);
    var open = PL[id] ? st.own || st.avail : rows[s.p].shown;
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
      var sc = Math.max(0.72, Math.min(1.1, 30 / focus.dist + 0.15));
      var tx = Math.round(sp.x);
      var ty = Math.round(sp.y);
      if (tx !== t.x || ty !== t.y || sc !== t.sc) {
        t.x = tx;
        t.y = ty;
        t.sc = sc;
        t.el.style.transform = 'translate(' + tx + 'px,' + ty + 'px) translate(-50%,-100%) scale(' + sc + ')';
      }
    }
    if (PL[id]) return;
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
  [['turn-l', -1], ['turn-r', 1]].forEach(function (b) {
    document.getElementById(b[0]).addEventListener('click', function () {
      azGoal = (azGoal === null ? Math.round(focus.az / (Math.PI / 4)) * Math.PI / 4 : azGoal) + b[1] * Math.PI / 4;
    });
  });
  var bar = document.getElementById('load-bar');
  lib = loadModels(modelList(), function (p) { if (bar) bar.style.width = Math.round(p * 100) + '%'; }, function () {
    setTimeout(function () {
      try {
        build();
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

function build() {
  buildOutside();
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
  dayStep(dt);
  trafficStep(dt);
  crowdStep(dt);
  doorsStep(dt);
  popsStep(now);
  var near = focus.dist < 50;
  order.forEach(function (id) {
    var s = shops[id];
    if (near && s.clerk.obj.visible && s.clerk.mixer && s.group.visible) s.clerk.mixer.update(dt);
    if (near) helperStep(s, dt);
  });
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
  if (id === 'lot') return { x: 0, y: (LOT[0] + LOT[1]) / 2 };
  if (id === 'taxi') return { x: 4, y: 10 };
  return { x: 0, y: (FRONT + BACK) / 2 };
}

function go(x, z) {
  flyTo(x, z, Math.min(focus.dist, fit(11)));
}

// the whole width of the mall, from the street to the newest row
function home() {
  var nr = shownRows();
  return { z: (12 + rowZ(nr)) / 2, d: Math.max(fit(EDGE * 2 + 2), Math.min(DMAX, 8 + (12 - rowZ(nr)) * 1.05)) };
}

function focusNow() {
  goal = null;
  azGoal = null;
  var h = home();
  focus.x = 0;
  focus.z = h.z;
  focus.dist = h.d;
  focus.az = VIEW_AZ;
  clamp();
  place();
}

function event(res, now) {
  if (shops[res.id]) bump[res.id] = now;
  sync(true, now);
  var big = res.unlock || res.place || (res.ms && res.ms.length);
  var p = spot(res.id);
  var out = 0.25;
  if (big) out = flyTo(res.place ? p.x : 0, p.y, Math.min(focus.dist, fit(EDGE * 2 + 2))) + 0.1;
  return out;
}

function refresh() {
  rows.forEach(function (r) { r.shown = false; });
  order.forEach(function (id) { shops[id].shown = -1; });
  PLACES.forEach(function (p) { places[p.id].shown = -1; });
  sync(false, 0);
  resetCrowd();
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
