// 0–24 s: entry → rally → pullback inside 5 s, then the 走 / 不走 dilemma, then "新手阶段".
import React from "react";
import { HOOK, HOOK_FLY, MINI_FEAR, MINI_GUESS, type Bar } from "../data.ts";
import {
  BigTitle,
  Bubble,
  Candles,
  HLine,
  Label,
  PushIn,
  Stage,
  clamp01,
  dimFor,
  easeInOutSine,
  easeOutBack,
  growSchedule,
  lerp,
  makeScale,
  mixScale,
  ramp,
  type Scale,
  pop,
  rangeOf,
  useTime,
  Badge,
} from "../kit";
import { C, FONT, glow, withAlpha } from "../theme.ts";

const N = HOOK.bars.length;
// two framings: close on entry → rally → pullback for the first seconds, then the whole board
// (room for the 一卖就飞 / 被套 branches) when the 走 / 不走 buttons arrive
const SC_FULL = makeScale({ n: N, x0: 80, x1: 1480, top: 175, bottom: 790, ...rangeOf([...HOOK.bars, ...HOOK_FLY], 0.1) });
const SC_OPEN = makeScale({ n: HOOK.DOUBT + 3, x0: 90, x1: 1830, top: 200, bottom: 800, ...rangeOf(HOOK.bars.slice(0, HOOK.DOUBT + 1), 0.16) });

const BTN = { go: { x: 1560, y: 360 }, stay: { x: 1560, y: 520 }, w: 250, h: 104 };

export const Hook: React.FC = () => {
  const { t, cue } = useTime();
  const sc = mixScale(SC_OPEN, SC_FULL, ramp(t, cue("hookGo") - 0.3, 0.7, easeInOutSine));
  const appear = growSchedule(
    [
      { to: HOOK.PRE, at: cue("hookStart"), per: 0.1 }, // 0–0.3 s: the fall reaches the low
      { to: HOOK.ENTRY, at: cue("hookHere") - 0.15 }, // the entry candle prints just before "这里"
      { to: HOOK.TOP, at: cue("hookEntered") + 0.1, per: 0.17 }, // 连涨
      { to: HOOK.DROP, at: cue("hookDrop"), per: 0.14 }, // 回调
      { to: HOOK.DOUBT, at: cue("hookDoubt") + 0.2, per: 0.2 },
      { to: HOOK.TRAP, at: cue("hookStay") + 0.35, per: 0.26 },
    ],
    HOOK.PRE - 3,
  );
  const flyAt = cue("hookFly");
  const flyOut = cue("hookStay");
  const flyAppear = (k: number) => flyAt + k * 0.1;
  const realOpacity = (i: number) => (i > HOOK.DOUBT ? 1 : t > flyAt && t < flyOut + 0.3 ? 0.55 : 1);

  const titleAt = cue("hookNewbie");
  const cardsAt = cue("hookReal");
  const brandAt = cue("hookAnswer");
  const dim = dimFor(t, titleAt);
  const e = HOOK.bars[HOOK.ENTRY];

  return (
    <>
      <PushIn dim={dim * (t > brandAt ? 1 - 0.6 * clamp01((t - brandAt) / 0.4) : 1)}>
        <Stage>
          <HLine y={sc.y(e.c)} x1={sc.x(HOOK.ENTRY)} x2={sc.x(HOOK.DOUBT + 1)} color={C.muted} at={cue("hookDrop")} dashed label="成本" />
          <Candles bars={HOOK.bars} sc={sc} appear={appear} opacity={realOpacity} />
          {t < flyOut + 0.3 && <Candles bars={HOOK_FLY} sc={sc} appear={flyAppear} offset={HOOK.DOUBT + 1} ghost opacity={1 - clamp01((t - flyOut) / 0.3)} />}
          <EntryMark sc={sc} at={cue("hookHere")} until={cue("hookDrop")} />
          <Bubble x={sc.x(HOOK.ENTRY)} y={sc.y(e.l)} letter="B" color={C.up} at={cue("hookHere")} r={40} gap={40} ripples={2} />
          <Label x={sc.x(HOOK.ENTRY) + 62} y={sc.y(e.l) + 96} text="进场" color={C.up} anchor="start" size={34} at={cue("hookHere") + 0.15} out={cue("hookDrop")} />
          <Label x={sc.x(HOOK.DOUBT + 4)} y={sc.y(131) - 10} text="一卖就飞" color={C.up} at={flyAt + 0.3} out={flyOut} />
          <Label x={sc.x(HOOK.TRAP) - 40} y={sc.y(HOOK.bars[HOOK.TRAP].l) + 64} text="利润回吐" color={C.down} at={cue("hookGiveBack")} />
        </Stage>
      </PushIn>
      <Dilemma />
      <BigTitle lines={["你还停在", "新手阶段"]} at={titleAt} out={cardsAt} />
      <Cards at={cardsAt} out={brandAt} />
      <BrandBeat at={brandAt} />
    </>
  );
};

