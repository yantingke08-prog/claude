import { useMemo } from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { MONO } from "../lib/fonts";
import { mulberry32 } from "../lib/rng";
import { BRAND, LAYOUT, mix, ramp } from "./brand";
import { FinalReveal, endingReveal, sweepPx } from "./FinalReveal";
import { SYMBOL, symbolMask } from "./logo";

/**
 * V3「成交量分布」: a volume profile builds level by level beside a price axis. Then every
 * level re-sorts its volume into the mark's silhouette on that row - the profile *is* the logo,
 * read as scanlines - and the lines close up into the mark just as the shared ending sweeps in.
 */
export const T3 = {
  axis: [0, 14] as const,
  grow: [6, 50] as const,
  poc: [44, 62] as const,
  morph: [60, 102] as const,
  close: [96, 116] as const,
};

const ROWS = 64;

const buildRows = () => {
  const [bx, by, bw, bh] = SYMBOL.box;
  const { inside } = symbolMask(1000);
  const rand = mulberry32(8);
  const rowH = bh / ROWS;
  const rows = Array.from({ length: ROWS }, (_, r) => {
    const y = by + (r + 0.5) * rowH;
    // the mark's filled runs on this scanline
    const runs: [number, number][] = [];
    let start = -1;
    for (let x = bx - 2; x <= bx + bw + 2; x += 1) {
      const on = inside(x, y);
      if (on && start < 0) start = x;
      if (!on && start >= 0) {
        if (x - start > 3) runs.push([start, x]);
        start = -1;
      }
    }
    // a bimodal session profile: balance high, a secondary node low
    const u = r / (ROWS - 1);
    const vol = 0.72 * Math.exp(-((u - 0.38) ** 2) / (2 * 0.1 ** 2)) + 0.42 * Math.exp(-((u - 0.74) ** 2) / (2 * 0.07 ** 2)) + 0.07 + rand() * 0.14;
    return { y, runs, vol };
  });
  const max = Math.max(...rows.map((r) => r.vol));
  const poc = rows.findIndex((r) => r.vol === max);
  // value area: grow out from the POC until 70% of the volume is inside
  const total = rows.reduce((a, r) => a + r.vol, 0);
  let lo = poc;
  let hi = poc;
  let acc = rows[poc].vol;
  while (acc < total * 0.7) {
    const up = lo > 0 ? rows[lo - 1].vol : -1;
    const dn = hi < ROWS - 1 ? rows[hi + 1].vol : -1;
    if (up >= dn) acc += rows[--lo].vol;
    else acc += rows[++hi].vol;
  }
  return { rows: rows.map((r, i) => ({ ...r, vol: r.vol / max, va: i >= lo && i <= hi })), poc, rowH };
};

