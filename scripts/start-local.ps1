param(
  [string]$NodePath = "node",
  [string]$DataDirectory,
  [ValidateRange(1024, 65535)][int]$Port = 3000
)

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
Set-Location $root
$node = Get-Command $NodePath -ErrorAction SilentlyContinue
if (-not $node) {
  throw "Node 24.22.0+ (24 LTS) is required. Install/provision it beforehand, or pass -NodePath with an absolute path to a portable node.exe. This script does not download tools."
}
$version = & $node.Source -p "process.versions.node"
if ($LASTEXITCODE -ne 0 -or $version -notmatch '^24\.(\d+)\.\d+$' -or [int]$Matches[1] -lt 22) {
  throw "Use Node 24.22.0+ in the Node 24 LTS line."
}
if (-not (Test-Path (Join-Path $root "node_modules\express")) -or -not (Test-Path (Join-Path $root "node_modules\sharp"))) {
  throw "Provision dependencies with npm ci before going offline. Include the native sharp package for this OS/architecture."
}
if ($DataDirectory) {
  if (-not [System.IO.Path]::IsPathRooted($DataDirectory)) { throw "DataDirectory must be absolute." }
  $env:AXES_DATA_DIR = $DataDirectory
}
$env:PORT = "$Port"
Write-Host "Starting AXES on loopback only. Open the printed /app/ address and pair with the launch code."
Write-Host "Missing Ollama/model or video tools will be shown as setup states; no automatic downloads."
& $node.Source (Join-Path $root "index.js")
exit $LASTEXITCODE
