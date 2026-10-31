"""
Procedural soundtrack for the showreel.

Reads src/timeline.json (the same file the video reads), so every hit, riser, ping and
whoosh lands on the exact frame of its visual cue. Pure numpy/scipy synthesis: no samples,
no external assets. Output: public/soundtrack.wav (48 kHz, 16-bit stereo).

Usage: python scripts/soundtrack.py
"""
import json
import shutil
import subprocess
import wave
from pathlib import Path

import numpy as np
from scipy.signal import butter, fftconvolve, sosfilt

ROOT = Path(__file__).resolve().parent.parent
TL = json.loads((ROOT / "src" / "timeline.json").read_text(encoding="utf-8"))
SR = 48000
FPS = TL["fps"]
ORDER = ["intro", "globe", "wave", "outro"]
rng = np.random.default_rng(7)

starts, t = {}, 0
for s in ORDER:
    starts[s] = t
    t += TL["scenes"][s] - TL["transition"]
TOTAL_FRAMES = sum(TL["scenes"].values()) - TL["transition"] * (len(ORDER) - 1)
DUR = TOTAL_FRAMES / FPS
N = int(DUR * SR)


def sec(scene, frame):
    return (starts[scene] + frame) / FPS


def hz(midi):
    return 440.0 * 2 ** ((midi - 69) / 12)


def lowpass(x, cutoff, order=2):
    return sosfilt(butter(order, cutoff, "low", fs=SR, output="sos"), x)


def highpass(x, cutoff, order=2):
    return sosfilt(butter(order, cutoff, "high", fs=SR, output="sos"), x)


def bandpass(x, lo, hi, order=2):
    return sosfilt(butter(order, [lo, hi], "band", fs=SR, output="sos"), x)


L = np.zeros(N)
R = np.zeros(N)
send = np.zeros((2, N))  # reverb send bus


def place(sig, at, gain=1.0, pan=0.0, verb=0.3):
    """Mix a mono signal in at time `at` (seconds) with equal-power pan and reverb send."""
    i = int(at * SR)
    if i >= N:
        return
    sig = sig[: N - i]
    gl, gr = np.cos((pan + 1) * np.pi / 4), np.sin((pan + 1) * np.pi / 4)
    L[i : i + len(sig)] += sig * gain * gl
    R[i : i + len(sig)] += sig * gain * gr
    send[0, i : i + len(sig)] += sig * gain * gl * verb
    send[1, i : i + len(sig)] += sig * gain * gr * verb


def env_adsr(n, a, d, s, r):
    a, d, r = int(a * SR), int(d * SR), int(r * SR)
    sus = max(0, n - a - d - r)
    return np.concatenate([np.linspace(0, 1, a), np.linspace(1, s, d), np.full(sus, s), np.linspace(s, 0, r)])[:n]


