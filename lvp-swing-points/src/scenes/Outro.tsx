// 188.5–190.9: dark + LVP brand
import React from "react";
import { AbsoluteFill, Img, staticFile } from "remotion";
import { PriceLadder, easeOutCubic, lerp, pop, ramp, useTime } from "../kit";
import { C, FONT, withAlpha, N } from "../theme.ts";

export const Outro: React.FC = () => {
  const { t, cue } = useTime();
  const p = pop(t, cue("outIam") - 0.2);
  const lad = ramp(t, cue("outIam"), 0.8, easeOutCubic);
  const breathe = 1 + 0.02 * Math.sin(t * 3);
  return (
    <AbsoluteFill style={{ background: N.void, alignItems: "center", justifyContent: "center", fontFamily: FONT }}>
      <div style={{ opacity: p.opacity, transform: `scale(${p.scale * breathe}) translateY(-60px)`, display: "flex", alignItems: "center", gap: 40 }}>
        <Img src={staticFile("brand/lvp-mark-white.svg")} style={{ width: 200, height: 200 }} />
        <div>
          <div style={{ fontSize: 150, fontWeight: 900, letterSpacing: 16, color: C.text, WebkitTextStroke: `3px ${C.brand}`, textShadow: `0 0 30px ${withAlpha(C.brand, 0.7)}`, lineHeight: 1 }}>
            LVP
          </div>
          <div style={{ fontSize: 34, fontWeight: 600, letterSpacing: 18, color: C.muted, marginTop: 18 }}>ORDER FLOW</div>
        </div>
        <div style={{ opacity: lad, transform: `translateX(${lerp(20, 0, lad)}px)` }}>
          <PriceLadder size={160} progress={lad} />
        </div>
      </div>
    </AbsoluteFill>
  );
};
