// What the film is doing on any frame. Four places in one 3D world, joined by short dips to black:
//   hook   (x 0):    a giant red candle on a dark floor; the camera dives inside it
//   book   (x 300):  the order book as two walls of resting orders, with the price as a bead between them
//   table  (x 600):  four kinds of participant as metal pieces on a sand table
//   anatomy(x 900):  the candle again, then two identical candles cut open
import * as THREE from "three";
import { HOPS, beadK, ky } from "./book";
import { FPS, L, Lc, Le, S, cubicInOut, pulse } from "./cue";

export const X = { hook: 0, book: 300, table: 600, anatomy: 900 };
export const FOV = 34;
type V3 = [number, number, number];
export type World = keyof typeof X;
/** a camera key: from this frame on the camera travels to the next key */
type Key = [number, V3, V3];

const v = (a: V3) => new THREE.Vector3(...a);
const track = (f: number, ks: Key[]) => {
  if (f <= ks[0][0]) return { pos: v(ks[0][1]), target: v(ks[0][2]) };
  for (let i = 1; i < ks.length; i++) {
    if (f < ks[i][0]) {
      const k = cubicInOut((f - ks[i - 1][0]) / (ks[i][0] - ks[i - 1][0]));
      return { pos: v(ks[i - 1][1]).lerp(v(ks[i][1]), k), target: v(ks[i - 1][2]).lerp(v(ks[i][2]), k) };
    }
  }
  const l = ks[ks.length - 1];
  return { pos: v(l[1]), target: v(l[2]) };
};

const A0 = S("auction"),
  P0 = S("players"),
  W0 = S("awaken");

const HOOK: Key[] = [
  [0, [7, 1.8, 17], [0, 4.4, 0]],
  [L("h1") + 54, [4.6, 3.4, 13.5], [0, 5, 0]],
  [L("h2") + 6, [4.2, 3.6, 12.5], [0, 5, 0]],
  [L("h2") + 74, [0.15, 5, 0.7], [0, 5.3, -4]],
  [A0, [0.1, 5.3, -0.7], [0.1, 6, -4]],
];
const BOOK: Key[] = [
  [A0, [2, 6.5, 27], [0, 3.6, 0]],
  [L("a2") - 8, [2, 6.5, 27], [0, 3.6, 0]],
  [L("a2") + 44, [6.5, 2, 26], [0, 0.7, 0]],
  [L("a3") - 4, [6.5, 2, 26], [0, 0.7, 0]],
  [L("a3") + 40, [3.6, 0.9, 15], [0, 0.2, 0]],
  [L("a4") - 12, [3.6, 0.9, 15], [0, 0.2, 0]],
  [L("a4") + 22, [-6, 2, 26], [0, 1, 0]],
  [L("a5") - 6, [-6, 2, 26], [0, 1, 0]],
  [L("a5") + 26, [2.4, 1.8, 15], [-1.8, 1.1, 0]],
  [L("a6") - 6, [2.4, 1.8, 15], [-1.8, 1.1, 0]],
  [L("a6") + 34, [7, 1, 24], [0, 1, 0]],
  [L("o2") - 16, [7, 1, 24], [0, 1, 0]],
  [L("o2") + 34, [5.2, -2.6, 15.5], [0, -2.6, 0]],
  [L("o3") - 18, [5.2, -2.6, 15.5], [0, -2.6, 0]],
  [L("o3") + 26, [-4.6, 2.2, 17], [0, 1.2, 0]],
  [L("o4") - 4, [-4.6, 2.2, 17], [0, 1.2, 0]],
  [L("o4") + 40, [4.6, 2, 21], [0, 1.2, 0]],
  [L("o5") - 16, [4.6, 2, 21], [0, 1.2, 0]],
  [Lc("o5", "止损订单") + 40, [15, 3.2, 8], [0, 3.2, -2]],
  [L("o6") - 8, [15, 3.2, 8], [0, 3.2, -2]],
  [L("o6") + 40, [6, 1.5, 27], [0, 1.2, 0]],
  [P0, [6, 1.5, 25], [0, 1.2, 0]],
];

