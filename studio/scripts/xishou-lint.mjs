// Lint for the xishou-v1 film (no extra deps): determinism, offline, compliance, caption fit, timing.
// Usage: npm run xs:lint
import { build } from "esbuild";
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

const ROOT = path.resolve("src/xishou");
const errors = [];
const walk = (d) => fs.readdirSync(d, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(path.join(d, e.name)) : [path.join(d, e.name)]));
const files = walk(ROOT).filter((f) => /\.(tsx?|json)$/.test(f));

const BANNED = ["保证盈利", "稳定胜率", "必然反转", "无风险", "确定性收益", "稳赚", "包赚", "翻倍"];
for (const f of files) {
  const src = fs.readFileSync(f, "utf8");
  const rel = path.relative(process.cwd(), f);
  if (/Math\.random\s*\(/.test(src)) errors.push(`${rel}: Math.random() is not allowed (use mulberry32 seeds)`);
  if (/https?:\/\//.test(src)) errors.push(`${rel}: remote URL found (runtime must be offline)`);
  if (/@remotion\/google-fonts|lib\/fonts/.test(src)) errors.push(`${rel}: remote font loader imported`);
  if (/\bfetch\s*\(/.test(src)) errors.push(`${rel}: fetch() is not allowed`);
  for (const w of BANNED) if (src.includes(w)) errors.push(`${rel}: banned phrase "${w}"`);
  if (/\d+(\.\d+)?\s*%\s*(收益|胜率|回报)/.test(src)) errors.push(`${rel}: numeric return / win-rate claim`);
}

// evaluate the script module to check captions and timing
const out = path.resolve("out/xs-lint-script.mjs");
fs.mkdirSync(path.dirname(out), { recursive: true });
await build({ entryPoints: ["src/xishou/script.ts"], bundle: true, format: "esm", platform: "node", outfile: out, logLevel: "error" });
const S = await import(pathToFileURL(out).href);
const MAX_UNITS = 32; // 2 lines × ~16 字 at 54–58 px inside 952 px
for (const c of S.CAPTIONS) {
  const units = Array.from(c.line.t).reduce((n, ch) => n + (/[A-Za-z0-9 ]/.test(ch) ? 0.55 : 1), 0);
  if (units > MAX_UNITS) errors.push(`caption too long for 2 lines (${units.toFixed(1)}): ${c.line.t}`);
  for (const w of c.line.hi ?? []) if (!c.line.t.includes(w)) errors.push(`highlight "${w}" not in caption: ${c.line.t}`);
}
let prev = 0;
for (const ch of S.CHAPTERS) {
  if (ch.start !== prev) errors.push(`chapter ${ch.id} starts at ${ch.start}, expected ${prev}`);
  prev = ch.start + ch.dur;
}
const rows = S.CHAPTERS.map((c) => `${c.id.padEnd(10)} ${String(c.start).padStart(5)}–${String(c.start + c.dur).padStart(5)}  ${(c.dur / 30).toFixed(1).padStart(5)} s  ${c.lines.length} lines`);
console.log(rows.join("\n"));
console.log(`TOTAL ${S.TOTAL_FRAMES} frames = ${(S.TOTAL_FRAMES / 30).toFixed(1)} s · ${S.CAPTIONS.length} captions · ${S.SFX.length} sfx cues`);
if (errors.length) {
  console.error(`\n${errors.length} problem(s):\n- ` + errors.join("\n- "));
  process.exit(1);
}
console.log(`xs:lint OK (${files.length} files)`);
