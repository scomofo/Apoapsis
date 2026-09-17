import type { Body, Kind } from "./types";

export const G = 920;
export const MAX_BODIES = 48;
export const TRAIL_CAP = 220;
export const STEP = 1 / 120;
export const MERGE_FRACTION = 0.76;
export const FLING_SCALE = 1.65;
export const MIN_ZOOM = 0.08;
export const MAX_ZOOM = 5;

export type MassPreset = {
  id: Kind;
  label: string;
  mass: number;
  radius: number;
  hue: number;
  fill: string;
  glow: string;
};

export const MASS_PRESETS: readonly MassPreset[] = [
  {
    id: "dust",
    label: "Dust",
    mass: 2.2,
    radius: 3.1,
    hue: 38,
    fill: "#c4b7a4",
    glow: "#d9cbb6",
  },
  {
    id: "moon",
    label: "Moon",
    mass: 16,
    radius: 7.2,
    hue: 210,
    fill: "#9aa6b4",
    glow: "#c5d0da",
  },
  {
    id: "world",
    label: "World",
    mass: 64,
    radius: 13.2,
    hue: 198,
    fill: "#6f93a8",
    glow: "#9ec4d4",
  },
  {
    id: "giant",
    label: "Giant",
    mass: 380,
    radius: 22,
    hue: 32,
    fill: "#c4a07a",
    glow: "#e2c39a",
  },
  {
    id: "star",
    label: "Star",
    mass: 17500,
    radius: 46,
    hue: 42,
    fill: "#ead4a2",
    glow: "#fff1c8",
  },
  {
    id: "well",
    label: "Well",
    mass: 64000,
    radius: 15,
    hue: 18,
    fill: "#141416",
    glow: "#c56b4a",
  },
] as const;

const PRESET_MAP = new Map(MASS_PRESETS.map((p) => [p.id, p]));

export function presetById(kind: Kind): MassPreset {
  return PRESET_MAP.get(kind) ?? MASS_PRESETS[2];
}

export function radiusFromMass(mass: number, kind: Kind): number {
  if (kind === "well") return Math.max(11, 5.4 + Math.pow(mass, 0.11));
  if (kind === "star") return Math.max(20, 3.15 * Math.pow(mass, 0.29));
  return Math.max(2.3, 2.55 * Math.pow(mass, 0.33));
}

export function circularSpeed(
  primaryMass: number,
  dx: number,
  dy: number,
  retrograde = false,
): { vx: number; vy: number } {
  const r = Math.hypot(dx, dy) || 1;
  const v = Math.sqrt((G * primaryMass) / r);
  const nx = dx / r;
  const ny = dy / r;
  return retrograde
    ? { vx: ny * v, vy: -nx * v }
    : { vx: -ny * v, vy: nx * v };
}

let nextId = 1;

export function resetIds() {
  nextId = 1;
}

export function makeBody(
  partial: Pick<Body, "x" | "y" | "vx" | "vy" | "mass" | "kind"> &
    Partial<Pick<Body, "radius" | "hue" | "fill" | "glow">>,
): Body {
  const preset = presetById(partial.kind);
  const hueJitter = (hash(nextId) - 0.5) * (partial.kind === "star" ? 8 : 18);
  const hue = partial.hue ?? preset.hue + hueJitter;
  const radius = partial.radius ?? radiusFromMass(partial.mass, partial.kind);
  const trail = new Float32Array(TRAIL_CAP * 2);
  return {
    id: nextId++,
    x: partial.x,
    y: partial.y,
    px: partial.x,
    py: partial.y,
    vx: partial.vx,
    vy: partial.vy,
    ax: 0,
    ay: 0,
    mass: partial.mass,
    radius,
    kind: partial.kind,
    hue,
    fill: partial.fill ?? preset.fill,
    glow: partial.glow ?? preset.glow,
    trail,
    trailCount: 0,
    trailHead: 0,
    lastTrailX: partial.x,
    lastTrailY: partial.y,
    flash: 0,
    born: 0,
  };
}

function hash(n: number) {
  const x = Math.imul(n ^ 0x9e3779b9, 0x85ebca6b);
  return ((x ^ (x >>> 13)) >>> 0) / 4294967296;
}
