// DOM ladder, Footprint and the 3-step evidence rail. SVG groups in absolute frame px.
import React from "react";
import { C, FONT, MONO, T } from "../theme";
import { domAt, DOM_PRICES, FOOTPRINT, FP_PRICES, fmt, ZONE } from "../market";

/** Order book ladder. Big responsive bid at the zone low gets eaten, then refills (or is pulled). */
export const DOMLadder: React.FC<{
  x: number;
  y: number;
  w: number;
  h: number;
  f: number; // local frame driving the eat/refill rhythm
  o?: number;
  mode?: "hold" | "pull";
  pullFrom?: number;
  focusWall?: number; // 0..1 highlight on the wall row
}> = ({ x, y, w, h, f, o = 1, mode = "hold", pullFrom = 0, focusWall = 0 }) => {
  const st = domAt(f, mode, pullFrom);
  const rh = h / DOM_PRICES.length;
  const priceW = w * 0.26;
  const sideW = (w - priceW) / 2;
  const maxSize = 1000;
  const fs = Math.min(T.xs, Math.floor(rh * 0.8));
  return (
    <g opacity={o}>
      <text x={x + sideW / 2} y={y - 14} fill={C.greenText} fontFamily={MONO} fontSize={T.xs - 2} textAnchor="middle">
        BID 买
      </text>
      <text x={x + sideW + priceW / 2} y={y - 14} fill={C.sub} fontFamily={MONO} fontSize={T.xs - 2} textAnchor="middle">
        PRICE
      </text>
      <text x={x + sideW + priceW + sideW / 2} y={y - 14} fill={C.redText} fontFamily={MONO} fontSize={T.xs - 2} textAnchor="middle">
        ASK 卖
      </text>
      {st.rows.map((r, i) => {
        const ry = y + i * rh;
        const bidW = (r.bid / maxSize) * (sideW - 12);
        const askW = (r.ask / maxSize) * (sideW - 12);
        const flash = r.isWall && st.eating ? 0.35 + 0.35 * Math.abs(Math.sin(f * 0.55)) : 0;
        return (
          <g key={r.p}>
            <rect x={x} y={ry + 1} width={w} height={rh - 2} fill={i % 2 ? "rgba(255,255,255,0.015)" : "transparent"} />
            {r.isWall ? (
              <rect x={x} y={ry + 1} width={w} height={rh - 2} fill="rgba(255,181,71,0.10)" stroke={C.amber} strokeOpacity={0.35 + 0.65 * focusWall} strokeWidth={1.5} rx={4} />
            ) : null}
            {/* bid bar grows leftward from the price column */}
            <rect x={x + sideW - 6 - bidW} y={ry + rh * 0.2} width={bidW} height={rh * 0.6} fill={C.green} opacity={r.isWall ? 0.95 : 0.55} rx={2} />
            {flash > 0 ? <rect x={x + sideW - 6 - bidW} y={ry + rh * 0.2} width={bidW} height={rh * 0.6} fill={C.red} opacity={flash} rx={2} /> : null}
            <rect x={x + sideW + priceW + 6} y={ry + rh * 0.2} width={askW} height={rh * 0.6} fill={C.red} opacity={0.5} rx={2} />
            <text x={x + 10} y={ry + rh / 2 + fs * 0.32} fill={r.bid ? C.text : "transparent"} fontFamily={MONO} fontSize={fs - 2}>
              {r.bid || ""}
            </text>
            <text x={x + w - 10} y={ry + rh / 2 + fs * 0.32} fill={r.ask ? C.text : "transparent"} fontFamily={MONO} fontSize={fs - 2} textAnchor="end">
              {r.ask || ""}
            </text>
            <text
              x={x + sideW + priceW / 2}
              y={ry + rh / 2 + fs * 0.35}
              fill={r.isLast ? C.text : r.isWall ? C.amber : C.sub}
              fontFamily={MONO}
              fontWeight={r.isLast || r.isWall ? 700 : 400}
              fontSize={fs}
              textAnchor="middle"
            >
              {fmt(r.p)}
            </text>
            {r.isLast ? <rect x={x + sideW + 4} y={ry + 1} width={priceW - 8} height={rh - 2} fill="none" stroke={C.text} strokeOpacity={0.5} rx={4} /> : null}
          </g>
        );
      })}
      {/* market sell prints travelling into the wall while it is being eaten */}
      {st.eating
        ? [0, 1, 2].map((k) => {
            const wallIdx = DOM_PRICES.indexOf(ZONE.lo);
            const t = ((f + k * 6) % 18) / 18;
            const px = x + w - 20 - t * (w - sideW - 30);
            return <circle key={k} cx={px} cy={y + wallIdx * rh + rh / 2} r={5} fill={C.red} opacity={0.9 * (1 - t)} />;
          })
        : null}
    </g>
  );
};

export const domRefills = (f: number) => domAt(f).cycle;

