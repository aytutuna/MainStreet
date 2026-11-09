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
  'lamp', 'hydrant', 'bird', 'crow', 'walk1', 'walk2', 'walk3', 'walk4', 'walk5', 'bus_l', 'bus_r',
  'car_l1', 'car_l2', 'car_l3', 'car_l4', 'car_l5', 'car_l6', 'car_l7', 'car_l8',
  'car_r1', 'car_r2', 'car_r3', 'car_r4', 'car_r5', 'car_r6', 'car_r7', 'car_r8',
  'truck', 'truck2', 'truck3', 'truck5', 'parcel1', 'parcel2', 'parcel3', 'drone', 'dparcel', 'heli1', 'heli2'];

// the ground behind the street: a path along the back with spurs to the pavement, and in between
// ponds, benches and flower beds, fenced gardens and tree clusters, then thin trees further back
function backyard(w) {
  var seed = 7;
  var list = [];
  var rnd = function (n) {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff;
    return (seed >> 8) % n;
  };
  var trees = ['tree_a', 'tree_b', 'tree_c'];
  var beds = ['bedp', 'bedr', 'bedw'];
  list.push({ t: 3, x: 0, y: 136, w: w, h: 16 });
  for (var sx = 216; sx < w; sx += 248) list.push({ t: 3, x: sx, y: 0, w: 16, h: 136 });
  for (var x = 24; x < w; x += 140 + rnd(40)) {
    var kind = rnd(100);
    if (kind < 22) {
      var py = 190 + rnd(24);
      list.push({ n: 'pond', x: x, y: py });
      list.push({ n: 'bush', x: x - 20, y: py + 4 });
      list.push({ n: 'bush', x: x + 54, y: py + 10 });
      list.push({ n: trees[rnd(3)], x: x + 16, y: py + 60 });
    } else if (kind < 46) {
      list.push({ n: 'bench', x: x, y: 138 });
      list.push({ n: beds[rnd(3)], x: x + 4, y: 152 });
      list.push({ n: beds[rnd(3)], x: x + 40, y: 152 });
      list.push({ n: 'planter', x: x + 80, y: 156 });
    } else if (kind < 70) {
      list.push({ n: 'picket', x: x, y: 184, rep: 7 });
      list.push({ n: 'picket', x: x, y: 238, rep: 7 });
      for (var k = 0; k < 4; k++) {
        list.push({ n: 'picket', x: x, y: 196 + k * 12 });
        list.push({ n: 'picket', x: x + 96, y: 196 + k * 12 });
      }
      list.push({ n: 'bloom1', x: x + 20, y: 204 });
      list.push({ n: 'bloom2', x: x + 52, y: 214 });
      list.push({ n: 'bush', x: x + 70, y: 200 });
    } else {
      list.push({ n: trees[rnd(3)], x: x, y: 196 + rnd(20) });
      list.push({ n: trees[rnd(3)], x: x + 44, y: 226 + rnd(20) });
      list.push({ n: 'bush', x: x + 20, y: 172 });
    }
  }
  for (var row = 0; row < 5; row++) {
    for (x = -20 + row * 17; x < w; x += 62) {
      if (rnd(100) < 40) continue;
      list.push({ n: trees[rnd(3)], x: x + rnd(24), y: 290 + row * 60 + rnd(20) });
    }
  }
  return list;
}

