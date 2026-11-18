#!/usr/bin/env python3
"""Timeline, subtitles and mix for 《主动还是被动：谁拿走了流动性？》 (voiceover: 一买就追高…) (src/activepassive).

Every caption, animation and camera move is keyed to line IDs and to the moment individual words are spoken.
This script decides those moments; the animation code never contains a frame number or a total length.

  python scripts/activepassive-sync.py estimate        placeholder timeline from character counts (no audio; committed)
  python scripts/activepassive-sync.py align           timeline from the real voice public/voiceover/vo.wav
        [--model small|medium|large-v3] [--words words.json] [--pauses]
  python scripts/activepassive-sync.py srt [out.srt]   subtitles (default ../outputs-activepassive-v2/active-passive-v2.srt)
  python scripts/activepassive-sync.py mix             public/activepassive/mix.wav = voice + quiet bed + sparse cues, -14 LUFS
  python scripts/activepassive-sync.py all [...]       align + srt + mix   (= npm run ap:sync)
  python scripts/activepassive-sync.py check           print every event's time and the line around it (for a quick read-through)

Alignment runs on your machine only; the voice never leaves it.
  word level (preferred): faster-whisper transcribes vo.wav with word timestamps, the recognised characters are matched
      to the script's characters by dynamic programming (same character, or same pinyin with pypinyin installed), so
      every script character gets the time it is actually spoken; misses are interpolated between matched neighbours.
      Or pass --words with any word-timestamp JSON: [{"word": "主动", "start": 0.12, "end": 0.40}, ...].
  pause level (fallback, no extra packages; also --pauses): pauses are found from the energy of the voice and matched
      in order to the script's punctuation by dynamic programming; characters inside a phrase share its time evenly.

Needs Python 3 + numpy + scipy; word-level alignment also needs  pip install faster-whisper pypinyin
"""
from __future__ import annotations

import json
import math
import os
import sys
from pathlib import Path

import numpy as np

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "src" / "activepassive"
SCRIPT = SRC / "script.json"
TIMELINE = SRC / "timeline.json"
EVENTS = SRC / "events.json"
# AP_VO / AP_MIX only exist for testing the pipeline on other files; normal use needs neither
VO = Path(os.environ.get("AP_VO", ROOT / "public" / "voiceover" / "vo.wav"))
MIX = Path(os.environ.get("AP_MIX", ROOT / "public" / "activepassive" / "mix.wav"))
SRT_DEFAULT = ROOT.parent / "outputs-activepassive-v2" / "active-passive-v2.srt"

SKIP = set("，。？！；：、“”\"'‘’（）() ")
SENT = "。？！；"
BREAK = "，。？！；：、"
CAP_ROW = 16  # characters per caption row (1440 px wide, 62 px type)
CAP_MIN = 1.3  # seconds a caption stays on screen at least
CAP_HOLD = 0.3  # seconds a caption stays after its last character


def load_script():
    return json.loads(SCRIPT.read_text(encoding="utf-8"))


def cw(c: str) -> float:
    """spoken weight of one character: a Latin letter (Delta, K) is much shorter than a Chinese syllable"""
    if c in SKIP or c.isspace():
        return 0.0
    return 0.4 if c.isascii() else 1.0


def weight(s: str) -> float:
    return sum(cw(c) for c in s)


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
def build(sc, char_times, total_s, source):
    """char_times: per line, a [start, end] (seconds) for every character of the text; punctuation = zero length"""
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
    """sentences (。？！；), and a sentence longer than two caption rows is cut at the comma nearest its middle"""
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
    """one row, or two rows broken at the punctuation nearest the middle"""
    s = s.rstrip("。；，、：")
    if weight(s) <= CAP_ROW:
        return [s]
    commas = [i for i, c in enumerate(s[:-1]) if c in "，：、？"]
    mid = len(s) / 2
    k = min(commas, key=lambda i: abs(i - mid)) if commas else int(mid) - 1
    return [s[: k + 1].rstrip("，、"), s[k + 1:]]


