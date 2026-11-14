import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { clone } from 'three/addons/utils/SkeletonUtils.js';

var BASE = 'assets/models/';
var TILT = 52 * Math.PI / 180;

// The store stands on the kits' one unit grid, walls on the half lines. The checkouts fill the front, the main aisle runs
// north from the doors to the back wall, and the departments, six wide and five deep, sit two to a row either side of
// it with no walls between them. In front: the parking lot, the sidewalk and the street.
var DEPTH = 5;
var UNIT = 6;
var FRONT = 2.5;
var BACK = -2.5;
var SIDE = 1.5;
var EDGE = SIDE + UNIT;
var LOT = [4, 9.6];
var WALK_N = 10.05;
var LANE_W = 11.25;
var LANE_E = 12.75;
var WALK_S = 13.95;
var AISLE = 6.8;
var DRIVE = 10.6;

// the kits are drawn at different sizes; these bring them to the shop kit's people
var SCALE = { car: 0.47, roads: 3, nature: 1.4, furn: 0.9, food: 0.5, sub: 3.2, toy: 1.1, forest: 0.9, golf: 0.45, pets: 0.08 };

var FOLK = 'abcdef'.split('').reduce(function (a, c) { return a.concat(['chars/character-female-' + c, 'chars/character-male-' + c]); }, []);
var CARS = ['car/sedan', 'car/suv', 'car/suv-luxury', 'car/hatchback-sports', 'car/van'];

// Fixtures, with the surfaces their goods stand on, in the model's own frame (front toward +z). A shelf is stocked on
// both faces, two levels each; an end cap on its front only; tables, crates and pallets carry heaps, one kind of goods
// per section; coolers hold goods behind their glass, on two levels, and chests in their tub. A bunker is a chest
// left open. `stock` is overstock on a pallet, which nobody shops from
var WHITE = '@13,3>2,2';
var RED = '@13,3>2,1';
var KIND = {
  shelf: { ref: 'shop/shelf-boxes', two: true, rows: [0.18, 0.56], x: [-0.33, 0.33], z: [0.04, 0.32] },
  end: { ref: 'shop/shelf-end', rows: [0.18, 0.56], x: [-0.33, 0.33], z: [-0.36, -0.06] },
  table: { ref: 'shop/clothing-table', top: 0.35, x: [-0.4, 0.4], z: [-0.25, 0.1] },
  stand: { ref: 'shop/clothing-table@3,3>9,2', top: 0.35, x: [-0.4, 0.4], z: [-0.25, 0.1] },
  crate: { ref: 'shop/display-bread', top: 0.22, x: [-0.26, 0.26], z: [-0.2, 0.24] },
  pallet: { ref: 'shop/display-cans', top: 0.3, x: [-0.35, 0.35], z: [-0.35, 0.35] },
  cooler: { ref: 'shop/freezers-standing', rows: [0.1, 0.5], x: [-0.42, 0.42], z: [-0.44, -0.16] },
  coolerW: { ref: 'shop/freezers-standing' + WHITE, rows: [0.1, 0.5], x: [-0.42, 0.42], z: [-0.44, -0.16] },
  coolerR: { ref: 'shop/freezers-standing' + RED, rows: [0.1, 0.5], x: [-0.42, 0.42], z: [-0.44, -0.16] },
  tank: { ref: 'shop/freezers-standing@13,3>15,3;3,2>6,1', rows: [0.2, 0.6], x: [-0.42, 0.42], z: [-0.44, -0.16] },
  chest: { ref: 'shop/freezer', top: 0.06, x: [-0.34, 0.34], z: [-0.25, 0.25], flat: true },
  bunker: { ref: 'shop/freezer', top: 0.06, x: [-0.34, 0.34], z: [-0.25, 0.25], flat: true, open: true },
  stock: { ref: 'skate/pallet', top: 0.16, x: [-0.24, 0.24], z: [-0.24, 0.24], none: true }
};

// recoloured packaging: the label cell of each item moved round the atlas
function tints(ref, from, to) {
  return to.map(function (c) { return ref + '@' + from + '>' + c; });
}
var BOX = tints('shop/shelf-boxes.box', '15,2', ['15,2', '3,1', '4,1', '12,2', '8,1', '0,1']);
var PARCEL = 'shop/shelf-boxes.box@2,2>10,2;3,2>11,2;15,2>8,2~x';
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

// Every department fills its block in its own frame: lx from its outer wall (-3) to the main aisle (3), lz from north
// (-2.5) to south (2.5); the east ones are mirror images. What matters is set facing south, toward the camera: a back
// line along the north edge (coolers, ovens, the TV wall), two rows across the middle and a row of low displays at the
// south. A fixture is [kind or model, lx, lz, face, goods, extra, n]: placed by the middle of its footprint, its
// front turned to face (s south, n north, b toward the main aisle, k toward the wall), `n` copies side by side.
// Shoppers walk in from the main aisle along the aisles, at these lz. Sixteen fixtures go in one per step, then the
// promo display; `decor` stands from the start, and the clerk of a counter department stands at `clerk`
var AISLES = [-1.7, -0.3, 1.2];
var BL = -2.26;
var RA = -1.05;
var RB = 0.45;
var RC = 1.85;
var STRIP = [['stock', -2.45, RA, 's', 'boxes'], ['stock', -2.45, RB, 's', 'boxes']];

