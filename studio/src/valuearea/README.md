# 《价值区怎么用？只看3个数》 — code project

Vertical 1440×2560, 30 fps, H.264 yuv420p BT.709, AAC 320 kbps. Composition IDs `ValueArea` (film) and
`ValueAreaCover` (still). The length is whatever `timeline.json` says — it is never written in code.

## How time works

```
valuearea-script.txt (repo root, verbatim voice text, 47 lines)
  └─ src/valuearea/script.json      same 47 lines + line ids (L01…L47) + sections; must match the .txt exactly
       └─ scripts/valuearea-sync.py
            estimate → timeline.json   placeholder: character counts + punctuation pauses (committed)
            align    → timeline.json   real voice: faster-whisper word timestamps, fallback = pause/energy alignment
            srt      → UTF-8 .srt      from the same timeline (burned into the film as well)
            mix      → public/valuearea/mix.wav   voice + quiet procedural bed + sparse cues, one gain + soft limiter
            check    → every event with the line and word it sits on; fails on unknown names/words/negative offsets
events.json   named moments, named `<line>_<word>` (e.g. `L26_站住`): the frame that word starts
cue.ts        E("L26_站住") → frame; every animation, camera key, label, card and sound cue uses these
```

Change a word of the voice → change it in `valuearea-script.txt`, `script.json` and (if an event uses it)
`events.json`, then `npm run va:estimate` / `va:sync` and `npm run va:check`. New on-screen text → `npm run va:fonts`.

## Commands (run in `studio/`)

| | |
|---|---|
| `npm i` | install |
| `npm run va:typecheck` | TypeScript check |
| `npm run va:estimate` | placeholder timeline (no audio) |
| `npm run va:sync` | real voice → timeline + srt + mix + check (`VOICEOVER_PATH` or `public/voiceover/vo.mp3`) |
| `npm run va:check` | print every event / word |
| `npm run va:stills` | spot-check JPEG stills by event name (local) |
| `npm run va:render` / `va:render:cpu` | film → `VA_VIDEO_DIR` (default `D:/claude视频/成片/分集`) |
| `npm run va:cover` | cover → `VA_COVER_DIR` (default `D:/责苏/Hermes封面`) |
| `npm run va:make` / `va:make:cpu` | typecheck → sync → render → cover, all in one |

`va:render` refuses to run while the timeline is still the estimate or `mix.wav` is missing (no silent film).
Python needs `numpy scipy`; word alignment `pip install faster-whisper pypinyin` (model: `VA_WHISPER_MODEL`, default
`small`; `--model medium` for more accuracy). mp3 decoding uses ffmpeg from PATH, `FFMPEG`, or Remotion's bundled copy.

## Fact red lines (checked before writing the picture)

- **POC** (point of control) = the price row with the most traded volume in the chosen period (TPO count in a
  time-based Market Profile). **VAH / VAL** = upper / lower edge of the value area.
- **Value area** = the contiguous price range around the POC holding a chosen share of the period's volume.
  70% is the customary default (Market Profile tradition, roughly one standard deviation); it is a setting, not a
  law, and platforms differ slightly in how they expand rows and break ties — so VAH/VAL can differ a tick between
  tools. On screen: "常用约70%". The film's own value area is computed this way in `data.ts`.
- Inside the value area = balance: two-sided trade, rotation is normal. Information comes at the edges.
- **Acceptance** = price trades beyond an edge and keeps building time/volume there (holds on the retest).
  **Rejection** = price pokes beyond an edge and returns quickly inside, often rotating back toward the POC.
  Neither is a signal by itself; the film presents them as things to observe (volume, price response, retest).
- Never on screen or in the voice: returns, win rates, "80% rule" odds, real symbols/quotes, entries/exits/stops.
  All data is illustrative (`示意数据 · 非真实行情`); the notice `教学示意，不构成投资建议` is on every frame.

## Picture

Seven sets side by side (`data.ts` SX), one subject each; the camera moves laterally between them and pushes in
slowly on one number at a time. Old set steps back (smaller, higher, darker, defocused) from 6 frames before the new
one enters; old tags shrink/rise/dim/blur over the same 6 frames. No crossfades, no black frames.

| set | lines | subject |
|---|---|---|
| hook | L01–L03 | one support line: holds once, gives way the next time; the profile appears behind it |
| main | L04–L24 | the profile builds row by row → value area opens from the POC → POC / VAH / VAL one by one → "wall" that melts into a range → the period replayed by a price marker → the edge, poll chips |
| accept | L25–L26 | drive into VAH on rising volume, pull back, hold above, new value starts forming |
| reject | L27–L28 | thin-volume poke above VAH snaps back; the mirror at VAL |
| watch | L29–L35 | chop in the middle, the edge, two branches (holds → new value / fails → back inside, pulled to POC) |
| map | L36–L42 | buy/sell keys sink away; the profile becomes terrain: POC ridge, thin valley, price back in the value area |
| end | L43–L47 | poll chips, next episode: prices drawn toward the POC |

Zones (`layout.ts`): status 0–200 · data 220–1880 · cards 1900–2100 · captions 2120–2320 (≈200 px) · 2320–2560 kept
clear for platform UI · 48 px side margins. One main tag and at most two cards at a time. Red = up, green = down,
always with ↑/↓ or words.

## Sound — cue sheet

Procedural only (no downloaded music). Voice untouched except one overall gain to −14 LUFS and a −1.5 dBFS soft
limiter. Bed: low D-minor pad (D2 A2 F3 A3) with a 24 s swell + filtered air, ducked ~60% under the voice, 2.5 s
fade-in, 1.5 s fade-out. Cues are spaced ≥ 0.8 s; levels via `VA_BED` (default 0.045), `VA_SFX` (0.16), `VA_LUFS`.

| event | cue | why |
|---|---|---|
| L02_三个数 | tick | the three numbers are promised |
| L04_打开 | tick | camera moves to the profile |
| L04_成交量分布 | build | soft clicks while the profile fills (one cue) |
| L06_价值区 | edge | the band opens |
| L10_三个数 | tick | the three numbers section |
| L11_成交量 | gold | POC named |
| L12_上沿 / L13_下沿 | edge | VAH / VAL rulers light |
| L19_边缘 | edge | information is at the edge |
| L21_做空 / L21_等确认 | pop | poll chips |
| L25_冲到上沿 | tick | accept example |
| L26_站住 | thump | holds above the edge |
| L27_冲上去 | tick | reject example |
| L27_缩回来 | snap | back inside |
| L29_碰到线 | tick | watch set |
| L33_站住了 | thump | new value |
| L36_买卖按钮 | tick | map set |
| L37_地图 | swell | the profile becomes a map |
| L42_认不认 | gold | the one question to ask |
| L43_中间 / L44_边缘 | pop | comment chips |
| L46_POC | tick | next episode |
| L47_磁铁 | swell | magnet |

## Fonts

`public/valuearea/fonts/*.woff2` are glyph subsets of Noto Sans SC / Noto Serif SC (SIL OFL 1.1, notices next to
them), loaded with `FontFace` from `staticFile` — no network. Rebuild with `npm run va:fonts` after text changes.
