import { Config } from "@remotion/cli/config";

// No GPU on this machine: SwiftShader via ANGLE gives deterministic WebGL in headless Chrome.
// On a machine with a real GPU, switch to "angle" for a large speed-up.
Config.setChromiumOpenGlRenderer("swangle");
Config.setVideoImageFormat("jpeg");
Config.setJpegQuality(95);
Config.setCodec("h264");
Config.setCrf(16);
Config.setPixelFormat("yuv420p");
Config.setConcurrency(2);
Config.setDelayRenderTimeoutInMilliseconds(120000);
