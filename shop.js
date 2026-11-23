// Purchases. The native app takes {cmd: 'products', ids}, {cmd: 'buy', id} and {cmd: 'restore'} on window.webkit.messageHandlers.store and
// answers through window.nativeStore(ev), ev being one of
//   {t: 'products', list: [{id, price}]}   the products the store knows, price already in the player's currency
//   {t: 'owned', ids: [id], restore}       one-time products the player owns; answers 'products' and 'restore'
//   {t: 'bought', id, tx}                  a purchase went through; tx is the store's transaction id
//   {t: 'failed', id, why}                 why is 'cancel' or 'error'
//   {t: 'ad', kind, state}                 kind is 'reward' or 'inter'; state is 'ready' or 'none' (whether one can be
//                                          shown now), 'open', 'rewarded' (the player earned it), 'closed' or 'failed'
// It also takes {cmd: 'adReady'}, answered with a 'ready' or 'none' for each kind, and {cmd: 'ad', kind} to show one.
// Ids are the full store ids. In a plain browser there is no store handler and nothing here shows.
var PID = 'com.aytutuna.mainstreet.';
var prices = {};
var storeUp = false;
var buying = '';
var adOk = { reward: false, inter: false };
var watching = null;
var awaySecs = 0;

function native() {
  return !!(window.webkit && window.webkit.messageHandlers && window.webkit.messageHandlers.store);
}

function post(m) {
  window.webkit.messageHandlers.store.postMessage(m);
}

function product(id) {
  for (var i = 0; i < PRODUCTS.length; i++) if (PRODUCTS[i].id === id) return PRODUCTS[i];
  return null;
}

// a one-time product is flagged once; the starter pack's extras come with its first flag
function own(id) {
  var p = product(id);
  if (!p || !p.once || S.iap[id]) return;
  S.iap[id] = 1;
  if (id === 'starter') {
    S.gems += STARTER.gems;
    S.x2 += STARTER.x2;
    S.rep += STARTER.rep;
  }
}

// a gem pack pays once per transaction id, even if the store reports it again
function grant(id, tx) {
  var p = product(id);
  if (!p) return false;
  if (p.once) own(id);
  else {
    if (S.iap.tx.indexOf(tx) >= 0) return false;
    S.iap.tx.push(tx);
    if (S.iap.tx.length > 30) S.iap.tx.shift();
    S.gems += p.gems;
  }
  save();
  return true;
}

function priceOf(p) {
  return prices[PID + p.id];
}

function shopRow(p) {
  var done = p.once && S.iap[p.id];
  var price = priceOf(p);
  var btn = done ? 'Owned' : price || '-';
  var off = done || !price || !!buying;
  return '<div class="offer"><img src="assets/' + p.ic + '.png" alt=""><div><b>' + p.name + '</b>' + (p.text ? '<span>' + p.text + '</span>' : '') +
    '</div><button type="button" class="btn' + (done ? ' alt' : '') + '" data-p="' + p.id + '"' + (off ? ' disabled' : '') + '>' + btn + '</button></div>';
}

function paintShop() {
  var list = PRODUCTS.filter(function (p) { return !(p.id === 'starter' && S.iap.starter); });
  $('shop-list').innerHTML = list.map(shopRow).join('');
  $('shop-txt').textContent = storeUp ? 'Gems are for boosts and time warps.' : 'The store is not available right now. Try again later.';
  $('shop-restore').disabled = !storeUp || !!buying;
  $('b-shop').hidden = !native();
}

function openShop() {
  if (!native()) return;
  paintShop();
  $('shop').hidden = false;
}

function buyProduct(id) {
  if (buying || !prices[PID + id]) return;
  buying = id;
  paintShop();
  post({ cmd: 'buy', id: PID + id });
}

function shopStart() {
  if (!native()) return;
  post({ cmd: 'products', ids: PRODUCTS.map(function (p) { return PID + p.id; }) });
  post({ cmd: 'adReady' });
  $('b-shop').hidden = false;
  // play time counts only while the game is in front
  setInterval(function () { if (!document.hidden) S.ads.pt++; }, 1000);
}

window.nativeStore = function (ev) {
  if (ev.t === 'products') {
    prices = {};
    (ev.list || []).forEach(function (p) { prices[p.id] = p.price; });
    storeUp = !!(ev.list && ev.list.length);
  } else if (ev.t === 'owned') {
    var was = S.iap.noads + S.iap.x2 + S.iap.starter;
    (ev.ids || []).forEach(function (id) { own(id.slice(PID.length)); });
    if (ev.restore) banner('<b>' + (S.iap.noads + S.iap.x2 + S.iap.starter > was ? 'Purchases restored' : 'Nothing to restore') + '</b>', 0);
    save();
  } else if (ev.t === 'bought') {
    buying = '';
    if (grant(ev.id.slice(PID.length), ev.tx)) {
      sfx('done');
      buzz('success');
      banner('<b>Thank you</b><small>' + product(ev.id.slice(PID.length)).name + '</small>', 0, true);
    }
  } else if (ev.t === 'failed') {
    buying = '';
    if (ev.why !== 'cancel') banner('<b>Purchase not completed</b><small>You were not charged.</small>', 0);
  } else if (ev.t === 'ad') adEvent(ev);
  if (!$('shop').hidden) paintShop();
};

