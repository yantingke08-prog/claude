// 时间轴：把口播段的起止时间变成每一页的起止帧和页内触发点。
//
// 时间来源（优先级从高到低）：
//   1. public/audio/timing.json（npm run sync 根据 voiceover.wav 生成，或手工校对）
//   2. 没有 timing.json 但有 voiceover.wav：按字数估算，再整体缩放到音频长度
//   3. 都没有：按字数估算，缩放到 93 秒占位时长
// 总帧数永远跟随音频（有音频时），并在最后一句结论后至少留 1.3 秒静帧。

import { SCENES, SEGMENTS, type SceneDef, type Segment } from "./content.ts";
import { FPS, PLACEHOLDER_SECONDS } from "./theme.ts";

export type TimingSegment = { id?: string; text?: string; start: number; end: number };
export type TimingFile = { duration?: number; segments: TimingSegment[] };

export type TimedSeg = Segment & { index: number; start: number; end: number; startF: number; endF: number };
export type SceneSpan = SceneDef & {
  index: number;
  from: number;
  to: number;
  segs: TimedSeg[];
  /** 页内每句话开头的相对帧 */
  cues: number[];
};
export type Timeline = {
  source: "timing.json" | "estimate-audio" | "estimate-placeholder";
  durationInFrames: number;
  segs: TimedSeg[];
  scenes: SceneSpan[];
};

/** 语速：约 290 字/分钟 */
export const CHARS_PER_SECOND = 290 / 60;
/** 结论句之后的停顿（秒），对应“停止新增元素 1–1.5 秒” */
export const HOLD_AFTER = 1.2;
/** 片尾结论后至少保留的静帧（秒） */
export const TAIL = 1.3;
/** 页面先于该页第一句话出现的提前量（秒） */
const SCENE_LEAD = 0.12;

const NON_SPOKEN = /[\s，。；？！：、“”‘’'"《》（）()·,.;?!:…—-]/g;
/** 口播字数：标点不算；英文缩写按读音折算（MACD≈4 字，Delta≈2 字，K≈1 字） */
export const spokenChars = (text: string) => {
  const t = text.replace(NON_SPOKEN, "");
  let n = 0;
  for (const m of t.matchAll(/[A-Za-z]+|./gu)) n += /^[A-Za-z]+$/.test(m[0]) ? Math.max(1, Math.ceil(m[0].length * 0.6)) : 1;
  return n;
};

/** 按字数估算每句起止（秒），再整体缩放到 total 秒 */
export const estimateTiming = (total: number): TimingFile => {
  const raw: TimingSegment[] = [];
  let t = 0.35;
  SEGMENTS.forEach((s, i) => {
    const d = spokenChars(s.text) / CHARS_PER_SECOND;
    raw.push({ id: s.id, text: s.text, start: t, end: t + d });
    t += d;
    const next = SEGMENTS[i + 1];
    const sceneChange = next && next.scene !== s.scene;
    const rankNow = SCENES.find((sc) => sc.id === s.scene)?.kind === "rank";
    t += s.hold ? HOLD_AFTER : rankNow ? 0.9 : sceneChange ? 0.32 : 0.22;
  });
  // 缩放后：最后一句结束 + TAIL 正好等于 total
  const k = (total - TAIL) / raw[raw.length - 1].end;
  return { duration: total, segments: raw.map((r) => ({ ...r, start: r.start * k, end: r.end * k })) };
};

const sec2f = (s: number) => Math.round(s * FPS);

export const buildTimeline = (timing: TimingFile | null, audioSeconds: number | null): Timeline => {
  const source: Timeline["source"] = timing ? "timing.json" : audioSeconds ? "estimate-audio" : "estimate-placeholder";
  const file = timing ?? estimateTiming(audioSeconds ?? PLACEHOLDER_SECONDS);

  const byId = new Map(file.segments.filter((s) => s.id).map((s) => [s.id as string, s]));
  const segs: TimedSeg[] = SEGMENTS.map((s, index) => {
    const t = byId.get(s.id) ?? file.segments[index];
    if (!t) throw new Error(`timing.json 缺少第 ${index + 1} 句（${s.id}）`);
    // 字幕以配音的实际文本为准（timing.json 里有 text 时）
    const text = t.text && t.text.trim() ? t.text.trim() : s.text;
    return { ...s, text, index, start: t.start, end: t.end, startF: sec2f(t.start), endF: sec2f(t.end) };
  });

  const lastEnd = segs[segs.length - 1].end;
  const audio = audioSeconds ?? file.duration ?? lastEnd + TAIL;
  const durationInFrames = Math.max(sec2f(audio), sec2f(lastEnd + TAIL));

  const scenes: SceneSpan[] = SCENES.map((sc, index) => {
    const own = segs.filter((s) => s.scene === sc.id);
    if (!own.length) throw new Error(`页面 ${sc.id} 没有任何口播段`);
    const from = index === 0 ? 0 : Math.max(0, own[0].startF - sec2f(SCENE_LEAD));
    return { ...sc, index, from, to: 0, segs: own, cues: own.map((s) => s.startF - from) };
  });
  scenes.forEach((sc, i) => {
    sc.to = i + 1 < scenes.length ? scenes[i + 1].from : durationInFrames;
  });
  return { source, durationInFrames, segs, scenes };
};

/** 当前帧应显示的字幕：从这句开始到下一句开始（最后一句一直保留） */
export const subtitleAt = (tl: Timeline, frame: number): TimedSeg | null => {
  let cur: TimedSeg | null = null;
  for (const s of tl.segs) if (frame >= s.startF) cur = s;
  return cur;
};
