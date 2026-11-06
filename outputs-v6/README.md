# 假突破 v6：本地渲染与验收

这是 1080×1920 竖屏、148.8 秒的科普短片：

- 代码：`studio/src/fakeout/`
- Remotion 合成：`FakeoutV6`，封面是 `FakeoutV6Cover`
- 本目录：分镜（`storyboard.md`）、口播稿（`script.md`）、调研笔记（`research-notes.md`）、字幕（`subtitles.srt`）

## 需要准备

- Node.js 18 或更高版本。
- **渲染时要联网**：中文字体（思源宋体、思源黑体）和 IBM Plex Mono 都在渲染时从 Google Fonts 按字形子集加载。
- 配音、配乐和音效的混音已经提交在 `studio/public/fakeout/mix.wav`，渲染时**不需要** Python。

## 渲染

```bash
git clone -b fakeout-v6 https://github.com/yantingke08-prog/claude.git
cd claude/studio
npm install
```

有独立显卡（推荐）：

```bash
npm run fo:render:gpu
```

成片输出到 `studio/out/fakeout/false-breakout-v6.mp4`。

想直接保存到 `D:\claude视频`（在 `studio` 目录下运行）：

```bash
npx remotion render FakeoutV6 "D:\claude视频\false-breakout-v6.mp4" --gl=angle --concurrency=50% --audio-codec=aac --audio-bitrate=320k
```

没有显卡，用 CPU 渲染（很慢，每帧大约 4–8 秒）：

```bash
npm run fo:render
```

CPU 渲染太慢的话，可以把 3D 层降到 0.75 倍像素（文字和字幕仍然是原生分辨率）：

```bash
npx remotion render FakeoutV6 out/fakeout/false-breakout-v6.mp4 --props="{\"dpr\":0.75}" --concurrency=1 --audio-codec=aac --audio-bitrate=320k
```

封面输出到 `outputs-v6/cover.png`：

```bash
npm run fo:cover:gpu
```

预览和调整：

```bash
npm run dev
```

打开后选 `Fakeout-v6 / FakeoutV6`。

## 验收说明

### 自动检查（可选，需要 Python 3 和完整版 FFmpeg）

```bash
npm run fo:qc
```

检查以下几项：

- 时长在 140–160 秒之间（本版 148.8 秒）；
- 分辨率 1080×1920，帧率 30fps；
- 编码为 H.264 + AAC；
- 音画长度一致；
- 响度为 −14 LUFS，真峰值 ≤ −1 dBTP；
- 没有削波、黑帧或长时间冻结的画面。

FFmpeg 优先从 PATH 里找；Windows 上可以用 `winget install Gyan.FFmpeg` 安装。

### 人工逐项核对

| 时间 | 应该看到 / 听到 |
|---|---|
| 0:00–0:02 | 黑场里一颗发光点，轻微呼吸；没有标题。 |
| 0:00.3–0:03.9 | K 线从发光点开始逐根长出，越来越快；镜头沿走势横移、轻微推近，带景深。每根 K 线一声木质 tick，音高跟着收盘价走；底下是低频 riser。 |
| 0:04.3 | 突破 K 刺穿 5000：白光闪、冲击波、粒子、镜头轻震；报价从“逼近”跳成红色“已突破”。 |
| 0:05.3–0:06.5 | 快速拉远，同时这张图**一分为三**：上下排开三张完整的 K 线图（同一价格刻度），一条琥珀色虚线“同一根突破”竖着穿过三张图的突破 K。 |
| 0:06.4–0:08.8 | 三张图各自长出自己的 12 根结局 K 线（A 一路走高、B 回踩后再涨、C 冲高回落转跌）；旁白说到“三种完全不同的结局”时，三张图的标签“A 直接接受 / B 回踩确认 / C 失败突破”依次滑入。之后画面停约 2 秒，让人看清。 |
| 0:10.7 | B、C 两张图淡出，A 那张图移到中间、放大成 A 的单独全屏。 |
| 0:10.7–0:38 | A、B、C 依次单独全屏。每个标注都在旁白说到它的那一刻才出现（例如说到“成交继续放大”才出成交量标注）。 |
| 0:33.7 | “突破只是敲门 / **被接受**，才算进门”：画面压暗，大字逐字打出，“被接受”是金色发光字。 |
| 0:38.1 | 切到结局 C 主图后，才出现大字“**结局 C** 是怎么发生的？”（和旁白同时）。 |
| 0:38–1:47 | 机制与三个信号，内容同 v5；镜头推拉放慢；每个标注都等旁白说到才出现。 |
| 1:47.3 | 三行对比页压暗，中间是醒目的大字：小号“那我们”，大号“应该**如何应对**？”（金色发光），上方 HOW TO RESPOND，下方一条发光横线。 |
| 1:50–2:08 | 五步进度条随旁白推进；“不追第一根”竖带、B/C 的计划、风险卡（风险从 0 递增到 10.50 点）。 |
| 2:08.6 | 画面压暗，大字“同样的突破，/ 为什么**结局不同**？”。 |
| 2:12–2:18 | 三行都压暗一些；“区别在突破之后 →”、A ✓ 成交接力、B ✓ 守住关键位、C ✕ 没有接受依次弹出，每块都是深色实底 + 本行颜色的发光描边 + 文字黑色描边，和后面的 K 线明显分开。 |
| 2:20–2:24 | 结局回卷、三行叠加发光、三条彩色光轨折向 5000；关键位上方出现“下次看到突破，先问一句”。 |
| 2:23.6–2:28.8 | 关键位下方逐字打出“它，**被接受**了吗？”（128px，金色发光）；免责声明淡入。右上角“示意图 · 模拟数据”全程都在。 |

声音：开场、分叉、A/B/C 切换和结尾都有声音事件，但都压在旁白下面（音乐在人声下方自动压低约 10 dB，音效约 4 dB）。

## 重新生成音频（只在改口播稿时需要）

需要 Python 3，并安装：`pip install edge-tts numpy scipy`。

```bash
npm run fo:vo
```

```bash
npm run fo:audio
```

```bash
npm run fo:srt
```

- `fo:vo` 用 `src/fakeout/script.json` 生成配音和 `timeline.json`。已经生成过的句子缓存在 `public/fakeout/vo/`。
- `fo:audio` 重新合成配乐和音效，并混音成 `mix.wav`。事件时间读 `src/fakeout/events.json`，和画面共用。
- `fo:srt` 导出字幕到 `outputs-v6/subtitles.srt`。

注意：配音用的是 edge-tts（微软在线 TTS），它没有正式的商用授权。商用发布前，建议换成有授权的 TTS 或真人配音。

## 类型检查

```bash
cd studio && npm run typecheck
```
