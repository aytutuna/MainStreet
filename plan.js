// The Open Supercenter as data: the building, its entrances and stock doors, the front, the stockroom, the outside, and
// one area for each department. All positions are world coordinates (x east, z south, the camera looks north).
// An area opens with its first upgrade; upgrade k adds ups[k - 1], a list of entries:
//   [kind or model, x, z, face, goods, extras, copies, flag]   a stocked fixture (faces: 's' 'n' 'b' 'k' or radians)
//   { m: model ref, x, z, r, k, y, flat }                      a model turned r, scaled k, raised y; flat: no footprint
//   { box: [x0, x1, z0, z1, y0, y1], c: colour }               a coloured box
//   { text, x, z, r, y, w, h, post }                           a board with words, on a post when post is set
//   { patch: [[x, z]...], finish }                             a floor patch: a colour, 'wood', 'carpet', 'polish' or 'vinyl'
//   { m, x, z, r, pw: { n, stock, spots, on } }                a Pipework model (see pw() below)
//   { sign: 1 | 'gold' }  { staff: [x, z, face] }  { helper: 1 }  { lights: [[x, z]...] }

// the Pipework kit is drawn at this size against the shop kit's people (store.js SCALE)
export var PW = 0.5;

function tints(ref, from, to) {
  return to.map(function (c) { return ref + '@' + from + '>' + c; });
}
var BOX = tints('shop/shelf-boxes.box', '15,2', ['15,2', '3,1', '4,1', '12,2', '8,1', '0,1']);
var CARTON = tints('shop/shelf-boxes.carton', '7,1', ['7,1', '2,1', '12,2', '14,2', '10,1']);
var BAG = tints('shop/shelf-bags.bag', '15,2', ['15,2', '3,1', '4,1', '12,2', '10,1', '0,1']);
var BOTTLE = tints('shop/shelf-end.bottle', '7,1', ['7,1', '2,1', '12,2', '8,1', '14,2']);
var CAN = tints('food/can', '15,2', ['15,2', '1,1', '9,2', '11,2', '5,1']);
var MILK = tints('food/carton', '5,1', ['5,1', '1,1', '15,2', '9,2', '11,2']);
var SMALL = tints('food/carton-small', '1,3', ['1,3', '11,2', '15,2', '1,1']);
var SODA = tints('food/soda-bottle', '15,2', ['15,2', '9,2', '1,1', '11,2']);
var TIN = tints('shop/display-cans.can', '3,1', ['3,1', '4,1', '12,2', '14,2']);
var TEE = tints('shop/clothing-table.clothing', '13,2', ['13,2', '3,1', '4,1', '14,2', '8,1', '2,3', '6,1']);
var RACK = ['shop/clothing-rack', 'shop/clothing-rack@7,1>14,2;13,2>8,1;3,1>2,3', 'shop/clothing-rack@7,1>3,1;13,2>2,2;3,1>4,1',
  'shop/clothing-rack@7,1>10,1;13,2>12,1;3,1>6,1'];
var PIZZA = tints('shop/shelf-boxes.box', '15,2', ['3,1', '0,1']).map(function (r) { return r + '~x'; });
var COOK = ['food/pot*0.7', 'food/pan*0.7', 'food/frying-pan*0.6', 'food/plate*0.55', 'food/bowl*0.6', 'food/mug', 'food/cup', 'food/glass',
  'food/cutting-board*0.6', 'food/knife-block*0.7', 'food/pot-stew*0.7', 'food/plate-deep*0.55'];

function up(name) {
  return { name: name, piece: Array.prototype.slice.call(arguments, 1) };
}
function m(ref, x, z, r, k, y) {
  return { m: ref, x: x, z: z, r: r || 0, k: k || 1, y: y || 0 };
}
var FACES = { s: 0, b: Math.PI / 2, n: Math.PI, k: -Math.PI / 2 };
// a Pipework model standing at x, z, its front turned to a face letter or radians, with options (store.js pwFixture):
//   n copies side by side, stock a stocked version whose goods go with the stock (1 for _Stocked, or the file's suffix),
//   spots 0 for no shoppers looking at it, on goods of other kits in the model's frame (x, z in world units from its centre)
function pw(name, x, z, face, o) {
  o = o || {};
  var e = { m: 'pw/' + name, x: x, z: z, r: typeof face === 'string' ? FACES[face] : face || 0, pw: o };
  if (o.stock) e.g = 'pw/' + name + '.goods' + (o.stock === 1 ? '' : '-' + o.stock);
  if (o.y) e.y = o.y;
  return e;
}
// a produce table with a tray in each of its six wells, the front row and then the back, left to right
function tbl(name, x, z, face, trays) {
  var on = trays.map(function (t, i) {
    var back = i > 2;
    return ['pw/ProduceTray_' + t + '_01', (i % 3 - 1) * 0.5 * PW, back ? -0.2 * PW : 0.2 * PW, 0, (back ? 0.88 : 0.81) * PW];
  });
  return up(name, pw('ProduceTable_15', x, z, face, { on: on }));
}
function tx(text, x, z, w, y) {
  return { text: text, x: x, z: z, r: 0, y: y || 1.15, w: w || 1.1, h: (w || 1.1) * 0.4, post: true };
}
function sf(a, b, c, d) {
  return [[a, b], [c, d]];
}
// a two-faced shelf unit
function unit(name, x, z, faces) {
  return up(name, ['shelf', x, z, 's', faces]);
}
function cap(name, x, z, face, goods) {
  return up(name, ['end', x, z, face, goods]);
}
function pal(name, x, z, r, goods, kind) {
  return up(name, [kind || 'pallet', x, z, r, goods]);
}
// a rounded rectangle for floor patches
function rbox(x0, x1, z0, z1, r) {
  var out = [];
  [[x0 + r, z0 + r, 270], [x1 - r, z0 + r, 0], [x1 - r, z1 - r, 90], [x0 + r, z1 - r, 180]].forEach(function (c) {
    for (var k = 0; k <= 6; k++) {
      var a = (c[2] + k * 15) * Math.PI / 180;
      out.push([c[0] + r * Math.sin(a), c[1] - r * Math.cos(a)]);
    }
  });
  return out;
}
// the 24 ordinary upgrades with the larger pieces at every fifth: sign, clerk, feature display, floor lights, second
// clerk, showcase
function ups(list, big) {
  var out = list.slice();
  big.forEach(function (b, i) { out.splice(i * 5 + 4, 0, b); });
  return out;
}
var SIGN = up('Hanging sign', { sign: 1 });
var HELP = up('Second clerk', { helper: 1 });
function clerk(x, z, face) {
  return up('Clerk', { staff: [x, z, face] });
}
function lights(list) {
  return up('Floor lights', { lights: list });
}
function d(name, ref, x, z, r, k, y) {
  return up(name, m(ref, x, z, r, k, y));
}
function board(name, text, x, z, w) {
  return up(name, tx(text, x, z, w));
}
// two runs of shelves in an east block: the order a shopper meets them, from the loop aisle in
function runs(a, b, caps, more) {
  return [caps[0]].concat(a.slice(0, 3), a.slice(3), [caps[1], more[0], more[1]], b.slice(0, 3), b.slice(3), [caps[2], caps[3]], more.slice(2));
}
function row(x0, z, list) {
  return list.map(function (u, i) { return unit(u[0], x0 + i * 0.8, z, u[1]); });
}

var AREAS = {};

// the grocery half, east
AREAS.produce = {
  cx: 12.2, cz: -5.9, vacant: [9.7, 14.7, -10.4, -1.4], sign: [12.45, -5.2, 1.6],
  floor: [{ poly: rbox(9.7, 14.7, -10.4, -0.2, 0.9), finish: 'vinyl' }],
  ups: ups([
    up('Apple table', pw('ProduceTable_15', 10.7, -2.7, 'b', { stock: 'Apples' })),
    up('Fruit bin', pw('DumpBin_Wire_01', 13.9, -2.7, 'k', { stock: 1 })),
    tbl('Banana stand', 10.7, -3.7, 'b', ['Bananas', 'Bananas', 'Bananas', 'Bananas', 'Bananas', 'Bananas']),
    tbl('Tomato table', 13.9, -3.7, 'k', ['Tomatoes', 'Tomatoes', 'Peppers', 'Tomatoes', 'Peppers', 'Tomatoes']),
    tbl('Lemon table', 10.7, -4.7, 'b', ['Lemons', 'Oranges', 'Lemons', 'Oranges', 'Lemons', 'Oranges']),
    tbl('Pepper table', 13.9, -4.7, 'k', ['Peppers', 'Peppers', 'Peppers', 'Tomatoes', 'Peppers', 'Peppers']),
    up('Pumpkin barrel', pw('ProduceBin_Round_01', 14.4, -0.9, 'k', { on: [['food/pumpkin', -0.05, 0.03, 0, 0.13], ['food/pumpkin', 0.07, -0.04, 1, 0.13], ['food/pumpkin', 0, 0.02, 2, 0.28]] })),
    tbl('Avocado table', 10.7, -5.7, 'b', ['Avocados', 'Avocados', 'Bananas', 'Avocados', 'Avocados', 'Avocados']),
    talk('Price chalkboard', 'APPLES 99c', 12.3, -3.9),
    up('Watermelon bin', pw('ProduceBin_Round_01', 13.9, -5.7, 'k', { on: [['food/watermelon', -0.07, 0.04, 0, 0.17], ['food/watermelon', 0.07, 0.03, 1, 0.17], ['food/watermelon', 0, -0.07, 2, 0.17]] })),
    tbl('Carrot table', 13.9, -6.7, 'k', ['Carrots', 'Carrots', 'Potatoes', 'Carrots', 'Onions', 'Carrots']),
    up('Tiered stand', pw('ProduceStand_Tiered_10', 10.7, -6.7, 'b', { stock: 1 })),
    up('Orange barrel', pw('ProduceBin_Round_01', 13.9, -7.7, 'k', { on: [['food/orange', -0.08, 0.04, 0, 0.3], ['food/orange', 0.06, 0.06, 1, 0.3], ['food/orange', 0.02, -0.07, 2, 0.3], ['food/orange', -0.05, -0.05, 3, 0.3]] })),
    up('Wire bin', pw('DumpBin_Wire_01', 10.7, -7.7, 'b', { stock: 1 })),
    up('Flower stand', pw('FlowerStand_01', 13.9, -8.7, 'k')),
    tbl('Lettuce table', 10.7, -8.7, 'b', ['Lettuce', 'Lettuce', 'Lettuce', 'Onions', 'Lettuce', 'Lettuce']),
    up('Melon barrel', pw('ProduceBin_Round_01', 14.4, -0.1, 'k', { stock: 'Melons' })),
    tbl('Orange table', 10.7, -9.7, 'b', ['Oranges', 'Oranges', 'Oranges', 'Lemons', 'Oranges', 'Oranges']),
    up('Berry bin', pw('DumpBin_Wire_01', 13.9, -9.7, 'k', { stock: 1 })),
    talk('Local farm sign', 'LOCAL FARM', 12.3, -8.1),
    up('Basket stack', pw('Basket_Stack_01', 13.05, -9.8, 's', { spots: 0 })),
    mat('Floor mat', 11.7, 12.9, -6.6, -5.4, 0xe3e8c4),
    up('Bench', pw('DiningBench_01', 10.15, -1.7, 'b', { spots: 0 })),
    up('Tall planter', pw('Planter_Tall_01', 14.45, -1.65, 0, { spots: 0 }))
  ], [SIGN, counter('Produce desk', 12.5, -9.8, 's', 12.5, -10.25),
    up('Fruit island', pw('ProduceTable_15', 12.3, -6.0, 'b', { stock: 'Apples' })),
    lights([[12.2, -4.0], [12.2, -7.4]]), HELP,
    up('Showcase', { sign: 'gold' }, pw('ProduceTable_15', 13.1, -0.55, 's', { stock: 'Apples' }))])
};

// a tiered promo table with goods of another kit on its three tiers: front row, middle row, back, left to right
var TIER = [[-0.2, 0.12, 0.2], [0, 0.12, 0.2], [0.2, 0.12, 0.2], [-0.1, 0, 0.29], [0.1, 0, 0.29], [0, -0.13, 0.38]];
function tt(name, x, z, face, goods) {
  var on = goods.map(function (g, i) {
    var t = TIER[i % 6];
    return [g, t[0], t[1], i * 0.7, t[2]];
  });
  return up(name, pw('Table_Promo_Tiered_01', x, z, face, { on: on }));
}
// something standing on top of a fixture that is already there
function top(name, ref, x, z, y, k) {
  return up(name, { m: ref, x: x, z: z, r: 0, k: k || 1, y: y, flat: 1 });
}
// bakery: tables and cases along the east wall facing the lane, bread racks opposite, a counter with ovens behind
AREAS.bakery = {
  cx: 12.2, cz: -12.3, vacant: [9.7, 14.7, -14.4, -10.4], sign: [11.7, -10.9, 1.9],
  floor: [{ poly: rbox(9.7, 14.7, -14.3, -10.4, 0.9), finish: 0xf0d9aa }],
  ups: ups([
    tt('Donut table', 13.1, -11.0, 'k', ['food/donut-sprinkles*1.5', 'food/donut-chocolate*1.5', 'food/donut-sprinkles*1.5', 'food/muffin*1.5', 'food/donut-chocolate*1.5', 'food/muffin*1.5']),
    tt('Baguette table', 13.1, -11.6, 'k', ['pw/Bread_Round_01*1.8', 'pw/Bread_Loaf_Bag_01*1.8', 'pw/Bread_Round_01*1.8', 'pw/Bread_Loaf_Bag_01*1.8', 'pw/Bread_Round_01*1.8', 'pw/Bread_Loaf_Bag_01*1.8']),
    up('Bread rack', pw('BakeryRack_15', 10.9, -10.98, 'b', { stock: 1 })),
    up('Roll rack', pw('BakeryRack_15', 10.9, -11.73, 'b', { stock: 1 })),
    up('Muffin case', pw('BakeryCase_SelfServe_10', 13.1, -12.2, 'k', { stock: 1 })),
    tt('Pie table', 13.1, -12.8, 'k', ['food/pie*0.55', 'food/pie*0.55', 'food/croissant', 'food/croissant', 'food/pie*0.55', 'food/croissant']),
    up('Bagel case', pw('BakeryCase_SelfServe_10', 10.9, -13.1, 'b', { stock: 1 })),
    up('Loaf rack', pw('BakeryRack_15', 10.9, -12.48, 'b', { stock: 1 })),
    up('Cake case', pw('DisplayCase_Bakery_10', 14.51, -10.85, 'k', { spots: 0 })),
    up('Bread oven', pw('Oven_Convection_10', 14.51, -12.45, 'k', { spots: 0 })),
    up('Pastry fridge', pw('Freezer_Upright_01', 14.53, -12.025, 'k', { spots: 0 })),
    up('Sample cart', pw('SampleCart_01', 14.55, -13.2, 'k', { spots: 0 })),
    top('Cake boxes', 'pw/Cake_Box_01', 13.1, -11.0, 0.38, 1.6),
    up('Bread boxes', pw('BreadBox_01', 10.3, -11.35, 'b', { n: 2, spots: 0 })),
    top('Bread box', 'pw/BreadBox_01', 10.9, -11.73, 0.9, 1.4),
    top('Loaf bags', 'pw/Bread_Loaf_Bag_01', 10.9, -12.48, 0.9, 2),
    up('Bakery plant', pw('Planter_Tall_01', 10.3, -12.6, 0, { spots: 0 })),
    top('Donut tray', 'pw/Donut_Tray_01', 13.1, -12.8, 0.3, 1.4),
    top('Baguette basket', 'pw/Baguette_Basket_01', 13.1, -11.6, 0.3, 1.4),
    talk('Menu board', 'COFFEE 2.00', 13.8, -10.55),
    up('Baking rug', { patch: rbox(11.5, 12.5, -13.8, -11.0, 0.3), finish: 0xd8b585 }),
    talk('Fresh baked board', 'FRESH BAKED', 12.3, -10.55),
    up('Coffee station', pw('CoffeeStation_15', 14.53, -11.475, 'k', { spots: 0 })),
    mat('Door mat', 11.8, 12.8, -10.8, -10.45, 0xe8c99a)
  ], [SIGN, counter('Bakery desk', 10.9, -13.8, 'b', 10.4, -13.8),
    up('Cake display', pw('BakeryCase_SelfServe_10', 12.2, -14.1, 's', { stock: 1 })),
    lights([[11.8, -11.6], [11.8, -13.2]]), HELP,
    up('Showcase', { sign: 'gold' }, { m: 'food/cake-birthday*1.3', x: 14.51, z: -10.85, r: 0, k: 1, y: 0.7, flat: 1 })])
};

