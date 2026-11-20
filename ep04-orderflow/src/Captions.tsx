// Single-line, centred captions driven by per-character timestamps. Never wraps, never stacks.
import React from "react";
import { useCurrentFrame, useVideoConfig } from "remotion";
import { CAPTION_Y, FONT, W, clamp01 } from "./kit";
import { normalise, type Unit } from "./timelineCore";

const MAX_W = W - 80; // 40 px side margins
const textWidth = (s: string) => Array.from(s).reduce((w, c) => w + (/[\x00-\x7f]/.test(c) ? 0.55 : 1), 0);

/** which unit is on screen: from its start until the next unit starts (held through gaps and ［短暂停顿］) */
const activeUnit = (units: Unit[], t: number) => {
  let cur: Unit | null = null;
  for (const u of units) {
    if (u.start - 0.05 <= t) cur = u;
    else break;
  }
  if (!cur) return null;
  const next = units[cur.i + 1];
  const hold = cur.pauseAfter || (next && next.start - cur.end < 1.2) ? Infinity : 0.8;
  return t <= cur.end + hold ? cur : null;
};

export const Captions: React.FC<{ units: Unit[] }> = ({ units }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;
  const u = activeUnit(units, t);
  if (!u) return null;
  const size = Math.min(64, Math.floor(MAX_W / Math.max(1, textWidth(u.display))));
  const appear = clamp01((t - (u.start - 0.05)) / 0.12);
  // map each displayed character to its spoken-character time; punctuation follows the previous one
  let k = -1;
  const chars = Array.from(u.display).map((ch, i) => {
    if (normalise(ch).length) k++;
    const st = u.charStart[Math.max(0, Math.min(k, u.charStart.length - 1))];
    const said = t >= st;
    return (
      <span key={i} style={{ color: said ? "#ffffff" : "rgba(255,255,255,0.55)" }}>
        {ch}
      </span>
    );
  });
  return (
    <div
      style={{
        position: "absolute",
        left: 40,
        width: MAX_W,
        top: CAPTION_Y,
        transform: `translateY(-50%) translateY(${(1 - appear) * 8}px)`,
        opacity: appear,
        textAlign: "center",
        whiteSpace: "nowrap",
        overflow: "hidden",
        fontFamily: FONT,
        fontWeight: 800,
        fontSize: size,
        lineHeight: 1.2,
        letterSpacing: 1,
        textShadow: "0 3px 0 rgba(0,0,0,0.85), 0 0 18px rgba(0,0,0,0.9)",
      }}
    >
      {chars}
    </div>
  );
};
