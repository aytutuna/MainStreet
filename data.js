// Businesses in unlock order. cy: cycle in seconds, c0: price of level 1 (the unlock), g: price growth per level,
// r: revenue per level and cycle, m: manager price. ic: sprite shown on the row.
var BIZ = [
  { id: 'homes', name: 'Homes', ic: 'house_y', cy: 1, c0: 4, g: 1.1, r: 1, m: 20000 },
  { id: 'bakery', name: 'Bakery', ic: 'bakery_1', cy: 3, c0: 60, g: 1.15, r: 0.643, m: 720 },
  { id: 'cafe', name: 'Cafe', ic: 'cafe_1', cy: 6, c0: 600, g: 1.14, r: 11, m: 7200 },
  { id: 'grocery', name: 'Grocery', ic: 'market_1', cy: 12, c0: 6000, g: 1.13, r: 188, m: 72000 },
  { id: 'icecream', name: 'Ice Cream', ic: 'icecream_3', cy: 20, c0: 60000, g: 1.12, r: 2680, m: 7.2e5 },
  { id: 'flower', name: 'Flower Shop', ic: 'stora_1', cy: 30, c0: 6e5, g: 1.11, r: 34300, m: 7.2e6 },
  { id: 'books', name: 'Bookstore', ic: 'storb_1', cy: 45, c0: 6e6, g: 1.11, r: 4.4e5, m: 7.2e7 },
  { id: 'toys', name: 'Toy Store', ic: 'storc_1', cy: 60, c0: 6e7, g: 1.1, r: 5.01e6, m: 7.2e8 },
  { id: 'restaurant', name: 'Restaurant', ic: 'restaurant_1', cy: 90, c0: 6e8, g: 1.09, r: 6.43e7, m: 7.2e9 },
  { id: 'school', name: 'School', ic: 'school_1', cy: 120, c0: 6e9, g: 1.08, r: 7.32e8, m: 7.2e10 },
  { id: 'class', name: 'Classrooms', ic: 'board', cy: 150, c0: 3.6e11, g: 1.07, r: 4.69e10, m: 4.3e12 },
  { id: 'lib', name: 'Library', ic: 'bookcase', cy: 180, c0: 2.2e13, g: 1.07, r: 2.94e12, m: 2.6e14 },
  { id: 'cafeteria', name: 'Cafeteria', ic: 'counter', cy: 210, c0: 1.3e15, g: 1.07, r: 1.73e14, m: 1.6e16 },
  { id: 'yard', name: 'Playground', ic: 'toy1', cy: 240, c0: 7.8e16, g: 1.07, r: 1.02e16, m: 9.4e17 },
  { id: 'hosp', name: 'Hospital', ic: 'clinic_3', cy: 300, c0: 4.7e18, g: 1.07, r: 6.54e17, m: 5.6e19 }
];

// level thresholds: [level, revenue x, cycle x2]. Levels 1, 10, 25, 50 and 100 also change the building
var MS = [[10, 2, 0], [25, 2, 1], [50, 3, 0], [100, 2, 1], [200, 3, 0], [300, 3, 0], [400, 3, 0]];
var MS_GEMS = [1, 2, 3, 5, 8, 10, 15];
var STAGE = [1, 10, 25, 50, 100];

// the park: a few levels, each raises all income by 20%
var PARK = { after: 'flower', cost: [5e6, 1e8, 2e9, 4e10], boost: 0.2 };

// levels at which what is drawn changes, where that is finer than STAGE. An `of` takes the level of another business
var VIEW = {
  homes: [1, 1, 2, 3, 5, 7, 10, 13, 17, 20, 22, 24, 25, 50, 100],
  class: [1, 3, 5, 10, 15, 25, 50, 100],
  lib: [1, 5, 10, 25, 50, 100],
  cafeteria: [1, 5, 10, 25, 50, 75, 100],
  yard: [1, 5, 10, 25, 50, 75, 100],
  rest: { of: 'school', lv: [1, 5, 10, 25, 50] },
  park: [1, 2, 3, 4]
};


