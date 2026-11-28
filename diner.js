// The Main Street Diner and Pizzeria as data, in the style of plan.js: it keeps the building, its doors and its checkout
// bank and gives the inside its own areas, front, wing rooms and decor. Pieces are laid out in runs: a strip is pieces
// side by side along a wall or an island, each placed by the size of its model, so a piece is a name and a model.
import { PLAN, PW, KIT } from './plan.js';

var up = KIT.up;
var pw = KIT.pw;
var rbox = KIT.rbox;
var lights = KIT.lights;
var pack = KIT.pack;
var cat = KIT.cat;
var SIGN = KIT.SIGN;
var HELP = KIT.HELP;
// the show pieces are tinted gold
var GOLD = '%=gold';

// the size in metres, width, depth and height, of every model used here, as the model files have them
var SZ = {
  BakeryCase_SelfServe_10: [1, 0.6, 1.5],
  BakeryRack_15: [1.5, 0.6, 1.8],
  DeliveryBoxes_Dolly_01: [0.9, 0.639, 0.95],
  DisplayCase_Bakery_10: [1.01, 0.761, 1.32],
  Oven_Convection_10: [1, 0.757, 1.45],
  SM_BackBar_Cooler_15: [1.5, 0.7, 0.9],
  SM_BagInBox_Rack_01: [0.902, 0.48, 1.5],
  SM_BarStool_Diner_01: [0.372, 0.372, 0.75],
  SM_Bar_Corner_01: [0.7, 0.7, 1.1],
  SM_Bar_Section_10: [1, 0.7, 1.1],
  SM_Bar_Section_20: [2, 0.7, 1.1],
  SM_Booth_Single_12: [1.2, 0.603, 1.129],
  SM_BreadCrate_Stack_01: [0.71, 0.556, 0.6],
  SM_Charbroiler_075: [0.75, 0.753, 1.1],
  SM_ChefBase_Drawers_15: [1.5, 0.827, 0.6],
  SM_DishMachine_Door_01: [0.702, 0.783, 1.901],
  SM_DishTable_Clean_15: [1.5, 0.761, 1.161],
  SM_DishTable_Soiled_15: [1.5, 0.761, 1.161],
  SM_DisplayCase_Deli_15: [1.54, 0.93, 1.265],
  SM_DunnageRack_12: [1.2, 0.55, 0.3],
  SM_FryDump_Station_05: [0.52, 0.758, 1.45],
  SM_Fryer_Double_10: [1.02, 0.755, 1.15],
  SM_Fryer_Single_05: [0.51, 0.755, 1.15],
  SM_Griddle_FlatTop_10: [1, 0.753, 1.1],
  SM_IceBin_Bar_075: [0.75, 0.61, 0.935],
  SM_IceMachine_Bin_01: [0.76, 0.914, 1.8],
  SM_IngredientBin_01: [0.4, 0.72, 0.719],
  SM_Keg_Half_01: [0.431, 0.431, 0.602],
  SM_Kegerator_01: [0.61, 0.762, 1.39],
  SM_Mixer_Floor_01: [0.618, 0.747, 1.35],
  SM_Oven_Combi_075: [0.78, 0.747, 1.8],
  SM_Oven_Convection_Double_10: [1, 0.757, 1.85],
  SM_Oven_PizzaDeck_15: [1.5, 0.894, 1.552],
  SM_PlatformTruck_01: [0.9, 0.639, 0.95],
  SM_PrepTable_Pizza_20: [2, 0.877, 1.11],
  SM_PrepTable_Sandwich_15: [1.5, 0.827, 1.11],
  SM_Range_Com_4Burner_Griddle_10: [1, 0.755, 1.2],
  SM_Range_Com_6Burner_10: [1, 0.755, 1.2],
  SM_ReachIn_1Door_075: [0.75, 0.86, 2],
  SM_ReachIn_2Door_15: [1.5, 0.852, 2],
  SM_ReachIn_Glass_075: [0.75, 0.852, 2],
  SM_ReachIn_Open_075: [0.917, 1.411, 2],
  SM_Sack_Stack_01: [0.58, 0.58, 0.649],
  SM_SaladBar_15: [1.52, 0.81, 1.416],
  SM_ServerStation_01: [1, 0.59, 1.17],
  SM_SheetPanRack_01: [0.575, 0.732, 1.76],
  SM_Shelving_Wire_Chrome_12: [1.22, 0.47, 1.8],
  SM_Shelving_Wire_Loaded_12: [1.22, 0.47, 1.8],
  SM_Sink_3Comp_Drainboards_25: [2.51, 0.761, 1.161],
  SM_Skillet_Tilting_10: [1.01, 0.758, 1.214],
  SM_SteamTable_15: [1.5, 0.76, 0.96],
  SM_StockPotRange_05: [0.51, 0.655, 0.56],
  SM_Undercounter_Fridge_10: [1.008, 0.827, 0.92],
  SM_WorkTable_10: [1, 0.75, 0.92],
  SM_WorkTable_15: [1.5, 0.75, 0.92],
  SM_WorkTable_20: [2, 0.75, 0.92],
  SM_WorkTable_Backsplash_15: [1.5, 0.75, 1.04],
  SM_WorkTable_Drawers_15: [1.5, 0.75, 0.92]
};

// a piece's name is a text of its own: piece.dn_ and the words
function nm(en) {
  return tl('piece.dn_' + en.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, ''));
}

var FACE = { s: [0, 1], n: [0, -1], b: [1, 0], k: [-1, 0] };
var TURN = { s: 0, b: Math.PI / 2, n: Math.PI, k: -Math.PI / 2 };

// A run of pieces facing `face`, from `from` along the wall: their backs on `line` (their middles with d.mid). A piece
// is [name, model, options]: s the places to look at it (1 at its front, 0 none; the run's own default is d.s, else 1),
// on goods standing on it [model, along, out, scale], top models standing on it [model], plus models with it [model,
// distance from its middle toward its front, places to look at it], gap before it, n copies side by side
function strip(face, line, from, list, d) {
  d = d || {};
  var f = FACE[face];
  var vert = f[0] !== 0;
  var at = from;
  return list.map(function (e) {
    var o = e[2] || {};
    var s = SZ[e[1]];
    if (!s) throw new Error('no size for ' + e[1]);
    var w = s[0] * PW * (o.n || 1);
    var dp = s[1] * PW;
    at += o.gap || 0;
    var mid = at + w / 2;
    at += w;
    var back = d.mid ? 0 : dp / 2;
    var x = vert ? line + f[0] * back : mid;
    var z = vert ? mid : line + f[1] * back;
    var po = { spots: o.s !== undefined ? o.s : d.s !== undefined ? d.s : 1 };
    if (o.n) po.n = o.n;
    if (o.y) po.y = o.y;
    if (o.on) po.on = o.on.map(function (g) { return [g[0], g[1], g[2], 0, g[4] || s[2] * PW, g[3] || 1]; });
    var u = up(nm(e[0]), pw(e[1], x, z, face, po));
    (o.top || []).forEach(function (t) {
      u.piece.push({ m: 'pw/' + t[0], x: x, z: z, r: TURN[face], k: t[1] || 1, y: s[2] * PW, flat: 1 });
    });
    (o.plus || []).forEach(function (p) {
      u.piece.push(pw(p[0], vert ? x + f[0] * p[1] : x, vert ? z : z + f[1] * p[1], face, { spots: p[2] === undefined ? 1 : p[2] }));
    });
    u.at = { x: x, z: z, face: face, h: s[2] * PW };
    return u;
  });
}

