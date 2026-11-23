# SHOTBOOK v2: EP.04 订单流 · 三种成交 (`Ep04OrderFlowThreeFills`)

1080×1920 · 30 fps · the length is the real voiceover length (`public/audio/vo.mp3`).

## What changed from v1 (feedback: 画面节奏太慢)

- **Every caption clause starts a visual change.** v1 had 15 of 77 clauses with nothing happening; v2 has none. In total there are 105 beats, and the longest stretch without a change is 2.9 s (fallback timing). `npm run check` now fails if any clause has no beat or any gap exceeds 3 s.
- **The camera moves on the word.** v1 stretched each move across the whole gap between two anchors, so the frame crept for 5–10 s. v2 uses `camSteps`: the camera holds, then makes a 0.65 s move that starts on the word.
- **The K-line chart is the main subject** (following `skills/orderflow-explainer-video`). There is one deterministic 80-bar chart (示意图 · 模拟数据, always labelled in the corner). The three abstract pillar shots are gone. Drill-downs use only three layers: chart → that bar's footprint (volume per price) → order book. During a drill-down, a minimap marks which bar you are looking at.
- **Rules carried over:** at most 3 tags per shot, each keyed to its word; nothing in the caption band (3D content is masked to y 300–1360); the two ［短暂停顿］ never fall on a shot boundary; the camera uses `aim()` so the subject stays in the content band.

## Data (src/data.ts)

| bar | what | used in |
|-----|------|---------|
| 0–43 | the rise | context |
| 44 | the bar you chased: up to 10.14, closes 10.02 (long upper wick), 3400手. Its footprint rows sum to 3400. | hook, tape, sum |
| 52 | the biggest volume in the area (3900手), and the close equals the open | absorb-k, sum |
| 59–72 | the narrow range, key level 9.94 | forced |
| 73 / 74 | the break, then the stop cascade (−22 ticks, 5200手) | forced, sum |
| profile | volume per price across all 80 bars; value area = 70.7 % | next |
| forks | 12 identical bars, then A (accepted) / B (rejected) | accept |

## Shots

Times are the even-split estimates over the 133 s placeholder; run `npm run check` after alignment for the real ones. **Bold** words are the anchors that trigger each change.

| # | shot | est. (s) | beats (one or more per clause) | tags |
|---|------|---------|--------------------------------|------|
| 1 | `hook` · chart | 0.0–4.5 | **追进去**: bar 44 surges and the camera pushes in; red entry level. **掉头**: the bar turns, with a shake. **运气差**: focus box; bars outside dim. | 追进 · 掉头 |
| 2 | `tape` · footprint | 4.5–10.2 | **那一秒**: bar 44 opens into its footprint (bid × ask per price), row by row; the minimap appears. **三种成交**: red rows, then blue rows, then amber rows light up in turn. **胜负**: the close box drops to 10.02. **没看见**: the plain candle is laid over the footprint. | 主动 · 被动 · 被迫 |
| 3 | `who` · chart → book | 10.2–14.7 | **先别盯**: the chart sinks back. **你想啊**: the order book comes forward. **谁在成交**: trades hit the last price. | 谁在成交 |
| 4 | `three` · book | 14.7–25.4 | **挂单慢**: a red order appears. **追着价格打**: it lifts the 10.01 offer and the price ticks up. **有人不着急**: a blue order drops onto 9.99. **等别人来**: a seller fills it. **还有一种**: an amber stop appears at 9.97. **没打算动**: it dims and waits; the camera moves to it. **止损一破**: the price breaks down with a shake. **被硬逼着**: the stop turns into a sell and hits the bids. | 主动 · 被动 · 被迫 |
| 5 | `tug` · book close-up | 25.4–29.4 | **下一跳**: the camera pushes onto the price cell. **几股力量**: three colours of orders stream in. **较劲**: the price flickers. **结果**: it settles one tick up, with a shake. | 下一跳 |
| 6 | `aggr` · book | 29.4–42.3 | **最直接的**: the camera moves to the asks. **追着价格打的人**: a queue of buyers. **吃卖单**: they eat 10.01→10.03. **往上跳**: a jump and shake. **砸买单**: sellers eat the bids. **往下走**: a drop and shake. **它告诉你**: pull back. **付多少钱**: a red bracket over 3 ticks. | 主动买 · 主动卖 · 多付3跳 |
| 7 | `absorb` · book | 42.3–60.7 | **不能只看**: the book dims. **你冲上去**: red burst. **有没有人接**: the 10.01 slab glows. **挂在某个价位**: an order drops onto 10.01. **不追价**: the price slips away and back while the order stays. **送上门**: buys are absorbed. **被动承接**: tag. **上面卖单厚**: the wall thickens. **推不动**: buying bounces off. **下面买单厚**: a bid wall. **主动卖再猛**: green barrage. **被接住**: tag. | 被动承接 · 推不动 · 被接住 |
| 8 | `absorb-k` · chart | 60.7–66.7 | **成交很大**: bar 52's volume shoots up (3900手). **价格却不走**: a flat line at the same price; the ［短暂停顿］ holds this shot. **有人主动打**: orders hit the bar from both sides. **稳稳接**: blue resting orders show at both of the bar's edges. | 价不动 · 稳稳接 |
| 9 | `broll-desk` | 66.7–75.7 | **栽在**: push-in step. **追第一笔**: 追 appears. **挂单硬扛**: 扛 appears. **弹幕**: both pulse. **先别急着**: both fade and the frame pulls back. | 追 · 扛 |
| 10 | `forced` · chart | 75.7–95.8 | **突然加速**: push onto the narrow range, with a focus box. **第三批人**: stop clusters appear under 9.94. **被迫平仓**: they pulse. **一破**: bar 73 breaks the level, with a shake. **被触发**: the first stops fire into the bar. **观望的人** / **也被迫成交**: more fire. **一下加速**: bar 74 plunges, with a big shake and a volume spike. **主力发力**: tag. **其实有时候**: pull back. **同一方向**: push in. **逼了出来**: the stops relight in sequence. | 止损单 → 被迫成交 → 连续被迫 · 主力? |
| 11 | `sum` · chart | 95.8–106.1 | **放一起看**: the full chart. **追价的人**: ring on bar 44. **谁着急**: tag. **挂单的人**: ring on bar 52. **谁有耐心**: tag. **被迫成交的人**: ring on bar 74. **突然加速**: tag, then pull back. | 着急 · 耐心 · 加速 |
| 12 | `accept` · two stacked charts | 106.1–120.1 | **最后一步**: the new price level appears in both panels and holds through the ［短暂停顿］. **新价格出来**: the same push bar prints in both. **接受它**: the level glows. **往上冲**: push into A. **能延续** / **回踩** / **有人接** / **站得住**: one A bar per word (blue bids catch the retest). **没人跟**: move to B. **收回来**: B's spike reverses. **不认可**: B falls away. | 新价格 · 站得住 · 不认可 |
| 13 | `print` | 120.1–126.6 | **拍脑袋**: "10.08?". **定出来**: struck out. **买卖双方**: the first prints. **一笔一笔**: the print rate jumps. **成交拍出来**: the candle built from the prints is tagged. | 一笔一笔 · 成交拍出来 |
| 14 | `next` · chart + profile | 126.6–133.0 | **下一期**: the volume profile grows. **为什么**: pull back. **百分之七十**: the value area lights. **挤在**: it glows and the rest dims. | 70% |
