// npm run sync — time the script against YOUR voiceover, with nothing to install.
//
// Reads public/audio/vo.mp3 (decoded by the ffmpeg that ships with Remotion), finds every pause in
// the voice, and aligns the 99 script lines to those pauses. TTS voices pause at almost every
// clause, so line boundaries land on real pauses. Where a boundary has no pause, the time is split
// by character count. Writes public/audio/vo.timestamps.json, stamped with the audio's size and
// length, so the film knows the timings belong to this exact file.
//
//   npm run sync                 (uses public/audio/vo.mp3)
//   npm run sync -- path/to.mp3  (another file; still writes public/audio/vo.timestamps.json)
import { spawnSync } from "node:child_process";
import { readFileSync, statSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const audioPath = path.resolve(process.argv[2] ?? path.join(root, "public/audio/vo.mp3"));
const outPath = path.join(root, "public/audio/vo.timestamps.json");

// ---- script lines (same parse as scripts/align_vo.py)
const src = readFileSync(path.join(root, "src/script.ts"), "utf8");
const LINES = [...src.matchAll(/L\("(\w+)",\s*[\d.]+,\s*[\d.]+,\s*"([^"]*)"\)/g)].map((m) => ({ shot: m[1], text: m[2] }));
const NON_SPOKEN = /[\s|，。；？！：、"“”‘’'「」『』《》（）()［］[\]…—\-·,.;?!:]/g;
const chars = LINES.map((l) => l.text.replace(NON_SPOKEN, "").length);
if (!LINES.length) throw new Error("no lines parsed from src/script.ts");

// ---- decode to 16 kHz mono PCM
const RATE = 16000;
const dec = spawnSync("npx", ["remotion", "ffmpeg", "-v", "error", "-i", `"${audioPath}"`, "-ac", "1", "-ar", String(RATE), "-acodec", "pcm_s16le", "-f", "wav", "-"], {
  cwd: root,
  shell: true,
  maxBuffer: 1 << 30,
});
if (dec.status !== 0 || !dec.stdout?.length) {
  console.error(dec.stderr?.toString() || "ffmpeg failed");
  process.exit(1);
}
// find the WAV "data" chunk (its size field may be 0xFFFFFFFF when piped: use the rest of the buffer)
const wav = dec.stdout;
let off = 12;
while (off + 8 <= wav.length && wav.toString("ascii", off, off + 4) !== "data") off += 8 + wav.readUInt32LE(off + 4);
off += 8;
const bytesLeft = wav.length - off;
const aligned = Buffer.from(wav.subarray(off, off + bytesLeft - (bytesLeft % 2)));
const pcm = new Int16Array(aligned.buffer, aligned.byteOffset, aligned.length / 2);
const fileSeconds = pcm.length / RATE;

// ---- 10 ms energy envelope (dB)
const HOP = RATE / 100;
const db = [];
for (let i = 0; i + HOP <= pcm.length; i += HOP) {
  let e = 0;
  for (let k = i; k < i + HOP; k++) e += pcm[k] * pcm[k];
  db.push(10 * Math.log10(e / HOP + 1e-9));
}
const sorted = [...db].sort((a, b) => a - b);
const pct = (p) => sorted[Math.min(sorted.length - 1, Math.floor(p * sorted.length))];
const floor = pct(0.05);
const loud = pct(0.95);
const thr = Math.max(floor + 10, loud - 32);
const voiced = db.map((x) => x > thr);
// smooth: fill gaps < 80 ms inside speech, drop blips < 60 ms
const fill = (arr, val, maxLen) => {
  let i = 0;
  while (i < arr.length) {
    if (arr[i] === val) {
      let j = i;
      while (j < arr.length && arr[j] === val) j++;
      if (j - i < maxLen && i > 0 && j < arr.length) for (let k = i; k < j; k++) arr[k] = !val;
      i = j;
    } else i++;
  }
};
fill(voiced, false, 8);
fill(voiced, true, 6);
const first = voiced.indexOf(true);
const last = voiced.lastIndexOf(true);
if (first < 0) {
  console.error("No speech found in the audio.");
  process.exit(1);
}
const T = (frame) => frame / 100;
const speechStart = T(first);
const speechEnd = T(last + 1);

// pauses (≥ 120 ms) between speechStart and speechEnd
const pauses = [];
for (let i = first; i <= last; ) {
  if (!voiced[i]) {
    let j = i;
    while (j <= last && !voiced[j]) j++;
    if (j - i >= 12) pauses.push({ a: T(i), b: T(j) });
    i = j;
  } else i++;
}
// speech clock: time with pauses removed
const clock = (t) => {
  let s = t - speechStart;
  for (const p of pauses) if (p.b <= t) s -= p.b - p.a;
  else if (p.a < t) s -= t - p.a;
  return s;
};
const S = clock(speechEnd);
const C = chars.reduce((a, b) => a + b, 0);
const cum = [0];
for (const c of chars) cum.push(cum[cum.length - 1] + c);

// ---- DP: match line boundaries (1..L-1) to pauses (in order), skipping either side at a cost
const L = LINES.length;
const P = pauses.length;
const pc = pauses.map((p) => clock(p.a));
const boundaryWeight = LINES.map((l) => (/[，。？！、；：|]$/.test(l.text) ? 1 : 0.85)); // every line ends a clause
const skipPause = (j) => 0.25 + 3.0 * Math.min(1, (pauses[j].b - pauses[j].a) / 0.45) ** 2;
const SKIP_BOUNDARY = 1.2;
const interval = (dc, ds) => {
  const expect = (dc / C) * S;
  const r = Math.log(Math.max(0.05, ds) / Math.max(0.05, expect));
  return 10 * r * r;
};
// states: boundary k (0 = start, L = end) matched to pause j (-1 = start, P = end)
const KEY = (k, j) => k * (P + 2) + (j + 1);
const cost = new Float64Array((L + 1) * (P + 2)).fill(Infinity);
const prev = new Int32Array((L + 1) * (P + 2)).fill(-1);
cost[KEY(0, -1)] = 0;
const MAXK = 5;
const MAXJ = 9;
for (let k = 1; k <= L; k++) {
  const js = k === L ? [P] : Array.from({ length: P }, (_, j) => j);
  for (const j of js) {
    const pos = j === P ? S : pc[j];
    let best = Infinity;
    let arg = -1;
    for (let k0 = Math.max(0, k - MAXK); k0 < k; k0++) {
      const jFrom = k0 === 0 ? [-1] : [];
      if (k0 > 0) for (let j0 = Math.max(0, (j === P ? P : j) - MAXJ); j0 < (j === P ? P : j); j0++) jFrom.push(j0);
      for (const j0 of jFrom) {
        const c0 = cost[KEY(k0, j0)];
        if (!Number.isFinite(c0)) continue;
        const pos0 = j0 === -1 ? 0 : pc[j0];
        if (pos < pos0) continue;
        let c = c0 + interval(cum[k] - cum[k0], pos - pos0);
        for (let kk = k0 + 1; kk < k; kk++) c += SKIP_BOUNDARY * boundaryWeight[kk - 1];
        for (let jj = j0 + 1; jj < (j === P ? P : j); jj++) c += skipPause(jj);
        if (c < best) {
          best = c;
          arg = KEY(k0, j0);
        }
      }
    }
    cost[KEY(k, j)] = best;
    prev[KEY(k, j)] = arg;
  }
}
// backtrack
const match = new Array(L + 1).fill(null); // match[k] = pause index for boundary k
let cur = KEY(L, P);
if (!Number.isFinite(cost[cur])) {
  console.error("Could not align the script to the audio (is this the right voiceover?)");
  process.exit(1);
}
while (cur !== KEY(0, -1) && cur >= 0) {
  const k = Math.floor(cur / (P + 2));
  const j = (cur % (P + 2)) - 1;
  match[k] = j;
  cur = prev[cur];
}
// ---- line times: matched boundaries sit on pauses; the rest are split by characters
const startT = new Array(L).fill(0);
const endT = new Array(L).fill(0);
const anchors = [{ k: 0, end: speechStart, start: speechStart }];
for (let k = 1; k < L; k++) if (match[k] !== null && match[k] >= 0 && match[k] < P) anchors.push({ k, end: pauses[match[k]].a, start: pauses[match[k]].b });
anchors.push({ k: L, end: speechEnd, start: speechEnd });
for (let a = 0; a + 1 < anchors.length; a++) {
  const A = anchors[a];
  const B = anchors[a + 1];
  const t0 = A.start;
  const t1 = B.end;
  const n = cum[B.k] - cum[A.k];
  for (let k = A.k; k < B.k; k++) {
    startT[k] = t0 + ((t1 - t0) * (cum[k] - cum[A.k])) / n;
    endT[k] = t0 + ((t1 - t0) * (cum[k + 1] - cum[A.k])) / n;
  }
}
const lines = LINES.map((l, k) => ({ text: l.text.replace(/\|/g, ""), start: +startT[k].toFixed(3), end: +endT[k].toFixed(3), shot: l.shot }));
const bytes = statSync(audioPath).size;
writeFileSync(
  outPath,
  JSON.stringify({ duration: +fileSeconds.toFixed(3), source: "sync-vo (pause alignment)", audio: { bytes, seconds: +fileSeconds.toFixed(3) }, lines }, null, 1) + "\n",
  "utf8",
);

// ---- report
const matched = anchors.length - 2;
const rates = lines.map((l, k) => chars[k] / Math.max(0.05, l.end - l.start));
const med = [...rates].sort((a, b) => a - b)[Math.floor(rates.length / 2)];
const odd = lines.map((l, k) => ({ k, r: rates[k] / med })).filter((x) => x.r < 0.55 || x.r > 1.8);
console.log(`audio ${fileSeconds.toFixed(2)} s, speech ${speechStart.toFixed(2)} → ${speechEnd.toFixed(2)} s, ${pauses.length} pauses`);
console.log(`${matched}/${L - 1} line boundaries sit on a pause; median ${med.toFixed(1)} chars/s`);
if (odd.length) for (const o of odd) console.log(`  check line ${o.k + 1}: ${lines[o.k].text} (${(o.r * 100).toFixed(0)} % of normal speed)`);
console.log(`wrote ${path.relative(root, outPath)}`);
