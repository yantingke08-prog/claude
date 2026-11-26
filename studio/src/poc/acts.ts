// When each bar prints, how much of each session's profile has been built, and what each session's POC is at frame f.
// Pure functions of the frame; every moment comes from events.json (= the voice).
import { E, clamp01 } from "./cue";
import { A, A_HOOK, B, C, C_TEST, D1, D2, D3, W, W_DROP, dpoc, prof, type Bar, type Day } from "./data";

export type LiveBar = Bar & { g: number };
const GROW = 5; // frames a bar takes to print

type Span = [number, number, () => number, () => number, (() => number)?];
const PRE = () => -1000;
const spans = (d: Day): Span[] => {
  switch (d.id) {
    case "A":
      return [
        [0, 5, () => 4, () => E("hLook") + 4],
        [6, 9, () => E("hUp"), () => E("hBack1") - 3],
        [10, 13, () => E("hBack1"), () => E("hBack1") + 14],
        [14, 19, () => E("hBack1") + 18, () => E("hDown") - 3],
        [20, 23, () => E("hDown"), () => E("hBack2") - 3],
        [24, 27, () => E("hBack2"), () => E("hBack2") + 12],
        [28, A_HOOK - 1, () => E("hBack2") + 16, () => E("hQ") + 30],
        [A_HOOK, A_HOOK + 3, () => E("aUp"), () => E("aUp") + 24],
        [A_HOOK + 4, A_HOOK + 6, () => E("aBack"), () => E("aBackP")],
        [A_HOOK + 7, A.bars.length - 1, () => E("aFill") + 6, () => E("aFill2") + 10],
      ];
    case "B": {
      const j = B_SWITCH;
      return [
        [0, 5, () => E("mDay2"), () => E("mBreak") - 4],
        [6, 9, () => E("mBreak"), () => E("mUp") + 8],
        [10, j - 1, () => E("mHold"), () => E("mMove") - 4],
        [j, j, () => E("mMove"), () => E("mMove")],
        [j + 1, B.bars.length - 1, () => E("mMove") + 8, () => E("mMig") + 10],
      ];
    }
    case "C":
      return [
        [0, 13, () => E("u1In") + 8, () => E("u1Up")],
        [14, C_TEST - 1, () => E("u2Leave"), () => E("u2Hit")],
        [C_TEST, C_TEST, () => E("e1"), () => E("e1")],
        [C_TEST + 1, C_TEST + 1, () => E("e2"), () => E("e2")],
        // the buyers' bar forms slowly while the voice reads the order book, and closes as it says 再进场
        [C_TEST + 2, C_TEST + 2, () => E("e3"), () => E("e3"), () => E("go") - E("e3")],
        [C_TEST + 3, C.bars.length - 1, () => E("go") + 4, () => E("go") + 64],
      ];
    case "W":
      return [
        [0, W_DROP - 1, PRE, PRE],
        [W_DROP, W_DROP, () => E("xThru") + 2, () => E("xThru") + 2],
        [W_DROP + 1, W_DROP + 1, () => E("xSlide"), () => E("xSlide")],
        [W_DROP + 2, W_DROP + 2, () => E("xSlide") + 9, () => E("xSlide") + 9],
        [W_DROP + 3, W.bars.length - 1, () => E("xDense") + 10, () => E("xDense") + 10],
      ];
    default:
      return [[0, d.bars.length - 1, PRE, PRE]];
  }
};

/** the bar of B whose close moves B's developing POC from the old value area up to the new one */
export const B_SWITCH = (() => {
  const dp = dpoc(B);
  return dp.findIndex((p) => p === dp[dp.length - 1]);
})();

const printCache = new Map<string, number[]>();
const growCache = new Map<string, number[]>();
/** frame at which each bar of d starts printing */
export const printAt = (d: Day) => {
  let p = printCache.get(d.id);
  if (p) return p;
  p = new Array(d.bars.length).fill(1e9);
  const gr = new Array(d.bars.length).fill(GROW);
  for (const [i0, i1, a, b, g] of spans(d)) {
    const fa = a();
    const fb = b();
    for (let i = i0; i <= i1; i++) {
      p[i] = Math.round(i1 === i0 ? fa : fa + ((fb - fa) * (i - i0)) / (i1 - i0));
      if (g) gr[i] = Math.max(1, g());
    }
  }
  printCache.set(d.id, p);
  growCache.set(d.id, gr);
  return p;
};
const growOf = (d: Day) => (printAt(d), growCache.get(d.id)!);

/** bars of d at frame f: g = 0 not yet, 0..1 printing (the body grows from open to close), 1 printed */
export const live = (d: Day, f: number): LiveBar[] => {
  const p = printAt(d);
  const gr = growOf(d);
  return d.bars.map((b, i) => {
    const g = clamp01((f - p[i]) / gr[i]);
    if (g >= 1 || g <= 0) return { ...b, g };
    const c = b.o + (b.c - b.o) * g;
    return { ...b, g, c, h: Math.max(b.o, c) + (b.h - Math.max(b.o, b.c)) * g, l: Math.min(b.o, c) - (Math.min(b.o, b.c) - b.l) * g, v: b.v * g };
  });
};
/** how many bars of d have (at least partly) printed, as a fraction: 12.4 = 12 done, the 13th 40 % */
export const printed = (d: Day, f: number) => {
  const gr = growOf(d);
  return printAt(d).reduce((s, t, i) => s + clamp01((f - t) / gr[i]), 0);
};

/** bars of d that make up its profile at frame f (fractional) */
export const profN = (d: Day, f: number) => {
  if (d.id === "A") {
    // the profile is built in one sweep when the voice says 按价格摞起来, from the bars already on the chart
    const t0 = E("pBuild");
    if (f < t0) return 0;
    const sweep = Math.min(A_HOOK, (A_HOOK * (f - t0)) / 54);
    return Math.max(sweep, f > t0 + 54 ? printed(A, f) : 0);
  }
  return printed(d, f);
};

/** profile rows at frame f: interpolated between whole bars so rows grow smoothly */
export const rowsAt = (d: Day, f: number) => {
  const n = profN(d, f);
  const k = Math.floor(n);
  const fr = n - k;
  const a = prof(d, Math.max(0, k));
  if (fr <= 0.001 || k >= d.bars.length) return { rows: a.rows, poc: k > 0 ? a.poc : NaN, n };
  const b = prof(d, k + 1);
  const rows = new Map<number, number>();
  new Set([...a.rows.keys(), ...b.rows.keys()]).forEach((p) => rows.set(p, (a.rows.get(p) ?? 0) * (1 - fr) + (b.rows.get(p) ?? 0) * fr));
  return { rows, poc: k > 0 ? a.poc : b.poc, n };
};

/** the developing POC price of d at frame f, gliding over `glide` frames when it moves to a new price */
export const pocAt = (d: Day, f: number, glide = 22) => {
  const dp = dpoc(d);
  const p = printAt(d);
  let cur = dp[0];
  let prev = dp[0];
  let since = 1e9;
  for (let i = 0; i < d.bars.length; i++) {
    const t = p[i] + growOf(d)[i]; // the POC updates once the bar has printed
    if (f < t) break;
    if (dp[i] !== cur) {
      prev = cur;
      cur = dp[i];
      since = f - t;
    }
  }
  if (since >= glide) return cur;
  const k = since / glide;
  const e = k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2;
  return prev + (cur - prev) * e;
};

export const DAYS = { A, B, C, D1, D2, D3, W };
