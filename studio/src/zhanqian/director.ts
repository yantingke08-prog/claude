// What the film is doing on any frame, as a shot list. Four places in one 3D world:
//   hook   (x 0):    a giant red candle on a dark floor; the camera dives inside it
//   book   (x 300):  the order book as two walls of resting orders, with the price as a bead between them
//   table  (x 600):  four kinds of participant as metal pieces on a sand table
//   anatomy(x 900):  the candle again, then two identical candles cut open
// plus "flat" shots where the 3D drops away and the 2D data layer takes the whole frame.
// Every shot moves from camera a to camera b; shots are joined by hard cuts (some with a colour flash),
// and any shot longer than SPLIT frames is cut in two so no framing holds for more than ~3.3 s.
import * as THREE from "three";
import { HOPS, STOP_HOPS, beadK, ky } from "./book";
import { FPS, FRAMES, L, Lc, Le, S, cubicInOut, pulse } from "./cue";

export const X = { hook: 0, book: 300, table: 600, anatomy: 900, flat: 0 };
export const FOV = 34;
type V3 = [number, number, number];
type Cam = [V3, V3];
export type World = keyof typeof X;
export type Lay = string;
type Shot = { at: number; w: World; a: Cam; b?: Cam; lay: Lay; flash?: string; fov?: number };

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
const FLAT: Cam = [
  [0, 0, 10],
  [0, 0, 0],
];

