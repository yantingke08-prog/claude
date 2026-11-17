// Every on-screen string except captions (those come from timeline.json). fonts.ts subsets the fonts to exactly these glyphs.
export const T = {
  series: "交易认知",
  seriesSub: "量价入门",
  risk: "教学示意，不构成投资建议",
  tagData: "示意数据",
  // cover
  cover1: "放量不涨",
  cover2: ["是", "洗盘", "还是", "出货", "？"],
  cover3: "位置 · 量价 · 承接 · 收回",
  // hook + countdown
  q1: "放量不涨，",
  q2: "你会追吗？",
  cd1: "给你5秒决定",
  cd2: "you have 5 seconds",
  punch1: "只看成交量",
  punch2: "不够",
  heavy: "量很大，价没走远",
  heavySub: "有人大量卖，也有人大量接",
  // A / B
  tagA: "A",
  tagB: "B",
  wash: "洗盘？",
  dist: "出货？",
  or: "还是",
  notOne: "区别不在这一根",
  where: "看位置",
  after: "看后面的走势",
  head: {
    pos: ["01", "位置"],
    vol: ["02", "量价配合"],
    catch: ["03", "承接"],
    back: ["04", "收回 · 站稳"],
    logic: ["", "交易逻辑"],
  } as Record<string, [string, string]>,
  // 01
  base: "底部平台",
  baseSub: "刚涨起来，约 +14%",
  rally: "连续大涨，约 +55%",
  rallySub: "远离起涨点",
  low: "低位：更可能是换手",
  high: "高位：要警惕出货",
  // 02
  shrink: "回调缩量",
  shrinkSub: "抛压在减轻",
  dropVol: "下跌放量",
  bounceVol: "反弹缩量",
  bounceSub: "卖的人比买的人急",
  // 03
  levelTag: "放量K线低点",
  wick: "下影线拉长",
  wickSub: "有人在接",
  broke: "一碰就破",
  brokeSub: "下影很短，承接弱",
  // 04
  backUp: "回到线上方",
  higher: "低点一个比一个高",
  higherSub: "站稳了",
  fail: "收不回",
  failSub: "支撑变压力",
  sup: "支撑",
  res: "压力",
  // sum
  sumA: ["低位", "缩量回调", "有承接", "能收回"],
  sumAV: "更像洗盘",
  sumB: ["高位", "放量下跌", "没承接", "收不回"],
  sumBV: "更要防出货",
  // logic
  noRush: "当天不急着下结论",
  answer: "答案在后面几根K线",
  rules: [
    ["收回、站稳", "再考虑"],
    ["跌破、收不回", "先回避"],
    ["止损", "提前设好"],
  ],
  // end
  e1: "遇到放量不涨，",
  e2: "你最先看哪一点？",
  eChips: ["位置", "量价", "承接", "收回"],
  eCmt: "评论区聊聊",
  r1: "教学示意",
  r2: "不构成投资建议",
};

export const allText = () => JSON.stringify(T);
