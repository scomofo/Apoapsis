import { G, MERGE_FRACTION, radiusFromMass } from "./presets";
import type { Body, Kind } from "./types";

export function computeAccelerations(bodies: Body[]) {
  const n = bodies.length;
  for (let i = 0; i < n; i++) {
    const b = bodies[i];
    b.ax = 0;
    b.ay = 0;
  }
  for (let i = 0; i < n; i++) {
    const a = bodies[i];
    for (let j = i + 1; j < n; j++) {
      const b = bodies[j];
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const r2 = dx * dx + dy * dy;
      const eps = Math.max(5.5, 0.38 * (a.radius + b.radius));
      const s2 = r2 + eps * eps;
      const inv = 1 / Math.sqrt(s2);
      const f = G * inv * inv * inv;
      const fx = dx * f;
      const fy = dy * f;
      a.ax += fx * b.mass;
      a.ay += fy * b.mass;
      b.ax -= fx * a.mass;
      b.ay -= fy * a.mass;
    }
  }
}

export function leapfrog(bodies: Body[], h: number) {
  computeAccelerations(bodies);
  for (let i = 0; i < bodies.length; i++) {
    const b = bodies[i];
    b.vx += b.ax * h * 0.5;
    b.vy += b.ay * h * 0.5;
    b.x += b.vx * h;
    b.y += b.vy * h;
  }
  computeAccelerations(bodies);
  for (let i = 0; i < bodies.length; i++) {
    const b = bodies[i];
    b.vx += b.ax * h * 0.5;
    b.vy += b.ay * h * 0.5;
  }
}

export function accelAt(
  x: number,
  y: number,
  bodies: Body[],
  ignoreId: number,
): { ax: number; ay: number } {
  let ax = 0;
  let ay = 0;
  for (let i = 0; i < bodies.length; i++) {
    const b = bodies[i];
    if (b.id === ignoreId) continue;
    const dx = b.x - x;
    const dy = b.y - y;
    const eps = Math.max(5.5, 0.38 * (b.radius + 6));
    const s2 = dx * dx + dy * dy + eps * eps;
    const inv = 1 / Math.sqrt(s2);
    const f = G * b.mass * inv * inv * inv;
    ax += dx * f;
    ay += dy * f;
  }
  return { ax, ay };
}

export function predictPath(
  x: number,
  y: number,
  vx: number,
  vy: number,
  bodies: Body[],
  steps = 140,
  dt = 1 / 36,
): Float32Array {
  const out = new Float32Array(steps * 2);
  let px = x;
  let py = y;
  let pvx = vx;
  let pvy = vy;
  for (let i = 0; i < steps; i++) {
    const a0 = accelAt(px, py, bodies, -1);
    pvx += a0.ax * dt * 0.5;
    pvy += a0.ay * dt * 0.5;
    px += pvx * dt;
    py += pvy * dt;
    const a1 = accelAt(px, py, bodies, -1);
    pvx += a1.ax * dt * 0.5;
    pvy += a1.ay * dt * 0.5;
    out[i * 2] = px;
    out[i * 2 + 1] = py;
    for (let j = 0; j < bodies.length; j++) {
      const b = bodies[j];
      const dx = px - b.x;
      const dy = py - b.y;
      const hit = b.radius * MERGE_FRACTION + 3;
      if (dx * dx + dy * dy < hit * hit) {
        return out.subarray(0, (i + 1) * 2);
      }
    }
  }
  return out;
}

export function resolveMerges(
  bodies: Body[],
  onMerge: (a: Body, b: Body, merged: Body) => void,
) {
  let changed = true;
  let guard = 0;
  while (changed && guard++ < 24) {
    changed = false;
    outer: for (let i = 0; i < bodies.length; i++) {
      const a = bodies[i];
      for (let j = i + 1; j < bodies.length; j++) {
        const b = bodies[j];
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const thresh = (a.radius + b.radius) * MERGE_FRACTION;
        if (dx * dx + dy * dy <= thresh * thresh) {
          const merged = mergeBodies(a, b);
          onMerge(a, b, merged);
          bodies[i] = merged;
          bodies.splice(j, 1);
          changed = true;
          break outer;
        }
      }
    }
  }
}

function mergeBodies(a: Body, b: Body): Body {
  const heavy = a.mass >= b.mass ? a : b;
  const light = a.mass >= b.mass ? b : a;
  const mass = a.mass + b.mass;
  const inv = 1 / mass;
  const kind = mergeKind(a, b, mass);
  const x = (a.x * a.mass + b.x * b.mass) * inv;
  const y = (a.y * a.mass + b.y * b.mass) * inv;
  const hMass = heavy.mass;
  const lMass = light.mass;
  const takeTrail =
    light.trailCount > heavy.trailCount * 0.6 && lMass > hMass * 0.45;
  heavy.x = x;
  heavy.y = y;
  heavy.px = x;
  heavy.py = y;
  heavy.vx = (a.vx * a.mass + b.vx * b.mass) * inv;
  heavy.vy = (a.vy * a.mass + b.vy * b.mass) * inv;
  heavy.ax = 0;
  heavy.ay = 0;
  heavy.mass = mass;
  heavy.kind = kind;
  heavy.radius = radiusFromMass(mass, kind);
  heavy.hue = (heavy.hue * hMass + light.hue * lMass) / mass;
  if (kind === "star" || kind === "well") {
    heavy.fill = kind === "well" ? "#141416" : heavy.fill;
    heavy.glow = kind === "well" ? "#c56b4a" : heavy.glow;
  }
  heavy.flash = 1;
  if (takeTrail) copyTrail(light, heavy);
  return heavy;
}

function mergeKind(a: Body, b: Body, mass: number): Kind {
  if (a.kind === "well" || b.kind === "well") return "well";
  if (a.kind === "star" || b.kind === "star") {
    return mass >= 2400 ? "star" : a.mass >= b.mass ? a.kind : b.kind;
  }
  if (mass >= 9000) return "star";
  if (mass >= 240) return a.mass >= b.mass ? a.kind : b.kind;
  return a.mass >= b.mass ? a.kind : b.kind;
}

function copyTrail(from: Body, to: Body) {
  to.trail.set(from.trail);
  to.trailCount = from.trailCount;
  to.trailHead = from.trailHead;
  to.lastTrailX = from.lastTrailX;
  to.lastTrailY = from.lastTrailY;
}

export function recordTrail(body: Body, spacing = 5.4) {
  const dx = body.x - body.lastTrailX;
  const dy = body.y - body.lastTrailY;
  if (dx * dx + dy * dy < spacing * spacing) return;
  const i = body.trailHead % (body.trail.length / 2);
  body.trail[i * 2] = body.x;
  body.trail[i * 2 + 1] = body.y;
  body.trailHead += 1;
  if (body.trailCount < body.trail.length / 2) body.trailCount += 1;
  body.lastTrailX = body.x;
  body.lastTrailY = body.y;
}

export function pruneEscaped(bodies: Body[], limit = 28000) {
  for (let i = bodies.length - 1; i >= 0; i--) {
    const b = bodies[i];
    if (b.x * b.x + b.y * b.y > limit * limit) bodies.splice(i, 1);
  }
}
