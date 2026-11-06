// What the film is doing on any frame: one pure function, keyed to the narration lines.
// Two places in one 3D world: the three-row comparison ("rows", far to the right) and the full
// 86-bar chart of outcome C ("main"), where the mechanism and the signals are explained.
import * as THREE from "three";
import EV from "./events.json";
import { FPS, L, Le, S, clamp01, cubicInOut, hold, pulse, smooth, span } from "./cue";
import { CHART, LEVEL, N_AFTER, U_CROSS, bx, py, type Outcome } from "./market";

// ---------------------------------------------------------------- events
type EvName = Exclude<keyof typeof EV, "_doc">;
/** frame of a named event (events.json: [line, offset]) */
export const E = (name: EvName) => {
  const [line, off] = EV[name] as [string, number];
  return L(line) + off;
};
/** piecewise-linear keyframes (u tracks must stay linear so the crossings land on their event frames) */
const lin = (f: number, ks: [number, number][]) => {
  if (f <= ks[0][0]) return ks[0][1];
  for (let i = 1; i < ks.length; i++) if (f <= ks[i][0]) return ks[i - 1][1] + (ks[i][1] - ks[i - 1][1]) * ((f - ks[i - 1][0]) / (ks[i][0] - ks[i - 1][0]));
  return ks[ks.length - 1][1];
};

// ---------------------------------------------------------------- rows (the comparison page)
export const X_ROWS = 400; // the comparison page lives far to the right of the main chart
export const ROW_I0 = -18; // first bar shown in each row
export const ROW_Y: Record<Outcome, number> = { A: 9.556, B: 2.19, C: -5.176 };
/** price → row-local y (candles sit in the upper part of each row band) */
export const ry = (p: number) => 0.75 + (p - 4996) * 0.05;
export const ROW_VOL_Y = -2.6; // volume strip baseline
export const ROW_DELTA_Y = -3.25; // delta strip zero line
export const ROW_BAND = { y0: -3.75, y1: 3.4 }; // row band, local units

// ---------------------------------------------------------------- camera
export type Shot = { pos: THREE.Vector3; target: THREE.Vector3; fov: number };
/**
 * A framing of the chart: region centre (world), visible width at the chart plane, viewing angle,
 * and sy = where the centre sits on screen (positive pushes it lower).
 */
