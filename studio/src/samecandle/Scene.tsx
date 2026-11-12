import { Environment, Lightformer } from "@react-three/drei";
import { useMemo } from "react";
import * as THREE from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { type Dir, clamp01, mix } from "./director";
import { PY, BASE_HI, BASE_LO, BODY_W, HERO, HERO_BAR, HERO_X, LANE_IDS, LANES, LANE_Y, MID, POST, PRE, RES_HI, RES_LO, SPACING, VOL_BASE, VOL_H, barX, priceY, type Bar, type LaneId } from "./data";

/** Palette. Candles: red = up, green = down (Chinese convention). Text never sits in red/green. */
export const PAL = {
  bg: "#05070c",
  up: "#ff2e43",
  upDeep: "#8a0614",
  down: "#10c27f",
  downDeep: "#03553a",
  gold: "#ffc861",
  ice: "#9fd4ff",
  glass: "#0b1019",
};

// ---------------------------------------------------------------- materials
const upMat = () =>
  new THREE.MeshPhysicalMaterial({ color: PAL.up, roughness: 0.2, metalness: 0.05, clearcoat: 1, clearcoatRoughness: 0.06, emissive: PAL.upDeep, emissiveIntensity: 0.55, sheen: 0.4, sheenColor: new THREE.Color("#ff9aa5"), transparent: true });
const downMat = () =>
  new THREE.MeshPhysicalMaterial({ color: PAL.down, roughness: 0.2, metalness: 0.05, clearcoat: 1, clearcoatRoughness: 0.06, emissive: PAL.downDeep, emissiveIntensity: 0.55, sheen: 0.4, sheenColor: new THREE.Color("#9affd6"), transparent: true });

type LaneMats = { up: THREE.MeshPhysicalMaterial; down: THREE.MeshPhysicalMaterial; hero: THREE.MeshPhysicalMaterial; volUp: THREE.MeshPhysicalMaterial; volDown: THREE.MeshPhysicalMaterial; volHero: THREE.MeshPhysicalMaterial };

const geoCache = new Map<string, THREE.BufferGeometry>();
const bodyGeo = (h: number) => {
  const hh = Math.max(0.014, h);
  const key = hh.toFixed(4);
  if (!geoCache.has(key)) geoCache.set(key, new RoundedBoxGeometry(BODY_W, hh, BODY_W, 3, Math.min(0.022, hh * 0.45)));
  return geoCache.get(key)!;
};
const WICK = new THREE.CylinderGeometry(0.0085, 0.0085, 1, 10);
const VOLGEO = new RoundedBoxGeometry(BODY_W * 1.08, 1, BODY_W * 1.08, 2, 0.012);
VOLGEO.translate(0, 0.5, 0);

// ---------------------------------------------------------------- one candle
const Candle: React.FC<{ b: Bar; i: number; grow: number; m: LaneMats; isHero: boolean }> = ({ b, i, grow, m, isHero }) => {
  if (grow <= 0) return null;
  const up = b.c >= b.o;
  // the growing bar draws from its open towards its close; wicks follow the range reached so far
  const c = mix(b.o, b.c, clamp01(grow * 1.15));
  const hi = mix(Math.max(b.o, c), b.h, clamp01((grow - 0.3) / 0.7));
  const lo = mix(Math.min(b.o, c), b.l, clamp01((grow - 0.3) / 0.7));
  const top = Math.max(b.o, c);
  const bot = Math.min(b.o, c);
  const h = (top - bot) * PY;
  const x = barX(i);
  const mat = isHero ? m.hero : up ? m.up : m.down;
  return (
    <group position={[x, 0, 0]}>
      <mesh geometry={bodyGeo(h)} material={mat} position={[0, priceY((top + bot) / 2), 0]} />
      {hi - lo > 0.01 && <mesh geometry={WICK} material={mat} position={[0, priceY((hi + lo) / 2), 0]} scale={[1, Math.max(0.001, (hi - lo) * PY), 1]} />}
    </group>
  );
};

