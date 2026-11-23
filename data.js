// Departments in unlock order. c0: price of the first upgrade (the unlock), g: price growth per upgrade, s: what every
// shopper spends there per upgrade, w: a stocker's one-way walk there from the stockroom in seconds. ic: sprite shown
// on the row.
var BIZ = [
  { id: 'produce', name: 'Produce', ic: 'food/apple', c0: 4, g: 1.165, s: 6, w: 18.8 },
  { id: 'bakery', name: 'Bakery', ic: 'food/croissant', c0: 35, g: 1.202, s: 1.29, w: 14 },
  { id: 'dairy', name: 'Dairy', ic: 'food/cheese', c0: 320, g: 1.169, s: 11, w: 8.1 },
  { id: 'meat', name: 'Meat & Fish', ic: 'food/meat-raw', c0: 3500, g: 1.201, s: 94, w: 10.4 },
  { id: 'frozen', name: 'Frozen', ic: 'food/ice-cream', c0: 73000, g: 1.135, s: 804, w: 7.6 },
  { id: 'pantry', name: 'Pantry', ic: 'food/can', c0: 4.5e6, g: 1.1, s: 6860, w: 16.8 },
  { id: 'snacks', name: 'Snacks & Drinks', ic: 'food/soda-bottle', c0: 6.1e6, g: 1.156, s: 58700, w: 13.2 },
  { id: 'toys', name: 'Toys', ic: 'holiday/present-a-cube', c0: 6e7, g: 1.171, s: 5.01e5, w: 14.4 },
  { id: 'tech', name: 'Electronics', ic: 'furn/televisionModern', c0: 8.5e8, g: 1.134, s: 4.29e6, w: 10 },
  { id: 'kitchen', name: 'Kitchen', ic: 'food/frying-pan', c0: 9e9, g: 1.16, s: 3.66e7, w: 9.2 },
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
  produce: { it: [['Fruit & tomato tables', 'sell'], ['Veg & flower stands', 'sell'], ['Fruit & melon bins', 'sell'], ['Farm signs & lights', 'draw'], ['Baskets, bench & mat', 'draw'], ['Clerks', 'staff']],
    of: '020030120532110221132023544443' },
  bakery: { it: [['Bread & roll racks', 'sell'], ['Donuts, pies & cakes', 'sell'], ['Ovens & coffee bar', 'sell'], ['Menu board & lights', 'draw'], ['Clerks', 'staff']],
    of: '110031100422221100033113433232' },
  dairy: { it: [['Milk & yogurt coolers', 'sell'], ['Cheese & dip islands', 'sell'], ['Dairy signs & lights', 'draw'], ['Plant, ice & recycling', 'draw'], ['Clerks', 'staff']],
    of: '000020001411111123323133432322' },
  meat: { it: [['Beef & bacon cases', 'sell'], ['Ham, turkey & burgers', 'sell'], ['Butcher counter', 'sell'], ['Deli board & lights', 'draw'], ['Brine tubs & ice', 'draw'], ['Clerks', 'staff']],
    of: '000031111512220000334424543441' },
  frozen: { it: [['Pizza & dinner coolers', 'sell'], ['Ice cream & pop chests', 'sell'], ['Deal sign & lights', 'draw'], ['Ice bags & recycling', 'draw'], ['Clerks', 'staff']],
    of: '000020011411121333023301413131' },
  pantry: { it: [['Cereal, pasta & soup', 'sell'], ['Sauce, spice & tea', 'sell'], ['Soup & jar end caps', 'sell'], ['Can bin & tables', 'sell'], ['Sale board & mats', 'draw'], ['Clerks', 'staff']],
    of: '020040002533112111142243543330' },
  snacks: { it: [['Chips & candy racks', 'sell'], ['Soda & water coolers', 'sell'], ['Chocolate & gum caps', 'sell'], ['Soda & chip tables', 'sell'], ['Drinks board & mats', 'draw'], ['Clerks', 'staff']],
    of: '020041112533002111042243534431' },
  toys: { it: [['Cars, trucks & blocks', 'sell'], ['Plush & claw machines', 'sell'], ['Puzzles & board games', 'sell'], ['Sale board & play mats', 'draw'], ['Clerks', 'staff']],
    of: '000131212412010013033222422331' },
  tech: { it: [['TVs & home theater', 'sell'], ['Laptops & cameras', 'sell'], ['Computers & monitors', 'sell'], ['Games, phones & audio', 'sell'], ['Demo mat & desk lamps', 'draw'], ['Clerks', 'staff']],
    of: '010042030530100434243234522433' },
  kitchen: { it: [['Pots, pans & mixers', 'sell'], ['Bowls & blenders', 'sell'], ['Mugs, glasses & knives', 'sell'], ['Display range & sink', 'sell'], ['Cookware deal & mat', 'draw'], ['Clerks', 'staff']],
    of: '000341132522000114242401510241' },
  clothes: { it: [['Shirt & jacket racks', 'sell'], ['Tee & denim tables', 'sell'], ['Shoes & mannequins', 'sell'], ['Fashion podium & signs', 'draw'], ['Fitting rooms & mirror', 'draw'], ['Clerks', 'staff']],
    of: '012030102511002122232442544443' },
  home: { it: [['Living room', 'sell'], ['Bedroom', 'sell'], ['Dining & appliances', 'sell'], ['Lamps & decor', 'draw'], ['Clerks', 'staff']],
    of: '000130213422120012033213433211' },
  office: { it: [['Books & art supplies', 'sell'], ['Notebooks & stationery', 'sell'], ['Pens & magazines', 'sell'], ['Decor & lights', 'draw'], ['Clerks', 'staff']],
    of: '000131112422030031133233432102' },
  pets: { it: [['Dog & cat food', 'sell'], ['Seed, litter & beds', 'sell'], ['Treats & leashes', 'sell'], ['Fish tank & pens', 'sell'], ['Toy board & pet rugs', 'draw'], ['Clerks', 'staff']],
    of: '020040002523113111142233544423' },
  sports: { it: [['Tents & lanterns', 'sell'], ['Stoves & coolers', 'sell'], ['Balls & skateboards', 'sell'], ['Climbing wall & signs', 'draw'], ['Canoe & turf mat', 'draw'], ['Clerks', 'staff']],
    of: '202031011524243441434021534122' },
  tools: { it: [['Hammers & workbench', 'sell'], ['Saws, pliers & lumber', 'sell'], ['Paint & tool chests', 'sell'], ['Fasteners & axes', 'sell'], ['Tool deal & mats', 'draw'], ['Clerks', 'staff']],
    of: '002043122533320014243420513431' },
  auto: { it: [['Oil & car care', 'sell'], ['Wipers & batteries', 'sell'], ['Tires & wheels', 'sell'], ['Kart showcase & signs', 'draw'], ['Cones, mats & boxes', 'draw'], ['Clerks', 'staff']],
    of: '120230112502442440033444511423' },
  seasonal: { it: [['Trees & train table', 'sell'], ['Ornaments & canes', 'sell'], ['Stockings & wreaths', 'sell'], ['Santa display & lights', 'draw'], ['Snow & holiday rugs', 'draw'], ['Clerks', 'staff']],
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
    it: ['Lanes', 'Self checkout pairs', 'Carts & vending'], of: '0212012212', got: [1, 0, 0] },
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
    it: ['Desks', 'Clerks', 'Waiting area', 'Lockers & signs'], of: '012201332' },
  { id: 'rest', name: 'Restrooms', ic: 'shop/toilet', after: 'snacks', cost: geo(2e7, 7, 8),
    next: ['Three toilet stalls', 'A fourth stall and toilet brushes', 'Mirrored sinks', 'A family room with a baby changing table', 'Urinals', 'Sinks along the wall, soap and towels', 'Supply shelves, a bench, bins and plants',
      'A cleaning cart, mop bucket and a wet floor sign'],
    it: ['Toilets', 'Sinks', 'Supplies & cleaning'], of: '00100122' },
  { id: 'lounge', name: 'Break Room', ic: 'shop/coffee-maker', after: 'toys', cost: geo(5e8, 5.5, 10),
    next: ['A fridge, pantry and counters', 'Worktops, a kettle and wall cupboards', 'Coffee, microwave and toaster', 'A table with four chairs', 'Pizza boxes on the table', 'A staff member on break',
      'A second table', 'Lockers and a bench', 'A second staff member', 'A sofa corner, notice board and clock'],
    it: ['Kitchenette', 'Dining', 'Lockers & sofa', 'Staff on break'], of: '0001131232' },
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
// A share jack of the gifts are jackpots: cash seconds of income, or x2 for jx2 seconds one time in jmix
GIFT.jack = 0.01;
GIFT.jcash = [90, 180];
GIFT.jx2 = 300;
GIFT.jmix = 0.25;
// Rush events: one every gap seconds of play, shoppers coming mul times as fast for secs, and each tap on a till gives
// its front shopper tap seconds of service. Taps in a row, each within a second of the one before, make a combo that
// adds combo of a tap for every tap after the first, up to top of them
var RUSH = { gap: [240, 360], secs: 30, mul: 2, tap: 0.9, combo: 0.05, top: 10 };
// the manager's call for a rush: cool seconds between calls, or gems to call one now
var CALL = { cool: 1200, gems: 5 };

