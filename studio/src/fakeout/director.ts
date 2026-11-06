// What the film is doing on any frame: one pure function, keyed to the narration lines.
// Three places in one 3D world:
//   "story" (far right): one tall chart. The hook builds it bar by bar, splits it into three stacked
//          full charts (one per ending) from the shared breakout bar, and each ending then gets the
//          full screen on its own.
//   "main"  (origin): the full 86-bar chart of ending C, where the mechanism and signals are explained.
//   "rows"  (middle): the three-row comparison used to respond, and the closing collapse.
import * as THREE from "three";
import EV from "./events.json";
import { FPS, L, Le, S, cubicInOut, hold, pulse, smooth, span } from "./cue";
import { CHART, LEVEL, N_AFTER, U_CROSS, bar, bx, py, type Outcome } from "./market";

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

// ---------------------------------------------------------------- story chart
export const X_ST = 800;
export const ST_I0 = -33; // first bar of the story chart
const ST_N = -ST_I0; // bars before the breakout
/** price → story-local y (taller than the main chart so a single ending fills the portrait frame) */
export const sy = (p: number) => (p - LEVEL) * 0.2;
/** story volume strip: baseline, max height, first bar shown */
export const ST_VOL = { y: sy(4938), h: 2.6, i0: -21 };
export const stX = (i: number) => X_ST + bx(i);
/**
 * The fork: the one chart splits into three full charts stacked on the same price scale, one per
 * ending. Panel o maps a price to story-local y; split 0 is the single chart, 1 the stacked panel.
 */
export const TRI = { mid: 4996, k: 0.09, gap: 12, y0: sy(4972), lo: 4945, hi: 5047 };
const TRI_OFF: Record<Outcome, number> = { A: 1, B: 0, C: -1 };
export const panelY = (o: Outcome, p: number, split: number) => sy(p) + (TRI.y0 + TRI_OFF[o] * TRI.gap + (p - TRI.mid) * TRI.k - sy(p)) * split;

// ---------------------------------------------------------------- rows (the comparison page)
export const X_ROWS = 400;
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

// ---- main chart (ending C in full)
export const FULL = view((CHART.x0 + CHART.x1) / 2, py(4836), (CHART.x1 - CHART.x0) * 1.08, 0.06, 0.04, 0.06);
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
  prior: [M0 + 86, M0 + 114],
  close: [S0 + 42, S0 + 70],
} as const;

const mainView = (f: number): View => {
  const z = (a: View, b: View, f0: number, f1: number) => zoom(a, b, span(f, f0, f1, cubicInOut));
  if (f < S0 - 30) {
    let v = z(FULL, V_PRIOR, ...PUSH.prior);
    v = z(v, V_STOPS, L("m2") - 12, L("m2") + 32);
    v = z(v, V_WALL, L("m4") - 18, L("m4") + 34);
    v = z(v, V_DELTA, L("m6") - 14, L("m6") + 36);
    v = z(v, V_ACCEPT, L("m7") - 16, L("m7") + 34);
    v = z(v, V_FALL, L("m8") - 16, L("m8") + 30);
    return z(v, FULL, L("m9") - 12, L("m9") + 30);
  }
  let v = z(FULL, V_CLOSE, ...PUSH.close);
  v = z(v, V_DELTA, L("s3") - 12, L("s3") + 30);
  v = z(v, V_RETEST, L("s4") - 16, L("s4") + 24);
  return z(v, FULL, L("s5") - 12, L("s5") + 26);
};

