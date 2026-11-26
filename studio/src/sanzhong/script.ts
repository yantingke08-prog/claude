// Single timing source for 三种成交 (SanzhongLVP).
// - PARAGRAPHS is the user's exact narration (［短暂停顿］ = a pause in the recording), split into shots.
// - BEATS names every visual action by the spoken word it lands on. No second is hard-coded:
//   a beat's time = that word's start in vo.timestamps.json (or the even-split fallback).
// - SFX hangs sound cues on beats, so picture, captions and sound all move with the recording.
// Pure module (no Remotion imports): scripts/sanzhong-check.mts imports it with node.

export type Tone = "red" | "green" | "cyan" | "amber" | "violet"; // red = up/buy, green = down/sell (红涨绿跌)
export type ShotId =
  | "hook"
  | "tape"
  | "who"
  | "three"
  | "tug"
  | "aggr"
  | "passive"
  | "absorb"
  | "poll"
  | "forced"
  | "cascade"
  | "sum"
  | "accept"
  | "print"
  | "next";

export type Segment = { text: string; shot: ShotId };

export const PARAGRAPHS: Segment[][] = [
  [{ text: "你刚追进去，价格立马掉头，不是你运气差。", shot: "hook" }],
  [{ text: "那一秒，盘口里的三种成交已经分出了胜负，只是你还没看见。", shot: "tape" }],
  [{ text: "先别盯 K 线。你想啊，这一下到底是谁在成交？", shot: "who" }],
  [{ text: "有人嫌挂单慢，直接追着价格打；有人不着急，挂在原地等别人来；还有一种，本来没打算动，止损一破，被硬逼着成交。", shot: "three" }],
  [{ text: "价格下一跳，就是这几股力量较劲的结果。", shot: "tug" }],
  [{ text: "最直接的，是追着价格打的人。主动买连续吃卖单，价格往上跳；主动卖连续砸买单，价格往下走。它告诉你，着急的人愿意为成交付多少钱。", shot: "aggr" }],
  [
    { text: "可盘口不能只看谁着急。你冲上去，还得看有没有人接。", shot: "passive" },
    { text: "有人挂在某个价位，不追价，等别人送上门，这就是被动承接。上面卖单厚，主动买再多也可能推不动；下面买单厚，主动卖再猛，也可能被接住。", shot: "passive" },
    { text: "成交很大，价格却不走［短暂停顿］往往就是有人主动打，有人在稳稳接。", shot: "absorb" },
  ],
  [{ text: "你更容易栽在哪种成交上？追第一笔主动单，还是挂单硬扛？弹幕打\"追\"或者\"扛\"。", shot: "poll" }],
  [{ text: "先别急着回答。最容易让行情突然加速的，往往是第三批人：止损和被迫平仓。", shot: "forced" }],
  [{ text: "关键位一破，止损单被触发，原本观望的人也被迫成交。窄行情可能一下加速。很多人以为主力发力了，其实有时候，只是同一方向的单子被连续逼了出来。", shot: "cascade" }],
  [{ text: "把这几股力量放一起看：追价的人决定谁着急，挂单的人决定谁有耐心，被迫成交的人决定行情会不会突然加速。", shot: "sum" }],
  [
    { text: "但还有最后一步［短暂停顿］新价格出来以后，市场得接受它。", shot: "accept" },
    { text: "往上冲，成交能延续，回踩有人接，新价格才站得住；冲上去没人跟，马上收回来，就是市场不认可。", shot: "accept" },
  ],
  [{ text: "所以价格不是谁拍脑袋定出来的，是买卖双方一笔一笔成交拍出来的。", shot: "print" }],
  [{ text: "下一期，我们看为什么百分之七十的成交，都挤在同一个区间。", shot: "next" }],
];

