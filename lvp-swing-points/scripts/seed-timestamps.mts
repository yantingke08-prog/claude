// npm run seed — writes public/audio/vo.timestamps.json from the production script's suggested
// timings (src/script.ts `seed`). Replace it with real alignment once the voiceover exists
// (scripts/align-vo.ps1), or edit start/end by hand.
import { writeFileSync } from "node:fs";
import { LINES } from "../src/script.ts";

const out = {
  duration: Math.max(...LINES.map((l) => l.seed[1])),
  lines: LINES.map((l) => ({ text: l.text.replace(/\|/g, ""), start: l.seed[0], end: l.seed[1], shot: l.shot })),
};
writeFileSync(new URL("../public/audio/vo.timestamps.json", import.meta.url), JSON.stringify(out, null, 1) + "\n", "utf8");
console.log(`wrote ${out.lines.length} lines, ${out.duration}s`);