def supersaw(freq, length, voices=5, detune=0.012):
    tt = np.arange(int(length * SR)) / SR
    out = np.zeros_like(tt)
    for v in range(voices):
        f = freq * (1 + detune * (v - voices // 2) / voices)
        ph = rng.random()
        out += 2 * ((tt * f + ph) % 1) - 1
    return out / voices


# ---------------- pad bed: one chord per scene, crossfaded ----------------
CHORDS = {
    "intro": [38, 45, 52, 57, 64],      # D  A  E  A  E   (open fifths, mysterious)
    "globe": [34, 41, 50, 57, 62, 65],  # Bb F  D  A  D  F (Bbmaj7, wide)
    "wave": [36, 43, 52, 55, 62, 67],   # C  G  E  G  D  G (Cadd9, lift)
    "outro": [38, 45, 50, 54, 57, 66],  # D  A  D  F# A F# (D major: resolution)
}
for s in ORDER:
    t0 = starts[s] / FPS
    length = TL["scenes"][s] / FPS + 1.2
    n = int(length * SR)
    chord = sum(supersaw(hz(m), length) * (0.6 if m < 45 else 1.0) for m in CHORDS[s])
    tt = np.arange(n) / SR
    sweep = 500 + 1600 * (0.5 + 0.5 * np.sin(2 * np.pi * tt / length - np.pi / 2))
    # time-varying lowpass approximated in blocks (filter state carried across blocks)
    out = np.zeros(n)
    block = 2400
    zi = None
    for b in range(0, n, block):
        sos = butter(2, float(sweep[b]), "low", fs=SR, output="sos")
        if zi is None:
            zi = np.zeros((sos.shape[0], 2))
        out[b : b + block], zi = sosfilt(sos, chord[b : b + block], zi=zi)
    fade = int(0.9 * SR)
    e = np.ones(n)
    e[:fade] = np.linspace(0, 1, fade) ** 2
    e[-fade:] = np.linspace(1, 0, fade) ** 2
    place(out * e, t0, gain=0.075, pan=0, verb=0.5)

# sub drone under everything
tt = np.arange(N) / SR
sub = np.sin(2 * np.pi * hz(26) * tt) * (0.6 + 0.4 * np.sin(2 * np.pi * 0.07 * tt))
place(sub * env_adsr(N, 2.0, 0.1, 1.0, 2.0), 0, gain=0.10, verb=0.0)


# ---------------- one-shots ----------------
def impact(size=1.0):
    n = int(3.0 * SR)
    t_ = np.arange(n) / SR
    f = 34 + 110 * np.exp(-t_ * 18)
    kick = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t_ * (2.2 / size))
    crack = lowpass(rng.standard_normal(n), 3500) * np.exp(-t_ * 22)
    air = highpass(rng.standard_normal(n), 6000) * np.exp(-t_ * 3.5) * 0.25
    return np.tanh((kick * 1.4 + crack * 0.5 + air) * 1.3)


def riser(length):
    n = int(length * SR)
    t_ = np.arange(n) / SR
    k = t_ / length
    noise = rng.standard_normal(n)
    out = np.zeros(n)
    block = 1200
    zi = None
    for b in range(0, n, block):
        c = 300 + 7000 * k[b] ** 2.2
        sos = butter(2, [c, min(c * 1.8, 20000)], "band", fs=SR, output="sos")
        if zi is None:
            zi = np.zeros((sos.shape[0], 2))
        out[b : b + block], zi = sosfilt(sos, noise[b : b + block], zi=zi)
    chirp = np.sin(2 * np.pi * np.cumsum(180 * 2 ** (k * 3.5)) / SR) * 0.25
    return (out * 2.2 + chirp) * k**2.4


def whoosh(length=1.3):
    n = int(length * SR)
    t_ = np.arange(n) / SR
    e = np.sin(np.pi * t_ / length) ** 3
    return bandpass(rng.standard_normal(n), 400, 5000) * e * 1.6


def bell(midi, length=1.6):
    n = int(length * SR)
    t_ = np.arange(n) / SR
    f = hz(midi)
    mod = np.sin(2 * np.pi * f * 3.5 * t_) * 2.2 * np.exp(-t_ * 6)
    return np.sin(2 * np.pi * f * t_ + mod) * np.exp(-t_ * 3.2)


def tick():
    n = int(0.25 * SR)
    t_ = np.arange(n) / SR
    return np.sin(2 * np.pi * 2400 * t_) * np.exp(-t_ * 60) + highpass(rng.standard_normal(n), 5000) * np.exp(-t_ * 90) * 0.5


def soft_kick():
    n = int(0.5 * SR)
    t_ = np.arange(n) / SR
    f = 45 + 90 * np.exp(-t_ * 30)
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t_ * 9)


def hat():
    n = int(0.08 * SR)
    t_ = np.arange(n) / SR
    return highpass(rng.standard_normal(n), 7000) * np.exp(-t_ * 70)


cues = TL["cues"]

# intro: galaxy riser -> logo impact -> shimmer arpeggio
a, b = cues["intro"]["riser"]
place(riser((b - a) / FPS), sec("intro", a), gain=0.5, verb=0.4)
for f in cues["intro"]["hit"]:
    place(impact(1.2), sec("intro", f), gain=0.9, verb=0.6)
for i, m in enumerate([74, 81, 86, 88, 93]):
    place(bell(m, 2.2), sec("intro", cues["intro"]["shimmer"][0]) + i * 0.09, gain=0.12, pan=-0.6 + i * 0.3, verb=0.8)

# transitions: a whoosh centred on every scene boundary
for s in ORDER[1:]:
    place(whoosh(), starts[s] / FPS + TL["transition"] / FPS / 2 - 0.65, gain=0.35, pan=0, verb=0.4)

