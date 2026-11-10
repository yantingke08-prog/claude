# 战前觉醒 · 第 1 期（v3）：本地渲染说明

这是 1080×1920 竖屏（另有原生 4K 2160×3840 输出）、144.3 秒（2 分 24 秒）的中文知识科普短片。主题是市场拍卖、参与者角色、三种订单（被动 / 主动 / 止损），以及从“看 K 线结果”到“看订单原因”的转变。

- 技术方案：Remotion 4 + React Three Fiber（WebGL 实时 3D）+ 后期（泛光、景深、颗粒、暗角）。每一帧都是帧号的纯函数，所以每次渲染结果完全一致。
- 代码：`studio/src/zhanqian/`
- Remotion 合成：`Zhanqian`（成片），封面是 `ZhanqianCover`
- 本目录文件：
  - `script.md`：逐字稿，带时间码；
  - `storyboard.md`：基础分镜和本期取舍；
  - `audio.md`：字幕、配音、音乐、音效的配置方案；
  - `subtitles.srt`：外挂字幕；
  - `cover.png`：竖屏封面；
  - `keyframes/`：关键帧预览图（`contact-*.jpg` 是拼图），以及 `keyframes/README.md` 的逐张说明。
- 仓库里**不包含**成片 MP4。

## v3 改了什么（内容不变）

- **标注安全区**：所有非字幕文字都在左右 40px、上 120px、下 180px 的安全区内。画面分区固定：
  - 顶部页眉 124px；
  - 进度条 / 参与者轨道 / 买卖价差在 190px；
  - 主画面 300–1440px；
  - 字幕带 1460–1590px 只放字幕；
  - 字幕下方 1606px 起是成交量条。

  引线牌和印章会自动换边或收回到安全区内，不会被裁出画面。任意两个文字标注至少间隔 20px，同一时刻最多两张说明卡。
- **自动检查**：`npm run zq:layout` 每 2 帧量一次所有文字的屏幕位置，检查安全区、字幕带、间距和说明卡数量。v3 的结果是 2165 帧、0 个问题。
- **点名修复**：
  - 1:11.67：止损堆引线牌完整移入画面，整张 K 线图压进安全区；
  - 1:47.47：参与者对比表移到底部独立面板，桌面中央不被遮挡；
  - 1:55.27：“过程，全被压缩了”移到顶部，K 线整体放在其下方，计数器移到右侧栏；
  - 2:08.50：对比表移到 K 线下方的独立区，K 线拉远放在中部。
- **其他修复**：
  - OHLC 四个引线牌合并成右侧栏一张卡；
  - 分屏 X 光的结论写进路径图面板内；
  - 全屏 2D 镜头的二次切入只推近背景网格，数据不再被放大出画面。
- **结尾连续**：订单池只进入一次，在“挂单可以撤 / 订单流只提高概率”期间保持一个连续推近，不再切镜头。进入预告时，镜头继续推近，一道蓝色擦除线自上而下把订单池换成足迹图。订单池在暗板下保留，所以没有黑场或空白。足迹图出现后保持到片尾。
- **4K**：原生 2160×3840。HTML 层按 2 倍重新排版（`--scale=2`），3D 按 2 倍像素绘制（`dpr: 2`），不是放大 1080p。

## 需要准备

- Node.js 18 或更高版本（推荐 20 / 22）。
- **渲染时要联网**：中文字体（思源宋体 / 思源黑体）和 IBM Plex Mono 是渲染时从 Google Fonts 按字形子集加载的。
- 配音、音乐和音效的混音已经提交在 `studio/public/zhanqian/mix.wav`，渲染**不需要** Python。

## 安装

```bash
git clone -b zhanqian-juexing-v3 https://github.com/yantingke08-prog/claude.git
cd claude/studio
npm install
```

## 渲染（一条命令）

在 `claude/studio` 目录下运行：

```bash
npm run zq:render
```

- 输出：`D:\claude视频\zhanqian-awakening-ep01-v3.mp4`（文件夹不存在会自动创建）。
- 编码：H.264 High，yuv420p（BT.709），CRF 16，AAC 320 kbps，30 fps。
- 这条命令用 ANGLE 调用显卡渲染（`--gl=angle --concurrency=50%`）。

预计渲染时长（共 4330 帧）：

| 机器 | 预计时长 |
|---|---|
| 有独立显卡（如 RTX 3060 以上） | 约 30–55 分钟 |
| 只有核显 | 约 1.5–2.5 小时 |
| 纯 CPU | 约 5–10 小时（每帧 4–8 秒；纯 2D 镜头更快） |

没有显卡、或 ANGLE 报错时，改用：

```bash
npm run zq:render:cpu
```

CPU 渲染太慢的话，可以把 3D 层降到 0.75 倍像素（文字和字幕仍然是原生分辨率）：

