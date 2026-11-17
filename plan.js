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
    up('Pumpkin barrel', pw('ProduceBin_Round_01', 14.25, -0.9, 'k', { on: [['food/pumpkin', -0.05, 0.03, 0, 0.13], ['food/pumpkin', 0.07, -0.04, 1, 0.13], ['food/pumpkin', 0, 0.02, 2, 0.28]] })),
    tbl('Avocado table', 10.7, -5.7, 'b', ['Avocados', 'Avocados', 'Bananas', 'Avocados', 'Avocados', 'Avocados']),
    board('Price chalkboard', 'APPLES 99c', 12.3, -3.2, 1.0),
    up('Watermelon bin', pw('ProduceBin_Round_01', 13.9, -5.7, 'k', { on: [['food/watermelon', -0.07, 0.04, 0, 0.17], ['food/watermelon', 0.07, 0.03, 1, 0.17], ['food/watermelon', 0, -0.07, 2, 0.17]] })),
    tbl('Carrot table', 13.9, -6.7, 'k', ['Carrots', 'Carrots', 'Potatoes', 'Carrots', 'Onions', 'Carrots']),
    up('Tiered stand', pw('ProduceStand_Tiered_10', 10.7, -6.7, 'b', { stock: 1 })),
    up('Orange barrel', pw('ProduceBin_Round_01', 13.9, -7.7, 'k', { on: [['food/orange', -0.08, 0.04, 0, 0.3], ['food/orange', 0.06, 0.06, 1, 0.3], ['food/orange', 0.02, -0.07, 2, 0.3], ['food/orange', -0.05, -0.05, 3, 0.3]] })),
    up('Wire bin', pw('DumpBin_Wire_01', 10.7, -7.7, 'b', { stock: 1 })),
    up('Flower stand', pw('FlowerStand_01', 13.9, -8.7, 'k')),
    tbl('Lettuce table', 10.7, -8.7, 'b', ['Lettuce', 'Lettuce', 'Lettuce', 'Onions', 'Lettuce', 'Lettuce']),
    up('Melon barrel', pw('ProduceBin_Round_01', 14.3, -0.1, 'k', { stock: 'Melons' })),
    tbl('Orange table', 10.7, -9.7, 'b', ['Oranges', 'Oranges', 'Oranges', 'Lemons', 'Oranges', 'Oranges']),
    up('Berry bin', pw('DumpBin_Wire_01', 13.9, -9.7, 'k', { stock: 1 })),
    board('Local farm sign', 'LOCAL FARM', 12.3, -7.2, 1.0),
    up('Basket stack', pw('Basket_Stack_01', 12.16, -8.93, 'b', { spots: 0 })),
    up('Case pallet', pw('PalletLoad_Cases_01', 12.67, -9, 0.6, { spots: 0 })),
    up('Bench', pw('DiningBench_01', 9.78, -3.1, 'b', { spots: 0 })),
    up('Tall planter', pw('Planter_Tall_01', 14.15, -1.63, 0, { spots: 0 }))
  ], [SIGN, clerk(12.3, -9.95, 's'),
    up('Fruit island', pw('ProduceTable_15', 12.3, -6.4, 'b', { stock: 'Apples' })),
    lights([[12.2, -4.0], [12.2, -7.4]]), HELP,
    up('Showcase', { sign: 'gold' }, pw('ProduceTable_15', 13.1, -0.55, 's', { stock: 'Apples' }))])
};

// bakery: cases along the east wall facing the lane, bread racks opposite, ovens behind the counter
function rack(name, z, a, b) {
  return up(name, ['shelf', 10.9, z, 'b', [a, b]]);
}
// something standing on top of a fixture that is already there
function top(name, ref, x, z, y, k) {
  return up(name, { m: ref, x: x, z: z, r: 0, k: k || 1, y: y, flat: 1 });
}
AREAS.bakery = {
  cx: 12.2, cz: -12.3, vacant: [9.7, 14.7, -14.4, -10.4], sign: [11.7, -10.9, 1.9],
  floor: [{ poly: rbox(9.7, 14.7, -14.3, -10.4, 0.9), finish: 0xf0d9aa }],
  ups: ups([
    up('Donut case', ['chest', 13.1, -11.3, 'k', ['food/donut-sprinkles', 'food/muffin', 'food/donut-chocolate']]),
    up('Baguette basket', ['crate', 13.1, -12.15, 'k', ['food/loaf-baguette']]),
    rack('Bread rack', -11.2, [['food/loaf', 'food/loaf-round'], ['food/loaf-baguette', 'food/loaf']], [['food/croissant', 'food/bread'], ['food/loaf-round', 'food/croissant']]),
    rack('Roll rack', -12.0, [['food/croissant', 'food/bread'], ['food/loaf', 'food/loaf-round']], [['food/bread', 'food/loaf-baguette'], ['food/croissant', 'food/loaf']]),
    up('Muffin case', ['chest', 13.1, -13.0, 'k', ['food/muffin', 'food/donut-sprinkles']]),
    up('Pie basket', ['crate', 13.1, -13.85, 'k', ['food/pie*0.55']]),
    rack('Bagel rack', -12.8, [['food/loaf-round', 'food/bread'], ['food/croissant', 'food/loaf']], [['food/loaf-baguette', 'food/croissant'], ['food/bread', 'food/loaf-round']]),
    rack('Sliced loaves', -13.6, [['food/bread', 'food/loaf'], ['food/loaf-round', 'food/croissant']], [['food/loaf', 'food/loaf-baguette'], ['food/croissant', 'food/bread']]),
    up('Cake case', ['coolerW', 14.45, -11.2, 'k', [['food/cake*0.75', 'food/cake-birthday*0.8'], ['food/pie*0.55', 'food/cake*0.75']], null, 1, 'staff']),
    up('Bread oven', ['furn/kitchenStove', 14.45, -13.5, 'k', [], null, 2, 'staff']),
    up('Pastry fridge', ['furn/kitchenFridgeLarge', 14.45, -12.3, 'k', null, null, 1, 'staff']),
    up('Prep cabinet', ['furn/kitchenCabinet', 13.62, -10.59, 's', null, [['food/bowl*0.6', 0, 0, 0, 0.405], ['food/rollingPin*0.6', 0, -0.1, 0.3, 0.405]], 3, 'staff']),
    top('Cake stand', 'food/cake*0.75', 13.1, -11.3, 0.34),
    top('Flour sacks', 'food/bag', 10.9, -13.6, 0.8, 1.2),
    top('Bread boxes', 'furn/cardboardBoxOpen', 10.9, -11.2, 0.8, 0.9),
    top('Warm lamp', 'furn/lampRoundTable', 10.9, -12.0, 0.8),
    top('Bakery plant', 'furn/plantSmall1', 10.9, -12.8, 0.8),
    top('Croissant display', 'food/croissant', 13.1, -13.85, 0.5),
    top('Bread tray', 'food/plate-rectangle*0.55', 13.1, -12.15, 0.5),
    board('Menu board', 'COFFEE 2.00', 10.6, -10.7, 0.9),
    up('Baking rug', { patch: rbox(11.5, 12.5, -13.8, -11.0, 0.3), finish: 0xd8b585 }),
    board('Fresh baked board', 'FRESH BAKED', 12.6, -10.55, 1.0),
    top('Coffee machine', 'furn/kitchenCoffeeMachine', 14.45, -12.3, 0.83),
    board('Cake sale board', 'CAKES 2 FOR 9', 9.95, -14.2, 0.9)
  ], [SIGN, clerk(13.85, -11.9, 'k'),
    up('Cake display', ['table', 11.5, -14.45, 's', ['food/cake*0.75', 'food/cake-birthday*0.8']]),
    lights([[11.8, -11.6], [11.8, -13.2]]), HELP,
    up('Showcase', { sign: 'gold' }, { m: 'food/cake-birthday*1.3', x: 14.45, z: -11.2, r: 0, k: 1, y: 0.9, flat: 1 })])
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
    [up('Can bin', pw('DumpBin_Wire_01', 1.9, -3.65, 0.1, { stock: 1 })), up('Flour table', pw('Table_Promo_Tiered_01', 8.2, -5.5, 'b', { stock: 1 })), board('Pantry sale board', 'SALE', 6.85, -6.37, 0.9),
      up('Jar table', pw('Table_Promo_Tiered_01', 8.2, -7.7, 'b', { stock: 1 })), up('Basket stack', pw('Basket_Stack_01', 8.2, -4.9, 'b', { spots: 0 })),
      up('Pasta bin', pw('DumpBin_Wire_01', 8.2, -6.6, 'b', { stock: 1 })), up('Bean table', pw('Table_Promo_Tiered_01', 8.2, -8.6, 'b', { stock: 1 })),
      up('Soup bin', pw('DumpBin_Wire_01', 0.8, -6.6, 'k', { stock: 1 }))]),
    [SIGN, clerk(7.6, -6.6, 'k'), up('Promo table', pw('Table_Promo_Tiered_01', 6.45, -6.6, 'b', { stock: 1 })), lights([[3, -6.6], [5.2, -6.6]]), HELP,
      up('Bulk bins', { sign: 'gold' }, pw('BulkBins_Gravity_10', 1.55, -6.6, 'b', {}))])
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
      ['Sports cooler', 'DrinkCooler_Upright_01', 0.325, { stock: 1 }], ['Mint spinners', 'SpinnerRack_01', 0.5, { stock: 1, n: 2 }]], 5.5, -12.1, 's'),
    [up('Chocolate end cap', pw('Gondola_EndCap_10', 5.68, -9.9, 'b', { stock: 1 })), up('Candy end cap', pw('Gondola_EndCap_10', 2.45, -9.9, 'k', { stock: 1 })),
      up('Cola end cap', pw('Gondola_EndCap_10', 5.68, -12.1, 'b', { stock: 1, on: tops([['Bottle_Soda_2L_01', -0.1, 0.9], ['Bottle_Soda_2L_01', 0, 0.9], ['Bottle_Soda_2L_01', 0.1, 0.9]]) })),
      up('Pretzel end cap', pw('Gondola_EndCap_10', 2.55, -12.1, 'k', { stock: 1 }))],
    [up('Soda table', pw('Table_Promo_Tiered_01', 3.6, -3.65, -0.1, { stock: 1, on: tops([['Can_Soda_6Pack_01', -0.15, 0.56], ['Can_Soda_6Pack_01', 0.15, 0.56]]) })),
      up('Water table', pw('Table_Promo_Tiered_01', 8.2, -9.6, 'b', { stock: 1, on: tops([['Bottle_Water_01', 0, 0.56]]) })), board('Drinks board', 'COLD DRINKS', 6.85, -10.77, 1.0),
      up('Juice table', pw('Table_Promo_Tiered_01', 8.2, -11.6, 'b', { stock: 1, on: tops([['Bottle_Juice_01', 0, 0.56]]) })), up('Chips bin', pw('DumpBin_Wire_01', 8.2, -10.5, 'b', { stock: 1 })),
      board('Cola deal', 'COLA 3 FOR 5', 6.85, -9.3, 0.9), board('Tea deal', 'TEA 2 FOR 4', 6.85, -11.5, 0.9), up('Candy table', pw('Table_Promo_Tiered_01', 8.2, -14.2, 'b', { stock: 1 }))]),
    [SIGN, clerk(7.6, -10.9, 'k'), up('Gum spinner', pw('SpinnerRack_01', 8.2, -13.2, 'b', { stock: 1 })), lights([[3, -11], [5.2, -11]]), HELP,
      up('Drink machine', { sign: 'gold' }, pw('VendingMachine_Drink_01', 6.4, -11.1, 'b'))])
};