const SH: Shot[] = [
  // ---------------- hook: shadow, wick, dive, swarm, title
  { at: 0, w: "hook", a: [[2.4, 0.35, 8.5], [0, 6.5, 0]], b: [[3.4, 0.5, 10.5], [0, 6.2, 0]], lay: "h.shadow" },
  { at: Lc("h1", "只是") - 2, w: "hook", a: [[1.9, 10.6, 4.6], [0, 9.4, 0]], b: [[1.3, 10.9, 3.8], [0, 10, 0]], lay: "h.wick", flash: "#ff3b4e" },
  { at: L("h2") - 2, w: "hook", a: [[5.2, 3.6, 15], [0, 4.8, 0]], b: [[1.4, 4.9, 4.2], [0, 5, 0]], lay: "h.dive" },
  { at: Lc("h2", "藏在") - 2, w: "hook", a: [[0.1, 4.6, 0.8], [0, 5.4, -4]], b: [[0.1, 5.6, -0.5], [0.3, 6.4, -4]], lay: "h.swarm" },
  { at: L("h3") - 4, w: "hook", a: [[0.6, 3.2, 0.6], [-0.3, 7, -1]], b: [[-0.3, 3.6, -0.3], [0.4, 7.4, -1.6]], lay: "h.title", flash: "#f2bd62" },
  // ---------------- auction
  { at: S("auction") - 6, w: "book", a: [[4.6, 5.4, 9], [0.6, 7.8, 1.5]], b: [[3.8, 5.8, 7.8], [0.6, 8, 1.5]], lay: "a.gavel", flash: "#ffffff" },
  { at: Lc("a1", "拍卖") - 2, w: "book", a: [[2, 7.5, 30], [0, 4.4, 0]], b: [[1, 6.8, 25], [0, 4, 0]], lay: "a.wide" },
  { at: L("a2") - 2, w: "book", a: [[6.5, -2.4, 20], [0, -2.6, 0]], b: [[4.4, -2, 16.5], [0, -2.4, 0]], lay: "a.bids" },
  { at: Lc("a2", "卖方") - 2, w: "book", a: [[-5.4, 7.4, 19], [0, 4.4, 0]], b: [[-4, 6.4, 16], [0, 4, 0]], lay: "a.asks" },
  { at: Lc("a2", "一层层") - 2, w: "book", a: [[1.5, 1.6, 31], [0, 1.4, 0]], b: [[1, 1.4, 28], [0, 1.2, 0]], lay: "a.board" },
  { at: L("a3") - 2, w: "book", a: [[3.6, 0.9, 14], [0, 0.1, 0]], b: [[2.2, 0.5, 10.5], [0, 0.1, 0]], lay: "a.gap" },
  { at: Lc("a3", "没人") - 2, w: "flat", a: FLAT, lay: "a.depth", flash: "#7fa8ff" },
  { at: L("a4") - 2, w: "book", a: [[-6, 2, 26], [0, 1, 0]], b: [[-8.5, 2.6, 21], [0, 1, 0]], lay: "a.myth" },
  { at: L("a5") - 2, w: "book", a: [[2.6, 1.8, 14], [-1.8, 1.1, 0]], b: [[1.6, 1.5, 10.5], [-1.8, 1.1, 0]], lay: "a.trade" },
  { at: Lc("a5", "买入量") - 2, w: "flat", a: FLAT, lay: "a.equal", flash: "#f2bd62" },
  { at: L("a6") - 2, w: "book", a: [[8, 0.6, 21], [0, 1, 0]], b: [[6.4, 1, 17], [0, 1, 0]], lay: "a.urgent" },
  { at: Lc("a6", "看哪") - 2, w: "book", a: [[-2.4, -1.6, 12], [-0.6, 1, 0]], b: [[-1.6, -1, 9.6], [-0.6, 1.1, 0]], lay: "a.urgent2" },
  // ---------------- three kinds of order
  { at: L("o1") - 4, w: "flat", a: FLAT, lay: "o.three", flash: "#ffffff" },
  { at: L("o2") - 2, w: "book", a: [[5.2, -2.6, 15.5], [0, -2.4, 0]], b: [[3.8, -2.2, 12], [0, -2.2, 0]], lay: "o.case1" },
  { at: Lc("o2", "它挂着") - 2, w: "book", a: [[-4.4, -0.6, 13], [0, -1.4, 0]], b: [[-3.2, -1, 10.5], [0, -1.6, 0]], lay: "o.passive" },
  { at: Lc("o2", "提供") - 2, w: "flat", a: FLAT, lay: "o.passiveLadder" },
  { at: L("o3") - 2, w: "book", a: [[-1.8, -6, 13], [0, 1, 0]], b: [[-1.2, -4, 10.4], [0, 1, 0]], lay: "o.case2", flash: "#f2bd62" },
  { at: Lc("o3", "直接吃掉") - 2, w: "book", a: [[3, 1.7, 10], [0, 1.1, 0]], b: [[2, 1.4, 7.8], [0, 1.1, 0]], lay: "o.eat" },
  { at: Lc("o3", "消耗") - 2, w: "flat", a: FLAT, lay: "o.eatLadder" },
  { at: L("o4") - 2, w: "book", a: [[7, 1.2, 18], [0, 1.2, 0]], b: [[5.6, 1.6, 14.5], [0, 1.4, 0]], lay: "o.hop" },
  { at: L("o5") - 2, w: "book", a: [[-4.6, 2.4, 17], [0, 2, 0]], b: [[-3, 2.8, 13], [0, 2.2, 0]], lay: "o.hop2" },
  { at: Lc("o5", "这就是") - 2, w: "flat", a: FLAT, lay: "o.chain" },
  { at: L("o6") - 2, w: "book", a: [[15, 3.2, 8], [0, 3.6, -2]], b: [[13, 3.6, 2], [0, 3.8, -2]], lay: "o.case3", flash: "#ff8a1f" },
  // ---------------- stops
  { at: L("s1") - 2, w: "book", a: [[11, 4.2, -9], [0, 4.4, -1.7]], b: [[8.4, 4.6, -8.6], [0, 4.6, -1.7]], lay: "s.hidden" },
  { at: Lc("s1", "像埋好") - 2, w: "book", a: [[3.4, 3.6, -6.4], [0, 3.2, -1.7]], b: [[2.4, 3.4, -5.2], [0, 3.2, -1.7]], lay: "s.mine" },
  { at: L("s2") - 2, w: "flat", a: FLAT, lay: "s.chart", flash: "#ff8a1f" },
  { at: L("s3") - 2, w: "book", a: [[5, 3.4, 9], [0, 3.6, 0]], b: [[3.6, 3.6, 7], [0, 3.8, 0]], lay: "s.trigger" },
  { at: CONVERT_AT(), w: "book", a: [[6, 3, 15], [0, 3.6, -0.8]], b: [[4.8, 3.6, 12], [0, 3.8, -0.8]], lay: "s.convert", flash: "#ff8a1f" },
  { at: L("s4") - 2, w: "book", a: [[2.2, 4.8, 6.5], [0, 5.4, -1]], b: [[1.6, 5.4, 5.4], [0, 5.6, -1]], lay: "s.boom1", flash: "#ff8a1f" },
  { at: L("s4") + 26, w: "book", a: [[-6, 2, 11], [0, 5.6, -0.6]], b: [[-5, 2.6, 9.5], [0, 5.8, -0.6]], lay: "s.boom2", flash: "#ffffff" },
  { at: Lc("s4", "盘口") - 2, w: "flat", a: FLAT, lay: "s.sweep", flash: "#ff8a1f" },
  { at: Lc("s4", "价格连跳") - 2, w: "book", a: [[9, 1, 30], [0, 2, 0]], b: [[7, 1.6, 26], [0, 2.2, 0]], lay: "s.after" },
  // ---------------- participants
  { at: S("players") - 6, w: "table", a: [[0, 30, 6], [0, 0, 0.5]], b: [[0, 26, 8], [0, 0, 0.3]], lay: "p.who", flash: "#ffffff" },
  { at: Lc("p1", "而是") - 2, w: "table", a: [[10, 14, 26], [0, 0.6, 0]], b: [[2, 15, 27], [0, 0.6, 0]], lay: "p.wide" },
  { at: L("p2") - 2, w: "table", a: near("mm"), b: near("mm", 11, 7.5), lay: "p.mm" },
  { at: Lc("p2", "最怕") - 2, w: "table", a: [[-8.3, 3.6, 3.2], [-4.3, 3.6, -3.2]], b: [[-7.4, 3.9, 2.2], [-4.3, 3.6, -3.2]], lay: "p.mm2" },
  { at: L("p3") - 2, w: "table", a: near("inst"), b: near("inst", 11, 7.5), lay: "p.inst" },
  { at: Lc("p3", "拆成") - 2, w: "table", a: [[11, 1.6, -1], [5.2, 1, -3.2]], b: [[10, 1.8, 1], [6, 0.8, -3.2]], lay: "p.inst2" },
  { at: L("p4") - 2, w: "table", a: near("hedge"), b: near("hedge", 11, 7.5), lay: "p.hedge" },
  { at: Lc("p4", "不太") - 2, w: "table", a: [[-0.6, 4.6, 17.5], [-4.3, 1.8, 3.6]], b: [[-2.2, 4.8, 15.8], [-4.3, 2, 3.6]], lay: "p.hedge2" },
  { at: L("p5") - 2, w: "table", a: near("short"), b: near("short", 11, 7.5), lay: "p.short" },
  { at: Lc("p5", "止损") - 2, w: "table", a: [[7.6, 2.2, 7.4], [4.3, 2.6, 3.6]], b: [[6.8, 3, 6.8], [4.3, 2.8, 3.6]], lay: "p.short2" },
  { at: L("p6") - 2, w: "flat", a: FLAT, lay: "p.manip", flash: "#ff8a1f" },
  { at: Lc("p6", "但大多数") - 2, w: "table", a: [[0, 27, 19], [0, 0.3, 0.2]], b: [[3, 22, 15], [0, 0.6, 0.2]], lay: "p.clash" },
  // ---------------- the candle, cut open
  { at: S("anatomy") - 6, w: "anatomy", a: [[7, 4, 24], [0, 4.4, 0]], b: [[4, 4.4, 26], [0, 4.6, 0]], lay: "w.candle", flash: "#ffffff" },
  { at: Lc("w2", "开高低收") - 2, w: "anatomy", a: [[2.6, 5, 25], [0, 4.8, 0]], b: [[0.6, 5, 27], [0, 4.8, 0]], lay: "w.ohlc" },
  { at: Lc("w2", "过程") - 2, w: "anatomy", a: [[-7, 6.4, 22], [-1.8, 4.8, 1.8]], b: [[-5.2, 5.8, 18.5], [-1.4, 4.8, 1.8]], lay: "w.squeeze" },
  { at: L("w3") - 2, w: "anatomy", a: [[-1.5, 4.8, 36], [0, 4.4, 0]], b: [[-1.5, 4.8, 33], [0, 4.4, 0]], lay: "w.caseA", flash: "#7fa8ff" },
  { at: L("w4") - 2, w: "anatomy", a: [[1.5, 4.8, 33], [0, 4.4, 0]], b: [[1.5, 4.8, 36], [0, 4.4, 0]], lay: "w.caseB" },
  { at: L("w5") - 2, w: "anatomy", a: [[0, 6, 50], [0, 5.4, 0]], b: [[2, 6.4, 46], [0, 5.4, 0]], lay: "w.same" },
  // ---------------- recap
  { at: Le("w5") + 4, w: "flat", a: FLAT, lay: "r.k1", flash: "#ff3b4e" },
  { at: Le("w5") + 17, w: "flat", a: FLAT, lay: "r.k2", flash: "#f2bd62" },
  { at: Le("w5") + 30, w: "flat", a: FLAT, lay: "r.k3", flash: "#ff8a1f" },
  { at: L("r1") - 2, w: "anatomy", a: [[3, 6.6, 58], [0, 5.4, 0]], b: [[0, 6.2, 52], [0, 5.4, 0]], lay: "r.ask" },
  { at: Lc("r1", "要问") - 2, w: "hook", a: [[0.1, 4.8, 0.6], [0, 5.6, -4]], b: [[0.1, 5.4, -0.4], [0.2, 6.2, -4]], lay: "r.who", flash: "#f2bd62" },
  { at: L("r2") - 2, w: "book", a: [[2, 1.2, 30], [0, 1.4, 0]], b: [[-2, 1.6, 27], [0, 1.4, 0]], lay: "r.caveat" },
  { at: L("r3") - 2, w: "flat", a: FLAT, lay: "r.next", flash: "#ffffff" },
];
function CONVERT_AT() {
  return Lc("s3", "止损就") - 2;
}