// Perks bought with reputation, which each store move pays and which a move keeps. cost is what each level takes in
// reputation and val what the perk is worth at level 0 and then at each level bought: cash, away hours and rush seconds
// are extra on top of the base, the rest are the whole value
var PERKS = [
  { id: 'open', name: 'Head start', what: 'Start with', cost: [8, 16, 30, 55, 95], val: [[1, 0], [8, 0], [15, 0], [15, 8], [15, 15], [20, 20]] },
  { id: 'cash', name: 'Seed money', what: 'Start cash', cost: [6, 12, 22, 40, 70], val: [0, 100, 2e3, 4e4, 8e5, 1.6e7] },
  { id: 'cheap', name: 'Bulk deals', what: 'Upgrades cost', cost: [8, 14, 24, 40, 66, 100], val: [0, 0.05, 0.1, 0.15, 0.2, 0.25, 0.3] },
  { id: 'pace', name: 'Quick staff', what: 'Staff work', cost: [10, 18, 30, 50, 80], val: [1, 0.95, 0.9, 0.85, 0.8, 0.75] },
  { id: 'away', name: 'Long weekends', what: 'Away earnings last', cost: [6, 12, 24, 48], val: [0, 1, 2, 3, 4] },
  { id: 'rush', name: 'Rush hour', what: 'Rushes last', cost: [6, 12, 24], val: [0, 5, 10, 15] },
  { id: 'sales', name: 'Loyal shoppers', what: 'Sales', cost: [10, 20, 36, 60, 100], val: [1, 1.1, 1.2, 1.3, 1.45, 1.6] },
  { id: 'gems', name: 'Mission pay', what: 'Each mission pays', cost: [10, 25, 60], val: [0, 1, 2, 3] },
  { id: 'night', name: 'Open all night', what: 'Store hours', cost: [30], val: [0, 1] }
];
var PK = {};
PERKS.forEach(function (p) { PK[p.id] = p; });

// Regulars: a shopper who starts coming to the store once a feat is done. n is what the feat counts to (see REGV in
// sim.js), ref the shopper model with its colours moved round the atlas and hat the hat it wears. Each one owned
// adds sales of the store, the whole set a little more, and one of them now and then walks in among the shoppers and
// tips when tapped, then stays away for cool seconds
var REGS = [
  { id: 'mabel', name: 'Mabel', line: 'Retired teacher. Grades the produce out loud.', feat: 'Earn a star in any department', n: 1,
    ref: 'chars/character-female-e@1,3>9,3', hat: 'sun', hc: 0xe8d28a },
  { id: 'gus', name: 'Gus', line: 'Delivery driver, always in a hurry.', feat: 'Serve 1,000 shoppers', n: 1000,
    ref: 'chars/character-male-d@1,3>3,2', hat: 'cap', hc: 0xd0443a },
  { id: 'ollie', name: 'Ollie', line: 'Never pays without a coupon.', feat: 'Tap 10 gifts', n: 10,
    ref: 'chars/character-male-a@3,2>9,2', hat: 'beanie', hc: 0x3f78b8 },
  { id: 'priya', name: 'Priya', line: 'Knows which till is the fastest.', feat: 'Finish a rush combo of 10', n: 10,
    ref: 'chars/character-female-b@5,2>3,2', hat: 'cap', hc: 0x4f9a40 },
  { id: 'hana', name: 'Hana', line: 'Shops for the whole block.', feat: 'Earn $1M in total', n: 1e6,
    ref: 'chars/character-female-c@9,3>1,3', hat: 'none', hc: 0 },
  { id: 'theo', name: 'Theo', line: 'Builds gadgets in his garage.', feat: 'Open Electronics', n: 1,
    ref: 'chars/character-male-e@5,2>11,2', hat: 'beanie', hc: 0xe8553a },
  { id: 'walt', name: 'Walt', line: 'Here every morning for the paper.', feat: 'Claim 7 daily rewards', n: 7,
    ref: 'chars/character-male-b@9,2>15,2', hat: 'top', hc: 0x2a2a30 },
  { id: 'rosa', name: 'Rosa', line: 'Has moved three times and still shops here.', feat: 'Reach store 3', n: 3,
    ref: 'chars/character-female-a@11,2>9,2', hat: 'none', hc: 0 },
  { id: 'nina', name: 'Nina', line: 'Asks for the manager, then for a deal.', feat: 'Buy 10 perk levels', n: 10,
    ref: 'chars/character-female-d@3,3>7,3', hat: 'sun', hc: 0xf2c230 },
  { id: 'ivy', name: 'Ivy', line: 'Grows tomatoes and judges yours.', feat: 'Build the Garden Center', n: 1,
    ref: 'chars/character-female-f@5,2>3,2', hat: 'sun', hc: 0x68bd5c },
  { id: 'bruno', name: 'Bruno', line: 'Tells long stories at the meat counter.', feat: 'Earn all three stars in one department', n: 3,
    ref: 'chars/character-male-f@11,3>5,3', hat: 'cap', hc: 0x3f78b8 },
  { id: 'felix', name: 'Felix', line: 'Walks every aisle and buys one thing.', feat: 'Have 20 stars in one store', n: 20,
    ref: 'chars/character-male-c@11,2>3,2', hat: 'top', hc: 0x7a3f9a }
];
var REGC = { sales: 0.01, set: 0.05, odds: 0.02, tip: [3, 8], cool: 600 };
var RG = {};
REGS.forEach(function (r) { RG[r.id] = r; });
// The VIP is not a regular to collect: a gold shopper who comes in once in gap seconds of play (the first after first), and
// a tap before they leave tips tip seconds of income, now and then with a few gems
var VIP = { first: [300, 720], gap: [600, 900], tip: [40, 60], gems: 0.1, gemN: [1, 3] };
RG.vip = { id: 'vip', name: 'VIP', ref: 'chars/character-male-b@9,2>15,2', hat: 'top', hc: 0xf2c230, vip: true };

