import * as THREE from 'three';
import { mergeGeometries, toCreasedNormals } from 'three/addons/utils/BufferGeometryUtils.js';

// glass and steel: tinted panes in thin dark frames over a low concrete base on the front and the two sides, white
// render with aluminium coping on the stockroom and the office wing, and a low white wall behind the sales floor. Every piece is built into a bucket per
// material and group, so the whole shell is a few dozen meshes

var WALL_H = 1;
var FRONT_H = 0.55;
var BACK_H = 0.18;
var DOOR_H = 0.8;
var ALU = 0x2b3037;

// a rounded rectangle as outline points, x0..x1 by y0..y1, with its own top and bottom radius
function rrPts(x0, x1, y0, y1, rt, rb, n) {
  var p = [];
  n = n || 6;
  function arc(cx, cy, r, a0) {
    if (r <= 0) {
      p.push([cx, cy]);
      return;
    }
    for (var i = 0; i <= n; i++) {
      var a = a0 + Math.PI / 2 * i / n;
      p.push([cx + r * Math.cos(a), cy + r * Math.sin(a)]);
    }
  }
  arc(x0 + rb, y0 + rb, rb, Math.PI);
  arc(x1 - rb, y0 + rb, rb, Math.PI * 1.5);
  arc(x1 - rt, y1 - rt, rt, 0);
  arc(x0 + rt, y1 - rt, rt, Math.PI / 2);
  return p;
}

function shapeOf(pts) {
  return new THREE.Shape(pts.map(function (q) { return new THREE.Vector2(q[0], q[1]); }));
}

// a cross section (offset away from the room, height) run along the wall, centred on x = 0
function prof(len, pts, crease) {
  var g = new THREE.ExtrudeGeometry(shapeOf(pts), { depth: len, bevelEnabled: false, curveSegments: 1 });
  g.rotateY(Math.PI / 2);
  g.translate(-len / 2, 0, 0);
  return crease ? toCreasedNormals(g, 0.6) : g;
}

// a footprint (along the wall, offset away from the room) raised from y0 by h
function col(pts, y0, h) {
  var g = new THREE.ExtrudeGeometry(shapeOf(pts), { depth: h, bevelEnabled: false, curveSegments: 1 });
  g.rotateX(-Math.PI / 2);
  g.translate(0, y0, 0);
  return g;
}

// a pale sky with two bright strips, for the sheen on glass and aluminium
function makeEnv(renderer) {
  var sc = new THREE.Scene();
  var geo = new THREE.SphereGeometry(40, 32, 16);
  var spare = [geo];
  var cs = [];
  var top = new THREE.Color(0xcfe6ff);
  var mid = new THREE.Color(0xffffff);
  var low = new THREE.Color(0x8d9aa6);
  var p = geo.attributes.position;
  for (var i = 0; i < p.count; i++) {
    var k = p.getY(i) / 40;
    var c = k > 0 ? mid.clone().lerp(top, k) : mid.clone().lerp(low, -k);
    cs.push(c.r, c.g, c.b);
  }
  geo.setAttribute('color', new THREE.Float32BufferAttribute(cs, 3));
  var dome = new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.BackSide });
  spare.push(dome);
  sc.add(new THREE.Mesh(geo, dome));
  [[-18, 22, 10], [20, 12, -16]].forEach(function (q) {
    var bg = new THREE.BoxGeometry(18, 1, 8);
    var bm = new THREE.MeshBasicMaterial({ color: new THREE.Color(6, 6, 6) });
    spare.push(bg, bm);
    var b = new THREE.Mesh(bg, bm);
    b.position.set(q[0], q[1], q[2]);
    sc.add(b);
  });
  var pm = new THREE.PMREMGenerator(renderer);
  var t = pm.fromScene(sc, 0.02).texture;
  pm.dispose();
  spare.forEach(function (x) { x.dispose(); });
  return t;
}

