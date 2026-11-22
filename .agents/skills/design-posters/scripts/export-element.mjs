#!/usr/bin/env node
// Export one DOM element (e.g. a poster artboard) to PNG/JPEG with deliberate size and checks.
// Requires Playwright in the project (or cwd): npm i -D playwright && npx playwright install chromium
//
// Usage:
//   node export-element.mjs --url http://localhost:5173/poster.html --out exports/poster-1080x1350.png \
//     [--selector "#poster"] [--width 1080] [--height 1350] [--scale 1] [--alpha] \
//     [--font "700 64px Cairo"] [--font "400 24px Inter"] [--force] [--channel msedge|chrome]
//
// --width/--height set the viewport in CSS px; output pixels = element CSS size x --scale.
// --font may repeat; each value is a CSS font shorthand for a web font declared with @font-face.
// The export is flagged if no matching face actually loaded (system/generic fonts are not checkable this way).

import { parseArgs } from 'node:util';
import { createRequire } from 'node:module';
import { mkdir, readFile, access } from 'node:fs/promises';
import path from 'node:path';

const { values: a } = parseArgs({
  options: {
    url: { type: 'string' },
    out: { type: 'string' },
    selector: { type: 'string', default: '#poster' },
    width: { type: 'string', default: '1600' },
    height: { type: 'string', default: '1600' },
    scale: { type: 'string', default: '1' },
    alpha: { type: 'boolean', default: false },
    font: { type: 'string', multiple: true, default: [] },
    quality: { type: 'string', default: '92' },
    force: { type: 'boolean', default: false },
    timeout: { type: 'string', default: '30000' },
    channel: { type: 'string' },
  },
});

const die = (msg) => { console.error(`export-element: ${msg}`); process.exit(1); };
if (!a.url || !a.out) die('--url and --out are required');

const out = path.resolve(a.out);
const ext = path.extname(out).toLowerCase();
const type = ext === '.png' ? 'png' : ext === '.jpg' || ext === '.jpeg' ? 'jpeg' : null;
if (!type) die('--out must end in .png, .jpg or .jpeg');
if (a.alpha && type !== 'png') die('--alpha requires PNG output');
if (!a.force) {
  try { await access(out); die(`${out} exists; choose a new name or pass --force`); } catch { /* ok */ }
}

let chromium;
try {
  const require = createRequire(path.join(process.cwd(), 'noop.js'));
  ({ chromium } = require('playwright'));
} catch {
  die('Playwright not found from the current directory. Install it: npm i -D playwright && npx playwright install chromium');
}

const width = Number(a.width), height = Number(a.height), scale = Number(a.scale), timeout = Number(a.timeout);
await mkdir(path.dirname(out), { recursive: true });

const browser = await chromium.launch(a.channel ? { channel: a.channel } : {});
const problems = [];
let box;
try {
  const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: scale });
  page.on('pageerror', (e) => problems.push(`page error: ${e}`));
  page.on('requestfailed', (r) => problems.push(`request failed: ${r.url()}`));
  await page.goto(a.url, { waitUntil: 'networkidle', timeout });

  const el = page.locator(a.selector);
  const count = await el.count();
  if (count !== 1) throw new Error(`selector "${a.selector}" matched ${count} elements; need exactly 1`);

  const report = await page.evaluate(async (fonts) => {
    await document.fonts.ready;
    const imgs = await Promise.all([...document.images].map((img) =>
      img.decode().then(() => null, () => img.currentSrc || img.src)));
    // document.fonts.check() returns true for undeclared families, so load() each and require a loaded face.
    const fontResults = await Promise.all(fonts.map(async (f) => {
      try {
        const faces = await document.fonts.load(f);
        return { font: f, ok: faces.length > 0 && faces.every((ff) => ff.status === 'loaded') };
      } catch { return { font: f, ok: false }; }
    }));
    return { fonts: fontResults, failedImages: imgs.filter(Boolean) };
  }, a.font);

  for (const f of report.fonts) if (!f.ok) problems.push(`no loaded @font-face matches: ${f.font}`);
  for (const src of report.failedImages) problems.push(`image failed to decode: ${src}`);

  box = await el.boundingBox();
  const opts = { path: out, type, omitBackground: a.alpha, animations: 'disabled' };
  if (type === 'jpeg') opts.quality = Number(a.quality);
  await el.screenshot(opts);
} finally {
  await browser.close();
}

let dims = '';
if (type === 'png') {
  const buf = await readFile(out);
  const w = buf.readUInt32BE(16), h = buf.readUInt32BE(20), colorType = buf[25];
  const hasAlphaChannel = colorType === 4 || colorType === 6;
  dims = `${w}x${h}px, alpha channel: ${hasAlphaChannel ? 'yes' : 'no'}`;
} else {
  dims = `~${Math.round(box.width * scale)}x${Math.round(box.height * scale)}px (from element box)`;
}

console.log(`wrote ${out}`);
console.log(`element CSS box: ${box.width}x${box.height} at scale ${scale} -> ${dims}`);
if (box.width > width || box.height > height) console.warn('warning: element is larger than the viewport; check for clipping');
if (problems.length) {
  console.warn(`warning: ${problems.length} problem(s):`);
  for (const p of problems) console.warn(`  ${p}`);
  process.exitCode = 2;
}
