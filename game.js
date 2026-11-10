var KEY = 'mainstreet.v2';
var MAX_AWAY = 8 * 3600;
var STOP_TIME = 2.3;
var RESTOCK_AT = 1.3;
var TRUCK_SPEED = 20;
var DRONE_TRIP = 10;
var STAR_BONUS = 0.5;
var STOCK_CAP = 2;
var TRUCK_EASE = 0.004;
var STEP = 0.1;
var clockT = 0;

var S;
var T;
var D;
var ITEMS = [];
var bought = [];
var opened = [];

function newState(d, keep) {
  var lots = DISTRICTS[d].lots;
  keep = keep || {};
  return {
    v: 2,
    cash: 0,
    stars: keep.stars || 0,
    dist: d,
    done: DISTRICTS.map(function (x, i) {
      return !!(keep.done && keep.done[i]);
    }),
    lots: lots.map(function (l) {
      return { id: l.id, st: l.cost === 0 ? 2 : 0, t: 0, lvl: 0, stock: l.hold, acc: 0 };
    }),
    trucks: 0,
    speed: 0,
    drones: 0,
    heli: false,
    snd: keep.snd === undefined ? true : keep.snd,
    saved: Date.now()
  };
}

function newRuntime() {
  return { trucks: [], drones: [], rr: 0, key: '' };
}

function setDistrict() {
  D = DISTRICTS[S.dist];
  var x = 0;
  D.lots.forEach(function (l, i) {
    l.i = i;
    l.x = x;
    x += l.w;
  });
  T = newRuntime();
  bought = [];
  opened = [];
  ITEMS = makeItems();
}

function starMult() {
  return 1 + STAR_BONUS * S.stars;
}

function lotCost(i) {
  return Math.ceil(D.lots[i].cost * D.k);
}

function upCost(i) {
  var l = D.lots[i];
  return Math.ceil(l.up * D.k * Math.pow(l.grow, S.lots[i].lvl));
}

function maxLvl(i) {
  return D.lots[i].rungs.length;
}

function isOpen(i) {
  return S.lots[i].st === 2;
}

function incomeAt(i, lvl) {
  var l = D.lots[i];
  return l.pay * (1 + l.gain * lvl) * starMult();
}

function income(i) {
  return isOpen(i) ? incomeAt(i, S.lots[i].lvl) : 0;
}

function stockLots() {
  var n = 0;
  D.lots.forEach(function (l, i) {
    if (isOpen(i) && l.hold > 0) n++;
  });
  return n;
}

function truckSpeed() {
  return TRUCK_SPEED * (1 + S.speed * 2 / 15);
}

// Trucks drive from the far end of the open street to its start, stopping at every open lot that holds stock.
function route() {
  var end = 0;
  var stops = [];
  D.lots.forEach(function (l, i) {
    if (!isOpen(i)) return;
    end = l.x + l.w;
    if (l.hold > 0) stops.unshift({ i: i, x: l.x + l.w / 2 });
  });
  var len = end + 140;
  var v = truckSpeed();
  var at = 0;
  var x = len;
  stops.forEach(function (s) {
    at += (x - s.x) / v;
    s.at = at;
    at += STOP_TIME;
    x = s.x;
  });
  return { len: len, v: v, stops: stops, lap: len / v + stops.length * STOP_TIME };
}

function lap() {
  return route().lap;
}

function truckAt(r, t) {
  var x = r.len;
  for (var j = 0; j < r.stops.length; j++) {
    var s = r.stops[j];
    var drive = (x - s.x) / r.v;
    if (t < drive) return { x: x - r.v * t, phase: 'drive', cur: -1, t: 0 };
    t -= drive;
    if (t < STOP_TIME) return { x: s.x, phase: 'stop', cur: s.i, t: t };
    t -= STOP_TIME;
    x = s.x;
  }
  return { x: Math.max(0, x - r.v * t), phase: 'drive', cur: -1, t: 0 };
}

function fleet() {
  return S.trucks > 0 || S.drones > 0 || S.heli;
}

function visits() {
  var n = stockLots();
  if (!n) return 0;
  return (S.trucks ? S.trucks / lap() : 0) + S.drones / (DRONE_TRIP * n);
}

function uptime(i) {
  var l = D.lots[i];
  if (l.hold === 0 || S.heli) return 1;
  return Math.min(1, l.hold * visits());
}

