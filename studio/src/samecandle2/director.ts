// 《同一根大阳线》 v2: what the picture is doing on any frame, as one pure function of the frame.
//
// The camera is locked frontal after the opening pull-back, so the chart plane (z = 0) maps linearly to
// screen pixels. Every chart is a "panel" laid out directly in pixels; the 3D scene and the HUD both read the
// same panel numbers, so labels, frames and candles line up exactly. Changing what is on screen means moving
// panels between layouts (TRIO → SOLO → VOL → HOLD → RECAP), never drifting the camera.
import * as THREE from "three";
import { E, FRAMES, Lend } from "./cue";
import { HERO, LANES, type LaneId } from "./data";

export const W = 1080;
export const H = 1920;
export const FOV = 22;
export const DZ = 50;
/** world units per pixel on the chart plane */
export const K = (2 * DZ * Math.tan(((FOV / 2) * Math.PI) / 180)) / H;
export const toWorld = (x: number, y: number): [number, number] => [(x - W / 2) * K, (H / 2 - y) * K];

export const clamp01 = (x: number) => Math.min(1, Math.max(0, x));
export const mix = (a: number, b: number, t: number) => a + (b - a) * t;
export const smooth = (x: number) => {
  const t = clamp01(x);
  return t * t * t * (t * (t * 6 - 15) + 10);
};
/** 0→1 between frames a and b (smootherstep) */
export const span = (f: number, a: number, b: number) => smooth((f - a) / Math.max(1e-6, b - a));
const lin = (f: number, a: number, b: number) => clamp01((f - a) / Math.max(1e-6, b - a));

// ---------------------------------------------------------------- panels
export type Rect = { x: number; y: number; w: number; h: number };
export type Panel = {
  r: Rect; // price chart rect (px)
  i0: number; // first / last bar index of the window
  i1: number;
  plo: number; // price window (shared by every lane in a layout)
  phi: number;
  vr: Rect; // volume rect (px)
  va: number; // volume visibility
  a: number; // panel visibility
};
export type LaneState = { p: Panel; post: number; dimPre: number; dimPost: number; focus: number; glow: number };
export type Lanes = Record<LaneId, LaneState>;
export const IDS: LaneId[] = ["A", "B", "C"];

const R = (x: number, y: number, w: number, h: number): Rect => ({ x, y, w, h });
const ZR = R(0, 0, 0, 0);
const lerpR = (a: Rect, b: Rect, t: number): Rect => ({ x: mix(a.x, b.x, t), y: mix(a.y, b.y, t), w: mix(a.w, b.w, t), h: mix(a.h, b.h, t) });
const lerpP = (a: Panel, b: Panel, t: number): Panel => ({
  r: lerpR(a.r, b.r, t),
  i0: mix(a.i0, b.i0, t),
  i1: mix(a.i1, b.i1, t),
  plo: mix(a.plo, b.plo, t),
  phi: mix(a.phi, b.phi, t),
  vr: lerpR(a.vr.w ? a.vr : { ...b.vr, h: 0, y: b.vr.y + b.vr.h }, b.vr.w ? b.vr : { ...a.vr, h: 0, y: a.vr.y + a.vr.h }, t),
  va: mix(a.va, b.va, t),
  a: mix(a.a, b.a, t),
});
const lerpL = (a: LaneState, b: LaneState, t: number): LaneState => ({
  p: lerpP(a.p, b.p, t),
  post: mix(a.post, b.post, t),
  dimPre: mix(a.dimPre, b.dimPre, t),
  dimPost: mix(a.dimPost, b.dimPost, t),
  focus: mix(a.focus, b.focus, t),
  glow: mix(a.glow, b.glow, t),
});

/** bar index → x centre, price → y (px) */
export const slot = (p: Panel) => p.r.w / (p.i1 - p.i0 + 1);
export const px = (p: Panel, i: number) => p.r.x + (i - p.i0 + 0.5) * slot(p);
export const py = (p: Panel, price: number) => p.r.y + ((p.phi - price) / (p.phi - p.plo)) * p.r.h;

