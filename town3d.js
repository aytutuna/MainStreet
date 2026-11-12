import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { planTown, modelList, FOLK } from './plan.js';
import { GROW } from './city.js';
import { SchoolInside, FURN, figure } from './school3d.js';
import { Life } from './life.js';

var BASE = 'assets/models/';
var TILT = 52 * Math.PI / 180;

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
var town;
var life;
var bizList = [];
var bestId = null;
var focus = { x: 0, z: 8, dist: 12, az: 0 };
var goal = null;
var azGoal = null;
var DMIN = 7;
var DMAX = 125;
var BOUNDS = [-25, 25, -4, 25];
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
var townG;
var inside;
var mode = 'town';
var tagged = [];
var puffs = [];
var bg = new THREE.Color(0xa9d8ee);
var built = [];
var loose = [];
var growing = false;

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
  var tex = {};
  var models = {};
  var n = 0;
  function material(src, kit) {
    var key = kit + '|' + (src.map ? 'map' : src.name + src.color.getHex());
    if (mats[key]) return mats[key];
    var m;
    if (src.map) {
      if (!tex[kit]) {
        tex[kit] = src.map;
        src.map.magFilter = THREE.NearestFilter;
        src.map.minFilter = THREE.NearestFilter;
        src.map.generateMipmaps = false;
        src.map.colorSpace = THREE.SRGBColorSpace;
      }
      m = new THREE.MeshLambertMaterial({ map: tex[kit] });
    } else m = new THREE.MeshLambertMaterial({ color: src.color });
    mats[key] = m;
    return m;
  }
  var missing = { parts: [], box: { x0: -0.3, x1: 0.3, z0: -0.3, z1: 0.3, h: 0.3 }, gltf: null };
  list.forEach(function (ref) {
    var kit = ref.split('/')[0];
    loader.load(BASE + ref + '.glb', function (g) {
      var parts = [];
      var box = new THREE.Box3();
      g.scene.updateMatrixWorld(true);
      g.scene.traverse(function (o) {
        if (!o.isMesh) return;
        var geom = o.geometry.clone();
        if (!o.isSkinnedMesh) geom.applyMatrix4(o.matrixWorld);
        ['color', 'tangent', 'uv1', 'uv2'].forEach(function (a) { if (geom.attributes[a]) geom.deleteAttribute(a); });
        parts.push({ geom: geom, mat: material(o.material, kit) });
      });
      if (kit !== 'chars') box.setFromObject(g.scene);
      else box.set(new THREE.Vector3(-0.3, 0, -0.3), new THREE.Vector3(0.3, 0.8, 0.3));
      models[ref] = { parts: parts, box: { x0: box.min.x, x1: box.max.x, z0: box.min.z, z1: box.max.z, h: box.max.y }, gltf: kit === 'chars' ? g : null };
      progress(++n / list.length);
      if (n === list.length) done();
    }, undefined, function () {
      console.warn('missing model', ref);
      progress(++n / list.length);
      if (n === list.length) done();
    });
  });
  return {
    model: function (ref) {
      return models[ref] || missing;
    }
  };
}

function sceneUp() {
  var dpr = window.devicePixelRatio || 1;
  renderer = new THREE.WebGLRenderer({ canvas: cv, antialias: dpr < 2, powerPreference: 'high-performance' });
  cv.addEventListener('webglcontextrestored', function () { renderer.shadowMap.needsUpdate = true; });
  renderer.setPixelRatio(Math.min(2, dpr));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.shadowMap.autoUpdate = false;
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0xa9d8ee);
  scene.fog = new THREE.Fog(0xa9d8ee, 115, 270);
  cam = new THREE.PerspectiveCamera(32, 1, 1, 400);
  scene.add(new THREE.HemisphereLight(0xffffff, 0xb4bedc, 2.5));
  sun = new THREE.DirectionalLight(0xfff3dc, 2.1);
  sun.position.set(-18, 34, -6);
  sun.target.position.set(0, 0, 9);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  var sc = sun.shadow.camera;
  sc.left = -34;
  sc.right = 34;
  sc.top = 24;
  sc.bottom = -24;
  sc.near = 5;
  sc.far = 90;
  sun.shadow.bias = -0.0008;
  sun.shadow.normalBias = 0.02;
  scene.add(sun);
  scene.add(sun.target);
  townG = new THREE.Group();
  scene.add(townG);
}