/** Footprint (bid × ask per price per bar). Cells appear one by one; the heavy band lights amber. */
export const FootprintChart: React.FC<{
  x: number;
  y: number;
  w: number;
  h: number;
  grow: number; // 0..1 cells revealed
  band: number; // 0..1 band highlight drawn left → right
  o?: number;
}> = ({ x, y, w, h, grow, band, o = 1 }) => {
  const priceW = 104;
  const cols = FOOTPRINT.length;
  const colW = (w - priceW) / cols;
  const rh = h / FP_PRICES.length;
  const total = cols * FP_PRICES.length;
  const shown = grow * total;
  const bandTop = FP_PRICES.indexOf(ZONE.hi - 0.25); // 99.75
  return (
    <g opacity={o}>
      {FP_PRICES.map((p, ri) => (
        <text key={p} x={x + priceW - 14} y={y + ri * rh + rh / 2 + 7} fill={p === 99.5 || p === 99.75 ? C.amber : C.sub} fontFamily={MONO} fontSize={T.xs - 2} textAnchor="end">
          {fmt(p)}
        </text>
      ))}
      {FOOTPRINT.map((col, ci) =>
        col.map((cell, ri) => {
          const k = ci * FP_PRICES.length + ri;
          const t = Math.max(0, Math.min(1, shown - k));
          if (t <= 0 || (cell.bid === 0 && cell.ask === 0)) return null;
          const heavy = cell.bid > 600;
          const cx = x + priceW + ci * colW;
          const cy = y + ri * rh;
          const heat = heavy ? Math.min(0.75, cell.bid / 1600) * band : 0;
          return (
            <g key={`${ci}-${ri}`} opacity={t}>
              <rect x={cx + 4} y={cy + 2} width={colW - 8} height={rh - 4} rx={4} fill={heavy ? `rgba(255,181,71,${0.08 + heat})` : "rgba(145,160,181,0.06)"} stroke={C.border} strokeWidth={1} />
              <text x={cx + colW / 2} y={cy + rh / 2 + 7} fontFamily={MONO} fontSize={T.xs - 1} textAnchor="middle" fill={C.text}>
                <tspan fill={heavy ? (band > 0.5 ? C.bg : C.redText) : C.sub} fontWeight={heavy ? 700 : 400}>
                  {cell.bid}
                </tspan>
                <tspan fill={C.sub}> × </tspan>
                <tspan fill={heavy && band > 0.5 ? C.bg : C.sub}>{cell.ask}</tspan>
              </text>
            </g>
          );
        }),
      )}
      {band > 0 ? (
        <rect
          x={x + priceW}
          y={y + bandTop * rh}
          width={(w - priceW) * band}
          height={rh * 2}
          fill="none"
          stroke={C.amber}
          strokeWidth={2.5}
          rx={6}
        />
      ) : null}
      <text x={x + w - 8} y={y + h + 26} fill={C.sub} fontFamily={MONO} fontSize={T.xs - 4} textAnchor="end">
        SIMULATED · 左=主动卖 右=主动买
      </text>
    </g>
  );
};

export type StepState = "off" | "on" | "fail";
const STEP_LABELS = ["关键位", "订单流异常", "价格确认"];

/** Three-step evidence chain. Complete → whole rail green. Fail → whole rail red. */
export const EvidenceRail: React.FC<{
  x: number;
  y: number;
  h: number;
  steps: StepState[];
  o?: number;
  labelSide?: "left" | "right";
  verdict?: { text: string; color: string; o: number };
}> = ({ x, y, h, steps, o = 1, labelSide = "left", verdict }) => {
  const complete = steps.every((s) => s === "on");
  const failed = steps.includes("fail");
  const railColor = failed ? C.red : complete ? C.green : C.off;
  const ys = [0, 1, 2].map((i) => y + (i * h) / 2);
  const col = (s: StepState) => (s === "on" ? C.green : s === "fail" ? C.red : C.off);
  return (
    <g opacity={o} fontFamily={FONT}>
      <line x1={x} x2={x} y1={y} y2={y + h} stroke={railColor} strokeWidth={complete || failed ? 4 : 3} />
      {ys.map((yy, i) => {
        const s = steps[i];
        return (
          <g key={i}>
            <circle cx={x} cy={yy} r={16} fill={C.bg} stroke={col(s)} strokeWidth={3} />
            {s !== "off" ? <circle cx={x} cy={yy} r={9} fill={col(s)} /> : null}
            <text
              x={labelSide === "left" ? x - 28 : x + 28}
              y={yy + 8}
              textAnchor={labelSide === "left" ? "end" : "start"}
              fill={s === "off" ? C.sub : col(s) === C.red ? C.redText : C.greenText}
              fontSize={T.xs}
              fontWeight={s === "off" ? 400 : 700}
            >
              {i === 2 && s === "fail" ? "失效" : STEP_LABELS[i]}
            </text>
          </g>
        );
      })}
      {verdict && verdict.o > 0 ? (
        <text x={x} y={y + h + 52} textAnchor="middle" fill={verdict.color} fontSize={T.xs} fontWeight={700} opacity={verdict.o}>
          {verdict.text}
        </text>
      ) : null}
    </g>
  );
};
