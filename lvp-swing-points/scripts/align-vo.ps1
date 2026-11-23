<#
.SYNOPSIS
  Chinese forced alignment of the user's voiceover against the script.
  public/audio/vo.mp3 + src/script.ts  ->  public/audio/vo.timestamps.json

.EXAMPLE
  powershell -ExecutionPolicy Bypass -File scripts/align-vo.ps1
  powershell -ExecutionPolicy Bypass -File scripts/align-vo.ps1 -Engine whisperx -Model large-v3

  Detects a Python with stable-ts (preferred) or whisperx, and ffmpeg. Nothing is synthesised:
  it only times the existing voiceover. Afterwards run `npm run check` to verify.
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
if (-not $Audio) { $Audio = Join-Path $Root "public/audio/vo.mp3" }
if (-not $Out) { $Out = Join-Path $Root "public/audio/vo.timestamps.json" }

function Fail($msg) { Write-Host "`n[align-vo] $msg" -ForegroundColor Red; exit 1 }

if (-not (Test-Path $Audio)) { Fail "Voiceover not found: $Audio`n  Put your finished voiceover there (mp3), then run this again." }
if (-not (Get-Command ffmpeg -ErrorAction SilentlyContinue)) {
  Fail "ffmpeg is not on PATH (whisper needs it to decode audio).`n  Install: winget install Gyan.FFmpeg   (then open a new terminal)"
}

# find a python that can import an aligner
$candidates = @()
if ($env:VIRTUAL_ENV) { $candidates += (Join-Path $env:VIRTUAL_ENV "Scripts/python.exe") }
foreach ($c in @("python", "py", "python3")) { if (Get-Command $c -ErrorAction SilentlyContinue) { $candidates += $c } }
if (-not $candidates) { Fail "No Python found. Install Python 3.10+ (winget install Python.Python.3.12), then: pip install -U stable-ts" }

$engines = if ($Engine -eq "auto") { @("stable-ts", "whisperx") } else { @($Engine) }
$module = @{ "stable-ts" = "stable_whisper"; "whisperx" = "whisperx" }
$py = $null; $use = $null
foreach ($e in $engines) {
  foreach ($c in $candidates) {
    $args0 = if ($c -eq "py") { @("-3") } else { @() }
    & $c @args0 -c "import $($module[$e])" 2>$null
    if ($LASTEXITCODE -eq 0) { $py = $c; $pyArgs = $args0; $use = $e; break }
  }
  if ($use) { break }
}
if (-not $use) {
  Fail ("No aligner installed for: " + ($candidates -join ", ") + "`n" +
    "  Option A (recommended): pip install -U stable-ts`n" +
    "  Option B:               pip install -U whisperx`n" +
    "  GPU is optional; CPU works, just slower (medium model ~ several minutes for 3 min of audio).")
}

Write-Host "[align-vo] python=$py engine=$use model=$Model" -ForegroundColor Cyan
$argv = @("$PSScriptRoot/align_vo.py", "--root", $Root, "--audio", $Audio, "--out", $Out, "--engine", $use, "--model", $Model)
if ($Device) { $argv += @("--device", $Device) }
& $py @pyArgs @argv
if ($LASTEXITCODE -ne 0) { Fail "Alignment failed (see the error above). Try -Engine whisperx, or a smaller -Model small." }

Write-Host "[align-vo] wrote $Out" -ForegroundColor Green
Push-Location $Root
try { npm run -s check } finally { Pop-Location }
