import * as THREE from "three";
import { AbsoluteFill } from "remotion";
import { C } from "./copy";
import { E, FRAMES, Lc, captions } from "./cue";
import { type Dir, clamp01, cubicOut, pulse, ramp } from "./director";
import { HERO, LANES, MID, PRE, RES_HI, VOL_BASE, VOL_H, world, type LaneId, HERO_BAR, LANE_Y, barX } from "./data";
import { num, sans } from "./fonts";

export const W = 1080;
export const H = 1920;
const GOLD = "#ffc861";
const INK = "#f5f7fa";
const SOFT = "#c9d3e2";

// ---------------------------------------------------------------- 3D → screen
const cam = new THREE.PerspectiveCamera(34, W / H, 0.1, 900);
export function project(d: Dir, p: [number, number, number]): [number, number] {
  cam.fov = d.fov;
  cam.aspect = W / H;
  cam.position.copy(d.pos);
  cam.lookAt(d.target);
  cam.updateProjectionMatrix();
  cam.updateMatrixWorld();
  const v = new THREE.Vector3(...p).project(cam);
  return [((v.x + 1) / 2) * W, ((1 - v.y) / 2) * H];
}

// ---------------------------------------------------------------- appearance helper
const life = (f: number, from: number, to: number, inLen = 10, outLen = 10) => ramp(f, from, from + inLen, cubicOut) * (1 - ramp(f, to, to + outLen));

const plate: React.CSSProperties = {
  background: "linear-gradient(135deg, rgba(14,20,32,0.86), rgba(8,11,18,0.78))",
  border: "1px solid rgba(255,255,255,0.14)",
  boxShadow: "0 18px 50px rgba(0,0,0,0.55), inset 0 1px 0 rgba(255,255,255,0.12)",
  backdropFilter: "blur(14px)",
  borderRadius: 18,
};

/** A callout: dot on the 3D anchor, leader line, glass plate with title (+ optional sub). */
const Tag: React.FC<{ d: Dir; at: [number, number, number]; from: number; to: number; t: string; s?: string; sFrom?: number; dx?: number; dy?: number; accent?: string; big?: boolean }> = ({ d, at, from, to, t, s, sFrom, dx = 60, dy = -150, accent = GOLD, big }) => {
  const a = life(d.f, from, to);
  if (a <= 0.001) return null;
  const [x0, y0] = project(d, at);
  // keep plates inside the phone-safe area
  const right = dx < 0;
  const estW = Math.max(t.length * (big ? 56 : 46), (s ?? "").length * 33) + (big ? 80 : 64);
  const left0 = right ? x0 + dx - estW : x0 + dx;
  const bxL = Math.min(W - 56 - estW, Math.max(56, left0));
  const bx = right ? bxL + estW : bxL;
  const by = Math.min(1440, Math.max(400, y0 + dy));
  const sa = s ? life(d.f, sFrom ?? from + 8, to) : 0;
  const lineLen = Math.hypot(bx - x0, by - y0);
  return (
    <>
      <svg width={W} height={H} style={{ position: "absolute", inset: 0, opacity: a }}>
        <line x1={x0} y1={y0} x2={x0 + (bx - x0) * a} y2={y0 + (by - y0) * a} stroke={accent} strokeWidth={3} strokeDasharray={lineLen} />
        <circle cx={x0} cy={y0} r={9 + 10 * (1 - a)} fill="none" stroke={accent} strokeWidth={3} opacity={0.9} />
        <circle cx={x0} cy={y0} r={5} fill={accent} />
      </svg>
      <div
        style={{
          position: "absolute",
          left: right ? undefined : bx,
          right: right ? W - bx : undefined,
          top: by,
          transform: `translateY(-50%) scale(${0.92 + 0.08 * a})`,
          transformOrigin: right ? "right center" : "left center",
          opacity: a,
          filter: `blur(${(1 - a) * 8}px)`,
          ...plate,
          padding: big ? "22px 34px 24px" : "18px 28px 20px",
          borderLeft: `6px solid ${accent}`,
          maxWidth: 640,
        }}
      >
        <div style={{ ...sans(900), fontSize: big ? 54 : 44, color: INK, lineHeight: 1.15, letterSpacing: 1, whiteSpace: "nowrap" }}>{t}</div>
        {s && (
          <div style={{ ...sans(500), fontSize: 32, color: SOFT, marginTop: 8, opacity: sa, transform: `translateY(${(1 - sa) * 10}px)`, whiteSpace: "nowrap" }}>{s}</div>
        )}
      </div>
    </>
  );
};

