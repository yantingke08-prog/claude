// Verifies the rendered 《同一根大阳线》 MP4 (and cover) using the ffprobe/ffmpeg bundled with Remotion.
// Usage: node scripts/samecandle-verify.mjs <video.mp4> [cover.png] [minSec=60] [maxSec=90]
import { execFileSync } from "node:child_process";
import fs from "node:fs";

const [video, cover, minS = "60", maxS = "90", wantW = "1080"] = process.argv.slice(2);
const WW = Number(wantW);
const WH = Math.round((WW * 16) / 9);
const npx = process.platform === "win32" ? "npx.cmd" : "npx";
const run = (args) => execFileSync(npx, ["remotion", ...args], { encoding: "utf8", shell: process.platform === "win32", stdio: ["ignore", "pipe", "pipe"] });
const q = (p) => (process.platform === "win32" ? `"${p}"` : p);
const fail = [];
const ok = (cond, msg) => {
  console.log(`${cond ? "PASS" : "FAIL"}  ${msg}`);
  if (!cond) fail.push(msg);
};

ok(fs.existsSync(video), `video exists: ${video}`);
if (fs.existsSync(video)) {
  const info = JSON.parse(run(["ffprobe", "-v", "error", "-show_entries", "format=duration,size:stream=codec_type,codec_name,width,height,pix_fmt,avg_frame_rate,sample_rate,channels", "-of", "json", q(video)]));
  const v = info.streams.find((s) => s.codec_type === "video");
  const a = info.streams.find((s) => s.codec_type === "audio");
  const dur = Number(info.format.duration);
  ok(dur >= Number(minS) && dur <= Number(maxS), `duration ${dur.toFixed(2)} s within ${minS}–${maxS} s`);
  ok(v && v.width === WW && v.height === WH, `video ${WW}×${WH} (got ${v?.width}×${v?.height})`);
  ok(v && v.codec_name === "h264" && v.pix_fmt === "yuv420p", `H.264 yuv420p (got ${v?.codec_name} ${v?.pix_fmt})`);
  ok(v && v.avg_frame_rate === "30/1", `30 fps (got ${v?.avg_frame_rate})`);
  ok(a && a.codec_name === "aac" && Number(a.channels) === 2, `AAC stereo audio (got ${a?.codec_name} ${a?.channels}ch)`);
  // full decode: catches truncated / corrupt files
  let decoded = true;
  try {
    run(["ffmpeg", "-v", "error", "-xerror", "-i", q(video), "-c:v", "rawvideo", "-c:a", "pcm_s16le", "-f", "null", "-"]);
  } catch (e) {
    decoded = false;
    console.log(String(e.stderr || e).slice(0, 800));
  }
  ok(decoded, "full decode without errors (playable)");
  console.log(`size ${(Number(info.format.size) / 1e6).toFixed(1)} MB`);
}
if (cover) {
  ok(fs.existsSync(cover), `cover exists: ${cover}`);
  if (fs.existsSync(cover)) {
    const c = JSON.parse(run(["ffprobe", "-v", "error", "-show_entries", "stream=width,height", "-of", "json", q(cover)]));
    ok(c.streams[0].width === 1080 && c.streams[0].height === 1920, `cover 1080×1920`);
  }
}
if (fail.length) {
  console.log(`\n${fail.length} check(s) failed`);
  process.exit(1);
}
console.log("\nAll checks passed.");
