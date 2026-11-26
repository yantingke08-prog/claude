import { useCurrentFrame } from "remotion";
import { C, PLANE_H, PLANE_W, cellY, easeOut, priceOf, rampCss, smooth } from "./config.ts";
import { SANS, SERIF } from "./fonts.ts";
import { cellTop, pathPoint, project } from "./geom.ts";
import { AXIS, CAPTIONS, CARDS, DISCLAIMER, END_NOTE, NEQ, TAGS, TITLE, camAt, worldAt, type Caption } from "./timeline.ts";

const shadow = "0 2px 18px rgba(2,3,8,0.85), 0 0 3px rgba(2,3,8,0.9)";

/** 0→1→0 envelope with `fin`/`fout` frame ramps. */
const env = (f: number, f0: number, f1: number, fin = 9, fout = 8) => smooth(f0, f0 + fin, f) * (1 - smooth(f1 - fout, f1, f));

const CaptionView: React.FC<{ c: Caption; f: number }> = ({ c, f }) => {
  const o = env(f, c.f0, c.f1);
  if (o <= 0) return null;
  const rise = (1 - easeOut((f - c.f0) / 14)) * 16;
  const subIn = c.sub ? smooth(c.f0 + 7, c.f0 + 17, f) : 0;
  const hook = c.kind === "hook";
  const section = c.kind === "section";
  const headSize = hook ? 86 : section ? 74 : 60;
  const subSize = hook ? 86 : section ? 44 : 48;
  const top = hook ? 1430 : 1500;
  let head: React.ReactNode = c.head;
  if (section) {
    const [num, ...rest] = c.head.split(" ");
    head = (
      <>
        <span style={{ color: C.heat, marginRight: 18 }}>{num}</span>
        {rest.join(" ")}
      </>
    );
  }
  return (
    <div
      style={{
        position: "absolute",
        left: 60,
        right: 60,
        top,
        textAlign: "center",
        opacity: o,
        transform: `translateY(${rise}px)`,
        textShadow: shadow,
      }}
    >
      <div
        style={{
          fontFamily: hook || section ? SERIF : SANS,
          fontWeight: hook || section ? 800 : 600,
          fontSize: headSize,
          lineHeight: 1.25,
          color: C.ink,
          letterSpacing: hook ? "0.06em" : "0.04em",
        }}
      >
        {head}
      </div>
      {c.sub ? (
        <div
          style={{
            marginTop: hook ? 6 : 14,
            fontFamily: hook ? SERIF : SANS,
            fontWeight: hook ? 800 : 400,
            fontSize: subSize,
            lineHeight: 1.3,
            color: hook ? C.cold : "rgba(243,236,223,0.82)",
            letterSpacing: "0.05em",
            opacity: subIn,
            transform: `translateY(${(1 - subIn) * 10}px)`,
          }}
        >
          {c.sub}
        </div>
      ) : null}
    </div>
  );
};

const TagView: React.FC<{ i: number; f: number }> = ({ i, f }) => {
  const t = TAGS[i];
  const o = env(f, t.f0, t.f1, 7, 7);
  if (o <= 0) return null;
  const s = worldAt(f);
  const view = camAt(f);
  const [c, r] = t.at(f);
  const p = t.onPath ? pathPoint(s, c) : cellTop(s, c, r, t.ladderEnd);
  const [x, y] = project(view, p);
  const size = t.size ?? 36;
  const gap = 14;
  const tf: Record<typeof t.side, string> = {
    right: `translate(${gap}px, -50%)`,
    left: `translate(calc(-100% - ${gap}px), -50%)`,
    above: `translate(-50%, calc(-100% - ${gap - 4}px))`,
    below: `translate(-50%, ${gap - 4}px)`,
  };
  return (
    <div
      style={{
        position: "absolute",
        left: x,
        top: y,
        transform: `${tf[t.side]} scale(${0.92 + 0.08 * o})`,
        transformOrigin: "center",
        opacity: o,
        whiteSpace: "nowrap",
        fontFamily: SANS,
        fontWeight: 700,
        fontSize: size,
        letterSpacing: "0.04em",
        color: t.color,
        textShadow: shadow,
      }}
    >
      {t.text}
    </div>
  );
};

/** Plane edge → screen, for axes and legend (front camera only). */
const planeScreen = (f: number) => {
  const v = camAt(f);
  const [lx, by] = project(v, [-PLANE_W / 2, -PLANE_H / 2, 0]);
  const [rx, ty] = project(v, [PLANE_W / 2, PLANE_H / 2, 0]);
  return { lx, rx, ty, by, v };
};