// something standing on a piece of a strip, `along` the run and `out` toward the front of the piece: a piece of its own
function topOf(base, name, ref, along, out, k, y) {
  var a = base.at;
  var f = FACE[a.face];
  var x = f[0] ? a.x + f[0] * out : a.x + along;
  var z = f[0] ? a.z + along : a.z + f[1] * out;
  return up(nm(name), { m: ref, x: x, z: z, r: TURN[a.face], k: k || 1, y: y === undefined ? a.h : y, flat: 1 });
}

// the six items of a department in the order its upgrades come: a group is the pieces of one item, in the order they
// are bought, and OF says which item each upgrade belongs to
var OF = '020030120532110221132023544443';
function compose(groups) {
  var at = [0, 0, 0, 0, 0, 0];
  return OF.split('').map(function (c, i) {
    var g = groups[+c];
    var u = g[at[+c]++];
    if (!u) throw new Error('item ' + c + ' has too few pieces at upgrade ' + i);
    return u;
  });
}

function staff(name, x, z, face) {
  return up(nm(name), { staff: [x, z, face] });
}
function board(name, text, x, z, w, y) {
  return up(nm(name), KIT.tx(text, x, z, w, y));
}
// a model that takes no room of its own and may hang in the air: a hood, a lamp
function hang(ref, x, z, r, y, k) {
  return { m: ref.indexOf('/') > 0 ? ref : 'pw/' + ref, x: x, z: z, r: r || 0, k: k || 1, y: y, flat: 1 };
}
function floor(x0, x1, z0, z1, finish) {
  return { poly: rbox(x0, x1, z0, z1, 0.5), finish: finish };
}
// a piece of one model standing at a place
function put(name, ref, x, z, face, o) {
  return up(nm(name), pw(ref, x, z, face, o));
}

var AREAS = {};

// The sales floor is 26 x 10 behind the front wall at z -0.5: the checkout bank and its aisle along the front, and above it
// a band 5.6 deep along the back wall to the kitchen: dining, grill, pizza, fry, soda and salad from west to east, with the
// coffee bar in the west corner and the takeout window in the east one. A back line stands against the wall to the annex,
// a cook's aisle in front of it, and an island with its front to the shoppers

// Grill: a line of ranges along the back wall under its hood, a pass table in front of it, steam and prep at its east end
var gl0 = strip('s', -10.35, -7.1, [
  ['Charbroiler', 'SM_Charbroiler_075', { s: 0 }],
  ['Flat top griddle', 'SM_Griddle_FlatTop_10', { s: 0 }],
  ['Six burner range', 'SM_Range_Com_6Burner_10', { s: 0 }],
  ['Four burner range', 'SM_Range_Com_4Burner_Griddle_10', { s: 0 }],
  ['Stock pot range', 'SM_StockPotRange_05', { s: 0 }],
  ['Tilting skillet', 'SM_Skillet_Tilting_10', { s: 0 }]
]);
gl0.splice(5, 0, up(nm('Exhaust hood'), hang('SM_Hood_Canopy_20', -6.6, -10.35, 0, 1.0), hang('SM_Hood_Canopy_20', -5.6, -10.35, 0, 1.0), hang('SM_Hood_EndPanel_01', -5.07, -10.35, 0, 1.0)));
var gl1 = strip('s', -8.5, -7.7, [
  ['Pass table', 'SM_WorkTable_15', { top: [['SM_PassShelf_HeatLamp_15']] }],
  ['Burger plates', 'SM_WorkTable_15', { on: [['pw/SM_Plate_Burger_01', -0.2, 0], ['pw/SM_Plate_Burger_01', 0.2, 0]] }],
  ['Steak plates', 'SM_WorkTable_15', { on: [['pw/SM_Plate_Steak_01', -0.2, 0], ['pw/SM_Cloche_01', 0.2, 0]] }],
  ['Order rail', 'SM_WorkTable_10', { on: [['pw/OrderPrinter_01', 0, 0]] }],
  ['Cutting boards', 'SM_WorkTable_10', { on: [['pw/SM_CuttingBoard_Com_01', 0, 0], ['pw/SM_KnifeSet_Com_01', 0, 0.2]] }]
], { mid: true });
var gl2 = strip('k', -3.95, -9.75, [
  ['Steam table', 'SM_SteamTable_15', { s: 0 }],
  ['Bun oven', 'Oven_Convection_10', { s: 0 }],
  ['Drawer table', 'SM_WorkTable_Drawers_15', { s: 0 }],
  ['Under counter fridge', 'SM_Undercounter_Fridge_10', { s: 0 }]
]);
gl2.push(topOf(gl2[2], 'Burger buns', 'food/bread', -0.2, 0, 1.4), topOf(gl2[2], 'Baguettes', 'food/loaf-baguette', 0.2, 0, 1.4), topOf(gl2[0], 'Plated steak', 'pw/SM_Plate_Steak_01', 0, 0));
// the first piece bought is the pass table, which has a front a shopper can stand at
var t0 = gl0[0];
gl0[0] = gl1[0];
gl1[0] = t0;
AREAS.grill = {
  cx: -6.1, cz: -8.0, vacant: [-8.2, -4.0, -10.35, -5.6], sign: [-6.1, -5.8, 1.9],
  floor: [floor(-8.2, -4.0, -10.35, -5.6, 'quarry')],
  ups: compose([
    gl0,
    gl1,
    gl2,
    [SIGN, board('Grill menu', 'board.d_grill', -4.6, -5.9, 1.1, 0.95), lights([[-6.6, -9.3], [-5.0, -9.3]]),
      put('Kitchen mats', 'SM_Mat_AntiFatigue_01', -5.6, -9.3, 's', { spots: 0 }),
      up(nm('Golden grill'), { sign: 'gold' }, pw('SM_WorkTable_10', -7.4, -6.3, 's', { spots: 0 }), hang('SM_Plate_Burger_01' + GOLD, -7.4, -6.3, 0, 0.46, 2))],
    [put('Mop sink', 'SM_ServiceSink_Floor_01', -7.95, -6.9, 's', { spots: 0 }), put('Sanitizer bucket', 'SM_SanitizerBucket_01', -7.5, -6.9, 's', { spots: 0 }),
      put('Waste bin', 'SM_TrashCan_Round_Dolly_01', -4.3, -6.9, 's', { spots: 0 }), put('Wet floor sign', 'WetFloorSign_01', -6.2, -7.1, 's', { spots: 0 })],
    [staff('Grill cook', -6.3, -9.45, 'n'), HELP]
  ])
};

