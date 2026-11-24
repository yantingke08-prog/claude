// Title card (fills the pause the film makes before the concept section).
// 1) a red band wipes across and clears, 2) THEN the brand lockup appears (flat solid red),
// 3) the episode title. Nothing ever sits on top of the brand name; every element stays until the
// card ends, so nothing can flash for a fraction of a second.
import React from "react";
import { AbsoluteFill } from "remotion";
import { BrandLockup, clamp01, easeOutCubic, lerp, ramp, useTime } from "../kit";
import { TITLE, TITLE_EN } from "../script.ts";
import { C, FONT, H, W, glow, withAlpha, N } from "../theme.ts";

export const Title: React.FC = () => {
  const { t, shotStart, shotEnd } = useTime();
  const s = t - shotStart;
  const len = Math.max(0.1, shotEnd - shotStart);
  const k = Math.min(1, len / 3.9); // compress the choreography if the card is ever shorter
  const band = ramp(s, 0, 0.35 * k, easeOutCubic);
  const bandX = ramp(s, 0.35 * k, 0.3 * k, easeOutCubic); // the band leaves to the right
  const lock = ramp(s, 0.6 * k, 0.45, easeOutCubic);
  const ep = ramp(s, 1.0 * k, 0.45, easeOutCubic);
  const out = 1 - clamp01((s - (len - 0.3)) / 0.3);
  return (
    <AbsoluteFill style={{ background: N.black, opacity: out }}>
      {bandX < 1 && (
        <div
          style={{
            position: "absolute",
            left: 0,
            top: H / 2 - 60,
            width: W,
            height: 120,
            transform: `translateX(${bandX * W}px) scaleX(${band})`,
            transformOrigin: "0% 50%",
            background: `linear-gradient(90deg, transparent, ${withAlpha(C.brand, 0.9)} 35%, ${C.brand} 50%, ${withAlpha(C.brand, 0.9)} 65%, transparent)`,
            filter: `blur(4px) ${glow(C.brand, 30, 0.8)}`,
          }}
        />
      )}
      <AbsoluteFill style={{ alignItems: "center", justifyContent: "center" }}>
        <div style={{ opacity: lock, transform: `translateY(${lerp(14, 0, lock) - 40}px) scale(${lerp(0.96, 1, lock)})` }}>
          <BrandLockup size={132} />
        </div>
        <div style={{ marginTop: 10, fontFamily: FONT, opacity: ep, transform: `translateY(${lerp(14, 0, ep) + 30}px)`, whiteSpace: "nowrap" }}>
          <span style={{ fontSize: 56, fontWeight: 900, color: C.text }}>{TITLE}</span>
          <span style={{ fontSize: 24, fontWeight: 600, letterSpacing: 6, color: C.resistance, marginLeft: 24 }}>{TITLE_EN}</span>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
