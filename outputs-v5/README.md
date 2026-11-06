# 假突破 v5：本地渲染与验收

这是 1080×1920 竖屏、130.3 秒的科普短片：

- 代码：`studio/src/fakeout/`
- Remotion 合成：`FakeoutV5`，封面是 `FakeoutV5Cover`
- 本目录：分镜（`storyboard.md`）、口播稿（`script.md`）、调研笔记（`research-notes.md`）、字幕（`subtitles.srt`）

## 需要准备

- Node.js 18 或更高版本。
- **渲染时要联网**：中文字体（思源宋体、思源黑体）和 IBM Plex Mono 都在渲染时从 Google Fonts 按字形子集加载。
- 配音、配乐和音效的混音已经提交在 `studio/public/fakeout/mix.wav`，渲染时**不需要** Python。

## 渲染

```bash
git clone -b fakeout-v5 https://github.com/yantingke08-prog/claude.git
cd claude/studio
npm install
```

有独立显卡（推荐）：

```bash
npm run fo:render:gpu
```

成片输出到 `studio/out/fakeout/false-breakout-v5.mp4`。

想直接保存到 `D:\claude视频`（在 `studio` 目录下运行）：

```bash
npx remotion render FakeoutV5 "D:\claude视频\false-breakout-v5.mp4" --gl=angle --concurrency=50% --audio-codec=aac --audio-bitrate=320k
```

没有显卡，用 CPU 渲染（很慢，每帧大约 4–8 秒）：

```bash
npm run fo:render
```

CPU 渲染太慢的话，可以把 3D 层降到 0.75 倍像素（文字和字幕仍然是原生分辨率）：

```bash
npx remotion render FakeoutV5 out/fakeout/false-breakout-v5.mp4 --props="{\"dpr\":0.75}" --concurrency=1 --audio-codec=aac --audio-bitrate=320k
```

封面输出到 `outputs-v5/cover.png`：

```bash
npm run fo:cover:gpu
```

预览和调整：

```bash
npm run dev
```

打开后选 `Fakeout-v5 / FakeoutV5`。

## 验收说明

### 自动检查（可选，需要 Python 3 和完整版 FFmpeg）

```bash
npm run fo:qc
```

检查以下几项：

- 时长在 125–138 秒之间（本版 130.3 秒）；
- 分辨率 1080×1920，帧率 30fps；
- 编码为 H.264 + AAC；
- 音画长度一致；
- 响度为 −14 LUFS，真峰值 ≤ −1 dBTP；
- 没有削波、黑帧或长时间冻结的画面。

FFmpeg 优先从 PATH 里找；Windows 上可以用 `winget install Gyan.FFmpeg` 安装。

### 人工逐项核对

| 时间 | 应该看到 / 听到 |
|---|---|
| 0:00–0:01.5 | 黑场里一颗发光点，轻微呼吸；没有标题。 |
| 0:00.3–0:03.2 | K 线从发光点开始逐根长出，越来越快；镜头沿走势横移、轻微推近，带景深。每根 K 线一声木质 tick，音高跟着收盘价走；底下是低频 riser。 |
| 0:03.6 | 突破 K 刺穿 5000：白光闪、冲击波、粒子、镜头轻震；报价从“逼近”跳成红色“已突破”。 |
| 0:04.3–0:05.3 | 一次连续的快速拉远，看到整张 K 线图。 |
| 0:04.9–0:07.6 | A（红）/B（琥珀）/C（绿）三条光轨从同一根突破 K 线长出；旁白说到“三种完全不同的结局”时三条完整出现，各自带标签。 |
| 0:08.4–0:32.9 | A、B、C 依次单独全屏。每次只出现一种结局；突破前的 K 线保持不动，只有突破之后的 K 线收回、换成下一种。每屏：左上标题、右侧价格轴、最多 3 个标注（先出数字、再出结论），标注不压 K 线、关键位、价格轴和字幕。 |
| 0:29–0:33 | “突破只是敲门，被接受才算进门”，然后“结局 C 是怎么发生的？” |
| 0:33–1:35 | 机制与三个信号（结局 C 主图），内容同 v4。 |
| 1:34.7 | 回到三行对比页，三行压暗，中间大字“那我们应该如何应对？” |
| 1:37–1:52 | 五步进度条；“不追第一根”绿色竖带贯穿三行；讲 B 时说明放在压暗的 A 行，引线连到 B 的回踩；讲 C 时说明放在压暗的 B 行，引线连到 C 的反抽；讲风险时卡片横跨压暗的 C 行，风险数值从 0 递增到 10.50 点。 |
| 1:52.6–2:02 | 先问“同样的突破，为什么结局不同？”，再逐行给出结论：A ✓ 成交接力、B ✓ 守住关键位、C ✕ 没有接受。 |
| 2:02.2–2:06 | 三行的结局 K 线快速回卷到突破 K 线 → 三行向中间叠加、发光，配一次低频冲击 → 三条彩色光轨重新长出，然后折向 5000 收束 → 只剩发光的关键位。 |
| 2:06–2:10 | “它，被接受了吗？”；免责声明“教育内容，不构成投资建议”。右上角“示意图 · 模拟数据”全程都在。 |

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
- `fo:srt` 导出字幕到 `outputs-v5/subtitles.srt`。

注意：配音用的是 edge-tts（微软在线 TTS），它没有正式的商用授权。商用发布前，建议换成有授权的 TTS 或真人配音。

## 类型检查

```bash
cd studio && npm run typecheck
```
