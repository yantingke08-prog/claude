# public/audio: the voiceover contract

| file | who makes it | notes |
|------|--------------|-------|
| `vo.mp3` | **you** (the finished voiceover) | The committed file is a **silent 133 s placeholder**, so the project opens. Overwrite it with the real voiceover. The film's length is read from this file (`getAudioDurationInSeconds`). |
| `vo.timestamps.json` | `scripts/align-vo.ps1` (whisper forced alignment) or any tool you like | It is committed empty (`{"duration":0,"lines":[]}`). While it is empty, captions and shots split the audio evenly by caption length and the console warns about it. |

Nothing here is synthesised: no TTS and no downloaded audio.

## Format (`src/audioContract.ts`)

```ts
type Word = { word: string; start: number; end: number };            // seconds
type Line = { text: string; start: number; end: number; words?: Word[]; shot?: string };
type VoTimestamps = { duration: number; lines: Line[] };
```

```json
{
  "duration": 131.42,
  "lines": [
    { "text": "你刚追进去", "start": 0.21, "end": 1.18, "shot": "hook",
      "words": [ { "word": "你", "start": 0.21, "end": 0.38 }, { "word": "刚", "start": 0.38, "end": 0.55 } ] }
  ]
}
```

- Lines can be any size (clauses, sentences, whisper segments). The film flattens every `words` entry, or the line itself when `words` is missing, into per-character times, then maps them onto the script's own caption units. Line boundaries in your file therefore don't have to match the captions.
- Punctuation and spaces are ignored when matching. If the spoken-character count differs from the script, the times are mapped proportionally and a warning is printed.
- `shot` is optional. If you set it, it overrides the shot of every caption unit that starts inside that line. Valid ids are listed in `src/scenes/index.ts`.
- After editing, run `npm run check`. It prints the real shot ranges and flags problems.
