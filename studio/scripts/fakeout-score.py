"""
Original score + sound design + mix for the v5 false-breakout short. Everything is synthesized
here (no samples, no third-party audio). Cues come from src/fakeout/timeline.json, and the event
frames come from src/fakeout/events.json, the same file director.ts reads.

Writes public/fakeout/mix.wav (48 kHz stereo, two-pass loudnorm to -14 LUFS, TP <= -1.5 dB).
"""
import json
import re
import shutil
import subprocess
from pathlib import Path

import numpy as np
from scipy.signal import butter, fftconvolve, sosfilt

ROOT = Path(__file__).resolve().parent.parent
FFMPEG = Path(shutil.which("ffmpeg") or Path.home() / "AppData/Local/Microsoft/WinGet/Links/ffmpeg.exe")  # full build (needs loudnorm / ebur128)
SR = 48000
TL = json.loads((ROOT / "src/fakeout/timeline.json").read_text(encoding="utf-8"))
FPS = TL["fps"]
N = int(TL["frames"] / FPS * SR)
LN = {l["id"]: l for l in TL["lines"]}
SEC = {s["id"]: s for s in TL["sections"]}
L = lambda i, off=0: (LN[i]["from"] + off) / FPS  # noqa: E731
Le = lambda i, off=0: (LN[i]["to"] + off) / FPS  # noqa: E731
S = lambda i, off=0: (SEC[i]["from"] + off) / FPS  # noqa: E731
rng = np.random.default_rng(2026)


# ------------------------------------------------------------ events shared with director.ts
EV = json.loads((ROOT / "src/fakeout/events.json").read_text(encoding="utf-8"))


def ev(name, off=0.0):
    line, frames = EV[name]
    return (LN[line]["from"] + frames) / FPS + off


PIERCE_HOOK = ev("hookPierce")
PIERCE = ev("pierce")
CRASH = ev("crash")


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


# ------------------------------------------------------------ score
mus, sfx = Bus(), Bus()
T_END = TL["frames"] / FPS
beat = 60 / 96

# story-chart closes for bars -33..-1 (src/fakeout/market.ts); the hook's ticks follow them in pitch
HOOK_CLOSES = [4922.25, 4921.75, 4955.75, 4963, 4968, 4974.5, 4973.25, 4974, 4972.5, 4973.25, 4973, 4979.5, 4972, 4974.25, 4983.25, 4988.75, 4978,
               4984.5, 4989, 4987.5, 4982, 4986, 4993.5, 4985, 4985.5, 4986.75, 4973.5, 4976, 4983.5, 4979.25, 4988.5, 4991, 4995]
PENTA = [0, 3, 5, 7, 10]


def glide(m0, m1, dur, a=0.05, r=None):
    """sine that slides from note m0 to m1, with a soft octave above"""
    t = t_(dur)
    f = midi(m0) * (midi(m1) / midi(m0)) ** (np.minimum(1, t / dur) ** 0.7)
    ph = 2 * np.pi * np.cumsum(f) / SR
    return (np.sin(ph) + 0.25 * np.sin(2 * ph)) * env(len(t), a, r if r is not None else dur * 0.6, 3)


def mallet(m, dur=0.22):
    """soft wooden tick for each bar of the hook: mid register, no hiss"""
    n = int(dur * SR)
    t = t_(dur)
    return (np.sin(2 * np.pi * midi(m) * t) + 0.3 * np.sin(2 * np.pi * midi(m) * 3.98 * t) * np.exp(-t * 40)) * env(n, 0.001, dur * 0.95, 7)


def riser(dur):
    """low riser: a sub sweep plus band-passed air that opens up"""
    t = t_(dur)
    sub = np.sin(2 * np.pi * np.cumsum(38 + 34 * (t / dur) ** 2) / SR) * (t / dur) ** 1.5
    air = noise(dur)
    out = np.zeros_like(air)
    blk = 2400
    for i in range(0, len(air), blk):
        c = 250 + 2200 * (i / len(air)) ** 2
        out[i : i + blk] = bp(air[i : i + blk], c * 0.7, c * 1.3)
    return sub * 0.8 + out * 0.25 * (t / dur) ** 2


