// Purchases and ads. The native app takes {cmd: 'products', ids}, {cmd: 'buy', id}, {cmd: 'restore'}, {cmd: 'sync'}, {cmd: 'adStart'}, {cmd: 'adStop'},
// {cmd: 'adReady'}, {cmd: 'ad', kind}, {cmd: 'privacy'} and {cmd: 'music', check} on window.webkit.messageHandlers.store and
// answers through window.nativeStore(ev), ev being one of
//   {t: 'products', list: [{id, price, amount, currency}]}   the products the store knows, price already in the player's currency
//   {t: 'owned', ids, tx, user, restore, sync}   one-time products the player owns, and tx: [{id, tx, at}] for everything
//                                          bought the store knows (at is ms since 1970), user the RevenueCat user the
//                                          list belongs to; sync is true for the answer to 'sync'; answers 'products',
//                                          'restore' and 'sync'
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
//   {t: 'cloud', json, at, dev, stamp, refused?, put?, more?}   a save another device shares (json is null when there is none), written
//                                          at server time at by device dev under stamp, a string the writer made up. Answers
//                                          {cmd: 'cloudGet', dev} and comes again when another device changes it (iPhone). The iPhone
//                                          keeps a key per device and sends every other device's copy, more being true on all but the
//                                          last; Android has one saved game and sends it alone. refused is true when it answers a
//                                          {cmd: 'cloudPut'} that was not written because the cloud holds another stamp than the put's
//                                          base (Android only); put is then the stamp of that put. Like 'time' it skips the queue; the
//                                          page judges every copy whenever it comes, so nothing about its age is promised
//   {t: 'cloudState', state}               'available', 'signedOut', 'pending' (iPhone: iCloud has not delivered anything yet) or
//                                          'unavailable' (Play Games cannot be reached: no copy comes with it); answers
//                                          {cmd: 'cloudState', dev}, skips the queue
//   {t: 'cloudPut', ok, stamp}             the put with this stamp was written (ok true) or could not be (ok false: Android not signed in or
//                                          a failed write; the iPhone always writes to its own key, which iCloud syncs when it can);
//                                          skips the queue. The page sends {cmd: 'cloudPut', json, at, dev, stamp, base, force}: base is
//                                          the stamp of the copy the game last agreed with, and on Android, unless force is true (erasing),
//                                          the native side writes only while the cloud still holds that stamp, else it refuses. An erase
//                                          keeps force until a forced put has landed. The iPhone never refuses: no other device writes
//                                          its key
//   {cmd: 'cloudSignIn'}                   Android: opens Play Games sign-in, then answers cloudState and cloud
// Every copy carries hold {dev, at}: the device that claimed the game and the server time it did so, at launch, on coming back
// and on Play here. A device that sees a later claim than its own stops and shows the taken-over card; one with no claim puts nothing.
// A device that was taken over keeps its game as it was and puts nothing; what it credited meanwhile reaches the cloud when the player
// comes back to it (return or Play here judges the newest copy, and the claim put sends this device's ledger).
//   {t: 'notify', state}                   'granted' or 'denied', answering the notify handler's {cmd: 'ask'} and sent again on every return to the app; the page also asks once at start with {cmd: 'state'} when the prompt was requested on this install (nothing is sent before that); the menu's Reminders row notes a denial
//   {cmd: 'review'}                        asks for the system review prompt, once per install after the second store opens; no answer
//   {t: 'other', on}                       whether another app is playing music (answers the 'music' check, and comes by itself
//                                          when it starts or stops); the page keeps its music and the store murmur quiet
//                                          while it is, and waits for the answer after coming to the front;
//                                          {t: 'other', recheck: true} (Android) asks the page to look again, since a second
//                                          media stream appeared while the game was sounding
// 'adStart' ({mute}) runs the consent step and starts the ads SDK (not sent after Skip ads; 'adStop' ends them), 'adReady' is answered
// with a 'ready' or 'none' for each kind, 'ad' ({kind, mute}) shows one, muted when the game's sound is off, and 'privacy' opens the consent SDK's options form.
// 'music' is {check: true}, to ask for an 'other' answer.
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
var CLOUD_POLL = 45000;
var cloudState = '';
var cloudAnswered = false;
var cloudLive = '';
var cloudFind = null;
var cloudFound = [];
var cloudMore = false;
var cloudTimer = 0;
var cloudLate = 0;
var cloudTaken = false;
var cloudShown = false;
var cloudPend = [];
var cloudRet = null;
var cloudAt = -CLOUD_EVERY;
var lastTouch = -60000;
// one device plays at a time: claim is what this device holds (null before it has claimed, and when another device took over),
// claimNeeded is set until the claim is made, claimDue until it is put, cloudOff while the taken-over card is up
var claim = null;
var claimNeeded = false;
var claimDue = false;
var cloudOff = false;
// a purchase credited while a put was in flight waits for its answer
var nowDue = false;
var forcedLost = null;
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
  else cloudApply();
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

