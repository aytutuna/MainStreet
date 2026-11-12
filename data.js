// Projects and their steps: [name, cost, income per second]. Steps are bought in this order across all projects.
var PROJECTS = [
  { id: 'homes', name: 'Homes', steps: [
    ['Mark the lots', 9, 1], ['Cottage 1', 22, 2], ['Cottage 2', 53, 2], ['Cottage 3', 92, 2], ['Cottage 4', 140, 2],
    ['Cottage 5', 190, 2], ['Cottage 6', 260, 2], ['Front gardens', 330, 1], ['Garden extras', 380, 1],
    ['Hedges, trees and lamps', 440, 1], ['Bigger homes, row 1', 510, 3], ['Bigger homes, row 2', 640, 3],
    ['Bigger homes, row 3', 780, 3]
  ] },
  { id: 'main', name: 'Main Street', steps: [
    ['Pavement and lots', 1000, 2], ['Bakery', 1100, 4], ['Cafe', 1200, 4], ['Market', 1400, 5],
    ['Ice cream', 1500, 5], ['Restaurant', 1700, 6], ['Corner store 1', 1900, 6], ['Corner store 2', 2100, 6],
    ['Corner store 3', 2400, 7], ['Bigger shops, row 1', 2600, 6], ['Bigger shops, row 2', 2900, 6],
    ['Bigger shops, row 3', 3100, 6], ['Bigger shops, row 4', 3400, 6], ['Grand shops, row 1', 3700, 8],
    ['Grand shops, row 2', 4000, 8], ['Grand shops, row 3', 4400, 8], ['Grand shops, row 4', 4800, 8],
    ['Benches and lamps', 5200, 3]
  ] },
  { id: 'class1', name: 'Classroom 1', room: 1, steps: [
    ['Chalkboard', 8300, 3], ['Teacher desk', 9100, 3], ['Front desks', 10000, 4], ['Back desks', 11000, 4],
    ['Chairs', 12000, 4], ['Students', 13000, 6], ['Wall decor', 14000, 3], ['Globe and shelf', 15000, 3]
  ] },
  { id: 'class2', name: 'Classroom 2', room: 1, steps: [
    ['Chalkboard', 10000, 4], ['Teacher desk', 11000, 4], ['Front desks', 12000, 5], ['Back desks', 13000, 5],
    ['Chairs', 15000, 5], ['Students', 16000, 7], ['Wall decor', 17000, 4], ['Globe and shelf', 18000, 4]
  ] },
  { id: 'rest', name: 'Restrooms', room: 1, steps: [
    ['Toilets', 13000, 6], ['Stall doors', 15000, 6], ['Sinks', 17000, 7], ['Bins', 19000, 6], ['Floor mat', 22000, 6]
  ] },
  { id: 'lib', name: 'Library', room: 1, steps: [
    ['Wall shelves', 15000, 8], ['Reading tables', 17000, 8], ['Chairs', 19000, 8], ['Low bookcases', 21000, 8],
    ['Globe', 23000, 7], ['Readers', 26000, 10]
  ] },
  { id: 'cafe', name: 'Cafeteria', room: 1, steps: [
    ['Serving counter', 18000, 10], ['Table 1', 20000, 10], ['Table 2', 22000, 10], ['Chairs', 25000, 10],
    ['Appliances', 27000, 11], ['Students', 29000, 13], ['Cook', 32000, 12]
  ] },
  { id: 'yard', name: 'Playground', room: 1, steps: [
    ['Path and fence', 23000, 12], ['Swings', 25000, 12], ['Slide', 28000, 12], ['Monkey bars', 31000, 12],
    ['Bench and tree', 34000, 12], ['Play frame', 37000, 14], ['Kids', 41000, 18]
  ] }
];

var TW = 24; // town width in 16 px tiles
var TH = 222;
// first row of each street; the street is a sidewalk, three lanes of asphalt and a sidewalk
var STREETS = [12, 28, 54, 82, 110, 138, 166, 183, 200, 217];

