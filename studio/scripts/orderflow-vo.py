"""
Voice-over for 《三根阳线，你会追吗？订单流确认》 (studio/src/orderflow).

One edge-tts request per line (cached by text+voice+rate+pitch), silence-trimmed, laid end to end with the
script's gaps. Writes:
  public/orderflow/vo.wav         dry voice track (48 kHz mono)
  src/orderflow/timeline.json     line / section frame ranges, word marks [char index, frame], caption chunks
"""
import asyncio
import hashlib
import json
import os
import re
import shutil
import subprocess
from pathlib import Path

import edge_tts
import numpy as np

ROOT = Path(__file__).resolve().parent.parent
FFMPEG = Path(os.environ.get("FFMPEG") or shutil.which("ffmpeg") or Path.home() / "AppData/Local/Microsoft/WinGet/Links/ffmpeg.exe")
SR = 48000
SCRIPT = json.loads((ROOT / "src/orderflow/script.json").read_text(encoding="utf-8"))
OUT = ROOT / "public/orderflow"
CACHE = OUT / "vo"
CACHE.mkdir(parents=True, exist_ok=True)
MAX_CHUNK = 15  # hanzi-widths per caption line (54 px); Latin letters count ~0.55


async def tts(text: str, path: Path, marks: Path, rate: str):
    com = edge_tts.Communicate(text, SCRIPT["voice"], rate=rate, pitch=SCRIPT["pitch"], boundary="WordBoundary")
    words = []
    with open(path, "wb") as f:
        async for chunk in com.stream():
            if chunk["type"] == "audio":
                f.write(chunk["data"])
            elif chunk["type"] == "WordBoundary":
                words.append({"t": chunk["offset"] / 1e7, "d": chunk["duration"] / 1e7, "w": chunk["text"]})
    marks.write_text(json.dumps(words, ensure_ascii=False), encoding="utf-8")


def decode(path: Path) -> np.ndarray:
    raw = subprocess.run([str(FFMPEG), "-v", "error", "-i", str(path), "-ac", "1", "-ar", str(SR), "-f", "f32le", "-"], capture_output=True, check=True).stdout
    return np.frombuffer(raw, dtype=np.float32).copy()


def trim(x: np.ndarray, thr=0.006):
    loud = np.where(np.abs(x) > thr)[0]
    a = max(0, loud[0] - int(0.02 * SR))
    b = min(len(x), loud[-1] + int(0.06 * SR))
    return x[a:b], a / SR


def visible(s: str) -> str:
    return re.sub(r"[，。；：？！、]", "", s)


def wlen(s: str) -> float:
    """display width in hanzi units (Latin letters/digits are about half as wide)"""
    return sum(0.55 if ord(ch) < 128 else 1.0 for ch in visible(s))


def chunks_for(text: str):
    """Caption chunks: split at clause punctuation (incl. 、), re-merge 、-pieces up to MAX_CHUNK, and split any
    over-long piece into equal halves (never strands a single character)."""
    parts = [p for p in re.split(r"(?<=[，。；：？！])", text) if p.strip()]
    out = []
    for p in parts:
        sub = [q for q in re.split(r"(?<=、)", p) if q]
        cur = ""
        for q in sub:
            if cur and wlen(cur + q) > MAX_CHUNK:
                out.append(cur)
                cur = ""
            cur += q
        n = wlen(cur)
        if n > MAX_CHUNK:
            # split near the middle, never inside a Latin word
            k = int(-(-n // MAX_CHUNK))
            cuts, acc, target = [], 0.0, n / k
            for i, ch in enumerate(cur):
                acc += 0.55 if ord(ch) < 128 else 1.0
                nxt = cur[i + 1] if i + 1 < len(cur) else ""
                if acc >= target * (len(cuts) + 1) and not (ch.isascii() and ch.isalnum() and nxt.isascii() and nxt.isalnum()) and len(cuts) < k - 1:
                    cuts.append(i + 1)
            b = [0] + cuts + [len(cur)]
            out += [cur[b[j] : b[j + 1]] for j in range(len(b) - 1)]
        else:
            out.append(cur)
    return out


async def main():
    fps = SCRIPT["fps"]
    t = SCRIPT["lead"]
    voice = [np.zeros(int(t * SR), np.float32)]
    lines, sections, captions = [], [], []
    for sec in SCRIPT["sections"]:
        s0 = t
        rate = sec.get("rate", SCRIPT["rate"])  # per-section pace (v2: brisker opening chapters)
        for ln in sec["lines"]:
            key = hashlib.sha1(f'{ln["text"]}|{SCRIPT["voice"]}|{rate}|{SCRIPT["pitch"]}'.encode()).hexdigest()[:12]
            mp3, marks = CACHE / f"{ln['id']}-{key}.mp3", CACHE / f"{ln['id']}-{key}.json"
            if not mp3.exists():
                await tts(ln["text"], mp3, marks, rate)
            audio, cut = trim(decode(mp3))
            words = json.loads(marks.read_text(encoding="utf-8"))
            dur = len(audio) / SR
            located, acc = [], 0
            for w in words:
                idx = ln["text"].find(w["w"], acc)
                if idx >= 0:
                    located.append((idx, max(0.0, w["t"] - cut)))
                    acc = idx + len(w["w"])
            lines.append({"id": ln["id"], "section": sec["id"], "text": ln["text"], "en": ln["en"], "from": round(t * fps), "to": round((t + dur) * fps), "marks": [[idx, round((t + tt) * fps)] for idx, tt in located]})
            chunk_list = chunks_for(ln["text"])
            starts, pos = [], 0
            for c in chunk_list:
                later = [tt for idx, tt in located if idx >= pos]
                starts.append(later[0] if later else dur)
                pos += len(c)
            starts[0] = 0.0
            for i, c in enumerate(chunk_list):
                a = t + starts[i]
                b = t + (starts[i + 1] if i + 1 < len(chunk_list) else dur + 0.2)
                captions.append({"line": ln["id"], "text": c.rstrip("，。；："), "en": ln["en"], "from": round(a * fps), "to": round(b * fps)})
            voice.append(audio)
            t += dur
            voice.append(np.zeros(int(ln["gap"] * SR), np.float32))
            t += ln["gap"]
        sections.append({"id": sec["id"], "from": round(s0 * fps), "to": round(t * fps)})
    for a_, b_ in zip(captions, captions[1:]):
        a_["to"] = min(a_["to"], b_["from"])
    t += SCRIPT["tail"]
    voice.append(np.zeros(int(SCRIPT["tail"] * SR), np.float32))
    y = np.concatenate(voice)
    frames = round(t * fps)
    y = np.pad(y, (0, max(0, int(frames / fps * SR) - len(y))))[: int(frames / fps * SR)]
    subprocess.run([str(FFMPEG), "-v", "error", "-y", "-f", "f32le", "-ar", str(SR), "-ac", "1", "-i", "-", str(OUT / "vo.wav")], input=y.astype(np.float32).tobytes(), check=True)
    tl = {"fps": fps, "frames": frames, "seconds": round(frames / fps, 2), "sections": sections, "lines": lines, "captions": captions}
    (ROOT / "src/orderflow/timeline.json").write_text(json.dumps(tl, ensure_ascii=False, indent=1), encoding="utf-8")
    han = sum(len(re.findall(r"[一-鿿]", l["text"])) for l in lines)
    print(f"{len(lines)} lines, {han} hanzi, {frames / fps:.2f}s = {frames} frames")
    for s in sections:
        print(f'  {s["id"]:6s} {s["from"] / fps:6.2f}s - {s["to"] / fps:6.2f}s')


asyncio.run(main())