var DEPTS = {
  produce: {
    floor: 'shop/floor-wood', aisles: AISLES, decor: STRIP,
    feature: ['end', 2.65, RA, 'b', ['food/avocado', 'food/coconut']],
    fix: [['end', -2.2, BL, 's', ['food/broccoli', 'food/carrot~z*0.8']], ['end', -1.4, BL, 's', ['food/cauliflower', 'food/radish']],
      ['stand', -1.4, RA, 's', ['food/apple', 'food/pear']], ['stand', -0.45, RA, 's', ['food/grapes', 'food/orange']],
      ['stand', 0.5, RA, 's', ['food/avocado', 'food/lemon']], ['end', -0.6, BL, 's', ['food/cabbage', 'food/beet']],
      ['pallet', 1.9, RA, 's', ['food/pineapple']], ['stand', -1.4, RB, 's', ['food/tomato', 'hand:food/banana*0.5']],
      ['stand', -0.45, RB, 's', ['food/eggplant', 'food/onion']], ['end', 0.2, BL, 's', ['food/corn~z', 'food/mushroom']],
      ['stand', 0.5, RB, 's', ['food/paprika@15,2>11,2', 'food/paprika@15,2>9,2']], ['crate', -1.6, RC, 'n', ['flat:food/strawberry']],
      ['pallet', 1.9, RB, 's', ['food/watermelon']], ['crate', -0.7, RC, 'n', ['food/apple@15,2>9,2']],
      ['end', 1.0, BL, 's', ['food/leek~z*0.6', 'food/coconut']], ['shop/display-fruit', 0.2, RC, 'n']],
    promo: ['pallet', 1.9, RC, 'n', ['food/pumpkin']]
  },
  bakery: {
    floor: 'shop/floor-wood', aisles: [-0.6, 1.2], clerk: [-1.8, -1.88, 's'], decor: [['stock', -2.45, RB, 's', 'boxes']],
    feature: ['end', 2.65, RB, 'b', [BOX[0], BOX[4]]],
    fix: [['furn/kitchenCabinet', -2.2, -1.47, 's', [], [['food/loaf*0.8', 0, 0.02, 0.2, 0.405]], 2],
      ['furn/kitchenStove', -1.8, -2.3, 's', [], null, 3, 'staff'], ['coolerW', 0.45, BL, 's', [['food/cake*0.75', 'food/cake-birthday*0.8'], ['food/pie*0.55', 'food/cake*0.75']]],
      ['furn/kitchenCabinet', -1.4, -1.47, 's', [], [['food/croissant', 0, 0, 0.4, 0.405]], 2],
      ['shelf', -1.1, RB, 's', [[['food/loaf', 'food/loaf-round'], ['food/loaf-baguette', 'food/loaf']], [['food/croissant', 'food/bread'], ['food/loaf-round', 'food/croissant']]], null, 2],
      ['chest', 1.45, -2.2, 's', ['food/donut-sprinkles', 'food/muffin', 'food/donut-chocolate']],
      ['furn/kitchenCabinet', -1.0, -2.3, 's', null, [['food/bowl*0.6', 0, 0, 0, 0.405], ['food/rollingPin*0.6', 0, -0.1, 0.3, 0.405]], 1, 'staff'],
      ['crate', 1.9, RB, 's', ['food/loaf-baguette']], ['crate', -1.9, RC, 'n', ['food/loaf-round']],
      ['shelf', 0.5, RB, 's', [[['food/loaf-baguette', 'food/bread'], ['food/croissant', 'food/loaf']], [['food/loaf', 'food/loaf-round'], ['food/bread', 'food/loaf-baguette']]], null, 2],
      ['crate', -1.15, RC, 'n', ['food/croissant']], ['furn/kitchenFridgeLarge', -0.45, -2.28, 's', null, null, 1, 'staff'],
      ['end', 2.3, -2.3, 's', [[BOX[2], BOX[3]]]], ['crate', -0.4, RC, 'n', ['food/loaf']], ['crate', 1.1, RC, 'n', ['food/croissant']],
      ['crate', 0.35, RC, 'n', ['food/bread']]],
    promo: ['crate', 1.9, RC, 'n', ['food/loaf-baguette']]
  },
  dairy: {
    floor: 'shop/floor', aisles: AISLES, decor: [['bunker', -2.4, RB, 'b', ['food/cheese*0.6']]],
    feature: ['bunker', 2.65, RA, 'b', ['food/cheese*0.6']],
    fix: [['coolerW', -2.1, BL, 's', [[MILK[0], MILK[1]], [MILK[2], MILK[0]]]], ['coolerW', -1.1, BL, 's', [[SMALL[0], 'food/pudding'], [MILK[3], SMALL[1]]]],
      ['bunker', -1.5, RA, 's', ['food/cheese*0.6']], ['coolerW', -0.1, BL, 's', [['flat:food/egg', 'flat:food/egg'], [MILK[1], MILK[4]]]],
      ['bunker', -0.6, RA, 's', [SMALL[2]]], ['coolerW', 0.9, BL, 's', [['food/pudding', SMALL[3]], [MILK[0], MILK[2]]]],
      ['bunker', 0.3, RA, 's', ['food/cheese*0.6']], ['coolerW', 1.9, BL, 's', [[MILK[4], MILK[3]], ['flat:food/egg', SMALL[0]]]],
      ['coolerW', -1.6, RB, 's', [[MILK[2], MILK[1]], ['food/pudding', SMALL[1]]]], ['bunker', 1.9, RA, 's', [SMALL[3]]],
      ['coolerW', -0.6, RB, 's', [[SMALL[2], MILK[0]], [MILK[3], 'flat:food/egg']]], ['coolerW', 0.4, RB, 's', [[MILK[1], 'food/pudding'], [SMALL[0], MILK[4]]]],
      ['bunker', 1.9, RB, 's', ['food/cheese*0.6']], ['bunker', -1.6, RC, 'n', [SMALL[1]]], ['bunker', -0.7, RC, 'n', ['food/pudding']],
      ['bunker', 0.2, RC, 'n', ['food/cheese*0.6']]],
    promo: ['bunker', 1.9, RC, 'n', [SMALL[2]]]
  },
  meat: {
    floor: 'shop/floor%=f2ddd8', aisles: [-0.6, 1.2], clerk: [-1.4, -1.9, 's'], decor: [['stock', -2.45, RB, 's', 'boxes']],
    feature: ['chest', 2.65, RB, 'b', ['food/meat-ribs']],
    fix: [['chest', -2.2, -1.38, 's', ['food/meat-raw']], ['chest', -1.4, -1.38, 's', ['food/meat-ribs']],
      ['furn/kitchenCabinet', -1.8, -2.3, 's', null, [['food/cutting-board*0.6', 0, 0, 0.2, 0.405], ['food/knife-block*0.6', 0.1, -0.1, 0, 0.405]], 3, 'staff'],
      ['chest', -0.6, -1.38, 's', ['food/meat-sausage']], ['coolerR', 0.45, BL, 's', [['food/turkey*0.6', 'food/whole-ham*0.7'], ['food/sausage', 'food/hot-dog-raw']]],
      ['chest', 1.45, -2.2, 's', ['food/fish~z*0.8']], ['chest', -1.72, RB, 's', ['food/bacon-raw']], ['chest', -0.9, RB, 's', ['food/meat-patty']],
      ['chest', -0.05, RB, 's', ['food/meat-raw']], ['end', 2.3, -2.3, 's', [['food/bottle-ketchup', 'food/bottle-musterd']]],
      ['chest', 0.8, RB, 's', ['food/mussel']], ['chest', -1.6, RC, 'n', ['food/whole-ham*0.7']], ['chest', -0.7, RC, 'n', ['food/meat-ribs']],
      ['chest', 1.9, RB, 's', ['food/hot-dog-raw']], ['chest', 0.2, RC, 'n', ['food/bacon-raw']], ['chest', 1.05, RC, 'n', ['food/sausage']]],
    promo: ['chest', 1.9, RC, 'n', ['food/meat-patty']]
  },
  frozen: {
    floor: 'shop/floor%=d6e7f5', aisles: AISLES, decor: [['chest', -2.4, RA, 'b', ['food/ice-cream-cup']], ['chest', -2.4, RB, 'b', [PIZZA[0]]]],
    feature: ['chest', 2.65, RA, 'b', [PIZZA[1]]],
    fix: [['cooler', -2.1, BL, 's', [['food/ice-cream-cup', SMALL[1]], [PIZZA[0], 'food/bag-flat']]], ['cooler', -1.1, BL, 's', [[SMALL[2], 'food/ice-cream-cup'], ['food/bag-flat', PIZZA[1]]]],
      ['cooler', -1.6, RA, 's', [['food/ice-cream-cup', SMALL[0]], ['food/popsicle', PIZZA[1]]]], ['cooler', -0.1, BL, 's', [['food/popsicle', 'food/ice-cream-cup'], [SMALL[3], 'food/popsicle-chocolate']]],
      ['cooler', -0.6, RA, 's', [[PIZZA[0], 'food/bag-flat'], [SMALL[2], 'food/ice-cream-cup']]], ['cooler', 0.9, BL, 's', [[PIZZA[0], SMALL[0]], ['food/ice-cream-cup', 'food/bag-flat']]],
      ['cooler', 0.4, RA, 's', [['food/popsicle-chocolate', SMALL[1]], ['food/bag-flat', PIZZA[0]]]], ['cooler', 1.9, BL, 's', [['food/bag-flat', 'food/ice-cream-cup'], [SMALL[1], PIZZA[1]]]],
      ['chest', -1.5, RB, 's', ['food/ice-cream-cup', 'food/popsicle']], ['chest', 1.9, RA, 's', [SMALL[3]]],
      ['chest', -0.6, RB, 's', [PIZZA[1]]],
      ['chest', 0.3, RB, 's', ['food/bag-flat']], ['chest', 1.9, RB, 's', ['food/ice-cream-cup']],
      ['chest', -1.6, RC, 'n', ['food/popsicle']], ['chest', -0.7, RC, 'n', [PIZZA[0]]], ['chest', 0.2, RC, 'n', ['food/bag-flat']]],
    promo: ['chest', 1.9, RC, 'n', ['food/ice-cream-cup']]
  },
  pantry: {
    floor: 'shop/floor%=efe6d2', aisles: AISLES, decor: STRIP,
    feature: ['end', 2.65, RA, 'b', [CAN[4], 'food/peanut-butter']],
    fix: [['end', -2.2, -2.3, 's', ['food/peanut-butter', 'food/honey']], ['end', -1.4, -2.3, 's', ['food/bottle-ketchup', 'food/bottle-musterd']],
      ['shelf', -1.1, RA, 's', [[[BOX[0], CAN[0]], [CARTON[1], BAG[0]]], [[BOX[1], CAN[1]], [BAG[2], CARTON[0]]]], null, 2],
      ['end', -0.6, -2.3, 's', ['food/bottle-oil', 'food/soy']], ['shelf', 0.5, RA, 's', [[[CAN[2], BOX[2]], [BAG[1], CAN[3]]], [[CARTON[2], BOX[3]], [CAN[4], BAG[3]]]], null, 2],
      ['end', 0.2, -2.3, 's', [CAN[3], 'food/can-small']], ['pallet', 1.9, RA, 's', [CAN[1]]],
      ['shelf', -1.1, RB, 's', [[[BOX[4], CARTON[3]], [CAN[0], BAG[4]]], [[BOX[5], CAN[2]], [CARTON[4], BAG[5]]]], null, 2],
      ['end', 1.0, -2.3, 's', [CAN[4], CAN[0]]], ['shelf', 0.5, RB, 's', [[[CAN[1], BOX[0]], [BAG[0], CARTON[2]]], [[BOX[2], CAN[3]], [CARTON[1], BAG[1]]]], null, 2],
      ['pallet', 1.9, RB, 's', [CAN[2]]], ['pallet', -1.6, RC, 'n', [BAG[2]]], ['end', 1.8, -2.3, 's', ['food/peanut-butter', CAN[2]]],
      ['pallet', -0.7, RC, 'n', [BOX[1]]], ['pallet', 0.2, RC, 'n', [CARTON[3]]], ['pallet', 1.05, RC, 'n', ['food/honey']]],
    promo: ['pallet', 1.9, RC, 'n', [CAN[0]]]
  },
  snacks: {
    floor: 'shop/floor%=f4ecca', aisles: AISLES, decor: STRIP,
    feature: ['end', 2.65, RA, 'b', [BAG[5], 'food/candy-bar-wrapper']],
    fix: [['coolerR', -2.1, BL, 's', [[SODA[0], TIN[1]], [SODA[1], SODA[2]]]], ['coolerR', -1.1, BL, 's', [[TIN[2], SODA[3]], [SODA[2], TIN[3]]]],
      ['shelf', -1.1, RA, 's', [[[BAG[0], 'food/candy-bar-wrapper'], [BAG[1], 'food/chocolate-wrapper']], [[BAG[2], 'food/lollypop'], [BAG[3], 'food/candy-bar-wrapper']]], null, 2],
      ['coolerR', -0.1, BL, 's', [[SODA[1], SODA[0]], [TIN[0], SODA[3]]]],
      ['shelf', 0.5, RA, 's', [[[BAG[4], 'food/chocolate-wrapper'], [BAG[5], BOX[3]]], [[BAG[0], BOX[1]], [BAG[2], 'food/lollypop']]], null, 2],
      ['end', 0.8, -2.3, 's', [BAG[1], BAG[3]]], ['pallet', 1.9, RA, 's', [SODA[0]]],
      ['shelf', -1.1, RB, 's', [[[SODA[0], TIN[1]], [SODA[2], SODA[1]]], [[SODA[3], SODA[0]], [TIN[2], SODA[2]]]], null, 2],
      ['end', 1.6, -2.3, 's', ['food/lollypop', BAG[4]]], ['shelf', 0.5, RB, 's', [[[BOX[0], BAG[5]], [BOX[2], BAG[1]]], [[BOX[4], BAG[0]], [BOX[5], BAG[3]]]], null, 2],
      ['pallet', 1.9, RB, 's', [SODA[1]]], ['pallet', -1.6, RC, 'n', [CARTON[0]]], ['end', 2.4, -2.3, 's', ['food/chocolate-wrapper', BAG[2]]],
      ['pallet', -0.7, RC, 'n', [SODA[3]]], ['pallet', 0.2, RC, 'n', [CARTON[2]]], ['pallet', 1.05, RC, 'n', [TIN[3]]]],
    promo: ['pallet', 1.9, RC, 'n', [TIN[0]]]
  },
  toys: {
    floor: 'shop/floor%=e6dff3', aisles: AISLES, decor: STRIP,
    feature: ['end', 2.65, RA, 'b', [BOX[1], 'toy/vehicle-monster-truck*0.2']],
    fix: [['arcade/prizes', -2.2, -2.3, 's'], ['end', -1.4, -2.3, 's', [BOX[4], 'toy/vehicle-speedster*0.2']],
      ['shelf', -1.1, RA, 's', [[[BOX[2], 'toy/vehicle-suv*0.2'], ['holiday/train-locomotive*0.3', 'toy/vehicle-racer*0.2']], [['toy/vehicle-monster-truck*0.2', BOX[3]], ['toy/vehicle-truck*0.2', 'skate/skateboard*0.4']]], null, 2],
      ['end', -0.6, -2.3, 's', ['holiday/present-a-cube', 'holiday/present-b-round']], ['arcade/prizes', 0.2, -2.3, 's'],
      ['shelf', 0.5, RA, 's', [[['toy/vehicle-speedster*0.2', BOX[4]], ['skate/skateboard*0.4', 'toy/vehicle-vintage-racer*0.2']], [[BOX[5], 'toy/vehicle-suv*0.2'], ['toy/vehicle-racer*0.2', 'holiday/train-locomotive*0.3']]], null, 2],
      ['arcade/claw-machine', 1.9, RA, 's', null, [['toy/vehicle-racer*0.15', -0.1, 0, 0.5, 0.25], ['toy/vehicle-racer*0.15', 0.1, 0.05, -0.4, 0.25]]],
      ['shelf', -1.1, RB, 's', [[['holiday/present-b-cube', 'toy/vehicle-truck*0.2'], [BOX[0], 'holiday/sled*0.3']], [['toy/vehicle-monster-truck*0.2', 'skate/skateboard*0.4'], ['holiday/train-wagon*0.3', BOX[1]]]], null, 2],
      ['shop/gacha-machine', 1.9, RB, 's'], ['shelf', 0.5, RB, 's', [[[BOX[2], 'toy/vehicle-speedster*0.2'], ['holiday/train-tender*0.3', 'toy/vehicle-suv*0.2']], [['toy/vehicle-vintage-racer*0.2', BOX[3]], ['skate/skateboard*0.4', 'toy/vehicle-racer*0.2']]], null, 2],
      ['end', 1.0, -2.3, 's', ['skate/skateboard*0.4', BOX[2]]], ['furn/table', -1.6, RC, 'n', null, [['holiday/train-locomotive*0.45', -0.15, 0, 0.3, 0.3], ['holiday/train-wagon*0.45', 0.15, 0.03, 0.3, 0.3]]],
      ['holiday/sled*0.45', -0.7, RC, 'n'], ['crate', 1.0, RC, 'n', [BOX[0]]], ['furn/bookcaseOpenLow', 0.2, RC, 'n', null, [['toy/vehicle-suv*0.2', 0, 0.02, 0, 0.36]]],
      ['end', 1.8, -2.3, 's', ['toy/vehicle-truck*0.2', BOX[5]]]],
    promo: ['holiday/tree-decorated*0.4', 1.9, RC, 'n', null, [['holiday/present-a-cube*0.35', 0.32, 0.2, 0.4, 0], ['holiday/present-b-round*0.35', -0.3, 0.25, 0, 0]]]
  },
  tech: {
    floor: 'shop/floor%=d3d7e3', aisles: AISLES, decor: STRIP,
    feature: ['end', 2.65, RA, 'b', [BOX[2], 'furn/speakerSmall']],
    fix: [['furn/cabinetTelevisionDoors', -2.15, -2.36, 's', null, [['furn/televisionModern', 0, -0.03, 0, 0.28]]],
      ['furn/cabinetTelevisionDoors', -1.35, -2.36, 's', null, [['furn/televisionModern*1.15', 0, -0.03, 0, 0.28]]],
      ['furn/desk', -1.4, RA, 's', null, [['furn/laptop*1.3', -0.12, 0, 0.2, 0.343], ['furn/laptop*1.3', 0.14, 0.02, -0.15, 0.343]], 2],
      ['furn/cabinetTelevisionDoors', -0.55, -2.36, 's', null, [['furn/televisionModern*1.3', 0, -0.03, 0, 0.28]]],
      ['furn/desk', 0.0, RA, 's', null, [['furn/computerScreen*1.3', 0, -0.05, 0, 0.343], ['furn/computerKeyboard*1.3', 0, 0.07, 0, 0.343]], 2],
      ['furn/cabinetTelevisionDoors', 0.25, -2.36, 's', null, [['furn/televisionModern*1.15', 0, -0.03, 0, 0.28]]],
      ['furn/desk', 1.9, RA, 's', null, [['furn/laptop*1.3', 0, 0, 0, 0.343]], 1],
      ['furn/desk', -1.4, RB, 's', null, [['furn/radio*1.2', -0.1, 0, 0.1, 0.343], ['furn/speakerSmall', 0.18, 0, 0, 0.343]], 2],
      ['furn/cabinetTelevisionDoors', 1.05, -2.36, 's', null, [['furn/televisionModern', 0, -0.03, 0, 0.28]]],
      ['shelf', 0.3, RB, 's', [[[BOX[1], BOX[2]], [BOX[4], BOX[0]]], [[BOX[3], BOX[1]], [BOX[2], BOX[5]]]], null, 2],
      ['furn/speaker', 1.9, RB, 's', null, null, 2], ['furn/bookcaseOpenLow', -1.6, RC, 'n', null, [['furn/radio', 0, 0, 0, 0.36]]],
      ['furn/speaker', 1.9, -2.32, 's', null, null, 2], ['furn/bookcaseOpenLow', -0.7, RC, 'n', null, [['furn/speakerSmall', -0.08, 0, 0, 0.36], ['furn/speakerSmall', 0.1, 0, 0, 0.36]]],
      ['furn/bookcaseOpenLow', 0.2, RC, 'n', null, [['furn/laptop', 0, 0, 0, 0.36]]], ['furn/cabinetTelevisionDoors', 2.45, -2.36, 's', null, [['furn/televisionModern', 0, -0.03, 0, 0.28]]]],
    promo: ['pallet', 1.9, RC, 'n', [BOX[1]]]
  },
  kitchen: {
    floor: 'shop/floor%=dcebd5', aisles: AISLES, decor: STRIP,
    feature: ['end', 2.65, RA, 'b', [COOK[2], COOK[0]]],
    fix: [['furn/kitchenCabinet', -2.2, -2.3, 's', null, [['furn/kitchenCoffeeMachine*1.6', 0, -0.05, 0, 0.405]], 2], ['furn/kitchenSink', -1.4, -2.3, 's'],
      ['shelf', -1.1, RA, 's', [[[COOK[0], COOK[3]], [COOK[1], COOK[4]]], [[COOK[2], COOK[5]], [COOK[10], COOK[6]]]], null, 2],
      ['furn/kitchenStove', -1.0, -2.3, 's'], ['shelf', 0.5, RA, 's', [[[COOK[7], COOK[0]], [COOK[8], COOK[2]]], [[COOK[3], COOK[1]], [COOK[9], COOK[5]]]], null, 2],
      ['furn/kitchenCabinet', -0.6, -2.3, 's', null, [['furn/kitchenMicrowave*1.3', 0, -0.03, 0, 0.405]]],
      ['furn/table', 1.9, RA, 's', null, [['furn/toaster*1.8', -0.2, 0, 0, 0.297], ['furn/kitchenBlender*1.8', 0.05, 0, 0, 0.297], ['furn/kitchenCoffeeMachine*1.6', 0.25, 0, 0, 0.297]]],
      ['shelf', -1.1, RB, 's', [[[COOK[4], COOK[11]], [COOK[6], COOK[0]]], [[COOK[5], COOK[3]], [COOK[7], COOK[1]]]], null, 2],
      ['furn/kitchenFridge', -0.05, -2.3, 's'], ['shelf', 0.5, RB, 's', [[[COOK[1], COOK[9]], [COOK[2], COOK[10]]], [[COOK[0], COOK[8]], [COOK[4], COOK[11]]]], null, 2],
      ['furn/table', 1.9, RB, 's', null, [['furn/kitchenMicrowave*1.3', -0.12, 0, 0, 0.297], ['furn/toaster*1.8', 0.22, 0, 0, 0.297]]],
      ['furn/table', -1.6, RC, 'n', null, [['food/cutting-board*0.6', -0.15, 0, 0, 0.297], ['food/knife-block*0.7', 0.15, 0, 0, 0.297]]],
      ['furn/kitchenFridgeLarge', 0.7, -2.28, 's'], ['furn/table', -0.7, RC, 'n', null, [['food/pot*0.7', -0.15, 0, 0, 0.297], ['food/pan*0.7', 0.17, 0, 0.5, 0.297]]],
      ['furn/table', 0.2, RC, 'n', null, [['food/plate*0.55', -0.15, 0, 0, 0.297], ['food/bowl*0.6', 0.15, 0, 0, 0.297]]],
      ['furn/kitchenCabinet', 1.6, -2.3, 's', null, [['furn/toaster*1.8', 0, 0, 0, 0.405]], 2]],
    promo: ['pallet', 1.9, RC, 'n', [COOK[0]]]
  },
  clothes: {
    floor: 'shop/floor-wood', aisles: AISLES, decor: STRIP,
    feature: ['shop/mannequin', 2.65, RA, 'b'],
    fix: [[RACK[0], -2.2, -2.25, 's'], ['shop/mannequin', -1.45, -2.25, 's'], ['table', -1.15, RA, 's', [[TEE[0], TEE[1]], [TEE[2], TEE[3]]], null, 2], [RACK[1], -0.7, -2.25, 's'],
      [RACK[2], 0.55, RA, 's', null, null, 2], [RACK[3], 0.1, -2.25, 's'], ['shop/mannequin', 1.8, RA, 's'],
      ['table', -1.15, RB, 's', [[TEE[4], TEE[5]], [TEE[6], TEE[1]]], null, 2], ['shop/mannequin', 0.85, -2.25, 's'], [RACK[0], 0.55, RB, 's', null, null, 2],
      [RACK[1], 1.9, RB, 'b'], ['table', -1.6, RC, 'n', [TEE[4], TEE[5]]], [RACK[2], 1.6, -2.25, 's'], ['table', -0.7, RC, 'n', [TEE[6], TEE[0]]],
      ['table', 0.2, RC, 'n', [TEE[1], TEE[3]]], [RACK[3], 2.4, -2.25, 's']],
    promo: ['table', 1.9, RC, 'n', [TEE[2], TEE[5]]]
  },
  home: {
    floor: 'shop/floor-wood', aisles: [-0.3, 1.2], decor: STRIP,
    feature: ['furn/bookcaseOpenLow', 2.65, RA, 'b', null, [['furn/books', 0, 0, 0, 0.36]]],
    fix: [['furn/rugRectangle%=b9c9e6', -1.5, -1.95, 's', null, null, 1, 'staff'], ['furn/loungeSofa%carpet=5b7fc4', -1.5, -2.3, 's', null, null, 1, 'staff'],
      ['furn/tableCoffee', -1.5, -1.7, 's', null, null, 1, 'staff'], ['furn/loungeChair%carpet=e0a44a', -2.45, -1.9, 'b', null, null, 1, 'staff'],
      ['furn/lampRoundFloor', -0.55, -2.3, 's', null, null, 1, 'staff'], ['furn/bedDouble', 1.2, -2.0, 's', null, null, 1, 'staff'],
      ['furn/cabinetBedDrawer', 0.55, -2.38, 's', null, [['furn/lampRoundTable', 0, 0, 0, 0.234]], 1, 'staff'],
      ['furn/table', -1.4, RA, 's', null, [['furn/chair', -0.2, 0.33, Math.PI, 0], ['furn/chair', 0.2, 0.33, Math.PI, 0], ['furn/chair', -0.2, -0.33, 0, 0], ['furn/chair', 0.2, -0.33, 0, 0]]],
      ['furn/lampSquareFloor', -0.55, RA, 's'],
      ['furn/sideTableDrawers', 0.5, RA, 's', null, [['furn/lampSquareTable', -0.1, 0, 0, 0.342], ['furn/plantSmall2', 0.12, 0, 0, 0.342]], 2],
      ['furn/washerDryerStacked', 1.9, RA, 's', null, null, 2], ['furn/bookcaseOpenLow', -1.4, RB, 's', null, [['furn/books', 0, 0, 0, 0.36], ['furn/plantSmall1', 0.12, 0, 0, 0.36]], 3],
      ['furn/cabinetBedDrawer', 1.85, -2.38, 's', null, [['furn/lampRoundTable', 0, 0, 0, 0.234]], 1, 'staff'],
      ['furn/sideTableDrawers', 0.5, RB, 's', null, [['furn/pillowBlue', 0, 0, 0.1, 0.342], ['furn/pillow', 0.15, 0.02, -0.2, 0.342]], 2],
      ['furn/rugRound%=e6b8a8', -0.7, RC, 'n', null, null, 1, 'staff'], ['furn/lampSquareFloor', 1.9, RB, 's', null, null, 2]],
    promo: ['furn/pottedPlant', 1.9, RC, 'n', null, null, 2]
  },
  office: {
    floor: 'shop/floor%=e3dccf', aisles: AISLES, decor: STRIP,
    feature: ['end', 2.65, RA, 'b', ['furn/books', BOX[2]]],
    fix: [['end', -2.2, -2.3, 's', ['furn/books', BOX[1]]], ['end', -1.4, -2.3, 's', [CARTON[1], 'furn/books']],
      ['shelf', -1.1, RA, 's', [[['furn/books', BOX[0]], ['furn/books', CARTON[1]]], [[BOX[2], 'furn/books'], [CARTON[0], 'furn/books']]], null, 2],
      ['end', -0.6, -2.3, 's', ['furn/books', BOX[3]]], ['shelf', 0.5, RA, 's', [[['furn/books', CARTON[2]], [BOX[4], 'furn/books']], [['furn/books', BOX[5]], [CARTON[3], 'furn/books']]], null, 2],
      ['end', 0.2, -2.3, 's', ['furn/computerMouse*1.6', 'furn/books']], ['furn/chairDesk', 1.9, RA, 's', null, null, 2],
      ['shelf', -1.1, RB, 's', [[[BOX[1], 'furn/books'], [CARTON[4], 'furn/books']], [['furn/books', BOX[3]], ['furn/books', CARTON[2]]]], null, 2],
      ['end', 1.0, -2.3, 's', [BOX[4], CARTON[0]]], ['shelf', 0.5, RB, 's', [[['furn/books', BOX[2]], ['furn/books', CARTON[3]]], [[BOX[0], 'furn/books'], [CARTON[1], 'furn/books']]], null, 2],
      ['furn/desk', 1.9, RB, 's', null, [['furn/lampSquareTable', -0.17, 0, 0, 0.343], ['furn/laptop*1.3', 0.13, 0.02, -0.2, 0.343]], 1],
      ['pallet', -1.6, RC, 'n', [BOX[1]]], ['end', 1.8, -2.3, 's', ['furn/books', BOX[5]]],
      ['furn/table', -0.7, RC, 'n', null, [['furn/books', -0.2, -0.08, 0.2, 0.297], ['furn/books', 0.02, -0.06, -0.3, 0.297], ['furn/books', 0.22, -0.08, 0.1, 0.297],
        ['furn/books', -0.1, 0.1, -0.2, 0.297], ['furn/books', 0.13, 0.1, 0.3, 0.297]]],
      ['furn/table', 0.2, RC, 'n', null, [['furn/books', -0.2, -0.08, -0.1, 0.297], ['furn/books', 0.0, -0.07, 0.25, 0.297], ['furn/books', -0.12, 0.1, 0.3, 0.297],
        ['furn/lampRoundTable', 0.2, 0.04, 0, 0.297]]],
      ['crate', 1.05, RC, 'n', ['furn/books']]],
    promo: ['pallet', 1.9, RC, 'n', [CARTON[3]]]
  },
  pets: {
    floor: 'shop/floor%=dfe9d6', aisles: AISLES, decor: STRIP,
    feature: ['end', 2.65, RA, 'b', [BAG[1], CAN[1]]],
    fix: [['tank', -2.1, BL, 's', [['pets/animal-fish', 'pets/animal-fish'], ['pets/animal-fish', 'pets/animal-fish']]],
      ['tank', -1.1, BL, 's', [['pets/animal-fish', 'pets/animal-fish'], ['pets/animal-fish', 'pets/animal-fish']]],
      ['shelf', -1.1, RA, 's', [[[BAG[0], CAN[0]], [BAG[1], CAN[2]]], [[BAG[2], CAN[1]], [BAG[3], CAN[4]]]], null, 2],
      ['tank', -0.1, BL, 's', [['pets/animal-fish', 'pets/animal-fish'], ['pets/animal-fish', 'pets/animal-fish']]],
      ['shelf', 0.5, RA, 's', [[[CAN[3], BAG[4]], [CAN[0], BAG[5]]], [[CAN[2], BAG[0]], [CAN[4], BAG[2]]]], null, 2],
      ['end', 0.8, -2.3, 's', [BAG[3], BAG[5]]], ['pallet', 1.9, RA, 's', [BAG[4]]],
      ['table', -1.2, RB, 's', [[BOX[1], BOX[4]], [BOX[2], BOX[5]]], null, 2],
      ['end', 1.6, -2.3, 's', [CAN[1], CAN[3]]], ['shelf', 0.5, RB, 's', [[[BAG[1], CAN[4]], [BAG[2], CAN[0]]], [[BAG[5], CAN[3]], [BAG[0], CAN[1]]]], null, 2],
      ['pallet', 1.9, RB, 's', [BAG[2]]], ['crate', -1.6, RC, 'n', ['golf/ball-red*2']], ['end', 2.4, -2.3, 's', [BAG[0], CAN[2]]],
      ['crate', -0.7, RC, 'n', ['golf/ball-blue*2']], ['table', 0.2, RC, 'n', [BAG[3], BAG[5]]], ['crate', 1.05, RC, 'n', ['golf/ball-green*2']]],
    promo: ['furn/rugRound%=e6b8a8', 1.9, RC, 'n', null, [['pets/animal-dog', -0.13, 0, 0.6, 0.006], ['pets/animal-cat', 0.15, 0.05, -0.5, 0.006]]]
  },
  sports: {
    floor: 'shop/floor%=d9e4ee', aisles: AISLES, decor: STRIP,
    feature: ['end', 2.65, RA, 'b', ['skate/skateboard*0.4', 'surv/bedroll-packed']],
    fix: [['surv/tent-canvas', -2.15, -2.22, 's'], ['end', -1.4, -2.3, 's', ['surv/bedroll-packed', 'surv/bucket']],
      ['shelf', -1.1, RA, 's', [[['surv/bottle', BOX[2]], ['surv/bedroll-packed', BOX[4]]], [[BOX[0], 'surv/bottle'], [BOX[3], 'surv/bedroll-packed']]], null, 2],
      ['surv/tent-canvas', -0.6, -2.22, 's'], ['shelf', 0.5, RA, 's', [[['skate/skateboard*0.4', BOX[1]], ['surv/bottle', BOX[5]]], [[BOX[2], 'skate/skateboard*0.4'], [BOX[4], 'surv/bucket']]], null, 2],
      ['end', 0.2, -2.3, 's', ['surv/bucket', 'skate/skateboard*0.4']], ['pallet', 1.9, RA, 's', ['surv/bedroll-packed']],
      ['shelf', -1.1, RB, 's', [[['surv/bedroll-packed', BOX[1]], [BOX[3], 'surv/bottle']], [[BOX[5], 'surv/bedroll-packed'], ['surv/bucket', BOX[0]]]], null, 2],
      ['surv/tent-canvas', 1.0, -2.22, 's'], ['shelf', 0.5, RB, 's', [[['surv/bottle', BOX[4]], ['skate/skateboard*0.4', BOX[2]]], [[BOX[1], 'surv/bucket'], [BOX[3], 'skate/skateboard*0.4']]], null, 2],
      ['pallet', 1.9, RB, 's', ['surv/bucket']], ['crate', -1.6, RC, 'n', ['golf/ball-red*2']], ['end', 1.8, -2.3, 's', ['surv/bedroll-packed', 'surv/bottle']],
      ['crate', -0.7, RC, 'n', ['golf/ball-green*2']], ['crate', 0.2, RC, 'n', ['surv/bottle']], ['crate', 1.05, RC, 'n', ['golf/ball-blue*2']]],
    promo: ['surv/tent-canvas', 1.9, RC, 'n']
  },
  tools: {
    floor: 'shop/floor%=e2e2dc', aisles: AISLES, decor: STRIP,
    feature: ['end', 2.65, RA, 'b', ['surv/tool-hammer*1.4', TIN[2]]],
    fix: [['end', -2.2, -2.3, 's', ['surv/tool-hammer*1.4', 'surv/tool-axe']], ['end', -1.4, -2.3, 's', ['surv/tool-shovel', 'surv/tool-pickaxe']],
      ['shelf', -1.1, RA, 's', [[[TIN[0], BOX[1]], [TIN[1], 'surv/bucket']], [[TIN[2], BOX[3]], ['surv/bucket', TIN[3]]]], null, 2],
      ['end', -0.6, -2.3, 's', ['surv/tool-hoe', 'surv/tool-hammer*1.4']], ['shelf', 0.5, RA, 's', [[[BOX[0], TIN[3]], [BOX[2], TIN[0]]], [[BOX[4], TIN[1]], [BOX[5], TIN[2]]]], null, 2],
      ['end', 0.2, -2.3, 's', ['surv/tool-axe', 'surv/tool-shovel']], ['pallet', 1.9, RA, 's', ['surv/resource-planks']],
      ['shelf', -1.1, RB, 's', [[['surv/bucket', TIN[2]], [BOX[1], TIN[0]]], [[TIN[3], BOX[2]], [TIN[1], 'surv/bucket']]], null, 2],
      ['end', 1.0, -2.3, 's', ['surv/tool-pickaxe', 'surv/tool-hoe']], ['shelf', 0.5, RB, 's', [[[TIN[1], BOX[4]], [TIN[3], BOX[0]]], [[TIN[0], BOX[5]], [TIN[2], BOX[3]]]], null, 2],
      ['pallet', 1.9, RB, 's', ['surv/barrel']], ['pallet', -1.6, RC, 'n', ['surv/resource-planks']], ['end', 1.8, -2.3, 's', ['surv/tool-hammer*1.4', 'surv/tool-shovel']],
      ['pallet', -0.7, RC, 'n', [TIN[1]]], ['pallet', 0.2, RC, 'n', ['surv/bucket']], ['pallet', 1.05, RC, 'n', ['surv/workbench']]],
    promo: ['pallet', 1.9, RC, 'n', [TIN[3]]]
  },
  auto: {
    floor: 'shop/floor%=d5d5d8', aisles: AISLES, decor: STRIP,
    feature: ['end', 2.65, RA, 'b', [BOTTLE[1], TIN[2]]],
    fix: [['end', -2.2, -2.3, 's', ['car/wheel-default', 'car/wheel-dark']], ['end', -1.4, -2.3, 's', ['car/wheel-racing', 'car/wheel-default']],
      ['shelf', -1.1, RA, 's', [[[BOTTLE[0], TIN[1]], [BOX[1], BOTTLE[2]]], [[TIN[0], BOX[2]], [BOTTLE[3], TIN[3]]]], null, 2],
      ['end', -0.6, -2.3, 's', ['car/wheel-dark', 'car/wheel-racing']], ['shelf', 0.5, RA, 's', [[[BOX[0], BOTTLE[1]], [TIN[2], BOX[4]]], [[BOTTLE[4], TIN[0]], [BOX[5], BOTTLE[0]]]], null, 2],
      ['end', 0.2, -2.3, 's', [BOTTLE[2], TIN[1]]], ['pallet', 1.9, RA, 's', ['car/wheel-dark']],
      ['shelf', -1.1, RB, 's', [[[TIN[3], BOX[3]], [BOTTLE[1], TIN[1]]], [[BOX[1], BOTTLE[3]], [TIN[2], BOX[0]]]], null, 2],
      ['end', 1.0, -2.3, 's', ['car/wheel-default', 'car/wheel-racing']], ['shelf', 0.5, RB, 's', [[[BOTTLE[4], BOX[2]], [TIN[0], BOTTLE[2]]], [[BOX[4], TIN[3]], [BOTTLE[0], BOX[5]]]], null, 2],
      ['pallet', 1.9, RB, 's', ['car/wheel-default']], ['pallet', -1.6, RC, 'n', ['car/cone']], ['end', 1.8, -2.3, 's', [TIN[2], BOTTLE[3]]],
      ['pallet', -0.7, RC, 'n', ['car/wheel-racing']], ['pallet', 0.2, RC, 'n', [BOX[3]]], ['pallet', 1.05, RC, 'n', [TIN[0]]]],
    promo: ['car/kart-oobi', 1.9, RC, 'n']
  },
  seasonal: {
    floor: 'shop/floor%=f1e2e2', aisles: AISLES, decor: STRIP,
    feature: ['end', 2.65, RA, 'b', ['holiday/present-a-cube*0.35', 'holiday/candy-cane-red*0.4']],
    fix: [['holiday/tree-decorated*0.4', -2.2, -2.22, 's'], ['end', -1.4, -2.3, 's', ['holiday/wreath-decorated*0.4', 'holiday/sock-red*0.4']],
      ['shelf', -1.1, RA, 's', [[['holiday/present-a-cube*0.35', 'holiday/candy-cane-red*0.4'], ['holiday/present-b-round*0.35', 'holiday/gingerbread-man*0.4']],
        [['holiday/present-a-round*0.35', 'holiday/candy-cane-green*0.4'], ['holiday/present-b-cube*0.35', 'holiday/gingerbread-woman*0.4']]], null, 2],
      ['holiday/tree-decorated*0.4', -0.6, -2.22, 's'],
      ['shelf', 0.5, RA, 's', [[['holiday/sock-green*0.4', 'holiday/present-a-rectangle*0.3'], ['holiday/nutcracker*0.3', 'holiday/present-b-round*0.35']],
        [['holiday/sock-red*0.4', 'holiday/present-a-cube*0.35'], ['holiday/lantern*0.2', 'holiday/present-a-round*0.35']]], null, 2],
      ['end', 0.2, -2.3, 's', ['holiday/nutcracker*0.3', 'holiday/wreath-decorated*0.4']], ['furn/table', 1.9, RA, 's', null, [['holiday/snowman*0.4', 0, 0, 0.3, 0.297]]],
      ['shelf', -1.1, RB, 's', [[['holiday/candy-cane-green*0.4', 'holiday/present-b-cube*0.35'], ['holiday/gingerbread-woman*0.4', 'holiday/present-a-cube*0.35']],
        [['holiday/candy-cane-red*0.4', 'holiday/present-a-rectangle*0.3'], ['holiday/gingerbread-man*0.4', 'holiday/present-b-round*0.35']]], null, 2],
      ['holiday/tree-decorated*0.4', 1.0, -2.22, 's'],
      ['shelf', 0.5, RB, 's', [[['holiday/lantern*0.2', 'holiday/sock-green*0.4'], ['holiday/present-a-round*0.35', 'holiday/nutcracker*0.3']],
        [['holiday/present-b-cube*0.35', 'holiday/sock-red*0.4'], ['holiday/present-a-rectangle*0.3', 'holiday/lantern*0.2']]], null, 2],
      ['furn/table', 1.9, RB, 's', null, [['holiday/reindeer*0.4', 0, 0, -0.4, 0.297]]], ['holiday/sled*0.45', -1.6, RC, 'n'],
      ['end', 1.8, -2.3, 's', ['holiday/sock-green*0.4', 'holiday/wreath-decorated*0.4']],
      ['crate', -0.7, RC, 'n', ['holiday/present-b-round*0.35']], ['crate', 0.2, RC, 'n', ['holiday/present-a-cube*0.35']],
      ['furn/table', 1.05, RC, 'n', null, [['holiday/nutcracker*0.4', -0.15, 0, 0, 0.297], ['holiday/lantern*0.25', 0.15, 0, 0, 0.297]]]],
    promo: ['holiday/tree-decorated*0.6', 1.9, RC, 'n', null, [['holiday/present-a-cube*0.35', 0.4, 0.25, 0.4, 0], ['holiday/present-b-round*0.35', -0.38, 0.3, 0, 0]]]
  }
};

// what stands on overstock pallets
var OVERSTOCK = { boxes: ['furn/cardboardBoxClosed*1.2'] };

var IT = 64;
var IB = 118;
var cv;
var renderer;
var scene;
var cam;
var sun;
var onTap = function () {};
var cw = 1;
var ch = 1;
var ready = false;
var lib;
var root;
var bestId = null;
var VIEW_AZ = 0;
var focus = { x: 0, z: 0, dist: 30, az: VIEW_AZ };
var goal = null;
var azGoal = null;
var DMIN = 8;
var DMAX = 80;
var BOUNDS = [-12, 12, -30, 15];
var bump = {};
var tagsEl;
var arrowEl;
var loadingEl;
var ptr = {};
var drag = null;
var pinch = null;
var ray = new THREE.Raycaster();
var ndc = new THREE.Vector2();
var plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
var hitA = new THREE.Vector3();
var hitB = new THREE.Vector3();
var proj = new THREE.Vector3();
var picks = [];
var puffs = [];
var shops = {};
var order = [];
var rows = [];
var outer = [];
var places = {};
var people = [];
var cars = [];
var bays = [];
var shadowDirty = true;

// WKWebView has no Safari token in its user agent, so GLTFLoader would pick the ImageBitmap path, which iOS 16 flips wrongly
var textureFix = function (parser) {
  return {
    name: 'TextureFix',
    beforeRoot: function () {
      var ua = navigator.userAgent;
      if (/AppleWebKit/.test(ua) && !/Chrome|Chromium|Edg/.test(ua)) parser.textureLoader = new THREE.TextureLoader(parser.options.manager);
    }
  };
};

