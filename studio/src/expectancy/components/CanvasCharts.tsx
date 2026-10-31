import { useLayoutEffect, useMemo, useRef } from "react";
import { C } from "../../components/Hud";
import { MONO } from "../../lib/fonts";
import {
  column,
  ERGO_DOWN,
  ERGO_PLAYERS,
  ERGO_UP,
  getSim,
  LLN_TRADERS,
  LLN_TRADES,
  median,
  quantile,
  shareBelow,
  SIZING_TRADERS,
  STRATEGY_B,
  expectancy,
} from "../sim.ts";
import { GREEN, RED } from "./Charts";

type Draw = (ctx: CanvasRenderingContext2D, w: number, h: number) => void;

/** Canvas drawn synchronously in a layout effect, so Remotion screenshots a finished frame. */
const Canvas: React.FC<{ width: number; height: number; draw: Draw; style?: React.CSSProperties }> = ({ width, height, draw, style }) => {
  const ref = useRef<HTMLCanvasElement>(null);
  useLayoutEffect(() => {
    const ctx = ref.current!.getContext("2d")!;
    ctx.clearRect(0, 0, width, height);
    draw(ctx, width, height);
  });
  return <canvas ref={ref} width={width} height={height} style={{ width, height, display: "block", ...style }} />;
};

/** Cheap bloom for 2D canvas: add a blurred copy of the canvas on top of itself. */
const glowPass = (ctx: CanvasRenderingContext2D, blur = 7, alpha = 0.9) => {
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  ctx.filter = `blur(${blur}px)`;
  ctx.globalAlpha = alpha;
  ctx.drawImage(ctx.canvas, 0, 0);
  ctx.restore();
};

const font = (size: number, weight = 400) => `${weight} ${size}px ${MONO.fontFamily}`;

// ---------------- chapter 2: 1000 traders x 1000 trades ----------------

const FAN_LINES = 320;

/**
 * The law of large numbers, drawn. The x-axis always spans the trades revealed so far,
 * so growing `n` reads as a continuous zoom-out from 10 trades to 1000.
 */
