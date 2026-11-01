import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { C } from "../../components/Hud";
import { CameraRig, Stage } from "../../components/Stage";
import { MONO, zh } from "../../lib/fonts";
import { ease } from "../../lib/gsap";
import { SceneShell } from "../components/SceneShell";
import { appear, fadeOut, GREEN, RED } from "../components/Charts";
import { ergoStats, logFanStats } from "../components/CanvasCharts";
import { SIZING_TRADES } from "../sim.ts";
import { SCRIPT } from "../timeline.ts";
import { GlassCard, Label, makeCamera, projector, v, type Shot } from "../three/common";
import { World } from "../three/World";
import {
  Beam,
  CoinParticles,
  coinMeanLog,
  coinMedianLog,
  EKX,
  GROUP_X,
  MedianPath,
  Runway,
  RunwayHeads,
  RUN_LEN,
  SizingPlanes,
  SKX,
  SKY,
} from "../three/SizingSpace";

const UI = SCRIPT.ui;
const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: ease("power1.inOut") } as const;
const RUN_IN = 100;
const RUN_OUT = 905;
const COIN_IN = 1160;
const ZC = -1.5; // the middle of each group's lanes
const MID = (GROUP_X.s40 + RUN_LEN) / 2; // between the two groups
const X40 = GROUP_X.s40;

const tradesAt = (f: number) => interpolate(f, [260, 490], [0, SIZING_TRADES], clamp);
const roundAt = (f: number) => interpolate(f, [1170, 1400], [0, 100], clamp);

// ---------------- cameras ----------------

// Always from the front (never from behind, which would mirror the trade axis), so the
// 2% group stays on the left and the 40% group on the right in every shot.
const RUN_SHOTS: Record<string, Shot> = {
  establish: () => ({ pos: v(MID - 6, 7, 30), target: v(MID, -1, ZC), fov: 40 }),
  establish2: () => ({ pos: v(MID - 3, 5.5, 31), target: v(MID, -1.4, ZC), fov: 40 }),
  // both groups advance together; the camera drifts along with them, staying wide
  track: (f) => {
    const k = tradesAt(f) / SIZING_TRADES;
    return { pos: v(MID - 3 + k * 6, 4.5, 31), target: v(MID, -1.8, ZC), fov: 40 };
  },
  focus2: () => ({ pos: v(RUN_LEN * 0.55, 3, 14), target: v(RUN_LEN * 0.55, 0.2, ZC), fov: 40 }),
  focus40: () => ({ pos: v(X40 + RUN_LEN * 0.55, -1.5, 15), target: v(X40 + RUN_LEN * 0.55, -3.6, ZC), fov: 44 }),
  wide: () => ({ pos: v(MID, 3.5, 33), target: v(MID, -2.4, ZC), fov: 40 }),
};
const runCam = makeCamera(RUN_SHOTS, [
  [RUN_IN, "establish"],
  [225, "establish2"],
  [262, "track"],
  [480, "track"],
  [545, "focus2"],
  [630, "focus2"],
  [690, "focus40"],
  [770, "focus40"],
  [835, "wide"],
  [RUN_OUT, "wide"],
]);

const COIN_SHOTS: Record<string, Shot> = {
  tower: () => ({ pos: v(0, 3.4, 11), target: v(0, 3.0, 0), fov: 38 }),
  tower2: () => ({ pos: v(-0.6, 3.6, 14), target: v(0, 2.2, 0), fov: 38 }),
  spread: () => ({ pos: v(-1, 4.2, 19.5), target: v(-0.8, 1.7, 0), fov: 38 }),
  // high and far: every beam, its label and the whole distribution in one frame
  overview: (f) => ({ pos: v(-0.4 + Math.sin(f * 0.004) * 1.5, 9.5, 28), target: v(-0.4, 3.6, 0), fov: 38 }),
};
const coinCam = makeCamera(COIN_SHOTS, [
  [COIN_IN, "tower"],
  [1205, "tower2"],
  [1290, "spread"],
  [1330, "spread"],
  [1440, "overview"],
  [1650, "overview"],
], "power2.inOut");

// ---------------- runways (position sizing) ----------------