// Pizza ovens: deck ovens under a hood along the back wall, a prep island in front, dough stores at the east end
var pz0 = strip('s', -10.35, -3.55, [
  ['Pizza deck oven', 'SM_Oven_PizzaDeck_15', { s: 0 }],
  ['Second deck oven', 'SM_Oven_PizzaDeck_15', { s: 0 }],
  ['Dough mixer', 'SM_Mixer_Floor_01', { s: 0 }],
  ['Sheet pan rack', 'SM_SheetPanRack_01', { s: 0 }],
  ['Flour sacks', 'SM_Sack_Stack_01', { s: 0 }],
  ['Dough bench', 'SM_WorkTable_Backsplash_15', { s: 0, on: [['pw/SM_CuttingBoard_Com_01', 0, 0]] }]
]);
pz0.splice(5, 0, up(nm('Oven hood'), hang('SM_Hood_Canopy_20', -3.05, -10.35, 0, 1.0), hang('SM_Hood_Canopy_20', -2.05, -10.35, 0, 1.0)));
var pz1 = strip('s', -8.5, -3.9, [
  ['Pizza prep table', 'SM_PrepTable_Pizza_20', { on: [['pw/SM_Pizza_Whole_01', -0.25, 0], ['pw/SM_Pizza_Whole_01', 0.25, 0]] }],
  ['Peel and pizzas', 'SM_WorkTable_15', { on: [['pw/SM_Pizza_Peel_01', -0.2, 0], ['pw/SM_Pizza_Whole_01', 0.2, 0]] }],
  ['Toppings table', 'SM_PrepTable_Sandwich_15', { on: [['pw/SM_FoodTub_Square_01', -0.25, 0], ['pw/SM_FoodTub_Square_01', 0, 0], ['pw/SM_FoodTub_Square_01', 0.25, 0]] }],
  ['Boxed pizzas', 'SM_WorkTable_15', { on: [['pw/SM_Pizza_Box_Stack_01', -0.2, 0], ['pw/SM_Pizza_Box_Stack_01', 0.2, 0]] }],
  ['Cutting table', 'SM_WorkTable_10', { on: [['pw/SM_CuttingBoard_Com_01', 0, 0]] }]
], { mid: true });
var pz2 = strip('k', 0.3, -9.7, [
  ['Dough cooler', 'SM_ReachIn_1Door_075', { s: 0 }],
  ['Cheese bin', 'SM_IngredientBin_01', { s: 0 }],
  ['Sauce bin', 'SM_IngredientBin_01', { s: 0 }],
  ['Can shelving', 'SM_Shelving_Wire_Loaded_12', { s: 0 }]
]);
pz2.push(topOf(pz2[1], 'Tomato cans', 'pw/SM_Can_No10_01', 0, 0, 1, 0.36), topOf(pz2[2], 'Flour bags', 'pw/Bag_Flour_01', 0, 0, 1, 0.36), topOf(pz2[2], 'Olive oil', 'pw/OilBottle_01', 0.1, 0, 1, 0.36));
var t1 = pz0[0];
pz0[0] = pz1[0];
pz1[0] = t1;
AREAS.pizza = {
  cx: -1.8, cz: -8.0, vacant: [-4.0, 0.4, -10.35, -5.6], sign: [-1.8, -5.8, 1.9],
  floor: [floor(-4.0, 0.4, -10.35, -5.6, 'quarrybw')],
  ups: compose([
    pz0,
    pz1,
    pz2,
    [SIGN, board('Pizza menu', 'board.d_pizza', -0.7, -5.9, 1.1, 0.95), lights([[-3.0, -9.3], [-1.0, -9.3]]),
      up(nm('Oven lights'), hang('SM_Light_Heat_Bulb_Cord_01', -3.3, -9.8, 0, 1.2), hang('SM_Light_Heat_Bulb_Cord_01', -2.3, -9.8, 0, 1.2)),
      up(nm('Golden pizza'), { sign: 'gold' }, pw('SM_WorkTable_10', -2.6, -6.3, 's', { spots: 0 }), hang('SM_Pizza_Whole_01' + GOLD, -2.6, -6.3, 0, 0.46, 2))],
    [put('Sheet pan stack', 'SM_SheetPan_Stack_01', -1.2, -9.3, 's', { spots: 0 }), put('Mop sink', 'SM_ServiceSink_Floor_01', -3.6, -6.9, 's', { spots: 0 }),
      put('Waste bin', 'SM_TrashCan_Round_Dolly_01', 0.0, -6.9, 's', { spots: 0 }), put('Kitchen mats', 'SM_Mat_AntiFatigue_01', -1.9, -9.3, 's', { spots: 0 })],
    [staff('Pizza maker', -2.2, -9.4, 'n'), HELP]
  ])
};

// Fry station: fryers and ovens under a hood along the back wall, a pan island in front, a hot line at the east end
var fr0 = strip('s', -10.35, 1.0, [
  ['Single fryer', 'SM_Fryer_Single_05', { s: 0 }],
  ['Double fryer', 'SM_Fryer_Double_10', { s: 0 }],
  ['Fry dump station', 'SM_FryDump_Station_05', { s: 0 }],
  ['Convection oven', 'Oven_Convection_10', { s: 0 }],
  ['Double oven', 'SM_Oven_Convection_Double_10', { s: 0 }],
  ['Combi oven', 'SM_Oven_Combi_075', { s: 0 }]
]);
fr0.splice(5, 0, up(nm('Fry hood'), hang('SM_Hood_Canopy_20', 1.5, -10.35, 0, 1.0), hang('SM_Hood_Canopy_20', 2.5, -10.35, 0, 1.0)));
var fr1 = strip('s', -8.5, 0.9, [
  ['Pan table', 'SM_WorkTable_20', { on: [['pw/SM_HotelPan_Full_01', -0.25, 0], ['pw/SM_HotelPan_Full_01', 0.25, 0]] }],
  ['Sauce pots', 'SM_WorkTable_15', { on: [['pw/SM_SaucePot_Com_01', -0.15, 0], ['pw/SM_StockPot_Large_01', 0.15, 0]] }],
  ['Chip rack', 'SM_SheetPanRack_01'],
  ['Dredge table', 'SM_WorkTable_15', { on: [['pw/SM_Shakers_Dredge_01', -0.2, 0], ['pw/SM_HotelPan_Perforated_01', 0.15, 0]] }],
  ['Wok station', 'SM_WorkTable_10', { on: [['pw/SM_Wok_01', 0, 0]] }]
], { mid: true });
var fr2 = strip('s', -10.35, 3.5, [
  ['Chef base', 'SM_ChefBase_Drawers_15', { s: 0 }],
  ['Back table', 'SM_WorkTable_Backsplash_15', { s: 0 }]
]);
fr2.push(topOf(fr2[0], 'Panini press', 'pw/SM_PaniniPress_01', -0.26, 0), topOf(fr2[1], 'Microwave', 'pw/SM_Microwave_Com_01', -0.2, 0, 1, 0.46), topOf(fr2[0], 'Toaster', 'pw/SM_Toaster_Conveyor_01', 0.26, 0),
  topOf(fr2[1], 'Rice cooker', 'pw/SM_RiceCooker_Com_01', 0.2, 0, 1, 0.46), topOf(fr2[0], 'Soup kettle', 'pw/SM_SoupKettle_01', 0, 0));
var t2 = fr0[0];
fr0[0] = fr1[0];
fr1[0] = t2;
AREAS.fry = {
  cx: 2.7, cz: -8.0, vacant: [0.4, 4.95, -10.35, -5.6], sign: [2.7, -5.8, 1.9],
  floor: [floor(0.4, 4.95, -10.35, -5.6, 'quarryslate')],
  ups: compose([
    fr0,
    fr1,
    fr2,
    [SIGN, board('Fry menu', 'board.d_fry', 1.5, -5.9, 1.1, 0.95), lights([[1.8, -9.3], [3.6, -9.3]]),
      up(nm('Heat lamps'), hang('SM_Light_Heat_Bulb_Cord_01', 2.0, -9.3, 0, 1.2), hang('SM_Light_Heat_Bulb_Cord_01', 3.0, -9.3, 0, 1.2)),
      up(nm('Golden fryer'), { sign: 'gold' }, pw('SM_Fryer_Double_10' + GOLD, 4.2, -6.3, 's', { spots: 0 }), hang('SM_Hood_Canopy_10', 4.2, -6.6, 0, 1.0))],
    [put('Oil jugs', 'SM_OilJug_Fryer_01', 4.4, -9.3, 's', { spots: 0, n: 3 }), put('Used oil caddy', 'SM_UsedOil_Caddy_01', 4.7, -7.2, 's', { spots: 0 }),
      put('Fry mat', 'SM_Mat_AntiFatigue_01', 2.6, -9.3, 's', { spots: 0 }), put('Sanitizer bucket', 'SM_SanitizerBucket_01', 0.8, -7.2, 's', { spots: 0 })],
    [staff('Fry cook', 2.2, -9.4, 'n'), HELP]
  ])
};

