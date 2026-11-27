# 主流交易流派排行榜 · Remotion 工程

1920×1080 · 30fps · 16:9 · 目标 90–94 秒。Composition 名称：**`TradingSchoolRanking`**。
本工程只包含代码、字体和配置，不含音频、成片或封面。

## 快速开始

```powershell
npm install
npm run studio        # 预览（没有音频时按 93 秒占位）
npm run typecheck     # TypeScript 类型检查
npm run check         # 文案与时间轴体检
```

## 文件结构

| 文件 | 内容 |
| --- | --- |
| `src/content.ts` | 排名、40 句口播（也是字幕）、每个流派的优势/风险卡、片尾思维导图 |
| `src/timeline.ts` | 时间轴：口播起止 → 每页起止帧、页内触发点、总帧数 |
| `src/theme.ts` | 色板、字号、版式、动效时长 |
| `src/Root.tsx` | Composition 注册；`calculateMetadata` 读取音频与 timing.json |
| `src/Film.tsx` | 背景、页面交叉淡化、底部字幕、右上角免责声明、音频 |
| `src/scenes.tsx` | 开场、名次揭晓、概念页、优缺点卡、订单流三页、片尾 |
| `src/charts/*` | 五张 SVG 图（指标、裸K、价格行为、威科夫、订单簿/足迹/信号） |
| `scripts/sync-vo.mts` | 用配音自动生成 `public/audio/timing.json` |
| `scripts/check.mts` | 文案字数、名次停留、语速等检查 |
| `scripts/stills.mts` | 抽静帧审片（只出 JPG，不渲染整片） |
| `scripts/fonts.py` | 从 Noto Sans/Serif SC 子集化出离线字体 |

## 片子结构

开场（行情墙扫入 → 标题两次砸下：闪白、冲击波、火花、色散、金色扫光 → 名次牌翻开）→ 第五名到第一名，每个流派固定四拍：
**全屏大数字 → 核心概念图 → 绿色优势卡 → 红色风险卡**。

订单流是高潮，多了三页：
1. 痕迹 vs 推动：前四名看结果（灰色 K 线），订单流看主动买单一笔笔推高价格
2. 订单簿 → 成交与足迹 → 决策信号：大买单飞入、卖一 180 手被吃光、最新价上跳一格、
   成交写进足迹、Delta、卖单砸向买一被反复补上（吸收）、斜向 4:1 失衡。七句话七层，逐层出现
3. 金色路径总结 + “离真相最近的一层”

片尾白底思维导图缓慢平移、轻微缩放，落到结论：“交易没有绝对最强的流派，只有最适合你性格的系统。”

## 接入配音

1. 按 `src/content.ts` 的 `SEGMENTS` 逐字录音（中文男声，约 285–295 字/分钟）。
   名次句（“第四名，裸K。”这类）后面请留 0.5–1 秒停顿，名次数字才能停够 1.5 秒；
   标了 `hold: true` 的结论句后留约 1.2 秒。
2. 放到 `public/audio/voiceover.wav`。
3. 生成时间轴：

   ```powershell
   npm run sync
   ```

   它找出配音里的停顿，把 40 句对齐上去，写出 `public/audio/timing.json`。
   报告里列出的“check line”语速异常，说明那句可能对齐偏了，可手工改 start/end。
4. `npm run check`，然后 `npm run studio` 预览。总帧数自动等于音频长度
   （若音频在最后一句后不足 1.3 秒，会自动补到 1.3 秒静帧）。
5. 改了屏幕上的文字（或 timing.json 里的字幕文本）后运行 `npm run fonts` 重新生成字体子集
   （需要 `pip install fonttools brotli`；不运行也能渲染，会回退到系统字体）。

### timing.json 格式

```json
{
  "duration": 92.4,
  "segments": [
    { "id": "s01", "text": "交易流派那么多，到底哪个最强？", "start": 0.35, "end": 2.90 }
  ]
}
```

- 按 `id` 匹配句子（没有 id 时按顺序）；时间单位为秒。
- 有 `text` 时字幕以它为准，保证字幕与配音逐字一致。
- 只有 wav 没有 timing.json 时：按字数估算，再整体缩放到音频长度（仅供粗看）。
- 都没有时：按字数估算，缩放到 93 秒。

## 渲染（本地）

`remotion.config.ts` 已设好 H.264 / CRF 18 / preset slow / yuv420p：

```powershell
npx remotion render src/index.ts TradingSchoolRanking out/TradingSchoolRanking.mp4 --codec=h264 --crf=18 --x264-preset=slow
```

抽帧审片（不渲染整片）：

```powershell
npm run stills
```

```powershell
npm run stills -- 1910 2150 2787
```

## 规范落实

- 色板与字号全部在 `src/theme.ts`：流派标题 60px、图表标题 44px、图内标注 ≥ 24px、字幕 40px。
- 卡片页的缩略图用 `bare` 模式，不画任何文字，避免缩小后低于 24px。
- 字幕整句出现（4 帧淡入），不逐字、不抖动；画面文字进入后完全静止。
- 页面切换 0.28 秒交叉淡化，旧页左退 26px、新页从右侧进入；箭头 0.45–0.55 秒。
- **红涨绿跌**：K 线、成交量、买单/主动买、Delta 为正一律红色（`C.up`），下跌/卖方一律绿色（`C.down`）；优势卡绿、风险卡红保持不变。
- 走势用关键点之间的布朗桥生成（`charts/common.ts` 的 `keyed`），波动率忽大忽小；K 线实体随涨跌幅变化，影线长短为长尾分布，偶有跳空（`anim.ts` 的 `candlesFrom`）。价格行为、威科夫也改成真实 K 线。
- K 线逐根生成，曲线用 SVG 描边生长；所有随机数据用固定 seed（mulberry32）。
- 背景是静态渐变 + 极淡网格 + 纸张颗粒 + 行情纹理，不漂移；无 3D、无远程资源。只有开场（`src/intro.tsx`）用火花、闪白、震屏抓眼球。
- 深色背景上的图和字整体提亮：次要文字 #D3D6DB、边框/网格加亮、图内标注带深色描边衬底。
- 优缺点每条 10–14 字、每卡 3 条，由 `npm run check` 检查。
