import React from "react";
import { candlesFrom, mix, prog, textIn } from "./anim.ts";
import { FINAL, keyed, type ChartProps } from "./charts/common.ts";
import { IndicatorChart } from "./charts/IndicatorChart.tsx";
import { NakedKChart } from "./charts/NakedKChart.tsx";
import { BOOK_H, BOOK_W, OrderBook } from "./charts/OrderBook.tsx";
import { PriceActionChart } from "./charts/PriceActionChart.tsx";
import { WyckoffChart } from "./charts/WyckoffChart.tsx";
import { CONCLUSION, MINDMAP, ORDER, SCHOOLS, type SchoolKey } from "./content.ts";
import { easeInOut } from "./anim.ts";
import { IntroFx } from "./intro.tsx";
import { C, FPS, FS, HEIGHT, L, SANS, SERIF, WIDTH } from "./theme.ts";
import type { SceneSpan } from "./timeline.ts";
import { Arrow, Candles, ChartTitle, PageTitle, Panel, ProsCons, Stroke, SvgLabel } from "./ui.tsx";

export type SceneProps = { span: SceneSpan; f: number };

/** at(i, frac)：第 i 句开始 + frac × 句长（页内帧） */
const atOf = (span: SceneSpan) => (i: number, frac = 0) => {
  const s = span.segs[Math.min(i, span.segs.length - 1)];
  return span.cues[Math.min(i, span.cues.length - 1)] + frac * (s.endF - s.startF);
};

const CHARTS: Partial<Record<SchoolKey, React.FC<ChartProps>>> = {
  indicator: IndicatorChart,
  nakedK: NakedKChart,
  priceAction: PriceActionChart,
  wyckoff: WyckoffChart,
};

// ------------------------------------------------------------------ 开场（见 intro.tsx）
export const Intro: React.FC<SceneProps> = ({ span, f }) => <IntroFx span={span} f={f} at={atOf(span)} />;

// ------------------------------------------------------------------ 名次揭晓
export const Rank: React.FC<SceneProps> = ({ span, f }) => {
  const s = SCHOOLS[span.school as SchoolKey];
  const p = prog(f, 0, 0.45);
  const top = s.rank === 1;
  return (
    <div style={{ position: "absolute", inset: 0 }}>
      <div
        style={{
          position: "absolute",
          left: 330,
          top: 40,
          width: 640,
          textAlign: "center",
          fontFamily: SERIF,
          fontWeight: 900,
          fontSize: FS.rankDigit,
          lineHeight: 1.6,
          color: top ? C.goldHi : C.gold,
          textShadow: top ? `0 0 60px rgba(244,215,122,0.35)` : "none",
          opacity: p,
          transform: `scale(${mix(1.06, 1, p)})`,
        }}
      >
        {s.rank}
      </div>
      <div style={{ position: "absolute", left: 1040, top: 360 }}>
        <div style={{ fontFamily: SANS, fontWeight: 600, fontSize: FS.rankLabel, color: C.white2, ...textIn(f, 0.22 * FPS) }}>{s.rankText}</div>
        <div style={{ marginTop: 18, height: 4, width: 340 * prog(f, 0.4 * FPS, 0.4), background: C.gold }} />
        <div style={{ marginTop: 28, fontFamily: SANS, fontWeight: 800, fontSize: FS.school + 4, color: C.white, ...textIn(f, 0.42 * FPS) }}>{s.name}</div>
      </div>
      {/* 名次进度 */}
      <div style={{ position: "absolute", left: 1040, top: 640, display: "flex", gap: 18, ...textIn(f, 0.6 * FPS) }}>
        {ORDER.map((k) => {
          const r = SCHOOLS[k].rank;
          const cur = r === s.rank;
          const done = r > s.rank;
          return (
            <div key={k} style={{ width: 56, height: 56, borderRadius: 4, border: `1.5px solid ${cur ? C.gold : C.line}`, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: SERIF, fontWeight: 800, fontSize: 30, color: cur ? C.goldHi : done ? C.white2 : C.grey }}>
              {r}
            </div>
          );
        })}
      </div>
    </div>
  );
};

