// Pure timeline logic (no Remotion imports; node scripts reuse it).
// script + vo.timestamps.json (+ real audio duration) -> caption units, shots, beats, sfx.
// Every second comes from the timestamps file or, while that file is empty, from an even split
// of the audio by caption length (with a warning). Adapted from the EP.04 timelineCore.
import type { Line, VoTimestamps, Word } from "./audioContract.ts";
import type { BeatDef, Segment, SfxCue, SfxKind } from "./script.ts";

export type Unit = {
  i: number;
  raw: string; // exact script text of this caption unit (incl. punctuation)
  display: string; // caption text (trailing ，。；：、 dropped)
  spoken: string; // normalised spoken characters
  shot: string;
  start: number;
  end: number;
  words: Word[]; // one per spoken character
  pauseAfter: boolean; // ［短暂停顿］ follows this unit
  sentenceEnd: boolean;
  offset: number; // index of this unit's first spoken char in the whole narration
};
export type Shot = { id: string; start: number; end: number; units: number[] };
export type Timeline = {
  duration: number; // seconds of audio (or placeholder)
  units: Unit[];
  shots: Shot[];
  source: "timestamps" | "fallback";
  warnings: string[];
};

const PAUSE = /［短暂停顿］|\[短暂停顿\]/;
const BREAK_AFTER = "，。；？！：";
const DROP_TRAILING = /[，。；：、]+$/;
const NON_SPOKEN = /[\s，。；？！：、"“”‘’'「」『』《》（）()［］[\]…—\-·,.;?!:]/g;

export const normalise = (s: string) => s.replace(new RegExp(PAUSE, "g"), "").replace(NON_SPOKEN, "").toUpperCase();

type RawUnit = { raw: string; shot: string; pauseAfter: boolean; sentenceEnd: boolean };

/** Split the narration into caption units: after ，。；？！： and at every ［短暂停顿］. */
export const splitUnits = (paragraphs: Segment[][]): RawUnit[] => {
  const out: RawUnit[] = [];
  for (const para of paragraphs) {
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

const PLACEHOLDER_CPS = 4.3; // only used when there is no audio at all

type CharT = { start: number; end: number };

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
  !!ts && Array.isArray(ts.lines) && ts.lines.some((l: Line) => Number.isFinite(l.end) && l.end > 0 && normalise(l.text ?? "").length > 0);

export const buildTimeline = (paragraphs: Segment[][], ts: VoTimestamps | null | undefined, audioSeconds: number | null | undefined): Timeline => {
  const warnings: string[] = [];
  const raw = splitUnits(paragraphs);
  const spoken = raw.map((u) => normalise(u.raw));
  const totalChars = spoken.reduce((s, x) => s + x.length, 0);

  const tsOk = validTimestamps(ts);
  let duration = audioSeconds && audioSeconds > 0 ? audioSeconds : 0;
  if (!duration && tsOk && ts.duration > 0) {
    duration = ts.duration;
    warnings.push("vo.mp3 duration unavailable: using the duration from vo.timestamps.json.");
  }
  if (!duration) {
    duration = Math.ceil(totalChars / PLACEHOLDER_CPS) + 2;
    warnings.push(`No usable vo.mp3: placeholder duration ${duration}s. Put the recording at public/sanzhong/audio/vo.mp3.`);
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
    warnings.push("vo.timestamps.json missing or empty: splitting the audio evenly by caption length. Run scripts/sanzhong-align-vo.ps1.");
    const lead = Math.min(0.4, duration * 0.01);
    const weights = raw.map((u, k) => spoken[k].length + (u.pauseAfter ? 2.5 : u.sentenceEnd ? 1.2 : 0.5));
    const Wsum = weights.reduce((s, x) => s + x, 0);
    const usable = Math.max(1, duration - lead - 0.6);
    chars = [];
    let t = lead;
    raw.forEach((_, k) => {
      const span = (usable * weights[k]) / Wsum;
      const speak = (span * spoken[k].length) / weights[k];
      const n = spoken[k].length;
      for (let c = 0; c < n; c++) chars.push({ start: t + (speak * c) / n, end: t + (speak * (c + 1)) / n });
      t += span;
    });
  }

  let g = 0;
  const units: Unit[] = raw.map((u, i) => {
    const n = spoken[i].length;
    const offset = g;
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
      words: mine.map((c, k) => ({ word: spoken[i][k], start: c.start, end: c.end })),
      pauseAfter: u.pauseAfter,
      sentenceEnd: u.sentenceEnd,
      offset,
    };
  });

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

/** Seconds after the last spoken word the film keeps running. */
export const filmSeconds = (tl: Timeline, tail: number) => Math.max(tl.duration, (tl.units[tl.units.length - 1]?.end ?? 0) + tail);

// ---------- beats ----------

const charTime = (tl: Timeline, k: number, edge: "start" | "end") => {
  for (const u of tl.units) {
    if (k < u.offset + u.spoken.length) {
      const w = u.words[Math.max(0, k - u.offset)];
      return edge === "start" ? w.start : w.end;
    }
  }
  const last = tl.units[tl.units.length - 1];
  return last.end;
};

/** Resolve a beat to seconds, or null when the phrase is not in the narration. */
export const resolveBeat = (tl: Timeline, def: BeatDef): number | null => {
  const all = tl.units.map((u) => u.spoken).join("");
  const from = def.after ? all.indexOf(normalise(def.after)) : 0;
  if (from < 0) return null;
  const p = normalise(def.at);
  const k = all.indexOf(p, from);
  if (k < 0) return null;
  return def.edge === "end" ? charTime(tl, k + p.length - 1, "end") : charTime(tl, k, "start");
};

export const resolveBeats = <K extends string>(tl: Timeline, defs: Record<K, BeatDef>) => {
  const out = {} as Record<K, number>;
  const missing: string[] = [];
  for (const id of Object.keys(defs) as K[]) {
    const s = resolveBeat(tl, defs[id]);
    if (s === null) missing.push(id);
    out[id] = s ?? 0;
  }
  return { beats: out, missing };
};

export const resolveSfx = (beats: Record<string, number>, cues: SfxCue[]): { t: number; kind: SfxKind }[] =>
  cues.map((c) => ({ t: (beats[c.beat] ?? 0) + (c.off ?? 0), kind: c.kind }));

// ---------- captions ----------

/** When each caption unit is on screen: from its first word to the next unit (or a short hold). */
export const captionWindows = (tl: Timeline) =>
  tl.units.map((u, i) => {
    const next = tl.units[i + 1];
    const hold = u.end + 0.6;
    const to = next ? (next.start - u.end < 0.9 ? next.start : hold) : hold;
    return { unit: u, from: Math.max(0, u.start - 0.04), to };
  });

const capUnits = (s: string) => Array.from(s).reduce((n, ch) => n + (/[A-Za-z0-9 .%"]/.test(ch) ? 0.55 : 1), 0);
export const CAPTION = { maxWidth: 952, maxSize: 58, minSize: 52 };

/** One line if it fits at ≥ minSize, else two balanced lines; never a line of a single character. */
export const layoutCaption = (text: string): { lines: string[]; size: number } => {
  const one = capUnits(text);
  if (one * CAPTION.minSize <= CAPTION.maxWidth) return { lines: [text], size: Math.min(CAPTION.maxSize, Math.floor(CAPTION.maxWidth / one)) };
  const chars = Array.from(text);
  let best = Math.floor(chars.length / 2);
  let score = Infinity;
  for (let i = 2; i <= chars.length - 2; i++) {
    const a = chars.slice(0, i).join("");
    const b = chars.slice(i).join("");
    const punctBonus = /[，、：；"]/.test(chars[i - 1]) ? -3 : 0;
    const s = Math.abs(capUnits(a) - capUnits(b)) + punctBonus;
    if (s < score) {
      score = s;
      best = i;
    }
  }
  const lines = [chars.slice(0, best).join(""), chars.slice(best).join("")];
  const widest = Math.max(...lines.map(capUnits));
  return { lines, size: Math.max(CAPTION.minSize, Math.min(CAPTION.maxSize, Math.floor(CAPTION.maxWidth / widest))) };
};
export const captionUnits = capUnits;
