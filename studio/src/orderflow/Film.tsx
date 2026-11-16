// 《三根阳线，你会追吗？——等订单流确认》 vertical 1080×1920 trading-education film.
// One persistent, data-driven K-line chart from frame 0 to the end: the camera (an animated chart window) moves,
// and each chapter only overlays Delta, Footprint, CVD and annotations on the same chart. Timed to the voice.
import React from "react";
import { AbsoluteFill, Audio, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { E, FRAMES } from "./cue";
import { ABS, BARS, CF0, EXHAUST, GAP1, GAP2, GAPPED, LIQ, N, PB0, PRIOR_HIGH, PROFILE, S1, S3, STOP, STRUCT_LOW, S_OPEN, ZONE, type Bar, cvd, footprint, mix } from "./data";
import { fontsReady, num, sans, serif } from "./fonts";
import { type Chart, Arrow, Candles, Captions, ClipRect, CvdLine, DashBox, DeltaBars, Footprint, HLine, Header, PAL, Panel, PriceAxis, Tag, TopBar, camera, clamp01, cx, cy, out3, ramp, slot, win } from "./kit";
import { T } from "./text";

void fontsReady;

const Page: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { width } = useVideoConfig();
  return <div style={{ position: "absolute", left: 0, top: 0, width: 1080, height: 1920, transform: `scale(${width / 1080})`, transformOrigin: "0 0" }}>{children}</div>;
};

const Background: React.FC = () => (
  <svg width={1080} height={1920} style={{ position: "absolute", inset: 0 }}>
    <defs>
      <radialGradient id="ofV" cx="50%" cy="40%" r="80%">
        <stop offset="0%" stopColor="#0c121c" />
        <stop offset="65%" stopColor="#06080d" />
        <stop offset="100%" stopColor="#030407" />
      </radialGradient>
    </defs>
    <rect width={1080} height={1920} fill="url(#ofV)" />
  </svg>
);

const Svg: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <svg width={1080} height={1920} style={{ position: "absolute", inset: 0, overflow: "visible" }}>
    {children}
  </svg>
);

// ================================================================= layout + camera
const HOOK_L = { x: 50, y: 600, w: 880, h: 820 };
const MAIN_L = { x: 50, y: 330, w: 880, h: 800 };
const AXIS_X = 944;
const DP = { y: 1146, h: 196 }; // Delta panel
const CP = { y: 1356, h: 150 }; // CVD panel
const V = (l: typeof MAIN_L, i0: number, i1: number, plo: number, phi: number): Chart => ({ ...l, i0, i1, plo, phi });

const H0 = V(HOOK_L, 5.5, 41.5, 4806, 4880);
const H1 = V(HOOK_L, 12.5, 41.5, 4808, 4872);
const M_T = V(MAIN_L, 13.5, 41.5, 4806, 4868);
const M_D = V(MAIN_L, 21.5, 41.5, 4810, 4860);
const M_A = V(MAIN_L, 33.5, 43.5, 4819, 4855);
const M_C = V(MAIN_L, 24.5, 50.5, 4810, 4880);
const M_X = V(MAIN_L, 21.5, 41.5, 4810, 4866);
const M_G = V(MAIN_L, 21.5, 41.5, 4810, 4872);
const M_E = V(MAIN_L, 24.5, 50.5, 4810, 4880);
const M_R = V(MAIN_L, -0.5, 51.5, 4808, 4884);

const cam = (f: number) =>
  camera(f, [
    [0, H0],
    [E("cd"), H1, 150],
    [E("flow"), M_T, 26],
    [E("delta"), M_D, 34],
    [E("hit"), M_A, 34],
    [E("up"), M_C, 34],
    [E("counter"), M_X, 30],
    [E("gap"), M_G, 24],
    [E("entry"), M_E, 30],
    [E("targets"), M_R, 40],
  ]);

// ================================================================= what is on the chart at frame f
const dataAt = (f: number): Bar[] => {
  if (f < E("gap")) return mix(BARS, EXHAUST, ramp(f, E("exh"), 18));
  if (f < E("entry")) return mix(EXHAUST, GAPPED, ramp(f, E("gap"), 18));
  return mix(GAPPED, BARS, ramp(f, E("entry"), 18));
};
const SOL = () => [E("s1"), E("s2"), E("s3")];
const appearAt = (i: number): number => {
  if (i < S1) return -999;
  if (i <= S3) return SOL()[i - S1];
  if (i < CF0) return i === PB0 + 3 ? E("hold") : E("hit") + (i - PB0) * 8;
  return E("up") + (i - CF0) * 7;
};
const growth = (f: number, i: number) => (i < S1 ? 1 : clamp01((f - appearAt(i)) / (i <= S3 ? 15 : 11)));
/** bars after candle 3 step aside during the counter-example and gap chapters */
const hideAfter = (f: number) => ramp(f, E("counter"), 12) * (1 - ramp(f, E("entry") + 4, 14));
const lastVisible = (f: number) => {
  let last = S1 - 1;
  for (let i = S1; i < N; i++) if (growth(f, i) > 0.5 && (i <= S3 || hideAfter(f) < 0.5)) last = i;
  return last;
};

