"""
Original score + sound design + mix for the 战前觉醒 episode. Everything is synthesized
here (no samples, no third-party audio). Cues come from src/zhanqian/timeline.json, and the event
frames come from src/zhanqian/events.json, the same file director.ts reads.

v6 sound rules: whoosh / thud only on chapter openings and the two big turns (the dive into the candle, the
stop chain going off); a data label landing gets one light tick (src/zhanqian/labels.json, written by the
layout QA); ordinary cuts and annotation cards make no sound.

Writes public/zhanqian/mix.wav (48 kHz stereo, two-pass loudnorm to -14 LUFS, TP <= -1.5 dB).
"""
import json
import os
import re
import shutil
import subprocess
from pathlib import Path

import numpy as np
from scipy.signal import butter, fftconvolve, sosfilt

ROOT = Path(__file__).resolve().parent.parent
FFMPEG = Path(os.environ.get("FFMPEG") or shutil.which("ffmpeg") or Path.home() / "AppData/Local/Microsoft/WinGet/Links/ffmpeg.exe")  # full build (needs loudnorm / ebur128)
SR = 48000
TL = json.loads((ROOT / "src/zhanqian/timeline.json").read_text(encoding="utf-8"))
FPS = TL["fps"]
N = int(TL["frames"] / FPS * SR)
LN = {l["id"]: l for l in TL["lines"]}
SEC = {s["id"]: s for s in TL["sections"]}
L = lambda i, off=0: (LN[i]["from"] + off) / FPS  # noqa: E731
Le = lambda i, off=0: (LN[i]["to"] + off) / FPS  # noqa: E731
S = lambda i, off=0: (SEC[i]["from"] + off) / FPS  # noqa: E731
rng = np.random.default_rng(2026)


# ------------------------------------------------------------ dsp helpers
def t_(dur):
    return np.arange(int(dur * SR)) / SR


def env(n, a=0.005, r=0.2, curve=4.0):
    e = np.ones(n)
    na = max(1, int(a * SR))
    e[:na] = np.linspace(0, 1, na)
    nr = min(n - na, int(r * SR))
    if nr > 0:
        e[-nr:] *= np.exp(-curve * np.linspace(0, 1, nr))
    return e


def lp(x, fc, order=2):
    return sosfilt(butter(order, min(fc, SR / 2 - 100), "low", fs=SR, output="sos"), x)


def hp(x, fc, order=2):
    return sosfilt(butter(order, fc, "high", fs=SR, output="sos"), x)


def bp(x, f0, f1, order=2):
    return sosfilt(butter(order, [f0, f1], "band", fs=SR, output="sos"), x)


def noise(dur):
    return rng.standard_normal(int(dur * SR))


def saw(freq, dur, detune=0.0):
    t = t_(dur)
    out = np.zeros_like(t)
    for d in (-detune, 0, detune):
        ph = (t * freq * (1 + d)) % 1.0
        out += 2 * ph - 1
    return out / 3


def midi(m):
    return 440 * 2 ** ((m - 69) / 12)


IR = None


def reverb(x, size=2.2, mix=0.25):
    global IR
    if IR is None:
        n = int(size * SR)
        tail = np.exp(-np.linspace(0, 7, n))
        IR = np.stack([lp(noise(size) * tail, 6000), lp(noise(size) * tail, 6000)])
        IR /= np.abs(IR).sum(axis=1, keepdims=True) ** 0.5 * 4
    wet = np.stack([fftconvolve(x, IR[0])[: len(x)], fftconvolve(x, IR[1])[: len(x)]])
    return np.stack([x, x]) * (1 - mix) + wet * mix


class Bus:
    def __init__(self):
        self.y = np.zeros((2, N))

    def add(self, sig, at, gain=1.0, pan=0.0, verb=0.0):
        sig = np.asarray(sig, dtype=np.float64)
        st = reverb(sig, mix=verb) if verb > 0 else np.stack([sig, sig])
        st[0] *= np.sqrt(0.5 * (1 - pan)) * np.sqrt(2)
        st[1] *= np.sqrt(0.5 * (1 + pan)) * np.sqrt(2)
        i = int(at * SR)
        if i >= N:
            return
        j = min(N, i + st.shape[1])
        if i < 0:
            st = st[:, -i:]
            i = 0
            j = min(N, st.shape[1])
        self.y[:, i:j] += st[:, : j - i] * gain


