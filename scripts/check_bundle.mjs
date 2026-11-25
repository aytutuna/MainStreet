// Checks that the files the page loads from the repository root are in the iPhone bundle (ios/project.yml), in the
// Android copy list (android/app/build.gradle.kts).
// The page's own scripts and stylesheets come from index.html, and from there the imports of every module.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = f => fs.readFileSync(path.join(root, f), 'utf8');
let failed = false;
const fail = msg => { console.error('FAIL: ' + msg); failed = true; };

const needed = new Set();
const scan = f => {
  if (needed.has(f)) return;
  if (!fs.existsSync(path.join(root, f))) return fail(f + ' is loaded but does not exist');
  needed.add(f);
  if (!f.endsWith('.js')) return;
  for (const m of read(f).matchAll(/^\s*import\b[^'"]*?(?:from\s*)?['"](\.\/[^'"]+)['"]/gm)) scan(path.posix.normalize(m[1]));
};

const html = read('index.html');
needed.add('index.html');
for (const m of html.matchAll(/<script\b[^>]*\bsrc="([^"]+)"/g)) if (!m[1].includes('://')) scan(m[1]);
for (const m of html.matchAll(/<link\b[^>]*rel="stylesheet"[^>]*href="([^"]+)"/g)) scan(m[1]);

const rootFiles = [...needed].filter(f => !f.includes('/'));
const ios = new Set([...read('ios/project.yml').matchAll(/- path: \.\.\/([\w.-]+)\s*\n\s+buildPhase: resources/g)].map(m => m[1]));
const gradle = read('android/app/build.gradle.kts').match(/include\(("[^"]+"(?:,\s*"[^"]+")*)\)/);
const android = new Set(gradle ? [...gradle[1].matchAll(/"([^"]+)"/g)].map(m => m[1]) : []);

for (const f of rootFiles) {
  if (!ios.has(f)) fail(f + ' is loaded by the page but not in ios/project.yml');
  if (!android.has(f)) fail(f + ' is loaded by the page but not in the copy list in android/app/build.gradle.kts');
}
for (const f of ios) if (!rootFiles.includes(f)) fail(f + ' is in ios/project.yml but the page does not load it');
for (const f of android) if (!f.includes('*') && !rootFiles.includes(f)) fail(f + ' is in the Android copy list but the page does not load it');

if (failed) process.exit(1);
console.log('bundle ok: ' + rootFiles.length + ' root files');
