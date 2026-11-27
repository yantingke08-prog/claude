// 色板、字号、版式常量。所有组件只从这里取颜色和字号。

export const WIDTH = 1920;
export const HEIGHT = 1080;
export const FPS = 30;
/** 没有配音时的占位时长（秒） */
export const PLACEHOLDER_SECONDS = 93;

export const C = {
  bg: "#090B0E",
  panel: "#111722",
  white: "#F4F2EC",
  white2: "#B8B8B8",
  gold: "#D4AF37",
  goldHi: "#F4D77A",
  green: "#2ECC71",
  red: "#E74C3C",
  grey: "#555B63",
  /** 背景渐变的深蓝黑端 */
  bgDeep: "#0D1420",
  /** 细白色边框 */
  line: "rgba(244,242,236,0.22)",
  lineSoft: "rgba(244,242,236,0.10)",
  /** 片尾白底 */
  paper: "#F4F2EC",
  ink: "#151A22",
} as const;

export const SANS = "'TSR Sans', 'Noto Sans SC', 'Microsoft YaHei', sans-serif";
export const SERIF = "'TSR Serif', 'Noto Serif SC', 'SimSun', serif";
export const MONO = "'TSR Sans', 'Consolas', monospace";

export const FS = {
  /** 开场两行大字 */
  hero: 150,
  /** 全屏名次数字 */
  rankDigit: 560,
  rankLabel: 64,
  /** 流派标题 48–64 */
  school: 60,
  /** 图表标题 40–52 */
  chartTitle: 44,
  /** 图内标注 ≥ 24 */
  label: 28,
  labelSmall: 24,
  /** 优缺点卡 */
  cardHead: 38,
  cardPoint: 34,
  /** 底部字幕 36–44 */
  subtitle: 40,
  /** 右上角免责声明 */
  disclaimer: 24,
} as const;

/** 版式：安全边距与区域 */
export const L = {
  margin: 96,
  titleY: 92,
  /** 主内容区（标题下、字幕上） */
  stageTop: 190,
  stageBottom: 900,
  subtitleY: 968,
} as const;

/** 动效时长（秒） */
export const M = {
  /** 内容页交叉淡化 0.2–0.35 */
  crossfade: 0.28,
  /** 旧图退 / 新图进 的位移（px） */
  shift: 26,
  /** 箭头与资金流路径 0.35–0.7 */
  arrow: 0.55,
  /** 文字成组进入 */
  textIn: 0.3,
  /** K 线逐根生成：每根间隔 */
  candleStep: 0.07,
  /** 描边生长 */
  stroke: 0.9,
  /** 卡片高度展开 */
  cardOpen: 0.35,
} as const;
