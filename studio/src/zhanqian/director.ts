// What the film is doing on any frame, as a shot list. Four places in one 3D world:
//   hook   (x 0):    a giant red candle on a dark floor; the camera dives inside it
//   book   (x 300):  the order book as two walls of resting orders, with the price as a bead between them
//   table  (x 600):  four kinds of participant as metal pieces on a sand table
//   anatomy(x 900):  the candle again, then two identical candles cut open
// plus "flat" shots where the 3D drops away and the 2D data layer takes the whole frame.
// Every shot is ONE continuous camera move from a to b (v4: no automatic splitting, no cut-ins). Cuts only
// happen for a new chapter, a 3D <-> 2D change, a full-screen conclusion or a genuinely different subject;
// emphasis inside a shot is done by the HUD's in-frame focus box, not by cutting to a close-up.
// Colour flashes are kept for chapter openings only.
// v6 timing: a cut always lands TAIL frames after a sentence ends (a sentence that is split by a cut has a pause
// inserted in its audio, see zhanqian-vo.py); each shot does ONE camera move that settles within SETTLE frames,
// and its labels only start once it has. Every order-wall shot names its composition (`comp`): two consecutive
// wall shots never share one (camera position, framing, data layer and layout all change).
import * as THREE from "three";
import { HOPS, STOP_HOPS, beadK, ky } from "./book";
import { FPS, FRAMES, L, Lc, Le, Lp, cubicInOut, pulse } from "./cue";

export const X = { hook: 0, book: 300, table: 600, anatomy: 900, flat: 0 };
export const FOV = 34;
type V3 = [number, number, number];
type Cam = [V3, V3];
export type World = keyof typeof X;
export type Lay = string;
/** trans "morph": no cut into this shot; the camera carries on from the last one and the HUD wipes over it.
 *  mv: frame by which the camera has arrived (it then holds, so an in-frame focus box plays over a still frame) */
type Shot = { at: number; w: World; a: Cam; b?: Cam; lay: Lay; flash?: string; fov?: number; trans?: "morph"; mv?: number; comp?: string };
/** frames between the end of a sentence and the cut */
export const TAIL = 18;
/** frames a camera move takes to settle */
export const SETTLE = 18;
const cut = (id: string) => Le(id) + TAIL;
/** cut inside a sentence, in the pause inserted before its second half */
const cutP = (id: string, extra = 0) => Lp(id) + TAIL + extra;

// pieces on the sand table (table-local x, z)
export const PIECES = { mm: [-4.3, -3.2], inst: [4.3, -3.2], hedge: [-4.3, 3.6], short: [4.3, 3.6] } as const;
type Piece = keyof typeof PIECES;
/** close-up from outside the table, looking in over the piece (the others stay behind it) */
const near = (key: Piece, d = 13.5, h = 9, side = 2.6, ty = 3.3): Cam => {
  const p = PIECES[key];
  const r = Math.hypot(p[0], p[1]);
  const [ux, uz] = [p[0] / r, p[1] / r];
  return [
    [p[0] + ux * d - uz * side, h, p[1] + uz * d + ux * side],
    [p[0], ty, p[1]],
  ];
};
export const CASE_X = { a: -3.3, b: 3.3 };
const CAVEAT_END: Cam = [
  [1.2, 1.9, 23],
  [0, 1.6, 0],
];
const FLAT: Cam = [
  [0, 0, 10],
  [0, 0, 0],
];

