// Layout + timing QA for 战前觉醒: renders the HUD (no WebGL) every Nth frame, collects the screen box, kind and
// opacity of every label (see src/zhanqian/qa.tsx) and checks:
//   layout   (v5, phone screen) safe area x 60–960, y 140–1340, captions own 1360–1500; nothing under 34 px
//            (captions 56+); descriptive lines at most 12 hanzi; 20 px between labels
//   focus    (v6) at any moment at most ONE main label (kind card / chip / type) and ONE layer of supporting data
//            (kind data); pieces of one label share a data-qa-group
//   timing   (v6) per label: it starts within 8 frames before its keyword (data-qa-cue), only once the shot's camera
//            has settled (shot.mv), and stays fully visible 24+ frames (cards 36+) before it leaves or the shot cuts
//   cuts     (v6) a cut never lands inside speech, and comes 15+ frames after the last sentence ended
//   walls    (v6) two consecutive order-wall shots never share a composition (director.ts `comp`)
// Writes ../outputs-zhanqian/timing-report.md (every label's hold, every cut's tail) and src/zhanqian/labels.json
// (when each data label lands, for the light ticks in zhanqian-score.py).
// Usage: node scripts/zhanqian-qa.mjs [everyNth=2] [from] [to]    → prints issues, exits 1 if any
import { bundle } from "@remotion/bundler";
import { renderFrames, selectComposition } from "@remotion/renderer";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const [nth = "2", from, to] = process.argv.slice(2);
const N = Number(nth);
const SAFE = { x0: 60, x1: 960, y0: 140, y1: 1340 };
const CAP = [1360, 1500];
const MIN_FONT = 34;
const MAX_HAN = 12;
const GAP = 20;
const HOLD = { card: 36, chip: 24, type: 24, data: 24 };
const PRE = 8; // a label may start up to 8 frames before its word
const TAIL_MIN = 15;
const MAIN = new Set(["card", "chip", "type"]);
const TIMED = new Set(["card", "chip", "type", "data"]);

const serveUrl = await bundle({ entryPoint: path.resolve("src/index.ts") });
const inputProps = { muted: true, qa: true };
const composition = await selectComposition({ serveUrl, id: "Zhanqian", inputProps });
const FRAMES = composition.durationInFrames;
const shots = JSON.parse(fs.readFileSync("src/zhanqian/cues.json", "utf8")).shots;
const TL = JSON.parse(fs.readFileSync("src/zhanqian/timeline.json", "utf8"));
const shotAt = (f) => shots.filter((s) => s.at <= f).at(-1);
/** the next real cut after frame f (a morph is not a cut) */
const cutAfter = (f) => shots.find((s) => s.at > f && s.trans !== "morph")?.at ?? FRAMES;
const frames = new Map();
const out = fs.mkdtempSync(path.join(os.tmpdir(), "zqqa-"));
await renderFrames({
  serveUrl,
  composition,
  inputProps,
  outputDir: out,
  imageFormat: "jpeg",
  jpegQuality: 30,
  everyNthFrame: N,
  frameRange: from ? [Number(from), Number(to ?? FRAMES - 1)] : null,
  concurrency: 4,
  onStart: () => {},
  onFrameUpdate: () => {},
  onBrowserLog: (l) => {
    if (l.text.startsWith("QA")) {
      const r = JSON.parse(l.text.slice(2));
      frames.set(r.f, r.items);
    }
  },
});
fs.rmSync(out, { recursive: true, force: true });
const sorted = [...frames.entries()].sort((a, b) => a[0] - b[0]);
const tc = (f) => `${Math.floor(f / 30 / 60)}:${((f / 30) % 60).toFixed(2).padStart(5, "0")}`;

