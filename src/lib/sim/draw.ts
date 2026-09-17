import type { Body, Camera, FlingState, Particle } from "./types";

export type Star = { x: number; y: number; r: number; a: number; par: number };

export function makeStarfield(count = 280): Star[] {
  const stars: Star[] = [];
  let s = 0x1a2b3c4d;
  const rnd = () => {
    s |= 0;
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  for (let i = 0; i < count; i++) {
    stars.push({
      x: rnd(),
      y: rnd(),
      r: rnd() < 0.12 ? 1.35 : rnd() * 0.9 + 0.35,
      a: 0.18 + rnd() * 0.55,
      par: 0.04 + rnd() * 0.12,
    });
  }
  return stars;
}

export function resizeCanvas(
  canvas: HTMLCanvasElement,
  ctx: CanvasRenderingContext2D,
) {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const w = canvas.clientWidth;
  const h = canvas.clientHeight;
  const bw = Math.max(1, Math.round(w * dpr));
  const bh = Math.max(1, Math.round(h * dpr));
  if (canvas.width !== bw || canvas.height !== bh) {
    canvas.width = bw;
    canvas.height = bh;
  }
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  return { w, h, dpr };
}

export function viewCenter(w: number, h: number) {
  const bottom = h < 780 ? Math.min(220, h * 0.3) : 108;
  return { cx: w / 2, cy: (h - bottom) * 0.5 + 6 };
}

export function screenToWorld(
  sx: number,
  sy: number,
  cam: Camera,
  w: number,
  h: number,
) {
  const { cx, cy } = viewCenter(w, h);
  return {
    x: cam.x + (sx - cx) / cam.zoom,
    y: cam.y + (sy - cy) / cam.zoom,
  };
}

export function worldToScreen(
  x: number,
  y: number,
  cam: Camera,
  w: number,
  h: number,
  shakeX = 0,
  shakeY = 0,
) {
  return {
    x: (x - cam.x) * cam.zoom + w / 2 + shakeX,
    y: (y - cam.y) * cam.zoom + h / 2 + shakeY,
  };
}

export function drawFrame(opts: {
  ctx: CanvasRenderingContext2D;
  w: number;
  h: number;
  cam: Camera;
  bodies: Body[];
  particles: Particle[];
  stars: Star[];
  fling: FlingState;
  predict: Float32Array | null;
  trails: boolean;
  shakeX: number;
  shakeY: number;
  alpha: number;
  now: number;
  reduced: boolean;
}) {
  const { ctx, w, h, cam, stars, shakeX, shakeY } = opts;
  ctx.fillStyle = "#07080c";
  ctx.fillRect(0, 0, w, h);
  drawStars(ctx, w, h, cam, stars);
  drawVignette(ctx, w, h);

  const { cx, cy } = viewCenter(w, h);
  ctx.save();
  ctx.translate(cx + shakeX, cy + shakeY);
  ctx.scale(cam.zoom, cam.zoom);
  ctx.translate(-cam.x, -cam.y);

  if (opts.trails) drawTrails(ctx, opts.bodies, cam.zoom);
  if (opts.predict) drawPredict(ctx, opts.predict);
  drawBodies(ctx, opts.bodies, opts.alpha, opts.now, cam.zoom);
  drawParticles(ctx, opts.particles);
  if (opts.fling.active) drawFling(ctx, opts.fling);

  ctx.restore();
}

function drawStars(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  cam: Camera,
  stars: Star[],
) {
  ctx.save();
  for (let i = 0; i < stars.length; i++) {
    const s = stars[i];
    const x = ((s.x * w - cam.x * s.par * 0.35) % w + w) % w;
    const y = ((s.y * h - cam.y * s.par * 0.35) % h + h) % h;
    ctx.fillStyle = `rgba(236,238,242,${s.a})`;
    ctx.beginPath();
    ctx.arc(x, y, s.r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function drawVignette(ctx: CanvasRenderingContext2D, w: number, h: number) {
  const g = ctx.createRadialGradient(
    w * 0.5,
    h * 0.48,
    Math.min(w, h) * 0.25,
    w * 0.5,
    h * 0.5,
    Math.max(w, h) * 0.72,
  );
  g.addColorStop(0, "rgba(7,8,12,0)");
  g.addColorStop(1, "rgba(7,8,12,0.55)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
}

function drawTrails(ctx: CanvasRenderingContext2D, bodies: Body[], zoom: number) {
  const cap = (bodies[0]?.trail.length ?? 0) / 2;
  if (!cap) return;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  for (let b = 0; b < bodies.length; b++) {
    const body = bodies[b];
    if (body.trailCount < 2) continue;
    const n = body.trailCount;
    ctx.beginPath();
    let started = false;
    for (let i = 0; i < n; i++) {
      const idx = (body.trailHead - n + i + cap * 8) % cap;
      const x = body.trail[idx * 2];
      const y = body.trail[idx * 2 + 1];
      if (started) ctx.lineTo(x, y);
      else {
        ctx.moveTo(x, y);
        started = true;
      }
    }
    ctx.lineTo(body.x, body.y);
    const t = Math.min(1, n / 40);
    ctx.strokeStyle = hsla(body.hue, 28, 72, 0.18 + t * 0.28);
    ctx.lineWidth = Math.max(1.1, (body.kind === "star" ? 2.4 : 1.4) / zoom);
    ctx.stroke();
  }
}

function drawPredict(ctx: CanvasRenderingContext2D, path: Float32Array) {
  const n = path.length / 2;
  if (n < 2) return;
  ctx.beginPath();
  ctx.moveTo(path[0], path[1]);
  for (let i = 1; i < n; i++) ctx.lineTo(path[i * 2], path[i * 2 + 1]);
  ctx.strokeStyle = "rgba(199,205,216,0.55)";
  ctx.lineWidth = 1.15;
  ctx.setLineDash([5, 6]);
  ctx.stroke();
  ctx.setLineDash([]);
  const lx = path[path.length - 2];
  const ly = path[path.length - 1];
  ctx.beginPath();
  ctx.arc(lx, ly, 2.4, 0, Math.PI * 2);
  ctx.fillStyle = "rgba(236,238,242,0.7)";
  ctx.fill();
}

function drawFling(ctx: CanvasRenderingContext2D, fling: FlingState) {
  ctx.beginPath();
  ctx.moveTo(fling.x0, fling.y0);
  ctx.lineTo(fling.x1, fling.y1);
  ctx.strokeStyle = "rgba(236,238,242,0.7)";
  ctx.lineWidth = 1.4;
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(fling.x0, fling.y0, 3.2, 0, Math.PI * 2);
  ctx.fillStyle = "rgba(236,238,242,0.85)";
  ctx.fill();
}

function drawBodies(
  ctx: CanvasRenderingContext2D,
  bodies: Body[],
  alpha: number,
  now: number,
  zoom: number,
) {
  const order = bodies.slice().sort((a, b) => b.radius - a.radius);
  const light = heaviestAttractor(bodies);
  for (let i = 0; i < order.length; i++) {
    const b = order[i];
    const x = b.px + (b.x - b.px) * alpha;
    const y = b.py + (b.y - b.py) * alpha;
    if (b.kind === "star") drawStar(ctx, b, x, y, now, zoom);
    else if (b.kind === "well") drawWell(ctx, b, x, y, now, zoom);
    else drawPlanet(ctx, b, x, y, light);
  }
}

function heaviestAttractor(bodies: Body[]): Body | null {
  let best: Body | null = null;
  for (let i = 0; i < bodies.length; i++) {
    const b = bodies[i];
    if (b.kind !== "star" && b.kind !== "well") continue;
    if (!best || b.mass > best.mass) best = b;
  }
  return best;
}

function drawStar(
  ctx: CanvasRenderingContext2D,
  b: Body,
  x: number,
  y: number,
  now: number,
  zoom: number,
) {
  const pulse = 0.92 + Math.sin(now * 0.0018 + b.id) * 0.08;
  const glowR = b.radius * (3.6 + b.flash * 1.4) * pulse;
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  const g = ctx.createRadialGradient(x, y, b.radius * 0.15, x, y, glowR);
  g.addColorStop(0, hsla(b.hue, 70, 88, 0.95));
  g.addColorStop(0.22, hsla(b.hue, 80, 68, 0.55));
  g.addColorStop(0.55, hsla(b.hue, 70, 50, 0.12));
  g.addColorStop(1, hsla(b.hue, 70, 50, 0));
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(x, y, glowR, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  const core = ctx.createRadialGradient(
    x - b.radius * 0.25,
    y - b.radius * 0.28,
    b.radius * 0.1,
    x,
    y,
    b.radius,
  );
  core.addColorStop(0, "#fff8e8");
  core.addColorStop(0.45, b.fill);
  core.addColorStop(1, hsla(b.hue, 70, 42, 1));
  ctx.fillStyle = core;
  ctx.beginPath();
  ctx.arc(x, y, b.radius, 0, Math.PI * 2);
  ctx.fill();

  if (b.flash > 0.04) {
    ctx.strokeStyle = hsla(b.hue, 80, 88, b.flash * 0.7);
    ctx.lineWidth = Math.max(1.2, 3 / zoom);
    ctx.stroke();
  }
}

function drawWell(
  ctx: CanvasRenderingContext2D,
  b: Body,
  x: number,
  y: number,
  now: number,
  zoom: number,
) {
  const diskR = b.radius * 2.8;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(now * 0.00025);
  ctx.scale(1, 0.38);
  const disk = ctx.createRadialGradient(0, 0, b.radius * 0.6, 0, 0, diskR);
  disk.addColorStop(0, "rgba(197,107,74,0.05)");
  disk.addColorStop(0.45, "rgba(197,107,74,0.55)");
  disk.addColorStop(0.72, "rgba(232,195,138,0.35)");
  disk.addColorStop(1, "rgba(197,107,74,0)");
  ctx.fillStyle = disk;
  ctx.beginPath();
  ctx.arc(0, 0, diskR, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  ctx.beginPath();
  ctx.arc(x, y, b.radius * 1.55, 0, Math.PI * 2);
  ctx.strokeStyle = "rgba(232,195,138,0.45)";
  ctx.lineWidth = Math.max(1, 1.4 / zoom);
  ctx.stroke();

  ctx.fillStyle = "#050507";
  ctx.beginPath();
  ctx.arc(x, y, b.radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "rgba(236,238,242,0.16)";
  ctx.lineWidth = 1;
  ctx.stroke();
}

function drawPlanet(
  ctx: CanvasRenderingContext2D,
  b: Body,
  x: number,
  y: number,
  light: Body | null,
) {
  let lx = -0.45;
  let ly = -0.55;
  if (light && light.id !== b.id) {
    const dx = x - light.x;
    const dy = y - light.y;
    const len = Math.hypot(dx, dy) || 1;
    lx = dx / len;
    ly = dy / len;
  }
  const gx = x - lx * b.radius * 0.38;
  const gy = y - ly * b.radius * 0.38;
  const g = ctx.createRadialGradient(gx, gy, b.radius * 0.08, x, y, b.radius);
  g.addColorStop(0, hsla(b.hue, 38, 78, 1));
  g.addColorStop(0.45, b.fill);
  g.addColorStop(1, hsla(b.hue, 30, 18, 1));
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(x, y, b.radius, 0, Math.PI * 2);
  ctx.fill();

  ctx.beginPath();
  ctx.arc(x, y, b.radius + Math.max(1.2, b.radius * 0.12), 0, Math.PI * 2);
  ctx.strokeStyle = hsla(b.hue, 30, 70, 0.22);
  ctx.lineWidth = Math.max(1, b.radius * 0.08);
  ctx.stroke();

  if (b.kind === "giant") {
    ctx.save();
    ctx.beginPath();
    ctx.arc(x, y, b.radius, 0, Math.PI * 2);
    ctx.clip();
    ctx.strokeStyle = hsla(b.hue, 25, 20, 0.28);
    ctx.lineWidth = b.radius * 0.18;
    ctx.beginPath();
    ctx.moveTo(x - b.radius, y + b.radius * 0.18);
    ctx.lineTo(x + b.radius, y + b.radius * 0.18);
    ctx.stroke();
    ctx.restore();
  }

  if (b.flash > 0.04) {
    ctx.strokeStyle = `rgba(236,238,242,${b.flash * 0.85})`;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(x, y, b.radius + 2, 0, Math.PI * 2);
    ctx.stroke();
  }
}

function drawParticles(ctx: CanvasRenderingContext2D, particles: Particle[]) {
  for (let i = 0; i < particles.length; i++) {
    const p = particles[i];
    const t = p.life / p.maxLife;
    ctx.fillStyle = hsla(p.hue, 50, 72, t * 0.85);
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size * (0.4 + t), 0, Math.PI * 2);
    ctx.fill();
  }
}

function hsla(h: number, s: number, l: number, a: number) {
  return `hsla(${h}, ${s}%, ${l}%, ${a})`;
}