// ---- story chart
/** bars of the story chart revealed by frame f (0..33, fractional); the cadence accelerates */
export const revealN = (f: number) => {
  const t = span(f, E("revealFrom"), E("revealTo"), (x) => x);
  return ST_N * (0.5 * t + 0.5 * t * t);
};
const closeAt = (x: number) => {
  const k = Math.max(0, Math.min(ST_N - 1, x));
  const i = Math.floor(k);
  const a = bar("C", ST_I0 + i).c;
  const b = bar("C", ST_I0 + Math.min(ST_N - 1, i + 1)).c;
  return a + (b - a) * (k - i);
};
/** the price the tracking camera follows: a trailing average of the newest closes */
const trailPrice = (n: number) => {
  let s = 0;
  for (let j = 0; j < 12; j++) s += closeAt(n - 1 - (j / 11) * 6);
  return s / 12;
};
const trackView = (f: number): View => {
  const n = revealN(f);
  const k = n / ST_N;
  return view(stX(ST_I0 + n - 1.4), sy(trailPrice(n)), lerp(9.5, 7, smooth(k)), lerp(0.5, 0.2, k), lerp(0.14, 0.05, k), 0);
};
const RISE = view(stX(-1.4), sy(5001), 6.4, 0.2, 0.05, 0.02);
export const WIDE = view(stX(-9), TRI.y0, 36, 0.08, 0.03, -0.068);
const SOLO: Record<Outcome, View> = {
  A: view(stX(-1.4), sy(4986), 25, 0.2, 0.06, 0),
  B: view(stX(-1.4), sy(4982), 25, -0.14, 0.06, 0),
  C: view(stX(-1.4), sy(4977), 25, 0.26, 0.06, 0),
};
/** solo starts / ends (frames): each ending holds the screen until the next one takes over */
const soloSpan = (o: Outcome): [number, number] => (o === "A" ? [E("soloA"), E("swapB")] : o === "B" ? [E("swapB"), E("swapC")] : [E("swapC"), M0]);
const soloView = (o: Outcome, f: number): View => {
  const [a, b] = soloSpan(o);
  return { ...SOLO[o], w: SOLO[o].w * (1 - 0.04 * span(f, a, b, (x) => x)) };
};
const storyView = (f: number): View => {
  let v = trackView(f);
  v = zoom(v, RISE, span(f, E("revealTo") - 14, E("hookPierce") - 4, smooth));
  v = zoom(v, { ...WIDE, w: WIDE.w * (1 - 0.05 * span(f, E("pullTo"), E("soloA"), (x) => x)) }, span(f, E("pullFrom"), E("pullTo"), cubicInOut));
  v = zoom(v, soloView("A", f), span(f, E("soloA") - 4, E("soloA") + 34, cubicInOut));
  v = zoom(v, soloView("B", f), span(f, E("swapB") + 2, E("swapB") + 40, cubicInOut));
  return zoom(v, soloView("C", f), span(f, E("swapC") + 2, E("swapC") + 40, cubicInOut));
};

// ---- rows
const ROWS_VIEW = view(X_ROWS + bx(-3), 0, 21.5, 0.1, 0.03, 0);
const FIN1 = view(X_ROWS + bx(0.5), ROW_Y.B + ry(5004), 11.5, 0.16, 0.05, 0);
const FIN2 = view(X_ROWS + bx(-3), ROW_Y.B + ry(5000), 19, 0.03, 0.02, 0.03);
const rowsView = (f: number): View => {
  const base = { ...ROWS_VIEW, w: ROWS_VIEW.w * (1 - 0.025 * span(f, R0, S("close"), (x) => x)) };
  const v = zoom(base, FIN1, span(f, E("merge0"), E("glow") + 6, cubicInOut));
  return zoom(v, FIN2, span(f, E("collapse0"), E("question") + 40, cubicInOut));
};

