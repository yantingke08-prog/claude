// The explanation strip: the band between the 3D image and the captions (y ≈ 1650–1890).
// Each section gets one short chain of steps that light up on the words that name them, so the viewer always
// sees where the current beat sits in the mechanism. Subordinate to the headline: smaller type, one row (two at most).
import React from "react";
import { E, backOut, out3, ramp, win } from "./cue";
import { A_HIGH, A_LOW, BAD_STOP, ROUND, SPIKE, TEST_WICK } from "./data";
import { num, sans } from "./fonts";
import { T } from "./text";
import { COL, bufferSpan } from "./world";

const INK = "#f3ead9";
const DIM = "rgba(243,234,217,0.28)";
const TOP = 1684;

type Node = { at: number; zh: string; sub?: string; color?: string };
const Chip: React.FC<{ f: number; n: Node; cur: boolean; w: number }> = ({ f, n, cur, w }) => {
  const k = ramp(f, n.at, 8);
  const c = n.color ?? COL.gold;
  return (
    <div
      style={{
        width: w,
        boxSizing: "border-box",
        padding: "10px 12px 12px",
        borderRadius: 14,
        border: `2px solid ${k > 0.5 ? c : "rgba(243,234,217,0.14)"}`,
        background: cur ? "rgba(233,180,76,0.12)" : "rgba(5,8,14,0.72)",
        textAlign: "center",
        opacity: 0.35 + 0.65 * k,
        transform: `scale(${0.94 + 0.06 * backOut(k)})`,
      }}
    >
      <div style={{ ...sans(900), fontSize: 38, lineHeight: 1.25, color: k > 0.5 ? INK : DIM, whiteSpace: "nowrap" }}>{n.zh}</div>
      {n.sub && <div style={{ ...sans(700), fontSize: 28, lineHeight: 1.3, color: k > 0.5 ? c : DIM, whiteSpace: "nowrap" }}>{n.sub}</div>}
    </div>
  );
};
const Arrow: React.FC<{ k: number }> = ({ k }) => (
  <svg width={34} height={30} style={{ flexShrink: 0, opacity: 0.3 + 0.7 * k }}>
    <path d="M2 15 H26 M18 7 L27 15 L18 23" fill="none" stroke={k > 0.5 ? COL.gold : DIM} strokeWidth={3.5} strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);
/** a row of steps joined by arrows; the newest lit step is highlighted */
const Chain: React.FC<{ f: number; nodes: Node[]; top?: number }> = ({ f, nodes, top = TOP }) => {
  const w = Math.floor((1320 - (nodes.length - 1) * 34) / nodes.length) - 6;
  let cur = -1;
  nodes.forEach((n, i) => {
    if (f >= n.at) cur = i;
  });
  return (
    <div style={{ position: "absolute", left: 60, right: 60, top, display: "flex", alignItems: "center", justifyContent: "center", gap: 3 }}>
      {nodes.map((n, i) => (
        <React.Fragment key={i}>
          {i > 0 && <Arrow k={ramp(f, n.at - 2, 8)} />}
          <Chip f={f} n={n} cur={i === cur} w={w} />
        </React.Fragment>
      ))}
    </div>
  );
};
const Band: React.FC<{ a: number; children: React.ReactNode }> = ({ a, children }) =>
  a <= 0.002 ? null : <div style={{ position: "absolute", inset: 0, opacity: a, transform: `translateY(${(1 - out3(a)) * 16}px)` }}>{children}</div>;

/** two side-by-side cards that compare outcomes */
const Versus: React.FC<{ f: number; left: { at: number; title: string; items: string[]; color: string }; right: { at: number; title: string; items: string[]; color: string } }> = ({ f, left, right }) => {
  const card = (c: typeof left) => {
    const k = ramp(f, c.at, 10);
    return (
      <div style={{ flex: 1, padding: "12px 20px 14px", borderRadius: 14, border: `2px solid ${k > 0.5 ? c.color : "rgba(243,234,217,0.14)"}`, background: "rgba(5,8,14,0.72)", opacity: 0.35 + 0.65 * k }}>
        <div style={{ ...sans(900), fontSize: 40, color: k > 0.5 ? c.color : DIM }}>{c.title}</div>
        <div style={{ ...sans(700), fontSize: 32, color: k > 0.5 ? INK : DIM, marginTop: 4 }}>{c.items.join(" · ")}</div>
      </div>
    );
  };
  return (
    <div style={{ position: "absolute", left: 60, right: 60, top: TOP, display: "flex", gap: 20 }}>
      {card(left)}
      {card(right)}
    </div>
  );
};

