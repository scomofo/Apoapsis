import { chromium } from "playwright";
import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const DIR = dirname(fileURLToPath(import.meta.url));
const FONT_REG = pathToFileURL(join(DIR, "InstrumentSerif-Regular.ttf")).href;
const FONT_ITA = pathToFileURL(join(DIR, "InstrumentSerif-Italic.ttf")).href;

const INK = "#08090c";
const PAPER = "#ece8e1";
const STEEL = "#b9c4cc";
const SURFACE = "#111318";
const MUTE = "#8e8a84";

function collinearForce(x, mu) {
  const r1 = Math.abs(x + mu);
  const r2 = Math.abs(x - 1 + mu);
  return x - ((1 - mu) * (x + mu)) / (r1 ** 3) - (mu * (x - 1 + mu)) / (r2 ** 3);
}
function collinearDeriv(x, mu) {
  const r1 = Math.abs(x + mu);
  const r2 = Math.abs(x - 1 + mu);
  return 1 + (2 * (1 - mu)) / (r1 ** 3) + (2 * mu) / (r2 ** 3);
}
function solveCollinear(mu, guess) {
  let x = guess;
  for (let i = 0; i < 48; i++) {
    const r1 = Math.abs(x + mu);
    const r2 = Math.abs(x - 1 + mu);
    if (r1 < 1e-14 || r2 < 1e-14) break;
    const step = collinearForce(x, mu) / collinearDeriv(x, mu);
    x -= step;
    if (Math.abs(step) < 1e-15) break;
  }
  return x;
}

const MU = 0.12;
const gHill = Math.cbrt(MU / 3);
const W = {
  M1: { x: -MU, y: 0 },
  M2: { x: 1 - MU, y: 0 },
  L1: { x: solveCollinear(MU, 1 - MU - gHill), y: 0 },
  L2: { x: solveCollinear(MU, 1 - MU + gHill), y: 0 },
  L3: { x: solveCollinear(MU, -1 - (5 * MU) / 12), y: 0 },
  L4: { x: 0.5 - MU, y: Math.sqrt(3) / 2 },
  L5: { x: 0.5 - MU, y: -Math.sqrt(3) / 2 },
};

function stars(seed, n, w, h) {
  let s = seed | 0;
  const rnd = () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const out = [];
  for (let i = 0; i < n; i++) {
    out.push({
      x: +(rnd() * w).toFixed(2),
      y: +(rnd() * h).toFixed(2),
      r: +(rnd() < 0.1 ? 1.15 : 0.35 + rnd() * 0.7).toFixed(2),
      a: +(0.1 + rnd() * 0.32).toFixed(3),
    });
  }
  return out;
}

function diagram({
  width,
  height,
  cx,
  cy,
  scale,
  r1,
  r2,
  labelSize,
  markR,
  axisPad,
  labelOff,
  starCount,
}) {
  const X = (x) => cx + x * scale;
  const Y = (y) => cy - y * scale;
  const m1 = { x: X(W.M1.x), y: Y(W.M1.y) };
  const m2 = { x: X(W.M2.x), y: Y(W.M2.y) };
  const pts = ["L1", "L2", "L3", "L4", "L5"].map((id) => ({
    id,
    x: X(W[id].x),
    y: Y(W[id].y),
  }));
  const R = scale;
  const starPts = stars(0x1a2b3c4d, starCount, width, height);
  const starSvg = starPts
    .map(
      (p) =>
        `<circle cx="${p.x}" cy="${p.y}" r="${p.r}" fill="${STEEL}" fill-opacity="${p.a}"/>`,
    )
    .join("");
  const axisX1 = X(W.L3.x) - axisPad;
  const axisX2 = X(W.L2.x) + axisPad;

  return `
    <defs>
      <radialGradient id="vig" cx="50%" cy="48%" r="68%">
        <stop offset="0%" stop-color="${SURFACE}" stop-opacity="0"/>
        <stop offset="70%" stop-color="${INK}" stop-opacity="0"/>
        <stop offset="100%" stop-color="${INK}" stop-opacity="0.85"/>
      </radialGradient>
      <filter id="grain" x="0" y="0" width="100%" height="100%">
        <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="2" stitchTiles="stitch" result="n"/>
        <feColorMatrix type="saturate" values="0" in="n" result="g"/>
        <feComponentTransfer in="g" result="a">
          <feFuncA type="linear" slope="0.045"/>
        </feComponentTransfer>
      </filter>
    </defs>
    <rect width="${width}" height="${height}" fill="${INK}"/>
    ${starSvg}
    <circle cx="${m1.x.toFixed(2)}" cy="${m1.y.toFixed(2)}" r="${R.toFixed(2)}"
      fill="none" stroke="${STEEL}" stroke-opacity="0.22" stroke-width="0.9"/>
    <circle cx="${m2.x.toFixed(2)}" cy="${m2.y.toFixed(2)}" r="${R.toFixed(2)}"
      fill="none" stroke="${STEEL}" stroke-opacity="0.22" stroke-width="0.9"/>
    <path d="M ${m1.x.toFixed(2)} ${m1.y.toFixed(2)}
             L ${X(W.L4.x).toFixed(2)} ${Y(W.L4.y).toFixed(2)}
             L ${m2.x.toFixed(2)} ${m2.y.toFixed(2)}
             L ${X(W.L5.x).toFixed(2)} ${Y(W.L5.y).toFixed(2)} Z"
      fill="none" stroke="${STEEL}" stroke-opacity="0.16" stroke-width="0.75"/>
    <line x1="${axisX1.toFixed(2)}" y1="${cy}" x2="${axisX2.toFixed(2)}" y2="${cy}"
      stroke="${STEEL}" stroke-opacity="0.42" stroke-width="1"/>
    <circle cx="${m1.x.toFixed(2)}" cy="${m1.y.toFixed(2)}" r="${r1}" fill="${PAPER}"/>
    <circle cx="${m2.x.toFixed(2)}" cy="${m2.y.toFixed(2)}" r="${r2}" fill="${STEEL}"/>
    ${pts
      .map((p) => {
        const o = labelOff[p.id];
        return `
        <circle cx="${p.x.toFixed(2)}" cy="${p.y.toFixed(2)}" r="${markR}"
          fill="none" stroke="${STEEL}" stroke-width="1.35"/>
        <circle cx="${p.x.toFixed(2)}" cy="${p.y.toFixed(2)}" r="1.35" fill="${PAPER}"/>
        <text x="${(p.x + o.dx).toFixed(2)}" y="${(p.y + o.dy).toFixed(2)}"
          fill="${MUTE}" font-family="Instrument Serif, serif" font-style="italic"
          font-size="${labelSize}" text-anchor="middle" dominant-baseline="middle">${p.id}</text>`;
      })
      .join("")}
    <rect width="${width}" height="${height}" fill="url(#vig)"/>
    <rect width="${width}" height="${height}" filter="url(#grain)" style="mix-blend-mode:overlay"/>
  `;
}