// income per second as the player sees it: the current stock state without a fleet, the long run average with one
function rateNow() {
  var sum = 0;
  var f = fleet();
  var v = f ? visits() : 0;
  for (var i = 0; i < D.lots.length; i++) {
    if (!isOpen(i)) continue;
    var l = D.lots[i];
    var up = l.hold === 0 || S.heli ? 1 : f ? Math.min(1, l.hold * v) : S.lots[i].stock > 0 ? 1 : 0;
    sum += income(i) * up;
  }
  return sum;
}

// seconds until need more cash arrives; without a fleet a lot only sells what is in stock
function wait(need) {
  if (fleet()) return need / rateNow();
  var ends = [];
  var r = 0;
  for (var i = 0; i < D.lots.length; i++) {
    if (!isOpen(i)) continue;
    r += income(i);
    if (D.lots[i].hold > 0) ends.push({ t: S.lots[i].stock, r: income(i) });
  }
  ends.sort(function (a, b) {
    return a.t - b.t;
  });
  var t = 0;
  for (i = 0; i < ends.length; i++) {
    var gap = (ends[i].t - t) * r;
    if (gap >= need) break;
    need -= gap;
    t = ends[i].t;
    r -= ends[i].r;
  }
  return r > 1e-9 ? t + need / r : Infinity;
}

function unlocked(what) {
  return D.lots.some(function (l, i) {
    return isOpen(i) && l.unlocks && l.unlocks.indexOf(what) >= 0;
  });
}

function nextClosed() {
  for (var i = 0; i < S.lots.length; i++) if (S.lots[i].st === 0) return i;
  return S.lots.length;
}

function truckCost() {
  return Math.ceil(FLEET.trucks[S.trucks].cost * D.k);
}

function speedCost() {
  return Math.ceil(FLEET.speed.up * D.k * Math.pow(FLEET.speed.grow, S.speed));
}

function droneCost() {
  return Math.ceil(FLEET.drones[S.drones].cost * D.k);
}

function heliCost() {
  return Math.ceil(D.lots[D.lots.length - 2].cost * D.k);
}

function lotItem(i) {
  var l = D.lots[i];
  return {
    id: l.id,
    kind: 'lot',
    lot: i,
    name: l.name,
    level: function () { return S.lots[i].st === 2 ? S.lots[i].lvl : 0; },
    cost: function () { return S.lots[i].st === 0 ? lotCost(i) : upCost(i); },
    show: function () { return i <= nextClosed(); },
    busy: function () { return S.lots[i].st === 1; },
    done: function () { return S.lots[i].st === 2 && S.lots[i].lvl >= maxLvl(i); },
    note: function () {
      var s = S.lots[i];
      if (s.st === 0) return 'Opens the lot. Takes ' + l.build + 's to build';
      if (s.st === 1) return 'Under construction';
      if (s.lvl >= maxLvl(i)) return 'Fully built';
      return '$' + short(income(i), 1) + '/s to $' + short(incomeAt(i, s.lvl + 1), 1) + '/s, adds ' + l.rungs[s.lvl].add;
    },
    buy: function () {
      var s = S.lots[i];
      if (s.st === 0) {
        s.st = 1;
        s.t = 0;
        if (l.build === 0) openLot(i);
      } else {
        s.lvl++;
      }
      bought.push([l.id, s.st === 2 ? s.lvl : 0]);
    }
  };
}

function fleetItem(id, name, o) {
  o.id = id;
  o.kind = 'fleet';
  o.name = name;
  return o;
}