# ------------------------------------------------------------ instruments
def sub_boom(dur=2.5, f0=62, f1=30):
    t = t_(dur)
    f = f1 + (f0 - f1) * np.exp(-t * 6)
    s = np.sin(2 * np.pi * np.cumsum(f) / SR)
    click = lp(noise(0.02), 4000) * env(int(0.02 * SR), 0.0005, 0.018)
    s[: len(click)] += click * 0.8
    return np.tanh(1.6 * s * env(len(t), 0.002, dur * 0.95, 3.5))


def braam(dur=3.0, root=45):
    t = t_(dur)
    x = sum(saw(midi(root + iv), dur, 0.006) * g for iv, g in ((0, 1), (7, 0.5), (12, 0.6), (-12, 0.8)))
    sweep = 200 + 2600 * np.exp(-t * 2.2)
    out = np.zeros_like(x)
    blk = 2400
    for i in range(0, len(x), blk):  # time-varying low-pass in blocks
        out[i : i + blk] = lp(x[i : i + blk], sweep[i])
    return np.tanh(2.2 * out) * env(len(t), 0.01, dur * 0.9, 2.5)


def zing(dur=0.9):
    t = t_(dur)
    f = 900 + 4200 * (1 - np.exp(-t * 9))
    s = np.sin(2 * np.pi * np.cumsum(f) / SR) * 0.5 + bp(noise(dur), 3000, 9000) * 0.5
    return s * env(len(t), 0.003, dur * 0.9, 5)


def sparkle(dur=1.2):
    out = np.zeros(int(dur * SR))
    for _ in range(40):
        f = rng.uniform(3500, 9000)
        st = int(rng.uniform(0, dur * 0.7) * SR)
        n = int(0.06 * SR)
        g = np.sin(2 * np.pi * f * t_(0.06)) * env(n, 0.001, 0.058, 6)
        out[st : st + n] += g[: len(out) - st] * rng.uniform(0.2, 0.6)
    return out


def reverse_swell(dur=1.0):
    x = hp(noise(dur), 800) * np.linspace(0, 1, int(dur * SR)) ** 3
    return lp(x, 7000)


def whoosh(dur=0.8, f0=300, f1=4000):
    t = t_(dur)
    x = noise(dur)
    out = np.zeros_like(x)
    blk = 1200
    for i in range(0, len(x), blk):
        c = f0 + (f1 - f0) * np.sin(np.pi * i / len(x))
        out[i : i + blk] = bp(x[i : i + blk], max(60, c * 0.6), c * 1.4)
    return out * np.sin(np.pi * t / dur) ** 2


def tick(freq=3200, dur=0.04):
    n = int(dur * SR)
    return (np.sin(2 * np.pi * freq * t_(dur)) * 0.6 + hp(noise(dur), 5000) * 0.4) * env(n, 0.0005, dur * 0.95, 8)


def knock():
    n = int(0.18 * SR)
    body = np.sin(2 * np.pi * 190 * t_(0.18)) * env(n, 0.001, 0.17, 9)
    thump = lp(noise(0.18), 900) * env(n, 0.001, 0.05, 10)
    return body * 0.8 + thump


def chime(root=69):
    out = np.zeros(int(2.5 * SR))
    for iv, d in ((0, 0), (7, 0.05), (12, 0.1), (16, 0.15)):
        n = int((2.5 - d) * SR)
        s = np.sin(2 * np.pi * midi(root + iv) * t_(2.5 - d)) * env(n, 0.003, 2.3, 4)
        out[int(d * SR) : int(d * SR) + n] += s * 0.3
    return out


def thud(f=80):
    return sub_boom(0.6, f * 1.6, f) * 0.7


def laser_hum(dur):
    t = t_(dur)
    s = sum(np.sin(2 * np.pi * f * t) / k for k, f in enumerate((120, 240, 360, 2400), 1))
    return s * (0.8 + 0.2 * np.sin(2 * np.pi * 5.5 * t))


