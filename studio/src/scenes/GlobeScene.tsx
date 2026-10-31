import { useMemo } from "react";
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { noise2D } from "@remotion/noise";
import * as THREE from "three";
import { CameraRig, Glow, Stage, Starfield } from "../components/Stage";
import { C, scramble } from "../components/Hud";
import { arcCurve, buildGraticule, buildLandDots, CITIES, latLonToVec3 } from "../lib/geo";
import { DISPLAY, MONO, UI, zh } from "../lib/fonts";
import { ease, useGsap } from "../lib/gsap";
import { SOFT_POINT_FRAG } from "../lib/glsl";
import { TL } from "../lib/timeline";
import { COPY } from "../copy";

const R = 2;
const GLOBE_POS = new THREE.Vector3(0.95, -0.05, 0);
const TILT = 0.36;
const ARC_COLORS = [C.cyan, C.magenta, C.amber];
const CAM_FOV = 35;

type Arc = (typeof TL.arcs)[number];

// ---------- frame -> world state (shared by WebGL and the HTML label layer) ----------

const globeState = (frame: number) => {
  const intro = ease("expo.out")(Math.min(1, frame / 70));
  const spin = THREE.MathUtils.degToRad(-112 + frame * 0.13);
  return {
    scale: interpolate(intro, [0, 1], [0.62, 1]),
    spin,
    reveal: interpolate(frame, [4, 74], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }),
    cam: new THREE.Vector3(Math.sin(frame * 0.004) * 0.3, 0.35 - frame * 0.0006, 9.4 - ease("power2.out")(frame / 450) * 0.7),
  };
};

const arcState = (arc: Arc, frame: number) => {
  const t = frame - arc.start;
  const head = t <= 0 ? 0 : 1.28 * ease("power2.inOut")(Math.min(1, t / (arc.dur * 1.28)));
  const since = t - arc.dur; // frames since arrival
  const pulse = since > 0 ? ((since % 46) / 34) : -1;
  return { t, head, since, pulse: pulse > 1 ? -1 : pulse };
};

// ---------- shaders ----------

const dotsVertex = /* glsl */ `
uniform float uReveal;
uniform float uScanX;
uniform float uSize;
attribute float aLat;
attribute float aRand;
varying vec3 vColor;
varying float vAlpha;
void main(){
  vec4 world = modelMatrix * vec4(position, 1.0);
  vec3 n = normalize(mat3(modelMatrix) * position);
  float facing = dot(n, normalize(cameraPosition - world.xyz));
  // reveal sweeps pole to pole with a hot leading edge
  float front = uReveal * 200.0 - 10.0;
  float lat = 90.0 - aLat;
  float shown = smoothstep(front, front - 8.0, lat);
  float edge = exp(-pow((lat - front + 4.0) / 5.0, 2.0));
  float scan = exp(-pow((world.x - uScanX) * 2.2, 2.0));
  vec4 mv = viewMatrix * world;
  gl_Position = projectionMatrix * mv;
  gl_PointSize = uSize * (0.8 + aRand * 0.5) * (1.0 + edge * 1.5 + scan * 0.6) * (7.5 / -mv.z);
  vec3 base = mix(vec3(0.10, 0.38, 0.95), vec3(0.42, 0.92, 1.0), smoothstep(0.1, 0.9, facing));
  vColor = base * (0.55 + 0.45 * aRand) + vec3(1.0) * edge + vec3(0.3, 0.9, 1.0) * scan * 0.8;
  vAlpha = (shown + edge) * smoothstep(-0.05, 0.35, facing);
}
`;

const oceanFrag = /* glsl */ `
varying vec3 vNormalV;
void main(){
  float f = 1.0 - max(0.0, dot(normalize(vNormalV), vec3(0.0, 0.0, 1.0)));
  vec3 col = mix(vec3(0.012, 0.024, 0.06), vec3(0.03, 0.11, 0.26), pow(f, 2.2));
  gl_FragColor = vec4(col, 1.0);
}
`;