var FISH = [['pets/animal-fish*2.2', 'pets/animal-fish*2.2'], ['pets/animal-fish*2.2', 'pets/animal-fish*2.2']];
function tank(name, x, ref) {
  return up(name, ['tank', x, -18.0, 's', [[ref, ref], [ref, ref]]]);
}
// a low fence ring on straw with the animal standing in it
function pen(name, x, ref) {
  var z = -17.85;
  return up(name, { patch: rbox(x - 0.5, x + 0.5, z - 0.5, z + 0.5, 0.1), finish: 0xe3cf8a }, m('forest/fence', x, z - 0.5), m('forest/fence', x, z + 0.5),
    m('forest/fence', x - 0.5, z, Math.PI / 2), m('forest/fence', x + 0.5, z, Math.PI / 2), { m: ref, x: x, z: z, r: 0.6, k: 1, y: 0, flat: 1 });
}
AREAS.pets = {
  cx: 4.05, cz: -15.8, vacant: [1.25, 6.9, -18.4, -13.2], sign: [4.0, -15.0, 1.6],
  floor: [{ poly: rbox(1.25, 6.9, -18.4, -13.2, 0.5), finish: 0xcfe4bf }],
  ups: ups(runs(
    row(2.05, -13.9, nm(['Dog food', 'Cat food', 'Puppy food', 'Kitten food', 'Dog treats', 'Cat treats'], [BAG[0], CAN[0], BAG[1], CAN[2], BAG[2], CAN[1], BAG[3], CAN[4], BAG[4], CAN[3]])),
    row(2.05, -16.1, nm(['Bird seed', 'Fish food', 'Litter shelf', 'Chew toys', 'Collars', 'Pet beds'], [BAG[5], BOX[1], BAG[0], BOX[2], CAN[2], BAG[2], BOX[5], BAG[3], CAN[0], BOX[3]])),
    (function () {
      var c = eastCaps([-13.9, -16.1], ['Treat end', 'Dog toy end', 'Catnip end', 'Leash end'],
        [[BAG[1], CAN[1]], [CAN[3], CAN[1]], [BAG[0], CAN[2]], [BAG[3], BAG[5]]]);
      c[1].piece.push({ m: 'pets/animal-dog*3', x: 1.45, z: -13.9, r: 1.57, k: 1, y: 1.05, flat: 1 });
      c[2].piece.push({ m: 'pets/animal-cat*2.5', x: 6.65, z: -16.1, r: -1.57, k: 1, y: 1.05, flat: 1 });
      return c;
    })(),
    [pal('Pet food pallet', 5.3, -3.65, 0.1, [BAG[4]]), tank('Fish tank', 1.9, 'pets/animal-fish*2.2'),
      pen('Puppy pen', 3.1, 'pets/animal-dog*2.5'), pen('Kitten pen', 4.4, 'pets/animal-cat*2.5'),
      board('Pet toys board', 'PET TOYS 2 FOR 5', 6.49, -14.66, 1.0), up('Pet rug', { patch: rbox(7.1, 8.5, -16.8, -15.2, 0.3), finish: 0xe6b8a8 }),
      d('Dog bed', 'furn/rugRound', 7.6, -17.4, 0, 1.2), up('Ball crate', ['crate', 0.9, -15.3, 'k', ['golf/ball-red', 'golf/ball-blue']])]),
    [SIGN, clerk(7.6, -15.0, 'k'), up('Adoption corner', ['table', 7.7, -13.5, 'k', [BAG[0], BAG[1]]], m('pets/animal-dog*3', 7.6, -13.0, 0.5, 1)), lights([[3, -15], [5.2, -15]]), HELP,
      up('Showcase', { sign: 'gold' }, ['tank', 5.5, -18.0, 's', FISH], ['tank', 6.4, -18.0, 's', FISH])])
};

// the power wall: coolers along the back wall, low open freezers as islands in front of them
function wall(names, kind, x0, goods) {
  return names.map(function (n, i) { return f(n, kind, x0 + i, -21.96, 's', goods[i % goods.length]); });
}
function island(names, kind, x0, goods) {
  return names.map(function (n, i) { return f(n, kind, x0 + i, -19.7, 's', goods[i % goods.length]); });
}
var DAIRYG = [[[MILK[0], MILK[1]], [MILK[2], MILK[0]]], [[SMALL[0], 'food/pudding'], [MILK[3], SMALL[1]]], [['flat:food/egg', 'flat:food/egg'], [MILK[1], MILK[4]]],
  [['food/pudding', SMALL[3]], [MILK[0], MILK[2]]], [[MILK[4], MILK[3]], ['flat:food/egg', SMALL[0]]], [[MILK[2], MILK[1]], ['food/pudding', SMALL[1]]],
  [[SMALL[2], MILK[0]], [MILK[3], 'flat:food/egg']]];
AREAS.dairy = {
  cx: 4.0, cz: -21.0, vacant: [0.1, 8.0, -22.2, -18.9], sign: [4.0, -20.5, 1.8],
  floor: [{ poly: rbox(0.1, 7.9, -21.7, -19.5, 0.5), finish: 0xc2dcf2 }],
  ups: ups([].concat(
    wall(['Milk cooler', 'Yogurt cooler', 'Egg cooler', 'Pudding cooler', 'Cream cooler', 'Butter cooler', 'Juice cooler'], 'coolerW', 1, DAIRYG),
    island(['Cheese bunker', 'Dessert bunker', 'Dip bunker', 'Spread bunker', 'Sour cream bunker', 'Snack cheese'], 'bunker', 1.5,
      [['food/cheese*0.6'], [SMALL[2]], ['food/pudding'], [SMALL[3]], [SMALL[1]], ['food/cheese*0.6']]),
    [board('Fresh dairy board', 'FRESH DAIRY', 4.0, -18.9, 1.1), d('Dairy bin', 'furn/trashcan', 6.18, -20.81, 0, 1.5), d('Dairy plant', 'furn/pottedPlant', 0.26, -18.69, 0, 1),
      d('Hand truck', 'shop/hand-truck', 8.12, -21.42, 1.2), pal('Juice box pallet', 8.5, -19.35, 0.1, [SMALL[0], SMALL[2]]), d('Stock cartons', 'furn/cardboardBoxClosed', 8.37, -18.69, 0.5, 1.1),
      d('Dairy cart', 'shop/shopping-cart', 0.75, -20.8, 0.3), d('Basket stack', 'shop/shopping-basket', -0.22, -19.08, 0.2),
      board('Milk deal', 'MILK 2 FOR 6', 7.0, -18.9, 1.0), mat('Dairy mat', 1.4, 2.9, -21.0, -19.9, 0xd7e6f6), board('Cheese deals', 'CHEESE 2 FOR 5', 2.4, -18.9, 1.0)]),
    [SIGN, clerk(7.6, -20.5, 'k'), f('Cheese display', 'bunker', 7.5, -19.5, 's', ['food/cheese*0.6']), lights([[2.5, -20.6], [5.5, -20.6]]), HELP,
      up('Showcase', { sign: 'gold' }, ['bunker', 0.6, -19.7, 's', ['food/cheese*0.6', SMALL[2]]])])
};

