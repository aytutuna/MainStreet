var FLEET = {
  trucks: [
    { cost: 350, add: 'a delivery truck', say: 'Truck hired!' },
    { cost: 2800, add: 'a second truck', say: 'Second truck!' },
    { cost: 14000, add: 'a third truck', say: 'Third truck!' }
  ],
  speed: {
    up: 3000,
    grow: 1.8,
    rungs: [
      { add: 'exhaust puffs', say: 'Exhaust!' },
      { add: 'a painted stripe', say: 'Stripe!' },
      { add: 'a roof rack with parcels', say: 'Roof rack!' },
      { add: 'speed lines', say: 'Speed lines!' },
      { add: 'new red paint', say: 'Red paint!' },
      { add: 'a flashing beacon', say: 'Beacon!' }
    ]
  },
  drones: [
    { cost: 150000, add: 'a delivery drone', say: 'Drone!' },
    { cost: 350000, add: 'a second drone', say: 'Second drone!' },
    { cost: 700000, add: 'a third drone', say: 'Third drone!' },
    { cost: 1200000, add: 'a fourth drone', say: 'Fourth drone!' },
    { cost: 2000000, add: 'a fifth drone', say: 'Fifth drone!' }
  ],
  heli: { add: 'a helicopter and its helipad', say: 'Helicopter!' }
};

// one stack of storeys: roofs and storeys come first, the ground floor last so its sign overlaps the storey above
// adds[k] is the level at which storey k + 1 appears; the ground wall is 48 high and every storey adds 64
function stack(x, ground, mids, roof, adds, from) {
  var p = [];
  for (var k = 0; k <= adds.length; k++) {
    p.push({ n: roof, at: k ? adds[k - 1] : from, to: k < adds.length ? adds[k] - 1 : undefined, x: x, y: 48 + 64 * k });
  }
  adds.forEach(function (at, k) {
    p.push({ n: mids[k], at: at, x: x, y: 48 + 64 * k });
  });
  p.push({ n: ground, at: from, x: x, y: 0 });
  return p;
}

// sprites every district needs: ground tiles, lot sites, street life and the fleet
var COMMON = ['tiles', 'forsale', 'site136_0', 'site136_1', 'site136_2', 'site148_0', 'site148_1', 'site148_2',
  'site232_0', 'site232_1', 'site232_2', 'site304_0', 'site304_1', 'site304_2',
  'lamp', 'hydrant', 'bird', 'bird_fly', 'walk1', 'walk2', 'walk3', 'walk4', 'walk5', 'bus_l', 'bus_r',
  'car_l1', 'car_l2', 'car_l3', 'car_l4', 'car_l5', 'car_l6', 'car_l7', 'car_l8',
  'car_r1', 'car_r2', 'car_r3', 'car_r4', 'car_r5', 'car_r6', 'car_r7', 'car_r8',
  'truck', 'truck2', 'truck3', 'truck5', 'parcel1', 'parcel2', 'parcel3', 'drone', 'dparcel', 'heli1', 'heli2'];

