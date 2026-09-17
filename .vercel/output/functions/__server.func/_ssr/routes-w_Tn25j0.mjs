import { i as __toESM } from "../_runtime.mjs";
import { L as require_react, v as require_jsx_runtime } from "../_libs/@tanstack/react-router+[...].mjs";
import { a as Spline, c as Locate, i as Trash2, l as Crosshair, n as Volume2, o as Play, s as Pause, t as VolumeX } from "../_libs/lucide-react.mjs";
import { n as clsx, t as cva } from "../_libs/class-variance-authority+clsx.mjs";
import { t as twMerge } from "../_libs/tailwind-merge.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/routes-w_Tn25j0.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
function createAudio() {
	let ctx = null;
	let master = null;
	let sfx = null;
	let muted = false;
	let lastFling = 0;
	let lastMerge = 0;
	function ensure() {
		if (ctx) return;
		ctx = new (window.AudioContext || window.webkitAudioContext)({ latencyHint: "interactive" });
		master = ctx.createGain();
		sfx = ctx.createGain();
		sfx.gain.value = .7;
		master.gain.value = muted ? 0 : .85;
		sfx.connect(master);
		master.connect(ctx.destination);
	}
	function resume() {
		ensure();
		if (ctx && ctx.state === "suspended") ctx.resume();
	}
	function beep(freq, dur, type, gain = .12, slide = 0) {
		if (!ctx || !sfx || muted) return;
		const t = ctx.currentTime;
		const osc = ctx.createOscillator();
		const g = ctx.createGain();
		osc.type = type;
		osc.frequency.setValueAtTime(freq, t);
		if (slide) osc.frequency.exponentialRampToValueAtTime(Math.max(40, freq * slide), t + dur);
		g.gain.setValueAtTime(1e-4, t);
		g.gain.exponentialRampToValueAtTime(gain, t + .012);
		g.gain.exponentialRampToValueAtTime(1e-4, t + dur);
		osc.connect(g);
		g.connect(sfx);
		osc.start(t);
		osc.stop(t + dur + .02);
		osc.onended = () => {
			osc.disconnect();
			g.disconnect();
		};
	}
	function noise(dur, gain = .08, cutoff = 800) {
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
		g.gain.exponentialRampToValueAtTime(1e-4, t + dur);
		src.connect(filter);
		filter.connect(g);
		g.connect(sfx);
		src.start(t);
		src.stop(t + dur + .02);
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
			if (master && ctx) master.gain.setTargetAtTime(next ? 0 : .85, ctx.currentTime, .04);
		},
		fling(speed) {
			const now = performance.now();
			if (now - lastFling < 80) return;
			lastFling = now;
			resume();
			const n = Math.min(1, speed / 420);
			beep(140 + n * 220, .12, "sine", .05 + n * .05, 1.8);
			noise(.08, .03 + n * .04, 1200);
		},
		merge(mass) {
			const now = performance.now();
			if (now - lastMerge < 40) return;
			lastMerge = now;
			resume();
			const n = Math.min(1, Math.log10(mass + 10) / 5);
			beep(90 + (1 - n) * 70, .22, "sine", .08 + n * .1, .45);
			noise(.14, .05 + n * .07, 500 + n * 400);
		},
		close() {
			if (ctx) ctx.close();
			ctx = null;
			master = null;
			sfx = null;
		}
	};
}
function makeStarfield(count = 280) {
	const stars = [];
	let s = 439041101;
	const rnd = () => {
		s |= 0;
		s = s + 1831565813 | 0;
		let t = Math.imul(s ^ s >>> 15, 1 | s);
		t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
		return ((t ^ t >>> 14) >>> 0) / 4294967296;
	};
	for (let i = 0; i < count; i++) stars.push({
		x: rnd(),
		y: rnd(),
		r: rnd() < .12 ? 1.35 : rnd() * .9 + .35,
		a: .18 + rnd() * .55,
		par: .04 + rnd() * .12
	});
	return stars;
}
function resizeCanvas(canvas, ctx) {
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
	return {
		w,
		h,
		dpr
	};
}
function viewCenter(w, h) {
	const bottom = h < 780 ? Math.min(220, h * .3) : 108;
	return {
		cx: w / 2,
		cy: (h - bottom) * .5 + 6
	};
}
function screenToWorld(sx, sy, cam, w, h) {
	const { cx, cy } = viewCenter(w, h);
	return {
		x: cam.x + (sx - cx) / cam.zoom,
		y: cam.y + (sy - cy) / cam.zoom
	};
}
function drawFrame(opts) {
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
function drawStars(ctx, w, h, cam, stars) {
	ctx.save();
	for (let i = 0; i < stars.length; i++) {
		const s = stars[i];
		const x = ((s.x * w - cam.x * s.par * .35) % w + w) % w;
		const y = ((s.y * h - cam.y * s.par * .35) % h + h) % h;
		ctx.fillStyle = `rgba(236,238,242,${s.a})`;
		ctx.beginPath();
		ctx.arc(x, y, s.r, 0, Math.PI * 2);
		ctx.fill();
	}
	ctx.restore();
}
function drawVignette(ctx, w, h) {
	const g = ctx.createRadialGradient(w * .5, h * .48, Math.min(w, h) * .25, w * .5, h * .5, Math.max(w, h) * .72);
	g.addColorStop(0, "rgba(7,8,12,0)");
	g.addColorStop(1, "rgba(7,8,12,0.55)");
	ctx.fillStyle = g;
	ctx.fillRect(0, 0, w, h);
}
function drawTrails(ctx, bodies, zoom) {
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
		ctx.strokeStyle = hsla(body.hue, 28, 72, .18 + t * .28);
		ctx.lineWidth = Math.max(1.1, (body.kind === "star" ? 2.4 : 1.4) / zoom);
		ctx.stroke();
	}
}
function drawPredict(ctx, path) {
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
function drawFling(ctx, fling) {
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
function drawBodies(ctx, bodies, alpha, now, zoom) {
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
function heaviestAttractor(bodies) {
	let best = null;
	for (let i = 0; i < bodies.length; i++) {
		const b = bodies[i];
		if (b.kind !== "star" && b.kind !== "well") continue;
		if (!best || b.mass > best.mass) best = b;
	}
	return best;
}
function drawStar(ctx, b, x, y, now, zoom) {
	const pulse = .92 + Math.sin(now * .0018 + b.id) * .08;
	const glowR = b.radius * (3.6 + b.flash * 1.4) * pulse;
	ctx.save();
	ctx.globalCompositeOperation = "lighter";
	const g = ctx.createRadialGradient(x, y, b.radius * .15, x, y, glowR);
	g.addColorStop(0, hsla(b.hue, 70, 88, .95));
	g.addColorStop(.22, hsla(b.hue, 80, 68, .55));
	g.addColorStop(.55, hsla(b.hue, 70, 50, .12));
	g.addColorStop(1, hsla(b.hue, 70, 50, 0));
	ctx.fillStyle = g;
	ctx.beginPath();
	ctx.arc(x, y, glowR, 0, Math.PI * 2);
	ctx.fill();
	ctx.restore();
	const core = ctx.createRadialGradient(x - b.radius * .25, y - b.radius * .28, b.radius * .1, x, y, b.radius);
	core.addColorStop(0, "#fff8e8");
	core.addColorStop(.45, b.fill);
	core.addColorStop(1, hsla(b.hue, 70, 42, 1));
	ctx.fillStyle = core;
	ctx.beginPath();
	ctx.arc(x, y, b.radius, 0, Math.PI * 2);
	ctx.fill();
	if (b.flash > .04) {
		ctx.strokeStyle = hsla(b.hue, 80, 88, b.flash * .7);
		ctx.lineWidth = Math.max(1.2, 3 / zoom);
		ctx.stroke();
	}
}
function drawWell(ctx, b, x, y, now, zoom) {
	const diskR = b.radius * 2.8;
	ctx.save();
	ctx.translate(x, y);
	ctx.rotate(now * 25e-5);
	ctx.scale(1, .38);
	const disk = ctx.createRadialGradient(0, 0, b.radius * .6, 0, 0, diskR);
	disk.addColorStop(0, "rgba(197,107,74,0.05)");
	disk.addColorStop(.45, "rgba(197,107,74,0.55)");
	disk.addColorStop(.72, "rgba(232,195,138,0.35)");
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
function drawPlanet(ctx, b, x, y, light) {
	let lx = -.45;
	let ly = -.55;
	if (light && light.id !== b.id) {
		const dx = x - light.x;
		const dy = y - light.y;
		const len = Math.hypot(dx, dy) || 1;
		lx = dx / len;
		ly = dy / len;
	}
	const gx = x - lx * b.radius * .38;
	const gy = y - ly * b.radius * .38;
	const g = ctx.createRadialGradient(gx, gy, b.radius * .08, x, y, b.radius);
	g.addColorStop(0, hsla(b.hue, 38, 78, 1));
	g.addColorStop(.45, b.fill);
	g.addColorStop(1, hsla(b.hue, 30, 18, 1));
	ctx.fillStyle = g;
	ctx.beginPath();
	ctx.arc(x, y, b.radius, 0, Math.PI * 2);
	ctx.fill();
	ctx.beginPath();
	ctx.arc(x, y, b.radius + Math.max(1.2, b.radius * .12), 0, Math.PI * 2);
	ctx.strokeStyle = hsla(b.hue, 30, 70, .22);
	ctx.lineWidth = Math.max(1, b.radius * .08);
	ctx.stroke();
	if (b.kind === "giant") {
		ctx.save();
		ctx.beginPath();
		ctx.arc(x, y, b.radius, 0, Math.PI * 2);
		ctx.clip();
		ctx.strokeStyle = hsla(b.hue, 25, 20, .28);
		ctx.lineWidth = b.radius * .18;
		ctx.beginPath();
		ctx.moveTo(x - b.radius, y + b.radius * .18);
		ctx.lineTo(x + b.radius, y + b.radius * .18);
		ctx.stroke();
		ctx.restore();
	}
	if (b.flash > .04) {
		ctx.strokeStyle = `rgba(236,238,242,${b.flash * .85})`;
		ctx.lineWidth = 2;
		ctx.beginPath();
		ctx.arc(x, y, b.radius + 2, 0, Math.PI * 2);
		ctx.stroke();
	}
}
function drawParticles(ctx, particles) {
	for (let i = 0; i < particles.length; i++) {
		const p = particles[i];
		const t = p.life / p.maxLife;
		ctx.fillStyle = hsla(p.hue, 50, 72, t * .85);
		ctx.beginPath();
		ctx.arc(p.x, p.y, p.size * (.4 + t), 0, Math.PI * 2);
		ctx.fill();
	}
}
function hsla(h, s, l, a) {
	return `hsla(${h}, ${s}%, ${l}%, ${a})`;
}
var STEP = 1 / 120;
var MERGE_FRACTION = .76;
var FLING_SCALE = 1.65;
var MIN_ZOOM = .08;
var MASS_PRESETS = [
	{
		id: "dust",
		label: "Dust",
		mass: 2.2,
		radius: 3.1,
		hue: 38,
		fill: "#c4b7a4",
		glow: "#d9cbb6"
	},
	{
		id: "moon",
		label: "Moon",
		mass: 16,
		radius: 7.2,
		hue: 210,
		fill: "#9aa6b4",
		glow: "#c5d0da"
	},
	{
		id: "world",
		label: "World",
		mass: 64,
		radius: 13.2,
		hue: 198,
		fill: "#6f93a8",
		glow: "#9ec4d4"
	},
	{
		id: "giant",
		label: "Giant",
		mass: 380,
		radius: 22,
		hue: 32,
		fill: "#c4a07a",
		glow: "#e2c39a"
	},
	{
		id: "star",
		label: "Star",
		mass: 17500,
		radius: 46,
		hue: 42,
		fill: "#ead4a2",
		glow: "#fff1c8"
	},
	{
		id: "well",
		label: "Well",
		mass: 64e3,
		radius: 15,
		hue: 18,
		fill: "#141416",
		glow: "#c56b4a"
	}
];
var PRESET_MAP = new Map(MASS_PRESETS.map((p) => [p.id, p]));
function presetById(kind) {
	return PRESET_MAP.get(kind) ?? MASS_PRESETS[2];
}
function radiusFromMass(mass, kind) {
	if (kind === "well") return Math.max(11, 5.4 + Math.pow(mass, .11));
	if (kind === "star") return Math.max(20, 3.15 * Math.pow(mass, .29));
	return Math.max(2.3, 2.55 * Math.pow(mass, .33));
}
function circularSpeed(primaryMass, dx, dy, retrograde = false) {
	const r = Math.hypot(dx, dy) || 1;
	const v = Math.sqrt(920 * primaryMass / r);
	const nx = dx / r;
	const ny = dy / r;
	return retrograde ? {
		vx: ny * v,
		vy: -nx * v
	} : {
		vx: -ny * v,
		vy: nx * v
	};
}
var nextId = 1;
function resetIds() {
	nextId = 1;
}
function makeBody(partial) {
	const preset = presetById(partial.kind);
	const hueJitter = (hash(nextId) - .5) * (partial.kind === "star" ? 8 : 18);
	const hue = partial.hue ?? preset.hue + hueJitter;
	const radius = partial.radius ?? radiusFromMass(partial.mass, partial.kind);
	const trail = /* @__PURE__ */ new Float32Array(440);
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
		born: 0
	};
}
function hash(n) {
	const x = Math.imul(n ^ 2654435769, 2246822507);
	return ((x ^ x >>> 13) >>> 0) / 4294967296;
}
function computeAccelerations(bodies) {
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
			const eps = Math.max(5.5, .38 * (a.radius + b.radius));
			const s2 = r2 + eps * eps;
			const inv = 1 / Math.sqrt(s2);
			const f = 920 * inv * inv * inv;
			const fx = dx * f;
			const fy = dy * f;
			a.ax += fx * b.mass;
			a.ay += fy * b.mass;
			b.ax -= fx * a.mass;
			b.ay -= fy * a.mass;
		}
	}
}
function leapfrog(bodies, h) {
	computeAccelerations(bodies);
	for (let i = 0; i < bodies.length; i++) {
		const b = bodies[i];
		b.vx += b.ax * h * .5;
		b.vy += b.ay * h * .5;
		b.x += b.vx * h;
		b.y += b.vy * h;
	}
	computeAccelerations(bodies);
	for (let i = 0; i < bodies.length; i++) {
		const b = bodies[i];
		b.vx += b.ax * h * .5;
		b.vy += b.ay * h * .5;
	}
}
function accelAt(x, y, bodies, ignoreId) {
	let ax = 0;
	let ay = 0;
	for (let i = 0; i < bodies.length; i++) {
		const b = bodies[i];
		if (b.id === ignoreId) continue;
		const dx = b.x - x;
		const dy = b.y - y;
		const eps = Math.max(5.5, .38 * (b.radius + 6));
		const s2 = dx * dx + dy * dy + eps * eps;
		const inv = 1 / Math.sqrt(s2);
		const f = 920 * b.mass * inv * inv * inv;
		ax += dx * f;
		ay += dy * f;
	}
	return {
		ax,
		ay
	};
}
function predictPath(x, y, vx, vy, bodies, steps = 140, dt = 1 / 36) {
	const out = new Float32Array(steps * 2);
	let px = x;
	let py = y;
	let pvx = vx;
	let pvy = vy;
	for (let i = 0; i < steps; i++) {
		const a0 = accelAt(px, py, bodies, -1);
		pvx += a0.ax * dt * .5;
		pvy += a0.ay * dt * .5;
		px += pvx * dt;
		py += pvy * dt;
		const a1 = accelAt(px, py, bodies, -1);
		pvx += a1.ax * dt * .5;
		pvy += a1.ay * dt * .5;
		out[i * 2] = px;
		out[i * 2 + 1] = py;
		for (let j = 0; j < bodies.length; j++) {
			const b = bodies[j];
			const dx = px - b.x;
			const dy = py - b.y;
			const hit = b.radius * MERGE_FRACTION + 3;
			if (dx * dx + dy * dy < hit * hit) return out.subarray(0, (i + 1) * 2);
		}
	}
	return out;
}
function resolveMerges(bodies, onMerge) {
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
function mergeBodies(a, b) {
	const heavy = a.mass >= b.mass ? a : b;
	const light = a.mass >= b.mass ? b : a;
	const mass = a.mass + b.mass;
	const inv = 1 / mass;
	const kind = mergeKind(a, b, mass);
	const x = (a.x * a.mass + b.x * b.mass) * inv;
	const y = (a.y * a.mass + b.y * b.mass) * inv;
	const hMass = heavy.mass;
	const lMass = light.mass;
	const takeTrail = light.trailCount > heavy.trailCount * .6 && lMass > hMass * .45;
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
function mergeKind(a, b, mass) {
	if (a.kind === "well" || b.kind === "well") return "well";
	if (a.kind === "star" || b.kind === "star") return mass >= 2400 ? "star" : a.mass >= b.mass ? a.kind : b.kind;
	if (mass >= 9e3) return "star";
	if (mass >= 240) return a.mass >= b.mass ? a.kind : b.kind;
	return a.mass >= b.mass ? a.kind : b.kind;
}
function copyTrail(from, to) {
	to.trail.set(from.trail);
	to.trailCount = from.trailCount;
	to.trailHead = from.trailHead;
	to.lastTrailX = from.lastTrailX;
	to.lastTrailY = from.lastTrailY;
}
function recordTrail(body, spacing = 5.4) {
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
function pruneEscaped(bodies, limit = 28e3) {
	for (let i = bodies.length - 1; i >= 0; i--) {
		const b = bodies[i];
		if (b.x * b.x + b.y * b.y > limit * limit) bodies.splice(i, 1);
	}
}
var SCENARIOS = [
	{
		id: "system",
		label: "System"
	},
	{
		id: "binary",
		label: "Binary"
	},
	{
		id: "figure8",
		label: "Figure-8"
	},
	{
		id: "slingshot",
		label: "Slingshot"
	},
	{
		id: "empty",
		label: "Empty"
	}
];
function buildScenario(id) {
	resetIds();
	switch (id) {
		case "system": return neutralizeCOM(system());
		case "binary": return neutralizeCOM(binary());
		case "figure8": return neutralizeCOM(figure8());
		case "slingshot": return neutralizeCOM(slingshot());
		case "empty": return [];
	}
}
function neutralizeCOM(bodies) {
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
function system() {
	const star = makeBody({
		x: 0,
		y: 0,
		vx: 0,
		vy: 0,
		mass: 17500,
		kind: "star",
		hue: 42
	});
	const worldPos = {
		x: 230,
		y: 12
	};
	const worldV = circularSpeed(star.mass, worldPos.x, worldPos.y);
	const world = makeBody({
		x: worldPos.x,
		y: worldPos.y,
		vx: worldV.vx,
		vy: worldV.vy,
		mass: 70,
		kind: "world",
		hue: 198
	});
	const moonOff = {
		x: 28,
		y: 6
	};
	const moonRel = circularSpeed(world.mass, moonOff.x, moonOff.y);
	const moon = makeBody({
		x: world.x + moonOff.x,
		y: world.y + moonOff.y,
		vx: world.vx + moonRel.vx,
		vy: world.vy + moonRel.vy,
		mass: 14,
		kind: "moon"
	});
	const giantPos = {
		x: -360,
		y: 40
	};
	const giantV = circularSpeed(star.mass, giantPos.x, giantPos.y, true);
	const giant = makeBody({
		x: giantPos.x,
		y: giantPos.y,
		vx: giantV.vx,
		vy: giantV.vy,
		mass: 400,
		kind: "giant",
		hue: 28
	});
	const icePos = {
		x: 18,
		y: 510
	};
	const iceV = circularSpeed(star.mass, icePos.x, icePos.y);
	const ice = makeBody({
		x: icePos.x,
		y: icePos.y,
		vx: iceV.vx * .92,
		vy: iceV.vy * .92,
		mass: 210,
		kind: "giant",
		hue: 196,
		fill: "#7f9eb0",
		glow: "#b7d0dc"
	});
	const cometPos = {
		x: -620,
		y: -280
	};
	return [
		star,
		world,
		moon,
		giant,
		ice,
		makeBody({
			x: cometPos.x,
			y: cometPos.y,
			vx: 78,
			vy: 118,
			mass: 3.4,
			kind: "dust",
			hue: 48
		})
	];
}
function binary() {
	const m = 9200;
	const sep = 168;
	const speed = circularSpeed(m, sep, 0).vy * Math.SQRT1_2;
	const a = makeBody({
		x: -84,
		y: 0,
		vx: 0,
		vy: speed,
		mass: m,
		kind: "star",
		hue: 38
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
		glow: "#ffd8bc"
	});
	const worldPos = {
		x: 0,
		y: 430
	};
	const worldV = circularSpeed(m * 2, worldPos.x, worldPos.y);
	const world = makeBody({
		x: worldPos.x,
		y: worldPos.y,
		vx: worldV.vx,
		vy: worldV.vy,
		mass: 58,
		kind: "world"
	});
	const moonOff = {
		x: -26,
		y: 4
	};
	const moonRel = circularSpeed(world.mass, moonOff.x, moonOff.y, true);
	return [
		a,
		b,
		world,
		makeBody({
			x: world.x + moonOff.x,
			y: world.y + moonOff.y,
			vx: world.vx + moonRel.vx,
			vy: world.vy + moonRel.vy,
			mass: 12,
			kind: "moon"
		})
	];
}
function figure8() {
	const L = 118;
	const mass = 210;
	const vScale = Math.sqrt(920 * mass / L);
	const p1 = {
		x: .9700043567328079 * L,
		y: -.2430875315358615 * L
	};
	const p2 = {
		x: -.9700043567328079 * L,
		y: .2430875315358615 * L
	};
	const p3 = {
		x: 0,
		y: 0
	};
	const v3 = {
		vx: -.9324073702994434 * vScale,
		vy: -.8647314610797187 * vScale
	};
	const v12 = {
		vx: -v3.vx / 2,
		vy: -v3.vy / 2
	};
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
			hue: 198
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
			glow: "#e2c39a"
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
			glow: "#efe3c4"
		})
	];
}
function slingshot() {
	const star = makeBody({
		x: 0,
		y: 0,
		vx: 0,
		vy: 0,
		mass: 17500,
		kind: "star"
	});
	const giantPos = {
		x: 280,
		y: 0
	};
	const giantV = circularSpeed(star.mass, giantPos.x, giantPos.y);
	const giant = makeBody({
		x: giantPos.x,
		y: giantPos.y,
		vx: giantV.vx,
		vy: giantV.vy,
		mass: 520,
		kind: "giant",
		hue: 26
	});
	const probe = makeBody({
		x: -640,
		y: 210,
		vx: 210,
		vy: -18,
		mass: 4,
		kind: "dust",
		hue: 48
	});
	const moonPos = {
		x: -40,
		y: 340
	};
	const moonV = circularSpeed(star.mass, moonPos.x, moonPos.y);
	return [
		star,
		giant,
		probe,
		makeBody({
			x: moonPos.x,
			y: moonPos.y,
			vx: moonV.vx,
			vy: moonV.vy,
			mass: 18,
			kind: "moon"
		})
	];
}
var SAVE_KEY = "apoapsis-v1";
var live = null;
function createEngine(canvas, onHud) {
	live?.destroy();
	const prev = window.__apoapsis;
	if (prev && prev !== live) prev.destroy();
	live = null;
	const rawCtx = canvas.getContext("2d", {
		alpha: false,
		desynchronized: true
	});
	if (!rawCtx) throw new Error("Canvas 2D is unavailable.");
	const ctx = rawCtx;
	const audio = createAudio();
	const reduced = typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
	let bodies = [];
	const particles = [];
	const stars = makeStarfield();
	const cam = {
		x: 0,
		y: 0,
		zoom: 1
	};
	const fling = {
		active: false,
		x0: 0,
		y0: 0,
		x1: 0,
		y1: 0,
		pointerId: -1
	};
	let paused = false;
	let timeScale = 1;
	let trails = true;
	let track = false;
	let mute = false;
	let preset = "world";
	let scenario = "system";
	let merges = 0;
	let hint = true;
	let running = false;
	let raf = 0;
	let acc = 0;
	let last = 0;
	let size = {
		w: 800,
		h: 600,
		dpr: 1
	};
	let predict = null;
	let trauma = 0;
	let panPointer = -1;
	let panLastX = 0;
	let panLastY = 0;
	let pinch = null;
	const pointers = /* @__PURE__ */ new Map();
	const keys = /* @__PURE__ */ new Set();
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
	function snapshot() {
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
			hint
		};
	}
	function emitHud(force = false) {
		if (!force && !hudDirty) return;
		hudDirty = false;
		onHud(snapshot());
	}
	function persist() {
		try {
			const data = {
				version: 1,
				preset,
				trails,
				mute,
				timeScale
			};
			localStorage.setItem(SAVE_KEY, JSON.stringify(data));
		} catch {}
	}
	function viewPos(e) {
		const rect = canvas.getBoundingClientRect();
		return {
			x: e.clientX - rect.left,
			y: e.clientY - rect.top
		};
	}
	function spawnBody(x, y, vx, vy, kind = preset) {
		if (bodies.length >= 48) return;
		const p = presetById(kind);
		const body = makeBody({
			x,
			y,
			vx,
			vy,
			mass: p.mass,
			kind,
			radius: p.radius
		});
		body.born = performance.now();
		body.flash = .7;
		bodies.push(body);
		hint = false;
		hudDirty = true;
	}
	function onMerge(a, b, merged) {
		merges += 1;
		hudDirty = true;
		const impact = Math.min(1, (a.mass + b.mass) / 8e3);
		if (!reduced) trauma = Math.min(1, trauma + .18 + impact * .45);
		audio.merge(merged.mass);
		const n = 10 + Math.floor(impact * 16);
		const speed = 40 + impact * 90;
		for (let i = 0; i < n; i++) {
			const ang = Math.PI * 2 * i / n + Math.random() * .4;
			particles.push({
				x: merged.x,
				y: merged.y,
				vx: Math.cos(ang) * speed * (.4 + Math.random()),
				vy: Math.sin(ang) * speed * (.4 + Math.random()),
				life: 1,
				maxLife: .45 + Math.random() * .4,
				size: 1.4 + Math.random() * 2.4,
				hue: merged.hue
			});
		}
	}
	function physicsFrame(h) {
		for (let i = 0; i < bodies.length; i++) {
			const b = bodies[i];
			b.px = b.x;
			b.py = b.y;
		}
		leapfrog(bodies, h);
		resolveMerges(bodies, onMerge);
		pruneEscaped(bodies);
		if (trails) for (let i = 0; i < bodies.length; i++) recordTrail(bodies[i]);
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
		if (m <= 0) return {
			x: 0,
			y: 0
		};
		return {
			x: mx / m,
			y: my / m
		};
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
		const z = Math.min(5, Math.max(MIN_ZOOM, .78 * Math.min(size.w / spanX, availH / spanY)));
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
	function loop(ts) {
		if (!running) return;
		raf = requestAnimationFrame(loop);
		if (!last) last = ts;
		const raw = (ts - last) / 1e3;
		last = ts;
		const dt = Math.min(raw, .05);
		size = resizeCanvas(canvas, ctx);
		if (!track) {
			const pan = 420 * dt / cam.zoom;
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
			while (acc >= .008333333333333333 && steps < 14) {
				physicsFrame(STEP);
				acc -= STEP;
				steps += 1;
			}
		} else acc = 0;
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
			p.vx *= .98;
			p.vy *= .98;
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
			reduced
		});
		hudClock += dt;
		if (hudDirty || hudClock > .12) {
			hudClock = 0;
			emitHud(true);
		}
	}
	function onPointerDown(e) {
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
				midY: (a.y + b.y) / 2
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
	function onPointerMove(e) {
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
				cam.zoom = clamp(cam.zoom * scale, MIN_ZOOM, 5);
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
	function endPointer(e) {
		pointers.delete(e.pointerId);
		if (pinch && (e.pointerId === pinch.idA || e.pointerId === pinch.idB)) pinch = null;
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
	function onWheel(e) {
		e.preventDefault();
		const rect = canvas.getBoundingClientRect();
		const sx = e.clientX - rect.left;
		const sy = e.clientY - rect.top;
		const before = screenToWorld(sx, sy, cam, size.w, size.h);
		const factor = Math.exp(-e.deltaY * .0012);
		cam.zoom = clamp(cam.zoom * factor, MIN_ZOOM, 5);
		const after = screenToWorld(sx, sy, cam, size.w, size.h);
		cam.x += before.x - after.x;
		cam.y += before.y - after.y;
	}
	function onKeyDown(e) {
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
		} else if (e.code === "KeyF") fitCamera(true);
		else if (e.code === "KeyC" && (e.shiftKey || e.metaKey || e.ctrlKey)) {
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
			timeScale = clamp(roundScale(timeScale / 2), .25, 8);
			hudDirty = true;
			persist();
		} else if (e.code === "BracketRight") {
			timeScale = clamp(roundScale(timeScale * 2), .25, 8);
			hudDirty = true;
			persist();
		}
	}
	function onKeyUp(e) {
		keys.delete(e.code);
	}
	function setPreset(kind) {
		preset = kind;
		hudDirty = true;
		persist();
	}
	const onContext = (e) => e.preventDefault();
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
	const api = {
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
			timeScale = clamp(scale, .25, 8);
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
		snapshot
	};
	window.__apoapsis = Object.assign(api, { bodies: () => bodies });
	live = api;
	return api;
}
function clamp(n, a, b) {
	return Math.max(a, Math.min(b, n));
}
function roundScale(n) {
	const steps = [
		.25,
		.5,
		1,
		2,
		4,
		8
	];
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
function loadSave() {
	try {
		const raw = localStorage.getItem(SAVE_KEY);
		if (!raw) return null;
		const parsed = JSON.parse(raw);
		if (parsed.version !== 1) return null;
		if (!MASS_PRESETS.some((p) => p.id === parsed.preset)) return null;
		return parsed;
	} catch {
		return null;
	}
}
function cn(...inputs) {
	return twMerge(clsx(inputs));
}
var buttonVariants = cva([
	"inline-flex items-center justify-center gap-2 rounded-[10px] font-medium",
	"transition-[opacity,transform,background-color,border-color,color] duration-[var(--motion-quick)]",
	"ease-[var(--ease-out)] select-none",
	"focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40",
	"disabled:pointer-events-none disabled:opacity-40",
	"active:not-disabled:scale-[0.96]"
].join(" "), {
	variants: {
		variant: {
			solid: "bg-fg text-bg hover:bg-fg/90",
			ghost: "bg-transparent text-fg/80 hover:bg-elevated hover:text-fg border border-transparent",
			outline: "bg-surface/70 text-fg border border-border hover:bg-elevated",
			quiet: "bg-transparent text-muted hover:text-fg hover:bg-elevated/80"
		},
		size: {
			sm: "h-9 px-3 text-sm",
			md: "h-10 px-3.5 text-sm",
			icon: "size-11 p-0"
		}
	},
	defaultVariants: {
		variant: "outline",
		size: "md"
	}
});
function Button({ className, variant, size, type, ...props }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
		type: type ?? "button",
		className: cn(buttonVariants({
			variant,
			size
		}), className),
		...props
	});
}
function Hud({ hud, engine }) {
	const scaleLabel = formatScale(hud.timeScale);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "pointer-events-none absolute inset-0 z-10 flex flex-col justify-between p-3 sm:p-5 pt-[max(0.75rem,env(safe-area-inset-top))] pb-[max(0.75rem,env(safe-area-inset-bottom))]",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("header", {
			className: "flex items-start justify-between gap-3",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "pointer-events-none min-w-0",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "font-display text-2xl leading-none tracking-tight text-fg sm:text-3xl",
						children: "Apoapsis"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "mt-1 text-xs text-muted sm:text-sm",
						children: "Orbital gravity sandbox"
					}),
					hud.hint ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "mt-2 max-w-[17rem] text-xs text-muted animate-hint sm:text-sm",
						children: "Drag to fling a world. Pause to compose."
					}) : null
				]
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "pointer-events-auto flex items-center gap-2",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Stat, {
					label: "Bodies",
					value: String(hud.count)
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Stat, {
					label: "Merges",
					value: String(hud.merges)
				})]
			})]
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "flex min-h-0 flex-1 flex-col justify-between gap-3 pt-4",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "pointer-events-auto flex max-w-full flex-wrap gap-1 sm:max-w-md",
				children: SCENARIOS.map((s) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
					size: "sm",
					variant: hud.scenario === s.id ? "solid" : "ghost",
					className: "h-8 rounded-full px-3 text-xs",
					onClick: () => engine?.loadScenario(s.id),
					children: s.label
				}, s.id))
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
				className: cn("pointer-events-auto mt-auto w-full max-w-3xl shrink-0 self-start rounded-[28px] border border-border", "bg-surface/80 p-3 shadow-[0_16px_60px_rgba(0,0,0,0.35)] sm:p-4"),
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "flex flex-wrap items-center gap-2 sm:gap-3",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "flex items-center gap-1",
							children: MASS_PRESETS.map((p) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(MassChip, {
								kind: p.id,
								label: p.label,
								selected: hud.preset === p.id,
								onSelect: () => engine?.setPreset(p.id)
							}, p.id))
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "mx-1 hidden h-8 w-px bg-border sm:block" }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "flex min-w-[11rem] flex-1 items-center gap-3 sm:min-w-[14rem]",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: "w-10 shrink-0 text-right font-mono text-xs tabular-nums text-muted",
								children: scaleLabel
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
								type: "range",
								"aria-label": "Time scale",
								min: .25,
								max: 8,
								step: .25,
								value: hud.timeScale,
								onChange: (e) => engine?.setTimeScale(Number(e.target.value)),
								className: "h-11 w-full cursor-pointer appearance-none bg-transparent accent-fg",
								suppressHydrationWarning: true
							})]
						})
					]
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "mt-3 flex flex-wrap items-center gap-1.5",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
							size: "icon",
							variant: "outline",
							"aria-label": hud.paused ? "Play" : "Pause",
							onClick: () => engine?.setPaused(!hud.paused),
							children: hud.paused ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Play, { className: "size-4" }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Pause, { className: "size-4" })
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
							size: "icon",
							variant: hud.trails ? "solid" : "outline",
							"aria-label": "Toggle trails",
							onClick: () => engine?.setTrails(!hud.trails),
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Spline, { className: "size-4" })
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
							size: "icon",
							variant: hud.track ? "solid" : "outline",
							"aria-label": "Track barycenter",
							onClick: () => engine?.setTrack(!hud.track),
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Crosshair, { className: "size-4" })
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
							size: "icon",
							variant: "outline",
							"aria-label": "Fit view",
							onClick: () => engine?.fit(),
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Locate, { className: "size-4" })
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
							size: "icon",
							variant: "outline",
							"aria-label": hud.mute ? "Unmute" : "Mute",
							onClick: () => engine?.setMute(!hud.mute),
							children: hud.mute ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(VolumeX, { className: "size-4" }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Volume2, { className: "size-4" })
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
							className: "ml-auto",
							variant: "outline",
							"aria-label": "Clear all bodies",
							onClick: () => engine?.clear(),
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Trash2, { className: "size-4" }), "Clear"]
						})
					]
				})]
			})]
		})]
	});
}
function Stat({ label, value }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "rounded-2xl border border-border bg-surface/70 px-3 py-2",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
			className: "text-xs font-medium uppercase tracking-wider text-muted",
			children: label
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
			className: "font-mono text-sm tabular-nums text-fg",
			children: value
		})]
	});
}
function MassChip({ kind, label, selected, onSelect }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
		type: "button",
		title: label,
		onClick: onSelect,
		"aria-label": label,
		"aria-pressed": selected,
		className: cn("grid size-11 place-items-center rounded-2xl border transition-[background-color,border-color,transform] duration-[var(--motion-quick)] ease-[var(--ease-out)]", "active:scale-[0.96]", selected ? "border-fg/45 bg-elevated" : "border-transparent hover:border-border hover:bg-elevated/60"),
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: cn("block rounded-full", chipClass(kind), selected && "ring-2 ring-fg/40") })
	});
}
function chipClass(kind) {
	switch (kind) {
		case "dust": return "size-2 bg-mass-dust";
		case "moon": return "size-2.5 bg-mass-moon";
		case "world": return "size-3.5 bg-mass-world";
		case "giant": return "size-4 bg-mass-giant";
		case "star": return "size-5 bg-mass-star";
		case "well": return "size-3 bg-mass-well ring-1 ring-mass-giant/70";
	}
}
function formatScale(n) {
	const rounded = Math.round(n * 100) / 100;
	if (Number.isInteger(rounded)) return `${rounded}×`;
	return `${String(rounded)}×`;
}
var INITIAL = {
	count: 0,
	merges: 0,
	paused: false,
	timeScale: 1,
	trails: true,
	track: false,
	mute: false,
	preset: "world",
	scenario: "system",
	hint: true
};
function Simulator() {
	const canvasRef = (0, import_react.useRef)(null);
	const engineRef = (0, import_react.useRef)(null);
	const [hud, setHud] = (0, import_react.useState)(INITIAL);
	const [engine, setEngine] = (0, import_react.useState)(null);
	(0, import_react.useEffect)(() => {
		const canvas = canvasRef.current;
		if (!canvas) return;
		const api = createEngine(canvas, setHud);
		engineRef.current = api;
		setEngine(api);
		api.start();
		setHud(api.snapshot());
		const id = window.setInterval(() => {
			const live = engineRef.current;
			if (live) setHud(live.snapshot());
		}, 120);
		return () => {
			window.clearInterval(id);
			api.destroy();
			engineRef.current = null;
			setEngine(null);
		};
	}, []);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "relative h-dvh w-full overflow-hidden bg-bg text-fg",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("canvas", {
			ref: canvasRef,
			className: "absolute inset-0 size-full touch-none cursor-crosshair",
			"aria-label": "Gravity sandbox"
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Hud, {
			hud,
			engine
		})]
	});
}
function Home() {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Simulator, {});
}
//#endregion
export { Home as component };
