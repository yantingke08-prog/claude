# 音频占位 · xishou-v1

代码固定引用以下文件，**直接替换同名文件即可，不用改代码**。

| 文件 | 内容 | 建议时长 | 推荐格式 |
|---|---|---|---|
| `voiceover.m4a` | 口播（当前为**静音占位**） | 156 s（= 4678 帧 / 30fps） | AAC 48 kHz 立体声 ≥192 kbps，响度约 -16 LUFS |
| `bgm.m4a` | 低音量氛围音乐（当前为静音占位） | ≥156 s | AAC 48 kHz 立体声 |
| `sfx/draw.wav` | 线体绘制 / 区域生长 | 0.2–0.5 s | WAV 48 kHz |
| `sfx/tick.wav` | 数据出现、证据点亮 | <0.1 s | WAV 48 kHz |
| `sfx/confirm.wav` | 证据链完成 / 确认 | <0.4 s | WAV 48 kHz |
| `sfx/fail.wav` | 失效 / 破位 | <0.4 s | WAV 48 kHz |
| `sfx/stamp.wav` | 品牌印章 / 结论落定 | <0.5 s | WAV 48 kHz |

音效是用 ffmpeg 合成的原创短音，可直接用，也可以替换。

音量（`src/xishou/XishouLVP.tsx` 里的 `defaultXishouProps`，也可以在 Studio 右侧面板里改）：
`voiceVolume 1` · `bgmVolume 0.12` · `sfxVolume 0.3`，口播始终优先。

## 换真实配音

1. 先按 `src/xishou/script.ts` 里的旁白录音（字幕也取自同一份文本）。
2. 导出 `voiceover.m4a` 覆盖本目录下的同名文件。
3. 如果语速和占位节奏不一样：调 `FRAMES_PER_CHAR`（整体语速），或调某一句的 `pause`（句后停顿）。画面、字幕、音效都按同一份时间轴自动对齐。
4. 运行 `npm run xs:lint`，看新的总时长，再把 `voiceover.m4a` 的时长对上。

## 本地重新生成静音占位

```bash
ffmpeg -y -f lavfi -i anullsrc=r=48000:cl=stereo -t 156 -c:a aac -b:a 32k voiceover.m4a
ffmpeg -y -f lavfi -i anullsrc=r=48000:cl=stereo -t 156 -c:a aac -b:a 32k bgm.m4a
```
