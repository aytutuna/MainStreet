// Departments in unlock order. c0: price of the first upgrade (the unlock), g: price growth per upgrade, s: what every
// shopper spends there per upgrade, w: a stocker's one-way walk there from the stockroom in seconds. ic: sprite shown
// on the row.
var BIZ = [
  { id: 'produce', name: 'Produce', ic: 'food/apple', c0: 4, g: 1.165, s: 6, w: 18.8 },
  { id: 'bakery', name: 'Bakery', ic: 'food/croissant', c0: 60, g: 1.165, s: 1.29, w: 14 },
  { id: 'dairy', name: 'Dairy', ic: 'food/cheese', c0: 600, g: 1.165, s: 11, w: 8.1 },
  { id: 'meat', name: 'Meat & Fish', ic: 'food/meat-raw', c0: 6000, g: 1.165, s: 94, w: 10.4 },
  { id: 'frozen', name: 'Frozen', ic: 'food/ice-cream', c0: 60000, g: 1.165, s: 804, w: 7.6 },
  { id: 'pantry', name: 'Pantry', ic: 'food/can', c0: 6e5, g: 1.165, s: 6860, w: 16.8 },
  { id: 'snacks', name: 'Snacks & Drinks', ic: 'food/soda-bottle', c0: 9e6, g: 1.165, s: 58700, w: 13.2 },
  { id: 'toys', name: 'Toys', ic: 'holiday/present-a-cube', c0: 9e7, g: 1.165, s: 5.01e5, w: 14.4 },
  { id: 'tech', name: 'Electronics', ic: 'furn/televisionModern', c0: 9e8, g: 1.165, s: 4.29e6, w: 10 },
  { id: 'kitchen', name: 'Kitchen', ic: 'food/frying-pan', c0: 9e9, g: 1.165, s: 3.66e7, w: 9.2 },
  { id: 'clothes', name: 'Clothing', ic: 'shop/clothing-rack', c0: 9e10, g: 1.165, s: 3.13e8, w: 17.5 },
  { id: 'home', name: 'Home', ic: 'furn/loungeSofa', c0: 9e11, g: 1.165, s: 2.65e9, w: 16.3 },
  { id: 'office', name: 'Books & Office', ic: 'furn/books', c0: 9e12, g: 1.165, s: 2.25e10, w: 12.1 },
  { id: 'pets', name: 'Pets', ic: 'pets/animal-dog', c0: 9e13, g: 1.165, s: 1.9e11, w: 11.2 },
  { id: 'sports', name: 'Sports & Outdoors', ic: 'surv/tent-canvas', c0: 9e14, g: 1.165, s: 1.6e12, w: 14.6 },
  { id: 'tools', name: 'Hardware', ic: 'surv/tool-hammer', c0: 9e15, g: 1.165, s: 1.4e13, w: 10.7 },
  { id: 'auto', name: 'Auto', ic: 'car/wheel-default', c0: 9e16, g: 1.165, s: 1.2e14, w: 11.2 },
  { id: 'seasonal', name: 'Seasonal', ic: 'holiday/tree-decorated', c0: 9e17, g: 1.165, s: 1e15, w: 20.3 }
];

