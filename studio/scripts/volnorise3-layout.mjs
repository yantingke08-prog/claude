// Layout check for the 放量不涨 v3 film: projects every chart's candle + volume box through the real camera at
// sampled frames and checks it against the HUD's label bands (hud.tsx BANDS), so a label can never sit on a candle.
// Usage: node scripts/volnorise3-layout.mjs [event[+-off] ...]   (no args = every key moment)
import { build } from "esbuild";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";

const entry = `
import { A, Bc, HOOK, box } from "./src/volnorise3/data";
import { projector } from "./src/volnorise3/director";
import { E, FRAMES } from "./src/volnorise3/cue";
import { BANDS, bandsAt } from "./src/volnorise3/bands";
export { A, Bc, HOOK, box, projector, E, FRAMES, BANDS, bandsAt };
`;
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "vnr3-layout-"));
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
const evs = picks.length ? picks : ["hQ", "cd2", "punch+20", "tHigh", "wVol+40", "wCeil+20", "wTop+20", "pLow+20", "lBase+10", "lHand+10", "lDone", "gRise+10", "gSign+20", "sA3", "sB3", "xHigh", "eQ", "eRisk+20"];
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
    if (s.y1 > 1900 && s.x1 > 0 && s.x0 < 1440) {
      note += " UNDER-CAPTION";
      bad++;
    }
    rows.push(`${name} x ${r(s.x0)}..${r(s.x1)} y ${r(s.y0)}..${r(s.y1)}${note}`);
  }
  console.log(`${p.padEnd(10)} f${String(f).padStart(5)}  ${rows.join(" | ") || "(no chart in frame)"}`);
}
fs.rmSync(tmp, { recursive: true, force: true });
console.log(bad ? `${bad} problem(s)` : "layout ok: no label band touches a chart, nothing under the captions");
process.exit(bad ? 1 : 0);
