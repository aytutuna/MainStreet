// Text for the game. Strings live in lang/<code>.js, each one setting LANG['<code>'] (lang/en.js explains the format).
// tl(key, vars) looks a key up in the chosen language, then in English, then returns the key itself.
//
// The language files are written into the page here, before the game scripts, so every text exists when the game
// starts and nothing flashes in English. Changing the language in the menu saves the game and reloads the page.

var LANG = {};
LANG.en = {};

// code, name in its own language, locale for Intl, right to left. Files are named after the code.
var LANGS = [
  ['en', 'English', 'en'],
  ['ar', 'العربية', 'ar', 1],
  ['bn', 'বাংলা', 'bn'],
  ['ca', 'Català', 'ca'],
  ['cs', 'Čeština', 'cs'],
  ['da', 'Dansk', 'da'],
  ['de', 'Deutsch', 'de'],
  ['el', 'Ελληνικά', 'el'],
  ['es-ES', 'Español (España)', 'es-ES'],
  ['es-MX', 'Español (México)', 'es-MX'],
  ['fi', 'Suomi', 'fi'],
  ['fr-FR', 'Français (France)', 'fr-FR'],
  ['fr-CA', 'Français (Canada)', 'fr-CA'],
  ['gu', 'ગુજરાતી', 'gu'],
  ['he', 'עברית', 'he', 1],
  ['hi', 'हिन्दी', 'hi'],
  ['hr', 'Hrvatski', 'hr'],
  ['hu', 'Magyar', 'hu'],
  ['id', 'Bahasa Indonesia', 'id'],
  ['it', 'Italiano', 'it'],
  ['ja', '日本語', 'ja'],
  ['kn', 'ಕನ್ನಡ', 'kn'],
  ['ko', '한국어', 'ko'],
  ['ml', 'മലയാളം', 'ml'],
  ['mr', 'मराठी', 'mr'],
  ['ms', 'Bahasa Melayu', 'ms'],
  ['nl', 'Nederlands', 'nl'],
  ['no', 'Norsk bokmål', 'nb'],
  ['or', 'ଓଡ଼ିଆ', 'or'],
  ['pa', 'ਪੰਜਾਬੀ', 'pa'],
  ['pl', 'Polski', 'pl'],
  ['pt-BR', 'Português (Brasil)', 'pt-BR'],
  ['pt-PT', 'Português (Portugal)', 'pt-PT'],
  ['ro', 'Română', 'ro'],
  ['ru', 'Русский', 'ru'],
  ['sk', 'Slovenčina', 'sk'],
  ['sl', 'Slovenščina', 'sl'],
  ['sv', 'Svenska', 'sv'],
  ['ta', 'தமிழ்', 'ta'],
  ['te', 'తెలుగు', 'te'],
  ['th', 'ไทย', 'th'],
  ['tr', 'Türkçe', 'tr'],
  ['uk', 'Українська', 'uk'],
  ['ur', 'اردو', 'ur', 1],
  ['vi', 'Tiếng Việt', 'vi'],
  ['zh-Hans', '简体中文', 'zh-Hans'],
  ['zh-Hant', '繁體中文', 'zh-Hant']
];
// The languages that have translations. Only these are picked from the phone's language and offered in the menu; the
// rest of LANGS are empty files waiting for translators. scripts/gen_native.mjs rewrites this line.
var LANG_READY = ['en', 'ar', 'bn', 'ca', 'cs', 'da', 'de', 'el', 'es-ES', 'es-MX', 'fi', 'fr-FR', 'fr-CA', 'gu', 'he', 'hi', 'hr', 'hu', 'id', 'it', 'ja', 'kn', 'ko', 'ml', 'mr', 'ms', 'nl', 'no', 'or', 'pa', 'pl', 'pt-BR', 'pt-PT', 'ro', 'ru', 'sk', 'sl', 'sv', 'ta', 'te', 'th', 'tr', 'uk', 'ur', 'vi', 'zh-Hans', 'zh-Hant'];
var LANG_KEY = 'mainstreet.lang';

