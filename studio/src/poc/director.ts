// Camera and set presence. Pure functions of the frame, driven only by events (which follow the voice).
// Every pose is FRAMED: `frame()` places a world box (bars + profile + volume) into a screen rect, so charts always sit
// between the title band (top) and the captions (bottom) and nothing on the HUD is drawn over a candle.
// Shots: a slow pull back from the faint line as day one prints → the profile builds beside it → push in on the POC
// (why a magnet) → back out for the deviation → truck right to day two (migration) → crane far back over five days
// (direction) → into day three (targets) → push in on the test of the prior POC with the order book (entry) → fly to a
// separate day (not a wall, LVN) → cut back to the first line, now fully lit, for the ending.
import * as THREE from "three";
import { E, FPS, HEIGHT, WIDTH } from "./cue";
import { A, A_HOOK, B, C, C_TEST, D3, PROF_W, W, cx, cy, type Day } from "./data";

export type V3 = [number, number, number];
type Pose = { p: V3; t: V3; fov: number; d?: V3 };
const FOV = 30;
const TAN = Math.tan(((FOV / 2) * Math.PI) / 180);
const kAt = (d: number) => HEIGHT / (2 * d * TAN);

type Box = { x0: number; x1: number; y0: number; y1: number };
const frame = (b: Box, r: Box, o: { yaw?: number; tilt?: number; creep?: V3 } = {}): Pose => {
  const k = Math.min((r.x1 - r.x0) / (b.x1 - b.x0), (r.y1 - r.y0) / (b.y1 - b.y0));
  const d = HEIGHT / (2 * k * TAN);
  const xc = (b.x0 + b.x1) / 2;
  const yc = (b.y0 + b.y1) / 2;
  const sx = (r.x0 + r.x1) / 2;
  const sy = (r.y0 + r.y1) / 2;
  const tx = xc - (sx - WIDTH / 2) / k;
  const ty = yc - (HEIGHT / 2 - sy) / k;
  return { t: [tx, ty, 0], p: [tx + (o.yaw ?? 0) * d, ty + (o.tilt ?? 0.06) * d, d], fov: FOV, d: o.creep ?? [0, 0, -0.04] };
};
/** a world box over bars i0..i1 of d, prices lo..hi, optionally down to the volume floor and right over the profile */
export const dayBox = (d: Day, i0: number, i1: number, lo: number, hi: number, o: { vol?: boolean; prof?: boolean; pad?: number; right?: number } = {}): Box => ({
  x0: cx(d, i0) - (o.pad ?? 0.3),
  x1: o.prof ? d.px + PROF_W + 0.25 + (o.right ?? 0) : cx(d, i1) + (o.pad ?? 0.3) + (o.right ?? 0),
  y0: o.vol ? d.vb - 0.1 : cy(d, lo),
  y1: cy(d, hi),
});
/** a three-quarter view from the right front, looking back along a long box (so far days recede into depth) */
const angled = (b: Box): Pose => {
  const yc = (b.y0 + b.y1) / 2;
  const t: V3 = [b.x0 + (b.x1 - b.x0) * 0.5, yc + 1, 0];
  return { t, p: [b.x1 + 22, yc + 9, 88], fov: 30, d: [-0.1, 0, -0.12] };
};
const join = (a: Box, b: Box): Box => ({ x0: Math.min(a.x0, b.x0), x1: Math.max(a.x1, b.x1), y0: Math.min(a.y0, b.y0), y1: Math.max(a.y1, b.y1) });

/** the screen rects shots are framed into: titles above (y 360–760), captions below (y >= 2120) */
export const RECT = {
  // charts leave ~250 px on the right for the price-axis tags at the line ends and brick tips
  hookClose: { x0: 160, x1: 1180, y0: 900, y1: 1960 },
  wide: { x0: 60, x1: 1060, y0: 800, y1: 1980 },
  high: { x0: 60, x1: 1080, y0: 760, y1: 1990 },
  close: { x0: 50, x1: 1080, y0: 740, y1: 1960 },
  far: { x0: 60, x1: 1200, y0: 800, y1: 1900 },
  end: { x0: 90, x1: 1250, y0: 860, y1: 1980 },
};

