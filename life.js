import * as THREE from 'three';
import { CARS, FOLK } from './plan.js';
import { figure } from './school3d.js';

// Cars follow closed lanes on the right of the road, people walk the sidewalks and a few cross at the stripes.
// Nothing is checked against a map: every car looks ahead for another car or a person, and each junction lets one
// car through at a time (the circle takes four), and the boulevard junctions have signals as well.

var RING = 1.0;
var SPEED = 1.0;

function arc(a0, a1) {
  var pts = [];
  if (a1 < a0) a1 += 360;
  var n = Math.max(3, Math.ceil((a1 - a0) / 10));
  for (var i = 0; i <= n; i++) {
    var a = (a0 + (a1 - a0) * i / n) * Math.PI / 180;
    pts.push([RING * Math.cos(a), -RING * Math.sin(a)]);
  }
  return pts;
}

// the right-hand lane beside a centre line of tile centres, corners rounded
function lane(pts, off) {
  var n = pts.length;
  var d = [];
  var i;
  for (i = 0; i < n - 1; i++) {
    var dx = pts[i + 1][0] - pts[i][0];
    var dz = pts[i + 1][1] - pts[i][1];
    var l = Math.hypot(dx, dz);
    d.push([dx / l, dz / l]);
  }
  var res = [];
  for (i = 0; i < n; i++) {
    var a = d[Math.max(0, i - 1)];
    var b = d[Math.min(n - 2, i)];
    var nx = (-a[1] - b[1]) * off;
    var nz = (a[0] + b[0]) * off;
    if (i === 0 || i === n - 1) {
      var e = i === 0 ? b : a;
      nx = -e[1] * off;
      nz = e[0] * off;
    }
    res.push([pts[i][0] + nx, pts[i][1] + nz, i > 0 && i < n - 1]);
  }
  var out = [];
  for (i = 0; i < n; i++) {
    var p = res[i];
    if (!p[2]) {
      out.push([p[0], p[1]]);
      continue;
    }
    var da = d[i - 1];
    var db = d[i];
    var r = 0.42;
    var A = [p[0] - da[0] * r, p[1] - da[1] * r];
    var B = [p[0] + db[0] * r, p[1] + db[1] * r];
    for (var k = 0; k <= 6; k++) {
      var t = k / 6;
      out.push([(1 - t) * (1 - t) * A[0] + 2 * t * (1 - t) * p[0] + t * t * B[0], (1 - t) * (1 - t) * A[1] + 2 * t * (1 - t) * p[1] + t * t * B[1]]);
    }
  }
  return out;
}

function route(ring, pts, off, mid, pts2) {
  var all = ring.concat(lane(pts, off));
  if (mid) all = all.concat(mid, lane(pts2, off));
  var out = [all[0]];
  for (var i = 1; i < all.length; i++) {
    if (Math.hypot(all[i][0] - out[out.length - 1][0], all[i][1] - out[out.length - 1][1]) > 0.02) out.push(all[i]);
  }
  var cum = [0];
  for (i = 1; i <= out.length; i++) {
    var a = out[i - 1];
    var b = out[i % out.length];
    cum.push(cum[i - 1] + Math.hypot(b[0] - a[0], b[1] - a[1]));
  }
  return { p: out, cum: cum, len: cum[out.length] };
}

// the lane of the crescent: Park Street west to the curve, down the straight and round the second curve to Main Street
function crescent() {
  var pts = [];
  for (var i = 0; i <= 18; i++) {
    var a = (90 + 180 * i / 18) * Math.PI / 180;
    pts.push([-15.5 + 2.75 * Math.cos(a), 7.5 - 2.75 * Math.sin(a)]);
  }
  return pts;
}

var LOOPS = [
  [arc(14.5, 255.5), [[0, 1.5], [0, 2], [-1, 2], [-1, 15], [14, 15], [14, 0], [2, 0]]],
  [arc(284.5, 345.5), [[2, 0], [14, 0], [14, 15], [1, 15], [1, 2], [0, 2], [0, 1.5]]],
  [arc(284.5, 345.5), [[2, 0], [26, 0], [26, 20], [1, 20], [1, 2], [0, 2], [0, 1.5]]],
  [arc(14.5, 255.5), [[0, 1.5], [0, 2], [-1, 2], [-1, 20], [26, 20], [26, 0], [2, 0]]],
  [arc(14.5, 255.5), [[0, 1.5], [0, 2], [-1, 2], [-1, 5], [-15, 5]], crescent(), [[-15, 10], [-1, 10], [-1, 20], [26, 20], [26, 0], [2, 0]]]
];

