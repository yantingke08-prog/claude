// Chart shots: hook, who, absorb, forced, cascade, accept.
// 红涨绿跌 candles; each chart carries volume + Delta panes, a footprint where the story needs it,
// a live HUD and the time & sales ticker.
import React from "react";
import { camSteps, count, lin, mix, prog, pulse, win } from "../anim";
import { useFilm } from "../ctx";
import { BigX, Candle3D, Hit, LevelLine, PriceGrid, Stage, Tag, alpha, priceMap, type Candle } from "../kit";
import { ABSORB, ABSORB_VOL, ACC_BASE, ACC_LEVEL, HOOK_ALL, HOOK_BASE, HOOK_CHASE, HOOK_TURN, KEY_LEVEL, PRE_BREAK, range } from "../market";
import { AxisTitle, DeltaBars, Footprint, Hud, Ticker, VolBars, flow, fmtD, fmtN, fpRows, imb, merge, pocIndex, totals, type FpRow, type Print } from "../orderflow";
import { mulberry32 } from "../../lib/rng";
import { C, DNT, STOP, STOPT, UPT } from "../theme";
import type { SceneProps } from "./parts";

const xs = (n: number, x0: number, x1: number) => Array.from({ length: n }, (_, i) => x0 + ((x1 - x0) * (i + 0.5)) / n);
const px = (p: number) => (3400 + p).toFixed(2);
const seededDeltas = (seed: number, ks: Candle[], scale = 600) => {
  const r = mulberry32(seed);
  return ks.map((k) => Math.round(Math.sign(k.c - k.o || 1) * (0.25 + r() * 0.75) * scale + (r() - 0.5) * scale * 0.3));
};
const seededVols = (seed: number, ks: Candle[]) => {
  const r = mulberry32(seed);
  return ks.map((k) => Math.round(400 + Math.abs(k.c - k.o) * 160 + r() * 300));
};
/** row index whose middle is nearest to the imbalance we want to label */
const firstImb = (rows: FpRow[], side: 1 | -1) => rows.findIndex((r) => imb(r) === side);
const rowMid = (y: (p: number) => number, r: FpRow) => (y(r.lo) + y(r.hi)) / 2;

const ChartFlow: React.FC<{ t: number; prints: Print[]; base: number; last: string }> = ({ t, prints, base, last }) => {
  const { vol, delta } = totals(prints, t);
  return (
    <>
      <Hud
        items={[
          { label: "成交量", value: fmtN(base + vol), color: C.text },
          { label: "Delta", value: fmtD(delta), color: delta >= 0 ? UPT : DNT },
          { label: "最新价", value: last, color: C.amber },
        ]}
      />
      <Ticker t={t} prints={prints} />
    </>
  );
};

// ---------------- hook + who share one chart ----------------
const HK = (() => {
  const r = range(HOOK_ALL);
  const y = priceMap(r.min - 1.0, r.max + 1.0, 400, 990);
  const X = xs(HOOK_ALL.length, 90, 700);
  return { y, X, w: 24 };
})();
const iChase = HOOK_BASE.length;
const iTurn = iChase + 1;
const HK_VOL = (() => {
  const v = seededVols(12, HOOK_ALL).map((x) => x * 1.4);
  v[iChase] = 2100;
  v[iTurn] = 2900;
  return v;
})();
const HK_DELTA = (() => {
  const d = seededDeltas(13, HOOK_ALL, 900);
  d[iChase] = 1860;
  d[iTurn] = -2940;
  return d;
})();
const HK_FP = fpRows(HOOK_TURN, 12, 17, -0.75, 1.3);
const HK_FX = HK.X[iTurn] + 34;

const HookChart: React.FC<{ chaseGrow: number; turnGrow: number; entry: number; dim?: number; fp?: number; fpDim?: number }> = ({ chaseGrow, turnGrow, entry, dim = 0, fp = 0, fpDim = 0 }) => {
  const { y, X, w } = HK;
  const turned = turnGrow > 0.15;
  const grow = (i: number) => (i < iChase ? 1 : i === iChase ? chaseGrow : turnGrow);
  return (
    <>
      <PriceGrid x1={70} x2={1000} y1={410} y2={990} step={72.5} o={1 - dim * 0.5} />
      {HOOK_BASE.map((k, i) => (
        <Candle3D key={i} k={k} x={X[i]} w={w} y={y} o={1 - dim * 0.7} />
      ))}
      <Candle3D k={HOOK_CHASE} x={X[iChase]} w={w} y={y} grow={chaseGrow} o={1 - dim * 0.7} glow={chaseGrow * (1 - turnGrow) * 0.6} />
      <Candle3D k={HOOK_TURN} x={X[iTurn]} w={w} y={y} grow={turnGrow} o={1 - dim * 0.4} glow={turnGrow * 0.5} />
      <LevelLine x1={X[iChase] - 150} x2={X[iTurn] + 20} y={y(HOOK_CHASE.c)} color={turned ? DNT : C.amber} o={entry * (1 - dim * 0.6)} dash />
      <AxisTitle x={70} y={1032} text="成交量" />
      <VolBars X={X} ks={HOOK_ALL} vols={HK_VOL} yBase={1120} hMax={84} w={w} grow={grow} o={1 - dim * 0.6} />
      <AxisTitle x={70} y={1146} text="Delta" />
      <DeltaBars X={X} deltas={HK_DELTA} y0={1205} hMax={48} w={w} grow={grow} o={1 - dim * 0.6} />
      <Footprint x={HK_FX} y={y} rows={HK_FP} reveal={fp} from="top" dim={fpDim} cellW={70} />
    </>
  );
};