/** Header label per shot (chapter). */
export const SHOT_LABEL: Record<ShotId, string> = {
  hook: "01 · 那一秒",
  tape: "01 · 那一秒",
  who: "02 · 谁在成交",
  three: "02 · 谁在成交",
  tug: "02 · 谁在成交",
  aggr: "03 · 主动成交",
  passive: "04 · 被动承接",
  absorb: "04 · 被动承接",
  poll: "04 · 被动承接",
  forced: "05 · 被迫成交",
  cascade: "05 · 被迫成交",
  sum: "06 · 三股力量",
  accept: "07 · 市场接受",
  print: "07 · 市场接受",
  next: "LVP订单流",
};

/**
 * Named beats. `at` is a phrase of the narration; the beat fires when its first character is spoken.
 * `after` disambiguates repeated phrases (search starts after that phrase). `edge: "end"` = when the
 * phrase finishes. Every beat must resolve (npm run sz:check fails otherwise).
 */
export type BeatDef = { at: string; after?: string; edge?: "start" | "end" };
export const BEATS = {
  // hook
  chase: { at: "你刚追" },
  enter: { at: "进去" },
  turn: { at: "掉头" },
  notLuck: { at: "不是你运气差" },
  // tape
  thatSec: { at: "那一秒" },
  three3: { at: "三种成交", after: "盘口里的" },
  decided: { at: "分出了胜负" },
  notSeen: { at: "只是你还没看见" },
  // who
  noK: { at: "先别盯" },
  think: { at: "你想啊" },
  whoTrades: { at: "谁在成交" },
  // three
  hateSlow: { at: "有人嫌挂单慢" },
  chaseHit: { at: "追着价格打", after: "直接" },
  patient: { at: "有人不着急" },
  rest: { at: "挂在原地" },
  thirdKind: { at: "还有一种" },
  stopBreak: { at: "止损一破" },
  forcedFill: { at: "被硬逼着成交" },
  // tug
  nextTick: { at: "价格下一跳" },
  forces: { at: "这几股力量较劲" },
  result: { at: "的结果", after: "较劲" },
  // aggr
  direct: { at: "最直接的" },
  aggBuy: { at: "主动买连续吃卖单" },
  upTick: { at: "价格往上跳" },
  aggSell: { at: "主动卖连续砸买单" },
  downTick: { at: "价格往下走" },
  urgent: { at: "着急的人" },
  howMuch: { at: "付多少钱" },
  // passive
  notOnly: { at: "可盘口" },
  rushUp: { at: "你冲上去" },
  anyone: { at: "有没有人接" },
  sitLevel: { at: "有人挂在某个价位" },
  delivered: { at: "等别人送上门" },
  passiveName: { at: "被动承接" },
  askThick: { at: "上面卖单厚" },
  cantPush: { at: "推不动" },
  bidThick: { at: "下面买单厚" },
  caught: { at: "被接住" },
  // absorb
  bigVol: { at: "成交很大" },
  noMove: { at: "价格却不走" },
  hitAndHold: { at: "往往就是" },
  steady: { at: "有人在稳稳接" },
  // poll
  whichOne: { at: "你更容易栽" },
  pollChase: { at: "追第一笔主动单" },
  pollHold: { at: "还是挂单硬扛" },
  danmaku: { at: "弹幕打" },
  // forced
  waitAnswer: { at: "先别急着回答" },
  accel: { at: "最容易让行情突然加速" },
  thirdGroup: { at: "第三批人" },
  stopsName: { at: "止损和被迫平仓" },
  // cascade
  levelBreak: { at: "关键位一破" },
  triggered: { at: "止损单被触发" },
  bystanders: { at: "原本观望的人" },
  narrowFast: { at: "窄行情" },
  bigPlayer: { at: "很多人以为主力发力了" },
  actually: { at: "其实有时候" },
  forcedOut: { at: "只是同一方向的单子" },
  // sum
  together: { at: "把这几股力量" },
  sumChase: { at: "追价的人" },
  sumRest: { at: "挂单的人" },
  sumForced: { at: "被迫成交的人" },
  // accept
  lastStep: { at: "但还有最后一步" },
  newPrice: { at: "新价格出来以后" },
  accepted: { at: "市场得接受它" },
  pushUp: { at: "往上冲" },
  follow: { at: "成交能延续" },
  pullback: { at: "回踩有人接" },
  holds: { at: "站得住" },
  noFollow: { at: "冲上去没人跟" },
  snapBack: { at: "马上收回来" },
  rejected: { at: "市场不认可" },
  // print
  notGuess: { at: "所以价格不是" },
  bothSides: { at: "是买卖双方" },
  oneByOne: { at: "一笔一笔成交" },
  // next
  nextEp: { at: "下一期" },
  pct70: { at: "百分之七十" },
  sameZone: { at: "都挤在同一个区间" },
} satisfies Record<string, BeatDef>;
export type BeatId = keyof typeof BEATS;

