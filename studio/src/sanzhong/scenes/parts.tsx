// Scene helpers shared by several shots.
import React from "react";
import { Hit, type BookRow } from "../kit";
import { sizes } from "../market";
import type { Shot } from "../timeline";

export type SceneProps = { shot: Shot };

// ----- order book state -----
export const P_TOP = 12; // 13 rows: p = 12 (top) … 0
export const BOOK_X = 540;
export const BOOK_Y = 430;
export const BOOK_MAX = 1300;
const BASE_BID = sizes(101, P_TOP + 1, 160, 460);
const BASE_ASK = sizes(103, P_TOP + 1, 160, 460);
export const rowOf = (p: number) => P_TOP - p; // row index of price p

export const makeRows = (L: number, over: Record<number, Partial<BookRow>> = {}): BookRow[] =>
  Array.from({ length: P_TOP + 1 }, (_, k) => {
    const p = P_TOP - k;
    const base: BookRow = p > L ? { p, ask: BASE_ASK[p] } : { p, bid: BASE_BID[p] };
    return { ...base, last: p === L, ...(over[p] ?? {}) };
  });
export const baseBid = (p: number) => BASE_BID[p];
export const baseAsk = (p: number) => BASE_ASK[p];

/** A sweep through n levels between t0 and t1: k levels finished, frac of the current one eaten. */
export const sweep = (t: number, t0: number, t1: number, n: number) => {
  if (t <= t0) return { k: 0, frac: 0, on: false };
  const u = Math.min(1, (t - t0) / Math.max(0.01, t1 - t0)) * n;
  const k = Math.min(n, Math.floor(u));
  return { k, frac: k >= n ? 0 : u - k, on: t < t1 };
};

/** Market-order pucks fired every `every` s between t0 and t1, each flying `flight` s into its row. */
export const HitStream: React.FC<{ t: number; t0: number; t1: number; x0: number; x1: number; y: (s: number) => number; color: string; dir?: 1 | -1; every?: number; flight?: number }> = ({
  t,
  t0,
  t1,
  x0,
  x1,
  y,
  color,
  dir = 1,
  every = 0.14,
  flight = 0.36,
}) => {
  if (t < t0 || t > t1 + flight) return null;
  const out: React.ReactNode[] = [];
  for (let s = t0; s <= t1 - flight * 0.5; s += every) {
    const u = (t - s) / flight;
    if (u > 0 && u < 1) out.push(<Hit key={s.toFixed(3)} x0={x0} x1={x1} y={y(s)} u={u} color={color} dir={dir} />);
  }
  return <>{out}</>;
};
