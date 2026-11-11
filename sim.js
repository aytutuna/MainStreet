var free = true; // TODO: unlimited money while testing, set to false before release

var KEY = 'mainstreet.v3';
var MAX_AWAY = 8 * 3600;
var STEP = 0.5;
var AWAY_STEP = 5;
var AWAY_WIN = 30;
var AWAY_MIN = 30;
var AWAY_FINE = 600;
var AWAY_WARM = 3;
var AWAY_BLEND = 0.15;
var START_CASH = 250;
var WORK_SHARE = 0.6;
var BASE_HAPPY = 40;
var MOVE_IN = 35;
var MOVE_RATE = 1.5;
var MAX_REQ = 3;
var REQ_GAP = 20;
var REQ_FIRST = 5;
var REQ_LIFE = 600;
var REQ_MUTE = 120;
var QUEUE = 60;
var TRAIN_EVERY = 120;
var TRAIN_ORDER = 240;
var ORDER_GAP = 90;
var ORDER_PAY = 3;
var ORDER_LIFE = 300;
var STOCK_BASE = 60;
var TAX = 0.5;
var TRUCK_LOAD = 8;
var TRUCK_SPEED = 7;
var LOAD_TIME = 2;
var DEMOLISH_TIME = 3;
var BUMP = { hp: 3, secs: 120 };
var WIN_POP = 300;
var WIN_HAPPY = 70;

var TUTORIAL = [
  { want: 'cottage', n: 1, lvl: 1, msg: 'We have nowhere to live. Build a cottage.', reward: 40 },
  { want: 'wheat', n: 1, lvl: 1, msg: 'We would like fresh bread. Start with a wheat field.', reward: 40 },
  { want: 'coop', n: 1, lvl: 1, msg: 'Bread needs eggs as well. Build a chicken coop.', reward: 60 },
  { want: 'bakery', n: 1, lvl: 1, msg: 'Now build a bakery and we will buy your bread.', reward: 100 },
  { want: 'cottage', n: 3, lvl: 1, msg: 'The bakery needs bakers. Build two more cottages.', reward: 60 },
  { want: 'veg', n: 1, lvl: 1, msg: 'People want vegetables. Plant a vegetable patch.', reward: 70 },
  { want: 'market', n: 1, lvl: 1, msg: 'Build a market to sell eggs and vegetables.', reward: 80 },
  { want: 'depot', n: 1, lvl: 1, msg: 'One truck cannot keep up. Build a depot.', reward: 100 },
  { want: 'park', n: 1, lvl: 1, msg: 'Give people somewhere to relax. Build a park.', reward: 110 },
  { want: 'cottage', n: 1, lvl: 2, msg: 'A happy home can grow. Upgrade a cottage.', reward: 120 }
];

var S;
var R = {};
var B = {};
var GD = {};
var AR = {};
var EU = [];
var MH = [];
var moves = [];
var trips = [];
var notes = [];
var quiet = false;
var looked = 0;
var haul = 0;
var LOOK_EVERY = 30;
var WAIT_SHORT = 20;
var STORE = -1;

BUILDINGS.forEach(function (b) {
  B[b.id] = b;
});
GOODS.forEach(function (g) {
  GD[g.id] = g;
});
AREAS.forEach(function (a) {
  AR[a.id] = a;
});
PLOTS.forEach(function (p, i) {
  EU[i] = [];
  MH[i] = [];
  PLOTS.forEach(function (q, j) {
    var dx = p.x + p.w / 2 - q.x - q.w / 2;
    var dy = p.y + p.h / 2 - q.y - q.h / 2;
    EU[i][j] = Math.sqrt(dx * dx + dy * dy);
    MH[i][j] = Math.abs(dx) + Math.abs(dy);
  });
});

function now() {
  return typeof Date !== 'undefined' ? Date.now() : 0;
}

function keyed(v) {
  var o = {};
  GOODS.forEach(function (g) {
    o[g.id] = v;
  });
  return o;
}

function newPlot(p) {
  return {
    id: p.id, b: '', l: 0, n: 0, left: 0, off: false, dem: 0, back: 0, res: 0, acc: 0, h: 0, cov: 0, tok: 0,
    wait: '', ws: 0, hold: 0, mk: 0, sell: 0, out: 0, inc: 0,
    shelf: keyed(0), due: keyed(0), claim: keyed(0), last: keyed(-1000)
  };
}

function newState() {
  return {
    v: 3, t: 0, saved: now(), seed: 20481, cash: START_CASH, earned: 0, rate: 0, flow: 0,
    gross: 0, built: 0, deliv: 0, won: false, tut: 0, rid: 0, rq: 0, next: 0, boost: 0, boostT: 0, tour: 0, tacc: 0, train: 0, oid: 0, onext: 0,
    open: { village: true, farm: false, beach: false, downtown: false },
    stock: keyed(0), due: keyed(0), claim: keyed(0), vis: keyed(0),
    emp: keyed(0), acc: keyed(0), mk: keyed(0), us: keyed(0), fm: keyed(0), fu: keyed(0), mute: {},
    plots: PLOTS.map(newPlot),
    trucks: [],
    req: [],
    orders: []
  };
}