const hookPrints = (b: (id: "chase" | "enter" | "turn") => number, end: number): Print[] =>
  merge(
    flow(301, 0, b("chase"), { every: 0.2, buyP: 0.6, p: () => 34 }),
    flow(302, b("chase"), b("turn"), { every: 0.07, buyP: 0.9, hi: 80, big: 0.15, p: (s) => 34 + Math.round(lin(s, b("chase"), b("turn") - b("chase")) * 26) }),
    flow(303, b("turn"), end, { every: 0.06, buyP: 0.06, hi: 90, big: 0.25, p: (s) => 60 - Math.round(lin(s, b("turn"), 0.8) * 34) }),
  );

export const Hook: React.FC<SceneProps> = ({ shot }) => {
  const { t, b } = useFilm();
  const chaseGrow = prog(t, b("chase"), Math.max(0.4, b("enter") - b("chase") + 0.2));
  const entry = prog(t, b("enter"), 0.3);
  const turnGrow = prog(t, b("turn"), 0.6);
  const fp = prog(t, b("turn") + 0.3, 0.8);
  const { y, X } = HK;
  const prints = React.useMemo(() => hookPrints(b, shot.end + 0.5), [shot.end, b]);
  const cam = {
    rx: 10,
    ry: camSteps(t, -14, [[b("turn"), -8]]),
    s: camSteps(t, 1, [[b("enter"), 1.06], [b("turn"), 1.1]]),
    ox: X[iTurn],
    oy: y(HOOK_CHASE.c),
  };
  const ii = firstImb(HK_FP, -1);
  const last = turnGrow > 0 ? mix(HOOK_CHASE.c, HOOK_TURN.c, turnGrow) : mix(HOOK_CHASE.o, HOOK_CHASE.c, chaseGrow);
  return (
    <>
      <Stage cam={cam}>
        <HookChart chaseGrow={chaseGrow} turnGrow={turnGrow} entry={entry} fp={fp} />
        <Tag x={X[iChase] - 166} y={y(HOOK_CHASE.c)} text="追入" color={C.amber} o={entry * (1 - turnGrow)} align="r" />
        <Tag x={X[iChase] - 166} y={y(HOOK_CHASE.c)} text="被套" color={DNT} o={prog(t, b("notLuck"), 0.3)} align="r" />
        <Tag x={X[iChase] - 166} y={y(HOOK_CHASE.c) + 38} text={px(HOOK_CHASE.c)} color={C.amber} o={entry} align="r" size={24} mono />
        <Tag x={X[iChase]} y={1205 - 62} text={fmtD(HK_DELTA[iChase])} color={UPT} o={prog(t, b("enter") + 0.2, 0.3)} align="c" size={24} mono />
        <Tag x={X[iTurn] + 6} y={1205 + 66} text={fmtD(HK_DELTA[iTurn])} color={DNT} o={prog(t, b("turn") + 0.5, 0.3)} align="c" size={24} mono />
        <Tag x={X[iTurn]} y={y(HOOK_TURN.l) + 26} text={`−${(HOOK_TURN.o - HOOK_TURN.c).toFixed(1)}`} color={DNT} o={prog(t, b("turn") + 0.45, 0.3)} align="c" mono />
        <Tag x={HK_FX + 75} y={y(HOOK_TURN.h) - 30} text="卖 × 买" color={C.sub} o={fp} align="c" size={22} />
        {ii >= 0 ? <Tag x={HK_FX + 156} y={rowMid(y, HK_FP[ii])} text="失衡" color={DNT} o={prog(t, b("notLuck") + 0.2, 0.3)} size={24} /> : null}
      </Stage>
      <ChartFlow t={t} prints={prints} base={24610} last={px(last)} />
    </>
  );
};