AREAS.frozen = {
  cx: -4.5, cz: -21.0, vacant: [-8.0, -1.0, -22.2, -18.9], sign: [-4.5, -20.5, 1.8],
  floor: [{ poly: rbox(-7.9, -1.1, -21.7, -19.5, 0.5), finish: 0xafcdee }],
  ups: ups([].concat(
    wall(['Ice cream cooler', 'Pizza cooler', 'Veg cooler', 'Popsicle cooler', 'Dinner cooler', 'Fries cooler'], 'cooler', -7,
      [[['food/ice-cream-cup', SMALL[1]], [PIZZA[0], 'food/bag-flat']], [[SMALL[2], 'food/ice-cream-cup'], ['food/bag-flat', PIZZA[1]]],
        [['food/ice-cream-cup', SMALL[0]], ['food/popsicle', PIZZA[1]]], [['food/popsicle', 'food/ice-cream-cup'], [SMALL[3], 'food/popsicle-chocolate']],
        [[PIZZA[0], 'food/bag-flat'], [SMALL[2], 'food/ice-cream-cup']], [['food/popsicle-chocolate', SMALL[1]], ['food/bag-flat', PIZZA[0]]]]),
    island(['Ice cream chest', 'Pizza chest', 'Pops chest', 'Bagged veg chest', 'Waffle chest'], 'chest', -6.5,
      [['food/ice-cream-cup', 'food/popsicle'], [PIZZA[1]], [SMALL[3]], ['food/bag-flat'], ['food/ice-cream-cup']]),
    [board('Ice cream deal', 'ICE CREAM 2 FOR 6', -2.9, -18.9, 1.1), d('Frozen bin', 'furn/trashcan', -5.9, -20.8, 0, 1.5), d('Frozen plant', 'furn/pottedPlant', -8.18, -18.47, 0, 1),
      d('Frozen cart', 'shop/shopping-cart', -7.1, -20.35, 0.4), board('Pizza deal', 'PIZZA 3 FOR 10', -6.3, -18.9, 1.0), d('Basket stack', 'shop/shopping-basket', -2.55, -20.82, 0.2),
      d('Empty crates', 'furn/cardboardBoxOpen', -4.65, -20.84, 0.3, 1.1), board('Frozen veg deal', 'FROZEN VEG 4 FOR 5', -4.6, -18.9, 1.1),
      up('Ice chest', ['chest', -7.0, -18.95, 's', ['food/bag-flat']]), board('Frozen specials', 'FROZEN SPECIALS', -2.4, -21.35, 1.0), d('Dolly', 'shop/hand-truck', -3.6, -20.84, 0.2), board('Bagged ice deal', 'BAGGED ICE 2 FOR 5', -1.1, -18.85, 1.0), mat('Cold floor mat', -3.4, -1.8, -20.9, -19.9, 0xc7dcf0)]),
    [SIGN, clerk(-1.5, -20.5, 'k'), f('Ice cream island', 'chest', -1.52, -19.55, 's', ['food/ice-cream-cup', 'food/popsicle']), lights([[-6, -20.6], [-3, -20.6]]), HELP,
      up('Showcase', { sign: 'gold' }, ['chest', -7.4, -19.7, 's', [PIZZA[1], SMALL[3]]])])
};

var MEATG = [[['food/turkey*0.6', 'food/whole-ham*0.7'], ['food/sausage', 'food/hot-dog-raw']], [['food/meat-raw', 'food/meat-patty'], ['food/bacon-raw', 'food/meat-ribs']],
  [['food/fish~z*0.8', 'food/mussel'], ['food/meat-sausage', 'food/sausage']], [['food/meat-ribs', 'food/bacon-raw'], ['food/meat-patty', 'food/whole-ham*0.7']]];
