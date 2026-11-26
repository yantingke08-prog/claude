// 2D layer over the 3D stage, inside the zones of layout.ts:
//   status 0–200 (series + data tag left, risk notice right — always on) · data 220–1880 (ONE main tag beside its
//   object, price ladder numbers) · cards 1900–2100 (at most TWO cards) · captions 2120–2320 (subtitles only).
// Every element appears on a spoken word (events.json). An old tag steps back — shrinks, rises, dims, blurs —
// during the 6 frames before the next one's word, so there is never a crossfade of two main tags.
import React from "react";
import { mainAct } from "./acts";
import { E, YIELD, captions, clamp01, ease, out3, sections, win } from "./cue";
import { ACCEPT, AC_TEST, CH_X0, HOOK_BREAK, HOOK_HOLD, LADDER_X, LINE_P, LVN_I, MAIN, NEW_VA, POC, POC_I, PROF_X, P_HI, P_LO, RJ_BACK, RJ_MIRROR, RJ_POKE, SX, VAH, VAL, VB, VOL_H, cxOf, fmt, py, type SetId } from "./data";
import { SET_IN, presence, projector, type Proj } from "./director";
import { num, sans } from "./fonts";
import { CAP, CARD, LAYOUT, LBL, clampX, clampY, textW } from "./layout";
import { T, type Accent } from "./text";
import { COL, MAP_Z, mapPoint } from "./world";

const M = LAYOUT.margin;
const INK = "#f3ead9";
const SOFT = "rgba(243,234,217,0.62)";
const PLATE = "rgba(5,8,15,0.84)";
export const tone = (a: Accent) => (a === "up" ? COL.up : a === "down" ? COL.down : a === "gold" ? COL.gold : a === "mute" ? SOFT : INK);

// ---------------------------------------------------------------- which set is on screen
const ORDER: SetId[] = ["hook", "main", "accept", "reject", "watch", "map", "end"];
export const setAt = (f: number): SetId => {
  let cur: SetId = "hook";
  for (const s of ORDER) if (SET_IN[s] && f >= E(SET_IN[s]!)) cur = s;
  return cur;
};
/** world point of a set-local point, including the set's step-back transform */
const W = (f: number, s: SetId, x: number, y: number, z = 0.4) => {
  const p = presence(f, s);
  return { x: SX[s] + x * p.scale, y: y * p.scale + p.dy, z: z * p.scale };
};