// A ref names a model file, and optionally one product out of it, colours and a size:
//   shop/shelf-boxes          the shelf without the goods it comes with (see BARE)
//   shop/shelf-boxes.box      one of those goods on its own, standing on the origin
//   food/can@14,2>4,1         atlas cells moved to other cells, which recolours a label, a garment or a wrapper
//   furn/loungeSofa%carpet=5b7fc4   a named material in another colour
//   food/carrot~z             laid on its side, turned a quarter about z (or x)
//   holiday/present-a-cube*0.4      drawn that much bigger or smaller than the rest of its kit
var REF = /^([^.@%~*]+)(?:\.([\w-]+))?(?:@([\d,>;]+))?(?:%([\w=;]*))?(?:~([xz]))?(?:\*([\d.]+))?$/;
function parseRef(ref) {
  var m = REF.exec(ref);
  return {
    file: m[1],
    part: m[2] || null,
    cells: m[3] ? m[3].split(';').map(function (c) { return c.split('>').map(function (p) { return p.split(',').map(Number); }); }) : null,
    mats: m[4] ? m[4].split(';').map(function (c) { return c.split('='); }) : null,
    lay: m[5] || null,
    k: m[6] ? +m[6] : 1
  };
}

// fixtures whose goods are separate nodes; the bare fixture is stocked with other things in place
var BARE = { 'shop/shelf-boxes': 1, 'shop/shelf-bags': 1, 'shop/shelf-end': 1, 'shop/display-cans': 1, 'shop/display-bread': 1,
  'shop/clothing-table': 1, 'shop/hand-truck': 1 };

// The kit's coolers are solid boxes with their glass painted on (atlas cell 3,2). For goods to show, the glass gets
// its own see-through material, the body face behind it goes, and a lit inner box closes the opening
var glassMat = new THREE.MeshLambertMaterial({ color: 0xd8eef8, transparent: true, opacity: 0.25, depthWrite: false });
var innerMat = new THREE.MeshLambertMaterial({ color: 0xe6eef6, side: THREE.BackSide });
var waterMat = new THREE.MeshLambertMaterial({ color: 0x7fc8e8, transparent: true, opacity: 0.35, depthWrite: false });
var tankMat = new THREE.MeshLambertMaterial({ color: 0x4fa6c8, side: THREE.BackSide });
var shelfMat = new THREE.MeshLambertMaterial({ color: 0xc9d3de });
var COOLER = {
  'shop/freezers-standing': { face: 2, at: -0.055, inner: [-0.5, 0.5, 0.1, 0.9, -0.5, -0.06], shelf: 0.49 },
  'shop/freezer': { face: 1, at: 0.31, inner: [-0.4, 0.4, 0.06, 0.3, -0.3, 0.3] }
};

function cell(uv, a, b, c) {
  return [Math.floor((uv.getX(a) + uv.getX(b) + uv.getX(c)) / 3 * 16), Math.floor((uv.getY(a) + uv.getY(b) + uv.getY(c)) / 3 * 4)];
}

// splits a cooler's geometry into body and glass, leaving out the body face behind the glass
function openCooler(geom, cfg) {
  var g = geom.index ? geom.toNonIndexed() : geom;
  var pos = g.attributes.position;
  var uv = g.attributes.uv;
  var keep = [];
  var glass = [];
  var e1 = new THREE.Vector3();
  var e2 = new THREE.Vector3();
  var v = [new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3()];
  for (var t = 0; t < pos.count; t += 3) {
    var c = cell(uv, t, t + 1, t + 2);
    for (var i = 0; i < 3; i++) v[i].fromBufferAttribute(pos, t + i);
    e1.subVectors(v[1], v[0]);
    e2.subVectors(v[2], v[0]);
    var n = e1.cross(e2).toArray();
    var mid = (v[0].getComponent(cfg.face) + v[1].getComponent(cfg.face) + v[2].getComponent(cfg.face)) / 3;
    var big = Math.abs(n[cfg.face]) > Math.abs(n[(cfg.face + 1) % 3]) && Math.abs(n[cfg.face]) > Math.abs(n[(cfg.face + 2) % 3]) && n[cfg.face] > 0;
    if (c[0] === 3 && c[1] === 2) glass.push(t);
    else if (!(c[0] === 13 && c[1] === 3 && big && mid < cfg.at)) keep.push(t);
  }
  function pick(list) {
    var out = new THREE.BufferGeometry();
    Object.keys(g.attributes).forEach(function (k) {
      var a = g.attributes[k];
      var arr = new Float32Array(list.length * 3 * a.itemSize);
      list.forEach(function (t, j) {
        for (var q = 0; q < 3 * a.itemSize; q++) arr[j * 3 * a.itemSize + q] = a.array[t * a.itemSize + q];
      });
      out.setAttribute(k, new THREE.BufferAttribute(arr, a.itemSize));
    });
    return out;
  }
  var b = cfg.inner;
  var box = new THREE.BoxGeometry(b[1] - b[0], b[3] - b[2], b[5] - b[4]);
  box.translate((b[0] + b[1]) / 2, (b[2] + b[3]) / 2, (b[4] + b[5]) / 2);
  box.deleteAttribute('uv');
  var shelf = null;
  if (cfg.shelf) {
    shelf = new THREE.BoxGeometry(b[1] - b[0] - 0.02, 0.012, b[5] - b[4] - 0.02);
    shelf.translate((b[0] + b[1]) / 2, cfg.shelf, (b[4] + b[5]) / 2);
    shelf.deleteAttribute('uv');
  }
  return { body: pick(keep), glass: pick(glass), inner: box, shelf: shelf };
}

// moves every triangle whose middle lies in one atlas cell to another cell; the kits' atlases are 16 columns by 4 rows
function recolour(geom, cells) {
  var uv = geom.attributes.uv;
  if (!uv) return;
  var idx = geom.index ? geom.index.array : null;
  var n = idx ? idx.length : uv.count;
  var done = new Uint8Array(uv.count);
  // cells are judged on the UVs as they were: triangles of a quad share corners, and moved corners would mislead
  var src = uv.array.slice();
  var w = uv.itemSize;
  for (var t = 0; t < n; t += 3) {
    var a = idx ? idx[t] : t;
    var b = idx ? idx[t + 1] : t + 1;
    var c = idx ? idx[t + 2] : t + 2;
    var cu = Math.floor((src[a * w] + src[b * w] + src[c * w]) / 3 * 16);
    var cv = Math.floor((src[a * w + 1] + src[b * w + 1] + src[c * w + 1]) / 3 * 4);
    for (var i = 0; i < cells.length; i++) {
      var f = cells[i][0];
      var to = cells[i][1];
      if (f[0] !== cu || f[1] !== cv) continue;
      [a, b, c].forEach(function (v) {
        if (done[v]) return;
        done[v] = 1;
        uv.setXY(v, src[v * w] + (to[0] - f[0]) / 16, src[v * w + 1] + (to[1] - f[1]) / 4);
      });
      break;
    }
  }
  uv.needsUpdate = true;
}

// a model's meshes that share a material are drawn as one
function joinParts(parts) {
  var by = {};
  var out = [];
  parts.forEach(function (p) {
    var g = p.geom;
    var key = p.mat.uuid + (g.index ? 'i' : 'n') + Object.keys(g.attributes).sort().join();
    if (!by[key]) {
      by[key] = { mat: p.mat, list: [] };
      out.push(by[key]);
    }
    by[key].list.push(g);
  });
  return out.map(function (e) { return { geom: e.list.length > 1 ? mergeGeometries(e.list, false) : e.list[0], mat: e.mat }; });
}

function loadModels(list, progress, done) {
  var loader = new GLTFLoader();
  loader.register(textureFix);
  var mats = {};
  var models = {};
  var files = {};
  list.forEach(function (ref) {
    var f = parseRef(ref).file;
    (files[f] = files[f] || []).push(ref);
  });
  var names = Object.keys(files);
  var n = 0;
  function material(src, kit, tint) {
    var see = src.transparent || src.opacity < 1;
    var key = kit + '|' + (src.map ? 'map' : src.name + src.color.getHex()) + (tint || '') + (see ? 't' + src.opacity : '');
    if (mats[key]) return mats[key];
    if (src.map) {
      src.map.magFilter = THREE.NearestFilter;
      src.map.minFilter = THREE.NearestFilter;
      src.map.generateMipmaps = false;
      src.map.colorSpace = THREE.SRGBColorSpace;
    }
    var c = tint ? new THREE.Color(parseInt(tint, 16)) : src.map ? new THREE.Color(1, 1, 1) : src.color;
    var opt = src.map ? { map: src.map, color: c } : { color: c };
    if (see) {
      opt.transparent = true;
      opt.opacity = src.opacity;
      opt.depthWrite = false;
    }
    mats[key] = new THREE.MeshLambertMaterial(opt);
    return mats[key];
  }
  var missing = { parts: [], box: { x0: -0.3, x1: 0.3, z0: -0.3, z1: 0.3, y0: 0, h: 0.3 }, gltf: null };
  function one() {
    progress(++n / names.length);
    if (n === names.length) done();
  }
  function make(g, ref) {
    var r = parseRef(ref);
    var kit = r.file.split('/')[0];
    var k = (SCALE[kit] || 1) * r.k;
    var skinned = false;
    g.scene.traverse(function (o) { if (o.isSkinnedMesh) skinned = true; });
    g.scene.updateMatrixWorld(true);
    var meshes = [];
    var origin = null;
    g.scene.traverse(function (o) {
      if (!o.isMesh) return;
      if (r.part) {
        // a node of several materials loads as a group of meshes; repeated names get a suffix, so this is the first one
        var own = o.name === r.part ? o : o.parent && o.parent.name === r.part ? o.parent : null;
        if (!own || origin && origin !== own) return;
        origin = own;
      } else if (BARE[r.file] && o.parent && o.parent.isMesh) return;
      meshes.push(o);
    });
    var at = new THREE.Matrix4();
    if (origin) at.makeTranslation(-origin.matrixWorld.elements[12], -origin.matrixWorld.elements[13], -origin.matrixWorld.elements[14]);
    var parts = [];
    var box = new THREE.Box3();
    meshes.forEach(function (o) {
      var geom = o.geometry.clone();
      if (!o.isSkinnedMesh) geom.applyMatrix4(new THREE.Matrix4().multiplyMatrices(at, o.matrixWorld));
      ['color', 'tangent', 'uv1', 'uv2'].forEach(function (a) { if (geom.attributes[a]) geom.deleteAttribute(a); });
      var cool = COOLER[r.file] && !r.part ? COOLER[r.file] : null;
      if (r.cells && !cool) recolour(geom, r.cells);
      var tint = null;
      // an empty material name tints the whole model
      (r.mats || []).forEach(function (mt) { if (!mt[0] || mt[0] === o.material.name) tint = mt[1]; });
      geom.computeBoundingBox();
      box.union(geom.boundingBox);
      if (cool) {
        var oc = openCooler(geom, cool);
        if (r.cells) recolour(oc.body, r.cells);
        // glass recoloured blue holds water: a fish tank
        var wet = !!r.cells && r.cells.some(function (c) { return c[0][0] === 3 && c[0][1] === 2; });
        parts.push({ geom: oc.body, mat: material(o.material, kit, tint) }, { geom: oc.glass, mat: wet ? waterMat : glassMat }, { geom: oc.inner, mat: wet ? tankMat : innerMat });
        if (oc.shelf) parts.push({ geom: oc.shelf, mat: shelfMat });
      } else parts.push({ geom: geom, mat: material(o.material, kit, tint) });
    });
    if (r.lay) {
      var turn = new THREE.Matrix4()[r.lay === 'x' ? 'makeRotationX' : 'makeRotationZ'](Math.PI / 2);
      parts.forEach(function (p) { p.geom.applyMatrix4(turn); });
      box.makeEmpty();
      parts.forEach(function (p) {
        p.geom.computeBoundingBox();
        box.union(p.geom.boundingBox);
      });
    }
    // the furniture kit puts its models' corner at the origin
    var sm = new THREE.Matrix4().makeScale(k, k, k);
    if (kit === 'furn') sm.multiply(new THREE.Matrix4().makeTranslation(-(box.min.x + box.max.x) / 2, 0, -(box.min.z + box.max.z) / 2));
    if (!skinned) {
      parts.forEach(function (p) { p.geom.applyMatrix4(sm); });
      box.applyMatrix4(sm);
      parts = joinParts(parts);
    } else box.set(new THREE.Vector3(-0.2, 0, -0.2), new THREE.Vector3(0.2, 0.75, 0.2));
    models[ref] = { parts: parts, box: { x0: box.min.x, x1: box.max.x, z0: box.min.z, z1: box.max.z, y0: box.min.y, h: box.max.y }, gltf: skinned ? g : null };
  }
  names.forEach(function (f) {
    loader.load(BASE + f + '.glb', function (g) {
      files[f].forEach(function (ref) { make(g, ref); });
      one();
    }, undefined, function () {
      console.warn('missing model', f);
      one();
    });
  });
  return { model: function (ref) { return models[ref] || missing; } };
}

// every model the store can show, gathered from the tables
function modelList() {
  var seen = {};
  function walk(v) {
    if (typeof v === 'string') {
      if (v.indexOf('/') > 0) seen[v.replace(/^\w+:/, '')] = 1;
    } else if (Array.isArray(v)) v.forEach(walk);
  }
  Object.keys(KIND).forEach(function (k) { seen[KIND[k].ref] = 1; });
  Object.keys(DEPTS).forEach(function (id) {
    walk(DEPTS[id].fix);
    walk(DEPTS[id].promo);
    walk(DEPTS[id].decor);
    walk(DEPTS[id].feature);
    seen[DEPTS[id].floor] = 1;
  });
  walk(FRONT_ITEMS);
  walk(FLOWERS);
  walk(OVERSTOCK.boxes);
  walk(['food/plate-rectangle*0.55', 'skate/pallet', 'shop/character-employee@5,3>2,2', 'shop/freezers-standing@13,3>2,2',
    'shop/freezers-standing@13,3>2,1', PARCEL, STAFF]);
  Object.keys(KIND).forEach(function (k) { seen[KIND[k].ref] = 1; });
  ['shop/wall', 'shop/wall-window', 'shop/column', 'shop/floor', 'shop/cash-register', 'shop/cash-register-self', 'shop/character-employee', 'arcade/cash-register',
    'shop/hand-truck', 'shop/shopping-basket', 'shop/shopping-basket*0.62', 'furn/cardboardBoxClosed', 'furn/cardboardBoxOpen', 'furn/rugDoormat',
    'furn/bench', 'furn/trashcan', 'furn/pottedPlant', 'sub/planter', 'roads/road-straight', 'roads/road-crossing', 'roads/light-square',
    'roads/light-curved', 'roads/construction-fence', 'roads/construction-light', 'roads/construction-barrier', 'roads/construction-cone',
    'roads/dumpster', 'roads/road-sign-street', 'car/taxi', 'car/delivery', 'car/tractor-shovel', 'car/box', 'car/truck-flat',
    'nature/tree_oak', 'nature/tree_default', 'nature/tree_fat', 'nature/tree_detailed', 'nature/tree_pineRoundC', 'nature/plant_bush',
    'nature/plant_bushLarge', 'food/bag', 'food/bag-flat', 'nature/flower_redA', 'nature/flower_yellowA', 'nature/flower_purpleA',
    'forest/fence', 'nature/tree_small', 'furn/plantSmall2*1.6', 'sub/building-type-a', 'sub/building-type-c', 'sub/building-type-e', 'sub/building-type-h',
    'sub/building-type-k', 'sub/tree-large'].forEach(function (r) { seen[r] = 1; });
  FOLK.forEach(function (r) { seen[r] = 1; });
  CARS.forEach(function (r) { seen[r] = 1; });
  return Object.keys(seen);
}

// a day lasts eight minutes: five of daylight, a dusk, two of night and a dawn. Only the light changes, so the shadows
// stay put and need no redraw
var DAY = 480;
var hemi;
var skyDay = new THREE.Color(0xa9d8ee);
var skyNight = new THREE.Color(0x27335c);
var hemiDay = new THREE.Color(0xffffff);
var hemiNight = new THREE.Color(0x8fa0d8);
var lampOn = new THREE.Color(0xffe2a0);
var dayT = 60;

function daylight() {
  var t = dayT % DAY;
  if (t < 300) return 1;
  if (t < 340) return 1 - (t - 300) / 40;
  if (t < 440) return 0;
  return (t - 440) / 40;
}

function dayStep(dt) {
  dayT += dt;
  var l = daylight();
  var k = l * l * (3 - 2 * l);
  sun.intensity = 0.35 + 1.65 * k;
  hemi.intensity = 1.3 + 1.1 * k;
  hemi.color.copy(hemiNight).lerp(hemiDay, k);
  scene.background.copy(skyNight).lerp(skyDay, k);
  scene.fog.color.copy(scene.background);
  bulbMat.emissive.copy(lampOn).multiplyScalar(1 - k);
  if (doorMat) doorMat.emissive.setScalar(0.5 * (1 - k));
  poolMat.opacity = 0.5 * (1 - k);
  poolMat.visible = k < 0.98;
}

function sceneUp() {
  var dpr = window.devicePixelRatio || 1;
  renderer = new THREE.WebGLRenderer({ canvas: cv, antialias: dpr < 2, powerPreference: 'high-performance' });
  cv.addEventListener('webglcontextrestored', function () { shadowDirty = true; });
  renderer.setPixelRatio(Math.min(2, dpr));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.shadowMap.autoUpdate = false;
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0xa9d8ee);
  scene.fog = new THREE.Fog(0xa9d8ee, 90, 200);
  cam = new THREE.PerspectiveCamera(40, 1, 1, 400);
  hemi = new THREE.HemisphereLight(0xffffff, 0xb4bedc, 2.4);
  scene.add(hemi);
  sun = new THREE.DirectionalLight(0xfff3dc, 2.0);
  sun.position.set(-12, 30, 10);
  sun.target.position.set(0, 0, -6);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  var sc = sun.shadow.camera;
  sc.left = -22;
  sc.right = 22;
  sc.top = 26;
  sc.bottom = -26;
  sc.near = 2;
  sc.far = 80;
  sun.shadow.bias = -0.0006;
  sun.shadow.normalBias = 0.02;
  scene.add(sun);
  scene.add(sun.target);
  root = new THREE.Group();
  scene.add(root);
}

function resize() {
  var r = cv.getBoundingClientRect();
  cw = Math.max(1, Math.round(r.width));
  ch = Math.max(1, Math.round(r.height));
  if (renderer) renderer.setSize(cw, ch, false);
  if (cam) {
    cam.aspect = cw / ch;
    var dy = IT + (ch - IT - IB) / 2 - ch / 2;
    cam.setViewOffset(cw, ch, 0, -dy, cw, ch);
    cam.updateProjectionMatrix();
  }
}

function place() {
  var cx = Math.cos(TILT);
  cam.position.set(focus.x + focus.dist * Math.sin(focus.az) * cx, focus.dist * Math.sin(TILT), focus.z + focus.dist * Math.cos(focus.az) * cx);
  cam.near = Math.max(0.5, focus.dist * 0.3);
  cam.far = focus.dist * 4 + 80;
  cam.updateProjectionMatrix();
  cam.lookAt(focus.x, 0, focus.z);
  cam.updateMatrixWorld(true);
  cutaway();
}

// outer walls on the camera's side drop to their foot, so the floor behind them stays in view
function cutaway() {
  var sx = Math.sin(focus.az);
  var sz = Math.cos(focus.az);
  outer.forEach(function (w) {
    var d = w.n[0] * sx + w.n[1] * sz;
    var s = d > 0.3 ? 0.12 : 1;
    if (w.g.scale.y !== s) {
      w.g.scale.y = s;
      shadowDirty = true;
    }
  });
}

// everything in the store faces the doors, so the camera turns no more than an eighth either way
var TURN = Math.PI / 4;

function clamp() {
  focus.az = Math.max(-TURN, Math.min(TURN, focus.az));
  focus.dist = Math.max(DMIN, Math.min(DMAX, focus.dist));
  focus.x = Math.max(BOUNDS[0], Math.min(BOUNDS[1], focus.x));
  focus.z = Math.max(BOUNDS[2], Math.min(BOUNDS[3], focus.z));
}

function under(sx, sy, out) {
  ndc.set(sx / cw * 2 - 1, -(sy / ch * 2 - 1));
  ray.setFromCamera(ndc, cam);
  return ray.ray.intersectPlane(plane, out);
}

function stepCam(dt) {
  if (azGoal !== null) {
    focus.az += (azGoal - focus.az) * Math.min(1, dt * 8);
    if (Math.abs(azGoal - focus.az) < 0.002) {
      focus.az = azGoal;
      azGoal = null;
    }
    place();
  }
  if (!goal) return;
  goal.t += dt;
  var u = Math.min(1, goal.t / goal.d);
  var e = u * u * (3 - 2 * u);
  focus.x = goal.x0 + (goal.x - goal.x0) * e;
  focus.z = goal.z0 + (goal.z - goal.z0) * e;
  focus.dist = goal.k0 + (goal.k - goal.k0) * e;
  if (u >= 1) goal = null;
}

// how far back the camera sits to show `w` units across the screen
function fit(w) {
  var h = Math.atan(Math.tan(cam.fov * Math.PI / 360) * cw / ch);
  return Math.max(DMIN, Math.min(DMAX, w / 2 / Math.tan(h) + 2));
}

function flyTo(x, z, dist, secs) {
  var d = Math.hypot(x - focus.x, z - focus.z);
  goal = { x0: focus.x, z0: focus.z, k0: focus.dist, x: x, z: z, k: dist === undefined ? focus.dist : dist, t: 0, d: secs || Math.min(1.2, 0.4 + d / 30) };
  return goal.d;
}

function bind() {
  cv.addEventListener('pointerdown', function (e) {
    if (e.isPrimary) {
      ptr = {};
      pinch = null;
      drag = null;
    }
    cv.setPointerCapture(e.pointerId);
    azGoal = null;
    ptr[e.pointerId] = { x: e.clientX, y: e.clientY };
    var ids = Object.keys(ptr);
    goal = null;
    if (ids.length === 1) {
      var r = cv.getBoundingClientRect();
      var g = under(e.clientX - r.left, e.clientY - r.top, new THREE.Vector3());
      drag = { id: e.pointerId, x0: e.clientX, y0: e.clientY, g: g, t: performance.now(), moved: false, button: e.button, az: focus.az };
    } else if (ids.length === 2) {
      var a = ptr[ids[0]];
      var b = ptr[ids[1]];
      pinch = { d: Math.hypot(a.x - b.x, a.y - b.y) || 1, k: focus.dist, ang: Math.atan2(b.y - a.y, b.x - a.x), az: focus.az };
      if (drag) drag.moved = true;
    }
  });
  cv.addEventListener('pointermove', function (e) {
    if (!ptr[e.pointerId]) return;
    ptr[e.pointerId] = { x: e.clientX, y: e.clientY };
    var r = cv.getBoundingClientRect();
    if (pinch) {
      var ids = Object.keys(ptr);
      var a = ptr[ids[0]];
      var b = ptr[ids[1]];
      var mx = (a.x + b.x) / 2 - r.left;
      var my = (a.y + b.y) / 2 - r.top;
      var before = under(mx, my, hitA);
      var bx = before ? before.x : focus.x;
      var bz = before ? before.z : focus.z;
      focus.dist = pinch.k * pinch.d / (Math.hypot(a.x - b.x, a.y - b.y) || 1);
      var da = Math.atan2(b.y - a.y, b.x - a.x) - pinch.ang;
      focus.az = pinch.az + Math.atan2(Math.sin(da), Math.cos(da));
      clamp();
      place();
      var after = under(mx, my, hitB);
      if (after) {
        focus.x += bx - after.x;
        focus.z += bz - after.z;
      }
      clamp();
      place();
      return;
    }
    if (!drag || e.pointerId !== drag.id) return;
    if (Math.abs(e.clientX - drag.x0) > 7 || Math.abs(e.clientY - drag.y0) > 7) drag.moved = true;
    if (!drag.moved) return;
    if (drag.button === 2 || e.shiftKey) {
      focus.az = drag.az - (e.clientX - drag.x0) * 0.008;
      clamp();
      place();
      return;
    }
    var p = under(e.clientX - r.left, e.clientY - r.top, hitA);
    if (p && drag.g) {
      focus.x += drag.g.x - p.x;
      focus.z += drag.g.z - p.z;
      clamp();
      place();
    }
  });
  function up(e) {
    delete ptr[e.pointerId];
    var left = Object.keys(ptr);
    if (pinch && left.length < 2) {
      pinch = null;
      var q = ptr[left[0]];
      if (q) {
        var r2 = cv.getBoundingClientRect();
        drag = { id: +left[0], x0: q.x, y0: q.y, g: under(q.x - r2.left, q.y - r2.top, new THREE.Vector3()), t: 0, moved: true, az: focus.az };
      } else drag = null;
      return;
    }
    if (!drag || e.pointerId !== drag.id) return;
    var d = drag;
    drag = null;
    if (!d.moved && performance.now() - d.t < 600 && e.type === 'pointerup') {
      var r = cv.getBoundingClientRect();
      onTap(hit(e.clientX - r.left, e.clientY - r.top));
    }
  }
  cv.addEventListener('pointerup', up);
  cv.addEventListener('pointercancel', up);
  cv.addEventListener('contextmenu', function (e) { e.preventDefault(); });
  cv.addEventListener('wheel', function (e) {
    e.preventDefault();
    var r = cv.getBoundingClientRect();
    var mx = e.clientX - r.left;
    var my = e.clientY - r.top;
    var b = under(mx, my, hitA);
    var bx = b ? b.x : focus.x;
    var bz = b ? b.z : focus.z;
    focus.dist *= Math.exp(e.deltaY * 0.0012);
    clamp();
    place();
    var a = under(mx, my, hitB);
    if (a) {
      focus.x += bx - a.x;
      focus.z += bz - a.z;
    }
    clamp();
    place();
  }, { passive: false });
}

