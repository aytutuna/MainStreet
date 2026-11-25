// English text of Main Street Idle, the source for every translation. See GLOSSARY.md next to this file for terms and tone.
//
// Format. A language file lang/<code>.js is a plain script that sets LANG["<code>"] to an object of key: text. Copy this file,
// keep every key exactly as it is, and translate only the text on the right. The codes are in LANGS in i18n.js.
//   * {name} marks are filled in by the game. Keep them exactly as written, move them where the grammar wants them, never translate
//     the word inside the braces.
//   * A value written as { one: '...', other: '...' } is a plural. Give one text for every plural category your language uses
//     (CLDR: zero, one, two, few, many, other); English only needs one and other. {n} is the number.
//   * A note above an entry (a // comment) is for translators: where the text shows up, what the words mean, and how long it may be.
//   * Keep an apostrophe in a text as \' or use the real one. Text that has <b>...</b> keeps the tags.
//   * Leave a key out (or the text empty) to show the English text for it. node scripts/check_lang.mjs <code> lists what is missing.
// Name of the game and brand names stay as they are unless the note says otherwise.

LANG['en'] = {
  // The name of the game, shown on the loading screen and as the page title. A brand: keep "Main Street" unless the language has an established local brand name.
  'app.title': 'Main Street',
  // Screen reader name of the star pill at the top. Opens the screen where the player moves to a new store (building) for reputation.
  'hud.new_store.aria': 'New store',
  // Screen reader name of the three-line menu button.
  'hud.menu.aria': 'Menu',
  // Screen reader name of the dots that switch between the shown goals.
  'hud.next_goal.aria': 'Next goal',
  // Screen reader name of the lightning button that calls a rush (a burst of shoppers).
  'hud.call_rush.aria': 'Call a rush',
  // Screen reader name of the music note button (opens the radio).
  'hud.radio.aria': 'Radio',
  // Screen reader name of the gift button that opens the one-time starter pack offer.
  'hud.starter.aria': 'Starter pack',
  // Screen reader name of the button for the daily discounted gem pack.
  'hud.deal.aria': 'Gem deal',
  // Screen reader name of the button that offers gems for watching an ad.
  'hud.free_gems.aria': 'Free gems',
  // Screen reader name of the button that offers doubled income.
  'hud.x2.aria': 'Double income',
  // Tiny badge under the gem deal button: the deal is for today only. Max about 8 characters.
  'hud.deal.today': 'Today',
  // Tiny badge under the free gems button. Max about 8 characters.
  'hud.free': 'Free',
  // Tiny badge under the double income button: income times two. Max about 6 characters.
  'hud.x2_badge': 'x2',
  // Bottom tab and title of the list where the player buys departments and upgrades. Max about 11 characters on the tab.
  'tab.upgrades': 'Upgrades',
  // Bottom tab: temporary helpers such as double income and time warp. Max about 11 characters.
  'tab.boosts': 'Boosts',
  // Bottom tab: daily missions and the daily reward. Max about 11 characters.
  'tab.daily': 'Daily',
  // Bottom tab: move to a new, bigger store (a prestige reset; the player keeps reputation and perks). "Store" is the whole building, not a shop item. Max about 11 characters.
  'tab.new_store': 'New store',
  // Bottom tab: statistics. Max about 11 characters.
  'tab.stats': 'Stats',
  // Title of the box shown when the player returns after being away; it reports what the store earned meanwhile.
  'away.title': 'While you were away',
  // Button that takes the money the store earned.
  'common.collect': 'Collect',
  // Heading above today's three small missions (they renew every day).
  'daily.today': 'Today',
  // Heading of the daily login reward: seven days in a row, each pays more.
  'daily.title': 'Daily reward',
  // Button that takes a reward.
  'common.claim': 'Claim',
  // Title of the box with temporary helpers the player can buy with gems or by watching an ad.
  'boost.title': 'Boosts',
  // Boost name: all income is doubled for a while.
  'boost.x2.title': 'Double income',
  // Boost name: instantly gives the income of the next hour.
  'boost.warp.title': 'Time warp',
  // Boost name: the manager calls a rush, a burst of extra shoppers for a short time.
  'boost.call.title': 'Call a rush',
  // Boost name: Regulars are named shoppers who come back and raise sales.
  'boost.regs.title': 'Regulars',
  // Button that opens the list of regulars (meet them). Max about 8 characters.
  'boost.regs.btn': 'Meet',
  // Button that opens the shop. Max about 10 characters.
  'boost.shop': 'Shop',
  // Small note under the boosts. Gems are the premium currency.
  'boost.gems_note': 'Gems come from goals, stars, gifts and the daily reward.',
  // Title of the box listing regulars (named shoppers who come back to the store).
  'regs.title': 'Regulars',
  // Title of the shop box (gems and offers bought with real money).
  'shop.title': 'Shop',
  // Button that restores earlier purchases (store requirement).
  'shop.restore': 'Restore purchases',
  // Title of the one-time starter offer.
  'pack.title': 'Starter pack',
  // Button that dismisses an offer without buying.
  'common.not_now': 'Not now',
  // Small note under the starter offer. {n} is the number of hours it lasts.
  'pack.limit': 'Only offered for the first {n} hours.',
  // Button that opens the choice of how the store looks (colours, signs). Max about 14 characters.
  'sell.look': 'Store look',
  // Heading of the list of perks: permanent bonuses bought with reputation.
  'sell.perks': 'Perks',
  // Title of the statistics box.
  'stats.title': 'Stats',
  // Meter name: how many shoppers come in.
  'stats.shoppers': 'Shoppers',
  // Meter name: the checkout lanes (tills).
  'stats.checkouts': 'Checkouts',
  // Meter name: how full the shelves are kept by stockers.
  'stats.shelves': 'Shelves',
  // Button next to the Shoppers meter: opens the place to get more shoppers. Max about 14 characters.
  'stats.fix.in': 'Bring more',
  // Button next to the Checkouts meter: opens the checkout upgrades. Max about 14 characters.
  'stats.fix.tills': 'Add lanes',
  // Button next to the Shelves meter: opens the stockroom upgrades (stockers carry boxes to the shelves). Max about 14 characters.
  'stats.fix.shelf': 'Hire stockers',
  // Heading: how much one shopper spends in each department. Read as "Spent per shopper".
  'stats.spent': 'Spent a shopper',
  // Shown when no department is open yet.
  'stats.none': 'Nothing is on sale yet.',
  // Title of the sound mixer box.
  'sound.title': 'Sound',
  // Slider label: the radio music volume.
  'sound.music': 'Music',
  // Slider label: the background sounds of the shopping mall (shoppers, hum).
  'sound.store': 'Store sounds',
  // Slider label: short sound effects (taps, tills, chimes).
  'sound.effects': 'Effects',
  // Small explanation under the three sliders.
  'sound.note': 'Music is the radio. Store sounds are the shoppers and the hum of the mall. Effects are the taps, tills and chimes.',
  // Shown when sound is switched off in the menu.
  'sound.off_note': 'Sound is off. Turn it on in the menu.',
  // Title of the menu box.
  'menu.title': 'Menu',
  // Menu button that opens the volume sliders. Also used in the radio box.
  'menu.mixer': 'Sound mixer',
  // Menu button that opens the radio (internet radio stations and the game's own music).
  'menu.radio': 'Radio',
  // Menu button that opens the choice of how the store looks.
  'menu.look': 'Store look',
  // Menu button that opens the list of achievements (long-term goals that pay gems).
  'menu.achievements': 'Achievements',
  // Menu button that reopens the privacy/ads consent form. Shown only in some regions.
  'menu.privacy': 'Privacy choices',
  'menu.policy': 'Privacy policy',
  'menu.support': 'Support',
  'menu.version': 'Version {v} ({b})',
  // Credits. Translate only the labels (Models, Sounds, Store models, ...) and the connecting words; keep every name, company, URL and the <br> tags exactly.
  'menu.credits': 'Models: Kenney (www.kenney.nl)<br>Sounds: Kenney; recordings by Membrans, G4F SFX, The Chris Alan, Gamemaster Audio, SoundBits, 3maze, Mechanical Wave, Shapeforms, Airborne Sound, Soundrangers, SmartSoundFX, Kpow Sounds and Creative Audio Pool, from the Sonniss GameAudioGDC bundles<br>Store models: Pipework packs<br>Pizza props: Vira Voloshyn<br>Tools: mekmeesk<br>Nature: Kay Lousberg (KayKit, www.kaylousberg.com), Quaternius, Elijah Cobden<br>Icons: LimeZu (https://limezu.itch.io/)<br>Font: Lilita One by Juan Montoreano (SIL Open Font License)<br>3D: three.js (threejs.org)',
  // Music and radio credits. Translate only the label words ("Music, from Pixabay:", "by") and the last sentence; keep every title, artist name and the <br> tags exactly.
  'menu.credits_music': 'Music, from Pixabay: Positive Easy Listening by 331music; Feel Good - Feel Good Music by STAROSTIN; Upbeat - Upbeat Music by ViacheslavStarostin; Happy - Happy Music by kulishov; Pop Light by 331music; Shopping - Shopping Music by iepmusic; Summer Pop by Caldena; Ukulele Circus Funk by 51604229; Cheerful - Cheerful Music by JonasBlakewood; Indie Pop by AtlasAudio; Fun Jazz Background by 51604229; Country Pop by Music_for_Creators<br>Radio streams are provided by the stations; station names belong to their owners.',
  // Title of the radio box.
  'radio.title': 'Radio',
  // Slider label in the radio box.
  'radio.volume': 'Music volume',
  // Small note in the radio box.
  'radio.note': 'Stations play over the internet and only while the game is open.',
  // Title of the achievements box.
  'ach.title': 'Achievements',
  // Title of the box where the player picks how the store looks (colours of floors, walls and signs).
  'look.title': 'Store look',

  // Menu button that opens the list of languages. {name} is the current language written in its own language (already translated by the list), so keep it as is.
  'menu.language': 'Language: {name}',
  // Title of the box with the list of languages. Each language in the list is shown in its own name; they are not translated.
  'lang.title': 'Language',

  // The game's fictional dollars. {n} is the short amount, such as 1.5K or 2.3M. Put the currency sign where the language writes it; it is not real money.
  'num.money': '${n}',

  // Shared small words and units
  'common.locked': 'Locked',
  'common.done': 'Done',
  // Button that closes a box and keeps its reward for later (the daily reward box).
  'common.later': 'Later',
  'common.close': 'Close',
  // Pure punctuation between items of a short list, such as "10 min of income, 5 gems".
  'common.list_sep': ', ',
  'common.gems': { one: '{n} gem', other: '{n} gems' },
  // A reward of gems with a plus sign, shown in pop-ups and banners.
  'common.gems_plus': { one: '+{n} gem', other: '+{n} gems' },
  // {n} is the number of gems still missing for a purchase.
  'common.need_gems': { one: 'Need {n} more gem.', other: 'Need {n} more gems.' },
  // Small mark on a day of the daily reward calendar that was already claimed. Max about 4 characters.
  'daily.done_mark': 'ok',
  // Seconds, minutes and hours, written short.
  'common.sec': '{n} s',
  'common.min': '{n} min',
  'common.h': '{n} h',
  // Hours and minutes together, such as 2 h 5 min.
  'common.h_min': '{h} h {m} min',
  // {n} is a number of minutes. A boost that doubles income.
  'common.x2_min': 'x2 for {n} min',
  'common.x2_s': 'x2 for {n} s',
  'common.income_x2_min': 'Income x2 for {n} min',
  // {a} of {b}, for example 3 of 12.
  'common.x_of_y': '{a} of {b}',
  'common.pct': '{n}%',

  // HUD
  'hud.closed': 'Closed',
  // The store is shut for the night. {t} is the time of day.
  'hud.closed_at': 'Closed · {t}',
  // Income per second in the HUD pill. {v} is money. Keep it short.
  'hud.rate': '+{v}/s',
  // {n} is the number of the store the player is in (Store 1, Store 2).
  'hud.store': 'Store {n}',
  // The income boost timer. {t} is minutes:seconds. Keep it short.
  'hud.x2': 'x2  {t}',
  // A rush is a burst of shoppers. The bus brings tourists.
  'hud.rush.bus': 'Tour bus',
  'hud.rush.flash': 'Flash sale',
  // Warning pills when a meter runs low. Keep each under 16 characters.
  'hud.warn.in': 'Few shoppers',
  'hud.warn.tills': 'Slow checkouts',
  'hud.warn.shelves': 'Low shelves',
  // {t} is one of the three warnings above. The exclamation mark goes where the language puts it.
  'hud.warn': '! {t}',
  // Shown once, under the warning, the first time a meter runs red. Stats is the name of a panel.
  'hud.warn_tip': 'Tap the warning to see Stats and fix it',
  // Shown when several upgrades are bought quickly. {n} is the count.
  'hud.combo': 'x{n} combo!',
  // Pop-up over a till when the player taps it during a rush: the shopper is served faster.
  'hud.faster': 'Faster!',
  // Pop-up over a regular customer called a VIP who leaves a tip.
  'hud.vip_tip': 'VIP tip!',
  // Hint before the first purchase.
  'hud.hint.buy': 'Tap the glowing Buy button',
  // {dept} is the name of the first department (Produce).
  'hud.hint.produce': 'Tap {dept} to buy your first stand',

  // What one more level of an item does. {v} is a number per minute.
  'fx.shoppers_min': '+{v} shoppers/min',
  'fx.restocked_min': '+{v} restocked/min',
  'fx.rest': '+{n}% spent a shopper',
  'fx.lounge': '-{n}% till and stock time',
  // {n} is a percent, {h} a number of hours the store keeps earning while the player is away.
  'fx.head': '+{n}% income, {h} h more away',
  // {v} is money earned per second.
  'fx.money_s': '+{v}/s',
  'fx.per_shopper': '+{v}/shopper',
  'fx.sales_pct': '+{n}% sales',
  'fx.stocking': '-{n}% stocking time',

  // Cards of departments and places. Lv is short for Level; {n} is the level, {max} the top level.
  'card.lv': 'Lv {n}/{max}',
  // {mul} is a multiplier such as 4 or 16.
  'card.sales_x': 'Sales x{mul}',
  // {n} is a number of levels, {star} the star that comes next, {mul} the sales multiplier it gives.
  'card.next_star': '{n} more to ★{star} · sales x{mul}',
  'card.stars_all': 'All three stars: sales here x{mul}',
  'card.star_at': 'Star {star} at level {level}: sales here x{mul}',
  // {name} is a department or place that has to be opened or built first.
  'card.open_first': 'Open {name} first',
  'card.next': 'Next: {name}',
  'card.all_built': 'Everything is built',
  'card.opens_later': 'Opens later',
  // {name} is the first product of a department.
  'card.in_basket': '{name}: in every basket',
  // Buttons on a card. Items opens the list of upgrades of a place; Build and Open are verbs.
  'card.items': 'Items',
  'card.build': 'Build',
  'card.open': 'Open',
  // {v} is money.
  'card.per_shopper': '{v} a shopper',
  // {fx} is what a place does at its current level.
  'card.now': 'Now: {fx}',
  // Checkouts: shoppers coming against what the tills can take. Both numbers are per minute.
  'card.load.tills': 'Shoppers {n}/min · tills {cap}/min',
  'card.load.restock': 'Shoppers {n}/min · restock {cap}/min',
  'card.fix.lanes': 'Add lanes or self checkouts',
  'card.fix.stockers': 'Hire stockers',

  // Banners after a purchase. Each banner has a bold title and a small line under it.
  // {name} is a department, {n} the stars it has, {mul} the sales multiplier.
  'banner.star': { one: '{name}: {n} star, sales here x{mul}', other: '{name}: {n} stars, sales here x{mul}' },
  'banner.new_dept': 'New: {name}',
  // {item} is the first product of the new department.
  'banner.new_dept.line': '{item}, now in every basket',
  // {name} is a place such as Parking, {n} its new level.
  'banner.place_level': '{name} level {n}',
  // The player moves to a new, bigger store. {n} is its number.
  'banner.store_open': 'Store {n} is open!',
  'banner.income_x': 'Income x{n}',
  // Reputation is a currency spent on perks.
  'banner.rep': '+{n} reputation',
  'banner.rep.line': 'Spend it on perks',
  'banner.goal_done': 'Goal done',
  'banner.jackpot': 'Jackpot!',
  'banner.mission_done': 'Mission done',
  // {n} is gems earned from yesterday's streak.
  'banner.yesterday': { one: 'Yesterday: +{n} gem', other: 'Yesterday: +{n} gems' },
  'banner.double_income': 'Double income',
  // {t} is the time left, minutes:seconds.
  'banner.double_income.line': 'Active for {t}',
  'banner.bus': 'Tour bus!',
  'banner.bus.line': 'A crowd is coming in. Tap the checkouts to serve faster',
  'banner.flash': 'Flash sale!',
  'banner.flash.line': 'Sale signs are up and shoppers are running in. Tap the checkouts to serve faster',
  // {v} is the extra money the rush brought.
  'banner.rush_over': 'Rush over: +{v}',
  'banner.close': 'Closing time',
  // {t} is the time of day the store opens again.
  'banner.close.line': 'Open again at {t}. The stockers keep working',
  'banner.open': 'Open!',
  'banner.open.line': 'Shoppers are coming in',

  // Goal chip button when a goal can be claimed. {n} is gems.
  'goal.claim': 'Claim +{n}',

  // Stats panel. Labels of the figures.
  'stats.income_s': 'Income a second',
  'stats.income_m': 'Income a minute',
  'stats.served_store': 'Served this store',
  'stats.served_all': 'Served in all',
  'stats.lost': 'Lost shoppers',
  'stats.earned_store': 'Earned this store',
  'stats.earned_all': 'Earned in all',
  'stats.stars': 'Stars',
  'stats.store': 'Store',
  'stats.time': 'Time played',
  'stats.gems': 'Gems',
  'stats.regulars': 'Regulars met',
  'stats.achievements': 'Achievements',
  // {v} is money.
  'stats.per_sec': '{v}/s',
  // {v} is a number or money per minute.
  'stats.per_min': '{v}/m',
  // {n} is the store number, {mul} the sales multiplier.
  'stats.store_val': '{n}, sales x{mul}',
  // A department's share of the basket. {v} is money, {pct} a percent.
  'stats.dept_share': '{v} · {pct}%',
  // Meters: why a bar is where it is. Checkouts are the tills; stockers refill shelves.
  'stats.in.low': 'Too few shoppers for the checkouts',
  'stats.in.ok': 'Enough shoppers for the checkouts',
  // Shoppers per minute by how they arrive.
  'stats.in.more': 'On foot {walk}, by car {car}, by taxi {taxi} a minute',
  'stats.tills.low': 'The checkouts are the limit',
  'stats.tills.ok': 'The checkouts keep up',
  // {cap} is what the checkouts take per minute, {come} how many shoppers come per minute.
  'stats.tills.more': 'They take {cap} a minute, shoppers come at {come}',
  'stats.shelf.low': 'The shelves are the limit',
  'stats.shelf.ok': 'The stockers keep up',
  'stats.shelf.more': 'They restock {cap} a minute, shoppers need {need}',

  // Radio panel. The radio is the in-game music player.
  'radio.mix.name': 'Main Street Mix',
  // {n} is the number of songs.
  'radio.mix.line': { one: '{n} song, shuffled', other: '{n} songs, shuffled' },
  'radio.off.name': 'Off',
  'radio.off.line': 'No music',
  // Button on the Off row when radio is off (current state).
  'radio.off.state': 'Off',
  'radio.turn_off': 'Turn off',
  // Buttons on station rows: Play starts it, On marks the station that plays now.
  'radio.play': 'Play',
  'radio.on': 'On',
  'radio.loading': 'Loading',
  'radio.resume': 'Resume',
  'radio.retry': 'Retry',
  // Full screen card shown when the game cannot reach the time server (no internet). The Retry button under it is radio.retry.
  'net.need': 'Main Street needs an internet connection to play. Connect and it carries on where you left off.',
  // {group} is the name of a country or language group of stations (see radio.group.*).
  'radio.try': 'Try the {group} stations in the menu, under Radio',
  // The line that says what is playing.
  'radio.now.other': 'Your music is playing',
  'radio.now.off': 'Radio is off',
  'radio.now.sound_off': 'Sound is off',
  'radio.now.error': 'Station unavailable',
  'radio.now.paused': '{name} (paused)',
  'radio.now.connecting': 'Connecting to {name}',
  // A radio station and the song it plays.
  'radio.now.playing': '{name} - {title}',
  // A song of the game's own mix and its artist.
  'radio.now.song': '{title} - {artist}',
  // Names of the groups of radio stations. Countries or a language area.
  'radio.group.Arabic': 'Arabic',
  'radio.group.Australia': 'Australia',
  'radio.group.Brazil': 'Brazil',
  'radio.group.Canada': 'Canada',
  'radio.group.Caribbean': 'Caribbean',
  'radio.group.China': 'China',
  'radio.group.France': 'France',
  'radio.group.Germany': 'Germany',
  'radio.group.Ghana': 'Ghana',
  'radio.group.Greece': 'Greece',
  'radio.group.India': 'India',
  'radio.group.Indonesia': 'Indonesia',
  'radio.group.Italy': 'Italy',
  'radio.group.Japan': 'Japan',
  'radio.group.Kenya': 'Kenya',
  'radio.group.Korea': 'Korea',
  // Stations from Latin America in Spanish.
  'radio.group.Latin': 'Latin',
  'radio.group.Mexico': 'Mexico',
  'radio.group.Netherlands': 'Netherlands',
  'radio.group.Nigeria': 'Nigeria',
  'radio.group.Philippines': 'Philippines',
  'radio.group.Poland': 'Poland',
  'radio.group.Russia': 'Russia',
  // Sweden, Norway and Denmark together.
  'radio.group.Scandinavia': 'Scandinavia',
  'radio.group.South Africa': 'South Africa',
  'radio.group.Spain': 'Spain',
  'radio.group.Turkey': 'Turkey',
  'radio.group.UK': 'UK',
  'radio.group.USA': 'USA',
  'radio.group.Vietnam': 'Vietnam',

  // Away box: what the store earned while the player was away. Keep the <b> tags; {v} is money.
  'away.waiting': 'Earnings from last time are still waiting: <b>{v}</b>.',
  // {time} is a duration such as 2 h 5 min. {n} is a number of shoppers.
  'away.report': {
    one: 'You were away for {time}. The store served {n} shopper and took <b>{v}</b>.',
    other: 'You were away for {time}. The store served {n} shoppers and took <b>{v}</b>.'
  },
  // Added after the sentence above, with a space between. Keep the <b> tags.
  'away.before': '<b>{v}</b> from before is still waiting.',
  // Added after the sentence above. {n} is a number of hours.
  'away.cap': 'It only earns for {n} h while you are away.',
  // Button that doubles the earnings for gems. A gem icon and its price follow the text.
  'away.double': 'Double it',

  // Daily reward and missions
  // {n} is a number of minutes of income given as a reward.
  'daily.cash_min': '{n} min of income',
  // A mission and its progress. {text} is the mission, {v} such as 3/10.
  'daily.progress': '{text} ({v})',
  'daily.all_done': 'All three done',
  'daily.all_done.line': '{gems} gems and income x2 for {min} min',
  // The bonus row for finishing all three daily missions.
  'daily.all_three': 'All three: {gems} gems, x2 {min} min',
  // Button of the bonus row until it is claimed.
  'daily.bonus': 'Bonus',
  // One tile of the seven day reward calendar.
  'daily.day': 'Day {n}',
  'daily.streak': 'Day {n} of 7. Come back every day to keep the streak.',
  'daily.claimed': 'Claimed for today. Come back tomorrow to keep the streak.',
  'daily.wait': 'Come back a little later to claim the next reward.',

  // Boost panel
  // {n} is the player's gems.
  'boost.have': { one: 'You have {n} gem.', other: 'You have {n} gems.' },
  // {t} is the time left, minutes:seconds.
  'boost.x2.active': 'Active: {t} left. Buying adds 30 min.',
  'boost.x2.idle': 'All income x2 for 30 minutes.',
  // {v} is money.
  'boost.warp.so_far': 'Get {v} now, as much as this store has earned so far.',
  'boost.warp.hour': 'Get {v} now, an hour of income.',
  'boost.warp.weak': 'Worth less than 10 minutes of income. Better later.',
  'boost.call.ready_in': 'Ready in {t}, or call one now.',
  // A rush is a burst of shoppers. {n} is minutes to wait before the next free one.
  'boost.call.brings': 'Brings a rush now. Then {n} min to wait.',
  'boost.call.rush_on': 'A rush is on.',
  'boost.call.closed': 'The store is closed.',
  // Button that calls a rush for free. Keep it short.
  'boost.call.btn': 'Call',
  // Regulars are returning customers. {a} met out of {b}, {pct} the extra sales.
  'boost.regs': '{a} of {b} met, sales +{pct}%',

  // Perks, bought with reputation. Describe what a perk gives now and at the next level.
  // {dept} is a department name, {n} a level.
  'perk.fx.open1': '{dept} {n}',
  'perk.fx.open2': '{a} {x}, {b} {y}',
  'perk.fx.off': '{n}% off',
  'perk.fx.full': 'full price',
  'perk.fx.quicker': '{n}% quicker',
  'perk.fx.normal': 'normal',
  // The store is shut at night. These two describe the perk that keeps it open. Update the hours if your language writes them differently.
  'perk.fx.night_open': 'open 24 hours',
  'perk.fx.night_closed': 'closed 11 PM – 1 AM',
  'perk.fx.base': 'base',
  // {what} is the perk's effect name, {now} the current value, {next} the value after buying.
  'perk.line.next': '{what}: {now} → {next}',
  'perk.line.max': '{what}: {now} (max)',
  // Price of a perk in reputation points. Keep it short.
  'perk.cost': '{n} rep',
  'perk.maxed': 'Maxed',

  // Sell (move to a new store) panel. Store means the player's building.
  // The word on the sign over the store, drawn in capital letters.
  'sell.sign': 'STORE',
  // Label under a fraction such as 3/5.
  'sell.stars': 'stars',
  // Keep the <b> tags. {a} departments open out of {b}.
  'sell.open_depts': 'Open <b>{a} of {b}</b> departments',
  // Keep the <b> tags. {a} and {b} are the income multipliers of this store and the next.
  'sell.income': 'Income <b>x{a} → x{b}</b>',
  'sell.ready': 'Ready to move.',
  'sell.reach': { one: 'Reach {n} star to move.', other: 'Reach {n} stars to move.' },
  // Added after the sentence above, with a space between. {n} are stars above the needed amount.
  'sell.extra': '+{n} extra',
  'sell.rep_for_move': 'rep for moving now',
  // Keep the <i> tags. Rep is short for reputation.
  'sell.rep_have': 'You have <i>{n} rep</i>. One for each star and each open department, more for a bigger store.',
  'sell.you_keep': 'You keep',
  'sell.starts_again': 'Starts again',
  'sell.keep.rep': 'Reputation and perks',
  'sell.keep.goals': 'Goals and regulars',
  'sell.keep.boosts': 'Boosts',
  'sell.lose.cash': 'Cash',
  'sell.lose.depts': 'Departments',
  // The places run from Checkouts (first) to Head Office (last).
  'sell.lose.places': 'Every place, Checkouts to Head Office',
  'sell.lose.stars': 'Stars (they pay gems again)',
  // {n} is the number of the next store.
  'sell.move': 'Move to store {n}',
  'sell.see': 'See departments',
  // The button asks for a second tap to confirm.
  'sell.tap_again': 'Tap again to move',

  // Regulars (returning customers)
  // {name} is the regular's name.
  'regs.new': 'New regular: {name}',
  'regs.new.line': 'Sales +{n}% · see Boosts',
  'regs.new_many': { one: '{n} new regular', other: '{n} new regulars' },
  // Names of the first two regulars.
  'regs.names2': '{a}, {b}',
  // {n} is how many more beyond the two named.
  'regs.names_more': { one: '{a}, {b} and {n} more', other: '{a}, {b} and {n} more' },
  'regs.all': 'Every regular is here!',
  'regs.all.line': 'Sales +{n}% more',
  // {a} regulars met out of {b}; {pct} current sales bonus, {each} bonus per regular, {set} bonus for the whole set.
  'regs.intro': '{a} of {b} met, sales +{pct}%. Each adds {each}%, the whole set {set}% more. Once met they come in now and then: tap one for a tip.',
  // Name shown for a regular not met yet.
  'regs.unknown': '???',
  // {feat} is what the player must do to meet the regular, {v} the progress such as 3/10 or 40%.
  'regs.feat_prog': '{feat} ({v})',

  // Achievements
  'ach.earned': 'Earned',
  // {a} earned out of {b}, {now} sales bonus now, {max} the largest possible bonus.
  'ach.intro': '{a} of {b} earned. Gold ones add sales for good, now +{now}% and at most {max}%.',
  // Banner for one achievement. {tier} is Bronze, Silver or Gold.
  'ach.badge': { one: '{tier} badge, +{n} gem', other: '{tier} badge, +{n} gems' },
  'ach.badge_sales': { one: '{tier} badge, +{n} gem, sales +{pct}%', other: '{tier} badge, +{n} gems, sales +{pct}%' },
  'ach.many': { one: '{n} achievement', other: '{n} achievements' },
  'ach.many.line': { one: '+{n} gem · see the menu', other: '+{n} gems · see the menu' },
  // Line under an achievement. {prog} is Earned, 3 of 10 or 40%.
  'ach.reward': { one: '{prog} · {n} gem', other: '{prog} · {n} gems' },
  'ach.reward_sales': { one: '{prog} · {n} gem, sales +{pct}%', other: '{prog} · {n} gems, sales +{pct}%' },

  // Store look panel. A look is how the store is painted.
  'look.intro': {
    one: 'You have {n} gem. A look only changes how the store is painted, and every new store keeps it.',
    other: 'You have {n} gems. A look only changes how the store is painted, and every new store keeps it.'
  },
  'look.need_store': 'Reach store {n}',
  // {name} is the name of an achievement.
  'look.need_ach': 'Earn {name}',
  // Buttons: the look is in use now, or can be picked.
  'look.in_use': 'In use',
  'look.use': 'Use',

  // Menu buttons whose text changes
  'menu.sound_on': 'Sound: on',
  'menu.sound_off': 'Sound: off',
  'menu.vibration_on': 'Vibration: on',
  'menu.vibration_off': 'Vibration: off',
  'menu.erase_title': 'Erase all progress?',
  'menu.erase_text': 'This erases your gems, stores and daily streak. Purchases you made stay.',
  'menu.erase_yes': 'Erase',
  'menu.erase_no': 'Cancel',
  'save.newer': 'Update the app to continue.',
  'save.failed': 'Your progress is not being saved. Free some space on this device.',
  // Card shown for a few seconds on a first launch while the game looks for a saved game kept in the cloud (iCloud or Google Play Games).
  'save.looking': 'Looking for your saved game',
  // Banner when the game on this device was replaced by a newer one from another device: the bold line, then the small line.
  'cloud.loaded': 'Saved game loaded',
  'cloud.loaded_note': 'Your latest progress came from your other device.',
  'cloud.back_note': 'Your saved game was brought back.',
  // Small line in the menu on Android when the game cannot reach Google Play Games, so the save stays on the phone.
  'cloud.local_only': 'Saved on this phone only',
  'menu.erase': 'Erase all progress',

  // Compact number suffixes, comma separated and in order: none, thousand, million, billion, trillion, then the short names
  // for the next powers of 1000. Keep exactly 12 entries (the first one stays empty, so the text starts with a comma).
  // Pick what players of your language know from idle games; each entry should be 1 to 3 characters.
  'num.suffixes': ',K,M,B,T,Qa,Qi,Sx,Sp,Oc,No,Dc',
  // Goal and mission text. {dept} is the name of a department (Produce, Bakery ...), {n} a number.
  'goal.open': 'Open {dept}',
  // A goal to raise a department to a level. {dept} is the department name.
  'goal.dept_level': '{dept} to level {n}',
  // {amount} is a compact money amount such as 1M. The $ is the game's currency mark.
  'goal.earn': 'Earn ${amount} in total',
  // {n} is a count of shoppers.
  'goal.serve': { one: 'Serve {n} shopper', other: 'Serve {n} shoppers' },
  // A lane is one checkout lane (cash register) of the store.
  'goal.lane': 'Open lane {n}',
  // The stocker is the worker who restocks shelves from the stockroom.
  'goal.stocker': 'Hire a second stocker',
  'goal.parking': 'Build the Parking',
  'goal.taxi': 'Open the Taxi Stand',
  // Self checkouts are the machines where shoppers scan and pay themselves.
  'goal.self': 'Put in self checkouts',
  'goal.stockroom_level': 'Stockroom to level {n}',
  'goal.parking_level': 'Parking to level {n}',
  'goal.garden': 'Open the Garden Center',
  'goal.checkouts_level': 'Checkouts to level {n}',
  // Moving to a new store is the game's prestige reset.
  'goal.move': 'Move to a new store',
  // {n} is the number of the store.
  'goal.store': 'Reach store #{n}',
  // {amount} is a compact money amount such as 1M. The $ is the game's currency mark.
  'mission.earn': 'Earn ${amount}',
  // Gifts are the floating presents the player taps.
  'mission.gift': { one: 'Tap {n} gift', other: 'Tap {n} gifts' },
  // Rush is a burst of shoppers; checkouts are the cash register lanes.
  'mission.rush': { one: 'Tap checkouts {n} time in a rush', other: 'Tap checkouts {n} times in a rush' },
  'mission.buy': { one: 'Buy {n} upgrade', other: 'Buy {n} upgrades' },
  // {dept} is a department name. A star is a department's rating star.
  'mission.star': 'Earn a star in {dept}',
  // Phone notification text shown while the app is closed.
  'notify.full': 'Your store is full. Come and collect what it earned.',
  'notify.daily': 'Your daily reward is ready.',
  // Card shown before the phone asks for permission to send notifications, and its yes button.
  'notify.ask':'Get a reminder when your store is full or your daily reward is ready?',
  'notify.ask.yes': 'Remind me',

  // Label on a shop button for a one-time product the player already bought.
  'shop.owned': 'Owned',
  // The three small labels under the numbers on the starter deal: gems, hours of doubled income, reputation points.
  'shop.chip_gems': 'gems',
  // {n} is a number of hours.
  'shop.chip_hours': '{n} h',
  'shop.chip_x2': 'double income',
  'shop.chip_rep': 'rep',
  // Ribbon on the starter deal card.
  'shop.starter_ribbon': 'Starter deal',
  'shop.buy_once': 'Buy once',
  // Ribbons on gem packs, keep short.
  'shop.best_value': 'Best value',
  // Badge on a gem pack. {n} is a percentage. Keep short.
  'shop.badge_bonus': '+{n}% bonus',
  'shop.badge_more': '+{n}% gems',
  // Gems are the premium currency. {n} is the amount.
  'shop.gems': { one: '{n} gem', other: '{n} gems' },
  // Small line on the deal-of-the-day gem pack. {n} is extra gems.
  'shop.deal_day': { one: 'Deal of the day: +{n} gem', other: 'Deal of the day: +{n} gems' },
  // Section heading above the gem packs.
  'shop.gems_heading': 'Gems',
  'shop.intro': 'Gems are for boosts and time warps.',
  'shop.unavailable': 'The store is not available right now. Try again later.',
  // Banner title. {count} is the compact amount of gems (such as 1.2K), {n} the same amount as a plain number.
  'shop.recovered': { one: '{count} gem added', other: '{count} gems added' },
  'shop.recovered_note': 'From a purchase that was not credited.',
  'shop.restored': 'Purchases restored',
  'shop.nothing_to_restore': 'Nothing to restore',
  'shop.thanks': 'Thank you',
  // {name} is the product name, {n} the extra gems.
  'shop.thanks_bonus': { one: '{name} · +{n} bonus gem', other: '{name} · +{n} bonus gems' },
  'shop.failed': 'Purchase not completed.',
  'shop.pending': 'Waiting for approval',
  'shop.pending_note': 'It arrives once the purchase is approved.',
  'shop.late': 'Payment received',
  'shop.late_note': 'Your purchase will arrive shortly.',
  'shop.restore_failed': 'Restore failed. Try again later.',
  // Banner after watching an ad that gave nothing.
  'ads.no_reward': 'No reward',
  'ads.unavailable': 'No ad was available.',
  'ads.unfinished': 'The ad was not finished.',
  // Button of a free reward: Skip ads owned, an ad ready, or none loaded yet. Keep short.
  'ads.free': 'Free',
  'ads.watch': 'Watch',
  'ads.none_yet': 'No ad yet',
  // Double income is a boost that doubles earnings for a while.
  'ads.x2': 'Double income',
  // {time} is minutes:seconds left.
  'ads.x2_active': 'Active for {time}',
  'ads.x2_note': '30 min of x2',
  // Time warp: instantly collects income as if time passed.
  'ads.warp': 'Time warp',
  'ads.warp_note': 'An hour of income',
  'ads.gems': 'Free gems',
  // A rush is a burst of shoppers.
  'ads.rush': 'Call a rush',
  'ads.rush_note': 'Skips the wait',
  'ads.intro': 'Free, and a few a day:',
  // {n} is how many ads of this kind are left today.
  'ads.left': '{n} left today',
  'ads.tomorrow': 'back tomorrow',
  // Button on the welcome-back screen to double what the store earned while away. Keep short.
  'ads.double_free': 'Double it, free',
  'ads.double_watch': 'Double it: watch an ad',
  'ads.loading': 'Ad loading',
  // Pop-up offering the starter pack. {text} is what the pack contains.
  'pack.once': 'One time only: {text}',
  // {price} is the price with the currency.
  'pack.get': 'Get it for {price}',

  // Signs drawn on the 3D store. They are written in capitals in English; capitals are optional where the script has none.
  // The text must stay short: it is squeezed to fit its board.
  // Floor paint in an empty department lot, small line above the department name.
  'sign.opening_soon': 'OPENING SOON',
  // Open/closed board at the entrance, about 6 letters wide.
  'sign.open': 'OPEN',
  'sign.closed': 'CLOSED',
  // Poster on the stockroom wall.
  'sign.fresh_every_day': 'FRESH EVERY DAY',
  // Poster on the stockroom wall.
  'sign.low_prices': 'LOW PRICES',
  // The street sign by the road: the name of the street, drawn on two lines (\n marks the line break). One line is fine too.
  'sign.main_street': 'MAIN\nSTREET',
  // Under the street name on the road sign, once most of the store is open.
  'sign.supercenter': 'SUPERCENTER',
  // Under the street name on the road sign, while the store is small.
  'sign.market': 'MARKET',
  // Banner over the entrance during a flash sale, 12 characters.
  'sign.flash_sale': 'FLASH SALE!',
  // Four small price tags that pop up over the shelves during a flash sale (sign.sale to sign.two_for_one), about 8 characters each.
  'sign.sale': 'SALE!',
  'sign.half_off': '50% OFF',
  'sign.hot_deal': 'HOT DEAL',
  'sign.two_for_one': '2 FOR 1',
  // Names written over the two store entrances.
  'sign.home_more': 'HOME & MORE',
  'sign.grocery': 'GROCERY',

  // Boards standing in the store. Most are capitals in English; short. A text with a line break (\n) shows its first line on a red
  // header and the second on the yellow price card of a deal board; keep that shape for deal boards.
  'board.this_week': 'THIS WEEK',
  // Sign over the customer service desk.
  'board.courtesy': 'COURTESY',
  // Sign over the gate of the garden center.
  'board.garden_center': 'GARDEN CENTER',
  // Sign over the doorway to the two service rooms, two lines.
  'board.service_restrooms': 'CUSTOMER SERVICE\nRESTROOMS',
  // Board standing in an east room that is not bought yet. {name} is the room's name in capitals. Two lines.
  'board.opening_soon': 'OPENING SOON\n{name}',
  // Chalkboard price: the product, then the price on the second line.
  'board.apples': 'APPLES\n99c',
  'board.local_farm': 'LOCAL FARM',
  // Chalkboard price: the product, then the price on the second line.
  'board.coffee': 'COFFEE\n$2.00',
  'board.fresh_baked': 'FRESH BAKED',
  // Sale board in the pantry aisle: header, then the word on the price card.
  'board.pantry_sale': 'THIS WEEK\nSALE',
  'board.cold_drinks': 'COLD DRINKS',
  'board.pet_toys': 'PET TOYS\n2 FOR 5',
  'board.fresh_dairy': 'FRESH DAIRY',
  'board.ice_cream': 'ICE CREAM\n2 FOR 6',
  'board.fresh_deli': 'FRESH DELI',
  'board.balls': 'BALLS\n3 FOR 10',
  'board.tires': 'TIRES\n4 FOR 3',
  'board.toy_sale': 'TOY\nSALE',
  // Small header over a paper shelf, one line.
  'board.paper': 'PAPER 2 FOR 5',
  'board.tools': 'TOOLS\n20% OFF',
  'board.cookware': 'COOKWARE\nSALE',
  // Big sign over the checkout lanes.
  'board.checkout': 'CHECKOUT',
  // Chalkboard at each entrance, two lines: the greeting and the name of the store half.
  'board.welcome_home': 'WELCOME\nHOME & MORE',
  'board.welcome_grocery': 'WELCOME\nGROCERY',
  // Over the corral where shopping carts are kept.
  'board.carts': 'CARTS',
  // Bus stop sign.
  'board.bus': 'BUS',
  // Sign by the tire bay.
  'board.tire_lube': 'TIRE & LUBE',
  // Number of a loading dock in the stockroom wall, {n} is 1, 2, 3...
  'board.dock': 'DOCK {n}',
  'board.receiving': 'RECEIVING',
  'board.employees_only': 'EMPLOYEES ONLY',

  // Small labels on the map above departments and over shoppers.
  // A shopper gave up because the checkout lines are full.
  'tag.lines_too_long': 'Lines too long!',
  // Appended to a place's name when its shelves are empty (the stockroom).
  'tag.shelves_empty': 'Shelves empty!',
  // Appended to the name of the main hall when the checkout lines are full.
  'tag.lines_full': 'Lines full!',
  // Appended to a department's name when it has run out of stock.
  'tag.sold_out': 'Sold out',
  // Level of a place, after its name. Keep short ("Lv" = level). {n} is the level.
  'tag.lv': 'Lv {n}',
  // Level of a department, after its name, then stars. {n} is the level and {max} the top level.
  'tag.lv_max': 'Lv {n}/{max}',
  // Screen reader label of the star button that floats in the store and gives a bonus when tapped.
  'tag.bonus.aria': 'Tap for a bonus',

  // Shown on the loading screen when the 3D view cannot start.
  'scene.no_webgl': 'This device cannot start the 3D view (WebGL is not available).',
  // Shown on the loading screen when building the store failed.
  'scene.build_failed': 'The store could not be built. Please reload.',
  // Button on the loading screen when the store could not start; it reloads the page.
  'scene.reload': 'Reload',

  // Department names. A department is a section of the player's supermarket (Produce, Bakery...). Shown on the Upgrades list and on the 3D store sign (uppercased). Max about 18 characters.
  'dept.produce': 'Produce',
  'dept.bakery': 'Bakery',
  'dept.dairy': 'Dairy',
  'dept.meat': 'Meat & Fish',
  'dept.frozen': 'Frozen',
  'dept.pantry': 'Pantry',
  'dept.snacks': 'Snacks & Drinks',
  'dept.toys': 'Toys',
  'dept.tech': 'Electronics',
  'dept.kitchen': 'Kitchen',
  'dept.clothes': 'Clothing',
  'dept.home': 'Home',
  'dept.office': 'Books & Office',
  'dept.pets': 'Pets',
  'dept.sports': 'Sports & Outdoors',
  'dept.tools': 'Hardware',
  'dept.auto': 'Auto',
  'dept.seasonal': 'Seasonal',

  // Items inside a department: each department has several kinds of things the player buys upgrades for. Plain plural noun phrases, max about 26 characters (they appear on cards).
  'item.produce.0': 'Fruit & tomato tables',
  'item.produce.1': 'Veg & flower stands',
  'item.produce.2': 'Fruit & melon bins',
  'item.produce.3': 'Farm signs & lights',
  'item.produce.4': 'Baskets, bench & mat',
  // The staff of the department (the clerks at its tills).
  'item.produce.5': 'Clerks',
  'item.bakery.0': 'Bread & roll racks',
  'item.bakery.1': 'Donuts, pies & cakes',
  'item.bakery.2': 'Ovens & coffee bar',
  'item.bakery.3': 'Menu board & lights',
  'item.bakery.4': 'Clerks',
  'item.dairy.0': 'Milk & yogurt coolers',
  'item.dairy.1': 'Cheese & dip islands',
  'item.dairy.2': 'Dairy signs & lights',
  'item.dairy.3': 'Plant, ice & recycling',
  'item.dairy.4': 'Clerks',
  'item.meat.0': 'Beef & bacon cases',
  'item.meat.1': 'Ham, turkey & burgers',
  'item.meat.2': 'Butcher counter',
  'item.meat.3': 'Deli board & lights',
  'item.meat.4': 'Brine tubs & ice',
  'item.meat.5': 'Clerks',
  'item.frozen.0': 'Pizza & dinner coolers',
  'item.frozen.1': 'Ice cream & pop chests',
  'item.frozen.2': 'Deal sign & lights',
  'item.frozen.3': 'Ice bags & recycling',
  'item.frozen.4': 'Clerks',
  'item.pantry.0': 'Cereal, pasta & soup',
  'item.pantry.1': 'Sauce, spice & tea',
  'item.pantry.2': 'Soup & jar end caps',
  'item.pantry.3': 'Can bin & tables',
  'item.pantry.4': 'Sale board & mats',
  'item.pantry.5': 'Clerks',
  'item.snacks.0': 'Chips & candy racks',
  'item.snacks.1': 'Soda & water coolers',
  'item.snacks.2': 'Chocolate & gum caps',
  'item.snacks.3': 'Soda & chip tables',
  'item.snacks.4': 'Drinks board & mats',
  'item.snacks.5': 'Clerks',
  'item.toys.0': 'Cars, trucks & blocks',
  'item.toys.1': 'Plush & claw machines',
  'item.toys.2': 'Puzzles & board games',
  'item.toys.3': 'Sale board & play mats',
  'item.toys.4': 'Clerks',
  'item.tech.0': 'TVs & home theater',
  'item.tech.1': 'Laptops & cameras',
  'item.tech.2': 'Computers & monitors',
  'item.tech.3': 'Games, phones & audio',
  'item.tech.4': 'Demo mat & desk lamps',
  'item.tech.5': 'Clerks',
  'item.kitchen.0': 'Pots, pans & mixers',
  'item.kitchen.1': 'Bowls & blenders',
  'item.kitchen.2': 'Mugs, glasses & knives',
  'item.kitchen.3': 'Display range & sink',
  'item.kitchen.4': 'Cookware deal & mat',
  'item.kitchen.5': 'Clerks',
  'item.clothes.0': 'Shirt & jacket racks',
  'item.clothes.1': 'Tee & denim tables',
  'item.clothes.2': 'Shoes & mannequins',
  'item.clothes.3': 'Fashion podium & signs',
  'item.clothes.4': 'Fitting rooms & mirror',
  'item.clothes.5': 'Clerks',
  'item.home.0': 'Living room',
  'item.home.1': 'Bedroom',
  'item.home.2': 'Dining & appliances',
  'item.home.3': 'Lamps & decor',
  'item.home.4': 'Clerks',
  'item.office.0': 'Books & art supplies',
  'item.office.1': 'Notebooks & stationery',
  'item.office.2': 'Pens & magazines',
  'item.office.3': 'Decor & lights',
  'item.office.4': 'Clerks',
  'item.pets.0': 'Dog & cat food',
  'item.pets.1': 'Seed, litter & beds',
  'item.pets.2': 'Treats & leashes',
  'item.pets.3': 'Fish tank & pens',
  'item.pets.4': 'Toy board & pet rugs',
  'item.pets.5': 'Clerks',
  'item.sports.0': 'Tents & lanterns',
  'item.sports.1': 'Stoves & coolers',
  'item.sports.2': 'Balls & skateboards',
  'item.sports.3': 'Climbing wall & signs',
  'item.sports.4': 'Canoe & turf mat',
  'item.sports.5': 'Clerks',
  'item.tools.0': 'Hammers & workbench',
  'item.tools.1': 'Saws, pliers & lumber',
  'item.tools.2': 'Paint & tool chests',
  'item.tools.3': 'Fasteners & axes',
  'item.tools.4': 'Tool deal & mats',
  'item.tools.5': 'Clerks',
  'item.auto.0': 'Oil & car care',
  'item.auto.1': 'Wipers & batteries',
  'item.auto.2': 'Tires & wheels',
  'item.auto.3': 'Kart showcase & signs',
  'item.auto.4': 'Cones, mats & boxes',
  'item.auto.5': 'Clerks',
  'item.seasonal.0': 'Trees & train table',
  'item.seasonal.1': 'Ornaments & canes',
  'item.seasonal.2': 'Stockings & wreaths',
  'item.seasonal.3': 'Santa display & lights',
  'item.seasonal.4': 'Snow & holiday rugs',
  'item.seasonal.5': 'Clerks',

  // Places around the departments: Parking, Checkouts, Stockroom... "Checkouts" are the cash register lanes; "Stockroom" is the back room where stockers load boxes onto dollies (hand trucks).
  'place.lot': 'Parking',
  'place.hall': 'Checkouts',
  'place.dock': 'Stockroom',
  'place.taxi': 'Taxi Stand',
  'place.garden': 'Garden Center',
  'place.serv': 'Customer Service',
  'place.rest': 'Restrooms',
  'place.lounge': 'Break Room',
  'place.head': 'Head Office',

  // What each level of a place adds. Shown on the card and in a banner after buying: "A second stocker", "More parking bays". Short noun phrases, max about 40 characters.
  'place.lot.next.0': 'A parking lot for shoppers who drive',
  'place.lot.next.1': 'More parking bays',
  'place.lot.next.2': 'More parking bays',
  'place.lot.next.3': 'The whole lot, with planters',
  'place.hall.next.0': 'Lane 2, with a cashier',
  'place.hall.next.1': 'Cart corrals with carts',
  'place.hall.next.2': 'Two self checkouts and an attendant',
  'place.hall.next.3': 'Recycling stations',
  'place.hall.next.4': 'Lane 3, with a cashier',
  'place.hall.next.5': 'Two more self checkouts',
  'place.hall.next.6': 'A courtesy desk',
  'place.hall.next.7': 'Vending machines and a news rack',
  'place.hall.next.8': 'Two more self checkouts',
  'place.hall.next.9': 'A bench and planters',
  'place.dock.next.0': 'A second stocker',
  'place.dock.next.1': 'A third stocker',
  'place.dock.next.2': 'A box more on every dolly',
  'place.dock.next.3': 'A fourth stocker',
  'place.dock.next.4': 'A fifth stocker',
  'place.dock.next.5': 'A box more on every dolly',
  'place.dock.next.6': 'A sixth stocker',
  'place.dock.next.7': 'A seventh stocker',
  'place.dock.next.8': 'A box more on every dolly',
  'place.dock.next.9': 'An eighth stocker',
  'place.taxi.next.0': 'A taxi stand for shoppers who ride',
  'place.taxi.next.1': 'More taxis',
  'place.taxi.next.2': 'More taxis',
  'place.taxi.next.3': 'A taxi every few seconds',
  'place.garden.next.0': 'A fenced garden with a till',
  'place.garden.next.1': 'More flower displays',
  'place.garden.next.2': 'Potted plants and more displays',
  'place.garden.next.3': 'Trees and lamps',
  'place.serv.next.0': 'A service desk',
  'place.serv.next.1': 'A clerk behind it',
  'place.serv.next.2': 'Queue posts',
  'place.serv.next.3': 'Waiting benches',
  'place.serv.next.4': 'A second service desk',
  'place.serv.next.5': 'A second clerk',
  'place.serv.next.6': 'Parcel lockers and a returns counter',
  'place.serv.next.7': 'A floor sign and an information stand',
  'place.serv.next.8': 'A waiting table, plants and a water cooler',
  'place.rest.next.0': 'Three toilet stalls',
  'place.rest.next.1': 'A fourth stall and toilet brushes',
  'place.rest.next.2': 'Mirrored sinks',
  'place.rest.next.3': 'A family room with a baby changing table',
  'place.rest.next.4': 'Urinals',
  'place.rest.next.5': 'Sinks along the wall, soap and towels',
  'place.rest.next.6': 'Supply shelves, a bench, bins and plants',
  'place.rest.next.7': 'A cleaning cart, mop bucket and a wet floor sign',
  'place.lounge.next.0': 'A fridge, pantry and counters',
  'place.lounge.next.1': 'Worktops, a kettle and wall cupboards',
  'place.lounge.next.2': 'Coffee, microwave and toaster',
  'place.lounge.next.3': 'A table with four chairs',
  'place.lounge.next.4': 'Pizza boxes on the table',
  'place.lounge.next.5': 'A staff member on break',
  'place.lounge.next.6': 'A second table',
  'place.lounge.next.7': 'Lockers and a bench',
  'place.lounge.next.8': 'A second staff member',
  'place.lounge.next.9': 'A sofa corner, notice board and clock',
  'place.head.next.0': 'A manager desk and chairs',
  'place.head.next.1': 'A computer',
  'place.head.next.2': 'The manager',
  'place.head.next.3': 'Filing cabinets',
  'place.head.next.4': 'A safe and archive shelves',
  'place.head.next.5': 'A meeting table with chairs',
  'place.head.next.6': 'A whiteboard and a coffee station',
  'place.head.next.7': 'Six more desks and a clerk',
  'place.head.next.8': 'Archive shelving and a printer table',
  'place.head.next.9': 'A rug, plants and a water cooler',

  // Kinds of things inside a place (like items of a department). Max about 26 characters.
  'place.lot.it.0': 'Parking lot',
  'place.hall.it.0': 'Lanes',
  'place.hall.it.1': 'Self checkout pairs',
  'place.hall.it.2': 'Carts & vending',
  'place.dock.it.0': 'Stockers',
  'place.dock.it.1': 'Boxes a dolly',
  'place.taxi.it.0': 'Taxis',
  'place.garden.it.0': 'Garden',
  'place.serv.it.0': 'Desks',
  'place.serv.it.1': 'Clerks',
  'place.serv.it.2': 'Waiting area',
  'place.serv.it.3': 'Lockers & signs',
  'place.rest.it.0': 'Toilets',
  'place.rest.it.1': 'Sinks',
  'place.rest.it.2': 'Supplies & cleaning',
  'place.lounge.it.0': 'Kitchenette',
  'place.lounge.it.1': 'Dining',
  'place.lounge.it.2': 'Lockers & sofa',
  'place.lounge.it.3': 'Staff on break',
  'place.head.it.0': 'Offices',
  'place.head.it.1': 'Storage',
  'place.head.it.2': 'Meeting room',

  // Perks: permanent bonuses bought with reputation (rep). Name is short (max 16 characters); "what" is the label before a value, for example "Upgrades cost -10%" or "Start cash $100".
  'perkdef.open.name': 'Head start',
  // Short label that completes the perk line: "<what> <value>", for example "Upgrades cost -10%".
  'perkdef.open.what': 'Start with',
  'perkdef.cash.name': 'Seed money',
  'perkdef.cash.what': 'Start cash',
  'perkdef.cheap.name': 'Bulk deals',
  'perkdef.cheap.what': 'Upgrades cost',
  'perkdef.pace.name': 'Quick staff',
  'perkdef.pace.what': 'Staff work',
  'perkdef.away.name': 'Long weekends',
  'perkdef.away.what': 'Away earnings last',
  'perkdef.rush.name': 'Rush hour',
  'perkdef.rush.what': 'Rushes last',
  'perkdef.sales.name': 'Loyal shoppers',
  'perkdef.sales.what': 'Sales',
  'perkdef.gems.name': 'Mission pay',
  'perkdef.gems.what': 'Each mission pays',
  'perkdef.night.name': 'Open all night',
  'perkdef.night.what': 'Store hours',

  // Regulars: named shoppers who start coming once the player does something.
  // A first name of a shopper in the game. May be replaced by a name that is common in your language.
  'reg.mabel.name': 'Mabel',
  // One short sentence describing this regular shopper.
  'reg.mabel.line': 'Retired teacher. Grades the produce out loud.',
  // What the player must do to meet this shopper. A task, imperative.
  'reg.mabel.feat': 'Earn a star in any department',
  'reg.gus.name': 'Gus',
  'reg.gus.line': 'Delivery driver, always in a hurry.',
  'reg.gus.feat': 'Serve 1,000 shoppers',
  'reg.ollie.name': 'Ollie',
  'reg.ollie.line': 'Never pays without a coupon.',
  'reg.ollie.feat': 'Tap 10 gifts',
  'reg.priya.name': 'Priya',
  'reg.priya.line': 'Knows which till is the fastest.',
  'reg.priya.feat': 'Finish a rush combo of 10',
  'reg.hana.name': 'Hana',
  'reg.hana.line': 'Shops for the whole block.',
  'reg.hana.feat': 'Earn $1M in total',
  'reg.theo.name': 'Theo',
  'reg.theo.line': 'Builds gadgets in his garage.',
  'reg.theo.feat': 'Open Electronics',
  'reg.walt.name': 'Walt',
  'reg.walt.line': 'Here every morning for the paper.',
  'reg.walt.feat': 'Claim 7 daily rewards',
  'reg.rosa.name': 'Rosa',
  'reg.rosa.line': 'Has moved three times and still shops here.',
  'reg.rosa.feat': 'Reach store 3',
  'reg.nina.name': 'Nina',
  'reg.nina.line': 'Asks for the manager, then for a deal.',
  'reg.nina.feat': 'Buy 10 perk levels',
  'reg.ivy.name': 'Ivy',
  'reg.ivy.line': 'Grows tomatoes and judges yours.',
  'reg.ivy.feat': 'Build the Garden Center',
  'reg.bruno.name': 'Bruno',
  'reg.bruno.line': 'Tells long stories at the meat counter.',
  'reg.bruno.feat': 'Earn all three stars in one department',
  'reg.felix.name': 'Felix',
  'reg.felix.line': 'Walks every aisle and buys one thing.',
  'reg.felix.feat': 'Have 20 stars in one store',
  // The gold shopper who comes now and then and gives a tip when tapped.
  'reg.vip.name': 'VIP',

  // Shop products bought with real money (gem packs are named by the shop.gems key).
  'product.starter.name': 'Starter pack',
  // What the product gives, shown in the shop.
  'product.starter.text': '150 gems, 2 hours of double income and 10 rep.',
  'product.noads.name': 'Skip ads',
  // One short line on the product button.
  'product.noads.line': 'Every ad reward comes at once, no ad to watch.',
  'product.x2.name': 'Permanent x2',
  'product.x2.line': 'Double income for good.',

  // Store looks: designs for floors, walls and signs.
  // Name of a store design (colours of floors, walls and signs).
  'look.classic.name': 'Classic',
  // Short description of that store design.
  'look.classic.text': 'Red and gold, as it was',
  'look.fresh.name': 'Fresh Market',
  'look.fresh.text': 'Light greens, a grocer\'s sign',
  'look.rustic.name': 'Rustic',
  'look.rustic.text': 'Warm timber and brick',
  'look.seaside.name': 'Seaside',
  'look.seaside.text': 'Sea blues and white',
  'look.neon.name': 'Night Neon',
  'look.neon.text': 'Dark floors, glowing signs',
  'look.gold.name': 'Golden Deluxe',
  'look.gold.text': 'Cream and gold, black signs',

  // Achievements.
  // Name of an achievement (a long-term goal). Title-like, short.
  'ach.srv1.name': 'Busy Aisles',
  // What the player must do. A task; the numbers are part of the text.
  'ach.srv1.text': 'Serve 1,000 shoppers',
  'ach.srv2.name': 'Local Favorite',
  'ach.srv2.text': 'Serve 100,000 shoppers',
  'ach.srv3.name': 'Household Name',
  'ach.srv3.text': 'Serve 10 million shoppers',
  'ach.all1.name': 'First Fortune',
  'ach.all1.text': 'Earn $10M in total',
  'ach.all2.name': 'Trillion Club',
  'ach.all2.text': 'Earn $1T in total',
  'ach.all3.name': 'Money Machine',
  'ach.all3.text': 'Earn $1Qi in total',
  'ach.st1.name': 'Moving Up',
  'ach.st1.text': 'Reach store 5',
  'ach.st2.name': 'Chain Store',
  'ach.st2.text': 'Reach store 10',
  'ach.st3.name': 'Retail Empire',
  'ach.st3.text': 'Reach store 20',
  'ach.dep1.name': 'Growing Store',
  'ach.dep1.text': 'Open 6 departments',
  'ach.dep2.name': 'Big Box',
  'ach.dep2.text': 'Open 12 departments',
  'ach.dep3.name': 'One Stop Shop',
  'ach.dep3.text': 'Open all 18 departments',
  'ach.star1.name': 'Full Marks',
  'ach.star1.text': 'Earn all 3 stars in a department',
  'ach.rate1.name': 'Five Star Aisles',
  'ach.rate1.text': 'Have 36 stars in one store',
  'ach.rate2.name': 'Perfect Store',
  'ach.rate2.text': 'Have every star in one store',
  'ach.reg1.name': 'Friendly Faces',
  'ach.reg1.text': 'Meet 6 regulars',
  'ach.reg2.name': 'Everybody Knows You',
  'ach.reg2.text': 'Meet all the regulars',
  'ach.rush1.name': 'Rush Hour Hero',
  'ach.rush1.text': 'Finish a rush combo of 20',
  'ach.rush2.name': 'Lightning Hands',
  'ach.rush2.text': 'Finish a rush combo of 40',
  'ach.gift1.name': 'Gift Spotter',
  'ach.gift1.text': 'Tap 25 gifts',
  'ach.gift2.name': 'Santa\'s Helper',
  'ach.gift2.text': 'Tap 250 gifts',
  'ach.day1.name': 'Regular Hours',
  'ach.day1.text': 'Claim 14 daily rewards',
  'ach.day2.name': 'Never Closed',
  'ach.day2.text': 'Claim 30 daily rewards',
  'ach.pk1.name': 'Well Connected',
  'ach.pk1.text': 'Buy 20 perk levels',
  'ach.pk2.name': 'Top Perk',
  'ach.pk2.text': 'Max out a perk',
  'ach.pk3.name': 'Master Manager',
  'ach.pk3.text': 'Max out 4 perks',

  // Achievement levels.
  // Medal level of an achievement: bronze, silver, gold.
  'ach.tier.bronze': 'Bronze',
  'ach.tier.silver': 'Silver',
  'ach.tier.gold': 'Gold',

  // Radio stations: a short description under the station name.
  // Short description of a real radio station (kind of music and city). Do not translate the station name or city names that have no local form.
  'radio.line.kiis': 'Pop hits from Los Angeles',
  'radio.line.lite': 'Adult contemporary from Chicago',
  'radio.line.hot97': 'Hip-hop and R&B from New York',
  'radio.line.oldies': 'Pop oldies',
  'radio.line.poptron': 'Electropop and indie dance',
  'radio.line.cbcmusic': 'Canadian music from Toronto',
  'radio.line.cbc1': 'News, talk and music from Toronto',
  'radio.line.kiss1053': 'Pop hits from Ottawa',
  'radio.line.capital': 'Pop hits',
  'radio.line.heart80': 'Pop hits of the 80s',
  'radio.line.heart90': 'Pop hits of the 90s',
  'radio.line.heartdance': 'Dance hits',
  'radio.line.gold': 'Classic pop hits',
  'radio.line.exa': 'Pop hits from Mexicali',
  'radio.line.mejorcdmx': 'Regional Mexican from Mexico City',
  'radio.line.mejormty': 'Regional Mexican from Monterrey',
  'radio.line.r710': 'Mexican music',
  'radio.line.los40co': 'Latin pop hits',
  'radio.line.rockpop': 'Pop and rock from Buenos Aires',
  'radio.line.reggaeton': 'Reggaeton',
  'radio.line.lamega': 'Tropical and urban from New York',
  'radio.line.clube': 'Brazilian pop hits',
  'radio.line.bons': 'Nostalgic pop and rock',
  'radio.line.fita': 'Flashback hits',
  'radio.line.mgt': 'Sertanejo',
  'radio.line.zipfm': 'Hits and dancehall from Jamaica',
  'radio.line.radiojam': 'Jamaican and Caribbean music',
  'radio.line.scorch': 'Soca from Trinidad',
  'radio.line.unityxm': 'Dancehall and reggae',
  'radio.line.los40': 'Pop hits from Spain',
  'radio.line.los40classic': 'Pop and rock classics',
  'radio.line.kissfm': '80s, 90s and more',
  'radio.line.flaix': 'Dance and urban from Catalonia',
  'radio.line.fip': 'Eclectic, from jazz to pop',
  'radio.line.nrj': 'Pop hits',
  'radio.line.rtl2': 'Pop and rock',
  'radio.line.fun': 'Dance and pop',
  'radio.line.rfm': 'Easy pop',
  'radio.line.antenne': 'Pop and rock hits',
  'radio.line.swr3': 'Pop hits',
  'radio.line.bayern3': 'Pop hits',
  'radio.line.1live': 'Young pop and charts',
  'radio.line.ndr2': 'Pop hits from the north',
  'radio.line.italia80': 'Italian hits of the 80s',
  'radio.line.rtl1025': 'Pop hits',
  'radio.line.italia70': 'Italian hits of the 70s',
  'radio.line.lolli': 'Italian pop',
  'radio.line.radio2': 'Pop and rock classics',
  'radio.line.3fm': 'New pop and alternative',
  'radio.line.qmusic': 'Pop hits',
  'radio.line.538': 'Pop and dance hits',
  'radio.line.sky': 'Easy pop',
  'radio.line.srp3': 'Pop from Sweden',
  'radio.line.megapol': 'Pop hits from Sweden',
  'radio.line.p5hits': 'Pop hits from Norway',
  'radio.line.p12': 'Hits from Norway',
  'radio.line.rmf': 'Pop hits',
  'radio.line.zet': 'Pop hits',
  'radio.line.eska': 'Pop hits from Warsaw',
  'radio.line.chilli': 'Easy pop',
  'radio.line.athensdj': 'Pop hits',
  'radio.line.sfera': 'Greek pop',
  'radio.line.easy972': 'Pop and soft rock',
  'radio.line.pepper': 'Easy listening',
  'radio.line.rusradio': 'Russian pop',
  'radio.line.dfmdance': 'Russian dance hits',
  'radio.line.dfm90': 'Eurodance of the 90s',
  'radio.line.vanya': 'Russian chanson and pop',
  'radio.line.kral': 'Turkish pop hits',
  'radio.line.power': 'Turkish pop hits',
  'radio.line.joy': 'Turkish and world hits',
  'radio.line.best': 'Turkish pop',
  'radio.line.trtfm': 'Turkish pop from the state broadcaster',
  'radio.line.metro': 'Turkish and world pop',
  'radio.line.mcd': 'Arabic pop and talk',
  'radio.line.arabmix': 'Arabic hits',
  'radio.line.nogoum': 'Egyptian pop',
  'radio.line.gaane': 'Old Bollywood songs',
  'radio.line.bolly10': 'Bollywood hits of the 2010s',
  'radio.line.hungama': 'Bollywood hits',
  'radio.line.hindigold': 'Hindi film classics',
  'radio.line.qt1': 'Mandarin pop',
  'radio.line.qt2': 'Mandarin and Cantonese pop',
  'radio.line.asiafm': 'Asian pop',
  'radio.line.asiafm2': 'Asian pop classics',
  'radio.line.jpop': 'Japanese pop',
  'radio.line.kawaii': 'Kawaii J-pop',
  'radio.line.sakura': 'Japanese pop classics',
  'radio.line.bigb': 'K-pop',
  'radio.line.moekpop': 'K-pop',
  'radio.line.cbsmusic': 'Korean pop',
  'radio.line.love983': 'OPM and pop',
  'radio.line.love1007': 'OPM and pop',
  'radio.line.winradio': 'Contemporary hits',
  'radio.line.budots': 'Budots remixes',
  'radio.line.sbfm': 'Indonesian pop classics',
  'radio.line.mstream': 'Indonesian pop and indie',
  'radio.line.rama': 'Indonesian pop',
  'radio.line.imelda': 'Indonesian classics',
  'radio.line.mradio': 'Vietnamese pop',
  'radio.line.cherry': 'Vietnamese pop',
  'radio.line.hanoi': 'Music from Hanoi',
  'radio.line.kiis1065': 'Pop hits from Sydney',
  'radio.line.kiis1011': 'Pop hits from Melbourne',
  'radio.line.nova919': 'Hits from Adelaide',
  'radio.line.gold1043': 'Classic hits from Melbourne',
  'radio.line.coolfm': 'Pop and Afrobeats',
  'radio.line.wazobia': 'Afrobeats and pidgin pop',
  'radio.line.softlife': 'Afrobeats and afrofusion',
  'radio.line.amapiano': 'Amapiano',
  'radio.line.lekker': 'Top 40',
  'radio.line.jacaranda': 'Pop hits',
  'radio.line.ecgold': 'Classic hits',
  'radio.line.easy1015': 'Soul and pop',
  'radio.line.capitalke': 'Hits from Nairobi',
  'radio.line.hitzgh': 'Hits from Accra',
  'radio.line.ghmusic': 'Ghanaian music',

  // Upgrade pieces. Every upgrade the player buys adds one piece to the 3D store, and the card names the next piece ("Cake case", "Hanging sign"). Short noun phrases, max about 26 characters. Words like clerk, showcase and gondola are store fixtures; "Floor lights" are lights set into the floor.
  'piece.apple_table': 'Apple table',
  'piece.fruit_bin': 'Fruit bin',
  'piece.banana_stand': 'Banana stand',
  'piece.tomato_table': 'Tomato table',
  'piece.hanging_sign': 'Hanging sign',
  'piece.lemon_table': 'Lemon table',
  'piece.pepper_table': 'Pepper table',
  'piece.pumpkin_barrel': 'Pumpkin barrel',
  'piece.avocado_table': 'Avocado table',
  'piece.produce_desk': 'Produce desk',
  'piece.price_chalkboard': 'Price chalkboard',
  'piece.watermelon_bin': 'Watermelon bin',
  'piece.carrot_table': 'Carrot table',
  'piece.tiered_stand': 'Tiered stand',
  'piece.fruit_island': 'Fruit island',
  'piece.orange_barrel': 'Orange barrel',
  'piece.wire_bin': 'Wire bin',
  'piece.flower_stand': 'Flower stand',
  'piece.lettuce_table': 'Lettuce table',
  'piece.floor_lights': 'Floor lights',
  'piece.melon_barrel': 'Melon barrel',
  'piece.orange_table': 'Orange table',
  'piece.berry_bin': 'Berry bin',
  'piece.local_farm_sign': 'Local farm sign',
  'piece.second_clerk': 'Second clerk',
  'piece.basket_stack': 'Basket stack',
  'piece.floor_mat': 'Floor mat',
  'piece.bench': 'Bench',
  'piece.tall_planter': 'Tall planter',
  'piece.prize_apple_table': 'Prize apple table',
  'piece.donut_table': 'Donut table',
  'piece.baguette_table': 'Baguette table',
  'piece.bread_rack': 'Bread rack',
  'piece.roll_rack': 'Roll rack',
  'piece.muffin_case': 'Muffin case',
  'piece.pie_table': 'Pie table',
  'piece.bagel_case': 'Bagel case',
  'piece.loaf_rack': 'Loaf rack',
  'piece.bakery_desk': 'Bakery desk',
  'piece.cake_case': 'Cake case',
  'piece.bread_oven': 'Bread oven',
  'piece.pastry_fridge': 'Pastry fridge',
  'piece.sample_cart': 'Sample cart',
  'piece.cake_display': 'Cake display',
  'piece.cake_boxes': 'Cake boxes',
  'piece.bread_boxes': 'Bread boxes',
  'piece.bread_box': 'Bread box',
  'piece.loaf_bags': 'Loaf bags',
  'piece.bakery_plant': 'Bakery plant',
  'piece.donut_tray': 'Donut tray',
  'piece.baguette_basket': 'Baguette basket',
  'piece.menu_board': 'Menu board',
  'piece.baking_rug': 'Baking rug',
  'piece.fresh_baked_board': 'Fresh baked board',
  'piece.coffee_station': 'Coffee station',
  'piece.door_mat': 'Door mat',
  'piece.birthday_cake': 'Birthday cake',
  'piece.cereal_gondola': 'Cereal gondola',
  'piece.soup_end_cap': 'Soup end cap',
  'piece.pasta_gondola': 'Pasta gondola',
  'piece.rice_rack': 'Rice rack',
  'piece.soup_gondola': 'Soup gondola',
  'piece.canned_veg_gondola': 'Canned veg gondola',
  'piece.flour_rack': 'Flour rack',
  'piece.jar_end_cap': 'Jar end cap',
  'piece.pantry_desk': 'Pantry desk',
  'piece.can_bin': 'Can bin',
  'piece.flour_table': 'Flour table',
  'piece.sauce_gondola': 'Sauce gondola',
  'piece.baking_gondola': 'Baking gondola',
  'piece.promo_table': 'Promo table',
  'piece.oil_rack': 'Oil rack',
  'piece.spice_pegs': 'Spice pegs',
  'piece.coffee_gondola': 'Coffee gondola',
  'piece.tea_rack': 'Tea rack',
  'piece.ketchup_end_cap': 'Ketchup end cap',
  'piece.cereal_end_cap': 'Cereal end cap',
  'piece.pantry_sale_board': 'Pantry sale board',
  'piece.jar_table': 'Jar table',
  'piece.entry_mat': 'Entry mat',
  'piece.pasta_table': 'Pasta table',
  'piece.bean_table': 'Bean table',
  'piece.soup_table': 'Soup table',
  'piece.bulk_bins': 'Bulk bins',
  'piece.chip_gondola': 'Chip gondola',
  'piece.chocolate_end_cap': 'Chocolate end cap',
  'piece.chip_racks': 'Chip racks',
  'piece.candy_spinners': 'Candy spinners',
  'piece.soda_cooler': 'Soda cooler',
  'piece.juice_cooler': 'Juice cooler',
  'piece.water_cooler': 'Water cooler',
  'piece.candy_end_cap': 'Candy end cap',
  'piece.snack_desk': 'Snack desk',
  'piece.soda_table': 'Soda table',
  'piece.water_table': 'Water table',
  'piece.cracker_gondola': 'Cracker gondola',
  'piece.nut_rack': 'Nut rack',
  'piece.gum_spinner': 'Gum spinner',
  'piece.energy_cooler': 'Energy cooler',
  'piece.tea_cooler': 'Tea cooler',
  'piece.sports_cooler': 'Sports cooler',
  'piece.mint_spinners': 'Mint spinners',
  'piece.cola_end_cap': 'Cola end cap',
  'piece.pretzel_end_cap': 'Pretzel end cap',
  'piece.drinks_board': 'Drinks board',
  'piece.juice_table': 'Juice table',
  'piece.chips_table': 'Chips table',
  'piece.back_mat': 'Back mat',
  'piece.candy_table': 'Candy table',
  'piece.drink_machine': 'Drink machine',
  'piece.dog_food_gondola': 'Dog food gondola',
  'piece.treat_end_cap': 'Treat end cap',
  'piece.cat_food_rack': 'Cat food rack',
  'piece.puppy_food_gondola': 'Puppy food gondola',
  'piece.kitten_food_rack': 'Kitten food rack',
  'piece.dog_treat_gondola': 'Dog treat gondola',
  'piece.cat_treat_rack': 'Cat treat rack',
  'piece.dog_toy_end_cap': 'Dog toy end cap',
  'piece.pet_desk': 'Pet desk',
  'piece.pet_food_table': 'Pet food table',
  'piece.fish_tank': 'Fish tank',
  'piece.bird_seed_gondola': 'Bird seed gondola',
  'piece.fish_food_gondola': 'Fish food gondola',
  'piece.adoption_corner': 'Adoption corner',
  'piece.litter_rack': 'Litter rack',
  'piece.chew_toy_pegs': 'Chew toy pegs',
  'piece.collar_pegs': 'Collar pegs',
  'piece.pet_bed_rack': 'Pet bed rack',
  'piece.catnip_end_cap': 'Catnip end cap',
  'piece.leash_end_cap': 'Leash end cap',
  'piece.puppy_pen': 'Puppy pen',
  'piece.kitten_pen': 'Kitten pen',
  'piece.pet_toys_board': 'Pet toys board',
  'piece.pet_rug': 'Pet rug',
  'piece.dog_bed': 'Dog bed',
  'piece.ball_table': 'Ball table',
  'piece.fish_tanks': 'Fish tanks',
  'piece.milk_cooler': 'Milk cooler',
  'piece.yogurt_cooler': 'Yogurt cooler',
  'piece.egg_cooler': 'Egg cooler',
  'piece.pudding_cooler': 'Pudding cooler',
  'piece.cream_cooler': 'Cream cooler',
  'piece.butter_cooler': 'Butter cooler',
  'piece.cheese_island': 'Cheese island',
  'piece.dairy_desk': 'Dairy desk',
  'piece.dessert_island': 'Dessert island',
  'piece.dip_island': 'Dip island',
  'piece.spread_island': 'Spread island',
  'piece.sour_cream_island': 'Sour cream island',
  'piece.cheese_display': 'Cheese display',
  'piece.snack_cheese': 'Snack cheese',
  'piece.fresh_dairy_board': 'Fresh dairy board',
  'piece.recycling': 'Recycling',
  'piece.dairy_plant': 'Dairy plant',
  'piece.sign_stand': 'Sign stand',
  'piece.juice_end_cap': 'Juice end cap',
  'piece.ice_bags': 'Ice bags',
  'piece.full_basket': 'Full basket',
  'piece.wet_floor_sign': 'Wet floor sign',
  'piece.dairy_mat': 'Dairy mat',
  'piece.spare_baskets': 'Spare baskets',
  'piece.cheese_and_yogurt_chest': 'Cheese and yogurt chest',
  'piece.ice_cream_cooler': 'Ice cream cooler',
  'piece.pizza_cooler': 'Pizza cooler',
  'piece.veg_cooler': 'Veg cooler',
  'piece.popsicle_cooler': 'Popsicle cooler',
  'piece.dinner_cooler': 'Dinner cooler',
  'piece.fries_cooler': 'Fries cooler',
  'piece.ice_cream_chest': 'Ice cream chest',
  'piece.pizza_chest': 'Pizza chest',
  'piece.frozen_desk': 'Frozen desk',
  'piece.pops_chest': 'Pops chest',
  'piece.bagged_veg_chest': 'Bagged veg chest',
  'piece.waffle_chest': 'Waffle chest',
  'piece.ice_cream_deal': 'Ice cream deal',
  'piece.ice_cream_island': 'Ice cream island',
  'piece.frozen_plant': 'Frozen plant',
  'piece.meal_cooler': 'Meal cooler',
  'piece.dessert_cooler': 'Dessert cooler',
  'piece.tub_chest': 'Tub chest',
  'piece.popsicle_chest': 'Popsicle chest',
  'piece.trash_can': 'Trash can',
  'piece.cup_chest': 'Cup chest',
  'piece.cold_floor_mat': 'Cold floor mat',
  'piece.freezer_island_end': 'Freezer island end',
  'piece.beef_case': 'Beef case',
  'piece.rib_case': 'Rib case',
  'piece.sausage_case': 'Sausage case',
  'piece.fish_case': 'Fish case',
  'piece.turkey_cooler': 'Turkey cooler',
  'piece.burger_cooler': 'Burger cooler',
  'piece.seafood_cooler': 'Seafood cooler',
  'piece.rib_cooler': 'Rib cooler',
  'piece.meat_desk': 'Meat desk',
  'piece.ham_cooler': 'Ham cooler',
  'piece.meat_fridge': 'Meat fridge',
  'piece.seafood_case': 'Seafood case',
  'piece.slicer_cart': 'Slicer cart',
  'piece.meat_island': 'Meat island',
  'piece.bacon_chest': 'Bacon chest',
  'piece.ham_chest': 'Ham chest',
  'piece.sausage_chest': 'Sausage chest',
  'piece.deli_board': 'Deli board',
  'piece.meat_floor': 'Meat floor',
  'piece.brine_tubs': 'Brine tubs',
  'piece.butcher_case': 'Butcher case',
  'piece.meat_tubs': 'Meat tubs',
  'piece.cold_mat': 'Cold mat',
  'piece.service_mat': 'Service mat',
  'piece.drinks_cooler': 'Drinks cooler',
  'piece.christmas_tree': 'Christmas tree',
  'piece.present_table': 'Present table',
  'piece.ornament_shelf': 'Ornament shelf',
  'piece.candy_cane_end': 'Candy cane end',
  'piece.train_table': 'Train table',
  'piece.stocking_shelf': 'Stocking shelf',
  'piece.snowman_table': 'Snowman table',
  'piece.gift_wrap_shelf': 'Gift wrap shelf',
  'piece.gift_counter': 'Gift counter',
  'piece.spruce_tree': 'Spruce tree',
  'piece.lantern_shelf': 'Lantern shelf',
  'piece.pine_tree': 'Pine tree',
  'piece.sled_bin': 'Sled bin',
  'piece.giant_tree': 'Giant tree',
  'piece.wreath': 'Wreath',
  'piece.snow_patch': 'Snow patch',
  'piece.holiday_rug': 'Holiday rug',
  'piece.star_lantern': 'Star lantern',
  'piece.gift_bin': 'Gift bin',
  'piece.holiday_planter': 'Holiday planter',
  'piece.candy_cane': 'Candy cane',
  'piece.shelf_snowman': 'Shelf snowman',
  'piece.present_pile': 'Present pile',
  'piece.shelf_presents': 'Shelf presents',
  'piece.gingerbread': 'Gingerbread',
  'piece.stocking_topper': 'Stocking topper',
  'piece.santa_display': 'Santa display',
  'piece.shirt_rack': 'Shirt rack',
  'piece.tee_table': 'Tee table',
  'piece.window_mannequin': 'Window mannequin',
  'piece.jacket_rack': 'Jacket rack',
  'piece.coat_rack': 'Coat rack',
  'piece.sweater_table': 'Sweater table',
  'piece.kids_rack': 'Kids rack',
  'piece.suit_mannequin': 'Suit mannequin',
  'piece.cash_wrap': 'Cash wrap',
  'piece.denim_table': 'Denim table',
  'piece.sock_table': 'Sock table',
  'piece.skirt_rack': 'Skirt rack',
  'piece.hoodie_rack': 'Hoodie rack',
  'piece.window_display': 'Window display',
  'piece.hoodie_table': 'Hoodie table',
  'piece.sneaker_end': 'Sneaker end',
  'piece.boot_end': 'Boot end',
  'piece.sandal_end': 'Sandal end',
  'piece.slipper_end': 'Slipper end',
  'piece.fitting_rooms': 'Fitting rooms',
  'piece.wall_mirror': 'Wall mirror',
  'piece.kids_mannequin': 'Kids mannequin',
  'piece.clothes_plant': 'Clothes plant',
  'piece.carpet_runner': 'Carpet runner',
  'piece.hanger_boxes': 'Hanger boxes',
  'piece.hat_boxes': 'Hat boxes',
  'piece.fashion_podium': 'Fashion podium',
  'piece.ball_bin': 'Ball bin',
  'piece.dome_tent': 'Dome tent',
  'piece.skateboard_rack': 'Skateboard rack',
  'piece.camp_tent': 'Camp tent',
  'piece.bedroll_table': 'Bedroll table',
  'piece.family_tent': 'Family tent',
  'piece.camp_stove_table': 'Camp stove table',
  'piece.ice_chest': 'Ice chest',
  'piece.pro_desk': 'Pro desk',
  'piece.jersey_rack': 'Jersey rack',
  'piece.canoe': 'Canoe',
  'piece.yoga_balls': 'Yoga balls',
  'piece.turf_mat': 'Turf mat',
  'piece.climbing_wall': 'Climbing wall',
  'piece.trail_marker': 'Trail marker',
  'piece.cap_boxes': 'Cap boxes',
  'piece.camp_lantern': 'Camp lantern',
  'piece.sports_plant': 'Sports plant',
  'piece.stock_boxes': 'Stock boxes',
  'piece.tent_lantern': 'Tent lantern',
  'piece.water_bottles': 'Water bottles',
  'piece.cooler_bucket': 'Cooler bucket',
  'piece.ball_board': 'Ball board',
  'piece.spare_cone': 'Spare cone',
  'piece.camp_radio': 'Camp radio',
  'piece.ball_on_bin': 'Ball on bin',
  'piece.skateboard_showcase': 'Skateboard showcase',
  'piece.wiper_blades': 'Wiper blades',
  'piece.wheel_display': 'Wheel display',
  'piece.motor_oil': 'Motor oil',
  'piece.battery_end': 'Battery end',
  'piece.car_care': 'Car care',
  'piece.batteries': 'Batteries',
  'piece.car_accessories': 'Car accessories',
  'piece.tire_stack': 'Tire stack',
  'piece.tire_desk': 'Tire desk',
  'piece.cleaning_kits': 'Cleaning kits',
  'piece.racing_wheels': 'Racing wheels',
  'piece.traffic_cones': 'Traffic cones',
  'piece.garage_mat': 'Garage mat',
  'piece.tire_tower': 'Tire tower',
  'piece.auto_boxes': 'Auto boxes',
  'piece.auto_plant': 'Auto plant',
  'piece.jerry_can': 'Jerry can',
  'piece.oil_jug': 'Oil jug',
  'piece.tire_sale_board': 'Tire sale board',
  'piece.spare_cones': 'Spare cones',
  'piece.bay_mat': 'Bay mat',
  'piece.spare_bin': 'Spare bin',
  'piece.rim_on_unit': 'Rim on unit',
  'piece.battery_on_unit': 'Battery on unit',
  'piece.tool_chest': 'Tool chest',
  'piece.spare_wheel': 'Spare wheel',
  'piece.kart_showcase': 'Kart showcase',
  'piece.24_inch_tv': '24-inch TV',
  'piece.laptop_table': 'Laptop table',
  'piece.32_inch_tv': '32-inch TV',
  'piece.40_inch_tv': '40-inch TV',
  'piece.computer_table': 'Computer table',
  'piece.43_inch_tv': '43-inch TV',
  'piece.radio_table': 'Radio table',
  'piece.50_inch_tv': '50-inch TV',
  'piece.service_desk': 'Service desk',
  'piece.game_rack': 'Game rack',
  'piece.55_inch_tv': '55-inch TV',
  'piece.camera_box': 'Camera box',
  'piece.65_inch_tv': '65-inch TV',
  'piece.home_theater': 'Home theater',
  'piece.demo_mat': 'Demo mat',
  'piece.phone_box': 'Phone box',
  'piece.desk_plant': 'Desk plant',
  'piece.console_box': 'Console box',
  'piece.boxed_console': 'Boxed console',
  'piece.bookshelf_speaker': 'Bookshelf speaker',
  'piece.game_stack': 'Game stack',
  'piece.cable_boxes': 'Cable boxes',
  'piece.computer_mouse': 'Computer mouse',
  'piece.monitor': 'Monitor',
  'piece.desk_lamp': 'Desk lamp',
  'piece.router_box': 'Router box',
  'piece.sound_system': 'Sound system',
  'piece.sofa': 'Sofa',
  'piece.living_rug': 'Living rug',
  'piece.coffee_table': 'Coffee table',
  'piece.double_bed': 'Double bed',
  'piece.armchair': 'Armchair',
  'piece.dining_table': 'Dining table',
  'piece.night_stand': 'Night stand',
  'piece.floor_lamp': 'Floor lamp',
  'piece.home_desk': 'Home desk',
  'piece.dining_chairs': 'Dining chairs',
  'piece.sideboard': 'Sideboard',
  'piece.bedroom_rug': 'Bedroom rug',
  'piece.washer_and_dryer': 'Washer and dryer',
  'piece.entertainment_center': 'Entertainment center',
  'piece.bookcase': 'Bookcase',
  'piece.bed_lamp': 'Bed lamp',
  'piece.fridge': 'Fridge',
  'piece.newspaper_rack': 'Newspaper rack',
  'piece.potted_palm': 'Potted palm',
  'piece.dining_rug': 'Dining rug',
  'piece.side_table': 'Side table',
  'piece.runner_rug': 'Runner rug',
  'piece.corner_lamp': 'Corner lamp',
  'piece.shelf_plant': 'Shelf plant',
  'piece.range': 'Range',
  'piece.table_lamp': 'Table lamp',
  'piece.dresser': 'Dresser',
  'piece.toy_car_shelf': 'Toy car shelf',
  'piece.monster_truck_end': 'Monster truck end',
  'piece.block_table': 'Block table',
  'piece.claw_machine': 'Claw machine',
  'piece.plush_pegs': 'Plush pegs',
  'piece.board_game_shelf': 'Board game shelf',
  'piece.gacha_machine': 'Gacha machine',
  'piece.puzzle_pegs': 'Puzzle pegs',
  'piece.toy_desk': 'Toy desk',
  'piece.plush_table': 'Plush table',
  'piece.building_set_end': 'Building set end',
  'piece.toy_racer': 'Toy racer',
  'piece.plush_fish': 'Plush fish',
  'piece.building_set_stack': 'Building set stack',
  'piece.toy_truck': 'Toy truck',
  'piece.plush_cat': 'Plush cat',
  'piece.toy_sale_board': 'Toy sale board',
  'piece.block_tower': 'Block tower',
  'piece.play_mat': 'Play mat',
  'piece.monster_truck': 'Monster truck',
  'piece.card_game_box': 'Card game box',
  'piece.puzzle_box': 'Puzzle box',
  'piece.toy_train': 'Toy train',
  'piece.jigsaw_box': 'Jigsaw box',
  'piece.plush_pile': 'Plush pile',
  'piece.game_mat': 'Game mat',
  'piece.giant_plush': 'Giant plush',
  'piece.novel_shelf': 'Novel shelf',
  'piece.book_end': 'Book end',
  'piece.cookbook_shelf': 'Cookbook shelf',
  'piece.notebook_table': 'Notebook table',
  'piece.kids_book_shelf': 'Kids book shelf',
  'piece.notebook_pegs': 'Notebook pegs',
  'piece.stationery_table': 'Stationery table',
  'piece.pen_pegs': 'Pen pegs',
  'piece.book_desk': 'Book desk',
  'piece.paper_shelf': 'Paper shelf',
  'piece.magazine_rack': 'Magazine rack',
  'piece.book_stack': 'Book stack',
  'piece.bestsellers': 'Bestsellers',
  'piece.art_supplies': 'Art supplies',
  'piece.office_plant': 'Office plant',
  'piece.paper_boxes': 'Paper boxes',
  'piece.planner_box': 'Planner box',
  'piece.globe_light': 'Globe light',
  'piece.pencil_box': 'Pencil box',
  'piece.paper_header': 'Paper header',
  'piece.reading_mat': 'Reading mat',
  'piece.book_pile': 'Book pile',
  'piece.magazine_pile': 'Magazine pile',
  'piece.journals': 'Journals',
  'piece.sticky_notes': 'Sticky notes',
  'piece.big_book_stack': 'Big book stack',
  'piece.hammer_pegs': 'Hammer pegs',
  'piece.hammer_end': 'Hammer end',
  'piece.paint_shelf': 'Paint shelf',
  'piece.workbench': 'Workbench',
  'piece.fastener_shelf': 'Fastener shelf',
  'piece.hand_tool_pegs': 'Hand tool pegs',
  'piece.bucket_shelf': 'Bucket shelf',
  'piece.tool_desk': 'Tool desk',
  'piece.tape_and_glue_shelf': 'Tape and glue shelf',
  'piece.axe_and_pick_end': 'Axe and pick end',
  'piece.bolt_bin': 'Bolt bin',
  'piece.paint_tin': 'Paint tin',
  'piece.tool_wall': 'Tool wall',
  'piece.mallet_rack': 'Mallet rack',
  'piece.plier_rack': 'Plier rack',
  'piece.tool_deal': 'Tool deal',
  'piece.primer_tin': 'Primer tin',
  'piece.nail_bin': 'Nail bin',
  'piece.paint_pile': 'Paint pile',
  'piece.brush_pot': 'Brush pot',
  'piece.claw_hammer_rack': 'Claw hammer rack',
  'piece.hand_saw_rack': 'Hand saw rack',
  'piece.nut_bin': 'Nut bin',
  'piece.workshop_mat': 'Workshop mat',
  'piece.axe_and_crowbar_rack': 'Axe and crowbar rack',
  'piece.lumber_rack': 'Lumber rack',
  'piece.pot_gondola': 'Pot gondola',
  'piece.knife_end_cap': 'Knife end cap',
  'piece.pan_gondola': 'Pan gondola',
  'piece.display_range': 'Display range',
  'piece.plate_gondola': 'Plate gondola',
  'piece.bowl_gondola': 'Bowl gondola',
  'piece.display_sink': 'Display sink',
  'piece.mug_gondola': 'Mug gondola',
  'piece.kitchen_desk': 'Kitchen desk',
  'piece.glass_gondola': 'Glass gondola',
  'piece.pan_end_cap': 'Pan end cap',
  'piece.coffee_maker': 'Coffee maker',
  'piece.toaster': 'Toaster',
  'piece.pot_tower': 'Pot tower',
  'piece.blender': 'Blender',
  'piece.microwave': 'Microwave',
  'piece.cookware_deal': 'Cookware deal',
  'piece.knife_block': 'Knife block',
  'piece.plate_stack': 'Plate stack',
  'piece.cookware_bin': 'Cookware bin',
  'piece.stand_mixer': 'Stand mixer',
  'piece.cast_iron_pan': 'Cast iron pan',
  'piece.mixing_bowls': 'Mixing bowls',
  'piece.mug_tree': 'Mug tree',
  'piece.pitcher': 'Pitcher',
  'piece.cook_mat': 'Cook mat',
  'piece.big_pot': 'Big pot',

  // The texts below are used by the iOS and Android shells, not by the game page. scripts/gen_native.mjs copies them into
  // InfoPlist.strings, Localizable.strings and strings.xml. Same rules as above: keep {placeholders}, keep it short.

  // Name under the app icon on the iPhone home screen. A brand: usually unchanged. Max about 14 characters.
  'native.ios.display_name': 'Main Street',
  // Shown by iOS in the "allow tracking" permission box. It explains why the app asks. Keep it friendly and accurate: ads are shown either way.
  'native.ios.tracking': 'Your device identifier is used to show ads that fit you better. Saying no still shows ads, just less relevant ones.',
  // Title of the reminder notifications (for example "Your store is full"). A brand: usually unchanged.
  'native.notification_title': 'Main Street',
  // Button of a system dialog.
  'native.ok': 'OK',
  // Button of a system dialog.
  'native.cancel': 'Cancel',
  // Name under the app icon on Android and in its settings. Max about 16 characters.
  'native.android.app_name': 'Main Street Idle',
  // Name of the notification category in Android's settings, where the player can turn the reminders off.
  'native.android.channel_name': 'Reminders',
  // Shown instead of the game when Android System WebView is too old to run it.
  'native.android.webview_old': 'Main Street needs a newer Android System WebView.',
  // Button under the previous text; opens the page in Google Play where the player updates WebView.
  'native.android.update': 'Update'
};
