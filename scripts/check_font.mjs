// Lists every Latin, Cyrillic or Greek letter used in lang/*.js that the shipped display font cannot draw.
import fs from 'node:fs';
import zlib from 'node:zlib';

const TAGS = ['cmap', 'head', 'hhea', 'hmtx', 'maxp', 'name', 'OS/2', 'post', 'cvt ', 'fpgm', 'glyf', 'loca', 'prep', 'CFF ', 'VORG', 'EBDT', 'EBLC', 'gasp', 'hdmx', 'kern', 'LTSH', 'PCLT', 'VDMX', 'vhea', 'vmtx', 'BASE', 'GDEF', 'GPOS', 'GSUB', 'EBSC', 'JSTF', 'MATH', 'CBDT', 'CBLC', 'COLR', 'CPAL', 'SVG ', 'sbix', 'acnt', 'avar', 'bdat', 'bloc', 'bsln', 'cvar', 'fdsc', 'feat', 'fmtx', 'fvar', 'gvar', 'hsty', 'just', 'lcar', 'mort', 'morx', 'opbd', 'prop', 'trak', 'Zapf', 'Silf', 'Glat', 'Gloc', 'Feat', 'Sill'];

function cmapOf(file) {
  const b = fs.readFileSync(file);
  const n = b.readUInt16BE(12);
  let p = 48;
  const tabs = [];
  for (let i = 0; i < n; i++) {
    const flags = b[p++];
    let tag = flags & 63;
    tag = tag === 63 ? (p += 4, b.toString('latin1', p - 4, p)) : TAGS[tag];
    let len = 0;
    for (let k = 0; k < 5; k++) {
      const c = b[p++];
      len = len * 128 + (c & 127);
      if (!(c & 128)) break;
    }
    const xf = flags >> 6;
    const transformed = tag === 'glyf' || tag === 'loca' ? xf === 0 : xf !== 0;
    let size = len;
    if (transformed) {
      size = 0;
      for (let k = 0; k < 5; k++) {
        const c = b[p++];
        size = size * 128 + (c & 127);
        if (!(c & 128)) break;
      }
    }
    tabs.push({ tag, size });
  }
  const data = zlib.brotliDecompressSync(b.subarray(p, p + b.readUInt32BE(20)));
  let off = 0;
  let cm;
  for (const t of tabs) {
    if (t.tag === 'cmap') cm = data.subarray(off, off + t.size);
    off += t.size;
  }
  const set = new Set();
  const nt = cm.readUInt16BE(2);
  for (let i = 0; i < nt; i++) {
    const o = cm.readUInt32BE(4 + i * 8 + 4);
    const fmt = cm.readUInt16BE(o);
    if (fmt === 12) {
      const g = cm.readUInt32BE(o + 12);
      for (let k = 0; k < g; k++) {
        const s = cm.readUInt32BE(o + 16 + k * 12), e = cm.readUInt32BE(o + 20 + k * 12);
        for (let c = s; c <= e; c++) set.add(c);
      }
    } else if (fmt === 4) {
      const sc = cm.readUInt16BE(o + 6) / 2;
      const ends = o + 14, starts = ends + sc * 2 + 2, deltas = starts + sc * 2, ranges = deltas + sc * 2;
      for (let k = 0; k < sc; k++) {
        const e = cm.readUInt16BE(ends + k * 2), s = cm.readUInt16BE(starts + k * 2);
        for (let c = s; c <= e && c < 0xffff; c++) {
          if (cm.readUInt16BE(ranges + k * 2) === 0 && !((c + cm.readUInt16BE(deltas + k * 2)) & 0xffff)) continue;
          set.add(c);
        }
      }
    }
  }
  return set;
}

const have = cmapOf('assets/fira-sans-extrabold.woff2');
const used = new Set();
for (const f of fs.readdirSync('lang').filter((f) => f.endsWith('.js'))) {
  for (const ch of fs.readFileSync('lang/' + f, 'utf8')) {
    if (/[\p{Script=Latin}\p{Script=Cyrillic}\p{Script=Greek}]/u.test(ch)) used.add(ch);
  }
}
const missing = [...used].filter((c) => !have.has(c.codePointAt(0)));
console.log(`${used.size} letters used, ${have.size} in the font`);
if (missing.length) {
  console.log('missing: ' + missing.map((c) => c + ' U+' + c.codePointAt(0).toString(16).toUpperCase().padStart(4, '0')).join(' '));
  process.exit(1);
}
console.log('every letter is in the font');
