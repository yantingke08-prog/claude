# 订单流 06《POC 怎么用：为什么这条线像磁铁》v1 — 交付说明

竖屏 1440×2560、30 fps（与近几集一致，平台会自动下采样到 1080×1920；1440 宽让 K 线和标注在手机上更锐利）。
**实测时长 199.7 秒（5,991 帧）**，净口播 168.5 秒，非口播 16%。时长来自真实配音，未提速、未压停顿。

成片在你本地渲染（本工程只交付代码和素材，没有渲染 mp4）。

## 一、安装（在 `studio/` 目录）

依赖版本（`package.json` 已锁定）：Node 22（npm 10）、remotion / @remotion/cli / @remotion/three 4.0.539、three 0.186.1、@react-three/fiber 9.8.2、@react-three/drei 10.7.9、@react-three/postprocessing 3.2.2、react 19.2.9。
Python 3.12 + numpy 2.5 + scipy 1.18 只在重新生成配音 / 音乐 / 字幕时需要；渲染本身不需要 Python。

```powershell
cd studio
npm install
```

## 二、渲染（在 `studio/` 目录）

```powershell
npm run poc:make
```

依次执行：类型检查 → 数据与口播数字核对（`poc:data`）→ 标注版面检查（`poc:layout`）→ 复制字幕 → 渲染 MP4 → 生成封面 PNG。没有独显用 `npm run poc:make:cpu`。

单独的步骤：

```powershell
npm run poc:render
```

```powershell
npm run poc:cover
```

## 三、输出路径与文件名

| 文件 | 路径 |
|---|---|
| 成片 | `D:/claude视频/poc-magnet-v1.mp4`（H.264 CRF 16 + AAC 320k，yuv420p，bt709） |
| 字幕 | `D:/claude视频/poc-magnet-v1.srt`（从 `outputs-poc-v1/poc-magnet-v1.srt` 复制） |
| 封面 | `D:/责苏/Hermes封面/poc-magnet-v1-cover.png`（1440×2560，Composition `PocMagnetCover`） |

## 四、各素材在仓库里的位置

| 素材 | 位置 | 说明 |
|---|---|---|
| 封面 Composition | `studio/src/poc/Film.tsx` → `PocMagnetCover`（Remotion 里在 POC 文件夹） | 预览图 `outputs-poc-v1/cover-preview.png` |
| 成片 Composition | `studio/src/poc/Film.tsx` → `PocMagnet` | |
| 字幕 | `outputs-poc-v1/poc-magnet-v1.srt`（48 条） | 时间来自 `studio/src/poc/timeline.json` |
| 配音 | `studio/public/poc/vo.mp3`（192k，4.8 MB）；逐句原始 TTS 片段 + 词边界 `studio/poc-audio/tts/` | 重新生成不需要联网（已缓存） |
| BGM | `studio/public/poc/bgm.mp3`（256k，6.4 MB） | `scripts/poc-sync.py bgm` 用代码合成，72 bpm D 小调，按段落加层 |
| 音效 | `studio/public/poc/sfx/*.wav`（9 个，共约 1 MB） | 代码合成：微光、点亮、回拉、迁移滑音、刻度、低音、换场、滑落、弹出 |
| 混音 | `studio/public/poc/mix.mp3`（320k，8 MB）← 渲染读这个 | −14.0 LUFS，真峰值 −1.7 dBTP；配乐在人声下约 −10 dB，音效约 −4 dB |
| 字体 | `studio/public/poc/fonts/*.woff2`（共约 300 KB） | Noto Sans SC、Noto Serif SC、Cascadia Mono 的字形子集，均为 SIL OFL 1.1；渲染不联网 |
| 口播稿 | `outputs-poc-v1/口播稿.md`、`studio/src/poc/script.json` | |
| 分镜、调研、数据说明 | `outputs-poc-v1/分镜与调研.md` | |

音频入库的取舍：大的 WAV 中间文件（vo/bgm/mix 共约 96 MB）不入库（`studio/public/poc/.gitignore`），入库的是 MP3（共约 19 MB）、短音效 WAV 和逐句 TTS 缓存；`npm run poc:sync` 会从缓存重建全部 WAV 和 MP3。

## 五、授权

- **配音**：edge-tts（微软 Edge 朗读服务，zh-CN-YunjianNeural）。**没有正式商用授权**。商用发布前请用 Azure Speech 正式接口（同名音色）或其他有授权的 TTS 重新生成同一稿件：改 `studio/scripts/poc-sync.py` 里的 `speak()`（输出逐句 mp3 + 词边界），删掉 `studio/poc-audio/tts/` 后跑 `npm run poc:sync`，时间轴、画面、字幕、音效会自动跟着新时间走。
- **BGM 和音效**：全部由本仓库脚本用数学合成，没有第三方采样。
- **字体**：SIL OFL 1.1，可商用、可嵌入。
- **画面**：K 线、分布、盘口全部由代码生成的示意数据，没有 AI 图片、视频素材或软件截图；右上角全程“示意图 · 模拟数据”，结尾单独一屏“教育内容 不构成投资建议”。

## 六、改稿流程

改 `studio/src/poc/script.json` 的某句 → `npm run poc:sync`（只重做改动的句子的 TTS，需联网）→ `npm run poc:data`（口播数字与示意数据一致）→ `npm run poc:layout` → `npm run poc:stills` 抽帧看一眼 → `npm run poc:make`。
画面动作绑定在 `studio/src/poc/events.json` 的“哪一句 + 哪个词”上，改词时同步改这里。
