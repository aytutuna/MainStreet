// The Main Street Hardware and Auto store as data, in the style of diner.js: the shared building and checkout bank, with
// its own areas, wing rooms and decor. Pieces are laid out in runs: a strip is pieces side by side along a wall or an
// island, each placed by the size of its model, so a piece is a name and a model.
import { PLAN, PW, KIT } from './plan.js';

var up = KIT.up;
var pw = KIT.pw;
var rbox = KIT.rbox;
var lights = KIT.lights;
var pack = KIT.pack;
var cat = KIT.cat;
var SIGN = KIT.SIGN;
var HELP = KIT.HELP;

// the size in metres, width, depth and height, of every model used here, as the model files have them
var SZ = {
  Battery_Car_01: [0.27, 0.18, 0.229],
  CoffeeStation_15: [1.5, 0.665, 1.6],
  DiningBench_01: [1.4, 0.38, 0.46],
  EmployeeLockers_3_01: [0.9, 0.52, 1.798],
  FirstAid_Box_Wall_01: [0.3, 0.118, 0.3],
  GarageCab_Tall_05: [0.5, 0.495, 2],
  JerryCan_01: [0.355, 0.189, 0.47],
  Locker_Double_01: [0.76, 0.445, 1.8],
  Menu_Board_Wall_01: [1.52, 0.09, 0.7],
  NewspaperRack_01: [0.9, 0.365, 1.1],
  OilBottle_01: [0.1, 0.073, 0.235],
  OilJug_01: [0.21, 0.121, 0.285],
  PaintCan_01: [0.208, 0.178, 0.252],
  PalletJack_01: [0.54, 1.57, 1.2],
  PalletLoad_Cases_01: [1.207, 1.007, 1.5],
  PalletLoad_Water_01: [1.207, 1.007, 1.2],
  Pallet_01: [1.25, 1, 0.122],
  PartsBin_01: [0.15, 0.232, 0.12],
  Planter_Tall_01: [0.49, 0.48, 1.138],
  PropaneCage_01: [1.5, 0.845, 1.72],
  Register_Classic_01: [0.42, 0.487, 0.37],
  Rim_01: [0.41, 0.41, 0.206],
  SM_AngleGrinder_01: [0.32, 0.16, 0.113],
  SM_Anvil_Stump_01: [0.612, 0.38, 0.855],
  SM_BandSaw_01: [0.55, 0.515, 1.646],
  SM_BatteryCharger_01: [0.38, 0.257, 0.304],
  SM_BeltSander_Bench_01: [0.54, 0.353, 0.383],
  SM_BenchGrinder_01: [0.42, 0.245, 0.322],
  SM_BenchGrinder_Stand_01: [0.42, 0.36, 1.132],
  SM_BenchVise_01: [0.214, 0.236, 0.225],
  SM_BottleJack_01: [0.185, 0.142, 0.225],
  SM_BrakeRotor_01: [0.3, 0.3, 0.056],
  SM_Broom_Push_01: [0.6, 0.112, 1.45],
  SM_Bucket_01: [0.314, 0.301, 0.38],
  SM_CarLift_2Post_01: [3.4, 0.985, 2.873],
  SM_CarLift_Scissor_01: [1.914, 1.05, 0.55],
  SM_CarRamp_01: [0.903, 0.32, 0.221],
  SM_CaulkGun_01: [0.314, 0.182, 0.064],
  SM_ChopSaw_01: [0.52, 0.357, 0.415],
  SM_CircularSaw_01: [0.3, 0.22, 0.24],
  SM_Clamp_Bar_01: [0.62, 0.145, 0.09],
  SM_Clamp_C_01: [0.138, 0.306, 0.042],
  SM_Compressor_Pancake_01: [0.47, 0.465, 0.457],
  SM_Cooler_01: [0.62, 0.396, 0.4],
  SM_Crate_Plastic_01: [0.332, 0.33, 0.33],
  SM_Crate_Wood_01: [0.6, 0.4, 0.35],
  SM_Creeper_01: [1, 0.48, 0.123],
  SM_Dolly_Furniture_01: [0.75, 0.45, 0.15],
  SM_DrillPress_Floor_01: [0.418, 0.72, 1.66],
  SM_Drill_Cordless_01: [0.21, 0.073, 0.225],
  SM_DuctTape_01: [0.185, 0.13, 0.06],
  SM_Dumpster_01: [1.82, 1.169, 1.613],
  SM_DustCollector_01: [0.882, 0.532, 1.9],
  SM_EarMuffs_01: [0.222, 0.107, 0.191],
  SM_EngineBlock_V8_01: [0.67, 0.633, 0.65],
  SM_EngineHoist_01: [1.619, 1, 1.626],
  SM_EngineStand_01: [0.88, 0.748, 0.89],
  SM_Engine_OnStand_01: [0.92, 0.748, 1.05],
  SM_File_01: [0.3, 0.06, 0.06],
  SM_Flashlight_01: [0.202, 0.09, 0.092],
  SM_FloorFan_Drum_01: [0.77, 0.32, 0.83],
  SM_FloorJack_01: [0.7, 0.36, 0.964],
  SM_FloorMat_01: [0.9, 0.6, 0.036],
  SM_FoldingChair_01: [0.46, 0.559, 0.82],
  SM_Funnel_01: [0.19, 0.19, 0.205],
  SM_GarageCab_Base_Door_10: [1, 0.495, 0.88],
  SM_GarageCab_Base_Drawers_05: [0.5, 0.495, 0.88],
  SM_GarageCab_Top_10: [1, 0.532, 0.04],
  SM_GarageCab_Top_20: [2, 0.532, 0.04],
  SM_GardenTools_Rack_01: [1, 0.122, 1.54],
  SM_GasCan_Plastic_01: [0.307, 0.224, 0.341],
  SM_GasCylinder_01: [0.23, 0.227, 1.45],
  SM_Generator_Portable_01: [0.666, 0.492, 0.55],
  SM_GreaseGun_01: [0.43, 0.1, 0.234],
  SM_Hacksaw_01: [0.479, 0.137, 0.038],
  SM_Hammer_BallPeen_01: [0.32, 0.084, 0.061],
  SM_Hammer_Claw_01: [0.35, 0.151, 0.062],
  SM_HandSaw_01: [0.63, 0.155, 0.034],
  SM_HandTruck_01: [0.564, 0.52, 1.275],
  SM_Heater_Torpedo_01: [0.87, 0.34, 0.463],
  SM_HexKeys_01: [0.164, 0.09, 0.038],
  SM_HoseHanger_Garden_01: [0.443, 0.178, 0.443],
  SM_JackStand_01: [0.28, 0.25, 0.43],
  SM_Jigsaw_01: [0.216, 0.09, 0.205],
  SM_JumperCables_01: [0.387, 0.232, 0.102],
  SM_Lathe_Metal_01: [1.4, 0.606, 1.25],
  SM_LawnMower_01: [0.614, 1.5, 1],
  SM_Level_Box_01: [0.61, 0.047, 0.07],
  SM_LugWrench_Cross_01: [0.426, 0.357, 0.05],
  SM_Lumber_Stack_01: [2.396, 0.62, 0.356],
  SM_Mallet_Rubber_01: [0.325, 0.132, 0.078],
  SM_MiniFridge_01: [0.48, 0.535, 0.82],
  SM_MiterSaw_Stand_01: [2, 0.68, 1.294],
  SM_Muffler_01: [1.31, 0.298, 0.219],
  SM_OilCan_Squirt_01: [0.206, 0.117, 0.196],
  SM_OilDrainPan_01: [0.47, 0.41, 0.125],
  SM_OilDrain_Upright_01: [0.5, 0.53, 1.26],
  SM_OilyRagCan_01: [0.32, 0.359, 0.445],
  SM_OxyAcetylene_Cart_01: [0.536, 0.442, 1.482],
  SM_PaintBrush_01: [0.24, 0.052, 0.044],
  SM_PaintCan_Open_01: [0.228, 0.178, 0.219],
  SM_PaintRoller_01: [0.228, 0.31, 0.092],
  SM_PaintTray_01: [0.4, 0.28, 0.07],
  SM_ParkingStop_01: [1.8, 0.14, 0.106],
  SM_PartsWasher_01: [0.83, 0.58, 0.949],
  SM_Pliers_01: [0.189, 0.1, 0.033],
  SM_Pliers_Locking_01: [0.235, 0.087, 0.034],
  SM_PressureWasher_01: [0.538, 0.587, 0.984],
  SM_PropaneTank_01: [0.316, 0.316, 0.465],
  SM_PryBar_01: [0.618, 0.121, 0.03],
  SM_Radio_Jobsite_01: [0.308, 0.236, 0.318],
  SM_Rake_01: [0.406, 1.57, 0.084],
  SM_Ratchet_01: [0.392, 0.088, 0.063],
  SM_RecycleBin_01: [0.6, 0.45, 0.36],
  SM_SafetyGlasses_01: [0.166, 0.154, 0.054],
  SM_SandblastCabinet_01: [0.96, 0.725, 1.45],
  SM_Sander_Orbital_01: [0.155, 0.161, 0.144],
  SM_Sawhorse_Folding_01: [0.7, 0.57, 0.756],
  SM_Sawhorse_Wood_01: [0.9, 0.557, 0.76],
  SM_Screwdriver_Flat_01: [0.248, 0.065, 0.067],
  SM_Screwdriver_Phillips_01: [0.223, 0.065, 0.067],
  SM_Shelving_HD_Loaded_01: [1.83, 0.61, 1.8],
  SM_ShopPress_01: [0.75, 0.6, 1.68],
  SM_ShopStool_01: [0.4, 0.4, 0.62],
  SM_ShopVac_Drum_01: [0.618, 0.59, 0.72],
  SM_Shovel_01: [0.26, 1.446, 0.08],
  SM_Sign_AFrame_Blank_01: [0.6, 0.634, 0.963],
  SM_SocketSet_Case_01: [0.4, 0.572, 0.057],
  SM_SprayCan_01: [0.09, 0.09, 0.218],
  SM_Square_Framing_01: [0.6, 0.4, 0.014],
  SM_StepLadder_01: [0.46, 0.6, 1.036],
  SM_Strut_Spring_01: [0.204, 0.194, 0.556],
  SM_TableSaw_01: [1.1, 0.83, 0.965],
  SM_TapeMeasure_01: [0.117, 0.06, 0.082],
  SM_TireChanger_01: [1, 0.946, 1.82],
  SM_Tire_01: [0.65, 0.65, 0.22],
  SM_ToolBag_01: [0.44, 0.28, 0.321],
  SM_ToolChest_Stack_01: [0.725, 0.539, 1.262],
  SM_ToolChest_Top_01: [0.695, 0.429, 0.4],
  SM_Tote_Lidded_01: [0.614, 0.422, 0.352],
  SM_Tote_Stack_01: [0.614, 0.422, 1.052],
  SM_TrashBin_Wheeled_01: [0.62, 0.748, 1],
  SM_TrashCan_Steel_01: [0.503, 0.476, 0.707],
  SM_TroubleLight_01: [0.425, 0.125, 0.191],
  SM_UtilityKnife_01: [0.185, 0.045, 0.039],
  SM_WalkIn_StripCurtain_01: [0.86, 0.075, 1.95],
  SM_Welder_MIG_01: [0.606, 0.865, 0.89],
  SM_Welder_Stick_01: [0.36, 0.51, 0.421],
  SM_WeldingHelmet_01: [0.26, 0.306, 0.32],
  SM_WeldingTable_01: [1.2, 0.6, 0.852],
  SM_WheelBalancer_01: [1.123, 0.62, 1.17],
  SM_Wheel_Steel_01: [0.65, 0.226, 0.65],
  SM_Wheelbarrow_01: [0.69, 1.481, 0.656],
  SM_WorkGloves_01: [0.222, 0.238, 0.08],
  SM_Workbench_Backboard_01: [1.8, 0.697, 1.6],
  SM_Workbench_Steel_01: [1.51, 0.613, 0.9],
  SM_Wrench_Combo_01: [0.195, 0.062, 0.022],
  ShopClock_01: [0.32, 0.066, 0.32],
  ShopStool_Rolling_01: [0.433, 0.431, 0.42],
  Table_Cafe_Round_01: [0.8, 0.8, 0.75],
  TimeClock_Wall_01: [0.37, 0.117, 0.4],
  TireRack_Wall_01: [1.22, 0.652, 0.7],
  Tire_Stack_01: [0.685, 0.695, 0.88],
  ToolChest_Roller_01: [0.692, 0.472, 0.862],
  TrashRecycle_Station_01: [1, 0.583, 1.1],
  VendingMachine_Drink_01: [0.95, 0.863, 1.83],
  WetFloorSign_01: [0.28, 0.523, 0.655],
  Wheel_01: [0.65, 0.228, 0.65],
  Workbench_Steel_01: [1.51, 0.613, 0.9],
  Workbench_Wood_01: [1.8, 0.644, 0.9]
};

