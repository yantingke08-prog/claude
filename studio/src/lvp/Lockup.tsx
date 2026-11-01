import { AbsoluteFill, useCurrentFrame } from "remotion";
import { BRAND, COPY, LAYOUT, VIDEO, mix, ramp } from "./brand";
import { SYMBOL, WORDMARK } from "./logo";
import { serif } from "./fonts";

/** Metallic gold fill shared by the flat symbol and the wordmark; `sheen` 0→1 sweeps a highlight across. */
const GoldGradient: React.FC<{ id: string; x0: number; x1: number; sheen: number }> = ({ id, x0, x1, sheen }) => {
  const w = x1 - x0;
  const c = mix(x0 - w * 0.4, x1 + w * 0.4, sheen);
  const band = w * 0.12;
  return (
    <linearGradient id={id} gradientUnits="userSpaceOnUse" x1={c - band * 3} y1={0} x2={c + band * 3} y2={band * 1.6}>
      <stop offset="0" stopColor={BRAND.gold} />
      <stop offset="0.38" stopColor={BRAND.softGold} />
      <stop offset="0.5" stopColor={sheen > 0 && sheen < 1 ? "#FFF4D6" : BRAND.softGold} />
      <stop offset="0.62" stopColor={BRAND.softGold} />
      <stop offset="1" stopColor={BRAND.gold} />
    </linearGradient>
  );
};

/** The symbol as flat vector, placed on the end-card layout. */
export const FlatSymbol: React.FC<{ opacity?: number; sheen?: number; dots?: number; glow?: number }> = ({
  opacity = 1,
  sheen = 0,
  dots = 1,
  glow = 0,
}) => {
  const [x, y, w, h] = SYMBOL.box;
  const pw = (LAYOUT.symbol.h * w) / h;
  return (
    <svg
      viewBox={`${x} ${y} ${w} ${h}`}
      style={{
        position: "absolute",
        left: LAYOUT.symbol.cx - pw / 2,
        top: LAYOUT.symbol.cy - LAYOUT.symbol.h / 2,
        width: pw,
        height: LAYOUT.symbol.h,
        opacity,
        overflow: "visible",
        filter: glow > 0 ? `drop-shadow(0 0 ${24 * glow}px ${BRAND.gold}aa)` : undefined,
      }}
    >
      <defs>
        <GoldGradient id="lvp-sym-gold" x0={x} x1={x + w} sheen={sheen} />
      </defs>
      {SYMBOL.outline.map((d, i) => (
        <path key={i} d={d} fill="url(#lvp-sym-gold)" />
      ))}
      <g opacity={dots}>
        {SYMBOL.dots.map(([cx, cy, r], i) => (
          <circle key={i} cx={cx} cy={cy} r={r} fill={BRAND.softGold} />
        ))}
      </g>
    </svg>
  );
};

/** VI poster furniture: concentric guide rings, crosshair, a navy bloom behind the mark. */
export const Backdrop: React.FC<{ opacity?: number; spin?: number }> = ({ opacity = 1, spin = 0 }) => {
  const { cx, cy } = LAYOUT.symbol;
  return (
    <AbsoluteFill style={{ opacity, pointerEvents: "none" }}>
      <AbsoluteFill
        style={{ background: `radial-gradient(circle at ${cx}px ${cy}px, ${BRAND.navy}66 0%, ${BRAND.navy}22 30%, transparent 62%)` }}
      />
      <svg width={VIDEO.width} height={VIDEO.height} style={{ position: "absolute", inset: 0 }}>
        <g transform={`rotate(${spin} ${cx} ${cy})`} stroke={BRAND.gold} fill="none">
          {[250, 330, 430].map((r, i) => (
            <circle key={r} cx={cx} cy={cy} r={r} strokeWidth={1} strokeOpacity={0.12 - i * 0.03} strokeDasharray={i === 1 ? "2 7" : undefined} />
          ))}
          <line x1={cx - 620} y1={cy} x2={cx + 620} y2={cy} strokeOpacity={0.07} />
          <line x1={cx} y1={cy - 520} x2={cx} y2={cy + 520} strokeOpacity={0.07} />
        </g>
      </svg>
    </AbsoluteFill>
  );
};