function deli(name, z, goods) {
  return f(name, 'chest', 13.1, z, 'k', goods);
}
AREAS.meat = {
  cx: 12.0, cz: -18.4, vacant: [9.7, 14.7, -22.2, -14.4], sign: [12.0, -20.5, 2.2],
  floor: [{ poly: rbox(9.7, 14.7, -18.4, -14.4, 0.6), finish: 0xf2ddd8 }, { poly: rbox(9.1, 14.7, -21.7, -19.5, 0.4), finish: 0xf2ddd8 }],
  ups: ups([].concat(
    [deli('Beef case', -15.0, ['food/meat-raw']), deli('Rib case', -15.85, ['food/meat-ribs']), deli('Sausage case', -16.7, ['food/meat-sausage']), deli('Fish case', -17.55, ['food/fish~z*0.8'])],
    wall(['Turkey cooler', 'Burger cooler', 'Seafood cooler', 'Rib cooler', 'Ham cooler'], 'coolerR', 10, MEATG),
    [up('Meat fridge', ['furn/kitchenFridge', 14.45, -15.5, 'k', null, null, 2, 'staff']),
      up('Deli prep cabinet', ['furn/kitchenCabinet', 13.44, -20.37, 'k', null, [['food/cutting-board*0.6', 0, 0, 0.2, 0.405], ['food/knife-block*0.6', 0.1, -0.1, 0, 0.405]], 3, 'staff']),
      up('Slicer counter', ['furn/kitchenCabinet', 9.69, -15.97, 's', null, [['food/knife-block*0.6', 0, 0, 0, 0.405]], 3, 'staff']),
      up('Bacon chest', ['chest', 11.3, -15.3, 'k', ['food/bacon-raw']]), up('Ham chest', ['chest', 11.3, -16.3, 'k', ['food/whole-ham*0.7']]),
      up('Sausage chest', ['chest', 11.3, -17.3, 'k', ['food/hot-dog-raw']]), board('Deli board', 'FRESH DELI', 12.5, -14.7, 1.0),
      up('Meat floor', { patch: rbox(10.2, 12.6, -17.8, -14.6, 0.3), finish: 0xe9c9c2 }), d('Brine barrel', 'surv/barrel', 9.85, -14.83, 0, 1.3),
      up('Butcher block', m('furn/table', 9.9, -18.0, 0, 1.2), { m: 'food/cutting-board*0.8', x: 9.8, z: -18.0, r: 0.4, k: 1, y: 0.35, flat: 1 }, { m: 'food/knife-block*0.6', x: 10.1, z: -17.9, r: 0, k: 1, y: 0.35, flat: 1 }), d('Meat boxes', 'furn/cardboardBoxClosed', 14.4, -18.1, 0.2, 1.1), d('Hand truck', 'shop/hand-truck', 14.4, -19.2, 0.6),
      board('Seafood deals', 'FISH 2 FOR 9', 12.21, -18.99, 1.0), d('Basket stack', 'shop/shopping-basket', 10.43, -20.42, 0.3), d('Ice bucket', 'surv/bucket', 14.4, -18.3, 0, 1.4)]),
    [SIGN, clerk(13.85, -16.2, 'k'), up('Meat island', ['chest', 11.59, -19.51, 's', [['food/meat-ribs'], ['food/bacon-raw']], null, 2]), lights([[11.8, -20.6], [13.5, -16.5]]), HELP,
      up('Showcase', { sign: 'gold' }, ['end', 9.5, -19.7, 'b', [['food/bottle-ketchup', 'food/bottle-musterd']]])])
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

AREAS.seasonal = {
  cx: -12.2, cz: -3.0, vacant: [-14.7, -9.7, -4.9, -0.3], sign: [-10.92, -3.9, 1.9],
  floor: [{ poly: rbox(-14.7, -9.7, -4.9, -0.3, 0.6), finish: 0xf1e2e2 }],
  ups: ups([
    up('Christmas tree', [XM + 'tree-decorated*0.6', -10.45, -1.2, 's']),
    up('Present table', ['table', -11.3, -2.75, 's', [XP[0], XP[1], XP[2]]]),
    unit('Ornament shelf', -13.8, -4.35, sf(XM + 'present-a-round*0.35', 'furn/lampRoundTable', XM + 'present-b-round*0.35', XM + 'sock-red*0.4')),
    cap('Candy cane end', -10.55, -4.35, 's', [XM + 'candy-cane-red*0.4', XM + 'candy-cane-green*0.4']),
    up('Train table', ['table', -12.5, -2.75, 's', [XM + 'train-locomotive*0.3', XM + 'train-wagon*0.3', XM + 'train-tender*0.3']]),
    unit('Stocking shelf', -13.0, -4.35, sf(XM + 'sock-green*0.4', XM + 'sock-red*0.4', XM + 'sock-red*0.4', XM + 'sock-green*0.4')),
    up('Snowman table', ['table', -13.7, -2.75, 's', null, [[XM + 'snowman*0.4', -0.2, 0, 0.3, 0.35], [XM + 'nutcracker*0.4', 0.15, 0.05, 0, 0.35], [XM + 'gingerbread-man*0.4', 0.33, 0.1, 0, 0.35]]]),
    unit('Gift wrap shelf', -12.2, -4.35, sf(XP[3], XP[4], XP[0], XP[2])),
    up('Spruce tree', ['nature/tree_pineRoundC*0.4', -11.45, -1.2, 's']),
    unit('Lantern shelf', -11.4, -4.35, sf('furn/lampSquareTable', XM + 'present-b-cube*0.35', 'furn/lampRoundTable', XM + 'present-a-round*0.35')),
    up('Pine tree', ['nature/tree_small*0.5', -12.45, -1.2, 's']),
    up('Sled stand', [XM + 'sled*0.45', -13.4, -1.2, 's']),
    perch('Wreath', XM + 'wreath-decorated*0.5', -13.0, -4.35, 0.8),
    mat('Snow patch', -14.3, -10.2, -1.7, -0.6, 0xf6f6fa),
    mat('Holiday rug', -13.9, -10.9, -3.3, -2.2, 0xcf8d8d),
    perch('Star lantern', 'furn/lampRoundTable', -11.4, -4.35, 0.8),
    d('Gift boxes', 'furn/cardboardBoxClosed', -14.55, -4.55, 0.3, 1.1),
    d('Holiday plant', 'furn/pottedPlant', -14.5, -1.9, 0, 0.9),
    perch('Candy cane', XM + 'candy-cane-red*0.5', -10.55, -4.35, 1.05),
    perch('Shelf snowman', XM + 'snowman*0.25', -13.0, -4.35, 0.8),
    d('Present pile', XP[1], -10.1, -0.55, 0.3, 1.3),
    perch('Shelf presents', XP[0], -12.2, -4.35, 0.8),
    d('Gingerbread', XM + 'gingerbread-man*0.4', -10.05, -3.2, 0.2, 1.2),
    perch('Stocking topper', XM + 'sock-red*0.5', -13.8, -4.35, 0.8)
  ], [SIGN, up('Gift counter', till(-9.95, -4.5, 'k'), { staff: [-9.5, -4.5, 'k'] }),
    up('Giant tree', ['nature/tree_fat*0.45', -14.15, -1.25, 's']),
    lights([[-13, -2.5], [-11.2, -3.2]]), HELP,
    up('Santa display', { sign: 'gold' }, { box: [-14.65, -14.25, -3.95, -3.1, 0, 0.08], c: 0xf6f6fa }, m(XM + 'sled*0.5', -14.45, -3.35, 0, 1, 0.08), m(XM + 'reindeer*0.4', -14.45, -3.75, 0, 1, 0.08))])
};

AREAS.clothes = {
  cx: -12.2, cz: -8.0, vacant: [-14.7, -9.7, -10.9, -5.0], sign: [-12.5, -10.3, 1.9],
  floor: [{ poly: rbox(-14.7, -9.7, -10.8, -5.1, 0.6), finish: 'carpet' }],
  ups: ups([
    fx('Shirt rack', RACK[0], -10.9, -5.9, 's'),
    fx('Tee table', 'table', -12.0, -5.9, 's', [TEE[0], TEE[1]]),
    fx('Window mannequin', 'shop/mannequin', -10.0, -5.9, Math.PI / 2),
    fx('Jacket rack', RACK[2], -13.1, -5.9, 's'),
    fx('Coat rack', RACK[3], -10.9, -7.4, 's'),
    fx('Sweater table', 'table', -14.2, -5.9, 's', [TEE[4], TEE[5]]),
    fx('Kids rack', RACK[1], -12.0, -7.4, 's'),
    fx('Suit mannequin', 'shop/mannequin', -10.0, -7.4, Math.PI / 2),
    fx('Denim table', 'table', -10.9, -8.9, 's', [TEE[3], TEE[6]]),
    fx('Sock table', 'table', -13.1, -7.4, 's', [TEE[2], TEE[0]]),
    fx('Skirt rack', RACK[2], -12.0, -8.9, 's'),
    fx('Hoodie rack', RACK[1], -13.1, -8.9, 's'),
    fx('Hoodie table', 'table', -14.2, -8.9, 's', [TEE[6], TEE[1]]),
    cap('Sneaker end', -10.6, -10.65, 's', [BOX[1], BOX[3]]),
    cap('Boot end', -11.4, -10.65, 's', [BOX[2], BOX[5]]),
    cap('Sandal end', -12.2, -10.65, 's', [BOX[4], BOX[0]]),
    cap('Slipper end', -13.0, -10.65, 's', [BOX[3], BOX[2]]),
    up('Fitting rooms', { box: [-14.7, -13.55, -10.8, -9.95, 0, 0.9], c: 0x8a7a68 }, { box: [-14.55, -13.7, -9.97, -9.93, 0.05, 0.85], c: 0xe9dcc4 }),
    up('Wall mirror', { box: [-14.7, -14.62, -9.5, -8.3, 0.1, 0.85], c: 0xb8d4e0 }),
    d('Kids mannequin', 'shop/mannequin*0.7', -14.4, -9.55, 0.3),
    d('Clothes plant', 'furn/pottedPlant', -14.4, -5.25, 0, 0.9),
    mat('Carpet runner', -13.3, -10.5, -7.15, -6.05, 0x6f84a8),
    d('Hanger boxes', 'furn/cardboardBoxOpen', -14.4, -6.5, 0.2, 1.2),
    d('Hat boxes', 'furn/cardboardBoxOpen', -9.95, -6.6, 0.2, 1.1)
  ], [SIGN, up('Cash wrap', till(-9.95, -10.35, 'k'), { staff: [-9.5, -10.35, 'k'] }),
    up('Window display', { box: [-14.65, -13.75, -8.0, -6.8, 0, 0.12], c: 0xd9c9a8 }, m('shop/mannequin', -14.2, -7.75, Math.PI / 2), m('shop/mannequin', -14.2, -7.05, Math.PI / 2)),
    lights([[-13, -7.0], [-11, -8.7]]), HELP,
    up('Fashion podium', { sign: 'gold' }, { box: [-10.4, -9.6, -9.3, -8.5, 0, 0.1], c: 0xe0b43a }, m('shop/mannequin', -10.0, -8.9, Math.PI / 2))])
};

AREAS.sports = {
  cx: -12.2, cz: -12.9, vacant: [-14.7, -9.7, -14.8, -10.9], sign: [-11.0, -13.35, 1.7],
  floor: [{ poly: rbox(-14.7, -9.7, -14.7, -11.0, 0.6), finish: 0xd9e4ee }],
  ups: ups([
    fx('Ball crate', 'crate', -10.6, -12.0, 's', GBALL),
    fx('Dome tent', 'surv/tent-canvas', -11.55, -12.0, 's'),
    fx('Skateboard rack', 'pallet', -10.6, -14.0, 's', ['skate/skateboard*0.4']),
    fx('Camp tent', 'surv/tent-canvas', -12.5, -12.0, 's'),
    fx('Bedroll table', 'table', -11.55, -14.0, 's', ['surv/bedroll-packed*0.9', 'surv/bedroll-packed*0.9']),
    fx('Family tent', 'surv/tent-canvas', -13.45, -12.0, 's'),
    fx('Camp stove table', 'table', -12.5, -14.0, 's', ['food/pot*0.5', 'food/pan*0.5']),
    fx('Cooler barrel', 'surv/barrel', -14.35, -12.0, 's'),
    fx('Jersey rack', RACK[1], -13.45, -14.0, 's'),
    d('Ice axe', 'surv/tool-pickaxe*2', -14.5, -13.0, 1.57),
    fx('Yoga balls', 'golf/ball-blue*9', -14.35, -14.0, 's'),
    mat('Turf mat', -14.3, -10.2, -11.9, -10.8, 0x7fb069),
    d('Trail marker', 'car/cone', -9.9, -12.0, 0, 0.8),
    d('Cap boxes', 'furn/cardboardBoxClosed', -9.9, -12.75, 0.2, 1.0),
    perch('Camp lantern', 'furn/lampRoundTable', -11.55, -14.0, 0.35),
    d('Sports plant', 'furn/pottedPlant', -9.9, -14.45, 0, 0.9),
    d('Stock boxes', 'furn/cardboardBoxClosed', -14.4, -10.95, 0.3, 1.1),
    perch('Tent lantern', 'furn/lampSquareTable', -13.45, -12.0, 0.5, 1.2),
    perch('Water bottles', 'surv/bottle*1.6', -10.6, -12.0, 0.22),
    perch('Cooler lid', 'surv/bucket', -14.35, -12.0, 0.3, 1.3),
    board('Ball board', 'BALLS 3 FOR 10', -12.9, -10.95, 0.9),
    d('Spare cone', 'roads/construction-cone', -9.9, -11.3, 0, 0.8),
    perch('Camp radio', 'furn/radio', -12.5, -14.0, 0.35, 1.2),
    perch('Ball on crate', 'golf/ball-red*4', -10.45, -12.0, 0.22)
  ], [SIGN, up('Pro desk', till(-14.35, -14.5, 'b'), { staff: [-13.8, -14.5, 'b'] }),
    up('Climbing wall', { box: [-14.7, -14.63, -12.7, -11.8, 0, 1.3], c: 0x8e8e96 }, { box: [-14.63, -14.6, -12.5, -12.4, 0.5, 0.6], c: 0xe0524a }, { box: [-14.63, -14.6, -12.2, -12.1, 0.9, 1.0], c: 0x4a8fe0 }, { box: [-14.63, -14.6, -12.0, -11.9, 0.3, 0.4], c: 0xe0b43a }),
    lights([[-13, -12.7], [-11, -12.7]]), HELP,
    up('Go-kart', { sign: 'gold' }, ['car/kart-oobi', -9.95, -13.8, 's'])])
};

AREAS.auto = {
  cx: -12.2, cz: -17.0, vacant: [-14.7, -9.7, -19.0, -14.9], sign: [-11.2, -17.45, 1.4],
  floor: [{ poly: rbox(-14.7, -9.7, -19.0, -14.9, 0.6), finish: 0xd5d5d8 }],
  ups: ups([
    unit('Wiper blades', -10.8, -15.75, sf(TIN[0], BOX[2], BOTTLE[3], TIN[3])),
    cap('Wheel cover end', -10.0, -15.75, 'b', ['car/wheel-racing', 'car/wheel-default']),
    unit('Motor oil', -11.6, -15.75, sf(BOTTLE[1], BOTTLE[3], BOTTLE[0], BOTTLE[2])),
    cap('Battery end', -10.0, -18.0, 'b', [BOTTLE[2], TIN[1]]),
    unit('Car care', -12.4, -15.75, sf(BOX[0], BOTTLE[1], TIN[2], BOX[4])),
    unit('Batteries', -10.8, -18.0, sf(BOX[3], TIN[1], BOX[5], TIN[2])),
    unit('Car accessories', -11.6, -18.0, sf(BOX[1], BOTTLE[0], TIN[2], BOX[0])),
    pal('Tire stack', -13.2, -15.75, 0, ['car/wheel-default']),
    unit('Cleaning kits', -12.4, -18.0, sf(BOTTLE[3], BOX[5], TIN[1], BOTTLE[1])),
    pal('Racing wheels', -13.2, -18.0, 0, ['car/wheel-racing']),
    d('Traffic cones', 'car/cone', -9.9, -16.4, 0),
    mat('Garage mat', -13.4, -10.3, -17.45, -16.35, 0xb8b8be),
    d('Auto boxes', 'furn/cardboardBoxClosed', -9.9, -18.7, 0.2, 1.1),
    d('Auto plant', 'furn/pottedPlant', -9.85, -14.95, 0, 0.9),
    perch('Wax tin', TIN[3], -12.4, -15.75, 0.8, 2),
    perch('Oil can', TIN[2], -11.6, -15.75, 0.8, 2),
    board('Tire sale board', 'TIRES 4 FOR 3', -11.2, -16.95, 0.9),
    d('Spare cones', 'roads/construction-cone', -9.9, -17.5, 0),
    mat('Bay mat', -14.8, -13.3, -18.2, -15.9, 0x9a9aa0),
    d('Spare bin', 'furn/trashcan', -14.4, -18.7, 0, 1.4),
    perch('Wheel on unit', 'car/wheel-dark', -10.8, -15.75, 0.8, 1.5, 1.57),
    perch('Battery stack', BOX[5], -10.8, -18.0, 0.8, 1.4),
    d('Hand truck', 'shop/hand-truck', -14.4, -15.2, 0.6),
    d('Spare wheel', 'car/wheel-racing', -9.9, -19.0, 0.2, 1.3)
  ], [SIGN, up('Tire desk', till(-14.35, -15.9, 'b'), { staff: [-13.85, -15.9, 'b'] }),
    up('Tire tower', m('car/wheel-default', -14.3, -17.9, 0, 1.4), m('car/wheel-racing', -14.3, -17.9, 0.4, 1.4, 0.2), m('car/wheel-dark', -14.3, -17.9, 0.8, 1.4, 0.4)), lights([[-12.4, -16.9], [-10.8, -16.9]]), HELP,
    up('Kart showcase', { sign: 'gold' }, ['car/kart-oobi', -13.3, -16.9, 'b'])])
};

var TVK = [1.3, 1.15, 1, 1.15, 1.3, 1.15, 1];
function tv(name, u) {
  return fx(name, 'furn/cabinetTelevisionDoors', -14.2 + u * 0.72, -22.08, 's', null, [['furn/televisionModern' + (TVK[u] === 1 ? '' : '*' + TVK[u]), 0, -0.03, 0, 0.28]]);
}
AREAS.tech = {
  cx: -12.2, cz: -20.6, vacant: [-14.7, -9.7, -22.2, -19.0], sign: [-11.0, -21.8, 2.4],
  floor: [{ poly: rbox(-14.7, -9.7, -22.2, -19.1, 0.5), finish: 0xd3d7e3 }],
  ups: ups([
    tv('24-inch TV', 6),
    fx('Laptop table', 'furn/desk', -10.2, -20.0, 's', null, [['furn/laptop*1.3', -0.12, 0, 0.2, 0.343]]),
    tv('32-inch TV', 5),
    tv('40-inch TV', 4),
    fx('Computer table', 'furn/desk', -11.5, -20.0, 's', null, [['furn/computerScreen*1.3', 0, -0.05, 0, 0.343], ['furn/computerKeyboard*1.3', 0, 0.07, 0, 0.343]], 2),
    tv('43-inch TV', 3),
    fx('Radio table', 'furn/desk', -13.2, -20.0, 's', null, [['furn/radio*1.2', -0.1, 0, 0.1, 0.343], ['furn/speakerSmall', 0.18, 0, 0, 0.343]], 2),
    tv('50-inch TV', 2),
    cap('Game rack', -14.3, -20.0, 's', [BOX[1], BOX[3]]),
    tv('55-inch TV', 1),
    perch('Camera box', BOX[3], -10.2, -20.0, 0.35, 0.8),
    tv('65-inch TV', 0),
    mat('Demo mat', -14.2, -10.2, -19.93, -18.82, 0xb9c1d6),
    perch('Phone box', BOX[1], -13.2, -20.0, 0.35, 0.8),
    perch('Desk plant', 'furn/plantSmall1', -10.47, -20.0, 0.35, 2),
    perch('Console box', BOX[2], -11.5, -20.0, 0.35, 0.7),
    perch('Boxed console', BOX[0], -14.3, -20.0, 1.05, 0.9, 0.3),
    perch('Bookshelf speaker', 'furn/speakerSmall', -12.0, -20.0, 0.35, 1.2),
    perch('Game stack', BOX[4], -14.3, -20.0, 1.05, 0.7),
    perch('Cable boxes', 'furn/cardboardBoxOpen', -10.2, -20.0, 0.35, 0.6),
    perch('Computer mouse', 'furn/computerMouse*1.6', -11.0, -20.0, 0.35),
    perch('Monitor', 'furn/computerScreen*0.9', -10.9, -20.0, 0.35),
    perch('Desk lamp', 'furn/lampSquareTable', -13.9, -20.0, 0.35, 1.3),
    perch('Router box', BOX[5], -13.2, -20.0, 0.35, 0.7)
  ], [SIGN, up('Service desk', till(-14.4, -21.0, 'b'), { staff: [-13.9, -21.0, 'b'] }),
    up('Home theater', ['furn/cabinetTelevisionDoors', -12.2, -20.95, 's', null, [['furn/televisionModern*1.9', 0, -0.03, 0, 0.28]], 2]), lights([[-12.5, -21.0], [-10.5, -20.5]]), HELP,
    up('Sound system', { sign: 'gold' }, ['furn/speaker', -14.45, -19.4, 's', null, null, 2])])
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
    fx('Dining table', 'furn/table*1.5', -5.4, -5.4, 's'),
    d('Night stand', 'furn/cabinetBedDrawer', -3.45, -8.95, 0, 1.6),
    d('Floor lamp', 'furn/lampRoundFloor', -4.4, -8.8, 0, 1.3),
    d('Dining chairs', 'furn/chair', -5.8, -5.95, 0, 1.5),
    d('Dresser', 'furn/kitchenCabinet', -1.75, -8.95, 0, 1.3),
    perch('Bedroom rug', 'furn/rugRound%=e6b8a8', -2.6, -6.9, 0, 1.5),
    fx('Washer dryer', 'furn/washerDryerStacked', -3.4, -5.2, 's', null, null, 2),
    d('Bookcase', 'furn/bookcaseOpenLow', -6.75, -8.85, 0, 2.2),
    perch('Bed lamp', 'furn/lampRoundTable', -3.45, -8.95, 0.38, 1.3),
    fx('Fridge', 'furn/kitchenFridgeLarge', -2.3, -5.2, 's'),
    d('Magazine rack', 'furn/bookcaseOpenLow', -4.45, -6.5, -Math.PI / 2, 1.4),
    d('Potted palm', 'furn/pottedPlant', -6.75, -5.75, 0, 1.3),
    mat('Dining rug', -6.3, -4.5, -6.2, -4.85, 0xd8c3a5),
    d('Side table', 'furn/sideTableDrawers', -4.3, -9.1, 0, 1.5),
    d('Pillow stack', 'furn/pillow', -1.6, -6.4, 0.3, 1.4),
    d('Corner lamp', 'furn/lampSquareFloor', -5.0, -5.95, 0, 1.3),
    perch('Shelf plant', 'furn/plantSmall1', -6.75, -8.85, 0.79, 2),
    fx('Stove', 'furn/kitchenStove*1.1', -1.65, -5.2, 's', null, null, 1),
    perch('Table lamp', 'furn/lampSquareTable', -4.3, -9.1, 0.52, 1.3)
  ], [SIGN, up('Home desk', till(-1.5, -6.0, 'k'), { staff: [-1.0, -6.0, 'k'] }),
    up('Entertainment center', ['furn/cabinetTelevisionDoors', -6.2, -4.95, 's', null, [['furn/televisionModern*1.15', 0, -0.03, 0, 0.45]]]), lights([[-5.2, -6.8], [-2.9, -6.8]]), HELP,
    up('Wardrobe', { sign: 'gold' }, { box: [-1.5, -1.28, -9.25, -8.4, 0, 0.9], c: 0xc9a063 }, { box: [-1.52, -1.5, -9.2, -8.8, 0.1, 0.8], c: 0xe9d3a8 }, { box: [-1.52, -1.5, -8.8, -8.45, 0.1, 0.8], c: 0xe9d3a8 })])
};