const CVD = cvd(BARS);
const FP = [PB0, PB0 + 1, PB0 + 2, PB0 + 3].map((i) => ({ i, lv: footprint(BARS, i) }));
const FP_MAX = Math.max(...FP.flatMap((x) => x.lv.map((l) => Math.max(l.bid, l.ask))));
const ZONE_BID = FP.filter((x) => ABS.includes(x.i)).reduce((a, x) => a + x.lv.filter((l) => l.p >= ZONE.lo && l.p <= ZONE.hi).reduce((s, l) => s + l.bid, 0), 0);
const ZONE_ASK = FP.filter((x) => ABS.includes(x.i)).reduce((a, x) => a + x.lv.filter((l) => l.p >= ZONE.lo && l.p <= ZONE.hi).reduce((s, l) => s + l.ask, 0), 0);
const fmt = (v: number) => Math.round(v).toLocaleString("en-US");

// ================================================================= the chart (always on screen)
const ChartLayer: React.FC<{ f: number; dimAll?: number }> = ({ f, dimAll = 0 }) => {
  const c = cam(f);
  const bars = dataAt(f);
  const hide = hideAfter(f);
  const histDim = 0.35 * ramp(f, E("delta"), 14) * (1 - ramp(f, E("targets"), 20));
  const op = (i: number) => (1 - dimAll) * (i < S1 ? 1 - histDim : i > S3 ? 1 - hide : 1);
  const fpK = ramp(f, E("fp"), 14) * (1 - ramp(f, E("confirm"), 14));
  const thin = (i: number) => (i >= PB0 && i < CF0 ? fpK : 0);
  const last = lastVisible(f);
  const lb = bars[last];
  const g = (i: number) => growth(f, i);

  // Delta panel
  const dA = ramp(f, E("delta"), 16) * (1 - dimAll);
  const dmax = 1700 + 2000 * ramp(f, E("bigD"), 14) * (1 - ramp(f, E("gap"), 14));
  const dG = (i: number) => (i < S1 ? 1 : i <= S3 ? Math.min(g(i), ramp(f, E("dUp") + (i - S1) * 7, 12)) : g(i));
  const dHl = (i: number) => {
    if (i === S1) return win(f, E("dUp"), E("absorb"), 8, 10);
    if (i >= PB0 && i < CF0) return win(f, E("hit") + 10, E("hold") + 20, 8, 10);
    if (i >= CF0 && i < CF0 + 3) return win(f, E("dPos"), E("cvd") + 10, 8, 10) + win(f, E("dTurn"), E("risk"), 8, 10) * (i === CF0 ? 1 : 0);
    if (i === S3) return win(f, E("bigD"), E("gap"), 8, 10);
    return 0;
  };
  // CVD panel
  const cvdA = (f < E("counter") ? ramp(f, E("cvd"), 16) : f < E("entry") ? 1 - ramp(f, E("counter"), 10) : ramp(f, E("entry") + 6, 14)) * (1 - dimAll);
  const cvdUpto = Math.min(last, f < E("cvd") ? last : (CF0 - 1) + Math.min(N - CF0, (f - E("cvd")) / 6));

  return (
    <Svg>
      <ClipRect id="ofClip" x={c.x} y={c.y} w={c.w} h={c.h} />
      <ClipRect id="ofDP" x={c.x} y={DP.y} w={c.w} h={DP.h} />
      <ClipRect id="ofCP" x={c.x} y={CP.y} w={c.w} h={CP.h} />
      <Panel x={c.x} y={c.y} w={c.w} h={c.h} grid={c} a={1 - 0.6 * dimAll} />
      <PriceAxis c={c} x={AXIS_X} a={1 - 0.7 * dimAll} last={lb.c} lastUp={lb.c >= lb.o} />
      <Overlays f={f} c={c} bars={bars} />
      <Candles c={c} bars={bars} g={g} op={op} thin={thin} clip="ofClip" />
      <g clipPath="url(#ofClip)">
        {FP.map(({ i, lv }) => (
          <Footprint key={i} c={c} i={i} levels={lv} vmax={FP_MAX} a={fpK * clamp01(g(i) * 2) * (1 - dimAll)} hot={(p) => (ABS.includes(i) && p >= ZONE.lo && p <= ZONE.hi ? ramp(f, E("absorbW"), 10) : 0)} />
        ))}
      </g>
      {dA > 0.001 && (
        <g opacity={1}>
          <Panel x={c.x} y={DP.y} w={c.w} h={DP.h} a={dA} />
          <g opacity={dA}>
            <DeltaBars c={c} y={DP.y} h={DP.h} dmax={dmax} bars={bars} g={dG} op={op} hl={dHl} clip="ofDP" />
          </g>
        </g>
      )}
      {cvdA > 0.001 && (
        <g>
          <Panel x={c.x} y={CP.y} w={c.w} h={CP.h} a={cvdA} />
          <CvdLine c={c} y={CP.y + 10} h={CP.h - 20} lo={-4400} hi={4400} vals={CVD} upto={cvdUpto} a={cvdA} clip="ofCP" />
        </g>
      )}
    </Svg>
  );
};

