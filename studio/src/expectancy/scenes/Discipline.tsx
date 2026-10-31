import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { C } from "../../components/Hud";
import { DISPLAY, MONO, zh } from "../../lib/fonts";
import { ease } from "../../lib/gsap";
import { SceneShell } from "../components/SceneShell";
import { appear, AreaChart, fadeOut, Formula, glass, GREEN, RED } from "../components/Charts";
import { STRATEGY_B } from "../sim.ts";
import { cue, SCRIPT } from "../timeline.ts";

const UI = SCRIPT.ui;
const CHECKS_AT = [1050, 1070, 1090, 1110];

const Chip: React.FC<{ text: string; k: number; color: string }> = ({ text, k, color }) => (
  <div
    style={{
      ...zh(900),
      fontSize: 34,
      color,
      border: `2px solid ${color}`,
      borderRadius: 999,
      padding: "6px 26px",
      opacity: k,
      transform: `scale(${0.6 + ease("back.out(2.5)")(k) * 0.4})`,
      background: "rgba(5,6,16,0.7)",
      boxShadow: `0 0 24px ${color}66`,
      whiteSpace: "nowrap",
    }}
  >
    {text}
  </div>
);

/** Doubling down after losses: each bet twice the last, drawn as growing red blocks. */
const DoubleDown: React.FC<{ frame: number }> = ({ frame }) => {
  const sizes = [1, 2, 4, 8, 16];
  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", marginTop: -40 }}>
      <Chip text={UI.doubleDown} k={appear(frame, 772)} color={RED} />
      <div style={{ display: "flex", alignItems: "flex-end", gap: 26, marginTop: 40, height: 380 }}>
        {sizes.map((s, i) => {
          const k = appear(frame, 785 + i * 16, 14);
          return (
            <div key={s} style={{ textAlign: "center", opacity: k }}>
              <div style={{ fontFamily: MONO.fontFamily, fontWeight: 700, fontSize: 30, color: i === sizes.length - 1 ? RED : C.text, marginBottom: 10 }}>×{s}</div>
              <div style={{ width: 110, height: s * 21 * k, background: `linear-gradient(180deg, ${RED}, ${RED}55)`, borderRadius: 8, boxShadow: `0 0 ${s * 3}px ${RED}` }} />
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};

const Checks: React.FC<{ frame: number }> = ({ frame }) => (
  <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", marginTop: -40 }}>
    <div style={{ display: "flex", gap: 34 }}>
      {UI.checks.map((c, i) => {
        const k = appear(frame, CHECKS_AT[i], 20);
        return (
          <div key={c} style={{ ...glass, width: 360, height: 300, padding: 30, boxSizing: "border-box", opacity: k, transform: `translateY(${(1 - k) * 60}px)`, position: "relative" }}>
            <div style={{ fontFamily: MONO.fontFamily, fontSize: 20, color: C.cyan, letterSpacing: 3 }}>0{i + 1}</div>
            <div style={{ ...zh(900), fontSize: 50, color: "#fff", marginTop: 40 }}>{c}</div>
            <div style={{ fontFamily: DISPLAY.fontFamily, fontWeight: 300, fontSize: 16, letterSpacing: 4, color: C.dim, marginTop: 10 }}>{UI.checksEn[i]}</div>
            <div
              style={{
                position: "absolute",
                right: 26,
                top: 22,
                width: 54,
                height: 54,
                borderRadius: 27,
                background: GREEN,
                color: "#032",
                fontSize: 36,
                fontWeight: 900,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                transform: `scale(${ease("back.out(3)")(appear(frame, CHECKS_AT[i] + 8, 12))})`,
                boxShadow: `0 0 24px ${GREEN}`,
              }}
            >
              ✓
            </div>
          </div>
        );
      })}
    </div>
  </AbsoluteFill>
);

export const Discipline: React.FC = () => {
  const frame = useCurrentFrame();
  // the two leaks, then (at 905) discipline restores the original numbers
  const restore = ease("expo.inOut")(interpolate(frame, [905, 965], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }));
  const win = interpolate(frame, [350, 425], [STRATEGY_B.win, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: ease("power2.inOut") });
  const loss = interpolate(frame, [490, 565], [STRATEGY_B.loss, 2], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: ease("power2.inOut") });
  const values = {
    p: STRATEGY_B.pWin,
    win: win + (STRATEGY_B.win - win) * restore,
    loss: loss + (STRATEGY_B.loss - loss) * restore,
  };

  const mainIn = appear(frame, 110, 24);
  const dim = frame >= 765 && frame < 905 ? appear(frame, 765, 14) : frame >= 905 ? 1 - appear(frame, 905, 20) : 0;
  const gone = appear(frame, 1040, 14);
  const highlight: ("win" | "loss")[] = [];
  if (frame >= 335 && frame < 615) highlight.push("win");
  if (frame >= 475 && frame < 615) highlight.push("loss");
  const shield = frame >= 905 && frame < 1045 ? appear(frame, 930) : 0;
  const hit = cue("discipline", "hit", 600);
  const flash = frame >= hit && frame < hit + 20 ? 1 - (frame - hit) / 20 : 0;

  return (
    <SceneShell id="discipline">
      {frame < 1050 && (
        <div style={{ opacity: mainIn * (1 - dim * 0.88) * (1 - gone), filter: `blur(${dim * 5}px)` }}>
          <div style={{ position: "absolute", left: 0, right: 0, top: 215 }}>
            <Formula show={interpolate(frame, [110, 200], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })} values={values} numbers={appear(frame, 220)} result={appear(frame, 300)} size={54} highlight={highlight} />
          </div>
          <div style={{ position: "absolute", left: 0, right: 0, top: 330, display: "flex", justifyContent: "center", gap: 60, alignItems: "flex-start" }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 30, alignItems: "flex-end", paddingTop: 120, width: 300 }}>
              {frame >= 335 && <Chip text={UI.takeProfitEarly} k={appear(frame, 340) * fadeOut(frame, 905)} color={C.amber} />}
              {frame >= 475 && <Chip text={UI.holdLosers} k={appear(frame, 480) * fadeOut(frame, 905)} color={C.amber} />}
            </div>
            <div style={{ boxShadow: shield > 0 ? `0 0 ${80 * shield}px ${GREEN}88` : undefined, borderRadius: 20, outline: shield > 0 ? `3px solid ${GREEN}` : undefined, outlineOffset: 10 }}>
              <AreaChart values={values} grow={appear(frame, 230, 40)} label={`${UI.traderB}`} showNet={appear(frame, 300)} width={760} height={500} />
            </div>
            <div style={{ width: 300 }} />
          </div>
          <AbsoluteFill style={{ background: RED, opacity: flash * 0.18, pointerEvents: "none" }} />
        </div>
      )}
      {frame >= 765 && frame < 905 && <div style={{ opacity: fadeOut(frame, 890, 14) }}><DoubleDown frame={frame} /></div>}
      {frame >= 1045 && <Checks frame={frame} />}
    </SceneShell>
  );
};