var TOYP = [BOX[2], 'toy/vehicle-suv*0.2', XM + 'train-locomotive*0.3', 'toy/vehicle-racer*0.2', BOX[4], 'skate/skateboard*0.4', XM + 'present-b-cube*0.35', BOX[0], XM + 'sled*0.3', 'toy/vehicle-truck*0.2'];
var TOYL = lane(-10.6, ['Toy cars', 'Building blocks', 'Dolls', 'Board games', 'Puzzles', 'Plush toys'], TOYP);
AREAS.toys = {
  cx: -4.1, cz: -10.5, vacant: [-6.9, -1.25, -11.7, -9.3], sign: [-3.2, -11.45, 1.6],
  floor: [{ poly: rbox(-6.9, -1.25, -11.7, -9.3, 0.5), finish: 0xe6dff3 }],
  ups: ups([
    TOYL[0],
    cap('Monster truck end', -6.65, -10.6, 'k', [BOX[1], 'toy/vehicle-monster-truck*0.2']),
    TOYL[1],
    fx('Claw machine', 'arcade/claw-machine', -7.6, -10.15, 'k'),
    TOYL[2],
    TOYL[3],
    fx('Gacha machine', 'shop/gacha-machine', -7.6, -11.05, 'k'),
    TOYL[4],
    TOYL[5],
    cap('Toy tower end', -1.45, -10.6, 'b', [XM + 'present-a-cube*0.35', XM + 'present-b-round*0.35']),
    perch('Toy racer', 'toy/vehicle-racer*0.4', -6.05, -10.6, 0.8),
    perch('Nutcracker doll', XM + 'nutcracker*0.4', -4.45, -10.6, 0.8),
    perch('Toy truck', 'toy/vehicle-truck*0.45', -5.4, -10.6, 0.8),
    perch('Plush cat', 'pets/animal-cat*2.5', -2.05, -10.6, 0.8),
    board('Toy sale board', 'TOY SALE', -6.8, -9.5, 0.9),
    perch('Block tower', BOX[1], -5.05, -10.6, 0.8, 1.0, 0.3),
    mat('Play mat', -6.5, -5, -11.75, -10.65, 0xf2c6d8),
    perch('Monster truck', 'toy/vehicle-monster-truck*0.4', -3.8, -10.6, 0.8),
    perch('Toy snowman', XM + 'snowman*0.3', -3.5, -10.6, 0.8),
    perch('Puzzle box', BOX[4], -3.0, -10.6, 0.8, 1.1),
    perch('Toy train', XM + 'train-locomotive*0.45', -1.45, -10.6, 1.05),
    perch('Toy reindeer', XM + 'reindeer*0.3', -2.7, -10.6, 0.8),
    board('Kids board', 'KIDS CORNER', -6.8, -11.2, 0.9),
    mat('Game mat', -3.9, -2.4, -10.35, -9.25, 0xe8d9f4)
  ], [SIGN, up('Toy desk', till(-0.85, -9.8, 'k'), { staff: [-0.4, -9.8, 'k'] }),
    up('Present tower', on(XP[0], -6.65, -10.6, 1.05, 1.6), on(XP[1], -6.65, -10.6, 1.4, 1.3, 0.4)), lights([[-5, -10.6], [-2.8, -10.6]]), HELP,
    up('Giant plush', { sign: 'gold' }, on('pets/animal-dog*3', -4.45, -10.6, 0.9))])
};

