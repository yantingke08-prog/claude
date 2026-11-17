// Camera and stage presence. Pure functions of the frame, driven only by events (which follow the voice).
// Camera grammar: push in = explain, lateral move = compare, pull back = summarise. No orbits, no shakes.
import * as THREE from "three";
import { E, FPS, HEIGHT, WIDTH, clamp01, ease, ramp } from "./cue";
import { A_HIGH, A_LOW, B_HIGH, HUNT, LADDER_X, SA, SB, SC, YOU_BRICK, px, py } from "./data";

export type V3 = [number, number, number];
type Pose = { p: V3; t: V3; fov: number; d?: V3 };
const P = (t: V3, off: V3, fov = 30, d: V3 = [0, 0, 0]): Pose => ({ p: [t[0] + off[0], t[1] + off[1], t[2] + off[2]], t, fov, d });

const POSES = () => {
  const hy = py(A_HIGH);
  const ly = py(A_LOW);
  const hx = px(HUNT);
  const bl = py(B_HIGH, SB);
  return {
    hookClose: P([YOU_BRICK.x - 0.2, YOU_BRICK.y + 0.05, YOU_BRICK.z], [1.7, 1.5, 4.6], 32, [-0.04, 0, -0.1]),
    hookWide: P([6.2, 1.0, -0.6], [5.4, 4.6, 19], 30, [-0.05, 0, -0.08]),
    ladder: P([LADDER_X + 2.4, -0.2, -0.3], [3.4, 3.0, 19], 30, [-0.05, 0, -0.06]),
    ladderThick: P([LADDER_X + 2.8, -0.2, -0.3], [2.6, 2.2, 15], 30, [-0.06, 0, -0.08]),
    check3: P([px(30, SB), -1.4, -0.5], [4.0, 3.6, 23], 30, [-0.05, 0, -0.06]),
    stopTune: P([px(30, SC), py(B_HIGH, SC) - 1.1, -0.5], [3.6, 2.6, 15.5], 30, [-0.05, 0, -0.05]),
    mechHigh: P([6.6, hy - 1.0, -0.6], [4.6, 3.0, 15], 30, [-0.04, 0, -0.06]),
    mechLow: P([6.6, ly + 0.3, -0.6], [4.6, 3.0, 15], 30, [-0.04, 0, -0.06]),
    mechWide: P([6.2, -0.9, -0.6], [5.6, 4.6, 33], 30, [-0.04, 0, -0.08]),
    hunt: P([hx - 0.6, hy - 0.4, -0.5], [3.6, 2.2, 12], 30, [-0.03, 0, -0.05]),
    volume: P([hx - 1.0, -2.4, -0.4], [4.6, 3.6, 35], 30, [-0.03, 0, -0.05]),
    counter: P([hx + 0.2, hy - 0.5, -0.5], [3.6, 2.2, 13], 30, [-0.03, 0, -0.05]),
    wick: P([hx, hy + 0.2, -0.2], [2.8, 1.6, 9.5], 30, [-0.03, 0, -0.04]),
    wick2: P([7.4, hy - 0.6, -0.6], [4.2, 2.8, 14.5], 30, [-0.04, 0, -0.05]),
    poll: P([5.8, -0.4, -0.6], [5.6, 4.2, 30], 30, [-0.05, 0, -0.06]),
    check: P([px(25, SB), -2.5, -0.5], [4.8, 4.2, 25], 30, [-0.04, 0, -0.06]),
    check2: P([px(28, SB), -1.5, -0.5], [4.4, 4.0, 25], 30, [-0.03, 0, -0.05]),
    stopBad: P([px(31, SB), bl - 1.1, -0.5], [3.4, 2.4, 13.5], 30, [-0.03, 0, -0.04]),
    stopGood: P([px(31, SC), bl - 1.0, -0.5], [3.4, 2.4, 13.5], 30, [-0.03, 0, -0.04]),
    core: P([px(27, SC), bl + 0.9, -0.6], [3.6, 3.0, 17], 30, [-0.04, 0, -0.07]),
    end: P([px(26, SC), bl + 0.6, -0.6], [3.0, 3.6, 27], 30, [-0.02, 0, -0.05]),
  };
};
let poseCache: ReturnType<typeof POSES> | null = null;
const poses = () => (poseCache ??= POSES());

