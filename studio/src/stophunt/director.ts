// Who is on stage when, and where the camera is. Pure functions of the frame, driven only by events/lines,
// shared by the 3D world and the HUD (which projects 3D anchors with the same camera).
import * as THREE from "three";
import { E, FRAMES, FPS, HEIGHT, WIDTH, clamp01, ease, ramp } from "./cue";
import { A_HIGH, BASE, B_HIGH, HUNT, px, py } from "./data";

export type V3 = [number, number, number];
type Pose = { p: V3; t: V3; fov: number; d?: V3 };
const P = (p: V3, t: V3, fov = 30, d: V3 = [0, 0, 0]): Pose => ({ p, t, fov, d });

// series A sits around x 0..11, series B around x -6..5, the order-book ladder far right at x ≈ 42
export const LADDER_X = 15.5;
export const YOU: V3 = [px(39), py(A_HIGH) + 0.05 + 0.085, -0.45];

const POSES = () => {
  const hy = py(A_HIGH);
  return {
    hookClose: P([YOU[0] + 2.2, YOU[1] + 2.1, 5.6], [YOU[0] - 0.4, YOU[1] - 0.1, YOU[2] - 0.5], 34, [-0.05, -0.02, -0.2]),
    hookWide: P([13.5, 7.8, 21], [5.6, 0.4, -1.0], 30, [-0.06, -0.02, -0.12]),
    ladder: P([LADDER_X + 9.5, 6.5, 27], [LADDER_X + 3.0, -0.6, -0.2], 30, [-0.08, 0, -0.1]),
    mech: P([12.5, 6.5, 28], [5.2, -1.6, -1.0], 30, [-0.05, 0, -0.1]),
    hunt: P([13.4, hy + 5.2, 15.5], [7.9, hy - 0.6, -0.9], 30, [-0.05, 0, -0.08]),
    mechVol: P([13.6, 4.6, 34], [7.0, -3.1, -0.9], 30, [-0.04, 0, -0.06]),
    wick: P([13.2, hy + 4.2, 14.5], [8.4, hy - 0.7, -0.6], 30, [-0.06, 0, -0.08]),
    wick2: P([13.6, hy + 6.0, 16], [7.0, hy - 0.6, -1.1], 30, [-0.06, 0, -0.06]),
    poll: P([13.5, 7.0, 31], [5.4, -0.9, -1.0], 30, [-0.06, 0, -0.08]),
    check: P([6.5, 7.0, 24], [0.6, 0.9, -0.7], 30, [-0.05, 0, -0.08]),
    check2: P([7.2, 7.6, 23], [1.4, 1.4, -0.7], 30, [-0.04, 0, -0.06]),
    test: P([6.8, 7.2, 23], [1.0, 1.0, -0.7], 30, [-0.05, 0, -0.06]),
    stop: P([7.2, py(B_HIGH) + 5.0, 17], [1.6, py(B_HIGH) - 0.2, -0.9], 30, [-0.05, 0, -0.06]),
    core: P([10.5, 9.5, 30], [0.2, 1.6, -0.9], 30, [-0.07, 0, -0.05]),
    end: P([4, 10, 33], [-1.5, 0.8, -0.9], 32, [0.06, 0, -0.06]),
  };
};
let poseCache: ReturnType<typeof POSES> | null = null;
const poses = () => (poseCache ??= POSES());

const keys = (): [number, Pose, number][] => {
  const q = poses();
  return [
    [0, q.hookClose, 1],
    [E("reveal") - 4, q.hookWide, 56],
    [E("liqIn") - 12, q.ladder, 30],
    [E("mechIn") - 12, q.mech, 32],
    [E("hunt") - 12, q.hunt, 30],
    [E("volume") - 6, q.mechVol, 30],
    [E("wickIn"), q.wick, 30],
    [E("pileUnder") - 6, q.wick2, 36],
    [E("pollIn"), q.poll, 40],
    [E("checkIn") - 10, q.check, 36],
    [E("c2"), q.check2, 36],
    [E("testIn"), q.test, 26],
    [E("stopIn"), q.stop, 34],
    [E("coreIn"), q.core, 50],
    [E("endIn"), q.end, 64],
  ];
};

const lerp3 = (a: V3, b: V3, k: number): V3 => [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k];
const drifted = (q: Pose, s: number): Pose => {
  const d = q.d ?? [0, 0, 0];
  return { ...q, p: [q.p[0] + d[0] * s, q.p[1] + d[1] * s, q.p[2] + d[2] * s] };
};
/** camera at frame f: eased moves between key poses, and a slow linear drift while holding (never a still frame) */
export const cam = (f: number): Pose => {
  const ks = keys();
  let cur = drifted(ks[0][1], f / FPS);
  for (let k = 1; k < ks.length; k++) {
    const [a, q, d] = ks[k];
    if (f < a) break;
    const nxt = drifted(q, (f - a) / FPS);
    const t = ease((f - a) / d);
    cur = { p: lerp3(cur.p, nxt.p, t), t: lerp3(cur.t, nxt.t, t), fov: cur.fov + (nxt.fov - cur.fov) * t };
    // carry the previous pose's drift into the blend so the move starts without a jolt
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

// ---------------------------------------------------------------- stage presence (0..1) per element group
export const stage = (f: number) => {
  const liqIn = E("liqIn");
  const mechIn = E("mechIn");
  const checkIn = E("checkIn");
  const endIn = E("endIn");
  // each scene leaves completely before the next one arrives
  // (fades are short and back to back, so the frame is never empty for more than a couple of frames)
  // the outgoing scene finishes leaving just as the incoming one settles (a few frames of overlap, never an empty frame)
  // series A ↔ ladder: they sit side by side, so the camera flight carries one out of frame and the other in;
  // each fades only while it is off screen
  const seriesA = f < mechIn ? 1 - ramp(f, liqIn + 4, 8) : ramp(f, mechIn - 18, 10) * (1 - ramp(f, checkIn - 10, 10));
  const ladder = f < mechIn ? ramp(f, liqIn - 14, 10) : 1 - ramp(f, mechIn + 4, 8);
  const seriesB = ramp(f, checkIn - 7, 10);
  const dimEnd = 1 - 0.62 * ramp(f, endIn, 30);
  return { seriesA, ladder, seriesB, dimEnd };
};

/** price → frame of crossing for the hunt (used to fire cubes as price passes them) */
export const huntCross = (price: number, o: number, h: number) => {
  const a = E("hunt");
  const top = E("fire") + 16;
  const k = clamp01((price - o) / (h - o));
  // invert the in-out cubic numerically
  let lo = 0;
  let hi = 1;
  for (let i = 0; i < 24; i++) {
    const m = (lo + hi) / 2;
    if (ease(m) < k) lo = m;
    else hi = m;
  }
  return a + lo * (top - a);
};

export const TOTAL = FRAMES;
export const HUNT_X = px(HUNT);
export const PRICE = (y: number) => y / 2 + BASE;
