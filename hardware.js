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
  Light_Shop_01: [1.21, 0.18, 0.34],
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
  SM_BinRack_Wall_01: [0.9, 0.171, 0.6],
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
  SM_Sledge_01: [0.921, 0.2, 0.109],
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
    return { m: 'pw/' + t[0], x: x, z: z, r: TURN[a.face], k: t[3] || 1, y: y === undefined ? a.h : y, flat: 1 };
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
// a show piece: a model enlarged, standing on the floor
function big(name, ref, x, z, face, k) {
  return up(nm(name), { sign: 'gold' }, { m: 'pw/' + ref, x: x, z: z, r: TURN[face], k: k });
}
// a show piece on a table
function plinth(name, table, x, z, face, goods) {
  return up.apply(null, [nm(name), { sign: 'gold' }, pw(table, x, z, face, { spots: 0 })].concat(goods.map(function (g) {
    return { m: 'pw/' + g[0], x: x + (g[1] || 0), z: z + (g[2] || 0), r: TURN[face], k: g[3] || 1, y: 0.45, flat: 1 };
  })));
}
function lamps(name, list) {
  return up.apply(null, [nm(name)].concat(list.map(function (q) { return hang('Light_Shop_01', q[0], q[1], q[2] || 0, 1.2, 0.7); })));
}

// goods of the benches: on a bench top at 0.45
var BT = 0.45;

var AREAS = {};

// Hand tools: tool walls and benches along the back wall, a row of roller chests, a bench row with the small tools
var ha0 = strip('s', -22.15, -7.75, [
  ['Tool wall', 'SM_Workbench_Backboard_01', { on: [['pw/SM_Hammer_Claw_01', -0.28, 0.05, 1.8, BT], ['pw/SM_Wrench_Combo_01', 0, 0.05, 2.4, BT], ['pw/SM_Pliers_01', 0.28, 0.05, 2.2, BT]] }],
  ['Wrench bench', 'SM_Workbench_Steel_01', { gap: 0.08, on: [['pw/SM_SocketSet_Case_01', -0.2, 0, 1.4], ['pw/SM_Ratchet_01', 0.2, 0.05, 2]] }],
  ['Saw bench', 'Workbench_Wood_01', { gap: 0.08, on: [['pw/SM_HandSaw_01', -0.2, 0, 1.6], ['pw/SM_Hacksaw_01', 0.2, 0.05, 1.6]] }],
  ['Tall tool cabinet', 'GarageCab_Tall_05', { gap: 0.08 }],
  ['Second tool wall', 'SM_Workbench_Backboard_01', { gap: 0.08, on: [['pw/SM_Hammer_BallPeen_01', -0.28, 0.05, 1.8, BT], ['pw/SM_Sledge_01', 0, 0.05, 1.3, BT], ['pw/SM_Mallet_Rubber_01', 0.28, 0.05, 1.8, BT]] }],
  ['Measuring bench', 'SM_Workbench_Steel_01', { gap: 0.08, on: [['pw/SM_TapeMeasure_01', -0.25, 0, 2.4], ['pw/SM_Level_Box_01', 0.12, 0.05, 1.6]] }],
  ['Clamp bench', 'Workbench_Wood_01', { gap: 0.08, on: [['pw/SM_Clamp_Bar_01', -0.2, 0, 1.7], ['pw/SM_Clamp_C_01', 0.2, 0, 2.4]] }]
]);
var ha1 = strip('s', -20.25, -7.0, [
  ['Roller chest', 'ToolChest_Roller_01'],
  ['Chest with top box', 'ToolChest_Roller_01', { gap: 0.5, top: [['SM_ToolChest_Top_01']] }],
  ['Chest stack', 'SM_ToolChest_Stack_01', { gap: 0.5 }],
  ['Chest and drill', 'ToolChest_Roller_01', { gap: 0.5, on: [['pw/SM_Drill_Cordless_01', 0, 0, 2.2]] }],
  ['Tote island', 'SM_Tote_Stack_01', { gap: 0.5, n: 2 }]
], { mid: true, s: 2 });
var ha2 = strip('s', -18.95, -7.4, [
  ['Sawhorse', 'SM_Sawhorse_Wood_01'],
  ['Display bench', 'Workbench_Wood_01', { gap: 0.4 }],
  ['Plier bench', 'SM_Workbench_Steel_01', { gap: 0.4 }]
], { mid: true });
var hand2 = [ha2[0], tools(ha2[0], 'Level and square', [['SM_Level_Box_01', 0, 0, 1.6], ['SM_Square_Framing_01', 0.15, 0, 1]]), ha2[1],
  tools(ha2[1], 'Screwdriver set', [['SM_Screwdriver_Flat_01', -0.25, 0, 2.2], ['SM_Screwdriver_Phillips_01', -0.05, 0, 2.2], ['SM_File_01', 0.2, 0, 1.4]]),
  tools(ha2[1], 'Hex keys and pry bar', [['SM_HexKeys_01', -0.1, 0.1, 2.4], ['SM_PryBar_01', 0.18, -0.05, 1.2]]), ha2[2],
  tools(ha2[2], 'Pliers and cutters', [['SM_Pliers_01', -0.2, 0, 2.2], ['SM_Pliers_Locking_01', 0.0, 0, 2], ['SM_UtilityKnife_01', 0.22, 0, 2.4]])];
AREAS.hand = {
  cx: -4.5, cz: -19.7, vacant: [-8.0, -1.0, -22.2, -17.2], sign: [-4.5, -17.9, 1.9],
  floor: [floor(-8.0, -1.0, -22.2, -17.2, 0x46566c)],
  ups: compose([
    ha0,
    ha1,
    hand2,
    [SIGN, board('Hand tools board', 'board.h_hand', -2.3, -17.6, 1.1, 0.95), lights([[-5.5, -20.9], [-3.0, -20.9]]),
      lamps('Bench lights', [[-6.4, -21.0], [-3.2, -21.0]]),
      big('Golden tool chest', 'SM_ToolChest_Stack_01', -1.55, -20.2, 's', 1.5)],
    [put('Shop mat', 'SM_FloorMat_01', -4.5, -17.75, 's', { spots: 0 }), put('Rolling stool', 'ShopStool_Rolling_01', -7.7, -20.7, 's', { spots: 0 }),
      put('Steel bin', 'SM_TrashCan_Steel_01', -1.4, -17.6, 's', { spots: 0 }), put('Wet floor sign', 'WetFloorSign_01', -6.2, -17.6, 's', { spots: 0 })],
    [staff('Tool clerk', -2.3, -18.8, 's'), HELP]
  ])
};