// Soda fountain: syrups and taps along the back wall, a counter with stools in front of it
var so0 = strip('s', -10.35, 5.1, [
  ['Syrup rack', 'SM_BagInBox_Rack_01', { s: 0 }],
  ['Ice machine', 'SM_IceMachine_Bin_01', { s: 0 }],
  ['Back bar cooler', 'SM_BackBar_Cooler_15', { s: 0 }],
  ['Root beer tap', 'SM_Kegerator_01', { s: 0 }],
  ['Root beer keg', 'SM_Keg_Half_01', { s: 0 }],
  ['Under bar fridge', 'SM_Undercounter_Fridge_10', { s: 0 }]
]);
so0.splice(5, 0, up(nm('Back bar shelves'), hang('SM_BackBar_Shelves_20', 6.3, -10.3, 0, 0.75)));
var so1 = strip('s', -8.5, 5.0, [
  ['Soda fountain', 'SM_Bar_Section_10', { top: [['SM_SodaFountain_01']] }],
  ['Fountain counter', 'SM_Bar_Section_20'],
  ['Root beer taps', 'SM_Bar_Section_10', { top: [['SM_DraftTower_3Tap_01']] }],
  ['Ice bin', 'SM_IceBin_Bar_075'],
  ['Napkin counter', 'SM_Bar_Section_10', { top: [['SM_NapkinDispenser_01']] }]
], { mid: true });
var so2 = strip('s', -7.4, 5.1, ['First stool', 'Second stool', 'Third stool', 'Fourth stool', 'Fifth stool', 'Sixth stool', 'Seventh stool'].map(function (n) {
  return [n, 'SM_BarStool_Diner_01', { s: 0, gap: 0.18 }];
}), { mid: true });
// the first piece bought is the fountain counter, which has a front a shopper can stand at
var t4 = so0[0];
so0[0] = so1[0];
so1[0] = t4;
AREAS.soda = {
  cx: 6.7, cz: -8.0, vacant: [4.95, 8.4, -10.35, -5.6], sign: [6.7, -5.8, 1.9],
  floor: [floor(4.95, 8.4, -10.35, -5.6, 'checker')],
  ups: compose([
    so0,
    so1,
    so2,
    [SIGN, board('Soda menu', 'board.d_soda', 5.6, -5.9, 1.1, 0.95), lights([[5.6, -9.3], [7.4, -9.3]]),
      up(nm('Neon lamps'), hang('SM_Light_Pendant_Diner_01', 5.8, -8.4, 0, 1.2), hang('SM_Light_Pendant_Diner_01', 7.2, -8.4, 0, 1.2)),
      up(nm('Golden shake'), { sign: 'gold' }, pw('SM_Bar_Section_20', 7.0, -6.3, 's', { spots: 0 }), hang('SM_SodaFountain_01' + GOLD, 6.75, -6.3, 0, 0.55), hang('SM_SodaFountain_01' + GOLD, 7.25, -6.3, 0, 0.55))],
    [topOf(so1[1], 'Pint glasses', 'pw/SM_BeerGlass_Pint_01', -0.3, 0, 1.4), topOf(so1[1], 'Shaker set', 'pw/SM_Shaker_Set_01', 0.3, 0), topOf(so1[3], 'Pitcher', 'pw/SM_Pitcher_Beer_01', 0, 0),
      topOf(so1[1], 'Ice bucket', 'pw/SM_IceBucket_01', 0, 0)],
    [staff('Soda jerk', 6.5, -9.35, 's'), HELP]
  ])
};

// Salad and sandwich counter: the salad bar and prep tables along the back wall, coolers down the east wall
var sd0 = strip('s', -10.35, 8.9, [
  ['Salad bar', 'SM_SaladBar_15', { s: 1 }],
  ['Sandwich prep table', 'SM_PrepTable_Sandwich_15'],
  ['Chef base', 'SM_ChefBase_Drawers_15'],
  ['Prep drawers', 'SM_WorkTable_Drawers_15']
], { s: 0 }).concat(strip('k', 12.85, -9.9, [
  ['Wire shelving', 'SM_Shelving_Wire_Chrome_12', { s: 0 }],
  ['Back table', 'SM_WorkTable_Backsplash_15']
], { s: 0 }));
sd0.splice(5, 0, up(nm('Second salad bar'), pw('SM_SaladBar_15', 10.2, -8.4, 's')));
var sd1 = strip('k', 12.85, -8.55, [
  ['Glass door cooler', 'SM_ReachIn_Glass_075'],
  ['Door cooler', 'SM_ReachIn_1Door_075', { s: 0 }],
  ['Two door cooler', 'SM_ReachIn_2Door_15', { s: 0 }],
  ['Open air cooler', 'SM_ReachIn_Open_075'],
  ['Under counter cooler', 'SM_Undercounter_Fridge_10', { s: 0 }]
]);
var sd2 = [topOf(sd0[1], 'Lettuce tray', 'pw/ProduceTray_Lettuce_01', -0.3, 0, 1, 0.55), topOf(sd0[1], 'Tomato tray', 'pw/ProduceTray_Tomatoes_01', 0.3, 0, 1, 0.55),
  topOf(sd0[2], 'Carrot tray', 'pw/ProduceTray_Carrots_01', -0.25, 0), topOf(sd0[2], 'Onion tray', 'pw/ProduceTray_Onions_01', 0, 0), topOf(sd0[2], 'Pepper tray', 'pw/ProduceTray_Peppers_01', 0.25, 0),
  topOf(sd0[3], 'Pasta bowls', 'pw/SM_Bowl_Pasta_01', -0.15, 0), topOf(sd0[3], 'Salad plates', 'pw/SM_Plate_Salad_01', 0.15, 0)];
AREAS.salad = {
  cx: 10.6, cz: -8.0, vacant: [8.4, 12.85, -10.35, -5.6], sign: [10.6, -5.8, 1.9],
  floor: [floor(8.4, 12.85, -10.35, -5.6, 'greentile')],
  ups: compose([
    sd0,
    sd1,
    sd2,
    [SIGN, board('Salad menu', 'board.d_salad', 9.2, -5.9, 1.1, 0.95), lights([[9.8, -9.3], [11.0, -9.3]]),
      put('Entrance mat', 'SM_Mat_Entrance_01', 10.6, -5.9, 's', { spots: 0 }),
      up(nm('Golden salad'), { sign: 'gold' }, pw('SM_WorkTable_10', 11.4, -6.9, 's', { spots: 0 }), hang('SM_Plate_Salad_01' + GOLD, 11.4, -6.9, 0, 0.46, 2))],
    [put('Planter', 'Planter_Tall_01', 8.7, -5.9, 's', { spots: 0 }), put('Second planter', 'Planter_Tall_01', 12.5, -5.9, 's', { spots: 0 }), put('Hand sink', 'SM_ServiceSink_Floor_01', 8.7, -7.2, 'k', { spots: 0 }),
      put('Wet floor sign', 'WetFloorSign_01', 9.6, -6.6, 's', { spots: 0 })],
    [staff('Salad maker', 10.3, -9.5, 'n'), HELP]
  ])
};