/** Four-point star used as a divider ornament across the VI. */
const Spark: React.FC<{ size: number; x: number; y: number; opacity: number }> = ({ size, x, y, opacity }) => (
  <svg width={size} height={size} viewBox="-10 -10 20 20" style={{ position: "absolute", left: x - size / 2, top: y - size / 2, opacity }}>
    <path d="M0 -10 C1 -2 2 -1 10 0 C2 1 1 2 0 10 C-1 2 -2 1 -10 0 C-2 -1 -1 -2 0 -10Z" fill={BRAND.softGold} />
  </svg>
);

/**
 * Wordmark, divider, claim line (big) and belief line (small), staged from frame `at`.
 * The symbol itself is drawn by each version (3D or flat) so it can arrive its own way.
 */
export const Lockup: React.FC<{ at: number }> = ({ at }) => {
  const frame = useCurrentFrame();
  const f = frame - at;
  const [wx, wy, ww, wh] = WORDMARK.box;
  const wpx = LAYOUT.wordmark.w;
  const hpx = (wpx * wh) / ww;

  const wordIn = ramp(f, 0, 20, "expo.out");
  const sheen = ramp(f, 10, 40, "power2.inOut");
  const line = ramp(f, 6, 26, "expo.inOut");
  const beliefIn = ramp(f, 20, 36, "power3.out");
  const truth = ramp(f, 24, 40, "power2.out");
  const claimChars = Array.from(COPY.claim);

  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      {/* Wordmark opens from its centre, like a curtain of light. */}
      <svg
        viewBox={`${wx} ${wy} ${ww} ${wh}`}
        style={{
          position: "absolute",
          left: VIDEO.width / 2 - wpx / 2,
          top: LAYOUT.wordmark.top,
          width: wpx,
          height: hpx,
          opacity: wordIn,
          clipPath: `inset(-20% ${50 * (1 - wordIn)}% -20% ${50 * (1 - wordIn)}%)`,
          transform: `scale(${mix(1.06, 1, wordIn)})`,
          overflow: "visible",
        }}
      >
        <defs>
          <GoldGradient id="lvp-word-gold" x0={wx} x1={wx + ww} sheen={sheen} />
        </defs>
        {WORDMARK.paths.map((d, i) => (
          <path key={i} d={d} fill="url(#lvp-word-gold)" />
        ))}
      </svg>

      {/* Divider: hairlines grow out of a spark. */}
      {[-1, 1].map((s) => (
        <div
          key={s}
          style={{
            position: "absolute",
            top: LAYOUT.divider,
            height: 1,
            width: 230 * line,
            left: s < 0 ? VIDEO.width / 2 - 22 - 230 * line : VIDEO.width / 2 + 22,
            background: `linear-gradient(${s < 0 ? 270 : 90}deg, ${BRAND.gold}, transparent)`,
          }}
        />
      ))}
      <Spark size={mix(0, 22, line)} x={VIDEO.width / 2} y={LAYOUT.divider} opacity={line} />

      {/* Claim line: each character surfaces from a blur. */}
      <div
        style={{
          position: "absolute",
          top: LAYOUT.primary,
          left: 0,
          right: 0,
          transform: "translateY(-50%)",
          display: "flex",
          justifyContent: "center",
          ...serif(600),
          fontSize: 46,
          letterSpacing: "0.16em",
          color: BRAND.softGold,
        }}
      >
        {claimChars.map((ch, i) => {
          const p = ramp(f, 10 + i * 0.7, 24 + i * 0.7, "power3.out");
          return (
            <span
              key={i}
              style={{
                opacity: p,
                transform: `translateY(${mix(16, 0, p)}px)`,
                filter: p < 1 ? `blur(${mix(8, 0, p)}px)` : undefined,
                textShadow: `0 0 22px ${BRAND.gold}55`,
              }}
            >
              {ch}
            </span>
          );
        })}
      </div>

      <div
        style={{
          position: "absolute",
          top: LAYOUT.secondary,
          left: 0,
          right: 0,
          transform: "translateY(-50%)",
          textAlign: "center",
          ...serif(400),
          fontSize: 25,
          letterSpacing: `${mix(0.7, 0.42, beliefIn)}em`,
          color: BRAND.warm,
          opacity: beliefIn * 0.78,
        }}
      >
        {COPY.belief}
      </div>

      <div
        style={{
          position: "absolute",
          bottom: 52,
          left: 0,
          right: 0,
          textAlign: "center",
          ...serif(600),
          fontSize: 13,
          letterSpacing: "0.6em",
          color: BRAND.gold,
          opacity: truth * 0.55,
        }}
      >
        ORDER FLOW IS TRUTH
      </div>
    </AbsoluteFill>
  );
};
