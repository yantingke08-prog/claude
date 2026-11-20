// B-roll registry for sentences that have no honest trading visual (questions, emotion, summaries).
// Drop an imagegen still (1080x1920 PNG/JPG/WEBP) into assets/broll/<file>. If the file is missing,
// the scene draws a procedural stand-in (src/scenes/Broll.tsx), so the project always builds.
// Rules: no stock/unknown-source images, no celebrity likeness, no recognisable brand logos, no real broker UI.

export type BrollEntry = {
  id: string;
  file: string; // inside assets/broll/
  usedIn: string[]; // shot ids
  anchor: string; // the line it covers
  prompt: string; // imagegen prompt used / to use
};

export const BROLL: BrollEntry[] = [
  {
    id: "desk-watch",
    file: "desk-watch.png",
    usedIn: ["broll-desk"],
    anchor: "你更容易栽在哪种成交上？… 先别急着回答。",
    prompt:
      "Vertical 1080x1920 cinematic still, night, a lone trader seen from behind (no face visible) sitting at a desk, " +
      "three monitors glowing with abstract red and green candlestick lines and blank order-book columns, no text, no logos, " +
      "no brand names, dark navy room, cool rim light on shoulders, shallow depth of field, subject in the middle third, " +
      "lower 25% of frame kept dark and empty for subtitles",
  },
];

type Ctx = { keys(): string[]; (id: string): string | { default: string } };
declare const require: { context(dir: string, deep: boolean, re: RegExp): Ctx };

// webpack resolves this at bundle time; an empty folder (only README/.gitkeep) is fine.
const files: Ctx = require.context("../assets/broll", false, /\.(png|jpe?g|webp)$/);

export const brollSrc = (id: string): string | null => {
  const e = BROLL.find((b) => b.id === id);
  if (!e) return null;
  const key = `./${e.file}`;
  if (!files.keys().includes(key)) return null;
  const m = files(key);
  return typeof m === "string" ? m : m.default;
};
