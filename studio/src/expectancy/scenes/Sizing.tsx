import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { C } from "../../components/Hud";
import { MONO, zh } from "../../lib/fonts";
import { ease } from "../../lib/gsap";
import { SceneShell } from "../components/SceneShell";
import { appear, fadeOut, glass, GREEN, RED } from "../components/Charts";
import { ErgoHistogram, ergoStats, LogFan, logFanStats } from "../components/CanvasCharts";
import { SimTag } from "../components/Chrome";
import { SIZING_TRADES } from "../sim.ts";
import { SCRIPT } from "../timeline.ts";

const UI = SCRIPT.ui;

const fmtMult = (m: number) => (m >= 0.01 ? `×${m.toFixed(m >= 10 ? 0 : 1)}` : `×${m.toExponential(0).replace("e-", "e−")}`);

const SizingPanel: React.FC<{ which: "s2" | "s40"; n: number; title: string; color: string; pulse: number }> = ({ which, n, title, color, pulse }) => {
  const s = logFanStats(which, n);
  return (
    <div style={{ ...glass, width: 820, padding: "22px 10px 12px", boxShadow: `0 30px 80px rgba(0,0,0,0.5), 0 0 ${60 * pulse}px ${color}88` }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", padding: "0 26px 8px" }}>
        <span style={{ ...zh(900), fontSize: 32, color }}>{title}</span>
        <span style={{ fontFamily: MONO.fontFamily, fontSize: 22, color: C.dim }}>
          {Math.floor(n)} / {SIZING_TRADES}
        </span>
      </div>
      <LogFan which={which} n={n} width={800} height={470} color={color} />
      <div style={{ display: "flex", gap: 40, padding: "6px 26px 0" }}>
        <div style={{ ...zh(500), fontSize: 22, color: C.dim }}>
          {UI.median}{" "}
          <span style={{ fontFamily: MONO.fontFamily, fontWeight: 700, fontSize: 34, color: s.median >= 1 ? GREEN : RED }}>{fmtMult(s.median)}</span>
        </div>
        <div style={{ ...zh(500), fontSize: 22, color: C.dim }}>
          {UI.ruined}{" "}
          <span style={{ fontFamily: MONO.fontFamily, fontWeight: 700, fontSize: 34, color: s.ruined > 0.05 ? RED : GREEN }}>{(s.ruined * 100).toFixed(0)}%</span>
        </div>
      </div>
    </div>
  );
};

const CoinRule: React.FC<{ frame: number }> = ({ frame }) => {
  const h = appear(frame, 920);
  const t = appear(frame, 945);
  const avg = appear(frame, 1050);
  const card = (label: string, value: string, color: string, k: number) => (
    <div style={{ ...glass, width: 360, height: 220, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", opacity: k, transform: `translateY(${(1 - k) * 40}px) rotateY(${(1 - k) * 80}deg)` }}>
      <div style={{ ...zh(500), fontSize: 30, color: C.dim }}>{label}</div>
      <div style={{ fontFamily: MONO.fontFamily, fontWeight: 700, fontSize: 84, color, textShadow: `0 0 30px ${color}` }}>{value}</div>
    </div>
  );
  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", perspective: 1200, marginTop: -60 }}>
      <div style={{ display: "flex", gap: 60, alignItems: "center" }}>
        {card(UI.heads, "+50%", GREEN, h)}
        {card(UI.tails, "−40%", RED, t)}
        <div style={{ opacity: avg, transform: `scale(${0.8 + avg * 0.2})`, textAlign: "center" }}>
          <div style={{ ...zh(500), fontSize: 30, color: C.dim }}>{UI.avgPerRound}</div>
          <div style={{ fontFamily: MONO.fontFamily, fontWeight: 700, fontSize: 96, color: C.amber, textShadow: `0 0 30px ${C.amber}` }}>+5%</div>
          <div style={{ fontFamily: MONO.fontFamily, fontSize: 22, color: C.dim }}>(+50% − 40%) ÷ 2</div>
        </div>
      </div>
    </AbsoluteFill>
  );
};

export const Sizing: React.FC = () => {
  const frame = useCurrentFrame();
  const n = interpolate(frame, [260, 490], [0, SIZING_TRADES], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: ease("power1.inOut") });
  const panelsIn = appear(frame, 110, 26);
  const panelsOut = fadeOut(frame, 900, 16);
  const pulseL = frame >= 495 && frame < 640 ? Math.max(0, 1 - (frame - 495) / 40) : 0;
  const pulseR = frame >= 635 && frame < 780 ? Math.max(0, 1 - (frame - 635) / 40) : 0;
  const same = appear(frame, 780);

  const round = interpolate(frame, [1170, 1400], [0, 100], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: ease("power1.inOut") });
  const e = ergoStats(round);
  const histIn = appear(frame, 1165, 24);
  const coinOut = fadeOut(frame, 1160, 14);
  const meanHi = appear(frame, 1295);
  const medHi = appear(frame, 1425);

  return (
    <SceneShell id="sizing">
      {frame < 920 && (
        <div style={{ position: "absolute", left: 0, right: 0, top: 170, display: "flex", justifyContent: "center", gap: 50, opacity: panelsIn * panelsOut, transform: `translateY(${(1 - panelsIn) * 40}px)` }}>
          <SizingPanel which="s2" n={n} title={UI.risk2} color={C.cyan} pulse={pulseL} />
          <SizingPanel which="s40" n={n} title={UI.risk40} color={C.amber} pulse={pulseR} />
        </div>
      )}
      {same > 0 && frame < 920 && (
        <div style={{ position: "absolute", left: 0, right: 0, top: 118, textAlign: "center", opacity: same * panelsOut, ...zh(500), fontSize: 28, color: C.amber }}>
          {UI.sameEdge}
        </div>
      )}
      {frame >= 905 && frame < 1180 && (
        <div style={{ opacity: coinOut }}>
          <CoinRule frame={frame} />
        </div>
      )}
      {frame >= 1160 && (
        <div style={{ position: "absolute", left: 110, top: 160, opacity: histIn }}>
          <div style={{ ...glass, padding: "18px 0 6px", position: "relative" }}>
            <ErgoHistogram round={round} width={1700} height={620} />
            <SimTag label={`${UI.simulated} · ${UI.players}`} style={{ position: "absolute", left: 40, bottom: 16 }} />
            <div style={{ position: "absolute", left: 40, top: 20, fontFamily: MONO.fontFamily, fontWeight: 700, fontSize: 56, color: "#fff" }}>
              {UI.round.replace("{r}", String(e.round))}
            </div>
            <div style={{ position: "absolute", right: 40, top: 20, textAlign: "right", ...zh(500), fontSize: 24, color: C.dim, lineHeight: 1.7 }}>
              <div style={{ opacity: 0.4 + meanHi * 0.6 }}>
                {UI.mean} <span style={{ fontFamily: MONO.fontFamily, fontWeight: 700, fontSize: 36, color: C.amber }}>×{e.mean < 10 ? e.mean.toFixed(2) : Math.round(e.mean)}</span>
              </div>
              <div style={{ opacity: 0.4 + medHi * 0.6 }}>
                {UI.median} <span style={{ fontFamily: MONO.fontFamily, fontWeight: 700, fontSize: 36, color: C.cyan }}>×{e.median < 0.1 ? e.median.toFixed(3) : e.median.toFixed(2)}</span>
              </div>
              <div style={{ opacity: 0.4 + medHi * 0.6 }}>
                {UI.losingMoney} <span style={{ fontFamily: MONO.fontFamily, fontWeight: 700, fontSize: 36, color: RED }}>{(e.losing * 100).toFixed(0)}%</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </SceneShell>
  );
};