export type View = { cx: number; cy: number; w: number; yaw: number; pitch: number; sy: number };
export const FOV = 34;
const ASPECT = 1080 / 1920;
const TAN = Math.tan(((FOV / 2) * Math.PI) / 180) * ASPECT;
const V = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);
const toShot = (v: View): Shot => {
  const target = V(v.cx, v.cy + v.sy * (v.w / ASPECT), 0);
  const dir = V(Math.sin(v.yaw) * Math.cos(v.pitch), Math.sin(v.pitch), Math.cos(v.yaw) * Math.cos(v.pitch));
  return { pos: target.clone().add(dir.multiplyScalar(v.w / 2 / TAN)), target, fov: FOV };
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
const ROWS_VIEW = view(X_ROWS + bx(-3), 0, 21.5, 0.1, 0.03, 0);
/** focus regions [bar0, bar1, price0, price1]; the HUD frames these before each push */
export const REGION = {
  prior: [-13, 2, 4984, 5018],
  close: [-1, 4, 4972, 5018],
} as const;
const V_PRIOR = view(bx(-5.5), py(5000), 13.5, 0.24, 0.1);
const V_STOPS = view(bx(0.3), py(5004), 7, 0.36, 0.12);
const V_WALL = view(bx(1), py(5009), 8, 0.42, -0.02);
const V_DELTA = view(bx(-5), py(4975), 15.5, 0.14, 0.08, 0.06);
const V_ACCEPT = view(bx(2), py(5007), 9.5, 0.5, 0.14);
const V_FALL = view(bx(1.6), py(4991), 9.5, 0.3, 0.08);
const V_CLOSE = view(bx(1.5), py(4993), 8.4, 0.26, 0.08);
const V_RETEST = view(bx(4), py(4988), 8.6, 0.3, 0.08);

const M0 = S("mechanism");
const S0 = S("signals");
const R0 = S("respond");
/** push / pull timings (frames), shared with the HUD focus frames */
export const PUSH = {
  prior: [M0 + 44, M0 + 66],
  close: [S0 + 42, S0 + 64],
} as const;

const mainView = (f: number): View => {
  const z = (a: View, b: View, f0: number, f1: number) => zoom(a, b, span(f, f0, f1, cubicInOut));
  if (f < S0 - 30) {
    let v = z(FULL, V_PRIOR, ...PUSH.prior);
    v = z(v, V_STOPS, L("m2") - 6, L("m2") + 26);
    v = z(v, V_WALL, L("m4") - 12, L("m4") + 30);
    v = z(v, V_DELTA, L("m6") - 8, L("m6") + 30);
    v = z(v, V_ACCEPT, L("m7") - 10, L("m7") + 30);
    v = z(v, V_FALL, L("m8") - 10, L("m8") + 24);
    return z(v, FULL, L("m9") - 6, L("m9") + 22);
  }
  let v = z(FULL, V_CLOSE, ...PUSH.close);
  v = z(v, V_DELTA, L("s3") - 6, L("s3") + 24);
  v = z(v, V_RETEST, L("s4") - 10, L("s4") + 18);
  return z(v, FULL, L("s5") - 6, L("s5") + 20);
};
/** the hook starts close on the shared breakout bar, then pulls back as the chart splits into three rows */
const HOOK_VIEW = view(X_ROWS + bx(-2), 0, 9, 0.16, 0.05, 0);
const rowsView = (f: number): View => {
  const k = f < M0 ? span(f, S("compare"), M0, (x) => x) : 0.6;
  const page = { ...ROWS_VIEW, w: ROWS_VIEW.w * (1.02 - 0.03 * k) };
  const close = { ...HOOK_VIEW, cy: ROW_Y.B + ry(5001), w: lerp(9, 7.6, span(f, 0, E("fork"), (x) => x)) };
  return zoom(close, page, span(f, E("fork") - 4, E("forkEnd") + 12, cubicInOut));
};

// ---------------------------------------------------------------- state
export type Dir = {
  f: number;
  t: number;
  world: "rows" | "main";
  cam: Shot;
  view: View;
  /** black dip used to change places (0 = clear) */
  dip: number;
  rows: {
    fork: number; // 0 = one big shared chart, 1 = three rows
    u0: number; // breakout bar progress in the rows
    n: number; // ending bars revealed (0..12, fractional)
    act: Record<Outcome, number>; // highlight per row
    focus: number; // 1 = dim everything that is not active
    y: Record<Outcome, number>;
    s: Record<Outcome, number>;
    op: Record<Outcome, number>;
    vol: Record<Outcome, number>;
    delta: Record<Outcome, number>;
  };
  main: { u: [number, number, number]; rest: number };
  laser: number;
  shock: { a: number; at: number; x: number };
  sparks: { at: number; origin: [number, number, number]; color: string }[];
  buyStops: { show: number; fire: number };
  sellStops: { show: number; fire: number };
  stream: number;
  wall: { show: number; hit: number };
  accept: number;
  deltaStrip: number;
  deltaLine: number;
  flash: number;
};

const OUT: Outcome[] = ["A", "B", "C"];
const rec = (fn: (o: Outcome) => number) => Object.fromEntries(OUT.map((o) => [o, fn(o)])) as Record<Outcome, number>;

export const direct = (f: number): Dir => {
  const t = f / FPS;
  const world = f < M0 || f >= R0 ? ("rows" as const) : ("main" as const);
  const dip = Math.max(1 - Math.abs(f - E("toMain")) / 14, 1 - Math.abs(f - E("toRows")) / 14, 0);

  // ---------- rows
  const fork = span(f, E("fork"), E("forkEnd"), cubicInOut);
  const u0r = lin(f, [
    [E("hookRise"), 0],
    [E("hookPierce"), U_CROSS.up0],
    [E("hookClose"), 1],
  ]);
  const n = lin(f, [
    [E("endsFrom"), 0],
    [E("endsTo"), N_AFTER],
  ]);
  const w = (a: number, b: number) => hold(f, a, b, 12);
  const act: Record<Outcome, number> = {
    A: w(L("c2") - 8, L("c3") - 4),
    B: Math.max(w(L("c3") - 8, L("c4") - 4), w(L("r2") - 6, L("r3") - 4), w(L("r4") - 6, S("close") + 4)),
    C: Math.max(w(L("c4") - 8, L("c5") - 4), w(L("c5") + 70, M0 + 20), w(L("r3") - 6, S("close") + 4)),
  };
  // dim the inactive rows while one is being explained, and everything under the closing question
  const focus = Math.max(w(L("c2") - 8, L("c5") - 4), w(L("c5") + 70, M0 + 20), w(L("r2") - 6, S("close") + 4), hold(f, L("e3") - 4, 99999, 14));
  const preY = ROW_Y.B; // the single shared chart is row B before the fork
  const y = rec((o) => lerp(preY, ROW_Y[o], fork));
  const s = rec((o) => 1 + 0.06 * act[o]);
  const op = rec((o) => (o === "B" ? 1 : clamp01(fork * 3)));
  const vol = rec((o) => act[o] * (f < M0 ? 1 : 0));
  const delta = rec((o) => (o === "C" ? act.C * (f < M0 ? 1 : 0) : 0));

  // ---------- main chart: bars 0..2 play live during the mechanism, the rest arrive with the signals
  const u0 = lin(f, [
    [E("rise0"), 0],
    [E("pierce"), U_CROSS.up0],
    [E("close0"), 1],
  ]);
  const u1 = lin(f, [
    [E("grind"), 0],
    [E("newHigh"), 0.55],
    [E("reject"), 0.55],
    [E("close1"), 1],
  ]);
  const u2 = lin(f, [
    [E("crash0"), 0],
    [E("crash"), U_CROSS.down2],
    [E("close2"), 1],
  ]);
  const rest = lin(f, [
    [E("rest"), 0],
    [E("restEnd"), N_AFTER - 2],
  ]);

  // ---------- events
  const crashes = [E("crash")];
  const lastCrash = crashes.filter((c) => f >= c).pop() ?? -999;
  const shock = { a: lastCrash > 0 && world === "main" ? pulse(f, lastCrash, 18) : 0, at: f - lastCrash, x: bx(2) };
  const hookOrigin: [number, number, number] = [X_ROWS, preY + ry(LEVEL), 0.1];
  const sparks = [
    { at: E("hookPierce"), origin: hookOrigin, color: "#ffffff" },
    { at: E("pierce"), origin: [0, py(LEVEL), 0.1] as [number, number, number], color: "#ffd27a" },
  ];
  const laser = 1 + 2.2 * Math.max(pulse(f, E("hookPierce"), 10), pulse(f, E("pierce"), 12)) + 0.6 * hold(f, L("c5"), Le("c5") + 10, 16);
  const flash = Math.max(pulse(f, E("hookPierce"), 6), 0.6 * pulse(f, E("title"), 6), 0.5 * pulse(f, E("pierce"), 7), 0.6 * pulse(f, E("crash"), 7));

  // ---------- mechanism actors (main chart)
  const buyStops = { show: hold(f, L("m2") - 6, Le("m3") + 20, 14), fire: span(f, E("pierce") - 2, E("pierce") + 40, (x) => x) };
  const stream = hold(f, E("pierce") + 10, L("m6") + 30, 16);
  const wall = { show: span(f, L("m4") - 8, L("m4") + 26, smooth) * (1 - span(f, L("m8") - 20, L("m8") + 10, smooth)), hit: stream };
  const accept = hold(f, L("m7") + 6, Le("m7") + 16, 14);
  const sellStops = { show: hold(f, L("m8") - 20, L("m9") - 10, 14), fire: span(f, E("crash") - 4, E("crash") + 60, (x) => x) };
  const deltaStrip = Math.max(hold(f, L("m6") - 4, Le("m6") + 14, 14), hold(f, L("s3") - 4, Le("s3") + 12, 14));
  const deltaLine = Math.max(hold(f, L("m6") + 70, Le("m6") + 10, 12), hold(f, L("s3") + 30, Le("s3") + 8, 12));

  // ---------- camera
  const v = world === "rows" ? rowsView(f) : mainView(f);
  let c = toShot(v);
  for (const at of crashes) {
    const k = f - at;
    if (world === "main" && k >= 0 && k < 16) {
      const a = (1 - k / 16) ** 2 * 0.01 * v.w;
      const off = V(Math.sin(k * 6.7) * a, Math.cos(k * 8.9) * a, 0);
      c = { ...c, pos: c.pos.clone().add(off), target: c.target.clone().add(off) };
    }
  }
  // handheld drift, very small, scaled to the framing
  const hh = v.w / (world === "rows" ? 30 : 9);
  c.pos.add(V(Math.sin(t * 0.41) * 0.04 * hh, Math.sin(t * 0.33 + 2) * 0.03 * hh, Math.sin(t * 0.27) * 0.03 * hh));

  return {
    f,
    t,
    world,
    cam: c,
    view: v,
    dip,
    rows: { fork, u0: u0r, n, act, focus, y, s, op, vol, delta },
    main: { u: [u0, u1, u2], rest },
    laser,
    shock,
    sparks,
    buyStops,
    sellStops,
    stream,
    wall,
    accept,
    deltaStrip,
    deltaLine,
    flash,
  };
};

export { bx };
