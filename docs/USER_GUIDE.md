# FrowCRRd User Guide

This guide is for end users of the installed Windows app.

## 1. Installation

Install from **GitHub Releases**:

1. Open: https://github.com/mf0tmd/FrowCRRd/releases
2. Download latest Windows installer (`FrowCRRD-...-win-x64.exe`).
3. Run installer.

Important:

- You do not need Node.js, CMake, MSYS2, or any developer tools.
- If you downloaded source code zip instead of release installer, that is the wrong package for normal use.

## 2. First Launch

After installation:

- start `FrowCRRD` from Start Menu or desktop shortcut;
- open `Run` to begin a new simulation project;
- use `Examples` for ready presets.

## 3. Main Workflow

### 3.1 Setup

Set mission basics:

- mission name;
- number of stages;
- stage mass/fuel/engines;
- optional final-stage parachute quick setup.

Click `Confirm Project`.

### 3.2 Builder (Detailed Editing)

Use Builder to configure:

- stages, tanks, engines;
- pitch program;
- parachutes.

### 3.3 Simulation

Run simulation and review:

- trajectory chart;
- telemetry charts;
- event timeline;
- playback controls.

## 4. Export

Simulation results can be exported to:

- JSON
- CSV

## 5. Offline Use

The installed app works offline for normal simulation usage:

- creating/editing projects;
- running simulations;
- viewing results;
- exporting data.

Internet is only needed to download updates/releases from GitHub.

## 6. Known Model Constraints

- Current model is 2D point-mass (not 6DOF).
- Drag is always enabled in current UI.
- Parachutes in one config must use one shared trigger mode (`time` / `altitude` / `speed`).

## 7. Troubleshooting

### `Runner error: Failed to load config: Configs/config.json`

Use a current installer from GitHub Releases. This error usually means old/broken build packaging.

### `runner_not_found`

Reinstall from latest GitHub Release.

### App blocked by SmartScreen

This can happen with unsigned binaries. Use `More info -> Run anyway` only if file is from official project release page.
