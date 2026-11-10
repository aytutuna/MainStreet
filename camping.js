(function () {
  var PINES = ['c_pine1', 'c_pine2', 'c_pine3', 'c_pine4', 'c_pine5', 'c_pine6'];
  // far enough back that both helipads stand on grass
  var SHORE = 272;
  // each spot is either clear of every lot or fully behind a building's roof
  var SCATTER = [['c_stump', 361, 65], ['c_shroom', 241, 62], ['c_shroom', 566, 60], ['c_stump', 700, 60], ['c_rock1', 868, 62], ['c_rock2', 990, 60], ['c_stump', 1290, 60], ['c_rock2', 1434, 60]];

  // dense pines in rows from the lake shore down to the street, a few oaks, rocks and stumps in clear ground
  function forest(w) {
    var seed = 13;
    var rnd = function (n) {
      seed = (seed * 1664525 + 1013904223) % 4294967296;
      return Math.floor(seed / 4294967296 * n);
    };
    var rows = [162, 134];
    var clear = [[840, 984], [1056, 1372]];
    var items = [];
    for (var row = 0; row < 2; row++) {
      var x = 3 + rnd(28);
      while (x < w - 60) {
        // oaks only stand in the back row, so the front row never hides most of a tree
        var big = row === 0 && rnd(7) === 0;
        var n = big ? ['c_oak1', 'c_oak2', 'c_maple'][rnd(3)] : PINES[rnd(PINES.length)];
        var wd = big ? 60 : 32;
        var y = rows[row] + rnd(5);
        // the helipad pads and the lodge wing stand in clearings
        var cut = clear.some(function (c) {
          return x + wd > c[0] && x < c[1];
        });
        if (!cut) items.push({ n: n, x: x, y: y, w: wd });
        x += wd + 7 + rnd(row ? 22 : 10);
      }
    }
    SCATTER.forEach(function (p) {
      items.push({ n: p[0], x: p[1], y: p[2] });
    });
    for (x = 60; x < w; x += 200 + rnd(160)) {
      items.push({ n: 'c_float', x: x, y: SHORE + 30 + rnd(100) });
    }
    for (x = 150; x < w; x += 260 + rnd(200)) {
      var by = SHORE + 28 + rnd(12);
      var under = items.some(function (t) {
        return t.w === 60 && x + 16 > t.x && x < t.x + 60;
      });
      if (!under) items.push({ n: 'c_buoy1', x: x, y: by });
    }
    items.sort(function (a, b) { return b.y - a.y; });
    return items;
  }

  DISTRICTS.push({
    id: 'camping',
    name: 'Camping',
    k: 2.5,
    ground: {
      sheet: 'c_tiles', base: 0, walk: 1, verge: 0,
      band: { tile: 2, from: SHORE, to: 640, edge: '#6e4a32' },
      end: ['c_pine3', 'c_oak1', 'c_pine4', 'c_pine1']
    },
    deco: forest(1768),
    sprites: COMMON.concat(['c_tiles', 'c_pine1', 'c_pine2', 'c_pine3', 'c_pine4', 'c_pine5', 'c_pine6', 'c_oak1', 'c_oak2', 'c_maple',
      'c_rock1', 'c_rock2', 'c_shroom', 'c_stump', 'c_float', 'c_buoy1',
      'c_ring', 'c_fire', 'c_log', 'c_marsh', 'c_pot', 'c_bbq1', 'c_bbq2', 'c_btab', 'c_btab4', 'c_lantern',
      'c_tent1', 'c_tent2', 'c_tent3', 'c_tarp1', 'c_tarp2', 'c_tarp3', 'c_bag1', 'c_bag2', 'c_bag4', 'c_pack', 'c_chair1', 'c_chair2', 'c_ttab',
      'c_cove', 'c_deck', 'c_pole1', 'c_spot', 'c_fcrate', 'c_barrel', 'c_pcrate', 'c_lbuoy',
      'c_s1', 'c_s2', 'c_s5', 'c_s6', 'c_logs', 'c_m1', 'c_m2', 'c_m5', 'c_m8', 'c_b5', 'dpad',
      'c_lodge', 'c_lodge2', 'c_wind', 'c_sign1', 'c_sign2', 'flagpole', 'helipad']),
    lots: [
      {
        id: 'fire', name: 'Campfire cookout', w: 148,
        cost: 0, build: 0,
        pay: 1, gain: 0.5, hold: 20,
        up: 15, grow: 1.55,
        rungs: [
          { add: 'a lit campfire', say: 'Fire lit!' },
          { add: 'a log bench', say: 'Log bench!' },
          { add: 'a marshmallow on a stick', say: 'Marshmallows!' },
          { add: 'a cooking pot over the fire', say: 'Cooking pot!' },
          { add: 'a camp stove', say: 'Camp stove!' },
          { add: 'a red camp stove', say: 'Red stove!' },
          { add: 'a picnic table', say: 'Picnic table!' },
          { add: 'lanterns on the table and bench', say: 'Lanterns!' },
          { add: 'a bigger dining table', say: 'Dining table!' }
        ],
        parts: [
          { n: 'c_ring', at: 0, to: 0, x: 52, y: 0 },
          { n: 'c_stump', at: 0, to: 1, x: 24, y: 0 },
          { n: 'c_fire', at: 1, to: 3, x: 52, y: 0 },
          { n: 'c_log', at: 2, x: 2, y: 0 },
          { n: 'c_pot', at: 4, x: 42, y: 0 },
          { n: 'c_marsh', at: 3, x: 72, y: 0 },
          { n: 'c_bbq1', at: 5, to: 5, x: 82, y: 0 },
          { n: 'c_bbq2', at: 6, x: 82, y: 0 },
          { n: 'c_btab', at: 7, to: 8, x: 102, y: 0 },
          { n: 'c_btab4', at: 9, x: 100, y: 0 },
          { n: 'c_lantern', at: 8, x: 8, y: 12 },
          { n: 'c_lantern', at: 8, x: 108, y: 23, to: 8 },
          { n: 'c_lantern', at: 9, x: 112, y: 28 }
        ]
      },
      {
        id: 'tents', name: 'Tent pitches', w: 232,
        cost: 80, build: 20,
        pay: 6, gain: 0.4, hold: 20,
        up: 50, grow: 1.7,
        unlocks: ['trucks'],
        rungs: [
          { add: 'a blue tent', say: 'Blue tent!' },
          { add: 'a green groundsheet', say: 'Second pitch!' },
          { add: 'a green tent', say: 'Green tent!' },
          { add: 'a tan groundsheet', say: 'Third pitch!' },
          { add: 'a tan tent', say: 'Tan tent!' },
          { add: 'sleeping bags in front of the tents', say: 'Sleeping bags!' },
          { add: 'a backpack and camp chairs', say: 'Camp chairs!' },
          { add: 'a lantern at every tent', say: 'Lanterns!' }
        ],
        parts: [
          { n: 'c_tarp1', at: 0, to: 0, x: 8, y: 14 },
          { n: 'c_tent1', at: 1, x: 4, y: 16 },
          { n: 'c_tarp2', at: 2, to: 2, x: 84, y: 14 },
          { n: 'c_tent2', at: 3, x: 80, y: 16 },
          { n: 'c_tarp3', at: 4, to: 4, x: 164, y: 14 },
          { n: 'c_tent3', at: 5, x: 160, y: 16 },
          { n: 'c_bag1', at: 6, x: 64, y: 0 },
          { n: 'c_bag2', at: 6, x: 144, y: 0 },
          { n: 'c_bag4', at: 6, x: 212, y: 0 },
          { n: 'c_pack', at: 7, x: 24, y: 0 },
          { n: 'c_chair1', at: 7, x: 100, y: 0 },
          { n: 'c_chair2', at: 7, x: 176, y: 0 },
          { n: 'c_lantern', at: 8, x: 48, y: 0 },
          { n: 'c_lantern', at: 8, x: 128, y: 0 },
          { n: 'c_lantern', at: 8, x: 196, y: 0 }
        ]
      },
      {
        id: 'dock', name: 'Fishing dock', w: 148,
        cost: 2400, build: 30,
        pay: 40, gain: 0.4, hold: 22,
        up: 1440, grow: 1.8,
        rungs: [
          { add: 'a longer jetty', say: 'Longer jetty!' },
          { add: 'a fishing platform with rods', say: 'Fishing spot!' },
          { add: 'mooring posts', say: 'Mooring posts!' },
          { add: 'a barrel and a crate on the jetty', say: 'Barrel and crate!' },
          { add: 'a crate of fish on the jetty', say: 'Fish crate!' },
          { add: 'a life buoy', say: 'Life buoy!' },
          { add: 'buoys on the water', say: 'Buoys!' },
          { add: 'a second jetty', say: 'Second jetty!' }
        ],
        parts: [
          { n: 'c_cove', at: 0, x: 0, y: 0 },
          { n: 'c_pole1', at: 3, x: 24, y: 16 },
          { n: 'c_pole1', at: 3, x: 72, y: 16 },
          { n: 'c_pole1', at: 8, x: 84, y: 18 },
          { n: 'c_deck', at: 0, x: 40, y: 0 },
          { n: 'c_deck', at: 0, x: 40, y: 16 },
          { n: 'c_deck', at: 1, x: 40, y: 32 },
          { n: 'c_spot', at: 2, x: 40, y: 32 },
          { n: 'c_barrel', at: 4, x: 44, y: 36 },
          { n: 'c_pcrate', at: 4, x: 56, y: 40 },
          { n: 'c_fcrate', at: 5, x: 41, y: 0 },
          { n: 'c_lbuoy', at: 6, x: 108, y: 44 },
          { n: 'c_buoy1', at: 7, x: 14, y: 54 },
          { n: 'c_buoy1', at: 7, x: 112, y: 64 },
          { n: 'c_deck', at: 8, x: 100, y: 0 },
          { n: 'c_deck', at: 8, x: 100, y: 16 }
        ]
      },
      {
        id: 'small', name: 'Small cabins', w: 232,
        cost: 90000, build: 40,
        pay: 380, gain: 0.4, hold: 14,
        up: 54000, grow: 1.7,
        rungs: [
          { add: 'a wooden deck at the door', say: 'Deck!' },
          { add: 'a stack of firewood', say: 'Firewood!' },
          { add: 'a second small cabin', say: 'Second cabin!' },
          { add: 'a deck on the second cabin', say: 'Second deck!' },
          { add: 'camp chairs by the doors', say: 'Camp chairs!' },
          { add: 'lanterns on the cabin walls', say: 'Lanterns!' },
          { add: 'a table with drinks', say: 'Drinks table!' }
        ],
        parts: [
          { n: 'c_s1', at: 0, to: 0, x: 8, y: 30 },
          { n: 'c_s5', at: 1, x: 8, y: 0 },
          { n: 'c_logs', at: 2, x: 106, y: 0 },
          { n: 'c_s2', at: 3, to: 3, x: 124, y: 30 },
          { n: 'c_s6', at: 4, x: 124, y: 0 },
          { n: 'c_chair1', at: 5, x: 20, y: 0 },
          { n: 'c_chair2', at: 5, x: 190, y: 0 },
          { n: 'c_lantern', at: 6, x: 30, y: 56 },
          { n: 'c_lantern', at: 6, x: 174, y: 56 },
          { n: 'c_ttab', at: 7, x: 206, y: 0 }
        ]
      },
      {
        id: 'large', name: 'Large cabins', w: 304,
        cost: 1800000, build: 60,
        pay: 2600, gain: 0.4, hold: 6,
        up: 1080000, grow: 1.7,
        unlocks: ['drones', 'heli'],
        pad: { n: 'helipad', x: 92, y: 126 },
        rungs: [
          { add: 'a deck on the cabin', say: 'Deck!' },
          { add: 'a bigger cabin', say: 'Bigger cabin!' },
          { add: 'a stack of firewood', say: 'Firewood!' },
          { add: 'a second medium cabin', say: 'Second cabin!' },
          { add: 'a deck on the second cabin', say: 'Second deck!' },
          { add: 'a drone pad on the roof', say: 'Drone pad!' },
          { add: 'camp chairs by the decks', say: 'Camp chairs!' },
          { add: 'lanterns on the cabin walls', say: 'Lanterns!' }
        ],
        parts: [
          { n: 'c_m1', at: 0, to: 0, x: 4, y: 30 },
          { n: 'c_m5', at: 1, to: 1, x: 4, y: 0 },
          { n: 'c_b5', at: 2, x: 4, y: 0 },
          { n: 'c_logs', at: 3, x: 282, y: 4 },
          { n: 'c_m2', at: 4, to: 4, x: 172, y: 30 },
          { n: 'c_m8', at: 5, x: 172, y: 1 },
          { n: 'dpad', at: 6, x: 50, y: 72 },
          { n: 'c_chair1', at: 7, x: 164, y: 0 },
          { n: 'c_chair2', at: 7, x: 280, y: 0 },
          { n: 'c_lantern', at: 8, x: 56, y: 56 },
          { n: 'c_lantern', at: 8, x: 230, y: 56 }
        ]
      },
      {
        id: 'lodge', name: 'Campsite lodge', w: 304,
        cost: 10000000, build: 120,
        pay: 9600, gain: 0.4, hold: 6,
        up: 6000000, grow: 1.8,
        capstone: true,
        rungs: [
          { add: 'a wooden porch deck at the lodge door', say: 'Lodge deck!' },
          { add: 'a fire pit by the lodge', say: 'Fire pit!' },
          { add: 'a flagpole by the entrance', say: 'Flag!' },
          { add: 'a wind pump behind the signboard', say: 'Wind pump!' },
          { add: 'a dining table under the signboard', say: 'Dining table!' },
          { add: 'lanterns on the lodge wall', say: 'Lanterns!' },
          { add: 'badges on the signboard', say: 'Sign badges!' },
          { add: 'a helicopter pad behind the lodge', say: 'Helipad!' }
        ],
        parts: [
          { n: 'c_wind', at: 4, x: 22, y: 76 },
          { n: 'c_lodge', at: 0, to: 0, x: 98, y: 0 },
          { n: 'c_lodge2', at: 1, x: 98, y: 0 },
          { n: 'c_fire', at: 2, x: 108, y: 0 },
          { n: 'flagpole', at: 3, x: 76, y: 0 },
          { n: 'c_btab4', at: 5, x: 24, y: 0 },
          { n: 'c_lantern', at: 6, x: 126, y: 20 },
          { n: 'c_lantern', at: 6, x: 268, y: 20 },
          { n: 'c_sign1', at: 0, to: 6, x: 4, y: 8 },
          { n: 'c_sign2', at: 7, x: 4, y: 8 },
          { n: 'helipad', at: 8, x: 184, y: 172 }
        ]
      }
    ]
  });
})();
