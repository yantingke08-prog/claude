// Every on-screen string except captions (those come from timeline.json). fonts.ts subsets the fonts to exactly these glyphs.
import { A, A_H, A_START, B_H, B_START, Bc, pct } from "./data";

const aPct = pct(A_START, A.bars[A_H].c);
const bPct = pct(B_START, Bc.bars[B_H].c);

export const T = {
  series: "交易认知",
  seriesSub: "量价入门",
  risk: "教学示意，不构成投资建议",
  tagData: "示意数据",
  // cover
  cover1: "放量不涨",
  cover2: "先别追",
  cover3: ["低位", "看换手", " · ", "高位", "防出货"],
  // hook + countdown + answer
  q1: "放量不涨，",
  q2: "你会追吗？",
  cd1: "给你5秒决定",
  cd2: "you have 5 seconds",
  ans1: "答案",
  ans2: "先别追",
  thesis: [
    ["低位", "看换手"],
    ["高位", "防出货"],
  ] as [string, string][],
  // why
  whyHead: "为什么先别追",
  vol: "成交量明显放大",
  volSub: "买卖双方都很积极",
  flat: "收盘几乎没涨",
  flatSub: "价格涨不动",
  ceil: "上方卖盘压得住",
  ceilSub: "冲高被打回",
  chase: "追在这里",
  chaseSub: "= 买在当天高处",
  // position
  posHead1: "同一根放量不涨",
  posHead2: "位置不同，意思不同",
  tagA: "A",
  tagB: "B",
  low: "低位",
  high: "高位",
  aPct: `刚涨 约 +${aPct}%`,
  bPct: `已涨 约 +${bPct}%`,
  // A
  aHead: "低位 · 看换手",
  base: "底部平台",
  baseSub: "刚离开",
  hand: "换手",
  handSell: "前面套住的人在卖",
  handBuy: "新资金在接",
  lowLine: "这根的低点",
  done: "换手完成",
  doneSub: "守住低点，重新站上",
  aChecks: ["缩量回调", "守住低点", "重新站上"],
  // B
  bHead: "高位 · 防出货",
  rise: `连续大涨 约 +${bPct}%`,
  far: "远离起涨点",
  dist: "高处放量不涨",
  distSub: "要防有人出货",
  broke: "跌破这根的低点",
  flip: "支撑变压力",
  flipSub: "反弹收不回",
  sign: "出货迹象更明显",
  bChecks: ["一跌就放量", "跌破低点", "反弹收不回"],
  sup: "支撑",
  res: "压力",
  // summary
  sumHead1: "放量不涨",
  sumHead2: "先看位置，再看后面几根",
  sumA: "低位看换手",
  sumAItems: ["缩量回调", "守住低点", "重新站稳"],
  sumB: "高位防出货",
  sumBItems: ["放量下跌", "跌破低点", "反弹收不回"],
  // act
  x1: "当天先别追",
  rules: [
    ["低位", "等站稳再考虑"],
    ["高位", "跌破先回避"],
    ["止损", "提前设好"],
  ] as [string, string][],
  // end
  e1: "遇到放量不涨，",
  e2: "你一般怎么做？",
  eCmt: "评论区说说",
  r1: "教学示意",
  r2: "不构成投资建议",
};

export const allText = () => JSON.stringify(T) + "→";