// Lilita One only has Latin letters. Everything else falls to the phone's own fonts, listed per script because the
// system fallback is not always the nicest one (Urdu wants Nastaliq, Japanese and Chinese need their own forms).
// They come before the generic families, which would otherwise answer first.
var FONT_BASE = 'ui-rounded, "SF Pro Rounded"';
var FONT_TAIL = 'system-ui, -apple-system, "Segoe UI", Roboto, "Noto Sans", "Helvetica Neue", Arial, sans-serif';
var FONT_SCRIPT = {
  ja: '"Hiragino Maru Gothic ProN", "Hiragino Sans", "Noto Sans CJK JP", "Noto Sans JP", "Yu Gothic"',
  ko: '"Apple SD Gothic Neo", "Noto Sans CJK KR", "Noto Sans KR", "Malgun Gothic"',
  'zh-Hans': '"PingFang SC", "Noto Sans CJK SC", "Noto Sans SC", "Microsoft YaHei"',
  'zh-Hant': '"PingFang TC", "Noto Sans CJK TC", "Noto Sans TC", "Microsoft JhengHei"',
  ar: '"Geeza Pro", "Noto Sans Arabic", "Noto Naskh Arabic"',
  ur: '"Noto Nastaliq Urdu", "Noto Naskh Arabic", "Geeza Pro", "Noto Sans Arabic"',
  he: '"Arial Hebrew", "Noto Sans Hebrew", "Heebo"',
  th: '"Thonburi", "Sukhumvit Set", "Noto Sans Thai"',
  hi: '"Kohinoor Devanagari", "Devanagari Sangam MN", "Noto Sans Devanagari"',
  mr: '"Kohinoor Devanagari", "Devanagari Sangam MN", "Noto Sans Devanagari"',
  bn: '"Kohinoor Bangla", "Bangla Sangam MN", "Noto Sans Bengali"',
  gu: '"Kohinoor Gujarati", "Gujarati Sangam MN", "Noto Sans Gujarati"',
  pa: '"Gurmukhi MN", "Noto Sans Gurmukhi"',
  kn: '"Kannada Sangam MN", "Noto Sans Kannada"',
  ml: '"Malayalam Sangam MN", "Noto Sans Malayalam"',
  or: '"Oriya Sangam MN", "Noto Sans Oriya"',
  ta: '"Tamil Sangam MN", "Noto Sans Tamil"',
  te: '"Kohinoor Telugu", "Telugu Sangam MN", "Noto Sans Telugu"'
};

var I18N = { code: 'en', locale: 'en', rtl: false, script: '' };

function langEntry(code) {
  for (var i = 0; i < LANGS.length; i++) if (LANGS[i][0] === code) return LANGS[i];
  return null;
}

// the best of our languages for one tag from navigator.languages. Regions we have no file for share the nearest one:
// any Spanish but Spain's is Latin American, any French but Canada's is France's, any Portuguese but Brazil's is Portugal's
function langFor(tag) {
  var p = String(tag).replace(/_/g, '-').split('-');
  var l = p[0].toLowerCase();
  var script = '';
  var region = '';
  for (var i = 1; i < p.length; i++) {
    if (p[i].length === 4) script = p[i].toLowerCase();
    else if (p[i].length === 2 || p[i].length === 3) region = p[i].toUpperCase();
  }
  if (l === 'iw') l = 'he';
  if (l === 'in') l = 'id';
  if (l === 'nb' || l === 'nn') l = 'no';
  if (l === 'zh') return script === 'hant' || /^(TW|HK|MO)$/.test(region) ? 'zh-Hant' : 'zh-Hans';
  if (l === 'pt') return region && region !== 'BR' ? 'pt-PT' : 'pt-BR';
  if (l === 'es') return region && region !== 'ES' ? 'es-MX' : 'es-ES';
  if (l === 'fr') return region === 'CA' ? 'fr-CA' : 'fr-FR';
  return langEntry(l) ? l : '';
}

function ready(code) {
  return LANG_READY.indexOf(code) >= 0;
}

function pickLang() {
  var q = /[?&]lang=([\w-]+)/.exec(location.search);
  var saved = '';
  try {
    saved = localStorage.getItem(LANG_KEY) || '';
  } catch (e) {}
  // ?lang= takes any language, so a translator can look at a file that is not released yet
  if (q && langEntry(q[1])) return q[1];
  if (ready(saved)) return saved;
  var all = navigator.languages && navigator.languages.length ? navigator.languages : [navigator.language || 'en'];
  for (var i = 0; i < all.length; i++) {
    var c = langFor(all[i]);
    if (ready(c)) return c;
  }
  return 'en';
}

// runs once the language file is in: a language whose file turned out empty is not used at all, so numbers, clock,
// plurals and direction stay English too
function setupLang(code) {
  var t = LANG[code];
  if (code !== 'en' && !(t && Object.keys(t).length)) code = 'en';
  var e = langEntry(code);
  I18N.code = code;
  I18N.locale = e[2];
  I18N.rtl = !!e[3];
  I18N.script = FONT_SCRIPT[code] || '';
  var h = document.documentElement;
  h.lang = e[2];
  h.dir = I18N.rtl ? 'rtl' : 'ltr';
  if (I18N.script && !/^(ja|ko|zh)/.test(code)) h.classList.add('cx');
  // Lilita One only draws Latin, so these languages fall to a system font, which needs its own bold
  if (I18N.script || /^(ru|uk|el|vi)$/.test(code)) h.classList.add('fb');
  // the stack for the page (CSS var --sys) and for text drawn on canvases
  I18N.font = [FONT_BASE, I18N.script, FONT_TAIL].filter(Boolean).join(', ');
  h.style.setProperty('--sys', I18N.font);
  h.style.setProperty('--head', '"Lilita One", ' + I18N.font);
}

(function () {
  var code = pickLang();
  document.write('<script src="lang/en.js"><\/script>');
  if (code !== 'en') document.write('<script src="lang/' + code + '.js"><\/script>');
  document.write('<script>setupLang("' + code + '")<\/script>');
})();