// ---------------------------------------------------------------- the entry candle, outlined while you buy
const EntryMark: React.FC<{ sc: Scale; at: number; until: number }> = ({ sc, at, until }) => {
  const { t } = useTime();
  const p = pop(t, at, until);
  if (p.opacity <= 0) return null;
  const b = HOOK.bars[HOOK.ENTRY];
  const x = sc.x(HOOK.ENTRY);
  const y1 = sc.y(b.h) - 14;
  const y2 = sc.y(b.l) + 10;
  const w = sc.step * 1.25;
  const pulse = 0.55 + 0.45 * Math.abs(Math.sin((t - at) * 4));
  return (
    <g style={{ opacity: p.opacity }}>
      <rect x={x - w / 2} y={y1} width={w} height={y2 - y1} rx={w / 2} fill={withAlpha(C.up, 0.1)} stroke={C.up} strokeWidth={2.5} opacity={pulse} style={{ filter: glow(C.up, 12, 0.8) }} />
    </g>
  );
};

// ---------------------------------------------------------------- L4: 走 / 不走 buttons + hand cursor
const Dilemma: React.FC = () => {
  const { t, cue } = useTime();
  const on = cue("hookGo");
  const fly = cue("hookFly");
  const stay = cue("hookStay");
  const off = cue("hookStill");
  const p = pop(t, on, off);
  if (p.opacity <= 0) return null;
  // cursor path: rest → 走 → back off → 不走
  const rest = { x: 1820, y: 760 };
  const goPt = { x: BTN.go.x + 150, y: BTN.go.y + 70 };
  const backPt = { x: BTN.go.x + 300, y: BTN.go.y + 150 };
  const stayPt = { x: BTN.stay.x + 150, y: BTN.stay.y + 70 };
  const seg = (a: number, d: number) => easeInOutSine(clamp01((t - a) / d));
  let pt = { x: lerp(rest.x, goPt.x, seg(on + 0.2, 0.6)), y: lerp(rest.y, goPt.y, seg(on + 0.2, 0.6)) };
  if (t > fly) pt = { x: lerp(goPt.x, backPt.x, seg(fly, 0.4)), y: lerp(goPt.y, backPt.y, seg(fly, 0.4)) };
  if (t > stay) pt = { x: lerp(backPt.x, stayPt.x, seg(stay, 0.5)), y: lerp(backPt.y, stayPt.y, seg(stay, 0.5)) };
  const hover: "go" | "stay" | null = t > stay + 0.45 ? "stay" : t > on + 0.75 && t < fly ? "go" : null;
  const press = (a: number) => (t > a && t < a + 0.25 ? 0.94 : 1);
  return (
    <div style={{ position: "absolute", inset: 0, opacity: p.opacity }}>
      <Button label="走" x={BTN.go.x} y={BTN.go.y} active={hover === "go"} scale={p.scale * press(on + 0.8)} />
      <Button label="不走" x={BTN.stay.x} y={BTN.stay.y} active={hover === "stay"} scale={p.scale * press(stay + 0.5)} />
      <Hand x={pt.x} y={pt.y} />
    </div>
  );
};

const Button: React.FC<{ label: string; x: number; y: number; active: boolean; scale: number }> = ({ label, x, y, active, scale }) => (
  <div
    style={{
      position: "absolute",
      left: x,
      top: y,
      width: BTN.w,
      height: BTN.h,
      borderRadius: 52,
      border: `3px solid ${active ? C.text : withAlpha(C.muted, 0.6)}`,
      background: active ? withAlpha(C.text, 0.92) : withAlpha(C.bg, 0.75),
      color: active ? C.bg : C.text,
      boxShadow: active ? `0 0 30px ${withAlpha(C.text, 0.55)}` : "none",
      fontFamily: FONT,
      fontWeight: 900,
      fontSize: 54,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      transform: `scale(${scale})`,
    }}
  >
    {label}
  </div>
);

/** a simple pointing hand, fingertip at (x, y) */
const Hand: React.FC<{ x: number; y: number }> = ({ x, y }) => (
  <svg width={90} height={120} viewBox="0 0 90 120" style={{ position: "absolute", left: x - 30, top: y - 6, filter: glow(C.text, 10, 0.5) }}>
    <g fill={C.text} stroke={C.bg} strokeWidth={3} strokeLinejoin="round">
      <rect x={22} y={4} width={18} height={62} rx={9} />
      <path d="M14 58 C10 48 4 50 6 60 L16 92 C20 106 30 114 46 114 L58 114 C74 114 82 102 82 88 L82 62 C82 54 72 52 70 60 C70 50 60 48 58 58 C58 48 46 46 44 56 L40 66 L22 66 Z" />
    </g>
  </svg>
);