// ------------------------------------------------------------------ 核心概念图
export const Concept: React.FC<SceneProps> = ({ span, f }) => {
  const s = SCHOOLS[span.school as SchoolKey];
  const Chart = CHARTS[s.key];
  if (!Chart) return null;
  return (
    <div style={{ position: "absolute", inset: 0 }}>
      <PageTitle f={f} rank={s.rank} name={s.name} />
      <Panel x={160} y={L.stageTop + 6} w={1600} h={700}>
        <ChartTitle f={f} at={2} text={s.chartTitle} x={30} y={22} />
        <div style={{ position: "absolute", left: 30, top: 100 }}>
          <Chart f={f} at={atOf(span)} />
        </div>
      </Panel>
    </div>
  );
};

// ------------------------------------------------------------------ 优缺点卡
export const Cards: React.FC<SceneProps> = ({ span, f }) => {
  const s = SCHOOLS[span.school as SchoolKey];
  const at = atOf(span);
  const riskIdx = Math.max(0, span.segs.findIndex((g) => g.risk));
  const Chart = CHARTS[s.key];
  return (
    <div style={{ position: "absolute", inset: 0 }}>
      <PageTitle f={f} rank={s.rank} name={s.name} />
      <Panel x={L.margin} y={L.stageTop + 6} w={900} h={400}>
        <div style={{ position: "absolute", left: 20, top: 36, transformOrigin: "0 0", transform: Chart ? `scale(${860 / 1540})` : `scale(${860 / BOOK_W})` }}>
          {Chart ? <Chart {...FINAL} bare /> : <OrderBook {...FINAL} bare />}
        </div>
      </Panel>
      <div style={{ position: "absolute", left: L.margin, top: 640, ...textIn(f, 0.1 * FPS) }}>
        <div style={{ fontFamily: SANS, fontSize: 26, color: C.white2 }}>一句话</div>
        <div style={{ marginTop: 8, fontFamily: SANS, fontWeight: 700, fontSize: 44, color: C.white }}>{s.essence}</div>
      </div>
      <ProsCons f={f} at={at(0, 0)} kind="pro" points={s.pros} x={1060} y={L.stageTop + 6} w={764} />
      <ProsCons f={f} at={at(riskIdx, 0)} kind="con" points={s.cons} x={1060} y={L.stageTop + 6 + 334} w={764} />
    </div>
  );
};