// Paint and supplies: paint shelving on the back wall, mixing benches in the middle
var pa0 = strip('s', -22.15, 0.4, [
  ['Paint shelf one', 'SM_Shelving_HD_Loaded_01'],
  ['Paint shelf two', 'SM_Shelving_HD_Loaded_01', { gap: 0.05 }],
  ['Mixing bench', 'Workbench_Wood_01', { gap: 0.3, on: [['pw/SM_PaintCan_Open_01', -0.25, 0, 2], ['pw/PaintCan_01', 0.0, 0, 2], ['pw/SM_PaintBrush_01', 0.28, 0, 2.2]] }],
  ['Paint shelf three', 'SM_Shelving_HD_Loaded_01', { gap: 0.3 }],
  ['Paint cabinet', 'GarageCab_Tall_05', { gap: 0.05 }],
  ['Paint shelf four', 'SM_Shelving_HD_Loaded_01', { gap: 0.3 }],
  ['Brush bench', 'SM_Workbench_Steel_01', { gap: 0.3, on: [['pw/SM_PaintBrush_01', -0.22, 0, 2.2], ['pw/SM_PaintRoller_01', 0.15, 0, 1.8]] }]
]);
var pa1 = strip('s', -20.25, 0.9, [
  ['Paint can table', 'Workbench_Wood_01', { on: [['pw/PaintCan_01', -0.28, 0, 1.8], ['pw/SM_PaintCan_Open_01', 0, 0, 1.8], ['pw/PaintCan_01', 0.28, 0, 1.8]] }],
  ['Tray sawhorse', 'SM_Sawhorse_Folding_01', { gap: 0.4, on: [['pw/SM_PaintTray_01', 0, 0, 1.4, 0.38]] }],
  ['Roller bench', 'SM_Workbench_Steel_01', { gap: 0.4, on: [['pw/SM_PaintRoller_01', -0.18, 0, 1.8], ['pw/SM_PaintBrush_01', 0.2, 0, 2.4]] }],
  ['Drop cloth totes', 'SM_Tote_Stack_01', { gap: 0.4, n: 2 }],
  ['Lumber trestle', 'SM_Sawhorse_Wood_01', { gap: 0.4, top: [['SM_Lumber_Stack_01', 0.45]] }]
], { mid: true, s: 2 });
var pa2 = strip('s', -18.95, 1.0, [
  ['Caulk bench', 'Workbench_Wood_01'],
  ['Step ladder', 'SM_StepLadder_01', { gap: 0.4 }],
  ['Bucket bench', 'SM_Workbench_Steel_01', { gap: 0.4 }],
  ['Safety gear bench', 'Workbench_Wood_01', { gap: 0.4 }]
], { mid: true });
var paint2 = [pa2[0], tools(pa2[0], 'Caulk guns', [['SM_CaulkGun_01', -0.2, 0, 1.8], ['SM_CaulkGun_01', 0.15, 0.04, 1.8], ['SM_DuctTape_01', 0.35, 0, 2]]), pa2[1], pa2[2],
  tools(pa2[2], 'Buckets', [['SM_Bucket_01', -0.15, 0, 1.2], ['SM_Bucket_01', 0.2, 0, 1.2]]), pa2[3],
  tools(pa2[3], 'Gloves and goggles', [['SM_WorkGloves_01', -0.25, 0, 1.8], ['SM_SafetyGlasses_01', 0, 0, 2], ['SM_EarMuffs_01', 0.25, 0, 1.8]])];
AREAS.paint = {
  cx: 4.05, cz: -19.7, vacant: [0.1, 8.0, -22.2, -17.2], sign: [4.05, -17.9, 1.9],
  floor: [floor(0.1, 8.0, -22.2, -17.2, 0x2f6264)],
  ups: compose([
    pa0,
    pa1,
    paint2,
    [SIGN, board('Paint board', 'board.h_paint', 6.4, -17.6, 1.1, 0.95), lights([[2.0, -20.9], [5.5, -20.9]]),
      lamps('Paint lights', [[2.3, -21.0], [5.5, -21.0]]),
      plinth('Golden paint can', 'Workbench_Wood_01', 7.2, -20.2, 's', [['SM_PaintCan_Open_01', 0, 0, 3.4]])],
    [put('Shop mat', 'SM_FloorMat_01', 4.0, -17.75, 's', { spots: 0 }), put('Rag can', 'SM_OilyRagCan_01', 7.6, -17.7, 's', { spots: 0 }),
      put('Steel bin', 'SM_TrashCan_Steel_01', 0.5, -17.6, 's', { spots: 0 }), put('Wet floor sign', 'WetFloorSign_01', 2.6, -17.6, 's', { spots: 0 })],
    [staff('Paint clerk', 6.7, -18.6, 's'), HELP]
  ])
};

