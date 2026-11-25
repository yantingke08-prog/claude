"""Pixel scan for QA frames (see sanzhong-qa.mjs). Needs numpy + ImageMagick (`magick`) on PATH.
usage: python scripts/sanzhong_qa.py <dir> <fps> <scale> <every>
"""
import re
import subprocess
import sys
from pathlib import Path

import numpy as np

W, H = 1080, 1920
SAFE = {"top": 110, "bottom": 260, "side": 64}


def load(p: Path, w: int, h: int) -> np.ndarray:
    raw = subprocess.run(["magick", str(p), "-background", "black", "-flatten", "-depth", "8", "rgb:-"], capture_output=True, check=True).stdout
    return np.frombuffer(raw, dtype=np.uint8).reshape(h, w, 3)


def main() -> int:
    d, fps, scale = Path(sys.argv[1]), float(sys.argv[2]), float(sys.argv[3])
    every = int(sys.argv[4]) if len(sys.argv) > 4 else 1
    w, h = round(W * scale), round(H * scale)
    side, top, bot = SAFE["side"] * scale, SAFE["top"] * scale, (H - SAFE["bottom"]) * scale
    problems: list[tuple[float, str]] = []
    files = sorted(d.glob("*.png"))
    for f in files:
        m = re.search(r"(\d+)\.png$", f.name)
        frame = (int(m.group(1)) if m else -1) * every  # files are numbered by output index
        img = load(f, w, h)
        r = img[:, :, 0].astype(int)
        box = r > 60
        over = r > 165  # two 50 % layers
        ys, xs = np.nonzero(box)
        if xs.size:
            out = (xs < side - 1) | (xs > w - side + 1) | (ys < top - 1) | (ys > bot + 1)
            if out.sum() > 4:
                oy, ox = ys[out], xs[out]
                problems.append((frame / fps, f"outside safe area x {ox.min() / scale:.0f}-{ox.max() / scale:.0f}, y {oy.min() / scale:.0f}-{oy.max() / scale:.0f}"))
        n_over = int(over.sum())
        if n_over > 12:
            oy, ox = np.nonzero(over)
            problems.append((frame / fps, f"overlap around x {ox.mean() / scale:.0f}, y {oy.mean() / scale:.0f}"))
    print(f"[sz:qa] scanned {len(files)} frames")
    if problems:
        # merge runs of the same kind of problem
        runs: list[list] = []
        step = every / fps
        for t, msg in problems:
            kind = msg.split(" ")[0]
            if runs and runs[-1][2] == kind and t - runs[-1][1] <= step * 1.5 + 1e-6:
                runs[-1][1] = t
                runs[-1][3] = msg
            else:
                runs.append([t, t, kind, msg])
        print(f"[sz:qa] {len(problems)} problem frame(s) in {len(runs)} run(s):")
        for a, b, _, msg in runs:
            print(f"- {a:6.2f}-{b:6.2f} s  {msg}")
        return 1
    print("[sz:qa] OK: no overlapping labels, all text inside the safe area")
    return 0


if __name__ == "__main__":
    sys.exit(main())