// ------------------------------------------------------------------ 订单流 1：痕迹 vs 推动
const TRACE = candlesFrom(keyed(15, [[0, 50], [4, 53.2], [6, 52], [10, 56.4], [11, 55.6], [14, 59]], 101, 0.55), 102, 0.5);
export const OfTrace: React.FC<SceneProps> = ({ span, f }) => {
  const at = atOf(span);
  const t1 = at(1, 0);
  const steps = [0, 1, 2, 3].map((k) => prog(f, t1 + (0.35 + k * 0.38) * FPS, 0.3));
  const level = steps.reduce((a, b) => a + b, 0); // 0..4 跳
  const tickH = 52;
  const base = 470;
  return (
    <div style={{ position: "absolute", inset: 0 }}>
      <PageTitle f={f} rank={1} name="订单流" />
      <Panel x={L.margin} y={L.stageTop + 6} w={840} h={690}>
        <ChartTitle f={f} at={at(0, 0)} text="前四名：看结果" x={30} y={22} color={C.white2} />
        <div style={{ position: "absolute", left: 30, top: 96, display: "flex", gap: 14 }}>
          {["指标", "K线", "结构", "量价"].map((t, k) => (
            <div key={t} style={{ padding: "6px 18px", border: `1.5px solid ${C.line}`, borderRadius: 4, fontFamily: SANS, fontSize: 28, color: C.white2, ...textIn(f, at(0, 0.15 + k * 0.1)) }}>
              {t}
            </div>
          ))}
        </div>
        <svg width={780} height={430} style={{ position: "absolute", left: 30, top: 170 }}>
          <Candles f={f} at={at(0, 0.1)} data={TRACE} x={(i) => 40 + i * 50} y={(v) => 400 - (v - 48) * 32} bw={22} step={0.04} color={() => "#9AA2AD"} />
          <SvgLabel f={f} at={at(0, 0.6)} x={390} y={420} text="价格留下的痕迹" color={C.white2} anchor="middle" size={32} />
        </svg>
      </Panel>
      <Panel x={984} y={L.stageTop + 6} w={840} h={690} style={{ borderColor: prog(f, t1, 0.3) > 0 ? C.gold : C.line, opacity: prog(f, t1, 0.3) }}>
        <ChartTitle f={f} at={t1} text="订单流：看推动" x={30} y={22} color={C.goldHi} />
        <svg width={780} height={560} style={{ position: "absolute", left: 30, top: 100 }}>
          {/* 价格刻度 */}
          {[0, 1, 2, 3, 4, 5].map((k) => (
            <g key={k} opacity={prog(f, t1, 0.3)}>
              <line x1={360} x2={700} y1={base + 26 - k * tickH} y2={base + 26 - k * tickH} stroke={C.lineSoft} />
              <text x={720} y={base + 34 - k * tickH} fontFamily={SANS} fontSize={24} fill={C.white2}>
                {(100 + k * 0.25).toFixed(2)}
              </text>
            </g>
          ))}
          {/* 被成交推高的 K 线 */}
          {prog(f, t1 + 0.2 * FPS, 0.25) > 0 && <rect x={500} y={base + 26 - level * tickH - 8} width={60} height={Math.max(8, level * tickH + 8)} fill={C.up} />}
          {/* 逐笔主动买 */}
          {steps.map((p, k) =>
            p > 0 && p < 1 ? (
              <g key={k} transform={`translate(${mix(60, 380, p)}, ${base - k * tickH - 4})`} opacity={1 - p * 0.5}>
                <rect width={110} height={40} rx={6} fill={C.up} />
                <text x={55} y={29} textAnchor="middle" fontFamily={SANS} fontWeight={800} fontSize={24} fill={C.bg}>
                  买 60
                </text>
              </g>
            ) : null,
          )}
          <SvgLabel f={f} at={t1 + 1.9 * FPS} x={60} y={170} text="主动买单" color={C.up} size={30} weight={700} />
          <SvgLabel f={f} at={t1 + 2.1 * FPS} x={60} y={216} text="一笔笔推高价格" color={C.white} size={30} />
        </svg>
      </Panel>
    </div>
  );
};

// ------------------------------------------------------------------ 订单流 2：订单簿 → 足迹 → 信号
export const OfBook: React.FC<SceneProps> = ({ span, f }) => (
  <div style={{ position: "absolute", inset: 0 }}>
    <PageTitle f={f} rank={1} name="订单流" />
    <div style={{ position: "absolute", left: L.margin, top: L.stageTop }}>
      <OrderBook f={f} at={atOf(span)} />
    </div>
  </div>
);

// ------------------------------------------------------------------ 订单流 3：金色路径
const NODES = [
  { name: "订单簿", note: "挂单在哪里" },
  { name: "成交与足迹", note: "谁在主动成交" },
  { name: "决策信号", note: "吸收 · 失衡 · Delta" },
];
export const OfPath: React.FC<SceneProps> = ({ span, f }) => {
  const at = atOf(span);
  const tNode = [at(0, 0), at(0, 0.3), at(0, 0.62)];
  const NX = [130, 730, 1330];
  const NW = 460;
  const NY = 280;
  const NH = 300;
  const tEnd = at(1, 0);
  return (
    <div style={{ position: "absolute", inset: 0 }}>
      <PageTitle f={f} rank={1} name="订单流" />
      {NODES.map((n, k) => {
        const p = prog(f, tNode[k], 0.35);
        const last = k === 2;
        return (
          <div key={n.name} style={{ position: "absolute", left: NX[k], top: NY, width: NW, height: NH, opacity: p, transform: `translateY(${(1 - p) * 10}px)` }}>
            <Panel x={0} y={0} w={NW} h={NH} style={{ borderColor: last ? C.gold : C.line }}>
              <MiniIcon kind={k} />
              <div style={{ position: "absolute", left: 0, top: 168, width: NW, textAlign: "center", fontFamily: SANS, fontWeight: 800, fontSize: 46, color: last ? C.goldHi : C.white }}>{n.name}</div>
              <div style={{ position: "absolute", left: 0, top: 236, width: NW, textAlign: "center", fontFamily: SANS, fontSize: 28, color: C.white2 }}>{n.note}</div>
            </Panel>
          </div>
        );
      })}
      <svg width={WIDTH} height={HEIGHT} style={{ position: "absolute", left: 0, top: 0 }}>
        <Arrow f={f} at={tNode[1] - 0.45 * FPS} x1={NX[0] + NW + 12} y1={NY + NH / 2} x2={NX[1] - 12} y2={NY + NH / 2} width={7} dur={0.45} />
        <Arrow f={f} at={tNode[2] - 0.45 * FPS} x1={NX[1] + NW + 12} y1={NY + NH / 2} x2={NX[2] - 12} y2={NY + NH / 2} width={7} dur={0.45} />
      </svg>
      <div style={{ position: "absolute", top: 660, width: WIDTH, textAlign: "center", fontFamily: SERIF, fontWeight: 800, fontSize: 64, color: C.goldHi, ...textIn(f, tEnd, 0.35) }}>离真相最近的一层</div>
      <div style={{ position: "absolute", top: 760, width: WIDTH, display: "flex", justifyContent: "center" }}>
        <div style={{ width: 560 * prog(f, tEnd + 0.3 * FPS, 0.5), height: 3, background: C.gold }} />
      </div>
    </div>
  );
};

