param(
  [Parameter(Mandatory = $true)][string]$NodePath,
  [Parameter(Mandatory = $true)][string]$InstallDirectory,
  [ValidateRange(1024, 65535)][int]$Port = 3318
)

$ErrorActionPreference = 'Stop'
$source = Split-Path -Parent $PSScriptRoot
if (-not [IO.Path]::IsPathRooted($InstallDirectory)) { throw 'InstallDirectory must be absolute.' }
if (Test-Path -LiteralPath $InstallDirectory) { throw 'Use a new installation directory; existing installations and data are never overwritten.' }
$node = (Get-Command $NodePath -ErrorAction Stop).Source
$nodeLicense = Join-Path (Split-Path -Parent $node) 'LICENSE'
if (-not (Test-Path -LiteralPath $nodeLicense -PathType Leaf)) {
  throw 'Use a provisioned Node distribution containing its LICENSE beside node.exe.'
}
$version = & $node -p 'process.versions.node'
if ($LASTEXITCODE -ne 0 -or $version -notmatch '^24\.(\d+)\.\d+$' -or [int]$Matches[1] -lt 22) {
  throw 'Node 24.22.0+ in the Node 24 LTS line is required.'
}
foreach ($required in @('index.js', 'package.json', 'package-lock.json', 'src', 'public', 'node_modules\express', 'node_modules\sharp')) {
  if (-not (Test-Path -LiteralPath (Join-Path $source $required))) { throw "Missing provisioned application dependency: $required" }
}
$install = [IO.Path]::GetFullPath($InstallDirectory).TrimEnd('\')
if ($install.StartsWith($source.TrimEnd('\') + '\', [StringComparison]::OrdinalIgnoreCase)) {
  throw 'Installation must be outside the source worktree.'
}
New-Item -ItemType Directory -Path $install | Out-Null
foreach ($entry in @('index.js', 'package.json', 'package-lock.json', 'README.md', 'DESIGN.md', 'src', 'public', 'node_modules', 'test')) {
  Copy-Item -LiteralPath (Join-Path $source $entry) -Destination $install -Recurse
}
New-Item -ItemType Directory -Path (Join-Path $install 'scripts') | Out-Null
New-Item -ItemType Directory -Path (Join-Path $install 'docs') | Out-Null
foreach ($document in @('architecture.md', 'ownership-policy.md')) {
  Copy-Item -LiteralPath (Join-Path $source "docs\$document") -Destination (Join-Path $install 'docs')
}
Copy-Item -LiteralPath (Join-Path $PSScriptRoot 'start-local.ps1') -Destination (Join-Path $install 'scripts')
Copy-Item -LiteralPath $node -Destination (Join-Path $install 'node.exe')
Copy-Item -LiteralPath $nodeLicense -Destination (Join-Path $install 'NODE-LICENSE.txt')
$start = @'
$ErrorActionPreference = 'Stop'
$data = Join-Path $env:LOCALAPPDATA 'AXES\local-command-desk-data'
& (Join-Path $PSScriptRoot 'scripts\start-local.ps1') -NodePath (Join-Path $PSScriptRoot 'node.exe') -DataDirectory $data -Port __PORT__
exit $LASTEXITCODE
'@
Set-Content -LiteralPath (Join-Path $install 'Start-AXES.ps1') -Value $start.Replace('__PORT__', "$Port") -Encoding UTF8
Set-Content -LiteralPath (Join-Path $install 'Start-AXES.cmd') -Encoding ASCII -Value @'
@echo off
powershell -NoLogo -NoProfile -File "%~dp0Start-AXES.ps1"
'@
Push-Location $install
try {
  & (Join-Path $install 'node.exe') --test
  if ($LASTEXITCODE -ne 0) { throw 'Installed application tests failed; installation is incomplete. Original source and existing data are unchanged.' }
} finally { Pop-Location }
Write-Host "Local command desk copied and tested: $install"
Write-Host "Start: $install\Start-AXES.cmd"
Write-Host "URL: http://127.0.0.1:$Port/app/"
Write-Host 'This installs the command desk, not models, registered agent identities, or an autonomous fleet.'
