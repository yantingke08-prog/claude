"""
Original score, sound design and final mix for 《同一根大阳线》. Everything is synthesized here (no samples).

Music: D minor, 100 BPM, i-VI-III-VII (Dm Bb F C), layers enter by section:
  hook  : sub hit + reverse riser into the reveal, then pulse
  why   : pad only (room for the thesis)
  pos   : pad + plucked arpeggio
  vol   : + half-time kick
  hold  : + four-on-floor kick, hats, rising filter (tension)
  recap : full band
  end   : pad + final hit, ring-out
Sound design is placed on the moments in src/samecandle2/events.json (the same file the picture reads).
Writes public/samecandle2/mix.wav (48 kHz stereo 16-bit, two-pass loudnorm -14 LUFS, TP -1.5 dB).
"""
import json
import os
import shutil
import subprocess
import tempfile
from pathlib import Path

import numpy as np
from scipy.signal import butter, fftconvolve, sosfilt

ROOT = Path(__file__).resolve().parent.parent
FFMPEG = Path(os.environ.get("FFMPEG") or shutil.which("ffmpeg") or Path.home() / "AppData/Local/Microsoft/WinGet/Links/ffmpeg.exe")
SR = 48000
TL = json.loads((ROOT / "src/samecandle2/timeline.json").read_text(encoding="utf-8"))
EV = json.loads((ROOT / "src/samecandle2/events.json").read_text(encoding="utf-8"))
FPS = TL["fps"]
DUR = TL["frames"] / FPS
N = int(DUR * SR)
LINES = {l["id"]: l for l in TL["lines"]}
SECS = {s["id"]: s for s in TL["sections"]}
rng = np.random.default_rng(1108)


def ev(name):
    e = EV[name]
    if "frame" in e:
        return e["frame"] / FPS
    l = LINES[e["line"]]
    if e.get("end"):
        return (l["to"] + e.get("off", 0)) / FPS
    f = l["from"]
    for idx, fr in l["marks"]:
        if idx <= e.get("char", 0):
            f = fr
    return (f + e.get("off", 0)) / FPS


def sec(name):
    return SECS[name]["from"] / FPS


# ------------------------------------------------------------------ dsp
def tt(d):
    return np.arange(int(d * SR)) / SR


def env(n, a=0.005, r=0.3, curve=5.0):
    e = np.ones(n)
    na = max(1, min(n, int(a * SR)))
    e[:na] = np.linspace(0, 1, na)
    nr = min(n - na, int(r * SR))
    if nr > 0:
        e[-nr:] *= np.exp(-curve * np.linspace(0, 1, nr))
    return e


def sos(kind, f, order=2):
    return butter(order, f, kind, fs=SR, output="sos")


def lp(x, f, o=2):
    return sosfilt(sos("low", min(f, SR / 2 - 200), o), x)


def hp(x, f, o=2):
    return sosfilt(sos("high", f, o), x)


def bp(x, a, b, o=2):
    return sosfilt(sos("band", [a, b], o), x)


def noise(d):
    return rng.standard_normal(int(d * SR))


def midi(m):
    return 440.0 * 2 ** ((m - 69) / 12)


def saw(f, d, det=0.0, ph=0.0):
    t = tt(d)
    out = np.zeros_like(t)
    for k in (-det, 0.0, det):
        out += 2 * ((t * f * (1 + k) + ph) % 1.0) - 1
    return out / 3


def place(buf, x, t0, gain=1.0):
    i = int(t0 * SR)
    if i >= len(buf) or i + len(x) <= 0:
        return
    if i < 0:
        x, i = x[-i:], 0
    j = min(len(buf), i + len(x))
    buf[i:j] += gain * x[: j - i]


def sweep_lp(x, f0, f1, curve=2.0, block=1024):
    """Time-varying low-pass by blocks (cheap filter sweep)."""
    out = np.zeros_like(x)
    nb = int(np.ceil(len(x) / block))
    zi = None
    for b in range(nb):
        u = (b / max(1, nb - 1)) ** curve
        f = f0 * (f1 / f0) ** u
        s = sos("low", min(f, SR / 2 - 200), 2)
        seg = x[b * block : (b + 1) * block]
        if zi is None:
            zi = np.zeros((s.shape[0], 2))
        y, zi = sosfilt(s, seg, zi=zi)
        out[b * block : b * block + len(seg)] = y
    return out


