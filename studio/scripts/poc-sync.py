#!/usr/bin/env python3
"""Voice, timeline, subtitles, music, sound effects and mix for 《POC 怎么用：为什么这条线像磁铁》 (src/poc).

Every caption, animation, camera move and sound cue is keyed to line IDs and to the moment individual words are
spoken. This script decides those moments; the animation code never contains a frame number or a total length.

  python scripts/poc-sync.py tts       per-line edge-tts voice (default rate, no speed-up) -> public/poc/vo.wav + vo.mp3
                                       + src/poc/timeline.json from the TTS word boundaries
  python scripts/poc-sync.py srt [out] subtitles (default ../outputs-poc-v1/poc-magnet-v1.srt)
  python scripts/poc-sync.py bgm       procedural score -> public/poc/bgm.wav + bgm.mp3 (follows the sections)
  python scripts/poc-sync.py sfx       procedural sound effects -> public/poc/sfx/*.wav
  python scripts/poc-sync.py mix       public/poc/mix.wav + mix.mp3 = voice + ducked score + cues, -14 LUFS, <= -1 dBTP
  python scripts/poc-sync.py all       tts + srt + bgm + sfx + mix               (= npm run poc:sync)
  python scripts/poc-sync.py check     every event's time, the word it sits on, and the pause statistics

TTS: edge-tts (pip install edge-tts) speaks each line of script.json once. Clips are cached in studio/poc-audio/tts by
text + voice + pitch (committed to the repo, so a re-run needs no network), trimmed of leading / trailing silence and
laid end to end with the pause each line asks for. Never speeds the voice up and never shortens a pause: the film is as
long as the voice. edge-tts uses Microsoft Edge's online read-aloud service and carries NO commercial licence; for a
commercial release re-voice the same text with a licensed TTS / voice actor and re-run `tts` (or align your recording).
Decoding / encoding uses ffmpeg from PATH, or the ffmpeg that ships with Remotion (node_modules/@remotion/compositor-*).

Needs Python 3 + numpy + scipy (+ edge-tts only when a line is not in the cache yet)
"""
from __future__ import annotations

import hashlib
import json
import math
import os
import subprocess
import sys
from pathlib import Path

import numpy as np

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "src" / "poc"
SCRIPT = SRC / "script.json"
TIMELINE = SRC / "timeline.json"
EVENTS = SRC / "events.json"
PUB = ROOT / "public" / "poc"
VO = PUB / "vo.wav"
BGM = PUB / "bgm.wav"
MIX = PUB / "mix.wav"
SFX_DIR = PUB / "sfx"
CACHE = ROOT / "poc-audio" / "tts"
SRT_DEFAULT = ROOT.parent / "outputs-poc-v1" / "poc-magnet-v1.srt"
SR = 48000

SKIP = set("，。？！；：、“”\"'‘’（）() ")
SENT = "。？！；"
CAP_ROW = 16  # characters per caption row (60 px type in a 1344 px wide safe area)
CAP_MIN = 1.3
CAP_HOLD = 0.3


def load_script():
    return json.loads(SCRIPT.read_text(encoding="utf-8"))


def cw(c: str) -> float:
    if c in SKIP or c.isspace():
        return 0.0
    return 0.4 if c.isascii() else 1.0


def weight(s: str) -> float:
    return sum(cw(c) for c in s)


def gap_after(sc, i):
    L = sc["lines"]
    ln = L[i]
    g = sc["gaps"]
    if "gap" in ln:
        return ln["gap"]
    if ln["text"].rstrip().endswith("？"):
        return g["question"]
    if i + 1 < len(L) and L[i + 1]["section"] != ln["section"]:
        return g["section"]
    return g["line"]


