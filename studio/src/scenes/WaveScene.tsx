import { useMemo } from "react";
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import * as THREE from "three";
import { CameraRig, Glow, Stage, Starfield } from "../components/Stage";
import { C, scramble } from "../components/Hud";
import { DISPLAY, MONO, zh } from "../lib/fonts";
import { ease, useGsap } from "../lib/gsap";
import { SIMPLEX_3D, SOFT_POINT_FRAG } from "../lib/glsl";
import { TL } from "../lib/timeline";
import { COPY } from "../copy";

const HIT = TL.cues.wave.hit[0];
const TICKS = TL.cues.wave.tick;
const [EXIT_START] = TL.cues.wave.riser;
const ACCENTS = [C.cyan, C.magenta, C.amber, C.violet];

// ---------- particle terrain ----------

const terrainVertex = /* glsl */ `
uniform float uTime;
uniform float uRippleT;
uniform float uSize;
varying vec3 vColor;
varying float vAlpha;
${SIMPLEX_3D}
void main(){
  vec3 p = position;
  float n = snoise(vec3(p.x * 0.11, p.z * 0.11 - uTime * 0.18, uTime * 0.12));
  float h = n * 0.95 + sin(p.x * 0.32 + uTime * 1.1) * cos(p.z * 0.27 + uTime * 0.7) * 0.42;
  // shockwave from the title hit: a travelling ring that decays with distance and time
  float r = length(p.xz - vec2(0.0, -6.0));
  float front = uRippleT * 10.0;
  float ripple = uRippleT > 0.0 ? sin((r - front) * 1.4) * exp(-pow((r - front) * 0.35, 2.0)) * exp(-uRippleT * 0.45) * 1.4 : 0.0;
  p.y = h + ripple;
  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  gl_Position = projectionMatrix * mv;
  gl_PointSize = uSize * (24.0 / -mv.z) * (1.0 + max(ripple, 0.0) * 0.8);
  float k = smoothstep(-1.2, 1.4, h + ripple);
  vec3 low = vec3(0.20, 0.08, 0.62);
  vec3 mid = vec3(0.95, 0.22, 0.78);
  vec3 high = vec3(0.45, 0.95, 1.0);
  vColor = k < 0.5 ? mix(low, mid, k * 2.0) : mix(mid, high, (k - 0.5) * 2.0);
  vColor += vec3(0.8, 0.95, 1.0) * max(ripple, 0.0) * 0.9;
  float fog = smoothstep(-34.0, -10.0, p.z) * smoothstep(9.0, 3.0, p.z);
  vAlpha = fog * (0.35 + k * 0.75);
}
`;