// The town in 16 px tiles. A boulevard runs north from the entrance to a civic circle; Main Street and Market Street
// leave it to the east and the neighbourhood lies to the west. Every building faces south onto a street or a walk.
var TW = 108;
var TH = 122;
var B1 = 109; // building line of the shops on Main Street
var B2 = 71; // and of those on Market Street
var MY = B1 + 5.5; // centre of Main Street
var NY = B2 + 5.5; // centre of Market Street

function L(x0, y0, x1, y1) {
  return ['L', x0, y0, x1, y1];
}
function A(cx, cy, r, a0, a1) {
  return ['A', cx, cy, r, a0, a1];
}

// w: asphalt width, sw: sidewalk each side, mark: dashed centre line
var ROADS = [
  { w: 3, sw: 1, mark: 1, p: [L(46.5, 126, 46.5, 41)] },
  { w: 3, sw: 1, mark: 1, p: [L(53.5, 126, 53.5, 41)] },
  { w: 3.5, sw: 1, p: [A(50, 38.5, 6.25, 0, 360)] },
  { w: 3, sw: 1, mark: 1, p: [L(7.5, 38.5, 44, 38.5)] },
  { w: 9, sw: 1, p: [L(7.5, 38.5, 7.5, 38.5)] },
  { w: 3, sw: 1, mark: 1, p: [L(38.5, 39, 38.5, 114.5), A(41.5, 114.5, 3, 180, 90), L(41.5, 117.5, 45, 117.5)] },
  { w: 3, sw: 1, mark: 1, p: [L(38, 48.5, 12, 48.5), A(12, 57.5, 9, 270, 90), L(12, 66.5, 38, 66.5)] },
  { w: 3, sw: 1, mark: 1, p: [L(6.5, 87.5, 38, 87.5)] },
  { w: 9, sw: 1, p: [L(6.5, 87.5, 6.5, 87.5)] },
  { w: 3, sw: 1, mark: 1, p: [L(6.5, 111.5, 38, 111.5)] },
  { w: 9, sw: 1, p: [L(6.5, 111.5, 6.5, 111.5)] },
  { w: 2, sw: 1, p: [L(21, 37, 21, 34), A(23, 34, 2, 180, 270), L(23, 32, 33, 32), A(33, 34, 2, 270, 360), L(35, 34, 35, 37)] },
  { w: 3, sw: 1, mark: 1, p: [L(50, 38.5, 97.5, 38.5), A(97.5, 44.5, 6, 270, 360), L(103.5, 44.5, 103.5, MY - 6),
    A(97.5, MY - 6, 6, 0, 90), L(97.5, MY, 52, MY)] },
  { w: 3, sw: 1, mark: 1, p: [L(52, NY, 103.5, NY)] }
];

// planted islands and the kerb parking bays; they cover the roads under them
var OVER = [
  { k: 'disc', x: 50, y: 38.5, r: 4.5 },
  { k: 'plant', x: 48, y: 47.5, w: 4, h: TH - 47.5 },
  { k: 'bay', x: 59, y: B1 + 2, w: 36, h: 2 },
  { k: 'bay', x: 59, y: B2 + 2, w: 40, h: 2 }
];

