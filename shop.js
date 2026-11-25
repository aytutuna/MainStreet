// Purchases and ads. The native app takes {cmd: 'products', ids}, {cmd: 'buy', id}, {cmd: 'restore'}, {cmd: 'adStart'}, {cmd: 'adStop'},
// {cmd: 'adReady'}, {cmd: 'ad', kind}, {cmd: 'privacy'} and {cmd: 'radio', ...} on window.webkit.messageHandlers.store and
// answers through window.nativeStore(ev), ev being one of
//   {t: 'products', list: [{id, price, amount, currency}]}   the products the store knows, price already in the player's currency
//   {t: 'owned', ids, tx, user, restore}   one-time products the player owns, and tx: [{id, tx, at}] for everything
//                                          bought the store knows (at is ms since 1970), user the RevenueCat user the
//                                          list belongs to; answers 'products' and 'restore'
//   {t: 'bought', id, tx, at}              a purchase went through; tx is RevenueCat's transaction id, at its time
//   {t: 'pending', id}                     the store holds the purchase for approval (a parent, a slow payment method)
//   {t: 'failed', id, why}                 why is 'cancel', 'error' or 'late' (charged, but RevenueCat has not listed it yet;
//                                          an 'owned' follows)
//   {t: 'restoreFailed'}                   a restore could not be done
//   {t: 'ad', kind, state}                 kind is 'reward'; state is 'ready' or 'none' (whether one can be
//                                          shown now), 'open', 'rewarded' (the player earned it), 'closed' or 'failed'
//   {t: 'privacy', required}               whether the consent SDK wants a "Privacy choices" item in the menu
//   {t: 'time', n, ms, sent, recv}         the server time, answering {cmd: 'time', n}: ms is the server's clock, sent and recv
//                                          the device's Date.now() when the request left and the answer came; ms is null
//                                          when nothing answered. It skips the queue, since the game waits for it
//   {t: 'cloud', json, at, dev}            the save the other devices share (json is null when there is none), kept at server time
//                                          at by device dev; answers {cmd: 'cloudGet'} and comes again when another device changes it.
//                                          Like 'time' it skips the queue
//   {t: 'cloudState', state}               'available', 'signedOut', 'pending' (signed in, first sync not done) or 'unavailable';
//                                          answers {cmd: 'cloudState'}, skips the queue. The page sends {cmd: 'cloudPut', json, at, dev}
//   {t: 'notify', state}                   'granted' or 'denied', answering the notify handler's {cmd: 'ask'}; the page does not use it
//   {t: 'radio', state, url, title?}       the stream being played: state is 'buffering', 'playing', 'paused' (headphones
//                                          unplugged) or 'error' (it gave out), url the one
//                                          the page asked for, title what the station says is on (ICY metadata)
//   {t: 'other', on}                       whether another app is playing music (answers 'radio' check, and comes by itself
//                                          when it starts or stops); the page keeps its radio and the store murmur quiet
//                                          while it is, and waits for the answer after coming to the front
// 'adStart' ({mute}) runs the consent step and starts the ads SDK (not sent after Skip ads; 'adStop' ends them), 'adReady' is answered
// with a 'ready' or 'none' for each kind, 'ad' ({kind, mute}) shows one, muted when the game's sound is off, and 'privacy' opens the consent SDK's options form.
// 'radio' is {url, vol} to play a live stream (vol 0 to 1, replacing any other), {vol} to change the volume, {stop: true}
// to end it and {check: true} to ask for an 'other' answer.
// The page tries the next url after an 'error'. The apps stop streams on their own when the game leaves the front.
// Events that come before the saved game is loaded wait in a queue and are replayed by shopStart().
// Ids are the full store ids. In a plain browser there is no store handler and nothing here shows.
var PID = 'com.aytutuna.mainstreet.';
var prices = {};
var amounts = {};
var storeUp = false;
var buying = '';
var adOk = { reward: false };
var watching = null;
var restoreWas = 0;
var lastUser = '';
var buyTimer = 0;
var productsAt = 0;
// a purchase the store has not answered in this long frees the buttons
var BUY_WAIT = 60000;
var queued = [];
var loaded = false;

// the save is handed to the cloud at most this often (and when the game goes to the background); with no save on this device
// the launch waits this long for the cloud's copy
var CLOUD_EVERY = 30000;
var CLOUD_WAIT = 10000;
var CLOUD_BACK = 4000;
var cloudState = '';
var cloudSeen = false;
var cloudFind = null;
var cloudFound = null;
var cloudTimer = 0;
var cloudLate = 0;
var cloudTaken = false;
var cloudShown = false;
var cloudPend = null;
var cloudRet = null;
var cloudAt = -CLOUD_EVERY;
var devKey = '';