// shelf faces taken from a pool of goods: unit i shows four neighbours of it
function nm(names, pool, off) {
  return names.map(function (n, i) {
    var o = (off || 0) + i * 3;
    return [n, sf(pool[o % pool.length], pool[(o + 1) % pool.length], pool[(o + 2) % pool.length], pool[(o + 4) % pool.length])];
  });
}
function f(name, kind, x, z, face, goods, extra, n, flag) {
  return up(name, [kind, x, z, face, goods, extra || null, n || 1, flag]);
}
function eastCaps(z, names, goods) {
  return [cap(names[0], 6.65, z[0], 'b', goods[0]), cap(names[1], 1.45, z[0], 'k', goods[1]), cap(names[2], 6.65, z[1], 'b', goods[2]), cap(names[3], 1.45, z[1], 'k', goods[3])];
}

// a run of Pipework pieces side by side, from x going west (or east when dir is 1): [name, model, width, options]
function pwrun(list, x, z, face, dir) {
  dir = dir || -1;
  return list.map(function (it) {
    var cx = x + dir * it[2] / 2;
    x += dir * it[2];
    return up(it[0], pw(it[1], cx, z, face, it[3]));
  });
}
// a small deal board on a low post
function talk(name, text, x, z) {
  return up(name, tx(text, x, z, 0.75, 0.8));
}
function gond(name, model, on) {
  return [name, model, 0.5, { stock: 1, spots: 2, on: on }];
}
// goods of other kits standing along the top of a gondola, [ref, x, y] (x from the middle, y from the floor)
function tops(list) {
  return list.map(function (g) { return ['pw/' + g[0], g[1], 0, 0, g[2]]; });
}

AREAS.pantry = {
  cx: 4.05, cz: -6.6, vacant: [1.25, 6.9, -8.9, -4.7], sign: [4.0, -6.6, 1.9],
  floor: [{ poly: rbox(1.25, 6.9, -8.9, -4.7, 0.5), finish: 0xe8d9b4 }],
  ups: ups(runs(
    pwrun([gond('Cereal gondola', 'Gondola_Island_10'), gond('Pasta gondola', 'Gondola_Island_10'),
      gond('Rice rack', 'Gondola_Island_Low_10', tops([['Bag_Rice_01', -0.15, 0.7], ['Bag_Rice_01', 0.1, 0.7]])),
      gond('Soup gondola', 'Gondola_Island_10'), gond('Canned veg gondola', 'Gondola_Island_10'),
      gond('Flour rack', 'Gondola_Island_Low_10', tops([['Bag_Flour_01', -0.15, 0.7], ['Bag_Flour_01', 0.1, 0.7]]))], 5.5, -5.5, 's'),
    pwrun([gond('Sauce gondola', 'Gondola_Island_10'), gond('Baking gondola', 'Gondola_Island_10'),
      gond('Oil rack', 'Gondola_Island_Low_10', tops([['Jug_CookingOil_01', -0.15, 0.7], ['Jug_CookingOil_01', 0.1, 0.7]])),
      gond('Spice pegs', 'Gondola_Island_Peg_10'), gond('Coffee gondola', 'Gondola_Island_10'),
      gond('Tea rack', 'Gondola_Island_Low_10')], 5.5, -7.7, 's'),
    [up('Soup end cap', pw('Gondola_EndCap_10', 5.68, -5.5, 'b', { stock: 1 })), up('Jar end cap', pw('Gondola_EndCap_10', 2.37, -5.5, 'k', { stock: 1 })),
      up('Ketchup end cap', pw('Gondola_EndCap_10', 5.68, -7.7, 'b', { stock: 1 })), up('Cereal end cap', pw('Gondola_EndCap_10', 2.37, -7.7, 'k', { stock: 1 }))],
    [up('Can bin', pw('DumpBin_Wire_01', 2.4, -3.65, 's', { stock: 1 })), up('Flour table', pw('Table_Promo_Tiered_01', 6.65, -5.55, 'b', { stock: 1 })), talk('Pantry sale board', 'SALE', 6.05, -6.65),
      up('Jar table', pw('Table_Promo_Tiered_01', 6.65, -7.75, 'b', { stock: 1 })), mat('Entry mat', 6.2, 7.0, -5.0, -4.7, 0xf0e3bc),
      up('Pasta table', pw('Table_Promo_Tiered_01', 1.45, -5.6, 'k', { stock: 1 })), up('Bean table', pw('Table_Promo_Tiered_01', 1.45, -8.5, 'k', { stock: 1 })),
      up('Soup table', pw('Table_Promo_Tiered_01', 1.45, -4.9, 'k', { stock: 1 }))]),
    [SIGN, counter('Pantry desk', 6.7, -8.5, 'b', 6.25, -8.5), up('Promo table', pw('Table_Promo_Tiered_01', 1.45, -6.65, 'k', { stock: 1 })), lights([[3, -6.6], [5.2, -6.6]]), HELP,
      up('Bulk bins', { sign: 'gold' }, pw('BulkBins_Gravity_10', 1.45, -7.7, 'k', {}))])
};

AREAS.snacks = {
  cx: 4.05, cz: -11.0, vacant: [1.25, 6.9, -13.2, -8.9], sign: [4.0, -10.9, 2.2],
  floor: [{ poly: rbox(1.25, 6.9, -13.2, -8.9, 0.5), finish: 0xf6e6a6 }],
  ups: ups(runs(
    pwrun([gond('Chip gondola', 'Gondola_Island_10'), ['Chip racks', 'WireRack_Chips_01', 0.6, { stock: 1, n: 2 }],
      ['Candy spinners', 'SpinnerRack_01', 0.5, { stock: 1, n: 2 }], ['Soda cooler', 'DrinkCooler_GrabGo_10', 0.5, { stock: 1 }],
      ['Juice cooler', 'DrinkCooler_GrabGo_10', 0.5, { stock: 1 }], ['Water cooler', 'DrinkCooler_Upright_01', 0.325, { stock: 1 }]], 5.5, -9.9, 's'),
    pwrun([gond('Cracker gondola', 'Gondola_Island_10'), gond('Nut rack', 'Gondola_Island_Low_10'),
      ['Energy cooler', 'DrinkCooler_GrabGo_10', 0.5, { stock: 1 }], ['Tea cooler', 'DrinkCooler_GrabGo_10', 0.5, { stock: 1 }],
      ['Sports cooler', 'DrinkCooler_Upright_01', 0.325, { stock: 1 }], ['Mint spinners', 'SpinnerRack_01', 0.6, { stock: 1, n: 2 }]], 5.5, -12.1, 's'),
    [up('Chocolate end cap', pw('Gondola_EndCap_10', 5.68, -9.9, 'b', { stock: 1 })), up('Candy end cap', pw('Gondola_EndCap_10', 2.45, -9.9, 'k', { stock: 1 })),
      up('Cola end cap', pw('Gondola_EndCap_10', 5.68, -12.1, 'b', { stock: 1, on: tops([['Bottle_Soda_2L_01', -0.1, 0.9], ['Bottle_Soda_2L_01', 0, 0.9], ['Bottle_Soda_2L_01', 0.1, 0.9]]) })),
      up('Pretzel end cap', pw('Gondola_EndCap_10', 2.45, -12.1, 'k', { stock: 1 }))],
    [up('Soda table', pw('Table_Promo_Tiered_01', 4.05, -3.65, 's', { stock: 1, on: tops([['Can_Soda_6Pack_01', -0.15, 0.56], ['Can_Soda_6Pack_01', 0.15, 0.56]]) })),
      up('Water table', pw('Table_Promo_Tiered_01', 6.65, -9.9, 'b', { stock: 1, on: tops([['Bottle_Water_01', 0, 0.56]]) })), talk('Drinks board', 'COLD DRINKS', 6.05, -11.0),
      up('Juice table', pw('Table_Promo_Tiered_01', 6.65, -12.1, 'b', { stock: 1, on: tops([['Bottle_Juice_01', 0, 0.56]]) })), up('Chips table', pw('Table_Promo_Tiered_01', 1.45, -9.9, 'k', { stock: 1 })),
      mat('Entry mat', 6.2, 7.0, -9.5, -8.9, 0xf0d98a), mat('Back mat', 1.25, 1.9, -9.5, -8.9, 0xf0d98a),
      up('Candy table', pw('Table_Promo_Tiered_01', 1.45, -12.85, 'k', { stock: 1 }))]),
    [SIGN, counter('Snack desk', 6.7, -12.85, 'b', 6.25, -12.85), up('Gum spinner', pw('SpinnerRack_01', 1.45, -11.0, 'k', { stock: 1 })), lights([[3, -11], [5.2, -11]]), HELP,
      up('Drink machine', { sign: 'gold' }, pw('VendingMachine_Drink_01', 1.45, -12.1, 'k'))])
};

var FISH = [['pets/animal-fish*2.2', 'pets/animal-fish*2.2'], ['pets/animal-fish*2.2', 'pets/animal-fish*2.2']];
function tank(name, x, ref) {
  return up(name, ['tank', x, -18.0, 's', [[ref, ref], [ref, ref]]]);
}
// a low fence ring on straw with the animal standing in it
function pen(name, x, ref) {
  var z = -17.85;
  var h = 0.42;
  return up(name, { patch: rbox(x - h, x + h, z - h, z + h, 0.1), finish: 0xe3cf8a }, m('forest/fence', x, z - h, 0, 0.84), m('forest/fence', x, z + h, 0, 0.84),
    m('forest/fence', x - h, z, Math.PI / 2, 0.84), m('forest/fence', x + h, z, Math.PI / 2, 0.84), { m: ref, x: x, z: z, r: 0.6, k: 1, y: 0, flat: 1 });
}
AREAS.pets = {
  cx: 4.05, cz: -15.8, vacant: [1.25, 6.9, -18.4, -13.2], sign: [4.0, -15.0, 1.6],
  floor: [{ poly: rbox(1.25, 6.9, -18.4, -13.2, 0.5), finish: 0xcfe4bf }],
  ups: ups(runs(
    pwrun([gond('Dog food gondola', 'Gondola_Island_10'), gond('Cat food rack', 'Gondola_Island_Low_10', tops([['Bag_PetFood_01*1.4', -0.13, 0.7], ['Bag_PetFood_01*1.4', 0.13, 0.7]])),
      gond('Puppy food gondola', 'Gondola_Island_10'), gond('Kitten food rack', 'Gondola_Island_Low_10', tops([['Bag_PetFood_01*1.4', -0.13, 0.7], ['Bag_PetFood_01*1.4', 0.13, 0.7]])),
      gond('Dog treat gondola', 'Gondola_Island_10'), gond('Cat treat rack', 'Gondola_Island_Low_10', tops([['Bag_PetFood_01*1.4', 0, 0.7]]))], 5.5, -13.9, 's'),
    pwrun([gond('Bird seed gondola', 'Gondola_Island_10'), gond('Fish food gondola', 'Gondola_Island_10'),
      gond('Litter rack', 'Gondola_Island_Low_10', tops([['Bag_PetFood_01*1.4', -0.13, 0.7], ['Bag_PetFood_01*1.4', 0.13, 0.7]])),
      gond('Chew toy pegs', 'Gondola_Island_Peg_10'), gond('Collar pegs', 'Gondola_Island_Peg_10'), gond('Pet bed rack', 'Gondola_Island_Low_10')], 5.5, -16.1, 's'),
    [up('Treat end cap', pw('Gondola_EndCap_10', 5.68, -13.9, 'b', { stock: 1 })),
      up('Dog toy end cap', pw('Gondola_EndCap_10', 2.37, -13.9, 'k', { stock: 1 }), { m: 'pets/animal-dog*3', x: 2.37, z: -13.9, r: -1.57, k: 1, y: 0.9, flat: 1 }),
      up('Catnip end cap', pw('Gondola_EndCap_10', 5.68, -16.1, 'b', { stock: 1 }), { m: 'pets/animal-cat*2.5', x: 5.68, z: -16.1, r: 1.57, k: 1, y: 0.9, flat: 1 }),
      up('Leash end cap', pw('Gondola_EndCap_10', 2.37, -16.1, 'k', { stock: 1 }))],
    [up('Pet food table', pw('Table_Promo_Tiered_01', 5.7, -3.65, 's', { stock: 1, on: tops([['Bag_PetFood_01', -0.15, 0.56], ['Bag_PetFood_01', 0.15, 0.56]]) })), tank('Fish tank', 1.75, 'pets/animal-fish*2.2'),
      pen('Puppy pen', 2.82, 'pets/animal-dog*2.5'), pen('Kitten pen', 3.9, 'pets/animal-cat*2.5'),
      talk('Pet toys board', 'PET TOYS 2 FOR 5', 6.05, -15.0), up('Pet rug', { patch: rbox(6.05, 6.85, -17.35, -16.55, 0.2), finish: 0xe6b8a8 }),
      perch('Dog bed', 'furn/rugRound', 6.45, -16.95, 0.06, 1.0), up('Ball table', pw('Table_Promo_Tiered_01', 1.45, -15.0, 'k', { stock: 1 }))]),
    [SIGN, counter('Pet desk', 6.7, -14.5, 'b', 6.25, -14.5),
      up('Adoption corner', pw('Table_Promo_Tiered_01', 6.65, -13.6, 'b', { stock: 1, on: tops([['Bag_PetFood_01', -0.15, 0.56], ['Bag_PetFood_01', 0.15, 0.56]]) }), on('pets/animal-dog*3', 6.2, -13.6, 0, 1, 1.2), on('pw/Bowl_01*3', 6.6, -13.6, 0.48)),
      lights([[3, -15], [5.2, -15]]), HELP,
      up('Showcase', { sign: 'gold' }, ['tank', 4.95, -18.0, 's', FISH], ['tank', 5.95, -18.0, 's', FISH])])
};

