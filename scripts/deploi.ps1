param(
  [Parameter(Position = 0)]
  [string]$Message = ""
)

$ErrorActionPreference = "Stop"

$insideRepo = git rev-parse --is-inside-work-tree 2>$null
if ($insideRepo -ne "true") {
  throw "This command must be run inside a git repository."
}

git add -A

$status = git status --porcelain
if ([string]::IsNullOrWhiteSpace(($status -join ""))) {
  Write-Host "No changes to deploy."
  exit 0
}

if ([string]::IsNullOrWhiteSpace($Message)) {
  $Message = "Deploy update $(Get-Date -Format 'yyyy-MM-dd HH:mm')"
}

git commit -m $Message
git push

