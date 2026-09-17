import { i as __toESM } from "../_runtime.mjs";
import { L as require_react, v as require_jsx_runtime } from "../_libs/@tanstack/react-router+[...].mjs";
import { c as Shuffle, d as Pause, f as Mountain, i as Volume2, l as RotateCcw, n as Waves, o as Trash2, p as Locate, r as VolumeX, s as Spline, t as X, u as Play } from "../_libs/lucide-react.mjs";
import { n as clsx, t as cva } from "../_libs/class-variance-authority+clsx.mjs";
import { t as twMerge } from "../_libs/tailwind-merge.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/routes-C4EzUcuM.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
function createAudio() {
	let ctx = null;
	let master = null;
	let sfx = null;
	let muted = false;
	let lastDrop = 0;
	function ensure() {
		if (ctx) return;
		ctx = new (window.AudioContext || window.webkitAudioContext)({ latencyHint: "interactive" });
		master = ctx.createGain();
		sfx = ctx.createGain();
		sfx.gain.value = .65;
		master.gain.value = muted ? 0 : .8;
		sfx.connect(master);
		master.connect(ctx.destination);
	}
	function resume() {
		ensure();
		if (ctx && ctx.state === "suspended") ctx.resume();
	}
	function beep(freq, dur, type, gain = .1, slide = 0) {
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
	return {
		unlock() {
			resume();
		},
		setMute(next) {
			muted = next;
			if (master) master.gain.value = muted ? 0 : .8;
		},
		drop() {
			resume();
			const now = performance.now();
			if (now - lastDrop < 70) return;
			lastDrop = now;
			beep(420, .09, "sine", .06, 1.4);
		},
		perturb() {
			resume();
			beep(180, .14, "triangle", .05, .7);
		},
		absorb() {
			resume();
			beep(140, .18, "sine", .05, .45);
		},
		close() {
			if (ctx) ctx.close();
			ctx = null;
			master = null;
			sfx = null;
		}
	};
}
/** Routh critical mass ratio. L4/L5 are linearly stable below this. */
var ROUTH_MU = .5 * (1 - Math.sqrt(69) / 9);
var MIN_MU = 1e-6;
var MAX_MU = .5;
function clampMu(mu) {
	return Math.min(MAX_MU, Math.max(MIN_MU, mu));
}
function isStable(mu) {
	return mu < ROUTH_MU;
}
function primaryPos(mu) {
	return {
		x: -mu,
		y: 0
	};
}
function secondaryPos(mu) {
	return {
		x: 1 - mu,
		y: 0
	};
}
/** Effective potential Ω = (x²+y²)/2 + (1-μ)/r1 + μ/r2 */
function omega(x, y, mu) {
	const r1 = Math.hypot(x + mu, y);
	const r2 = Math.hypot(x - 1 + mu, y);
	return .5 * (x * x + y * y) + (1 - mu) / Math.max(r1, 1e-12) + mu / Math.max(r2, 1e-12);
}
/** ∇Ω — gravitational + centrifugal, no Coriolis. */
function omegaGrad(x, y, mu) {
	const dx1 = x + mu;
	const dx2 = x - 1 + mu;
	const r1 = Math.hypot(dx1, y);
	const r2 = Math.hypot(dx2, y);
	const r1s = Math.max(r1 * r1 * r1, 1e-18);
	const r2s = Math.max(r2 * r2 * r2, 1e-18);
	return {
		x: x - (1 - mu) * dx1 / r1s - mu * dx2 / r2s,
		y: y - (1 - mu) * y / r1s - mu * y / r2s
	};
}
function jacobi(x, y, vx, vy, mu) {
	return 2 * omega(x, y, mu) - (vx * vx + vy * vy);
}
function collinearForce(x, mu) {
	const r1 = Math.abs(x + mu);
	const r2 = Math.abs(x - 1 + mu);
	return x - (1 - mu) * (x + mu) / (r1 * r1 * r1) - mu * (x - 1 + mu) / (r2 * r2 * r2);
}
function collinearDeriv(x, mu) {
	const r1 = Math.abs(x + mu);
	const r2 = Math.abs(x - 1 + mu);
	return 1 + 2 * (1 - mu) / (r1 * r1 * r1) + 2 * mu / (r2 * r2 * r2);
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
function lagrangePoints(mu) {
	const g = Math.cbrt(mu / 3);
	const l1x = solveCollinear(mu, 1 - mu - g);
	const l2x = solveCollinear(mu, 1 - mu + g);
	const l3x = solveCollinear(mu, -1 - 5 * mu / 12);
	const l4x = .5 - mu;
	const l4y = Math.sqrt(3) / 2;
	const stable = isStable(mu);
	const mk = (id, x, y, collinear, forceStable) => ({
		id,
		x,
		y,
		omega: omega(x, y, mu),
		collinear,
		stable: forceStable
	});
	return {
		L1: mk("L1", l1x, 0, true, false),
		L2: mk("L2", l2x, 0, true, false),
		L3: mk("L3", l3x, 0, true, false),
		L4: mk("L4", l4x, l4y, false, stable),
		L5: mk("L5", l4x, -l4y, false, stable)
	};
}
function rotate(x, y, theta) {
	const c = Math.cos(theta);
	const s = Math.sin(theta);
	return {
		x: x * c - y * s,
		y: x * s + y * c
	};
}
/** CR3BP rotating-frame acceleration including Coriolis. */
function probeAccel(x, y, vx, vy, mu) {
	const g = omegaGrad(x, y, mu);
	return {
		x: 2 * vy + g.x,
		y: -2 * vx + g.y
	};
}
function rk4Step(x, y, vx, vy, mu, h) {
	const f = (px, py, pvx, pvy) => {
		const a = probeAccel(px, py, pvx, pvy, mu);
		return {
			dx: pvx,
			dy: pvy,
			dvx: a.x,
			dvy: a.y
		};
	};
	const k1 = f(x, y, vx, vy);
	const k2 = f(x + k1.dx * h * .5, y + k1.dy * h * .5, vx + k1.dvx * h * .5, vy + k1.dvy * h * .5);
	const k3 = f(x + k2.dx * h * .5, y + k2.dy * h * .5, vx + k2.dvx * h * .5, vy + k2.dvy * h * .5);
	const k4 = f(x + k3.dx * h, y + k3.dy * h, vx + k3.dvx * h, vy + k3.dvy * h);
	return {
		x: x + h / 6 * (k1.dx + 2 * k2.dx + 2 * k3.dx + k4.dx),
		y: y + h / 6 * (k1.dy + 2 * k2.dy + 2 * k3.dy + k4.dy),
		vx: vx + h / 6 * (k1.dvx + 2 * k2.dvx + 2 * k3.dvx + k4.dvx),
		vy: vy + h / 6 * (k1.dvy + 2 * k2.dvy + 2 * k3.dvy + k4.dvy)
	};
}
function predictPath(x, y, vx, vy, mu, steps = 160, dt = .045) {
	const out = new Float32Array(steps * 2);
	let px = x;
	let py = y;
	let pvx = vx;
	let pvy = vy;
	for (let i = 0; i < steps; i++) {
		const n = rk4Step(px, py, pvx, pvy, mu, dt);
		px = n.x;
		py = n.y;
		pvx = n.vx;
		pvy = n.vy;
		out[i * 2] = px;
		out[i * 2 + 1] = py;
		const r1 = Math.hypot(px + mu, py);
		const r2 = Math.hypot(px - 1 + mu, py);
		if (r1 < .02 || r2 < .012 || px * px + py * py > 16) return out.subarray(0, (i + 1) * 2);
	}
	return out;
}
/** Linear planar Lyapunov orbit about a collinear point. */
function planarLyapunov(xL, yL, mu, amp) {
	const r1 = Math.abs(xL + mu);
	const r2 = Math.abs(xL - 1 + mu);
	const sigma = (1 - mu) / (r1 * r1 * r1) + mu / (r2 * r2 * r2);
	const Oxx = 1 + 2 * sigma;
	const Oyy = 1 - sigma;
	const b = 4 - Oxx - Oyy;
	const c = Oxx * Oyy;
	const disc = Math.sqrt(Math.max(0, b * b - 4 * c));
	const rootA = (-b + disc) / 2;
	const rootB = (-b - disc) / 2;
	const w2 = rootA < 0 ? -rootA : rootB < 0 ? -rootB : 2;
	const w = Math.sqrt(Math.max(1e-6, w2));
	const k = 2 * w / (Oyy + w * w);
	const ax = amp;
	const ay = Math.abs(k) * amp;
	return {
		x: xL + ax,
		y: yL,
		vx: 0,
		vy: ay * w,
		ax,
		ay,
		w,
		lx: xL,
		ly: yL
	};
}
var POINT_ORDER = [
	"L1",
	"L2",
	"L3",
	"L4",
	"L5"
];
var MISSIONS = [
	{
		id: "isee3",
		name: "ISEE-3",
		agency: "NASA / ESA",
		years: "1978–1982",
		status: "complete",
		system: "sun-earth",
		point: "L1",
		orbit: "halo",
		amp: .0026,
		phase: .4,
		why: "The first spacecraft to occupy a Lagrange point.",
		body: "A halo around Sun–Earth L1, watching the solar wind before it reached Earth. Later renamed ICE and sent to comet Giacobini–Zinner — the first to leave a libration orbit on purpose."
	},
	{
		id: "soho",
		name: "SOHO",
		agency: "ESA / NASA",
		years: "1995–",
		status: "active",
		system: "sun-earth",
		point: "L1",
		orbit: "halo",
		amp: .0028,
		phase: 0,
		why: "Unbroken sunlight. No eclipses, no night.",
		body: "The Solar and Heliospheric Observatory has sat in a halo about L1 for three decades. From here the Sun is a constant disc, and coronal mass ejections are seen hours before they arrive."
	},
	{
		id: "ace",
		name: "ACE",
		agency: "NASA",
		years: "1997–",
		status: "active",
		system: "sun-earth",
		point: "L1",
		orbit: "lissajous",
		amp: .0022,
		phase: 1.5,
		why: "A sentinel for the solar wind’s composition.",
		body: "The Advanced Composition Explorer samples ions and energetic particles at L1, the last clean look at the wind before Earth’s magnetosphere stirs it."
	},
	{
		id: "dscovr",
		name: "DSCOVR",
		agency: "NOAA / NASA",
		years: "2015–",
		status: "active",
		system: "sun-earth",
		point: "L1",
		orbit: "lissajous",
		amp: .0024,
		phase: 2.7,
		why: "Space weather with a full-disc Earth in the rear-view.",
		body: "A climate and solar-wind watchdog at L1. EPIC photographs the sunlit Earth as a whole — the pale blue dot, continuously."
	},
	{
		id: "aditya",
		name: "Aditya-L1",
		agency: "ISRO",
		years: "2023–",
		status: "active",
		system: "sun-earth",
		point: "L1",
		orbit: "halo",
		amp: .0025,
		phase: 3.9,
		why: "India’s first solar observatory at a libration point.",
		body: "Inserted into a halo about L1 in January 2024. Coronagraphs and particle detectors watch the Sun’s outer atmosphere from the same doorstep SOHO has used since 1995."
	},
	{
		id: "wmap",
		name: "WMAP",
		agency: "NASA",
		years: "2001–2010",
		status: "complete",
		system: "sun-earth",
		point: "L2",
		orbit: "lissajous",
		amp: .003,
		phase: .9,
		why: "A cold, radio-quiet sky for the cosmic microwave background.",
		body: "Wilkinson mapped the afterglow of the Big Bang from L2, where Earth, Sun, and Moon stay in one patch of sky. The pattern it found became the standard model of cosmology."
	},
	{
		id: "gaia",
		name: "Gaia",
		agency: "ESA",
		years: "2013–",
		status: "active",
		system: "sun-earth",
		point: "L2",
		orbit: "lissajous",
		amp: .0032,
		phase: 2.2,
		why: "A billion-star census, stable thermal and a clear view.",
		body: "Gaia spins slowly in a Lissajous about L2, measuring positions with microarcsecond care. The Sun, Earth, and Moon never enter the field — they stay behind the sunshade."
	},
	{
		id: "jwst",
		name: "JWST",
		agency: "NASA / ESA / CSA",
		years: "2021–",
		status: "active",
		system: "sun-earth",
		point: "L2",
		orbit: "halo",
		amp: .0034,
		phase: 0,
		why: "It does not sit at L2. It orbits L2.",
		body: "A 6-month halo, 250,000 to 830,000 km around the point, so the telescope never falls into Earth’s shadow. Station-keeping burns every few weeks hold the saddle. The sunshield stays Sun-facing; the mirrors stay at 40 K."
	},
	{
		id: "euclid",
		name: "Euclid",
		agency: "ESA / NASA",
		years: "2023–",
		status: "active",
		system: "sun-earth",
		point: "L2",
		orbit: "halo",
		amp: .003,
		phase: 3.5,
		why: "Dark universe survey from the same cold seat as Webb.",
		body: "Arrived at L2 in July 2023. A wide-field mapper of galaxies and weak lensing, sharing the thermal quiet of the anti-Sun point with JWST and Gaia."
	},
	{
		id: "artemis",
		name: "ARTEMIS",
		agency: "NASA",
		years: "2010–2011",
		status: "complete",
		system: "earth-moon",
		point: "L1",
		orbit: "lissajous",
		amp: .038,
		phase: .7,
		why: "First spacecraft to linger at the Earth–Moon points.",
		body: "Two THEMIS probes, P1 and P2, were steered through Earth–Moon L1 and L2 Lissajous orbits — a proof that the lunar Lagrange seats can be used — then dropped into lunar orbit."
	},
	{
		id: "queqiao",
		name: "Queqiao",
		agency: "CNSA",
		years: "2018–",
		status: "active",
		system: "earth-moon",
		point: "L2",
		orbit: "halo",
		amp: .042,
		phase: 0,
		why: "A relay that never lets the lunar farside go dark.",
		body: "Magpie Bridge. A halo about Earth–Moon L2, always in view of both Earth and the Moon’s far hemisphere. Chang’e-4 landed in Von Kármán; Queqiao is the reason we heard it."
	},
	{
		id: "gateway",
		name: "Gateway",
		agency: "NASA / ESA / CSA / JAXA",
		years: "planned",
		status: "planned",
		system: "earth-moon",
		point: "L2",
		orbit: "nrho",
		amp: .048,
		phase: 1.9,
		why: "Not parked on a point — a near-rectilinear halo that kisses the Moon.",
		body: "A seven-day polar halo in the Earth–Moon L2 family. Staging post for Artemis landings. In this plane it reads as a tall, slow loop about the exterior point, skimming the lunar poles."
	},
	{
		id: "lucy",
		name: "Lucy",
		agency: "NASA",
		years: "2021–",
		status: "en-route",
		system: "sun-jupiter",
		point: "L4",
		orbit: "tadpole",
		amp: .07,
		phase: .5,
		why: "A tour of both Trojan camps.",
		body: "Launched 2021. First L4 Trojan encounters in 2027, then on to L5. The Greek camp leads Jupiter by 60°; the Trojan camp trails. Lucy will be the first to visit both swarms."
	},
	{
		id: "vigil",
		name: "Vigil",
		agency: "ESA",
		years: "planned ~2031",
		status: "planned",
		system: "sun-earth",
		point: "L5",
		orbit: "tadpole",
		amp: .04,
		phase: 1.2,
		why: "Side-on warning of solar storms, 60° behind Earth.",
		body: "The first operational spacecraft designed for Sun–Earth L5. From the trailing triangle you see the Sun’s limb before it rotates toward Earth — extra hours of space-weather lead time."
	}
];
var MISSION_MAP = new Map(MISSIONS.map((m) => [m.id, m]));
function missionById(id) {
	return MISSION_MAP.get(id);
}
function missionsForSystem(system) {
	return MISSIONS.filter((m) => m.system === system);
}
function groupedMissions() {
	return [
		"L1",
		"L2",
		"L3",
		"L4",
		"L5"
	].map((point) => ({
		point,
		missions: MISSIONS.filter((m) => m.point === point)
	})).filter((g) => g.missions.length > 0);
}
function signatureMissions(system) {
	switch (system) {
		case "sun-earth": return ["jwst", "soho"];
		case "earth-moon": return ["queqiao", "artemis"];
		case "sun-jupiter": return ["lucy"];
		default: return [];
	}
}
var BG = "#08090c";
var STEEL = "rgba(185, 196, 204, 0.55)";
var STEEL_DIM = "rgba(185, 196, 204, 0.18)";
var PAPER = "#ece8e1";
var PAPER_DIM = "rgba(236, 232, 225, 0.55)";
function makeStarfield(count = 240) {
	const stars = [];
	let s = 85601405;
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
		r: rnd() < .1 ? 1.25 : rnd() * .85 + .3,
		a: .16 + rnd() * .5,
		par: .03 + rnd() * .1
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
	const bottom = h < 760 ? Math.min(360, h * .42) : 150;
	const top = h < 760 ? 72 : 68;
	return {
		cx: w / 2,
		cy: top + (h - bottom - top) * .52
	};
}
function screenToWorld(sx, sy, cam, w, h) {
	const { cx, cy } = viewCenter(w, h);
	return {
		x: cam.x + (sx - cx) / cam.zoom,
		y: cam.y + (sy - cy) / cam.zoom
	};
}
function worldToScreen(x, y, cam, w, h) {
	const { cx, cy } = viewCenter(w, h);
	return {
		x: (x - cam.x) * cam.zoom + cx,
		y: (y - cam.y) * cam.zoom + cy
	};
}
var FIELD_EXTENT = 1.85;
var FIELD_SIZE = 220;
function buildPotentialField(mu) {
	const canvas = document.createElement("canvas");
	canvas.width = FIELD_SIZE;
	canvas.height = FIELD_SIZE;
	const ctx = canvas.getContext("2d");
	if (!ctx) return {
		mu,
		canvas
	};
	const img = ctx.createImageData(FIELD_SIZE, FIELD_SIZE);
	const data = img.data;
	const p = primaryPos(mu);
	const s = secondaryPos(mu);
	let min = Infinity;
	let max = -Infinity;
	const vals = /* @__PURE__ */ new Float32Array(48400);
	const near = /* @__PURE__ */ new Uint8Array(48400);
	for (let j = 0; j < FIELD_SIZE; j++) {
		const y = FIELD_EXTENT - j / 219 * 2 * FIELD_EXTENT;
		for (let i = 0; i < FIELD_SIZE; i++) {
			const x = -1.85 + i / 219 * 2 * FIELD_EXTENT;
			const r1 = Math.hypot(x - p.x, y - p.y);
			const r2 = Math.hypot(x - s.x, y - s.y);
			const idx = j * FIELD_SIZE + i;
			const v = omega(x, y, mu);
			vals[idx] = v;
			if (r1 < .06 || r2 < .045) near[idx] = 1;
			else {
				if (v < min) min = v;
				if (v > max) max = v;
			}
		}
	}
	const span = Math.max(1e-6, max - min);
	for (let n = 0; n < vals.length; n++) {
		const k = n * 4;
		if (near[n]) {
			data[k] = 6;
			data[k + 1] = 7;
			data[k + 2] = 10;
			data[k + 3] = 90;
			continue;
		}
		const t = Math.min(1, Math.max(0, (vals[n] - min) / span));
		const lift = t * t;
		data[k] = 10 + lift * 42;
		data[k + 1] = 12 + lift * 48;
		data[k + 2] = 16 + lift * 58;
		data[k + 3] = 28 + lift * 85;
	}
	ctx.putImageData(img, 0, 0);
	return {
		mu,
		canvas
	};
}
function buildHillMask(mu, c) {
	const canvas = document.createElement("canvas");
	canvas.width = FIELD_SIZE;
	canvas.height = FIELD_SIZE;
	const ctx = canvas.getContext("2d");
	if (!ctx) return canvas;
	const img = ctx.createImageData(FIELD_SIZE, FIELD_SIZE);
	const data = img.data;
	for (let j = 0; j < FIELD_SIZE; j++) {
		const y = FIELD_EXTENT - j / 219 * 2 * FIELD_EXTENT;
		for (let i = 0; i < FIELD_SIZE; i++) {
			const forbidden = 2 * omega(-1.85 + i / 219 * 2 * FIELD_EXTENT, y, mu) < c;
			const k = (j * FIELD_SIZE + i) * 4;
			if (forbidden) {
				data[k] = 8;
				data[k + 1] = 9;
				data[k + 2] = 12;
				data[k + 3] = 72;
			}
		}
	}
	ctx.putImageData(img, 0, 0);
	return canvas;
}
function buildContours(mu, levels) {
	const canvas = document.createElement("canvas");
	canvas.width = FIELD_SIZE;
	canvas.height = FIELD_SIZE;
	const ctx = canvas.getContext("2d");
	if (!ctx) return canvas;
	const n = FIELD_SIZE;
	const grid = /* @__PURE__ */ new Float32Array(48400);
	for (let j = 0; j < n; j++) {
		const y = FIELD_EXTENT - j / 219 * 2 * FIELD_EXTENT;
		for (let i = 0; i < n; i++) {
			const x = -1.85 + i / 219 * 2 * FIELD_EXTENT;
			grid[j * n + i] = omega(x, y, mu);
		}
	}
	ctx.strokeStyle = "rgba(185,196,204,0.55)";
	ctx.lineWidth = 1.1;
	const cell = 2 * FIELD_EXTENT / 219;
	const toPx = (x, y) => {
		return {
			px: (x + FIELD_EXTENT) / (2 * FIELD_EXTENT) * 219,
			py: (FIELD_EXTENT - y) / (2 * FIELD_EXTENT) * 219
		};
	};
	for (const level of levels) {
		ctx.beginPath();
		for (let j = 0; j < 219; j++) for (let i = 0; i < 219; i++) {
			const x0 = -1.85 + i * cell;
			const y0 = FIELD_EXTENT - j * cell;
			const v00 = grid[j * n + i];
			const v10 = grid[j * n + i + 1];
			const v01 = grid[(j + 1) * n + i];
			const v11 = grid[(j + 1) * n + i + 1];
			const idx = (v00 > level ? 1 : 0) | (v10 > level ? 2 : 0) | (v11 > level ? 4 : 0) | (v01 > level ? 8 : 0);
			if (idx === 0 || idx === 15) continue;
			const lerp = (a, b, va, vb) => a + (level - va) / (vb - va || 1e-9) * (b - a);
			const top = {
				x: lerp(x0, x0 + cell, v00, v10),
				y: y0
			};
			const right = {
				x: x0 + cell,
				y: lerp(y0, y0 - cell, v10, v11)
			};
			const bottom = {
				x: lerp(x0, x0 + cell, v01, v11),
				y: y0 - cell
			};
			const left = {
				x: x0,
				y: lerp(y0, y0 - cell, v00, v01)
			};
			const segs = [];
			if (idx === 1 || idx === 14) segs.push({
				a: left,
				b: top
			});
			else if (idx === 2 || idx === 13) segs.push({
				a: top,
				b: right
			});
			else if (idx === 4 || idx === 11) segs.push({
				a: right,
				b: bottom
			});
			else if (idx === 8 || idx === 7) segs.push({
				a: bottom,
				b: left
			});
			else if (idx === 3 || idx === 12) segs.push({
				a: left,
				b: right
			});
			else if (idx === 6 || idx === 9) segs.push({
				a: top,
				b: bottom
			});
			else if (idx === 5) {
				segs.push({
					a: left,
					b: top
				});
				segs.push({
					a: right,
					b: bottom
				});
			} else if (idx === 10) {
				segs.push({
					a: top,
					b: right
				});
				segs.push({
					a: bottom,
					b: left
				});
			}
			for (const seg of segs) {
				const a = toPx(seg.a.x, seg.a.y);
				const b = toPx(seg.b.x, seg.b.y);
				ctx.moveTo(a.px, a.py);
				ctx.lineTo(b.px, b.py);
			}
		}
		ctx.stroke();
	}
	return canvas;
}
function drawStars(ctx, w, h, cam, stars) {
	const ox = -cam.x * 8;
	const oy = -cam.y * 8;
	for (let i = 0; i < stars.length; i++) {
		const s = stars[i];
		const x = ((s.x * w + ox * s.par) % w + w) % w;
		const y = ((s.y * h + oy * s.par) % h + h) % h;
		ctx.fillStyle = `rgba(236,232,225,${s.a})`;
		ctx.beginPath();
		ctx.arc(x, y, s.r, 0, Math.PI * 2);
		ctx.fill();
	}
}
function drawVignette(ctx, w, h) {
	const g = ctx.createRadialGradient(w * .5, h * .46, h * .12, w * .5, h * .5, h * .82);
	g.addColorStop(0, "rgba(8,9,12,0)");
	g.addColorStop(1, "rgba(8,9,12,0.55)");
	ctx.fillStyle = g;
	ctx.fillRect(0, 0, w, h);
}
function xf(x, y, theta, frame) {
	if (frame === "rotating" || theta === 0) return {
		x,
		y
	};
	return rotate(x, y, theta);
}
function drawFrame(opts) {
	const { ctx, w, h, cam, stars } = opts;
	ctx.fillStyle = BG;
	ctx.fillRect(0, 0, w, h);
	drawStars(ctx, w, h, cam, stars);
	const { cx, cy } = viewCenter(w, h);
	const camT = xf(cam.x, cam.y, opts.theta, opts.frame);
	ctx.save();
	ctx.translate(cx, cy);
	ctx.scale(cam.zoom, cam.zoom);
	ctx.translate(-camT.x, -camT.y);
	if (opts.potential && opts.field) {
		ctx.save();
		if (opts.frame === "inertial") ctx.rotate(opts.theta);
		ctx.imageSmoothingEnabled = true;
		ctx.globalAlpha = .9;
		ctx.drawImage(opts.field.canvas, -1.85, -1.85, FIELD_EXTENT * 2, FIELD_EXTENT * 2);
		ctx.restore();
	}
	if (opts.hills && opts.hill) {
		ctx.save();
		if (opts.frame === "inertial") ctx.rotate(opts.theta);
		ctx.globalAlpha = .55;
		ctx.drawImage(opts.hill, -1.85, -1.85, FIELD_EXTENT * 2, FIELD_EXTENT * 2);
		ctx.restore();
	}
	if (opts.contours) {
		ctx.save();
		if (opts.frame === "inertial") ctx.rotate(opts.theta);
		ctx.imageSmoothingEnabled = true;
		ctx.globalAlpha = .85;
		ctx.drawImage(opts.contours, -1.85, -1.85, FIELD_EXTENT * 2, FIELD_EXTENT * 2);
		ctx.restore();
	}
	drawGeometry(ctx, opts);
	drawHaloGhosts(ctx, opts);
	if (opts.trails) drawTrails(ctx, opts.probes, opts.frame, opts.theta, cam.zoom);
	if (opts.predict) drawPredict(ctx, opts.predict, opts.frame, opts.theta);
	drawBodies(ctx, opts);
	drawPoints(ctx, opts);
	drawProbes(ctx, opts);
	drawParticles(ctx, opts.particles, opts.frame, opts.theta);
	if (opts.fling.active) drawFling(ctx, opts.fling, opts.frame, opts.theta);
	ctx.restore();
	drawVignette(ctx, w, h);
	drawPointLabels(ctx, opts);
	drawCraftLabels(ctx, opts);
}
function drawGeometry(ctx, opts) {
	const p = xf(-opts.mu, 0, opts.theta, opts.frame);
	const s = xf(1 - opts.mu, 0, opts.theta, opts.frame);
	const l4 = xf(opts.points.L4.x, opts.points.L4.y, opts.theta, opts.frame);
	const l5 = xf(opts.points.L5.x, opts.points.L5.y, opts.theta, opts.frame);
	const lw = 1 / opts.cam.zoom;
	ctx.strokeStyle = STEEL_DIM;
	ctx.lineWidth = lw;
	ctx.beginPath();
	ctx.arc(0, 0, 1, 0, Math.PI * 2);
	ctx.stroke();
	ctx.beginPath();
	ctx.moveTo(p.x, p.y);
	ctx.lineTo(s.x, s.y);
	ctx.stroke();
	ctx.setLineDash([4 * lw, 5 * lw]);
	ctx.beginPath();
	ctx.moveTo(p.x, p.y);
	ctx.lineTo(l4.x, l4.y);
	ctx.lineTo(s.x, s.y);
	ctx.stroke();
	ctx.beginPath();
	ctx.moveTo(p.x, p.y);
	ctx.lineTo(l5.x, l5.y);
	ctx.lineTo(s.x, s.y);
	ctx.stroke();
	ctx.setLineDash([]);
	ctx.fillStyle = "rgba(236,232,225,0.35)";
	ctx.beginPath();
	ctx.arc(0, 0, 3 * lw, 0, Math.PI * 2);
	ctx.fill();
}
function haloPeriod(h) {
	const r = h.w === 0 ? 1 : h.wy / h.w;
	if (Math.abs(r - 2 / 3) < .08) return Math.PI * 6 / Math.max(h.w, 1e-6);
	return Math.PI * 2 / Math.max(h.w, 1e-6);
}
function drawHaloGhosts(ctx, opts) {
	const lw = 1.1 / opts.cam.zoom;
	for (let i = 0; i < opts.probes.length; i++) {
		const pr = opts.probes[i];
		if (!pr.halo) continue;
		const selected = pr.missionId === opts.selectedMission;
		const h = pr.halo;
		const period = haloPeriod(h);
		const n = selected ? 160 : 96;
		ctx.beginPath();
		for (let k = 0; k <= n; k++) {
			const t = k / n * period;
			const p = xf(h.lx + h.ax * Math.cos(h.w * t + h.phase), h.ly + h.ay * Math.sin(h.wy * t + h.phase), opts.theta, opts.frame);
			if (k === 0) ctx.moveTo(p.x, p.y);
			else ctx.lineTo(p.x, p.y);
		}
		ctx.strokeStyle = selected ? "rgba(185,196,204,0.7)" : "rgba(185,196,204,0.18)";
		ctx.lineWidth = selected ? lw * 1.35 : lw;
		ctx.setLineDash(selected ? [5 * lw, 6 * lw] : [3 * lw, 7 * lw]);
		ctx.stroke();
		ctx.setLineDash([]);
	}
}
function drawBodies(ctx, opts) {
	const p0 = xf(-opts.mu, 0, opts.theta, opts.frame);
	const s0 = xf(1 - opts.mu, 0, opts.theta, opts.frame);
	disc(ctx, p0.x, p0.y, opts.system.primaryR, opts.system.primaryFill, opts.system.primaryGlow);
	disc(ctx, s0.x, s0.y, opts.system.secondaryR, opts.system.secondaryFill, opts.system.secondaryGlow);
}
function disc(ctx, x, y, r, fill, glow) {
	ctx.save();
	ctx.globalAlpha = .18;
	ctx.fillStyle = glow;
	ctx.beginPath();
	ctx.arc(x, y, r * 2.15, 0, Math.PI * 2);
	ctx.fill();
	ctx.restore();
	const g = ctx.createRadialGradient(x - r * .28, y - r * .32, r * .08, x, y, r);
	g.addColorStop(0, glow);
	g.addColorStop(.55, fill);
	g.addColorStop(1, "#0b0c10");
	ctx.fillStyle = g;
	ctx.beginPath();
	ctx.arc(x, y, r, 0, Math.PI * 2);
	ctx.fill();
}
function drawPoints(ctx, opts) {
	const lw = 1.2 / opts.cam.zoom;
	for (const id of [
		"L1",
		"L2",
		"L3",
		"L4",
		"L5"
	]) {
		const pt = opts.points[id];
		const p = xf(pt.x, pt.y, opts.theta, opts.frame);
		const selected = opts.selected === id;
		const pulse = selected && !opts.reduced ? 1 + .08 * Math.sin(opts.now * .004) : 1;
		const s = (selected ? 9 : 7) * pulse * lw;
		ctx.strokeStyle = pt.stable ? PAPER : STEEL;
		ctx.lineWidth = lw;
		ctx.globalAlpha = selected ? 1 : .8;
		ctx.beginPath();
		ctx.moveTo(p.x - s, p.y);
		ctx.lineTo(p.x + s, p.y);
		ctx.moveTo(p.x, p.y - s);
		ctx.lineTo(p.x, p.y + s);
		ctx.stroke();
		ctx.beginPath();
		ctx.arc(p.x, p.y, s * 1.35, 0, Math.PI * 2);
		ctx.stroke();
		ctx.globalAlpha = 1;
	}
}
function drawPointLabels(ctx, opts) {
	const camT = {
		...opts.cam,
		...xf(opts.cam.x, opts.cam.y, opts.theta, opts.frame)
	};
	const ids = [
		"L1",
		"L2",
		"L3",
		"L4",
		"L5"
	];
	ctx.font = "500 11px 'IBM Plex Sans', sans-serif";
	ctx.textAlign = "center";
	ctx.textBaseline = "bottom";
	for (const id of ids) {
		const pt = opts.points[id];
		const p = xf(pt.x, pt.y, opts.theta, opts.frame);
		const s = worldToScreen(p.x, p.y, camT, opts.w, opts.h);
		const dy = id === "L2" ? 22 : id === "L1" ? -14 : -12;
		ctx.fillStyle = opts.selected === id ? PAPER : PAPER_DIM;
		ctx.fillText(id, s.x, s.y + dy);
	}
	const prim = xf(-opts.mu, 0, opts.theta, opts.frame);
	const sec = xf(1 - opts.mu, 0, opts.theta, opts.frame);
	const ps = worldToScreen(prim.x, prim.y, camT, opts.w, opts.h);
	const ss = worldToScreen(sec.x, sec.y, camT, opts.w, opts.h);
	ctx.fillStyle = PAPER_DIM;
	ctx.font = "500 10px 'IBM Plex Sans', sans-serif";
	ctx.fillText(opts.system.primary, ps.x, ps.y + opts.system.primaryR * opts.cam.zoom + 16);
	ctx.fillText(opts.system.secondary, ss.x, ss.y + opts.system.secondaryR * opts.cam.zoom + 16);
}
function drawTrails(ctx, probes, frame, theta, zoom) {
	ctx.lineWidth = 1.1 / zoom;
	ctx.lineJoin = "round";
	ctx.lineCap = "round";
	for (let i = 0; i < probes.length; i++) {
		const pr = probes[i];
		if (pr.trailCount < 2) continue;
		const cap = pr.trail.length / 2;
		const n = pr.trailCount;
		ctx.beginPath();
		for (let k = 0; k < n; k++) {
			const idx = (pr.trailHead - n + k + cap * 8) % cap;
			const wx = pr.trail[idx * 2];
			const wy = pr.trail[idx * 2 + 1];
			const p = xf(wx, wy, theta, frame);
			if (k === 0) ctx.moveTo(p.x, p.y);
			else ctx.lineTo(p.x, p.y);
		}
		ctx.strokeStyle = pr.missionId ? "rgba(236,232,225,0.28)" : "rgba(236,232,225,0.38)";
		ctx.stroke();
	}
}
function drawProbes(ctx, opts) {
	const r = 3.2 / opts.cam.zoom;
	for (let i = 0; i < opts.probes.length; i++) {
		const pr = opts.probes[i];
		const p = xf(pr.x, pr.y, opts.theta, opts.frame);
		const craft = Boolean(pr.label);
		const selected = pr.missionId === opts.selectedMission;
		const status = pr.missionId ? missionById(pr.missionId)?.status : void 0;
		const dim = status === "complete" || status === "planned";
		const rad = r * (craft ? 1.35 : 1) * (selected ? 1.35 : 1) * (1 + pr.flash * .8);
		ctx.fillStyle = PAPER;
		ctx.globalAlpha = dim && !selected ? .55 : .95;
		if (craft) {
			ctx.save();
			ctx.translate(p.x, p.y);
			ctx.rotate(Math.PI / 4);
			ctx.fillRect(-rad, -rad, rad * 2, rad * 2);
			ctx.restore();
		} else {
			ctx.beginPath();
			ctx.arc(p.x, p.y, rad, 0, Math.PI * 2);
			ctx.fill();
		}
		ctx.globalAlpha = selected ? .4 : .22;
		ctx.beginPath();
		ctx.arc(p.x, p.y, rad * (selected ? 3.1 : 2.4), 0, Math.PI * 2);
		ctx.fill();
		if (selected) {
			ctx.globalAlpha = .9;
			ctx.strokeStyle = PAPER;
			ctx.lineWidth = 1.2 / opts.cam.zoom;
			ctx.beginPath();
			ctx.arc(p.x, p.y, rad * 2.2, 0, Math.PI * 2);
			ctx.stroke();
		}
		ctx.globalAlpha = 1;
	}
}
function drawCraftLabels(ctx, opts) {
	const camT = {
		...opts.cam,
		...xf(opts.cam.x, opts.cam.y, opts.theta, opts.frame)
	};
	const raw = [];
	for (let i = 0; i < opts.probes.length; i++) {
		const pr = opts.probes[i];
		if (!pr.label) continue;
		const p = xf(pr.x, pr.y, opts.theta, opts.frame);
		const s = worldToScreen(p.x, p.y, camT, opts.w, opts.h);
		const status = pr.missionId ? missionById(pr.missionId)?.status : void 0;
		const selected = pr.missionId === opts.selectedMission;
		ctx.font = selected ? "500 12px 'IBM Plex Sans', sans-serif" : "500 11px 'IBM Plex Sans', sans-serif";
		raw.push({
			label: pr.label,
			x: s.x + 10,
			y: s.y - 1,
			selected,
			dim: status === "complete" || status === "planned",
			tw: ctx.measureText(pr.label).width
		});
	}
	raw.sort((a, b) => Number(b.selected) - Number(a.selected));
	const placed = [];
	const hits = (a, b) => {
		const ax1 = a.x + a.tw + (a.selected ? 14 : 0);
		const bx1 = b.x + b.tw + (b.selected ? 14 : 0);
		return a.x < bx1 + 8 && b.x < ax1 + 8 && Math.abs(a.y - b.y) < 15;
	};
	for (const it of raw) {
		if (it.selected) {
			placed.push(it);
			continue;
		}
		if (placed.some((p) => hits(it, p))) continue;
		placed.push(it);
	}
	ctx.textAlign = "left";
	ctx.textBaseline = "middle";
	for (const it of placed) {
		ctx.font = it.selected ? "500 12px 'IBM Plex Sans', sans-serif" : "500 11px 'IBM Plex Sans', sans-serif";
		if (it.selected) {
			ctx.fillStyle = "rgba(8,9,12,0.78)";
			ctx.beginPath();
			ctx.roundRect(it.x - 1, it.y - 8, it.tw + 14, 16, 6);
			ctx.fill();
			ctx.fillStyle = PAPER;
			ctx.fillText(it.label, it.x + 6, it.y);
		} else {
			ctx.fillStyle = it.dim ? "rgba(236,232,225,0.45)" : PAPER_DIM;
			ctx.fillText(it.label, it.x, it.y);
		}
	}
}
function drawParticles(ctx, particles, frame, theta) {
	for (let i = 0; i < particles.length; i++) {
		const p = particles[i];
		const q = xf(p.x, p.y, theta, frame);
		ctx.globalAlpha = Math.max(0, p.life) * .7;
		ctx.fillStyle = PAPER;
		ctx.beginPath();
		ctx.arc(q.x, q.y, .01 * p.size, 0, Math.PI * 2);
		ctx.fill();
	}
	ctx.globalAlpha = 1;
}
function drawPredict(ctx, path, frame, theta) {
	if (path.length < 4) return;
	ctx.setLineDash([.03, .04]);
	ctx.strokeStyle = "rgba(185,196,204,0.7)";
	ctx.lineWidth = .012;
	ctx.beginPath();
	for (let i = 0; i < path.length; i += 2) {
		const p = xf(path[i], path[i + 1], theta, frame);
		if (i === 0) ctx.moveTo(p.x, p.y);
		else ctx.lineTo(p.x, p.y);
	}
	ctx.stroke();
	ctx.setLineDash([]);
}
function drawFling(ctx, fling, frame, theta) {
	const a = xf(fling.x0, fling.y0, theta, frame);
	const b = xf(fling.x1, fling.y1, theta, frame);
	ctx.strokeStyle = PAPER_DIM;
	ctx.lineWidth = .01;
	ctx.beginPath();
	ctx.moveTo(a.x, a.y);
	ctx.lineTo(b.x, b.y);
	ctx.stroke();
	ctx.fillStyle = PAPER;
	ctx.beginPath();
	ctx.arc(a.x, a.y, .012, 0, Math.PI * 2);
	ctx.fill();
}
var SYSTEMS = [
	{
		id: "earth-moon",
		label: "Earth–Moon",
		pair: "Earth and Moon",
		primary: "Earth",
		secondary: "Moon",
		mu: .0121506683,
		periodDays: 27.32,
		primaryR: .052,
		secondaryR: .02,
		primaryFill: "#8ea0ae",
		primaryGlow: "#c5d4de",
		secondaryFill: "#cfc6b8",
		secondaryGlow: "#ebe4d8",
		zoom: "wide",
		blurb: "Close enough to see all five seats at once. L4 and L5 are stable — barely.",
		missions: [
			{
				name: "Lunar Gateway",
				point: "L2",
				note: "Planned NRHO staging post in the Earth–Moon L2 family."
			},
			{
				name: "Queqiao",
				point: "L2",
				note: "Halo relay that keeps the lunar farside in contact."
			},
			{
				name: "O’Neill sites",
				point: "L5",
				note: "The classic proposal for a co-orbital habitat."
			}
		]
	},
	{
		id: "sun-earth",
		label: "Sun–Earth",
		pair: "Sun and Earth",
		primary: "Sun",
		secondary: "Earth",
		mu: 30034e-10,
		periodDays: 365.25,
		primaryR: .04,
		secondaryR: .0032,
		primaryFill: "#ddd4c4",
		primaryGlow: "#f4eee4",
		secondaryFill: "#6f8ea3",
		secondaryGlow: "#b7cfe0",
		zoom: "secondary",
		blurb: "L1 and L2 cling to Earth — a million miles toward and away from the Sun.",
		missions: [
			{
				name: "SOHO · DSCOVR",
				point: "L1",
				note: "Unbroken sunlight and a constant watch on the solar wind."
			},
			{
				name: "JWST · Gaia · Euclid",
				point: "L2",
				note: "Cold, radio-quiet, and always in line for power and Earth comms."
			},
			{
				name: "Vigil",
				point: "L5",
				note: "Planned side-on sentinel, 60° behind Earth."
			}
		]
	},
	{
		id: "sun-jupiter",
		label: "Sun–Jupiter",
		pair: "Sun and Jupiter",
		primary: "Sun",
		secondary: "Jupiter",
		mu: 95387e-8,
		periodDays: 4332.6,
		primaryR: .068,
		secondaryR: .036,
		primaryFill: "#ddd4c4",
		primaryGlow: "#f4eee4",
		secondaryFill: "#c4b39a",
		secondaryGlow: "#e5d6bc",
		zoom: "wide",
		blurb: "The textbook Trojan camps. Thousands of asteroids share Jupiter’s orbit.",
		missions: [{
			name: "Greek camp",
			point: "L4",
			note: "Leading Trojans, 60° ahead of Jupiter."
		}, {
			name: "Trojan camp",
			point: "L5",
			note: "Trailing swarm. Lucy is touring both."
		}]
	},
	{
		id: "equal",
		label: "Equal mass",
		pair: "Twin worlds",
		primary: "A",
		secondary: "B",
		mu: .5,
		periodDays: 20,
		primaryR: .055,
		secondaryR: .055,
		primaryFill: "#c8c2b6",
		primaryGlow: "#ebe6dc",
		secondaryFill: "#9aa8b4",
		secondaryGlow: "#d2dde6",
		zoom: "wide",
		blurb: "Past the Routh limit the triangular points lose their Coriolis grip.",
		missions: []
	}
];
var SYSTEM_MAP = new Map(SYSTEMS.map((s) => [s.id, s]));
function systemById(id) {
	return SYSTEM_MAP.get(id) ?? SYSTEMS[0];
}
var POINT_COPY = {
	L1: {
		id: "L1",
		title: "Interior collinear",
		seat: "Between the two masses",
		body: "A saddle in the effective potential. Leave a probe here at rest and the slightest numerical breath sends it sliding toward one body or the other. The Coriolis force cannot hold it.",
		use: "The solar-facing doorstep: continuous sunlight, a clean view of the solar wind, a waypoint between worlds."
	},
	L2: {
		id: "L2",
		title: "Exterior collinear",
		seat: "Beyond the smaller mass",
		body: "Another saddle, just outside the secondary. Halo and Lissajous orbits station-keep here with modest fuel — never quite at rest, always looping around the unstable point.",
		use: "Deep-space telescopes sit here so the Sun, Earth, and Moon stay in one patch of sky: power, comms, and a cold dark view."
	},
	L3: {
		id: "L3",
		title: "Opposite collinear",
		seat: "Beyond the larger mass",
		body: "Almost opposite the secondary, slightly off the unit circle. Unstable, remote, and forever hidden behind the primary from the smaller world’s point of view.",
		use: "No operational spacecraft. Science fiction parked a counter-Earth here. Reality left it empty."
	},
	L4: {
		id: "L4",
		title: "Leading Trojan",
		seat: "60° ahead — an equilateral triangle",
		body: "A maximum of the effective potential, not a well. For mass ratios below the Routh limit, Coriolis turns a hilltop into a trap: tadpole orbits librate around the point instead of rolling off.",
		use: "Jupiter’s Greek camp. A natural parking orbit for co-orbital companions and, one day, habitats."
	},
	L5: {
		id: "L5",
		title: "Trailing Trojan",
		seat: "60° behind — the other triangle",
		body: "Mirror of L4. Same stability criterion, same tadpole and horseshoe families. Drop a cloud of probes here and they braid around the point for as long as the mass ratio allows.",
		use: "Jupiter’s Trojan camp, and the Earth–Moon site O’Neill picked for a colony."
	}
};
var STEP = 1 / 90;
var TRAIL_SPACING = .012;
var MAX_PROBES = 40;
var MIN_ZOOM = 70;
var MAX_ZOOM = 3600;
var FLING_SCALE = .95;
var SAVE_KEY = "libration-v3";
var live = null;
function createEngine(canvas, onHud) {
	live?.destroy();
	const prev = window.__libration;
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
	let systemId = "sun-earth";
	let mu = systemById(systemId).mu;
	let points = lagrangePoints(mu);
	let probes = [];
	const particles = [];
	const stars = makeStarfield();
	const cam = {
		x: 0,
		y: 0,
		zoom: 240
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
	let frame = "rotating";
	let potential = false;
	let hills = false;
	let trails = true;
	let mute = false;
	let selected = "L2";
	let selectedMission = "jwst";
	let hint = true;
	let running = false;
	let raf = 0;
	let acc = 0;
	let last = 0;
	let simTime = 0;
	let size = {
		w: 800,
		h: 600,
		dpr: 1
	};
	let fitted = false;
	let predict = null;
	let panPointer = -1;
	let panLastX = 0;
	let panLastY = 0;
	let pinch = null;
	const pointers = /* @__PURE__ */ new Map();
	const keys = /* @__PURE__ */ new Set();
	let hudDirty = true;
	let hudClock = 0;
	let nextProbeId = 1;
	let field = buildPotentialField(mu);
	let contours = buildContours(mu, [
		lagrangePoints(mu).L1.omega,
		lagrangePoints(mu).L2.omega,
		lagrangePoints(mu).L3.omega
	]);
	let hill = null;
	let hillC = NaN;
	const saved = loadSave();
	if (saved) {
		systemId = saved.system;
		mu = clampMu(saved.mu);
		trails = saved.trails;
		mute = saved.mute;
		frame = saved.frame;
		potential = saved.potential;
		hills = saved.hills;
		timeScale = saved.timeScale;
		audio.setMute(mute);
		points = lagrangePoints(mu);
		field = buildPotentialField(mu);
		contours = buildContours(mu, [
			points.L1.omega,
			points.L2.omega,
			points.L3.omega
		]);
	}
	seedDemo();
	fitCamera(true);
	function snapshot() {
		const lastProbe = probes[probes.length - 1];
		return {
			paused,
			timeScale,
			frame,
			potential,
			hills,
			trails,
			mute,
			system: systemId,
			mu,
			stable: isStable(mu),
			probeCount: probes.length,
			selected,
			selectedMission,
			jacobi: lastProbe ? lastProbe.jacobi : null,
			hint,
			simDays: simTime / (Math.PI * 2) * systemById(systemId).periodDays
		};
	}
	function emitHud() {
		hudDirty = false;
		onHud(snapshot());
	}
	function persist() {
		try {
			const data = {
				version: 1,
				system: systemId,
				mu,
				trails,
				mute,
				frame,
				potential,
				hills,
				timeScale
			};
			localStorage.setItem(SAVE_KEY, JSON.stringify(data));
		} catch {}
	}
	function rebuildPoints() {
		points = lagrangePoints(mu);
		field = buildPotentialField(mu);
		contours = buildContours(mu, [
			points.L1.omega,
			points.L2.omega,
			points.L3.omega
		]);
		hill = null;
		hillC = NaN;
		hudDirty = true;
	}
	function recordTrail(pr) {
		const dx = pr.x - pr.lastTrailX;
		const dy = pr.y - pr.lastTrailY;
		if (dx * dx + dy * dy < TRAIL_SPACING * TRAIL_SPACING) return;
		const i = pr.trailHead % (pr.trail.length / 2);
		pr.trail[i * 2] = pr.x;
		pr.trail[i * 2 + 1] = pr.y;
		pr.trailHead += 1;
		if (pr.trailCount < pr.trail.length / 2) pr.trailCount += 1;
		pr.lastTrailX = pr.x;
		pr.lastTrailY = pr.y;
	}
	function spawnProbe(x, y, vx, vy, silent = false, extra) {
		if (probes.length >= MAX_PROBES) probes.shift();
		const pr = {
			id: nextProbeId++,
			x,
			y,
			vx,
			vy,
			trail: /* @__PURE__ */ new Float32Array(440),
			trailCount: 0,
			trailHead: 0,
			lastTrailX: x,
			lastTrailY: y,
			jacobi: jacobi(x, y, vx, vy, mu),
			flash: 1,
			hue: 40,
			label: extra?.label ?? null,
			missionId: extra?.missionId ?? null,
			keep: extra?.keep ?? false,
			halo: extra?.halo ?? null
		};
		probes.push(pr);
		hint = false;
		hudDirty = true;
		if (!silent) audio.drop();
		return pr;
	}
	function spawnMissionCraft(id, silent = true) {
		const m = missionById(id);
		if (!m || m.system !== systemId) return;
		const pt = points[m.point];
		const ph = m.phase;
		if (m.orbit === "tadpole") {
			const w = .38;
			const ax = m.amp;
			const ay = m.amp * .58;
			spawnProbe(pt.x + ax * Math.cos(ph), pt.y + ay * Math.sin(ph), -ax * w * Math.sin(ph), ay * w * Math.cos(ph), silent, {
				label: m.name,
				missionId: m.id,
				keep: true,
				halo: {
					lx: pt.x,
					ly: pt.y,
					ax,
					ay,
					w,
					wy: w,
					phase: ph
				}
			});
			return;
		}
		if (m.orbit === "halo" || m.orbit === "lissajous" || m.orbit === "nrho") {
			const ly = planarLyapunov(pt.x, pt.y, mu, m.amp);
			let ax = ly.ax;
			let ay = ly.ay;
			const w = ly.w;
			let wy = w;
			if (m.orbit === "lissajous") wy = w * (2 / 3);
			if (m.orbit === "nrho") {
				ax *= .55;
				ay *= 1.12;
			}
			spawnProbe(ly.lx + ax * Math.cos(ph), ly.ly + ay * Math.sin(ph), -ax * w * Math.sin(ph), ay * wy * Math.cos(ph), silent, {
				label: m.name,
				missionId: m.id,
				keep: true,
				halo: {
					lx: ly.lx,
					ly: ly.ly,
					ax,
					ay,
					w,
					wy,
					phase: ph
				}
			});
			return;
		}
		const ang = m.point === "L5" ? -Math.PI / 10 : Math.PI / 10;
		spawnProbe(pt.x + Math.cos(ang) * m.amp, pt.y + Math.sin(ang) * m.amp, 0, 0, silent, {
			label: m.name,
			missionId: m.id,
			keep: false
		});
	}
	function seedDemo() {
		probes = [];
		nextProbeId = 1;
		simTime = 0;
		const list = missionsForSystem(systemId);
		for (const m of list) spawnMissionCraft(m.id, true);
		if (list.length === 0) {
			spawnProbe(points.L4.x, points.L4.y, 0, 0, true);
			spawnProbe(points.L1.x, 0, 0, 0, true);
			selected = "L4";
			selectedMission = null;
		} else {
			const first = missionById(signatureMissions(systemId)[0] ?? list[0].id);
			selected = first?.point ?? list[0].point;
			selectedMission = first?.id ?? list[0].id;
		}
		hint = true;
	}
	function dropAt(id, kick = 0) {
		const pt = points[id];
		const ang = Math.random() * Math.PI * 2;
		spawnProbe(pt.x, pt.y, Math.cos(ang) * kick, Math.sin(ang) * kick);
		selected = id;
		selectedMission = null;
		hudDirty = true;
	}
	function selectMission(id) {
		const m = missionById(id);
		if (!m || m.system !== systemId) return;
		selectedMission = id;
		selected = m.point;
		hint = false;
		hudDirty = true;
	}
	function burst(x, y) {
		for (let i = 0; i < 10; i++) {
			const ang = Math.PI * 2 * i / 10 + Math.random() * .3;
			const sp = .08 + Math.random() * .12;
			particles.push({
				x,
				y,
				vx: Math.cos(ang) * sp,
				vy: Math.sin(ang) * sp,
				life: 1,
				maxLife: .35 + Math.random() * .25,
				size: 1.2 + Math.random() * 1.6
			});
		}
	}
	function physicsFrame(h) {
		const prim = primaryPos(mu);
		const sec = secondaryPos(mu);
		const sys = systemById(systemId);
		for (let i = probes.length - 1; i >= 0; i--) {
			const pr = probes[i];
			const n = rk4Step(pr.x, pr.y, pr.vx, pr.vy, mu, h);
			pr.x = n.x;
			pr.y = n.y;
			pr.vx = n.vx;
			pr.vy = n.vy;
			if (pr.keep && pr.halo) {
				const t = simTime + h;
				const wt = pr.halo.w * t + pr.halo.phase;
				const wyt = pr.halo.wy * t + pr.halo.phase;
				const hx = pr.halo.lx + pr.halo.ax * Math.cos(wt);
				const hy = pr.halo.ly + pr.halo.ay * Math.sin(wyt);
				const hvx = -pr.halo.ax * pr.halo.w * Math.sin(wt);
				const hvy = pr.halo.ay * pr.halo.wy * Math.cos(wyt);
				const blend = 1 - Math.exp(-1.6 * h);
				pr.x += (hx - pr.x) * blend;
				pr.y += (hy - pr.y) * blend;
				pr.vx += (hvx - pr.vx) * blend;
				pr.vy += (hvy - pr.vy) * blend;
			}
			const r1 = Math.hypot(pr.x - prim.x, pr.y - prim.y);
			const r2 = Math.hypot(pr.x - sec.x, pr.y - sec.y);
			if (!pr.keep && (r1 < sys.primaryR * .82 || r2 < sys.secondaryR * .82 || pr.x * pr.x + pr.y * pr.y > 25)) {
				burst(pr.x, pr.y);
				audio.absorb();
				probes.splice(i, 1);
				hudDirty = true;
				continue;
			}
			if (trails) recordTrail(pr);
		}
		simTime += h;
	}
	function fitCamera(instant = false) {
		if (systemById(systemId).zoom === "secondary") {
			const s = secondaryPos(mu);
			const l1 = points.L1;
			const l2 = points.L2;
			const cx = (s.x + l1.x + l2.x) / 3;
			const span = Math.max(.14, Math.abs(l2.x - l1.x) * 6);
			cam.x = cx;
			cam.y = 0;
			const { cy } = viewCenter(size.w, size.h);
			const availH = Math.max(160, cy * 2);
			cam.zoom = clamp(.78 * Math.min(size.w / span, availH / (span * .65)), MIN_ZOOM, MAX_ZOOM);
		} else {
			const xs = POINT_ORDER.map((id) => points[id].x);
			const ys = POINT_ORDER.map((id) => points[id].y);
			const minX = Math.min(...xs) - .25;
			const maxX = Math.max(...xs) + .25;
			const minY = Math.min(...ys) - .2;
			const maxY = Math.max(...ys) + .2;
			cam.x = (minX + maxX) / 2;
			cam.y = (minY + maxY) / 2;
			const spanX = maxX - minX;
			const spanY = maxY - minY;
			const { cy } = viewCenter(size.w, size.h);
			const availH = Math.max(160, cy * 2);
			cam.zoom = clamp(.82 * Math.min(size.w / spanX, availH / spanY), MIN_ZOOM, MAX_ZOOM);
		}
	}
	function focusPoint(id) {
		selected = id;
		const pt = points[id];
		cam.x = pt.x;
		cam.y = pt.y;
		cam.zoom = clamp(cam.zoom * 1.15, MIN_ZOOM, MAX_ZOOM);
		hudDirty = true;
	}
	function nearestPoint(x, y, limit) {
		let best = null;
		let bestD = limit * limit;
		for (const id of POINT_ORDER) {
			const pt = points[id];
			const d = (pt.x - x) ** 2 + (pt.y - y) ** 2;
			if (d < bestD) {
				bestD = d;
				best = id;
			}
		}
		return best;
	}
	function nearestCraft(x, y, limit) {
		let best = null;
		let bestD = limit * limit;
		for (const pr of probes) {
			if (!pr.missionId) continue;
			const d = (pr.x - x) ** 2 + (pr.y - y) ** 2;
			if (d < bestD) {
				bestD = d;
				best = pr;
			}
		}
		return best;
	}
	function updatePredict() {
		if (!fling.active) {
			predict = null;
			return;
		}
		const vx = (fling.x1 - fling.x0) * FLING_SCALE;
		const vy = (fling.y1 - fling.y0) * FLING_SCALE;
		predict = predictPath(fling.x0, fling.y0, vx, vy, mu);
	}
	function refreshHill() {
		if (!hills || probes.length === 0) {
			hill = null;
			return;
		}
		const c = probes[probes.length - 1].jacobi;
		if (Math.abs(c - hillC) < 1e-6 && hill) return;
		hillC = c;
		hill = buildHillMask(mu, c);
	}
	function loop(ts) {
		if (!running) return;
		raf = requestAnimationFrame(loop);
		if (!last) last = ts;
		const raw = (ts - last) / 1e3;
		last = ts;
		const dt = Math.min(raw, .05);
		size = resizeCanvas(canvas, ctx);
		if (!fitted && size.w > 80) {
			fitCamera(true);
			fitted = true;
		}
		const pan = 280 * dt / cam.zoom;
		if (keys.has("KeyA") || keys.has("ArrowLeft")) cam.x -= pan;
		if (keys.has("KeyD") || keys.has("ArrowRight")) cam.x += pan;
		if (keys.has("KeyW") || keys.has("ArrowUp")) cam.y -= pan;
		if (keys.has("KeyS") || keys.has("ArrowDown")) cam.y += pan;
		if (!paused) {
			acc += dt * timeScale * .42;
			const cap = STEP * 12;
			if (acc > cap) acc = cap;
			let steps = 0;
			while (acc >= STEP && steps < 12) {
				physicsFrame(STEP);
				acc -= STEP;
				steps += 1;
			}
		} else acc = 0;
		for (let i = particles.length - 1; i >= 0; i--) {
			const p = particles[i];
			p.life -= dt / p.maxLife;
			p.x += p.vx * dt;
			p.y += p.vy * dt;
			p.vx *= .96;
			p.vy *= .96;
			if (p.life <= 0) particles.splice(i, 1);
		}
		for (let i = 0; i < probes.length; i++) if (probes[i].flash > 0) probes[i].flash = Math.max(0, probes[i].flash - dt * 2.2);
		refreshHill();
		const theta = frame === "inertial" ? simTime : 0;
		drawFrame({
			ctx,
			w: size.w,
			h: size.h,
			cam,
			mu,
			system: systemById(systemId),
			points,
			probes,
			particles,
			stars,
			fling,
			predict,
			trails,
			potential,
			hills,
			field,
			hill,
			contours,
			frame,
			theta,
			selected,
			selectedMission,
			now: ts,
			reduced
		});
		hudClock += dt;
		if (hudDirty || hudClock > .12) {
			hudClock = 0;
			emitHud();
		}
	}
	function viewPos(e) {
		const rect = canvas.getBoundingClientRect();
		return {
			x: e.clientX - rect.left,
			y: e.clientY - rect.top
		};
	}
	function pointerWorld(sx, sy) {
		if (frame !== "inertial") return screenToWorld(sx, sy, cam, size.w, size.h);
		const { cx, cy } = viewCenter(size.w, size.h);
		const camT = rotate(cam.x, cam.y, simTime);
		return rotate(camT.x + (sx - cx) / cam.zoom, camT.y + (sy - cy) / cam.zoom, -simTime);
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
		const world = pointerWorld(p.x, p.y);
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
				const before = pointerWorld(midX, midY);
				cam.zoom = clamp(cam.zoom * (dist / pinch.dist), MIN_ZOOM, MAX_ZOOM);
				const after = pointerWorld(midX, midY);
				cam.x += before.x - after.x;
				cam.y += before.y - after.y;
				cam.x -= (midX - pinch.midX) / cam.zoom;
				cam.y -= (midY - pinch.midY) / cam.zoom;
				pinch.dist = dist;
				pinch.midX = midX;
				pinch.midY = midY;
			}
			return;
		}
		if (panPointer === e.pointerId) {
			cam.x -= (p.x - panLastX) / cam.zoom;
			cam.y -= (p.y - panLastY) / cam.zoom;
			panLastX = p.x;
			panLastY = p.y;
			return;
		}
		if (fling.active && fling.pointerId === e.pointerId) {
			const world = pointerWorld(p.x, p.y);
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
			const dx = fling.x1 - fling.x0;
			const dy = fling.y1 - fling.y0;
			if (Math.hypot(dx, dy) < .012) {
				const craft = nearestCraft(fling.x0, fling.y0, 20 / cam.zoom);
				if (craft?.missionId) selectMission(craft.missionId);
				else {
					const hit = nearestPoint(fling.x0, fling.y0, 18 / cam.zoom);
					if (hit) {
						selected = hit;
						dropAt(hit, 0);
					}
				}
			} else spawnProbe(fling.x0, fling.y0, dx * FLING_SCALE, dy * FLING_SCALE);
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
		const before = pointerWorld(sx, sy);
		cam.zoom = clamp(cam.zoom * Math.exp(-e.deltaY * .0012), MIN_ZOOM, MAX_ZOOM);
		const after = pointerWorld(sx, sy);
		cam.x += before.x - after.x;
		cam.y += before.y - after.y;
	}
	function onKeyDown(e) {
		keys.add(e.code);
		if (e.code === "Space") {
			e.preventDefault();
			if (!e.repeat) {
				paused = !paused;
				hudDirty = true;
			}
			return;
		}
		if (e.repeat) return;
		const pointMap = {
			Digit1: "L1",
			Digit2: "L2",
			Digit3: "L3",
			Digit4: "L4",
			Digit5: "L5"
		};
		if (pointMap[e.code]) {
			dropAt(pointMap[e.code]);
			return;
		}
		if (e.code === "KeyR") {
			frame = frame === "rotating" ? "inertial" : "rotating";
			hudDirty = true;
			persist();
		} else if (e.code === "KeyT") {
			trails = !trails;
			hudDirty = true;
			persist();
		} else if (e.code === "KeyH") {
			hills = !hills;
			hudDirty = true;
			persist();
		} else if (e.code === "KeyP") {
			potential = !potential;
			hudDirty = true;
			persist();
		} else if (e.code === "KeyF") fitCamera(true);
		else if (e.code === "KeyK") perturbAll();
		else if (e.code === "KeyC") {
			probes = [];
			hudDirty = true;
		}
	}
	function onKeyUp(e) {
		keys.delete(e.code);
	}
	function perturbAll() {
		for (const pr of probes) {
			pr.vx += (Math.random() - .5) * .06;
			pr.vy += (Math.random() - .5) * .06;
			pr.jacobi = jacobi(pr.x, pr.y, pr.vx, pr.vy, mu);
			pr.flash = 1;
		}
		hill = null;
		audio.perturb();
		hudDirty = true;
	}
	function seedTrojans() {
		const l4 = points.L4;
		for (let i = 0; i < 9; i++) {
			const ang = Math.PI * 2 * i / 9;
			const rad = .04 + i % 3 * .018;
			spawnProbe(l4.x + Math.cos(ang) * rad, l4.y + Math.sin(ang) * rad, (Math.random() - .5) * .01, (Math.random() - .5) * .01, true);
		}
		audio.drop();
		selected = "L4";
		hudDirty = true;
	}
	function playLesson(id) {
		paused = false;
		trails = true;
		hint = false;
		hills = false;
		if (id === "trojans") {
			applySystem("sun-jupiter");
			seedTrojans();
			potential = false;
			frame = "rotating";
			selected = "L4";
			selectedMission = "lucy";
			fitCamera(true);
		} else if (id === "routh") {
			applySystem("equal");
			probes = [];
			particles.length = 0;
			dropAt("L4", .028);
			dropAt("L5", .028);
			potential = false;
			frame = "rotating";
			selected = "L4";
			selectedMission = null;
			fitCamera(true);
		} else if (id === "tadpole") {
			applySystem("earth-moon");
			probes = [];
			particles.length = 0;
			dropAt("L4", .01);
			perturbAll();
			potential = false;
			frame = "rotating";
			selected = "L4";
			selectedMission = null;
			fitCamera(true);
		} else if (id === "saddle") {
			if (systemId !== "sun-earth") applySystem("sun-earth");
			loadMission("jwst");
			potential = true;
			frame = "rotating";
		} else frame = "inertial";
		persist();
		hudDirty = true;
	}
	function applySystem(id, keepMu = false) {
		systemId = id;
		if (!keepMu) mu = systemById(id).mu;
		frame = "rotating";
		selectedMission = signatureMissions(id)[0] ?? null;
		rebuildPoints();
		seedDemo();
		fitCamera(true);
		persist();
	}
	function loadMission(id) {
		const m = missionById(id);
		if (!m) return;
		if (m.system !== systemId) {
			systemId = m.system;
			mu = systemById(m.system).mu;
			frame = "rotating";
			rebuildPoints();
			seedDemo();
		} else if (!probes.some((p) => p.missionId === m.id)) spawnMissionCraft(m.id, false);
		selected = m.point;
		selectedMission = m.id;
		hint = false;
		const pt = points[m.point];
		cam.x = pt.x;
		cam.y = pt.y;
		const span = Math.max(.1, m.amp * 14);
		const { cy } = viewCenter(size.w, size.h);
		const availH = Math.max(160, cy * 2);
		cam.zoom = clamp(.7 * Math.min(size.w / span, availH / span), MIN_ZOOM, MAX_ZOOM);
		hudDirty = true;
		persist();
	}
	const api = {
		start() {
			if (running) return;
			running = true;
			last = 0;
			raf = requestAnimationFrame(loop);
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
			audio.close();
			if (live === api) live = null;
		},
		setPaused(next) {
			paused = next;
			hudDirty = true;
		},
		setTimeScale(scale) {
			timeScale = scale;
			hudDirty = true;
			persist();
		},
		setFrame(next) {
			frame = next;
			hudDirty = true;
			persist();
		},
		setPotential(on) {
			potential = on;
			hudDirty = true;
			persist();
		},
		setHills(on) {
			hills = on;
			hudDirty = true;
			persist();
		},
		setTrails(on) {
			trails = on;
			hudDirty = true;
			persist();
		},
		setMute(on) {
			mute = on;
			audio.setMute(on);
			hudDirty = true;
			persist();
		},
		setSystem(id) {
			applySystem(id);
		},
		setMu(next) {
			mu = clampMu(next);
			rebuildPoints();
			persist();
		},
		dropAt,
		loadMission,
		selectMission,
		dropTrojans() {
			seedTrojans();
		},
		perturb: perturbAll,
		clear() {
			probes = [];
			particles.length = 0;
			selectedMission = null;
			hudDirty = true;
		},
		fit() {
			fitCamera(true);
		},
		focus: focusPoint,
		playLesson,
		snapshot
	};
	function onContext(e) {
		e.preventDefault();
	}
	canvas.addEventListener("pointerdown", onPointerDown);
	canvas.addEventListener("pointermove", onPointerMove);
	canvas.addEventListener("pointerup", endPointer);
	canvas.addEventListener("pointercancel", endPointer);
	canvas.addEventListener("wheel", onWheel, { passive: false });
	canvas.addEventListener("contextmenu", onContext);
	window.addEventListener("keydown", onKeyDown);
	window.addEventListener("keyup", onKeyUp);
	live = api;
	window.__libration = api;
	return api;
}
function clamp(n, a, b) {
	return Math.min(b, Math.max(a, n));
}
function loadSave() {
	try {
		const raw = localStorage.getItem(SAVE_KEY);
		if (!raw) return null;
		const data = JSON.parse(raw);
		if (data.version !== 1) return null;
		return data;
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
var STABILITY_TITLE = "On stability";
var STABILITY_KICKER = "Why three points fall and two can hold";
var STABILITY_LEDE = "Lagrange points are not parking spots in a gravity well. They are equilibria of the circular restricted three-body problem — places where, in a frame that rotates with the two primaries, gravity and centrifugal force cancel so a test mass can sit still.";
var STABILITY_SECTIONS = [
	{
		id: "frame",
		heading: "The rotating frame",
		paragraphs: ["In that frame the motion is ẍ − 2ẏ = ∂Ω/∂x and ÿ + 2ẋ = ∂Ω/∂y, with the effective potential Ω = ½(x² + y²) + (1−μ)/r₁ + μ/r₂.", "The 2ẏ and −2ẋ terms are Coriolis. They do no work, they do not appear in Ω, and they are the entire reason the triangular points can be stable. The five zeros of ∇Ω are L1 through L5."]
	},
	{
		id: "collinear",
		heading: "Collinear points: always saddles",
		paragraphs: [
			"L1 sits between the masses, L2 just outside the smaller one, L3 nearly opposite the secondary. All three are saddle points of Ω. Linearize and you get one hyperbolic pair — runaway along the line of syzygy — and one oscillatory pair, the in-plane Lyapunov motion.",
			"Leave a probe at rest on L1 and the slightest numerical breath sends it sliding toward one body or the other. Coriolis cannot save it: the saddle is in the potential itself. That is why nothing sits at L1 or L2.",
			"Halo, Lissajous, and near-rectilinear halo orbits live on the oscillatory center manifold around the saddle. Station-keeping fights the hyperbolic mode. For JWST that is a few metres per second per year — cheap, but not free.",
			"Geometry is the prize. Sun–Earth L1 is continuous sunlight. Sun–Earth L2 keeps Sun, Earth, and Moon in one patch of sky so a sunshade can hide all three. Earth–Moon L2 is the farside relay and the Gateway’s halo family."
		]
	},
	{
		id: "triangular",
		heading: "Triangular points: a hilltop that holds",
		paragraphs: [
			"L4 and L5 complete equilateral triangles with the two masses. They are maxima of Ω, not wells. A test mass placed there is sitting on a potential hill.",
			"Gascheau in 1843 and Routh in 1875 found the linear-stability condition: the triangular points hold if and only if μ is below the Routh limit, or equivalently 27μ(1−μ) < 1.",
			"Below that cut, the Hessian of Ω still says hill, but Coriolis couples the two planar degrees of freedom so the characteristic equation has four purely imaginary roots — two libration frequencies. A small displacement does not roll off. It traces a tadpole around the point. Larger amplitudes open into horseshoes that enclose both L4 and L5 and graze L3.",
			"Above the cut those frequencies collide, a pair goes real, and the Trojans unbind. Equal-mass twins are the worst case. You are not trapped by gravity. You are trapped by rotation."
		]
	},
	{
		id: "meanings",
		heading: "What stable actually means",
		paragraphs: [
			"Linear, or spectral, stability: eigenvalues on the imaginary axis. This is what the Routh cut decides, and what the badge at the top of the lab reports.",
			"Nonlinear: linear stability does not automatically fill a neighbourhood with nested closed orbits. In the planar problem the tadpole family exists below the limit; at large amplitude it reconnects through L3 into horseshoes. The real solar system adds other planets, so Jupiter Trojans are long-lived but not immortal, and Earth–Moon L4/L5 are only weakly protective.",
			"Practical, or controlled: collinear points are linearly unstable and still the most used real estate in deep space, because the unstable eigenvalue is slow and cheap to cancel, while the geometry is unique. Unstable is not useless."
		]
	}
];
var STABILITY_LESSONS = [
	{
		id: "trojans",
		label: "01",
		title: "Sun–Jupiter swarm",
		body: "A cloud around L4. Trails braid. Perturb: they wobble and settle. Coriolis holding a hilltop."
	},
	{
		id: "routh",
		label: "02",
		title: "Past the Routh limit",
		body: "Equal-mass twins. The badge flips. Drop L4 and it walks off. Same triangles, no trap."
	},
	{
		id: "tadpole",
		label: "03",
		title: "Earth–Moon, barely",
		body: "μ sits uncomfortably close to the limit. Tadpoles are huge and a little drunk."
	},
	{
		id: "saddle",
		label: "04",
		title: "It orbits L2",
		body: "JWST on the exterior saddle, potential on. A periodic orbit wrapped around a point that cannot hold rest."
	},
	{
		id: "inertial",
		label: "05",
		title: "Leave the rotating frame",
		body: "Stability is a statement in the rotating frame. In inertial space there is no fixed point — only a 1:1 dance."
	}
];
var JACOBI_NOTE = "The Jacobi integral C = 2Ω − v² is conserved along each probe. It is the only integral of the problem. Crossing a collinear value of Ω is the difference between being bottled in one Hill region and being allowed to transit.";
function systemStability() {
	return SYSTEMS.map((s) => ({
		id: s.id,
		label: s.label,
		mu: s.mu,
		stable: s.mu < ROUTH_MU,
		note: systemNote(s.id)
	}));
}
function systemNote(id) {
	switch (id) {
		case "sun-earth": return "Tight tadpoles. L4 and L5 almost do not move.";
		case "sun-jupiter": return "The textbook Greek and Trojan camps.";
		case "earth-moon": return "Large, sloppy tadpoles. Stable, barely.";
		case "equal": return "Far above the limit. The triangles do not hold.";
		default: return "";
	}
}
var LAYOUT_CAPTION = "L4 leads, L5 trails. L1 between the masses, L2 beyond the smaller, L3 almost opposite.";
function StabilitySheet({ open, onClose, hud, engine }) {
	const panelRef = (0, import_react.useRef)(null);
	(0, import_react.useEffect)(() => {
		if (!open) return;
		panelRef.current?.focus();
		const onKey = (e) => {
			if (e.code === "Escape") {
				e.preventDefault();
				onClose();
			}
		};
		window.addEventListener("keydown", onKey);
		return () => window.removeEventListener("keydown", onKey);
	}, [open, onClose]);
	if (!open) return null;
	const rows = systemStability();
	const play = (id) => {
		engine?.playLesson(id);
		if (window.matchMedia("(max-width: 767px)").matches) onClose();
	};
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("aside", {
		ref: panelRef,
		tabIndex: -1,
		role: "dialog",
		"aria-modal": "true",
		"aria-labelledby": "stability-title",
		className: "pointer-events-auto absolute inset-3 z-30 flex flex-col overflow-hidden rounded-xl border border-border bg-surface/95 shadow-[0_16px_60px_rgba(0,0,0,0.45)] animate-sheet outline-none md:inset-auto md:top-36 md:right-5 md:bottom-52 md:w-96",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("header", {
			className: "flex shrink-0 items-start justify-between gap-3 border-b border-border px-4 py-3 sm:px-5",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "min-w-0",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
						className: "font-mono text-xs tabular-nums tracking-wider text-muted",
						children: [
							hud.stable ? "L4 / L5 linearly stable" : "Trojans unbound",
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: "text-muted",
								children: " · μ "
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: "text-fg/80",
								children: formatMu$1(hud.mu)
							})
						]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
						id: "stability-title",
						className: "mt-1 font-display text-2xl leading-none tracking-tight text-fg text-balance",
						children: STABILITY_TITLE
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "mt-1 font-display italic text-sm text-muted",
						children: STABILITY_KICKER
					})
				]
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
				size: "icon",
				variant: "ghost",
				"aria-label": "Close stability essay",
				onClick: onClose,
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(X, { className: "size-4" })
			})]
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-4 sm:px-5",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "text-sm leading-relaxed text-fg/90 text-pretty",
					children: STABILITY_LEDE
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(RouthMeter, {
					mu: hud.mu,
					stable: hud.stable
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("figure", {
					className: "mt-4 rounded-lg border border-border bg-elevated/60 px-3 py-3",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(LayoutMap, {}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("figcaption", {
						className: "mt-2 text-xs leading-relaxed text-muted text-pretty",
						children: LAYOUT_CAPTION
					})]
				}),
				STABILITY_SECTIONS.map((section) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
					className: "mt-5",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", {
							className: "font-display text-xl leading-tight text-fg text-balance",
							children: section.heading
						}),
						section.paragraphs.map((p) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "mt-2 text-sm leading-relaxed text-fg/85 text-pretty",
							children: p
						}, p)),
						section.id === "triangular" ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
							className: "mt-3 rounded-lg border border-border bg-elevated/70 px-3 py-2 font-mono text-xs leading-relaxed text-fg/90",
							children: [
								"μ",
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("sub", { children: "R" }),
								" = ½ (1 − √69 / 9) ≈ ",
								ROUTH_MU.toFixed(5)
							]
						}) : null
					]
				}, section.id)),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
					className: "mt-5",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", {
							className: "font-display text-xl leading-tight text-fg",
							children: "The four systems"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "mt-2 text-sm leading-relaxed text-muted text-pretty",
							children: "Drag μ across the tick on the dock, or jump a preset. The badge follows the Routh cut."
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", {
							className: "mt-3 divide-y divide-border rounded-lg border border-border",
							children: rows.map((row) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", {
								className: cn("flex items-start justify-between gap-3 px-3 py-2.5", hud.system === row.id ? "bg-elevated/80" : ""),
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "min-w-0",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
										className: "text-sm text-fg",
										children: row.label
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
										className: "mt-0.5 text-xs leading-relaxed text-muted text-pretty",
										children: row.note
									})]
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
									className: "shrink-0 text-right font-mono text-xs tabular-nums text-muted",
									children: [formatMu$1(row.mu), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
										className: "mt-0.5 block text-fg/80",
										children: row.stable ? "below" : "above"
									})]
								})]
							}, row.id))
						})
					]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
					className: "mt-5",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", {
							className: "font-display text-xl leading-tight text-fg",
							children: "Watch the argument"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "mt-2 text-sm leading-relaxed text-muted text-pretty",
							children: "Each run stages the lab. On a narrow screen the essay steps aside so the canvas can speak."
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", {
							className: "mt-3 flex flex-col gap-2",
							children: STABILITY_LESSONS.map((lesson) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
								type: "button",
								onClick: () => play(lesson.id),
								className: "flex w-full items-start gap-3 rounded-lg border border-border bg-elevated/50 px-3 py-3 text-left transition-[background-color,border-color] duration-[var(--motion-quick)] ease-[var(--ease-out)] hover:border-border-strong hover:bg-elevated",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									className: "mt-0.5 font-mono text-xs tabular-nums text-muted",
									children: lesson.label
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
									className: "min-w-0",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
										className: "block text-sm text-fg",
										children: lesson.title
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
										className: "mt-1 block text-xs leading-relaxed text-muted text-pretty",
										children: lesson.body
									})]
								})]
							}) }, lesson.id))
						})
					]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "mt-5 mb-1 text-xs leading-relaxed text-muted text-pretty",
					children: JACOBI_NOTE
				})
			]
		})]
	});
}
function RouthMeter({ mu, stable }) {
	const t = Math.min(1, Math.max(0, Math.log10(mu / 1e-6) / Math.log10(5e5)));
	const r = Math.log10(ROUTH_MU / 1e-6) / Math.log10(5e5);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "mt-4",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex items-baseline justify-between gap-2 text-xs uppercase tracking-wider text-muted",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Mass ratio vs Routh" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
					className: "font-mono normal-case tabular-nums text-fg/80",
					children: stable ? "below μ_R" : "above μ_R"
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "relative mt-2 h-2 rounded-full bg-elevated",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
					className: "absolute top-1/2 z-10 size-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-muted",
					style: { left: `${r * 100}%` },
					title: "Routh limit"
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
					className: "absolute top-1/2 z-20 size-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-fg",
					style: { left: `${t * 100}%` }
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
				className: "mt-2 font-mono text-xs tabular-nums text-muted",
				children: [
					"μ ",
					formatMu$1(mu),
					" · μ_R ",
					ROUTH_MU.toFixed(5)
				]
			})
		]
	});
}
function LayoutMap() {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "grid grid-cols-5 items-center gap-y-2 font-mono text-xs text-muted",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
				className: "text-center text-fg",
				children: "L4"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
				className: "text-center",
				children: "L3"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
				className: "text-center text-fg/80",
				children: "M1"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
				className: "text-center text-fg",
				children: "L1"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
				className: "text-center text-fg/80",
				children: "M2"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
				className: "text-center",
				children: "L2"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
				className: "text-center text-fg",
				children: "L5"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {})
		]
	});
}
function formatMu$1(mu) {
	if (mu >= .1) return mu.toFixed(2);
	if (mu >= .01) return mu.toFixed(3);
	return mu.toExponential(2).replace("e", "×10^");
}
var POINTS = [
	"L1",
	"L2",
	"L3",
	"L4",
	"L5"
];
function Hud({ hud, engine }) {
	const [essay, setEssay] = (0, import_react.useState)(false);
	const sys = systemById(hud.system);
	const mission = hud.selectedMission ? missionById(hud.selectedMission) : void 0;
	const copy = hud.selected ? POINT_COPY[hud.selected] : null;
	const logMin = Math.log10(MIN_MU);
	const logMax = Math.log10(MAX_MU);
	const logVal = (Math.log10(hud.mu) - logMin) / (logMax - logMin);
	const routhT = (Math.log10(ROUTH_MU) - logMin) / (logMax - logMin);
	const showDossier = !essay && (mission || copy);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "pointer-events-none absolute inset-0 z-10 flex flex-col justify-between p-3 pt-[max(0.75rem,env(safe-area-inset-top))] pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:p-5",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("header", {
				className: "flex items-start justify-between gap-3",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "min-w-0",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "font-display text-3xl leading-none tracking-tight text-fg",
							children: "Libration"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "mt-1 max-w-xs text-xs text-muted text-pretty sm:text-sm",
							children: "Fourteen spacecraft at the five quiet points"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
							type: "button",
							className: "pointer-events-auto mt-1 min-h-11 font-display italic text-sm text-fg/85 transition-colors duration-[var(--motion-quick)] ease-[var(--ease-out)] hover:text-fg",
							onClick: () => setEssay(true),
							"aria-expanded": essay,
							"aria-controls": "stability-title",
							children: "On stability"
						}),
						hud.hint ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "mt-2 hidden max-w-md text-xs text-muted animate-hint sm:block sm:text-sm",
							children: "Collinear saddles fall. Triangular hilltops can hold. Open the essay, or pick a craft."
						}) : null
					]
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "pointer-events-auto flex flex-col items-end gap-2",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "flex items-center gap-2",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Stat, {
							label: "Fleet",
							value: String(hud.probeCount)
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Stat, {
							label: "μ",
							value: formatMu(hud.mu)
						})]
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						type: "button",
						onClick: () => setEssay(true),
						"aria-expanded": essay,
						className: cn("min-h-11 rounded-full border px-3 text-xs font-medium tracking-wide", "transition-colors duration-[var(--motion-quick)] ease-[var(--ease-out)]", hud.stable ? "border-border bg-surface/80 text-fg hover:border-border-strong" : "border-border bg-elevated/80 text-muted hover:text-fg"),
						children: hud.stable ? "L4 / L5 stable" : "Trojans unbound"
					})]
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex min-h-0 flex-1 flex-col justify-between gap-3 pt-3",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "flex items-start justify-between gap-3",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "min-w-0 max-w-full",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "pointer-events-auto flex max-w-full flex-wrap gap-1",
							children: SYSTEMS.map((s) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
								size: "sm",
								variant: hud.system === s.id ? "solid" : "ghost",
								className: "h-9 rounded-full px-3 text-xs",
								onClick: () => engine?.setSystem(s.id),
								children: s.label
							}, s.id))
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "pointer-events-auto mt-2 flex max-w-[min(100%,44rem)] gap-3 scroll-x pb-1",
							children: groupedMissions().map((g) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "flex shrink-0 items-center gap-1",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									className: "px-1 font-mono text-xs text-muted",
									children: g.point
								}), g.missions.map((m) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
									size: "sm",
									variant: hud.selectedMission === m.id ? "solid" : m.system === hud.system ? "outline" : "ghost",
									className: "h-11 shrink-0 rounded-full px-3 text-xs",
									onClick: () => engine?.loadMission(m.id),
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
										className: cn("size-1.5 rounded-full", m.status === "active" ? "bg-fg" : m.status === "en-route" ? "bg-accent" : "bg-muted"),
										"aria-hidden": true
									}), m.name]
								}, m.id))]
							}, g.point))
						})]
					}), showDossier ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("aside", {
						className: cn("pointer-events-none hidden max-w-xs rounded-xl border border-border", "bg-surface/80 p-4 shadow-[0_16px_60px_rgba(0,0,0,0.35)] md:block"),
						children: mission ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
								className: "font-mono text-xs tabular-nums tracking-wider text-muted",
								children: [
									mission.point,
									" · ",
									orbitLabel(mission.orbit),
									" · ",
									statusLabel(mission.status)
								]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "mt-1 font-display text-xl leading-tight text-fg",
								children: mission.name
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
								className: "mt-1 text-xs text-muted",
								children: [
									mission.agency,
									" · ",
									mission.years
								]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "mt-3 text-sm leading-relaxed text-fg/90 text-pretty",
								children: mission.why
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "mt-3 text-xs leading-relaxed text-muted text-pretty",
								children: mission.body
							})
						] }) : copy ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "font-mono text-xs tabular-nums tracking-wider text-muted",
								children: copy.id
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "mt-1 font-display text-xl leading-tight text-fg",
								children: copy.title
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "mt-1 text-xs text-muted",
								children: copy.seat
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "mt-3 text-sm leading-relaxed text-fg/90 text-pretty",
								children: copy.body
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "mt-3 text-xs leading-relaxed text-muted text-pretty",
								children: copy.use
							})
						] }) : null
					}) : null]
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
					className: cn("pointer-events-auto mt-auto w-full max-w-3xl shrink-0 self-start rounded-xl border border-border", "bg-surface/85 p-2.5 shadow-[0_16px_60px_rgba(0,0,0,0.35)] sm:rounded-xl sm:p-4"),
					children: [
						mission ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "mb-2 px-1 md:hidden",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
								className: "truncate text-xs text-muted",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									className: "font-mono text-fg",
									children: mission.name
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: [
									" ",
									"· ",
									mission.point,
									" · ",
									orbitLabel(mission.orbit)
								] })]
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "truncate text-xs text-muted",
								children: mission.why
							})]
						}) : copy ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
							className: "mb-2 truncate px-1 text-xs text-muted md:hidden",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: "font-mono text-fg",
								children: copy.id
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: [" · ", copy.title] })]
						}) : null,
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "flex flex-wrap items-center gap-1",
							children: [
								POINTS.map((id) => {
									const stable = (id === "L4" || id === "L5") && hud.stable;
									return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
										size: "sm",
										variant: hud.selected === id && !hud.selectedMission ? "solid" : "outline",
										className: "h-11 min-w-11 rounded-2xl px-3 font-mono text-xs",
										onClick: () => engine?.dropAt(id),
										children: [id, /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
											className: cn("size-1.5 rounded-full", stable ? "bg-fg" : "bg-muted/70"),
											"aria-hidden": true
										})]
									}, id);
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
									size: "sm",
									variant: "outline",
									className: "h-11 rounded-2xl px-3 text-xs",
									onClick: () => engine?.dropTrojans(),
									children: "Trojans"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
									size: "sm",
									variant: "outline",
									className: "hidden h-11 rounded-2xl px-3 text-xs sm:inline-flex",
									onClick: () => engine?.perturb(),
									children: "Perturb"
								})
							]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "mt-2 flex flex-col gap-2 sm:mt-3 sm:flex-row sm:items-center sm:gap-3",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
								className: "flex min-w-0 flex-1 flex-col gap-1",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
									className: "flex items-center justify-between text-xs uppercase tracking-wider text-muted",
									children: ["Mass ratio μ", /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
										type: "button",
										className: "font-mono normal-case tabular-nums text-fg/80 hover:text-fg",
										onClick: () => setEssay(true),
										children: [formatMu(hud.mu), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
											className: "hidden sm:inline",
											children: [" · μ_R ", ROUTH_MU.toFixed(4)]
										})]
									})]
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "relative",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
										className: "pointer-events-none absolute top-1/2 z-10 size-1.5 -translate-y-1/2 rounded-full bg-muted",
										style: { left: `${routhT * 100}%` },
										title: "Routh limit"
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
										type: "range",
										"aria-label": "Mass ratio",
										min: 0,
										max: 1,
										step: .002,
										value: logVal,
										onChange: (e) => {
											const t = Number(e.target.value);
											const next = 10 ** (logMin + t * (logMax - logMin));
											engine?.setMu(next);
										},
										className: "h-11 w-full cursor-pointer appearance-none bg-transparent",
										suppressHydrationWarning: true
									})]
								})]
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
								className: "hidden min-w-[11rem] flex-col gap-1 sm:flex sm:w-44",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
									className: "flex items-center justify-between text-xs uppercase tracking-wider text-muted",
									children: ["Time", /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
										className: "font-mono normal-case tabular-nums text-fg/80",
										children: formatScale(hud.timeScale)
									})]
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
									type: "range",
									"aria-label": "Time scale",
									min: .25,
									max: 6,
									step: .25,
									value: hud.timeScale,
									onChange: (e) => engine?.setTimeScale(Number(e.target.value)),
									className: "h-11 w-full cursor-pointer appearance-none bg-transparent",
									suppressHydrationWarning: true
								})]
							})]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "mt-2 flex flex-wrap items-center gap-1.5",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
									size: "icon",
									variant: "outline",
									"aria-label": hud.paused ? "Play" : "Pause",
									onClick: () => engine?.setPaused(!hud.paused),
									children: hud.paused ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Play, { className: "size-4 ml-0.5" }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Pause, { className: "size-4" })
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
									size: "icon",
									variant: hud.frame === "inertial" ? "solid" : "outline",
									"aria-label": "Toggle inertial frame",
									title: hud.frame === "rotating" ? "Rotating frame" : "Inertial frame",
									onClick: () => engine?.setFrame(hud.frame === "rotating" ? "inertial" : "rotating"),
									children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(RotateCcw, { className: "size-4" })
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
									size: "icon",
									variant: hud.potential ? "solid" : "outline",
									"aria-label": "Effective potential",
									onClick: () => engine?.setPotential(!hud.potential),
									children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Mountain, { className: "size-4" })
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
									size: "icon",
									variant: hud.hills ? "solid" : "outline",
									"aria-label": "Hill forbidden regions",
									onClick: () => engine?.setHills(!hud.hills),
									children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Waves, { className: "size-4" })
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
									variant: "outline",
									className: "sm:hidden",
									"aria-label": "Perturb probes",
									onClick: () => engine?.perturb(),
									children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Shuffle, { className: "size-4" })
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
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
									className: "ml-1 hidden font-mono text-xs tabular-nums text-muted sm:block",
									children: [
										sys.pair,
										" · ",
										formatDays(hud.simDays)
									]
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
									className: "ml-auto",
									variant: "outline",
									"aria-label": "Clear probes",
									onClick: () => engine?.clear(),
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Trash2, { className: "size-4" }), "Clear"]
								})
							]
						})
					]
				})]
			}),
			essay ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
				type: "button",
				className: "pointer-events-auto absolute inset-0 z-20 bg-bg/70 md:hidden",
				"aria-label": "Dismiss stability essay",
				onClick: () => setEssay(false)
			}) : null,
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(StabilitySheet, {
				open: essay,
				onClose: () => setEssay(false),
				hud,
				engine
			})
		]
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
function formatMu(mu) {
	if (mu >= .1) return mu.toFixed(2);
	if (mu >= .01) return mu.toFixed(3);
	return mu.toExponential(2).replace("e", "×10^");
}
function formatScale(n) {
	return `${Math.round(n * 100) / 100}×`;
}
function formatDays(n) {
	if (!Number.isFinite(n)) return "0 d";
	if (n < 1) return `${(n * 24).toFixed(1)} h`;
	if (n < 400) return `${n.toFixed(1)} d`;
	return `${(n / 365.25).toFixed(2)} yr`;
}
function orbitLabel(orbit) {
	switch (orbit) {
		case "halo": return "Halo";
		case "lissajous": return "Lissajous";
		case "tadpole": return "Tadpole";
		case "nrho": return "NRHO";
		case "flyby": return "Flyby";
	}
}
function statusLabel(status) {
	switch (status) {
		case "active": return "Active";
		case "complete": return "Complete";
		case "planned": return "Planned";
		case "en-route": return "En route";
	}
}
var INITIAL = {
	paused: false,
	timeScale: 1,
	frame: "rotating",
	potential: false,
	hills: false,
	trails: true,
	mute: false,
	system: "sun-earth",
	mu: 30034e-10,
	stable: true,
	probeCount: 10,
	selected: "L2",
	selectedMission: "jwst",
	jacobi: null,
	hint: true,
	simDays: 0
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
			"aria-label": "Lagrange point missions"
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