const RunSpace: React.FC<{ f: number }> = ({ f }) => {
  const cam = runCam(f);
  const n = tradesAt(f);
  // whichever group a close-up is about stays bright; the other recedes into the background
  const on2 = 1 - 0.8 * appear(f, 640, 24) * fadeOut(f, 775, 24);
  const on40 = 1 - 0.75 * appear(f, 500, 24) * fadeOut(f, 640, 20);
  return (
    <Stage fov={cam.fov} bloom={1.0} bloomThreshold={0.18}>
      <CameraRig position={cam.pos.toArray() as [number, number, number]} target={cam.target.toArray() as [number, number, number]} fov={cam.fov} />
      <World center={[9, 0, ZC]} groundY={-9} sun={[0.6, -1]} time={f / 30} intensity={0.85} />
      <SizingPlanes opacity={appear(f, RUN_IN + 10, 30)} />
      <Runway which="s2" n={n} color={C.gold} alpha={0.06 * on2} />
      <Runway which="s40" n={n} color={C.steel} alpha={0.035 * on40} />
      <RunwayHeads which="s2" n={n} color={C.gold} />
      <RunwayHeads which="s40" n={n} color={C.steel} />
      {/* each group's main line in its own colour, brighter than its crowd */}
      <MedianPath which="s2" n={n} color="#ffd36e" opacity={appear(f, 300, 30)} />
      <MedianPath which="s40" n={n} color="#7cc4ff" opacity={appear(f, 300, 30)} />
    </Stage>
  );
};

const fmtMult = (m: number) => (m >= 0.01 ? `×${m.toFixed(m >= 10 ? 0 : 1)}` : `×${m.toExponential(0).replace("e-", "e−")}`);

const RunLabels: React.FC<{ f: number }> = ({ f }) => {
  const { width, height } = useVideoConfig();
  const proj = projector(runCam(f), width, height);
  const out: React.ReactNode[] = [];
  const groups = [
    { which: "s2" as const, title: UI.risk2, color: C.gold },
    { which: "s40" as const, title: UI.risk40, color: C.steel },
  ];
  for (const g of groups) {
    // each group's name floats above the start of its own runway
    const p = proj(v(GROUP_X[g.which] + RUN_LEN / 2, 4.6, ZC));
    out.push(
      <Label key={g.which} x={p.x} y={p.y} o={appear(f, RUN_IN + 20) * fadeOut(f, 228, 14)} align="center">
        <GlassCard>
          <div style={{ padding: "10px 20px", ...zh(900), fontSize: 26, color: g.color }}>{g.title}</div>
        </GlassCard>
      </Label>,
    );
  }
  const ticks: [number, string][] = [
    [2, "×100"],
    [1, "×10"],
    [0, "×1"],
    [-1, UI.lost90],
    [-3, "1/1000"],
  ];
  for (const [e, txt, x0] of ticks.flatMap(([e, txt]) => [0, X40].map((x0) => [e, txt, x0] as const))) {
    const p = proj(v(x0 - 0.4, e * SKY, 0.6));
    out.push(
      <Label key={`t${e}-${x0}`} x={p.x - 10} y={p.y} o={appear(f, RUN_IN + 30) * fadeOut(f, 545)} align="right">
        <span style={{ ...(e === -1 ? zh(900) : { fontFamily: MONO.fontFamily }), fontSize: 20, color: e === -1 ? RED : e === 0 ? "#fff" : C.dim }}>{txt}</span>
      </Label>,
    );
  }
  return <AbsoluteFill style={{ pointerEvents: "none" }}>{out}</AbsoluteFill>;
};

