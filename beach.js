// scatter behind the street: wet sand and sea rocks from a fixed seed, so the same beach is baked every time
function shore(w) {
  var seed = 5;
  var list = [{ t: 3, x: 0, y: 174, w: w, h: 16 }];
  var rnd = function (n) {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff;
    return (seed >> 8) % n;
  };
  var land = ['b_sprout', 'b_sprout2', 'b_bed_r', 'b_bed_b', 'b_palm', 'b_dune'];
  for (var x = 8; x < w; x += 70 + rnd(60)) {
    var n = land[rnd(land.length)];
    list.push({ n: n, x: x, y: n === 'b_dune' ? 150 + rnd(16) : n === 'b_palm' ? 120 + rnd(40) : 100 + rnd(60) });
  }
  var sea = ['b_rock', 'b_rock2', 'b_rock3', 'b_arch', 'b_buoy_g', 'b_buoy_o', 'b_buoy_r', 'b_gull', 'b_gull2'];
  for (x = 20; x < w; x += 40 + rnd(60)) {
    list.push({ n: sea[rnd(sea.length)], x: x, y: 204 + rnd(250) });
  }
  return list;
}

DISTRICTS.push({
  id: 'beach',
  name: 'Beach',
  k: 1.5,
  ground: {
    sheet: 'b_tiles', base: 0, walk: 2, verge: 4,
    band: { tile: 1, from: 190, to: 640, edge: '#c8f2f6' },
    end: ['b_palm', 'b_sprout', 'b_palm', 'b_sprout2']
  },
  deco: shore(2300),
  sprites: COMMON.concat([
    'b_anchor', 'b_arch', 'b_ball', 'b_bar1', 'b_bar2', 'b_barr', 'b_bed_b', 'b_bed_r', 'b_bucket',
    'b_buoy_g', 'b_buoy_o', 'b_buoy_r', 'b_chair', 'b_court', 'b_cs1', 'b_cs1f', 'b_cs2', 'b_cs3', 'b_ct1',
    'b_ct2', 'b_deck1', 'b_deck2', 'b_dj', 'b_dune', 'b_gull', 'b_gull2', 'b_hole', 'b_lguard', 'b_lh0',
    'b_lh1', 'b_lh3', 'b_lh_lamp', 'b_lh_open', 'b_logo', 'b_menu', 'b_net', 'b_palm', 'b_pole', 'b_price',
    'b_rig1', 'b_rig2', 'b_rock', 'b_rock2', 'b_rock3', 'b_score', 'b_scount', 'b_shell', 'b_ship', 'b_sign',
    'b_spk', 'b_sprout', 'b_sprout2', 'b_stairs', 'b_star', 'b_star2', 'b_stool', 'b_table', 'b_table2',
    'b_table3', 'b_tiles', 'b_toy_ball', 'b_toy_ring', 'b_tw_b', 'b_tw_g', 'b_tw_m', 'b_tw_y', 'b_umb_b',
    'b_umb_g', 'b_umb_l', 'b_umb_y', 'b_umc_b', 'b_umc_g', 'b_umc_l', 'b_umc_y', 'dpad', 'flagpole',
    'helipad'
  ]),
  lots: [
    {
      id: 'tiki', name: 'Tiki bar', w: 136,
      cost: 0, build: 0,
      pay: 1, gain: 0.5, hold: 20,
      up: 15, grow: 1.55,
      rungs: [
        { add: 'drinks on the counter', say: 'Drinks!' },
        { add: 'two bamboo stools', say: 'Stools!' },
        { add: 'a menu board', say: 'Menu board!' },
        { add: 'a palm tree', say: 'Palm tree!' },
        { add: 'a second counter', say: 'Second counter!' },
        { add: 'an orange buoy', say: 'Buoy!' },
        { add: 'a direction sign', say: 'Signpost!' }
      ],
      parts: [
        { n: 'b_palm', at: 4, x: 0, y: 4 },
        { n: 'b_bar1', at: 0, to: 0, x: 40, y: 0 },
        { n: 'b_bar2', at: 1, x: 40, y: 0 },
        { n: 'b_stool', at: 2, x: 48, y: -14 },
        { n: 'b_stool', at: 2, x: 72, y: -14 },
        { n: 'b_menu', at: 3, x: 2, y: -8 },
        { n: 'b_bar2', at: 5, x: 88, y: 0 },
        { n: 'b_buoy_o', at: 6, x: 22, y: -14 },
        { n: 'b_pole', at: 7, x: 104, y: -14 }
      ]
    },
    {
      id: 'rental', name: 'Umbrella rental', w: 232,
      cost: 80, build: 20,
      pay: 6, gain: 0.4, hold: 20,
      up: 50, grow: 1.7,
      unlocks: ['trucks'],
      rungs: [
        { add: 'an open umbrella', say: 'Umbrella!' },
        { add: 'a blue towel', say: 'Towel!' },
        { add: 'a yellow umbrella', say: 'Yellow umbrella!' },
        { add: 'a yellow towel', say: 'Yellow towel!' },
        { add: 'a green umbrella', say: 'Green umbrella!' },
        { add: 'a green towel', say: 'Green towel!' },
        { add: 'a rack of closed umbrellas', say: 'Umbrella rack!' },
        { add: 'a beach ball and a swim ring', say: 'Beach toys!' }
      ],
      parts: [
        { n: 'b_tw_b', at: 2, x: 38, y: -4 },
        { n: 'b_tw_y', at: 4, x: 96, y: 10 },
        { n: 'b_tw_g', at: 6, x: 148, y: -4 },
        { n: 'b_umb_y', at: 3, x: 66, y: 24 },
        { n: 'b_price', at: 0, x: 4, y: -4 },
        { n: 'b_umc_b', at: 0, to: 0, x: 24, y: 0 },
        { n: 'b_umb_b', at: 1, x: 8, y: 0 },
        { n: 'b_umb_g', at: 5, x: 120, y: 0 },
        { n: 'b_umc_l', at: 7, x: 184, y: 0 },
        { n: 'b_umc_y', at: 7, x: 200, y: 0 },
        { n: 'b_umc_g', at: 7, x: 216, y: 0 },
        { n: 'b_toy_ball', at: 8, x: 80, y: -16 },
        { n: 'b_toy_ring', at: 8, x: 104, y: -14 }
      ]
    },
    {
      id: 'castle', name: 'Sandcastle stand', w: 148,
      cost: 1000, build: 30,
      pay: 12, gain: 0.4, hold: 22,
      up: 600, grow: 1.8,
      rungs: [
        { add: 'a bucket and shovel', say: 'Bucket!' },
        { add: 'a small sandcastle', say: 'Sandcastle!' },
        { add: 'a flag on the castle', say: 'Flag!' },
        { add: 'a big castle', say: 'Big castle!' },
        { add: 'a second big castle', say: 'Second castle!' },
        { add: 'tall sand towers', say: 'Towers!' },
        { add: 'shells, starfish and a beach plant', say: 'Shells!' }
      ],
      parts: [
        { n: 'b_ct1', at: 6, x: 44, y: 22 },
        { n: 'b_ct2', at: 6, x: 90, y: 24 },
        { n: 'b_hole', at: 0, to: 1, x: 58, y: 0 },
        { n: 'b_price', at: 0, x: 8, y: -6 },
        { n: 'b_cs1', at: 2, to: 2, x: 58, y: 0 },
        { n: 'b_cs1f', at: 3, x: 58, y: 0 },
        { n: 'b_cs2', at: 4, x: 4, y: -2 },
        { n: 'b_cs3', at: 5, x: 96, y: -2 },
        { n: 'b_bucket', at: 1, x: 52, y: -12 },
        { n: 'b_sprout', at: 7, x: 100, y: -22 },
        { n: 'b_star', at: 7, x: 30, y: -12 },
        { n: 'b_shell', at: 7, x: 128, y: -14 },
        { n: 'b_star2', at: 7, x: 82, y: -14 }
      ]
    },
    {
      id: 'ship', name: 'Pirate ship bar', w: 232,
      cost: 10000, build: 40,
      pay: 60, gain: 0.4, hold: 14,
      up: 6000, grow: 1.8,
      rungs: [
        { add: 'the ship', say: 'Ship ahoy!' },
        { add: 'barrel tables', say: 'Barrel tables!' },
        { add: 'stools', say: 'Stools!' },
        { add: 'drinks on the tables', say: 'Drinks!' },
        { add: 'an anchor', say: 'Anchor!' },
        { add: 'a bar sign', say: 'Bar sign!' },
        { add: 'a palm and a menu board', say: 'Palm!' }
      ],
      parts: [
        { n: 'b_palm', at: 7, x: 168, y: 14 },
        { n: 'b_scount', at: 0, to: 0, x: 40, y: 0 },
        { n: 'b_ship', at: 1, x: 8, y: 0 },
        { n: 'b_anchor', at: 5, x: 124, y: 0 },
        { n: 'b_table', at: 2, to: 3, x: 148, y: 8 },
        { n: 'b_table', at: 2, to: 3, x: 184, y: 0 },
        { n: 'b_table', at: 2, to: 3, x: 212, y: 10 },
        { n: 'b_table2', at: 4, x: 148, y: 8 },
        { n: 'b_table3', at: 4, x: 184, y: 0 },
        { n: 'b_table2', at: 4, x: 212, y: 10 },
        { n: 'b_chair', at: 3, x: 134, y: -12 },
        { n: 'b_chair', at: 3, x: 168, y: -8 },
        { n: 'b_chair', at: 3, x: 198, y: 2 },
        { n: 'b_logo', at: 6, x: 36, y: 68 },
        { n: 'b_menu', at: 7, x: 112, y: -14 }
      ]
    },
    {
      id: 'volley', name: 'Volleyball court', w: 304,
      cost: 110000, build: 50,
      pay: 350, gain: 0.4, hold: 10,
      up: 66000, grow: 1.8,
      rungs: [
        { add: 'a net', say: 'Net!' },
        { add: 'a ball', say: 'Ball!' },
        { add: 'a score board', say: 'Score board!' },
        { add: 'towels for the players', say: 'Towels!' },
        { add: 'an umbrella for the crowd', say: 'Umbrella!' },
        { add: 'a lifeguard chair', say: 'Lifeguard!' },
        { add: 'palms at both ends', say: 'Palms!' }
      ],
      parts: [
        { n: 'b_palm', at: 7, x: 0, y: 40 },
        { n: 'b_palm', at: 7, x: 240, y: 34 },
        { n: 'b_court', at: 0, x: 64, y: -8 },
        { n: 'b_net', at: 1, x: 64, y: 28 },
        { n: 'b_ball', at: 2, x: 128, y: 20 },
        { n: 'b_score', at: 3, x: 232, y: -4 },
        { n: 'b_tw_b', at: 4, x: 236, y: -14 },
        { n: 'b_tw_m', at: 4, x: 268, y: -10 },
        { n: 'b_umb_l', at: 5, x: 254, y: 0 },
        { n: 'b_lguard', at: 6, x: 8, y: -6 }
      ]
    },
    {
      id: 'stage', name: 'Beach stage', w: 232,
      cost: 900000, build: 60,
      pay: 2400, gain: 0.4, hold: 8,
      up: 500000, grow: 1.8,
      unlocks: ['drones', 'heli'],
      rungs: [
        { add: 'stairs', say: 'Stairs!' },
        { add: 'loudspeakers', say: 'Loudspeakers!' },
        { add: 'a DJ set', say: 'DJ set!' },
        { add: 'crowd barriers', say: 'Barriers!' },
        { add: 'a lighting rig', say: 'Lights!' },
        { add: 'a drone landing pad', say: 'Landing pad!' },
        { add: 'a bigger stage', say: 'Bigger stage!' },
        { add: 'a taller rig', say: 'Taller rig!' }
      ],
      parts: [
        { n: 'dpad', at: 6, x: 172, y: 0 },
        { n: 'b_deck1', at: 0, to: 6, x: 0, y: 0 },
        { n: 'b_deck2', at: 7, x: 0, y: 0 },
        { n: 'b_rig1', at: 5, to: 6, x: 8, y: 70 },
        { n: 'b_rig1', at: 7, to: 7, x: 40, y: 70 },
        { n: 'b_rig2', at: 8, x: 8, y: 70 },
        { n: 'b_stairs', at: 1, x: 48, y: -10 },
        { n: 'b_spk', at: 2, x: 2, y: 40 },
        { n: 'b_spk', at: 2, x: 78, y: 40 },
        { n: 'b_dj', at: 3, x: 40, y: 8 },
        { n: 'b_barr', at: 4, x: 0, y: -12 },
        { n: 'b_barr', at: 4, x: 32, y: -12 },
        { n: 'b_barr', at: 4, x: 64, y: -12 },
        { n: 'b_barr', at: 4, x: 96, y: -12 },
        { n: 'b_barr', at: 7, x: 128, y: -12 },
        { n: 'b_barr', at: 7, x: 160, y: -12 },
        { n: 'b_spk', at: 7, x: 142, y: 40 }
      ]
    },
    {
      id: 'lighthouse', name: 'Lighthouse', w: 304,
      cost: 10000000, build: 120,
      pay: 12000, gain: 0.4, hold: 8,
      up: 6600000, grow: 1.8,
      capstone: true,
      rungs: [
        { add: 'an open door', say: 'Door!' },
        { add: 'the tower', say: 'Tower!' },
        { add: 'a lamp on the top deck', say: 'Lamp!' },
        { add: 'a red roof and glass', say: 'Red roof!' },
        { add: 'an entrance sign', say: 'Sign!' },
        { add: 'flags by the door', say: 'Flags!' },
        { add: 'a helipad nearby', say: 'Helipad!' }
      ],
      parts: [
        { n: 'b_lh0', at: 0, to: 1, x: 56, y: 0 },
        { n: 'b_lh1', at: 2, to: 3, x: 56, y: 0 },
        { n: 'b_lh_lamp', at: 3, to: 3, x: 88, y: 186 },
        { n: 'b_lh3', at: 4, x: 56, y: 0 },
        { n: 'b_lh_open', at: 1, x: 88, y: 14 },
        { n: 'b_sign', at: 5, x: 0, y: -10 },
        { n: 'flagpole', at: 6, x: 44, y: -6 },
        { n: 'flagpole', at: 6, x: 152, y: -6 },
        { n: 'helipad', at: 7, x: 184, y: 0 }
      ]
    }
  ]
});
