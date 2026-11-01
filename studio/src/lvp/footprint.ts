import { mulberry32 } from "../lib/rng";

/**
 * Synthetic footprint sessions for V2, in world units: x is time, y is price.
 * Every candle is a column of price rows; each row prints sellers hitting the bid (left) and
 * buyers lifting the offer (right). Seeded, so every render tab builds the identical tape.
 */
export const FP = {
  RH: 0.064, // one tick in world units
  SPACING: 1.08,
  BODY_W: 0.07,
  GAP: 0.018, // between the body and the bars
  BAR_MAX: 0.4,
  ADV: 0.029, // digit advance
  GLYPH_H: 0.032, // cap height
};

export type FpRow = { r: number; bid: number; ask: number; t: number; imbBid: boolean; imbAsk: boolean };
export type FpCandle = {
  x: number;
  xl: number;
  xr: number;
  open: number;
  close: number;
  high: number;
  low: number;
  /** intra-candle price path as [time 0..1, row] knots */
  path: [number, number][];
  rows: FpRow[];
  poc: number;
  delta: number;
  total: number;
};

export type FpSession = { candles: FpCandle[]; y0: number; maxVol: number };

/** Row (fractional) where the candle's price is at time `t` (0..1) of its life. */
export const priceRowAt = (c: FpCandle, t: number) => {
  const k = c.path;
  if (t <= 0) return k[0][1];
  for (let i = 1; i < k.length; i++) {
    if (t <= k[i][0]) {
      const u = (t - k[i - 1][0]) / (k[i][0] - k[i - 1][0]);
      return k[i - 1][1] + (k[i][1] - k[i - 1][1]) * u;
    }
  }
  return k[k.length - 1][1];
};

export const buildSession = (opts: { seed: number; n: number; x0: number; y0: number; startRow: number; drift: number[] }): FpSession => {
  const rand = mulberry32(opts.seed);
  const candles: FpCandle[] = [];
  let open = opts.startRow;
  let maxVol = 0;
  for (let j = 0; j < opts.n; j++) {
    const x = opts.x0 + j * FP.SPACING;
    const drift = opts.drift[j % opts.drift.length];
    const close = Math.round(open + drift + (rand() - 0.5) * 6);
    const up = close >= open;
    const high = Math.max(open, close) + 1 + Math.floor(rand() * 4);
    const low = Math.min(open, close) - 1 - Math.floor(rand() * 4);
    const a = 0.22 + rand() * 0.18;
    const b = 0.6 + rand() * 0.2;
    const path: [number, number][] = up
      ? [[0, open], [a, low], [b, high], [1, close]]
      : [[0, open], [a, high], [b, low], [1, close]];
    const visit = (r: number) => {
      for (let s = 0; s <= 200; s++) {
        const t = s / 200;
        const p = (() => {
          for (let i = 1; i < path.length; i++)
            if (t <= path[i][0]) return path[i - 1][1] + ((path[i][1] - path[i - 1][1]) * (t - path[i - 1][0])) / (path[i][0] - path[i - 1][0]);
          return close;
        })();
        if (Math.abs(p - r) <= 0.5) return t;
      }
      return 1;
    };
    // a volume profile inside the candle: heavy near its POC, thin at the extremes
    const poc = Math.round(low + (high - low) * (0.3 + rand() * 0.4));
    const span = high - low + 1;
    const rows: FpRow[] = [];
    for (let r = low; r <= high; r++) {
      const edge = r === low || r === high;
      const v = edge && rand() < 0.5 ? rand() * 40 : 40 + 320 * Math.exp(-(((r - poc) / (span * 0.32)) ** 2)) + rand() * 120;
      const lean = (up ? 0.58 : 0.42) + (rand() - 0.5) * 0.5;
      const ask = Math.round(v * lean);
      const bid = Math.round(v * (1 - lean));
      rows.push({ r, bid, ask, t: visit(r), imbBid: false, imbAsk: false });
      maxVol = Math.max(maxVol, bid, ask);
    }
    // diagonal imbalances, as a footprint reads them: ask at r vs bid one tick below
    for (let i = 0; i < rows.length; i++) {
      const below = rows[i - 1];
      const above = rows[i + 1];
      if (below && rows[i].ask >= Math.max(40, below.bid * 3)) rows[i].imbAsk = true;
      if (above && rows[i].bid >= Math.max(40, above.ask * 3)) rows[i].imbBid = true;
    }
    const total = rows.reduce((s, r) => s + r.bid + r.ask, 0);
    const delta = rows.reduce((s, r) => s + r.ask - r.bid, 0);
    candles.push({ x, xl: x - FP.SPACING / 2, xr: x + FP.SPACING / 2, open, close, high, low, path, rows, poc, delta, total });
    open = close;
  }
  return { candles, y0: opts.y0, maxVol };
};

/** World y of row `r`. */
export const rowY = (s: FpSession, r: number) => s.y0 + r * FP.RH;

/** The tape V2 rides along, plus two older sessions printed deeper in the room. */
export const SESSIONS = {
  main: buildSession({ seed: 17, n: 13, x0: -6.9, y0: -1.25, startRow: 0, drift: [4, 6, -3, 7, 5, -6, 8, 3, -4, 9, 6, -2, 5] }),
  mid: buildSession({ seed: 41, n: 16, x0: -8.2, y0: -2.6, startRow: 10, drift: [3, -5, 6, 4, -7, 5, 2, 7, -3, 6, -4, 5, 3, 6, -2, 4] }),
  far: buildSession({ seed: 73, n: 20, x0: -10.5, y0: -3.4, startRow: 22, drift: [-4, 3, 5, -6, 4, 7, -3, 2, 6, -5, 4, 3, -2, 6, 5, -4, 3, 7, -3, 4] }),
};

/** Smoothed world y of the main session's price at time x: what the camera follows. */
export const mainPriceAt = (x: number) => {
  const s = SESSIONS.main;
  const cs = s.candles;
  const mid = (c: FpCandle) => rowY(s, (c.open + c.close) / 2);
  if (x <= cs[0].x) return mid(cs[0]);
  for (let i = 1; i < cs.length; i++) {
    if (x <= cs[i].x) {
      const u = (x - cs[i - 1].x) / (cs[i].x - cs[i - 1].x);
      return mid(cs[i - 1]) + (mid(cs[i]) - mid(cs[i - 1])) * u;
    }
  }
  return mid(cs[cs.length - 1]);
};
