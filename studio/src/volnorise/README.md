# 放量不涨，是洗盘还是出货？（v1）

竖屏 1440×2560、30 fps、约 91 秒的量价科普短片。Remotion + Three.js（@remotion/three）：K 线、成交量、关键价位全部由代码生成，没有视频素材和 AI 图片；中文用 Noto Sans SC / Noto Serif SC 原生渲染。行情是固定的示意数据，右上角始终标注「教学示意，不构成投资建议」，结尾单独一屏再说一次。

配音：edge-tts（zh-CN-YunyangNeural）在你自己的机器上生成，逐字时间直接取自 TTS 的词边界，不靠猜。口播原文在 `script.json`。

## 结构

| line | 章节 | 画面（镜头） |
|---|---|---|
| L01 | 开场 | 第一屏就是完整的 K 线 + 成交量面板；说到「放量」时最后一根（放量、长上影、收盘几乎没涨）被金色细框和金色量柱点亮；「你会追吗」大字提问 |
| L02 + 5 秒 | 倒计时 | 「给你5秒决定 / you have 5 seconds」，然后在 L02 后的 5.5 秒静音里跑 5-4-3-2-1：金色圆环逐秒走完，数字逐个替换，每秒一声干净的短 tick，K 线轻微压暗，镜头极慢推近；没有闪光、抖动和 whoosh |
| L03 | 重点画面 | 倒计时结束：K 线压到几乎全暗（量柱保留），中央「只看成交量 / 不够」（一声低沉的 thump），配音随后读出这句 |
| L04 | 放量不涨是什么 | K 线恢复，镜头推近那根放量 K 线：「量很大，价没走远 / 有人大量卖，也有人大量接」 |
| L05 | 洗盘？出货？ | 镜头横移（一个连续的 dolly，上一组布景在出画后才淡出）到 A / B 两张上下叠放的图：同一种放量滞涨，A 在低位、B 在大涨之后；「区别不在这一根：看位置 · 看后面的走势」 |
| L06–L07 | 01 位置 | 镜头升降到 A：底部平台（金色区域）+ 涨幅括号 ≈ +14% → 降到 B：涨幅括号 ≈ +55%、起涨线 → 拉远：「低位：更可能是换手」「高位：要警惕出货」 |
| L08–L09 | 02 量价配合 | A 之后的回调逐根打印，量柱一天比一天低（金色下降线）→ B：下跌放量（量柱点亮）、反弹缩量 |
| L10–L11 | 03 承接 | 放量 K 线低点画成金色价位线；A 跌到线下，下影线拉长（下影变金），线下的玻璃承接板亮起 → B 一碰就破：承接板碎掉、一束绿色向下，下影很短 |
| L12–L13 | 04 收回 · 站稳 | A 很快回到线上方，低点抬高（三点连线）→ B 反弹到线下收不回，线的标签从「支撑」变成「压力」，之后继续走低 |
| L14–L15 | 总结 | 拉远看两张图，两张卡片逐词点亮：低位、缩量回调、有承接、能收回 → 更像洗盘；高位、放量下跌、没承接、收不回 → 更要防出货 |
| L16–L17 | 交易逻辑 | 「当天不急着下结论」，放量 K 线之后的区域框出来：答案在后面几根 K 线；三条规则：收回站稳→再考虑、跌破收不回→先回避、止损提前设好 |
| L18–L19 | 结尾 | 「你最先看哪一点？」四个选项 + 评论区；最后一屏「教学示意 / 不构成投资建议」 |

画面规则：同一句只有一个主标注；同时最多两张卡片；标注在说到对应的词时才出现；手机安全区左右 48 px，标注 y 400–1880，字幕在 y 1962 以下，标注不压字幕；没有黑场转场，没有叠加的 whoosh。配色只有深黑蓝、暖白、金、红（涨）、绿（跌）。

## 时间轴：全部由 line ID 驱动

- `script.json`：19 句口播原文（字幕基准）、TTS 参数、每句之后的停顿（L02 后 5.5 秒给倒计时）。
- `timeline.json`：每句、每个字的起止帧，字幕分条，**总帧数也在这里**。代码里不写死帧号或时长。
- `events.json`：画面动作的命名时间点，写法是「哪一句 + 哪个词」，倒计时的五秒是「L02 结束后 +8/+38/+68/+98/+128 帧」。画面（`cue.ts`）、抽帧脚本和混音用同一套规则。
- 仓库里提交的 timeline 就是用 edge-tts 生成的真实时间（约 90.6 秒）。在你的机器上重跑 `npm run vnr:sync` 会重新生成配音和 timeline，画面、字幕、总时长自动跟着走。

## 文件

- `Film.tsx`：成片 `VolNoRise`、封面 `VolNoRiseCover`。音频读 `public/volnorise/mix.wav`，没有就读 `public/volnorise/vo.wav`，都没有就静音。
- `world.tsx`：3D 舞台（K 线、量柱、价位线、承接板、灯光、地面）。
- `acts.ts`：每根 K 线什么时候打印出来（A/B 放量 K 线之后的 K 线跟着讲解逐根出现）。
- `director.ts`：镜头关键位和布景出入场。
- `hud.tsx`：倒计时、标注、卡片、字幕。
- `data.ts`：示意行情和舞台布局。
- `text.ts` / `fonts.ts`：画面文字；字体按这些字从 Google Fonts 取子集（渲染时需要联网）。
- `../../scripts/volnorise-sync.py`：TTS / 对齐、SRT、混音、事件检查。
- `../../scripts/volnorise-stills.mjs`：按事件名抽帧检查，例如 `node scripts/volnorise-stills.mjs out/vnr 0.5 cd2 punch+20 cover`。

## 本地使用（都在 `studio/` 下）

```bash
npm install
pip install numpy scipy edge-tts
npm run vnr:make
```

`vnr:make` 依次执行：类型检查 → TTS 配音 + timeline + 字幕 + 混音（`vnr:sync`）→ 复制字幕 → 渲染 MP4 → 生成封面。没有独显时用 `npm run vnr:make:cpu`。TTS 需要联网；解码用 PATH 里的 ffmpeg，没有就用 Remotion 自带的。

输出：

- `D:/claude视频/vol-no-rise-v1.mp4`
- `D:/claude视频/vol-no-rise-v1-cover.png`
- `D:/claude视频/vol-no-rise-v1.srt`

单独的步骤：`npm run vnr:tts`（配音 + timeline）、`npm run vnr:srt`（字幕到 `../outputs-volnorise-v1/vol-no-rise-v1.srt`）、`npm run vnr:mix`（−14 LUFS 混音，峰值 ≤ −1.5 dBFS）、`npm run vnr:check`（每个画面事件落在哪个词上，并检查倒计时的静音够不够 5.3 秒）、`npm run vnr:stills`（关键帧抽查）。

## 换成自己录的配音

edge-tts 不是正式的商用 TTS 授权；商用发布前建议换成授权配音。自己录：照着 `script.json` 念，「给你五秒决定」之后停 5.5 秒以上，存成 `public/volnorise/vo.wav`，然后 `npm run vnr:sync:local`（faster-whisper 逐字对齐，没装就按停顿对齐；`pip install faster-whisper pypinyin`），再 `npm run vnr:prep && npm run vnr:render && npm run vnr:cover`。
