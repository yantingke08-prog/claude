// Every on-screen string except captions (those come from timeline.json, i.e. from valuearea-script.txt).
// scripts/valuearea-fonts.py subsets the bundled fonts to exactly the glyphs in this file + the script, so a new
// string here needs `npm run va:fonts` once (otherwise the glyph falls back to a system font, which still renders).
// Fact red lines (README): no returns, no win rates, no real quotes, no trade advice; 70% is a convention.
export type Accent = "up" | "down" | "gold" | "ink" | "mute";

export const T = {
  title: "价值区怎么用？只看3个数",
  titleA: "价值区怎么用？",
  titleB: "只看3个数",
  sub: ["POC", "VAH", "VAL"],
  subLine: "成交最密集价 · 价值区上沿 · 价值区下沿",
  series: "订单流 · 05",
  risk: "教学示意，不构成投资建议",
  coverMark: "教学示意",
  data: "示意数据 · 非真实行情",
  chapter: {
    profile: "成交量分布",
    three: "三个数",
    trap: "第一反应",
    poll: "你会怎么做",
    accept: "接受",
    reject: "拒绝",
    watch: "中间与边缘",
    map: "一张地图",
    end: "下期",
  } as Record<string, string>,

  // ------------------------------------------------ main labels (one at a time, beside their object)
  M: {
    hold: ["撑住", "↑"],
    pierce: ["一碰就穿", "↓"],
    noLine: ["不在这条线", ""],
    dontDraw: ["先别急着划线", ""],
    vp: ["Volume Profile", "成交量分布"],
    perPrice: ["每个价位", "成交了多少"],
    dense: ["成交最密", ""],
    notGuess: ["不是拍脑袋", ""],
    vote: ["一笔一笔", "投出来"],
    agreed: ["大家暂时最认的价", ""],
    poc: ["POC", "成交最密集价"],
    pocQ: ["成交多", "有人认"],
    vah: ["VAH", "价值区上沿"],
    vahQ: ["往上", "有没有压力？"],
    val: ["VAL", "价值区下沿"],
    valQ: ["往下", "有没有人接？"],
    notWall: ["不是一堵墙", ""],
    range: ["是一个区间", ""],
    chop: ["区间里", "来回震"],
    edge: ["信息在边缘", ""],
    atTop: ["到了上沿", ""],
    rush: ["成交放大", "↑"],
    retest: ["回踩", ""],
    stand: ["站住", "↑"],
    accept: ["接受", "更高的价格"],
    thin: ["没人跟", "量没放大"],
    snap: ["缩回来", "↓"],
    reject: ["拒绝", "这个价不被认"],
    mirror: ["往下也一样", "↑"],
    touch: ["碰到线以后", ""],
    standQ: ["能不能站住？", ""],
    middle: ["中间", "来回挨打"],
    edges: ["边缘", "考验判断"],
    oldPull: ["旧价值", "还在拉它"],
    notButton: ["不是买卖按钮", ""],
    mostAgreed: ["最认可", "POC"],
    thinArea: ["成交稀薄", ""],
    back: ["回到价值区", ""],
    magnet: ["POC", "像一块磁铁？"],
    three3: ["三个数", "藏在成交里"],
    map: ["地图", ""],
    comment: ["评论区", "中间 / 边缘"],
  } as Record<string, [string, string]>,

  // ------------------------------------------------ cards (at most two at a time)
  C: {
    three: [["三个数", "gold"], ["POC · VAH · VAL", "ink"]],
    va70: [["价值区", "gold"], ["成交最集中的那一段（常用约70%）", "ink"]],
    reflex: [["第一反应", "ink"], ["上沿空 · 下沿多？", "mute"]],
    short: [["做空", "down"], ["↓ 碰上沿就空", "mute"]],
    long: [["做多", "up"], ["↑ 碰下沿就多", "mute"]],
    pollShort: [["做空", "down"], ["↓", "mute"]],
    pollWait: [["等确认", "gold"], ["？", "mute"]],
    danmu: [["弹幕", "gold"], ["做空 / 确认", "ink"]],
    intuitive: [["看起来最直观", "mute"], ["", "mute"]],
    look3: [["看三件事", "gold"], ["", "ink"]],
    look1: [["①", "gold"], ["成交量", "ink"]],
    look2: [["②", "gold"], ["价格响应", "ink"]],
    look3b: [["③", "gold"], ["回踩确认", "ink"]],
    standUp: [["站住了", "up"], ["↑ 建立新价值", "ink"]],
    fallBack: [["站不住", "down"], ["↓ 回到原区间", "ink"]],
    canBuy: [["这里能不能买？", "mute"], ["", "mute"]],
    accepted: [["先问一句", "ink"], ["市场认不认这个价？", "gold"]],
    mid: [["中间", "gold"], ["来回挨打", "ink"]],
    edge: [["边缘", "gold"], ["被假突破骗", "ink"]],
    comment: [["评论区", "gold"], ["打 中间 或 边缘", "ink"]],
    next: [["下一期", "gold"], ["POC 为什么像磁铁？", "ink"]],
  } as Record<string, [string, Accent][]>,

  button: ["买", "卖"],
  wordMap: "地图",
  ladderTag: "价格",
  volTag: "成交量",
  deltaTag: "Delta",
  legendUp: "↑涨",
  legendDn: "↓跌",
};

/** every string the picture can show (for the font subset) */
export const allText = () => {
  const parts: string[] = [T.title, T.titleA, T.titleB, T.subLine, T.series, T.risk, T.coverMark, T.data, T.wordMap, T.ladderTag, T.volTag, T.deltaTag, T.legendUp, T.legendDn, ...T.sub, ...T.button];
  parts.push(...Object.values(T.chapter));
  for (const v of Object.values(T.M)) parts.push(...v);
  for (const v of Object.values(T.C)) parts.push(...v.map((s) => s[0]));
  return parts.join("") + "0123456789.,:+-−%×✓✗？↑↓·（）";
};