/** SVG overlays under the candles: zones, levels, profile */
const Overlays: React.FC<{ f: number; c: Chart; bars: Bar[] }> = ({ f, c, bars }) => {
  const xr = c.x + c.w;
  const zoneA = ramp(f, E("absorbW"), 12) * (1 - ramp(f, E("counter"), 10)) + ramp(f, E("zoneE"), 12) * (1 - ramp(f, E("end"), 14));
  const zx0 = cx(c, PB0 + 1.5);
  const zx1 = f < E("entry") ? cx(c, PB0 + 3.5) : xr - 8;
  const holdK = ramp(f, E("hold"), 14) * (1 - ramp(f, E("fp"), 10));
  const openK = ramp(f, E("open1"), 16) * (1 - ramp(f, E("end"), 14));
  const stopK = ramp(f, E("stop"), 16) * (1 - ramp(f, E("end"), 14));
  const tK = (n: string) => ramp(f, E(n), 16) * (1 - ramp(f, E("end"), 14));
  const profK = ramp(f, E("targets") + 10, 20) * (1 - ramp(f, E("end"), 14));
  const pw = cx(c, 13) - cx(c, 0);
  const gapK = ramp(f, E("fast"), 12) * (1 - ramp(f, E("entry"), 10));
  return (
    <g clipPath="url(#ofClip)">
      {/* volume profile of the old balance (bars 0–12) */}
      {profK > 0.001 &&
        PROFILE.rows.map(([p, v]) => {
          const y0 = cy(c, p + 0.5);
          const y1 = cy(c, p - 0.5);
          const inVa = p >= PROFILE.val && p <= PROFILE.vah;
          return <rect key={p} x={cx(c, -0.5)} y={y0 + 0.5} width={(v / PROFILE.max) * pw * out3((f - E("targets") - 10) / 24)} height={Math.max(1, y1 - y0 - 1)} fill={p === PROFILE.poc ? PAL.gold : inVa ? PAL.cyan : PAL.grid} fillOpacity={(p === PROFILE.poc ? 0.7 : inVa ? 0.28 : 0.16) * profK} />;
        })}
      {/* value area band */}
      {tK("tVA") > 0.001 && <rect x={cx(c, -0.5)} y={cy(c, PROFILE.vah + 0.5)} width={xr - cx(c, -0.5)} height={cy(c, PROFILE.val - 0.5) - cy(c, PROFILE.vah + 0.5)} fill={PAL.cyan} fillOpacity={0.08 * tK("tVA")} />}
      <HLine x0={cx(c, -0.5)} x1={xr} y={cy(c, PROFILE.poc)} k={tK("tPOC")} color={PAL.gold} />
      <HLine x0={cx(c, -0.5)} x1={xr} y={cy(c, PROFILE.vah + 0.5)} k={tK("tVA")} color={PAL.cyan} w={1.8} />
      <HLine x0={cx(c, -0.5)} x1={xr} y={cy(c, PROFILE.val - 0.5)} k={tK("tVA")} color={PAL.cyan} w={1.8} />
      <HLine x0={cx(c, 3)} x1={xr} y={cy(c, LIQ)} k={tK("tLiq")} color={PAL.soft} />
      <HLine x0={cx(c, S3 - 0.5)} x1={xr} y={cy(c, PRIOR_HIGH)} k={tK("tPH")} color={PAL.up} />
      {/* absorption zone */}
      <DashBox x={zx0} y={cy(c, ZONE.hi + 0.5)} w={zx1 - zx0} h={cy(c, ZONE.lo - 0.5) - cy(c, ZONE.hi + 0.5)} k={zoneA} />
      {/* price stops falling */}
      <HLine x0={cx(c, PB0 + 1.5)} x1={xr} y={cy(c, ZONE.lo)} k={holdK} color={PAL.gold} />
      {/* candle 1 open, stop */}
      <HLine x0={cx(c, S1 - 0.4)} x1={xr} y={cy(c, S_OPEN)} k={openK} color={PAL.gold} w={2.2} />
      <HLine x0={cx(c, S1 - 0.4)} x1={xr} y={cy(c, STOP)} k={stopK} color={PAL.down} dash={false} w={3} />
      {/* gaps */}
      {gapK > 0.001 &&
        [
          [GAP1, S1],
          [GAP2, S1 + 1],
        ].map(([g, i]) => {
          const gg = g as { lo: number; hi: number };
          const ii = i as number;
          return <DashBox key={ii} x={cx(c, ii) - slot(c) * 0.2} y={cy(c, gg.hi)} w={slot(c) * 1.4} h={cy(c, gg.lo) - cy(c, gg.hi)} k={gapK * ramp(f, E("fast") + (ii - S1) * 8, 10)} color={PAL.warn} fill={0.14} />;
        })}
      {void bars}
    </g>
  );
};

