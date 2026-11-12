// Renders the whole film as a 1/4-scale PNG sequence for the motion check (out/sc3seq).
// One process, ONE render tab, in frame order — the same way the final render runs (--concurrency=1).
// Found by this check: frames drawn by different tabs differ by 1–5 levels in a few semi-transparent shapes,
// and a machine loaded with several parallel renders can capture a frame before Chrome has finished
// painting it. Neither happens with a single tab, so the check and the deliverable both use one.
import { spawn } from "node:child_process";
import fs from "node:fs";

const RANGES = (process.env.RANGES ?? "0-2586").split(",");
fs.rmSync("out/sc3seq", { recursive: true, force: true });
const npx = process.platform === "win32" ? "npx.cmd" : "npx";
const runs = RANGES.map(
  (r) =>
    new Promise((ok, bad) => {
      const p = spawn(npx, ["remotion", "render", "SameCandle3", "out/sc3seq", "--sequence", "--scale=0.25", "--image-format=png", "--gl=swangle", "--concurrency=1", `--frames=${r}`, "--props=props/samecandle3-muted.json"], { shell: true, stdio: ["ignore", "ignore", "pipe"] });
      let err = "";
      p.stderr.on("data", (d) => (err += d));
      p.on("exit", (c) => (c === 0 ? (console.log(`frames ${r} done`), ok()) : bad(new Error(`frames ${r} failed\n${err.slice(-800)}`))));
    }),
);
await Promise.all(runs);
// each range pads its frame numbers to its own width; normalise to element-0000.png
for (const f of fs.readdirSync("out/sc3seq")) {
  const m = f.match(/^element-(\d+)\.png$/);
  if (m && m[1].length !== 4) fs.renameSync(`out/sc3seq/${f}`, `out/sc3seq/element-${m[1].padStart(4, "0")}.png`);
}
console.log(`${fs.readdirSync("out/sc3seq").length} frames in out/sc3seq`);
