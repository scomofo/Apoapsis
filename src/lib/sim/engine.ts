import { createAudio } from "./audio";
import {
  drawFrame,
  makeStarfield,
  resizeCanvas,
  screenToWorld,
  viewCenter,
  type Star,
} from "./draw";
import {
  leapfrog,
  predictPath,
  pruneEscaped,
  recordTrail,
  resolveMerges,
} from "./physics";
import {
  FLING_SCALE,
  makeBody,
  MASS_PRESETS,
  MAX_BODIES,
  MAX_ZOOM,
  MIN_ZOOM,
  presetById,
  STEP,
} from "./presets";
import { buildScenario } from "./scenarios";
import type {
  Body,
  Camera,
  EngineApi,
  FlingState,
  HudSnapshot,
  Kind,
  Particle,
  ScenarioId,
} from "./types";

const SAVE_KEY = "apoapsis-v1";

type Saved = {
  version: 1;
  preset: Kind;
  trails: boolean;
  mute: boolean;
  timeScale: number;
};

let live: EngineApi | null = null;

export function createEngine(
  canvas: HTMLCanvasElement,
  onHud: (s: HudSnapshot) => void,
): EngineApi {
  live?.destroy();
  const prev = (window as unknown as { __apoapsis?: EngineApi }).__apoapsis;
  if (prev && prev !== live) prev.destroy();
  live = null;
  const rawCtx = canvas.getContext("2d", { alpha: false, desynchronized: true });
  if (!rawCtx) throw new Error("Canvas 2D is unavailable.");
  const ctx: CanvasRenderingContext2D = rawCtx;

  const audio = createAudio();
  const reduced =
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  let bodies: Body[] = [];
  const particles: Particle[] = [];
  const stars: Star[] = makeStarfield();
  const cam: Camera = { x: 0, y: 0, zoom: 1 };
  const fling: FlingState = {
    active: false,
    x0: 0,
    y0: 0,
    x1: 0,
    y1: 0,
    pointerId: -1,
  };

  let paused = false;
  let timeScale = 1;
  let trails = true;
  let track = false;
  let mute = false;
  let preset: Kind = "world";
  let scenario: ScenarioId = "system";
  let merges = 0;
  let hint = true;
  let running = false;
  let raf = 0;
  let acc = 0;
  let last = 0;
  let size = { w: 800, h: 600, dpr: 1 };
  let predict: Float32Array | null = null;
  let trauma = 0;
  let panPointer = -1;
  let panLastX = 0;
  let panLastY = 0;
  let pinch: {
    idA: number;
    idB: number;
    dist: number;
    midX: number;
    midY: number;
  } | null = null;
  const pointers = new Map<number, { x: number; y: number }>();
  const keys = new Set<string>();
  let hudDirty = true;
  let hudClock = 0;

  const saved = loadSave();
  if (saved) {
    preset = saved.preset;
    trails = saved.trails;
    mute = saved.mute;
    timeScale = saved.timeScale;
    audio.setMute(mute);
  }

  bodies = buildScenario("system");
  fitCamera(true);

  function snapshot(): HudSnapshot {
    return {
      count: bodies.length,
      merges,
      paused,
      timeScale,
      trails,
      track,
      mute,
      preset,
      scenario,
      hint,
    };
  }

  function emitHud(force = false) {
    if (!force && !hudDirty) return;
    hudDirty = false;
    onHud(snapshot());
  }

  function persist() {
    try {
      const data: Saved = { version: 1, preset, trails, mute, timeScale };
      localStorage.setItem(SAVE_KEY, JSON.stringify(data));
    } catch {
      /* ignore quota */
    }
  }

  function viewPos(e: PointerEvent) {
    const rect = canvas.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  }

  function spawnBody(x: number, y: number, vx: number, vy: number, kind = preset) {
    if (bodies.length >= MAX_BODIES) return;
    const p = presetById(kind);
    const body = makeBody({
      x,
      y,
      vx,
      vy,
      mass: p.mass,
      kind,
      radius: p.radius,
    });
    body.born = performance.now();
    body.flash = 0.7;
    bodies.push(body);
    hint = false;
    hudDirty = true;
  }

  function onMerge(a: Body, b: Body, merged: Body) {
    merges += 1;
    hudDirty = true;
    const impact = Math.min(1, (a.mass + b.mass) / 8000);
    if (!reduced) trauma = Math.min(1, trauma + 0.18 + impact * 0.45);
    audio.merge(merged.mass);
    const n = 10 + Math.floor(impact * 16);
    const speed = 40 + impact * 90;
    for (let i = 0; i < n; i++) {
      const ang = (Math.PI * 2 * i) / n + Math.random() * 0.4;
      particles.push({
        x: merged.x,
        y: merged.y,
        vx: Math.cos(ang) * speed * (0.4 + Math.random()),
        vy: Math.sin(ang) * speed * (0.4 + Math.random()),
        life: 1,
        maxLife: 0.45 + Math.random() * 0.4,
        size: 1.4 + Math.random() * 2.4,
        hue: merged.hue,
      });
    }
  }

  function physicsFrame(h: number) {
    for (let i = 0; i < bodies.length; i++) {
      const b = bodies[i];
      b.px = b.x;
      b.py = b.y;
    }
    leapfrog(bodies, h);
    resolveMerges(bodies, onMerge);
    pruneEscaped(bodies);
    if (trails) {
      for (let i = 0; i < bodies.length; i++) recordTrail(bodies[i]);
    }
  }

  function barycenter() {
    let mx = 0;
    let my = 0;
    let m = 0;
    for (let i = 0; i < bodies.length; i++) {
      const b = bodies[i];
      mx += b.x * b.mass;
      my += b.y * b.mass;
      m += b.mass;
    }
    if (m <= 0) return { x: 0, y: 0 };
    return { x: mx / m, y: my / m };
  }

  function fitCamera(instant = false) {
    if (bodies.length === 0) {
      cam.x = 0;
      cam.y = 0;
      cam.zoom = 1;
      return;
    }
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    for (let i = 0; i < bodies.length; i++) {
      const b = bodies[i];
      const pad = b.radius * 4 + 40;
      minX = Math.min(minX, b.x - pad);
      minY = Math.min(minY, b.y - pad);
      maxX = Math.max(maxX, b.x + pad);
      maxY = Math.max(maxY, b.y + pad);
    }
    const cx = (minX + maxX) / 2;
    const cy = (minY + maxY) / 2;
    const spanX = Math.max(120, maxX - minX);
    const spanY = Math.max(120, maxY - minY);
    const { cy: opticalCy } = viewCenter(size.w, size.h);
    const availH = Math.max(160, opticalCy * 2);
    const z = Math.min(
      MAX_ZOOM,
      Math.max(MIN_ZOOM, 0.78 * Math.min(size.w / spanX, availH / spanY)),
    );
    if (instant) {
      cam.x = cx;
      cam.y = cy;
      cam.zoom = z;
    } else {
      cam.x = cx;
      cam.y = cy;
      cam.zoom = z;
    }
  }

  function updatePredict() {
    if (!fling.active) {
      predict = null;
      return;
    }
    const vx = (fling.x1 - fling.x0) * FLING_SCALE;
    const vy = (fling.y1 - fling.y0) * FLING_SCALE;
    predict = predictPath(fling.x0, fling.y0, vx, vy, bodies);
  }

  function loop(ts: number) {
    if (!running) return;
    raf = requestAnimationFrame(loop);
    if (!last) last = ts;
    const raw = (ts - last) / 1000;
    last = ts;
    const dt = Math.min(raw, 0.05);
    size = resizeCanvas(canvas, ctx);

    if (!track) {
      const pan = (420 * dt) / cam.zoom;
      if (keys.has("KeyA") || keys.has("ArrowLeft")) cam.x -= pan;
      if (keys.has("KeyD") || keys.has("ArrowRight")) cam.x += pan;
      if (keys.has("KeyW") || keys.has("ArrowUp")) cam.y -= pan;
      if (keys.has("KeyS") || keys.has("ArrowDown")) cam.y += pan;
    }
    if (track && bodies.length) {
      const c = barycenter();
      const k = 1 - Math.exp(-3.2 * dt);
      cam.x += (c.x - cam.x) * k;
      cam.y += (c.y - cam.y) * k;
    }

    if (!paused) {
      acc += dt * timeScale;
      const cap = STEP * 14;
      if (acc > cap) acc = cap;
      let steps = 0;
      while (acc >= STEP && steps < 14) {
        physicsFrame(STEP);
        acc -= STEP;
        steps += 1;
      }
    } else {
      acc = 0;
    }

    const alpha = paused ? 1 : acc / STEP;
    trauma = Math.max(0, trauma - dt * 2.4);
    const shakeMag = reduced ? 0 : trauma * trauma * 14;
    const shakeX = shakeMag ? (Math.random() * 2 - 1) * shakeMag : 0;
    const shakeY = shakeMag ? (Math.random() * 2 - 1) * shakeMag : 0;

    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.life -= dt / p.maxLife;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vx *= 0.98;
      p.vy *= 0.98;
      if (p.life <= 0) particles.splice(i, 1);
    }
    for (let i = 0; i < bodies.length; i++) {
      const b = bodies[i];
      if (b.flash > 0) b.flash = Math.max(0, b.flash - dt * 1.8);
    }

    drawFrame({
      ctx,
      w: size.w,
      h: size.h,
      cam,
      bodies,
      particles,
      stars,
      fling,
      predict,
      trails,
      shakeX,
      shakeY,
      alpha,
      now: ts,
      reduced,
    });

    hudClock += dt;
    if (hudDirty || hudClock > 0.12) {
      hudClock = 0;
      emitHud(true);
    }
  }

  function onPointerDown(e: PointerEvent) {
    audio.unlock();
    canvas.setPointerCapture(e.pointerId);
    const p = viewPos(e);
    pointers.set(e.pointerId, p);
    if (pointers.size === 2) {
      fling.active = false;
      predict = null;
      const pts = [...pointers.entries()];
      const a = pts[0][1];
      const b = pts[1][1];
      pinch = {
        idA: pts[0][0],
        idB: pts[1][0],
        dist: Math.hypot(b.x - a.x, b.y - a.y) || 1,
        midX: (a.x + b.x) / 2,
        midY: (a.y + b.y) / 2,
      };
      panPointer = -1;
      return;
    }
    if (e.button === 1 || e.button === 2) {
      panPointer = e.pointerId;
      panLastX = p.x;
      panLastY = p.y;
      canvas.style.cursor = "grabbing";
      return;
    }
    if (e.button !== 0 && e.pointerType === "mouse") return;
    const world = screenToWorld(p.x, p.y, cam, size.w, size.h);
    fling.active = true;
    fling.pointerId = e.pointerId;
    fling.x0 = world.x;
    fling.y0 = world.y;
    fling.x1 = world.x;
    fling.y1 = world.y;
    updatePredict();
  }

  function onPointerMove(e: PointerEvent) {
    const p = viewPos(e);
    if (pointers.has(e.pointerId)) pointers.set(e.pointerId, p);
    if (pinch && pointers.size >= 2) {
      const a = pointers.get(pinch.idA);
      const b = pointers.get(pinch.idB);
      if (a && b) {
        const dist = Math.hypot(b.x - a.x, b.y - a.y) || 1;
        const midX = (a.x + b.x) / 2;
        const midY = (a.y + b.y) / 2;
        const before = screenToWorld(midX, midY, cam, size.w, size.h);
        const scale = dist / pinch.dist;
        cam.zoom = clamp(cam.zoom * scale, MIN_ZOOM, MAX_ZOOM);
        const after = screenToWorld(midX, midY, cam, size.w, size.h);
        cam.x += before.x - after.x;
        cam.y += before.y - after.y;
        cam.x -= (midX - pinch.midX) / cam.zoom;
        cam.y -= (midY - pinch.midY) / cam.zoom;
        pinch.dist = dist;
        pinch.midX = midX;
        pinch.midY = midY;
        track = false;
        hudDirty = true;
      }
      return;
    }
    if (panPointer === e.pointerId) {
      cam.x -= (p.x - panLastX) / cam.zoom;
      cam.y -= (p.y - panLastY) / cam.zoom;
      panLastX = p.x;
      panLastY = p.y;
      track = false;
      hudDirty = true;
      return;
    }
    if (fling.active && fling.pointerId === e.pointerId) {
      const world = screenToWorld(p.x, p.y, cam, size.w, size.h);
      fling.x1 = world.x;
      fling.y1 = world.y;
      updatePredict();
    }
  }

  function endPointer(e: PointerEvent) {
    pointers.delete(e.pointerId);
    if (pinch && (e.pointerId === pinch.idA || e.pointerId === pinch.idB)) {
      pinch = null;
    }
    if (panPointer === e.pointerId) {
      panPointer = -1;
      canvas.style.cursor = "crosshair";
    }
    if (fling.active && fling.pointerId === e.pointerId) {
      const vx = (fling.x1 - fling.x0) * FLING_SCALE;
      const vy = (fling.y1 - fling.y0) * FLING_SCALE;
      spawnBody(fling.x0, fling.y0, vx, vy);
      audio.fling(Math.hypot(vx, vy));
      fling.active = false;
      fling.pointerId = -1;
      predict = null;
    }
  }

  function onWheel(e: WheelEvent) {
    e.preventDefault();
    const rect = canvas.getBoundingClientRect();
    const sx = e.clientX - rect.left;
    const sy = e.clientY - rect.top;
    const before = screenToWorld(sx, sy, cam, size.w, size.h);
    const factor = Math.exp(-e.deltaY * 0.0012);
    cam.zoom = clamp(cam.zoom * factor, MIN_ZOOM, MAX_ZOOM);
    const after = screenToWorld(sx, sy, cam, size.w, size.h);
    cam.x += before.x - after.x;
    cam.y += before.y - after.y;
  }

  function onKeyDown(e: KeyboardEvent) {
    keys.add(e.code);
    if (e.code === "Space") {
      e.preventDefault();
      if (e.repeat) return;
      paused = !paused;
      hudDirty = true;
      return;
    }
    if (e.repeat) return;
    if (e.code === "KeyT") {
      trails = !trails;
      hudDirty = true;
      persist();
    } else if (e.code === "KeyF") {
      fitCamera(true);
    } else if (e.code === "KeyC" && (e.shiftKey || e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      bodies = [];
      particles.length = 0;
      scenario = "empty";
      hudDirty = true;
    } else if (e.code === "KeyG") {
      track = !track;
      hudDirty = true;
    } else if (e.code === "Digit1") setPreset("dust");
    else if (e.code === "Digit2") setPreset("moon");
    else if (e.code === "Digit3") setPreset("world");
    else if (e.code === "Digit4") setPreset("giant");
    else if (e.code === "Digit5") setPreset("star");
    else if (e.code === "Digit6") setPreset("well");
    else if (e.code === "BracketLeft") {
      timeScale = clamp(roundScale(timeScale / 2), 0.25, 8);
      hudDirty = true;
      persist();
    } else if (e.code === "BracketRight") {
      timeScale = clamp(roundScale(timeScale * 2), 0.25, 8);
      hudDirty = true;
      persist();
    }
  }

  function onKeyUp(e: KeyboardEvent) {
    keys.delete(e.code);
  }

  function setPreset(kind: Kind) {
    preset = kind;
    hudDirty = true;
    persist();
  }

  const onContext = (e: Event) => e.preventDefault();
  const onBlur = () => {
    keys.clear();
    fling.active = false;
    predict = null;
    pointers.clear();
    pinch = null;
  };
  const onVis = () => {
    if (document.visibilityState === "visible") audio.unlock();
  };

  canvas.addEventListener("pointerdown", onPointerDown);
  canvas.addEventListener("pointermove", onPointerMove);
  canvas.addEventListener("pointerup", endPointer);
  canvas.addEventListener("pointercancel", endPointer);
  canvas.addEventListener("wheel", onWheel, { passive: false });
  canvas.addEventListener("contextmenu", onContext);
  window.addEventListener("keydown", onKeyDown);
  window.addEventListener("keyup", onKeyUp);
  window.addEventListener("blur", onBlur);
  document.addEventListener("visibilitychange", onVis);

  const api: EngineApi = {
    start() {
      if (running) return;
      running = true;
      last = 0;
      raf = requestAnimationFrame(loop);
      emitHud(true);
    },
    destroy() {
      running = false;
      cancelAnimationFrame(raf);
      canvas.removeEventListener("pointerdown", onPointerDown);
      canvas.removeEventListener("pointermove", onPointerMove);
      canvas.removeEventListener("pointerup", endPointer);
      canvas.removeEventListener("pointercancel", endPointer);
      canvas.removeEventListener("wheel", onWheel);
      canvas.removeEventListener("contextmenu", onContext);
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      window.removeEventListener("blur", onBlur);
      document.removeEventListener("visibilitychange", onVis);
      audio.close();
    },
    setPreset,
    setPaused(next) {
      paused = next;
      hudDirty = true;
    },
    setTimeScale(scale) {
      timeScale = clamp(scale, 0.25, 8);
      hudDirty = true;
      persist();
    },
    setTrails(on) {
      trails = on;
      hudDirty = true;
      persist();
    },
    setTrack(on) {
      track = on;
      hudDirty = true;
    },
    setMute(on) {
      mute = on;
      audio.setMute(on);
      hudDirty = true;
      persist();
    },
    clear() {
      bodies = [];
      particles.length = 0;
      scenario = "empty";
      hint = true;
      hudDirty = true;
    },
    loadScenario(id) {
      scenario = id;
      bodies = buildScenario(id);
      particles.length = 0;
      merges = 0;
      hint = id === "empty";
      track = false;
      fitCamera(true);
      hudDirty = true;
    },
    fit() {
      fitCamera(true);
    },
    spawn({ x, y, vx, vy, kind }) {
      spawnBody(x, y, vx, vy, kind ?? preset);
    },
    snapshot,
  };

  (
    window as unknown as { __apoapsis?: EngineApi & { bodies: () => Body[] } }
  ).__apoapsis = Object.assign(api, {
    bodies: () => bodies,
  });

  live = api;
  return api;
}

function clamp(n: number, a: number, b: number) {
  return Math.max(a, Math.min(b, n));
}

function roundScale(n: number) {
  const steps = [0.25, 0.5, 1, 2, 4, 8];
  let best = steps[0];
  let d = Infinity;
  for (const s of steps) {
    const ad = Math.abs(s - n);
    if (ad < d) {
      d = ad;
      best = s;
    }
  }
  return best;
}

function loadSave(): Saved | null {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Saved;
    if (parsed.version !== 1) return null;
    if (!MASS_PRESETS.some((p) => p.id === parsed.preset)) return null;
    return parsed;
  } catch {
    return null;
  }
}