const SPLIT = 100;
/** cut-in for the second half of a long shot: closer, swung round the target */
const cutIn = ([p, t]: Cam, sw: number): Cam => {
  const d = new THREE.Vector3(...p).sub(new THREE.Vector3(...t)).multiplyScalar(0.74);
  d.applyAxisAngle(new THREE.Vector3(0, 1, 0), sw);
  return [[t[0] + d.x, t[1] + d.y, t[2] + d.z], t];
};
export type Cut = Shot & { end: number; part: number };
export const SHOTS: Cut[] = (() => {
  const out: Cut[] = [];
  SH.forEach((s, i) => {
    const end = i + 1 < SH.length ? SH[i + 1].at : FRAMES;
    const n = Math.ceil((end - s.at) / SPLIT);
    const b = s.b ?? s.a;
    for (let p = 0; p < n; p++) {
      const a0 = Math.round(s.at + ((end - s.at) * p) / n);
      const a1 = Math.round(s.at + ((end - s.at) * (p + 1)) / n);
      const lerp = (u: number): Cam => {
        const [pa, ta] = s.a,
          [pb, tb] = b;
        const m = (x: V3, y: V3) => x.map((v, j) => v + (y[j] - v) * u) as V3;
        return [m(pa, pb), m(ta, tb)];
      };
      const sw = (p % 2 ? 1 : -1) * 0.3;
      const ca = p === 0 ? lerp(p / n) : cutIn(lerp(p / n), sw);
      const cb = p === 0 ? lerp((p + 1) / n) : cutIn(lerp((p + 1) / n), sw);
      out.push({ ...s, at: a0, end: a1, a: ca, b: cb, part: p, flash: p === 0 ? s.flash : undefined });
    }
  });
  return out;
})();
export const shotAt = (f: number) => {
  let i = SHOTS.length - 1;
  while (i > 0 && SHOTS[i].at > f) i--;
  return SHOTS[i];
};

export type Dir = { f: number; t: number; world: World; lay: Lay; shot: Cut; u: number; pos: THREE.Vector3; target: THREE.Vector3; fov: number; flash: number; flashColor: string; dof: number };

export const direct = (f: number): Dir => {
  const t = f / FPS;
  const s = shotAt(f);
  const u = Math.min(1, Math.max(0, (f - s.at) / Math.max(1, s.end - s.at)));
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
  const pops = Math.max(pulse(f, L("h1"), 7) * 0.9, ...(world === "book" ? STOP_HOPS.map((a) => 0.6 * pulse(f, a, 6)) : [0]), world === "anatomy" ? 0.4 * pulse(f, Le("w4") - 40, 8) : 0);
  return { f, t, world, lay: s.lay, shot: s, u, pos, target, fov: s.fov ?? FOV, flash: Math.max(pops, (cutFlash?.k ?? 0) * 0.5), flashColor: cutFlash?.c ?? "#ffffff", dof: world === "hook" && s.lay !== "h.title" ? 1 : 0 };
};

export { HOPS, Lc };
