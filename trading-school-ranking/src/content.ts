// 排名、口播、卡片文案。改文案只改这里；改完跑 npm run check 和 npm run fonts。
//
// 每条口播段（Segment）是一句完整字幕，字幕与配音逐字一致。
// scene 决定这句话落在哪一页；同一页内第 n 句话的开头就是该页第 n 个动作的触发点。

export type SchoolKey = "indicator" | "nakedK" | "priceAction" | "wyckoff" | "orderFlow";

export type SceneKind =
  | "intro" // 开场两行大字
  | "rank" // 全屏超大数字揭晓名次
  | "concept" // 核心概念图
  | "cards" // 绿色优势卡 + 红色风险卡
  | "ofTrace" // 订单流：痕迹 vs 推动
  | "ofBook" // 订单流：订单簿 → 足迹 → 信号（大单吃掉卖盘、价格移动）
  | "ofPath" // 订单流：金色路径总结
  | "ending"; // 白底思维导图 + 结论

export type SceneDef = { id: string; kind: SceneKind; school?: SchoolKey };

export type Segment = {
  id: string;
  scene: string;
  text: string;
  /** 这一句是结论句：后面多留停顿，不再新增元素 */
  hold?: boolean;
  /** cards 页：这一句开始时展开红色风险卡 */
  risk?: boolean;
};

export type School = {
  key: SchoolKey;
  rank: 1 | 2 | 3 | 4 | 5;
  rankText: string;
  name: string;
  /** 概念页图表标题（40–52px） */
  chartTitle: string;
  /** 卡片页缩略图下的一句话 */
  essence: string;
  /** 优势 / 风险：每条 10–14 个字（不计标点） */
  pros: [string, string, string];
  cons: [string, string, string];
};

export const TITLE = { line1: "主流交易流派", line2: "排行榜" } as const;
export const DISCLAIMER = "内容仅作科普，不构成投资建议";

export const SCHOOLS: Record<SchoolKey, School> = {
  indicator: {
    key: "indicator",
    rank: 5,
    rankText: "第五名",
    name: "传统指标与形态",
    chartTitle: "从历史价格里算出信号",
    essence: "看价格的二次加工",
    pros: ["门槛低，人人都能轻松上手", "软件自带，指标工具繁多", "规则明确，很方便做回测"],
    cons: ["全部由价格算出，天生滞后", "震荡行情里反复假信号", "参数一改，结论就跟着变"],
  },
  nakedK: {
    key: "nakedK",
    rank: 4,
    rankText: "第四名",
    name: "裸K",
    chartTitle: "只看K线本身",
    essence: "看价格的原始形状",
    pros: ["画面干净，没有指标干扰", "直接读价格，比指标反应快", "适用于任何品种和周期"],
    cons: ["高度依赖个人经验积累", "同一根K线十个人十种解读", "缺少统一标准，很难回测"],
  },
  priceAction: {
    key: "priceAction",
    rank: 3,
    rankText: "第三名",
    name: "价格行为",
    chartTitle: "看整段走势的结构",
    essence: "看价格的运动结构",
    pros: ["框架完整，趋势结构清晰", "入场止损都有明确依据", "能分辨真突破与假突破"],
    cons: ["规则繁多，学习周期很长", "看到的仍是价格的结果", "主观判断多，执行易走样"],
  },
  wyckoff: {
    key: "wyckoff",
    rank: 2,
    rankText: "第二名",
    name: "威科夫理论",
    chartTitle: "价格背后是谁在买卖",
    essence: "看量价背后的资金",
    pros: ["能读出大资金行为逻辑", "量价结合，分析视角更完整", "适合把握大级别的转折"],
    cons: ["阶段划分过于依赖主观", "往往事后清楚，当下模糊", "形态周期长，等待成本高"],
  },
  orderFlow: {
    key: "orderFlow",
    rank: 1,
    rankText: "第一名",
    name: "订单流",
    chartTitle: "价格是怎么被推动的",
    essence: "看推动价格的成交",
    pros: ["直接看见真实成交与挂单", "信号领先于K线和指标", "能识别吸收与流动性陷阱"],
    cons: ["数据昂贵，需要专业软件", "节奏极快，对盯盘要求高", "挂单可撤，大单也会骗人"],
  },
};

/** 从第五名到第一名的顺序 */
export const ORDER: SchoolKey[] = ["indicator", "nakedK", "priceAction", "wyckoff", "orderFlow"];

export const SCENES: SceneDef[] = [
  { id: "intro", kind: "intro" },
  { id: "r5-rank", kind: "rank", school: "indicator" },
  { id: "r5-concept", kind: "concept", school: "indicator" },
  { id: "r5-cards", kind: "cards", school: "indicator" },
  { id: "r4-rank", kind: "rank", school: "nakedK" },
  { id: "r4-concept", kind: "concept", school: "nakedK" },
  { id: "r4-cards", kind: "cards", school: "nakedK" },
  { id: "r3-rank", kind: "rank", school: "priceAction" },
  { id: "r3-concept", kind: "concept", school: "priceAction" },
  { id: "r3-cards", kind: "cards", school: "priceAction" },
  { id: "r2-rank", kind: "rank", school: "wyckoff" },
  { id: "r2-concept", kind: "concept", school: "wyckoff" },
  { id: "r2-cards", kind: "cards", school: "wyckoff" },
  { id: "r1-rank", kind: "rank", school: "orderFlow" },
  { id: "r1-trace", kind: "ofTrace", school: "orderFlow" },
  { id: "r1-book", kind: "ofBook", school: "orderFlow" },
  { id: "r1-path", kind: "ofPath", school: "orderFlow" },
  { id: "r1-cards", kind: "cards", school: "orderFlow" },
  { id: "ending", kind: "ending" },
];

