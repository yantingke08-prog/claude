# LVP · 孤立高低点 (Remotion project)

This is a 16:9 explainer driven by the voiceover, in a "dark neon financial terminal" style. Composition `LvpSwingPoints`: 1920×1080, 30 fps, with its length taken from your voiceover (≈190.9 s with the production script's timings).

The script, brand and character are original (LVP). The film only borrows the general visual language of the reference video: a dark neon look with minimal charts. Colours are **红涨绿跌** throughout: red is up, green is down, purple is resistance or an isolated high, and blue is support or an isolated low. They are defined only in `src/theme.ts`.

## Install

Needs Node 22.6+ (for `npm run check`).

```powershell
npm ci
```

Dependency versions are pinned exactly and `package-lock.json` is committed. The Chinese font (Noto Sans SC, SIL OFL) is embedded from `public/fonts/`, so renders never fall back to another font.

## Voiceover → timing

1. Put the finished voiceover at `public/audio/vo.mp3`.
2. Time it against the script with forced alignment, which needs Python with `pip install -U stable-ts` (or `whisperx`) and ffmpeg:
   ```powershell
   powershell -ExecutionPolicy Bypass -File scripts/align-vo.ps1
   ```
   This overwrites `public/audio/vo.timestamps.json`, which is committed seeded with the production script's suggested timings. You can also edit start/end by hand. The format is in `public/audio/README.md`.
3. Check the result:
   ```powershell
   npm run check
   ```

No component holds a time value. Every action is tied to a spoken phrase in `src/cues.ts`, for example `caseBreak: "这里价格干脆地突破了压力"`. When the voiceover changes, everything moves with it. If the timestamps file is missing, the audio is split evenly by text length.

## Preview

```powershell
npm run studio
```

To spot-check frames as PNGs in `out/stills/` (pass seconds, or omit them for one or two per section):

```powershell
npm run stills -- 2.5 66 104
```

## Render (on your machine)

```powershell
powershell -ExecutionPolicy Bypass -File scripts/render.ps1
```

This runs `npm run check`, then writes `D:/claude视频/LVP-孤立高低点.mp4` (H.264, about 3 Mbps, AAC) and a cover still next to it. Pass `-Out "D:\path\name.mp4"` to write elsewhere. The equivalent raw command is:

```powershell
npx remotion render src/index.ts LvpSwingPoints "D:/claude视频/LVP-孤立高低点.mp4" --codec=h264 --video-bitrate=3M --audio-codec=aac
```

BGM is not included. If you want music, mix it at ≤ -28 dB under the voice before you export `vo.mp3`.

## Assets you can drop in

| what | where | if missing |
|------|-------|------------|
| Voiceover | `public/audio/vo.mp3` | The preview is silent and the length comes from the timestamps. |
| Timestamps | `public/audio/vo.timestamps.json` | The audio is split evenly by text length. |
| B-roll #1–#3 (tablet, dual monitors, typing) | `public/broll/broll1.mp4` … `broll3.mp4` (see `public/broll/README.md`) | Code-built stand-ins play. |
| Mascot | none: the LVP corner badge replaces the character, as the production script asks | — |

## Layout

| path | what |
|------|------|
| `src/script.ts` | The narration: 99 lines, each with its section (`shot`). `|` marks a caption hard cut. `seed` holds the suggested times and is used only by `npm run seed`. |
| `src/cues.ts` | Every timed action → the phrase that triggers it. |
| `src/timeline.ts` | Timestamps (+ audio length) → timed lines, captions, sections, and text anchors. Pure TS. |
| `src/theme.ts` | All colours, fonts and the disclaimer. |
| `src/kit.tsx` | Layers L1 background, L2 chart engine (candles grow at 0.12 s each), L3 annotations (0.3 s fade + 0.85→1 easeOutBack, B bubble ripple, levels draw in 0.35 s with an 8 px glow and the label 0.15 s later), L5 text (title bar, 110 px big title, disclaimer), L6 brand (LVP badge, price-ladder mark), plus the per-section slow push-in (100→104 %, x 0→−30 px, easeInOutSine). |
| `src/Captions.tsx` | Bottom captions: 64 px bold white, 90 px from the bottom, hard cuts, ≤14 characters. |
| `src/Film.tsx` | Lays out the sections with a 0.3 s cross-dissolve and a hard cut into the red-band title card. It also holds the always-on badge and disclaimer, the captions and the audio. |
| `src/scenes/*.tsx` | hook (0–24), title (24–28), concept, define, case, advanced, broll1–3, ticker, outro. |
| `src/data.ts` | Deterministic example data built leg by leg. `npm run check` proves that every isolated high or low the film points at satisfies the 3-candle rule. |
| `scripts/check.mts` | Cue coverage, caption length, pivot proofs, the no-colour-literal rule, and both timing modes. |
| `scripts/align-vo.ps1`, `scripts/align_vo.py` | Forced alignment. |
| `scripts/render.ps1`, `scripts/stills.mjs`, `scripts/seed-timestamps.mts` | Render, stills and the seed. |

## Changing things

- **Move an action to another word:** edit its phrase in `src/cues.ts`, then run `npm run check`.
- **Change the wording:** edit `src/script.ts`, then re-run alignment (or `npm run seed`). If you remove a phrase that a cue uses, the check names that cue.
- **Change a colour:** edit `src/theme.ts` only. The check fails if a colour literal appears anywhere else.