const MiniIcon: React.FC<{ kind: number }> = ({ kind }) => (
  <svg width={460} height={150} style={{ position: "absolute", left: 0, top: 18 }}>
    {kind === 0 &&
      [0, 1, 2, 3, 4, 5].map((i) => (
        <rect key={i} x={i < 3 ? 230 : 230 - [90, 120, 70][i - 3]} y={10 + i * 21} width={i < 3 ? [60, 80, 110][i] : [90, 120, 70][i - 3]} height={16} fill={i < 3 ? C.down : C.up} opacity={0.6} />
      ))}
    {kind === 1 &&
      [0, 1, 2, 3, 4].map((i) => (
        <g key={i}>
          <rect x={160} y={8 + i * 25} width={70} height={22} fill={C.down} opacity={[0.2, 0.35, 0.25, 0.5, 0.2][i]} />
          <rect x={232} y={8 + i * 25} width={70} height={22} fill={C.up} opacity={[0.3, 0.6, 0.25, 0.3, 0.2][i]} />
        </g>
      ))}
    {kind === 2 && (
      <g>
        <circle cx={230} cy={68} r={52} fill="none" stroke={C.gold} strokeWidth={5} />
        <path d="M204 70 l18 18 l34 -38" fill="none" stroke={C.goldHi} strokeWidth={8} strokeLinecap="round" strokeLinejoin="round" />
      </g>
    )}
  </svg>
);