// Oil and fluids: shelves along the east wall, benches and drums in the middle
var oi0 = strip('k', 14.7, -21.9, [
  ['Oil shelf one', 'SM_Shelving_HD_Loaded_01'],
  ['Oil shelf two', 'SM_Shelving_HD_Loaded_01', { gap: 0.05 }],
  ['Tote stack', 'SM_Tote_Stack_01', { gap: 0.3 }],
  ['Oil shelf three', 'SM_Shelving_HD_Loaded_01', { gap: 0.3 }],
  ['Fluid cabinet', 'GarageCab_Tall_05', { gap: 0.05 }],
  ['Oil shelf four', 'SM_Shelving_HD_Loaded_01', { gap: 0.3 }],
  ['Oil shelf five', 'SM_Shelving_HD_Loaded_01', { gap: 0.05 }]
]);
var oi1 = strip('k', 12.5, -21.4, [
  ['Oil table', 'Workbench_Wood_01', { on: [['pw/OilJug_01', -0.28, 0, 2], ['pw/OilJug_01', 0, 0, 2], ['pw/OilBottle_01', 0.28, 0, 2.6]] }],
  ['Oil drain', 'SM_OilDrain_Upright_01', { gap: 0.4 }],
  ['Grease bench', 'SM_Workbench_Steel_01', { gap: 0.4, on: [['pw/SM_GreaseGun_01', -0.2, 0, 2], ['pw/SM_OilCan_Squirt_01', 0.2, 0, 2.2]] }],
  ['Jerry can pallet', 'Pallet_01', { gap: 0.4, on: [['pw/JerryCan_01', -0.18, 0, 1.4, 0.061], ['pw/JerryCan_01', 0.0, 0, 1.4, 0.061], ['pw/JerryCan_01', 0.18, 0, 1.4, 0.061]] }],
  ['Propane cage', 'PropaneCage_01', { gap: 0.4 }]
], { mid: true, s: 2 });
var oi2 = strip('k', 10.9, -21.5, [
  ['Spray bench', 'SM_Workbench_Steel_01'],
  ['Gas bench', 'Workbench_Wood_01', { gap: 0.4 }],
  ['Plastic crates', 'SM_Crate_Plastic_01', { gap: 0.4, n: 3 }],
  ['Rag can', 'SM_OilyRagCan_01', { gap: 0.4 }]
], { mid: true });
var oil2 = [oi2[0], tools(oi2[0], 'Spray cans', [['SM_SprayCan_01', -0.22, 0, 2], ['SM_SprayCan_01', 0, 0, 2], ['SM_SprayCan_01', 0.22, 0, 2]]), oi2[1],
  tools(oi2[1], 'Gas cans', [['SM_GasCan_Plastic_01', -0.2, 0, 1.4], ['SM_GasCan_Plastic_01', 0.25, 0, 1.4]]),
  tools(oi2[1], 'Funnels and drain pan', [['SM_Funnel_01', -0.38, 0.02, 1.6], ['SM_OilDrainPan_01', 0.05, 0.02, 1]]), oi2[2], oi2[3]];
AREAS.oil = {
  cx: 12.2, cz: -17.8, vacant: [9.7, 14.7, -22.2, -13.4], sign: [12.2, -14.4, 1.9],
  floor: [floor(9.7, 14.7, -22.2, -13.4, 0x56603a)],
  ups: compose([
    oi0,
    oi1,
    oil2,
    [SIGN, board('Oil board', 'board.h_oil', 10.7, -14.0, 1.1, 0.95), lights([[12.0, -20.4], [12.0, -16.2]]),
      lamps('Oil lights', [[12.4, -20.0, Math.PI / 2], [12.4, -16.0, Math.PI / 2]]),
      plinth('Golden oil jug', 'Workbench_Steel_01', 10.5, -16.0, 'k', [['OilJug_01', 0, 0, 3.4]])],
    [put('Shop mat', 'SM_FloorMat_01', 12.0, -14.0, 'k', { spots: 0 }), put('Rag can', 'SM_OilyRagCan_01', 14.35, -14.3, 'k', { spots: 0 }),
      put('Steel bin', 'SM_TrashCan_Steel_01', 10.0, -13.7, 'k', { spots: 0 }), put('Wet floor sign', 'WetFloorSign_01', 13.4, -14.0, 'k', { spots: 0 })],
    [staff('Oil clerk', 13.4, -17.0, 'k'), HELP]
  ])
};

// Batteries and parts: shelves and cabinets on the east wall, battery benches, engines on stands
var ba0 = strip('k', 14.7, -13.1, [
  ['Battery shelf one', 'SM_Shelving_HD_Loaded_01'],
  ['Battery shelf two', 'SM_Shelving_HD_Loaded_01', { gap: 0.05 }],
  ['Tall parts cabinet', 'GarageCab_Tall_05', { gap: 0.2 }],
  ['Drawer cabinet', 'SM_GarageCab_Base_Drawers_05', { gap: 0.05 }],
  ['Locker', 'Locker_Double_01', { gap: 0.2 }],
  ['Door cabinet', 'SM_GarageCab_Base_Door_10', { gap: 0.05 }],
  ['Parts totes', 'SM_Tote_Stack_01', { gap: 0.15 }]
]);
var ba1 = strip('k', 12.6, -13.1, [
  ['Battery bench', 'Workbench_Wood_01', { on: [['pw/Battery_Car_01', -0.28, 0, 1.6], ['pw/Battery_Car_01', 0, 0, 1.6], ['pw/Battery_Car_01', 0.28, 0, 1.6]] }],
  ['Charger bench', 'SM_Workbench_Steel_01', { gap: 0.125, on: [['pw/SM_BatteryCharger_01', -0.2, 0, 1.2], ['pw/SM_JumperCables_01', 0.2, 0, 1.6]] }],
  ['Rotor bench', 'SM_Workbench_Steel_01', { gap: 0.125, on: [['pw/SM_BrakeRotor_01', -0.2, 0, 1.6], ['pw/SM_BrakeRotor_01', 0.2, 0, 1.6]] }],
  ['Muffler bench', 'SM_Workbench_Steel_01', { gap: 0.125, on: [['pw/SM_Muffler_01', 0, 0, 1.2]] }],
  ['Spring bench', 'SM_Workbench_Steel_01', { gap: 0.125, on: [['pw/SM_Strut_Spring_01', -0.2, 0, 2], ['pw/SM_Strut_Spring_01', 0.2, 0, 2]] }]
], { mid: true, s: 2 });
var ba2 = strip('k', 10.9, -12.9, [
  ['Engine on stand', 'SM_Engine_OnStand_01'],
  ['Engine bench', 'SM_Workbench_Steel_01', { gap: 0.2 }],
  ['Engine stand', 'SM_EngineStand_01', { gap: 0.2 }],
  ['Engine hoist', 'SM_EngineHoist_01', { gap: 0.2 }],
  ['Parts washer', 'SM_PartsWasher_01', { gap: 0.2 }]
], { mid: true });
var batt2 = [ba2[0], ba2[1], tools(ba2[1], 'V8 block', [['SM_EngineBlock_V8_01', 0, 0, 0.7]]), ba2[2], ba2[3], ba2[4],
  tools(ba2[1], 'Trouble lights', [['SM_TroubleLight_01', -0.25, 0, 2], ['SM_Flashlight_01', 0.25, 0, 2]])];
