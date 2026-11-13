"""SRT sidecar for 《同一根大阳线》 from src/samecandle4/timeline.json (captions are also burned into the picture)."""
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
TL = json.loads((ROOT / "src/samecandle4/timeline.json").read_text(encoding="utf-8"))
out = Path(sys.argv[1]) if len(sys.argv) > 1 else ROOT.parent / "outputs-samecandle-v4/subtitles.srt"
fps = TL["fps"]


def ts(f):
    ms = round(f / fps * 1000)
    return f"{ms // 3600000:02d}:{ms // 60000 % 60:02d}:{ms // 1000 % 60:02d},{ms % 1000:03d}"


rows = [f"{i}\n{ts(c['from'])} --> {ts(c['to'])}\n{c['text']}\n" for i, c in enumerate(TL["captions"], 1)]
out.parent.mkdir(parents=True, exist_ok=True)
out.write_text("\n".join(rows), encoding="utf-8")
print(f"{len(rows)} cues -> {out}")
