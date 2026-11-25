// Departments in unlock order. c0: price of the first upgrade (the unlock), g: price growth per upgrade, s: what every
// shopper spends there per upgrade, w: a stocker's one-way walk there from the stockroom in seconds. ic: sprite shown
// on the row.
var BIZ = [
  { id: 'produce', name: tl('dept.produce'), ic: 'food/apple', c0: 4, g: 1.165, s: 6, w: 18.8 },
  { id: 'bakery', name: tl('dept.bakery'), ic: 'food/croissant', c0: 35, g: 1.202, s: 1.29, w: 14 },
  { id: 'dairy', name: tl('dept.dairy'), ic: 'food/cheese', c0: 320, g: 1.169, s: 11, w: 8.1 },
  { id: 'meat', name: tl('dept.meat'), ic: 'food/meat-raw', c0: 3500, g: 1.201, s: 94, w: 10.4 },
  { id: 'frozen', name: tl('dept.frozen'), ic: 'food/ice-cream', c0: 73000, g: 1.135, s: 804, w: 7.6 },
  { id: 'pantry', name: tl('dept.pantry'), ic: 'food/can', c0: 4.5e6, g: 1.1, s: 6860, w: 16.8 },
  { id: 'snacks', name: tl('dept.snacks'), ic: 'food/soda-bottle', c0: 6.1e6, g: 1.156, s: 58700, w: 13.2 },
  { id: 'toys', name: tl('dept.toys'), ic: 'holiday/present-a-cube', c0: 6e7, g: 1.171, s: 5.01e5, w: 14.4 },
  { id: 'tech', name: tl('dept.tech'), ic: 'furn/televisionModern', c0: 8.5e8, g: 1.134, s: 4.29e6, w: 10 },
  { id: 'kitchen', name: tl('dept.kitchen'), ic: 'food/frying-pan', c0: 9e9, g: 1.16, s: 3.66e7, w: 9.2 },
  { id: 'clothes', name: tl('dept.clothes'), ic: 'shop/clothing-rack', c0: 9e10, g: 1.165, s: 3.13e8, w: 17.5 },
  { id: 'home', name: tl('dept.home'), ic: 'furn/loungeSofa', c0: 9e11, g: 1.165, s: 2.65e9, w: 16.3 },
  { id: 'office', name: tl('dept.office'), ic: 'furn/books', c0: 9e12, g: 1.165, s: 2.25e10, w: 12.1 },
  { id: 'pets', name: tl('dept.pets'), ic: 'pets/animal-dog', c0: 9e13, g: 1.165, s: 1.9e11, w: 11.2 },
  { id: 'sports', name: tl('dept.sports'), ic: 'surv/tent-canvas', c0: 9e14, g: 1.165, s: 1.6e12, w: 14.6 },
  { id: 'tools', name: tl('dept.tools'), ic: 'surv/tool-hammer', c0: 9e15, g: 1.165, s: 1.4e13, w: 10.7 },
  { id: 'auto', name: tl('dept.auto'), ic: 'car/wheel-default', c0: 9e16, g: 1.165, s: 1.2e14, w: 11.2 },
  { id: 'seasonal', name: tl('dept.seasonal'), ic: 'holiday/tree-decorated', c0: 9e17, g: 1.165, s: 1e15, w: 20.3 }
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
  produce: { it: [[tl('item.produce.0'), 'sell'], [tl('item.produce.1'), 'sell'], [tl('item.produce.2'), 'sell'], [tl('item.produce.3'), 'draw'], [tl('item.produce.4'), 'draw'], [tl('item.produce.5'), 'staff']],
    of: '020030120532110221132023544443' },
  bakery: { it: [[tl('item.bakery.0'), 'sell'], [tl('item.bakery.1'), 'sell'], [tl('item.bakery.2'), 'sell'], [tl('item.bakery.3'), 'draw'], [tl('item.bakery.4'), 'staff']],
    of: '110031100422221100033113433232' },
  dairy: { it: [[tl('item.dairy.0'), 'sell'], [tl('item.dairy.1'), 'sell'], [tl('item.dairy.2'), 'draw'], [tl('item.dairy.3'), 'draw'], [tl('item.dairy.4'), 'staff']],
    of: '000020001411111123323133432322' },
  meat: { it: [[tl('item.meat.0'), 'sell'], [tl('item.meat.1'), 'sell'], [tl('item.meat.2'), 'sell'], [tl('item.meat.3'), 'draw'], [tl('item.meat.4'), 'draw'], [tl('item.meat.5'), 'staff']],
    of: '000031111512220000334424543441' },
  frozen: { it: [[tl('item.frozen.0'), 'sell'], [tl('item.frozen.1'), 'sell'], [tl('item.frozen.2'), 'draw'], [tl('item.frozen.3'), 'draw'], [tl('item.frozen.4'), 'staff']],
    of: '000020011411121333023301413131' },
  pantry: { it: [[tl('item.pantry.0'), 'sell'], [tl('item.pantry.1'), 'sell'], [tl('item.pantry.2'), 'sell'], [tl('item.pantry.3'), 'sell'], [tl('item.pantry.4'), 'draw'], [tl('item.pantry.5'), 'staff']],
    of: '020040002533112111142243543330' },
  snacks: { it: [[tl('item.snacks.0'), 'sell'], [tl('item.snacks.1'), 'sell'], [tl('item.snacks.2'), 'sell'], [tl('item.snacks.3'), 'sell'], [tl('item.snacks.4'), 'draw'], [tl('item.snacks.5'), 'staff']],
    of: '020041112533002111042243534431' },
  toys: { it: [[tl('item.toys.0'), 'sell'], [tl('item.toys.1'), 'sell'], [tl('item.toys.2'), 'sell'], [tl('item.toys.3'), 'draw'], [tl('item.toys.4'), 'staff']],
    of: '000131212412010013033222422331' },
  tech: { it: [[tl('item.tech.0'), 'sell'], [tl('item.tech.1'), 'sell'], [tl('item.tech.2'), 'sell'], [tl('item.tech.3'), 'sell'], [tl('item.tech.4'), 'draw'], [tl('item.tech.5'), 'staff']],
    of: '010042030530100434243234522433' },
  kitchen: { it: [[tl('item.kitchen.0'), 'sell'], [tl('item.kitchen.1'), 'sell'], [tl('item.kitchen.2'), 'sell'], [tl('item.kitchen.3'), 'sell'], [tl('item.kitchen.4'), 'draw'], [tl('item.kitchen.5'), 'staff']],
    of: '000341132522000114242401510241' },
  clothes: { it: [[tl('item.clothes.0'), 'sell'], [tl('item.clothes.1'), 'sell'], [tl('item.clothes.2'), 'sell'], [tl('item.clothes.3'), 'draw'], [tl('item.clothes.4'), 'draw'], [tl('item.clothes.5'), 'staff']],
    of: '012030102511002122232442544443' },
  home: { it: [[tl('item.home.0'), 'sell'], [tl('item.home.1'), 'sell'], [tl('item.home.2'), 'sell'], [tl('item.home.3'), 'draw'], [tl('item.home.4'), 'staff']],
    of: '000130213422120012033213433211' },
  office: { it: [[tl('item.office.0'), 'sell'], [tl('item.office.1'), 'sell'], [tl('item.office.2'), 'sell'], [tl('item.office.3'), 'draw'], [tl('item.office.4'), 'staff']],
    of: '000131112422030031133233432102' },
  pets: { it: [[tl('item.pets.0'), 'sell'], [tl('item.pets.1'), 'sell'], [tl('item.pets.2'), 'sell'], [tl('item.pets.3'), 'sell'], [tl('item.pets.4'), 'draw'], [tl('item.pets.5'), 'staff']],
    of: '020040002523113111142233544423' },
  sports: { it: [[tl('item.sports.0'), 'sell'], [tl('item.sports.1'), 'sell'], [tl('item.sports.2'), 'sell'], [tl('item.sports.3'), 'draw'], [tl('item.sports.4'), 'draw'], [tl('item.sports.5'), 'staff']],
    of: '202031011524243441434021534122' },
  tools: { it: [[tl('item.tools.0'), 'sell'], [tl('item.tools.1'), 'sell'], [tl('item.tools.2'), 'sell'], [tl('item.tools.3'), 'sell'], [tl('item.tools.4'), 'draw'], [tl('item.tools.5'), 'staff']],
    of: '002043122533320014243420513431' },
  auto: { it: [[tl('item.auto.0'), 'sell'], [tl('item.auto.1'), 'sell'], [tl('item.auto.2'), 'sell'], [tl('item.auto.3'), 'draw'], [tl('item.auto.4'), 'draw'], [tl('item.auto.5'), 'staff']],
    of: '120230112502442440033444511423' },
  seasonal: { it: [[tl('item.seasonal.0'), 'sell'], [tl('item.seasonal.1'), 'sell'], [tl('item.seasonal.2'), 'sell'], [tl('item.seasonal.3'), 'draw'], [tl('item.seasonal.4'), 'draw'], [tl('item.seasonal.5'), 'staff']],
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
  { id: 'lot', name: tl('place.lot'), ic: 'car/sedan', after: 'bakery', cost: [500, 5e4, 5e6, 5e8],
    next: [tl('place.lot.next.0'), tl('place.lot.next.1'), tl('place.lot.next.2'), tl('place.lot.next.3')],
    it: [tl('place.lot.it.0')], of: '0000' },
  { id: 'hall', name: tl('place.hall'), ic: 'shop/cash-register', after: 'produce', open: true,
    cost: [300, 3e4, 3e6, 3e8, 3e10, 3e12, 3e14, 3e16, 3e18, 3e20],
    next: [tl('place.hall.next.0'), tl('place.hall.next.1'), tl('place.hall.next.2'), tl('place.hall.next.3'), tl('place.hall.next.4'),
      tl('place.hall.next.5'), tl('place.hall.next.6'), tl('place.hall.next.7'), tl('place.hall.next.8'), tl('place.hall.next.9')],
    it: [tl('place.hall.it.0'), tl('place.hall.it.1'), tl('place.hall.it.2')], of: '0212012212', got: [1, 0, 0] },
  { id: 'dock', name: tl('place.dock'), ic: 'shop/hand-truck', after: 'produce', open: true,
    cost: geo(150, 12, 10),
    next: [tl('place.dock.next.0'), tl('place.dock.next.1'), tl('place.dock.next.2'), tl('place.dock.next.3'), tl('place.dock.next.4'),
      tl('place.dock.next.5'), tl('place.dock.next.6'), tl('place.dock.next.7'), tl('place.dock.next.8'), tl('place.dock.next.9')],
    it: [tl('place.dock.it.0'), tl('place.dock.it.1')], of: '0010010010', got: [1, 2] },
  { id: 'taxi', name: tl('place.taxi'), ic: 'car/taxi', after: 'frozen', cost: [2e6, 2e8, 2e10, 2e12],
    next: [tl('place.taxi.next.0'), tl('place.taxi.next.1'), tl('place.taxi.next.2'), tl('place.taxi.next.3')],
    it: [tl('place.taxi.it.0')], of: '0000' },
  { id: 'garden', name: tl('place.garden'), ic: 'shop/display-flowers', after: 'kitchen', cost: [2e10, 2e12, 2e14, 2e16],
    next: [tl('place.garden.next.0'), tl('place.garden.next.1'), tl('place.garden.next.2'), tl('place.garden.next.3')],
    it: [tl('place.garden.it.0')], of: '0000' },
  { id: 'serv', name: tl('place.serv'), ic: 'shop/service-desk', after: 'pantry', cost: geo(2e6, 6.2, 9),
    next: [tl('place.serv.next.0'), tl('place.serv.next.1'), tl('place.serv.next.2'), tl('place.serv.next.3'), tl('place.serv.next.4'), tl('place.serv.next.5'), tl('place.serv.next.6'),
      tl('place.serv.next.7'), tl('place.serv.next.8')],
    it: [tl('place.serv.it.0'), tl('place.serv.it.1'), tl('place.serv.it.2'), tl('place.serv.it.3')], of: '012201332' },
  { id: 'rest', name: tl('place.rest'), ic: 'shop/toilet', after: 'snacks', cost: geo(2e7, 7, 8),
    next: [tl('place.rest.next.0'), tl('place.rest.next.1'), tl('place.rest.next.2'), tl('place.rest.next.3'), tl('place.rest.next.4'), tl('place.rest.next.5'), tl('place.rest.next.6'),
      tl('place.rest.next.7')],
    it: [tl('place.rest.it.0'), tl('place.rest.it.1'), tl('place.rest.it.2')], of: '00100122' },
  { id: 'lounge', name: tl('place.lounge'), ic: 'shop/coffee-maker', after: 'toys', cost: geo(5e8, 5.5, 10),
    next: [tl('place.lounge.next.0'), tl('place.lounge.next.1'), tl('place.lounge.next.2'), tl('place.lounge.next.3'), tl('place.lounge.next.4'), tl('place.lounge.next.5'),
      tl('place.lounge.next.6'), tl('place.lounge.next.7'), tl('place.lounge.next.8'), tl('place.lounge.next.9')],
    it: [tl('place.lounge.it.0'), tl('place.lounge.it.1'), tl('place.lounge.it.2'), tl('place.lounge.it.3')], of: '0001131232' },
  { id: 'head', name: tl('place.head'), ic: 'shop/office-desk', after: 'tech', cost: geo(1e9, 6, 10),
    next: [tl('place.head.next.0'), tl('place.head.next.1'), tl('place.head.next.2'), tl('place.head.next.3'), tl('place.head.next.4'), tl('place.head.next.5'), tl('place.head.next.6'),
      tl('place.head.next.7'), tl('place.head.next.8'), tl('place.head.next.9')],
    it: [tl('place.head.it.0'), tl('place.head.it.1'), tl('place.head.it.2')], of: '0001122010' }
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
var RUSH = { gap: [240, 360], secs: 30, mul: 2, sale: 3, tap: 0.9, combo: 0.05, top: 10 };
// the manager's call for a rush: cool seconds between calls, or gems to call one now
var CALL = { cool: 1200, gems: 5 };

// Perks bought with reputation, which each store move pays and which a move keeps. cost is what each level takes in
// reputation and val what the perk is worth at level 0 and then at each level bought: cash, away hours and rush seconds
// are extra on top of the base, the rest are the whole value
var PERKS = [
  { id: 'open', name: tl('perkdef.open.name'), what: tl('perkdef.open.what'), cost: [8, 16, 30, 55, 95], val: [[1, 0], [8, 0], [15, 0], [15, 8], [15, 15], [20, 20]] },
  { id: 'cash', name: tl('perkdef.cash.name'), what: tl('perkdef.cash.what'), cost: [6, 12, 22, 40, 70], val: [0, 100, 2e3, 4e4, 8e5, 1.6e7] },
  { id: 'cheap', name: tl('perkdef.cheap.name'), what: tl('perkdef.cheap.what'), cost: [8, 14, 24, 40, 66, 100], val: [0, 0.05, 0.1, 0.15, 0.2, 0.25, 0.3] },
  { id: 'pace', name: tl('perkdef.pace.name'), what: tl('perkdef.pace.what'), cost: [10, 18, 30, 50, 80], val: [1, 0.95, 0.9, 0.85, 0.8, 0.75] },
  { id: 'away', name: tl('perkdef.away.name'), what: tl('perkdef.away.what'), cost: [6, 12, 24, 48], val: [0, 1, 2, 3, 4] },
  { id: 'rush', name: tl('perkdef.rush.name'), what: tl('perkdef.rush.what'), cost: [6, 12, 24], val: [0, 5, 10, 15] },
  { id: 'sales', name: tl('perkdef.sales.name'), what: tl('perkdef.sales.what'), cost: [10, 20, 36, 60, 100], val: [1, 1.1, 1.2, 1.3, 1.45, 1.6] },
  { id: 'gems', name: tl('perkdef.gems.name'), what: tl('perkdef.gems.what'), cost: [10, 25, 60], val: [0, 1, 2, 3] },
  { id: 'night', name: tl('perkdef.night.name'), what: tl('perkdef.night.what'), cost: [30], val: [0, 1] }
];
var PK = {};
PERKS.forEach(function (p) { PK[p.id] = p; });

// Regulars: a shopper who starts coming to the store once a feat is done. n is what the feat counts to (see REGV in
// sim.js), ref the shopper model with its colours moved round the atlas and hat the hat it wears. Each one owned
// adds sales of the store, the whole set a little more, and one of them now and then walks in among the shoppers and
// tips when tapped, then stays away for cool seconds
var REGS = [
  { id: 'mabel', name: tl('reg.mabel.name'), line: tl('reg.mabel.line'), feat: tl('reg.mabel.feat'), n: 1,
    ref: 'chars/character-female-e@1,3>9,3', hat: 'sun', hc: 0xe8d28a },
  { id: 'gus', name: tl('reg.gus.name'), line: tl('reg.gus.line'), feat: tl('reg.gus.feat'), n: 1000,
    ref: 'chars/character-male-d@1,3>3,2', hat: 'cap', hc: 0xd0443a },
  { id: 'ollie', name: tl('reg.ollie.name'), line: tl('reg.ollie.line'), feat: tl('reg.ollie.feat'), n: 10,
    ref: 'chars/character-male-a@3,2>9,2', hat: 'beanie', hc: 0x3f78b8 },
  { id: 'priya', name: tl('reg.priya.name'), line: tl('reg.priya.line'), feat: tl('reg.priya.feat'), n: 10,
    ref: 'chars/character-female-b@5,2>3,2', hat: 'cap', hc: 0x4f9a40 },
  { id: 'hana', name: tl('reg.hana.name'), line: tl('reg.hana.line'), feat: tl('reg.hana.feat'), n: 1e6,
    ref: 'chars/character-female-c@9,3>1,3', hat: 'none', hc: 0 },
  { id: 'theo', name: tl('reg.theo.name'), line: tl('reg.theo.line'), feat: tl('reg.theo.feat'), n: 1,
    ref: 'chars/character-male-e@5,2>11,2', hat: 'beanie', hc: 0xe8553a },
  { id: 'walt', name: tl('reg.walt.name'), line: tl('reg.walt.line'), feat: tl('reg.walt.feat'), n: 7,
    ref: 'chars/character-male-b@9,2>15,2', hat: 'top', hc: 0x2a2a30 },
  { id: 'rosa', name: tl('reg.rosa.name'), line: tl('reg.rosa.line'), feat: tl('reg.rosa.feat'), n: 3,
    ref: 'chars/character-female-a@11,2>9,2', hat: 'none', hc: 0 },
  { id: 'nina', name: tl('reg.nina.name'), line: tl('reg.nina.line'), feat: tl('reg.nina.feat'), n: 10,
    ref: 'chars/character-female-d@3,3>7,3', hat: 'sun', hc: 0xf2c230 },
  { id: 'ivy', name: tl('reg.ivy.name'), line: tl('reg.ivy.line'), feat: tl('reg.ivy.feat'), n: 1,
    ref: 'chars/character-female-f@5,2>3,2', hat: 'sun', hc: 0x68bd5c },
  { id: 'bruno', name: tl('reg.bruno.name'), line: tl('reg.bruno.line'), feat: tl('reg.bruno.feat'), n: 3,
    ref: 'chars/character-male-f@11,3>5,3', hat: 'cap', hc: 0x3f78b8 },
  { id: 'felix', name: tl('reg.felix.name'), line: tl('reg.felix.line'), feat: tl('reg.felix.feat'), n: 20,
    ref: 'chars/character-male-c@11,2>3,2', hat: 'top', hc: 0x7a3f9a }
];
var REGC = { sales: 0.01, set: 0.05, odds: 0.02, tip: [3, 8], cool: 600 };
var RG = {};
REGS.forEach(function (r) { RG[r.id] = r; });
// The VIP is not a regular to collect: a gold shopper who comes in once in gap seconds of play (the first after first), and
// a tap before they leave tips tip seconds of income, now and then with a few gems
var VIP = { first: [300, 720], gap: [600, 900], tip: [40, 60], gems: 0.1, gemN: [1, 3] };
RG.vip = { id: 'vip', name: tl('reg.vip.name'), ref: 'chars/character-male-b@9,2>15,2', hat: 'top', hc: 0xf2c230, vip: true };

// Things sold in the shop, under the ids com.aytutuna.mainstreet.<id> in both stores. A one-time product is kept as a
// flag in S.iap; a gem pack pays its gems every time. The starter pack adds STARTER to a store's first move
var PRODUCTS = [
  { id: 'starter', once: 1, ic: 'ui_gift', name: tl('product.starter.name'), text: tl('product.starter.text') },
  { id: 'noads', once: 1, ic: 'ui_star', name: tl('product.noads.name'), line: tl('product.noads.line') },
  { id: 'x2', once: 1, ic: 'ui_bolt', name: tl('product.x2.name'), line: tl('product.x2.line'), text: tl('product.x2.text') },
  { id: 'gems1', gems: 80, usd: 0.99, ic: 'ui_gem', name: tl('shop.gems', { n: 80 }) },
  { id: 'gems2', gems: 500, usd: 4.99, ic: 'ui_gem', name: tl('shop.gems', { n: 500 }) },
  { id: 'gems3', gems: 1200, usd: 9.99, ic: 'ui_gem', name: tl('shop.gems', { n: 1200 }) },
  { id: 'gems4', gems: 2800, usd: 19.99, ic: 'ui_gem', name: tl('shop.gems', { n: 2800 }) }
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

// How a store can look: a multiplying tint for the floors, the walls and the steel trim, the colours of the sign over the
// doors and of the pylon by the street. A look opens at store `store` or with the achievement `ach`, and then costs
// `gems` once if it has a price. They change nothing but looks
var LOOKS = [
  { id: 'classic', name: tl('look.classic.name'), text: tl('look.classic.text'), floor: null, wall: null, trim: null,
    sign: { bg: ['#363d54', '#1b1f2c'], edge: '#f2c230', text: '#ffe27a', shade: '#a8700c' },
    pylon: { panel: ['#fffaf0', '#f2e4c0'], band: '#d63a2f', text: '#2a2f40', star: '#ffd23a', post: 0x50566a, edge: 0x3a3d4a } },
  { id: 'fresh', name: tl('look.fresh.name'), text: tl('look.fresh.text'), store: 2, floor: 0xd8f5d0, wall: 0xdff5d6, trim: 0x8fcf80,
    sign: { bg: ['#34853f', '#1d5226'], edge: '#fff3b0', text: '#ffffff', shade: '#14401c' },
    pylon: { panel: ['#f4fff0', '#d8efc8'], band: '#3f9e47', text: '#1f5a28', star: '#ffd23a', post: 0x3f7a45, edge: 0x2c5a32 } },
  { id: 'rustic', name: tl('look.rustic.name'), text: tl('look.rustic.text'), store: 3, floor: 0xf0c890, wall: 0xe8b48a, trim: 0x8a5a30,
    sign: { bg: ['#6a4426', '#45290f'], edge: '#d9a45a', text: '#fbe6bf', shade: '#2b1708' },
    pylon: { panel: ['#f3dcb4', '#d9b684'], band: '#8a4b22', text: '#4a2a12', star: '#e8b04a', post: 0x6a4426, edge: 0x45290f } },
  { id: 'seaside', name: tl('look.seaside.name'), text: tl('look.seaside.text'), store: 5, gems: 60, floor: 0xbfe6f6, wall: 0xcfeafa, trim: 0x4fa6c8,
    sign: { bg: ['#2077aa', '#134868'], edge: '#ffffff', text: '#e8fbff', shade: '#0b2c45' },
    pylon: { panel: ['#f4fcff', '#cce9f4'], band: '#1f8fc0', text: '#15486a', star: '#ffe27a', post: 0x4a7a96, edge: 0x2c5a76 } },
  { id: 'neon', name: tl('look.neon.name'), text: tl('look.neon.text'), ach: 'dep2', gems: 120, floor: 0x8c7cc4, wall: 0x7468b0, trim: 0xff3df0,
    sign: { bg: ['#1c1038', '#05020f'], edge: '#ff3df0', text: '#5cf5ff', shade: '#a010a0' },
    pylon: { panel: ['#1c1038', '#0a0618'], band: '#c01fb4', text: '#5cf5ff', star: '#fff03a', post: 0x2a2050, edge: 0x120a24 } },
  { id: 'gold', name: tl('look.gold.name'), text: tl('look.gold.text'), ach: 'all2', gems: 300, floor: 0xf6e6b4, wall: 0xf2dea4, trim: 0xd9a21f,
    sign: { bg: ['#3b3320', '#181208'], edge: '#f2c230', text: '#fff1b0', shade: '#7a5200' },
    pylon: { panel: ['#fff6d6', '#f0d88a'], band: '#2a2418', text: '#5a3d00', star: '#ffd23a', post: 0xb08a2a, edge: 0x3b3320 } }
];
var LK = {};
LOOKS.forEach(function (l) { LK[l.id] = l; });

// Achievements, up to three tiers (t) of each kind. k is what is counted (see ACHV in sim.js) and n what it counts to.
// A tier pays its gems once; gold also adds its `sales` to sales for good, and all of them together add at most ACH_CAP
var ACHS = [
  { id: 'srv1', t: 0, k: 'srv', n: 1e3, name: tl('ach.srv1.name'), text: tl('ach.srv1.text') },
  { id: 'srv2', t: 1, k: 'srv', n: 1e5, name: tl('ach.srv2.name'), text: tl('ach.srv2.text') },
  { id: 'srv3', t: 2, k: 'srv', n: 1e7, name: tl('ach.srv3.name'), text: tl('ach.srv3.text') },
  { id: 'all1', t: 0, k: 'all', n: 1e7, name: tl('ach.all1.name'), text: tl('ach.all1.text') },
  { id: 'all2', t: 1, k: 'all', n: 1e12, name: tl('ach.all2.name'), text: tl('ach.all2.text') },
  { id: 'all3', t: 2, k: 'all', n: 1e18, name: tl('ach.all3.name'), text: tl('ach.all3.text') },
  { id: 'st1', t: 0, k: 'store', n: 5, name: tl('ach.st1.name'), text: tl('ach.st1.text') },
  { id: 'st2', t: 1, k: 'store', n: 10, name: tl('ach.st2.name'), text: tl('ach.st2.text') },
  { id: 'st3', t: 2, k: 'store', n: 20, name: tl('ach.st3.name'), text: tl('ach.st3.text') },
  { id: 'dep1', t: 0, k: 'dep', n: 6, name: tl('ach.dep1.name'), text: tl('ach.dep1.text') },
  { id: 'dep2', t: 1, k: 'dep', n: 12, name: tl('ach.dep2.name'), text: tl('ach.dep2.text') },
  { id: 'dep3', t: 2, k: 'dep', n: 18, name: tl('ach.dep3.name'), text: tl('ach.dep3.text') },
  { id: 'star1', t: 0, k: 'star', n: 3, name: tl('ach.star1.name'), text: tl('ach.star1.text') },
  { id: 'rate1', t: 1, k: 'rate', n: 36, name: tl('ach.rate1.name'), text: tl('ach.rate1.text') },
  { id: 'rate2', t: 2, k: 'rate', n: 54, name: tl('ach.rate2.name'), text: tl('ach.rate2.text') },
  { id: 'reg1', t: 0, k: 'reg', n: 6, name: tl('ach.reg1.name'), text: tl('ach.reg1.text') },
  { id: 'reg2', t: 2, k: 'reg', n: 12, name: tl('ach.reg2.name'), text: tl('ach.reg2.text') },
  { id: 'rush1', t: 1, k: 'rush', n: 20, name: tl('ach.rush1.name'), text: tl('ach.rush1.text') },
  { id: 'rush2', t: 2, k: 'rush', n: 40, name: tl('ach.rush2.name'), text: tl('ach.rush2.text') },
  { id: 'gift1', t: 0, k: 'gift', n: 25, name: tl('ach.gift1.name'), text: tl('ach.gift1.text') },
  { id: 'gift2', t: 2, k: 'gift', n: 250, name: tl('ach.gift2.name'), text: tl('ach.gift2.text') },
  { id: 'day1', t: 1, k: 'day', n: 14, name: tl('ach.day1.name'), text: tl('ach.day1.text') },
  { id: 'day2', t: 2, k: 'day', n: 30, name: tl('ach.day2.name'), text: tl('ach.day2.text') },
  { id: 'pk1', t: 0, k: 'pk', n: 20, name: tl('ach.pk1.name'), text: tl('ach.pk1.text') },
  { id: 'pk2', t: 1, k: 'pkmax', n: 1, name: tl('ach.pk2.name'), text: tl('ach.pk2.text') },
  { id: 'pk3', t: 2, k: 'pkmax', n: 4, name: tl('ach.pk3.name'), text: tl('ach.pk3.text') }
];
var ACH_TIER = [{ name: tl('ach.tier.bronze'), gems: 5 }, { name: tl('ach.tier.silver'), gems: 15 }, { name: tl('ach.tier.gold'), gems: 40, sales: 0.01 }];
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
  { id: 'kiis', g: 'USA', name: 'KIIS FM', line: tl('radio.line.kiis'), web: 'https://www.iheart.com/live/kiis-fm-185/', urls: ['https://stream.revma.ihrhls.com/zc185'] },
  { id: 'lite', g: 'USA', name: 'Lite FM 93.9', line: tl('radio.line.lite'), web: 'https://www.iheart.com/live/939-lite-fm-853/', urls: ['https://stream.revma.ihrhls.com/zc853'] },
  { id: 'hot97', g: 'USA', name: 'Hot 97', line: tl('radio.line.hot97'), web: 'https://www.hot97.com/', urls: ['https://18313.live.streamtheworld.com/WQHTFMAAC.aac'] },
  { id: 'oldies', g: 'USA', name: '181.FM Great Oldies', line: tl('radio.line.oldies'), web: 'https://www.181.fm/', urls: ['https://listen.181fm.com/181-greatoldies_128k.mp3'] },
  { id: 'poptron', g: 'USA', name: 'SomaFM PopTron', line: tl('radio.line.poptron'), web: 'https://somafm.com/poptron/', urls: ['https://ice6.somafm.com/poptron-128-mp3', 'https://ice2.somafm.com/poptron-128-aac'] },
  { id: 'cbcmusic', g: 'Canada', name: 'CBC Music', line: tl('radio.line.cbcmusic'), web: 'https://www.cbc.ca/listen/live-radio', urls: ['https://26373.live.streamtheworld.com/CBLFM_CBC_SC', 'https://26733.live.streamtheworld.com/CBUFM_CBC_SC'] },
  { id: 'cbc1', g: 'Canada', name: 'CBC Radio One', line: tl('radio.line.cbc1'), web: 'https://www.cbc.ca/listen/live-radio', urls: ['https://17813.live.streamtheworld.com/CBLAFM_CBC_SC', 'https://22983.live.streamtheworld.com/CBU2FM_CBC_SC'] },
  { id: 'kiss1053', g: 'Canada', name: 'Kiss 105.3', line: tl('radio.line.kiss1053'), web: 'https://www.kiss1053.com/', urls: ['https://rogers.leanstream.co/rogers/ott1053.stream/icy'] },
  { id: 'capital', g: 'UK', name: 'Capital', line: tl('radio.line.capital'), web: 'https://www.capitalfm.com/', urls: ['https://media-ssl.musicradio.com/CapitalMP3', 'https://media-ssl.musicradio.com/CapitalUK'] },
  { id: 'heart80', g: 'UK', name: 'Heart 80s', line: tl('radio.line.heart80'), web: 'https://www.heart.co.uk/', urls: ['https://media-ssl.musicradio.com/Heart80sMP3'] },
  { id: 'heart90', g: 'UK', name: 'Heart 90s', line: tl('radio.line.heart90'), web: 'https://www.heart.co.uk/', urls: ['https://media-ssl.musicradio.com/Heart90sMP3'] },
  { id: 'heartdance', g: 'UK', name: 'Heart Dance', line: tl('radio.line.heartdance'), web: 'https://www.heart.co.uk/', urls: ['https://media-ssl.musicradio.com/HeartDanceMP3'] },
  { id: 'gold', g: 'UK', name: 'Gold', line: tl('radio.line.gold'), web: 'https://www.thisisgold.com/', urls: ['https://media-ssl.musicradio.com/GoldMP3'] },
  { id: 'exa', g: 'Mexico', name: 'Exa FM', line: tl('radio.line.exa'), web: 'https://www.exafm.com/', urls: ['https://playerservices.streamtheworld.com/api/livestream-redirect/XHJCFM_SC'] },
  { id: 'mejorcdmx', g: 'Mexico', name: 'La Mejor 97.7', line: tl('radio.line.mejorcdmx'), web: 'https://www.lamejor.com.mx/', urls: ['https://playerservices.streamtheworld.com/api/livestream-redirect/XERCFM_SC'] },
  { id: 'mejormty', g: 'Mexico', name: 'La Mejor 92.5', line: tl('radio.line.mejormty'), web: 'https://www.lamejor.com.mx/', urls: ['https://playerservices.streamtheworld.com/api/livestream-redirect/XHSROFM_SC'] },
  { id: 'r710', g: 'Mexico', name: 'Radio 710', line: tl('radio.line.r710'), web: 'https://www.imer.mx/', urls: ['https://s2.mexside.net/8028/stream'] },
  { id: 'los40co', g: 'Latin', name: 'LOS40 Colombia', line: tl('radio.line.los40co'), web: 'https://los40.com.co/', urls: ['https://playerservices.streamtheworld.com/api/livestream-redirect/LOS40_COLOMBIA.mp3', 'https://playerservices.streamtheworld.com/api/livestream-redirect/LOS40_COLOMBIAAAC.aac'] },
  { id: 'rockpop', g: 'Latin', name: 'Rock & Pop', line: tl('radio.line.rockpop'), web: 'https://www.rockandpop.com.ar/', urls: ['https://playerservices.streamtheworld.com/api/livestream-redirect/ROCKANDPOPAAC.aac'] },
  { id: 'reggaeton', g: 'Latin', name: 'Latina Reggaeton', line: tl('radio.line.reggaeton'), web: 'https://www.latina.fr/', urls: ['https://latinareggaeton.ice.infomaniak.ch/latinareggaeton.mp3'] },
  { id: 'lamega', g: 'Latin', name: 'La Mega 97.9', line: tl('radio.line.lamega'), web: 'https://www.lamega.com/', urls: ['https://liveaudio.lamusica.com/NY_WSKQ_icy'] },
  { id: 'clube', g: 'Brazil', name: 'Clube FM 99.1', line: tl('radio.line.clube'), web: 'https://www.clubefm.com.br/', urls: ['https://radio.saopaulo01.com.br:10913/stream'] },
  { id: 'bons', g: 'Brazil', name: 'Bons Tempos FM', line: tl('radio.line.bons'), web: 'https://www.bonstemposfm.com.br/', urls: ['https://server02.ouvir.radio.br:8050/stream'] },
  { id: 'fita', g: 'Brazil', name: 'Fita Cassete', line: tl('radio.line.fita'), web: 'https://www.fitacassete.com.br/', urls: ['https://server01.ouvir.radio.br:8018/stream'] },
  { id: 'mgt', g: 'Brazil', name: 'Rádio MGT Sertanejo', line: tl('radio.line.mgt'), web: 'https://www.mgtradio.net/', urls: ['https://cast.mgtradio.net/radio/8000/aac'] },
  { id: 'zipfm', g: 'Caribbean', name: 'Zip FM 103', line: tl('radio.line.zipfm'), web: 'https://www.zipfm.com/', urls: ['https://stream.zeno.fm/c0ytcn43vxquv'] },
  { id: 'radiojam', g: 'Caribbean', name: 'Radio Jamaica 94 FM', line: tl('radio.line.radiojam'), web: 'https://radiojamaicanewsonline.com/', urls: ['https://stream.zeno.fm/ebqnzkvyv9duv'] },
  { id: 'scorch', g: 'Caribbean', name: 'Scorch Radio 101.1', line: tl('radio.line.scorch'), web: 'https://www.scorch.fm/', urls: ['https://stream.velalabs.co/scorch'] },
  { id: 'unityxm', g: 'Caribbean', name: 'UnityXM', line: tl('radio.line.unityxm'), web: 'https://unityxm.com/', urls: ['https://a8.asurahosting.com:7430/radio.mp3'] },
  { id: 'los40', g: 'Spain', name: 'LOS40', line: tl('radio.line.los40'), web: 'https://los40.com/', urls: ['https://playerservices.streamtheworld.com/api/livestream-redirect/LOS40.mp3'] },
  { id: 'los40classic', g: 'Spain', name: 'LOS40 Classic', line: tl('radio.line.los40classic'), web: 'https://los40.com/', urls: ['https://playerservices.streamtheworld.com/api/livestream-redirect/LOS40_CLASSIC.mp3'] },
  { id: 'kissfm', g: 'Spain', name: 'Kiss FM', line: tl('radio.line.kissfm'), web: 'https://kissfm.es/', urls: ['https://bbkissfm.kissfmradio.cires21.com/bbkissfm.mp3'] },
  { id: 'flaix', g: 'Spain', name: 'Flaix FM', line: tl('radio.line.flaix'), web: 'https://www.flaixfm.cat/', urls: ['https://stream.flaixfm.cat/icecast'] },
  { id: 'fip', g: 'France', name: 'FIP', line: tl('radio.line.fip'), web: 'https://www.radiofrance.fr/fip', urls: ['https://icecast.radiofrance.fr/fip-midfi.mp3', 'https://icecast.radiofrance.fr/fip-lofi.aac'] },
  { id: 'nrj', g: 'France', name: 'NRJ', line: tl('radio.line.nrj'), web: 'https://www.nrj.fr/', urls: ['https://streaming.nrjaudio.fm/ou7xugf3s5gi', 'https://streaming.nrjaudio.fm/ou5k6tirv93h'] },
  { id: 'rtl2', g: 'France', name: 'RTL 2', line: tl('radio.line.rtl2'), web: 'https://www.rtl2.fr/', urls: ['https://icecast.rtl.fr/rtl2-1-44-128'] },
  { id: 'fun', g: 'France', name: 'Fun Radio', line: tl('radio.line.fun'), web: 'https://www.funradio.fr/', urls: ['https://icecast.funradio.fr/fun-1-44-128'] },
  { id: 'rfm', g: 'France', name: 'RFM', line: tl('radio.line.rfm'), web: 'https://rfm.fr/', urls: ['https://stream.rfm.fr/rfm-wr3.aac'] },
  { id: 'antenne', g: 'Germany', name: 'Antenne Bayern', line: tl('radio.line.antenne'), web: 'https://www.antenne.de/', urls: ['https://stream.antenne.de/antenne/stream/mp3'] },
  { id: 'swr3', g: 'Germany', name: 'SWR3', line: tl('radio.line.swr3'), web: 'https://www.swr3.de/', urls: ['https://liveradio.swr.de/sw282p3/swr3/play.mp3', 'https://liveradio.swr.de/sw331ch/swr3/play.aac'] },
  { id: 'bayern3', g: 'Germany', name: 'Bayern 3', line: tl('radio.line.bayern3'), web: 'https://www.br.de/radio/bayern3/', urls: ['https://dispatcher.rndfnk.com/br/br3/live/mp3/mid'] },
  { id: '1live', g: 'Germany', name: '1LIVE', line: tl('radio.line.1live'), web: 'https://www1.wdr.de/radio/1live/', urls: ['https://wdr-1live-live.icecastssl.wdr.de/wdr/1live/live/mp3/128/stream.mp3'] },
  { id: 'ndr2', g: 'Germany', name: 'NDR 2', line: tl('radio.line.ndr2'), web: 'https://www.ndr.de/ndr2/', urls: ['https://icecast.ndr.de/ndr/ndr2/niedersachsen/mp3/128/stream.mp3'] },
  { id: 'italia80', g: 'Italy', name: 'Italia 80', line: tl('radio.line.italia80'), web: 'https://www.radioitalia.it/', urls: ['https://icy.unitedradio.it/um016.mp3'] },
  { id: 'rtl1025', g: 'Italy', name: 'RTL 102.5 Best', line: tl('radio.line.rtl1025'), web: 'https://www.rtl.it/', urls: ['https://streamingv2.shoutcast.com/rtl-1025-best', 'https://streamingv2.shoutcast.com/rtl-1025-best_48.aac'] },
  { id: 'italia70', g: 'Italy', name: 'Italia 70', line: tl('radio.line.italia70'), web: 'https://www.radioitalia.it/', urls: ['https://icy.unitedradio.it/um020.mp3'] },
  { id: 'lolli', g: 'Italy', name: 'Lolliradio Italia', line: tl('radio.line.lolli'), web: 'https://www.lolliradio.net/', urls: ['https://stream.lolliradio.net/lolli_italia.mp3'] },
  { id: 'radio2', g: 'Netherlands', name: 'NPO Radio 2', line: tl('radio.line.radio2'), web: 'https://www.nporadio2.nl/', urls: ['https://icecast.omroep.nl/radio2-bb-mp3'] },
  { id: '3fm', g: 'Netherlands', name: 'NPO 3FM', line: tl('radio.line.3fm'), web: 'https://www.npo3fm.nl/', urls: ['https://icecast.omroep.nl/3fm-bb-mp3'] },
  { id: 'qmusic', g: 'Netherlands', name: 'Qmusic', line: tl('radio.line.qmusic'), web: 'https://qmusic.nl/', urls: ['https://stream.qmusic.nl/qmusic/mp3', 'https://icecast-qmusicnl-cdp.triple-it.nl/Qmusic_nl_live.mp3'] },
  { id: '538', g: 'Netherlands', name: 'Radio 538', line: tl('radio.line.538'), web: 'https://www.538.nl/', urls: ['https://playerservices.streamtheworld.com/api/livestream-redirect/RADIO538.mp3'] },
  { id: 'sky', g: 'Netherlands', name: 'Sky Radio', line: tl('radio.line.sky'), web: 'https://www.skyradio.nl/', urls: ['https://playerservices.streamtheworld.com/api/livestream-redirect/SRGSTR01.mp3', 'https://www.mp3streams.nl/zender/skyradio/stream/8-mp3-128'] },
  { id: 'srp3', g: 'Scandinavia', name: 'Sveriges Radio P3', line: tl('radio.line.srp3'), web: 'https://sverigesradio.se/p3', urls: ['https://live1.sr.se/p3-mp3-96', 'https://live1.sr.se/p3-aac-320'] },
  { id: 'megapol', g: 'Scandinavia', name: 'Mix Megapol', line: tl('radio.line.megapol'), web: 'https://mixmegapol.se/', urls: ['https://live-bauerse-fm.sharp-stream.com/mixmegapol_instream_se_mp3'] },
  { id: 'p5hits', g: 'Scandinavia', name: 'P5 Hits', line: tl('radio.line.p5hits'), web: 'https://p5.no/', urls: ['https://p5.p4groupaudio.com/P05_MM', 'https://p5n.p4groupaudio.com/P05AAH'] },
  { id: 'p12', g: 'Scandinavia', name: 'P12 Hitmix', line: tl('radio.line.p12'), web: 'https://p12.no/', urls: ['https://nrj.p4groupaudio.com/NRJ_MM', 'https://nrj.p4groupaudio.com/NRJ_AH'] },
  { id: 'rmf', g: 'Poland', name: 'RMF FM', line: tl('radio.line.rmf'), web: 'https://www.rmf.fm/', urls: ['https://rs201-krk.rmfstream.pl/rmf_fm'] },
  { id: 'zet', g: 'Poland', name: 'Radio ZET', line: tl('radio.line.zet'), web: 'https://www.radiozet.pl/', urls: ['https://zt01.cdn.eurozet.pl/zet-net.mp3', 'https://r.dcs.redcdn.pl/sc/o2/Eurozet/live/audio.livx?audio=5'] },
  { id: 'eska', g: 'Poland', name: 'Radio Eska', line: tl('radio.line.eska'), web: 'https://www.eska.pl/', urls: ['https://waw.ic.smcdn.pl/2380-1.mp3'] },
  { id: 'chilli', g: 'Poland', name: 'Chilli ZET', line: tl('radio.line.chilli'), web: 'https://chillizet.pl/', urls: ['https://ch.cdn.eurozet.pl/chi-net.mp3'] },
  { id: 'athensdj', g: 'Greece', name: 'Athens DeeJay 95.2', line: tl('radio.line.athensdj'), web: 'https://www.athensdeejay.gr/', urls: ['https://stream.rcs.revma.com/f663xvvehkcwv'] },
  { id: 'sfera', g: 'Greece', name: 'Sfera 102.2', line: tl('radio.line.sfera'), web: 'https://www.sfera.gr/', urls: ['https://sfera.live24.gr/sfera4132'] },
  { id: 'easy972', g: 'Greece', name: 'Easy 97.2', line: tl('radio.line.easy972'), web: 'https://www.easy972.gr/', urls: ['https://stream.radiojar.com/cthtwxk5yvduv.mp3'] },
  { id: 'pepper', g: 'Greece', name: 'Pepper 96.6', line: tl('radio.line.pepper'), web: 'https://www.pepper966.gr/', urls: ['https://stream.radiojar.com/pepper'] },
  { id: 'rusradio', g: 'Russia', name: 'Русское Радио', line: tl('radio.line.rusradio'), web: 'https://rusradio.ru/', urls: ['https://rusradio.hostingradio.ru/rusradio96.aacp'] },
  { id: 'dfmdance', g: 'Russia', name: 'DFM Russian Dance', line: tl('radio.line.dfmdance'), web: 'https://www.dfm.ru/', urls: ['https://dfm-dfmrusdance.hostingradio.ru/dfmrusdance96.aacp'] },
  { id: 'dfm90', g: 'Russia', name: 'DFM Дискач 90-х', line: tl('radio.line.dfm90'), web: 'https://www.dfm.ru/', urls: ['https://dfm-disc90.hostingradio.ru/disc9096.aacp'] },
  { id: 'vanya', g: 'Russia', name: 'Радио Ваня', line: tl('radio.line.vanya'), web: 'https://www.radiovanya.ru/', urls: ['https://icecast-radiovanya.cdnvideo.ru/radiovanya'] },
  { id: 'kral', g: 'Turkey', name: 'Kral FM', line: tl('radio.line.kral'), web: 'https://www.kralfm.com.tr/', urls: ['https://dygedge2.radyotvonline.net/kralfm/playlist.m3u8'] },
  { id: 'power', g: 'Turkey', name: 'Power Türk', line: tl('radio.line.power'), web: 'https://www.powerapp.com.tr/', urls: ['https://listen.powerapp.com.tr/powerturk/mpeg/icecast.audio', 'https://live.powerapp.com.tr/powerturk/abr/playlist.m3u8'] },
  { id: 'joy', g: 'Turkey', name: 'Joy Türk', line: tl('radio.line.joy'), web: 'https://www.joyturk.com.tr/', urls: ['https://playerservices.streamtheworld.com/api/livestream-redirect/JOY_TURK_SC', 'https://playerservices.streamtheworld.com/api/livestream-redirect/JOY_TURK_ITUNES.mp3'] },
  { id: 'best', g: 'Turkey', name: 'Best FM', line: tl('radio.line.best'), web: 'https://www.bestfm.com.tr/', urls: ['https://ssldyg.radyotvonline.com/best/bestfm.stream/playlist.m3u8'] },
  { id: 'trtfm', g: 'Turkey', name: 'TRT FM', line: tl('radio.line.trtfm'), web: 'https://www.trt.net.tr/', urls: ['https://trt.radyotvonline.net/trtfm'] },
  { id: 'metro', g: 'Turkey', name: 'Metro FM', line: tl('radio.line.metro'), web: 'https://www.metrofm.com.tr/', urls: ['https://playerservices.streamtheworld.com/api/livestream-redirect/METRO_FM_SC'] },
  { id: 'mcd', g: 'Arabic', name: 'Monte Carlo Doualiya', line: tl('radio.line.mcd'), web: 'https://www.mc-doualiya.com/', urls: ['https://montecarlodoualiya128k.ice.infomaniak.ch/mc-doualiya.mp3'] },
  { id: 'arabmix', g: 'Arabic', name: 'Arab Mix FM', line: tl('radio.line.arabmix'), web: 'https://zeno.fm/radio/arab-mix-fm/', urls: ['https://stream.zeno.fm/na3vpvn10qruv', 'https://stream-29.zeno.fm/na3vpvn10qruv'] },
  { id: 'nogoum', g: 'Arabic', name: 'Nogoum FM', line: tl('radio.line.nogoum'), web: 'https://zeno.fm/radio/nogoum-fm/', urls: ['https://stream-159.zeno.fm/qb1zvsykm98uv'] },
  { id: 'gaane', g: 'India', name: 'Bollywood Gaane Purane', line: tl('radio.line.gaane'), web: 'https://zeno.fm/radio/filmy-mirchi/', urls: ['https://stream.zeno.fm/6n6ewddtad0uv', 'https://stream-142.zeno.fm/6n6ewddtad0uv'] },
  { id: 'bolly10', g: 'India', name: 'Bollywood 2010s', line: tl('radio.line.bolly10'), web: 'https://drive.uber.radio/', urls: ['https://drive.uber.radio/uber/bollywood2010s/icecast.audio'] },
  { id: 'hungama', g: 'India', name: 'Radio Hungama Dil Se', line: tl('radio.line.hungama'), web: 'https://www.hungama.com/', urls: ['https://stream.zeno.fm/143d7gty24zuv'] },
  { id: 'hindigold', g: 'India', name: 'Hindi Gold', line: tl('radio.line.hindigold'), web: 'https://vibesounds.in/', urls: ['https://azuracast.vibesounds.in:8010/radio.mp3'] },
  { id: 'qt1', g: 'China', name: '清晨音乐台', line: tl('radio.line.qt1'), web: 'https://www.qingting.fm/', urls: ['https://lhttp.qingting.fm/live/4915/64k.mp3'] },
  { id: 'qt2', g: 'China', name: '广东音乐之声', line: tl('radio.line.qt2'), web: 'https://www.qingting.fm/', urls: ['https://lhttp.qtfm.cn/live/1260/64k.mp3'] },
  { id: 'asiafm', g: 'China', name: 'AsiaFM 亚洲音乐台', line: tl('radio.line.asiafm'), web: 'https://www.qingting.fm/', urls: ['https://lhttp.qingting.fm/live/4581/64k.mp3'] },
  { id: 'asiafm2', g: 'China', name: 'AsiaFM 亚洲经典台', line: tl('radio.line.asiafm2'), web: 'https://www.qingting.fm/', urls: ['https://lhttp.qingting.fm/live/5021912/64k.mp3'] },
  { id: 'jpop', g: 'Japan', name: 'J-Pop Powerplay', line: tl('radio.line.jpop'), web: 'https://asiadreamradio.torontocast.stream/', urls: ['https://kathy.torontocast.com:3560/'] },
  { id: 'kawaii', g: 'Japan', name: 'J-Pop Powerplay Kawaii', line: tl('radio.line.kawaii'), web: 'https://asiadreamradio.torontocast.stream/', urls: ['https://kathy.torontocast.com:3060/;?shoutcast'] },
  { id: 'sakura', g: 'Japan', name: 'J-Pop Sakura', line: tl('radio.line.sakura'), web: 'https://asiadreamradio.torontocast.stream/', urls: ['https://quincy.torontocast.com:2070/stream.mp3'] },
  { id: 'bigb', g: 'Korea', name: 'Big B Radio K-pop', line: tl('radio.line.bigb'), web: 'https://bigbradio.net/', urls: ['https://antares.dribbcast.com/proxy/kpop?mp=/s'] },
  { id: 'moekpop', g: 'Korea', name: 'LISTEN.moe K-pop', line: tl('radio.line.moekpop'), web: 'https://listen.moe/', urls: ['https://listen.moe/kpop/fallback'] },
  { id: 'cbsmusic', g: 'Korea', name: 'CBS Music FM', line: tl('radio.line.cbsmusic'), web: 'https://www.cbs.co.kr/', urls: ['https://lhttp-hw.qtfm.cn/live/15318233/64k.mp3'] },
  { id: 'love983', g: 'Philippines', name: 'Love Radio 98.3', line: tl('radio.line.love983'), web: 'https://www.loveradio.com.ph/', urls: ['https://loveradiodagupan.radioca.st/'] },
  { id: 'love1007', g: 'Philippines', name: 'Love Radio 100.7', line: tl('radio.line.love1007'), web: 'https://www.loveradio.com.ph/', urls: ['https://loveradiolucena.radioca.st/'] },
  { id: 'winradio', g: 'Philippines', name: 'Win Radio Davao', line: tl('radio.line.winradio'), web: 'https://winradio.ph/', urls: ['https://stream-42.zeno.fm/1noxhem5qpkuv'] },
  { id: 'budots', g: 'Philippines', name: 'Budots FM 98.9', line: tl('radio.line.budots'), web: 'https://zeno.fm/radio/budots-fm/', urls: ['https://stream.zeno.fm/2uhuu5hvzqzuv'] },
  { id: 'sbfm', g: 'Indonesia', name: 'SB FM Tembang Kenangan', line: tl('radio.line.sbfm'), web: 'https://zeno.fm/radio/sb-fm/', urls: ['https://stream.zeno.fm/d16n50mkzhhvv'] },
  { id: 'mstream', g: 'Indonesia', name: 'M-Stream Indo', line: tl('radio.line.mstream'), web: 'https://zeno.fm/radio/m-stream-indo/', urls: ['https://stream.zeno.fm/iln4upodbvuuv'] },
  { id: 'rama', g: 'Indonesia', name: 'Rama FM Bandung', line: tl('radio.line.rama'), web: 'https://www.ramafm.com/', urls: ['https://i.klikhost.com/8330/;'] },
  { id: 'imelda', g: 'Indonesia', name: 'Imelda FM', line: tl('radio.line.imelda'), web: 'https://www.radioimeldafm.co.id/', urls: ['https://server.radioimeldafm.co.id:8030/imeldafm'] },
  { id: 'mradio', g: 'Vietnam', name: 'M Radio Vietnam', line: tl('radio.line.mradio'), web: 'https://zeno.fm/radio/m-radio-vietnam/', urls: ['https://stream-155.zeno.fm/4q7y9hvkp2zuv'] },
  { id: 'cherry', g: 'Vietnam', name: 'Cherry Radio Music', line: tl('radio.line.cherry'), web: 'https://zeno.fm/radio/cherry-radio-music-247/', urls: ['https://stream-176.zeno.fm/umt5gqmg3reuv'] },
  { id: 'hanoi', g: 'Vietnam', name: 'Hà Nội Community Radio', line: tl('radio.line.hanoi'), web: 'https://hanoicommunityradio.com/', urls: ['https://ha-noi-community-radio.radiocult.fm/stream'] },
  { id: 'kiis1065', g: 'Australia', name: 'KIIS 106.5', line: tl('radio.line.kiis1065'), web: 'https://www.kiis1065.com.au/', urls: ['https://ais-arn.streamguys1.com/au_007_icy'] },
  { id: 'kiis1011', g: 'Australia', name: 'KIIS 101.1', line: tl('radio.line.kiis1011'), web: 'https://www.kiis1011.com.au/', urls: ['https://ais-arn.streamguys1.com/au_001_icy'] },
  { id: 'nova919', g: 'Australia', name: 'Nova 91.9', line: tl('radio.line.nova919'), web: 'https://www.novafm.com.au/', urls: ['https://playerservices.streamtheworld.com/api/livestream-redirect/NOVA_919_AAC48.aac'] },
  { id: 'gold1043', g: 'Australia', name: 'Gold 104.3', line: tl('radio.line.gold1043'), web: 'https://www.gold1043.com.au/', urls: ['https://ais-arn.streamguys1.com/au_004_icy'] },
  { id: 'coolfm', g: 'Nigeria', name: 'Cool FM Lagos 96.9', line: tl('radio.line.coolfm'), web: 'https://www.coolfm.ng/', urls: ['https://coolfmlagos969-atunwadigital.streamguys1.com/coolfmlagos969'] },
  { id: 'wazobia', g: 'Nigeria', name: 'Wazobia FM Lagos', line: tl('radio.line.wazobia'), web: 'https://www.wazobiafm.com/', urls: ['https://wazobiafmlagos951-atunwadigital.streamguys1.com/wazobiafmlagos951'] },
  { id: 'softlife', g: 'Nigeria', name: 'Softlife Afrofusion Radio', line: tl('radio.line.softlife'), web: 'https://softlife.radio/', urls: ['https://a10.asurahosting.com:7540/radio.mp3'] },
  { id: 'amapiano', g: 'South Africa', name: 'Amapiano FM', line: tl('radio.line.amapiano'), web: 'https://zeno.fm/radio/amapiano-fm/', urls: ['https://stream.zeno.fm/xs6zeac1ts8uv'] },
  { id: 'lekker', g: 'South Africa', name: 'Lekker FM', line: tl('radio.line.lekker'), web: 'https://www.lekkerfm.co.za/', urls: ['https://zas3.ndx.co.za:8002/stream'] },
  { id: 'jacaranda', g: 'South Africa', name: 'Jacaranda FM', line: tl('radio.line.jacaranda'), web: 'https://www.jacarandafm.com/', urls: ['https://edge.iono.fm/xice/jacarandafm_live_high.mp3'] },
  { id: 'ecgold', g: 'South Africa', name: 'East Coast Gold', line: tl('radio.line.ecgold'), web: 'https://www.ecr.co.za/', urls: ['https://live.ecr.co.za/ecrgoldhigh.mp3'] },
  { id: 'easy1015', g: 'Kenya', name: 'Easy FM 101.5', line: tl('radio.line.easy1015'), web: 'https://zeno.fm/radio/easy-fm-101-5/', urls: ['https://stream.zeno.fm/wvw02zaqpxquv'] },
  { id: 'capitalke', g: 'Kenya', name: 'Capital FM 98.4', line: tl('radio.line.capitalke'), web: 'https://www.capitalfm.co.ke/', urls: ['https://atunwadigital.streamguys1.com/capitalfm'] },
  { id: 'hitzgh', g: 'Ghana', name: 'Hitz 103.9', line: tl('radio.line.hitzgh'), web: 'https://www.hitzfmonline.com/', urls: ['https://mmg.streamguys1.com/HitzFM-mp3'] },
  { id: 'ghmusic', g: 'Ghana', name: 'Ghana Music Radio', line: tl('radio.line.ghmusic'), web: 'https://ghanamusic.com/', urls: ['https://streaming.radio.co/s92f890821/listen'] }
];
