// the ground behind the street: a back path with spurs, hand-placed gardens above it, a hedge under it and rows of trees
// behind. Gardens are placed by hand so no arrangement repeats inside one screen; the tree rows come from a fixed seed
function gardenYard(w) {
  var seed = 11;
  var rnd = function (n) {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff;
    return (seed >> 8) % n;
  };
  var size = { tree_a: [48, 64], tree_b: [32, 64], tree_c: [32, 48], bush: [16, 16], bloom1: [16, 16], bloom2: [16, 16],
    pond: [48, 48], bedp: [32, 16], bedr: [32, 16], picket: [16, 16], g_bench: [48, 16], g_arch3: [64, 64],
    g_arch4: [80, 64], g_pot2: [16, 28], g_hbush3: [16, 27] };
  var list = [];
  var taken = [];
  var put = function (n, x, y, rep) {
    list.push({ n: n, x: x, y: y, rep: rep });
    taken.push([x, x + size[n][0] * (rep || 1), y, y + size[n][1]]);
  };
  var patch = function (x, y, pw, ph) {
    list.push({ t: 4, x: x, y: y, w: pw, h: ph });
    taken.push([x, x + pw, y, y + ph]);
  };
  // a fenced bed with blooms, rep pickets wide
  var fence = function (x, rep, b1, b2) {
    put('picket', x, 184, rep);
    put('picket', x, 238, rep);
    for (var k = 0; k < 4; k++) {
      put('picket', x, 196 + k * 12);
      put('picket', x + rep * 16 - 16, 196 + k * 12);
    }
    put('bloom1', x + b1, 204);
    put('bloom2', x + rep * 16 - b2, 216);
  };
  list.push({ t: 2, x: 0, y: 136, w: w, h: 16 });
  [140, 414, 634, 1104].forEach(function (sx) {
    list.push({ t: 2, x: sx, y: 0, w: 16, h: 136 });
  });

  put('g_arch3', 24, 204);
  put('g_pot2', 6, 190);
  put('g_pot2', 92, 190);
  put('bedp', 40, 176);
  put('g_bench', 172, 153);
  put('bedr', 224, 154);
  patch(176, 180, 80, 32);
  patch(208, 212, 48, 16);
  put('tree_a', 276, 226);
  put('bush', 268, 190);
  fence(336, 6, 24, 40);
  put('bush', 376, 212);
  put('pond', 490, 206);
  put('bush', 468, 210);
  put('bush', 544, 216);
  put('tree_b', 500, 268);
  put('tree_c', 566, 242);
  patch(586, 156, 48, 16);
  put('bloom2', 600, 190);
  put('tree_a', 664, 224);
  patch(704, 176, 64, 32);
  put('bush', 680, 192);
  put('tree_c', 786, 238);
  put('g_arch4', 812, 200);
  put('g_pot2', 796, 192);
  put('g_pot2', 894, 192);
  put('bedp', 828, 178);
  put('tree_a', 934, 270);
  put('tree_b', 1010, 282);
  put('g_bench', 1090, 153);
  put('bedp', 1142, 154);
  patch(1100, 176, 96, 32);
  patch(1116, 208, 48, 16);
  put('tree_c', 1100, 240);
  put('bush', 1186, 232);
  fence(1224, 5, 20, 36);
  put('tree_a', 1316, 232);
  put('g_arch3', 1348, 204);
  put('g_pot2', 1330, 190);
  put('g_pot2', 1414, 190);
  put('bedr', 1360, 176);

  // the hedge sits just under the back path, left open at the spurs, behind the helipad and behind the angel
  for (var hx = 4; hx < 1420; hx += 16) {
    var gap = [140, 414, 634, 1104].some(function (sx) {
      return hx > sx - 20 && hx < sx + 20;
    });
    if (gap || (hx > 928 && hx < 1100) || (hx > 1216 && hx < 1316)) continue;
    list.push({ n: 'g_hbush3', x: hx, y: 108 });
  }

  for (var row = 0; row < 4; row++) {
    var trees = ['tree_a', 'tree_b', 'tree_c'];
    for (var x = 6 + row * 21; x < w - 50; x += 54) {
      if (rnd(100) < 35) continue;
      var n = trees[rnd(3)];
      var tx = x + rnd(24);
      var ty = 268 + row * 56 + rnd(8);
      var r = [tx, tx + size[n][0], ty, ty + size[n][1]];
      var hit = taken.some(function (t) {
        return r[0] < t[1] && r[1] > t[0] && r[2] < t[3] && r[3] > t[2];
      });
      if (!hit) put(n, tx, ty);
    }
  }
  return list;
}

