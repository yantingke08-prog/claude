"""Chinese forced alignment for 三种成交 (SanzhongLVP).

  public/sanzhong/audio/vo.mp3 + caption units (from src/sanzhong/script.ts)
      -> public/sanzhong/audio/vo.timestamps.json

Called by scripts/sanzhong-align-vo.ps1, which picks the Python + engine and writes the units JSON.
Aligns the exact script text to the recording (no free transcription), so every spoken character
gets a time. Nothing is synthesised. Adapted from the EP.04 aligner.

Engines:  stable-ts  (pip install -U stable-ts)   |   whisperx  (pip install -U whisperx)
Both need ffmpeg on PATH.
"""
import argparse
import json
import re
import subprocess
import sys
from pathlib import Path

DROP_TRAILING = re.compile(r"[，。；：、]+$")
PAUSE = re.compile(r"［短暂停顿］|\[短暂停顿\]")
NON_SPOKEN = re.compile(r"[\s，。；？！：、\"“”‘’'「」『』《》（）()［］\[\]…—\-·,.;?!:]")


def normalise(s: str) -> str:
    return NON_SPOKEN.sub("", PAUSE.sub("", s)).upper()


def audio_duration(path: Path) -> float | None:
    for exe in ("ffprobe",):
        try:
            r = subprocess.run([exe, "-v", "error", "-show_entries", "format=duration", "-of", "default=nw=1:nk=1", str(path)], capture_output=True, text=True, check=True)
            return float(r.stdout.strip())
        except Exception:
            pass
    return None


def chars_stable_ts(audio: Path, text: str, model_name: str, device: str | None):
    import stable_whisper  # type: ignore

    model = stable_whisper.load_model(model_name, device=device) if device else stable_whisper.load_model(model_name)
    result = model.align(str(audio), text, language="zh")
    return [(w.word, float(w.start), float(w.end)) for seg in result.segments for w in seg.words]


def chars_whisperx(audio: Path, text: str, device: str | None):
    import whisperx  # type: ignore

    dev = device or ("cuda" if _cuda() else "cpu")
    wav = whisperx.load_audio(str(audio))
    dur = len(wav) / 16000
    model, meta = whisperx.load_align_model(language_code="zh", device=dev)
    res = whisperx.align([{"text": text, "start": 0.0, "end": dur}], model, meta, wav, dev, return_char_alignments=True)
    return [(c["char"], float(c["start"]), float(c["end"])) for seg in res["segments"] for c in seg.get("chars", []) if "start" in c and "end" in c]


def _cuda() -> bool:
    try:
        import torch  # type: ignore

        return torch.cuda.is_available()
    except Exception:
        return False


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--units", required=True)
    ap.add_argument("--audio", required=True)
    ap.add_argument("--out", required=True)
    ap.add_argument("--engine", choices=["stable-ts", "whisperx"], required=True)
    ap.add_argument("--model", default="medium")
    ap.add_argument("--device", default=None)
    a = ap.parse_args()

    units = json.loads(Path(a.units).read_text(encoding="utf-8"))
    text = "\n".join(u["spoken"] for u in units)
    timed = chars_stable_ts(Path(a.audio), text, a.model, a.device) if a.engine == "stable-ts" else chars_whisperx(Path(a.audio), text, a.device)

    chars: list[tuple[float, float]] = []
    for tok, s, e in timed:
        n = len(normalise(tok))
        for k in range(n):
            chars.append((s + (e - s) * k / n, s + (e - s) * (k + 1) / n))
    total = sum(len(u["spoken"]) for u in units)
    if not chars:
        print("ERROR: the aligner returned no timings.", file=sys.stderr)
        return 2
    if len(chars) != total:
        print(f"WARN: aligner gave {len(chars)} chars, script has {total}; mapping proportionally.", file=sys.stderr)
        chars = [chars[min(len(chars) - 1, (g * len(chars)) // total)] for g in range(total)]

    lines = []
    g = 0
    for u in units:
        sp = u["spoken"]
        mine = chars[g : g + len(sp)]
        g += len(sp)
        lines.append(
            {
                "text": PAUSE.sub("", DROP_TRAILING.sub("", u["raw"])),
                "start": round(mine[0][0], 3),
                "end": round(mine[-1][1], 3),
                "words": [{"word": ch, "start": round(s, 3), "end": round(e, 3)} for ch, (s, e) in zip(sp, mine)],
            }
        )
    dur = audio_duration(Path(a.audio)) or (lines[-1]["end"] + 0.5)
    Path(a.out).write_text(json.dumps({"duration": round(dur, 3), "lines": lines}, ensure_ascii=False, indent=1), encoding="utf-8")
    print(f"OK: {len(lines)} lines, {total} chars, {dur:.2f} s -> {a.out}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
