// Local build orchestrator for 《价值区怎么用？只看3个数》 — works the same in Windows PowerShell, cmd and bash
// (no shell is involved: every tool is spawned directly, so paths with spaces / Chinese / full-width brackets are safe).
//
//   node scripts/valuearea-make.mjs make [--cpu]     typecheck → sync (align + srt + mix + check) → render → cover
//   node scripts/valuearea-make.mjs render [--cpu]   render the film (refuses without the voice / with the estimate)
//   node scripts/valuearea-make.mjs cover [--cpu]    render the cover still
//
// Voice:   VOICEOVER_PATH (any format ffmpeg reads), else public/voiceover/vo.mp3
// Outputs: VA_VIDEO_DIR (default D:/claude视频/成片/分集) for the .mp4 and .srt, VA_COVER_DIR (default D:/责苏/Hermes封面)
//          for the cover; file names come from script.json "episode".
// Flags:   --cpu = SwiftShader (no GPU), --allow-estimate = render even though timeline.json is still the placeholder
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
process.chdir(ROOT);
const [cmd = "make", ...rest] = process.argv.slice(2);
const cpu = rest.includes("--cpu");
const allowEstimate = rest.includes("--allow-estimate");

const sc = JSON.parse(fs.readFileSync("src/valuearea/script.json", "utf8"));
const NAME = sc.episode; // （5）价值区怎么用？只看3个数
const VIDEO_DIR = process.env.VA_VIDEO_DIR || "D:/claude视频/成片/分集";
const COVER_DIR = process.env.VA_COVER_DIR || "D:/责苏/Hermes封面";
const MP4 = path.join(VIDEO_DIR, `${NAME}.mp4`);
const SRT = path.join(VIDEO_DIR, `${NAME}.srt`);
const PNG = path.join(COVER_DIR, `${NAME}-封面.png`);
const VOICE = process.env.VOICEOVER_PATH || path.join(ROOT, "public", "voiceover", "vo.mp3");
const MIX = path.join(ROOT, "public", "valuearea", "mix.wav");
const PY = process.env.PYTHON || (process.platform === "win32" ? "python" : "python3");
const CLI = path.join(ROOT, "node_modules", "@remotion", "cli", "remotion-cli.js");
const TSC = path.join(ROOT, "node_modules", "typescript", "bin", "tsc");

const run = (exe, args, label) => {
  console.log(`\n▶ ${label}`);
  const r = spawnSync(exe, args, { stdio: "inherit", env: { ...process.env, PYTHONIOENCODING: "utf-8", PYTHONUTF8: "1" } });
  if (r.error) throw new Error(`${label}: ${r.error.message}`);
  if (r.status !== 0) {
    console.error(`✗ ${label} failed (exit ${r.status})`);
    process.exit(r.status ?? 1);
  }
};
const fail = (msg) => {
  console.error(`✗ ${msg}`);
  process.exit(1);
};
const gl = cpu ? ["--gl=swangle", "--concurrency=2"] : ["--gl=angle", "--concurrency=50%"];
const VIDEO_FLAGS = ["--codec=h264", "--crf=16", "--pixel-format=yuv420p", "--color-space=bt709", "--audio-codec=aac", "--audio-bitrate=320k", "--image-format=jpeg", "--jpeg-quality=95"];

const needVoice = () => {
  if (!fs.existsSync(VOICE)) fail(`no voice at ${VOICE}\n  put the recording at public/voiceover/vo.mp3 or set VOICEOVER_PATH`);
};
const needRenderable = () => {
  const tl = JSON.parse(fs.readFileSync("src/valuearea/timeline.json", "utf8"));
  if (String(tl.source).startsWith("estimate") && !allowEstimate) fail("timeline.json is still the character-count estimate: run `npm run va:sync` with the real voice first (or pass --allow-estimate)");
  if (!fs.existsSync(MIX)) fail(`no mix at ${MIX}: run \`npm run va:sync\` first (the film will not render silent)`);
  return tl;
};

const render = () => {
  const tl = needRenderable();
  fs.mkdirSync(VIDEO_DIR, { recursive: true });
  run(process.execPath, [CLI, "render", "src/index.ts", "ValueArea", MP4, ...gl, ...VIDEO_FLAGS, `--props=${JSON.stringify({ requireAudio: true })}`], `render ValueArea → ${MP4} (${tl.seconds}s, ${cpu ? "CPU" : "GPU"})`);
  run(process.execPath, [CLI, "ffprobe", "-v", "error", "-show_entries", "stream=codec_name,pix_fmt,color_space,color_primaries,color_transfer,width,height,r_frame_rate,bit_rate:format=duration", "-of", "default=nw=1", MP4], "verify streams");
};
const cover = () => {
  fs.mkdirSync(COVER_DIR, { recursive: true });
  run(process.execPath, [CLI, "still", "src/index.ts", "ValueAreaCover", PNG, cpu ? "--gl=swangle" : "--gl=angle", "--image-format=png"], `cover → ${PNG}`);
};

if (cmd === "render") render();
else if (cmd === "cover") cover();
else if (cmd === "make") {
  run(process.execPath, [TSC, "--noEmit"], "typecheck");
  needVoice();
  fs.mkdirSync(VIDEO_DIR, { recursive: true });
  run(PY, ["scripts/valuearea-sync.py", "all", SRT], "sync: align + srt + mix + check");
  render();
  cover();
  console.log(`\n✓ done\n  video   ${MP4}\n  srt     ${SRT}\n  cover   ${PNG}`);
} else fail(`unknown command ${cmd} (make | render | cover)`);
