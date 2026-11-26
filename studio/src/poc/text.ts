// Every string the picture shows (captions come from timeline.json). Titles carry no punctuation and are centred.
import { NUM } from "./data";

const n = (x: number) => x.toLocaleString("en-US");
export const T = {
  series: "订单流",
  ep: "06",
  topic: "POC 怎么用",
  demo: "示意图 · 模拟数据",

  // big text (bands with no chart behind them)
  q1: "它凭什么",
  q2: "总能把价格吸回去",
  y1: "为什么它像磁铁",
  steps: ["定方向", "找目标", "找入场"],
  stepWord: ["第一步", "第二步", "第三步"],
  threeHead: "三步",
  endQ1: "你看图的时候",
  endQ2: "会先画出 POC 吗",
  endCmt: "评论区聊聊",
  risk1: "教育内容",
  risk2: "不构成投资建议",
  prob: "信号只代表概率 不是保证",

  // cover
  cover1: "POC",
  cover2: "价格的磁铁",
  cover3: "怎么用 三步讲清",
  coverEp: "订单流 06",

  // tags (terminal style: a label and a number at most)
  tVa: "价值区",
  tPoc: "POC",
  tDist: "成交量分布",
  tFair: "公平价",
  tStay: "停留",
  tHand: "成交",
  tThin: "成交稀",
  tDev: "偏离",
  tBack: "回到",
  tFill: "回补",
  tBreak: "放量",
  tNewPoc: "新 POC",
  tOldPoc: "老 POC",
  tMig: "价值迁移",
  tTrend: "趋势信号",
  tAbove: "上方 偏多",
  tBelow: "下方 偏空",
  tPrior: "前日 POC",
  tToday: "当日 POC",
  tNoOrder: "不提前挂单",
  tAbsorb: "吸收",
  tFade: "衰竭",
  tTake: "接手",
  tBidFill: "买单补",
  tAskPull: "卖单撤",
  tEntry: "进场",
  tStop: "止损",
  tTarget: "目标",
  tThru: "穿过",
  tLvn: "LVN",
  tDense: "成交密集",
  dom: "盘口",
  days: ["D1", "D2", "D3", "第一天", "第二天", "第三天"],

  pocV: `${n(NUM.aPocV)} 手`,
};

/** every character the picture can show: the font subsetter (scripts/poc-fonts.py) reads this file's strings */
export const allText = () => JSON.stringify(T);
