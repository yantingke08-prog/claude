// 05 三个证据 — one vertical chain; each node opens its own small proof, one at a time.
import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { lin, prog } from "../anim";
import { Panel, Tag } from "../components/Frame";
import { DOMLadder } from "../components/OrderFlow";
import { FOOTPRINT, FP_PRICES, PROFILE, POC, VAH, VAL } from "../market";
import { at, chapter } from "../script";
import { C, FONT, H, MONO, T, W } from "../theme";

const NODE_X = 120;
const ROWS = [
  { y: 300, h: 330, n: "①", title: "关键位", en: "KEY LEVEL", color: C.cyan },
  { y: 660, h: 330, n: "②", title: "订单流异常", en: "ORDER-FLOW ANOMALY", color: C.amber },
  { y: 1020, h: 330, n: "③", title: "价格确认", en: "PRICE CONFIRMATION", color: C.green },
];

const ProfileMini: React.FC<{ x: number; y: number; w: number; h: number; p: number; f: number }> = ({ x, y, w, h, p }) => {
  const min = 97.25;
  const max = 103.25;
  const Y = (v: number) => y + ((max - v) / (max - min)) * h;
  const maxV = Math.max(...PROFILE.map((r) => r.v));
  const lines: [number, string, string][] = [
    [VAH, "VAH 价值区上沿", C.cyan],
    [POC, "POC 成交最密", C.cyan],
    [VAL, "VAL 价值区下沿 · 前低", C.cyan],
  ];
  return (
    <g>
      {PROFILE.map((r, i) => {
        const t = Math.max(0, Math.min(1, p * PROFILE.length * 1.2 - i * 0.6));
        const bw = (r.v / maxV) * w * 0.42 * t;
        return <rect key={r.p} x={x} y={Y(r.p) - 4} width={bw} height={8} rx={2} fill={r.p === POC ? C.cyan : "rgba(145,160,181,0.45)"} />;
      })}
      {lines.map(([v, label, col], i) => {
        const d = Math.max(0, Math.min(1, p * 2.2 - 0.8 - i * 0.25));
        return (
          <g key={label} opacity={d > 0 ? 1 : 0}>
            <line x1={x} x2={x + w * d} y1={Y(v)} y2={Y(v)} stroke={col} strokeWidth={2} strokeDasharray={v === POC ? undefined : "6 5"} />
            <text x={x + w} y={v === VAH ? Y(v) - 8 : Y(v) + 26} fill={col} fontFamily={FONT} fontSize={T.xs} textAnchor="end" opacity={d}>
              {label} {v.toFixed(2)}
            </text>
          </g>
        );
      })}
    </g>
  );
};

const HeatMini: React.FC<{ x: number; y: number; w: number; h: number; p: number }> = ({ x, y, w, h, p }) => {
  const rh = h / FP_PRICES.length;
  const cw = w / FOOTPRINT.length;
  return (
    <g>
      {FOOTPRINT.map((col, ci) =>
        col.map((cell, ri) => {
          const k = ci * FP_PRICES.length + ri;
          const t = Math.max(0, Math.min(1, p * 30 - k * 0.8));
          if (t <= 0 || cell.bid + cell.ask === 0) return null;
          const heavy = cell.bid > 600;
          return <rect key={k} x={x + ci * cw + 3} y={y + ri * rh + 2} width={cw - 6} height={rh - 4} rx={3} fill={heavy ? C.amber : "rgba(145,160,181,0.25)"} opacity={(heavy ? 0.9 : 0.6) * t} />;
        }),
      )}
      <text x={x + w / 2} y={y + h + 26} fill={C.sub} fontFamily={MONO} fontSize={T.xs - 4} textAnchor="middle">
        FOOTPRINT
      </text>
    </g>
  );
};

