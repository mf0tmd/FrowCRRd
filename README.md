# FrowCRRd

Desktop rocket simulation suite with a C++20 physics core and an Electron GUI.

## Distribution Scope

This repository is now configured for **Windows-only distribution**.

- Native runner output: `frowcrrd_runner.exe`
- Desktop installer target: **NSIS offline installer** (`.exe`)
- Non-Windows build targets and scripts are intentionally removed

## Overview

FrowCRRd combines:

- Native simulation core in C++20 (`Core`, `Models`, `Configs`)
- JSON bridge runner (`Bridge/frowcrrd_runner`)
- Desktop GUI in Electron + React (`Gui`)

Current model scope: 2D point-mass flight simulation (not 6DOF).

## Requirements (Build From Source)

- Git
- Node.js 20+
- npm
- CMake 3.20+
- Ninja
- MSYS2 UCRT64 toolchain (`C:\msys64\ucrt64`)

## Quick Start (Desktop Dev)

From repository root:

```powershell
cd Gui
npm install
npm run dev:desktop:core
```

If PowerShell blocks npm scripts:

```powershell
npm.cmd install
npm.cmd run dev:desktop:core
```

## Build Native Runner

From repository root:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\build_sim_runner.ps1 -BuildDir build\gui-release -BuildType Release
```

Expected output:

```text
build\gui-release\bin\frowcrrd_runner.exe
```

The build helper also copies required MSYS2 runtime DLLs next to the runner executable for portable packaging.

## Build Standalone Installer (.exe)

From `Gui/`:

```powershell
npm install
npm run build:desktop:standalone
```

Installer artifacts are generated in:

```text
Gui\release\
```

## Offline Runtime Guarantee

Packaged desktop builds do not require internet access for normal operation:

- renderer dependencies are bundled locally via Vite;
- no CDN/import-map runtime modules are used;
- no runtime web API calls are performed by GUI/core;
- native runner + required runtime DLLs are bundled into installer resources.

## How GUI Talks to Core

- Renderer sends config JSON via IPC `simulation:run`
- Electron main process runs `frowcrrd_runner.exe --input <temp-json>`
- Runner returns telemetry JSON
- GUI normalizes telemetry and renders charts, playback and event markers

Implementation entrypoint: `Gui/electron/main.cjs`.

## Frequent Problems

### `runner_not_found`

Build native runner first:

```powershell
npm run build:sim-core
```

### `Failed to load config: Configs/config.json`

Run desktop flow from `Gui` (`npm run dev:desktop:core`) so working directory resolution is correct.

### `npm.ps1 cannot be loaded` (Execution Policy)

Use `npm.cmd ...` commands in PowerShell.

## Repository Layout

- `Bridge/` - native JSON bridge runner
- `Configs/` - simulation config + CSV files
- `Core/` - integrator and simulation loop
- `Models/` - atmosphere, drag, engine, stage, rocket, parachute models
- `Gui/` - Electron + React frontend
- `docs/` - user and developer guides
- `scripts/` - helper scripts
- `Tests/` - test targets

## License

This project is licensed under **FrowCRRd Public Source License 1.0.0 (FPSL-1.0.0)**.

See also:

- `LICENSE`
- `NOTICE`
- `CONTRIBUTING.md`
