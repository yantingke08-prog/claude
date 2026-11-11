# 战前觉醒 · 第 1 期（v4）：本地渲染说明

这是 1080×1920 竖屏（交付用原生 2K 1440×2560）、144.3 秒（2 分 24 秒）的中文知识科普短片。主题是市场拍卖、参与者角色、三种订单（被动 / 主动 / 止损），以及从“看 K 线结果”到“看订单原因”的转变。

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

## v4 改了什么（旁白、文案、知识点不变）

- **镜头**：从 70 个镜头（其中大量是自动“二次切入”造成的“小—大—小”跳变）减到 **32 个连续镜头**，平均约 4.5 秒。
  - 删除了按时长自动切开的逻辑（`SPLIT`、`cutIn`、`shot.part`），也删除了 2D 镜头第二段的网格推近。
  - 每个镜头只做一种主动作：推近、横移、升降或绕行；需要强调时，相机先到位再静止，由框选放大来完成。
  - 只在进入新章节、3D 与 2D 互切、切到全屏结论、换到真正不同的对象时硬切。
- **框选放大**：同一盘口或同一张图里的强调不再切特写。
  - 框外压暗约 13%，细发光框圈住目标，框内内容平滑放大到 1.10–1.12 倍（缓入 0.8 秒、停留、同速缓出）。
  - 说明卡用引线连到框上。
  - 用在 6 处：价差条、深度图缺口、成交带、买单四档（流动性）、卖一（吃单）、前高上方的止损堆。
- **闪切和音效**：颜色闪切只留在 7 个章节起点；停止跳档时的白闪降到原来的三分之一。普通切点不再有 tick，只有章节切点有 whoosh + thud。
- **不用等号、斜章表达逻辑**：
  - **A. 没人跨过去**：深度图里买单光点两次冲向价差，被缺口边缘弹回，成交笔数一直是 0；下一镜头真正跨过去，计数才变 1。
  - **B. 买入量与卖出量**：两张 4 手订单从两边滑到中间，合并锁定成一张“成交凭证”，买卖两列数字对齐。
  - **C. 流动性**：价格阶梯的买单四档被扫描线逐档点亮，标出“可立即成交”，市价卖单一碰到买一就成交。
  - **D. 空头止损买单**：先是一张灰色虚线“幽灵订单 · 触发前隐藏”；价格碰到触发价，它翻转成琥珀色“主动买单”，飞向卖盘。
  - **E. 几类人**：一个巨大的黑影轮廓（“一个庄家？”）裂成四块，飞到做市商、机构、套保者、短线交易者身上，各自接上订单流。
  - **F. 套保者**：小额盈亏卡片撞上盾牌后被红叉划掉，旁边的风险敞口条缩到约等于 0。
  - **G. 操纵**：左边一张很小的红色“违规证据”卡，红框只框住它；右边大半个画面是四路“日常需求流”，用比例表达“存在，但只解释得了少数行情”。
  - **H. 挂单可以撤 / 只提高概率**：价格上方的挂单直接从盘口撤走并变暗；旁边的概率仪表只填到 70%，其余标“不确定”。
  - 斜印章只剩一处状态章“常见误解”；所有语义文字保持水平。
- **保留**：v3 的安全区、防遮挡和自动检查（`npm run zq:layout`，v4 结果 2165 帧、0 个问题），以及结尾订单池到足迹图的擦除过渡。

## 需要准备

- Node.js 18 或更高版本（推荐 20 / 22）。
- **渲染时要联网**：中文字体（思源宋体 / 思源黑体）和 IBM Plex Mono 是渲染时从 Google Fonts 按字形子集加载的。
- 配音、音乐和音效的混音已经提交在 `studio/public/zhanqian/mix.wav`，渲染**不需要** Python。

## 安装

```bash
git clone -b zhanqian-juexing-v4 https://github.com/yantingke08-prog/claude.git
cd claude/studio
npm install
```

## 渲染（一条命令）

在 `claude/studio` 目录下运行：

```bash
npm run zq:render
```

- 输出：`D:\claude视频\zhanqian-awakening-ep01-v4.mp4`（文件夹不存在会自动创建）。
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
npx remotion render Zhanqian "D:/claude视频/zhanqian-awakening-ep01-v4.mp4" --props="{\"dpr\":0.75}" --audio-codec=aac --audio-bitrate=320k
```

## 2K 渲染（1440×2560，交付用）

```bash
npm run zq:render:2k
```

- 输出：`D:\claude视频\zhanqian-awakening-ep01-v4-2k.mp4`。
- 参数：`--scale=1.3333333333`，3D `dpr: 1.333`（来自 `studio/props/zhanqian-2k.json`），文字和图表按 2K 重新排版，不是放大 1080p；30 fps，H.264 High，yuv420p（BT.709），CRF 16，AAC 320 kbps。
- 完整命令（可以直接粘贴）：

```bash
npx remotion render Zhanqian "D:/claude视频/zhanqian-awakening-ep01-v4-2k.mp4" --props=props/zhanqian-2k.json --scale=1.3333333333 --gl=angle --concurrency=50% --image-format=jpeg --jpeg-quality=95 --codec=h264 --crf=16 --pixel-format=yuv420p --color-space=bt709 --audio-codec=aac --audio-bitrate=320k
```

预计 2K 渲染时长（4330 帧）：

| 机器 | 预计时长 |
|---|---|
| 独立显卡（RTX 3060 以上） | 约 50–90 分钟 |
| 只有核显 | 约 2.5–4.5 小时 |
| 纯 CPU | 约 9–18 小时 |

渲染完可以检查：`npm run zq:qc:2k`。`zq:render:4k` 还在 package.json 里，但 v4 没有验证 4K 全片，交付请用 2K。

## 封面与预览

```bash
npm run zq:cover
```

```bash
npm run zq:cover:2k
```

两条命令分别输出 `outputs-zhanqian/cover.png`（1080×1920）和 `outputs-zhanqian/cover-2k.png`（1440×2560）。

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
  1. 没有“小—大—小”的跳切：同一对象内部只看到框选放大，没有切出去再切回来；
  2. 框选放大的速度：0.8 秒缓入、停留、同速缓出，框外只是轻微压暗；
  3. 2:15–2:24 结尾：订单池连续推近，然后擦除成足迹图，中间不闪回。

## 版权与授权

- 3D 场景、音乐和音效都由代码程序生成，没有使用第三方素材。
- 配音用的是 edge-tts（微软在线 TTS），它没有正式的商用授权。商用发布前，建议换成有授权的 TTS 或真人配音：替换 `public/zhanqian/vo.wav` 后重跑 `npm run zq:audio`；如果时长变了，要先改 `timeline.json`，或者直接重跑 `zq:vo`。