const Terrain: React.FC<{ time: number; rippleT: number }> = ({ time, rippleT }) => {
  const { geometry, material } = useMemo(() => {
    const nx = 320;
    const nz = 180;
    const pos = new Float32Array(nx * nz * 3);
    let k = 0;
    for (let iz = 0; iz < nz; iz++) {
      for (let ix = 0; ix < nx; ix++) {
        pos[k++] = (ix / (nx - 1) - 0.5) * 52;
        pos[k++] = 0;
        pos[k++] = 8 - (iz / (nz - 1)) * 42;
      }
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    const material = new THREE.ShaderMaterial({
      vertexShader: terrainVertex,
      fragmentShader: SOFT_POINT_FRAG,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      uniforms: { uTime: { value: 0 }, uRippleT: { value: 0 }, uSize: { value: 2.0 } },
    });
    return { geometry, material };
  }, []);
  material.uniforms.uTime.value = time;
  material.uniforms.uRippleT.value = rippleT;
  return <points geometry={geometry} material={material} frustumCulled={false} />;
};

// ---------- card icons (pure SVG, animated by frame) ----------

const Icon: React.FC<{ kind: number; t: number; color: string }> = ({ kind, t, color }) => {
  const s = { stroke: color, strokeWidth: 1.6, fill: "none" } as const;
  if (kind === 0) {
    // wireframe cube, rotated with real 3D projection
    const a = t * 1.2;
    const verts = [-1, 1].flatMap((x) => [-1, 1].flatMap((y) => [-1, 1].map((z) => [x, y, z])));
    const pr = verts.map(([x, y, z]) => {
      const x1 = x * Math.cos(a) - z * Math.sin(a);
      const z1 = x * Math.sin(a) + z * Math.cos(a);
      const y1 = y * Math.cos(0.5) - z1 * Math.sin(0.5);
      const z2 = y * Math.sin(0.5) + z1 * Math.cos(0.5);
      const f = 3 / (z2 + 4.5);
      return [24 + x1 * 13 * f, 24 + y1 * 13 * f];
    });
    const edges = [[0, 1], [0, 2], [0, 4], [1, 3], [1, 5], [2, 3], [2, 6], [3, 7], [4, 5], [4, 6], [5, 7], [6, 7]];
    return (
      <svg width={48} height={48}>
        {edges.map(([i, j], k) => (
          <line key={k} x1={pr[i][0]} y1={pr[i][1]} x2={pr[j][0]} y2={pr[j][1]} {...s} />
        ))}
      </svg>
    );
  }
  if (kind === 1) {
    return (
      <svg width={48} height={48}>
        {Array.from({ length: 14 }).map((_, i) => {
          const ang = (i / 14) * Math.PI * 2 + t * (i % 2 ? 1.4 : -0.9);
          const rr = 8 + (i % 3) * 6;
          return <circle key={i} cx={24 + Math.cos(ang) * rr} cy={24 + Math.sin(ang) * rr} r={1.8} fill={color} />;
        })}
      </svg>
    );
  }
  if (kind === 2) {
    return (
      <svg width={48} height={48}>
        {[0, 1, 2, 3, 4].map((i) => {
          const h = 8 + (Math.sin(t * 2.2 + i * 1.3) * 0.5 + 0.5) * 30;
          return <rect key={i} x={5 + i * 8.5} y={44 - h} width={5} height={h} fill={color} opacity={0.4 + i * 0.12} />;
        })}
      </svg>
    );
  }
  const len = 90;
  return (
    <svg width={48} height={48}>
      <path d="M4 40 C 18 40, 16 8, 44 8" {...s} strokeDasharray={len} strokeDashoffset={len * (1 - ((t * 0.6) % 1))} />
      <circle cx={4} cy={40} r={2.5} fill={color} />
      <circle cx={44} cy={8} r={2.5} fill={color} />
    </svg>
  );
};

// ---------- scene ----------

export const WaveScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;
  const at = (f: number) => f / fps;

  const ui = useGsap(
    () => ({
      tag: 0,
      chars: COPY.waveTitle.split("").map(() => ({ o: 0, rx: -90, y: 70, b: 20 })),
      en: 0,
      lift: 0,
      cards: COPY.cards.map(() => ({ o: 0, y: 90, rx: 28, sweep: 0 })),
      exit: 0,
    }),
    (tl, s) => {
      tl.fromTo(s, { tag: 0 }, { tag: 1, duration: 0.8, ease: "none" }, 0.1);
      tl.fromTo(s.chars, { o: 0, rx: -90, y: 70, b: 20 }, { o: 1, rx: 0, y: 0, b: 0, duration: 0.9, ease: "back.out(1.6)", stagger: 0.07 }, at(HIT));
      tl.fromTo(s, { en: 0 }, { en: 1, duration: 1.3, ease: "expo.out" }, at(HIT + 22));
      tl.fromTo(s, { lift: 0 }, { lift: 1, duration: 1.0, ease: "expo.inOut" }, at(TICKS[0] - 18));
      COPY.cards.forEach((_, i) => {
        tl.fromTo(s.cards[i], { o: 0, y: 90, rx: 28 }, { o: 1, y: 0, rx: 0, duration: 0.9, ease: "expo.out" }, at(TICKS[i]));
        tl.fromTo(s.cards[i], { sweep: 0 }, { sweep: 1, duration: 1.1, ease: "power2.inOut" }, at(TICKS[i] + 4));
      });
      tl.fromTo(s, { exit: 0 }, { exit: 1, duration: 1.9, ease: "power3.in" }, at(EXIT_START));
    },
  );

  const rippleT = frame >= HIT ? (frame - HIT) / fps : 0;
  const push = ease("power3.in")(interpolate(frame, [EXIT_START, 270], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }));
  const camZ = 9 - t * 0.35 - push * 6;
  const camY = 2.5 + Math.sin(t * 0.6) * 0.2 - push * 0.8;

  return (
    <AbsoluteFill style={{ backgroundColor: C.bg }}>
      <Stage fov={50} bloom={1.35} bloomThreshold={0.14}>
        <CameraRig position={[Math.sin(t * 0.35) * 0.8, camY, camZ]} target={[0, 0.4, camZ - 14]} roll={Math.sin(t * 0.5) * 0.03} />
        <Starfield time={t} opacity={0.8} />
        <Glow position={[0, 4, camZ - 42]} scale={70} color="#ff2fb4" intensity={0.22} />
        <Glow position={[-14, 8, camZ - 40]} scale={50} color="#3b2bff" intensity={0.25} />
        <Terrain time={t} rippleT={rippleT} />
      </Stage>

      <AbsoluteFill
        style={{
          pointerEvents: "none",
          opacity: 1 - ui.exit,
          filter: `blur(${ui.exit * 14}px)`,
          transform: `scale(${1 + ui.exit * 0.18})`,
        }}
      >
        <div style={{ position: "absolute", left: 110, top: 150, fontFamily: MONO.fontFamily, fontSize: 15, letterSpacing: 4, color: C.cyan, whiteSpace: "pre" }}>
          {scramble("03 — MOTION SYSTEM", ui.tag, frame)}
        </div>

        <AbsoluteFill
          style={{
            alignItems: "center",
            justifyContent: "center",
            transform: `translateY(${-ui.lift * 220}px) scale(${1 - ui.lift * 0.38})`,
          }}
        >
          <div style={{ display: "flex", perspective: 900, ...zh(900), fontSize: 168, color: "#fff", letterSpacing: 18 }}>
            {COPY.waveTitle.split("").map((ch, i) => (
              <span
                key={i}
                style={{
                  display: "inline-block",
                  opacity: ui.chars[i].o,
                  transform: `translateY(${ui.chars[i].y}px) rotateX(${ui.chars[i].rx}deg)`,
                  filter: `blur(${ui.chars[i].b}px)`,
                  textShadow: `0 0 40px ${C.magenta}99, 0 0 90px ${C.violet}88`,
                }}
              >
                {ch}
              </span>
            ))}
          </div>
          <div
            style={{
              fontFamily: DISPLAY.fontFamily,
              fontWeight: 300,
              fontSize: 30,
              color: C.text,
              letterSpacing: 34 - ui.en * 20,
              opacity: ui.en,
              marginTop: 10,
            }}
          >
            {COPY.waveTitleEn}
          </div>
        </AbsoluteFill>

        <div style={{ position: "absolute", left: 0, right: 0, top: 500, display: "flex", justifyContent: "center", gap: 28, perspective: 1200 }}>
          {COPY.cards.map((card, i) => {
            const c = ui.cards[i];
            const accent = ACCENTS[i];
            return (
              <div
                key={i}
                style={{
                  width: 360,
                  height: 250,
                  position: "relative",
                  overflow: "hidden",
                  opacity: c.o,
                  transform: `translateY(${c.y}px) rotateX(${c.rx}deg)`,
                  transformOrigin: "bottom center",
                  background: "linear-gradient(160deg, rgba(22,26,60,0.72), rgba(8,10,26,0.6))",
                  border: `1px solid rgba(140,180,255,0.22)`,
                  borderRadius: 18,
                  boxShadow: `0 30px 80px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.08), 0 0 40px ${accent}22`,
                  padding: "26px 28px",
                  boxSizing: "border-box",
                }}
              >
                <div style={{ position: "absolute", left: 0, top: 0, height: 3, width: `${c.sweep * 100}%`, background: accent, boxShadow: `0 0 18px ${accent}` }} />
                <div
                  style={{
                    position: "absolute",
                    inset: 0,
                    background: `linear-gradient(105deg, transparent ${c.sweep * 140 - 40}%, rgba(255,255,255,0.13) ${c.sweep * 140 - 25}%, transparent ${c.sweep * 140 - 10}%)`,
                  }}
                />
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <span style={{ fontFamily: MONO.fontFamily, fontSize: 15, color: accent, letterSpacing: 3 }}>0{i + 1}</span>
                  <Icon kind={i} t={t} color={accent} />
                </div>
                <div style={{ ...zh(900), fontSize: 38, color: "#fff", marginTop: 14 }}>{card.zh}</div>
                <div style={{ fontFamily: MONO.fontFamily, fontSize: 13, letterSpacing: 3, color: C.dim, marginTop: 4 }}>{card.en}</div>
                <div
                  style={{
                    fontFamily: DISPLAY.fontFamily,
                    fontWeight: 800,
                    fontSize: 30,
                    marginTop: 18,
                    background: `linear-gradient(90deg, #fff, ${accent})`,
                    WebkitBackgroundClip: "text",
                    color: "transparent",
                  }}
                >
                  {card.stat}
                </div>
              </div>
            );
          })}
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
