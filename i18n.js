// Text for the game. Strings live in lang/<code>.js, each one setting LANG['<code>'] (lang/en.js explains the format).
// tl(key, vars) looks a key up in the chosen language, then in English, then returns the key itself.
//
// The language files are written into the page here, before the game scripts, so every text exists when the game
// starts and nothing flashes in English. Changing the language in the menu saves the game and reloads the page.

var LANG = {};

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
var LANG_KEY = 'mainstreet.lang';

// Lilita One only has Latin letters. Everything else falls to the phone's own fonts, listed per script because the
// system fallback is not always the nicest one (Urdu wants Nastaliq, Japanese and Chinese need their own forms).
var FONT_BASE = 'ui-rounded, "SF Pro Rounded", system-ui, -apple-system, "Segoe UI", Roboto';
var FONT_TAIL = '"Noto Sans", "Helvetica Neue", Arial, sans-serif';
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

var I18N = { code: 'en', locale: 'en', rtl: false };

function langEntry(code) {
  for (var i = 0; i < LANGS.length; i++) if (LANGS[i][0] === code) return LANGS[i];
  return null;
}

// the best of our languages for one tag from navigator.languages
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

function pickLang() {
  var q = /[?&]lang=([\w-]+)/.exec(location.search);
  var saved = '';
  try {
    saved = localStorage.getItem(LANG_KEY) || '';
  } catch (e) {}
  if (q && langEntry(q[1])) return q[1];
  if (langEntry(saved)) return saved;
  var all = navigator.languages && navigator.languages.length ? navigator.languages : [navigator.language || 'en'];
  for (var i = 0; i < all.length; i++) {
    var c = langFor(all[i]);
    if (c) return c;
  }
  return 'en';
}

(function () {
  var code = pickLang();
  var e = langEntry(code) || langEntry('en');
  I18N.code = e[0];
  I18N.locale = e[2];
  I18N.rtl = !!e[3];
  var h = document.documentElement;
  h.lang = e[2];
  h.dir = I18N.rtl ? 'rtl' : 'ltr';
  if (FONT_SCRIPT[e[0]] && !/^(ja|ko|zh)/.test(e[0])) h.className = 'cx';
  // the stack for the page (CSS var --sys) and for text drawn on canvases
  I18N.font = [FONT_BASE, FONT_SCRIPT[e[0]], FONT_TAIL].filter(Boolean).join(', ');
  h.style.setProperty('--sys', I18N.font);
  h.style.setProperty('--head', '"Lilita One", ' + I18N.font);
  document.write('<script src="lang/en.js"><\/script>');
  if (e[0] !== 'en') document.write('<script src="lang/' + e[0] + '.js"><\/script>');
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

var PR = null;
function pluralCat(n) {
  if (!PR) {
    try {
      PR = new Intl.PluralRules(I18N.locale);
    } catch (e) {
      PR = { select: function (x) { return x === 1 ? 'one' : 'other'; } };
    }
  }
  return PR.select(n);
}

// minutes after midnight as the language writes the time of day (12 or 24 hours)
function fmtClock(min) {
  var d = new Date(2000, 0, 1, 0, Math.floor(min));
  try {
    return new Intl.DateTimeFormat(I18N.locale + '-u-nu-latn', { hour: 'numeric', minute: '2-digit' }).format(d).replace(/\u202f/g, ' ');
  } catch (e) {
    return d.getHours() + ':' + ('0' + d.getMinutes()).slice(-2);
  }
}

// a number for the text: grouped like the language does it, up to two decimals
function fmtn(v) {
  return numFmt(2).format(v);
}

// tl('goal.serve', { n: 1000 }): {name} marks are filled from vars, numbers are formatted. A table value that is an
// object holds one text per plural category (one, other, few, ...), picked by vars.n
function tl(key, v) {
  var s = LANG[I18N.code] && LANG[I18N.code][key];
  if (s === undefined || s === '') s = LANG.en[key];
  if (s === undefined) return key;
  if (typeof s === 'object') s = s[pluralCat(v && v.n)] || s.other;
  if (!v) return s;
  return s.replace(/\{(\w+)\}/g, function (m, k) {
    if (!(k in v)) return m;
    var x = typeof v[k] === 'number' ? fmtn(v[k]) : v[k];
    // numbers and money keep their own left to right order inside right to left text
    return I18N.rtl && /\d/.test(x) ? '\u2066' + x + '\u2069' : x;
  });
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

function setLang(code) {
  if (!langEntry(code) || code === I18N.code) return;
  try {
    localStorage.setItem(LANG_KEY, code);
  } catch (e) {}
  if (typeof save === 'function') save();
  location.replace(location.pathname);
}
