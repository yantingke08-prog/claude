<#
.SYNOPSIS
  One command -> the 16:9 film (1920x1080, 30 fps, H.264 High + AAC 44.1 kHz) with your voiceover.

.EXAMPLE
  powershell -ExecutionPolicy Bypass -File scripts/render.ps1
  powershell -ExecutionPolicy Bypass -File scripts/render.ps1 -Dir "D:\claude视频"

  Never overwrites: every render gets a new file name with the version and the time,
  e.g. D:/claude视频/LVP-孤立高低点-v4-20261124-1530.mp4 (plus -2, -3 … if that exists too).
#>
param(
  [string]$Dir = "D:/claude视频",
  [string]$Name = "LVP-孤立高低点",
  [string]$Version = "v4",
  [string]$VideoBitrate = "3M",
  [string]$Concurrency = ""
)
$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent $PSScriptRoot
$vo = Join-Path $Root "public/audio/vo.mp3"
$ts = Join-Path $Root "public/audio/vo.timestamps.json"

if (-not (Test-Path $vo)) { Write-Host "[render] public/audio/vo.mp3 is missing - put the finished voiceover there (the film would be silent)." -ForegroundColor Red; exit 1 }
# Timings must be measured on THIS vo.mp3, or picture and captions drift from the voice.
$measured = $false
if (Test-Path $ts) {
  try { $j = Get-Content $ts -Raw -Encoding UTF8 | ConvertFrom-Json; $measured = ($j.audio -and $j.audio.bytes -eq (Get-Item $vo).Length) } catch {}
}
if (-not $measured) {
  Write-Host "[render] vo.timestamps.json was not measured on this vo.mp3 - syncing now (npm run sync)..." -ForegroundColor Yellow
  Push-Location $Root
  try { npm run -s sync; if ($LASTEXITCODE -ne 0) { throw "npm run sync failed" } } finally { Pop-Location }
}

if (-not (Test-Path $Dir)) { New-Item -ItemType Directory -Force $Dir | Out-Null }
$stamp = Get-Date -Format "yyyyMMdd-HHmm"
$Out = Join-Path $Dir "$Name-$Version-$stamp.mp4"
$n = 2
while (Test-Path $Out) { $Out = Join-Path $Dir "$Name-$Version-$stamp-$n.mp4"; $n++ }
Write-Host "[render] new file (nothing is overwritten): $Out" -ForegroundColor Cyan

Push-Location $Root
try {
  if (-not (Test-Path "node_modules")) { npm ci }
  npm run -s check
  if ($LASTEXITCODE -ne 0) { throw "npm run check failed - fix the reported problems first" }
  $extra = @()
  if ($Concurrency) { $extra += "--concurrency=$Concurrency" }
  npx remotion render src/index.ts LvpSwingPoints "$Out" --codec=h264 --video-bitrate=$VideoBitrate --audio-codec=aac --audio-bitrate=192k --pixel-format=yuv420p @extra
  if ($LASTEXITCODE -ne 0) { throw "remotion render failed" }
  $cover = [System.IO.Path]::ChangeExtension($Out, ".cover.png")
  npx remotion still src/index.ts LvpSwingPoints "$cover" --frame=780
  Write-Host "[render] done -> $Out (+ cover $cover)" -ForegroundColor Green
} finally { Pop-Location }