// ---------------------------------------------------------------- captions
const Captions: React.FC<{ f: number }> = ({ f }) => {
  const c = captions.find((x) => f >= x.from && f < x.to);
  if (!c) return null;
  const a = ramp(f, c.from, c.from + 4) * (1 - ramp(f, c.to - 3, c.to));
  return (
    <div style={{ position: "absolute", left: 0, right: 0, top: 1580, display: "flex", justifyContent: "center", opacity: a }}>
      <div style={{ ...sans(700), fontSize: 58, color: INK, background: "rgba(5,8,14,0.78)", padding: "14px 34px 18px", borderRadius: 16, letterSpacing: 2, boxShadow: "0 10px 40px rgba(0,0,0,0.5)", textShadow: "0 2px 10px rgba(0,0,0,0.6)" }}>{c.text}</div>
    </div>
  );
};

// ---------------------------------------------------------------- hook title
const HookTitle: React.FC<{ d: Dir }> = ({ d }) => {
  const f = d.f;
  const a = life(f, Lc("h1", 0), Lc("w1", 0) - 4, 8, 12);
  if (a <= 0.001) return null;
  const pop = ramp(f, Lc("h1", 0), Lc("h1", 0) + 14, cubicOut);
  const b = life(f, E("reveal") + 4, Lc("w1", 0) - 4, 10, 12);
  return (
    <div style={{ position: "absolute", left: 0, right: 0, top: 168, textAlign: "center", opacity: a }}>
      <div style={{ ...sans(700), fontSize: 30, color: GOLD, letterSpacing: 10, opacity: b }}>{C.kicker}</div>
      <div
        style={{
          ...sans(900),
          fontSize: 116,
          lineHeight: 1.1,
          marginTop: 8,
          letterSpacing: 6,
          color: "#fff",
          transform: `scale(${1.25 - 0.25 * pop})`,
          filter: `blur(${(1 - pop) * 14}px)`,
          textShadow: "0 0 40px rgba(255,120,90,0.45), 0 6px 30px rgba(0,0,0,0.8)",
        }}
      >
        {C.title}
      </div>
      <div style={{ ...sans(900), fontSize: 72, color: GOLD, marginTop: 6, letterSpacing: 18, opacity: b, transform: `translateY(${(1 - b) * 24}px)`, textShadow: "0 4px 24px rgba(0,0,0,0.8)" }}>{C.title2}</div>
    </div>
  );
};

