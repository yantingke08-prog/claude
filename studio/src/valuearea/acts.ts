// What each set shows at frame f. Pure functions of the frame; every change starts on a spoken word (events.json).
// world.tsx draws these states in 3D, hud.tsx reads the same states for its labels.
import { E, clamp01, ease, lerp, out3, ramp } from "./cue";
import { ACCEPT, HOOK, HOOK_BREAK, HOOK_HOLD, MAIN, REJECT, RJ_BACK, RJ_MIRROR, RJ_POKE, RJ_UP_END, WATCH, type Candle } from "./data";

/** fractional candle count printed between two frames (one candle at a time, left to right) */
const print = (f: number, a: number, b: number, n0: number, n1: number) => lerp(n0, n1, clamp01((f - a) / Math.max(1, b - a)));
/** piecewise: [frame, count] keys, linear between, held after */
const counts = (f: number, ks: [number, number][]) => {
  let n = ks[0][1];
  for (let i = 1; i < ks.length; i++) {
    const [a, na] = ks[i - 1];
    const [b, nb] = ks[i];
    if (f >= a) n = print(f, a, b, na, nb);
  }
  return n;
};
const pulse = (f: number, a: number, d = 24) => (f < a ? 0 : Math.max(0, 1 - (f - a) / d)) * out3((f - a) / 4);

// ---------------------------------------------------------------- 0 hook
export const hookAct = (f: number) => ({
  n: counts(f, [
    [0, 3],
    [E("L01_撑住") + 6, HOOK_HOLD + 1],
    [E("L01_一碰就穿"), HOOK_BREAK - 1],
    [E("L01_一碰就穿") + 10, HOOK_BREAK + 2],
    [E("L02_那条线"), HOOK.length],
  ]),
  line: ramp(f, E("L01_同一个价格"), 14) * (1 - 0.7 * ramp(f, E("L02_那条线"), 14)),
  hold: pulse(f, E("L01_撑住"), 30),
  pierce: pulse(f, E("L01_一碰就穿") + 8, 30),
  profile: ramp(f, E("L02_成交最挤"), 26),
  marks: [0, 1, 2].map((k) => ramp(f, E("L02_三个数") + k * 5, 10)),
  draw: ramp(f, E("L03_划支撑"), 16) * (1 - ramp(f, E("L03_划支撑") + 30, 12)),
});

// ---------------------------------------------------------------- 1 main (profile, three numbers, trap, poll)
export const mainAct = (f: number) => {
  const g0 = E("L04_成交量分布");
  const g1 = E("L05_成交了多少") + 10;
  const rep0 = E("L17_在里面");
  const rep1 = E("L19_边缘") + 8;
  const focus = f >= E("L13_下沿") ? "val" : f >= E("L12_上沿") ? "vah" : f >= E("L11_成交量") ? "poc" : null;
  const focusK = f >= E("L14_第一反应") ? 0 : 1;
  return {
    /** profile growth per row: 0..1 at frame f (row-staggered, heavier rows finish later) */
    grow: (row: number, v: number) => ease((f - g0 - (row % 5) * 2) / Math.max(10, (g1 - g0) * (0.45 + 0.55 * v))),
    ladder: ramp(f, E("L05_每个价位"), 14),
    scan: f >= E("L05_每个价位") && f < E("L05_成交了多少") + 8 ? clamp01((f - E("L05_每个价位")) / Math.max(1, E("L05_成交了多少") + 8 - E("L05_每个价位"))) : -1,
    caps: pulse(f, E("L05_成交了多少"), 36),
    period: ramp(f, E("L05_一段时间"), 18) * 0.3,
    dense: ramp(f, E("L06_成交最密"), 16),
    band: ramp(f, E("L06_价值区"), 22),
    chips: f >= E("L08_真金白银") && f < E("L08_end") + 30 ? (f - E("L08_真金白银")) : -1,
    chipRate: ramp(f, E("L08_一笔一笔"), 10),
    chipEnd: E("L08_end"),
    pocRow: ramp(f, E("L09_成交最密的地方"), 14),
    pocLine: ramp(f, E("L09_最认的价"), 20),
    focus,
    focusK,
    vahLine: ramp(f, E("L06_价值区") + 10, 16),
    wall: ramp(f, E("L16_一堵墙"), 10) * (1 - ramp(f, E("L17_一个区间"), 16)),
    /** the replay of the period by a price marker: fractional candle index, or -1 */
    replay: f >= rep0 ? Math.min(MAIN.length - 1, lerp(0, MAIN.length - 1, clamp01((f - rep0) / Math.max(1, rep1 - rep0)))) : -1,
    edges: ramp(f, E("L19_边缘"), 14),
    poll: f >= E("L20_上沿") ? 1 : 0,
    trick: ramp(f, E("L24_最爱骗"), 14),
  };
};