// the power wall: coolers along the back wall, open freezers and wells as islands in front of them
// two rows of three goods in the well of an open island, left to right, back row first
function well(refs, y, k) {
  var out = [];
  for (var i = 0; i < 6; i++) out.push([refs[i % refs.length], (i % 3 - 1) * 0.28, i < 3 ? -0.1 : 0.1, i * 0.9, y, k || 1]);
  return out;
}
function dairyIsland(name, x, refs, k) {
  return up(name, pw('IslandFreezer_Open_20', x, -19.7, 's', { on: well(refs, 0.3, k) }));
}
function cooler(name, kind, x) {
  return up(name, pw(kind, x, -21.97, 's', { stock: 1 }));
}
var CHEESE = 'food/cheese*0.3';
var PUD = 'food/pudding';
AREAS.dairy = {
  cx: 4.0, cz: -21.0, vacant: [0.1, 8.0, -22.2, -18.9], sign: [4.0, -20.5, 1.8],
  floor: [{ poly: rbox(0.1, 7.9, -21.7, -19.5, 0.5), finish: 0xc2dcf2 }],
  ups: ups([
    cooler('Milk cooler', 'Multideck_Open_20', 1.1),
    cooler('Yogurt cooler', 'Multideck_Open_20', 2.1),
    cooler('Egg cooler', 'CoolerDoors_2Door_15', 2.975),
    cooler('Pudding cooler', 'Multideck_Open_20', 3.85),
    cooler('Cream cooler', 'CoolerDoors_2Door_15', 4.725),
    cooler('Butter cooler', 'DrinkCooler_Upright_01', 5.275),
    cooler('Juice cooler', 'DrinkCooler_Upright_01', 5.675),
    dairyIsland('Cheese island', 1.4, [CHEESE, PUD, 'pw/Carton_Milk_01', PUD], 1.6),
    dairyIsland('Dessert island', 2.4, [PUD, 'pw/Carton_JuiceBox_3Pack_01', PUD], 1.8),
    dairyIsland('Dip island', 3.4, ['pw/Carton_JuiceBox_3Pack_01', PUD, 'pw/Carton_Milk_01'], 1.8),
    dairyIsland('Spread island', 4.4, ['pw/Carton_Eggs_01', 'pw/Carton_Milk_01', 'pw/Jug_Milk_01'], 1.6),
    dairyIsland('Sour cream island', 5.4, ['pw/Carton_JuiceBox_3Pack_01', 'pw/Carton_Milk_01', PUD], 1.8),
    dairyIsland('Snack cheese', 6.4, ['pw/Carton_JuiceBox_3Pack_01', PUD, 'pw/Carton_Milk_01'], 1.8),
    talk('Fresh dairy board', 'FRESH DAIRY', 4.0, -18.85),
    up('Recycling', pw('TrashRecycle_Station_01', 6.6, -22.05, 's', { spots: 0 })),
    up('Dairy plant', pw('Planter_Tall_01', 0.3, -21.55, 0, { spots: 0 })),
    up('Hand truck', pw('DeliveryBoxes_Dolly_01', 7.1, -22.03, 0, { spots: 0 })),
    up('Juice end cap', pw('Gondola_EndCap_Low_10', 6.1, -22.07, 's', { stock: 1 })),
    up('Ice bags', pw('IceBag_01', 7.6, -22.1, 0, { n: 3, spots: 0 })),
    up('Full basket', pw('Basket_Hand_Full_01', 1.0, -20.55, 0, { spots: 0 })),
    up('Basket stack', pw('Basket_Stack_01', 0.4, -20.35, 'b', { spots: 0 })),
    up('Wet floor sign', pw('WetFloorSign_01', 7.85, -19.1, 's', { spots: 0 })),
    mat('Dairy mat', 1.4, 2.9, -21.0, -19.9, 0xd7e6f6),
    up('Spare baskets', pw('Basket_Stack_01', 0.3, -20.95, 'b', { spots: 0 }))
  ], [SIGN, counter('Dairy desk', 7.1, -20.7, 'k', 7.55, -20.7), dairyIsland('Cheese display', 7.4, [CHEESE, PUD, 'pw/Carton_JuiceBox_3Pack_01', PUD], 1.6), lights([[2.5, -20.6], [5.5, -20.6]]), HELP,
    up('Showcase', { sign: 'gold' }, pw('IceCream_Chest_01', 0.45, -19.7, 's', { on: [[CHEESE, -0.1, 0, 0.5, 0.3], [CHEESE, 0.1, 0, 1.4, 0.3], ['pw/Yogurt_4Pack_01', 0, 0.05, 0, 0.35, 1.6]] }))])
};

function freezer(name, kind, x) {
  return up(name, pw(kind, x, -19.7, 's', { stock: 1 }));
}
AREAS.frozen = {
  cx: -4.5, cz: -21.0, vacant: [-8.0, -1.0, -22.2, -18.9], sign: [-4.5, -20.5, 1.8],
  floor: [{ poly: rbox(-7.9, -1.1, -21.7, -19.5, 0.5), finish: 0xafcdee }],
  ups: ups([
    up('Ice cream cooler', pw('FreezerDoors_2Door_15', -7.5, -21.97, 's', { stock: 1 })),
    up('Pizza cooler', pw('FreezerDoors_2Door_15', -6.75, -21.97, 's', { stock: 1 })),
    up('Veg cooler', pw('FreezerDoors_2Door_15', -6, -21.97, 's', { stock: 1 })),
    up('Popsicle cooler', pw('FreezerDoors_2Door_15', -5.25, -21.97, 's', { stock: 1 })),
    up('Dinner cooler', pw('FreezerDoors_2Door_15', -4.5, -21.97, 's', { stock: 1 })),
    up('Fries cooler', pw('FreezerDoors_2Door_15', -3.75, -21.97, 's', { stock: 1 })),
    freezer('Ice cream chest', 'IslandFreezer_Coffin_20', -6.4),
    freezer('Pizza chest', 'IslandFreezer_Open_20', -5.4),
    freezer('Pops chest', 'IslandFreezer_Coffin_20', -4.4),
    freezer('Bagged veg chest', 'IslandFreezer_Open_20', -3.4),
    freezer('Waffle chest', 'IslandFreezer_Coffin_20', -2.4),
    board('Ice cream deal', 'ICE CREAM 2 FOR 6', -2.9, -18.9, 1.1),
    up('Recycling', pw('TrashRecycle_Station_01', -1.7, -21.65, 's', { spots: 0 })),
    up('Frozen plant', pw('Planter_Tall_01', -8.1, -18.6, 0, { spots: 0 })),
    up('Full basket', pw('Basket_Hand_Full_01', -2.0, -20.9, 0.4, { spots: 0 })),
    board('Pizza deal', 'PIZZA 3 FOR 10', -6.3, -18.9, 1.0),
    up('Basket stack', pw('Basket_Stack_01', -1.2, -21.6, 0.2, { spots: 0 })),
    up('Ice bags', pw('IceBag_01', -3.05, -21.6, 0, { n: 3, spots: 0 })),
    board('Frozen veg deal', 'FROZEN VEG 4 FOR 5', -4.6, -18.9, 1.1),
    up('Tub chest', pw('IceCream_Chest_01', -2.4, -21.6, 's', { on: [['pw/Tub_IceCream_01', -0.12, 0, 0, 0.43, 2.4], ['pw/Tub_IceCream_01', 0.02, 0, 1, 0.43, 2.4], ['pw/Tub_IceCream_01', 0.14, 0, 2, 0.43, 2.4]] })),
    board('Frozen specials', 'FROZEN SPECIALS', -8.0, -20.3, 1.0),
    up('Dolly', pw('DeliveryBoxes_Dolly_01', -8.15, -21.3, 0.2, { spots: 0 })),
    board('Bagged ice deal', 'BAGGED ICE 2 FOR 5', -1.1, -18.85, 1.0),
    mat('Cold floor mat', -3.4, -1.8, -20.9, -19.9, 0xc7dcf0)
  ], [SIGN, clerk(-1.5, -20.5, 'k'), up('Ice cream island', pw('IslandFreezer_End_10', -1.45, -19.55, 's', { stock: 1 })), lights([[-6, -20.6], [-3, -20.6]]), HELP,
    up('Showcase', { sign: 'gold' }, pw('IslandFreezer_Coffin_20', -7.4, -19.7, 's', { stock: 1 }))])
};

function deli(name, z) {
  return up(name, pw('SelfServe_Meat_20', 13.2, z, 'k', { stock: 1 }));
}
function meatWall(name, kind, x) {
  return up(name, pw(kind, x, -21.97, 's', { stock: 1 }));
}
function meatChest(name, z, refs) {
  return up(name, pw('IslandFreezer_Open_20', 11.3, z, 'k', { on: well(refs, 0.3, 1.6) }));
}
AREAS.meat = {
  cx: 12.0, cz: -18.4, vacant: [9.7, 14.7, -22.2, -14.4], sign: [12.0, -20.5, 2.2],
  floor: [{ poly: rbox(9.7, 14.7, -18.4, -14.4, 0.6), finish: 0xf2ddd8 }, { poly: rbox(9.1, 14.7, -21.7, -19.5, 0.4), finish: 0xf2ddd8 }],
  ups: ups([
    deli('Beef case', -15.0), deli('Rib case', -16.0), deli('Sausage case', -17.0), deli('Fish case', -18.0),
    meatWall('Turkey cooler', 'Multideck_Open_20', 10.45),
    meatWall('Burger cooler', 'Multideck_Open_20', 11.45),
    meatWall('Seafood cooler', 'Multideck_Open_20', 12.45),
    meatWall('Rib cooler', 'Multideck_Open_20', 13.45),
    meatWall('Ham cooler', 'CoolerDoors_2Door_15', 14.325),
    up('Meat fridge', pw('Freezer_Upright_01', 14.53, -14.8, 'k', { spots: 0 })),
    up('Seafood case', pw('ServiceCase_Seafood_20', 12.6, -19.6, 's')),
    up('Slicer cart', pw('SampleCart_01', 9.95, -15.5, 'b', { spots: 0, on: [['pw/DeliScale_Printer_01', 0, 0, 0, 0.48]] })),
    meatChest('Bacon chest', -15, ['pw/Tray_Meat_01', 'food/bacon-raw*0.5', 'pw/Tray_Meat_01']),
    meatChest('Ham chest', -16, ['food/whole-ham*0.4', 'pw/Tray_Meat_01', 'food/whole-ham*0.4']),
    meatChest('Sausage chest', -17, ['food/hot-dog-raw*0.7', 'pw/Tray_Meat_01', 'food/sausage*0.7']),
    talk('Deli board', 'FRESH DELI', 12.25, -14.6),
    up('Meat floor', { patch: rbox(10.2, 12.6, -17.8, -14.6, 0.3), finish: 0xe9c9c2 }),
    up('Brine tubs', pw('FoodTub_Stack_01', 9.9, -14.85, 0, { spots: 0 })),
    up('Butcher case', pw('ServiceCase_Meat_20', 10.5, -19.6, 's')),
    up('Meat tubs', pw('FoodTub_Stack_01', 14.58, -15.4, 0, { spots: 0 })),
    mat('Cold mat', 13.9, 14.6, -17.1, -15.8, 0xe3bdb5),
    mat('Service mat', 10.2, 12.9, -18.9, -18.5, 0xe3bdb5),
    up('Basket stack', pw('Basket_Stack_01', 9.82, -19.6, 'b', { spots: 0 })),
    up('Ice bags', pw('IceBag_01', 14.6, -16.7, 'k', { n: 2, spots: 0 }))
  ], [SIGN, counter('Meat desk', 13.45, -19.6, 's', 13.45, -20.05), up('Meat island', pw('SelfServe_Meat_20', 11.55, -19.6, 's', { stock: 1 })), lights([[11.8, -20.6], [13.5, -16.5]]), HELP,
    up('Showcase', { sign: 'gold' }, pw('DrinkCooler_Upright_01', 9.95, -20.5, 's', { stock: 1 }))])
};

// general merchandise, west
function fx(name, kind, x, z, face, goods, extra, n, flag) {
  return up(name, [kind, x, z, face, goods, extra || null, n || 1, flag]);
}
// something standing on a fixture or the floor that takes no room of its own
function on(ref, x, z, y, k, r) {
  return { m: ref, x: x, z: z, r: r || 0, k: k || 1, y: y, flat: 1 };
}
function perch(name, ref, x, z, y, k, r) {
  return up(name, on(ref, x, z, y, k, r));
}
function mat(name, x0, x1, z0, z1, c) {
  return up(name, { patch: rbox(x0, x1, z0, z1, Math.min(0.2, (x1 - x0) / 3, (z1 - z0) / 3)), finish: c });
}
// a cabinet with a till on it
function till(x, z, face, flag) {
  return ['furn/kitchenCabinet', x, z, face, null, [['shop/cash-register*0.4', 0, 0, 0, 0.405]], 1, flag || 'staff'];
}
var GBALL = ['golf/ball-blue*2', 'golf/ball-red*2', 'golf/ball-green*2'];
// the six units of a west row, from the loop aisle in; each face shows four neighbours of a pool of goods
function lane(z, names, pool, off) {
  return names.map(function (n, i) {
    var o = (off || 0) + i * 3;
    return unit(n, -6.05 + i * 0.8, z, sf(pool[o % pool.length], pool[(o + 1) % pool.length], pool[(o + 2) % pool.length], pool[(o + 4) % pool.length]));
  });
}
var XM = 'holiday/';
var XP = [XM + 'present-a-cube*0.35', XM + 'present-b-round*0.35', XM + 'present-a-round*0.35', XM + 'present-b-cube*0.35', XM + 'present-a-rectangle*0.3'];
// goods for the opts.on of a Pipework fixture, in the fixture's own frame (world units: x across, z toward its front, y from the floor).
// shelves of a gondola, per goods across each shelf, lowest shelf first, the front face and then the back
function shelfGoods(refs, per, o) {
  o = o || {};
  var out = [];
  var n = 0;
  (o.zs || [0.25, -0.25]).forEach(function (z) {
    (o.ys || [0.15, 0.55, 0.95, 1.35]).forEach(function (y) {
      for (var j = 0; j < per; j++) out.push([refs[n++ % refs.length], (j - (per - 1) / 2) * 0.84 / per * PW, z * PW, (z < 0 ? Math.PI : 0) + (o.turn || 0), (y + 0.02) * PW]);
    });
  });
  return out;
}
// hooks of a peg gondola, four across and three down on each face; drop is how far a pack hangs below its hook
function pegGoods(refs, drop, o) {
  o = o || {};
  var out = [];
  var n = 0;
  (o.zs || [0.11, -0.11]).forEach(function (z) {
    (o.ys || [1.58, 1.09, 0.6]).forEach(function (y) {
      (o.xs || [-0.33, -0.11, 0.11, 0.33]).forEach(function (x) {
        out.push([refs[n++ % refs.length], x * PW, z * PW, z < 0 ? Math.PI : 0, y * PW - drop]);
      });
    });
  });
  return out;
}
// the three tiers of a promo table: [z, y, count, gap] from the front
function tierGoods(refs, rows) {
  var out = [];
  var n = 0;
  (rows || [[0.125, 0.225, 4, 0.13], [0, 0.35, 3, 0.13]]).forEach(function (r) {
    for (var j = 0; j < r[2]; j++) out.push([refs[n++ % refs.length], (j - (r[2] - 1) / 2) * r[3], r[0], 0, r[1]]);
  });
  return out;
}
// a podium with a register, the clerk standing beside it
function counter(name, x, z, face, sx, sz) {
  return up(name, pw('HostStand_01', x, z, face, { spots: 0, on: [['pw/Register_Classic_01', 0, 0, 0, 0.58]] }), { staff: [sx, sz, face] });
}
var TBOX = BOX.map(function (r) { return r + '*0.5'; });