// the ground behind the street: a path along the back with spurs to the pavement, a lawn in front of it with
// bushes and a few trees, and behind it ponds, bench groups, fenced gardens and tree clusters, then thin rows of trees.
// Everything is placed beside the paths, never on them, and from a fixed seed so the same ground is baked every time
function backyard(w, lots) {
  var seed = 7;
  var edges = [];
  var mids = [];
  var at = 0;
  lots.forEach(function (lw) {
    edges.push(at - 12, at + 12);
    mids.push(at + lw / 2);
    at += lw;
  });
  var list = [];
  var rnd = function (n) {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff;
    return (seed >> 8) % n;
  };
  var trees = ['tree_a', 'tree_b', 'tree_c'];
  var beds = ['bedp', 'bedr', 'bedp'];
  var wide = { tree_a: 48, tree_b: 32, tree_c: 32, bedp: 32, bedr: 32, bloom1: 16, bloom2: 16, bush: 16, bench: 48, pond: 48, picket: 16 };
  var spurs = [216, 464, 726, 1012, 1297, 1620, 1868];
  // a group goes in only when it clears the spurs and does not straddle the side of a building, which would leave a sliver showing
  var put = function (items) {
    var x0 = 1e9;
    var x1 = -1e9;
    items.forEach(function (it) {
      x0 = Math.min(x0, it.x);
      x1 = Math.max(x1, it.x + wide[it.n] * (it.rep || 1));
    });
    var ok = spurs.every(function (sx) {
      return items.every(function (it) {
        return it.y >= 136 || it.x + wide[it.n] * (it.rep || 1) < sx - 6 || it.x > sx + 22;
      });
    }) && edges.every(function (e) {
      return x1 < e - 3 || x0 > e + 3;
    }) && mids.every(function (m) {
      // the for sale sign hides low things in the middle of a lot
      return items.every(function (it) {
        return it.y > 60 || it.x + wide[it.n] < m - 24 || it.x > m + 24;
      });
    });
    if (ok) items.forEach(function (it) {
      list.push(it);
    });
    return ok;
  };
  list.push({ t: 3, x: 0, y: 136, w: w, h: 16 });
  spurs.forEach(function (sx) {
    list.push({ t: 3, x: sx, y: 0, w: 16, h: 136 });
  });
  for (var x = 28; x < w - 190; x += 150 + rnd(40)) {
    var kind = rnd(100);
    var r = [rnd(24), rnd(3), rnd(3), rnd(3), rnd(2), rnd(4), rnd(12), rnd(12), rnd(2), rnd(10), rnd(20), rnd(20)];
    var make = function (xx) {
      var g;
      if (kind < 22) {
        var py = 190 + r[0];
        return [{ n: 'pond', x: xx, y: py }, { n: 'bush', x: xx - 20, y: py + 4 }, { n: 'bush', x: xx + 54, y: py + 10 },
          { n: trees[r[1]], x: xx + 8, y: py + 62 }];
      }
      if (kind < 46) {
        return [{ n: 'bench', x: xx, y: 153 }, { n: r[4] ? 'bedr' : beds[r[1]], x: xx + 52, y: 154 }];
      }
      if (kind < 70) {
        var rep = 5 + r[5];
        var fw = rep * 16;
        g = [{ n: 'picket', x: xx, y: 184, rep: rep }, { n: 'picket', x: xx, y: 238, rep: rep }];
        for (var k = 0; k < 4; k++) {
          g.push({ n: 'picket', x: xx, y: 196 + k * 12 });
          g.push({ n: 'picket', x: xx + fw - 16, y: 196 + k * 12 });
        }
        // beds in two rows inside the fence
        for (var row = 0; row < 2; row++) {
          for (var bx = xx + 20, bi = row + r[8]; bx + 32 <= xx + fw - 14; bx += 36, bi++) {
            g.push({ n: beds[bi % 3], x: bx, y: 200 + row * 18 });
          }
        }
        return g;
      }
      return [{ n: trees[r[1]], x: xx, y: 196 + r[10] }, { n: trees[r[2]], x: xx + 56, y: 230 + r[11] }, { n: 'bush', x: xx + 30, y: 172 }];
    };
    // a group that hits a building side or a spur slides along until it fits
    for (var sh = 0; sh < 4 && !put(make(x + sh * 30)); sh++);
  }
  // the lawn between the pavement and the path
  for (x = 20; x < w - 60; x += 40 + rnd(40)) {
    var q = rnd(100);
    if (q < 30) put([{ n: 'tree_c', x: x, y: 80 + rnd(44) }]);
    else if (q < 60) put([{ n: 'bush', x: x, y: 24 + rnd(96) }]);
    else if (q < 80) put([{ n: 'bloom1', x: x, y: 30 + rnd(90) }]);
    else put([{ n: 'bloom2', x: x, y: 30 + rnd(90) }]);
  }
  put([{ n: 'tree_a', x: 496, y: 204 }, { n: 'tree_c', x: 548, y: 220 }, { n: 'bush', x: 530, y: 188 }]);
  put([{ n: 'tree_b', x: 620, y: 218 }, { n: 'tree_c', x: 656, y: 200 }, { n: 'bush', x: 646, y: 186 }, { n: 'bush', x: 696, y: 190 }]);
  for (var row = 0; row < 5; row++) {
    for (x = 8 + row * 17; x < 1700; x += 62) {
      if (rnd(100) < 40) continue;
      put([{ n: trees[rnd(3)], x: x + rnd(24), y: 258 + row * 44 + rnd(8) }]);
    }
  }
  return list;
}

