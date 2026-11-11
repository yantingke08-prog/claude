# 字幕、配音、音乐、音效配置（v6）

## 配音

- 脚本：`studio/scripts/zhanqian-vo.py`，读取 `studio/src/zhanqian/script.json`。
- 声音：edge-tts `zh-CN-YunjianNeural`（沉稳男声），语速 −5%，音高 −2Hz。v2 语速和 v1 基本相同（只慢 1%），节奏靠缩短停顿和合并重复的句子，人声不会显得赶。
- 每句单独合成，按 `text|voice|rate|pitch` 缓存在 `public/zhanqian/vo/`。合成后裁掉首尾静音，再按 `gap` 停顿依次拼接。开头留 1.0 秒（v6，让开场升镜先停稳）。v6 起，一句话可以带 `pause`：在某个词之前的静音处切开缓存的音频，插入停顿，不重新合成、不改字词。
- 产出：
  - `public/zhanqian/vo.wav`（48 kHz 单声道）；
  - `src/zhanqian/timeline.json`（每句的起止帧，以及字幕分段）。
- 停顿（v6）：切点所在的句间 1.0–1.5 秒（切点在句末后 18 帧，镜头先停稳、标注再按关键词出现）；同一镜头内的句间仍是 0.45 秒左右；a3、o5、p6、r1 句中各插入 1.0–1.4 秒停顿；w5 之后留 4.6 秒给三行结论。

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

v6 规则：whoosh / thud 只用在 7 个章节起点和两个大转折（穿入 K 线、止损连环引爆）。数据标注出现时只有一声轻 tick（时间来自 `npm run zq:layout` 写出的 `src/zhanqian/labels.json`）。说明卡、普通切点和每位参与者出场都不配响声。

| 场景 | 音效 |
|---|---|
| 切点 | 只有 7 个章节起点（带颜色闪切的切点）有短 whoosh + 低音 thud；普通硬切无声 |
| 数据标注 | 每个数据标注（计数、阶梯、成交带、路径图、仪表等）出现时一声很轻的高频 tick |
| 开场 | K 线砸下：反向气流 + 低频冲击 + braam；穿入 K 线：whoosh；粒子：亮片；标题：钟声 |
| 盘口 | 每层挂单落位一声木质 tick（买单低、卖单高）；新挂单排队：低音 mallet；每笔成交一声 click；价格每跳一档，一个逐级升高的拨弦音 |
| 止损 | 触发价前的引信 swell；每颗地雷一声 thud，加 zing；连环结束时低频冲击 + braam（大转折） |
| 参与者 | 无出场音效，只有数据标注的 tick |
| K 线剖开 | 情形一连续轻 click；情形二连续低 tick |
| 回顾 | 三行结论各一声轻 tick + 拨弦（依次升高）；“是谁”处一声钟声 |
| 结尾 | 订单池擦除成足迹图：没有切点 tick，换成一段 0.7 秒的长 whoosh；下一期预告一声钟声 |

## 混音

- 人声：高通 80 Hz，2.5–5 kHz 轻微提升。
- 有人声时，音乐自动压低约 10 dB，音效压低约 4 dB。
- 先压缩、限幅，再做两遍 loudnorm。成品：**−13.9 LUFS，真峰值 −4.9 dBTP**，输出 `public/zhanqian/mix.wav`（48 kHz 立体声）。
