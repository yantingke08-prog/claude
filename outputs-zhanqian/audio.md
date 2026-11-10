# 字幕、配音、音乐、音效配置

## 配音

- 脚本：`studio/scripts/zhanqian-vo.py`，读取 `studio/src/zhanqian/script.json`。
- 声音：edge-tts `zh-CN-YunjianNeural`（沉稳男声），语速 −4%，音高 −2Hz。
- 每句单独合成，按 `text|voice|rate|pitch` 缓存在 `public/zhanqian/vo/`。合成后裁掉首尾静音，再按 `gap` 停顿依次拼接。开头只留 0.5 秒，确保前 3 秒就有声音和画面。
- 产出：
  - `public/zhanqian/vo.wav`（48 kHz 单声道）；
  - `src/zhanqian/timeline.json`（每句的起止帧，以及字幕分段）。
- 节奏：停顿在 0.35–1.2 秒之间。在概念切换和关键画面之后（例如止损连环、四类人、两根 K 线对比）停得更久，留时间看画面。

## 字幕

- **烧录字幕**：
  - 由 `timeline.json` 的 `captions` 驱动，按 TTS 的逐词时间切分，每段最多 13 个字；
  - 56px 思源黑体，放在深色底板上，固定在 1480px 高度；
  - 关键概念词用金色。
- **不烧录字幕的句子**：h1、w6、w7 这三句的原文已经用大字逐字打在画面上，所以不再重复显示。
- **外挂字幕**：`subtitles.srt`，由 `npm run zq:srt` 导出，时间和烧录字幕一致。最后一条是免责声明。

## 音乐

全部由 `scripts/zhanqian-score.py` 用 numpy/scipy 合成，没有采样素材。

- **底层**：贯穿全片的 A 低音 drone。
- **订单簿和沙盘段**：84 BPM 的低速脉冲（kick + 轻 hi-hat），每两小节换一个和弦，走 Am → F → G → E 的暗色进行。
- **觉醒段**：pad 铺底，在“是谁在动手”和片尾预告处各有一声钟声。

## 音效（都和画面事件对齐）

| 场景 | 音效 |
|---|---|
| 开场 | K 线砸下：反向气流 + 低频冲击 + braam；穿入 K 线：whoosh + 亮片；标题：钟声 |
| 订单簿 | 每层挂单落位一声木质 tick（买单低、卖单高）；每块订单被吃掉一声 click；价格每跳一档，一个逐级升高的拨弦音 |
| 止损 | 引信 swell；每颗地雷一声 thud，加 zing；连环结束时低频冲击 |
| 沙盘 | 每个展台点亮时 whoosh + 低音 + 钟声（音高依次升高）；需求碰撞时低频冲击 |
| K 线剖开 | 路径压缩 whoosh；情形一连续 click；情形二连环 thud |

订单簿的事件时间在 `book.ts` 和 `zhanqian-score.py` 里各写了一份（两边用同一套按字数估算的 `Lc` 公式），改其中一边时要同步另一边。

## 混音

- 人声：高通 80 Hz，2.5–5 kHz 轻微提升。
- 有人声时，音乐自动压低约 10 dB，音效压低约 4 dB。
- 先压缩、限幅，再做两遍 loudnorm。成品：**−13.9 LUFS，真峰值 −5.8 dBTP**，输出 `public/zhanqian/mix.wav`（48 kHz 立体声）。
