# FrowCRRd Developer Guide

This document describes the current Windows desktop build pipeline and runtime contract for core, bridge, and GUI.

## 1. Architecture

Project layers:

- `Configs/` - simulation configuration and CSV data sources
- `Models/` - atmosphere, drag, engine, tank, stage, rocket, parachute
- `Core/` - physics (`Physics`) and integration loop (`Simulation`)
- `Bridge/` - `frowcrrd_runner` JSON adapter between GUI and core
- `Gui/` - Electron + React + TypeScript desktop shell

## 2. Build Matrix (Windows)

## 2.1 Core + Runner via CMake

```powershell
cmake -S . -B build -G Ninja -DCMAKE_BUILD_TYPE=Release
cmake --build build
```

## 2.2 Runner Helper Script

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\build_sim_runner.ps1 -BuildDir build\gui-release -BuildType Release
```

Notes:

- builds `frowcrrd_runner.exe`;
- inspects binary dependencies via `objdump`;
- copies required MSYS2 runtime DLLs next to the runner executable.

## 2.3 Desktop App Workflow

From `Gui/`:

```powershell
npm install
npm run dev:desktop:core
```

## 2.4 Standalone Installer

From `Gui/`:

```powershell
npm run build:desktop:standalone
```

Produces an offline NSIS installer in `Gui\release\`.

## 3. Runtime Contract: GUI -> Runner

The runner accepts JSON via:

```text
--input <path-to-json>
```

Primary fields:

- `stages[]`
  - `structuralMass`, `payloadMass`, `diameter`
  - `tank.dryMass`, `tank.fuelMass`
  - `engineGroup.engineCount`, `engineGroup.thrust`, `engineGroup.massFlow`, `engineGroup.engineMass`
  - `engineGroup.instances[].throttlePoints[]` (`t`, `v`)
  - `separation.mode` (`time`/`altitude`/`fuel`), `separation.value`
- `fairingMass`, `fairingSeparation.mode/value`
- `pitchProgramEnabled`, `pitchProgram[]`
- `parachutes[]`
  - `mode` (`time`/`altitude`/`speed`)
  - `isDrogue`
  - `area`, `start`, `end`
- `simulation`
  - `dt`, `tMax`
  - `dragEnabled` (effectively always true from GUI)
  - `parachuteEnabled`
  - `stopOnImpact`, `stopOnFuelDepleted`

## 4. Runner Behavior

File: `Bridge/runner.cpp`.

- Reads JSON with `boost::property_tree`.
- Builds `Rocket` via helper builders.
- Runs `Simulation`.
- Returns JSON with `telemetry[]` and auxiliary `points`/`returnedPoints` fields.

### 4.1 stopOnImpact

If `simulation.stopOnImpact=true`, runner can rerun with extended horizon until impact is detected (bounded by internal safety cap).

### 4.2 Parachute Mode Constraint

All parachutes in one config must share one mode.

Error text:

```text
All parachutes must use the same control mode.
```

## 5. Core Notes

### 5.1 Integrated State

`Simulation` integrates:

- `ALTITUDE`
- `VERTICAL_VEL`
- `HORIZONTAL_VEL`
- `DOWNRANGE_DIST`
- `MASS`

### 5.2 Integration Method

- `runge_kutta_fehlberg78` (`boost::numeric::odeint`)
- adaptive integration within each configured `dt`

### 5.3 Mass/Fuel Safety

Current behavior includes safeguards:

- active stage shutdown at effective fuel depletion;
- per-step fuel consumption capped by available fuel;
- state mass lower bound to avoid non-physical accelerations and NaN cascades.

## 6. Runner -> GUI Telemetry Contract

Telemetry point fields:

- `t`
- `altitude`
- `downrange`
- `vVert`
- `vHor`
- `vTotal`
- `accel`
- `mass`
- `thrust`
- `mach`
- `pitch`

GUI may interpolate between neighboring points for smooth playhead rendering.

## 7. Desktop Packaging Notes

`Gui/package.json` includes Electron Builder config with:

- Windows NSIS target only;
- `extraResources` for `Configs` and `sim-core` (`frowcrrd_runner.exe` + runtime DLLs);
- local renderer bundle (no runtime CDN dependencies).

Main process entrypoint: `Gui/electron/main.cjs`.

## 8. Common Failure Cases

### 8.1 `runner_not_found`

Build runner (`npm run build:sim-core`) or set `FROWCRRD_RUNNER_PATH`.

### 8.2 `Failed to load config: Configs/config.json`

Desktop process started with wrong working directory/resources.
Use standard scripts from `Gui`.

### 8.3 Invalid Physics Parameters

Check:

- `thrust`/`massFlow` > 0 for active engines;
- launch thrust-to-weight viability;
- parachute consistency;
- stage ordering and mass values.

## 9. Developer Scripts

- `scripts/build_sim_runner.ps1` - build runner and copy runtime DLL deps
- `scripts/run_massive_audit.ps1` - multi-profile audit runs
- `scripts/clean_builds.ps1` - cleanup helper

## 10. Contribution and Legal

- `CONTRIBUTING.md`
- `LICENSE`
- `NOTICE`