// land that is fenced off until its project starts: rows of [x, y, w, h] in tiles
var LANDS = {
  hosp: { name: 'Hospital', sub: 'Coming soon', rects: [[0, 1, 24, 11]], view: 'clinic_3' },
  park: { name: 'Park', sub: 'Opens after the School', rects: [[0, 17, 24, 11]], view: 'park_5' },
  school: { name: 'School', sub: 'Opens after Main Street', rects: [[0, 33, 24, 21]], till: 'class1', view: 'school_1' },
  main: { name: 'Main Street', sub: 'Opens after Homes', rects: [[0, 59, 24, 23], [0, 87, 24, 23], [0, 115, 24, 23],
    [0, 143, 24, 23]], till: 'main', at: 143 },
  homes: { name: 'Homes', sub: 'Tap Next to start', rects: [[0, 171, 24, 12], [0, 188, 24, 12], [0, 205, 24, 12]],
    till: 'homes', at: 205, view: 'lot_home' }
};

// which project a tap at a given row belongs to
var BLOCKS = [[1, 12, 'hosp'], [17, 28, 'park'], [33, 54, 'school'], [59, 171, 'main'], [171, 222, 'homes']];

var PIECES = [];
// a piece stands with the bottom centre of its sprite at (x, y) tiles. spr maps a step of its project to a sprite;
// '-' hides it. z 0 is ground, drawn before everything else
function pc(key, x, y, spr, z) {
  PIECES.push({ k: key, x: x, y: y, s: spr, z: z === 0 ? 0 : 1 });
}

var SHOPS = ['bakery', 'cafe', 'market', 'icecream', 'restaurant', 'stora', 'storb', 'storc'];
var SHOP_LV = { cafe: [1, 4, 5], icecream: [3, 3, 5], restaurant: [1, 3, 3] };
var HOME_STYLES = ['house_y', 'house_g', 'house_b'];

// homes: three rows of two fenced lots, 11 x 12 tiles each, built from the south. A cottage comes with its fence,
// gate, shed and vegetable beds; the farm houses that replace them have their door at a different place, so the gate moves
(function () {
  var rows = [217, 200, 183];
  for (var r = 0; r < 3; r++) {
    var n = rows[r];
    for (var c = 0; c < 2; c++) {
      var L = r * 2 + c;
      var x0 = 0.5 + c * 12;
      var s = 2 + L;
      var up = 11 + r;
      var px = function (v) { return x0 + v / 16; };
      var py = function (v) { return n - 12 + v / 16; };
      var at = function (step, spr, x, y) {
        var o = {};
        o[step] = spr;
        pc('homes', px(x), py(y), o);
      };
      var ground = { 1: 'lot_home' };
      ground[s] = 'lawn';
      pc('homes', x0 + 5.5, n, ground, 0);
      var cot = {};
      var farm = {};
      var fen = {};
      cot[s] = HOME_STYLES[L % 3];
      cot[up] = '-';
      farm[up] = c ? 'farm_b' : 'farm_a';
      fen[s] = 'lot_fence_c';
      fen[up] = c ? 'lot_fence_b' : 'lot_fence_a';
      pc('homes', x0 + 5, n, cot);
      pc('homes', x0 + (c ? 6 : 5.8125), n, farm);
      pc('homes', x0 + 5.5, n, fen);
      at(s, c ? 'shed_r' : 'shed', c ? 146 : 30, 84);
      for (var i = 0; i < 4; i++) {
        at(s, 'sprout', (c ? 58 : 78) + i * 16, 78);
        at(s, 'sprout', (c ? 58 : 78) + i * 16, 66);
      }
      for (var b = 0; b < 2; b++) {
        at(s, 'gbush', 14, 110 + b * 36);
        at(s, 'gbush', 162, 110 + b * 36);
      }
      for (var f = 0; f < 3; f++) {
        at(8, 'poppy', 46 - f * 8, 172);
        at(8, 'sunflower', 130 + f * 8, 172);
      }
      at(8, 'fbush', c ? 22 : 154, 150);
      at(9, 'crate', c ? 38 : 138, 74);
      at(9, 'birdhouse', c ? 150 : 24, 66);
      at(9, 'can', c ? 134 : 42, 150);
    }
    // the gap between the lots is a hedge row
    for (var h = 0; h < 4; h++) pc('homes', 12, n - 2 - h * 3, { 10: 'fbush' });
    for (var x = 6; x <= 18; x += 6) pc('homes', x, n + 5, { 10: 'lamp' });
    for (var t = 3; t <= 21; t += 6) pc('homes', t, n + 5, { 10: 'tree' });
  }
})();

