# FrowCRRd

Windows desktop rocket simulation suite with a C++20 physics core and an Electron GUI.

## Who This Repository Is For

- End users: download ready installer from **GitHub Releases**.
- Developers: build from source using the instructions below.

## End User Installation

Do **not** build from source if you only want to run the app.

1. Open Releases: https://github.com/mf0tmd/FrowCRRd/releases
2. Download latest Windows installer (`FrowCRRD-...-win-x64.exe`).
3. Run installer and complete setup.

Notes:

- Internet is needed only to download installer/update files from GitHub.
- The installed app itself works offline for simulation workflow.

## End User Docs

- `docs/USER_GUIDE.md` - app usage, workflow, simulation behavior.

## Developer Quick Start (Source Build)

Use this only if you are developing the project.

Requirements:

- Node.js 20+
- npm
- CMake 3.20+
- Ninja
- MSYS2 UCRT64 toolchain (`C:\msys64\ucrt64`)

Run desktop dev flow:

```powershell
cd Gui
npm.cmd install
npm.cmd run dev:desktop:core
```

Build standalone installer locally:

```powershell
cd Gui
npm.cmd run build:desktop:standalone
```

Local build artifacts (developer machine):

- `Gui/release/`

## Developer Docs

- `docs/DEVELOPER_GUIDE.md` - architecture, runner contract, packaging pipeline.

## Project Scope

- Windows-only distribution branch.
- Desktop app + native runner (`frowcrrd_runner.exe`).
- Current physics scope: 2D point-mass model (not 6DOF).

## License

This project is licensed under **FrowCRRd Public Source License 1.0.0 (FPSL-1.0.0)**.

See also:

- `LICENSE`
- `NOTICE`
- `CONTRIBUTING.md`