var SGIFT = ['present-a-round', 'present-b-cube', 'present-a-cube', 'present-b-round', 'present-a-rectangle'].map(function (p) { return XM + p + '*0.25'; });
// a tree standing on a pallet
function xmasTree(name, ref, x, z, k) {
  return up(name, pw('Pallet_01', x, z, 's'), { m: ref, x: x, z: z, r: 0, k: k || 1, y: 0.06, flat: 1 });
}
AREAS.seasonal = {
  cx: -12.2, cz: -3.0, vacant: [-14.7, -9.7, -4.9, -0.3], sign: [-10.92, -3.9, 1.9],
  floor: [{ poly: rbox(-14.7, -9.7, -4.9, -0.3, 0.6), finish: 0xf1e2e2 }],
  ups: ups([
    xmasTree('Christmas tree', 'holiday/tree-decorated*0.6', -10.45, -1.2),
    up('Present table', pw('Table_Promo_Tiered_01', -11.3, -2.75, 's', { on: tierGoods(SGIFT, [[0.125, 0.225, 4, 0.13], [0, 0.35, 3, 0.13], [-0.125, 0.475, 2, 0.13]]) })),
    up('Ornament shelf', pw('Gondola_Wall_10', -13.8, -4.55, 's', { on: shelfGoods(SGIFT.slice(0, 2).concat([XM + 'lantern*0.25']), 3, { zs: [0.03] }) })),
    up('Candy cane end', pw('Gondola_EndCap_10', -10.55, -4.55, 's', { on: shelfGoods([XM + 'candy-cane-red*0.35', XM + 'candy-cane-green*0.35'], 3, { zs: [0.03] }) })),
    up('Train table', pw('Table_Promo_Tiered_01', -12.5, -2.75, 's', { on: [[XM + 'train-locomotive*0.3', -0.12, 0.125, 0, 0.225], [XM + 'train-wagon*0.3', 0.12, 0.125, 0, 0.225], [XM + 'train-tender*0.3', 0, 0, 0, 0.35]] })),
    up('Stocking shelf', pw('Gondola_Wall_10', -13.0, -4.55, 's', { on: shelfGoods([XM + 'sock-green*0.3', XM + 'sock-red*0.3'], 3, { zs: [0.03] }) })),
    up('Snowman table', pw('Table_Promo_Tiered_01', -13.7, -2.75, 's', { on: [[XM + 'snowman*0.25', -0.15, 0.125, 0.3, 0.225], [XM + 'nutcracker*0.3', 0.1, 0.1, 0, 0.225], [XM + 'gingerbread-man*0.4', 0.25, 0.12, 0, 0.225], [XM + 'snowman*0.2', 0, -0.02, 0, 0.35]] })),
    up('Gift wrap shelf', pw('Gondola_Wall_10', -12.2, -4.55, 's', { on: shelfGoods(SGIFT.slice(2), 3, { zs: [0.03] }) })),
    xmasTree('Spruce tree', 'nature/tree_pineRoundC*0.4', -11.45, -1.2),
    up('Lantern shelf', pw('Gondola_Wall_10', -11.4, -4.55, 's', { on: shelfGoods([XM + 'lantern*0.3', SGIFT[1], 'furn/lampSquareTable*0.8'], 3, { zs: [0.03] }) })),
    xmasTree('Pine tree', 'nature/tree_small*0.5', -12.45, -1.2),
    up('Sled bin', pw('DumpBin_Wire_01', -13.4, -1.2, 's', { on: [[XM + 'sled*0.3', 0, 0.02, 0.3, 0.3], [XM + 'sled*0.3', 0.05, -0.04, -0.2, 0.36], [XM + 'nutcracker*0.3', -0.15, 0.04, 0, 0.3]] })),
    perch('Wreath', XM + 'wreath-decorated*0.5', -13.0, -4.6, 0.92),
    mat('Snow patch', -14.3, -10.2, -1.7, -0.6, 0xf6f6fa),
    mat('Holiday rug', -13.9, -10.9, -3.3, -2.2, 0xcf8d8d),
    perch('Star lantern', 'furn/lampRoundTable', -11.4, -4.55, 0.92),
    up('Gift bin', pw('DumpBin_Wire_01', -14.4, -4.3, 'b', { spots: 0, on: [[XP[0], 0, 0.03, 0, 0.2], [XP[1], 0.08, -0.05, 0.5, 0.2], [XP[2], -0.08, 0.05, 1, 0.2]] })),
    up('Holiday planter', pw('Planter_Tall_01', -14.45, -1.9, 0, { spots: 0 })),
    perch('Candy cane', XM + 'candy-cane-red*0.5', -10.55, -4.55, 0.92),
    perch('Shelf snowman', XM + 'snowman*0.25', -12.9, -4.55, 0.92),
    d('Present pile', XP[1], -10.1, -0.55, 0.3, 1.3),
    perch('Shelf presents', XP[0], -12.2, -4.55, 0.92),
    d('Gingerbread', XM + 'gingerbread-man*0.4', -10.05, -3.2, 0.2, 1.2),
    perch('Stocking topper', XM + 'sock-red*0.5', -13.8, -4.55, 0.92)
  ], [SIGN, counter('Gift counter', -9.95, -4.5, 'k', -9.5, -4.5),
    xmasTree('Giant tree', 'nature/tree_fat*0.45', -14.15, -1.25),
    lights([[-13, -2.5], [-11.2, -3.2]]), HELP,
    up('Santa display', { sign: 'gold' }, pw('PalletDisplay_Half_01', -14.4, -3.35, 'b', { on: [[XM + 'sled*0.35', 0, 0.1, 0, 0.225], [XM + 'reindeer*0.35', 0, 0, 0, 0.375]] }))])
};

AREAS.clothes = {
  cx: -12.2, cz: -8.0, vacant: [-14.7, -9.7, -10.9, -5.0], sign: [-12.5, -10.3, 1.9],
  floor: [{ poly: rbox(-14.7, -9.7, -10.8, -5.1, 0.6), finish: 'carpet' }],
  ups: ups([
    rail('Shirt rack', -10.9, -5.9, 's'),
    up('Tee table', pw('Table_Promo_Tiered_01', -12.0, -5.9, 's', { stock: 1 })),
    dummy('Window mannequin', -10.0, -5.9),
    rail('Jacket rack', -13.1, -5.9, 's'),
    rail('Coat rack', -10.9, -7.4, 's'),
    up('Sweater table', pw('Table_Promo_Tiered_01', -14.2, -5.9, 's', { stock: 1 })),
    rail('Kids rack', -12.0, -7.4, 's'),
    dummy('Suit mannequin', -10.0, -7.4),
    up('Denim table', pw('Table_Promo_Tiered_01', -10.9, -8.9, 's', { stock: 1 })),
    up('Sock table', pw('Table_Promo_Tiered_01', -13.1, -7.4, 's', { stock: 1 })),
    rail('Skirt rack', -12.0, -8.9, 's'),
    rail('Hoodie rack', -13.1, -8.9, 's'),
    up('Hoodie table', pw('Table_Promo_Tiered_01', -14.2, -8.9, 's', { stock: 1 })),
    up('Sneaker end', pw('Gondola_EndCap_Low_10', -10.45, -10.65, 's', { stock: 1 })),
    up('Boot end', pw('Gondola_EndCap_Low_10', -11.0, -10.65, 's', { stock: 1 })),
    up('Sandal end', pw('Gondola_EndCap_Low_10', -11.55, -10.65, 's', { stock: 1 })),
    up('Slipper end', pw('Gondola_EndCap_Low_10', -12.1, -10.65, 's', { stock: 1 })),
    up('Fitting rooms', { box: [-14.7, -13.55, -10.8, -9.95, 0, 0.9], c: 0x8a7a68 }, { box: [-14.55, -13.7, -9.97, -9.93, 0.05, 0.85], c: 0xe9dcc4 }),
    up('Wall mirror', { box: [-14.7, -14.62, -9.5, -8.3, 0.1, 0.85], c: 0xb8d4e0 }),
    d('Kids mannequin', 'shop/mannequin*0.7', -14.4, -9.55, 0.3),
    d('Clothes plant', 'furn/pottedPlant', -14.4, -5.25, 0, 0.9),
    mat('Carpet runner', -13.3, -10.5, -7.15, -6.05, 0x6f84a8),
    d('Hanger boxes', 'furn/cardboardBoxOpen', -14.4, -6.5, 0.2, 1.2),
    d('Hat boxes', 'furn/cardboardBoxOpen', -9.95, -6.6, 0.2, 1.1)
  ], [SIGN, up('Cash wrap', till(-9.95, -10.35, 'k'), { staff: [-9.5, -10.35, 'k'] }),
    up('Window display', { box: [-14.65, -13.75, -8.0, -6.8, 0, 0.12], c: 0xd9c9a8, flat: 1 }, pw('Slatwall_Panel_10', -14.58, -7.4, 'b', { n: 2, spots: 0 }), m('shop/mannequin', -14.2, -7.75, Math.PI / 2), m('shop/mannequin', -14.2, -7.05, Math.PI / 2)),
    lights([[-13, -7.0], [-11, -8.7]]), HELP,
    up('Fashion podium', { sign: 'gold' }, { box: [-10.4, -9.6, -9.3, -8.5, 0, 0.1], c: 0xe0b43a }, m('shop/mannequin', -10.0, -8.9, Math.PI / 2))])
};

AREAS.sports = {
  cx: -12.2, cz: -12.9, vacant: [-14.7, -9.7, -14.8, -10.9], sign: [-11.0, -13.35, 1.7],
  floor: [{ poly: rbox(-14.7, -9.7, -14.7, -11.0, 0.6), finish: 0xd9e4ee }],
  ups: ups([
    up('Ball bin', pw('DumpBin_Wire_01', -10.6, -12.0, 's', { stock: 1 })),
    tent('Dome tent', -11.55, -12.0),
    up('Skateboard rack', pw('Gondola_Island_Low_10', -10.6, -14.0, 's', { on: [['skate/skateboard*0.4', -0.1, 0.1, 0, 0.24], ['skate/skateboard*0.4', 0.1, 0.1, 0, 0.24], ['skate/skateboard*0.4', 0, 0.1, 0, 0.42]] })),
    tent('Camp tent', -12.5, -12.0),
    up('Bedroll table', pw('Table_Promo_Tiered_01', -11.55, -14.0, 's', { on: [['surv/bedroll-packed*0.9', -0.12, 0, 0, 0.33], ['surv/bedroll-packed*0.9', 0.12, 0, 0, 0.33], ['surv/bedroll-packed*0.9', 0.05, -0.1, 0, 0.475]] })),
    tent('Family tent', -13.45, -12.0),
    up('Camp stove table', pw('Table_Promo_Tiered_01', -12.5, -14.0, 's', { on: [['food/pot*0.5', -0.15, 0, 0, 0.33], ['food/pan*0.5', 0.15, 0, 0, 0.33]] })),
    up('Ice chest', pw('IceChest_Outdoor_01', -14.2, -12.0, 's')),
    rail('Jersey rack', -13.45, -14.0, 's'),
    d('Ice axe', 'surv/tool-pickaxe*2', -14.5, -13.0, 1.57),
    up('Yoga balls', pw('DumpBin_Wire_01', -14.35, -14.0, 's', { stock: 1 })),
    mat('Turf mat', -14.3, -10.2, -11.9, -10.8, 0x7fb069),
    d('Trail marker', 'car/cone', -9.9, -12.0, 0, 0.8),
    d('Cap boxes', 'furn/cardboardBoxClosed', -9.9, -12.75, 0.2, 1.0),
    perch('Camp lantern', 'furn/lampRoundTable', -11.55, -14.1, 0.5, 0.8),
    d('Sports plant', 'furn/pottedPlant', -9.9, -14.45, 0, 0.9),
    d('Stock boxes', 'furn/cardboardBoxClosed', -14.4, -10.95, 0.3, 1.1),
    perch('Tent lantern', 'furn/lampSquareTable', -13.45, -12.0, 0.5, 1.2),
    perch('Water bottles', 'surv/bottle*1.6', -10.6, -12.0, 0.5),
    perch('Cooler bucket', 'surv/bucket', -14.2, -12.0, 0.7, 1.3),
    board('Ball board', 'BALLS 3 FOR 10', -12.9, -10.95, 0.9),
    d('Spare cone', 'roads/construction-cone', -9.9, -11.3, 0, 0.8),
    perch('Camp radio', 'furn/radio', -12.5, -14.1, 0.5, 1.2),
    perch('Ball on bin', 'golf/ball-red*4', -10.45, -12.0, 0.5)
  ], [SIGN, up('Pro desk', till(-14.35, -14.5, 'b'), { staff: [-13.8, -14.5, 'b'] }),
    up('Climbing wall', { box: [-14.7, -14.63, -12.7, -11.8, 0, 1.3], c: 0x8e8e96 }, { box: [-14.63, -14.6, -12.5, -12.4, 0.5, 0.6], c: 0xe0524a }, { box: [-14.63, -14.6, -12.2, -12.1, 0.9, 1.0], c: 0x4a8fe0 }, { box: [-14.63, -14.6, -12.0, -11.9, 0.3, 0.4], c: 0xe0b43a }),
    lights([[-13, -12.7], [-11, -12.7]]), HELP,
    up('Go-kart', { sign: 'gold' }, ['car/kart-oobi', -9.95, -13.8, 's'])])
};

AREAS.auto = {
  cx: -12.2, cz: -17.0, vacant: [-14.7, -9.7, -19.0, -14.9], sign: [-11.2, -17.45, 1.4],
  floor: [{ poly: rbox(-14.7, -9.7, -19.0, -14.9, 0.6), finish: 0xd5d5d8 }],
  ups: ups([
    up('Wiper blades', pw('Gondola_Island_10', -10.8, -15.75, 's', { stock: 1, spots: 2 })),
    up('Wheel display', pw('Gondola_EndCap_10', -10.0, -15.75, 'b', { stock: 1, on: [['pw/Wheel_01', 0, 0, 0, 0.9, 1.3]] })),
    up('Motor oil', pw('Gondola_Island_Low_10', -11.6, -15.75, 's', { spots: 2, on: oil(0.24).concat(oil(0.42)) })),
    up('Battery end', pw('Gondola_EndCap_Low_10', -10.0, -18.0, 'b', { stock: 1, on: [['pw/Battery_Car_01', -0.1, 0, 0, 0.7, 2.2], ['pw/Battery_Car_01', 0.1, 0, 0, 0.7, 2.2]] })),
    up('Car care', pw('Gondola_Island_10', -12.4, -15.75, 's', { stock: 1, spots: 2 })),
    up('Batteries', pw('Gondola_Island_Low_10', -10.8, -18.0, 's', { spots: 2, on: [['pw/Battery_Car_01', -0.12, 0.1, 0, 0.24, 2.2], ['pw/Battery_Car_01', 0.12, 0.1, 0, 0.24, 2.2], ['pw/Battery_Car_01', 0, 0.1, 0, 0.42, 2.2]] })),
    up('Car accessories', pw('Gondola_Island_10', -11.6, -18.0, 's', { stock: 1, spots: 2 })),
    up('Tire stack', pw('Tire_Stack_01', -13.2, -15.75, 's')),
    up('Cleaning kits', pw('Gondola_Island_10', -12.4, -18.0, 's', { stock: 1, spots: 2 })),
    up('Racing wheels', pw('TireRack_Wall_01', -13.2, -18.0, 's')),
    d('Traffic cones', 'car/cone', -9.9, -16.4, 0),
    mat('Garage mat', -13.4, -10.3, -17.45, -16.35, 0xb8b8be),
    d('Auto boxes', 'furn/cardboardBoxClosed', -9.9, -18.7, 0.2, 1.1),
    d('Auto plant', 'furn/pottedPlant', -9.85, -14.95, 0, 0.9),
    perch('Jerry can', 'pw/JerryCan_01', -12.4, -15.75, 0.9, 1.6),
    perch('Oil jug', 'pw/OilJug_01', -11.6, -15.75, 0.7, 2.4),
    board('Tire sale board', 'TIRES 4 FOR 3', -11.2, -16.95, 0.9),
    d('Spare cones', 'roads/construction-cone', -9.95, -17.62, 0),
    mat('Bay mat', -14.8, -13.3, -18.2, -15.9, 0x9a9aa0),
    up('Spare bin', pw('TrashCan_Outdoor_01', -14.4, -18.7, 's', { spots: 0 })),
    perch('Rim on unit', 'pw/Rim_01', -10.8, -15.75, 0.9, 1.6),
    perch('Battery on unit', 'pw/Battery_Car_01', -10.8, -18.0, 0.7, 2.2),
    d('Hand truck', 'shop/hand-truck', -14.4, -15.2, 0.6),
    up('Spare wheel', pw('Wheel_01', -9.9, -19.3, Math.PI / 2, { spots: 0 }))
  ], [SIGN, up('Tire desk', till(-14.35, -15.9, 'b'), { staff: [-13.85, -15.9, 'b'] }),
    up('Tire tower', pw('Tire_Stack_01', -14.3, -17.9, 'b', { n: 2, spots: 0 })), lights([[-12.4, -16.9], [-10.8, -16.9]]), HELP,
    up('Kart showcase', { sign: 'gold' }, ['car/kart-oobi', -13.3, -16.9, 'b'])])
};

