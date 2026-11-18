// Layout check for the active/passive film without rendering anything: bundles src/activepassive/layoutcheck.ts with
// esbuild and walks every frame (zones from layout.ts, labels and data boxes from scene.ts).
// Usage: node scripts/activepassive-layout.mjs [--rows] [--holds]      exit code 1 when anything overlaps or leaves its zone
import { build } from "esbuild";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";

const out = path.join(fs.mkdtempSync(path.join(os.tmpdir(), "ap-layout-")), "check.mjs");
await build({ entryPoints: ["src/activepassive/layoutcheck.ts"], bundle: true, platform: "node", format: "esm", outfile: out, logLevel: "error", external: ["remotion", "react"] });
const { run } = await import(pathToFileURL(out).href);
const t = Date.now();
const r = run();
if (process.argv.includes("--holds")) for (const row of r.ext) console.log(row);
if (process.argv.includes("--rows")) for (const row of r.rows) console.log(row);
for (const d of r.dropped) console.log(`DROPPED label ${d.id}: ${d.reason}`);
for (const i of r.issues) console.log(`f${String(i.f).padStart(5)}  ${i.what}`);
const bad = r.issues.length + r.dropped.length;
console.log(`${r.rows.length} key event frames, ${r.spans.length} labels, ${r.verdicts.length} conclusions checked in ${((Date.now() - t) / 1000).toFixed(1)}s: ${bad ? bad + " problem(s)" : "no overlaps, everything inside its zone"}`);
process.exit(bad ? 1 : 0);
