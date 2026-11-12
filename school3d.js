import * as THREE from 'three';
import { clone } from 'three/addons/utils/SkeletonUtils.js';

// The school inside: a cutaway floor plan with low walls. Each room is a business; its furniture appears step by step as
// the business levels up (the steps are the milestones of VIEW in data.js).

export var FURN = ['desk', 'chairDesk', 'bookcaseClosed', 'bookcaseOpen', 'bookcaseClosedWide', 'books', 'table', 'chair', 'kitchenFridge',
  'kitchenCoffeeMachine', 'rugRound', 'pottedPlant', 'bench', 'loungeSofa', 'trashcan', 'coatRack', 'kitchenCabinet']
  .map(function (n) { return 'furniture/' + n; });

var FS = 0.75;
var WALL = 0xf3ead6;

// floor [x0, z0, x1, z1]; biz is the business that fills the room, hall belongs to the school itself
export var ROOMS = {
  hall: { name: 'Hallway', f: [0, 0, 0.9, 9.1], biz: 'school', col: 0xcfc8b8 },
  class1: { name: 'Classroom 1', f: [0.95, 0, 5.15, 2.2], biz: 'class', col: 0xd9b88a, tag: true },
  class2: { name: 'Classroom 2', f: [0.95, 2.3, 5.15, 4.5], biz: 'class', col: 0xd9b88a },
  lib: { name: 'Library', f: [0.95, 4.6, 5.15, 6.8], biz: 'lib', col: 0xb98a5a, tag: true },
  cafe: { name: 'Cafeteria', f: [0.95, 6.9, 5.15, 9.1], biz: 'cafeteria', col: 0xe9e2d0, tag: true },
  yard: { name: 'Playground', f: [0, 9.6, 5.15, 13.2], biz: 'yard', col: 0x8fd078, tag: true }
};

var cols = {};
function color(c) {
  return cols[c] || (cols[c] = new THREE.MeshLambertMaterial({ color: c }));
}

function box(w, h, d, col, x, y, z) {
  var m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), color(col));
  m.position.set(x, y + h / 2, z);
  m.castShadow = true;
  m.receiveShadow = true;
  return m;
}

// a figure of the people kit, standing, or seated in a chair
export function figure(lib, ref, clip, scale) {
  var m = lib.model(ref);
  if (!m.gltf) return { obj: new THREE.Group(), mixer: new THREE.AnimationMixer(new THREE.Group()), act: null };
  var obj = clone(m.gltf.scene);
  var mats = {};
  obj.traverse(function (o) {
    if (!o.isMesh) return;
    var src = o.material;
    var key = src.map ? src.map.uuid : src.uuid;
    if (!mats[key]) mats[key] = new THREE.MeshLambertMaterial({ map: src.map || null, color: src.map ? 0xffffff : src.color });
    o.material = mats[key];
  });
  obj.scale.setScalar(scale || 0.28);
  var g = new THREE.Group();
  g.add(obj);
  var mixer = new THREE.AnimationMixer(obj);
  var a = mixer.clipAction(THREE.AnimationClip.findByName(m.gltf.animations, clip));
  a.play();
  a.time = Math.random() * 2;
  return { obj: g, mixer: mixer, act: a };
}