var TVK = [1.3, 1.15, 1, 1.15, 1.3, 1.15, 1];
// a television hung on a slatwall panel on the north wall
function tv(name, u) {
  return fx(name, 'pw/Wall_Slatwall_1m', -14.2 + u * 0.72, -22.19, 's', null, [['furn/televisionModern' + (TVK[u] === 1 ? '' : '*' + TVK[u]), 0, 0.1, 0, 0.3]]);
}
AREAS.tech = {
  cx: -12.2, cz: -20.6, vacant: [-14.7, -9.7, -22.2, -19.0], sign: [-11.0, -21.8, 2.4],
  floor: [{ poly: rbox(-14.7, -9.7, -22.2, -19.1, 0.5), finish: 0xd3d7e3 }],
  ups: ups([
    tv('24-inch TV', 6),
    up('Laptop table', pw('Table_Promo_Tiered_01', -10.2, -20.0, 's', { on: [['furn/laptop*1.0', -0.12, 0.125, 0.2, 0.225], ['furn/laptop*1.0', 0.12, 0.125, -0.2, 0.225], ['furn/laptop*1.0', 0, 0, 0, 0.35]] })),
    tv('32-inch TV', 5),
    tv('40-inch TV', 4),
    up('Computer table', pw('Table_Promo_Tiered_01', -11.5, -20.0, 's', { n: 2, on: [['furn/computerScreen*0.8', 0, -0.12, 0, 0.475], ['furn/computerKeyboard*0.9', 0, 0.02, 0, 0.35]] })),
    tv('43-inch TV', 3),
    up('Radio table', pw('Table_Promo_Tiered_01', -13.2, -20.0, 's', { n: 2, on: [['furn/radio*1.0', -0.1, 0.12, 0.1, 0.225], ['furn/speakerSmall*0.8', 0.15, 0.12, 0, 0.225], ['furn/speakerSmall*0.8', -0.15, 0, 0, 0.35]] })),
    tv('50-inch TV', 2),
    up('Game rack', pw('Gondola_EndCap_10', -14.3, -20.0, 's', { on: shelfGoods([TBOX[1], TBOX[3], TBOX[4], TBOX[0]], 2, { zs: [0.03] }) })),
    tv('55-inch TV', 1),
    perch('Camera box', TBOX[3], -10.2, -20.1, 0.475, 1.2),
    tv('65-inch TV', 0),
    mat('Demo mat', -14.2, -10.2, -19.93, -18.82, 0xb9c1d6),
    perch('Phone box', TBOX[1], -13.45, -20.1, 0.475, 1.1),
    perch('Desk plant', 'furn/plantSmall1', -10.4, -20.1, 0.475, 2),
    perch('Console box', TBOX[2], -11.85, -20.1, 0.475, 1.2),
    perch('Boxed console', TBOX[0], -14.3, -20.0, 0.92, 1.2, 0.3),
    perch('Bookshelf speaker', 'furn/speakerSmall', -11.15, -20.0, 0.475, 1.1),
    perch('Game stack', TBOX[4], -14.3, -20.0, 1.0, 1),
    perch('Cable boxes', 'furn/cardboardBoxOpen', -9.85, -19.75, 0, 0.6),
    perch('Computer mouse', 'furn/computerMouse*1.6', -11.0, -19.95, 0.35),
    perch('Monitor', 'furn/computerScreen*0.8', -10.2, -20.12, 0.475),
    perch('Desk lamp', 'furn/lampSquareTable', -13.45, -20.0, 0.35, 1.3),
    perch('Router box', TBOX[5], -12.95, -20.0, 0.35, 1.1)
  ], [SIGN, counter('Service desk', -14.4, -21.0, 'b', -13.9, -21.0),
    up('Home theater', ['pw/Table_Promo_Tiered_01', -12.2, -20.95, 's', null, [['furn/televisionModern*1.3', 0, -0.1, 0, 0.475], ['furn/speakerSmall*0.9', 0.2, 0.1, 0, 0.225], ['furn/speakerSmall*0.9', -0.2, 0.1, 0, 0.225]], 1]), lights([[-12.5, -21.0], [-10.5, -20.5]]), HELP,
    up('Sound system', { sign: 'gold' }, pw('GlassCase_Locked_10', -10.0, -21.15, 's', { on: shelfGoods(['furn/speakerSmall*0.55', 'furn/radio*0.7', 'furn/speaker*0.3'], 2, { zs: [0], ys: [0.45, 0.8, 1.15, 1.5] }) })) ])
};

AREAS.home = {
  cx: -4.1, cz: -7.0, vacant: [-6.9, -1.25, -9.3, -4.7], sign: [-3.0, -6.15, 1.6],
  floor: [{ poly: rbox(-6.9, -1.25, -9.3, -4.7, 0.5), finish: 'wood' }],
  ups: ups([
    fx('Sofa', 'furn/loungeSofa%carpet=5b7fc4*1.4', -5.4, -8.15, 's', null, [['furn/pillowBlue*1.4', -0.4, -0.02, 0.3, 0.3], ['furn/pillow*1.4', 0.4, -0.02, -0.3, 0.3]]),
    perch('Living rug', 'furn/rugRectangle%=b9c9e6', -5.5, -7.3, 0, 1.6),
    d('Coffee table', 'furn/tableCoffee', -5.4, -6.5, 0, 1.4),
    fx('Double bed', 'furn/bedDouble*1.2', -2.6, -8.3, 's', null, [['furn/pillow*1.4', -0.22, -0.42, 0.1, 0.4], ['furn/pillowBlue*1.4', 0.22, -0.42, -0.1, 0.4]]),
    d('Armchair', 'furn/loungeChair%carpet=e0a44a', -6.5, -6.5, Math.PI / 2, 1.4),
    up('Dining table', pw('DiningTable_Rect_01', -5.4, -5.4, 's')),
    up('Night stand', m('furn/cabinetBedDrawer', -3.45, -8.95, 0, 1.6), on('pw/Towel_Stack_01*1.4', -3.45, -8.95, 0.4)),
    d('Floor lamp', 'furn/lampRoundFloor', -4.4, -8.8, 0, 1.3),
    up('Dining chairs', pw('DiningChair_Padded_01', -5.4, -5.88, 's', { n: 2, spots: 0 }), pw('DiningChair_Padded_01', -6.0, -5.4, 'b', { spots: 0 }),
      pw('DiningChair_Padded_01', -4.8, -5.4, 'k', { spots: 0 })),
    up('Sideboard', pw('Sideboard_01', -1.5, -7.85, 'k'), on('pw/Pack_ToiletPaper_12_01*1.3', -1.5, -8.05, 0.43), on('pw/Pack_PaperTowel_6_01*1.3', -1.5, -7.65, 0.43)),
    perch('Bedroom rug', 'furn/rugRound%=e6b8a8', -2.6, -6.9, 0, 1.5),
    up('Washer and dryer', pw('Washer_Front_01', -3.65, -5.2, 's'), pw('Dryer_Front_01', -3.3, -5.2, 's'), on('pw/Bottle_Laundry_01*1.5', -3.3, -5.2, 0.48), on('pw/Detergent_Jug_Blue_01*1.3', -3.65, -5.2, 0.48)),
    d('Bookcase', 'furn/bookcaseOpenLow', -6.75, -8.85, 0, 2.2),
    perch('Bed lamp', 'furn/lampRoundTable', -3.45, -8.95, 0.38, 1.3),
    up('Fridge', pw('Fridge_FrenchDoor_01', -2.5, -5.2, 's')),
    up('Newspaper rack', pw('NewspaperRack_01', -4.7, -6.5, 'b')),
    d('Potted palm', 'furn/pottedPlant', -6.75, -5.75, 0, 1.3),
    mat('Dining rug', -6.3, -4.5, -6.2, -4.85, 0xd8c3a5),
    d('Side table', 'furn/sideTableDrawers', -4.3, -9.1, 0, 1.5),
    up('Runner rug', pw('Rug_Runner_01', -1.7, -6.9, 'b', { spots: 0 })),
    d('Corner lamp', 'furn/lampSquareFloor', -5.0, -5.95, 0, 1.3),
    perch('Shelf plant', 'furn/plantSmall1', -6.75, -8.85, 0.79, 2),
    up('Range', pw('Range_Gas_01', -1.8, -5.2, 's')),
    perch('Table lamp', 'furn/lampSquareTable', -4.3, -9.1, 0.52, 1.3)
  ], [SIGN, up('Home desk', till(-1.5, -6.0, 'k'), { staff: [-1.0, -6.0, 'k'] }),
    up('Entertainment center', ['furn/cabinetTelevisionDoors', -6.2, -4.95, 's', null, [['furn/televisionModern*1.15', 0, -0.03, 0, 0.45]]]), lights([[-5.2, -6.8], [-2.9, -6.8]]), HELP,
    up('Wardrobe', { sign: 'gold' }, pw('KitCab_Tall_Pantry_10', -1.5, -8.85, 'k'))])
};

var CARS = ['toy/vehicle-suv*0.2', 'toy/vehicle-racer*0.2', 'toy/vehicle-truck*0.2', 'toy/vehicle-speedster*0.2', 'toy/vehicle-monster-truck*0.2', 'toy/vehicle-vintage-racer*0.2'];
var DOLLS = [XM + 'nutcracker*0.22', XM + 'gingerbread-man*0.45', XM + 'gingerbread-woman*0.45', XM + 'snowman*0.25'];
var PLUSH = ['pets/animal-cat*1.1', 'pets/animal-dog*1.0', 'pets/animal-fish*1.4', XM + 'reindeer*0.3'];
AREAS.toys = {
  cx: -4.1, cz: -10.5, vacant: [-6.9, -1.25, -11.7, -9.3], sign: [-3.2, -11.45, 1.6],
  floor: [{ poly: rbox(-6.9, -1.25, -11.7, -9.3, 0.5), finish: 0xe6dff3 }],
  ups: ups([
    up('Toy car shelf', pw('Gondola_Island_10', -6.05, -10.6, 's', { spots: 2, on: shelfGoods(CARS, 2, { turn: Math.PI / 2 }) })),
    up('Monster truck end', pw('Gondola_EndCap_Low_10', -6.65, -10.6, 'k', { on: shelfGoods(CARS.slice(2), 2, { zs: [0.03], ys: [0.15, 0.55, 0.95], turn: Math.PI / 2 }) })),
    up('Block table', pw('Table_Promo_Tiered_01', -5.25, -10.6, 's', { on: tierGoods(TBOX) })),
    fx('Claw machine', 'arcade/claw-machine', -7.6, -10.15, 'k'),
    up('Doll pegs', pw('Gondola_Island_Peg_10', -4.45, -10.6, 's', { spots: 2, on: pegGoods(DOLLS, 0.16, { xs: [-0.22, 0.22] }) })),
    up('Board game shelf', pw('Gondola_Island_10', -3.65, -10.6, 's', { spots: 2, on: shelfGoods(TBOX, 3) })),
    fx('Gacha machine', 'shop/gacha-machine', -7.6, -11.05, 'k'),
    up('Puzzle pegs', pw('Gondola_Island_Peg_10', -2.85, -10.6, 's', { spots: 2, on: pegGoods(TBOX, 0.09) })),
    up('Plush table', pw('Table_Promo_Tiered_01', -2.05, -10.6, 's', { on: tierGoods(PLUSH) })),
    up('Toy tower end', pw('Gondola_EndCap_10', -1.45, -10.6, 'b', { on: shelfGoods([XM + 'present-a-cube*0.35', XM + 'present-b-round*0.35'], 2, { zs: [0.03] }) })),
    perch('Toy racer', 'toy/vehicle-racer*0.4', -6.05, -10.6, 0.92),
    perch('Nutcracker doll', XM + 'nutcracker*0.4', -4.45, -10.6, 0.92),
    perch('Toy truck', 'toy/vehicle-truck*0.45', -3.7, -10.6, 0.92),
    perch('Plush cat', 'pets/animal-cat*2.2', -2.85, -10.6, 0.92),
    board('Toy sale board', 'TOY SALE', -6.8, -9.5, 0.9),
    perch('Block tower', TBOX[1], -5.25, -10.72, 0.475),
    mat('Play mat', -6.5, -5, -11.75, -10.65, 0xf2c6d8),
    perch('Monster truck', 'toy/vehicle-monster-truck*0.4', -2.95, -10.6, 0.92),
    perch('Toy snowman', XM + 'snowman*0.3', -6.05, -10.5, 0.92),
    perch('Puzzle box', TBOX[4], -3.55, -10.6, 0.92),
    perch('Toy train', XM + 'train-locomotive*0.45', -1.45, -10.6, 0.92),
    perch('Toy reindeer', XM + 'reindeer*0.3', -2.05, -10.72, 0.475),
    board('Kids board', 'KIDS CORNER', -6.8, -11.2, 0.9),
    mat('Game mat', -3.9, -2.4, -10.35, -9.25, 0xe8d9f4)
  ], [SIGN, counter('Toy desk', -0.85, -9.8, 'k', -0.4, -9.8),
    up('Present tower', on(XP[0], -6.65, -10.6, 0.72, 1.6), on(XP[1], -6.65, -10.6, 1.04, 1.3, 0.4)), lights([[-5, -10.6], [-2.8, -10.6]]), HELP,
    up('Giant plush', { sign: 'gold' }, on('pets/animal-dog*3', -4.45, -10.6, 0.92))])
};