// a department has UPS upgrades, each one more thing in it, and they come in items of one kind each: sell raises what
// every shopper spends there, draw brings more shoppers and staff cuts the stockers' work. ITEMS gives each department's
// items as [name, stat], and for every upgrade in the order plan.js lists them the number of the item it belongs to.
// Items are bought a level at a time, each level adding that item's next piece. A star at each of STAR_AT levels
// multiplies the department's sales by STAR_MUL
var UPS = 30;
var STAR_AT = [10, 20, 30];
var STAR_GEMS = [6, 10, 13];
var STAR_MUL = 4;
var ITEMS = {
  produce: { it: [['Fruit tables', 'sell'], ['Veg & flower stands', 'sell'], ['Barrels & bins', 'sell'], ['Signs & lights', 'draw'], ['Decor', 'draw'], ['Clerks', 'staff']],
    of: '020030120532110221132023544443' },
  bakery: { it: [['Bread racks', 'sell'], ['Tables & cases', 'sell'], ['Counter & ovens', 'sell'], ['Signs & decor', 'draw'], ['Clerks', 'staff']],
    of: '110031100422221100033113433232' },
  dairy: { it: [['Wall coolers', 'sell'], ['Open islands', 'sell'], ['Signs, mats & lights', 'draw'], ['Decor', 'draw'], ['Clerks', 'staff']],
    of: '000020001411111123323133432322' },
  meat: { it: [['Cases & chests', 'sell'], ['Meat coolers', 'sell'], ['Butcher counter', 'sell'], ['Signs, mats & lights', 'draw'], ['Decor', 'draw'], ['Clerks', 'staff']],
    of: '000031111512220000334424543441' },
  frozen: { it: [['Freezer cases', 'sell'], ['Chest freezers', 'sell'], ['Signs & lights', 'draw'], ['Decor', 'draw'], ['Clerks', 'staff']],
    of: '000020011411121333023301413131' },
  pantry: { it: [['Dry goods gondolas', 'sell'], ['Cooking gondolas', 'sell'], ['End caps', 'sell'], ['Promo tables & bins', 'sell'], ['Signs, mats & lights', 'draw'], ['Clerks', 'staff']],
    of: '020040002533112111142243543330' },
  snacks: { it: [['Snack racks', 'sell'], ['Drink coolers', 'sell'], ['End caps', 'sell'], ['Promo tables & bins', 'sell'], ['Signs, mats & lights', 'draw'], ['Clerks', 'staff']],
    of: '020041112533002111042243534431' },
  toys: { it: [['Cars & blocks', 'sell'], ['Plush & machines', 'sell'], ['Games & puzzles', 'sell'], ['Signs & plush', 'draw'], ['Clerks', 'staff']],
    of: '000131212412010013033222422331' },
  tech: { it: [['TVs', 'sell'], ['Laptops & cameras', 'sell'], ['Computers', 'sell'], ['Games, phones & audio', 'sell'], ['Signs, decor & lights', 'draw'], ['Clerks', 'staff']],
    of: '010042030530100434243234522433' },
  kitchen: { it: [['Cookware', 'sell'], ['Bowls & appliances', 'sell'], ['Mugs & glasses', 'sell'], ['Display kitchen', 'sell'], ['Displays & lights', 'draw'], ['Clerks', 'staff']],
    of: '000341132522000114242401510241' },
  clothes: { it: [['Clothing racks', 'sell'], ['Clothing tables', 'sell'], ['Shoes & mannequins', 'sell'], ['Signs & lights', 'draw'], ['Decor', 'draw'], ['Clerks', 'staff']],
    of: '012030102511002122232442544443' },
  home: { it: [['Living room', 'sell'], ['Bedroom', 'sell'], ['Dining & appliances', 'sell'], ['Lamps & decor', 'draw'], ['Clerks', 'staff']],
    of: '000130213422120012033213433211' },
  office: { it: [['Books & art supplies', 'sell'], ['Notebooks & stationery', 'sell'], ['Paper & magazines', 'sell'], ['Decor & lights', 'draw'], ['Clerks', 'staff']],
    of: '000131112422030031133233432102' },
  pets: { it: [['Pet food shelves', 'sell'], ['Supply racks', 'sell'], ['End caps & tables', 'sell'], ['Tanks & pens', 'sell'], ['Signs & decor', 'draw'], ['Clerks', 'staff']],
    of: '020040002523113111142233544423' },
  sports: { it: [['Tents', 'sell'], ['Camp gear', 'sell'], ['Balls & boards', 'sell'], ['Signs & lights', 'draw'], ['Decor', 'draw'], ['Clerks', 'staff']],
    of: '202031011524243441434021534122' },
  tools: { it: [['Hammers & workbench', 'sell'], ['Hand tools & lumber', 'sell'], ['Paint & storage', 'sell'], ['Fixings & racks', 'sell'], ['Displays & lights', 'draw'], ['Clerks', 'staff']],
    of: '002043122533320014243420513431' },
  auto: { it: [['Oil & care', 'sell'], ['Parts shelves', 'sell'], ['Tires & wheels', 'sell'], ['Signs & lights', 'draw'], ['Decor', 'draw'], ['Clerks', 'staff']],
    of: '120230112502442440033444511423' },
  seasonal: { it: [['Trees & tables', 'sell'], ['Ornaments & canes', 'sell'], ['Stockings & gifts', 'sell'], ['Signs & lights', 'draw'], ['Decor', 'draw'], ['Clerks', 'staff']],
    of: '001130202502000244234412542413' }
};

// n prices from c, each g times the one before, to two significant digits
function geo(c, g, n) {
  var out = [];
  for (var i = 0; i < n; i++) out.push(Number((c * Math.pow(g, i)).toPrecision(2)));
  return out;
}