```bash
npx remotion render Zhanqian "D:/claude视频/zhanqian-awakening-ep01-v3.mp4" --props="{\"dpr\":0.75}" --audio-codec=aac --audio-bitrate=320k
```

## 4K 渲染（2160×3840）

```bash
npm run zq:render:4k
```

- 输出：`D:\claude视频\zhanqian-awakening-ep01-v3-4k.mp4`。
- 参数：`--scale=2`，3D `dpr: 2`（来自 `studio/props/zhanqian-4k.json`），30 fps，H.264 High（level 5.1），yuv420p（BT.709，TV 范围），CRF 16，AAC 320 kbps。
- 并发是 `25%`，因为 4K 每帧的显存和内存是 1080p 的 4 倍。显存 12GB 以上可以改成 `--concurrency=50%`。
- 想要更高画质，把命令里的 `--crf=16` 改成 `--crf=14`（文件大约大 30%）。
- 完整命令（可以直接粘贴）：

```bash
npx remotion render Zhanqian "D:/claude视频/zhanqian-awakening-ep01-v3-4k.mp4" --props=props/zhanqian-4k.json --scale=2 --gl=angle --concurrency=25% --image-format=jpeg --jpeg-quality=95 --codec=h264 --crf=16 --pixel-format=yuv420p --color-space=bt709 --audio-codec=aac --audio-bitrate=320k
```

预计 4K 渲染时长（4330 帧）：

| 机器 | 预计时长 |
|---|---|
| 独立显卡（RTX 3060 以上） | 约 1.5–3 小时 |
| 只有核显 | 约 5–9 小时 |
| 纯 CPU | 不建议（约 20–40 小时） |

渲染完可以检查：`npm run zq:qc:4k`。

## 封面与预览

```bash
npm run zq:cover
```

```bash
npm run zq:cover:4k
```

两条命令分别输出 `outputs-zhanqian/cover.png`（1080×1920）和 `outputs-zhanqian/cover-4k.png`（2160×3840）。

快速低分辨率预览（540×960，用来看节奏）：

```bash
npm run zq:render:draft
```

预览和逐帧调整：

```bash
npm run dev
```

打开后选 `Zhanqian / Zhanqian`。

## 修改内容

| 想改什么 | 改哪里 | 之后运行 |
|---|---|---|
| 口播文字、停顿、语速 | `studio/src/zhanqian/script.json` | `npm run zq:vo`、`npm run zq:audio`、`npm run zq:srt` |
| 镜头表（切点、构图、闪切颜色） | `studio/src/zhanqian/director.ts` 里的 `SH` | `npm run zq:audio`（切点音效跟着镜头表走） |
| 屏幕上的文字 | `studio/src/zhanqian/copy.ts` | 不用跑别的 |
| 订单簿的节奏（哪一档什么时候被吃、止损何时触发） | `studio/src/zhanqian/book.ts`（盘口阶梯、成交带、成交量、Delta 都从这一张表算出来） | `npm run zq:audio` |
| 3D 场景和材质 | `studio/src/zhanqian/Scene.tsx` | 不用跑别的 |
| 数据面板、标注、大字和字幕 | `studio/src/zhanqian/Hud.tsx`（画面分区常量 `SAFE / STRIP / MAIN / LOW / BOT` 在文件开头） | `npm run zq:layout`（检查安全区、字幕带、间距） |

`zq:audio` 会先用 `npx tsx` 把镜头表和盘口事件导出到 `src/zhanqian/cues.json`，再合成配乐和音效。重新生成音频需要 Python 3、`pip install edge-tts numpy scipy`，以及带 loudnorm 的完整版 FFmpeg。如果系统里没有，可以运行 `pip install imageio-ffmpeg`，然后把环境变量 `FFMPEG` 设为它的路径。

## 验收

- **自动检查**（可选，需要 Python 和完整版 FFmpeg）：

  ```bash
  npm run zq:qc
  ```

  检查时长（140–150 秒）、分辨率、编码、音画长度、响度（−14 LUFS）、削波、黑帧和冻结。
- **人工检查**：按 `storyboard.md` 的时间表逐段核对。重点看三处：
  1. 1:11、1:47、1:55、2:08 四处标注位置；
  2. 2:15–2:24 结尾：订单池连续推近，然后擦除成足迹图，中间不闪回；
  3. 4K 成片放大到 100% 看文字边缘：应该是锐利的矢量字，不是放大的 1080p。

## 版权与授权

- 3D 场景、音乐和音效都由代码程序生成，没有使用第三方素材。
- 配音用的是 edge-tts（微软在线 TTS），它没有正式的商用授权。商用发布前，建议换成有授权的 TTS 或真人配音：替换 `public/zhanqian/vo.wav` 后重跑 `npm run zq:audio`；如果时长变了，要先改 `timeline.json`，或者直接重跑 `zq:vo`。
