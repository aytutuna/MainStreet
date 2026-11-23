// Purchases. The native app takes {cmd: 'products' | 'buy' | 'restore', id} on window.webkit.messageHandlers.store and
// answers through window.nativeStore(ev), ev being one of
//   {t: 'products', list: [{id, price}]}   the products the store knows, price already in the player's currency
//   {t: 'owned', ids: [id], restore}       one-time products the player owns; answers 'products' and 'restore'
//   {t: 'bought', id, tx}                  a purchase went through; tx is the store's transaction id
//   {t: 'failed', id, why}                 why is 'cancel' or 'error'
// Ids are the full store ids. In a plain browser there is no store handler and nothing here shows.
var PID = 'com.aytutuna.mainstreet.';
var prices = {};
var storeUp = false;
var buying = '';

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
  post({ cmd: 'products' });
  $('b-shop').hidden = false;
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
  }
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
}
