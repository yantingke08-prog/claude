// Writes the caption units (same split the film uses) as JSON for the Python aligner.
// node --experimental-strip-types scripts/sanzhong-units.mts <out.json>
import fs from "node:fs";
import { PARAGRAPHS } from "../src/sanzhong/script.ts";
import { normalise, splitUnits } from "../src/sanzhong/timeline.ts";

const units = splitUnits(PARAGRAPHS).map((u) => ({ raw: u.raw, shot: u.shot, spoken: normalise(u.raw) }));
fs.writeFileSync(process.argv[2], JSON.stringify(units, null, 1), "utf8");
console.log(`[units] ${units.length} units, ${units.reduce((s, u) => s + u.spoken.length, 0)} spoken chars -> ${process.argv[2]}`);