// ---------------------------------------------------------------- state
export type Dir = {
  f: number;
  t: number;
  world: "story" | "main" | "rows";
  cam: Shot;
  view: View;
  /** black dip used to change places (0 = clear) */
  dip: number;
  /** depth-of-field amount (hook only) */
  dof: number;
  story: {
    point: number; // the glowing point the film opens on
    n: number; // bars before the breakout revealed (0..33, fractional)
    u0: number; // breakout bar progress
    ends: Record<Outcome, number>; // ending bars shown per outcome (0..12)
    split: Record<Outcome, number>; // 0 = the single chart, 1 = its own stacked panel
    op: Record<Outcome, number>; // panel opacity
    tri: number; // the stacked page's labels / frames
    vol: number;
    solo: Record<Outcome, number>; // which ending owns the screen
  };
  rows: {
    n: number; // ending bars shown (0..12; rewinds in the finale)
    act: Record<Outcome, number>; // highlight per row
    focus: number; // 1 = dim everything that is not active
    y: Record<Outcome, number>;
    s: Record<Outcome, number>;
    op: Record<Outcome, number>;
    vol: Record<Outcome, number>;
    merge: number; // finale: rows slide together
    fade: number; // finale: candles dissolve, only the level remains
    trail: number; // finale light trails (0..12)
    collapse: number; // finale: trails fold onto the level
    chrome: number; // row labels / frames
  };
  main: { u: [number, number, number]; rest: number };
  laser: number;
  shock: { a: number; at: number; x: number; y: number };
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
  const world = f < M0 ? ("story" as const) : f < R0 ? ("main" as const) : ("rows" as const);
  const dip = Math.max(1 - Math.abs(f - E("toMain")) / 14, 1 - Math.abs(f - E("toRows")) / 14, 0);

  // ---------- story
  const n = revealN(f);
  const u0s = lin(f, [
    [E("hookRise"), 0],
    [E("hookPierce"), U_CROSS.up0],
    [E("hookClose"), 1],
  ]);
  const [sa, sb, sc] = [E("soloA"), E("swapB"), E("swapC")];
  // the fork: all three endings grow at once, each in its own panel; A's panel then becomes A's solo,
  // B and C step aside and come back later as the solo chart's next ending
  const fan = lin(f, [
    [E("fanFrom"), 0],
    [E("fanTo"), N_AFTER],
  ]);
  const ends: Record<Outcome, number> = {
    A: lin(f, [
      [E("fanFrom"), 0],
      [E("fanTo"), N_AFTER],
      [sb, N_AFTER],
      [sb + 18, 0],
    ]),
    B: f < sb ? fan : lin(f, [
      [sb + 14, 0],
      [sb + 46, N_AFTER],
      [sc, N_AFTER],
      [sc + 18, 0],
    ]),
    C: f < sc ? fan : lin(f, [
      [sc + 14, 0],
      [sc + 46, N_AFTER],
    ]),
  };
  const splitIn = span(f, E("splitFrom"), E("splitTo"), cubicInOut);
  const leave = span(f, sa - 4, sa + 18, smooth); // B and C step aside
  const split: Record<Outcome, number> = {
    A: splitIn * (1 - span(f, sa - 4, sa + 26, cubicInOut)),
    B: f < sb ? splitIn : 0,
    C: f < sc ? splitIn : 0,
  };
  const enter = span(f, E("splitFrom") + 4, E("splitFrom") + 12, smooth);
  const pop: Record<Outcome, number> = { A: 1, B: f < sb ? enter * (1 - leave) : 1, C: f < sc ? enter * (1 - leave) : 1 };
  const solo: Record<Outcome, number> = { A: hold(f, sa + 10, sb + 8, 12), B: hold(f, sb + 8, sc + 8, 12), C: hold(f, sc + 8, M0 + 20, 12) };
  const story = {
    point: span(f, 0, 10, smooth) * (1 - span(f, E("revealFrom"), E("revealFrom") + 8, smooth)) + 0.25 * pulse(f, E("revealFrom"), 6),
    n,
    u0: u0s,
    ends,
    split,
    op: pop,
    tri: span(f, E("splitTo") - 6, E("splitTo") + 8, smooth) * (1 - leave),
    // volume matters for A and B; C is read from the candles alone
    vol: span(f, sa + 26, sa + 46, smooth) * (1 - span(f, sc, sc + 14, smooth)),
    solo,
  };

  // ---------- rows: respond, then the closing collapse
  const w = (a: number, b: number) => hold(f, a, b, 12);
  const act: Record<Outcome, number> = {
    A: 0,
    B: Math.max(w(L("r2") - 6, L("r3") - 4), w(L("r4") - 6, Le("r4") + 30)),
    C: w(L("r3") - 6, L("r4") - 4),
  };
  // r0 dims everything under the question; r2..r4 dim whatever is not being explained
  // and in the close the whole page steps back a little so the verdicts read over it
  const focus = Math.max(w(R0, L("r1") - 2), w(L("r2") - 6, Le("r4") + 30), 0.55 * w(L("e1") - 4, E("rewind0") + 4));
  const merge = span(f, E("merge0"), E("merge1"), cubicInOut);
  const rewind = span(f, E("rewind0"), E("rewind1"), cubicInOut);
  const collapse = span(f, E("collapse0"), E("collapse1"), cubicInOut);
  const y = rec((o) => lerp(ROW_Y[o], ROW_Y.B, merge));
  const s = rec((o) => 1 + 0.06 * act[o]);
  // the outer rows slide onto B, then hand over to it (identical bars would z-fight)
  const op = rec((o) => (o === "B" ? 1 : 1 - span(f, E("merge1") - 6, E("merge1"), smooth)));
  const vol = rec((o) => act[o]);

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
  const hp = E("hookPierce");
  const shock =
    world === "story"
      ? { a: f >= hp ? pulse(f, hp, 16) : 0, at: f - hp, x: stX(0), y: sy(LEVEL) }
      : { a: f >= E("crash") && world === "main" ? pulse(f, E("crash"), 18) : 0, at: f - E("crash"), x: bx(2), y: py(LEVEL) };
  const sparks = [
    { at: hp, origin: [stX(0), sy(LEVEL), 0.1] as [number, number, number], color: "#ffffff" },
    { at: E("pierce"), origin: [0, py(LEVEL), 0.1] as [number, number, number], color: "#ffd27a" },
  ];
  const laser = 1 + 2.2 * Math.max(pulse(f, hp, 10), pulse(f, E("pierce"), 12)) + 0.6 * hold(f, L("c5"), Le("c5") + 10, 16) + 1.8 * collapse;
  const flash = Math.max(pulse(f, hp, 7), 0.5 * pulse(f, E("pierce"), 7), 0.6 * pulse(f, E("crash"), 7), 0.8 * pulse(f, E("glow"), 9), 0.45 * pulse(f, E("collapse1"), 8));

  // ---------- mechanism actors (main chart)
  const buyStops = { show: hold(f, L("m2") - 6, Le("m3") + 20, 14), fire: span(f, E("pierce") - 2, E("pierce") + 40, (x) => x) };
  const stream = hold(f, E("pierce") + 10, L("m6") + 30, 16);
  const wall = { show: span(f, L("m4") - 8, L("m4") + 26, smooth) * (1 - span(f, L("m8") - 20, L("m8") + 10, smooth)), hit: stream };
  const accept = hold(f, L("m7") + 6, Le("m7") + 16, 14);
  const sellStops = { show: hold(f, L("m8") - 20, L("m9") - 10, 14), fire: span(f, E("crash") - 4, E("crash") + 60, (x) => x) };
  const deltaStrip = Math.max(hold(f, L("m6") - 4, Le("m6") + 14, 14), hold(f, L("s3") - 4, Le("s3") + 12, 14));
  const deltaLine = Math.max(hold(f, L("m6") + 70, Le("m6") + 10, 12), hold(f, L("s3") + 30, Le("s3") + 8, 12));

  // ---------- camera
  const v = world === "story" ? storyView(f) : world === "rows" ? rowsView(f) : mainView(f);
  let c = toShot(v);
  const shake = (at: number, dur: number, amp: number) => {
    const k = f - at;
    if (k < 0 || k >= dur) return;
    const a = (1 - k / dur) ** 2 * amp * v.w;
    const off = V(Math.sin(k * 6.7) * a, Math.cos(k * 8.9) * a, 0);
    c = { ...c, pos: c.pos.clone().add(off), target: c.target.clone().add(off) };
  };
  if (world === "story") shake(hp, 16, 0.014);
  if (world === "main") shake(E("crash"), 16, 0.01);
  if (world === "rows") shake(E("glow"), 12, 0.006);
  // handheld drift, very small, scaled to the framing
  const hh = v.w / (world === "main" ? 9 : 24);
  c.pos.add(V(Math.sin(t * 0.41) * 0.04 * hh, Math.sin(t * 0.33 + 2) * 0.03 * hh, Math.sin(t * 0.27) * 0.03 * hh));

  return {
    f,
    t,
    world,
    cam: c,
    view: v,
    dip,
    dof: world === "story" ? 1 - span(f, E("pullFrom"), E("pullTo") + 6, smooth) : 0,
    story,
    rows: {
      n: N_AFTER * (1 - rewind),
      act,
      focus,
      y,
      s,
      op,
      vol,
      merge,
      fade: collapse,
      trail: lin(f, [
        [E("trail0"), 0],
        [E("trail1"), N_AFTER],
      ]),
      collapse,
      chrome: 1 - span(f, E("rewind0") - 10, E("rewind0") + 6, smooth),
    },
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