// one put at a time: its answer moves the base the next one is checked against. A put is only sent for a game that
// differs from the copy it last agreed with, so an open game that only earns cash writes nothing
function cloudPut(erase) {
  clearTimeout(cloudTimer);
  cloudTimer = 0;
  // the time is stamped on the copy, so nothing is put while it is unknown; a device that was taken over puts nothing
  if (!native() || !loaded || blocked || timeHeld || !claim) return;
  var cl = S.cl;
  // a put of an earlier page whose answer never came does not count: it must not keep the claim and every later put back
  if (erase !== true && cl.fly && cl.fly.stamp === cloudLive) return;
  nowDue = false;
  var sig = cloudSig(S);
  if (erase !== true && !cl.force && !claimDue && sig === cl.sig) return;
  // an erase stays forced until a forced put has landed
  var force = erase === true || !!cl.force;
  var stamp = devId() + ':' + stampNext();
  cl.fly = { stamp: stamp, sig: sig, ap: S.ads.ap, force: force ? 1 : 0, claim: claimDue };
  cloudLive = stamp;
  cloudAt = performance.now();
  // the claim goes with the first put after it, which also lifts the taken-over card
  if (claim) {
    claimDue = false;
    $('taken').hidden = true;
    S.hold = { dev: claim.dev, at: claim.at };
  }
  post({ cmd: 'cloudPut', json: saved(), at: Math.round(clock()), dev: devId(), stamp: stamp, base: cl.base, force: force });
  save();
}

// a counter that outlives the save, so an erased game never reuses a stamp another device may still hold as its base
function stampNext() {
  var n = 0;
  try {
    n = (+localStorage.getItem('mainstreet.stamp') || 0) + 1;
    localStorage.setItem('mainstreet.stamp', n);
  } catch (e) {}
  return n || Date.now();
}

// the native side answers a put: written, or not written (a failed one is sent again with the next change or hide).
// One that was refused comes back as a 'cloud' event instead
function cloudAck(ev) {
  var f = S.cl.fly;
  if (!f || f.stamp !== ev.stamp) {
    // a forced put that a takeover dropped still ended the erase if it landed
    if (ev.ok && forcedLost && forcedLost.stamp === ev.stamp) {
      agree(forcedLost.stamp, forcedLost.sig, forcedLost.ap);
      forcedLost = null;
      save();
    }
    return;
  }
  S.cl.fly = null;
  if (ev.ok) {
    agree(f.stamp, f.sig, f.ap);
  } else if (f.claim) claimDue = true;
  save();
  if (ev.ok && (claimDue || nowDue)) cloudNow();
}

// a purchase that was credited goes out at once, or once the put in flight is answered
function cloudNow() {
  nowDue = true;
  if (claim) cloudPut();
}

function cloudClaim() {
  claim = { dev: devId(), at: Math.round(clock()) };
  claimDue = true;
  S.hold = { dev: claim.dev, at: claim.at };
  cloudPut();
}

// the claim is made once the cloud has answered and the time is known, so a copy that came first was judged first
function cloudMaybeClaim() {
  if (!claimNeeded || timeHeld || cloudHeld() || cloudFind || document.hidden) return;
  claimNeeded = false;
  cloudClaim();
}

// who holds the game in a copy; a hold with no time is none
function copyHold(ev) {
  try {
    var h = JSON.parse(ev.json).hold;
    if (h && typeof h.dev === 'string' && h.at > 0) return h;
  } catch (e) {}
  return { dev: '', at: 0 };
}

