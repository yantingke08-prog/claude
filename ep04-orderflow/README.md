# EP.04 订单流 · 三种成交: Remotion project

A vertical explainer driven by the voiceover. Composition `Ep04OrderFlowThreeFills`: 1080×1920, 30 fps, with its length taken from your voiceover. The 3D look uses CSS 3D (perspective and real camera moves) instead of WebGL, so it previews and renders on machines without a GPU.

## Install

Needs Node 18+. Node 22.6+ is needed for `npm run check`.

```powershell
npm ci
```

`npm install` also works. Dependency versions are pinned exactly and `package-lock.json` is committed.

## Voiceover in, timestamps in

1. Copy your finished voiceover to `public/audio/vo.mp3`, overwriting the silent placeholder.
2. Create the timestamps (Chinese forced alignment of the script against your audio):
   ```powershell
   powershell -ExecutionPolicy Bypass -File scripts/align-vo.ps1
   ```
   This needs Python with `pip install -U stable-ts` (or `whisperx`) and ffmpeg on PATH. The script detects both and tells you what is missing. It writes `public/audio/vo.timestamps.json`, then runs `npm run check`.
   You can also write the file yourself; the format is in `public/audio/README.md`.
3. Check the result:
   ```powershell
   npm run check
   ```
   This confirms the script matches 逐字稿, every caption fits one line, no cut falls on a ［短暂停顿］, and every anchor is found. It also prints the real shot ranges.

If `vo.timestamps.json` is missing or empty, the film still works: captions and shots split the audio evenly by caption length, and the console prints a warning.

## Preview

```powershell
npm run studio
```

## Render (on your machine)

```powershell
powershell -ExecutionPolicy Bypass -File scripts/render.ps1
```

Expected output: `out/Ep04OrderFlowThreeFills.mp4` (H.264 + AAC, 1080×1920, 30 fps). To write somewhere else, pass `-Out "D:\path\EP04.mp4"`. The equivalent raw command is:

```powershell
npx remotion render src/index.ts Ep04OrderFlowThreeFills out/Ep04OrderFlowThreeFills.mp4 --codec=h264 --crf=18 --audio-codec=aac
```

## Layout

| path | what |
|------|------|
| `script/逐字稿.txt` | The authoritative script (do not edit the wording). |
| `src/script.json` | The same text, split into segments, each with a `shot` id. `npm run check` proves it matches 逐字稿 character for character. |
| `src/audioContract.ts` | The `Word` / `Line` / `VoTimestamps` types and the audio paths. |
| `src/timelineCore.ts` | Builds the timeline from script + timestamps + audio duration: caption units (split at ，。；？！： and ［短暂停顿］), per-character times, shots, the pause rule, and the even-split fallback. Pure TS. |
| `src/Root.tsx` | Registers the composition. `calculateMetadata` reads the vo.mp3 duration (`getAudioDurationInSeconds`) and the timestamps. |
| `src/Film.tsx` | Lays shots out on the timeline with cross-fades over the previous shot (no black frames), plus the captions and the audio. |
| `src/Captions.tsx` | Single-line, centred captions that never wrap. Characters light up as they are spoken; the font shrinks only if a line would overflow. |
| `src/kit.tsx` | 3D stage/camera, pseudo-3D boxes and candles, terminal-style tags, and `useShot().at("词")` text anchors. |
| `src/scenes/*.tsx` | One scene per shot id (registry in `src/scenes/index.ts`). |
| `src/broll.ts`, `assets/broll/` | The B-roll registry and its stills. |
| `scripts/align-vo.ps1`, `scripts/align_vo.py` | Forced alignment. |
| `scripts/render.ps1` | One-command render. |
| `scripts/check-timeline.mts` | `npm run check`. |
| `SHOTBOOK.md` | Shot list: range, voiceover anchors, what is on screen. |

## Changing a shot

Each scene reads its times only through text anchors, for example `const t0 = at("吃卖单")`. To move an action to another word, change the anchor text. To give a sentence a different scene, change its `shot` in `src/script.json`, or set `shot` on that line in `vo.timestamps.json`.
