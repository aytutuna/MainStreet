var View = (function () {
  var T = 16;
  var CH = 1024;
  var MW = MAP.w;
  var MH = MAP.h;
  var COLS = Math.ceil(MW * T / CH);
  var AVW = MAP.ax + 1;
  var AVE = MAP.ax + 5;
  var BASE = 'assets/';

  // 47-tile autotile layout: edge and corner bits, then column and row in the set (n 1, e 2, s 4, w 8, ne 16, se 32, sw 64, nw 128)
  var AT = [
    255, 1, 0, 127, 2, 0, 239, 3, 0, 111, 4, 0, 223, 5, 0, 95, 6, 0, 207, 7, 0, 79, 8, 0,
    191, 9, 0, 63, 10, 0, 175, 11, 0, 47, 0, 1, 159, 1, 1, 31, 2, 1, 143, 3, 1, 15, 4, 1,
    55, 5, 1, 39, 6, 1, 23, 7, 1, 7, 8, 1, 110, 9, 1, 78, 10, 1, 46, 11, 1, 14, 0, 2,
    205, 1, 2, 141, 2, 2, 77, 3, 2, 13, 4, 2, 155, 5, 2, 27, 6, 2, 139, 7, 2, 11, 8, 2,
    5, 9, 2, 10, 10, 2, 38, 11, 2, 6, 0, 3, 76, 1, 3, 12, 2, 3, 137, 3, 3, 9, 4, 3,
    19, 5, 3, 3, 6, 3, 4, 7, 3, 2, 8, 3, 1, 9, 3, 8, 10, 3, 0, 11, 3
  ];
  var ATK = {};
  var ATE = {};
  for (var q = 0; q < AT.length; q += 3) {
    ATK[AT[q]] = [AT[q + 1], AT[q + 2]];
    if (!ATE[AT[q] & 15]) ATE[AT[q] & 15] = [AT[q + 1], AT[q + 2]];
  }

  var SPR = { wheat: [12, 8], veg: [12, 8], coop: [12, 8], orchard: [15, 9], barn: [14, 8], warehouse: [14, 8], pier: [8, 20], train: [24, 7] };
  // opaque rectangle [left, top, right, bottom] of each building and scaffold image, in image pixels; most sprites have
  // empty headroom, and taps and the bubbles go by this part
  var BOX = {
    bld_bakery_1: [0, 84, 160, 240], bld_bakery_2: [0, 84, 160, 240], bld_bakery_3: [0, 20, 160, 240],
    bld_bakery_4: [0, 20, 160, 240], bld_bakery_5: [0, 20, 160, 240], bld_barn_1: [48, 146, 176, 272],
    bld_barn_2: [48, 146, 176, 272], bld_barn_3: [32, 146, 192, 272], bld_barn_4: [32, 64, 192, 272],
    bld_barn_5: [16, 0, 221, 272], bld_cafe_1: [0, 88, 160, 240], bld_cafe_2: [0, 88, 160, 240],
    bld_cafe_3: [0, 88, 160, 240], bld_cafe_4: [0, 80, 160, 240], bld_cafe_5: [0, 16, 160, 240],
    bld_clinic_1: [0, 4, 256, 336], bld_clinic_2: [0, 4, 256, 336], bld_clinic_3: [0, 4, 256, 336],
    bld_clinic_4: [0, 4, 256, 336], bld_clinic_5: [0, 4, 256, 336], bld_condo_1: [0, 148, 288, 384],
    bld_condo_2: [0, 84, 288, 384], bld_condo_3: [0, 20, 288, 384], bld_condo_4: [0, 20, 288, 384],
    bld_condo_5: [0, 20, 288, 384], bld_coop_1: [48, 56, 144, 144], bld_coop_2: [40, 56, 144, 144],
    bld_coop_3: [32, 56, 164, 144], bld_coop_4: [32, 60, 160, 144], bld_coop_5: [16, 48, 176, 144],
    bld_cottage_1: [8, 149, 143, 228], bld_cottage_2: [0, 149, 160, 240], bld_cottage_3: [0, 149, 160, 240],
    bld_cottage_4: [0, 138, 160, 240], bld_cottage_5: [0, 138, 160, 240], bld_depot_1: [0, 128, 256, 336],
    bld_depot_2: [0, 128, 256, 336], bld_depot_3: [0, 128, 256, 336], bld_depot_4: [0, 128, 256, 336],
    bld_depot_5: [0, 116, 256, 336], bld_farmhouse_1: [18, 68, 142, 216], bld_farmhouse_2: [0, 68, 160, 240],
    bld_farmhouse_3: [0, 81, 160, 240], bld_farmhouse_4: [0, 81, 160, 240], bld_farmhouse_5: [0, 81, 160, 240],
    bld_fire_1: [0, 44, 256, 336], bld_fire_2: [0, 44, 256, 336], bld_fire_3: [0, 44, 256, 336],
    bld_fire_4: [0, 44, 256, 336], bld_fire_5: [0, 35, 256, 336], bld_hotel_1: [0, 112, 288, 384],
    bld_hotel_2: [0, 48, 288, 384], bld_hotel_3: [0, 112, 288, 384], bld_hotel_4: [0, 48, 288, 384],
    bld_hotel_5: [0, 27, 288, 384], bld_icecream_1: [0, 40, 160, 240], bld_icecream_2: [0, 40, 160, 240],
    bld_icecream_3: [0, 64, 160, 240], bld_icecream_4: [0, 64, 160, 240], bld_icecream_5: [0, 0, 160, 240],
    bld_market_1: [0, 105, 160, 240], bld_market_2: [0, 105, 160, 240], bld_market_3: [0, 89, 160, 240],
    bld_market_4: [0, 89, 160, 240], bld_market_5: [0, 43, 160, 240], bld_office_1: [0, 160, 288, 384],
    bld_office_2: [0, 96, 288, 384], bld_office_3: [0, 32, 288, 384], bld_office_4: [0, 32, 288, 384],
    bld_office_5: [0, 25, 288, 384], bld_orchard_1: [14, 186, 204, 232], bld_orchard_2: [7, 127, 219, 235],
    bld_orchard_3: [7, 126, 219, 234], bld_orchard_4: [1, 119, 223, 240], bld_orchard_5: [1, 39, 223, 240],
    bld_park_1: [7, 156, 153, 220], bld_park_2: [0, 156, 160, 220], bld_park_3: [0, 125, 160, 220],
    bld_park_4: [0, 118, 160, 220], bld_park_5: [0, 105, 160, 220], bld_pier_1: [0, 0, 128, 112],
    bld_pier_2: [0, 0, 128, 160], bld_pier_3: [0, 0, 128, 208], bld_pier_4: [0, 0, 128, 256],
    bld_pier_5: [0, 0, 128, 304], bld_playground_1: [8, 152, 152, 232], bld_playground_2: [8, 152, 152, 232],
    bld_playground_3: [8, 140, 152, 232], bld_playground_4: [8, 119, 152, 232], bld_playground_5: [8, 119, 160, 232],
    bld_police_1: [0, 160, 256, 336], bld_police_2: [0, 117, 256, 336], bld_police_3: [0, 117, 256, 336],
    bld_police_4: [0, 40, 256, 336], bld_police_5: [0, 40, 256, 336], bld_restaurant_1: [0, 160, 256, 336],
    bld_restaurant_2: [0, 160, 256, 336], bld_restaurant_3: [0, 100, 256, 336], bld_restaurant_4: [0, 100, 256, 336],
    bld_restaurant_5: [0, 80, 256, 336], bld_school_1: [0, 110, 256, 336], bld_school_2: [0, 110, 256, 336],
    bld_school_3: [0, 0, 256, 336], bld_school_4: [0, 0, 256, 336], bld_school_5: [0, 0, 256, 336],
    bld_station_1: [0, 53, 384, 175], bld_station_2: [0, 53, 384, 175], bld_station_3: [0, 53, 384, 175],
    bld_station_4: [0, 53, 384, 175], bld_station_5: [0, 53, 384, 175], bld_supermarket_1: [0, 183, 288, 384],
    bld_supermarket_2: [0, 183, 288, 384], bld_supermarket_3: [0, 183, 288, 384],
    bld_supermarket_4: [0, 189, 288, 384], bld_supermarket_5: [0, 156, 288, 384], bld_veg_1: [65, 83, 127, 126],
    bld_veg_2: [56, 67, 135, 126], bld_veg_3: [48, 67, 143, 126], bld_veg_4: [6, 32, 160, 144],
    bld_veg_5: [6, 30, 176, 144], bld_villa_1: [0, 96, 248, 320], bld_villa_2: [0, 96, 253, 332],
    bld_villa_3: [2, 104, 253, 330], bld_villa_4: [4, 104, 253, 334], bld_villa_5: [4, 104, 253, 336],
    bld_warehouse_1: [0, 84, 224, 224], bld_warehouse_2: [0, 84, 224, 224], bld_warehouse_3: [0, 20, 224, 224],
    bld_warehouse_4: [0, 20, 224, 224], bld_warehouse_5: [0, 19, 224, 224], bld_wheat_1: [65, 83, 127, 126],
    bld_wheat_2: [57, 64, 135, 126], bld_wheat_3: [49, 62, 143, 126], bld_wheat_4: [32, 30, 160, 144],
    bld_wheat_5: [4, 30, 187, 144], con_10x7: [0, 106, 160, 288], con_12x8: [0, 155, 192, 304],
    con_14x8: [0, 155, 224, 304], con_15x9: [0, 171, 240, 320], con_16x11: [0, 170, 256, 352],
    con_18x10: [0, 154, 288, 336], con_24x7: [0, 139, 384, 288], con_8x20: [0, 176, 128, 496]
  };
  var COOP = [[58, 106, 136, 124], [58, 106, 136, 124], [74, 106, 130, 124], [68, 108, 116, 124], [48, 108, 112, 124]];
  var BARN = [[68, 246, 156, 256], [68, 246, 156, 256], [68, 246, 156, 256], [74, 246, 160, 256], [74, 246, 160, 256]];
  var FACES = ['01', '03', '05', '08', '11', '14', '17', '20'];
  var DIRS = ['down', 'left', 'right', 'up'];
  var CARS = ['01', '03', '05', '10', '14', '19'];
  var BANDS = [['downtown', 0, MAP.tops.village], ['village', MAP.tops.village, MAP.tops.farm], ['farm', MAP.tops.farm, MAP.tops.beach],
    ['beach', MAP.tops.beach, MH]];

  var cv, ctx, W = 0, H = 0, dpr = 1;
  var sc = 2;
  var minSc = 1;
  var cx = 0;
  var cy = 0;
  var inset = 0;
  var head = 0;
  var img = {};
  var todo = 0;
  var done = false;
  var last = 0;
  var ms = 0;
  var tween = null;
  var sel = -1;
  var ringAt = -1;
  var ringR = 0;
  var marks = [];
  var asks = [];
  var asking = [];
  var chunks = [];
  var queue = [];
  var masks = null;
  var plots = [];
  var st = [];
  var trainX = 0;
  var walkers = [];
  var trucks = [];
  var cars = [];
  var trains = [];
  var animals = [];
  var boats = [];
  var pip = [];
  var carAt = 0;
  var animAt = 0;
  var ox = 0;
  var oy = 0;
  var vr = { x: 0, y: 0, w: 0, h: 0 };
  var pt = {};
  var drag = null;
  var pinch = null;
  var wheel = 0;
  var hole = null;
  var pick = function () {};

  function loaded() {
    todo--;
    if (!todo) start();
  }

  // a sprite that fails to load becomes a transparent pixel, so the map still starts
  function want(name) {
    if (img[name]) return;
    var im = new Image();
    todo++;
    im.onload = loaded;
    im.onerror = function () {
      console.warn('missing ' + im.src);
      if (!hole) {
        hole = document.createElement('canvas');
        hole.width = hole.height = 1;
      }
      img[name] = hole;
      loaded();
    };
    im.src = BASE + name + '.png';
    img[name] = im;
  }

  function artOf(id) {
    return id === 'train' ? 'station' : id;
  }

  function loadAll() {
    BUILDINGS.forEach(function (b) {
      for (var l = 1; l <= 5; l++) want('bld_' + artOf(b.id) + '_' + l);
    });
    ['10x7', '16x11', '18x10', '12x8', '15x9', '14x8', '24x7', '8x20'].forEach(function (k) {
      want('con_' + k);
    });
    ['grass', 'sidewalk', 'dirt', 'sand', 'sand_on_water', 'deep_water', 'water_grass', 'asphalt_lines', 'fence', 'asphalt',
      'crosswalk_ew', 'crosswalk_ns', 'rail_ew'].forEach(function (k) {
      want('gr_' + k);
    });
    FACES.forEach(function (k) {
      want('life_resident_' + k);
    });
    ['truck', 'van'].forEach(function (k) {
      DIRS.forEach(function (d) {
        want('life_' + k + '_' + d);
      });
    });
    CARS.forEach(function (k) {
      want('life_car_' + k);
    });
    ['chicken_white', 'chicken_brown', 'cow', 'cow_white', 'train_white', 'train_orange', 'boat_left', 'boat_right',
      'boat2_left', 'boat2_right'].forEach(function (k) {
      want('life_' + k);
    });
    ['tree_a', 'tree_b', 'tree_c', 'pine1', 'oak1', 'palm', 'bush', 'bed', 'fnt1', 'bench', 'lamp'].forEach(function (k) {
      want('prop_' + k);
    });
  }

  function start() {
    makeMasks();
    done = true;
    resize();
    var v = viewRect();
    var rest = [];
    for (var j = 0; j < Math.ceil(MH * T / CH); j++) {
      for (var i = 0; i < COLS; i++) {
        if (i * CH < v.x + v.w && (i + 1) * CH > v.x && j * CH < v.y + v.h && (j + 1) * CH > v.y) chunk(i, j);
        else rest.push([i, j]);
      }
    }
    rest.sort(function (a, b) {
      return Math.hypot((a[0] + 0.5) * CH - cx, (a[1] + 0.5) * CH - cy) - Math.hypot((b[0] + 0.5) * CH - cx, (b[1] + 0.5) * CH - cy);
    });
    queue = rest;
    later(warm);
  }

  function later(fn) {
    if (window.requestIdleCallback) window.requestIdleCallback(fn);
    else setTimeout(fn, 60);
  }

  function warm() {
    var n = queue.shift();
    if (!n) return;
    chunk(n[0], n[1]);
    later(warm);
  }

  function mask() {
    return new Uint8Array(MW * MH);
  }

  function fill(m, x, y, w, h) {
    for (var j = Math.max(0, y); j < Math.min(MH, y + h); j++) {
      for (var i = Math.max(0, x); i < Math.min(MW, x + w); i++) m[j * MW + i] = 1;
    }
  }

  function at(m, x, y) {
    return m[Math.max(0, Math.min(MH - 1, y)) * MW + Math.max(0, Math.min(MW - 1, x))];
  }

  function minus(m, x, y, w, h) {
    for (var j = Math.max(0, y); j < Math.min(MH, y + h); j++) {
      for (var i = Math.max(0, x); i < Math.min(MW, x + w); i++) m[j * MW + i] = 0;
    }
  }

  function makeMasks() {
    var m = { water: mask(), deep: mask(), sand: mask(), dirt: mask(), road: mask(), walk: mask(), fence: mask(), busy: mask(), lanes: [], cross: [], props: [] };
    var ax = MAP.ax;
    var end = MAP.streets[MAP.streets.length - 1][0] + 6;
    var sh = MAP.shore;
    fill(m.water, 0, sh + 4, MW, MH);
    fill(m.deep, 0, sh + 6, MW, MH);
    fill(m.sand, 0, sh, MW, 4);
    MAP.plaza.forEach(function (r) {
      fill(m.walk, r[0], r[1], r[2], r[3]);
    });
    MAP.fence.forEach(function (r) {
      fill(m.fence, r[0], r[1], r[2], r[3]);
    });
    fill(m.road, ax + 2, MAP.ay, 2, end - MAP.ay);
    fill(m.walk, ax, MAP.ay, 2, end - MAP.ay);
    fill(m.walk, ax + 4, MAP.ay, 2, end - MAP.ay);
    var lw = mask();
    var le = mask();
    fill(lw, ax, MAP.ay, 3, end - MAP.ay);
    fill(le, ax + 3, MAP.ay, 3, end - MAP.ay);
    MAP.streets.forEach(function (s) {
      var y = s[0];
      if (s[1]) {
        fill(m.dirt, 0, y, MW, 2);
        fill(m.road, ax, y, 6, 2);
        minus(lw, 0, y, MW, 2);
        minus(le, 0, y, MW, 2);
        minus(m.fence, 0, y, MW, 2);
        return;
      }
      fill(m.road, 0, y + 2, MW, 2);
      fill(m.walk, 0, y, MW, 2);
      fill(m.walk, 0, y + 4, MW, 2);
      var a = mask();
      var b = mask();
      fill(a, 0, y, MW, 3);
      fill(b, 0, y + 3, MW, 3);
      minus(a, ax + 2, 0, 2, MH);
      minus(b, ax + 2, 0, 2, MH);
      m.lanes.push(a, b);
      minus(lw, 0, y + 2, MW, 2);
      minus(le, 0, y + 2, MW, 2);
      m.cross.push(['ew', ax, y + 2], ['ew', ax + 4, y + 2], ['ns', ax + 2, y], ['ns', ax + 2, y + 4]);
    });
    m.lanes.push(lw, le);
    for (var i = 0; i < MW * MH; i++) {
      if (m.road[i]) m.walk[i] = 0;
    }
    PLOTS.forEach(function (p) {
      fill(m.busy, p.x - 1, p.y - 1, p.w + 2, p.h + 2);
    });
    for (i = 0; i < MW * MH; i++) {
      if (m.road[i] || m.walk[i] || m.dirt[i] || m.sand[i] || m.water[i]) m.busy[i] = 1;
    }
    fill(m.busy, 0, MAP.rail - 1, MW, 4);
    fill(m.busy, ax - 1, 0, 8, MH);
    scatter(m);
    yards(m);
    MAP.props.forEach(function (p) {
      m.props.push(['prop_' + p[0], p[1], p[2]]);
    });
    m.props.sort(function (a, b) {
      return a[2] - b[2];
    });
    masks = m;
  }

  var seed = 7;

  function rand() {
    seed = (seed + 0x6d2b79f5) | 0;
    var t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  function plant(m, name, tx, ty, w, h) {
    var x0 = tx - (w >> 1);
    for (var j = ty - h + 1; j <= ty; j++) {
      for (var i = x0; i < x0 + w; i++) {
        if (j < 0 || i < 0 || i >= MW || j >= MH || m.busy[j * MW + i]) return;
      }
    }
    fill(m.busy, x0, ty - h + 1, w, h);
    m.props.push([name, tx, ty]);
  }

  function scatter(m) {
    var kinds = [['prop_tree_a', 3, 4, 0.3], ['prop_tree_b', 2, 4, 0.2], ['prop_tree_c', 2, 3, 0.2], ['prop_pine1', 2, 3, 0.15],
      ['prop_oak1', 5, 5, 0.15]];
    for (var y = 6; y < MH - 4; y += 3) {
      for (var x = 1; x < MW - 2; x += 3) {
        var tx = x + Math.floor(rand() * 3);
        var ty = y + Math.floor(rand() * 3);
        if (rand() > 0.55) continue;
        var k = ['prop_palm', 4, 5];
        if (ty <= MAP.tops.beach - 4) {
          var r = rand();
          k = kinds[0];
          for (var n = 0; n < kinds.length - 1 && r > kinds[n][3]; n++) {
            r -= kinds[n][3];
            k = kinds[n + 1];
          }
        }
        plant(m, k[0], tx, ty, k[1], k[2]);
      }
    }
  }

  function yards(m) {
    PLOTS.forEach(function (p) {
      if (p.kind === 'fixed' || p.kind === 'shore') return;
      var top = MAP.ay;
      MAP.streets.forEach(function (s) {
        var e = s[0] + (s[1] ? 2 : 6);
        if (e <= p.y && e > top) top = e;
      });
      var depth = p.y - top;
      if (depth < 3) return;
      for (var n = Math.floor(depth * p.w / 16); n > 0; n--) {
        var tx = p.x + 1 + Math.floor(rand() * (p.w - 2));
        var ty = p.y - 2 - Math.floor(rand() * (depth - 2));
        var r = rand();
        if (r < 0.2) plant(m, 'prop_bed', tx, ty, 3, 2);
        else if (r < 0.35) plant(m, 'prop_bench', tx, ty, 3, 2);
        else if (r < 0.5 && depth >= 6) plant(m, 'prop_lamp', tx, ty, 2, 4);
        else plant(m, 'prop_bush', tx, ty, 1, 1);
      }
    });
  }

  function auto(g, name, m, x, y, dx, dy) {
    var n = at(m, x, y - 1);
    var e = at(m, x + 1, y);
    var s = at(m, x, y + 1);
    var w = at(m, x - 1, y);
    var k = n | e << 1 | s << 2 | w << 3;
    if (n && e && at(m, x + 1, y - 1)) k |= 16;
    if (s && e && at(m, x + 1, y + 1)) k |= 32;
    if (s && w && at(m, x - 1, y + 1)) k |= 64;
    if (n && w && at(m, x - 1, y - 1)) k |= 128;
    var t = ATK[k] || ATE[k & 15];
    g.drawImage(img['gr_' + name], t[0] * T, t[1] * T, T, T, dx, dy, T, T);
  }

  function paintChunk(ci, cj) {
    var c = document.createElement('canvas');
    var x0 = ci * CH / T;
    var y0 = cj * CH / T;
    var tw = Math.min(CH / T, MW - x0);
    var th = Math.min(CH / T, MH - y0);
    c.width = tw * T;
    c.height = th * T;
    var g = c.getContext('2d');
    g.imageSmoothingEnabled = false;
    var m = masks;
    for (var y = y0; y < y0 + th; y++) {
      for (var x = x0; x < x0 + tw; x++) {
        var i = y * MW + x;
        var dx = (x - x0) * T;
        var dy = (y - y0) * T;
        g.drawImage(img.gr_grass, T, 0, T, T, dx, dy, T, T);
        if (m.water[i]) g.drawImage(img.gr_water_grass, T, 0, T, T, dx, dy, T, T);
        if (m.deep[i]) auto(g, 'deep_water', m.deep, x, y, dx, dy);
        if (m.sand[i]) auto(g, y === MAP.shore + 3 ? 'sand_on_water' : 'sand', m.sand, x, y, dx, dy);
        if (m.dirt[i]) auto(g, 'dirt', m.dirt, x, y, dx, dy);
        if (m.road[i]) g.drawImage(img.gr_asphalt, 0, 0, T, T, dx, dy, T, T);
        m.lanes.forEach(function (l) {
          if (l[i]) auto(g, 'asphalt_lines', l, x, y, dx, dy);
        });
        if (m.walk[i]) auto(g, 'sidewalk', m.walk, x, y, dx, dy);
        if (m.fence[i]) auto(g, 'fence', m.fence, x, y, dx, dy);
      }
    }
    m.cross.forEach(function (k) {
      g.drawImage(img['gr_crosswalk_' + k[0]], (k[1] - x0) * T, (k[2] - y0) * T);
    });
    for (x = x0; x < x0 + tw; x++) g.drawImage(img.gr_rail_ew, (x - x0) * T, (MAP.rail - y0) * T);
    m.props.forEach(function (p) {
      var im = img[p[0]];
      g.drawImage(im, p[1] * T + 8 - (im.width >> 1) - x0 * T, (p[2] + 1) * T - im.height - y0 * T);
    });
    return c;
  }

  function chunk(ci, cj) {
    var n = cj * COLS + ci;
    if (!chunks[n]) chunks[n] = paintChunk(ci, cj);
    return chunks[n];
  }

  function plotInfo() {
    var last = MAP.streets.length - 1;
    PLOTS.forEach(function (p, i) {
      plots[i] = { x: p.x * T, y: p.y * T, w: p.w * T, h: p.h * T, bottom: (p.y + p.h) * T, cx: (p.x + p.w / 2) * T, cy: (p.y + p.h / 2) * T };
      st[i] = -1;
      MAP.streets.forEach(function (s, k) {
        if (s[0] === p.y + p.h) st[i] = k;
      });
      if (p.kind === 'shore') st[i] = last;
      if (p.id === 'd-train') trainX = plots[i].cx;
    });
  }

  function artName(i) {
    var p = S.plots[i];
    if (!p.b) return '';
    if (p.l > 0) return 'bld_' + artOf(p.b) + '_' + p.l;
    var big = SPR[p.b] || [PLOTS[i].w, PLOTS[i].h];
    return 'con_' + big[0] + 'x' + big[1];
  }

  function sprite(i) {
    var n = artName(i);
    return n ? img[n] : null;
  }

  function spriteRect(i, im) {
    var o = plots[i];
    return { x: o.x + (o.w - im.width >> 1), y: o.bottom - im.height, w: im.width, h: im.height };
  }

  function solid(i) {
    var n = artName(i);
    var im = img[n];
    if (!n || !im || !im.width) return null;
    var r = spriteRect(i, im);
    var b = BOX[n] || [0, 0, im.width, im.height];
    var s = { x: r.x + b[0], y: r.y + b[1], r: r.x + b[2], b: r.y + b[3] };
    if (S.plots[i].n > 0 && S.plots[i].l > 0) {
      var big = SPR[S.plots[i].b] || [PLOTS[i].w, PLOTS[i].h];
      var c = 'con_' + big[0] + 'x' + big[1];
      var cr = spriteRect(i, img[c]);
      var cb = BOX[c] || [0, 0, img[c].width, img[c].height];
      s.x = Math.min(s.x, cr.x + cb[0]);
      s.y = Math.min(s.y, cr.y + cb[1]);
      s.r = Math.max(s.r, cr.x + cb[2]);
    }
    return s;
  }

  function lane(k, east) {
    var s = MAP.streets[k];
    return s[0] + (s[1] ? (east ? 1.5 : 0.5) : east ? 3.5 : 2.5);
  }

  function access(i) {
    if (i < 0 || st[i] < 0) return { k: -1, x: R.spot.x, y: R.spot.y, left: true };
    var x = PLOTS[i].x + PLOTS[i].w / 2;
    return { k: st[i], x: x, y: 0, left: x < MAP.ax + 3 };
  }

  function wy(k, far) {
    var s = MAP.streets[k];
    return s[0] + (far && !s[1] ? 5.2 : 1.1);
  }

  function wroute(a, b, far) {
    var A = access(a);
    var B = access(b);
    var pts = [];
    var ya = A.k < 0 ? (a >= 0 ? PLOTS[a].y + PLOTS[a].h + 0.8 : A.y) : wy(A.k, far);
    if (A.k >= 0 && far && ya !== wy(A.k)) pts.push([A.x, wy(A.k)]);
    if (A.k >= 0) pts.push([A.x, ya]);
    if (A.k >= 0 && A.k === B.k) {
      pts.push([B.x, ya]);
      if (far) pts.push([B.x, wy(B.k)]);
      return pts;
    }
    var vx = A.k < 0 || A.left ? AVW : AVE;
    pts.push([vx, ya]);
    if (B.k < 0) return pts;
    pts.push([vx, wy(B.k, far)], [B.x, wy(B.k, far)]);
    if (far && wy(B.k, far) !== wy(B.k)) pts.push([B.x, wy(B.k)]);
    return pts;
  }

  function vroute(a, b) {
    var A = access(a);
    var B = access(b);
    if (A.k >= 0 && A.k === B.k) {
      var l = lane(A.k, B.x >= A.x);
      return [[A.x, l], [B.x, l]];
    }
    var down = (B.k < 0 ? B.y : MAP.streets[B.k][0]) > (A.k < 0 ? A.y : MAP.streets[A.k][0]);
    var vx = MAP.ax + (down ? 2.5 : 3.5);
    var pts = [];
    var out = A.k < 0 ? A.y : lane(A.k, A.left);
    if (A.k >= 0) pts.push([A.x, out]);
    pts.push([vx, out]);
    var inn = B.k < 0 ? B.y : lane(B.k, !B.left);
    pts.push([vx, inn]);
    if (B.k >= 0) pts.push([B.x, inn]);
    return pts;
  }

  function path(pts) {
    var cum = [0];
    for (var i = 1; i < pts.length; i++) cum[i] = cum[i - 1] + Math.abs(pts[i][0] - pts[i - 1][0]) + Math.abs(pts[i][1] - pts[i - 1][1]);
    return { pts: pts, cum: cum, total: cum[cum.length - 1] };
  }

  function along(p, d) {
    var i = 1;
    while (i < p.pts.length - 1 && p.cum[i] < d) i++;
    var a = p.pts[i - 1];
    var b = p.pts[i];
    var len = p.cum[i] - p.cum[i - 1];
    var f = len > 0 ? Math.max(0, Math.min(1, (d - p.cum[i - 1]) / len)) : 1;
    var dx = b[0] - a[0];
    var dy = b[1] - a[1];
    return { x: a[0] + dx * f, y: a[1] + dy * f, dir: Math.abs(dx) >= Math.abs(dy) ? (dx < 0 ? 1 : 2) : (dy < 0 ? 3 : 0) };
  }

  function viewRect() {
    return { x: cx - W / sc / 2, y: cy - (head + (H - inset - head) / 2) / sc, w: W / sc, h: H / sc };
  }

  function near(pts) {
    var v = viewRect();
    var m = 40 * T;
    return pts.some(function (p) {
      return p[0] * T > v.x - m && p[0] * T < v.x + v.w + m && p[1] * T > v.y - m && p[1] * T < v.y + v.h + m;
    });
  }

  function feed(moves, trips, notes) {
    if (!done) return;
    trips.forEach(function (t) {
      if (t.from < 0 || t.to < 0 || walkers.length >= 34) return;
      var far = rand() < 0.5;
      var out = wroute(t.from, t.to, far);
      if (out.length < 2 || !near(out)) return;
      var there = out.slice();
      var back = out.slice(0, -1).reverse();
      var p = path(there.concat(back));
      p.stop = path(there).total;
      walkers.push({ p: p, d: 0, v: 2.2 + rand() * 0.8, face: Math.floor(rand() * FACES.length), off: (rand() - 0.5) * 0.8, wait: 0, gone: false, ph: rand() * 6 });
    });
    moves.forEach(function (m) {
      if (m.from >= S.plots.length || m.to >= S.plots.length) return;
      var p = path(vroute(m.from, m.to));
      var lw = m.n > 0 ? Math.min(LOAD_TIME, m.dur * 0.3) : 0;
      if (trucks.length > 24) trucks.shift();
      trucks.push({ p: p, age: 0, dur: Math.max(0.5, m.dur), lw: lw, van: town().trucks <= 1, n: m.n });
    });
    notes.forEach(function (n) {
      var kind = n.kind || n.type;
      if (kind === 'order' && n.text === 'train') trains.push({ x: -400, state: 0, wait: 0, orange: rand() < 0.5 });
      if (kind === 'built' && n.bid === 'train') trains.push({ x: -400, state: 0, wait: 0, orange: false });
    });
  }

  function lifeStep(dt) {
    walkers = walkers.filter(function (w) {
      if (w.wait > 0) {
        w.wait -= dt;
        return true;
      }
      w.d += w.v * dt;
      if (!w.gone && w.d >= w.p.stop) {
        w.gone = true;
        w.wait = 1.2;
      }
      return w.d < w.p.total;
    });
    trucks = trucks.filter(function (k) {
      k.age += dt;
      return k.age < k.dur + 0.3;
    });
    trains = trains.filter(function (t) {
      if (t.state === 0) {
        t.x += 190 * dt;
        if (t.x >= trainX) {
          t.x = trainX;
          t.state = 1;
          t.wait = 6;
        }
      } else if (t.state === 1) {
        t.wait -= dt;
        if (t.wait <= 0) t.state = 2;
      } else {
        t.x += 190 * dt;
      }
      return t.x < MW * T + 400;
    });
    var veh = [];
    trucks.forEach(function (k) {
      var r = truckAt(k);
      veh.push({ x: r.x, y: r.y, dir: r.dir, t: true });
    });
    cars.forEach(function (c) {
      var r = along(c.p, c.d);
      c.at = { x: r.x, y: r.y, dir: r.dir, c: c };
      veh.push(c.at);
    });
    cars.forEach(function (c) {
      if (c.go > 0) {
        c.go -= dt;
        c.hold = 0;
      } else if (carBlocked(c, veh)) {
        c.hold = (c.hold || 0) + dt;
        // a stuck pair gives way after a while instead of deadlocking
        if (c.hold > 4) c.go = 1.5;
        return;
      } else {
        c.hold = 0;
      }
      c.d += c.v * dt;
      if (c.d > c.len) respawn(c);
    });
    animals.forEach(function (a) {
      a.wait -= dt;
      if (a.wait > 0) return;
      var dx = a.tx - a.x;
      var dy = a.ty - a.y;
      var len = Math.sqrt(dx * dx + dy * dy);
      if (len < 1) {
        a.wait = 1 + rand() * 4;
        a.tx = a.r.x + rand() * a.r.w;
        a.ty = a.r.y + rand() * a.r.h;
        a.walk = false;
        return;
      }
      a.walk = true;
      a.dir = Math.abs(dx) > Math.abs(dy) || a.kind === 'cow' ? (dx > 0 ? 0 : 2) : (dy > 0 ? 3 : 1);
      a.x += dx / len * a.v * dt;
      a.y += dy / len * a.v * dt;
    });
  }

  var DX = [0, -1, 1, 0];
  var DY = [1, 0, 0, -1];

  // a car holds back for a vehicle just ahead in its lane, or before a crossing that another vehicle is using
  function carBlocked(c, veh) {
    var a = c.at;
    var dx = DX[a.dir];
    var dy = DY[a.dir];
    var side = a.dir === 1 || a.dir === 2;
    for (var i = 0; i < veh.length; i++) {
      var o = veh[i];
      if (o === a) continue;
      var ox = o.x - a.x;
      var oy = o.y - a.y;
      var ahead = ox * dx + oy * dy;
      var across = side ? Math.abs(oy) : Math.abs(ox);
      if (o.dir === a.dir && across < 0.8 && ahead > 0 && ahead < 5.5) return true;
    }
    var avx = MAP.ax + 2;
    for (var k = 0; k < MAP.streets.length; k++) {
      var s = MAP.streets[k];
      var y0 = s[1] ? s[0] : s[0] + 2;
      var x0 = avx - 0.5;
      var x1 = avx + 2.5;
      var y1 = y0 + 2.5;
      y0 -= 0.5;
      var inside = a.x > x0 && a.x < x1 && a.y > y0 && a.y < y1;
      if (inside) continue;
      var enter = false;
      for (var d = 2; d <= 4.5; d += 0.5) {
        var px2 = a.x + dx * d;
        var py2 = a.y + dy * d;
        if (px2 > x0 && px2 < x1 && py2 > y0 && py2 < y1) enter = true;
      }
      if (!enter) continue;
      for (var j = 0; j < veh.length; j++) {
        var v = veh[j];
        if (v === a) continue;
        var vs = v.dir === 1 || v.dir === 2;
        if (!v.t && vs === side) continue;
        if (v.x > x0 - 1 && v.x < x1 + 1 && v.y > y0 - 1 && v.y < y1 + 1) return true;
      }
    }
    return false;
  }

  function respawn(c) {
    var open = [];
    MAP.streets.forEach(function (s, k) {
      if (!s[1] && S.open[s[2]]) open.push(k);
    });
    var avenue = rand() < 0.35 || !open.length;
    c.v = 4 + rand() * 2.5;
    c.sp = Math.floor(rand() * CARS.length);
    c.d = 0;
    if (avenue) {
      // only the stretch of avenue that is not dimmed
      var y0 = MH;
      var y1 = 0;
      BANDS.forEach(function (b) {
        if (!S.open[b[0]]) return;
        y0 = Math.min(y0, b[1]);
        y1 = Math.max(y1, b[2]);
      });
      y0 = Math.max(y0, MAP.ay);
      y1 = Math.min(y1, MAP.streets[MAP.streets.length - 1][0] + 5);
      var south = rand() < 0.5;
      c.pts = south ? [[MAP.ax + 2.5, y0], [MAP.ax + 2.5, y1]] : [[MAP.ax + 3.5, y1], [MAP.ax + 3.5, y0]];
    } else {
      var k = open[Math.floor(rand() * open.length)];
      var east = rand() < 0.5;
      c.pts = east ? [[-4, lane(k, true)], [MW + 4, lane(k, true)]] : [[MW + 4, lane(k, false)], [-4, lane(k, false)]];
    }
    c.p = path(c.pts);
    c.len = c.p.total;
    c.d = rand() * c.len * 0.5;
  }

  function lifeSync(now) {
    if (now - carAt > 1500) {
      carAt = now;
      var n = Math.min(10, 2 + Math.floor(R.pop / 25));
      while (cars.length < n) {
        var c = { d: 0 };
        respawn(c);
        cars.push(c);
      }
      cars.length = n;
    }
    if (now - animAt < 1000) return;
    animAt = now;
    var live = {};
    S.plots.forEach(function (p, i) {
      if (p.l < 1 || p.dem > 0) return;
      if (p.b === 'coop') pen(i, live, 'chick', 1 + p.l, COOP[p.l - 1]);
      if (p.b === 'barn') pen(i, live, 'cow', 1 + (p.l + 1 >> 1), BARN[p.l - 1]);
      if (p.b === 'pier') {
        live['b' + i] = 1;
        if (!boats.some(function (b) {
          return b.i === i;
        })) boats.push({ i: i, t: rand() * 10 });
      }
    });
    animals = animals.filter(function (a) {
      return live[a.key];
    });
    boats = boats.filter(function (b) {
      return live['b' + b.i];
    });
  }

  function pen(i, live, kind, n, f) {
    var r = spriteRect(i, sprite(i));
    var key = kind + i;
    live[key] = 1;
    var have = animals.filter(function (a) {
      return a.key === key;
    }).length;
    var box = { x: r.x + f[0], y: r.y + f[1], w: f[2] - f[0], h: f[3] - f[1] };
    for (; have < n; have++) {
      var a = { key: key, kind: kind, i: i, r: box, x: box.x + rand() * box.w, y: box.y + rand() * box.h, tx: 0, ty: 0, wait: rand() * 3,
        dir: kind === 'cow' ? 2 : 3, v: kind === 'cow' ? 9 : 14, walk: false, tone: rand() < 0.5, fr: rand() * 6 };
      a.tx = a.x;
      a.ty = a.y;
      animals.push(a);
    }
    animals.forEach(function (a) {
      if (a.key !== key) return;
      if (a.r.x !== box.x || a.r.y !== box.y || a.r.w !== box.w) {
        a.tx = box.x + rand() * box.w;
        a.ty = box.y + rand() * box.h;
        a.wait = 0;
      }
      a.r = box;
    });
  }

  function clampCam() {
    var vw = W / sc;
    var vh = (H - inset - head) / sc;
    var mw = MW * T;
    var mh = MH * T;
    cx = vw >= mw ? mw / 2 : Math.max(vw / 2, Math.min(mw - vw / 2, cx));
    cy = vh >= mh ? mh / 2 : Math.max(vh / 2, Math.min(mh - vh / 2, cy));
  }

  function origin() {
    ox = Math.round(W / 2 - cx * sc);
    oy = Math.round(head + (H - inset - head) / 2 - cy * sc);
  }

  function px(v) {
    return ox + Math.round(v) * sc;
  }

  function py(v) {
    return oy + Math.round(v) * sc;
  }

  function put(im, sx, sy, sw, sh, wx, wy, alpha, z) {
    if (alpha === undefined) alpha = 1;
    if (z === undefined) z = 1;
    var x = px(wx);
    var y = py(wy);
    if (x > W || y > H || x + sw * sc < 0 || y + sh * sc < 0) return;
    if (alpha < 1) ctx.globalAlpha = alpha;
    ctx.drawImage(im, sx, sy, sw, sh, x, y, sw * sc * z, sh * sc * z);
    ctx.globalAlpha = 1;
  }

  function putFlip(im, sx, sy, sw, sh, wx, wy) {
    var x = px(wx);
    var y = py(wy);
    if (x > W || y > H || x + sw * sc < 0 || y + sh * sc < 0) return;
    ctx.save();
    ctx.translate(x + sw * sc, y);
    ctx.scale(-1, 1);
    ctx.drawImage(im, sx, sy, sw, sh, 0, 0, sw * sc, sh * sc);
    ctx.restore();
  }

  function frame(n, t) {
    return Math.floor(t * 8) % n;
  }

  function items(list) {
    var x0 = vr.x - 200;
    var x1 = vr.x + vr.w + 200;
    var y0 = vr.y - 300;
    var y1 = vr.y + vr.h + 300;
    PLOTS.forEach(function (p, i) {
      var o = plots[i];
      if (!S.plots[i].b || o.x > x1 || o.x + o.w < x0 || o.bottom < y0 || o.bottom - 400 > y1) return;
      list.push({ y: o.bottom, k: 0, i: i });
    });
    if (sc <= minSc) return;
    walkers.forEach(function (w) {
      if (w.wait > 0 && w.gone) return;
      var r = along(w.p, Math.min(w.d, w.p.total));
      list.push({ y: r.y * T, k: 1, w: w, r: r });
    });
    trucks.forEach(function (k) {
      var r = truckAt(k);
      list.push({ y: r.y * T, k: 2, t: k, r: r });
    });
    cars.forEach(function (c) {
      var r = along(c.p, c.d);
      list.push({ y: r.y * T, k: 3, c: c, r: r });
    });
    animals.forEach(function (a) {
      list.push({ y: plots[a.i].bottom + (a.y - plots[a.i].y) / 1000, k: 4, a: a });
    });
    boats.forEach(function (b) {
      list.push({ y: plots[b.i].bottom + 12, k: 5, b: b });
    });
    trains.forEach(function (tr) {
      list.push({ y: (MAP.rail + 2) * T + 1, k: 6, tr: tr });
    });
  }

  function truckAt(k) {
    var f = Math.max(0, Math.min(1, (k.age - k.lw) / Math.max(0.1, k.dur - k.lw)));
    return along(k.p, f * k.p.total);
  }

  function drawItem(it, now, covered) {
    var t = now / 1000;
    if (it.k === 0) return building(it.i, now, covered);
    if (it.k === 1) {
      var w = it.w;
      var r = it.r;
      var side = r.dir === 1 || r.dir === 2;
      put(img['life_resident_' + FACES[w.face]], frame(6, t + w.ph) * 16, r.dir * 32, 16, 32, (r.x + (side ? 0 : w.off)) * T - 8,
        (r.y + (side ? w.off : 0)) * T - 32);
    } else if (it.k === 2) {
      var k = it.t;
      var sheet = img['life_' + (k.van ? 'van_' : 'truck_') + DIRS[it.r.dir]];
      var lateral = it.r.dir === 1 || it.r.dir === 2;
      var fw = sheet.width / (k.van ? 1 : 6);
      var moving = k.age > k.lw && k.age < k.dur;
      var z = k.van ? 0.42 : 0.4;
      put(sheet, k.van ? 0 : (moving ? frame(6, t * 1.5) : 0) * fw, 0, fw, sheet.height, it.r.x * T - fw * z / 2,
        it.r.y * T - sheet.height * z + (lateral ? 6 : 10), 1, z);
    } else if (it.k === 3) {
      var car = img['life_car_' + CARS[it.c.sp]];
      put(car, it.r.dir * 80, 0, 80, car.height, it.r.x * T - 40, it.r.y * T - 56);
    } else if (it.k === 4) {
      animal(it.a, t);
    } else if (it.k === 5) {
      var b = it.b;
      var o = plots[b.i];
      var big = S.plots[b.i].l >= 3;
      var sway = Math.sin(t * 0.3 + b.t) * 28;
      var left = Math.cos(t * 0.3 + b.t) > 0;
      var boat = img['life_boat' + (big ? '2' : '') + '_' + (left ? 'left' : 'right')];
      var bw = boat.width / 8;
      put(boat, frame(8, t * 0.6) * bw, 0, bw, boat.height, o.x + o.w + 30 + sway - bw / 2, o.y + 150 - boat.height);
    } else {
      var tr = it.tr;
      var train = img['life_train_' + (tr.orange ? 'orange' : 'white')];
      var tx = tr.x - train.width / 2;
      var ty = (MAP.rail + 2) * T - train.height;
      if (tr.state === 2) put(train, 0, 0, train.width, train.height, tx, ty);
      else putFlip(train, 0, 0, train.width, train.height, tx, ty);
    }
  }

  function animal(a, t) {
    if (a.kind === 'chick') {
      var im = img['life_chicken_' + (a.tone ? 'white' : 'brown')];
      var col = a.walk ? a.dir * 6 + frame(6, t + a.fr) : a.dir;
      put(im, col * 16, a.walk ? 16 : 0, 16, 16, a.x - 8, a.y - 14);
    } else {
      var cow = img['life_' + (a.tone ? 'cow' : 'cow_white')];
      var cc = a.walk ? a.dir * 6 + frame(6, t * 0.7 + a.fr) : a.dir;
      put(cow, cc * 32, a.walk ? 32 : 0, 32, 32, a.x - 16, a.y - 26);
    }
  }

  function building(i, now, covered) {
    var q = S.plots[i];
    var im = sprite(i);
    if (!im) return;
    var r = spriteRect(i, im);
    var a = covered ? 0.3 : 1;
    if (q.dem > 0) {
      var f = Math.max(0.05, q.dem / DEMOLISH_TIME);
      var hh = Math.max(2, Math.round(im.height * f));
      var shake = Math.round(Math.sin(now / 40) * 1);
      put(im, 0, im.height - hh, im.width, hh, r.x + shake, r.y + im.height - hh, 0.8 * a);
      ctx.fillStyle = 'rgba(190,175,150,0.55)';
      for (var d = 0; d < 6; d++) {
        var ph = (now / 500 + d * 0.37) % 1;
        var rad = (4 + ph * 8) * sc;
        ctx.beginPath();
        ctx.arc(px(r.x + (d + 0.5) * im.width / 6), py(r.y + im.height - 6 - ph * 14), rad, 0, 6.3);
        ctx.fill();
      }
      return;
    }
    if (q.off) a *= 0.55;
    put(im, 0, 0, im.width, im.height, r.x, r.y, a);
    var o = plots[i];
    if (q.n > 0) {
      var big = SPR[q.b] || [PLOTS[i].w, PLOTS[i].h];
      var con = img['con_' + big[0] + 'x' + big[1]];
      if (q.l > 0) {
        var cr = spriteRect(i, con);
        put(con, 0, 0, con.width, con.height, cr.x, cr.y, 0.85 * a);
      }
      var tot = B[q.b].build[q.n - 1];
      var prog = Math.max(0, Math.min(1, 1 - q.left / tot));
      var bx = px(o.cx - 16);
      var by = py(o.bottom - 8);
      ctx.fillStyle = 'rgba(0,0,0,0.6)';
      ctx.fillRect(bx - sc, by - sc, 32 * sc + 2 * sc, 5 * sc);
      ctx.fillStyle = '#ffd24a';
      ctx.fillRect(bx, by, Math.round(32 * prog) * sc, 3 * sc);
    }
    if (q.off) {
      ctx.fillStyle = '#fff';
      ctx.fillRect(px(o.cx - 5), py(o.bottom - 40), 3 * sc, 9 * sc);
      ctx.fillRect(px(o.cx + 2), py(o.bottom - 40), 3 * sc, 9 * sc);
    }
  }

  function padRect(i) {
    var o = plots[i];
    if (PLOTS[i].kind !== 'farmland') return { x: o.x, y: o.y, w: o.w, h: o.h };
    var w = SPR.wheat[0] * T;
    var h = SPR.wheat[1] * T;
    return { x: o.x + (o.w - w) / 2, y: o.bottom - h, w: w, h: h };
  }

  function pad(i, locked) {
    var o = plots[i];
    var kind = PLOTS[i].kind;
    var p = padRect(i);
    var X = px(p.x);
    var Y = py(p.y);
    var Wd = p.w * sc;
    var Hd = p.h * sc;
    if (kind === 'shore') ctx.fillStyle = 'rgba(190,150,90,0.6)';
    else if (kind === 'farmland') ctx.fillStyle = 'rgba(139,98,58,0.85)';
    else ctx.fillStyle = 'rgba(214,207,188,0.9)';
    if (locked) ctx.fillStyle = 'rgba(160,165,180,0.5)';
    ctx.fillRect(X, Y, Wd, Hd);
    ctx.strokeStyle = locked ? 'rgba(90,100,120,0.9)' : 'rgba(255,255,255,0.95)';
    ctx.lineWidth = Math.max(1, sc);
    ctx.setLineDash([4 * sc, 3 * sc]);
    ctx.strokeRect(X + sc, Y + sc, Wd - 2 * sc, Hd - 2 * sc);
    ctx.setLineDash([]);
    var mx = px(o.cx);
    var my = py(p.y + p.h / 2);
    var r = 7 * sc;
    ctx.fillStyle = locked ? 'rgba(70,80,100,0.9)' : 'rgba(40,150,70,0.92)';
    ctx.beginPath();
    ctx.arc(mx, my, r, 0, 6.3);
    ctx.fill();
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = Math.max(1, sc);
    ctx.stroke();
    ctx.fillStyle = '#fff';
    if (locked) {
      ctx.fillRect(mx - 3 * sc, my - sc, 6 * sc, 4 * sc);
      ctx.strokeRect(mx - 2 * sc, my - 4 * sc, 4 * sc, 3 * sc);
    } else {
      ctx.fillRect(mx - sc, my - 4 * sc, 2 * sc, 8 * sc);
      ctx.fillRect(mx - 4 * sc, my - sc, 8 * sc, 2 * sc);
    }
  }

  function dim() {
    BANDS.forEach(function (b) {
      if (S.open[b[0]]) return;
      var y0 = Math.max(0, py(b[1] * T));
      var y1 = Math.min(H, py(b[2] * T));
      if (y1 <= y0) return;
      ctx.fillStyle = 'rgba(18,26,48,0.55)';
      ctx.fillRect(0, y0, W, y1 - y0);
    });
  }

  function signs() {
    var plaza = MAP.plaza[0];
    var tops = [['village', MAP.tops.village + 5], ['farm', MAP.tops.farm + 5], ['beach', MAP.tops.beach + 5], ['downtown', plaza[1] + (plaza[3] >> 1)]];
    tops.forEach(function (b) {
      if (S.open[b[0]]) return;
      var a = AR[b[0]];
      var x = px(MW * T / 2);
      var y = py(b[1] * T);
      if (y < -100 || y > H + 100) return;
      var f = Math.max(8 * sc, 9 * dpr);
      ctx.font = 'bold ' + Math.round(f) + 'px monospace';
      var l1 = a.name;
      var l2 = 'unlocks at ' + a.unlock + ' residents';
      var w = Math.max(ctx.measureText(l1).width, ctx.measureText(l2).width) + f;
      ctx.fillStyle = 'rgba(20,28,50,0.92)';
      ctx.fillRect(x - w / 2, y - f * 1.2, w, f * 2.9);
      ctx.strokeStyle = '#e8c15a';
      ctx.lineWidth = Math.max(1, Math.round(sc / 2));
      ctx.strokeRect(x - w / 2, y - f * 1.2, w, f * 2.9);
      ctx.fillStyle = '#ffd24a';
      ctx.textAlign = 'center';
      ctx.fillText(l1, x, y + f * 0.1);
      ctx.fillStyle = '#fff';
      ctx.fillText(l2, x, y + f * 1.5);
    });
    ctx.textAlign = 'left';
  }

  function outline(i, color, wide) {
    var p = padRect(i);
    ctx.strokeStyle = color;
    ctx.lineWidth = wide * sc;
    ctx.strokeRect(px(p.x), py(p.y), p.w * sc, p.h * sc);
  }

  function pipColor(s) {
    if (s === 'paused') return '#9aa0a6';
    if (s.indexOf('short of workers') === 0) return '#e53935';
    if (s.indexOf('waiting for') === 0 || s.indexOf('needs') > 0) return '#ffb300';
    return '#4caf50';
  }

  // a few status lookups per frame, so a full town at overview does not all refresh in the same one
  function pips(now) {
    var budget = 8;
    PLOTS.forEach(function (p, i) {
      var q = S.plots[i];
      var o = plots[i];
      if (!q.b || q.l < 1 || q.dem > 0 || asking[i] || o.x > vr.x + vr.w || o.x + o.w < vr.x || o.bottom < vr.y || o.y > vr.y + vr.h) return;
      var k = pip[i];
      if (!k || now - k.t > 500) {
        if (budget > 0) {
          budget--;
          k = pip[i] = { t: now, c: pipColor(status(i)) };
        } else if (!k) return;
      }
      var r = Math.round(5 * dpr);
      var x = px(o.cx);
      var y = py(o.y + o.h * 0.35);
      ctx.fillStyle = k.c;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, 6.3);
      ctx.fill();
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = Math.max(1, Math.round(dpr));
      ctx.stroke();
    });
  }

  function bubbleSize() {
    return Math.max(13 * dpr, 10 * sc);
  }

  function bubbleAt(i, now) {
    var u = bubbleSize();
    var s = solid(i);
    var bob = now === undefined ? 0 : Math.sin(now / 280 + i) * u * 0.1;
    return { x: px(plots[i].cx), y: py(s ? s.y : plots[i].y) - Math.round(u * 0.3 + bob), u: u };
  }

  function bubbles(now) {
    var b = Math.max(1, Math.round(dpr));
    for (var k = 0; k < asks.length; k++) {
      var pos = bubbleAt(asks[k], now);
      var u = pos.u;
      var x = pos.x;
      var y = pos.y;
      if (x < -u || x > W + u || y < 0 || y > H + 2 * u) continue;
      var l = Math.round(x - u / 2);
      var t = Math.round(y - u * 1.1);
      var w = Math.round(u);
      var h = Math.round(u * 0.85);
      ctx.fillStyle = '#26324a';
      ctx.fillRect(l - b, t - b, w + 2 * b, h + 2 * b);
      ctx.beginPath();
      ctx.moveTo(x - u * 0.2 - b, t + h);
      ctx.lineTo(x + u * 0.1 + b, t + h);
      ctx.lineTo(x - u * 0.05, t + h + u * 0.3 + b);
      ctx.fill();
      ctx.fillStyle = '#fff';
      ctx.fillRect(l, t, w, h);
      ctx.beginPath();
      ctx.moveTo(x - u * 0.2, t + h - 1);
      ctx.lineTo(x + u * 0.1, t + h - 1);
      ctx.lineTo(x - u * 0.05, t + h + u * 0.3 - 1);
      ctx.fill();
      ctx.fillStyle = '#e8412c';
      var bw = Math.max(2, Math.round(u * 0.14));
      ctx.fillRect(Math.round(x - bw / 2), Math.round(t + h * 0.14), bw, Math.round(h * 0.45));
      ctx.fillRect(Math.round(x - bw / 2), Math.round(t + h * 0.72), bw, bw);
    }
  }

  function ground() {
    var c0 = Math.max(0, Math.floor(vr.x / CH));
    var c1 = Math.min(COLS - 1, Math.floor((vr.x + vr.w) / CH));
    var r0 = Math.max(0, Math.floor(vr.y / CH));
    var r1 = Math.min(Math.ceil(MH * T / CH) - 1, Math.floor((vr.y + vr.h) / CH));
    for (var j = r0; j <= r1; j++) {
      for (var i = c0; i <= c1; i++) {
        var c = chunk(i, j);
        var sx = Math.max(0, Math.floor(vr.x) - i * CH);
        var sy = Math.max(0, Math.floor(vr.y) - j * CH);
        var ex = Math.min(c.width, Math.ceil(vr.x + vr.w) - i * CH);
        var ey = Math.min(c.height, Math.ceil(vr.y + vr.h) - j * CH);
        if (ex <= sx || ey <= sy) continue;
        ctx.drawImage(c, sx, sy, ex - sx, ey - sy, ox + (i * CH + sx) * sc, oy + (j * CH + sy) * sc, (ex - sx) * sc, (ey - sy) * sc);
      }
    }
  }

  function draw(now) {
    if (!done || now - last < 30) return false;
    var dt = Math.min(0.1, (now - last) / 1000);
    last = now;
    var t0 = performance.now();
    if (tween) {
      var f = Math.min(1, (now - tween.t0) / tween.ms);
      var e = f * f * (3 - 2 * f);
      cx = tween.x0 + (tween.x1 - tween.x0) * e;
      cy = tween.y0 + (tween.y1 - tween.y0) * e;
      if (f >= 1) tween = null;
    }
    clampCam();
    origin();
    vr = viewRect();
    ctx.imageSmoothingEnabled = false;
    ctx.fillStyle = '#20314a';
    ctx.fillRect(0, 0, W, H);
    lifeSync(now);
    lifeStep(dt);
    ground();
    PLOTS.forEach(function (p, i) {
      var o = plots[i];
      if (S.plots[i].b || o.x > vr.x + vr.w || o.x + o.w < vr.x || o.bottom < vr.y || o.y > vr.y + vr.h) return;
      pad(i, !S.open[p.area]);
    });
    dim();
    var list = [];
    items(list);
    list.sort(function (a, b) {
      return a.y - b.y;
    });
    var cov = sel >= 0 ? plots[sel] : null;
    list.forEach(function (it) {
      var covered = false;
      if (cov && it.k === 0 && it.i !== sel && it.y > cov.bottom) {
        var s = solid(it.i);
        covered = !!s && s.x < cov.x + cov.w && s.r > cov.x && s.y < cov.bottom && s.b > cov.y;
      }
      drawItem(it, now, covered);
    });
    if (ringAt >= 0) {
      var o = plots[ringAt];
      ctx.beginPath();
      ctx.arc(px(o.cx), py(o.cy), ringR * T * sc, 0, 6.3);
      ctx.fillStyle = 'rgba(255,230,120,0.14)';
      ctx.fill();
      ctx.strokeStyle = 'rgba(255,230,120,0.95)';
      ctx.lineWidth = Math.max(2, Math.round(sc));
      ctx.stroke();
    }
    var pulse = 0.5 + 0.5 * Math.sin(now / 250);
    marks.forEach(function (i) {
      outline(i, 'rgba(120,255,160,' + (0.5 + pulse * 0.5) + ')', 2);
    });
    if (sel >= 0) outline(sel, '#fff', 2);
    signs();
    if (sc <= minSc) pips(now);
    bubbles(now);
    ms += (performance.now() - t0 - ms) * 0.1;
    return true;
  }

  function resize() {
    if (!cv) return;
    var r = cv.getBoundingClientRect();
    dpr = window.devicePixelRatio || 1;
    var w = Math.max(1, Math.round(r.width * dpr));
    var h = Math.max(1, Math.round(r.height * dpr));
    if (cv.width !== w || cv.height !== h) {
      cv.width = w;
      cv.height = h;
    }
    W = w;
    H = h;
    minSc = Math.max(1, Math.floor(W / (MW * T)));
    sc = Math.max(minSc, Math.min(6, sc));
    last = 0;
  }

  function anchor(wx, wy, x, y) {
    cx = wx - (x - W / 2) / sc;
    cy = wy - (y - head - (H - inset - head) / 2) / sc;
    tween = null;
    clampCam();
    origin();
  }

  function zoomTo(n, x, y) {
    n = Math.max(minSc, Math.min(6, n));
    if (n === sc) return;
    var wx = (x - ox) / sc;
    var wy = (y - oy) / sc;
    sc = n;
    anchor(wx, wy, x, y);
  }

  function hitAt(x, y) {
    for (var k = asks.length - 1; k >= 0; k--) {
      var b = bubbleAt(asks[k]);
      if (x >= b.x - b.u * 0.8 && x <= b.x + b.u * 0.8 && y >= b.y - b.u * 1.4 && y <= b.y + b.u * 0.3) return asks[k];
    }
    var wx = (x - ox) / sc;
    var wy = (y - oy) / sc;
    var best = -1;
    var low = -1;
    PLOTS.forEach(function (p, i) {
      var o = plots[i];
      var inside = wx >= o.x && wx < o.x + o.w && wy >= o.y && wy < o.bottom;
      if (!inside && S.plots[i].b) {
        var s = solid(i);
        inside = !!s && wx >= s.x && wx < s.r && wy >= s.y && wy < s.b;
      }
      if (inside && o.bottom > low) {
        low = o.bottom;
        best = i;
      }
    });
    return best;
  }

  function point(e) {
    var r = cv.getBoundingClientRect();
    return { x: (e.clientX - r.left) * dpr, y: (e.clientY - r.top) * dpr, cx: e.clientX, cy: e.clientY };
  }

  function spread() {
    var a = pt[pinch.ids[0]];
    var b = pt[pinch.ids[1]];
    return { d: Math.hypot(a.cx - b.cx, a.cy - b.cy), x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
  }

  function grab(p) {
    drag = { x: p.cx, y: p.cy, cx: cx, cy: cy, moved: false };
    tween = null;
  }

  function onDown(e) {
    cv.setPointerCapture(e.pointerId);
    pt[e.pointerId] = point(e);
    var ids = Object.keys(pt);
    if (ids.length === 1) {
      grab(pt[e.pointerId]);
    } else if (ids.length === 2) {
      pinch = { ids: ids, sc: sc };
      var s = spread();
      pinch.d = s.d;
      pinch.wx = (s.x - ox) / sc;
      pinch.wy = (s.y - oy) / sc;
      if (drag) drag.moved = true;
    }
  }

  function onMove(e) {
    if (!pt[e.pointerId]) return;
    pt[e.pointerId] = point(e);
    if (pinch) {
      var s = spread();
      sc = Math.max(minSc, Math.min(6, Math.round(pinch.sc * s.d / Math.max(1, pinch.d))));
      anchor(pinch.wx, pinch.wy, s.x, s.y);
      return;
    }
    if (!drag) return;
    var p = pt[e.pointerId];
    var dx = p.cx - drag.x;
    var dy = p.cy - drag.y;
    if (!drag.moved && Math.hypot(dx, dy) > 8) drag.moved = true;
    if (drag.moved) {
      cx = drag.cx - dx * dpr / sc;
      cy = drag.cy - dy * dpr / sc;
      clampCam();
    }
  }

  function onUp(e) {
    var p = pt[e.pointerId];
    delete pt[e.pointerId];
    if (pinch) {
      if (pinch.ids.indexOf(String(e.pointerId)) < 0) return;
      pinch = null;
      var rest = Object.keys(pt);
      drag = null;
      if (rest.length) {
        grab(pt[rest[0]]);
        drag.moved = true;
      }
      return;
    }
    if (drag && !drag.moved && p && e.type === 'pointerup') pick(hitAt(p.x, p.y));
    drag = null;
  }

  function onWheel(e) {
    e.preventDefault();
    var p = point(e);
    var unit = e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? H : 1;
    var dx = e.deltaX * unit;
    var dy = e.deltaY * unit;
    if (!e.ctrlKey && e.deltaMode === 0 && (dx !== 0 || Math.abs(dy) < 100)) {
      cx += dx * dpr / sc;
      cy += dy * dpr / sc;
      tween = null;
      clampCam();
      return;
    }
    wheel += dy;
    if (Math.abs(wheel) < 40) return;
    zoomTo(sc + (wheel < 0 ? 1 : -1), p.x, p.y);
    wheel = 0;
  }

  function init(canvas, onPick) {
    cv = canvas;
    ctx = cv.getContext('2d', { alpha: false });
    pick = onPick;
    plotInfo();
    cv.addEventListener('pointerdown', onDown);
    cv.addEventListener('pointermove', onMove);
    cv.addEventListener('pointerup', onUp);
    cv.addEventListener('pointercancel', onUp);
    cv.addEventListener('wheel', onWheel, { passive: false });
    window.addEventListener('resize', resize);
    cx = MW * T / 2;
    cy = R.spot.y * T;
    resize();
    loadAll();
  }

  function focus(i) {
    if (i < 0 || !plots[i]) return;
    var s = S.plots[i].b ? solid(i) : null;
    var y = s ? (s.y + plots[i].bottom) / 2 : plots[i].cy - 40;
    tween = { x0: cx, y0: cy, x1: plots[i].cx, y1: y, t0: performance.now(), ms: 400 };
  }

  function setInset(bottom, top) {
    inset = Math.round(bottom * dpr);
    head = Math.round((top || 0) * dpr);
  }

  function clear() {
    walkers = [];
    trucks = [];
    trains = [];
    boats = [];
    animals = [];
    pip = [];
    marks = [];
  }

  return {
    init: init,
    draw: draw,
    feed: feed,
    resize: resize,
    focus: focus,
    inset: setInset,
    clear: clear,
    select: function (i) {
      sel = i;
    },
    ring: function (i, tiles) {
      ringAt = i === undefined ? -1 : i;
      ringR = tiles || 0;
    },
    mark: function (list) {
      marks = list || [];
    },
    bubbles: function (list) {
      asks.forEach(function (i) {
        asking[i] = false;
      });
      asks = list.slice();
      asks.forEach(function (i) {
        asking[i] = true;
      });
    },
    ready: function () {
      return done;
    },
    look: function (tx, ty, s) {
      sc = Math.max(minSc, Math.min(6, s || sc));
      cx = tx * T;
      cy = ty * T;
      tween = null;
    },
    screen: function (i) {
      return { x: (ox + plots[i].cx * sc) / dpr, y: (oy + plots[i].cy * sc) / dpr };
    },
    ms: function () {
      return ms;
    },
    scale: function () {
      return sc;
    }
  };
})();
