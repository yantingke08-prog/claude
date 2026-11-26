// Order-flow layers (红涨绿跌: buy / up = red, sell / down = green):
// footprint cells, time & sales ticker, live HUD readouts, volume and Delta bars.
// All numbers are seeded synthetic data (教学示意).
import React from "react";
import { mulberry32 } from "../lib/rng";
import { prog } from "./anim";
import { useChromeIn } from "./ctx";
import { alpha, Box, type Candle, type PriceMap } from "./kit";
import { C, DN, DNT, FONT, L, MONO, UP, UPT } from "./theme";

// ---------------- prints (one stream drives ticker + HUD) ----------------
export type Print = { t: number; side: 1 | -1; size: number; p: number };

/** Seeded prints every `every` s between t0 and t1. side: fixed or a buy-probability. */
export const flow = (seed: number, t0: number, t1: number, opts: { every?: number; buyP?: number; lo?: number; hi?: number; p: (t: number) => number; big?: number }): Print[] => {
  const r = mulberry32(seed);
  const { every = 0.16, buyP = 0.5, lo = 2, hi = 60, p, big = 0 } = opts;
  const out: Print[] = [];
  for (let t = t0; t < t1; t += every * (0.6 + r() * 0.8)) {
    const side: 1 | -1 = r() < buyP ? 1 : -1;
    let size = Math.round(lo + (hi - lo) * Math.pow(r(), 2.2));
    if (big && r() < big) size *= 4;
    out.push({ t, side, size, p: p(t) });
  }
  return out;
};
export const merge = (...lists: Print[][]) => lists.flat().sort((a, b) => a.t - b.t);
export const totals = (ps: Print[], t: number) => {
  let vol = 0;
  let delta = 0;
  for (const x of ps) {
    if (x.t > t) break;
    vol += x.size;
    delta += x.side * x.size;
  }
  return { vol, delta };
};
export const fmtN = (n: number) => Math.round(n).toLocaleString("en-US");
export const fmtD = (n: number) => `${n >= 0 ? "+" : "−"}${fmtN(Math.abs(n))}`;
export const tickPrice = (p: number) => (3400 + p * 0.25).toFixed(2);

/** Time & sales strip at the bottom of the stage: newest print enters on the left. */
export const Ticker: React.FC<{ t: number; prints: Print[]; o?: number; y?: number }> = ({ t, prints, o: o0 = 1, y = 1300 }) => {
  const o = o0 * useChromeIn();
  if (o <= 0) return null;
  let n = 0;
  while (n < prints.length && prints[n].t <= t) n++;
  const shown = prints.slice(Math.max(0, n - 6), n).reverse();
  const slide = shown.length ? 1 - prog(t, shown[0].t, 0.12) : 0;
  const CW = 184;
  return (
    <div style={{ position: "absolute", left: L.left, top: y - 34, width: L.right - L.left, height: 84, overflow: "hidden", opacity: o, fontFamily: MONO }}>
      <div style={{ position: "absolute", left: 0, top: 0, fontFamily: FONT, fontSize: 20, color: C.sub, letterSpacing: 2 }}>成交明细 · 逐笔</div>
      {shown.map((x, k) => {
        const big = x.size >= 100;
        const col = x.side > 0 ? UPT : DNT;
        return (
          <div
            key={`${x.t.toFixed(3)}-${k}`}
            data-qa={k < 5 ? "tag" : undefined}
            style={{
              position: "absolute",
              left: (k - slide) * (CW + 6),
              top: 32,
              width: CW,
              height: 44,
              lineHeight: "44px",
              borderRadius: 6,
              textAlign: "center",
              fontSize: big ? 23 : 21,
              fontWeight: big ? 700 : 400,
              color: big ? C.text : col,
              background: big ? alpha(x.side > 0 ? UP : DN, 0.85) : alpha(x.side > 0 ? UP : DN, 0.14),
              border: `1px solid ${alpha(x.side > 0 ? UP : DN, 0.6)}`,
              opacity: k === 0 ? 1 - slide : Math.max(0, 1 - Math.max(0, k - 4.2)),
            }}
          >
            {x.side > 0 ? "▲" : "▼"} {tickPrice(x.p)} ×{x.size}
          </div>
        );
      })}
    </div>
  );
};

