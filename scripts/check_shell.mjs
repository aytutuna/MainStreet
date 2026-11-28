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
const LAND = await import('../land.js');
const { DINER } = await import('../diner.js');
const { HARDWARE } = await import('../hardware.js');
const code = fs.readFileSync(path.join(root, 'store.js'), 'utf8');
const kinds = (code.match(/var SHELLS = \{([^}]*)\}/) || [, ''])[1].split(',').map(s => s.split(':')[0].trim()).filter(Boolean);

let failed = false;
let bad = false;
const fail = msg => { console.error('FAIL: ' + msg); failed = true; bad = true; };
const need = {
  number: ['front', 'back', 'edge', 'wing', 'sb', 'lane', 'aisle', 'drive', 'road', 'curb', 'yard', 'stand', 'busX', 'fit', 'turn'],
  array: ['lot', 'lotX', 'walks', 'bounds', 'zoom']
};

for (const [name, plan] of [['super', PLAN], ['diner', DINER], ['hardware', HARDWARE]]) {
  const sh = plan.shell;
  bad = false;
  if (!sh) { fail(name + ': no shell'); continue; }
  if (!kinds.includes(sh.kind)) fail(name + ': no builder for kind ' + sh.kind);
  need.number.forEach(k => { if (typeof sh[k] !== 'number') fail(name + ': shell.' + k + ' is not a number'); });
  need.array.forEach(k => { if (!Array.isArray(sh[k])) fail(name + ': shell.' + k + ' is not a list'); });
  ['light', 'nav', 'garden', 'nature', 'decor', 'spots', 'tags'].forEach(k => { if (!sh[k] || typeof sh[k] !== 'object') fail(name + ': shell.' + k + ' is missing'); });
  if (bad) continue;
  if (plan !== PLAN) {
    if (sh === PLAN.shell) fail(name + ': shares the supercenter shell object instead of a copy');
    for (const k of Object.keys(sh)) if (sh[k] && typeof sh[k] === 'object' && sh[k] === PLAN.shell[k]) fail(name + ': shell.' + k + ' shares an object with the supercenter shell');
  }
  if (typeof plan.bank.span !== 'number' || !(plan.bank.span > 0)) fail(name + ': bank.span is missing');
  if (!sh.wingDoor || !sh.wingDoor.out || !sh.wingDoor.in) fail(name + ': shell.wingDoor needs out and in');
  if (!sh.tags.hall) fail(name + ': no tag anchor for the hall');
  // routing takes the nearest entrance and the walkway of the same index, so they have to be in the same order
  plan.entrances.forEach((en, i) => {
    const w = sh.walks[i];
    const near = plan.entrances.reduce((a, e, j) => (Math.abs(e.x - w) < Math.abs(plan.entrances[a].x - w) ? j : a), 0);
    if (near !== i) fail(name + ': walkway ' + i + ' at ' + w + ' is nearer entrance ' + near);
  });
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
  const flat = LAND.FLAT[0];
  const inside = r => r[0] >= flat[0] && r[1] <= flat[1] && r[2] >= flat[2] && r[3] <= flat[3];
  sh.nature.zones.forEach(z => { if (!inside(z.r)) fail(name + ': scenery zone ' + z.r + ' is outside the flat ground'); });
  if (-sh.edge < flat[0] || sh.wing > flat[1] || sh.sb < flat[2] || sh.lot[1] > flat[3]) fail(name + ': the building and lot do not fit inside the flat ground');
  if (!Array.isArray(sh.decor.out) || !Array.isArray(sh.decor.stock)) fail(name + ': shell.decor needs out and stock');
}

if (failed) process.exit(1);
console.log('shells ok: super, diner, hardware');
