// Camera and set presence. Pure functions of the frame, driven only by events (which follow the voice).
// Every pose is FRAMED, not guessed: `frame()` places a world box (a chart and its volume panel) into a screen rect,
// so the charts always sit between the label bands and nothing on the HUD has to be drawn over a candle.
// Shots: wide on the hook chart (question + countdown + answer) → close-up of the heavy candle (why) → dolly to the
// A|B comparison, wide → close-up on A → truck right to a close-up on B → back to the wide comparison (summary) →
// crane down so the charts sit low under the rules → crane up into the dark for the ending. No orbits, shakes or whips.
import * as THREE from "three";
import { E, FPS, HEIGHT, WIDTH, ramp } from "./cue";
import { A, Bc, HOOK, HOOK_H, box, cx } from "./data";

export type V3 = [number, number, number];
type Pose = { p: V3; t: V3; fov: number; d?: V3 };
const FOV = 30;
const TAN = Math.tan(((FOV / 2) * Math.PI) / 180);
/** world units -> px at distance d (straight-on) */
const kAt = (d: number) => HEIGHT / (2 * d * TAN);

type WBox = { x0: number; x1: number; y0: number; y1: number };
type SRect = { x0: number; x1: number; y0: number; y1: number };
/**
 * camera that puts world box b into screen rect r (fitting whichever of width / height is tighter, centred).
 * yaw = small sideways offset of the camera (fraction of d), tilt = height of the camera above its target (fraction of d)
 */
const frame = (b: WBox, r: SRect, o: { yaw?: number; tilt?: number; creep?: V3; anchor?: { wx: number; sx: number } } = {}): Pose => {
  const k = Math.min((r.x1 - r.x0) / (b.x1 - b.x0), (r.y1 - r.y0) / (b.y1 - b.y0));
  const d = HEIGHT / (2 * k * TAN);
  const xc = (b.x0 + b.x1) / 2;
  const yc = (b.y0 + b.y1) / 2;
  const sx = (r.x0 + r.x1) / 2;
  const sy = (r.y0 + r.y1) / 2;
  const tx = o.anchor ? o.anchor.wx - (o.anchor.sx - WIDTH / 2) / k : xc - (sx - WIDTH / 2) / k;
  const ty = yc - (HEIGHT / 2 - sy) / k;
  const t: V3 = [tx, ty, 0];
  return { t, p: [tx + (o.yaw ?? 0) * d, ty + (o.tilt ?? 0.05) * d, d], fov: FOV, d: o.creep ?? [0, 0, -0.04] };
};
const chartBox = (ch: typeof A, pad = 0.2): WBox => {
  const b = box(ch);
  return { x0: b.x0 - pad, x1: b.x1 + pad, y0: b.vLo - 0.05, y1: b.pHi + 0.15 };
};
const join = (a: WBox, b: WBox): WBox => ({ x0: Math.min(a.x0, b.x0), x1: Math.max(a.x1, b.x1), y0: Math.min(a.y0, b.y0), y1: Math.max(a.y1, b.y1) });

/** the screen rects the charts are framed into; the HUD's label bands are what is left above and below */
export const RECT = {
  hook: { x0: 50, x1: 1390, y0: 1030, y1: 1810 },
  close: { x0: 0, x1: 1440, y0: 640, y1: 1800 },
  wide: { x0: 40, x1: 1400, y0: 990, y1: 1600 },
  one: { x0: 70, x1: 1370, y0: 630, y1: 1700 },
  sum: { x0: 40, x1: 1400, y0: 700, y1: 1310 },
  low: { x0: 60, x1: 1380, y0: 1290, y1: 1820 },
};

const POSES = () => {
  const hook = chartBox(HOOK);
  const hx = cx(HOOK, HOOK_H);
  const ab = join(chartBox(A), chartBox(Bc));
  const hookWide = frame(hook, RECT.hook, { creep: [0, 0, -0.06] });
  const end = frame(ab, RECT.wide, { tilt: -0.04 });
  return {
    hookWide,
    hookTense: frame(hook, { ...RECT.hook, x0: 36, x1: 1404, y0: 1020 }, { creep: [0, 0, -0.14] }),
    // the heavy candle left of centre, the empty space to its right is where its labels go
    hookClose: frame({ x0: hx - 2, x1: hx + 0.4, y0: HOOK.vb - 0.05, y1: hook.y1 + 0.1 }, RECT.close, { anchor: { wx: hx, sx: 720 }, yaw: 0.02, creep: [-0.02, 0, -0.05] }),
    abWide: frame(ab, RECT.wide, { creep: [0, 0, -0.06] }),
    aClose: frame(chartBox(A, 0.3), RECT.one, { yaw: -0.03, creep: [0.01, 0, -0.05] }),
    bClose: frame(chartBox(Bc, 0.3), RECT.one, { yaw: 0.03, creep: [-0.01, 0, -0.05] }),
    abSum: frame(ab, RECT.sum, { creep: [0, 0, -0.05] }),
    abLow: frame(ab, RECT.low, { tilt: 0.12, creep: [0, 0, -0.04] }),
    // up into the dark above the charts: nothing of the set stays behind the closing cards
    abUp: { ...end, t: [end.t[0], end.t[1] + 22, 0] as V3, p: [end.p[0], end.p[1] + 23, end.p[2] + 4] as V3, d: [0, 0.02, -0.03] as V3 },
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
    [E("wIn"), q.hookClose, 30],
    [E("pIn"), q.abWide, 40],
    [E("lIn"), q.aClose, 28],
    [E("gIn"), q.bClose, 30],
    [E("sIn"), q.abSum, 30],
    [E("xIn"), q.abLow, 34],
    [E("eIn"), q.abUp, 44],
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
/** px per world unit at the camera's target distance (for sizing) */
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

// ---------------------------------------------------------------- set presence (0..1)
/**
 * The two sets stand side by side, close enough that the flight is one continuous dolly: the hook chart leaves the
 * frame as the A|B charts enter it. The hook set fades only once the flight has carried it out of frame.
 */
export const presence = (f: number) => ({
  hook: 1 - ramp(f, E("pIn") + 26, 10),
  ab: ramp(f, E("pIn") - 4, 10) * (1 - ramp(f, E("eIn") + 4, 16)),
});