function ground() {
  var g = new THREE.Mesh(new THREE.PlaneGeometry(400, 400), new THREE.MeshLambertMaterial({ color: 0x84c26c }));
  g.rotation.x = -Math.PI / 2;
  g.receiveShadow = true;
  townG.add(g);
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

var far = false;

function place() {
  var cx = Math.cos(TILT);
  cam.position.set(focus.x + focus.dist * Math.sin(focus.az) * cx, focus.dist * Math.sin(TILT), focus.z + focus.dist * Math.cos(focus.az) * cx);
  var nf = mode === 'town' && focus.dist > 34;
  if (nf !== far && town) {
    far = nf;
    town.lods.near.forEach(function (m) { m.visible = !far; });
    town.lods.far.forEach(function (m) { m.visible = far; });
    if (life) life.far(far);
  }
  cam.near = Math.max(1, focus.dist * 0.3);
  cam.far = focus.dist * 6 + 120;
  cam.updateProjectionMatrix();
  cam.lookAt(focus.x, 0, focus.z);
  cam.updateMatrixWorld(true);
}

function clamp() {
  focus.dist = Math.max(DMIN, Math.min(DMAX, focus.dist));
  focus.x = Math.max(BOUNDS[0], Math.min(BOUNDS[1], focus.x));
  focus.z = Math.max(BOUNDS[2], Math.min(BOUNDS[3], focus.z));
}

// the ground point under a screen position
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

function flyTo(x, z, dist, secs) {
  var d = Math.hypot(x - focus.x, z - focus.z);
  goal = { x0: focus.x, z0: focus.z, k0: focus.dist, x: x, z: z, k: dist === undefined ? focus.dist : dist, t: 0, d: secs || Math.min(1.4, 0.45 + d / 40) };
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
  var h = ray.intersectObjects(mode === 'town' ? picks : inside.picks, false);
  if (h.length) return { kind: 'biz', id: h[0].object.userData.id };
  return { kind: 'none' };
}

// the park counts its own levels; every other business changes at each milestone of STAGE
function stageOf(id) {
  if (id === 'park') return S.park;
  var l = lv(id);
  var n = 0;
  STAGE.forEach(function (t) { if (l >= t) n++; });
  return n;
}

// builds every business once: its models for each stage, its building site, its pick box
function makeBiz() {
  var ids = Object.keys(town.biz);
  ids.forEach(function (id) {
    var b = town.biz[id];
    b.group = new THREE.Group();
    b.models = b.build();
    b.models.forEach(function (g) {
      g.visible = false;
      b.group.add(g);
    });
    var f = b.foot;
    var pick = new THREE.Mesh(new THREE.BoxGeometry(f.x1 - f.x0, b.h, f.z1 - f.z0), new THREE.MeshBasicMaterial({ visible: false }));
    pick.position.set((f.x0 + f.x1) / 2, b.h / 2, (f.z0 + f.z1) / 2);
    pick.userData.id = id;
    b.group.add(pick);
    picks.push(pick);
    townG.add(b.group);
    b.shown = -1;
    bizList.push(id);
    tagged.push(id);
    if (id !== 'park') extras(id, b);
  });
}

// the manager at the door and the coin stack waiting on the step
function extras(id, b) {
  var r = b.rec;
  var tx = r.dir[1];
  var tz = -r.dir[0];
  var f = figure(lib, FOLK[(bizList.length * 5 + 2) % FOLK.length], 'idle', 0.3);
  f.obj.position.set(b.at[0] + tx * 0.32, 0.02, b.at[2] + tz * 0.32);
  f.obj.rotation.y = Math.atan2(r.dir[0], r.dir[1]);
  f.obj.visible = false;
  b.group.add(f.obj);
  b.mgr = f;
  var st = new THREE.Group();
  for (var i = 0; i < 3; i++) {
    var c = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.035, 14), new THREE.MeshLambertMaterial({ color: 0xffd23a, emissive: 0x6a4a00 }));
    c.position.set(i === 1 ? 0.03 : 0, 0.02 + i * 0.037, i === 1 ? 0.02 : 0);
    st.add(c);
  }
  st.position.set(b.at[0] - tx * 0.32, 0.02, b.at[2] - tz * 0.32);
  st.visible = false;
  b.group.add(st);
  b.stack = st;
}

