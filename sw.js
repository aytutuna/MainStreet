var CACHE = 'mainstreet-99e1ce9d';
var FILES = [
  './',
  'data.js',
  'index.html',
  'mall.js',
  'manifest.webmanifest',
  'sim.js',
  'style.css',
  'ui.js',
  'icons/apple-touch-icon.png',
  'icons/icon-192.png',
  'icons/icon-512.png',
  'icons/icon-maskable.png',
  'assets/arcade/air-hockey.png',
  'assets/arcade/arcade-machine.png',
  'assets/arcade/claw-machine.png',
  'assets/coin.png',
  'assets/models/arcade/License.txt',
  'assets/models/arcade/Textures/colormap.png',
  'assets/models/arcade/air-hockey.glb',
  'assets/models/arcade/arcade-machine.glb',
  'assets/models/arcade/basketball-game.glb',
  'assets/models/arcade/cash-register.glb',
  'assets/models/arcade/character-employee.glb',
  'assets/models/arcade/character-gamer.glb',
  'assets/models/arcade/claw-machine.glb',
  'assets/models/arcade/column.glb',
  'assets/models/arcade/dance-machine.glb',
  'assets/models/arcade/floor.glb',
  'assets/models/arcade/gambling-machine.glb',
  'assets/models/arcade/pinball.glb',
  'assets/models/arcade/prize-wheel.glb',
  'assets/models/arcade/prizes.glb',
  'assets/models/arcade/ticket-machine.glb',
  'assets/models/arcade/vending-machine.glb',
  'assets/models/arcade/wall-corner.glb',
  'assets/models/arcade/wall-door-rotate.glb',
  'assets/models/arcade/wall-window.glb',
  'assets/models/arcade/wall.glb',
  'assets/models/chars/License.txt',
  'assets/models/chars/Textures/colormap.png',
  'assets/models/chars/character-female-a.glb',
  'assets/models/chars/character-female-b.glb',
  'assets/models/chars/character-female-c.glb',
  'assets/models/chars/character-female-d.glb',
  'assets/models/chars/character-female-e.glb',
  'assets/models/chars/character-female-f.glb',
  'assets/models/chars/character-male-a.glb',
  'assets/models/chars/character-male-b.glb',
  'assets/models/chars/character-male-c.glb',
  'assets/models/chars/character-male-d.glb',
  'assets/models/chars/character-male-e.glb',
  'assets/models/chars/character-male-f.glb',
  'assets/models/shop/License.txt',
  'assets/models/shop/Textures/colormap.png',
  'assets/models/shop/bottle-return.glb',
  'assets/models/shop/cash-register-self.glb',
  'assets/models/shop/cash-register.glb',
  'assets/models/shop/character-employee.glb',
  'assets/models/shop/clothing-rack.glb',
  'assets/models/shop/clothing-table.glb',
  'assets/models/shop/column.glb',
  'assets/models/shop/display-bread.glb',
  'assets/models/shop/display-cans.glb',
  'assets/models/shop/display-flowers.glb',
  'assets/models/shop/display-fruit.glb',
  'assets/models/shop/display-small.glb',
  'assets/models/shop/fence-door-rotate.glb',
  'assets/models/shop/fence.glb',
  'assets/models/shop/floor-wood.glb',
  'assets/models/shop/floor.glb',
  'assets/models/shop/freezer.glb',
  'assets/models/shop/freezers-standing.glb',
  'assets/models/shop/gacha-machine.glb',
  'assets/models/shop/hand-truck.glb',
  'assets/models/shop/mannequin.glb',
  'assets/models/shop/shelf-bags.glb',
  'assets/models/shop/shelf-boxes.glb',
  'assets/models/shop/shelf-end.glb',
  'assets/models/shop/shopping-basket.glb',
  'assets/models/shop/shopping-cart.glb',
  'assets/models/shop/wall-corner.glb',
  'assets/models/shop/wall-door-rotate.glb',
  'assets/models/shop/wall-window.glb',
  'assets/models/shop/wall.glb',
  'assets/shop/clothing-rack.png',
  'assets/shop/display-bread.png',
  'assets/shop/display-flowers.png',
  'assets/shop/display-fruit.png',
  'assets/shop/freezers-standing.png',
  'assets/shop/gacha-machine.png',
  'assets/shop/shelf-boxes.png',
  'assets/shop/shopping-cart.png',
  'assets/ui_bolt.png',
  'assets/ui_boss.png',
  'assets/ui_gem.png',
  'assets/ui_gift.png',
  'assets/ui_goal.png',
  'assets/ui_star.png',
  'assets/ui_warp.png',
  'vendor/three/LICENSE',
  'vendor/three/build/three.module.min.js',
  'vendor/three/examples/jsm/loaders/GLTFLoader.js',
  'vendor/three/examples/jsm/utils/BufferGeometryUtils.js',
  'vendor/three/examples/jsm/utils/SkeletonUtils.js'
];

// a new worker waits for the old page to close, so a running game never loses its files under it
self.addEventListener('install', function (e) {
  e.waitUntil(caches.open(CACHE).then(function (c) {
    return Promise.all(FILES.map(function (f) {
      return c.add(new Request(f, { cache: 'reload' }));
    }));
  }));
});

self.addEventListener('activate', function (e) {
  e.waitUntil(caches.keys().then(function (keys) {
    return Promise.all(keys.filter(function (k) {
      return k !== CACHE;
    }).map(function (k) {
      return caches.delete(k);
    }));
  }));
});

self.addEventListener('fetch', function (e) {
  e.respondWith(caches.match(e.request).then(function (hit) {
    return hit || fetch(e.request);
  }));
});