/** lane name + final move, pinned to the left top of each lane */
const TAG_AT: Record<LaneId, { y: number; right: boolean }> = { A: { y: -2.9, right: true }, B: { y: 2.3, right: false }, C: { y: 2.4, right: true } };
const LaneTag: React.FC<{ d: Dir; id: LaneId; from: number; to: number; chips?: { t: string; at: number }[] }> = ({ d, id, from, to, chips }) => {
  const a = life(d.f, from, to);
  if (a <= 0.001) return null;
  const at = TAG_AT[id];
  const [, y] = project(d, [barX(0), LANE_Y[id] + at.y, 0]);
  const L = C.lane[id];
  return (
    <div style={{ position: "absolute", left: at.right ? undefined : 56, right: at.right ? 56 : undefined, top: Math.min(1400, Math.max(250, y)), opacity: a, transform: `translate(${(1 - a) * (at.right ? 40 : -40)}px, -50%)`, display: "flex", flexDirection: "column", alignItems: at.right ? "flex-end" : "flex-start" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 18, ...plate, padding: "12px 24px 14px 16px" }}>
        <div style={{ ...num(700), fontSize: 30, color: "#0b0f18", background: GOLD, borderRadius: 10, width: 46, height: 46, display: "flex", alignItems: "center", justifyContent: "center" }}>{id}</div>
        <div style={{ ...sans(900), fontSize: 46, color: INK }}>{L.name}</div>
        <div style={{ ...num(700), fontSize: 40, color: GOLD }}>{L.pct}</div>
      </div>
      {chips && (
        <div style={{ display: "flex", gap: 12, marginTop: 12 }}>
          {chips.map((c, i) => {
            const ca = life(d.f, c.at, to, 8);
            return (
              <div key={i} style={{ ...sans(700), fontSize: 36, color: INK, padding: "8px 18px 10px", borderRadius: 12, border: `2px solid ${GOLD}`, background: "rgba(10,14,22,0.82)", opacity: ca, transform: `translateY(${(1 - ca) * 14}px)` }}>
                {c.t}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

const Chapter: React.FC<{ d: Dir; i: number; from: number; to: number }> = ({ d, i, from, to }) => {
  const a = life(d.f, from, to, 12, 10);
  if (a <= 0.001) return null;
  const ch = C.chapter[i];
  const u = ramp(d.f, from + 4, from + 22, cubicOut);
  return (
    <div style={{ position: "absolute", left: 60, top: 150, opacity: a }}>
      <div style={{ display: "flex", alignItems: "baseline", gap: 22 }}>
        <div style={{ ...num(700), fontSize: 64, color: GOLD }}>{ch.n}</div>
        <div style={{ ...sans(900), fontSize: 92, color: INK, letterSpacing: 8, transform: `translateY(${(1 - a) * 20}px)` }}>{ch.t}</div>
        <div style={{ ...sans(500), fontSize: 34, color: SOFT, marginLeft: 6 }}>{ch.s}</div>
      </div>
      <div style={{ height: 5, width: 420 * u, background: `linear-gradient(90deg, ${GOLD}, rgba(255,200,97,0))`, marginTop: 10, borderRadius: 3 }} />
    </div>
  );
};

const Why: React.FC<{ d: Dir }> = ({ d }) => {
  const a = life(d.f, Lc("w1", 0), Lc("w2", 0) + 20, 6, 14);
  if (a <= 0.001) return null;
  const s = ramp(d.f, Lc("w1", 0), Lc("w1", 0) + 10, cubicOut);
  return (
    <div style={{ position: "absolute", left: 0, right: 0, top: 230, textAlign: "center", opacity: a }}>
      <div style={{ ...sans(900), fontSize: 150, color: "#fff", transform: `scale(${1.4 - 0.4 * s})`, filter: `blur(${(1 - s) * 12}px)`, letterSpacing: 10, textShadow: "0 0 50px rgba(255,200,97,0.4), 0 8px 30px rgba(0,0,0,0.8)" }}>{C.why}</div>
    </div>
  );
};

const ThreeThings: React.FC<{ d: Dir }> = ({ d }) => {
  const from = E("three");
  const a = life(d.f, from - 2, E("pos") + 4, 8, 12);
  if (a <= 0.001) return null;
  return (
    <div style={{ position: "absolute", left: 0, right: 0, top: 250, display: "flex", justifyContent: "center", gap: 26, opacity: a }}>
      {C.three.map((x, i) => {
        const c = ramp(d.f, from + i * 6, from + i * 6 + 12, cubicOut);
        return (
          <div key={x.n} style={{ ...plate, width: 270, height: 250, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 12, opacity: c, transform: `translateY(${(1 - c) * 60}px) rotateX(${(1 - c) * 50}deg)`, borderTop: `5px solid ${GOLD}` }}>
            <div style={{ ...num(700), fontSize: 46, color: GOLD }}>{x.n}</div>
            <div style={{ ...sans(900), fontSize: 80, color: INK, letterSpacing: 6 }}>{x.t}</div>
          </div>
        );
      })}
    </div>
  );
};

const Stamp: React.FC<{ d: Dir; from: number; to: number; text: string; at: [number, number, number] }> = ({ d, from, to, text, at }) => {
  const a = life(d.f, from, to, 6, 12);
  if (a <= 0.001) return null;
  const s = ramp(d.f, from, from + 8, cubicOut);
  const [x, y] = project(d, at);
  return (
    <div style={{ position: "absolute", left: Math.min(W - 330, Math.max(60, x - 150)), top: Math.max(300, y - 260), opacity: a }}>
      <div style={{ ...sans(900), fontSize: 120, color: "#fff", padding: "8px 40px 16px", border: `6px solid ${GOLD}`, borderRadius: 22, background: "rgba(10,12,18,0.82)", transform: `scale(${1.6 - 0.6 * s})`, letterSpacing: 16, boxShadow: `0 0 60px rgba(255,200,97,0.45)` }}>{text}</div>
    </div>
  );
};

const EndCard: React.FC<{ d: Dir }> = ({ d }) => {
  const f = d.f;
  const a1 = life(f, Lc("e1", 3), FRAMES + 10, 12);
  const a2 = life(f, Lc("e2", 0), FRAMES + 10, 12);
  const a3 = life(f, E("answer"), FRAMES + 10, 14);
  if (a1 <= 0.001) return null;
  return (
    <AbsoluteFill style={{ background: `rgba(3,5,9,${0.55 * d.endFade})` }}>
      <div style={{ position: "absolute", top: 470, left: 0, right: 0, textAlign: "center" }}>
        <div style={{ ...sans(900), fontSize: 104, color: INK, opacity: a1, transform: `translateY(${(1 - a1) * 30}px)`, letterSpacing: 6, textShadow: "0 6px 30px rgba(0,0,0,0.85)" }}>{C.end.l1}</div>
        <div style={{ ...sans(900), fontSize: 104, color: GOLD, opacity: a2, transform: `translateY(${(1 - a2) * 30}px) scale(${1 + 0.15 * (1 - a2)})`, letterSpacing: 6, marginTop: 18, textShadow: "0 0 50px rgba(255,200,97,0.45), 0 6px 30px rgba(0,0,0,0.85)" }}>{C.end.l2}</div>
        <div style={{ height: 4, width: 520 * a3, margin: "56px auto 46px", background: `linear-gradient(90deg, rgba(255,200,97,0), ${GOLD}, rgba(255,200,97,0))` }} />
        <div style={{ ...sans(700), fontSize: 56, color: INK, opacity: a3, letterSpacing: 3 }}>{C.end.l3}</div>
        <div style={{ ...sans(500), fontSize: 30, color: SOFT, opacity: a3 * 0.9, marginTop: 70 }}>{C.end.note}</div>
      </div>
    </AbsoluteFill>
  );
};

// ---------------------------------------------------------------- the HUD
const hi = (id: LaneId, i: number) => LANES[id][i].h;
const lo = (id: LaneId, i: number) => LANES[id][i].l;
const volTop = (id: LaneId, d: Dir): [number, number, number] => [barX(HERO), LANE_Y[id] + VOL_BASE + LANES[id][HERO].v * VOL_H * Math.max(0.2, d.vol), 0.06];

export const Hud: React.FC<{ d: Dir }> = ({ d }) => {
  const f = d.f;
  const top = (id: LaneId, i: number, extra = 0.15): [number, number, number] => {
    const p = world(id, i, hi(id, i));
    return [p[0], p[1] + extra, 0.06];
  };
  const bottom = (id: LaneId, i: number): [number, number, number] => {
    const p = world(id, i, lo(id, i));
    return [p[0], p[1] - 0.12, 0.06];
  };
  const recapEnd = E("end") + 6;
  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      {/* soft scrims so type always has contrast */}
      <div style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg, rgba(3,5,9,0.7) 0%, rgba(3,5,9,0) 22%, rgba(3,5,9,0) 72%, rgba(3,5,9,0.75) 100%)" }} />
      <HookTitle d={d} />
      <LaneTag d={d} id="A" from={E("laneA")} to={Lc("w1", 0) - 6} />
      <LaneTag d={d} id="B" from={E("laneB")} to={Lc("w1", 0) - 6} />
      <LaneTag d={d} id="C" from={E("laneC")} to={Lc("w1", 0) - 6} />
      <Why d={d} />
      <Tag d={d} at={top("B", HERO)} from={Lc("w2", 9)} to={Lc("w3", 0) + 30} t={C.result.t} s={C.result.s} sFrom={Lc("w2", 18)} dx={-90} dy={-260} big />
      <ThreeThings d={d} />
      {/* chapters */}
      <Chapter d={d} i={0} from={Lc("p1", 3)} to={E("vol") - 8} />
      <Chapter d={d} i={1} from={Lc("v1", 3)} to={E("hold") - 8} />
      <Chapter d={d} i={2} from={Lc("c1", 10)} to={E("recap") - 8} />
      {/* position */}
      <Tag d={d} at={[(barX(12) + barX(PRE - 1)) / 2, LANE_Y.A + world("A", 0, 100.3)[1] - LANE_Y.A + 0.05, 0.2]} from={Lc("p2", 7)} to={E("posB") - 4} t={C.pos.A1.t} s={C.pos.A1.s} sFrom={Lc("p2", 10)} dx={-40} dy={-330} />
      <Tag d={d} at={top("A", HERO)} from={Lc("p2", 17)} to={E("posB") - 4} t={C.pos.A2.t} dx={-60} dy={-120} />
      <Tag d={d} at={top("B", 24, 0.3)} from={Lc("p3", 2)} to={E("posC") - 4} t={C.pos.B1.t} s={C.pos.B1.s} sFrom={Lc("p3", 6)} dx={-60} dy={-300} />
      <Tag d={d} at={top("B", HERO)} from={Lc("p3", 16)} to={E("posC") - 4} t={C.pos.B2.t} s={C.pos.B2.s} sFrom={Lc("p3", 20)} dx={-80} dy={-130} />
      <Tag d={d} at={world("C", 7, RES_HI)} from={Lc("p4", 8)} to={E("vol") - 4} t={C.pos.C1.t} s={C.pos.C1.s} dx={60} dy={-240} />
      <Tag d={d} at={top("C", HERO)} from={Lc("p4", 13)} to={E("vol") - 4} t={C.pos.C2.t} s={C.pos.C2.s} sFrom={Lc("p4", 16)} dx={-80} dy={-110} />
      {/* volume */}
      <Tag d={d} at={volTop("A", d)} from={E("volA")} to={E("volB") - 12} t={C.vol.A.t} s={C.vol.A.s} sFrom={Lc("v2", 8)} dx={-90} dy={-230} big />
      <Tag d={d} at={volTop("B", d)} from={E("volB")} to={E("volC") - 12} t={C.vol.B.t} s={C.vol.B.s} sFrom={Lc("v3", 14)} dx={-90} dy={-260} big />
      <Tag d={d} at={volTop("C", d)} from={E("volC")} to={E("hold") - 6} t={C.vol.C.t} s={C.vol.C.s} sFrom={Lc("v4", 8)} dx={-90} dy={-230} big />
      {/* hold */}
      <Tag d={d} at={[barX(HERO) + 0.08, LANE_Y.B + world("B", 0, MID)[1] - LANE_Y.B, 0.1]} from={E("laser")} to={E("holdA") - 8} t={C.hold.mid.t} s={C.hold.mid.s} sFrom={E("laser") + 10} dx={-80} dy={-300} big />
      <Tag d={d} at={bottom("A", HERO + 2)} from={Lc("c3", 5)} to={E("breakB") - 8} t={C.hold.A.t} s={C.hold.A.s} sFrom={Lc("c3", 11)} dx={-40} dy={300} />
      <Tag d={d} at={top("B", HERO + 1)} from={Lc("c4", 1)} to={E("breakC") - 8} t={C.hold.B.t} s={C.hold.B.s} sFrom={Lc("c4", 7)} dx={-60} dy={-260} />
      <Tag d={d} at={bottom("C", HERO + 6)} from={Lc("c5", 3)} to={E("recap") - 6} t={C.hold.C.t} dx={-80} dy={260} />
      <Stamp d={d} from={E("trap")} to={E("recap") - 6} text={C.hold.trap} at={world("C", HERO, HERO_BAR.h)} />
      {/* recap */}
      <LaneTag d={d} id="A" from={E("recA")} to={recapEnd} chips={C.recap.A.map((t, i) => ({ t, at: Lc("r2", [4, 7, 10][i]) }))} />
      <LaneTag d={d} id="B" from={E("recB")} to={recapEnd} chips={C.recap.B.map((t, i) => ({ t, at: Lc("r3", [4, 7, 10][i]) }))} />
      <LaneTag d={d} id="C" from={E("recC")} to={recapEnd} chips={C.recap.C.map((t, i) => ({ t, at: Lc("r4", [5, 9, 12][i]) }))} />
      <EndCard d={d} />
      <Captions f={f} />
      {/* corner mark: illustrative data */}
      <div style={{ position: "absolute", right: 56, top: 96, ...sans(500), fontSize: 28, color: SOFT, opacity: 0.75 * (1 - clamp01(d.endFade * 2)) * pulse(f, 6, 10, FRAMES, 1) }}>示意图</div>
    </AbsoluteFill>
  );
};