var OFFP = ['furn/books', BOX[1], CARTON[1], BOX[0], 'furn/books', BOX[2], CARTON[0], 'furn/books', BOX[3], CARTON[2]];
var OFFL = lane(-12.8, ['Novels', 'Cookbooks', 'Kids books', 'Notebooks', 'Pens', 'Printer paper'], OFFP);
AREAS.office = {
  cx: -4.1, cz: -12.8, vacant: [-6.9, -1.25, -13.9, -11.7], sign: [-3.2, -13.65, 2.2],
  floor: [{ poly: rbox(-6.9, -1.25, -13.9, -11.7, 0.5), finish: 0xe3dccf }],
  ups: ups([
    OFFL[0],
    cap('Book end', -6.65, -12.8, 'k', ['furn/books', BOX[1]]),
    OFFL[1],
    fx('Study desk', 'furn/desk', -7.6, -12.45, 'k', null, [['furn/laptop*1.3', -0.12, 0, 0.2, 0.343], ['furn/lampSquareTable', 0.15, 0, 0, 0.343]]),
    OFFL[2],
    OFFL[3],
    fx('Computer desk', 'furn/desk', -7.6, -13.2, 'k', null, [['furn/computerScreen*1.3', 0, -0.05, 0, 0.343], ['furn/computerKeyboard*1.3', 0, 0.07, 0, 0.343]]),
    OFFL[4],
    OFFL[5],
    cap('Stationery end', -1.45, -12.8, 'b', [BOX[4], CARTON[0]]),
    perch('Book stack', 'furn/books', -6.2, -12.8, 0.8, 1.6),
    perch('Desk lamp', 'furn/lampSquareTable', -5.25, -12.8, 0.8, 1.4),
    perch('Desk speaker', 'furn/speakerSmall', -5.9, -12.8, 0.8, 1.2, 0.3),
    perch('Office plant', 'furn/plantSmall1', -4.6, -12.8, 0.8, 2),
    perch('Paper boxes', CARTON[3], -3.8, -12.8, 0.8, 1.1),
    perch('Radio', 'furn/radio', -4.3, -12.8, 0.8, 1.3, 0.2),
    perch('Globe light', 'furn/lampRoundTable', -3.0, -12.8, 0.8, 1.4),
    perch('Pencil box', BOX[2], -2.05, -12.8, 0.8, 1.1),
    board('Paper deal', 'PAPER 2 FOR 5', -6.8, -12.3, 0.9),
    mat('Reading mat', -6.5, -5, -12.55, -11.45, 0xd9cdb8),
    board('Back to school', 'BACK TO SCHOOL', -6.8, -13.5, 1.0),
    perch('Boombox', 'furn/speaker*0.5', -1.45, -12.8, 1.05),
    perch('Laptop display', 'furn/laptop*1.3', -3.5, -12.8, 0.8, 1.2, 0.3),
    perch('Office mouse', 'furn/computerMouse*1.6', -5.5, -12.8, 0.8)
  ], [SIGN, up('Book desk', till(-0.85, -12.0, 'k'), { staff: [-0.4, -12.0, 'k'] }),
    up('Bestsellers', on('furn/books*3', -6.65, -12.8, 1.05), on('furn/books*3', -6.62, -12.8, 1.32, 1, 0.3), on('furn/books*3', -6.66, -12.8, 1.59, 1, 1)), lights([[-5, -12.8], [-2.8, -12.8]]), HELP,
    up('Big monitor', { sign: 'gold' }, on('furn/computerScreen*2', -2.85, -12.8, 0.9))])
};

