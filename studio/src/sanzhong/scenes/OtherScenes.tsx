// tug, poll, sum, print, next.
import React from "react";
import { AbsoluteFill, Img } from "remotion";
import { camSteps, count, keys, mix, prog, pulse, win } from "../anim";
import { useFilm } from "../ctx";
import { Box, LOGO, Stage, Tag, alpha, fmtPrice } from "../kit";
import { PROFILE } from "../market";
import { mulberry32 } from "../../lib/rng";
import { C, FONT, L, MONO, T, W } from "../theme";
import type { SceneProps } from "./parts";

// ---------------- tug: three forces on one price ----------------
const tickY = (i: number) => 1240 - i * 78;
const Arrow: React.FC<{ x: number; y: number; len: number; dir: 1 | -1; color: string; o: number; s?: number }> = ({ x, y, len, dir, color, o, s = 1 }) => {
  if (o <= 0) return null;
  const w = 70 * s;
  const L2 = len * s;
  return (
    <svg width={w + 20} height={L2 + 20} style={{ position: "absolute", left: x - w / 2 - 10, top: dir === -1 ? y - 10 : y - L2 - 10, opacity: o, transform: "translateZ(24px)", overflow: "visible" }}>
      {dir === 1 ? (
        <path d={`M${10 + w * 0.3} ${10 + L2} V${10 + w * 0.6} H${10} L${10 + w / 2} ${10} L${10 + w} ${10 + w * 0.6} H${10 + w * 0.7} V${10 + L2} Z`} fill={alpha(color, 0.9)} />
      ) : (
        <path d={`M${10 + w * 0.3} ${10} V${10 + L2 - w * 0.6} H${10} L${10 + w / 2} ${10 + L2} L${10 + w} ${10 + L2 - w * 0.6} H${10 + w * 0.7} V${10} Z`} fill={alpha(color, 0.9)} />
      )}
    </svg>
  );
};
export const Tug: React.FC<SceneProps> = ({ shot }) => {
  const { t, b } = useFilm();
  const jump = prog(t, b("nextTick") + 0.4, 0.3);
  const p = 5 + jump;
  const puckY = mix(tickY(5), tickY(6), jump);
  const f = prog(t, b("forces"), 0.5);
  const jig = Math.sin((t - b("forces")) * 9) * 10 * f * (1 - prog(t, b("result"), 0.4));
  const cam = { rx: 8, ry: keys(t, [[shot.start, -14], [shot.end, 10]]), s: 1 };
  return (
    <Stage cam={cam}>
      <div style={{ position: "absolute", left: 539, top: tickY(10), width: 2, height: tickY(0) - tickY(10), background: "rgba(145,160,181,0.35)" }} />
      {Array.from({ length: 11 }, (_, i) => (
        <React.Fragment key={i}>
          <div style={{ position: "absolute", left: 528, top: tickY(i) - 1, width: 24, height: 2, background: "rgba(145,160,181,0.5)" }} />
          <div style={{ position: "absolute", left: 360, top: tickY(i) - 16, width: 150, textAlign: "right", fontFamily: MONO, fontSize: T.xs, color: Math.round(p) === i ? C.amber : C.sub }}>
            {fmtPrice(i)}
          </div>
        </React.Fragment>
      ))}
      {/* resting orders above: a slab */}
      <Box x={580} y={tickY(7) - 14} w={300} h={28} d={60} color={C.cyan} o={f} glow={0.4 * f} />
      {/* price puck */}
      <Box x={565} y={puckY - 24 + jig * 0.3} w={48} h={48} d={48} color={C.amber} glow={0.6} />
      <Arrow x={330} y={tickY(2)} len={mix(120, 260, f) + jig} dir={1} color={C.amber} o={f} />
      <Arrow x={760} y={tickY(7) - 26 - (mix(120, 200, f) - jig)} len={mix(120, 200, f) - jig} dir={-1} color={C.red} o={f} />
      <Tag x={622} y={puckY} text="+1 跳" color={C.amber} o={prog(t, b("nextTick") + 0.6, 0.3)} mono />
      <Tag x={330} y={tickY(2) + 30} text="追价" color={C.amber} o={f} align="c" />
      <Tag x={894} y={tickY(7)} text="挂单" color={C.cyan} o={f} />
      <Tag x={760} y={tickY(7) - 26 - 200 - 30} text="被迫" color={C.redText} o={f} align="c" />
    </Stage>
  );
};