// main street: four rows of two shops built from the south. Each lot is 23 tiles deep: a hedge, then the car park, then
// the paved forecourt the shops stand on, all on one building line. The car park gets shallower as the shops grow
// taller, so no paving is left over behind a low shop. Street lamps and benches stand on the far kerb
var CAR_DEPTH = [[12, 6, 6], [9, 9, 6], [9, 6, 6], [12, 12, 9]];
(function () {
  var rows = [166, 138, 110, 82];
  var cars = ['car_01', 'car_03', 'car_05', 'car_10'];
  // taken bays in each row of bays, by the shop they come with (left shop, right shop)
  var taken = [[[1, 4], [7, 10]], [[3, 5], [8, 9]], [[0, 2], [6, 10]], [[2, 4], [7, 9]]];
  for (var r = 0; r < 4; r++) {
    var n = rows[r];
    var top = n - 23;
    var from = [1, 10 + r, 14 + r];
    pc('main', 12, n, { 1: 'plaza' }, 0);
    for (var x = 0; x < 24; x++) pc('main', x + 0.5, top + 1, { 1: 'bush' });
    pc('main', 1, n, { 1: 'tree' });
    pc('main', 23, n, { 1: 'tree' });
    for (var c = 0; c < 2; c++) {
      var s = r * 2 + c;
      var name = SHOPS[s];
      var lv = SHOP_LV[name] || [1, 3, 5];
      var o = { 1: 'lot_shop' };
      o[2 + s] = name + '_' + lv[0];
      o[10 + r] = name + '_' + lv[1];
      o[14 + r] = name + '_' + lv[2];
      pc('main', c ? 17 : 7, n, o);
    }
    for (var st = 0; st < 3; st++) {
      var depth = CAR_DEPTH[r][st];
      var to = from[st + 1] || 99;
      var park = {};
      park[from[st]] = 'carpark_' + depth;
      park[to] = '-';
      pc('main', 12, top + 1 + depth, park, 0);
      for (var i = 0; i < depth / 3; i++) {
        for (var side = 0; side < 2; side++) {
          taken[i % 4][side].forEach(function (k, j) {
            var o2 = {};
            o2[Math.max(from[st], 2 + r * 2 + side)] = cars[(r + i + j + side) % 4];
            o2[to] = '-';
            pc('main', 0, 0, o2);
            var q = PIECES[PIECES.length - 1];
            q.car = 1;
            q.x = 1.5 + 2 * k;
            q.y = top + 1 + 2.375 + 3 * i;
          });
        }
      }
    }
    for (var l = 6; l <= 18; l += 12) pc('main', l, n + 5, { 18: 'lamp' });
    pc('main', 12, n + 5, { 18: 'bench' });
    for (var t = 3; t <= 21; t += 6) pc('main', t, n + 5, { 18: 'tree' });
  }
})();