// Things sold in the shop, under the ids com.aytutuna.mainstreet.<id> in both stores. A one-time product is kept as a
// flag in S.iap; a gem pack pays its gems every time. The starter pack adds STARTER to a store's first move
var PRODUCTS = [
  { id: 'starter', once: 1, ic: 'ui_gift', name: 'Starter pack', text: '150 gems, 2 hours of double income and 10 rep.' },
  { id: 'noads', once: 1, ic: 'ui_star', name: 'No ads', line: 'No ads, ever. Rewards come free.', text: 'No ads between stores. Ad rewards come without watching.' },
  { id: 'x2', once: 1, ic: 'ui_bolt', name: 'Permanent x2', line: 'Double income for good.', text: 'All income doubled for good, on top of the timed boost.' },
  { id: 'gems1', gems: 80, usd: 0.99, ic: 'ui_gem', name: '80 gems' },
  { id: 'gems2', gems: 500, usd: 4.99, ic: 'ui_gem', name: '500 gems' },
  { id: 'gems3', gems: 1200, usd: 9.99, ic: 'ui_gem', name: '1,200 gems' },
  { id: 'gems4', gems: 2800, usd: 19.99, ic: 'ui_gem', name: '2,800 gems' }
];
var STARTER = { gems: 150, x2: 7200, rep: 10 };
// usd is the pack's price tier, only for the bonus shown against the smallest pack. The starter pack is offered in a
// window of hours that starts when its button is first shown and never comes back. The deal of the day is one of these
// packs, a day each in turn, with bonus extra gems; no pack follows itself, also where the list starts again
var STARTER_HOURS = 24;
var DEAL = { bonus: 0.2, packs: ['gems2', 'gems3', 'gems1', 'gems4'] };

// Ads the player chooses to watch: what each one gives and how many a day. Without ads (noads) the same rewards come
// for free, up to the same number
var AD_CAP = { x2: 4, away: 3, warp: 2, gems: 3, rush: 2 };
var AD_GEMS = 3;
// a gem pack the store lists is credited if it is no older than this many seconds and not credited before
var RECOVER = 3 * 86400;
// seconds of play before the ads, and with them the consent and tracking prompts, start
var AD_START = 180;
// an interstitial waits this long after the player's first play and after any other ad, in seconds
var AD_NEW = 600;
var AD_GAP = 600;

// How a store can look: a multiplying tint for the floors, the walls and the columns, the colours of the sign over the
// doors and of the pylon by the street. A look opens at store `store` or with the achievement `ach`, and then costs
// `gems` once if it has a price. They change nothing but looks
var LOOKS = [
  { id: 'classic', name: 'Classic', text: 'Red and gold, as it was', floor: null, wall: null, trim: null,
    sign: { bg: ['#363d54', '#1b1f2c'], edge: '#f2c230', text: '#ffe27a', shade: '#a8700c' },
    pylon: { panel: ['#fffaf0', '#f2e4c0'], band: '#d63a2f', text: '#2a2f40', star: '#ffd23a', post: 0x50566a, edge: 0x3a3d4a } },
  { id: 'fresh', name: 'Fresh Market', text: 'Light greens, a grocer\'s sign', store: 2, floor: 0xd8f5d0, wall: 0xdff5d6, trim: 0x8fcf80,
    sign: { bg: ['#34853f', '#1d5226'], edge: '#fff3b0', text: '#ffffff', shade: '#14401c' },
    pylon: { panel: ['#f4fff0', '#d8efc8'], band: '#3f9e47', text: '#1f5a28', star: '#ffd23a', post: 0x3f7a45, edge: 0x2c5a32 } },
  { id: 'rustic', name: 'Rustic', text: 'Warm timber and brick', store: 3, floor: 0xf0c890, wall: 0xe8b48a, trim: 0x8a5a30,
    sign: { bg: ['#6a4426', '#45290f'], edge: '#d9a45a', text: '#fbe6bf', shade: '#2b1708' },
    pylon: { panel: ['#f3dcb4', '#d9b684'], band: '#8a4b22', text: '#4a2a12', star: '#e8b04a', post: 0x6a4426, edge: 0x45290f } },
  { id: 'seaside', name: 'Seaside', text: 'Sea blues and white', store: 5, gems: 60, floor: 0xbfe6f6, wall: 0xcfeafa, trim: 0x4fa6c8,
    sign: { bg: ['#2077aa', '#134868'], edge: '#ffffff', text: '#e8fbff', shade: '#0b2c45' },
    pylon: { panel: ['#f4fcff', '#cce9f4'], band: '#1f8fc0', text: '#15486a', star: '#ffe27a', post: 0x4a7a96, edge: 0x2c5a76 } },
  { id: 'neon', name: 'Night Neon', text: 'Dark floors, glowing signs', ach: 'dep2', gems: 120, floor: 0x8c7cc4, wall: 0x7468b0, trim: 0xff3df0,
    sign: { bg: ['#1c1038', '#05020f'], edge: '#ff3df0', text: '#5cf5ff', shade: '#a010a0' },
    pylon: { panel: ['#1c1038', '#0a0618'], band: '#c01fb4', text: '#5cf5ff', star: '#fff03a', post: 0x2a2050, edge: 0x120a24 } },
  { id: 'gold', name: 'Golden Deluxe', text: 'Cream and gold, black signs', ach: 'all2', gems: 300, floor: 0xf6e6b4, wall: 0xf2dea4, trim: 0xd9a21f,
    sign: { bg: ['#3b3320', '#181208'], edge: '#f2c230', text: '#fff1b0', shade: '#7a5200' },
    pylon: { panel: ['#fff6d6', '#f0d88a'], band: '#2a2418', text: '#5a3d00', star: '#ffd23a', post: 0xb08a2a, edge: 0x3b3320 } }
];
var LK = {};
LOOKS.forEach(function (l) { LK[l.id] = l; });