// the places where roads cross; the boulevard ones have signals
var JUNCTIONS = [];
[5, 10, 15, 20].forEach(function (z) { JUNCTIONS.push({ x0: -1.5, x1: 1.5, z0: z - 0.5, z1: z + 0.5, cap: 1, sig: true }); });
JUNCTIONS.push({ x0: 13.5, x1: 14.5, z0: -0.5, z1: 0.5, cap: 1 });
JUNCTIONS.push({ x0: 13.5, x1: 14.5, z0: 14.5, z1: 15.5, cap: 1 });
[0, 20].forEach(function (z) { JUNCTIONS.push({ x0: 25.5, x1: 26.5, z0: z - 0.5, z1: z + 0.5, cap: 1 }); });
JUNCTIONS.push({ x0: -1.6, x1: 1.6, z0: -1.6, z1: 1.6, cap: 4, ring: true });
JUNCTIONS.forEach(function (j) {
  j.held = [];
  j.stop = j.ring ? 0.2 : 1.4;
});

function inside(j, x, z) {
  return x > j.x0 && x < j.x1 && z > j.z0 && z < j.z1;
}

function gates(r) {
  var g = [];
  JUNCTIONS.forEach(function (j) {
    var step = 0.04;
    var on = false;
    var sIn = 0;
    var n = Math.floor(r.len / step);
    var dirIn = null;
    // find every stretch of the lane inside the box
    for (var i = 0; i <= n; i++) {
      var s = i * step;
      var q = at(r, s);
      var inn = inside(j, q.x, q.z);
      if (inn && !on) {
        on = true;
        sIn = s;
        dirIn = Math.abs(q.hz) > Math.abs(q.hx) ? 'ns' : 'ew';
      } else if (!inn && on) {
        on = false;
        g.push({ j: j, sIn: sIn, sOut: s, axis: dirIn });
      }
    }
    if (on) g.push({ j: j, sIn: sIn, sOut: r.len, axis: dirIn });
  });
  // a lane that starts inside the circle enters it at the start
  g.sort(function (a, b) { return a.sIn - b.sIn; });
  return g;
}

var tmp = { x: 0, z: 0, hx: 0, hz: 1 };
function at(r, s) {
  s = ((s % r.len) + r.len) % r.len;
  var lo = 0;
  var hi = r.p.length - 1;
  while (lo < hi) {
    var m = (lo + hi + 1) >> 1;
    if (r.cum[m] <= s) lo = m;
    else hi = m - 1;
  }
  var a = r.p[lo];
  var b = r.p[(lo + 1) % r.p.length];
  var l = r.cum[lo + 1] - r.cum[lo] || 1;
  var u = (s - r.cum[lo]) / l;
  tmp.x = a[0] + (b[0] - a[0]) * u;
  tmp.z = a[1] + (b[1] - a[1]) * u;
  tmp.hx = (b[0] - a[0]) / l;
  tmp.hz = (b[1] - a[1]) / l;
  return tmp;
}

var shadowTex;
function shadowMat() {
  if (shadowTex) return shadowTex;
  var k = document.createElement('canvas');
  k.width = k.height = 64;
  var x = k.getContext('2d');
  var g = x.createRadialGradient(32, 32, 4, 32, 32, 30);
  g.addColorStop(0, 'rgba(0,0,0,0.5)');
  g.addColorStop(1, 'rgba(0,0,0,0)');
  x.fillStyle = g;
  x.fillRect(0, 0, 64, 64);
  shadowTex = new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(k), transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 });
  return shadowTex;
}