// a piece's name is a text of its own: piece.hn_ and the words
function nm(en) {
  return tl('piece.hn_' + en.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, ''));
}

var FACE = { s: [0, 1], n: [0, -1], b: [1, 0], k: [-1, 0] };
var TURN = { s: 0, b: Math.PI / 2, n: Math.PI, k: -Math.PI / 2 };

// A run of pieces facing `face`, from `from` along the wall: their backs on `line` (their middles with d.mid). A piece
// is [name, model, options]: s the places to look at it (1 at its front, 2 on both sides, 0 none; the run's own default
// is d.s, else 1), on goods standing on it [model, along, out, scale, height], top models standing on it [model], gap
// before it, n copies side by side, y raised
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
    at += o.gap !== undefined ? o.gap : d.gap || 0;
    var mid = at + w / 2;
    at += w;
    var back = d.mid ? 0 : dp / 2;
    var x = vert ? line + f[0] * back : mid;
    var z = vert ? mid : line + f[1] * back;
    var po = { spots: o.s !== undefined ? o.s : d.s !== undefined ? d.s : 1 };
    if (o.n) po.n = o.n;
    if (o.y) po.y = o.y;
    if (o.on) po.on = o.on.map(function (g) { return [g[0], g[1], g[2], 0, g[4] === undefined ? s[2] * PW : g[4], g[3] || 1]; });
    var u = up(nm(e[0]), pw(e[1], x, z, face, po));
    (o.top || []).forEach(function (t) {
      u.piece.push({ m: 'pw/' + t[0], x: x, z: z, r: TURN[face], k: t[1] || 1, y: s[2] * PW, flat: 1 });
    });
    u.at = { x: x, z: z, face: face, h: s[2] * PW, w: w };
    return u;
  });
}