var BOOKS = ['furn/books', 'furn/books*1.2', TBOX[0], 'furn/books', TBOX[2], 'furn/books*1.2', TBOX[4], 'furn/books'];
var REAMS = CARTON.map(function (r) { return r + '*0.4'; });
AREAS.office = {
  cx: -4.1, cz: -12.8, vacant: [-6.9, -1.25, -13.9, -11.7], sign: [-3.2, -13.65, 2.2],
  floor: [{ poly: rbox(-6.9, -1.25, -13.9, -11.7, 0.5), finish: 0xe3dccf }],
  ups: ups([
    up('Novel shelf', pw('Gondola_Island_10', -6.05, -12.8, 's', { spots: 2, on: shelfGoods(BOOKS, 3) })),
    up('Book end', pw('Gondola_EndCap_Low_10', -6.65, -12.8, 'k', { on: shelfGoods(BOOKS.slice(1), 3, { zs: [0.03], ys: [0.15, 0.55, 0.95] }) })),
    up('Cookbook shelf', pw('Gondola_Island_Low_10', -5.25, -12.8, 's', { spots: 2, on: shelfGoods(BOOKS.slice(2), 3, { ys: [0.15, 0.55, 0.95] }) })),
    up('Study table', pw('Table_Promo_Tiered_01', -7.6, -12.45, 'k', { on: [['furn/laptop*1.0', -0.12, 0.1, 0.2, 0.225], ['furn/lampSquareTable', 0.15, -0.05, 0, 0.35], ['furn/books', 0.1, 0.12, 0.4, 0.225]] })),
    up('Kids book shelf', pw('Gondola_Island_10', -4.45, -12.8, 's', { spots: 2, on: shelfGoods(BOOKS.slice(3), 3) })),
    up('Notebook pegs', pw('Gondola_Island_Peg_10', -3.65, -12.8, 's', { spots: 2, on: pegGoods(BOOKS, 0.1) })),
    up('Computer table', pw('Table_Promo_Tiered_01', -7.6, -13.2, 'k', { on: [['furn/computerScreen*0.8', 0, -0.12, 0, 0.475], ['furn/computerKeyboard*0.9', 0, 0, 0, 0.35]] })),
    up('Pen pegs', pw('Gondola_Island_Peg_10', -2.85, -12.8, 's', { spots: 2, on: pegGoods(BAG.map(function (r) { return r + '*0.5'; }), 0.1) })),
    up('Paper shelf', pw('Gondola_Island_10', -2.05, -12.8, 's', { spots: 2, on: shelfGoods(REAMS, 2) })),
    up('Magazine rack', pw('NewspaperRack_01', -1.45, -12.8, 'b')),
    perch('Book stack', 'furn/books', -6.15, -12.8, 0.92, 1.6),
    perch('Desk lamp', 'furn/lampSquareTable', -5.25, -12.8, 0.72, 1.4),
    perch('Desk speaker', 'furn/speakerSmall', -5.95, -12.8, 0.92, 1.2, 0.3),
    perch('Office plant', 'furn/plantSmall1', -4.45, -12.8, 0.92, 2),
    perch('Paper boxes', CARTON[3] + '*0.6', -2.1, -12.8, 0.92, 1.1),
    perch('Radio', 'furn/radio', -4.3, -12.8, 0.92, 1.3, 0.2),
    perch('Globe light', 'furn/lampRoundTable', -3.65, -12.8, 0.92, 1.4),
    perch('Pencil box', TBOX[2], -2.8, -12.8, 0.92, 1.1),
    board('Paper deal', 'PAPER 2 FOR 5', -6.8, -12.3, 0.9),
    mat('Reading mat', -6.5, -5, -12.55, -11.45, 0xd9cdb8),
    board('Back to school', 'BACK TO SCHOOL', -6.8, -13.5, 1.0),
    perch('Boombox', 'furn/speaker*0.5', -1.45, -12.8, 0.55),
    perch('Laptop display', 'furn/laptop*1.3', -3.5, -12.8, 0.92, 1.2, 0.3),
    perch('Office mouse', 'furn/computerMouse*1.6', -5.5, -12.8, 0.72)
  ], [SIGN, counter('Book desk', -0.85, -12.0, 'k', -0.4, -12.0),
    up('Bestsellers', on('furn/books*3', -6.65, -12.8, 0.72), on('furn/books*3', -6.62, -12.8, 0.99, 1, 0.3), on('furn/books*3', -6.66, -12.8, 1.26, 1, 1)), lights([[-5, -12.8], [-2.8, -12.8]]), HELP,
    up('Big monitor', { sign: 'gold' }, on('furn/computerScreen*2', -2.85, -12.8, 0.92))])
};

var HAM = 'tool/hammer-';
var HAMS = ['simple', 'plastic', 'rectangle', 'ouch', 'bangpop', 'smallhit', 'cool', 'kindathor'].map(function (h) { return HAM + h + '*0.55'; });
var TINS = TIN.map(function (r) { return r + '*0.7'; });
// tools hung on a slatwall rack on the north line: [model, across, height] in the panel's frame, rows from the top
function slatRack(name, x, list) {
  return up(name, pw('Slatwall_Panel_10', x, -15.9, 's', { on: list.map(function (t) { return [t[0], t[1], 0.08, 0, t[2]]; }) }));
}
// a crate of fasteners on an island's top
function partsBin(name, x, ref, bits) {
  var out = [name, on('pw/PartsBin_01*1.8', x, -14.6, 0.92)];
  bits.forEach(function (b) { out.push(on(ref, x + b[0], -14.6 + b[1], 0.97, 1, b[2])); });
  return up.apply(null, out);
}
function hung(x, y, ref, k) {
  return [ref + '*' + (k * 1.25).toFixed(2), x, y];
}
AREAS.tools = {
  cx: -4.1, cz: -15.0, vacant: [-6.9, -1.25, -16.1, -13.9], sign: [-3.2, -15.85, 1.9],
  floor: [{ poly: rbox(-6.9, -1.25, -16.1, -13.9, 0.5), finish: 0xe2e2dc }],
  ups: ups([
    up('Hammer pegs', pw('Gondola_Island_Peg_10', -6.05, -14.6, 's', { spots: 2, on: pegGoods(HAMS, 0.2, { xs: [-0.22, 0.22] }) })),
    up('Hammer end', pw('Gondola_EndCap_Low_10', -6.65, -14.6, 'k', { on: shelfGoods([HAM + 'bangpop~x*0.8', HAM + 'smallhit~x*0.8'], 2, { zs: [0.03], ys: [0.15, 0.55, 0.95] }) })),
    up('Paint shelf', pw('Gondola_Island_10', -5.25, -14.6, 's', { spots: 2, on: shelfGoods(TINS.concat(['tool/brush~x']), 2, { ys: [0.15, 0.55, 0.95, 1.35] }) })),
    up('Workbench', pw('Workbench_Wood_01', -7.6, -14.35, 'k', { on: [[HAM + 'plastic~x*0.8', -0.1, 0.06, 0.5, 0.46], ['tool/saw-small-highcount~x*0.7', 0.2, -0.05, 0.1, 0.46], ['tool/brush~x', -0.25, 0.0, 0.3, 0.46]] })),
    up('Fastener shelf', pw('Gondola_Island_10', -4.45, -14.6, 's', { spots: 2, on: shelfGoods(['pw/BoltTray_01', TBOX[0], 'tool/bolt-s*2', TBOX[3], 'tool/nut-l*2', 'tool/bolt-s*2'], 2) })),
    up('Hand tool pegs', pw('Gondola_Island_Peg_10', -3.65, -14.6, 's', { spots: 2, on: pegGoods(['tool/pliers-dull*0.6', 'tool/screwdriver-poke*0.6', 'tool/pliers-sharp*0.6', 'tool/screwdriver-slap*0.6'], 0.18, { xs: [-0.22, 0.22] }) })),
    up('Tool chest', pw('ToolChest_Roller_01', -7.6, -15.3, 'k', { on: [['tool/brush~x', 0, 0, 0.6, 0.43]] })),
    up('Bucket shelf', pw('Gondola_Island_10', -2.85, -14.6, 's', { spots: 2, on: shelfGoods(['surv/bucket*0.75', TINS[3], TBOX[3], TINS[1]], 2) })),
    up('Tape and glue shelf', pw('Gondola_Island_Low_10', -2.05, -14.6, 's', { spots: 2, on: shelfGoods([TINS[2], TBOX[5], 'surv/bucket*0.6', CARTON[2] + '*0.5'], 3, { ys: [0.15, 0.55, 0.95] }) })),
    up('Axe and pick end', pw('Gondola_EndCap_10', -1.45, -14.6, 'b', { on: shelfGoods(['tool/axe~x*0.7', 'tool/cylinder-long~x*0.7'], 2, { zs: [0.03] }) })),
    partsBin('Bolt bin', -4.45, 'tool/bolt-l~x*1.3', [[-0.08, 0, 0.3], [0.03, 0.03, -0.6], [0.08, -0.03, 1.2]]),
    up('Paint tin', on('pw/PaintCan_01*1.4', -5.25, -14.6, 0.92), on(TINS[1], -5.1, -14.55, 0.92, 1.3)),
    slatRack('Mallet rack', -5.25, [hung(-0.15, 0.3, HAM + 'kindathor', 0.55), hung(0, 0.3, HAM + 'ouch', 0.55), hung(0.15, 0.3, HAM + 'rocket', 0.55),
      hung(-0.15, 0.03, HAM + 'beemboom', 0.55), hung(0, 0.03, HAM + 'cool', 0.55), hung(0.15, 0.03, HAM + 'rectangle', 0.55)]),
    slatRack('Plier rack', -4.45, [hung(-0.15, 0.3, 'tool/pliers-dull', 0.6), hung(0, 0.3, 'tool/pliers-sharp', 0.6), hung(0.15, 0.3, 'tool/pliers-dull', 0.6),
      hung(-0.16, 0.03, 'tool/screwdriver-poke', 0.7), hung(-0.05, 0.03, 'tool/screwdriver-slap', 0.7), hung(0.05, 0.03, 'tool/screwdriver-poke', 0.7), hung(0.16, 0.03, 'tool/screwdriver-slap', 0.7)]),
    board('Tool deal', 'TOOLS 20% OFF', -6.5, -13.98, 1.0),
    perch('Primer tin', TINS[3], -2.85, -14.6, 0.92, 1.5),
    partsBin('Nail bin', -2.05, 'tool/nail-l~x*1', [[-0.08, -0.02, 0.5], [0.02, 0.03, -0.3], [0.08, -0.02, 1.4]]),
    board('Paint deal', 'PAINT 2 FOR 30', -6.8, -15.8, 1.0),
    up('Brush pot', on('surv/bucket*0.8', -6.0, -14.6, 0.92, 1.2), on('tool/brush*0.8', -6.04, -14.6, 1.0), on('tool/brush*0.8', -5.96, -14.62, 1.0)),
    slatRack('Claw hammer rack', -3.65, [hung(-0.15, 0.3, HAM + 'simple', 0.55), hung(0, 0.3, HAM + 'plastic', 0.55), hung(0.15, 0.3, HAM + 'simple', 0.55),
      hung(-0.15, 0.03, HAM + 'plastic', 0.55), hung(0, 0.03, HAM + 'simple', 0.55), hung(0.15, 0.03, HAM + 'plastic', 0.55)]),
    slatRack('Hand saw rack', -2.85, [hung(0, 0.4, 'tool/saw-big', 0.6), hung(0, 0.25, 'tool/saw-small-highcount', 0.7), hung(0, 0.03, 'tool/saw-precision', 0.6)]),
    partsBin('Nut bin', -3.65, 'tool/nut-l*2.2', [[-0.08, 0, 0], [0.06, 0.03, 0.4]]),
    mat('Workshop mat', -6.5, -5, -14.55, -13.45, 0xd0d0c6),
    slatRack('Axe and crowbar rack', -2.05, [hung(-0.1, 0.03, 'tool/axe', 0.8), hung(0.1, 0.25, 'tool/crowbar~z', 0.7), hung(0.1, 0.03, 'tool/cylinder-long~z', 0.7)])
  ], [SIGN, counter('Tool desk', -0.85, -14.2, 'k', -0.4, -14.2),
    slatRack('Tool wall', -6.05, [hung(-0.15, 0.3, HAM + 'simple', 0.55), hung(-0.05, 0.3, HAM + 'plastic', 0.55), hung(0.05, 0.3, HAM + 'rectangle', 0.55), hung(0.15, 0.3, HAM + 'ouch', 0.55),
      hung(-0.15, 0.03, HAM + 'bangpop', 0.55), hung(-0.05, 0.03, HAM + 'smallhit', 0.55), hung(0.05, 0.03, HAM + 'cool', 0.55), hung(0.15, 0.03, 'tool/axe', 0.45)]),
    lights([[-5, -14.6], [-2.8, -14.6]]), HELP,
    up('Lumber rack', { sign: 'gold' }, pw('Shelving_HD_Loaded_01', -0.9, -15.3, 'k'))])
};

// something of the kitchen kit standing on a lane gondola, at slot i of the run (two to a gondola)
function kt(name, ref, i, k) {
  var x = -5.35 + Math.floor(i / 2) * 0.5 + (i % 2 ? 0.12 : -0.12);
  return perch(name, 'pw/' + ref + '*' + (k || 1.6), x, -17.2, 0.7);
}
AREAS.kitchen = {
  cx: -4.1, cz: -17.2, vacant: [-6.9, -1.25, -18.3, -16.1], sign: [-3.2, -18.05, 2.2],
  floor: [{ poly: rbox(-6.9, -1.25, -18.3, -16.1, 0.5), finish: 0xdcebd5 }],
  ups: ups((function () {
    var u = pwrun([gond('Pot gondola', 'Gondola_Island_Low_10'), gond('Pan gondola', 'Gondola_Island_Low_10'), gond('Plate gondola', 'Gondola_Island_Low_10'),
      gond('Bowl gondola', 'Gondola_Island_Low_10'), gond('Mug gondola', 'Gondola_Island_Low_10'), gond('Glass gondola', 'Gondola_Island_Low_10')], -5.6, -17.2, 's', 1);
    return [u[0],
      up('Knife end cap', pw('Gondola_EndCap_10', -5.75, -17.2, 'k', { stock: 1 })),
      u[1],
      up('Display range', pw('Range_Gas_01', -7.6, -16.75, 'k')),
      u[2], u[3],
      up('Display sink', pw('KitCab_Base_Sink_10', -7.6, -17.65, 'k'), pw('KitTop_Sink_10', -7.6, -17.65, 'k', { y: 0.44, spots: 0 })),
      u[4], u[5],
      up('Pan end cap', pw('Gondola_EndCap_10', -2.45, -17.2, 'b', { stock: 1 })),
      kt('Coffee maker', 'CoffeeMaker_Drip_01', 0), kt('Toaster', 'Toaster_01', 1), kt('Blender', 'Blender_01', 2), kt('Microwave', 'Microwave_Counter_01', 3, 1.1),
      board('Cookware deal', 'COOKWARE SALE', -6.8, -16.6, 1.0),
      kt('Knife block', 'KnifeBlock_01', 4), kt('Plate stack', 'Plate_Stack_01', 5), board('Kitchen sale', 'KITCHEN SALE', -6.8, -18.0, 1.0),
      kt('Stand mixer', 'StandMixer_01', 6), kt('Cast iron pan', 'Pan_CastIron_01', 7, 1.2), kt('Mixing bowls', 'MixingBowls_01', 8, 1.4),
      kt('Mug tree', 'MugTree_01', 9), kt('Pitcher', 'Pitcher_01', 10),
      mat('Cook mat', -6.5, -5, -16.75, -15.65, 0xd3e4cc)];
  })(), [SIGN, up('Kitchen desk', till(-0.85, -16.4, 'k'), { staff: [-0.4, -16.4, 'k'] }),
    up('Pot tower', on('pw/Pot_Stock_01*1.5', -5.75, -17.2, 0.9), on('pw/Pot_Sauce_01*1.5', -5.75, -17.2, 1.08, 1, 0.4), on('pw/Pan_Frying_01*1.5', -5.75, -17.2, 1.22)),
    lights([[-5, -17.2], [-2.8, -17.2]]), HELP,
    up('Big pot', { sign: 'gold' }, on('pw/Pot_Stock_01*2.2', -4.1, -17.2, 0.7))])
};

// what stands in the front, the stockroom and outside from the first day: the same entries as an upgrade, plus
//   { slab: [x0, x1, z0, z1, y, h], c }   paint or paving of one colour
//   { lamp: ref, x, z, r }                a street lamp that lights at night
//   { light: [[x, z]...] }                light falling on the floor at night
// a board without post is hung flat at its height; with r it turns about y
function bd(text, x, z, w, h, y, r) {
  return { text: text, x: x, z: z, r: r || 0, y: y, w: w, h: h };
}
// a corral of nested carts, n is how many fit of the old row
function carts(x, z, n) {
  return [{ m: 'pw/CartCorral_Outdoor_30', x: x + 0.75, z: z, flat: 1 }, { m: 'pw/ShoppingCart_Nested_3_01', x: x + 0.4, z: z, r: Math.PI / 2, flat: 1 },
    { m: 'pw/ShoppingCart_Nested_3_01', x: x + 1.1, z: z, r: Math.PI / 2, flat: 1 }];
}
// a row of n things along x or z with the given gap
function line(n, x, z, dx, dz, f) {
  var out = [];
  for (var i = 0; i < n; i++) out.push(f(x + dx * i, z + dz * i, i));
  return out;
}
function cat() {
  return Array.prototype.concat.apply([], arguments);
}
// a cabinet of a colour, from the floor up
function cab(x, z, w, d, h, c) {
  return { box: [x - w / 2, x + w / 2, z - d / 2, z + d / 2, 0, h], c: c };
}
function det(x0, x1, z0, z1, y0, y1, c) {
  return { box: [x0, x1, z0, z1, y0, y1], c: c, flat: 1 };
}
function hi(x0, x1, z0, z1, y0, y1, c) {
  return { box: [x0, x1, z0, z1, y0, y1], c: c };
}

