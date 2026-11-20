// Pure timeline logic (no Remotion imports) so node scripts can reuse it:
//   node --experimental-strip-types scripts/check-timeline.mts
// Turns the script + vo.timestamps.json (+ real audio duration) into caption units and shots.
// No time point is hard-coded anywhere: every second comes from the timestamps file or,
// when that file is missing/empty, from an even split by caption text length.
import type { Line, VoTimestamps, Word } from "./audioContract";

export type ScriptSegment = { text: string; shot: string };
export type ScriptFile = { id: string; title: string; paragraphs: ScriptSegment[][] };

export type Unit = {
  i: number;
  raw: string; // exact script text of this caption unit (incl. punctuation)
  display: string; // caption text (trailing ，。；： dropped, nothing else changed)
  spoken: string; // normalised spoken characters (what timestamps map onto)
  shot: string;
  start: number;
  end: number;
  charStart: number[]; // start time of every spoken character
  words: Word[]; // one per spoken character (word-level highlight in captions)
  pauseAfter: boolean; // ［短暂停顿］ follows this unit
  sentenceEnd: boolean;
};
export type Shot = { id: string; start: number; end: number; units: number[] };
export type Timeline = {
  duration: number;
  units: Unit[];
  shots: Shot[];
  source: "timestamps" | "fallback";
  warnings: string[];
};