// ================================================================= main tags (one at a time)
type Side = "above" | "below" | "right" | "left";
type Main = { at: string; until?: string; key: string; accent: Accent; where: ((f: number) => { s: SetId; x: number; y: number; z?: number; world?: boolean }) | null; side: Side };
const MAIN_TAGS = (): Main[] => [
  { at: "L01_撑住", key: "hold", accent: "up", side: "above", where: () => ({ s: "hook", x: cxOf(HOOK_HOLD) + 0.25, y: py(LINE_P) + 0.9 }) },
  { at: "L01_一碰就穿", key: "pierce", accent: "down", side: "right", where: () => ({ s: "hook", x: cxOf(HOOK_BREAK) + 0.3, y: py(LINE_P) - 0.5 }) },
  { at: "L02_那条线", key: "noLine", accent: "mute", side: "above", where: () => ({ s: "hook", x: CH_X0 + 0.2, y: py(LINE_P) + 0.1 }) },
  { at: "L02_三个数", key: "three3", accent: "gold", side: "left", where: () => ({ s: "hook", x: PROF_X - 0.35, y: py(105.4) }) },
  { at: "L03_划支撑", key: "dontDraw", accent: "ink", side: "above", where: () => ({ s: "hook", x: CH_X0 + 0.2, y: py(LINE_P + 0.75) + 0.1 }) },
  { at: "L04_volume", key: "vp", accent: "gold", side: "above", where: () => ({ s: "main", x: PROF_X + 0.1, y: py(P_HI) + 0.35 }) },
  { at: "L05_每个价位", key: "perPrice", accent: "ink", side: "right", where: () => ({ s: "main", x: LADDER_X + 0.5, y: py(107) }) },
  { at: "L06_成交最密", key: "dense", accent: "gold", side: "left", until: "L06_价值区", where: () => ({ s: "main", x: PROF_X - 0.2, y: py(POC) }) },
  { at: "L07_拍脑袋", key: "notGuess", accent: "ink", side: "above", where: () => ({ s: "main", x: CH_X0 + 0.2, y: py(106) }) },
  { at: "L08_一笔一笔", key: "vote", accent: "gold", side: "above", until: "L09_成交最密的地方", where: () => ({ s: "main", x: CH_X0 + 0.6, y: py(105.5) }) },
  { at: "L09_最认的价", key: "agreed", accent: "gold", side: "above", until: "L10_三个数", where: () => ({ s: "main", x: cxOf(5), y: py(POC) + 0.15 }) },
  { at: "L11_成交量", key: "poc", accent: "gold", side: "above", where: () => ({ s: "main", x: cxOf(5), y: py(POC) + 0.12 }) },
  { at: "L12_上沿", key: "vah", accent: "ink", side: "above", where: () => ({ s: "main", x: cxOf(5), y: py(VAH) + 0.12 }) },
  { at: "L13_下沿", key: "val", accent: "ink", side: "below", until: "L14_第一反应", where: () => ({ s: "main", x: cxOf(5), y: py(VAL) - 0.12 }) },
  { at: "L16_一堵墙", key: "notWall", accent: "ink", side: "above", where: () => ({ s: "main", x: cxOf(5), y: py(VAH) + 0.5 }) },
  { at: "L17_一个区间", key: "range", accent: "gold", side: "above", where: () => ({ s: "main", x: cxOf(5), y: py(VAH) + 0.15 }) },
  { at: "L18_来回震", key: "chop", accent: "gold", side: "below", where: () => ({ s: "main", x: cxOf(5), y: py(VAL) - 0.15 }) },
  { at: "L19_边缘", key: "edge", accent: "gold", side: "above", where: () => ({ s: "main", x: cxOf(MAIN.length - 1) - 2.2, y: py(VAH) + 0.25 }) },
  { at: "L20_上沿", key: "atTop", accent: "ink", side: "above", until: "L21_做空", where: () => ({ s: "main", x: cxOf(MAIN.length - 1) - 1.6, y: py(VAH) + 0.25 }) },
  { at: "L25_成交继续放大", key: "rush", accent: "up", side: "above", where: () => ({ s: "accept", x: cxOf(7), y: VB.accept + VOL_H + 0.2 }) },
  { at: "L26_站住", key: "stand", accent: "up", side: "below", where: () => ({ s: "accept", x: cxOf(AC_TEST) - 0.2, y: py(ACCEPT[AC_TEST].l) - 0.3 }) },
  { at: "L26_接受", key: "accept", accent: "gold", side: "above", until: "L27_冲上去", where: () => ({ s: "accept", x: cxOf(4), y: py(NEW_VA.hi) + 0.2 }) },
  { at: "L27_没人跟", key: "thin", accent: "ink", side: "above", where: () => ({ s: "reject", x: cxOf(RJ_POKE) - 0.3, y: VB.reject + VOL_H + 0.2 }) },
  { at: "L27_缩回来", key: "snap", accent: "down", side: "right", where: () => ({ s: "reject", x: cxOf(RJ_BACK) + 0.3, y: py(VAH) - 0.3 }) },
  { at: "L28_不认", key: "reject", accent: "ink", side: "above", where: () => ({ s: "reject", x: cxOf(4), y: py(VAH + 0.75) }) },
  { at: "L28_往下也一样", key: "mirror", accent: "up", side: "below", until: "L29_碰到线", where: () => ({ s: "reject", x: cxOf(RJ_MIRROR) - 0.6, y: py(VAL) - 0.65 }) },
  { at: "L29_碰到线", key: "touch", accent: "gold", side: "above", where: () => ({ s: "watch", x: cxOf(7), y: py(VAH) + 0.35 }) },
  { at: "L30_能不能站住", key: "standQ", accent: "gold", side: "above", where: () => ({ s: "watch", x: cxOf(7), y: py(VAH) + 0.35 }) },
  { at: "L31_中间", key: "middle", accent: "gold", side: "below", where: () => ({ s: "watch", x: cxOf(2), y: py(VAL) - 0.15 }) },
  { at: "L32_边缘", key: "edges", accent: "gold", side: "above", until: "L33_站住了", where: () => ({ s: "watch", x: cxOf(6), y: py(VAH) + 0.25 }) },
  { at: "L35_旧价值", key: "oldPull", accent: "gold", side: "below", until: "L36_买卖按钮", where: () => ({ s: "watch", x: cxOf(2), y: py(VAL) - 0.15 }) },
  { at: "L36_买卖按钮", key: "notButton", accent: "ink", side: "above", until: "L37_地图", where: () => ({ s: "map", x: 0, y: 1.25, z: 2.6 }) },
  { at: "L37_地图", key: "map", accent: "gold", side: "above", until: "L38_最认可", where: () => ({ s: "map", x: -1.6, y: 0.6, z: MAP_Z(107.5) }) },
  { at: "L38_最认可", key: "mostAgreed", accent: "gold", side: "above", where: () => ({ ...mapPoint(POC_I, -1.6, 0.15), s: "map", world: true }) },
  { at: "L39_稀薄", key: "thinArea", accent: "ink", side: "above", where: () => ({ ...mapPoint(LVN_I, -1.6, 0.1), s: "map", world: true }) },
  { at: "L40_回到价值区", key: "back", accent: "gold", side: "right", until: "L41_能不能买", where: () => ({ ...mapPoint(POC_I + 2, 1.4, 0.4), s: "map", world: true }) },
  { at: "L45_评论区", key: "comment", accent: "gold", side: "above", until: "L46_POC", where: null },
  { at: "L46_POC", key: "poc", accent: "gold", side: "above", until: "L47_磁铁", where: () => ({ s: "end", x: cxOf(5), y: py(POC) + 0.12 }) },
  { at: "L47_磁铁", key: "magnet", accent: "gold", side: "above", where: () => ({ s: "end", x: cxOf(5), y: py(POC) + 0.12 }) },
];
const mText = (k: string) => {
  const t = T.M[k];
  if (!t) throw new Error(`no label text ${k}`);
  return t;
};