/** Live readouts above the stage (成交量 / Delta / 最新价 …). */
export type Readout = { label: string; value: string; color: string };
export const Hud: React.FC<{ items: Readout[]; o?: number; y?: number }> = ({ items, o: o0 = 1, y = 288 }) => {
  const o = o0 * useChromeIn();
  if (o <= 0) return null;
  const w = (L.right - L.left) / items.length;
  return (
    <div style={{ position: "absolute", left: L.left, top: y, width: L.right - L.left, height: 56, opacity: o, fontFamily: FONT }}>
      {items.map((it, i) => (
        <div key={i} data-qa="tag" style={{ position: "absolute", left: i * w + (i === 0 ? 0 : 8), top: 0, display: "flex", alignItems: "baseline", gap: 10, whiteSpace: "nowrap" }}>
          <span style={{ fontSize: 20, color: C.sub, letterSpacing: 1 }}>{it.label}</span>
          <span style={{ fontFamily: MONO, fontSize: 30, fontWeight: 700, color: it.color }}>{it.value}</span>
        </div>
      ))}
    </div>
  );
};

// ---------------- footprint ----------------
export type FpRow = { lo: number; hi: number; bid: number; ask: number }; // bid = 主动卖 hit the bid, ask = 主动买 lifted the ask
export const fpRows = (k: Candle, n: number, seed: number, bias: number, scale = 1): FpRow[] => {
  const r = mulberry32(seed);
  const step = (k.h - k.l) / n;
  const peak = ((k.c - k.l) / (k.h - k.l)) * (n - 1);
  return Array.from({ length: n }, (_, i) => {
    const base = (30 + 300 * Math.exp(-Math.pow((i - peak) / (n * 0.45), 2)) * (0.6 + r() * 0.6)) * scale;
    const buy = Math.min(0.93, Math.max(0.07, 0.5 + bias * 0.32 + (r() - 0.5) * 0.36));
    return { lo: k.l + i * step, hi: k.l + (i + 1) * step, bid: Math.round(base * (1 - buy)), ask: Math.round(base * buy) };
  });
};
export const imb = (row: FpRow): 1 | -1 | 0 => (row.ask >= row.bid * 3 && row.ask > 40 ? 1 : row.bid >= row.ask * 3 && row.bid > 40 ? -1 : 0);
export const pocIndex = (rows: FpRow[]) => rows.reduce((bi, r, i, a) => (r.bid + r.ask > a[bi].bid + a[bi].ask ? i : bi), 0);

/**
 * Footprint column: per price row "卖 × 买" (sell volume at bid × buy volume at ask).
 * Imbalance (≥3×) cells fill in the side's colour; the POC row gets an amber frame.
 * `reveal` 0→1 shows rows from `from` ("bottom" | "top").
 */