AREAS.batt = {
  cx: 12.2, cz: -10.9, vacant: [9.7, 14.7, -13.4, -8.4], sign: [12.2, -9.1, 1.9],
  floor: [floor(9.7, 14.7, -13.4, -8.4, 0x5e3a3f)],
  ups: compose([
    ba0,
    ba1,
    batt2,
    [SIGN, board('Parts board', 'board.h_batt', 10.6, -13.0, 1.1, 0.95), lights([[12.4, -12.2], [12.4, -9.6]]),
      lamps('Parts lights', [[12.4, -12.0, Math.PI / 2], [12.4, -9.6, Math.PI / 2]]),
      big('Golden engine', 'SM_EngineBlock_V8_01', 13.4, -9.0, 'k', 1.5)],
    [put('Shop mat', 'SM_FloorMat_01', 12.0, -8.7, 'k', { spots: 0 }), put('Rolling stool', 'ShopStool_Rolling_01', 10.1, -9.0, 'k', { spots: 0 }),
      put('Steel bin', 'SM_TrashCan_Steel_01', 14.3, -8.7, 'k', { spots: 0 }), put('Wet floor sign', 'WetFloorSign_01', 11.2, -8.7, 'k', { spots: 0 })],
    [staff('Parts clerk', 13.5, -11.4, 'k'), HELP]
  ])
};

// Lawn and garden: tool racks on the east wall, mowers and barrows in the middle
var la0 = strip('k', 14.7, -8.1, [
  ['Garden tool rack', 'SM_GardenTools_Rack_01', { y: 0.15 }],
  ['Second tool rack', 'SM_GardenTools_Rack_01', { y: 0.15, gap: 0.05 }],
  ['Hose hangers', 'SM_HoseHanger_Garden_01', { y: 0.45, gap: 0.2, n: 2 }],
  ['Wheeled bin', 'SM_TrashBin_Wheeled_01', { gap: 0.3 }],
  ['Second wheeled bin', 'SM_TrashBin_Wheeled_01', { gap: 0.05 }],
  ['Recycle bin', 'SM_RecycleBin_01', { gap: 0.2 }],
  ['Third tool rack', 'SM_GardenTools_Rack_01', { y: 0.15, gap: 0.2 }]
]);
var la1 = strip('k', 12.2, -7.8, [
  ['Lawn mower', 'SM_LawnMower_01'],
  ['Wheelbarrow', 'SM_Wheelbarrow_01', { gap: 0.4 }],
  ['Hand truck', 'SM_HandTruck_01', { gap: 0.4 }],
  ['Second mower', 'SM_LawnMower_01', { gap: 0.4 }],
  ['Second wheelbarrow', 'SM_Wheelbarrow_01', { gap: 0.4 }]
], { mid: true, s: 2 });
var la2 = strip('k', 10.6, -7.6, [
  ['Garden bench', 'Workbench_Wood_01'],
  ['Folding chairs', 'SM_FoldingChair_01', { gap: 0.4, n: 3 }],
  ['Coolers', 'SM_Cooler_01', { gap: 0.4, n: 2 }],
  ['Propane tanks', 'SM_PropaneTank_01', { gap: 0.4, n: 3 }],
  ['Furniture dolly', 'SM_Dolly_Furniture_01', { gap: 0.4 }]
], { mid: true });
var lawn2 = [la2[0], tools(la2[0], 'Rake and shovel', [['SM_Rake_01', -0.2, 0, 1.2], ['SM_Shovel_01', 0.2, 0, 1.2]]), la2[1], la2[2], la2[3], la2[4],
  tools(la2[0], 'Work lights', [['SM_TroubleLight_01', -0.1, 0.05, 2], ['SM_Flashlight_01', 0.3, 0, 2]])];
AREAS.lawn = {
  cx: 12.2, cz: -4.9, vacant: [9.7, 14.7, -8.4, -1.4], sign: [12.2, -2.4, 1.9],
  floor: [floor(9.7, 14.7, -8.4, -1.4, 0x3c5a6e)],
  ups: compose([
    la0,
    la1,
    lawn2,
    [SIGN, board('Lawn board', 'board.h_lawn', 10.5, -2.0, 1.1, 0.95), lights([[12.4, -6.4], [12.4, -3.6]]),
      lamps('Yard lights', [[12.4, -6.0, Math.PI / 2], [12.4, -3.4, Math.PI / 2]]),
      big('Golden mower', 'SM_LawnMower_01', 13.4, -2.6, 'k', 1.4)],
    [put('Shop mat', 'SM_FloorMat_01', 12.0, -1.8, 'k', { spots: 0 }), put('Steel bin', 'SM_TrashCan_Steel_01', 14.3, -1.8, 'k', { spots: 0 }),
      put('Broom', 'SM_Broom_Push_01', 10.1, -2.0, 'k', { spots: 0 }), put('Wet floor sign', 'WetFloorSign_01', 11.0, -1.8, 'k', { spots: 0 })],
    [staff('Garden clerk', 13.5, -4.9, 'k'), HELP]
  ])
};