var puffMat = new THREE.MeshBasicMaterial({ color: 0xf2efe8, transparent: true, opacity: 0.8, depthWrite: false });

// dust at the foot of a building that changes
function dust(b, now) {
  var f = b.foot;
  for (var i = 0; i < 12; i++) {
    var m = new THREE.Mesh(new THREE.SphereGeometry(0.1, 6, 5), puffMat.clone());
    var side = i % 4;
    var u = Math.random();
    var x = side < 2 ? f.x0 + (f.x1 - f.x0) * u : (side === 2 ? f.x0 : f.x1);
    var z = side < 2 ? (side === 0 ? f.z0 : f.z1) : f.z0 + (f.z1 - f.z0) * u;
    m.position.set(x, 0.08, z);
    townG.add(m);
    puffs.push({ m: m, t0: now + Math.random() * 120, vx: (x - (f.x0 + f.x1) / 2) * 0.25, vz: (z - (f.z0 + f.z1) / 2) * 0.25 });
  }
}

function puffsStep(now) {
  for (var i = puffs.length - 1; i >= 0; i--) {
    var p = puffs[i];
    var u = (now - p.t0) / 900;
    if (u < 0) continue;
    if (u >= 1) {
      townG.remove(p.m);
      p.m.geometry.dispose();
      p.m.material.dispose();
      puffs.splice(i, 1);
      continue;
    }
    p.m.position.x += p.vx * 0.016;
    p.m.position.z += p.vz * 0.016;
    p.m.position.y = 0.08 + u * 0.35;
    p.m.scale.setScalar(0.6 + u * 1.8);
    p.m.material.opacity = 0.8 * (1 - u);
  }
}

// how many of its lots a business has built: the first with the business, the rest spread over its levels until level
// `REACH` (100 unless named). The Park builds a quarter of its lots with each of its four levels
var REACH = { homes: 150 };
function wanted(o) {
  var own = town.owners[o];
  if (!own.count) return 0;
  if (own.id === 'park') return Math.round(own.count * S.park / 4);
  var l = lv(own.id);
  if (own.id === 'school') l += (lv('class') + lv('lib') + lv('cafeteria') + lv('yard')) / 4;
  if (l <= 0) return 0;
  var f = Math.pow(Math.min(1, (l - 1) / (REACH[own.id] || 100)), 0.7);
  return Math.min(own.count, 1 + Math.round((own.count - 1) * f) + (managed(own.id) ? 1 : 0));
}

function makeGrowth() {
  town.owners.forEach(function () { built.push(0); });
  town.root.children.forEach(function (o) {
    if (o.userData.grow) return;
    var bb = new THREE.Box3().setFromObject(o);
    var x = (bb.min.x + bb.max.x) / 2;
    var z = (bb.min.z + bb.max.z) / 2;
    loose.push({ o: o, key: town.keyAt(x, z, 'thing') });
  });
}

// the same test the town's shader makes, for what is not merged: cars, people, signs
function risen(key) {
  var k = 0;
  for (var i = 0; i < key.length; i += 2) {
    if (key[i] < -1) return 1;
    if (key[i] >= 0) k = Math.max(k, Math.min(1, Math.max(0, built[key[i]] - key[i + 1])));
  }
  return k;
}

// lots go up one after another, quicker when many are due, each with a puff of dust
function grow(dt, snap) {
  var moving = false;
  var sum = 0;
  var now = performance.now();
  built.forEach(function (v, o) {
    var want = wanted(o);
    var was = v;
    if (snap || want < v) v = want;
    else if (want > v) {
      v = Math.min(want, v + dt * Math.max(2.5, (want - v) * 1.5));
      moving = true;
    }
    built[o] = v;
    GROW.own.value[o] = v;
    sum += v;
    if (!snap && v > was) {
      town.lots.forEach(function (l) {
        if (l.o === o && l.n >= was && l.n < v) dust({ foot: l.f }, now);
      });
    }
  });
  if (growing && !moving || snap) renderer.shadowMap.needsUpdate = true;
  growing = moving;
  loose.forEach(function (q) { q.o.visible = risen(q.key) > 0.5; });
  life.vis(onRoad, Math.round(2 + sum / 3));
}

function onRoad(x, z) {
  return risen(town.keyAt(x, z, 'road')) > 0.5;
}

