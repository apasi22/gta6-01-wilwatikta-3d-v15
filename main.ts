// WILWATIKTA 3D v15 — entry program for make.fun gta6-01 (Node 22, stdlib only).
// The playable game lives in game/ as plain static files (index.html + ES modules,
// no library, no network request). This program copies game/ and screenshots/
// beside it into the output directory and writes dossier.json with the kit's
// vendored library, so the scorer's own buildDossier reproduces the dossier
// byte for byte. Outside the grader, MAKEFUN_OUTPUT_DIR stands in for /output:
//
//   MAKEFUN_OUTPUT_DIR=out node main.ts

import { cpSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const here = fileURLToPath(new URL('.', import.meta.url));
const out = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

mkdirSync(out, { recursive: true });
cpSync(join(here, 'game'), join(out, 'game'), { recursive: true });
if (existsSync(join(here, 'screenshots'))) {
  cpSync(join(here, 'screenshots'), join(out, 'screenshots'), { recursive: true });
}

// Caps from the kit's reference/gate.json: the text cap shapes the dossier;
// the rest refuse exactly where the scorer would refuse.
writeFileSync(
  join(out, 'dossier.json'),
  buildDossier(out, {
    text_max_bytes: 163840,
    screenshots: { max: 4, max_bytes: 262144 },
    game_max_files: 993,
    game_max_bytes: 50331648,
    game_path_max_bytes: 1000,
  }),
);
console.log('WILWATIKTA 3D v15 dossier written to ' + join(out, 'dossier.json'));