// ---------------- poll ----------------
const BTN = 320;
const Button: React.FC<{ x: number; glyph: string; sub: string; color: string; o: number; on: number }> = ({ x, glyph, sub, color, o, on }) => (
  <div style={{ position: "absolute", left: 0, top: 0, transformStyle: "preserve-3d", opacity: o, transform: `translateZ(${-on * 24}px)` }}>
    <Box x={x} y={620} w={BTN} h={BTN} d={60} color={color} o={0.25 + 0.75 * on} glow={on * 0.8} />
    <div style={{ position: "absolute", left: x, top: 620, width: BTN, height: BTN, lineHeight: `${BTN}px`, textAlign: "center", fontFamily: FONT, fontWeight: 700, fontSize: 210, color: on > 0.5 ? "#07090D" : color, transform: "translateZ(31px)" }}>{glyph}</div>
    <Tag x={x + BTN / 2} y={990} text={sub} color={color} o={1} align="c" z={40} />
  </div>
);
const DANMAKU = ["追", "扛", "追！", "扛住", "先扛", "我追", "扛到底", "追了再说", "扛", "追"];
export const Poll: React.FC<SceneProps> = ({ shot }) => {
  const { t, b } = useFilm();
  const inP = prog(t, b("whichOne"), 0.5);
  const chase = pulse(t, b("pollChase"), 0.7, 1) * 0.6 + win(t, b("pollChase"), b("pollHold"), 0.2) * 0.4;
  const hold = pulse(t, b("pollHold"), 0.7, 1) * 0.6 + prog(t, b("pollHold"), 0.2) * 0.4;
  const both = prog(t, b("danmaku"), 0.3);
  const r = mulberry32(91);
  // one speed for all; items in a lane start ≥0.9 s apart, so they never touch
  const lanes = DANMAKU.map((s, i) => ({ s, lane: i % 4, delay: Math.floor(i / 4) * 0.9 + (i % 4) * 0.22 + r() * 0.1, speed: 420 }));
  const cam = { rx: 10, ry: camSteps(t, -6, [[b("pollChase"), -14], [b("pollHold"), 2], [b("danmaku"), -6]]), s: 1 };
  return (
    <>
      <Stage cam={cam} o={inP}>
        <Button x={140} glyph="追" sub="主动单" color={C.amber} o={1} on={Math.max(chase, both * 0.6)} />
        <Button x={620} glyph="扛" sub="挂单" color={C.cyan} o={1} on={Math.max(hold, both * 0.6)} />
      </Stage>
      <AbsoluteFill style={{ clipPath: `inset(0 ${W - L.right}px 0 ${L.left}px)` }}>
        {lanes.map((d, i) => {
          const t0 = b("danmaku") + d.delay;
          if (t < t0 || t > shot.end + 0.4) return null;
          const x = W - (t - t0) * d.speed;
          const col = d.s.includes("追") ? C.amber : C.cyan;
          return (
            <div key={i} data-qa="tag" style={{ position: "absolute", left: x, top: 340 + d.lane * 62, fontFamily: FONT, fontWeight: 700, fontSize: 38, color: col, whiteSpace: "nowrap", textShadow: "0 2px 6px rgba(0,0,0,0.9)", opacity: 0.92 }}>
              {d.s}
            </div>
          );
        })}
      </AbsoluteFill>
    </>
  );
};

