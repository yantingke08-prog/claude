// 第一名：订单流 —— 订单簿 → 成交与足迹 → 决策信号
//
// 画面里真的发生：大买单冲进来 → 卖一 180 手被逐笔吃光 → 最新价上跳一格 →
// 成交记进足迹 → Delta → 卖单砸向买一却跌不动（买一被反复补上 = 吸收）→ 斜向失衡 4:1。
// 七句口播，七层，一次只有一个主角在动。
import React from "react";
import { interpolate } from "remotion";
import { mix, prog } from "../anim.ts";
import { C, FPS, FS, MONO, SANS } from "../theme.ts";
import { Arrow, SvgLabel } from "../ui.tsx";
import type { ChartProps } from "./common.ts";

export const BOOK_W = 1728;
export const BOOK_H = 700;

// ---- 价格阶梯（上卖下买）
const PRICES = [101.75, 101.5, 101.25, 101.0, 100.75, 100.5, 100.25, 100.0, 99.75];
const ASK: Record<number, number> = { 101.75: 96, 101.5: 74, 101.25: 120, 101.0: 85, 100.75: 180 };
const BID: Record<number, number> = { 100.5: 260, 100.25: 140, 100.0: 110, 99.75: 70 };
const BIG = 180; // 大买单 = 卖一全部
const ROW_H = 58;
const TOP = 110;
const rowY = (p: number) => TOP + PRICES.indexOf(p) * ROW_H;
const fmt = (p: number) => p.toFixed(2);

// 列位置
const BK = { x: 20, bidX: 20, priceX: 200, askX: 360, w: 520 }; // 订单簿
const FP = { x: 640, w: 440 }; // 足迹
const SG = { x: 1200, w: 520 }; // 信号

// 足迹：价位 → [主动卖, 主动买]
const FOOT: [number, number, number][] = [
  [100.75, 18, BIG],
  [100.5, 64, 52],
  [100.25, 40, 88],
  [100.0, 22, 15],
];
const ABSORB_SELL = 166; // 砸在 100.50 的卖单
const sum = (k: 1 | 2) => FOOT.reduce((a, r) => a + r[k], 0);
const DELTA_1 = sum(2) - sum(1); // +191：买方更主动
const DELTA_2 = DELTA_1 - ABSORB_SELL; // +25：卖压涌入，Delta 收窄，价格却没跌

/** 订单簿 / 足迹里的数字（缩略图模式不画） */
const T: React.FC<React.SVGProps<SVGTextElement> & { bare?: boolean; children: React.ReactNode }> = ({ bare, ...props }) => (bare ? null : <text fontFamily={MONO} fontSize={FS.label} {...props} />);

