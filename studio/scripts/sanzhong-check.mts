// npm run sz:check — timing + caption + compliance checks for the 三种成交 film (SanzhongLVP).
// Reads the same files the film reads: public/sanzhong/audio/vo.timestamps.json (+ vo.mp3 duration via
// the ffprobe bundled with Remotion). Prints shots, beats and captions; exits 1 on a real problem.
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { BEATS, HI, PARAGRAPHS, SFX, TAIL } from "../src/sanzhong/script.ts";
import { buildTimeline, captionUnits, captionWindows, filmSeconds, layoutCaption, normalise, resolveBeats, resolveSfx } from "../src/sanzhong/timeline.ts";

const ROOT = path.resolve(import.meta.dirname, "..");
const AUDIO = path.join(ROOT, "public/sanzhong/audio/vo.mp3");
const TS = path.join(ROOT, "public/sanzhong/audio/vo.timestamps.json");
const errors: string[] = [];
const warns: string[] = [];

const probe = (): number | null => {
  const candidates = [path.join(ROOT, "node_modules/@remotion/compositor-win32-x64-msvc/ffprobe.exe"), "ffprobe"];
  for (const bin of candidates) {
    try {
      const out = execFileSync(bin, ["-v", "error", "-show_entries", "format=duration", "-of", "default=nw=1:nk=1", AUDIO], { encoding: "utf8" });
      const s = parseFloat(out.trim());
      if (Number.isFinite(s)) return s;
    } catch {
      /* try next */
    }
  }
  return null;
};

const audio = fs.existsSync(AUDIO) ? probe() : null;
if (!fs.existsSync(AUDIO)) errors.push(`missing ${AUDIO}`);
else if (fs.statSync(AUDIO).size < 300_000) warns.push("vo.mp3 is tiny: still the silent placeholder? Replace it with the recording.");
const ts = fs.existsSync(TS) ? JSON.parse(fs.readFileSync(TS, "utf8")) : null;
const tl = buildTimeline(PARAGRAPHS, ts, audio);
warns.push(...tl.warnings);

// 1. every beat resolves, in narration order inside its shot
const { beats, missing } = resolveBeats(tl, BEATS);
for (const m of missing) errors.push(`beat "${m}" not found in narration`);

// 2. captions: fit, no single-character line, no single-character unit, highlights exist
const wins = captionWindows(tl);
for (const w of wins) {
  const lay = layoutCaption(w.unit.display);
  for (const l of lay.lines) {
    if (normalise(l).length <= 1) errors.push(`stranded single character in caption line "${l}" (unit ${w.unit.i})`);
    if (captionUnits(l) * lay.size > 952 + 1) errors.push(`caption line too wide: "${l}"`);
  }
  if (lay.lines.length > 2) errors.push(`caption over 2 lines: ${w.unit.display}`);
  if (w.unit.spoken.length <= 1) errors.push(`single-character caption unit: "${w.unit.display}"`);
  if (w.to - w.from < 0.35) warns.push(`caption on screen only ${(w.to - w.from).toFixed(2)} s: "${w.unit.display}"`);
}
for (const [p] of HI) if (!PARAGRAPHS.flat().some((s) => s.text.includes(p))) errors.push(`highlight "${p}" not in narration`);

// 3. compliance + offline + determinism over the film sources
const SRC = path.join(ROOT, "src/sanzhong");
const walk = (d: string): string[] => fs.readdirSync(d, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(path.join(d, e.name)) : [path.join(d, e.name)]));
const BANNED = ["保证盈利", "稳定胜率", "必然反转", "无风险", "确定性收益", "稳赚", "包赚", "翻倍"];
let files = 0;
for (const f of walk(SRC).filter((x) => /\.(tsx?|json)$/.test(x))) {
  files++;
  const src = fs.readFileSync(f, "utf8");
  const rel = path.relative(ROOT, f);
  if (/Math\.random\s*\(/.test(src)) errors.push(`${rel}: Math.random() is banned (use lib/rng.ts mulberry32)`);
  if (/https?:\/\//.test(src)) errors.push(`${rel}: remote URL (render must be offline)`);
  if (/@remotion\/google-fonts|lib\/fonts/.test(src)) errors.push(`${rel}: remote font loader imported`);
  for (const w of BANNED) if (src.includes(w)) errors.push(`${rel}: banned phrase "${w}"`);
}

// report
const fmt = (s: number) => s.toFixed(2).padStart(7);
console.log(`source: ${tl.source} · audio ${audio?.toFixed(2) ?? "?"} s · film ${filmSeconds(tl, TAIL).toFixed(2)} s · ${tl.units.length} caption units`);
console.log("\nSHOTS");
for (const s of tl.shots) console.log(`  ${s.id.padEnd(9)} ${fmt(s.start)} – ${fmt(s.end)}  (${(s.end - s.start).toFixed(1)} s)`);
console.log("\nBEATS");
const ids = Object.keys(beats) as (keyof typeof beats)[];
for (let k = 0; k < ids.length; k += 4)
  console.log("  " + ids.slice(k, k + 4).map((id) => `${String(id).padEnd(12)}${fmt(beats[id])}`).join("   "));
console.log(`\nSFX ${resolveSfx(beats, SFX).length} cues`);
if (process.argv.includes("--captions")) {
  console.log("\nCAPTIONS");
  for (const w of wins) console.log(`  ${fmt(w.from)} – ${fmt(w.to)}  ${layoutCaption(w.unit.display).lines.join(" / ")}`);
}
if (warns.length) console.warn(`\n${warns.length} warning(s):\n- ` + warns.join("\n- "));
if (errors.length) {
  console.error(`\n${errors.length} problem(s):\n- ` + errors.join("\n- "));
  process.exit(1);
}
console.log(`\nsz:check OK (${files} source files)`);
