import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { planTown, modelList } from './plan.js';
import { Life } from './life.js';

var BASE = 'assets/models/';
var TILT = 52 * Math.PI / 180;
var STAGES = [0, 0, 1, 1, 2, 2];

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

// ---- loading

function loadModels(list, progress, done) {
  var loader = new GLTFLoader();
  var mats = {};
  var tex = {};
  var models = {};
  var used = {};
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
      models[ref] = { parts: parts, box: { x0: box.min.x, x1: box.max.x, z0: box.min.z, z1: box.max.z, h: box.max.y }, gltf: g, kit: kit };
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
      used[ref] = 1;
      if (!models[ref]) throw new Error('model not loaded: ' + ref);
      return models[ref];
    },
    mats: mats,
    used: used
  };
}

// ---- scene

function sceneUp() {
  renderer = new THREE.WebGLRenderer({ canvas: cv, antialias: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
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
}

function ground() {
  var g = new THREE.Mesh(new THREE.PlaneGeometry(400, 400), new THREE.MeshLambertMaterial({ color: 0x84c26c }));
  g.rotation.x = -Math.PI / 2;
  g.receiveShadow = true;
  scene.add(g);
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

// ---- camera

function place() {
  var cx = Math.cos(TILT);
  cam.position.set(focus.x + focus.dist * Math.sin(focus.az) * cx, focus.dist * Math.sin(TILT), focus.z + focus.dist * Math.cos(focus.az) * cx);
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
      focus.az = pinch.az - (Math.atan2(b.y - a.y, b.x - a.x) - pinch.ang);
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
  var h = ray.intersectObjects(picks, false);
  if (h.length) return { kind: 'biz', id: h[0].object.userData.id };
  return { kind: 'none' };
}

// ---- businesses

function stageOf(id) {
  if (id === 'park') return S.park;
  return shape(id);
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
    scene.add(b.group);
    b.shown = -1;
    bizList.push(id);
  });
}

function sync(animate, now) {
  var changed = false;
  bizList.forEach(function (id) {
    var b = town.biz[id];
    var st = stageOf(id);
    if (st === b.shown) return;
    var pk = b.pick(st);
    b.models.forEach(function (g, i) { g.visible = b.cum ? (i === 0 ? pk === 0 : i <= pk) : i === pk; });
    if (animate && b.shown >= 0) bump[id] = now;
    b.shown = st;
    changed = true;
  });
  if (changed) renderer.shadowMap.needsUpdate = true;
}

function pop(now) {
  for (var id in bump) {
    var u = (now - bump[id]) / 650;
    var b = town.biz[id];
    if (u >= 1) {
      b.group.scale.set(1, 1, 1);
      delete bump[id];
      renderer.shadowMap.needsUpdate = true;
      continue;
    }
    var s = 1 + 0.12 * Math.sin(u * Math.PI) * (1 - u);
    var f = b.foot;
    b.group.scale.set(s, s, s);
    b.group.position.set((f.x0 + f.x1) / 2 * (1 - s), 0, (f.z0 + f.z1) / 2 * (1 - s));
    renderer.shadowMap.needsUpdate = true;
  }
}

// ---- labels over the town

function makeTags() {
  tagsEl = document.getElementById('tags');
  bizList.forEach(function (id) {
    var b = town.biz[id];
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
  var near = focus.dist < 24;
  bizList.forEach(function (id) {
    var b = town.biz[id];
    var t = b.tag;
    var st = bstate(id);
    var a = b.top();
    toScreen(a[0], a[1], a[2], sp);
    anchorXY[id] = { x: sp.x, y: sp.y };
    var vis = sp.z < 1 && sp.x > -60 && sp.x < cw + 60 && sp.y > IT + 34 && sp.y < ch - IB + 30;
    var locked = !st.own;
    var show = vis && (near || (focus.dist < 48 && (st.own || locked && st.avail)));
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
    var coin = st.wait > 0 && vis;
    if (coin) {
      if (t.wait !== st.wait) {
        t.wait = st.wait;
        t.coin.textContent = '$' + short(st.wait);
      }
      var bob = Math.sin(now / 260 + sp.x) * 3;
      t.coin.style.transform = 'translate(' + Math.round(sp.x) + 'px,' + Math.round(sp.y + 14 + bob) + 'px) translate(-50%,0)';
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

// ---- the part the page talks to

function init(canvas, tap) {
  cv = canvas;
  onTap = tap;
  sceneUp();
  resize();
  window.addEventListener('resize', resize);
  bind();
  ground();
  [['turn-l', 1], ['turn-r', -1]].forEach(function (b) {
    document.getElementById(b[0]).addEventListener('click', function () {
      azGoal = (azGoal === null ? Math.round(focus.az / (Math.PI / 4)) * Math.PI / 4 : azGoal) + b[1] * Math.PI / 4;
    });
  });
  var bar = document.getElementById('load-bar');
  var list = modelList();
  lib = loadModels(list, function (p) { if (bar) bar.style.width = Math.round(p * 100) + '%'; }, function () {
    setTimeout(function () {
      town = planTown(lib);
      scene.add(town.root);
      makeBiz();
      makeTags();
      life = new Life(scene, lib, town);
      sync(false, 0);
      focusNow();
      place();
      renderer.shadowMap.needsUpdate = true;
      ready = true;
      var el = document.getElementById('loading');
      if (el) el.classList.add('done');
      if (window.townWarnings) window.townWarnings(town.warns);
    }, 30);
  });
}

var lastT = 0;
var perf = { life: 0, render: 0, overlay: 0 };

function draw(now) {
  if (!ready) return;
  var dt = Math.min(0.1, (now - lastT) / 1000);
  lastT = now;
  stepCam(dt);
  if (goal) {
    clamp();
    place();
  }
  var t0 = performance.now();
  life.update(dt, now);
  pop(now);
  var t1 = performance.now();
  renderer.render(scene, cam);
  var t2 = performance.now();
  overlay(now);
  var t3 = performance.now();
  perf.life += (t1 - t0 - perf.life) * 0.05;
  perf.render += (t2 - t1 - perf.render) * 0.05;
  perf.overlay += (t3 - t2 - perf.overlay) * 0.05;
}

function spot(id) {
  var p = id === 'park' ? town.biz.park : town.biz[id];
  if (!p) {
    var sch = town.biz.school;
    return { v: 'school', x: sch.at[0], y: sch.at[2] };
  }
  return { v: 'town', x: p.at[0], y: p.at[2] };
}

function go(v, z, x) {
  if (v === 'school') {
    var s = town.biz.school;
    flyTo(s.at[0], s.at[2], 15);
    return;
  }
  flyTo(x, z, 15);
}

function focusNow(id) {
  goal = null;
  var b = best();
  var sp2 = spot(id || (b ? b.id : 'homes'));
  focus.x = sp2.x;
  focus.z = sp2.y;
  focus.dist = 17;
  focus.az = 0;
  clamp();
  place();
}

function event(res, now) {
  bump[res.id] = now;
  sync(true, now);
  var big = res.unlock || res.park || (res.ms && res.ms.length);
  var sp2 = spot(res.id);
  var out = 0.25;
  if (big) out = flyTo(sp2.x, sp2.y, Math.min(focus.dist, 17)) + 0.1;
  return out;
}

function refresh() {
  sync(false, 0);
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
  confetti: function () {},
  populate: function () { sync(true, performance.now()); },
  roomY: function () { return 0; },
  blockAt: spot,
  view: function () { return 'town'; },
  focusNow: focusNow,
  screenOf: function (id) {
    var a = anchorXY[id];
    return a ? { x: a.x, y: a.y } : null;
  },
  spot: spot,
  setBest: function (id) { bestId = id; },
  turn: function (q) {
    focus.az += q;
    place();
  },
  look: function (x, z, dist, az) {
    goal = null;
    focus.x = x;
    focus.z = z;
    focus.dist = dist;
    focus.az = az || 0;
    clamp();
    place();
  },
  project: function (x, z) {
    toScreen(x, 0, z, sp);
    return { x: sp.x, y: sp.y };
  },
  where: function () { return { x: focus.x, z: focus.z, d: focus.dist, az: focus.az, ch: ch, cw: cw }; },
  plan: function () {
    var k = 16;
    var cv2 = document.createElement('canvas');
    cv2.width = 70 * k;
    cv2.height = 36 * k;
    var x = cv2.getContext('2d');
    x.fillStyle = '#ffffff';
    x.fillRect(0, 0, cv2.width, cv2.height);
    var X = function (v) { return (v + 35) * k; };
    var Z = function (v) { return (v + 7) * k; };
    var cells = function (set, col) {
      x.fillStyle = col;
      for (var key in set) {
        var q = key.split(',');
        x.fillRect(X(+q[0] / 2), Z(+q[1] / 2), k / 2, k / 2);
      }
    };
    cells(town.roadCells, '#555');
    cells(town.walkCells, '#ccd');
    town.claims.forEach(function (c) {
      var t = c.tag || '';
      x.fillStyle = /tree|bush|hedge/.test(t) ? '#4a4' : /car|vehicle/.test(t) ? '#e84' : /lamp|signal/.test(t) ? '#888' : '#47c';
      x.fillRect(X(c.x0), Z(c.z0), (c.x1 - c.x0) * k, (c.z1 - c.z0) * k);
    });
    x.strokeStyle = '#ddd';
    x.lineWidth = 1;
    for (var g = -35; g <= 35; g += 5) {
      x.beginPath();
      x.moveTo(X(g), 0);
      x.lineTo(X(g), cv2.height);
      x.stroke();
    }
    for (g = -7; g <= 29; g += 5) {
      x.beginPath();
      x.moveTo(0, Z(g));
      x.lineTo(cv2.width, Z(g));
      x.stroke();
    }
    return cv2.toDataURL('image/png');
  },
  perf: function () { return perf; },
  used: function () { return Object.keys(lib.used); },
  life: function () { return life; },
  stats: function () { return { calls: renderer.info.render.calls, tris: renderer.info.render.triangles }; }
};