function makeItems() {
  var list = D.lots.map(function (l, i) {
    return lotItem(i);
  });
  list.push(fleetItem('trucks', 'Delivery trucks', {
    level: function () { return S.trucks; },
    cost: function () { return truckCost(); },
    show: function () { return unlocked('trucks'); },
    done: function () { return S.trucks >= FLEET.trucks.length; },
    note: function () {
      return S.trucks ? 'Adds ' + FLEET.trucks[S.trucks].add + ' to the route' : 'Restocks businesses for you';
    },
    buy: function () {
      S.trucks++;
      bought.push(['trucks', S.trucks]);
    }
  }));
  list.push(fleetItem('speed', 'Truck speed', {
    level: function () { return S.speed; },
    cost: function () { return speedCost(); },
    show: function () { return S.trucks > 0; },
    done: function () { return S.speed >= FLEET.speed.rungs.length; },
    note: function () {
      var p = Math.round(100 * (2 / 15) / (1 + S.speed * 2 / 15));
      return '+' + p + '% speed, adds ' + FLEET.speed.rungs[S.speed].add;
    },
    buy: function () {
      S.speed++;
      bought.push(['speed', S.speed]);
    }
  }));
  list.push(fleetItem('drones', 'Drones', {
    level: function () { return S.drones; },
    cost: function () { return droneCost(); },
    show: function () { return unlocked('drones') && S.trucks >= FLEET.trucks.length; },
    done: function () { return S.drones >= FLEET.drones.length; },
    note: function () {
      return 'Adds ' + FLEET.drones[S.drones].add + ', it visits every business in turn';
    },
    buy: function () {
      S.drones++;
      bought.push(['drones', S.drones]);
    }
  }));
  list.push(fleetItem('heli', 'Helicopter', {
    level: function () { return S.heli ? 1 : 0; },
    cost: function () { return heliCost(); },
    show: function () { return unlocked('heli'); },
    done: function () { return S.heli; },
    note: function () {
      return 'Stock never runs out again, adds ' + FLEET.heli.add;
    },
    buy: function () {
      S.heli = true;
      bought.push(['heli', 1]);
    }
  }));
  return list;
}

function item(id) {
  for (var i = 0; i < ITEMS.length; i++) if (ITEMS[i].id === id) return ITEMS[i];
}

// TODO: unlimited money while testing, set to false before release
var free = true;

function canBuy(it) {
  if (!it.show() || it.done() || (it.busy && it.busy())) return false;
  if (it.kind === 'lot' && S.lots[it.lot].st === 0 && it.lot !== nextClosed()) return false;
  return free || S.cash >= it.cost();
}

function buy(id) {
  var it = item(id);
  if (!it || !canBuy(it)) return false;
  if (!free) S.cash -= it.cost();
  it.buy();
  return true;
}

function openLot(i) {
  var s = S.lots[i];
  s.st = 2;
  s.t = 0;
  s.stock = D.lots[i].hold;
  opened.push(i);
}

function restock(i) {
  var hold = D.lots[i].hold;
  S.lots[i].stock = Math.min(S.lots[i].stock + hold, hold * STOCK_CAP);
}

function tap(i) {
  if (!isOpen(i)) return 0;
  if (D.lots[i].hold > 0) restock(i);
  var n = income(i);
  S.cash += n;
  return n;
}

function sell(i, dt) {
  var l = D.lots[i];
  var s = S.lots[i];
  var n = dt;
  if (l.hold > 0) {
    n = Math.min(s.stock, dt);
    if (!S.heli) s.stock -= n;
    else s.stock = l.hold;
  }
  var gain = n * income(i);
  S.cash += gain;
  s.acc += gain;
}

// Where a truck sits in the lap of route r, in seconds, from the spot it is at now.
function lapTime(r, tk) {
  var x0 = r.len;
  var from = 0;
  for (var j = 0; j < r.stops.length; j++) {
    var s = r.stops[j];
    if (tk.phase === 'stop' && tk.cur === s.i) return s.at + tk.t;
    if (tk.phase === 'drive' && tk.x >= s.x) break;
    x0 = s.x;
    from = s.at + STOP_TIME;
  }
  return from + Math.max(0, x0 - tk.x) / r.v;
}

// Trucks keep their place on the street when the route changes and ease back to even spacing afterwards.
function moveTrucks(dt) {
  var n = S.trucks;
  T.trucks.length = n;
  if (!n) return;
  var r = route();
  var key = r.len + ',' + r.v + ',' + r.stops.map(function (s) {
    return s.i;
  });
  if (key !== T.key) {
    T.trucks.forEach(function (tk) {
      tk.p = lapTime(r, tk) / r.lap;
    });
    T.key = key;
  }
  var cold = !T.trucks[0];
  for (var k = 0; k < n; k++) {
    var tk = T.trucks[k] || (T.trucks[k] = { p: cold ? k / n : 0, x: r.len, phase: 'drive', cur: -1, t: 0, fed: false });
    tk.p += dt / r.lap;
    if (k > 0) {
      var err = (T.trucks[0].p + k / n - tk.p) % 1;
      if (err > 0.5) err -= 1;
      if (err < -0.5) err += 1;
      tk.p += Math.max(-dt * TRUCK_EASE, Math.min(dt * TRUCK_EASE, err));
    }
    tk.p = (tk.p % 1 + 1) % 1;
  }
  T.trucks.forEach(function (tk) {
    var prev = tk.cur;
    var st = truckAt(r, tk.p * r.lap);
    tk.x = st.x;
    tk.phase = st.phase;
    tk.cur = st.cur;
    tk.t = st.t;
    if (st.phase === 'drive' || st.cur !== prev) tk.fed = false;
    if (st.phase === 'stop' && !tk.fed && st.t >= RESTOCK_AT) {
      restock(st.cur);
      tk.fed = true;
    }
  });
}