export const Who: React.FC<SceneProps> = ({ shot }) => {
  const { t, b } = useFilm();
  const { y, X } = HK;
  const dim = prog(t, b("noK"), 0.4);
  const xU = prog(t, b("noK") + 0.1, 0.55);
  const xO = 1 - prog(t, b("think"), 0.35);
  const focus = prog(t, b("think"), 0.9);
  const tagsIn = (i: number) => prog(t, b("whoTrades") + i * 0.3, 0.3);
  const cam = {
    rx: camSteps(t, 10, [[b("think"), 4]]),
    ry: camSteps(t, -8, [[b("think"), -4]]),
    s: mix(1, 1.3, focus),
    ox: HK_FX + 75,
    oy: y((HOOK_TURN.h + HOOK_TURN.l) / 2),
    x: mix(0, 540 - (HK_FX + 75), focus),
    y: mix(0, 70, focus),
  };
  // three distinct rows: aggressive sells near the top, resting bids mid-bar, forced stops at the low
  const n = HK_FP.length;
  const iSell = n - 2;
  const iPoc = Math.floor(n / 2);
  const iLow = 0;
  const prints = React.useMemo(() => hookPrints(b, shot.end + 0.5).filter((p) => p.t > b("turn")), [shot.end, b]);
  return (
    <>
      <Stage cam={cam}>
        <HookChart chaseGrow={1} turnGrow={1} entry={1 - dim} dim={Math.max(dim, focus)} fp={1} fpDim={dim * (1 - focus)} />
        <Tag x={HK_FX - 10} y={rowMid(y, HK_FP[iSell])} text="主动" color={C.amber} o={tagsIn(0)} align="r" size={26} />
        <Tag x={HK_FX - 10} y={rowMid(y, HK_FP[iPoc])} text="被动" color={C.cyan} o={tagsIn(1)} align="r" size={26} />
        <Tag x={HK_FX - 10} y={rowMid(y, HK_FP[iLow])} text="被迫" color={STOPT} o={tagsIn(2)} align="r" size={26} />
        <Tag x={HK_FX + 75} y={y(HOOK_TURN.l) + 30} text="这根K线的成交" color={C.sub} o={focus} align="c" size={22} />
      </Stage>
      <BigX u={xU} cx={540} cy={720} r={220} color={C.amber} o={xO} />
      <ChartFlow t={t} prints={prints} base={24610 + 2900} last={px(HOOK_TURN.c)} />
    </>
  );
};