const atmoFrag = /* glsl */ `
uniform float uIntensity;
varying vec3 vNormalV;
void main(){
  float i = pow(clamp(0.74 - dot(normalize(vNormalV), vec3(0.0, 0.0, 1.0)), 0.0, 1.0), 4.0) * uIntensity;
  gl_FragColor = vec4(vec3(0.25, 0.65, 1.0) * i, i);
}
`;

const normalVertex = /* glsl */ `
varying vec3 vNormalV;
void main(){
  vNormalV = normalMatrix * normal;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

const arcFrag = /* glsl */ `
uniform float uHead;
uniform float uPulse;
uniform vec3 uColor;
varying vec2 vUv;
void main(){
  float x = vUv.x;
  if (x > uHead) discard;
  float trail = smoothstep(uHead - 0.3, uHead, x);
  float pulse = uPulse < 0.0 ? 0.0 : exp(-pow((x - uPulse) * 24.0, 2.0));
  float a = 0.22 + trail * 1.3 + pulse * 1.4;
  vec3 col = uColor * (0.7 + trail) + vec3(1.0) * (pow(trail, 10.0) * 1.6 + pulse * 0.7);
  gl_FragColor = vec4(col * a, a);
}
`;

// ---------- 3D components ----------

const LandDots: React.FC<{ reveal: number; scanX: number }> = ({ reveal, scanX }) => {
  const { geometry, material } = useMemo(() => {
    const { positions, latitudes } = buildLandDots(150000, R);
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute("aLat", new THREE.BufferAttribute(latitudes, 1));
    const rand = new Float32Array(latitudes.length).map((_, i) => (Math.sin(i * 12.9898) * 43758.5453) % 1);
    geometry.setAttribute("aRand", new THREE.BufferAttribute(rand.map(Math.abs), 1));
    const material = new THREE.ShaderMaterial({
      vertexShader: dotsVertex,
      fragmentShader: SOFT_POINT_FRAG,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      uniforms: { uReveal: { value: 0 }, uScanX: { value: 0 }, uSize: { value: 2.3 } },
    });
    return { geometry, material };
  }, []);
  material.uniforms.uReveal.value = reveal;
  material.uniforms.uScanX.value = scanX;
  return <points geometry={geometry} material={material} frustumCulled={false} />;
};

const GlobeShell: React.FC<{ atmo: number }> = ({ atmo }) => {
  const { ocean, atmosphere, graticule } = useMemo(() => {
    const ocean = new THREE.ShaderMaterial({ vertexShader: normalVertex, fragmentShader: oceanFrag });
    const atmosphere = new THREE.ShaderMaterial({
      vertexShader: normalVertex,
      fragmentShader: atmoFrag,
      side: THREE.BackSide,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      uniforms: { uIntensity: { value: 1 } },
    });
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(buildGraticule(R * 1.002), 3));
    const graticule = new THREE.LineSegments(
      g,
      new THREE.LineBasicMaterial({ color: "#3d6dff", transparent: true, opacity: 0.1, blending: THREE.AdditiveBlending, depthWrite: false }),
    );
    return { ocean, atmosphere, graticule };
  }, []);
  atmosphere.uniforms.uIntensity.value = atmo;
  return (
    <>
      <mesh material={ocean}>
        <sphereGeometry args={[R * 0.993, 96, 96]} />
      </mesh>
      <primitive object={graticule} />
      <mesh material={atmosphere} scale={1.13}>
        <sphereGeometry args={[R, 96, 96]} />
      </mesh>
    </>
  );
};

const up = new THREE.Vector3(0, 1, 0);
const zAxis = new THREE.Vector3(0, 0, 1);

const DataArc: React.FC<{ arc: Arc; index: number; frame: number }> = ({ arc, index, frame }) => {
  const color = ARC_COLORS[index % ARC_COLORS.length];
  const { curve, geometry, material, dest, qRing, qSpike } = useMemo(() => {
    const curve = arcCurve(CITIES[arc.from], CITIES[arc.to], R);
    const geometry = new THREE.TubeGeometry(curve, 160, 0.0085, 6, false);
    const material = new THREE.ShaderMaterial({
      vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
      fragmentShader: arcFrag,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      uniforms: { uHead: { value: 0 }, uPulse: { value: -1 }, uColor: { value: new THREE.Color(color) } },
    });
    const dest = latLonToVec3(...CITIES[arc.to], R);
    const n = dest.clone().normalize();
    return {
      curve,
      geometry,
      material,
      dest,
      qRing: new THREE.Quaternion().setFromUnitVectors(zAxis, n),
      qSpike: new THREE.Quaternion().setFromUnitVectors(up, n),
    };
  }, [arc, color]);

  const s = arcState(arc, frame);
  if (s.t <= 0) return null;
  material.uniforms.uHead.value = s.head;
  material.uniforms.uPulse.value = s.pulse;

  const headPos = s.head < 1 ? curve.getPointAt(Math.min(1, s.head)) : null;
  const ring = s.since > 0 ? Math.min(1, s.since / 38) : 0;
  const spike = s.since > 0 ? ease("elastic.out(1, 0.5)")(Math.min(1, s.since / 40)) : 0;

  return (
    <group>
      <mesh geometry={geometry} material={material} />
      {headPos && (
        <mesh position={headPos} scale={0.035}>
          <sphereGeometry args={[1, 12, 12]} />
          <meshBasicMaterial color="#ffffff" toneMapped={false} />
        </mesh>
      )}
      {s.since > 0 && ring < 1 && (
        <mesh position={dest} quaternion={qRing} scale={0.05 + ease("expo.out")(ring) * 0.38}>
          <ringGeometry args={[0.82, 1, 48]} />
          <meshBasicMaterial color={color} transparent opacity={(1 - ring) * 0.9} blending={THREE.AdditiveBlending} depthWrite={false} side={THREE.DoubleSide} />
        </mesh>
      )}
      {spike > 0 && (
        <mesh position={dest} quaternion={qSpike} scale={[1, spike * 0.32, 1]}>
          <cylinderGeometry args={[0.009, 0.004, 1, 6, 1, false]} />
          <meshBasicMaterial color={color} transparent opacity={0.9} blending={THREE.AdditiveBlending} depthWrite={false} />
        </mesh>
      )}
    </group>
  );
};

const CityMarkers: React.FC<{ frame: number; reveal: number }> = ({ frame, reveal }) => {
  const { geometry, material } = useMemo(() => {
    const names = Object.keys(CITIES);
    const pos = new Float32Array(names.length * 3);
    names.forEach((n, i) => latLonToVec3(...CITIES[n], R * 1.004).toArray(pos, i * 3));
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    const material = new THREE.ShaderMaterial({
      vertexShader: `uniform float uSize; varying vec3 vColor; varying float vAlpha;
        void main(){ vec4 mv = modelViewMatrix * vec4(position,1.0); gl_Position = projectionMatrix * mv;
        gl_PointSize = uSize * (7.5 / -mv.z); vColor = vec3(1.0, 0.78, 0.4); vAlpha = 1.0; }`,
      fragmentShader: SOFT_POINT_FRAG,
      transparent: true,
      depthWrite: false,
      depthTest: true,
      blending: THREE.AdditiveBlending,
      uniforms: { uSize: { value: 9 } },
    });
    return { geometry, material };
  }, []);
  material.uniforms.uSize.value = (7 + Math.sin(frame * 0.2) * 1.5) * reveal;
  return <points geometry={geometry} material={material} />;
};

// ---------- HTML overlay: city labels projected from 3D ----------

const useProjector = (frame: number, width: number, height: number) =>
  useMemo(() => {
    const g = globeState(frame);
    const cam = new THREE.PerspectiveCamera(CAM_FOV, width / height, 0.1, 400);
    cam.position.copy(g.cam);
    cam.lookAt(0, 0, 0);
    cam.updateMatrixWorld();
    const m = new THREE.Matrix4().compose(
      GLOBE_POS,
      new THREE.Quaternion().setFromEuler(new THREE.Euler(TILT, g.spin, 0, "XYZ")),
      new THREE.Vector3(g.scale, g.scale, g.scale),
    );
    return (lat: number, lon: number, lift = 1) => {
      const local = latLonToVec3(lat, lon, R * lift);
      const world = local.clone().applyMatrix4(m);
      const normal = world.clone().sub(GLOBE_POS).normalize();
      const facing = normal.dot(cam.position.clone().sub(world).normalize());
      const ndc = world.project(cam);
      return { x: ((ndc.x + 1) / 2) * width, y: ((1 - ndc.y) / 2) * height, facing };
    };
  }, [frame, width, height]);

// Cities whose label would collide with a neighbour's get flipped to the left side.
const LEFT_LABELS = new Set(["Beijing", "Paris", "London", "Shenzhen"]);

const CityLabels: React.FC<{ frame: number }> = ({ frame }) => {
  const { width, height } = useVideoConfig();
  const project = useProjector(frame, width, height);
  const arrivals = new Map<string, number>();
  for (const a of TL.arcs) {
    const at = a.start + a.dur;
    if (frame >= at && !arrivals.has(a.to)) arrivals.set(a.to, at);
  }
  for (const a of TL.arcs) if (frame >= a.start && !arrivals.has(a.from)) arrivals.set(a.from, a.start);
  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      {[...arrivals.entries()].map(([city, at]) => {
        const p = project(...CITIES[city], 1.02);
        const age = frame - at;
        const vis = interpolate(p.facing, [0.05, 0.3], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
        const pop = ease("back.out(2.5)")(Math.min(1, age / 14));
        const hot = Math.max(0, 1 - age / 30);
        if (vis <= 0) return null;
        const left = LEFT_LABELS.has(city);
        return (
          <div
            key={city}
            style={{
              position: "absolute",
              left: p.x,
              top: p.y,
              transform: `translate(${left ? "calc(-100% - 14px)" : "14px"}, -50%) scale(${pop})`,
              transformOrigin: left ? "right center" : "left center",
              flexDirection: left ? "row-reverse" : "row",
              opacity: vis * (0.55 + hot * 0.45),
              display: "flex",
              alignItems: "center",
              gap: 8,
              fontFamily: MONO.fontFamily,
              fontSize: 15,
              letterSpacing: 2,
              color: hot > 0.2 ? "#fff" : C.text,
              textShadow: `0 0 10px ${C.cyan}`,
              whiteSpace: "nowrap",
            }}
          >
            <div style={{ width: 22, height: 1, background: C.cyan }} />
            {city.toUpperCase()}
          </div>
        );
      })}
    </AbsoluteFill>
  );
};

// ---------- HUD ----------

const code = (name: string) =>
  ({ Shanghai: "SHA", Beijing: "PEK", Shenzhen: "SZX", Tokyo: "TYO", Singapore: "SIN", Mumbai: "BOM", Dubai: "DXB", Moscow: "MOW", London: "LON", Paris: "PAR", "New York": "NYC", "San Francisco": "SFO", "Sao Paulo": "SAO", Sydney: "SYD", "Cape Town": "CPT", Seoul: "SEL" })[name] ?? name;

const Stat: React.FC<{ zhLabel: string; en: string; value: string; unit?: string; o: number; y: number }> = ({ zhLabel, en, value, unit, o, y }) => (
  <div style={{ opacity: o, transform: `translateY(${y}px)`, borderLeft: `2px solid ${C.cyan}66`, paddingLeft: 18 }}>
    <div style={{ display: "flex", gap: 10, alignItems: "baseline" }}>
      <span style={{ ...zh(500), fontSize: 18, color: C.dim }}>{zhLabel}</span>
      <span style={{ fontFamily: MONO.fontFamily, fontSize: 11, letterSpacing: 2, color: `${C.cyan}aa` }}>{en}</span>
    </div>
    <div style={{ fontFamily: MONO.fontFamily, fontWeight: 700, fontSize: 50, color: C.text, marginTop: 4, letterSpacing: -1 }}>
      {value}
      {unit && <span style={{ fontSize: 20, color: C.cyan, marginLeft: 8, fontWeight: 400 }}>{unit}</span>}
    </div>
  </div>
);

const Hud: React.FC<{ frame: number }> = ({ frame }) => {
  const { fps } = useVideoConfig();
  const ui = useGsap(
    () => ({ tag: 0, wipe: 0, en: 0, rule: 0, stats: [0, 1, 2, 3].map(() => ({ o: 0, y: 30 })), log: 0, tp: 0, nodes: 0 }),
    (tl, s) => {
      tl.fromTo(s, { tag: 0 }, { tag: 1, duration: 0.8, ease: "none" }, 0.3);
      tl.fromTo(s, { wipe: 0 }, { wipe: 1, duration: 1.0, ease: "expo.inOut" }, 0.45);
      tl.fromTo(s, { en: 0 }, { en: 1, duration: 1.2, ease: "expo.out" }, 0.9);
      tl.fromTo(s, { rule: 0 }, { rule: 1, duration: 1.2, ease: "expo.inOut" }, 1.0);
      tl.fromTo(s.stats, { o: 0, y: 30 }, { o: 1, y: 0, duration: 0.8, ease: "expo.out", stagger: 0.12 }, 1.3);
      tl.fromTo(s, { log: 0 }, { log: 1, duration: 0.8, ease: "expo.out" }, 1.9);
      tl.fromTo(s, { tp: 0 }, { tp: 2.84, duration: 6, ease: "power3.out" }, 1.3);
      tl.fromTo(s, { nodes: 0 }, { nodes: 1286, duration: 5, ease: "expo.out" }, 1.4);
    },
  );
  const launched = TL.arcs.filter((a) => frame >= a.start);
  const jitter = noise2D("tp", frame * 0.05, 0);
  const latency = 38 + Math.round(noise2D("lat", frame * 0.04, 1) * 3);
  const out = interpolate(frame, [410, 446], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  return (
    <AbsoluteFill style={{ pointerEvents: "none", opacity: out }}>
      <div style={{ position: "absolute", left: 110, top: 150, width: 560 }}>
        <div style={{ fontFamily: MONO.fontFamily, fontSize: 15, letterSpacing: 4, color: C.cyan, whiteSpace: "pre" }}>
          {scramble("02 — DATA VISUALIZATION", ui.tag, frame)}
        </div>
        <div
          style={{
            ...zh(900),
            fontSize: 104,
            lineHeight: 1.15,
            marginTop: 14,
            background: `linear-gradient(100deg, #ffffff 30%, ${C.cyan})`,
            WebkitBackgroundClip: "text",
            color: "transparent",
            clipPath: `inset(0 ${100 - ui.wipe * 100}% 0 0)`,
          }}
        >
          {COPY.globeTitle}
        </div>
        <div style={{ fontFamily: DISPLAY.fontFamily, fontWeight: 300, fontSize: 24, letterSpacing: 4 + ui.en * 8, color: C.text, opacity: ui.en, marginTop: 6 }}>
          {COPY.globeTitleEn}
        </div>
        <div style={{ height: 1, width: 520 * ui.rule, background: `linear-gradient(90deg, ${C.cyan}, transparent)`, margin: "34px 0 34px" }} />
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", rowGap: 30, columnGap: 20 }}>
          <Stat zhLabel={COPY.globeRoutes} en="ROUTES" value={String(launched.length).padStart(2, "0")} o={ui.stats[0].o} y={ui.stats[0].y} />
          <Stat zhLabel={COPY.globeThroughput} en="THROUGHPUT" value={(ui.tp + (ui.tp > 0.1 ? jitter * 0.03 : 0)).toFixed(2)} unit="PB/s" o={ui.stats[1].o} y={ui.stats[1].y} />
          <Stat zhLabel={COPY.globeLatency} en="LATENCY" value={String(latency)} unit="ms" o={ui.stats[2].o} y={ui.stats[2].y} />
          <Stat zhLabel={COPY.globeNodes} en="NODES" value={Math.round(ui.nodes).toLocaleString("en-US")} o={ui.stats[3].o} y={ui.stats[3].y} />
        </div>
        <div style={{ marginTop: 40, opacity: ui.log, transform: `translateY(${(1 - ui.log) * 20}px)` }}>
          <div style={{ display: "flex", gap: 10, alignItems: "baseline", marginBottom: 12 }}>
            <span style={{ ...zh(500), fontSize: 16, color: C.dim }}>{COPY.globeLog}</span>
            <span style={{ fontFamily: MONO.fontFamily, fontSize: 11, letterSpacing: 2, color: `${C.cyan}aa` }}>ROUTE LOG</span>
            <div style={{ display: "flex", gap: 3, marginLeft: "auto", alignItems: "flex-end", height: 18 }}>
              {Array.from({ length: 22 }).map((_, i) => (
                <div key={i} style={{ width: 4, height: 4 + (noise2D("bar", i * 0.3, frame * 0.06) * 0.5 + 0.5) * 14, background: `${C.cyan}${i % 5 === 0 ? "ff" : "77"}` }} />
              ))}
            </div>
          </div>
          {launched
            .slice(-5)
            .reverse()
            .map((a, i) => {
              const s = arcState(a, frame);
              const synced = s.since > 0;
              const slide = ease("expo.out")(Math.min(1, s.t / 12));
              const color = ARC_COLORS[TL.arcs.indexOf(a) % ARC_COLORS.length];
              return (
                <div
                  key={a.from + a.to}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 14,
                    height: 34,
                    fontFamily: MONO.fontFamily,
                    fontSize: 16,
                    color: C.text,
                    opacity: slide * (1 - i * 0.15),
                    transform: `translateX(${(1 - slide) * -40}px)`,
                    borderBottom: `1px solid ${C.line}`,
                  }}
                >
                  <div style={{ width: 8, height: 8, borderRadius: 4, background: color, boxShadow: `0 0 10px ${color}` }} />
                  <span style={{ width: 150 }}>
                    {code(a.from)} → {code(a.to)}
                  </span>
                  <span style={{ width: 120, color: C.dim }}>{(a.dur / fps).toFixed(2)}s</span>
                  <span style={{ marginLeft: "auto", fontSize: 13, letterSpacing: 2, color: synced ? C.cyan : C.amber }}>
                    {synced ? "SYNCED" : `TX ${Math.round(Math.min(1, s.t / a.dur) * 100)}%`}
                  </span>
                </div>
              );
            })}
        </div>
      </div>
      <div style={{ position: "absolute", right: 110, top: 100, textAlign: "right", fontFamily: UI.fontFamily, color: C.dim, fontSize: 14, letterSpacing: 3, opacity: ui.log }}>
        <div style={{ fontFamily: MONO.fontFamily }}>
          CENTER {(-THREE.MathUtils.radToDeg(globeState(frame).spin)).toFixed(2)}°E · TILT {THREE.MathUtils.radToDeg(TILT).toFixed(1)}°
        </div>
        <div style={{ fontFamily: MONO.fontFamily, color: `${C.cyan}aa`, marginTop: 6 }}>WORLD-ATLAS 110M · {TL.arcs.length} GREAT-CIRCLE ARCS</div>
      </div>
    </AbsoluteFill>
  );
};

// ---------- scene ----------

export const GlobeScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const g = globeState(frame);
  const scanX = GLOBE_POS.x - 3 + ((frame * 0.02) % 6);

  return (
    <AbsoluteFill style={{ backgroundColor: C.bg }}>
      <Stage fov={CAM_FOV} bloom={1.1} bloomThreshold={0.16}>
        <CameraRig position={g.cam.toArray() as [number, number, number]} />
        <Starfield time={frame / fps} rotation={frame * 0.0004} />
        <Glow position={[2.5, 0.5, -12]} scale={26} color="#1b3bff" intensity={0.22} />
        <group position={GLOBE_POS} rotation={[TILT, g.spin, 0]} scale={g.scale}>
          <GlobeShell atmo={g.reveal * 0.75} />
          <LandDots reveal={g.reveal} scanX={scanX} />
          <CityMarkers frame={frame} reveal={g.reveal} />
          {TL.arcs.map((a, i) => (
            <DataArc key={i} arc={a} index={i} frame={frame} />
          ))}
        </group>
      </Stage>
      <CityLabels frame={frame} />
      <Hud frame={frame} />
    </AbsoluteFill>
  );
};