// ---------------- sum: three pillars ----------------
const PILLARS = [
  { x: 260, color: C.amber, base: "追价", top: "着急", beat: "sumChase" as const },
  { x: 540, color: C.cyan, base: "挂单", top: "耐心", beat: "sumRest" as const },
  { x: 820, color: C.red, base: "被迫", top: "加速", beat: "sumForced" as const },
];
export const Sum: React.FC<SceneProps> = ({ shot }) => {
  const { t, b } = useFilm();
  const inP = prog(t, b("together"), 0.6);
  const FLOOR = 1150;
  const cam = { rx: 14, ry: keys(t, [[shot.start, -16], [shot.end, 14]]), s: 1, oy: 900 };
  return (
    <Stage cam={cam} o={inP}>
      <div
        style={{
          position: "absolute",
          left: 90,
          top: FLOOR - 280,
          width: 900,
          height: 560,
          transform: "rotateX(90deg)",
          background: `repeating-linear-gradient(0deg, rgba(92,214,255,0.12) 0 2px, transparent 2px 56px), repeating-linear-gradient(90deg, rgba(92,214,255,0.12) 0 2px, transparent 2px 56px)`,
          borderRadius: 12,
        }}
      />
      {PILLARS.map((p, i) => {
        const u = prog(t, b(p.beat), 0.7);
        const h = mix(50, 520, u);
        const flick = p.beat === "sumForced" ? pulse(t, b(p.beat) + 0.5, 0.3, 3) : 0;
        return (
          <React.Fragment key={i}>
            <Box x={p.x - 75} y={FLOOR - h} w={150} h={h} d={150} color={p.color} o={0.35 + 0.65 * Math.max(u, 0.0)} glow={u * 0.6 + flick * 0.6} />
            <Tag x={p.x} y={FLOOR + 40} text={p.base} color={p.color === C.red ? C.redText : p.color} o={1} align="c" z={90} />
            <Tag x={p.x} y={FLOOR - h - 34} text={p.top} color={p.color === C.red ? C.redText : p.color} o={prog(t, b(p.beat) + 0.35, 0.3)} align="c" z={90} size={40} />
          </React.Fragment>
        );
      })}
    </Stage>
  );
};

// ---------------- print: a bar built from fills ----------------
const P_X = 540;
const P_TOP = 560;
const P_BOT = 1150;
const BRICK_W = 44;
const BRICK_H = 22;
const ROWS = Math.floor((P_BOT - P_TOP) / (BRICK_H + 4));
const N_BRICKS = ROWS * 3;
const TOTAL_FILLS = 1284;
export const Print: React.FC<SceneProps> = ({ shot }) => {
  const { t, b } = useFilm();
  const t0 = b("bothSides");
  const t1 = shot.end - 0.5;
  const ghost = prog(t, b("notGuess"), 0.5);
  const r = mulberry32(61);
  const spawn = Array.from({ length: N_BRICKS }, (_, i) => t0 + Math.pow(i / N_BRICKS, 0.8) * (t1 - t0));
  const landed = spawn.filter((s) => t >= s + 0.4).length;
  const fill = prog(t, t1, 0.4);
  const cam = { rx: 10, ry: keys(t, [[shot.start, -12], [shot.end, -4]]), s: camSteps(t, 1, [[b("oneByOne"), 1.05]]) };
  const stackTop = P_BOT - Math.ceil(landed / 3) * (BRICK_H + 4);
  return (
    <Stage cam={cam}>
      {/* the bar to be printed */}
      <div style={{ position: "absolute", left: P_X - 85, top: P_TOP - 6, width: 170, height: P_BOT - P_TOP + 12, border: `3px dashed ${alpha(C.sub, 0.6)}`, borderRadius: 6, opacity: ghost * (1 - fill), transform: "translateZ(-10px)" }} />
      <div style={{ position: "absolute", left: P_X - 2, top: P_TOP - 90, width: 4, height: P_BOT - P_TOP + 170, background: C.green, opacity: fill }} />
      <Box x={P_X - 80} y={P_TOP} w={160} h={P_BOT - P_TOP} d={70} color={C.green} o={fill} glow={0.3 * fill} />
      {spawn.map((s, i) => {
        const u = Math.min(1, Math.max(0, (t - s) / 0.4));
        if (u <= 0) return null;
        const col = i % 3;
        const row = Math.floor(i / 3);
        const tx = P_X - 72 + col * (BRICK_W + 4);
        const ty = P_BOT - (row + 1) * (BRICK_H + 4);
        const fromLeft = r() < 0.55;
        const sx = fromLeft ? 120 : 960;
        const sy = 600 + r() * 500;
        const ease = 1 - Math.pow(1 - u, 3);
        return <Box key={i} x={mix(sx, tx, ease)} y={mix(sy, ty, ease)} w={BRICK_W} h={BRICK_H} d={24} color={fromLeft ? C.green : C.red} o={1 - fill} />;
      })}
      <Tag x={P_X + 104} y={Math.min(P_BOT - 30, stackTop + 10)} text={`${Math.round((landed / N_BRICKS) * TOTAL_FILLS)} 笔`} color={C.amber} o={prog(t, t0, 0.3)} mono />
      <Tag x={P_X - 104} y={P_TOP + 30} text="?" color={C.sub} o={ghost * (1 - prog(t, t0, 0.4))} align="r" size={44} />
    </Stage>
  );
};

