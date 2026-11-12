"""
Frame-to-frame motion check for 《同一根大阳线》 v3.

Input: a PNG sequence of the whole film (npm run sc3:seq renders it at 1/4 scale into out/sc3seq) and
out/sc3-changes.json (npm run sc3:timing: every frame where the picture is *scheduled* to change and why).
For every pair of consecutive frames it measures the pixel difference (any change at all = displacement).
Rules:
  - a frame with nothing scheduled must be pixel-identical to the previous one (displacement 0);
  - every changed frame must have a scheduled reason (no unexplained motion).
Writes outputs-samecandle-v3/motion-report.md; exits 1 if a rule fails.
"""
import json
import os
import shutil
import subprocess
import sys
from pathlib import Path

import numpy as np

ROOT = Path(__file__).resolve().parent.parent
SEQ = Path(sys.argv[1]) if len(sys.argv) > 1 else ROOT / "out/sc3seq"
FFMPEG = os.environ.get("FFMPEG") or shutil.which("ffmpeg") or str(Path.home() / "AppData/Local/Microsoft/WinGet/Links/ffmpeg.exe")
CH = json.loads((ROOT / "out/sc3-changes.json").read_text(encoding="utf-8"))
N = CH["frames"]
change = {int(k): v for k, v in CH["change"].items()}

files = sorted(SEQ.glob("*.png"))
assert len(files) == N, f"expected {N} frames in {SEQ}, found {len(files)}"
probe = subprocess.run([FFMPEG, "-v", "error", "-i", str(files[0]), "-f", "rawvideo", "-pix_fmt", "rgb24", "-"], capture_output=True, check=True).stdout
pat = files[0].name
digits = len(pat.split(".")[-2].split("-")[-1]) if "-" in pat else 0
prefix = pat[: pat.rfind(pat.split(".")[-2][-digits:])] if digits else pat
# size from the first frame header
info = subprocess.run([FFMPEG, "-v", "error", "-i", str(files[0]), "-f", "null", "-"], capture_output=True, text=True)
w = h = None
r = subprocess.run([FFMPEG, "-hide_banner", "-i", str(files[0])], capture_output=True, text=True).stderr
for tok in r.replace(",", " ").split():
    if "x" in tok and tok.split("x")[0].isdigit() and tok.split("x")[1].isdigit():
        w, h = map(int, tok.split("x"))
        break
assert w and h and len(probe) == w * h * 3, (w, h, len(probe))

raw = subprocess.run([FFMPEG, "-v", "error", "-start_number", "0", "-i", str(SEQ / f"{prefix}%0{digits}d.png"), "-f", "rawvideo", "-pix_fmt", "rgb24", "-"], capture_output=True, check=True).stdout
frames = np.frombuffer(raw, np.uint8).reshape(-1, h, w, 3)
assert len(frames) == N, len(frames)

diff = np.zeros(N)
area = np.zeros(N)
for f in range(1, N):
    d = np.abs(frames[f].astype(np.int16) - frames[f - 1].astype(np.int16)).max(axis=2)
    diff[f] = d.max()
    area[f] = (d > 0).mean() * 100

static_bad = [f for f in range(1, N) if f not in change and diff[f] > 0]
unexplained = static_bad
scheduled = [f for f in range(1, N) if f in change]
moving = [f for f in range(1, N) if diff[f] > 0]

# static runs (frames with zero displacement), longest first
runs, start = [], None
for f in range(1, N + 1):
    still = f < N and diff[f] == 0
    if still and start is None:
        start = f
    if not still and start is not None:
        runs.append((start, f - 1))
        start = None
still_frames = sum(b - a + 1 for a, b in runs)

out = ["# 《同一根大阳线》v3 frame-to-frame motion report", ""]
out.append(f"Source: full PNG sequence of the film at 1/4 scale ({w}×{h}, {N} frames, `npm run sc3:seq`), compared pixel by pixel with the previous frame. Any non-zero difference counts as displacement.")
out.append("")
out.append("| measure | value |")
out.append("|---|---|")
out.append(f"| frames compared | {N - 1} |")
out.append(f"| frames identical to the previous one (displacement 0) | {still_frames} ({still_frames / (N - 1) * 100:.1f} %) |")
out.append(f"| frames with any change | {len(moving)} |")
out.append(f"| frames scheduled to change (draw-ins, bar growth, captions, cuts, 3D opening) | {len(scheduled)} |")
out.append(f"| **changed frames with nothing scheduled (unexplained motion)** | **{len(unexplained)}** |")
out.append("")
out.append("Rule: a frame where nothing is scheduled must be identical to the previous frame. " + ("**Pass ✓** — every still stretch has displacement 0; all motion is a scheduled annotation, bar, caption or cut." if not unexplained else f"**Fail ✗** — frames {unexplained[:40]}"))
out.append("")
out.append("## Longest still stretches (displacement 0)")
out.append("")
out.append("| frames | seconds |")
out.append("|---|---|")
for a, b in sorted(runs, key=lambda x: x[0] - x[1])[:15]:
    out.append(f"| {a}–{b} | {(b - a + 1) / 30:.2f} |")
out.append("")
out.append("## Every changed frame and its scheduled cause")
out.append("")
out.append("| frame | changed pixels (%) | cause |")
out.append("|---|---|---|")
for f in moving:
    out.append(f"| {f} | {area[f]:.2f} | {', '.join(sorted(set(change.get(f, ['UNEXPLAINED']))))[:120]} |")
(ROOT.parent / "outputs-samecandle-v3/motion-report.md").write_text("\n".join(out) + "\n", encoding="utf-8")
print(f"{still_frames}/{N - 1} frames still, {len(moving)} changed, {len(unexplained)} unexplained")
if unexplained:
    print("unexplained:", unexplained[:60])
sys.exit(1 if unexplained else 0)