// the time comes from the server (the native apps ask alazy.app, a plain browser asks it itself); the game starts and
// resumes only on an answer, and asks again every ten minutes
var TIME_URL = 'https://alazy.app/mainstreet/time';
var TIME_CARD = 4000;
var TIME_EVERY = 600000;
var TIME_GRACE = 120000;
// a purchase stamped later than this after the server's now is not believed
var TIME_SKEW = 60000;
var timeN = 0;
var timeFirst = 0;
var timeGot = 0;
var timeAsked = 0;
var timeSince = 0;
var timeHeld = false;
var timeDone = null;
var timeTimer = 0;

function native() {
  return !!(window.webkit && window.webkit.messageHandlers && window.webkit.messageHandlers.store);
}

function post(m) {
  window.webkit.messageHandlers.store.postMessage(m);
}

function askTime() {
  var n = ++timeN;
  if (!timeHeld) timeFirst = n;
  timeAsked = performance.now();
  if (native()) return post({ cmd: 'time', n: n });
  var sent = Date.now();
  if (/[?&]rig\b/.test(location.search)) return gotTime({ n: n, ms: sent, sent: sent, recv: sent });
  fetch(TIME_URL, { cache: 'no-store' }).then(function (r) { return r.json(); }).then(function (j) {
    gotTime({ n: n, ms: j.now, sent: sent, recv: Date.now() });
  }).catch(function () {});
}

// an answer counts when it belongs to the current wait (or is the last refresh) and arrived a few seconds ago; a slow
// lookup still counts after the next ask went out. The phone clock is used only for the round trip
function gotTime(ev) {
  if (ev.n < timeFirst || ev.n > timeN || typeof ev.ms !== 'number' || Math.abs(Date.now() - ev.recv) > 10000 || ev.n < timeGot) return;
  timeGot = ev.n;
  synced = { ms: ev.ms + Date.now() - (ev.sent + ev.recv) / 2, at: performance.now() };
  zoneCheck();
  if (!timeHeld) return;
  timeHeld = false;
  $('net').hidden = true;
  var d = timeDone;
  timeDone = null;
  if (d) d();
}

// the game stands still until the next answer, then runs done. The card shows after TIME_CARD ms without one
function timeWait(done, card) {
  if (!timeTimer) {
    timeTimer = setInterval(timeWatch, 1000);
    $('net-retry').addEventListener('click', askTime);
  }
  if (!timeHeld) {
    timeHeld = true;
    timeFirst = timeN + 1;
    timeSince = performance.now() - (card ? TIME_CARD : 0);
  }
  timeDone = done || timeDone;
  askTime();
}

function timeWatch() {
  if (document.hidden) return;
  var now = performance.now();
  if (timeHeld) {
    if (now - timeSince >= TIME_CARD) $('net').hidden = false;
    if (now - timeAsked >= 5000) askTime();
  } else if (synced) {
    // a failed refresh keeps the game running on the monotonic clock and is tried again every minute; the grace
    // counts from the moment the refresh was due
    if (now - synced.at >= TIME_EVERY + TIME_GRACE) timeWait(null, true);
    else if (now - synced.at >= TIME_EVERY && now - timeAsked >= 60000) askTime();
  }
}

function devId() {
  if (devKey) return devKey;
  try {
    devKey = localStorage.getItem('mainstreet.dev');
    if (!devKey) localStorage.setItem('mainstreet.dev', devKey = Math.random().toString(36).slice(2) + Date.now().toString(36));
  } catch (e) {}
  return devKey || 'x';
}

// nothing is written before the cloud has answered since the launch or the last return (cloudSeen), and a game this young
// waits for a signed-in cloud's first sync
function cloudReady() {
  return cloudSeen && (cloudState !== 'pending' || S.ads.pt >= YOUNG);
}

function cloudPut(erase) {
  clearTimeout(cloudTimer);
  cloudTimer = 0;
  // a copy that waits for the time answer has not been judged yet, so it is not written over
  if (!native() || !loaded || blocked || !(erase === true || (cloudReady() && !cloudPend && !timeHeld))) return;
  cloudAt = performance.now();
  if (erase === true) cloudTs = S.ts;
  post({ cmd: 'cloudPut', json: saved(), at: Math.round(clock()), dev: devId() });
}