// ---------------- next: volume profile tease + end card ----------------
const PR_TOP = 430;
const PR_ROW = 44;
const PR_X = 330;
const PR_W = 560;
const vMax = Math.max(...PROFILE);
const poc = PROFILE.indexOf(vMax);
const VA = (() => {
  const total = PROFILE.reduce((s, v) => s + v, 0);
  let lo = poc;
  let hi = poc;
  let sum = PROFILE[poc];
  while (sum < total * 0.7) {
    const up = lo > 0 ? PROFILE[lo - 1] : -1;
    const dn = hi < PROFILE.length - 1 ? PROFILE[hi + 1] : -1;
    if (up >= dn) sum += PROFILE[--lo];
    else sum += PROFILE[++hi];
  }
  return { lo, hi };
})();
export const Next: React.FC<SceneProps> = ({ shot }) => {
  const { t, b, tl } = useFilm();
  const lastWord = tl.units[tl.units.length - 1].end;
  const endIn = prog(t, lastWord + 0.2, 0.6);
  const grow = (i: number) => prog(t, b("nextEp") + 0.04 * i, 0.5);
  const va = prog(t, b("pct70"), 0.5);
  const glow = pulse(t, b("sameZone"), 0.6, 2);
  const cam = { rx: 10, ry: keys(t, [[shot.start, -14], [b("sameZone") + 1, -6]]), s: camSteps(t, 1, [[b("pct70"), 1.05]]) };
  const vaTop = PR_TOP + VA.lo * PR_ROW;
  const vaBot = PR_TOP + (VA.hi + 1) * PR_ROW;
  return (
    <>
      <Stage cam={cam} o={1 - endIn}>
        {va > 0 ? <div style={{ position: "absolute", left: PR_X - 10, top: vaTop, width: (PR_W + 20) * va, height: vaBot - vaTop, background: alpha(C.amber, 0.12 + 0.12 * glow), border: `2px solid ${alpha(C.amber, 0.7 + 0.3 * glow)}`, borderRadius: 8, transform: "translateZ(-8px)" }} /> : null}
        {PROFILE.map((v, i) => {
          const inVa = i >= VA.lo && i <= VA.hi;
          const w = (v / vMax) * PR_W * grow(i);
          return <Box key={i} x={PR_X} y={PR_TOP + i * PR_ROW + 6} w={w} h={PR_ROW - 12} d={20} color={va > 0 && inVa ? C.amber : "#4A5A73"} o={grow(i) > 0 ? 1 : 0} />;
        })}
        {PROFILE.map((_, i) =>
          i % 2 === 0 ? (
            <div key={i} style={{ position: "absolute", left: PR_X - 170, top: PR_TOP + i * PR_ROW + PR_ROW / 2 - 14, width: 150, textAlign: "right", fontFamily: MONO, fontSize: T.xs, color: C.sub }}>
              {fmtPrice(20 - i)}
            </div>
          ) : null,
        )}
        <Tag x={PR_X + PR_W + 8} y={vaTop - 30} text={`${count(t, b("pct70"), 0.7, 0, 70)}%`} color={C.amber} o={va} align="r" mono size={40} />
      </Stage>
      {endIn > 0 ? (
        <AbsoluteFill style={{ opacity: endIn, alignItems: "center", justifyContent: "center", fontFamily: FONT }}>
          <div style={{ position: "absolute", top: 560, width: W, textAlign: "center", transform: `scale(${0.96 + 0.04 * endIn})` }}>
            <div style={{ width: 260, height: 260, margin: "0 auto", borderRadius: 22, overflow: "hidden", border: `2px solid ${C.amber}`, boxShadow: "0 0 0 8px rgba(7,9,13,0.85), 0 20px 60px rgba(0,0,0,0.6)" }}>
              <Img src={LOGO} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            </div>
            <div style={{ marginTop: 40, fontSize: 64, fontWeight: 700, color: C.text, letterSpacing: 4 }}>LVP订单流</div>
            <div style={{ marginTop: 16, fontSize: T.m, color: C.amber, letterSpacing: 2 }}>下一期 · 成交区间</div>
          </div>
        </AbsoluteFill>
      ) : null}
    </>
  );
};
