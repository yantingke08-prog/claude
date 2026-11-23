// Bottom captions: 64 px bold white, 90 px from the bottom, hard cuts, one line (≤14 chars).
import React from "react";
import { useCurrentFrame, useVideoConfig } from "remotion";
import { C, CAPTION_BOTTOM, FONT, W } from "./theme.ts";
import type { Unit } from "./timeline.ts";

const activeUnit = (units: Unit[], t: number) => {
  let cur: Unit | null = null;
  for (const u of units) {
    if (u.start <= t) cur = u;
    else break;
  }
  if (!cur) return null;
  const next = units[cur.i + 1];
  const hold = next && next.start - cur.end < 1.2 ? Infinity : 0.6;
  return t <= cur.end + hold ? cur : null;
};

export const Captions: React.FC<{ units: Unit[] }> = ({ units }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const u = activeUnit(units, frame / fps);
  if (!u) return null;
  const n = Array.from(u.text).reduce((w, ch) => w + (/[\x00-\x7f]/.test(ch) ? 0.58 : 1), 0);
  const size = Math.min(64, Math.floor((W - 160) / Math.max(1, n)));
  return (
    <div
      style={{
        position: "absolute",
        left: 0,
        right: 0,
        bottom: CAPTION_BOTTOM,
        textAlign: "center",
        whiteSpace: "nowrap",
        fontFamily: FONT,
        fontWeight: 800,
        fontSize: size,
        lineHeight: 1,
        letterSpacing: 2,
        color: C.text,
        WebkitTextStroke: "2px rgba(0,0,0,0.75)",
        paintOrder: "stroke fill",
        textShadow: "0 4px 8px rgba(0,0,0,0.6)",
      }}
    >
      {u.text}
    </div>
  );
};
