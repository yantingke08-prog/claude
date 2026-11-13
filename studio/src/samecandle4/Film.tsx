import { AbsoluteFill, Audio, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { fontsReady, num, sans } from "./fonts";
import { CUT, DISSOLVE, sceneAt } from "./layout";
import { Opening3D } from "./Opening3D";
import { Background, Captions, Corner, EmphDim, EndCard, Header, Layers, PAL } from "./Stage";

void fontsReady;

/** All 2D is laid out on a 1080×1920 page; at 2K (1440×2560) the page is scaled as vectors. */
const Page: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { width } = useVideoConfig();
  return <div style={{ position: "absolute", left: 0, top: 0, width: 1080, height: 1920, transform: `scale(${width / 1080})`, transformOrigin: "0 0" }}>{children}</div>;
};

export const SameCandle4Film: React.FC<{ muted?: boolean }> = ({ muted = false }) => {
  const f = useCurrentFrame();
  const scene = sceneAt(f);
  // 3D exists only in the opening: the 2D layer dissolves in over 4 frames, then the canvas is unmounted
  const k2d = Math.min(1, Math.max(0, (f - (CUT.rows - DISSOLVE)) / DISSOLVE));
  return (
    <AbsoluteFill style={{ background: PAL.bg }}>
      <Page key={`bg${f}`}>
        <Background />
      </Page>
      {f < CUT.rows && (
        <AbsoluteFill style={{ opacity: 1 - k2d }}>
          <Opening3D f={f} />
        </AbsoluteFill>
      )}
      {/* key={f}: the whole 2D page is rebuilt every frame, so Chrome repaints all of it the same way each time
          (partial repaints rasterised unchanged content slightly differently: found by the motion check) */}
      <Page key={f}>
        {scene !== "open3d" && (
          <div style={{ position: "absolute", inset: 0, opacity: k2d }}>
            <Layers f={f} scene={scene} />
          </div>
        )}
        <EmphDim f={f} />
        <Header f={f} />
        <EndCard f={f} />
        <Captions f={f} />
        <Corner />
      </Page>
      {!muted && <Audio src={staticFile("samecandle4/mix.wav")} />}
    </AbsoluteFill>
  );
};

/** Cover: the three aligned rows with every ending, one centred title. */
export const SameCandle4Cover: React.FC = () => {
  const f = CUT.why - 2;
  return (
    <AbsoluteFill style={{ background: PAL.bg }}>
      <Page>
        <Background />
        <Layers f={f} scene="rows" />
        <div style={{ position: "absolute", left: 0, right: 0, top: 0, height: 350, background: PAL.bg }} />
        <div style={{ position: "absolute", left: 0, right: 0, top: 96, textAlign: "center" }}>
          <div style={{ ...sans(700), fontSize: 34, color: PAL.gold, letterSpacing: 8 }}>K线科普 · 示意图</div>
          <div style={{ ...sans(900), fontSize: 100, color: "#fff", lineHeight: 1.1, marginTop: 8 }}>同一根大阳线</div>
          <div style={{ ...sans(900), fontSize: 60, color: PAL.gold, marginTop: 4 }}>为什么结局不同？</div>
        </div>
      </Page>
    </AbsoluteFill>
  );
};

/** Preview only: the film under a generic short-video phone UI (status bar, right button column, bottom info). */
export const SameCandle4Phone: React.FC = () => {
  const icon = (y: number, label: string) => (
    <div key={y} style={{ position: "absolute", left: 968, top: y, width: 92, textAlign: "center" }}>
      <div style={{ width: 76, height: 76, margin: "0 auto", borderRadius: 38, background: "rgba(255,255,255,0.88)" }} />
      <div style={{ ...sans(700), fontSize: 26, color: "#fff", marginTop: 6 }}>{label}</div>
    </div>
  );
  return (
    <AbsoluteFill>
      <SameCandle4Film muted />
      <Page>
        <div style={{ position: "absolute", left: 0, right: 0, top: 0, height: 64, background: "rgba(0,0,0,0.45)", display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0 40px", ...num(700), fontSize: 30, color: "#fff" }}>
          <span>9:41</span>
          <span>5G ▮▮▮ 86%</span>
        </div>
        {icon(1000, "1.2w")}
        {icon(1140, "860")}
        {icon(1280, "收藏")}
        {icon(1420, "分享")}
        <div style={{ position: "absolute", left: 0, right: 0, top: 1690, height: 230, background: "linear-gradient(180deg, rgba(0,0,0,0), rgba(0,0,0,0.65))" }} />
        <div style={{ position: "absolute", left: 40, top: 1730, ...sans(900), fontSize: 34, color: "#fff" }}>@账号名称</div>
        <div style={{ position: "absolute", left: 40, top: 1782, ...sans(500), fontSize: 30, color: "rgba(255,255,255,0.85)" }}>同一根大阳线，为什么结局不同 #K线</div>
        <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: 8, background: "rgba(255,255,255,0.3)" }} />
      </Page>
    </AbsoluteFill>
  );
};
