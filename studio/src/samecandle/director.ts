import * as THREE from "three";
import { E, FRAMES, Lc } from "./cue";
import { HERO_X, LANE_Y, POST, type LaneId } from "./data";

// ---------------------------------------------------------------- easing
export const clamp01 = (x: number) => Math.min(1, Math.max(0, x));
export const smooth = (x: number) => {
  const t = clamp01(x);
  return t * t * t * (t * (t * 6 - 15) + 10);
};
export const expoOut = (x: number) => (x >= 1 ? 1 : 1 - Math.pow(2, -10 * clamp01(x)));
export const cubicOut = (x: number) => 1 - Math.pow(1 - clamp01(x), 3);
export const ramp = (f: number, a: number, b: number, ease = smooth) => ease((f - a) / Math.max(1, b - a));
/** 0 → 1 over [a, a+inLen], back to 0 over [b, b+outLen] */
export const pulse = (f: number, a: number, inLen: number, b: number, outLen: number) => ramp(f, a, a + inLen) * (1 - ramp(f, b, b + outLen));
export const mix = (a: number, b: number, t: number) => a + (b - a) * t;

// ---------------------------------------------------------------- camera
type V3 = [number, number, number];
type Cam = { target: V3; yaw: number; pitch: number; dist: number; fov: number };
type Key = Cam & { at: number; ease?: (x: number) => number };

const HX = HERO_X;
const yA = LANE_Y.A;
const yC = LANE_Y.C;
const k = (at: number, target: V3, yaw: number, pitch: number, dist: number, fov = 34, ease?: (x: number) => number): Key => ({ at, target, yaw, pitch, dist, fov, ease });

const KEYS: Key[] = [
  // hook: macro on the glossy body, a short push, then a violent pull-back reveals three identical candles
  k(0, [HX, 0.55, 0], 38, 8, 1.25, 30),
  k(E("pull"), [HX, 0.5, 0], 30, 6, 1.0, 30),
  k(E("reveal") + 8, [0, 0.1, 0], 7, 2, 35.5, 34, expoOut),
  k(Lc("h3", 0), [0.1, 0.1, 0], 4, 1.5, 34.6),
  k(Lc("w1", 0) - 2, [0.15, 0.1, 0], 2, 1, 34),
  // why: into the middle hero, orbit while the thesis lands
  k(Lc("w2", 0) + 6, [HX - 0.5, 0.25, 0], 24, 6, 7.4, 32),
  k(Lc("w2", 21), [HX - 0.2, 0.3, 0], -14, 8, 6.6, 32),
  k(Lc("w3", 22), [HX - 0.2, 0.2, 0], -22, 4, 9.4, 32),
  // position
  k(E("pos") + 14, [-0.9, 0, 0], -5, 2, 35.5),
  k(E("posA") + 16, [-1.7, yA + 0.3, 0], 13, 4, 16.5),
  k(E("posB") - 6, [-1.5, yA + 0.2, 0], 9, 3, 16),
  k(E("posB") + 16, [-1.8, -1.0, 0], 14, 4, 16.5),
  k(E("posC") - 6, [-1.6, -0.9, 0], 10, 3, 16),
  k(E("posC") + 16, [-1.7, yC + 0.3, 0], 13, 4, 16.5),
  k(E("vol") - 4, [-1.5, yC + 0.2, 0], 9, 3, 16),
  // volume: low angle so the bars stand up out of the glass
  k(E("vol") + 20, [0, -0.6, 0], -9, -3, 36),
  k(E("volA") - 4, [HX - 1.0, yA - 1.9, 0], 24, 5, 14.5),
  k(E("volB") - 20, [HX - 0.9, yA - 2.0, 0], 18, 4, 14),
  k(E("volB") - 4, [HX - 1.0, -1.9, 0], -22, 7, 14.5),
  k(E("volC") - 20, [HX - 0.9, -2.0, 0], -17, 6, 14),
  k(E("volC") - 4, [HX - 1.0, yC - 1.9, 0], 20, 5, 14.5),
  k(E("hold") - 4, [HX - 0.9, yC - 2.0, 0], 15, 4, 14),
  // hold: the midpoint laser, then each lane's future plays out against it
  k(E("hold") + 22, [HX + 0.2, 0.3, 0], 22, 5, 8.6, 30),
  k(E("laser") + 30, [HX + 0.5, 0.3, 0], 30, 4, 8.2, 30),
  k(E("holdA") + 10, [HX + 1.4, yA + 0.9, 0], 20, 5, 12.6),
  k(E("breakB") - 6, [HX + 1.4, yA + 1.1, 0], 15, 4, 12.4),
  k(E("breakB") + 12, [HX + 1.4, -0.5, 0], -19, 5, 12.6),
  k(E("breakC") - 6, [HX + 1.4, -0.6, 0], -14, 5, 12.4),
  k(E("breakC") + 12, [HX + 1.4, yC - 0.4, 0], 18, 5, 12.6),
  k(E("recap") - 4, [HX + 1.4, yC - 0.4, 0], 13, 4, 12.4),
  // recap: the whole board, slow orbit
  k(E("recap") + 24, [0.2, 0.1, 0], 4, 1, 35.4),
  k(E("end") - 4, [0.2, 0.1, 0], -7, 2, 34.4),
  // end: rise and pull away into the dark
  k(E("answer") + 10, [HX, 0.6, 0], -2, 9, 48, 34),
  k(FRAMES, [HX, 0.8, 0], -1, 10, 50, 34),
];