// another device claimed after this one: this one stops and shows the card, and its game is left as it is
function cloudLost() {
  claim = null;
  claimDue = false;
  cloudOff = true;
  // a put that never got its answer must not keep Play here's claim from going out
  forcedLost = S.cl.fly && S.cl.fly.force ? S.cl.fly : null;
  S.cl.fly = null;
  clearTimeout(cloudTimer);
  cloudTimer = 0;
  $('taken').hidden = false;
}

function cloudHere() {
  cloudBack();
}

// the device id goes with every read: the iPhone keeps one key per device and leaves out this device's own
function cloudAsk() {
  post({ cmd: 'cloudGet', dev: devId() });
}

function cloudSoon() {
  if (!cloudTimer && native() && loaded) cloudTimer = setTimeout(cloudPut, Math.max(0, cloudAt + CLOUD_EVERY - performance.now()));
}

function cloudMenu() {
  $('m-cloud').hidden = !(/Android/i.test(navigator.userAgent) && (cloudState === 'signedOut' || cloudState === 'unavailable'));
}

// runs done(true) when the cloud's save became this device's first one. With a save here the game waits for the first
// answer, as on return, and a copy that comes later is judged whenever it comes
function cloudLook(done) {
  if (!native()) return done(false);
  // Play Games has no change push; iCloud's push is the iPhone's way to learn of another device
  if (/Android/i.test(navigator.userAgent)) setInterval(cloudPoll, CLOUD_POLL);
  claimNeeded = true;
  post({ cmd: 'cloudState', dev: devId() });
  cloudAsk();
  if (hasSave()) {
    cloudAt = performance.now();
    cloudRet = { got: false, run: null, t: setTimeout(cloudGot, CLOUD_BACK) };
    return done(false);
  }
  cloudFind = done;
  cloudAt = performance.now();
  $('find').hidden = false;
  cloudLate = setTimeout(cloudEnd, CLOUD_WAIT);
}

// the cloud is read again every few seconds on Android; a put that never got an answer is given up
function cloudPoll() {
  if (!loaded || document.hidden || timeHeld || cloudOff) return;
  if (S.cl.fly && performance.now() - cloudAt > 60000) {
    if (S.cl.fly.claim) claimDue = true;
    S.cl.fly = null;
  }
  cloudAsk();
}

// the play in a copy, for choosing among several
function copyPlay(ev) {
  try {
    return JSON.parse(ev.json).ads.ap || 0;
  } catch (e) {
    return 0;
  }
}

// the first game is the copy with the most play (the later one on a tie); the others are judged once it is loaded
function cloudEnd() {
  if (!cloudFind) return;
  clearTimeout(cloudLate);
  $('find').hidden = true;
  var done = cloudFind;
  var list = cloudFound;
  var best = null;
  list.forEach(function (e) {
    if (!best || copyPlay(e) > copyPlay(best) || (copyPlay(e) === copyPlay(best) && e.at > best.at)) best = e;
  });
  cloudFind = null;
  cloudFound = [];
  done(!!best && cloudSeed(best.json, best.stamp));
  if (best && loaded) cloudSeen(best);
  list.forEach(function (e) {
    if (e === best) return;
    e.more = false;
    cloudEvent(e);
  });
  cloudMaybeClaim();
}

// a copy meets this game; if it replaced it the screen shows it, or waits for the launch reveal while the models load
function cloudTake(ev) {
  // a game that was taken over stays as it was, also against copies that waited for the time
  if (cloudOff) return;
  var h = copyHold(ev);
  if (claim && h.dev !== devId() && (h.at > claim.at || (h.at === claim.at && h.dev > claim.dev))) return cloudLost();
  // a put of an earlier page that is not this copy did not land
  if (S.cl.fly && S.cl.fly.stamp !== cloudLive && S.cl.fly.stamp !== ev.stamp) S.cl.fly = null;
  // iCloud sends every other device's key again with each read: a copy judged once is not judged again
  if (!ev.refused && ev.dev && ev.stamp && S.cl.seen[ev.dev] === ev.stamp) return;
  // a claim put still in flight is not this game's any more once a copy replaces it: the claim goes out again
  var fc = S.cl.fly && S.cl.fly.claim;
  var took = takeCloud(ev.json, ev.stamp, !!ev.refused);
  if (took && fc) claimDue = true;
  cloudSeen(ev);
  if (blocked) return loadFail(tl('save.newer'), true);
  // Skip ads can arrive in a game that was kept, too
  if (S.iap.noads) post({ cmd: 'adStop' });
  // a game kept over a refused put goes out at once: the other device keeps writing on its own base, and waiting would
  // get this one refused again every round
  if (ev.refused && claim && (!took || claimDue)) cloudPut();
  else cloudSoon();
  if (!took) return;
  $('away').hidden = true;
  if (View.ready()) {
    cloudShown = true;
    afterLoad();
    showAway(cloudAway);
    banner('<b>' + tl('cloud.loaded') + '</b><small>' + tl('cloud.loaded_note') + '</small>', 0);
  } else cloudTaken = true;
}

