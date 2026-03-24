# FrowCRRd GUI (Electron + React + TypeScript)

Frontend for the native FrowCRRd simulation core.

## Requirements

- Node.js 20+
- npm
- Native runner build prerequisites (CMake + MSYS2 UCRT64 toolchain)

If you only run web mode (`dev:web`), native toolchain is not required.

## Install

```powershell
npm install
```

If PowerShell policy blocks `npm`:

```powershell
npm.cmd install
```

## Main Commands

### Start web UI only

```powershell
npm run dev:web
```

### Start desktop UI (expects runner already built)

```powershell
npm run dev:desktop
```

### Build runner + start desktop UI (recommended)

```powershell
npm run dev:desktop:core
```

### Build production web bundle

```powershell
npm run build:web
```

### Type-check

```powershell
npm run lint
```

## Native Runner Build

From `Gui/`:

```powershell
npm run build:sim-core
```

Output path:

```text
../build/gui-release/bin/frowcrrd_runner.exe
```

Debug runner:

```powershell
npm run build:sim-core:debug
```

## Desktop Packaging

### Web installer (smaller bootstrap installer)

```powershell
npm run build:desktop
```

### Offline installer

```powershell
npm run build:desktop:offline
```

### Unpacked app directory

```powershell
npm run pack:desktop
```

Artifacts are generated in `Gui/release/`.

## How GUI Talks To Core

- Renderer sends `config` JSON via IPC channel `simulation:run`
- Electron main process writes temp input JSON and runs `frowcrrd_runner --input <file>`
- Runner returns telemetry JSON
- GUI normalizes telemetry and renders charts/playback/events

Implementation entrypoint: `Gui/electron/main.cjs`.

## Runner Search Order

Electron tries several paths, including:

- `../build/gui-release/bin/frowcrrd_runner.exe`
- `../build/gui-debug/bin/frowcrrd_runner.exe`
- packaged app resource paths (`sim-core`)

You can override with env var:

```powershell
$env:FROWCRRD_RUNNER_PATH="C:\absolute\path\frowcrrd_runner.exe"
npm run dev:desktop
```

## Frequent Problems

### 1) `runner_not_found`

Build it first:

```powershell
npm run build:sim-core
```

### 2) `Failed to load config: Configs/config.json`

Run desktop app from the project setup so working directory resolution is correct. Normal flow: `npm run dev:desktop:core` from `Gui/`.

### 3) `npm.ps1 cannot be loaded because running scripts is disabled`

Use `npm.cmd ...` commands in PowerShell.

### 4) Native simulation error from invalid config

Check in Builder:

- stage masses and engine count
- thrust and mass flow > 0 when engines exist
- liftoff feasibility warning
- parachute consistency (same mode for all parachutes)

## Notes About Current UI Behavior

- Engine type switch is removed in UI (single configured engine model flow)
- Drag is always on
- SetupView: final stage has parachute count/type quick setup
- Detailed parachute parameters are edited in Editor hierarchy
- Event log and trajectory include engine burnout markers
