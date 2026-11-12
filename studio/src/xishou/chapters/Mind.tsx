// 07 人性 — letterboxed pressure shot (pounding Delta, frozen price), then the decision branch.
import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { mix, prog } from "../anim";
import { Slate, Tag } from "../components/Frame";
import { SELL_PRESSURE } from "../market";
import { at, chapter } from "../script";
import { C, FONT, H, MONO, T, W } from "../theme";

const Branch: React.FC<{ f: number; start: number }> = ({ f, start }) => {
  const p = (k: number) => prog(f, start + k * 10, 18);
  const root = { x: 540, y: 520 };
  const nodes = [
    { x: 300, y: 820, t: "价格走了", s: "等确认 → 按计划执行", c: C.greenText },
    { x: 780, y: 820, t: "价格不走 / 跌破", s: "不追 → 执行失效", c: C.redText },
  ];
  return (
    <svg width={W} height={H} style={{ position: "absolute" }}>
      <g fontFamily={FONT}>
        <rect x={root.x - 150} y={root.y - 46} width={300} height={92} rx={14} fill={C.panel} stroke={C.cyan} strokeWidth={2} opacity={p(0)} />
        <text x={root.x} y={root.y + 12} textAnchor="middle" fill={C.text} fontSize={T.m} fontWeight={700} opacity={p(0)}>
          看到大单
        </text>
        {nodes.map((n, i) => {
          const d = p(1 + i);
          const midY = (root.y + 46 + n.y - 56) / 2;
          const path = `M${root.x} ${root.y + 46} V${midY} H${n.x} V${n.y - 56}`;
          return (
            <g key={n.t}>
              <path d={path} fill="none" stroke={C.cyan} strokeWidth={2.5} strokeDasharray={900} strokeDashoffset={900 * (1 - d)} />
              <g opacity={prog(f, start + 18 + i * 10, 14)}>
                <rect x={n.x - 200} y={n.y - 56} width={400} height={150} rx={14} fill={C.panel} stroke={C.border} />
                <text x={n.x} y={n.y + 2} textAnchor="middle" fill={n.c} fontSize={T.m} fontWeight={700}>
                  {n.t}
                </text>
                <text x={n.x} y={n.y + 52} textAnchor="middle" fill={C.sub} fontSize={T.s}>
                  {n.s}
                </text>
              </g>
            </g>
          );
        })}
        <text x={540} y={1080} textAnchor="middle" fill={C.cyan} fontFamily={MONO} fontSize={T.s} opacity={prog(f, start + 40, 16)}>
          IF / THEN · 实时可执行的分支
        </text>
      </g>
    </svg>
  );
};

export const Mind: React.FC = () => {
  const f = useCurrentFrame();
  const ch = chapter("mind");
  const bandIn = prog(f, (ch.lead ?? 0) - 8, 18);
  const bandOut = prog(f, at(ch, 3, 0), 20);
  const bandH = mix(80, 440, bandIn);
  const top = 840 - bandH / 2;
  const chase = prog(f, at(ch, 1, 0.2), 12);
  const hope = prog(f, at(ch, 2, 0.3), 12);
  const anx = prog(f, at(ch, 2, 0.8), 12);
  // pounding sell prints: each bar strikes in rhythm, price line refuses to move
  const bars = SELL_PRESSURE.slice(0, 14);
  const bw = 48;
  return (
    <AbsoluteFill>
      <AbsoluteFill style={{ opacity: 1 - bandOut }}>
        <div style={{ position: "absolute", left: 0, right: 0, top, height: bandH, background: "rgba(11,18,32,0.9)", borderTop: `1px solid ${C.border}`, borderBottom: `1px solid ${C.border}`, overflow: "hidden" }}>
          <svg width={W} height={440} style={{ position: "absolute", top: (bandH - 440) / 2 }}>
            {/* frozen price */}
            <line x1={64} x2={1016} y1={130} y2={130} stroke={C.amber} strokeWidth={3} strokeDasharray="10 8" />
            <text x={70} y={110} fill={C.amber} fontFamily={MONO} fontSize={T.xs}>
              PRICE 99.75 · 不动
            </text>
            {bars.map((d, i) => {
              const hit = (f + i * 7) % 26;
              const strike = hit < 6 ? 1 - hit / 6 : 0;
              const hgt = (Math.abs(d) / 800) * 220 * (0.75 + 0.25 * strike);
              const x = 80 + i * ((1016 - 80) / bars.length);
              return <rect key={i} x={x} y={190} width={bw} height={hgt} fill={C.red} opacity={0.55 + 0.45 * strike} rx={2} />;
            })}
            <text x={70} y={425} fill={C.sub} fontFamily={MONO} fontSize={T.xs}>
              SELL DELTA · 越砸越猛
            </text>
          </svg>
        </div>
        <Tag x={1016} y={top - 40} text="追单冲动" color={C.redText} o={chase} size={T.m} align="right" />
        <Tag x={64} y={top + bandH + 40} text="反转幻想" color={C.amber} o={hope} size={T.m} />
        <Tag x={1016} y={top + bandH + 40} text="等待焦虑" color={C.sub} o={anx} size={T.m} align="right" />
      </AbsoluteFill>
      {bandOut > 0 ? (
        <AbsoluteFill style={{ opacity: bandOut }}>
          <Branch f={f} start={at(ch, 3, 0.1)} />
        </AbsoluteFill>
      ) : null}
      <Slate f={f} big={ch.slate!.big} small={ch.slate!.small} tone={ch.slate!.tone} until={(ch.lead ?? 0) + 12} />
    </AbsoluteFill>
  );
};