export const OrderBook: React.FC<ChartProps> = ({ f, at, bare }) => {
  // 七句口播的触发点
  const tBook = at(0, 0);
  const tBig = at(1, 0);
  const tEat = at(1, 0.42);
  const tJump = at(2, 0);
  const tFoot = at(3, 0);
  const tDelta = at(4, 0);
  const tAbs = at(5, 0);
  const tImb = at(6, 0);

  // 1. 大买单飞向卖一
  const pFly = prog(f, tBig, 0.6);
  // 2. 卖一被逐笔吃掉（0.6 s）
  const pEat = prog(f, tEat, 0.6);
  const ask1 = Math.round(ASK[100.75] * (1 - pEat));
  // 3. 最新价上跳一格
  const pJump = prog(f, tJump, 0.45);
  // 6. 吸收：三笔卖单砸向 100.50，买一被吃又被补
  const hits = [0, 1, 2].map((k) => prog(f, tAbs + k * 0.32 * FPS, 0.28));
  const absorbDone = prog(f, tAbs + 1.05 * FPS, 0.3);
  const dip = interpolate(f, [tAbs, tAbs + 0.25 * FPS], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const lastPriceRow = mix(mix(PRICES.indexOf(100.5), PRICES.indexOf(100.75), pJump), PRICES.indexOf(100.5), dip);
  const bid1 = (() => {
    // 每笔砸下去先少 55，再被补回 260
    let v = BID[100.5];
    hits.forEach((h) => {
      if (h > 0 && h < 1) v = Math.round(BID[100.5] - 55 * Math.sin(h * Math.PI));
    });
    return v;
  })();
  const absorbedSell = Math.round(64 + ABSORB_SELL * Math.min(1, hits.reduce((a, b) => a + b, 0) / 3));
  const deltaNow = Math.round(mix(DELTA_1, DELTA_2, absorbDone));

  const maxSize = 260;
  const bar = (size: number) => (size / maxSize) * 150;
  const rowIn = (i: number) => prog(f, tBook + i * 0.06 * FPS, 0.25);

  return (
    <svg width={BOOK_W} height={BOOK_H} viewBox={`0 0 ${BOOK_W} ${BOOK_H}`}>
      {/* ===== 列标题 + 金色路径 ===== */}
      {!bare && (
        <>
          <SvgLabel f={f} at={tBook} x={BK.x + BK.w / 2} y={46} text="订单簿" color={C.white} anchor="middle" size={40} weight={700} />
          <SvgLabel f={f} at={tFoot + 0.45 * FPS} x={FP.x + FP.w / 2} y={46} text="成交与足迹" color={C.white} anchor="middle" size={40} weight={700} />
          <SvgLabel f={f} at={tDelta + 0.45 * FPS} x={SG.x + SG.w / 2} y={46} text="决策信号" color={C.goldHi} anchor="middle" size={40} weight={700} />
        </>
      )}
      <Arrow f={f} at={tFoot} x1={BK.x + BK.w - 40} y1={32} x2={FP.x + 8} y2={32} />
      <Arrow f={f} at={tDelta} x1={FP.x + FP.w + 6} y1={32} x2={SG.x + 8} y2={32} />

      {/* ===== 订单簿阶梯 ===== */}
      {PRICES.map((p, i) => {
        const o = rowIn(i);
        if (o <= 0) return null;
        const yy = rowY(p);
        const isAsk = p in ASK;
        const size = isAsk ? (p === 100.75 ? ask1 : ASK[p]) : p === 100.5 ? bid1 : BID[p];
        const col = isAsk ? C.down : C.up;
        const eatenFlash = p === 100.75 && pEat > 0 && pEat < 1 ? 0.35 : 0;
        return (
          <g key={p} opacity={o}>
            <rect x={BK.x} y={yy} width={BK.w} height={ROW_H - 6} fill={C.panel} stroke={C.lineSoft} />
            {eatenFlash > 0 && <rect x={BK.x} y={yy} width={BK.w} height={ROW_H - 6} fill={C.gold} opacity={eatenFlash} />}
            {isAsk ? (
              <rect x={BK.askX} y={yy + 8} width={bar(size)} height={ROW_H - 22} fill={col} opacity={0.35} />
            ) : (
              <rect x={BK.bidX + 160 - bar(size) * 0.95} y={yy + 8} width={bar(size) * 0.95} height={ROW_H - 22} fill={col} opacity={0.35} />
            )}
            <T bare={bare} x={BK.priceX + 70} y={yy + 37} fill={C.white2} textAnchor="middle">{fmt(p)}</T>
            {isAsk ? (
              <T bare={bare} x={BK.askX + 14} y={yy + 37} fill={size === 0 ? C.grey : C.down} fontWeight={700}>{size}</T>
            ) : (
              <T bare={bare} x={BK.bidX + 146} y={yy + 37} fill={C.up} fontWeight={700} textAnchor="end">{size}</T>
            )}
          </g>
        );
      })}
      {!bare && (
        <>
          <SvgLabel f={f} at={tBook + 2} x={BK.askX + 14} y={TOP - 16} text="卖单" color={C.down} size={26} weight={700} />
          <SvgLabel f={f} at={tBook + 0.3 * FPS} x={BK.bidX + 146} y={TOP + PRICES.length * ROW_H + 30} text="买单" color={C.up} anchor="end" size={26} weight={700} />
        </>
      )}

      {/* 最新价框（金色），会上跳、回踩 */}
      {rowIn(5) > 0 && (
        <g opacity={rowIn(5)}>
          <rect x={BK.priceX + 4} y={TOP + lastPriceRow * ROW_H + 2} width={132} height={ROW_H - 10} fill="none" stroke={C.gold} strokeWidth={3.5} rx={4} />
          <path d={`M${BK.priceX - 8} ${TOP + lastPriceRow * ROW_H + 13} l14 13 l-14 13 z`} fill={C.gold} />
        </g>
      )}
      {/* “上跳一格”写在卖盘行空着的买单区，吸收开始时收起 */}
      {!bare && pJump > 0 && (
        <g opacity={1 - prog(f, tAbs, 0.25)}>
          <SvgLabel f={f} at={tJump + 0.3 * FPS} x={BK.x + 18} y={rowY(100.75) + 38} text="↑ 上跳一格" color={C.goldHi} size={28} weight={700} />
        </g>
      )}

      {/* 大买单：从下方飞入卖一，被吃完后消失 */}
      {pFly > 0 && pEat < 1 && (
        <g transform={`translate(${mix(BK.askX - 40, BK.askX + 190, pFly)}, ${mix(rowY(99.75) + 70, rowY(100.75) + 4, pFly)})`} opacity={1 - pEat * 0.9}>
          <rect width={150} height={46} rx={6} fill={C.up} />
          {!bare && (
            <text x={75} y={32} textAnchor="middle" fontFamily={SANS} fontWeight={800} fontSize={26} fill={C.bg}>
              买 {Math.round(BIG * (1 - pEat))}
            </text>
          )}
        </g>
      )}

      {/* 吸收：三笔市价卖单砸向 100.50 */}
      {hits.map((h, k) =>
        h > 0 && h < 1 ? (
          <g key={k} transform={`translate(${mix(BK.bidX - 110, BK.bidX + 10, h)}, ${rowY(100.5) + 6})`} opacity={1 - h * 0.6}>
            <rect width={110} height={40} rx={6} fill={C.down} />
            {!bare && (
              <text x={55} y={29} textAnchor="middle" fontFamily={SANS} fontWeight={800} fontSize={24} fill={C.white}>
                卖 55
              </text>
            )}
          </g>
        ) : null,
      )}
      {/* 跌不动：金色地板线 */}
      {prog(f, tAbs + 1.0 * FPS, 0.35) > 0 && (
        <line x1={BK.x} x2={BK.x + BK.w * prog(f, tAbs + 1.0 * FPS, 0.35)} y1={rowY(100.5) + ROW_H - 4} y2={rowY(100.5) + ROW_H - 4} stroke={C.gold} strokeWidth={4} />
      )}

      {/* ===== 足迹 ===== */}
      {!bare && (
        <>
          <SvgLabel f={f} at={tFoot + 0.2 * FPS} x={FP.x + 150} y={rowY(101.0) + 36} text="主动卖" color={C.down} anchor="middle" size={26} />
          <SvgLabel f={f} at={tFoot + 0.2 * FPS} x={FP.x + 330} y={rowY(101.0) + 36} text="主动买" color={C.up} anchor="middle" size={26} />
        </>
      )}
      {FOOT.map(([p, sell, buy], k) => {
        // 自下而上逐格写入
        const pc = prog(f, tFoot + (0.25 + (FOOT.length - 1 - k) * 0.16) * FPS, 0.25);
        if (pc <= 0) return null;
        const yy = rowY(p);
        const s = p === 100.5 ? absorbedSell : sell;
        const imb = p === 100.25 || p === 100.0;
        const pImb = prog(f, tImb, 0.35);
        const big = p === 100.75;
        return (
          <g key={p} opacity={pc}>
            <rect x={FP.x + 60} y={yy} width={180} height={ROW_H - 6} fill={C.down} fillOpacity={Math.min(0.55, s / 300)} stroke={C.lineSoft} />
            <rect x={FP.x + 240} y={yy} width={180} height={ROW_H - 6} fill={C.up} fillOpacity={Math.min(0.55, buy / 300)} stroke={C.lineSoft} />
            {big && <rect x={FP.x + 240} y={yy} width={180} height={ROW_H - 6} fill="none" stroke={C.up} strokeWidth={3} />}
            {imb && pImb > 0 && <rect x={p === 100.25 ? FP.x + 240 : FP.x + 60} y={yy} width={180} height={ROW_H - 6} fill="none" stroke={C.gold} strokeWidth={4} opacity={pImb} />}
            <T bare={bare} x={FP.x + 150} y={yy + 37} fill={C.white} textAnchor="middle" fontWeight={p === 100.5 && hits[0] > 0 ? 800 : 500}>{s}</T>
            <T bare={bare} x={FP.x + 330} y={yy + 37} fill={C.white} textAnchor="middle" fontWeight={big ? 800 : 500}>{buy}</T>
          </g>
        );
      })}
      {/* 失衡：斜向对比 88 vs 22 */}
      {(() => {
        const p = prog(f, tImb + 0.2 * FPS, 0.4);
        if (p <= 0) return null;
        const x1 = FP.x + 330;
        const y1 = rowY(100.25) + ROW_H - 8;
        const x2 = FP.x + 150;
        const y2 = rowY(100.0) + 6;
        return <line x1={x1} y1={y1} x2={mix(x1, x2, p)} y2={mix(y1, y2, p)} stroke={C.gold} strokeWidth={3} strokeDasharray="7 6" />;
      })()}
      {/* 足迹左侧的 K 线实体：100.00 → 100.75 */}
      {prog(f, tFoot + 0.9 * FPS, 0.3) > 0 && (
        <g opacity={prog(f, tFoot + 0.9 * FPS, 0.3)}>
          <line x1={FP.x + 25} x2={FP.x + 25} y1={rowY(100.75) + 4} y2={rowY(100.0) + ROW_H - 10} stroke={C.up} strokeWidth={2} />
          <rect x={FP.x + 14} y={rowY(100.75) + 10} width={22} height={rowY(100.25) - rowY(100.75) + ROW_H - 26} fill={C.up} />
        </g>
      )}

      {/* ===== 决策信号 ===== */}
      <Signal f={f} at={tDelta + 0.3 * FPS} y={TOP} bare={bare} title="Delta" color={deltaNow >= 0 ? C.up : C.down}>
        {/* Delta 横条：零轴居中 */}
        {(() => {
          const pBar = prog(f, tDelta + 0.6 * FPS, 0.45);
          const w = Math.min(1, Math.abs(deltaNow) / DELTA_1) * 220 * pBar;
          const zx = SG.x + 260;
          return (
            <g>
              <line x1={zx} x2={zx} y1={TOP + 70} y2={TOP + 118} stroke={C.white2} strokeWidth={2} />
              <rect x={deltaNow >= 0 ? zx : zx - w} y={TOP + 78} width={Math.max(2, w)} height={32} fill={deltaNow >= 0 ? C.up : C.down} />
              {!bare && (
                <text x={SG.x + SG.w - 24} y={TOP + 46} textAnchor="end" fontFamily={MONO} fontWeight={800} fontSize={34} fill={deltaNow >= 0 ? C.up : C.down} opacity={pBar}>
                  {deltaNow >= 0 ? "+" : ""}
                  {deltaNow}
                </text>
              )}
            </g>
          );
        })()}
      </Signal>
      <Signal f={f} at={tAbs + 1.15 * FPS} y={TOP + 190} bare={bare} title="吸收" color={C.goldHi} note="卖压被买一接住，价格不跌" />
      <Signal f={f} at={tImb + 0.5 * FPS} y={TOP + 350} bare={bare} title="失衡 4:1" color={C.up} note="买盘远远压过卖盘" />
    </svg>
  );
};

/** 右侧信号卡：高度展开 + 文字成组出现 */
const Signal: React.FC<{ f: number; at: number; y: number; title: string; color: string; note?: string; bare?: boolean; children?: React.ReactNode }> = ({ f, at, y, title, color, note, bare, children }) => {
  const p = prog(f, at, 0.35);
  if (p <= 0) return null;
  const h = 140;
  return (
    <g>
      <rect x={SG.x} y={y} width={SG.w} height={h * p} rx={6} fill={C.panel} stroke={color} strokeWidth={2} />
      {p > 0.6 && (
        <g opacity={(p - 0.6) / 0.4}>
          {!bare && (
            <>
              <text x={SG.x + 24} y={y + 46} fontFamily={SANS} fontWeight={800} fontSize={34} fill={color}>
                {title}
              </text>
              {note && (
                <text x={SG.x + 24} y={y + 104} fontFamily={SANS} fontWeight={500} fontSize={28} fill={C.white} opacity={prog(f, at + 0.25 * FPS, 0.3)}>
                  {note}
                </text>
              )}
            </>
          )}
          {children}
        </g>
      )}
    </g>
  );
};
