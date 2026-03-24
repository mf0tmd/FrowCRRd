# FrowCRRd

Desktop rocket simulation suite with a C++20 physics core and an Electron GUI.

## What This Project Includes

- Native simulation core (`Core`, `Models`, `Configs`) in C++20
- Bridge runner (`Bridge/frowcrrd_runner`) that accepts JSON config and returns telemetry JSON
- Desktop GUI (`Gui/`) for assembly, tuning, simulation playback, charts, and event log

Model scope: 2D point-mass simulation (not 6DOF).

## What To Download / Install

### 1) Required

- **Git**
- **Node.js LTS (20+)**
- **CMake 3.20+**
- **MSYS2 UCRT64 toolchain** on Windows (`C:\msys64\ucrt64`)

### 2) MSYS2 packages (Windows)

Open MSYS2 UCRT64 shell and install:

```bash
pacman -S --needed \
  mingw-w64-ucrt-x86_64-toolchain \
  mingw-w64-ucrt-x86_64-cmake \
  mingw-w64-ucrt-x86_64-ninja \
  mingw-w64-ucrt-x86_64-boost \
  mingw-w64-ucrt-x86_64-eigen3
```

## Quick Start (Desktop App)

From repository root:

```powershell
cd Gui
npm install
npm run dev:desktop:core
```

This command builds the native runner and starts Electron + Vite.

If PowerShell blocks `npm` script execution, use:

```powershell
npm.cmd install
npm.cmd run dev:desktop:core
```

## Build Native Runner Only

From repository root:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\build_sim_runner.ps1 -BuildDir build\gui-release -BuildType Release
```

Expected output:

```text
build/gui-release/bin/frowcrrd_runner.exe
```

## Run Desktop App With Existing Runner

If runner is already built:

```powershell
cd Gui
npm run dev:desktop
```

## Build Desktop Installer

From `Gui/`:

```powershell
npm run build:desktop
```

Installer artifacts are written to `Gui/release/`.

## Build Core (CMake)

From repository root:

```powershell
cmake -S . -B build -G Ninja -DCMAKE_BUILD_TYPE=Release
cmake --build build
```

## Manual Runner Call (for Debug)

```powershell
build\gui-release\bin\frowcrrd_runner.exe --input C:\path\to\config.json
```

The runner must be started with working directory where `Configs/config.json` is resolvable (normally repository root).

## Current GUI Notes

- Aerodynamic drag is always enabled
- Parachutes support multiple canopies
- All parachutes in one configuration must use the same trigger mode (`time`/`altitude`/`speed`)
- Pitch program supports full 0..360 degree range
- Event log includes launch, staging/fairing, apogee, impact, and engine burnout markers

## Repository Map

- `Bridge/` — native JSON bridge runner
- `Configs/` — global simulation config + CSV paths
- `Core/` — integrator + simulation loop
- `Models/` — rocket, atmosphere, drag, engine, stage, parachute models
- `Gui/` — Electron + React UI
- `docs/` — user/developer documentation
- `scripts/` — helper scripts (runner build, audits, cleanup)

## License

This project is licensed under **FrowCRRd Public Source License 1.0.0 (FPSL-1.0.0)**.

See:

- `LICENSE`
- `NOTICE`
- `CONTRIBUTING.md`
