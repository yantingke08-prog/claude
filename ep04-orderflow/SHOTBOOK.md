# SHOTBOOK — EP.04 订单流 · 三种成交 (`Ep04OrderFlowThreeFills`)

1080×1920 · 30 fps · length = the real voiceover length (`public/audio/vo.mp3`).

**About the times below.** Nothing in the code uses these numbers. Every shot change and every animation is tied to a *text anchor*: `at("吃卖单")` returns the moment the voiceover starts that word, read from `public/audio/vo.timestamps.json`. The ranges in this table come from the even-split fallback over the 133 s placeholder. To print the real ranges after alignment, run `npm run check`.

Rules held everywhere: key content stays between y 290 and 1340. The top 260 px and bottom 1520–1920 px are platform UI. Captions are one line at y≈1445. Tags are short, object-coloured text within 16 px of their object, with no cards, leader lines or dots. Shots cross-fade over the previous shot (10 frames, never through black). The two ［短暂停顿］ never fall on a shot boundary; `npm run check` enforces this.

Colours: 主动买/上涨 red · 主动卖/下跌 green · 被动挂单 blue · 被迫/止损 amber.

| # | shot | est. range (s) | voiceover anchors → what happens | main tag |
|---|------|---------------|-----------------------------------|----------|
| 1 | `hook` | 0.0–4.5 | Close on a 3D candle chart. **追进去**: the last candle surges and a red entry level appears. **掉头**: the candle turns and closes far below, leaving a long upper wick. The camera pulls back. | 追进 / 掉头 |
| 2 | `tape` | 4.5–10.2 | An order-book ladder in 3D. **那一秒**: a clock reading 09:31:05 freezes. **三种成交**: a red market order punches into the asks, a blue bid holds, and a dashed amber stop block lights below. **胜负**: the price drops a tick. **没看见**: the book dims. | 主动 · 被动 · 被迫 |
| 3 | `who` | 10.2–14.7 | **先别盯**: the candle chart sinks back into the dark while the ladder comes forward. **谁在成交**: mixed orders hit the current price. | 谁在成交 |
| 4 | `three` | 14.7–25.4 | Three pillars stand in a 3D row and the camera pans across them. **追着价格打**: red blocks shoot in from the left. **挂在原地**: blue blocks settle from above. **还有一种**: the amber pillar is half built behind a dashed stop line. **止损一破**: the line snaps. **被硬逼着**: amber blocks are shoved up. | 主动成交 / 被动成交 / 被迫成交 |
| 5 | `tug` | 25.4–29.4 | A big price figure sits above the three pillars. **下一跳**: tag. **较劲**: orders fly from each pillar into the price, which wobbles and settles one tick away. | 下一跳 |
| 6 | `aggr` | 29.4–42.3 | **主动买…往上跳**: red orders eat ask levels 10.01→10.03 one by one and the price marker climbs. Fresh bids then line up under the new price. **主动卖…往下走**: green orders eat bids 10.02→9.99. **付多少钱**: a red bracket 10.00→10.03. | 主动买 / 主动卖 / 多付3跳 |
| 7 | `absorb` | 42.3–66.7 | A thick ask wall sits at 10.01. **冲上去**: red orders hit it and barely dent it. **有没有人接**: the wall glows. **被动承接**: the wall refills. **推不动**: tag. **下面买单厚**: a thick bid wall grows. **被接住**: green orders are absorbed. **成交很大**: a VOL counter climbs while the price only twitches. **价格却不走**: tag. The ［短暂停顿］ holds this shot. **有人主动打**: both sides fire. **稳稳接**: both walls glow. | 有人接 → 被动承接 → 推不动 → 被接住 → 价不动 → 稳稳接 |
| 8 | `broll-desk` | 66.7–75.7 | **B-roll**: a trader seen from behind, three glowing screens, a slow push-in. **追第一笔**: a big red 追 pops over the left screen. **挂单硬扛**: a blue 扛 pops over the right screen. **弹幕**: both pulse. **先别急着回答**: both fade. | 追 / 扛 |
| 9 | `forced` | 75.7–95.8 | Narrow range candles sit under a white key level, with resistance faint above. **第三批人**: dashed amber stop orders appear just below the level. **关键位一破**: a candle breaks the level. **止损单被触发**: the stops fire one after another into the candle, which extends down through **被迫成交**. **一下加速**: a long green candle plunges with a short camera shake. **主力发力了**: tag "主力?". **逼了出来**: tag "连续被迫". | 止损单 → 被迫成交 → 主力? → 连续被迫 |
| 10 | `sum` | 95.8–106.1 | **放一起看**: the three pillars slide together and complete. **谁着急** / **谁有耐心** / **突然加速**: each pillar glows in turn, with its tag. | 着急 / 耐心 / 加速 |
| 11 | `accept` | 106.1–120.1 | **最后一步**: a dashed "新价格" level appears and holds through the ［短暂停顿］. **接受它**: the level brightens. **往上冲**: the camera moves to the left panel; the price breaks out. **回踩有人接**: it retests the level, where blue bids catch it. **站得住**: tag. **冲上去没人跟**: the camera moves to the right panel; a red spike. **马上收回来**: it turns green and falls back through the level. **不认可**: tag. | 新价格 / 站得住 / 不认可 |
| 12 | `print` | 120.1–126.6 | **拍脑袋**: a dim "10.08" appears and is struck out. **是买卖双方…一笔一笔**: red and green trade prints pop one by one, faster and faster, and a 3D candle builds from them. **拍出来的**: tag on the candle. | 一笔一笔 / 成交拍出来 |
| 13 | `next` | 126.6–133.0 | **下一期**: a 3D volume profile grows. **百分之七十**: the 70 % value-area band lights blue and the rest dims. **同一个区间**: the band glows. | 70% |

B-roll is used only for #8 (a question to the audience, with no honest trading picture). The registry is `src/broll.ts`; files go in `assets/broll/`.
