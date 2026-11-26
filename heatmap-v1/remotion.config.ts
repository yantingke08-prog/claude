import { Config } from "@remotion/cli/config";

Config.setVideoImageFormat("jpeg");
Config.setJpegQuality(92);
Config.setOverwriteOutput(true);
Config.setConcurrency(null);
// WebGL: "angle" on a GPU box, "swangle" (software) elsewhere. render.ps1 passes --gl explicitly.
Config.setChromiumOpenGlRenderer("angle");