const Axes: React.FC<{ f: number }> = ({ f }) => {
  const { f0, f1 } = CARDS.axes;
  const o = env(f, f0, f1, 10, 10);
  if (o <= 0) return null;
  const { lx, rx, ty, by, v } = planeScreen(f);
  const d = easeOut((f - f0) / 26);
  const y0 = by + 26;
  const x0 = lx - 26;
  const ticks = [4, 18, 32, 46];
  return (
    <svg width={1080} height={1920} style={{ position: "absolute", inset: 0, opacity: o }}>
      <defs>
        <marker id="ah" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="9" markerHeight="9" orient="auto">
          <path d="M0,0 L10,5 L0,10 z" fill={C.ink} />
        </marker>
      </defs>
      <line x1={lx} y1={y0} x2={lx + (rx + 30 - lx) * d} y2={y0} stroke={C.ink} strokeWidth={2.5} markerEnd="url(#ah)" />
      <line x1={x0} y1={by} x2={x0} y2={by - (by - (ty - 30)) * d} stroke={C.ink} strokeWidth={2.5} markerEnd="url(#ah)" />
      <text x={rx + 10} y={y0 + 52} textAnchor="end" fill={C.ink} style={{ font: `700 38px ${SANS}`, letterSpacing: "0.06em" }} opacity={smooth(f0 + 14, f0 + 24, f)}>
        {AXIS.time} →
      </text>
      <text x={x0 + 4} y={ty - 50} textAnchor="start" fill={C.ink} style={{ font: `700 38px ${SANS}`, letterSpacing: "0.06em" }} opacity={smooth(f0 + 18, f0 + 28, f)}>
        ↑ {AXIS.price}
      </text>
      {ticks.map((r, k) => {
        const [, yy] = project(v, [-PLANE_W / 2, cellY(r), 0]);
        return (
          <text key={r} x={x0 - 12} y={yy + 8} textAnchor="end" fill={C.mute} style={{ font: `500 22px ${SANS}` }} opacity={smooth(f0 + 22 + k * 3, f0 + 32 + k * 3, f)}>
            {priceOf(r).toFixed(1)}
          </text>
        );
      })}
    </svg>
  );
};

const Legend: React.FC<{ f: number }> = ({ f }) => {
  const { f0, f1 } = CARDS.legend;
  const o = env(f, f0, f1, 10, 10);
  if (o <= 0) return null;
  const { rx, ty, by } = planeScreen(f);
  const h = (by - ty) * 0.62;
  const top = ty + (by - ty - h) / 2;
  const grow = easeOut((f - f0) / 22);
  const hot = f < 810;
  return (
    <div style={{ position: "absolute", left: rx + 26, top, width: 16, height: h, opacity: o }}>
      <div
        style={{
          position: "absolute",
          inset: 0,
          borderRadius: 8,
          background: `linear-gradient(to top, ${rampCss()})`,
          clipPath: `inset(${(1 - grow) * 100}% 0 0 0 round 8px)`,
          boxShadow: "0 0 24px rgba(246,194,94,0.18)",
        }}
      />
      <div style={{ position: "absolute", left: -8, top: -58, transform: "translateX(-50%)", font: `800 40px ${SANS}`, color: C.heat, textShadow: shadow, opacity: hot ? 1 : 0.35 }}>{AXIS.thick}</div>
      <div style={{ position: "absolute", left: -8, bottom: -60, transform: "translateX(-50%)", font: `800 40px ${SANS}`, color: C.cold, textShadow: shadow, opacity: hot ? 0.35 : 1 }}>{AXIS.thin}</div>
    </div>
  );
};

const Title: React.FC<{ f: number }> = ({ f }) => {
  const { f0, f1 } = CARDS.title;
  const o = env(f, f0, f1, 14, 12);
  if (o <= 0) return null;
  const line = easeOut((f - f0 - 8) / 30);
  const subIn = smooth(f0 + 16, f0 + 30, f);
  return (
    <div style={{ position: "absolute", left: 0, right: 0, top: 690, textAlign: "center", opacity: o, textShadow: shadow }}>
      <div
        style={{
          fontFamily: SERIF,
          fontWeight: 900,
          fontSize: 138,
          color: C.ink,
          letterSpacing: `${0.16 - 0.06 * easeOut((f - f0) / 40)}em`,
          paddingLeft: "0.1em",
        }}
      >
        {TITLE.head}
      </div>
      <div style={{ margin: "34px auto 0", width: 520 * line, height: 4, borderRadius: 2, background: `linear-gradient(to right, ${rampCss()})` }} />
      <div style={{ marginTop: 34, fontFamily: SANS, fontWeight: 500, fontSize: 50, color: "rgba(243,236,223,0.86)", letterSpacing: "0.22em", opacity: subIn }}>{TITLE.sub}</div>
    </div>
  );
};