// ------------------------------------------------------------------ layout and focus
const gap = (a, b) => Math.max(a.x0 - b.x1, b.x0 - a.x1, a.y0 - b.y1, b.y0 - a.y1);
const inside = (a, b) => a.x0 >= b.x0 - 1 && a.x1 <= b.x1 + 1 && a.y0 >= b.y0 - 1 && a.y1 <= b.y1 + 1;
const issues = new Map();
const note = (f, tag, msg) => {
  const s = shotAt(f);
  const key = `${s.lay}|${tag}`;
  const e = issues.get(key) ?? { lay: s.lay, msg, f0: f, f1: f };
  e.f0 = Math.min(e.f0, f);
  e.f1 = Math.max(e.f1, f);
  issues.set(key, e);
};
const r = (b) => `[${Math.round(b.x0)},${Math.round(b.y0)}–${Math.round(b.x1)},${Math.round(b.y1)}]`;
for (const [f, all] of sorted) {
  const items = all.filter((i) => i.op >= 0.25);
  for (const it of items) {
    if (it.kind !== "cap" && (it.x0 < SAFE.x0 - 1 || it.x1 > SAFE.x1 + 1 || it.y0 < SAFE.y0 - 1 || it.y1 > SAFE.y1 + 1)) note(f, `safe ${it.id}`, `outside safe area: ${it.id} ${r(it)}`);
    if (it.kind !== "cap" && it.y1 > CAP[0] && it.y0 < CAP[1]) note(f, `cap ${it.id}`, `in caption band: ${it.id} ${r(it)}`);
    if (it.minFont < (it.kind === "cap" ? 56 : MIN_FONT)) note(f, `font ${it.id}`, `type too small (${Math.round(it.minFont)} px): ${it.id}`);
    if (it.kind !== "cap" && it.kind !== "type" && it.maxHan > MAX_HAN) note(f, `han ${it.id}`, `line longer than ${MAX_HAN} hanzi (${it.maxHan}): ${it.id}`);
  }
  for (let i = 0; i < items.length; i++)
    for (let j = i + 1; j < items.length; j++) {
      const a = items[i],
        b = items[j];
      if (inside(a, b) || inside(b, a)) continue;
      if (a.into?.some((p) => b.id.startsWith(p)) || b.into?.some((p) => a.id.startsWith(p))) continue;
      const g = gap(a, b);
      if (g < GAP) note(f, `pair ${a.id} ${b.id}`, `${g < 0 ? "overlap" : `gap ${Math.round(g)}px`}: ${a.id} ${r(a)} × ${b.id} ${r(b)}`);
    }
  const on = all.filter((i) => i.op >= 0.5);
  const main = [...new Set(on.filter((i) => MAIN.has(i.kind)).map((i) => i.group))];
  const data = [...new Set(on.filter((i) => i.kind === "data").map((i) => i.group))];
  if (main.length > 1) note(f, `main ${main.join()}`, `${main.length} main labels at once: ${main.join(", ")}`);
  if (data.length > 1) note(f, `data ${data.join()}`, `${data.length} data layers at once: ${data.join(", ")}`);
}

// ------------------------------------------------------------------ timing: one record per appearance of a label
const runs = [];
const open = new Map();
for (const [f, all] of sorted) {
  const seen = new Set();
  for (const it of all.filter((i) => TIMED.has(i.kind))) {
    seen.add(it.id);
    let run = open.get(it.id);
    if (!run) {
      run = { id: it.id, kind: it.kind, group: it.group, into: it.into.length > 0, cue: it.cue, appear: f, full: null, leave: null };
      open.set(it.id, run);
      runs.push(run);
    }
    if (it.cue != null) run.cue = it.cue;
    if (it.op >= 0.95 && run.full == null) run.full = f;
    if (run.full != null && it.op < 0.95 && run.leave == null) run.leave = f;
  }
  for (const [id, run] of open)
    if (!seen.has(id)) {
      run.leave ??= f;
      run.gone = f;
      open.delete(id);
    }
}
const T = [];
for (const run of runs) {
  const s = shotAt(run.appear);
  const cut = cutAfter(run.appear);
  const end = Math.min(run.leave ?? FRAMES, cut);
  const need = HOLD[run.kind];
  run.lay = s.lay;
  run.cut = cut;
  run.hold = run.full == null ? null : end - run.full;
  const why = [];
  if (run.full == null && !run.into) why.push("never fully on");
  if (run.hold != null && run.hold < need && !run.into) why.push(`holds ${run.hold} < ${need}`);
  if (run.cue != null && (run.appear < run.cue - PRE - N || run.appear > run.cue + N)) why.push(`starts ${run.appear - run.cue >= 0 ? "+" : ""}${run.appear - run.cue} vs word`);
  if (run.appear < s.mv - N) why.push(`before camera settles (${run.appear - s.mv})`);
  run.ok = why.length === 0;
  run.why = why.join("; ");
  if (!run.ok) note(run.appear, `time ${run.id}`, `timing ${run.id} (${run.kind}): ${run.why}`);
  T.push(run);
}

