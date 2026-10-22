// Renders the social share card and the PNG app icons with headless Chrome.
// Usage: npm run og   (set CHROME=/path/to/chrome if it isn't on PATH)
import { execFileSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const candidates = [
  process.env.CHROME,
  '/opt/pw-browsers/chromium_headless_shell-1194/chrome-linux/headless_shell',
  '/opt/pw-browsers/chromium',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  'google-chrome',
  'chromium',
].filter(Boolean);
const chrome = candidates.find((c) => !c.includes('/') || existsSync(c));
if (!chrome) throw new Error('No Chrome found. Set CHROME=/path/to/chrome.');

function shoot(url, out, w, h) {
  execFileSync(
    chrome,
    [
      '--headless=old',
      '--disable-gpu',
      '--hide-scrollbars',
      '--no-sandbox',
      '--force-device-scale-factor=1',
      '--virtual-time-budget=3000',
      `--window-size=${w},${h}`,
      `--screenshot=${join(root, out)}`,
      url,
    ],
    { stdio: 'ignore' },
  );
  console.log(`wrote ${out}`);
}

shoot(pathToFileURL(join(root, 'scripts/og-card.html')).href, 'public/og.png', 1200, 630);

// Square icons from the SVG favicon, on the app's dark background so iOS doesn't add its own.
const svg = readFileSync(join(root, 'public/favicon.svg'), 'utf8');
const tmp = mkdtempSync(join(tmpdir(), 'bi-icon-'));
for (const [out, size] of [
  ['public/apple-touch-icon.png', 180],
  ['public/icon-192.png', 192],
  ['public/icon-512.png', 512],
]) {
  const page = join(tmp, `${size}.html`);
  const pad = Math.round(size * 0.1);
  writeFileSync(
    page,
    `<!doctype html><style>*{margin:0}html,body{width:${size}px;height:${size}px;background:#070b14;overflow:hidden}svg{display:block;margin:${pad}px;width:${size - pad * 2}px;height:${size - pad * 2}px}</style>${svg}`,
  );
  shoot(pathToFileURL(page).href, out, size, size);
}
rmSync(tmp, { recursive: true, force: true });