var DECOR = {};

// z 2.2 is the inside face of the glass front; the entrances are open from x -11 to -8 and 8 to 11
DECOR.front = cat([
  { patch: rbox(-10.9, -8.1, 0.9, 1.95, 0.25), finish: 0x8791ad },
  { patch: rbox(8.1, 10.9, 0.9, 1.95, 0.25), finish: 0x8791ad },
  { patch: rbox(-7.4, 7.4, -1.25, 1.35, 0.3), finish: 0xc4cad8 },
  { light: [[-9.5, 1.0], [9.5, 1.0], [-9.5, -1.6], [9.5, -1.6], [-3, 1.5], [3, 1.5]] },
  { text: 'CHECKOUT', x: 0, z: -1.35, r: 0, y: 1.75, w: 2.0, h: 0.5, post: true },
  tx('WELCOME\nHOME & MORE', -7.6, 1.0, 1.0, 0.95),
  tx('WELCOME\nGROCERY', 11.7, 0.25, 1.0, 0.95),
  ['end', 7.5, 0.5, 'b', ['food/lollypop', 'food/candy-bar-wrapper']],
  // a bank machine at each side of the glass, and a pair of benches under the planters between
  cab(-7.7, 2.0, 0.4, 0.35, 0.6, 0x3c63a8), det(-7.88, -7.52, 1.82, 1.84, 0.34, 0.54, 0xbdeaff), det(-7.88, -7.52, 1.82, 1.88, 0.26, 0.3, 0x2b2f3d),
  cab(6.9, 2.0, 0.4, 0.35, 0.6, 0x3c63a8), det(6.72, 7.08, 1.82, 1.84, 0.34, 0.54, 0xbdeaff), det(6.72, 7.08, 1.82, 1.88, 0.26, 0.3, 0x2b2f3d),
  { m: 'sub/planter', x: -2.9, z: 1.95, k: 0.6 }, { m: 'nature/plant_bushLarge', x: -2.9, z: 1.95, y: 0.4, k: 1.1, flat: 1 },
  { m: 'sub/planter', x: 2.9, z: 1.95, k: 0.6 }, { m: 'nature/plant_bushLarge', x: 2.9, z: 1.95, y: 0.4, k: 1.1, flat: 1 },
  { m: 'furn/bench', x: -0.9, z: 2.0, r: Math.PI, k: 1.5 }, { m: 'furn/bench', x: 0.9, z: 2.0, r: Math.PI, k: 1.5 },
  { m: 'arcade/claw-machine', x: 3.75, z: 2.0, r: Math.PI }, { m: 'pw/VendingMachine_Drink_01', x: 4.35, z: 2.0, r: Math.PI },
  { m: 'pw/VendingMachine_Snack_01', x: -3.6, z: 2.0, r: Math.PI }, { m: 'arcade/claw-machine', x: -4.25, z: 2.0, r: Math.PI },
  // a floor sign at each entrance and a scrubber parked by the wall
  { m: 'roads/construction-cone', x: -8.3, z: 0.6, k: 0.7 }, { m: 'roads/construction-cone', x: 8.3, z: 0.6, k: 0.7 }
]);

// the stockroom: z -22.5 to -28.5, the lane for the stockers along z -23.45, dock doors in the north wall
var DOCKS = [-10.5, -4.5, 4.5, 10.5];
DECOR.stock = cat(
  [{ slab: [-14.5, 14.5, -22.9, -22.82], c: 0xf2c230 }, { slab: [-14.5, 14.5, -24.1, -24.02], c: 0xf2c230 },
    { light: [[-10.5, -25.5], [-4.5, -25.5], [0, -25.5], [4.5, -25.5], [10.5, -25.5], [-12.5, -23.5], [12.5, -23.5]] }],
  DOCKS.map(function (d) { return { slab: [d - 1.3, d + 1.3, -27.6, -27.54], c: 0xf2c230 }; }),
  DOCKS.map(function (d) { return { slab: [d - 1.3, d - 1.24, -28.2, -27.6], c: 0xf2c230 }; }),
  DOCKS.map(function (d) { return { slab: [d + 1.24, d + 1.3, -28.2, -27.6], c: 0xf2c230 }; }),
  DOCKS.map(function (d, i) { return bd('DOCK ' + (i + 1), d, -28.17, 0.8, 0.2, 0.84); }),
  [bd('RECEIVING', 0, -28.17, 1.6, 0.36, 0.6), bd('EMPLOYEES ONLY', -12.2, -28.17, 1.4, 0.3, 0.6)],
  // loads waiting between the docks, a jack or a cart at each dock, roll cages by the west wall and drums on the east side
  [pw('PalletLoad_Cases_01', -7.7, -26.3, 0.1, { spots: 0 }), pw('PalletLoad_Water_01', -6.9, -26.3, -0.1, { spots: 0 }), pw('PalletLoad_Cases_01', -0.8, -26.4, 0.05, { spots: 0 }),
    pw('PalletLoad_Water_01', 0.2, -26.4, 0, { spots: 0 }), pw('PalletLoad_Cases_01', 1.2, -26.4, -0.1, { spots: 0 }), pw('PalletLoad_Water_01', 7.5, -26.4, 0.1, { spots: 0 }),
    pw('PalletLoad_Cases_01', 8.3, -26.3, 0, { spots: 0 })],
  [pw('PalletJack_01', -9.2, -25.9, 0.3, { spots: 0 }), pw('UBoat_Cart_01', -3.0, -25.9, -0.2, { spots: 0 }), pw('FlatCart_15', 3.0, -25.8, 0.1, { spots: 0 }),
    pw('PalletJack_01', 9.2, -25.9, -0.4, { spots: 0 }), pw('RollCage_Loaded_01', -12.1, -25.6, 0.2, { spots: 0 }), pw('RollCage_01', -11.6, -25.5, -0.3, { spots: 0 }),
    pw('JanitorCart_01', -14.2, -24.15, 0, { spots: 0 }), pw('FloorScrubber_01', 14.0, -24.15, Math.PI, { spots: 0 })],
  [{ m: 'surv/barrel', x: 11.9, z: -25.6 }, { m: 'surv/barrel', x: 12.3, z: -25.6 }, { m: 'surv/barrel', x: 12.1, z: -25.25 }, { m: 'surv/barrel', x: 12.5, z: -25.25 }],
  // a forklift: body, counterweight, cage, mast and forks
  [hi(-2.65, -2.15, -26.9, -26.3, 0.06, 0.3, 0xf2c230), hi(-2.65, -2.15, -27.1, -26.9, 0.06, 0.36, 0x3a3d4a), hi(-2.65, -2.15, -26.75, -26.45, 0.55, 0.58, 0x3a3d4a),
    hi(-2.64, -2.61, -26.7, -26.5, 0.3, 0.55, 0x3a3d4a), hi(-2.19, -2.16, -26.7, -26.5, 0.3, 0.55, 0x3a3d4a),
    hi(-2.6, -2.2, -26.28, -26.23, 0.06, 0.7, 0x50566a), hi(-2.58, -2.52, -26.25, -25.8, 0.06, 0.1, 0x8d93a6), hi(-2.28, -2.22, -26.25, -25.8, 0.06, 0.1, 0x8d93a6)],
  // the lockers on the west wall
  line(4, 0, -26.9, 0, 0.42, function (x, z, i) { return cab(-14.5, z, 0.36, 0.38, 0.72, [0x4a6fa5, 0x5b8a5b, 0xb5574b, 0x8a6bb0][i]); }),
  // bales and bins by the baler
  [pw('CardboardBale_01', 11.55, -27.0, 's', { spots: 0, on: [['pw/CardboardBale_01', 0, 0, 0, 0.5]] }), pw('CardboardBale_01', 11.55, -26.2, 's', { spots: 0 }),
    cab(14.3, -27.3, 0.4, 0.4, 0.45, 0x3f7a4a), cab(14.3, -27.9, 0.4, 0.4, 0.45, 0x3c63a8)]
);

// the apron in front of the glass (z 2.8 to 4), the near sidewalk and street, the tire bay, the service road and the yard
var WHEELS = ['car/wheel-dark', 'car/wheel-default', 'car/wheel-racing'];
DECOR.out = cat(
  carts(-6.7, 3.35), carts(5.9, 3.35), carts(-14.45, 3.35), carts(13.2, 3.35),
  [tx('CARTS', -7.4, 3.35, 0.6, 0.5), tx('CARTS', 8.1, 3.35, 0.6, 0.5)],
  [{ m: 'furn/bench', x: -12.6, z: 3.15, k: 1.5 }, { m: 'furn/bench', x: 12.6, z: 3.15, k: 1.5 }, { m: 'furn/bench', x: -3.7, z: 3.15, k: 1.5 },
    { m: 'furn/bench', x: 3.7, z: 3.15, k: 1.5 }],
  [-2.4, 2.4, 16.4].map(function (x, i) { return { m: 'sub/planter', x: x, z: 3.45, k: 0.55, flat: 1 }; }),
  [-2.4, 2.4, 16.4].map(function (x, i) { return { m: 'nature/plant_bush', x: x, z: 3.45, y: 0.3, k: 1.1, flat: 1 }; }),
  [-4.9, 4.9, -11.4, 11.4].map(function (x) { return pw('TrashCan_Outdoor_01', x, 3.2, 's', { spots: 0 }); }),
  [pw('PropaneCage_01', -11.7, 3.35, 's', { spots: 0 }), pw('IceChest_Outdoor_01', 11.7, 3.35, 's', { spots: 0 })],
  [-11.2, -7.8, 7.8, 11.2].map(function (x) { return pw('BollardCover_01', x, 3.85, 's', { spots: 0 }); }),
  // the bus shelter, a hydrant, a mailbox and bins on the near sidewalk, hedges along the far one
  [hi(-23.0, -21.0, 9.65, 10.35, 0.8, 0.84, 0x50566a), hi(-23.0, -22.96, 9.65, 9.69, 0, 0.8, 0x50566a), hi(-21.04, -21.0, 9.65, 9.69, 0, 0.8, 0x50566a),
    hi(-23.0, -21.0, 9.65, 9.68, 0.2, 0.8, 0xbfe6f2), hi(-23.0, -22.96, 10.31, 10.35, 0, 0.8, 0x50566a), hi(-21.04, -21.0, 10.31, 10.35, 0, 0.8, 0x50566a),
    { m: 'furn/bench', x: -22.0, z: 9.95, k: 1.5, flat: 1 }, tx('BUS', -20.4, 10.2, 0.5, 0.7)],
  [cab(-14.0, 10.15, 0.14, 0.14, 0.3, 0xc8402f), cab(14.0, 10.15, 0.14, 0.14, 0.3, 0xc8402f), cab(-16.5, 10.15, 0.22, 0.3, 0.4, 0x3f6fb5),
    pw('TrashCan_Outdoor_01', -12.0, 10.1, 's', { spots: 0 }), pw('TrashCan_Outdoor_01', 12.0, 10.1, 's', { spots: 0 })],
  line(40, -43, 14.85, 2.2, 0, function (x, z, i) { return { m: 'nature/plant_bush', x: x, z: z, r: i, flat: 1 }; }),
  // the tire bay: a car at the door, tires stacked and in a rack, drums, a bench and the sign
  [{ m: 'car/sedan', x: -19.2, z: -17, r: Math.PI / 2 }, { m: 'surv/workbench', x: -16.3, z: -14.6, k: 2, r: 3.14 }, cab(-16.3, -14.9, 0.3, 0.2, 0.3, 0xc8402f),
    { m: 'surv/barrel', x: -16.0, z: -19.4, k: 1.3 }, { m: 'surv/barrel', x: -16.4, z: -19.4, k: 1.3 }, { m: 'surv/barrel', x: -16.2, z: -19.8, k: 1.3 },
    tx('TIRE & LUBE', -19.2, -13.5, 1.5, 1.1)],
  line(4, -21.7, -19.3, 0, 0, function (x, z, i) { return { m: WHEELS[i % 3] + '~z', x: x, z: z, y: i * 0.18, flat: 1 }; }),
  line(3, -21.15, -19.3, 0, 0, function (x, z, i) { return { m: WHEELS[(i + 1) % 3] + '~z', x: x, z: z, y: i * 0.18, flat: 1 }; }),
  line(2, -21.7, -18.75, 0, 0, function (x, z, i) { return { m: WHEELS[(i + 2) % 3] + '~z', x: x, z: z, y: i * 0.18, flat: 1 }; }),
  line(5, -21.6, -14.5, 0.2, 0, function (x, z, i) { return { m: WHEELS[i % 3], x: x, z: z, r: Math.PI / 2, flat: 1 }; }),
  // the service road: centre dashes, edge lines, lamps, and bays marked at each dock
  line(18, 24.8, 8.5, 0, -2, function (x, z) { return { slab: [x - 0.03, x + 0.03, z - 0.5, z + 0.5, 0.02, 0.01], c: 0xf2c230 }; }),
  [{ slab: [23.15, 23.2, -38, 9.5, 0.02, 0.01], c: 0xf4f2ea }, { slab: [26.3, 26.35, -38, 9.5, 0.02, 0.01], c: 0xf4f2ea }],
  DOCKS.map(function (d) { return { slab: [d - 1.2, d - 1.15, -38, -29.5, 0.02, 0.01], c: 0xf4f2ea }; }),
  DOCKS.map(function (d) { return { slab: [d + 1.15, d + 1.2, -38, -29.5, 0.02, 0.01], c: 0xf4f2ea }; }),
  [[22.9, 4, 0], [22.9, -10, 0], [22.9, -24, 0], [-10, -39.2, Math.PI], [0, -39.2, Math.PI], [12, -39.2, Math.PI], [-26.6, 0, 0], [-26.6, -14, 0]].map(function (q) {
    return { lamp: 'roads/light-curved', x: q[0], z: q[1], r: q[2] };
  }),
  // the yard: staff cars, a fenced pallet cage and bins
  [{ m: 'car/sedan', x: -16, z: -36.2, r: Math.PI }, { m: 'car/hatchback-sports', x: -14.6, z: -36.2, r: Math.PI }, { m: 'car/suv', x: -13.2, z: -36.2, r: Math.PI },
    { m: 'car/van', x: -11.8, z: -36.2, r: Math.PI }],
  line(7, 14.5, -31.2, 1.0, 0, function (x, z) { return { m: 'forest/fence', x: x, z: z, flat: 1 }; }),
  line(7, 14.5, -35.2, 1.0, 0, function (x, z) { return { m: 'forest/fence', x: x, z: z, flat: 1 }; }),
  line(3, 14.0, -31.9, 0, 1.0, function (x, z) { return { m: 'forest/fence', x: x, z: z, r: Math.PI / 2, flat: 1 }; }),
  line(3, 21.0, -31.9, 0, 1.0, function (x, z) { return { m: 'forest/fence', x: x, z: z, r: Math.PI / 2, flat: 1 }; }),
  [['stock', 15.6, -32.4, 's', 'boxes'], ['stock', 16.5, -32.4, 's', 'boxes'], ['stock', 18.5, -33.0, 's', 'boxes'], ['stock', 19.6, -34.2, 's', 'boxes'],
    ['stock', 15.8, -34.2, 's', 'boxes']],
  [cab(-20.2, -31.4, 0.7, 0.45, 0.45, 0x3f7a4a), cab(-20.2, -32.1, 0.7, 0.45, 0.45, 0x3c63a8), cab(-20.2, -32.8, 0.7, 0.45, 0.45, 0x8d93a6)]
);