/** Three tiny price paths drawn left → right through a zone. */
const PathsMini: React.FC<{ x: number; y: number; w: number; h: number; p: number }> = ({ x, y, w, h, p }) => {
  const paths: { label: string; pts: number[] }[] = [
    { label: "站回结构", pts: [0.55, 0.62, 0.7, 0.58, 0.45, 0.3, 0.18] },
    { label: "回踩不破", pts: [0.62, 0.45, 0.3, 0.42, 0.5, 0.3, 0.15] },
    { label: "跌破快速收回", pts: [0.5, 0.62, 0.86, 0.6, 0.45, 0.3, 0.2] },
  ];
  const pw = (w - 40) / 3;
  return (
    <g>
      {paths.map((pa, i) => {
        const px = x + i * (pw + 20);
        const zoneTop = y + h * 0.48;
        const zoneBot = y + h * 0.62;
        const d = Math.max(0, Math.min(1, p * 3 - i * 0.6));
        const pts = pa.pts.map((v, k) => [px + (k / (pa.pts.length - 1)) * pw, y + v * h] as const);
        const path = pts.map(([a, b], k) => `${k ? "L" : "M"}${a.toFixed(1)} ${b.toFixed(1)}`).join(" ");
        return (
          <g key={pa.label}>
            <rect x={px} y={zoneTop} width={pw} height={zoneBot - zoneTop} fill={C.amberZone} />
            <path d={path} fill="none" stroke={C.green} strokeWidth={4} strokeLinejoin="round" strokeDasharray={pw * 2} strokeDashoffset={pw * 2 * (1 - d)} />
            <text x={px + pw / 2} y={y + h + 26} fill={d > 0.9 ? C.greenText : C.sub} fontFamily={FONT} fontSize={T.xs} textAnchor="middle">
              {pa.label}
            </text>
          </g>
        );
      })}
    </g>
  );
};

export const Evidence: React.FC = () => {
  const f = useCurrentFrame();
  const ch = chapter("evidence");
  const lit = [at(ch, 1, 0), at(ch, 2, 0), at(ch, 4, 0)];
  const allOn = prog(f, at(ch, 6, 0.0), 14);
  const missing = prog(f, at(ch, 6, 0.55), 14);
  const active = (i: number) => (f >= lit[i] ? 1 : 0);
  const nodeState = (i: number) => (i === 1 && missing > 0.5 ? "off" : f >= lit[i] ? "on" : "off");
  const chainColor = missing > 0.5 ? C.off : allOn > 0.5 ? C.green : C.off;
  const p1 = lin(f, lit[0] + 4, 60);
  const p2 = lin(f, lit[1] + 4, 70);
  const p3 = lin(f, lit[2] + 4, 70);
  const intro = prog(f, 0, 20);
  return (
    <AbsoluteFill>
      {ROWS.map((r, i) => {
        const on = active(i);
        const focused = on && (i === 2 || f < lit[i + 1]) && allOn < 0.5;
        const dim = missing > 0.5 && i === 1;
        return (
          <Panel key={r.title} x={180} y={r.y} w={836} h={r.h} title={`${r.n} ${r.title}`} en={r.en} o={intro * (dim ? 0.3 : on ? 1 : 0.35)} accent={focused || (allOn > 0.5 && !dim) ? `${r.color}aa` : C.border} />
        );
      })}
      <svg width={W} height={H} style={{ position: "absolute" }}>
        {/* the chain */}
        <line x1={NODE_X} x2={NODE_X} y1={ROWS[0].y + 60} y2={ROWS[2].y + 60} stroke={chainColor} strokeWidth={allOn > 0.5 && missing < 0.5 ? 5 : 3} opacity={intro} />
        {ROWS.map((r, i) => {
          const st = nodeState(i);
          const col = st === "on" ? C.green : C.off;
          return (
            <g key={r.title} opacity={intro}>
              <circle cx={NODE_X} cy={r.y + 60} r={22} fill={C.bg} stroke={col} strokeWidth={3} />
              {st === "on" ? <circle cx={NODE_X} cy={r.y + 60} r={12} fill={col} /> : null}
            </g>
          );
        })}
        <g opacity={active(0)}>
          <ProfileMini x={220} y={ROWS[0].y + 70} w={760} h={230} p={p1} f={f} />
        </g>
        {active(1) ? (
          <g>
            <DOMLadder x={230} y={ROWS[1].y + 84} w={380} h={232} f={f - lit[1]} focusWall={1} o={missing > 0.5 ? 0.3 : 1} />
            <g opacity={missing > 0.5 ? 0.3 : 1}>
              <HeatMini x={680} y={ROWS[1].y + 70} w={290} h={220} p={p2} />
            </g>
          </g>
        ) : null}
        <g opacity={active(2)}>
          <PathsMini x={230} y={ROWS[2].y + 80} w={750} h={200} p={p3} />
        </g>
      </svg>
      <Tag x={NODE_X - 40} y={1384 - 4} text="三证齐全 → 才叫交易" color={C.greenText} o={allOn * (1 - missing)} size={T.s} />
      <Tag x={NODE_X - 40} y={1384 - 4} text="缺一个 = 观察，不是交易" color={C.amber} o={missing} size={T.s} />
    </AbsoluteFill>
  );
};
