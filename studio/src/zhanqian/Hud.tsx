// 2D layer over the set. Rules carried over from earlier reviews: no text appears before the narration
// reaches it, and any label over a busy picture sits on a solid plate with a glowing edge.
import { useVideoConfig } from "remotion";
import * as THREE from "three";
import { C } from "./copy";
import { BW, FIRST_HIT, HOPS, MINES, MINES_IN, beadK, ky, price } from "./book";
import { FRAMES, L, Lc, Le, S, TL, backOut, clamp01, expoOut, hold, smooth, span } from "./cue";
import { CASE_X, PIECES, X, type Dir } from "./director";
import { mono, sans, serif } from "./fonts";
import { HERO, PAL } from "./Scene";

const INK = "#F5F7FA";
const SOFT = "rgba(245,247,250,0.8)";
const FX = (c: string) => ({ background: "rgba(5,7,12,0.92)", border: `2px solid ${c}`, boxShadow: `0 0 0 1px #000, 0 0 26px ${c}77, 0 10px 30px rgba(0,0,0,0.6)` });

type P = { x: number; y: number };
type Proj = (x: number, y: number, z?: number) => P;
const useProj = (d: Dir): Proj => {
  const { width, height } = useVideoConfig();
  const cam = new THREE.PerspectiveCamera(d.fov, width / height, 0.1, 3000);
  cam.position.copy(d.pos);
  cam.lookAt(d.target);
  cam.updateMatrixWorld();
  return (x, y, z = 0) => {
    const v = new THREE.Vector3(x, y, z).project(cam);
    return { x: ((v.x + 1) / 2) * width, y: ((1 - v.y) / 2) * height };
  };
};

/** big type: the picture recedes, characters arrive as they are spoken, the key words light up */
type SLine = { text: string; at: number; size: number; hl?: string; color?: string };
const Statement: React.FC<{ f: number; lines: SLine[]; end: number; top: number; kicker?: string; scrim?: number; rule?: boolean }> = ({ f, lines, end, top, kicker, scrim = 1, rule = true }) => {
  const a = lines[0].at;
  const k = span(f, a - 6, a + 8, smooth) * (1 - span(f, end - 10, end, smooth));
  if (k < 0.01) return null;
  const STEP = 1.8;
  const h = lines.reduce((s, l) => s + l.size * 1.32, 0) + (kicker ? 56 : 0);
  const last = lines[lines.length - 1];
  const done = last.at + [...last.text].length * STEP;
  const kr = span(f, done - 4, done + 16, expoOut);
  return (
    <>
      <div style={{ position: "absolute", inset: 0, opacity: k * scrim, background: "rgba(3,5,10,0.4)" }} />
      <div style={{ position: "absolute", left: 0, right: 0, top: top - 150, height: h + 300, opacity: k * scrim, background: "linear-gradient(180deg, rgba(3,5,10,0) 0%, rgba(3,5,10,0.86) 28%, rgba(3,5,10,0.86) 72%, rgba(3,5,10,0) 100%)" }} />
      <div style={{ position: "absolute", left: 0, right: 0, top, textAlign: "center", opacity: span(k, 0, 0.4) }}>
        {kicker && <div style={{ ...mono(), fontSize: 30, letterSpacing: 12, color: PAL.gold, marginBottom: 22, textShadow: `0 0 18px ${PAL.gold}88` }}>— {kicker} —</div>}
        {lines.map((l, i) => {
          const hs = l.hl ? l.text.indexOf(l.hl) : -1;
          const he = hs + (l.hl?.length ?? 0);
          return (
            <div key={i} style={{ ...serif(), fontSize: l.size, lineHeight: 1.32, letterSpacing: 3, whiteSpace: "nowrap" }}>
              {[...l.text].map((ch, j) => {
                const kj = span(f, l.at + j * STEP, l.at + j * STEP + 10, expoOut);
                const hot = j >= hs && j < he;
                return (
                  <span key={j} style={{ display: "inline-block", opacity: kj, transform: `translateY(${(1 - kj) * 0.3 * l.size}px)`, filter: kj < 0.98 ? `blur(${(1 - kj) * 10}px)` : undefined, color: hot ? PAL.gold : (l.color ?? INK), textShadow: hot ? `0 0 ${18 + 22 * kr}px ${PAL.gold}aa, 0 3px 0 #000, 0 0 3px #000` : "0 4px 20px rgba(0,0,0,0.95), 0 0 3px #000" }}>
                    {ch}
                  </span>
                );
              })}
            </div>
          );
        })}
        {rule && <div style={{ margin: "18px auto 0", width: Math.min(900, [...last.text].length * last.size * 0.9) * kr, height: 6, borderRadius: 3, background: `linear-gradient(90deg, ${PAL.gold}00, ${PAL.gold}, ${PAL.gold}00)`, boxShadow: `0 0 22px ${PAL.gold}` }} />}
      </div>
    </>
  );
};