/** 口播稿：一行一句，也是字幕。录音请逐字照读。 */
export const SEGMENTS: Segment[] = [
  { id: "s01", scene: "intro", text: "交易流派那么多，到底哪个最强？" },
  { id: "s02", scene: "intro", text: "从第五名，排到第一名。" },

  { id: "s03", scene: "r5-rank", text: "第五名，传统指标与形态。" },
  { id: "s04", scene: "r5-concept", text: "均线、MACD、头肩顶，人人都学过。" },
  { id: "s05", scene: "r5-concept", text: "金叉买，死叉卖，最好上手。" },
  { id: "s06", scene: "r5-cards", text: "优势是门槛低，工具多。" },
  { id: "s07", scene: "r5-cards", text: "但指标从价格算出，天生滞后，", risk: true },
  { id: "s08", scene: "r5-cards", text: "震荡市里反复给假信号。", hold: true },

  { id: "s09", scene: "r4-rank", text: "第四名，裸K。" },
  { id: "s10", scene: "r4-concept", text: "删掉指标，只看K线本身。" },
  { id: "s11", scene: "r4-concept", text: "长上影、吞没、关键高低点，直读多空。" },
  { id: "s12", scene: "r4-cards", text: "优势是干净，反应比指标快。" },
  { id: "s13", scene: "r4-cards", text: "风险是太靠经验，十人十种解读。", risk: true, hold: true },

  { id: "s14", scene: "r3-rank", text: "第三名，价格行为。" },
  { id: "s15", scene: "r3-concept", text: "它不看单根K线，看整段结构。" },
  { id: "s16", scene: "r3-concept", text: "高低点怎么排，突破是真是假。" },
  { id: "s17", scene: "r3-cards", text: "优势是框架完整，进出有依据。" },
  { id: "s18", scene: "r3-cards", text: "缺点是规则多，周期长，", risk: true },
  { id: "s19", scene: "r3-cards", text: "而且看到的仍是价格的结果。", hold: true },

  { id: "s20", scene: "r2-rank", text: "第二名，威科夫理论。" },
  { id: "s21", scene: "r2-concept", text: "它追问：价格背后是谁在买卖？" },
  { id: "s22", scene: "r2-concept", text: "吸筹、拉升、派发、下跌，配合成交量。" },
  { id: "s23", scene: "r2-cards", text: "优势是读得出大资金意图。" },
  { id: "s24", scene: "r2-cards", text: "风险是太主观，事后清楚，当下模糊。", risk: true, hold: true },

  { id: "s25", scene: "r1-rank", text: "第一名，订单流。" },
  { id: "s26", scene: "r1-trace", text: "前四个流派，看的都是价格的痕迹。" },
  { id: "s27", scene: "r1-trace", text: "订单流看的是价格怎么被推动。" },
  { id: "s28", scene: "r1-book", text: "订单簿上方挂卖单，下方挂买单。" },
  { id: "s29", scene: "r1-book", text: "大买单冲进来，吃光上方卖盘，" },
  { id: "s30", scene: "r1-book", text: "价格被迫上跳一格。" },
  { id: "s31", scene: "r1-book", text: "每笔成交都记进足迹图，" },
  { id: "s32", scene: "r1-book", text: "买减卖就是Delta，看谁更主动。" },
  { id: "s33", scene: "r1-book", text: "卖单砸下却跌不动，这叫吸收；" },
  { id: "s34", scene: "r1-book", text: "买盘压过卖盘，这叫失衡。" },
  { id: "s35", scene: "r1-path", text: "从订单簿，到成交足迹，再到决策信号，" },
  { id: "s36", scene: "r1-path", text: "这是离真相最近的一层。", hold: true },
  { id: "s37", scene: "r1-cards", text: "优势是看见真实成交，信号领先。" },
  { id: "s38", scene: "r1-cards", text: "风险是数据贵、节奏快、门槛高。", risk: true, hold: true },

  { id: "s39", scene: "ending", text: "其实五个流派，本是一套系统。" },
  { id: "s40", scene: "ending", text: "交易没有绝对最强的流派，只有最适合你性格的系统。", hold: true },
];

/** 片尾结论（大字），与最后一句口播一致 */
export const CONCLUSION = { a: "交易没有绝对最强的流派，", b: "只有最适合你性格的系统。" } as const;

/** 片尾思维导图 */
export const MINDMAP = {
  center: "交易系统",
  branches: [
    { name: "指标与形态", leaves: ["信号工具", "辅助确认"] },
    { name: "裸K", leaves: ["价格语言", "关键位置"] },
    { name: "价格行为", leaves: ["趋势结构", "进出场依据"] },
    { name: "威科夫", leaves: ["量价阶段", "资金意图"] },
    { name: "订单流", leaves: ["真实成交", "执行时机"] },
    { name: "你的性格", leaves: ["风险偏好", "持仓周期"], key: true },
  ],
} as const;