var DISTRICTS = [{
  id: 'downtown',
  name: 'Downtown',
  k: 1,
  ground: { sheet: 'tiles', base: 0, walk: 2, verge: 0, end: ['tree_a', 'tree_b', 'tree_c'] },
  lamps: [455, 1004, 1602, 1866],
  hydrants: [-2, 1640],
  deco: backyard(2000, [232, 232, 136, 136, 148, 136, 136, 148, 304]),
  sprites: COMMON.concat(['tree_a', 'tree_b', 'tree_c', 'pond', 'picket', 'bedp', 'bedr', 'bush', 'bloom1', 'bloom2',
    'fire', 'stand_shut', 'stand_umb_shut',
    'stand', 'stand_umb', 'bbq1', 'bbq2', 'bbq3', 'sign', 'ftable', 'ctable1', 'ctable2', 'chair', 'dessert',
    'msmall', 'mmed', 'mbig', 'crates', 'barrels', 'flowerbox', 'gtable', 'fruit', 'flowers',
    'icetruck', 'kiosk', 'menu', 'conesign', 'parasol', 'icecap', 'bed', 'rail', 'ic_g', 'mf5', 'rf3',
    'bk_g', 'mf1', 'mf4', 'rf1', 'hwtent', 'candy', 'rp3', 'rp9', 'rp12', 'dcart',
    'chouse', 'tent', 'ctable', 'hw', 'hwsign', 'hwtent2', 'air1', 'stock1', 'stock2', 'stock3', 'box', 'ramp',
    'gy_g', 'mf7', 'mf10', 'rf5', 'gymsign', 'weights', 'bench', 'shrub', 'cloth', 'jcart', 'neon',
    'c44', 'c45', 'c46', 'c440', 'cex', 'pool',
    'post', 'mboxr', 'mboxb', 'mtruck', 'pkgs', 'pkg', 'flagpole', 'dpad',
    'mall', 'light', 'mdoor', 'fnt1', 'fnt2', 'msign', 'msign2', 'helipad']),
  lots: [
    {
      id: 'stand', name: 'Hot dog stand', w: 232,
      cost: 0, build: 0,
      pay: 1, gain: 0.5, hold: 20,
      up: 15, grow: 1.55,
      fx: 'stand',
      rungs: [
        { add: 'a lit grill', say: 'Grill lit!' },
        { add: 'a bigger flame', say: 'Bigger flame!' },
        { add: 'a roaring flame', say: 'Roaring flame!' },
        { add: 'smoke from the grill', say: 'Smoke!' },
        { add: 'a parasol over the cart', say: 'Parasol!' },
        { add: 'a better red barbecue', say: 'Better barbecue!' },
        { add: 'a second grill', say: 'Second grill!' },
        { add: 'a menu board', say: 'Menu board!' },
        { add: 'a food table', say: 'Food table!' },
        { add: 'a table and chair for customers', say: 'Customers!' },
        { add: 'a second customer table', say: 'Second table!' },
        { add: 'a dessert cart', say: 'Dessert cart!' }
      ],
      parts: [
        { n: 'stand', at: 0, to: 4, x: 86, y: 0 },
        { n: 'stand_umb', at: 5, x: 86, y: 0 },
        { n: 'bbq1', at: 0, to: 5, x: 70, y: 0 },
        { n: 'bbq2', at: 6, x: 70, y: 0 },
        { n: 'bbq3', at: 7, x: 54, y: 0 },
        { n: 'sign', at: 8, x: 186, y: 0 },
        { n: 'ftable', at: 9, x: 204, y: 0 },
        { n: 'ctable1', at: 10, x: 98, y: -24 },
        { n: 'chair', at: 10, x: 114, y: -24 },
        { n: 'ctable2', at: 11, x: 170, y: -24 },
        { n: 'chair', at: 11, x: 154, y: -24 },
        { n: 'dessert', at: 12, x: 4, y: 0 }
      ]
    },
    {
      id: 'market', name: 'Market', w: 232,
      cost: 80, build: 20,
      pay: 6, gain: 0.4, hold: 20,
      up: 50, grow: 1.7,
      unlocks: ['trucks'],
      rungs: [
        { add: 'a crate by the window', say: 'Crate!' },
        { add: 'barrels of goods', say: 'Barrels!' },
        { add: 'a flower box', say: 'Flower box!' },
        { add: 'a table of boxes', say: 'Boxes!' },
        { add: 'a fruit and veg cart', say: 'Fruit cart!' },
        { add: 'a flower cart in place of the fruit', say: 'Flower cart!' },
        { add: 'more crates', say: 'More crates!' },
        { add: 'a taller market building', say: 'Taller market!' },
        { add: 'a second floor, a big market', say: 'Big market!' }
      ],
      parts: [
        { n: 'msmall', at: 0, to: 7, x: 52, y: 0 },
        { n: 'mmed', at: 8, to: 8, x: 36, y: 0 },
        { n: 'mbig', at: 9, x: 36, y: 0 },
        { n: 'crates', at: 1, x: 48, y: -20 },
        { n: 'barrels', at: 2, x: 114, y: -20 },
        { n: 'flowerbox', at: 3, x: 154, y: -22 },
        { n: 'gtable', at: 4, x: 178, y: -28 },
        { n: 'fruit', at: 5, to: 5, x: 0, y: -26 },
        { n: 'flowers', at: 6, x: 0, y: -26 },
        { n: 'crates', at: 7, x: 80, y: -20 },
        { n: 'air1', at: 3, to: 7, x: 62, y: 76 },
        { n: 'air1', at: 3, to: 7, x: 94, y: 76 },
        { n: 'air1', at: 8, to: 8, x: 46, y: 84 },
        { n: 'air1', at: 8, to: 8, x: 78, y: 84 },
        { n: 'air1', at: 9, x: 46, y: 104 },
        { n: 'air1', at: 9, x: 78, y: 104 },
        { n: 'rp12', at: 9, x: 54, y: 140 }
      ]
    },
    {
      id: 'ice', name: 'Ice cream', w: 136,
      cost: 700, build: 30,
      pay: 7, gain: 0.4, hold: 22,
      up: 420, grow: 1.8,
      rungs: [
        { add: 'a menu board', say: 'Menu board!' },
        { add: 'a giant cone kiosk in place of the truck', say: 'Kiosk!' },
        { add: 'a cone sign', say: 'Cone sign!' },
        { add: 'parasol tables', say: 'Parasols!' },
        { add: 'a proper ice cream shop', say: 'Ice cream shop!' },
        { add: 'a second storey', say: 'Second storey!' },
        { add: 'a giant cone on the roof', say: 'Giant cone!' },
        { add: 'flower beds and a queue rail', say: 'Flower beds!' }
      ],
      parts: stack(12, 'ic_g', ['mf5'], 'rf3', [6], 5).concat([
        { n: 'icetruck', at: 0, to: 1, x: 12, y: 0 },
        { n: 'kiosk', at: 2, to: 4, x: 12, y: 0 },
        { n: 'menu', at: 1, x: 4, y: -8 },
        { n: 'conesign', at: 3, x: 120, y: -4 },
        { n: 'parasol', at: 4, x: 18, y: -16 },
        { n: 'parasol', at: 4, x: 72, y: -16 },
        { n: 'icecap', at: 7, x: 12, y: 126 },
        { n: 'rail', at: 8, x: 44, y: -26 },
        { n: 'bed', at: 8, x: 8, y: -26 },
        { n: 'bed', at: 8, x: 84, y: -26 }
      ])
    },
    {
      id: 'bakery', name: 'Bakery', w: 136,
      cost: 3500, build: 40,
      pay: 23, gain: 0.4, hold: 24,
      up: 2100, grow: 1.8,
      rungs: [
        { add: 'a striped awning', say: 'Awning!' },
        { add: 'a sweets cart', say: 'Sweets cart!' },
        { add: 'a second storey', say: 'Second storey!' },
        { add: 'a third storey', say: 'Third storey!' },
        { add: 'a chimney and roof vents', say: 'Chimney!' },
        { add: 'a rooftop garden', say: 'Roof garden!' },
        { add: 'a billboard', say: 'Billboard!' },
        { add: 'a delivery cart', say: 'Delivery cart!' }
      ],
      parts: stack(12, 'bk_g', ['mf1', 'mf4'], 'rf1', [3, 4], 0).concat([
        { n: 'hwtent', at: 1, x: 4, y: 8 },
        { n: 'candy', at: 2, x: 2, y: -8 },
        { n: 'rp9', at: 5, x: 64, y: 202 },
        { n: 'rp3', at: 5, x: 30, y: 200 },
        { n: 'bed', at: 6, x: 20, y: 194 },
        { n: 'bed', at: 6, x: 68, y: 194 },
        { n: 'rp12', at: 7, x: 28, y: 218 },
        { n: 'dcart', at: 8, x: 48, y: -8 }
      ])
    },
    {
      id: 'hardware', name: 'Hardware store', w: 148,
      cost: 17500, build: 50,
      pay: 78, gain: 0.4, hold: 24,
      up: 10500, grow: 1.8,
      rungs: [
        { add: 'a table of boxes by the tent', say: 'Boxes out!' },
        { add: 'a proper hardware store', say: 'Hardware store!' },
        { add: 'a roof sign', say: 'Roof sign!' },
        { add: 'window awnings', say: 'Awnings!' },
        { add: 'air units on the roof', say: 'Air units!' },
        { add: 'stacked stock outside', say: 'Stacked stock!' },
        { add: 'a second row of stock', say: 'More stock!' },
        { add: 'a loading ramp', say: 'Loading ramp!' }
      ],
      parts: [
        { n: 'chouse', at: 0, to: 1, x: 34, y: 0 },
        { n: 'tent', at: 0, to: 1, x: 34, y: 46 },
        { n: 'ctable', at: 1, to: 1, x: 100, y: -6 },
        { n: 'hw', at: 2, x: 10, y: 0 },
        { n: 'hwsign', at: 3, x: 10, y: 40 },
        { n: 'hwtent2', at: 4, x: 10, y: 12 },
        { n: 'air1', at: 5, x: 14, y: 104 },
        { n: 'air1', at: 5, x: 46, y: 104 },
        { n: 'stock1', at: 6, x: 0, y: -6 },
        { n: 'stock2', at: 6, x: 116, y: -6 },
        { n: 'stock3', at: 7, x: 24, y: -14 },
        { n: 'box', at: 7, x: 92, y: -14 },
        { n: 'ramp', at: 8, x: 50, y: -12 }
      ]
    },
    {
      id: 'gym', name: 'Gym', w: 136,
      cost: 88000, build: 60,
      pay: 260, gain: 0.4, hold: 20,
      up: 53000, grow: 1.8,
      rungs: [
        { add: 'a sign over the door', say: 'Gym sign!' },
        { add: 'a rack of weights outside', say: 'Weights!' },
        { add: 'a second storey', say: 'Second storey!' },
        { add: 'a third storey', say: 'Third storey!' },
        { add: 'a roof terrace', say: 'Roof terrace!' },
        { add: 'an awning cloth', say: 'Awning cloth!' },
        { add: 'a juice bar outside', say: 'Juice bar!' },
        { add: 'a neon sign', say: 'Neon sign!' }
      ],
      parts: stack(12, 'gy_g', ['mf7', 'mf10'], 'rf5', [3, 4], 0).concat([
        { n: 'gymsign', at: 1, x: 86, y: 14 },
        { n: 'weights', at: 2, x: 0, y: -6 },
        { n: 'bench', at: 5, x: 20, y: 204 },
        { n: 'shrub', at: 5, x: 64, y: 200 },
        { n: 'cloth', at: 6, x: 44, y: 76 },
        { n: 'jcart', at: 7, x: 4, y: -14 },
        { n: 'neon', at: 8, x: 6, y: 18 }
      ])
    },
    {
      id: 'flats', name: 'Flats', w: 136,
      cost: 440000, build: 70,
      pay: 860, gain: 0.4, hold: 0,
      up: 264000, grow: 1.8,
      rungs: [
        { add: 'a taller block', say: 'Taller block!' },
        { add: 'a fire escape tower', say: 'Fire escapes!' },
        { add: 'a round corner tower', say: 'Corner tower!' },
        { add: 'a four storey block', say: 'Four storeys!' },
        { add: 'planters by the door', say: 'Planters!' },
        { add: 'a rooftop pool', say: 'Rooftop pool!' }
      ],
      parts: [
        { n: 'c44', at: 0, to: 0, x: 20, y: 0 },
        { n: 'c45', at: 1, to: 1, x: 20, y: 0 },
        { n: 'cex', at: 2, to: 2, x: 27, y: 0 },
        { n: 'c440', at: 3, to: 3, x: 20, y: 0 },
        { n: 'c46', at: 4, x: 12, y: 0 },
        { n: 'shrub', at: 5, x: 12, y: -8 },
        { n: 'shrub', at: 5, x: 88, y: -8 },
        { n: 'pool', at: 6, x: 40, y: 224 }
      ]
    },
    {
      id: 'post', name: 'Post office', w: 148,
      cost: 2200000, build: 80,
      pay: 3100, gain: 0.4, hold: 8,
      up: 1320000, grow: 1.8,
      unlocks: ['drones', 'heli'],
      pad: { n: 'dpad', x: 22, y: 108 },
      rungs: [
        { add: 'a row of mailboxes', say: 'Mailboxes!' },
        { add: 'a mail truck', say: 'Mail truck!' },
        { add: 'stacked parcels', say: 'Parcels!' },
        { add: 'a flagpole out front', say: 'Flag!' },
        { add: 'a drone landing pad', say: 'Landing pad!' },
        { add: 'an air unit on the roof', say: 'Air unit!' }
      ],
      parts: [
        { n: 'post', at: 0, x: 10, y: 0 },
        { n: 'mboxr', at: 1, x: 12, y: -2 },
        { n: 'mboxb', at: 1, x: 28, y: -2 },
        { n: 'mboxr', at: 1, x: 44, y: -2 },
        { n: 'mtruck', at: 2, x: 84, y: -8 },
        { n: 'pkgs', at: 3, x: 56, y: -8 },
        { n: 'pkg', at: 3, x: 64, y: -2 },
        { n: 'flagpole', at: 4, x: 0, y: -6 },
        { n: 'dpad', at: 5, x: 22, y: 108 },
        { n: 'air1', at: 6, x: 92, y: 112 }
      ]
    },
    {
      id: 'mall', name: 'Mall', w: 304,
      cost: 11000000, build: 120,
      pay: 9600, gain: 0.4, hold: 8,
      up: 6600000, grow: 1.8,
      capstone: true,
      rungs: [
        { add: 'glass doors', say: 'Glass doors!' },
        { add: 'a fountain', say: 'Fountain!' },
        { add: 'flags at the corners', say: 'Flags!' },
        { add: 'a second fountain', say: 'Second fountain!' },
        { add: 'a big sign', say: 'Big sign!' },
        { add: 'a helipad on the roof', say: 'Helipad!' }
      ],
      parts: [
        { n: 'mall', at: 0, x: 8, y: 0 },
        { n: 'stock1', at: 0, to: 0, x: 8, y: -8 },
        { n: 'stock3', at: 0, to: 0, x: 40, y: -8 },
        { n: 'light', at: 0, to: 0, x: 236, y: -8 },
        { n: 'mdoor', at: 1, x: 146, y: 0 },
        { n: 'fnt1', at: 2, x: 100, y: -4 },
        { n: 'flagpole', at: 3, x: 0, y: -6 },
        { n: 'flagpole', at: 3, x: 286, y: -6 },
        { n: 'fnt2', at: 4, x: 220, y: -4 },
        { n: 'msign', at: 5, x: 122, y: 50 },
        { n: 'msign2', at: 5, x: 186, y: 50 },
        { n: 'helipad', at: 6, x: 92, y: 80 }
      ]
    }
  ]
}];
