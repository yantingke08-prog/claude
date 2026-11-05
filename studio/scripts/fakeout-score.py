"""
Original score + sound design + mix for the v2 false-breakout short. Everything is synthesized
here (no samples, no third-party audio). Cues come from src/fakeout/timeline.json, and the event
frames replicate src/fakeout/director.ts (pierce / crash moments).

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


# ------------------------------------------------------------ replicate director.ts events
def smooth(x):
    return x * x * (3 - 2 * x)


def fail_path(u):
    if u < 0.32:
        return 4995 + 18 * smooth(u / 0.32)
    if u < 0.48:
        return 5013 - 1.2 * np.sin((u - 0.32) / 0.16 * np.pi)
    return 5012.5 + (4974 - 5012.5) * (1 - (1 - (u - 0.48) / 0.52) ** 2.2)


def cross_frame(keys, start):
    """keys: [(frame, u)] with linear segments from the first rise"""
    for f in range(int(start), int(start) + 200):
        u = np.interp(f, [k[0] for k in keys], [k[1] for k in keys])
        u0 = np.interp(f - 1, [k[0] for k in keys], [k[1] for k in keys])
        if fail_path(u) >= 5000 > fail_path(u0):
            return f / FPS
    return start / FPS


fr = lambda i: LN[i]["from"]  # noqa: E731
X_HOOK = cross_frame([(0, 0.1), (26, 0.32)], 0)
X_D4 = cross_frame([(fr("d4"), 0), (fr("d4") + 26, 0.32)], fr("d4"))
X_M3 = cross_frame([(fr("m3") - 10, 0), (fr("m3") + 20, 0.16)], fr("m3") - 10)
CRASH = [84 / FPS, (fr("d4") + 76) / FPS, (fr("m7") + 80) / FPS]
TITLE = L("h3", 14)


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

# tension drone under everything, darker in the mechanism
drone = (np.sin(2 * np.pi * 55 * t_(T_END)) * 0.5 + lp(saw(55, T_END, 0.004), 300) * 0.5) * 0.22
mus.add(drone, 0, gain=1.0)

# HOOK: pierce, stall, crash, title
sfx.add(zing(), X_HOOK - 0.02, gain=0.55, verb=0.25)
sfx.add(sparkle(), X_HOOK, gain=0.35, pan=0.2, verb=0.3)
sfx.add(sub_boom(1.2, 90, 40), X_HOOK, gain=0.55)
sfx.add(laser_hum(2.2) * env(int(2.2 * SR), 0.05, 1.0), 0, gain=0.05)
sfx.add(reverse_swell(1.0), CRASH[0] - 1.0, gain=0.35)
sfx.add(sub_boom(2.8), CRASH[0], gain=1.0)
sfx.add(braam(2.6, 40), CRASH[0], gain=0.45, verb=0.3)
sfx.add(glitch(0.45), TITLE - 0.05, gain=0.3, pan=-0.2)
sfx.add(braam(3.2, 45), TITLE, gain=0.5, verb=0.35)
sfx.add(sub_boom(2.0, 70, 35), TITLE, gain=0.7)

# DEFINE: a pulse groove arrives with the rewind
groove_a, groove_b = S("define"), S("mechanism")
bass_line = [45, 45, 48, 43]
k = 0
tt = groove_a
while tt < groove_b - 0.2:
    if k % 4 == 0:
        mus.add(kick(), tt, gain=0.5)
    mus.add(hat(), tt + beat / 2, gain=0.12, pan=0.3)
    if k % 2 == 0:
        mus.add(lp(saw(midi(bass_line[(k // 4) % 4] - 12), beat * 1.8, 0.002), 380) * env(int(beat * 1.8 * SR), 0.01, beat), tt, gain=0.3)
    tt += beat
    k += 1
sfx.add(reverse_swell(0.6), L("d1") - 0.55, gain=0.25)
for i in ("d2", "d3", "d4"):
    sfx.add(whoosh(0.7), L(i) - 0.1, gain=0.25, pan=0.3)
sfx.add(zing(0.6), X_D4, gain=0.3, verb=0.2)
sfx.add(sub_boom(1.6, 70, 34), CRASH[1], gain=0.6)
# "敲门" knock-knock, then the door chime on "进门"
cap = [c for c in TL["captions"] if c["line"] == "d5"]
knock_t = cap[1]["from"] / FPS - 0.45 if len(cap) > 1 else L("d5", 25)
sfx.add(knock(), knock_t, gain=0.55, verb=0.2)
sfx.add(knock(), knock_t + 0.2, gain=0.5, verb=0.2)
sfx.add(chime(69), Le("d5") - 0.5, gain=0.35, verb=0.45)

# MECHANISM: arpeggio that builds, drops out on "价格就是不涨", cascade on the stops
arp_notes = [57, 60, 64, 67, 64, 60]
tt = S("mechanism")
i = 0
cut_a, cut_b = L("m5", 60), L("m6", 30)  # the music empties out while price stalls
while tt < L("m8"):
    if not (cut_a <= tt < cut_b):
        prog = min(1, (tt - S("mechanism")) / (L("m5") - S("mechanism")))
        mus.add(pluck(arp_notes[i % 6] - (0 if tt < L("m7") else 2), beat * 0.45) * (0.5 + 0.5 * prog), tt, gain=0.18, pan=0.25 * np.sin(i))
        if i % 4 == 0:
            mus.add(kick(), tt, gain=0.45 * prog + 0.1)
    tt += beat / 2
    i += 1
# heartbeat while nothing happens
for j in range(int((cut_b - cut_a) / 0.8)):
    mus.add(thud(52), cut_a + j * 0.8, gain=0.5)
    mus.add(thud(48), cut_a + j * 0.8 + 0.22, gain=0.35)
# stops fire: a burst of ticks rising
for j in range(46):
    sfx.add(tick(rng.uniform(2200, 4200)), X_M3 + rng.uniform(0, 1.3), gain=0.18, pan=rng.uniform(-0.6, 0.6))
sfx.add(sub_boom(1.0, 100, 45), X_M3, gain=0.5)
# absorption: continuous fills hitting the wall
tt = X_M3 + 0.3
while tt < L("m6", 40) / 1:
    sfx.add(lp(noise(0.03), 2500) * env(int(0.03 * SR), 0.0005, 0.028, 8), tt, gain=0.22, pan=rng.uniform(-0.5, 0.5))
    if rng.random() < 0.25:
        sfx.add(thud(110) * 0.5, tt, gain=0.25)
    tt += rng.uniform(0.04, 0.11)
# stop cascade down
cas_a = L("m7", 30)
for j in range(60):
    tj = cas_a + (j / 60) ** 0.8 * 2.2
    sfx.add(tick(3600 - j * 40, 0.05), tj, gain=0.2, pan=rng.uniform(-0.6, 0.6))
fall = t_(2.4)
sfx.add(np.sin(2 * np.pi * np.cumsum(400 * np.exp(-fall * 1.2) + 50) / SR) * env(len(fall), 0.05, 1.0) * 0.6, cas_a, gain=0.35)
sfx.add(reverse_swell(0.8), CRASH[2] - 0.8, gain=0.3)
sfx.add(sub_boom(2.4), CRASH[2], gain=0.9)
sfx.add(braam(2.4, 40), CRASH[2], gain=0.35, verb=0.3)
mus.add(pad([57, 60, 64, 69], Le("m8") - L("m8") + 1.0), L("m8") - 0.3, gain=0.5, verb=0.4)

# SIGNALS: lighter pulse; ticks for each signal, stamp at the end
tt = S("signals")
i = 0
while tt < S("respond") - 0.2:
    mus.add(pluck([69, 72, 76, 72][i % 4], beat * 0.4), tt, gain=0.12, pan=0.3 * np.cos(i))
    if i % 4 == 0:
        mus.add(kick(), tt, gain=0.35)
    mus.add(hat(), tt + beat / 4, gain=0.07, pan=-0.3)
    tt += beat / 2
    i += 1
for sid in ("s1", "s2", "s3", "s4"):
    sfx.add(tick(2800, 0.05), L(sid), gain=0.3)
    sfx.add(whoosh(0.5, 400, 3000), L(sid) - 0.15, gain=0.18)
sfx.add(thud(70), L("s5", 2), gain=0.8)
sfx.add(glitch(0.25), L("s5", 1), gain=0.2)

# RESPOND: steady, a check tick per step
mus.add(pad([57, 60, 64, 71], S("close") - S("respond") + 0.6), S("respond") - 0.3, gain=0.45, verb=0.4)
for k_, at in enumerate((L("r1", 10), L("r1", 40), L("r2"), L("r2", 34), L("r2", 70))):
    sfx.add(tick(1800 + k_ * 300, 0.06), at / 1 if isinstance(at, float) else at, gain=0.35)
tt = S("respond")
while tt < S("close"):
    mus.add(kick(), tt, gain=0.3)
    tt += beat * 2

# CLOSE: swell, hit, tail
sfx.add(reverse_swell(1.4), L("e2") - 1.3, gain=0.4)
sfx.add(sub_boom(3.0, 70, 32), L("e2"), gain=0.8)
mus.add(chime(57), L("e2"), gain=0.5, verb=0.5)
mus.add(pad([45, 52, 57, 60, 64], T_END - L("e1") + 0.2), L("e1") - 0.2, gain=0.55, verb=0.5)

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
print("events (s): pierce", round(X_HOOK, 2), "crash", [round(c, 2) for c in CRASH], "title", round(TITLE, 2))
print("I =", re.findall(r"I:\s+(-?[\d.]+) LUFS", chk)[-1], "LUFS  TP =", re.findall(r"Peak:\s+(-?[\d.]+) dBFS", chk)[-1], "dBTP")
