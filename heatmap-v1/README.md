# 热图怎么看？挂单墙背后的真相 — Remotion 工程

竖屏 1080×1920 · 30 fps · 70 s · 3D（Three.js / R3F + `@remotion/three`）· 无配音、无音乐 · Composition **`HeatmapWalls`**
分镜见 [SHOTBOOK.md](SHOTBOOK.md)。所有数据都是程序生成的教学示意，非实盘数据。

## 安装

需要 Node 18+（已在 22.23 上测试）。

```powershell
cd heatmap-v1
npm install
```

字体已经子集化，提交在 `public/fonts`（Noto Sans SC / Noto Serif SC，SIL OFL）。渲染时不需要联网。如果改了屏幕文字，需要重新生成字体子集（要求 `pip install fonttools brotli`，并且系统里有 Windows 自带的 Noto SC）：

```powershell
npm run fonts
```

## 自检

```powershell
npx tsc --noEmit     # 类型检查
npm run check        # 时间线审计：每帧标注 ≤2，字幕不重叠，标注投影在安全区内，字体子集比文字新
npx remotion studio src/index.ts   # 或 npm run studio，预览
npm run stills       # 抽 20 帧静帧到 out/stills（默认 swangle，无 GPU 也能跑）
```

在 Studio 里，把 props 设为 `lite: true` 可以关掉辉光和暗角后期，拖动预览会更流畅。成片请保持默认的 `lite: false`。

## 渲染

```powershell
# 有 GPU 的机器（推荐）
powershell -ExecutionPolicy Bypass -File scripts/render.ps1

# 没有 GPU（软件 WebGL，约 2–3 s/帧，2100 帧大约 1.5 小时）
powershell -ExecutionPolicy Bypass -File scripts/render.ps1 -Gl swangle

# 指定输出目录
powershell -ExecutionPolicy Bypass -File scripts/render.ps1 -OutDir D:\claude视频
```

等价的一行命令：

```powershell
npx remotion render src/index.ts HeatmapWalls out/HeatmapWalls.mp4 --gl=angle --codec=h264 --crf=16 --pixel-format=yuv420p
```

**预期输出路径**：`heatmap-v1/out/HeatmapWalls-v1-<yyyyMMdd-HHmmss>.mp4`（H.264，1080×1920，30 fps，70.0 s，无音轨）。每次渲染都会生成新文件名，不会覆盖旧文件。传 `-OutDir` 时，文件会写到那个目录。

## 结构

| 文件 | 作用 |
|---|---|
| `src/config.ts` | 尺寸、网格（90 列时间 × 56 行价格）、配色、热度色带、噪声 |
| `src/markets.ts` | 4 份示意订单簿：开场/回放的买单墙、讲解用的平稳盘、墙/空洞/撤单、闪烁墙 |
| `src/timeline.ts` | 全片的数据：每帧的世界状态、镜头关键帧、字幕、标注、卡片 |
| `src/geom.ts` | 格子的 3D 位置，以及 3D 到屏幕的投影（HTML 标注贴到物体上） |
| `src/World.tsx` | 3D 场景：5040 个实例化格子、成交价带、底板、灯光、辉光和暗角 |
| `src/Overlay.tsx` | 文字层：字幕、标注、坐标轴、色条、片名、≠ 页、总结、片尾 |
| `scripts/check.mts` | 时间线审计（不渲染） |
| `scripts/stills.mjs` | 抽帧静帧 |
| `scripts/render.ps1` | 渲染成片 |
| `scripts/fonts.py` | 字体子集 |

## 改动提示
- 想调某个镜头，就改 `timeline.ts` 里的 `VIEWS` / `CAM_KEYS`。相邻两帧放两个不同的关键帧就是硬切，硬切前后都要压暗。
- 想调墙、空洞的位置，就改 `markets.ts`。标注的锚点引用了这里的常量，会跟着一起变。
- 想加配音：现在每段的时长按字幕阅读速度估算。配音录好以后，按配音的时间点平移 `timeline.ts` 里的帧号，然后在 `Film.tsx` 里加 `<Audio>`。
