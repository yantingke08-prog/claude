// Dumps the film's event schedule (cuts, trades, hops, stops) to src/zhanqian/cues.json so that
// scripts/zhanqian-score.py can hit the same frames without keeping a second copy of book.ts.
// Usage: npx tsx scripts/zhanqian-cues.ts
import fs from "node:fs";
import { FIRST_HIT, HOPS, LEVELS, MINES, PASSIVE, REFILLS, TRADES } from "../src/zhanqian/book";
import { SHOTS } from "../src/zhanqian/director";

const cues = {
  shots: SHOTS.map((s) => ({ at: s.at, lay: s.lay, world: s.w, flash: s.flash ?? null, part: s.part, trans: s.trans ?? null })),
  trades: TRADES,
  hops: Object.entries(HOPS).map(([k, at]) => ({ k: Number(k), at })),
  mines: MINES,
  levels: LEVELS.map((l) => ({ side: l.side, k: l.k, at: l.at })),
  refills: [...REFILLS, ...PASSIVE],
  firstHit: FIRST_HIT,
};
fs.writeFileSync("src/zhanqian/cues.json", JSON.stringify(cues, null, 1));
console.log(`cues.json: ${cues.shots.length} shots, ${cues.trades.length} trades`);