// Power tools: benches and machines in rows across the middle
var po0 = strip('s', -12.4, 1.6, [
  ['Miter saw station', 'SM_MiterSaw_Stand_01'],
  ['Table saw', 'SM_TableSaw_01', { gap: 0.15 }],
  ['Band saw', 'SM_BandSaw_01', { gap: 0.15 }],
  ['Drill press', 'SM_DrillPress_Floor_01', { gap: 0.15 }],
  ['Grinder stand', 'SM_BenchGrinder_Stand_01', { gap: 0.15 }],
  ['Metal lathe', 'SM_Lathe_Metal_01', { gap: 0.15 }],
  ['Dust collector', 'SM_DustCollector_01', { gap: 0.15 }]
]);
var po1 = strip('s', -10.5, 1.7, [
  ['Drill bench', 'SM_Workbench_Steel_01', { on: [['pw/SM_Drill_Cordless_01', -0.2, 0, 2.2], ['pw/SM_Jigsaw_01', 0.2, 0, 2.2]] }],
  ['Saw bench', 'Workbench_Wood_01', { gap: 0.15, on: [['pw/SM_CircularSaw_01', -0.2, 0, 1.8], ['pw/SM_ChopSaw_01', 0.22, 0, 1.2]] }],
  ['Sander bench', 'SM_Workbench_Steel_01', { gap: 0.15, on: [['pw/SM_Sander_Orbital_01', -0.2, 0, 2.2], ['pw/SM_BeltSander_Bench_01', 0.2, 0, 1.2]] }],
  ['Grinder bench', 'Workbench_Wood_01', { gap: 0.15, on: [['pw/SM_AngleGrinder_01', -0.25, 0, 2], ['pw/SM_BenchGrinder_01', 0.2, 0, 1.4]] }],
  ['Air compressor', 'SM_Compressor_Pancake_01', { gap: 0.15 }]
], { mid: true, s: 2 });
var po2 = strip('s', -8.5, 1.5, [
  ['Generator', 'SM_Generator_Portable_01'],
  ['Pressure washer', 'SM_PressureWasher_01', { gap: 0.2 }],
  ['Shop vac', 'SM_ShopVac_Drum_01', { gap: 0.2 }],
  ['Torpedo heater', 'SM_Heater_Torpedo_01', { gap: 0.2 }],
  ['Wire welder', 'SM_Welder_MIG_01', { gap: 0.2 }],
  ['Shop press', 'SM_ShopPress_01', { gap: 0.2 }],
  ['Drum fan', 'SM_FloorFan_Drum_01', { gap: 0.2 }]
], { mid: true });
AREAS.power = {
  cx: 4.05, cz: -8.6, vacant: [1.25, 6.9, -12.5, -4.7], sign: [4.0, -5.6, 1.9],
  floor: [floor(1.25, 6.9, -12.5, -4.7, 0x504868)],
  ups: compose([
    po0,
    po1,
    po2,
    [SIGN, board('Power tool board', 'board.h_power', 2.0, -4.9, 1.1, 0.95), lights([[3.2, -11.2], [3.2, -7.2]]),
      lamps('Shop lights', [[2.6, -11.0], [5.4, -11.0]]),
      big('Golden drill press', 'SM_DrillPress_Floor_01', 5.4, -6.2, 's', 1.4)],
    [put('Shop mat', 'SM_FloorMat_01', 4.0, -5.1, 's', { spots: 0 }), put('Steel bin', 'SM_TrashCan_Steel_01', 6.4, -5.1, 's', { spots: 0 }),
      put('Rolling stool', 'ShopStool_Rolling_01', 1.8, -5.3, 's', { spots: 0 }), put('Wet floor sign', 'WetFloorSign_01', 2.8, -5.2, 's', { spots: 0 })],
    [staff('Tool clerk', 5.9, -9.5, 'n'), HELP]
  ])
};

// Tires and wheels: tire racks along the north edge, the changer and balancer in a row, jacks and stands
var ti0 = strip('s', -12.9, -6.5, [
  ['Tire rack', 'TireRack_Wall_01'],
  ['Second tire rack', 'TireRack_Wall_01', { gap: 0.1 }],
  ['Tire stack', 'Tire_Stack_01', { gap: 0.2 }],
  ['Wheel pallet', 'Pallet_01', { gap: 0.2, on: [['pw/Wheel_01', -0.1, 0, 1, 0.061], ['pw/Wheel_01', 0.1, 0.05, 1, 0.061]] }],
  ['Third tire rack', 'TireRack_Wall_01', { gap: 0.2 }],
  ['Second tire stack', 'Tire_Stack_01', { gap: 0.2 }],
  ['Steel wheel pallet', 'Pallet_01', { gap: 0.2, on: [['pw/SM_Wheel_Steel_01', -0.1, 0, 1, 0.061], ['pw/SM_Wheel_Steel_01', 0.1, 0.05, 1, 0.061]] }]
]);
var ti1 = strip('s', -10.8, -6.4, [
  ['Tire changer', 'SM_TireChanger_01'],
  ['Wheel balancer', 'SM_WheelBalancer_01', { gap: 0.3 }],
  ['Island tire stacks', 'Tire_Stack_01', { gap: 0.3, n: 2 }],
  ['Rim bench', 'SM_Workbench_Steel_01', { gap: 0.3, on: [['pw/Rim_01', -0.2, 0, 1.2], ['pw/Rim_01', 0.2, 0, 1.2]] }],
  ['Wheel pallet', 'Pallet_01', { gap: 0.3, on: [['pw/Wheel_01', 0, 0, 1, 0.061]] }]
], { mid: true, s: 2 });
var ti2 = strip('s', -8.6, -6.4, [
  ['Jack bench', 'SM_Workbench_Steel_01'],
  ['Floor jack', 'SM_FloorJack_01', { gap: 0.3 }],
  ['Jack stands', 'SM_JackStand_01', { gap: 0.3, n: 2 }],
  ['Car ramps', 'SM_CarRamp_01', { gap: 0.3, n: 2 }],
  ['Creeper', 'SM_Creeper_01', { gap: 0.3 }]
], { mid: true });
var tire2 = [ti2[0], tools(ti2[0], 'Bottle jacks', [['SM_BottleJack_01', -0.2, 0, 2], ['SM_BottleJack_01', 0.1, 0, 2]]), ti2[1], ti2[2], ti2[3], ti2[4],
  tools(ti2[0], 'Lug wrenches', [['SM_LugWrench_Cross_01', 0.28, 0, 1.6]])];
