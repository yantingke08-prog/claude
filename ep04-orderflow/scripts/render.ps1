<#
.SYNOPSIS
  One command -> the vertical film (1080x1920, 30 fps, H.264 + AAC) with the user's voiceover.

.EXAMPLE
  powershell -ExecutionPolicy Bypass -File scripts/render.ps1
  powershell -ExecutionPolicy Bypass -File scripts/render.ps1 -Out "D:\videos\EP04.mp4"
#>
param(
  [string]$Out = "",
  [int]$Crf = 18,
  [string]$Concurrency = ""
)
$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent $PSScriptRoot
if (-not $Out) { $Out = Join-Path $Root "out/Ep04OrderFlowThreeFills.mp4" }
$vo = Join-Path $Root "public/audio/vo.mp3"
$ts = Join-Path $Root "public/audio/vo.timestamps.json"

if (-not (Test-Path $vo)) { Write-Host "[render] public/audio/vo.mp3 is missing - put the finished voiceover there." -ForegroundColor Red; exit 1 }
if ((Get-Item $vo).Length -lt 300000) { Write-Host "[render] vo.mp3 looks like the silent placeholder; the film will be silent." -ForegroundColor Yellow }
$tsOk = $false
if (Test-Path $ts) { try { $tsOk = ((Get-Content $ts -Raw -Encoding UTF8 | ConvertFrom-Json).lines.Count -gt 0) } catch {} }
if (-not $tsOk) { Write-Host "[render] vo.timestamps.json is empty: captions/shots use the even split. Run scripts/align-vo.ps1 first for exact timing." -ForegroundColor Yellow }

$dir = Split-Path -Parent $Out
if ($dir -and -not (Test-Path $dir)) { New-Item -ItemType Directory -Force $dir | Out-Null }

Push-Location $Root
try {
  if (-not (Test-Path "node_modules")) { npm ci }
  $extra = @()
  if ($Concurrency) { $extra += "--concurrency=$Concurrency" }
  npx remotion render src/index.ts Ep04OrderFlowThreeFills "$Out" --codec=h264 --crf=$Crf --audio-codec=aac @extra
  if ($LASTEXITCODE -ne 0) { throw "remotion render failed" }
  Write-Host "[render] done -> $Out" -ForegroundColor Green
} finally { Pop-Location }
