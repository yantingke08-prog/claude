"""
Voice-over for the v2 false-breakout short (studio/src/fakeout).

One edge-tts request per line (cached by text+voice+rate+pitch), silence-trimmed, laid end to end
with the script's gaps. Writes:
  public/fakeout/vo.wav          the dry voice track (48 kHz mono)
  src/fakeout/timeline.json      line / section frame ranges + caption chunks timed from word boundaries
"""
import asyncio
import hashlib
import json
import re
import shutil
import subprocess
from pathlib import Path

import edge_tts
import numpy as np

ROOT = Path(__file__).resolve().parent.parent
FFMPEG = Path(shutil.which("ffmpeg") or Path.home() / "AppData/Local/Microsoft/WinGet/Links/ffmpeg.exe")  # full build (needs loudnorm / ebur128)
SR = 48000
SCRIPT = json.loads((ROOT / "src/fakeout/script.json").read_text(encoding="utf-8"))
CACHE = ROOT / "public/fakeout/vo"
CACHE.mkdir(parents=True, exist_ok=True)
MAX_CHUNK = 13  # display characters per caption chunk (vertical frame)


async def tts(text: str, path: Path, marks: Path):
    com = edge_tts.Communicate(text, SCRIPT["voice"], rate=SCRIPT["rate"], pitch=SCRIPT["pitch"], boundary="WordBoundary")
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


def chunks_for(text: str):
    """Split a line at punctuation, then hard-split anything still too long."""
    parts = [p for p in re.split(r"(?<=[，。；：？！])", text) if p.strip()]
    out = []
    for p in parts:
        while len(visible(p)) > MAX_CHUNK:
            cut = MAX_CHUNK
            out.append(p[:cut])
            p = p[cut:]
        out.append(p)
    return out


async def main():
    fps = SCRIPT["fps"]
    t = SCRIPT["lead"]
    voice = [np.zeros(int(t * SR), np.float32)]
    lines, sections, captions = [], [], []
    for sec in SCRIPT["sections"]:
        s0 = t
        for ln in sec["lines"]:
            key = hashlib.sha1(f'{ln["text"]}|{SCRIPT["voice"]}|{SCRIPT["rate"]}|{SCRIPT["pitch"]}'.encode()).hexdigest()[:12]
            mp3, marks = CACHE / f"{ln['id']}-{key}.mp3", CACHE / f"{ln['id']}-{key}.json"
            if not mp3.exists():
                await tts(ln["text"], mp3, marks)
            audio, cut = trim(decode(mp3))
            words = json.loads(marks.read_text(encoding="utf-8"))
            dur = len(audio) / SR
            lines.append({"id": ln["id"], "section": sec["id"], "text": ln["text"], "from": round(t * fps), "to": round((t + dur) * fps)})
            # caption chunks: walk word boundaries, assigning each chunk the time of its first word
            # locate every boundary word in the line text once: (char offset, time)
            located, acc = [], 0
            for w in words:
                idx = ln["text"].find(w["w"], acc)
                if idx >= 0:
                    located.append((idx, w["t"] - cut))
                    acc = idx + len(w["w"])
            chunk_list = chunks_for(ln["text"])
            starts, pos = [], 0
            for c in chunk_list:
                later = [tt for idx, tt in located if idx >= pos]
                starts.append(max(0.0, later[0]) if later else dur)
                pos += len(c)
            starts[0] = 0.0
            for i, c in enumerate(chunk_list):
                a = t + starts[i]
                b = t + (starts[i + 1] if i + 1 < len(chunk_list) else dur + 0.15)
                captions.append({"line": ln["id"], "text": c.rstrip("，。；："), "from": round(a * fps), "to": round(b * fps)})
            voice.append(audio)
            t += dur
            gap = ln["gap"]
            voice.append(np.zeros(int(gap * SR), np.float32))
            t += gap
        sections.append({"id": sec["id"], "from": round(s0 * fps), "to": round(t * fps)})
    # a chunk never overlaps the next one
    for a_, b_ in zip(captions, captions[1:]):
        a_["to"] = min(a_["to"], b_["from"])
    t += SCRIPT["tail"]
    voice.append(np.zeros(int(SCRIPT["tail"] * SR), np.float32))
    y = np.concatenate(voice)
    frames = round(t * fps)
    y = np.pad(y, (0, max(0, int(frames / fps * SR) - len(y))))[: int(frames / fps * SR)]
    subprocess.run([str(FFMPEG), "-v", "error", "-y", "-f", "f32le", "-ar", str(SR), "-ac", "1", "-i", "-", str(ROOT / "public/fakeout/vo.wav")], input=y.astype(np.float32).tobytes(), check=True)
    tl = {"fps": fps, "frames": frames, "seconds": round(frames / fps, 2), "sections": sections, "lines": lines, "captions": captions}
    (ROOT / "src/fakeout/timeline.json").write_text(json.dumps(tl, ensure_ascii=False, indent=1), encoding="utf-8")
    han = sum(len(re.findall(r"[一-鿿]", l["text"])) for l in lines)
    print(f"{len(lines)} lines, {han} hanzi, {frames / fps:.2f}s = {frames} frames")
    for s in sections:
        print(f'  {s["id"]:10s} {s["from"] / fps:6.2f}s - {s["to"] / fps:6.2f}s')


asyncio.run(main())