// ------------------------------------------------------------------ 片尾：白底思维导图
export const Ending: React.FC<SceneProps> = ({ span, f }) => {
  const at = atOf(span);
  const tMap = at(0, 0);
  const tEnd = at(1, 0);
  // 缓慢平移 + 轻微缩放，在结论句出现后 1 秒落定
  const cam = prog(f, 0, Math.max(1, (tEnd + 1.0 * FPS) / FPS), easeInOut);
  const sc = mix(1.12, 1.0, cam);
  const tx = mix(-90, 0, cam);
  const ty = mix(40, 0, cam);
  const cx = 960;
  const cy = 450;
  const left = [0, 1, 2];
  const pos = MINDMAP.branches.map((_, i) => {
    const isLeft = left.includes(i);
    const row = i % 3;
    return { x: isLeft ? 560 : 1360, y: 230 + row * 220, side: isLeft ? -1 : 1 };
  });
  const branchAt = (i: number) => tMap + (0.25 + i * 0.32) * FPS;
  const dim = 1 - 0.7 * prog(f, tEnd, 0.4);
  return (
    <div style={{ position: "absolute", inset: 0, background: C.paper }}>
      <div style={{ position: "absolute", inset: 0, transform: `translate(${tx}px, ${ty}px) scale(${sc})`, transformOrigin: "50% 45%", opacity: dim }}>
        <svg width={WIDTH} height={HEIGHT} style={{ position: "absolute", inset: 0 }}>
          {MINDMAP.branches.map((b, i) => {
            const p = pos[i];
            const key = "key" in b && b.key;
            const col = key ? C.gold : "#8A8F98";
            const d = `M${cx + p.side * 130} ${cy} C ${cx + p.side * 260} ${cy}, ${p.x - p.side * 200} ${p.y}, ${p.x - p.side * 110} ${p.y}`;
            return (
              <g key={b.name}>
                <Stroke d={d} p={prog(f, branchAt(i), 0.45)} color={col} width={key ? 4 : 2.5} />
                {b.leaves.map((_, j) => {
                  const ly = p.y - 46 + j * 92;
                  const lx = p.x + p.side * 300;
                  const dd = `M${p.x + p.side * 110} ${p.y} C ${p.x + p.side * 160} ${p.y}, ${lx - p.side * 120} ${ly}, ${lx - p.side * 85} ${ly}`;
                  return <Stroke key={j} d={dd} p={prog(f, branchAt(i) + (0.3 + j * 0.08) * FPS, 0.35)} color={col} width={2} />;
                })}
              </g>
            );
          })}
        </svg>
        <MapNode f={f} at={tMap} x={cx} y={cy} w={260} h={96} text={MINDMAP.center} size={44} solid />
        {MINDMAP.branches.map((b, i) => {
          const p = pos[i];
          const key = "key" in b && b.key;
          return (
            <React.Fragment key={b.name}>
              <MapNode f={f} at={branchAt(i) + 0.3 * FPS} x={p.x} y={p.y} w={220} h={70} text={b.name} size={32} gold={!!key} />
              {b.leaves.map((leaf, j) => (
                <MapNode key={leaf} f={f} at={branchAt(i) + (0.55 + j * 0.08) * FPS} x={p.x + p.side * 300} y={p.y - 46 + j * 92} w={170} h={52} text={leaf} size={26} light gold={!!key} />
              ))}
            </React.Fragment>
          );
        })}
      </div>
      {/* 结论：先铺一条纸色衬底，把导图压到后面 */}
      <div style={{ position: "absolute", left: 0, top: 300, width: WIDTH, height: 310, background: `linear-gradient(180deg, rgba(244,242,236,0) 0%, ${C.paper} 18%, ${C.paper} 82%, rgba(244,242,236,0) 100%)`, opacity: 0.94 * prog(f, tEnd, 0.35) }} />
      <div style={{ position: "absolute", top: 330, width: WIDTH, textAlign: "center", fontFamily: SERIF, fontWeight: 800, fontSize: 72, color: C.ink, ...textIn(f, tEnd, 0.4) }}>{CONCLUSION.a}</div>
      <div style={{ position: "absolute", top: 450, width: WIDTH, textAlign: "center", fontFamily: SERIF, fontWeight: 800, fontSize: 72, color: C.ink, ...textIn(f, tEnd + 0.45 * FPS, 0.4) }}>
        只有最适合<span style={{ color: "#A8841C" }}>你性格</span>的系统。
      </div>
      <div style={{ position: "absolute", top: 572, width: WIDTH, display: "flex", justifyContent: "center" }}>
        <div style={{ width: 620 * prog(f, tEnd + 0.8 * FPS, 0.5), height: 4, background: C.gold }} />
      </div>
    </div>
  );
};

const MapNode: React.FC<{ f: number; at: number; x: number; y: number; w: number; h: number; text: string; size: number; solid?: boolean; light?: boolean; gold?: boolean }> = ({ f, at, x, y, w, h, text, size, solid, light, gold }) => (
  <div
    style={{
      position: "absolute",
      left: x - w / 2,
      top: y - h / 2,
      width: w,
      height: h,
      borderRadius: 8,
      boxSizing: "border-box",
      border: `2px solid ${gold ? C.gold : solid ? C.ink : light ? "#B9BDC4" : "#5E636B"}`,
      background: solid ? C.ink : gold && !light ? "#FBF3DA" : "#FFFFFF",
      color: solid ? C.paper : gold ? "#8C6D12" : C.ink,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      fontFamily: SANS,
      fontWeight: light ? 500 : 700,
      fontSize: size,
      ...textIn(f, at, 0.3),
    }}
  >
    {text}
  </div>
);
