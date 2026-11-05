// What the scene is doing on any frame: one pure function, keyed to the narration lines.
import * as THREE from "three";
import { FPS, L, Le, S, cubicInOut, expoIn, expoOut, hold, pulse, smooth, span, track } from "./cue";
import { CHART, FAIL_OPEN, LEVEL, bx, failPath, liveBar, py } from "./market";

export type Shot = { pos: THREE.Vector3; target: THREE.Vector3; fov: number };
export type Dir = {
  f: number;
  t: number;
  cam: Shot;
  view: View;
  bar0: { mode: "fail" | "good"; u: number; grow: number };
  outcomes: Record<"true" | "retest" | "fail", { n: number; op: number }>;
  laser: number; // glow intensity multiplier
  shock: { a: number; at: number }; // floor shockwave: amount + frames since
  sparks: { at: number }[]; // spark bursts (start frames)
  buyStops: { show: number; fire: number };
  sellStops: { show: number; fire: number };
  stream: number; // market-buy flow into the wall
  wall: { show: number; hit: number };
  accept: number;
  delta: number;
  invalid: number;
  flash: number;
};

const V = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);
const shot = (pos: THREE.Vector3, target: THREE.Vector3, fov = 38): Shot => ({ pos, target, fov });

/**
 * A framing of the chart: region centre (world), visible width at the chart plane, viewing angle,
 * and sy = where the centre sits on screen (positive pushes it lower).
 */
export type View = { cx: number; cy: number; w: number; yaw: number; pitch: number; sy: number };
export const FOV = 34;
const ASPECT = 1080 / 1920;
const TAN = Math.tan(((FOV / 2) * Math.PI) / 180) * ASPECT;
const toShot = (v: View): Shot => {
  const target = V(v.cx, v.cy + v.sy * (v.w / ASPECT), 0);
  const dir = V(Math.sin(v.yaw) * Math.cos(v.pitch), Math.sin(v.pitch), Math.cos(v.yaw) * Math.cos(v.pitch));
  return shot(target.clone().add(dir.multiplyScalar(v.w / 2 / TAN)), target, FOV);
};
const lerp = (p: number, q: number, k: number) => p + (q - p) * k;
/** zoom from a to b: width moves geometrically and the centre tracks the width, so it reads as one push into the same chart */
const zoom = (a: View, b: View, t: number): View => {
  if (t <= 0) return a;
  if (t >= 1) return b;
  const w = Math.exp(lerp(Math.log(a.w), Math.log(b.w), t));
  const u = Math.abs(b.w - a.w) < 1e-3 ? t : (w - a.w) / (b.w - a.w);
  return { cx: lerp(a.cx, b.cx, u), cy: lerp(a.cy, b.cy, u), w, yaw: lerp(a.yaw, b.yaw, t), pitch: lerp(a.pitch, b.pitch, t), sy: lerp(a.sy, b.sy, t) };
};
const view = (cx: number, cy: number, w: number, yaw = 0.28, pitch = 0.1, sy = 0.05): View => ({ cx, cy, w, yaw, pitch, sy });

export const FULL = view((CHART.x0 + CHART.x1) / 2, py(4836), (CHART.x1 - CHART.x0) * 1.08, 0.06, 0.04, 0.06);
/** focus regions [bar0, bar1, price0, price1]; the HUD frames these before each push */
export const REGION = {
  define: [-8, 7, 4958, 5032],
  prior: [-13, 1, 4984, 5014],
  close: [-3, 2, 4966, 5016],
  plan: [-3, 5, 4970, 5020],
} as const;
const V_HOOK0 = view(bx(-1.5), py(4996), 7, 0.34, 0.1, 0.02);
const V_HOOK1 = view(bx(-1.2), py(4999), 6.2, 0.3, 0.08, 0.02);
const V_HOOK2 = view(bx(-1.5), py(4991), 9.4, 0.24, 0.08, 0.02);
const V_DEF = view(bx(-0.5), py(4996), 15, 0.22, 0.08);
const V_KNOCK = view(bx(0.5), py(5000), 12.5, 0.1, 0.01);
const V_PRIOR = view(bx(-6), py(4999), 13, 0.24, 0.1);
const V_STOPS = view(0, py(5003.5), 6.8, 0.36, 0.12);
const V_WALL = view(0.1, py(5009), 7.8, 0.42, -0.02);
const V_ACCEPT = view(1.1, py(5007), 9.5, 0.5, 0.14);
const V_FALL = view(0.3, py(4990), 9, 0.3, 0.08);
const V_CLOSE = view(bx(-0.5), py(4990), 7.8, 0.26, 0.08);
const V_DELTA = view(bx(-5.5), py(5004), 13.5, 0.14, 0.08, 0.07);
const V_RETEST = view(bx(1.5), py(4989), 7.8, 0.3, 0.08);
const V_PLAN = view(bx(0.8), py(4996), 10.5, 0.28, 0.1, 0.07);
const V_END = { ...FULL, w: FULL.w * 1.12, pitch: 0.2 };