/** Screen-fixed glass readouts for the two numbers the captions quote. */
const RunReadouts: React.FC<{ f: number }> = ({ f }) => {
  const n = tradesAt(f);
  const card = (which: "s2" | "s40", title: string, color: string, pulseAt: number, side: "left" | "right") => {
    const s = logFanStats(which, n);
    const pulse = f >= pulseAt && f < pulseAt + 60 ? 1 - (f - pulseAt) / 60 : 0;
    const k = appear(f, 230, 24) * fadeOut(f, RUN_OUT - 12, 12);
    return (
      <div style={{ position: "absolute", top: 120, [side]: 110, opacity: k, transform: `translateY(${(1 - k) * -20}px) scale(${1 + pulse * 0.06})` }}>
        <GlassCard ry={side === "left" ? 10 : -10} tint={pulse > 0 ? "255,255,255" : "120,170,255"}>
          <div style={{ padding: "16px 26px", minWidth: 300, boxShadow: pulse > 0 ? `inset 0 0 40px ${color}55` : undefined }}>
            <div style={{ ...zh(900), fontSize: 24, color }}>{title}</div>
            <div style={{ display: "flex", gap: 26, marginTop: 8 }}>
              <div style={{ ...zh(500), fontSize: 18, color: C.dim }}>
                {UI.median}
                <div style={{ fontFamily: MONO.fontFamily, fontWeight: 700, fontSize: 36, color: s.median >= 1 ? GREEN : RED }}>{fmtMult(s.median)}</div>
              </div>
              <div style={{ ...zh(500), fontSize: 18, color: C.dim }}>
                {UI.ruined}
                <div style={{ fontFamily: MONO.fontFamily, fontWeight: 700, fontSize: 36, color: s.ruined > 0.05 ? RED : GREEN }}>{(s.ruined * 100).toFixed(0)}%</div>
              </div>
            </div>
            <div style={{ fontFamily: MONO.fontFamily, fontSize: 14, color: C.dim, marginTop: 6 }}>
              {Math.floor(n)} / {SIZING_TRADES} {UI.trades}
            </div>
          </div>
        </GlassCard>
      </div>
    );
  };
  const same = appear(f, 780) * fadeOut(f, RUN_OUT - 12, 12);
  return (
    <>
      {card("s2", UI.risk2, C.gold, 495, "left")}
      {card("s40", UI.risk40, C.steel, 635, "right")}
      {same > 0 && (
        <div style={{ position: "absolute", left: 0, right: 0, top: 150, display: "flex", justifyContent: "center", opacity: same }}>
          <GlassCard tint="255,181,71">
            <div style={{ padding: "12px 28px", ...zh(900), fontSize: 28, color: C.amber }}>{UI.sameEdge}</div>
          </GlassCard>
        </div>
      )}
    </>
  );
};

// ---------------- the coin game ----------------

