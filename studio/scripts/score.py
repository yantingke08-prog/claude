"""
Generic background score for any video described by a scene-list script
(e.g. src/expectancy/script.json): one pad chord per scene, plus the scene's cues.

Cue types: hit, riser (from/to), whoosh, tick, ping. A soft whoosh is added at every
scene boundary. The mix is calmer than the showreel - it sits under reading, not action.

Usage: python scripts/score.py src/expectancy/script.json public/expectancy-score.wav
"""
import json
import sys
from pathlib import Path

from synth import Mixer, bell, impact, pad, riser, tick, whoosh

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
        else:
            raise ValueError(f"unknown cue type {kind!r} in scene {sc['id']}")

mixer.sub_drone(gain=0.06)
mixer.write(out_path)
