# FrowCRRd

Desktop rocket simulation suite with a C++20 physics core and an Electron GUI.

## Overview

FrowCRRd combines:

- Native simulation core in C++20 (`Core`, `Models`, `Configs`)
- JSON bridge runner (`Bridge/frowcrrd_runner`)
- Desktop GUI in Electron + React (`Gui`)

Current model scope: 2D point-mass flight simulation (not 6DOF).

## Requirements

### Required tools

- Git
- Node.js LTS (20+)
- npm
- CMake 3.20+
- MSYS2 UCRT64 toolchain on Windows (`C:\msys64\ucrt64`)

### Recommended MSYS2 packages (Windows)

```bash
pacman -S --needed \
  mingw-w64-ucrt-x86_64-toolchain \
  mingw-w64-ucrt-x86_64-cmake \
  mingw-w64-ucrt-x86_64-ninja \
  mingw-w64-ucrt-x86_64-boost \
  mingw-w64-ucrt-x86_64-eigen3
```

## Quick Start (Desktop)

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

## Core Build (CMake)

From repository root:

```powershell
cmake -S . -B build -G Ninja -DCMAKE_BUILD_TYPE=Release
cmake --build build
```

## Native Runner Build

From repository root:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\build_sim_runner.ps1 -BuildDir build\gui-release -BuildType Release
```

Expected output:

```text
build/gui-release/bin/frowcrrd_runner.exe
```

## GUI Commands

Run from `Gui/`.

### Dev

```powershell
npm run dev:web
npm run dev:desktop
npm run dev:desktop:core
```

### Build

```powershell
npm run build:web
npm run build:sim-core
npm run build:sim-core:debug
npm run lint
```

### Packaging

```powershell
npm run build:desktop
npm run build:desktop:offline
npm run pack:desktop
```

Artifacts are produced in `Gui/release/`.

## How GUI Talks to Core

- Renderer sends config JSON via IPC `simulation:run`
- Electron main process runs `frowcrrd_runner --input <temp-json>`
- Runner returns telemetry JSON
- GUI normalizes telemetry and renders charts, playback and event markers

Implementation entrypoint: `Gui/electron/main.cjs`.

## Runner Search Paths (Desktop)

Electron checks, among others:

- `../build/gui-release/bin/frowcrrd_runner.exe`
- `../build/gui-debug/bin/frowcrrd_runner.exe`
- packaged resource paths (`sim-core`)

Override manually:

```powershell
$env:FROWCRRD_RUNNER_PATH="C:\absolute\path\frowcrrd_runner.exe"
npm run dev:desktop
```

## Frequent Problems

### `runner_not_found`

Build native runner first:

```powershell
npm run build:sim-core
```

### `Failed to load config: Configs/config.json`

Run desktop flow from the project setup (`npm run dev:desktop:core` from `Gui`) so working directory resolution is correct.

### `npm.ps1 cannot be loaded` (Execution Policy)

Use `npm.cmd ...` commands in PowerShell.

## Current GUI Notes

- Engine type switch is removed from UI
- Drag is always enabled
- SetupView contains final-stage parachute count/type quick setup
- Detailed parachute config is in Builder hierarchy (`Parachutes`)
- Event log and trajectory markers include engine burnout events

## Repository Layout

- `Bridge/` — native JSON bridge runner
- `Configs/` — simulation config + CSV files
- `Core/` — integrator and simulation loop
- `Models/` — atmosphere, drag, engine, stage, rocket, parachute models
- `Gui/` — Electron + React frontend
- `docs/` — user and developer guides
- `scripts/` — helper scripts
- `Tests/` — test targets

## License

This project is licensed under **FrowCRRd Public Source License 1.0.0 (FPSL-1.0.0)**.

See also:

- `LICENSE`
- `NOTICE`
- `CONTRIBUTING.md`
