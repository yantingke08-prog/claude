#!/usr/bin/env python3
r"""Offline fonts for 《主流交易流派排行榜》.

Subsets Noto Sans SC / Noto Serif SC (SIL OFL 1.1) to exactly the glyphs the film shows (every
string in src/**/*.ts(x) and public/audio/timing.json + ASCII + a few symbols) and writes public/fonts/tsr-{sans,serif}.woff2.
The film loads them with FontFace from staticFile(): no network at render time.

  python scripts/fonts.py        (= npm run fonts; rerun after changing on-screen text)

Sources: TSR_SANS / TSR_SERIF env paths, else the variable Noto SC fonts Windows ships in C:\Windows\Fonts.
Needs: pip install fonttools brotli
"""
import os
import sys
from pathlib import Path

from fontTools import subset

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "public" / "fonts"
CANDS = {
    "sans": [os.environ.get("TSR_SANS"), r"C:\Windows\Fonts\NotoSansSC-VF.ttf", os.path.expandvars(r"%LOCALAPPDATA%\Microsoft\Windows\Fonts\NotoSansSC-VF.ttf")],
    "serif": [os.environ.get("TSR_SERIF"), r"C:\Windows\Fonts\NotoSerifSC-VF.ttf", os.path.expandvars(r"%LOCALAPPDATA%\Microsoft\Windows\Fonts\NotoSerifSC-VF.ttf")],
}
EXTRA = "≠＝→↑·　，。？！：；✓✕"


def glyphs():
    txt = "".join(p.read_text(encoding="utf-8") for p in sorted((ROOT / "src").rglob("*.ts*"))) + EXTRA
    timing = ROOT / "public" / "audio" / "timing.json"
    if timing.exists():
        txt += timing.read_text(encoding="utf-8")
    cs = {c for c in txt if ord(c) > 127 and not c.isspace()} | {"\u3000"}
    cs |= {chr(i) for i in range(32, 127)}
    return "".join(sorted(cs))


def main():
    sys.stdout.reconfigure(encoding="utf-8")
    OUT.mkdir(parents=True, exist_ok=True)
    text = glyphs()
    for name, cands in CANDS.items():
        src = next((p for p in cands if p and Path(p).exists()), None)
        if not src:
            print(f"{name}: no source font found (set TSR_{name.upper()}=path); the film falls back to system fonts")
            continue
        out = OUT / f"tsr-{name}.woff2"
        opts = subset.Options()
        opts.flavor = "woff2"
        opts.layout_features = ["*"]
        opts.name_IDs = ["*"]
        opts.name_languages = ["*"]
        opts.notdef_outline = True
        font = subset.load_font(src, opts)
        sub = subset.Subsetter(opts)
        sub.populate(text=text)
        sub.subset(font)
        subset.save_font(font, str(out), opts)
        n = font["name"]
        notice = "\n".join(x for x in [n.getDebugName(1), n.getDebugName(0), n.getDebugName(13), n.getDebugName(14)] if x)
        (OUT / f"tsr-{name}.LICENSE.txt").write_text(f"Subset of {Path(src).name} made by scripts/fonts.py\n\n{notice}\n", encoding="utf-8")
        print(f"{name}: {Path(src).name} -> {out.relative_to(ROOT)} ({len(text)} glyphs, {out.stat().st_size // 1024} KB)")


if __name__ == "__main__":
    main()
