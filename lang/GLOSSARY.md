# Translator notes

Read the header of `en.js` first for the file format. Translate into `lang/<code>.js` (the stubs are already there), then run
`node scripts/check_lang.mjs <code>`; it must report 0 errors. Run `node scripts/gen_native.mjs` afterwards to write the iOS
and Android texts (the `native.*` keys).

To see your work in the game, open `index.html?lang=<code>` in a browser (served over http, for example `python -m http.server`).
Arabic, Hebrew and Urdu switch the layout to right to left by themselves.

## What the game is

A phone idle game. The player runs a supermarket that grows into a supercenter. Shoppers come in, buy things from the
departments and pay at the checkouts. The player spends the money on upgrades, which add one visible piece (a shelf, a
sign, a clerk) to the 3D store at a time. When the store is big enough the player moves to a new store: everything resets
except reputation, which buys permanent perks.

## Tone

Friendly, short, casual, like a mobile game for everyone, including children. Plain everyday words. No jokes that depend on
English wordplay, no slang that will age. Address the player informally where the language has the choice. Sentences are
short; a button says what it does.

## Terms

| English | Meaning |
| --- | --- |
| shopper | A customer walking through the store. Not a "buyer" in a business sense. |
| stocker | A worker who carries boxes from the stockroom to the shelves. |
| dolly | The hand truck (trolley) a stocker pushes boxes with. "A box more on every dolly" = the dolly carries one more box. |
| stockroom | The back room where boxes wait. Also the name of the place the player upgrades to get more stockers. |
| checkout, till | A cash register lane where a cashier (or a self checkout machine) takes the shoppers' money. "Lane" is one checkout. |
| self checkout | A machine where shoppers pay without a cashier. |
| department | A section of the store (Produce, Bakery, Dairy...). The player opens departments one after another. |
| upgrade | A purchase that makes a department better. Each one adds a piece to the store. |
| piece | One visible thing added by an upgrade: a table, a sign, a clerk. Names are in the `piece.*` keys. |
| rush | A burst of extra shoppers for a short time. A tap on a till serves its front shopper faster. "Rush" is also the name of the event, not the verb. |
| flash sale | A short rush with a sale: a variant of the event. |
| tour bus | The other kind of rush: a bus unloads shoppers. |
| combo | Several fast taps in a row during a rush, each adding a little more speed. |
| perk | A permanent bonus bought with reputation. Survives moving to a new store. |
| reputation, rep | The points the player earns when moving to a new store (one for each star and each open department). Spent on perks. |
| star | An award a department earns at levels 10, 20 and 30. Each star multiplies that department's sales and pays gems. Do not confuse with the star icon of reputation. |
| gems | The premium currency, earned in the game or bought in the shop. Plural, short. |
| store move, "New store" | The reset. "Store" here is the whole supermarket the player runs, not a shop item. Store 1, Store 2... |
| VIP | A gold shopper who now and then walks in and gives a tip when tapped. |
| jackpot | A rare big gift: a lot of cash or a long x2. |
| gift | A present that appears on the street for some seconds; the player taps it for cash, gems or x2. |
| regulars | Named shoppers who start coming once the player reaches a goal; each adds a little to sales. |
| boost | A temporary helper: Double income, Time warp, Call a rush. |
| x2 | Income times two. Keep "x2" as is unless your language writes it differently. |
| time warp | Instantly collects the income of the next hour. |
| mission | One of three small daily tasks. |
| daily reward | A reward for opening the game seven days in a row. |
| away earnings | What the store earned while the game was closed (up to 8 hours). |
| goal | The task shown at the top of the screen, with a Claim button. |
| achievement | A long-term goal with bronze, silver and gold levels. |
| store look | The colour theme of the floors, walls and signs. Only changes looks. |

## Do not translate

* The game name "Main Street" (a brand); `app.title` and the `native.*` names may keep it. A language may use an established local form if one exists.
* Radio station names and song titles and artists, and the credits (names of asset makers). Only the label words around them.
* Currency: the game uses a made-up "$" (money) and the compact suffixes K, M, B, T. Translators may change the suffix list in
  `num.suffixes` and the position of the sign in `num.money`, but every number must stay Latin digits.
* Placeholders in braces, tags such as `<b>`, and `\n` line breaks. Keep the same number of line breaks.

## Length

Texts are shown on small phones. Keep to these limits (characters, counted with spaces) or shorter; notes in `en.js` repeat
them for the tight ones. The game squeezes text on 3D signs, but a long one gets tiny.

| Where | Limit |
| --- | --- |
| Bottom tabs (`tab.*`) | 11 |
| Top bar pills (rate, store, warnings, rush name) | 14 |
| Tiny badges under the round buttons (`hud.free`, `hud.deal.today`, `hud.x2_badge`) | 8 |
| Buttons | 14, two short lines at most |
| Department names | 18 |
| Item and piece names | 26 |
| 3D signs and boards (`sign.*`, `board.*`) | 16 per line; the English ones are upper case, write yours in the case a real shop sign would use |
| Banners (title) | 28; the small line under it 48 |
| Other sentences | free, but keep them close to the English length |

Plural texts: give every plural category your language needs (the check script says which). `{n}` is the number.
