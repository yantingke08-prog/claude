# public/audio: the voiceover contract

| file | who makes it | notes |
|------|--------------|-------|
| `vo.mp3` | **you** (the finished voiceover) | Not committed. The film's length is read from this file (`getAudioDurationInSeconds`). Without it the preview is silent and the length comes from the timestamps file. |
| `vo.timestamps.json` | `npm run sync` (pause alignment, nothing to install; render.ps1 runs it automatically), `scripts/align-vo.ps1` (whisper forced alignment), `npm run seed`, or by hand | Committed **seeded with the production script's suggested timings** (`npm run seed`), so the preview runs. Replace it after you record. |

No TTS is made or used here.

## Format

```ts
type Word = { word: string; start: number; end: number };            // seconds
type Line = { text: string; start: number; end: number; words?: Word[]; shot?: string };
type VoTimestamps = { duration: number; lines: Line[] };
```

```json
{ "duration": 190.9,
  "lines": [ { "text": "当你在这里进场，行情已经连涨了好几天", "start": 0.0, "end": 3.2, "shot": "hook" } ] }
```

- Lines can be any size: clauses, sentences or whisper segments. The film flattens `words` (or the line itself when `words` is missing) into per-character times and maps them onto the script in `src/script.ts`. Line boundaries don't have to match the captions.
- Punctuation and spaces are ignored when matching. If the spoken-character count differs from the script, the times are mapped proportionally and a warning is printed.
- `shot` is optional. It overrides the section of every script line that starts inside that line. Valid ids: hook, concept, define, case, advanced, broll1, broll2, broll3, ticker, outro.
- **Use the original voiceover export as it is (e.g. straight from ElevenLabs). Do not splice in silence or trim it.** The film makes its own 3.9 s room for the title card by pausing the voice inside the existing gap between 「…答案写好了」 and 「你进场之后」. That pause is cut in silence with a 3-frame ramp, so it can't click. The film also ends 0.35 s after the last word with a 0.9 s fade to black, however much silence the file has at the end.
- Timestamps must be **measured on this exact vo.mp3**: they carry `audio: {bytes, seconds}`, and the film checks it. Timings from another file (like the committed suggested timings) make picture and captions drift, so the film then plays the audio to its very end instead of trimming, and warns. They must also come from **alignment against the script** (`scripts/align-vo.ps1`), not from a free ASR transcript. ASR mishears words (e.g. 连涨 → 连长), and that shifts single characters. Times that are out of order, overlapping or zero-length are repaired automatically, and `npm run check` reports how many.
- If the file is missing or empty, captions and sections split the audio evenly by text length (the console warns).
- After editing, run `npm run check`. It prints the section ranges and flags problems.
