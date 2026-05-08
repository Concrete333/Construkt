$ErrorActionPreference = "Stop"

$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$repoRootForWsl = $repoRoot.Replace("\", "/")

$distroList = & wsl -l -q 2>$null
$distroExitCode = $LASTEXITCODE
$distroText = (($distroList | Out-String) -replace "`0", "").Trim().Trim([char]0xFEFF)
if ($distroExitCode -ne 0 -or -not $distroText) {
  Write-Host "WSL is available, but no Linux distribution is installed. Install Ubuntu or another WSL distro, then install Solana CLI and Anchor inside it." -ForegroundColor Red
  exit 1
}

$wslRepoRootOutput = & wsl wslpath -a -u $repoRootForWsl
$wslPathExitCode = $LASTEXITCODE
$wslRepoRoot = (($wslRepoRootOutput | Out-String) -replace "`0", "").Trim()
if ($wslPathExitCode -ne 0 -or -not $wslRepoRoot) {
  Write-Host "Could not convert repo path for WSL: $repoRoot" -ForegroundColor Red
  exit 1
}

& wsl --exec env "REPO=$wslRepoRoot" sh -lc 'cd "$REPO" && sh scripts/wsl-anchor-test.sh'
exit $LASTEXITCODE