def build_captions(lines, fps):
    caps = []
    for l in lines:
        segs = split_semantic(l["text"])
        first = lambda a, b: next(l["ch"][i][0] for i in range(a, b) if cw(l["text"][i]) > 0)
        last = lambda a, b: next(l["ch"][i][1] for i in reversed(range(a, b)) if cw(l["text"][i]) > 0)
        items = [[a, b] for a, b in segs]
        # a segment too short to read is merged with its neighbour inside the same line
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
        to = max(to, c["end"])  # never leave before the last character is spoken
        rows = rows_of(c["text"])
        out.append({"line": c["line"], "text": "".join(rows) if len(rows) == 1 else rows[0] + " " + rows[1], "rows": rows, "from": c["from"], "to": to})
    return out


def write_timeline(tl):
    TIMELINE.write_text(json.dumps(tl, ensure_ascii=False, separators=(",", ":")).replace('{"id"', '\n{"id"').replace('{"line"', '\n{"line"') + "\n", encoding="utf-8")
    short = [c for c in tl["captions"] if (c["to"] - c["from"]) / tl["fps"] < 1.0]
    print(f"timeline.json: {tl['frames']} frames = {tl['seconds']} s ({tl['source']}), {len(tl['lines'])} lines, {len(tl['captions'])} captions, {len(short)} under 1 s")


# ------------------------------------------------------------------ estimate (placeholder, no audio)
def estimate():
    sc = load_script()
    est = sc["estimate"]
    t = est["lead"]
    out = []
    L = sc["lines"]
    for i, ln in enumerate(L):
        ct = []
        for k, c in enumerate(ln["text"]):
            w = cw(c)
            if w == 0:
                ct.append([t, t])
                if k < len(ln["text"]) - 1:
                    t += est["pause"].get(c, 0.0)
            else:
                d = (est["latin"] if c.isascii() else 1.0) / est["cps"]
                ct.append([t, t + d])
                t += d
        out.append(ct)
        if i + 1 < len(L):
            t += est["sectionGap"] if L[i + 1]["section"] != ln["section"] else est["lineGap"]
    write_timeline(build(sc, out, t + est["tail"], "estimate (placeholder: run `npm run ap:sync` with the real voice)"))


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


# ------------------------------------------------------------------ word-level alignment
def is_tok(c):
    return cw(c) > 0 and c not in ",.?!;:'\"-"


def recognise(model_name):
    from faster_whisper import WhisperModel

    sc = load_script()
    prompt = "".join(l["text"] for l in sc["lines"])[:220]
    model = None
    for device, ctype in (("cuda", "float16"), ("cpu", "int8")):
        try:
            model = WhisperModel(model_name, device=device, compute_type=ctype)
            print(f"whisper {model_name} on {device}")
            break
        except Exception as e:  # no CUDA -> CPU
            print(f"  ({device} unavailable: {str(e)[:80]})")
    if model is None:
        raise SystemExit("could not load faster-whisper")
    segs, _ = model.transcribe(str(VO), language="zh", word_timestamps=True, initial_prompt=prompt, beam_size=5, vad_filter=False, condition_on_previous_text=True)
    words = []
    for s in segs:
        for w in s.words or []:
            words.append({"word": w.word, "start": float(w.start), "end": float(w.end)})
    return words


def pin(c):
    try:
        from pypinyin import lazy_pinyin

        return lazy_pinyin(c)[0].lower()
    except Exception:
        return c.lower()


