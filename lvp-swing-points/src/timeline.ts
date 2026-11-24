// Pure timeline logic (no Remotion imports) so node scripts can reuse it.
// script lines + vo.timestamps.json (+ real audio length) -> timed lines, caption units, shots.
// No time point is hard-coded: every second comes from the timestamps file, or — when it is
// missing/empty — from an even split of the audio by text length.
import { BUMPERS, LINES, type ScriptLine, type ShotId } from "./script.ts";

export type Word = { word: string; start: number; end: number };
export type TsLine = { text: string; start: number; end: number; words?: Word[]; shot?: string };
export type VoTimestamps = { duration: number; lines: TsLine[] };

export const VO_AUDIO = "audio/vo.mp3";
export const VO_TIMESTAMPS = "audio/vo.timestamps.json";

export type TimedLine = { i: number; text: string; shot: ShotId; start: number; end: number; charStart: number[] };
export type Unit = { i: number; line: number; text: string; start: number; end: number };
export type Shot = { id: ShotId; start: number; end: number };
export type Timeline = {
  duration: number;
  lines: TimedLine[];
  units: Unit[];
  shots: Shot[];
  /** every spoken character of the film in order, with its start time (for text anchors) */
  spoken: string;
  spokenT: number[];
  source: "timestamps" | "fallback";
  warnings: string[];
  /** how the raw voiceover is laid on the film: play [from, to) of the file at film time `at` */
  audio: { segments: AudioSeg[]; fileSeconds: number; insert: number; split: number };
  /** the last spoken character ends here (film time); after it the picture fades to black */
  speechEnd: number;
};
export type AudioSeg = { from: number; to: number; at: number };

/** after the last word: a short hold, then a fade to black (no long freeze, no trailing silence) */
export const END_HOLD = 0.35;
export const END_FADE = 0.9;