const SH: Shot[] = [
  // ---------------- hook: rise to the wick (settles on the slam), push inside, title
  { at: 0, w: "hook", a: [[2.4, 0.35, 8.5], [0, 6.5, 0]], b: [[1.7, 9.6, 5.4], [0, 9.4, 0]], lay: "h.rise", mv: L("h1") - 8 },
  { at: cut("h1"), w: "hook", a: [[5.2, 3.6, 15], [0, 4.8, 0]], b: [[0.1, 5.4, -0.4], [0.3, 6.2, -4]], lay: "h.dive", mv: Lc("h2", "藏在") - 10 },
  { at: cut("h2"), w: "hook", a: [[0.6, 3.2, 0.6], [-0.3, 7, -1]], b: [[-0.3, 3.6, -0.3], [0.4, 7.4, -1.6]], lay: "h.title", flash: "#f2bd62", mv: L("h3") - 12 },
  // ---------------- auction
  { at: cut("h3"), w: "book", a: [[4.6, 5.4, 9], [0.6, 7.8, 1.5]], b: [[2, 7.2, 29], [0, 4.4, 0]], lay: "a.open", flash: "#ffffff", mv: L("a1") + 20, comp: "仰拍 · 拍卖锤" },
  { at: cut("a1"), w: "book", a: [[3.4, 0.4, 25], [0, 0.4, 0]], b: [[2.6, 3.2, 27], [0, 2.4, 0]], lay: "a.walls", mv: cut("a1") + 15, comp: "正面全景 · 价格阶梯" },
  { at: cutP("a3"), w: "flat", a: FLAT, lay: "a.depth" },
  { at: cut("a3"), w: "book", a: [[-6, 2, 26], [0, 1, 0]], b: [[-8, 2.5, 23], [0, 1, 0]], lay: "a.myth", comp: "左侧远景 · 文字版式" },
  { at: cut("a4"), w: "book", a: [[2.8, 1.9, 15], [-1.8, 1.1, 0]], b: [[2.2, 1.7, 12.6], [-1.8, 1.1, 0]], lay: "a.trade", comp: "近景特写 · 成交凭证" },
  { at: cut("a5"), w: "book", a: [[12, -0.6, 17], [0, 1.2, 0]], b: [[11, -1.4, 15.5], [0, 1.2, 0]], lay: "a.urgent", comp: "低机位侧面 · 成交带" },
  // ---------------- three kinds of order: the overview, then each one in turn
  { at: cut("a6"), w: "flat", a: FLAT, lay: "o.three", flash: "#ffffff" },
  { at: cut("o1"), w: "book", a: [[-3.2, 9, 18], [0, -2.4, 0]], b: [[-2.4, 7.6, 15], [0, -2.4, 0]], lay: "o.passive", comp: "俯拍买墙 · 价格阶梯" },
  { at: cut("o2"), w: "book", a: [[3.2, 1.8, 11.4], [0, 1.1, 0]], b: [[2.3, 1.5, 9.4], [0, 1.1, 0]], lay: "o.active", comp: "近景特写 · 卖一" },
  { at: cut("o3"), w: "book", a: [[1.4, -6.6, 56], [0, -10, 0]], b: [[0.6, -7, 52], [0, -10, 0]], lay: "o.hop", comp: "分屏版式 · 价格路径" },
  { at: cutP("o5"), w: "flat", a: FLAT, lay: "o.chain" },
  // ---------------- stops (the chapter opens on "第三种，止损订单")
  { at: cut("o5"), w: "book", a: [[14, 3.4, 6], [0, 3.8, -1.8]], b: [[8.6, 4.4, -8.4], [0, 4.4, -1.7]], lay: "s.hidden", flash: "#ff8a1f", mv: L("o6") + 24, comp: "背面反打 · 隐藏止损" },
  { at: cut("s1"), w: "flat", a: FLAT, lay: "s.chart" },
  { at: cut("s2"), w: "book", a: [[5.6, 2.2, 10.6], [0, 2, 0]], b: [[5, 2, 9], [0, 2, 0]], lay: "s.trigger", comp: "近景特写 · 触发价" },
  { at: cut("s3"), w: "book", a: [[7.4, 2.6, 25], [0, 3.4, 0]], b: [[7, 2.4, 23], [0, 3.2, 0]], lay: "s.boom", comp: "拉远全景 · 连环触发" },
  // ---------------- participants: the overview, then each one in turn
  { at: cut("s4"), w: "table", a: [[0, 30, 6], [0, 0, 0.5]], b: [[0, 27.5, 9], [0, 0, 0.4]], lay: "p.who", flash: "#ffffff" },
  { at: cut("p1"), w: "table", a: near("mm", 13.5, 9, 2.6), b: near("mm", 11.4, 7.6, -1.8), lay: "p.mm" },
  { at: cut("p2"), w: "table", a: near("inst", 13.5, 9, 2.6), b: near("inst", 11.4, 7.6, -1.8), lay: "p.inst" },
  { at: cut("p3"), w: "table", a: near("hedge", 13.5, 9, 2.6), b: near("hedge", 11.4, 7.6, -1.8), lay: "p.hedge" },
  { at: cut("p4"), w: "table", a: near("short", 13.5, 9, 2.6), b: near("short", 11.4, 7.6, -1.8), lay: "p.short" },
  { at: cut("p5"), w: "flat", a: FLAT, lay: "p.manip" },
  { at: cutP("p6", 6), w: "table", a: [[0, 27, 21.5], [0, 0.3, 2.9]], b: [[2.6, 23.6, 19], [0, 0.6, 2.9]], lay: "p.clash" },
  // ---------------- the candle, cut open
  { at: cut("p6"), w: "anatomy", a: [[-3, 6.4, 34], [1.6, 4.2, 1.8]], b: [[-6.6, 6.2, 31], [1.6, 4.2, 1.8]], lay: "w.candle", flash: "#ffffff" },
  { at: cut("w2"), w: "anatomy", a: [[-1.6, 4.8, 54], [0, 1.6, 0]], b: [[1.6, 4.8, 52], [0, 1.6, 0]], lay: "w.split" },
  { at: cut("w4"), w: "anatomy", a: [[-1, 8, 78], [0.5, 4.5, 0]], b: [[1.5, 8.4, 72], [0.5, 4.5, 0]], lay: "w.same" },
  // ---------------- recap
  { at: cut("w5"), w: "flat", a: FLAT, lay: "r.cards", flash: "#ff3b4e" },
  { at: cutP("r1"), w: "hook", a: [[0.1, 4.8, 0.6], [0, 5.6, -4]], b: [[0.1, 5.3, -0.2], [0.2, 6.1, -4]], lay: "r.who" },
  // the ending is one move: the order pool comes in once, holds through the caveat, then the camera keeps
  // pushing in while the pool is wiped into the footprint chart, which stays to the last frame
  { at: cut("r1"), w: "book", a: [[5.5, 2.6, 31], [0, 1.6, 0]], b: CAVEAT_END, lay: "r.caveat", comp: "正面全景 · 收尾" },
  { at: L("r3") - 30, w: "book", a: CAVEAT_END, b: [[0.4, 1.7, 19.5], [0, 1.6, 0]], lay: "r.next", trans: "morph", comp: "正面全景 · 收尾" },
];
/** when each recap card lands (one flat shot, three cards) */
export const RECAP_CARDS = [0, 1, 2].map((i) => cut("w5") + SETTLE + i * 16);