// pieces on the sand table (table-local x, z)
export const PIECES = { mm: [-4.3, -3.2], inst: [4.3, -3.2], hedge: [-4.3, 3.6], short: [4.3, 3.6] } as const;
/** close-up from outside the table, looking in over the piece (the others stay behind it) */
const near = (p: readonly [number, number]): [V3, V3] => {
  const r = Math.hypot(p[0], p[1]);
  const [ux, uz] = [p[0] / r, p[1] / r];
  return [
    [p[0] + ux * 13.5 - uz * 2.6, 9, p[1] + uz * 13.5 + ux * 2.6],
    [p[0], 3.3, p[1]],
  ];
};
const WIDE_T: [V3, V3] = [
  [0, 25, 24],
  [0, 0.5, 0.3],
];
const push = (at: number, end: number, p: [V3, V3]): Key[] => [
  [at - 14, ...p],
  [end, ...p],
];
const TABLE: Key[] = [
  [P0, [8, 18, 30], [0, 0.5, 0]],
  [L("p1") + 40, ...WIDE_T],
  [L("p2") - 30, ...WIDE_T],
  ...push(L("p2") + 16, L("p3") - 24, near(PIECES.mm)),
  ...push(L("p3") + 16, L("p4") - 24, near(PIECES.inst)),
  ...push(L("p4") + 16, L("p5") - 24, near(PIECES.hedge)),
  ...push(L("p5") + 16, L("p6") - 24, near(PIECES.short)),
  [L("p6") + 30, [0, 27, 19], [0, 0.3, 0.2]],
  [W0, [3, 29, 17], [0, 0.3, 0.2]],
];
export const CASE_X = { a: -3.3, b: 3.3 };
const ANAT: Key[] = [
  [W0, [6, 4, 27], [0, 3.4, 0]],
  [L("w2") - 8, [3, 4.4, 28], [0, 3.4, 0]],
  [L("w3") - 16, [0, 4.6, 29], [0, 4.6, 0]],
  [L("w3") + 18, [-1.5, 4.8, 40], [0, 4.4, 0]],
  [L("w5") - 8, [-1.5, 4.8, 40], [0, 4.4, 0]],
  [L("w5") + 34, [0, 6, 54], [0, 5.4, 0]],
  [L("w6") - 4, [0, 6, 54], [0, 5.4, 0]],
  [L("w8") + 30, [3, 6.6, 58], [0, 5.4, 0]],
  [S("awaken") + 2000, [3, 6.6, 58], [0, 5.4, 0]],
];

export type Dir = { f: number; t: number; world: World; pos: THREE.Vector3; target: THREE.Vector3; fov: number; dip: number; flash: number; dof: number };

export const direct = (f: number): Dir => {
  const t = f / FPS;
  const world: World = f < A0 - 12 ? "hook" : f < P0 - 12 ? "book" : f < W0 - 12 ? "table" : "anatomy";
  const c = track(f, world === "hook" ? HOOK : world === "book" ? BOOK : world === "table" ? TABLE : ANAT);
  const o = new THREE.Vector3(X[world], 0, 0);
  const pos = c.pos.add(o);
  const target = c.target.add(o);
  if (world === "book") {
    const y = ky(beadK(f)) * 0.75;
    pos.y += y;
    target.y += y;
  }
  const shakes = world === "book" ? Object.values(HOPS).slice(3) : world === "hook" ? [L("h1")] : [];
  for (const at of shakes) {
    const k = f - at;
    if (k >= 0 && k < 12) {
      const a = (1 - k / 12) ** 2 * 0.16;
      const off = new THREE.Vector3(Math.sin(k * 6.7) * a, Math.cos(k * 8.9) * a, 0);
      pos.add(off);
      target.add(off);
    }
  }
  // a small handheld drift keeps long holds alive
  pos.add(new THREE.Vector3(Math.sin(t * 0.41) * 0.1, Math.sin(t * 0.33 + 2) * 0.07, Math.sin(t * 0.27) * 0.08));
  const cuts = [A0 - 12, P0 - 12, W0 - 12];
  const dip = Math.max(0, ...cuts.map((a) => 1 - Math.abs(f - a) / 12));
  const flash = Math.max(pulse(f, L("h1"), 7) * 0.9, ...Object.values(HOPS).slice(3).map((a) => (world === "book" ? 0.6 * pulse(f, a, 6) : 0)), world === "anatomy" ? 0.4 * pulse(f, Le("w4") - 40, 8) : 0);
  return { f, t, world, pos, target, fov: FOV, dip, flash, dof: world === "hook" ? 1 : 0 };
};

export { Lc };