// ---------------------------------------------------------------- 怕 / 猜 comparison cards
const Mini: React.FC<{ bars: Bar[]; mark: number; color: string; letter: string }> = ({ bars, mark, color, letter }) => {
  const r = rangeOf(bars, 0.15);
  const s = makeScale({ n: bars.length, x0: 20, x1: 400, top: 30, bottom: 210, ...r });
  return (
    <svg width={420} height={240} viewBox="0 0 420 240">
      <Candles bars={bars} sc={s} appear={() => Number.NEGATIVE_INFINITY} />
      <circle cx={s.x(mark)} cy={s.y(bars[mark].c)} r={20} fill={color} />
      <text x={s.x(mark)} y={s.y(bars[mark].c) + 8} textAnchor="middle" fontFamily={FONT} fontWeight={900} fontSize={22} fill={C.text}>
        {letter}
      </text>
    </svg>
  );
};

const Cards: React.FC<{ at: number; out: number }> = ({ at, out }) => {
  const { t, cue } = useTime();
  const p = pop(t, at, out);
  if (p.opacity <= 0) return null;
  const card = (title: string, sub: string, child: React.ReactNode, x: number, crossAt: number) => {
    const k = clamp01((t - crossAt) / 0.3);
    return (
      <div
        style={{
          position: "absolute",
          left: x,
          top: 250,
          width: 480,
          padding: "22px 30px 26px",
          borderRadius: 18,
          border: `1.5px solid ${withAlpha(C.muted, 0.35)}`,
          background: withAlpha(C.bg, 0.86),
          fontFamily: FONT,
          textAlign: "center",
        }}
      >
        <div style={{ fontSize: 64, fontWeight: 900, color: C.text }}>{title}</div>
        <div style={{ fontSize: 28, fontWeight: 600, color: C.muted, marginBottom: 6 }}>{sub}</div>
        {child}
        {k > 0 && (
          <div
            style={{
              position: "absolute",
              right: 20,
              top: 10,
              fontSize: 120,
              fontWeight: 900,
              color: C.up,
              opacity: k,
              transform: `scale(${lerp(1.6, 1, easeOutBack(k))})`,
              textShadow: `0 0 24px ${withAlpha(C.up, 0.6)}`,
            }}
          >
            ✕
          </div>
        )}
      </div>
    );
  };
  return (
    <div style={{ position: "absolute", inset: 0, opacity: p.opacity, transform: `scale(${p.scale})`, transformOrigin: "50% 45%" }}>
      {card("怕", "一卖就飞", <Mini bars={MINI_FEAR.bars} mark={MINI_FEAR.sellAt} color={C.down} letter="卖" />, 420, cue("hookFear"))}
      {card("猜", "死扛被套", <Mini bars={MINI_GUESS.bars} mark={MINI_GUESS.holdAt} color={C.up} letter="B" />, 1020, cue("hookGuess"))}
    </div>
  );
};

// ---------------------------------------------------------------- L6: brand badge enlarged + "✕ 怕 ✕ 猜"
const BrandBeat: React.FC<{ at: number }> = ({ at }) => {
  const { t, cue } = useTime();
  const p = pop(t, at);
  if (p.opacity <= 0) return null;
  const breathe = 1 + 0.025 * Math.sin((t - at) * 3.2);
  const written = clamp01((t - cue("hookWritten")) / 0.4);
  return (
    <div style={{ position: "absolute", inset: 0, opacity: p.opacity }}>
      <div style={{ position: "absolute", top: 190, left: 0, right: 0, textAlign: "center", fontFamily: FONT, fontSize: 64, fontWeight: 900, color: C.text, letterSpacing: 18 }}>
        <span style={{ color: C.up, textShadow: `0 0 18px ${withAlpha(C.up, 0.6)}` }}>✕</span> 怕　<span style={{ color: C.up, textShadow: `0 0 18px ${withAlpha(C.up, 0.6)}` }}>✕</span> 猜
      </div>
      <Badge x={872} y={440} scale={3 * p.scale * breathe} origin="50% 50%" />
      <div style={{ position: "absolute", top: 700, left: 0, right: 0, textAlign: "center", fontFamily: FONT, fontSize: 40, fontWeight: 700, color: C.muted, opacity: written, letterSpacing: 6 }}>
        答案写在K线里
      </div>
    </div>
  );
};
