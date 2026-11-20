// gta6-clipper-01 entry: validates VIDEO.json, then hands it to the gate.
// The entry is the video itself (clip/gta6-clip-v1.mp4, uploaded to YouTube
// as a public Short); this program reads VIDEO.json from the repository
// root, checks the fields the gate and the house require (a non-empty title,
// the exact bounty line + play code in the description, a Short length of
// at most 60 seconds, the 1080x1920 resolution, a non-empty local file,
// and a valid YouTube URL once the clip is uploaded), and only then copies
// VIDEO.json byte-identical to the output directory, where the gate reads
// it. Nothing is written on failure: validation runs before any output is
// created. A missing or empty url is NOT an error — the clip is uploaded
// after this program first runs, so it only warns on stderr.
//
// Local run: mkdir -p out && MAKEFUN_BOT_DIR=. MAKEFUN_OUTPUT_DIR=out node main.ts

import { copyFileSync, mkdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const BOT_DIR = process.env.MAKEFUN_BOT_DIR ?? '/bot';
const OUTPUT_DIR = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

// The exact bounty line the house requires in the video description
// (RECON.md section 2 — the house looks for "$500 bounty" + the
// make.fun link), and our play code for this competition.
const BOUNTY_LINE =
  'Made by my AI agent for a $500 bounty on make.fun, where you can earn money making clips with AI: https://make.fun/bounty/gta6-clipper-01';
const PLAY_CODE = 'makefun-orbit-windmill-muffin';
const EXPECTED_RESOLUTION = '1080x1920';
const MAX_SHORT_SECONDS = 60;

function fail(field: string, detail: string): never {
  console.error(`VIDEO.json invalid: ${field}: ${detail}`);
  process.exit(1);
}

function isYouTubeUrl(raw: string): boolean {
  let parsed: URL;
  try {
    parsed = new URL(raw);
  } catch {
    return false;
  }
  if (parsed.protocol !== 'https:') return false;
  const host = parsed.hostname.toLowerCase();
  // A video id is exactly one path segment. A single trailing slash is
  // tolerated (pasted URLs sometimes carry one); anything with more
  // segments (youtu.be/foo/bar, /shorts/abc/def) is not a video link.
  const segments = (path: string): string[] => {
    const trimmed = path.endsWith('/') && path.length > 1 ? path.slice(0, -1) : path;
    return trimmed.split('/').filter((s) => s.length > 0);
  };
  if (host === 'youtu.be' || host === 'www.youtu.be') {
    return segments(parsed.pathname).length === 1;
  }
  if (host === 'youtube.com' || host === 'www.youtube.com' || host === 'm.youtube.com') {
    if (parsed.pathname === '/watch') {
      const v = parsed.searchParams.get('v');
      return typeof v === 'string' && v.trim().length > 0;
    }
    if (parsed.pathname.startsWith('/shorts/')) {
      return segments(parsed.pathname).length === 2 && segments(parsed.pathname)[0] === 'shorts';
    }
    return false;
  }
  return false;
}

const src = join(BOT_DIR, 'VIDEO.json');

let text: string;
try {
  text = readFileSync(src, 'utf8');
} catch (err) {
  console.error(`VIDEO.json could not be read from ${BOT_DIR}: ${(err as Error).message}`);
  process.exit(1);
}

let data: unknown;
try {
  data = JSON.parse(text);
} catch (err) {
  fail('JSON', `malformed JSON: ${(err as Error).message}`);
}

if (typeof data !== 'object' || data === null || Array.isArray(data)) {
  fail('JSON', 'top level must be an object');
}
const video = data as Record<string, unknown>;

if (typeof video.title !== 'string' || video.title.trim().length === 0) {
  fail('title', 'must be a non-empty string');
}
if (typeof video.description !== 'string') {
  fail('description', 'must be a string');
}
if (!video.description.includes(BOUNTY_LINE)) {
  fail('description', 'must contain the exact bounty line (make.fun pitch + https://make.fun/bounty/gta6-clipper-01)');
}
if (!video.description.includes(PLAY_CODE)) {
  fail('description', `must contain the play code ${PLAY_CODE}`);
}
if (typeof video.duration_seconds !== 'number' || !Number.isFinite(video.duration_seconds)) {
  fail('duration_seconds', 'must be a number');
}
if (video.duration_seconds <= 0 || video.duration_seconds > MAX_SHORT_SECONDS) {
  fail('duration_seconds', `must be > 0 and <= ${MAX_SHORT_SECONDS} (YouTube Short), got ${video.duration_seconds}`);
}
if (video.resolution !== EXPECTED_RESOLUTION) {
  fail('resolution', `must be exactly ${EXPECTED_RESOLUTION}, got ${String(video.resolution)}`);
}
if (typeof video.local_file !== 'string' || video.local_file.trim().length === 0) {
  fail('local_file', 'must be a non-empty string');
}
const url = video.url;
if (url === undefined || url === null) {
  console.error('warning: VIDEO.json has no url — clip not uploaded to YouTube yet; copying as-is');
} else if (typeof url !== 'string') {
  fail('url', 'must be a string');
} else if (url.trim().length === 0) {
  console.error('warning: VIDEO.json url is empty — clip not uploaded to YouTube yet; copying as-is');
} else if (!isYouTubeUrl(url)) {
  fail('url', `must be a valid https YouTube URL (youtube.com/watch?v=..., youtu.be/..., or youtube.com/shorts/...), got ${url}`);
}

mkdirSync(OUTPUT_DIR, { recursive: true });
try {
  copyFileSync(src, join(OUTPUT_DIR, 'VIDEO.json'));
  console.log(`VIDEO.json copied to ${join(OUTPUT_DIR, 'VIDEO.json')}`);
} catch (err) {
  console.error(`VIDEO.json could not be copied from ${BOT_DIR}: ${(err as Error).message}`);
  process.exit(1);
}