/** a plate pinned to a screen point: ring, leader, then title and notes */
const Tag: React.FC<{ f: number; a: number; b: number; at: P; plate: P; side: "l" | "r"; color?: string; title: string; notes?: string[]; size?: number }> = ({ f, a, b, at, plate, side, color = PAL.gold, title, notes = [], size = 50 }) => {
  const { width, height } = useVideoConfig();
  const out = 1 - span(f, b - 10, b, smooth);
  if (f < a || out < 0.01) return null;
  const draw = span(f, a + 2, a + 16, smooth);
  const kp = span(f, a + 12, a + 24, expoOut);
  const s = side === "r" ? 1 : -1;
  return (
    <div style={{ position: "absolute", inset: 0, opacity: out }}>
      <svg width={width} height={height} style={{ position: "absolute", inset: 0 }}>
        <circle cx={at.x} cy={at.y} r={11} fill="none" stroke={color} strokeWidth={3} opacity={draw} />
        <line x1={at.x} y1={at.y} x2={at.x + (plate.x - at.x) * draw} y2={at.y + (plate.y - at.y) * draw} stroke={color} strokeWidth={3} />
      </svg>
      <div style={{ position: "absolute", top: plate.y, left: side === "r" ? plate.x : undefined, right: side === "l" ? width - plate.x : undefined, transform: `translate(${s * (1 - kp) * 26}px, -50%)`, opacity: kp, padding: "12px 24px 14px", borderRadius: 14, whiteSpace: "nowrap", textAlign: side === "r" ? "left" : "right", ...FX(color) }}>
        <div style={{ ...serif(), fontSize: size, lineHeight: 1.2, color: INK }}>{title}</div>
        {notes.map((n, i) => {
          const ki = span(f, a + 24 + i * 12, a + 34 + i * 12, expoOut);
          return (
            <div key={n} style={{ ...sans(500), fontSize: 36, lineHeight: 1.32, color: SOFT, opacity: ki, transform: `translateY(${(1 - ki) * 8}px)` }}>
              {n}
            </div>
          );
        })}
      </div>
    </div>
  );
};

// ---------------------------------------------------------------- captions
const KEY = ["买卖价差", "流动性", "限价单", "被动订单", "主动订单", "止损订单", "做市商", "机构", "套保者", "短线交易者", "战报", "足迹图", "概率"];
const NO_BURN = new Set(["h1", "w6", "w7"]);
const Captions: React.FC<{ f: number }> = ({ f }) => {
  const c = TL.captions.find((k) => f >= k.from && f < k.to);
  if (!c || NO_BURN.has(c.line)) return null;
  const k = span(f, c.from, c.from + 4) * (1 - span(f, c.to - 3, c.to));
  const re = new RegExp(`(${KEY.join("|")})`);
  return (
    <div style={{ position: "absolute", left: 48, right: 48, top: 1480, textAlign: "center", opacity: k }}>
      <span style={{ display: "inline-block", maxWidth: 984, padding: "8px 28px 10px", borderRadius: 14, background: "rgba(6,8,14,0.78)", ...sans(500), fontSize: 56, lineHeight: 1.3, color: INK, letterSpacing: 1 }}>
        {c.text.split(re).map((s, i) => (KEY.includes(s) ? <span key={i} style={{ color: PAL.gold }}>{s}</span> : s))}
      </span>
    </div>
  );
};

