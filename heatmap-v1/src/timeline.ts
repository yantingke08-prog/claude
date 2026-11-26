// The whole film as data: world state per frame, camera keys, captions, tags and cards.
// Pure TS (no React) so scripts/check.mts can audit it.
import { C, COLS, ROWS, cellX, clamp, easeInOut, easeOut, lerp, smooth } from "./config.ts";
import { HOOK, HOOK_WALL, INTRO, type Market, SPOOF, SPOOF_ROW, SPOOF_SEGS, THREE, THREE_PULL, THREE_WALL } from "./markets.ts";

// ───────────────────────────── sections (frames @30fps) ─────────────────────────────
export const SECTIONS = [
  { id: "hook", from: 0, to: 180, name: "冷开场：一堵墙，没了" },
  { id: "title", from: 180, to: 285, name: "片名" },
  { id: "what", from: 285, to: 630, name: "热图是什么" },
  { id: "read", from: 630, to: 990, name: "怎么读" },
  { id: "see", from: 990, to: 1530, name: "能看出什么：墙 / 空洞 / 撤单" },
  { id: "trap", from: 1530, to: 1890, name: "最容易踩的坑" },
  { id: "end", from: 1890, to: 2100, name: "收束" },
] as const;

// ───────────────────────────── world state ─────────────────────────────
export type Focus = { r0: number; r1: number; c0: number; c1: number; k: number };
export type WorldState = {
  market: Market;
  reveal: number; // columns printed (float)
  pathReveal: number; // columns of price line drawn
  pathOpacity: number;
  hz: number; // 0 = flat heatmap, 1 = liquidity terrain
  ladder: number; // 0 = order-book bars, 1 = heat cells
  slide: number; // 0 = ladder centred, 1 = ladder at the left edge (column 0)
  grow: number; // ladder bars growing in
  dim: number; // global brightness
  focus: Focus | null;
  spot: { kind: "hot" | "cold"; k: number } | null;
};

const ramp = (f: number, a: number, b: number) => clamp((f - a) / (b - a));

export const worldAt = (f: number): WorldState => {
  const s: WorldState = {
    market: INTRO,
    reveal: COLS,
    pathReveal: 0,
    pathOpacity: 0,
    hz: 0,
    ladder: 1,
    slide: 1,
    grow: 1,
    dim: 1,
    focus: null,
    spot: null,
  };
  if (f < 285) {
    // HOOK → title. The book prints toward a fat bid wall, the price arrives, the wall stops printing.
    s.market = HOOK;
    s.hz = 1;
    s.reveal = f < 84 ? lerp(36, 55, easeOut(f / 84)) : lerp(55, 76, easeInOut(ramp(f, 84, 150)));
    s.pathReveal = s.reveal;
    s.pathOpacity = 1;
    s.dim = smooth(0, 10, f);
    if (f >= 180) {
      s.dim = lerp(1, 0.26, smooth(180, 204, f)) * (1 - smooth(268, 284, f));
      s.hz = lerp(1, 0.45, smooth(180, 260, f));
      s.pathOpacity = 1 - smooth(180, 200, f);
    }
    return s;
  }
  if (f < 630) {
    // What it is: one snapshot of the book (ladder) → cells → snapshots side by side.
    s.market = INTRO;
    s.grow = easeOut(ramp(f, 288, 320));
    s.dim = smooth(285, 296, f);
    s.ladder = easeInOut(ramp(f, 398, 452));
    s.slide = easeInOut(ramp(f, 497, 528));
    s.reveal = 1 + 89 * easeInOut(ramp(f, 524, 612));
    s.hz = 0.25 * (1 - s.ladder);
    return s;
  }
  if (f < 990) {
    // How to read: axes, colour meaning, the price line is separate.
    s.market = INTRO;
    if (f >= 752 && f < 810) s.spot = { kind: "hot", k: smooth(752, 766, f) * (1 - smooth(800, 810, f)) };
    if (f >= 810 && f < 870) s.spot = { kind: "cold", k: smooth(810, 824, f) * (1 - smooth(860, 870, f)) };
    s.pathReveal = COLS * easeInOut(ramp(f, 872, 928));
    s.pathOpacity = f < 930 ? 1 : lerp(1, 0.3, smooth(930, 946, f));
    s.dim = f < 930 ? 1 : lerp(1, 1.12, smooth(930, 946, f));
    s.dim *= 1 - smooth(978, 990, f) * 0.95;
    return s;
  }
  if (f < 1530) {
    // Three things you can see — one market, three camera stops.
    s.market = THREE;
    s.dim = smooth(988, 1004, f);
    s.hz = easeInOut(ramp(f, 1004, 1068));
    s.reveal = f < 1400 ? 56 : lerp(56, 80, ramp(f, 1400, 1500));
    s.pathReveal = s.reveal;
    s.pathOpacity = smooth(1004, 1030, f);
    if (f >= 1176 && f < 1350) s.focus = { r0: 22, r1: 37, c0: 0, c1: 33, k: smooth(1190, 1230, f) * (1 - smooth(1336, 1350, f)) };
    if (f >= 1360) s.focus = { r0: 25, r1: 33, c0: 30, c1: 80, k: 0.55 * smooth(1360, 1410, f) * (1 - smooth(1515, 1530, f)) };
    if (f >= 1520) s.dim = lerp(1, 0.3, smooth(1520, 1560, f));
    return s;
  }
  if (f < 1890) {
    if (f < 1652) {
      // "墙 ≠ 支撑" over the same market, dimmed.
      s.market = THREE;
      s.hz = 1;
      s.reveal = 80;
      s.pathReveal = 80;
      s.dim = lerp(1, 0.2, smooth(1520, 1560, f)) * (1 - smooth(1636, 1652, f));
      s.pathOpacity = lerp(1, 0.35, smooth(1520, 1560, f));
      return s;
    }
    if (f < 1802) {
      // Replay of the hook, now explained.
      s.market = HOOK;
      s.hz = 1;
      s.reveal = lerp(44, 76, easeInOut(ramp(f, 1664, 1772)));
      s.pathReveal = s.reveal;
      s.pathOpacity = 1;
      s.dim = smooth(1652, 1668, f) * (1 - smooth(1790, 1802, f));
      return s;
    }
    // A blinking wall far from the price.
    s.market = SPOOF;
    s.hz = 0.75;
    s.reveal = lerp(8, 82, ramp(f, 1808, 1878));
    s.pathReveal = s.reveal;
    s.pathOpacity = 1;
    s.dim = smooth(1802, 1814, f) * (1 - smooth(1880, 1892, f));
    return s;
  }
  // End: the calm book, dimmed, behind the summary.
  s.market = INTRO;
  s.hz = 0;
  s.pathReveal = 0;
  s.pathOpacity = 0;
  s.dim = 0.22 * smooth(1890, 1910, f) * (1 - smooth(2078, 2100, f));
  return s;
};