// ---------------------------------------------------------------- glow strip (additive, for lasers / beams)
const glowMat = (color: string, soft = 1) =>
  new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    uniforms: { uColor: { value: new THREE.Color(color) }, uOpacity: { value: 1 }, uSoft: { value: soft }, uReveal: { value: 1 } },
    vertexShader: "varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }",
    fragmentShader: `uniform vec3 uColor; uniform float uOpacity; uniform float uSoft; uniform float uReveal; varying vec2 vUv;
      void main(){
        float d = abs(vUv.y - 0.5) * 2.0;
        float core = smoothstep(0.18, 0.0, d);
        float halo = pow(1.0 - d, 3.0) * 0.45 * uSoft;
        float head = smoothstep(uReveal, uReveal - 0.02, vUv.x);
        float edge = smoothstep(0.0, 0.04, vUv.x) * smoothstep(1.0, 0.96, vUv.x);
        float a = (core + halo) * head * edge * uOpacity;
        gl_FragColor = vec4(uColor * (1.0 + core * 1.6), a);
      }`,
  });

/** Volumetric-looking light column: camera-facing cross of soft planes with a vertical falloff. */
const beamMat = () =>
  new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    blending: THREE.AdditiveBlending,
    uniforms: { uColor: { value: new THREE.Color("#ffd9a8") }, uOpacity: { value: 1 }, uTime: { value: 0 } },
    vertexShader: "varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }",
    fragmentShader: `uniform vec3 uColor; uniform float uOpacity; uniform float uTime; varying vec2 vUv;
      void main(){
        float d = abs(vUv.x - 0.5) * 2.0;
        float core = exp(-d * d * 60.0) * 0.9 + exp(-d * d * 6.0) * 0.25;
        float v = smoothstep(0.0, 0.18, vUv.y) * smoothstep(1.0, 0.8, vUv.y);
        float flicker = 0.92 + 0.08 * sin(vUv.y * 40.0 - uTime * 2.0);
        gl_FragColor = vec4(uColor, core * v * flicker * uOpacity);
      }`,
  });

// ---------------------------------------------------------------- one lane (a chart on its own glass shelf)
const CHART_W = (PRE + POST + 1) * SPACING + 0.5;
const CHART_CX = (barX(0) + barX(PRE + POST)) / 2;