// ================================================================= annotations (HTML + SVG, per chapter)
const Notes: React.FC<{ f: number }> = ({ f }) => {
  const c = cam(f);
  const bars = dataAt(f);
  const P = (i: number, p: number): [number, number] => [cx(c, i), cy(c, p)];
  const s1 = bars[S1];
  const s3 = bars[S3];
  const n: React.ReactNode[] = [];
  const svg: React.ReactNode[] = [];

  // ---- delta chapter
  {
    const a = win(f, E("delta") + 6, E("absorb"), 10, 10);
    const [x, yTop] = P(S1, s1.h);
    const bw = slot(c) * 0.9;
    svg.push(<DashBox key="c1box" x={x - bw / 2} y={yTop - 14} w={bw} h={cy(c, s1.l) - yTop + 28} k={a} />);
    n.push(<Tag key="c1" x={x} y={yTop - 26} ax={0.5} ay={1} zh={T.c1[0]} en={T.c1[1]} a={a} />);
    const k = win(f, E("dUp"), E("absorb"), 10, 10);
    const dy = DP.y + DP.h / 2;
    svg.push(<Arrow key="pUp" p={[x - slot(c) * 1.1, cy(c, s1.o)]} q={[x - slot(c) * 1.1, cy(c, s1.c)]} k={ramp(f, E("dUp"), 12) * (1 - ramp(f, E("absorb"), 10))} color={PAL.up} />);
    svg.push(<Arrow key="dUpA" p={[x - slot(c) * 1.1, dy + 10]} q={[x - slot(c) * 1.1, DP.y + 18]} k={ramp(f, E("dUp") + 6, 12) * (1 - ramp(f, E("absorb"), 10))} color={PAL.up} />);
    n.push(<Tag key="dsync" x={x - slot(c) * 1.6} y={DP.y - 16} ax={1} ay={1} zh={T.dSync[0]} en={T.dSync[1]} tone="up" a={k} />);
    n.push(<Tag key="buy" x={cx(c, S3) + slot(c) * 0.2} y={cy(c, bars[S3].h) - 30} ax={0.75} ay={1} zh={`✓ ${T.buyers[0]}`} en={T.buyers[1]} tone="up" a={win(f, E("buyers"), E("absorb"), 10, 10)} />);
  }
  // ---- absorb chapter
  {
    const a = win(f, E("hit") + 6, E("fp"), 10, 10);
    n.push(<Tag key="hit" x={cx(c, PB0 + 1.5)} y={DP.y - 14} ax={0.5} ay={1} zh={T.sellHit[0]} en={`${T.dNeg[0]} · ${T.sellHit[1]}`} tone="down" a={a} />);
    n.push(<Tag key="hold" x={cx(c, PB0 + 3) + slot(c) * 0.7} y={cy(c, ZONE.lo) + 18} ax={0} ay={0} zh={T.holds[0]} en={T.holds[1]} a={win(f, E("hold") + 4, E("fp"), 10, 10)} />);
    const fa = win(f, E("fp"), E("confirm"), 12, 10);
    n.push(<Tag key="fp" x={c.x + 24} y={c.y + 22} zh={T.fpTag[0]} en={T.fpTag[1]} tone="white" a={fa} size={32} />);
    // bid / ask column legend above the first footprint bar
    const lx = cx(c, PB0);
    n.push(
      <div key="leg" style={{ position: "absolute", left: lx - 60, top: cy(c, bars[PB0].h) - 52, width: 120, display: "flex", justifyContent: "space-between", opacity: fa, ...num(700), fontSize: 22 }}>
        <span style={{ color: PAL.down }}>{T.bidAsk}</span>
        <span style={{ color: PAL.up }}>{T.askLbl}</span>
      </div>,
    );
    const za = win(f, E("absorbW"), E("confirm") + 6, 12, 10);
    const zy = cy(c, ZONE.lo - 0.5);
    n.push(<Tag key="abs" x={cx(c, PB0 + 3.5) + 12} y={cy(c, ZONE.hi + 0.5) - 8} ax={0} ay={1} zh={T.absorbTag[0]} en={T.absorbTag[1]} a={za} />);
    n.push(
      <div key="abn" style={{ position: "absolute", left: cx(c, PB0 + 3.5) + 12, top: zy + 10, opacity: za, ...num(700), fontSize: 26, lineHeight: 1.35 }}>
        <div style={{ color: PAL.down }}>Bid {fmt(ZONE_BID)}</div>
        <div style={{ color: PAL.up }}>Ask {fmt(ZONE_ASK)}</div>
        <div style={{ ...sans(700), fontSize: 24, color: PAL.soft }}>{T.stack[0]}</div>
      </div>,
    );
  }
  // ---- confirm chapter
  {
    const up = win(f, E("up") + 20, E("control"), 10, 8);
    svg.push(<Arrow key="cfA" p={P(CF0, bars[CF0].l - 1.5)} q={P(CF0 + 4, bars[CF0 + 4].h + 1)} k={ramp(f, E("up") + 16, 26) * (1 - ramp(f, E("counter"), 10))} color={PAL.up} />);
    n.push(<Tag key="turn" x={c.x + 24} y={c.y + 24} ax={0} ay={0} zh={T.turnUp[0]} en={T.turnUp[1]} tone="up" a={up} />);
    n.push(<Tag key="dpos" x={cx(c, CF0 + 3)} y={DP.y + 10} ax={0} ay={0} zh={T.dPos[0]} en={T.dPos[1]} tone="up" a={win(f, E("dPos"), E("counter"), 10, 10)} size={30} />);
    n.push(<Tag key="cvd" x={c.x + 20} y={CP.y + 12} zh={T.cvdUp[0]} en={T.cvdUp[1]} tone="cyan" a={win(f, E("cvd") + 10, E("counter"), 10, 10)} size={30} />);
    n.push(<Tag key="ctl" x={c.x + 24} y={c.y + 24} zh={`✓ ${T.control[0]}`} en={T.control[1]} tone="up" a={win(f, E("control"), E("counter"), 10, 10)} />);
  }
  // ---- counter-example
  {
    const [x, yH] = P(S3, s3.h);
    const bigA = win(f, E("bigD") + 4, E("gap"), 10, 10);
    n.push(<Tag key="big" x={x - slot(c) * 0.9} y={DP.y + 8} ax={1} ay={0} zh={T.bigVol[0]} en={`Vol ×2.2 · Delta +${fmt(EXHAUST[S3].d)}`} tone="warn" a={bigA} size={30} />);
    svg.push(<HLine key="flat" x0={x} x1={c.x + c.w - 10} y={cy(c, s3.c)} k={ramp(f, E("noUp"), 14) * (1 - ramp(f, E("gap"), 10))} color={PAL.warn} />);
    n.push(<Tag key="noup" x={x + slot(c) * 0.8} y={cy(c, s3.c) + 14} ax={0} ay={0} zh={T.noRise[0]} en={T.noRise[1]} tone="warn" a={win(f, E("noUp"), E("gap"), 10, 10)} />);
    const wk = win(f, E("wick"), E("gap"), 10, 10);
    const bt = cy(c, Math.max(s3.o, s3.c));
    svg.push(<path key="br" d={`M${x + 18},${yH} h14 V${bt} h-14`} fill="none" stroke={PAL.warn} strokeOpacity={wk} strokeWidth={3} />);
    n.push(<Tag key="wick" x={x + 46} y={(yH + bt) / 2} ax={0} ay={0.5} zh={T.longWick[0]} en={T.longWick[1]} tone="warn" a={wk} />);
    const wa = win(f, E("warn"), E("gap"), 12, 10);
    const bw = slot(c) * 1.1;
    svg.push(<DashBox key="wb" x={x - bw / 2} y={yH - 12} w={bw} h={bt - yH + 60} k={wa} color={PAL.warn} fill={0.1} />);
    n.push(<Tag key="top" x={c.x + 24} y={c.y + 24} zh={T.topAbs[0]} en={T.topAbs[1]} tone="warn" a={wa} />);
    const nc = ramp(f, E("noChase"), 10) * (1 - ramp(f, E("gap"), 10));
    n.push(<Stamp key="nc1" x={c.x + 24} y={c.y + 250} zh={T.noChase[0]} en={T.noChase[1]} k={nc} right />);
  }
  // ---- gap
  {
    const g1 = GAPPED[S1 + 1];
    const fa = win(f, E("fast") + 6, E("entry"), 10, 10);
    n.push(<Tag key="gap" x={cx(c, S1) - slot(c) * 0.8} y={cy(c, (GAP1.lo + GAP1.hi) / 2)} ax={1} ay={0.5} zh={T.gapTag[0]} en={T.gapTag[1]} tone="warn" a={fa} />);
    svg.push(<Arrow key="fastA" p={P(S1 - 1, bars[S1].o - 2)} q={P(S3 + 1, bars[S3].c + 4)} k={ramp(f, E("fast") + 10, 18) * (1 - ramp(f, E("wait"), 10))} color={PAL.warn} />);
    n.push(<Tag key="fast" x={c.x + 24} y={c.y + 24} zh={T.tooFast[0]} en={T.tooFast[1]} tone="warn" a={win(f, E("fast") + 12, E("entry"), 10, 10)} />);
    // ghost path back into the gap: wait for the repair
    const wk = ramp(f, E("wait"), 22) * (1 - ramp(f, E("entry"), 10));
    const pts: [number, number][] = [P(S3, bars[S3].c), P(S3 + 1.5, (bars[S3].c + g1.c) / 2 + 3), P(S3 + 3, GAP1.lo + 1)];
    if (wk > 0.001) {
      svg.push(<polyline key="ghost" points={pts.map((p) => p.join(",")).join(" ")} fill="none" stroke={PAL.gold} strokeOpacity={wk} strokeWidth={3.5} strokeDasharray="12 10" />);
      svg.push(<circle key="gc" cx={pts[2][0]} cy={pts[2][1]} r={10} fill="none" stroke={PAL.gold} strokeOpacity={wk} strokeWidth={3} />);
    }
    n.push(<Tag key="wait" x={c.x + c.w - 14} y={pts[2][1] + 64} ax={1} ay={0} zh={T.waitRepair[0]} en={T.waitRepair[1]} a={win(f, E("wait") + 10, E("entry"), 10, 10)} />);
    n.push(<Stamp key="nc2" x={c.x + 24} y={c.y + 250} zh={T.noHigh[0]} en={T.noHigh[1]} k={ramp(f, E("noHigh"), 10) * (1 - ramp(f, E("entry"), 10))} right />);
  }
  // ---- entry
  {
    const xr = c.x + c.w;
    n.push(<Tag key="open" x={xr - 14} y={cy(c, S_OPEN) + 10} ax={1} ay={0} zh={`${T.open1[0]} ${S_OPEN}`} en={T.open1[1]} a={win(f, E("open1") + 6, E("stall"), 10, 8)} size={30} />);
    n.push(<Tag key="zone" x={xr - 14} y={cy(c, ZONE.hi + 0.5) - 8} ax={1} ay={1} zh={T.zoneTag[0]} en={T.zoneTag[1]} a={win(f, E("zoneE"), E("end"), 10, 10)} size={30} />);
    const b42 = BARS[PB0 + 3];
    const sk = win(f, E("stall"), E("risk"), 10, 10);
    svg.push(<circle key="stall" cx={cx(c, PB0 + 3)} cy={cy(c, b42.l) + 16} r={14} fill="none" stroke={PAL.gold} strokeOpacity={sk} strokeWidth={3} />);
    n.push(<Tag key="stallT" x={cx(c, PB0 + 3)} y={cy(c, b42.l) + 40} ax={0.5} ay={0} zh={T.stall[0]} en={T.stall[1]} a={sk} size={28} />);
    n.push(<Tag key="dturn" x={cx(c, CF0) + slot(c) * 0.8} y={DP.y + 10} ax={0} ay={0} zh={T.dTurn[0]} en={T.dTurn[1]} tone="up" a={win(f, E("dTurn"), E("risk"), 10, 10)} size={28} />);
    const ek = ramp(f, E("dTurn") + 8, 12) * (1 - ramp(f, E("end"), 12));
    const [ex, ey] = P(CF0, BARS[CF0].o);
    svg.push(<path key="entryM" d={`M${ex - 40},${ey} l-22,-14 v28 z`} fill={PAL.gold} fillOpacity={ek} />);
    n.push(<Tag key="cons" x={ex - 70} y={ey - 22} ax={1} ay={1} zh={T.consider[0]} en={T.consider[1]} a={win(f, E("dTurn") + 10, E("risk"), 10, 10)} size={28} />);
  }
  // ---- risk + targets
  {
    const xr = c.x + c.w;
    const sk = win(f, E("stop") + 4, E("end"), 10, 10);
    n.push(<Tag key="stop" x={xr - 14} y={cy(c, STOP) + 10} ax={1} ay={0} zh={`${T.stopTag[0]} · ${T.stopSub}`} en={T.stopTag[1]} tone="down" a={sk} size={28} />);
    const stk = win(f, E("struct"), E("targets") + 10, 10, 10);
    svg.push(<circle key="sl" cx={cx(c, PB0 + 2)} cy={cy(c, STRUCT_LOW)} r={12} fill="none" stroke={PAL.down} strokeOpacity={stk} strokeWidth={3} />);
    const lab = (key: string, p: number, t: string[], tn: string, ev: string, left = false) =>
      n.push(<Tag key={key} x={left ? cx(c, 13.5) : xr - 14} y={cy(c, p)} ax={left ? 0 : 1} ay={0.5} zh={t[0]} en={t[1]} tone={tn} a={win(f, E(ev), E("end"), 10, 10)} size={26} />);
    lab("ph", PRIOR_HIGH, T.priorHigh, "up", "tPH");
    lab("poc", PROFILE.poc, T.poc, "gold", "tPOC", true);
    lab("va", (PROFILE.val + PROFILE.vah) / 2, T.va, "cyan", "tVA");
    lab("liq", LIQ + 1.5, T.liq, "white", "tLiq", true);
    n.push(<Tag key="prof" x={c.x + 16} y={c.y + c.h - 16} ax={0} ay={1} zh={T.profileTag} tone="white" a={win(f, E("targets") + 16, E("end"), 10, 10) * 0.9} size={24} plain />);
    const tk = ramp(f, E("tPH"), 20) * (1 - ramp(f, E("end"), 12));
    svg.push(<Arrow key="tgt" p={P(CF0 + 2, BARS[CF0].o + 2)} q={P(CF0 + 2, PRIOR_HIGH - 2)} k={tk} color={PAL.up} w={3} />);
  }
  return (
    <>
      <Svg>{svg}</Svg>
      {n}
    </>
  );
};

