// The narration (original LVP script, user-supplied) — one entry per spoken line.
// `|` marks a caption hard cut inside a line; it is not spoken and is ignored when matching audio.
// `seed` is the suggested timing from the production script. It is used ONLY by
// scripts/seed-timestamps.mts to write the starter public/audio/vo.timestamps.json —
// no component reads it. At render time every second comes from vo.timestamps.json
// (or, if that file is missing, from an even split of the real audio by text length).

export type ShotId =
  | "hook"
  | "title"
  | "concept"
  | "define"
  | "case"
  | "advanced"
  | "broll1"
  | "broll2"
  | "broll3"
  | "ticker"
  | "outro";

export type ScriptLine = { text: string; shot: ShotId; seed: [number, number] };

/** Shots with no narration of their own, placed in the silence before another shot. */
export const BUMPERS: { id: ShotId; before: ShotId; fallbackGap: number }[] = [
  { id: "title", before: "concept", fallbackGap: 3.9 },
];

export const TITLE = "孤立高低点";
export const TITLE_EN = "SWING HIGH · SWING LOW";

const L = (shot: ShotId, a: number, b: number, text: string): ScriptLine => ({ text, shot, seed: [a, b] });

export const LINES: ScriptLine[] = [
  L("hook", 0.0, 3.2, "当你在这里进场，|行情已经连涨了好几天"),
  L("hook", 3.2, 4.9, "结果一波回调砸了下来"),
  L("hook", 4.9, 7.2, "走还是不走？|是不是又开始纠结了"),
  L("hook", 7.2, 9.4, "走，怕这只是正常的回踩"),
  L("hook", 9.4, 10.7, "一卖就飞"),
  L("hook", 10.7, 13.7, "不走，又怕它是真反转，|把利润全吐回去"),
  L("hook", 13.7, 14.7, "如果你还在这样想"),
  L("hook", 14.7, 17.2, "说明你还停在市场的新手阶段"),
  L("hook", 17.2, 21.0, "真正的交易者，|从不靠“怕”和“猜”|来决定去留"),
  L("hook", 21.0, 24.1, "趋势反转之前，|K线早就把答案写好了"),

  L("concept", 28.0, 29.6, "你进场之后"),
  L("concept", 29.6, 31.3, "价格留下的那个孤立高点"),
  L("concept", 31.3, 32.6, "在订单流的视角里"),
  L("concept", 32.6, 34.5, "它就是挂在上面、|等着被吃掉的买方流动性"),
  L("concept", 34.5, 35.7, "等回调结束"),
  L("concept", 35.7, 38.1, "价格第二次去碰这个高点"),
  L("concept", 38.1, 39.8, "主力的底牌，就在这里摊开"),
  L("concept", 39.8, 41.3, "那，孤立高低点到底怎么定义"),

  L("define", 41.3, 43.1, "很简单，三根K线算一组"),
  L("define", 43.1, 45.3, "只要中间那根K线的高点"),
  L("define", 45.3, 47.7, "高过它两边两根K线的高点"),
  L("define", 47.7, 51.0, "而它的低点，|同样高过两边那两根的低点"),
  L("define", 51.0, 53.4, "那么中间那根K线的这个高点"),
  L("define", 53.4, 54.7, "就叫孤立高点"),
  L("define", 54.7, 56.4, "条件反过来，就是孤立低点"),
  L("define", 56.4, 58.7, "孤立高点，可以看作压力"),
  L("define", 58.7, 60.5, "孤立低点，可以看作支撑"),
  L("define", 60.5, 63.5, "关键是别把它当死线，|要跟着它一起挪"),
  L("define", 63.5, 64.7, "我们来看一个案例"),

  L("case", 64.7, 66.1, "这里先冒出一个孤立高点"),
  L("case", 66.1, 68.3, "先把它标成一条潜在的压力线"),
  L("case", 68.3, 70.1, "用一条线画出来"),
  L("case", 70.1, 71.4, "接着行情开始往下"),
  L("case", 71.4, 72.8, "走出一个孤立低点"),
  L("case", 72.8, 74.9, "先把它看作一条潜在支撑"),
  L("case", 74.9, 77.5, "行情又开始往回走"),
  L("case", 77.5, 78.9, "现在要盯的重点是"),
  L("case", 78.9, 80.9, "价格对这条压力线的突破动作"),
  L("case", 80.9, 83.3, "这里价格干脆地突破了压力"),
  L("case", 83.3, 84.9, "又走出一根新的孤立高点"),
  L("case", 84.9, 86.5, "行情继续向下"),
  L("case", 86.5, 87.7, "继续盯"),
  L("case", 87.7, 89.7, "价格对这条支撑线的突破动作"),
  L("case", 89.7, 92.1, "这一次，价格没有跌破支撑"),
  L("case", 92.1, 94.1, "而是在这里又走出一个孤立低点"),
  L("case", 94.1, 95.1, "然后重新往上"),
  L("case", 95.1, 96.7, "你看这条支撑"),
  L("case", 96.7, 98.3, "已经托住了价格两次"),
  L("case", 98.3, 99.7, "继续观察"),
  L("case", 99.7, 101.2, "价格能不能顶穿这个高点"),
  L("case", 101.2, 103.9, "这一回，|价格在高点上方没有被压住"),
  L("case", 103.9, 105.3, "一根大阳线"),
  L("case", 105.3, 106.7, "直接冲过了压力"),
  L("case", 106.7, 108.8, "假设你在这里做的是多单"),
  L("case", 108.8, 111.3, "那现在就可以安心拿着"),
  L("case", 111.3, 114.1, "反过来，|要是价格这次突破失败"),
  L("case", 114.1, 116.0, "或者假突破一下又掉下来"),
  L("case", 116.0, 116.9, "那么"),
  L("case", 116.9, 118.6, "及时减仓或者离场"),
  L("case", 118.6, 120.2, "才是最该做的选择"),
  L("case", 120.2, 120.9, "反过来"),
  L("case", 120.9, 123.0, "那换成做空呢"),
  L("case", 123.0, 125.2, "价格在这里留下一个孤立低点"),
  L("case", 125.2, 128.4, "你就该重点盯|价格对它的突破动作"),
  L("case", 128.4, 130.2, "如果像这样始终不破"),
  L("case", 130.2, 131.5, "那你就要考虑减仓"),
  L("case", 131.5, 133.9, "可要是价格干脆利落地砸下去"),
  L("case", 133.9, 135.2, "直接跌穿这个孤立低点"),
  L("case", 135.2, 136.6, "那就继续拿着"),

  L("advanced", 136.6, 138.2, "我们再往深一步"),
  L("advanced", 138.2, 139.8, "假设你手里是多单"),
  L("advanced", 139.8, 141.2, "你对趋势的判断"),
  L("advanced", 141.2, 142.8, "进场的理由也站得住"),
  L("advanced", 142.8, 144.4, "你在这里进了场"),
  L("advanced", 144.4, 147.7, "看到价格两次|都没能砸穿这个孤立低点"),
  L("advanced", 147.7, 149.2, "能不能加仓"),
  L("advanced", 149.2, 150.2, "可以"),
  L("advanced", 150.2, 151.7, "但我要提醒你一句"),
  L("advanced", 151.7, 155.2, "前提是你对趋势的判断是对的，|入场逻辑是成立的"),
  L("advanced", 155.2, 156.8, "再假设你也是多头"),
  L("advanced", 156.8, 158.2, "但错过了刚才那个入场点"),
  L("advanced", 158.2, 161.6, "后来你看到价格两次|都没能砸穿这个低点"),
  L("advanced", 161.6, 163.7, "这时候能不能建仓进场"),
  L("advanced", 163.7, 165.0, "也可以"),
  L("advanced", 165.0, 166.5, "这就是动态跟踪"),
  L("advanced", 166.5, 168.4, "盯着孤立高低点一起变"),
  L("advanced", 168.4, 170.4, "让它帮我们止盈"),
  L("advanced", 170.4, 172.3, "止损，或者帮我们加仓"),
  L("advanced", 172.3, 173.7, "减仓和离场"),

  L("broll1", 173.7, 174.7, "回头看"),
  L("broll1", 174.7, 176.6, "其实我们整期一直在做的"),
  L("broll1", 176.6, 177.8, "其实是同一件事"),
  L("broll2", 177.8, 179.6, "不是猜行情接下来会去哪"),
  L("broll2", 179.6, 182.6, "而是持续去读，|市场当下在说什么"),
  L("broll2", 182.6, 183.9, "你的每一个动作"),
  L("broll3", 183.9, 186.5, "都在跟着市场给的反馈走"),
  L("ticker", 186.5, 188.5, "一步步收窄自己的风险敞口"),
  L("outro", 188.5, 189.6, "我是 LVP"),
  L("outro", 189.6, 190.9, "我们下期再见"),
];