// ---------------- absorb ----------------
const AB = (() => {
  const r = range(ABSORB);
  const y = priceMap(r.min - 1.4, r.max + 1.4, 430, 900);
  const X = xs(ABSORB.length, 90, 640);
  return { y, X, r };
})();
const AB_LAST = ABSORB[ABSORB.length - 1];
const AB_FP = fpRows({ ...AB_LAST, h: AB.r.max, l: AB.r.min }, 6, 27, -0.6, 3.2);
const AB_DELTA = (() => {
  const r = mulberry32(28);
  return ABSORB.map(() => -Math.round(300 + r() * 700));
})();
export const Absorb: React.FC<SceneProps> = ({ shot }) => {
  const { t, b } = useFilm();
  const { y, X, r } = AB;
  const volU = (i: number) => prog(t, b("bigVol") + i * 0.09, 0.4);
  const band = prog(t, b("noMove"), 0.4);
  const hold = pulse(t, b("steady"), 0.5, 3);
  const vMax = Math.max(...ABSORB_VOL);
  const iMax = ABSORB_VOL.indexOf(vMax);
  const fp = prog(t, b("bigVol") + 0.6, 0.8);
  const FX = 690;
  const cam = { rx: 12, ry: camSteps(t, -12, [[b("noMove"), -6], [b("steady"), -9]]), s: camSteps(t, 1, [[b("hitAndHold"), 1.04]]) };
  const prints = React.useMemo(
    () =>
      merge(
        flow(401, shot.start, shot.end + 0.5, { every: 0.07, buyP: 0.22, hi: 90, big: 0.25, p: (s) => 12 + (Math.round(s * 3) % 3) }),
      ),
    [shot.start, shot.end],
  );
  const pocRow = AB_FP[pocIndex(AB_FP)];
  const sumD = AB_DELTA.reduce((s, d) => s + d, 0);
  return (
    <>
      <Stage cam={cam}>
        <PriceGrid x1={70} x2={1000} y1={430} y2={900} step={78} />
        {band > 0 ? (
          <div style={{ position: "absolute", left: 76, top: y(r.max) - 8, width: 600 * band, height: y(r.min) - y(r.max) + 16, background: alpha(C.cyan, 0.1 + 0.12 * hold), border: `2px solid ${alpha(C.cyan, 0.55 + 0.4 * hold)}`, borderRadius: 8, transform: "translateZ(-4px)" }} />
        ) : null}
        {ABSORB.map((k, i) => (
          <Candle3D key={i} k={k} x={X[i]} w={30} y={y} />
        ))}
        <HitStreamDown t={t} t0={b("hitAndHold")} t1={shot.end} xs={X.slice(2)} yTop={360} yEnd={y(r.max) - 10} />
        <Footprint x={FX} y={y} rows={AB_FP} reveal={fp} from="top" cellW={84} />
        <AxisTitle x={70} y={940} text="成交量" />
        <VolBars X={X} ks={ABSORB} vols={ABSORB_VOL} yBase={1080} hMax={120} w={34} grow={volU} hi={iMax} />
        <AxisTitle x={70} y={1110} text="Delta" />
        <DeltaBars X={X} deltas={AB_DELTA} y0={1130} hMax={110} w={30} grow={(i) => prog(t, b("noMove") + i * 0.06, 0.4)} />
        <Tag x={X[iMax]} y={1080 - 120 - 22} text={`${count(t, b("bigVol"), 0.8, 0, 32)}k 手`} color={C.amber} o={volU(iMax)} align="c" mono size={26} />
        <Tag x={FX + 85} y={y(r.max) - 32} text="卖 × 买" color={C.sub} o={fp} align="c" size={22} />
        <Tag x={FX + 186} y={rowMid(y, pocRow)} text="POC" color={C.amber} o={fp * prog(t, b("noMove"), 0.3)} mono size={26} />
        <Tag x={660} y={y(r.max) - 32} text="±2 跳" color={C.amber} o={band} align="r" mono size={26} />
        <Tag x={X[X.length - 1] + 40} y={1200} text={`Delta ${fmtD(sumD)}`} color={DNT} o={prog(t, b("noMove") + 0.6, 0.3)} mono size={26} />
        <Tag x={90} y={y(r.min) + 34} text="卖单砸 价不跌" color={C.amber} o={prog(t, b("hitAndHold"), 0.3)} size={26} />
        <Tag x={FX + 85} y={y(r.min) + 34} text="被动承接" color={C.cyan} o={prog(t, b("steady"), 0.3)} align="c" />
      </Stage>
      <ChartFlow t={t} prints={prints} base={41200} last={px(12.5)} />
    </>
  );
};

/** Sells hitting a level from above (vertical green pucks). */
const HitStreamDown: React.FC<{ t: number; t0: number; t1: number; xs: number[]; yTop: number; yEnd: number }> = ({ t, t0, t1, xs: X, yTop, yEnd }) => {
  if (t < t0) return null;
  const out: React.ReactNode[] = [];
  let i = 0;
  for (let s = t0; s < t1; s += 0.16, i++) {
    const u = (t - s) / 0.42;
    if (u <= 0 || u >= 1) continue;
    const x = X[i % X.length];
    const yy = mix(yTop, yEnd, u);
    out.push(
      <div key={i} style={{ position: "absolute", left: x - 12, top: yy - 30, width: 24, height: 30, transform: "translateZ(40px)", opacity: Math.min(1, u * 5, (1 - u) * 6) }}>
        <svg width={24} height={30} viewBox="0 0 24 30">
          <path d="M2 2 L12 28 L22 2 L12 10 Z" fill={DNT} />
        </svg>
      </div>,
    );
  }
  return <>{out}</>;
};

// ---------------- forced + cascade: one chart ----------------
const FB = (() => {
  const r = range(PRE_BREAK);
  const y = priceMap(KEY_LEVEL - 13.5, r.max + 1.5, 390, 1010);
  const X = xs(PRE_BREAK.length + 3, 80, 760);
  return { y, X };
})();
const lastPre = PRE_BREAK[PRE_BREAK.length - 1];
const BREAK1: Candle = { o: lastPre.c, h: lastPre.c + 0.4, l: KEY_LEVEL - 2.6, c: KEY_LEVEL - 2.2 };
const BREAK2: Candle = { o: BREAK1.c, h: BREAK1.c + 0.3, l: KEY_LEVEL - 12.4, c: KEY_LEVEL - 12 };
const FB_ALL = [...PRE_BREAK, BREAK1, BREAK2];
const FB_VOL = (() => {
  const v = seededVols(32, FB_ALL).map((x) => x * 1.4);
  v[PRE_BREAK.length] = 1900;
  v[PRE_BREAK.length + 1] = 4200;
  return v;
})();
const FB_DELTA = (() => {
  const d = seededDeltas(33, FB_ALL, 900);
  d[PRE_BREAK.length] = -1500;
  d[PRE_BREAK.length + 1] = -3900;
  return d;
})();
const FB_FP = fpRows(BREAK2, 10, 37, -0.95, 1.6);
const SX = 360; // stop chips sit under the level, left of the break bars
const STOPS = Array.from({ length: 12 }, (_, i) => ({ col: i % 4, row: Math.floor(i / 4) }));
const BYST = Array.from({ length: 8 }, (_, i) => ({ col: i % 4, row: Math.floor(i / 4) }));