// ───────────────────────────── camera ─────────────────────────────
export type View = { pos: [number, number, number]; tgt: [number, number, number]; fov: number };
export const VIEWS = {
  HOOK_A: { pos: [7.8, -15.5, 11.5], tgt: [0.4, -1.6, 0.4], fov: 32 },
  HOOK_B: { pos: [6.2, -13, 9.2], tgt: [1.4, -2.0, 0.3], fov: 32 },
  TITLE: { pos: [2.5, -12, 27], tgt: [0, 0.4, 0], fov: 30 },
  LADDER: { pos: [5.5, -4.5, 30], tgt: [0.2, -0.9, 0], fov: 30 },
  LADDER2: { pos: [2.2, -2.6, 18], tgt: [-1.4, -0.9, 0], fov: 30 },
  FRONT: { pos: [0, -0.9, 37], tgt: [0, -0.9, 0], fov: 30 },
  FRONT_D: { pos: [0.3, -1.1, 35.5], tgt: [0, -0.9, 0], fov: 30 },
  TERRAIN: { pos: [6.5, -21, 18], tgt: [0, 0.6, 0.6], fov: 30 },
  WALL_CLOSE: { pos: [6.2, -6.5, 9.5], tgt: [-0.2, 4.0, 1.0], fov: 32 },
  HOLE: { pos: [-6.8, -10.5, 11], tgt: [-2.6, -0.4, 0.3], fov: 32 },
  PULL: { pos: [8.8, -8.6, 8.8], tgt: [1.8, 0.2, 0.5], fov: 32 },
  PITFALL: { pos: [-5, -19, 22], tgt: [0, 0.5, 0], fov: 30 },
  SPOOF_A: { pos: [-4.5, -16, 17], tgt: [-1.5, 1.5, 0.4], fov: 30 },
  SPOOF_B: { pos: [3.5, -15, 16], tgt: [1.5, 1.5, 0.4], fov: 30 },
  END_A: { pos: [0, -0.9, 40], tgt: [0, -0.9, 0], fov: 30 },
  END_B: { pos: [0, -0.9, 36], tgt: [0, -0.9, 0], fov: 30 },
} satisfies Record<string, View>;
type ViewName = keyof typeof VIEWS;