DISTRICTS.push({
  id: 'garden',
  name: 'Garden',
  k: 2,
  lamps: [634, 1416],
  hydrants: [0, 868],
  ground: { sheet: 'g_tiles', base: 0, walk: 2, verge: 0, end: ['tree_b', 'g_hbush3', 'tree_c'] },
  deco: gardenYard(1800),
  sprites: COMMON.concat(['tree_a', 'tree_b', 'tree_c', 'bush', 'bloom1', 'bloom2', 'bedp', 'bedr', 'pond', 'picket', 'helipad', 'g_tiles', 'g_pave1', 'g_pave2',
    'g_shed0', 'g_shed1', 'g_shed2', 'g_shed3', 'g_can', 'g_rake', 'g_birdh', 'g_wbench',
    'g_sprout1', 'g_sprout2', 'g_sprout3', 'g_fbench', 'g_sunb', 'g_sun',
    'g_cart0', 'g_cart1', 'g_cart2', 'g_cart3', 'g_box1', 'g_box2', 'g_shelf1', 'g_trellis', 'g_seedb',
    'g_gh0', 'g_gh1', 'g_ghg', 'g_lgh0', 'g_lgh1', 'g_lgh2', 'g_pot1', 'g_pot2',
    'g_arch1', 'g_arch3', 'g_arch4', 'g_gate3', 'g_gate4', 'g_top1', 'g_top3', 'g_top5', 'g_top7',
    'g_f11', 'g_f13', 'g_f22', 'g_f24', 'g_f32', 'g_f33', 'g_f34', 'g_bench', 'g_putto', 'g_putto2',
    'g_pillar', 'g_angel', 'g_angelv', 'g_hbush3']),
  lots: [
    {
      id: 'shed', name: 'Potting shed', w: 136,
      cost: 0, build: 0,
      pay: 1, gain: 0.5, hold: 20,
      up: 15, grow: 1.55,
      rungs: [
        { add: 'a watering can by the door', say: 'Watering can!' },
        { add: 'a rake against the wall', say: 'Rake!' },
        { add: 'a bird house on a post', say: 'Bird house!' },
        { add: 'a weathered grey shed', say: 'Grey shed!' },
        { add: 'a potting bench', say: 'Potting bench!' },
        { add: 'three pots of seedlings', say: 'Seedlings!' },
        { add: 'a blue shed', say: 'Blue shed!' },
        { add: 'sunflowers behind the bench', say: 'Sunflowers!' },
        { add: 'a red shed', say: 'Red shed!' }
      ],
      parts: [
        { n: 'g_sun', at: 8, x: 12, y: 22 },
        { n: 'g_sun', at: 8, x: 42, y: 22 },
        { n: 'g_shed0', at: 0, to: 3, x: 80, y: 0 },
        { n: 'g_shed1', at: 4, to: 6, x: 80, y: 0 },
        { n: 'g_shed2', at: 7, to: 8, x: 80, y: 0 },
        { n: 'g_shed3', at: 9, x: 80, y: 0 },
        { n: 'g_can', at: 1, x: 112, y: -4 },
        { n: 'g_rake', at: 2, x: 124, y: 0 },
        { n: 'g_birdh', at: 3, x: 68, y: -4 },
        { n: 'g_wbench', at: 5, x: 8, y: 0 },
        { n: 'g_sprout1', at: 6, x: 14, y: -4 },
        { n: 'g_sprout2', at: 6, x: 34, y: -4 },
        { n: 'g_sprout3', at: 6, x: 54, y: -4 }
      ]
    },
    {
      id: 'cart', name: 'Flower cart', w: 136,
      cost: 80, build: 20,
      pay: 6, gain: 0.4, hold: 20,
      up: 50, grow: 1.7,
      unlocks: ['trucks'],
      rungs: [
        { add: 'flowers in the cart', say: 'Flowers!' },
        { add: 'a crate of blooms', say: 'Crate!' },
        { add: 'a fuller cart', say: 'Fuller cart!' },
        { add: 'a second crate', say: 'Second crate!' },
        { add: 'a shelf of white flowers', say: 'Shelf!' },
        { add: 'a trellis behind the cart', say: 'Trellis!' },
        { add: 'sunflowers by the road', say: 'Sunflowers!' },
        { add: 'garden tools on the cart', say: 'Tools!' }
      ],
      parts: [
        { n: 'g_trellis', at: 6, x: 36, y: 22 },
        { n: 'g_cart0', at: 0, to: 0, x: 52, y: 8 },
        { n: 'g_cart1', at: 1, to: 2, x: 52, y: 8 },
        { n: 'g_cart2', at: 3, to: 7, x: 52, y: 8 },
        { n: 'g_cart3', at: 8, x: 52, y: 8 },
        { n: 'g_box1', at: 2, x: 18, y: -12 },
        { n: 'g_box2', at: 4, x: 90, y: -12 },
        { n: 'g_shelf1', at: 5, x: 52, y: -6 },
        { n: 'g_sunb', at: 7, x: 2, y: -12 },
        { n: 'g_sunb', at: 7, x: 120, y: -12 },
        { n: 'g_rake', at: 8, x: 86, y: 0 }
      ]
    },
    {
      id: 'glass', name: 'Greenhouse', w: 148,
      cost: 800, build: 30,
      pay: 8, gain: 0.4, hold: 22,
      up: 480, grow: 1.8,
      rungs: [
        { add: 'plants on the shelves', say: 'Plants!' },
        { add: 'a flower shelf outside', say: 'Flower shelf!' },
        { add: 'potted bushes at the end', say: 'Potted bushes!' },
        { add: 'a second greenhouse', say: 'Second greenhouse!' },
        { add: 'plants in the second greenhouse', say: 'Full house!' },
        { add: 'a bench of seedlings', say: 'Seedlings!' },
        { add: 'sunflowers by the first door', say: 'Sunflowers!' }
      ],
      parts: [
        { n: 'g_gh0', at: 0, to: 0, x: 0, y: 0 },
        { n: 'g_gh1', at: 1, x: 0, y: 0 },
        { n: 'g_ghg', at: 0, x: 0, y: 0 },
        { n: 'g_gh0', at: 4, to: 4, x: 92, y: 0 },
        { n: 'g_gh1', at: 5, x: 92, y: 0 },
        { n: 'g_ghg', at: 4, x: 92, y: 0 },
        { n: 'g_seedb', at: 6, x: 58, y: 12 },
        { n: 'g_shelf1', at: 2, x: 58, y: -8 },
        { n: 'g_pot1', at: 3, x: 92, y: -2 },
        { n: 'g_pot2', at: 3, x: 130, y: -2 },
        { n: 'g_sunb', at: 7, x: 3, y: -14 },
        { n: 'g_sunb', at: 7, x: 41, y: -14 }
      ]
    },
    {
      id: 'topiary', name: 'Topiary park', w: 232,
      cost: 5500, build: 40,
      pay: 30, gain: 0.4, hold: 20,
      up: 3300, grow: 1.8,
      rungs: [
        { add: 'a hedge gate', say: 'Hedge gate!' },
        { add: 'a topiary bear', say: 'Topiary bear!' },
        { add: 'a topiary horse', say: 'Topiary horse!' },
        { add: 'a topiary cat', say: 'Topiary cat!' },
        { add: 'a bigger hedge arch', say: 'Bigger arch!' },
        { add: 'a second hedge gate', say: 'Second gate!' },
        { add: 'a topiary dinosaur', say: 'Topiary dinosaur!' },
        { add: 'potted bushes by the road', say: 'Potted bushes!' }
      ],
      parts: [
        { n: 'g_arch1', at: 0, to: 4, x: 92, y: 8 },
        { n: 'g_arch4', at: 5, x: 76, y: 8 },
        { n: 'g_gate3', at: 1, x: 8, y: 0 },
        { n: 'g_gate4', at: 6, x: 148, y: 0 },
        { n: 'g_top7', at: 2, x: 56, y: -2 },
        { n: 'g_top5', at: 3, x: 8, y: -2 },
        { n: 'g_top3', at: 4, x: 152, y: -2 },
        { n: 'g_top1', at: 7, x: 110, y: -2 },
        { n: 'g_pot2', at: 8, x: 84, y: -4 },
        { n: 'g_pot2', at: 8, x: 98, y: -4 }
      ]
    },
    {
      id: 'plaza', name: 'Fountain plaza', w: 232,
      cost: 80000, build: 50,
      pay: 320, gain: 0.4, hold: 12,
      up: 40000, grow: 1.6,
      rungs: [
        { add: 'water in the fountain', say: 'Water!' },
        { add: 'a statue fountain', say: 'Statue fountain!' },
        { add: 'water in the statue fountain', say: 'Flowing water!' },
        { add: 'a tiered fountain', say: 'Tiered fountain!' },
        { add: 'water in the tiers', say: 'Water in the tiers!' },
        { add: 'a grey stone fountain', say: 'Stone fountain!' },
        { add: 'two benches', say: 'Benches!' },
        { add: 'two stone pillars', say: 'Pillars!' },
        { add: 'two cherub statues', say: 'Cherubs!' }
      ],
      parts: [
        { n: 'g_pave1', at: 0, x: 0, y: 0 },
        { n: 'g_putto', at: 9, x: 16, y: 18 },
        { n: 'g_putto2', at: 9, x: 190, y: 18 },
        { n: 'g_f11', at: 0, to: 0, x: 102, y: -2 },
        { n: 'g_f13', at: 1, to: 1, x: 102, y: -2 },
        { n: 'g_f22', at: 2, to: 2, x: 92, y: -2 },
        { n: 'g_f24', at: 3, to: 3, x: 92, y: -2 },
        { n: 'g_f32', at: 4, to: 4, x: 84, y: -2 },
        { n: 'g_f34', at: 5, to: 5, x: 84, y: -2 },
        { n: 'g_f33', at: 6, x: 84, y: -2 },
        { n: 'g_bench', at: 7, x: 14, y: 2 },
        { n: 'g_bench', at: 7, x: 170, y: 2 },
        { n: 'g_pillar', at: 8, x: 58, y: 0 },
        { n: 'g_pillar', at: 8, x: 158, y: 0 }
      ]
    },
    {
      id: 'botanic', name: 'Botanical greenhouse', w: 232,
      cost: 1400000, build: 70,
      pay: 5000, gain: 0.4, hold: 4,
      up: 800000, grow: 1.65,
      unlocks: ['drones', 'heli'],
      rungs: [
        { add: 'a helipad on the lawn behind', say: 'Helipad!' },
        { add: 'glass panes', say: 'Glass!' },
        { add: 'plants inside', say: 'Full inside!' },
        { add: 'a side greenhouse', say: 'Side greenhouse!' },
        { add: 'plants in the side greenhouse', say: 'Plants!' },
        { add: 'a second side greenhouse', say: 'Second side greenhouse!' },
        { add: 'plants in the second side greenhouse', say: 'Plants!' },
        { add: 'a flower shelf at the door', say: 'Flower shelf!' }
      ],
      parts: [
        { n: 'helipad', at: 1, x: 56, y: 134 },
        { n: 'g_lgh0', at: 0, to: 2, x: 56, y: 0 },
        { n: 'g_lgh1', at: 3, x: 56, y: 0 },
        { n: 'g_lgh2', at: 2, x: 56, y: 0 },
        { n: 'g_gh0', at: 4, to: 4, x: 0, y: 0 },
        { n: 'g_gh1', at: 5, x: 0, y: 0 },
        { n: 'g_ghg', at: 4, x: 0, y: 0 },
        { n: 'g_gh0', at: 6, to: 6, x: 176, y: 0 },
        { n: 'g_gh1', at: 7, x: 176, y: 0 },
        { n: 'g_ghg', at: 6, x: 176, y: 0 },
        { n: 'g_shelf1', at: 8, x: 70, y: -10 }
      ]
    },
    {
      id: 'angel', name: 'Statue garden', w: 304,
      cost: 22000000, build: 120,
      pay: 32000, gain: 0.4, hold: 4,
      up: 12000000, grow: 1.8,
      capstone: true,
      rungs: [
        { add: 'stone pillars', say: 'Pillars!' },
        { add: 'two cherub statues', say: 'Cherubs!' },
        { add: 'hedge gates at both ends', say: 'Hedge gates!' },
        { add: 'flower benches', say: 'Flower benches!' },
        { add: 'hedge arches behind the gates', say: 'Hedge arches!' },
        { add: 'sunflowers by the road', say: 'Sunflowers!' },
        { add: 'vines on the plinth', say: 'Vines!' },
        { add: 'flower shelves out front', say: 'Flower shelves!' }
      ],
      parts: [
        { n: 'g_pave2', at: 0, x: 0, y: 0 },
        { n: 'g_arch1', at: 5, x: 8, y: 40 },
        { n: 'g_arch1', at: 5, x: 248, y: 40 },
        { n: 'g_gate4', at: 3, x: 0, y: 12 },
        { n: 'g_gate4', at: 3, x: 240, y: 12 },
        { n: 'g_angel', at: 0, to: 6, x: 114, y: 0 },
        { n: 'g_angelv', at: 7, x: 114, y: 0 },
        { n: 'g_pillar', at: 1, x: 94, y: 0 },
        { n: 'g_pillar', at: 1, x: 194, y: 0 },
        { n: 'g_putto', at: 2, x: 62, y: 0 },
        { n: 'g_putto2', at: 2, x: 212, y: 0 },
        { n: 'g_fbench', at: 4, x: 10, y: -10 },
        { n: 'g_fbench', at: 4, x: 246, y: -10 },
        { n: 'g_sunb', at: 6, x: 120, y: -14 },
        { n: 'g_sunb', at: 6, x: 168, y: -14 },
        { n: 'g_shelf1', at: 8, x: 72, y: -14 },
        { n: 'g_shelf1', at: 8, x: 200, y: -14 }
      ]
    }
  ]
});
