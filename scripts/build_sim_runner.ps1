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

function Resolve-Objdump {
    $candidates = @(
        "C:\msys64\ucrt64\bin\objdump.exe",
        "objdump"
    )

    foreach ($candidate in $candidates) {
        if ($candidate.Contains("\")) {
            if (Test-Path $candidate) {
                return $candidate
            }
            continue
        }

        $command = Get-Command $candidate -ErrorAction SilentlyContinue
        if ($command) {
            return $command.Source
        }
    }

    return $null
}

function Copy-RunnerRuntimeDependencies {
    param(
        [Parameter(Mandatory = $true)][string]$RunnerExePath
    )

    if (-not (Test-Path $RunnerExePath)) {
        return
    }

    $msysBin = "C:\msys64\ucrt64\bin"
    if (-not (Test-Path $msysBin)) {
        Write-Host "MSYS2 UCRT64 bin not found, runtime dependency copy skipped." -ForegroundColor Yellow
        return
    }

    $objdumpExe = Resolve-Objdump
    if (-not $objdumpExe) {
        Write-Host "objdump was not found, runtime dependency copy skipped." -ForegroundColor Yellow
        return
    }

    $objdumpOutput = & $objdumpExe -p $RunnerExePath 2>$null
    if ($LASTEXITCODE -ne 0 -or -not $objdumpOutput) {
        Write-Host "Unable to inspect runner dependencies, runtime dependency copy skipped." -ForegroundColor Yellow
        return
    }

    $systemDlls = @{
        "ADVAPI32.DLL" = $true
        "COMCTL32.DLL" = $true
        "COMDLG32.DLL" = $true
        "GDI32.DLL" = $true
        "IMM32.DLL" = $true
        "KERNEL32.DLL" = $true
        "MSVCRT.DLL" = $true
        "NTDLL.DLL" = $true
        "OLE32.DLL" = $true
        "OLEAUT32.DLL" = $true
        "RPCRT4.DLL" = $true
        "SHELL32.DLL" = $true
        "SHLWAPI.DLL" = $true
        "USER32.DLL" = $true
        "UCRTBASE.DLL" = $true
        "VERSION.DLL" = $true
        "WS2_32.DLL" = $true
    }

    $dllNames = @()
    foreach ($line in $objdumpOutput) {
        if ($line -match 'DLL Name:\s+(.+)$') {
            $dllName = $Matches[1].Trim()
            if ($dllName) {
                $dllNames += $dllName
            }
        }
    }
    $dllNames = $dllNames | Sort-Object -Unique

    if ($dllNames.Count -eq 0) {
        Write-Host "No additional runtime DLL dependencies detected." -ForegroundColor Cyan
        return
    }

    $runnerDir = Split-Path -Parent $RunnerExePath
    $copied = @()

    foreach ($dllName in $dllNames) {
        $dllUpper = $dllName.ToUpperInvariant()

        if ($dllUpper.StartsWith("API-MS-WIN-") -or $dllUpper.StartsWith("EXT-MS-WIN-")) {
            continue
        }

        if ($systemDlls.ContainsKey($dllUpper)) {
            continue
        }

        $sourcePath = Join-Path $msysBin $dllName
        if (-not (Test-Path $sourcePath)) {
            continue
        }

        $destinationPath = Join-Path $runnerDir $dllName
        Copy-Item -LiteralPath $sourcePath -Destination $destinationPath -Force
        $copied += $dllName
    }

    if ($copied.Count -gt 0) {
        Write-Host ("Copied runtime DLLs: " + ($copied -join ", ")) -ForegroundColor Green
    } else {
        Write-Host "No MSYS2 runtime DLLs needed to be copied." -ForegroundColor Cyan
    }
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
    Copy-RunnerRuntimeDependencies -RunnerExePath $runnerExe
    Write-Host "Runner built: $runnerExe" -ForegroundColor Green
} else {
    Write-Host "Build completed, but runner executable was not found at expected path: $runnerExe" -ForegroundColor Yellow
}
