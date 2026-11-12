// 09 四层信息 — Delta / DOM / Footprint / Price stacked like an analysis engine; Price lights last.
import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { keys, prog } from "../anim";
import { BackgroundGrid, Panel } from "../components/Frame";
import { Candles, makeScale } from "../components/Chart";
import { ABSORB, FOOTPRINT, FP_PRICES, PRE, SELL_PRESSURE, SUCCESS, domAt } from "../market";
import { at, chapter } from "../script";
import { C, FONT, H, MONO, T, W } from "../theme";

const ROW_Y = [300, 560, 820, 1080];
const ROW_H = 230;
const VIZ_X = 560;
const VIZ_W = 420;

const LAYERS = [
  { name: "Delta", zh: "谁着急", color: C.redText },
  { name: "DOM", zh: "谁在接", color: C.greenText },
  { name: "Footprint", zh: "钱堆在哪", color: C.amber },
  { name: "Price", zh: "谁赢了", color: C.cyan },
];

const Viz: React.FC<{ i: number; y: number; f: number; p: number }> = ({ i, y, f, p }) => {
  const top = y + 40;
  const h = ROW_H - 70;
  if (i === 0) {
    const bars = SELL_PRESSURE.slice(0, 12);
    const bw = VIZ_W / bars.length;
    return (
      <g>
        {bars.map((d, k) => {
          const t = Math.max(0, Math.min(1, p * bars.length * 1.3 - k));
          const hh = (Math.abs(d) / 800) * h * t;
          return <rect key={k} x={VIZ_X + k * bw + 4} y={top} width={bw - 8} height={hh} fill={C.red} rx={2} />;
        })}
      </g>
    );
  }
  if (i === 1) {
    const rows = domAt(f).rows.slice(2, 10);
    const rh = h / rows.length;
    return (
      <g>
        {rows.map((r, k) => (
          <g key={r.p}>
            <rect x={VIZ_X + VIZ_W / 2 - 4 - (r.bid / 1000) * (VIZ_W / 2 - 10) * p} y={top + k * rh + 3} width={(r.bid / 1000) * (VIZ_W / 2 - 10) * p} height={rh - 6} fill={C.green} opacity={r.isWall ? 1 : 0.5} rx={2} />
            <rect x={VIZ_X + VIZ_W / 2 + 4} y={top + k * rh + 3} width={(r.ask / 1000) * (VIZ_W / 2 - 10) * p} height={rh - 6} fill={C.red} opacity={0.5} rx={2} />
          </g>
        ))}
      </g>
    );
  }
  if (i === 2) {
    const rh = h / FP_PRICES.length;
    const cw = VIZ_W / FOOTPRINT.length;
    return (
      <g>
        {FOOTPRINT.map((col, ci) =>
          col.map((c, ri) => {
            if (c.bid + c.ask === 0) return null;
            const t = Math.max(0, Math.min(1, p * 30 - (ci * 10 + ri) * 0.9));
            const heavy = c.bid > 600;
            return <rect key={`${ci}${ri}`} x={VIZ_X + ci * cw + 3} y={top + ri * rh + 1} width={cw - 6} height={rh - 2} fill={heavy ? C.amber : "rgba(145,160,181,0.3)"} opacity={t * (heavy ? 0.95 : 0.6)} rx={2} />;
          }),
        )}
      </g>
    );
  }
  const data = [...PRE.slice(-4), ...ABSORB.slice(-8), ...SUCCESS];
  const s = makeScale(VIZ_X, top, VIZ_W, h, data.length, 99.0, 102.5);
  return <Candles s={s} data={data} from={0} reveal={p * data.length} />;
};

export const Layers: React.FC = () => {
  const f = useCurrentFrame();
  const ch = chapter("layers");
  const litAt = [1, 2, 3, 4].map((i) => at(ch, i, 0));
  const finale = prog(f, at(ch, 5, 0), 20);
  const push = keys(f, [[0, 1], [ch.dur, 1.06]]);
  const spine = prog(f, 4, 30);
  return (
    <AbsoluteFill>
      {/* the background grid itself pushes in: wallpaper shot */}
      <AbsoluteFill style={{ opacity: 0.6 }}>
        <BackgroundGrid push={push} />
      </AbsoluteFill>
      <svg width={W} height={H} style={{ position: "absolute" }}>
        <line x1={110} x2={110} y1={ROW_Y[0] + 60} y2={ROW_Y[0] + 60 + (ROW_Y[3] - ROW_Y[0]) * spine} stroke={finale > 0.5 ? C.cyan : C.off} strokeWidth={3} />
        {ROW_Y.map((y, i) => {
          const on = f >= litAt[i];
          return (
            <g key={i}>
              <circle cx={110} cy={y + 60} r={18} fill={C.bg} stroke={on ? LAYERS[i].color : C.off} strokeWidth={3} opacity={spine > i / 3 ? 1 : 0} />
              {on ? <circle cx={110} cy={y + 60} r={9} fill={LAYERS[i].color} /> : null}
            </g>
          );
        })}
      </svg>
      {ROW_Y.map((y, i) => {
        const on = f >= litAt[i];
        const p = prog(f, litAt[i], 30);
        const current = on && (i === 3 || f < litAt[i + 1]) && finale < 0.5;
        return (
          <React.Fragment key={i}>
            <Panel x={160} y={y} w={856} h={ROW_H} o={on ? 1 : 0.35} accent={current || (i === 3 && on) ? `${LAYERS[i].color}aa` : C.border} />
            <div style={{ position: "absolute", left: 196, top: y + 36, fontFamily: FONT, opacity: on ? 1 : 0.4 }}>
              <div style={{ fontFamily: MONO, fontSize: T.l, fontWeight: 700, color: on ? C.text : C.sub }}>{LAYERS[i].name}</div>
              <div style={{ fontSize: T.l, fontWeight: 700, color: on ? LAYERS[i].color : C.off, marginTop: 18 }}>{LAYERS[i].zh}</div>
            </div>
            <svg width={W} height={H} style={{ position: "absolute", opacity: on ? 1 : 0.0 }}>
              <Viz i={i} y={y} f={f} p={p} />
            </svg>
          </React.Fragment>
        );
      })}
    </AbsoluteFill>
  );
};