const ForcedChart: React.FC<{ stopsIn: number; liqIn: number; fire: number; bystIn: number; bystFire: number; b1: number; b2: number; lvlBreak: number; fp: number }> = ({
  stopsIn,
  liqIn,
  fire,
  bystIn,
  bystFire,
  b1,
  b2,
  lvlBreak,
  fp,
}) => {
  const { y, X } = FB;
  const n = PRE_BREAK.length;
  const lvlY = y(KEY_LEVEL);
  const chip = (x: number, yy: number, f: number, o: number, edge: string, key: string) => (
    <div
      key={key}
      style={{
        position: "absolute",
        left: x,
        top: yy,
        width: 40,
        height: 28,
        borderRadius: 4,
        border: `2px ${f <= 0 ? "dashed" : "solid"} ${edge}`,
        background: f > 0 ? alpha(STOP, 0.35 + 0.6 * f) : "rgba(7,9,13,0.4)",
        boxShadow: f > 0.5 ? `0 0 16px ${alpha(STOP, 0.8)}` : undefined,
        transform: `translateZ(${12 + 60 * f}px) translateX(${f * 220}px) translateY(${f * 40}px)`,
        opacity: o * (1 - Math.max(0, f - 0.7) * 3.3),
      }}
    />
  );
  const grow = (i: number) => (i < n ? 1 : i === n ? b1 : b2);
  return (
    <>
      <PriceGrid x1={70} x2={1000} y1={400} y2={1010} step={76} />
      {PRE_BREAK.map((k, i) => (
        <Candle3D key={i} k={k} x={X[i]} w={26} y={y} />
      ))}
      <Candle3D k={BREAK1} x={X[n]} w={26} y={y} grow={b1} glow={b1 * 0.4} />
      <Candle3D k={BREAK2} x={X[n + 1]} w={26} y={y} grow={b2} glow={b2 * 0.6} />
      <LevelLine x1={76} x2={990} y={lvlY} color={lvlBreak > 0.5 ? DNT : C.cyan} />
      {STOPS.map((s, i) => {
        const f = Math.max(0, Math.min(1, fire * STOPS.length - i));
        const isLiq = s.row === 2;
        return chip(SX + s.col * 50, lvlY + 18 + s.row * 40, f, isLiq ? liqIn : stopsIn, isLiq ? C.amber : STOPT, `s${i}`);
      })}
      {BYST.map((s, i) => {
        const f = Math.max(0, Math.min(1, bystFire * BYST.length - i));
        return chip(SX + s.col * 50, lvlY + 150 + s.row * 40, f, bystIn, f > 0 ? STOPT : C.sub, `b${i}`);
      })}
      {fire > 0 && fire < 1.2
        ? Array.from({ length: 6 }, (_, i) => {
            const u = (fire * 1.6 - i * 0.12) % 1;
            if (u <= 0) return null;
            return <Hit key={i} x0={SX + 210} x1={X[n + 1] - 24} y={lvlY + 40 + i * 18 + u * 50} u={u} color={DNT} dir={1} />;
          })
        : null}
      <AxisTitle x={70} y={1040} text="成交量" />
      <VolBars X={X} ks={FB_ALL} vols={FB_VOL} yBase={1130} hMax={80} w={26} grow={grow} />
      <AxisTitle x={70} y={1156} text="Delta" />
      <DeltaBars X={X} deltas={FB_DELTA} y0={1200} hMax={56} w={26} grow={grow} />
      <Footprint x={X[n + 1] + 28} y={y} rows={FB_FP} reveal={fp} from="top" cellW={70} />
    </>
  );
};

