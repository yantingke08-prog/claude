// npm run check  (Node >= 22.6)
// 1. every cue phrase exists and falls inside the shot that uses it
// 2. every caption is one line of at most 14 characters
// 3. every isolated high/low the film points at satisfies the 3-candle rule; branches behave as narrated
// 4. no colour literal outside src/theme.ts
// 5. the timeline builds from vo.timestamps.json and from the even-split fallback
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { CUES } from "../src/cues.ts";
import { ADV, CASE, CASE_FAKE, CASE_HOLD, CLAIMS, HOOK, HOOK_FLY, HOOK_PROBLEMS, isSwingHigh, isSwingLow, maxRun } from "../src/data.ts";
import { buildTimeline, findAnchor, normalise, type Timeline, type VoTimestamps } from "../src/timeline.ts";

const root = new URL("..", import.meta.url);
let bad = 0;
const fail = (m: string) => {
  bad++;
  console.error("✗ " + m);
};

const tsPath = new URL("public/audio/vo.timestamps.json", root);
const ts: VoTimestamps | null = existsSync(tsPath) ? JSON.parse(readFileSync(tsPath, "utf8")) : null;

const PREFIX_SHOT: [string, string[]][] = [
  ["hook", ["hook"]],
  ["con", ["concept"]],
  ["def", ["define"]],
  ["case", ["case"]],
  ["adv", ["advanced"]],
  ["br", ["broll1", "broll2", "broll3"]],
  ["tk", ["ticker"]],
  ["out", ["outro"]],
];

const checkTimeline = (label: string, tl: Timeline) => {
  console.log(`\n[${label}] source=${tl.source} duration=${tl.duration.toFixed(2)}s`);
  for (const w of tl.warnings) console.log("  ! " + w);
  for (const s of tl.shots) console.log(`  ${s.id.padEnd(9)} ${s.start.toFixed(2).padStart(7)} → ${s.end.toFixed(2).padStart(7)}`);
  // 1
  for (const [name, q] of Object.entries(CUES)) {
    const at = findAnchor(tl, q.phrase, "after" in q ? q.after : undefined);
    if (at === null) {
      fail(`[${label}] cue ${name}: "${q.phrase}" not found`);
      continue;
    }
    const shots = PREFIX_SHOT.find(([p]) => name.startsWith(p))?.[1] ?? [];
    const inside = tl.shots.some((s) => shots.includes(s.id) && at >= s.start - 1e-6 && at < s.end);
    if (!inside) fail(`[${label}] cue ${name} at ${at.toFixed(2)}s is outside shot(s) ${shots.join("/")}`);
  }
  // 2
  for (const u of tl.units) {
    const n = Array.from(u.text.replace(/\s/g, "")).length;
    if (n > 14) fail(`[${label}] caption over 14 chars (${n}): ${u.text}`);
  }
  const gap = tl.shots.find((s) => s.id === "title");
  if (!gap || gap.end - gap.start < 1.5) fail(`[${label}] title card has no room (${gap ? (gap.end - gap.start).toFixed(2) : "missing"})`);
};

// the script the timestamps carry must be the script the film shows
if (ts) {
  const a = ts.lines.map((l) => normalise(l.text)).join("");
  const tl0 = buildTimeline(null, null);
  if (a !== tl0.spoken) fail("vo.timestamps.json text differs from src/script.ts (spoken characters do not match)");
}
checkTimeline("timestamps", buildTimeline(ts, null));
checkTimeline("fallback", buildTimeline(null, 190.9));

// 3
console.log("\n[pivots]");
for (const c of CLAIMS) {
  for (const i of c.highs) if (!isSwingHigh(c.bars, i)) fail(`${c.name}: bar ${i} is not an isolated high`);
  for (const i of c.lows) if (!isSwingLow(c.bars, i)) fail(`${c.name}: bar ${i} is not an isolated low`);
  console.log(`  ${c.name}: ${c.highs.length} highs, ${c.lows.length} lows OK`);
}
const B = CASE.bars;
const h = (i: number) => B[i].h;
const l = (i: number) => B[i].l;
const must = (ok: boolean, m: string) => (ok ? console.log("  ✓ " + m) : fail(m));
must(Math.max(...B.slice(CASE.BREAK - 1, CASE.BREAK + 1).map((b) => b.c)) > h(CASE.H1), "case: price closes above H1 at the breakout");
must(Math.max(...B.slice(CASE.H1 + 1, CASE.APPROACH + 1).map((b) => b.h)) < h(CASE.H1), "case: nothing touches H1 before the breakout");
must(l(CASE.L2) > l(CASE.L1), "case: L2 holds above L1 (support held twice)");
must(Math.min(...B.slice(CASE.H2 + 1, CASE.L2 + 1).map((b) => b.l)) >= l(CASE.L1), "case: no bar breaks L1 on the second test");
must(Math.max(...B.slice(CASE.H2 + 1, CASE.HOLD + 1).map((b) => b.h)) < h(CASE.H2), "case: H2 not topped before the big candle");
must(B[CASE.BIG].c > h(CASE.H2) && B[CASE.BIG].o < h(CASE.H2), "case: the big bull candle crosses H2");
must(CASE_FAKE.bars[0].h > h(CASE.H2) && CASE_FAKE.bars[CASE_FAKE.bars.length - 1].c < h(CASE.H2) - 4, "case: fake break pokes above H2 and falls back");
must(Math.min(...CASE_HOLD.bars.map((b) => b.l)) > l(CASE.L3), "case: the 'holds' branch never breaks L3");
must(B[CASE.BREAKDOWN].c < l(CASE.L3), "case: the real path breaks below L3");
must(ADV.bars[ADV.T1].l > ADV.bars[ADV.LOW].l && ADV.bars[ADV.T2].l > ADV.bars[ADV.LOW].l, "advanced: both tests stay above the isolated low");
must(HOOK_PROBLEMS.length === 0, `hook realism (seed ${HOOK.SEED}): mixed colours, longest run ${maxRun(HOOK.bars)} ≤ 5, doji, long wicks, varied bodies${HOOK_PROBLEMS.length ? " — " + HOOK_PROBLEMS.join("; ") : ""}`);
must(HOOK_FLY[HOOK_FLY.length - 1].c > HOOK.bars[HOOK.TOP].h, "hook: the 一卖就飞 branch goes above the old top");
must(HOOK.bars[HOOK.TRAP].c < HOOK.bars[HOOK.ENTRY].c + 1, "hook: the 不走 branch gives the profit back");

// 4
console.log("\n[colours]");
const walk = (dir: URL): string[] =>
  readdirSync(dir, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(new URL(e.name + "/", dir)) : [new URL(e.name, dir).pathname]));
for (const f of walk(new URL("src/", root))) {
  if (f.endsWith("theme.ts")) continue;
  const src = readFileSync(new URL("file://" + f), "utf8");
  const hits = src.match(/["'`]#[0-9a-fA-F]{3,8}\b/g);
  if (hits) fail(`${f.split("/src/")[1]}: colour literal(s) ${hits.join(", ")} — use theme.ts`);
}
console.log("  colour constants only in src/theme.ts");

console.log(bad ? `\n${bad} problem(s)` : "\nall checks passed");
process.exit(bad ? 1 : 0);