# globe: entrance hit + a bell "ping" at each arc launch and arrival (pentatonic, panned by order)
for f in cues["globe"]["hit"]:
    place(impact(0.7), sec("globe", f), gain=0.45, verb=0.6)
penta = [62, 65, 67, 69, 72, 74, 77, 79]
for i, arc in enumerate(TL["arcs"]):
    pan = -0.7 + 1.4 * ((i * 0.37) % 1)
    place(tick(), sec("globe", arc["start"]), gain=0.05, pan=pan, verb=0.3)
    place(bell(penta[i % len(penta)]), sec("globe", arc["start"] + arc["dur"]), gain=0.1, pan=pan, verb=0.7)

# wave: title hit, then a 120 BPM pulse locked to the hit, card ticks, exit riser
hit = cues["wave"]["hit"][0]
place(impact(1.0), sec("wave", hit), gain=0.75, verb=0.55)
exit_a, exit_b = cues["wave"]["riser"]
beat = FPS // 2  # 120 BPM at 30 fps = one beat every 15 frames
for f in range(hit + beat * 2, exit_b, beat):
    k = min(1.0, (f - hit) / (beat * 8))
    place(soft_kick(), sec("wave", f), gain=0.32 * k, verb=0.05)
    place(hat(), sec("wave", f + beat / 2), gain=0.06 * k, pan=0.3, verb=0.1)
for i, f in enumerate(cues["wave"]["tick"]):
    place(tick(), sec("wave", f), gain=0.12, pan=-0.6 + i * 0.4, verb=0.4)
    place(bell(penta[i + 3], 1.0), sec("wave", f), gain=0.06, pan=-0.6 + i * 0.4, verb=0.6)
place(riser((exit_b - exit_a) / FPS), sec("wave", exit_a), gain=0.55, verb=0.4)

# outro: reform riser -> hit -> big boom -> final chord bell
a, b = cues["outro"]["riser"]
place(riser((b - a) / FPS), sec("outro", a), gain=0.45, verb=0.4)
for f in cues["outro"]["hit"]:
    place(impact(1.0), sec("outro", f), gain=0.7, verb=0.6)
for f in cues["outro"]["boom"]:
    place(impact(2.2), sec("outro", f), gain=1.0, verb=0.9)
    for i, m in enumerate([62, 66, 69, 74, 78]):
        place(bell(m, 3.5), sec("outro", f) + 0.25 + i * 0.06, gain=0.07, pan=-0.5 + i * 0.25, verb=0.9)

# ---------------- reverb (synthetic stereo IR) + master ----------------
ir_len = int(3.2 * SR)
t_ir = np.arange(ir_len) / SR
irs = [lowpass(rng.standard_normal(ir_len), 7000) * np.exp(-t_ir * 2.1) for _ in range(2)]
wetL = fftconvolve(send[0], irs[0])[:N]
wetR = fftconvolve(send[1], irs[1])[:N]
scale = 0.035
mix = np.stack([L + wetL * scale, R + wetR * scale])
mix = highpass(mix, 22)

fade = int(1.0 * SR)
mix[:, -fade:] *= np.linspace(1, 0, fade) ** 2
mix = np.tanh(mix * 1.0)
mix *= 0.89 / np.max(np.abs(mix))  # about -1 dBFS peak

out = ROOT / "public" / "soundtrack.wav"
raw = ROOT / "public" / "soundtrack_raw.wav"
out.parent.mkdir(exist_ok=True)
pcm = (mix.T * 32767).astype("<i2")
with wave.open(str(raw), "wb") as w:
    w.setnchannels(2)
    w.setsampwidth(2)
    w.setframerate(SR)
    w.writeframes(pcm.tobytes())
# Loudness-normalise to the streaming standard (-14 LUFS integrated, -1.5 dBTP) with FFmpeg.
ffmpeg = shutil.which("ffmpeg")
if ffmpeg:
    subprocess.run(
        [ffmpeg, "-y", "-v", "error", "-i", str(raw), "-af", "loudnorm=I=-14:TP=-1.5:LRA=14", "-ar", str(SR), str(out)],
        check=True,
    )
    raw.unlink()
else:
    raw.replace(out)
    print("ffmpeg not on PATH: skipped loudness normalisation")
print(f"wrote {out} ({DUR:.2f}s, {TOTAL_FRAMES} frames)")
