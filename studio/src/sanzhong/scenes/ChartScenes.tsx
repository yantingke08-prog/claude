// Chart shots: hook, who, absorb, forced, cascade, accept.
import React from "react";
import { camSteps, count, keys, lin, mix, prog, pulse, win } from "../anim";
import { useFilm } from "../ctx";
import { BigX, Box, Candle3D, Hit, LevelLine, PriceGrid, Stage, Tag, alpha, priceMap, type Candle } from "../kit";
import { ABSORB, ABSORB_VOL, ACC_BASE, ACC_LEVEL, HOOK_ALL, HOOK_BASE, HOOK_CHASE, HOOK_TURN, KEY_LEVEL, PRE_BREAK, range } from "../market";
import { mulberry32 } from "../../lib/rng";
import { C } from "../theme";
import type { SceneProps } from "./parts";

const xs = (n: number, x0: number, x1: number) => Array.from({ length: n }, (_, i) => x0 + ((x1 - x0) * (i + 0.5)) / n);

// ---------------- hook + who share one chart ----------------
const HK = (() => {
  const r = range(HOOK_ALL);
  const y = priceMap(r.min - 1.5, r.max + 1.2, 400, 1250);
  const X = xs(HOOK_ALL.length, 110, 930);
  return { y, X, w: 30 };
})();
const iChase = HOOK_BASE.length;
const iTurn = iChase + 1;

const HookChart: React.FC<{ t: number; chaseGrow: number; turnGrow: number; entry: number; dim?: number; split?: number }> = ({ t, chaseGrow, turnGrow, entry, dim = 0, split = 0 }) => {
  const { y, X, w } = HK;
  const turned = turnGrow > 0.15;
  return (
    <>
      <PriceGrid x1={80} x2={1000} y1={420} y2={1240} step={82} o={1 - dim * 0.5} />
      {HOOK_BASE.map((k, i) => (
        <Candle3D key={i} k={k} x={X[i]} w={w} y={y} o={1 - dim * 0.7} />
      ))}
      <Candle3D k={HOOK_CHASE} x={X[iChase]} w={w} y={y} grow={chaseGrow} o={1 - dim * 0.7} glow={chaseGrow * (1 - turnGrow) * 0.6} />
      <Candle3D k={HOOK_TURN} x={X[iTurn]} w={w} y={y} grow={turnGrow} o={(1 - dim * 0.4) * (1 - split)} glow={turnGrow * 0.5} />
      <LevelLine x1={X[iChase] - 160} x2={X[iTurn] + 26} y={y(HOOK_CHASE.c)} color={turned ? C.redText : C.amber} o={entry * (1 - dim * 0.6)} dash />
    </>
  );
};

export const Hook: React.FC<SceneProps> = () => {
  const { t, b } = useFilm();
  const chaseGrow = prog(t, b("chase"), Math.max(0.4, b("enter") - b("chase") + 0.2));
  const entry = prog(t, b("enter"), 0.3);
  const turnGrow = prog(t, b("turn"), 0.6);
  const { y, X } = HK;
  const cam = {
    rx: 10,
    ry: camSteps(t, -14, [[b("turn"), -8]]),
    s: camSteps(t, 1, [[b("enter"), 1.1], [b("turn"), 1.2]]),
    ox: X[iTurn] - 60,
    oy: y(HOOK_CHASE.c),
  };
  return (
    <Stage cam={cam}>
      <HookChart t={t} chaseGrow={chaseGrow} turnGrow={turnGrow} entry={entry} />
      <Tag x={X[iChase] - 176} y={y(HOOK_CHASE.c)} text="追入" color={C.amber} o={entry * (1 - turnGrow)} align="r" />
      <Tag x={X[iTurn]} y={y(HOOK_TURN.l) + 30} text={`−${(HOOK_TURN.o - HOOK_TURN.c).toFixed(1)}`} color={C.redText} o={prog(t, b("turn") + 0.45, 0.3)} align="c" mono />
      <Tag x={X[iChase] - 176} y={y(HOOK_CHASE.c)} text="被套" color={C.redText} o={prog(t, b("notLuck"), 0.3)} align="r" />
    </Stage>
  );
};