function cloudSeen(ev) {
  if (!ev.dev || !ev.stamp || ev.dev === devId()) return;
  var m = S.cl.seen;
  delete m[ev.dev];
  m[ev.dev] = ev.stamp;
  var k = Object.keys(m);
  while (k.length > 8) delete m[k.shift()];
}

// on return the cloud is asked again, and the return waits for its answer (at most CLOUD_BACK) so another device's copy is
// taken before this one plays on
function cloudBack() {
  if (!native()) return;
  // iCloud answers a read from its local copy at once and brings other devices' changes later, and it cannot refuse a write,
  // so the first put waits for them
  cloudAt = performance.now();
  // coming back claims the game again, once what the cloud holds has been judged, also for a game that was taken over
  cloudOff = false;
  claim = null;
  claimNeeded = true;
  // a return still waiting for the cloud stays pending when this one restarts the wait
  var run = cloudRet && !cloudRet.got ? cloudRet.run : null;
  if (cloudRet) clearTimeout(cloudRet.t);
  cloudRet = { got: false, run: run, t: setTimeout(cloudGot, CLOUD_BACK) };
  cloudAsk();
}

// the game stands still while the return waits for the cloud
function cloudHeld() {
  return cloudOff || (!!cloudRet && !cloudRet.got);
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
  cloudMaybeClaim();
}

function cloudAfter(fn) {
  var r = cloudRet;
  if (!r || r.got) {
    cloudRet = null;
    fn();
  } else r.run = fn;
}

// the copy that came while the server time was unknown, taken now that it is known
function cloudApply() {
  var list = cloudPend;
  cloudPend = [];
  list.forEach(cloudTake);
  cloudMaybeClaim();
}

function cloudEvent(ev) {
  if (ev.t === 'cloudState') {
    cloudState = ev.state;
    cloudMenu();
    // a put that failed while signed out goes again; with no cloud to read, nothing is coming to wait for
    if (ev.state === 'available') cloudSoon();
    else if (ev.state === 'signedOut' || ev.state === 'unavailable') cloudGot();
  } else {
    cloudAnswered = true;
    cloudMore = !!ev.more;
    // a refused put did not land: the copy that came with the refusal is what the cloud holds now
    if (loaded && ev.refused && S.cl.fly && ev.put === S.cl.fly.stamp) {
      // the claim did not land with it
      if (S.cl.fly.claim) claimDue = true;
      S.cl.fly = null;
    }
    if (cloudFind) {
      // a device's newer copy replaces its older one
      if (ev.json) cloudFound = cloudFound.filter(function (e) { return e.dev !== ev.dev; }).concat([ev]);
    } else if (ev.json && loaded && !cloudOff) {
      // only while the server time is unknown does a copy wait
      if (timeHeld) cloudPend.push(ev);
      else cloudTake(ev);
    }
    if (!ev.more) cloudGot();
  }
  if (cloudFind && !cloudMore && (cloudFound.length || (cloudState && cloudState !== 'pending' && (cloudAnswered || cloudState !== 'available')))) cloudEnd();
}

function product(id) {
  for (var i = 0; i < PRODUCTS.length; i++) if (PRODUCTS[i].id === id) return PRODUCTS[i];
  return null;
}