// Coffee and pastry bar: the coffee counter with the barista behind it, pastry cases down the west wall, cafe tables
var cf0 = strip('s', -4.2, -12.2, [
  ['Espresso bar', 'SM_Bar_Section_20', { s: 1, top: [['SM_Espresso_Machine_01']] }],
  ['Coffee grinder', 'SM_Bar_Section_10', { top: [['SM_Coffee_Grinder_01']] }],
  ['Airpot brewer', 'SM_Bar_Section_10', { top: [['SM_Coffee_Brewer_Airpot_01']] }],
  ['Tea urn', 'SM_Bar_Section_10', { top: [['SM_HotWater_Tea_Urn_01']] }],
  ['Cash counter', 'SM_Bar_Section_10', { top: [['SM_POS_Terminal_01']] }]
], { mid: true });
cf0.splice(5, 0, up(nm('Coffee station'), pw('CoffeeStation_15', -8.7, -4.4, 's', { spots: 0 })));
cf0.push(put('Counter end', 'SM_Bar_End_01', -8.05, -4.2, 's', { spots: 0 }));
var cf1 = strip('b', -12.85, -3.85, [
  ['Bakery case', 'DisplayCase_Bakery_10', { s: 1 }],
  ['Deli case', 'SM_DisplayCase_Deli_15'],
  ['Self serve case', 'BakeryCase_SelfServe_10'],
  ['Bread rack', 'BakeryRack_15'],
  ['Bread crates', 'SM_BreadCrate_Stack_01', { s: 0 }]
]);
function cafe(name, x, z) {
  return up(nm(name), pw('Table_Cafe_Round_01', x, z, 's'), pw('Chair_Metal_Cafe_01', x, z - 0.42, 's', { spots: 0 }), pw('Chair_Metal_Cafe_01', x, z + 0.42, 'n', { spots: 0 }));
}
var cf2 = [cafe('Cafe table', -10.4, -2.6), cafe('Second cafe table', -8.9, -2.6), cafe('Third cafe table', -10.4, -1.4), cafe('Fourth cafe table', -8.9, -1.4)];
cf2.push(up(nm('Table candles'), hang('SM_TableTent_Candle_01', -10.4, -2.6, 0, 0.375, 1), hang('SM_TableTent_Candle_01', -8.9, -2.6, 0, 0.375, 1)),
  up(nm('Condiment caddies'), hang('SM_CondimentCaddy_01', -10.4, -1.4, 0, 0.375, 1), hang('SM_CondimentCaddy_01', -8.9, -1.4, 0, 0.375, 1)),
  up(nm('Napkin dispensers'), hang('SM_NapkinDispenser_01', -10.4, -1.3, 0, 0.375, 1), hang('SM_NapkinDispenser_01', -8.9, -1.3, 0, 0.375, 1)));
AREAS.coffee = {
  cx: -10.2, cz: -2.8, vacant: [-12.85, -7.6, -4.8, -0.8], sign: [-10.2, -1.0, 1.9],
  floor: [floor(-12.85, -7.6, -4.8, -0.8, 'boards')],
  ups: compose([
    cf0,
    cf1,
    cf2,
    [SIGN, board('Coffee menu', 'board.d_coffee', -12.2, -0.9, 1.1, 0.95), lights([[-11.0, -3.4], [-9.4, -3.4]]),
      up(nm('Pendant lamps'), hang('SM_Light_Pendant_Diner_01', -11.0, -3.2, 0, 1.2), hang('SM_Light_Pendant_Diner_01', -9.7, -3.2, 0, 1.2), hang('SM_Light_Pendant_Diner_01', -8.4, -3.2, 0, 1.2)),
      up(nm('Golden cake'), { sign: 'gold' }, pw('Table_Cafe_Round_01', -7.95, -2.0, 's', { spots: 0 }), hang('food/cake-birthday' + GOLD, -7.95, -2.0, 0, 0.375, 1.4))],
    [put('Coffee planter', 'Planter_Tall_01', -8.0, -1.0, 's', { spots: 0 }), topOf(cf0[0], 'Paper cups', 'pw/SM_Cup_Paper_Stack_01', 0.3, 0.05), put('Door mat', 'SM_Mat_Entrance_01', -9.6, -0.95, 's', { spots: 0 }),
      put('Bar planter', 'Planter_Tall_01', -7.9, -4.5, 's', { spots: 0 })],
    [staff('Barista', -10.7, -4.85, 's'), HELP]
  ])
};

// Dining room: booths down the west wall with their tables, two columns of tables and chairs, the host stand at the front
var dn0 = strip('b', -12.85, -10.1, ['First booth', 'Second booth', 'Third booth', 'Fourth booth', 'Fifth booth', 'Sixth booth'].map(function (n) {
  return [n, 'SM_Booth_Single_12', { s: 0, plus: [['SM_BoothTable_12', 0.325, 1]] }];
}));
dn0.splice(5, 0, up(nm('Corner booth'), pw('SM_Booth_Corner_01', -12.55, -6.1, 'b', { spots: 0 }), pw('SM_BoothTable_12', -12.05, -6.1, 'b')));
// a row of two tables, one in each column, and their chairs
var DX = [-10.5, -9.0];
function seat(name, z, ref) {
  return up(nm(name), pw(ref, DX[0], z, 'b'), pw(ref, DX[1], z, 'b'));
}
function chairs(name, z, ref) {
  return up(nm(name), pw(ref, DX[0] - 0.37, z, 'b', { spots: 0 }), pw(ref, DX[0] + 0.37, z, 'k', { spots: 0 }), pw(ref, DX[1] - 0.37, z, 'b', { spots: 0 }), pw(ref, DX[1] + 0.37, z, 'k', { spots: 0 }));
}
var dn1 = [seat('Four top tables', -9.6, 'Table_Four_01'), seat('Second four tops', -8.6, 'Table_Four_01'), seat('Square tables', -7.6, 'SM_Table_Cafe_Square_01'),
  seat('High top tables', -6.6, 'SM_Table_HighTop_01'), seat('Round tables', -5.9, 'Table_Cafe_Round_01')];
var dn2 = [chairs('Chairs at row one', -9.6, 'SM_Chair_Diner_01'), chairs('Chairs at row two', -8.6, 'SM_Chair_Diner_01'), chairs('Chairs at row three', -7.6, 'SM_Chair_Bentwood_01'),
  chairs('Chairs at row four', -6.6, 'SM_BarStool_Wood_High_01'), chairs('Chairs at row five', -5.9, 'SM_Chair_Diner_01'),
  put('High chair', 'HighChair_Wood_01', -8.5, -9.0, 'k', { spots: 0 }), put('Second high chair', 'HighChair_Wood_01', -8.5, -7.0, 'k', { spots: 0 })];
AREAS.dining = {
  cx: -10.5, cz: -8.0, vacant: [-12.85, -8.2, -10.35, -5.6], sign: [-10.5, -5.8, 1.9],
  floor: [floor(-12.85, -8.2, -10.35, -5.6, 'redtile')],
  ups: compose([
    dn0,
    dn1,
    dn2,
    [SIGN, board('Seating board', 'board.d_dining', -11.8, -5.7, 1.1, 0.95), lights([[-10.5, -8.0], [-10.5, -6.0]]),
      up(nm('Diner pendants'), hang('SM_Light_Pendant_Diner_01', -9.75, -9.6, 0, 1.2), hang('SM_Light_Pendant_Diner_01', -9.75, -8.0, 0, 1.2), hang('SM_Light_Pendant_Diner_01', -9.75, -6.6, 0, 1.2),
        hang('SM_Light_Pendant_Diner_01', -9.75, -5.9, 0, 1.2)),
      up(nm('Laid table'), { sign: 'gold' }, pw('SM_Table_Set_Four_01' + GOLD, -11.4, -5.7, 'b'))],
    [put('Host stand', 'HostStand_01', -8.9, -5.8, 's', { spots: 0 }), put('Rope stanchions', 'SM_Stanchion_Rope_01', -9.9, -5.65, 's', { spots: 0 }),
      put('Menu stand', 'SM_Sign_AFrame_Blank_01', -8.5, -10.0, 's', { spots: 0 }), put('Dining planter', 'Planter_Tall_01', -12.5, -5.7, 's', { spots: 0 })],
    [staff('Server', -9.75, -9.1, 's'), HELP]
  ])
};

