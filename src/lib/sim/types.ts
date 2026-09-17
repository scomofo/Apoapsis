export type Kind = "dust" | "moon" | "world" | "giant" | "star" | "well";

export type ScenarioId = "system" | "binary" | "figure8" | "slingshot" | "empty";

export type Body = {
  id: number;
  x: number;
  y: number;
  px: number;
  py: number;
  vx: number;
  vy: number;
  ax: number;
  ay: number;
  mass: number;
  radius: number;
  kind: Kind;
  hue: number;
  fill: string;
  glow: string;
  trail: Float32Array;
  trailCount: number;
  trailHead: number;
  lastTrailX: number;
  lastTrailY: number;
  flash: number;
  born: number;
};

export type Particle = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  hue: number;
};

export type Camera = {
  x: number;
  y: number;
  zoom: number;
};

export type FlingState = {
  active: boolean;
  x0: number;
  y0: number;
  x1: number;
  y1: number;
  pointerId: number;
};

export type HudSnapshot = {
  count: number;
  merges: number;
  paused: boolean;
  timeScale: number;
  trails: boolean;
  track: boolean;
  mute: boolean;
  preset: Kind;
  scenario: ScenarioId;
  hint: boolean;
};

export type EngineApi = {
  start: () => void;
  destroy: () => void;
  setPreset: (kind: Kind) => void;
  setPaused: (paused: boolean) => void;
  setTimeScale: (scale: number) => void;
  setTrails: (on: boolean) => void;
  setTrack: (on: boolean) => void;
  setMute: (on: boolean) => void;
  clear: () => void;
  loadScenario: (id: ScenarioId) => void;
  fit: () => void;
  spawn: (opts: {
    x: number;
    y: number;
    vx: number;
    vy: number;
    kind?: Kind;
  }) => void;
  snapshot: () => HudSnapshot;
};