export const Footprint: React.FC<{ x: number; y: PriceMap; rows: FpRow[]; reveal?: number; from?: "bottom" | "top"; o?: number; cellW?: number; poc?: boolean; z?: number; dim?: number }> = ({
  x,
  y,
  rows,
  reveal = 1,
  from = "bottom",
  o = 1,
  cellW = 74,
  poc = true,
  z = 16,
  dim = 0,
}) => {
  if (o <= 0 || reveal <= 0) return null;
  const n = rows.length;
  const shown = Math.ceil(reveal * n);
  const pi = pocIndex(rows);
  return (
    <div style={{ position: "absolute", left: 0, top: 0, opacity: o, transform: `translateZ(${z}px)`, transformStyle: "preserve-3d" }}>
      {rows.map((r, i) => {
        const vis = from === "bottom" ? i < shown : i >= n - shown;
        if (!vis) return null;
        const top = y(r.hi);
        const h = Math.max(16, y(r.lo) - top - 2);
        const fs = Math.max(15, Math.min(22, h - 6));
        const m = imb(r);
        const cell = (v: number, side: 1 | -1, left: number) => {
          const hot = m === side;
          return (
            <div
              style={{
                position: "absolute",
                left,
                top,
                width: cellW,
                height: h,
                lineHeight: `${h}px`,
                textAlign: side < 0 ? "right" : "left",
                padding: "0 8px",
                boxSizing: "border-box",
                fontFamily: MONO,
                fontSize: fs,
                fontWeight: hot ? 700 : 400,
                color: hot ? C.text : side > 0 ? UPT : DNT,
                background: hot ? alpha(side > 0 ? UP : DN, 0.8) : alpha(side > 0 ? UP : DN, 0.08 + 0.22 * Math.min(1, v / 300)),
                opacity: 1 - dim * 0.7,
              }}
            >
              {v}
            </div>
          );
        };
        return (
          <React.Fragment key={i}>
            {cell(r.bid, -1, x)}
            {cell(r.ask, 1, x + cellW + 2)}
            {poc && i === pi ? <div style={{ position: "absolute", left: x - 3, top: top - 3, width: cellW * 2 + 8, height: h + 6, border: `2px solid ${C.amber}`, borderRadius: 4, transform: "translateZ(2px)" }} /> : null}
          </React.Fragment>
        );
      })}
    </div>
  );
};
export const fpWidth = (cellW = 74) => cellW * 2 + 2;

// ---------------- volume + delta under a chart ----------------
export const VolBars: React.FC<{ X: number[]; ks: Candle[]; vols: number[]; yBase: number; hMax: number; w: number; grow?: (i: number) => number; hi?: number; o?: number }> = ({
  X,
  ks,
  vols,
  yBase,
  hMax,
  w,
  grow = () => 1,
  hi = -1,
  o = 1,
}) => {
  const vMax = Math.max(...vols);
  return (
    <>
      {vols.map((v, i) => {
        const g = grow(i);
        if (g <= 0 || !ks[i]) return null;
        const h = (v / vMax) * hMax * g;
        const col = i === hi ? C.amber : ks[i].c >= ks[i].o ? UP : DN;
        return <Box key={i} x={X[i] - w / 2} y={yBase - h} w={w} h={h} d={14} color={col} o={o * (i === hi ? 1 : 0.55)} />;
      })}
    </>
  );
};

/** Per-bar Delta (buy − sell): red up from the zero line, green down. */
export const DeltaBars: React.FC<{ X: number[]; deltas: number[]; y0: number; hMax: number; w: number; grow?: (i: number) => number; o?: number; dMax?: number }> = ({
  X,
  deltas,
  y0,
  hMax,
  w,
  grow = () => 1,
  o = 1,
  dMax,
}) => {
  const m = dMax ?? Math.max(...deltas.map(Math.abs));
  return (
    <div style={{ position: "absolute", left: 0, top: 0, opacity: o, transformStyle: "preserve-3d" }}>
      <div style={{ position: "absolute", left: X[0] - w, top: y0, width: X[X.length - 1] - X[0] + 2 * w, height: 1, background: "rgba(145,160,181,0.35)" }} />
      {deltas.map((d, i) => {
        const g = grow(i);
        if (g <= 0) return null;
        const h = (Math.abs(d) / m) * hMax * g;
        return <Box key={i} x={X[i] - w / 2} y={d >= 0 ? y0 - h : y0} w={w} h={Math.max(2, h)} d={10} color={d >= 0 ? UP : DN} o={0.85} />;
      })}
    </div>
  );
};

/** Small axis title for a sub-panel (e.g. "Delta", "成交量"). */
export const AxisTitle: React.FC<{ x: number; y: number; text: string }> = ({ x, y, text }) => (
  <div style={{ position: "absolute", left: x, top: y - 13, fontFamily: FONT, fontSize: 20, color: C.sub, letterSpacing: 1, transform: "translateZ(8px)", whiteSpace: "nowrap" }}>{text}</div>
);