// Achievements, up to three tiers (t) of each kind. k is what is counted (see ACHV in sim.js) and n what it counts to.
// A tier pays its gems once; gold also adds its `sales` to sales for good, and all of them together add at most ACH_CAP
var ACHS = [
  { id: 'srv1', t: 0, k: 'srv', n: 1e3, name: 'Busy Aisles', text: 'Serve 1,000 shoppers' },
  { id: 'srv2', t: 1, k: 'srv', n: 1e5, name: 'Local Favorite', text: 'Serve 100,000 shoppers' },
  { id: 'srv3', t: 2, k: 'srv', n: 1e7, name: 'Household Name', text: 'Serve 10 million shoppers' },
  { id: 'all1', t: 0, k: 'all', n: 1e7, name: 'First Fortune', text: 'Earn $10M in total' },
  { id: 'all2', t: 1, k: 'all', n: 1e12, name: 'Trillion Club', text: 'Earn $1T in total' },
  { id: 'all3', t: 2, k: 'all', n: 1e18, name: 'Money Machine', text: 'Earn $1Qi in total' },
  { id: 'st1', t: 0, k: 'store', n: 5, name: 'Moving Up', text: 'Reach store 5' },
  { id: 'st2', t: 1, k: 'store', n: 10, name: 'Chain Store', text: 'Reach store 10' },
  { id: 'st3', t: 2, k: 'store', n: 20, name: 'Retail Empire', text: 'Reach store 20' },
  { id: 'dep1', t: 0, k: 'dep', n: 6, name: 'Growing Store', text: 'Open 6 departments' },
  { id: 'dep2', t: 1, k: 'dep', n: 12, name: 'Big Box', text: 'Open 12 departments' },
  { id: 'dep3', t: 2, k: 'dep', n: 18, name: 'One Stop Shop', text: 'Open all 18 departments' },
  { id: 'star1', t: 0, k: 'star', n: 3, name: 'Full Marks', text: 'Earn all 3 stars in a department' },
  { id: 'rate1', t: 1, k: 'rate', n: 36, name: 'Five Star Aisles', text: 'Have 36 stars in one store' },
  { id: 'rate2', t: 2, k: 'rate', n: 54, name: 'Perfect Store', text: 'Have every star in one store' },
  { id: 'reg1', t: 0, k: 'reg', n: 6, name: 'Friendly Faces', text: 'Meet 6 regulars' },
  { id: 'reg2', t: 2, k: 'reg', n: 12, name: 'Everybody Knows You', text: 'Meet all the regulars' },
  { id: 'rush1', t: 1, k: 'rush', n: 20, name: 'Rush Hour Hero', text: 'Finish a rush combo of 20' },
  { id: 'rush2', t: 2, k: 'rush', n: 40, name: 'Lightning Hands', text: 'Finish a rush combo of 40' },
  { id: 'gift1', t: 0, k: 'gift', n: 25, name: 'Gift Spotter', text: 'Tap 25 gifts' },
  { id: 'gift2', t: 2, k: 'gift', n: 250, name: 'Santa\'s Helper', text: 'Tap 250 gifts' },
  { id: 'day1', t: 1, k: 'day', n: 14, name: 'Regular Hours', text: 'Claim 14 daily rewards' },
  { id: 'day2', t: 2, k: 'day', n: 30, name: 'Never Closed', text: 'Claim 30 daily rewards' },
  { id: 'pk1', t: 0, k: 'pk', n: 20, name: 'Well Connected', text: 'Buy 20 perk levels' },
  { id: 'pk2', t: 1, k: 'pkmax', n: 1, name: 'Top Perk', text: 'Max out a perk' },
  { id: 'pk3', t: 2, k: 'pkmax', n: 4, name: 'Master Manager', text: 'Max out 4 perks' }
];
var ACH_TIER = [{ name: 'Bronze', gems: 5 }, { name: 'Silver', gems: 15 }, { name: 'Gold', gems: 40, sales: 0.01 }];
var ACH_CAP = 0.1;

// Main Street Mix: bundled songs in assets/music/<f>.m4a (Pixabay Content License), shuffled
var MIX = [
  { f: 'positive-easy-listening', t: 'Positive Easy Listening', a: '331music' },
  { f: 'feel-good-feel-good', t: 'Feel Good - Feel Good Music', a: 'STAROSTIN' },
  { f: 'upbeat-upbeat-music', t: 'Upbeat - Upbeat Music', a: 'ViacheslavStarostin' },
  { f: 'happy-happy-music', t: 'Happy - Happy Music', a: 'kulishov' },
  { f: 'pop-light', t: 'Pop Light', a: '331music' },
  { f: 'shopping-shopping-music', t: 'Shopping - Shopping Music', a: 'iepmusic' },
  { f: 'summer-pop', t: 'Summer Pop', a: 'Caldena' },
  { f: 'ukulele-circus-funk', t: 'Ukulele Circus Funk', a: '51604229' },
  { f: 'cheerful-cheerful-music', t: 'Cheerful - Cheerful Music', a: 'JonasBlakewood' },
  { f: 'indie-pop', t: 'Indie Pop', a: 'AtlasAudio' },
  { f: 'fun-jazz-background', t: 'Fun Jazz Background', a: '51604229' },
  { f: 'country-pop', t: 'Country Pop', a: 'Music_for_Creators' }
];

// Live radio. A station's urls are tried in order; .m3u8 ones are HLS, which the apps and Safari play. g is the group
// shown in the Radio panel, RADIO_LANG the group suggested for a phone language.
var RADIO_LANG = { en: 'USA', 'en-ca': 'Canada', 'fr-ca': 'Canada', 'en-gb': 'UK', 'en-au': 'Australia', 'en-ng': 'Nigeria', 'en-za': 'South Africa', 'en-ke': 'Kenya', 'en-gh': 'Ghana',
  tr: 'Turkey', de: 'Germany', fr: 'France', nl: 'Netherlands', ar: 'Arabic', es: 'Latin', 'es-es': 'Spain', 'es-mx': 'Mexico', pt: 'Brazil', it: 'Italy', pl: 'Poland', el: 'Greece',
  ru: 'Russia', sv: 'Scandinavia', nb: 'Scandinavia', no: 'Scandinavia', da: 'Scandinavia', hi: 'India', zh: 'China', ja: 'Japan', ko: 'Korea', fil: 'Philippines', id: 'Indonesia', vi: 'Vietnam' };
