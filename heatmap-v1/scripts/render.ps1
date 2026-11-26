<#
  Render "Heatmap: the truth behind order walls" (composition HeatmapWalls, 1080x1920, 30 fps, 70 s, no audio).

  Usage (from the heatmap-v1 folder):
    powershell -ExecutionPolicy Bypass -File scripts/render.ps1
    powershell -ExecutionPolicy Bypass -File scripts/render.ps1 -OutDir C:/renders -Gl swangle

  -Gl      angle (GPU box, default) | swangle (no GPU, slow: ~2-3 s per frame)
  -OutDir  output folder (default: .\out). Every render gets a NEW file name (version + timestamp); nothing is overwritten. File: HeatmapWalls-v1-<yyyyMMdd-HHmmss>.mp4
  -Crf     H.264 quality (default 16)
#>
param(
  [string]$OutDir = "",
  [ValidateSet("angle", "swangle", "egl", "vulkan")][string]$Gl = "angle",
  [int]$Crf = 16,
  [int]$Concurrency = 0
)
$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
Set-Location $root

if (-not (Test-Path "node_modules")) { npm install --no-audit --no-fund; if ($LASTEXITCODE) { throw "npm install failed" } }

npm run check
if ($LASTEXITCODE) { throw "npm run check failed - fix the timeline before rendering" }

if (-not $OutDir) { $OutDir = Join-Path $root "out" }
New-Item -ItemType Directory -Force -Path $OutDir | Out-Null
$stamp = Get-Date -Format "yyyyMMdd-HHmmss"
$out = Join-Path $OutDir "HeatmapWalls-v1-$stamp.mp4"

$rargs = @("remotion", "render", "src/index.ts", "HeatmapWalls", $out, "--gl=$Gl", "--codec=h264", "--crf=$Crf", "--pixel-format=yuv420p")
if ($Concurrency -gt 0) { $rargs += "--concurrency=$Concurrency" }
Write-Host "Rendering -> $out (gl=$Gl)"
& npx @rargs
if ($LASTEXITCODE) { throw "render failed" }
Write-Host "Done: $out"