export const Strip: React.FC<{ f: number }> = ({ f }) => {
  const S = T.strip;
  const liqIn = E("liqIn");
  const mechIn = E("mechIn");
  const hidden = E("hidden");
  const wickIn = E("wickIn");
  const pollIn = E("pollIn");
  const checkIn = E("checkIn");
  const stopIn = E("stopIn");
  const coreIn = E("coreIn");
  const span = bufferSpan(f);
  return (
    <>
      <Band a={win(f, 8, liqIn, 10, 8)}>
        <Chain f={f} nodes={[{ at: 8, zh: S.hook[0], sub: S.hookSub[0], color: INK }, { at: E("reveal") + 10, zh: S.hook[1], sub: S.hookSub[1], color: COL.up }, { at: E("seeLiq"), zh: S.hook[2], sub: S.hookSub[2] }]} />
      </Band>
      <Band a={win(f, liqIn + 6, mechIn, 10, 8)}>
        <Chain f={f} nodes={[{ at: liqIn + 6, zh: S.liq[0], sub: S.liqSub[0], color: INK }, { at: E("liqRow"), zh: S.liq[1], sub: S.liqSub[1] }, { at: E("liqMany"), zh: S.liq[2], sub: S.liqSub[2] }, { at: E("liqDone"), zh: S.liq[3], sub: S.liqSub[3], color: INK }]} />
      </Band>
      <Band a={win(f, mechIn + 4, hidden, 10, 8)}>
        <Chain f={f} top={TOP - 52} nodes={[{ at: E("hiLevel"), zh: S.up[0], color: COL.up }, { at: E("shortStops"), zh: S.up[1], color: COL.up }, { at: E("buyTag"), zh: S.up[2], color: COL.up }]} />
        <Chain f={f} top={TOP + 70} nodes={[{ at: E("loLevel"), zh: S.down[0], color: COL.down }, { at: E("longStops"), zh: S.down[1], color: COL.down }, { at: E("sellTag"), zh: S.down[2], color: COL.down }]} />
      </Band>
      <Band a={win(f, hidden + 2, wickIn + 6, 10, 8)}>
        <Chain f={f} nodes={[{ at: E("pile"), zh: S.sweep[0] }, { at: E("hunt"), zh: S.sweep[1], color: COL.up }, { at: E("fire"), zh: S.sweep[2], color: COL.up }, { at: E("volume"), zh: S.sweep[3], color: COL.up }, { at: E("counter"), zh: S.sweep[4], color: INK }]} />
      </Band>
      <Band a={win(f, wickIn + 6, pollIn, 10, 8)}>
        <Chain f={f} nodes={[{ at: E("wickTag"), zh: S.wick[0], sub: S.wickSub[0] }, { at: E("look"), zh: S.wick[1], sub: S.wickSub[1] }, { at: E("pileUnder"), zh: S.wick[2], sub: S.wickSub[2], color: COL.up }]} />
      </Band>
      <Band a={win(f, pollIn + 4, checkIn, 10, 8)}>
        <Chain
          f={f}
          nodes={[
            { at: E("lvHigh"), zh: T.lvHigh, sub: A_HIGH.toFixed(2) },
            { at: E("lvLow"), zh: T.lvLow, sub: A_LOW.toFixed(2) },
            { at: E("round"), zh: T.lvRound, sub: ROUND.toFixed(2) },
            { at: E("visible"), zh: S.poll[0], sub: S.poll[1], color: INK },
            { at: E("gather"), zh: S.poll[2], sub: S.poll[3], color: COL.up },
          ]}
        />
      </Band>
      <Band a={win(f, E("c1"), stopIn, 10, 8)}>
        <Versus f={f} left={{ at: E("c1"), title: S.real, items: S.realItems, color: COL.gold }} right={{ at: E("pierce"), title: S.test, items: S.testItems, color: COL.down }} />
      </Band>
      <Band a={win(f, E("badStop"), E("goodIn"), 10, 8)}>
        <Chain
          f={f}
          nodes={[
            { at: E("badStop"), zh: S.bad[0], sub: BAD_STOP.toFixed(2), color: INK },
            { at: E("badStop") + 14, zh: S.bad[1], sub: SPIKE.h.toFixed(2), color: COL.gold },
            { at: E("badHit"), zh: S.bad[2], sub: S.bad[3], color: COL.up },
          ]}
        />
      </Band>
      <Band a={win(f, E("buffer"), coreIn, 10, 8)}>
        <div style={{ position: "absolute", left: 60, right: 60, top: TOP + 6, display: "flex", alignItems: "center", justifyContent: "center", gap: 18, background: "rgba(5,8,14,0.72)", borderRadius: 16, padding: "18px 10px", border: "2px solid rgba(233,180,76,0.45)" }}>
          <Term label={S.f[0]} v={TEST_WICK.toFixed(2)} k={ramp(f, E("buffer"), 8)} />
          <Op s="+" />
          <Term label={S.f[1]} v={span.toFixed(2)} k={ramp(f, E("buffer") + 8, 8)} hi={win(f, E("tune"), coreIn, 6, 8)} />
          <Op s="=" />
          <Term label={S.f[2]} v={(TEST_WICK + span).toFixed(2)} k={ramp(f, E("buffer") + 16, 8)} gold />
          <div style={{ ...sans(700), fontSize: 30, color: "rgba(243,234,217,0.7)", marginLeft: 10, opacity: ramp(f, E("goodHold") + 10, 10) }}>{S.f[3]} {SPIKE.h.toFixed(2)}</div>
        </div>
      </Band>
    </>
  );
};
const Op: React.FC<{ s: string }> = ({ s }) => <div style={{ ...num(700), fontSize: 50, color: "rgba(243,234,217,0.6)" }}>{s}</div>;
const Term: React.FC<{ label: string; v: string; k: number; gold?: boolean; hi?: number }> = ({ label, v, k, gold, hi = 0 }) => (
  <div style={{ textAlign: "center", opacity: 0.3 + 0.7 * k }}>
    <div style={{ ...sans(700), fontSize: 30, color: "rgba(243,234,217,0.72)" }}>{label}</div>
    <div style={{ ...num(700), fontSize: 54, color: gold ? COL.gold : INK, textShadow: hi > 0.01 ? `0 0 ${18 * hi}px rgba(233,180,76,0.8)` : undefined }}>{v}</div>
  </div>
);
