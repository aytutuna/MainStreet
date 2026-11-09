// lawn stripes, scattered gardens and hedges behind the street; the seed is fixed so the ground is the same every visit
function gardenYard(w) {
  var seed = 11;
  var list = [];
  var rnd = function (n) {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff;
    return (seed >> 8) % n;
  };
  var trees = ['tree_a', 'tree_b', 'tree_c'];
  list.push({ t: 2, x: 0, y: 132, w: w, h: 12 });
  list.push({ t: 3, x: 652, y: 0, w: 232, h: 96 });
  list.push({ t: 3, x: 1116, y: 0, w: 304, h: 48 });
  for (var sx = 130; sx < w; sx += 232) list.push({ t: 2, x: sx, y: 0, w: 12, h: 132 });
  for (var x = 20; x < w; x += 150 + rnd(50)) {
    var kind = rnd(100);
    if (kind < 30) {
      list.push({ t: 3, x: x, y: 150, w: 112, h: 64 });
      list.push({ n: 'g_f32', x: x + 24, y: 162 });
      list.push({ n: 'g_bench', x: x, y: 150 });
      list.push({ n: 'g_bench', x: x + 64, y: 150 });
    } else if (kind < 55) {
      list.push({ t: 4, x: x, y: 160, w: 128, h: 48 });
      list.push({ n: 'g_gate3', x: x, y: 208 });
      list.push({ n: 'g_gate3', x: x + 64, y: 208 });
      list.push({ n: 'g_top5', x: x + 40, y: 172 });
    } else if (kind < 80) {
      list.push({ n: 'g_arch3', x: x + 20, y: 196 });
      list.push({ n: 'g_top3', x: x + 30, y: 170 });
      list.push({ n: 'g_pot2', x: x + 4, y: 164 });
      list.push({ n: 'g_pot2', x: x + 96, y: 164 });
    } else {
      list.push({ n: trees[rnd(3)], x: x, y: 196 + rnd(20) });
      list.push({ n: 'g_hbush3', x: x + 40, y: 176 });
      list.push({ n: trees[rnd(3)], x: x + 62, y: 214 + rnd(20) });
    }
  }
  for (var row = 0; row < 5; row++) {
    for (x = -20 + row * 19; x < w; x += 58) {
      if (rnd(100) < 35) continue;
      list.push({ n: trees[rnd(3)], x: x + rnd(24), y: 290 + row * 60 + rnd(20) });
    }
  }
  return list;
}

DISTRICTS.push({
  id: 'garden',
  name: 'Garden',
  k: 2,
  ground: { sheet: 'g_tiles', base: 0, walk: 2, verge: 0, band: { tile: 4, from: 250, to: 330 }, end: ['tree_b', 'g_hbush3', 'tree_c'] },
  deco: gardenYard(1800),
  sprites: COMMON.concat(['tree_a', 'tree_b', 'tree_c', 'helipad', 'g_tiles',
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
        { add: 'a whitewashed shed', say: 'Whitewash!' },
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
        { n: 'g_can', at: 1, x: 100, y: -10 },
        { n: 'g_rake', at: 2, x: 124, y: 0 },
        { n: 'g_birdh', at: 3, x: 68, y: -4 },
        { n: 'g_wbench', at: 5, x: 8, y: 0 },
        { n: 'g_sprout1', at: 6, x: 14, y: -14 },
        { n: 'g_sprout2', at: 6, x: 34, y: -14 },
        { n: 'g_sprout3', at: 6, x: 54, y: -14 }
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
        { n: 'g_trellis', at: 6, x: 36, y: 14 },
        { n: 'g_cart0', at: 0, to: 0, x: 52, y: 0 },
        { n: 'g_cart1', at: 1, to: 2, x: 52, y: 0 },
        { n: 'g_cart2', at: 3, to: 7, x: 52, y: 0 },
        { n: 'g_cart3', at: 8, x: 52, y: 0 },
        { n: 'g_box1', at: 2, x: 18, y: -12 },
        { n: 'g_box2', at: 4, x: 90, y: -12 },
        { n: 'g_shelf1', at: 5, x: 52, y: -16 },
        { n: 'g_sunb', at: 7, x: 2, y: -12 },
        { n: 'g_sunb', at: 7, x: 120, y: -12 }
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
        { n: 'g_pot1', at: 3, x: 118, y: -8 },
        { n: 'g_pot2', at: 3, x: 132, y: -8 },
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
        { n: 'g_gate4', at: 6, x: 160, y: 0 },
        { n: 'g_top7', at: 2, x: 106, y: -14 },
        { n: 'g_top5', at: 3, x: 8, y: -16 },
        { n: 'g_top3', at: 4, x: 164, y: -16 },
        { n: 'g_top1', at: 7, x: 52, y: -18 },
        { n: 'g_pot2', at: 8, x: 134, y: -18 },
        { n: 'g_pot2', at: 8, x: 148, y: -18 }
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
        { n: 'g_putto', at: 9, x: 16, y: 10 },
        { n: 'g_putto2', at: 9, x: 190, y: 10 },
        { n: 'g_f11', at: 0, to: 0, x: 102, y: -2 },
        { n: 'g_f13', at: 1, to: 1, x: 102, y: -2 },
        { n: 'g_f22', at: 2, to: 2, x: 92, y: -2 },
        { n: 'g_f24', at: 3, to: 3, x: 92, y: -2 },
        { n: 'g_f32', at: 4, to: 4, x: 84, y: -2 },
        { n: 'g_f34', at: 5, to: 5, x: 84, y: -2 },
        { n: 'g_f33', at: 6, x: 84, y: -2 },
        { n: 'g_bench', at: 7, x: 6, y: -8 },
        { n: 'g_bench', at: 7, x: 178, y: -8 },
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
        { add: 'a vine-covered angel', say: 'Vines!' },
        { add: 'flower shelves out front', say: 'Flower shelves!' }
      ],
      parts: [
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
