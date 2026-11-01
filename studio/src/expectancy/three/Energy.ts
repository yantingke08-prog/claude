// Energy glass: the material for the P&L columns. Instead of lit plastic (flat colour +
// shading), each column is a translucent, self-lit volume in the film's star-glow language:
//
//   - neon edges in the column's own colour with a wide halo - the brightest part
//   - a faint body that brightens from the plate towards the tip, plus a fresnel rim
//   - a glowing cap on the tip face, energy bands flowing from the plate outwards
//   - a few twinkling sparks inside, like the starfield behind
//
// Additive, but behind a depth prepass: only the nearest surface of a block of columns is
// lit, otherwise ten rows seen side-on add up to a white slab.
// Geometry must be a unit box with y in 0..1 (see unitColumn), scaled per instance or mesh.
import * as THREE from "three";

export const unitColumn = () => {
  const g = new THREE.BoxGeometry(1, 1, 1);
  g.translate(0, 0.5, 0);
  return g;
};

const vertex = /* glsl */ `
varying vec3 vLocal;
varying vec3 vScale;
varying vec3 vN;
varying vec3 vWorld;
void main(){
  mat4 m = modelMatrix;
#ifdef USE_INSTANCING
  m = modelMatrix * instanceMatrix;
#endif
  vScale = vec3(length(m[0].xyz), length(m[1].xyz), length(m[2].xyz));
  vLocal = position;
  vN = normal;
  vec4 w = m * vec4(position, 1.0);
  vWorld = w.xyz;
  gl_Position = projectionMatrix * viewMatrix * w;
}
`;

const fragment = /* glsl */ `
uniform vec3 uColor;
uniform float uTipUp;
uniform float uOpacity;
uniform float uTime;
varying vec3 vLocal;
varying vec3 vScale;
varying vec3 vN;
varying vec3 vWorld;
float hash(vec3 p){ return fract(sin(dot(p, vec3(12.9898, 78.233, 37.719))) * 43758.5453); }
void main(){
  vec3 an = abs(vN);
  // distance to the nearest box edge on this face, in world units
  vec3 d = (vec3(0.5) - abs(vLocal - vec3(0.0, 0.5, 0.0))) * vScale + an * 1e3;
  float de = min(min(d.x, d.y), d.z);
  float edge = exp(-de / 0.011);
  float halo = exp(-de / 0.07);

  float y = mix(1.0 - vLocal.y, vLocal.y, uTipUp); // 0 at the plate, 1 at the tip
  float cap = an.y * step(0.5, y);
  vec3 vd = normalize(cameraPosition - vWorld);
  float fres = pow(1.0 - abs(dot(normalize(vN), vd)), 2.0);
  float flow = pow(0.5 + 0.5 * sin(y * vScale.y * 14.0 - uTime * 2.5), 24.0) * (1.0 - cap);
  vec3 cell = floor(vWorld * 22.0);
  float h = hash(cell);
  float spark = step(0.992, h) * pow(0.5 + 0.5 * sin(uTime * 2.0 + h * 80.0), 4.0) * (1.0 - cap);

  // edges glow in the material's own colour (a deep neon, not white); only the very
  // core of the line lifts slightly towards white
  vec3 neon = uColor * 1.15;
  vec3 col = uColor * (0.07 + 0.1 * y + 0.08 * fres);
  col += uColor * flow * 0.12;
  col += neon * (edge * 0.7 + halo * 0.22) * (0.35 + 0.65 * y);
  col += vec3(1.0) * exp(-de / 0.004) * 0.08 * (0.35 + 0.65 * y);
  col += neon * cap * (0.26 + edge * 0.3);
  col += mix(uColor, vec3(1.0), 0.4) * spark * 0.3;
  gl_FragColor = vec4(col, uOpacity);
}
`;

export const energyMaterial = (color: string, tipUp: boolean) =>
  new THREE.ShaderMaterial({
    vertexShader: vertex,
    fragmentShader: fragment,
    transparent: true,
    depthWrite: false,
    depthFunc: THREE.LessEqualDepth,
    blending: THREE.AdditiveBlending,
    uniforms: {
      uColor: { value: new THREE.Color(color) },
      uTipUp: { value: tipUp ? 1 : 0 },
      uOpacity: { value: 1 },
      uTime: { value: 0 },
    },
  });

export const setEnergy = (m: THREE.Material, opacity: number, time: number) => {
  const s = m as THREE.ShaderMaterial;
  s.uniforms.uOpacity.value = opacity;
  s.uniforms.uTime.value = time;
};

// pushed back a hair so the glowing pass never z-fights with its own twin
const DEPTH_ONLY = new THREE.MeshBasicMaterial({ colorWrite: false, polygonOffset: true, polygonOffsetFactor: 1, polygonOffsetUnits: 1 });

/** Depth-only twin drawn in the opaque pass, sharing the instances of the glowing mesh. */
export const depthTwin = (mesh: THREE.InstancedMesh) => {
  const twin = new THREE.InstancedMesh(mesh.geometry, DEPTH_ONLY, mesh.instanceMatrix.count);
  twin.instanceMatrix = mesh.instanceMatrix;
  twin.frustumCulled = false;
  return twin;
};
