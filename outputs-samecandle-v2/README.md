# 同一根大阳线，为什么结局完全不同？（v2）

v2 在 v1 的基础上重做画面。事实、文案、配音、红涨绿跌和 1080×1920 规格保持不变。配音片段完全复用 v1，只把换镜处的停顿拉长，保证每次换镜前旁白结束已满 18 帧。

| 项目 | 规格 |
|---|---|
| 时长 | 89.07 秒（2672 帧，30 fps） |
| 画幅 | 1080 × 1920；另有原生 2K 版 1440 × 2560 |
| 编码 | H.264 yuv420p（bt709），AAC 320k 立体声 |
| 配音 | edge-tts `zh-CN-YunxiNeural`，与 v1 是同一批音频 |
| 字幕 | 硬字幕烧进画面，另附 SRT |
| 音频 | 原创合成配乐和音效，按新的时间点重新混音，−14.6 LUFS，真峰值 −1.3 dBTP |

## v2 改了什么

- **A/B/C 三行严格对齐。** 三图同时出现时（开场、复盘、结尾）都用同一套三行版式：左列标签 → 中间走势图 → 右列结局与涨跌幅。三行标签的字体、字号和基线一致。走势图的宽、高、K 线窗口和价格刻度（80–133）也完全一致。A/B/C 之间只靠颜色、细边框和小徽章区分。
- **开场。** 先是一个微距镜头，然后拉远到三行。三条真实走势在同一画面里依次长出后续 K 线。每讲到一种结局，画面就加上走势箭头、关键转折点、结局涨跌幅和一条标注。
- **镜头锁定。** 拉远之后，镜头在全片其余时间保持正面锁定。换内容靠面板换版式（三行 → 单图主图加缩略图 → 量能三列 → 承接放大 → 复盘三行），不靠推拉摇移。
- **每章一种视觉语言。**
  - 位置：横盘框、突破点、压力带。
  - 量能：成交量柱单独放大，三列横向对齐，用同一刻度和前 20 根均量线。
  - 承接：实体一半线、回踩、跌破、开盘价。
  - 讲哪一条，哪一条就占主图，另外两条缩成缩略图。
- **画面稳定。**
  - 删除了这些效果：手持呼吸、随机抖动、光柱闪烁、动态噪点、色差（Chromatic Aberration）。
  - 光柱改为静止。
  - 全片只在「陷阱」处保留一次 5 帧的短促冲击。
- **标注规则由脚本检查**，结果见 `timing-report.md`：
  - 标注在关键词出现时，或提前 0–8 帧出现；
  - 普通标注完全展开后至少停留 24 帧，卡片至少 36 帧；
  - 每次换镜前，旁白结束至少已满 18 帧；
  - 同一时间最多 1 张主说明卡；
  - 旁白进行中，最长 2.5 秒必有新信息。
- **手机观感。** 标注字号不低于 34 px，关键数字 50–72 px，字幕 58 px。复盘改成三行大信息卡，顶部章节标题和安全区保留。

## 本地渲染（Windows，需要 Node 18+ 和网络）

```bash
git clone -b same-candle-v2 https://github.com/yantingke08-prog/claude.git
```

```bash
cd claude/studio
```

```bash
npm ci
```

1080 × 1920 成片：

```bash
npm run sc2:make
```

2K（1440 × 2560，3D 原生 2K 渲染，文字按矢量放大）：

```bash
npm run sc2:make:2k
```

两条命令都会依次完成以下步骤：

1. 创建 `D:\claude视频` 并复制 SRT；
2. 用 GPU 渲染成片（`--gl=angle`）；
3. 生成封面；
4. 运行校验：时长 60–90 秒、分辨率、H.264 yuv420p、30 fps、AAC 立体声、完整解码一遍、封面尺寸。

全部通过时，最后一行输出 `All checks passed.`。

没有可用 GPU 时，改用 `npm run sc2:make:cpu`（仅 1080p，速度很慢）。

### 输出文件

| 文件 | 路径 |
|---|---|
| 成片 | `D:\claude视频\same-candle-v2.mp4` |
| 封面 | `D:\claude视频\same-candle-v2-cover.png` |
| 2K 成片 | `D:\claude视频\same-candle-v2-2k.mp4` |
| 2K 封面 | `D:\claude视频\same-candle-v2-2k-cover.png` |
| 字幕 | `D:\claude视频\same-candle-v2.srt` |

### 其他命令

| 命令 | 作用 |
|---|---|
| `npm run sc2:timing` | 重新生成并检查 `timing-report.md`，有任何规则不通过时退出码为 1 |
| `npm run sc2:stills` | 把关键帧渲染到 `studio/out/sc2/`（CPU，不需要 GPU） |
| `npm run sc2:vo` → `npm run sc2:audio` → `npm run sc2:srt` | 只有改了文案或停顿时才需要按这个顺序重跑。需要 Python 3、`pip install edge-tts numpy scipy` 和 FFmpeg |

渲染时会从 Google Fonts 拉取字体子集，因此需要联网。edge-tts 不是正式的商用 TTS 授权，商用发布前建议用有授权的配音重新录制。

## 关键帧（`keyframes/`）

| 文件 | 内容 |
|---|---|
| `01-hook-ABC.jpg` | 开场：微距 → 三行对齐 → A、B、C 依次长出后续 K 线并加上标注（帧 0 / 40 / 90 / 135 / 190） |
| `02-why.jpg` | 为什么：结果卡、后续走势打问号、三件事 |
| `03-chapters-compositions.jpg` | 三个章节的不同构图：位置（单图主图）/ 量能（三列对齐）/ 承接（放大 + 一半线） |
| `04-position-raw-box-hold.jpg` | 位置：原图 → 框出横盘 → 突破点标注停留 |
| `05-volume-raw-box-hold.jpg` | 量能：原图 → 框选 A 并加量比括号 → ×2.6 与卡片停留 |
| `06-hold-raw-box-hold.jpg` | 承接：原图 → 实体一半括号与一半线 → 回踩不破与结论停留 |
| `07-position-B-C.jpg` | 位置 B（高位加速、最后一批买家）/ C（支撑变压力、空头回补） |
| `08-volume-C-hold-B-C.jpg` | 量能 C、承接 B（涨幅被抹掉 56%）、承接 C（跌回开盘价，陷阱） |
| `09-recap-three-rows.jpg` | 复盘三行对齐（逐行点亮）→ 三行全亮 → 结尾 |
| `frames/` | 以上所有关键帧的 1080 × 1920 原图 |

## 文件结构

| 路径 | 内容 |
|---|---|
| `studio/src/samecandle2/director.ts` | 版式和面板（像素坐标）、换镜时间、开场镜头 |
| `studio/src/samecandle2/beats.ts` | 全片所有标注的时间线（HUD 和 timing 报告共用这一份） |
| `studio/src/samecandle2/Scene.tsx` | 3D：实例化圆角 K 线、玻璃底板、静止光柱 |
| `studio/src/samecandle2/Hud.tsx` | 标签、标注、章节标题、字幕 |
| `studio/src/samecandle2/Film.tsx` | 合成（1080p 和 2K）与封面 |
| `studio/scripts/samecandle2-*.{py,ts}` | 配音、混音、SRT、timing 报告 |
| `outputs-samecandle-v2/` | 本说明、timing 报告、关键帧、研究笔记、字幕 |
