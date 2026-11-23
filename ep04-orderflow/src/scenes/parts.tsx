// Reusable set pieces: order book ladder and the three-forces pillars.
import React from "react";
import { At, Box, C, HLine, MONO, Tag, clamp01, pop } from "../kit";

// ---------- order book ladder ----------
export const BOOK = { cx: 540, top: 490, rowH: 74, maxLvl: 5, minLvl: -5, unit: 120, gap: 84, slabH: 50 };
export const yOf = (lvl: number) => BOOK.top + (BOOK.maxLvl - lvl) * BOOK.rowH;
export const priceText = (lvl: number) => (10 + Math.round(lvl) * 0.01).toFixed(2);
export const askEdge = BOOK.cx + BOOK.gap; // asks grow to the right from here
export const bidEdge = BOOK.cx - BOOK.gap; // bids grow to the left from here

export type BookProps = {
  mid: number; // last traded level (float for smooth marker)
  ask: (lvl: number) => number; // resting size (1 ≈ 120 px)
  bid: (lvl: number) => number;
  glowAsk?: (lvl: number) => number;
  glowBid?: (lvl: number) => number;
  o?: number;
  dimRows?: number; // 0..1 dim everything except the current price
};

export const Book: React.FC<BookProps> = ({ mid, ask, bid, glowAsk, glowBid, o = 1, dimRows = 0 }) => {
  const rows: number[] = [];
  for (let l = BOOK.maxLvl; l >= BOOK.minLvl; l--) rows.push(l);
  const cur = Math.round(mid);
  return (
    <div style={{ position: "absolute", left: 0, top: 0, transformStyle: "preserve-3d", opacity: o }}>
      {rows.map((l) => {
        const y = yOf(l);
        const a = Math.max(0, ask(l)) * BOOK.unit;
        const b = Math.max(0, bid(l)) * BOOK.unit;
        const rowO = 1 - dimRows * 0.7;
        return (
          <React.Fragment key={l}>
            <div
              style={{
                position: "absolute",
                left: BOOK.cx - 70,
                top: y - 22,
                width: 140,
                height: 44,
                textAlign: "center",
                lineHeight: "44px",
                fontFamily: MONO,
                fontSize: 32,
                fontWeight: 700,
                color: l === cur ? "#ffffff" : C.dim,
                opacity: l === cur ? 1 : rowO,
              }}
            >
              {priceText(l)}
            </div>
            <Box x={askEdge} y={y - BOOK.slabH / 2} w={a} h={BOOK.slabH} d={30} color={C.passive} dark={C.passiveD} glow={glowAsk?.(l) ?? 0} o={rowO * 0.92} />
            <Box x={bidEdge - b} y={y - BOOK.slabH / 2} w={b} h={BOOK.slabH} d={30} color={C.passive} dark={C.passiveD} glow={glowBid?.(l) ?? 0} o={rowO * 0.92} />
          </React.Fragment>
        );
      })}
      {/* current price marker: two bright bars bracketing the price */}
      <HLine x={BOOK.cx - 84} y={yOf(mid) - 26} w={168} color="#ffffff" thick={3} />
      <HLine x={BOOK.cx - 84} y={yOf(mid) + 26} w={168} color="#ffffff" thick={3} />
    </div>
  );
};

/** default resting sizes: a lumpy but deterministic book */
export const baseSize = (lvl: number) => 0.7 + 0.45 * Math.abs(Math.sin(lvl * 1.7 + 0.4));

// ---------- three forces pillars ----------
export const PILLAR_X = [230, 540, 850];
export const PILLAR_COL: [string, string][] = [
  [C.up, C.upD],
  [C.passive, C.passiveD],
  [C.forced, C.forcedD],
];
export const PILLAR_BASE = 1140;
const BLOCK_H = 84;
const BLOCK_GAP = 12;
export const pillarTop = (n = 4) => PILLAR_BASE - n * (BLOCK_H + BLOCK_GAP);

/**
 * p[k] 0..1 builds pillar k block by block; style differs per force:
 * 0 主动 blocks shoot in from the left, 1 被动 blocks settle from above, 2 被迫 blocks are shoved up from the floor.
 */
export const Pillars: React.FC<{
  p: number[];
  glow?: number[];
  tags?: { text: string; o: number }[];
  spread?: number; // 1 = normal spacing, <1 pulls pillars together
  w?: number;
}> = ({ p, glow = [0, 0, 0], tags, spread = 1, w = 170 }) => (
  <>
    {PILLAR_X.map((x0, k) => {
      const x = 540 + (x0 - 540) * spread;
      const [col, dark] = PILLAR_COL[k];
      const blocks = [0, 1, 2, 3].map((b) => {
        const local = clamp01(p[k] * 4 - b);
        if (local <= 0) return null;
        const e = pop(local, 0, 1);
        const y = PILLAR_BASE - (b + 1) * (BLOCK_H + BLOCK_GAP);
        const dx = k === 0 ? (1 - e) * -420 : 0;
        const dy = k === 1 ? (1 - e) * -260 : k === 2 ? (1 - e) * 160 : 0;
        return (
          <At key={b} x={x - w / 2 + dx} y={y + dy} o={clamp01(local * 3)}>
            <Box x={0} y={0} w={w} h={BLOCK_H} d={w * 0.55} color={col} dark={dark} glow={glow[k]} />
          </At>
        );
      });
      const tag = tags?.[k];
      return (
        <React.Fragment key={k}>
          {blocks}
          {tag && <Tag x={x} y={PILLAR_BASE + 36} text={tag.text} color={col} align="center" size={42} o={tag.o} />}
        </React.Fragment>
      );
    })}
  </>
);
