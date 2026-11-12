import EV from "./events.json";
import TL from "./timeline.json";

export const FPS = TL.fps;
export const FRAMES = TL.frames;
export type LineId = (typeof TL.lines)[number]["id"];

const LINES = Object.fromEntries(TL.lines.map((l) => [l.id, l]));

/** Frame at which the voice reaches `char` of a line (the last word mark at or before it). */
export const Lc = (id: string, char = 0, off = 0) => {
  const l = LINES[id];
  if (!l) throw new Error(`no line ${id}`);
  let f = l.from;
  for (const [idx, fr] of l.marks) if (idx <= char) f = fr;
  return f + off;
};
export const Lend = (id: string, off = 0) => LINES[id].to + off;
export const lineText = (id: string) => LINES[id].text;

type Ev = { frame?: number; line?: string; char?: number; off?: number; end?: boolean };
const evs = EV as unknown as Record<string, Ev>;
/** Named moment shared with the score (events.json). */
export const E = (name: string) => {
  const e = evs[name];
  if (!e) throw new Error(`no event ${name}`);
  if (e.frame !== undefined) return e.frame;
  return e.end ? Lend(e.line!, e.off ?? 0) : Lc(e.line!, e.char ?? 0, e.off ?? 0);
};

export const captions = TL.captions;
export const sections = TL.sections;
export const SEC = (id: string) => TL.sections.find((s) => s.id === id)!;
