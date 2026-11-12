# HANDOFF · xishou-v1 · 吸收不是反转（LVP订单流）

| 项 | 值 |
|---|---|
| 仓库 | __REPO_URL__ |
| 分支 | `xishou-v1` |
| 源码提交 | `__COMMIT__` |
| Composition | `XishouLVP`（1080×1920 · 30fps · 4678 帧 ≈ 155.9 s） |
| 入口 | `studio/src/xishou/index.ts`（只打包本片，渲染时不联网） |
| 已渲染完整成片 | **NO**（云端只跑了类型检查、lint、compositions 和 4 张单帧） |

## 安装

```powershell
git clone __REPO_URL__
cd <repo-directory>
git fetch origin
git switch --track origin/xishou-v1
cd studio
npm ci
```

本机已有仓库时：

```powershell
git fetch origin
git switch xishou-v1
git pull --ff-only origin xishou-v1
cd studio
npm ci
```

## Studio 预览

```powershell
cd studio
npx remotion studio src/xishou/index.ts
```

## 本机 GPU 渲染

```powershell
cd studio
npm run xs:make
```

等价于：

```powershell
New-Item -ItemType Directory -Force "D:\claude视频"
npx remotion render src/xishou/index.ts XishouLVP "D:\claude视频\吸收_LVP订单流_xishou-v1.mp4" --gl=angle --concurrency=50% --codec=h264 --crf=16 --pixel-format=yuv420p --color-space=bt709 --audio-codec=aac --audio-bitrate=320k
```

没有可用 GPU 时改用 `npm run xs:render:cpu`（swangle，慢）。也可以先用 `XishouLVP-chapters` 文件夹下的单章 Composition 单独渲染某一章。

## 预期输出

`D:\claude视频\吸收_LVP订单流_xishou-v1.mp4`

## 替换配音

- `studio/public/assets/audio/voiceover.m4a` 现在是 **156 s 静音占位**，用同名文件覆盖即可，代码不用改。
- 旁白和字幕都来自 `studio/src/xishou/script.ts`，照着录。
- 语速和占位节奏不同时，调 `FRAMES_PER_CHAR` 或单句的 `pause`。画面、字幕、音效会一起重新对齐。改完跑 `npm run xs:lint` 看新的总时长。
- 背景音乐：`bgm.m4a`（同样是静音占位），默认音量 0.12。音效在 `sfx/*.wav`。详见 `studio/public/assets/audio/README.md`。

## 替换真实回放

把文件放进 `studio/public/assets/replay/`：`breakdown.mp4`、`absorption-success.mp4`、`absorption-failure.mp4`。放了就自动替换对应面板的合成 K 线，角标变成 `REAL REPLAY · 实盘回放`；没放就继续用合成数据，角标是 `SIMULATED · 教学示意`。详见该目录下的 `README.md`。

## 已知限制

- 口播和背景音乐都是静音占位，需要在本机替换。
- 所有订单流画面都是固定 seed 生成的**教学合成数据**，全程标注 `教学示意 · 非实盘数据`。没有真实品种、日期、账户或成交。