function cloudSoon() {
  if (!cloudTimer && native() && loaded) cloudTimer = setTimeout(cloudPut, Math.max(0, cloudAt + CLOUD_EVERY - performance.now()));
}

function cloudMenu() {
  $('m-cloud').hidden = !(/Android/i.test(navigator.userAgent) && (cloudState === 'signedOut' || cloudState === 'unavailable'));
}

// runs done(true) when the cloud's save became this device's first one. With a save here nothing waits
function cloudLook(done) {
  if (!native()) return done(false);
  post({ cmd: 'cloudState' });
  post({ cmd: 'cloudGet' });
  if (hasSave()) return done(false);
  cloudFind = done;
  $('find').hidden = false;
  cloudLate = setTimeout(cloudEnd, CLOUD_WAIT);
}

function cloudEnd() {
  if (!cloudFind) return;
  clearTimeout(cloudLate);
  $('find').hidden = true;
  var done = cloudFind;
  var raw = cloudFound;
  cloudFind = cloudFound = null;
  done(!!raw && cloudSeed(raw));
}

// a copy replaces this game and the screen shows it, or waits for the launch reveal while the models load
function cloudTake(raw) {
  if (!takeCloud(raw)) return;
  $('away').hidden = true;
  if (S.iap.noads) post({ cmd: 'adStop' });
  if (View.ready()) {
    cloudShown = true;
    afterLoad();
    showAway(cloudAway);
    banner('<b>' + tl('cloud.loaded') + '</b><small>' + tl('cloud.loaded_note') + '</small>', 0);
  } else cloudTaken = true;
}

// on return the cloud is asked again, and the return waits for its answer (at most CLOUD_BACK) so another device's copy is
// taken before this one plays on and writes over it
function cloudBack() {
  if (!native()) return;
  if (cloudRet) clearTimeout(cloudRet.t);
  cloudRet = { got: false, run: null, t: setTimeout(cloudGot, CLOUD_BACK) };
  cloudSeen = false;
  post({ cmd: 'cloudGet' });
}

// the game stands still while the return waits for the cloud
function cloudHeld() {
  return !!cloudRet && !cloudRet.got;
}

function cloudGot() {
  var r = cloudRet;
  if (!r) return;
  clearTimeout(r.t);
  r.got = true;
  if (r.run) {
    cloudRet = null;
    r.run();
  }
}

function cloudAfter(fn) {
  var r = cloudRet;
  if (!r || r.got) {
    cloudRet = null;
    fn();
  } else r.run = fn;
}

// the copy that came while the game was being played, taken now that the app is back and the time is known
function cloudApply() {
  var raw = cloudPend;
  cloudPend = null;
  if (raw) cloudTake(raw);
}

function stampOf(raw) {
  try {
    return JSON.parse(raw).ts || 0;
  } catch (e) {
    return 0;
  }
}

function cloudEvent(ev) {
  if (ev.t === 'cloudState') {
    cloudState = ev.state;
    cloudMenu();
  } else {
    cloudSeen = true;
    if (cloudFind) cloudFound = ev.json || cloudFound;
    else if (ev.json && loaded && ev.dev !== devId()) {
      // a copy is judged by its own time whenever it comes; only while the server time is unknown does it wait
      if (!timeHeld) cloudTake(ev.json);
      else if (!cloudPend || stampOf(ev.json) >= stampOf(cloudPend)) cloudPend = ev.json;
    }
  }
  if (ev.t === 'cloud') cloudGot();
  if (cloudFind && (cloudFound || (cloudSeen && cloudState && cloudState !== 'pending'))) cloudEnd();
}

function product(id) {
  for (var i = 0; i < PRODUCTS.length; i++) if (PRODUCTS[i].id === id) return PRODUCTS[i];
  return null;
}

// a one-time product is flagged when the store says the player owns it
function own(id, tx) {
  var p = product(id);
  if (!p || !p.once) return false;
  // the newest transaction listed wins, kept with the RevenueCat user that listed it
  if (tx && lastUser) {
    S.iap[id + 'Tx'] = tx;
    S.iap[id + 'User'] = lastUser;
  }
  if (S.iap[id]) return false;
  S.iap[id] = 1;
  delete S.iap.wait[id];
  if (id === 'noads') post({ cmd: 'adStop' });
  return true;
}

function seen(tx) {
  return S.iap.tx.indexOf(tx) >= 0;
}

