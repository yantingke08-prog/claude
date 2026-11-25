# LVP订单流 · 三种成交 (SanzhongLVP)

A vertical 1080×1920, 30 fps order-flow explainer about the three kinds of fills: 主动 (aggressive), 被动 (passive) and 被迫 (forced).
The film is driven by the user's own recording. Nothing is synthesised.

## Files

| Path | What it is |
|---|---|
| `src/sanzhong/script.ts` | The single timing source: the exact narration split into shots, named **beats** (each visual action is tied to the word it lands on), caption keywords and SFX cues |
| `src/sanzhong/timeline.ts` | Pure logic: script + `vo.timestamps.json` (+ audio length) → caption units, shots, beat times |
| `src/sanzhong/index.ts` | Offline entry point (local fonts only, no Google-font loaders) |
| `public/sanzhong/audio/vo.mp3` | **The recording.** The committed file is a **silent 133 s placeholder** |
| `public/sanzhong/audio/vo.timestamps.json` | Per-character timings from `npm run sz:align`. Committed **empty** |
| `public/sanzhong/sfx/*.wav`, `public/sanzhong/brand/lvp-logo.jpg` | Original short SFX and the LVP logo (used unaltered) |

While `vo.timestamps.json` is empty, captions, shots and beats split the audio evenly by caption length, and every run warns about it.
Once the file is filled, every second comes from the recording. The film's length is the recording's length plus a 1.8 s hold after the last word.

## Local workflow (run in `studio/`)

```powershell
# 1. replace the placeholder with the real recording (same name)
copy <your recording>.mp3 public\sanzhong\audio\vo.mp3
# 2. time it (needs ffmpeg + Python with stable-ts or whisperx; CPU is fine)
npm run sz:align
# 3. checks: beats resolve, captions fit, no 1-character caption lines, compliance
npm run sz:check
# 4. optional: preview / layout scan / beat stills
npm run sz:studio
npm run sz:qa
npm run sz:stills
# 5. render to D:\claude视频\三种成交_LVP订单流_three-fills-v1.mp4
npm run sz:make          # GPU (--gl=angle)
npm run sz:render:cpu    # no GPU
```

`sz:qa` renders every 6th frame at half size in a QA mode that shows only label and caption boxes. It fails on any overlap or any text outside the safe area (top 110, bottom 260, sides 64 px).

## Timing a change

- To move a visual action, edit its beat in `BEATS` (the phrase it lands on), not a number.
- If the recording differs from the script by a few characters, alignment maps proportionally and warns. Fix the text in `PARAGRAPHS` to match what was actually said, then run `sz:align` again.
