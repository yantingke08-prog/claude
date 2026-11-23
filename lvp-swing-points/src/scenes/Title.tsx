// Title card (in the silence before the concept section): black, red neon band sweeps across,
// "LVP" draws stroke by stroke, then LVP ORDER FLOW + the episode title.
import React from "react";
import { AbsoluteFill, Img, staticFile } from "remotion";
import { PriceLadder, clamp01, easeInOutSine, easeOutCubic, lerp, ramp, useTime } from "../kit";
import { TITLE, TITLE_EN } from "../script.ts";
import { C, FONT, H, W, glow, withAlpha, N } from "../theme.ts";

export const Title: React.FC = () => {
  const { t, shotStart, shotEnd } = useTime();
  const s = t - shotStart;
  const len = shotEnd - shotStart;
  const band = ramp(s, 0, 0.4, easeOutCubic); // ScaleX 0→1
  const bandFade = 1 - ramp(s, 0.55, 0.5);
  const stroke = ramp(s, 0.35, 1.1, easeInOutSine); // LVP outline draws
  const fillIn = ramp(s, 1.35, 0.4);
  const sub = ramp(s, 1.2, 0.5, easeOutCubic);
  const ep = ramp(s, 1.7, 0.5, easeOutCubic);
  const out = 1 - clamp01((s - (len - 0.35)) / 0.35);
  return (
    <AbsoluteFill style={{ background: N.black, opacity: out }}>
      {/* sweeping red neon band */}
      <div
        style={{
          position: "absolute",
          left: 0,
          top: H / 2 - 70,
          width: W,
          height: 140,
          transform: `scaleX(${band})`,
          transformOrigin: "0% 50%",
          opacity: bandFade,
          background: `linear-gradient(90deg, transparent, ${withAlpha(C.brand, 0.9)} 40%, ${C.text} 50%, ${withAlpha(C.brand, 0.9)} 60%, transparent)`,
          filter: `blur(6px) ${glow(C.brand, 40, 0.9)}`,
        }}
      />
      <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={{ position: "absolute", inset: 0 }}>
        <text
          x={W / 2 + 60}
          y={560}
          textAnchor="middle"
          fontFamily={FONT}
          fontWeight={900}
          fontSize={260}
          letterSpacing={24}
          fill={withAlpha(C.text, fillIn)}
          stroke={C.brand}
          strokeWidth={5}
          strokeDasharray={900}
          strokeDashoffset={900 * (1 - stroke)}
          style={{ filter: glow(C.brand, 18, 0.9) }}
        >
          LVP
        </text>
      </svg>
      <div style={{ position: "absolute", left: W / 2 - 440, top: 380, opacity: stroke }}>
        <PriceLadder size={170} progress={stroke} />
      </div>
      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          top: 620,
          textAlign: "center",
          fontFamily: FONT,
          fontWeight: 700,
          fontSize: 40,
          letterSpacing: 26,
          color: C.muted,
          opacity: sub,
          transform: `translateY(${lerp(16, 0, sub)}px)`,
        }}
      >
        LVP ORDER FLOW
      </div>
      <div style={{ position: "absolute", left: 0, right: 0, top: 720, textAlign: "center", fontFamily: FONT, opacity: ep, transform: `translateY(${lerp(16, 0, ep)}px)` }}>
        <span style={{ fontSize: 56, fontWeight: 900, color: C.text }}>{TITLE}</span>
        <span style={{ fontSize: 24, fontWeight: 600, letterSpacing: 6, color: C.resistance, marginLeft: 24 }}>{TITLE_EN}</span>
      </div>
      <Img src={staticFile("brand/lvp-mark-white.svg")} style={{ position: "absolute", right: 60, bottom: 50, width: 70, height: 70, opacity: ep * 0.8 }} />
    </AbsoluteFill>
  );
};
