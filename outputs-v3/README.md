# 假突破 v3：本地渲染与验收

这是 1080×1920 竖屏、88.2 秒的科普短片：

- 代码：`studio/src/fakeout/`
- Remotion 合成：`FakeoutV3`，封面是 `FakeoutV3Cover`
- 本目录：分镜（`storyboard.md`）、口播稿（`script.md`）、调研笔记（`research-notes.md`）、字幕（`subtitles.srt`）

## 需要准备

- Node.js 18 或更高版本。
- **渲染时要联网**：中文字体（思源宋体、思源黑体）和 IBM Plex Mono 都在渲染时从 Google Fonts 按字形子集加载。
- 配音、配乐和音效的混音已经提交在 `studio/public/fakeout/mix.wav`，渲染时**不需要** Python。

## 渲染

```bash
cd studio
npm install
```

有独立显卡（推荐）：

```bash
npm run fo:render:gpu
```

没有显卡，用 CPU 渲染（很慢，每帧大约 4–6 秒）：

```bash
npm run fo:render
```

成片输出到 `studio/out/fakeout/false-breakout-v3.mp4`。

CPU 渲染太慢的话，可以把 3D 层降到 0.75 倍像素（文字和字幕仍然是原生分辨率）：

```bash
npx remotion render FakeoutV3 out/fakeout/false-breakout-v3.mp4 --props="{\"dpr\":0.75}" --concurrency=1 --audio-codec=aac --audio-bitrate=320k
```

封面输出到 `outputs-v3/cover.png`：

```bash
npm run fo:cover:gpu
```

预览和调整：

```bash
npm run dev
```

打开后选 `Fakeout-v3 / FakeoutV3`。

## 验收脚本（可选，需要 Python 3 和完整版 FFmpeg）

```bash
npm run fo:qc
```

它检查以下几项：

- 时长在 60–90 秒之间；
- 分辨率 1080×1920，帧率 30fps；
- 编码为 H.264 + AAC；
- 音画长度一致；
- 响度为 −14 LUFS，真峰值 ≤ −1 dBTP；
- 没有削波、黑帧或长时间冻结的画面。

FFmpeg 优先从 PATH 里找；Windows 上可以用 `winget install Gyan.FFmpeg` 安装。

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
- `fo:audio` 重新合成配乐和音效，并混音成 `mix.wav`。
- `fo:srt` 导出字幕到 `outputs-v3/subtitles.srt`。

注意：配音用的是 edge-tts（微软在线 TTS），它没有正式的商用授权。商用发布前，建议换成有授权的 TTS 或真人配音。