function htmlShell({ width, height, body }) {
  return `<!doctype html>
<html>
<head>
<meta charset="utf-8"/>
<style>
@font-face { font-family: "Instrument Serif"; src: url("${FONT_REG}") format("truetype"); font-style: normal; font-weight: 400; }
@font-face { font-family: "Instrument Serif"; src: url("${FONT_ITA}") format("truetype"); font-style: italic; font-weight: 400; }
html, body { margin: 0; padding: 0; width: ${width}px; height: ${height}px; background: ${INK}; overflow: hidden; }
.card { position: relative; width: ${width}px; height: ${height}px; }
svg { display: block; position: absolute; inset: 0; }
.lockup { position: absolute; color: ${PAPER}; font-family: "Instrument Serif", serif; font-weight: 400; pointer-events: none; }
.lockup h1 { margin: 0; padding: 0; font-size: var(--title); font-weight: 400; letter-spacing: 0.05em; line-height: 1; color: ${PAPER}; }
</style>
</head>
<body>${body}</body>
</html>`;
}

// Optical center on the M1–M2 midpoint / L4–L5 column (world x = 0.38)
const ogScale = 214;
const ogCx = 600 - 0.38 * ogScale;
const ogSvg = diagram({
  width: 1200,
  height: 630,
  cx: ogCx,
  cy: 408,
  scale: ogScale,
  r1: 40,
  r2: 17.5,
  labelSize: 17,
  markR: 5.6,
  axisPad: 36,
  starCount: 52,
  labelOff: {
    L1: { dx: 0, dy: 24 },
    L2: { dx: 16, dy: 18 },
    L3: { dx: -16, dy: 18 },
    L4: { dx: 0, dy: -18 },
    L5: { dx: 0, dy: 22 },
  },
});

const ogHtml = htmlShell({
  width: 1200,
  height: 630,
  body: `
  <div class="card">
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 630" width="1200" height="630">${ogSvg}</svg>
    <div class="lockup" style="left:0; right:0; top:64px; text-align:center; --title:104px;">
      <h1>Libration</h1>
    </div>
  </div>`,
});

const banScale = 104;
const banCx = 820 - 0.38 * banScale;
const bannerSvg = diagram({
  width: 1200,
  height: 264,
  cx: banCx,
  cy: 148,
  scale: banScale,
  r1: 20,
  r2: 8.5,
  labelSize: 13,
  markR: 4.2,
  axisPad: 22,
  starCount: 28,
  labelOff: {
    L1: { dx: 0, dy: 16 },
    L2: { dx: 14, dy: 14 },
    L3: { dx: -14, dy: 14 },
    L4: { dx: 16, dy: -2 },
    L5: { dx: 16, dy: 2 },
  },
});

const bannerHtml = htmlShell({
  width: 1200,
  height: 264,
  body: `
  <div class="card">
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 264" width="1200" height="264">${bannerSvg}</svg>
    <div class="lockup" style="left:56px; top:44px; --title:56px;">
      <h1>Libration</h1>
    </div>
  </div>`,
});

writeFileSync(join(DIR, "og.html"), ogHtml);
writeFileSync(join(DIR, "banner.html"), bannerHtml);

const browser = await chromium.launch({
  args: ["--font-render-hinting=none", "--disable-lcd-text"],
});

async function shot(file, w, h, out) {
  const ctx = await browser.newContext({
    viewport: { width: w, height: h },
    deviceScaleFactor: 2,
  });
  const page = await ctx.newPage();
  await page.goto(pathToFileURL(join(DIR, file)).href, { waitUntil: "load" });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(80);
  await page.screenshot({
    path: join(DIR, out),
    type: "png",
    omitBackground: false,
  });
  await ctx.close();
}

await shot("og.html", 1200, 630, "og-raw.png");
await shot("banner.html", 1200, 264, "banner-raw.png");
await browser.close();
console.log("rendered");
