#!/usr/bin/env node
// Deterministic frame capture for a web composition that exposes window.renderAt(t).
// Requires Playwright in the project (or cwd): npm i -D playwright && npx playwright install chromium
//
// Usage:
//   node capture-frames.mjs --url http://localhost:5173/?capture=1 --out frames \
//     --fps 30 --duration 5 --width 1920 --height 1080 [--scale 1] [--selector "#stage"] \
//     [--alpha] [--start 0] [--count N] [--force] [--channel msedge|chrome]
//
// Page contract:
//   window.renderAt(t)      required; t in seconds; may return a Promise; must set ALL visible state for t
//   window.captureReady     optional Promise that resolves after fonts/images/textures load (rejects on failure)

import { parseArgs } from 'node:util';
import { createRequire } from 'node:module';
import { mkdir, readdir, readFile } from 'node:fs/promises';
import path from 'node:path';

const { values: a } = parseArgs({
  options: {
    url: { type: 'string' },
    out: { type: 'string', default: 'frames' },
    fps: { type: 'string', default: '30' },
    duration: { type: 'string' },
    count: { type: 'string' },
    start: { type: 'string', default: '0' },
    width: { type: 'string', default: '1920' },
    height: { type: 'string', default: '1080' },
    scale: { type: 'string', default: '1' },
    selector: { type: 'string' },
    alpha: { type: 'boolean', default: false },
    force: { type: 'boolean', default: false },
    timeout: { type: 'string', default: '30000' },
    channel: { type: 'string' },
  },
});

const die = (msg) => { console.error(`capture-frames: ${msg}`); process.exit(1); };
if (!a.url) die('--url is required');

const fps = Number(a.fps);
const width = Number(a.width), height = Number(a.height), scale = Number(a.scale);
const start = Number(a.start), timeout = Number(a.timeout);
let total;
if (a.count) total = Number(a.count);
else if (a.duration) total = Math.round(Number(a.duration) * fps);
else die('give --duration (seconds) or --count (frames)');
if (![fps, width, height, scale, total, start].every(Number.isFinite) || fps <= 0 || total <= 0) die('invalid numeric argument');

if (a.duration && Math.abs(total / fps - Number(a.duration)) > 1e-9) {
  console.warn(`note: ${a.duration}s at ${fps} fps rounds to ${total} frames = ${(total / fps).toFixed(4)}s`);
}

let chromium;
try {
  const require = createRequire(path.join(process.cwd(), 'noop.js'));
  ({ chromium } = require('playwright'));
} catch {
  die('Playwright not found from the current directory. Install it: npm i -D playwright && npx playwright install chromium');
}

const outDir = path.resolve(a.out);
await mkdir(outDir, { recursive: true });
const existing = (await readdir(outDir)).filter((f) => f.endsWith('.png'));
if (existing.length && !a.force) die(`${outDir} already contains ${existing.length} PNGs; choose a new --out or pass --force`);

const browser = await chromium.launch(a.channel ? { channel: a.channel } : {});
const errors = [];
try {
  const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: scale });
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on('requestfailed', (r) => errors.push(`request failed: ${r.url()}`));

  await page.goto(a.url, { waitUntil: 'load', timeout });
  await page.waitForFunction(() => typeof window.renderAt === 'function', null, { timeout });
  await page.evaluate(async () => {
    await (window.captureReady ?? Promise.resolve());
    await document.fonts.ready;
    await Promise.all([...document.images].map((img) => img.decode().catch(() => {
      throw new Error(`image failed: ${img.currentSrc || img.src}`);
    })));
  });

  const target = a.selector ? page.locator(a.selector) : null;
  if (target && (await target.count()) !== 1) throw new Error('--selector must match exactly one element');

  for (let i = 0; i < total; i++) {
    const n = start + i;
    const t = n / fps;
    await page.evaluate(async (time) => {
      await window.renderAt(time);
      await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
    }, t);
    const file = path.join(outDir, `frame-${String(i).padStart(6, '0')}.png`);
    const opts = { path: file, omitBackground: a.alpha, animations: 'allow' };
    if (target) await target.screenshot(opts);
    else await page.screenshot(opts);
    if (i % Math.max(1, Math.round(fps)) === 0) process.stdout.write(`\r${i + 1}/${total}`);
  }
  process.stdout.write(`\r${total}/${total}\n`);
} finally {
  await browser.close();
}

if (errors.length) {
  console.warn(`warning: ${errors.length} page error(s) during capture:`);
  for (const e of errors.slice(0, 10)) console.warn(`  ${e}`);
}
const first = await readFile(path.join(outDir, 'frame-000000.png'));
const fw = first.readUInt32BE(16), fh = first.readUInt32BE(20);
console.log(`wrote ${total} frames to ${outDir} (${fw}x${fh}px per frame, ${fps} fps, ${(total / fps).toFixed(3)}s)`);
const odd = fw % 2 || fh % 2;
if (odd) console.warn(`warning: ${fw}x${fh} has an odd dimension; yuv420p needs even sizes, so the command below pads by 1px. Prefer fixing the composition size.`);
const vf = odd ? ' -vf "pad=ceil(iw/2)*2:ceil(ih/2)*2"' : '';
console.log(`encode (opaque H.264): ffmpeg -n -framerate ${fps} -start_number 0 -i "${path.join(outDir, 'frame-%06d.png')}"${vf} -c:v libx264 -pix_fmt yuv420p -movflags +faststart output.mp4`);
