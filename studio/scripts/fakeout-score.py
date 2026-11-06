"""
Original score + sound design + mix for the v4 false-breakout short. Everything is synthesized
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
TITLE = ev("title")
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

# tension drone under everything
drone = (np.sin(2 * np.pi * 55 * t_(T_END)) * 0.5 + lp(saw(55, T_END, 0.004), 300) * 0.5) * 0.22
mus.add(drone, 0, gain=1.0)

# HOOK: the shared breakout bar pierces the wire, the chart splits into three, title hit
sfx.add(laser_hum(3.0) * env(int(3.0 * SR), 0.05, 1.2), 0, gain=0.05)
sfx.add(zing(), PIERCE_HOOK - 0.02, gain=0.55, verb=0.25)
sfx.add(sparkle(), PIERCE_HOOK, gain=0.35, pan=0.2, verb=0.3)
sfx.add(sub_boom(1.6, 90, 40), PIERCE_HOOK, gain=0.7)
sfx.add(reverse_swell(0.9), ev("fork") - 0.8, gain=0.3)
sfx.add(whoosh(0.9, 200, 3000), ev("fork"), gain=0.35, pan=-0.4)
sfx.add(whoosh(0.9, 260, 3600), ev("fork", 0.08), gain=0.35, pan=0.4)
for j in range(12):  # each ending bar lands with a soft tick, three rows at once
    tj = ev("endsFrom") + (ev("endsTo") - ev("endsFrom")) * (j + 0.5) / 12
    sfx.add(tick(2400 + j * 60, 0.04), tj, gain=0.14, pan=-0.4)
    sfx.add(tick(2000 + j * 50, 0.04), tj + 0.02, gain=0.12)
    sfx.add(tick(1600 - j * 40, 0.04), tj + 0.04, gain=0.12, pan=0.4)
sfx.add(glitch(0.45), TITLE - 0.05, gain=0.3, pan=-0.2)
sfx.add(braam(3.2, 45), TITLE, gain=0.5, verb=0.35)
sfx.add(sub_boom(2.0, 70, 35), TITLE, gain=0.7)

# COMPARE: a pulse groove; a whoosh each time a row lights up; knock-knock and the door chime
groove_a, groove_b = S("compare"), S("mechanism") - 0.6
bass_line = [45, 45, 48, 43]
k = 0
tt = groove_a
while tt < groove_b:
    if k % 4 == 0:
        mus.add(kick(), tt, gain=0.5)
    mus.add(hat(), tt + beat / 2, gain=0.12, pan=0.3)
    if k % 2 == 0:
        mus.add(lp(saw(midi(bass_line[(k // 4) % 4] - 12), beat * 1.8, 0.002), 380) * env(int(beat * 1.8 * SR), 0.01, beat), tt, gain=0.3)
    tt += beat
    k += 1
for i, pan in (("c2", -0.3), ("c3", 0.0), ("c4", 0.3)):
    sfx.add(whoosh(0.7), L(i) - 0.25, gain=0.25, pan=pan)
    sfx.add(chime(64 if i == "c2" else 62 if i == "c3" else 57), L(i), gain=0.12, verb=0.4)
sfx.add(sub_boom(1.2, 70, 36), L("c4", 100), gain=0.45)  # C closes back under the level
cap = [c for c in TL["captions"] if c["line"] == "c5"]
knock_t = cap[1]["from"] / FPS - 0.45 if len(cap) > 1 else L("c5", 25)
sfx.add(knock(), knock_t, gain=0.55, verb=0.2)
sfx.add(knock(), knock_t + 0.2, gain=0.5, verb=0.2)
sfx.add(chime(69), Le("c5") - 0.5, gain=0.35, verb=0.45)
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
    sfx.add(tick(rng.uniform(2200, 4200)), PIERCE + rng.uniform(0, 1.3), gain=0.18, pan=rng.uniform(-0.6, 0.6))
sfx.add(zing(0.6), PIERCE - 0.02, gain=0.3, verb=0.2)
sfx.add(sub_boom(1.0, 100, 45), PIERCE, gain=0.5)
tt = ev("grind")  # absorption: continuous fills hitting the wall while bar 1 grinds up
while tt < ev("newHigh", 0.6):
    sfx.add(lp(noise(0.03), 2500) * env(int(0.03 * SR), 0.0005, 0.028, 8), tt, gain=0.22, pan=rng.uniform(-0.5, 0.5))
    if rng.random() < 0.25:
        sfx.add(thud(110) * 0.5, tt, gain=0.25)
    tt += rng.uniform(0.04, 0.11)
for sid in ("m6",):
    sfx.add(glitch(0.3), L(sid, 75), gain=0.15)  # the divergence line appears
sfx.add(whoosh(0.9, 3000, 300), ev("reject"), gain=0.25)  # pushed back down: the long upper wick
cas_a = CRASH - 0.3  # stop cascade down
for j in range(60):
    tj = cas_a + (j / 60) ** 0.8 * 2.2
    sfx.add(tick(3600 - j * 40, 0.05), tj, gain=0.2, pan=rng.uniform(-0.6, 0.6))
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
    sfx.add(tick(1800 - j * 60, 0.04), ev("rest") + (ev("restEnd") - ev("rest")) * (j + 0.5) / 10, gain=0.15)
for sid in ("s1", "s2", "s3", "s4"):
    sfx.add(tick(2800, 0.05), L(sid), gain=0.3)
    sfx.add(whoosh(0.5, 400, 3000), L(sid) - 0.15, gain=0.18)
sfx.add(thud(70), L("s5", 2), gain=0.8)
sfx.add(glitch(0.25), L("s5", 1), gain=0.2)

# RESPOND: back to the three rows; steady pulse, a check tick per step
sfx.add(reverse_swell(0.9), ev("toRows") - 0.85, gain=0.3)
sfx.add(whoosh(0.8, 300, 2600), ev("toRows") - 0.1, gain=0.25)
mus.add(pad([57, 60, 64, 71], S("close") - S("respond") + 0.6), S("respond") - 0.3, gain=0.45, verb=0.4)
for k_, at in enumerate((L("r1"), L("r1", 50), L("r2"), L("r4"), L("r4", 54))):
    sfx.add(tick(1800 + k_ * 300, 0.06), at, gain=0.35)
for sid in ("r2", "r3"):
    sfx.add(whoosh(0.6), L(sid) - 0.2, gain=0.18)
tt = S("respond")
while tt < S("close"):
    mus.add(kick(), tt, gain=0.3)
    tt += beat * 2

# CLOSE: the question, swell, hit, tail
for i, sid in enumerate(("A", "B", "C")):
    sfx.add(tick(2200 + i * 300, 0.06), L("e2", 60 + i * 30), gain=0.3)
sfx.add(reverse_swell(1.4), L("e4") - 1.3, gain=0.4)
sfx.add(sub_boom(3.0, 70, 32), L("e4"), gain=0.8)
mus.add(chime(57), L("e4"), gain=0.5, verb=0.5)
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
print("events (s): hook pierce", round(PIERCE_HOOK, 2), "title", round(TITLE, 2), "pierce", round(PIERCE, 2), "crash", round(CRASH, 2))
print("I =", re.findall(r"I:\s+(-?[\d.]+) LUFS", chk)[-1], "LUFS  TP =", re.findall(r"Peak:\s+(-?[\d.]+) dBFS", chk)[-1], "dBTP")
