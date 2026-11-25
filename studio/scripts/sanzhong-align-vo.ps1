<#
.SYNOPSIS
  Times the user's recorded voice-over for 三种成交 (SanzhongLVP) against the script.
  public/sanzhong/audio/vo.mp3 + src/sanzhong/script.ts  ->  public/sanzhong/audio/vo.timestamps.json

.EXAMPLE
  npm run sz:align
  powershell -ExecutionPolicy Bypass -File scripts/sanzhong-align-vo.ps1 -Engine whisperx -Model large-v3

  Needs Python with stable-ts (preferred) or whisperx, plus ffmpeg on PATH. Nothing is synthesised:
  it only times the existing recording. Afterwards it runs `npm run sz:check`.
#>
param(
  [ValidateSet("auto", "stable-ts", "whisperx")] [string]$Engine = "auto",
  [string]$Model = "medium",
  [string]$Device = "",
  [string]$Audio = "",
  [string]$Out = ""
)
$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent $PSScriptRoot
if (-not $Audio) { $Audio = Join-Path $Root "public/sanzhong/audio/vo.mp3" }
if (-not $Out) { $Out = Join-Path $Root "public/sanzhong/audio/vo.timestamps.json" }
$Units = Join-Path $Root "out/sanzhong/units.json"

function Fail($msg) { Write-Host "`n[sz-align] $msg" -ForegroundColor Red; exit 1 }

if (-not (Test-Path $Audio)) { Fail "Voice-over not found: $Audio`n  Put the recording there (mp3), then run this again." }
if ((Get-Item $Audio).Length -lt 300000) {
  Write-Host "[sz-align] $Audio is very small - is it still the silent placeholder? Alignment on silence gives garbage." -ForegroundColor Yellow
}
if (-not (Get-Command ffmpeg -ErrorAction SilentlyContinue)) {
  Fail "ffmpeg is not on PATH (whisper needs it).`n  Install: winget install Gyan.FFmpeg   (then open a new terminal)"
}

New-Item -ItemType Directory -Force (Split-Path $Units) | Out-Null
Push-Location $Root
try { node --experimental-strip-types --no-warnings scripts/sanzhong-units.mts $Units } finally { Pop-Location }
if ($LASTEXITCODE -ne 0) { Fail "Could not export the caption units." }

$candidates = @()
if ($env:VIRTUAL_ENV) { $candidates += (Join-Path $env:VIRTUAL_ENV "Scripts/python.exe") }
foreach ($c in @("python", "py", "python3")) { if (Get-Command $c -ErrorAction SilentlyContinue) { $candidates += $c } }
if (-not $candidates) { Fail "No Python found. Install Python 3.10+, then: pip install -U stable-ts" }

$engines = if ($Engine -eq "auto") { @("stable-ts", "whisperx") } else { @($Engine) }
$module = @{ "stable-ts" = "stable_whisper"; "whisperx" = "whisperx" }
$py = $null; $use = $null; $pyArgs = @()
foreach ($e in $engines) {
  foreach ($c in $candidates) {
    $args0 = if ($c -eq "py") { @("-3") } else { @() }
    & $c @args0 -c "import $($module[$e])" 2>$null
    if ($LASTEXITCODE -eq 0) { $py = $c; $pyArgs = $args0; $use = $e; break }
  }
  if ($use) { break }
}
if (-not $use) {
  Fail ("No aligner installed for: " + ($candidates -join ", ") + "`n  pip install -U stable-ts   (or: pip install -U whisperx)`n  CPU works, just slower.")
}

Write-Host "[sz-align] python=$py engine=$use model=$Model" -ForegroundColor Cyan
$argv = @("$PSScriptRoot/sanzhong_align_vo.py", "--units", $Units, "--audio", $Audio, "--out", $Out, "--engine", $use, "--model", $Model)
if ($Device) { $argv += @("--device", $Device) }
& $py @pyArgs @argv
if ($LASTEXITCODE -ne 0) { Fail "Alignment failed (see above). Try -Engine whisperx, or -Model small." }

Write-Host "[sz-align] wrote $Out" -ForegroundColor Green
Push-Location $Root
try { npm run -s sz:check } finally { Pop-Location }