AREAS.tires = {
  cx: -4.1, cz: -8.9, vacant: [-6.9, -1.25, -13.0, -4.7], sign: [-4.1, -5.4, 1.9],
  floor: [floor(-6.9, -1.25, -13.0, -4.7, 'quarrybw')],
  ups: compose([
    ti0,
    ti1,
    tire2,
    [SIGN, board('Tire board', 'board.h_tires', -6.0, -5.0, 1.1, 0.95), lights([[-4.6, -11.6], [-4.6, -7.4]]),
      lamps('Tire lights', [[-5.2, -11.6], [-3.0, -11.6]]),
      up(nm('Golden tire'), { sign: 'gold' }, pw('Pallet_01', -2.4, -6.2, 's', { spots: 0 }), { m: 'pw/Tire_Stack_01', x: -2.4, z: -6.2, r: 0, k: 1.3, y: 0.061, flat: 1 })],
    [put('Shop mat', 'SM_FloorMat_01', -4.1, -5.1, 's', { spots: 0 }), put('Steel bin', 'SM_TrashCan_Steel_01', -6.4, -5.1, 's', { spots: 0 }),
      put('Parking stop', 'SM_ParkingStop_01', -4.1, -4.9, 's', { spots: 0 }), put('Wet floor sign', 'WetFloorSign_01', -2.0, -5.1, 's', { spots: 0 })],
    [staff('Tire clerk', -2.0, -9.5, 'n'), HELP]
  ])
};

// Storage and garage: cabinets and lockers along the west wall, cabinet islands and totes beside them
var st0 = strip('b', -14.7, -14.4, [
  ['Garage shelf one', 'SM_Shelving_HD_Loaded_01'],
  ['Garage shelf two', 'SM_Shelving_HD_Loaded_01', { gap: 0.8 }],
  ['Locker pair', 'Locker_Double_01', { gap: 0.8 }],
  ['Tall cabinet', 'GarageCab_Tall_05', { gap: 0.8 }],
  ['Garage shelf three', 'SM_Shelving_HD_Loaded_01', { gap: 0.8 }],
  ['Door cabinet', 'SM_GarageCab_Base_Door_10', { gap: 0.8 }],
  ['Bin rack', 'SM_BinRack_Wall_01', { gap: 0.8, y: 0.6 }]
]);
var st1 = strip('b', -12.3, -14.0, [
  ['Door cabinet island', 'SM_GarageCab_Base_Door_10', { n: 2, top: [['SM_GarageCab_Top_20']] }],
  ['Drawer cabinet island', 'SM_GarageCab_Base_Drawers_05', { gap: 0.8, n: 4, top: [['SM_GarageCab_Top_20']] }],
  ['Steel workbench', 'SM_Workbench_Steel_01', { gap: 0.8 }],
  ['Wood workbench', 'Workbench_Wood_01', { gap: 0.8 }],
  ['Tote stacks', 'SM_Tote_Stack_01', { gap: 0.8, n: 3 }]
], { mid: true, s: 2 });
var st2 = strip('b', -10.7, -13.9, [
  ['Locker bank', 'Locker_Double_01', { n: 2 }],
  ['Plastic crates', 'SM_Crate_Plastic_01', { gap: 0.8, n: 3 }],
  ['Wood crates', 'SM_Crate_Wood_01', { gap: 0.8, n: 2 }],
  ['Lidded totes', 'SM_Tote_Lidded_01', { gap: 0.8, n: 2 }],
  ['Shop stools', 'SM_ShopStool_01', { gap: 0.8, n: 3 }],
  ['Parts bins', 'PartsBin_01', { gap: 0.8, n: 4 }],
  ['Folding chairs', 'SM_FoldingChair_01', { gap: 0.8, n: 2 }]
], { mid: true });
AREAS.storage = {
  cx: -12.2, cz: -7.5, vacant: [-14.7, -9.7, -14.8, -0.3], sign: [-12.2, -1.0, 1.9],
  floor: [floor(-14.7, -9.7, -14.8, -0.3, 0x6b4a32)],
  ups: compose([
    st0,
    st1,
    st2,
    [SIGN, board('Storage board', 'board.h_storage', -11.2, -0.8, 1.1, 0.95), lights([[-12.2, -9.0], [-12.2, -4.0]]),
      lamps('Garage lights', [[-12.2, -9.5, Math.PI / 2], [-12.2, -4.5, Math.PI / 2]]),
      plinth('Golden cabinet', 'Workbench_Steel_01', -13.0, -2.0, 'b', [['SM_ToolBag_01', 0, 0, 2.2]])],
    [put('Shop mat', 'SM_FloorMat_01', -12.2, -0.7, 's', { spots: 0 }), put('Steel bin', 'SM_TrashCan_Steel_01', -14.3, -0.6, 's', { spots: 0 }),
      put('Rag can', 'SM_OilyRagCan_01', -10.2, -0.7, 's', { spots: 0 }), put('Wet floor sign', 'WetFloorSign_01', -11.4, -0.8, 's', { spots: 0 })],
    [staff('Garage clerk', -11.4, -7.5, 'b'), HELP]
  ])
};