function hubX() {
  for (var i = 0; i < D.lots.length; i++) {
    if (D.lots[i].unlocks && D.lots[i].unlocks.indexOf('drones') >= 0) return D.lots[i].x + D.lots[i].w / 2;
  }
  return 0;
}

// Drones take the stock lots in turn, skipping one another's targets, so every lot gets the same share of visits.
function pickLot(k) {
  var n = D.lots.length;
  for (var m = 1; m <= n; m++) {
    var i = (T.rr + m) % n;
    if (!isOpen(i) || D.lots[i].hold === 0) continue;
    var taken = false;
    for (var j = 0; j < T.drones.length; j++) if (j !== k && T.drones[j] && T.drones[j].to === i) taken = true;
    if (taken) continue;
    T.rr = i;
    return i;
  }
  return -1;
}

function moveDrones(dt) {
  T.drones.length = S.drones;
  for (var k = 0; k < S.drones; k++) {
    var d = T.drones[k];
    if (!d) {
      // golden ratio slots keep drones out of step whatever the count, so their picks never repeat in lockstep
      var slot = ((k * 0.618034) % 1) * DRONE_TRIP;
      d = T.drones[k] = { x: hubX(), x0: hubX(), to: -1, t: 0, wait: (slot - clockT % DRONE_TRIP + DRONE_TRIP) % DRONE_TRIP };
    }
    var left = dt;
    if (d.wait > 0) {
      var w = Math.min(left, d.wait);
      d.wait -= w;
      left -= w;
    }
    while (left > 0) {
      if (d.to < 0) {
        d.to = pickLot(k);
        d.x0 = d.x;
        d.t = 0;
        if (d.to < 0) break;
      }
      var use = Math.min(left, DRONE_TRIP - d.t);
      d.t += use;
      left -= use;
      var tx = D.lots[d.to].x + D.lots[d.to].w / 2;
      d.x = d.x0 + (tx - d.x0) * Math.min(1, d.t / DRONE_TRIP);
      if (d.t >= DRONE_TRIP) {
        restock(d.to);
        d.to = -1;
      }
    }
  }
}

function step(dt) {
  clockT += dt;
  for (var i = 0; i < S.lots.length; i++) {
    var s = S.lots[i];
    if (s.st === 1) {
      s.t += dt;
      if (s.t >= D.lots[i].build) openLot(i);
    }
  }
  for (i = 0; i < S.lots.length; i++) if (isOpen(i)) sell(i, dt);
  moveTrucks(dt);
  moveDrones(dt);
}

function tick(dt) {
  while (dt > 0) {
    var d = Math.min(dt, STEP);
    step(d);
    dt -= d;
  }
}

// Same income as tick over a long stretch, from the visit rate instead of moving trucks and drones.
function away(sec) {
  // the clock can be set back between saves
  sec = Math.max(0, Math.min(sec || 0, MAX_AWAY));
  S.saved = Date.now();
  var before = S.cash;
  var active = [];
  for (var i = 0; i < S.lots.length; i++) {
    var s = S.lots[i];
    active[i] = 0;
    if (s.st === 1) {
      var left = D.lots[i].build - s.t;
      if (sec >= left) {
        openLot(i);
        active[i] = sec - left;
      } else {
        s.t += sec;
      }
    } else if (s.st === 2) {
      active[i] = sec;
    }
  }
  var f = fleet();
  for (i = 0; i < S.lots.length; i++) {
    if (!active[i]) continue;
    var l = D.lots[i];
    s = S.lots[i];
    if (l.hold === 0) {
      S.cash += income(i) * active[i];
    } else if (f) {
      S.cash += income(i) * active[i] * uptime(i);
      s.stock = S.heli ? l.hold : Math.max(0, Math.min(s.stock + (l.hold * visits() - 1) * active[i], l.hold * STOCK_CAP));
    } else {
      var n = Math.min(active[i], s.stock);
      S.cash += income(i) * n;
      s.stock -= n;
    }
  }
  return S.cash - before;
}

