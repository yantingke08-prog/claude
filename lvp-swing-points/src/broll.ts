// Live-action B-roll slots. Drop a clip at public/<file> and the film uses it (darkened 25 %, slightly
// desaturated, muted). Without a file, a code-built stand-in scene plays instead.
export const BROLL_SLOTS = [
  { id: "broll1", file: "broll/broll1.mp4", what: "平板上的行情图表（红涨绿跌），手在屏幕上圈出K线" },
  { id: "broll2", file: "broll/broll2.mp4", what: "双显示器 + 笔记本上的真实行情图表（红涨绿跌）" },
  { id: "broll3", file: "broll/broll3.mp4", what: "双手在笔记本键盘上操作" },
] as const;
