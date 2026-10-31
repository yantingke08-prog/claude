# 06 GSAP 桥接

GSAP 的时间线编排能力（stagger、相对位置、几十种缓动）非常强，但它默认按真实时间播放，跟 Remotion 的逐帧模型冲突。

## 解决方案：暂停 + seek

`lib/gsap.ts` → `useGsap(initial, build)`：

```ts
const ui = useGsap(
  () => ({ chars: TEXT.split("").map(() => ({ o: 0, y: 40 })), line: 0 }),
  (tl, s) => {
    tl.fromTo(s.chars, { o: 0, y: 40 }, { o: 1, y: 0, duration: 0.7, ease: "expo.out", stagger: 0.05 }, 5.3);
    tl.fromTo(s, { line: 0 }, { line: 1, duration: 1.1, ease: "expo.inOut" }, 5.1);
  },
);
// 渲染时直接读取 ui.chars[i].o、ui.line
```

原理：

1. 时间线只创建一次，`paused: true`
2. 每次渲染调用 `tl.seek(frame / fps)`，GSAP 同步算出那一刻所有值
3. 动画目标是**普通 JS 对象**，不是 DOM 节点；React 读取快照后自己渲染

这样 GSAP 的结果就是帧号的纯函数，可以安全地并行渲染。

## 三条铁律

1. **只用 `fromTo()`**。`to()` 会在第一次播放时记录"当前值"作为起点，乱序 seek 时起点会错。
2. **不要让 GSAP 直接改 DOM**。改了 DOM，React 下一次渲染就会把它覆盖掉。
3. **快照不能用 `structuredClone`**。GSAP 会往目标对象上挂一个带循环引用和函数的 `_gsap` 缓存，必须手写克隆并跳过它（已在 `snapshot()` 里处理）。

## 单独使用 GSAP 缓动

```ts
import { ease } from "../lib/gsap";
interpolate(frame, [0, 60], [0, 1], { easing: ease("expo.out"), extrapolateRight: "clamp" });
ease("elastic.out(1, 0.5)")(t);
ease("back.out(2.5)")(t);
```

## 缓动选择经验

| 场景 | 缓动 | 观感 |
|---|---|---|
| 元素入场（位移/透明度） | `expo.out` | 快速到位后柔和停住，最"高级"的默认选择 |
| 镜头推拉 | `expo.out` / `power2.out` | 有惯性 |
| 擦除、遮罩、线条展开 | `expo.inOut` | 两头慢中间快，干净利落 |
| 文字逐字弹出 | `back.out(1.6)` | 轻微过冲，有弹性 |
| 数据柱、落点尖刺 | `elastic.out(1, 0.5)` | 弹簧感，适合"数据到达" |
| 出场、加速离开 | `power3.in` | 越走越快，配合模糊 |
| 汇聚前的蓄力 | `power1.in` | 慢慢启动 |
| 解码文字 | `none` | 匀速逐字揭示 |

**避免** `linear` 做位移。匀速运动是"廉价感"的头号来源。

## stagger 节奏

- 逐字：0.04–0.07 秒/字
- 卡片：15 帧（0.5 秒）一张，并且对应配乐里的 tick 音
- 数值面板：0.12 秒一项