// ---------------------------------------------------------------- 2 accept
export const acceptAct = (f: number) => ({
  n: counts(f, [
    [E("L25_冲到上沿"), 6],
    [E("L25_成交继续放大") + 24, 10],
    [E("L26_回踩"), 10],
    [E("L26_站住") + 4, 12],
    [E("L26_接受"), 12],
    [E("L26_end"), ACCEPT.length],
  ]),
  volHi: ramp(f, E("L25_成交继续放大"), 12),
  test: pulse(f, E("L26_站住"), 34),
  newVa: ramp(f, E("L26_接受"), 26),
});

// ---------------------------------------------------------------- 3 reject
export const rejectAct = (f: number) => ({
  n: counts(f, [
    [E("L27_冲上去"), RJ_POKE],
    [E("L27_没人跟"), RJ_POKE + 1],
    [E("L27_缩回来"), RJ_POKE + 1],
    [E("L27_缩回来") + 8, RJ_BACK + 1],
    [E("L28_不认"), RJ_BACK + 1],
    [E("L28_往下也一样"), RJ_UP_END + 1],
    [E("L28_往下也一样") + 26, RJ_MIRROR + 1],
    [E("L28_end"), REJECT.length],
  ]),
  thin: ramp(f, E("L27_没人跟"), 12),
  snap: pulse(f, E("L27_缩回来") + 6, 30),
  mirror: pulse(f, E("L28_往下也一样") + 26, 30),
});

// ---------------------------------------------------------------- 4 watch
export const watchAct = (f: number) => ({
  n: print(f, E("L29_碰到线") - 30, E("L29_碰到线"), 6, WATCH.length),
  touch: pulse(f, E("L29_碰到线"), 30),
  middle: ramp(f, E("L31_中间"), 14) * (1 - ramp(f, E("L32_边缘"), 12)),
  edges: ramp(f, E("L32_边缘"), 14),
  up: ramp(f, E("L33_站住了"), 22),
  newVa: ramp(f, E("L33_站住了") + 12, 24),
  down: ramp(f, E("L34_站不住"), 22),
  pull: ramp(f, E("L35_旧价值"), 26),
});

// ---------------------------------------------------------------- 5 map
export const mapAct = (f: number) => ({
  button: ramp(f, E("L36_买卖按钮"), 12) * (1 - ramp(f, E("L37_地图"), 16)),
  press: pulse(f, E("L36_买卖按钮") + 10, 20),
  rise: (row: number) => ease((f - E("L37_地图") - row * 0.6) / 22),
  poc: ramp(f, E("L38_最认可"), 14),
  thin: ramp(f, E("L39_稀薄"), 14),
  back: ramp(f, E("L40_回到价值区"), 34),
  backOn: ramp(f, E("L40_回到价值区") - 0, 8),
  ask: ramp(f, E("L42_认不认"), 18),
});

// ---------------------------------------------------------------- 6 end
export const endAct = (f: number) => ({
  poc: ramp(f, E("L46_POC"), 16),
  magnet: f >= E("L47_磁铁") ? clamp01((f - E("L47_磁铁")) / 46) : 0,
  t: f - E("L47_磁铁"),
});

/** candle i's open→close growth while it prints (the last one grows, the others are whole) */
export const partial = (c: Candle, i: number, n: number) => {
  const k = clamp01(n - i);
  return { k, c: lerp(c.o, c.c, ease(k)), h: lerp(Math.max(c.o, c.c), c.h, ease(k)), l: lerp(Math.min(c.o, c.c), c.l, ease(k)) };
};
export const SERIES = { HOOK, MAIN, ACCEPT, REJECT, WATCH };
