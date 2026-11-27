import { Config } from "@remotion/cli/config";

// 交付参数：H.264 · CRF 18 · preset slow · 1920×1080 · 30fps（见 README 的渲染命令）
Config.setVideoImageFormat("png");
Config.setCodec("h264");
Config.setCrf(18);
Config.setX264Preset("slow");
Config.setPixelFormat("yuv420p");
Config.setOverwriteOutput(true);
