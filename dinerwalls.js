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
  var glassMat = new THREE.MeshPhysicalMaterial({ color: 0x8cc6e0, roughness: 0.1, metalness: 0, transparent: true, opacity: 0.55, side: THREE.DoubleSide,
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
  var HS = 1.28;
  var HB = 0.95;
  // the whole profile along a run of wall, a to b, with its outward side at (nx, nz): chrome skirt, red band, chrome cap, a
  // pale glass band between mullions, a cream fascia under a neon tube; H is how high the fascia ends
  function prof(group, ax, az, bx, bz, nx, nz, H) {
    var len = Math.hypot(bx - ax, bz - az);
    if (len < 0.02) return;
    var gt = H - 0.26;
    run(group, chrome, ax, az, bx, bz, 0, 0.3, 0.28);
    run(group, red, ax, az, bx, bz, 0.3, 0.52, 0.26);
    run(group, chrome, ax, az, bx, bz, 0.52, 0.55, 0.3);
    run(group, chrome, ax, az, bx, bz, gt, gt + 0.06, 0.3);
    run(group, cream, ax, az, bx, bz, gt + 0.06, H, 0.24);
    run(group, neon, ax + nx * 0.125, az + nz * 0.125, bx + nx * 0.125, bz + nz * 0.125, gt + 0.12, gt + 0.16, 0.025);
    var ang = Math.atan2(bz - az, bx - ax);
    var g = new THREE.PlaneGeometry(len - 0.02, gt - 0.55);
    g.rotateY(-ang);
    g.translate((ax + bx) / 2, (0.55 + gt) / 2, (az + bz) / 2);
    put(group, glassMat, g);
    var n = Math.max(1, Math.round(len / 1.5));
    for (var i = 0; i <= n; i++) {
      var t = i / n;
      box(group, chrome, ax + (bx - ax) * t - 0.04, ax + (bx - ax) * t + 0.04, 0.55, gt, az + (bz - az) * t - 0.04, az + (bz - az) * t + 0.04);
    }
  }
  function pro(group, a, b, H) {
    prof(group, a[0], a[1], b[0], b[1], b[2], b[3], H);
  }
  // the straight front, low, between the entrance and the corners
  var gaps = o.entrances.map(function (e) { return [e.x, e.w]; });
  runs(-hw + R, hw - R, gaps).forEach(function (s) {
    run('fixed', chrome, s[0], F, s[1], F, 0, 0.3, 0.28);
    run('fixed', red, s[0], F, s[1], F, 0.3, 0.5, 0.26);
    run('fixed', chrome, s[0], F, s[1], F, 0.5, 0.55, 0.3);
  });
  // the lobby: glass sides, a glass roof on a red beam and a cream fascia with the lettering above it
  o.entrances.forEach(function (e) {
    var h = e.w / 2 + 0.1;
    var d = o.lobby;
    [-1, 1].forEach(function (sd) {
      var x = e.x + sd * h;
      box('fixed', chrome, x - 0.06, x + 0.06, 0, 0.98, F - 0.1, F + d + 0.06);
      run('fixed', chrome, x, F, x, F + d, 0, 0.3, 0.1);
      var g = new THREE.PlaneGeometry(d, 0.62);
      g.rotateY(Math.PI / 2);
      g.translate(x, 0.64, F + d / 2);
      put('fixed', glassMat, g);
    });
    var rg = new THREE.PlaneGeometry(h * 2, d);
    rg.rotateX(-Math.PI / 2);
    rg.translate(e.x, 0.98, F + d / 2);
    put('fixed', glassMat, rg);
    box('fixed', red, e.x - h - 0.06, e.x + h + 0.06, 0.86, 1.02, F + d - 0.07, F + d + 0.07);
    box('fixed', chrome, e.x - h - 0.06, e.x + h + 0.06, 1.02, 1.05, F + d - 0.08, F + d + 0.08);
    box('fixed', cream, e.x - h - 0.06, e.x + h + 0.06, 1.05, 1.3, F - 0.05, F + 0.05);
    box('fixed', neon, e.x - h, e.x + h, 1.28, 1.31, F + 0.06, F + 0.09);
  });
  // the back wall to the annex, whole profile but lower, with the stock doors open
  runs(-hw + R, hw - R, o.doors.map(function (d) { return [d, 1]; })).forEach(function (s) {
    prof('fixed', s[0], B, s[1], B, 0, -1, HB);
  });
  // the four rounded corners, each a quarter of the whole profile
  function corner(group, cx, cz, a0, H) {
    var n = 6;
    for (var i = 0; i < n; i++) {
      var a = a0 + Math.PI / 2 * i / n;
      var b = a0 + Math.PI / 2 * (i + 1) / n;
      var m = (a + b) / 2;
      prof(group, cx + R * Math.cos(a), cz + R * Math.sin(a), cx + R * Math.cos(b), cz + R * Math.sin(b), Math.cos(m), Math.sin(m), H);
    }
  }
  corner('bl', -hw + R, B + R, Math.PI, HB);
  corner('br', hw - R, B + R, Math.PI * 1.5, HB);
  corner('fl', -hw + R, F - R, Math.PI / 2, HS);
  corner('fr', hw - R, F - R, 0, HS);
  // a long side from the back corner to the front one
  prof('west', -hw, B + R, -hw, F - R, -1, 0, HS);
  prof('east', hw, B + R, hw, F - R, 1, 0, HS);

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
  o.outer.push({ g: groups.west, n: [-1, 0] }, { g: groups.east, n: [1, 0] }, { g: groups.fl, n: [-0.7, 0.7] }, { g: groups.fr, n: [0.7, 0.7] });
  return { wall: wall, trim: trim, lit: lit, glare: glareMat };
}