// every tile that is not road is declared here: [kind, x, y, w, h]
var ZONES = [
  ['lawn', 0, 0, TW, 3],
  ['hedge', 0, 3, 1, 114],
  ['lawn', 106, 3, 2, 114],
  ['lawn', 1, 3, 15, 38],
  ['lawn', 16, 3, 24, 33],
  ['plaza', 20, 28, 16, 2],
  ['plaza', 4, 28, 10, 4],
  ['lawn', 40, 3, 20, 26],
  ['plaza', 40, 29, 20, 8],
  ['lawn', 60, 3, 46, 33],
  ['lawn', 1, 41, 35, 5],
  ['lawn', 41, 41, 3, 76],
  ['lawn', 56, 41, 2, 76],
  ['lawn', 1, 46, 35, 71],
  ['hedge', 12, 51, 23, 1],
  ['hedge', 1, 69, 35, 1],
  ['hedge', 1, 93, 35, 1],
  ['hedge', 58, 41, 1, 30],
  ['hedge', 99, 41, 2, 30],
  ['hedge', 58, 79, 1, 30],
  ['hedge', 99, 79, 2, 30],
  ['park', 59, B2 - 30, 40, 12],
  ['hedge', 59, B2 - 18, 40, 1],
  ['plaza', 59, B2 - 17, 40, 17],
  ['park', 59, B1 - 30, 40, 12],
  ['hedge', 59, B1 - 18, 40, 1],
  ['plaza', 59, B1 - 17, 40, 17],
  ['plaza', 58, B2, 43, 4],
  ['plaza', 58, B1, 43, 4],
  ['lawn', 100, 36, 6, 6],
  ['lawn', 100, 111, 6, 6],
  ['lawn', 0, 117, TW, 5]
];

// fenced land until the business on it is bought: rects of [x, y, w, h]; biz is the business that lifts the fence
var LANDS = {
  hosp: { name: 'Hospital', rects: [[40, 3, 20, 26]], biz: 'hosp', view: 'clinic_3' },
  park: { name: 'Park', rects: [[60, 3, 46, 33]], biz: 'park', view: 'park_5' },
  school: { name: 'School', rects: [[16, 3, 24, 33]], biz: 'school', view: 'school_1' }
};

// where each business is drawn, the one link between the economy and the map. door: tile at the front door (the manager
// stands there and the coin stack sits over it); tag: tile where its label hangs, default above the building; rects:
// tap area [x, y, w, h] in tiles. A business in the school gives the room it fills instead.
var PLACE = {
  homes: { door: [17.5, 64], tag: [17.5, 54], rects: [[1, 46, 35, 71]] },
  bakery: { door: [64, B1], rects: [[59, B1 - 14, 10, 14]] },
  cafe: { door: [74, B1], rects: [[69, B1 - 14, 10, 14]] },
  grocery: { door: [84, B1], rects: [[79, B1 - 14, 10, 14]] },
  icecream: { door: [94, B1], rects: [[89, B1 - 14, 10, 14]] },
  flower: { door: [64, B2], rects: [[59, B2 - 14, 10, 14]] },
  books: { door: [74, B2], rects: [[69, B2 - 14, 10, 14]] },
  toys: { door: [84, B2], rects: [[79, B2 - 14, 10, 14]] },
  restaurant: { door: [94, B2], rects: [[89, B2 - 14, 10, 14]] },
  school: { door: [28, 28], tag: [28, 8], rects: [[16, 3, 24, 33], [1, 3, 15, 38]] },
  hosp: { door: [50, 28.5], tag: [50, 8], rects: [[40, 3, 20, 26]] },
  park: { door: [83, 34], tag: [83, 24], rects: [[60, 3, 46, 33]] },
  class: { room: 'class1' },
  lib: { room: 'lib' },
  cafeteria: { room: 'cafe' },
  yard: { room: 'yard' }
};

var PIECES = [];
// a piece stands with the bottom centre of its sprite at (x, y) tiles. spr maps a step of its project to a sprite;
// '-' hides it. z 0 is ground, drawn before everything else. A sprite name 'name:h' is the sprite stretched to h tiles
function pc(key, x, y, spr, z) {
  var p = { k: key, x: x, y: y, s: spr, z: z === 0 ? 0 : 1 };
  PIECES.push(p);
  return p;
}
// a car in a bay: dir 0 down, 1 west, 2 east, 3 up; its sprite is cut from the sheet
function park(key, x, y, spr, dir) {
  var p = pc(key, x, y, spr);
  p.car = dir;
  return p;
}

var SHOPS = [['bakery', 'bakery'], ['cafe', 'cafe'], ['grocery', 'market'], ['icecream', 'icecream'], ['flower', 'stora'], ['books', 'storb'],
  ['toys', 'storc'], ['restaurant', 'restaurant']];