const PAUSE = /［短暂停顿］|\[短暂停顿\]/;
const BREAK_AFTER = "，。；？！：";
const DROP_TRAILING = /[，。；：、]+$/;
const NON_SPOKEN = /[\s，。；？！：、"“”‘’'「」『』《》（）()［］[\]…—\-·,.;?!:]/g;

export const normalise = (s: string) => s.replace(PAUSE, "").replace(NON_SPOKEN, "").toUpperCase();

type RawUnit = { raw: string; shot: string; pauseAfter: boolean; sentenceEnd: boolean };

/** Split the script into single-line caption units: after ，。；？！： and at every ［短暂停顿］. */
export const splitUnits = (script: ScriptFile): RawUnit[] => {
  const out: RawUnit[] = [];
  for (const para of script.paragraphs) {
    for (const seg of para) {
      const pieces = seg.text.split(PAUSE);
      pieces.forEach((piece, pi) => {
        let buf = "";
        const flush = () => {
          if (normalise(buf).length) out.push({ raw: buf, shot: seg.shot, pauseAfter: false, sentenceEnd: /[。？！]["”]?$/.test(buf) });
          else if (buf && out.length) out[out.length - 1].raw += buf; // stray closing quote etc.
          buf = "";
        };
        for (const ch of piece) {
          buf += ch;
          if (BREAK_AFTER.includes(ch)) flush();
        }
        flush();
        if (pi < pieces.length - 1 && out.length) out[out.length - 1].pauseAfter = true;
      });
    }
  }
  return out;
};

const PLACEHOLDER_CPS = 4.3; // spoken chars per second, only for the no-audio placeholder length

type CharT = { start: number; end: number };

/** Flatten timestamps into one timed entry per spoken character. */
const charsFromTimestamps = (ts: VoTimestamps): CharT[] => {
  const out: CharT[] = [];
  const spread = (text: string, start: number, end: number) => {
    const n = normalise(text).length;
    for (let k = 0; k < n; k++) out.push({ start: start + ((end - start) * k) / n, end: start + ((end - start) * (k + 1)) / n });
  };
  for (const line of [...ts.lines].sort((a, b) => a.start - b.start)) {
    if (line.words && line.words.length) for (const w of line.words) spread(w.word, w.start, w.end);
    else spread(line.text, line.start, line.end);
  }
  return out;
};

const validTimestamps = (ts: VoTimestamps | null | undefined): ts is VoTimestamps =>
  !!ts &&
  Array.isArray(ts.lines) &&
  ts.lines.some((l: Line) => Number.isFinite(l.end) && l.end > 0 && normalise(l.text ?? "").length > 0);

export const buildTimeline = (
  script: ScriptFile,
  ts: VoTimestamps | null | undefined,
  audioSeconds: number | null | undefined,
): Timeline => {
  const warnings: string[] = [];
  const raw = splitUnits(script);
  const spoken = raw.map((u) => normalise(u.raw));
  const totalChars = spoken.reduce((s, x) => s + x.length, 0);

  const tsOk = validTimestamps(ts);
  let duration = audioSeconds && audioSeconds > 0 ? audioSeconds : 0;
  if (!duration && tsOk && ts.duration > 0) {
    duration = ts.duration;
    warnings.push("vo.mp3 duration unavailable: using duration from vo.timestamps.json.");
  }
  if (!duration) {
    duration = Math.ceil(totalChars / PLACEHOLDER_CPS) + 2;
    warnings.push(`No usable vo.mp3: placeholder duration ${duration}s. Put the real voiceover at public/audio/vo.mp3.`);
  }

  let chars: CharT[];
  let source: Timeline["source"];
  if (tsOk) {
    source = "timestamps";
    const tc = charsFromTimestamps(ts);
    if (tc.length === totalChars) chars = tc;
    else {
      warnings.push(`Timestamps have ${tc.length} spoken chars, script has ${totalChars}: mapping proportionally.`);
      chars = Array.from({ length: totalChars }, (_, k) => tc[Math.min(tc.length - 1, Math.floor((k * tc.length) / totalChars))]);
    }
  } else {
    source = "fallback";
    warnings.push("vo.timestamps.json missing or empty: splitting the voiceover evenly by caption text length. Run scripts/align-vo.ps1.");
    // weight = spoken chars + a little air for punctuation and ［短暂停顿］
    const lead = Math.min(0.4, duration * 0.01);
    const weights = raw.map((u, k) => spoken[k].length + (u.pauseAfter ? 2.5 : u.sentenceEnd ? 1.2 : 0.5));
    const W = weights.reduce((s, x) => s + x, 0);
    const usable = Math.max(1, duration - lead - 0.6);
    chars = [];
    let t = lead;
    raw.forEach((_, k) => {
      const span = (usable * weights[k]) / W;
      const speak = (span * spoken[k].length) / weights[k];
      const n = spoken[k].length;
      for (let c = 0; c < n; c++) chars.push({ start: t + (speak * c) / n, end: t + (speak * (c + 1)) / n });
      t += span;
    });
  }

  let g = 0;
  const units: Unit[] = raw.map((u, i) => {
    const n = spoken[i].length;
    const mine = chars.slice(g, g + n);
    g += n;
    return {
      i,
      raw: u.raw,
      display: u.raw.replace(DROP_TRAILING, ""),
      spoken: spoken[i],
      shot: u.shot,
      start: mine[0].start,
      end: mine[n - 1].end,
      charStart: mine.map((c) => c.start),
      words: mine.map((c, k) => ({ word: spoken[i][k], start: c.start, end: c.end })),
      pauseAfter: u.pauseAfter,
      sentenceEnd: u.sentenceEnd,
    };
  });

  // optional shot override from the timestamps file (line.shot wins for units starting inside that line)
  if (tsOk) {
    for (const line of ts.lines) {
      if (!line.shot) continue;
      for (const u of units) if (u.start >= line.start - 1e-3 && u.start < line.end) u.shot = line.shot;
    }
  }
  // ［短暂停顿］ is a breakpoint: never cut away during the pause
  for (let i = 0; i + 1 < units.length; i++) {
    if (units[i].pauseAfter && units[i + 1].shot !== units[i].shot) {
      warnings.push(`Shot change right at a ［短暂停顿］ (unit ${i}) moved past the pause.`);
      units[i + 1].shot = units[i].shot;
    }
  }
  const lastEnd = units[units.length - 1].end;
  if (duration < lastEnd) {
    warnings.push("Timestamps run past the audio: extending duration.");
    duration = lastEnd + 0.5;
  }

  const shots: Shot[] = [];
  for (const u of units) {
    const last = shots[shots.length - 1];
    if (last && last.id === u.shot) last.units.push(u.i);
    else shots.push({ id: u.shot, start: u.start, end: 0, units: [u.i] });
  }
  shots[0].start = 0;
  shots.forEach((s, k) => (s.end = k + 1 < shots.length ? shots[k + 1].start : duration));
  return { duration, units, shots, source, warnings };
};
