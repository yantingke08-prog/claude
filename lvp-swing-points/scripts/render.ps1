<#
.SYNOPSIS
  One command -> the 16:9 film (1920x1080, 30 fps, H.264 High + AAC 44.1 kHz) with your voiceover.

.EXAMPLE
  powershell -ExecutionPolicy Bypass -File scripts/render.ps1
  powershell -ExecutionPolicy Bypass -File scripts/render.ps1 -Out "D:\claude视频\LVP-孤立高低点.mp4"
#>
param(
  [string]$Out = "D:/claude视频/LVP-孤立高低点.mp4",
  [string]$VideoBitrate = "3M",
  [string]$Concurrency = ""
)
$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent $PSScriptRoot
$vo = Join-Path $Root "public/audio/vo.mp3"
$ts = Join-Path $Root "public/audio/vo.timestamps.json"

if (-not (Test-Path $vo)) { Write-Host "[render] public/audio/vo.mp3 is missing - put the finished voiceover there (the film would be silent)." -ForegroundColor Red; exit 1 }
$tsOk = $false
if (Test-Path $ts) { try { $tsOk = ((Get-Content $ts -Raw -Encoding UTF8 | ConvertFrom-Json).lines.Count -gt 0) } catch {} }
if (-not $tsOk) { Write-Host "[render] vo.timestamps.json is empty: captions/shots use the even split. Run scripts/align-vo.ps1 first for exact timing." -ForegroundColor Yellow }

$dir = Split-Path -Parent $Out
if ($dir -and -not (Test-Path $dir)) { New-Item -ItemType Directory -Force $dir | Out-Null }

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
