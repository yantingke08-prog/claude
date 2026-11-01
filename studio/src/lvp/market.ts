import { mulberry32 } from "../lib/rng";

/**
 * A synthetic order-flow session for the V1 heatmap, in world units on the z = 0 plane:
 * x is time, y is price. Seeded, so every render tab builds the identical market.
 */
export const MARKET = (() => {
  const X0 = -7.6;
  const X1 = 7.6;
  const N = 640;
  const rand = mulberry32(2024);
  const gauss = () => (rand() + rand() + rand() + rand() - 2) / 1.15;

  // Price: a random walk with momentum, smoothed, then nudged into a rally so it ends high.
  const raw: number[] = [];
  let v = 0;
  let p = -0.4;
  for (let i = 0; i < N; i++) {
    v = v * 0.86 + gauss() * 0.035;
    p += v;
    raw.push(p);
  }
  const smooth = raw.map((_, i) => {
    let s = 0;
    let n = 0;
    for (let k = -4; k <= 4; k++) {
      const j = Math.min(N - 1, Math.max(0, i + k));
      s += raw[j];
      n++;
    }
    return s / n;
  });
  const mean = smooth.reduce((a, b) => a + b, 0) / N;
  const price = smooth.map((y, i) => (y - mean) * 0.75 - 0.5 + (i / N) * 1.1);

  const xAt = (i: number) => X0 + ((X1 - X0) * i) / (N - 1);
  const priceAt = (x: number) => {
    const f = ((x - X0) / (X1 - X0)) * (N - 1);
    const i = Math.min(N - 2, Math.max(0, Math.floor(f)));
    const t = Math.min(1, Math.max(0, f - i));
    return price[i] * (1 - t) + price[i + 1] * t;
  };

  // Resting liquidity: walls at fixed price levels that live until price trades through them.
  const walls = Array.from({ length: 64 }, () => {
    const y = -2.9 + rand() * 5.8;
    const start = X0 + rand() * 9;
    let end = X1;
    for (let x = start + 0.4; x < X1; x += 0.05) {
      if (Math.abs(priceAt(x) - y) < 0.04) {
        end = x;
        break;
      }
    }
    return { y, start, end, strength: 0.25 + Math.pow(rand(), 1.8) * 0.75, width: 0.018 + rand() * 0.045 };
  });

  /** Liquidity 0..1 resting at (x, y). */
  const liquidity = (x: number, y: number) => {
    let L = 0;
    for (const w of walls) {
      if (x < w.start || x > w.end) continue;
      const fade = Math.min(1, (x - w.start) / 0.6) * Math.min(1, (w.end - x) / 0.15 + 0.25);
      L += w.strength * fade * Math.exp(-((y - w.y) ** 2) / (2 * w.width * w.width));
    }
    // a thin book near the touch, thicker a few ticks away
    const d = Math.abs(y - priceAt(x));
    L += 0.26 * Math.exp(-((d - 0.35) ** 2) / 0.1);
    // dim background book: uneven horizontal banding, like any real heatmap
    L += 0.2 * (0.5 + 0.5 * Math.sin(y * 7.3 + Math.sin(x * 0.6) * 1.3)) * (0.5 + 0.5 * Math.sin(y * 17.1 + x * 0.35));
    return Math.min(1, L);
  };

  return { X0, X1, N, price, xAt, priceAt, liquidity, walls };
})();