/** [frame, view]. Two keys on adjacent frames = a cut (always hidden behind a dim-to-black). */
export const CAM_KEYS: [number, ViewName][] = [
  [0, "HOOK_A"],
  [150, "HOOK_B"],
  [180, "HOOK_B"],
  [262, "TITLE"],
  [284, "TITLE"],
  [285, "LADDER"],
  [392, "LADDER"],
  [452, "LADDER2"],
  [496, "LADDER2"],
  [566, "FRONT"],
  [640, "FRONT"],
  [988, "FRONT_D"],
  [989, "FRONT"],
  [1006, "FRONT"],
  [1072, "TERRAIN"],
  [1092, "TERRAIN"],
  [1150, "WALL_CLOSE"],
  [1176, "WALL_CLOSE"],
  [1234, "HOLE"],
  [1354, "HOLE"],
  [1412, "PULL"],
  [1522, "PULL"],
  [1600, "PITFALL"],
  [1652, "PITFALL"],
  [1653, "HOOK_A"],
  [1780, "HOOK_B"],
  [1802, "HOOK_B"],
  [1803, "SPOOF_A"],
  [1890, "SPOOF_B"],
  [1891, "END_A"],
  [2100, "END_B"],
];

const v3 = (a: number[], b: number[], t: number): [number, number, number] => [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];

export const camAt = (f: number): View => {
  let i = 0;
  while (i < CAM_KEYS.length - 2 && f >= CAM_KEYS[i + 1][0]) i++;
  const [f0, n0] = CAM_KEYS[i];
  const [f1, n1] = CAM_KEYS[i + 1];
  const a = VIEWS[n0];
  const b = VIEWS[n1];
  const t = easeInOut((f - f0) / Math.max(1, f1 - f0));
  const v: View = { pos: v3(a.pos, b.pos, t), tgt: v3(a.tgt, b.tgt, t), fov: lerp(a.fov, b.fov, t) };
  // Printing shots: the camera drifts with the print edge so the unprinted side never fills the frame.
  const follow = f < 180 || (f >= 1653 && f < 1802) || (f >= 1803 && f < 1891);
  if (follow) {
    const edge = cellX(Math.min(COLS - 1, worldAt(f).reveal));
    const dx = (edge - 1.2) - v.tgt[0];
    v.tgt = [v.tgt[0] + dx * 0.85, v.tgt[1], v.tgt[2]];
    v.pos = [v.pos[0] + dx * 0.85, v.pos[1], v.pos[2]];
  }
  return v;
};

// ───────────────────────────── on-screen text ─────────────────────────────
/** Caption: `head` is the big line, `sub` an optional second line. kind=hook → large centred hook type. */
export type Caption = { f0: number; f1: number; head: string; sub?: string; kind?: "hook" | "cap" | "section" };
export const CAPTIONS: Caption[] = [
  { f0: 8, f1: 86, head: "看起来很稳的一堵墙", kind: "hook" },
  { f0: 96, f1: 174, head: "价格一到", sub: "它没了", kind: "hook" },

  { f0: 296, f1: 388, head: "每个价位上", sub: "都挂着等待成交的单" },
  { f0: 394, f1: 492, head: "单子越多", sub: "这一格就越亮" },
  { f0: 500, f1: 626, head: "每一刻拍一列", sub: "排起来　就是热图" },

  { f0: 636, f1: 746, head: "横轴是时间", sub: "纵轴是价格" },
  { f0: 754, f1: 806, head: "越亮　越暖", sub: "挂单越厚" },
  { f0: 812, f1: 866, head: "越暗　越冷", sub: "挂单越薄" },
  { f0: 874, f1: 928, head: "这条线", sub: "是成交价" },
  { f0: 934, f1: 984, head: "热图画的是挂单", sub: "不是价格" },

  { f0: 1006, f1: 1166, head: "① 挂单墙", sub: "某个价位　挂单特别厚", kind: "section" },
  { f0: 1178, f1: 1346, head: "② 流动性空洞", sub: "挂单很薄　价格容易一穿而过", kind: "section" },
  { f0: 1358, f1: 1524, head: "③ 撤单", sub: "价格还没到　墙先没了", kind: "section" },

  { f0: 1566, f1: 1604, head: "墙只说明一件事" },
  { f0: 1606, f1: 1646, head: "此刻", sub: "这里挂的单多" },
  { f0: 1666, f1: 1728, head: "挂单随时可以撤" },
  { f0: 1734, f1: 1796, head: "墙会瞬间消失" },
  { f0: 1812, f1: 1886, head: "有的墙", sub: "挂出来就没打算成交" },
];

/** Tags sit beside a 3D cell: `at(f)` → [col, row]. Coloured like the object, no cards / leaders. */
export type Tag = {
  f0: number;
  f1: number;
  text: string;
  color: string;
  at: (f: number) => [number, number];
  side: "right" | "left" | "above" | "below";
  /** anchor to the ladder bar end instead of the cell (section "what" only) */
  ladderEnd?: boolean;
  /** anchor on the price line at column at(f)[0] */
  onPath?: boolean;
  size?: number;
};