// school: the stage is 0 until the first room starts, then 1 plus the rooms finished
(function () {
  var st = { 1: 'con_16x11', 2: 'school_1', 3: 'school_2', 4: 'school_3', 5: 'school_3', 6: 'school_4', 7: 'school_5' };
  pc('sch', 12, 54, st);
  pc('sch', 12, 43, { 2: 'con_14x8', 4: '-' });
  pc('sch', 12, 41, { 1: 'court' }, 0);
  for (var i = 0; i < 2; i++) {
    pc('sch', 2, 43 + i * 4, { 1: 'tree' });
    pc('sch', 22, 43 + i * 4, { 1: 'tree' });
    pc('sch', 0.7, 44 + i * 4, { 1: 'bush' });
    pc('sch', 23.3, 44 + i * 4, { 1: 'bush' });
  }
  pc('sch', 2.2, 53, { 1: 'bench', 6: 'toy_bars' });
  pc('sch', 21.8, 53, { 1: 'bench', 6: 'toy_slide' });
  for (var x = 6; x <= 18; x += 6) {
    pc('sch', x, 33, { 1: 'lamp' });
    pc('sch', x, 59, { 1: 'lamp' });
  }
  for (var t = 3; t <= 21; t += 6) {
    pc('sch', t, 33, { 1: 'tree' });
    pc('sch', t, 59, { 1: 'tree' });
  }
})();

// school inside, in 32 px tiles from the top left of the building
var SW = 12;
var SH = 52;
// floor [x, y, w, h], floor tile, row of the door in the hallway wall
var ROOMS = {
  hall: { name: 'Hallway', floor: [1, 2, 2, 36], tile: 'f_hall' },
  class1: { name: 'Classroom 1', floor: [4, 2, 7, 6], tile: 'f_class', door: 5 },
  class2: { name: 'Classroom 2', floor: [4, 10, 7, 6], tile: 'f_class', door: 13 },
  rest: { name: 'Restrooms', floor: [4, 18, 7, 4], tile: 'f_rest', door: 20 },
  lib: { name: 'Library', floor: [4, 24, 7, 6], tile: 'f_lib', door: 27 },
  cafe: { name: 'Cafeteria', floor: [4, 32, 7, 6], tile: 'f_cafe', door: 35 },
  yard: { name: 'Playground', floor: [0, 40, 12, 12] }
};
var INSIDE = [];
// room, step, sprite, x, y, options. A piece stands on tile (x, y), centred over the tiles it spans.
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
  classroom('class1', 2, 0);
  classroom('class2', 10, 3);

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

  [4.5, 6.5, 8.5].forEach(function (x) { it('cafe', 1, 'counter', x, 32, { span: 2 }); });
  [4, 8].forEach(function (x, i) { it('cafe', 2 + i, 'table', x, 35, { span: 3 }); });
  [4, 5, 6, 8, 9, 10].forEach(function (x) {
    it('cafe', 4, 'chair_n', x, 33);
    it('cafe', 4, 'chair_s', x, 36);
  });
  it('cafe', 5, 'fridge', 10, 32);
  it('cafe', 5, 'coffee', 4, 32, { lift: 26 });
  [4, 6, 8, 10].forEach(function (x, i) {
    pupil('cafe', 6, x, 33, 'down', 2 + i);
    pupil('cafe', 6, x, 36, 'up', 5 + i);
  });
  it('cafe', 7, 'adult_2', 7, 32, { person: 1, d: 'down' });

  it('hall', 1, 'doormat', 1, 37, { span: 2, flat: 1 });
  [1, 2].forEach(function (x) { it('hall', 2, 'locker', x, 2); });

  it('yard', 2, 'toy3', 8, 44, { span: 2 });
  it('yard', 3, 'toy1', 4, 44, { span: 3 });
  it('yard', 4, 'toy4', 4, 48, { span: 3 });
  it('yard', 5, 'ybench', 4, 50, { span: 2 });
  it('yard', 5, 'oak', 8, 50, { span: 2 });
  it('yard', 6, 'toy7', 8, 47, { span: 2 });
})();
// stage of the hallway pieces: 1 plus the rooms finished (counted like the school outside)
INSIDE.forEach(function (p) {
  if (p.r === 'hall') p.r = 'sch';
});