export const FanChart: React.FC<{ n: number; width: number; height: number; expected: number }> = ({ n, width, height, expected }) => {
  const sim = getSim();
  const { pnl, stride } = sim.lln;
  const meanPath = useMemo(() => {
    const m = new Float32Array(LLN_TRADES + 1);
    for (let i = 0; i <= LLN_TRADES; i++) {
      let s = 0;
      for (let t = 0; t < LLN_TRADERS; t++) s += pnl[t * stride + i];
      m[i] = s / LLN_TRADERS;
    }
    return m;
  }, [pnl, stride]);

  const draw: Draw = (ctx, w, h) => {
    const histW = 170;
    const pad = { l: 70, r: histW + 40, t: 20, b: 46 };
    const W = w - pad.l - pad.r;
    const H = h - pad.t - pad.b;
    const k = Math.max(1, Math.min(LLN_TRADES, Math.floor(n)));
    const xMax = Math.max(10, n);
    const now = column(pnl, stride, LLN_TRADERS, k);
    const lo = Math.min(quantile(now, 0.003), -2);
    const hi = Math.max(quantile(now, 0.997), 0.4 * xMax, 3);
    const yMin = lo - (hi - lo) * 0.08;
    const yMax = hi + (hi - lo) * 0.08;
    const X = (i: number) => pad.l + (i / xMax) * W;
    const Y = (v: number) => pad.t + (1 - (v - yMin) / (yMax - yMin)) * H;

    // axes
    ctx.strokeStyle = "rgba(140,180,255,0.14)";
    ctx.lineWidth = 1;
    ctx.fillStyle = C.dim;
    ctx.font = font(15);
    ctx.textAlign = "center";
    for (const f of [0, 0.25, 0.5, 0.75, 1]) {
      const x = X(f * xMax);
      ctx.beginPath();
      ctx.moveTo(x, pad.t);
      ctx.lineTo(x, pad.t + H);
      ctx.stroke();
      ctx.fillText(String(Math.round(f * xMax)), x, pad.t + H + 28);
    }
    ctx.setLineDash([7, 7]);
    ctx.strokeStyle = RED;
    ctx.beginPath();
    ctx.moveTo(pad.l, Y(0));
    ctx.lineTo(pad.l + W, Y(0));
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.textAlign = "right";
    ctx.fillStyle = RED;
    ctx.fillText("0", pad.l - 12, Y(0) + 5);

    // individual traders
    const step = Math.max(1, Math.floor(k / 260));
    ctx.lineWidth = 1.3;
    ctx.globalCompositeOperation = "lighter";
    for (let t = 0; t < FAN_LINES; t++) {
      const row = t * stride;
      const up = pnl[row + k] >= 0;
      ctx.strokeStyle = up ? "rgba(92,232,255,0.13)" : "rgba(255,77,109,0.22)";
      ctx.beginPath();
      ctx.moveTo(X(0), Y(0));
      for (let i = step; i <= k; i += step) ctx.lineTo(X(i), Y(pnl[row + i]));
      if (n < LLN_TRADES && n > k) ctx.lineTo(X(n), Y(pnl[row + k] + (pnl[row + k + 1] - pnl[row + k]) * (n - k)));
      ctx.stroke();
    }
    ctx.globalCompositeOperation = "source-over";

    // expectation line and the realised average
    ctx.globalAlpha = expected;
    ctx.setLineDash([12, 8]);
    ctx.strokeStyle = C.amber;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(X(0), Y(0));
    ctx.lineTo(X(xMax), Y(expectancy(STRATEGY_B) * xMax));
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.globalAlpha = 1;
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(X(0), Y(0));
    for (let i = step; i <= k; i += step) ctx.lineTo(X(i), Y(meanPath[i]));
    ctx.stroke();

    // live distribution of everyone's P&L right now
    const bins = 46;
    const counts = new Array(bins).fill(0);
    for (const v of now) {
      const b = Math.floor(((v - yMin) / (yMax - yMin)) * bins);
      if (b >= 0 && b < bins) counts[b]++;
    }
    const cMax = Math.max(...counts);
    const bh = H / bins;
    const hx = pad.l + W + 34;
    for (let b = 0; b < bins; b++) {
      const v = yMin + ((b + 0.5) / bins) * (yMax - yMin);
      const len = (counts[b] / cMax) * histW;
      ctx.fillStyle = v >= 0 ? "rgba(92,232,255,0.75)" : "rgba(255,77,109,0.85)";
      ctx.fillRect(hx, pad.t + H - (b + 1) * bh + 1, len, bh - 2);
    }
    glowPass(ctx, 6, 0.7);
  };

  return <Canvas width={width} height={height} draw={draw} />;
};

export const fanStats = (n: number) => {
  const { pnl, stride } = getSim().lln;
  const k = Math.max(1, Math.min(LLN_TRADES, Math.floor(n)));
  return { trades: k, losing: shareBelow(column(pnl, stride, LLN_TRADERS, k), 0) };
};

// ---------------- chapter 2: one trader's 1000 trades ----------------

export const StreakStrip: React.FC<{ reveal: number; highlight: number; width: number }> = ({ reveal, highlight, width }) => {
  const { wins } = getSim().lln;
  const { trader, start, length } = getSim().streak;
  const cols = 50;
  const cell = width / cols;
  const rows = Math.ceil(LLN_TRADES / cols);
  const draw: Draw = (ctx) => {
    const shown = Math.floor(reveal * LLN_TRADES);
    for (let i = 0; i < shown; i++) {
      const w = wins[trader * LLN_TRADES + i] === 1;
      const inStreak = i >= start && i < start + length;
      const x = (i % cols) * cell;
      const y = Math.floor(i / cols) * cell;
      const dim = inStreak ? 1 : 1 - highlight * 0.8;
      ctx.globalAlpha = dim;
      ctx.fillStyle = w ? GREEN : RED;
      if (inStreak && highlight > 0) {
        ctx.fillStyle = "#ff6b84";
        ctx.shadowColor = RED;
        ctx.shadowBlur = 18 * highlight;
      }
      ctx.fillRect(x + 2, y + 2, cell - 4, cell - 4);
      ctx.shadowBlur = 0;
    }
    ctx.globalAlpha = 1;
  };
  return <Canvas width={width} height={rows * cell} draw={draw} />;
};