// ---------------------------------------------------------------- places
const HookHud: React.FC<{ d: Dir }> = ({ d }) => {
  const f = d.f;
  if (d.world !== "hook") return null;
  return (
    <>
      <Statement f={f} top={250} end={L("h2") + 16} scrim={0.5} rule={false} lines={[{ text: C.report[0], at: L("h1"), size: 120 }, { text: C.report[1], at: Lc("h1", "只是"), size: 150, hl: "战报" }]} />
      <Statement f={f} top={620} end={S("auction") - 14} kicker={`${C.ep} · ${C.titleEn}`} lines={[{ text: C.title, at: L("h3"), size: 190, hl: C.title }, { text: C.sub, at: Lc("h3", "先把"), size: 62 }]} />
    </>
  );
};

const BookHud: React.FC<{ d: Dir; pr: Proj }> = ({ d, pr }) => {
  const f = d.f;
  if (d.world !== "book") return null;
  const P = (x: number, k: number, z = 0.5) => pr(X.book + x, ky(k), z);
  const bk = beadK(f);
  const showPrice = span(f, L("a2"), L("a2") + 20);
  const q = Math.round(bk);
  const wallA = span(f, Lc("a2", "想卖"), Lc("a2", "想卖") + 16, expoOut) * (1 - span(f, L("a3") - 6, L("a3") + 4));
  const wallB = span(f, Lc("a2", "想买"), Lc("a2", "想买") + 16, expoOut) * (1 - span(f, L("a3") - 6, L("a3") + 4));
  const gap = hold(f, L("a3") + 8, L("a4") - 12, 12);
  const up0 = P(0, 0.72),
    dn0 = P(0, -0.72);
  // the counted trade
  const eqK = hold(f, FIRST_HIT, L("a6") - 6, 10);
  const ord = [L("o2"), L("o3"), L("o5")];
  const cur = ord.filter((a) => f >= a).length - 1;
  const stepK = hold(f, L("o1") + 4, S("players") - 14, 12);
  const named = [Lc("o1", "三种"), Lc("o1", "三种") + 12, Lc("o1", "三种") + 24];
  return (
    <>
      <Statement f={f} top={980} end={L("a2") - 2} scrim={0.55} lines={[{ text: C.auction[0], at: Lc("a1", "永不落槌"), size: 130, hl: C.auction[0] }, { text: C.auction[1], at: Lc("a1", "拍卖"), size: 88 }]} />

      {/* price ladder */}
      {showPrice > 0.01 &&
        Array.from({ length: 13 }, (_, i) => q - 5 + i).map((k) => {
          const p = P(4.9, k, 0);
          return p.y > 200 && p.y < 1420 ? (
            <div key={k} style={{ position: "absolute", left: p.x + 8, top: p.y - 15, ...mono(), fontSize: 25, color: Math.abs(k - bk) < 0.3 ? PAL.gold : SOFT, opacity: showPrice * 0.95, padding: "0 6px", background: "rgba(8,11,18,0.72)", borderRadius: 5 }}>
              {price(k).toFixed(2)}
            </div>
          ) : null;
        })}
      {wallA > 0.01 && (
        <div style={{ position: "absolute", left: 60, top: P(0, 5.3).y, ...sans(700), fontSize: 46, color: INK, padding: "4px 20px 8px", borderRadius: 12, opacity: wallA, ...FX(PAL.down) }}>
          {C.ask} ↓
        </div>
      )}
      {wallB > 0.01 && (
        <div style={{ position: "absolute", left: 60, top: P(0, -1.9).y, ...sans(700), fontSize: 46, color: INK, padding: "4px 20px 8px", borderRadius: 12, opacity: wallB, ...FX(PAL.up) }}>
          {C.bid} ↑
        </div>
      )}
      {gap > 0.01 && (
        <div style={{ position: "absolute", inset: 0, opacity: gap }}>
          <svg width={1080} height={1920} style={{ position: "absolute", inset: 0 }}>
            <polyline points={`${up0.x - 200},${up0.y} ${up0.x - 220},${up0.y} ${dn0.x - 220},${dn0.y} ${dn0.x - 200},${dn0.y}`} fill="none" stroke={PAL.gold} strokeWidth={4} style={{ filter: `drop-shadow(0 0 8px ${PAL.gold})` }} />
          </svg>
          <div style={{ position: "absolute", left: 40, top: (up0.y + dn0.y) / 2 + 240, padding: "10px 26px 14px", borderRadius: 14, ...FX(PAL.gold) }}>
            <div style={{ ...serif(), fontSize: 60, color: PAL.gold }}>{C.spread}</div>
            <div style={{ ...sans(500), fontSize: 38, color: INK, opacity: span(f, Lc("a3", "没有人"), Lc("a3", "没有人") + 10) }}>{C.noTrade}</div>
          </div>
        </div>
      )}
      <Statement f={f} top={560} end={L("a5") + 2} scrim={0.9} lines={[{ text: C.myth[0], at: Lc("a4", "买的人多"), size: 110 }, { text: C.myth[1], at: Lc("a4", "所以涨"), size: 130, hl: "所以涨" }]} />
      {eqK > 0.01 && (
        <div style={{ position: "absolute", left: 0, right: 0, top: 300, display: "flex", justifyContent: "center", alignItems: "center", gap: 26, opacity: eqK, transform: `scale(${0.92 + 0.08 * eqK})` }}>
          {[
            [C.buyQty, PAL.up],
            ["=", ""],
            [C.sellQty, PAL.down],
          ].map(([s, col]) =>
            col ? (
              <div key={s} style={{ padding: "10px 30px 14px", borderRadius: 16, textAlign: "center", ...FX(col) }}>
                <div style={{ ...sans(700), fontSize: 42, color: col }}>{s}</div>
                <div style={{ ...mono(), fontSize: 64, color: INK }}>{C.lots}</div>
              </div>
            ) : (
              <div key={s} style={{ ...mono(), fontSize: 110, color: PAL.gold, textShadow: `0 0 26px ${PAL.gold}` }}>{s}</div>
            ),
          )}
        </div>
      )}
      <Tag f={f} a={Lc("a6", "更急")} b={L("o1") - 4} at={P(-1.4, 1)} plate={{ x: 300, y: 420 }} side="r" title={C.urgent} size={52} />

      {/* the three ways to act */}
      {stepK > 0.01 && (
        <div style={{ position: "absolute", left: 40, right: 40, top: 192, display: "flex", gap: 14, opacity: stepK }}>
          {C.three.map((s, i) => {
            const on = i === cur;
            const col = [PAL.up, PAL.gold, PAL.amber][i];
            const ki = span(f, named[i], named[i] + 12, backOut);
            return (
              <div key={s} style={{ flex: 1, textAlign: "center", padding: "6px 0 10px", borderRadius: 12, ...sans(700), fontSize: 42, color: on ? "#06070b" : INK, background: on ? col : "rgba(8,11,18,0.86)", border: `2px solid ${col}${on ? "" : "66"}`, boxShadow: on ? `0 0 26px ${col}aa` : undefined, opacity: Math.min(1, ki * 1.3), transform: `translateY(${(1 - ki) * 14}px)` }}>
                {s}
              </div>
            );
          })}
        </div>
      )}
      <Tag f={f} a={Lc("o2", "被动订单")} b={L("o3") - 8} at={P(0.7, -2)} plate={{ x: 90, y: 400 }} side="r" color={PAL.up} title={C.passive[0]} notes={[C.passive[1], C.passive[2]]} size={64} />
      <Tag f={f} a={Lc("o3", "主动订单")} b={L("o4") - 2} at={P(1.5 * BW, 1)} plate={{ x: 980, y: 440 }} side="l" color={PAL.gold} title={C.active[0]} notes={[C.active[1], C.active[2]]} size={64} />
      <Tag f={f} a={Lc("o4", "跳到")} b={L("o5") - 10} at={P(0, 1)} plate={{ x: 90, y: 400 }} side="r" title={C.step[1]} notes={[C.step[0]]} size={64} />
      <Tag f={f} a={MINES_IN} b={L("o6") - 2} at={pr(X.book, ky(5), -1.7)} plate={{ x: 110, y: 400 }} side="r" color={PAL.amber} title={C.stop[0]} notes={[C.stop[1], C.stop[2]]} size={64} />
      <Tag f={f} a={Lc("o5", "地雷") - 2} b={L("o6") - 2} at={pr(X.book + 1, ky(4), -1.7)} plate={{ x: 640, y: 1290 }} side="r" color={PAL.amber} title={C.trigger} size={46} />
      <Tag f={f} a={Lc("o6", "变成主动") - 2} b={S("players") - 14} at={P(1.3, bk)} plate={{ x: 90, y: 420 }} side="r" color={PAL.amber} title={C.cascade} notes={[C.thin]} size={58} />
      {MINES.length === 0 && HOPS[1] > 0 ? null : null}
    </>
  );
};

