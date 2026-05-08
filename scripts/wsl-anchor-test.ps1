$ErrorActionPreference = "Stop"

$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$repoRootForWsl = $repoRoot.Replace("\", "/")

$distroList = & wsl -l -q 2>$null
if ($LASTEXITCODE -ne 0 -or -not $distroList) {
  Write-Host "WSL is available, but no Linux distribution is installed. Install Ubuntu or another WSL distro, then install Solana CLI and Anchor inside it." -ForegroundColor Red
  exit 1
}

$wslRepoRoot = (& wsl wslpath -a -u $repoRootForWsl).Trim()
if (-not $wslRepoRoot) {
  Write-Host "Could not convert repo path for WSL: $repoRoot" -ForegroundColor Red
  exit 1
}

& wsl sh -lc "cd ""$wslRepoRoot"" && sh scripts/wsl-anchor-test.sh"
exit $LASTEXITCODE