export const streakCell = (width: number) => {
  const { start, length } = getSim().streak;
  const cell = width / 50;
  return { x: (start % 50) * cell, y: Math.floor(start / 50) * cell, cell, length, wraps: (start % 50) + length > 50 };
};

// ---------------- chapter 3: risk 2% vs 40% on a log scale ----------------

const LOG_MIN = -6;
const LOG_MAX = 3;

export const LogFan: React.FC<{ which: "s2" | "s40"; n: number; width: number; height: number; color: string }> = ({ which, n, width, height, color }) => {
  const { logW, stride } = getSim().sizing[which];
  const draw: Draw = (ctx, w, h) => {
    const pad = { l: 78, r: 24, t: 20, b: 40 };
    const W = w - pad.l - pad.r;
    const H = h - pad.t - pad.b;
    const total = stride - 1;
    const X = (i: number) => pad.l + (i / total) * W;
    const Y = (v: number) => pad.t + (1 - (Math.min(LOG_MAX, Math.max(LOG_MIN, v)) - LOG_MIN) / (LOG_MAX - LOG_MIN)) * H;
    ctx.font = font(15);
    ctx.textAlign = "right";
    for (let e = LOG_MIN; e <= LOG_MAX; e++) {
      ctx.strokeStyle = e === 0 ? "rgba(255,255,255,0.45)" : "rgba(140,180,255,0.1)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(pad.l, Y(e));
      ctx.lineTo(pad.l + W, Y(e));
      ctx.stroke();
      ctx.fillStyle = e === 0 ? "#fff" : C.dim;
      ctx.fillText(e >= 0 ? `×${Math.pow(10, e)}` : `1/${Math.pow(10, -e)}`, pad.l - 10, Y(e) + 5);
    }
    // ruin threshold: 90% gone
    ctx.fillStyle = "rgba(255,77,109,0.08)";
    ctx.fillRect(pad.l, Y(-1), W, Y(LOG_MIN) - Y(-1));
    ctx.setLineDash([7, 7]);
    ctx.strokeStyle = RED;
    ctx.beginPath();
    ctx.moveTo(pad.l, Y(-1));
    ctx.lineTo(pad.l + W, Y(-1));
    ctx.stroke();
    ctx.setLineDash([]);

    const k = Math.max(1, Math.min(total, Math.floor(n)));
    ctx.globalCompositeOperation = "lighter";
    ctx.lineWidth = 1.2;
    for (let t = 0; t < 260; t++) {
      const row = t * stride;
      const ruined = logW[row + k] < -1;
      // wild 40% paths overlap far more, so they need a lighter touch to stay readable
      ctx.strokeStyle = ruined ? `rgba(255,77,109,${which === "s40" ? 0.07 : 0.2})` : `${color}${which === "s40" ? "14" : "26"}`;
      ctx.beginPath();
      ctx.moveTo(X(0), Y(0));
      for (let i = 1; i <= k; i++) ctx.lineTo(X(i), Y(logW[row + i]));
      ctx.stroke();
    }
    ctx.globalCompositeOperation = "source-over";
    // median path
    ctx.strokeStyle = "#fff";
    ctx.lineWidth = 3;
    ctx.beginPath();
    for (let i = 0; i <= k; i += 2) {
      const m = median(column(logW, stride, SIZING_TRADERS, i));
      if (i === 0) ctx.moveTo(X(0), Y(m));
      else ctx.lineTo(X(i), Y(m));
    }
    ctx.stroke();
    glowPass(ctx, 6, 0.6);
  };
  return <Canvas width={width} height={height} draw={draw} />;
};