def align_words(sc, words):
    """returns per-line per-character [start, end] seconds and the match rate"""
    R = []
    for w in words:
        cs = [c for c in w["word"] if is_tok(c)]
        if not cs:
            continue
        d = (w["end"] - w["start"]) / len(cs)
        for k, c in enumerate(cs):
            R.append((c.lower(), w["start"] + k * d, w["start"] + (k + 1) * d))
    S = [(li, i, c.lower()) for li, ln in enumerate(sc["lines"]) for i, c in enumerate(ln["text"]) if cw(c) > 0]
    n, m = len(S), len(R)
    if m == 0:
        raise SystemExit("no words recognised")
    sp = [pin(c) for _, _, c in S]
    rp = [pin(c) for c, _, _ in R]
    GAP = 0.8
    D = np.zeros((n + 1, m + 1))
    D[:, 0] = np.arange(n + 1) * GAP
    D[0, :] = np.arange(m + 1) * GAP
    B = np.zeros((n + 1, m + 1), dtype=np.int8)  # 0 diag, 1 up (script char unmatched), 2 left (extra recognised char)
    B[1:, 0] = 1
    B[0, 1:] = 2
    for i in range(1, n + 1):
        si, pi_ = S[i - 1][2], sp[i - 1]
        for j in range(1, m + 1):
            c = 0.0 if si == R[j - 1][0] else (0.25 if pi_ == rp[j - 1] else 1.0)
            a, b, d = D[i - 1, j - 1] + c, D[i - 1, j] + GAP, D[i, j - 1] + GAP
            if a <= b and a <= d:
                D[i, j], B[i, j] = a, 0
            elif b <= d:
                D[i, j], B[i, j] = b, 1
            else:
                D[i, j], B[i, j] = d, 2
    got = [None] * n
    good = 0
    i, j = n, m
    while i > 0 and j > 0:
        if B[i, j] == 0:
            got[i - 1] = (R[j - 1][1], R[j - 1][2])
            good += 1 if (S[i - 1][2] == R[j - 1][0] or sp[i - 1] == rp[j - 1]) else 0
            i, j = i - 1, j - 1
        elif B[i, j] == 1:
            i -= 1
        else:
            j -= 1
    rate = good / n
    known = [k for k in range(n) if got[k] is not None]
    if not known:
        raise SystemExit("nothing matched")
    for k in range(n):
        if got[k] is None:
            p = max([q for q in known if q < k], default=None)
            nx = min([q for q in known if q > k], default=None)
            t0 = got[p][1] if p is not None else max(0.0, got[nx][0] - 0.2 * (nx - k))
            t1 = got[nx][0] if nx is not None else t0 + 0.2 * (k - p)
            pa = p if p is not None else k - 1
            nb = nx if nx is not None else k + 1
            span = (t1 - t0) / max(1, nb - pa - 1)
            got[k] = (t0 + (k - pa - 1) * span, t0 + (k - pa) * span)
    prev = 0.0
    for k in range(n):
        a, b = got[k]
        a = max(a, prev)
        b = max(b, a + 0.04)
        got[k] = (a, b)
        prev = a
    ct = [[None] * len(l["text"]) for l in sc["lines"]]
    for (li, i, _), t in zip(S, got):
        ct[li][i] = list(t)
    return fill_punct(sc, ct), rate


def fill_punct(sc, ct):
    """punctuation sits at the end of the character before it"""
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


# ------------------------------------------------------------------ pause-level alignment (fallback)
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
                gaps.append((i * 0.01 + 0.01, j * 0.01 + 0.01))
            i = j
        else:
            i += 1
    return first * 0.01 + 0.015, last * 0.01 + 0.03, gaps


def dp_match(ph, t0, t1, gaps):
    """assign each phrase break to one pause, in order. returns [(gap_start, gap_end)] per break."""
    P, G = len(ph), len(gaps)
    W = sum(p[1] for p in ph)
    exp_pause = sum(0.4 if p[3] else 0.2 for p in ph[:-1])
    spc = max(0.1, (t1 - t0 - exp_pause) / W)
    gl = np.array([e - s for s, e in gaps])
    cum = np.concatenate([[0], np.cumsum(gl ** 2)])
    unused = lambda a, b: (cum[b] - cum[a]) / 0.04 if b > a else 0.0

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