/** "don't" stamp: a ✕ in a ring plus the words */
const Stamp: React.FC<{ x: number; y: number; zh: string; en: string; k: number; right?: boolean }> = ({ x, y, zh, en, k, right }) => {
  if (k <= 0.001) return null;
  const s = 1.25 - 0.25 * out3(k);
  return (
    <div style={{ position: "absolute", left: x, top: y, transform: `translate(${right ? 0 : -100}%, -100%) scale(${s})`, transformOrigin: right ? "0% 100%" : "100% 100%", opacity: Math.min(1, k * 1.5), display: "flex", alignItems: "center", gap: 14, padding: "10px 22px 10px 14px", background: "rgba(40,8,12,0.92)", border: `3px solid ${PAL.down}`, borderRadius: 14 }}>
      <svg width={52} height={52}>
        <circle cx={26} cy={26} r={22} fill={PAL.down} />
        <path d="M16 16 L36 36 M36 16 L16 36" stroke="#1a0508" strokeWidth={6} strokeLinecap="round" />
      </svg>
      <div>
        <div style={{ ...sans(900), fontSize: 40, lineHeight: 1.1, color: PAL.ink }}>{zh}</div>
        <div style={{ ...num(500), fontSize: 22, color: PAL.downHi }}>{en}</div>
      </div>
    </div>
  );
};