const TableHud: React.FC<{ d: Dir; pr: Proj }> = ({ d, pr }) => {
  const f = d.f;
  if (d.world !== "table") return null;
  const item = (id: "p2" | "p3" | "p4" | "p5", key: keyof typeof PIECES) => {
    const [name, a, b] = C.players[key];
    const p = PIECES[key];
    const at = pr(X.table + p[0], 3.6, p[1]);
    const k = Math.max(hold(f, L(id) + 12, L(id) + (Le(id) - L(id)) + 16, 12));
    if (k < 0.01) return null;
    const words = [Lc(id, id === "p2" ? "两边" : id === "p3" ? "拆成" : id === "p4" ? "对冲" : "追逐"), Lc(id, id === "p2" ? "最怕" : id === "p3" ? "慢慢" : id === "p4" ? "不太" : "止损")];
    void at;
    return (
      <div key={id} style={{ position: "absolute", left: 60, right: 60, top: 280, textAlign: "center", opacity: k }}>
        <div style={{ ...serif(), fontSize: 124, color: INK, textShadow: `0 0 34px ${PAL.gold}66, 0 4px 18px #000` }}>{name}</div>
        <div style={{ display: "inline-flex", flexDirection: "column", gap: 12, marginTop: 12 }}>
          {[a, b].map((s, i) => {
            const ki = span(f, words[i], words[i] + 12, expoOut);
            return (
              <div key={s} style={{ ...sans(700), fontSize: 50, color: INK, padding: "4px 30px 8px", borderRadius: 12, opacity: ki, transform: `translateY(${(1 - ki) * 12}px)`, ...FX(PAL.gold) }}>
                {s}
              </div>
            );
          })}
        </div>
      </div>
    );
  };
  return (
    <>
      <Statement f={f} top={250} end={L("p2") - 8} scrim={0.7} lines={[{ text: C.who[0], at: Lc("p1", "不是"), size: 104, hl: "庄家" }, { text: C.who[1], at: Lc("p1", "而是"), size: 66 }]} />
      {item("p2", "mm")}
      {item("p3", "inst")}
      {item("p4", "hedge")}
      {item("p5", "short")}
      <Statement f={f} top={240} end={S("awaken") - 14} scrim={0.55} lines={[{ text: C.crash[0], at: Lc("p6", "这些需求"), size: 118, hl: "碰撞" }, { text: C.crash[1], at: Lc("p6", "这些需求") + 20, size: 56 }]} />
      {(() => {
        const k = hold(f, L("p6"), S("awaken") - 14, 10) * (1 - span(f, Lc("p6", "这些需求") - 8, Lc("p6", "这些需求")));
        return k > 0.01 ? (
          <div style={{ position: "absolute", left: 0, right: 0, top: 300, textAlign: "center", opacity: k }}>
            <span style={{ display: "inline-block", ...sans(700), fontSize: 48, color: INK, padding: "10px 30px 14px", borderRadius: 14, ...FX(PAL.amber) }}>{C.manip}</span>
          </div>
        ) : null;
      })()}
    </>
  );
};

