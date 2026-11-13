// Departments in unlock order. cy: cycle in seconds, c0: price of level 1 (the unlock), g: price growth per level,
// r: revenue per level and cycle, m: manager price. ic: sprite shown on the row.
var BIZ = [
  { id: 'produce', name: 'Produce', ic: 'food/apple', cy: 1, c0: 4, g: 1.1, r: 1, m: 20000 },
  { id: 'bakery', name: 'Bakery', ic: 'food/croissant', cy: 3, c0: 60, g: 1.15, r: 0.643, m: 720 },
  { id: 'dairy', name: 'Dairy', ic: 'food/cheese', cy: 6, c0: 600, g: 1.14, r: 11, m: 7200 },
  { id: 'meat', name: 'Meat & Fish', ic: 'food/meat-raw', cy: 12, c0: 6000, g: 1.13, r: 188, m: 72000 },
  { id: 'frozen', name: 'Frozen', ic: 'food/ice-cream', cy: 20, c0: 60000, g: 1.12, r: 2680, m: 7.2e5 },
  { id: 'pantry', name: 'Pantry', ic: 'food/can', cy: 30, c0: 6e5, g: 1.11, r: 34300, m: 7.2e6 },
  { id: 'snacks', name: 'Snacks & Drinks', ic: 'food/soda-bottle', cy: 45, c0: 6e6, g: 1.11, r: 4.4e5, m: 7.2e7 },
  { id: 'toys', name: 'Toys', ic: 'holiday/present-a-cube', cy: 60, c0: 6e7, g: 1.1, r: 5.01e6, m: 7.2e8 },
  { id: 'tech', name: 'Electronics', ic: 'furn/televisionModern', cy: 90, c0: 6e8, g: 1.09, r: 6.43e7, m: 7.2e9 },
  { id: 'kitchen', name: 'Kitchen', ic: 'food/frying-pan', cy: 120, c0: 6e9, g: 1.08, r: 7.32e8, m: 7.2e10 },
  { id: 'clothes', name: 'Clothing', ic: 'shop/clothing-rack', cy: 180, c0: 6e10, g: 1.07, r: 9.4e9, m: 7.2e11 },
  { id: 'home', name: 'Home', ic: 'furn/loungeSofa', cy: 240, c0: 6e11, g: 1.07, r: 1.06e11, m: 7.2e12 }
];

// level thresholds: [level, revenue x, cycle x2]. Each level in STAGE also puts one more thing in the department
var MS = [[10, 2, 0], [25, 2, 1], [50, 3, 0], [100, 2, 1], [200, 3, 0], [300, 3, 0], [400, 3, 0]];
var MS_GEMS = [1, 2, 3, 5, 8, 10, 15];
var STAGE = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 12, 14, 16, 18, 20, 25, 50, 100, 200, 300, 400];

// places round the departments: a few levels each, and every level raises all income. `after` must be open first;
// `open` places stand from the start and their levels add to them
var PLACES = [
  { id: 'lot', name: 'Parking', ic: 'car/sedan', after: 'bakery', cost: [500, 5e4, 5e6, 5e8], boost: 0.1 },
  { id: 'hall', name: 'Checkouts', ic: 'shop/cash-register', after: 'dairy', open: true, cost: [5e6, 1e8, 2e9, 4e10], boost: 0.2 },
  { id: 'taxi', name: 'Taxi Stand', ic: 'car/taxi', after: 'frozen', cost: [2e6, 2e8, 2e10, 2e12], boost: 0.15 },
  { id: 'garden', name: 'Garden Center', ic: 'shop/display-flowers', after: 'kitchen', cost: [2e10, 2e12, 2e14, 2e16], boost: 0.15 }
];
var PL = {};
PLACES.forEach(function (p) { PL[p.id] = p; });
