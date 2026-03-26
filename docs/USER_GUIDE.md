# FrowCRRd User Guide

This guide applies to the current Windows desktop version (Electron GUI + native C++ runner).

## 1. What This Application Is

`FrowCRRd` is a desktop 2D rocket flight simulator:

- build a rocket configuration in the GUI;
- compute trajectory in a native C++ core;
- view telemetry, events, and playback charts.

Important: this is a **2D point-mass model**, not a 6DOF model.

## 2. Installation (Standalone)

Use the standalone installer generated in `Gui\release\*.exe`.

The installer is offline-ready and includes:

- desktop app binaries;
- native simulation runner (`frowcrrd_runner.exe`);
- required runtime DLLs for the runner;
- local renderer assets.

## 3. Running From Source (Developers)

From `Gui`:

```powershell
npm install
npm run dev:desktop:core
```

If PowerShell blocks `npm`:

```powershell
npm.cmd install
npm.cmd run dev:desktop:core
```

## 4. Main Workflow

### Step 1: Main Menu

- `Run` -> open `SetupView`
- `Examples` -> load predefined configurations
- `Documentation` / `Tutorial` / `Settings`

### Step 2: SetupView (Quick Setup)

Set basic parameters:

- mission name;
- number of stages;
- stage structural mass, diameter, fuel mass, engine count.

For the final stage, quick recovery setup includes:

- parachute count;
- parachute type (`Main` / `Drogue`).

Then click `Confirm Project`.

### Step 3: EditorView (Detailed Setup)

`Builder` mode:

- rocket hierarchy (stages, tanks, engines, pitch program, parachutes);
- detailed parameter editing;
- thrust and pitch charts.

`Simulation` mode:

- launch simulation;
- trajectory and telemetry charts;
- event log and playback controls.

## 5. Important Current Rules

### 5.1 Engines

- Engine type switching is disabled in current UI.
- Configurable fields: engine count, thrust, mass flow, engine mass, throttle profile.

### 5.2 Pitch Program

- Supported angle range: **0..360** degrees.
- Aggressive non-vertical launch pitch can prevent liftoff.

### 5.3 Aerodynamics

- Aerodynamic drag is always enabled.
- No separate drag toggle in UI.

### 5.4 Parachutes

- Multiple parachutes are supported.
- Configure detailed parachute parameters in Builder hierarchy (`Parachutes`).
- Core limitation: all parachutes in one config must share the same trigger mode (`time` / `altitude` / `speed`).

### 5.5 Simulation Stop Condition

Simulation settings include `Simulate until ground impact`.

- Disabled: simulation stops at `tMax`.
- Enabled: runner can extend the horizon internally until impact is detected (with an internal cap).

## 6. Offline Operation

The packaged app works without internet connection.

No internet is required for:

- opening the app;
- editing projects;
- running simulations;
- viewing charts and event playback;
- exporting simulation output.

## 7. Events and Charts

Events include:

- ignition / liftoff;
- throttle and pitch changes;
- separation and fairing events;
- apogee;
- impact;
- engine burnout.

Events are synchronized with playback slider and trajectory markers.

## 8. Export

Simulation output can be exported to:

- JSON
- CSV

## 9. Pre-Launch Checklist

- mission name is set;
- fueled stages have engines;
- engines have positive thrust and mass flow;
- launch pitch is reasonable;
- parachute settings are valid and use one shared trigger mode.