function setMode(m) {
  mode = m;
  townG.visible = m === 'town';
  inside.root.visible = m === 'school';
  scene.background = m === 'town' ? bg : new THREE.Color(0x3a3d4f);
  scene.fog = m === 'town' ? new THREE.Fog(0xa9d8ee, 115, 270) : null;
  BOUNDS = m === 'town' ? [-25, 25, -4, 25] : [1.8, 3.4, 3, 9.5];
  DMIN = m === 'town' ? 7 : 8;
  DMAX = m === 'town' ? 125 : 30;
  renderer.shadowMap.needsUpdate = true;
  goal = null;
}

function sync(animate, now) {
  var changed = false;
  bizList.forEach(function (id) {
    var b = town.biz[id];
    var st = stageOf(id);
    if (st === b.shown) return;
    var pk = b.pick(st);
    b.models.forEach(function (g, i) { g.visible = b.cum ? (i === 0 ? pk === 0 : i <= pk) : i === pk; });
    b.group.visible = id === 'park' ? S.park > 0 || has(PARK.after) : avail(id);
    if (animate && b.shown >= 0) {
      bump[id] = now;
      dust(b, now);
    }
    b.shown = st;
    changed = true;
  });
  bizList.forEach(function (id) {
    var b = town.biz[id];
    if (b.mgr) {
      var on = managed(id);
      if (on !== b.mgr.obj.visible) changed = true;
      if (on && !b.mgr.obj.visible && animate) bump[id] = now;
      b.mgr.obj.visible = on;
    }
  });
  if (inside.sync(animate)) changed = true;
  if (changed) renderer.shadowMap.needsUpdate = true;
}

function pop(now) {
  for (var id in bump) {
    var u = (now - bump[id]) / 650;
    var b = town.biz[id];
    if (u >= 1) {
      b.group.scale.set(1, 1, 1);
      b.group.position.set(0, 0, 0);
      delete bump[id];
      renderer.shadowMap.needsUpdate = true;
      continue;
    }
    var s = 1 + 0.12 * Math.sin(u * Math.PI) * (1 - u);
    var f = b.foot;
    b.group.scale.set(s, s, s);
    b.group.position.set((f.x0 + f.x1) / 2 * (1 - s), 0, (f.z0 + f.z1) / 2 * (1 - s));
  }
}

function bz(id) {
  return town.biz[id] || inside.biz[id];
}

function makeTags() {
  tagsEl = document.getElementById('tags');
  Object.keys(inside.biz).forEach(function (id) { tagged.push(id); });
  tagged.forEach(function (id) {
    var b = bz(id);
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
    b.tag = { el: el, coin: coin, text: '', wait: -1, x: 0, y: 0, line: el.firstChild, bar: el.querySelector('u'), cls: '', own: null };
  });
  arrowEl = document.createElement('div');
  arrowEl.id = 'arrow';
  arrowEl.innerHTML = '<svg viewBox="0 0 24 30"><path d="M12 29 L2 14 H8 V2 H16 V14 H22 Z"/></svg>';
  arrowEl.hidden = true;
  tagsEl.appendChild(arrowEl);
}

