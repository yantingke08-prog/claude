import gsap from "gsap";
import { useMemo } from "react";
import { useCurrentFrame, useVideoConfig } from "remotion";

/** GSAP's easing library as plain (t) => t functions, usable with Remotion's interpolate(). */
export const ease = (name: string) => gsap.parseEase(name) as (t: number) => number;

/**
 * Bridges GSAP into Remotion's frame-based world.
 * The timeline is built once, paused, and *seeked* to frame/fps on every render, so the
 * result is a pure function of the frame - safe for parallel, out-of-order rendering.
 * Tweens target a plain state object (never the DOM); React reads a snapshot back.
 * Always use fromTo() so seeking backwards is exact.
 */
export function useGsap<T extends object>(initial: () => T, build: (tl: gsap.core.Timeline, s: T) => void): T {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const { tl, state } = useMemo(() => {
    const state = initial();
    const tl = gsap.timeline({ paused: true });
    build(tl, state);
    return { tl, state };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  tl.seek(frame / fps, true);
  return snapshot(state);
}

// GSAP stamps a circular `_gsap` cache onto every tween target, so clone by hand and skip it.
const snapshot = <T,>(v: T): T => {
  if (Array.isArray(v)) return v.map(snapshot) as T;
  if (v && typeof v === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, x] of Object.entries(v)) if (k !== "_gsap") out[k] = snapshot(x);
    return out as T;
  }
  return v;
};
