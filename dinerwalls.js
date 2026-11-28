import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { envFor } from './walls.js';

// The diner's building: a long low shell with rounded corners, a chrome skirt under a red band, a glass band with chrome
// mullions and a cream fascia with a neon tube along the two long sides, and a plain stucco service annex behind it. The
// front and the wall to the annex stay low so the floor shows; the sides drop with the camera like the supercenter's.
// o: root, outer, renderer, hw (half width), front, back, sb, ax (annex half width), r (corner radius), entrances, doors,
// docks. Returns the parts a store look tints (wall, trim), lit and glare, as buildWalls does

var CHROME = 0xd9dee4;
var RED = 0xd3302c;
var CREAM = 0xf3ead6;

export function buildDinerWalls(o) {
  var buckets = {};
  var mats = {};
  var lit = [];
  var env = envFor(o.renderer);
  function std(c, r, m, role) {
    var k = c + '/' + r + '/' + m + '/' + role;
    if (!mats[k]) {
      mats[k] = new THREE.MeshStandardMaterial({ color: c, roughness: r, metalness: m || 0 });
      mats[k].userData.role = role;
      if (m) {
        mats[k].envMap = env;
        mats[k].envMapIntensity = 0.9;
        mats[k].userData.lit = 0.9;
        lit.push(mats[k]);
      }
    }
    return mats[k];
  }
  var chrome = std(CHROME, 0.25, 0.75, 'trim');
  var red = std(RED, 0.5, 0, 'none');
  var cream = std(CREAM, 0.9, 0, 'wall');
  var neon = new THREE.MeshBasicMaterial({ color: 0xff4a3d });
  neon.userData.role = 'none';
  var glassMat = new THREE.MeshPhysicalMaterial({ color: 0x9fcad8, roughness: 0.1, metalness: 0, transparent: true, opacity: 0.3, side: THREE.DoubleSide,
    depthWrite: false, envMap: env, envMapIntensity: 2.2 });
  glassMat.userData.role = 'glass';
  glassMat.userData.lit = 2.2;
  lit.push(glassMat);
  var glareMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 1, transparent: true, opacity: 0.12, depthWrite: false, emissive: 0xffffff,
    emissiveIntensity: 0.3 });
  glareMat.userData.role = 'glass';

  function put(group, mat, geo) {
    if (geo.index) geo = geo.toNonIndexed();
    geo.deleteAttribute('uv');
    var gk = group + '/' + mat.userData.role;
    var b = buckets[gk] = buckets[gk] || {};
    b = b[mat.uuid] = b[mat.uuid] || { m: mat, g: [] };
    b.g.push(geo);
  }
  function box(group, mat, x0, x1, y0, y1, z0, z1) {
    var g = new THREE.BoxGeometry(x1 - x0, y1 - y0, z1 - z0);
    g.translate((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2);
    put(group, mat, g);
  }
  // a straight run from (ax, az) to (bx, bz): a slab y0..y1 centred on the line, t thick
  function run(group, mat, ax, az, bx, bz, y0, y1, t) {
    var len = Math.hypot(bx - ax, bz - az);
    if (len < 0.02) return;
    var g = new THREE.BoxGeometry(len, y1 - y0, t);
    g.rotateY(-Math.atan2(bz - az, bx - ax));
    g.translate((ax + bx) / 2, (y0 + y1) / 2, (az + bz) / 2);
    put(group, mat, g);
  }
  // a quarter circle round (cx, cz) from angle a0 to a0 + 90 degrees, as short runs
  function arc(group, mat, cx, cz, r, a0, y0, y1, t) {
    var n = 6;
    for (var i = 0; i < n; i++) {
      var a = a0 + Math.PI / 2 * i / n;
      var b = a0 + Math.PI / 2 * (i + 1) / n;
      run(group, mat, cx + r * Math.cos(a), cz + r * Math.sin(a), cx + r * Math.cos(b), cz + r * Math.sin(b), y0, y1, t);
    }
  }
  function runs(a, b, gaps) {
    var cuts = [a];
    gaps.forEach(function (g) { cuts.push(g[0] - g[1] / 2, g[0] + g[1] / 2); });
    cuts.push(b);
    cuts.sort(function (p, q) { return p - q; });
    var out = [];
    for (var i = 0; i < cuts.length; i += 2) if (cuts[i + 1] - cuts[i] > 0.05) out.push([cuts[i], cuts[i + 1]]);
    return out;
  }

  var hw = o.hw;
  var R = o.r;
  var F = o.front;
  var B = o.back;
  // low wall profile: chrome skirt, an optional red band and the chrome cap
  function low(group, f) {
    f(0, 0.3, chrome, 0.28);
    f(0.3, 0.5, red, 0.26);
    f(0.5, 0.55, chrome, 0.3);
  }
  // the front, between the entrances
  var gaps = o.entrances.map(function (e) { return [e.x, e.w]; });
  runs(-hw + R, hw - R, gaps).forEach(function (s) {
    low('fixed', function (y0, y1, m, t) { run('fixed', m, s[0], F, s[1], F, y0, y1, t); });
  });
  o.entrances.forEach(function (e) {
    [-1, 1].forEach(function (sd) { box('fixed', chrome, e.x + sd * (e.w / 2 + 0.07) - 0.07, e.x + sd * (e.w / 2 + 0.07) + 0.07, 0, 0.9, F - 0.14, F + 0.14); });
    box('fixed', chrome, e.x - e.w / 2 - 0.14, e.x + e.w / 2 + 0.14, 0.88, 0.96, F - 0.1, F + 0.1);
  });
  // the wall to the annex, low, with the stock doors open
  runs(-hw + R, hw - R, o.doors.map(function (d) { return [d, 1]; })).forEach(function (s) {
    run('fixed', chrome, s[0], B, s[1], B, 0, 0.3, 0.28);
    run('fixed', chrome, s[0], B, s[1], B, 0.3, 0.34, 0.32);
  });
  // the four rounded corners: the front ones as the front, the back ones as the wall to the annex
  [[-1, -1], [1, -1]].forEach(function (c) {
    var cx = c[0] * (hw - R);
    var cz = B + R;
    arc('fixed', chrome, cx, cz, R, c[0] < 0 ? Math.PI : Math.PI * 1.5, 0, 0.3, 0.28);
    arc('fixed', chrome, cx, cz, R, c[0] < 0 ? Math.PI : Math.PI * 1.5, 0.3, 0.34, 0.32);
  });
  [[-1, 1], [1, 1]].forEach(function (c) {
    var cx = c[0] * (hw - R);
    var cz = F - R;
    var a0 = c[0] < 0 ? Math.PI / 2 : 0;
    arc('fixed', chrome, cx, cz, R, a0, 0, 0.3, 0.28);
    arc('fixed', red, cx, cz, R, a0, 0.3, 0.5, 0.26);
    arc('fixed', chrome, cx, cz, R, a0, 0.5, 0.55, 0.3);
  });

  // a long side: skirt, band, glass, fascia and its neon tube, from z0 to z1 at x
  function side(group, x, sd) {
    var z0 = B + R;
    var z1 = F - R;
    var t = 0.24;
    box(group, chrome, x - 0.14, x + 0.14, 0, 0.3, z0, z1);
    box(group, red, x - 0.13, x + 0.13, 0.3, 0.52, z0, z1);
    box(group, chrome, x - 0.16, x + 0.16, 0.52, 0.55, z0, z1);
    box(group, chrome, x - 0.16, x + 0.16, 1.02, 1.08, z0, z1);
    box(group, cream, x - 0.12, x + 0.12, 1.08, 1.28, z0, z1);
    box(group, neon, x + sd * 0.125, x + sd * 0.15, 1.16, 1.2, z0, z1);
    var n = Math.max(1, Math.round((z1 - z0) / 1.5));
    var pw = (z1 - z0) / n;
    for (var i = 0; i <= n; i++) box(group, chrome, x - 0.04, x + 0.04, 0.55, 1.02, z0 + i * pw - 0.035, z0 + i * pw + 0.035);
    for (i = 0; i < n; i++) {
      var g = new THREE.PlaneGeometry(pw - 0.07, 0.47);
      g.rotateY(Math.PI / 2);
      g.translate(x, 0.785, z0 + (i + 0.5) * pw);
      put(group, glassMat, g);
      var sh = new THREE.Shape();
      sh.moveTo(0, 0);
      sh.lineTo(0.12, 0);
      sh.lineTo(0.42, 0.45);
      sh.lineTo(0.3, 0.45);
      var st = new THREE.ShapeGeometry(sh);
      st.rotateY(Math.PI / 2);
      st.translate(x + 0.004, 0.55, z0 + (i + 0.25) * pw);
      put(group, glareMat, st);
    }
    return t;
  }
  side('west', -hw, -1);
  side('east', hw, 1);

  // the annex: plain stucco with a chrome cap, the dock doors open in its far wall
  var ax = o.ax;
  var sb = o.sb;
  function plain(group, ax0, az0, ax1, az1) {
    run(group, cream, ax0, az0, ax1, az1, 0, 1.0, 0.24);
    run(group, chrome, ax0, az0, ax1, az1, 1.0, 1.06, 0.3);
  }
  plain('west', -ax, B, -ax, sb);
  plain('east', ax, B, ax, sb);
  runs(-ax, ax, o.docks.map(function (d) { return [d, 2]; })).forEach(function (s) { plain('fixed', s[0], sb, s[1], sb); });
  o.docks.forEach(function (d) {
    [-1, 1].forEach(function (sd) { box('fixed', chrome, d + sd * 1.05 - 0.05, d + sd * 1.05 + 0.05, 0, 1.0, sb - 0.12, sb + 0.12); });
    box('fixed', chrome, d - 1.1, d + 1.1, 0.8, 0.88, sb - 0.1, sb + 0.1);
  });

  var groups = {};
  var wall = [];
  var trim = [];
  Object.keys(buckets).forEach(function (gk) {
    var at = gk.split('/');
    if (!groups[at[0]]) {
      groups[at[0]] = new THREE.Group();
      o.root.add(groups[at[0]]);
    }
    var part = new THREE.Group();
    Object.keys(buckets[gk]).forEach(function (k) {
      var b = buckets[gk][k];
      var m = new THREE.Mesh(mergeGeometries(b.g), b.m);
      m.castShadow = !b.m.transparent && b.m !== neon;
      m.receiveShadow = !b.m.transparent;
      if (b.m.transparent) m.renderOrder = 2;
      part.add(m);
    });
    groups[at[0]].add(part);
    if (at[1] === 'wall') wall.push(part);
    if (at[1] === 'trim') trim.push(part);
  });
  o.outer.push({ g: groups.west, n: [-1, 0] }, { g: groups.east, n: [1, 0] });
  return { wall: wall, trim: trim, lit: lit, glare: glareMat };
}