const AnatomyHud: React.FC<{ d: Dir; pr: Proj }> = ({ d, pr }) => {
  const f = d.f;
  if (d.world !== "anatomy") return null;
  const P = (y: number, x = 0) => pr(X.anatomy + x, y, 1.6);
  const b = L("w3") - 14;
  const w2 = Lc("w2", "开盘");
  const words = ["开盘", "最高", "最低", "收盘"].map((w) => Lc("w2", w));
  void w2;
  // label side: open and high on the right, low and close on the left; plates sit level with their point
  const OHLC: [number, string, "l" | "r"][] = [
    [HERO.o, "5000.00", "r"],
    [HERO.hi, "5012.75", "r"],
    [HERO.lo, "4999.50", "l"],
    [HERO.c, "5011.25", "l"],
  ];
  const squeezeK = hold(f, Lc("w2", "过程"), b, 10);
  const lab = (i: 0 | 1) => {
    const x = i === 0 ? CASE_X.a : CASE_X.b;
    const c = i === 0 ? C.caseA : C.caseB;
    const a = i === 0 ? Lc("w3", "可能是") : Lc("w4", "可能只是");
    const end = L("w5") - 4;
    const col = i === 0 ? PAL.up : PAL.amber;
    const p = pr(X.anatomy + x, -1.2, 1.6);
    const k = hold(f, a, end, 10);
    return k < 0.01 ? null : (
      <div key={i} style={{ position: "absolute", left: Math.max(30, Math.min(p.x - 235, 1080 - 500)), width: 470, top: 300, textAlign: "center", opacity: k, padding: "10px 0 14px", borderRadius: 16, ...FX(col) }}>
        <div style={{ ...mono(), fontSize: 30, color: col, letterSpacing: 4 }}>{c[0]}</div>
        <div style={{ ...serif(), fontSize: 50, color: INK, lineHeight: 1.25 }}>{c[1]}</div>
        <div style={{ ...sans(500), fontSize: 36, color: SOFT }}>{c[2]}</div>
      </div>
    );
  };
  const tail = Lc("w5", "后面");
  return (
    <>
      {OHLC.map(([y, val, side], i) => {
        const at = P(y, side === "r" ? 1.5 : -1.5);
        return <Tag key={i} f={f} a={words[i]} b={b} at={at} plate={{ x: at.x + (side === "r" ? 120 : -120), y: at.y }} side={side} title={C.ohlc[i]} notes={[val]} size={46} />;
      })}
      {squeezeK > 0.01 && <div style={{ position: "absolute", left: 0, right: 0, top: 200, textAlign: "center", ...serif(), fontSize: 76, color: PAL.gold, opacity: squeezeK, textShadow: "0 3px 0 #000, 0 0 26px rgba(242,189,98,0.6)" }}>{C.squeeze}</div>}
      {lab(0)}
      {lab(1)}
      <Statement f={f} top={230} end={L("w6") - 6} scrim={0.35} rule={false} lines={[{ text: C.same, at: Lc("w5", "结果"), size: 96 }, { text: C.diff, at: Lc("w5", "原因"), size: 118, hl: C.diff }]} />
      {f > tail && f < L("w6") - 6 ? null : null}
      <Statement f={f} top={600} end={L("w7") + 6} lines={[{ text: C.q1[0], at: L("w6"), size: 90 }, { text: C.q1[1], at: Lc("w6", "它涨"), size: 130, hl: "涨没涨" }]} />
      <Statement f={f} top={600} end={L("w8") - 6} kicker="WHO · WHY" lines={[{ text: C.q2[0], at: Lc("w7", "是谁"), size: 136, hl: "是谁" }, { text: C.q2[1], at: Lc("w7", "为什么"), size: 136, hl: "为什么" }]} />
      {(() => {
        const k = hold(f, L("w8"), L("w9") - 4, 12);
        const at = [Lc("w8", "挂单"), Lc("w8", "订单流"), Lc("w8", "没有确定")];
        return k > 0.01 ? (
          <div style={{ position: "absolute", left: 0, right: 0, top: 380, display: "flex", flexDirection: "column", alignItems: "center", gap: 20, opacity: k }}>
            {C.caveat.map((s, i) => {
              const ki = span(f, at[i], at[i] + 12, backOut);
              return (
                <div key={s} style={{ ...serif(), fontSize: 72, color: INK, padding: "8px 42px 14px", borderRadius: 16, opacity: Math.min(1, ki * 1.4), transform: `scale(${0.9 + 0.1 * ki})`, ...FX(i === 2 ? PAL.gold : PAL.steel) }}>
                  {s}
                </div>
              );
            })}
          </div>
        ) : null;
      })()}
      <Statement f={f} top={640} end={FRAMES + 10} kicker={C.title} rule lines={[{ text: C.next[0], at: L("w9"), size: 84 }, { text: C.next[1], at: Lc("w9", "走进"), size: 136, hl: "足迹图" }]} />
      <div style={{ position: "absolute", left: 0, right: 0, top: 1090, textAlign: "center", opacity: span(f, Le("w9") + 6, Le("w9") + 22) }}>
        <span style={{ ...sans(500), fontSize: 34, letterSpacing: 3, color: INK, padding: "6px 22px", background: "rgba(6,8,14,0.78)", borderRadius: 10 }}>{C.disclaimer}</span>
      </div>
    </>
  );
};

