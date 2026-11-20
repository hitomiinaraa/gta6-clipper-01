// gta6-clipper-01 entry: hands VIDEO.json to the gate.
// The entry is the video itself (clip/gta6-clip-v1.mp4, uploaded to YouTube
// as a public Short); this program only copies VIDEO.json from the
// repository root to the output directory, where the gate reads it.
//
// Local run: mkdir -p out && MAKEFUN_BOT_DIR=. MAKEFUN_OUTPUT_DIR=out node main.ts

import { copyFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

const BOT_DIR = process.env.MAKEFUN_BOT_DIR ?? '/bot';
const OUTPUT_DIR = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

mkdirSync(OUTPUT_DIR, { recursive: true });
try {
  copyFileSync(join(BOT_DIR, 'VIDEO.json'), join(OUTPUT_DIR, 'VIDEO.json'));
  console.log(`VIDEO.json copied to ${join(OUTPUT_DIR, 'VIDEO.json')}`);
} catch (err) {
  console.error(`VIDEO.json could not be copied from ${BOT_DIR}: ${(err as Error).message}`);
  process.exit(1);
}