// a pegboard panel on the area's north line with tools hung in rows: [model, across, height, size, turn]
function peg(x, list) {
  var out = [{ box: [x - 0.38, x + 0.38, -15.33, -15.29, 0.8, 1.7], c: 0x6f7f95, flat: 1 }, { box: [x - 0.39, x + 0.39, -15.34, -15.28, 1.66, 1.7], c: 0x434d5e, flat: 1 }];
  list.forEach(function (t) { out.push(on(t[0], x + t[1], -15.26, t[2], t[3], t[4])); });
  return out;
}
function pegrack(name, x, list) {
  return up.apply(null, [name].concat(peg(x, list)));
}
// a crate on a shelf top with loose fasteners lying on it
function bin(name, x, ref, k, bits) {
  var out = [name, on('furn/cardboardBoxOpen', x, -15.0, 0.8, 1.1)];
  bits.forEach(function (b, i) { out.push(on(ref, x + b[0], -15.0 + b[1], 1.0, k, b[2])); });
  return up.apply(null, out);
}
var HAM = 'tool/hammer-';
var TOOLL = [
  unit('Hammers', -6.05, -15.0, sf(HAM + 'simple~x', HAM + 'plastic~x', HAM + 'rectangle~x', HAM + 'ouch~x')),
  unit('Paint cans', -5.25, -15.0, sf(TIN[1], 'tool/brush~x', TIN[2], TIN[0])),
  unit('Screws and nails', -4.45, -15.0, sf(BOX[0], 'tool/bolt-s*3', CARTON[0], 'tool/nut-l*5')),
  unit('Screwdrivers and pliers', -3.65, -15.0, sf('tool/screwdriver-poke~x', 'tool/pliers-dull~x', 'tool/pliers-sharp~x', 'tool/screwdriver-slap~x')),
  unit('Buckets', -2.85, -15.0, sf('surv/bucket', TIN[3], BOX[3], TIN[1])),
  unit('Tape and glue', -2.05, -15.0, sf(TIN[2], BOX[5], 'surv/bucket', CARTON[2]))
];
AREAS.tools = {
  cx: -4.1, cz: -15.0, vacant: [-6.9, -1.25, -16.1, -13.9], sign: [-3.2, -15.85, 1.9],
  floor: [{ poly: rbox(-6.9, -1.25, -16.1, -13.9, 0.5), finish: 0xe2e2dc }],
  ups: ups([
    TOOLL[0],
    cap('Hammer end', -6.65, -15.0, 'k', [HAM + 'bangpop~x', HAM + 'smallhit~x']),
    TOOLL[1],
    fx('Workbench', 'surv/workbench*1.6', -7.6, -14.6, 'k', null, [[HAM + 'plastic~x', -0.1, 0.05, 0.5, 0.46], ['tool/saw-small-highcount~x*0.7', 0.02, -0.1, 0.1, 0.46]]),
    TOOLL[2],
    TOOLL[3],
    fx('Paint barrel', 'surv/barrel*1.3', -7.6, -15.4, 'k', null, [['tool/brush~x', 0, 0, 0.6, 0.45]]),
    TOOLL[4],
    TOOLL[5],
    cap('Axe and pick end', -1.45, -15.0, 'b', ['tool/axe~x', 'tool/cylinder-long~x']),
    bin('Bolt bin', -4.45, 'tool/bolt-l~x*2.5', 1, [[-0.08, 0, 0.3], [0.03, 0.03, -0.6], [0.08, -0.03, 1.2]]),
    perch('Paint tin', TIN[1], -5.25, -15.0, 0.8, 2),
    pegrack('Mallet rack', -5.25, [[HAM + 'kindathor', -0.25, 0.88, 0.9], [HAM + 'ouch', 0, 0.88, 0.9], [HAM + 'rocket', 0.25, 0.88, 0.9],
      [HAM + 'beemboom', -0.25, 1.27, 0.9], [HAM + 'cool', 0, 1.27, 0.9], [HAM + 'rectangle', 0.25, 1.27, 0.9]]),
    pegrack('Plier rack', -4.45, [['tool/pliers-dull', -0.25, 0.88, 1], ['tool/pliers-sharp', 0, 0.88, 1], ['tool/pliers-dull', 0.25, 0.88, 1],
      ['tool/screwdriver-poke', -0.28, 1.27, 1], ['tool/screwdriver-slap', -0.09, 1.27, 1], ['tool/screwdriver-poke', 0.09, 1.27, 1], ['tool/screwdriver-slap', 0.28, 1.27, 1]]),
    board('Tool deal', 'TOOLS 20% OFF', -6.8, -14.4, 1.0),
    perch('Primer tin', TIN[3], -2.9, -15.0, 0.8, 2),
    bin('Nail bin', -2.45, 'tool/nail-l~x*1.6', 1, [[-0.08, -0.02, 0.5], [0.02, 0.03, -0.3], [0.08, -0.02, 1.4]]),
    board('Paint deal', 'PAINT 2 FOR 30', -6.8, -15.8, 1.0),
    up('Brush pot', on('surv/bucket', -5.9, -15.0, 0.8, 1.2), on('tool/brush*0.8', -5.94, -15.0, 0.88), on('tool/brush*0.8', -5.86, -15.02, 0.88)),
    pegrack('Claw hammer rack', -3.65, [[HAM + 'simple', -0.25, 0.88, 0.9], [HAM + 'plastic', 0, 0.88, 0.9], [HAM + 'simple', 0.25, 0.88, 0.9],
      [HAM + 'plastic', -0.25, 1.27, 0.9], [HAM + 'simple', 0, 1.27, 0.9], [HAM + 'plastic', 0.25, 1.27, 0.9]]),
    pegrack('Hand saw rack', -2.85, [['tool/saw-big*0.8', 0, 0.86, 1], ['tool/saw-small-highcount*0.9', 0, 1.14, 1], ['tool/saw-precision*0.8', 0, 1.42, 1]]),
    bin('Nut bin', -2.05, 'tool/nut-l*5', 1, [[-0.08, 0, 0], [0.06, 0.03, 0.4]]),
    mat('Workshop mat', -6.5, -5, -14.55, -13.45, 0xd0d0c6),
    pegrack('Axe and crowbar rack', -2.05, [['tool/axe~z', 0, 0.86, 1], ['tool/crowbar~z', 0, 1.14, 1], ['tool/cylinder-long~z', 0, 1.36, 1]])
  ], [SIGN, up('Tool desk', till(-0.85, -14.2, 'k'), { staff: [-0.4, -14.2, 'k'] }),
    pegrack('Tool wall', -6.05, [[HAM + 'simple', -0.27, 0.88, 0.8], [HAM + 'plastic', -0.09, 0.88, 0.8], [HAM + 'rectangle', 0.09, 0.88, 0.8], [HAM + 'ouch', 0.27, 0.88, 0.8],
      [HAM + 'bangpop', -0.27, 1.27, 0.8], [HAM + 'smallhit', -0.09, 1.27, 0.8], [HAM + 'cool', 0.09, 1.27, 0.8], ['tool/axe', 0.27, 1.27, 0.6]]),
    lights([[-5, -15], [-2.8, -15]]), HELP,
    up('Lumber and crosscut saw', { sign: 'gold' }, on('surv/resource-planks*1.5', -3.65, -15.0, 0.9), on('tool/saw-bandsaw~x*0.8', -3.65, -14.95, 1.2))])
};