function save() {
  S.saved = Date.now();
  try {
    localStorage.setItem(KEY, JSON.stringify(S));
    return true;
  } catch (e) {
    return false;
  }
}

function merge(to, from) {
  for (var k in to) {
    if (to[k] !== null && typeof to[k] === 'object') merge(to[k], from[k] || {});
    else if (typeof from[k] === typeof to[k] && (typeof to[k] !== 'number' || isFinite(from[k]))) to[k] = from[k];
  }
}

function clamp(v, lo, hi) {
  return Math.max(lo, Math.min(hi, Math.floor(v) || 0));
}

function fix() {
  S.cash = Math.max(0, S.cash);
  S.stars = clamp(S.stars, 0, 1e6);
  S.trucks = clamp(S.trucks, 0, FLEET.trucks.length);
  S.speed = clamp(S.speed, 0, FLEET.speed.rungs.length);
  S.drones = clamp(S.drones, 0, FLEET.drones.length);
  S.lots.forEach(function (s, i) {
    var l = D.lots[i];
    s.st = clamp(s.st, 0, 2);
    if (l.cost === 0) s.st = 2;
    if (i > 0 && S.lots[i - 1].st === 0) s.st = 0;
    s.lvl = s.st === 2 ? clamp(s.lvl, 0, l.rungs.length) : 0;
    s.t = s.st === 1 ? Math.max(0, Math.min(s.t, l.build)) : 0;
    s.stock = Math.max(0, Math.min(s.stock, l.hold * STOCK_CAP));
    s.acc = Math.max(0, s.acc);
  });
  if (!unlocked('drones') || S.trucks < FLEET.trucks.length) S.drones = 0;
  if (!unlocked('heli')) S.heli = false;
  S.saved = Math.min(S.saved, Date.now());
}

function load() {
  var raw = null;
  try {
    raw = localStorage.getItem(KEY);
  } catch (e) {}
  S = newState(0);
  setDistrict();
  if (!raw) return 0;
  try {
    var from = JSON.parse(raw);
    var d = typeof from.dist === 'number' ? from.dist : 0;
    if (from.v > 2 || !(d >= 0 && d < DISTRICTS.length)) {
      // a save this build cannot read is kept aside, since the next autosave would replace it
      localStorage.setItem(KEY + '.old', raw);
      return 0;
    }
    d = Math.floor(d);
    S = newState(d);
    setDistrict();
    var old = Array.isArray(from.lots) ? from.lots : [];
    from.lots = D.lots.map(function (l, i) {
      var s = old.filter(function (o) {
        return o && o.id === l.id;
      })[0] || old[i];
      return s && (!s.id || s.id === l.id) ? s : {};
    });
    merge(S, from);
    S.dist = d;
  } catch (e) {
    S = newState(0);
    setDistrict();
    return 0;
  }
  // lots open mid-build need the district data, so fix runs after setDistrict
  fix();
  var sec = (Date.now() - S.saved) / 1000;
  var n = away(sec);
  return sec > 30 ? n : 0;
}

// another tab or window saved after this one last did
function newerSave() {
  try {
    var t = JSON.parse(localStorage.getItem(KEY)).saved;
    return t > S.saved && t <= Date.now();
  } catch (e) {
    return false;
  }
}

function reset() {
  try {
    localStorage.removeItem(KEY);
  } catch (e) {}
  S = newState(0);
  setDistrict();
}

function canMove() {
  return isOpen(S.lots.length - 1);
}

// Next district, or any district once all of them are done. Cash, lots and fleet reset, one star is added.
function move(to) {
  if (!canMove()) return false;
  var n = DISTRICTS.length;
  S.done[S.dist] = true;
  var next = S.dist + 1 < n ? S.dist + 1 : S.dist;
  if (S.done.every(Boolean) && to >= 0 && to < n) next = to;
  S = newState(next, { stars: S.stars + 1, done: S.done, snd: S.snd });
  setDistrict();
  save();
  return true;
}

function short(n, d) {
  var units = ['', 'K', 'M', 'B', 'T'];
  var e = 0;
  while (n >= 1000 && e < units.length - 1) {
    n /= 1000;
    e++;
  }
  if (e > 0) d = n >= 100 ? 0 : 1;
  var s = n.toFixed(d || 0);
  if (parseFloat(s) >= 1000 && e < units.length - 1) {
    s = (n / 1000).toFixed(1);
    e++;
  }
  return s + units[e];
}
