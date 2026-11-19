// Camera and set presence. Pure functions of the frame, driven only by events (which follow the voice).
// Camera grammar: push in = look at the fill, lateral move = compare active with passive, pull back = sum up.
// Every key sits on a word, so the camera never moves ahead of the voice; no orbits, shakes or back-and-forth.
import * as THREE from "three";
import { E, FPS, HEIGHT, WIDTH, ramp } from "./cue";
import { LAYOUT } from "./layout";
import { BOOK_Y, CHASE, CH_WALL, CH_WALL_I, LOGIC, THREE as TH, TH_PUSH, X, cx, cy, ly } from "./data";

export type V3 = [number, number, number];
type Pose = { p: V3; t: V3; fov: number; d?: V3 };
/** a pose looking at t from t + off; d = slow creep per second while holding */
const P = (t: V3, off: V3, fov = 30, d: V3 = [0, 0, 0]): Pose => ({ p: [t[0] + off[0], t[1] + off[1], t[2] + off[2]], t, fov, d });

const POSES = () => {
  // a single book: pulled back so the tower sits left of centre and the right side stays free for its labels
  const book = (x: number, dist = 24): Pose => P([x + 0.85, BOOK_Y - 0.25, 0], [1.4, 2.0, dist], 30, [-0.02, 0, -0.06]);
  const pair = (x0: number, x1: number): Pose => P([(x0 + x1) / 2 - 0.35, BOOK_Y - 0.2, 0], [0.4, 2.6, 37], 30, [0, 0, -0.08]);
  return {
    hookWide: P([X.hook - 0.9, 0.0, 0], [0.8, 1.2, 18.5], 30, [-0.02, 0, -0.08]),
    hookClose: P([X.hook - 0.5, 0.4, 0], [0.9, 1.1, 17.5], 30, [-0.03, 0, -0.06]),
    buyA: book(X.buyA),
    buyB: book(X.buyB),
    buyPair: pair(X.buyA, X.buyB),
    sellA: book(X.sellA),
    sellB: book(X.sellB),
    sellPair: pair(X.sellA, X.sellB),
    chase: P([X.chase - 0.75, 0.25, 0], [1.2, 1.8, 26], 30, [-0.03, 0, -0.06]),
    chaseWall: P([cx(CHASE, CH_WALL_I - 0.7), cy(CHASE, (CH_WALL.lo + 102.2) / 2) - 0.55, 0], [1.2, 1.4, 16], 30, [-0.03, 0, -0.05]),
    three: P([cx(TH, 5), 0.05, 0], [1.2, 1.8, 28], 30, [-0.03, 0, -0.06]),
    threePush: P([cx(TH, 4.5), cy(TH, 101.2) - 0.75, 0], [1.1, 1.4, 16], 30, [-0.03, 0, -0.05]),
    threeWide: P([cx(TH, 5.2), 0.1, 0], [1.0, 2.0, 29], 30, [-0.02, 0, -0.06]),
    absorbTop: P([X.absorb + 0.3, ly(0.4) - 0.4, 0], [1.2, 1.4, 23], 30, [-0.02, 0, -0.05]),
    absorbLow: P([X.absorb + 0.3, ly(-0.4) - 0.1, 0], [1.2, 1.4, 23], 30, [-0.02, 0, -0.05]),
    absorbWide: P([X.absorb + 0.6, BOOK_Y - 0.35, 0], [1.0, 2.0, 25], 30, [-0.02, 0, -0.06]),
    logic: P([cx(LOGIC, 3.5), -0.25, 0], [1.2, 1.8, 21], 30, [-0.02, 0, -0.04]),
    logicWide: P([cx(LOGIC, 3.6), -0.2, 0], [1.0, 2.2, 24], 30, [-0.02, 0, -0.05]),
    end: P([X.end, 0.0, 0], [0.8, 1.2, 18.5], 30, [0, 0, -0.06]),
    endFar: P([X.end, 0.2, 0], [0.6, 1.4, 21], 30, [0, 0, -0.04]),
  };
};
let poseCache: ReturnType<typeof POSES> | null = null;
const poses = () => (poseCache ??= POSES());

/** [frame, pose, frames to get there] */
const keys = (): [number, Pose, number][] => {
  const q = poses();
  return [
    [0, q.hookWide, 1],
    [E("hookYang"), q.hookClose, 24],
    [E("buyIn"), q.buyA, 24],
    [E("pBuy"), q.buyB, 20],
    [E("cmp"), q.buyPair, 22],
    [E("sellIn"), q.sellA, 24],
    [E("sPas"), q.sellB, 20],
    [E("keyIn"), q.sellPair, 22],
    [E("chaseIn"), q.chase, 24],
    [E("cBig"), q.chaseWall, 18],
    [E("threeIn"), q.three, 24],
    [E("t2"), q.threePush, 18],
    [E("t3"), q.threeWide, 20],
    [E("absIn"), q.absorbTop, 24],
    [E("abSell"), q.absorbLow, 16],
    [E("abWhere"), q.absorbWide, 20],
    [E("logicIn"), q.logic, 24],
    [E("lg4"), q.logicWide, 30],
    [E("endIn"), q.end, 24],
    [E("next"), q.endFar, 30],
  ];
};

/** frames during which the camera is travelling between two key poses (data may cross the frame edges then) */
export const moving = (f: number) => keys().some(([a, , d], i) => i > 0 && f >= a && f < a + d);
/** every key pose and the frame it settles on (for the layout check) */
export const holds = () => keys().map(([a, q, d], i) => ({ i, from: Math.round(a + d), pose: q }));
/** frames during which the camera flies from one set to the next (data is allowed to cross the zone edges then) */
export const inFlight = (f: number) =>
  keys().some(([a, , d], i) => i > 0 && ["buyIn", "sellIn", "chaseIn", "threeIn", "absIn", "logicIn", "endIn"].some((n) => E(n) === a) && f >= a && f < a + d);

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
  k.setViewOffset(WIDTH, HEIGHT, 0, LAYOUT.viewShift, WIDTH, HEIGHT);
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
 * The camera flight carries the old set out of frame while the new one slides in; the old set also fades out
 * (frames +2..+12 of the cut) so it is fully gone once the new scene is on screen; the new one fades in as it arrives.
 */
export const presence = (f: number) => {
  const seg = (a: string | null, b: string | null) => (a ? ramp(f, E(a) + 2, 12) : 1) * (b ? 1 - ramp(f, E(b) + 2, 10) : 1);
  return {
    hook: seg(null, "buyIn"),
    buy: seg("buyIn", "sellIn"),
    sell: seg("sellIn", "chaseIn"),
    chase: seg("chaseIn", "threeIn"),
    three: seg("threeIn", "absIn"),
    absorb: seg("absIn", "logicIn"),
    logic: seg("logicIn", "endIn"),
    end: seg("endIn", null),
  };
};
