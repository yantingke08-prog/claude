# 字幕、配音、音乐、音效配置（v4）

## 配音

- 脚本：`studio/scripts/zhanqian-vo.py`，读取 `studio/src/zhanqian/script.json`。
- 声音：edge-tts `zh-CN-YunjianNeural`（沉稳男声），语速 −5%，音高 −2Hz。v2 语速和 v1 基本相同（只慢 1%），节奏靠缩短停顿和合并重复的句子，人声不会显得赶。
- 每句单独合成，按 `text|voice|rate|pitch` 缓存在 `public/zhanqian/vo/`。合成后裁掉首尾静音，再按 `gap` 停顿依次拼接。开头只留 0.3 秒。
- 产出：
  - `public/zhanqian/vo.wav`（48 kHz 单声道）；
  - `src/zhanqian/timeline.json`（每句的起止帧，以及字幕分段）。
- 停顿：一般 0.37–0.57 秒。只有一处例外：w5 之后留 1.6 秒，给回顾段的三张结论牌快闪。

## 字幕

- **烧录字幕**：
  - 由 `timeline.json` 的 `captions` 驱动，按 TTS 的逐词时间切分，每段最多 13 个字；
  - 54px 思源黑体，放在深色底板上，固定在 1480px 高度；
  - 关键概念词用金色。
- **不烧录字幕的句子**：h1、r1 和 r3 的原文已经用大字逐字打在画面上，所以不再重复显示。
- **外挂字幕**：`subtitles.srt`，由 `npm run zq:srt` 导出，时间和烧录字幕一致。最后一条是免责声明。

## 音乐

全部由 `scripts/zhanqian-score.py` 用 numpy/scipy 合成，没有采样素材。

- **底层**：贯穿全片的 A 低音 drone。
- **盘口、止损、参与者段**：96 BPM 的脉冲（kick + hi-hat），比 v1 的 84 BPM 快。每两小节换一个和弦，走 Am → F → G → E 的暗色进行。止损段的鼓点加倍（加切分 kick，hi-hat 改成十六分）。
- **回顾段**：pad 铺底，在“是谁在动手”和下一期预告处各有一声钟声。

## 音效（都和画面事件对齐）

v2 不再在 Python 里手抄一份事件表。`npm run zq:audio` 会先运行 `scripts/zhanqian-cues.ts`，把镜头表（`director.ts`）和盘口事件（`book.ts`）导出到 `src/zhanqian/cues.json`，配乐脚本直接读取这份文件。所以改完镜头或盘口，只需要重新跑一次 `zq:audio`。

| 场景 | 音效 |
|---|---|
| 切点 | 只有 7 个章节起点（带颜色闪切的切点）有短 whoosh + 低音 thud；普通硬切不加音效 |
| 开场 | K 线砸下：反向气流 + 低频冲击 + braam；穿入 K 线：whoosh；粒子：亮片；标题：钟声 |
| 盘口 | 每层挂单落位一声木质 tick（买单低、卖单高）；新挂单排队：低音 mallet；每笔成交一声 click；价格每跳一档，一个逐级升高的拨弦音 |
| 止损 | 触发价前的引信 swell；每颗地雷一声 thud，加 zing；连环结束时低频冲击 + braam |
| 参与者 | 每类人出场时一声低音 + 钟声（音高依次升高）；“需求碰撞”处低频冲击 |
| K 线剖开 | 路径压缩 whoosh；情形一连续 click；情形二连环 thud；“结果一样”低频冲击 |
| 回顾 | 三张结论牌各一声 thud + 拨弦（依次升高） |
| 结尾 | 订单池擦除成足迹图：没有切点 tick，换成一段 0.7 秒的长 whoosh；下一期预告一声钟声 |

## 混音

- 人声：高通 80 Hz，2.5–5 kHz 轻微提升。
- 有人声时，音乐自动压低约 10 dB，音效压低约 4 dB。
- 先压缩、限幅，再做两遍 loudnorm。成品：**−13.9 LUFS，真峰值 −6.2 dBTP**，输出 `public/zhanqian/mix.wav`（48 kHz 立体声）。