function hit(sx, sy) {
  ndc.set(sx / cw * 2 - 1, -(sy / ch * 2 - 1));
  ray.setFromCamera(ndc, cam);
  var h = ray.intersectObjects(picks.filter(function (p) { return p.visible; }), false);
  if (h.length) return { kind: 'biz', id: h[0].object.userData.id };
  return { kind: 'none' };
}

function mesh(ref, x, z, rot, y) {
  var m = lib.model(ref);
  var g = new THREE.Group();
  m.parts.forEach(function (p) {
    var o = new THREE.Mesh(p.geom, p.mat);
    o.castShadow = true;
    o.receiveShadow = true;
    g.add(o);
  });
  g.position.set(x, (y || 0) - Math.min(0, m.box.y0), z);
  g.rotation.y = rot || 0;
  return g;
}

// fixed pieces are merged into one mesh per material, so a row of the mall is a few draw calls
function Batch() {
  var sets = {};
  var mtx = new THREE.Matrix4();
  var q = new THREE.Quaternion();
  var up = new THREE.Vector3(0, 1, 0);
  var one = new THREE.Vector3(1, 1, 1);
  function put(geom, mat, x, y, z, rot, k, goods) {
    var key = mat.uuid + (geom.index ? 'i' : 'n') + Object.keys(geom.attributes).sort().join() + (goods ? 'g' : '');
    if (!sets[key]) sets[key] = { mat: mat, list: [], goods: goods };
    q.setFromAxisAngle(up, rot || 0);
    mtx.compose(new THREE.Vector3(x, y, z), q, k ? new THREE.Vector3(k, k, k) : one);
    sets[key].list.push(geom.clone().applyMatrix4(mtx));
  }
  this.sets = sets;
  this.add = function (ref, x, z, rot, y, skip) {
    var m = lib.model(ref);
    m.parts.forEach(function (p) { if (p.mat !== skip) put(p.geom, p.mat, x, (y || 0) - Math.min(0, m.box.y0), z, rot); });
  };
  this.plane = function (mat, w, h, x, y, z, rot) {
    var g = new THREE.PlaneGeometry(w, h);
    put(g, mat, x, y, z, rot);
  };
  this.raw = function (ref, x, z, rot, y, k) {
    lib.model(ref).parts.forEach(function (p) { put(p.geom, p.mat, x, y, z, rot, k, true); });
  };
  this.take = function (o) {
    Object.keys(o.sets).forEach(function (key) {
      if (!sets[key]) sets[key] = { mat: o.sets[key].mat, list: [] };
      sets[key].goods = o.sets[key].goods;
      sets[key].list = sets[key].list.concat(o.sets[key].list);
    });
  };
  // a flat slab of one colour, for paving, asphalt and paint
  this.slab = function (mat, x0, x1, z0, z1, y, h) {
    var g = new THREE.BoxGeometry(x1 - x0, h || 0.02, z1 - z0);
    g.deleteAttribute('uv');
    put(g, mat, (x0 + x1) / 2, (y || 0) - (h || 0.02) / 2, (z0 + z1) / 2, 0);
  };
  this.bulb = function (x, y, z) {
    put(bulbGeo, bulbMat, x, y, z, 0);
  };
  this.pool = function (x, z) {
    put(poolGeo, poolMat, x, 0.07, z, 0);
  };
  this.light = function (x, z) {
    put(roomGeo, poolMat, x, 0.06, z, 0);
  };
  this.group = function (shadow) {
    var g = new THREE.Group();
    Object.keys(sets).forEach(function (k) {
      var o = new THREE.Mesh(mergeGeometries(sets[k].list, false), sets[k].mat);
      o.castShadow = shadow !== false && !sets[k].goods && !sets[k].mat.transparent && sets[k].mat !== poolMat && sets[k].mat !== bulbMat && sets[k].mat !== innerMat;
      o.receiveShadow = true;
      g.add(o);
    });
    return g;
  };
}

var bulbMat = new THREE.MeshLambertMaterial({ color: 0xfff3d0, emissive: 0x000000 });
var bulbGeo = new THREE.SphereGeometry(0.09, 8, 6);
function fade() {
  var c = document.createElement('canvas');
  c.width = c.height = 64;
  var x = c.getContext('2d');
  var g = x.createRadialGradient(32, 32, 0, 32, 32, 32);
  g.addColorStop(0, 'rgba(255,255,255,1)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  x.fillStyle = g;
  x.fillRect(0, 0, 64, 64);
  return new THREE.CanvasTexture(c);
}
var poolMat = new THREE.MeshBasicMaterial({ color: 0xffc870, map: fade(), transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending });
var poolGeo = new THREE.PlaneGeometry(2.8, 2.8).rotateX(-Math.PI / 2);
poolGeo.deleteAttribute('normal');
var roomGeo = new THREE.PlaneGeometry(4.4, 4.4).rotateX(-Math.PI / 2);
roomGeo.deleteAttribute('normal');
var LAMP = { 'roads/light-curved': [1.9, -0.55], 'roads/light-square': [1.72, -0.58] };

// a street lamp, and the bulb under the end of its arm
function lamp(b, ref, x, z, rot) {
  b.add(ref, x, z, rot);
  var l = LAMP[ref];
  b.bulb(x + l[1] * Math.sin(rot), l[0], z + l[1] * Math.cos(rot));
  b.pool(x + l[1] * Math.sin(rot), z + l[1] * Math.cos(rot));
}

var MAT = {};
function flat(c) {
  if (!MAT[c]) MAT[c] = new THREE.MeshLambertMaterial({ color: c });
  return MAT[c];
}
var GRASS = 0x84c26c;
var PAVE = 0xd9d3c7;
var ASPHALT = 0x5b5e66;
var GRAVEL = 0xa39886;
var DIRT = 0x9b7b55;
var PAINT = 0xf4f2ea;

// a straight run of wall from (x0, z0) to (x1, z1), one piece per unit, decorated side toward `inX, inZ`
function wallRun(b, kit, x0, z0, x1, z1, inX, inZ, gap) {
  var n = Math.round(Math.hypot(x1 - x0, z1 - z0));
  var rot = Math.atan2(inX, inZ);
  for (var i = 0; i < n; i++) {
    if (i === gap) continue;
    var u = (i + 0.5) / n;
    b.add(kit + '/wall', x0 + (x1 - x0) * u, z0 + (z1 - z0) * u, rot);
  }
}

function floors(b, ref, x0, x1, z0, z1) {
  for (var x = x0 + 0.5; x < x1; x++) for (var z = z0 + 0.5; z < z1; z++) b.add(ref, x, z, 0);
}

// a shop's own frame: lx toward the corridor, lz north to south; the east units mirror the west ones
function toWorld(s, lx, lz) {
  return [s.cx + s.sg * lx, s.cz + lz];
}
var DIR = { b: [1, 0], s: [0, 1], n: [0, -1], k: [-1, 0] };
function faceRot(s, f) {
  var d = DIR[f];
  return Math.atan2(s.sg * d[0], d[1]);
}

function figure(ref, clip) {
  var m = lib.model(ref);
  var g = new THREE.Group();
  if (!m.gltf) return { obj: g, mixer: null, acts: {}, cur: null };
  var obj = clone(m.gltf.scene);
  var cells = parseRef(ref).cells;
  obj.traverse(function (o) {
    if (!o.isMesh) return;
    if (cells) {
      o.geometry = o.geometry.clone();
      recolour(o.geometry, cells);
    }
    o.material = m.parts[0].mat;
    o.castShadow = false;
  });
  g.add(obj);
  var f = { obj: g, mixer: new THREE.AnimationMixer(obj), acts: {}, cur: null, ref: ref };
  ['idle', 'walk', 'pick-up', 'sit'].forEach(function (c) {
    var a = THREE.AnimationClip.findByName(m.gltf.animations, c);
    if (a) f.acts[c] = f.mixer.clipAction(a);
  });
  act(f, clip || 'idle', 0);
  f.mixer.update(0);
  return f;
}

// staff stand on the same soft blob as shoppers
function crew(ref, clip) {
  var f = figure(ref, clip);
  var blob = new THREE.Mesh(blobGeo, blobMat);
  blob.rotation.x = -Math.PI / 2;
  blob.position.y = 0.035;
  f.obj.add(blob);
  return f;
}

function act(f, name, fade) {
  var a = f.acts[name];
  if (!a || f.cur === a) return;
  a.reset().play();
  if (f.cur && fade) {
    a.crossFadeFrom(f.cur, fade, false);
  } else if (f.cur) f.cur.stop();
  f.cur = a;
}

function rowZ(p) {
  return BACK - DEPTH * p;
}

function shopAt(p, side) {
  return shops[order[p * 2 + side]];
}

function shownRows() {
  var n = 0;
  while (n < order.length && has(order[n])) n++;
  return Math.min(rows.length, Math.floor(n / 2) + 1);
}

// A row of the store: the floor of its two departments and the main aisle, columns at its north corners and on the
// aisle, its stretch of the side walls, and the back wall, which only stands while this is the last row
function buildRows() {
  var n = Math.ceil(order.length / 2);
  for (var p = 0; p < n; p++) {
    var z1 = rowZ(p);
    var z0 = z1 - DEPTH;
    var row = { p: p, z0: z0, z1: z1, parts: [], shown: false };
    var base = new Batch();
    floors(base, 'shop/floor', -SIDE, SIDE, z0, z1);
    [0, 1].forEach(function (side) {
      var s = shopAt(p, side);
      floors(base, s.cfg.floor, s.cx - UNIT / 2, s.cx + UNIT / 2, z0, z1);
    });
    [-EDGE, EDGE].forEach(function (x) { base.add('shop/column', x, z0, 0); });
    // hedges along the outside walls
    [-1, 1].forEach(function (sd) {
      for (var z = z1 - 0.6; z > z0; z -= 1.1) base.add(p % 2 ? 'nature/plant_bushLarge' : 'nature/plant_bush', sd * (EDGE + 0.65), z, z * 1.7);
    });
    var west = new Batch();
    var east = new Batch();
    wallRun(west, 'shop', -EDGE, z1, -EDGE, z0, 1, 0);
    wallRun(east, 'shop', EDGE, z1, EDGE, z0, -1, 0);
    // the back wall stands just outside the row, so the back line can go right up to it
    var cap = new Batch();
    wallRun(cap, 'shop', -EDGE, z0 - 0.3, EDGE, z0 - 0.3, 0, 1);
    var parts = [[base, null], [west, [-1, 0]], [east, [1, 0]], [cap, [0, -1]]];
    parts.forEach(function (pt, i) {
      var g = pt[0].group();
      g.visible = false;
      root.add(g);
      row.parts.push(g);
      if (i === 3) row.cap = g;
      if (pt[1]) outer.push({ g: g, n: pt[1] });
    });
    row.site = buildSite(z0, z1, p);
    row.woods = buildWoods(z0, z1, p);
    rows.push(row);
  }
}

// the ground where the next row will stand: dirt behind a site fence, cones, lights, a digger and a stack of crates
function buildSite(z0, z1, p) {
  var b = new Batch();
  b.slab(flat(DIRT), -EDGE, EDGE, z0, z1, 0.01, 0.03);
  var x0 = -EDGE - 0.3;
  var x1 = EDGE + 0.3;
  for (var x = x0 + 0.6; x < x1; x += 1.15) b.add('roads/construction-fence', x, z0 - 0.15, Math.PI / 2);
  for (var z = z0 + 0.6; z < z1 - 0.2; z += 1.15) {
    b.add('roads/construction-fence', x0, z, 0);
    b.add('roads/construction-fence', x1, z, 0);
  }
  b.add('roads/construction-light', x0 + 0.2, z1 - 0.4, 0);
  b.add('roads/construction-light', x1 - 0.2, z1 - 0.4, 0);
  b.add('roads/construction-cone', -2, z1 - 0.7, 0);
  b.add('roads/construction-cone', -1.2, z1 - 0.9, 0);
  b.add('roads/construction-cone', 2.4, z1 - 0.8, 0);
  b.add('car/tractor-shovel', p % 2 ? 3.5 : -3.5, (z0 + z1) / 2, p % 2 ? -0.6 : 0.5);
  b.add('car/box', p % 2 ? -4.5 : 4.4, z0 + 1.2, 0.2);
  b.add('car/box', p % 2 ? -3.95 : 4.95, z0 + 1.25, -0.1);
  b.add('car/box', p % 2 ? -4.25 : 4.65, z0 + 1.2, 0, 0.33);
  b.add('roads/dumpster', p % 2 ? 5.6 : -5.6, z0 + 1.0, 0);
  var g = b.group();
  g.visible = false;
  root.add(g);
  return g;
}

// land further on is still wooded, and gets cleared a row at a time
var TREES = ['nature/tree_oak', 'nature/tree_default', 'nature/tree_fat', 'nature/tree_detailed', 'nature/tree_pineRoundC'];
function buildWoods(z0, z1, p) {
  var b = new Batch();
  var n = p * 40;
  for (var z = z1 - 0.9; z > z0; z -= 2.1) {
    for (var x = -EDGE + 0.4; x < EDGE; x += 2.2) {
      n++;
      b.add(TREES[n % 5], x + Math.sin(n * 12.9) * 0.6, z + Math.cos(n * 7.3) * 0.5, n);
    }
  }
  var g = b.group();
  g.visible = false;
  root.add(g);
  return g;
}

// what a department gets at each of its 21 steps (STAGE): sixteen fixtures, its sign, the promo display, a second
// associate, then a lit sign with light on the floor and finally a gold sign with a featured display
var STEPS = ['fix', 'fix', 'sign', 'fix', 'fix', 'fix', 'fix', 'fix', 'fix', 'fix', 'promo', 'fix', 'fix', 'fix', 'fix', 'helper', 'fix', 'fix', 'fix',
  'glow', 'gold'];

function rotY(x, z, r) {
  var c = Math.cos(r);
  var s = Math.sin(r);
  return [x * c + z * s, -x * s + z * c];
}

// only round things are piled two deep; everything else is one layer. Heavy models are capped per section
var HEAP = { can: 1, apple: 1, orange: 1, lemon: 1, tomato: 1, onion: 1, coconut: 1, pear: 1, paprika: 1, avocado: 1, 'pumpkin-basic': 1, mushroom: 1 };
var CAP = { watermelon: 4, grapes: 6, pineapple: 8, cheese: 4, strawberry: 4, can: 12, 'soda-bottle': 16, lollypop: 12, popsicle: 16, mussel: 16,
  'vehicle-suv': 2, 'vehicle-racer': 2, 'vehicle-truck': 2, 'vehicle-monster-truck': 2, 'vehicle-speedster': 2, 'vehicle-vintage-racer': 2,
  'train-locomotive': 2, 'train-wagon': 2, 'train-tender': 2, 'cake-birthday': 1, cake: 1, pie: 1, turkey: 1, 'whole-ham': 2, broccoli: 6,
  cauliflower: 6, cabbage: 6, 'animal-fish': 3, 'tent-canvas': 1, 'resource-planks': 2, barrel: 4, workbench: 1,
  'kart-oobi': 1, snowman: 2, reindeer: 2, nutcracker: 4, 'wheel-default': 6, 'wheel-dark': 6, 'wheel-racing': 6, cone: 6, lantern: 4 };

function base(ref) {
  return parseRef(ref.replace(/^\w+:/, '')).file.split('/')[1];
}

// A few goods are built from several models: berries on a tray, bananas as a hand
function composite(ref) {
  var m = /^(\w+):(.+)$/.exec(ref);
  if (!m) return null;
  if (m[1] === 'flat') {
    var tray = 'food/plate-rectangle*0.55';
    var tb = lib.model(tray).box;
    var out = [[tray, 0, 0, 0, 0, 1]];
    var b = lib.model(m[2]).box;
    var step = (b.x1 - b.x0) * 0.95;
    for (var i = -0.5; i <= 0.5; i++) for (var j = -0.5; j <= 0.5; j++) out.push([m[2], i * step, j * step, i * 0.7 + j, tb.h - tb.y0 - 0.01, 1]);
    return { parts: out, box: { x0: tb.x0, x1: tb.x1, z0: tb.z0, z1: tb.z1, y0: 0, h: tb.h - tb.y0 + b.h - b.y0 } };
  }
  // a hand of four bananas fanned out from one stem
  var bb = lib.model(m[2]).box;
  var parts = [];
  var hb = { x0: 9, x1: -9, z0: 9, z1: -9, y0: 0, h: bb.h - bb.y0 };
  for (var k = 0; k < 4; k++) {
    var px = (k - 1.5) * 0.05;
    var pr = (k - 1.5) * 0.35;
    parts.push([m[2], px, 0, pr, 0, 1]);
    [[bb.x0, bb.z0], [bb.x1, bb.z0], [bb.x0, bb.z1], [bb.x1, bb.z1]].forEach(function (q) {
      var p = rotY(q[0], q[1], pr);
      hb.x0 = Math.min(hb.x0, px + p[0]);
      hb.x1 = Math.max(hb.x1, px + p[0]);
      hb.z0 = Math.min(hb.z0, p[1]);
      hb.z1 = Math.max(hb.z1, p[1]);
    });
  }
  return { parts: parts, box: hb };
}

// Goods on a flat surface: as many of one item as fit in the rectangle x0..x1, z0..z1 (in the fixture's own frame,
// front toward +z), at height y. Round produce gets a second layer in the hollows of the first. Long items are turned
// if more of them fit that way, and an item too tall for its shelf or too big for its section is shrunk to fit
function fill(out, ref, x0, x1, z0, z1, y, heap, room) {
  var comp = composite(ref);
  var b = comp ? comp.box : lib.model(ref).box;
  var name = base(ref);
  var k = 1;
  if (room && b.h - b.y0 > room) k = room / (b.h - b.y0);
  var w = (b.x1 - b.x0) * k;
  var d = (b.z1 - b.z0) * k;
  var gap = heap ? 0.004 : 0.012;
  function fit(a, c) {
    return [Math.floor((x1 - x0 + gap) / (a + gap)), Math.floor((z1 - z0 + gap) / (c + gap))];
  }
  var s = fit(w, d);
  var t = fit(d, w);
  var turn = t[0] * t[1] > s[0] * s[1];
  var n = turn ? t : s;
  if (n[0] < 1 || n[1] < 1) {
    // bigger than the section either way: one, shrunk to fit
    var f = Math.min((x1 - x0) / w, (z1 - z0) / d);
    k *= f;
    w *= f;
    d *= f;
    n = [1, 1];
    turn = false;
  }
  var cap = CAP[name] || 10;
  while (n[0] * n[1] > cap) {
    if (n[0] >= n[1]) n[0]--;
    else n[1]--;
  }
  var iw = turn ? d : w;
  var id = turn ? w : d;
  var ax = x0 + (x1 - x0 - n[0] * iw - (n[0] - 1) * gap) / 2;
  var az = z0 + (z1 - z0 - n[1] * id - (n[1] - 1) * gap) / 2;
  // the item's own middle is not always its origin
  var c = turn ? rotY((b.x0 + b.x1) / 2 * k, (b.z0 + b.z1) / 2 * k, Math.PI / 2) : [(b.x0 + b.x1) / 2 * k, (b.z0 + b.z1) / 2 * k];
  var r = turn ? Math.PI / 2 : 0;
  var count = 0;
  function put(x, z, yy, rr) {
    if (!comp) {
      out.push([ref, x, z, rr, yy, k]);
      return;
    }
    comp.parts.forEach(function (p) {
      var q = rotY(p[1] * k, p[2] * k, rr);
      out.push([p[0], x + q[0], z + q[1], rr + p[3], yy + p[4] * k, k * p[5]]);
    });
  }
  for (var i = 0; i < n[0] && count < cap; i++) {
    for (var j = 0; j < n[1] && count < cap; j++) {
      put(ax + iw / 2 + i * (iw + gap) - c[0], az + id / 2 + j * (id + gap) - c[1], y, r);
      count++;
    }
  }
  if (!heap || !HEAP[name]) return;
  var h = (b.h - b.y0) * k * 0.55;
  for (var i2 = 0; i2 < n[0] - 1 && count < cap * 1.6; i2++) {
    for (var j2 = 0; j2 < Math.max(1, n[1] - 1) && count < cap * 1.6; j2++) {
      var dz = n[1] > 1 ? id / 2 + gap / 2 : 0;
      put(ax + iw + i2 * (iw + gap) + gap / 2 - c[0], az + id / 2 + dz + j2 * (id + gap) - c[1], y + h, r + 0.6);
      count++;
    }
  }
}

// the goods a fixture is stocked with, in its own frame. Shelves and coolers take [top, bottom] for a face, or a list
// of those for sections side by side; two-faced shelves take one face for each side. Tables, crates, pallets and
// chests take a list of goods, one per section across the top
function stock(kd, goods, out) {
  if (!goods) return;
  if (kd.none) {
    var ob = OVERSTOCK[goods];
    fill(out, ob[0], kd.x[0], kd.x[1], kd.z[0], kd.z[1], kd.top, false);
    var hb = lib.model(ob[0]).box;
    var layer = out.length;
    for (var o = 0; o < layer; o++) if (o % 3 !== 2) out.push([out[o][0], out[o][1], out[o][2], out[o][3] + 0.1, kd.top + hb.h - hb.y0 + 0.002, out[o][5]]);
    return;
  }
  if (kd.rows) {
    var faces = !kd.two ? [goods] : typeof goods[0] === 'string' ? [goods, goods] : [goods[0], goods[1] || goods[0]];
    faces.forEach(function (face, si) {
      var sd = si === 0 ? 1 : -1;
      var secs = typeof face[0] === 'string' ? [face] : face;
      var w = (kd.x[1] - kd.x[0]) / secs.length;
      secs.forEach(function (g, gi) {
        kd.rows.forEach(function (y, ri) {
          var top = ri === kd.rows.length - 1;
          var room = top ? (kd.ref === 'shop/freezers-standing' ? 0.32 : 0.3) : kd.rows[ri + 1] - y - 0.05;
          var ref = g[kd.rows.length - 1 - ri];
          var part = [];
          var za = sd > 0 ? kd.z[0] : -kd.z[1];
          var zb = sd > 0 ? kd.z[1] : -kd.z[0];
          fill(part, ref, kd.x[0] + gi * w + 0.01, kd.x[0] + (gi + 1) * w - 0.01, za, zb, y, false, room);
          part.forEach(function (p) {
            if (sd < 0) p[3] += Math.PI;
            out.push(p);
          });
        });
      });
    });
    return;
  }
  var n = goods.length;
  var sw = (kd.x[1] - kd.x[0]) / n;
  goods.forEach(function (ref, i) {
    fill(out, ref, kd.x[0] + i * sw + 0.01, kd.x[0] + (i + 1) * sw - 0.01, kd.z[0], kd.z[1], kd.top, !kd.flat, kd.flat ? 0.2 : 0.3);
  });
}

// a TV's picture: a bright canvas just in front of its screen, lit day and night
var screenMat = (function () {
  var c = document.createElement('canvas');
  c.width = 64;
  c.height = 40;
  var x = c.getContext('2d');
  var g = x.createLinearGradient(0, 0, 0, 40);
  g.addColorStop(0, '#6fc3ff');
  g.addColorStop(0.6, '#bfe8ff');
  g.addColorStop(0.61, '#69c25a');
  g.addColorStop(1, '#3e8f3a');
  x.fillStyle = g;
  x.fillRect(0, 0, 64, 40);
  x.fillStyle = '#ffe27a';
  x.beginPath();
  x.arc(48, 11, 6, 0, 7);
  x.fill();
  var t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return new THREE.MeshBasicMaterial({ map: t });
})();

// one fixture (or a row of n alike) with its goods, merged into a batch, and the places shoppers stand to look at it
function fixture(s, fx) {
  var b = new Batch();
  var kd = KIND[fx[0]];
  var ref = kd ? kd.ref : fx[0];
  var box = lib.model(ref).box;
  var rot = faceRot(s, fx[3]);
  var copies = fx[6] || 1;
  var width = box.x1 - box.x0;
  var depth = box.z1 - box.z0;
  var d = DIR[fx[3]];
  var spots = [];
  // copies run along the fixture's own x, which is across its face
  var ax = [-d[1], d[0]];
  for (var ci = 0; ci < copies; ci++) {
    var off = (ci - (copies - 1) / 2) * width;
    var lx = fx[1] + ax[0] * off;
    var lz = fx[2] + ax[1] * off;
    var w = toWorld(s, lx, lz);
    var c = rotY((box.x0 + box.x1) / 2, (box.z0 + box.z1) / 2, rot);
    var ox = w[0] - c[0];
    var oz = w[1] - c[1];
    b.add(ref, ox, oz, rot, 0, kd && kd.open ? glassMat : null);
    var goods = [];
    if (kd) stock(kd, copies > 1 ? fx[4] && fx[4][ci] : fx[4], goods);
    (fx[5] || []).forEach(function (e) { goods.push(e); });
    // goods are given by the height of the surface they stand on
    goods.forEach(function (g) {
      var p = rotY(g[1], g[2], rot);
      var k = g[5] || 1;
      var gb = lib.model(g[0]).box;
      b.raw(g[0], ox + p[0], oz + p[1], rot + g[3], g[4] - gb.y0 * k, k);
      if (g[0].indexOf('televisionModern') >= 0) {
        var sp = rotY(g[1], g[2] + gb.z1 * k + 0.004, rot);
        b.plane(screenMat, (gb.x1 - gb.x0) * k * 0.86, (gb.h - gb.y0) * k * 0.62, ox + sp[0], g[4] + (gb.h - gb.y0) * k * 0.58, oz + sp[1], rot + g[3]);
      }
    });
    if (kd && kd.none || fx[7] === 'staff') continue;
    var st = depth / 2 + 0.28;
    spots.push({ at: [lx + d[0] * st, lz + d[1] * st], f: fx[3] });
    if (kd && kd.two) spots.push({ at: [lx - d[0] * st, lz - d[1] * st], f: OPP[fx[3]] });
  }
  // the footprint in the department's frame, for the path check
  var len = width * copies / 2;
  var half = depth / 2;
  var foot = d[0] ? [fx[1] - half, fx[1] + half, fx[2] - len, fx[2] + len] : [fx[1] - len, fx[1] + len, fx[2] - half, fx[2] + half];
  return { b: b, spots: spots, foot: foot };
}
var OPP = { b: 'k', k: 'b', s: 'n', n: 's' };

// from the main aisle into the department to a place in front of a fixture, along the nearest aisle. Points in the
// department's frame, the first one on the main aisle
function route(s, at) {
  var cfg = s.cfg;
  if (at[0] > 2.3) return [[3.4, at[1]], at];
  var a = cfg.aisles[0];
  cfg.aisles.forEach(function (z) { if (Math.abs(z - at[1]) < Math.abs(a - at[1])) a = z; });
  return [[3.4, a], [at[0], a], at];
}

function buildDepts() {
  BIZ.forEach(function (b, k) {
    var cfg = DEPTS[b.id];
    var p = k >> 1;
    var side = k & 1;
    shops[b.id] = { id: b.id, cfg: cfg, k: k, p: p, sg: side ? -1 : 1, cx: (side ? 1 : -1) * (SIDE + UNIT / 2), cz: rowZ(p) - DEPTH / 2,
      items: [], pieces: [], shown: -1, merged: null, built: false };
    order.push(b.id);
  });
  order.forEach(function (id) {
    var s = shops[id];
    s.group = new THREE.Group();
    root.add(s.group);
    // the clerk who joins at the first milestone, who keeps the shelves full, or stands at the counter
    s.clerk = { f: crew(s.cfg.clerk ? 'shop/character-employee@5,3>2,2' : 'shop/character-employee', 'idle'), i: 0, wait: 0, path: null };
    var home = world(s, [3.2, s.cfg.aisles[0]]);
    s.clerk.f.obj.position.set(home.x, 0, home.z);
    s.clerk.f.obj.visible = false;
    if (s.cfg.clerk) {
      var cw = toWorld(s, s.cfg.clerk[0], s.cfg.clerk[1]);
      s.clerk.f.obj.position.set(cw[0], 0, cw[1]);
      s.clerk.f.obj.rotation.y = faceRot(s, s.cfg.clerk[2]);
      s.clerk.still = true;
    }
    s.group.add(s.clerk.f.obj);
    // an empty block being fitted out: bare concrete, boxes on a pallet, a sack truck, barriers to the main aisle
    s.vacant = new THREE.Group();
    var vb = new Batch();
    var c0 = toWorld(s, -2.7, -2.5);
    var c1 = toWorld(s, 3, 2.5);
    vb.slab(flat(0xb9b6ae), Math.min(c0[0], c1[0]), Math.max(c0[0], c1[0]), c0[1], c1[1], 0.012, 0.01);
    var pw = toWorld(s, -0.6, -0.4);
    vb.add('skate/pallet', pw[0], pw[1], 0.3);
    var pb = [];
    stock(KIND.stock, 'boxes', pb);
    pb.forEach(function (g) {
      var q = rotY(g[1], g[2], 0.3);
      vb.raw(g[0], pw[0] + q[0], pw[1] + q[1], 0.3 + g[3], g[4] - lib.model(g[0]).box.y0 * g[5], g[5]);
    });
    var h = toWorld(s, 0.5, 0.4);
    vb.add('shop/hand-truck', h[0], h[1], faceRot(s, 'k') + 0.5);
    [-1.2, 1.2].forEach(function (z) {
      var bw = toWorld(s, 2.75, z);
      vb.add('roads/construction-barrier', bw[0], bw[1], 0);
    });
    s.vacant.add(vb.group());
    s.group.add(s.vacant);
    // what stands from the start once the department is open, and its lights at night
    s.decor = (s.cfg.decor || []).map(function (fx) { return fixture(s, fx).b; });
    s.lights = new Batch();
    [[-1.2, -0.5], [1.2, 0.6]].forEach(function (q) {
      var w = toWorld(s, q[0], q[1]);
      s.lights.light(w[0], w[1]);
    });
    var pick = new THREE.Mesh(new THREE.BoxGeometry(UNIT, 1.2, DEPTH), new THREE.MeshBasicMaterial({ visible: false }));
    pick.position.set(s.cx, 0.6, s.cz);
    pick.userData.id = id;
    root.add(pick);
    picks.push(pick);
    s.pick = pick;
  });
}

// a department's fixtures are made when its row first shows, which keeps the first load short
function buildPieces(s) {
  var fixN = 0;
  STEPS.forEach(function (k) {
    var pc = { k: k, g: null, b: null };
    if (k === 'fix' || k === 'promo') {
      var fx = fixture(s, k === 'fix' ? s.cfg.fix[fixN++] : s.cfg.promo);
      pc.b = fx.b;
      pc.spots = fx.spots;
      pc.foot = fx.foot;
      s.items.push(pc);
    } else if (k === 'sign') pc.g = makeSign(s);
    else if (k === 'helper') {
      pc.g = new THREE.Group();
      s.helper = { f: crew('shop/character-employee', 'walk'), i: 0, wait: 0, path: null };
      var hw = world(s, [3.2, s.cfg.aisles[s.cfg.aisles.length - 1]]);
      s.helper.f.obj.position.set(hw.x, 0, hw.z);
      pc.g.add(s.helper.f.obj);
    } else if (k === 'glow') pc.g = floorLight(s);
    else if (k === 'gold') {
      var top = fixture(s, s.cfg.feature);
      pc.b = top.b;
      pc.spots = top.spots;
      pc.foot = top.foot;
      s.items.push(pc);
    }
    if (pc.g) {
      pc.g.visible = false;
      s.group.add(pc.g);
    }
    s.pieces.push(pc);
  });
  s.built = true;
}

// once nothing in a department is moving, its fixtures are drawn as one merged batch, a few draw calls for the lot
function settle(s) {
  if (s.merged) {
    s.group.remove(s.merged);
    s.merged.traverse(function (o) { if (o.geometry) o.geometry.dispose(); });
    s.merged = null;
  }
  var all = new Batch();
  var any = false;
  if (has(s.id)) {
    s.decor.forEach(function (b) { all.take(b); });
    all.take(s.lights);
  }
  s.items.forEach(function (pc) {
    if (!pc.on || pc.rising) return;
    all.take(pc.b);
    if (pc.g) {
      s.group.remove(pc.g);
      pc.g.traverse(function (o) { if (o.geometry) o.geometry.dispose(); });
      pc.g = null;
    }
    any = true;
  });
  if (!any) return;
  s.merged = all.group();
  s.group.add(s.merged);
  shadowDirty = true;
}

function signTex(name, gold) {
  var c = document.createElement('canvas');
  c.width = 512;
  c.height = 136;
  var x = c.getContext('2d');
  x.fillStyle = gold ? '#e0b43a' : '#2f3446';
  x.fillRect(0, 0, 512, 136);
  x.fillStyle = gold ? '#fff2c2' : '#f2c230';
  x.fillRect(0, 124, 512, 12);
  x.fillStyle = gold ? '#3a2a08' : '#fff6e0';
  x.textAlign = 'center';
  x.textBaseline = 'middle';
  var t = name.toUpperCase();
  x.font = 'bold 64px sans-serif';
  if (x.measureText(t).width > 480) {
    var w = t.split(' ');
    var half = Math.ceil(w.length / 2);
    x.font = 'bold 50px sans-serif';
    x.fillText(w.slice(0, half).join(' '), 256, 36);
    x.fillText(w.slice(half).join(' '), 256, 92);
  } else x.fillText(t, 256, 64);
  var tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

// The department's name on a blade over the main aisle at its north corner, hung from a post at the aisle edge.
// Out there it covers only aisle floor; over the department it would hide the row behind it
function makeSign(s) {
  var g = new THREE.Group();
  var p = toWorld(s, 3.05, -2.42);
  var c = toWorld(s, 3.78, -2.42);
  var frame = [];
  [[0.06, 1.34, 0.06, p[0], 0.67], [0.8, 0.04, 0.04, (p[0] + c[0]) / 2, 1.32], [1.38, 0.4, 0.05, c[0], 1.1]].forEach(function (q) {
    var b = new THREE.BoxGeometry(q[0], q[1], q[2]);
    b.translate(q[3], q[4], p[1]);
    b.deleteAttribute('uv');
    frame.push(b);
  });
  var fm = new THREE.Mesh(mergeGeometries(frame, false), flat(0x2f3446));
  fm.castShadow = true;
  g.add(fm);
  var mat = new THREE.MeshLambertMaterial({ map: signTex(BZ[s.id].name, false) });
  var face = new THREE.Mesh(new THREE.PlaneGeometry(1.32, 0.35), mat);
  face.position.set(c[0], 1.1, p[1] + 0.03);
  g.add(face);
  s.signMat = mat;
  return g;
}

// level 300: light falling on the department floor from above, day and night
function floorLight(s) {
  var g = new THREE.Group();
  var mat = new THREE.MeshBasicMaterial({ color: 0xfff0c8, map: fade(), transparent: true, opacity: 0.28, depthWrite: false, blending: THREE.AdditiveBlending });
  [[-1.2, -0.3], [1.0, 0.5]].forEach(function (q) {
    var m = new THREE.Mesh(new THREE.PlaneGeometry(3.2, 3.2).rotateX(-Math.PI / 2), mat);
    var w = toWorld(s, q[0], q[1]);
    m.position.set(w[0], 0.03, w[1]);
    g.add(m);
  });
  return g;
}


// The front of the store. Shoppers come down from the aisles, cross the front aisle (z -2.3) and pay on their way to
// the doors. A staffed lane is a counter with its belt on the west half and the till on the east: the customer queues
// on the west side, the cashier stands east of it. Self checkouts face east in two columns, customers east of them.
// After paying everyone walks out along the exit lane (z 1.1) to the doors; what stands against the front wall stays
// south of it. Each level of the checkouts adds to what is there; level 0 is the store as it opens
var LANES = [-2.3, -4.2, -6.1];
var KIOSKS = [[3.0, -1.7], [3.0, -0.6], [3.0, 0.5], [5.3, -1.7], [5.3, -0.6], [5.3, 0.5]];
var CROSS = -2.3;
var EXIT = 1.1;
var BASKETS = [-1.15, 1.8];
var FRONT_ITEMS = [
  [2, 'shop/shopping-cart', 'carts'],
  [4, 'shop/bottle-return', -6.6, 1.95, Math.PI], [4, 'shop/bottle-return', -6.1, 1.95, Math.PI],
  [8, 'arcade/vending-machine', 3.4, 1.95, Math.PI], [8, 'arcade/vending-machine', 3.95, 1.95, Math.PI], [8, 'arcade/vending-machine', 4.5, 1.95, Math.PI],
  [8, 'shop/gacha-machine', 2.6, 1.95, Math.PI], [10, 'furn/bench', -4.9, 1.95, Math.PI], [10, 'furn/pottedPlant', -7.0, 1.95, 0],
  [10, 'furn/pottedPlant', 7.0, 0.3, 0]
];

// a lane's number on a small lit box, standing on its impulse rack
function laneSign(n) {
  var c = document.createElement('canvas');
  c.width = 64;
  c.height = 64;
  var x = c.getContext('2d');
  x.fillStyle = '#2f3446';
  x.fillRect(0, 0, 64, 64);
  x.fillStyle = '#ffd34a';
  x.font = 'bold 46px sans-serif';
  x.textAlign = 'center';
  x.textBaseline = 'middle';
  x.fillText(String(n), 32, 35);
  var t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  var lit = new THREE.MeshLambertMaterial({ map: t, emissive: 0xffffff, emissiveMap: t, emissiveIntensity: 0.6 });
  var rim = flat(0x2f3446);
  return new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.22, 0.22), [lit, lit, rim, rim, lit, lit]);
}