// The wing rooms: the welding corner and the break room are places, built a piece at a time; the returns room and the
// lumber store beside them are there from the first day
var WING = {
  rest: {
    rect: [15.3, 21.5, -8, -3],
    visit: [],
    ups: [
      pack(nm('A welding table'), pw('SM_WeldingTable_01', 16.9, -7.65, 's', { spots: 0 })),
      pack(nm('A wire welder'), pw('SM_Welder_MIG_01', 18.0, -7.55, 's', { spots: 0 })),
      pack(nm('A welding helmet'), { m: 'pw/SM_WeldingHelmet_01', x: 16.65, z: -7.65, r: 0, k: 1.6, y: 0.426, flat: 1 }),
      pack(nm('Gas cylinders'), pw('SM_GasCylinder_01', 19.2, -7.7, 's', { spots: 0, n: 3 })),
      pack(nm('A gas cart'), pw('SM_OxyAcetylene_Cart_01', 20.1, -7.55, 's', { spots: 0 })),
      pack(nm('A stick welder and a sandblaster'), pw('SM_Welder_Stick_01', 20.95, -7.65, 's', { spots: 0 }), pw('SM_SandblastCabinet_01', 16.5, -3.55, 'n', { spots: 0 })),
      pack(nm('An anvil and a shop press'), pw('SM_Anvil_Stump_01', 18.0, -3.65, 'n', { spots: 0 }), pw('SM_ShopPress_01', 19.3, -3.6, 'n', { spots: 0 })),
      pack(nm('A drum fan and a heater'), pw('SM_FloorFan_Drum_01', 20.6, -3.65, 'n', { spots: 0 }), pw('SM_Heater_Torpedo_01', 21.0, -5.2, 'k', { spots: 0 }))
    ]
  },
  lounge: {
    rect: [15.3, 21.5, -14, -8],
    visit: [],
    ups: [
      pack(nm('Lockers'), pw('EmployeeLockers_3_01', 15.6, -9.2, 'b', { spots: 0 }), pw('EmployeeLockers_3_01', 15.6, -10.1, 'b', { spots: 0 })),
      pack(nm('A time clock and first aid'), KIT.wp('TimeClock_Wall_01', 15.32, -12.0, 'b', 0.3), KIT.wp('FirstAid_Box_Wall_01', 15.32, -12.7, 'b', 0.3)),
      pack(nm('A job board'), KIT.wp('Menu_Board_Wall_01', 18.4, -13.9, 's', 0.35)),
      pack(nm('A work table'), pw('Workbench_Wood_01', 18.4, -11.2, 's', { spots: 0 })),
      pack(nm('Stools'), pw('SM_ShopStool_01', 17.9, -11.75, 's', { spots: 0 }), pw('SM_ShopStool_01', 18.9, -11.75, 's', { spots: 0 }), pw('SM_ShopStool_01', 17.9, -10.65, 'n', { spots: 0 }),
        pw('SM_ShopStool_01', 18.9, -10.65, 'n', { spots: 0 })),
      pack(nm('A mechanic on break'), { staff: [18.9, -10.65, 'n', 'sit'] }),
      pack(nm('A second table'), pw('Table_Cafe_Round_01', 20.5, -11.0, 's', { spots: 0 }), pw('SM_FoldingChair_01', 20.5, -11.5, 's', { spots: 0 }), pw('SM_FoldingChair_01', 20.5, -10.5, 'n', { spots: 0 })),
      pack(nm('A fridge and a radio'), pw('SM_MiniFridge_01', 17.4, -13.6, 's', { spots: 0, on: [['pw/SM_Radio_Jobsite_01', 0, 0, 0, 0.41, 1]] })),
      pack(nm('A clerk on break'), { staff: [20.5, -10.5, 'n', 'sit'] }),
      pack(nm('A coffee corner and a clock'), pw('CoffeeStation_15', 20.4, -13.6, 's', { spots: 0 }), KIT.wp('ShopClock_01', 15.32, -13.3, 'b', 0.6))
    ]
  }
};

var room = KIT.room;
var low = KIT.low;
function flat(list) {
  return list.reduce(function (a, u) { return a.concat(u.piece); }, []);
}
var rets = strip('s', -2.8, 15.9, [
  ['Returns shelf one', 'SM_Shelving_HD_Loaded_01', { s: 0 }], ['Returns shelf two', 'SM_Shelving_HD_Loaded_01', { s: 0, gap: 0.05 }],
  ['Key cutting bench', 'SM_Workbench_Steel_01', { s: 0, gap: 0.3 }], ['Returns cabinet', 'SM_GarageCab_Base_Door_10', { s: 0, gap: 0.1 }]
]);
var lumber = strip('b', 15.4, -27.6, [
  ['Stock shelf one', 'SM_Shelving_HD_Loaded_01', { s: 0 }], ['Stock shelf two', 'SM_Shelving_HD_Loaded_01', { s: 0 }], ['Stock shelf three', 'SM_Shelving_HD_Loaded_01', { s: 0 }],
  ['Stock shelf four', 'SM_Shelving_HD_Loaded_01', { s: 0 }], ['Stock cabinet', 'GarageCab_Tall_05', { s: 0 }], ['Stock shelf five', 'SM_Shelving_HD_Loaded_01', { s: 0 }]
]);
var DECOR = {
  front: cat([
    { patch: rbox(-10.9, -8.1, 0.9, 1.95, 0.25), finish: 0x5a5f69 },
    { patch: rbox(8.1, 10.9, 0.9, 1.95, 0.25), finish: 0x5a5f69 },
    { text: 'board.h_order', x: 0, z: -1.35, r: 0, y: 1.75, w: 2.0, h: 0.5, post: true },
    KIT.tx('board.h_welcome_hardware', -7.6, 1.0, 1.0, 0.95),
    KIT.tx('board.h_welcome_auto', 11.7, 0.25, 1.0, 0.95),
    pw('Tire_Stack_01', -2.9, 1.95, 's', { spots: 0 }), pw('Tire_Stack_01', 2.9, 1.95, 's', { spots: 0 }),
    { m: 'furn/bench', x: -0.9, z: 2.0, r: Math.PI, k: 1.5 }, { m: 'furn/bench', x: 0.9, z: 2.0, r: Math.PI, k: 1.5 },
    pw('VendingMachine_Drink_01', 3.75, 2.0, 'n', { spots: 0 }), pw('VendingMachine_Drink_01', -3.75, 2.0, 'n', { spots: 0 }),
    pw('SM_Sign_AFrame_Blank_01', -8.3, 0.6, 's', { spots: 0 }), pw('SM_Sign_AFrame_Blank_01', 8.3, 0.6, 's', { spots: 0 }),
    // a pallet display and a lumber stand where the middle of the floor was bare, and a safety line down the aisle
    room(-14.0, 9.4, -16.35, -16.2, 0xe8b923),
    pw('Pallet_01', -5.8, -14.4, 's', { spots: 0 }), pw('PalletLoad_Cases_01', -5.8, -14.4, 's', { spots: 0 }), pw('SM_Lumber_Stack_01', -3.2, -14.6, 's', { spots: 0 }),
    pw('SM_Sawhorse_Wood_01', 3.4, -14.6, 's', { spots: 0 }), pw('SM_Sawhorse_Wood_01', 4.6, -14.6, 's', { spots: 0 }), pw('PropaneCage_01', 6.6, -14.6, 's', { spots: 0 })
  ]),
  stock: [],
  out: [],
  side: cat(
    [pw('SM_Dumpster_01', -18.6, -22.0, 'b', { spots: 0 }), pw('Pallet_01', -17.0, -21.0, 's', { spots: 0 }), pw('PalletLoad_Cases_01', -17.0, -21.0, 's', { spots: 0 }),
      pw('SM_Lumber_Stack_01', -18.2, -12.6, 's', { spots: 0 }), pw('PropaneCage_01', -16.8, -13.6, 's', { spots: 0 }),
      KIT.tx('board.h_deliveries', -19.2, -19.5, 1.5, 1.1)]
  ),
  wing: cat(
    [room(15.3, 21.5, -2.9, 2.2, 0x6b707a), room(15.3, 21.5, -7.9, -3.1, 0x4d525c), room(15.3, 21.5, -13.9, -8.1, 'boards'), room(15.3, 21.5, -28.2, -14.1, 0x8a8e96)],
    low(15.3, 15.9, -3.1, -2.9), low(17.1, 21.5, -3.1, -2.9), low(15.3, 21.5, -8.1, -7.9), low(15.3, 15.9, -14.1, -13.9), low(17.1, 21.5, -14.1, -13.9),
    flat(rets),
    [pw('PalletJack_01', 20.6, -0.9, 's', { spots: 0 }), pw('Pallet_01', 18.4, 0.3, 's', { spots: 0 }), pw('PalletLoad_Cases_01', 18.4, 0.3, 's', { spots: 0 }),
      pw('SM_TrashBin_Wheeled_01', 21.0, -2.3, 's', { spots: 0 })],
    flat(lumber),
    [pw('SM_Lumber_Stack_01', 18.6, -26.3, 's', { spots: 0 }), pw('SM_Lumber_Stack_01', 18.6, -25.5, 's', { spots: 0 }), pw('Pallet_01', 20.4, -25.0, 's', { spots: 0 }),
      pw('PalletLoad_Water_01', 20.4, -25.0, 's', { spots: 0 }), pw('SM_Crate_Wood_01', 17.4, -23.6, 's', { spots: 0, n: 2 })]
  )
};

