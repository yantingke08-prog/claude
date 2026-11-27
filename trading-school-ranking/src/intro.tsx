// 开场：0 秒就有东西在动。
// 行情墙高速扫入（金色扫描线）→ 标题砸下（闪白 + 冲击波 + 火花 + 轻微震屏 + 色散）
// → “排行榜”第二下砸入并金色扫光 → 五张名次牌依次翻开，第一名发光。
import React from "react";
import { candlesFrom, lin, mix, pathOf, prog, rng, sma } from "./anim.ts";
import { keyed } from "./charts/common.ts";
import { TITLE } from "./content.ts";
import { C, FPS, FS, HEIGHT, MONO, SERIF, WIDTH } from "./theme.ts";
import type { SceneSpan } from "./timeline.ts";

type Props = { span: SceneSpan; f: number; at: (i: number, frac?: number) => number };

const WALL_N = 150;
const WALL = candlesFrom(
  keyed(WALL_N, [[0, 50], [14, 58], [22, 53], [40, 66], [48, 61], [62, 72], [70, 64], [78, 67], [92, 55], [104, 60], [118, 76], [126, 71], [149, 86]], 777, 0.9),
  778,
  0.9,
);
const WALL_LO = Math.min(...WALL.map((d) => d.l));
const WALL_HI = Math.max(...WALL.map((d) => d.h));
const WALL_STEP = 26;
const wy = (v: number) => 930 - ((v - WALL_LO) / (WALL_HI - WALL_LO)) * 760;
const WALL_MA = pathOf(sma(WALL.map((d) => d.c), 7).map((v, i) => [i * WALL_STEP, wy(v)]));

const TAPE = (() => {
  const r = rng(4242);
  return Array.from({ length: 30 }, () => ({ p: (98 + r() * 4).toFixed(2), q: Math.round(5 + r() * r() * 400), up: r() > 0.45 }));
})();
const SPARKS = (() => {
  const r = rng(99);
  return Array.from({ length: 64 }, () => ({ a: r() * Math.PI * 2, v: 9 + r() * 26, s: 2 + r() * 4, life: 0.5 + r() * 0.7, hot: r() > 0.5 }));
})();

const TITLE_Y = [300, 470];

