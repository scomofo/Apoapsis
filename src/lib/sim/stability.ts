import { ROUTH_MU } from "./cr3bp";
import { SYSTEMS } from "./systems";
import type { StabilityLessonId, SystemId } from "./types";

export type { StabilityLessonId };

export const STABILITY_TITLE = "On stability";
export const STABILITY_KICKER = "Why three points fall and two can hold";

export const STABILITY_LEDE =
  "Lagrange points are not parking spots in a gravity well. They are equilibria of the circular restricted three-body problem — places where, in a frame that rotates with the two primaries, gravity and centrifugal force cancel so a test mass can sit still.";

export const STABILITY_SECTIONS = [
  {
    id: "frame",
    heading: "The rotating frame",
    paragraphs: [
      "In that frame the motion is ẍ − 2ẏ = ∂Ω/∂x and ÿ + 2ẋ = ∂Ω/∂y, with the effective potential Ω = ½(x² + y²) + (1−μ)/r₁ + μ/r₂.",
      "The 2ẏ and −2ẋ terms are Coriolis. They do no work, they do not appear in Ω, and they are the entire reason the triangular points can be stable. The five zeros of ∇Ω are L1 through L5.",
    ],
  },
  {
    id: "collinear",
    heading: "Collinear points: always saddles",
    paragraphs: [
      "L1 sits between the masses, L2 just outside the smaller one, L3 nearly opposite the secondary. All three are saddle points of Ω. Linearize and you get one hyperbolic pair — runaway along the line of syzygy — and one oscillatory pair, the in-plane Lyapunov motion.",
      "Leave a probe at rest on L1 and the slightest numerical breath sends it sliding toward one body or the other. Coriolis cannot save it: the saddle is in the potential itself. That is why nothing sits at L1 or L2.",
      "Halo, Lissajous, and near-rectilinear halo orbits live on the oscillatory center manifold around the saddle. Station-keeping fights the hyperbolic mode. For JWST that is a few metres per second per year — cheap, but not free.",
      "Geometry is the prize. Sun–Earth L1 is continuous sunlight. Sun–Earth L2 keeps Sun, Earth, and Moon in one patch of sky so a sunshade can hide all three. Earth–Moon L2 is the farside relay and the Gateway’s halo family.",
    ],
  },
  {
    id: "triangular",
    heading: "Triangular points: a hilltop that holds",
    paragraphs: [
      "L4 and L5 complete equilateral triangles with the two masses. They are maxima of Ω, not wells. A test mass placed there is sitting on a potential hill.",
      "Gascheau in 1843 and Routh in 1875 found the linear-stability condition: the triangular points hold if and only if μ is below the Routh limit, or equivalently 27μ(1−μ) < 1.",
      "Below that cut, the Hessian of Ω still says hill, but Coriolis couples the two planar degrees of freedom so the characteristic equation has four purely imaginary roots — two libration frequencies. A small displacement does not roll off. It traces a tadpole around the point. Larger amplitudes open into horseshoes that enclose both L4 and L5 and graze L3.",
      "Above the cut those frequencies collide, a pair goes real, and the Trojans unbind. Equal-mass twins are the worst case. You are not trapped by gravity. You are trapped by rotation.",
    ],
  },
  {
    id: "meanings",
    heading: "What stable actually means",
    paragraphs: [
      "Linear, or spectral, stability: eigenvalues on the imaginary axis. This is what the Routh cut decides, and what the badge at the top of the lab reports.",
      "Nonlinear: linear stability does not automatically fill a neighbourhood with nested closed orbits. In the planar problem the tadpole family exists below the limit; at large amplitude it reconnects through L3 into horseshoes. The real solar system adds other planets, so Jupiter Trojans are long-lived but not immortal, and Earth–Moon L4/L5 are only weakly protective.",
      "Practical, or controlled: collinear points are linearly unstable and still the most used real estate in deep space, because the unstable eigenvalue is slow and cheap to cancel, while the geometry is unique. Unstable is not useless.",
    ],
  },
] as const;

export const STABILITY_LESSONS: {
  id: StabilityLessonId;
  label: string;
  title: string;
  body: string;
}[] = [
  {
    id: "trojans",
    label: "01",
    title: "Sun–Jupiter swarm",
    body: "A cloud around L4. Trails braid. Perturb: they wobble and settle. Coriolis holding a hilltop.",
  },
  {
    id: "routh",
    label: "02",
    title: "Past the Routh limit",
    body: "Equal-mass twins. The badge flips. Drop L4 and it walks off. Same triangles, no trap.",
  },
  {
    id: "tadpole",
    label: "03",
    title: "Earth–Moon, barely",
    body: "μ sits uncomfortably close to the limit. Tadpoles are huge and a little drunk.",
  },
  {
    id: "saddle",
    label: "04",
    title: "It orbits L2",
    body: "JWST on the exterior saddle, potential on. A periodic orbit wrapped around a point that cannot hold rest.",
  },
  {
    id: "inertial",
    label: "05",
    title: "Leave the rotating frame",
    body: "Stability is a statement in the rotating frame. In inertial space there is no fixed point — only a 1:1 dance.",
  },
];

export const JACOBI_NOTE =
  "The Jacobi integral C = 2Ω − v² is conserved along each probe. It is the only integral of the problem. Crossing a collinear value of Ω is the difference between being bottled in one Hill region and being allowed to transit.";

export function systemStability() {
  return SYSTEMS.map((s) => ({
    id: s.id as SystemId,
    label: s.label,
    mu: s.mu,
    stable: s.mu < ROUTH_MU,
    note: systemNote(s.id),
  }));
}

function systemNote(id: string) {
  switch (id) {
    case "sun-earth":
      return "Tight tadpoles. L4 and L5 almost do not move.";
    case "sun-jupiter":
      return "The textbook Greek and Trojan camps.";
    case "earth-moon":
      return "Large, sloppy tadpoles. Stable, barely.";
    case "equal":
      return "Far above the limit. The triangles do not hold.";
    default:
      return "";
  }
}

export const LAYOUT_CAPTION =
  "L4 leads, L5 trails. L1 between the masses, L2 beyond the smaller, L3 almost opposite.";