// ------------------------------------------------------------------ cuts against the speech
const speech = TL.lines.flatMap((l) => {
  const o = [];
  let a = l.from;
  for (const [p0, p1] of l.pauses) o.push([a, p0]), (a = p1);
  o.push([a, l.to]);
  return o;
});
const cuts = [];
shots.forEach((s, i) => {
  if (i === 0 || s.trans === "morph") return;
  const c = s.at;
  const within = speech.find(([a, b]) => a < c && c < b);
  const last = Math.max(...speech.filter(([, b]) => b <= c).map(([, b]) => b));
  const next = Math.min(...speech.filter(([a]) => a >= c).map(([a]) => a));
  const rec = { lay: s.lay, at: c, tail: c - last, lead: next - c, ok: !within && c - last >= TAIL_MIN };
  cuts.push(rec);
  if (!rec.ok) note(c, `cut ${s.lay}`, within ? `cut inside speech at ${tc(c)}` : `cut only ${rec.tail} frames after the sentence`);
});

// ------------------------------------------------------------------ order-wall compositions
const walls = shots.filter((s) => s.world === "book" && s.trans !== "morph");
const fam = (s) => (s.comp ?? "").split(" · ")[0];
walls.forEach((s, i) => {
  if (i && fam(s) === fam(walls[i - 1])) note(s.at, `comp ${s.lay}`, `same wall composition twice in a row: ${walls[i - 1].lay} / ${s.lay} (${fam(s)})`);
});

// ------------------------------------------------------------------ report
const list = [...issues.values()].sort((a, b) => a.f0 - b.f0);
for (const e of list) console.log(`${tc(e.f0)}–${tc(e.f1)}  ${e.lay.padEnd(10)} ${e.msg}`);
const md = [
  "# 标注停留与切点报告（自动生成）",
  "",
  `由 \`npm run zq:layout\` 生成（每 ${N} 帧采样一次，帧数误差 ±${N}）。规则：标注在关键词前 0–${PRE} 帧开始出现；镜头运动稳定后才出现；完全可见后停留 ≥24 帧（说明卡 ≥36 帧）再离开或切镜；切点距上一句结束 ≥${TAIL_MIN} 帧。`,
  "",
  "## 每个标注",
  "",
  "| 镜头 | 标注 | 类型 | 关键词帧 | 开始出现 | 完全可见 | 离开 / 切镜 | 停留帧数 | 结果 |",
  "|---|---|---|---|---|---|---|---|---|",
  ...T.map((t) => `| ${t.lay} | \`${t.id.replace(/\|/g, "/")}\` | ${t.kind} | ${t.cue ?? "—"} | ${t.appear} | ${t.full ?? "—"} | ${Math.min(t.leave ?? FRAMES, t.cut)} | ${t.hold ?? "—"} | ${t.ok ? "✓" : t.into ? "并入下一个" : t.why} |`),
  "",
  "## 每个切点",
  "",
  "| 切入镜头 | 切点帧 | 上一句结束后 | 下一句开始前 |",
  "|---|---|---|---|",
  ...cuts.map((c) => `| ${c.lay} | ${c.at} (${tc(c.at)}) | ${c.tail} 帧 | ${c.lead} 帧 |`),
  "",
];
fs.writeFileSync("../outputs-zhanqian/timing-report.md", md.join("\n"));
fs.writeFileSync("src/zhanqian/labels.json", JSON.stringify(T.filter((t) => t.kind === "data" && t.group === t.id).map((t) => ({ id: t.id, at: t.appear })), null, 1));
const holds = T.filter((t) => t.hold != null && !t.into).map((t) => t.hold);
console.log(`\n${frames.size} frames checked · ${T.length} labels, shortest hold ${Math.min(...holds)} frames · ${cuts.length} cuts, shortest tail ${Math.min(...cuts.map((c) => c.tail))} frames`);
console.log(`${list.length} issues`);
process.exit(list.length ? 1 : 0);