export function SchoolInside(lib, folk) {
  var root = new THREE.Group();
  root.visible = false;
  var items = [];
  var mixers = [];
  var popping = [];
  var biz = {};
  var self = { root: root, biz: biz, rooms: ROOMS };
  var pf = 0;

  function model(ref, x, z, rot, s) {
    var m = lib.model(ref);
    var g = new THREE.Group();
    m.parts.forEach(function (p) {
      var mesh = new THREE.Mesh(p.geom, p.mat);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      g.add(mesh);
    });
    g.position.set(x, 0, z);
    g.rotation.y = rot || 0;
    g.scale.setScalar(s || FS);
    return g;
  }

  function person(x, z, rot, clip, scale, y) {
    var f = figure(lib, folk[pf++ % folk.length], clip, scale || 0.4);
    f.obj.position.set(x, y || 0, z);
    f.obj.rotation.y = rot || 0;
    mixers.push(f.mixer);
    return f.obj;
  }

  // adds a piece that shows from the given step of a room
  function add(room, step, node) {
    node.visible = false;
    root.add(node);
    items.push({ room: room, step: step, node: node, shown: false });
  }

  function walls() {
    var wall = function (x0, z0, x1, z1) {
      var m = box(Math.abs(x1 - x0) + 0.06, 0.2, Math.abs(z1 - z0) + 0.06, WALL, (x0 + x1) / 2, 0, (z0 + z1) / 2);
      root.add(m);
    };
    wall(0, 0, 5.15, 0);
    wall(0, 9.1, 5.15, 9.1);
    wall(0, 0, 0, 9.1);
    wall(5.15, 0, 5.15, 9.1);
    [[0, 2.25], [2.25, 4.55], [4.55, 6.85], [6.85, 9.1]].forEach(function (r, i) {
      if (i) wall(0.9, r[0] - 0.02, 5.15, r[0] - 0.02);
      // the wall along the hallway, with a door in the middle of each room
      var mid = (r[0] + r[1]) / 2;
      wall(0.9, r[0], 0.9, mid - 0.25);
      wall(0.9, mid + 0.25, 0.9, r[1]);
    });
    wall(0, 9.1, 0, 9.6);
    // the yard fence: low hedge boxes
    [[0, 9.6, 5.15, 9.6], [0, 13.2, 5.15, 13.2], [0, 9.6, 0, 13.2], [5.15, 9.6, 5.15, 13.2]].forEach(function (f) {
      root.add(box(Math.abs(f[2] - f[0]) + 0.1, 0.12, Math.abs(f[3] - f[1]) + 0.1, 0x4faa57, (f[0] + f[2]) / 2, 0, (f[1] + f[3]) / 2));
    });
  }

  function floors() {
    for (var k in ROOMS) {
      var f = ROOMS[k].f;
      var m = box(f[2] - f[0], 0.04, f[3] - f[1], ROOMS[k].col, (f[0] + f[2]) / 2, -0.04, (f[1] + f[3]) / 2);
      m.castShadow = false;
      root.add(m);
    }
    // a pale slab under the whole building
    root.add(box(5.4, 0.02, 9.4, 0xb8b2a2, 2.575, -0.06, 4.55));
  }

  function classroom(room, x0, z0) {
    var L = function (a) { return x0 + a; };
    var Z = function (a) { return z0 + a; };
    var board = new THREE.Group();
    board.add(box(1.9, 0.3, 0.03, 0x2f5a3f, L(2.1), 0.08, Z(0.07)));
    board.add(box(1.96, 0.02, 0.04, 0xf4f0e4, L(2.1), 0.08, Z(0.07)));
    add(room, 1, board);
    var t = new THREE.Group();
    t.add(model('furniture/desk', L(2.1), Z(0.5), 0));
    t.add(person(L(2.1), Z(0.28), 0, 'idle', 0.42));
    add(room, 1, t);
    var cx = [0.7, 1.5, 2.7, 3.5];
    [0.95, 1.35, 1.75].forEach(function (rz, row) {
      var d = new THREE.Group();
      var c = new THREE.Group();
      var k = new THREE.Group();
      cx.forEach(function (x) {
        d.add(model('furniture/desk', L(x), Z(rz), Math.PI));
        c.add(model('furniture/chairDesk', L(x), Z(rz + 0.24), Math.PI));
        k.add(person(L(x), Z(rz + 0.26), Math.PI, 'sit', 0.4, 0.02));
      });
      var base = row === 0 ? 2 : row === 1 ? 4 : 7;
      add(room, base, d);
      add(room, row === 0 ? 3 : base, c);
      add(room, row === 0 ? 5 : row === 1 ? 6 : 8, k);
    });
    var deco = new THREE.Group();
    deco.add(model('furniture/bookcaseClosed', L(4.05), Z(0.35), 0));
    deco.add(model('furniture/bookcaseClosed', L(0.25), Z(0.35), 0));
    deco.add(model('furniture/pottedPlant', L(3.95), Z(1.95), 0));
    deco.add(model('furniture/rugRound', L(2.1), Z(0.9), 0, 0.5));
    add(room, 8, deco);
  }

  function library(x0, z0) {
    var L = function (a) { return x0 + a; };
    var Z = function (a) { return z0 + a; };
    var a = new THREE.Group();
    [0.5, 1.15, 1.8, 2.45, 3.1, 3.75].forEach(function (x) { a.add(model('furniture/bookcaseClosedWide', L(x), Z(0.18), 0, 0.7)); });
    add('lib', 1, a);
    var b = new THREE.Group();
    [1.2, 2.6].forEach(function (x) {
      b.add(model('furniture/table', L(x), Z(1.1), 0));
      [-0.3, 0.3].forEach(function (dx) {
        b.add(model('furniture/chair', L(x + dx), Z(0.8), Math.PI));
        b.add(model('furniture/chair', L(x + dx), Z(1.4), 0));
      });
    });
    add('lib', 2, b);
    var c = new THREE.Group();
    [0.6, 1.2, 1.8].forEach(function (z) {
      c.add(model('furniture/bookcaseOpen', L(4.0), Z(z), -Math.PI / 2));
      c.add(model('furniture/bookcaseOpen', L(0.2), Z(z + 0.2), Math.PI / 2));
    });
    add('lib', 3, c);
    var d = new THREE.Group();
    [1.2, 2.6].forEach(function (x) {
      d.add(model('furniture/books', L(x - 0.15), Z(1.1), 0.4, 1));
      d.add(model('furniture/books', L(x + 0.15), Z(1.12), -0.3, 1));
    });
    d.add(model('furniture/pottedPlant', L(0.35), Z(1.9), 0));
    d.add(model('furniture/pottedPlant', L(3.9), Z(1.9), 0));
    add('lib', 4, d);
    var e = new THREE.Group();
    e.add(model('furniture/rugRound', L(3.4), Z(1.6), 0, 0.6));
    e.add(model('furniture/loungeSofa', L(3.4), Z(1.95), Math.PI, 0.6));
    add('lib', 5, e);
    var f = new THREE.Group();
    f.add(person(L(1.2), Z(0.85), Math.PI, 'sit', 0.4, 0.02));
    f.add(person(L(2.6), Z(1.4), 0, 'sit', 0.4, 0.02));
    f.add(person(L(3.4), Z(1.8), 0, 'idle', 0.4));
    f.add(person(L(0.8), Z(0.6), 0, 'idle', 0.42));
    add('lib', 6, f);
  }

  function cafeteria(x0, z0) {
    var L = function (a) { return x0 + a; };
    var Z = function (a) { return z0 + a; };
    var a = new THREE.Group();
    for (var i = 0; i < 7; i++) a.add(model('furniture/kitchenCabinet', L(0.4 + i * 0.5), Z(0.25), 0, 0.8));
    add('cafe', 1, a);
    var tx = [1.0, 2.2, 3.4];
    var tz = 1.2;
    [0, 1, 2].forEach(function (i) {
      var t = new THREE.Group();
      t.add(model('furniture/table', L(tx[i]), Z(tz), 0));
      add('cafe', i === 0 ? 2 : i === 1 ? 3 : 4, t);
      var c = new THREE.Group();
      [-0.28, 0.28].forEach(function (dx) {
        c.add(model('furniture/chair', L(tx[i] + dx), Z(tz - 0.3), Math.PI));
        c.add(model('furniture/chair', L(tx[i] + dx), Z(tz + 0.3), 0));
      });
      add('cafe', 4, c);
    });
    var f = new THREE.Group();
    f.add(model('furniture/kitchenFridge', L(4.0), Z(0.3), 0, 0.75));
    f.add(model('furniture/kitchenCoffeeMachine', L(0.5), Z(0.28), 0, 0.8));
    add('cafe', 5, f);
    var k = new THREE.Group();
    [[1.0, 0.9], [1.0, 1.5], [2.2, 0.9], [2.2, 1.5], [3.4, 0.9], [3.4, 1.5]].forEach(function (q, i) {
      k.add(person(L(q[0] + (i % 2 ? 0.28 : -0.28)), Z(q[1]), i % 2 ? 0 : Math.PI, 'sit', 0.4, 0.02));
    });
    add('cafe', 6, k);
    var l = new THREE.Group();
    l.add(person(L(2.0), Z(0.1), 0, 'idle', 0.42));
    l.add(model('furniture/trashcan', L(4.7), Z(0.4), 0));
    l.add(model('furniture/trashcan', L(0.25), Z(1.9), 0));
    add('cafe', 7, l);
  }

  function yard() {
    var Z = 9.6;
    var fence = new THREE.Group();
    add('yard', 1, fence);
    fence.add(box(5.0, 0.01, 3.4, 0x8fd078, 2.575, 0, 11.4));
    var sw = new THREE.Group();
    sw.add(box(0.03, 0.4, 0.03, 0xdd5544, 0.6, 0, Z + 0.6));
    sw.add(box(0.03, 0.4, 0.03, 0xdd5544, 0.6, 0, Z + 1.2));
    sw.add(box(0.03, 0.4, 0.03, 0xdd5544, 1.5, 0, Z + 0.6));
    sw.add(box(0.03, 0.4, 0.03, 0xdd5544, 1.5, 0, Z + 1.2));
    sw.add(box(0.9, 0.03, 0.03, 0xdd5544, 1.05, 0.38, Z + 0.6));
    sw.add(box(0.9, 0.03, 0.03, 0xdd5544, 1.05, 0.38, Z + 1.2));
    [0.8, 1.3].forEach(function (x) {
      sw.add(box(0.015, 0.22, 0.015, 0x333344, x, 0.16, Z + 0.6));
      sw.add(box(0.1, 0.02, 0.07, 0xffc044, x, 0.14, Z + 0.6));
    });
    add('yard', 2, sw);
    var sl = new THREE.Group();
    sl.add(box(0.4, 0.04, 0.9, 0xffc044, 4.2, 0.12, Z + 0.9));
    sl.add(box(0.4, 0.3, 0.06, 0x2f6e8f, 4.2, 0, Z + 0.4));
    sl.add(box(0.4, 0.04, 0.3, 0x2f6e8f, 4.2, 0.26, Z + 0.35));
    add('yard', 3, sl);
    var sb = new THREE.Group();
    sb.add(box(1.0, 0.03, 0.9, 0xe6d3a0, 2.6, 0, Z + 2.5));
    [[2.6, Z + 2.04, 1.1, 0.04], [2.6, Z + 2.96, 1.1, 0.04]].forEach(function (b) { sb.add(box(b[2], 0.08, b[3], 0xa8793a, b[0], 0, b[1])); });
    add('yard', 4, sb);
    var bn = new THREE.Group();
    bn.add(model('furniture/bench', 4.5, Z + 2.5, -Math.PI / 2, 0.9));
    bn.add(model('furniture/bench', 0.6, Z + 2.8, Math.PI / 2, 0.9));
    bn.add(model('suburban/tree-large', 4.8, Z + 3.1, 0, 1.6));
    bn.add(model('suburban/tree-large', 0.35, Z + 0.3, 0, 1.6));
    add('yard', 5, bn);
    var sa = new THREE.Group();
    sa.add(box(1.0, 0.04, 0.12, 0x8a5a34, 3.0, 0.1, Z + 1.0));
    sa.add(box(0.06, 0.1, 0.06, 0x555a6a, 3.0, 0, Z + 1.0));
    var rd = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.03, 16), color(0x2f6e8f));
    rd.position.set(1.6, 0.08, Z + 2.2);
    sa.add(rd);
    add('yard', 6, sa);
    var kd = new THREE.Group();
    [[1.0, Z + 1.7, 0], [3.0, Z + 1.7, 2], [1.7, Z + 2.5, 4], [2.4, Z + 0.3, 1]].forEach(function (q) {
      kd.add(person(q[0], q[1], q[2], q[2] > 2 ? 'idle' : 'walk', 0.4));
    });
    add('yard', 7, kd);
  }

  function hall() {
    var a = new THREE.Group();
    [0.5, 1.0, 1.5, 2.0, 2.5, 3.0, 3.5, 4.0, 4.5, 5.0, 5.5, 6.0, 6.5, 7.0, 7.5, 8.0, 8.5].forEach(function (z, i) {
      a.add(box(0.08, 0.2, 0.34, [0x2a5fa8, 0xd9433a, 0x2f8f5a][i % 3], 0.06, 0, z));
    });
    add('hall', 1, a);
    var b = new THREE.Group();
    [1.6, 3.4, 5.6, 7.8].forEach(function (z) { b.add(model('furniture/coatRack', 0.8, z, -Math.PI / 2, 0.8)); });
    add('hall', 2, b);
    var c = new THREE.Group();
    [0.5, 4.5, 8.6].forEach(function (z) { c.add(model('furniture/pottedPlant', 0.45, z, 0, 0.8)); });
    add('hall', 3, c);
    var d = new THREE.Group();
    [2.4, 6.5].forEach(function (z) { d.add(model('furniture/bench', 0.45, z, Math.PI / 2, 0.9)); });
    add('hall', 4, d);
    var e = new THREE.Group();
    e.add(person(0.45, 3.0, Math.PI / 2, 'walk', 0.42));
    e.add(person(0.45, 5.0, -Math.PI / 2, 'idle', 0.42));
    e.add(person(0.45, 7.2, Math.PI / 2, 'idle', 0.4));
    add('hall', 5, e);
  }

  walls();
  floors();
  classroom('class1', ROOMS.class1.f[0], ROOMS.class1.f[1]);
  classroom('class2', ROOMS.class2.f[0], ROOMS.class2.f[1]);
  library(ROOMS.lib.f[0], ROOMS.lib.f[1]);
  cafeteria(ROOMS.cafe.f[0], ROOMS.cafe.f[1]);
  yard();
  hall();

  // the businesses of the rooms, with a tap box over each room
  self.picks = [];
  for (var k in ROOMS) {
    var r = ROOMS[k];
    if (!r.tag) continue;
    var f = r.f;
    var cx = (f[0] + f[2]) / 2;
    var cz = (f[1] + f[3]) / 2;
    var pick = new THREE.Mesh(new THREE.BoxGeometry(f[2] - f[0], 0.4, f[3] - f[1]), new THREE.MeshBasicMaterial({ visible: false }));
    pick.position.set(cx, 0.2, cz);
    pick.userData.id = r.biz;
    root.add(pick);
    self.picks.push(pick);
    biz[r.biz] = { at: [cx, 0, cz], top: (function (x, z) { return function () { return [x, 0.75, z]; }; })(cx, cz), room: k, shown: 1, inside: true };
  }

  // shows the pieces whose step has been reached; new ones pop in
  self.sync = function (animate) {
    var changed = false;
    items.forEach(function (it) {
      var b = ROOMS[it.room].biz;
      var on = it.step <= shape(b);
      if (on === it.shown) return;
      it.shown = on;
      changed = true;
      it.node.visible = on;
      if (!on) it.node.position.set(0, 0, 0);
      if (on && animate) {
        it.node.scale.setScalar(0.01);
        it.t = 0;
        popping.push(it);
      }
    });
    return changed;
  };

  // true when a piece finished popping in, so the caller can redraw the shadows
  self.update = function (dt) {
    var done = false;
    mixers.forEach(function (m) { m.update(dt); });
    for (var i = popping.length - 1; i >= 0; i--) {
      var it = popping[i];
      it.t += dt / 0.45;
      var u = Math.min(1, it.t);
      var s = u < 1 ? 1 + 0.25 * Math.sin(u * Math.PI) - (1 - u) * 0.99 * (1 - u) : 1;
      s = Math.max(0.01, s);
      var f = ROOMS[it.room].f;
      it.node.scale.setScalar(s);
      it.node.position.set((f[0] + f[2]) / 2 * (1 - s), 0, (f[1] + f[3]) / 2 * (1 - s));
      if (u >= 1) {
        it.node.scale.setScalar(1);
        it.node.position.set(0, 0, 0);
        popping.splice(i, 1);
        done = true;
      }
    }
    return done;
  };

  self.roomZ = function (room) {
    var f = ROOMS[room] ? ROOMS[room].f : ROOMS.class1.f;
    return (f[1] + f[3]) / 2;
  };

  return self;
}