const Lane: React.FC<{ id: LaneId; d: Dir }> = ({ id, d }) => {
  const bars = LANES[id];
  const m = useMemo<LaneMats>(() => {
    const vu = upMat();
    const vd = downMat();
    [vu, vd].forEach((x) => {
      x.opacity = 0.5;
      x.depthWrite = false;
    });
    const vh = upMat();
    vh.opacity = 0.85;
    return { up: upMat(), down: downMat(), hero: upMat(), volUp: vu, volDown: vd, volHero: vh };
  }, []);
  const deco = useMemo(
    () => ({
      floor: new THREE.MeshPhysicalMaterial({ color: PAL.glass, roughness: 0.16, metalness: 0.4, clearcoat: 1, clearcoatRoughness: 0.05, transparent: true, opacity: 0.92 }),
      back: new THREE.MeshStandardMaterial({ color: "#05070b", roughness: 0.9, metalness: 0.0, transparent: true, opacity: 0.55 }),
      grid: new THREE.LineBasicMaterial({ color: "#2a3a52", transparent: true, opacity: 0.35 }),
      edge: glowMat(PAL.ice, 0.6),
      mid: glowMat(PAL.gold, 1),
      open: glowMat("#e9f1ff", 0.6),
      box: new THREE.MeshPhysicalMaterial({ color: "#9fd4ff", roughness: 0.1, transmission: 0.6, thickness: 0.2, transparent: true, opacity: 0.12, depthWrite: false }),
      boxEdge: new THREE.LineBasicMaterial({ color: PAL.ice, transparent: true, opacity: 0.9 }),
      band: new THREE.MeshBasicMaterial({ color: "#ffb36b", transparent: true, opacity: 0.16, depthWrite: false, blending: THREE.AdditiveBlending }),
      ribbon: glowMat(PAL.ice, 1),
    }),
    [],
  );
  const grid = useMemo(() => {
    const pts: number[] = [];
    for (let p = 60; p <= 135; p += 5) {
      const y = priceY(p);
      pts.push(barX(0) - 0.2, y, -0.62, barX(PRE + POST) + 0.2, y, -0.62);
    }
    for (let i = 0; i <= PRE + POST; i += 8) pts.push(barX(i), priceY(58), -0.62, barX(i), priceY(136), -0.62);
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(pts, 3));
    return g;
  }, []);
  const boxEdges = useMemo(() => {
    const w = barX(PRE - 1) - barX(12) + SPACING;
    const h = (BASE_HI - BASE_LO) * PY;
    return { w, h, geo: new THREE.EdgesGeometry(new THREE.BoxGeometry(w, h, 0.34)) };
  }, []);
  const ribbonGeo = useMemo(() => {
    // B's rally as a glowing ribbon along the closes
    const pts = bars.slice(0, PRE).map((b, i) => new THREE.Vector3(barX(i), priceY(b.c) + 0.18, 0.08));
    return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 160, 0.012, 6, false);
  }, [bars]);

  // per-frame material state
  const dim = d.dim[id];
  const fade = 1 - d.endFade * 0.55;
  const lum = mix(0.12, 1, dim) * fade;
  for (const x of [m.up, m.down]) {
    x.opacity = mix(0.35, 1, dim) * fade;
    x.emissiveIntensity = 0.55 * lum;
    x.color.set(x === m.up ? PAL.up : PAL.down).multiplyScalar(mix(0.25, 1, lum));
  }
  m.hero.color.set(PAL.up).multiplyScalar(mix(0.3, 1, lum));
  m.hero.emissiveIntensity = (0.55 + d.heroGlow * 0.9) * mix(0.3, 1, lum);
  m.hero.opacity = mix(0.5, 1, dim) * fade;
  m.volUp.opacity = 0.42 * d.vol * mix(0.3, 1, dim);
  m.volDown.opacity = 0.42 * d.vol * mix(0.3, 1, dim);
  m.volHero.opacity = 0.9 * d.vol * mix(0.35, 1, dim);
  m.volHero.emissiveIntensity = 0.6 + 2.2 * d.volHot[id];
  deco.floor.opacity = 0.92 * mix(0.55, 1, dim) * fade;
  deco.grid.opacity = 0.32 * mix(0.4, 1, dim) * fade;
  deco.edge.uniforms.uOpacity.value = 0.55 * mix(0.3, 1, dim) * fade;
  deco.mid.uniforms.uOpacity.value = d.mid * mix(0.35, 1, dim) * 1.1;
  deco.mid.uniforms.uReveal.value = 1.02 * clamp01(d.mid * 1.05);
  deco.open.uniforms.uOpacity.value = d.openLine * mix(0.25, 1, dim) * 0.9;
  deco.open.uniforms.uReveal.value = 1.02 * d.openLine;
  deco.box.opacity = 0.14 * d.baseBox;
  deco.boxEdge.opacity = 0.9 * d.baseBox;
  deco.band.opacity = 0.2 * d.resist;
  deco.ribbon.uniforms.uOpacity.value = d.trend;
  deco.ribbon.uniforms.uReveal.value = 1.02 * d.trend;

  const shown = PRE + 1 + Math.ceil(d.post[id]);
  const floorY = VOL_BASE - 0.06;
  void PY;
  return (
    <group position={[0, LANE_Y[id], 0]}>
      {/* glass shelf + back panel + price grid */}
      <mesh material={deco.floor} position={[CHART_CX, floorY, 0.2]}>
        <boxGeometry args={[CHART_W + 0.8, 0.07, 2.6]} />
      </mesh>
      <mesh material={deco.edge} position={[CHART_CX, floorY + 0.04, 1.5]}>
        <planeGeometry args={[CHART_W + 0.8, 0.06]} />
      </mesh>
      <lineSegments geometry={grid} material={deco.grid} />
      {/* candles */}
      {bars.slice(0, shown).map((b, i) => {
        const grow = i <= HERO ? 1 : clamp01(d.post[id] - (i - HERO - 1));
        return <Candle key={i} b={b} i={i} grow={grow} m={m} isHero={i === HERO} />;
      })}
      {/* volume */}
      {d.vol > 0.002 &&
        bars.slice(0, shown).map((b, i) => {
          const grow = i <= HERO ? 1 : clamp01(d.post[id] - (i - HERO - 1));
          const h = Math.max(0.004, b.v * VOL_H * d.vol * grow);
          const mat = i === HERO ? m.volHero : b.c >= b.o ? m.volUp : m.volDown;
          return <mesh key={`v${i}`} geometry={VOLGEO} material={mat} position={[barX(i), VOL_BASE, 0]} scale={[1, h, 1]} />;
        })}
      {/* A: consolidation box */}
      {id === "A" && d.baseBox > 0.001 && (
        <group position={[(barX(12) + barX(PRE - 1)) / 2, priceY((BASE_HI + BASE_LO) / 2), 0]}>
          <mesh material={deco.box}>
            <boxGeometry args={[boxEdges.w, boxEdges.h, 0.34]} />
          </mesh>
          <lineSegments geometry={boxEdges.geo} material={deco.boxEdge} />
        </group>
      )}
      {/* B: the rally ribbon */}
      {id === "B" && d.trend > 0.001 && <mesh geometry={ribbonGeo} material={deco.ribbon} />}
      {/* C: resistance band */}
      {id === "C" && d.resist > 0.001 && (
        <mesh material={deco.band} position={[CHART_CX, priceY((RES_LO + RES_HI) / 2), 0.02]}>
          <boxGeometry args={[CHART_W, (RES_HI - RES_LO) * PY, 0.5]} />
        </mesh>
      )}
      {/* midpoint laser (half of the hero body) and the open line */}
      {d.mid > 0.001 && (
        <mesh material={deco.mid} position={[CHART_CX + 1.6, priceY(MID), 0.1]}>
          <planeGeometry args={[CHART_W - 3.2, 0.1]} />
        </mesh>
      )}
      {d.openLine > 0.001 && (
        <mesh material={deco.open} position={[CHART_CX + 1.6, priceY(HERO_BAR.o), 0.1]}>
          <planeGeometry args={[CHART_W - 3.2, 0.06]} />
        </mesh>
      )}
    </group>
  );
};

