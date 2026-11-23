// Purchases and ads. The native app takes {cmd: 'products', ids}, {cmd: 'buy', id}, {cmd: 'restore'}, {cmd: 'adStart'},
// {cmd: 'adReady'}, {cmd: 'ad', kind} and {cmd: 'privacy'} on window.webkit.messageHandlers.store and answers through
// window.nativeStore(ev), ev being one of
//   {t: 'products', list: [{id, price}]}   the products the store knows, price already in the player's currency
//   {t: 'owned', ids, tx, restore}         one-time products the player owns, and tx: [{id, tx, at}] for the gem packs
//                                          the store knows (at is ms since 1970); answers 'products' and 'restore'
//   {t: 'bought', id, tx, at}              a purchase went through; tx is the store's transaction id, at its time
//   {t: 'failed', id, why}                 why is 'cancel' or 'error'
//   {t: 'ad', kind, state}                 kind is 'reward' or 'inter'; state is 'ready' or 'none' (whether one can be
//                                          shown now), 'open', 'rewarded' (the player earned it), 'closed' or 'failed'
//   {t: 'privacy', required}               whether the consent SDK wants a "Privacy choices" item in the menu
// 'adStart' runs the consent step and starts the ads SDK (not sent when the player has No ads), 'adReady' is answered
// with a 'ready' or 'none' for each kind, 'ad' shows one and 'privacy' opens the consent SDK's options form.
// Events that come before the saved game is loaded wait in a queue and are replayed by shopStart().
// Ids are the full store ids. In a plain browser there is no store handler and nothing here shows.
var PID = 'com.aytutuna.mainstreet.';
var prices = {};
var storeUp = false;
var buying = '';
var adOk = { reward: false, inter: false };
var watching = null;
var awaySecs = 0;
var restoreWas = 0;
var queued = [];
var loaded = false;

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

// a one-time product is flagged when the store says the player owns it. The starter pack's extras are only for a new
// purchase, which makes the flag 2; a restore leaves it at 1
function own(id, fresh) {
  var p = product(id);
  if (!p || !p.once) return false;
  var extras = id === 'starter' && fresh && S.iap.starter !== 2;
  if (!extras && S.iap[id]) return false;
  S.iap[id] = extras ? 2 : 1;
  if (extras) {
    S.gems += STARTER.gems;
    S.x2 += STARTER.x2;
    S.rep += STARTER.rep;
  }
  return true;
}

function seen(tx) {
  return S.iap.tx.indexOf(tx) >= 0;
}

function note(tx) {
  S.iap.tx.push(tx);
  if (S.iap.tx.length > 100) S.iap.tx.shift();
}

// a gem pack pays once per transaction id, even if the store reports it again
function credit(p, tx) {
  if (seen(tx)) return false;
  note(tx);
  S.gems += p.gems;
  return true;
}

// a purchase is new when its transaction is unseen and just happened; the App Store answers a second buy of a
// one-time product with the old transaction
function grant(id, tx, at) {
  var p = product(id);
  if (!p) return false;
  var fresh = !seen(tx) && Math.abs(clock() - at) < 300000;
  var done = p.once ? own(id, fresh) : credit(p, tx);
  if (done && p.once && fresh) note(tx);
  if (done) save();
  return done;
}

// gem packs the store lists that the page may not have credited, say because the app died after the charge. Only recent
// ones count, so a reinstall does not pay old packs again
function recover(list) {
  var n = 0;
  (list || []).forEach(function (t) {
    var p = product(t.id.slice(PID.length));
    // the pack being bought right now is credited by its own answer
    if (p && p.gems && t.id !== PID + buying && clock() - t.at < RECOVER * 1000 && credit(p, t.tx)) n += p.gems;
  });
  return n;
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

var adOn = false;

// called once the saved game is loaded: the queue is replayed, then the store and the ads are asked for
function shopStart() {
  if (!native()) return;
  loaded = true;
  queued.splice(0).forEach(handle);
  post({ cmd: 'products', ids: PRODUCTS.map(function (p) { return PID + p.id; }) });
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
  post({ cmd: 'adStart' });
  post({ cmd: 'adReady' });
}

window.nativeStore = function (ev) {
  if (loaded) handle(ev);
  else queued.push(ev);
};

function handle(ev) {
  if (ev.t === 'products') {
    prices = {};
    (ev.list || []).forEach(function (p) { prices[p.id] = p.price; });
    storeUp = !!(ev.list && ev.list.length);
  } else if (ev.t === 'owned') {
    (ev.ids || []).forEach(function (id) { own(id.slice(PID.length), false); });
    var back = recover(ev.tx);
    if (back) banner('<b>' + plural(back, 'gem') + ' added</b><small>From a purchase that was not credited.</small>', 0);
    if (ev.restore) banner('<b>' + (S.iap.noads + S.iap.x2 + S.iap.starter > restoreWas ? 'Purchases restored' : 'Nothing to restore') + '</b>', 0);
    save();
  } else if (ev.t === 'bought') {
    buying = '';
    grant(ev.id.slice(PID.length), ev.tx, ev.at);
    sfx('done');
    buzz('success');
    banner('<b>Thank you</b><small>' + product(ev.id.slice(PID.length)).name + '</small>', 0, true);
  } else if (ev.t === 'failed') {
    buying = '';
    if (ev.why !== 'cancel') banner('<b>Purchase not completed.</b>', 0);
  } else if (ev.t === 'privacy') $('m-priv').hidden = !ev.required;
  else if (ev.t === 'ad') adEvent(ev);
  else if (ev.t === 'radio' || ev.t === 'other') radioEvent(ev);
  if (!$('shop').hidden) paintShop();
}

function wireShop() {
  $('gems').addEventListener('click', openShop);
  $('b-shop').addEventListener('click', openShop);
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
      banner('<b>No reward</b><small>' + (ev.state === 'failed' ? 'No ad was available.' : 'The ad was not finished.') + '</small>', 0);
    }, ev.state === 'failed' ? 0 : 1500);
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
  } else if (k === 'rush') {
    if (callRush(true)) $('boost').hidden = true;
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
    ['gems', 'ui_gem', 'Free gems', AD_GEMS + ' gems'], ['rush', 'ui_bolt', 'Call a rush', 'Skips the wait']];
  var html = '<p class="small">Free, and a few a day:</p>';
  rows.forEach(function (r) {
    var left = adLeft(r[0]);
    var off = !canWatch(r[0]) || (r[0] === 'warp' && weak) || (r[0] === 'rush' && (rush || S.call <= 0));
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
