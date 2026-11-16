#!/usr/bin/env python3
"""Timeline, subtitles and mix for 《你的止损，为什么总被精准扫掉？》 (src/stophunt).

Every picture, caption and animation is keyed to a line ID; this script decides when each line plays.

  python scripts/stophunt-sync.py estimate   placeholder timeline from character counts (no audio needed)
  python scripts/stophunt-sync.py align      timeline from the real voice: public/voiceover/vo.wav
  python scripts/stophunt-sync.py srt [out]  subtitles from the timeline (default ../outputs-stophunt-v1/stop-hunt-v1.srt)
  python scripts/stophunt-sync.py mix        public/stophunt/mix.wav = voice + quiet bed + sparse cues, -14 LUFS
  python scripts/stophunt-sync.py all        align + srt + mix (what you run after replacing vo.wav)

Run from studio/. Needs Python 3 with numpy and scipy only (no ffmpeg, no network).
Alignment: the voice is cut at its pauses; a dynamic programme matches pauses to the script's punctuation,
so each phrase (text between two punctuation marks) gets its own start/end. Swapping the recording only
needs `all` again: the animation reads line/phrase times from src/stophunt/timeline.json.
"""
from __future__ import annotations

import json
import math
import sys
from pathlib import Path

import numpy as np

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "src" / "stophunt"
SCRIPT = SRC / "script.json"
TIMELINE = SRC / "timeline.json"
EVENTS = SRC / "events.json"
VO = ROOT / "public" / "voiceover" / "vo.wav"
MIX = ROOT / "public" / "stophunt" / "mix.wav"
SRT_DEFAULT = ROOT.parent / "outputs-stophunt-v1" / "stop-hunt-v1.srt"

BREAK = "，。？！；："  # phrase ends (、 stays inside a phrase)
SKIP = "，。？！；：、“”\"'（）() "
CAP_MAX = 15  # characters per caption line (1440 px wide, 64 px type)


def load_script():
    return json.loads(SCRIPT.read_text(encoding="utf-8"))


def weight(s: str) -> int:
    return sum(1 for ch in s if ch not in SKIP)


def phrases(text: str):
    """[(c0, c1, punct)] char spans (c1 exclusive, punctuation included)"""
    out, c0 = [], 0
    for i, ch in enumerate(text):
        if ch in BREAK:
            out.append((c0, i + 1, ch))
            c0 = i + 1
    if c0 < len(text):
        out.append((c0, len(text), ""))
    return [p for p in out if weight(text[p[0]:p[1]]) > 0]


# ------------------------------------------------------------------ timeline assembly
def build(sc, times, total_s, source):
    """times: per line, list of (t0, t1) seconds per phrase"""
    fps = sc["fps"]
    F = lambda t: int(round(t * fps))
    lines, caps = [], []
    for ln, ph_t in zip(sc["lines"], times):
        text = ln["text"]
        ph = phrases(text)
        ph_f = [[c0, c1, F(a), max(F(a) + 1, F(b))] for (c0, c1, _), (a, b) in zip(ph, ph_t)]
        lines.append({"id": ln["id"], "section": ln["section"], "text": text, "from": ph_f[0][2], "to": ph_f[-1][3], "ph": ph_f})
        # captions: greedy groups of phrases up to CAP_MAX characters, never across lines
        group = []
        for p in ph_f:
            seg = text[p[0]:p[1]]
            hard = bool(group) and text[group[-1][1] - 1] in "。？！；"
            if group and (hard or weight("".join(text[g[0]:g[1]] for g in group) + seg) > CAP_MAX):
                caps.append((ln["id"], group))
                group = []
            group.append(p)
        if group:
            caps.append((ln["id"], group))
    captions = []
    for k, (lid, group) in enumerate(caps):
        text = next(l["text"] for l in lines if l["id"] == lid)
        raw = text[group[0][0]:group[-1][1]]
        while raw and raw[-1] in "，。；：、":
            raw = raw[:-1]
        nxt = caps[k + 1][1][0][2] if k + 1 < len(caps) else 10**9
        to = min(group[-1][3] + int(0.35 * fps), nxt)
        captions.append({"line": lid, "text": raw.replace("，", " ").replace("。", " ").replace("；", " "), "from": group[0][2], "to": to})
    frames = F(total_s)
    secs = []
    for ln in lines:
        if not secs or secs[-1]["id"] != ln["section"]:
            secs.append({"id": ln["section"], "from": ln["from"], "to": None})
    for i, s in enumerate(secs):
        s["to"] = secs[i + 1]["from"] if i + 1 < len(secs) else frames
    secs[0]["from"] = 0
    return {"fps": fps, "width": 1440, "height": 2560, "frames": frames, "seconds": round(frames / fps, 2), "source": source, "sections": secs, "lines": lines, "captions": captions}