var SHOP_LV = { cafe: [1, 4, 5], icecream: [3, 3, 5], restaurant: [1, 3, 3] };
var HOME_STYLES = ['house_y', 'house_g', 'house_b'];
function pickAt(spr, c) {
  var best = -1;
  for (var k in spr) if (+k <= c && +k > best) best = +k;
  var s = best < 0 ? null : spr[best];
  return s === '-' ? null : s;
}

// homes: [left edge, rear line, street line] of each lot, 11 tiles wide. A cottage comes with its fence, gate, shed and
// vegetable beds; the farm houses that replace them have their door at a different place, so the gate moves
var LOTS = [[12, 52, 64], [24, 52, 64], [25, 70, 85], [13, 70, 85], [1, 70, 82], [25, 94, 109], [13, 94, 109], [1, 94, 106]];
var GROUP = [0, 0, 1, 1, 1, 2, 2, 2];
(function () {
  LOTS.forEach(function (l, i) {
    var x0 = l[0];
    var t = l[1];
    var n = l[2];
    var d = n - t;
    var c = i % 2;
    var s = 2 + i;
    var up = 13 + GROUP[i];
    var px = function (v) { return x0 + v / 16; };
    var rear = function (v) { return t + v / 16; };
    var front = function (v) { return n - 12 + v / 16; };
    var at = function (step, spr, x, y) {
      var o = {};
      o[step] = spr;
      pc('homes', px(x), y, o);
    };
    var ground = { 1: 'lot_home:' + d };
    ground[s] = '-';
    pc('homes', x0 + 5.5, n, ground, 0);
    var cot = {};
    var farm = {};
    var fen = {};
    cot[s] = HOME_STYLES[i % 3];
    cot[up] = '-';
    farm[up] = c ? 'farm_b' : 'farm_a';
    fen[s] = 'lot_fence_c:' + d;
    fen[up] = (c ? 'lot_fence_b:' : 'lot_fence_a:') + d;
    pc('homes', x0 + 5, n, cot);
    pc('homes', x0 + (c ? 6 : 5.8125), n, farm);
    pc('homes', x0 + 5.5, n, fen);
    at(s, c ? 'shed_r' : 'shed', c ? 146 : 30, rear(84));
    for (var k = 0; k < 4; k++) {
      at(s, 'sprout', (c ? 58 : 78) + k * 16, rear(78));
      at(s, 'sprout', (c ? 58 : 78) + k * 16, rear(66));
    }
    for (var b = 0; b < 2; b++) {
      at(s, 'gbush', 14, front(110 + b * 36));
      at(s, 'gbush', 162, front(110 + b * 36));
    }
    for (var f = 0; f < 3; f++) {
      at(10, 'poppy', 46 - f * 8, front(172));
      at(10, 'sunflower', 130 + f * 8, front(172));
    }
    at(10, 'fbush', c ? 22 : 154, front(150));
    at(11, 'crate', c ? 38 : 138, rear(74));
    at(11, 'birdhouse', c ? 150 : 24, rear(66));
    at(11, 'can', c ? 134 : 42, front(150));
    // the hedge in the gap between this lot and the next one to its east
    for (var h = 0; h < d / 3; h++) pc('homes', x0 + 11.5, n - 1 - h * 3, { 12: 'fbush' });
  });
  // street lamps along the kerbs, and trees where the verge is wide enough
  [16, 28].forEach(function (x) {
    pc('homes', x, 68.6, { 12: 'lamp' });
    pc('homes', x, 46.6, { 12: 'lamp' });
  });
  [22.5, 34].forEach(function (x) { pc('homes', x, 46.6, { 12: 'tree' }); });
  [20, 32].forEach(function (x) {
    pc('homes', x, 89.6, { 12: 'lamp' });
    pc('homes', x, 113.6, { 12: 'lamp' });
  });
  [14, 26, 36].forEach(function (x, j) {
    if (j < 2) {
      pc('homes', x + 1, 92.6, { 12: 'tree' });
      pc('homes', x + 1, 116.6, { 12: 'tree' });
    }
  });
  [58, 70, 82, 94, 106].forEach(function (y) { pc('homes', 40.5, y, { 12: 'lamp' }); });
  pc('homes', 8.5, 58.5, { 12: 'tree' });
})();