function note(tx) {
  S.iap.tx.push(tx);
  if (S.iap.tx.length > 100) S.iap.tx.shift();
}

// a consumable pays once per transaction id, even if the store reports it again, and whenever it happened
function credit(p, tx) {
  if (seen(tx)) return false;
  note(tx);
  delete S.iap.wait[p.id];
  if (p.id === 'starter1') {
    S.iap.starter = 1;
    S.gems += STARTER.gems;
    S.x2 += STARTER.x2;
    S.rep += STARTER.rep;
  } else S.gems += p.gems;
  return true;
}

function grant(id, tx) {
  var p = product(id);
  if (!p) return false;
  var done = p.once ? own(id, tx) : credit(p, tx);
  if (done) save();
  return done;
}

// consumables the store lists that the page may not have credited, say because the app died after the charge. Gem packs
// count only when recent, so a reinstall does not pay old packs again; the starter pack counts whenever it was bought
function recover(list) {
  var n = 0;
  (list || []).forEach(function (t) {
    var p = product(t.id.slice(PID.length));
    // the pack being bought right now is credited by its own answer
    if (!p || p.once || t.id === PID + buying) return;
    if (p.id === 'starter1') {
      if (credit(p, t.tx)) n += STARTER.gems;
    } else if (clock() - t.at >= -TIME_SKEW && clock() - t.at < RECOVER * 1000 && credit(p, t.tx)) n += p.gems + dealBonus(p.id, t.at);
  });
  return n;
}

function txOf(list, id) {
  var best = null;
  (list || []).forEach(function (t) {
    if (t.id === id && (!best || t.at > best.at)) best = t;
  });
  return best ? best.tx : '';
}

// a Skip ads or x2 whose transaction the store no longer lists was refunded, so its flag goes; gems stay. Only an answer
// from the RevenueCat user that listed the transaction counts, since another user has a different list
function refunds(ev) {
  if (!Array.isArray(ev.tx) || !ev.user) return;
  ['noads', 'x2'].forEach(function (id) {
    var t = S.iap[id + 'Tx'];
    if (!S.iap[id] || !t || S.iap[id + 'User'] !== ev.user || (ev.ids || []).indexOf(PID + id) >= 0 || ev.tx.some(function (x) { return x.tx === t; })) return;
    S.iap[id] = 0;
    S.iap.rf = joinTx(S.iap.rf, [t]);
    S.iap[id + 'Tx'] = '';
    S.iap[id + 'User'] = '';
    if (id === 'noads') {
      adOn = false;
      if (S.ads.pt >= AD_START) adBegin();
    }
  });
}

// the bonus of the deal the player tapped, paid once to the purchase it was tapped for
function dealBonus(id, at) {
  var key = S.iap.deal && S.iap.deal.id === id ? 'deal' : 'held';
  var d = S.iap[key];
  if (!d || d.id !== id || at > d.until || at > clock() + TIME_SKEW) return 0;
  S.iap[key] = null;
  S.gems += d.bonus;
  save();
  return d.bonus;
}

function priceOf(p) {
  return prices[PID + p.id];
}

// a purchase the store holds for approval blocks a second one of the same product, also after a relaunch
function waitOn(id) {
  return S.iap.wait[id] > clock();
}

function shopBtn(p) {
  var done = p.once && S.iap[p.id];
  var price = priceOf(p);
  var off = done || !price || !!buying || waitOn(p.id);
  return '<button type="button" class="btn' + (done ? ' alt' : '') + '" data-p="' + p.id + '"' + (off ? ' disabled' : '') + '>' + (done ? tl('shop.owned') : waitOn(p.id) ? tl('shop.pending') : price || '-') + '</button>';
}

function hms(v) {
  v = Math.max(0, Math.floor(v));
  var m = Math.floor(v / 60) % 60;
  var s = v % 60;
  return Math.floor(v / 3600) + ':' + (m < 10 ? '0' : '') + m + ':' + (s < 10 ? '0' : '') + s;
}

// the deal of the day: a pack and the bonus gems it pays. The day comes from the clock, so it needs no saving
function dealNow() {
  var id = DEAL.packs[dayNum(clock()) % DEAL.packs.length];
  if (!priceOf(product(id))) return null;
  return { id: id, bonus: Math.round(product(id).gems * DEAL.bonus) };
}

