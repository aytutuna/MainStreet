// Businesses in unlock order. cy: cycle in seconds, c0: price of level 1 (the unlock), g: price growth per level,
// r: revenue per level and cycle, m: manager price. ic: sprite shown on the row.
var BIZ = [
  { id: 'fruit', name: 'Fruit Stand', ic: 'shop/display-fruit', cy: 1, c0: 4, g: 1.1, r: 1, m: 20000 },
  { id: 'bakery', name: 'Bakery', ic: 'shop/display-bread', cy: 3, c0: 60, g: 1.15, r: 0.643, m: 720 },
  { id: 'flower', name: 'Flower Shop', ic: 'shop/display-flowers', cy: 6, c0: 600, g: 1.14, r: 11, m: 7200 },
  { id: 'grocery', name: 'Grocery', ic: 'shop/shelf-boxes', cy: 12, c0: 6000, g: 1.13, r: 188, m: 72000 },
  { id: 'frozen', name: 'Frozen Foods', ic: 'shop/freezers-standing', cy: 20, c0: 60000, g: 1.12, r: 2680, m: 7.2e5 },
  { id: 'clothes', name: 'Clothing', ic: 'shop/clothing-rack', cy: 30, c0: 6e5, g: 1.11, r: 34300, m: 7.2e6 },
  { id: 'gifts', name: 'Gift Shop', ic: 'shop/gacha-machine', cy: 45, c0: 6e6, g: 1.11, r: 4.4e5, m: 7.2e7 },
  { id: 'arcade', name: 'Arcade', ic: 'arcade/arcade-machine', cy: 60, c0: 6e7, g: 1.1, r: 5.01e6, m: 7.2e8 },
  { id: 'games', name: 'Prize Games', ic: 'arcade/claw-machine', cy: 90, c0: 6e8, g: 1.09, r: 6.43e7, m: 7.2e9 },
  { id: 'sports', name: 'Game Zone', ic: 'arcade/air-hockey', cy: 120, c0: 6e9, g: 1.08, r: 7.32e8, m: 7.2e10 }
];

// level thresholds: [level, revenue x, cycle x2]. Each level in STAGE also puts one more piece in the shop
var MS = [[10, 2, 0], [25, 2, 1], [50, 3, 0], [100, 2, 1], [200, 3, 0], [300, 3, 0], [400, 3, 0]];
var MS_GEMS = [1, 2, 3, 5, 8, 10, 15];
var STAGE = [1, 5, 10, 25, 50, 100, 200];

// the entrance hall: a few levels, each raises all income by 20%
var HALL = { after: 'flower', cost: [5e6, 1e8, 2e9, 4e10], boost: 0.2 };

// shops that fill up quicker than STAGE
var VIEW = {
  fruit: [1, 3, 6, 10, 15, 20, 25]
};