// main street: two rows of four shops, each on its own building line. Behind a shop is a paved service yard with bins and
// crates along its far edge, then a planted strip, then the car park
(function () {
  var cars = ['car_01', 'car_03', 'car_05', 'car_10'];
  SHOPS.forEach(function (sh) {
    var id = sh[0];
    var name = sh[1];
    var lv = SHOP_LV[name] || [1, 3, 5];
    // a lot with a building site while locked, then the building of each of the five stages
    var o = {};
    o[1] = name + '_' + lv[0];
    o[2] = name + '_' + lv[1];
    o[3] = name + '_' + lv[1];
    o[4] = name + '_' + lv[2];
    o[5] = name + '_' + lv[2];
    var x = PLACE[id].door[0];
    var b = PLACE[id].door[1];
    pc(id, x, b, { 0: 'lot_shop', 1: '-' }, 0);
    pc(id, x, b, { 0: 'con_shop', 1: '-' });
    PLACE[id].piece = pc(id, x, b, o);
    pc(id, x - 3.5, b - 15.3, { 1: 'bin' });
    pc(id, x + 3.5, b - 15.1, { 1: 'crate' });
  });
  // car parks: one double row of bays, 2 wide and 3 deep, between two aisles
  [B2 - 30, B1 - 30].forEach(function (top, r) {
    [3, 6].forEach(function (ry, j) {
      for (var i = 0; i < 20; i++) {
        if ((i * 7 + j * 5 + r * 3) % 5 > 1) continue;
        var o = {};
        o[1] = cars[(i + j + r) % 4];
        park('town', 60 + i * 2, top + ry + 2.4, o, j ? 3 : 0);
      }
    });
  });
  // kerb bays along the front walks; the cars face the way the lane beside them goes
  [[B1, 36], [B2, 40]].forEach(function (st, r) {
    for (var i = 0; i < Math.floor(st[1] / 3); i++) {
      if ((i * 5 + r * 2) % 3 === 1) continue;
      var o = {};
      o[1] = cars[(i + r) % 4];
      park('town', 60.5 + i * 3, st[0] + 3, o, 1);
    }
  });
  for (var rr = 0; rr < 2; rr++) {
    var b2 = rr ? B2 : B1;
    for (var t = 65; t <= 89; t += 12) pc('town', t, b2 + 7.6, { 1: 'tree' });
    for (var l = 71; l <= 95; l += 12) pc('town', l, b2 + 7.6, { 1: 'lamp' });
    for (var bn = 69; bn <= 89; bn += 10) pc('town', bn, b2 + 1.9, { 1: 'bench' });
  }
})();

// the town: public planting that is there from the start
(function () {
  var all = function (spr, x, y) { pc('town', x, y, { 1: spr }); };
  for (var x = 3; x <= 105; x += 6) {
    all('tree', x, 2.9);
    if (x < 42 || x > 58) all('tree', x, 121.5);
  }
  for (var y = 8; y <= 112; y += 6) all('tree', 107, y);
  // the median: trees and lamps alternate every six tiles
  for (var m = 52; m <= 116; m += 6) all(m % 12 === 4 ? 'tree' : 'lamp', 50, m);
  for (var w = 52; w <= 100; w += 12) all('tree', 42.5, w);
  [52, 64, 88, 100].forEach(function (e) { all('tree', 57, e); });
  // the civic circle and the forecourt in front of the hospital
  all('oak', 50, 41);
  [[43.5, 32.8, 'tree'], [56.5, 32.8, 'tree'], [41.2, 35.7, 'lamp'], [58.8, 35.7, 'lamp']].forEach(function (q) { all(q[2], q[0], q[1]); });
  // Maple Green
  [6, 13, 19.5, 26].forEach(function (g) { all('tree', g, 44.4); });
  all('bench', 16, 42.4);
  all('bench', 23, 42);
  // school grounds: trees along the edges and on the island of the drop-off loop
  [25, 31].forEach(function (i) { all('tree', i, 35.8); });
  for (var e2 = 8; e2 <= 26; e2 += 6) {
    all('tree', 38, e2);
    all('tree', 18, e2);
  }
})();

