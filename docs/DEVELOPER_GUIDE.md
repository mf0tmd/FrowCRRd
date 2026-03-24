# FrowCRRd Developer Guide

Актуальная техническая документация по текущему состоянию ядра, bridge и GUI.

## 1. Архитектура

Проект разделён на 4 слоя:

- `Configs/` — глобальная конфигурация симуляции и пути к CSV
- `Models/` — атмосфера, drag, двигатель, бак, ступень, ракета, парашют
- `Core/` — физика (`Physics`) и цикл интегрирования (`Simulation`)
- `Bridge/` — `frowcrrd_runner`, JSON-адаптер между GUI и ядром

GUI живёт отдельно в `Gui/` (Electron + React + TypeScript).

## 2. Build Matrix

## 2.1 Core + runner через CMake

```powershell
cmake -S . -B build -G Ninja -DCMAKE_BUILD_TYPE=Release
cmake --build build
```

## 2.2 Runner helper script (Windows)

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\build_sim_runner.ps1 -BuildDir build\gui-release -BuildType Release
```

## 2.3 GUI workflow

Из `Gui/`:

```powershell
npm install
npm run dev:desktop:core
```

## 3. Runtime Contract: GUI -> Runner

Runner принимает JSON (`--input <path>`). Ключевые поля:

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
  - `dragEnabled` (в GUI фактически всегда `true`)
  - `parachuteEnabled`
  - `stopOnImpact`, `stopOnFuelDepleted`

## 4. Runner Behavior

Файл: `Bridge/runner.cpp`.

- Читает JSON через `boost::property_tree`.
- Строит `Rocket` через `build_stages`, `build_pitch_graph`, `add_parachutes_if_present`.
- Запускает `Simulation`.
- Возвращает JSON с `telemetry[]` и служебными `points`/`returnedPoints`.

### 4.1 stopOnImpact

Если `simulation.stopOnImpact=true`, runner может повторять прогон с увеличением горизонта до обнаружения удара о землю (с внутренним лимитом по времени).

### 4.2 Parachute mode constraint

Все парашюты в одном конфиге должны иметь одинаковый `mode`.

Иначе runner бросает ошибку:

`All parachutes must use the same control mode.`

## 5. Core Behavior Notes

### 5.1 Simulation state

`Simulation` интегрирует 5 переменных:

- `ALTITUDE`
- `VERTICAL_VEL`
- `HORIZONTAL_VEL`
- `DOWNRANGE_DIST`
- `MASS`

### 5.2 Integration

- `runge_kutta_fehlberg78` (`boost::numeric::odeint`)
- adaptive integration внутри шага `cfg_.time_step_`

### 5.3 Mass & fuel safety

В актуальной версии:

- активная ступень глушится при фактическом исчерпании топлива;
- расход массы за шаг ограничен доступным остатком топлива;
- `state mass` ограничивается снизу (анти-NaN / анти-нефизичных разгонов).

Это предотвращает ложные случаи, когда масса могла кратковременно падать до `1 кг` при ещё ненулевой тяге.

## 6. Telemetry Contract (Runner -> GUI)

Каждая точка телеметрии:

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

GUI может интерполировать между соседними точками для позиции playhead.

## 7. GUI Notes For Developers

Файл: `Gui/views/EditorView.tsx`.

- Builder/Simulation modes
- Validation перед запуском (`validateSim`)
- Event synthesis на основе config + telemetry
- Event markers на `EarthFlightPlot`

Текущие особенности UX:

- engine type switch removed from UI;
- drag always enabled;
- parachutes moved to Builder hierarchy;
- SetupView has quick parachute count/type controls for final stage;
- burnout events are shown in log and trajectory markers.

## 8. Common Failure Cases

### 8.1 `runner_not_found`

Build runner (`npm run build:sim-core`) or set `FROWCRRD_RUNNER_PATH`.

### 8.2 `Failed to load config: Configs/config.json`

Неверный `cwd` для runner. Запускайте по штатному desktop flow (`Gui` scripts) либо выставляйте рабочую директорию явно.

### 8.3 Bad physics from config

Проверьте:

- thrust/massFlow > 0 при наличии двигателей;
- стартовую вертикальную тягу против веса;
- консистентность парашютов;
- порядок и параметры staging.

## 9. Developer Scripts

- `scripts/build_sim_runner.ps1` — сборка `frowcrrd_runner`
- `scripts/run_massive_audit.ps1` — mass audit (Release/Debug/UBSan/ASan probe)
- `scripts/clean_builds.ps1` — чистка build-директорий

## 10. Contribution Notes

Правила и юридические условия:

- `CONTRIBUTING.md`
- `LICENSE`
- `NOTICE`