def pitch_of(p):
    """map a price to the A minor pentatonic between A3 and E5"""
    k = int(round((p - 4920) / 80 * 9))
    return 57 + 12 * (k // 5) + PENTA[k % 5]


# tension drone under everything
drone = (np.sin(2 * np.pi * 55 * t_(T_END)) * 0.5 + lp(saw(55, T_END, 0.004), 300) * 0.5) * 0.22
mus.add(drone * np.minimum(1, t_(T_END) / 2.5), 0, gain=1.0)

# HOOK: a point of light, the chart builds bar by bar, the breakout pierces, pull back, three endings fan out
sfx.add(glide(81, 81, 1.4, a=0.4, r=0.9), 0.05, gain=0.05, verb=0.5)
rf, rt = ev("revealFrom"), ev("revealTo")
for j, c in enumerate(HOOK_CLOSES):
    u = -0.5 + np.sqrt(0.25 + 2 * j / len(HOOK_CLOSES))  # inverse of the accelerating reveal in director.ts
    sfx.add(mallet(pitch_of(c)), rf + (rt - rf) * u, gain=0.1 + 0.05 * j / len(HOOK_CLOSES), pan=-0.3 + 0.6 * j / len(HOOK_CLOSES))
sfx.add(riser(PIERCE_HOOK - rf + 0.05), rf, gain=0.38)
sfx.add(reverse_swell(0.6), PIERCE_HOOK - 0.58, gain=0.25)
sfx.add(sub_boom(2.0, 85, 34), PIERCE_HOOK, gain=0.85)
sfx.add(zing(0.7), PIERCE_HOOK - 0.02, gain=0.3, verb=0.25)
sfx.add(sparkle(0.9), PIERCE_HOOK, gain=0.18, pan=0.2, verb=0.3)
sfx.add(whoosh(1.0, 180, 1800), ev("pullFrom"), gain=0.32)
for k_, (m0, m1, pan) in enumerate(((64, 69, -0.4), (64, 64, 0.0), (64, 57, 0.4))):  # A rises, B holds, C falls
    sfx.add(glide(m0, m1, 2.4, a=0.3, r=1.2), ev("fanFrom") + 0.12 * k_, gain=0.09, pan=pan, verb=0.4)

# ENDINGS: pulse groove; each ending takes the screen with a whoosh, a low hit and its own chime
groove_a, groove_b = ev("soloA") - 0.2, S("mechanism") - 0.6
bass_line = [45, 45, 48, 43]
k = 0
tt = groove_a
while tt < groove_b:
    if k % 4 == 0:
        mus.add(kick(), tt, gain=0.5)
    mus.add(hat(), tt + beat / 2, gain=0.1, pan=0.3)
    if k % 2 == 0:
        mus.add(lp(saw(midi(bass_line[(k // 4) % 4] - 12), beat * 1.8, 0.002), 380) * env(int(beat * 1.8 * SR), 0.01, beat), tt, gain=0.3)
    tt += beat
    k += 1
for name, root, pan in (("soloA", 69, -0.3), ("swapB", 64, 0.0), ("swapC", 57, 0.3)):
    at = ev(name)
    sfx.add(whoosh(0.7, 300, 3000), at - 0.1, gain=0.24, pan=pan)
    sfx.add(thud(58), at + 0.25, gain=0.45)
    sfx.add(chime(root), at + 0.3, gain=0.1, verb=0.4)
sfx.add(sub_boom(1.2, 70, 36), L("c4", 100), gain=0.4)  # C closes back under the level
cap = [c for c in TL["captions"] if c["line"] == "c5"]
knock_t = cap[1]["from"] / FPS - 0.45 if len(cap) > 1 else L("c5", 25)
sfx.add(knock(), knock_t, gain=0.55, verb=0.2)
sfx.add(knock(), knock_t + 0.2, gain=0.5, verb=0.2)
sfx.add(chime(69), Le("c5") - 0.5, gain=0.3, verb=0.45)
sfx.add(reverse_swell(0.9), ev("toMain") - 0.85, gain=0.35)
sfx.add(sub_boom(1.4, 80, 38), ev("toMain"), gain=0.5)

# MECHANISM: arpeggio that builds, empties out while price stalls, cascade on the stops
arp_notes = [57, 60, 64, 67, 64, 60]
tt = S("mechanism")
i = 0
cut_a, cut_b = L("m5", 60), L("m6", 40)
while tt < L("m9"):
    if not (cut_a <= tt < cut_b):
        prog = min(1, (tt - S("mechanism")) / (L("m5") - S("mechanism")))
        mus.add(pluck(arp_notes[i % 6] - (0 if tt < L("m8") else 2), beat * 0.45) * (0.5 + 0.5 * prog), tt, gain=0.18, pan=0.25 * np.sin(i))
        if i % 4 == 0:
            mus.add(kick(), tt, gain=0.45 * prog + 0.1)
    tt += beat / 2
    i += 1
for j in range(int((cut_b - cut_a) / 0.8)):  # heartbeat while nothing happens
    mus.add(thud(52), cut_a + j * 0.8, gain=0.5)
    mus.add(thud(48), cut_a + j * 0.8 + 0.22, gain=0.35)
for j in range(46):  # stops fire: a burst of ticks
    sfx.add(tick(rng.uniform(2200, 4200)), PIERCE + rng.uniform(0, 1.3), gain=0.16, pan=rng.uniform(-0.6, 0.6))
sfx.add(zing(0.6), PIERCE - 0.02, gain=0.3, verb=0.2)
sfx.add(sub_boom(1.0, 100, 45), PIERCE, gain=0.5)
tt = ev("grind")  # absorption: continuous fills hitting the wall while bar 1 grinds up
while tt < ev("newHigh", 0.6):
    sfx.add(lp(noise(0.03), 2500) * env(int(0.03 * SR), 0.0005, 0.028, 8), tt, gain=0.22, pan=rng.uniform(-0.5, 0.5))
    if rng.random() < 0.25:
        sfx.add(thud(110) * 0.5, tt, gain=0.25)
    tt += rng.uniform(0.04, 0.11)
sfx.add(glitch(0.3), L("m6", 75), gain=0.15)  # the divergence line appears
sfx.add(whoosh(0.9, 3000, 300), ev("reject"), gain=0.25)  # pushed back down: the long upper wick
cas_a = CRASH - 0.3  # stop cascade down
for j in range(60):
    tj = cas_a + (j / 60) ** 0.8 * 2.2
    sfx.add(tick(3600 - j * 40, 0.05), tj, gain=0.18, pan=rng.uniform(-0.6, 0.6))
fall = t_(2.4)
sfx.add(np.sin(2 * np.pi * np.cumsum(400 * np.exp(-fall * 1.2) + 50) / SR) * env(len(fall), 0.05, 1.0) * 0.6, cas_a, gain=0.35)
sfx.add(reverse_swell(0.8), CRASH - 0.8, gain=0.3)
sfx.add(sub_boom(2.4), CRASH, gain=0.9)
sfx.add(braam(2.4, 40), CRASH, gain=0.35, verb=0.3)
mus.add(pad([57, 60, 64, 69], Le("m9") - L("m9") + 1.0), L("m9") - 0.3, gain=0.5, verb=0.4)

# SIGNALS: lighter pulse; the rest of C arrives; a tick for each signal, stamp at the end
tt = S("signals")
i = 0
while tt < S("respond") - 0.6:
    mus.add(pluck([69, 72, 76, 72][i % 4], beat * 0.4), tt, gain=0.12, pan=0.3 * np.cos(i))
    if i % 4 == 0:
        mus.add(kick(), tt, gain=0.35)
    mus.add(hat(), tt + beat / 4, gain=0.07, pan=-0.3)
    tt += beat / 2
    i += 1
for j in range(10):
    sfx.add(mallet(57 + PENTA[j % 5] + 12 * (j // 5)), ev("rest") + (ev("restEnd") - ev("rest")) * (j + 0.5) / 10, gain=0.12)
for sid in ("s1", "s2", "s3", "s4"):
    sfx.add(tick(2800, 0.05), L(sid), gain=0.26)
    sfx.add(whoosh(0.5, 400, 3000), L(sid) - 0.15, gain=0.16)
sfx.add(thud(70), L("s5", 2), gain=0.8)
sfx.add(glitch(0.25), L("s5", 1), gain=0.2)

# RESPOND: back to the three rows; the question, then a steady pulse and a check per step
sfx.add(reverse_swell(0.9), ev("toRows") - 0.85, gain=0.3)
sfx.add(whoosh(0.8, 300, 2600), ev("toRows") - 0.1, gain=0.25)
sfx.add(chime(64), L("r0", 4), gain=0.14, verb=0.5)
mus.add(pad([57, 60, 64, 71], S("close") - L("r1") + 0.6), L("r1") - 0.3, gain=0.45, verb=0.4)
for k_, at in enumerate((L("r1"), L("r1", 44), L("r2"), L("r4"), L("r4", 54))):
    sfx.add(mallet(69 + PENTA[k_]), at, gain=0.3)
for sid in ("r2", "r3"):
    sfx.add(whoosh(0.6), L(sid) - 0.2, gain=0.18)
tt = L("r1")
while tt < S("close"):
    mus.add(kick(), tt, gain=0.3)
    tt += beat * 2

# CLOSE: verdict ticks; then rewind, merge (low hit), three light trails fold onto the level, the question
for i_ in range(3):
    sfx.add(mallet(64 + PENTA[i_ + 1]), L("e2", 96 + i_ * 30), gain=0.26)
sfx.add(whoosh(0.8, 3200, 260), ev("rewind0") - 0.05, gain=0.3)  # the endings rewind into the breakout bar
sfx.add(reverse_swell(0.7), ev("glow") - 0.68, gain=0.3)
sfx.add(sub_boom(2.6, 72, 30), ev("glow"), gain=0.85)
sfx.add(braam(2.2, 45), ev("glow"), gain=0.22, verb=0.35)
for k_, (m0, pan) in enumerate(((76, -0.45), (69, 0.0), (57, 0.45))):  # three trails out, then converge on one note
    sfx.add(glide(m0, 64, ev("collapse1") - ev("trail0") + 0.4, a=0.15, r=0.5), ev("trail0") + 0.06 * k_, gain=0.08, pan=pan, verb=0.4)
sfx.add(whoosh(0.5, 2400, 500), ev("collapse1") - 0.3, gain=0.2)
mus.add(chime(57), ev("question"), gain=0.42, verb=0.5)
sfx.add(sub_boom(3.0, 60, 30), ev("question"), gain=0.5)
mus.add(pad([45, 52, 57, 60, 64], T_END - L("e1") + 0.2), L("e1") - 0.2, gain=0.5, verb=0.5)

# ------------------------------------------------------------ mix
vo = np.frombuffer(subprocess.run([str(FFMPEG), "-v", "error", "-i", str(ROOT / "public/fakeout/vo.wav"), "-ac", "1", "-ar", str(SR), "-f", "f32le", "-"], capture_output=True, check=True).stdout, dtype=np.float32).astype(np.float64)
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

raw = ROOT / "public/fakeout/mix-pre.wav"
out = ROOT / "public/fakeout/mix.wav"
subprocess.run([str(FFMPEG), "-v", "error", "-y", "-f", "f32le", "-ar", str(SR), "-ac", "2", "-i", "-", str(raw)], input=mix.T.astype(np.float32).tobytes(), check=True)
pre = "acompressor=threshold=-20dB:ratio=3:attack=8:release=120:makeup=4,alimiter=limit=0.18:attack=3:release=60"
meas = subprocess.run([str(FFMPEG), "-hide_banner", "-i", str(raw), "-af", f"{pre},loudnorm=I=-14:TP=-1.5:LRA=11:print_format=json", "-f", "null", "-"], capture_output=True, text=True).stderr
m = json.loads(re.search(r"\{[^{}]*\"input_i\"[^{}]*\}", meas, re.S).group(0))
ln = f"loudnorm=I=-14:TP=-1.5:LRA=11:measured_I={m['input_i']}:measured_TP={m['input_tp']}:measured_LRA={m['input_lra']}:measured_thresh={m['input_thresh']}:offset={m['target_offset']}:linear=true"
subprocess.run([str(FFMPEG), "-v", "error", "-y", "-i", str(raw), "-af", f"{pre},{ln}", "-ar", str(SR), str(out)], check=True)
chk = subprocess.run([str(FFMPEG), "-hide_banner", "-nostats", "-i", str(out), "-af", "ebur128=peak=true", "-f", "null", "-"], capture_output=True, text=True).stderr
print("events (s): hook pierce", round(PIERCE_HOOK, 2), "fan", round(ev("fanFrom"), 2), "solos", [round(ev(n), 2) for n in ("soloA", "swapB", "swapC")], "pierce", round(PIERCE, 2), "crash", round(CRASH, 2), "merge", round(ev("glow"), 2), "question", round(ev("question"), 2))
print("I =", re.findall(r"I:\s+(-?[\d.]+) LUFS", chk)[-1], "LUFS  TP =", re.findall(r"Peak:\s+(-?[\d.]+) dBFS", chk)[-1], "dBTP")