def reverb_ir(d=2.8, decay=3.2, bright=6000):
    n = int(d * SR)
    t = np.arange(n) / SR
    l = lp(rng.standard_normal(n), bright) * np.exp(-decay * t)
    r = lp(rng.standard_normal(n), bright) * np.exp(-decay * t)
    l[: int(0.012 * SR)] = 0
    r[: int(0.017 * SR)] = 0
    return np.stack([l, r]) / np.sqrt(np.sum(l**2))


IR = reverb_ir()


def verb(x, wet=0.3):
    l = fftconvolve(x, IR[0])[: len(x)]
    r = fftconvolve(x, IR[1])[: len(x)]
    return np.stack([x * (1 - wet) + l * wet, x * (1 - wet) + r * wet])


# ------------------------------------------------------------------ music
BPM = 100
BEAT = 60 / BPM
BAR = 4 * BEAT
CHORDS = [[50, 53, 57, 62], [46, 50, 53, 58], [41, 45, 48, 53], [48, 52, 55, 60]]  # Dm Bb F C (2 bars each)
ROOTS = [38, 34, 41, 36]


def chord_at(t):
    return int(t // (2 * BAR)) % 4


def intensity_curve():
    """Per-sample level for each layer (smooth section automation)."""
    t = np.arange(N) / SR
    def ramp(a, b, x0, x1):
        return np.clip((t - x0) / max(1e-3, x1 - x0), 0, 1) * (b - a) + a
    lay = {}
    s = {k: sec(k) for k in SECS}
    rev = ev("reveal")
    # pad: present from reveal, full from why
    lay["pad"] = np.clip(ramp(0, 1, rev, rev + 1.5), 0, 1) * (1 - 0.35 * np.clip((t - s["end"]) / 3, 0, 1) * 0)
    # pluck arp: hook tail, drops out in why, back in pos
    a = ramp(0, 1, rev + 0.2, rev + 0.8) * (1 - ramp(0, 1, s["why"] - 0.3, s["why"] + 0.4))
    a += ramp(0, 1, s["pos"] - 0.2, s["pos"] + 1.0) * (1 - ramp(0, 1, s["end"], s["end"] + 1.2))
    lay["arp"] = np.clip(a, 0, 1)
    k = ramp(0, 0.75, s["vol"] - 0.1, s["vol"] + 0.5) + ramp(0, 0.25, s["hold"], s["hold"] + 0.5)
    k *= 1 - ramp(0, 1, s["end"] - 0.2, s["end"] + 0.3)
    lay["kick"] = np.clip(k, 0, 1)
    lay["hat"] = np.clip(ramp(0, 1, s["hold"], s["hold"] + 1) * (1 - ramp(0, 1, s["end"] - 0.2, s["end"] + 0.3)), 0, 1)
    lay["bass"] = np.clip(ramp(0, 1, rev, rev + 0.4) * (1 - 0.6 * ramp(0, 1, s["why"], s["why"] + 0.5)) + 0.6 * ramp(0, 1, s["pos"], s["pos"] + 1), 0, 1) * (1 - ramp(0, 0.7, s["end"], s["end"] + 2))
    return lay


def music():
    lay = intensity_curve()
    out = np.zeros((2, N))
    # pad: detuned saws per chord, low-passed; stereo by different detune
    pad = np.zeros((2, N))
    nbars = int(np.ceil(DUR / (2 * BAR))) + 1
    for i in range(nbars):
        t0 = i * 2 * BAR
        notes = CHORDS[i % 4]
        d = 2 * BAR + 0.6
        for ch, det in ((0, 0.004), (1, 0.0055)):
            s = sum(saw(midi(m), d, det, ph=0.13 * ch + 0.07 * m) for m in notes) / len(notes)
            s = lp(s, 1400) * env(len(s), a=0.6, r=0.8, curve=3)
            place(pad[ch], s, t0, 0.5)
    out += pad * lay["pad"] * 0.55
    # bass: sustained root sine + saw, 8th-note pulse on tension sections
    bass = np.zeros(N)
    step = BEAT / 2
    for k in range(int(DUR / step)):
        t0 = k * step
        r = ROOTS[chord_at(t0)]
        f = midi(r)
        x = np.sin(2 * np.pi * f * tt(step * 0.95)) + 0.3 * lp(saw(f, step * 0.95), 600)
        x *= env(len(x), a=0.004, r=step * 0.6, curve=3)
        place(bass, x, t0, 0.45 if k % 2 == 0 else 0.3)
    out += np.stack([bass, bass]) * lay["bass"] * 0.55
    # plucked arpeggio 16ths, ping-pong
    arp = np.zeros((2, N))
    s16 = BEAT / 4
    pattern = [0, 2, 1, 3, 2, 1, 3, 2]
    for k in range(int(DUR / s16)):
        t0 = k * s16
        notes = CHORDS[chord_at(t0)]
        m = notes[pattern[k % 8]] + 12
        f = midi(m)
        x = saw(f, 0.32, 0.002) * env(int(0.32 * SR), a=0.002, r=0.3, curve=7)
        x = lp(x, 2600)
        place(arp[k % 2], x, t0, 0.16 if k % 4 else 0.22)
    out += arp * lay["arp"]
    # kick: half-time in vol (beats 1 & 3), four on the floor once intensity > .9
    kick = np.zeros(N)
    kd = 0.45
    kt = tt(kd)
    kf = 45 + 110 * np.exp(-kt * 32)
    kx = np.sin(2 * np.pi * np.cumsum(kf) / SR) * np.exp(-kt * 7.5)
    kx += 0.25 * hp(noise(kd), 2500) * np.exp(-kt * 90)
    for k in range(int(DUR / BEAT)):
        t0 = k * BEAT
        lvl = lay["kick"][min(N - 1, int(t0 * SR))]
        if lvl <= 0.01:
            continue
        if lvl < 0.9 and k % 2:
            continue
        place(kick, kx, t0, 0.8 * lvl)
    out += np.stack([kick, kick]) * 0.62
    # hats: offbeat 8ths
    hat = np.zeros((2, N))
    hx = hp(noise(0.06), 7000) * np.exp(-tt(0.06) * 70)
    for k in range(int(DUR / (BEAT / 2))):
        if k % 2 == 0:
            continue
        t0 = k * BEAT / 2
        lvl = lay["hat"][min(N - 1, int(t0 * SR))]
        if lvl > 0.01:
            place(hat[(k // 2) % 2], hx, t0, 0.18 * lvl)
    out += hat
    # tension filter rise on the pad during hold
    a, b = int(sec("hold") * SR), int(sec("recap") * SR)
    rise = noise((b - a) / SR)
    rise = sweep_lp(rise, 300, 5000, curve=1.6) * np.linspace(0, 1, b - a) ** 2 * 0.05
    out[:, a:b] += rise
    # end: everything but pad fades; music out at answer + 3 s
    t = np.arange(N) / SR
    fade = np.clip((DUR - 0.2 - t) / 2.0, 0, 1)
    out *= fade
    return np.stack([verb(out[0], 0.22)[0], verb(out[1], 0.22)[1]])


# ------------------------------------------------------------------ sound design
def whoosh(d=0.9, f0=300, f1=4000, gain=1.0, rev=False):
    x = noise(d)
    x = sweep_lp(x, f0, f1, curve=1.2)
    e = np.sin(np.pi * np.linspace(0, 1, len(x))) ** 1.6
    x = hp(x, 150) * e
    return (x[::-1] if rev else x) * gain


def boom(d=2.6, f0=62, gain=1.0):
    t = tt(d)
    f = f0 * (1 + 1.6 * np.exp(-t * 14))
    x = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 2.1)
    x += 0.35 * lp(noise(d), 900) * np.exp(-t * 6)
    x += 0.2 * hp(noise(d), 3000) * np.exp(-t * 40)
    return np.tanh(x * 1.6) * gain


def riser(d=1.4, gain=1.0):
    x = noise(d)
    x = sweep_lp(x, 200, 9000, curve=2.2) * np.linspace(0, 1, len(x)) ** 2.4
    t = tt(d)
    tone = np.sin(2 * np.pi * np.cumsum(220 * 2 ** (2 * t / d)) / SR) * (t / d) ** 2 * 0.25
    return (hp(x, 200) + tone) * gain


def tick(gain=1.0, f=2400):
    t = tt(0.09)
    return (np.sin(2 * np.pi * f * t) * np.exp(-t * 60) + 0.3 * hp(noise(0.09), 5000) * np.exp(-t * 120)) * gain


def chime(f=880, gain=1.0, d=1.6):
    t = tt(d)
    x = sum(np.sin(2 * np.pi * f * h * t) * np.exp(-t * (2.5 + h)) / h for h in (1, 2.01, 3.03, 4.2))
    return x * env(len(x), a=0.002, r=d * 0.6) * gain


def laser(d=0.7, gain=1.0):
    t = tt(d)
    f = 3200 * np.exp(-t * 3) + 500
    x = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 4) * 0.4
    x += bp(noise(d), 2000, 7000) * np.exp(-t * 6) * 0.3
    return x * gain


def crack(gain=1.0):
    d = 0.9
    t = tt(d)
    x = hp(noise(d), 1800) * np.exp(-t * 18)
    for k in range(6):
        place(x, hp(noise(0.03), 3000) * np.exp(-tt(0.03) * 120), 0.02 + 0.035 * k + rng.uniform(0, 0.02), 0.8)
    x += 0.8 * np.sin(2 * np.pi * np.cumsum(90 * np.exp(-t * 4) + 40) / SR) * np.exp(-t * 6)
    return x * gain


def thud(gain=1.0):
    d = 1.4
    t = tt(d)
    x = np.sin(2 * np.pi * np.cumsum(48 + 70 * np.exp(-t * 18)) / SR) * np.exp(-t * 3.2)
    x += 0.4 * lp(noise(d), 500) * np.exp(-t * 9)
    return np.tanh(1.8 * x) * gain


def swell(d=1.6, gain=1.0):
    t = tt(d)
    x = sum(np.sin(2 * np.pi * midi(m) * t) for m in (38, 45, 50)) / 3
    x = x * (np.sin(np.pi * t / d) ** 2) + 0.2 * lp(noise(d), 800) * np.sin(np.pi * t / d)
    return x * gain


def shimmer(d=1.2, gain=1.0):
    t = tt(d)
    x = sum(np.sin(2 * np.pi * f * t + 3 * np.sin(2 * np.pi * 5 * t)) for f in (2093, 2637, 3136)) / 3
    return x * np.exp(-t * 2.4) * env(len(x), a=0.01, r=0.5) * gain


def sfx():
    out = np.zeros(N)
    # hook: glossy shimmer on the macro, whoosh on the pull, riser into the reveal boom
    place(out, shimmer(1.4, 0.18), 0.02)
    place(out, whoosh(1.2, 250, 6000, 0.55), ev("pull") / 1)
    place(out, riser(1.0, 0.35), ev("reveal") - 1.0)
    place(out, boom(3.0, 55, 0.95), ev("reveal"))
    place(out, whoosh(1.6, 400, 7000, 0.35), ev("grow"))
    for k, n in enumerate(("laneA", "laneB", "laneC")):
        place(out, tick(0.4, 1800 + 300 * k), ev(n))
    # why: rewind (reverse whoosh), result chime, three cards
    place(out, whoosh(1.1, 300, 5000, 0.5, rev=True), ev("rewind"))
    place(out, chime(659, 0.22), ev("result"))
    for k in range(3):
        place(out, tick(0.35, 1500 + 250 * k), ev("three") + 0.6 + 0.5 * k)
    # chapters
    for n in ("pos", "vol", "hold", "recap"):
        place(out, whoosh(0.95, 300, 5500, 0.42), ev(n))
        place(out, boom(1.6, 70, 0.32), ev(n) + 0.25)
    for n in ("posA", "posB", "posC"):
        place(out, whoosh(0.8, 500, 4000, 0.22), ev(n))
    # volume rise and the three volume reads
    place(out, swell(1.8, 0.28), ev("volRise"))
    place(out, tick(0.45, 1700), ev("volA"))
    place(out, boom(1.8, 48, 0.5), ev("volB"))
    place(out, tick(0.35, 1200), ev("volC"))
    # hold: laser line, the three verdicts
    place(out, laser(0.8, 0.5), ev("laser"))
    place(out, chime(880, 0.25), ev("holdA"))
    place(out, crack(0.55), ev("breakB"))
    place(out, crack(0.45), ev("breakC"))
    place(out, thud(0.7), ev("trap"))
    for n in ("recA", "recB", "recC"):
        place(out, tick(0.35, 2000), ev(n))
    # end
    place(out, whoosh(1.4, 200, 3000, 0.4, rev=True), ev("end"))
    place(out, boom(3.4, 50, 0.6), ev("question"))
    place(out, chime(587, 0.3, 2.6), ev("answer"))
    return verb(out, 0.18)


def duck_env(vo):
    a = np.abs(vo)
    k = int(0.05 * SR)
    sm = np.convolve(a, np.ones(k) / k, mode="same")
    on = np.clip(sm / 0.02, 0, 1)
    # attack fast, release slow
    out = np.zeros_like(on)
    g = 0.0
    att, rel = np.exp(-1 / (0.03 * SR)), np.exp(-1 / (0.35 * SR))
    for i in range(0, len(on), 64):
        v = on[i]
        g = v + (g - v) * (att**64 if v > g else rel**64)
        out[i : i + 64] = g
    return 1 - 0.45 * out


def read_wav(path):
    raw = subprocess.run([str(FFMPEG), "-v", "error", "-i", str(path), "-ac", "1", "-ar", str(SR), "-f", "f32le", "-"], capture_output=True, check=True).stdout
    return np.frombuffer(raw, dtype=np.float32).astype(np.float64)


def main():
    vo = read_wav(ROOT / "public/samecandle2/vo.wav")
    vo = np.pad(vo, (0, max(0, N - len(vo))))[:N]
    m = music()
    s = sfx()
    duck = duck_env(vo)
    mix = m * duck * 0.42 + s * 0.6 + np.stack([vo, vo]) * 1.0
    mix /= max(1e-9, np.max(np.abs(mix))) / 0.9
    with tempfile.TemporaryDirectory() as td:
        tmp = Path(td) / "pre.wav"
        subprocess.run([str(FFMPEG), "-v", "error", "-y", "-f", "f32le", "-ar", str(SR), "-ac", "2", "-i", "-", str(tmp)], input=mix.T.astype(np.float32).tobytes(), check=True)
        r = subprocess.run([str(FFMPEG), "-hide_banner", "-i", str(tmp), "-af", "loudnorm=I=-14:TP=-1.5:LRA=11:print_format=json", "-f", "null", "-"], capture_output=True, text=True)
        js = r.stderr[r.stderr.rindex("{") : r.stderr.rindex("}") + 1]
        p = json.loads(js)
        af = f"loudnorm=I=-14:TP=-1.5:LRA=11:measured_I={p['input_i']}:measured_TP={p['input_tp']}:measured_LRA={p['input_lra']}:measured_thresh={p['input_thresh']}:offset={p['target_offset']}:linear=true,aresample=48000"
        subprocess.run([str(FFMPEG), "-v", "error", "-y", "-i", str(tmp), "-af", af, "-ar", "48000", "-c:a", "pcm_s16le", str(ROOT / "public/samecandle2/mix.wav")], check=True)
    r = subprocess.run([str(FFMPEG), "-hide_banner", "-i", str(ROOT / "public/samecandle2/mix.wav"), "-af", "ebur128=peak=true", "-f", "null", "-"], capture_output=True, text=True)
    tail = r.stderr[r.stderr.rindex("Summary:") :]
    print(" ".join(tail.split()))


main()