def write_timeline(tl):
    TIMELINE.write_text(json.dumps(tl, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")
    print(f"timeline.json: {tl['frames']} frames = {tl['seconds']} s ({tl['source']}), {len(tl['lines'])} lines, {len(tl['captions'])} captions")


# ------------------------------------------------------------------ estimate
def estimate():
    sc = load_script()
    est = sc["estimate"]
    t = est["lead"]
    times = []
    L = sc["lines"]
    for i, ln in enumerate(L):
        if ln.get("hint") == "laugh_before":
            t += 0.7
        cur = []
        ph = phrases(ln["text"])
        for k, (c0, c1, pu) in enumerate(ph):
            d = weight(ln["text"][c0:c1]) / est["cps"]
            cur.append((t, t + d))
            t += d + (est["pause"].get(pu, 0.1) if k < len(ph) - 1 else 0)
        times.append(cur)
        if ln.get("hint") == "pause_after":
            t += 0.6
        if i + 1 < len(L):
            t += est["sectionGap"] if L[i + 1]["section"] != ln["section"] else est["lineGap"]
    write_timeline(build(sc, times, t + est["tail"], "estimate"))


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


def to_rate(x, sr, target=48000):
    if sr == target:
        return x
    from scipy.signal import resample_poly

    g = math.gcd(sr, target)
    return resample_poly(x, target // g, sr // g, axis=0)


# ------------------------------------------------------------------ align
def speech_gaps(mono, sr, min_gap):
    hop = int(sr * 0.01)
    win = int(sr * 0.03)
    n = max(1, (len(mono) - win) // hop)
    idx = np.arange(n)[:, None] * hop + np.arange(win)[None, :]
    rms = np.sqrt(np.mean(mono[idx] ** 2, axis=1) + 1e-12)
    db = 20 * np.log10(rms)
    floor, peak = np.percentile(db, 8), np.percentile(db, 98)
    thr = max(floor + 12, peak - 38)
    sp = db > thr
    if not sp.any():
        raise SystemExit("vo.wav seems silent")
    first, last = np.argmax(sp), len(sp) - 1 - np.argmax(sp[::-1])
    gaps, i = [], first
    while i <= last:
        if not sp[i]:
            j = i
            while j <= last and not sp[j]:
                j += 1
            if (j - i) * 0.01 >= min_gap:
                gaps.append((i * 0.01 + 0.01, j * 0.01 + 0.01))  # window centre correction
            i = j
        else:
            i += 1
    return first * 0.01 + 0.015, last * 0.01 + 0.03, gaps


def align():
    if not VO.exists():
        raise SystemExit(f"missing {VO} - put the voice there (wav, any rate, mono or stereo)")
    sc = load_script()
    sr, x = read_wav(VO)
    mono = x.mean(axis=1)
    dur = len(mono) / sr
    ph = []  # (line index, weight, punct, is_line_end); line index -1 = a non-text sound (the [笑] before a line)
    for li, ln in enumerate(sc["lines"]):
        if ln.get("hint") == "laugh_before":
            ph.append((-1, 3, "，", False))
        p = phrases(ln["text"])
        for k, (c0, c1, pu) in enumerate(p):
            ph.append((li, weight(ln["text"][c0:c1]), pu, k == len(p) - 1))
    P = len(ph)
    for min_gap in (0.14, 0.1, 0.07, 0.05):
        t0, t1, gaps = speech_gaps(mono, sr, min_gap)
        if len(gaps) >= P - 1:
            break
    if len(gaps) < P - 1:
        print(f"warning: only {len(gaps)} pauses for {P - 1} phrase breaks; falling back to proportional timing")
        W = sum(p[1] for p in ph)
        bounds, acc = [], 0
        for p in ph[:-1]:
            acc += p[1]
            m = t0 + (t1 - t0) * acc / W
            bounds.append((m, m))
    else:
        bounds = dp_match(ph, t0, t1, gaps)
    starts = [t0] + [b[1] for b in bounds]
    ends = [b[0] for b in bounds] + [t1]
    times = [[] for _ in sc["lines"]]
    for k, p in enumerate(ph):
        if p[0] >= 0:
            times[p[0]].append((starts[k], ends[k]))
    tail = sc["estimate"]["tail"]
    total = max(dur, ends[-1] + tail)
    tl = build(sc, times, total, f"vo.wav {dur:.2f}s @{sr}Hz")
    write_timeline(tl)
    for ln in tl["lines"]:
        print(f"  {ln['id']}  {ln['from'] / tl['fps']:7.2f} - {ln['to'] / tl['fps']:7.2f}  {ln['text'][:16]}")


def dp_match(ph, t0, t1, gaps):
    """assign each phrase break to one pause, in order. returns [(gap_start, gap_end)] per break."""
    P, G = len(ph), len(gaps)
    W = sum(p[1] for p in ph)
    exp_pause = sum(0.4 if p[3] else 0.2 for p in ph[:-1])
    spc = max(0.12, (t1 - t0 - exp_pause) / W)  # seconds per character
    gl = np.array([e - s for s, e in gaps])
    cum = np.concatenate([[0], np.cumsum(gl ** 2)])
    unused = lambda a, b: (cum[b] - cum[a]) / 0.04 if b > a else 0.0  # gaps a..b-1 left inside a phrase

    def pcost(k, d):
        e = ph[k][1] * spc
        return ((d - e) / (0.3 * e + 0.25)) ** 2

    def bcost(k, g):
        want = 0.38 if ph[k][3] else 0.18
        return 3.0 * max(0.0, want - gl[g]) / want

    INF = 1e18
    WIN = 14
    dp = np.full((P - 1, G), INF)
    bk = np.full((P - 1, G), -1, dtype=int)
    for j in range(G):
        dp[0, j] = pcost(0, gaps[j][0] - t0) + unused(0, j) + bcost(0, j)
    for k in range(1, P - 1):
        for j in range(k, G):
            best, arg = INF, -1
            for i in range(max(k - 1, j - WIN), j):
                if dp[k - 1, i] >= INF:
                    continue
                c = dp[k - 1, i] + pcost(k, gaps[j][0] - gaps[i][1]) + unused(i + 1, j)
                if c < best:
                    best, arg = c, i
            if arg >= 0:
                dp[k, j] = best + bcost(k, j)
                bk[k, j] = arg
    fin = [dp[P - 2, j] + pcost(P - 1, t1 - gaps[j][1]) + unused(j + 1, G) for j in range(G)]
    j = int(np.argmin(fin))
    path = [j]
    for k in range(P - 2, 0, -1):
        j = bk[k, j]
        path.append(j)
    path.reverse()
    return [gaps[g] for g in path]


# ------------------------------------------------------------------ subtitles
def srt(out=None):
    tl = json.loads(TIMELINE.read_text(encoding="utf-8"))
    fps = tl["fps"]

    def ts(f):
        ms = int(round(f / fps * 1000))
        return f"{ms // 3600000:02d}:{ms // 60000 % 60:02d}:{ms // 1000 % 60:02d},{ms % 1000:03d}"

    rows = [f"{i + 1}\n{ts(c['from'])} --> {ts(c['to'])}\n{c['text']}\n" for i, c in enumerate(tl["captions"])]
    path = Path(out) if out else SRT_DEFAULT
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text("\n".join(rows), encoding="utf-8")
    print(f"subtitles: {path} ({len(rows)} cues, timeline source: {tl['source']})")


# ------------------------------------------------------------------ events (same rules as cue.ts)
def event_times(tl):
    ev = json.loads(EVENTS.read_text(encoding="utf-8"))
    lines = {l["id"]: l for l in tl["lines"]}
    out = {}
    for name, e in ev.items():
        if name.startswith("_"):
            continue
        l = lines[e["line"]]
        if e.get("end"):
            f = l["to"]
        else:
            ch = l["text"].find(e["word"]) if e.get("word") else 0
            if ch < 0:
                raise SystemExit(f"event {name}: '{e['word']}' not in {e['line']}")
            f = char_frame(l, ch)
        out[name] = (f + e.get("off", 0), e.get("sfx"))
    return out


def char_frame(l, ch):
    for c0, c1, a, b in l["ph"]:
        if ch < c1:
            return a + (b - a) * max(0, ch - c0) / max(1, c1 - c0)
    return l["to"]


# ------------------------------------------------------------------ mix
SR = 48000


def env(n, a, d):
    t = np.arange(n) / SR
    return np.minimum(1, t / max(a, 1e-4)) * np.exp(-t / d)


def sfx(kind, rng):
    if kind == "tick":  # soft section tick: filtered click + short glass partial
        n = int(SR * 0.35)
        t = np.arange(n) / SR
        return (0.5 * np.sin(2 * np.pi * 1760 * t) * env(n, 0.002, 0.05) + 0.25 * np.sin(2 * np.pi * 2637 * t) * env(n, 0.002, 0.03)) * 0.5
    if kind == "riser":  # soft filtered-noise rise into the sweep, no whoosh tail
        n = int(SR * 1.1)
        t = np.arange(n) / SR
        noise = rng.standard_normal(n)
        from scipy.signal import lfilter

        y = lfilter([0.04], [1, -0.96], noise)
        return y * (t / t[-1]) ** 2.2 * 0.9
    if kind == "cascade":  # stops firing: a run of clicks that accelerates, then settles
        n = int(SR * 1.3)
        y = np.zeros(n)
        tt, gap = 0.0, 0.075
        while tt < 1.0:
            i = int(tt * SR)
            m = int(SR * 0.04)
            f = 900 + 1400 * rng.random()
            seg = np.sin(2 * np.pi * f * np.arange(m) / SR) * env(m, 0.001, 0.008)
            y[i:i + m] += seg[: n - i] * (0.55 + 0.45 * rng.random())
            tt += gap
            gap = max(0.012, gap * 0.86)
        t = np.arange(n) / SR
        y += 0.6 * np.sin(2 * np.pi * 55 * t) * env(n, 0.01, 0.35)
        return y * 0.6
    if kind == "thump":  # low body hit under a key statement
        n = int(SR * 0.9)
        t = np.arange(n) / SR
        f = 70 * np.exp(-t * 3) + 42
        return np.sin(2 * np.pi * np.cumsum(f) / SR) * env(n, 0.004, 0.28) * 0.9
    if kind == "pop":  # poll bubble
        n = int(SR * 0.18)
        t = np.arange(n) / SR
        f = 600 + 900 * np.exp(-t * 30)
        return np.sin(2 * np.pi * np.cumsum(f) / SR) * env(n, 0.002, 0.04) * 0.45
    raise ValueError(kind)


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


def limit(x, ceiling_db=-1.5):
    from scipy.ndimage import minimum_filter1d, uniform_filter1d

    c = 10 ** (ceiling_db / 20)
    need = np.minimum(1.0, c / (np.max(np.abs(x), axis=1) + 1e-9))
    g = uniform_filter1d(minimum_filter1d(need, 481), 241)
    return x * g[:, None]  # every averaged value is a minimum over a window that contains the sample


def mix():
    if not VO.exists():
        raise SystemExit(f"missing {VO}")
    tl = json.loads(TIMELINE.read_text(encoding="utf-8"))
    sr, v = read_wav(VO)
    v = to_rate(v, sr)
    if v.shape[1] == 1:
        v = np.repeat(v, 2, axis=1)
    v = v[:, :2]
    n = max(len(v), int(tl["frames"] / tl["fps"] * SR))
    vo = np.zeros((n, 2))
    vo[: len(v)] = v
    rng = np.random.default_rng(7)
    t = np.arange(n) / SR
    # bed: low drone (A1/E2/A2) with a slow swell, plus air; ducked under the voice
    from scipy.signal import lfilter

    swell = 0.6 + 0.4 * np.sin(2 * np.pi * t / 19.0)
    bed = sum(a * np.sin(2 * np.pi * f * t + ph) for f, a, ph in [(55, 0.5, 0), (82.41, 0.32, 1.1), (110, 0.22, 2.3), (164.8, 0.08, 0.4)]) * swell
    air = lfilter([0.02], [1, -0.985], rng.standard_normal(n)) * 0.8
    fade = np.minimum(1, t / 2.5) * np.minimum(1, (t[-1] - t) / 2.5)
    bed = (bed + air) * fade
    from scipy.ndimage import uniform_filter1d

    vlev = uniform_filter1d(np.abs(vo.mean(axis=1)), int(0.3 * SR))
    duck = 1 - 0.55 * np.minimum(1, vlev / (np.percentile(vlev, 90) + 1e-9))
    bed = np.stack([bed * duck, bed * duck * 0.97], axis=1) * 0.05
    fx = np.zeros((n, 2))
    for name, (f, kind) in event_times(tl).items():
        if not kind:
            continue
        s = sfx(kind, rng)
        i = int(f / tl["fps"] * SR)
        if kind == "riser":
            i -= len(s)
        i = max(0, i)
        m = min(len(s), n - i)
        pan = 0.5 + 0.2 * math.sin(hash(name) % 7)
        fx[i:i + m, 0] += s[:m] * (1 - pan) * 2 * 0.16
        fx[i:i + m, 1] += s[:m] * pan * 2 * 0.16
    out = vo + bed + fx
    g = 10 ** ((-14 - lufs(out)) / 20)
    out = limit(out * g)
    MIX.parent.mkdir(parents=True, exist_ok=True)
    from scipy.io import wavfile

    wavfile.write(str(MIX), SR, (np.clip(out, -1, 1) * 32767).astype(np.int16))
    print(f"mix: {MIX} {n / SR:.2f}s, {lufs(out):.1f} LUFS, peak {20 * np.log10(np.max(np.abs(out)) + 1e-9):.1f} dBFS")


if __name__ == "__main__":
    sys.stdout.reconfigure(encoding="utf-8")
    cmd = sys.argv[1] if len(sys.argv) > 1 else "estimate"
    if cmd == "estimate":
        estimate()
    elif cmd == "align":
        align()
    elif cmd == "srt":
        srt(sys.argv[2] if len(sys.argv) > 2 else None)
    elif cmd == "mix":
        mix()
    elif cmd == "all":
        align()
        srt(sys.argv[2] if len(sys.argv) > 2 else None)
        mix()
    else:
        raise SystemExit(__doc__)