// places round the departments. Parking, the taxi stand and the garden bring shoppers, the stockroom keeps the
// shelves full and the checkouts take the money. `after` must be open first, `open` places stand from the start, and
// `next` names what each level adds. A place has items like a department: `it` names them and `of` gives the item
// each level of `next` belongs to, so a level is always a piece of one item
var PLACES = [
  { id: 'lot', name: 'Parking', ic: 'car/sedan', after: 'bakery', cost: [500, 5e4, 5e6, 5e8],
    next: ['A parking lot for shoppers who drive', 'More parking bays', 'More parking bays', 'The whole lot, with planters'],
    it: ['Parking lot'], of: '0000' },
  { id: 'hall', name: 'Checkouts', ic: 'shop/cash-register', after: 'produce', open: true,
    cost: [300, 3e4, 3e6, 3e8, 3e10, 3e12, 3e14, 3e16, 3e18, 3e20],
    next: ['Lane 2, with a cashier', 'Cart corrals with carts', 'Two self checkouts and an attendant', 'Recycling stations', 'Lane 3, with a cashier',
      'Two more self checkouts', 'A courtesy desk', 'Vending machines and a news rack', 'Two more self checkouts', 'A bench and planters'],
    it: ['Lanes', 'Self checkout pairs', 'Extras'], of: '0212012212', got: [1, 0, 0] },
  { id: 'dock', name: 'Stockroom', ic: 'shop/hand-truck', after: 'produce', open: true,
    cost: geo(150, 12, 10),
    next: ['A second stocker', 'A third stocker', 'A box more on every dolly', 'A fourth stocker', 'A fifth stocker',
      'A box more on every dolly', 'A sixth stocker', 'A seventh stocker', 'A box more on every dolly', 'An eighth stocker'],
    it: ['Stockers', 'Boxes a dolly'], of: '0010010010', got: [1, 2] },
  { id: 'taxi', name: 'Taxi Stand', ic: 'car/taxi', after: 'frozen', cost: [2e6, 2e8, 2e10, 2e12],
    next: ['A taxi stand for shoppers who ride', 'More taxis', 'More taxis', 'A taxi every few seconds'],
    it: ['Taxis'], of: '0000' },
  { id: 'garden', name: 'Garden Center', ic: 'shop/display-flowers', after: 'kitchen', cost: [2e10, 2e12, 2e14, 2e16],
    next: ['A fenced garden with a till', 'More flower displays', 'Potted plants and more displays', 'Trees and lamps'],
    it: ['Garden'], of: '0000' },
  { id: 'serv', name: 'Customer Service', ic: 'shop/service-desk', after: 'pantry', cost: geo(2e6, 6.2, 9),
    next: ['A service desk', 'A clerk behind it', 'Queue posts', 'Waiting benches', 'A second service desk', 'A second clerk', 'Parcel lockers and a returns counter',
      'A floor sign and an information stand', 'A waiting table, plants and a water cooler'],
    it: ['Desks', 'Clerks', 'Waiting area', 'Extras'], of: '012201332' },
  { id: 'rest', name: 'Restrooms', ic: 'shop/toilet', after: 'snacks', cost: geo(2e7, 7, 8),
    next: ['Three toilet stalls', 'A fourth stall and toilet brushes', 'Mirrored sinks', 'A family room with a baby changing table', 'Urinals', 'Sinks along the wall, soap and towels', 'Supply shelves, a bench, bins and plants',
      'A cleaning cart, mop bucket and a wet floor sign'],
    it: ['Toilets', 'Sinks', 'Extras'], of: '00100122' },
  { id: 'lounge', name: 'Break Room', ic: 'shop/coffee-maker', after: 'toys', cost: geo(5e8, 5.5, 10),
    next: ['A fridge, pantry and counters', 'Worktops, a kettle and wall cupboards', 'Coffee, microwave and toaster', 'A table with four chairs', 'Pizza boxes on the table', 'A staff member on break',
      'A second table', 'Lockers and a bench', 'A second staff member', 'A sofa corner, notice board and clock'],
    it: ['Kitchenette', 'Dining', 'Extras', 'Staff on break'], of: '0001131232' },
  { id: 'head', name: 'Head Office', ic: 'shop/office-desk', after: 'tech', cost: geo(1e9, 6, 10),
    next: ['A manager desk and chairs', 'A computer', 'The manager', 'Filing cabinets', 'A safe and archive shelves', 'A meeting table with chairs', 'A whiteboard and a coffee station',
      'Six more desks and a clerk', 'Archive shelving and a printer table', 'A rug, plants and a water cooler'],
    it: ['Offices', 'Storage', 'Meeting room'], of: '0001122010' }
];
var PL = {};
PLACES.forEach(function (p) { PL[p.id] = p; });

// the tills in the order they open, with the Checkouts level whose piece adds each: staffed lanes and self checkouts
var TILLS = [{ k: 'lane', lv: 0 }, { k: 'lane', lv: 1 }, { k: 'self', lv: 3 }, { k: 'self', lv: 3 }, { k: 'lane', lv: 5 },
  { k: 'self', lv: 6 }, { k: 'self', lv: 6 }, { k: 'self', lv: 9 }, { k: 'self', lv: 9 }];

// Things to tap: one shows up every gap seconds of play and stays life seconds. A tap pays cash worth cash seconds of
// income, or now and then gems or a minute of x2. They add up to roughly a tenth more income for a player who taps all
var GIFT = { gap: [30, 60], life: [10, 15], cash: [3, 9], gems: 0.04, gemN: [1, 2], x2: 0.02, x2Secs: 60 };
// Rush events: one every gap seconds of play, shoppers coming mul times as fast for secs, and each tap on a till gives
// its front shopper tap seconds of service
var RUSH = { gap: [240, 360], secs: 30, mul: 2, tap: 0.9 };