const NON_SPOKEN = /[\s|，。；？！：、"“”‘’'「」『』《》（）()［］[\]…—\-·,.;?!:]/g;
export const normalise = (s: string) => s.replace(NON_SPOKEN, "").toUpperCase();
export const captionPieces = (text: string) =>
  text
    .split("|")
    .map((p) => p.replace(/[，。；：、]+$/, ""))
    .filter((p) => normalise(p).length);

export const DEFAULT_DURATION = 190.9; // only when there is neither audio nor timestamps

type CharT = { start: number; end: number };

const charsFromTimestamps = (ts: VoTimestamps): CharT[] => {
  const out: CharT[] = [];
  const spread = (text: string, a: number, b: number) => {
    const n = normalise(text).length;
    for (let k = 0; k < n; k++) out.push({ start: a + ((b - a) * k) / n, end: a + ((b - a) * (k + 1)) / n });
  };
  for (const l of [...ts.lines].sort((x, y) => x.start - y.start)) {
    if (l.words?.length) for (const w of l.words) spread(w.word, w.start, w.end);
    else spread(l.text, l.start, l.end);
  }
  return out;
};

const valid = (ts: VoTimestamps | null | undefined): ts is VoTimestamps =>
  !!ts && Array.isArray(ts.lines) && ts.lines.some((l) => Number.isFinite(l.end) && l.end > 0 && normalise(l.text ?? "").length > 0);

/** Repair ASR / alignment glitches: characters out of order, overlapping or with no length. */
export const sanitiseChars = (chars: CharT[]) => {
  let fixed = 0;
  const out = chars.map((c) => ({ ...c }));
  for (let k = 0; k < out.length; k++) {
    const c = out[k];
    const prev = out[k - 1];
    if (prev && c.start < prev.start + 0.02) {
      c.start = prev.start + 0.02;
      fixed++;
    }
    if (prev && prev.end > c.start) prev.end = c.start; // no overlap
    if (c.end < c.start + 0.02) {
      c.end = c.start + 0.02;
      fixed++;
    }
  }
  return { chars: out, fixed };
};

export const buildTimeline = (ts: VoTimestamps | null | undefined, audioSeconds: number | null | undefined, script: ScriptLine[] = LINES): Timeline => {
  const warnings: string[] = [];
  const spokenPer = script.map((l) => normalise(l.text));
  const total = spokenPer.reduce((s, x) => s + x.length, 0);
  const tsOk = valid(ts);

  // 1. per-character times in AUDIO-FILE time
  let fileSeconds = audioSeconds && audioSeconds > 0 ? audioSeconds : 0;
  if (!fileSeconds && tsOk && ts.duration > 0) {
    fileSeconds = ts.duration;
    warnings.push("public/audio/vo.mp3 not found: length taken from vo.timestamps.json (film is silent).");
  }
  if (!fileSeconds) {
    fileSeconds = DEFAULT_DURATION;
    warnings.push(`No vo.mp3 and no timestamps: placeholder length ${DEFAULT_DURATION}s.`);
  }
  let chars: CharT[];
  let source: Timeline["source"];
  if (tsOk) {
    source = "timestamps";
    const tc = charsFromTimestamps(ts);
    if (tc.length === total) chars = tc;
    else {
      warnings.push(`Timestamps have ${tc.length} spoken chars, script has ${total}: mapping proportionally.`);
      chars = Array.from({ length: total }, (_, k) => ({ ...tc[Math.min(tc.length - 1, Math.floor((k * tc.length) / total))] }));
    }
    const s = sanitiseChars(chars);
    chars = s.chars;
    if (s.fixed) warnings.push(`Repaired ${s.fixed} out-of-order / zero-length character times in vo.timestamps.json.`);
  } else {
    source = "fallback";
    warnings.push("vo.timestamps.json missing or empty: splitting the audio evenly by text length.");
    const weights = spokenPer.map((x) => x.length + 0.9);
    const W = weights.reduce((x, y) => x + y, 0);
    const usable = Math.max(1, fileSeconds - 0.6);
    chars = [];
    let t = 0;
    script.forEach((_, k) => {
      const span = (usable * weights[k]) / W;
      const n = spokenPer[k].length;
      const speak = span * (n / weights[k]);
      for (let c = 0; c < n; c++) chars.push({ start: t + (speak * c) / n, end: t + (speak * (c + 1)) / n });
      t += span;
    });
  }

  // 2. make room for the title card: pause the voiceover in the middle of the silence before the
  //    concept section. The cut sits in silence, so nothing is spliced into the voice itself.
  let insert = 0;
  let split = Number.POSITIVE_INFINITY;
  for (const b of BUMPERS) {
    let g = 0;
    let first = -1;
    for (let i = 0; i < script.length; i++) {
      if (script[i].shot === b.before) {
        first = g;
        break;
      }
      g += spokenPer[i].length;
    }
    if (first <= 0) continue;
    const silenceStart = chars[first - 1].end;
    const silenceEnd = chars[first].start;
    const existing = Math.max(0, silenceEnd - silenceStart);
    insert = Math.max(0, b.hold - existing);
    split = silenceStart + existing / 2;
  }
  const toFilm = (x: number) => x + (x >= split ? insert : 0);
  const filmChars = chars.map((c) => ({ start: toFilm(c.start), end: toFilm(c.end) }));

  // 3. lines, captions and shots in FILM time
  let g = 0;
  const lines: TimedLine[] = script.map((l, i) => {
    const n = spokenPer[i].length;
    const mine = filmChars.slice(g, g + n);
    g += n;
    return { i, text: l.text, shot: l.shot, start: mine[0].start, end: mine[n - 1].end, charStart: mine.map((c) => c.start) };
  });
  if (tsOk) {
    for (const tl of ts.lines) {
      if (!tl.shot) continue;
      const a0 = toFilm(tl.start);
      const a1 = toFilm(tl.end);
      for (const l of lines) if (l.start >= a0 - 1e-3 && l.start < a1) l.shot = tl.shot as ShotId;
    }
  }
  const speechEnd = lines[lines.length - 1].end;
  const duration = speechEnd + END_HOLD + END_FADE;
  const tail = toFilm(fileSeconds) - duration;
  if (tail > 1) warnings.push(`Dropped ${tail.toFixed(1)}s of trailing silence: the film ends ${END_HOLD + END_FADE}s after the last word.`);

  const units: Unit[] = [];
  for (const l of lines) {
    let k = 0;
    for (const p of captionPieces(l.text)) {
      const n = normalise(p).length;
      const a = l.charStart[k];
      const b = k + n < l.charStart.length ? l.charStart[k + n] : l.end;
      units.push({ i: units.length, line: l.i, text: p, start: a, end: b });
      k += n;
    }
  }

  const shots: Shot[] = [];
  for (const l of lines) {
    const last = shots[shots.length - 1];
    if (!last || last.id !== l.shot) shots.push({ id: l.shot, start: l.start, end: 0 });
  }
  shots[0].start = 0;
  for (const b of BUMPERS) {
    const k = shots.findIndex((s) => s.id === b.before);
    if (k <= 0) continue;
    const prevLast = lines.filter((l) => l.shot === shots[k - 1].id).pop();
    const from = prevLast ? prevLast.end + 0.05 : shots[k].start - b.hold;
    shots.splice(k, 0, { id: b.id, start: from, end: 0 });
  }
  shots.forEach((s, k) => (s.end = k + 1 < shots.length ? shots[k + 1].start : duration));

  const segments: AudioSeg[] = Number.isFinite(split)
    ? [
        { from: 0, to: split, at: 0 },
        { from: split, to: fileSeconds, at: split + insert },
      ]
    : [{ from: 0, to: fileSeconds, at: 0 }];

  return {
    duration,
    lines,
    units,
    shots,
    spoken: spokenPer.join(""),
    spokenT: filmChars.map((c) => c.start),
    source,
    warnings,
    audio: { segments, fileSeconds, insert, split },
    speechEnd,
  };
};

/** Absolute time (s) at which `phrase` starts being spoken; searching from `after` (a phrase) if given. */
export const findAnchor = (tl: Timeline, phrase: string, after?: string): number | null => {
  const p = normalise(phrase);
  let from = 0;
  if (after) {
    const a = tl.spoken.indexOf(normalise(after));
    if (a < 0) return null;
    from = a + normalise(after).length;
  }
  const k = tl.spoken.indexOf(p, from);
  return k < 0 ? null : tl.spokenT[k];
};