// the school grows with its level; the playground gear outside comes with the Playground inside
(function () {
  pc('school', 28, 28, { 1: 'school_1', 2: 'school_2', 3: 'school_3', 4: 'school_4', 5: 'school_5' });
  pc('school', 9, 24.5, { 1: 'court' });
  pc('school', 6.5, 31.4, { 1: 'bench' });
  pc('school', 11.5, 31.4, { 1: 'bench' });
  pc('yard', 6.5, 31.4, { 4: 'toy_bars' });
  pc('yard', 11.5, 31.4, { 4: 'toy_slide' });
  for (var x = 4; x <= 34; x += 6) pc('school', x, 6, { 1: 'tree' });
  for (var y = 12; y <= 24; y += 6) pc('school', 2.5, y, { 1: 'tree' });
})();

// the hospital and the park, each on the land that is fenced until it is bought
(function () {
  pc('hosp', 50, 28.5, { 1: 'clinic_3' });
  [67.5, 83, 98.5].forEach(function (x, i) { pc('park', x, 34.5, i ? (i === 1 ? { 2: 'park_5' } : { 3: 'park_5' }) : { 1: 'park_5' }); });
  for (var t = 64; t <= 102; t += 6) pc('park', t, 20.5, { 4: 'tree' });
  [70, 83, 96].forEach(function (x) { pc('park', x, 24, { 4: 'bench' }); });
})();

// cars drive these loops; (x, y) in tiles, smoothed once at load
function arcPts(cx, cy, r, a0, a1) {
  var out = [];
  var n = Math.max(2, Math.ceil(Math.abs(a1 - a0) / 12));
  for (var i = 0; i <= n; i++) {
    var a = (a0 + (a1 - a0) * i / n) * Math.PI / 180;
    out.push([cx + r * Math.cos(a), cy + r * Math.sin(a)]);
  }
  return out;
}
function loop() {
  var pts = [];
  for (var i = 0; i < arguments.length; i++) pts = pts.concat(arguments[i]);
  return pts;
}
var RING = 6.3;
var CAR_ROUTES = [
  { n: 0, p: loop([[54.25, 123], [54.25, 43.2]], arcPts(50, 38.5, RING, 47.6, -227.6), [[45.75, 43.2], [45.75, 123]]) },
  { n: 3, p: loop([[54.25, 123], [54.25, 118], [54.25, 116.2], [55.4, 115.3], [58, 115.25], [97.5, 115.25]], arcPts(97.5, MY - 6, 6.75, 90, 0),
    [[104.25, 80], [104, 77.2], [103, 75.9], [101.5, NY - 0.75], [56, NY - 0.75], [54.7, NY - 1.2], [54.25, NY - 3], [54.25, 43.2]],
    arcPts(50, 38.5, RING, 47.6, -227.6), [[45.75, 43.2], [45.75, 123]]) },
  { n: 6, p: loop([[54.25, 123], [54.25, 118], [54.25, 116.2], [55.4, 115.3], [58, 115.25], [97.5, 115.25]], arcPts(97.5, MY - 6, 6.75, 90, 0),
    arcPts(97.5, 44.5, 6.75, 0, -90), [[58, 37.75]], arcPts(50, 38.5, RING, -6.8, -227.6), [[45.75, 43.2], [45.75, 123]]) },
  { n: 9, p: loop([[54.25, 123], [54.25, 43.2]], arcPts(50, 38.5, RING, 47.6, -160), [[41, 37.75], [39.5, 37.75], [38.2, 38.4],
    [37.75, 40], [37.75, 46], [37.2, 47.6], [34, 47.75], [12, 47.75]], arcPts(12, 57.5, 9.75, -90, -270),
    [[34, 67.25], [37.4, 67.4], [37.75, 69], [37.75, 84.5], [37.2, 86.6], [34, 86.75], [30, 86.75], [10, 86.75]], arcPts(6.5, 87.5, 3.4, -12.4, -347.6),
    [[34, 88.25], [37.4, 88.4], [37.75, 90.5], [37.75, 108.5], [37.2, 110.6], [34, 110.75], [30, 110.75], [10, 110.75]], arcPts(6.5, 111.5, 3.4, -12.4, -347.6),
    [[34, 112.25], [37.4, 112.4], [37.75, 114.5]], arcPts(41.5, 114.5, 3.75, 180, 90), [[44.5, 118.25], [46, 118.6], [46, 121], [46, 123]]) }
];