const CoinRule: React.FC<{ f: number }> = ({ f }) => {
  const h = appear(f, 920, 24);
  const t = appear(f, 945, 24);
  const avg = appear(f, 1050, 24);
  const card = (label: string, value: string, color: string, k: number, tint: string) => (
    <GlassCard rx={(1 - k) * 50} ry={(1 - k) * -70} tint={tint} style={{ opacity: k }}>
      <div style={{ width: 360, height: 230, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
        <div style={{ ...zh(500), fontSize: 30, color: C.dim }}>{label}</div>
        <div style={{ fontFamily: MONO.fontFamily, fontWeight: 700, fontSize: 88, color, textShadow: `0 0 30px ${color}` }}>{value}</div>
      </div>
    </GlassCard>
  );
  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", marginTop: -60, opacity: fadeOut(f, COIN_IN - 4, 14) }}>
      <div style={{ display: "flex", gap: 60, alignItems: "center" }}>
        {card(UI.heads, "+50%", GREEN, h, "63,242,164")}
        {card(UI.tails, "−40%", RED, t, "255,77,109")}
        <div style={{ opacity: avg, transform: `scale(${0.8 + avg * 0.2}) translateY(${(1 - avg) * 30}px)`, textAlign: "center" }}>
          <div style={{ ...zh(500), fontSize: 30, color: C.dim }}>{UI.avgPerRound}</div>
          <div style={{ fontFamily: MONO.fontFamily, fontWeight: 700, fontSize: 104, color: C.amber, textShadow: `0 0 30px ${C.amber}` }}>+5%</div>
          <div style={{ fontFamily: MONO.fontFamily, fontSize: 22, color: C.dim }}>(+50% − 40%) ÷ 2</div>
        </div>
      </div>
    </AbsoluteFill>
  );
};

const CoinSpace: React.FC<{ f: number }> = ({ f }) => {
  const cam = coinCam(f);
  const r = roundAt(f);
  return (
    <Stage fov={cam.fov} bloom={1.1} bloomThreshold={0.18}>
      <CameraRig position={cam.pos.toArray() as [number, number, number]} target={cam.target.toArray() as [number, number, number]} fov={cam.fov} />
      <World groundY={-0.6} sun={[0, -1]} scale={0.8} time={f / 30} />
      <CoinParticles round={r} height={5.2} />
      <Beam e={0} color="#ffffff" opacity={appear(f, 1175) * 0.7} dashed />
      <Beam e={coinMeanLog(r)} color={C.gold} opacity={appear(f, 1200) * (0.45 + appear(f, 1295) * 0.55)} />
      <Beam e={coinMedianLog(r)} color={C.steel} opacity={appear(f, 1200) * (0.45 + appear(f, 1425) * 0.55)} />
    </Stage>
  );
};

const CoinLabels: React.FC<{ f: number }> = ({ f }) => {
  const { width, height } = useVideoConfig();
  const proj = projector(coinCam(f), width, height);
  const r = roundAt(f);
  const e = ergoStats(r);
  const out: React.ReactNode[] = [];
  const beam = (key: string, logV: number, label: string, value: string, color: string, o: number, y: number) => {
    const p = proj(v(logV * EKX, y, 0.9));
    out.push(
      <Label key={key} x={p.x} y={p.y} o={o} align="center">
        <GlassCard>
          <div style={{ padding: "8px 18px", textAlign: "center" }}>
            <div style={{ ...zh(500), fontSize: 18, color: C.dim }}>{label}</div>
            <div style={{ fontFamily: MONO.fontFamily, fontWeight: 700, fontSize: 30, color }}>{value}</div>
          </div>
        </GlassCard>
      </Label>,
    );
  };
  beam("p", 0, UI.principal, "×1", "#fff", appear(f, 1180) * fadeOut(f, 1290), 7.4);
  beam("m", coinMeanLog(r), UI.mean, `×${e.mean < 10 ? e.mean.toFixed(2) : Math.round(e.mean)}`, C.gold, appear(f, 1210), 7.6);
  beam("d", coinMedianLog(r), UI.median, `×${e.median < 0.1 ? e.median.toFixed(3) : e.median.toFixed(2)}`, C.steel, appear(f, 1210), 6.4);
  for (const dec of [-4, -2, 0, 2, 4]) {
    const p = proj(v(dec * EKX, -0.35, 1.0));
    out.push(
      <Label key={`d${dec}`} x={p.x} y={p.y} o={appear(f, 1240)} align="center">
        <span style={{ fontFamily: MONO.fontFamily, fontSize: 18, color: dec === 0 ? "#fff" : C.dim }}>{dec >= 0 ? `×${10 ** dec}` : `1/${10 ** -dec}`}</span>
      </Label>,
    );
  }
  const tower = proj(v(0.3, 4.5, 0.9));
  out.push(
    <Label key="each" x={tower.x + 30} y={tower.y} o={appear(f, 1165) * fadeOut(f, 1230)}>
      <span style={{ ...zh(500), fontSize: 24, color: C.text }}>● {UI.eachParticle}</span>
    </Label>,
  );
  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      {out}
      <div style={{ position: "absolute", right: 110, top: 120, opacity: appear(f, COIN_IN + 10) }}>
        <GlassCard ry={-10}>
          <div style={{ padding: "14px 26px", textAlign: "right" }}>
            <div style={{ fontFamily: MONO.fontFamily, fontWeight: 700, fontSize: 52, color: "#fff" }}>{UI.round.replace("{r}", String(e.round))}</div>
            <div style={{ ...zh(500), fontSize: 20, color: C.dim }}>
              {UI.players} · {UI.losingMoney}{" "}
              <span style={{ fontFamily: MONO.fontFamily, fontWeight: 700, fontSize: 30, color: RED }}>{(e.losing * 100).toFixed(0)}%</span>
            </div>
          </div>
        </GlassCard>
      </div>
    </AbsoluteFill>
  );
};

export const Sizing3D: React.FC = () => {
  const f = useCurrentFrame();
  const runO = appear(f, RUN_IN, 26) * fadeOut(f, RUN_OUT, 16);
  const coinO = appear(f, COIN_IN, 24);
  return (
    <SceneShell id="sizing">
      {f >= RUN_IN - 2 && f < RUN_OUT + 18 && (
        <AbsoluteFill style={{ opacity: runO }}>
          <RunSpace f={f} />
          <RunLabels f={f} />
          <RunReadouts f={f} />
        </AbsoluteFill>
      )}
      {f >= 905 && f < COIN_IN + 20 && <CoinRule f={f} />}
      {f >= COIN_IN - 2 && (
        <AbsoluteFill style={{ opacity: coinO }}>
          <CoinSpace f={f} />
          <CoinLabels f={f} />
        </AbsoluteFill>
      )}
    </SceneShell>
  );
};
