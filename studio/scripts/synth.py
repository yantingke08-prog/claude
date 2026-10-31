"""
Shared synthesis toolkit for every soundtrack in this studio.

Pure numpy/scipy: oscillators, filters, one-shots (impact, riser, whoosh, bell, tick...)
and a Mixer with a reverb send and a loudness-normalised WAV writer. Scripts import this
and only describe *what* plays *when*.
"""
import shutil
import subprocess
import wave
from pathlib import Path

import numpy as np
from scipy.signal import butter, fftconvolve, sosfilt

SR = 48000
rng = np.random.default_rng(7)


def hz(midi):
    return 440.0 * 2 ** ((midi - 69) / 12)


def lowpass(x, cutoff, order=2):
    return sosfilt(butter(order, cutoff, "low", fs=SR, output="sos"), x)


def highpass(x, cutoff, order=2):
    return sosfilt(butter(order, cutoff, "high", fs=SR, output="sos"), x)


def bandpass(x, lo, hi, order=2):
    return sosfilt(butter(order, [lo, hi], "band", fs=SR, output="sos"), x)


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


def pad(chord, length, lo=500, span=1600, fade=0.9):
    """Detuned-saw chord through a slowly sweeping lowpass (filter state carried across blocks)."""
    n = int(length * SR)
    tone = sum(supersaw(hz(m), length) * (0.6 if m < 45 else 1.0) for m in chord)
    tt = np.arange(n) / SR
    sweep = lo + span * (0.5 + 0.5 * np.sin(2 * np.pi * tt / length - np.pi / 2))
    out = np.zeros(n)
    block = 2400
    zi = None
    for b in range(0, n, block):
        sos = butter(2, float(sweep[b]), "low", fs=SR, output="sos")
        if zi is None:
            zi = np.zeros((sos.shape[0], 2))
        out[b : b + block], zi = sosfilt(sos, tone[b : b + block], zi=zi)
    f = int(fade * SR)
    e = np.ones(n)
    e[:f] = np.linspace(0, 1, f) ** 2
    e[-f:] = np.linspace(1, 0, f) ** 2
    return out * e


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


class Mixer:
    """Stereo bus + reverb send. `place` mixes mono one-shots in at a time in seconds."""

    def __init__(self, seconds):
        self.n = int(seconds * SR)
        self.seconds = seconds
        self.L = np.zeros(self.n)
        self.R = np.zeros(self.n)
        self.send = np.zeros((2, self.n))

    def place(self, sig, at, gain=1.0, pan=0.0, verb=0.3):
        i = int(at * SR)
        if i >= self.n:
            return
        sig = sig[: self.n - i]
        gl, gr = np.cos((pan + 1) * np.pi / 4), np.sin((pan + 1) * np.pi / 4)
        self.L[i : i + len(sig)] += sig * gain * gl
        self.R[i : i + len(sig)] += sig * gain * gr
        self.send[0, i : i + len(sig)] += sig * gain * gl * verb
        self.send[1, i : i + len(sig)] += sig * gain * gr * verb

    def sub_drone(self, midi=26, gain=0.10):
        tt = np.arange(self.n) / SR
        sub = np.sin(2 * np.pi * hz(midi) * tt) * (0.6 + 0.4 * np.sin(2 * np.pi * 0.07 * tt))
        self.place(sub * env_adsr(self.n, 2.0, 0.1, 1.0, 2.0), 0, gain=gain, verb=0.0)

    def write(self, out: Path, lufs=-14):
        """Synthetic-IR reverb, soft clip, then FFmpeg EBU R128 loudness normalisation."""
        ir_len = int(3.2 * SR)
        t_ir = np.arange(ir_len) / SR
        irs = [lowpass(rng.standard_normal(ir_len), 7000) * np.exp(-t_ir * 2.1) for _ in range(2)]
        wet_l = fftconvolve(self.send[0], irs[0])[: self.n]
        wet_r = fftconvolve(self.send[1], irs[1])[: self.n]
        scale = 0.035
        mix = np.stack([self.L + wet_l * scale, self.R + wet_r * scale])
        mix = highpass(mix, 22)
        fade = int(1.0 * SR)
        mix[:, -fade:] *= np.linspace(1, 0, fade) ** 2
        mix = np.tanh(mix * 1.0)
        mix *= 0.89 / np.max(np.abs(mix))  # about -1 dBFS peak

        raw = out.with_name(out.stem + "_raw.wav")
        out.parent.mkdir(exist_ok=True)
        pcm = (mix.T * 32767).astype("<i2")
        with wave.open(str(raw), "wb") as w:
            w.setnchannels(2)
            w.setsampwidth(2)
            w.setframerate(SR)
            w.writeframes(pcm.tobytes())
        ffmpeg = shutil.which("ffmpeg")
        if ffmpeg:
            subprocess.run(
                [ffmpeg, "-y", "-v", "error", "-i", str(raw), "-af", f"loudnorm=I={lufs}:TP=-1.5:LRA=14", "-ar", str(SR), str(out)],
                check=True,
            )
            raw.unlink()
        else:
            raw.replace(out)
            print("ffmpeg not on PATH: skipped loudness normalisation")
        print(f"wrote {out} ({self.seconds:.2f}s)")
