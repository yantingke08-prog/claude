// Prints the numbers the POC film takes from its demo data (src/poc/data.ts), and checks the ones the voice reads
// out (script.json) against them. Exit code 1 if the data and the script disagree.
// Usage: node scripts/poc-data-check.mjs [--rows A|B|C|W|D1..]
import { build } from "esbuild";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "poc-data-"));
const out = path.join(tmp, "b.mjs");
await build({ entryPoints: ["src/poc/data.ts"], bundle: true, platform: "node", format: "esm", outfile: out, logLevel: "error" });
const m = await import(pathToFileURL(out).href);

console.log("NUM", JSON.stringify(m.NUM));
for (const d of m.ALL) {
  const p = m.prof(d);
  const lo = Math.min(...d.bars.map((b) => b.l));
  const hi = Math.max(...d.bars.map((b) => b.h));
  console.log(`${d.id.padEnd(3)} bars ${String(d.bars.length).padStart(2)}  x ${d.x0.toFixed(1)}..${(d.x0 + (d.bars.length - 1) * d.xs).toFixed(1)}  ${lo}-${hi}  POC ${p.poc} (${Math.round(p.pocV)})  dPOC ${[...new Set(m.dpoc(d))].join(">")}`);
}
const want = process.argv.indexOf("--rows");
if (want > 0) {
  const d = m.ALL.find((x) => x.id === process.argv[want + 1]);
  const n = Number(process.argv[want + 2] ?? d.bars.length);
  const p = m.prof(d, n);
  [...p.rows].sort((a, b) => b[0] - a[0]).forEach(([pr, v]) => console.log(`  ${pr} ${"#".repeat(Math.round(v / 40))} ${Math.round(v)}`));
  d.bars.forEach((b, i) => console.log(`  bar ${i}: ${b.o} ${b.h} ${b.l} ${b.c} v${b.v}`));
}

// the voice's numbers, written as the voice reads them, must equal the data's
const sc = JSON.parse(fs.readFileSync("src/poc/script.json", "utf8"));
const zh = (n) => {
  const d = "零一二三四五六七八九";
  const s = String(n);
  if (n >= 1000 && n < 10000) {
    const [a, b, c, e] = s.split("").map(Number);
    let r = d[a] + "千";
    if (b) r += d[b] + "百" + (c ? d[c] + "十" + (e ? d[e] : "") : e ? "零" + d[e] : "");
    else if (c) r += "零" + (c === 1 ? "一十" : d[c] + "十") + (e ? d[e] : "");
    else if (e) r += "零" + d[e];
    return r;
  }
  if (n < 10) return d[n];
  if (n < 20) return "十" + (n % 10 ? d[n % 10] : "");
  if (n < 100) return d[Math.floor(n / 10)] + "十" + (n % 10 ? d[n % 10] : "");
  return s;
};
const text = sc.lines.map((l) => l.text).join("");
let bad = 0;
for (const [label, n] of Object.entries(sc.numbers ?? {})) {
  const v = label.split(".").reduce((o, k) => o?.[k], m.NUM);
  const said = zh(n);
  const ok = v === n && text.includes(said);
  if (!ok) bad++;
  console.log(`${ok ? "ok " : "BAD"} ${label}: data ${JSON.stringify(v)}, script says ${n} (${said}) ${text.includes(said) ? "" : "— not found in the voice text"}`);
}
process.exit(bad ? 1 : 0);