export const logFanStats = (which: "s2" | "s40", n: number) => {
  const { logW, stride } = getSim().sizing[which];
  const k = Math.max(0, Math.min(stride - 1, Math.floor(n)));
  const col = column(logW, stride, SIZING_TRADERS, k);
  return { median: Math.pow(10, median(col)), ruined: shareBelow(col, -1) };
};

// ---------------- chapter 3: +50% / -40%, ten thousand players ----------------

const E_MIN = -6;
const E_MAX = 5;

export const ErgoHistogram: React.FC<{ round: number; width: number; height: number }> = ({ round, width, height }) => {
  const { logW, stride } = getSim().ergo;
  const r = Math.max(0, Math.min(stride - 1, Math.floor(round)));
  const draw: Draw = (ctx, w, h) => {
    const pad = { l: 40, r: 40, t: 70, b: 60 };
    const W = w - pad.l - pad.r;
    const H = h - pad.t - pad.b;
    const X = (e: number) => pad.l + ((e - E_MIN) / (E_MAX - E_MIN)) * W;
    // After r rounds wealth can only be up^k * down^(r-k): bin by k (number of heads)
    // exactly, otherwise fixed-width bins alias into alternating empty/full columns.
    const up = Math.log10(ERGO_UP);
    const down = Math.log10(ERGO_DOWN);
    const counts = new Array(r + 1).fill(0);
    for (let p = 0; p < ERGO_PLAYERS; p++) counts[Math.round((logW[p * stride + r] - r * down) / (up - down))]++;
    const cMax = Math.max(...counts);
    const bw = Math.min(46, Math.max(6, (X(up - down) - X(0)) * 0.82));
    for (let k = 0; k <= r; k++) {
      if (!counts[k]) continue;
      const e = k * up + (r - k) * down;
      if (e < E_MIN || e > E_MAX) continue;
      const h = (counts[k] / cMax) * H;
      const x = X(e) - bw / 2;
      const g = ctx.createLinearGradient(0, pad.t + H - h, 0, pad.t + H);
      const col = e < 0 ? RED : "#5ce8ff";
      g.addColorStop(0, col);
      g.addColorStop(1, `${col}22`);
      ctx.fillStyle = g;
      ctx.fillRect(x, pad.t + H - h, bw, h);
      ctx.fillStyle = "#fff";
      ctx.fillRect(x, pad.t + H - h, bw, 2);
    }
    // axis
    ctx.font = font(15);
    ctx.textAlign = "center";
    ctx.fillStyle = C.dim;
    for (let e = E_MIN; e <= E_MAX; e += 2) {
      ctx.fillText(e >= 0 ? `×${Math.pow(10, e)}` : `1/${Math.pow(10, -e)}`, X(e), pad.t + H + 30);
    }
    const marker = (e: number, color: string, label: string, row: number) => {
      const x = X(Math.min(E_MAX, Math.max(E_MIN, e)));
      ctx.strokeStyle = color;
      ctx.lineWidth = 2.5;
      ctx.setLineDash(row === 2 ? [6, 6] : []);
      ctx.beginPath();
      ctx.moveTo(x, pad.t - 10 + row * 24);
      ctx.lineTo(x, pad.t + H);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = color;
      ctx.font = font(18, 700);
      ctx.fillText(label, x, pad.t - 18 + row * 24);
    };
    marker(0, "rgba(255,255,255,0.7)", "", 2);
    marker(r * Math.log10((ERGO_UP + ERGO_DOWN) / 2), C.amber, "MEAN", 0);
    marker(median(column(logW, stride, ERGO_PLAYERS, r)), "#5ce8ff", "MEDIAN", 1);
    glowPass(ctx, 5, 0.6);
  };
  return <Canvas width={width} height={height} draw={draw} />;
};

export const ergoStats = (round: number) => {
  const { logW, stride } = getSim().ergo;
  const r = Math.max(0, Math.min(stride - 1, Math.floor(round)));
  const col = column(logW, stride, ERGO_PLAYERS, r);
  return { round: r, mean: Math.pow((ERGO_UP + ERGO_DOWN) / 2, r), median: Math.pow(10, median(col)), losing: shareBelow(col, 0) };
};