const ladderMaxRow = (() => {
  let best = 0;
  for (let r = 0; r < ROWS; r++) if (INTRO.field[r] > INTRO.field[best]) best = r;
  return best;
})();
const extremeCell = (m: Market, hot: boolean, c0: number, c1: number, r0: number, r1: number): [number, number] => {
  let best: [number, number] = [c0, r0];
  let bv = hot ? -1 : 2;
  for (let c = c0; c <= c1; c++)
    for (let r = r0; r <= r1; r++) {
      const v = m.field[c * ROWS + r];
      if (hot ? v > bv : v < bv) {
        bv = v;
        best = [c, r];
      }
    }
  return best;
};
const coldLadder = extremeCell(INTRO, false, 0, 0, 2, 22);
const nowCol = (f: number) => Math.max(0, worldAt(f).reveal - 1);
const pathHeadCol = (f: number) => Math.max(0, Math.min(COLS - 1, worldAt(f).pathReveal - 1));

export const TAGS: Tag[] = [
  // hook
  { f0: 20, f1: 98, text: "买单墙", color: C.heat, at: (f) => [Math.min(50, nowCol(f) - 6), HOOK_WALL.row - 2.5], side: "below" },
  { f0: 108, f1: 176, text: "撤了", color: C.cold, at: () => [HOOK_WALL.c1 + 1.5, HOOK_WALL.row], side: "right" },
  // what
  { f0: 304, f1: 388, text: "挂单量", color: C.ink, at: () => [0, ladderMaxRow], side: "right", ladderEnd: true },
  { f0: 314, f1: 388, text: "当前价", color: C.mute, at: () => [0, INTRO.path[0]], side: "left" },
  { f0: 454, f1: 492, text: "厚", color: C.heat, at: () => [0, ladderMaxRow], side: "right", size: 40 },
  { f0: 462, f1: 492, text: "薄", color: C.cold, at: () => [0, coldLadder[1]], side: "right", size: 40 },
  { f0: 548, f1: 606, text: "现在", color: C.ink, at: (f) => [nowCol(f), ROWS - 1], side: "above" },
  // read
  { f0: 884, f1: 984, text: "成交价", color: C.ink, at: (f) => [pathHeadCol(f), 0], side: "above", onPath: true },
  // see
  { f0: 1078, f1: 1166, text: "挂单墙", color: C.heat, at: () => [22, THREE_WALL.row + 2.5], side: "above" },
  { f0: 1238, f1: 1346, text: "空洞", color: C.cold, at: () => [9, 30], side: "above" },
  { f0: 1262, f1: 1346, text: "急跌", color: C.down, at: () => [25, 0], side: "right", onPath: true },
  { f0: 1414, f1: 1444, text: "卖单墙", color: C.heat, at: (f) => [Math.min(THREE_PULL.c1, nowCol(f) - 2), THREE_PULL.row], side: "above" },
  { f0: 1450, f1: 1524, text: "撤单", color: C.cold, at: () => [THREE_PULL.c1 + 1.2, THREE_PULL.row], side: "above" },
  // trap
  { f0: 1670, f1: 1730, text: "买单墙", color: C.heat, at: (f) => [Math.min(52, nowCol(f) - 5), HOOK_WALL.row - 2.5], side: "below" },
  { f0: 1736, f1: 1796, text: "瞬间撤单", color: C.cold, at: () => [HOOK_WALL.c1 + 1.5, HOOK_WALL.row], side: "right" },
  {
    f0: 1826,
    f1: 1884,
    text: "忽隐忽现",
    color: C.heat,
    at: (f) => {
      const n = nowCol(f);
      const seg = [...SPOOF_SEGS].reverse().find(([c0]) => c0 <= n) ?? SPOOF_SEGS[0];
      return [Math.min(seg[1], n) - 2, SPOOF_ROW];
    },
    side: "above",
  },
];

/** Cards that are not tags or captions. */
export const CARDS = {
  title: { f0: 186, f1: 282 },
  axes: { f0: 642, f1: 748 },
  legend: { f0: 754, f1: 868 },
  neq: { f0: 1538, f1: 1648 }, // 墙 ≠ 支撑
  summary: { f0: 1896, f1: 2008, lines: ["亮　＝　挂单厚", "墙　≠　支撑", "墙会撤　会消失"], stagger: 26 },
  end: { f0: 2014, f1: 2100, head: "看热图　看的是变化", sub: "不是一张快照" },
};

export const DISCLAIMER = "教学示意 · 非实盘数据";
export const END_NOTE = "教学示意 · 非实盘数据 · 不构成任何投资建议";
export const TITLE = { head: "热图怎么看", sub: "挂单墙背后的真相" };
export const AXIS = { time: "时间", price: "价格", thick: "厚", thin: "薄" };
export const NEQ = { a: "墙", op: "≠", b: "支撑" };
