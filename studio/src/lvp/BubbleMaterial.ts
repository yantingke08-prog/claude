import * as THREE from "three";

export type BubbleLook = "gold" | "glass" | "pearl";

/**
 * Studio lighting for small spheres, evaluated analytically in view space so the highlights
 * stay composed however the camera moves: one big soft key upper-left, a long top strip, a
 * cool kicker behind-right and a warm floor bounce. Round lights give round, clean speculars
 * (the PMREM room's rectangular panels read as boxy reflections on a sphere).
 */
const STUDIO = /* glsl */ `
const vec3 KEY = normalize(vec3(-0.55, 0.62, 0.56));
const vec3 KICK = normalize(vec3(0.85, 0.15, -0.5));
vec3 studio(vec3 d){
  vec3 c = mix(vec3(0.003, 0.004, 0.010), vec3(0.018, 0.022, 0.040), smoothstep(-0.7, 0.9, d.y));
  float k = max(dot(d, KEY), 0.0);
  c += vec3(1.0, 0.94, 0.84) * (smoothstep(0.93, 0.975, k) * 3.2 + pow(k, 5.0) * 0.22);
  c += vec3(1.0, 0.97, 0.92) * smoothstep(0.80, 0.86, d.y) * smoothstep(0.9, 0.3, abs(d.x)) * 1.3;
  float r = max(dot(d, KICK), 0.0);
  c += vec3(0.62, 0.76, 1.0) * smoothstep(0.90, 0.97, r) * 1.6;
  c += vec3(1.0, 0.68, 0.32) * 0.10 * smoothstep(-0.1, -0.8, d.y);
  return c;
}
`;

const vertex = /* glsl */ `
attribute float aMetal;
varying vec3 vN;
varying vec3 vV;
varying vec3 vC;
varying float vMetal;
void main(){
  vec4 mv = modelViewMatrix * instanceMatrix * vec4(position, 1.0);
  vN = normalize(normalMatrix * mat3(instanceMatrix) * normal);
  vV = normalize(-mv.xyz);
  #ifdef USE_INSTANCING_COLOR
    vC = instanceColor;
  #else
    vC = vec3(1.0);
  #endif
  vMetal = aMetal;
  gl_Position = projectionMatrix * mv;
}
`;

const fragment = (look: BubbleLook) => /* glsl */ `
uniform float uOpacity;
uniform float uSpin;
varying vec3 vN;
varying vec3 vV;
varying vec3 vC;
varying float vMetal;
${STUDIO}
const vec3 GOLD_F0 = vec3(1.0, 0.76, 0.33);

vec3 rotY(vec3 v, float a){ float c = cos(a), s = sin(a); return vec3(c * v.x + s * v.z, v.y, -s * v.x + c * v.z); }

/** Polished gold: what every bubble becomes once it lands in the mark. */
vec3 goldShade(vec3 N, vec3 V, vec3 tint){
  vec3 R = rotY(reflect(-V, N), uSpin);
  float NoV = max(dot(N, V), 0.0);
  vec3 F = tint + (1.0 - tint) * pow(1.0 - NoV, 5.0);
  vec3 c = studio(R) * F;
  c += studio(R) * 0.04 * pow(1.0 - NoV, 3.0); // thin clear-coat
  return c;
}

void main(){
  vec3 N = normalize(vN);
  vec3 V = normalize(vV);
  float NoV = clamp(dot(N, V), 0.0, 1.0);
  vec3 R = rotY(reflect(-V, N), uSpin);
  float fres = 0.04 + 0.96 * pow(1.0 - NoV, 5.0);
  vec3 col;
  float alpha = 1.0;

  #if LOOK == 0
    // Liquid metal, anodised in the trade's side colour, then pure gold.
    col = goldShade(N, V, mix(vC * 0.95 + 0.05, GOLD_F0, 0.25));
  #elif LOOK == 1
    // Crystal: a clear shell that mirrors the studio at grazing angles, lit from inside by
    // the trade - the deeper the view through it, the hotter the core.
    vec3 refl = studio(R) * fres * 1.4;
    float core = pow(NoV, 2.2);
    vec3 inner = vC * (0.05 + core * 0.75) + mix(vC, vec3(1.0), 0.25) * pow(NoV, 12.0) * 1.1;
    // the key focused through the ball: a caustic crescent on the far, lower side
    float caustic = smoothstep(0.55, 0.95, dot(N, -KEY * vec3(1.0, 1.0, -1.0))) * 0.8;
    inner += mix(vC, vec3(1.0), 0.35) * caustic;
    float rim = smoothstep(0.35, 0.0, NoV) * 0.55;
    col = inner + refl + vC * rim * 0.4;
    alpha = clamp(0.18 + core * 0.4 + fres + rim, 0.0, 1.0);
  #else
    // Satin pearl: soft wrapped light, a broad sheen and light glowing through the edge.
    vec3 L = KEY;
    float wrap = clamp((dot(N, L) + 0.45) / 1.45, 0.0, 1.0);
    vec3 H = normalize(L + V);
    float spec = pow(max(dot(N, H), 0.0), 46.0) * 0.55 + pow(max(dot(N, H), 0.0), 8.0) * 0.08;
    float sheen = pow(1.0 - NoV, 2.5);
    float through = pow(clamp(dot(V, -L) * 0.5 + 0.5, 0.0, 1.0), 2.0) * sheen;
    col = vC * (0.06 + wrap * 0.85) + vec3(1.0, 0.97, 0.92) * spec + mix(vC, vec3(1.0), 0.5) * sheen * 0.45 + vC * through * 0.8;
  #endif

  col = mix(col, goldShade(N, V, GOLD_F0), vMetal);
  alpha = mix(alpha, 1.0, vMetal);
  gl_FragColor = vec4(col, alpha * uOpacity);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}
`;

const LOOK_ID: Record<BubbleLook, number> = { gold: 0, glass: 1, pearl: 2 };

/** Shader for instanced bubble spheres. Needs a per-instance `aMetal` (0 = trade colour, 1 = gold). */
export const bubbleMaterial = (look: BubbleLook) =>
  new THREE.ShaderMaterial({
    vertexShader: vertex,
    fragmentShader: fragment(look),
    defines: { LOOK: LOOK_ID[look] },
    uniforms: { uOpacity: { value: 1 }, uSpin: { value: 0 } },
    transparent: look === "glass",
    depthWrite: true,
  });
