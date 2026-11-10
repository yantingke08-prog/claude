# 战前觉醒 · 第 1 期（v2 导演重剪）：本地渲染说明

这是 1080×1920 竖屏、144.3 秒（2 分 24 秒）的中文知识科普短片。主题是市场拍卖、参与者角色、三种订单（被动 / 主动 / 止损），以及从“看 K 线结果”到“看订单原因”的转变。

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

## 需要准备

- Node.js 18 或更高版本（推荐 20 / 22）。
- **渲染时要联网**：中文字体（思源宋体 / 思源黑体）和 IBM Plex Mono 是渲染时从 Google Fonts 按字形子集加载的。
- 配音、音乐和音效的混音已经提交在 `studio/public/zhanqian/mix.wav`，渲染**不需要** Python。

## 安装

```bash
git clone -b zhanqian-juexing https://github.com/yantingke08-prog/claude.git
cd claude/studio
npm install
```

## 渲染（一条命令）

在 `claude/studio` 目录下运行：

```bash
npm run zq:render
```

- 输出：`D:\claude视频\zhanqian-awakening-ep01-v2.mp4`（文件夹不存在会自动创建）。
- 编码：H.264 + AAC 320 kbps，30 fps。
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
npx remotion render Zhanqian "D:/claude视频/zhanqian-awakening-ep01-v2.mp4" --props="{\"dpr\":0.75}" --audio-codec=aac --audio-bitrate=320k
```

重新导出封面（输出到 `outputs-zhanqian/cover.png`）：

```bash
npm run zq:cover
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
| 数据面板、标注、大字和字幕 | `studio/src/zhanqian/Hud.tsx` | 不用跑别的 |

`zq:audio` 会先用 `npx tsx` 把镜头表和盘口事件导出到 `src/zhanqian/cues.json`，再合成配乐和音效。重新生成音频需要 Python 3、`pip install edge-tts numpy scipy`，以及带 loudnorm 的完整版 FFmpeg。如果系统里没有，可以运行 `pip install imageio-ffmpeg`，然后把环境变量 `FFMPEG` 设为它的路径。

## 验收

- **自动检查**（可选，需要 Python 和完整版 FFmpeg）：

  ```bash
  npm run zq:qc
  ```

  检查时长（140–150 秒）、分辨率、编码、音画长度、响度（−14 LUFS）、削波、黑帧和冻结。
- **人工检查**：按 `storyboard.md` 的时间表逐段核对。重点看三处：
  1. 0:00–0:09 开场五个快切镜头（巨影 → 灯芯 → 穿入 → 粒子 → 标题）；
  2. 1:12–1:22 止损蒙太奇（触发价 → 连环引爆 → 盘口扫空 → 价格连跳）；
  3. 1:55–2:08 左右分屏 X 光剖开和两条路径同步生长。

## 版权与授权

- 3D 场景、音乐和音效都由代码程序生成，没有使用第三方素材。
- 配音用的是 edge-tts（微软在线 TTS），它没有正式的商用授权。商用发布前，建议换成有授权的 TTS 或真人配音：替换 `public/zhanqian/vo.wav` 后重跑 `npm run zq:audio`；如果时长变了，要先改 `timeline.json`，或者直接重跑 `zq:vo`。