// models standing on a piece of a strip, each [model, along the run, out toward the front, scale]
function tools(base, name, list, y) {
  var a = base.at;
  var f = FACE[a.face];
  return up.apply(null, [nm(name)].concat(list.map(function (t) {
    var x = f[0] ? a.x + f[0] * (t[2] || 0) : a.x + t[1];
    var z = f[0] ? a.z + t[1] : a.z + f[1] * (t[2] || 0);
    return { m: 'pw/' + t[0], x: x, z: z, r: t[4] === undefined ? TURN[a.face] : t[4], k: t[3] || 1, y: y === undefined ? a.h : y, flat: 1 };
  })));
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
// a model that takes no room of its own and may hang in the air: a lamp
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
// a show piece on a table
function plinth(name, table, x, z, face, goods) {
  return up.apply(null, [nm(name), { sign: 'gold' }, pw(table, x, z, face, { spots: 0 })].concat(goods.map(function (g) {
    return { m: 'pw/' + g[0] + GOLD, x: x + (g[1] || 0), z: z + (g[2] || 0), r: TURN[face], k: g[3] || 1, y: 0.45, flat: 1 };
  })));
}
// a show piece on a pallet, raised to the pallet's top: n pallets side by side
function dais(name, ref, x, z, o) {
  return up(nm(name), { sign: 'gold' }, pw('Pallet_01', x, z, 's', { spots: 0, n: o.n }), { m: 'pw/' + ref + GOLD, x: x, z: z, r: TURN[o.face || 's'], k: o.k, y: 0.061, flat: 1 });
}
// a floor piece of one or more entries
function floorSet(name, list) {
  return up.apply(null, [nm(name)].concat(list));
}

// goods of the benches: on a bench top at 0.45
var BT = 0.45;
// the show pieces are tinted gold
var GOLD = '%=gold';

var AREAS = {};

// The hall's seven bays stand side by side, each 4.4 wide with an aisle between, from the tall racking at the back to the
// front aisle; every department's pieces run front to back in three runs. Lawn and Garden has its bay in the garden center
var BX = [-17.8, -12.6, -7.4, -2.2, 3.0, 8.2, 13.4];
var BZ0 = -23.2;
var BZF = -15.5;
var LX = -25.0;
var LZ0 = -16.8;
var LZF = -8.6;
var BAYC = { hand: 0x2f5fa8, paint: 0x1f8f6a, power: 0x6a3f9a, tires: 0xc9a227, oil: 0xb5651d, batt: 0xc0392b, storage: 0x6b4a32, lawn: 0xb9ad94 };

// Hand tools: tool walls and benches along the back wall, a row of roller chests, a bench row with the small tools
var ha0 = strip('b', BX[0] + 0.05, BZ0 + 0.4, [
  ['Tool wall', 'SM_Workbench_Backboard_01', { on: [['pw/SM_Hammer_Claw_01', -0.28, 0.05, 1.8, BT], ['pw/SM_Wrench_Combo_01', 0, 0.05, 2.4, BT], ['pw/SM_Pliers_01', 0.28, 0.05, 2.2, BT]] }],
  ['Wrench bench', 'SM_Workbench_Steel_01', { gap: 0.08, on: [['pw/SM_SocketSet_Case_01', -0.2, 0, 1], ['pw/SM_Ratchet_01', 0.2, 0.05, 2]] }],
  ['Saw bench', 'Workbench_Wood_01', { gap: 0.08, on: [['pw/SM_HandSaw_01', -0.22, 0, 1.4], ['pw/SM_Hacksaw_01', 0.24, 0.05, 1.4]] }],
  ['Tall tool cabinet', 'GarageCab_Tall_05', { gap: 0.08 }],
  ['Second tool wall', 'SM_Workbench_Backboard_01', { gap: 0.08, on: [['pw/SM_Hammer_BallPeen_01', -0.28, 0.05, 1.8, BT], ['pw/SM_UtilityKnife_01', 0, 0.05, 2.4, BT], ['pw/SM_Mallet_Rubber_01', 0.28, 0.05, 1.8, BT]] }],
  ['Measuring bench', 'SM_Workbench_Steel_01', { gap: 0.08, on: [['pw/SM_TapeMeasure_01', -0.25, 0, 2.4], ['pw/SM_Level_Box_01', 0.12, 0.05, 1.6]] }],
  ['Clamp bench', 'Workbench_Wood_01', { gap: 0.08, on: [['pw/SM_Clamp_Bar_01', -0.2, 0, 1.7], ['pw/SM_Clamp_C_01', 0.2, 0, 2.4]] }]
]);
var ha1 = strip('b', BX[0] + 1.75, BZ0 + 0.9, [
  ['Roller chest', 'ToolChest_Roller_01'],
  ['Chest with top box', 'ToolChest_Roller_01', { gap: 0.5, top: [['SM_ToolChest_Top_01']] }],
  ['Chest stack', 'SM_ToolChest_Stack_01', { gap: 0.5 }],
  ['Chest and drill', 'ToolChest_Roller_01', { gap: 0.5, on: [['pw/SM_Drill_Cordless_01', 0, 0, 2.2]] }],
  ['Tote island', 'SM_Tote_Stack_01', { gap: 0.5, n: 2 }]
], { mid: true, s: 2 });
var ha2 = strip('k', BX[0] + 3.65, BZ0 + 0.6, [
  ['Sawhorse', 'SM_Sawhorse_Wood_01'],
  ['Display bench', 'Workbench_Wood_01', { gap: 0.4 }],
  ['Plier bench', 'SM_Workbench_Steel_01', { gap: 0.4 }]
], { mid: true });
var hand2 = [ha2[0], tools(ha2[0], 'Level and square', [['SM_Level_Box_01', 0, 0, 1.6], ['SM_Square_Framing_01', 0.15, 0, 1]]), ha2[1],
  tools(ha2[1], 'Screwdriver set', [['SM_Screwdriver_Flat_01', -0.3, 0.08, 2], ['SM_Screwdriver_Phillips_01', -0.04, 0.08, 2.2], ['SM_File_01', 0.22, 0.08, 1.4]]),
  tools(ha2[1], 'Hex keys and pry bar', [['SM_HexKeys_01', -0.25, -0.08, 2.4], ['SM_PryBar_01', 0.15, -0.08, 1]]), ha2[2],
  tools(ha2[2], 'Pliers and cutters', [['SM_Pliers_01', -0.23, 0, 2], ['SM_Pliers_Locking_01', 0.0, 0, 1.8], ['SM_UtilityKnife_01', 0.27, 0, 2]])];
AREAS.hand = {
  cx: BX[0] + 2.2, cz: (BZ0 + BZF) / 2, vacant: [BX[0], BX[0] + 4.4, BZ0, BZF], sign: [BX[0] + 2.2, BZF - 0.7, 1.9],
  floor: [floor(BX[0], BX[0] + 4.4, BZ0, BZF, BAYC.hand)],
  ups: compose([
    ha0,
    ha1,
    hand2,
    [SIGN, board('Hand tools board', 'board.h_hand', BX[0] + 3.7, BZF - 0.35, 1.1, 0.95), lights([[BX[0] + 1.0, BZ0 + 3.7], [BX[0] + 3.3, BZ0 + 7.7]]),
      floorSet('Tool trolley', [pw('ToolChest_Roller_01', BX[0] + 0.55, BZF - 0.6, 'b', { spots: 0 }), { m: 'pw/SM_ToolChest_Top_01', x: BX[0] + 0.55, z: BZF - 0.6, r: 0, y: 0.431, flat: 1 }]),
      dais('Golden tool chest', 'SM_ToolChest_Stack_01', BX[0] + 3.2, BZF - 2.4, { k: 1.2 })],
    [put('Shop mat', 'SM_FloorMat_01', BX[0] + 2.2, BZF - 0.25, 's', { spots: 0 }), put('Rolling stool', 'ShopStool_Rolling_01', BX[0] + 0.6, BZF - 1.6, 's', { spots: 0 }), put('Steel bin', 'SM_TrashCan_Steel_01', BX[0] + 4.0, BZF - 0.3, 's', { spots: 0 }), put('Wet floor sign', 'WetFloorSign_01', BX[0] + 1.4, BZF - 0.3, 's', { spots: 0 })],
    [staff('Tool clerk', BX[0] + 1.15, BZF - 1.8, 'b'), HELP]
  ])
};

// Paint and supplies: paint shelving on the back wall, mixing benches in the middle
var pa0 = strip('b', BX[1] + 0.05, BZ0 + 0.4, [
  ['Paint shelf one', 'SM_Shelving_HD_Loaded_01'],
  ['Paint shelf two', 'SM_Shelving_HD_Loaded_01', { gap: 0.05 }],
  ['Mixing bench', 'Workbench_Wood_01', { gap: 0.3, on: [['pw/SM_PaintCan_Open_01', -0.25, 0, 2], ['pw/PaintCan_01', 0.0, 0, 2], ['pw/SM_PaintBrush_01', 0.28, 0, 2.2]] }],
  ['Paint shelf three', 'SM_Shelving_HD_Loaded_01', { gap: 0.3 }],
  ['Paint cabinet', 'GarageCab_Tall_05', { gap: 0.05 }],
  ['Paint shelf four', 'SM_Shelving_HD_Loaded_01', { gap: 0.3 }],
  ['Brush bench', 'SM_Workbench_Steel_01', { gap: 0.3, on: [['pw/SM_PaintBrush_01', -0.22, 0, 2.2], ['pw/SM_PaintRoller_01', 0.15, 0, 1.8]] }]
]);
var pa1 = strip('b', BX[1] + 1.75, BZ0 + 0.9, [
  ['Paint can table', 'Workbench_Wood_01', { on: [['pw/PaintCan_01', -0.28, 0, 1.8], ['pw/SM_PaintCan_Open_01', 0, 0, 1.8], ['pw/PaintCan_01', 0.28, 0, 1.8]] }],
  ['Tray sawhorse', 'SM_Sawhorse_Folding_01', { gap: 0.4, on: [['pw/SM_PaintTray_01', 0, 0, 1.4, 0.38]] }],
  ['Roller bench', 'SM_Workbench_Steel_01', { gap: 0.4, on: [['pw/SM_PaintRoller_01', -0.18, 0, 1.8], ['pw/SM_PaintBrush_01', 0.2, 0, 2.4]] }],
  ['Drop cloth totes', 'SM_Tote_Stack_01', { gap: 0.4, n: 2 }],
  ['Lumber trestle', 'SM_Sawhorse_Wood_01', { gap: 0.4, top: [['SM_Lumber_Stack_01', 0.45]] }]
], { mid: true, s: 2 });
var pa2 = strip('k', BX[1] + 3.65, BZ0 + 0.6, [
  ['Caulk bench', 'Workbench_Wood_01'],
  ['Step ladder', 'SM_StepLadder_01', { gap: 0.4 }],
  ['Bucket bench', 'SM_Workbench_Steel_01', { gap: 0.4 }],
  ['Safety gear bench', 'Workbench_Wood_01', { gap: 0.4 }]
], { mid: true });
var paint2 = [pa2[0], tools(pa2[0], 'Caulk guns', [['SM_CaulkGun_01', -0.25, 0, 1.5], ['SM_CaulkGun_01', 0.0, 0.04, 1.5], ['SM_DuctTape_01', 0.3, 0, 2]]), pa2[1], pa2[2],
  tools(pa2[2], 'Buckets', [['SM_Bucket_01', -0.15, 0, 1.2], ['SM_Bucket_01', 0.2, 0, 1.2]]), pa2[3],
  tools(pa2[3], 'Gloves and goggles', [['SM_WorkGloves_01', -0.25, 0, 1.8], ['SM_SafetyGlasses_01', 0, 0, 2], ['SM_EarMuffs_01', 0.25, 0, 1.8]])];
AREAS.paint = {
  cx: BX[1] + 2.2, cz: (BZ0 + BZF) / 2, vacant: [BX[1], BX[1] + 4.4, BZ0, BZF], sign: [BX[1] + 2.2, BZF - 0.7, 1.9],
  floor: [floor(BX[1], BX[1] + 4.4, BZ0, BZF, BAYC.paint)],
  ups: compose([
    pa0,
    pa1,
    paint2,
    [SIGN, board('Paint board', 'board.h_paint', BX[1] + 3.7, BZF - 0.35, 1.1, 0.95), lights([[BX[1] + 1.0, BZ0 + 3.7], [BX[1] + 3.3, BZ0 + 7.7]]),
      floorSet('Extra ladder', [pw('SM_StepLadder_01', BX[1] + 0.5, BZF - 0.8, 's', { spots: 0 })]),
      plinth('Golden paint can', 'Workbench_Wood_01', BX[1] + 3.3, BZF - 2.4, 's', [['SM_PaintCan_Open_01', 0, 0, 3.4]])],
    [put('Shop mat', 'SM_FloorMat_01', BX[1] + 2.2, BZF - 0.25, 's', { spots: 0 }), put('Rag can', 'SM_OilyRagCan_01', BX[1] + 4.0, BZF - 0.3, 's', { spots: 0 }), put('Steel bin', 'SM_TrashCan_Steel_01', BX[1] + 0.4, BZF - 0.3, 's', { spots: 0 }), put('Wet floor sign', 'WetFloorSign_01', BX[1] + 1.4, BZF - 0.3, 's', { spots: 0 })],
    [staff('Paint clerk', BX[1] + 1.15, BZF - 1.8, 'b'), HELP]
  ])
};

// Oil and fluids: shelves along the east wall, benches and drums in the middle
var oi0 = strip('b', BX[4] + 0.05, BZ0 + 0.4, [
  ['Oil shelf one', 'SM_Shelving_HD_Loaded_01'],
  ['Oil shelf two', 'SM_Shelving_HD_Loaded_01', { gap: 0.05 }],
  ['Tote stack', 'SM_Tote_Stack_01', { gap: 0.3 }],
  ['Oil shelf three', 'SM_Shelving_HD_Loaded_01', { gap: 0.3 }],
  ['Fluid cabinet', 'GarageCab_Tall_05', { gap: 0.05 }],
  ['Oil shelf four', 'SM_Shelving_HD_Loaded_01', { gap: 0.3 }],
  ['Oil shelf five', 'SM_Shelving_HD_Loaded_01', { gap: 0.05 }]
]);
var oi1 = strip('b', BX[4] + 1.75, BZ0 + 0.9, [
  ['Oil table', 'Workbench_Wood_01', { on: [['pw/OilJug_01', -0.28, 0, 2], ['pw/OilJug_01', 0, 0, 2], ['pw/OilBottle_01', 0.28, 0, 2.6]] }],
  ['Oil drain', 'SM_OilDrain_Upright_01', { gap: 0.4 }],
  ['Grease bench', 'SM_Workbench_Steel_01', { gap: 0.4, on: [['pw/SM_GreaseGun_01', -0.17, 0, 1.6], ['pw/SM_OilCan_Squirt_01', 0.2, 0, 2.2]] }],
  ['Jerry can pallet', 'Pallet_01', { gap: 0.4, on: [['pw/JerryCan_01', -0.24, 0, 1.1, 0.061], ['pw/JerryCan_01', 0.0, 0, 1.1, 0.061], ['pw/JerryCan_01', 0.24, 0, 1.1, 0.061]] }],
  ['Gas can pallet', 'Pallet_01', { gap: 0.4, on: [['pw/SM_GasCan_Plastic_01', -0.24, 0, 1.2, 0.061], ['pw/SM_GasCan_Plastic_01', 0, 0, 1.2, 0.061], ['pw/SM_GasCan_Plastic_01', 0.24, 0, 1.2, 0.061]] }]
], { mid: true, s: 2 });
var oi2 = strip('k', BX[4] + 3.65, BZ0 + 0.6, [
  ['Spray bench', 'SM_Workbench_Steel_01'],
  ['Gas bench', 'Workbench_Wood_01', { gap: 0.4 }],
  ['Plastic crates', 'SM_Crate_Plastic_01', { gap: 0.4, n: 3 }],
  ['Rag can', 'SM_OilyRagCan_01', { gap: 0.4 }]
], { mid: true });
var oil2 = [oi2[0], tools(oi2[0], 'Spray cans', [['SM_SprayCan_01', -0.22, 0, 2], ['SM_SprayCan_01', 0, 0, 2], ['SM_SprayCan_01', 0.22, 0, 2]]), oi2[1],
  tools(oi2[1], 'Gas cans', [['SM_GasCan_Plastic_01', -0.33, 0, 1.2], ['SM_GasCan_Plastic_01', 0.35, 0, 1.2]]),
  tools(oi2[1], 'Funnels and drain pan', [['SM_Funnel_01', -0.1, 0.02, 1.6], ['SM_OilDrainPan_01', 0.12, 0.02, 1]]), oi2[2], oi2[3]];
AREAS.oil = {
  cx: BX[4] + 2.2, cz: (BZ0 + BZF) / 2, vacant: [BX[4], BX[4] + 4.4, BZ0, BZF], sign: [BX[4] + 2.2, BZF - 0.7, 1.9],
  floor: [floor(BX[4], BX[4] + 4.4, BZ0, BZF, BAYC.oil)],
  ups: compose([
    oi0,
    oi1,
    oil2,
    [SIGN, board('Oil board', 'board.h_oil', BX[4] + 3.7, BZF - 0.35, 1.1, 0.95), lights([[BX[4] + 1.0, BZ0 + 3.7], [BX[4] + 3.3, BZ0 + 7.7]]),
      floorSet('Shop fan', [pw('SM_FloorFan_Drum_01', BX[4] + 0.7, BZF - 0.8, 'b', { spots: 0 })]),
      plinth('Golden oil jug', 'Workbench_Steel_01', BX[4] + 3.3, BZF - 2.4, 'k', [['OilJug_01', 0, 0, 3], ['OilBottle_01', 0, -0.28, 2.6], ['OilBottle_01', 0, 0.28, 2.6]])],
    [put('Shop mat', 'SM_FloorMat_01', BX[4] + 2.2, BZF - 0.25, 's', { spots: 0 }), put('Rag can', 'SM_OilyRagCan_01', BX[4] + 4.0, BZF - 0.3, 's', { spots: 0 }), put('Steel bin', 'SM_TrashCan_Steel_01', BX[4] + 0.4, BZF - 0.3, 's', { spots: 0 }), put('Wet floor sign', 'WetFloorSign_01', BX[4] + 1.4, BZF - 0.3, 's', { spots: 0 })],
    [staff('Oil clerk', BX[4] + 1.15, BZF - 1.8, 'b'), HELP]
  ])
};

// Batteries and parts: shelves and cabinets on the east wall, battery benches, engines on stands
var ba0 = strip('b', BX[5] + 0.05, BZ0 + 0.4, [
  ['Battery shelf one', 'SM_Shelving_HD_Loaded_01'],
  ['Battery shelf two', 'SM_Shelving_HD_Loaded_01', { gap: 0.05 }],
  ['Tall parts cabinet', 'GarageCab_Tall_05', { gap: 0.2 }],
  ['Drawer cabinet', 'SM_GarageCab_Base_Drawers_05', { gap: 0.05 }],
  ['Locker', 'Locker_Double_01', { gap: 0.2 }],
  ['Door cabinet', 'SM_GarageCab_Base_Door_10', { gap: 0.05 }],
  ['Parts totes', 'SM_Tote_Stack_01', { gap: 0.15 }]
]);
var ba1 = strip('b', BX[5] + 1.75, BZ0 + 0.9, [
  ['Battery bench', 'Workbench_Wood_01', { on: [['pw/Battery_Car_01', -0.28, 0, 1.6], ['pw/Battery_Car_01', 0, 0, 1.6], ['pw/Battery_Car_01', 0.28, 0, 1.6]] }],
  ['Charger bench', 'SM_Workbench_Steel_01', { gap: 0.125, on: [['pw/SM_BatteryCharger_01', -0.2, 0, 1.2], ['pw/SM_JumperCables_01', 0.2, 0, 1.6]] }],
  ['Rotor bench', 'SM_Workbench_Steel_01', { gap: 0.125, on: [['pw/SM_BrakeRotor_01', -0.2, 0, 1.6], ['pw/SM_BrakeRotor_01', 0.2, 0, 1.6]] }],
  ['Muffler bench', 'SM_Workbench_Steel_01', { gap: 0.125, on: [['pw/SM_Muffler_01', 0, 0, 1.2]] }],
  ['Spring bench', 'SM_Workbench_Steel_01', { gap: 0.125, on: [['pw/SM_Strut_Spring_01', -0.2, 0, 2], ['pw/SM_Strut_Spring_01', 0.2, 0, 2]] }]
], { mid: true, s: 2 });
var ba2 = strip('k', BX[5] + 3.65, BZ0 + 0.6, [
  ['Engine on stand', 'SM_Engine_OnStand_01'],
  ['Engine bench', 'SM_Workbench_Steel_01', { gap: 0.2 }],
  ['Engine stand', 'SM_EngineStand_01', { gap: 0.2 }],
  ['Engine hoist', 'SM_EngineHoist_01', { gap: 0.2 }],
  ['Parts washer', 'SM_PartsWasher_01', { gap: 0.2 }]
], { mid: true });
var batt2 = [ba2[0], ba2[1], tools(ba2[1], 'V8 block', [['SM_EngineBlock_V8_01', 0, 0, 0.7]]), ba2[2], ba2[3], ba2[4],
  tools(ba2[1], 'Trouble lights', [['SM_TroubleLight_01', -0.28, 0, 0.8], ['SM_Flashlight_01', 0.27, 0, 2]])];
AREAS.batt = {
  cx: BX[5] + 2.2, cz: (BZ0 + BZF) / 2, vacant: [BX[5], BX[5] + 4.4, BZ0, BZF], sign: [BX[5] + 2.2, BZF - 0.7, 1.9],
  floor: [floor(BX[5], BX[5] + 4.4, BZ0, BZF, BAYC.batt)],
  ups: compose([
    ba0,
    ba1,
    batt2,
    [SIGN, board('Parts board', 'board.h_batt', BX[5] + 3.7, BZF - 0.35, 1.1, 0.95), lights([[BX[5] + 1.0, BZ0 + 3.7], [BX[5] + 3.3, BZ0 + 7.7]]),
      floorSet('Spare totes', [pw('SM_Tote_Stack_01', BX[5] + 0.7, BZF - 0.8, 'b', { spots: 0, n: 2 })]),
      up(nm('Golden engine'), { sign: 'gold' }, pw('SM_EngineStand_01' + GOLD, BX[5] + 3.3, BZF - 2.4, 'k', { spots: 0 }), { m: 'pw/SM_EngineBlock_V8_01' + GOLD, x: BX[5] + 3.3, z: BZF - 2.4, r: TURN.k, k: 1, y: 0.445, flat: 1 })],
    [put('Shop mat', 'SM_FloorMat_01', BX[5] + 2.2, BZF - 0.25, 's', { spots: 0 }), put('Rolling stool', 'ShopStool_Rolling_01', BX[5] + 0.6, BZF - 1.6, 's', { spots: 0 }), put('Steel bin', 'SM_TrashCan_Steel_01', BX[5] + 4.0, BZF - 0.3, 's', { spots: 0 }), put('Wet floor sign', 'WetFloorSign_01', BX[5] + 1.4, BZF - 0.3, 's', { spots: 0 })],
    [staff('Parts clerk', BX[5] + 1.15, BZF - 1.8, 'b'), HELP]
  ])
};

// Lawn and garden: tool racks on the east wall, mowers and barrows in the middle
var la0 = strip('b', LX + 0.05, LZ0 + 0.4, [
  ['Garden tool rack', 'SM_GardenTools_Rack_01', { y: 0.15 }],
  ['Second tool rack', 'SM_GardenTools_Rack_01', { y: 0.15, gap: 0.05 }],
  ['Hose hangers', 'SM_HoseHanger_Garden_01', { y: 0.45, gap: 0.2, n: 2 }],
  ['Wheeled bin', 'SM_TrashBin_Wheeled_01', { gap: 0.3 }],
  ['Second wheeled bin', 'SM_TrashBin_Wheeled_01', { gap: 0.05 }],
  ['Recycle bin', 'SM_RecycleBin_01', { gap: 0.2 }],
  ['Third tool rack', 'SM_GardenTools_Rack_01', { y: 0.15, gap: 0.2 }]
]);
var la1 = strip('b', LX + 1.75, LZ0 + 0.9, [
  ['Lawn mower', 'SM_LawnMower_01'],
  ['Wheelbarrow', 'SM_Wheelbarrow_01', { gap: 0.4 }],
  ['Hand truck', 'SM_HandTruck_01', { gap: 0.4 }],
  ['Second mower', 'SM_LawnMower_01', { gap: 0.4 }],
  ['Second wheelbarrow', 'SM_Wheelbarrow_01', { gap: 0.4 }]
], { mid: true, s: 2 });
var la2 = strip('k', LX + 3.65, LZ0 + 0.6, [
  ['Garden bench', 'Workbench_Wood_01'],
  ['Folding chairs', 'SM_FoldingChair_01', { gap: 0.4, n: 3 }],
  ['Coolers', 'SM_Cooler_01', { gap: 0.4, n: 2 }],
  ['Propane tanks', 'SM_PropaneTank_01', { gap: 0.4, n: 3 }],
  ['Furniture dolly', 'SM_Dolly_Furniture_01', { gap: 0.4 }]
], { mid: true });
var lawn2 = [la2[0], tools(la2[0], 'Rake and shovel', [['SM_Rake_01', 0, -0.08, 0.9, 0], ['SM_Shovel_01', 0, 0.08, 0.9, 0]]), la2[1], la2[2], la2[3], la2[4],
  tools(la2[2], 'Work lights', [['SM_Flashlight_01', -0.15, 0, 2], ['SM_Flashlight_01', 0.15, 0, 2]])];
AREAS.lawn = {
  cx: LX + 2.2, cz: (LZ0 + LZF) / 2, vacant: [LX, LX + 4.4, LZ0, LZF], sign: [LX + 2.2, LZF - 0.7, 1.9],
  floor: [floor(LX, LX + 4.4, LZ0, LZF, BAYC.lawn)],
  ups: compose([
    la0,
    la1,
    lawn2,
    [SIGN, board('Lawn board', 'board.h_lawn', LX + 3.7, LZF - 0.35, 1.1, 0.95), lights([[LX + 1.0, LZ0 + 2.5], [LX + 3.3, LZ0 + 5.5]]),
      floorSet('Garden ladder', [pw('SM_StepLadder_01', LX + 0.5, LZF - 0.8, 'k', { spots: 0 })]),
      dais('Golden mower', 'SM_LawnMower_01', LX + 3.2, LZF - 2.4, { n: 2, k: 1.2, face: 'k' })],
    [put('Shop mat', 'SM_FloorMat_01', LX + 2.2, LZF - 0.25, 's', { spots: 0 }), put('Steel bin', 'SM_TrashCan_Steel_01', LX + 4.0, LZF - 0.3, 's', { spots: 0 }), put('Broom', 'SM_Broom_Push_01', LX + 0.4, LZF - 0.3, 's', { spots: 0 }), put('Wet floor sign', 'WetFloorSign_01', LX + 1.4, LZF - 0.3, 's', { spots: 0 })],
    [staff('Garden clerk', LX + 1.15, LZF - 1.8, 'b'), HELP]
  ])
};

// Power tools: benches and machines in rows across the middle
var po0 = strip('b', BX[2] + 0.05, BZ0 + 0.4, [
  ['Miter saw station', 'SM_MiterSaw_Stand_01'],
  ['Table saw', 'SM_TableSaw_01', { gap: 0.15 }],
  ['Band saw', 'SM_BandSaw_01', { gap: 0.15 }],
  ['Drill press', 'SM_DrillPress_Floor_01', { gap: 0.15 }],
  ['Grinder stand', 'SM_BenchGrinder_Stand_01', { gap: 0.15 }],
  ['Metal lathe', 'SM_Lathe_Metal_01', { gap: 0.15 }],
  ['Dust collector', 'SM_DustCollector_01', { gap: 0.15 }]
]);
var po1 = strip('b', BX[2] + 1.75, BZ0 + 0.9, [
  ['Drill bench', 'SM_Workbench_Steel_01', { on: [['pw/SM_Drill_Cordless_01', -0.2, 0, 2.2], ['pw/SM_Jigsaw_01', 0.2, 0, 2.2]] }],
  ['Saw bench', 'Workbench_Wood_01', { gap: 0.15, on: [['pw/SM_CircularSaw_01', -0.2, 0, 1.8], ['pw/SM_ChopSaw_01', 0.22, 0, 1.2]] }],
  ['Sander bench', 'SM_Workbench_Steel_01', { gap: 0.15, on: [['pw/SM_Sander_Orbital_01', -0.2, 0, 2.2], ['pw/SM_BeltSander_Bench_01', 0.2, 0, 1.2]] }],
  ['Grinder bench', 'Workbench_Wood_01', { gap: 0.15, on: [['pw/SM_AngleGrinder_01', -0.25, 0, 2], ['pw/SM_BenchGrinder_01', 0.2, 0, 1.4]] }],
  ['Air compressor', 'SM_Compressor_Pancake_01', { gap: 0.15 }]
], { mid: true, s: 2 });
var po2 = strip('k', BX[2] + 3.65, BZ0 + 0.6, [
  ['Generator', 'SM_Generator_Portable_01'],
  ['Pressure washer', 'SM_PressureWasher_01', { gap: 0.2 }],
  ['Shop vac', 'SM_ShopVac_Drum_01', { gap: 0.2 }],
  ['Torpedo heater', 'SM_Heater_Torpedo_01', { gap: 0.2 }],
  ['Wire welder', 'SM_Welder_MIG_01', { gap: 0.2 }],
  ['Shop press', 'SM_ShopPress_01', { gap: 0.2 }],
  ['Drum fan', 'SM_FloorFan_Drum_01', { gap: 0.2 }]
], { mid: true });
AREAS.power = {
  cx: BX[2] + 2.2, cz: (BZ0 + BZF) / 2, vacant: [BX[2], BX[2] + 4.4, BZ0, BZF], sign: [BX[2] + 2.2, BZF - 0.7, 1.9],
  floor: [floor(BX[2], BX[2] + 4.4, BZ0, BZF, BAYC.power)],
  ups: compose([
    po0,
    po1,
    po2,
    [SIGN, board('Power tool board', 'board.h_power', BX[2] + 3.7, BZF - 0.35, 1.1, 0.95), lights([[BX[2] + 1.0, BZ0 + 3.7], [BX[2] + 3.3, BZ0 + 7.7]]),
      floorSet('Anvil', [pw('SM_Anvil_Stump_01', BX[2] + 0.6, BZF - 0.8, 's', { spots: 0 })]),
      dais('Golden drill press', 'SM_DrillPress_Floor_01', BX[2] + 3.2, BZF - 2.4, { k: 1.2 })],
    [put('Shop mat', 'SM_FloorMat_01', BX[2] + 2.2, BZF - 0.25, 's', { spots: 0 }), put('Steel bin', 'SM_TrashCan_Steel_01', BX[2] + 4.0, BZF - 0.3, 's', { spots: 0 }), put('Rolling stool', 'ShopStool_Rolling_01', BX[2] + 0.6, BZF - 1.6, 's', { spots: 0 }), put('Wet floor sign', 'WetFloorSign_01', BX[2] + 1.4, BZF - 0.3, 's', { spots: 0 })],
    [staff('Tool clerk', BX[2] + 1.15, BZF - 1.8, 'b'), HELP]
  ])
};

// Tires and wheels: tire racks along the north edge, the changer and balancer in a row, jacks and stands
var ti0 = strip('b', BX[3] + 0.05, BZ0 + 0.4, [
  ['Tire rack', 'TireRack_Wall_01'],
  ['Second tire rack', 'TireRack_Wall_01', { gap: 0.1 }],
  ['Tire stack', 'Tire_Stack_01', { gap: 0.2 }],
  ['Wheel pallet', 'Pallet_01', { gap: 0.2, on: [['pw/Wheel_01', -0.15, 0, 0.8, 0.061], ['pw/Wheel_01', 0.15, 0, 0.8, 0.061]] }],
  ['Third tire rack', 'TireRack_Wall_01', { gap: 0.2 }],
  ['Second tire stack', 'Tire_Stack_01', { gap: 0.2 }],
  ['Steel wheel pallet', 'Pallet_01', { gap: 0.2, on: [['pw/SM_Wheel_Steel_01', -0.15, 0, 0.8, 0.061], ['pw/SM_Wheel_Steel_01', 0.15, 0, 0.8, 0.061]] }]
]);
var ti1 = strip('b', BX[3] + 1.75, BZ0 + 0.9, [
  ['Tire changer', 'SM_TireChanger_01'],
  ['Wheel balancer', 'SM_WheelBalancer_01', { gap: 0.3 }],
  ['Island tire stacks', 'Tire_Stack_01', { gap: 0.3, n: 2 }],
  ['Rim bench', 'SM_Workbench_Steel_01', { gap: 0.3, on: [['pw/Rim_01', -0.2, 0, 1.2], ['pw/Rim_01', 0.2, 0, 1.2]] }],
  ['Wheel pallet', 'Pallet_01', { gap: 0.3, on: [['pw/Wheel_01', 0, 0, 1, 0.061]] }]
], { mid: true, s: 2 });
var ti2 = strip('k', BX[3] + 3.65, BZ0 + 0.6, [
  ['Jack bench', 'SM_Workbench_Steel_01'],
  ['Floor jack', 'SM_FloorJack_01', { gap: 0.3 }],
  ['Jack stands', 'SM_JackStand_01', { gap: 0.3, n: 2 }],
  ['Car ramps', 'SM_CarRamp_01', { gap: 0.3, n: 2 }],
  ['Creeper', 'SM_Creeper_01', { gap: 0.3 }]
], { mid: true });
var tire2 = [ti2[0], tools(ti2[0], 'Bottle jacks', [['SM_BottleJack_01', -0.25, 0, 2], ['SM_BottleJack_01', -0.03, 0, 2]]), ti2[1], ti2[2], ti2[3], ti2[4],
  tools(ti2[0], 'Lug wrenches', [['SM_LugWrench_Cross_01', 0.27, 0, 1]])];
AREAS.tires = {
  cx: BX[3] + 2.2, cz: (BZ0 + BZF) / 2, vacant: [BX[3], BX[3] + 4.4, BZ0, BZF], sign: [BX[3] + 2.2, BZF - 0.7, 1.9],
  floor: [floor(BX[3], BX[3] + 4.4, BZ0, BZF, BAYC.tires)],
  ups: compose([
    ti0,
    ti1,
    tire2,
    [SIGN, board('Tire board', 'board.h_tires', BX[3] + 3.7, BZF - 0.35, 1.1, 0.95), lights([[BX[3] + 1.0, BZ0 + 3.7], [BX[3] + 3.3, BZ0 + 7.7]]),
      floorSet('Tire pile', [pw('Tire_Stack_01', BX[3] + 0.6, BZF - 0.8, 's', { spots: 0 })]),
      up(nm('Golden tire'), { sign: 'gold' }, pw('Pallet_01', BX[3] + 3.2, BZF - 2.4, 's', { spots: 0 }), { m: 'pw/Tire_Stack_01' + GOLD, x: BX[3] + 3.2, z: BZF - 2.4, r: 0, k: 1.3, y: 0.061, flat: 1 })],
    [put('Shop mat', 'SM_FloorMat_01', BX[3] + 2.2, BZF - 0.25, 's', { spots: 0 }), put('Steel bin', 'SM_TrashCan_Steel_01', BX[3] + 0.4, BZF - 0.3, 's', { spots: 0 }), put('Parking stop', 'SM_ParkingStop_01', BX[3] + 3.0, BZF - 0.12, 's', { spots: 0 }), put('Wet floor sign', 'WetFloorSign_01', BX[3] + 4.0, BZF - 0.3, 's', { spots: 0 })],
    [staff('Tire clerk', BX[3] + 1.15, BZF - 1.8, 'b'), HELP]
  ])
};

// Storage and garage: cabinets and lockers along the west wall, cabinet islands and totes beside them
var st0 = strip('b', BX[6] + 0.05, BZ0 + 0.4, [
  ['Garage shelf one', 'SM_Shelving_HD_Loaded_01'],
  ['Garage shelf two', 'SM_Shelving_HD_Loaded_01', { gap: 0.25 }],
  ['Locker pair', 'Locker_Double_01', { gap: 0.25 }],
  ['Tall cabinet', 'GarageCab_Tall_05', { gap: 0.25 }],
  ['Garage shelf three', 'SM_Shelving_HD_Loaded_01', { gap: 0.25 }],
  ['Door cabinet', 'SM_GarageCab_Base_Door_10', { gap: 0.25 }],
  ['Parts bench', 'SM_Workbench_Backboard_01', { gap: 0.25, on: [['pw/PartsBin_01', -0.3, 0.05, 2.4, 0.45], ['pw/PartsBin_01', -0.1, 0.05, 2.4, 0.45], ['pw/PartsBin_01', 0.1, 0.05, 2.4, 0.45], ['pw/PartsBin_01', 0.3, 0.05, 2.4, 0.45]] }]
]);
var st1 = strip('b', BX[6] + 1.75, BZ0 + 0.9, [
  ['Door cabinet island', 'SM_GarageCab_Base_Door_10', { n: 2, top: [['SM_GarageCab_Top_20']] }],
  ['Drawer cabinet island', 'SM_GarageCab_Base_Drawers_05', { gap: 0.25, n: 4, top: [['SM_GarageCab_Top_20']] }],
  ['Steel workbench', 'SM_Workbench_Steel_01', { gap: 0.25 }],
  ['Wood workbench', 'Workbench_Wood_01', { gap: 0.25 }],
  ['Tote stacks', 'SM_Tote_Stack_01', { gap: 0.25, n: 3 }]
], { mid: true, s: 2 });
var st2 = strip('k', BX[6] + 3.65, BZ0 + 0.6, [
  ['Locker bank', 'Locker_Double_01', { n: 2 }],
  ['Plastic crates', 'SM_Crate_Plastic_01', { gap: 0.25, n: 3 }],
  ['Wood crates', 'SM_Crate_Wood_01', { gap: 0.25, n: 2 }],
  ['Lidded totes', 'SM_Tote_Lidded_01', { gap: 0.25, n: 2 }],
  ['Shop stools', 'SM_ShopStool_01', { gap: 0.25, n: 3 }],
  ['Parts drawers', 'SM_GarageCab_Base_Drawers_05', { gap: 0.25, n: 3 }],
  ['Folding chairs', 'SM_FoldingChair_01', { gap: 0.25, n: 2 }]
], { mid: true });
AREAS.storage = {
  cx: BX[6] + 2.2, cz: (BZ0 + BZF) / 2, vacant: [BX[6], BX[6] + 4.4, BZ0, BZF], sign: [BX[6] + 2.2, BZF - 0.7, 1.9],
  floor: [floor(BX[6], BX[6] + 4.4, BZ0, BZF, BAYC.storage)],
  ups: compose([
    st0,
    st1,
    st2,
    [SIGN, board('Storage board', 'board.h_storage', BX[6] + 3.7, BZF - 0.35, 1.1, 0.95), lights([[BX[6] + 1.0, BZ0 + 3.7], [BX[6] + 3.3, BZ0 + 7.7]]),
      floorSet('Sawhorses', [pw('SM_Sawhorse_Wood_01', BX[6] + 0.8, BZF - 0.8, 'b', { spots: 0, n: 2 }), { m: 'pw/SM_Lumber_Stack_01', x: BX[6] + 0.8, z: BZF - 0.8, r: Math.PI / 2, y: 0.38, flat: 1 }]),
      dais('Golden cabinet', 'GarageCab_Tall_05', BX[6] + 3.2, BZF - 2.4, { k: 1.2 })],
    [put('Shop mat', 'SM_FloorMat_01', BX[6] + 2.2, BZF - 0.25, 's', { spots: 0 }), put('Steel bin', 'SM_TrashCan_Steel_01', BX[6] + 0.4, BZF - 0.3, 's', { spots: 0 }), put('Rag can', 'SM_OilyRagCan_01', BX[6] + 4.0, BZF - 0.3, 's', { spots: 0 }), put('Wet floor sign', 'WetFloorSign_01', BX[6] + 1.4, BZF - 0.3, 's', { spots: 0 })],
    [staff('Garage clerk', BX[6] + 1.15, BZF - 1.8, 'b'), HELP]
  ])
};

// The wing rooms: the welding corner and the break room are places, built a piece at a time; the returns room and the
// lumber store beside them are there from the first day
var WING = {
  rest: {
    rect: [15.3, 21.5, -8, -3],
    visit: [],
    ups: [
      pack(nm('A welding table'), pw('SM_WeldingTable_01', 18.2, -6.0, 's', { spots: 0 }), pw('SM_ShopStool_01', 18.2, -5.3, 'n', { spots: 0 })),
      pack(nm('A wire welder and a mat'), pw('SM_Welder_MIG_01', 19.3, -6.1, 's', { spots: 0 }), pw('SM_FloorMat_01%=yellow', 19.0, -5.2, 's', { spots: 0, y: 0.06 })),
      pack(nm('A welding helmet'), { m: 'pw/SM_WeldingHelmet_01', x: 17.95, z: -6.0, r: 0, k: 1.6, y: 0.426, flat: 1 }),
      pack(nm('Gas cylinders'), pw('SM_GasCylinder_01', 20.95, -7.7, 's', { spots: 0, n: 3 })),
      pack(nm('A gas cart'), pw('SM_OxyAcetylene_Cart_01', 20.2, -7.55, 's', { spots: 0 })),
      pack(nm('A stick welder and a sandblaster'), pw('SM_Welder_Stick_01', 16.7, -7.65, 's', { spots: 0 }), pw('SM_SandblastCabinet_01', 21.0, -4.2, 'n', { spots: 0 })),
      pack(nm('An anvil, a press and a vise bench'), pw('SM_Anvil_Stump_01', 17.7, -3.7, 'n', { spots: 0 }), pw('SM_ShopPress_01', 19.3, -3.6, 'n', { spots: 0 }),
        pw('SM_Workbench_Steel_01', 16.0, -5.6, 'b', { spots: 0, on: [['pw/SM_BenchVise_01', 0, 0, 1.6, 0.45]] })),
      pack(nm('A fan, a heater and a screen'), pw('SM_FloorFan_Drum_01', 20.4, -3.65, 'n', { spots: 0 }), pw('SM_Heater_Torpedo_01', 21.2, -5.8, 'k', { spots: 0 }), pw('SM_WalkIn_StripCurtain_01', 17.3, -5.9, 'b', { spots: 0 }))
    ]
  },
  lounge: {
    rect: [15.3, 21.5, -14, -8],
    visit: [],
    ups: [
      pack(nm('Lockers'), pw('EmployeeLockers_3_01', 15.6, -9.2, 'b', { spots: 0 }), pw('EmployeeLockers_3_01', 15.6, -10.1, 'b', { spots: 0 })),
      pack(nm('A time clock and first aid'), KIT.wp('TimeClock_Wall_01', 15.32, -12.0, 'b', 0.3), KIT.wp('FirstAid_Box_Wall_01', 15.32, -12.7, 'b', 0.3)),
      pack(nm('A job board and lockers'), KIT.wp('Menu_Board_Wall_01', 18.4, -13.9, 's', 0.35), pw('Locker_Double_01', 19.6, -8.3, 'n', { spots: 0, n: 2 })),
      pack(nm('A work table'), pw('Workbench_Wood_01', 18.4, -11.2, 's', { spots: 0 })),
      pack(nm('Stools'), pw('SM_ShopStool_01', 17.9, -11.75, 's', { spots: 0 }), pw('SM_ShopStool_01', 18.9, -11.75, 's', { spots: 0 }), pw('SM_ShopStool_01', 17.9, -10.65, 'n', { spots: 0 }),
        pw('SM_ShopStool_01', 18.9, -10.65, 'n', { spots: 0 })),
      pack(nm('A mechanic on break'), { staff: [18.9, -10.65, 'n', 'sit'] }),
      pack(nm('Two round tables'), pw('Table_Cafe_Round_01', 20.5, -11.0, 's', { spots: 0 }), pw('SM_FoldingChair_01', 20.5, -11.5, 's', { spots: 0 }), pw('SM_FoldingChair_01', 20.5, -10.5, 'n', { spots: 0 }),
        pw('Table_Cafe_Round_01', 17.2, -9.2, 's', { spots: 0 }), pw('SM_FoldingChair_01', 17.2, -9.7, 's', { spots: 0 }), pw('SM_FoldingChair_01', 17.2, -8.7, 'n', { spots: 0 })),
      pack(nm('A fridge and a radio'), pw('SM_MiniFridge_01', 17.4, -13.6, 's', { spots: 0, on: [['pw/SM_Radio_Jobsite_01', 0, 0, 0, 0.41, 1]] })),
      pack(nm('A clerk on break'), { staff: [20.5, -10.5, 'n', 'sit'] }),
      pack(nm('A coffee corner and a clock'), pw('CoffeeStation_15', 20.4, -13.6, 's', { spots: 0 }), KIT.wp('ShopClock_01', 15.32, -13.3, 'b', 0.6))
    ]
  }
};

function flat(list) {
  return list.reduce(function (a, u) { return a.concat(u.piece); }, []);
}
var room = KIT.room;
var DOORS = [-8, -2.7, 2.7, 8];
var DOCKS = [-9.6, -6.4, -3.2, 0, 3.2, 6.4, 9.6];
var FRONT_Z = -4;

// the welding corner and the break room sit at the two ends of the stockroom, in the strip behind the hall
var seen = [];
function shift(e, dx, dz) {
  if (Array.isArray(e)) {
    if (typeof e[0] !== 'string') e.forEach(function (q) { shift(q, dx, dz); });
    return;
  }
  if (!e || typeof e !== 'object' || seen.indexOf(e) >= 0) return;
  seen.push(e);
  if (typeof e.x === 'number') e.x += dx;
  if (typeof e.z === 'number') e.z += dz;
  if (e.box) e.box = [e.box[0] + dx, e.box[1] + dx, e.box[2] + dz, e.box[3] + dz, e.box[4], e.box[5]];
  ['patch', 'poly'].forEach(function (k) { if (e[k]) e[k] = e[k].map(function (q) { return [q[0] + dx, q[1] + dz]; }); });
  if (e.staff) e.staff = [e.staff[0] + dx, e.staff[1] + dz].concat(e.staff.slice(2));
  if (e.lights) e.lights = e.lights.map(function (q) { return [q[0] + dx, q[1] + dz]; });
  if (e.rect) e.rect = [e.rect[0] + dx, e.rect[1] + dx, e.rect[2] + dz, e.rect[3] + dz];
  if (e.piece) e.piece.forEach(function (q) { shift(q, dx, dz); });
  if (e.ups) e.ups.forEach(function (q) { shift(q, dx, dz); });
}
shift(WING.rest, -3.7, -23.0);
shift(WING.lounge, -33.1, -17.3);

var DECOR = {
  front: [],
  stock: [],
  out: [],
  side: [],
  wing: [room(11.6, 17.8, -31.0, -26.0, 0x4d525c), room(-17.8, -11.6, -31.3, -25.3, 'boards')]
};

// tall racking across the back of the hall, open at the stock doors, and the front end: mats at the way in, benches, pallet
// displays in the corners and a yellow line along the aisle
var promo = [];
// a promotion row in front of each bay: pallets, tires, lumber and planters between the bay floor and the aisle line
[['cases', 'water'], ['water', 'lumber'], ['tires', 'cases'], ['lumber', 'tires'], ['propane', 'water'], ['cases', 'propane'], ['planters', 'lumber']].forEach(function (kinds, i) {
  kinds.forEach(function (k, j) {
    var x = BX[i] + 1.2 + j * 2.1;
    var z = -13.0 + (j ? 0.3 : -0.2);
    if (k === 'cases' || k === 'water') promo.push(pw('Pallet_01', x, z, 's', { spots: 0 }), pw(k === 'cases' ? 'PalletLoad_Cases_01' : 'PalletLoad_Water_01', x, z, 's', { spots: 0 }));
    else if (k === 'tires') promo.push(pw('Tire_Stack_01', x - 0.3, z, 's', { spots: 0 }), pw('Tire_Stack_01', x + 0.4, z, 's', { spots: 0 }));
    else if (k === 'lumber') promo.push(pw('SM_Sawhorse_Wood_01', x, z, 's', { spots: 0, n: 2 }), { m: 'pw/SM_Lumber_Stack_01', x: x, z: z, r: 0, y: 0.38, flat: 1 });
    else if (k === 'propane') promo.push(pw('PropaneCage_01', x, z, 's', { spots: 0 }));
    else promo.push(pw('Planter_Tall_01', x - 0.4, z, 's', { spots: 0 }), pw('Planter_Tall_01', x + 0.4, z, 's', { spots: 0 }));
  });
});
var backRacks = [];
for (var rx = -16.9; rx < 17; rx += 1.85) {
  if (DOORS.every(function (d) { return Math.abs(rx - d) > 2.1; })) backRacks.push({ m: 'pw/SM_Shelving_HD_Loaded_01', x: rx, z: -24.6, r: 0, k: 2 });
}
DECOR.front = cat(backRacks, promo, [
  { patch: rbox(-1.6, 1.6, FRONT_Z - 1.2, FRONT_Z - 0.2, 0.25), finish: 0x5a5f69 },
  { text: 'board.h_order', x: -5.4, z: -7.95, r: 0, y: 1.75, w: 2.0, h: 0.5, post: true },
  pw('Tire_Stack_01', -3.6, FRONT_Z - 0.7, 's', { spots: 0 }), pw('Tire_Stack_01', 3.6, FRONT_Z - 0.7, 's', { spots: 0 }),
  { m: 'furn/bench', x: -4.8, z: FRONT_Z - 0.5, r: Math.PI, k: 1.5 }, { m: 'furn/bench', x: 4.8, z: FRONT_Z - 0.5, r: Math.PI, k: 1.5 },
  pw('VendingMachine_Drink_01', 6.2, FRONT_Z - 0.6, 'n', { spots: 0 }), pw('VendingMachine_Drink_01', -6.2, FRONT_Z - 0.6, 'n', { spots: 0 }),
  pw('SM_Sign_AFrame_Blank_01', -2.6, FRONT_Z - 0.45, 's', { spots: 0 }), pw('SM_Sign_AFrame_Blank_01', 2.6, FRONT_Z - 0.45, 's', { spots: 0 }),
  room(-17.4, 17.4, -10.45, -10.35, 0xe8b923),
  pw('Pallet_01', -16.2, -8.6, 's', { spots: 0 }), pw('PalletLoad_Cases_01', -16.2, -8.6, 's', { spots: 0 }), pw('Tire_Stack_01', -14.6, -8.8, 's', { spots: 0 }),
  pw('Pallet_01', 15.8, -9.0, 's', { spots: 0 }), pw('PalletLoad_Water_01', 15.8, -9.0, 's', { spots: 0 }), pw('SM_HandTruck_01', 17.0, -8.4, 's', { spots: 0 })
]);

// the stockroom: two back-to-back rows of tall racking with forklift aisles at x 0 and +-6, forklifts by the docks and the receiving sign
var stockRacks = [];
[-27.0, -27.8].forEach(function (rz, i) {
  for (var sx = -10.6; sx < 11; sx += 1.85) if ([-6, 0, 6].every(function (a) { return Math.abs(sx - a) > 1.3; })) stockRacks.push({ m: 'pw/SM_Shelving_HD_Loaded_01', x: sx, z: rz, r: i ? Math.PI : 0, k: 2 });
});
DECOR.stock = cat(stockRacks, [
  { m: 'car/tractor-shovel', x: -6.0, z: -27.4, r: 0, k: 1 }, { m: 'car/tractor-shovel', x: 6.05, z: -27.4, r: 0, k: 1 },
  { text: 'board.h_receiving', x: 0.5, z: -29.0, r: 0, y: 2.0, w: 2.2, h: 0.5, post: true },
  pw('PalletJack_01', -4.6, -29.4, 's', { spots: 0 }), pw('Pallet_01', 3.4, -29.2, 's', { spots: 0 }), pw('PalletLoad_Cases_01', 3.4, -29.2, 's', { spots: 0 })
]);

// outside: lumber stacks either side of the lane under the canopy against the east wall, the storage yard behind the garden
var lumberOut = [];
[19.4, 20.2, 23.6, 24.4].forEach(function (lx) {
  for (var lz = -21.2; lz < -9.8; lz += 1.4) {
    for (var ly = 0; ly < 3; ly++) lumberOut.push({ m: 'pw/SM_Lumber_Stack_01', x: lx, z: lz, r: Math.PI / 2, y: ly * 0.18, flat: 1 });
  }
});
DECOR.out = cat(lumberOut, [
  { text: 'board.h_trucks', x: 16.5, z: -35.2, r: 0, y: 1.05, w: 2.6, h: 0.8, post: true },
  { text: 'board.h_lumber', x: 22.0, z: -8.5, r: 0, y: 2.0, w: 3.4, h: 0.9, post: true },
  { m: 'car/tractor-shovel', x: 22.0, z: -22.4, r: 3.14, k: 1 },
  pw('Pallet_01', 27.4, -12.0, 's', { spots: 0 }), pw('PalletLoad_Water_01', 27.4, -12.0, 's', { spots: 0 }), pw('Pallet_01', 27.4, -14.0, 's', { spots: 0 }), pw('PalletLoad_Cases_01', 27.4, -14.0, 's', { spots: 0 }),
  pw('PropaneCage_01', -28.6, -20.0, 's', { spots: 0 }), pw('PropaneCage_01', -26.6, -20.0, 's', { spots: 0 }), pw('PropaneCage_01', -24.6, -20.0, 's', { spots: 0 }),
  pw('SM_Dumpster_01', -20.4, -29.6, 'b', { spots: 0 }),
  { box: [-29.6, -26.0, -29.8, -27.0, 0, 1.0], c: 0x4a8a4a }, { box: [-29.7, -25.9, -29.9, -26.9, 1.0, 1.15], c: 0x2f5f33 },
  { box: [-24.8, -21.2, -29.8, -27.0, 0, 1.0], c: 0xc8412e }, { box: [-24.9, -21.1, -29.9, -26.9, 1.0, 1.15], c: 0x8f2f20 },
  pw('Pallet_01', -22.6, -23.4, 's', { spots: 0 }), pw('PalletLoad_Cases_01', -22.6, -23.4, 's', { spots: 0 }), pw('Pallet_01', -27.4, -24.4, 's', { spots: 0 }), pw('PalletLoad_Water_01', -27.4, -24.4, 's', { spots: 0 })
]);

// what each Checkouts level adds besides tills, as in plan.js
var FRONT = [
  [2, 'pw/SM_Wheelbarrow_01', -13.6, FRONT_Z - 0.7, 0], [2, 'pw/SM_Wheelbarrow_01', -11.0, FRONT_Z - 0.7, 0], [2, 'pw/SM_Wheelbarrow_01', 10.6, FRONT_Z - 0.7, 0], [2, 'pw/SM_Wheelbarrow_01', 13.2, FRONT_Z - 0.7, 0],
  [4, 'pw/SM_HandTruck_01', 15.4, FRONT_Z - 0.5, Math.PI], [4, 'pw/SM_HandTruck_01', 16.0, FRONT_Z - 0.5, Math.PI],
  [8, 'pw/TrashRecycle_Station_01', -16.6, FRONT_Z - 0.55, Math.PI], [8, 'pw/Tire_Stack_01', -15.8, FRONT_Z - 0.55, Math.PI], [8, 'pw/SM_Sign_AFrame_Blank_01', -15.0, FRONT_Z - 0.55, Math.PI], [8, 'pw/NewspaperRack_01', -14.2, FRONT_Z - 0.55, Math.PI],
  [10, 'pw/DiningBench_01', -8.4, FRONT_Z - 0.55, Math.PI], [10, 'pw/SM_Sawhorse_Wood_01', 8.6, FRONT_Z - 0.55, 0], [10, 'pw/Planter_Tall_01', 11.0, FRONT_Z - 0.55, 0]
];

var SHELL_HW = {
  kind: 'warehouse',
  front: FRONT_Z, back: -25, edge: 18, wing: 18.4, sb: -31.5, lane: -25.6,
  nav: { grid: [-31, -25, 200, 86], walls: [[-18.5, -17.5, -26, -3.5], [17.5, 18.5, -26, -3.5]], back: [-19, 19, 99], front: [-19, 19.5, 19.5],
    gaps: [[-18.8, -17.2, -8.2, -7.0]] },
  lot: [-2.2, 9.6], lotX: [-26, 26], walks: [0], aisle: 0.5, drive: 27.6, road: 29.4, curb: 10.2, yard: -37.2,
  stand: 0, busX: 6.5,
  spots: { lot: [0, 3.5], taxi: [0, 10], dock: [0, -30.5] },
  tags: { hall: [0, 1.3, -5.2], lot: [-4, 0.8, 3.5], taxi: [0, 1.2, 10.2], dock: [0, 1.0, -30.8] },
  garden: { rect: [-30.5, -19.4, -17, -3.0], gate: -24.95, till: [-23.5, -2.45], lane: -29.6 },
  wingDoor: { out: [17.2, -8], in: [18.6, -8], bar: false },
  warehouse: { court: [-30.5, 30.8, -40], canopy: [18.6, 25.2, -22, -9], pylon: [-14, 3.7], westDoor: [-7.6, 1.2], bays: [[-2.2, -0.6, -1, 0.5], [1.6, 3.2, 1, 0.5], [4.2, 5.8, -1, 6.9], [8.0, 9.6, 1, 6.9]] },
  site: [[-31.5, 34, -43.5, 9.4], [34, 38, -26, -6], [-38, -31.5, -26, -6]],
  bounds: [-31, 31, -41, 16], zoom: [8, 150], fit: 36, turn: Math.PI / 4,
  light: { target: [0, -18], at: [-19, 23, 9], box: [-34, 34, 36, -36] },
  nature: {
    zones: [
      { r: [-30.5, 31, -42.9, -41.2], tr: [], t: 0, b: 4, g: 0, f: 0, k: 0 }
    ],
    clear: []
  },
  decor: { out: DECOR.out, stock: DECOR.stock }
};

export var HARDWARE = Object.assign({}, PLAN, {
  type: 'hardware',
  shell: SHELL_HW,
  home: { x: -2, z: -11, w: 24 },
  hall: [-18, 18, -25, -4], stock: [-18, 18, -31.5, -25], doors: DOORS, docks: DOCKS,
  idle: [-9.5, -7, -4, -1.5, 1.5, 4, 7, 9.5].map(function (x) { return [x, -26.2]; }),
  bank: { x: -9.1, z: -6.0, cross: -8.8, exit: -5.2, span: 9.1, gap: [-2, 2] },
  desk: { x: 11.55, z: -5.6, n: 2 },
  areas: AREAS,
  order: Object.keys(AREAS),
  wing: WING,
  decor: DECOR,
  front: FRONT,
  yard: true,
  floor: [
    { r: [-18, 18, -25, -4], finish: 0x8f949d },
    { r: [-18, 18, -31.5, -25], finish: 0x7f838c }
  ],
  tint: { wall: 0xc9d1de },
  entrances: [{ x: 0, w: 4, name: 'sign.h_hardware', basket: [-1.15, FRONT_Z - 0.7], greeter: [-1.75, FRONT_Z - 0.75, Math.PI / 2] }],
  laneM: [['pw/SM_GarageCab_Base_Door_10', -0.15, -0.85, -Math.PI / 2], ['pw/SM_GarageCab_Base_Door_10', -0.15, -0.35, -Math.PI / 2], ['pw/SM_GarageCab_Base_Door_10', -0.15, 0.15, -Math.PI / 2],
    ['pw/SM_GarageCab_Top_20', -0.15, -0.6, -Math.PI / 2, 0.44], ['pw/SM_GarageCab_Top_10', -0.15, 0.15, -Math.PI / 2, 0.44], ['pw/Register_Classic_01', -0.15, 0.2, -Math.PI / 2, 0.46]],
  deskBoard: 'board.h_service',
  wingBoard: 'board.h_workshop',
  bankFloor: 0x5a5f69,
  carry: { bag: ['pw/SM_ToolBag_01*1.4', 0.03], basket: ['pw/SM_Tote_Lidded_01*0.8', 0.07], plant: ['pw/SM_Tire_01*0.8', 0.12] },
  models: ['pw/SM_GarageCab_Base_Door_10', 'pw/SM_GarageCab_Top_20', 'pw/SM_GarageCab_Top_10', 'pw/Register_Classic_01', 'pw/SM_ToolBag_01', 'pw/SM_Tote_Lidded_01', 'pw/SM_Tire_01',
    'pw/Tire_Stack_01', 'car/sedan', 'roads/construction-cone', 'flora/mk-pine-1-lo*0.4', 'flora/mk-pine-2-lo*0.4', 'flora/mk-pine-3-lo*0.4']
});
