# 同一根大阳线，为什么结局完全不同？（v1）

全新项目，从零制作：研究、主题、脚本、分镜、视觉系统、三维动画、剪辑、配音、字幕、配乐和音效都是新做的。之前的版本没有沿用任何内容。

| 项目 | 规格 |
|---|---|
| 时长 | 86.2 秒（2587 帧，30 fps） |
| 画幅 | 竖屏 1080 × 1920，H.264 yuv420p（bt709），AAC 320k 立体声 |
| 配音 | edge-tts `zh-CN-YunxiNeural`（全片配音） |
| 字幕 | 硬字幕烧进画面，另有 SRT 外挂字幕 |
| 音频 | 原创合成配乐和音效，人声出现时自动压低背景音，响度约 −14 LUFS，真峰值 ≤ −1.3 dBTP |
| K 线配色 | 红涨绿跌 |

## 本地渲染（Windows，需要 Node 18+ 和网络）

```bash
git clone -b same-candle-v1 https://github.com/yantingke08-prog/claude.git
```

```bash
cd claude/studio
```

```bash
npm ci
```

```bash
npm run sc:make
```

`sc:make` 会依次完成下面几步：

1. 创建 `D:\claude视频`，并复制 SRT 字幕；
2. 用 GPU 渲染成片（`--gl=angle`）；
3. 生成封面；
4. 运行 `sc:verify`：检查时长是否在 60–90 秒之间，是否为 1080×1920、H.264、yuv420p、30 fps、AAC 立体声，再完整解码一遍，确认文件可以正常播放，最后检查封面尺寸。

全部检查通过时，最后一行会输出 `All checks passed.`。

没有独立显卡时，改用 CPU 软件渲染（速度很慢）：

```bash
npm run sc:make:cpu
```

### 输出文件

| 文件 | 路径 |
|---|---|
| 成片 | `D:\claude视频\same-candle-v1.mp4` |
| 封面 | `D:\claude视频\same-candle-v1-cover.png` |
| 字幕 | `D:\claude视频\same-candle-v1.srt` |

### 注意

- 渲染时会从 Google Fonts 拉取 Noto Sans SC 和 Space Grotesk 的字形子集，因此需要联网。
- 配音、混音和时间轴都已提交到仓库（`studio/public/samecandle/`、`studio/src/samecandle/timeline.json`），渲染不需要 Python。
- 只有在修改了文案或音乐时，才需要按顺序重新生成：`npm run sc:vo`，再 `npm run sc:audio`，再 `npm run sc:srt`。这一步需要 Python 3、`pip install edge-tts numpy scipy` 和 FFmpeg。
- edge-tts 不是正式的商用 TTS 授权。商用发布前，建议改用 Azure Speech 或有授权的真人配音重新录制。

## 文件结构

| 路径 | 内容 |
|---|---|
| `studio/src/samecandle/` | 成片代码 |
| `script.json` | 文案 |
| `timeline.json` | 由配音生成的逐字时间轴 |
| `events.json` | 画面和音效共用的时间点 |
| `data.ts` | 三条示意行情 |
| `director.ts` | 镜头和画面状态 |
| `Scene.tsx` | 三维场景 |
| `Hud.tsx` | 字幕和标注 |
| `Film.tsx` | 合成和封面 |
| `studio/scripts/samecandle-*.py\|mjs` | 配音、配乐混音、SRT 和成片校验脚本 |
| `outputs-samecandle-v1/` | 研究笔记、脚本、分镜和预览图 |
