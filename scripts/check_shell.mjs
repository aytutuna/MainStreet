// Every store type's plan names a shell with the fields store.js routes people, cars and the camera by, and the pieces
// that stand in it fit: the entrances in the front, a walkway to each, the doors in the back wall, the start view inside the
// camera's bounds.
//   node scripts/check_shell.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
globalThis.tl = k => k;
const { PLAN } = await import('../plan.js');
const { DINER } = await import('../diner.js');
const { HARDWARE } = await import('../hardware.js');
const code = fs.readFileSync(path.join(root, 'store.js'), 'utf8');
const kinds = (code.match(/var SHELLS = \{([^}]*)\}/) || [, ''])[1].split(',').map(s => s.split(':')[0].trim()).filter(Boolean);

let failed = false;
const fail = msg => { console.error('FAIL: ' + msg); failed = true; };
const need = {
  number: ['front', 'back', 'edge', 'wing', 'sb', 'lane', 'aisle', 'drive', 'road', 'curb', 'yard', 'stand', 'busX', 'fit', 'turn'],
  array: ['lot', 'lotX', 'walks', 'bounds', 'zoom']
};

for (const [name, plan] of [['super', PLAN], ['diner', DINER], ['hardware', HARDWARE]]) {
  const sh = plan.shell;
  if (!sh) { fail(name + ': no shell'); continue; }
  if (!kinds.includes(sh.kind)) fail(name + ': no builder for kind ' + sh.kind);
  need.number.forEach(k => { if (typeof sh[k] !== 'number') fail(name + ': shell.' + k + ' is not a number'); });
  need.array.forEach(k => { if (!Array.isArray(sh[k])) fail(name + ': shell.' + k + ' is not a list'); });
  ['light', 'nav', 'garden', 'nature', 'decor', 'spots', 'tags'].forEach(k => { if (!sh[k] || typeof sh[k] !== 'object') fail(name + ': shell.' + k + ' is missing'); });
  if (failed) continue;
  if (plan !== PLAN && sh === PLAN.shell) fail(name + ': shares the supercenter shell object instead of a copy');
  if (sh.walks.length !== plan.entrances.length) fail(name + ': ' + plan.entrances.length + ' entrances but ' + sh.walks.length + ' walkways');
  plan.entrances.forEach(en => { if (Math.abs(en.x) + en.w / 2 > sh.edge) fail(name + ': entrance at ' + en.x + ' is outside the front'); });
  plan.doors.forEach(d => { if (Math.abs(d) > sh.edge) fail(name + ': stock door at ' + d + ' is outside the back wall'); });
  plan.docks.forEach(d => { if (Math.abs(d) > sh.edge) fail(name + ': dock at ' + d + ' is outside the north wall'); });
  if (!(sh.sb < sh.back && sh.back < sh.front && sh.front < sh.lot[0] && sh.lot[0] < sh.lot[1])) fail(name + ': front, back, stockroom and lot are out of order');
  if (!(sh.edge < sh.wing)) fail(name + ': the wing wall is inside the building');
  if (sh.lane > sh.back || sh.lane < sh.sb) fail(name + ': the stockers\' lane is not in the stockroom');
  if (plan.idle.length < 1 || plan.idle.some(q => q[1] > sh.back || q[1] < sh.sb)) fail(name + ': a stocker waits outside the stockroom');
  const [x0, x1, z0, z1] = sh.bounds;
  if (plan.home.x < x0 || plan.home.x > x1 || plan.home.z < z0 || plan.home.z > z1) fail(name + ': the start view is outside the camera bounds');
  if (sh.zoom[0] >= sh.zoom[1]) fail(name + ': zoom range is empty');
  const [gx, gz, nx, nz] = sh.nav.grid;
  if (gx > -sh.edge || gz > sh.back || gx + nx * 0.25 < sh.wing || gz + nz * 0.25 < sh.front) fail(name + ': the walking grid does not cover the sales floor');
  ['lot', 'taxi', 'dock'].forEach(id => { if (!sh.spots[id] || !sh.tags[id]) fail(name + ': no spot or tag for ' + id); });
  if (!sh.nature.zones.length) fail(name + ': no scenery zones');
  if (!Array.isArray(sh.decor.out) || !Array.isArray(sh.decor.stock)) fail(name + ': shell.decor needs out and stock');
}

if (failed) process.exit(1);
console.log('shells ok: super, diner, hardware');