// ================================================================= hook overlay: question, 5-second countdown
const HookOverlay: React.FC<{ f: number }> = ({ f }) => {
  const out = 1 - ramp(f, E("flow") - 6, 12);
  if (out <= 0.001) return null;
  const qa = out3((f - E("ask")) / 10) * out;
  const fa = out3((f - E("five")) / 10) * out;
  const cd0 = E("cd");
  const t = (f - cd0) / 30; // seconds into the countdown
  const cdA = win(f, cd0 - 4, cd0 + 150, 6, 8);
  const digit = 5 - Math.floor(clamp01(t / 5) * 5 - 1e-6);
  const within = t - Math.floor(t);
  const pop = 1 + 0.18 * Math.max(0, 1 - within * 5);
  const R = 96;
  const C = 2 * Math.PI * R;
  const left = 1 - clamp01(t / 5);
  return (
    <>
      <div style={{ position: "absolute", left: 0, right: 0, top: 196, textAlign: "center", opacity: qa, transform: `translateY(${(1 - qa) * 20}px)` }}>
        <div style={{ ...num(700), fontSize: 124, lineHeight: 1.05, letterSpacing: 2 }}>
          <span style={{ color: PAL.up }}>BUY</span>
          <span style={{ color: PAL.soft, fontSize: 64 }}> OR </span>
          <span style={{ color: PAL.down }}>SELL</span>
          <span style={{ color: PAL.ink }}>?</span>
        </div>
        <div style={{ ...sans(900), fontSize: 60, color: PAL.ink, marginTop: 14 }}>{T.ask}</div>
      </div>
      <div style={{ position: "absolute", left: 0, right: 0, top: 470, display: "flex", justifyContent: "center", opacity: fa }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 18, padding: "6px 26px 8px", border: `2px solid ${PAL.gold}`, borderRadius: 12, background: "rgba(8,12,19,0.9)" }}>
          <span style={{ ...sans(900), fontSize: 40, color: PAL.gold }}>{T.five}</span>
          <span style={{ ...num(500), fontSize: 28, color: PAL.soft }}>{T.fiveEn}</span>
        </div>
      </div>
      {cdA > 0.001 && (
        <div style={{ position: "absolute", left: 640 - 130, top: 760 - 130, width: 260, height: 260, opacity: cdA * out }}>
          <svg width={260} height={260} style={{ position: "absolute", inset: 0 }}>
            <circle cx={130} cy={130} r={R + 14} fill="rgba(6,9,14,0.88)" />
            <circle cx={130} cy={130} r={R} fill="none" stroke="#ffffff" strokeOpacity={0.1} strokeWidth={10} />
            <circle cx={130} cy={130} r={R} fill="none" stroke={PAL.gold} strokeWidth={10} strokeLinecap="round" strokeDasharray={`${C * left} ${C}`} transform="rotate(-90 130 130)" />
          </svg>
          <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", ...num(700), fontSize: 132, color: PAL.ink, transform: `scale(${pop})` }}>{Math.max(1, digit)}</div>
        </div>
      )}
    </>
  );
};