// the starter pack's one window starts when its button is first shown; after it the answer is -1 for good. Without
// begin, a window not started yet counts as open
function starterLeft(begin) {
  var w = STARTER_HOURS * 3600000;
  if (!S.ads.sd) {
    if (!begin) return w / 1000;
    S.ads.sd = clock();
  }
  var el = clock() - S.ads.sd;
  return el >= w ? -1 : (w - Math.max(el, 0)) / 1000;
}

function pile(n) {
  var rows = [[1], [1, 2], [2, 3], [3, 4, 3]][n];
  return '<div class="pile">' + rows.map(function (c) {
    return '<div>' + new Array(c + 1).join('<img src="assets/ui_gem.png" alt="">') + '</div>';
  }).join('') + '</div>';
}

function heroCard(p) {
  var chips = [['ui_gem', STARTER.gems, tl('shop.chip_gems')], ['ui_bolt', tl('shop.chip_hours', { n: STARTER.x2 / 3600 }), tl('shop.chip_x2')], ['ui_star', STARTER.rep, tl('shop.chip_rep')]];
  return '<div class="hero" data-k="starter"><i class="rib">' + tl('shop.starter_ribbon') + '</i><h3>' + p.name + '</h3><span>' + tl('shop.buy_once') + '</span><div class="gifts">' +
    chips.map(function (c) { return '<div><img src="assets/' + c[0] + '.png" alt=""><b>' + c[1] + '</b><small>' + c[2] + '</small></div>'; }).join('') +
    '</div>' + shopBtn(p) + '</div>';
}

function featCard(p) {
  return '<div class="feat" data-k="' + p.id + '"><u><img src="assets/' + p.ic + '.png" alt=""></u><div><b>' + p.name + '</b><span>' + p.line + '</span></div>' + shopBtn(p) + '</div>';
}

function bestPack(gems) {
  var best = null, top = 0;
  gems.forEach(function (p) {
    var a = amounts[PID + p.id];
    if (a && p.gems / a > top) { top = p.gems / a; best = p; }
  });
  var a1 = amounts[PID + gems[0].id];
  return best && a1 && top > gems[0].gems / a1 ? best.id : null;
}

function gemTile(p, i, first, deal, best) {
  var on = deal && deal.id === p.id;
  var a = amounts[PID + p.id];
  var a1 = amounts[PID + first.id];
  var more = a && a1 ? Math.round((p.gems / a / (first.gems / a1) - 1) * 100) : 0;
  var tag = p.id === best ? tl('shop.best_value') : '';
  var badge = on ? tl('shop.badge_bonus', { n: Math.round(DEAL.bonus * 100) }) : more > 0 ? tl('shop.badge_more', { n: more }) : '';
  return '<div class="tile' + (on ? ' deal' : '') + '" data-k="' + p.id + '">' + (tag ? '<i class="rib">' + tag + '</i>' : '') +
    (badge ? '<em>' + badge + '</em>' : '') + pile(i) + '<b>' + tl('shop.gems', { n: p.gems }) + '</b>' +
    (on ? '<small>' + tl('shop.deal_day', { n: deal.bonus }) + '</small>' : '') + shopBtn(p) + '</div>';
}

function paintShop() {
  var starter = product('starter1');
  var gems = PRODUCTS.filter(function (p) { return p.gems; });
  var deal = dealNow();
  var html = S.iap.starter || (starterLeft(true) < 0 && !waitOn('starter1')) ? '' : heroCard(starter);
  html += '<div class="feats">' + featCard(product('noads')) + featCard(product('x2')) + '</div>';
  var best = bestPack(gems);
  html += '<h3 class="sec">' + tl('shop.gems_heading') + '</h3><div class="tiles">' + gems.map(function (p, i) { return gemTile(p, i, gems[0], deal, best); }).join('') + '</div>';
  $('shop-list').innerHTML = html;
  $('shop-txt').textContent = tl(storeUp ? 'shop.intro' : 'shop.unavailable');
  $('shop-restore').disabled = !storeUp || !!buying;
  $('b-shop').hidden = !native();
}

function openShop(at) {
  if (!native()) return;
  askAgain();
  paintShop();
  $('shop').hidden = false;
  var box = $('shop').firstElementChild;
  box.scrollTop = 0;
  var el = typeof at === 'string' && $('shop-list').querySelector('[data-k="' + at + '"]');
  if (el) box.scrollTop = el.getBoundingClientRect().top - box.getBoundingClientRect().top - (box.clientHeight - el.offsetHeight) / 2;
}