// ---------------------------------------------------------------- floating dust in the light
const Dust: React.FC<{ d: Dir }> = ({ d }) => {
  const { geo, mat } = useMemo(() => {
    const n = 1400;
    const p = new Float32Array(n * 3);
    const s = new Float32Array(n);
    let seed = 7;
    const r = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    for (let i = 0; i < n; i++) {
      p[i * 3] = (r() - 0.5) * 16;
      p[i * 3 + 1] = (r() - 0.5) * 24;
      p[i * 3 + 2] = (r() - 0.5) * 10;
      s[i] = 0.4 + r();
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(p, 3));
    g.setAttribute("aSize", new THREE.BufferAttribute(s, 1));
    const m = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      uniforms: { uTime: { value: 0 }, uBeamX: { value: HERO_X }, uOpacity: { value: 1 } },
      vertexShader: `attribute float aSize; uniform float uTime; uniform float uBeamX; varying float vA;
        void main(){
          vec3 p = position;
          p.y += mod(uTime * 0.01 * aSize + p.y + 12.0, 24.0) - 12.0 - p.y;
          p.x += sin(uTime * 0.02 + p.y) * 0.15;
          vec4 mv = modelViewMatrix * vec4(p, 1.0);
          float nearBeam = exp(-pow(p.x - uBeamX, 2.0) * 0.6);
          vA = 0.18 + 0.82 * nearBeam;
          gl_PointSize = aSize * 30.0 / -mv.z;
          gl_Position = projectionMatrix * mv;
        }`,
      fragmentShader: `uniform float uOpacity; varying float vA;
        void main(){ float d = length(gl_PointCoord - 0.5); float a = smoothstep(0.5, 0.0, d); gl_FragColor = vec4(1.0, 0.86, 0.68, a * vA * uOpacity * 0.55); }`,
    });
    return { geo: g, mat: m };
  }, []);
  mat.uniforms.uTime.value = d.f;
  mat.uniforms.uOpacity.value = 0.35 + 0.65 * d.beam;
  return <points geometry={geo} material={mat} />;
};