export const Forced: React.FC<SceneProps> = ({ shot }) => {
  const { t, b } = useFilm();
  const { y } = FB;
  const stopsIn = prog(t, b("thirdGroup"), 0.6);
  const liqIn = prog(t, b("stopsName") + 0.5, 0.5);
  const cam = { rx: 12, ry: camSteps(t, -14, [[b("accel"), -8], [b("thirdGroup"), -14]]), s: camSteps(t, 1, [[b("thirdGroup"), 1.06]]), ox: 500, oy: y(KEY_LEVEL) };
  const prints = React.useMemo(() => flow(501, shot.start, shot.end + 0.5, { every: 0.3, buyP: 0.5, p: () => 22 }), [shot.start, shot.end]);
  return (
    <>
      <Stage cam={cam}>
        <ForcedChart stopsIn={stopsIn} liqIn={liqIn} fire={0} bystIn={0} bystFire={0} b1={0} b2={0} lvlBreak={0} fp={0} />
        <Tag x={76} y={y(KEY_LEVEL) - 26} text="关键位" color={C.cyan} o={prog(t, b("accel"), 0.3)} />
        <Tag x={950} y={y(KEY_LEVEL) - 26} text={px(KEY_LEVEL)} color={C.cyan} o={prog(t, b("accel") + 0.2, 0.3)} align="r" mono size={24} />
        <Tag x={SX + 4 * 50 + 4} y={y(KEY_LEVEL) + 18 + 34} text="止损单" color={STOPT} o={stopsIn} />
        <Tag x={SX + 4 * 50 + 4} y={y(KEY_LEVEL) + 18 + 80 + 14} text="强平线" color={C.amber} o={liqIn} />
        <Tag x={SX - 12} y={y(KEY_LEVEL) + 18 + 34} text={`${count(t, b("thirdGroup"), 0.8, 0, 860)} 手`} color={STOPT} o={stopsIn} align="r" mono size={24} />
        <Tag x={760} y={y(KEY_LEVEL) + 60} text="窄幅震荡" color={C.sub} o={win(t, b("accel"), b("thirdGroup"), 0.3)} align="c" size={26} />
      </Stage>
      <ChartFlow t={t} prints={prints} base={52300} last={px(lastPre.c)} />
    </>
  );
};

export const Cascade: React.FC<SceneProps> = ({ shot }) => {
  const { t, b } = useFilm();
  const { y, X } = FB;
  const n = PRE_BREAK.length;
  const b1 = prog(t, b("levelBreak"), 0.5);
  const fire = lin(t, b("triggered"), 1.3);
  const bystIn = prog(t, b("bystanders") - 0.3, 0.4);
  const bystFire = lin(t, b("bystanders") + 0.6, 1.2);
  const b2 = Math.max(prog(t, b("triggered") + 0.3, 1.0) * 0.35, mix(0.35, 1, prog(t, b("narrowFast"), 0.9)));
  const fp = prog(t, b("narrowFast") + 0.5, 1.0);
  const bp = win(t, b("bigPlayer") + 0.2, b("forcedOut") + 0.4, 0.3);
  const strike = prog(t, b("actually"), 0.4);
  const cam = {
    rx: 12,
    ry: camSteps(t, -14, [[b("levelBreak"), -10], [b("narrowFast"), -6]]),
    s: camSteps(t, 1.06, [[b("levelBreak"), 1.0], [b("narrowFast"), 0.96]]),
    ox: 560,
    oy: y(KEY_LEVEL),
  };
  const curLow = mix(y(BREAK2.o), y(BREAK2.c), b2);
  const prints = React.useMemo(
    () =>
      merge(
        flow(511, shot.start, b("triggered"), { every: 0.1, buyP: 0.1, p: () => 3 }),
        flow(512, b("triggered"), shot.end + 0.5, { every: 0.05, buyP: 0.03, hi: 90, big: 0.3, p: (s) => 2 - Math.round(lin(s, b("triggered"), 6) * 12) }),
      ),
    [shot.start, shot.end, b],
  );
  const stacked = FB_FP.filter((r) => imb(r) === -1).length;
  const fx = X[n + 1] + 28;
  return (
    <>
      <Stage cam={cam}>
        <ForcedChart stopsIn={1} liqIn={1} fire={fire} bystIn={bystIn} bystFire={bystFire} b1={b1} b2={b2 > 0.01 ? b2 : 0} lvlBreak={b1} fp={fp} />
        <Tag x={76} y={y(KEY_LEVEL) - 26} text="关键位" color={DNT} o={prog(t, shot.start + 0.36, 0.2)} />
        <Tag x={X[n] + 30} y={y(KEY_LEVEL) - 30} text="破位" color={DNT} o={prog(t, b("levelBreak") + 0.4, 0.3) * (1 - fp)} />
        <Tag x={SX + 4 * 50 + 4} y={y(KEY_LEVEL) + 18 + 34} text="触发" color={STOPT} o={win(t, b("triggered") + 0.2, b("narrowFast"), 0.3)} />
        <Tag x={SX + 4 * 50 + 4} y={y(KEY_LEVEL) + 150 + 20} text={bystFire > 0 ? "被迫" : "观望"} color={bystFire > 0 ? STOPT : C.sub} o={bystIn * (1 - prog(t, b("narrowFast"), 0.3))} />
        <Tag x={X[n + 1] - 22} y={curLow + 4} text={`−${count(t, b("narrowFast"), 0.9, 12, 48)} 跳`} color={DNT} o={prog(t, b("narrowFast"), 0.3)} align="r" mono />
        <Tag x={X[n + 1] - 210} y={y(BREAK2.o) + 120} text="主力?" color={strike > 0 ? C.sub : C.amber} o={bp} />
        {strike > 0 ? <div style={{ position: "absolute", left: X[n + 1] - 214, top: y(BREAK2.o) + 118, width: 96 * strike, height: 4, background: C.sub, opacity: bp, transform: "translateZ(31px)" }} /> : null}
        <Tag x={fx + 71} y={y(BREAK2.o) - 30} text="卖 × 买" color={C.sub} o={fp} align="c" size={22} />
        <Tag x={fx + 71} y={y(BREAK2.l) + 30} text={`连续失衡 ×${stacked}`} color={DNT} o={prog(t, b("forcedOut"), 0.3)} align="c" size={26} />
        <Tag x={X[n + 1]} y={1200 + 74} text={fmtD(FB_DELTA[n + 1])} color={DNT} o={prog(t, b("narrowFast") + 0.6, 0.3)} align="c" size={24} mono />
        <Tag x={SX + 100} y={y(KEY_LEVEL) + 270} text="连环止损" color={STOPT} o={prog(t, b("forcedOut") + 0.4, 0.3)} align="c" />
      </Stage>
      <ChartFlow t={t} prints={prints} base={53900} last={px(mix(BREAK2.o, BREAK2.c, b2))} />
    </>
  );
};