function buyDone() {
  buying = '';
  clearTimeout(buyTimer);
}

function askProducts() {
  productsAt = performance.now();
  post({ cmd: 'products', ids: PRODUCTS.map(function (p) { return PID + p.id; }) });
}

// the store list is asked for again when the last answer was empty or never came
function askAgain() {
  if (native() && loaded && !storeUp && performance.now() - productsAt > 5000) askProducts();
}

function buyProduct(id) {
  if (buying || waitOn(id) || !prices[PID + id] || (id === 'starter1' && (S.iap.starter || starterLeft(false) < 0))) return;
  buying = id;
  var d = dealNow();
  // the deal is fixed when the player taps, so a day change during the purchase does not lose it
  S.iap.deal = d && d.id === id ? { id: id, bonus: d.bonus, until: clock() + 3600000 } : null;
  paintShop();
  post({ cmd: 'buy', id: PID + id });
  buyTimer = setTimeout(function () {
    if (buying !== id) return;
    buyDone();
    if (!$('shop').hidden) paintShop();
  }, BUY_WAIT);
}

var adOn = false;

// called once the saved game is loaded: the queue is replayed, then the store and the ads are asked for
function shopStart() {
  if (!native()) return;
  loaded = true;
  onSaved = cloudSoon;
  queued.splice(0).forEach(handle);
  askOther();
  askProducts();
  document.addEventListener('visibilitychange', function () { if (!document.hidden) askAgain(); });
  if (S.iap.noads) post({ cmd: 'adStop' });
  if (S.ads.pt >= AD_START) adBegin();
  $('b-shop').hidden = false;
  // play time counts only while the game is in front
  setInterval(function () {
    if (document.hidden) return;
    S.ads.pt++;
    if (S.ads.pt >= AD_START) adBegin();
  }, 1000);
}

// the consent form and the tracking prompt wait until the player has had a few minutes with the game
function adBegin() {
  if (adOn || S.iap.noads) return;
  adOn = true;
  post({ cmd: 'adStart', mute: !snd });
  post({ cmd: 'adReady' });
}

window.nativeStore = function (ev) {
  if (ev.t === 'time') gotTime(ev);
  else if (ev.t === 'cloud' || ev.t === 'cloudState') cloudEvent(ev);
  else if (loaded) handle(ev);
  else queued.push(ev);
};

function handle(ev) {
  if (ev.t === 'products') {
    prices = {};
    amounts = {};
    (ev.list || []).forEach(function (p) {
      prices[p.id] = p.price;
      if (p.amount > 0) amounts[p.id] = p.amount;
    });
    storeUp = !!(ev.list && ev.list.length);
  } else if (ev.t === 'owned') {
    lastUser = ev.user || '';
    (ev.ids || []).forEach(function (id) { own(id.slice(PID.length), txOf(ev.tx, id)); });
    refunds(ev);
    var back = recover(ev.tx);
    if (back) banner('<b>' + tl('shop.recovered', { n: back, count: short(back) }) + '</b><small>' + tl('shop.recovered_note') + '</small>', 0);
    if (ev.restore) banner('<b>' + tl(S.iap.noads + S.iap.x2 + S.iap.starter > restoreWas ? 'shop.restored' : 'shop.nothing_to_restore') + '</b>', 0);
    save();
  } else if (ev.t === 'bought') {
    buyDone();
    var bid = ev.id.slice(PID.length);
    var extra = grant(bid, ev.tx) && product(bid).gems ? dealBonus(bid, ev.at) : 0;
    sfx('done');
    buzz('success');
    banner('<b>' + tl('shop.thanks') + '</b><small>' + (extra ? tl('shop.thanks_bonus', { name: product(bid).name, n: extra }) : product(bid).name) + '</small>', 0, true);
  } else if (ev.t === 'pending') {
    buyDone();
    var wid = ev.id.slice(PID.length);
    S.iap.wait[wid] = clock() + ASK_WAIT * 1000;
    // a held deal is kept apart, so the deal of another day can still be tapped meanwhile
    if (S.iap.deal && S.iap.deal.id === wid) {
      S.iap.held = S.iap.deal;
      S.iap.held.until = S.iap.wait[wid];
      S.iap.deal = null;
    }
    save();
    banner('<b>' + tl('shop.pending') + '</b><small>' + tl('shop.pending_note') + '</small>', 0);
  } else if (ev.t === 'restoreFailed') banner('<b>' + tl('shop.restore_failed') + '</b>', 0);
  else if (ev.t === 'failed') {
    buyDone();
    if (ev.why !== 'late' && S.iap.deal && S.iap.deal.id === ev.id.slice(PID.length)) S.iap.deal = null;
    if (ev.why === 'late') banner('<b>' + tl('shop.late') + '</b><small>' + tl('shop.late_note') + '</small>', 0);
    else if (ev.why !== 'cancel') banner('<b>' + tl('shop.failed') + '</b>', 0);
  } else if (ev.t === 'adId') testAdId(ev.id);
  else if (ev.t === 'privacy') $('m-priv').hidden = !ev.required;
  else if (ev.t === 'ad') adEvent(ev);
  else if (ev.t === 'radio' || ev.t === 'other') radioEvent(ev);
  if (!$('shop').hidden) paintShop();
}