// ================================================================= thesis plate (sits where the Delta panel will go)
const Thesis: React.FC<{ f: number }> = ({ f }) => {
  const a = win(f, E("thesis") + 4, E("delta") + 6, 12, 12);
  if (a <= 0.001) return null;
  const k2 = out3((f - E("t2")) / 12);
  return (
    <div style={{ position: "absolute", left: 50, width: 880, top: 1160, height: 290, display: "flex", alignItems: "center", justifyContent: "space-around", opacity: a, background: "rgba(8,12,19,0.92)", border: "1.5px solid rgba(159,179,207,0.18)", borderRadius: 12 }}>
      <div style={{ textAlign: "center" }}>
        <div style={{ ...sans(900), fontSize: 58, color: PAL.up }}>{T.thesis1}</div>
        <div style={{ ...num(500), fontSize: 26, color: PAL.soft }}>{T.thesis1En}</div>
      </div>
      <div style={{ ...num(700), fontSize: 96, color: PAL.gold, opacity: k2 }}>{T.thesisNe}</div>
      <div style={{ textAlign: "center", opacity: k2, transform: `translateX(${(1 - k2) * 20}px)` }}>
        <div style={{ ...sans(900), fontSize: 58, color: PAL.ink }}>{T.thesis2}</div>
        <div style={{ ...num(500), fontSize: 26, color: PAL.soft }}>{T.thesis2En}</div>
      </div>
    </div>
  );
};

// ================================================================= panel labels
const PanelLabels: React.FC<{ f: number; dimAll: number }> = ({ f, dimAll }) => {
  const dA = ramp(f, E("delta"), 16) * (1 - dimAll);
  const cA = (f < E("counter") ? ramp(f, E("cvd"), 16) : f < E("entry") ? 1 - ramp(f, E("counter"), 10) : ramp(f, E("entry") + 6, 14)) * (1 - dimAll);
  const lbl = (y: number, a: number, t: string[], col: string) =>
    a > 0.001 && (
      <div style={{ position: "absolute", left: AXIS_X, top: y, opacity: a, lineHeight: 1.2 }}>
        <div style={{ ...num(700), fontSize: 26, color: col }}>{t[0]}</div>
        <div style={{ ...sans(700), fontSize: 17, color: PAL.dim }}>{t[1]}</div>
      </div>
    );
  return (
    <>
      {lbl(DP.y + 6, dA, T.deltaTag, PAL.ink)}
      {lbl(CP.y + 6, cA, T.cvdTag, PAL.cyan)}
    </>
  );
};

