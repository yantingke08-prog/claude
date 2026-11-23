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
};

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

export const buildTimeline = (ts: VoTimestamps | null | undefined, audioSeconds: number | null | undefined, script: ScriptLine[] = LINES): Timeline => {
  const warnings: string[] = [];
  const spokenPer = script.map((l) => normalise(l.text));
  const total = spokenPer.reduce((s, x) => s + x.length, 0);
  const tsOk = valid(ts);

  let duration = audioSeconds && audioSeconds > 0 ? audioSeconds : 0;
  if (!duration && tsOk && ts.duration > 0) {
    duration = ts.duration;
    warnings.push("public/audio/vo.mp3 not found: length taken from vo.timestamps.json (film is silent).");
  }
  if (!duration) {
    duration = DEFAULT_DURATION;
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
      chars = Array.from({ length: total }, (_, k) => tc[Math.min(tc.length - 1, Math.floor((k * tc.length) / total))]);
    }
  } else {
    source = "fallback";
    warnings.push("vo.timestamps.json missing or empty: splitting the audio evenly by text length.");
    const gapBefore = new Map(BUMPERS.map((b) => [b.before, b.fallbackGap]));
    const firstOf = new Set<number>();
    script.forEach((l, k) => (k === 0 || script[k - 1].shot !== l.shot) && firstOf.add(k));
    const gaps = script.map((l, k) => (firstOf.has(k) ? gapBefore.get(l.shot) ?? 0 : 0));
    const weights = spokenPer.map((s) => s.length + 0.9);
    const W = weights.reduce((a, b) => a + b, 0);
    const usable = Math.max(1, duration - 0.6 - gaps.reduce((a, b) => a + b, 0));
    chars = [];
    let t = 0;
    script.forEach((_, k) => {
      t += gaps[k];
      const span = (usable * weights[k]) / W;
      const n = spokenPer[k].length;
      const speak = span * (n / weights[k]);
      for (let c = 0; c < n; c++) chars.push({ start: t + (speak * c) / n, end: t + (speak * (c + 1)) / n });
      t += span;
    });
  }

  let g = 0;
  const lines: TimedLine[] = script.map((l, i) => {
    const n = spokenPer[i].length;
    const mine = chars.slice(g, g + n);
    g += n;
    return { i, text: l.text, shot: l.shot, start: mine[0].start, end: mine[n - 1].end, charStart: mine.map((c) => c.start) };
  });
  if (tsOk) {
    for (const tl of ts.lines) {
      if (!tl.shot) continue;
      for (const l of lines) if (l.start >= tl.start - 1e-3 && l.start < tl.end) l.shot = tl.shot as ShotId;
    }
  }
  const lastEnd = lines[lines.length - 1].end;
  if (duration < lastEnd) {
    warnings.push("Timestamps run past the audio length: extending the film.");
    duration = lastEnd + 0.4;
  }

  // caption units: one per `|` piece, timed by its own characters
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

  // shots: from the first line of a shot to the first line of the next one
  const shots: Shot[] = [];
  for (const l of lines) {
    const last = shots[shots.length - 1];
    if (!last || last.id !== l.shot) shots.push({ id: l.shot, start: l.start, end: 0 });
  }
  shots[0].start = 0;
  // bumpers live in the silence before their target shot
  for (const b of BUMPERS) {
    const k = shots.findIndex((s) => s.id === b.before);
    if (k <= 0) continue;
    const prevLast = lines.filter((l) => l.shot === shots[k - 1].id).pop();
    const from = prevLast ? prevLast.end + 0.05 : shots[k].start - b.fallbackGap;
    if (shots[k].start - from < 1.5) warnings.push(`Only ${(shots[k].start - from).toFixed(2)}s of silence for the "${b.id}" card before "${b.before}".`);
    shots.splice(k, 0, { id: b.id, start: from, end: 0 });
  }
  shots.forEach((s, k) => (s.end = k + 1 < shots.length ? shots[k + 1].start : duration));

  const spoken = spokenPer.join("");
  return { duration, lines, units, shots, spoken, spokenT: chars.map((c) => c.start), source, warnings };
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
