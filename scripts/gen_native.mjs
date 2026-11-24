// Writes the texts of the iOS and Android shells from the language files (the native.* keys):
//   ios/MainStreet/<lang>.lproj/InfoPlist.strings and Localizable.strings
//   android/app/src/main/res/values[-<qualifier>]/strings.xml and res/xml/locales_config.xml
// and the lists of languages that have translations: CFBundleLocalizations in Info.plist, locales_config.xml and
// LANG_READY in i18n.js (the languages the game picks and offers). A language counts once its file has any entry.
// Run it from anywhere: node scripts/gen_native.mjs
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const i18n = path.join(root, 'i18n.js');
const src = fs.readFileSync(i18n, 'utf8');
const codes = [...src.match(/var LANGS = (\[[\s\S]*?\n\]);/)[1].matchAll(/^  \['([\w-]+)'/gm)].map(m => m[1]);

function load(code) {
  const ctx = { LANG: {} };
  vm.runInNewContext(fs.readFileSync(path.join(root, 'lang', code + '.js'), 'utf8'), ctx);
  return ctx.LANG[code] || {};
}

const en = load('en');
const keys = Object.keys(en).filter(k => k.startsWith('native.'));

// Apple's ids: es is the Spain file and es-419 (Latin America) the Mexico one, fr is France, Norwegian is nb
const lproj = code => ({ 'es-ES': 'es', 'es-MX': 'es-419', 'fr-FR': 'fr', no: 'nb' }[code] || code);
const android = code => {
  if (code === 'en') return '';
  if (code === 'no') return '-nb';
  if (code.startsWith('zh-')) return '-b+zh+' + code.slice(3);
  const m = /^(\w+)-(\w+)$/.exec(code);
  return m ? `-${m[1]}-r${m[2]}` : '-' + code;
};
const tag = code => (code === 'no' ? 'nb' : code);

const strEsc = s => s.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, '\\n');
const xmlEsc = s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/'/g, "\\'").replace(/"/g, '\\"').replace(/^([@?])/, '\\$1').replace(/\n/g, '\\n');

// text uses \n; the file keeps the line endings it has, a new one gets the platform's
function eolOf(file) {
  if (fs.existsSync(file)) return /\r\n/.test(fs.readFileSync(file, 'utf8')) ? '\r\n' : '\n';
  return process.platform === 'win32' ? '\r\n' : '\n';
}
function write(file, text) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, text.replace(/\r\n/g, '\n').replace(/\n/g, eolOf(file)));
}

const ready = [];
for (const code of codes) {
  const t = code === 'en' ? en : load(code);
  if (!Object.keys(t).length) continue;
  ready.push(code);
  const val = k => (typeof t[k] === 'string' && t[k] ? t[k] : '');
  if (!keys.some(val)) continue;
  const pick = k => val(k) || en[k];
  const dir = path.join(root, 'ios/MainStreet', lproj(code) + '.lproj');
  write(path.join(dir, 'InfoPlist.strings'),
    `"CFBundleDisplayName" = "${strEsc(pick('native.ios.display_name'))}";\n"NSUserTrackingUsageDescription" = "${strEsc(pick('native.ios.tracking'))}";\n`);
  write(path.join(dir, 'Localizable.strings'),
    `"notification_title" = "${strEsc(pick('native.notification_title'))}";\n"ok" = "${strEsc(pick('native.ok'))}";\n"cancel" = "${strEsc(pick('native.cancel'))}";\n`);
  const names = { app_name: 'native.android.app_name', channel_name: 'native.android.channel_name', notification_title: 'native.notification_title',
    webview_old: 'native.android.webview_old', update: 'native.android.update' };
  const lines = Object.keys(names).map(n => `    <string name="${n}">${xmlEsc(pick(names[n]))}</string>`);
  write(path.join(root, 'android/app/src/main/res', 'values' + android(code), 'strings.xml'),
    `<?xml version="1.0" encoding="utf-8"?>\n<resources>\n${lines.join('\n')}\n</resources>\n`);
}

write(path.join(root, 'android/app/src/main/res/xml/locales_config.xml'),
  `<?xml version="1.0" encoding="utf-8"?>\n<locale-config xmlns:android="http://schemas.android.com/apk/res/android">\n${ready.map(c => `    <locale android:name="${tag(c)}" />`).join('\n')}\n</locale-config>\n`);

// CFBundleLocalizations in Info.plist lists the languages so the App Store and Settings show them
const plist = path.join(root, 'ios/MainStreet/Info.plist');
const list = ready.map(c => `\t\t<string>${lproj(c)}</string>`).join('\n');
let p = fs.readFileSync(plist, 'utf8').replace(/\r\n/g, '\n');
p = /<key>CFBundleLocalizations<\/key>/.test(p)
  ? p.replace(/(<key>CFBundleLocalizations<\/key>\n\t<array>\n)[\s\S]*?(\t<\/array>)/, `$1${list}\n$2`)
  : p.replace('\t<key>CFBundleName</key>', `\t<key>CFBundleLocalizations</key>\n\t<array>\n${list}\n\t</array>\n\t<key>CFBundleName</key>`);
write(plist, p);

const line = `var LANG_READY = [${ready.map(c => `'${c}'`).join(', ')}];`;
fs.writeFileSync(i18n, src.replace(/var LANG_READY = \[.*\];/, line));

console.log('languages with translations:', ready.join(', '));
