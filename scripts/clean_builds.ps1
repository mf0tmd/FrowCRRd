[CmdletBinding()]
param(
    [switch]$All,
    [switch]$DryRun
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$repoRoot = Split-Path -Parent $PSScriptRoot
Push-Location $repoRoot
try {
    $targets = @(Get-ChildItem -Directory | Where-Object { $_.Name -like "build-*" })

    if ($All -and (Test-Path "build")) {
        $targets += Get-Item "build"
    }

    if ($targets.Count -eq 0) {
        Write-Host "No build directories found." -ForegroundColor Green
        return
    }

    Write-Host "Build directories selected:" -ForegroundColor Cyan
    $targets | ForEach-Object { Write-Host (" - " + $_.Name) }

    if ($DryRun) {
        Write-Host "Dry run enabled. Nothing was deleted." -ForegroundColor Yellow
        return
    }

    foreach ($dir in $targets) {
        Remove-Item -LiteralPath $dir.FullName -Recurse -Force
    }

    Write-Host "Cleanup completed." -ForegroundColor Green
}
finally {
    Pop-Location
}