def glitch(dur=0.5):
    out = np.zeros(int(dur * SR))
    seg = int(0.035 * SR)
    for i in range(0, len(out) - seg, seg):
        if rng.random() < 0.6:
            out[i : i + seg] = bp(noise(0.035), rng.uniform(300, 2000), rng.uniform(2500, 8000)) * rng.uniform(0.3, 1)
    return out


def kick():
    return sub_boom(0.35, 120, 48) * 0.9


def hat(dur=0.05):
    n = int(dur * SR)
    return hp(noise(dur), 7000) * env(n, 0.0005, dur * 0.9, 7)


def pluck(m, dur=0.5):
    n = int(dur * SR)
    return lp(saw(midi(m), dur, 0.003), 2400) * env(n, 0.002, dur * 0.95, 6)


def pad(chord, dur):
    x = sum(saw(midi(m), dur, 0.004) for m in chord) / len(chord)
    return lp(x, 900) * env(int(dur * SR), 1.2, 1.5, 3)




# ------------------------------------------------------------ word timing (same as cue.ts Lc: TTS word marks)
def _wt(ch):
    return 1.6 if ch in "，。：；？！、" else 0.45 if ch.isascii() and ch.isalpha() else 1.0


def Lc(i, sub, off=0):
    ln = LN[i]
    k = ln["text"].index(sub)
    ms = [[0, ln["from"]], *ln["marks"], [len(ln["text"]), ln["to"]]]
    j = 0
    while j + 1 < len(ms) and ms[j + 1][0] <= k:
        j += 1
    (i0, f0), (i1, f1) = ms[j], ms[min(j + 1, len(ms) - 1)]
    w = lambda a, b: sum(_wt(c) for c in ln["text"][a:b])  # noqa: E731
    fr_ = f0 if i1 <= i0 else round(f0 + (f1 - f0) * w(i0, k) / max(1e-6, w(i0, i1)))
    return (fr_ + off) / FPS


# ------------------------------------------------------------ the film's event schedule (exported from the TS by zhanqian-cues.ts)
CUES = json.loads((ROOT / "src/zhanqian/cues.json").read_text(encoding="utf-8"))
fr = 1 / FPS
SHOTS = CUES["shots"]
TRADES = CUES["trades"]
HOPS = [h["at"] / FPS for h in CUES["hops"]]
MINES = [(m["at"] / FPS, m["n"]) for m in CUES["mines"]]
FIRST_HIT = CUES["firstHit"] / FPS

# ------------------------------------------------------------ score
mus, sfx = Bus(), Bus()
T_END = TL["frames"] / FPS
A0, O0, ST0, P0, W0, R0 = S("auction"), S("orders"), S("stops"), S("players"), S("anatomy"), S("recap")
BPM = 96
beat = 60 / BPM


def mallet(m, dur=0.22):
    n = int(dur * SR)
    t = t_(dur)
    return (np.sin(2 * np.pi * midi(m) * t) + 0.3 * np.sin(2 * np.pi * midi(m) * 3.98 * t) * np.exp(-t * 40)) * env(n, 0.001, dur * 0.95, 7)


def glide(m0, m1, dur, a=0.05, r=None):
    t = t_(dur)
    f = midi(m0) * (midi(m1) / midi(m0)) ** (np.minimum(1, t / dur) ** 0.7)
    ph = 2 * np.pi * np.cumsum(f) / SR
    return (np.sin(ph) + 0.25 * np.sin(2 * ph)) * env(len(t), a, r if r is not None else dur * 0.6, 3)


# drone under everything: A, with a fifth that opens up in the second half
drone = (np.sin(2 * np.pi * 55 * t_(T_END)) * 0.5 + lp(saw(55, T_END, 0.004), 280) * 0.5) * 0.2
mus.add(drone * np.minimum(1, t_(T_END) / 1.5), 0)

# ---- hook: shadow slam, wick, dive, swarm, title (one hit per shot)
sfx.add(reverse_swell(0.3), max(0, L("h1") - 0.3), gain=0.35)
sfx.add(sub_boom(2.4, 70, 30), L("h1"), gain=0.95)
sfx.add(braam(2.6, 45), L("h1"), gain=0.32, verb=0.35)
sfx.add(whoosh(1.0, 200, 2400), L("h2", -6), gain=0.32)
sfx.add(sparkle(2.0), Lc("h2", "藏在"), gain=0.14, verb=0.5)
mus.add(chime(57), L("h3"), gain=0.42, verb=0.5)
sfx.add(sub_boom(2.0, 55, 28), L("h3"), gain=0.45)