// Takeout window: counters along the east wall with the pass window, an order counter in front of them and the bags and boxes
var tk0 = strip('k', 12.85, -4.5, [
  ['Takeout counter', 'SM_Bar_Section_20'],
  ['Counter corner', 'SM_Bar_Corner_01'],
  ['Second counter', 'SM_Bar_Section_10'],
  ['Pickup station', 'SM_ServerStation_01'],
  ['Napkin counter', 'SM_Bar_Section_10']
], { s: 0 });
// a heat lamp shelf on the first counter, and the end panel turned across the last one
var tk0w = up(nm('Heat lamp pass'), hang('SM_PassShelf_HeatLamp_15', tk0[0].at.x, tk0[0].at.z, -Math.PI / 2, tk0[0].at.h));
var tk0e = put('Counter end', 'SM_Bar_End_01', 12.675, -1.55, 's', { spots: 0 });
var tk1 = [topOf(tk0[0], 'Takeout bags', 'pw/SM_TakeoutBag_01', -0.25, 0, 1), topOf(tk0[2], 'Takeout boxes', 'pw/SM_TakeoutBoxes_01', 0, 0), topOf(tk0[0], 'Pizza boxes', 'pw/SM_Pizza_Box_Stack_01', 0.25, 0),
  topOf(tk0[4], 'Paper cups', 'pw/SM_Cup_Paper_Stack_01', 0, 0), topOf(tk0[0], 'Call bell', 'pw/CallBell_01', 0, 0.05, 1.5)];
var tk2 = strip('s', -4.2, 8.0, [
  ['Ticket table', 'SM_WorkTable_15', { on: [['pw/OrderPrinter_01', -0.3, 0], ['pw/CallBell_01', 0.3, 0]] }],
  ['Register stand', 'SM_ServerStation_01', { on: [['pw/SM_POS_Terminal_01', 0, 0]] }],
  ['Bag table', 'SM_WorkTable_10', { on: [['pw/SM_TakeoutBag_01', -0.1, 0], ['pw/SM_TakeoutBag_01', 0.1, 0]] }],
  ['Box table', 'SM_WorkTable_10', { on: [['pw/SM_TakeoutBoxes_01', 0, 0]] }],
  ['Delivery dolly', 'DeliveryBoxes_Dolly_01', { s: 0 }],
  ['Platform truck', 'SM_PlatformTruck_01', { s: 0 }],
  ['Prep table', 'SM_WorkTable_15']
], { mid: true });
var tkg0 = tk0.slice(0, 5).concat([tk0w], [tk0e]);
var t3 = tkg0[0];
tkg0[0] = tk2[0];
tk2[0] = t3;
AREAS.takeout = {
  cx: 10.2, cz: -2.8, vacant: [7.6, 12.85, -4.8, -0.8], sign: [10.2, -1.0, 1.9],
  floor: [floor(7.6, 12.85, -4.8, -0.8, 'amber')],
  ups: compose([
    tkg0,
    tk1,
    tk2,
    [SIGN, board('Takeout menu', 'board.d_takeout', 8.4, -1.0, 1.1, 0.95), lights([[11.8, -3.4], [10.0, -3.4]]),
      up(nm('Window lamps'), hang('SM_Light_Heat_Bulb_Cord_01', 12.0, -3.0, 0, 1.2), hang('SM_Light_Heat_Bulb_Cord_01', 12.0, -2.2, 0, 1.2)),
      up(nm('Golden bag'), { sign: 'gold' }, pw('SM_WorkTable_10', 9.6, -2.0, 's', { spots: 0 }), hang('SM_TakeoutBag_01' + GOLD, 9.6, -2.0, 0, 0.46, 2))],
    [put('Menu case', 'SM_Outdoor_Menu_Case_01', 17.4, -6.0, 'k', { spots: 0 }), put('A frame sign', 'SM_Sign_AFrame_Blank_01', 13.7, -0.2, 's', { spots: 0 }),
      put('Waiting bench', 'DiningBench_01', 8.0, -1.5, 'b', { spots: 0 }), put('Takeout planter', 'Planter_Tall_01', 11.8, -1.1, 's', { spots: 0 })],
    [staff('Order clerk', 11.7, -2.6, 'b'), HELP]
  ])
};

// The annex rooms: the walk-in cooler and the staff room are places, built a piece at a time; the dish room and the dry
// store beside them are there from the first day
var WING = {
  rest: {
    rect: [-5.2, -1.2, -15.6, -12.0],
    visit: [],
    ups: [
      pack(nm('The walk-in box'), pw('SM_WalkIn_Box_2x2', -3.6, -14.6, 's', { spots: 0 })),
      pack(nm('A strip curtain'), pw('SM_WalkIn_StripCurtain_01', -3.6, -13.95, 's', { spots: 0 })),
      pack(nm('Chrome shelving'), pw('SM_Shelving_Wire_Chrome_12', -2.4, -15.3, 's', { spots: 0 }), pw('SM_Shelving_Wire_Chrome_12', -1.8, -15.3, 's', { spots: 0 })),
      pack(nm('A condenser and evaporator'), hang('SM_WalkIn_Condenser_01', -3.6, -14.7, 0, 1.43), hang('SM_WalkIn_Evaporator_01', -3.6, -14.2, 0, 1.43)),
      pack(nm('Dunnage racks'), pw('SM_DunnageRack_12', -4.6, -12.5, 's', { spots: 0 }), pw('SM_DunnageRack_12', -3.5, -12.5, 's', { spots: 0 })),
      pack(nm('Loaded shelving'), pw('SM_Shelving_Wire_Loaded_12', -1.4, -14.2, 'k', { spots: 0 }), pw('SM_Shelving_Wire_Loaded_12', -1.4, -13.4, 'k', { spots: 0 })),
      pack(nm('Root beer kegs'), pw('SM_Keg_Sixth_01', -5.0, -15.2, 's', { spots: 0 }), pw('SM_Keg_Sixth_01', -4.7, -15.2, 's', { spots: 0 }), pw('SM_Keg_Sixth_01', -4.85, -14.8, 's', { spots: 0 }),
        pw('SM_CO2_Tank_Wall_01', -5.1, -14.4, 'b', { spots: 0 })),
      pack(nm('Sacks and cans'), pw('SM_Sack_Stack_01', -4.9, -13.5, 's', { spots: 0 }), pw('SM_Sack_Stack_01', -4.4, -13.5, 's', { spots: 0 }), pw('SM_CanGoods_Case_01', -2.8, -12.4, 's', { spots: 0, n: 2 }))
    ]
  },
  lounge: {
    rect: [-1.2, 3.4, -15.6, -12.0],
    visit: [],
    ups: [
      pack(nm('Lockers'), pw('EmployeeLockers_3_01', -0.9, -13.4, 'b', { spots: 0 }), pw('EmployeeLockers_3_01', -0.9, -14.3, 'b', { spots: 0 })),
      pack(nm('A time clock and first aid'), KIT.wp('TimeClock_Wall_01', -1.18, -12.6, 'b', 0.3), KIT.wp('FirstAid_Box_Wall_01', -1.18, -15.2, 'b', 0.3)),
      pack(nm('A notice board'), KIT.wp('Menu_Board_Wall_01', 1.2, -15.9, 's', 0.35)),
      pack(nm('A staff table'), pw('Table_Four_01', 0.9, -13.9, 's', { spots: 0 })),
      pack(nm('Chairs'), pw('Chair_Metal_Cafe_01', 0.4, -14.4, 's', { spots: 0 }), pw('Chair_Metal_Cafe_01', 1.4, -14.4, 's', { spots: 0 }), pw('Chair_Metal_Cafe_01', 0.4, -13.4, 'n', { spots: 0 }),
        pw('Chair_Metal_Cafe_01', 1.4, -13.4, 'n', { spots: 0 })),
      pack(nm('A cook on break'), { staff: [1.4, -13.35, 'n', 'sit'] }),
      pack(nm('A second table'), pw('Table_Cafe_Round_01', 2.8, -13.6, 's', { spots: 0 }), pw('Chair_Metal_Cafe_01', 2.8, -14.05, 's', { spots: 0 }), pw('Chair_Metal_Cafe_01', 2.8, -13.15, 'n', { spots: 0 })),
      pack(nm('A fridge and coffee'), pw('SM_Undercounter_Fridge_10', 0.0, -15.35, 's', { spots: 0, on: [['pw/SM_Coffee_Brewer_Airpot_01', 0, 0, 0, 0.46]] })),
      pack(nm('A server on break'), { staff: [2.8, -13.15, 'n', 'sit'] }),
      pack(nm('A coffee bar and a clock'), pw('CoffeeStation_15', 2.7, -15.35, 's', { spots: 0 }), KIT.wp('WallClock_Kitchen_01', -1.18, -13.9, 'b', 0.6))
    ]
  }
};