var RADIO = [
  { id: 'kiis', g: 'USA', name: 'KIIS FM', line: 'Pop hits from Los Angeles', web: 'https://www.iheart.com/live/kiis-fm-185/', urls: ['https://stream.revma.ihrhls.com/zc185'] },
  { id: 'lite', g: 'USA', name: 'Lite FM 93.9', line: 'Adult contemporary from Chicago', web: 'https://www.iheart.com/live/939-lite-fm-853/', urls: ['https://stream.revma.ihrhls.com/zc853'] },
  { id: 'hot97', g: 'USA', name: 'Hot 97', line: 'Hip-hop and R&B from New York', web: 'https://www.hot97.com/', urls: ['https://18313.live.streamtheworld.com/WQHTFMAAC.aac'] },
  { id: 'oldies', g: 'USA', name: '181.FM Great Oldies', line: 'Pop oldies', web: 'https://www.181.fm/', urls: ['https://listen.181fm.com/181-greatoldies_128k.mp3'] },
  { id: 'poptron', g: 'USA', name: 'SomaFM PopTron', line: 'Electropop and indie dance', web: 'https://somafm.com/poptron/', urls: ['https://ice6.somafm.com/poptron-128-mp3', 'https://ice2.somafm.com/poptron-128-aac'] },
  { id: 'cbcmusic', g: 'Canada', name: 'CBC Music', line: 'Canadian music from Toronto', web: 'https://www.cbc.ca/listen/live-radio', urls: ['https://26373.live.streamtheworld.com/CBLFM_CBC_SC', 'https://26733.live.streamtheworld.com/CBUFM_CBC_SC'] },
  { id: 'cbc1', g: 'Canada', name: 'CBC Radio One', line: 'News, talk and music from Toronto', web: 'https://www.cbc.ca/listen/live-radio', urls: ['https://17813.live.streamtheworld.com/CBLAFM_CBC_SC', 'https://22983.live.streamtheworld.com/CBU2FM_CBC_SC'] },
  { id: 'kiss1053', g: 'Canada', name: 'Kiss 105.3', line: 'Pop hits from Ottawa', web: 'https://www.kiss1053.com/', urls: ['https://rogers.leanstream.co/rogers/ott1053.stream/icy'] },
  { id: 'capital', g: 'UK', name: 'Capital', line: 'Pop hits', web: 'https://www.capitalfm.com/', urls: ['https://media-ssl.musicradio.com/CapitalMP3', 'https://media-ssl.musicradio.com/CapitalUK'] },
  { id: 'heart80', g: 'UK', name: 'Heart 80s', line: 'Pop hits of the 80s', web: 'https://www.heart.co.uk/', urls: ['https://media-ssl.musicradio.com/Heart80sMP3'] },
  { id: 'heart90', g: 'UK', name: 'Heart 90s', line: 'Pop hits of the 90s', web: 'https://www.heart.co.uk/', urls: ['https://media-ssl.musicradio.com/Heart90sMP3'] },
  { id: 'heartdance', g: 'UK', name: 'Heart Dance', line: 'Dance hits', web: 'https://www.heart.co.uk/', urls: ['https://media-ssl.musicradio.com/HeartDanceMP3'] },
  { id: 'gold', g: 'UK', name: 'Gold', line: 'Classic pop hits', web: 'https://www.thisisgold.com/', urls: ['https://media-ssl.musicradio.com/GoldMP3'] },
  { id: 'exa', g: 'Mexico', name: 'Exa FM', line: 'Pop hits from Mexicali', web: 'https://www.exafm.com/', urls: ['https://playerservices.streamtheworld.com/api/livestream-redirect/XHJCFM_SC'] },
  { id: 'mejorcdmx', g: 'Mexico', name: 'La Mejor 97.7', line: 'Regional Mexican from Mexico City', web: 'https://www.lamejor.com.mx/', urls: ['https://playerservices.streamtheworld.com/api/livestream-redirect/XERCFM_SC'] },
  { id: 'mejormty', g: 'Mexico', name: 'La Mejor 92.5', line: 'Regional Mexican from Monterrey', web: 'https://www.lamejor.com.mx/', urls: ['https://playerservices.streamtheworld.com/api/livestream-redirect/XHSROFM_SC'] },
  { id: 'r710', g: 'Mexico', name: 'Radio 710', line: 'Mexican music', web: 'https://www.imer.mx/', urls: ['https://s2.mexside.net/8028/stream'] },
  { id: 'los40co', g: 'Latin', name: 'LOS40 Colombia', line: 'Latin pop hits', web: 'https://los40.com.co/', urls: ['https://playerservices.streamtheworld.com/api/livestream-redirect/LOS40_COLOMBIA.mp3', 'https://playerservices.streamtheworld.com/api/livestream-redirect/LOS40_COLOMBIAAAC.aac'] },
  { id: 'rockpop', g: 'Latin', name: 'Rock & Pop', line: 'Pop and rock from Buenos Aires', web: 'https://www.rockandpop.com.ar/', urls: ['https://playerservices.streamtheworld.com/api/livestream-redirect/ROCKANDPOPAAC.aac'] },
  { id: 'reggaeton', g: 'Latin', name: 'Latina Reggaeton', line: 'Reggaeton', web: 'https://www.latina.fr/', urls: ['https://latinareggaeton.ice.infomaniak.ch/latinareggaeton.mp3'] },
  { id: 'lamega', g: 'Latin', name: 'La Mega 97.9', line: 'Tropical and urban from New York', web: 'https://www.lamega.com/', urls: ['https://liveaudio.lamusica.com/NY_WSKQ_icy'] },
  { id: 'clube', g: 'Brazil', name: 'Clube FM 99.1', line: 'Brazilian pop hits', web: 'https://www.clubefm.com.br/', urls: ['https://radio.saopaulo01.com.br:10913/stream'] },
  { id: 'bons', g: 'Brazil', name: 'Bons Tempos FM', line: 'Nostalgic pop and rock', web: 'https://www.bonstemposfm.com.br/', urls: ['https://server02.ouvir.radio.br:8050/stream'] },
  { id: 'fita', g: 'Brazil', name: 'Fita Cassete', line: 'Flashback hits', web: 'https://www.fitacassete.com.br/', urls: ['https://server01.ouvir.radio.br:8018/stream'] },
  { id: 'mgt', g: 'Brazil', name: 'Rádio MGT Sertanejo', line: 'Sertanejo', web: 'https://www.mgtradio.net/', urls: ['https://cast.mgtradio.net/radio/8000/aac'] },
  { id: 'zipfm', g: 'Caribbean', name: 'Zip FM 103', line: 'Hits and dancehall from Jamaica', web: 'https://www.zipfm.com/', urls: ['https://stream.zeno.fm/c0ytcn43vxquv'] },
  { id: 'radiojam', g: 'Caribbean', name: 'Radio Jamaica 94 FM', line: 'Jamaican and Caribbean music', web: 'https://radiojamaicanewsonline.com/', urls: ['https://stream.zeno.fm/ebqnzkvyv9duv'] },
  { id: 'scorch', g: 'Caribbean', name: 'Scorch Radio 101.1', line: 'Soca from Trinidad', web: 'https://www.scorch.fm/', urls: ['https://stream.velalabs.co/scorch'] },
  { id: 'unityxm', g: 'Caribbean', name: 'UnityXM', line: 'Dancehall and reggae', web: 'https://unityxm.com/', urls: ['https://a8.asurahosting.com:7430/radio.mp3'] },
  { id: 'los40', g: 'Spain', name: 'LOS40', line: 'Pop hits from Spain', web: 'https://los40.com/', urls: ['https://playerservices.streamtheworld.com/api/livestream-redirect/LOS40.mp3'] },
  { id: 'los40classic', g: 'Spain', name: 'LOS40 Classic', line: 'Pop and rock classics', web: 'https://los40.com/', urls: ['https://playerservices.streamtheworld.com/api/livestream-redirect/LOS40_CLASSIC.mp3'] },
  { id: 'kissfm', g: 'Spain', name: 'Kiss FM', line: '80s, 90s and more', web: 'https://kissfm.es/', urls: ['https://bbkissfm.kissfmradio.cires21.com/bbkissfm.mp3'] },
  { id: 'flaix', g: 'Spain', name: 'Flaix FM', line: 'Dance and urban from Catalonia', web: 'https://www.flaixfm.cat/', urls: ['https://stream.flaixfm.cat/icecast'] },
  { id: 'fip', g: 'France', name: 'FIP', line: 'Eclectic, from jazz to pop', web: 'https://www.radiofrance.fr/fip', urls: ['https://icecast.radiofrance.fr/fip-midfi.mp3', 'https://icecast.radiofrance.fr/fip-lofi.aac'] },
  { id: 'nrj', g: 'France', name: 'NRJ', line: 'Pop hits', web: 'https://www.nrj.fr/', urls: ['https://streaming.nrjaudio.fm/ou7xugf3s5gi', 'https://streaming.nrjaudio.fm/ou5k6tirv93h'] },
  { id: 'rtl2', g: 'France', name: 'RTL 2', line: 'Pop and rock', web: 'https://www.rtl2.fr/', urls: ['https://icecast.rtl.fr/rtl2-1-44-128'] },
  { id: 'fun', g: 'France', name: 'Fun Radio', line: 'Dance and pop', web: 'https://www.funradio.fr/', urls: ['https://icecast.funradio.fr/fun-1-44-128'] },
  { id: 'rfm', g: 'France', name: 'RFM', line: 'Easy pop', web: 'https://rfm.fr/', urls: ['https://stream.rfm.fr/rfm-wr3.aac'] },
  { id: 'antenne', g: 'Germany', name: 'Antenne Bayern', line: 'Pop and rock hits', web: 'https://www.antenne.de/', urls: ['https://stream.antenne.de/antenne/stream/mp3'] },
  { id: 'swr3', g: 'Germany', name: 'SWR3', line: 'Pop hits', web: 'https://www.swr3.de/', urls: ['https://liveradio.swr.de/sw282p3/swr3/play.mp3', 'https://liveradio.swr.de/sw331ch/swr3/play.aac'] },
  { id: 'bayern3', g: 'Germany', name: 'Bayern 3', line: 'Pop hits', web: 'https://www.br.de/radio/bayern3/', urls: ['https://dispatcher.rndfnk.com/br/br3/live/mp3/mid'] },
  { id: '1live', g: 'Germany', name: '1LIVE', line: 'Young pop and charts', web: 'https://www1.wdr.de/radio/1live/', urls: ['https://wdr-1live-live.icecastssl.wdr.de/wdr/1live/live/mp3/128/stream.mp3'] },
  { id: 'ndr2', g: 'Germany', name: 'NDR 2', line: 'Pop hits from the north', web: 'https://www.ndr.de/ndr2/', urls: ['https://icecast.ndr.de/ndr/ndr2/niedersachsen/mp3/128/stream.mp3'] },
  { id: 'italia80', g: 'Italy', name: 'Italia 80', line: 'Italian hits of the 80s', web: 'https://www.radioitalia.it/', urls: ['https://icy.unitedradio.it/um016.mp3'] },
  { id: 'rtl1025', g: 'Italy', name: 'RTL 102.5 Best', line: 'Pop hits', web: 'https://www.rtl.it/', urls: ['https://streamingv2.shoutcast.com/rtl-1025-best', 'https://streamingv2.shoutcast.com/rtl-1025-best_48.aac'] },
  { id: 'italia70', g: 'Italy', name: 'Italia 70', line: 'Italian hits of the 70s', web: 'https://www.radioitalia.it/', urls: ['https://icy.unitedradio.it/um020.mp3'] },
  { id: 'lolli', g: 'Italy', name: 'Lolliradio Italia', line: 'Italian pop', web: 'https://www.lolliradio.net/', urls: ['https://stream.lolliradio.net/lolli_italia.mp3'] },
  { id: 'radio2', g: 'Netherlands', name: 'NPO Radio 2', line: 'Pop and rock classics', web: 'https://www.nporadio2.nl/', urls: ['https://icecast.omroep.nl/radio2-bb-mp3'] },
  { id: '3fm', g: 'Netherlands', name: 'NPO 3FM', line: 'New pop and alternative', web: 'https://www.npo3fm.nl/', urls: ['https://icecast.omroep.nl/3fm-bb-mp3'] },
  { id: 'qmusic', g: 'Netherlands', name: 'Qmusic', line: 'Pop hits', web: 'https://qmusic.nl/', urls: ['https://stream.qmusic.nl/qmusic/mp3', 'https://icecast-qmusicnl-cdp.triple-it.nl/Qmusic_nl_live.mp3'] },
  { id: '538', g: 'Netherlands', name: 'Radio 538', line: 'Pop and dance hits', web: 'https://www.538.nl/', urls: ['https://playerservices.streamtheworld.com/api/livestream-redirect/RADIO538.mp3'] },
  { id: 'sky', g: 'Netherlands', name: 'Sky Radio', line: 'Easy pop', web: 'https://www.skyradio.nl/', urls: ['https://playerservices.streamtheworld.com/api/livestream-redirect/SRGSTR01.mp3', 'https://www.mp3streams.nl/zender/skyradio/stream/8-mp3-128'] },
  { id: 'srp3', g: 'Scandinavia', name: 'Sveriges Radio P3', line: 'Pop from Sweden', web: 'https://sverigesradio.se/p3', urls: ['https://live1.sr.se/p3-mp3-96', 'https://live1.sr.se/p3-aac-320'] },
  { id: 'megapol', g: 'Scandinavia', name: 'Mix Megapol', line: 'Pop hits from Sweden', web: 'https://mixmegapol.se/', urls: ['https://live-bauerse-fm.sharp-stream.com/mixmegapol_instream_se_mp3'] },
  { id: 'p5hits', g: 'Scandinavia', name: 'P5 Hits', line: 'Pop hits from Norway', web: 'https://p5.no/', urls: ['https://p5.p4groupaudio.com/P05_MM', 'https://p5n.p4groupaudio.com/P05AAH'] },
  { id: 'p12', g: 'Scandinavia', name: 'P12 Hitmix', line: 'Hits from Norway', web: 'https://p12.no/', urls: ['https://nrj.p4groupaudio.com/NRJ_MM', 'https://nrj.p4groupaudio.com/NRJ_AH'] },
  { id: 'rmf', g: 'Poland', name: 'RMF FM', line: 'Pop hits', web: 'https://www.rmf.fm/', urls: ['https://rs201-krk.rmfstream.pl/rmf_fm'] },
  { id: 'zet', g: 'Poland', name: 'Radio ZET', line: 'Pop hits', web: 'https://www.radiozet.pl/', urls: ['https://zt01.cdn.eurozet.pl/zet-net.mp3', 'https://r.dcs.redcdn.pl/sc/o2/Eurozet/live/audio.livx?audio=5'] },
  { id: 'eska', g: 'Poland', name: 'Radio Eska', line: 'Pop hits from Warsaw', web: 'https://www.eska.pl/', urls: ['https://waw.ic.smcdn.pl/2380-1.mp3'] },
  { id: 'chilli', g: 'Poland', name: 'Chilli ZET', line: 'Easy pop', web: 'https://chillizet.pl/', urls: ['https://ch.cdn.eurozet.pl/chi-net.mp3'] },
  { id: 'athensdj', g: 'Greece', name: 'Athens DeeJay 95.2', line: 'Pop hits', web: 'https://www.athensdeejay.gr/', urls: ['https://stream.rcs.revma.com/f663xvvehkcwv'] },
  { id: 'sfera', g: 'Greece', name: 'Sfera 102.2', line: 'Greek pop', web: 'https://www.sfera.gr/', urls: ['https://sfera.live24.gr/sfera4132'] },
  { id: 'easy972', g: 'Greece', name: 'Easy 97.2', line: 'Pop and soft rock', web: 'https://www.easy972.gr/', urls: ['https://stream.radiojar.com/cthtwxk5yvduv.mp3'] },
  { id: 'pepper', g: 'Greece', name: 'Pepper 96.6', line: 'Easy listening', web: 'https://www.pepper966.gr/', urls: ['https://stream.radiojar.com/pepper'] },
  { id: 'rusradio', g: 'Russia', name: 'Русское Радио', line: 'Russian pop', web: 'https://rusradio.ru/', urls: ['https://rusradio.hostingradio.ru/rusradio96.aacp'] },
  { id: 'dfmdance', g: 'Russia', name: 'DFM Russian Dance', line: 'Russian dance hits', web: 'https://www.dfm.ru/', urls: ['https://dfm-dfmrusdance.hostingradio.ru/dfmrusdance96.aacp'] },
  { id: 'dfm90', g: 'Russia', name: 'DFM Дискач 90-х', line: 'Eurodance of the 90s', web: 'https://www.dfm.ru/', urls: ['https://dfm-disc90.hostingradio.ru/disc9096.aacp'] },
  { id: 'vanya', g: 'Russia', name: 'Радио Ваня', line: 'Russian chanson and pop', web: 'https://www.radiovanya.ru/', urls: ['https://icecast-radiovanya.cdnvideo.ru/radiovanya'] },
  { id: 'kral', g: 'Turkey', name: 'Kral FM', line: 'Turkish pop hits', web: 'https://www.kralfm.com.tr/', urls: ['https://dygedge2.radyotvonline.net/kralfm/playlist.m3u8'] },
  { id: 'power', g: 'Turkey', name: 'Power Türk', line: 'Turkish pop hits', web: 'https://www.powerapp.com.tr/', urls: ['https://listen.powerapp.com.tr/powerturk/mpeg/icecast.audio', 'https://live.powerapp.com.tr/powerturk/abr/playlist.m3u8'] },
  { id: 'joy', g: 'Turkey', name: 'Joy Türk', line: 'Turkish and world hits', web: 'https://www.joyturk.com.tr/', urls: ['https://playerservices.streamtheworld.com/api/livestream-redirect/JOY_TURK_SC', 'https://playerservices.streamtheworld.com/api/livestream-redirect/JOY_TURK_ITUNES.mp3'] },
  { id: 'best', g: 'Turkey', name: 'Best FM', line: 'Turkish pop', web: 'https://www.bestfm.com.tr/', urls: ['https://ssldyg.radyotvonline.com/best/bestfm.stream/playlist.m3u8'] },
  { id: 'trtfm', g: 'Turkey', name: 'TRT FM', line: 'Turkish pop from the state broadcaster', web: 'https://www.trt.net.tr/', urls: ['https://trt.radyotvonline.net/trtfm'] },
  { id: 'metro', g: 'Turkey', name: 'Metro FM', line: 'Turkish and world pop', web: 'https://www.metrofm.com.tr/', urls: ['https://playerservices.streamtheworld.com/api/livestream-redirect/METRO_FM_SC'] },
  { id: 'mcd', g: 'Arabic', name: 'Monte Carlo Doualiya', line: 'Arabic pop and talk', web: 'https://www.mc-doualiya.com/', urls: ['https://montecarlodoualiya128k.ice.infomaniak.ch/mc-doualiya.mp3'] },
  { id: 'arabmix', g: 'Arabic', name: 'Arab Mix FM', line: 'Arabic hits', web: 'https://zeno.fm/radio/arab-mix-fm/', urls: ['https://stream.zeno.fm/na3vpvn10qruv', 'https://stream-29.zeno.fm/na3vpvn10qruv'] },
  { id: 'nogoum', g: 'Arabic', name: 'Nogoum FM', line: 'Egyptian pop', web: 'https://zeno.fm/radio/nogoum-fm/', urls: ['https://stream-159.zeno.fm/qb1zvsykm98uv'] },
  { id: 'gaane', g: 'India', name: 'Bollywood Gaane Purane', line: 'Old Bollywood songs', web: 'https://zeno.fm/radio/filmy-mirchi/', urls: ['https://stream.zeno.fm/6n6ewddtad0uv', 'https://stream-142.zeno.fm/6n6ewddtad0uv'] },
  { id: 'bolly10', g: 'India', name: 'Bollywood 2010s', line: 'Bollywood hits of the 2010s', web: 'https://drive.uber.radio/', urls: ['https://drive.uber.radio/uber/bollywood2010s/icecast.audio'] },
  { id: 'hungama', g: 'India', name: 'Radio Hungama Dil Se', line: 'Bollywood hits', web: 'https://www.hungama.com/', urls: ['https://stream.zeno.fm/143d7gty24zuv'] },
  { id: 'hindigold', g: 'India', name: 'Hindi Gold', line: 'Hindi film classics', web: 'https://vibesounds.in/', urls: ['https://azuracast.vibesounds.in:8010/radio.mp3'] },
  { id: 'qt1', g: 'China', name: '清晨音乐台', line: 'Mandarin pop', web: 'https://www.qingting.fm/', urls: ['https://lhttp.qingting.fm/live/4915/64k.mp3'] },
  { id: 'qt2', g: 'China', name: '广东音乐之声', line: 'Mandarin and Cantonese pop', web: 'https://www.qingting.fm/', urls: ['https://lhttp.qtfm.cn/live/1260/64k.mp3'] },
  { id: 'asiafm', g: 'China', name: 'AsiaFM 亚洲音乐台', line: 'Asian pop', web: 'https://www.qingting.fm/', urls: ['https://lhttp.qingting.fm/live/4581/64k.mp3'] },
  { id: 'asiafm2', g: 'China', name: 'AsiaFM 亚洲经典台', line: 'Asian pop classics', web: 'https://www.qingting.fm/', urls: ['https://lhttp.qingting.fm/live/5021912/64k.mp3'] },
  { id: 'jpop', g: 'Japan', name: 'J-Pop Powerplay', line: 'Japanese pop', web: 'https://asiadreamradio.torontocast.stream/', urls: ['https://kathy.torontocast.com:3560/'] },
  { id: 'kawaii', g: 'Japan', name: 'J-Pop Powerplay Kawaii', line: 'Kawaii J-pop', web: 'https://asiadreamradio.torontocast.stream/', urls: ['https://kathy.torontocast.com:3060/;?shoutcast'] },
  { id: 'sakura', g: 'Japan', name: 'J-Pop Sakura', line: 'Japanese pop classics', web: 'https://asiadreamradio.torontocast.stream/', urls: ['https://quincy.torontocast.com:2070/stream.mp3'] },
  { id: 'bigb', g: 'Korea', name: 'Big B Radio K-pop', line: 'K-pop', web: 'https://bigbradio.net/', urls: ['https://antares.dribbcast.com/proxy/kpop?mp=/s'] },
  { id: 'moekpop', g: 'Korea', name: 'LISTEN.moe K-pop', line: 'K-pop', web: 'https://listen.moe/', urls: ['https://listen.moe/kpop/fallback'] },
  { id: 'cbsmusic', g: 'Korea', name: 'CBS Music FM', line: 'Korean pop', web: 'https://www.cbs.co.kr/', urls: ['https://lhttp-hw.qtfm.cn/live/15318233/64k.mp3'] },
  { id: 'love983', g: 'Philippines', name: 'Love Radio 98.3', line: 'OPM and pop', web: 'https://www.loveradio.com.ph/', urls: ['https://loveradiodagupan.radioca.st/'] },
  { id: 'love1007', g: 'Philippines', name: 'Love Radio 100.7', line: 'OPM and pop', web: 'https://www.loveradio.com.ph/', urls: ['https://loveradiolucena.radioca.st/'] },
  { id: 'winradio', g: 'Philippines', name: 'Win Radio Davao', line: 'Contemporary hits', web: 'https://winradio.ph/', urls: ['https://stream-42.zeno.fm/1noxhem5qpkuv'] },
  { id: 'budots', g: 'Philippines', name: 'Budots FM 98.9', line: 'Budots remixes', web: 'https://zeno.fm/radio/budots-fm/', urls: ['https://stream.zeno.fm/2uhuu5hvzqzuv'] },
  { id: 'sbfm', g: 'Indonesia', name: 'SB FM Tembang Kenangan', line: 'Indonesian pop classics', web: 'https://zeno.fm/radio/sb-fm/', urls: ['https://stream.zeno.fm/d16n50mkzhhvv'] },
  { id: 'mstream', g: 'Indonesia', name: 'M-Stream Indo', line: 'Indonesian pop and indie', web: 'https://zeno.fm/radio/m-stream-indo/', urls: ['https://stream.zeno.fm/iln4upodbvuuv'] },
  { id: 'rama', g: 'Indonesia', name: 'Rama FM Bandung', line: 'Indonesian pop', web: 'https://www.ramafm.com/', urls: ['https://i.klikhost.com/8330/;'] },
  { id: 'imelda', g: 'Indonesia', name: 'Imelda FM', line: 'Indonesian classics', web: 'https://www.radioimeldafm.co.id/', urls: ['https://server.radioimeldafm.co.id:8030/imeldafm'] },
  { id: 'mradio', g: 'Vietnam', name: 'M Radio Vietnam', line: 'Vietnamese pop', web: 'https://zeno.fm/radio/m-radio-vietnam/', urls: ['https://stream-155.zeno.fm/4q7y9hvkp2zuv'] },
  { id: 'cherry', g: 'Vietnam', name: 'Cherry Radio Music', line: 'Vietnamese pop', web: 'https://zeno.fm/radio/cherry-radio-music-247/', urls: ['https://stream-176.zeno.fm/umt5gqmg3reuv'] },
  { id: 'hanoi', g: 'Vietnam', name: 'Hà Nội Community Radio', line: 'Music from Hanoi', web: 'https://hanoicommunityradio.com/', urls: ['https://ha-noi-community-radio.radiocult.fm/stream'] },
  { id: 'kiis1065', g: 'Australia', name: 'KIIS 106.5', line: 'Pop hits from Sydney', web: 'https://www.kiis1065.com.au/', urls: ['https://ais-arn.streamguys1.com/au_007_icy'] },
  { id: 'kiis1011', g: 'Australia', name: 'KIIS 101.1', line: 'Pop hits from Melbourne', web: 'https://www.kiis1011.com.au/', urls: ['https://ais-arn.streamguys1.com/au_001_icy'] },
  { id: 'nova919', g: 'Australia', name: 'Nova 91.9', line: 'Hits from Adelaide', web: 'https://www.novafm.com.au/', urls: ['https://playerservices.streamtheworld.com/api/livestream-redirect/NOVA_919_AAC48.aac'] },
  { id: 'gold1043', g: 'Australia', name: 'Gold 104.3', line: 'Classic hits from Melbourne', web: 'https://www.gold1043.com.au/', urls: ['https://ais-arn.streamguys1.com/au_004_icy'] },
  { id: 'coolfm', g: 'Nigeria', name: 'Cool FM Lagos 96.9', line: 'Pop and Afrobeats', web: 'https://www.coolfm.ng/', urls: ['https://coolfmlagos969-atunwadigital.streamguys1.com/coolfmlagos969'] },
  { id: 'wazobia', g: 'Nigeria', name: 'Wazobia FM Lagos', line: 'Afrobeats and pidgin pop', web: 'https://www.wazobiafm.com/', urls: ['https://wazobiafmlagos951-atunwadigital.streamguys1.com/wazobiafmlagos951'] },
  { id: 'softlife', g: 'Nigeria', name: 'Softlife Afrofusion Radio', line: 'Afrobeats and afrofusion', web: 'https://softlife.radio/', urls: ['https://a10.asurahosting.com:7540/radio.mp3'] },
  { id: 'amapiano', g: 'South Africa', name: 'Amapiano FM', line: 'Amapiano', web: 'https://zeno.fm/radio/amapiano-fm/', urls: ['https://stream.zeno.fm/xs6zeac1ts8uv'] },
  { id: 'lekker', g: 'South Africa', name: 'Lekker FM', line: 'Top 40', web: 'https://www.lekkerfm.co.za/', urls: ['https://zas3.ndx.co.za:8002/stream'] },
  { id: 'jacaranda', g: 'South Africa', name: 'Jacaranda FM', line: 'Pop hits', web: 'https://www.jacarandafm.com/', urls: ['https://edge.iono.fm/xice/jacarandafm_live_high.mp3'] },
  { id: 'ecgold', g: 'South Africa', name: 'East Coast Gold', line: 'Classic hits', web: 'https://www.ecr.co.za/', urls: ['https://live.ecr.co.za/ecrgoldhigh.mp3'] },
  { id: 'easy1015', g: 'Kenya', name: 'Easy FM 101.5', line: 'Soul and pop', web: 'https://zeno.fm/radio/easy-fm-101-5/', urls: ['https://stream.zeno.fm/wvw02zaqpxquv'] },
  { id: 'capitalke', g: 'Kenya', name: 'Capital FM 98.4', line: 'Hits from Nairobi', web: 'https://www.capitalfm.co.ke/', urls: ['https://atunwadigital.streamguys1.com/capitalfm'] },
  { id: 'hitzgh', g: 'Ghana', name: 'Hitz 103.9', line: 'Hits from Accra', web: 'https://www.hitzfmonline.com/', urls: ['https://mmg.streamguys1.com/HitzFM-mp3'] },
  { id: 'ghmusic', g: 'Ghana', name: 'Ghana Music Radio', line: 'Ghanaian music', web: 'https://ghanamusic.com/', urls: ['https://streaming.radio.co/s92f890821/listen'] }
];