export const Hud: React.FC<{ d: Dir }> = ({ d }) => {
  const f = d.f;
  const pr = useProj(d);
  return (
    <div style={{ position: "absolute", inset: 0, overflow: "hidden" }}>
      <div style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg, rgba(4,6,12,0.66) 0%, rgba(4,6,12,0) 14%, rgba(4,6,12,0) 72%, rgba(4,6,12,0.78) 100%)" }} />
      <div style={{ position: "absolute", inset: 0, background: "#fff", opacity: d.flash * 0.16, mixBlendMode: "screen" }} />
      <div style={{ position: "absolute", left: 48, right: 48, top: 112, display: "flex", justifyContent: "space-between", alignItems: "center", opacity: clamp01(f / 12) }}>
        <span style={{ ...sans(500), fontSize: 28, color: SOFT, letterSpacing: 3 }}>{C.series}</span>
        <span style={{ ...sans(500), fontSize: 28, color: SOFT, letterSpacing: 2, padding: "2px 12px", background: "rgba(8,11,18,0.6)", border: "1px solid rgba(245,247,250,0.25)", borderRadius: 6 }}>{C.tag}</span>
      </div>
      <HookHud d={d} />
      <BookHud d={d} pr={pr} />
      <TableHud d={d} pr={pr} />
      <AnatomyHud d={d} pr={pr} />
      {d.dip > 0.01 && <div style={{ position: "absolute", inset: 0, background: "#05060a", opacity: smooth(d.dip) }} />}
      <Captions f={f} />
    </div>
  );
};