// ---------------- accept: two endings side by side ----------------
const AC = { y: priceMap(-4, 9, 560, 990) };
const accLast = ACC_BASE[ACC_BASE.length - 1].c;
const BRK: Candle = { o: accLast, h: ACC_LEVEL + 2.4, l: accLast - 0.2, c: ACC_LEVEL + 2.1 };
const A_FOLLOW: Candle[] = [
  { o: BRK.c, h: BRK.c + 2.0, l: BRK.c - 0.2, c: BRK.c + 1.8 },
  { o: BRK.c + 1.8, h: BRK.c + 2.0, l: ACC_LEVEL + 0.15, c: ACC_LEVEL + 0.9 }, // pullback holds
  { o: ACC_LEVEL + 0.9, h: ACC_LEVEL + 5.6, l: ACC_LEVEL + 0.7, c: ACC_LEVEL + 5.3 },
];
const B_FAIL: Candle[] = [
  { o: BRK.c, h: BRK.c + 2.4, l: BRK.c - 0.3, c: BRK.c + 0.2 }, // nobody follows: long upper wick
  { o: BRK.c + 0.2, h: BRK.c + 0.4, l: ACC_LEVEL - 4.2, c: ACC_LEVEL - 3.8 }, // snaps back
];
const A_ALL = [...ACC_BASE, BRK, ...A_FOLLOW];
const B_ALL = [...ACC_BASE, BRK, ...B_FAIL];
const A_VOL = [...seededVols(42, ACC_BASE).map((v) => v * 0.7), 1900, 1700, 520, 1500];
const B_VOL = [...seededVols(42, ACC_BASE).map((v) => v * 0.7), 1900, 640, 1800];

const Panel: React.FC<{ x0: number; x1: number; o: number; title: string; titleColor: string; children: React.ReactNode }> = ({ x0, x1, o, title, titleColor, children }) => (
  <div style={{ position: "absolute", left: 0, top: 0, opacity: o, transformStyle: "preserve-3d" }}>
    <div style={{ position: "absolute", left: x0, top: 470, width: x1 - x0, height: 790, borderRadius: 14, background: "rgba(11,18,32,0.7)", border: `1px solid ${C.border}`, transform: "translateZ(-24px)" }} />
    <Tag x={x0 + 22} y={506} text={title} color={titleColor} size={28} />
    {children}
  </div>
);

