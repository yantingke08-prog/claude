// 下一期 / 我们看为什么百分之七十的成交 / 都挤在同一个区间
// Two columns that never overlap: the 80-bar chart (left) and its own volume profile (right), sharing one price scale.
// The 70 % value area is computed from the bars and drawn as one band across both columns.
// 3D candles on a fixed camera: nothing in this shot moves the camera, so the small candles stay crisp
// (the earlier shimmer came from a moving 3D camera over tiny candles, not from the 3D faces).
import React from "react";
import { C, MONO, Stage, Tag, aim, ramp, rampIO, useShot } from "../kit";
import { MAIN, volumeProfile } from "../data";
import { Chart, py as pyG, type Geo } from "./chart";

const VP = volumeProfile();
const MAXV = Math.max(...VP.m.values());
const HI = Math.max(...VP.ticks);
const LO = Math.min(...VP.ticks);
const K = 16; // px per tick (larger than the main chart so the candles read)
// chart column x 60–724, candles 6.6 px wide; profile column 780–1010
const NG: Geo = { x0: 60, dx: 8.4, w: 6.6, y0: 450 + HI * K, k: K, volBase: 1300, volH: 90, maxV: 5200 };
const py = (tick: number) => pyG(tick, NG);
const PX = 780;
const PW = 230;
const CAM = aim(540, 830, 1, 5, -4);

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
  const top = py(VP.hi) - K / 2;
  const h = (VP.hi - VP.lo + 1) * K;
  return (
    <Stage cam={CAM}>
      {/* value-area band behind both columns */}
      <div style={{ position: "absolute", left: 46, top, width: PX + PW + 14 - 46, height: h, background: `${C.passive}18`, borderTop: `2px solid ${C.passive}`, borderBottom: `2px solid ${C.passive}`, opacity: hl, boxShadow: `0 0 ${30 * glow}px ${C.passive}44` }} />
      <Chart geo={NG} upto={MAIN.length - 1} o={(i) => (inVA(MAIN[i].c) ? 1 : 1 - 0.5 * hl)} vol={0.55} />
      {/* thin divider between the columns */}
      <div style={{ position: "absolute", left: PX - 26, top: py(HI) - 10, width: 2, height: py(LO) - py(HI) + 20, background: C.faint, opacity: grow }} />
      {VP.ticks.map((tick) => {
        const w = ((VP.m.get(tick) ?? 0) / MAXV) * PW * grow;
        const lit = inVA(tick) && hl > 0;
        return (
          <div
            key={tick}
            style={{
              position: "absolute",
              left: PX,
              top: py(tick) - K / 2 + 1,
              width: w,
              height: K - 3,
              background: lit ? `linear-gradient(90deg, ${C.passive}, ${C.passiveD})` : "linear-gradient(90deg, #7c8aa8, #39445c)",
              opacity: inVA(tick) ? 0.95 : 0.95 - 0.5 * hl,
              boxShadow: lit && glow > 0 ? `0 0 ${12 * glow}px ${C.passive}` : undefined,
            }}
          />
        );
      })}
      <div style={{ position: "absolute", left: PX, top: py(HI) - 44, fontSize: 28, color: C.text, opacity: ramp(t, why, 0.3), whiteSpace: "nowrap", transform: "translateY(-50%)" }}>每个价位成交了多少</div>
      <Tag x={PX + PW} y={top - 28} text="70%" color={C.passive} size={48} align="right" o={hl} />
      {/* the price range sits above the band on the chart side, where no candle or profile bar is */}
      <div style={{ position: "absolute", left: 66, top: top - 24, transform: "translateY(-50%)", fontFamily: MONO, fontSize: 26, color: C.passive, opacity: hl, whiteSpace: "nowrap" }}>
        {`${(10 + VP.lo * 0.01).toFixed(2)}–${(10 + VP.hi * 0.01).toFixed(2)}`}
      </div>
    </Stage>
  );
};
