// 下一期 / 我们看为什么百分之七十的成交 / 都挤在同一个区间
// Two columns that never overlap: the 80-bar chart (left) and its own volume profile (right), sharing one price scale.
// The 70 % value area is computed from the bars and drawn as one band across both columns.
import React from "react";
import { AbsoluteFill } from "remotion";
import { C, MONO, Tag, easeIO, lerp, ramp, rampIO, useShot } from "../kit";
import { MAIN, volumeProfile } from "../data";
import { Chart, GEO, py, type Geo } from "./chart";

const VP = volumeProfile();
const MAXV = Math.max(...VP.m.values());
const CG: Geo = { ...GEO, x0: 70, dx: 7.2, w: 5 }; // chart column: x 70–640
const PX = 690; // profile column starts here
const PW = 320; // longest profile bar

export const Next: React.FC = () => {
  const { t, at } = useShot();
  const nxt = at("下一期");
  const why = at("为什么");
  const pct = at("百分之七十");
  const band = at("挤在");
  const grow = rampIO(t, nxt, 0.8);
  const hl = ramp(t, pct, 0.3);
  const glow = ramp(t, band, 0.3);
  const inVA = (tick: number) => tick >= VP.lo && tick <= VP.hi;
  const mid = py((VP.lo + VP.hi) / 2);
  // flat 2D framing: a slow, rounded zoom toward the band from 百分之七十 on (no 3D camera → no shimmer)
  const z = lerp(1, 1.025, easeIO((t - pct) / 1.2));
  const top = py(VP.hi) - GEO.k / 2;
  const h = (VP.hi - VP.lo + 1) * GEO.k;
  return (
    <AbsoluteFill style={{ transform: `scale(${z})`, transformOrigin: `540px ${mid}px` }}>
      {/* value-area band behind both columns */}
      <div style={{ position: "absolute", left: 56, top, width: PX + PW + 14 - 56, height: h, background: `${C.passive}18`, borderTop: `2px solid ${C.passive}`, borderBottom: `2px solid ${C.passive}`, opacity: hl, boxShadow: `0 0 ${30 * glow}px ${C.passive}44` }} />
      <Chart geo={CG} upto={MAIN.length - 1} o={(i) => (inVA(MAIN[i].c) ? 1 : 1 - 0.5 * hl)} vol={0.55} />
      {/* thin divider between the columns */}
      <div style={{ position: "absolute", left: PX - 22, top: py(15), width: 2, height: py(-31) - py(15), background: C.faint, opacity: grow }} />
      {VP.ticks.map((tick) => {
        const w = ((VP.m.get(tick) ?? 0) / MAXV) * PW * grow;
        const lit = inVA(tick) && hl > 0;
        return (
          <div
            key={tick}
            style={{
              position: "absolute",
              left: PX,
              top: py(tick) - GEO.k / 2 + 1,
              width: w,
              height: GEO.k - 3,
              background: lit ? `linear-gradient(90deg, ${C.passive}, ${C.passiveD})` : "linear-gradient(90deg, #7c8aa8, #39445c)",
              opacity: inVA(tick) ? 0.95 : 0.95 - 0.5 * hl,
              boxShadow: lit && glow > 0 ? `0 0 ${12 * glow}px ${C.passive}` : undefined,
            }}
          />
        );
      })}
      <div style={{ position: "absolute", left: PX, top: py(15) - 26, fontSize: 30, color: C.text, opacity: ramp(t, why, 0.3), whiteSpace: "nowrap", transform: "translateY(-50%)" }}>每个价位成交了多少</div>
      <Tag x={PX + PW + 10} y={top - 30} text="70%" color={C.passive} size={52} align="right" o={hl} />
      <div style={{ position: "absolute", left: PX + PW + 10, top: top + h + 26, transform: "translate(-100%,-50%)", fontFamily: MONO, fontSize: 26, color: C.passive, opacity: hl, whiteSpace: "nowrap" }}>
        {`${(10 + VP.lo * 0.01).toFixed(2)}–${(10 + VP.hi * 0.01).toFixed(2)}`}
      </div>
    </AbsoluteFill>
  );
};
