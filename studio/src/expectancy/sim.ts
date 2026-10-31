// Every number this video shows comes from these seeded simulations. The video and
// scripts/export-youtube.ts both import this file (Node runs it via type stripping), so
// on-screen charts, captions and the published .srt can never disagree.
import { mulberry32 } from "../lib/rng.ts";

export type Strategy = { pWin: number; win: number; loss: number };

export const STRATEGY_A: Strategy = { pWin: 0.7, win: 1, loss: 4 };
export const STRATEGY_B: Strategy = { pWin: 0.4, win: 2.5, loss: 1 };
export const expectancy = (s: Strategy) => s.pWin * s.win - (1 - s.pWin) * s.loss;

// ---------------- hook: two hand-designed 40-trade stories ----------------

export const HOOK_START = 20;

/** A: wins +1 seventy percent of the time, lets losers run, and one held loser wipes it out. */
export const hookPathA = (): { equity: number[]; liquidatedAt: number } => {
  const losses = new Set([4, 8, 13, 16, 20, 23, 26, 29, 32, 34, 36]);
  const equity = [HOOK_START];
  for (let i = 0; i < 40; i++) {
    const delta = i === 38 ? -26 : losses.has(i) ? -2 : 1;
    equity.push(equity[equity.length - 1] + delta);
    if (equity[equity.length - 1] <= 0) return { equity, liquidatedAt: i + 1 };
  }
  return { equity, liquidatedAt: -1 };
};

/** B: 16 wins of +2.5 and 24 losses of -1 - a rough start, then the edge shows. */
export const hookPathB = (): number[] => {
  const pattern = "LLWLL" + "LWLLW" + "LLWLL" + "WWLLW" + "LLWLW" + "LWLLW" + "WLWLL" + "WLWWL";
  const equity = [HOOK_START];
  for (const c of pattern) equity.push(equity[equity.length - 1] + (c === "W" ? STRATEGY_B.win : -STRATEGY_B.loss));
  return equity;
};

// ---------------- chapter 2: law of large numbers ----------------

export const LLN_TRADERS = 1000;
export const LLN_TRADES = 1000;

/** Cumulative P&L (fixed stake) of 1000 traders x 1000 trades, row-major [trader][trade]. */
const simulateLln = () => {
  const rand = mulberry32(2024);
  const stride = LLN_TRADES + 1;
  const pnl = new Float32Array(LLN_TRADERS * stride);
  const wins = new Uint8Array(LLN_TRADERS * LLN_TRADES);
  for (let t = 0; t < LLN_TRADERS; t++) {
    let v = 0;
    for (let i = 0; i < LLN_TRADES; i++) {
      const w = rand() < STRATEGY_B.pWin;
      wins[t * LLN_TRADES + i] = w ? 1 : 0;
      v += w ? STRATEGY_B.win : -STRATEGY_B.loss;
      pnl[t * stride + i + 1] = v;
    }
  }
  return { pnl, wins, stride };
};

const longestLossRun = (wins: Uint8Array, offset: number, n: number) => {
  let best = 0;
  let bestEnd = 0;
  let run = 0;
  for (let i = 0; i < n; i++) {
    run = wins[offset + i] ? 0 : run + 1;
    if (run > best) {
      best = run;
      bestEnd = i;
    }
  }
  return { length: best, start: bestEnd - best + 1 };
};

// ---------------- chapter 3: position sizing & the +50%/-40% coin ----------------

export const SIZING_TRADERS = 1000;
export const SIZING_TRADES = 300;

/** log10 of wealth when risking `fraction` of current capital per trade on strategy B. */
const simulateSizing = (fraction: number, seed: number) => {
  const rand = mulberry32(seed);
  const stride = SIZING_TRADES + 1;
  const logW = new Float32Array(SIZING_TRADERS * stride);
  const up = Math.log10(1 + STRATEGY_B.win * fraction);
  const down = Math.log10(1 - STRATEGY_B.loss * fraction);
  for (let t = 0; t < SIZING_TRADERS; t++) {
    let v = 0;
    for (let i = 0; i < SIZING_TRADES; i++) {
      v += rand() < STRATEGY_B.pWin ? up : down;
      logW[t * stride + i + 1] = v;
    }
  }
  return { logW, stride };
};

