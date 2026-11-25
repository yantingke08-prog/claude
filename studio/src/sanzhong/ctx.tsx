import React, { createContext, useContext } from "react";
import { useCurrentFrame, useVideoConfig } from "remotion";
import type { BeatId } from "./script";
import type { Timeline } from "./timeline";

export type FilmCtx = { tl: Timeline; beats: Record<BeatId, number> };
const Ctx = createContext<FilmCtx | null>(null);
export const FilmProvider: React.FC<{ value: FilmCtx; children: React.ReactNode }> = ({ value, children }) => <Ctx.Provider value={value}>{children}</Ctx.Provider>;

/** Current time in seconds on the voice-over clock + beat lookup. */
export const useFilm = () => {
  const c = useContext(Ctx);
  if (!c) throw new Error("useFilm outside FilmProvider");
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;
  const b = (id: BeatId) => c.beats[id];
  return { t, b, tl: c.tl };
};
