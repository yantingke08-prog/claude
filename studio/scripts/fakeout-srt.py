"""SRT for the v2 short, one cue per caption chunk (same timing as the burned-in captions)."""
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
TL = json.loads((ROOT / "src/fakeout/timeline.json").read_text(encoding="utf-8"))
fps = TL["fps"]


def ts(f):
    ms = round(f / fps * 1000)
    return f"{ms // 3600000:02d}:{ms // 60000 % 60:02d}:{ms // 1000 % 60:02d},{ms % 1000:03d}"


out = Path(sys.argv[1])
cues = [(c["from"], c["to"], c["text"]) for c in TL["captions"]]
cues.append((TL["frames"] - 60, TL["frames"], "教育内容，不构成投资建议 · 示意图 · 模拟数据"))
out.write_text("\n".join(f"{i}\n{ts(a)} --> {ts(b)}\n{t}\n" for i, (a, b, t) in enumerate(cues, 1)), encoding="utf-8")
print(len(cues), "cues ->", out)
