import fs from 'fs';
import path from 'path';
import sharp from 'sharp';

const root = process.cwd();
const dirCandidates = [
  path.join(root, 'data', 'media', 'images', 'Confirmed Fake'),
  path.join('/data', 'media', 'images', 'Confirmed Fake'),
];

function isTarget(filename: string, targets: number[]) {
  const base = filename.toLowerCase();
  return targets.some((n) => base.includes(n.toString()));
}

async function watermarkFile(filePath: string) {
  const buf = fs.readFileSync(filePath);
  const meta = await sharp(buf).metadata();
  const w = meta.width || 0;
  const h = meta.height || 0;
  const svg = Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}">
      <defs>
        <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stop-color="rgba(255,0,0,0.0)"/>
          <stop offset="0.5" stop-color="rgba(255,0,0,0.18)"/>
          <stop offset="1" stop-color="rgba(255,0,0,0.0)"/>
        </linearGradient>
      </defs>
      <rect width="${w}" height="${h}" fill="url(#g)"/>
      <g transform="translate(${Math.floor(w / 2)},${Math.floor(h / 2)}) rotate(-30)">
        <text x="0" y="0" text-anchor="middle" dominant-baseline="middle"
          font-family="Arial, Helvetica, sans-serif" font-size="${Math.floor(Math.min(w, h) * 0.18)}"
          fill="rgba(255,0,0,0.35)" stroke="rgba(255,255,255,0.25)" stroke-width="${Math.max(1, Math.floor(Math.min(w, h) * 0.005))}">
          FAKE
        </text>
      </g>
    </svg>`,
  );
  await sharp(buf).rotate().composite([{ input: svg, gravity: 'center' }]).toFile(filePath);
}

async function run() {
  const args = process.argv.slice(2).map((a) => parseInt(a)).filter((n) => !isNaN(n));
  const targets = args.length ? args : [7, 9, 11];
  const dir = dirCandidates.find((d) => fs.existsSync(d));
  if (!dir) {
    process.exit(1);
  }
  const files = fs.readdirSync(dir);
  for (const f of files) {
    const full = path.join(dir, f);
    if (!fs.statSync(full).isFile()) continue;
    if (isTarget(f, targets)) {
      await watermarkFile(full);
    }
  }
}

run();