// ---- shared vertical structure (px)
export const ROW_Y = [372, 752, 1132]; // TRIO / RECAP row tops
export const ROW_H = 356;
export const TRIO_SCALE = { lo: 80, hi: 133 }; // one price scale for all three rows
export const WIN = { i0: HERO - 10, i1: HERO + 24 };
export const COL = { badgeX: 46, chartX: 214, trioW: 538, recapW: 336 };
/** big focus panel + two thumbnails (SOLO and HOLD layouts) */
export const BIG = R(64, 486, 952, 690);
export const BIG_HEAD_Y = 400;
export const THUMB = [R(64, 1290, 452, 186), R(564, 1290, 452, 186)];
/** VOL layout: three equal columns */
export const VCOL_X = [48, 388, 728];
export const VCOL_W = 304;
export const VOL_PRICE = { y: 486, h: 230, lo: 84, hi: 116 };
export const VOL_BARS = { y: 760, h: 470 };
export const VOL_WIN = { i0: HERO - 12, i1: HERO + 5 };
export const VMAX = Math.max(...IDS.map((id) => LANES[id][HERO].v)) * 1.08;
export const SOLO_SCALE: Record<LaneId, [number, number]> = { A: [86, 134], B: [56, 114], C: [88, 122] };
export const HOLD_SCALE: [number, number] = [90, 116];
export const HOLD_WIN = { i0: HERO - 5, i1: HERO + 9 };

const trioPanel = (k: number, recap = 0): Panel => ({
  r: R(COL.chartX, ROW_Y[k] + mix(30, 44, recap), mix(COL.trioW, COL.recapW, recap), ROW_H - mix(60, 88, recap)),
  i0: WIN.i0,
  i1: WIN.i1,
  plo: TRIO_SCALE.lo,
  phi: TRIO_SCALE.hi,
  vr: ZR,
  va: 0,
  a: 1,
});
const thumbPanel = (k: number): Panel => ({ r: THUMB[k], i0: WIN.i0, i1: WIN.i1, plo: TRIO_SCALE.lo, phi: TRIO_SCALE.hi, vr: ZR, va: 0, a: 1 });
const bigPanel = (id: LaneId, hold = false): Panel =>
  hold
    ? { r: BIG, i0: HOLD_WIN.i0, i1: HOLD_WIN.i1, plo: HOLD_SCALE[0], phi: HOLD_SCALE[1], vr: ZR, va: 0, a: 1 }
    : { r: BIG, i0: 0, i1: HERO + 24, plo: SOLO_SCALE[id][0], phi: SOLO_SCALE[id][1], vr: ZR, va: 0, a: 1 };
const volPanel = (k: number): Panel => ({
  r: R(VCOL_X[k], VOL_PRICE.y, VCOL_W, VOL_PRICE.h),
  i0: VOL_WIN.i0,
  i1: VOL_WIN.i1,
  plo: VOL_PRICE.lo,
  phi: VOL_PRICE.hi,
  vr: R(VCOL_X[k], VOL_BARS.y, VCOL_W, VOL_BARS.h),
  va: 1,
  a: 1,
});
const lane = (p: Panel, o: Partial<LaneState> = {}): LaneState => ({ p, post: 24, dimPre: 1, dimPost: 1, focus: 1, glow: 0.4, ...o });
/** solo layouts: the focused lane gets the big panel, the other two shrink to thumbnails in A/B/C order */
const focusLayout = (id: LaneId, big: LaneState, thumb: Partial<LaneState> = {}): Lanes => {
  const others = IDS.filter((x) => x !== id);
  const out = { [id]: big } as Lanes;
  others.forEach((o, k) => (out[o] = lane(thumbPanel(k), { focus: 0.55, glow: 0.2, ...thumb })));
  return out;
};
const grow = (f: number, a: number, b: number, from: number, to: number) => mix(from, to, lin(f, a, b));

// ---------------------------------------------------------------- the stage list
const L = (id: string) => Lend(id);
/** a layout change starts 18 frames after the last line of the previous shot ends, and takes TR frames */
export const TR = 14;
const after = (line: string) => L(line) + 18;

