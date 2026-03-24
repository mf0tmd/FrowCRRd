[CmdletBinding()]
param(
    [string]$BuildDir = "build\gui-release",
    [ValidateSet("Debug", "Release", "RelWithDebInfo", "MinSizeRel")]
    [string]$BuildType = "Release",
    [switch]$Clean
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$repoRoot = Split-Path -Parent $PSScriptRoot
$buildDirAbs = Join-Path $repoRoot $BuildDir

$cmakePreferred = "C:\msys64\ucrt64\bin\cmake.exe"
$cmakeExe = if (Test-Path $cmakePreferred) { $cmakePreferred } else { "cmake" }

if ($Clean -and (Test-Path $buildDirAbs)) {
    Remove-Item -LiteralPath $buildDirAbs -Recurse -Force
}

New-Item -ItemType Directory -Path $buildDirAbs -Force | Out-Null

$configureArgs = @(
    "-S", $repoRoot,
    "-B", $buildDirAbs,
    "-G", "Ninja",
    "-DCMAKE_BUILD_TYPE=$BuildType",
    "-DBUILD_TESTING=OFF",
    "-DCMAKE_PREFIX_PATH=C:/msys64/ucrt64",
    "-DCMAKE_CXX_COMPILER=C:/msys64/ucrt64/bin/c++.exe"
)

$ninjaPreferred = "C:/msys64/ucrt64/bin/ninja.exe"
if (Test-Path $ninjaPreferred) {
    $configureArgs += "-DCMAKE_MAKE_PROGRAM=$ninjaPreferred"
}

& $cmakeExe @configureArgs
if ($LASTEXITCODE -ne 0) {
    throw "CMake configure failed for $BuildDir"
}

& $cmakeExe --build $buildDirAbs --target frowcrrd_runner -j 8
if ($LASTEXITCODE -ne 0) {
    throw "Building target frowcrrd_runner failed for $BuildDir"
}

$runnerExe = Join-Path $buildDirAbs "bin\frowcrrd_runner.exe"
if (Test-Path $runnerExe) {
    Write-Host "Runner built: $runnerExe" -ForegroundColor Green
} else {
    Write-Host "Build completed, but runner executable was not found at expected path: $runnerExe" -ForegroundColor Yellow
}