function rnd() {
  S.seed = (S.seed + 0x6d2b79f5) | 0;
  var t = Math.imul(S.seed ^ (S.seed >>> 15), 1 | S.seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

function push(q, e) {
  if (quiet) return;
  q.push(e);
  if (q.length > QUEUE) q.shift();
}

function note(type, plot, text, bid, reward, lvl) {
  push(notes, { t: S.t, type: type, kind: type, plot: plot, text: text || '', bid: bid || '', reward: reward || 0, lvl: lvl || 0 });
}

function dist(i, j) {
  return EU[i][j];
}

// trucks drive in straight tile steps until the roads exist
function road(a, b) {
  if (a === STORE && b === STORE) return 0;
  if (a === STORE) return Math.abs(R.spot.x - PLOTS[b].x - PLOTS[b].w / 2) + Math.abs(R.spot.y - PLOTS[b].y - PLOTS[b].h / 2);
  if (b === STORE) return road(b, a);
  return MH[a][b];
}

function active(p) {
  return p.b !== '' && p.l > 0 && p.dem <= 0 && !p.off;
}

function stockCap() {
  return STOCK_BASE + R.store;
}

function holdCap(b, l) {
  return 10 + b.rate[l - 1];
}

function pay(c) {
  if (!free) S.cash -= c;
}

function earn(n, i) {
  S.cash += n;
  S.earned += n;
  S.gross += n;
  S.flow += n;
  if (i >= 0) S.plots[i].sell += n;
}

function pick(list) {
  return list[Math.floor(rnd() * list.length)];
}

function fits(i, bid) {
  var b = B[bid];
  var q = PLOTS[i];
  return b.size === q.kind && b.areas.indexOf(q.area) >= 0 && (b.size !== 'fixed' || b.spot === q.id);
}

function refresh() {
  var pop = 0;
  var cap = 0;
  var soon = 0;
  var need = 0;
  var skill = 0;
  var fleet = 1;
  R.homes = [];
  R.shops = [];
  R.svc = [];
  R.hotels = [];
  R.offices = [];
  R.train = -1;
  R.depot = -1;
  R.ware = -1;
  R.sells = {};
  R.src = {};
  R.busy = 0;
  R.store = 0;
  S.plots.forEach(function (p, i) {
    if (p.n) R.busy++;
    if (p.n && p.dem <= 0 && B[p.b].cap) soon += B[p.b].cap[p.n - 1] - (p.l > 0 ? B[p.b].cap[p.l - 1] : 0);
    if (!active(p)) return;
    var b = B[p.b];
    var l = p.l - 1;
    need += b.workers[l];
    if (b.cap) {
      R.homes.push(i);
      pop += p.res;
      cap += b.cap[l];
    }
    if (b.sells) {
      R.shops.push(i);
      b.sells.forEach(function (g) {
        R.sells[g] = true;
      });
    }
    if (b.makes) (R.src[b.makes] = R.src[b.makes] || []).push(i);
    if (b.bonus) R.svc.push(i);
    if (b.workforce) skill = Math.max(skill, b.workforce);
    if (b.store) {
      R.store += b.store[l];
      R.ware = i;
    }
    if (b.trucks) {
      fleet += b.trucks[l];
      R.depot = i;
    }
    if (b.tourists) R.hotels.push(i);
    if (b.pay) R.offices.push(i);
    if (b.export) R.train = i;
  });
  R.pop = pop;
  R.cap = cap;
  R.soon = soon;
  R.need = need;
  R.work = pop * (WORK_SHARE + skill);
  R.f = need > 0 ? Math.min(1, R.work / need) : 1;
  R.storeAt = R.ware >= 0 ? R.ware : R.depot;
  R.spot = R.storeAt >= 0 ? { x: PLOTS[R.storeAt].x + PLOTS[R.storeAt].w / 2, y: PLOTS[R.storeAt].y + PLOTS[R.storeAt].h / 2 }
    : { x: 64, y: 165 };
  R.fleet = fleet;
  R.reach = {};
  R.cover = {};
  R.homes.forEach(function (i) {
    R.reach[i] = R.shops.filter(function (j) {
      return dist(i, j) <= B[S.plots[j].b].reach[S.plots[j].l - 1];
    });
    var cov = {};
    R.svc.forEach(function (j) {
      var q = S.plots[j];
      if (dist(i, j) <= B[q.b].radius[q.l - 1]) cov[q.b] = B[q.b].bonus[q.l - 1] * R.f;
    });
    R.cover[i] = cov;
  });
  fleetSize();
  happiness();
}

function happiness() {
  var vis = 0;
  var emp = 0;
  GOODS.forEach(function (g) {
    vis += S.vis[g.id];
    emp += S.emp[g.id];
  });
  R.empty = vis > 4 && emp > vis * 0.2;
  var common = (R.empty ? -10 : 0) + (S.boostT > 0 ? S.boost : 0);
  var sum = 0;
  R.shut = 0;
  R.homes.forEach(function (i) {
    var p = S.plots[i];
    var h = BASE_HAPPY + common;
    var kinds = 0;
    GOODS.forEach(function (g) {
      if (R.reach[i].some(function (j) {
        return S.t - S.plots[j].last[g.id] < 60;
      })) kinds++;
    });
    h += Math.min(15, kinds * 3);
    var cov = 0;
    for (var k in R.cover[i]) {
      h += R.cover[i][k];
      cov++;
    }
    p.h = Math.max(0, Math.min(100, h));
    p.cov = cov;
    sum += p.h * p.res;
    if (p.h < MOVE_IN) R.shut += B[p.b].cap[p.l - 1] - p.res;
  });
  R.happy = R.pop > 0 ? sum / R.pop : BASE_HAPPY;
}

function fleetSize() {
  var t = S.trucks;
  while (t.length < R.fleet) t.push({ at: STORE, ph: 'idle', src: STORE, dst: STORE, g: '', n: 0, r: 0, left: 0, dur: 0, from: STORE });
  if (t.length > R.fleet) {
    t.splice(R.fleet).forEach(function (k) {
      if (k.ph === 'haul') stash(k.g, k.n);
    });
    rebook();
  }
}

// reservations are derived from the trucks, so a changed fleet or a loaded save cannot leave stale ones
function rebook() {
  S.plots.forEach(function (p) {
    for (var g in p.due) p.due[g] = p.claim[g] = 0;
  });
  for (var g in S.due) S.due[g] = S.claim[g] = 0;
  S.trucks.forEach(function (k) {
    if (k.ph === 'idle') return;
    book(k.dst, 'due', k.g, k.r);
    if (k.ph === 'pick') book(k.src, 'claim', k.g, k.r);
  });
}

function book(node, what, g, n) {
  var o = node === STORE ? S : S.plots[node];
  o[what][g] += n;
}

function construct(dt) {
  S.plots.forEach(function (p, i) {
    if (p.dem > 0) {
      p.dem -= dt;
      if (p.dem > 0) return;
      S.cash += p.back;
      note('demolished', i, B[p.b] ? B[p.b].name : '', p.b);
      S.plots[i] = newPlot(PLOTS[i]);
      rebook();
      return;
    }
    if (!p.n) return;
    p.left -= dt;
    if (p.left > 0) return;
    var first = p.l === 0;
    p.l = p.n;
    p.n = 0;
    p.left = 0;
    S.built++;
    note(first ? 'built' : 'upgraded', i, B[p.b].name, p.b, 0, p.l);
  });
}

function spill(g, n) {
  if (n <= 0) return;
  if (R.train >= 0) earn(n * GD[g].price * 0.5, R.train);
}

function stash(g, n) {
  var put = Math.min(n, Math.max(0, stockCap() - S.stock[g]));
  S.stock[g] += put;
  spill(g, n - put);
}

function produce(dt) {
  S.plots.forEach(function (p) {
    var held = p.wait ? p.ws : 0;
    p.wait = '';
    p.ws = 0;
    if (!active(p)) return;
    var b = B[p.b];
    if (!b.makes) return;
    var want = b.rate[p.l - 1] / 60 * dt * R.f;
    if (b.needs) {
      want = Math.max(0, Math.min(want, b.shelf[p.l - 1] - p.shelf[b.makes]));
      b.needs.forEach(function (g) {
        if (p.shelf[g] < want) {
          want = p.shelf[g];
          p.wait = g;
        }
      });
      if (p.wait) p.ws = held + dt;
      b.needs.forEach(function (g) {
        p.shelf[g] -= want;
        S.fu[g] += want;
      });
      p.shelf[b.makes] += want;
      p.mk += want;
      S.fm[b.makes] += want;
      return;
    }
    var made = Math.min(want, holdCap(b, p.l) - p.hold);
    p.hold += made;
    p.mk += made;
    S.fm[b.makes] += want;
    spill(b.makes, want - made);
  });
}

function wanted(b) {
  var out = [];
  (b.sells || []).concat(b.needs || []).forEach(function (g) {
    if (g !== b.makes && out.indexOf(g) < 0) out.push(g);
  });
  return out;
}

// units of g a truck could collect at a node now, beyond what other trucks have already claimed
function spare(node, g) {
  if (node === STORE) return S.stock[g] - S.claim[g];
  var p = S.plots[node];
  var b = B[p.b];
  if (!active(p) || b.makes !== g) return 0;
  if (b.needs) return p.shelf[g] - b.shelf[p.l - 1] * 0.4 - p.claim[g];
  return p.hold - p.claim[g];
}

function bestSource(g, dst, gap, from) {
  var best = null;
  var top = 0;
  var list = (R.src[g] || []).concat([STORE]);
  list.forEach(function (s) {
    if (s === dst) return;
    var have = spare(s, g);
    if (have < Math.min(4, gap)) return;
    var d = road(from, s) + road(s, dst);
    var w = (s === STORE ? 0.6 : 1) / (1 + d / 90);
    if (w > top) {
      top = w;
      best = { src: s, w: w, n: Math.min(TRUCK_LOAD, gap, have) };
    }
  });
  return best;
}

function dispatch(k) {
  var best = null;
  var top = 0;
  R.shops.forEach(function (i) {
    var p = S.plots[i];
    var b = B[p.b];
    var cap = b.shelf[p.l - 1];
    wanted(b).forEach(function (g) {
      var gap = cap - p.shelf[g] - p.due[g];
      if (gap < Math.max(2, cap * 0.4)) return;
      var s = bestSource(g, i, gap, k.at);
      if (!s) return;
      var score = (gap / cap + 0.2) * s.w;
      if (score > top) {
        top = score;
        best = { src: s.src, dst: i, g: g, n: s.n };
      }
    });
  });
  // surplus nobody wants yet goes to the store
  for (var g in R.src) {
    R.src[g].forEach(function (i) {
      var p = S.plots[i];
      var b = B[p.b];
      if (b.needs) return;
      var full = p.hold / holdCap(b, p.l);
      var room = stockCap() - S.stock[g] - S.due[g];
      var have = spare(i, g);
      if (full < 0.6 || room < 4 || have < 4) return;
      var score = 0.25 * full / (1 + (road(k.at, i) + road(i, STORE)) / 90);
      if (score > top) {
        top = score;
        best = { src: i, dst: STORE, g: g, n: Math.min(TRUCK_LOAD, have, room) };
      }
    });
  }
  if (!best) return false;
  k.src = best.src;
  k.dst = best.dst;
  k.g = best.g;
  k.n = k.r = best.n;
  k.ph = 'pick';
  k.from = k.at;
  k.left = k.dur = road(k.at, k.src) / TRUCK_SPEED;
  book(k.src, 'claim', k.g, k.r);
  book(k.dst, 'due', k.g, k.r);
  leg(k, k.from, k.src, 0);
  return true;
}

function nid(n) {
  return n === STORE ? R.storeAt : n;
}

function leg(k, from, to, n) {
  if (nid(from) < 0 || nid(to) < 0) return;
  push(moves, { t: S.t, from: nid(from), to: nid(to), g: k.g, n: n, dur: k.dur });
}

function pickup(k) {
  var p = k.src === STORE ? null : S.plots[k.src];
  var ok = !p || (active(p) && B[p.b].makes === k.g);
  var cooks = p && ok && B[p.b].needs;
  var have = !p ? S.stock[k.g] : !ok ? 0 : cooks ? p.shelf[k.g] : p.hold;
  var n = Math.max(0, Math.min(k.r, have));
  if (!p) S.stock[k.g] -= n;
  else if (cooks) p.shelf[k.g] -= n;
  else if (ok) p.hold -= n;
  book(k.src, 'claim', k.g, -k.r);
  k.n = n;
}

function unload(k) {
  book(k.dst, 'due', k.g, -k.r);
  var p = k.dst === STORE ? null : S.plots[k.dst];
  if (p && active(p) && wanted(B[p.b]).indexOf(k.g) >= 0) p.shelf[k.g] += k.n;
  else stash(k.g, k.n);
  k.n = 0;
}

function moveTrucks(dt) {
  var dry = false;
  var out = 0;
  S.trucks.forEach(function (k) {
    if (k.ph !== 'idle') out++;
  });
  haul += (out / Math.max(1, S.trucks.length) - haul) * (1 - Math.exp(-dt / 30));
  S.trucks.forEach(function (k) {
    var left = dt;
    for (var guard = 0; left > 0 && guard < 40; guard++) {
      if (k.ph === 'idle') {
        if (dry || !dispatch(k)) {
          dry = true;
          return;
        }
        continue;
      }
      var use = Math.min(left, k.left);
      k.left -= use;
      left -= use;
      if (k.left > 0) return;
      if (k.ph === 'pick') {
        k.at = k.src;
        pickup(k);
        if (k.n <= 0) {
          book(k.dst, 'due', k.g, -k.r);
          k.ph = 'idle';
          continue;
        }
        k.ph = 'haul';
        k.from = k.src;
        k.left = k.dur = road(k.src, k.dst) / TRUCK_SPEED + LOAD_TIME;
        leg(k, k.src, k.dst, k.n);
      } else {
        k.at = k.dst;
        unload(k);
        k.ph = 'idle';
      }
    }
  });
}

function stockOf(g) {
  var n = S.stock[g];
  (R.src[g] || []).forEach(function (i) {
    if (!B[S.plots[i].b].needs) n += S.plots[i].hold;
  });
  return n;
}

function trade(dt) {
  // a trickle from the residents so a town that spent its money badly can still recover
  earn(R.pop * TAX / 60 * dt, -1);
  R.hotels.forEach(function (i) {
    var p = S.plots[i];
    S.tour += B[p.b].tourists[p.l - 1] / 60 * dt * R.f;
  });
  R.offices.forEach(function (i) {
    var p = S.plots[i];
    var b = B[p.b];
    earn(b.pay[p.l - 1] / 60 * dt * b.workers[p.l - 1] * R.f, i);
  });
  if (R.train < 0) return;
  var t = S.plots[R.train];
  var b = B[t.b];
  S.train += dt;
  if (S.train >= TRAIN_EVERY) {
    S.train -= TRAIN_EVERY;
    makeOrder('train', b.train[t.l - 1]);
  }
  // the store sells what it cannot hold at half price
  for (var g in S.stock) {
    var extra = S.stock[g] - stockCap() * 0.9;
    if (extra <= 0) continue;
    var n = Math.min(extra, b.export[t.l - 1] / 60 * dt * R.f);
    S.stock[g] -= n;
    earn(n * GD[g].price * 0.5, R.train);
  }
}

function makeOrder(from, tourists) {
  var goods = GOODS.filter(function (g) {
    return g.want > 0 && (R.src[g.id] || []).some(function (i) {
      return !B[S.plots[i].b].needs;
    });
  });
  if (!goods.length) return;
  var need = {};
  var worth = 0;
  var kinds = Math.min(goods.length, from === 'train' ? 3 : 2);
  var size = Math.max(8, Math.round(R.pop * (from === 'train' ? 0.4 : 0.2)));
  for (var k = 0; k < kinds; k++) {
    var g = goods.splice(Math.floor(rnd() * goods.length), 1)[0];
    need[g.id] = Math.min(size, 80);
    worth += need[g.id] * g.price;
  }
  S.orders.push({ id: ++S.oid, from: from, need: need, reward: Math.round(worth * (from === 'train' ? ORDER_PAY + 1 : ORDER_PAY)),
    left: from === 'train' ? TRAIN_ORDER : ORDER_LIFE, tourists: from === 'train' ? tourists : 0 });
  note('order', R.train, from, '', S.orders[S.orders.length - 1].reward);
}

function orders(dt) {
  S.orders = S.orders.filter(function (o) {
    if (!o.left) return true;
    o.left -= dt;
    return o.left > 0;
  });
  var town = S.orders.filter(function (o) {
    return o.from === 'town';
  }).length;
  if (S.t >= S.onext && R.pop >= 8 && town < (S.open.farm ? 2 : 1)) {
    S.onext = S.t + ORDER_GAP;
    makeOrder('town', 0);
  }
}

function deliver(id) {
  var o = S.orders.filter(function (x) {
    return x.id === +id;
  })[0];
  if (!o) return false;
  for (var g in o.need) if (stockOf(g) < o.need[g]) return false;
  for (g in o.need) {
    var left = o.need[g];
    var take = Math.min(left, S.stock[g]);
    S.stock[g] -= take;
    left -= take;
    (R.src[g] || []).forEach(function (i) {
      var p = S.plots[i];
      if (B[p.b].needs) return;
      var t = Math.min(left, p.hold);
      p.hold -= t;
      left -= t;
    });
  }
  S.cash += o.reward;
  S.earned += o.reward;
  S.deliv++;
  S.tour += o.tourists;
  S.orders.splice(S.orders.indexOf(o), 1);
  note('delivered', -1, o.from, '', o.reward);
  return true;
}

function pickHome() {
  var r = rnd() * R.pop;
  for (var k = 0; k < R.homes.length; k++) {
    r -= S.plots[R.homes[k]].res;
    if (r < 0) return R.homes[k];
  }
  return R.homes[R.homes.length - 1];
}

function stocked(p, g) {
  return p.tok >= 1 && p.shelf[g] >= 1 && B[p.b].sells.indexOf(g) >= 0;
}

function pickShop(g, home) {
  var list = home >= 0 ? R.reach[home] : R.shops;
  var total = 0;
  list.forEach(function (i) {
    if (stocked(S.plots[i], g)) total += S.plots[i].l;
  });
  if (!total) return -1;
  var r = rnd() * total;
  for (var k = 0; k < list.length; k++) {
    var p = S.plots[list[k]];
    if (!stocked(p, g)) continue;
    r -= p.l;
    if (r < 0) return list[k];
  }
  return -1;
}

// a home with no shop in reach for a good simply goes without it; only a stocked-out shop counts as an empty shelf
function visit(g, home) {
  if (home >= 0 && !R.reach[home].some(function (j) {
    return B[S.plots[j].b].sells.indexOf(g) >= 0;
  })) return;
  S.vis[g]++;
  var i = pickShop(g, home);
  if (i < 0) {
    S.emp[g]++;
    return;
  }
  var p = S.plots[i];
  p.shelf[g]--;
  p.tok--;
  S.fu[g]++;
  p.last[g] = S.t;
  var h = home >= 0 ? S.plots[home].h : R.happy;
  earn(GD[g].price * (0.6 + h / 100), i);
  var from = home;
  if (home < 0) from = R.hotels.length ? pick(R.hotels) : R.train;
  if (from >= 0) push(trips, { t: S.t, from: from, to: i, g: g, tourist: home < 0 });
}

function shop(dt) {
  var keep = Math.exp(-dt / 60);
  GOODS.forEach(function (g) {
    S.vis[g.id] *= keep;
    S.emp[g.id] *= keep;
  });
  R.shops.forEach(function (i) {
    var p = S.plots[i];
    var rate = B[p.b].serve[p.l - 1] * R.f / 60;
    p.tok = Math.min(p.tok + rate * dt, Math.max(2, rate * 20));
  });
  if (R.pop > 0) {
    GOODS.forEach(function (g) {
      if (!g.want || !R.sells[g.id]) return;
      S.acc[g.id] += R.pop * g.want / 60 * dt;
      while (S.acc[g.id] >= 1) {
        S.acc[g.id]--;
        visit(g.id, pickHome());
      }
    });
  }
  var out = S.tour * (1 - Math.exp(-dt / 30));
  S.tour -= out;
  S.tacc += out;
  var wantedGoods = GOODS.filter(function (g) {
    return g.want && R.sells[g.id];
  });
  while (S.tacc >= 1) {
    S.tacc--;
    if (wantedGoods.length) visit(pick(wantedGoods).id, -1);
  }
}

function settle(dt) {
  R.homes.forEach(function (i) {
    var p = S.plots[i];
    var cap = B[p.b].cap[p.l - 1];
    if (p.h >= MOVE_IN && p.res < cap) {
      p.acc += MOVE_RATE * (p.h - 30) / 20 / 60 * dt;
      while (p.acc >= 1 && p.res < cap) {
        p.acc--;
        p.res++;
      }
      if (p.res >= cap) p.acc = 0;
    } else {
      p.acc = 0;
    }
    if (p.res > cap) p.res = cap;
  });
}

function unlock() {
  AREAS.forEach(function (a) {
    if (S.open[a.id] || R.pop < a.unlock) return;
    S.open[a.id] = true;
    note('area', -1, a.name, a.id);
  });
  if (!S.won && R.pop >= WIN_POP && R.happy >= WIN_HAPPY) {
    S.won = true;
    note('won', -1, 'Main Street');
  }
}

function smooth(dt) {
  var k = 1 - Math.exp(-dt / 30);
  S.plots.forEach(function (p) {
    p.out += (p.mk * 60 / dt - p.out) * k;
    p.inc += (p.sell * 60 / dt - p.inc) * k;
    p.mk = 0;
    p.sell = 0;
  });
  S.rate += (S.flow * 60 / dt - S.rate) * (1 - Math.exp(-dt / 60));
  S.flow = 0;
  GOODS.forEach(function (g) {
    S.mk[g.id] += (S.fm[g.id] * 60 / dt - S.mk[g.id]) * k;
    S.us[g.id] += (S.fu[g.id] * 60 / dt - S.us[g.id]) * k;
    S.fm[g.id] = S.fu[g.id] = 0;
  });
}

function makeCap(g) {
  var n = 0;
  S.plots.forEach(function (p) {
    if (active(p) && B[p.b].makes === g) n += B[p.b].rate[p.l - 1];
  });
  return n;
}

function shortOf(g) {
  if (S.vis[g] >= 2.5 && S.emp[g] > S.vis[g] * 0.25) return true;
  return S.plots.some(function (p) {
    return active(p) && p.wait === g && p.ws >= WAIT_SHORT && S.stock[g] < 4 && p.due[g] < 1 && !piled(g, 0.4);
  });
}

function emptyPlot(bid, near, radius) {
  var best = -1;
  var at = 1e9;
  PLOTS.forEach(function (q, i) {
    if (S.plots[i].b || !fits(i, bid) || !S.open[q.area]) return;
    var d = near >= 0 ? dist(near, i) : i;
    if (near >= 0 && d > radius) return;
    if (d < at) {
      at = d;
      best = i;
    }
  });
  return best;
}

function siteFor(bid, home) {
  var b = B[bid];
  var span = b.reach || b.radius;
  return span ? emptyPlot(bid, home, span[0]) : emptyPlot(bid, -1, 0);
}

function maker(g) {
  for (var i = 0; i < S.plots.length; i++) {
    if (active(S.plots[i]) && B[S.plots[i].b].makes === g) return i;
  }
  return -1;
}

function has(bid) {
  return S.plots.some(function (p) {
    return p.b === bid && p.l > 0;
  });
}

function unlocked(b) {
  return b.areas.some(function (a) {
    return S.open[a];
  });
}

function wantMet(i, w) {
  var p = S.plots[i];
  var kind = w.split(':')[0];
  var arg = w.split(':')[1];
  if (kind === 'sell') {
    return R.reach[i] !== undefined && R.reach[i].some(function (j) {
      return B[S.plots[j].b].sells.indexOf(arg) >= 0;
    });
  }
  if (kind === 'foods') {
    var seen = {};
    (R.reach[i] || []).forEach(function (j) {
      B[S.plots[j].b].sells.forEach(function (g) {
        seen[g] = true;
      });
    });
    return Object.keys(seen).length >= +arg;
  }
  if (kind === 'cover') {
    return arg.split(',').some(function (id) {
      return R.cover[i] !== undefined && R.cover[i][id] !== undefined;
    });
  }
  if (kind === 'shop') {
    return (R.reach[i] || []).some(function (j) {
      return S.plots[j].b === arg;
    });
  }
  if (kind === 'happy') return p.h >= +arg;
  return has(arg);
}

function wantText(w) {
  var kind = w.split(':')[0];
  var arg = w.split(':')[1];
  var names = arg.split(',').map(function (a) {
    return (B[a] ? B[a].name : GD[a] ? GD[a].name : a).toLowerCase();
  }).join(' or ');
  if (kind === 'sell') return names + ' within reach';
  if (kind === 'foods') return arg + ' kinds of food within reach';
  if (kind === 'cover') return names + ' nearby';
  if (kind === 'shop') return names + ' within reach';
  if (kind === 'happy') return 'happiness ' + arg;
  return (/^[aeiou]/.test(names) ? 'an ' : 'a ') + names + ' in town';
}

function wantBuild(w) {
  var kind = w.split(':')[0];
  var arg = w.split(':')[1];
  if (kind === 'sell') {
    return BUILDINGS.filter(function (b) {
      return b.sells && b.sells.indexOf(arg) >= 0;
    }).sort(function (a, c) {
      return a.cost[0] - c.cost[0];
    })[0].id;
  }
  if (kind === 'foods') return 'market';
  if (kind === 'happy') return 'park';
  return arg.split(',')[0];
}

function wants(i) {
  if (!validLot(i)) return [];
  var p = S.plots[i];
  var b = B[p.b];
  if (!b || !b.wants || p.l < 1 || p.l >= 5) return [];
  return b.wants[p.l].map(function (w) {
    return { text: wantText(w), met: wantMet(i, w), build: wantBuild(w), w: w };
  });
}

function reward() {
  return Math.max(60, Math.round(S.rate * 1.5));
}

function lower(bid) {
  return B[bid].name.toLowerCase();
}

function article(name) {
  return (/^[aeiou]/.test(name) ? 'an ' : 'a ') + name;
}

function doBuild(bid, at, more) {
  return { do: 'build', want: bid, plot: at, msg: 'Build ' + (more ? 'another ' + lower(bid) : article(lower(bid))) + '.', busy: false };
}

function doUp(i) {
  var b = B[S.plots[i].b];
  return { do: 'upgrade', want: b.id, plot: i, msg: b.cap ? 'Upgrade this home.' : 'Upgrade the ' + lower(b.id) + '.', busy: false };
}

function under(i) {
  var p = S.plots[i];
  var a = p.l > 0 ? doUp(i) : doBuild(p.b, i, S.plots.some(function (q, j) {
    return j !== i && q.b === p.b && q.dem <= 0;
  }));
  a.busy = true;
  return a;
}

function none(why) {
  return { do: '', want: '', plot: -1, msg: '', busy: false, why: why };
}

function gap(i) {
  return wants(i).filter(function (w) {
    return !w.met;
  })[0];
}

function rng(b, l) {
  return (b.reach || b.radius)[l - 1];
}

function fullness(i) {
  var p = S.plots[i];
  return p.res / B[p.b].cap[Math.max(p.l, 1) - 1];
}

// a paused building does not count: upgrading it would change nothing
function boost(ids) {
  var up = -1;
  var work = -1;
  var n = 0;
  S.plots.forEach(function (p, i) {
    if (ids.indexOf(p.b) < 0 || p.dem > 0) return;
    n++;
    if (p.off) return;
    if (p.n) work = i;
    else if (p.l >= 1 && p.l < 5 && (up < 0 || p.l < S.plots[up].l)) up = i;
  });
  if (work >= 0) return under(work);
  if (up >= 0) return doUp(up);
  for (var k = 0; k < ids.length; k++) {
    var at = emptyPlot(ids[k], -1, 0);
    if (at >= 0 && unlocked(B[ids[k]])) return doBuild(ids[k], at, n > 0);
  }
  return null;
}

function roomFor(g) {
  if (stockCap() - S.stock[g] - S.due[g] >= 4) return true;
  return R.shops.some(function (i) {
    var p = S.plots[i];
    var b = B[p.b];
    var cap = b.shelf[p.l - 1];
    return wanted(b).indexOf(g) >= 0 && cap - p.shelf[g] - p.due[g] >= Math.max(2, cap * 0.4);
  });
}

function piled(g, share) {
  return (R.src[g] || []).some(function (i) {
    var p = S.plots[i];
    var b = B[p.b];
    return b.needs ? p.shelf[g] >= b.shelf[p.l - 1] * share : p.hold >= holdCap(b, p.l) * share;
  });
}

// the good or what it is made from sits at its makers, so only more trucks can move it
function stuck(g, share) {
  var ids = [g];
  BUILDINGS.forEach(function (b) {
    if (b.makes === g && b.needs) ids = ids.concat(b.needs);
  });
  return ids.some(function (x) {
    return piled(x, share) && roomFor(x);
  });
}

function anyStuck(share) {
  return GOODS.some(function (g) {
    return piled(g.id, share) && roomFor(g.id);
  });
}

// homes are about to run out of room, with some slack that grows with the town
function tight(k, soon) {
  return R.cap - R.shut + (soon ? R.soon : 0) - R.pop < Math.max(3, R.pop * 0.3) * k;
}

function blocked() {
  return R.homes.some(function (i) {
    var p = S.plots[i];
    return p.res < B[p.b].cap[p.l - 1] && p.h < MOVE_IN;
  });
}

function routeTrucks() {
  var a = boost(['depot']);
  if (!a) return null;
  a.msg = 'Goods are waiting at the farms. ' + (a.do === 'build' ? a.msg.slice(0, -1) + ' for more trucks.' : a.msg);
  return a;
}

function routeShort(g) {
  var ids = BUILDINGS.filter(function (b) {
    return b.makes === g && unlocked(b);
  }).map(function (b) {
    return b.id;
  });
  var a = boost(ids);
  if (!a) return null;
  var name = GD[g].name.toLowerCase();
  a.msg = (makeCap(g) > 0 ? 'We keep running out of ' + name + '. ' : 'Nobody makes ' + name + ' and we need it. ') + a.msg;
  return a;
}

function routeRoom() {
  // empty homes nobody moves into need a happier town, not more homes
  var a = R.shut > 0 ? routeHappy() : null;
  if (a) return a;
  var grown = false;
  var work = -1;
  var up = -1;
  S.plots.forEach(function (p, i) {
    if (!p.b || !B[p.b].cap || p.dem > 0) return;
    if (p.n) work = i;
    else if (p.l >= 1 && p.l < 5 && !gap(i) && (up < 0 || fullness(i) > fullness(up))) up = i;
  });
  if (work >= 0 && !tight(1, true)) a = under(work);
  else {
    var best = null;
    BUILDINGS.forEach(function (b) {
      if (!b.cap || !unlocked(b)) return;
      var at = emptyPlot(b.id, -1, 0);
      if (at >= 0 && (!best || b.cap[0] > B[best.bid].cap[0])) best = { bid: b.id, at: at };
    });
    if (best) a = doBuild(best.bid, best.at, R.homes.length > 0);
    else if (up >= 0) a = doUp(up);
    else {
      R.homes.slice().sort(function (x, y) {
        return fullness(y) - fullness(x);
      }).some(function (h) {
        var miss = gap(h);
        var f = miss && fixFor(h, miss.w);
        if (f && f.do) {
          a = f;
          a.msg = 'This home wants ' + wantText(miss.w).replace(' within reach', ' nearby') + '. ' + a.msg;
          grown = true;
        }
        return !!a;
      });
    }
  }
  if (a && !grown) a.msg = 'More people want to move in. ' + a.msg;
  return a;
}

function lowTown() {
  return !S.won && R.pop >= WIN_POP && R.happy < WIN_HAPPY;
}

function routeHappy() {
  var room = blocked();
  if (!room && !lowTown()) return null;
  var home = -1;
  R.homes.forEach(function (i) {
    var p = S.plots[i];
    if ((room ? p.res < B[p.b].cap[p.l - 1] : p.res > 0) && (home < 0 || p.h < S.plots[home].h)) home = i;
  });
  var f = happyFix(home);
  if (!f.do) return null;
  if (!f.reason) f.msg = (room ? 'Some homes are too unhappy for new people to move in. ' : 'The town needs to be happier. ') + f.msg;
  return f;
}

// the first cause that applies, as an action; a wait (busy, nothing to do) stops the chain too
function cause(g, depth) {
  var a = null;
  if (haul >= 0.75 && stuck(g, haul >= 0.95 ? 0.4 : 0.75)) {
    a = routeTrucks();
    if (a) {
      a.k = 'trucks';
      return a;
    }
  }
  if (depth === 0 && R.f < 0.9) {
    if (tight(1, true)) {
      a = routeRoom();
      if (a) {
        a.k = 'room';
        return a;
      }
    } else {
      a = blocked() ? routeHappy() : null;
      if (a) {
        a.k = 'happy';
        return a;
      }
      return { k: 'wait', do: '', want: '', plot: -1, msg: '', busy: true };
    }
  }
  var wait = '';
  // an input the store holds is a delivery matter, not a reason to upgrade the input's makers
  (R.src[g] || []).forEach(function (i) {
    var w = S.plots[i].wait;
    if (w && S.plots[i].ws >= WAIT_SHORT && S.stock[w] < 4 && S.plots[i].due[w] < 1 && !piled(w, 0.4)) wait = w;
  });
  if (wait && depth < 3) return cause(wait, depth + 1);
  a = routeShort(g);
  if (a) {
    a.k = 'short';
    a.g = g;
  }
  return a;
}

function emptyFix() {
  var g = '';
  GOODS.forEach(function (x) {
    if (S.emp[x.id] > 0.5 && (!g || S.emp[x.id] > S.emp[g])) g = x.id;
  });
  var a = g ? cause(g, 1) : null;
  if (!a || !a.do) return none('');
  a.why = 'Shelves keep running empty';
  a.reason = true;
  a.msg = 'Empty shelves make people unhappy. ' + a.msg.slice(a.msg.lastIndexOf('. ', a.msg.length - 2) + 2);
  return a;
}

function happyFix(home) {
  var opts = [];
  // sorts first: empty shelves are tried before any service building
  if (R.empty) opts.push({ cost: 99, sid: '' });
  ['park', 'playground', 'school', 'clinic', 'police', 'fire'].forEach(function (sid) {
    if (R.cover[home][sid] === undefined && unlocked(B[sid])) opts.push({ cost: B[sid].bonus[0], sid: sid });
  });
  opts.sort(function (a, c) {
    return c.cost - a.cost;
  });
  for (var k = 0; k < opts.length; k++) {
    var f = opts[k].sid ? near(home, [B[opts[k].sid]]) : emptyFix();
    if (f.do) return f;
  }
  var up = -1;
  R.svc.forEach(function (j) {
    var q = S.plots[j];
    if (!q.n && !q.off && q.l < 5 && dist(home, j) <= B[q.b].radius[q.l - 1] && (up < 0 || q.l < S.plots[up].l)) up = j;
  });
  if (up >= 0) {
    var u = doUp(up);
    u.why = 'A better ' + lower(S.plots[up].b) + ' would make this home happier';
    return u;
  }
  return none('Nothing more to add near this home');
}

// bs: buildings that would meet a want of the home by reach or radius
function near(home, bs) {
  if (!bs.length) return none('Nothing here can do that');
  var ids = bs.map(function (b) {
    return b.id;
  });
  var name = bs[0].name.toLowerCase();
  var best = -1;
  var next = -1;
  var work = -1;
  var first = -1;
  var d = 1e9;
  S.plots.forEach(function (p, i) {
    if (ids.indexOf(p.b) < 0 || p.dem > 0 || p.off) return;
    var b = B[p.b];
    var at = dist(home, i);
    if (p.l >= 1 && (first < 0 || at < dist(home, first))) first = i;
    if (at > rng(b, 5)) return;
    if (p.n) {
      if (at <= rng(b, p.n)) work = i;
    } else if (p.l >= 1 && p.l < 5) {
      if (at < d) {
        d = at;
        best = i;
      }
      if (at <= rng(b, p.l + 1) && (next < 0 || at < dist(home, next))) next = i;
    }
  });
  var why = first < 0 ? 'There is no ' + name + ' in town' : 'The nearest ' + name + ' is ' + Math.round(dist(home, first)) + ' tiles away and reaches ' +
    rng(B[S.plots[first].b], S.plots[first].l);
  var a = null;
  if (work >= 0) a = under(work);
  else if (next >= 0) a = doUp(next);
  else {
    for (var k = 0; k < bs.length && !a; k++) {
      var at2 = unlocked(bs[k]) ? emptyPlot(bs[k].id, home, rng(bs[k], 1)) : -1;
      if (at2 >= 0) a = doBuild(bs[k].id, at2, S.plots.some(function (p) {
        return p.b === bs[k].id;
      }));
    }
    if (!a && best >= 0) a = doUp(best);
  }
  if (!a) return none('No room for ' + article(name) + ' near this home');
  a.why = why;
  return a;
}

function fixFor(home, w) {
  if (typeof w !== 'string' || R.homes.indexOf(home) < 0) return null;
  var kind = w.split(':')[0];
  var arg = w.split(':')[1] || '';
  var bs = null;
  if (kind === 'happy') return happyFix(home);
  if (kind === 'town') {
    var t = B[arg] ? boost([arg]) : null;
    if (!t) return none('No room for ' + article(arg) + ' in town');
    t.why = 'The town has no ' + arg;
    return t;
  }
  if (kind === 'sell') {
    var have = R.reach[home].filter(function (j) {
      return B[S.plots[j].b].sells.indexOf(arg) >= 0;
    })[0];
    if (have !== undefined && GD[arg]) {
      var c = cause(arg, 1);
      if (!c || !c.do) return none('The ' + lower(S.plots[have].b) + ' has no ' + GD[arg].name.toLowerCase());
      c.why = 'The ' + lower(S.plots[have].b) + ' has no ' + GD[arg].name.toLowerCase();
      return c;
    }
    bs = BUILDINGS.filter(function (b) {
      return b.sells && b.sells.indexOf(arg) >= 0;
    });
  } else if (kind === 'foods') {
    bs = BUILDINGS.filter(function (b) {
      return b.sells && b.sells.length >= +arg;
    });
  } else if (kind === 'shop') {
    bs = B[arg] && B[arg].reach ? [B[arg]] : [];
  } else if (kind === 'cover') {
    bs = arg.split(',').map(function (id) {
      return B[id];
    }).filter(function (b) {
      return b && b.radius;
    });
  }
  if (!bs) return none('Nothing here can do that');
  bs.sort(function (a, c) {
    return a.cost[0] - c.cost[0];
  });
  return near(home, bs);
}

// what stands in the way of a step of the tutorial, as an action; null when nothing can be done
function stepAct(t) {
  if (!t) return null;
  var done = 0;
  var going = 0;
  var work = -1;
  var up = -1;
  var fell = false;
  S.plots.forEach(function (p, i) {
    if (p.b !== t.want || p.dem > 0) return;
    if (p.l >= t.lvl) done++;
    else if (p.n >= t.lvl) {
      going++;
      work = i;
    } else if (p.l >= 1 && !p.n && !gap(i) && up < 0) up = i;
  });
  var a = null;
  if (done + going >= t.n) a = work >= 0 ? under(work) : null;
  else if (t.lvl > 1) {
    if (up >= 0) a = doUp(up);
    else {
      R.homes.some(function (h) {
        var miss = S.plots[h].b === t.want && S.plots[h].l < t.lvl && !S.plots[h].n && gap(h);
        var f = miss && fixFor(h, miss.w);
        if (f && f.do) {
          a = f;
          a.msg = t.msg.slice(0, t.msg.indexOf('. ') + 2) + a.msg;
          fell = true;
        }
        return !!a;
      });
    }
  } else {
    var at = spot(t.want);
    if (at >= 0) a = doBuild(t.want, at, done + going > 0);
  }
  if (a && !fell) a.msg = t.msg;
  return a;
}

function stepMet(t) {
  return !t || S.plots.filter(function (p) {
    return p.b === t.want && p.l >= t.lvl && p.dem <= 0;
  }).length >= t.n;
}

function spot(bid) {
  var at = B[bid].radius && R.homes.length ? emptyPlot(bid, R.homes[0], B[bid].radius[0]) : -1;
  return at >= 0 ? at : emptyPlot(bid, -1, 0);
}

var RANK = { tut: 0, trucks: 1, room: 2, happy: 2, short: 3, grow: 4, cover: 5, new: 6 };

function problem() {
  var list = [];
  var open = {};
  var big = 0;
  S.req.forEach(function (r) {
    open[r.key] = true;
    if (RANK[r.k] <= 3) big++;
  });
  var can = function (key) {
    return !open[key] && !(S.mute[key] > S.t);
  };
  var add = function (k, key, a, goal, extra) {
    if (!a || !a.do || a.busy || !can(key) || S.req.some(function (q) {
      return q.do === a.do && q.plot === a.plot && q.want === a.want;
    })) return;
    var r = { key: key, k: k, g: '', goal: goal, home: -1, w: '', do: a.do, want: a.want, plot: a.plot, msg: a.msg, busy: false };
    for (var f in extra) r[f] = extra[f];
    list.push(r);
  };
  if (tight(1, true) && R.pop > 0 && S.plots.some(function (p) {
    return active(p) && p.h >= MOVE_IN;
  })) add('room', 'room', routeRoom(), R.cap + 1);
  add('happy', 'happy', routeHappy(), 1);
  GOODS.forEach(function (g) {
    if (!shortOf(g.id)) return;
    var a = cause(g.id, 0);
    if (!a) return;
    if (a.k === 'trucks') add('trucks', 'trucks', a, R.fleet + 1);
    else if (a.k === 'room') add('room', 'room', a, R.cap + 1);
    else if (a.k === 'happy') add('happy', 'happy', a, 1);
    else if (a.k === 'short') add('short', 'short' + a.g, a, makeCap(a.g) + 1, { g: a.g });
  });
  for (var k = 0; k < R.homes.length && !list.some(function (r) {
    return r.k === 'grow';
  }); k++) {
    var h = R.homes[k];
    var miss = S.plots[h].res >= B[S.plots[h].b].cap[S.plots[h].l - 1] * 0.9 ? gap(h) : null;
    if (!miss || !can('grow' + h)) continue;
    var f = fixFor(h, miss.w);
    add('grow', 'grow' + h, f && f.do ? { do: f.do, want: f.want, plot: f.plot, busy: f.busy, msg: 'This home wants ' + wantText(miss.w).replace(' within reach', ' nearby') + '. ' + f.msg } : null, 1,
      { home: h, w: miss.w });
  }
  var types = ['park', 'playground', 'school', 'clinic', 'police', 'fire'];
  for (var t = 0; t < types.length && !list.some(function (r) {
    return r.k === 'cover';
  }); t++) {
    var sb = B[types[t]];
    if (!can('cover' + sb.id) || !unlocked(sb)) continue;
    for (k = 0; k < R.homes.length; k++) {
      var i = R.homes[k];
      if (S.plots[i].res < 1 || R.cover[i][sb.id] !== undefined) continue;
      var c = near(i, [sb]);
      if (!c.do) continue;
      add('cover', 'cover' + sb.id, { do: c.do, want: c.want, plot: c.plot, busy: c.busy,
        msg: 'This home has no ' + sb.name.toLowerCase() + ' nearby. ' + c.msg }, S.plots[i].cov + 1, { home: i, w: 'cover:' + sb.id });
      break;
    }
  }
  var fresh = BUILDINGS.filter(function (b) {
    return b.sells && unlocked(b) && can('new' + b.id) && (b.needs || b.sells).every(function (x) {
      return !b.needs || makeCap(x) > 0;
    }) && b.sells.some(function (x) {
      return !R.sells[x];
    }) && emptyPlot(b.id, -1, 0) >= 0;
  });
  fresh.sort(function (a, c) {
    return a.cost[0] - c.cost[0];
  });
  if (fresh.length) {
    var n = fresh[0];
    var what = GD[n.sells.filter(function (x) {
      return !R.sells[x];
    })[0]].name.toLowerCase();
    add('new', 'new' + n.id, { do: 'build', want: n.id, plot: emptyPlot(n.id, -1, 0),
      msg: 'People ask for ' + what + '. Build ' + article(lower(n.id)) + '.' }, 1);
  }
  list = list.filter(function (r) {
    return RANK[r.k] <= 3 ? big < MAX_REQ : S.req.length < MAX_REQ;
  });
  list.sort(function (a, c) {
    return RANK[a.k] - RANK[c.k];
  });
  return list[0] || null;
}

function addRequest(r, pay) {
  r.id = ++S.rid;
  r.reward = pay;
  r.t = S.t;
  r.age = 0;
  S.req.push(r);
}

function met(r) {
  if (r.k === 'tut') return stepMet(TUTORIAL[S.tut]);
  if (r.k === 'trucks') return R.fleet >= r.goal;
  if (r.k === 'room') return R.cap >= r.goal;
  if (r.k === 'happy') return !blocked() && !lowTown();
  if (r.k === 'short') return makeCap(r.g) >= r.goal;
  if (r.k === 'grow' || r.k === 'cover') return wantMet(r.home, r.w);
  return has(r.want);
}

function route(r) {
  if (r.k === 'tut') return stepAct(TUTORIAL[S.tut]);
  if (r.k === 'trucks') return routeTrucks();
  if (r.k === 'room') return routeRoom();
  if (r.k === 'happy') return routeHappy();
  if (r.k === 'short') return GD[r.g] ? routeShort(r.g) : null;
  if (r.k === 'new') {
    var at = -1;
    S.plots.forEach(function (p, i) {
      if (p.b === r.want && p.dem <= 0) at = i;
    });
    var a = at >= 0 ? under(at) : null;
    if (!a) {
      at = emptyPlot(r.want, -1, 0);
      a = at >= 0 ? doBuild(r.want, at, false) : null;
    }
    if (a) a.msg = r.msg.slice(0, r.msg.indexOf('. ') + 2) + a.msg;
    return a;
  }
  var f = fixFor(r.home, r.w);
  if (!f || !f.do) return null;
  var cover = r.k === 'cover';
  f.msg = (cover ? 'This home has no ' + lower(r.w.split(':')[1]) + ' nearby. ' : 'This home wants ' + wantText(r.w).replace(' within reach', ' nearby') + '. ') + f.msg;
  return f;
}

function gone(r, a) {
  if (a.busy) return false;
  if (r.k === 'trucks') return haul < 0.6 || !anyStuck(0.4);
  if (r.k === 'room') return !tight(2, true);
  if (r.k === 'short') return !shortOf(r.g);
  if (r.k === 'new') return B[r.want].sells.every(function (x) {
    return R.sells[x];
  });
  return false;
}

function finish(r) {
  S.cash += r.reward;
  S.earned += r.reward;
  S.boost = BUMP.hp;
  S.boostT = BUMP.secs;
  if (r.k === 'tut') S.tut = Math.min(S.tut + 1, TUTORIAL.length);
  note('request', r.plot, r.msg, r.want, r.reward);
}

function requests(dt) {
  S.rq += dt;
  if (S.rq < 1) return;
  var span = S.rq;
  S.rq = 0;
  for (var key in S.mute) if (S.mute[key] <= S.t) delete S.mute[key];
  // away() steps for hours; resolving every request each step would triple its cost
  var look = !quiet || S.t - looked >= LOOK_EVERY;
  if (look) looked = S.t;
  S.req = S.req.filter(function (r) {
    if (met(r)) {
      finish(r);
      return false;
    }
    if (r.k !== 'tut' && !quiet) r.age += span;
    if (r.k !== 'tut' && r.age >= REQ_LIFE) {
      S.mute[r.key] = S.t + REQ_MUTE;
      note('lapsed', r.plot, r.msg, r.want);
      return false;
    }
    if (!look) return true;
    var a = route(r);
    if (a && !gone(r, a)) {
      r.do = a.do;
      r.want = a.want;
      r.plot = a.plot;
      r.msg = a.msg;
      r.busy = a.busy;
      return true;
    }
    if (r.k === 'tut') S.tut = Math.min(S.tut + 1, TUTORIAL.length);
    return false;
  });
  S.req.sort(function (a, c) {
    return a.busy - c.busy || RANK[a.k] - RANK[c.k] || a.id - c.id;
  });
  if (S.t < S.next) return;
  while (S.tut < TUTORIAL.length) {
    if (S.req.length) return;
    var t = TUTORIAL[S.tut];
    var r = { key: 'tut', k: 'tut', msg: t.msg, want: t.want, goal: 1, g: '', home: -1, w: '', do: 'build', plot: -1, busy: false };
    r.reward = t.reward;
    if (stepMet(t)) {
      finish(r);
      continue;
    }
    var a = stepAct(t);
    if (!a) {
      S.tut++;
      continue;
    }
    r.do = a.do;
    r.want = a.want;
    r.plot = a.plot;
    r.busy = a.busy;
    addRequest(r, t.reward);
    return;
  }
  var p = problem();
  S.next = S.t + (S.req.length ? REQ_GAP : REQ_FIRST);
  if (p) addRequest(p, reward());
}

function step(dt) {
  S.t += dt;
  if (S.boostT > 0) S.boostT = Math.max(0, S.boostT - dt);
  construct(dt);
  refresh();
  produce(dt);
  moveTrucks(dt);
  trade(dt);
  shop(dt);
  settle(dt);
  unlock();
  orders(dt);
  requests(dt);
  smooth(dt);
}

function tick(dt) {
  dt = Math.min(dt, 60);
  while (dt > 0) {
    var d = Math.min(dt, STEP);
    step(d);
    dt -= d;
  }
}

function growing() {
  var o = {};
  S.plots.forEach(function (p, i) {
    if (active(p) && B[p.b].cap) o[i] = p.res + p.acc;
  });
  return o;
}

function nudge(est, key, v) {
  est.v[key] = est.v[key] === undefined ? v : est.v[key] + (v - est.v[key]) * Math.max(1 / est.n, AWAY_BLEND);
}

// A stretch of real stepping gives the rates used to carry the town further. Sales and deliveries come in bursts, so
// the rates are running means; income forgets slowly, stock gains are kept over the whole run because they are slow.
function learn(est, win, was) {
  est.n++;
  nudge(est, 'earn', (S.gross - was.gross) / win / Math.max(R.pop, 1));
  est.secs += win;
  GOODS.forEach(function (g) {
    est.d[g.id] = (est.d[g.id] || 0) + S.stock[g.id] - was.stock[g.id];
  });
  for (var k in was.hold) est.d['p' + k] = (est.d['p' + k] || 0) + S.plots[k].hold - was.hold[k];
  for (k in was.shelf) est.d['s' + k] = (est.d['s' + k] || 0) + S.plots[k.split(':')[0]].shelf[k.split(':')[1]] - was.shelf[k];
  for (var i in was.homes) nudge(est, 'h' + i, Math.max(0, S.plots[i].res + S.plots[i].acc - was.homes[i]) / win);
}

function leap(est, go, was) {
  var pop = R.pop;
  for (var i in was.homes) {
    var p = S.plots[i];
    if (!active(p) || !B[p.b].cap) continue;
    var all = p.res + p.acc;
    var cap = B[p.b].cap[p.l - 1];
    var next = Math.min(cap, all + est.v['h' + i] * go);
    pop += next - all;
    p.res = Math.floor(next);
    p.acc = next >= cap ? 0 : next - p.res;
  }
  var rise = est.v.earn * (R.pop + pop) / 2 * go;
  S.earned += rise;
  S.cash += rise;
  S.gross += rise;
  for (var k in was.hold) {
    var q = S.plots[k];
    if (active(q) && B[q.b].makes) q.hold = Math.max(0, Math.min(q.hold + est.d['p' + k] / est.secs * go, holdCap(B[q.b], q.l)));
  }
  for (k in was.shelf) {
    var at = S.plots[k.split(':')[0]];
    var gd = k.split(':')[1];
    if (active(at)) at.shelf[gd] = Math.max(0, Math.min(at.shelf[gd] + est.d['s' + k] / est.secs * go, B[at.b].shelf[at.l - 1]));
  }
  GOODS.forEach(function (g) {
    var n = S.stock[g.id] + est.d[g.id] / est.secs * go;
    S.stock[g.id] = Math.max(0, Math.min(n, stockCap()));
  });
  S.plots.forEach(function (p) {
    if (p.dem > 0) p.dem -= go;
    else if (p.n) p.left -= go;
    for (var g in p.last) if (p.last[g] > S.t - 120) p.last[g] += go;
  });
  S.t += go;
  S.boostT = Math.max(0, S.boostT - go);
  S.orders = S.orders.filter(function (o) {
    o.left -= o.left ? go : 0;
    return !o.left || o.left > 0;
  });
}

// how far the town can be carried on at once: not past a pending build, nor while the population is still climbing fast
function hop(est, was, go) {
  var grow = 0;
  for (var i in was.homes) grow += est.v['h' + i];
  if (grow > 0) go = Math.min(go, 0.25 * Math.max(R.pop, 20) / grow);
  S.plots.forEach(function (p) {
    var left = p.dem > 0 ? p.dem : p.n ? p.left : 0;
    if (left > 0) go = Math.min(go, left - 1);
  });
  return go < AWAY_MIN ? 0 : go;
}

// Same rules as tick, but past AWAY_FINE seconds only short stretches spread over the whole time are stepped; the rest
// is carried on at the rates seen in them. Events are not queued because nothing is on screen.
function away(sec) {
  // the clock can be set back between saves
  sec = Math.max(0, Math.min(sec || 0, MAX_AWAY));
  var from = { cash: S.earned, pop: R.pop, built: S.built, open: AREAS.filter(function (a) {
    return S.open[a.id];
  }).length };
  quiet = true;
  var est = { n: 0, secs: 0, v: {}, d: {} };
  var fine = sec <= AWAY_FINE;
  var gap = (sec - AWAY_FINE) / (AWAY_FINE / AWAY_WIN - AWAY_WARM);
  for (var done = 0; done < sec;) {
    var win = Math.min(fine ? sec : AWAY_WIN, sec - done);
    var was = { gross: S.gross, stock: {}, hold: {}, shelf: {}, homes: growing() };
    for (var g in S.stock) was.stock[g] = S.stock[g];
    S.plots.forEach(function (p, i) {
      if (!active(p)) return;
      if (B[p.b].makes && !B[p.b].needs) was.hold[i] = p.hold;
      if (B[p.b].shelf) wanted(B[p.b]).concat(B[p.b].makes || []).forEach(function (g) {
        was.shelf[i + ':' + g] = p.shelf[g];
      });
    });
    for (var left = win; left > 0; left -= AWAY_STEP) step(Math.min(AWAY_STEP, left));
    done += win;
    if (fine) continue;
    learn(est, win, was);
    var go = est.n < AWAY_WARM ? 0 : hop(est, was, Math.min(gap, sec - done - AWAY_WIN));
    if (go > 0) leap(est, go, was);
    done += go;
  }
  quiet = false;
  S.rq = 1;
  S.saved = now();
  return {
    sec: sec, earned: S.earned - from.cash, pop: R.pop - from.pop, built: S.built - from.built,
    areas: AREAS.filter(function (a) {
      return S.open[a.id];
    }).length - from.open
  };
}

function validLot(i) {
  if (typeof i === 'string' && String(+i) === i) i = +i;
  return typeof i === 'number' && i >= 0 && i < PLOTS.length && i === Math.floor(i);
}

function site(bid, home) {
  if (!B[bid] || (home >= 0 && !validLot(home))) return -1;
  return siteFor(bid, home >= 0 ? +home : -1);
}

function why(i, bid) {
  if (!validLot(i)) return 'no such lot';
  var p = S.plots[i];
  var b = B[bid];
  if (!b) return 'unknown building';
  if (p.b) return 'taken';
  if (b.size !== PLOTS[i].kind || (b.size === 'fixed' && b.spot !== PLOTS[i].id)) return 'wrong kind of lot';
  if (b.areas.indexOf(PLOTS[i].area) < 0) return 'not available here';
  if (!S.open[PLOTS[i].area]) return AR[PLOTS[i].area].name + ' unlocks at ' + AR[PLOTS[i].area].unlock + ' residents';
  if (R.busy >= crews()) return 'all crews busy';
  if (!free && S.cash < b.cost[0]) return 'not enough money';
  return '';
}

function whyUp(i) {
  if (!validLot(i)) return 'nothing to upgrade';
  var p = S.plots[i];
  if (!p.b || p.l < 1 || p.dem > 0) return 'nothing to upgrade';
  if (p.n) return 'under construction';
  if (p.l >= 5) return 'fully built';
  var miss = wants(i).filter(function (w) {
    return !w.met;
  })[0];
  if (miss) return 'needs ' + miss.text;
  if (R.busy >= crews()) return 'all crews busy';
  if (!free && S.cash < B[p.b].cost[p.l]) return 'not enough money';
  return '';
}

function crews() {
  return 3 + Math.floor(R.pop / 40);
}

function build(i, bid) {
  if (why(i, bid)) return false;
  var p = S.plots[i];
  var b = B[bid];
  pay(b.cost[0]);
  p.b = bid;
  p.n = 1;
  p.left = b.build[0];
  R.busy++;
  return true;
}

function upgrade(i) {
  if (whyUp(i)) return false;
  var p = S.plots[i];
  var b = B[p.b];
  pay(b.cost[p.l]);
  p.n = p.l + 1;
  p.left = b.build[p.l];
  R.busy++;
  return true;
}

function demolish(i) {
  if (!validLot(i)) return false;
  var p = S.plots[i];
  var b = B[p.b];
  if (!b || p.dem > 0) return false;
  var paid = p.l + (p.n ? 1 : 0);
  var sum = 0;
  for (var k = 0; k < paid; k++) sum += b.cost[k];
  p.back = free ? 0 : Math.floor(sum / 2);
  p.n = 0;
  p.left = 0;
  p.dem = DEMOLISH_TIME;
  return true;
}

function pause(i) {
  if (!validLot(i)) return false;
  var p = S.plots[i];
  if (!active(p) && !p.off) return false;
  if (B[p.b].cap) return false;
  p.off = !p.off;
  return true;
}

var STAT_KEYS = ['cap', 'rate', 'reach', 'serve', 'shelf', 'workers', 'tourists', 'pay', 'bonus', 'radius', 'store',
  'export', 'train', 'trucks', 'cost', 'build'];

function stats(bid, lvl) {
  var b = B[bid];
  if (!b) return null;
  var o = {};
  STAT_KEYS.forEach(function (k) {
    if (b[k] && lvl >= 1 && lvl <= 5) o[k] = b[k][lvl - 1];
  });
  return o;
}

function options(i) {
  if (!validLot(i)) return [];
  return BUILDINGS.filter(function (b) {
    return b.size === PLOTS[i].kind && b.areas.indexOf(PLOTS[i].area) >= 0 && (b.size !== 'fixed' || b.spot === PLOTS[i].id);
  }).map(function (b) {
    return { id: b.id, name: b.name, cost: b.cost[0], build: b.build[0], why: why(i, b.id) };
  });
}

function status(i) {
  var p = S.plots[i];
  var b = B[p.b];
  if (!b) return 'empty';
  if (p.dem > 0) return 'demolishing';
  if (p.l < 1) return 'building, ' + Math.ceil(p.left) + 's left';
  if (p.off) return 'paused';
  var up = p.n ? ', upgrading ' + Math.ceil(p.left) + 's left' : '';
  if (b.cap) {
    var gap = wants(i).filter(function (w) {
      return !w.met;
    })[0];
    var full = p.res >= b.cap[p.l - 1] && gap ? ', needs ' + gap.text : '';
    return p.res + ' of ' + b.cap[p.l - 1] + ' residents' + full + up;
  }
  if (p.wait) return 'waiting for ' + GD[p.wait].name.toLowerCase() + up;
  if (R.f < 0.999 && b.workers[p.l - 1]) return 'short of workers' + up;
  if (b.makes && !b.needs && p.hold >= holdCap(b, p.l) - 1) return 'waiting for a truck' + up;
  if (b.sells) {
    var dry = wanted(b).filter(function (g) {
      return p.shelf[g] < 1;
    });
    if (dry.length) return 'waiting for ' + GD[dry[0]].name.toLowerCase() + up;
  }
  return 'working' + up;
}

function info(i) {
  if (!validLot(i)) return null;
  var p = S.plots[i];
  var b = B[p.b];
  var o = { id: p.id, kind: PLOTS[i].kind, area: PLOTS[i].area, b: p.b, name: b ? b.name : '', lvl: p.l,
    status: status(i), busy: p.n > 0, left: p.dem > 0 ? p.dem : p.left, to: p.n, paused: p.off, locked: !S.open[PLOTS[i].area] };
  if (!b) return o;
  var built = p.l >= 1;
  var need = b.workers[Math.max(p.l, 1) - 1];
  o.need = need;
  o.staff = p.off || !built ? 0 : Math.round(need * R.f);
  o.make = p.out;
  o.cash = p.inc;
  o.res = p.res;
  o.happy = p.h;
  o.hold = p.hold;
  o.shelf = p.shelf;
  o.wants = built ? wants(i) : [];
  o.now = built ? stats(p.b, p.l) : null;
  o.next = p.l < 5 ? stats(p.b, p.l + 1) : null;
  o.why = built ? whyUp(i) : 'under construction';
  return o;
}

function goods() {
  return GOODS.map(function (g) {
    var n = S.stock[g.id];
    return { id: g.id, name: g.name, n: n, held: stockOf(g.id) - n, cap: stockCap(), sold: !!R.sells[g.id],
      short: shortOf(g.id), full: n >= stockCap() - 0.5, made: S.mk[g.id], used: S.us[g.id] };
  });
}

function town() {
  return { cash: S.cash, free: free, pop: R.pop, cap: R.cap, work: R.work, need: R.need, f: R.f,
    happy: R.happy, rate: S.rate, crews: crews(), busy: R.busy, trucks: R.fleet,
    out: S.trucks.filter(function (k) {
      return k.ph !== 'idle';
    }).length, t: S.t, delivered: S.deliv, built: S.built, won: S.won,
    buildings: S.plots.filter(function (p) {
      return p.b && p.l > 0;
    }).length };
}

function goalNow() {
  if (S.won) return { text: 'Main Street is thriving', done: true };
  for (var k = 1; k < AREAS.length; k++) {
    if (!S.open[AREAS[k].id]) {
      return { text: 'Reach ' + AREAS[k].unlock + ' residents to open ' + AREAS[k].name, have: Math.floor(R.pop), need: AREAS[k].unlock };
    }
  }
  return { text: WIN_POP + ' residents and happiness ' + WIN_HAPPY, have: Math.floor(R.pop), need: WIN_POP, happy: Math.round(R.happy),
    happyNeed: WIN_HAPPY };
}

function takeMoves() {
  return moves.splice(0);
}

function takeTrips() {
  return trips.splice(0);
}

function takeNotes() {
  return notes.splice(0);
}

function save() {
  S.saved = now();
  try {
    localStorage.setItem(KEY, JSON.stringify(S));
    return true;
  } catch (e) {
    return false;
  }
}

function merge(to, from) {
  if (from === null || typeof from !== 'object') return;
  for (var k in to) {
    if (Array.isArray(to[k])) continue;
    if (to[k] !== null && typeof to[k] === 'object') merge(to[k], from[k]);
    else if (typeof from[k] === typeof to[k] && (typeof to[k] !== 'number' || isFinite(from[k]))) to[k] = from[k];
  }
}

function between(v, lo, hi) {
  return Math.max(lo, Math.min(hi, Math.floor(v) || 0));
}

function place(v) {
  return v === STORE || (v >= 0 && v < PLOTS.length && v === Math.floor(v)) ? v : STORE;
}

function sound(r) {
  if (!B[r.want] || (r.do !== 'build' && r.do !== 'upgrade') || !validLot(r.plot) || RANK[r.k] === undefined) return false;
  if (r.k === 'cover') return typeof r.w === 'string' && !!B[r.w.split(':')[1]] && !!B[r.w.split(':')[1]].radius;
  if (r.k === 'short') return !!GD[r.g];
  return true;
}

function fix() {
  S.cash = Math.max(0, S.cash);
  S.t = Math.max(0, S.t);
  S.seed |= 0;
  S.saved = Math.min(S.saved, now());
  S.tut = between(S.tut, 0, TUTORIAL.length);
  S.won = S.won === true;
  S.deliv = between(S.deliv, 0, 1e9);
  AREAS.forEach(function (a) {
    if (a.unlock === 0) S.open[a.id] = true;
  });
  S.plots.forEach(function (p, i) {
    var b = B[p.b];
    if (!b || !fits(i, p.b)) {
      S.plots[i] = newPlot(PLOTS[i]);
      return;
    }
    p.l = between(p.l, 0, 5);
    p.n = between(p.n, 0, 5);
    if (p.n && p.n <= p.l) p.n = 0;
    if (p.l === 0 && !p.n) p.n = 1;
    p.left = p.n ? Math.max(0, Math.min(p.left, b.build[p.n - 1])) : 0;
    p.res = b.cap ? between(p.res, 0, b.cap[Math.max(p.l, 1) - 1]) : 0;
    p.dem = Math.max(0, Math.min(p.dem, DEMOLISH_TIME));
    p.back = Math.max(0, p.back);
    p.hold = Math.max(0, p.hold);
    for (var g in p.shelf) p.shelf[g] = Math.max(0, p.shelf[g]);
  });
  for (var g in S.stock) S.stock[g] = Math.max(0, S.stock[g]);
  var ok = {};
  S.req = S.req.filter(function (r) {
    var good = r && typeof r.key === 'string' && !ok[r.key] && typeof r.msg === 'string' && isFinite(r.goal) &&
      isFinite(r.reward) && (r.home < 0 ? r.k !== 'cover' && r.k !== 'grow' : S.plots[r.home]) && (!r.want || B[r.want]) && typeof r.w === 'string' &&
      sound(r);
    if (good) ok[r.key] = true;
    return good;
  }).slice(0, 2 * MAX_REQ);
  S.req.forEach(function (r) {
    r.age = isFinite(r.age) ? Math.max(0, r.age) : 0;
    r.busy = r.busy === true;
  });
  for (var key in S.mute) if (!isFinite(S.mute[key])) delete S.mute[key];
  S.orders = S.orders.filter(function (o) {
    return o && o.need && typeof o.need === 'object' && Object.keys(o.need).every(function (g) {
      return GD[g] && isFinite(o.need[g]);
    }) && isFinite(o.reward) && isFinite(o.left) && isFinite(o.id);
  });
  S.orders.forEach(function (o) {
    if (o.from === 'town' && o.left <= 0) o.left = ORDER_LIFE;
  });
  S.trucks = S.trucks.filter(function (k) {
    return k && GD[k.g || 'wheat'] && isFinite(k.left) && k.n >= 0 && k.r >= 0 && isFinite(k.n) && isFinite(k.r);
  }).map(function (k) {
    k.at = place(k.at);
    k.src = place(k.src);
    k.dst = place(k.dst);
    k.from = place(k.from);
    if (k.ph !== 'pick' && k.ph !== 'haul') k.ph = 'idle';
    if (k.ph !== 'idle' && !GD[k.g]) k.ph = 'idle';
    return k;
  });
}

function adopt(from) {
  var remap = false;
  S = newState();
  haul = 0;
  if (from && from.v === 3) {
    var saved = Array.isArray(from.plots) ? from.plots : [];
    S.plots.forEach(function (p) {
      merge(p, saved.filter(function (o) {
        return o && o.id === p.id;
      })[0]);
    });
    merge(S, from);
    if (Array.isArray(from.req)) S.req = from.req;
    if (Array.isArray(from.orders)) S.orders = from.orders;
    if (Array.isArray(from.trucks)) S.trucks = from.trucks;
    if (from.mute && typeof from.mute === 'object') {
      for (var key in from.mute) S.mute[key] = from.mute[key];
    }
    // requests and trucks refer to lots by index, so they mean nothing on a changed map
    remap = saved.length !== PLOTS.length || saved.some(function (o, i) {
      return !o || o.id !== PLOTS[i].id;
    });
  }
  if (remap) {
    S.req = [];
    S.orders = [];
  }
  fix();
  refresh();
  if (remap) {
    S.trucks.forEach(function (k) {
      if (k.ph === 'haul') stash(k.g, k.n);
      k.at = k.src = k.dst = k.from = STORE;
      k.ph = 'idle';
      k.g = '';
      k.n = k.r = k.left = k.dur = 0;
    });
  }
  rebook();
  if (S.trucks.length) {
    haul = S.trucks.filter(function (k) {
      return k.ph !== 'idle';
    }).length / S.trucks.length;
  }
  S.rq = 1;
}

function load() {
  var raw = null;
  var from = null;
  try {
    raw = localStorage.getItem(KEY);
    if (raw) from = JSON.parse(raw);
  } catch (e) {}
  try {
    adopt(from);
  } catch (e) {
    S = newState();
    fix();
    refresh();
    rebook();
  }
  var sec = (now() - S.saved) / 1000;
  return sec > 30 ? away(sec) : null;
}

var CODE = 'ms3:';

function round(v, d) {
  return +v.toFixed(d);
}

// Only what cannot be derived: buildings with their levels and stores, money, stock, orders. Trucks go idle and what
// they carry lands in the store; happiness, requests and smoothed rates come back by themselves.
function code() {
  var stock = GOODS.map(function (g) {
    return S.stock[g.id];
  });
  S.trucks.forEach(function (k) {
    if (k.ph === 'haul') stock[GOODS.indexOf(GD[k.g])] += k.n;
  });
  var cash = S.cash;
  var rows = [];
  S.plots.forEach(function (p) {
    if (!p.b) return;
    if (p.dem > 0) {
      cash += p.back;
      return;
    }
    var shelf = {};
    if (B[p.b].shelf) for (var g in p.shelf) if (p.shelf[g] >= 0.01) shelf[g] = round(p.shelf[g], 2);
    rows.push([p.id, p.b, p.l, p.n, round(p.left, 1), p.off ? 1 : 0, round(p.res + p.acc, 2), round(p.hold, 2), shelf]);
  });
  var orders = S.orders.map(function (o) {
    var need = {};
    for (var g in o.need) need[g] = o.need[g];
    return [o.id, o.from, need, o.reward, round(o.left, 1), o.tourists];
  });
  var open = AREAS.map(function (a) {
    return S.open[a.id] ? 1 : 0;
  }).join('');
  var head = [round(S.t, 1), S.seed, round(cash, 2), round(S.earned, 2), S.built, S.tut, S.rid, S.oid, round(S.onext, 1),
    round(S.boost, 2), round(S.boostT, 1), round(S.tour, 2), round(S.train, 1), round(S.rate, 1), S.won ? 1 : 0, S.deliv];
  return CODE + JSON.stringify([head, open, stock.map(function (n) {
    return round(n, 2);
  }), rows, orders]);
}

function nums(a, n) {
  return Array.isArray(a) && a.length === n && a.every(function (v) {
    return typeof v === 'number' && isFinite(v);
  });
}

function goodsOf(o) {
  return o !== null && typeof o === 'object' && !Array.isArray(o) && Object.keys(o).every(function (g) {
    return GD[g] && typeof o[g] === 'number' && isFinite(o[g]) && o[g] >= 0;
  });
}

function unpack(text) {
  if (typeof text !== 'string') return null;
  text = text.trim();
  if (text.indexOf(CODE) !== 0) return null;
  var a = JSON.parse(text.slice(CODE.length));
  if (!Array.isArray(a) || a.length !== 5) return null;
  var h = a[0];
  if (!(nums(h, 14) || nums(h, 16)) || typeof a[1] !== 'string' || a[1].length !== AREAS.length || !nums(a[2], GOODS.length)) return null;
  var from = { v: 3, t: h[0], seed: h[1], cash: h[2], earned: h[3], built: h[4], tut: h[5], rid: h[6], oid: h[7], onext: h[8],
    boost: h[9], boostT: h[10], tour: h[11], train: h[12], rate: h[13], won: h[14] === 1, deliv: h[15] || 0, open: {}, stock: {}, plots: [], orders: [] };
  AREAS.forEach(function (ar, i) {
    from.open[ar.id] = a[1][i] === '1';
  });
  GOODS.forEach(function (g, i) {
    from.stock[g.id] = a[2][i];
  });
  var lots = {};
  PLOTS.forEach(function (q, i) {
    lots[q.id] = i;
  });
  var seen = {};
  if (!Array.isArray(a[3]) || !Array.isArray(a[4])) return null;
  var bad = a[3].some(function (r) {
    if (!Array.isArray(r) || r.length !== 9 || !nums(r.slice(2, 8), 6) || !goodsOf(r[8]) || r[2] < 0 || r[2] > 5 || r[3] < 0 || r[3] > 5) return true;
    var i = lots[r[0]];
    if (typeof r[0] !== 'string' || i === undefined || seen[r[0]] || !B[r[1]] || !fits(i, r[1])) return true;
    seen[r[0]] = true;
    from.plots.push({ id: r[0], b: r[1], l: r[2], n: r[3], left: r[4], off: r[5] === 1, res: Math.floor(r[6]), acc: r[6] % 1,
      hold: r[7], shelf: r[8] });
    return false;
  });
  if (bad) return null;
  // the plots array stays aligned with PLOTS so adopt() does not take it for a changed map
  from.plots = PLOTS.map(function (q) {
    return from.plots.filter(function (p) {
      return p.id === q.id;
    })[0] || { id: q.id };
  });
  bad = a[4].some(function (r) {
    if (!Array.isArray(r) || r.length !== 6 || !goodsOf(r[2]) || !nums([r[0], r[3], r[4], r[5]], 4) || (r[1] !== 'town' && r[1] !== 'train')) return true;
    from.orders.push({ id: r[0], from: r[1], need: r[2], reward: r[3], left: r[4], tourists: r[5] });
    return false;
  });
  return bad ? null : from;
}

function restore(text) {
  var old = S;
  try {
    var from = unpack(text);
    if (!from) return false;
    adopt(from);
    S.saved = now();
    S.plots.forEach(function (p) {
      if (!active(p) || !B[p.b].sells) return;
      for (var g in p.shelf) if (p.shelf[g] >= 1) p.last[g] = S.t;
    });
    return true;
  } catch (e) {
    S = old;
    refresh();
    return false;
  }
}

function reset() {
  try {
    localStorage.removeItem(KEY);
  } catch (e) {}
  moves.length = trips.length = notes.length = 0;
  S = newState();
  haul = 0;
  refresh();
}

S = newState();
refresh();