// the store's name over the doors, standing above the wall line
function doorSign() {
  var c = document.createElement('canvas');
  c.width = 512;
  c.height = 96;
  var x = c.getContext('2d');
  x.fillStyle = '#2f3446';
  x.fillRect(0, 0, 512, 96);
  x.fillStyle = '#f2c230';
  x.fillRect(0, 84, 512, 12);
  x.fillStyle = '#fff6e0';
  x.font = 'bold 60px sans-serif';
  x.textAlign = 'center';
  x.textBaseline = 'middle';
  x.fillText('MAIN STREET', 256, 44);
  var t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  var m = new THREE.MeshLambertMaterial({ map: t, emissiveMap: t, emissive: 0x000000 });
  var rim = flat(0x2f3446);
  var b = new THREE.Mesh(new THREE.BoxGeometry(2.9, 0.42, 0.06), [rim, rim, rim, rim, m, rim]);
  b.position.set(0, 1.2, FRONT + 0.05);
  b.castShadow = true;
  root.add(b);
  doorMat = m;
}
var doorMat;

// a staffed lane: the counter, its cashier, the impulse rack the line waits beside with the lane number on it, and
// the baskets left at the end. Its line runs north up the west side of the counter, the one paying at the front
function lane(hall, li, lv) {
  var x = LANES[li];
  var m = mesh('shop/cash-register', x, 0, 0);
  var cashier = crew('shop/character-employee', 'idle');
  cashier.obj.position.set(0.68, 0, 0.15);
  cashier.obj.rotation.y = -Math.PI / 2;
  m.add(cashier.obj);
  var rack = new Batch();
  var goods = [];
  stock(KIND.end, ['food/lollypop', 'food/candy-bar-wrapper'], goods);
  var rot = -Math.PI / 2;
  rack.add('shop/shelf-end', -0.2, -0.8, rot);
  goods.forEach(function (g) {
    var p = rotY(g[1], g[2], rot);
    rack.raw(g[0], -0.2 + p[0], -0.8 + p[1], rot + g[3], g[4] - lib.model(g[0]).box.y0 * g[5], g[5]);
  });
  for (var bk = 0; bk < 3; bk++) rack.add('shop/shopping-basket', 0.05, 0.72, 0.2, bk * 0.06);
  m.add(rack.group());
  var sign = laneSign(li + 1);
  sign.position.set(0, 1.17, -0.8);
  m.add(sign);
  m.visible = false;
  root.add(m);
  hall.items.push({ g: m, lv: lv });
  hall.staff.push(cashier);
  var qx = x - 0.72;
  return { k: 'lane', till: [x + 0.2, 0.62, 0.2], cashier: cashier,
    spot: function (n) { return n ? [qx, -0.85 - 0.5 * (n - 1), 0] : [qx, 0.15, Math.PI / 2]; } };
}

// a self checkout faces east, its shopper standing east of it
function kiosk(hall, ki, lv) {
  var k = KIOSKS[ki];
  var m = mesh('shop/cash-register-self', k[0], k[1], Math.PI / 2);
  m.visible = false;
  root.add(m);
  hall.items.push({ g: m, lv: lv });
  return { k: 'self', x: k[0] + 0.55, z: k[1], till: [k[0], 0.7, k[1]] };
}

function buildFront() {
  var b = new Batch();
  floors(b, 'shop/floor', -EDGE, EDGE, BACK, FRONT);
  [-EDGE, EDGE].forEach(function (x) { b.add('shop/column', x, FRONT, 0); });
  [-SIDE, SIDE].forEach(function (x) { b.add('shop/column', x, FRONT, 0); });
  [-EDGE, EDGE].forEach(function (x) { b.add('shop/column', x, BACK, 0); });
  b.add('furn/rugDoormat', -0.5, FRONT - 0.45, 0, 0.004);
  b.add('furn/rugDoormat', 0.5, FRONT - 0.45, 0, 0.004);
  // the baskets inside the doors, stacked one in another
  for (var i = 0; i < 5; i++) b.add('shop/shopping-basket', BASKETS[0], BASKETS[1], 0, i * 0.06);
  [-4.4, 0, 4.4].forEach(function (x) { b.light(x, -0.3); });
  root.add(b.group());
  // a glass front: the camera sees the checkouts through its windows, so it stands at full height
  var front = new Batch();
  [[-EDGE, -SIDE], [SIDE, EDGE]].forEach(function (r) {
    for (var x = r[0] + 0.5; x < r[1]; x++) front.add('shop/wall-window', x, FRONT, Math.PI);
  });
  root.add(front.group());
  [[-1, -EDGE], [1, EDGE]].forEach(function (sd) {
    var w = new Batch();
    wallRun(w, 'shop', sd[1], FRONT, sd[1], BACK, -sd[0], 0, sd[0] > 0 ? 4 : -1);
    if (sd[0] > 0) doorFrame(w);
    var wg = w.group();
    if (sd[0] > 0) doorLeaf(wg);
    root.add(wg);
    outer.push({ g: wg, n: [sd[0], 0] });
  });
  doorSign();
  var hall = { items: [], shown: -1, add: true, tills: [], staff: [] };
  // the greeter stands by the baskets from the first day
  var greeter = crew('shop/character-employee', 'idle');
  greeter.obj.position.set(BASKETS[0] - 0.6, 0, BASKETS[1] - 0.05);
  greeter.obj.rotation.y = Math.PI / 2;
  root.add(greeter.obj);
  hall.items.push({ g: greeter.obj, lv: 0 });
  hall.staff.push(greeter);
  var li = 0;
  var ki = 0;
  TILLS.forEach(function (t) { hall.tills.push(t.k === 'lane' ? lane(hall, li++, t.lv) : kiosk(hall, ki++, t.lv)); });
  hall.tills.push(gardenTill);
  hall.staff.push(gardenTill.cashier);
  // the attendant who watches the self checkouts, and the service desk in the south-east corner
  var att = crew('shop/character-employee', 'idle');
  att.obj.position.set(4.6, 0, -1.15);
  att.obj.rotation.y = -Math.PI / 2;
  att.obj.visible = false;
  root.add(att.obj);
  hall.items.push({ g: att.obj, lv: 3 });
  hall.staff.push(att);
  var desk = mesh('arcade/cash-register', 6.2, 1.45, Math.PI);
  var clerk = crew('shop/character-employee', 'idle');
  clerk.obj.position.set(0, 0, -0.5);
  desk.add(clerk.obj);
  desk.visible = false;
  root.add(desk);
  hall.items.push({ g: desk, lv: 7 });
  hall.staff.push(clerk);
  FRONT_ITEMS.forEach(function (it) {
    var g;
    if (it[2] === 'carts') {
      var cb = new Batch();
      for (var c = 0; c < 5; c++) cb.add('shop/shopping-cart', -3.6 + c * 0.22, 1.9, -Math.PI / 2);
      g = cb.group();
    } else g = mesh(it[1], it[2], it[3], it[4]);
    g.visible = false;
    root.add(g);
    hall.items.push({ g: g, lv: it[0] });
  });
  places.hall = hall;
  addPick('hall', 0, (FRONT + BACK) / 2, EDGE * 2, FRONT - BACK);
  buildDoors();
}

// glass doors that slide apart when someone comes near; a fixed pane either side, a rail across the top
var glass = new THREE.MeshLambertMaterial({ color: 0xbfe6f2, transparent: true, opacity: 0.38, depthWrite: false });
var doors = { open: 0, panes: [] };
function buildDoors() {
  var rail = new THREE.Mesh(new THREE.BoxGeometry(SIDE * 2, 0.08, 0.16), flat(0x50566a));
  rail.position.set(0, 0.96, FRONT);
  root.add(rail);
  var pane = new THREE.BoxGeometry(0.72, 0.9, 0.03);
  var edge = new THREE.BoxGeometry(0.03, 0.9, 0.05);
  [-1, 1].forEach(function (sd) {
    var fixed = new THREE.Mesh(pane, glass);
    fixed.position.set(sd * 1.08, 0.47, FRONT + 0.05);
    root.add(fixed);
    var g = new THREE.Group();
    var p = new THREE.Mesh(pane, glass);
    g.add(p);
    [-0.35, 0.35].forEach(function (ex) {
      var e = new THREE.Mesh(edge, flat(0x8d93a6));
      e.position.x = ex;
      g.add(e);
    });
    g.position.set(sd * 0.36, 0.47, FRONT - 0.05);
    root.add(g);
    doors.panes.push({ g: g, sd: sd });
  });
}

function doorsStep(dt) {
  var near = false;
  for (var i = 0; i < people.length && !near; i++) {
    var p = people[i].f.obj.position;
    if (people[i].path && Math.abs(p.x) < 1.6 && Math.abs(p.z - FRONT) < 1.4) near = true;
  }
  var want = near ? 1 : 0;
  if (want === doors.open) return;
  doors.open = want > doors.open ? Math.min(1, doors.open + dt * 2.5) : Math.max(0, doors.open - dt * 1.5);
  var e = doors.open * doors.open * (3 - 2 * doors.open);
  doors.panes.forEach(function (d) { d.g.position.x = d.sd * (0.36 + e * 0.7); });
}

function addPick(id, x, z, w, d) {
  var pick = new THREE.Mesh(new THREE.BoxGeometry(w, 1.2, d), new THREE.MeshBasicMaterial({ visible: false }));
  pick.position.set(x, 0.6, z);
  pick.userData.id = id;
  root.add(pick);
  picks.push(pick);
  return pick;
}

// a place that shows a different set of pieces at each of its levels; level 0 is the bare site
function levels(n) {
  var out = [];
  for (var i = 0; i <= n; i++) out.push(new Batch());
  return out;
}

function finishPlace(id, batches) {
  var pl = { items: [], shown: -1 };
  batches.forEach(function (b, lv) {
    var g = b.group();
    g.visible = false;
    root.add(g);
    pl.items.push({ g: g, lv: lv, only: lv === 0 });
  });
  places[id] = pl;
  return pl;
}

// The garden center is a fenced yard on the west side of the front, its gate on the lot. Before it is built the
// corner is a lawn with a bench or two; each level then adds tables of flowers, potted plants, young trees and lights.
// The fence comes in one unit pieces with a post at each end, so every run, and the gate opening, ends on a post
var GARDEN = [-12.75, -7.8, -2.1, 2.86];
var GATE_X = -10.475;
var TILL_G = [-9.2, 3.4];
var gardenTill;
var FLOWERS = ['shop/display-flowers', 'shop/display-flowers@7,1>3,1;11,1>15,2', 'shop/display-flowers@7,1>11,1;15,2>2,1',
  'shop/display-flowers@7,1>9,1;11,1>3,1'];

function buildGarden() {
  var lv = levels(4);
  [[-10.2, 1.2], [-11.2, -1.0], [-9.6, -0.2]].forEach(function (p, i) { lv[0].add(i % 2 ? 'nature/flower_yellowA' : 'nature/flower_redA', p[0], p[1], i); });
  lv[0].add('furn/bench', -10.4, 0.4, -Math.PI / 2);
  lv[0].add('furn/bench', -10.4, 2.2, -Math.PI / 2);
  var x0 = GARDEN[0];
  var x1 = GARDEN[1];
  var z0 = GARDEN[2];
  var z1 = GARDEN[3];
  var step = (x1 - x0) / 5;
  // the levels add up, so each piece is in the batch of the level that brings it
  lv[1].slab(flat(GRAVEL), x0, x1, z0, z1, 0.006, 0.02);
  lv[1].slab(flat(PAVE), x0 + 2 * step, x0 + 3 * step, z1, LOT[0], 0.004, 0.02);
  for (var i = 0; i < 5; i++) {
    if (i !== 2) lv[1].add('forest/fence', x0 + (i + 0.5) * step, z1, 0);
    lv[1].add('forest/fence', x0 + (i + 0.5) * step, z0, 0);
    lv[1].add('forest/fence', x0, z0 + (i + 0.5) * (z1 - z0) / 5, Math.PI / 2);
  }
  // flower displays in pairs, a row more each level, with the gate's path between the two columns
  [[1, 2.0], [2, 0.6], [3, -0.8]].forEach(function (r, ri) {
    [-11.55, -9.4].forEach(function (x, ci) {
      lv[r[0]].add(FLOWERS[(ri + ci) % 4], x - 0.42, r[1], 0);
      lv[r[0]].add(FLOWERS[(ri + ci + 2) % 4], x + 0.42, r[1], 0);
    });
  });
  for (var t = 0; t < 6; t++) lv[2].add('furn/pottedPlant', -12.0 + t * 0.72, -1.72, t);
  lv[3].add('nature/tree_small', -8.25, -1.45, 0.3);
  lv[3].add('nature/tree_small', -8.25, 2.45, 1.2);
  lamp(lv[4], 'roads/light-square', -12.45, 2.55, 0);
  lamp(lv[4], 'roads/light-square', -12.45, -1.8, Math.PI);
  var pl = finishPlace('garden', lv);
  pl.add = true;
  // the garden's own till outside the gate, its cashier on the east side and the one paying on the west; the next
  // in line waits behind on the paving
  var desk = mesh('arcade/cash-register', TILL_G[0], TILL_G[1], -Math.PI / 2);
  var cashier = crew('shop/character-employee', 'idle');
  cashier.obj.position.set(0, 0, -0.5);
  desk.add(cashier.obj);
  desk.visible = false;
  root.add(desk);
  pl.items.push({ g: desk, lv: 1 });
  var qx = TILL_G[0] - 0.55;
  gardenTill = { k: 'garden', till: [TILL_G[0], 0.8, TILL_G[1]], cashier: cashier,
    spot: function (n) { return n ? [qx, TILL_G[1] + 0.5 * n, Math.PI] : [qx, TILL_G[1], Math.PI / 2]; } };
  pl.pick = addPick('garden', (x0 + x1) / 2, (z0 + z1) / 2, x1 - x0, z1 - z0);
}