function wireShop() {
  $('gems').addEventListener('click', function () { openShop(); });
  $('b-shop').addEventListener('click', function () { openShop(); });
  $('shop-x').addEventListener('click', function () { $('shop').hidden = true; });
  $('shop-restore').addEventListener('click', function () {
    restoreWas = S.iap.noads + S.iap.x2 + S.iap.starter;
    post({ cmd: 'restore' });
  });
  $('m-priv').addEventListener('click', function () { post({ cmd: 'privacy' }); });
  $('shop-list').addEventListener('click', function (e) {
    var id = e.target.dataset && e.target.dataset.p;
    if (id) buyProduct(id);
  });
  $('deals').addEventListener('click', function (e) {
    var b = e.target.closest('button');
    var d = b && b.dataset.d;
    if (d === 'start') openShop('starter');
    else if (d === 'deal') {
      var dl = dealNow();
      if (dl) openShop(dl.id);
    }
    else if (d === 'gems') watch('gems', function () { adGive('gems', b); });
    else if (d === 'x2') {
      if (canWatch('x2')) watch('x2', function () { adGive('x2', b); });
      else {
        paintBoost();
        $('boost').hidden = false;
      }
    }
  });
  wireAds();
}

// ads the player picks, a few a day for each reward
function adUsed() {
  var d = dayNum(clock());
  // like the daily reward, a clock set back does not give the day's ads again
  if (d > S.ads.d) {
    S.ads.d = d;
    S.ads.n = {};
  }
  return S.ads.n;
}

function adLeft(k) {
  return AD_CAP[k] - (adUsed()[k] || 0);
}

function canWatch(k) {
  return native() && adLeft(k) > 0 && (S.iap.noads || adOk.reward);
}

// with Skip ads the reward comes straight away
function watch(k, give) {
  if (!canWatch(k) || watching) return;
  if (S.iap.noads) {
    adUsed()[k] = (adUsed()[k] || 0) + 1;
    give();
    return;
  }
  watching = { k: k, give: give };
  post({ cmd: 'ad', kind: 'reward', mute: !snd });
}

function adEvent(ev) {
  if (ev.state === 'ready' || ev.state === 'none') adOk[ev.kind] = ev.state === 'ready';
  else if (ev.state === 'open') {
    adOpen = true;
    radioSync();
    if (ac) ac.suspend();
  } else if (ev.state === 'rewarded' && watching) {
    var w = watching;
    watching = null;
    adUsed()[w.k] = (adUsed()[w.k] || 0) + 1;
    w.give();
    save();
  } else if (ev.state === 'closed' || ev.state === 'failed') {
    adOpen = false;
    if (ac && snd) ac.resume();
    radioSync();
    if (!watching || ev.kind !== 'reward') return;
    // the reward can arrive a moment after the ad closes
    var w = watching;
    setTimeout(function () {
      if (watching !== w) return;
      watching = null;
      banner('<b>' + tl('ads.no_reward') + '</b><small>' + tl(ev.state === 'failed' ? 'ads.unavailable' : 'ads.unfinished') + '</small>', 0);
    }, ev.state === 'failed' ? 0 : 5000);
  }
}

function adLabel() {
  return tl(S.iap.noads ? 'ads.free' : adOk.reward ? 'ads.watch' : 'ads.none_yet');
}

