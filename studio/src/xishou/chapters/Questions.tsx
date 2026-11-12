// 08 四个问题 — a running pre-trade check terminal; each question lights its element on the chart below.
import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { lin, prog } from "../anim";
import { Candles, HLine, makeScale, Zone } from "../components/Chart";
import { Panel } from "../components/Frame";
import { ABSORB, KEY_LEVEL, PRE, STOP, SUCCESS, ZONE } from "../market";
import { at, chapter } from "../script";
import { C, FONT, H, MONO, T, W, toneColor } from "../theme";

const PRE_TAIL = PRE.slice(-6);
const A0 = PRE_TAIL.length;
const F0 = A0 + ABSORB.length;
const SLOTS = F0 + SUCCESS.length;

const QS = [
  { q: "位置在哪？", a: "VAL / 前低 99.75", tone: "cyan" as const },
  { q: "有没有真实成交？", a: "DOM 持续成交 · 足迹集中", tone: "amber" as const },
  { q: "价格有没有走？", a: "站回上沿 · 回踩不破", tone: "green" as const },
  { q: "失效在哪？", a: "吸收区下沿外 3 跳", tone: "red" as const },
];

export const Questions: React.FC = () => {
  const f = useCurrentFrame();
  const ch = chapter("questions");
  const qStart = [1, 2, 3, 4].map((i) => at(ch, i, 0));
  const current = qStart.reduce((acc, s, i) => (f >= s ? i : acc), -1);
  const exec = prog(f, at(ch, 5, 0.35), 16);
  const s = makeScale(110, 960, 820, 340, SLOTS, 98.25, 102.5);
  const focus = (i: number) => (exec > 0.5 ? 1 : current === i ? 1 : 0.22);
  const typed = (i: number) => {
    const n = Math.floor(lin(f, qStart[i], 14) * QS[i].q.length);
    return QS[i].q.slice(0, n);
  };
  return (
    <AbsoluteFill>
      <Panel x={64} y={296} w={952} h={600} title="交易前检查" en="PRE-TRADE CHECK · RUNNING" accent={exec > 0.5 ? `${C.amber}aa` : C.border} />
      <div style={{ position: "absolute", left: 104, top: 360, width: 872, fontFamily: FONT }}>
        <div style={{ fontFamily: MONO, fontSize: T.xs, color: C.sub, marginBottom: 18, opacity: prog(f, 4, 14) }}>
          {"> trigger: 大单出现  ·  run checklist"}
        </div>
        {QS.map((row, i) => {
          const on = f >= qStart[i];
          const ans = prog(f, qStart[i] + 18, 12);
          const col = toneColor(row.tone);
          return (
            <div key={row.q} style={{ display: "flex", alignItems: "center", height: 104, borderTop: `1px solid ${C.border}`, opacity: on ? 1 : 0.28 }}>
              <div style={{ width: 64, fontFamily: MONO, fontSize: T.m, color: on ? col : C.off, fontWeight: 700 }}>{on && ans > 0.5 ? "✓" : `0${i + 1}`}</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: T.l, fontWeight: 700, color: current === i ? col : C.text }}>{on ? typed(i) : QS[i].q}</div>
                <div style={{ fontSize: T.xs, color: C.sub, marginTop: 4, opacity: ans }}>{row.a}</div>
              </div>
            </div>
          );
        })}
      </div>
      {exec > 0 ? (
        <div
          style={{
            position: "absolute",
            left: 104,
            right: 104,
            top: 828,
            height: 64,
            borderRadius: 12,
            background: "rgba(255,181,71,0.12)",
            border: `1px solid ${C.amber}`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontFamily: FONT,
            fontWeight: 700,
            fontSize: T.m,
            color: C.amber,
            opacity: exec,
            clipPath: `inset(0 ${(1 - exec) * 100}% 0 0)`,
          }}
        >
          不确认，不交易 <span style={{ fontFamily: MONO, fontWeight: 400, fontSize: T.xs, color: C.sub, marginLeft: 14 }}>EXECUTE ONLY IF CONFIRMED</span>
        </div>
      ) : null}
      <Panel x={64} y={920} w={952} h={420} title="对应证据" en="ON CHART" />
      <svg width={W} height={H} style={{ position: "absolute" }}>
        <g opacity={focus(1)}>
          <Zone s={s} lo={ZONE.lo} hi={ZONE.hi} from={A0} to={F0 - 1} grow={1} />
        </g>
        <g opacity={0.85}>
          <Candles s={s} data={PRE_TAIL} from={0} reveal={PRE_TAIL.length} />
          <Candles s={s} data={ABSORB} from={A0} reveal={ABSORB.length} />
        </g>
        <g opacity={focus(2)}>
          <Candles s={s} data={SUCCESS} from={F0} reveal={SUCCESS.length} />
        </g>
        <g opacity={focus(0)}>
          <HLine s={s} p={KEY_LEVEL} draw={1} color={C.cyan} width={current === 0 ? 3 : 1.5} dash="6 6" />
        </g>
        <g opacity={focus(3)}>
          <HLine s={s} p={STOP} draw={current >= 3 ? lin(f, qStart[3], 20) : 1} color={C.red} width={current === 3 ? 3.5 : 1.5} />
        </g>
      </svg>
    </AbsoluteFill>
  );
};