/** Caption keywords: drawn in the tone colour (the first match in a caption unit). */
export const HI: [phrase: string, tone: Tone][] = [
  ["掉头", "green"],
  ["三种成交", "amber"],
  ["谁在成交", "amber"],
  ["追着价格打", "amber"],
  ["挂在原地", "cyan"],
  ["被硬逼着成交", "violet"],
  ["较劲", "amber"],
  ["主动买", "red"],
  ["主动卖", "green"],
  ["往上跳", "red"],
  ["往下走", "green"],
  ["付多少钱", "amber"],
  ["有没有人接", "cyan"],
  ["被动承接", "cyan"],
  ["推不动", "amber"],
  ["被接住", "red"],
  ["价格却不走", "amber"],
  ["稳稳接", "cyan"],
  ["\"追\"", "amber"],
  ["\"扛\"", "cyan"],
  ["突然加速", "amber"],
  ["第三批人", "violet"],
  ["止损和被迫平仓", "violet"],
  ["止损单被触发", "violet"],
  ["被迫成交", "violet"],
  ["一下加速", "amber"],
  ["连续逼了出来", "violet"],
  ["谁着急", "amber"],
  ["谁有耐心", "cyan"],
  ["接受它", "amber"],
  ["站得住", "red"],
  ["市场不认可", "green"],
  ["一笔一笔", "amber"],
  ["百分之七十", "amber"],
];

export type SfxKind = "draw" | "tick" | "confirm" | "fail" | "stamp";
export type SfxCue = { beat: BeatId; kind: SfxKind; off?: number /* seconds */ };
export const SFX: SfxCue[] = [
  { beat: "enter", kind: "tick" },
  { beat: "turn", kind: "fail" },
  { beat: "three3", kind: "stamp" },
  { beat: "noK", kind: "fail" },
  { beat: "whoTrades", kind: "draw" },
  { beat: "chaseHit", kind: "tick" },
  { beat: "rest", kind: "tick" },
  { beat: "stopBreak", kind: "fail" },
  { beat: "nextTick", kind: "tick" },
  { beat: "aggBuy", kind: "draw" },
  { beat: "upTick", kind: "tick" },
  { beat: "aggSell", kind: "draw" },
  { beat: "downTick", kind: "tick" },
  { beat: "howMuch", kind: "stamp" },
  { beat: "sitLevel", kind: "draw" },
  { beat: "passiveName", kind: "stamp" },
  { beat: "cantPush", kind: "fail" },
  { beat: "caught", kind: "confirm" },
  { beat: "noMove", kind: "tick" },
  { beat: "steady", kind: "confirm" },
  { beat: "pollChase", kind: "tick" },
  { beat: "pollHold", kind: "tick" },
  { beat: "stopsName", kind: "stamp" },
  { beat: "levelBreak", kind: "fail" },
  { beat: "triggered", kind: "draw" },
  { beat: "narrowFast", kind: "fail" },
  { beat: "sumChase", kind: "tick" },
  { beat: "sumRest", kind: "tick" },
  { beat: "sumForced", kind: "tick" },
  { beat: "holds", kind: "confirm" },
  { beat: "snapBack", kind: "fail" },
  { beat: "oneByOne", kind: "draw" },
  { beat: "pct70", kind: "stamp" },
];

/** Seconds the film holds after the last spoken word. */
export const TAIL = 1.8;
export const FPS = 30;