// a pylon sign by the street with the store's name; "Market" until most of the store is open
function buildPylon() {
  var g = new THREE.Group();
  [-1, 1].forEach(function (sd) {
    var post = new THREE.Mesh(new THREE.BoxGeometry(0.16, 2.4, 0.16), flat(0x50566a));
    post.position.set(sd * 0.9, 1.2, 0);
    post.castShadow = true;
    g.add(post);
  });
  var c = document.createElement('canvas');
  c.width = 512;
  c.height = 256;
  var tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  var mat = new THREE.MeshLambertMaterial({ map: tex, emissiveMap: tex, emissive: 0x000000 });
  var board = new THREE.Mesh(new THREE.BoxGeometry(2.3, 1.15, 0.14), [flat(0x3a3d4a), flat(0x3a3d4a), flat(0x3a3d4a), flat(0x3a3d4a), mat, flat(0x3a3d4a)]);
  board.position.y = 2.0;
  board.castShadow = true;
  g.add(board);
  g.position.set(12.6, 0, 8.9);
  root.add(g);
  pylon = { c: c, tex: tex, mat: mat, big: null };
}
var pylon;

function paintPylon() {
  var big = order.filter(has).length >= 8;
  if (pylon.big === big) return;
  pylon.big = big;
  var x = pylon.c.getContext('2d');
  x.fillStyle = '#2f3446';
  x.fillRect(0, 0, 512, 256);
  x.fillStyle = '#f2c230';
  x.fillRect(0, 196, 512, 60);
  x.fillStyle = '#fff6e0';
  x.font = 'bold 92px sans-serif';
  x.textAlign = 'center';
  x.textBaseline = 'middle';
  x.fillText('MAIN', 256, 58);
  x.fillText('STREET', 256, 146);
  x.fillStyle = '#2f3446';
  x.font = 'bold 42px sans-serif';
  x.fillText(big ? 'SUPERCENTER' : 'MARKET', 256, 228);
  pylon.tex.needsUpdate = true;
}

// in front of the doors: a paved square, then the parking lot with a walkway down its middle, the sidewalk and the
// street, and across the street a row of houses
function buildOutside() {
  var b = new Batch();
  b.slab(flat(GRASS), -90, 90, -90, 90, -0.03, 0.02);
  b.slab(flat(PAVE), -EDGE - 0.5, EDGE + 0.5, FRONT, LOT[0], 0, 0.02);
  b.slab(flat(PAVE), -60, 60, LOT[1], 10.5, 0, 0.02);
  b.slab(flat(PAVE), -60, 60, 13.5, 14.4, 0, 0.02);
  b.slab(flat(ASPHALT), -60, 60, 10.5, 13.5, 0, 0.015);
  for (var x = -60; x <= 60; x += 3) b.add(Math.abs(x) < 1 ? 'roads/road-crossing' : 'roads/road-straight', x, 12, 0, 0.002);
  for (var lx = -48; lx <= 48; lx += 8) lamp(b, 'roads/light-curved', lx + 4, 14.15, 0);
  // across the street
  var houses = ['sub/building-type-a', 'sub/building-type-c', 'sub/building-type-e', 'sub/building-type-h', 'sub/building-type-k'];
  for (var hx = -30, hi = 0; hx <= 30; hx += 6, hi++) {
    b.add(houses[hi % houses.length], hx, 17.6, Math.PI);
    b.add('sub/tree-large', hx + 3, 15.6, hi);
  }
  // trees round the site, thicker further out
  var trees = ['nature/tree_oak', 'nature/tree_default', 'nature/tree_fat', 'nature/tree_detailed', 'nature/tree_pineRoundC'];
  var ti = 0;
  // the furthest the store can reach: its last row and the site behind it
  var far = rowZ(Math.ceil(BIZ.length / 2)) - 0.6;
  for (var z = 1.5; z > far; z -= 3.2) {
    if (z < -7) b.add(trees[ti++ % 5], EDGE + 2.4, z, ti);
    if (z < GARDEN[2] - 0.8) b.add(trees[ti++ % 5], -EDGE - 2.4, z, ti);
  }
  // woods behind the last row and either side, leaving the loading bay and the lot clear
  var n = 0;
  for (var gz = 3; gz > far - 12; gz -= 2.3) {
    for (var gx = -26; gx <= 26; gx += 2.2) {
      n++;
      var jx = gx + Math.sin(n * 12.9) * 0.7;
      var jz = gz + Math.cos(n * 7.3) * 0.7;
      var inner = Math.abs(jx) < EDGE + 3.6;
      if (inner && jz > far - 1 || Math.abs(jx) < 12.6 && jz > -7.5) continue;
      if (Math.sin(n * 3.1) > 0.75) continue;
      b.add(trees[n % 5], jx, jz, n);
    }
  }
  // the loading bay on the east
  b.slab(flat(ASPHALT), EDGE + 0.7, 11.2, -6.5, LOT[0], 0, 0.016);
  b.add('roads/dumpster', EDGE + 1.5, -5.6, Math.PI / 2);
  b.add('furn/cardboardBoxClosed', 10.45, -6.05, 0.2);
  b.add('furn/cardboardBoxClosed', 10.95, -6.0, -0.3);
  b.add('furn/cardboardBoxOpen', 10.7, -6.2, 0.6);
  // the apron the stockers step out onto from the stock door
  b.slab(flat(PAVE), EDGE + 0.3, EDGE + 0.7, DOORZ - 0.6, DOORZ + 0.6, 0, 0.02);
  root.add(b.group());
  buildLot();
  buildTaxi();
  buildDock();
  buildGarden();
  buildPylon();
}

// parking bays: two rows either side of the aisle, each split by the walkway; the lot paints more of them at each level
function buildLot() {
  var lv = levels(4);
  // before it is built: graded gravel behind a site fence, a digger and a load of curbs waiting
  lv[0].slab(flat(GRAVEL), -11.2, 11.2, LOT[0], LOT[1], 0.006, 0.02);
  for (var fx = -10.6; fx < 11; fx += 1.15) {
    if (Math.abs(fx) < 1.6) continue;
    lv[0].add('roads/construction-fence', fx, LOT[0] + 0.25, Math.PI / 2);
    lv[0].add('roads/construction-fence', fx, LOT[1] - 0.25, Math.PI / 2);
  }
  for (var fz = LOT[0] + 0.85; fz < LOT[1] - 0.4; fz += 1.15) {
    lv[0].add('roads/construction-fence', -11.0, fz, 0);
    lv[0].add('roads/construction-fence', 11.0, fz, 0);
  }
  lv[0].add('car/tractor-shovel', -5.5, 6.6, 1.2);
  lv[0].add('car/truck-flat', 6.2, 6.9, -Math.PI / 2);
  lv[0].add('car/box', 6.0, 6.9, 0.1, 0.3);
  lv[0].add('car/box', 6.5, 6.9, -0.2, 0.3);
  lv[0].add('car/box', 8.6, 5.0, 0.4);
  lv[0].add('car/box', 9.05, 5.1, -0.1);
  lv[0].add('roads/construction-light', -1.9, LOT[0] + 0.3, 0);
  lv[0].add('roads/construction-light', 1.9, LOT[1] - 0.3, 0);
  [[-2.6, 5.2], [-8.2, 8.5], [2.8, 8.6], [-3.4, 7.9]].forEach(function (c) { lv[0].add('roads/construction-cone', c[0], c[1], 0); });
  lv[0].add('roads/construction-barrier', -1.0, 6.8, Math.PI / 2);
  lv[0].add('roads/construction-barrier', 1.0, 6.8, Math.PI / 2);
  for (var l = 1; l <= 4; l++) {
    lv[l].slab(flat(ASPHALT), -11.2, 11.2, LOT[0], LOT[1], 0.008, 0.02);
    lv[l].slab(flat(PAVE), -1.4, 1.4, LOT[0], LOT[1], 0.012, 0.02);
  }
  var paint = flat(PAINT);
  var rowsZ = [[4.0, 5.6, -1], [8.0, 9.6, 1]];
  for (var side = -1; side <= 1; side += 2) {
    for (var i = 0; i < 8; i++) {
      var bx = side * (2 + i);
      for (var r = 0; r < 2; r++) {
        var rz = rowsZ[r];
        var unlock = i < 4 ? 1 + r : 3 + r;
        bays.push({ x: bx, z: (rz[0] + rz[1]) / 2, nose: rz[2], lv: unlock, car: null });
        for (var u = unlock; u <= 4; u++) {
          lv[u].slab(paint, bx - 0.53, bx - 0.47, rz[0] + 0.1, rz[1] - 0.1, 0.02, 0.008);
          lv[u].slab(paint, bx + 0.47, bx + 0.53, rz[0] + 0.1, rz[1] - 0.1, 0.02, 0.008);
        }
      }
    }
  }
  // zebra stripes where the walkway crosses the aisle
  for (var zl = 1; zl <= 4; zl++) for (var zs = -1.2; zs < 1.3; zs += 0.5) lv[zl].slab(paint, zs - 0.16, zs + 0.16, 6.1, 7.5, 0.024, 0.008);
  [[1, -5.7, 3.9], [1, 5.7, 3.9], [3, -8.7, 3.9], [3, 9.9, 3.9], [4, -5.7, 9.8], [4, 5.7, 9.8]].forEach(function (p) {
    for (var u = p[0]; u <= 4; u++) lamp(lv[u], 'roads/light-square', p[1], p[2], p[2] < 5 ? Math.PI : 0);
  });
  // potted trees along the walkway's edges, clear of the bays beside it
  [[-1.22, 4.3], [1.22, 4.3], [-1.22, 9.3], [1.22, 9.3]].forEach(function (q, i) { lv[4].add('furn/pottedPlant', q[0], q[1], i); });
  var pl = finishPlace('lot', lv);
  pl.pick = addPick('lot', 0, (LOT[0] + LOT[1]) / 2, 22, LOT[1] - LOT[0]);
}

// the taxi stand on the sidewalk east of the walkway
function buildTaxi() {
  var lv = levels(4);
  for (var l = 1; l <= 4; l++) {
    lv[l].add('roads/road-sign-street', 7.1, 10.3, Math.PI);
    lv[l].slab(flat(0xf2c230), 4.4, 7.0, 10.55, 10.62, 0.02, 0.008);
    lv[l].slab(flat(0xf2c230), 4.4, 4.47, 10.55, 11.95, 0.02, 0.008);
    lv[l].slab(flat(0xf2c230), 6.93, 7.0, 10.55, 11.95, 0.02, 0.008);
  }
  for (var u = 2; u <= 4; u++) {
    lv[u].add('furn/bench', 5.2, 9.95, Math.PI);
    lv[u].add('furn/trashcan', 6.3, 9.95, 0);
  }
  for (var w = 3; w <= 4; w++) {
    lv[w].add('furn/bench', 4.1, 9.95, Math.PI);
    lamp(lv[w], 'roads/light-curved', 3.3, 9.85, Math.PI);
  }
  lv[4].add('sub/planter', 7.8, 9.95, 0);
  lv[4].add('nature/flower_purpleA', 7.6, 9.95, 0, 0.18);
  lv[4].add('nature/flower_yellowA', 8.0, 9.95, 0, 0.18);
  var pl = finishPlace('taxi', lv);
  pl.pick = addPick('taxi', 5.7, 10.4, 3.4, 1.6);
}

// the stockroom on the loading bay: the dollies the stockers push, and a stack of boxes on the bay for each level that
// loads them heavier. A new stocker shows by itself, with a puff, where it waits
function buildDock() {
  dollies = [0, 1, 2, 3, 4, 5].map(dollyGroup);
  shadows = new THREE.InstancedMesh(blobGeo, blobMat, 8);
  shadows.count = 0;
  shadows.frustumCulled = false;
  root.add(shadows);
  var lv = levels(10);
  [[3, -5.2], [6, -4.5], [9, -3.8]].forEach(function (p) {
    for (var i = 0; i < 6; i++) lv[p[0]].add(PARCEL, 10.7 + (i % 2 - 0.5) * 0.36, p[1] + (i % 3 - 1) * 0.1, (i % 3 - 1) * 0.15, (i >> 1) * 0.1);
  });
  var pl = finishPlace('dock', lv);
  pl.add = true;
  pl.pick = addPick('dock', 9.7, -3.3, 3.2, 6);
}

var puffMat = new THREE.MeshBasicMaterial({ color: 0xf2efe8, transparent: true, opacity: 0.8, depthWrite: false });

function dust(x0, x1, z0, z1, now, n) {
  for (var i = 0; i < n; i++) {
    var m = new THREE.Mesh(new THREE.SphereGeometry(0.08, 6, 5), puffMat.clone());
    var side = i % 4;
    var u = Math.random();
    var x = side < 2 ? x0 + (x1 - x0) * u : (side === 2 ? x0 : x1);
    var z = side < 2 ? (side === 0 ? z0 : z1) : z0 + (z1 - z0) * u;
    m.position.set(x, 0.06, z);
    root.add(m);
    puffs.push({ m: m, t0: now + Math.random() * 120, vx: (x - (x0 + x1) / 2) * 0.3, vz: (z - (z0 + z1) / 2) * 0.3 });
  }
}

function dustAt(g, now, n) {
  var b = new THREE.Box3().setFromObject(g);
  if (b.isEmpty()) return;
  dust(b.min.x, b.max.x, b.min.z, b.max.z, now, n || 8);
}

function puffsStep(now) {
  for (var i = puffs.length - 1; i >= 0; i--) {
    var p = puffs[i];
    var u = (now - p.t0) / 900;
    if (u < 0) continue;
    if (u >= 1) {
      root.remove(p.m);
      p.m.geometry.dispose();
      p.m.material.dispose();
      puffs.splice(i, 1);
      continue;
    }
    p.m.position.x += p.vx * 0.016;
    p.m.position.z += p.vz * 0.016;
    p.m.position.y = 0.06 + u * 0.3;
    p.m.scale.setScalar(0.6 + u * 1.8);
    p.m.material.opacity = 0.8 * (1 - u);
  }
}

// pieces and rows that appear grow up out of the floor
var rising = [];
function rise(g, now, len, s, pc) {
  g.visible = true;
  g.scale.y = 0.01;
  shadowDirty = true;
  if (pc) pc.rising = true;
  rising.push({ g: g, t0: now, len: len || 500, s: s, pc: pc });
}

function riseStep(now) {
  for (var i = rising.length - 1; i >= 0; i--) {
    var r = rising[i];
    var u = Math.min(1, (now - r.t0) / r.len);
    var e = 1 - Math.pow(1 - u, 3);
    r.g.scale.y = Math.max(0.01, e * (1 + 0.15 * Math.sin(u * Math.PI)));
    if (u >= 1) {
      r.g.scale.y = 1;
      rising.splice(i, 1);
      shadowDirty = true;
      cutaway();
      if (r.pc) {
        r.pc.rising = false;
        if (!r.s.items.some(function (pc) { return pc.rising; })) settle(r.s);
      }
    }
  }
}

function syncPlace(id, animate, now) {
  var pl = places[id];
  var l = S.pl[id];
  if (l === pl.shown) return;
  pl.items.forEach(function (it) {
    var want = it.only ? l === it.lv : it.lv <= l && (pl.add || it.lv === l);
    if (want && !it.g.visible && animate && pl.shown >= 0) {
      rise(it.g, now, 450);
      dustAt(it.g, now, pl.add ? 8 : 20);
    } else it.g.visible = want;
  });
  pl.shown = l;
  shadowDirty = true;
}

function sync(animate, now) {
  var nr = shownRows();
  rows.forEach(function (r) {
    var on = r.p < nr;
    if (on && !r.shown) {
      r.parts.forEach(function (g, i) {
        if (i === 3) return;
        if (animate) rise(g, now, 700);
        else g.visible = true;
      });
      if (animate) dust(-EDGE, EDGE, r.z0, r.z1, now, 30);
    }
    if (!on) r.parts.forEach(function (g) { g.visible = false; });
    r.shown = on;
    r.cap.visible = on && r.p === nr - 1;
    r.site.visible = r.p === nr;
    r.woods.visible = r.p > nr;
  });
  order.forEach(function (id) {
    var s = shops[id];
    var open = rows[s.p].shown;
    s.group.visible = open;
    s.pick.visible = open;
    if (open && !s.built) buildPieces(s);
    if (!s.built) return;
    var own = has(id);
    var n = own ? shape(id) : 0;
    if (n !== s.shown) {
      var grew = false;
      s.pieces.forEach(function (pc, i) {
        var want = i < n;
        if (pc.b) {
          if (want && !pc.on && animate && s.shown >= 0) {
            pc.on = true;
            pc.g = pc.b.group();
            s.group.add(pc.g);
            rise(pc.g, now, 450, s, pc);
            dustAt(pc.g, now);
            grew = true;
          } else pc.on = want;
          return;
        }
        if (!pc.g) return;
        if (want && !pc.g.visible && animate && s.shown >= 0) {
          rise(pc.g, now, 450);
          dustAt(pc.g, now);
        } else pc.g.visible = want;
      });
      if (!grew && !s.items.some(function (pc) { return pc.rising; })) settle(s);
      var glow = n > STEPS.indexOf('glow');
      var gold = n > STEPS.indexOf('gold');
      if (s.signMat && (s.glow !== glow || s.gold !== gold)) {
        if (s.gold !== gold) {
          s.signMat.map.dispose();
          s.signMat.map = signTex(BZ[id].name, gold);
        }
        s.signMat.emissive.set(glow ? 0x333333 : 0x000000);
        s.signMat.emissiveMap = glow ? s.signMat.map : null;
        s.signMat.needsUpdate = true;
        s.glow = glow;
        s.gold = gold;
      }
      if (animate && s.shown >= 0 && n > s.shown) truckFor();
      s.shown = n;
      shadowDirty = true;
    }
    s.vacant.visible = !own;
    var m = lv(id) >= MS[0][0];
    if (m !== s.clerk.f.obj.visible) {
      s.clerk.f.obj.visible = m;
      shadowDirty = true;
    }
  });
  PLACES.forEach(function (p) { syncPlace(p.id, animate, now); });
  ['lot', 'taxi', 'garden'].forEach(function (id) { places[id].pick.visible = has(PL[id].after); });
  paintPylon();
  var last = rowZ(nr) - DEPTH - 1;
  BOUNDS = [-13, 13, last, 15];
  fitShadow(last);
  cutaway();
}

// the sun's shadows cover the store from the street to its back row; past the edge of that box the shadow map
// smears, so the box grows with the store
var shadowTo = null;
function fitShadow(back) {
  if (shadowTo === back) return;
  shadowTo = back;
  var mid = (16 + back) / 2;
  var half = (16 - back) / 2 + 2;
  sun.target.position.set(0, 0, mid);
  sun.position.set(-12, 30, mid + 16);
  var sc = sun.shadow.camera;
  sc.top = half * 0.85;
  sc.bottom = -half * 0.85;
  sc.far = 60 + half * 2;
  sc.updateProjectionMatrix();
  shadowDirty = true;
}

function pop(now) {
  for (var id in bump) {
    var u = (now - bump[id]) / 650;
    var s = shops[id];
    if (!s) {
      delete bump[id];
      continue;
    }
    var k = u >= 1 ? 1 : 1 + 0.08 * Math.sin(u * Math.PI) * (1 - u);
    s.group.scale.set(k, k, k);
    s.group.position.set(s.cx * (1 - k), 0, s.cz * (1 - k));
    if (u >= 1) {
      delete bump[id];
      shadowDirty = true;
    }
  }
}

// Traffic. Cars run both ways along the street; a shopper's car turns into the lot from the east, parks in a free bay
// and leaves by the west exit once its driver is back. Taxis stop at the stand, the delivery van backs into the loading
// bay, and everything waits for people on the crossing and for the car in front
var blobGeo = new THREE.CircleGeometry(0.2, 16);
var blobMat = new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.18, depthWrite: false });
var carShadow = new THREE.PlaneGeometry(0.8, 1.3);

function vehicle(ref) {
  var g = mesh(ref, 0, 0, 0);
  g.traverse(function (o) { if (o.isMesh) o.castShadow = false; });
  var sh = new THREE.Mesh(carShadow, blobMat);
  sh.rotation.x = -Math.PI / 2;
  sh.position.y = 0.03;
  g.add(sh);
  root.add(g);
  return g;
}

function addCar(ref, path, kind, extra) {
  var o = vehicle(ref);
  o.position.set(path[0].x, 0, path[0].z);
  var c = { o: o, path: path, i: 1, kind: kind, speed: 0, wait: 0 };
  for (var k in extra) c[k] = extra[k];
  var q = path[1];
  o.rotation.y = Math.atan2(q.x - path[0].x, q.z - path[0].z);
  cars.push(c);
  return c;
}

function road(dir) {
  return dir > 0 ? [{ x: -62, z: LANE_E }, { x: 62, z: LANE_E }] : [{ x: 62, z: LANE_W }, { x: -62, z: LANE_W }];
}

var trafficT = 0;
var carT = 4;
var taxiT = 8;
var truckQ = 0;
var truckT = 25;

function truckFor() {
  truckQ = Math.min(2, truckQ + 1);
}

function freeBay() {
  var l = S.pl.lot;
  var free = bays.filter(function (b) { return b.lv <= l && !b.car; });
  if (!free.length) return null;
  free.sort(function (a, b) { return Math.abs(a.x) - Math.abs(b.x) + (Math.random() - 0.5) * 3; });
  return free[0];
}

function trafficStep(dt) {
  trafficT -= dt;
  carT -= dt;
  taxiT -= dt;
  truckT -= dt;
  var through = cars.filter(function (c) { return c.kind === 'pass'; }).length;
  if (trafficT <= 0 && through < 5) {
    var d = Math.random() < 0.5 ? 1 : -1;
    addCar(CARS[Math.floor(Math.random() * CARS.length)], road(d), 'pass', { lane: d });
    trafficT = 2 + Math.random() * 3;
  }
  if (carT <= 0 && carQ.length && !vanInDrive()) {
    var bay = freeBay();
    if (bay) {
      var p = [{ x: 62, z: LANE_W }, { x: DRIVE + 0.6, z: LANE_W, lane: -1 }, { x: DRIVE, z: 10.2 }, { x: DRIVE, z: AISLE + 0.4 }, { x: DRIVE - 0.6, z: AISLE },
        { x: bay.x + 0.6, z: AISLE }, { x: bay.x, z: AISLE + bay.nose * 0.6 }, { x: bay.x, z: bay.z, park: true }];
      bay.car = addCar(CARS[Math.floor(Math.random() * CARS.length)], p, 'shop', { bay: bay, lane: -1, cust: carQ.shift() });
    }
    carT = 1.2 + Math.random();
  }
  // with no bay free the driver parks down the street and walks over
  if (carQ.length && carQ[0].age > 15) onFoot(carQ.shift());
  if (taxiT <= 0 && taxiQ.length && cars.filter(function (c) { return c.kind === 'taxi'; }).length < 3) {
    addCar('car/taxi', [{ x: 62, z: LANE_W }, { x: 5.7, z: LANE_W, stop: 2.2, drop: taxiQ.splice(0, 2), lane: -1 }, { x: -62, z: LANE_W, lane: -1 }],
      'taxi', { lane: -1 });
    taxiT = 3;
  }
  if (taxiQ.length && taxiQ[0].age > 25) onFoot(taxiQ.shift());
  if (truckT <= 0) {
    truckFor();
    truckT = 60;
  }
  if (truckQ > 0 && !cars.some(function (c) { return c.kind === 'truck'; })) {
    truckQ--;
    addCar('car/delivery', [{ x: 62, z: LANE_W }, { x: DRIVE + 0.6, z: LANE_W, lane: -1 }, { x: DRIVE, z: 10.2 }, { x: DRIVE, z: 0.5, stop: 5, unload: true },
      { x: DRIVE, z: AISLE, rev: true }, { x: DRIVE - 0.8, z: AISLE }, { x: -DRIVE, z: AISLE }, { x: -DRIVE, z: 10.2 }, { x: -DRIVE - 0.6, z: LANE_W, lane: -1 },
      { x: -62, z: LANE_W, lane: -1 }], 'truck', { lane: 0 });
  }
  for (var i = cars.length - 1; i >= 0; i--) {
    var c = cars[i];
    if (carStep(c, dt)) {
      root.remove(c.o);
      cars.splice(i, 1);
    }
  }
}

