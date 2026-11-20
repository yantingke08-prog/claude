// Layout check for the 放量不涨 v5 film. (1) projects every chart's candle + volume box through the real camera and
// checks it against the big-text bands (bands.ts); (2) measures every visible tag (tags.ts) against every candle
// (wick to wick) and volume column on screen: no overlap, inside the safe area, above the captions, attached to its
// object (anchor within GAP of the tag, on its side), and no two tags overlapping. Sampled every 3 frames.
// Usage: node scripts/volnorise5-layout.mjs [event[+-off] ...]   (no args = every key moment)
import { build } from "esbuild";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";

const entry = `
import { A, Bc, HOOK, box } from "./src/volnorise5/data";
import { projector } from "./src/volnorise5/director";
import { E, FRAMES } from "./src/volnorise5/cue";
import { BANDS, bandsAt } from "./src/volnorise5/bands";
import { placedAt, objectsAt, GAP } from "./src/volnorise5/tags";
export { A, Bc, HOOK, box, projector, E, FRAMES, BANDS, bandsAt, placedAt, objectsAt, GAP };
`;
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "vnr5-layout-"));
const out = path.join(tmp, "b.mjs");
await build({ stdin: { contents: entry, resolveDir: process.cwd(), loader: "ts" }, bundle: true, platform: "node", format: "esm", outfile: out, logLevel: "error", jsx: "automatic" });
const m = await import(pathToFileURL(out).href);

const screenBox = (pr, ch) => {
  const b = m.box(ch);
  const pts = [
    [b.x0, b.pHi], [b.x1, b.pHi], [b.x0, b.vLo], [b.x1, b.vLo],
  ].map(([x, y]) => pr(x, y, 0));
  const xs = pts.map((p) => p.x);
  const ys = pts.map((p) => p.y);
  return { x0: Math.min(...xs), x1: Math.max(...xs), y0: Math.min(...ys), y1: Math.max(...ys) };
};
const visible = (s) => s.x1 > 0 && s.x0 < 1440 && s.y1 > 0 && s.y0 < 2560;

const picks = process.argv.slice(2);
const evs = picks.length ? picks : ["hQ", "cd2", "punch+20", "tHigh", "wVol+40", "wCeil+20", "wTop+20", "pLow+20", "lBase+10", "lHand+10", "lDone", "gRise+10", "gSign+20", "sA3", "sB3", "eQ", "eRisk+20"];
const resolve = (s) => {
  const mm = s.match(/^([A-Za-z0-9]+)([+-]\d+)?$/);
  return /^\d+$/.test(s) ? Number(s) : Math.round(m.E(mm[1]) + Number(mm[2] ?? 0));
};
let bad = 0;
for (const p of evs) {
  const f = resolve(p);
  const pr = m.projector(f);
  const bands = m.bandsAt(f);
  const rows = [];
  for (const [name, ch] of [["hook", m.HOOK], ["A", m.A], ["B", m.Bc]]) {
    const s = screenBox(pr, ch);
    if (!visible(s)) continue;
    const r = (v) => Math.round(v);
    let note = "";
    // the bands (where labels may go) must not intersect any visible chart
    for (const [bn, b] of Object.entries(bands)) {
      if (!b) continue;
      const hit = !(b.x1 <= s.x0 || b.x0 >= s.x1 || b.y1 <= s.y0 || b.y0 >= s.y1);
      if (hit) {
        note += ` OVERLAPS ${bn}[${r(b.x0)}..${r(b.x1)} x ${r(b.y0)}..${r(b.y1)}]`;
        bad++;
      }
    }
    if (s.y1 > 2060 && s.x1 > 0 && s.x0 < 1440) {
      note += " UNDER-CAPTION";
      bad++;
    }
    rows.push(`${name} x ${r(s.x0)}..${r(s.x1)} y ${r(s.y0)}..${r(s.y1)}${note}`);
  }
  console.log(`${p.padEnd(10)} f${String(f).padStart(5)}  ${rows.join(" | ") || "(no chart in frame)"}`);
}
// ---- tags, every 3 frames
const hits = new Map();
const note = (key, f, msg) => {
  if (!hits.has(key)) hits.set(key, { f0: f, f1: f, msg });
  else hits.get(key).f1 = f;
};
const M = 3; // px of air required between a tag and any bar
const inter = (a, b, m = 0) => !(a.x1 + m <= b.x0 || a.x0 - m >= b.x1 || a.y1 + m <= b.y0 || a.y0 - m >= b.y1);
let shown = new Map();
for (let f = 0; f < m.FRAMES; f += 3) {
  const tags = m.placedAt(f).filter((t) => t.a > 0.25);
  if (!tags.length) continue;
  const objs = m.objectsAt(f);
  for (const t of tags) {
    const r = { x0: t.x0, x1: t.x0 + t.w, y0: t.y0, y1: t.y0 + t.h };
    shown.set(t.id, (shown.get(t.id) ?? 0) + 1);
    for (const o of objs) if (inter(r, o, M)) note(`${t.id}~${o.name}`, f, `${t.id} "${t.k}${t.v ? " " + t.v : ""}" touches ${o.name}`);
    if (r.x0 < 47 || r.x1 > 1393 || r.y0 < 340) note(`${t.id}~safe`, f, `${t.id} outside the safe area [${Math.round(r.x0)}..${Math.round(r.x1)} x ${Math.round(r.y0)}]`);
    if (r.y1 > 2060) note(`${t.id}~cap`, f, `${t.id} reaches the captions (y ${Math.round(r.y1)})`);
    const dx = t.ax < r.x0 ? r.x0 - t.ax : t.ax > r.x1 ? t.ax - r.x1 : 0;
    const dy = t.ay < r.y0 ? r.y0 - t.ay : t.ay > r.y1 ? t.ay - r.y1 : 0;
    if (Math.hypot(dx, dy) > 16.5) note(`${t.id}~far`, f, `${t.id} is ${Math.round(Math.hypot(dx, dy))} px from its object`);
  }
  for (let i = 0; i < tags.length; i++)
    for (let j = i + 1; j < tags.length; j++) {
      const a = tags[i], b = tags[j];
      if (inter({ x0: a.x0, x1: a.x0 + a.w, y0: a.y0, y1: a.y0 + a.h }, { x0: b.x0, x1: b.x0 + b.w, y0: b.y0, y1: b.y0 + b.h }, 4)) note(`${a.id}~${b.id}`, f, `${a.id} overlaps ${b.id}`);
    }
}
for (const [, h] of hits) {
  console.log(`TAG f${h.f0}..${h.f1}: ${h.msg}`);
  bad++;
}
console.log(`tags checked: ${[...shown.keys()].join(" ")}`);
fs.rmSync(tmp, { recursive: true, force: true });
console.log(bad ? `${bad} problem(s)` : "layout ok: no band touches a chart, every tag clear of every bar and within 16 px of its object, nothing under the captions");
process.exit(bad ? 1 : 0);