function bstate(id) {
  if (id === 'park') return { name: 'Park', lv: S.park, own: S.park > 0, price: parkCost(), avail: has(PARK.after), frac: 0, wait: 0 };
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

function overlay(now) {
  var near = focus.dist < 24 || mode === 'school';
  tagged.forEach(function (id) {
    var b = bz(id);
    var t = b.tag;
    var here = b.inside ? mode === 'school' : mode === 'town';
    var st = bstate(id);
    var a = b.top();
    toScreen(a[0], a[1], a[2], sp);
    var vis = here && sp.z < 1 && sp.x > -60 && sp.x < cw + 60 && sp.y > IT + 34 && sp.y < ch - IB + 30;
    if (here && sp.z < 1) anchorXY[id] = { x: sp.x, y: sp.y };
    else if (!b.inside || mode === 'school') delete anchorXY[id];
    var locked = !st.own;
    var show = vis && (b.inside || b.group.visible) && (near || (focus.dist < 48 && (st.own || locked && st.avail)));
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
      var sc = Math.max(0.78, Math.min(1.1, 20 / focus.dist + 0.2));
      var tx = Math.round(sp.x);
      var ty = Math.round(sp.y);
      if (tx !== t.x || ty !== t.y || sc !== t.sc) {
        t.x = tx;
        t.y = ty;
        t.sc = sc;
        t.el.style.transform = 'translate(' + tx + 'px,' + ty + 'px) translate(-50%,-100%) scale(' + sc + ')';
      }
    }
    if (b.stack) {
      b.stack.visible = st.wait > 0;
      b.stack.position.y = 0.02 + Math.abs(Math.sin(now / 300)) * 0.03;
    }
    // the coin waits at the door, so it never covers the rooftop props or the label
    var door = b.at;
    toScreen(door[0], b.inside ? 0.25 : 0.12, door[2], sp);
    var coin = st.wait > 0 && here && sp.z < 1 && sp.y > IT + 20 && sp.y < ch - IB + 30;
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
  // in the town the school rooms are pointed at through the School building
  if (mode === 'town' && anchorXY.school) {
    ['class', 'lib', 'cafeteria', 'yard'].forEach(function (id) { anchorXY[id] = anchorXY.school; });
  }
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
    fail('This device cannot start the 3D town (WebGL is not available).');
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
  var list = modelList().concat(FURN);
  lib = loadModels(list, function (p) { if (bar) bar.style.width = Math.round(p * 100) + '%'; }, function () {
    setTimeout(function () {
      try {
        start();
      } catch (e) {
        console.error(e);
        fail('The town could not be built. Please reload.');
      }
    }, 30);
  });
}

function fail(msg) {
  loadingEl.firstChild.innerHTML = '<b>Main Street</b><p>' + msg + '</p>';
}

function start() {
  town = planTown(lib);
  townG.add(town.root);
  inside = new SchoolInside(lib, FOLK);
  scene.add(inside.root);
  makeBiz();
  makeTags();
  life = new Life(townG, lib, town);
  makeGrowth();
  grow(0, true);
  sync(false, 0);
  focusNow();
  place();
  renderer.shadowMap.needsUpdate = true;
  ready = true;
  loadingEl.classList.add('done');
}

var lastT = 0;

function draw(now) {
  if (!ready) return;
  var dt = Math.min(0.1, (now - lastT) / 1000);
  lastT = now;
  stepCam(dt);
  if (goal) {
    clamp();
    place();
  }
  if (mode === 'town') {
    grow(dt, false);
    life.update(dt);
    if (focus.dist < 40) {
      bizList.forEach(function (id) {
        var m = town.biz[id].mgr;
        if (m && m.obj.visible) m.mixer.update(dt);
      });
    }
  } else if (inside.update(dt)) renderer.shadowMap.needsUpdate = true;
  puffsStep(now);
  pop(now);
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
  var p = town.biz[id];
  if (p) return { v: 'town', x: p.at[0], y: p.at[2] };
  var r = inside.biz[id];
  if (r) return { v: 'school', x: r.at[0], y: r.at[2] };
  return { v: 'town', x: 0, y: 8 };
}

function go(v, z, x) {
  if (v === 'school') {
    setMode('school');
    focus.x = 2.6;
    focus.z = 6.2;
    focus.dist = 27;
    focus.az = 0;
    azGoal = null;
    clamp();
    place();
    return;
  }
  if (mode !== 'town') {
    setMode('town');
    focus.x = x;
    focus.z = z;
    focus.dist = 17;
    clamp();
    place();
    return;
  }
  flyTo(x, z, 15);
}

function focusNow(id) {
  goal = null;
  var b = best();
  var sp2 = spot(id || (b ? b.id : 'homes'));
  var want = sp2.v;
  if (want !== mode) setMode(want);
  focus.x = sp2.x;
  focus.z = sp2.y;
  focus.dist = want === 'school' ? 27 : 17;
  focus.az = 0;
  clamp();
  place();
}

function event(res, now) {
  if (town.biz[res.id]) bump[res.id] = now;
  sync(true, now);
  var big = res.unlock || res.park || (res.ms && res.ms.length);
  var sp2 = spot(res.id);
  var out = 0.25;
  if (big && sp2.v === mode) out = flyTo(sp2.x, sp2.y, Math.min(focus.dist, 17)) + 0.1;
  return out;
}

function refresh() {
  sync(false, 0);
  grow(0, true);
  life.reset();
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
  roomY: function (room) { return inside.roomZ(room); },
  view: function () { return mode; },
  focusNow: focusNow,
  screenOf: function (id) {
    var a = anchorXY[id];
    return a ? { x: a.x, y: a.y } : null;
  },
  spot: spot,
  setBest: function (id) { bestId = id; }
};
