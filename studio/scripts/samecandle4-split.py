"""
v4 voice = v1/v3 voice with one pause made longer, so the "三件事" overview can be its own page.

Line w3 ("它不告诉你接下来会怎样。真正决定后面的，是三件事。") is split at the full stop into w3a and w3b,
and INSERT frames of silence go into the existing pause between them (at frame AT, where the track is
already silent). Every later line, word mark, caption and section shifts by INSERT. Nothing is re-voiced.

Reads  src/samecandle3/timeline.json + public/samecandle3/vo.wav (v3 = v1 audio)
Writes src/samecandle4/timeline.json + public/samecandle4/vo.wav
"""
import json
import os
import shutil
import subprocess
from pathlib import Path

import numpy as np

ROOT = Path(__file__).resolve().parent.parent
FFMPEG = os.environ.get("FFMPEG") or shutil.which("ffmpeg") or str(Path.home() / "AppData/Local/Microsoft/WinGet/Links/ffmpeg.exe")
SR = 48000
AT = 424  # inside the silence 415–433 between the two sentences
INSERT = 24
SPLIT_CHAR = 12  # w3 char index where the second sentence starts

tl = json.loads((ROOT / "src/samecandle3/timeline.json").read_text(encoding="utf-8"))
fps = tl["fps"]
sh = lambda f: f + INSERT if f >= AT else f

lines = []
for l in tl["lines"]:
    if l["id"] != "w3":
        lines.append({**l, "from": sh(l["from"]), "to": sh(l["to"]), "marks": [[i, sh(m)] for i, m in l["marks"]]})
        continue
    a_marks = [[i, m] for i, m in l["marks"] if i < SPLIT_CHAR]
    b_marks = [[i - SPLIT_CHAR, sh(m)] for i, m in l["marks"] if i >= SPLIT_CHAR]
    lines.append({"id": "w3a", "section": "why", "text": l["text"][:SPLIT_CHAR], "from": l["from"], "to": 416, "marks": a_marks})
    lines.append({"id": "w3b", "section": "three", "text": l["text"][SPLIT_CHAR:], "from": b_marks[0][1], "to": sh(l["to"]), "marks": b_marks})

caps = []
for c in tl["captions"]:
    if c["line"] == "w3":
        line = "w3a" if c["from"] < AT else "w3b"
        to = 416 if line == "w3a" and c["to"] > AT else sh(c["to"])
        caps.append({**c, "line": line, "from": sh(c["from"]), "to": to})
    else:
        caps.append({**c, "from": sh(c["from"]), "to": sh(c["to"])})

secs = []
for s in tl["sections"]:
    if s["id"] == "why":
        secs.append({"id": "why", "from": s["from"], "to": AT})
        secs.append({"id": "three", "from": AT, "to": sh(s["to"])})
    else:
        secs.append({**s, "from": sh(s["from"]), "to": sh(s["to"])})

frames = tl["frames"] + INSERT
out = {"fps": fps, "frames": frames, "seconds": round(frames / fps, 2), "sections": secs, "lines": lines, "captions": caps}
(ROOT / "src/samecandle4/timeline.json").write_text(json.dumps(out, ensure_ascii=False, indent=1), encoding="utf-8")

raw = subprocess.run([FFMPEG, "-v", "error", "-i", str(ROOT / "public/samecandle3/vo.wav"), "-ac", "1", "-ar", str(SR), "-f", "f32le", "-"], capture_output=True, check=True).stdout
x = np.frombuffer(raw, np.float32)
cut = int(AT / fps * SR)
assert np.abs(x[cut - 2400 : cut + 2400]).max() < 0.002, "insertion point is not silent"
y = np.concatenate([x[:cut], np.zeros(int(INSERT / fps * SR), np.float32), x[cut:]])
y = np.pad(y, (0, max(0, int(frames / fps * SR) - len(y))))[: int(frames / fps * SR)]
(ROOT / "public/samecandle4").mkdir(parents=True, exist_ok=True)
subprocess.run([FFMPEG, "-v", "error", "-y", "-f", "f32le", "-ar", str(SR), "-ac", "1", "-i", "-", str(ROOT / "public/samecandle4/vo.wav")], input=y.tobytes(), check=True)
print(f"{len(lines)} lines, {frames} frames = {frames / fps:.2f}s; w3 split, +{INSERT} frames at {AT}")