const POSES = () => {
  const aWideHook = dayBox(A, 0, A_HOOK - 1, 4998, 5026, { vol: true, prof: true });
  const aAll = dayBox(A, 0, A.bars.length - 1, 4998, 5033, { vol: true, prof: true });
  const bBox = join(dayBox(B, 0, B.bars.length - 1, 5008, 5038, { vol: true, prof: true }), { x0: A.px - 0.2, x1: A.px, y0: B.vb, y1: B.vb });
  const fiveDays = join(dayBox(D3, 0, 0, 4996, 5056, { pad: 0.5 }), dayBox(C, 0, 13, 4996, 5056, { right: 0.4 }));
  const cBox = join(dayBox(C, 0, C.bars.length - 1, 5026, 5056, { vol: true, prof: true }), dayBox(B, B.bars.length - 6, B.bars.length - 1, 5026, 5056));
  const cDrill = dayBox(C, C_TEST - 5, C.bars.length - 1, 5026, 5052, { vol: true, prof: true });
  const wBox = dayBox(W, 0, W.bars.length - 1, 5042, 5071, { vol: true, prof: true });
  return {
    // the faint line, close and low, then a slow pull back as day one prints round it
    hookClose: frame(dayBox(A, 0, 9, 5004, 5021, { vol: true }), RECT.hookClose, { tilt: 0.03, creep: [0.02, 0, -0.06] }),
    hookWide: frame(aWideHook, RECT.wide, { creep: [0, 0, -0.04] }),
    // why: in on the POC row and the rows above it, the profile on the right
    why: frame(dayBox(A, 8, A_HOOK - 1, 5000, 5025, { prof: true }), RECT.close, { yaw: -0.02, creep: [0.02, 0, -0.05] }),
    away: frame(aAll, RECT.wide, { creep: [0, 0, -0.04] }),
    move: frame(bBox, RECT.wide, { yaw: 0.02, creep: [0, 0, -0.04] }),
    // five days at an angle along the series: the newest day near, the oldest far away, the POC staircase receding
    five: frame(fiveDays, { x0: 50, x1: 1000, y0: 820, y1: 1960 }, { yaw: 0.14, tilt: 0.08, creep: [-0.06, 0, -0.08] }),
    target: frame(cBox, RECT.wide, { creep: [0, 0, -0.04] }),
    drill: frame(cDrill, RECT.close, { yaw: -0.03, creep: [0.01, 0, -0.05] }),
    wall: frame(wBox, RECT.high, { creep: [0, 0, -0.04] }),
    end: frame(dayBox(A, 18, A.bars.length - 1, 5000, 5032, { prof: true }), RECT.end, { tilt: 0.05, creep: [0, 0, -0.08] }),
  };
};
let poseCache: ReturnType<typeof POSES> | null = null;
const poses = () => (poseCache ??= POSES());

/** [frame, pose, frames to get there]; a 1-frame move is a cut (hud.tsx dips to black round it) */
const keys = (): [number, Pose, number][] => {
  const q = poses();
  return [
    [0, q.hookClose, 1],
    [E("hLook") + 10, q.hookWide, 150],
    [E("yIn"), q.why, 36],
    [E("aIn"), q.away, 34],
    [E("mIn"), q.move, 44],
    [E("u1In"), q.five, 50],
    [E("u2In"), q.target, 44],
    [E("u3In"), q.drill, 34],
    [E("xIn"), q.wall, 1],
    [E("zIn"), q.end, 1],
  ];
};
export const CUTS = () => [E("xIn"), E("zIn")];

const lerp3 = (a: V3, b: V3, k: number): V3 => [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k];
const drifted = (q: Pose, s: number): Pose => {
  const d = q.d ?? [0, 0, 0];
  return { ...q, p: [q.p[0] + d[0] * s, q.p[1] + d[1] * s, q.p[2] + d[2] * s] };
};
const easeCam = (x: number) => {
  const t = Math.min(1, Math.max(0, x));
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
};
export const cam = (f: number): Pose => {
  const ks = keys();
  let cur = drifted(ks[0][1], f / FPS);
  for (let k = 1; k < ks.length; k++) {
    const [a, q, d] = ks[k];
    if (f < a) break;
    const t = easeCam((f - a) / d);
    const nxt = drifted(q, Math.max(0, f - a - d) / FPS);
    cur = { p: lerp3(cur.p, nxt.p, t), t: lerp3(cur.t, nxt.t, t), fov: cur.fov + (nxt.fov - cur.fov) * t };
  }
  return cur;
};
export const scaleAt = (f: number) => {
  const c = cam(f);
  return kAt(Math.hypot(c.p[0] - c.t[0], c.p[1] - c.t[1], c.p[2] - c.t[2]));
};
export const threeCam = (f: number) => {
  const c = cam(f);
  const k = new THREE.PerspectiveCamera(c.fov, WIDTH / HEIGHT, 0.1, 400);
  k.position.set(...c.p);
  k.lookAt(new THREE.Vector3(...c.t));
  k.updateMatrixWorld();
  k.updateProjectionMatrix();
  return k;
};
export type Proj = (x: number, y: number, z?: number) => { x: number; y: number };
export const projector = (f: number): Proj => {
  const k = threeCam(f);
  const v = new THREE.Vector3();
  return (x, y, z = 0) => {
    v.set(x, y, z).project(k);
    return { x: ((v.x + 1) / 2) * WIDTH, y: ((1 - v.y) / 2) * HEIGHT };
  };
};

// ---------------------------------------------------------------- what is on stage (0..1)
const ramp = (f: number, a: number, d: number) => Math.min(1, Math.max(0, (f - a) / d));
export const presence = (f: number) => {
  const atW = f >= E("xIn") && f < E("zIn");
  const atEnd = f >= E("zIn");
  return {
    A: atW ? 0 : 1,
    B: atW || atEnd ? 0 : ramp(f, E("mIn") - 6, 10),
    C: atW || atEnd ? 0 : ramp(f, E("u1In"), 14),
    ctx: atW || atEnd ? 0 : ramp(f, E("u1In") + 4, 24) * (1 - ramp(f, E("u2In") + 10, 20)),
    W: atW ? 1 : 0,
    /** volume columns: hidden in the five-day pull-back (each day keeps its own floor) */
    vol: 1 - ramp(f, E("u1In"), 14) * (1 - ramp(f, E("u2In"), 16)),
  };
};
