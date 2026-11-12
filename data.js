// Businesses in unlock order. cy: cycle in seconds, c0: price of level 1 (the unlock), g: price growth per level,
// r: revenue per level and cycle, m: manager price. ic: sprite shown on the row.
var BIZ = [
  { id: 'homes', name: 'Homes', ic: 'house_y', cy: 1, c0: 4, g: 1.1, r: 1, m: 20000 },
  { id: 'bakery', name: 'Bakery', ic: 'bakery_1', cy: 3, c0: 60, g: 1.15, r: 0.643, m: 720 },
  { id: 'cafe', name: 'Cafe', ic: 'cafe_1', cy: 6, c0: 600, g: 1.14, r: 11, m: 7200 },
  { id: 'grocery', name: 'Grocery', ic: 'market_1', cy: 12, c0: 6000, g: 1.13, r: 188, m: 72000 },
  { id: 'icecream', name: 'Ice Cream', ic: 'icecream_3', cy: 20, c0: 60000, g: 1.12, r: 2680, m: 7.2e5 },
  { id: 'flower', name: 'Flower Shop', ic: 'stora_1', cy: 30, c0: 6e5, g: 1.11, r: 34300, m: 7.2e6 },
  { id: 'books', name: 'Bookstore', ic: 'storb_1', cy: 45, c0: 6e6, g: 1.11, r: 4.4e5, m: 7.2e7 },
  { id: 'toys', name: 'Toy Store', ic: 'storc_1', cy: 60, c0: 6e7, g: 1.1, r: 5.01e6, m: 7.2e8 },
  { id: 'restaurant', name: 'Restaurant', ic: 'restaurant_1', cy: 90, c0: 6e8, g: 1.09, r: 6.43e7, m: 7.2e9 },
  { id: 'school', name: 'School', ic: 'school_1', cy: 120, c0: 6e9, g: 1.08, r: 7.32e8, m: 7.2e10 },
  { id: 'class', name: 'Classrooms', ic: 'board', cy: 150, c0: 3.6e11, g: 1.07, r: 4.69e10, m: 4.3e12 },
  { id: 'lib', name: 'Library', ic: 'bookcase', cy: 180, c0: 2.2e13, g: 1.07, r: 2.94e12, m: 2.6e14 },
  { id: 'cafeteria', name: 'Cafeteria', ic: 'counter', cy: 210, c0: 1.3e15, g: 1.07, r: 1.73e14, m: 1.6e16 },
  { id: 'yard', name: 'Playground', ic: 'toy1', cy: 240, c0: 7.8e16, g: 1.07, r: 1.02e16, m: 9.4e17 },
  { id: 'hosp', name: 'Hospital', ic: 'clinic_3', cy: 300, c0: 4.7e18, g: 1.07, r: 6.54e17, m: 5.6e19 }
];

// level thresholds: [level, revenue x, cycle x2]. Levels 1, 10, 25, 50 and 100 also change the building
var MS = [[10, 2, 0], [25, 2, 1], [50, 3, 0], [100, 2, 1], [200, 3, 0], [300, 3, 0], [400, 3, 0]];
var MS_GEMS = [1, 2, 3, 5, 8, 10, 15];
var STAGE = [1, 10, 25, 50, 100];

// the park: a few levels, each raises all income by 20%
var PARK = { after: 'flower', cost: [5e6, 1e8, 2e9, 4e10], boost: 0.2 };

// levels at which what is drawn changes, where that is finer than STAGE. An `of` takes the level of another business
var VIEW = {
  homes: [1, 1, 2, 3, 5, 7, 10, 13, 17, 20, 22, 24, 25, 50, 100],
  class: [1, 3, 5, 10, 15, 25, 50, 100],
  lib: [1, 5, 10, 25, 50, 100],
  cafeteria: [1, 5, 10, 25, 50, 75, 100],
  yard: [1, 5, 10, 25, 50, 75, 100],
  rest: { of: 'school', lv: [1, 5, 10, 25, 50] },
  park: [1, 2, 3, 4]
};

// the rooms of the school, by the business that fills them; ui.js reads this to pick the room to show
var PLACE = {
  class: { room: 'class1' },
  lib: { room: 'lib' },
  cafeteria: { room: 'cafe' },
  yard: { room: 'yard' }
};