export function Life(scene, lib, town) {
  var rnd = town.rng;
  var routes = LOOPS.map(function (l) { return route(l[0], l[1], 0.25, l[2], l[3]); });
  routes.forEach(function (r) { r.gates = gates(r); });
  var cars = [];
  var folk = [];
  var clock = 0;
  var lights = [];

  function carObject(ref) {
    var m = lib.model(ref);
    var g = new THREE.Group();
    m.parts.forEach(function (p) {
      var mesh = new THREE.Mesh(p.geom, p.mat);
      mesh.castShadow = false;
      g.add(mesh);
    });
    g.scale.setScalar(0.26);
    var o = new THREE.Group();
    o.add(g);
    scene.add(o);
    return o;
  }

  function makeCars() {
    var k = 0;
    routes.forEach(function (r) {
      var n = 4;
      for (var i = 0; i < n; i++) {
        var ref = CARS[(k * 5 + 1) % CARS.length];
        k++;
        var c = { r: r, s: (i + 0.5) * r.len / n + (rnd() - 0.5) * 0.4, v: 0, obj: carObject(ref), id: cars.length, gi: 0, held: [], len: 0.7, x: 0, z: 0, hx: 0, hz: 1 };
        cars.push(c);
      }
    });
  }

  // a line walked to and fro, or round when closed. A crossing waits at each end for the road to clear
  function walker(pts, closed, cross, speed, ref) {
    var cum = [0];
    var n = pts.length;
    for (var i = 1; i < (closed ? n + 1 : n); i++) {
      var a = pts[i - 1];
      var b = pts[i % n];
      cum.push(cum[i - 1] + Math.hypot(b[0] - a[0], b[1] - a[1]));
    }
    var p = figure(lib, ref, 'walk', 0.28);
    scene.add(p.obj);
    if (!p.act) p.act = { paused: false, time: 0 };
    var w = { p: pts, cum: cum, len: cum[cum.length - 1], closed: closed, cross: cross, s: rnd() * cum[cum.length - 1], dir: 1, v: speed, obj: p.obj, mixer: p.mixer,
      act: p.act, wait: 0, x: 0, z: 0, hx: 0, hz: 1, onRoad: false };
    p.act.time = rnd() * 1.5;
    var q = pos(w, w.s);
    w.x = q.x;
    w.z = q.z;
    w.obj.position.set(q.x, 0.02, q.z);
    folk.push(w);
    return w;
  }

  function pos(w, s) {
    var lo = 0;
    var hi = w.cum.length - 2;
    while (lo < hi) {
      var m = (lo + hi + 1) >> 1;
      if (w.cum[m] <= s) lo = m;
      else hi = m - 1;
    }
    var a = w.p[lo];
    var b = w.p[(lo + 1) % w.p.length];
    var l = w.cum[lo + 1] - w.cum[lo] || 1;
    var u = (s - w.cum[lo]) / l;
    tmp.x = a[0] + (b[0] - a[0]) * u;
    tmp.z = a[1] + (b[1] - a[1]) * u;
    tmp.hx = (b[0] - a[0]) / l;
    tmp.hz = (b[1] - a[1]) / l;
    return tmp;
  }

  function makeFolk() {
    var k = 0;
    var next = function () { return FOLK[(k++ * 5 + 3) % FOLK.length]; };
    // round the blocks on the sidewalk, a lane each way: 0.12 from the building line or 0.4 off it
    [[15, 1, 25, 4], [2, 6, 13, 9], [15, 6, 25, 9], [2, 11, 13, 14], [15, 11, 25, 14], [2, 16, 13, 19], [15, 16, 25, 19]].forEach(function (b) {
      [0.12, 0.4].forEach(function (o, j) {
        var pts = j ? [[b[0] - o, b[1] - o], [b[2] + o, b[1] - o], [b[2] + o, b[3] + o], [b[0] - o, b[3] + o]]
          : [[b[0] - o, b[3] + o], [b[2] + o, b[3] + o], [b[2] + o, b[1] - o], [b[0] - o, b[1] - o]];
        walker(pts, true, false, 0.26 + rnd() * 0.1, next());
      });
    });
    // along a street and back
    [[1.12, -24, -3], [4.38, -15, -3], [9.12, -15, -3], [10.88, -15, -3], [14.12, -24, -3], [16.12, -24, -3], [19.12, -15, -3], [-1.12, -24, -3],
      [-1.12, 3, 13], [-1.12, 15, 25]].forEach(function (l) {
      walker([[l[1], l[0]], [l[2], l[0]]], false, false, 0.3, next());
      if (l[0] > 9) walker([[l[2] - 2, l[0]], [l[1] + 3, l[0]]], false, false, 0.28, next());
    });
    // pacing over the stripes
    town.crossings.forEach(function (cr, i) {
      if (Math.abs(cr.x) < 1.2 || i % 2) return;
      var a;
      var b;
      if (cr.across === 'z') {
        a = [cr.x, cr.z - 0.62];
        b = [cr.x, cr.z + 0.62];
      } else {
        a = [cr.x - 0.62, cr.z];
        b = [cr.x + 0.62, cr.z];
      }
      var w = walker([a, b], false, true, 0.3, next());
      w.cx = cr.x;
      w.cz = cr.z;
      w.s = rnd() < 0.5 ? 0 : w.len;
    });
  }

  // signals on the boulevard
  function phase(t) {
    var m = t % 12;
    return m < 5.5 ? 'ns' : m >= 6 && m < 11.5 ? 'ew' : '';
  }

  var lamp = {
    red: new THREE.MeshBasicMaterial({ color: 0xff3b30 }),
    green: new THREE.MeshBasicMaterial({ color: 0x35d44f })
  };
  function makeLights() {
    [5, 10, 15, 20].forEach(function (z) {
      [[-1.75, z - 0.75], [1.75, z - 0.75], [-1.75, z + 0.75], [1.75, z + 0.75]].forEach(function (q) {
        var ns = new THREE.Mesh(new THREE.SphereGeometry(0.028, 8, 6), lamp.red);
        ns.position.set(q[0], 0.46, q[1] + (q[1] < z ? 0.08 : -0.08) * 0.6);
        var ew = new THREE.Mesh(new THREE.SphereGeometry(0.028, 8, 6), lamp.red);
        ew.position.set(q[0] + (q[0] < 0 ? 0.1 : -0.1), 0.38, q[1]);
        scene.add(ns);
        scene.add(ew);
        lights.push({ ns: ns, ew: ew });
      });
    });
  }

  function reset() {
    clock = 0;
  }

  function red(g) {
    if (!g.j.sig) return false;
    return phase(clock) !== g.axis;
  }

  var ahead = { f: 99 };

  // the room ahead along the lane of a car: samples of its own route against the other cars and the people on the road
  function look(c) {
    var best = 99;
    for (var k = 1; k <= 9 && best === 99; k++) {
      var gapK = 0.14 * k;
      var q = at(c.r, c.s + gapK);
      var qx = q.x;
      var qz = q.z;
      var qhx = q.hx;
      var qhz = q.hz;
      for (var i = 0; i < cars.length; i++) {
        var o = cars[i];
        if (o === c) continue;
        var dx = o.x - qx;
        var dz = o.z - qz;
        if (dx * dx + dz * dz > 0.1) continue;
        if (o.hx * qhx + o.hz * qhz < 0.3) continue;
        // side by side: the lower number gives way, so two cars never wait for each other
        if (Math.abs((o.x - c.x) * c.hx + (o.z - c.z) * c.hz) < 0.3 && o.id > c.id && gapK < 0.4) continue;
        best = gapK - 0.7;
        break;
      }
      if (best !== 99) break;
      for (i = 0; i < folk.length; i++) {
        var w = folk[i];
        if (!w.onRoad) continue;
        dx = w.x - qx;
        dz = w.z - qz;
        if (dx * dx + dz * dz < 0.12) {
          best = gapK - 0.8;
          break;
        }
      }
    }
    return best;
  }

  function stepCars(dt) {
    var i;
    for (i = 0; i < cars.length; i++) {
      var c = cars[i];
      var q = at(c.r, c.s);
      c.x = q.x;
      c.z = q.z;
      c.hx = q.hx;
      c.hz = q.hz;
    }
    for (i = 0; i < cars.length; i++) {
      c = cars[i];
      var vmax = SPEED;
      var gap = look(c);
      if (gap < 90) vmax = Math.min(vmax, Math.max(0, gap * 2.2));
      var gs = c.r.gates;
      for (var k = 0; k < gs.length; k++) {
        var g = gs[k];
        var d = g.sIn - c.s;
        if (d < -c.r.len / 2) d += c.r.len;
        var held = c.held.indexOf(g) >= 0;
        if (held) {
          if (c.s > g.sOut + 0.25 || (g.sOut > c.r.len - 0.3 && c.s < g.sIn - 0.5)) {
            c.held.splice(c.held.indexOf(g), 1);
            var hi = g.j.held.indexOf(c.id);
            if (hi >= 0) g.j.held.splice(hi, 1);
          }
          continue;
        }
        var sl = g.j.stop;
        if (d < -0.2 || d > sl + 1.2) continue;
        // before a junction: stop at the line unless there is room and the light allows it
        var ok = g.j.held.length < g.j.cap && !red(g);
        if (ok) {
          if (d < sl + 0.05) {
            g.j.held.push(c.id);
            c.held.push(g);
          }
        } else if (d > 0) vmax = Math.min(vmax, Math.max(0, (d - sl) * 2.5));
      }
      c.v += (vmax - c.v) * Math.min(1, dt * 4);
      if (c.v < 0.01 && vmax === 0) c.v = 0;
      c.s += c.v * dt;
      if (c.s >= c.r.len) {
        c.s -= c.r.len;
        c.held = c.held.filter(function (g) {
          // a junction at the end of the lane is left when the lane wraps
          if (g.sOut >= c.r.len - 0.3) {
            var hi = g.j.held.indexOf(c.id);
            if (hi >= 0) g.j.held.splice(hi, 1);
            return false;
          }
          return true;
        });
      }
      var p = at(c.r, c.s);
      c.obj.position.set(p.x, 0, p.z);
      c.obj.rotation.y = Math.atan2(p.hx, p.hz);
    }
  }

  // a car that is moving, or any car on the stripes, keeps a person at the kerb
  function carNear(x, z) {
    for (var i = 0; i < cars.length; i++) {
      var c = cars[i];
      var d = Math.max(Math.abs(c.x - x), Math.abs(c.z - z));
      if (d < 1.0 || (d < 1.9 && c.v > 0.1)) return true;
    }
    return false;
  }

  function stepFolk(dt) {
    for (var i = 0; i < folk.length; i++) {
      var w = folk[i];
      if (w.wait > 0) {
        w.wait -= dt;
        w.act.paused = true;
        continue;
      }
      var move = w.v * dt * w.dir;
      var next = w.s + move;
      if (w.cross) {
        var onRoad = next > 0.12 && next < w.len - 0.12;
        // stepping onto the road: wait while a car is close to the stripes
        if (onRoad && !w.onRoad && carNear(w.cx, w.cz)) {
          w.act.paused = true;
          continue;
        }
        w.onRoad = onRoad;
        if (next <= 0 || next >= w.len) {
          w.dir = -w.dir;
          w.s = Math.max(0, Math.min(w.len, next));
          w.wait = 1 + rnd() * 3;
          w.onRoad = false;
          continue;
        }
      } else if (next >= w.len) next -= w.len;
      w.s = next;
      w.act.paused = false;
      w.mixer.update(dt * (w.v / 0.3));
      var p = pos(w, w.s);
      w.x = p.x;
      w.z = p.z;
      var sx = p.hx * w.dir;
      var sz = p.hz * w.dir;
      w.obj.position.set(p.x, 0.02, p.z);
      w.obj.rotation.y = Math.atan2(sx, sz);
    }
  }

  function update(dt) {
    clock += dt;
    var ph = phase(clock);
    for (var i = 0; i < lights.length; i++) {
      lights[i].ns.material = ph === 'ns' ? lamp.green : lamp.red;
      lights[i].ew.material = ph === 'ew' ? lamp.green : lamp.red;
    }
    stepCars(dt);
    if (!hidden) stepFolk(dt);
    shade();
  }

  makeCars();
  makeFolk();
  makeLights();
  var geo = new THREE.PlaneGeometry(1, 1);
  geo.rotateX(-Math.PI / 2);
  var blobs = new THREE.InstancedMesh(geo, shadowMat(), cars.length + folk.length);
  blobs.frustumCulled = false;
  blobs.renderOrder = 1;
  scene.add(blobs);
  var dummy = new THREE.Object3D();
  // only what stands on a street that is built yet is seen, and no more cars than the town has grown to
  var open = function () { return true; };
  var carCap = cars.length;
  function shade() {
    var n = 0;
    cars.forEach(function (c) {
      var on = c.id < carCap && open(c.x, c.z);
      c.obj.visible = on;
      dummy.position.set(c.x, 0.03, c.z);
      dummy.rotation.y = Math.atan2(c.hx, c.hz);
      dummy.scale.set(on ? 0.5 : 0, 1, on ? 0.84 : 0);
      dummy.updateMatrix();
      blobs.setMatrixAt(n++, dummy.matrix);
    });
    folk.forEach(function (w) {
      var on = !hidden && open(w.x, w.z);
      w.obj.visible = on;
      dummy.position.set(w.x, 0.03, w.z);
      dummy.rotation.y = 0;
      dummy.scale.set(on ? 0.2 : 0, 1, on ? 0.2 : 0);
      dummy.updateMatrix();
      blobs.setMatrixAt(n++, dummy.matrix);
    });
    blobs.instanceMatrix.needsUpdate = true;
  }
  stepCars(0.001);
  var hidden = false;
  this.far = function (v) {
    hidden = v;
    folk.forEach(function (w) {
      w.obj.visible = !v;
      w.onRoad = false;
    });
  };
  this.vis = function (fn, cap) {
    open = fn;
    carCap = cap;
    lights.forEach(function (l) { l.ns.visible = l.ew.visible = fn(l.ns.position.x, l.ns.position.z); });
  };
  this.update = update;
  this.reset = reset;
  this.cars = cars;
  this.folk = folk;
}