let mainCache: (Main & { a0: number; a1: number })[] | null = null;
const mains = () =>
  (mainCache ??= MAIN_TAGS().map((m, i, all) => ({ ...m, a0: E(m.at), a1: m.until ? E(m.until) : i + 1 < all.length ? E(all[i + 1].at) : 1e9 })));

/** enter: rise + fade in over 8 frames; leave: during the YIELD frames before its end, shrink, rise, dim, blur */
const stepBack = (f: number, a0: number, a1: number) => {
  const inK = out3((f - a0) / 8);
  const outK = ease((f - (a1 - YIELD)) / YIELD);
  return { a: Math.min(inK, 1 - outK), dy: 10 * (1 - inK) - 14 * outK, s: 1 - 0.06 * outK, blur: 3 * outK };
};

const Tag: React.FC<{ m: Main & { a0: number; a1: number }; f: number; pr: Proj }> = ({ m, f, pr }) => {
  const st = stepBack(f, m.a0, m.a1);
  if (st.a <= 0.003) return null;
  const [k, v] = mText(m.key);
  const c = tone(m.accent);
  const w = Math.ceil(textW(k, LBL.k) + (v ? LBL.gap + textW(v, LBL.v) : 0) + 2 * 22 + 6);
  const h = 78;
  let x: number;
  let y: number;
  if (!m.where) {
    x = (LAYOUT.W - w) / 2;
    y = LAYOUT.data.bottom - h - 40;
  } else {
    const q = m.where(f);
    const wp = q.world ? { x: q.x, y: q.y, z: q.z ?? 0 } : W(f, q.s, q.x, q.y, q.z ?? 0.4);
    const p = pr(wp.x, wp.y, wp.z);
    const G = 16;
    if (m.side === "above") [x, y] = [p.x, p.y - G - h];
    else if (m.side === "below") [x, y] = [p.x, p.y + G];
    else if (m.side === "right") [x, y] = [p.x + G, p.y - h / 2];
    else [x, y] = [p.x - G - w, p.y - h / 2];
  }
  x = clampX(x, w);
  y = clampY(y, h);
  return (
    <div
      style={{
        position: "absolute", left: x, top: y, width: w, height: h, boxSizing: "border-box", opacity: st.a,
        transform: `translateY(${st.dy}px) scale(${st.s})`, transformOrigin: "left center", filter: st.blur > 0.05 ? `blur(${st.blur}px)` : undefined,
        background: PLATE, borderLeft: `6px solid ${c}`, borderRadius: 10, padding: "0 22px", display: "flex", alignItems: "center", gap: LBL.gap, whiteSpace: "nowrap",
      }}
    >
      <span style={{ ...sans(900), fontSize: LBL.k, color: c, lineHeight: 1 }}>{k}</span>
      {v && <span style={{ ...sans(700), fontSize: LBL.v, color: m.accent === "mute" ? SOFT : INK, lineHeight: 1 }}>{v}</span>}
    </div>
  );
};