/** push / pull timings (frames), shared with the HUD focus frames */
export const PUSH = {
  hookOut: [118, 162],
  define: [245, 267],
  defineOut: [612, 636],
  prior: [682, 704],
  mechOut: [1514, 1540],
  close: [1745, 1767],
  signalsOut: [2148, 2174],
  plan: [2275, 2297],
  closeOut: [2477, 2503],
} as const;

const viewAt = (f: number): View => {
  const z = (a: View, b: View, f0: number, f1: number) => zoom(a, b, span(f, f0, f1, cubicInOut));
  const [, , m0, s0, r0, e0] = [S("hook"), S("define"), S("mechanism"), S("signals"), S("respond"), S("close")];
  if (f < m0 - 30) {
    let v = z(V_HOOK0, V_HOOK1, 0, 52);
    v = z(v, V_HOOK2, 54, 96);
    v = z(v, FULL, ...PUSH.hookOut);
    v = z(v, V_DEF, ...PUSH.define);
    v = z(v, V_KNOCK, L("d5") - 10, L("d5") + 30);
    return z(v, FULL, ...PUSH.defineOut);
  }
  if (f < s0 - 30) {
    let v = z(FULL, V_PRIOR, ...PUSH.prior);
    v = z(v, V_STOPS, 744, 778);
    v = z(v, V_WALL, L("m4") - 12, L("m4") + 30);
    v = z(v, V_ACCEPT, L("m6") - 10, L("m6") + 30);
    v = z(v, V_FALL, L("m7") - 10, L("m7") + 26);
    return z(v, FULL, ...PUSH.mechOut);
  }
  if (f < r0 - 30) {
    let v = z(FULL, V_CLOSE, ...PUSH.close);
    v = z(v, V_DELTA, L("s3") - 6, L("s3") + 24);
    v = z(v, V_RETEST, L("s4") - 10, L("s4") + 18);
    return z(v, FULL, ...PUSH.signalsOut);
  }
  let v = z(FULL, V_PLAN, ...PUSH.plan);
  v = z(v, FULL, ...PUSH.closeOut);
  return z(v, V_END, e0 + 30, e0 + 170);
};

/** progress of the live (index 0) bar through its intrabar path */
export const barU = (f: number) => {
  if (f < L("d1"))
    return track(f, [
      [0, 0.1],
      [26, 0.32, (x) => x],
      [50, 0.48, (x) => x],
      [84, 1, expoIn],
    ]);
  if (f < L("d4")) return track(f, [[L("d1"), 1], [Le("d1"), 0, cubicInOut]]); // rewind
  if (f < S("mechanism"))
    return track(f, [
      [L("d4"), 0],
      [L("d4") + 26, 0.32, (x) => x],
      [L("d4") + 44, 0.48, (x) => x],
      [L("d4") + 76, 1, expoIn],
    ]);
  if (f < S("signals"))
    return track(f, [
      [S("mechanism"), 1],
      [S("mechanism") + 28, 0, cubicInOut], // rewind for the slow-motion anatomy
      [L("m3") - 10, 0],
      [L("m3") + 20, 0.16, expoOut], // touches the wire, orders fire
      [L("m5") + 120, 0.32, (x) => x], // grinding into the sell wall
      [L("m6") + 150, 0.48, (x) => x], // stalls: nobody follows
      [L("m7") + 80, 1, expoIn], // stops cascade, back into the range
    ]);
  return 1;
};

/** the price at the tip of the live bar (for the HUD ticker) */
export const livePrice = (f: number) => failPath(barU(f));
export const liveOHLC = (f: number) => liveBar(FAIL_OPEN, failPath, barU(f));

