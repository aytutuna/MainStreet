// Writes the texts of the iOS and Android shells from the language files (the native.* keys):
//   ios/MainStreet/<lang>.lproj/InfoPlist.strings and Localizable.strings
//   android/app/src/main/res/values[-<qualifier>]/strings.xml and res/xml/locales_config.xml
// A language that has none of the native keys translated is skipped. Run it from anywhere: node scripts/gen_native.mjs
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const src = fs.readFileSync(path.join(root, 'i18n.js'), 'utf8');
const codes = [...src.match(/var LANGS = (\[[\s\S]*?\n\]);/)[1].matchAll(/^  \['([\w-]+)'/gm)].map(m => m[1]);

function load(code) {
  const ctx = { LANG: {} };
  vm.runInNewContext(fs.readFileSync(path.join(root, 'lang', code + '.js'), 'utf8'), ctx);
  return ctx.LANG[code] || {};
}

const en = load('en');
const keys = Object.keys(en).filter(k => k.startsWith('native.'));

// lproj folder and Android resource qualifier for each of our codes; Norwegian is nb on both
const lproj = code => (code === 'no' ? 'nb' : code);
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

function write(file, text) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, text.replace(/\n/g, '\r\n'));
}

const done = [];
for (const code of codes) {
  const t = code === 'en' ? en : load(code);
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
  done.push(code);
}

// every language is offered, translated or not: the game falls back to English text by text
write(path.join(root, 'android/app/src/main/res/xml/locales_config.xml'),
  `<?xml version="1.0" encoding="utf-8"?>\n<locale-config xmlns:android="http://schemas.android.com/apk/res/android">\n${codes.map(c => `    <locale android:name="${tag(c)}" />`).join('\n')}\n</locale-config>\n`);

// CFBundleLocalizations in Info.plist lists every language so the App Store and Settings show them
const plist = path.join(root, 'ios/MainStreet/Info.plist');
const list = codes.map(c => `\t\t<string>${lproj(c)}</string>`).join('\n');
let p = fs.readFileSync(plist, 'utf8').replace(/\r\n/g, '\n');
p = /<key>CFBundleLocalizations<\/key>/.test(p)
  ? p.replace(/(<key>CFBundleLocalizations<\/key>\n\t<array>\n)[\s\S]*?(\t<\/array>)/, `$1${list}\n$2`)
  : p.replace('\t<key>CFBundleName</key>', `\t<key>CFBundleLocalizations</key>\n\t<array>\n${list}\n\t</array>\n\t<key>CFBundleName</key>`);
fs.writeFileSync(plist, p.replace(/\n/g, '\r\n'));

console.log('wrote native strings for', done.join(', '));
