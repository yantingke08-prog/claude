// Dedicated entry for LVP订单流 · 三种成交 (SanzhongLVP). It bundles only this film, so the main
// Root's remote Google-font loaders never run: rendering needs no network access.
import { registerRoot } from "remotion";
import { SanzhongRoot } from "./Root";

registerRoot(SanzhongRoot);
