#!/usr/bin/env python3
r"""Offline fonts for 《价值区怎么用？只看3个数》: subsets Noto Sans SC / Noto Serif SC (SIL OFL 1.1) to exactly the
glyphs the film can show (valuearea-script.txt + src/valuearea/text.ts + ASCII) and writes small woff2 files to
public/valuearea/fonts/. The film loads them with FontFace from staticFile(): no network at render time.

  python scripts/valuearea-fonts.py            (= npm run va:fonts; rerun after changing on-screen text)

Sources: VA_SANS / VA_SERIF env paths, else the variable Noto SC fonts Windows ships in C:\Windows\Fonts
(or the per-user font folder). Needs  pip install fonttools brotli
"""
import os
import sys
from pathlib import Path

from fontTools import subset

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "public" / "valuearea" / "fonts"
CANDS = {
    "sans": [os.environ.get("VA_SANS"), r"C:\Windows\Fonts\NotoSansSC-VF.ttf", os.path.expandvars(r"%LOCALAPPDATA%\Microsoft\Windows\Fonts\NotoSansSC-VF.ttf"), "/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc"],
    "serif": [os.environ.get("VA_SERIF"), r"C:\Windows\Fonts\NotoSerifSC-VF.ttf", os.path.expandvars(r"%LOCALAPPDATA%\Microsoft\Windows\Fonts\NotoSerifSC-VF.ttf")],
}


def glyphs():
    txt = (ROOT.parent / "valuearea-script.txt").read_text(encoding="utf-8")
    txt += (ROOT / "src" / "valuearea" / "text.ts").read_text(encoding="utf-8")
    cs = {c for c in txt if ord(c) > 127 and not c.isspace()}
    cs |= {chr(i) for i in range(32, 127)}
    return "".join(sorted(cs))


def main():
    sys.stdout.reconfigure(encoding="utf-8")
    OUT.mkdir(parents=True, exist_ok=True)
    text = glyphs()
    for name, cands in CANDS.items():
        src = next((p for p in cands if p and Path(p).exists()), None)
        if not src:
            print(f"{name}: no source font found (set VA_{name.upper()}=path); the film falls back to system fonts")
            continue
        out = OUT / f"valuearea-{name}.woff2"
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
        head = f"Subset of {Path(src).name} made by scripts/valuearea-fonts.py"
        (OUT / f"valuearea-{name}.LICENSE.txt").write_text(f"{head}\n\n{notice}\n", encoding="utf-8")
        print(f"{name}: {Path(src).name} -> {out.relative_to(ROOT)} ({len(text)} glyphs, {out.stat().st_size // 1024} KB)")


if __name__ == "__main__":
    main()