/** first frame the live bar crosses the level after a given frame */
const crossAfter = (from: number) => {
  for (let f = from; f < from + 200; f++) if (livePrice(f) >= LEVEL && livePrice(f - 1) < LEVEL) return f;
  return from;
};
const X_HOOK = crossAfter(0);
const X_D4 = crossAfter(L("d4"));
const X_M3 = crossAfter(L("m3") - 10);
const CRASH = [84, L("d4") + 76, L("m7") + 80];

export const EVENTS = { X_HOOK, X_D4, X_M3, CRASH };

export const direct = (f: number): Dir => {
  const t = f / FPS;
  const d0 = S("define"),
    m0 = S("mechanism"),
    s0 = S("signals"),
    r0 = S("respond"),
    e0 = S("close");

  // ---------- bars ----------
  const u = barU(f);
  const good = f >= L("d2") && f < L("d4");
  const bar0 = { mode: good ? ("good" as const) : ("fail" as const), u, grow: good ? span(f, L("d2"), L("d2") + 24, expoOut) : 1 };
  const outcomes = {
    true: { n: track(f, [[L("d2") + 26, 0], [Le("d2"), 6, (x) => x]]), op: 1 - span(f, L("d3") - 6, L("d3") + 10) },
    retest: { n: track(f, [[L("d3") + 4, 0], [Le("d3"), 6, (x) => x]]), op: f < L("d3") ? 0 : 1 - span(f, L("d4") - 6, L("d4") + 10) },
    fail: {
      n: f < s0 ? track(f, [[L("d4") + 84, 0], [Le("d4") + 10, 2, (x) => x]]) : track(f, [[s0, 0], [s0 + 40, 6, (x) => x]]),
      op: f < s0 ? hold(f, L("d4") + 80, m0 + 20, 8) : 1,
    },
  };

  // ---------- events ----------
  const lastCrash = CRASH.filter((c) => f >= c).pop() ?? -999;
  const shock = { a: lastCrash > 0 ? pulse(f, lastCrash, 18) : 0, at: f - lastCrash };
  const sparks = [X_HOOK, X_D4, X_M3].map((at) => ({ at }));
  const laser = 1 + 2.2 * Math.max(pulse(f, X_HOOK, 10), pulse(f, X_D4, 10), pulse(f, X_M3, 12)) + 0.6 * hold(f, L("d5"), Le("d5") + 10, 16);
  const flash = Math.max(pulse(f, X_HOOK, 6), 0.8 * pulse(f, CRASH[0], 7), 0.5 * pulse(f, X_M3, 7), 0.6 * pulse(f, CRASH[2], 7));

  // ---------- mechanism actors ----------
  const buyStops = { show: hold(f, L("m2") - 6, Le("m3") + 20, 14), fire: span(f, X_M3 - 2, X_M3 + 40, (x) => x) };
  const stream = hold(f, X_M3 + 10, L("m6") + 40, 16);
  const wall = { show: span(f, L("m4") - 8, L("m4") + 26, smooth) * (1 - span(f, L("m7") + 40, L("m8"), smooth)), hit: stream };
  const accept = hold(f, L("m6") + 10, Le("m6") + 20, 14);
  const sellStops = { show: hold(f, L("m7") - 30, L("m8") - 10, 14), fire: span(f, L("m7") + 30, L("m7") + 96, (x) => x) };
  const delta = hold(f, L("s3") + 6, Le("s3") + 16, 14);
  const invalid = hold(f, L("r2") + 34, e0 + 10, 12);

  // ---------- camera: full chart -> focus -> push in -> annotate -> back to the full chart ----------
  const v = viewAt(f);
  let c = toShot(v);

  // impact shake on each crash
  for (const at of CRASH) {
    const k = f - at;
    if (k >= 0 && k < 16) {
      const a = (1 - k / 16) ** 2 * 0.01 * v.w;
      const off = V(Math.sin(k * 6.7) * a, Math.cos(k * 8.9) * a, 0);
      c = { ...c, pos: c.pos.clone().add(off), target: c.target.clone().add(off) };
    }
  }
  // handheld drift, very small
  const hh = v.w / 9;
  c.pos.add(V(Math.sin(t * 0.41) * 0.04 * hh, Math.sin(t * 0.33 + 2) * 0.03 * hh, Math.sin(t * 0.27) * 0.03 * hh));

  return { f, t, cam: c, view: v, bar0, outcomes, laser, shock, sparks, buyStops, sellStops, stream, wall, accept, delta, invalid, flash };
};

export { bx };
