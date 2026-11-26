#!/usr/bin/env python3
"""Offline font subsets for the POC film -> public/poc/fonts/*.woff2 (committed; rendering needs no network).

Collects every character the film can show (all strings in src/poc/*.ts(x), script.json, timeline.json captions,
plus printable ASCII and a few symbols) and cuts glyph subsets from three SIL OFL 1.1 fonts:
  Noto Sans SC (variable, wght 100-900)   -> poc-sans.woff2   body, tags, captions
  Noto Serif SC (variable, wght 200-900)  -> poc-serif.woff2  titles, questions
  Cascadia Mono (variable)                -> poc-mono.woff2   prices, volumes, Delta
Sources: the font files in C:/Windows/Fonts (or pass --dir); any copy of the same OFL fonts works
(https://github.com/notofonts/noto-cjk, https://github.com/microsoft/cascadia-code).
Only needed again when the film's text changes. Needs: pip install fonttools brotli
"""
import re
import sys
from pathlib import Path

from fontTools import subset

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "src" / "poc"
OUT = ROOT / "public" / "poc" / "fonts"
args = sys.argv[1:]
FONT_DIR = Path(args[args.index("--dir") + 1]) if "--dir" in args else Path("C:/Windows/Fonts")
FONTS = {
    "poc-sans": "NotoSansSC-VF.ttf",
    "poc-serif": "NotoSerifSC-VF.ttf",
    "poc-mono": "CascadiaMono.ttf",
}

chars = set(chr(c) for c in range(0x20, 0x7F))
chars |= set("·→←↑↓−×–—…，。？！；：、“”（）《》①②③↻%+")
for p in list(SRC.glob("*.ts")) + list(SRC.glob("*.tsx")) + list(SRC.glob("*.json")):
    txt = p.read_text(encoding="utf-8")
    chars |= set(c for c in txt if ord(c) > 0x7F)
chars = sorted(c for c in chars if not c.isspace() or c == " ")
text = "".join(chars)
print(f"{len(chars)} characters")
OUT.mkdir(parents=True, exist_ok=True)
for name, file in FONTS.items():
    src = FONT_DIR / file
    if not src.exists():
        raise SystemExit(f"missing {src}: pass --dir <folder with {file}>")
    opts = subset.Options()
    opts.flavor = "woff2"
    opts.layout_features = ["*"]
    opts.name_IDs = ["*"]
    opts.notdef_outline = True
    opts.hinting = False
    f = subset.load_font(str(src), opts)
    s = subset.Subsetter(opts)
    s.populate(text=text)
    s.subset(f)
    out = OUT / f"{name}.woff2"
    subset.save_font(f, str(out), opts)
    print(f"{out.name}: {out.stat().st_size / 1024:.0f} KB from {file}")