def align_pauses(sc, x, sr):
    mono = x.mean(axis=1)
    ph = []  # (line index, weight, punct, is_line_end, c0, c1)
    for li, ln in enumerate(sc["lines"]):
        p = phrases(ln["text"])
        for k, (c0, c1, pu) in enumerate(p):
            ph.append((li, weight(ln["text"][c0:c1]), pu, k == len(p) - 1, c0, c1))
    P = len(ph)
    for min_gap in (0.14, 0.1, 0.07, 0.05):
        t0, t1, gaps = speech_gaps(mono, sr, min_gap)
        if len(gaps) >= P - 1:
            break
    if len(gaps) < P - 1:
        print(f"WARNING: only {len(gaps)} pauses for {P - 1} phrase breaks; timing falls back to proportional - check the printed line times")
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
    ct = [[None] * len(l["text"]) for l in sc["lines"]]
    for k, (li, w, _, _, c0, c1) in enumerate(ph):
        text = sc["lines"][li]["text"]
        t, spc = starts[k], (ends[k] - starts[k]) / max(w, 1e-6)
        for i in range(c0, c1):
            d = cw(text[i]) * spc
            if d > 0:
                ct[li][i] = [t, t + d]
                t += d
    return fill_punct(sc, ct), t1


def align(args):
    sc = load_script()
    if not VO.exists():
        raise SystemExit(f"missing {VO} - put the voice there (wav, any rate, mono or stereo)")
    sr, x = read_wav(VO)
    dur = len(x) / sr
    words_path = args.get("--words")
    ct, how = None, ""
    if words_path or "--pauses" not in args:
        try:
            words = json.loads(Path(words_path).read_text(encoding="utf-8")) if words_path else recognise(args.get("--model", os.environ.get("AP_WHISPER_MODEL", "small")))
            ct, rate = align_words(sc, words)
            print(f"matched {rate:.0%} of the script's characters to the voice")
            if rate < 0.7:
                print("WARNING: low match rate - check that vo.wav reads script.json, or try --model medium / large-v3")
            how = f"word-level ({'--words' if words_path else 'faster-whisper'}), {rate:.0%} matched"
        except ImportError:
            print("faster-whisper not installed -> pause-level alignment (pip install faster-whisper pypinyin for word level)")
    if ct is None:
        ct, _ = align_pauses(sc, x, sr)
        how = "pause-level"
    end = max(t[1] for line in ct for t in line)
    tl = build(sc, ct, max(dur, end + sc["estimate"]["tail"]), f"vo.wav {dur:.2f}s, {how}")
    write_timeline(tl)
    for ln in tl["lines"]:
        print(f"  {ln['id']}  {ln['from'] / tl['fps']:7.2f} - {ln['to'] / tl['fps']:7.2f}  {ln['text'][:18]}")


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
    print(f"subtitles: {path} ({len(rows)} cues, timeline source: {tl['source']})")


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
    tl = json.loads(TIMELINE.read_text(encoding="utf-8"))
    lines = {l["id"]: l for l in tl["lines"]}
    print(f"timeline: {tl['source']}, {tl['seconds']} s")
    for name, (f, kind, e) in sorted(event_times(tl).items(), key=lambda kv: kv[1][0]):
        ref = e.get("line") or e.get("after")
        w = e.get("word") or ("(line end)" if e.get("after") else "(line start)")
        print(f"  {f / tl['fps']:7.2f}s  f{f:5d}  {name:12s} {ref} {w}{'  [' + kind + ']' if kind else ''}")


# ------------------------------------------------------------------ mix
SR = 48000


def env(n, a, d):
    t = np.arange(n) / SR
    return np.minimum(1, t / max(a, 1e-4)) * np.exp(-t / d)