function camAt(f: number): Cam {
  let i = 0;
  while (i < KEYS.length - 1 && KEYS[i + 1].at <= f) i++;
  const a = KEYS[i];
  const b = KEYS[Math.min(KEYS.length - 1, i + 1)];
  if (b === a || f <= a.at) return a;
  const t = (b.ease ?? smooth)((f - a.at) / (b.at - a.at));
  return {
    target: [mix(a.target[0], b.target[0], t), mix(a.target[1], b.target[1], t), mix(a.target[2], b.target[2], t)],
    yaw: mix(a.yaw, b.yaw, t),
    pitch: mix(a.pitch, b.pitch, t),
    dist: Math.exp(mix(Math.log(a.dist), Math.log(b.dist), t)),
    fov: mix(a.fov, b.fov, t),
  };
}

// ---------------------------------------------------------------- state
export type Dir = {
  f: number;
  pos: THREE.Vector3;
  target: THREE.Vector3;
  fov: number;
  dof: number; // 0..1 depth-of-field amount (close shots)
  post: Record<LaneId, number>; // revealed post-hero bars (float)
  dim: Record<LaneId, number>; // lane brightness 0..1
  vol: number; // volume bars 0..1
  volHot: Record<LaneId, number>; // hero volume highlight
  baseBox: number; // A's consolidation box
  trend: number; // B's rally ribbon
  resist: number; // C's resistance band
  mid: number; // midpoint laser draw 0..1
  openLine: number; // the hero's open line
  beam: number; // light column through the three heroes
  flash: number; // bloom flash
  heroGlow: number;
  endFade: number; // whole board fade at the end
  shake: number;
};

const lanes = <T,>(a: T, b: T, c: T): Record<LaneId, T> => ({ A: a, B: b, C: c });

function postBars(f: number): Record<LaneId, number> {
  const hook = (d: number) => ramp(f, E("grow") + d, E("grow") + d + 78, cubicOut) * POST;
  const rewind = 1 - ramp(f, E("rewind"), E("rewind") + 34);
  const inHold = f >= E("hold");
  const A = inHold ? ramp(f, E("holdA"), E("holdA") + 92, clamp01) * POST : hook(0) * rewind;
  const B = inHold ? ramp(f, E("breakB"), E("breakB") + 22, cubicOut) + ramp(f, E("breakB") + 30, E("breakB") + 92, clamp01) * (POST - 1) : hook(4) * rewind;
  const C = inHold ? ramp(f, E("breakC"), E("breakC") + 84, clamp01) * POST : hook(8) * rewind;
  return lanes(A, B, C);
}