// ================================================================= cards (at most two)
type Card = { at: string; until: string; key: string; slot: 0 | 1; m?: boolean; accent?: Accent; hl?: string; strike?: string; pulse?: string; list?: true };
const CARDS: Card[] = [
  { at: "L06_价值区", until: "L08_真金白银", key: "va70", slot: 0 },
  { at: "L10_三个数", until: "L14_第一反应", key: "three", slot: 0 },
  { at: "L11_有没有人认", until: "L12_上沿", key: "pocQ", slot: 1, m: true, accent: "gold" },
  { at: "L12_压力", until: "L13_下沿", key: "vahQ", slot: 1, m: true, accent: "ink" },
  { at: "L13_有没有人接", until: "L14_第一反应", key: "valQ", slot: 1, m: true, accent: "ink" },
  { at: "L14_第一反应", until: "L15_碰到上沿就空", key: "reflex", slot: 0 },
  { at: "L15_碰到上沿就空", until: "L16_一堵墙", key: "short", slot: 0 },
  { at: "L15_碰到下沿就多", until: "L16_一堵墙", key: "long", slot: 1 },
  { at: "L21_做空", until: "L25_冲到上沿", key: "pollShort", slot: 0, hl: "L23_做空", strike: "L24_最爱骗", pulse: "L22_弹幕" },
  { at: "L21_等确认", until: "L25_冲到上沿", key: "pollWait", slot: 1, pulse: "L22_弹幕" },
  { at: "L25_成交继续放大", until: "L29_碰到线", key: "look", slot: 0, list: true },
  { at: "L33_站住了", until: "L36_买卖按钮", key: "standUp", slot: 0 },
  { at: "L34_站不住", until: "L36_买卖按钮", key: "fallBack", slot: 1 },
  { at: "L41_能不能买", until: "L43_中间", key: "canBuy", slot: 0, strike: "L42_认不认" },
  { at: "L42_认不认", until: "L43_中间", key: "accepted", slot: 1 },
  { at: "L43_中间", until: "L46_POC", key: "mid", slot: 0, pulse: "L45_评论区" },
  { at: "L44_边缘", until: "L46_POC", key: "edge", slot: 1, pulse: "L45_评论区" },
  { at: "L46_POC", until: "__end", key: "next", slot: 0 },
];
const cardRows = (c: Card, f: number): [string, Accent][] => {
  if (c.m) {
    const [k, v] = T.M[c.key];
    return [
      [k, "mute"],
      [v, c.accent ?? "ink"],
    ];
  }
  const rows = T.C[c.key];
  if (c.key === "pollShort" && c.hl && f >= E(c.hl)) return [rows[0], [T.C.intuitive[0][0], "mute"]];
  return rows;
};
const endOf = (n: string) => (n === "__end" ? 1e9 : E(n));
/** a card that ever shares the band with another keeps its half-width place the whole time (no jumping) */
const paired = (c: Card) => CARDS.some((o) => o !== c && o.slot !== c.slot && E(o.at) < endOf(c.until) && E(c.at) < endOf(o.until));

