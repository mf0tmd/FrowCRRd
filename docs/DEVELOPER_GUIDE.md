# FrowCRRd Developer Guide

This document is for developers working with source code.

## 1. Architecture

Main layers:

- `Configs/` - global simulation config and CSV data tables
- `Models/` - atmosphere, drag, engine, tank, stage, rocket, parachute models
- `Core/` - physics and integration loop
- `Bridge/` - `frowcrrd_runner` JSON bridge (`--input <file> -> telemetry JSON`)
- `Gui/` - Electron + React desktop frontend

## 2. Platform Scope

- This branch is Windows-only for distribution.
- CMake is guarded to fail on non-Windows platforms.

## 3. Build Prerequisites (Windows)

- Node.js 20+
- npm
- CMake 3.20+
- Ninja
- MSYS2 UCRT64 toolchain (`C:\msys64\ucrt64`)

## 4. Source Build Flow

### 4.1 Native Runner

From repo root:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\build_sim_runner.ps1 -BuildDir build\gui-release -BuildType Release
```

Output:

- `build\gui-release\bin\frowcrrd_runner.exe`
- copied runtime DLLs next to runner (portable packaging support)

### 4.2 Desktop Dev

From `Gui/`:

```powershell
npm.cmd install
npm.cmd run dev:desktop:core
```

### 4.3 Local Installer Build

From `Gui/`:

```powershell
npm.cmd run build:desktop:standalone
```

Local artifact path (developer machine only):

- `Gui\release\FrowCRRD-...-win-x64.exe`

Important:

- This local path is **not** where end users should download installers.
- End users should use GitHub Releases page.

## 5. End User Delivery

Release process summary:

1. Build installer locally.
2. Create GitHub Release.
3. Upload built `.exe` to release assets.
4. Users install from Releases page.

## 6. Runtime Contract (GUI -> Runner)

Runner input command:

```text
frowcrrd_runner.exe --input <path>
```

Runner output:

- JSON with `telemetry[]`
- metadata fields (`points`, `returnedPoints`)

Key config domains used by runner:

- stage/tank/engine definitions;
- separation rules;
- pitch program;
- parachute setup;
- simulation settings (`dt`, `tMax`, `stopOnImpact`, etc.).

## 7. Packaging Notes

`Gui/package.json` Electron Builder config:

- Windows NSIS target only;
- bundles `Configs` as resources;
- bundles `sim-core` (`frowcrrd_runner.exe` + runtime DLLs);
- uses local icon (`Gui/build/icon.ico`) for installer/app executable.

## 8. Common Developer Errors

### `runner_not_found`

Build runner first (`npm run build:sim-core`) or set `FROWCRRD_RUNNER_PATH`.

### `Failed to load config: Configs/config.json`

Packaging/runtime `cwd` mismatch. Verify current `electron/main.cjs` runner `cwdCandidates` and packaged resource layout.

## 9. Useful Scripts

- `scripts/build_sim_runner.ps1`
- `scripts/run_massive_audit.ps1`
- `scripts/clean_builds.ps1`

## 10. Legal

- `CONTRIBUTING.md`
- `LICENSE`
- `NOTICE`
