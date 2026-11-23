# public/audio: the voiceover contract

| file | who makes it | notes |
|------|--------------|-------|
| `vo.mp3` | **you** (the finished voiceover) | Not committed. The film's length is read from this file (`getAudioDurationInSeconds`). Without it the preview is silent and the length comes from the timestamps file. |
| `vo.timestamps.json` | `scripts/align-vo.ps1` (forced alignment), `npm run seed`, or by hand | Committed **seeded with the production script's suggested timings** (`npm run seed`), so the preview runs. Replace it after you record. |

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
- `shot` is optional. It overrides the section of every script line that starts inside that line. Valid ids: hook, concept, define, case, advanced, broll1, broll2, broll3, ticker, outro. The `title` card has no narration and always fills the silence between `hook` and `concept`, so leave about 3–4 s of silence there.
- If the file is missing or empty, captions and sections split the audio evenly by text length (the console warns).
- After editing, run `npm run check`. It prints the section ranges and flags problems.