export const LvpV3Profile: React.FC = () => {
  const frame = useCurrentFrame();
  const { rows, poc, rowH } = useMemo(buildRows, []);
  const [bx, by, bw, bh] = SYMBOL.box;
  const k = LAYOUT.symbol.h / bh; // px per SVG unit
  const pw = bw * k;
  const axisX = bx - 40;
  const maxLen = bw * 0.92;

  const axis = ramp(frame, ...T3.axis, "expo.out");
  const pocGlow = ramp(frame, ...T3.poc, "power2.out") * (1 - ramp(frame, T3.morph[0], T3.morph[0] + 14));
  const close = ramp(frame, ...T3.close, "power2.inOut");
  // the shared ending's sweep takes over the scanlines from the bottom up
  const reveal = endingReveal(frame);
  const cut = reveal > 0 ? sweepPx(reveal) - (LAYOUT.symbol.cy - LAYOUT.symbol.h / 2) : 9999;
  const chrome = 1 - ramp(frame, T3.morph[0], T3.morph[0] + 20);
  // Open framed on the profile itself, big and centred; settle onto the end-card layout as it morphs.
  const u = 1 - ramp(frame, T3.morph[0] - 4, T3.morph[1], "power3.inOut");
  const focusX = LAYOUT.symbol.cx - pw / 2 + (axisX + maxLen * 0.42 - bx) * k;
  const focusY = LAYOUT.symbol.cy;
  const zoom = mix(1, 1.6, u) * mix(1.04, 1, ramp(frame, 0, 150, "power2.out"));
  const shiftX = (960 - focusX) * u;
  const shiftY = (540 - focusY) * u;

  return (
    <AbsoluteFill style={{ backgroundColor: BRAND.black }}>
      <AbsoluteFill style={{ transform: `translate(${shiftX}px, ${shiftY}px) scale(${zoom})`, transformOrigin: `${focusX}px ${focusY}px` }}>
        <svg
          viewBox={`${bx} ${by} ${bw} ${bh}`}
          style={{
            position: "absolute",
            left: LAYOUT.symbol.cx - pw / 2,
            top: LAYOUT.symbol.cy - LAYOUT.symbol.h / 2,
            width: pw,
            height: LAYOUT.symbol.h,
            overflow: "visible",
            WebkitMaskImage: reveal > 0 ? `linear-gradient(to bottom, black ${cut - 12}px, transparent ${cut + 6}px)` : undefined,
            maskImage: reveal > 0 ? `linear-gradient(to bottom, black ${cut - 12}px, transparent ${cut + 6}px)` : undefined,
          }}
        >
          <defs>
            <linearGradient id="v3-gold" gradientUnits="userSpaceOnUse" x1={bx} y1={by} x2={bx + bw} y2={by + bh}>
              <stop offset="0" stopColor={BRAND.softGold} />
              <stop offset="0.55" stopColor={BRAND.gold} />
              <stop offset="1" stopColor={BRAND.softGold} />
            </linearGradient>
          </defs>

          {/* price axis with ticks and a few prices */}
          <g opacity={chrome}>
            <line x1={axisX} x2={axisX} y1={by + bh * (1 - axis)} y2={by + bh} stroke={BRAND.gold} strokeWidth={1.6} strokeOpacity={0.7} />
            {rows.map((r, i) =>
              i % 4 === 0 ? (
                <line key={i} x1={axisX - 10} x2={axisX} y1={r.y} y2={r.y} stroke={BRAND.gold} strokeWidth={1.2} strokeOpacity={0.5 * ramp(frame, i * 0.2, i * 0.2 + 8)} />
              ) : null,
            )}
            {rows.map((r, i) =>
              i % 8 === 4 ? (
                <text
                  key={`p${i}`}
                  x={axisX - 22}
                  y={r.y + 9}
                  textAnchor="end"
                  fontFamily={MONO.fontFamily}
                  fontSize={26}
                  fill={i === poc ? BRAND.softGold : BRAND.graphite}
                  opacity={ramp(frame, 4 + i * 0.25, 14 + i * 0.25)}
                >
                  {(4528.5 - i * 0.25).toFixed(2)}
                </text>
              ) : null,
            )}
          </g>

          {rows.map((r, i) => {
            const dist = Math.abs(i - poc) / ROWS;
            const g = ramp(frame, T3.grow[0] + dist * 30, T3.grow[0] + dist * 30 + 18, "expo.out");
            const m = ramp(frame, T3.morph[0] + dist * 22, T3.morph[0] + dist * 22 + 22, "power3.inOut");
            const len = maxLen * r.vol * g;
            const h = rowH * mix(0.62, 1.04, close);
            const base = r.va ? BRAND.gold : BRAND.graphite;
            const fill = i === poc ? BRAND.softGold : base;
            const segs = r.runs.length ? r.runs : [[axisX + 6 + len / 2, axisX + 6 + len / 2] as [number, number]];
            return segs.map(([x0, x1], j) => {
              // each run is born from its share of the profile bar
              const a = axisX + 6 + (len * j) / segs.length;
              const b = axisX + 6 + (len * (j + 1)) / segs.length;
              const sx = mix(a, x0, m);
              const ex = mix(b, x1, m);
              return (
                <rect
                  key={`${i}-${j}`}
                  x={sx}
                  y={r.y - h / 2}
                  width={Math.max(0, ex - sx)}
                  height={h}
                  rx={mix(2, 0, close)}
                  fill={m > 0.5 ? "url(#v3-gold)" : fill}
                  opacity={(r.va || i === poc ? 0.95 : 0.55) * mix(1, r.runs.length ? 1 : 0, m) + (m > 0.5 ? 0.05 : 0)}
                />
              );
            });
          })}

          {/* POC: the price where the most business was done */}
          <line
            x1={axisX}
            x2={axisX + maxLen * 1.25}
            y1={rows[poc].y}
            y2={rows[poc].y}
            stroke={BRAND.softGold}
            strokeWidth={2}
            strokeDasharray="10 8"
            opacity={pocGlow}
          />
          <text x={axisX + maxLen * 1.25 + 14} y={rows[poc].y + 9} fontFamily={MONO.fontFamily} fontSize={26} fill={BRAND.softGold} opacity={pocGlow}>
            POC
          </text>
        </svg>
      </AbsoluteFill>
      <FinalReveal />
    </AbsoluteFill>
  );
};