function adGive(k, from) {
  var c = centerOf(from || $('ads'));
  if (k === 'x2') {
    S.x2 += X2_SECS;
    banner('<b>' + tl('ads.x2') + '</b><small>' + tl('ads.x2_active', { time: clock2(S.x2) }) + '</small>', 0);
  } else if (k === 'rush') {
    if (callRush(true)) $('boost').hidden = true;
  } else if (k === 'warp') {
    var v = warp(true);
    popAt(plus(money(v)), c.x, c.y, 'big');
    flyCoins(c.x, c.y, 8);
  } else {
    S.gems += AD_GEMS;
    flyGems(c.x, c.y, AD_GEMS);
  }
  sfx('done');
  buzz('success');
  nudge();
}

function paintAds() {
  var weak = Math.min(rate() * WARP_SECS, Math.max(S.run, 100)) < rate() * 600;
  var rows = [['x2', 'ui_bolt', tl('ads.x2'), tl('ads.x2_note')], ['warp', 'ui_warp', tl('ads.warp'), tl('ads.warp_note')],
    ['gems', 'ui_gem', tl('ads.gems'), tl('shop.gems', { n: AD_GEMS })], ['rush', 'ui_bolt', tl('ads.rush'), tl('ads.rush_note')]];
  var html = '<p class="small">' + tl('ads.intro') + '</p>';
  rows.forEach(function (r) {
    var left = adLeft(r[0]);
    var off = !canWatch(r[0]) || (r[0] === 'warp' && weak) || (r[0] === 'rush' && (rush || shut() || S.call <= 0));
    html += '<div class="offer"><img src="assets/' + r[1] + '.png" alt=""><div><b>' + r[2] + '</b><span>' + r[3] + ' · ' +
      (left > 0 ? tl('ads.left', { n: left }) : tl('ads.tomorrow')) + '</span></div><button type="button" class="btn" data-a="' + r[0] + '"' +
      (off ? ' disabled' : '') + '>' + adLabel() + '</button></div>';
  });
  set(shown, 'ads', $('ads'), 'innerHTML', html);
  put($('ads'), 'hidden', !native());
}

// side buttons on the main screen, at most three: the starter pack, the deal, free gems and double income, in that order
function updateDeals() {
  var on = native() && loaded && S.ads.pt >= AD_START;
  var dl = on ? dealNow() : null;
  var want = [on && !S.iap.starter && !!priceOf(product('starter1')) && starterLeft(false) >= 0, !!dl, canWatch('gems'),
    S.x2 <= 0 && (canWatch('x2') || S.gems >= X2_COST)];
  var cap = innerHeight < 700 ? 2 : 3;
  var n = 0;
  ['start', 'deal', 'gems', 'x2'].forEach(function (k, i) {
    var b = $('d-' + k);
    var show = want[i] && n < cap;
    if (show) n++;
    set(shown, 'd' + k, b, 'hidden', !show);
    if (!show) return;
    if (k === 'start') {
      var left = starterLeft(true);
      set(shown, 'dt' + k, b.lastChild, 'textContent', left < 0 ? '' : hms(left));
    } else if (k === 'deal') set(shown, 'db' + k, b.children[1], 'textContent', plus(Math.round(DEAL.bonus * 100) + '%'));
  });
}

function paintAwayAd() {
  var on = S.pend > 0 && canWatch('away');
  set(shown, 'awa', $('away-ad'), 'hidden', !on);
  set(shown, 'awat', $('away-ad'), 'textContent', tl(S.iap.noads ? 'ads.double_free' : adOk.reward ? 'ads.double_watch' : 'ads.loading'));
  set(shown, 'awad', $('away-ad'), 'disabled', !S.iap.noads && !adOk.reward);
}

// the starter pack is offered once, after the first store move, and only inside its window
function offerStarter() {
  if (!native() || S.iap.starter || S.iap.offered || S.store < 2 || !priceOf(product('starter1')) || starterLeft(true) < 0) return;
  S.iap.offered = 1;
  $('pack-note').textContent = tl('pack.limit', { n: STARTER_HOURS });
  $('pack-txt').textContent = tl('pack.once', { text: product('starter1').text });
  $('pack-buy').textContent = tl('pack.get', { price: priceOf(product('starter1')) });
  $('pack').hidden = false;
}

function wireAds() {
  $('ads').addEventListener('click', function (e) {
    var k = e.target.dataset && e.target.dataset.a;
    if (k) watch(k, function () { adGive(k); });
  });
  $('away-ad').addEventListener('click', function () { watch('away', function () { takeAway(true, 'away-ad', true); }); });
  $('pack-buy').addEventListener('click', function () {
    $('pack').hidden = true;
    buyProduct('starter1');
  });
  $('pack-x').addEventListener('click', function () { $('pack').hidden = true; });
}
