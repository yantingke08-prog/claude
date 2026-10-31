# 04 Three.js 与着色器

## 在 Remotion 里跑 3D

用 `@remotion/three` 的 `<ThreeCanvas>`，而不是 R3F 原生的 `<Canvas>`。渲染时它会设置 `frameloop="never"`，并在每次帧号变化时调用 `advance()`，保证每帧只渲染一次，而且是同步的。

本工程把它封装成 `components/Stage.tsx`：

```tsx
<Stage fov={35} bloom={1.2} bloomThreshold={0.12}>
  <CameraRig position={[x, y, z]} target={[0, 0, 0]} roll={0} />
  {/* 场景内容 */}
</Stage>
```

`Stage` 统一提供：背景色、`dpr=1`、`flat`（关闭色调映射）、后期链（Bloom → 色差 → 颗粒 → 暗角），以及 `PostMountRender` 修复（见踩坑记录）。

### 相机：用 props 驱动，不用动画循环

```tsx
export const CameraRig = ({ position, target, roll }) => {
  const camera = useThree((s) => s.camera);
  camera.position.set(...position);
  camera.up.set(Math.sin(roll), Math.cos(roll), 0);
  camera.lookAt(...target);
  return null;
};
```

位置由场景按帧号算好再传进来，所以完全确定。

## 着色器模式

所有粒子、地球点阵、飞线都用 `THREE.ShaderMaterial`，套路一致：

```tsx
const { geometry, material } = useMemo(() => { /* 只建一次 */ }, []);
material.uniforms.uTime.value = time;     // 每帧在渲染期间更新 uniform
return <points geometry={geometry} material={material} frustumCulled={false} />;
```

要点：

- **几何体和材质只创建一次**（`useMemo`），每帧只改 uniform。顶点运算全部放在 GPU 上。
- 自定义顶点着色器会让包围球失效，粒子要加 `frustumCulled={false}`，否则会被错误裁掉。
- 发光元素统一用 `AdditiveBlending` 加 `depthWrite: false`。叠加越多越亮，正好喂给 Bloom。
- 想要"被地球挡住"的效果，就保留 `depthTest`，再用一个不透明的球体先写入深度。

### 柔光点精灵（lib/glsl.ts → SOFT_POINT_FRAG）

```glsl
float d = length(gl_PointCoord - 0.5);
if (d > 0.5) discard;
float halo = exp(-d * d * 18.0);          // 高斯光晕
float core = smoothstep(0.16, 0.0, d);    // 高亮核心
gl_FragColor = vec4(vColor * (halo + core * 1.4), (halo * 0.8 + core) * vAlpha);
```

亮核给 Bloom 提供"可以溢出"的亮度，光晕让单个点不显得生硬。

### 点大小的透视衰减

```glsl
gl_PointSize = uSize * (34.0 / -mv.z);
```

常数 34 是按 1080p 调出来的。分辨率改成 4K 时，整体乘以 2。

### 菲涅尔大气层

```glsl
// BackSide 球，半径 1.13 倍
float i = pow(clamp(0.74 - dot(normalize(vNormalV), vec3(0,0,1)), 0.0, 1.0), 4.0);
```

指数越大，光环越薄；0.74 控制光环的起始位置。

### Simplex 噪声

`lib/glsl.ts` 的 `SIMPLEX_3D` 是 Ashima 的 3D simplex 噪声，用于粒子流场和地形起伏。三个不同偏移的噪声组成一个向量场：

```glsl
vec3 flow = vec3(snoise(q), snoise(q + 17.3), snoise(q + 41.7));
```

## 后期链参数参考

| 效果 | 参数 | 作用 |
|---|---|---|
| Bloom | `mipmapBlur`, intensity 1.1–1.4, threshold 0.1–0.16 | 主要的"高级感"来源 |
| ChromaticAberration | 0.0005 | 镜头质感；超过 0.001 会让小粒子出现红蓝重影 |
| Noise | opacity 0.22, SCREEN | 胶片颗粒，顺便掩盖渐变色带 |
| Vignette | offset 0.22, darkness 0.82 | 把视线收向中心 |

`EffectComposer multisampling={0}`：软件渲染下 MSAA 很贵，而粒子和发光画面本身不需要抗锯齿。