// ================================================================= ending: checklist + line + disclaimer
const Ending: React.FC<{ f: number }> = ({ f }) => {
  const a = ramp(f, E("end"), 16);
  if (a <= 0.001) return null;
  const k1 = out3((f - E("e1")) / 14);
  const k2 = out3((f - E("e2")) / 14);
  const kd = ramp(f, E("disc"), 14);
  const ticks = [E("ck1"), E("ck2"), E("ck3")];
  return (
    <>
      <div style={{ position: "absolute", left: 90, width: 900, top: 380, opacity: a, transform: `translateY(${(1 - a) * 20}px)`, padding: "34px 40px", boxSizing: "border-box", background: "rgba(8,12,19,0.95)", border: `2px solid ${PAL.gold}`, borderRadius: 18 }}>
        <div style={{ ...sans(900), fontSize: 46, color: PAL.gold }}>{T.checkTitle[0]}</div>
        <div style={{ ...num(500), fontSize: 24, color: PAL.soft, marginBottom: 22 }}>{T.checkTitle[1]}</div>
        {T.checks.map(([zh, en], k) => {
          const tk = out3((f - ticks[k]) / 10);
          const on = tk > 0.01;
          return (
            <div key={zh} style={{ display: "flex", alignItems: "center", gap: 24, padding: "18px 0", borderTop: "1.5px solid rgba(159,179,207,0.15)" }}>
              <svg width={58} height={58} style={{ flex: "none" }}>
                <rect x={3} y={3} width={52} height={52} rx={10} fill={on ? PAL.up : "none"} fillOpacity={tk} stroke={on ? PAL.up : "#4a5568"} strokeWidth={3} />
                {on && <path d="M15 30 L25 40 L43 19" fill="none" stroke="#04140c" strokeWidth={6} strokeLinecap="round" strokeLinejoin="round" strokeDasharray={60} strokeDashoffset={60 * (1 - tk)} />}
              </svg>
              <div>
                <div style={{ ...sans(900), fontSize: 50, color: on ? PAL.ink : PAL.dim }}>{zh}</div>
                <div style={{ ...num(500), fontSize: 26, color: on ? PAL.soft : "#3d4757" }}>{en}</div>
              </div>
            </div>
          );
        })}
      </div>
      <div style={{ position: "absolute", left: 0, right: 0, top: 1040, textAlign: "center" }}>
        <div style={{ ...serif(900), fontSize: 92, color: PAL.ink, opacity: k1, transform: `translateY(${(1 - k1) * 20}px)`, letterSpacing: 2 }}>{T.end1}</div>
        <div style={{ ...serif(900), fontSize: 92, color: PAL.gold, opacity: k2, transform: `translateY(${(1 - k2) * 20}px)`, letterSpacing: 2, marginTop: 6 }}>{T.end2}</div>
        <div style={{ ...num(500), fontSize: 30, color: PAL.soft, opacity: k2, marginTop: 12 }}>{T.endEn}</div>
      </div>
      <div style={{ position: "absolute", left: 0, right: 0, top: 1420, display: "flex", justifyContent: "center", opacity: kd }}>
        <div style={{ textAlign: "center", padding: "12px 34px", border: "2px solid rgba(170,182,198,0.35)", borderRadius: 30, background: "rgba(8,12,19,0.9)" }}>
          <div style={{ ...sans(700), fontSize: 34, color: PAL.ink, letterSpacing: 2 }}>{T.disc}</div>
          <div style={{ ...num(500), fontSize: 24, color: PAL.soft }}>{T.discEn}</div>
        </div>
      </div>
    </>
  );
};

// ================================================================= headers
const CH = ["thesis", "delta", "absorb", "confirm", "counter", "gap", "entry", "risk"];
const Headers: React.FC<{ f: number }> = ({ f }) => (
  <>
    {CH.map((id, k) => {
      const a = E(id);
      const b = k + 1 < CH.length ? E(CH[k + 1]) : E("end");
      const [n, zh, en] = T.chapters[id];
      return <Header key={id} n={n} zh={zh} en={en} a={win(f, a, b, 10, 6)} f={f} from={a} />;
    })}
  </>
);

const HIDE = new Set(["e1", "e2"]); // the ending shows these as the closing statement

export const OrderFlowFilm: React.FC<{ muted?: boolean }> = ({ muted = false }) => {
  const f = useCurrentFrame();
  const dimAll = 0.88 * ramp(f, E("end"), 18);
  const last = lastVisible(f);
  const lb = dataAt(f)[last];
  return (
    <AbsoluteFill style={{ background: PAL.bg }}>
      <Page>
        <Background />
        <ChartLayer f={f} dimAll={dimAll} />
        <PanelLabels f={f} dimAll={dimAll} />
        {f < E("end") + 20 && <Notes f={f} />}
        <Thesis f={f} />
        <HookOverlay f={f} />
        <Headers f={f} />
        <Ending f={f} />
        <Captions f={f} hide={HIDE} />
        <TopBar symbol={T.symbol} tf={T.tf} tag={T.tag} risk={T.risk} price={lb.c} up={lb.c >= lb.o} />
      </Page>
      {!muted && <Audio src={staticFile("orderflow/mix.wav")} />}
    </AbsoluteFill>
  );
};

/** Cover: the full chart, the three candles, BUY OR SELL? */
export const OrderFlowCover: React.FC = () => {
  const f = E("five") + 24;
  const lb = BARS[S3];
  return (
    <AbsoluteFill style={{ background: PAL.bg }}>
      <Page>
        <Background />
        <ChartLayer f={f} />
        <HookOverlay f={f} />
        <div style={{ position: "absolute", left: 0, right: 0, top: 1500, textAlign: "center" }}>
          <div style={{ ...sans(900), fontSize: 64, color: PAL.ink }}>
            不是追阳线，<span style={{ color: PAL.gold }}>是等订单流确认</span>
          </div>
          <div style={{ ...num(500), fontSize: 34, color: PAL.soft, marginTop: 16, letterSpacing: 2 }}>{T.coverSub}</div>
        </div>
        <TopBar symbol={T.symbol} tf={T.tf} tag={T.tag} risk={T.risk} price={lb.c} up />
      </Page>
    </AbsoluteFill>
  );
};

export { FRAMES };
