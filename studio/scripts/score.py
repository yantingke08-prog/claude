"""
Generic background score for any video described by a scene-list script
(e.g. src/expectancy/script.json): one pad chord per scene, plus the scene's cues.

Cue types: hit, riser (from/to), whoosh, tick, ping, and the cold-open set:
slam (title lands), drop (at/to: a pitch dive), boom (the crash - the biggest hit). A soft whoosh is added at every
scene boundary. The mix is calmer than the showreel - it sits under reading, not action.

Usage: python scripts/score.py src/expectancy/script.json public/expectancy-score.wav
"""
import json
import sys
from pathlib import Path

import numpy as np

from synth import SR, Mixer, bandpass, bell, impact, lowpass, pad, riser, rng, tick, whoosh


def dive(length):
    """Falling tone + falling filtered noise: something going over the edge."""
    n = int(length * SR)
    k = np.arange(n) / n
    f = 1100 * (60 / 1100) ** (k**1.6)
    tone = np.sin(2 * np.pi * np.cumsum(f) / SR)
    air = bandpass(rng.standard_normal(n), 300, 4000) * (1 - k) * 0.6
    return np.tanh((tone * 0.8 + air) * (0.4 + 0.6 * k) * 1.4)


def boom():
    """The crash: a heavy impact over a long sub drop and a burst of debris noise."""
    n = int(3.5 * SR)
    t_ = np.arange(n) / SR
    sub = np.sin(2 * np.pi * np.cumsum(28 + 70 * np.exp(-t_ * 6)) / SR) * np.exp(-t_ * 1.1)
    debris = lowpass(rng.standard_normal(n), 2200) * np.exp(-t_ * 4.5)
    hit = np.zeros(n)
    hit[: int(3.0 * SR)] = impact(1.8)
    return np.tanh(hit * 1.1 + sub * 1.3 + debris * 0.6)

ROOT = Path(__file__).resolve().parent.parent
script_path, out_path = (ROOT / sys.argv[1]), (ROOT / sys.argv[2])
S = json.loads(script_path.read_text(encoding="utf-8"))
FPS = S["fps"]
T = S["transition"]

starts, t = {}, 0
for sc in S["scenes"]:
    starts[sc["id"]] = t
    t += sc["frames"] - T
total = sum(sc["frames"] for sc in S["scenes"]) - T * (len(S["scenes"]) - 1)
mixer = Mixer(total / FPS)
place = mixer.place
PENTA = [62, 65, 67, 69, 72, 74, 77, 79]

for i, sc in enumerate(S["scenes"]):
    t0 = starts[sc["id"]] / FPS
    place(pad(sc["chord"], sc["frames"] / FPS + 1.2, lo=380, span=900, fade=1.4), t0, gain=0.06, verb=0.6)
    if i > 0:
        place(whoosh(1.1), t0 + T / FPS / 2 - 0.55, gain=0.18, verb=0.4)
    for j, c in enumerate(sc["cues"]):
        at = lambda f: t0 + f / FPS  # noqa: E731
        pan = -0.5 + ((j * 0.37) % 1)
        kind = c["type"]
        if kind == "hit":
            place(impact(0.9), at(c["at"]), gain=0.42, verb=0.6)
        elif kind == "riser":
            place(riser((c["to"] - c["from"]) / FPS), at(c["from"]), gain=0.3, verb=0.4)
        elif kind == "whoosh":
            place(whoosh(1.0), at(c["at"]) - 0.4, gain=0.22, pan=pan, verb=0.4)
        elif kind == "tick":
            place(tick(), at(c["at"]), gain=0.07, pan=pan, verb=0.3)
            place(bell(PENTA[j % len(PENTA)], 1.0), at(c["at"]), gain=0.04, pan=pan, verb=0.6)
        elif kind == "ping":
            place(bell(PENTA[(j + 3) % len(PENTA)], 1.8), at(c["at"]), gain=0.09, pan=pan, verb=0.8)
        elif kind == "slam":
            place(whoosh(0.45), at(c["at"]) - 0.36, gain=0.3, verb=0.3)
            place(impact(1.3), at(c["at"]), gain=0.55, verb=0.5)
        elif kind == "drop":
            place(dive((c["to"] - c["at"]) / FPS + 0.05), at(c["at"]), gain=0.32, verb=0.3)
        elif kind == "boom":
            place(boom(), at(c["at"]), gain=0.8, verb=0.7)
        else:
            raise ValueError(f"unknown cue type {kind!r} in scene {sc['id']}")

mixer.sub_drone(gain=0.06)
mixer.write(out_path)
