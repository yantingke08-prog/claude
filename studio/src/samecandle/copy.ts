import { changePct, volRatio } from "./data";

const pct = (x: number) => `${x >= 0 ? "+" : "−"}${Math.abs(x).toFixed(1)}%`;
const times = (x: number) => `×${x.toFixed(1)}`;

/** Every on-screen string (the font loader subsets exactly these glyphs). */
export const C = {
  kicker: "K线科普 · 示意图",
  title: "同一根大阳线",
  title2: "三种结局",
  lane: {
    A: { name: "起飞", pct: pct(changePct("A")) },
    B: { name: "见顶", pct: pct(changePct("B")) },
    C: { name: "打回原形", pct: pct(changePct("C")) },
  },
  why: "为什么？",
  result: { t: "只是一个结果", s: "这段时间里，买方赢了" },
  three: [
    { n: "01", t: "位置" },
    { n: "02", t: "量能" },
    { n: "03", t: "承接" },
  ],
  chapter: [
    { n: "01", t: "位置", s: "它出现在哪里" },
    { n: "02", t: "量能", s: "谁在买" },
    { n: "03", t: "承接", s: "之后有没有人接" },
  ],
  pos: {
    A1: { t: "长期横盘后", s: "第一次向上突破" },
    A2: { t: "新趋势的起点" },
    B1: { t: "连涨 40 根", s: "越涨越陡" },
    B2: { t: "最后一批买家", s: "冲了进来" },
    C1: { t: "前期支撑 → 压力", s: "108 – 111" },
    C2: { t: "空头回补", s: "不是新买盘" },
  },
  vol: {
    A: { t: `放量 ${times(volRatio("A"))}`, s: "新资金持续进场" },
    B: { t: `天量 ${times(volRatio("B"))}`, s: "买盘一次性用完" },
    C: { t: `缩量 ${times(volRatio("C"))}`, s: "没多少人跟" },
    avg: "对比前 20 根均量",
  },
  hold: {
    mid: { t: "实体的一半", s: "开 100 · 收 108 → 104" },
    A: { t: "回踩守住 104", s: "买方仍在掌控" },
    B: { t: "次日跌破一半", s: "努力被抹掉大半" },
    C: { t: "跌回开盘价 100 下方", s: "" },
    trap: "陷阱",
  },
  recap: {
    A: ["低位", "放量", "守住一半"],
    B: ["高位", "天量", "次日跌破"],
    C: ["压力位", "缩量", "没人接"],
  },
  end: {
    l1: "大阳线不是答案",
    l2: "而是一个问题",
    l3: "答案，写在它后面的K线里",
    note: "数据为示意 · 教育科普，不构成投资建议",
  },
  tagLabels: { A: "A", B: "B", C: "C" },
};

export const allCopy = () => JSON.stringify(C);
