// Checks language files against lang/en.js.
//   node scripts/check_lang.mjs de fr-CA     check these languages
//   node scripts/check_lang.mjs --all        check every language file
//   --partial                                a missing key is a warning, not an error (work in progress)
// Errors: a key that English does not have, an empty text, placeholders ({name}) that differ from English, a plural that
// does not give exactly the categories the language needs (Intl.PluralRules), a text where English has a plural (or the
// other way round), different <b> tags or line breaks. Exit status 1 when there is an error.
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const partial = args.includes('--partial');
const langs = [...fs.readFileSync(path.join(root, 'i18n.js'), 'utf8').match(/var LANGS = (\[[\s\S]*?\n\]);/)[1].matchAll(/^  \['([\w-]+)', '[^']*', '([\w-]+)'/gm)]
  .map(m => ({ code: m[1], locale: m[2] }));

function load(code) {
  const ctx = { LANG: {} };
  vm.runInNewContext(fs.readFileSync(path.join(root, 'lang', code + '.js'), 'utf8'), ctx);
  return ctx.LANG[code];
}

const holes = s => (s.match(/\{\w+\}/g) || []).sort().join(' ');
const tags = s => (s.match(/<\/?\w+>/g) || []).join('');
const breaks = s => s.split('\n').length;
const en = load('en');

function check(code) {
  const l = langs.find(x => x.code === code);
  if (!l) return ['unknown language code ' + code];
  const t = load(code);
  if (!t) return [`lang/${code}.js does not set LANG['${code}']`];
  const errors = [];
  const warns = [];
  const cats = new Intl.PluralRules(l.locale).resolvedOptions().pluralCategories;
  for (const k of Object.keys(t)) if (!(k in en)) errors.push(`extra key ${k}`);
  for (const k of Object.keys(en)) {
    const e = en[k];
    const v = t[k];
    if (v === undefined) { (partial ? warns : errors).push(`missing ${k}`); continue; }
    if (typeof e === 'object') {
      if (typeof v !== 'object') { errors.push(`${k}: needs a plural { ${cats.join(', ')} }`); continue; }
      const have = Object.keys(v);
      for (const c of cats) if (!have.includes(c)) errors.push(`${k}: plural category ${c} missing (this language needs ${cats.join(', ')})`);
      for (const c of have) if (!cats.includes(c)) errors.push(`${k}: plural category ${c} is not used by this language (${cats.join(', ')})`);
      for (const c of have) {
        const s = v[c];
        if (typeof s !== 'string' || !s.trim()) { errors.push(`${k}.${c}: empty`); continue; }
        const want = holes(e.other);
        // a singular form may leave the number out ("one gem" as "a gem")
        const single = ['one', 'two', 'zero'].includes(c) && holes(s) === want.replace(/\{n\}\s?/, '').trim();
        if (holes(s) !== want && !single) errors.push(`${k}.${c}: placeholders "${holes(s)}" differ from English "${want}"`);
        if (tags(s) !== tags(e.other)) errors.push(`${k}.${c}: tags differ from English`);
      }
      continue;
    }
    if (typeof v !== 'string') { errors.push(`${k}: must be a text, not a plural`); continue; }
    if (!v.trim()) { errors.push(`${k}: empty`); continue; }
    if (holes(v) !== holes(e)) errors.push(`${k}: placeholders "${holes(v)}" differ from English "${holes(e)}"`);
    if (tags(v) !== tags(e)) errors.push(`${k}: tags differ from English`);
    if (breaks(v) !== breaks(e)) errors.push(`${k}: line breaks differ from English (${breaks(e)} expected)`);
  }
  return { errors, warns, done: Object.keys(t).length };
}

const codes = args.includes('--all') ? langs.map(l => l.code).filter(c => c !== 'en') : args.filter(a => !a.startsWith('--'));
if (!codes.length) {
  console.log('usage: node scripts/check_lang.mjs <code>... | --all [--partial]');
  process.exit(2);
}
let bad = 0;
for (const code of codes) {
  const r = check(code);
  if (Array.isArray(r)) { console.log(code + ': ' + r.join('; ')); bad++; continue; }
  console.log(`${code}: ${r.done} of ${Object.keys(en).length} keys, ${r.errors.length} errors${r.warns.length ? ', ' + r.warns.length + ' missing' : ''}`);
  for (const e of r.errors.slice(0, 40)) console.log('  ' + e);
  if (r.errors.length > 40) console.log(`  ... ${r.errors.length - 40} more`);
  if (r.errors.length) bad++;
}
// A text that is still English in every language was added without being translated; the per-language check only sees missing keys.
if (args.includes('--all')) {
  const all = codes.map(load);
  const same = Object.keys(en).filter(k => /\p{L}{3}/u.test(JSON.stringify(en[k]).replace(/\{\w+\}/g, ''))
    && !/^(native\.|app\.title$|reg\.vip\.name$)/.test(k) && all.every(t => t && JSON.stringify(t[k]) === JSON.stringify(en[k])));
  for (const k of same) console.log(`untranslated in every language: ${k}`);
  if (same.length) bad++;
}
process.exit(bad ? 1 : 0);