function vanInDrive() {
  return cars.some(function (c) { return c.kind === 'truck' && c.i >= 3 && c.i <= 4; });
}

function blocked(c) {
  if (c.kind === 'shop' && c.i === 2 && vanInDrive()) return true;
  var o = c.o.position;
  var q = c.path[c.i];
  var dx = q.x - o.x;
  var dz = q.z - o.z;
  var d = Math.hypot(dx, dz) || 1;
  var fx = dx / d;
  var fz = dz / d;
  for (var i = 0; i < cars.length; i++) {
    var e = cars[i];
    if (e === c || e.parked || c.kind === 'truck') continue;
    var rx = e.o.position.x - o.x;
    var rz = e.o.position.z - o.z;
    var ahead = rx * fx + rz * fz;
    var side = Math.abs(rx * fz - rz * fx);
    if (ahead > 0.2 && ahead < 1.7 && side < 0.6) return true;
  }
  // people on the crossing or the walkway
  if (Math.abs(o.z - 12) < 2 && Math.abs(o.x) < 4.5 && o.x * fx < 0) {
    for (var j = 0; j < people.length; j++) {
      var p = people[j].f.obj.position;
      if (people[j].path && Math.abs(p.x) < 1.6 && p.z > 10.3 && p.z < 13.7) return true;
    }
  }
  if (Math.abs(o.z - AISLE) < 0.8 && Math.abs(o.x) < 3.4 && o.x * fx < 0) {
    for (var k = 0; k < people.length; k++) {
      var pp = people[k].f.obj.position;
      if (people[k].path && Math.abs(pp.x) < 1.5 && Math.abs(pp.z - AISLE) < 0.8) return true;
    }
  }
  return false;
}

function carStep(c, dt) {
  if (c.parked) return false;
  if (c.wait > 0) {
    c.wait -= dt;
    return false;
  }
  var o = c.o.position;
  var q = c.path[c.i];
  var dx = q.x - o.x;
  var dz = q.z - o.z;
  var d = Math.hypot(dx, dz);
  var onRoad = Math.abs(o.z - 12) < 1.6;
  var top = onRoad ? 3.2 : 1.5;
  var want = blocked(c) ? 0 : top;
  if (q.stop || q.park) want = Math.min(want, Math.max(0.35, d * 1.6));
  c.speed += Math.max(-6 * dt, Math.min(3 * dt, want - c.speed));
  var step = c.speed * dt;
  if (d > 0.001) {
    var head = Math.atan2(dx, dz) + (q.rev ? Math.PI : 0);
    var da = Math.atan2(Math.sin(head - c.o.rotation.y), Math.cos(head - c.o.rotation.y));
    c.o.rotation.y += da * Math.min(1, dt * (onRoad ? 6 : 4));
  }
  if (d <= Math.max(step, 0.02)) {
    o.x = q.x;
    o.z = q.z;
    c.i++;
    if (q.park) {
      c.parked = true;
      c.speed = 0;
      spawnFrom('car', c, 0, c.cust);
      return false;
    }
    if (q.stop) {
      c.wait = q.stop;
      c.speed = 0;
      if (q.drop) q.drop.forEach(function (r, n) { spawnFrom('taxi', c, n, r); });
      if (q.unload) shadowDirty = true;
    }
    return c.i >= c.path.length;
  }
  o.x += dx / d * step;
  o.z += dz / d * step;
  return false;
}

// the driver is back: reverse out of the bay and leave by the west exit
function leaveBay(c) {
  var b = c.bay;
  c.parked = false;
  c.path = [{ x: b.x, z: b.z }, { x: b.x, z: AISLE, rev: true }, { x: b.x - 0.6, z: AISLE }, { x: -DRIVE + 0.6, z: AISLE }, { x: -DRIVE, z: AISLE + 0.4 },
    { x: -DRIVE, z: 10.2 }, { x: -DRIVE - 0.6, z: LANE_W, lane: -1 }, { x: -62, z: LANE_W, lane: -1 }];
  c.i = 1;
  c.speed = 0;
  setTimeout(function () { if (b.car === c) b.car = null; }, 2500);
}

// Every shopper the sim lets in gets a figure when one is free. It comes by car, by taxi or on foot, takes a basket
// inside the doors, looks round one or two departments and goes to the line the sim gives it at the front aisle,
// and leaves with its bags the way it came. Cars and taxis wait here for a bay or a turn
var carQ = [];
var taxiQ = [];
var passT = 0;
var seed = 0;

function arrive(c) {
  if (!ready || speed !== 1) return;
  c.v = true;
  if (c.garden) gardenRoute(c);
  else if (c.by === 'car') carQ.push(c);
  else if (c.by === 'taxi') taxiQ.push(c);
  else onFoot(c);
}

function onFoot(c) {
  spawnFrom('walk', null, 0, c);
}

// a coin that jumps off the till when a shopper pays
var pops = [];
var coinGeo = new THREE.CylinderGeometry(0.08, 0.08, 0.03, 14);
var coinMat = new THREE.MeshLambertMaterial({ color: 0xffd23a, emissive: 0x6a4a00 });
var tillAt = 0;

function paid(till, now) {
  var m = new THREE.Mesh(coinGeo, coinMat);
  m.rotation.x = Math.PI / 2;
  m.position.set(till[0], till[1] + 0.1, till[2]);
  root.add(m);
  pops.push({ m: m, t0: now, y: till[1] + 0.1 });
  if (focus.dist < 30 && now - tillAt > 1500 && window.sfx) {
    tillAt = now;
    sfx('till');
  }
}

function popsStep(now) {
  for (var i = pops.length - 1; i >= 0; i--) {
    var p = pops[i];
    var u = (now - p.t0) / 900;
    if (u >= 1) {
      root.remove(p.m);
      pops.splice(i, 1);
      continue;
    }
    p.m.position.y = p.y + Math.sin(u * Math.PI * 0.8) * 0.55;
    p.m.rotation.z = u * 9;
    p.m.scale.setScalar(1 - u * u * 0.8);
  }
}

function carried(f, ref, y) {
  var m = mesh(ref, -0.26, 0.03, 0.3, y);
  m.traverse(function (o) { o.castShadow = false; });
  m.visible = false;
  f.obj.add(m);
  return m;
}

function person(i) {
  var f = figure(FOLK[i % FOLK.length], 'walk');
  var bag = carried(f, 'food/bag', 0.03);
  var basket = carried(f, 'shop/shopping-basket*0.62', 0.07);
  var plant = carried(f, 'furn/plantSmall2*1.6', 0.12);
  var blob = new THREE.Mesh(blobGeo, blobMat);
  blob.rotation.x = -Math.PI / 2;
  blob.position.y = 0.035;
  f.obj.add(blob);
  f.obj.traverse(function (o) { if (o.isMesh && o !== blob) o.castShadow = false; });
  f.obj.visible = false;
  root.add(f.obj);
  return { f: f, bag: bag, basket: basket, plant: plant, path: null, i: 0, wait: 0, speed: 1.05 + (i % 5) * 0.08 };
}

function busy(p) {
  return p.path || p.lane || p.hold;
}

function spare() {
  var n = 0;
  people.forEach(function (p) { if (busy(p)) n++; });
  return 64 - n;
}

function idlePerson() {
  for (var i = 0; i < people.length; i++) if (!busy(people[i])) return people[i];
  if (people.length >= 64) return null;
  var p = person(people.length * 7 + 3);
  people.push(p);
  return p;
}

function pickShop(not) {
  var open = order.filter(function (id) { return id !== not && has(id) && shops[id].items.some(function (pc) { return pc.on && pc.spots.length; }) && rows[shops[id].p].shown; });
  if (!open.length) return null;
  var tot = 0;
  var w = open.map(function (id) {
    var v = Math.sqrt(lv(id)) + 1;
    tot += v;
    return v;
  });
  var r = Math.random() * tot;
  for (var i = 0; i < open.length; i++) {
    r -= w[i];
    if (r <= 0) return shops[open[i]];
  }
  return shops[open[open.length - 1]];
}

// the main aisle is walked north on its west half and south on its east half
var IN_X = -0.45;
var OUT_X = 0.45;

function world(s, q) {
  var w = toWorld(s, q[0], q[1]);
  return { x: w[0], z: w[1] };
}

// into a department to one of its fixtures, a look at the goods, and back out to the main aisle
function visit(s, pts, jx) {
  var shown = s.items.filter(function (pc) { return pc.on && pc.spots.length; });
  var pc = shown[Math.floor(Math.random() * shown.length)];
  var sp = pc.spots[Math.floor(Math.random() * pc.spots.length)];
  var r = route(s, sp.at);
  var last = pts[pts.length - 1];
  var lane = (last && world(s, r[0]).z < last.z ? IN_X : OUT_X) + jx;
  var w = r.map(function (q) { return world(s, q); });
  pts.push({ x: lane, z: w[0].z });
  for (var i = 0; i < w.length; i++) pts.push({ x: w[i].x, z: w[i].z });
  var stand = pts[pts.length - 1];
  stand.wait = 1.6 + Math.random();
  stand.act = 'pick-up';
  stand.face = faceRot(s, sp.f) + Math.PI;
  for (var j = w.length - 2; j >= 0; j--) pts.push({ x: w[j].x, z: w[j].z });
  pts.push({ x: lane, z: w[0].z });
}

// the walk from the doors round the store and down to the front aisle, where the shopper picks a checkout
function storeRoute(pts) {
  var jx = (Math.random() - 0.5) * 0.3;
  var s = pickShop();
  pts.push({ x: -0.5 + jx, z: FRONT + 0.4 }, { x: -0.5 + jx, z: BASKETS[1] });
  pts.push({ x: BASKETS[0] + 0.45, z: BASKETS[1], wait: 0.7, act: 'pick-up', face: -Math.PI / 2, basket: true });
  pts.push({ x: IN_X + jx, z: BASKETS[1] - 0.3 });
  visit(s, pts, jx);
  if (Math.random() < 0.4) {
    var t = pickShop(s.id);
    if (t) visit(t, pts, jx);
  }
  pts.push({ x: OUT_X + jx, z: CROSS, pick: true });
  return pts;
}

function start(p, pts, extra) {
  p.path = pts;
  p.i = 1;
  p.wait = 0;
  p.car = null;
  p.lane = null;
  p.hold = false;
  p.cust = null;
  p.after = null;
  for (var k in extra) p[k] = extra[k];
  p.f.obj.position.set(pts[0].x, 0, pts[0].z);
  p.f.obj.visible = true;
  p.bag.visible = false;
  p.basket.visible = false;
  p.plant.visible = false;
  act(p.f, 'walk', 0);
}

// where a shopper who has paid walks out: down the lane or past the kiosk to the front, along it to the doors
function leave(p, x, z, exitZ) {
  var out = [{ x: x, z: z }, { x: x, z: exitZ }, { x: 0.55, z: exitZ }, { x: 0.55, z: FRONT + 0.4 }];
  p.path = out.concat(p.after);
  p.i = 1;
  act(p.f, 'walk', 0.2);
}

// at the front aisle the sim sends the shopper to a line; while every line is full it steps out of the aisle and waits
function front(p) {
  var c = p.cust;
  var o = p.f.obj.position;
  if (c.lost) return giveUp(p);
  if (c.done) return outWith(p);
  p.path = [{ x: o.x, z: o.z }, c.garden ? { x: o.x, z: o.z, stop: true, face: Math.PI / 2 } : { x: o.x, z: CROSS - 0.45, stop: true, face: 0 }];
  p.i = 1;
  if (c.at) toTill(p);
  else atFront(c);
}

function toTill(p) {
  var c = p.cust;
  var t = places.hall.tills[c.at.i];
  var o = p.f.obj.position;
  p.hold = false;
  p.path = null;
  if (t.k !== 'self') {
    p.lane = t;
    if (p.f.cur !== p.f.acts.walk) act(p.f, 'walk', 0.2);
    return;
  }
  p.path = [{ x: o.x, z: o.z }, { x: t.x, z: CROSS }, { x: t.x, z: t.z, stop: true, here: true, face: -Math.PI / 2, act: 'pick-up' }];
  p.i = 1;
  act(p.f, 'walk', 0.2);
}

// a line: the one at the front pays, the rest stand behind and step up when it moves. A lane is reached along the
// front aisle and then down its west side
function queueStep(p, dt) {
  var t = p.lane;
  var c = p.cust;
  var o = p.f.obj.position;
  var slot = Math.max(0, c.at ? c.at.q.indexOf(c) : 0);
  var at = t.spot(slot);
  var tx = at[0];
  var tz = at[1];
  if (t.k === 'lane' && Math.abs(o.x - tx) > 0.01 && o.z < CROSS + 0.05) tz = CROSS;
  var dx = tx - o.x;
  var dz = tz - o.z;
  var d = Math.hypot(dx, dz);
  if (d > 0.01) {
    var step = Math.min(d, p.speed * dt);
    o.x += dx / d * step;
    o.z += dz / d * step;
    var want = Math.atan2(dx, dz);
    p.f.obj.rotation.y += Math.atan2(Math.sin(want - p.f.obj.rotation.y), Math.cos(want - p.f.obj.rotation.y)) * Math.min(1, dt * 10);
    if (p.f.cur !== p.f.acts.walk) act(p.f, 'walk', 0.2);
    return;
  }
  if (p.f.cur !== p.f.acts.idle) act(p.f, 'idle', 0.2);
  p.f.obj.rotation.y = at[2];
  if (slot === 0 && !c.here) {
    c.here = true;
    act(t.cashier, 'pick-up', 0.2);
  }
}

// paid: a bag instead of the basket (a garden shopper keeps its plant), and out the way it came
function done(p, t) {
  var o = p.f.obj.position;
  p.lane = null;
  p.hold = false;
  p.i = 1;
  if (t.k === 'garden') {
    act(t.cashier, 'idle', 0.3);
    p.path = [{ x: o.x, z: o.z }].concat(p.after);
    act(p.f, 'walk', 0.2);
    return;
  }
  p.basket.visible = false;
  p.bag.visible = true;
  if (t.k === 'lane') {
    act(t.cashier, 'idle', 0.3);
    leave(p, o.x, o.z, EXIT);
  } else {
    p.path = [{ x: o.x, z: o.z }, { x: t.x, z: EXIT }, { x: 0.55, z: EXIT }, { x: 0.55, z: FRONT + 0.4 }].concat(p.after);
    act(p.f, 'walk', 0.2);
  }
}

// paid while nobody watched it (at a test speed): straight out with the bag
function outWith(p) {
  var o = p.f.obj.position;
  p.basket.visible = false;
  p.bag.visible = !p.cust.garden;
  leave(p, o.x, o.z, EXIT);
  if (p.cust.garden) p.path = [{ x: o.x, z: o.z }].concat(p.after);
}

// the lines stayed full: the basket goes back on the stack inside the doors and the shopper leaves without buying
function giveUp(p) {
  var o = p.f.obj.position;
  p.hold = false;
  p.lane = null;
  p.i = 1;
  say(p, 'Lines too long!');
  if (p.cust.garden) {
    p.plant.visible = false;
    p.path = [{ x: o.x, z: o.z }].concat(p.after);
  } else {
    p.path = [{ x: o.x, z: o.z }, { x: OUT_X, z: o.z }, { x: OUT_X, z: EXIT }, { x: BASKETS[0] + 0.45, z: BASKETS[1] + 0.1, wait: 0.7, act: 'pick-up', face: -Math.PI / 2, drop: true },
      { x: 0.55, z: BASKETS[1] + 0.1 }, { x: 0.55, z: FRONT + 0.4 }].concat(p.after);
  }
  act(p.f, 'walk', 0.2);
}

// what the sim tells the view about its shoppers; for a payment it returns where on screen the till is, if it shows
function shopperEvent(ev, c, t) {
  if (ev === 'in') return arrive(c);
  var p = c.p;
  if (!p || p.cust !== c) return null;
  if (ev === 'till') toTill(p);
  else if (ev === 'lost') giveUp(p);
  else if (ev === 'paid') {
    var tt = places.hall.tills[t.i];
    done(p, tt);
    paid(tt.till, performance.now());
    toScreen(tt.till[0], tt.till[1] + 0.45, tt.till[2], sp);
    if (focus.dist < 45 && sp.z < 1 && sp.x > 20 && sp.x < cw - 20 && sp.y > IT + 20 && sp.y < ch - IB) return { x: sp.x, y: sp.y };
  }
  return null;
}

// a few words over a shopper's head
var says = [];

function say(p, text) {
  if (says.length > 2) return;
  var el = document.createElement('div');
  el.className = 'say';
  el.textContent = text;
  tagsEl.appendChild(el);
  says.push({ p: p, el: el, t0: performance.now() });
}

function saysStep(now) {
  for (var i = says.length - 1; i >= 0; i--) {
    var w = says[i];
    var u = (now - w.t0) / 2200;
    var o = w.p.f.obj.position;
    toScreen(o.x, 1.7, o.z, sp);
    if (u >= 1 || !w.p.f.obj.visible || sp.z > 1) {
      w.el.remove();
      says.splice(i, 1);
      continue;
    }
    w.el.style.transform = 'translate(' + Math.round(sp.x) + 'px,' + Math.round(sp.y - u * 12) + 'px) translate(-50%,-100%)';
    w.el.style.opacity = u > 0.8 ? ((1 - u) * 5).toFixed(2) : '1';
  }
}

function spawnFrom(kind, c, n, cu) {
  // with every figure in use the shopper does not come in: nobody unseen stands in a line
  var p = pickShop() && idlePerson();
  if (!p) {
    if (kind === 'car') leaveBay(c);
    gone(cu);
    return false;
  }
  var pts = [];
  var back = [];
  if (kind === 'car') {
    var b = c.bay;
    var ex = b.x + 0.5;
    pts.push({ x: ex, z: b.z }, { x: ex, z: AISLE }, { x: Math.sign(b.x) * 1.0, z: AISLE }, { x: Math.sign(b.x) * 0.7, z: LOT[0] - 0.2 });
    back = [{ x: 0.7, z: LOT[0] - 0.2 }, { x: Math.sign(b.x) * 1.0, z: AISLE }, { x: ex, z: AISLE }, { x: ex, z: b.z }];
  } else if (kind === 'taxi') {
    var tx = 5.4 + n * 0.5;
    pts.push({ x: tx, z: 10.9 }, { x: tx, z: WALK_N }, { x: 0.9, z: WALK_N }, { x: 0.7, z: LOT[0] - 0.2 });
    back = [{ x: 0.7, z: LOT[0] - 0.2 }, { x: 0.9, z: WALK_N }, { x: 16 + Math.random() * 4, z: WALK_N }];
  } else {
    var sd = Math.random() < 0.5 ? -1 : 1;
    var south = Math.random() < 0.4;
    var wz = south ? WALK_S : WALK_N;
    pts.push({ x: sd * (15 + Math.random() * 4), z: wz }, { x: sd * 0.6, z: wz });
    if (south) pts.push({ x: sd * 0.6, z: WALK_N });
    pts.push({ x: -0.6, z: LOT[0] - 0.2 });
    back = [{ x: 0.6, z: LOT[0] - 0.2 }, { x: sd * 0.6, z: WALK_N }];
    if (south) back.push({ x: sd * 0.6, z: WALK_S });
    back.push({ x: sd * (16 + Math.random() * 4), z: wz });
  }
  storeRoute(pts);
  start(p, pts, { car: kind === 'car' ? c : null, cust: cu });
  cu.p = p;
  p.after = back;
  // the store opens with a few shoppers already inside: one past the baskets, one in a department, one on its way to pay
  if (seed > 0) {
    seed--;
    var k = 0;
    while (!pts[k].basket) k++;
    k = [pts.length - 2, Math.round((k + pts.length - 2) / 2), k][seed];
    p.i = k + 1;
    p.f.obj.position.set(pts[k].x, 0, pts[k].z);
    p.basket.visible = true;
  }
  return true;
}

// A garden visitor only wants a plant: along the sidewalk, up the grass west of the lot (clear of the cars' exit),
// in through the gate to a flower display, and out again to pay at the garden's till by the gate
function gardenRoute(c) {
  var p = idlePerson();
  if (!p) {
    gone(c);
    return;
  }
  var sd = Math.random() < 0.5 ? -1 : 1;
  var gx = GATE_X;
  var rows = [2.0, 0.6, -0.8].slice(0, Math.min(3, S.pl.garden));
  var z = rows[Math.floor(Math.random() * rows.length)];
  var west = Math.random() < 0.5;
  var ex = sd * (16 + Math.random() * 4) - 2;
  var pts = [{ x: ex, z: WALK_N }, { x: -11.6, z: WALK_N }, { x: -11.6, z: LOT[0] + 0.3 }, { x: gx, z: LOT[0] - 0.1 }, { x: gx, z: z + 0.7 },
    { x: gx, z: z, wait: 1.8, act: 'pick-up', face: west ? -Math.PI / 2 : Math.PI / 2, plant: true }, { x: gx, z: GARDEN[3] + 0.45, pick: true }];
  start(p, pts, { cust: c });
  c.p = p;
  p.after = [{ x: gx, z: LOT[0] - 0.1 }, { x: -11.6, z: LOT[0] + 0.3 }, { x: -11.6, z: WALK_N }, { x: ex, z: WALK_N }];
}

function crowdStep(dt) {
  passT -= dt;
  if (passT <= 0) {
    var p = spare() > 8 && idlePerson();
    if (p) {
      var sd = Math.random() < 0.5 ? -1 : 1;
      var wz = Math.random() < 0.5 ? WALK_N : WALK_S;
      start(p, [{ x: sd * 60, z: wz + (Math.random() - 0.5) * 0.3 }, { x: -sd * 60, z: wz }]);
    }
    passT = 3 + Math.random() * 3;
  }
  people.forEach(function (p) {
    if (p.lane) {
      if (p.f.mixer) p.f.mixer.update(dt);
      queueStep(p, dt);
      return;
    }
    if (p.hold) {
      if (p.f.mixer) p.f.mixer.update(dt);
      return;
    }
    if (!p.path) return;
    var o = p.f.obj;
    var far = Math.abs(o.position.x) > 26;
    if (p.f.mixer && !far) p.f.mixer.update(dt);
    if (p.wait > 0) {
      p.wait -= dt;
      if (p.wait <= 0) act(p.f, 'walk', 0.2);
      return;
    }
    var q = p.path[p.i];
    var dx = q.x - o.position.x;
    var dz = q.z - o.position.z;
    var d = Math.hypot(dx, dz);
    var step = p.speed * dt * (far ? 2.5 : 1);
    if (d > 0.001) {
      var want = Math.atan2(dx, dz);
      var da = Math.atan2(Math.sin(want - o.rotation.y), Math.cos(want - o.rotation.y));
      o.rotation.y += da * Math.min(1, dt * 10);
    }
    if (d > step) {
      o.position.x += dx / d * step;
      o.position.z += dz / d * step;
      return;
    }
    o.position.x = q.x;
    o.position.z = q.z;
    p.i++;
    if (q.wait) {
      p.wait = q.wait;
      if (q.face !== undefined) o.rotation.y = q.face;
      act(p.f, q.act || 'idle', 0.2);
    }
    if (q.basket) p.basket.visible = true;
    if (q.drop) p.basket.visible = false;
    if (q.plant) p.plant.visible = true;
    if (q.pick) {
      front(p);
      return;
    }
    // standing at a self checkout, or out of the aisle waiting for room in a line
    if (q.stop) {
      p.path = null;
      p.hold = true;
      o.rotation.y = q.face;
      act(p.f, q.act || 'idle', 0.2);
      if (q.here) p.cust.here = true;
      return;
    }
    if (p.i >= p.path.length) {
      p.path = null;
      p.cust = null;
      o.visible = false;
      if (p.car) leaveBay(p.car);
    }
  });
}