const SPLIT_COLORS = [C.amber, C.cyan, C.red];
export const Who: React.FC<SceneProps> = () => {
  const { t, b } = useFilm();
  const { y, X } = HK;
  const dim = prog(t, b("noK"), 0.4);
  const xU = prog(t, b("noK") + 0.1, 0.55);
  const xO = 1 - prog(t, b("think"), 0.35);
  const split = prog(t, b("whoTrades"), 0.7);
  const cam = {
    rx: camSteps(t, 10, [[b("think"), 6]]),
    ry: camSteps(t, -8, [[b("think"), -18]]),
    s: camSteps(t, 1.2, [[b("noK"), 1], [b("think"), 1.9]], 0.9),
    ox: X[iTurn],
    oy: y((HOOK_TURN.o + HOOK_TURN.c) / 2),
    x: camSteps(t, 0, [[b("think"), 540 - X[iTurn]]], 0.9),
  };
  // the red bar breaks into its fills: three colours = three kinds of trade
  const r = mulberry32(77);
  const top = y(HOOK_TURN.o);
  const bot = y(HOOK_TURN.c);
  const bricks = Array.from({ length: 18 }, (_, i) => {
    const col = i % 3;
    const row = Math.floor(i / 3);
    const by = top + ((bot - top) * (row + 0.5)) / 6;
    const spread = 1 + split * 1.4;
    return {
      x: X[iTurn] + (col - 1) * 26 * spread - 11,
      y: mix(by, top + (bot - top) * 0.5 + (row - 2.5) * 34 * (0.6 + split * 0.6), split) - 9,
      z: split * (r() - 0.5) * 140,
      c: SPLIT_COLORS[(i + row) % 3],
    };
  });
  return (
    <>
      <Stage cam={cam}>
        <HookChart t={t} chaseGrow={1} turnGrow={1} entry={1 - dim} dim={dim * (1 - split * 0.3)} split={split} />
        {split > 0
          ? bricks.map((k, i) => <Box key={i} x={k.x} y={k.y} w={22} h={18} d={16} z0={k.z} color={k.c} o={split} glow={0.4} />)
          : null}
        <Tag x={X[iTurn] - 26 * 2.4 - 14} y={y(HOOK_TURN.o) + 6} text="?" color={C.amber} o={prog(t, b("whoTrades") + 0.4, 0.3)} size={44} align="r" />
      </Stage>
      <BigX u={xU} cx={540} cy={820} r={230} color={C.redText} o={xO} />
    </>
  );
};

// ---------------- absorb ----------------
const AB = (() => {
  const r = range(ABSORB);
  const y = priceMap(r.min - 1.6, r.max + 1.6, 440, 980);
  const X = xs(ABSORB.length, 120, 900);
  return { y, X, r };
})();
export const Absorb: React.FC<SceneProps> = ({ shot }) => {
  const { t, b } = useFilm();
  const { y, X, r } = AB;
  const volU = (i: number) => prog(t, b("bigVol") + i * 0.09, 0.4);
  const band = prog(t, b("noMove"), 0.4);
  const hold = pulse(t, b("steady"), 0.5, 3);
  const vMax = Math.max(...ABSORB_VOL);
  const iMax = ABSORB_VOL.indexOf(vMax);
  const vy = (v: number) => 1290 - (v / vMax) * 230;
  const cam = { rx: 14, ry: camSteps(t, -14, [[b("noMove"), -6], [b("steady"), -10]]), s: camSteps(t, 1, [[b("hitAndHold"), 1.05]]) };
  return (
    <Stage cam={cam}>
      <PriceGrid x1={90} x2={960} y1={420} y2={1300} step={88} />
      {band > 0 ? (
        <div style={{ position: "absolute", left: 96, top: y(r.max) - 8, width: 840 * band, height: y(r.min) - y(r.max) + 16, background: alpha(C.cyan, 0.1 + 0.12 * hold), border: `2px solid ${alpha(C.cyan, 0.55 + 0.4 * hold)}`, borderRadius: 8, transform: "translateZ(-4px)" }} />
      ) : null}
      {ABSORB.map((k, i) => (
        <Candle3D key={i} k={k} x={X[i]} w={34} y={y} />
      ))}
      {ABSORB_VOL.map((v, i) => {
        const h = (v / vMax) * 230 * volU(i);
        return <Box key={i} x={X[i] - 20} y={1290 - h} w={40} h={h} d={22} color={i === iMax ? C.amber : "#4A5A73"} o={volU(i) > 0 ? 1 : 0} />;
      })}
      <HitStreamDown t={t} t0={b("hitAndHold")} t1={shot.end} xs={X.slice(2)} yTop={360} yEnd={y(r.max) - 10} />
      <Tag x={X[iMax]} y={vy(vMax) * 1 - 26} text={`${count(t, b("bigVol"), 0.8, 0, 32)}k 手`} color={C.amber} o={volU(iMax)} align="c" mono />
      <Tag x={930} y={y(r.max) - 34} text="±2 跳" color={C.amber} o={band} align="r" mono />
      <Tag x={86} y={y(r.min) + 30} text="承接" color={C.cyan} o={prog(t, b("steady"), 0.3)} />
    </Stage>
  );
};