export const ERGO_PLAYERS = 10000;
export const ERGO_ROUNDS = 100;
export const ERGO_UP = 1.5;
export const ERGO_DOWN = 0.6;

const simulateErgodic = () => {
  const rand = mulberry32(77);
  const stride = ERGO_ROUNDS + 1;
  const logW = new Float32Array(ERGO_PLAYERS * stride);
  const up = Math.log10(ERGO_UP);
  const down = Math.log10(ERGO_DOWN);
  for (let p = 0; p < ERGO_PLAYERS; p++) {
    let v = 0;
    for (let r = 0; r < ERGO_ROUNDS; r++) {
      v += rand() < 0.5 ? up : down;
      logW[p * stride + r + 1] = v;
    }
  }
  return { logW, stride };
};

// ---------------- statistics helpers ----------------

export const column = (data: Float32Array, stride: number, rows: number, col: number) => {
  const out = new Float32Array(rows);
  for (let r = 0; r < rows; r++) out[r] = data[r * stride + col];
  return out;
};

export const shareBelow = (values: Float32Array, threshold: number) => {
  let n = 0;
  for (const v of values) if (v < threshold) n++;
  return n / values.length;
};

export const median = (values: Float32Array) => {
  const s = Float32Array.from(values).sort();
  return s[Math.floor(s.length / 2)];
};

export const quantile = (values: Float32Array, q: number) => {
  const s = Float32Array.from(values).sort();
  return s[Math.min(s.length - 1, Math.max(0, Math.floor(q * s.length)))];
};

const pct = (share: number) => {
  const v = share * 100;
  return v >= 10 ? v.toFixed(0) : v.toFixed(1);
};

// ---------------- the one entry point ----------------

let cache: ReturnType<typeof build> | null = null;

const build = () => {
  const lln = simulateLln();
  const at = (n: number) => column(lln.pnl, lln.stride, LLN_TRADERS, n);
  const runs = Array.from({ length: LLN_TRADERS }, (_, t) => longestLossRun(lln.wins, t * LLN_TRADES, LLN_TRADES));
  const streakTrader = runs.findIndex((r) => r.length >= 10 && r.length <= 12);

  const s2 = simulateSizing(0.02, 11);
  const s40 = simulateSizing(0.4, 12);
  const end2 = column(s2.logW, s2.stride, SIZING_TRADERS, SIZING_TRADES);
  const end40 = column(s40.logW, s40.stride, SIZING_TRADERS, SIZING_TRADES);

  const ergo = simulateErgodic();
  const ergoEnd = column(ergo.logW, ergo.stride, ERGO_PLAYERS, ERGO_ROUNDS);

  const stats = {
    // a single trade's odds are known exactly; a 1000-person sample would say ~63%
    p1: pct(1 - STRATEGY_B.pWin),
    p10: pct(shareBelow(at(10), 0)),
    p100: pct(shareBelow(at(100), 0)),
    p1000: pct(shareBelow(at(1000), 0)),
    streak10: pct(runs.filter((r) => r.length >= 10).length / LLN_TRADERS),
    m2: Math.pow(10, median(end2)).toFixed(1),
    r2: pct(shareBelow(end2, -1)),
    m40: Math.pow(10, median(end40)).toPrecision(2),
    r40: pct(shareBelow(end40, -1)),
    ergoMean: Math.round(Math.pow((ERGO_UP + ERGO_DOWN) / 2, ERGO_ROUNDS)).toString(),
    ergoLose: pct(shareBelow(ergoEnd, 0)),
    ergoMedianPct: (Math.pow(10, median(ergoEnd)) * 100).toFixed(1),
  };

  return {
    lln,
    streak: { trader: streakTrader, ...runs[streakTrader] },
    sizing: { s2, s40 },
    ergo,
    stats,
  };
};

export const getSim = () => (cache ??= build());
export type SimStats = ReturnType<typeof build>["stats"];