export const T = {
  lock: 42, // camera arrives, locked from here on
  solo: after("w3"),
  soloB: after("p2"),
  soloC: after("p3"),
  vol: after("p4"),
  holdA: after("v4"),
  holdB: after("c3"),
  holdC: after("c4"),
  recap: after("c5"),
  end: after("r4"),
};

/** post bars revealed in the opening (frames are the moments the voice names each ending) */
export const HOOK_GROW: Record<LaneId, [number, number]> = { A: [E("laneA"), E("laneA") + 24], B: [E("laneB"), E("laneB") + 24], C: [E("laneC"), E("laneC") + 24] };

type Stage = { at: number; name: string; build: (f: number) => Lanes };
const STAGES: Stage[] = [
  {
    at: 0,
    name: "trio",
    build: (f) => {
      const dim = mix(1, 0.1, span(f, E("rewind"), E("rewind") + 12));
      const o = {} as Lanes;
      IDS.forEach((id, k) => (o[id] = lane(trioPanel(k), { post: grow(f, ...HOOK_GROW[id], 0, 24), dimPost: dim, glow: mix(1, 0.75, span(f, 60, 90)) })));
      return o;
    },
  },
  {
    at: T.solo,
    name: "soloA",
    build: (f) => focusLayout("A", lane(bigPanel("A"), { dimPost: mix(0.06, 1, span(f, E("posA2"), E("posA2") + 12)), glow: 0.6 })),
  },
  {
    at: T.soloB,
    name: "soloB",
    build: (f) => focusLayout("B", lane(bigPanel("B"), { dimPost: mix(0.06, 1, span(f, E("posB2"), E("posB2") + 12)), glow: 0.6 })),
  },
  {
    at: T.soloC,
    name: "soloC",
    build: (f) => focusLayout("C", lane(bigPanel("C"), { dimPost: mix(0.06, 1, span(f, E("posC2"), E("posC2") + 12)), glow: 0.6 })),
  },
  {
    at: T.vol,
    name: "vol",
    build: (f) => {
      const focusOf = (id: LaneId) => {
        const on = { A: E("volA"), B: E("volB"), C: E("volC") }[id];
        const off = { A: E("volB"), B: E("volC"), C: 1e9 }[id];
        const before = f < E("volA") ? 1 : 0.32;
        return Math.max(before, span(f, on, on + 8) * (1 - span(f, off, off + 8)) * 0.68 + 0.32);
      };
      const postOf = (id: LaneId) => {
        const at = { A: E("volA2"), B: E("volB2"), C: E("volC2") }[id];
        return grow(f, at, at + 15, 0, 5);
      };
      const o = {} as Lanes;
      IDS.forEach((id, k) => {
        const p = volPanel(k);
        const rise = span(f, T.vol + TR + k * 4, T.vol + TR + 16 + k * 4);
        o[id] = lane({ ...p, vr: { ...p.vr, y: p.vr.y + p.vr.h * (1 - rise), h: p.vr.h * rise } }, { post: postOf(id), focus: focusOf(id), glow: 0.5 });
      });
      return o;
    },
  },
  {
    at: T.holdA,
    name: "holdA",
    build: (f) => focusLayout("A", lane(bigPanel("A", true), { post: grow(f, E("holdGrowA"), E("holdGrowA") + 60, 0, 6) + grow(f, E("holdGrowA") + 66, E("holdGrowA") + 84, 0, 3), glow: 0.7 })),
  },
  {
    at: T.holdB,
    name: "holdB",
    build: (f) => focusLayout("B", lane(bigPanel("B", true), { post: grow(f, E("breakB") - 16, E("breakB"), 0, 1) + grow(f, E("holdRestB"), E("holdRestB") + 26, 0, 8), glow: 0.7 })),
  },
  {
    at: T.holdC,
    name: "holdC",
    build: (f) => focusLayout("C", lane(bigPanel("C", true), { post: grow(f, E("holdGrowC"), E("breakC"), 0, 6) + grow(f, E("breakC") + 14, E("breakC") + 30, 0, 3), glow: 0.7 })),
  },
  {
    at: T.recap,
    name: "recap",
    build: (f) => {
      const o = {} as Lanes;
      const on = [E("recA"), E("recB"), E("recC")];
      const all = Lend("r4") - 8;
      IDS.forEach((id, k) => {
        let focus = f < on[0] - 6 ? 1 : 0.4;
        if (f >= on[k] - 6 && (k === 2 || f < on[k + 1] - 6)) focus = 1;
        if (f >= all) focus = 1;
        o[id] = lane(trioPanel(k, 1), { focus, glow: 0.5 });
      });
      return o;
    },
  },
  {
    at: T.end,
    name: "end",
    build: (f) => {
      const o = {} as Lanes;
      const lit = span(f, E("answer"), E("answer") + 14);
      IDS.forEach((id, k) => (o[id] = lane(trioPanel(k, 1), { focus: 1, dimPre: mix(0.2, 0.14, lit), dimPost: mix(0.2, 1, lit), glow: 0.2 })));
      return o;
    },
  },
];