// an associate walks the department, stopping at a fixture now and then to fill its shelves
function staffStep(s, h, dt) {
  if (h.f.mixer) h.f.mixer.update(dt);
  var o = h.f.obj;
  if (!h.path) {
    var shown = s.items.filter(function (pc) { return pc.on && pc.spots.length; });
    if (!shown.length) return;
    var pc = shown[Math.floor(Math.random() * shown.length)];
    var sp = pc.spots[Math.floor(Math.random() * pc.spots.length)];
    var r = route(s, sp.at).map(function (q) { return world(s, q); });
    // back out the way it came in, along the main aisle and in to the next fixture
    var pts = [{ x: o.position.x, z: o.position.z }].concat(h.ret || []);
    r.forEach(function (q) { pts.push({ x: q.x, z: q.z }); });
    pts[pts.length - 1].wait = 2.5;
    pts[pts.length - 1].face = faceRot(s, sp.f) + Math.PI;
    h.ret = r.slice(0, -1).reverse();
    h.path = pts;
    h.i = 1;
    act(h.f, 'walk', 0.2);
  }
  if (h.wait > 0) {
    h.wait -= dt;
    if (h.wait <= 0) h.path = null;
    return;
  }
  var q = h.path[h.i];
  var dx = q.x - o.position.x;
  var dz = q.z - o.position.z;
  var d = Math.hypot(dx, dz);
  var step = 0.9 * dt;
  if (d > 0.001) o.rotation.y = Math.atan2(dx, dz);
  if (d > step) {
    o.position.x += dx / d * step;
    o.position.z += dz / d * step;
    return;
  }
  o.position.x = q.x;
  o.position.z = q.z;
  h.i++;
  if (q.wait) {
    h.wait = q.wait;
    o.rotation.y = q.face;
    act(h.f, 'pick-up', 0.2);
  } else if (h.i >= h.path.length) h.path = null;
}

// The stock door is in the east wall of the front, and the stockers come out of it from the loading bay. A stocker's
// place on its trip comes from the sim's clock for it, so the walk takes as long as the sim says at any speed
var DOORZ = -1.95;
var STRIP_Z = -2.38;
var AISLE_X = 1.0;
var GATE = { x: EDGE + 1.0, z: DOORZ };
var STAFF = 'shop/character-employee@5,3>4,2';
// where the stockers wait on the bay: a line facing west, the dolly in front. They walk west to the lane at LANE_X
// and along it to the gate
var LANE_X = 9.25;
var STAND = [-0.9, -1.45, -2.0, -2.55, -3.1, -3.65, -4.2, -4.75].map(function (z) {
  return { x: 10.15, z: z, face: -Math.PI / 2 };
});
// where the dolly stands beside a stocker working a shelf, in his own frame, in the order tried
var PARK = [[0.5, 0.02], [-0.5, 0.02], [0, -0.45], [0.45, -0.3], [-0.45, -0.3]];
var DOOR_C = 0x8d93a6;
var LEAF_C = 0xe0823d;
var stockers = [];
var dollies = [];
var stockN = -1;
// the stockers' ground shadows are one instanced mesh, to keep the draw calls down
var shadows;
var blobAt = new THREE.Matrix4();
var sdoor = { open: 0, leaf: null };

function doorFrame(w) {
  var c = flat(DOOR_C);
  w.slab(c, EDGE - 0.3, EDGE + 0.3, -2.5, DOORZ - 0.3, 1, 1);
  w.slab(c, EDGE - 0.3, EDGE + 0.3, DOORZ + 0.3, -1.5, 1, 1);
  w.slab(c, EDGE - 0.3, EDGE + 0.3, DOORZ - 0.3, DOORZ + 0.3, 1, 0.12);
}

// one leaf hinged at the south jamb on the outer face, swinging out onto the bay. It hangs off the wall's group, so
// it drops with the wall when the camera looks at that wall from outside
function doorLeaf(wg) {
  var g = new THREE.Group();
  g.position.set(EDGE + 0.2, 0, DOORZ + 0.3);
  var m = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.86, 0.6), flat(LEAF_C));
  m.position.set(0, 0.43, -0.3);
  m.castShadow = true;
  g.add(m);
  wg.add(g);
  sdoor.leaf = g;
}

function stockDoorStep(dt, near) {
  var want = near ? 1 : 0;
  if (want === sdoor.open) return;
  sdoor.open = want > sdoor.open ? Math.min(1, sdoor.open + dt * 3) : Math.max(0, sdoor.open - dt * 1.2);
  var e = sdoor.open * sdoor.open * (3 - 2 * sdoor.open);
  sdoor.leaf.rotation.y = -e * 1.6;
  // the shadow map is redrawn once the leaf stops, not on every frame of the swing
  if (sdoor.open === 0 || sdoor.open === 1) shadowDirty = true;
}

// a dolly with n boxes stacked on it, drawn as one mesh
function dollyGroup(n) {
  var b = new Batch();
  b.add('shop/hand-truck', 0, 0, 0);
  for (var i = 0; i < n; i++) b.add(PARCEL, 0, 0, 0, 0.07 + i * 0.1);
  return b.group(false);
}

function newStocker(i) {
  var f = figure(STAFF, 'idle');
  var hold = new THREE.Group();
  var rig = dollies.map(function (g) {
    var c = g.clone();
    c.visible = false;
    hold.add(c);
    return c;
  });
  f.obj.add(hold);
  f.obj.visible = false;
  root.add(f.obj);
  return { f: f, hold: hold, rig: rig, n: -1, i: i, id: null, t: 0, park: PARK[0], shown: false };
}

// the way out for one trip: bay, stock door, along the front strip, up the main aisle and into the department to a
// fixture. The stocker picks the fixture once and keeps it until the trip ends
function plan(k, w) {
  var s = shops[w.id];
  var shown = s.items.filter(function (pc) { return pc.on && pc.spots.length; });
  var sp = { at: [3.2, s.cfg.aisles[0]], f: 'k' };
  var r;
  // a fixture with room for the dolly beside it, when there is one among the first few picks
  for (var tries = 0; tries < 8; tries++) {
    if (shown.length) {
      var pc = shown[Math.floor(Math.random() * shown.length)];
      sp = pc.spots[Math.floor(Math.random() * pc.spots.length)];
    }
    r = route(s, sp.at).map(function (q) { return world(s, q); });
    k.face = faceRot(s, sp.f) + Math.PI;
    if (parkAt(k, s, r[r.length - 1])) break;
  }
  var h = STAND[k.i];
  var raw = [h, { x: LANE_X, z: h.z }, { x: LANE_X, z: DOORZ }, GATE, { x: EDGE - 0.6, z: DOORZ }, { x: 6.4, z: STRIP_Z }, { x: AISLE_X, z: STRIP_Z }, { x: AISLE_X, z: r[0].z }].concat(r);
  var pts = [raw[0]];
  var cum = [0];
  raw.forEach(function (q, j) {
    var a = pts[pts.length - 1];
    var d = Math.hypot(q.x - a.x, q.z - a.z);
    if (j && d > 0.01) {
      pts.push(q);
      cum.push(cum[cum.length - 1] + d);
    }
  });
  k.pts = pts;
  k.cum = cum;
}

// the first of PARK that clears the department's fixtures for a stocker standing at `end`; sets k.park, and says
// whether there was one
function parkAt(k, s, end) {
  var cs = Math.cos(k.face);
  var sn = Math.sin(k.face);
  k.park = PARK[0];
  return PARK.some(function (q) {
    var dx = end.x + q[0] * cs + q[1] * sn;
    var dz = end.z - q[0] * sn + q[1] * cs;
    var clear = s.items.every(function (o) {
      if (!o.on) return true;
      var xs = [s.cx + s.sg * o.foot[0], s.cx + s.sg * o.foot[1]];
      return dx + 0.2 < Math.min(xs[0], xs[1]) || dx - 0.2 > Math.max(xs[0], xs[1]) || dz + 0.2 < s.cz + o.foot[2] || dz - 0.2 > s.cz + o.foot[3];
    });
    if (clear) k.park = q;
    return clear;
  });
}

// where on the path, and which way it runs there
function along(k, d) {
  var c = k.cum;
  var i = 1;
  while (i < c.length - 1 && c[i] < d) i++;
  var a = k.pts[i - 1];
  var b = k.pts[i];
  var u = Math.max(0, Math.min(1, (d - c[i - 1]) / ((c[i] - c[i - 1]) || 1)));
  k.x = a.x + (b.x - a.x) * u;
  k.z = a.z + (b.z - a.z) * u;
  k.dx = b.x - a.x;
  k.dz = b.z - a.z;
}

// a box set down on a shelf, heard when that stocker is on screen and the camera is close
var thudAt = 0;
function thud(p) {
  var now = performance.now();
  if (focus.dist > 30 || now - thudAt < 1500 || !window.sfx) return;
  toScreen(p.x, 0.8, p.z, sp);
  if (sp.z > 1 || sp.x < 0 || sp.x > cw || sp.y < IT || sp.y > ch - IB) return;
  thudAt = now;
  sfx('stock');
}

function stockerStep(k, w, dt) {
  var o = k.f.obj;
  if (w.id && (k.id !== w.id || w.t < k.t)) plan(k, w);
  k.id = w.id;
  k.t = w.t;
  var home = STAND[k.i];
  var head = home.face;
  var x = home.x;
  var z = home.z;
  var boxes = crewAt()[1];
  var park = 0;
  var clip = 'idle';
  var rate = 1;
  var shelving = false;
  var back = w.T - w.out - SHELVE;
  if (w.id) {
    if (w.t < w.out) {
      along(k, k.cum[k.cum.length - 1] * w.t / w.out);
      head = Math.atan2(k.dx, k.dz);
      park = Math.max(0, 1 - (w.out - w.t) / 0.8);
      clip = 'walk';
      rate = k.cum[k.cum.length - 1] / w.out;
    } else if (w.t < w.out + SHELVE) {
      along(k, k.cum[k.cum.length - 1]);
      head = k.face;
      park = 1;
      clip = 'pick-up';
      shelving = true;
      boxes = Math.ceil(boxes * (1 - (w.t - w.out) / SHELVE));
    } else {
      along(k, k.cum[k.cum.length - 1] * (1 - (w.t - w.out - SHELVE) / back));
      head = Math.atan2(-k.dx, -k.dz);
      park = Math.max(0, 1 - (w.t - w.out - SHELVE) / 0.8);
      clip = 'walk';
      boxes = 0;
      rate = k.cum[k.cum.length - 1] / back;
    }
    x = k.x;
    z = k.z;
  }
  o.position.set(x, 0, z);
  if (shelving && !k.sh) thud(o.position);
  k.sh = shelving;
  if (!k.shown) {
    k.shown = true;
    o.rotation.y = head;
  }
  o.rotation.y += Math.atan2(Math.sin(head - o.rotation.y), Math.cos(head - o.rotation.y)) * Math.min(1, dt * 8);
  var e = park * park * (3 - 2 * park);
  k.hold.position.set(k.park[0] * e, 0, 0.42 * (1 - e) + k.park[1] * e);
  if (boxes !== k.n) {
    k.n = boxes;
    k.rig.forEach(function (g, j) { g.visible = j === boxes; });
  }
  act(k.f, clip, 0.2);
  if (k.f.mixer) k.f.mixer.update(dt * (clip === 'walk' ? Math.max(0.6, Math.min(2.2, rate / 1.1)) : 1));
}

function crewStep(dt, now) {
  var live = window.crew;
  var n = live.length;
  if (stockN >= 1 && n > stockN) {
    for (var j = stockN; j < n; j++) dust(STAND[j].x - 0.3, STAND[j].x + 0.3, STAND[j].z - 0.3, STAND[j].z + 0.3, now, 10);
  }
  stockN = n;
  var near = false;
  for (var i = 0; i < Math.max(n, stockers.length); i++) {
    var k = stockers[i];
    if (i >= n) {
      if (k) {
        k.f.obj.visible = false;
        k.shown = false;
        k.id = null;
      }
      continue;
    }
    if (!k) k = stockers[i] = newStocker(i);
    k.f.obj.visible = true;
    stockerStep(k, live[i], dt);
    var p = k.f.obj.position;
    if (Math.hypot(p.x - EDGE, p.z - DOORZ) < 1.1) near = true;
    blobAt.makeRotationX(-Math.PI / 2).setPosition(p.x, 0.035, p.z);
    shadows.setMatrixAt(i, blobAt);
  }
  shadows.count = n;
  shadows.instanceMatrix.needsUpdate = true;
  stockDoorStep(dt, near);
}

function resetCrowd() {
  stockN = -1;
  people.forEach(function (p) {
    p.path = null;
    p.lane = null;
    p.hold = false;
    p.cust = null;
    p.f.obj.visible = false;
  });
  carQ = [];
  taxiQ = [];
  says.forEach(function (w) { w.el.remove(); });
  says = [];
  cars.forEach(function (c) { root.remove(c.o); });
  cars = [];
  bays.forEach(function (b) { b.car = null; });
  truckQ = 0;
}

function tagIds() {
  return order.concat(PLACES.map(function (p) { return p.id; }));
}

function makeTags() {
  tagsEl = document.getElementById('tags');
  tagIds().forEach(function (id) {
    var el = document.createElement('div');
    el.className = 'tag';
    el.innerHTML = '<b></b><i><u></u></i>';
    el.addEventListener('click', function () { onTap({ kind: 'biz', id: id }); });
    tagsEl.appendChild(el);
    var t = { el: el, text: '', x: 0, y: 0, line: el.firstChild, bar: el.querySelector('u'), cls: '' };
    (shops[id] || places[id]).tag = t;
  });
  arrowEl = document.createElement('div');
  arrowEl.id = 'arrow';
  arrowEl.innerHTML = '<svg viewBox="0 0 24 30"><path d="M12 29 L2 14 H8 V2 H16 V14 H22 Z"/></svg>';
  arrowEl.hidden = true;
  tagsEl.appendChild(arrowEl);
}

function bstate(id) {
  var p = PL[id];
  if (p) {
    var busy = id === 'hall' ? Math.min(1, inRate() / capacity()) : id === 'dock' ? Math.min(1, served() / stockCap()) : 0;
    var out = id === 'hall' ? linesFull() : id === 'dock' && shelvesOut();
    return { name: p.name, lv: S.pl[id], own: S.pl[id] > 0 || !!p.open, price: placeCost(id), avail: has(p.after), frac: busy, alert: out,
      said: id === 'dock' ? 'Shelves empty!' : 'Lines full!' };
  }
  var e = S.b[id];
  var l = e ? e.l : 0;
  var m = nextMs(l);
  var from = m && m.i ? MS[m.i - 1][0] : 0;
  return { name: BZ[id].name, lv: l, own: !!e, price: cost(id, 1), avail: avail(id), frac: !e ? 0 : m ? (l - from) / (m.lv - from) : 1,
    alert: !!e && window.fill[id] <= 0, said: 'Sold out' };
}

function toScreen(x, y, z, out) {
  proj.set(x, y, z).project(cam);
  out.x = (proj.x + 1) / 2 * cw;
  out.y = (1 - proj.y) / 2 * ch;
  out.z = proj.z;
  return out;
}

var sp = { x: 0, y: 0, z: 0 };
var anchorXY = {};

function anchor(id) {
  if (id === 'hall') return [-4.2, 1.3, -0.6];
  if (id === 'lot') return [-6, 0.8, (LOT[0] + LOT[1]) / 2];
  if (id === 'taxi') return [5.7, 1.2, 10.2];
  if (id === 'dock') return [6.2, 1.0, -1.0];
  if (id === 'garden') return [(GARDEN[0] + GARDEN[1]) / 2, 1.0, (GARDEN[2] + GARDEN[3]) / 2];
  var s = shops[id];
  var c = toWorld(s, 0, -0.3);
  return [c[0], 1.0, c[1]];
}

function overlay(now) {
  tagIds().forEach(function (id) {
    var s = shops[id] || places[id];
    var t = s.tag;
    var st = bstate(id);
    var a = anchor(id);
    toScreen(a[0], a[1], a[2], sp);
    var open = PL[id] ? st.own || st.avail : rows[s.p].shown;
    var vis = open && sp.z < 1 && sp.x > -60 && sp.x < cw + 60 && sp.y > IT + 34 && sp.y < ch - IB;
    if (open && sp.z < 1) anchorXY[id] = { x: sp.x, y: sp.y, top: sp.y };
    else delete anchorXY[id];
    var show = vis && (st.own || st.avail || focus.dist < 40);
    if (t.shown !== show) {
      t.shown = show;
      t.el.style.display = show ? '' : 'none';
    }
    if (show) {
      var line = st.alert ? st.name + '  ' + st.said : st.own ? (st.lv ? st.name + '  Lv ' + st.lv : st.name) : st.avail ? st.name + '  $' + short(st.price) : st.name + '  locked';
      if (line !== t.text) {
        t.text = line;
        t.line.textContent = line;
        t.h = t.el.offsetHeight;
      }
      var cls = 'tag' + (st.own ? ' own' : st.avail ? ' buy' : ' lock') + (!st.own && st.avail && S.cash >= st.price ? ' ready' : '') + (st.alert ? ' alert' : '');
      if (cls !== t.cls) {
        t.cls = cls;
        t.el.className = cls;
      }
      var fw = st.own ? (st.frac * 100).toFixed(1) + '%' : '';
      if (fw !== t.fw) {
        t.fw = fw;
        t.bar.style.width = fw;
      }
      var full = st.frac >= 1 ? 'full' : '';
      if (full !== t.full) {
        t.full = full;
        t.bar.className = full;
      }
      var sc = Math.max(0.6, Math.min(1.1, 30 / focus.dist + 0.12));
      var tx = Math.round(sp.x);
      var ty = Math.round(sp.y);
      if (tx !== t.x || ty !== t.y || sc !== t.sc) {
        t.x = tx;
        t.y = ty;
        t.sc = sc;
        t.el.style.transform = 'translate(' + tx + 'px,' + ty + 'px) translate(-50%,-100%) scale(' + sc + ')';
      }
      anchorXY[id].top = ty - (t.h || 24) * sc;
    }
  });
  var a2 = bestId && anchorXY[bestId];
  if (!a2) {
    arrowEl.hidden = true;
    return;
  }
  // the arrow points down at the place's tag
  var bob2 = Math.abs(Math.sin(now / 260)) * 9;
  var x = a2.x;
  var y = a2.top - 22 - bob2;
  var cx = Math.max(24, Math.min(cw - 24, x));
  var cy = Math.max(IT + 24, Math.min(ch - IB - 24, y));
  var rot = 0;
  if (cx !== x || cy !== y) rot = Math.atan2(a2.y - cy, a2.x - cx) - Math.PI / 2;
  arrowEl.hidden = false;
  arrowEl.style.transform = 'translate(' + Math.round(cx) + 'px,' + Math.round(cy) + 'px) translate(-50%,-50%) rotate(' + rot.toFixed(3) + 'rad)';
}

function init(canvas, tap) {
  cv = canvas;
  onTap = tap;
  loadingEl = document.getElementById('loading');
  try {
    sceneUp();
  } catch (e) {
    fail('This device cannot start the 3D view (WebGL is not available).');
    return;
  }
  resize();
  window.addEventListener('resize', resize);
  bind();
  [['turn-l', -1], ['turn-r', 1]].forEach(function (b) {
    document.getElementById(b[0]).addEventListener('click', function () {
      azGoal = Math.max(-TURN, Math.min(TURN, (azGoal === null ? Math.round(focus.az / TURN) * TURN : azGoal) + b[1] * TURN));
    });
  });
  var bar = document.getElementById('load-bar');
  lib = loadModels(modelList(), function (p) { if (bar) bar.style.width = Math.round(p * 100) + '%'; }, function () {
    setTimeout(function () {
      try {
        build();
      } catch (e) {
        console.error(e);
        fail('The store could not be built. Please reload.');
      }
    }, 30);
  });
}

function fail(msg) {
  loadingEl.firstChild.innerHTML = '<b>Main Street</b><p>' + msg + '</p>';
}

function build() {
  buildOutside();
  buildDepts();
  buildRows();
  buildFront();
  makeTags();
  sync(false, 0);
  focusNow();
  ready = true;
  loadingEl.classList.add('done');
}

var lastT = 0;

function draw(now) {
  if (!ready) return;
  var dt = Math.min(0.1, (now - lastT) / 1000);
  lastT = now;
  var flying = !!goal;
  stepCam(dt);
  if (flying) {
    clamp();
    place();
  }
  dayStep(dt);
  trafficStep(dt);
  crowdStep(dt);
  doorsStep(dt);
  popsStep(now);
  saysStep(now);
  order.forEach(function (id) {
    var s = shops[id];
    if (!s.group.visible) return;
    if (s.clerk.f.obj.visible) {
      if (s.clerk.still) s.clerk.f.mixer.update(dt);
      else staffStep(s, s.clerk, dt);
    }
    if (s.helper && s.helper.f.obj.parent.visible) staffStep(s, s.helper, dt);
  });
  places.hall.staff.forEach(function (f) { if (f.mixer && f.obj.parent.visible && f.obj.visible) f.mixer.update(dt); });
  crewStep(dt, now);
  puffsStep(now);
  riseStep(now);
  pop(now);
  if (shadowDirty) {
    renderer.shadowMap.needsUpdate = true;
    shadowDirty = false;
  }
  renderer.render(scene, cam);
  overlay(now);
}

function confetti() {
  var cols = ['#f0c040', '#e8553a', '#4f9a40', '#3f78b8', '#e85d9a'];
  for (var i = 0; i < 30; i++) {
    var d = document.createElement('i');
    var x = Math.random() * cw;
    d.style.cssText = 'position:absolute;left:0;top:0;width:8px;height:12px;background:' + cols[i % cols.length];
    tagsEl.appendChild(d);
    var dx = (Math.random() - 0.5) * 120;
    var a = d.animate([
      { transform: 'translate(' + x + 'px,-20px) rotate(0deg)' },
      { transform: 'translate(' + (x + dx) + 'px,' + ch + 'px) rotate(' + Math.round(Math.random() * 720) + 'deg)' }
    ], { duration: 1300 + Math.random() * 900, easing: 'ease-in' });
    a.onfinish = (function (el) { return function () { el.remove(); }; })(d);
  }
}

function spot(id) {
  var s = shops[id];
  if (s) return { x: s.cx * 0.8, y: s.cz };
  if (id === 'lot') return { x: 0, y: (LOT[0] + LOT[1]) / 2 };
  if (id === 'taxi') return { x: 4, y: 10 };
  if (id === 'dock') return { x: 8.5, y: -3.4 };
  if (id === 'garden') return { x: (GARDEN[0] + GARDEN[1]) / 2, y: (GARDEN[2] + GARDEN[3]) / 2 };
  return { x: 0, y: (FRONT + BACK) / 2 };
}

function go(x, z) {
  flyTo(x, z, Math.min(focus.dist, fit(11)));
}

// the whole width of the mall, from the street to the newest row
// the view that shows the store from a little of its building site to the far side of the lot, between the top
// and bottom bars: the nearest distance at which both ends fit, found by halving
function home() {
  var nr = shownRows();
  var back = rowZ(nr) - 1.5;
  var top = IT + 46;
  var bot = ch - IB - 8;
  var keep = [focus.x, focus.z, focus.dist, focus.az];
  focus.x = 0;
  focus.az = VIEW_AZ;
  var lo = fit(EDGE * 2 + 2);
  var hi = DMAX;
  var z = (back + LOT[1]) / 2;
  var best = z;
  for (var i = 0; i < 16; i++) {
    focus.dist = (lo + hi) / 2;
    var yb = 0;
    var yf = 0;
    for (var j = 0; j < 4; j++) {
      focus.z = z;
      place();
      yb = toScreen(0, 0, back, sp).y;
      yf = toScreen(0, 0, LOT[1], sp).y;
      z -= ((top + bot) / 2 - (yb + yf) / 2) / Math.max(1, yf - yb) * (LOT[1] - back);
    }
    if (yb >= top && yf <= bot) {
      hi = focus.dist;
      best = z;
    } else lo = focus.dist;
  }
  focus.x = keep[0];
  focus.z = keep[1];
  focus.dist = keep[2];
  focus.az = keep[3];
  place();
  return { z: best, d: hi };
}

function focusNow() {
  goal = null;
  azGoal = null;
  var h = home();
  focus.x = 0;
  focus.z = h.z;
  focus.dist = h.d;
  focus.az = VIEW_AZ;
  clamp();
  place();
}

function event(res, now) {
  if (shops[res.id]) bump[res.id] = now;
  sync(true, now);
  var big = res.unlock || res.place || (res.ms && res.ms.length);
  var p = spot(res.id);
  var out = 0.25;
  if (big) out = flyTo(res.place ? p.x : 0, p.y, Math.min(focus.dist, fit(EDGE * 2 + 2))) + 0.1;
  return out;
}

function refresh() {
  rows.forEach(function (r) { r.shown = false; });
  order.forEach(function (id) { shops[id].shown = -1; });
  PLACES.forEach(function (p) { places[p.id].shown = -1; });
  sync(false, 0);
  resetCrowd();
  seed = 3;
  for (var i = 0; i < 3; i++) come('walk');
  seed = 0;
}

window.View = {
  init: init,
  draw: draw,
  inset: function (t, b) {
    IT = t;
    IB = b;
    if (cam) resize();
  },
  ready: function () { return ready; },
  event: event,
  go: go,
  refresh: refresh,
  confetti: confetti,
  populate: function () { sync(true, performance.now()); },
  focusNow: focusNow,
  screenOf: function (id) {
    var a = anchorXY[id];
    return a ? { x: a.x, y: a.y } : null;
  },
  spot: spot,
  setBest: function (id) { bestId = id; },
  shopper: shopperEvent
};