export const Accept: React.FC<SceneProps> = ({ shot }) => {
  const { t, b } = useFilm();
  const { y } = AC;
  const XA = xs(ACC_BASE.length + 4, 96, 524);
  const XB = xs(ACC_BASE.length + 4, 556, 984);
  const inP = prog(t, b("lastStep"), 0.5);
  const brk = prog(t, b("newPrice"), 0.6);
  const a = [prog(t, b("pushUp"), 0.5), prog(t, b("pullback"), 0.5), prog(t, b("holds") - 0.2, 0.5)];
  const bF = [prog(t, b("noFollow"), 0.6), prog(t, b("snapBack"), 0.5)];
  const focusB = prog(t, b("noFollow") - 0.2, 0.6);
  const aDone = prog(t, b("holds"), 0.4);
  const bDone = prog(t, b("rejected"), 0.4);
  const n = ACC_BASE.length;
  const cam = { rx: 10, ry: mix(9, -9, focusB), s: camSteps(t, 1, [[b("pushUp"), 1.03]]), ox: mix(310, 770, focusB) };
  const lvlY = y(ACC_LEVEL);
  const growA = (i: number) => (i < n ? 1 : i === n ? brk : a[i - n - 1]);
  const growB = (i: number) => (i < n ? 1 : i === n ? brk : bF[i - n - 1]);
  const prints = React.useMemo(
    () =>
      merge(
        flow(601, shot.start, b("noFollow"), { every: 0.1, buyP: 0.75, p: (s) => 20 + Math.round(lin(s, b("newPrice"), 6) * 10) }),
        flow(602, b("noFollow"), shot.end + 0.5, { every: 0.08, buyP: 0.15, hi: 80, big: 0.15, p: (s) => 28 - Math.round(lin(s, b("noFollow"), 3) * 14) }),
      ),
    [shot.start, shot.end, b],
  );
  const VB = 1110; // volume baseline
  return (
    <>
      <Stage cam={cam} o={inP}>
        <Panel x0={80} x1={540} o={1 - focusB * 0.35} title="A 接受" titleColor={aDone > 0 ? UPT : C.sub}>
          {A_ALL.map((k, i) => (
            <Candle3D key={i} k={k} x={XA[i]} w={22} y={y} grow={growA(i)} glow={i === A_ALL.length - 1 ? a[2] * 0.4 : 0} />
          ))}
          <LevelLine x1={96} x2={524} y={lvlY} color={aDone > 0.5 ? UPT : C.cyan} />
          <VolBars X={XA} ks={A_ALL} vols={A_VOL} yBase={VB} hMax={90} w={22} grow={growA} />
          <Tag x={96} y={lvlY + 30} text="站稳" color={UPT} o={aDone} />
          <Tag x={XA[n + 1]} y={VB - 90 - 22} text="放量跟进" color={UPT} o={prog(t, b("follow"), 0.3)} align="c" size={24} />
          <Tag x={XA[n + 2]} y={VB + 30} text="回踩缩量" color={C.cyan} o={prog(t, b("pullback") + 0.3, 0.3)} align="c" size={24} />
          <Tag x={XA[n + 2] + 14} y={y(A_FOLLOW[1].l) + 26} text="有人接" color={C.cyan} o={prog(t, b("pullback") + 0.5, 0.3)} align="l" size={24} />
        </Panel>
        <Panel x0={540} x1={1000} o={mix(0.45, 1, focusB)} title="B 不认可" titleColor={bDone > 0 ? DNT : C.sub}>
          {B_ALL.map((k, i) => (
            <Candle3D key={i} k={k} x={XB[i]} w={22} y={y} grow={growB(i)} glow={i === B_ALL.length - 1 ? bF[1] * 0.5 : 0} />
          ))}
          <LevelLine x1={556} x2={984} y={lvlY} color={bDone > 0.5 ? DNT : C.cyan} />
          <VolBars X={XB} ks={B_ALL} vols={B_VOL} yBase={VB} hMax={90} w={22} grow={growB} />
          <Tag x={XB[n + 1]} y={y(B_FAIL[0].h) - 26} text="没人跟" color={C.amber} o={prog(t, b("noFollow") + 0.5, 0.3)} align="c" size={24} />
          <Tag x={XB[n + 2] - 22} y={y(B_FAIL[1].c) - 10} text="收回" color={DNT} o={bDone} align="r" />
          <Tag x={XB[n + 1]} y={VB + 30} text="缩量" color={C.amber} o={prog(t, b("noFollow") + 0.7, 0.3)} align="c" size={24} />
        </Panel>
        <Tag x={XA[n] - 16} y={y(BRK.h) - 28} text="新价" color={C.amber} o={win(t, b("newPrice") + 0.4, b("pushUp"), 0.3)} align="c" />
        <Tag x={XB[n] - 16} y={y(BRK.h) - 28} text="新价" color={C.amber} o={win(t, b("newPrice") + 0.4, b("pushUp"), 0.3)} align="c" />
        <Tag x={540} y={1200} text={px(ACC_LEVEL)} color={C.cyan} o={win(t, b("lastStep") + 0.4, b("pushUp"), 0.3)} align="c" mono size={24} />
      </Stage>
      <ChartFlow t={t} prints={prints} base={61800} last={px(focusB > 0.5 ? mix(BRK.c, B_FAIL[1].c, bF[1]) : mix(BRK.o, BRK.c, brk))} />
    </>
  );
};