const Checklist: React.FC<{ f: number }> = ({ f }) => {
  const on = [E("L25_成交继续放大"), E("L27_缩回来"), E("L26_回踩")];
  const rows = [T.C.look1, T.C.look2, T.C.look3b];
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 34, height: "100%" }}>
      <span style={{ ...sans(900), fontSize: CARD.k, color: COL.gold }}>{T.C.look3[0][0]}</span>
      {rows.map((r, i) => {
        const k = clamp01((f - on[i]) / 8);
        return (
          <span key={i} style={{ display: "flex", alignItems: "center", gap: 8, opacity: 0.3 + 0.7 * k }}>
            <span style={{ ...sans(900), fontSize: 40, color: k > 0.5 ? COL.gold : SOFT }}>{r[0][0]}</span>
            <span style={{ ...sans(700), fontSize: 38, color: INK }}>{r[1][0]}</span>
          </span>
        );
      })}
    </div>
  );
};

const Cards: React.FC<{ f: number }> = ({ f }) => {
  const live = CARDS.filter((c) => f >= E(c.at) && f < endOf(c.until));
  if (!live.length) return null;
  const zone = LAYOUT.cards;
  const fullW = LAYOUT.W - 2 * M;
  return (
    <>
      {live.slice(0, LAYOUT.maxCards).map((c) => {
        const st = stepBack(f, E(c.at), endOf(c.until));
        const both = paired(c);
        const w = c.list || !both ? Math.min(fullW, c.list ? fullW : 900) : (fullW - CARD.gap) / 2;
        const x = c.list || !both ? (LAYOUT.W - w) / 2 : M + c.slot * (w + CARD.gap);
        const rows = c.list ? [] : cardRows(c, f);
        const strike = c.strike ? ease((f - E(c.strike)) / 10) : 0;
        const pulse = c.pulse && f >= E(c.pulse) ? Math.max(0, 1 - (f - E(c.pulse)) / 30) : 0;
        const hl = c.hl && f >= E(c.hl) ? 1 : 0;
        const accent = rows[0] ? tone(rows[0][1]) : COL.gold;
        return (
          <div
            key={c.key}
            style={{
              position: "absolute", left: x, top: zone.top + (zone.bottom - zone.top - CARD.h) / 2, width: w, height: CARD.h, boxSizing: "border-box",
              opacity: st.a * (1 - 0.55 * strike), transform: `translateY(${st.dy}px) scale(${st.s * (1 + 0.04 * pulse)})`, filter: st.blur > 0.05 ? `blur(${st.blur}px)` : undefined,
              background: "rgba(6,10,18,0.86)", border: `2px solid ${hl ? accent : "rgba(243,234,217,0.16)"}`, borderTop: `4px solid ${accent}`, borderRadius: 16,
              padding: `0 ${CARD.padX}px`, display: "flex", flexDirection: c.list ? "row" : "column", alignItems: "center", justifyContent: "center", gap: 6, whiteSpace: "nowrap",
            }}
          >
            {c.list ? (
              <Checklist f={f} />
            ) : (
              rows.map(([t, a], i) =>
                t ? (
                  <div key={i} style={{ ...(i === 0 ? sans(900) : sans(700)), fontSize: i === 0 ? CARD.k : CARD.v, lineHeight: 1.15, color: tone(a), position: "relative" }}>
                    {t}
                    {i === 0 && strike > 0 && <div style={{ position: "absolute", left: -6, top: "54%", height: 4, width: `calc(${strike * 100}% + 12px)`, background: INK }} />}
                  </div>
                ) : null,
              )
            )}
          </div>
        );
      })}
    </>
  );
};

