param(
  [string]$NodePath,
  [ValidateRange(1024, 65535)][int]$Port = 3317,
  [string]$DesktopRoot = [Environment]::GetFolderPath("Desktop"),
  [string]$DataDirectory
)

$ErrorActionPreference = "Stop"
$repoRoot = Split-Path -Parent $PSScriptRoot
if (-not $DesktopRoot) { throw "Desktop path is unavailable for this user profile." }
if (-not (Test-Path $DesktopRoot)) { throw "Desktop path not found: $DesktopRoot" }

function Resolve-NodePath([string]$requested) {
  if ($requested) {
    $candidate = if ([System.IO.Path]::IsPathRooted($requested)) { $requested } else { (Resolve-Path $requested).Path }
    if (-not (Test-Path $candidate)) { throw "Node path not found: $candidate" }
    return (Resolve-Path $candidate).Path
  }

  $node = Get-Command node -ErrorAction SilentlyContinue
  if ($node) {
    $version = & $node.Source -p "process.versions.node"
    if ($LASTEXITCODE -eq 0 -and $version -match '^24\.(\d+)\.\d+$' -and [int]$Matches[1] -ge 22) {
      return $node.Source
    }
  }

  $portable = Get-ChildItem "$HOME\.copilot\session-state\*\files\node-v24.22.0.exe" -ErrorAction SilentlyContinue |
    Sort-Object LastWriteTimeUtc -Descending |
    Select-Object -First 1
  if ($portable) { return $portable.FullName }

  throw "Node 24.22.0+ (Node 24 LTS) is required. Install/provision it first, or pass -NodePath."
}

$nodeExe = Resolve-NodePath $NodePath
$targetDir = Join-Path $DesktopRoot "AXES Prototype"
if (-not (Test-Path $targetDir)) { New-Item -ItemType Directory -Path $targetDir | Out-Null }
$dataDir = if ($DataDirectory) { $DataDirectory } else { Join-Path $targetDir "data" }
if (-not [System.IO.Path]::IsPathRooted($dataDir)) { throw "DataDirectory must be absolute." }
if (-not (Test-Path $dataDir)) { New-Item -ItemType Directory -Path $dataDir | Out-Null }

$launcherPs1 = Join-Path $targetDir "Start-AXES-Prototype.ps1"
$launcherCmd = Join-Path $targetDir "Start-AXES-Prototype.cmd"
$readmeTxt = Join-Path $targetDir "README.txt"

$ps1Body = @"
`$ErrorActionPreference = 'Stop'
Set-Location '$repoRoot'
& '$repoRoot\scripts\start-local.ps1' -NodePath '$nodeExe' -DataDirectory '$dataDir' -Port $Port
"@
Set-Content -Path $launcherPs1 -Value $ps1Body -Encoding UTF8

$cmdBody = @"
@echo off
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0Start-AXES-Prototype.ps1"
"@
Set-Content -Path $launcherCmd -Value $cmdBody -Encoding ASCII

$readmeBody = @"
AXES desktop prototype
======================

Open this file's folder and run Start-AXES-Prototype.cmd.

Then open:
http://127.0.0.1:$Port/app/

Copy the one-time pairing code from the launch terminal. Do not share it in chat.

This launcher does not install tools or download models.
"@
Set-Content -Path $readmeTxt -Value $readmeBody -Encoding UTF8

Write-Host "Desktop prototype files created:"
Write-Host "  $launcherCmd"
Write-Host "  $launcherPs1"
Write-Host "  $readmeTxt"
Write-Host "Data directory:"
Write-Host "  $dataDir"