var room = KIT.room;
var low = KIT.low;
function flat(list) {
  return list.reduce(function (a, u) { return a.concat(u.piece); }, []);
}
var dish = strip('b', -8.8, -15.5, [
  ['Soiled dish table', 'SM_DishTable_Soiled_15', { s: 0 }],
  ['Dish machine', 'SM_DishMachine_Door_01', { s: 0 }],
  ['Clean dish table', 'SM_DishTable_Clean_15', { s: 0 }],
  ['Three bay sink', 'SM_Sink_3Comp_Drainboards_25', { s: 0 }]
]);
var dry = strip('s', -15.5, 3.7, [
  ['Shelving one', 'SM_Shelving_Wire_Loaded_12', { s: 0 }], ['Shelving two', 'SM_Shelving_Wire_Loaded_12', { s: 0 }], ['Shelving three', 'SM_Shelving_Wire_Loaded_12', { s: 0 }],
  ['Shelving four', 'SM_Shelving_Wire_Chrome_12', { s: 0 }], ['Dunnage rack', 'SM_DunnageRack_12', { s: 0 }], ['Shelving five', 'SM_Shelving_Wire_Loaded_12', { s: 0 }]
]);
// The building: a rounded shell 24 x 10 with the service annex behind it, the lot in front with the drive-up lane down the east
// side, the fenced yard behind. Every nested object is the diner's own
var SHELL = {
  kind: 'diner',
  front: -0.5, back: -10.5, edge: 13, wing: 13.4, sb: -18, lane: -11.3, annex: 9, corner: 1.3,
  nav: {
    grid: [-13, -10.6, 108, 42],
    walls: [[-14, -12.7, -11, 0], [12.7, 14, -11, 0], [-12.75, -12.3, -1.15, -0.4], [12.3, 12.75, -1.15, -0.4], [-12.75, -12.3, -10.4, -9.8], [12.3, 12.75, -10.4, -9.8]],
    back: [-13.3, 13.3, 99], front: [-13.3, 13.3, 13.3], gaps: []
  },
  lot: [3.8, 9.6], lotX: [-14.3, 12.8], walks: [-1.5, 1.5], aisle: 6.8, drive: 15.4, exit: -15.9, road: 20.8, curb: 10.2, yard: -23.5,
  yardRect: [-13.3, 13.3, -27.5], yardGate: [-26.5, -22.5], window: [-4.8, -1.2], pylon: [17.9, 8.9],
  stand: 0, busX: 6.5,
  // the rooms are in the annex behind the back wall, so nobody walks in from the floor
  wingDoor: { out: [0, -11.3], in: [0, -11.9] },
  spots: { lot: [0, 6.8], taxi: [0, 10], dock: [0, -22.5] },
  tags: { hall: [0, 1.3, -1.0], lot: [-4, 0.8, 6.8], taxi: [0, 1.2, 10.2], dock: [0, 1.0, -22.5] },
  garden: { rect: [-18.25, -13.25, -2.1, 2.86], gate: -15.75, till: [-14.7, 3.4], lane: -17.1 },
  bounds: [-26, 32, -32, 14], zoom: [8, 80], fit: 36, turn: Math.PI / 4,
  light: { target: [0, -8], at: [-19, 23, 9], box: [-30, 30, 32, -30] },
  nature: {
    zones: [
      { r: [-27.3, -20, -6, 9.4], tr: ['oak', 'lol'], t: 3, b: 10, g: 10, f: 8, k: 1.5 },
      { r: [22.6, 28, -30, 9.4], tr: ['col', 'oak'], t: 5, b: 8, g: 8, f: 6, k: 1.5 },
      { r: [-30, 30, -39, -29.5], tr: ['pine', 'col'], t: 16, b: 0, g: 0, f: 0, k: 0 },
      { r: [-30, -14.5, -29, -7], tr: ['pine', 'oak'], t: 5, b: 0, g: 0, f: 0, k: 0 }
    ],
    clear: [[16.8, 19, 8, 9.8]]
  }
};