function wireShop() {
  $('gems').addEventListener('click', openShop);
  $('b-shop').addEventListener('click', openShop);
  $('shop-x').addEventListener('click', function () { $('shop').hidden = true; });
  $('shop-restore').addEventListener('click', function () { post({ cmd: 'restore' }); });
  $('shop-list').addEventListener('click', function (e) {
    var id = e.target.dataset && e.target.dataset.p;
    if (id) buyProduct(id);
  });
  wireAds();
}

// ads the player picks, a few a day for each reward
function adUsed() {
  var d = dayNum(clock());
  if (S.ads.d !== d) {
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

// with No ads the reward comes straight away
function watch(k, give) {
  if (!canWatch(k) || watching) return;
  if (S.iap.noads) {
    adUsed()[k] = (adUsed()[k] || 0) + 1;
    give();
    return;
  }
  watching = { k: k, give: give };
  post({ cmd: 'ad', kind: 'reward' });
}

function adEvent(ev) {
  if (ev.state === 'ready' || ev.state === 'none') adOk[ev.kind] = ev.state === 'ready';
  else if (ev.state === 'open') {
    S.ads.li = clock();
    if (ac) ac.suspend();
  } else if (ev.state === 'rewarded' && watching) {
    var w = watching;
    watching = null;
    adUsed()[w.k] = (adUsed()[w.k] || 0) + 1;
    w.give();
    save();
  } else if (ev.state === 'closed' || ev.state === 'failed') {
    if (ac && snd) ac.resume();
    if (watching && ev.kind === 'reward') banner('<b>No reward</b><small>The ad was not finished.</small>', 0);
    watching = null;
  }
}

// an interstitial only at a natural break, never in a new player's first minutes and not twice close together
function interBreak() {
  if (!native() || S.iap.noads || !adOk.inter || watching) return;
  if (S.ads.pt < AD_NEW || clock() - S.ads.li < AD_GAP * 1000) return;
  S.ads.li = clock();
  post({ cmd: 'ad', kind: 'inter' });
}

// right after a store move, and after collecting what a long absence earned
function shopMoved() {
  setTimeout(interBreak, 1500);
}

function shopAwayDone() {
  var long = awaySecs >= 3600;
  awaySecs = 0;
  if (long) setTimeout(interBreak, 800);
}

function adLabel() {
  return S.iap.noads ? 'Free' : adOk.reward ? 'Watch' : 'No ad yet';
}

function adGive(k) {
  var c = centerOf($('ads'));
  if (k === 'x2') {
    S.x2 += X2_SECS;
    banner('<b>Double income</b><small>Active for ' + clock2(S.x2) + '</small>', 0);
  } else if (k === 'warp') {
    var v = warp(true);
    popAt('+' + money(v), c.x, c.y, 'big');
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
  var rows = [['x2', 'ui_bolt', 'Double income', '30 min of x2'], ['warp', 'ui_warp', 'Time warp', 'An hour of income'],
    ['gems', 'ui_gem', 'Free gems', AD_GEMS + ' gems']];
  var html = '<p class="small">Free, and a few a day:</p>';
  rows.forEach(function (r) {
    var left = adLeft(r[0]);
    var off = !canWatch(r[0]) || (r[0] === 'warp' && weak);
    html += '<div class="offer"><img src="assets/' + r[1] + '.png" alt=""><div><b>' + r[2] + '</b><span>' + r[3] + ' · ' +
      (left > 0 ? left + ' left today' : 'back tomorrow') + '</span></div><button type="button" class="btn" data-a="' + r[0] + '"' +
      (off ? ' disabled' : '') + '>' + adLabel() + '</button></div>';
  });
  set(shown, 'ads', $('ads'), 'innerHTML', html);
  $('ads').hidden = !native();
}

function paintAwayAd() {
  var on = S.pend > 0 && canWatch('away');
  set(shown, 'awa', $('away-ad'), 'hidden', !on);
  set(shown, 'awat', $('away-ad'), 'textContent', S.iap.noads ? 'Double it, free' : adOk.reward ? 'Double it: watch an ad' : 'Ad loading');
  set(shown, 'awad', $('away-ad'), 'disabled', !S.iap.noads && !adOk.reward);
}

// the starter pack is offered once, after the first store move
function offerStarter() {
  if (!native() || S.iap.starter || S.iap.offered || S.store < 2 || !priceOf(product('starter'))) return;
  S.iap.offered = 1;
  $('pack-txt').textContent = 'One time only: ' + product('starter').text;
  $('pack-buy').textContent = 'Get it for ' + priceOf(product('starter'));
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
    buyProduct('starter');
  });
  $('pack-x').addEventListener('click', function () { $('pack').hidden = true; });
}