// ================================================================= price ladder numbers + strip tags
const LadderText: React.FC<{ f: number; pr: Proj }> = ({ f, pr }) => {
  const s = setAt(f);
  if (s === "map") return null;
  const p = presence(f, s);
  const a = (s === "main" ? Math.max(0.0, mainAct(f).ladder) : 1) * p.alpha * win(f, SET_IN[s] ? E(SET_IN[s]!) : 0, 1e9, 14);
  if (a <= 0.01) return null;
  const known = s !== "hook" && !(s === "main" && mainAct(f).band <= 0.5);
  const marks: [number, string, Accent][] = [];
  for (let q = P_LO; q <= P_HI; q++) {
    if (known && [POC, VAH, VAL].some((k) => Math.abs(k - q) < 0.3)) continue;
    marks.push([q, q.toFixed(0), "mute"]);
  }
  if (known) {
    marks.push([VAH, `VAH ${fmt(VAH)}`, "ink"], [POC, `POC ${fmt(POC)}`, "gold"], [VAL, `VAL ${fmt(VAL)}`, "ink"]);
  }
  const vol = s !== "end";
  return (
    <>
      {marks.map(([q, t, acc]) => {
        const w = W(f, s, LADDER_X, py(q), 0);
        const pt = pr(w.x, w.y, w.z);
        const big = acc !== "mute";
        if (big) {
          // named levels sit just inside the rail, above their line, so they never leave the frame
          return (
            <div key={t} style={{ position: "absolute", left: Math.max(M, pt.x + 12), top: pt.y - 40, opacity: a, ...num(700), fontSize: 28, color: tone(acc), whiteSpace: "nowrap", textShadow: "0 2px 6px rgba(0,0,0,0.8)" }}>
              {t}
            </div>
          );
        }
        if (pt.x - 12 - textW(t, 24) < M || pt.y < LAYOUT.data.top || pt.y > LAYOUT.data.bottom) return null;
        return (
          <div key={t} style={{ position: "absolute", right: LAYOUT.W - (pt.x - 12), top: pt.y - 14, opacity: a * 0.7, ...num(500), fontSize: 24, color: SOFT, whiteSpace: "nowrap", textAlign: "right" }}>
            {t}
          </div>
        );
      })}
      {vol &&
        (() => {
          const w = W(f, s, CH_X0, (VB[s] ?? VB.main) + VOL_H + 0.15, 0);
          const pt = pr(w.x, w.y, w.z);
          return (
            <div style={{ position: "absolute", left: M, top: pt.y - 30, opacity: a, display: "flex", alignItems: "baseline", gap: 14, whiteSpace: "nowrap" }}>
              <span style={{ ...sans(700), fontSize: 24, color: SOFT }}>{T.volTag}</span>
              <span style={{ ...num(700), fontSize: 22, color: SOFT }}>{T.deltaTag}</span>
              <span style={{ ...sans(700), fontSize: 22, color: COL.up }}>{T.legendUp}</span>
              <span style={{ ...sans(700), fontSize: 22, color: COL.down }}>{T.legendDn}</span>
            </div>
          );
        })()}
    </>
  );
};

// ================================================================= chapter kicker (small, centred, brief)
const Chapter: React.FC<{ f: number }> = ({ f }) => {
  const s = sections.find((x) => f >= x.from && f < x.to);
  if (!s || !T.chapter[s.id]) return null;
  const a = win(f, s.from, s.from + 75, 10, 12);
  if (a <= 0.003) return null;
  const idx = sections.filter((x) => T.chapter[x.id]).findIndex((x) => x.id === s.id) + 1;
  return (
    <div style={{ position: "absolute", left: 0, right: 0, top: LAYOUT.data.top + 6, display: "flex", justifyContent: "center", opacity: a }}>
      <div style={{ display: "flex", alignItems: "center", gap: 16, transform: `translateY(${8 * (1 - a)}px)` }}>
        <div style={{ width: 46, height: 2, background: COL.gold, opacity: 0.8 }} />
        <span style={{ ...num(700), fontSize: 30, color: COL.gold }}>{String(idx).padStart(2, "0")}</span>
        <span style={{ ...sans(700), fontSize: 34, color: INK, letterSpacing: 4 }}>{T.chapter[s.id]}</span>
        <div style={{ width: 46, height: 2, background: COL.gold, opacity: 0.8 }} />
      </div>
    </div>
  );
};