// The east wing: four rooms along the east wall, x 15.3 to 21.5 inside, the store's wall at x 15 and the wing's own at
// x 21.8. Customer service and the Restrooms open from the front band of the sales floor through a doorway in the wall at
// z 1; the break room and the head office are reached from the stockroom by a door at z -23. Each room is a place whose
// levels are the ups below; visit lists the spots where a shopper stands and the piece that has to be in for it.
// walls between the rooms stay low so the camera sees in
function low(x0, x1, z0, z1) {
  return [hi(x0, x1, z0, z1, 0, 0.3, 0xa9aebd), det(x0, x1, z0, z1, 0.3, 0.35, 0x7f8597)];
}
function room(x0, x1, z0, z1, finish) {
  return { patch: [[x0, z1], [x1, z1], [x1, z0], [x0, z0]], finish: finish };
}
// a wall piece of Pipework, stuck to a wall and raised to hang at the height of a person's chest
function wp(name, x, z, face, y) {
  return pw(name, x, z, face, { spots: 0, y: y });
}

// a low partition between two toilet stalls
function stall(x) {
  return { box: [x - 0.02, x + 0.02, -7.9, -6.95, 0, 0.5], c: 0xb9c6d4 };
}

var WING = {
  serv: {
    rect: [15.3, 21.5, -3, 2.4],
    visit: [[18.3, -1.2, Math.PI, 0], [19.3, -1.2, Math.PI, 4]],
    ups: [
      up('Service desk', pw('ServiceDesk_20', 18.3, -1.8, 's', { spots: 0 })),
      up('Clerk', { staff: [18.3, -2.4, 's'] }),
      up('Queue posts', pw('QueuePost_Pair_01', 18.8, -0.35, 's', { spots: 0 })),
      up('Waiting chairs', pw('Chair_Metal_Cafe_01', 21.15, 1.3, 'k', { spots: 0 }), pw('Chair_Metal_Cafe_01', 21.15, 0.7, 'k', { spots: 0 }), pw('Chair_Metal_Cafe_01', 21.15, 0.1, 'k', { spots: 0 })),
      up('Second desk', pw('ServiceDesk_20', 19.3, -1.8, 's', { spots: 0 })),
      up('Second clerk', { staff: [19.3, -2.4, 's'] }),
      up('Returns kiosk', pw('Kiosk_Cash_01', 20.7, -2.45, 's', { spots: 0 })),
      up('Floor sign', pw('SignStand_Floor_01', 17.9, 1.6, 's', { spots: 0 })),
      up('Waiting table', pw('Table_Four_01', 19.9, 0.9, 's', { spots: 0 }), pw('Planter_Tall_01', 21.1, 1.9, 's', { spots: 0 }))
    ]
  },
  rest: {
    rect: [15.3, 21.5, -8, -3],
    visit: [[16.35, -4.2, -Math.PI / 2, 2], [16.35, -4.8, -Math.PI / 2, 2], [16.35, -5.4, -Math.PI / 2, 2], [17.2, -6.55, Math.PI, 0]],
    ups: [
      up('Two toilet stalls', pw('Toilet_01', 17.2, -7.55, 's', { spots: 0 }), pw('Toilet_02', 17.82, -7.55, 's', { spots: 0 }), stall(16.89), stall(17.51), stall(18.13)),
      up('Two more stalls', pw('Toilet_01', 18.44, -7.55, 's', { spots: 0 }), pw('Toilet_02', 19.06, -7.55, 's', { spots: 0 }), stall(18.75), stall(19.37)),
      up('A row of sinks with mirrors', pw('Vanity_Sink_01', 15.75, -4.2, 'b', { spots: 0 }), pw('Vanity_Sink_01', 15.75, -4.8, 'b', { spots: 0 }), pw('Vanity_Sink_01', 15.75, -5.4, 'b', { spots: 0 }),
        wp('MirrorCabinet_01', 15.32, -4.2, 'b', 0.42), wp('MirrorCabinet_01', 15.32, -4.8, 'b', 0.42), wp('MirrorCabinet_01', 15.32, -5.4, 'b', 0.42)),
      up('Two more stalls', pw('Toilet_01', 19.68, -7.55, 's', { spots: 0 }), pw('Toilet_02', 20.3, -7.55, 's', { spots: 0 }), stall(19.99), stall(20.61)),
      up('Urinals', wp('Urinal_01', 21.48, -4.2, 'k', 0.22), wp('Urinal_01', 21.48, -4.8, 'k', 0.22), wp('Urinal_01', 21.48, -5.4, 'k', 0.22)),
      up('Soap and paper towels', wp('SoapDispenser_01', 15.4, -4.5, 'b', 0.42), wp('SoapDispenser_01', 15.4, -5.1, 'b', 0.42), wp('PaperTowel_Dispenser_01', 15.32, -6.0, 'b', 0.45), wp('PaperTowel_Dispenser_01', 15.32, -6.5, 'b', 0.45)),
      up('Bins and a plant', pw('WasteBin_01', 15.75, -6.9, 'b', { spots: 0 }), pw('WasteBin_01', 21.15, -6.3, 'k', { spots: 0 }), pw('Planter_Tall_01', 21.1, -7.4, 's', { spots: 0 })),
      up('A mop bucket and a wet floor sign', pw('MopBucket_01', 20.9, -3.6, 'k', { spots: 0 }), pw('WetFloorSign_01', 20.3, -3.75, 's', { spots: 0 }))
    ]
  },
  lounge: {
    rect: [15.3, 21.5, -14, -8],
    ups: [
      up('Fridge', pw('Fridge_TopFreezer_01', 21.15, -8.7, 'k', { spots: 0 })),
      up('Sink counter', pw('KitCab_Base_Sink_10', 21.25, -9.4, 'k', { spots: 0, on: [['pw/KitTop_10', 0, 0, 0, 0.44], ['pw/Kettle_Electric_01', 0.1, 0, 0, 0.48]] })),
      up('Coffee counter', pw('KitCab_Base_Door_10', 21.25, -9.9, 'k', { spots: 0, on: [['pw/KitTop_10', 0, 0, 0, 0.44], ['pw/CoffeeMaker_Drip_01', -0.1, 0, 0, 0.48], ['pw/MugTree_01', 0.12, 0, 0, 0.48]] })),
      up('Table and chairs', pw('DiningTable_Rect_01', 17.9, -11.3, 's', { spots: 0 }), pw('DiningChair_Padded_01', 17.5, -11.95, 's', { spots: 0 }), pw('DiningChair_Padded_01', 18.3, -11.95, 's', { spots: 0 }),
        pw('DiningChair_Padded_01', 17.5, -10.65, 'n', { spots: 0 }), pw('DiningChair_Padded_01', 18.3, -10.65, 'n', { spots: 0 })),
      up('Pizza boxes', on('pizza/pizza-box-closed', 17.65, -11.25, 0.375), on('pizza/pizza-box-closed', 17.65, -11.25, 0.41, 1, 0.3), on('pizza/pizza-box-opened', 18.3, -11.3, 0.375, 1, 0.2),
        on('pizza/pizza-pepperoni', 18.3, -11.3, 0.41, 0.7)),
      up('Staff on break', { staff: [20.35, -9.7, 'b'] }),
      up('A second table', pw('DiningTable_Rect_01', 19.9, -12.6, 's', { spots: 0 }), pw('DiningChair_Padded_01', 19.5, -13.25, 's', { spots: 0 }), pw('DiningChair_Padded_01', 20.3, -13.25, 's', { spots: 0 }),
        pw('DiningChair_Padded_01', 19.5, -11.95, 'n', { spots: 0 }), pw('DiningChair_Padded_01', 20.3, -11.95, 'n', { spots: 0 })),
      up('Lockers', pw('EmployeeLockers_3_01', 15.5, -9.2, 'b', { spots: 0 }), pw('EmployeeLockers_3_01', 15.5, -10.1, 'b', { spots: 0 }), pw('EmployeeLockers_3_01', 15.5, -11.0, 'b', { spots: 0 })),
      up('Second staff member', { staff: [18.3, -10.7, 'n', 'sit'] }),
      up('A rug, a clock and a first aid box', on('pw/Rug_Runner_01', 17.9, -11.3, 0.05), wp('WallClock_Kitchen_01', 15.32, -12.6, 'b', 0.6), wp('TimeClock_Wall_01', 15.32, -13.1, 'b', 0.6),
        wp('FirstAid_Box_Wall_01', 15.32, -13.6, 'b', 0.6), pw('RecycleBin_Dual_01', 21.15, -13.3, 'k', { spots: 0 }))
    ]
  },
  head: {
    rect: [15.3, 21.5, -28.2, -14],
    ups: [
      up('Desk and chair', pw('Workbench_Wood_01', 19.0, -25.4, 's', { spots: 0 }), pw('Chair_Metal_Cafe_01', 19.0, -24.5, 'n', { spots: 0 }), pw('ShopStool_Rolling_01', 19.0, -26.05, 's', { spots: 0 })),
      up('Computer', on('furn/computerScreen', 18.7, -25.4, 0.45, 0.9), on('furn/computerKeyboard', 19.05, -25.15, 0.45, 0.9)),
      up('Manager', { staff: [19.0, -26.05, 's', 'sit'] }),
      up('Filing cabinets', pw('GarageCab_Tall_05', 20.4, -27.9, 's', { spots: 0, n: 4 })),
      up('Safe', pw('SafetyCabinet_01', 16.3, -27.8, 's', { spots: 0 })),
      up('Meeting table', pw('Table_Four_01', 18.6, -18.6, 's', { spots: 0, n: 2 }), pw('Chair_Metal_Cafe_01', 18.2, -19.25, 's', { spots: 0 }), pw('Chair_Metal_Cafe_01', 19.0, -19.25, 's', { spots: 0 }),
        pw('Chair_Metal_Cafe_01', 18.2, -17.95, 'n', { spots: 0 }), pw('Chair_Metal_Cafe_01', 19.0, -17.95, 'n', { spots: 0 })),
      up('Whiteboard', wp('Menu_Board_Wall_01', 15.32, -18.6, 'b', 0.35)),
      up('Two more desks', pw('Table_Four_01', 20.9, -21.6, 'k', { spots: 0 }), on('furn/laptop', 20.9, -21.6, 0.375, 0.9, -Math.PI / 2), pw('ShopStool_Rolling_01', 21.2, -21.6, 'k', { spots: 0 }),
        pw('Table_Four_01', 20.9, -22.8, 'k', { spots: 0 }), on('furn/computerScreen', 20.9, -22.8, 0.375, 0.9, -Math.PI / 2), pw('ShopStool_Rolling_01', 21.2, -22.8, 'k', { spots: 0 })),
      up('Shelving', pw('Shelving_HD_01', 15.6, -16.0, 'b', { spots: 0, n: 2 })),
      up('Rug and plants', on('pw/Floor_Carpet_1m', 18.1, -18.35, 0.05), on('pw/Floor_Carpet_1m', 18.6, -18.35, 0.05), on('pw/Floor_Carpet_1m', 19.1, -18.35, 0.05),
        on('pw/Floor_Carpet_1m', 18.1, -18.85, 0.05), on('pw/Floor_Carpet_1m', 18.6, -18.85, 0.05), on('pw/Floor_Carpet_1m', 19.1, -18.85, 0.05),
        pw('Planter_Tall_01', 21.1, -15.0, 's', { spots: 0 }), pw('Planter_Tall_01', 21.1, -19.5, 's', { spots: 0 }))
    ]
  }
};

DECOR.wing = cat(
  [room(15.3, 21.5, -2.9, 2.2, 'lino'), room(15.3, 21.5, -7.9, -3.1, 'tile'), room(15.3, 21.5, -13.9, -8.1, 'boards'), room(15.3, 21.5, -28.2, -14.1, 'carpet')],
  // dividers: a door at the west end of the first and the third
  low(15.3, 15.9, -3.1, -2.9), low(17.1, 21.5, -3.1, -2.9), low(15.3, 21.5, -8.1, -7.9), low(15.3, 15.9, -14.1, -13.9), low(17.1, 21.5, -14.1, -13.9),
  [{ light: [[18.4, 0], [18.4, -5.5], [18.4, -11], [18.4, -17], [18.4, -23], [18.4, -27]] }]
);

export var PLAN = {
  // the sales floor, the stockroom behind it, stock doors in the wall between and dock doors in the north wall
  hall: [-15, 15, -22.5, 2.5], stock: [-15, 15, -28.5, -22.5],
  doors: [-8.5, -0.5, 8.5], docks: [-10.5, -4.5, 4.5, 10.5],
  // two entrances in the glass front, each with a basket stack and a greeter just inside
  entrances: [{ x: -9.5, w: 3, name: 'HOME & MORE', basket: [-10.65, 1.8], greeter: [-11.25, 1.75, Math.PI / 2] },
    { x: 9.5, w: 3, name: 'GROCERY', basket: [8.35, 1.8], greeter: [7.75, 1.75, Math.PI / 2] }],
  tireBay: { z: -17, w: 3 },
  // the checkout bank runs from bank.x, its counters on bank.z; shoppers cross the front aisle at cross
  bank: { x: -6.75, z: 0.5, cross: -2.3, exit: 1.3 },
  // what each Checkouts level adds besides tills: [level, model, x, z, turn], carts as a row of five
  front: [[2, 'carts', -14.0, 1.9], [2, 'carts', -7.0, 1.9], [2, 'carts', 5.0, 1.9], [2, 'carts', 11.6, 1.9],
    [4, 'pw/TrashRecycle_Station_01', 13.4, 2.1, Math.PI], [4, 'pw/TrashRecycle_Station_01', 14.0, 2.1, Math.PI],
    [8, 'pw/VendingMachine_Drink_01', -14.3, 1.95, Math.PI], [8, 'pw/VendingMachine_Snack_01', -13.75, 1.95, Math.PI], [8, 'pw/VendingMachine_Drink_01', -13.2, 1.95, Math.PI],
    [8, 'pw/NewspaperRack_01', -12.5, 1.95, Math.PI], [10, 'pw/DiningBench_01', -6.1, 1.95, Math.PI], [10, 'pw/Planter_Tall_01', -7.0, 1.95, 0], [10, 'pw/Planter_Tall_01', -5.15, 1.95, 0]],
  desk: { x: 11.55, z: 0.9, n: 2 },
  // the stockroom: where stockers wait, by the stock doors
  idle: [0.7, -7, 8.5, -10, -1.7, 7, -8.5, 10].map(function (x) { return [x, -23.8]; }),
  decor: DECOR,
  wing: WING,
  areas: AREAS,
  order: Object.keys(AREAS)
};

// a clothing rail: a peg gondola with a hanging rod of shirts on each face
function rail(name, x, z, face) {
  return up(name, pw('Gondola_Island_Peg_10', x, z, face, { on: [['pw/HangingRod_Wall_10', 0, 0.02, 0, 0.42], ['pw/HangingRod_Wall_10', 0, -0.02, Math.PI, 0.42]] }));
}

// a mannequin in front of a slatwall panel
function dummy(name, x, z) {
  var u = fx(name, 'shop/mannequin', x, z, Math.PI / 2);
  u.piece.push(pw('Slatwall_Panel_10', x - 0.25, z, 'b', { spots: 0 }));
  return u;
}

function tent(name, x, z) {
  var u = fx(name, 'surv/tent-canvas', x, z, 's');
  u.piece.push(pw('Slatwall_Panel_10', x, z - 0.36, 's', { spots: 0 }));
  return u;
}

// a row of oil on a shelf step
function oil(y) {
  return [['pw/OilJug_01', -0.14, 0.1, 0, y, 2], ['pw/OilBottle_01', 0, 0.1, 0, y, 2.4], ['pw/OilJug_01', 0.14, 0.1, 0, y, 2]];
}