# ------------------------------------------------------------------ timeline assembly
def build(sc, char_times, total_s, source):
    fps = sc["fps"]
    F = lambda t: int(round(t * fps))
    lines = []
    for ln, ct in zip(sc["lines"], char_times):
        ch = [[F(a), max(F(a), F(b))] for a, b in ct]
        idx = [i for i, c in enumerate(ln["text"]) if cw(c) > 0]
        lines.append({"id": ln["id"], "section": ln["section"], "text": ln["text"], "from": ch[idx[0]][0], "to": ch[idx[-1]][1], "ch": ch})
    captions = build_captions(lines, fps)
    frames = max(F(total_s), lines[-1]["to"] + 1)
    secs = []
    for ln in lines:
        if not secs or secs[-1]["id"] != ln["section"]:
            secs.append({"id": ln["section"], "from": ln["from"], "to": None})
    for i, s in enumerate(secs):
        s["to"] = secs[i + 1]["from"] if i + 1 < len(secs) else frames
    secs[0]["from"] = 0
    return {"fps": fps, "width": 1440, "height": 2560, "frames": frames, "seconds": round(frames / fps, 2), "source": source, "sections": secs, "lines": lines, "captions": captions}


def split_semantic(text):
    out, c0 = [], 0
    for i, c in enumerate(text):
        if c in SENT:
            out.append((c0, i + 1))
            c0 = i + 1
    if c0 < len(text):
        out.append((c0, len(text)))
    res = []
    stack = list(reversed(out))
    while stack:
        a, b = stack.pop()
        if weight(text[a:b]) <= CAP_ROW * 2 - 2:
            res.append((a, b))
            continue
        commas = [i for i in range(a, b - 1) if text[i] in "，：、"]
        if not commas:
            res.append((a, b))
            continue
        mid = (a + b) / 2
        k = min(commas, key=lambda i: abs(i - mid))
        stack.extend([(k + 1, b), (a, k + 1)])
    return [(a, b) for a, b in res if weight(text[a:b]) > 0]


def rows_of(s):
    s = s.rstrip("。；，、：")
    if weight(s) <= CAP_ROW:
        return [s]
    commas = [i for i, c in enumerate(s[:-1]) if c in "，：、？；"]
    mid = len(s) / 2
    k = min(commas, key=lambda i: abs(i - mid)) if commas else int(mid) - 1
    return [s[: k + 1].rstrip("，、；："), s[k + 1:]]


def build_captions(lines, fps):
    caps = []
    for l in lines:
        segs = split_semantic(l["text"])
        first = lambda a, b: next(l["ch"][i][0] for i in range(a, b) if cw(l["text"][i]) > 0)
        last = lambda a, b: next(l["ch"][i][1] for i in reversed(range(a, b)) if cw(l["text"][i]) > 0)
        items = [[a, b] for a, b in segs]
        changed = True
        while changed and len(items) > 1:
            changed = False
            for k, (a, b) in enumerate(items):
                if (last(a, b) - first(a, b)) / fps < CAP_MIN * 0.75 and weight(l["text"][a:b]) < CAP_ROW:
                    j = k + 1 if k + 1 < len(items) else k - 1
                    lo, hi = min(k, j), max(k, j)
                    if weight(l["text"][items[lo][0]:items[hi][1]]) <= CAP_ROW * 2:
                        items[lo:hi + 1] = [[items[lo][0], items[hi][1]]]
                        changed = True
                        break
        for a, b in items:
            caps.append({"line": l["id"], "from": first(a, b), "end": last(a, b), "text": l["text"][a:b]})
    out = []
    for k, c in enumerate(caps):
        nxt = caps[k + 1]["from"] if k + 1 < len(caps) else 10**9
        to = max(c["end"] + int(CAP_HOLD * fps), c["from"] + int(CAP_MIN * fps))
        to = min(to, nxt) if nxt >= c["end"] else c["end"]
        to = max(to, c["end"])
        rows = rows_of(c["text"])
        out.append({"line": c["line"], "text": "".join(rows) if len(rows) == 1 else rows[0] + " " + rows[1], "rows": rows, "from": c["from"], "to": to})
    return out


def write_timeline(tl):
    TIMELINE.write_text(json.dumps(tl, ensure_ascii=False, separators=(",", ":")).replace('{"id"', '\n{"id"').replace('{"line"', '\n{"line"') + "\n", encoding="utf-8")
    print(f"timeline.json: {tl['frames']} frames = {tl['seconds']} s ({tl['source']}), {len(tl['lines'])} lines, {len(tl['captions'])} captions")