const Neq: React.FC<{ f: number }> = ({ f }) => {
  const { f0, f1 } = CARDS.neq;
  const o = env(f, f0, f1, 12, 10);
  if (o <= 0) return null;
  const hit = easeOut((f - f0 - 10) / 16);
  return (
    <div style={{ position: "absolute", left: 0, right: 0, top: 640, textAlign: "center", opacity: o, fontFamily: SERIF, fontWeight: 900, fontSize: 168, color: C.ink, textShadow: shadow }}>
      <span style={{ color: C.heat }}>{NEQ.a}</span>
      <span style={{ display: "inline-block", margin: "0 40px", transform: `scale(${0.6 + 0.4 * hit})`, opacity: hit, color: C.ink }}>{NEQ.op}</span>
      <span>{NEQ.b}</span>
    </div>
  );
};

const Summary: React.FC<{ f: number }> = ({ f }) => {
  const { f0, f1, lines, stagger } = CARDS.summary;
  const out = 1 - smooth(f1 - 10, f1, f);
  if (f < f0 || out <= 0) return null;
  const colors = [C.heat, C.ink, C.cold];
  return (
    <div style={{ position: "absolute", left: 0, right: 0, top: 640, textAlign: "center" }}>
      {lines.map((l, i) => {
        const a = smooth(f0 + i * stagger, f0 + i * stagger + 12, f) * out;
        return (
          <div
            key={l}
            style={{
              fontFamily: SERIF,
              fontWeight: 800,
              fontSize: 84,
              lineHeight: 1.0,
              marginBottom: 74,
              color: C.ink,
              opacity: a,
              transform: `translateY(${(1 - a) * 18}px)`,
              letterSpacing: "0.06em",
              textShadow: shadow,
            }}
          >
            <span style={{ color: colors[i] }}>{l.split("　")[0]}</span>
            {"　" + l.split("　").slice(1).join("　")}
          </div>
        );
      })}
    </div>
  );
};

const End: React.FC<{ f: number }> = ({ f }) => {
  const { f0, f1, head, sub } = CARDS.end;
  const o = smooth(f0, f0 + 14, f) * (1 - smooth(f1 - 16, f1, f));
  if (o <= 0) return null;
  const subIn = smooth(f0 + 14, f0 + 28, f);
  return (
    <>
      <div style={{ position: "absolute", left: 0, right: 0, top: 790, textAlign: "center", opacity: o, fontFamily: SERIF, fontWeight: 800, fontSize: 82, color: C.ink, letterSpacing: "0.06em", textShadow: shadow }}>
        <div>{head}</div>
        <div style={{ marginTop: 26, color: C.mute, opacity: subIn }}>{sub}</div>
      </div>
      <div style={{ position: "absolute", left: 0, right: 0, top: 1640, textAlign: "center", opacity: o * smooth(f0 + 20, f0 + 34, f), fontFamily: SANS, fontWeight: 500, fontSize: 28, color: C.mute, letterSpacing: "0.12em" }}>
        {END_NOTE}
      </div>
    </>
  );
};

const Disclaimer: React.FC<{ f: number }> = ({ f }) => {
  const o = smooth(4, 16, f) * (1 - smooth(CARDS.end.f0, CARDS.end.f0 + 10, f));
  return (
    <div
      style={{
        position: "absolute",
        left: 0,
        right: 0,
        top: 150,
        textAlign: "center",
        opacity: o * 0.9,
        fontFamily: SANS,
        fontWeight: 500,
        fontSize: 28,
        letterSpacing: "0.16em",
        color: C.mute,
        textShadow: shadow,
      }}
    >
      {DISCLAIMER}
    </div>
  );
};

export const Overlay: React.FC = () => {
  const f = useCurrentFrame();
  return (
    <div style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
      <Disclaimer f={f} />
      <Axes f={f} />
      <Legend f={f} />
      {TAGS.map((_, i) => (
        <TagView key={i} i={i} f={f} />
      ))}
      <Title f={f} />
      <Neq f={f} />
      <Summary f={f} />
      <End f={f} />
      {CAPTIONS.map((c, i) => (
        <CaptionView key={i} c={c} f={f} />
      ))}
    </div>
  );
};