/** Sells hitting a level from above (vertical pucks). */
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
          <path d="M2 2 L12 28 L22 2 L12 10 Z" fill={C.redText} />
        </svg>
      </div>,
    );
  }
  return <>{out}</>;
};

// ---------------- forced + cascade: one chart ----------------
const FB = (() => {
  const lo = KEY_LEVEL - 15;
  const r = range(PRE_BREAK);
  const y = priceMap(lo, r.max + 2, 380, 1290);
  const X = xs(PRE_BREAK.length + 3, 110, 930);
  return { y, X };
})();
const lastPre = PRE_BREAK[PRE_BREAK.length - 1];
const BREAK1: Candle = { o: lastPre.c, h: lastPre.c + 0.4, l: KEY_LEVEL - 2.6, c: KEY_LEVEL - 2.2 };
const BREAK2: Candle = { o: BREAK1.c, h: BREAK1.c + 0.3, l: KEY_LEVEL - 12.4, c: KEY_LEVEL - 12 };
// pending stops: a block grid just under the key level, bystanders further down
const SX = 380; // stop chips sit left of the break bars
const STOPS = Array.from({ length: 12 }, (_, i) => ({ col: i % 4, row: Math.floor(i / 4) }));
const BYST = Array.from({ length: 8 }, (_, i) => ({ col: i % 4, row: Math.floor(i / 4) }));

const ForcedChart: React.FC<{ t: number; stopsIn: number; liqIn: number; fire: number; bystIn: number; bystFire: number; b1: number; b2: number; lvlBreak: number }> = ({
  t,
  stopsIn,
  liqIn,
  fire,
  bystIn,
  bystFire,
  b1,
  b2,
  lvlBreak,
}) => {
  const { y, X } = FB;
  const n = PRE_BREAK.length;
  const sx = SX;
  const lvlY = y(KEY_LEVEL);
  const chip = (x: number, yy: number, f: number, o: number, solid: string, key: string, dashed = true) => (
    <div
      key={key}
      style={{
        position: "absolute",
        left: x,
        top: yy,
        width: 40,
        height: 30,
        borderRadius: 4,
        border: `2px ${dashed && f <= 0 ? "dashed" : "solid"} ${solid}`,
        background: f > 0 ? alpha(C.red, 0.35 + 0.6 * f) : "rgba(7,9,13,0.4)",
        boxShadow: f > 0.5 ? `0 0 16px ${alpha(C.red, 0.8)}` : undefined,
        transform: `translateZ(${12 + 60 * f}px) translateX(${f * 200}px) translateY(${f * 40}px)`,
        opacity: o * (1 - Math.max(0, f - 0.7) * 3.3),
      }}
    />
  );
  return (
    <>
      <PriceGrid x1={80} x2={1000} y1={400} y2={1290} step={89} />
      {PRE_BREAK.map((k, i) => (
        <Candle3D key={i} k={k} x={X[i]} w={30} y={y} />
      ))}
      <Candle3D k={BREAK1} x={X[n]} w={30} y={y} grow={b1} glow={b1 * 0.4} />
      <Candle3D k={BREAK2} x={X[n + 1]} w={30} y={y} grow={b2} glow={b2 * 0.6} />
      <LevelLine x1={90} x2={990} y={lvlY} color={lvlBreak > 0.5 ? C.redText : C.cyan} />
      {STOPS.map((s, i) => {
        const f = Math.max(0, Math.min(1, fire * STOPS.length - i));
        const isLiq = s.row === 2;
        return chip(sx + s.col * 52, lvlY + 18 + s.row * 42, f, isLiq ? liqIn : stopsIn, isLiq ? C.amber : C.redText, `s${i}`);
      })}
      {BYST.map((s, i) => {
        const f = Math.max(0, Math.min(1, bystFire * BYST.length - i));
        return chip(sx + s.col * 52, lvlY + 170 + s.row * 42, f, bystIn, f > 0 ? C.redText : C.sub, `b${i}`, true);
      })}
      {/* fired orders stream into the falling bar */}
      {fire > 0 && fire < 1.2
        ? Array.from({ length: 6 }, (_, i) => {
            const u = (fire * 1.6 - i * 0.12) % 1;
            if (u <= 0) return null;
            return <Hit key={i} x0={sx + 220} x1={X[n + 1] - 30} y={lvlY + 40 + i * 20 + u * 60} u={u} color={C.redText} dir={1} />;
          })
        : null}
    </>
  );
};

