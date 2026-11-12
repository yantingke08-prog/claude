// 10 收束 — brand seal as the main visual, the thesis in two lines, then a still hold (no cut to black).
import React from "react";
import { AbsoluteFill, Img, useCurrentFrame } from "remotion";
import { prog } from "../anim";
import { LOGO } from "../components/Frame";
import { at, chapter } from "../script";
import { C, FONT, RADIUS, T } from "../theme";

export const End: React.FC = () => {
  const f = useCurrentFrame();
  const ch = chapter("end");
  const logo = prog(f, 0, 22);
  const l1 = prog(f, at(ch, 0, 0), 16);
  const l2 = prog(f, at(ch, 1, 0), 16);
  const rule = prog(f, at(ch, 1, 0.6), 20);
  const size = 340;
  return (
    <AbsoluteFill style={{ background: "rgba(7,9,13,0.6)", fontFamily: FONT }}>
      <div
        style={{
          position: "absolute",
          left: 540 - size / 2,
          top: 360,
          width: size,
          height: size,
          borderRadius: RADIUS * 1.6,
          overflow: "hidden",
          border: `1px solid ${C.border}`,
          boxShadow: "0 30px 80px rgba(0,0,0,0.65)",
          opacity: logo,
          transform: `scale(${0.96 + 0.04 * logo})`,
        }}
      >
        <Img src={LOGO} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
      </div>
      <div style={{ position: "absolute", left: 0, right: 0, top: 740, textAlign: "center", fontSize: T.l, fontWeight: 700, color: C.text, letterSpacing: 6, opacity: logo }}>
        LVP订单流
      </div>
      <div style={{ position: "absolute", left: 0, right: 0, top: 900, textAlign: "center", fontWeight: 700 }}>
        <div style={{ fontSize: T.xl, color: C.text, opacity: l1, transform: `translateY(${(1 - l1) * 10}px)` }}>
          <span style={{ color: C.amber }}>吸收</span>不是反转
        </div>
        <div style={{ height: 3, width: 520 * rule, background: C.amber, margin: "34px auto", opacity: 0.85 }} />
        <div style={{ fontSize: T.xl, color: C.text, opacity: l2, transform: `translateY(${(1 - l2) * 10}px)` }}>
          <span style={{ color: C.amber }}>吸收之后</span>，才是交易
        </div>
      </div>
    </AbsoluteFill>
  );
};
