import { circularSpeed, makeBody, resetIds } from "./presets";
import type { Body, ScenarioId } from "./types";

export const SCENARIOS: { id: ScenarioId; label: string }[] = [
  { id: "system", label: "System" },
  { id: "binary", label: "Binary" },
  { id: "figure8", label: "Figure-8" },
  { id: "slingshot", label: "Slingshot" },
  { id: "empty", label: "Empty" },
];

export function buildScenario(id: ScenarioId): Body[] {
  resetIds();
  switch (id) {
    case "system":
      return neutralizeCOM(system());
    case "binary":
      return neutralizeCOM(binary());
    case "figure8":
      return neutralizeCOM(figure8());
    case "slingshot":
      return neutralizeCOM(slingshot());
    case "empty":
      return [];
  }
}

function neutralizeCOM(bodies: Body[]) {
  let m = 0;
  let mx = 0;
  let my = 0;
  let mvx = 0;
  let mvy = 0;
  for (let i = 0; i < bodies.length; i++) {
    const b = bodies[i];
    m += b.mass;
    mx += b.mass * b.x;
    my += b.mass * b.y;
    mvx += b.mass * b.vx;
    mvy += b.mass * b.vy;
  }
  if (m <= 0) return bodies;
  const cx = mx / m;
  const cy = my / m;
  const cvx = mvx / m;
  const cvy = mvy / m;
  for (let i = 0; i < bodies.length; i++) {
    const b = bodies[i];
    b.x -= cx;
    b.y -= cy;
    b.px = b.x;
    b.py = b.y;
    b.vx -= cvx;
    b.vy -= cvy;
  }
  return bodies;
}

function system(): Body[] {
  const star = makeBody({
    x: 0,
    y: 0,
    vx: 0,
    vy: 0,
    mass: 17500,
    kind: "star",
    hue: 42,
  });
  const worldPos = { x: 230, y: 12 };
  const worldV = circularSpeed(star.mass, worldPos.x, worldPos.y);
  const world = makeBody({
    x: worldPos.x,
    y: worldPos.y,
    vx: worldV.vx,
    vy: worldV.vy,
    mass: 70,
    kind: "world",
    hue: 198,
  });
  const moonOff = { x: 28, y: 6 };
  const moonRel = circularSpeed(world.mass, moonOff.x, moonOff.y);
  const moon = makeBody({
    x: world.x + moonOff.x,
    y: world.y + moonOff.y,
    vx: world.vx + moonRel.vx,
    vy: world.vy + moonRel.vy,
    mass: 14,
    kind: "moon",
  });
  const giantPos = { x: -360, y: 40 };
  const giantV = circularSpeed(star.mass, giantPos.x, giantPos.y, true);
  const giant = makeBody({
    x: giantPos.x,
    y: giantPos.y,
    vx: giantV.vx,
    vy: giantV.vy,
    mass: 400,
    kind: "giant",
    hue: 28,
  });
  const icePos = { x: 18, y: 510 };
  const iceV = circularSpeed(star.mass, icePos.x, icePos.y);
  const ice = makeBody({
    x: icePos.x,
    y: icePos.y,
    vx: iceV.vx * 0.92,
    vy: iceV.vy * 0.92,
    mass: 210,
    kind: "giant",
    hue: 196,
    fill: "#7f9eb0",
    glow: "#b7d0dc",
  });
  const cometPos = { x: -620, y: -280 };
  const comet = makeBody({
    x: cometPos.x,
    y: cometPos.y,
    vx: 78,
    vy: 118,
    mass: 3.4,
    kind: "dust",
    hue: 48,
  });
  return [star, world, moon, giant, ice, comet];
}

function binary(): Body[] {
  const m = 9200;
  const sep = 168;
  const v = circularSpeed(m, sep, 0);
  // Equal masses: each moves at sqrt(G m / (2 r)) around the barycenter.
  const speed = v.vy * Math.SQRT1_2;
  const a = makeBody({
    x: -sep / 2,
    y: 0,
    vx: 0,
    vy: speed,
    mass: m,
    kind: "star",
    hue: 38,
  });
  const b = makeBody({
    x: sep / 2,
    y: 0,
    vx: 0,
    vy: -speed,
    mass: m,
    kind: "star",
    hue: 22,
    fill: "#f0c4a0",
    glow: "#ffd8bc",
  });
  const worldPos = { x: 0, y: 430 };
  const worldV = circularSpeed(m * 2, worldPos.x, worldPos.y);
  const world = makeBody({
    x: worldPos.x,
    y: worldPos.y,
    vx: worldV.vx,
    vy: worldV.vy,
    mass: 58,
    kind: "world",
  });
  const moonOff = { x: -26, y: 4 };
  const moonRel = circularSpeed(world.mass, moonOff.x, moonOff.y, true);
  const moon = makeBody({
    x: world.x + moonOff.x,
    y: world.y + moonOff.y,
    vx: world.vx + moonRel.vx,
    vy: world.vy + moonRel.vy,
    mass: 12,
    kind: "moon",
  });
  return [a, b, world, moon];
}

function figure8(): Body[] {
  // Chenciner–Montgomery figure-8, G=1, m=1, scaled into world units.
  const L = 118;
  const mass = 210;
  // v' = v * sqrt(G_world * M / L) with G_world = 920
  const vScale = Math.sqrt((920 * mass) / L);
  const p1 = { x: 0.9700043567328079 * L, y: -0.2430875315358615 * L };
  const p2 = { x: -0.9700043567328079 * L, y: 0.2430875315358615 * L };
  const p3 = { x: 0, y: 0 };
  const v3 = { vx: -0.9324073702994434 * vScale, vy: -0.8647314610797186 * vScale };
  const v12 = { vx: -v3.vx / 2, vy: -v3.vy / 2 };
  const r = 11.5;
  return [
    makeBody({
      x: p1.x,
      y: p1.y,
      vx: v12.vx,
      vy: v12.vy,
      mass,
      kind: "world",
      radius: r,
      hue: 198,
    }),
    makeBody({
      x: p2.x,
      y: p2.y,
      vx: v12.vx,
      vy: v12.vy,
      mass,
      kind: "world",
      radius: r,
      hue: 32,
      fill: "#c4a07a",
      glow: "#e2c39a",
    }),
    makeBody({
      x: p3.x,
      y: p3.y,
      vx: v3.vx,
      vy: v3.vy,
      mass,
      kind: "world",
      radius: r,
      hue: 48,
      fill: "#d4c4a0",
      glow: "#efe3c4",
    }),
  ];
}

function slingshot(): Body[] {
  const star = makeBody({
    x: 0,
    y: 0,
    vx: 0,
    vy: 0,
    mass: 17500,
    kind: "star",
  });
  const giantPos = { x: 280, y: 0 };
  const giantV = circularSpeed(star.mass, giantPos.x, giantPos.y);
  const giant = makeBody({
    x: giantPos.x,
    y: giantPos.y,
    vx: giantV.vx,
    vy: giantV.vy,
    mass: 520,
    kind: "giant",
    hue: 26,
  });
  const probe = makeBody({
    x: -640,
    y: 210,
    vx: 210,
    vy: -18,
    mass: 4,
    kind: "dust",
    hue: 48,
  });
  const moonPos = { x: -40, y: 340 };
  const moonV = circularSpeed(star.mass, moonPos.x, moonPos.y);
  const moon = makeBody({
    x: moonPos.x,
    y: moonPos.y,
    vx: moonV.vx,
    vy: moonV.vy,
    mass: 18,
    kind: "moon",
  });
  return [star, giant, probe, moon];
}
