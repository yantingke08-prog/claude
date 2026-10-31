# 03 Remotion 核心原则

## 1. 画面是帧号的纯函数

Remotion 会开多个浏览器标签页，**并行、乱序**地渲染帧。所以：

| 禁止 | 改用 |
|---|---|
| `Math.random()` | 带种子的 PRNG：`lib/rng.ts` 的 `mulberry32(seed)` |
| `Date.now()`、`performance.now()` 驱动动画 | `useCurrentFrame() / fps` |
| R3F 的 `useFrame` + `clock.elapsedTime` | 在组件渲染时把帧号写进 uniform |
| CSS transition / animation | 用 `interpolate()` 或 GSAP 按帧 seek 计算值 |
| `requestAnimationFrame` 动画循环 | 同上 |

例外：后期颗粒噪点（Noise effect）每帧随机也无所谓，观感上本来就是随机的。

## 2. 异步资源一律 delayRender

字体、图片、要先测量再采样的东西，都要先"挂起"截图：

```ts
const [handle] = useState(() => delayRender("Sampling particle targets"));
useEffect(() => {
  document.fonts.load(font).then(() => {
    setPoints(sample());
    continueRender(handle);
  });
}, []);
```

本工程的 `useSampledPoints()` 就是这个模式：先等字体加载完，再把文字画到 canvas 上采样粒子位置。

## 3. 合成结构

- 每个场景是一个独立组件，从 0 帧开始计时（局部帧）。
- `Root.tsx` 同时注册**总片**和**每个场景**，开发时可以单独预览。
- 总片用 `TransitionSeries` 串起来，转场时长统一取 `timeline.json` 的 `transition`。
- 全片级元素（HUD 边框、音频）放在 `TransitionSeries` 外面，覆盖整片时长。

## 4. 时间换算

```ts
const frame = useCurrentFrame();
const { fps } = useVideoConfig();
const t = frame / fps;               // 秒，给着色器当 uTime
interpolate(frame, [12, 150], [0, 1], {
  extrapolateLeft: "clamp", extrapolateRight: "clamp",
  easing: ease("power1.in"),        // 可直接用 GSAP 的缓动
});
```

**一定要加 clamp**。不加的话，数值会在区间外继续线性外推，这是最常见的 bug。

## 5. 转场重叠

`TransitionSeries` 的转场会让前后两个场景**重叠** `transition` 帧，所以：

```
全片时长 = Σ 场景时长 − 转场时长 × (场景数 − 1)
```

重叠期间两个 WebGL 画布同时存在，软件渲染下这段会更慢，属于正常现象。

## 6. 渲染配置（remotion.config.ts）

```ts
Config.setChromiumOpenGlRenderer("swangle"); // 无 GPU 时用软件 WebGL
Config.setVideoImageFormat("jpeg");          // 中间帧用 jpeg，比 png 快很多
Config.setJpegQuality(95);
Config.setCrf(16);                           // 高质量母版；发布版再压
Config.setPixelFormat("yuv420p");            // 兼容所有播放器
Config.setConcurrency(2);
Config.setDelayRenderTimeoutInMilliseconds(120000);
```
