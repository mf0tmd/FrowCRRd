[CmdletBinding()]
param(
    [switch]$SkipDebug,
    [switch]$SkipUBSan,
    [switch]$SkipASan,
    [string]$BuildRoot = "build\massive"
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$repoRoot = Split-Path -Parent $PSScriptRoot
Push-Location $repoRoot
try {
    $buildRootAbs = Join-Path $repoRoot $BuildRoot
    $releaseDir = Join-Path $BuildRoot "release"
    $debugDir = Join-Path $BuildRoot "debug"
    $ubsanDir = Join-Path $BuildRoot "ubsan"
    $asanDir = Join-Path $BuildRoot "asan"

    function Invoke-Step {
        param(
            [Parameter(Mandatory = $true)][string]$Name,
            [Parameter(Mandatory = $true)][scriptblock]$Action
        )
        Write-Host ""
        Write-Host "=== $Name ===" -ForegroundColor Cyan
        & $Action
    }

    function Run-CMakeConfigure {
        param(
            [Parameter(Mandatory = $true)][string]$BuildDir,
            [Parameter(Mandatory = $true)][string]$BuildType,
            [string[]]$ExtraArgs = @()
        )
        $args = @(
            "-S", ".",
            "-B", $BuildDir,
            "-G", "Ninja",
            "-DCMAKE_BUILD_TYPE=$BuildType",
            "-DBUILD_TESTING=ON",
            "-DFROWCRRD_WARNINGS_AS_ERRORS=ON"
        ) + $ExtraArgs
        & cmake @args
        if ($LASTEXITCODE -ne 0) { throw "CMake configure failed for $BuildDir" }
    }

    function Run-CMakeTarget {
        param(
            [Parameter(Mandatory = $true)][string]$BuildDir,
            [Parameter(Mandatory = $true)][string]$Target
        )
        & cmake --build $BuildDir --target $Target
        if ($LASTEXITCODE -ne 0) { throw "CMake target '$Target' failed for $BuildDir" }
    }

    function Try-InstallSanitizerRuntime {
        $pacman = "C:\msys64\usr\bin\pacman.exe"
        if (-not (Test-Path $pacman)) {
            Write-Host "MSYS2 pacman not found, skipping sanitizer runtime install." -ForegroundColor Yellow
            return
        }

        & $pacman -Sy --noconfirm --needed `
            mingw-w64-ucrt-x86_64-compiler-rt `
            mingw-w64-ucrt-x86_64-compiler-rt-20
        if ($LASTEXITCODE -ne 0) {
            Write-Host "Sanitizer runtime install returned non-zero code; continuing with fallback modes." -ForegroundColor Yellow
        }
    }

    function Test-ASanSupport {
        $clangxx = "C:\msys64\ucrt64\bin\clang++.exe"
        if (-not (Test-Path $clangxx)) { return $false }

        $probeSrc = Join-Path $env:TEMP "frowcrrd_asan_probe.cpp"
        $probeExe = Join-Path $env:TEMP "frowcrrd_asan_probe.exe"
        Set-Content -Path $probeSrc -Value "int main(){int *p=new int[1]; p[1]=7; return 0;}" -Encoding ASCII

        $prevErrorActionPreference = $ErrorActionPreference
        $ErrorActionPreference = "Continue"
        try {
            & $clangxx -std=c++20 -fsanitize=address $probeSrc -o $probeExe 1>$null 2>$null
            return ($LASTEXITCODE -eq 0)
        }
        finally {
            $ErrorActionPreference = $prevErrorActionPreference
        }
    }

    Invoke-Step "Preparing Build Layout" {
        New-Item -ItemType Directory -Path $buildRootAbs -Force | Out-Null
    }

    Invoke-Step "Preparing Sanitizer Tooling" {
        Try-InstallSanitizerRuntime
    }

    $asanSupported = $false
    if (-not $SkipASan) {
        Invoke-Step "Probing ASan Availability" {
            $script:asanSupported = Test-ASanSupport
            if ($script:asanSupported) {
                Write-Host "ASan is available in current toolchain." -ForegroundColor Green
            } else {
                Write-Host "ASan is unavailable in current UCRT toolchain; UBSan trap mode will be used." -ForegroundColor Yellow
            }
        }
    }

    Invoke-Step "Release Massive Audit" {
        Run-CMakeConfigure -BuildDir $releaseDir -BuildType "Release"
        Run-CMakeTarget -BuildDir $releaseDir -Target "massive_audit"
    }

    if (-not $SkipDebug) {
        Invoke-Step "Debug Massive Audit (Quick)" {
            Run-CMakeConfigure -BuildDir $debugDir -BuildType "Debug"
            Run-CMakeTarget -BuildDir $debugDir -Target "massive_audit_quick"
        }
    }

    if (-not $SkipUBSan) {
        Invoke-Step "UBSan Trap Massive Audit" {
            Run-CMakeConfigure -BuildDir $ubsanDir -BuildType "RelWithDebInfo" -ExtraArgs @(
                "-DCMAKE_CXX_FLAGS=-fsanitize=undefined -fsanitize-undefined-trap-on-error -fno-sanitize-recover=all"
            )
            Run-CMakeTarget -BuildDir $ubsanDir -Target "massive_audit"
        }
    }

    if ($asanSupported) {
        Invoke-Step "ASan Massive Audit" {
            Run-CMakeConfigure -BuildDir $asanDir -BuildType "RelWithDebInfo" -ExtraArgs @(
                "-DCMAKE_C_COMPILER=C:/msys64/ucrt64/bin/clang.exe",
                "-DCMAKE_CXX_COMPILER=C:/msys64/ucrt64/bin/clang++.exe",
                "-DCMAKE_CXX_FLAGS=-fsanitize=address -fno-omit-frame-pointer -O1 -g",
                "-DCMAKE_EXE_LINKER_FLAGS=-fsanitize=address"
            )
            Run-CMakeTarget -BuildDir $asanDir -Target "massive_audit"
        }
    }

    Write-Host ""
    Write-Host "Massive audit completed successfully." -ForegroundColor Green
    Write-Host "One-click command: powershell -ExecutionPolicy Bypass -File .\\scripts\\run_massive_audit.ps1"
    Write-Host "Build artifacts root: $BuildRoot"
}
finally {
    Pop-Location
}
