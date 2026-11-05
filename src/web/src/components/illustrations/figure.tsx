/**
 * Croquis-style figure built from a smooth Catmull-Rom spline through anchor points.
 * Used for the editorial hero and the measurement diagram. ViewBox: 0 0 200 480.
 */
type Pt = [number, number];

export function smooth(points: Pt[], closed = true): string {
  const p = points;
  const n = p.length;
  const get = (i: number) => p[closed ? (i + n) % n : Math.max(0, Math.min(n - 1, i))]!;
  let d = `M${p[0]![0]} ${p[0]![1]}`;
  const segs = closed ? n : n - 1;
  for (let i = 0; i < segs; i++) {
    const p0 = get(i - 1), p1 = get(i), p2 = get(i + 1), p3 = get(i + 2);
    const t = 0.5 / 3;
    const c1: Pt = [p1[0] + (p2[0] - p0[0]) * t, p1[1] + (p2[1] - p0[1]) * t];
    const c2: Pt = [p2[0] - (p3[0] - p1[0]) * t, p2[1] - (p3[1] - p1[1]) * t];
    d += ` C${c1[0].toFixed(1)} ${c1[1].toFixed(1)} ${c2[0].toFixed(1)} ${c2[1].toFixed(1)} ${p2[0]} ${p2[1]}`;
  }
  return closed ? `${d} Z` : d;
}

const mirror = (pts: Pt[]): Pt[] => pts.map(([x, y]) => [200 - x, y]);

// Right half of the body, neck → crotch (front view)
const bodyRight: Pt[] = [
  [108, 57], [109, 71], [123, 78], [139, 85], [142, 97], [136, 122], [136, 142], [131, 170], [128, 192], [132, 214],
  [135, 236], [133, 262], [126, 300], [121, 340], [122, 372], [116, 420], [113, 446], [119, 458], [104, 459], [104, 446],
  [106, 420], [104, 372], [105, 340], [104, 300], [101, 270],
];
export const BODY_PATH = smooth(([...bodyRight, [100, 272], ...mirror(bodyRight).reverse().slice(1)] as Pt[]).filter((_, i, a) => i === 0 || a[i - 1]![0] !== a[i]![0] || a[i - 1]![1] !== a[i]![1]));

const armRight: Pt[] = [[141, 92], [150, 128], [159, 184], [168, 244], [175, 266], [168, 272], [161, 249], [150, 192], [141, 146], [136, 124]];
export const ARM_R = smooth(armRight);
export const ARM_L = smooth(mirror(armRight));

export const HEAD = { cx: 100, cy: 36, rx: 18, ry: 22 };

// Garments for the editorial hero
const topRight: Pt[] = [[108, 68], [124, 76], [143, 85], [151, 112], [156, 140], [144, 146], [138, 124], [140, 170], [141, 244], [100, 248]];
export const TOP_PATH = smooth([[92, 68], [100, 76], ...topRight, ...mirror(topRight).reverse().slice(0, -1)]);
const trouserRight: Pt[] = [[135, 226], [138, 260], [133, 330], [128, 440], [105, 442], [104, 330], [101, 276]];
export const TROUSER_PATH = smooth([[100, 224], ...trouserRight, [100, 278], ...mirror(trouserRight).reverse()]);

export type FigurePoint =
  | "chest" | "shoulder" | "neck" | "sleeve" | "bicep" | "arm_length"
  | "waist" | "hip" | "thigh" | "inseam" | "outseam" | "calf";

/** Measurement overlay geometry, in figure coordinates. */
export const POINTS: Record<FigurePoint, { d: string; anchor: Pt; side: "left" | "right" }> = {
  neck: { d: "M91 66 A9 3.2 0 1 0 109 66 A9 3.2 0 1 0 91 66", anchor: [109, 66], side: "right" },
  shoulder: { d: "M60 86 L140 86", anchor: [140, 86], side: "right" },
  chest: { d: "M63 132 A37 5.5 0 1 0 137 132 A37 5.5 0 1 0 63 132", anchor: [137, 132], side: "right" },
  // Left-arm callouts are spaced ~32px apart so their two-line labels never collide.
  bicep: { d: "M49 130 A8 3 12 1 0 65 126 A8 3 12 1 0 49 130", anchor: [49, 130], side: "left" },
  sleeve: { d: "M100 72 Q122 74 141 88 L168 252", anchor: [168, 252], side: "right" },
  arm_length: { d: "M59 90 L32 252", anchor: [47, 162], side: "left" },
  waist: { d: "M72 192 A28 4.5 0 1 0 128 192 A28 4.5 0 1 0 72 192", anchor: [72, 192], side: "left" },
  hip: { d: "M65 236 A35 5 0 1 0 135 236 A35 5 0 1 0 65 236", anchor: [65, 236], side: "left" },
  thigh: { d: "M67 286 A16 3.6 0 1 0 99 286 A16 3.6 0 1 0 67 286", anchor: [67, 286], side: "left" },
  inseam: { d: "M98 276 L95 444", anchor: [95, 400], side: "left" },
  outseam: { d: "M130 196 Q137 236 133 262 L123 340 L114 446", anchor: [123, 340], side: "right" },
  calf: { d: "M104 374 A9 2.6 0 1 0 122 374 A9 2.6 0 1 0 104 374", anchor: [122, 374], side: "right" },
};