# ---- only chapter openings (the colour-flash cuts) get a whoosh + thud; ordinary cuts stay silent
for i, c in enumerate(SHOTS):
    at = c["at"] / FPS
    if at < A0 - 0.3:
        continue
    if c.get("trans") == "morph":  # no cut: the wipe into the footprint gets a long, soft sweep
        sfx.add(whoosh(0.7, 300, 3800), at - 0.1, gain=0.18)
        continue
    if c["flash"]:
        sfx.add(whoosh(0.35, 400, 5200), at - 0.18, gain=0.2, pan=0.2 if i % 2 else -0.2)
        sfx.add(thud(90), at, gain=0.18)

# ---- a pulse runs through the book, the stops and the table; it doubles up in the stop montage
t = A0 + 0.4
bar = 0
CHORDS = [[45, 52, 57, 60], [41, 48, 53, 57], [43, 50, 55, 59], [40, 47, 52, 56]]
while t < W0 - 0.5:
    hot = ST0 <= t < P0
    mus.add(kick(), t, gain=0.4 if hot else 0.32)
    mus.add(kick(), t + 2 * beat, gain=0.24)
    if hot:
        mus.add(kick(), t + 1.5 * beat, gain=0.2)
        mus.add(kick(), t + 3 * beat, gain=0.26)
    for h in range(8 if hot else 4):
        mus.add(hat(), t + h * beat / (2 if hot else 1) + beat / 2, gain=0.04, pan=0.3)
    if bar % 2 == 0:
        mus.add(pad(CHORDS[(bar // 2) % 4], 8 * beat + 0.4), t, gain=0.22, verb=0.4)
    t += 4 * beat
    bar += 1

# ---- the walls go up: one soft tick per level as it lands
for l in CUES["levels"]:
    k = abs(l["k"])
    m = 57 - k if l["side"] == "bid" else 60 + [0, 3, 5, 7, 10][k % 5] + 12 * (k // 5)
    sfx.add(mallet(m), l["at"] / FPS, gain=0.09 if l["side"] == "bid" else 0.08, pan=-0.2 if l["side"] == "bid" else 0.2)
for r in CUES["refills"]:
    for j in range(r["n"]):
        sfx.add(mallet(52 + j % 3), r["at"] / FPS + j * 2 * fr, gain=0.06, pan=-0.15)

# ---- every trade: a click (stops lower and harder); every hop: a rising pluck
for i, tr in enumerate(TRADES):
    sfx.add(tick(2600 if not tr["stop"] else 1800), tr["f"] / FPS, gain=0.16 if not tr["stop"] else 0.2, pan=float(np.clip(((i % 7) - 3) / 7, -0.5, 0.5)))
sfx.add(knock(), FIRST_HIT, gain=0.5)
mus.add(chime(64), FIRST_HIT + 0.05, gain=0.18, verb=0.5)
for i, at in enumerate(HOPS):
    mus.add(pluck(57 + [0, 3, 5, 7, 10, 12, 15][i]), at, gain=0.3, verb=0.3)
# the stops: a fuse under the trigger, then each one goes off
sfx.add(reverse_swell(0.7), Lc("s3", "触发价") - 0.6, gain=0.3)
for i, (at, n) in enumerate(MINES):
    sfx.add(thud(70 + 6 * i), at, gain=0.4, pan=(i - 1.5) * 0.2)
    sfx.add(zing(0.5), at, gain=0.12)
sfx.add(sub_boom(2.2, 64, 30), MINES[-1][0] + 0.2, gain=0.7)
sfx.add(braam(2.0, 43), MINES[-1][0] + 0.2, gain=0.22, verb=0.35)

# ---- participants: no hit per player (their cuts stay silent); the data labels tick below

# ---- the candle again: the path squeezed into four numbers, the two cases side by side
for i in range(9):
    sfx.add(tick(2400), Lc("w3", "可能是") + i * 0.42, gain=0.12)
for i in range(7):
    sfx.add(tick(1500, 0.05), Lc("w4", "止损被") + 0.2 + i * 0.26, gain=0.14)

# ---- recap: three cards, the question, the caveat, next time
for i, at in enumerate(CUES["recapCards"]):
    sfx.add(tick(3000), at / FPS, gain=0.1)
    mus.add(pluck(64 + [0, 3, 7][i]), at / FPS, gain=0.26, verb=0.3)
mus.add(pad([45, 52, 57, 60, 64], T_END - L("r1") + 0.2), L("r1") - 0.2, gain=0.42, verb=0.5)
mus.add(chime(57), Lc("r1", "是谁"), gain=0.3, verb=0.5)
mus.add(chime(64), L("r3"), gain=0.34, verb=0.6)

# ---- every data label: one light tick as it lands (no tick for cards, chrome or conclusion type)
LABELS = ROOT / "src/zhanqian/labels.json"
for i, lb in enumerate(json.loads(LABELS.read_text(encoding="utf-8")) if LABELS.exists() else []):
    sfx.add(tick(3600, 0.03), lb["at"] / FPS + 0.1, gain=0.07, pan=0.15 if i % 2 else -0.15)
# ------------------------------------------------------------ mix
vo = np.frombuffer(subprocess.run([str(FFMPEG), "-v", "error", "-i", str(ROOT / "public/zhanqian/vo.wav"), "-ac", "1", "-ar", str(SR), "-f", "f32le", "-"], capture_output=True, check=True).stdout, dtype=np.float32).astype(np.float64)
vo = np.pad(vo, (0, max(0, N - len(vo))))[:N]
# voice envelope → duck music ~10 dB, sfx ~4 dB
e = np.abs(vo)
e = lp(e, 6)
e = np.clip(e / (np.percentile(e, 95) + 1e-9), 0, 1)
duck_m = 1 - 0.68 * e
duck_s = 1 - 0.35 * e
music = mus.y * duck_m
effects = sfx.y * duck_s
# voice: gentle presence + low cut
v = hp(vo, 80)
v = v + 0.25 * bp(v, 2500, 5000)
voice = np.stack([v, v])
mix = voice * 1.0 + music * 0.55 + effects * 0.6
# fade tail
fade = int(0.8 * SR)
mix[:, -fade:] *= np.linspace(1, 0, fade)
mix /= np.max(np.abs(mix)) + 1e-9
mix *= 0.7

raw = ROOT / "public/zhanqian/mix-pre.wav"
out = ROOT / "public/zhanqian/mix.wav"
subprocess.run([str(FFMPEG), "-v", "error", "-y", "-f", "f32le", "-ar", str(SR), "-ac", "2", "-i", "-", str(raw)], input=mix.T.astype(np.float32).tobytes(), check=True)
pre = "acompressor=threshold=-20dB:ratio=3:attack=8:release=120:makeup=4,alimiter=limit=0.18:attack=3:release=60"
meas = subprocess.run([str(FFMPEG), "-hide_banner", "-i", str(raw), "-af", f"{pre},loudnorm=I=-14:TP=-1.5:LRA=11:print_format=json", "-f", "null", "-"], capture_output=True, text=True).stderr
m = json.loads(re.search(r"\{[^{}]*\"input_i\"[^{}]*\}", meas, re.S).group(0))
ln = f"loudnorm=I=-14:TP=-1.5:LRA=11:measured_I={m['input_i']}:measured_TP={m['input_tp']}:measured_LRA={m['input_lra']}:measured_thresh={m['input_thresh']}:offset={m['target_offset']}:linear=true"
subprocess.run([str(FFMPEG), "-v", "error", "-y", "-i", str(raw), "-af", f"{pre},{ln}", "-ar", str(SR), str(out)], check=True)
chk = subprocess.run([str(FFMPEG), "-hide_banner", "-nostats", "-i", str(out), "-af", "ebur128=peak=true", "-f", "null", "-"], capture_output=True, text=True).stderr
print("I =", re.findall(r"I:\s+(-?[\d.]+) LUFS", chk)[-1], "LUFS  TP =", re.findall(r"Peak:\s+(-?[\d.]+) dBFS", chk)[-1], "dBTP")
