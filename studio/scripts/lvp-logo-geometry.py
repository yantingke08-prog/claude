"""Extract animatable geometry from the L.V.P. brand SVGs into src/lvp/logo.json.

The symbol SVG is one big compound outline plus 1136 tiny dots. For animation we need its
parts separately: the outline paths (drawn whole via Path2D / SVGLoader), the dot mesh
(liquidity particles) and the bead chain (trade bubbles). Beads are not separate paths -
they are islands inside the outline - so we find them on a raster: erode the mask so the
thin connecting line breaks, then keep the round connected components.

Run from studio/:  python scripts/lvp-logo-geometry.py   (needs ImageMagick `magick` on PATH)
"""
import json
import re
import subprocess
import tempfile
from pathlib import Path

import numpy as np
from scipy import ndimage as nd

ROOT = Path(__file__).resolve().parent.parent
SYMBOL = ROOT / "public/SVGLOGO/gold.svg"
LOCKUP = ROOT / "public/SVGLOGO/LOGO-横版-单色金-黑背景.svg"
OUT = ROOT / "src/lvp/logo.json"
NUM = re.compile(r"-?\d*\.?\d+(?:e-?\d+)?")


def paths(svg: Path) -> list[str]:
    return re.findall(r'<path[^>]* d="([^"]+)"', svg.read_text(encoding="utf-8"))


def bbox(d: str) -> tuple[float, float, float, float]:
    # Figma exports absolute M/L/H/V/C/Z only; H and V carry a single coordinate.
    xs, ys = [], []
    for cmd, args in re.findall(r"([MLHVCZ])([^MLHVCZ]*)", d):
        n = [float(v) for v in NUM.findall(args)]
        if cmd == "H":
            xs += n
        elif cmd == "V":
            ys += n
        else:
            xs += n[0::2]
            ys += n[1::2]
    return min(xs), min(ys), max(xs), max(ys)


def beads(svg: Path, px: int = 2000, erode: int = 5) -> list[list[float]]:
    with tempfile.TemporaryDirectory() as tmp:
        raw = Path(tmp) / "mask.raw"
        density = 96 * px / 1000  # ImageMagick maps 1 SVG unit to 1px at 96 dpi
        subprocess.run(["magick", "-density", str(density), str(svg), "-colorspace", "gray", "-depth", "8", f"gray:{raw}"], check=True)
        mask = np.fromfile(raw, dtype=np.uint8).reshape(px, px) > 100
    er = nd.binary_erosion(mask, structure=nd.generate_binary_structure(2, 1), iterations=erode)
    lab, n = nd.label(er)
    idx = range(1, n + 1)
    sizes, coms, boxes = nd.sum(er, lab, idx), nd.center_of_mass(er, lab, idx), nd.find_objects(lab)
    k = 1000 / px
    out = []
    for size, (cy, cx), box in zip(sizes, coms, boxes):
        h, w = box[0].stop - box[0].start, box[1].stop - box[1].start
        r = (np.sqrt(size / np.pi) + erode) * k
        # round (fill ~ pi/4), not the body, not a sliver
        if size < 40000 and size / (w * h) > 0.7 and 0.8 < w / h < 1.25 and r >= 4:
            out.append([round(cx * k, 1), round(cy * k, 1), round(r, 1)])
    return sorted(out)


def main() -> None:
    sym = paths(SYMBOL)
    outline = [d for d in sym if (lambda b: b[2] - b[0] >= 6)(bbox(d))]
    dots = []
    for d in sym:
        x0, y0, x1, y1 = bbox(d)
        if x1 - x0 < 6:
            dots.append([round((x0 + x1) / 2, 1), round((y0 + y1) / 2, 1), round((x1 - x0 + y1 - y0) / 4, 2)])

    # Wordmark: lockup paths right of the symbol, re-based to their own bbox.
    lock = [d for d in paths(LOCKUP) if bbox(d)[0] > 1450]
    bx = [bbox(d) for d in lock]
    wx0, wy0 = min(b[0] for b in bx), min(b[1] for b in bx)
    wx1, wy1 = max(b[2] for b in bx), max(b[3] for b in bx)

    ob = [bbox(d) for d in outline]
    sx0, sy0 = min(b[0] for b in ob), min(b[1] for b in ob)
    sx1, sy1 = max(b[2] for b in ob), max(b[3] for b in ob)
    bead_list = beads(SYMBOL)
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(
        json.dumps(
            {
                "symbol": {"box": [round(sx0, 2), round(sy0, 2), round(sx1 - sx0, 2), round(sy1 - sy0, 2)], "outline": outline, "dots": dots, "beads": bead_list},
                "wordmark": {"box": [round(wx0, 2), round(wy0, 2), round(wx1 - wx0, 2), round(wy1 - wy0, 2)], "paths": lock},
            },
            separators=(",", ":"),
        ),
        encoding="utf-8",
    )
    print(f"outline {len(outline)}, dots {len(dots)}, beads {len(bead_list)}, wordmark paths {len(lock)} -> {OUT}")


if __name__ == "__main__":
    main()
