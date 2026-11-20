// npm run check  (Node >= 22.6, uses --experimental-strip-types)
// 1. src/script.json reproduces script/逐字稿.txt character for character
// 2. every caption unit fits one line
// 3. no shot change sits on a ［短暂停顿］
// 4. every text anchor at("…") used in a scene exists in the shots that scene plays
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { buildTimeline, normalise, type ScriptFile } from "../src/timelineCore.ts";
import type { VoTimestamps } from "../src/audioContract.ts";

const root = new URL("..", import.meta.url);
const read = (p: string) => readFileSync(new URL(p, root), "utf8");
const script = JSON.parse(read("src/script.json")) as ScriptFile;
let bad = 0;
const fail = (m: string) => {
  bad++;
  console.error("✗ " + m);
};

// 1
const txt = read("script/逐字稿.txt").trim().split(/\r?\n/);
script.paragraphs.forEach((p, i) => {
  const joined = p.map((s) => s.text).join("");
  if (joined !== txt[i]) fail(`paragraph ${i + 1} differs from 逐字稿:\n  script.json: ${joined}\n  逐字稿.txt : ${txt[i]}`);
});
if (txt.length !== script.paragraphs.length) fail(`paragraph count ${script.paragraphs.length} vs 逐字稿 ${txt.length}`);

// timeline from the real timestamps file if it has content
let ts: VoTimestamps | null = null;
const tsPath = new URL("public/audio/vo.timestamps.json", root);
if (existsSync(tsPath)) {
  try {
    ts = JSON.parse(readFileSync(tsPath, "utf8"));
  } catch {
    fail("public/audio/vo.timestamps.json is not valid JSON");
  }
}
const tl = buildTimeline(script, ts, ts?.duration || null);
tl.warnings.forEach((w) => console.warn("! " + w));

// 2  (caption box is 1000 px wide; font shrinks below 64 px for long units, never below 52)
const width = (s: string) => Array.from(s).reduce((w, c) => w + (/[\x00-\x7f]/.test(c) ? 0.55 : 1), 0);
for (const u of tl.units) if (width(u.display) * 52 > 1000) fail(`unit ${u.i} too long for one line: ${u.display}`);

// 3
const sceneOf = new Map<string, string>();
for (const s of tl.shots) for (const k of s.units) sceneOf.set(String(k), s.id);
for (let i = 1; i < tl.shots.length; i++) {
  const prev = tl.units[tl.shots[i - 1].units.at(-1)!];
  if (prev.pauseAfter) fail(`shot ${tl.shots[i].id} starts right after a ［短暂停顿］`);
}

// 4
const registry = read("src/scenes/index.ts");
const imports = new Map<string, string>();
for (const m of registry.matchAll(/import \{ (\w+) \} from "\.\/(\w+)"/g)) imports.set(m[1], m[2]);
const shotScene = new Map<string, string>();
for (const m of registry.matchAll(/"([\w-]+)": (\w+),/g)) shotScene.set(m[1], imports.get(m[2]) ?? m[2]);
const sceneText = new Map<string, string>();
for (const s of tl.shots) {
  const file = shotScene.get(s.id);
  if (!file) fail(`shot "${s.id}" has no scene in src/scenes/index.ts`);
  else sceneText.set(file, (sceneText.get(file) ?? "") + s.units.map((k) => tl.units[k].spoken).join(""));
}
for (const f of readdirSync(new URL("src/scenes/", root))) {
  const name = f.replace(/\.tsx$/, "");
  if (!sceneText.has(name)) continue;
  const src = read(`src/scenes/${f}`);
  for (const m of src.matchAll(/\bat\("([^"]+)"/g)) {
    if (!sceneText.get(name)!.includes(normalise(m[1]))) fail(`${f}: anchor at("${m[1]}") not in its shot text`);
  }
}

console.log(`\n${tl.units.length} caption units, ${tl.shots.length} shots, source=${tl.source}, ${tl.duration.toFixed(2)} s`);
for (const s of tl.shots) {
  console.log(`${s.start.toFixed(2).padStart(7)}–${s.end.toFixed(2).padEnd(7)} ${s.id.padEnd(11)} ${tl.units[s.units[0]].display}`);
}
if (bad) {
  console.error(`\n${bad} problem(s)`);
  process.exit(1);
}
console.log("\n✓ all checks passed");
