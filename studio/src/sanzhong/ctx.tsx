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

/** The shot being rendered (Film wraps each scene). Lets HUD/ticker wait out the cross-fade. */
export const ShotCtx = createContext<{ start: number; first: boolean }>({ start: 0, first: true });
export const XF = 0.35; // seconds of cross-fade into each new shot
/** 0→1 once this shot's cross-fade is over (always 1 for the first shot). */
export const useChromeIn = () => {
  const { t } = useFilm();
  const s = useContext(ShotCtx);
  if (s.first) return 1;
  return Math.max(0, Math.min(1, (t - s.start - XF) / 0.12));
};