# ------------------------------------------------------------------ audio io
def read_wav(path: Path):
    from scipy.io import wavfile

    sr, x = wavfile.read(str(path))
    if x.dtype.kind == "i":
        x = x.astype(np.float64) / float(np.iinfo(x.dtype).max)
    elif x.dtype.kind == "u":
        x = (x.astype(np.float64) - 128.0) / 128.0
    else:
        x = x.astype(np.float64)
    if x.ndim == 1:
        x = x[:, None]
    return sr, x


def write_wav(path: Path, x):
    from scipy.io import wavfile

    path.parent.mkdir(parents=True, exist_ok=True)
    wavfile.write(str(path), SR, (np.clip(x, -1, 1) * 32767).astype(np.int16))


def to_rate(x, sr, target=SR):
    if sr == target:
        return x
    from scipy.signal import resample_poly

    g = math.gcd(sr, target)
    return resample_poly(x, target // g, sr // g, axis=0)


def ffmpeg_bin():
    import shutil

    hit = shutil.which("ffmpeg")
    if hit:
        return hit
    for c in sorted((ROOT / "node_modules" / "@remotion").glob("compositor-*/ffmpeg*")):
        if c.suffix in ("", ".exe"):
            return str(c)
    raise SystemExit("ffmpeg not found: install it or run `npm install` first (Remotion ships one)")


def mp3(wav: Path, kbps=320):
    out = wav.with_suffix(".mp3")
    subprocess.run([ffmpeg_bin(), "-v", "error", "-y", "-i", str(wav), "-c:a", "libmp3lame", "-b:a", f"{kbps}k", str(out)], check=True)
    return out


# ------------------------------------------------------------------ TTS
def speak(text, cfg, mp3p: Path, meta: Path):
    import asyncio

    import edge_tts

    async def run():
        try:
            com = edge_tts.Communicate(text, cfg["voice"], rate=cfg["rate"], pitch=cfg["pitch"], boundary="WordBoundary")
        except TypeError:
            com = edge_tts.Communicate(text, cfg["voice"], rate=cfg["rate"], pitch=cfg["pitch"])
        words = []
        with open(mp3p, "wb") as f:
            async for ch in com.stream():
                if ch["type"] == "audio":
                    f.write(ch["data"])
                elif ch["type"] == "WordBoundary":
                    words.append({"text": ch["text"], "t": ch["offset"] / 1e7, "d": ch["duration"] / 1e7})
        meta.write_text(json.dumps(words, ensure_ascii=False), encoding="utf-8")

    for attempt in range(4):
        try:
            asyncio.run(run())
            return
        except Exception as e:
            print(f"  tts retry {attempt + 1}: {str(e)[:90]}")
    raise SystemExit("edge-tts failed (needs internet for lines that are not cached yet)")


def decode(mp3p: Path):
    import tempfile

    with tempfile.TemporaryDirectory() as td:
        wav = Path(td) / "x.wav"  # a wav file, not a raw pipe: Remotion's ffmpeg build has no raw muxers
        subprocess.run([ffmpeg_bin(), "-v", "error", "-y", "-i", str(mp3p), "-ac", "1", "-ar", str(SR), "-c:a", "pcm_s16le", str(wav)], check=True)
        sr, x = read_wav(wav)
    return to_rate(x, sr, SR)[:, 0]


def trim(x):
    e = np.convolve(np.abs(x), np.ones(480) / 480, mode="same")
    loud = np.nonzero(e > 0.006)[0]
    if len(loud) == 0:
        return x, 0.0
    a = max(0, loud[0] - int(0.03 * SR))
    b = min(len(x), loud[-1] + int(0.08 * SR))
    return x[a:b], a / SR


def line_char_times(text, words, dur):
    ct = [None] * len(text)
    pos = 0
    for w in words:
        wt = w["text"].strip()
        if not wt:
            continue
        i = text.find(wt, pos)
        if i < 0:
            continue
        toks = [k for k in range(i, i + len(wt)) if cw(text[k]) > 0]
        if not toks:
            pos = i + len(wt)
            continue
        span = max(w["d"], 0.04 * len(toks))
        for n, k in enumerate(toks):
            a = w["t"] + span * n / len(toks)
            ct[k] = [a, a + span / len(toks)]
        pos = i + len(wt)
    toks = [k for k in range(len(text)) if cw(text[k]) > 0]
    known = [k for k in toks if ct[k] is not None]
    if not known:
        ws = weight(text)
        t = 0.0
        for k in toks:
            d = dur * cw(text[k]) / ws
            ct[k] = [t, t + d]
            t += d
    else:
        for k in toks:
            if ct[k] is not None:
                continue
            p = max([q for q in known if q < k], default=None)
            nx = min([q for q in known if q > k], default=None)
            t0 = ct[p][1] if p is not None else 0.0
            t1 = ct[nx][0] if nx is not None else dur
            miss = [q for q in toks if (p is None or q > p) and (nx is None or q < nx)]
            j = miss.index(k)
            d = max(0.0, t1 - t0) / len(miss)
            ct[k] = [t0 + j * d, t0 + (j + 1) * d]
    for k in toks:
        ct[k] = [max(0.0, min(ct[k][0], dur)), max(0.0, min(ct[k][1], dur))]
    return ct


def fill_punct(sc, ct):
    for li, l in enumerate(sc["lines"]):
        last = None
        for i in range(len(l["text"])):
            if ct[li][i] is None:
                ref = last if last is not None else next(ct[li][q] for q in range(i, len(l["text"])) if ct[li][q] is not None)
                e = ref[1] if last is not None else ref[0]
                ct[li][i] = [e, e]
            else:
                last = ct[li][i]
    return ct


def tts():
    sc = load_script()
    cfg = sc["tts"]
    CACHE.mkdir(parents=True, exist_ok=True)
    t = cfg["lead"]
    clips, cts = [], []
    L = sc["lines"]
    keep = set()
    for i, ln in enumerate(L):
        key = hashlib.sha1(f'{ln["text"]}|{cfg["voice"]}|{cfg["rate"]}|{cfg["pitch"]}'.encode()).hexdigest()[:10]
        mp3p, meta = CACHE / f'{ln["id"]}-{key}.mp3', CACHE / f'{ln["id"]}-{key}.json'
        keep |= {mp3p.name, meta.name}
        if not mp3p.exists() or not meta.exists():
            print(f"  tts {ln['id']}  {ln['text']}")
            speak(ln["text"], cfg, mp3p, meta)
        clip, head = trim(decode(mp3p))
        dur = len(clip) / SR
        words = [{**w, "t": w["t"] - head} for w in json.loads(meta.read_text(encoding="utf-8"))]
        local = line_char_times(ln["text"], words, dur)
        cts.append([None if c is None else [t + c[0], t + c[1]] for c in local])
        clips.append((t, clip))
        t += dur
        if i + 1 < len(L):
            t += gap_after(sc, i)
    for old in CACHE.iterdir():  # clips of lines that changed are stale
        if old.name not in keep:
            old.unlink()
    total = t + cfg["tail"]
    track = np.zeros(int(total * SR) + SR)
    for at, clip in clips:
        k = int(round(at * SR))
        track[k:k + len(clip)] += clip
    track = track * min(1.0, 0.89 / (np.max(np.abs(track)) + 1e-9))
    write_wav(VO, track)
    mp3(VO, 192)
    print(f"voice: {VO} {total:.2f}s ({cfg['voice']} rate {cfg['rate']} pitch {cfg['pitch']})")
    tl = build(sc, fill_punct(sc, cts), total, f"edge-tts {cfg['voice']} {cfg['rate']} {cfg['pitch']}")
    write_timeline(tl)
    for ln in tl["lines"]:
        print(f"  {ln['id']}  {ln['from'] / tl['fps']:7.2f} - {ln['to'] / tl['fps']:7.2f}  {ln['text'][:20]}")


# ------------------------------------------------------------------ subtitles
def srt(out=None):
    tl = json.loads(TIMELINE.read_text(encoding="utf-8"))
    fps = tl["fps"]

    def ts(f):
        ms = int(round(f / fps * 1000))
        return f"{ms // 3600000:02d}:{ms // 60000 % 60:02d}:{ms // 1000 % 60:02d},{ms % 1000:03d}"

    rows = [f"{i + 1}\n{ts(c['from'])} --> {ts(c['to'])}\n" + "\n".join(c["rows"]) + "\n" for i, c in enumerate(tl["captions"])]
    path = Path(out) if out else SRT_DEFAULT
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text("\n".join(rows), encoding="utf-8")
    print(f"subtitles: {path} ({len(rows)} cues)")


# ------------------------------------------------------------------ events (same rules as cue.ts)
def event_times(tl):
    ev = json.loads(EVENTS.read_text(encoding="utf-8"))
    lines = {l["id"]: l for l in tl["lines"]}
    out = {}
    for name, e in ev.items():
        if name.startswith("_"):
            continue
        if e.get("after"):
            f = lines[e["after"]]["to"]
        else:
            l = lines[e["line"]]
            if e.get("word"):
                i = l["text"].find(e["word"])
                if i < 0:
                    raise SystemExit(f"event {name}: '{e['word']}' not in {e['line']}")
                f = l["ch"][i + len(e["word"]) - 1][1] if e.get("at") == "end" else l["ch"][i][0]
            else:
                f = l["from"]
        out[name] = (f + e.get("off", 0), e.get("sfx"), e)
    return out


def check():
    sc = load_script()
    tl = json.loads(TIMELINE.read_text(encoding="utf-8"))
    fps = tl["fps"]
    speech = sum((l["to"] - l["from"]) for l in tl["lines"]) / fps
    print(f"timeline: {tl['source']}, {tl['frames']} frames = {tl['seconds']} s")
    print(f"net speech {speech:.1f} s, non-speech {tl['seconds'] - speech:.1f} s ({(tl['seconds'] - speech) / tl['seconds']:.0%}); {sum(weight(l['text']) for l in sc['lines']):.0f} weighted chars")
    gaps = [(tl["lines"][i + 1]["from"] - tl["lines"][i]["to"]) / fps for i in range(len(tl["lines"]) - 1)]
    print(f"pauses between lines: {min(gaps):.2f}-{max(gaps):.2f} s, mean {sum(gaps) / len(gaps):.2f} s")
    for name, (f, kind, e) in sorted(event_times(tl).items(), key=lambda kv: kv[1][0]):
        ref = e.get("line") or e.get("after")
        w = e.get("word") or ("(line end)" if e.get("after") else "(line start)")
        print(f"  {f / fps:7.2f}s  f{f:5d}  {name:12s} {ref} {w}{'  [' + kind + ']' if kind else ''}")


# ------------------------------------------------------------------ music: a slow, warm score that follows the sections
def env(n, a, d):
    t = np.arange(n) / SR
    return np.minimum(1, t / max(a, 1e-4)) * np.exp(-t / d)


def adsr(n, a, r):
    t = np.arange(n) / SR
    return np.minimum(1, t / a) * np.minimum(1, np.maximum(0, (n / SR - t) / r))


def lp(x, fc):
    from scipy.signal import butter, sosfilt

    return sosfilt(butter(2, fc / (SR / 2), output="sos"), x, axis=0)


def hp(x, fc):
    from scipy.signal import butter, sosfilt

    return sosfilt(butter(2, fc / (SR / 2), btype="high", output="sos"), x, axis=0)


def note(m):
    return 440.0 * 2 ** ((m - 69) / 12)


def bgm():
    """72 bpm, D minor: Dm9 - Bbmaj7 - Gm9 - Asus4, two bars each. Layers enter by section: a soft pad from the start,
    a sub pulse from the definition, a glass arpeggio from the three steps; it thins out for the ending."""
    tl = json.loads(TIMELINE.read_text(encoding="utf-8"))
    fps = tl["fps"]
    total = tl["frames"] / fps
    n = int(total * SR) + SR
    t = np.arange(n) / SR
    rng = np.random.default_rng(3)
    sec = {s["id"]: (s["from"] / fps, s["to"] / fps) for s in tl["sections"]}
    beat = 60 / 72
    bar = 4 * beat
    chords = [[38, 50, 57, 60, 64, 65], [34, 46, 53, 57, 62, 65], [31, 43, 50, 53, 57, 58], [33, 45, 50, 52, 57, 62]]
    pad = np.zeros(n)
    sub = np.zeros(n)
    arp = np.zeros(n)
    k = 0
    while k * 2 * bar < total + 2 * bar:
        ch = chords[k % 4]
        a = int(k * 2 * bar * SR)
        m = int(2 * bar * SR * 1.08)
        m = min(m, n - a)
        if m <= 0:
            break
        tt = np.arange(m) / SR
        e = adsr(m, 1.6, 1.8)
        for j, mm in enumerate(ch[1:]):
            f0 = note(mm)
            for det in (-0.12, 0.0, 0.11):  # three detuned partial stacks = a soft analog-ish pad
                f = f0 * 2 ** (det / 12)
                pad[a:a + m] += e * (np.sin(2 * np.pi * f * tt + j) + 0.32 * np.sin(4 * np.pi * f * tt) + 0.12 * np.sin(6 * np.pi * f * tt)) * 0.05
        fsub = note(ch[0])
        sub[a:a + m] += e * np.sin(2 * np.pi * fsub * tt) * 0.25
        # arpeggio: eighth notes over the chord tones, very soft glass plucks
        for s8 in range(16):
            at = a + int(s8 * beat / 2 * SR)
            if at >= n:
                break
            if rng.random() < 0.35:
                continue
            mm = ch[1 + (s8 * 3) % 5] + 12
            ln = min(int(0.9 * SR), n - at)
            tt2 = np.arange(ln) / SR
            arp[at:at + ln] += (np.sin(2 * np.pi * note(mm) * tt2) + 0.25 * np.sin(2 * np.pi * note(mm) * 3.01 * tt2) * np.exp(-tt2 * 9)) * env(ln, 0.003, 0.32) * 0.06
        k += 1
    pad = lp(pad, 2200)
    # heartbeat pulse on beats 1 and 3, a low felt-mallet thump
    pulse = np.zeros(n)
    kb = 0
    while kb * 2 * beat < total:
        at = int(kb * 2 * beat * SR)
        ln = min(int(0.5 * SR), n - at)
        tt = np.arange(ln) / SR
        f = 55 * np.exp(-tt * 8) + 42
        pulse[at:at + ln] += np.sin(2 * np.pi * np.cumsum(f) / SR) * env(ln, 0.004, 0.14) * (1.0 if kb % 2 == 0 else 0.6)
        kb += 1

    def lay(a, b, ramp=2.5):
        """0 before section a starts, 1 from there until section b ends"""
        t0 = sec[a][0]
        t1 = sec[b][1] if b else total + 10
        return np.clip((t - t0) / ramp, 0, 1) * np.clip((t1 - t) / ramp, 0, 1)

    air = lp(rng.standard_normal(n), 900) * 0.02
    padK = 0.55 + 0.45 * lay("what", "wall")
    out = pad * padK + sub * lay("what", "wall") * 0.8 + pulse * lay("why", "move") * 0.35 + pulse * lay("use", "use3") * 0.28 + arp * lay("use", "wall") + air
    out = out * np.minimum(1, t / 3.0) * np.minimum(1, np.maximum(0, (total - t) / 3.0))
    out = hp(out, 30)
    st = np.stack([out, lp(np.roll(out, int(0.011 * SR)), 6000)], axis=1)  # a little width
    st = st / (np.max(np.abs(st)) + 1e-9) * 0.7
    write_wav(BGM, st)
    mp3(BGM, 256)
    print(f"bgm: {BGM} {total:.2f}s")


# ------------------------------------------------------------------ sound effects
def make_sfx(kind, rng):
    if kind == "glim":  # the faint line appearing: a thin shimmer
        n = int(SR * 2.4)
        t = np.arange(n) / SR
        x = sum(np.sin(2 * np.pi * f * t + p) for f, p in [(1567.98, 0), (2349.3, 1.3), (3135.9, 2.1)]) * (0.5 + 0.5 * np.sin(2 * np.pi * 7 * t))
        return x * adsr(n, 0.5, 1.6) * 0.18
    if kind == "ignite":  # the POC line lights up: a soft swell into a low hum and a bell
        n = int(SR * 2.2)
        t = np.arange(n) / SR
        sw = lp(rng.standard_normal(n), 1800) * np.minimum(1, t / 0.6) * np.exp(-np.maximum(0, t - 0.6) * 4) * 0.5
        hum = (np.sin(2 * np.pi * 73.4 * t) + 0.5 * np.sin(2 * np.pi * 146.8 * t)) * np.minimum(1, np.maximum(0, t - 0.45) / 0.1) * np.exp(-np.maximum(0, t - 0.55) * 1.6) * 0.45
        bell = np.zeros(n)
        s0 = int(0.55 * SR)
        tb = t[: n - s0]
        bell[s0:] = sum(a * np.sin(2 * np.pi * f * tb) for f, a in [(587.3, 0.5), (1174.7, 0.25), (1761.6, 0.12)]) * env(n - s0, 0.002, 0.9) * 0.5
        return sw + hum + bell
    if kind == "pull":  # price pulled back to the line: a low magnetic sweep down
        n = int(SR * 1.1)
        t = np.arange(n) / SR
        f = 220 * np.exp(-t * 2.2) + 70
        return (np.sin(2 * np.pi * np.cumsum(f) / SR) * 0.6 + lp(rng.standard_normal(n), 500) * 0.25) * adsr(n, 0.08, 0.6) * 0.6
    if kind == "slide":  # the POC moving to a new price: a rising glide that lands
        n = int(SR * 1.6)
        t = np.arange(n) / SR
        f = 196 * 2 ** (np.minimum(t, 1.0) * 7 / 12)
        return (np.sin(2 * np.pi * np.cumsum(f) / SR) + 0.3 * np.sin(4 * np.pi * np.cumsum(f) / SR)) * adsr(n, 0.15, 0.6) * 0.45
    if kind == "tick":  # a tag / a step number: short glass tick
        n = int(SR * 0.35)
        t = np.arange(n) / SR
        return (0.5 * np.sin(2 * np.pi * 1760 * t) * env(n, 0.002, 0.05) + 0.25 * np.sin(2 * np.pi * 2637 * t) * env(n, 0.002, 0.03)) * 0.55
    if kind == "thump":  # under a key statement
        n = int(SR * 0.9)
        t = np.arange(n) / SR
        f = 70 * np.exp(-t * 3) + 42
        return np.sin(2 * np.pi * np.cumsum(f) / SR) * env(n, 0.004, 0.28) * 0.9
    if kind == "whoosh":  # camera flight to another session
        n = int(SR * 1.0)
        t = np.arange(n) / SR
        x = rng.standard_normal(n)
        from scipy.signal import butter, sosfilt

        out = np.zeros(n)
        for a in range(0, n, 2400):  # a band-pass that sweeps up then down
            fc = 400 + 2600 * math.sin(math.pi * a / n)
            sos = butter(2, [fc * 0.7 / (SR / 2), min(0.99, fc * 1.4 / (SR / 2))], btype="band", output="sos")
            out[a:a + 2400] = sosfilt(sos, x[a:a + 2400])
        return out * np.sin(np.pi * t / t[-1]) ** 2 * 0.35
    if kind == "slip":  # price sliding fast through the low-volume node: a quick falling zip
        n = int(SR * 0.7)
        t = np.arange(n) / SR
        f = 900 * np.exp(-t * 4) + 120
        return np.sin(2 * np.pi * np.cumsum(f) / SR) * adsr(n, 0.01, 0.4) * 0.35 + hp(rng.standard_normal(n), 3000) * env(n, 0.005, 0.12) * 0.12
    if kind == "pop":
        n = int(SR * 0.18)
        t = np.arange(n) / SR
        f = 600 + 900 * np.exp(-t * 30)
        return np.sin(2 * np.pi * np.cumsum(f) / SR) * env(n, 0.002, 0.04) * 0.45
    raise ValueError(kind)


SFX_KINDS = ["glim", "ignite", "pull", "slide", "tick", "thump", "whoosh", "slip", "pop"]


def sfx():
    rng = np.random.default_rng(11)
    for k in SFX_KINDS:
        x = make_sfx(k, rng)
        x = x / (np.max(np.abs(x)) + 1e-9) * 0.8
        write_wav(SFX_DIR / f"{k}.wav", x)
    print(f"sfx: {len(SFX_KINDS)} files in {SFX_DIR}")


# ------------------------------------------------------------------ mix
def k_weight(x):
    from scipy.signal import lfilter

    y = lfilter([1.53512485958697, -2.69169618940638, 1.19839281085285], [1, -1.69065929318241, 0.73248077421585], x, axis=0)
    return lfilter([1, -2, 1], [1, -1.99004745483398, 0.99007225036621], y, axis=0)


def lufs(x):
    y = k_weight(x)
    blk, hop = int(0.4 * SR), int(0.1 * SR)
    z = np.array([np.mean(np.sum(y[i:i + blk] ** 2, axis=1)) for i in range(0, len(y) - blk, hop)])
    lk = -0.691 + 10 * np.log10(z + 1e-12)
    z = z[lk > -70]
    rel = -0.691 + 10 * np.log10(np.mean(z)) - 10
    z = z[(-0.691 + 10 * np.log10(z + 1e-12)) > rel]
    return -0.691 + 10 * np.log10(np.mean(z))


def true_peak_db(x):
    from scipy.signal import resample_poly

    return 20 * np.log10(np.max(np.abs(resample_poly(x, 4, 1, axis=0))) + 1e-12)


def limit(x, ceiling_db=-1.8):
    from scipy.ndimage import minimum_filter1d, uniform_filter1d

    c = 10 ** (ceiling_db / 20)
    need = np.minimum(1.0, c / (np.max(np.abs(x), axis=1) + 1e-9))
    g = uniform_filter1d(minimum_filter1d(need, 481), 241)
    return x * g[:, None]


def mix():
    for p in (VO, BGM):
        if not p.exists():
            raise SystemExit(f"missing {p}: run tts / bgm first")
    tl = json.loads(TIMELINE.read_text(encoding="utf-8"))
    n = int(tl["frames"] / tl["fps"] * SR)
    sr, v = read_wav(VO)
    v = to_rate(v, sr)
    vo = np.zeros((n, 2))
    m = min(n, len(v))
    vo[:m] = np.repeat(v[:m, :1], 2, axis=1)
    sr, b = read_wav(BGM)
    b = to_rate(b, sr)
    bg = np.zeros((n, 2))
    m = min(n, len(b))
    bg[:m] = b[:m, :2] if b.shape[1] > 1 else np.repeat(b[:m], 2, axis=1)
    from scipy.ndimage import uniform_filter1d

    vlev = uniform_filter1d(np.abs(vo[:, 0]), int(0.35 * SR))
    duck = 1 - 0.68 * np.minimum(1, vlev / (np.percentile(vlev, 90) + 1e-9))  # about -10 dB under the voice
    bg = bg * duck[:, None] * 0.32
    fx = np.zeros((n, 2))
    last = -1e9
    for name, (f, kind, _) in sorted(event_times(tl).items(), key=lambda kv: kv[1][0]):
        if not kind:
            continue
        ts_ = f / tl["fps"]
        if ts_ - last < 0.5:
            continue
        last = ts_
        sr, s = read_wav(SFX_DIR / f"{kind}.wav")
        s = s[:, 0]
        i = max(0, int(ts_ * SR))
        mm = min(len(s), n - i)
        pan = 0.5 + 0.12 * math.sin(sum(map(ord, name)) % 7)
        g = 0.2 * (1 - 0.35 * min(1, vlev[i] / (np.percentile(vlev, 90) + 1e-9)))  # about -4 dB under the voice
        fx[i:i + mm, 0] += s[:mm] * (1 - pan) * 2 * g
        fx[i:i + mm, 1] += s[:mm] * pan * 2 * g
    out = vo + bg + fx
    for _ in range(5):
        out = limit(out * 10 ** ((-14 - lufs(out)) / 20))
    write_wav(MIX, out)
    mp3(MIX, 320)
    print(f"mix: {MIX} {n / SR:.2f}s, {lufs(out):.1f} LUFS, true peak {true_peak_db(out):.1f} dBTP")


if __name__ == "__main__":
    sys.stdout.reconfigure(encoding="utf-8")
    argv = sys.argv[1:]
    cmd = argv[0] if argv else "check"
    pos = argv[1:]
    if cmd == "tts":
        tts()
    elif cmd == "srt":
        srt(pos[0] if pos else None)
    elif cmd == "bgm":
        bgm()
    elif cmd == "sfx":
        sfx()
    elif cmd == "mix":
        mix()
    elif cmd == "check":
        check()
    elif cmd == "all":
        tts()
        srt(pos[0] if pos else None)
        bgm()
        sfx()
        mix()
    else:
        raise SystemExit(__doc__)
