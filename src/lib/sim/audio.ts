type AudioApi = {
  unlock: () => void;
  setMute: (mute: boolean) => void;
  fling: (speed: number) => void;
  merge: (mass: number) => void;
  close: () => void;
};

export function createAudio(): AudioApi {
  let ctx: AudioContext | null = null;
  let master: GainNode | null = null;
  let sfx: GainNode | null = null;
  let muted = false;
  let lastFling = 0;
  let lastMerge = 0;

  function ensure() {
    if (ctx) return;
    const AC =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext })
        .webkitAudioContext;
    ctx = new AC({ latencyHint: "interactive" });
    master = ctx.createGain();
    sfx = ctx.createGain();
    sfx.gain.value = 0.7;
    master.gain.value = muted ? 0 : 0.85;
    sfx.connect(master);
    master.connect(ctx.destination);
  }

  function resume() {
    ensure();
    if (ctx && ctx.state === "suspended") void ctx.resume();
  }

  function beep(
    freq: number,
    dur: number,
    type: OscillatorType,
    gain = 0.12,
    slide = 0,
  ) {
    if (!ctx || !sfx || muted) return;
    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t);
    if (slide) osc.frequency.exponentialRampToValueAtTime(Math.max(40, freq * slide), t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(gain, t + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(g);
    g.connect(sfx);
    osc.start(t);
    osc.stop(t + dur + 0.02);
    osc.onended = () => {
      osc.disconnect();
      g.disconnect();
    };
  }

  function noise(dur: number, gain = 0.08, cutoff = 800) {
    if (!ctx || !sfx || muted) return;
    const t = ctx.currentTime;
    const n = 2 * ctx.sampleRate * dur;
    const buffer = ctx.createBuffer(1, n, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < n; i++) data[i] = Math.random() * 2 - 1;
    const src = ctx.createBufferSource();
    src.buffer = buffer;
    const filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = cutoff;
    const g = ctx.createGain();
    g.gain.setValueAtTime(gain, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(filter);
    filter.connect(g);
    g.connect(sfx);
    src.start(t);
    src.stop(t + dur + 0.02);
    src.onended = () => {
      src.disconnect();
      filter.disconnect();
      g.disconnect();
    };
  }

  return {
    unlock() {
      resume();
    },
    setMute(next) {
      muted = next;
      if (master && ctx) {
        master.gain.setTargetAtTime(next ? 0 : 0.85, ctx.currentTime, 0.04);
      }
    },
    fling(speed) {
      const now = performance.now();
      if (now - lastFling < 80) return;
      lastFling = now;
      resume();
      const n = Math.min(1, speed / 420);
      beep(140 + n * 220, 0.12, "sine", 0.05 + n * 0.05, 1.8);
      noise(0.08, 0.03 + n * 0.04, 1200);
    },
    merge(mass) {
      const now = performance.now();
      if (now - lastMerge < 40) return;
      lastMerge = now;
      resume();
      const n = Math.min(1, Math.log10(mass + 10) / 5);
      beep(90 + (1 - n) * 70, 0.22, "sine", 0.08 + n * 0.1, 0.45);
      noise(0.14, 0.05 + n * 0.07, 500 + n * 400);
    },
    close() {
      if (ctx) void ctx.close();
      ctx = null;
      master = null;
      sfx = null;
    },
  };
}
