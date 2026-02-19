param(
  [Parameter(Mandatory=$true)]
  [string]$BeadId
)

if ([string]::IsNullOrWhiteSpace($BeadId)) {
  Write-Error "Missing required bead_id."
  exit 2
}

Write-Host "PAULIWHEEL preflight passed for $BeadId"
exit 0
