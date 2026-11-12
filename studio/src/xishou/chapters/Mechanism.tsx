// 03 吸收的机制 — macro → micro: the chart zooms into the key price, then DOM and Footprint open.
import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { keys, lin, mix, prog } from "../anim";
import { Candles, HLine, makeScale, PriceAxis, Zone } from "../components/Chart";
import { Panel, Tag } from "../components/Frame";
import { DOMLadder, domRefills, FootprintChart } from "../components/OrderFlow";
import { ABSORB, DOM_PRICES, KEY_LEVEL, PRE, ZONE } from "../market";
import { at, chapter } from "../script";
import { C, FONT, H, T, W } from "../theme";

const PRE_TAIL = PRE.slice(-6);

export const Mechanism: React.FC = () => {
  const f = useCurrentFrame();
  const ch = chapter("mechanism");
  // 1) price-axis zoom into the zone (data zoom, not a camera shake)
  const z = prog(f, 0, 46);
  const domIn = prog(f, at(ch, 0, 0.15), 20);
  const chartW = mix(952, 420, domIn);
  const s = makeScale(84, 360, chartW - 110, 450, PRE_TAIL.length + ABSORB.length, mix(95, 99.0, z), mix(103.5, 100.75, z));
  const dom = { x: 520, y: 380, w: 476, h: 440 };
  const rowH = dom.h / DOM_PRICES.length;
  const wallY = dom.y + DOM_PRICES.indexOf(ZONE.lo) * rowH + rowH / 2;
  const initTag = prog(f, at(ch, 0, 0.45), 14);
  const respTag = prog(f, at(ch, 1, 0.2), 14);
  const refillTag = prog(f, at(ch, 2, 0.35), 14);
  const fpIn = prog(f, at(ch, 3, 0), 18);
  const fpGrow = lin(f, at(ch, 3, 0.05), Math.max(30, ch.speechDur[3] * 0.7));
  const band = prog(f, at(ch, 3, 0.7), 18);
  const absorbed = prog(f, at(ch, 4, 0.55), 16);
  const nextQ = prog(f, at(ch, 5, 0.3), 24);
  const refills = domRefills(f - at(ch, 0, 0.15));
  const lastX = s.X(PRE_TAIL.length + ABSORB.length - 1) + s.cw / 2;
  return (
    <AbsoluteFill>
      <Panel x={64} y={296} w={chartW} h={560} title="K 线 · 关键价位" en="ZOOM" accent={absorbed > 0 ? `${C.amber}88` : C.border} />
      <svg width={W} height={H} style={{ position: "absolute" }}>
        <defs>
          <clipPath id="xs-mech-clip">
            <rect x={64} y={340} width={chartW} height={500} />
          </clipPath>
        </defs>
        <g clipPath="url(#xs-mech-clip)">
        <PriceAxis s={s} step={z > 0.6 ? 0.5 : 2} o={0.8} />
        <HLine s={s} p={KEY_LEVEL} draw={1} color={C.cyan} dash="6 6" width={1.5} />
        <Zone s={s} lo={ZONE.lo} hi={ZONE.hi} from={PRE_TAIL.length} to={PRE_TAIL.length + ABSORB.length - 1} grow={prog(f, 20, 26)} />
        <Candles s={s} data={PRE_TAIL} from={0} reveal={PRE_TAIL.length} />
        <Candles s={s} data={ABSORB} from={PRE_TAIL.length} reveal={ABSORB.length} />
        {/* "has price moved after the big orders?" — the time axis extends into the unknown */}
        {nextQ > 0 ? (
          <g opacity={nextQ}>
            <line x1={lastX + 4} x2={lastX + 4 + 60 * nextQ} y1={s.Y(99.9)} y2={s.Y(99.9)} stroke={C.amber} strokeWidth={2} strokeDasharray="5 5" />
            <text x={lastX + 14} y={s.Y(99.9) - 18} fill={C.amber} fontFamily={FONT} fontSize={T.l} fontWeight={700}>
              ?
            </text>
          </g>
        ) : null}
        </g>
      </svg>
      {domIn > 0 ? (
        <div style={{ position: "absolute", inset: 0, clipPath: `inset(${296}px ${1080 - 1016}px ${1920 - 296 - 560 * domIn}px 504px)` }}>
          <Panel x={504} y={296} w={512} h={560} title="订单簿" en="DOM" />
          <svg width={W} height={H} style={{ position: "absolute" }}>
            <DOMLadder x={dom.x} y={dom.y} w={dom.w} h={dom.h} f={f - at(ch, 0, 0.15)} focusWall={respTag} />
          </svg>
        </div>
      ) : null}
      <Tag x={810} y={862} ax={dom.x + dom.w - 30} ay={wallY} text="主动盘 · 市价卖单" en="INITIATIVE" color={C.redText} o={initTag * (1 - fpIn)} size={T.xs} align="center" />
      <Tag x={300} y={862} ax={dom.x + 120} ay={wallY} text="响应盘 · 限价买单" en="RESPONSIVE" color={C.greenText} o={respTag * (1 - fpIn)} size={T.xs} align="center" />
      <Tag x={870} y={330} text={`被吃掉 → 补回 ×${Math.max(1, refills)}`} color={C.greenText} o={refillTag} size={T.xs} align="center" />
      {fpIn > 0 ? (
        <div style={{ position: "absolute", inset: 0, opacity: fpIn, transform: `translateY(${(1 - fpIn) * 14}px)` }}>
          <Panel x={64} y={904} w={952} h={440} title="足迹图" en="FOOTPRINT · 事后确认" />
          <svg width={W} height={H} style={{ position: "absolute" }}>
            <FootprintChart x={100} y={950} w={880} h={340} grow={fpGrow} band={band} />
          </svg>
        </div>
      ) : null}
      <Tag x={540} y={1236} text="下方没有成交 · 价格不创新低" color={C.sub} o={absorbed} size={T.xs} align="center" />
      {absorbed > 0 ? (
        <Tag x={540} y={880} text="卖单在打 · 价格不走 = 吸收" en="ABSORPTION" color={C.amber} o={absorbed} size={T.s} align="center" />
      ) : null}
    </AbsoluteFill>
  );
};