var KITP = [COOK[0], COOK[3], COOK[1], COOK[4], COOK[2], COOK[5], COOK[10], COOK[6], COOK[7], COOK[0]];
var KITL = lane(-17.2, ['Pots', 'Pans', 'Plates', 'Bowls', 'Mugs', 'Glasses'], KITP);
AREAS.kitchen = {
  cx: -4.1, cz: -17.2, vacant: [-6.9, -1.25, -18.3, -16.1], sign: [-3.2, -18.05, 2.2],
  floor: [{ poly: rbox(-6.9, -1.25, -18.3, -16.1, 0.5), finish: 0xdcebd5 }],
  ups: ups([
    KITL[0],
    cap('Knife end', -6.65, -17.2, 'k', [COOK[9], COOK[8]]),
    KITL[1],
    fx('Display stove', 'furn/kitchenStove*1.3', -7.6, -16.75, 'k'),
    KITL[2],
    KITL[3],
    fx('Display sink', 'furn/kitchenSink*1.1', -7.6, -17.65, 'k'),
    KITL[4],
    KITL[5],
    cap('Pan end', -1.45, -17.2, 'b', [COOK[2], COOK[0]]),
    perch('Coffee machine', 'furn/kitchenCoffeeMachine*1.6', -5.85, -17.2, 0.8),
    perch('Toaster', 'furn/toaster*1.8', -5.1, -17.2, 0.8),
    perch('Blender', 'furn/kitchenBlender*1.8', -4.3, -17.2, 0.8),
    perch('Microwave', 'furn/kitchenMicrowave*1.3', -3.5, -17.2, 0.8),
    board('Cookware deal', 'COOKWARE SALE', -6.8, -16.6, 1.0),
    perch('Knife block', 'food/knife-block*0.7', -2.65, -17.2, 0.8),
    perch('Plate stand', 'food/plate*1.3', -2.05, -17.2, 0.8),
    board('Kitchen sale', 'KITCHEN SALE', -6.8, -18.0, 1.0),
    perch('Cutting board', 'food/cutting-board*0.8', -5.4, -17.2, 0.8),
    perch('Pie dish', 'food/plate-deep*0.8', -3.8, -17.2, 0.8),
    perch('Salad bowl', 'food/bowl*1.0', -4.6, -17.2, 0.8),
    perch('Mug tree', 'food/mug*1.4', -6.25, -17.2, 0.8),
    perch('Glass pitcher', 'food/glass*1.8', -3.05, -17.2, 0.8),
    mat('Cook mat', -6.5, -5, -16.75, -15.65, 0xd3e4cc)
  ], [SIGN, up('Kitchen desk', till(-0.85, -16.4, 'k'), { staff: [-0.4, -16.4, 'k'] }),
    up('Pot tower', on('food/pot*2.4', -6.65, -17.2, 1.05), on('food/pot-stew*2.4', -6.65, -17.2, 1.4, 1, 0.4), on('food/pan*2.4', -6.65, -17.2, 1.75)),
    lights([[-5, -17.2], [-2.8, -17.2]]), HELP,
    up('Big pot', { sign: 'gold' }, on('food/pot*2', -3.65, -17.2, 0.9))])
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
  // pallets waiting between the docks, a jack at each dock and drums on the east side
  [['stock', -7.5, -26.1, 's', 'boxes'], ['stock', -7.5, -26.8, 's', 'boxes'], ['stock', -6.8, -26.3, 's', 'boxes'], ['stock', -0.8, -26.4, 's', 'boxes'],
    ['stock', 0.2, -26.4, 's', 'boxes'], ['stock', 1.2, -26.4, 's', 'boxes'], ['stock', 7.4, -26.5, 's', 'boxes'], ['stock', 8.2, -26.2, 's', 'boxes']],
  [{ m: 'shop/hand-truck', x: -9.2, z: -25.9, r: 0.3 }, { m: 'shop/hand-truck', x: -3.0, z: -25.9, r: -0.2 }, { m: 'shop/hand-truck', x: 3.0, z: -25.8, r: 0.1 },
    { m: 'shop/hand-truck', x: 9.2, z: -25.9, r: -0.4 }],
  [{ m: 'surv/barrel', x: 11.9, z: -25.6 }, { m: 'surv/barrel', x: 12.3, z: -25.6 }, { m: 'surv/barrel', x: 12.1, z: -25.25 }, { m: 'surv/barrel', x: 12.5, z: -25.25 }],
  // a forklift: body, counterweight, cage, mast and forks
  [hi(-2.65, -2.15, -26.9, -26.3, 0.06, 0.3, 0xf2c230), hi(-2.65, -2.15, -27.1, -26.9, 0.06, 0.36, 0x3a3d4a), hi(-2.65, -2.15, -26.75, -26.45, 0.55, 0.58, 0x3a3d4a),
    hi(-2.64, -2.61, -26.7, -26.5, 0.3, 0.55, 0x3a3d4a), hi(-2.19, -2.16, -26.7, -26.5, 0.3, 0.55, 0x3a3d4a),
    hi(-2.6, -2.2, -26.28, -26.23, 0.06, 0.7, 0x50566a), hi(-2.58, -2.52, -26.25, -25.8, 0.06, 0.1, 0x8d93a6), hi(-2.28, -2.22, -26.25, -25.8, 0.06, 0.1, 0x8d93a6)],
  // the break corner and the lockers on the west wall
  [{ m: 'furn/table', x: -13.4, z: -26.2, k: 1.2 }, { m: 'furn/chair', x: -14.15, z: -26.2, r: Math.PI / 2, k: 1.4 }, { m: 'furn/chair', x: -12.65, z: -26.2, r: -Math.PI / 2, k: 1.4 },
    { m: 'furn/chair', x: -13.4, z: -25.55, r: Math.PI, k: 1.4 }, { m: 'furn/kitchenCoffeeMachine', x: -13.2, z: -26.2, y: 0.44, k: 1.4, flat: 1 },
    { m: 'furn/radio', x: -13.7, z: -26.2, y: 0.44, k: 1.6, flat: 1 }],
  line(4, 0, -26.9, 0, 0.42, function (x, z, i) { return cab(-14.5, z, 0.36, 0.38, 0.72, [0x4a6fa5, 0x5b8a5b, 0xb5574b, 0x8a6bb0][i]); }),
  // bales and bins by the baler
  [hi(11.2, 11.9, -27.3, -26.7, 0, 0.3, 0xb08a5a), hi(11.2, 11.9, -27.3, -26.7, 0.3, 0.6, 0xa67f50), hi(11.2, 11.9, -26.55, -25.95, 0, 0.3, 0xb08a5a),
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
  [-4.9, 4.9, -11.4, 11.4].map(function (x) { return { m: 'furn/trashcan', x: x, z: 3.2, k: 1.5, flat: 1 }; }),
  [cab(-11.9, 3.2, 0.22, 0.22, 0.4, 0xc8402f), cab(-11.6, 3.2, 0.22, 0.22, 0.4, 0x3f6fb5), cab(11.6, 3.2, 0.22, 0.22, 0.4, 0xc8402f), cab(11.9, 3.2, 0.22, 0.22, 0.4, 0x3f6fb5)],
  [-11.2, -7.8, 7.8, 11.2].map(function (x) { return cab(x, 3.85, 0.1, 0.1, 0.32, 0xf2c230); }),
  // the bus shelter, a hydrant, a mailbox and bins on the near sidewalk, hedges along the far one
  [hi(-23.0, -21.0, 9.65, 10.35, 0.8, 0.84, 0x50566a), hi(-23.0, -22.96, 9.65, 9.69, 0, 0.8, 0x50566a), hi(-21.04, -21.0, 9.65, 9.69, 0, 0.8, 0x50566a),
    hi(-23.0, -21.0, 9.65, 9.68, 0.2, 0.8, 0xbfe6f2), hi(-23.0, -22.96, 10.31, 10.35, 0, 0.8, 0x50566a), hi(-21.04, -21.0, 10.31, 10.35, 0, 0.8, 0x50566a),
    { m: 'furn/bench', x: -22.0, z: 9.95, k: 1.5, flat: 1 }, tx('BUS', -20.4, 10.2, 0.5, 0.7)],
  [cab(-14.0, 10.15, 0.14, 0.14, 0.3, 0xc8402f), cab(14.0, 10.15, 0.14, 0.14, 0.3, 0xc8402f), cab(-16.5, 10.15, 0.22, 0.3, 0.4, 0x3f6fb5),
    { m: 'furn/trashcan', x: -12.0, z: 10.1, k: 1.5, flat: 1 }, { m: 'furn/trashcan', x: 12.0, z: 10.1, k: 1.5, flat: 1 }],
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
  [[22.4, 4, 0], [22.4, -10, 0], [22.4, -24, 0], [-10, -39.2, Math.PI], [0, -39.2, Math.PI], [12, -39.2, Math.PI], [-26.6, 0, 0], [-26.6, -14, 0]].map(function (q) {
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
  desk: { x: 12.0, z: 0.9, n: 3 },
  // the stockroom: where stockers wait, by the stock doors
  idle: [0.7, -7, 8.5, -10, -1.7, 7, -8.5, 10].map(function (x) { return [x, -23.8]; }),
  decor: DECOR,
  areas: AREAS,
  order: Object.keys(AREAS)
};
