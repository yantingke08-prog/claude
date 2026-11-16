# 订单流短视频 v1：三根阳线，你会追吗？

竖屏 1080×1920、30 fps、75.4 秒（2261 帧）的交易教学短片。
用 React + TypeScript + Remotion 实现，全部为矢量绘制，没有真人和素材视频。
行情是固定的 mock 数据，不接任何 API。
深色终端风格，绿涨红跌；中文主字幕，英文辅助字幕。

## 结构

整片只有一张 K 线图，从第 0 帧保留到结尾。镜头是一个会移动的图表窗口，各章只在同一张图上叠加内容。

| 时间 | 章节 | 画面 |
|---|---|---|
| 0–2 s | 开场 | 第 0 帧就有约 30 根历史 K 线、网格和价格轴；右侧三根大阳线逐根出现（先拉上下影线，再长实体，约 0.55 s 一根） |
| 1.7 s | 提问 | 「BUY OR SELL?」「三根阳线，你会追吗？」 |
| 3.7 s | 倒计时 | 「给你5秒决定 / you have 5 seconds」，然后 5–4–3–2–1 倒计时，镜头缓慢推近 |
| 10 s | 不给答案 | 只有旁白：「只看K线，不够。接下来，看订单流。」 |
| 13.7 s | 核心观点 | 价格在涨 ≠ 买方还在控盘 |
| 19.5 s | 01 Delta | 叠加 Delta 面板，第一根阳线的 Delta 同步放大 |
| 25.5 s | 02 吸收 | 回踩 K 线出现，Delta 为负但价格守住；Footprint 在吸收区堆量 |
| 33 s | 03 确认 | 价格重新向上，Delta 转正，叠加 CVD 线同步抬高 |
| 40 s | 04 反例 | 第三根变形为放量、Delta 很大、长上影，提示「不要追」 |
| 47.5 s | 05 跳空 | 第二、三根跳空上涨，虚线示意先等回踩或修复 |
| 52.8 s | 06 入场 | 第一根开盘价、吸收区、止跌反应、Delta 转强 |
| 59.2 s | 07 风控 | 止损线；目标参考前高、POC、Value Area、流动性位置；左侧有成交量分布 |
| 66.6 s | 结尾 | 三项检查清单；「不是追阳线，是等订单流确认。」；「仅作交易学习，不构成投资建议」 |

## 文件

- `script.json`：旁白文本（中文 + 英文字幕）、语速和行间停顿。
- `timeline.json`：由 `npm run of:vo` 生成，包含每行的起止帧、逐字时间点和字幕分块。
- `events.json`：命名的时间点，例如 `s1`、`cd`、`absorbW`。画面和配乐都从这里取时间。
- `data.ts`：固定的 mock OHLCV、每根 K 线的 Delta、CVD、Footprint 分档成交，以及老平衡区的成交量分布（POC 和 Value Area）。
- `kit.tsx`：数据驱动的绘图组件，包括 K 线（含生长动画）、价格轴、Delta 柱、CVD 线、Footprint 梯子、标签和字幕。
- `Film.tsx`：成片 `OrderFlow`，以及封面 `OrderFlowCover`。
- `text.ts` / `fonts.ts`：画面上的全部文字；字体只按这些文字加载 Google Fonts 子集。
- 资源 `public/orderflow/`：配音 `vo.wav`（edge-tts zh-CN-YunxiNeural）和成品混音 `mix.wav`（合成配乐和音效，−14 LUFS）。

## 命令（都在 `studio/` 下运行）

```bash
npm install
npm run of:typecheck   # 类型检查
npm run of:make        # 类型检查 → 复制字幕 → 渲染 MP4 → 生成封面 → 校验
npm run of:make:cpu    # 没有 GPU 时用这个（swangle）
npm run of:cover       # 只生成封面
```

输出到 `D:/责苏/codex保存/`：

- `order-flow-v1.mp4`
- `order-flow-v1-cover.png`
- `order-flow-v1.srt`（中英双语）

Remotion 的临时帧写在系统临时目录，不会放进这个文件夹。渲染时需要联网，因为要下载 Google Fonts 字体子集。

## 可选：重新生成音频

只有修改了旁白或配乐才需要，平时直接用仓库里的 `mix.wav`。需要 Python 3，以及 `edge-tts`、`numpy`、`scipy` 和 ffmpeg。

```bash
npm run of:vo
npm run of:audio
npm run of:srt
```

edge-tts 调用的是微软在线语音服务。商用前请先确认授权，或者换成你有授权的配音。