var DISTRICTS = [{
  id: 'downtown',
  name: 'Downtown',
  k: 1,
  ground: { sheet: 'tiles', base: 0, walk: 2, verge: 0, end: ['tree_a', 'tree_b', 'tree_c'] },
  deco: backyard(2000),
  sprites: COMMON.concat(['tree_a', 'tree_b', 'tree_c', 'pond', 'picket', 'bedp', 'bedr', 'bedw', 'bush', 'bloom1', 'bloom2', 'planter',
    'fire', 'stand_shut', 'stand_umb_shut',
    'stand', 'stand_umb', 'bbq1', 'bbq2', 'bbq3', 'sign', 'ftable', 'ctable1', 'ctable2', 'chair', 'dessert',
    'msmall', 'mmed', 'mbig', 'crates', 'barrels', 'flowerbox', 'gtable', 'fruit', 'flowers', 'stack',
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
        { add: 'a produce table', say: 'Produce table!' },
        { add: 'a fruit and veg cart', say: 'Fruit cart!' },
        { add: 'a flower cart', say: 'Flower cart!' },
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
        { n: 'gtable', at: 4, x: 184, y: -28 },
        { n: 'fruit', at: 5, to: 5, x: 0, y: -26 },
        { n: 'flowers', at: 6, x: 0, y: -26 },
        { n: 'stack', at: 7, x: 152, y: -6 },
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
        { add: 'a kiosk in place of the truck', say: 'Kiosk!' },
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
        { n: 'menu', at: 1, x: 0, y: -4 },
        { n: 'conesign', at: 3, x: 120, y: -4 },
        { n: 'parasol', at: 4, x: 18, y: -16 },
        { n: 'parasol', at: 4, x: 72, y: -16 },
        { n: 'icecap', at: 7, x: 12, y: 126 },
        { n: 'rail', at: 8, x: 44, y: -30 },
        { n: 'bed', at: 8, x: 0, y: -30 },
        { n: 'bed', at: 8, x: 88, y: -30 }
      ])
    },
    {
      id: 'bakery', name: 'Bakery', w: 136,
      cost: 3500, build: 40,
      pay: 23, gain: 0.4, hold: 24,
      up: 2100, grow: 1.8,
      rungs: [
        { add: 'a striped awning', say: 'Awning!' },
        { add: 'a bread basket display', say: 'Bread basket!' },
        { add: 'a second storey', say: 'Second storey!' },
        { add: 'a third storey', say: 'Third storey!' },
        { add: 'a chimney and roof vents', say: 'Chimney!' },
        { add: 'a rooftop garden', say: 'Roof garden!' },
        { add: 'a billboard', say: 'Billboard!' },
        { add: 'a delivery bike by the door', say: 'Delivery bike!' }
      ],
      parts: stack(12, 'bk_g', ['mf1', 'mf4'], 'rf1', [3, 4], 0).concat([
        { n: 'hwtent', at: 1, x: 4, y: 22 },
        { n: 'candy', at: 2, x: 2, y: -8 },
        { n: 'rp9', at: 5, x: 64, y: 202 },
        { n: 'rp3', at: 5, x: 30, y: 200 },
        { n: 'bed', at: 6, x: 20, y: 194 },
        { n: 'bed', at: 6, x: 68, y: 194 },
        { n: 'rp12', at: 7, x: 28, y: 218 },
        { n: 'dcart', at: 8, x: 86, y: -8 }
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
        { n: 'ramp', at: 8, x: 50, y: -10 }
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
        { add: 'a banner on the wall', say: 'Banner!' },
        { add: 'a juice bar outside', say: 'Juice bar!' },
        { add: 'a neon sign', say: 'Neon sign!' }
      ],
      parts: stack(12, 'gy_g', ['mf7', 'mf10'], 'rf5', [3, 4], 0).concat([
        { n: 'gymsign', at: 1, x: 86, y: 30 },
        { n: 'weights', at: 2, x: 0, y: -6 },
        { n: 'bench', at: 5, x: 20, y: 204 },
        { n: 'shrub', at: 5, x: 64, y: 200 },
        { n: 'cloth', at: 6, x: 44, y: 76 },
        { n: 'jcart', at: 7, x: 38, y: -14 },
        { n: 'neon', at: 8, x: 36, y: 16 }
      ])
    },
    {
      id: 'flats', name: 'Flats', w: 136,
      cost: 440000, build: 70,
      pay: 860, gain: 0.4, hold: 0,
      up: 264000, grow: 1.8,
      rungs: [
        { add: 'a taller block', say: 'Taller block!' },
        { add: 'a third block', say: 'Third block!' },
        { add: 'a four storey block', say: 'Four storeys!' },
        { add: 'the tower with a penthouse', say: 'Penthouse!' },
        { add: 'balcony plants', say: 'Balcony plants!' },
        { add: 'a rooftop pool', say: 'Rooftop pool!' }
      ],
      parts: [
        { n: 'c44', at: 0, to: 0, x: 20, y: 0 },
        { n: 'c45', at: 1, to: 1, x: 20, y: 0 },
        { n: 'c46', at: 2, to: 2, x: 12, y: 0 },
        { n: 'c440', at: 3, to: 3, x: 20, y: 0 },
        { n: 'cex', at: 4, x: 20, y: 0 },
        { n: 'shrub', at: 5, x: 0, y: -8 },
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
      rungs: [
        { add: 'a row of mailboxes', say: 'Mailboxes!' },
        { add: 'a mail truck', say: 'Mail truck!' },
        { add: 'stacked parcels', say: 'Parcels!' },
        { add: 'a flagpole by the door', say: 'Flag!' },
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
        { add: 'flags over the entrance', say: 'Flags!' },
        { add: 'a second fountain', say: 'Second fountain!' },
        { add: 'a bigger sign', say: 'Bigger sign!' },
        { add: 'a helipad nearby', say: 'Helipad!' }
      ],
      parts: [
        { n: 'mall', at: 0, x: 8, y: 0 },
        { n: 'stock1', at: 0, to: 0, x: 8, y: -8 },
        { n: 'stock3', at: 0, to: 0, x: 40, y: -8 },
        { n: 'light', at: 0, to: 0, x: 236, y: -8 },
        { n: 'mdoor', at: 1, x: 146, y: 0 },
        { n: 'fnt1', at: 2, x: 52, y: -14 },
        { n: 'flagpole', at: 3, x: 0, y: -6 },
        { n: 'flagpole', at: 3, x: 286, y: -6 },
        { n: 'fnt2', at: 4, x: 220, y: -14 },
        { n: 'msign', at: 5, x: 122, y: 50 },
        { n: 'msign2', at: 5, x: 186, y: 50 },
        { n: 'helipad', at: 6, x: 92, y: 96 }
      ]
    }
  ]
}];