/** smooth "a → b" smoothing for the vol focus maths (exported for the HUD) */
export const stageAt = (f: number) => {
  let k = 0;
  for (let i = 0; i < STAGES.length; i++) if (f >= STAGES[i].at) k = i;
  return k;
};

// ---------------------------------------------------------------- camera
export type Cam = { pos: THREE.Vector3; target: THREE.Vector3; fov: number };
const LOCK: Cam = { pos: new THREE.Vector3(0, 0, DZ), target: new THREE.Vector3(0, 0, 0), fov: FOV };
const heroB = (() => {
  const p = trioPanel(1);
  const [x, y] = toWorld(px(p, HERO), py(p, 104));
  return new THREE.Vector3(x, y, 0);
})();
const MACRO: Cam = { pos: heroB.clone().add(new THREE.Vector3(1.05, 0.55, 1.6)), target: heroB.clone().add(new THREE.Vector3(0.02, 0.03, 0)), fov: 30 };

const camAt = (f: number): Cam => {
  if (f >= T.lock) return LOCK;
  // one move only: hold the macro, then pull straight back to the locked frontal view
  const t = smooth(lin(f, E("pull"), T.lock));
  const u = 1 - Math.pow(1 - t, 2.2);
  const pos = new THREE.Vector3().lerpVectors(MACRO.pos, LOCK.pos, u);
  const target = new THREE.Vector3().lerpVectors(MACRO.target, LOCK.target, Math.min(1, u * 1.15));
  return { pos, target, fov: mix(MACRO.fov, LOCK.fov, t) };
};

// ---------------------------------------------------------------- the frame
export type Dir = {
  f: number;
  stage: string;
  lanes: Lanes;
  cam: Cam;
  hud: number; // HUD visibility (0 during the opening move)
  dof: number;
  beam: number;
  shake: number;
  rows: number; // 0 TRIO columns, 1 RECAP columns
};

export const direct = (f: number): Dir => {
  const k = stageAt(f);
  const s = STAGES[k];
  let lanes = s.build(f);
  if (k > 0 && f < s.at + TR) lanes = Object.fromEntries(IDS.map((id) => [id, lerpL(STAGES[k - 1].build(f)[id], lanes[id], smooth((f - s.at) / TR))])) as Lanes;
  const trap = E("trap");
  return {
    f,
    stage: s.name,
    lanes,
    cam: camAt(f),
    hud: span(f, T.lock - 4, T.lock + 4),
    dof: 1 - span(f, E("pull") + 4, T.lock - 6),
    beam: span(f, T.lock, T.lock + 14) * (1 - span(f, T.solo, T.solo + 8)) * mix(0.55, 1, span(f, E("rewind"), E("rewind") + 12)),
    // the one short impact: 5 frames on the trap verdict
    shake: f >= trap && f < trap + 5 ? (1 - (f - trap) / 5) * 0.06 : 0,
    rows: s.name === "recap" ? smooth((f - s.at) / TR) : s.name === "end" ? 1 : 0,
  };
};

export const DURATION = FRAMES;
