import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { C } from "../../components/Hud";
import { zh } from "../../lib/fonts";
import { SceneShell } from "../components/SceneShell";
import { appear, AreaChart, fadeOut, Formula, GREEN, RED } from "../components/Charts";
import { STRATEGY_A, STRATEGY_B } from "../sim.ts";
import { SCRIPT } from "../timeline.ts";

const UI = SCRIPT.ui;
const vA = { p: STRATEGY_A.pWin, win: STRATEGY_A.win, loss: STRATEGY_A.loss };
const vB = { p: STRATEGY_B.pWin, win: STRATEGY_B.win, loss: STRATEGY_B.loss };

/** "Win rate" gets struck out, "expectancy" lights up. */
const NotWinRate: React.FC<{ frame: number }> = ({ frame }) => {
  const a = appear(frame, 104);
  const strike = interpolate(frame, [130, 150], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const b = appear(frame, 150);
  const out = fadeOut(frame, 196, 10);
  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", opacity: out }}>
      <div style={{ display: "flex", gap: 140, alignItems: "center", ...zh(900), fontSize: 120 }}>
        <div style={{ position: "relative", opacity: a * (1 - strike * 0.6), color: "#fff" }}>
          {UI.winRate}
          <div style={{ position: "absolute", left: -10, right: -10, top: "52%", height: 10, background: RED, transform: `scaleX(${strike})`, transformOrigin: "left", boxShadow: `0 0 20px ${RED}` }} />
        </div>
        <div style={{ opacity: b, transform: `scale(${0.7 + b * 0.3})`, color: C.cyan, textShadow: `0 0 40px ${C.cyan}` }}>{UI.formula[0]}</div>
      </div>
    </AbsoluteFill>
  );
};

export const Expectancy: React.FC = () => {
  const frame = useCurrentFrame();
  // formula: alone and big first, then docks above the two area charts
  const fShow = interpolate(frame, [210, 300], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const dock = appear(frame, 330, 26);
  const formulaY = interpolate(dock, [0, 1], [470, 205]);
  const formulaSize = interpolate(dock, [0, 1], [64, 50]);
  const onB = frame >= 580;
  const values = frame < 335 ? undefined : onB ? vB : vA;
  const numbers = onB ? appear(frame, 590) : appear(frame, 345);
  const result = onB ? appear(frame, 780, 14) : appear(frame, 535, 14);
  const final = appear(frame, 1085, 24);

  const aIn = appear(frame, 340, 20);
  const bIn = appear(frame, 585, 20);
  const emphA = frame >= 960 && frame < 1085 ? appear(frame, 960) : 0;
  const both = appear(frame, 825);

  return (
    <SceneShell id="expectancy">
      {frame < 210 && <NotWinRate frame={frame} />}
      {frame >= 205 && (
        <div style={{ position: "absolute", left: 0, right: 0, top: formulaY, transform: "translateY(-50%)", opacity: 1 - final * 0.85 }}>
          <Formula show={fShow} values={values} numbers={values ? numbers : 0} result={result} size={formulaSize} />
        </div>
      )}
      <div style={{ position: "absolute", left: 220, top: 320, display: "flex", gap: 80, opacity: 1 - final * 0.8, filter: `blur(${final * 4}px)` }}>
        <div style={{ opacity: aIn * (1 - (onB && frame < 825 ? 0.5 : 0)), transform: `translateY(${(1 - aIn) * 40}px) scale(${1 + emphA * 0.04})` }}>
          <AreaChart values={vA} grow={interpolate(frame, [350, 480], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })} label={`${UI.traderA} · ${UI.winRate} 70%`} showNet={appear(frame, 540)} />
        </div>
        <div style={{ opacity: bIn * (1 - emphA * 0.6), transform: `translateY(${(1 - bIn) * 40}px)` }}>
          <AreaChart values={vB} grow={interpolate(frame, [600, 730], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })} label={`${UI.traderB} · ${UI.winRate} 40%`} showNet={appear(frame, 785)} />
        </div>
      </div>
      {both > 0 && frame < 960 && (
        <div style={{ position: "absolute", left: 0, right: 0, top: 860, textAlign: "center", opacity: both * fadeOut(frame, 945), ...zh(500), fontSize: 26, color: C.dim }}>
          <span style={{ color: GREEN }}>■</span> {UI.formula[1]} × {UI.formula[2]} &nbsp;&nbsp; − &nbsp;&nbsp; <span style={{ color: RED }}>■</span> {UI.formula[3]} × {UI.formula[4]}
        </div>
      )}
      {final > 0 && (
        <AbsoluteFill style={{ alignItems: "center", justifyContent: "center" }}>
          <div
            style={{
              ...zh(900),
              fontSize: 140,
              color: GREEN,
              opacity: final,
              transform: `scale(${1.3 - final * 0.3})`,
              textShadow: `0 0 50px ${GREEN}`,
              border: `6px solid ${GREEN}`,
              borderRadius: 30,
              padding: "10px 70px",
            }}
          >
            {UI.formula[0]} &gt; 0
          </div>
        </AbsoluteFill>
      )}
    </SceneShell>
  );
};