// a one-time product is flagged when the store says the player owns it
function own(id, tx, fresh) {
  var p = product(id);
  if (!p || !p.once) return false;
  // the newest transaction listed wins, kept with the RevenueCat user that listed it
  if (tx && lastUser) {
    S.iap[id + 'Tx'] = tx;
    S.iap[id + 'User'] = lastUser;
  }
  // a purchase or a restore is a new grant: a refund seen before it no longer counts against it, on any device
  if (fresh || !S.iap[id]) S.iap[id + 'At'] = Math.round(clock());
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

var bonusGot = 0;

// a consumable pays once per transaction id, even if the store reports it again, and whenever it happened
function credit(p, tx, at) {
  if (seen(tx)) return false;
  note(tx);
  var ask = S.iap.wait[p.id] || 0;
  delete S.iap.wait[p.id];
  var e = { tx: tx, id: p.id, at: clock(), gems: p.gems || 0, x2: 0, rep: 0, deal: 0, ask: ask };
  if (p.id === 'starter1') {
    S.iap.starter = 1;
    e = { tx: tx, id: p.id, at: clock(), gems: STARTER.gems, x2: STARTER.x2, rep: STARTER.rep, deal: 0, ask: ask };
  }
  S.gems += e.gems;
  S.x2 += e.x2;
  S.rep += e.rep;
  // what was paid for stays with the game wherever it goes: a copy that meets this one takes the entries it lacks
  S.iap.paid = S.iap.paid.concat([e]).slice(-100);
  // the deal's bonus is part of the credit, so it is in the ledger entry before the purchase goes to the cloud
  bonusGot = p.gems ? dealBonus(p.id, at, tx) : 0;
  return true;
}

function grant(id, tx, at) {
  var p = product(id);
  if (!p) return false;
  bonusGot = 0;
  var done = p.once ? own(id, tx, true) : credit(p, tx, at);
  if (done) {
    save();
    cloudNow();
  }
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
    } else if (clock() - t.at >= -TIME_SKEW && clock() - t.at < RECOVER * 1000 && credit(p, t.tx, t.at)) n += p.gems + bonusGot;
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
// from the RevenueCat user that listed the transaction counts, since another user has a different list. A restore on
// another device moves the purchase to its user and empties this one's list, so a plain answer only raises a doubt: the
// store is asked to sync, and the flag goes only if that answer still does not list the purchase. A sync, unlike a restore,
// is meant to run without the player and never opens a sign-in sheet
var refundDoubt = {};
function refunds(ev) {
  if (!Array.isArray(ev.tx) || !ev.user) return;
  ['noads', 'x2'].forEach(function (id) {
    var t = S.iap[id + 'Tx'];
    if (!S.iap[id] || !t || S.iap[id + 'User'] !== ev.user || (ev.ids || []).indexOf(PID + id) >= 0 || ev.tx.some(function (x) { return x.tx === t; })) return;
    if (!ev.restore && !ev.sync) {
      if (!refundDoubt[id]) {
        refundDoubt[id] = 1;
        post({ cmd: 'sync' });
      }
      return;
    }
    S.iap[id] = 0;
    // transaction, user and time: a purchase that moved to another RevenueCat user (a restore) is not refunded
    S.iap.rf = joinTx(S.iap.rf, [t + ' ' + ev.user + ' ' + Math.round(clock())]);
    S.iap[id + 'Tx'] = '';
    S.iap[id + 'User'] = '';
    S.iap[id + 'At'] = 0;
    if (id === 'noads') {
      adOn = false;
      if (S.ads.pt >= AD_START) adBegin();
    }
  });
}

// the bonus of the deal the player tapped, paid once to the purchase it was tapped for
function dealBonus(id, at, tx) {
  var key = S.iap.deal && S.iap.deal.id === id ? 'deal' : 'held';
  var d = S.iap[key];
  if (!d || d.id !== id || at > d.until || at > clock() + TIME_SKEW) return 0;
  S.iap[key] = null;
  S.gems += d.bonus;
  S.iap.paid.forEach(function (e) {
    if (e.tx === tx) {
      e.gems += d.bonus;
      e.deal = d.at;
    }
  });
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

// an answer for a product that is not the one in flight leaves that purchase alone
function buyDone(id) {
  if (id && buying && buying !== id) return;
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
  // the deal is fixed when the player taps, so a day change during the purchase does not lose it. Tapping another
  // pack keeps an earlier deal whose answer is still to come
  if (d && d.id === id) {
    var o = S.iap.deal;
    if (o && o.id !== id && o.until > clock() && !(S.iap.held && S.iap.held.until > clock())) S.iap.held = o;
    S.iap.deal = { id: id, bonus: d.bonus, until: clock() + 3600000, at: clock() };
  }
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
  $('taken-play').addEventListener('click', cloudHere);
  $('m-signin').addEventListener('click', function () { post({ cmd: 'cloudSignIn' }); });
  queued.splice(0).forEach(handle);
  askOther();
  if (remindAsked() === '1') tell({ cmd: 'state' });
  askProducts();
  document.addEventListener('visibilitychange', function () { if (!document.hidden) askAgain(); });
  if (S.iap.noads) post({ cmd: 'adStop' });
  if (S.ads.pt >= AD_START) adBegin();
  $('b-shop').hidden = false;
  // play time counts only while the game is in front, and active play only with a touch in the last minute
  document.addEventListener('pointerdown', function () { lastTouch = performance.now(); }, true);
  setInterval(playTick, 1000);
}

// not counted while the game stands still: taken over, waiting for the time or for the cloud
function playTick() {
  if (document.hidden || timeHeld || cloudHeld()) return;
  if (performance.now() - lastTouch < 60000) S.ads.ap++;
  S.ads.pt++;
  if (S.ads.pt >= AD_START) adBegin();
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
  else if (ev.t === 'cloudPut') cloudAck(ev);
  else if (ev.t === 'cloud' || ev.t === 'cloudState') cloudEvent(ev);
  else if (loaded) handle(ev);
  else queued.push(ev);
};

function handle(ev) {
  if (ev.t === 'notify') return notifyState(ev.state);
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
    (ev.ids || []).forEach(function (id) { own(id.slice(PID.length), txOf(ev.tx, id), !!ev.restore); });
    refunds(ev);
    var back = recover(ev.tx);
    if (back) banner('<b>' + tl('shop.recovered', { n: back, count: short(back) }) + '</b><small>' + tl('shop.recovered_note') + '</small>', 0);
    if (ev.restore) banner('<b>' + tl(S.iap.noads + S.iap.x2 + S.iap.starter > restoreWas ? 'shop.restored' : 'shop.nothing_to_restore') + '</b>', 0);
    save();
    cloudNow();
  } else if (ev.t === 'bought') {
    var bid = ev.id.slice(PID.length);
    buyDone(bid);
    var extra = grant(bid, ev.tx, ev.at) ? bonusGot : 0;
    sfx('done');
    buzz('success');
    banner('<b>' + tl('shop.thanks') + '</b><small>' + (extra ? tl('shop.thanks_bonus', { name: product(bid).name, n: extra }) : product(bid).name) + '</small>', 0, true);
  } else if (ev.t === 'pending') {
    var wid = ev.id.slice(PID.length);
    buyDone(wid);
    S.iap.wait[wid] = clock() + ASK_WAIT * 1000;
    // a held deal is kept apart, so the deal of another day can still be tapped meanwhile
    if (S.iap.deal && S.iap.deal.id === wid) {
      if (S.iap.held && S.iap.held.until > clock()) S.iap.deal.until = S.iap.wait[wid];
      else {
        S.iap.held = S.iap.deal;
        S.iap.held.until = S.iap.wait[wid];
        S.iap.deal = null;
      }
    }
    save();
    banner('<b>' + tl('shop.pending') + '</b><small>' + tl('shop.pending_note') + '</small>', 0);
  } else if (ev.t === 'restoreFailed') {
    banner('<b>' + tl('shop.restore_failed') + '</b>', 0);
  } else if (ev.t === 'failed') {
    buyDone(ev.id.slice(PID.length));
    if (ev.why !== 'late' && S.iap.deal && S.iap.deal.id === ev.id.slice(PID.length)) S.iap.deal = null;
    if (ev.why === 'late') banner('<b>' + tl('shop.late') + '</b><small>' + tl('shop.late_note') + '</small>', 0);
    else if (ev.why !== 'cancel') banner('<b>' + tl('shop.failed') + '</b>', 0);
  } else if (ev.t === 'adId') testAdId(ev.id);
  else if (ev.t === 'privacy') $('m-priv').hidden = !ev.required;
  else if (ev.t === 'ad') adEvent(ev);
  else if (ev.t === 'other') musicEvent(ev);
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
    musicSync();
    if (ac) ac.suspend();
  } else if (ev.state === 'rewarded' && watching) {
    var w = watching;
    watching = null;
    adUsed()[w.k] = (adUsed()[w.k] || 0) + 1;
    w.give();
    save();
  } else if (ev.state === 'closed' || ev.state === 'failed') {
    adOpen = false;
    musicSync();
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