// people walk these lines to and fro; k and n say which project must have reached n steps
var WALKS = [
  { k: 'bakery', n: 1, p: [60, B1 + 0.7, 96, B1 + 0.7] },
  { k: 'flower', n: 1, p: [60, B2 + 0.7, 97, B2 + 0.7] },
  { k: 'toys', n: 1, p: [60, 40.6, 97, 40.6] },
  { k: 'town', n: 1, p: [44.5, 54, 44.5, 114] },
  { k: 'town', n: 1, p: [55.5, 54, 55.5, 72.5] },
  { k: 'town', n: 1, p: [55.5, 80, 55.5, 108] },
  { k: 'homes', n: 3, p: [14, 64.5, 34, 64.5] },
  { k: 'homes', n: 5, p: [14, 85.5, 34, 85.5] },
  { k: 'homes', n: 8, p: [14, 109.5, 34, 109.5] },
  { k: 'homes', n: 2, p: [36.5, 51.5, 36.5, 63.5] },
  { k: 'homes', n: 6, p: [36.5, 91, 36.5, 109] },
  { k: 'school', n: 1, p: [23.5, 30.5, 32.5, 30.5] },
  { k: 'school', n: 1, p: [17, 40.6, 36, 40.6] }
];


// school inside, in 32 px tiles from the top left of the building
var SW = 12;
var SH = 52;
// floor [x, y, w, h], floor tile, row of the door in the hallway wall
var ROOMS = {
  hall: { name: 'Hallway', floor: [1, 2, 2, 36], tile: 'f_hall' },
  class1: { name: 'Classroom 1', floor: [4, 2, 7, 6], tile: 'f_class', door: 5, biz: 'class' },
  class2: { name: 'Classroom 2', floor: [4, 10, 7, 6], tile: 'f_class', door: 13, biz: 'class' },
  rest: { name: 'Restrooms', floor: [4, 18, 7, 4], tile: 'f_rest', door: 20, biz: 'school' },
  lib: { name: 'Library', floor: [4, 24, 7, 6], tile: 'f_lib', door: 27, biz: 'lib' },
  cafe: { name: 'Cafeteria', floor: [4, 32, 7, 6], tile: 'f_cafe', door: 35, biz: 'cafeteria' },
  yard: { name: 'Playground', floor: [0, 40, 12, 12], biz: 'yard' }
};
var INSIDE = [];
// room (the business whose view count decides, see VIEW), step, sprite, x, y, options. A piece stands on tile (x, y), centred over the tiles it spans.
// wall: hangs on the wall; flat: lies on the floor; lift: raised from the floor; kid, adult: a person and the way they face
function it(room, step, spr, x, y, o) {
  var p = o || {};
  p.r = room;
  p.s = step;
  p.spr = spr;
  p.x = x;
  p.y = y;
  INSIDE.push(p);
}
function pupil(room, step, x, y, d, k) {
  it(room, step, 'kid_' + (k % 8 + 1), x, y, { person: 1, d: d, sit: 1 });
}
(function () {
  function classroom(id, y0, off) {
    it(id, 1, 'board', 6.5, y0 - 1, { span: 2, wall: 1 });
    it(id, 2, 'tdesk', 6.5, y0 + 1, { span: 2 });
    it(id, 2, 'adult_' + (3 + off % 3), 7, y0, { person: 1, d: 'down' });
    var cols = [5, 6, 8, 9];
    [y0 + 2, y0 + 4].forEach(function (y, r) {
      cols.forEach(function (c) { it(id, 3 + r, 'desk', c, y); });
    });
    [y0 + 3, y0 + 5].forEach(function (y) {
      cols.forEach(function (c) { it(id, 5, 'chair', c, y); });
    });
    var k = off;
    [y0 + 3, y0 + 5].forEach(function (y) {
      cols.forEach(function (c) { pupil(id, 6, c, y, 'up', k++); });
    });
    it(id, 7, 'map', 4, y0 - 1, { span: 2, wall: 1, lift: 8 });
    it(id, 7, 'poster', 9, y0 - 1, { span: 2, wall: 1, lift: 8 });
    it(id, 8, 'bookcase', 4, y0 + 1, { span: 2 });
    it(id, 8, 'globe', 4.5, y0 + 1, { span: 1, lift: 52 });
  }
  classroom('class', 2, 0);
  classroom('class', 10, 3);

  [5, 7, 9].forEach(function (x) { it('rest', 1, 'toilet', x, 18); });
  [4, 6, 8, 10].forEach(function (x) { it('rest', 2, 'stall_post', x, 18, { span: 1, lift: -8 }); });
  [5, 7, 9].forEach(function (x) { it('rest', 2, 'stall_front', x, 18, { span: 1, lift: -8 }); });
  [5, 8].forEach(function (x) { it('rest', 3, 'sink', x, 21, { span: 2 }); });
  [4, 10].forEach(function (x) { it('rest', 4, 'bin', x, 21); });
  it('rest', 5, 'mat', 6.5, 20, { span: 2, flat: 1 });

  [4.5, 6.5, 8.5].forEach(function (x) { it('lib', 1, 'wshelf', x, 24, { span: 2 }); });
  [5, 8].forEach(function (x) { it('lib', 2, 'tdesk', x, 27, { span: 2 }); });
  [5, 6, 8, 9].forEach(function (x) { it('lib', 3, 'rchair', x, 26); });
  [4.5, 6.5, 8.5].forEach(function (x) { it('lib', 4, 'bookcase', x, 29, { span: 2 }); });
  it('lib', 5, 'globe', 6.5, 29, { span: 2, lift: 52 });
  pupil('lib', 6, 5, 26, 'down', 1);
  pupil('lib', 6, 9, 26, 'down', 2);

  [4, 6, 8].forEach(function (x) { it('cafeteria', 1, 'counter', x, 32, { span: 2 }); });
  [4, 8].forEach(function (x, i) { it('cafeteria', 2 + i, 'table', x, 35, { span: 3 }); });
  [4, 5, 6, 8, 9, 10].forEach(function (x) {
    it('cafeteria', 4, 'chair_n', x, 33);
    it('cafeteria', 4, 'chair_s', x, 36);
  });
  it('cafeteria', 5, 'fridge', 10, 32);
  it('cafeteria', 5, 'coffee', 4, 32, { span: 2, lift: 26 });
  [4, 6, 8, 10].forEach(function (x, i) {
    pupil('cafeteria', 6, x, 33, 'down', 2 + i);
    pupil('cafeteria', 6, x, 36, 'up', 5 + i);
  });
  it('cafeteria', 7, 'adult_2', 7, 33, { person: 1, d: 'down' });

  it('hall', 1, 'doormat', 1, 37, { span: 2, flat: 1 });
  [1, 2].forEach(function (x) { it('hall', 2, 'locker', x, 2); });

  it('yard', 2, 'toy3', 8, 44, { span: 2 });
  it('yard', 3, 'toy1', 4, 44, { span: 3 });
  it('yard', 4, 'toy4', 4, 48, { span: 3 });
  it('yard', 5, 'ybench', 4, 50, { span: 2 });
  it('yard', 5, 'oak', 8, 50, { span: 2 });
  it('yard', 6, 'toy7', 8, 47, { span: 2 });
})();
// the hallway pieces follow the school's stages
INSIDE.forEach(function (p) {
  if (p.r === 'hall') p.r = 'school';
});

