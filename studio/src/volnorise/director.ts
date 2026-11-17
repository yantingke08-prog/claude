// Camera and set presence. Pure functions of the frame, driven only by events (which follow the voice).
// Camera grammar: hold on the full chart while the question and the countdown run (a slow creep, no cuts), push in
// on the heavy candle when the voice explains it, fly to the A/B set, crane between A (top) and B (bottom) on the
// sentence that names each one, pull back to see both when a sentence compares them. No orbits, shakes or whips.
import * as THREE from "three";
import { E, FPS, HEIGHT, WIDTH, ramp } from "./cue";
import { HOOK, HOOK_H, X, cx } from "./data";

export type V3 = [number, number, number];
type Pose = { p: V3; t: V3; fov: number; d?: V3 };
/** a pose looking at t from t + off; d = slow creep per second while holding */
const P = (t: V3, off: V3, fov = 30, d: V3 = [0, 0, 0]): Pose => ({ p: [t[0] + off[0], t[1] + off[1], t[2] + off[2]], t, fov, d });

const POSES = () => {
  const hx = cx(HOOK, HOOK_H);
  return {
    hookWide: P([X.hook - 0.15, 1.15, 0], [0, 1.7, 44], 30, [0, 0, -0.05]),
    hookTense: P([X.hook - 0.1, 1.1, 0], [0, 1.6, 42.6], 30, [0, 0, -0.12]),
    hookClose: P([hx - 1.9, -0.95, 0], [0.6, 1.0, 24], 30, [-0.02, 0, -0.06]),
    abWide: P([X.ab, -2.0, 0], [0.3, 1.8, 32.5], 30, [0, 0, -0.06]),
    aFocus: P([X.ab + 0.05, 0.95, 0], [0.4, 1.4, 25], 30, [-0.02, 0, -0.06]),
    bFocus: P([X.ab + 0.05, -4.35, 0], [0.4, 1.4, 25], 30, [-0.02, 0, -0.06]),
    abLogic: P([X.ab, -2.0, 0], [0.3, 1.7, 32], 30, [0, 0, -0.05]),
    abFar: P([X.ab, -2.0, 0], [0.2, 2.2, 35], 30, [0, 0, -0.04]),
  };
};
let poseCache: ReturnType<typeof POSES> | null = null;
const poses = () => (poseCache ??= POSES());

/** [frame, pose, frames to get there] */
const keys = (): [number, Pose, number][] => {
  const q = poses();
  return [
    [0, q.hookWide, 1],
    [E("cdText"), q.hookTense, 40],
    [E("wIn"), q.hookClose, 28],
    [E("abIn"), q.abWide, 36],
    [E("posA"), q.aFocus, 20],
    [E("posB"), q.bFocus, 20],
    [E("posSum"), q.abWide, 24],
    [E("vA"), q.aFocus, 22],
    [E("vB"), q.bFocus, 20],
    [E("cA"), q.aFocus, 22],
    [E("cB"), q.bFocus, 18],
    [E("bA"), q.aFocus, 22],
    [E("bB"), q.bFocus, 18],
    [E("sIn"), q.abWide, 26],
    [E("lIn"), q.abLogic, 40],
    [E("eIn"), q.abFar, 40],
  ];
};

const lerp3 = (a: V3, b: V3, k: number): V3 => [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k];
const drifted = (q: Pose, s: number): Pose => {
  const d = q.d ?? [0, 0, 0];
  return { ...q, p: [q.p[0] + d[0] * s, q.p[1] + d[1] * s, q.p[2] + d[2] * s] };
};
const easeCam = (x: number) => {
  const t = Math.min(1, Math.max(0, x));
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
};
/** camera at frame f: eased moves between key poses, a slow linear creep while holding */
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

// ---------------------------------------------------------------- set presence (0..1)
/**
 * The two sets stand side by side, close enough that the flight is one continuous dolly: the hook chart leaves the
 * frame as the A/B charts enter it, so no frame is empty. The A/B set is never in the hook shots' field of view, and the
 * hook set fades only once the flight has carried it out of frame, so nothing of it lingers.
 */
export const presence = (f: number) => ({
  hook: 1 - ramp(f, E("abIn") + 26, 10),
  ab: 1,
});
