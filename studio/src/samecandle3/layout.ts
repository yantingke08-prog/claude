// 《同一根大阳线》 v3 — the picture is a stack of fixed 2D layers, one per scene, switched by hard cuts.
// Every chart is defined once here in screen pixels; candles, frames, grid and annotations all read the same
// numbers, and nothing on a chart moves after the cut that shows it.
import { E, Lend } from "./cue";
import { HERO, LANES, type LaneId } from "./data";

export const W = 1080;
export const H = 1920;
export type Rect = { x: number; y: number; w: number; h: number };
export type Chart = { r: Rect; i0: number; i1: number; plo: number; phi: number };
const R = (x: number, y: number, w: number, h: number): Rect => ({ x, y, w, h });

export const slot = (c: Chart) => c.r.w / (c.i1 - c.i0 + 1);
export const cx = (c: Chart, i: number) => c.r.x + (i - c.i0 + 0.5) * slot(c);
export const cy = (c: Chart, p: number) => c.r.y + ((c.phi - p) / (c.phi - c.plo)) * c.r.h;
export const bodyW = (c: Chart) => Math.min(70, slot(c) * (slot(c) < 26 ? 0.7 : 0.62));

export const IDS: LaneId[] = ["A", "B", "C"];
export const clamp01 = (x: number) => Math.min(1, Math.max(0, x));
export const mix = (a: number, b: number, t: number) => a + (b - a) * t;
export const ease = (x: number) => 1 - Math.pow(1 - clamp01(x), 3);

// ---------------------------------------------------------------- scenes (hard cuts)
const after = (line: string) => Lend(line) + 18; // a cut waits 18 frames after the last line of the scene
export const CUT = {
  rows: 40, // 3D opening dissolves into the 2D rows over frames 36–40 (4 frames)
  why: after("h3"),
  pos: after("w3"),
  vol: after("p4"),
  hold: after("v4"),
  recap: after("c5"),
  end: after("r4"),
};
export const DISSOLVE = 4;
export type SceneId = "open3d" | "rows" | "why" | "pos" | "vol" | "hold" | "recap";
export const sceneAt = (f: number): SceneId => {
  if (f < CUT.rows - DISSOLVE) return "open3d";
  if (f < CUT.why) return "rows";
  if (f < CUT.pos) return "why";
  if (f < CUT.vol) return "pos";
  if (f < CUT.hold) return "vol";
  if (f < CUT.recap) return "hold";
  return "recap";
};

// ---------------------------------------------------------------- A/B/C rows (opening and recap: identical geometry)
export const ROW_Y = [372, 752, 1132];
export const ROW_H = 356;
export const ROW = { badgeX: 40, badge: 84, chartX: 150, chartW: 410, colX: 596 };
export const ROW_SCALE = { lo: 80, hi: 133 };
export const ROW_WIN = { i0: HERO - 10, i1: HERO + 24 };
export const rowChart = (k: number): Chart => ({ r: R(ROW.chartX, ROW_Y[k] + 30, ROW.chartW, ROW_H - 60), i0: ROW_WIN.i0, i1: ROW_WIN.i1, plo: ROW_SCALE.lo, phi: ROW_SCALE.hi });

// ---------------------------------------------------------------- why: one big candle
export const WHY: Chart = { r: R(150, 560, 760, 760), i0: HERO - 1.6, i1: HERO + 3.4, plo: 96, phi: 112 };

// ---------------------------------------------------------------- 01 position: one map
export const POS_CHART: Chart = { r: R(56, 470, 968, 900), i0: 0, i1: 88, plo: 88, phi: 174 };

// ---------------------------------------------------------------- 02 volume: three columns
export const VCOL_X = [44, 344, 644];
export const VCOL_W = 280;
export const VOL_WIN = { i0: HERO - 12, i1: HERO + 5 };
export const volPrice = (k: number): Chart => ({ r: R(VCOL_X[k], 486, VCOL_W, 200), i0: VOL_WIN.i0, i1: VOL_WIN.i1, plo: 84, phi: 116 });
export const VOL_BARS = { y: 730, h: 450 };
export const volBars = (k: number): Chart => ({ r: R(VCOL_X[k], VOL_BARS.y, VCOL_W, VOL_BARS.h), i0: VOL_WIN.i0, i1: VOL_WIN.i1, plo: 0, phi: Math.max(...IDS.map((id) => LANES[id][HERO].v)) * 1.08 });

// ---------------------------------------------------------------- 03 hold: one big chart, hero + three paths
export const HOLD_CHART: Chart = { r: R(64, 470, 876, 860), i0: HERO - 1.5, i1: HERO + 9.5, plo: 94, phi: 116 };

// ---------------------------------------------------------------- reveal schedules (bars after the hero)
const lin = (f: number, a: number, b: number) => clamp01((f - a) / (b - a));
/** opening rows: post bars of each lane grow when the voice names that ending */
export const rowPost = (id: LaneId, f: number) => {
  const a = { A: E("laneA"), B: E("laneB"), C: E("laneC") }[id];
  return 24 * lin(f, a, a + 18);
};
/** hold chart: how many post bars of each path are drawn as candles */
export const holdPost = (id: LaneId, f: number) => {
  if (id === "A") return 6 * lin(f, E("holdGrowA"), E("holdGrowA") + 54);
  if (id === "B") return lin(f, E("breakB") - 6, E("breakB")) + 5 * lin(f, E("holdRestB"), E("holdRestB") + 20);
  return 6 * lin(f, E("holdGrowC"), E("breakC")) + 0;
};
/** volume columns: post bars appear once that column's story reaches them */
export const volPost = (id: LaneId, f: number) => {
  const a = { A: E("volA2"), B: E("volB2"), C: E("volC2") }[id];
  return 5 * lin(f, a, a + 12);
};
