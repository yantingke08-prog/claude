"""
Procedural soundtrack for the showreel.

Reads src/timeline.json (the same file the video reads), so every hit, riser, ping and
whoosh lands on the exact frame of its visual cue. Synthesis lives in synth.py.
Output: public/soundtrack.wav (48 kHz, 16-bit stereo, -14 LUFS).

Usage: python scripts/soundtrack.py
"""
import json
from pathlib import Path

from synth import Mixer, bell, hat, impact, pad, riser, soft_kick, tick, whoosh

ROOT = Path(__file__).resolve().parent.parent
TL = json.loads((ROOT / "src" / "timeline.json").read_text(encoding="utf-8"))
FPS = TL["fps"]
ORDER = ["intro", "globe", "wave", "outro"]

starts, t = {}, 0
for s in ORDER:
    starts[s] = t
    t += TL["scenes"][s] - TL["transition"]
TOTAL_FRAMES = sum(TL["scenes"].values()) - TL["transition"] * (len(ORDER) - 1)
DUR = TOTAL_FRAMES / FPS
mixer = Mixer(DUR)
place = mixer.place


def sec(scene, frame):
    return (starts[scene] + frame) / FPS


# ---------------- pad bed: one chord per scene, crossfaded ----------------
CHORDS = {
    "intro": [38, 45, 52, 57, 64],      # D  A  E  A  E   (open fifths, mysterious)
    "globe": [34, 41, 50, 57, 62, 65],  # Bb F  D  A  D  F (Bbmaj7, wide)
    "wave": [36, 43, 52, 55, 62, 67],   # C  G  E  G  D  G (Cadd9, lift)
    "outro": [38, 45, 50, 54, 57, 66],  # D  A  D  F# A F# (D major: resolution)
}
for s in ORDER:
    place(pad(CHORDS[s], TL["scenes"][s] / FPS + 1.2), starts[s] / FPS, gain=0.075, pan=0, verb=0.5)

# sub drone under everything
mixer.sub_drone()


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

mixer.write(ROOT / "public" / "soundtrack.wav")