export const Forced: React.FC<SceneProps> = () => {
  const { t, b } = useFilm();
  const { y } = FB;
  const stopsIn = prog(t, b("thirdGroup"), 0.6);
  const liqIn = prog(t, b("stopsName") + 0.5, 0.5);
  const cam = { rx: 12, ry: camSteps(t, -14, [[b("accel"), -8], [b("thirdGroup"), -16]]), s: camSteps(t, 1, [[b("thirdGroup"), 1.08]]), ox: 600, oy: y(KEY_LEVEL) };
  return (
    <Stage cam={cam}>
      <ForcedChart t={t} stopsIn={stopsIn} liqIn={liqIn} fire={0} bystIn={0} bystFire={0} b1={0} b2={0} lvlBreak={0} />
      <Tag x={86} y={y(KEY_LEVEL) - 26} text="关键位" color={C.cyan} o={prog(t, b("accel"), 0.3)} />
      <Tag x={SX + 4 * 52 + 4} y={y(KEY_LEVEL) + 18 + 36} text="止损" color={C.redText} o={stopsIn} />
      <Tag x={SX + 4 * 52 + 4} y={y(KEY_LEVEL) + 18 + 84 + 15} text="强平" color={C.amber} o={liqIn} />
    </Stage>
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
  const bp = win(t, b("bigPlayer") + 0.2, b("forcedOut") + 0.4, 0.3);
  const strike = prog(t, b("actually"), 0.4);
  const cam = {
    rx: 12,
    ry: camSteps(t, -16, [[b("levelBreak"), -10], [b("narrowFast"), -6]]),
    s: camSteps(t, 1.08, [[b("levelBreak"), 1.0], [b("narrowFast"), 0.94]]),
    ox: 600,
    oy: y(KEY_LEVEL),
    y: camSteps(t, 0, [[b("narrowFast"), -60]]),
  };
  const lowY = y(BREAK1.o + (BREAK2.c - BREAK1.o) * 1) ;
  const curLow = mix(y(BREAK2.o), y(BREAK2.c), b2);
  return (
    <Stage cam={cam}>
      <ForcedChart t={t} stopsIn={1} liqIn={1} fire={fire} bystIn={bystIn} bystFire={bystFire} b1={b1} b2={b2 > 0.01 ? b2 : 0} lvlBreak={b1} />
      <Tag x={86} y={y(KEY_LEVEL) - 26} text="关键位" color={C.redText} o={prog(t, shot.start + 0.36, 0.2)} />
      <Tag x={SX + 4 * 52 + 4} y={y(KEY_LEVEL) + 170 + 20} text="观望" color={C.sub} o={bystIn * (1 - bystFire)} />
      <Tag x={X[n + 1] + 30} y={curLow + 4} text={`−${count(t, b("narrowFast"), 0.9, 12, 48)} 跳`} color={C.redText} o={prog(t, b("narrowFast"), 0.3)} mono />
      <div style={{ position: "absolute", left: X[n + 1] - 210, top: y(BREAK2.o) + 120, transform: "translateZ(30px)" }}>
        <Tag x={0} y={0} text="主力?" color={strike > 0 ? C.sub : C.amber} o={bp} />
        {strike > 0 ? <div style={{ position: "absolute", left: -4, top: -3, width: 100 * strike, height: 4, background: C.sub, opacity: bp, transform: "translateZ(31px)" }} /> : null}
      </div>
      <Tag x={X[n + 1] - 30} y={lowY + 40} text="连环止损" color={C.redText} o={prog(t, b("forcedOut") + 0.4, 0.3)} align="r" />
    </Stage>
  );
};

// ---------------- accept: two endings side by side ----------------
const AC = (() => {
  const y = priceMap(-4, 9, 560, 1180);
  return { y };
})();
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

const Panel: React.FC<{ x0: number; x1: number; o: number; title: string; titleColor: string; children: React.ReactNode }> = ({ x0, x1, o, title, titleColor, children }) => (
  <div style={{ position: "absolute", left: 0, top: 0, opacity: o, transformStyle: "preserve-3d" }}>
    <div style={{ position: "absolute", left: x0, top: 470, width: x1 - x0, height: 760, borderRadius: 14, background: "rgba(11,18,32,0.7)", border: `1px solid ${C.border}`, transform: "translateZ(-24px)" }} />
    <Tag x={x0 + 22} y={506} text={title} color={titleColor} size={28} />
    {children}
  </div>
);

export const Accept: React.FC<SceneProps> = () => {
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
  const cam = {
    rx: 10,
    ry: mix(10, -10, focusB),
    s: camSteps(t, 1, [[b("pushUp"), 1.04]]),
    ox: mix(310, 770, focusB),
  };
  const lvlY = y(ACC_LEVEL);
  return (
    <Stage cam={cam} o={inP}>
      <Panel x0={80} x1={540} o={1 - focusB * 0.35} title="A" titleColor={aDone > 0 ? C.greenText : C.sub}>
        {ACC_BASE.map((k, i) => (
          <Candle3D key={i} k={k} x={XA[i]} w={24} y={y} />
        ))}
        <Candle3D k={BRK} x={XA[n]} w={24} y={y} grow={brk} />
        {A_FOLLOW.map((k, i) => (
          <Candle3D key={i} k={k} x={XA[n + 1 + i]} w={24} y={y} grow={a[i]} glow={i === 2 ? a[2] * 0.4 : 0} />
        ))}
        <LevelLine x1={96} x2={524} y={lvlY} color={aDone > 0.5 ? C.greenText : C.cyan} />
        <Tag x={96} y={lvlY + 30} text="站稳" color={C.greenText} o={aDone} />
      </Panel>
      <Panel x0={540} x1={1000} o={mix(0.45, 1, focusB)} title="B" titleColor={bDone > 0 ? C.redText : C.sub}>
        {ACC_BASE.map((k, i) => (
          <Candle3D key={i} k={k} x={XB[i]} w={24} y={y} />
        ))}
        <Candle3D k={BRK} x={XB[n]} w={24} y={y} grow={brk} />
        {B_FAIL.map((k, i) => (
          <Candle3D key={i} k={k} x={XB[n + 1 + i]} w={24} y={y} grow={bF[i]} glow={i === 1 ? bF[1] * 0.5 : 0} />
        ))}
        <LevelLine x1={556} x2={984} y={lvlY} color={bDone > 0.5 ? C.redText : C.cyan} />
        <Tag x={XB[n + 2] - 22} y={y(B_FAIL[1].c) - 10} text="收回" color={C.redText} o={bDone} align="r" />
      </Panel>
      <Tag x={XA[n] - 18} y={y(BRK.h) - 28} text="新价" color={C.amber} o={win(t, b("newPrice") + 0.4, b("pushUp"), 0.3)} align="c" />
      <Tag x={XB[n] - 18} y={y(BRK.h) - 28} text="新价" color={C.amber} o={win(t, b("newPrice") + 0.4, b("pushUp"), 0.3)} align="c" />
    </Stage>
  );
};