def sfx(kind, rng):
    if kind == "tick":  # soft section tick: short glass partial
        n = int(SR * 0.35)
        t = np.arange(n) / SR
        return (0.5 * np.sin(2 * np.pi * 1760 * t) * env(n, 0.002, 0.05) + 0.25 * np.sin(2 * np.pi * 2637 * t) * env(n, 0.002, 0.03)) * 0.5
    if kind == "hit":  # an active order crossing the spread: short bright transient over a low body
        n = int(SR * 0.6)
        t = np.arange(n) / SR
        f = 90 * np.exp(-t * 6) + 50
        body = np.sin(2 * np.pi * np.cumsum(f) / SR) * env(n, 0.003, 0.18)
        click = rng.standard_normal(n) * env(n, 0.0005, 0.006) * 0.4
        return (body + click) * 0.8
    if kind == "thump":  # low body hit under a key statement
        n = int(SR * 0.9)
        t = np.arange(n) / SR
        f = 70 * np.exp(-t * 3) + 42
        return np.sin(2 * np.pi * np.cumsum(f) / SR) * env(n, 0.004, 0.28) * 0.9
    if kind == "wall":  # an order meeting a passive wall that does not give: muted knock
        n = int(SR * 0.5)
        t = np.arange(n) / SR
        return (np.sin(2 * np.pi * 180 * t) * env(n, 0.002, 0.05) + 0.5 * np.sin(2 * np.pi * 62 * t) * env(n, 0.004, 0.15)) * 0.7
    if kind == "pop":  # poll chip
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
    return x * g[:, None]


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
    rng = np.random.default_rng(11)
    t = np.arange(n) / SR
    from scipy.ndimage import uniform_filter1d
    from scipy.signal import lfilter

    # bed: low drone with a slow swell plus air, ducked under the voice
    swell = 0.6 + 0.4 * np.sin(2 * np.pi * t / 21.0)
    bed = sum(a * np.sin(2 * np.pi * f * t + ph) for f, a, ph in [(49, 0.5, 0), (73.4, 0.32, 1.1), (98, 0.22, 2.3), (146.8, 0.08, 0.4)]) * swell
    air = lfilter([0.02], [1, -0.985], rng.standard_normal(n)) * 0.8
    fade = np.minimum(1, t / 2.5) * np.minimum(1, (t[-1] - t) / 2.5)
    bed = (bed + air) * fade
    vlev = uniform_filter1d(np.abs(vo.mean(axis=1)), int(0.3 * SR))
    duck = 1 - 0.55 * np.minimum(1, vlev / (np.percentile(vlev, 90) + 1e-9))
    bed = np.stack([bed * duck, bed * duck * 0.97], axis=1) * 0.05
    fx = np.zeros((n, 2))
    last = -1e9
    for name, (f, kind, _) in sorted(event_times(tl).items(), key=lambda kv: kv[1][0]):
        if not kind:
            continue
        ts_ = f / tl["fps"]
        if ts_ - last < 0.6:  # never a rapid run of cues
            continue
        last = ts_
        s = sfx(kind, rng)
        i = max(0, int(ts_ * SR))
        m = min(len(s), n - i)
        pan = 0.5 + 0.15 * math.sin(sum(map(ord, name)) % 7)
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
    argv = sys.argv[1:]
    cmd = argv[0] if argv else "estimate"
    opts = {}
    pos = []
    k = 1
    while k < len(argv):
        a = argv[k]
        if a == "--pauses":
            opts[a] = True
        elif a.startswith("--") and k + 1 < len(argv):
            opts[a] = argv[k + 1]
            k += 1
        else:
            pos.append(a)
        k += 1
    if cmd == "estimate":
        estimate()
    elif cmd == "align":
        align(opts)
    elif cmd == "srt":
        srt(pos[0] if pos else None)
    elif cmd == "mix":
        mix()
    elif cmd == "check":
        check()
    elif cmd == "all":
        align(opts)
        srt(pos[0] if pos else None)
        mix()
    else:
        raise SystemExit(__doc__)