// digits stay Latin in every language: the short money style puts Latin letters (K, M) behind the number
var NF = {};
function numFmt(max) {
  if (!NF[max]) {
    try {
      NF[max] = new Intl.NumberFormat(I18N.locale + '-u-nu-latn', { maximumFractionDigits: max });
    } catch (e) {
      NF[max] = { format: String };
    }
  }
  return NF[max];
}

// plural rules for the language, or for English when the text itself fell back to English
var PR = {};
function pluralCat(n, locale) {
  locale = locale || I18N.locale;
  if (!PR[locale]) {
    try {
      PR[locale] = new Intl.PluralRules(locale);
    } catch (e) {
      PR[locale] = { select: function (x) { return x === 1 ? 'one' : 'other'; } };
    }
  }
  return PR[locale].select(n);
}

// minutes after midnight as the language writes the time of day (12 or 24 hours)
var CLOCK_FMT = null;
function fmtClock(min) {
  var d = new Date(2000, 0, 1, 0, Math.floor(min));
  if (!CLOCK_FMT) {
    try {
      CLOCK_FMT = new Intl.DateTimeFormat(I18N.locale + '-u-nu-latn', { hour: 'numeric', minute: '2-digit' });
    } catch (e) {
      CLOCK_FMT = { format: function (x) { return x.getHours() + ':' + ('0' + x.getMinutes()).slice(-2); } };
    }
  }
  return isolate(CLOCK_FMT.format(d).replace(/ /g, ' '));
}

// a number for the text: grouped like the language does it, up to two decimals
function fmtn(v) {
  return numFmt(2).format(v);
}

// the text for key and the locale whose plural rules apply to it; plural objects fall back to 'other'
function lookup(table, key, v, locale) {
  var s = table && table[key];
  if (typeof s === 'object' && s) s = s[pluralCat(v && v.n, locale)] || s.other;
  return typeof s === 'string' && s ? s : undefined;
}

// tl('goal.serve', { n: 1000 }): {name} marks are filled from vars, numbers are formatted. A table value that is an
// object holds one text per plural category (one, other, few, ...), picked by vars.n
function tl(key, v) {
  var s = lookup(LANG[I18N.code], key, v);
  if (s === undefined) s = lookup(LANG.en, key, v, 'en');
  if (s === undefined) return key;
  if (!v) return s;
  // a placeholder with a sign, a % or a letter stuck to it, or two joined by / or :, is one left to right run
  if (I18N.rtl) s = s.replace(/[+\-−]?[A-Za-z]*\{\w+\}(?:[\/:]\{\w+\})*%?/g, function (m) {
    return /^\{\w+\}$/.test(m) ? m : '⁦' + m + '⁩';
  });
  s = s.replace(/\{(\w+)\}/g, function (m, k) {
    if (!(k in v)) return m;
    var x = typeof v[k] === 'number' ? fmtn(v[k]) : v[k];
    // a number or money amount keeps its own left to right order inside right to left text
    return I18N.rtl && /^\S*\d\S*$/.test(x) ? '⁦' + x + '⁩' : x;
  });
  return isolate(s);
}

// a text with Latin letters or digits and no Arabic or Hebrew letters (Urdu's +$638/s) reads left to right as a whole
// a sign, a number and the text beside it that must keep their order in right to left text: +$5K, +3, +12%
function plus(t) {
  return I18N.rtl ? '⁦+' + t + '⁩' : '+' + t;
}

function isolate(s) {
  return I18N.rtl && !/[֐-ࣿ]/.test(s) && /[A-Za-z0-9]/.test(s) ? '⁦' + s + '⁩' : s;
}

// fills the static texts of the page: data-t is the text, data-t-html text with markup, data-t-aria, data-t-title and data-t-ph the attributes
function applyText(root) {
  var all = (root || document).querySelectorAll('[data-t],[data-t-html],[data-t-aria],[data-t-title],[data-t-ph]');
  for (var i = 0; i < all.length; i++) {
    var e = all[i];
    if (e.dataset.t) e.textContent = tl(e.dataset.t);
    if (e.dataset.tHtml) e.innerHTML = tl(e.dataset.tHtml);
    if (e.dataset.tAria) e.setAttribute('aria-label', tl(e.dataset.tAria));
    if (e.dataset.tTitle) e.title = tl(e.dataset.tTitle);
    if (e.dataset.tPh) e.placeholder = tl(e.dataset.tPh);
  }
  document.title = tl('app.title');
}

var langWait = '';

function setLang(code) {
  if (!ready(code) || code === I18N.code) return;
  // a purchase in flight finishes first, since its answer would reach the page that is going away; the last pick wins
  if (typeof buying === 'string' && buying) {
    if (!langWait) setTimeout(function () {
      var c = langWait;
      langWait = '';
      setLang(c);
    }, 500);
    langWait = code;
    return;
  }
  langWait = '';
  try {
    localStorage.setItem(LANG_KEY, code);
  } catch (e) {}
  if (typeof save === 'function') save();
  location.replace(location.pathname);
}
