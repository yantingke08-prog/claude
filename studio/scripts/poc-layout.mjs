// Layout check for the POC film, no rendering: every 3 frames, every visible tag (src/poc/tags.ts) is measured against
// every candle (wick to wick), volume column, profile brick and order-book row on screen, against the other tags, the
// safe area (x 48–1392, y 300–2060: captions live below) and the big-text band while a title is up.
// Usage: node scripts/poc-layout.mjs [--verbose]     exit code 1 on any problem
import { build } from "esbuild";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";

const entry = `
import { E, FRAMES } from "./src/poc/cue";
import { placedAt, objectsAt } from "./src/poc/tags";
export { E, FRAMES, placedAt, objectsAt };
`;
const out = path.join(fs.mkdtempSync(path.join(os.tmpdir(), "poc-layout-")), "b.mjs");
await build({ stdin: { contents: entry, resolveDir: process.cwd(), loader: "ts" }, bundle: true, platform: "node", format: "esm", outfile: out, logLevel: "error", jsx: "automatic" });
const m = await import(pathToFileURL(out).href);
const verbose = process.argv.includes("--verbose");
const hit = (a, b, pad = 2) => a.x0 < b.x1 - pad && a.x1 > b.x0 + pad && a.y0 < b.y1 - pad && a.y1 > b.y0 + pad;
// title bands (hud.tsx Big / End): y 380–720 while a title is up
const titles = [["hQ", "wIn"], ["yIn", "yStay"], ["uThree", "u1In"], ["u1In", "u1Days"], ["u2In", "u2Prior"], ["u3In", "u3Near"], ["zIn", "zRisk"]].map(([a, b]) => [m.E(a), m.E(b)]);
const problems = new Map();
const note = (key, f, ex = "") => {
  const p = problems.get(key);
  if (p) p.n++, (p.last = f);
  else problems.set(key, { first: f, last: f, n: 1, ex });
};
let checked = 0;
for (let f = 0; f < m.FRAMES; f += 3) {
  const tags = m.placedAt(f).filter((t) => t.a > 0.35);
  if (!tags.length) continue;
  const objs = m.objectsAt(f);
  const r = (t) => ({ x0: t.x0, x1: t.x0 + t.w, y0: t.y0, y1: t.y0 + t.h });
  for (const t of tags) {
    checked++;
    const a = r(t);
    const R = (q) => `[${Math.round(q.x0)},${Math.round(q.y0)}–${Math.round(q.x1)},${Math.round(q.y1)}]`;
    if (a.x0 < 48 || a.x1 > 1392 || a.y0 < 300 || a.y1 > 2060) note(`${t.id}: outside the safe area`, f, `"${t.k} ${t.v ?? ""}" ${R(a)}`);
    for (const o of objs) if (hit(a, o)) note(`${t.id}: over ${o.name.replace(/\d+$/, "#")}`, f, `${o.name} ${R(o)} vs tag ${R(a)}`);
    for (const u of tags) if (u.id < t.id && hit(a, r(u), 0)) note(`${t.id}: over tag ${u.id}`, f);
    if (titles.some(([x, y]) => f >= x && f < y) && a.y0 < 730) note(`${t.id}: in the title band`, f);
  }
}
console.log(`checked ${checked} tag placements over ${m.FRAMES} frames`);
for (const [k, p] of problems) console.log(`  ${k}  (frames ${p.first}–${p.last}, ${p.n} samples)  e.g. f${p.first} ${p.ex}`);
if (!problems.size) console.log("layout ok");
process.exit(problems.size ? 1 : 0);