// o: root, outer, renderer, the wall lines (back, sb, front, edge, wing), tire, docks, doors, entrances. Returns the
// groups west, east and wing, which the camera cuts down, and fixed, which it leaves alone; wall and trim, the parts a
// store look tints; lit, the materials that take their sheen from the env map, and glare
export function buildWalls(o) {
  var groups = {};
  var buckets = {};
  var mats = {};
  var env = makeEnv(o.renderer);

  var lit = [];
  // role: wall and trim take a store look's tint, none and glass stay as they are
  function std(c, r, m, role) {
    var k = c + '/' + r + '/' + m;
    if (!mats[k]) {
      mats[k] = new THREE.MeshStandardMaterial({ color: c, roughness: r, metalness: m || 0 });
      mats[k].userData.role = role || (m ? 'trim' : 'wall');
      if (m) {
        mats[k].envMap = env;
        mats[k].envMapIntensity = 0.9;
        mats[k].userData.lit = 0.9;
        lit.push(mats[k]);
      }
    }
    return mats[k];
  }
  var alu = std(ALU, 0.38, 0.65);
  var glassMat = new THREE.MeshPhysicalMaterial({ color: 0x9fcad8, roughness: 0.1, metalness: 0, transparent: true, opacity: 0.3, side: THREE.DoubleSide,
    depthWrite: false, envMap: env, envMapIntensity: 2.2 });
  glassMat.userData.role = 'glass';
  glassMat.userData.lit = 2.2;
  lit.push(glassMat);
  var glareMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 1, transparent: true, opacity: 0.12, depthWrite: false, emissive: 0xffffff,
    emissiveIntensity: 0.3 });
  glareMat.userData.role = 'glass';

  // the frame of a wall: x along it, z toward the room
  function frame(side) {
    if (side === 'back') return { x: function (t) { return t; }, z: function (t, d) { return o.back + d; }, rot: 0 };
    if (side === 'front') return { x: function (t) { return t; }, z: function (t, d) { return o.front - d; }, rot: Math.PI };
    if (side === 'east') return { x: function (t, d) { return o.edge - d; }, z: function (t) { return t; }, rot: -Math.PI / 2 };
    if (side === 'wing') return { x: function (t, d) { return o.wing - d; }, z: function (t) { return t; }, rot: -Math.PI / 2 };
    if (side === 'north') return { x: function (t) { return t; }, z: function (t, d) { return o.sb + d; }, rot: 0 };
    return { x: function (t, d) { return -o.edge + d; }, z: function (t) { return t; }, rot: Math.PI / 2 };
  }
  function groupOf(side) {
    return side === 'east' || side === 'west' || side === 'wing' ? side : 'fixed';
  }
  // geometry is built with x along the wall and z toward the room; y is absolute
  function P(side, geo, t, mat, d) {
    var f = frame(side);
    geo.rotateY(f.rot);
    geo.translate(f.x(t, d || 0), 0, f.z(t, d || 0));
    if (geo.index) geo = geo.toNonIndexed();
    var gk = groupOf(side) + '/' + mat.userData.role;
    var b = buckets[gk] = buckets[gk] || {};
    b = b[mat.uuid] = b[mat.uuid] || { m: mat, g: [] };
    b.g.push(geo);
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
  function glassy(side, plain) {
    return !plain && (side === 'west' || side === 'east' || side === 'front');
  }
  function halfOf(side, plain) {
    return glassy(side, plain) ? 0.06 : side === 'east' ? 0.15 : 0.3;
  }
  function topOf(side) {
    return side === 'back' ? BACK_H : side === 'front' ? FRONT_H : WALL_H;
  }

  // one run of wall, t0..t1 along it, from height y0 (a lintel starts above a door)
  function body(side, t0, t1, plain, y0) {
    var L = t1 - t0;
    if (L < 0.05) return;
    var tc = (t0 + t1) / 2;
    var H = topOf(side);
    var hw = halfOf(side, plain);
    if (H < 0.4) {
      P(side, prof(L, rrPts(-hw, hw, 0, H - 0.03, 0, 0), 0), tc, std(0xf0f1f2, 0.9));
      P(side, prof(L, rrPts(-0.11, 0.11, H - 0.04, H, 0.008, 0.004), 1), tc, alu);
      return;
    }
    if (!glassy(side, plain)) {
      if (y0 < 0.14) P(side, prof(L, rrPts(-hw - 0.02, hw + 0.02, 0, 0.14, 0.012, 0), 0), tc, std(0x5d646e, 0.7));
      P(side, prof(L, rrPts(-hw, hw, Math.max(y0, 0.13), H - 0.06, 0, 0), 0), tc, std(0xf0f1f2, 0.9));
      P(side, prof(L, rrPts(-0.11, 0.11, H - 0.07, H, 0.012, 0.004), 1), tc, alu);
      if (y0 < 0.3) P(side, prof(L, rrPts(-hw - 0.004, hw + 0.004, 0.45 * H, 0.45 * H + 0.012, 0, 0), 0), tc, std(0x9aa1ab, 0.6));
      return;
    }
    var n = Math.max(1, Math.round(L / 1.5));
    var pw = L / n;
    var gy0 = 0.17;
    var gy1 = H - 0.075;
    P(side, prof(L, rrPts(-0.09, 0.09, 0, 0.14, 0.02, 0, 4), 1), tc, std(0xcfd5db, 0.7));
    P(side, prof(L, rrPts(-0.06, 0.06, 0.14, gy0, 0, 0), 0), tc, alu);
    P(side, prof(L, rrPts(-0.07, 0.07, H - 0.075, H, 0.02, 0, 4), 1), tc, alu);
    P(side, prof(L, rrPts(-0.04, 0.04, 0.62 * H, 0.62 * H + 0.035, 0, 0), 0), tc, alu);
    for (var i = 0; i <= n; i++) {
      var x = -L / 2 + i * pw;
      var m = new THREE.BoxGeometry(0.07, H - 0.14, 0.14);
      m.translate(x, 0.14 + (H - 0.14) / 2, 0);
      P(side, m, tc, alu);
      if (i < n) {
        var gl = new THREE.PlaneGeometry(pw - 0.06, gy1 - gy0);
        gl.translate(x + pw / 2, (gy0 + gy1) / 2, 0);
        P(side, gl, tc, glassMat);
        // the front's glare would always face away from the camera
        if (side === 'front') continue;
        var sh = new THREE.Shape();
        sh.moveTo(0, 0);
        sh.lineTo(0.12, 0);
        sh.lineTo(0.57, gy1 - gy0 - 0.02);
        sh.lineTo(0.45, gy1 - gy0 - 0.02);
        var st = new THREE.ShapeGeometry(sh);
        st.translate(x + pw * 0.25, gy0 + 0.01, 0.004);
        P(side, st, tc, glareMat);
      }
    }
  }
  function wall(side, a, b, gaps, plain) {
    runs(a, b, gaps).forEach(function (s) { body(side, s[0], s[1], plain, 0); });
    var H = topOf(side);
    var hw = halfOf(side, plain);
    gaps.forEach(function (g) {
      var g0 = g[0] - g[1] / 2;
      var g1 = g[0] + g[1] / 2;
      if (g0 < a - 0.01 || g1 > b + 0.01) return;
      if (glassy(side, plain)) {
        P(side, prof(g[1], rrPts(-0.07, 0.07, H - 0.075, H, 0.02, 0, 4), 1), g[0], alu);
      } else if (H > DOOR_H) {
        body(side, g0, g1, plain, DOOR_H);
        // the posts stand outside the gap, so the whole width stays open
        [g0 - 0.05, g1 + 0.05].forEach(function (x) {
          P(side, prof(0.1, rrPts(-hw - 0.04, hw + 0.04, 0, DOOR_H, 0.02, 0, 4), 1), x, alu);
        });
      }
    });
  }
  function corner(side, t, H) {
    P(side, col(rrPts(-0.18, 0.18, -0.18, 0.18, 0.02, 0.02, 3), 0, H + 0.02), t, alu);
  }

  // glass front: runs between the entrances, a thin frame over each doorway, posts and a canopy
  function front() {
    var ents = o.entrances;
    runs(-o.edge, o.wing, ents.map(function (e) { return [e.x, e.w]; })).forEach(function (s) { body('front', s[0], s[1], false, 0); });
    ents.forEach(function (e) {
      var half = e.w / 2 + 0.09;
      var rail = std(0xb5bdc6, 0.4, 0.6, 'none');
      [-1, 1].forEach(function (s) {
        P('front', col(rrPts(-0.09, 0.09, -0.14, 0.14, 0.02, 0.02, 3), 0, 0.9), e.x + s * half, alu);
        P('front', col(rrPts(s * half - 0.04, s * half + 0.04, -0.14, 1.6, 0.01, 0.01, 3), 0.82, 0.07), e.x, rail);
      });
      P('front', col(rrPts(-half - 0.04, half + 0.04, 1.5, 1.6, 0.01, 0.01, 3), 0.82, 0.07), e.x, rail);
      var cg = new THREE.PlaneGeometry(half * 2, 1.5);
      cg.rotateX(-Math.PI / 2);
      cg.translate(0, 0.87, -0.85);
      P('front', cg, e.x, glassMat);
    });
  }

  wall('east', o.back, o.front, [[1.0, 1]], false);
  wall('east', o.sb, o.back, [[-23, 1]], true);
  wall('west', o.back, o.front, [[o.tire.z, o.tire.w]], false);
  wall('west', o.sb, o.back, [], true);
  wall('wing', o.sb, o.front, [], false);
  wall('north', -o.edge, o.edge, o.docks.map(function (d) { return [d, 2]; }), true);
  wall('north', o.edge, o.wing, [], false);
  wall('back', -o.edge, o.edge, o.doors.map(function (d) { return [d, 1]; }), false);
  [['back', -o.edge, BACK_H], ['back', o.edge, BACK_H], ['west', o.front, WALL_H], ['east', o.front, WALL_H], ['west', o.sb, WALL_H], ['north', o.edge, WALL_H],
    ['wing', o.front, WALL_H], ['wing', o.sb, WALL_H]].forEach(function (c) { corner(c[0], c[1], c[2]); });
  front();

  var renders = [];
  var trims = [];
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
      m.castShadow = !b.m.transparent;
      m.receiveShadow = !b.m.transparent;
      if (b.m.transparent) m.renderOrder = 2;
      part.add(m);
    });
    groups[at[0]].add(part);
    if (at[1] === 'wall') renders.push(part);
    if (at[1] === 'trim') trims.push(part);
  });
  o.outer.push({ g: groups.west, n: [-1, 0] }, { g: groups.east, n: [1, 0], both: 1 }, { g: groups.wing, n: [1, 0] });
  return { west: groups.west, east: groups.east, wing: groups.wing, fixed: groups.fixed, wall: renders, trim: trims, lit: lit, glare: glareMat };
}