export const IntroFx: React.FC<Props> = ({ span, f, at }) => {
  const tHit = Math.max(5, at(0, 0) + 3);
  const tHit2 = tHit + 0.42 * FPS;
  const tTiles = at(1, 0);
  const end = span.to - span.from;

  // 行情墙：开头高速扫入，之后慢慢平移
  const pan = 900 * (1 - Math.exp(-f / 9)) + f * 3.2;
  const reveal = lin(f, 0, 0.55) * (WIDTH + 200);
  const wallDim = 1 - 0.55 * prog(f, tHit, 0.5);

  // 震屏（每次砸下 8 帧内衰减）
  const shakeOf = (t: number, amp: number) => {
    const k = f - t;
    if (k < 0 || k > 8) return [0, 0];
    const d = amp * (1 - k / 8);
    return [Math.sin(k * 2.7) * d, Math.cos(k * 3.9) * d * 0.6];
  };
  const [s1x, s1y] = shakeOf(tHit, 14);
  const [s2x, s2y] = shakeOf(tHit2, 9);
  const flash = Math.max(f >= tHit ? 0.6 * (1 - lin(f, tHit, 0.3)) : 0, f >= tHit2 ? 0.35 * (1 - lin(f, tHit2, 0.25)) : 0);
  const push = mix(1.0, 1.06, lin(f, 0, Math.max(1, end / FPS)));

  const slam = (t: number) => {
    const p = prog(f, t, 0.3);
    const ab = p > 0 ? 1 - prog(f, t, 0.5) : 0;
    return {
      opacity: Math.min(1, p * 1.6),
      transform: `scale(${mix(1.9, 1, p)})`,
      filter: `blur(${(1 - p) * 14}px)`,
      textShadow: `${ab * 10}px 0 rgba(255,60,80,0.75), ${-ab * 10}px 0 rgba(40,220,255,0.75), 0 4px 18px rgba(0,0,0,0.8)`,
    } as const;
  };
  const shine = mix(140, -40, lin(f, tHit2 + 0.25 * FPS, 0.8));

  return (
    <div style={{ position: "absolute", inset: 0, overflow: "hidden" }}>
      <div style={{ position: "absolute", inset: 0, transform: `scale(${push}) translate(${s1x + s2x}px, ${s1y + s2y}px)` }}>
        {/* 行情墙 */}
        <svg width={WIDTH} height={HEIGHT} style={{ position: "absolute", inset: 0, opacity: wallDim }}>
          <defs>
            <clipPath id="introReveal">
              <rect x={0} y={0} width={reveal} height={HEIGHT} />
            </clipPath>
            <filter id="introGlow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="6" result="b" />
              <feMerge>
                <feMergeNode in="b" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>
          {[0, 1, 2, 3, 4, 5].map((k) => (
            <line key={k} x1={0} x2={WIDTH} y1={190 + k * 140} y2={190 + k * 140} stroke={C.lineSoft} />
          ))}
          <g clipPath="url(#introReveal)">
            <g transform={`translate(${-pan + 120}, 0)`}>
              {WALL.map((c, i) => {
                const cx = i * WALL_STEP;
                if (cx - pan + 120 < -40 || cx - pan + 120 > WIDTH + 40) return null;
                const col = c.c >= c.o ? C.up : C.down;
                const top = wy(Math.max(c.o, c.c));
                return (
                  <g key={i}>
                    <line x1={cx} x2={cx} y1={wy(c.h)} y2={wy(c.l)} stroke={col} strokeWidth={2.4} />
                    <rect x={cx - 8} y={top} width={16} height={Math.max(2, wy(Math.min(c.o, c.c)) - top)} fill={col} />
                  </g>
                );
              })}
              <path d={WALL_MA} fill="none" stroke={C.goldHi} strokeWidth={3} filter="url(#introGlow)" opacity={0.9} />
            </g>
          </g>
          {/* 扫描线 */}
          {reveal < WIDTH + 150 && <rect x={reveal - 6} y={0} width={6} height={HEIGHT} fill={C.goldHi} filter="url(#introGlow)" />}
        </svg>

        {/* 两侧逐笔成交滚动 */}
        {[0, 1].map((side) => (
          <div key={side} style={{ position: "absolute", top: 120, [side ? "right" : "left"]: 36, height: 780, width: 190, overflow: "hidden", opacity: 0.45 * wallDim + 0.15, WebkitMaskImage: "linear-gradient(180deg, transparent 0%, black 14%, black 86%, transparent 100%)" }}>
            <div style={{ transform: `translateY(${-((f * (side ? 7 : 9) + side * 300) % (TAPE.length * 36))}px)` }}>
              {[...TAPE, ...TAPE, ...TAPE].map((t, i) => (
                <div key={i} style={{ height: 36, display: "flex", justifyContent: "space-between", fontFamily: MONO, fontSize: 24, color: (i + side) % 7 === 0 ? C.goldHi : t.up ? C.up : C.down }}>
                  <span>{t.p}</span>
                  <span>{t.q}</span>
                </div>
              ))}
            </div>
          </div>
        ))}

        {/* 标题后的旋转光芒 + 压暗，让标题从行情墙里跳出来 */}
        <div
          style={{
            position: "absolute",
            left: WIDTH / 2 - 900,
            top: 400 - 900,
            width: 1800,
            height: 1800,
            borderRadius: 900,
            background: `repeating-conic-gradient(from ${f * 0.35}deg at 50% 50%, rgba(244,215,122,0.12) 0deg 6deg, rgba(0,0,0,0) 6deg 20deg)`,
            WebkitMaskImage: "radial-gradient(circle, black 0%, transparent 62%)",
            maskImage: "radial-gradient(circle, black 0%, transparent 62%)",
            opacity: prog(f, tHit, 0.6),
          }}
        />
        <div style={{ position: "absolute", left: 0, top: 150, width: WIDTH, height: 540, background: "radial-gradient(ellipse at 50% 50%, rgba(9,11,14,0.88) 0%, rgba(9,11,14,0.55) 45%, rgba(9,11,14,0) 72%)", opacity: prog(f, tHit, 0.4) }} />

        {/* 冲击波 */}
        {[tHit, tHit2].map((t, k) => {
          const p = prog(f, t, 0.7);
          return p > 0 && p < 1 ? (
            <div key={k} style={{ position: "absolute", left: WIDTH / 2 - 1100 * p, top: TITLE_Y[k] - 1100 * p, width: 2200 * p, height: 2200 * p, borderRadius: "50%", boxSizing: "border-box", border: `${6 * (1 - p) + 1}px solid ${C.goldHi}`, opacity: (1 - p) * 0.8 }} />
          ) : null;
        })}

        {/* 火花 */}
        <svg width={WIDTH} height={HEIGHT} style={{ position: "absolute", inset: 0 }}>
          {SPARKS.map((sp, i) => {
            const t0 = i % 2 ? tHit2 : tHit;
            const k = (f - t0) / FPS;
            if (k < 0 || k > sp.life) return null;
            const d = sp.v * k * FPS * (1 - k / (sp.life * 2));
            const cx = WIDTH / 2 + Math.cos(sp.a) * d * 1.6;
            const cy = TITLE_Y[i % 2] + Math.sin(sp.a) * d + 260 * k * k;
            return <circle key={i} cx={cx} cy={cy} r={sp.s} fill={sp.hot ? "#FFFFFF" : C.goldHi} opacity={1 - k / sp.life} />;
          })}
        </svg>

        {/* 标题 */}
        <div style={{ position: "absolute", top: 200, width: WIDTH, textAlign: "center", fontFamily: SERIF, fontWeight: 800, fontSize: FS.hero, color: C.white, letterSpacing: 8, ...slam(tHit) }}>
          {TITLE.line1}
        </div>
        <div style={{ position: "absolute", top: 380, width: WIDTH, display: "flex", justifyContent: "center", ...slam(tHit2), textShadow: "none" }}>
          <span
            style={{
              fontFamily: SERIF,
              fontWeight: 900,
              fontSize: FS.hero + 30,
              letterSpacing: 30,
              paddingLeft: 30,
              backgroundImage: `linear-gradient(100deg, #B8892A 0%, #F4D77A ${shine - 18}%, #FFFFFF ${shine}%, #F4D77A ${shine + 18}%, #C99A2E 100%)`,
              WebkitBackgroundClip: "text",
              backgroundClip: "text",
              color: "transparent",
              filter: "drop-shadow(0 0 26px rgba(244,215,122,0.5))",
            }}
          >
            {TITLE.line2}
          </span>
        </div>
        <div style={{ position: "absolute", top: 640, left: 0, width: WIDTH, display: "flex", justifyContent: "center" }}>
          <div style={{ width: 760 * prog(f, tHit2 + 0.2 * FPS, 0.45), height: 4, background: `linear-gradient(90deg, rgba(244,215,122,0), ${C.goldHi}, rgba(244,215,122,0))` }} />
        </div>

        {/* 第五名 → 第一名：名次牌依次翻开 */}
        <div style={{ position: "absolute", top: 690, width: WIDTH, height: 170, display: "flex", justifyContent: "center", alignItems: "center", gap: 36, perspective: 900 }}>
          {[5, 4, 3, 2, 1].map((n, k) => {
            const t = tTiles + (0.1 + k * 0.14) * FPS;
            const p = prog(f, t, 0.32);
            const one = n === 1;
            const glow = one ? prog(f, t + 0.3 * FPS, 0.4) : 0;
            return (
              <div
                key={n}
                style={{
                  width: one ? 150 : 120,
                  height: one ? 150 : 120,
                  borderRadius: 8,
                  boxSizing: "border-box",
                  border: `2px solid ${one ? C.goldHi : C.line}`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontFamily: SERIF,
                  fontWeight: 900,
                  fontSize: one ? 92 : 68,
                  color: one ? C.goldHi : C.white,
                  background: one ? "linear-gradient(160deg, #3A2E10, #161E2B)" : C.panel,
                  boxShadow: one ? `0 0 ${50 * glow}px rgba(244,215,122,${0.6 * glow})` : "none",
                  opacity: Math.min(1, p * 2),
                  transform: `rotateX(${(1 - p) * 95}deg) translateY(${(1 - p) * -30}px)`,
                }}
              >
                {n}
              </div>
            );
          })}
        </div>
      </div>

      {/* 闪白 */}
      {flash > 0 && <div style={{ position: "absolute", inset: 0, background: "radial-gradient(circle at 50% 40%, #FFFFFF 0%, #F4D77A 40%, rgba(244,215,122,0) 80%)", opacity: flash }} />}
    </div>
  );
};
