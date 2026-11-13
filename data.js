// Departments in unlock order. c0: price of level 1 (the unlock), g: price growth per level, s: what every shopper
// spends there per level. ic: sprite shown on the row.
var BIZ = [
  { id: 'produce', name: 'Produce', ic: 'food/apple', c0: 4, g: 1.1, s: 6 },
  { id: 'bakery', name: 'Bakery', ic: 'food/croissant', c0: 60, g: 1.15, s: 1.29 },
  { id: 'dairy', name: 'Dairy', ic: 'food/cheese', c0: 600, g: 1.14, s: 11 },
  { id: 'meat', name: 'Meat & Fish', ic: 'food/meat-raw', c0: 6000, g: 1.13, s: 94 },
  { id: 'frozen', name: 'Frozen', ic: 'food/ice-cream', c0: 60000, g: 1.12, s: 804 },
  { id: 'pantry', name: 'Pantry', ic: 'food/can', c0: 6e5, g: 1.11, s: 6860 },
  { id: 'snacks', name: 'Snacks & Drinks', ic: 'food/soda-bottle', c0: 6e6, g: 1.11, s: 58700 },
  { id: 'toys', name: 'Toys', ic: 'holiday/present-a-cube', c0: 6e7, g: 1.1, s: 5.01e5 },
  { id: 'tech', name: 'Electronics', ic: 'furn/televisionModern', c0: 6e8, g: 1.09, s: 4.29e6 },
  { id: 'kitchen', name: 'Kitchen', ic: 'food/frying-pan', c0: 6e9, g: 1.08, s: 3.66e7 },
  { id: 'clothes', name: 'Clothing', ic: 'shop/clothing-rack', c0: 6e10, g: 1.07, s: 3.13e8 },
  { id: 'home', name: 'Home', ic: 'furn/loungeSofa', c0: 6e11, g: 1.07, s: 2.65e9 },
  { id: 'office', name: 'Books & Office', ic: 'furn/books', c0: 6e12, g: 1.07, s: 2.25e10 },
  { id: 'pets', name: 'Pets', ic: 'pets/animal-dog', c0: 6e13, g: 1.07, s: 1.9e11 },
  { id: 'sports', name: 'Sports & Outdoors', ic: 'surv/tent-canvas', c0: 6e14, g: 1.06, s: 1.6e12 },
  { id: 'tools', name: 'Hardware', ic: 'surv/tool-hammer', c0: 6e15, g: 1.06, s: 1.4e13 },
  { id: 'auto', name: 'Auto', ic: 'car/wheel-default', c0: 6e16, g: 1.06, s: 1.2e14 },
  { id: 'seasonal', name: 'Seasonal', ic: 'holiday/tree-decorated', c0: 6e17, g: 1.06, s: 1e15 }
];

// milestones: [level, sales x]. Each level in STAGE also puts one more thing in the department
var MS = [[10, 2], [25, 4], [50, 3], [100, 4], [200, 3], [300, 3], [400, 3]];
var MS_GEMS = [1, 2, 3, 5, 8, 10, 15];
var STAGE = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 12, 14, 16, 18, 20, 25, 50, 100, 200, 300, 400];

// places round the departments. Parking, the taxi stand and the garden bring shoppers; the checkouts take their
// money. `after` must be open first, `open` places stand from the start, and `next` names what each level adds
var PLACES = [
  { id: 'lot', name: 'Parking', ic: 'car/sedan', after: 'bakery', cost: [500, 5e4, 5e6, 5e8],
    next: ['A parking lot: shoppers come by car', 'More parking bays', 'More parking bays', 'The whole lot, with planters'] },
  { id: 'hall', name: 'Checkouts', ic: 'shop/cash-register', after: 'produce', open: true,
    cost: [300, 3e4, 3e6, 3e8, 3e10, 3e12, 3e14, 3e16, 3e18, 3e20],
    next: ['Lane 2, with a cashier', 'A row of shopping carts', 'Two self checkouts and an attendant', 'Bottle returns', 'Lane 3, with a cashier',
      'Two more self checkouts', 'A service desk', 'Vending machines', 'Two more self checkouts', 'A bench and plants'] },
  { id: 'taxi', name: 'Taxi Stand', ic: 'car/taxi', after: 'frozen', cost: [2e6, 2e8, 2e10, 2e12],
    next: ['A taxi stand: shoppers come by taxi', 'More taxis', 'More taxis', 'A taxi every few seconds'] },
  { id: 'garden', name: 'Garden Center', ic: 'shop/display-flowers', after: 'kitchen', cost: [2e10, 2e12, 2e14, 2e16],
    next: ['A fenced garden with a till', 'More flower displays', 'Potted plants and more displays', 'Trees and lamps'] }
];
var PL = {};
PLACES.forEach(function (p) { PL[p.id] = p; });

// the tills in the order they open, with the Checkouts level that adds each: staffed lanes and self checkouts
var TILLS = [{ k: 'lane', lv: 0 }, { k: 'lane', lv: 1 }, { k: 'self', lv: 3 }, { k: 'self', lv: 3 }, { k: 'lane', lv: 5 },
  { k: 'self', lv: 6 }, { k: 'self', lv: 6 }, { k: 'self', lv: 9 }, { k: 'self', lv: 9 }];
