"""
Self-check a rendered film: container/stream facts, duration window, loudness and true peak,
clipping, black frames, frozen stretches, and A/V duration match.

Usage: python scripts/breakout-qc.py <video.mp4>
"""
import json
import re
import shutil
import subprocess
import sys
from pathlib import Path

_ff = shutil.which("ffmpeg")
BIN = Path(_ff).parent if _ff else Path.home() / "AppData/Local/Microsoft/WinGet/Links"
path = sys.argv[1]


def run(*args):
    return subprocess.run(args, capture_output=True, text=True, encoding="utf-8", errors="replace")


probe = json.loads(run(str(next(BIN.glob("ffprobe*"))), "-v", "error", "-show_streams", "-show_format", "-of", "json", path).stdout)
v = next(s for s in probe["streams"] if s["codec_type"] == "video")
a = next(s for s in probe["streams"] if s["codec_type"] == "audio")
dur = float(probe["format"]["duration"])
num, den = map(int, v["r_frame_rate"].split("/"))
checks = []
ok = lambda name, cond, info: checks.append((name, bool(cond), info))  # noqa: E731
ok("duration 60-90s", 60 <= dur <= 90, f"{dur:.2f}s")
ok("1920x1080 or 1080x1920", (v["width"], v["height"]) in ((1920, 1080), (1080, 1920)), f'{v["width"]}x{v["height"]}')
ok("30 fps", num / den == 30, f"{num}/{den}")
ok("H.264 + AAC", v["codec_name"] == "h264" and a["codec_name"] == "aac", f'{v["codec_name"]} / {a["codec_name"]} {a.get("sample_rate")}Hz')
ok("A/V length match", abs(float(v["duration"]) - float(a["duration"])) < 0.1, f'v {float(v["duration"]):.3f}s a {float(a["duration"]):.3f}s')

r = run(str(next(BIN.glob("ffmpeg*"))), "-hide_banner", "-nostats", "-i", path, "-af", "ebur128=peak=true,astats=metadata=0", "-vf", "blackdetect=d=0.25:pic_th=0.97,freezedetect=n=0.001:d=2.5", "-f", "null", "-")
log = r.stderr
I = float(re.findall(r"I:\s+(-?[\d.]+) LUFS", log)[-1])
tp = float(re.findall(r"Peak:\s+(-?[\d.]+) dBFS", log)[-1])
clipped = sum(int(x) for x in re.findall(r"Number of samples clipped:\s*(\d+)", log)) if "clipped" in log else 0
blacks = re.findall(r"black_start:([\d.]+) black_end:([\d.]+)", log)
freezes = re.findall(r"freeze_start: ([\d.]+)", log)
ok("loudness -14 LUFS (+/-1)", abs(I + 14) <= 1, f"{I} LUFS")
ok("true peak <= -1 dBTP", tp <= -1.0, f"{tp} dBTP")
ok("no clipped samples", clipped == 0, str(clipped))
ok("no black frames", not blacks, ", ".join(f"{s}-{e}s" for s, e in blacks) or "none")
ok("no frozen stretches > 2.5s", not freezes, ", ".join(freezes) or "none")
for name, passed, info in checks:
    print(f'{"PASS" if passed else "FAIL"}  {name:28s} {info}')
sys.exit(0 if all(p for _, p, _ in checks) else 1)