var DECOR = {
  front: cat([
    KIT.tx('board.d_order', 0, -5.9, 2.0, 1.75),
    KIT.tx('board.d_welcome_dining', -4.0, -0.9, 1.0, 0.95),
    KIT.tx('board.d_welcome_takeout', 4.0, -0.9, 1.0, 0.95),
    { m: 'sub/planter', x: -4.9, z: -0.95, k: 0.6 }, { m: 'nature/plant_bushLarge', x: -4.9, z: -0.95, y: 0.4, k: 1.1, flat: 1 },
    { m: 'sub/planter', x: 4.9, z: -0.95, k: 0.6 }, { m: 'nature/plant_bushLarge', x: 4.9, z: -0.95, y: 0.4, k: 1.1, flat: 1 },
    pw('DrinkCooler_Upright_01', -6.8, -0.95, 'n', { spots: 0 }), pw('DrinkCooler_Upright_01', 6.8, -0.95, 'n', { spots: 0 })
  ]),
  // the receiving strip behind the rooms, where the dock doors open
  stock: cat(
    [pw('SM_Pallet_01', -6.0, -17.0, 's', { spots: 0 }), pw('SM_Pallet_01', -2.0, -17.0, 's', { spots: 0 }), pw('SM_Pallet_01', 2.0, -17.0, 's', { spots: 0 }), pw('SM_Pallet_01', 6.0, -17.0, 's', { spots: 0 }),
      pw('DeliveryBoxes_Dolly_01', -7.6, -16.6, 's', { spots: 0 }), pw('SM_PlatformTruck_01', 7.6, -16.6, 's', { spots: 0 }), pw('SM_BreadCrate_Stack_01', -4.0, -16.8, 's', { spots: 0 }),
      pw('SM_Sack_Stack_01', 4.0, -16.8, 's', { spots: 0 }), pw('SM_HandTruck_01', 0.0, -16.9, 0.5, { spots: 0 })]
  ),
  out: cat(
    [{ m: 'furn/bench', x: -4.5, z: 2.0, r: Math.PI, k: 1.5 }, { m: 'furn/bench', x: 4.5, z: 2.0, r: Math.PI, k: 1.5 },
      pw('Planter_Tall_01', -2.5, 2.2, 's', { spots: 0 }), pw('Planter_Tall_01', 2.5, 2.2, 's', { spots: 0 }), pw('SM_TrashCan_Steel_01', 7.0, 2.2, 's', { spots: 0 }),
      pw('SM_Sign_AFrame_Blank_01', -8.5, 1.0, 's', { spots: 0 })],
    // the bin corner of the yard, fenced on three sides
    [{ m: 'forest/fence', x: 7.5, z: -24.6, r: 0 }, { m: 'forest/fence', x: 8.5, z: -24.6, r: 0 }, { m: 'forest/fence', x: 9.5, z: -24.6, r: 0 },
      { m: 'forest/fence', x: 7.0, z: -25.1, r: Math.PI / 2 }, { m: 'forest/fence', x: 7.0, z: -26.1, r: Math.PI / 2 },
      { m: 'forest/fence', x: 10.0, z: -25.1, r: Math.PI / 2 }, { m: 'forest/fence', x: 10.0, z: -26.1, r: Math.PI / 2 },
      pw('SM_Dumpster_01', 8.0, -26.0, 'b', { spots: 0 }), pw('SM_Dumpster_01', 9.3, -26.0, 'b', { spots: 0 }),
      pw('SM_GreaseBin_Outdoor_01', -8.6, -19.6, 's', { spots: 0 }), pw('SM_PropaneTank_01', -12.2, -26.2, 's', { spots: 0 }), pw('SM_PropaneTank_01', -11.7, -26.2, 's', { spots: 0 }),
      pw('SM_TrashBin_Wheeled_01', -12.3, -21.0, 's', { spots: 0 }), pw('SM_RecycleBin_01', -11.6, -21.0, 's', { spots: 0 }), pw('SM_Pallet_01', -9.5, -24.0, 's', { spots: 0 }),
      KIT.tx('board.d_deliveries', 0.0, -19.2, 1.5, 1.1)]
  ),
  side: [],
  wing: cat(
    [room(-9, -5.2, -15.6, -12.0, 'tile'), room(-5.2, -1.2, -15.6, -12.0, 'tile'), room(-1.2, 3.4, -15.6, -12.0, 'boards'), room(3.4, 9, -15.6, -12.0, 'cream'), room(-9, 9, -18, -15.6, 'cream')],
    low(-5.3, -5.1, -15.6, -14.2), low(-5.3, -5.1, -13.4, -12.0), low(-1.3, -1.1, -15.6, -14.2), low(-1.3, -1.1, -13.4, -12.0), low(3.3, 3.5, -15.6, -14.2), low(3.3, 3.5, -13.4, -12.0),
    low(-9, -7.4, -12.1, -11.9), low(-6.6, -5.2, -12.1, -11.9), low(-5.2, -3.7, -12.1, -11.9), low(-2.7, -1.2, -12.1, -11.9), low(-1.2, 0.3, -12.1, -11.9), low(1.3, 3.4, -12.1, -11.9),
    low(3.4, 5.4, -12.1, -11.9), low(6.4, 9, -12.1, -11.9),
    flat(dish),
    [pw('SM_BusCart_01', -6.3, -15.2, 's', { spots: 0 }), pw('SM_DishRack_Stack_01', -6.8, -13.0, 's', { spots: 0 }), pw('SM_FloorSink_FullGrate_01', -7.2, -12.5, 's', { spots: 0 }),
      pw('SM_ServiceSink_Floor_01', -5.6, -15.3, 's', { spots: 0 }), pw('SM_GreaseInterceptor_01', -5.8, -12.6, 's', { spots: 0 })],
    flat(dry),
    [pw('SM_Sack_Stack_01', 8.0, -14.9, 's', { spots: 0 }), pw('SM_Sack_Stack_01', 8.5, -14.9, 's', { spots: 0 }), pw('SM_CanGoods_Case_01', 8.2, -13.0, 's', { spots: 0, n: 2 }),
      pw('SM_FoodBox_Bus_01', 7.4, -12.7, 's', { spots: 0 }), pw('SM_Sack_Flour_01', 8.6, -12.5, 's', { spots: 0 })]
  )
};

// what each Checkouts level adds besides tills, as in plan.js
var FRONT = [
  [2, 'pw/SM_TrayStand_Tray_01', -7.4, -1.1, 0], [2, 'pw/SM_TrayStand_Tray_01', -3.4, -1.1, 0], [2, 'pw/SM_TrayStand_Tray_01', 3.4, -1.1, 0], [2, 'pw/SM_TrayStand_Tray_01', 7.4, -1.1, 0],
  [4, 'pw/SM_TrashStation_Tray_01', -6.2, -0.95, Math.PI], [4, 'pw/SM_TrashStation_Tray_01', -5.7, -0.95, Math.PI],
  [8, 'pw/DrinkCooler_Upright_01', 5.9, -0.95, Math.PI], [8, 'pw/DrinkCooler_Upright_01', 6.45, -0.95, Math.PI], [8, 'pw/SM_Sign_AFrame_Blank_01', 5.3, -0.95, Math.PI], [8, 'pw/NewspaperRack_01', -3.0, -0.95, Math.PI],
  [10, 'pw/DiningBench_01', -2.4, -0.95, Math.PI], [10, 'pw/Planter_Tall_01', -3.4, -0.95, 0], [10, 'pw/Planter_Tall_01', -1.5, -0.95, 0]
];

SHELL.decor = { out: DECOR.out, stock: DECOR.stock };

export var DINER = Object.assign({}, PLAN, {
  type: 'diner',
  shell: SHELL,
  home: { x: -1, z: -5, w: 24 },
  areas: AREAS,
  order: Object.keys(AREAS),
  wing: WING,
  decor: DECOR,
  front: FRONT,
  patio: true,
  hall: [-13, 13, -10.5, -0.5],
  stock: [-9, 9, -18, -10.5],
  doors: [-8.2, 0.4, 8.4],
  docks: [-6, -2, 2, 6],
  idle: [-8.6, -6.6, -4.6, -2.6, 1.6, 3.6, 5.6, 7.6].map(function (x) { return [x, -11.8]; }),
  bank: { x: -6.75, z: -2.5, cross: -5.3, exit: -1.7, span: 6.4 },
  desk: { x: 9.6, z: -1.1, n: 2 },
  floor: [
    { r: [-13, 13, -10.5, -0.5], finish: 'cream' },
    { r: [-9, 9, -18, -10.5], finish: 0xd5d5d8 }
  ],
  tint: { wall: 0xffe8c8 },
  entrances: [
    { x: -1.5, w: 2.6, name: 'sign.d_dining', basket: [-2.65, -1.2], greeter: [-3.25, -1.25, Math.PI / 2] },
    { x: 1.5, w: 2.6, name: 'sign.d_takeout', basket: [0.35, -1.2], greeter: [-0.25, -1.25, Math.PI / 2] }
  ],
  laneM: [['pw/SM_Bar_Section_20', -0.15, -0.6, -Math.PI / 2], ['pw/SM_Bar_Section_10', -0.15, 0.15, -Math.PI / 2], ['pw/SM_POS_Terminal_01', -0.15, 0.2, -Math.PI / 2, 0.55]],
  laneRack: [['pw/LaneLight_Pole_01', -0.4, -1.12, 0], ['pw/SM_TrayStack_01', -0.15, 0.62, 0]],
  stackM: 'pw/SM_TrayStand_Tray_01',
  attM: 'pw/HostStand_01',
  deskM: 'pw/SM_ServerStation_01',
  deskBoard: 'board.d_pickup',
  wingBoard: 'board.d_kitchen',
  bankFloor: 0xe9dcc4,
  carry: { bag: ['pw/SM_TakeoutBag_01*1.4', 0.03], basket: ['pw/SM_TrayStack_01*0.8', 0.07], plant: ['pw/SM_Cup_Paper_Stack_01*1.3', 0.12] },
  models: ['pw/SM_Patio_Heater_01', 'pw/SM_Bar_Section_20', 'pw/SM_Bar_Section_10', 'pw/SM_POS_Terminal_01', 'pw/SM_TrayStack_01', 'pw/SM_TrayStand_Tray_01',
    'pw/SM_ServerStation_01', 'pw/SM_TakeoutBag_01', 'pw/SM_Cup_Paper_Stack_01', 'pw/Table_Cafe_Round_01', 'pw/Chair_Metal_Cafe_01']
});
