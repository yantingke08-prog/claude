import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { C } from "../../components/Hud";
import { MONO, zh } from "../../lib/fonts";
import { ease } from "../../lib/gsap";
import { SceneShell } from "../components/SceneShell";
import { appear, fadeOut, glass, GREEN, RED } from "../components/Charts";
import { FanChart, fanStats, StreakStrip, streakCell } from "../components/CanvasCharts";
import { SimTag } from "../components/Chrome";
import { STRATEGY_B } from "../sim.ts";
import { SCRIPT } from "../timeline.ts";

const UI = SCRIPT.ui;

/** One trade = one draw from a 40/60 bar. A ball rattles along it and settles in the red. */
const SingleTrade: React.FC<{ frame: number }> = ({ frame }) => {
  const a = appear(frame, 205);
  const out = fadeOut(frame, 312, 12);
  const W = 1100;
  const t = Math.max(0, frame - 225) / 30;
  const settle = 0.71;
  const pos = settle + Math.cos(t * 7) * Math.exp(-t * 1.6) * 0.32;
  const landed = t > 1.6;
  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", opacity: a * out }}>
      <div style={{ position: "relative", width: W, height: 90, borderRadius: 16, overflow: "hidden", display: "flex", boxShadow: "0 20px 60px rgba(0,0,0,0.5)" }}>
        <div style={{ width: `${STRATEGY_B.pWin * 100}%`, background: `${GREEN}cc`, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: MONO.fontFamily, fontWeight: 700, fontSize: 34, color: "#032" }}>
          40% · +2.5
        </div>
        <div style={{ flex: 1, background: `${RED}cc`, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: MONO.fontFamily, fontWeight: 700, fontSize: 34, color: "#300" }}>
          60% · −1
        </div>
      </div>
      <div style={{ position: "relative", width: W, height: 0 }}>
        <div
          style={{
            position: "absolute",
            left: Math.min(Math.max(pos, 0.02), 0.98) * W,
            top: -150,
            width: 36,
            height: 36,
            borderRadius: 18,
            transform: "translateX(-50%)",
            background: "#fff",
            boxShadow: `0 0 30px #fff, 0 0 60px ${landed ? RED : C.cyan}`,
          }}
        />
      </div>
      <div style={{ marginTop: 60, ...zh(900), fontSize: 56, color: RED, opacity: landed ? appear(frame, 225 + 48) : 0 }}>−1</div>
    </AbsoluteFill>
  );
};

/** Piecewise log-time schedule: 0 -> 10 -> 100 -> 1000 trades, holding at each milestone. */
const tradesAt = (frame: number) => {
  const seg = (f0: number, f1: number, n0: number, n1: number) =>
    Math.exp(Math.log(n0) + (Math.log(n1) - Math.log(n0)) * ease("power2.inOut")(Math.min(1, Math.max(0, (frame - f0) / (f1 - f0)))));
  if (frame < 345) return 0;
  if (frame < 430) return interpolate(frame, [345, 430], [0, 10]);
  if (frame < 565) return 10;
  if (frame < 690) return seg(565, 690, 10, 100);
  if (frame < 705) return 100;
  return seg(705, 830, 100, 1000);
};

export const LargeNumbers: React.FC = () => {
  const frame = useCurrentFrame();
  const n = tradesAt(frame);
  const stats = fanStats(n);
  const fanIn = appear(frame, 325, 24);
  const fanOut = fadeOut(frame, 1078, 14);
  const stripIn = appear(frame, 1088, 20);
  const reveal = interpolate(frame, [1095, 1185], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const highlight = appear(frame, 1225, 20);
  const stripW = 1250;
  const sc = streakCell(stripW);

  return (
    <SceneShell id="lln">
      {frame >= 200 && frame < 330 && <SingleTrade frame={frame} />}
      {frame >= 320 && frame < 1095 && (
        <div style={{ position: "absolute", left: 100, top: 180, opacity: fanIn * fanOut }}>
          <div style={{ ...glass, padding: "26px 10px 10px 10px", position: "relative" }}>
            <FanChart n={n} width={1700} height={640} expected={appear(frame, 830, 30)} />
            <div style={{ position: "absolute", right: 250, top: 26, textAlign: "right" }}>
              <div style={{ fontFamily: MONO.fontFamily, fontWeight: 700, fontSize: 64, color: "#fff", lineHeight: 1 }}>
                {Math.round(n)}
                <span style={{ ...zh(500), fontSize: 26, color: C.dim, marginLeft: 10 }}>{UI.trades}</span>
              </div>
              <div style={{ marginTop: 12, ...zh(500), fontSize: 24, color: C.dim }}>
                {UI.losingShare}{" "}
                <span style={{ fontFamily: MONO.fontFamily, fontWeight: 700, fontSize: 40, color: stats.losing > 0.05 ? RED : GREEN }}>
                  {n < 1 ? "—" : `${(stats.losing * 100).toFixed(stats.losing < 0.1 ? 1 : 0)}%`}
                </span>
              </div>
            </div>
            {frame >= 830 && (
              <div style={{ position: "absolute", left: 120, top: 34, opacity: appear(frame, 840), ...zh(500), fontSize: 24, color: C.amber }}>
                — — {UI.expectedLegend} &nbsp;&nbsp;<span style={{ color: "#fff" }}>━━ {UI.meanLegend}</span>
              </div>
            )}
            <SimTag label={UI.simulated} style={{ position: "absolute", left: 80, bottom: 18 }} />
          </div>
        </div>
      )}
      {frame >= 1085 && (
        <div style={{ position: "absolute", left: (1920 - stripW) / 2, top: 190, opacity: stripIn }}>
          <StreakStrip reveal={reveal} highlight={highlight} width={stripW} />
          {highlight > 0 && (
            <div
              style={{
                position: "absolute",
                left: sc.x,
                top: sc.y - 74,
                opacity: highlight,
                transform: `translateY(${(1 - highlight) * 20}px)`,
                ...zh(900),
                fontSize: 40,
                color: RED,
                whiteSpace: "nowrap",
                textShadow: `0 0 20px ${RED}`,
              }}
            >
              {sc.length} {UI.streak} ↓
            </div>
          )}
        </div>
      )}
    </SceneShell>
  );
};