export type Cut = Shot & { end: number; mv: number };
export const SHOTS: Cut[] = SH.map((s, i) => ({ ...s, end: i + 1 < SH.length ? SH[i + 1].at : FRAMES, mv: s.mv ?? (s.w === "flat" ? s.at : s.at + SETTLE) }));
export const shotAt = (f: number) => {
  let i = SHOTS.length - 1;
  while (i > 0 && SHOTS[i].at > f) i--;
  return SHOTS[i];
};

export type Dir = { f: number; t: number; world: World; lay: Lay; shot: Cut; u: number; pos: THREE.Vector3; target: THREE.Vector3; fov: number; flash: number; flashColor: string; dof: number };

export const direct = (f: number): Dir => {
  const t = f / FPS;
  const s = shotAt(f);
  const u = Math.min(1, Math.max(0, (f - s.at) / Math.max(1, Math.min(s.end, s.mv) - s.at)));
  const k = 0.45 * u + 0.55 * cubicInOut(u);
  const world = s.w;
  const o = new THREE.Vector3(X[world], 0, 0);
  const pos = new THREE.Vector3(...s.a[0]).lerp(new THREE.Vector3(...(s.b ?? s.a)[0]), k).add(o);
  const target = new THREE.Vector3(...s.a[1]).lerp(new THREE.Vector3(...(s.b ?? s.a)[1]), k).add(o);
  if (world === "book") {
    const y = ky(beadK(f)) * 0.75;
    pos.y += y;
    target.y += y;
  }
  const shakes = world === "book" ? STOP_HOPS : world === "hook" ? [L("h1")] : [];
  for (const at of shakes) {
    const q = f - at;
    if (q >= 0 && q < 12) {
      const a = (1 - q / 12) ** 2 * 0.18;
      const off = new THREE.Vector3(Math.sin(q * 6.7) * a, Math.cos(q * 8.9) * a, 0);
      pos.add(off);
      target.add(off);
    }
  }
  pos.add(new THREE.Vector3(Math.sin(t * 0.41) * 0.06, Math.sin(t * 0.33 + 2) * 0.05, Math.sin(t * 0.27) * 0.05));
  // colour flash on marked cuts, white pops on the hook slam and on stop-driven hops
  const cutFlash = SHOTS.filter((c) => c.flash && f >= c.at && f < c.at + 8).map((c) => ({ k: pulse(f, c.at, 2.6), c: c.flash! }))[0];
  const pops = Math.max(pulse(f, L("h1"), 7) * 0.9, ...(world === "book" ? STOP_HOPS.map((a) => 0.18 * pulse(f, a, 6)) : [0]), world === "anatomy" ? 0.4 * pulse(f, Le("w4") - 40, 8) : 0);
  return { f, t, world, lay: s.lay, shot: s, u, pos, target, fov: s.fov ?? FOV, flash: Math.max(pops, (cutFlash?.k ?? 0) * 0.5), flashColor: cutFlash?.c ?? "#ffffff", dof: world === "hook" && s.lay !== "h.title" ? 1 : 0 };
};

export { HOPS, Lc };