// what each Checkouts level adds besides tills, as in plan.js
var FRONT = [
  [2, 'pw/SM_Wheelbarrow_01', -13.6, 1.8, 0], [2, 'pw/SM_Wheelbarrow_01', -7.0, 1.8, 0], [2, 'pw/SM_Wheelbarrow_01', 5.0, 1.8, 0], [2, 'pw/SM_Wheelbarrow_01', 12.0, 1.8, 0],
  [4, 'pw/SM_HandTruck_01', 13.4, 2.0, Math.PI], [4, 'pw/SM_HandTruck_01', 14.0, 2.0, Math.PI],
  [8, 'pw/PropaneCage_01', -14.3, 1.95, Math.PI], [8, 'pw/Tire_Stack_01', -13.6, 1.95, Math.PI], [8, 'pw/SM_Sign_AFrame_Blank_01', -13.0, 1.95, Math.PI], [8, 'pw/NewspaperRack_01', -12.5, 1.95, Math.PI],
  [10, 'pw/DiningBench_01', -6.1, 1.95, Math.PI], [10, 'pw/SM_Sawhorse_Wood_01', -7.0, 1.95, 0], [10, 'pw/Planter_Tall_01', -5.15, 1.95, 0]
];

export var HARDWARE = Object.assign({}, PLAN, {
  type: 'hardware',
  home: { x: -4.5, z: -18.5 },
  areas: AREAS,
  order: Object.keys(AREAS),
  wing: WING,
  decor: DECOR,
  front: FRONT,
  yard: true,
  floor: [
    { r: [-15, 15, -22.5, 2.5], finish: 0x8f949d },
    { r: [-15, 15, -28.5, -22.5], finish: 0x7f838c },
    { r: [15, 22, -28.5, 2.5], finish: 0x7f838c }
  ],
  tint: { wall: 0xc9d1de },
  entrances: PLAN.entrances.map(function (en, i) {
    return Object.assign({}, en, { name: i ? 'sign.h_auto' : 'sign.h_hardware' });
  }),
  laneM: [['pw/SM_GarageCab_Base_Door_10', -0.15, -0.85, -Math.PI / 2], ['pw/SM_GarageCab_Base_Door_10', -0.15, -0.35, -Math.PI / 2], ['pw/SM_GarageCab_Base_Door_10', -0.15, 0.15, -Math.PI / 2],
    ['pw/SM_GarageCab_Top_20', -0.15, -0.6, -Math.PI / 2, 0.44], ['pw/SM_GarageCab_Top_10', -0.15, 0.15, -Math.PI / 2, 0.44], ['pw/Register_Classic_01', -0.15, 0.2, -Math.PI / 2, 0.46]],
  deskBoard: 'board.h_service',
  wingBoard: 'board.h_workshop',
  bankFloor: 0x5a5f69,
  carry: { bag: ['pw/SM_ToolBag_01*1.4', 0.03], basket: ['pw/SM_Tote_Lidded_01*0.8', 0.07], plant: ['pw/SM_Tire_01*0.8', 0.12] },
  models: ['pw/SM_GarageCab_Base_Door_10', 'pw/SM_GarageCab_Top_20', 'pw/SM_GarageCab_Top_10', 'pw/Register_Classic_01', 'pw/SM_ToolBag_01', 'pw/SM_Tote_Lidded_01', 'pw/SM_Tire_01',
    'pw/SM_CarLift_2Post_01', 'pw/SM_CarLift_Scissor_01', 'pw/SM_TireChanger_01', 'pw/SM_Compressor_Pancake_01', 'pw/SM_JackStand_01', 'pw/Tire_Stack_01', 'car/sedan', 'roads/construction-cone']
});