// ================================================================= status band and captions
const Status: React.FC = () => (
  <>
    <div style={{ position: "absolute", left: M, top: 58, ...sans(700), fontSize: 30, color: SOFT, letterSpacing: 2 }}>{T.series}</div>
    <div style={{ position: "absolute", left: M, top: 104, ...sans(500), fontSize: 24, color: "rgba(243,234,217,0.45)" }}>{T.data}</div>
    <div style={{ position: "absolute", right: M, top: 52, ...sans(700), fontSize: 30, color: COL.gold, padding: "4px 16px 6px", border: "2px solid rgba(233,180,76,0.6)", borderRadius: 8, background: "rgba(5,8,15,0.6)" }}>{T.risk}</div>
  </>
);

const Captions: React.FC<{ f: number }> = ({ f }) => {
  const c = captions.find((x) => f >= x.from && f < x.to);
  if (!c) return null;
  const a = Math.min(clamp01((f - c.from) / 3), clamp01((c.to - f) / 3));
  const w = Math.min(LAYOUT.W - 2 * M, Math.ceil(Math.max(...c.rows.map((r) => textW(r, CAP.size))) + 2 * CAP.padX));
  const h = c.rows.length * CAP.lh + CAP.padY;
  const zone = LAYOUT.caption;
  return (
    <div style={{ position: "absolute", left: (LAYOUT.W - w) / 2, top: zone.bottom - h, width: w, height: h, opacity: a, boxSizing: "border-box", background: "rgba(3,5,10,0.8)", borderRadius: 14, padding: `${CAP.padY / 2}px ${CAP.padX}px`, textAlign: "center" }}>
      {c.rows.map((r, i) => (
        <div key={i} style={{ ...sans(700), fontSize: CAP.size, lineHeight: `${CAP.lh}px`, color: INK, whiteSpace: "nowrap" }}>
          {r}
        </div>
      ))}
    </div>
  );
};

// ================================================================= the HUD
export const Hud: React.FC<{ f: number; captions?: boolean }> = ({ f, captions: showCaps = true }) => {
  const pr = projector(f);
  const live = mains().filter((m) => f >= m.a0 - 1 && f < m.a1);
  return (
    <div style={{ position: "absolute", inset: 0, width: LAYOUT.W, height: LAYOUT.H, overflow: "hidden" }}>
      <div style={{ position: "absolute", left: 0, right: 0, top: 0, height: LAYOUT.status.bottom + 20, background: "linear-gradient(180deg, rgba(5,8,15,0.9) 0%, rgba(5,8,15,0.6) 70%, rgba(5,8,15,0) 100%)" }} />
      <div style={{ position: "absolute", left: 0, right: 0, top: LAYOUT.cards.top - 40, bottom: 0, background: "linear-gradient(180deg, rgba(5,8,15,0) 0%, rgba(5,8,15,0.66) 14%, rgba(5,8,15,0.86) 100%)" }} />
      <Status />
      <Chapter f={f} />
      <LadderText f={f} pr={pr} />
      {live.slice(-1).map((m) => (
        <Tag key={m.at} m={m} f={f} pr={pr} />
      ))}
      <Cards f={f} />
      {showCaps && <Captions f={f} />}
    </div>
  );
};

/** for checks: how many main tags and cards are up at frame f */
export const hudCount = (f: number) => ({
  main: mains().filter((m) => f >= m.a0 && f < m.a1).length,
  cards: CARDS.filter((c) => f >= E(c.at) && f < endOf(c.until)).length,
});