/** [frame, pose, frames to get there]; every key sits on a word, so the camera never moves ahead of the voice */
const keys = (): [number, Pose, number][] => {
  const q = poses();
  return [
    [0, q.hookClose, 1],
    [E("reveal"), q.hookWide, 26],
    [E("liqIn"), q.ladder, 22],
    [E("liqMany"), q.ladderThick, 18],
    [E("mechIn"), q.mechHigh, 22],
    [E("loLevel"), q.mechLow, 16],
    [E("hidden"), q.mechWide, 18],
    [E("hunt"), q.hunt, 16],
    [E("volume"), q.volume, 14],
    [E("counter"), q.counter, 14],
    [E("wickTag"), q.wick, 16],
    [E("look"), q.wick2, 18],
    [E("pollIn"), q.poll, 22],
    [E("checkIn"), q.check, 24],
    [E("c2"), q.check2, 18],
    [E("c3"), q.check3, 16],
    [E("testIn"), q.check2, 16],
    [E("stopIn"), q.stopBad, 20],
    [E("goodIn"), q.stopGood, 18],
    [E("tune"), q.stopTune, 18],
    [E("coreIn"), q.core, 28],
    [E("endIn"), q.end, 34],
  ];
};

const lerp3 = (a: V3, b: V3, k: number): V3 => [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k];
const drifted = (q: Pose, s: number): Pose => {
  const d = q.d ?? [0, 0, 0];
  return { ...q, p: [q.p[0] + d[0] * s, q.p[1] + d[1] * s, q.p[2] + d[2] * s] };
};
/** camera at frame f: eased moves between key poses, a slow linear creep while holding */
export const cam = (f: number): Pose => {
  const ks = keys();
  let cur = drifted(ks[0][1], f / FPS);
  for (let k = 1; k < ks.length; k++) {
    const [a, q, d] = ks[k];
    if (f < a) break;
    const t = ease((f - a) / d);
    const nxt = drifted(q, (1.6 * Math.max(0, f - a - d)) / FPS);
    cur = { p: lerp3(cur.p, nxt.p, t), t: lerp3(cur.t, nxt.t, t), fov: cur.fov + (nxt.fov - cur.fov) * t };
  }
  return cur;
};

/** the 3D image sits this many px higher than the camera centre, leaving the lower band for the explanation strip */
export const LIFT = 170;

export const threeCam = (f: number) => {
  const c = cam(f);
  const k = new THREE.PerspectiveCamera(c.fov, WIDTH / HEIGHT, 0.1, 400);
  k.position.set(...c.p);
  k.lookAt(new THREE.Vector3(...c.t));
  k.setViewOffset(WIDTH, HEIGHT, 0, LIFT, WIDTH, HEIGHT);
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

// ---------------------------------------------------------------- stage presence (0..1)
export const stage = (f: number) => {
  const liqIn = E("liqIn");
  const mechIn = E("mechIn");
  const checkIn = E("checkIn");
  const coreIn = E("coreIn");
  // A and the ladder stand side by side, A and B far apart: the camera move carries one out and the other in,
  // and each fades only while it is off screen
  const A = f < mechIn ? 1 - ramp(f, liqIn + 14, 10) : ramp(f, mechIn, 8) * (1 - ramp(f, checkIn + 22, 10));
  const ladder = f < mechIn ? ramp(f, liqIn, 10) : 1 - ramp(f, mechIn + 16, 10);
  const B = ramp(f, checkIn, 6) * (1 - ramp(f, E("goodIn") + 22, 10));
  const C = ramp(f, E("goodIn"), 6);
  /** in the summary only the level, the stack and your stop remain */
  const bars = 1 - 0.88 * ramp(f, coreIn, 30);
  const dimEnd = 1 - 0.55 * ramp(f, E("endIn"), 30);
  return { A, ladder, B, C, bars, dimEnd };
};

/** the sweep bar: up to the level by 被触发, through the stacks to its high, held, then sold back by 对手盘 */
export const huntPath = (f: number, o: number, level: number, h: number, c: number) => {
  const a = E("hunt");
  const b = E("fire");
  const top = b + 36;
  const back = E("counter") + 6;
  const end = back + 30;
  if (f < a) return { p: o, hi: o };
  if (f < b) {
    const p = o + (level - o) * ease((f - a) / Math.max(1, b - a));
    return { p, hi: p };
  }
  if (f < top) {
    const p = level + (h - level) * ease((f - b) / (top - b));
    return { p, hi: p };
  }
  if (f < back) return { p: h, hi: h };
  return { p: h + (c - h) * ease((f - back) / (end - back)), hi: h };
};
/** frame at which the sweep reaches price p (p above the level) */
export const huntCross = (p: number, level: number, h: number) => {
  const b = E("fire");
  const k = clamp01((p - level) / (h - level));
  let lo = 0;
  let hi = 1;
  for (let i = 0; i < 24; i++) {
    const m = (lo + hi) / 2;
    if (ease(m) < k) lo = m;
    else hi = m;
  }
  return b + lo * 36;
};

export { SA, SB, SC };