// ---------------------------------------------------------------- backdrop: a soft dark gradient dome
const Backdrop: React.FC<{ d: Dir }> = ({ d }) => {
  const mat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        side: THREE.BackSide,
        depthWrite: false,
        uniforms: { uWarm: { value: 1 } },
        vertexShader: "varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }",
        fragmentShader: `uniform float uWarm; varying vec3 vP;
          void main(){
            vec3 base = vec3(0.006, 0.008, 0.014);
            float back = smoothstep(0.2, 1.0, -vP.z);
            vec3 cool = vec3(0.012, 0.03, 0.06) * smoothstep(-0.4, 0.8, vP.y) * back;
            vec3 warm = vec3(0.12, 0.045, 0.02) * exp(-pow(vP.x * 4.0, 2.0)) * back * uWarm;
            gl_FragColor = vec4(base + cool + warm * 0.45, 1.0);
          }`,
      }),
    [],
  );
  mat.uniforms.uWarm.value = 0.5 + 0.8 * d.beam;
  return (
    <mesh material={mat}>
      <sphereGeometry args={[120, 48, 24]} />
    </mesh>
  );
};

// ---------------------------------------------------------------- light column through the three heroes
const Beam: React.FC<{ d: Dir }> = ({ d }) => {
  const mats = useMemo(() => [beamMat(), beamMat()], []);
  const ring = useMemo(() => glowMat(PAL.gold, 1), []);
  mats.forEach((m) => {
    m.uniforms.uOpacity.value = d.beam * 0.75;
    m.uniforms.uTime.value = d.f;
  });
  ring.uniforms.uOpacity.value = d.beam * 0.6;
  if (d.beam < 0.002) return null;
  return (
    <group position={[HERO_X, 0, 0]}>
      <mesh material={mats[0]} position={[0, 0, 0]}>
        <planeGeometry args={[0.9, 24]} />
      </mesh>
      <mesh material={mats[1]} rotation={[0, Math.PI / 2, 0]}>
        <planeGeometry args={[0.9, 24]} />
      </mesh>
      {LANE_IDS.map((id) => (
        <mesh key={id} material={ring} position={[0, LANE_Y[id] + VOL_BASE - 0.01, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[1.4, 0.14]} />
        </mesh>
      ))}
    </group>
  );
};

export const Scene: React.FC<{ d: Dir }> = ({ d }) => {
  return (
    <>
      <Backdrop d={d} />
      <ambientLight intensity={0.12} />
      <directionalLight position={[6, 9, 8]} intensity={1.6} color="#ffe6cf" />
      <directionalLight position={[-7, 3, -6]} intensity={1.1} color="#7fb6ff" />
      <pointLight position={[HERO_X, 0.6, 1.2]} intensity={4 * d.heroGlow} distance={6} decay={2} color="#ff6a5a" />
      <Environment resolution={256} frames={1}>
        <Lightformer form="rect" intensity={2.4} color="#fff1e0" position={[0, 6, 4]} scale={[12, 2.2, 1]} />
        <Lightformer form="rect" intensity={1.4} color="#9fc8ff" position={[-7, 1, 2]} rotation={[0, Math.PI / 2, 0]} scale={[8, 1.6, 1]} />
        <Lightformer form="rect" intensity={1.1} color="#ffd2a1" position={[7, -1, 3]} rotation={[0, -Math.PI / 2, 0]} scale={[8, 1.2, 1]} />
        <Lightformer form="ring" intensity={2.2} color="#ffffff" position={[3, 3, 6]} scale={1.6} />
      </Environment>
      {LANE_IDS.map((id) => (
        <Lane key={id} id={id} d={d} />
      ))}
      <Beam d={d} />
      <Dust d={d} />
    </>
  );
};
