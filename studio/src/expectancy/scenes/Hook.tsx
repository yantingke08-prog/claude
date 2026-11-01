import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { C } from "../../components/Hud";
import { zh } from "../../lib/fonts";
import { SceneShell } from "../components/SceneShell";
import { appear, EquityPanel } from "../components/Charts";
import { hookPathA, hookPathB } from "../sim.ts";
import { cue, SCRIPT } from "../timeline.ts";

const A = hookPathA();
const B = hookPathB();
const CRASH = cue("hook", "hit");
const TITLE_AT = 440;

/** Two equity curves race; the 70% trader blows up, the 40% trader grinds higher. */
export const HookCharts: React.FC<{ frame: number; scale?: number }> = ({ frame, scale = 1 }) => {
  const revealA = interpolate(frame, [40, CRASH], [0, A.liquidatedAt], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const revealB = interpolate(frame, [40, CRASH + 8], [0, B.length - 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const inA = appear(frame, 6, 24);
  const inB = appear(frame, 14, 24);
  return (
    <div style={{ display: "flex", gap: 60, transform: `scale(${scale})` }}>
      <div style={{ opacity: inA, transform: `translateY(${(1 - inA) * 50}px)` }}>
        <EquityPanel name="A" winRate={70} equity={A.equity} reveal={revealA} liquidatedAt={A.liquidatedAt} color={C.steel} frame={frame} crashFrame={CRASH} />
      </div>
      <div style={{ opacity: inB, transform: `translateY(${(1 - inB) * 50}px)` }}>
        <EquityPanel name="B" winRate={40} equity={B} reveal={revealB} color={C.gold} frame={frame} />
      </div>
    </div>
  );
};

export const Hook: React.FC = () => {
  const frame = useCurrentFrame();
  const back = appear(frame, TITLE_AT, 30);
  const [line1, line2] = SCRIPT.title.split("，");
  const l1 = appear(frame, TITLE_AT + 6, 24);
  const l2 = appear(frame, TITLE_AT + 22, 24);
  const accentNums = (s: string) =>
    s.split(/(\d+%)/).map((p, i) =>
      /\d+%/.test(p) ? (
        <span key={i} style={{ color: i === 1 && s === line1 ? C.gold : C.steel, textShadow: `0 0 30px currentColor` }}>
          {p}
        </span>
      ) : (
        <span key={i}>{p}</span>
      ),
    );
  return (
    <SceneShell id="hook">
      <AbsoluteFill style={{ alignItems: "center", justifyContent: "center" }}>
        <div style={{ opacity: 1 - back * 0.75, filter: `blur(${back * 6}px)`, transform: `scale(${1 - back * 0.08}) translateY(-30px)` }}>
          <HookCharts frame={frame} />
        </div>
      </AbsoluteFill>
      {frame >= TITLE_AT && (
        <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", ...zh(900), color: "#fff", textAlign: "center", marginTop: -60 }}>
          <div style={{ fontSize: 92, opacity: l1, transform: `translateY(${(1 - l1) * 40}px)`, letterSpacing: 4 }}>{accentNums(line1)}，</div>
          <div style={{ fontSize: 92, opacity: l2, transform: `translateY(${(1 - l2) * 40}px)`, letterSpacing: 4, marginTop: 10 }}>{accentNums(line2)}</div>
        </AbsoluteFill>
      )}
    </SceneShell>
  );
};