function dims(f: number): Record<LaneId, number> {
  const lo = 0.16;
  // [from, A, B, C] — values hold until the next entry; transitions take 14 frames
  const table: [number, number, number, number][] = [
    [0, 1, 1, 1],
    [Lc("w1", 0), lo, 1, lo],
    [E("pos"), 1, 1, 1],
    [E("posA"), 1, lo, lo],
    [E("posB"), lo, 1, lo],
    [E("posC"), lo, lo, 1],
    [E("vol"), 1, 1, 1],
    [E("volA") - 8, 1, lo, lo],
    [E("volB") - 8, lo, 1, lo],
    [E("volC") - 8, lo, lo, 1],
    [E("hold"), lo, 1, lo],
    [E("holdA") - 6, 1, lo, lo],
    [E("breakB") - 6, lo, 1, lo],
    [E("breakC") - 6, lo, lo, 1],
    [E("recap"), 1, 1, 1],
    [E("recA"), 1, 0.4, 0.4],
    [E("recB"), 0.4, 1, 0.4],
    [E("recC"), 0.4, 0.4, 1],
    [E("end"), 1, 1, 1],
  ];
  const out = lanes(1, 1, 1);
  (["A", "B", "C"] as LaneId[]).forEach((id, j) => {
    let v = table[0][j + 1];
    for (let i = 1; i < table.length; i++) {
      const t = ramp(f, table[i][0], table[i][0] + 14);
      v = mix(v, table[i][j + 1], t);
    }
    out[id] = v;
  });
  return out;
}

export function direct(f: number): Dir {
  const c = camAt(f);
  const yaw = (c.yaw * Math.PI) / 180;
  const pitch = (c.pitch * Math.PI) / 180;
  // hand-held breathing on close shots, scaled by how close we are
  const close = clamp01((14 - c.dist) / 12);
  const br = 0.012 * close;
  const t = new THREE.Vector3(...c.target).add(new THREE.Vector3(Math.sin(f * 0.031) * br, Math.sin(f * 0.023 + 1) * br, 0));
  const pos = new THREE.Vector3(
    t.x + c.dist * Math.cos(pitch) * Math.sin(yaw),
    t.y + c.dist * Math.sin(pitch),
    t.z + c.dist * Math.cos(pitch) * Math.cos(yaw),
  );
  const rv = E("reveal");
  return {
    f,
    pos,
    target: t,
    fov: c.fov,
    dof: clamp01((10 - c.dist) / 6),
    post: postBars(f),
    dim: dims(f),
    vol: ramp(f, E("volRise"), E("volRise") + 30) * (1 - 0.55 * ramp(f, E("hold"), E("hold") + 20)) + 0.55 * ramp(f, E("recap"), E("recap") + 20) * 1,
    volHot: lanes(pulse(f, E("volA") - 4, 10, E("volB") - 10, 14), pulse(f, E("volB") - 4, 10, E("volC") - 10, 14), pulse(f, E("volC") - 4, 10, E("hold"), 14)),
    baseBox: pulse(f, Lc("p2", 4), 16, E("posB"), 14),
    trend: pulse(f, Lc("p3", 2), 22, E("posC"), 14),
    resist: pulse(f, Lc("p4", 8), 16, E("vol"), 14),
    mid: ramp(f, E("laser") - 6, E("laser") + 22, cubicOut) * (1 - ramp(f, E("end") + 10, E("end") + 30)),
    openLine: ramp(f, Lc("c5", 3), Lc("c5", 3) + 16) * (1 - ramp(f, E("recap"), E("recap") + 20)),
    beam: Math.max(ramp(f, rv - 2, rv + 6, expoOut) * (1 - 0.7 * ramp(f, Lc("w1", 0), Lc("w1", 0) + 20)), 0.3 * ramp(f, rv, rv + 1), ramp(f, E("end"), E("end") + 30) * 0.9) * (1 - ramp(f, FRAMES - 30, FRAMES)),
    flash: pulse(f, rv - 1, 3, rv + 3, 22) + 0.5 * pulse(f, E("laser"), 4, E("laser") + 6, 20) + 0.6 * pulse(f, E("question"), 3, E("question") + 4, 26),
    heroGlow: 0.35 + 0.65 * pulse(f, rv - 2, 4, rv + 6, 40) + 0.4 * pulse(f, Lc("w2", 12), 10, Lc("w3", 0), 20),
    endFade: ramp(f, E("question") - 6, E("answer") + 40),
    shake: pulse(f, rv, 2, rv + 2, 16) * 0.05,
  };
}
