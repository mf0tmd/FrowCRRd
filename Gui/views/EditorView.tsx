import React, { useState, useEffect, useMemo, useRef } from 'react';
import { RocketConfig, SelectionType, TelemetryPoint, EventDisplayMode, ParachuteConfig } from '../types';
import { EarthFlightPlot, type FlightEventMarker } from '../EarthFlightPlot';
import { 
  ChevronLeft, Rocket, Layers, Settings, Play, ChevronDown, ChevronRight, Zap, Database, Target, Plus, Trash2, 
  Activity, Cpu, ArrowUp, ArrowDown, Save, Menu as MenuIcon, Edit, Pause, SkipForward, Download, 
  FileText, AlertTriangle, CheckCircle2, Info, Layout, PlayCircle, Copy
} from 'lucide-react';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  AreaChart, Area, Label, Customized, ReferenceLine, ReferenceDot
} from 'recharts';

const NumericInput: React.FC<{
  value: any;
  onChange: (val: number) => void;
  type?: 'number' | 'text';
  isDark: boolean;
  className?: string;
  min?: number;
  max?: number;
  displayMultiplier?: number;
  label?: string;
  unit?: string;
  step?: string;
}> = ({ value, onChange, type = 'number', isDark, className, min, max, displayMultiplier = 1, label, unit, step }) => {
  const [draft, setDraft] = useState<string>(
    value === '' || value === undefined || value === null ? '' : (parseFloat(value) * displayMultiplier).toString()
  );

  useEffect(() => {
    if (value !== '' && value !== undefined && value !== null) {
      const val = parseFloat(value) * displayMultiplier;
      if (parseFloat(draft) !== val) {
        setDraft(val.toString());
      }
    } else {
      setDraft('');
    }
  }, [value, displayMultiplier]);

  const commit = () => {
    if (draft === '') {
      setDraft((parseFloat(value) * displayMultiplier).toString());
      return;
    }
    let num = parseFloat(draft);
    if (isNaN(num)) {
      setDraft((parseFloat(value) * displayMultiplier).toString());
      return;
    }
    let finalVal = num / displayMultiplier;
    if (min !== undefined) finalVal = Math.max(min, finalVal);
    if (max !== undefined) finalVal = Math.min(max, finalVal);
    onChange(finalVal);
    setDraft((finalVal * displayMultiplier).toString());
  };

  return (
    <div className="flex flex-col gap-1.5 w-full">
      {label && <label className={`text-[10px] uppercase font-black tracking-widest ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>{label} {unit && `(${unit})`}</label>}
      <input
        type="text"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => e.key === 'Enter' && commit()}
        className={className || `w-full border p-2 text-[10px] font-bold outline-none focus:border-blue-500 rounded transition-colors ${isDark ? 'bg-[#111] border-[#333] text-white' : 'bg-gray-50 border-gray-200 text-gray-900'}`}
      />
    </div>
  );
};

const CustomTooltip = ({ active, payload, label, unit, isDark }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    const time = data.t !== undefined ? data.t : (data.time !== undefined ? data.time : label);

    return (
      <div className={`p-4 border-2 rounded shadow-2xl font-mono text-[12px] z-50 ${isDark ? 'bg-black border-blue-500 text-white' : 'bg-white border-gray-400 text-gray-900'}`}>
        <div className="flex justify-between gap-8 mb-3 border-b-2 border-blue-500 pb-2">
          <span className="font-black uppercase tracking-widest text-blue-500">T(S):</span>
          <span className="font-black text-sm">{typeof time === 'number' ? time.toFixed(2) : time}</span>
        </div>
        {payload.map((p: any, i: number) => (
          <div key={i} className="flex justify-between gap-8 items-center">
            <span className="font-black uppercase tracking-widest text-gray-400">{p.name || p.dataKey}:</span>
            <span className="font-black text-lg" style={{ color: p.color }}>
              {typeof p.value === 'number' ? p.value.toFixed(1) : p.value}{unit || p.unit || ''}
            </span>
          </div>
        ))}
      </div>
    );
  }
  return null;
};

const toFiniteNumber = (value: unknown, fallback = 0): number => {
  const num = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(num) ? num : fallback;
};

const clamp = (value: number, min: number, max: number): number => {
  return Math.min(max, Math.max(min, value));
};

const DragLayer = (props: any) => {
  const { xAxisMap, yAxisMap, width, height, offset, onUpdate, points, isThrottle, draggingId, setDraggingId } = props;
  
  if (!xAxisMap || !yAxisMap || !onUpdate) return null;

  const xAxis = xAxisMap[0];
  const yAxis = yAxisMap[0];

    const handleMouseMove = (e: React.MouseEvent) => {
      if (!draggingId || !e.currentTarget) return;

      const rect = e.currentTarget.getBoundingClientRect();
      const x = e.clientX - rect.left - offset.left;
      const y = e.clientY - rect.top - offset.top;

      const newT = xAxis.scale.invert(x);
      const newV = yAxis.scale.invert(y);

    const updatedPoints = points.map((p: any) => {
      if (p.id === draggingId) {
        let v = newV;
        if (isThrottle) v = Math.max(0, Math.min(100, v)) / 100;
        else v = Math.max(0, Math.min(360, v)); // Pitch range (0..360)
        
        return { ...p, t: Math.max(0, newT), v };
      }
      return p;
    });

    // Sort and nudge
    updatedPoints.sort((a: any, b: any) => a.t - b.t);
    for (let i = 1; i < updatedPoints.length; i++) {
      if (updatedPoints[i].t <= updatedPoints[i-1].t) {
        updatedPoints[i].t = updatedPoints[i-1].t + 0.001;
      }
    }

    onUpdate(updatedPoints);
  };

  return (
    <rect
      x={offset.left}
      y={offset.top}
      width={width}
      height={height}
      fill="transparent"
      onMouseMove={handleMouseMove}
      onMouseUp={() => setDraggingId(null)}
      onMouseLeave={() => setDraggingId(null)}
      style={{ cursor: draggingId ? 'grabbing' : 'default' }}
    />
  );
};

type EditorMode = 'BUILDER' | 'SIMULATION';
type SimStatus = 'IDLE' | 'LOADING' | 'RUNNING' | 'PAUSED' | 'DONE' | 'ERROR';
type SimEventLevel = 'info' | 'success' | 'warn' | 'error';

interface SimulationEvent {
  id: string;
  t: number;
  message: string;
  level: SimEventLevel;
}

const createDefaultParachute = (index = 0, isDrogue = false): ParachuteConfig => ({
  id: `${isDrogue ? 'drogue' : 'main'}-parachute-${index + 1}`,
  mode: 'altitude',
  isDrogue,
  area: isDrogue ? 16 : 80,
  start: isDrogue ? 8000 : 2500,
  end: isDrogue ? 3000 : 0,
});

interface EditorViewProps {
  config: RocketConfig;
  onChange: (config: RocketConfig) => void;
  onBack: () => void;
  theme: 'dark' | 'light';
  language?: 'ru' | 'en';
  t: (key: any) => string;
}

const EditorView: React.FC<EditorViewProps> = ({ config, onChange, onBack, theme, language, t }) => {
  const isRu = language === 'ru';
  const tr = (en: string, ru: string) => (isRu ? ru : en);

  const [mode, setMode] = useState<EditorMode>('BUILDER');
  const [selection, setSelection] = useState<SelectionType>({ type: 'NONE' });
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set(['rocket', 's-0']));
  const [editingPoint, setEditingPoint] = useState<{ t: string; v: string } | null>(null);
  
  // Simulation State
  const [telemetry, setTelemetry] = useState<TelemetryPoint[]>([]);
  const [simStatus, setSimStatus] = useState<SimStatus>('IDLE');
  const [playheadTime, setPlayheadTime] = useState(0);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [simErrors, setSimErrors] = useState<string[]>([]);
  const [isSimSettingsOpen, setIsSimSettingsOpen] = useState(false);
  const eventLogRef = useRef<HTMLDivElement | null>(null);
  const simSettingsMenuRef = useRef<HTMLDivElement | null>(null);
  
  const [mobileUI, setMobileUI] = useState<'HIERARCHY' | 'PROPERTIES' | 'NONE'>('NONE');

  const isDark = theme === 'dark';

  // Sync configuration and ensure defaults
  useEffect(() => {
    let hasChanged = false;
    let nextPitchProgram = config.pitchProgram;
    let nextPitchProgramEnabled = config.pitchProgramEnabled;
    let nextSimulation = config.simulation;
    let nextParachutes = Array.isArray(config.parachutes) ? config.parachutes : [];
    let nextFairingSeparation = config.fairingSeparation;

    // 1. Normalize pitch program to stable and physically safe defaults.
    const sourcePitchProgram = Array.isArray(config.pitchProgram) ? config.pitchProgram : [];
    const normalizedPitchProgram = sourcePitchProgram
      .map((point, idx) => ({
        id: (typeof point?.id === 'string' && point.id.trim().length > 0) ? point.id : `pitch-${idx}`,
        t: Math.max(0, toFiniteNumber(point?.t, 0)),
        v: clamp(toFiniteNumber(point?.v, 90), 0, 360),
      }))
      .sort((a, b) => a.t - b.t);

    if (normalizedPitchProgram.length === 0 || normalizedPitchProgram[0].t > 1e-9) {
      normalizedPitchProgram.unshift({
        id: 'pitch-anchor',
        t: 0,
        v: normalizedPitchProgram.length > 0 ? normalizedPitchProgram[0].v : 90,
      });
    } else {
      normalizedPitchProgram[0] = {
        ...normalizedPitchProgram[0],
        t: 0,
      };
    }

    for (let i = 1; i < normalizedPitchProgram.length; i++) {
      if (!(normalizedPitchProgram[i].t > normalizedPitchProgram[i - 1].t)) {
        normalizedPitchProgram[i] = {
          ...normalizedPitchProgram[i],
          t: normalizedPitchProgram[i - 1].t + 0.001,
        };
      }
    }

    const pitchProgramChanged =
      normalizedPitchProgram.length !== sourcePitchProgram.length
      || normalizedPitchProgram.some((point, idx) => {
        const current = sourcePitchProgram[idx];
        if (!current) return true;
        const currentT = Math.max(0, toFiniteNumber((current as any).t, 0));
        const currentV = clamp(toFiniteNumber((current as any).v, 90), 0, 360);
        return (
          point.id !== current.id
          || Math.abs(point.t - currentT) > 1e-9
          || Math.abs(point.v - currentV) > 1e-9
        );
      });

    if (pitchProgramChanged) {
      hasChanged = true;
      nextPitchProgram = normalizedPitchProgram;
    }

    if (
      !config.simulation
      || !config.simulation.eventDisplayMode
      || !['all', 'important', 'minimal'].includes(config.simulation.eventDisplayMode)
    ) {
      hasChanged = true;
      nextSimulation = {
        ...config.simulation,
        eventDisplayMode: 'all',
      };
    }

    const rawRocketMarkerScale = toFiniteNumber((config.simulation as any)?.rocketMarkerScale, 1);
    const normalizedRocketMarkerScale = clamp(rawRocketMarkerScale, 0.4, 3);
    if (
      !config.simulation
      || !Number.isFinite((config.simulation as any)?.rocketMarkerScale)
      || Math.abs(toFiniteNumber((config.simulation as any)?.rocketMarkerScale, normalizedRocketMarkerScale) - normalizedRocketMarkerScale) > 1e-6
    ) {
      hasChanged = true;
      nextSimulation = {
        ...nextSimulation,
        rocketMarkerScale: normalizedRocketMarkerScale,
      };
    }

    if (!nextSimulation.dragEnabled || nextSimulation.stopOnFuelDepleted) {
      hasChanged = true;
      nextSimulation = {
        ...nextSimulation,
        dragEnabled: true,
        stopOnFuelDepleted: false,
      };
    }

    const sourceParachutes = Array.isArray(config.parachutes) ? config.parachutes : [];
    const normalizedParachutes = sourceParachutes
      .map((parachute, idx) => {
        const mode = parachute?.mode === 'time' || parachute?.mode === 'speed' || parachute?.mode === 'altitude'
          ? parachute.mode
          : 'altitude';
        return {
          id: (typeof parachute?.id === 'string' && parachute.id.trim().length > 0) ? parachute.id : `parachute-${idx + 1}`,
          mode,
          isDrogue: !!parachute?.isDrogue,
          area: Math.max(0, toFiniteNumber(parachute?.area, 0)),
          start: Math.max(0, toFiniteNumber(parachute?.start, 0)),
          end: Math.max(0, toFiniteNumber(parachute?.end, 0)),
        } satisfies ParachuteConfig;
      });

    const parachutesChanged =
      normalizedParachutes.length !== sourceParachutes.length
      || normalizedParachutes.some((parachute, idx) => {
        const current = sourceParachutes[idx];
        if (!current) return true;

        const currentMode = current.mode === 'time' || current.mode === 'speed' || current.mode === 'altitude'
          ? current.mode
          : 'altitude';

        return (
          parachute.id !== current.id
          || parachute.mode !== currentMode
          || parachute.isDrogue !== !!current.isDrogue
          || Math.abs(parachute.area - Math.max(0, toFiniteNumber(current.area, 0))) > 1e-9
          || Math.abs(parachute.start - Math.max(0, toFiniteNumber(current.start, 0))) > 1e-9
          || Math.abs(parachute.end - Math.max(0, toFiniteNumber(current.end, 0))) > 1e-9
        );
      });

    if (parachutesChanged) {
      hasChanged = true;
      nextParachutes = normalizedParachutes;
    }

    const shouldEnableParachutes = normalizedParachutes.length > 0;
    if (!!nextSimulation.parachuteEnabled !== shouldEnableParachutes) {
      hasChanged = true;
      nextSimulation = {
        ...nextSimulation,
        parachuteEnabled: shouldEnableParachutes,
      };
    }

    if ((config.fairingSeparation as any)?.mode === 'stage_event') {
      hasChanged = true;
      nextFairingSeparation = {
        ...config.fairingSeparation,
        mode: 'fuel',
      };
    }

    // 2. Sync stages and engine instances
    const newStages = config.stages.map(stage => {
      let stageChanged = false;
      let normalizedStage = stage;
      let instances = [...stage.engineGroup.instances];

      if ((stage as any).separation?.mode === 'stage_event') {
        stageChanged = true;
        normalizedStage = {
          ...stage,
          separation: {
            ...stage.separation,
            mode: 'fuel',
          },
        };
      }
      
      // Sync engine count
      if (normalizedStage.engineGroup.engineCount !== instances.length) {
        stageChanged = true;
        if (normalizedStage.engineGroup.engineCount > instances.length) {
          for (let i = instances.length; i < normalizedStage.engineGroup.engineCount; i++) {
            instances.push({ 
              id: `S${normalizedStage.id}-E${i + 1}`, 
              points: [], 
              throttlePoints: [
                { id: 'start-' + i + '-' + Date.now(), t: 0, v: 1.0 }
              ] 
            });
          }
        } else {
          instances = instances.slice(0, normalizedStage.engineGroup.engineCount);
        }
      }

      // Ensure each instance has at least one throttle point
      const updatedInstances = instances.map(inst => {
        if (inst.throttlePoints.length === 0) {
          stageChanged = true;
          return {
            ...inst,
            throttlePoints: [{ id: 'auto-' + Date.now(), t: 0, v: 1.0 }]
          };
        }
        return inst;
      });

      if (stageChanged) {
        hasChanged = true;
        return { ...normalizedStage, engineGroup: { ...normalizedStage.engineGroup, instances: updatedInstances } };
      }
      return normalizedStage;
    });
    
    if (hasChanged) {
      onChange({ 
        ...config, 
        stages: newStages,
        pitchProgram: nextPitchProgram,
        pitchProgramEnabled: nextPitchProgramEnabled,
        simulation: nextSimulation,
        parachutes: nextParachutes,
        fairingSeparation: nextFairingSeparation,
      });
    }
  }, [config, onChange]);

  const validateSim = () => {
    const errors: string[] = [];
    if (config.simulation.dt <= 0) errors.push(tr('Time step must be > 0', 'Шаг времени должен быть > 0'));
    if (config.simulation.tMax <= 0) errors.push(tr('Simulation time must be > 0', 'Время симуляции должно быть > 0'));
    
    config.stages.forEach((s, i) => {
      const isLastStage = i === config.stages.length - 1;
      if (s.tank.fuelMass > 0 && s.engineGroup.engineCount === 0) {
        errors.push(tr(
          `Stage ${i + 1}: Fuel present but engine count is zero`,
          `Ступень ${i + 1}: есть топливо, но число двигателей равно нулю`
        ));
      }
      if (s.engineGroup.engineCount > 0 && (s.engineGroup.thrust <= 0 || s.engineGroup.massFlow <= 0)) {
        errors.push(tr(
          `Stage ${i + 1}: Engines present but thrust or mass flow <= 0`,
          `Ступень ${i + 1}: двигатели есть, но тяга или расход массы <= 0`
        ));
      }
      if (s.diameter <= 0) {
        errors.push(tr(`Stage ${i + 1}: Diameter must be > 0`, `Ступень ${i + 1}: диаметр должен быть > 0`));
      }
      const requiresSeparationValue = s.separation.mode === 'time' || s.separation.mode === 'altitude';
      if (!isLastStage && requiresSeparationValue && (s.separation.value === undefined || s.separation.value <= 0)) {
        errors.push(tr(
          `Stage ${i + 1}: Separation value missing or invalid`,
          `Ступень ${i + 1}: значение разделения отсутствует или некорректно`
        ));
      }
    });

    const parachutes = Array.isArray(config.parachutes) ? config.parachutes : [];
    if (parachutes.length > 0) {
      const firstMode = parachutes[0]?.mode;
      const hasMixedModes = parachutes.some((parachute) => parachute?.mode !== firstMode);
      if (hasMixedModes) {
        errors.push(tr(
          'All parachutes must use the same mode (time/altitude/speed).',
          'Все парашюты должны использовать один и тот же режим (время/высота/скорость).'
        ));
      }

      parachutes.forEach((parachute, idx) => {
        const area = Math.max(0, toFiniteNumber(parachute?.area, 0));
        const start = Math.max(0, toFiniteNumber(parachute?.start, 0));
        const end = Math.max(0, toFiniteNumber(parachute?.end, 0));
        if (area <= 0) {
          errors.push(tr(`Parachute ${idx + 1}: area must be > 0`, `Парашют ${idx + 1}: площадь должна быть > 0`));
        }
        if (Math.abs(start - end) < 1e-9) {
          errors.push(tr(`Parachute ${idx + 1}: deploy start/end must differ`, `Парашют ${idx + 1}: начало и конец раскрытия должны отличаться`));
        }
      });
    }

    if (config.stages.length > 0) {
      const firstStage = config.stages[0];
      const initialPitch = config.pitchProgramEnabled && config.pitchProgram.length > 0
        ? clamp(toFiniteNumber([...config.pitchProgram].sort((a, b) => a.t - b.t)[0].v, 90), 0, 360)
        : 90;

      const stageThrottles = firstStage.engineGroup.instances.map((instance) => {
        if (!instance.throttlePoints || instance.throttlePoints.length === 0) return 1;
        const sorted = [...instance.throttlePoints].sort((a, b) => a.t - b.t);
        const firstPoint = sorted[0];
        return clamp(toFiniteNumber(firstPoint.v, 1), 0, 1);
      });
      const averageThrottle = stageThrottles.length > 0
        ? stageThrottles.reduce((sum, val) => sum + val, 0) / stageThrottles.length
        : 1;

      const initialThrust = Math.max(0, toFiniteNumber(firstStage.engineGroup.thrust, 0))
        * Math.max(0, toFiniteNumber(firstStage.engineGroup.engineCount, 0))
        * averageThrottle;
      const initialVerticalThrust = initialThrust * Math.sin(initialPitch * Math.PI / 180);

      const initialMass = config.stages.reduce((sum, stage) => (
        sum
        + Math.max(0, toFiniteNumber(stage.structuralMass, 0))
        + Math.max(0, toFiniteNumber(stage.payloadMass, 0))
        + Math.max(0, toFiniteNumber(stage.tank.dryMass, 0))
        + Math.max(0, toFiniteNumber(stage.tank.fuelMass, 0))
        + Math.max(0, toFiniteNumber(stage.engineGroup.engineMass, 0)) * Math.max(0, toFiniteNumber(stage.engineGroup.engineCount, 0))
      ), Math.max(0, toFiniteNumber(config.fairingMass, 0)));

      const initialWeight = initialMass * 9.81;
      if (initialVerticalThrust <= initialWeight) {
        errors.push(
          tr(
            `Liftoff impossible: initial vertical thrust (${Math.round(initialVerticalThrust)} N) <= weight (${Math.round(initialWeight)} N). Increase thrust/engine count, reduce mass, keep pitch near 90° at start, or make sure Stage 01 is your booster stage.`,
            `Старт невозможен: начальная вертикальная тяга (${Math.round(initialVerticalThrust)} Н) <= весу ракеты (${Math.round(initialWeight)} Н). Увеличь тягу/число двигателей, уменьши массу, держи тангаж ближе к 90° на старте и проверь, что ступень 01 — бустерная.`
          )
        );
      }
    }
    
    setSimErrors(errors);
    return errors.length === 0;
  };

  const generateDemoTelemetry = () => {
    const points: TelemetryPoint[] = [];
    const tMax = config.simulation.tMax;
    const dt = config.simulation.dt;
    
    for (let t = 0; t <= tMax; t += dt * 20) {
      const altitude = Math.max(0, 50 * t * t - 0.05 * t * t * t);
      const downrange = 30 * t;
      const vVert = 100 * t - 0.15 * t * t;
      const vHor = 30;
      const vTotal = Math.sqrt(vVert * vVert + vHor * vHor);
      const accel = 15 - 0.005 * t;
      const mass = 50000 - 20 * t;
      const thrust = t < 200 ? 1500000 : 0;
      const mach = vTotal / 340;
      points.push({ t, altitude, downrange, vVert, vHor, vTotal, accel, mass, thrust, mach });
      if (altitude <= 0 && t > 10) break;
    }
    return points;
  };

  const runSimulationViaBridge = async (): Promise<TelemetryPoint[]> => {
    if (window.desktopApp?.runSimulation) {
      const result = await window.desktopApp.runSimulation({ config });
      if (!result.ok || !result.telemetry) {
        throw new Error(result.stderr || result.reason || 'Native simulation failed');
      }
      return result.telemetry;
    }

    return generateDemoTelemetry();
  };

  const handleExport = (format: 'CSV' | 'JSON') => {
    if (telemetry.length === 0) return;
    
    let content = '';
    let fileName = `telemetry_${config.missionName || 'rocket'}_${Date.now()}`;
    
    if (format === 'JSON') {
      content = JSON.stringify(telemetry, null, 2);
      fileName += '.json';
    } else {
      const headers = Object.keys(telemetry[0]).join(',');
      const rows = telemetry.map(p => Object.values(p).join(',')).join('\n');
      content = `${headers}\n${rows}`;
      fileName += '.csv';
    }
    
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleSaveProject = () => {
    const content = JSON.stringify(config, null, 2);
    const blob = new Blob([content], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${config.missionName || 'project'}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleLoadProject = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const loadedConfig = JSON.parse(event.target?.result as string);
        onChange(loadedConfig);
      } catch (err) {
        console.error("Failed to load project", err);
        alert(tr('Invalid project file', 'Некорректный файл проекта'));
      }
    };
    reader.readAsText(file);
  };

  const handleRunSim = async () => {
    if (!validateSim()) {
      setTelemetry([]);
      setPlayheadTime(0);
      setMode('SIMULATION');
      setSimStatus('ERROR');
      return;
    }
    setSimStatus('LOADING');
    setTelemetry([]);
    setPlayheadTime(0);
    setSimErrors([]);

    try {
      const data = await runSimulationViaBridge();
      if (!Array.isArray(data) || data.length === 0) {
        throw new Error(tr('Simulation returned no telemetry points', 'Симуляция не вернула телеметрию'));
      }
      setTelemetry(data);
      setSimStatus('PAUSED');
    } catch (error) {
      console.error('Simulation failed', error);
      setTelemetry([]);
      setSimStatus('ERROR');
      setSimErrors([error instanceof Error ? error.message : tr('Simulation failed', 'Симуляция завершилась с ошибкой')]);
    }
  };

  const currentTelemetryPoint = useMemo(() => {
    if (telemetry.length === 0) return null;
    if (telemetry.length === 1) return telemetry[0];

    const firstPoint = telemetry[0];
    const lastPoint = telemetry[telemetry.length - 1];
    const firstTime = toFiniteNumber(firstPoint.t);
    const lastTime = toFiniteNumber(lastPoint.t, firstTime);
    const targetTime = clamp(toFiniteNumber(playheadTime), firstTime, lastTime);

    if (targetTime <= firstTime) return firstPoint;
    if (targetTime >= lastTime) return lastPoint;

    let leftIdx = 0;
    let rightIdx = telemetry.length - 1;

    while (leftIdx + 1 < rightIdx) {
      const midIdx = Math.floor((leftIdx + rightIdx) / 2);
      const midTime = toFiniteNumber(telemetry[midIdx]?.t);
      if (midTime <= targetTime) {
        leftIdx = midIdx;
      } else {
        rightIdx = midIdx;
      }
    }

    const leftPoint = telemetry[leftIdx];
    const rightPoint = telemetry[rightIdx];
    const leftTime = toFiniteNumber(leftPoint.t);
    const rightTime = toFiniteNumber(rightPoint.t, leftTime);
    const span = rightTime - leftTime;
    if (span <= 1e-9) {
      return rightPoint;
    }

    const mix = clamp((targetTime - leftTime) / span, 0, 1);
    const lerp = (key: keyof TelemetryPoint, fallback = 0): number => {
      const leftVal = toFiniteNumber(leftPoint[key], fallback);
      const rightVal = toFiniteNumber(rightPoint[key], leftVal);
      return leftVal + (rightVal - leftVal) * mix;
    };

    return {
      t: targetTime,
      altitude: lerp('altitude'),
      downrange: lerp('downrange'),
      vVert: lerp('vVert'),
      vHor: lerp('vHor'),
      vTotal: lerp('vTotal'),
      accel: lerp('accel'),
      mass: lerp('mass'),
      thrust: lerp('thrust'),
      mach: lerp('mach'),
      pitch: lerp('pitch', 90),
    };
  }, [telemetry, playheadTime]);

  const simDuration = useMemo(() => {
    if (telemetry.length === 0) return 0;
    return toFiniteNumber(telemetry[telemetry.length - 1]?.t);
  }, [telemetry]);

  const launchDownrange = useMemo(() => {
    if (telemetry.length === 0) return 0;
    return toFiniteNumber(telemetry[0]?.downrange);
  }, [telemetry]);

  // Keep trajectory rendering cheap even on long flights.
  const trajectoryData = useMemo(() => {
    const maxTrajectoryPoints = 1500;
    if (telemetry.length <= maxTrajectoryPoints) {
      return telemetry;
    }

    const stride = Math.ceil(telemetry.length / maxTrajectoryPoints);
    const sampled = telemetry.filter((_, index) => index % stride === 0);
    const lastPoint = telemetry[telemetry.length - 1];

    if (sampled[sampled.length - 1] !== lastPoint) {
      sampled.push(lastPoint);
    }

    return sampled;
  }, [telemetry]);

  const trajectoryPlotPoints = useMemo(() => {
    return trajectoryData.map((point) => ({
      x: toFiniteNumber(point.downrange),
      y: Math.max(0, toFiniteNumber(point.altitude)),
    }));
  }, [trajectoryData]);

  const currentTrajectoryPoint = useMemo(() => {
    if (!currentTelemetryPoint) return null;
    const coreHeading = toFiniteNumber(currentTelemetryPoint.pitch, Number.NaN);
    const fallbackHeading = (
      Math.atan2(
        toFiniteNumber(currentTelemetryPoint.vVert),
        toFiniteNumber(currentTelemetryPoint.vHor)
      ) * 180 / Math.PI + 360
    ) % 360;
    return {
      x: toFiniteNumber(currentTelemetryPoint.downrange),
      y: Math.max(0, toFiniteNumber(currentTelemetryPoint.altitude)),
      headingDeg: Number.isFinite(coreHeading) ? coreHeading : fallbackHeading,
    };
  }, [currentTelemetryPoint]);

  useEffect(() => {
    if (simStatus !== 'RUNNING' || simDuration <= 0) return;

    const interval = setInterval(() => {
      setPlayheadTime((prev) => Math.min(simDuration, prev + 0.05 * playbackSpeed));
    }, 50);

    return () => clearInterval(interval);
  }, [simStatus, simDuration, playbackSpeed]);

  useEffect(() => {
    if (simStatus === 'RUNNING' && simDuration > 0 && playheadTime >= simDuration) {
      setSimStatus('DONE');
    }
  }, [playheadTime, simDuration, simStatus]);

  const handlePlaybackToggle = () => {
    if (telemetry.length === 0 || simDuration <= 0 || simStatus === 'LOADING') return;

    if (simStatus === 'RUNNING') {
      setSimStatus('PAUSED');
      return;
    }

    if (playheadTime >= simDuration) {
      setPlayheadTime(0);
    }

    setSimStatus('RUNNING');
  };

  const simulationEvents = useMemo<SimulationEvent[]>(() => {
    const events: SimulationEvent[] = [
      { id: 'ignition', t: 0, message: tr('Engine ignition command issued', 'Команда на зажигание двигателей'), level: 'info' },
    ];

    if (config.pitchProgramEnabled && Array.isArray(config.pitchProgram)) {
      const pitchPoints = [...config.pitchProgram]
        .map((point) => ({ ...point, t: toFiniteNumber(point.t), v: toFiniteNumber(point.v) }))
        .filter((point) => point.t > 0)
        .sort((a, b) => a.t - b.t);

      pitchPoints.forEach((point, idx) => {
        events.push({
          id: `pitch-${idx}-${point.id}`,
          t: point.t,
          message: tr(
            `Pitch program update: ${point.v.toFixed(1)} deg`,
            `Изменение тангажа: ${point.v.toFixed(1)}°`
          ),
          level: 'info',
        });
      });
    }

    config.stages.forEach((stage, stageIdx) => {
      const isLastStage = stageIdx === config.stages.length - 1;
      if (!isLastStage && stage.separation.mode === 'time' && toFiniteNumber(stage.separation.value) > 0) {
        events.push({
          id: `stage-separation-${stageIdx}`,
          t: toFiniteNumber(stage.separation.value),
          message: tr(`Stage ${stageIdx + 1} separation`, `Отделение ступени ${stageIdx + 1}`),
          level: 'warn',
        });
      }

      const throttleMoments = new Map<number, number[]>();
      stage.engineGroup.instances.forEach((engine) => {
        engine.throttlePoints.forEach((point) => {
          const tSec = toFiniteNumber(point.t);
          if (tSec <= 0) return;
          const key = Math.round(tSec * 10) / 10;
          const percent = clamp(toFiniteNumber(point.v) * 100, 0, 100);
          const bucket = throttleMoments.get(key) || [];
          bucket.push(percent);
          throttleMoments.set(key, bucket);
        });
      });

      [...throttleMoments.entries()]
        .sort((a, b) => a[0] - b[0])
        .forEach(([tSec, percentages], idx) => {
          const avg = percentages.reduce((sum, value) => sum + value, 0) / percentages.length;
          events.push({
            id: `throttle-${stageIdx}-${idx}`,
            t: tSec,
            message: tr(
              `Stage ${stageIdx + 1} engine mode update: throttle ${avg.toFixed(0)}%`,
              `Ступень ${stageIdx + 1}: изменение тяги до ${avg.toFixed(0)}%`
            ),
            level: 'info',
          });
        });
    });

    if (config.fairingSeparation.mode === 'time' && toFiniteNumber(config.fairingSeparation.value) > 0) {
      events.push({
        id: 'fairing-separation',
        t: toFiniteNumber(config.fairingSeparation.value),
        message: tr('Fairing separation', 'Отделение обтекателя'),
        level: 'warn',
      });
    }

    if (telemetry.length > 0) {
      const liftoffPoint = telemetry.find((point) => toFiniteNumber(point.altitude) > 1);
      if (liftoffPoint) {
        events.push({
          id: 'liftoff',
          t: toFiniteNumber(liftoffPoint.t),
          message: tr('Liftoff confirmed', 'Старт подтверждён'),
          level: 'success',
        });
      }

      const thrustEps = 1e-3;
      const burnoutConfirmWindowSec = 0.75;
      const burnoutMinGapSec = 1.0;
      const burnoutCandidateIndices: number[] = [];

      for (let i = 1; i < telemetry.length; i++) {
        const prevThrust = toFiniteNumber(telemetry[i - 1].thrust);
        const currThrust = toFiniteNumber(telemetry[i].thrust);
        if (prevThrust <= thrustEps || currThrust > thrustEps) {
          continue;
        }

        const burnoutTime = toFiniteNumber(telemetry[i].t);
        let reignitionInWindow = false;
        for (let j = i + 1; j < telemetry.length; j++) {
          const t = toFiniteNumber(telemetry[j].t);
          if (t > burnoutTime + burnoutConfirmWindowSec) break;
          if (toFiniteNumber(telemetry[j].thrust) > thrustEps) {
            reignitionInWindow = true;
            break;
          }
        }

        if (!reignitionInWindow) {
          burnoutCandidateIndices.push(i);
        }
      }

      let burnoutCounter = 0;
      let lastBurnoutTime = -Infinity;
      burnoutCandidateIndices.forEach((idx) => {
        const tSec = toFiniteNumber(telemetry[idx].t);
        if (tSec - lastBurnoutTime < burnoutMinGapSec) {
          return;
        }

        burnoutCounter += 1;
        const hasStageLabel = burnoutCounter <= config.stages.length;
        const stageLabel = hasStageLabel ? burnoutCounter : config.stages.length;

        events.push({
          id: `motor-burnout-${idx}`,
          t: tSec,
          message: hasStageLabel
            ? tr(`Stage ${stageLabel} engine burnout`, `Выгорание двигателей ступени ${stageLabel}`)
            : tr('Engine burnout detected', 'Обнаружено выгорание двигателей'),
          level: 'warn',
        });

        lastBurnoutTime = tSec;
      });

      const apogeePoint = telemetry.reduce((best, point) => (
        toFiniteNumber(point.altitude) > toFiniteNumber(best.altitude) ? point : best
      ), telemetry[0]);

      events.push({
        id: 'apogee',
        t: toFiniteNumber(apogeePoint.t),
        message: tr(
          `Apogee reached: ${Math.round(Math.max(0, toFiniteNumber(apogeePoint.altitude)))} m`,
          `Апогей достигнут: ${Math.round(Math.max(0, toFiniteNumber(apogeePoint.altitude)))} м`
        ),
        level: 'success',
      });

      const firstImpactPoint = telemetry.find((point, index) => (
        index > 0
        && toFiniteNumber(point.altitude) <= 0
        && toFiniteNumber(telemetry[index - 1].altitude) > 0
      ));

      if (firstImpactPoint) {
        events.push({
          id: 'impact',
          t: toFiniteNumber(firstImpactPoint.t),
          message: tr('Vehicle impact / ground contact detected', 'Касание поверхности'),
          level: 'warn',
        });
      }

      const plannedStageSeparationCount = events.filter((event) => event.id.startsWith('stage-separation-')).length;
      const maxStageSeparations = Math.max(0, config.stages.length - 1);
      const autoDetectedStageEventsLimit = Math.max(0, maxStageSeparations - plannedStageSeparationCount);
      if (autoDetectedStageEventsLimit > 0) {
        const massDrops: number[] = [];
        const massDropCandidates: Array<{ idx: number; t: number; drop: number }> = [];

        for (let i = 1; i < telemetry.length; i++) {
          const drop = toFiniteNumber(telemetry[i - 1].mass) - toFiniteNumber(telemetry[i].mass);
          if (drop > 0) {
            massDrops.push(drop);
          }
        }

        const avgMassDrop = massDrops.length > 0
          ? massDrops.reduce((sum, drop) => sum + drop, 0) / massDrops.length
          : 0;
        const stagingThreshold = Math.max(avgMassDrop * 6, 800);

        for (let i = 1; i < telemetry.length; i++) {
          const drop = toFiniteNumber(telemetry[i - 1].mass) - toFiniteNumber(telemetry[i].mass);
          const tSec = toFiniteNumber(telemetry[i].t);
          if (drop > stagingThreshold) {
            massDropCandidates.push({ idx: i, t: tSec, drop });
          }
        }

        // Keep only strongest candidates and enforce temporal spacing to avoid duplicate stage markers.
        const selectedStageEvents: Array<{ idx: number; t: number; drop: number }> = [];
        const minGapSec = 2.0;
        [...massDropCandidates]
          .sort((a, b) => b.drop - a.drop)
          .forEach((candidate) => {
            if (selectedStageEvents.length >= autoDetectedStageEventsLimit) return;
            const tooClose = selectedStageEvents.some((selected) => Math.abs(selected.t - candidate.t) < minGapSec);
            if (!tooClose) {
              selectedStageEvents.push(candidate);
            }
          });

        selectedStageEvents
          .sort((a, b) => a.t - b.t)
          .forEach((item) => {
            events.push({
              id: `staging-detected-${item.idx}`,
              t: item.t,
              message: tr(
                'Rapid mass drop detected (possible staging event)',
                'Обнаружен резкий сброс массы (возможное отделение ступени)'
              ),
              level: 'warn',
            });
          });
      }

      events.push({
        id: 'sim-finished',
        t: toFiniteNumber(telemetry[telemetry.length - 1].t),
        message: tr('Simulation output complete', 'Симуляция завершена'),
        level: 'info',
      });
    }

    const deduped = new Map<string, SimulationEvent>();
    events.forEach((event) => {
      const tRounded = Math.round(toFiniteNumber(event.t) * 10) / 10;
      const key = `${tRounded}|${event.message}`;
      if (!deduped.has(key)) {
        deduped.set(key, { ...event, t: tRounded });
      }
    });

    return [...deduped.values()].sort((a, b) => a.t - b.t);
  }, [config, telemetry, isRu]);

  const visibleSimulationEvents = useMemo(() => {
    return simulationEvents.filter((event) => event.t <= playheadTime + 0.0001);
  }, [simulationEvents, playheadTime]);

  const trajectoryEventMarkers = useMemo<FlightEventMarker[]>(() => {
    if (telemetry.length === 0 || simulationEvents.length === 0) {
      return [];
    }

    const formatDistanceCompact = (meters: number): string => {
      const absMeters = Math.abs(meters);
      if (absMeters >= 1000) {
        return `${(meters / 1000).toFixed(1)} ${isRu ? 'км' : 'km'}`;
      }
      return `${Math.round(meters)} ${isRu ? 'м' : 'm'}`;
    };

    const formatPositionValue = (altitudeMeters: number, downrangeMeters: number): string => {
      const altLabel = isRu ? 'Высота' : 'Altitude';
      const downrangeLabel = isRu ? 'Дальность' : 'Downrange';
      return `${altLabel}: ${formatDistanceCompact(altitudeMeters)} | ${downrangeLabel}: ${formatDistanceCompact(downrangeMeters)}`;
    };

    const extractNumber = (text: string, pattern: RegExp): number | null => {
      const match = text.match(pattern);
      if (!match) return null;
      const value = Number(match[1]);
      return Number.isFinite(value) ? value : null;
    };

    const markers: FlightEventMarker[] = [];
    let telemetryCursor = 0;

    for (const event of simulationEvents) {
      const eventTime = toFiniteNumber(event.t);
      if (eventTime < 0) continue;

      while (
        telemetryCursor + 1 < telemetry.length &&
        toFiniteNumber(telemetry[telemetryCursor + 1].t) <= eventTime
      ) {
        telemetryCursor += 1;
      }

      let selectedIndex = telemetryCursor;
      if (telemetryCursor + 1 < telemetry.length) {
        const currentDt = Math.abs(toFiniteNumber(telemetry[telemetryCursor].t) - eventTime);
        const nextDt = Math.abs(toFiniteNumber(telemetry[telemetryCursor + 1].t) - eventTime);
        if (nextDt < currentDt) {
          selectedIndex = telemetryCursor + 1;
        }
      }

      const point = telemetry[selectedIndex];
      const altitude = Math.max(0, toFiniteNumber(point.altitude));
      const downrange = toFiniteNumber(point.downrange);

      let type: FlightEventMarker['type'] = 'secondary';
      let priority: FlightEventMarker['priority'] = 'secondary';
      let importance: FlightEventMarker['importance'] = 'low';
      let title = event.message;
      let value: string | undefined = formatPositionValue(altitude, downrange);

      if (event.id === 'launch' || event.id === 'ignition' || event.id === 'liftoff') {
        type = 'launch';
        title = isRu ? 'Старт' : 'Launch';
        importance = 'medium';
      } else if (event.id.startsWith('motor-burnout')) {
        type = 'burnout';
        title = isRu ? 'Выгорание двигателя' : 'Motor Burnout';
        importance = 'medium';
      } else if (event.id.startsWith('pitch-')) {
        type = 'secondary';
        title = isRu ? 'Изменение тангажа' : 'Pitch Update';
        const pitchDeg = extractNumber(event.message, /([-+]?\d+(?:\.\d+)?)\s*(?:deg|°)/i);
        if (pitchDeg !== null) {
          value = `${pitchDeg.toFixed(1)}°`;
        }
        importance = 'medium';
      } else if (event.id.startsWith('throttle-')) {
        type = 'secondary';
        title = isRu ? 'Изменение тяги двигателя' : 'Engine Throttle Update';
        const throttlePct = extractNumber(event.message, /([-+]?\d+(?:\.\d+)?)\s*%/i);
        if (throttlePct !== null) {
          value = `${throttlePct.toFixed(0)}%`;
        }
        importance = 'medium';
      } else if (event.id === 'apogee') {
        type = 'apoapsis';
        priority = 'primary';
        importance = 'high';
        title = isRu ? 'Апогей' : 'Apoapsis';
        value = formatDistanceCompact(altitude);
      } else if (event.id === 'parachute-deploy') {
        type = 'parachute';
        title = isRu ? 'Выброс парашюта' : 'Parachute Deploy';
        importance = 'medium';
      } else if (event.id === 'landing' || event.id === 'impact') {
        type = 'landing';
        priority = 'primary';
        importance = 'high';
        title = isRu ? 'Посадка' : 'Landing';
      } else if (event.id.startsWith('stage-separation') || event.id.startsWith('staging-detected')) {
        type = 'stage-separation';
        title = isRu ? 'Отделение ступени' : 'Stage Separation';
        value = formatPositionValue(altitude, downrange);
        importance = 'high';
      } else if (event.id === 'fairing-separation') {
        type = 'secondary';
        title = isRu ? 'Отделение обтекателя' : 'Fairing Separation';
        value = formatPositionValue(altitude, downrange);
        importance = 'medium';
      } else if (event.id === 'sim-finished') {
        type = 'secondary';
        title = isRu ? 'Симуляция завершена' : 'Simulation complete';
        value = formatPositionValue(altitude, downrange);
        importance = 'medium';
      }

      markers.push({
        id: event.id,
        x: toFiniteNumber(point.downrange),
        y: altitude,
        t: eventTime,
        type,
        priority,
        importance,
        title,
        value,
      });
    }

    return markers;
  }, [telemetry, simulationEvents, isRu]);

  const eventDisplayMode: EventDisplayMode =
    config.simulation.eventDisplayMode && ['all', 'important', 'minimal'].includes(config.simulation.eventDisplayMode)
      ? config.simulation.eventDisplayMode
      : 'all';
  const rocketMarkerScale = clamp(toFiniteNumber((config.simulation as any)?.rocketMarkerScale, 1), 0.4, 3);
  const simStatusLabel = {
    IDLE: tr('IDLE', 'ОЖИДАНИЕ'),
    LOADING: tr('LOADING', 'ЗАГРУЗКА'),
    RUNNING: tr('RUNNING', 'ИДЁТ'),
    PAUSED: tr('PAUSED', 'ПАУЗА'),
    DONE: tr('DONE', 'ГОТОВО'),
    ERROR: tr('ERROR', 'ОШИБКА'),
  }[simStatus];

  useEffect(() => {
    if (!eventLogRef.current) return;
    eventLogRef.current.scrollTop = eventLogRef.current.scrollHeight;
  }, [visibleSimulationEvents.length]);

  useEffect(() => {
    if (!isSimSettingsOpen) return;

    const handleOutsideClick = (event: MouseEvent) => {
      if (!simSettingsMenuRef.current) return;
      if (!simSettingsMenuRef.current.contains(event.target as Node)) {
        setIsSimSettingsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [isSimSettingsOpen]);

  useEffect(() => {
    if (mode !== 'SIMULATION') {
      setIsSimSettingsOpen(false);
    }
  }, [mode]);

  const toggleNode = (id: string) => {
    const next = new Set(expandedNodes);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setExpandedNodes(next);
  };

  const isSelected = (item: SelectionType) => JSON.stringify(selection) === JSON.stringify(item);

  const Node = ({ id, label, icon, level = 0, onSelect, subItems = null, type, badge = null }: any) => {
    const isExpanded = expandedNodes.has(id);
    const active = isSelected(type);

    return (
      <div className="flex flex-col">
        <div 
          className={`group flex items-center py-2 px-3 cursor-pointer transition-all border-l-2 relative ${
            active 
              ? 'bg-blue-600/20 border-blue-500 text-blue-400' 
              : `border-transparent ${isDark ? 'text-gray-400 hover:bg-[#1a1a1a] hover:text-gray-200' : 'text-gray-500 hover:bg-gray-100 hover:text-gray-800'}`
          }`}
          style={{ paddingLeft: `${level * 16 + 12}px` }}
          onClick={(e) => {
            e.stopPropagation();
            onSelect();
            if (window.innerWidth < 1024 && type.type !== 'ROCKET') setMobileUI('PROPERTIES');
          }}
        >
          {subItems ? (
            <button onClick={(e) => { e.stopPropagation(); toggleNode(id); }} className="mr-1.5 p-1">
              {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
            </button>
          ) : <span className="w-[20px]" />}
          <span className={`mr-2.5 ${active ? 'text-blue-500' : 'text-gray-500'}`}>{icon}</span>
          <span className={`truncate text-[10px] md:text-[11px] tracking-wide uppercase font-semibold flex-1 ${active ? 'font-bold' : ''}`}>{label}</span>
          {badge && <span className={`ml-2 px-1 py-0.5 text-[8px] rounded border font-mono ${isDark ? 'bg-[#222] text-gray-500 border-[#333]' : 'bg-gray-50 text-gray-400 border-gray-200'}`}>{badge}</span>}
        </div>
        {isExpanded && subItems && <div className={`flex flex-col border-l-2 ml-[22px] ${isDark ? 'border-[#333]' : 'border-gray-100'}`}>{subItems}</div>}
      </div>
    );
  };

  const renderHierarchy = () => (
    <div className="flex flex-col py-2">
      <Node 
        id="rocket" label={tr('Rocket Assembly', 'Сборка ракеты')} icon={<Rocket size={14} />} 
        type={{ type: 'ROCKET' }} onSelect={() => setSelection({ type: 'ROCKET' })}
        subItems={
          <>
            <Node 
              id="pitch-program" label={tr('Pitch Program', 'Программа тангажа')} icon={<Target size={14} />}
              type={{ type: 'PITCH_POINT', pointIdx: -1 }} onSelect={() => setSelection({ type: 'PITCH_POINT', pointIdx: -1 })}
              badge={config.pitchProgramEnabled ? tr('ON', 'ВКЛ') : tr('OFF', 'ВЫКЛ')}
            />
            <Node
              id="parachutes"
              label={tr('Parachutes', 'Парашюты')}
              icon={<ArrowDown size={14} />}
              type={{ type: 'PARACHUTES' }}
              onSelect={() => setSelection({ type: 'PARACHUTES' })}
              badge={uiParachutes.length > 0 ? `${uiParachutes.length}` : tr('OFF', 'ВЫКЛ')}
              subItems={uiParachutes.map((parachute, idx) => (
                <Node
                  key={`parachute-${idx}`}
                  id={`parachute-${idx}`}
                  label={parachute.isDrogue ? tr('Drogue', 'Тормозной') : tr('Main', 'Основной')}
                  icon={<ArrowDown size={12} />}
                  level={1}
                  type={{ type: 'PARACHUTE', parachuteIdx: idx }}
                  onSelect={() => setSelection({ type: 'PARACHUTE', parachuteIdx: idx })}
                  badge={parachute.mode.toUpperCase()}
                />
              ))}
            />
            {config.stages.map((stage, sIdx) => (
              <Node 
                key={`s-${sIdx}`} id={`s-${sIdx}`} label={`${tr('Stage', 'Ступень')} 0${stage.id}`} icon={<Layers size={14} />}
                level={1} type={{ type: 'STAGE', stageIdx: sIdx }} onSelect={() => setSelection({ type: 'STAGE', stageIdx: sIdx })}
                subItems={
                  <>
                    <Node 
                      id={`s-${sIdx}-tank`} label={tr('Fuel Tank', 'Топливный бак')} icon={<Database size={14} />}
                      level={2} type={{ type: 'TANK', stageIdx: sIdx }} onSelect={() => setSelection({ type: 'TANK', stageIdx: sIdx })}
                      badge={`${stage.tank.fuelMass}${isRu ? 'кг' : 'kg'}`}
                    />
                    <Node 
                      id={`s-${sIdx}-engines`} label={tr('Engines', 'Двигатели')} icon={<Zap size={14} />}
                      level={2} type={{ type: 'ENGINE_GROUP', stageIdx: sIdx }} onSelect={() => setSelection({ type: 'ENGINE_GROUP', stageIdx: sIdx })}
                      badge={`x${stage.engineGroup.engineCount}`}
                      subItems={stage.engineGroup.instances.map((eng, eIdx) => (
                        <Node 
                          key={`e-${sIdx}-${eIdx}`} id={`e-${sIdx}-${eIdx}`} label={eng.id} icon={<Cpu size={12} />}
                          level={3} type={{ type: 'ENGINE_INSTANCE', stageIdx: sIdx, engineIdx: eIdx }} 
                          onSelect={() => setSelection({ type: 'ENGINE_INSTANCE', stageIdx: sIdx, engineIdx: eIdx })}
                        />
                      ))}
                    />
                  </>
                }
              />
            ))}
          </>
        }
      />
    </div>
  );

  const rightChartMode = useMemo<'THROTTLE' | 'PITCH' | null>(() => {
    if (selection.type === 'ENGINE_INSTANCE' || selection.type === 'THROTTLE_POINT') return 'THROTTLE';
    if (selection.type === 'PITCH_POINT') return 'PITCH';
    return null;
  }, [selection]);

  const rightChartData = useMemo(() => {
    if (rightChartMode === 'THROTTLE') {
      const stage = config.stages[selection.stageIdx];
      const engine = stage?.engineGroup.instances[selection.engineIdx!];
      if (!engine) return [];

      return [...engine.throttlePoints]
        .sort((a, b) => a.t - b.t)
        .map((p) => ({ ...p, time: p.t, value: p.v * 100 }));
    }

    if (rightChartMode === 'PITCH') {
      return [...config.pitchProgram]
        .sort((a, b) => a.t - b.t)
        .map((p) => ({ ...p, time: p.t, value: p.v }));
    }

    return [];
  }, [config, rightChartMode, selection]);

  const [draggingPointId, setDraggingPointId] = useState<string | null>(null);

  const updateRocket = (key: string, val: any) => {
    onChange({ ...config, [key]: val });
  };

  const updateStage = (idx: number, key: string, val: any) => {
    const newStages = [...config.stages];
    newStages[idx] = { ...newStages[idx], [key]: val };
    onChange({ ...config, stages: newStages });
  };

  const updateTank = (idx: number, key: string, val: any) => {
    const newStages = [...config.stages];
    newStages[idx] = { ...newStages[idx], tank: { ...newStages[idx].tank, [key]: val } };
    onChange({ ...config, stages: newStages });
  };

  const updateEngineGroup = (idx: number, key: string, val: any) => {
    const newStages = [...config.stages];
    newStages[idx] = { ...newStages[idx], engineGroup: { ...newStages[idx].engineGroup, [key]: val } };
    onChange({ ...config, stages: newStages });
  };

  const updateSimulationSetting = <K extends keyof RocketConfig['simulation']>(
    key: K,
    value: RocketConfig['simulation'][K]
  ) => {
    onChange({
      ...config,
      simulation: {
        ...config.simulation,
        [key]: value,
      },
    });
  };

  const uiParachutes = useMemo<ParachuteConfig[]>(() => {
    const source = Array.isArray(config.parachutes) ? config.parachutes : [];

    return source.map((parachute, idx) => ({
      id: (typeof parachute?.id === 'string' && parachute.id.trim().length > 0) ? parachute.id : `parachute-${idx + 1}`,
      mode: parachute?.mode === 'time' || parachute?.mode === 'speed' || parachute?.mode === 'altitude'
        ? parachute.mode
        : 'altitude',
      isDrogue: !!parachute?.isDrogue,
      area: Math.max(0, toFiniteNumber(parachute?.area, 0)),
      start: Math.max(0, toFiniteNumber(parachute?.start, 0)),
      end: Math.max(0, toFiniteNumber(parachute?.end, 0)),
    }));
  }, [config.parachutes]);

  const commitParachutes = (nextParachutes: ParachuteConfig[]) => {
    onChange({
      ...config,
      parachutes: nextParachutes,
      simulation: {
        ...config.simulation,
        parachuteEnabled: nextParachutes.length > 0,
      },
    });
  };

  const setParachuteCount = (requestedCount: number) => {
    const targetCount = Math.max(0, Math.min(6, Math.round(toFiniteNumber(requestedCount, uiParachutes.length))));
    const current = [...uiParachutes];
    if (targetCount === current.length) return;

    if (targetCount < current.length) {
      commitParachutes(current.slice(0, targetCount));
      return;
    }

    const next = [...current];
    while (next.length < targetCount) {
      const nextIndex = next.length;
      const shouldBeDrogue = targetCount > 1 && nextIndex === 0;
      next.push(createDefaultParachute(nextIndex, shouldBeDrogue));
    }
    commitParachutes(next);
  };

  const updateParachuteAt = (index: number, patch: Partial<ParachuteConfig>) => {
    if (index < 0 || index >= uiParachutes.length) return;
    const next = uiParachutes.map((item, idx) => (idx === index ? { ...item, ...patch } : item));
    commitParachutes(next);
  };

  const removeParachuteAt = (index: number) => {
    if (index < 0 || index >= uiParachutes.length) return;
    const next = uiParachutes.filter((_, idx) => idx !== index);
    commitParachutes(next);
  };

  const updateParachuteModeForAll = (mode: ParachuteConfig['mode']) => {
    const next = uiParachutes.map((parachute) => ({ ...parachute, mode }));
    commitParachutes(next);
  };

  const renderProperties = () => {
    if (selection.type === 'NONE') return (
      <div className="flex flex-col items-center justify-center h-full text-center opacity-30 select-none px-6">
        <Cpu size={48} className="text-blue-500 animate-pulse mb-4" />
        <h3 className="uppercase tracking-widest font-black text-[10px] text-blue-400">{t('editor_status_idle')}</h3>
      </div>
    );

    const renderField = (label: string, value: any, onChange: (val: any) => void, type: 'number' | 'text' | 'select' | 'checkbox' = 'number', options?: any[]) => (
      <div className="flex flex-col gap-2">
        {type === 'select' ? (
          <>
            <label className={`text-[11px] uppercase font-black tracking-widest ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>{label}</label>
            <select 
              value={value}
              onChange={(e) => onChange(e.target.value)}
              className={`w-full border p-2 text-[11px] font-bold outline-none focus:border-blue-500 rounded transition-colors ${isDark ? 'bg-[#111] border-[#333] text-white' : 'bg-gray-50 border-gray-200 text-gray-900'}`}
            >
              {options?.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
            </select>
          </>
        ) : type === 'checkbox' ? (
          <div className="flex items-center gap-2 pt-2">
            <input 
              type="checkbox"
              checked={value}
              onChange={(e) => onChange(e.target.checked)}
              className="w-4 h-4 accent-blue-600"
            />
            <span className={`text-[11px] uppercase font-black tracking-widest ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>{label}</span>
          </div>
        ) : type === 'number' ? (
          <NumericInput 
            label={label}
            value={value}
            onChange={onChange}
            isDark={isDark}
          />
        ) : (
          <>
            <label className={`text-[11px] uppercase font-black tracking-widest ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>{label}</label>
            <input 
              type={type}
              value={value}
              onChange={(e) => onChange(e.target.value)}
              className={`w-full border p-2 text-[11px] font-bold outline-none focus:border-blue-500 rounded transition-colors ${isDark ? 'bg-[#111] border-[#333] text-white' : 'bg-gray-50 border-gray-200 text-gray-900'}`}
            />
          </>
        )}
      </div>
    );

    const renderSeparation = (sep: any, onUpdate: (val: any) => void) => (
      <div className="space-y-3 p-3 border border-dashed border-[#333] rounded">
        <label className="text-[8px] uppercase font-black tracking-widest text-blue-500">{tr('Separation Logic', 'Логика разделения')}</label>
        {renderField(tr('Mode', 'Режим'), sep.mode, (v) => onUpdate({ ...sep, mode: v }), 'select', [
          { value: 'time', label: tr('Time (s)', 'Время (с)') },
          { value: 'altitude', label: tr('Altitude (m)', 'Высота (м)') },
          { value: 'fuel', label: tr('Fuel depletion', 'Выработка топлива') }
        ])}
        {sep.mode !== 'fuel' && renderField(tr('Value', 'Значение'), sep.value, (v) => onUpdate({ ...sep, value: v }))}
      </div>
    );

    const renderProfileEditor = (
      title: string,
      points: any[],
      onUpdate: (newPoints: any[]) => void,
      valueLabel: string,
      isThrottle: boolean = false,
      onApplyToStageEngines?: () => void
    ) => {
      const sortedPoints = [...points].sort((a, b) => a.t - b.t);
      
      const handleAdd = () => {
        const lastT = sortedPoints.length > 0 ? sortedPoints[sortedPoints.length - 1].t : 0;
        onUpdate([...points, { id: Date.now().toString(), t: lastT + 10, v: isThrottle ? 1.0 : 90 }]);
      };

      const handlePointUpdate = (id: string, key: 't' | 'v', val: number) => {
        let newPoints = points.map(p => {
          if (p.id === id) {
            const updated = { ...p, [key]: val };
            if (key === 't') updated.t = Math.max(0, val);
            if (key === 'v' && isThrottle) updated.v = Math.max(0, Math.min(1, val));
            if (key === 'v' && !isThrottle) updated.v = Math.max(0, Math.min(360, val));
            return updated;
          }
          return p;
        });
        
        // Sort and nudge duplicates
        newPoints.sort((a, b) => a.t - b.t);
        for (let i = 1; i < newPoints.length; i++) {
          if (newPoints[i].t <= newPoints[i-1].t) {
            newPoints[i].t = newPoints[i-1].t + 0.001;
          }
        }

        onUpdate(newPoints);
      };

      const chartData = [...points].sort((a, b) => a.t - b.t).map(p => ({ ...p, displayV: isThrottle ? p.v * 100 : p.v }));

      return (
        <div className="flex flex-col h-full overflow-hidden">
          <div className="flex items-center justify-between mb-4 shrink-0">
            <div className="flex items-center gap-2">
              <Activity size={16} className="text-blue-500" />
              <span className="text-[12px] font-black uppercase tracking-[0.2em] text-white">{title}</span>
            </div>
            <div className="flex items-center gap-2">
              {onApplyToStageEngines && (
                <button
                  onClick={onApplyToStageEngines}
                  className="p-1.5 bg-blue-600/10 text-blue-500 hover:bg-blue-600 hover:text-white rounded transition-all"
                  title={tr('Apply to all engines on this stage', 'Применить ко всем двигателям ступени')}
                >
                  <Copy size={16} />
                </button>
              )}
              <button onClick={handleAdd} className="p-1.5 bg-blue-600/10 text-blue-500 hover:bg-blue-600 hover:text-white rounded transition-all">
                <Plus size={16} />
              </button>
            </div>
          </div>
          
          <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 space-y-3 pb-20">
            {sortedPoints.map((p) => (
              <div key={p.id} className={`p-4 border-2 rounded flex items-center gap-4 transition-all shrink-0 ${isDark ? 'bg-[#0a0a0a] border-[#222] hover:border-blue-500/50' : 'bg-white border-gray-100 hover:border-blue-500/50'}`}>
                <div className="flex-1 grid grid-cols-2 gap-6">
                  <NumericInput 
                    label="T (s)"
                    value={p.t}
                    onChange={(v) => handlePointUpdate(p.id, 't', v)}
                    isDark={isDark}
                    className={`bg-transparent outline-none text-sm font-black ${isDark ? 'text-white' : 'text-gray-900'}`}
                  />
                  <NumericInput 
                    label={valueLabel}
                    value={p.v}
                    displayMultiplier={isThrottle ? 100 : 1}
                    onChange={(v) => handlePointUpdate(p.id, 'v', v)}
                    isDark={isDark}
                    min={0}
                    max={isThrottle ? 1 : 360}
                    className={`bg-transparent outline-none text-sm font-black ${isDark ? 'text-white' : 'text-gray-900'}`}
                  />
                </div>
                <button 
                  onClick={() => onUpdate(points.filter(pt => pt.id !== p.id))}
                  className="p-3 text-red-500 hover:bg-red-500/10 rounded transition-colors"
                >
                  <Trash2 size={18} />
                </button>
              </div>
            ))}
          </div>
        </div>
      );
    };

    switch (selection.type) {
      case 'ROCKET':
        return (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <header className={`border-b-2 pb-3 ${isDark ? 'border-blue-900/30' : 'border-blue-100'}`}>
              <h2 className={`font-black text-[16px] uppercase tracking-wider ${isDark ? 'text-white' : 'text-gray-900'}`}>{tr('Rocket Configuration', 'Конфигурация ракеты')}</h2>
            </header>
            <div className="space-y-6">
              {renderField(tr('Mission Name', 'Название миссии'), config.missionName, (v) => updateRocket('missionName', v), 'text')}
              {renderField(tr('Fairing Mass (kg)', 'Масса обтекателя (кг)'), config.fairingMass, (v) => updateRocket('fairingMass', v))}
              {renderSeparation(config.fairingSeparation, (v) => updateRocket('fairingSeparation', v))}
            </div>
          </div>
        );
      case 'PARACHUTES':
        return (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <header className={`border-b-2 pb-3 ${isDark ? 'border-blue-900/30' : 'border-blue-100'}`}>
              <h2 className={`font-black text-[16px] uppercase tracking-wider ${isDark ? 'text-white' : 'text-gray-900'}`}>{tr('Parachute System', 'Парашютная система')}</h2>
            </header>
            <div className="space-y-6">
              {renderField(
                tr('Number of Parachutes', 'Число парашютов'),
                uiParachutes.length,
                (v) => setParachuteCount(v)
              )}
              <div className={`p-3 border rounded text-[10px] uppercase font-black tracking-[0.12em] ${isDark ? 'border-[#1f2937] bg-[#0b1220] text-blue-300' : 'border-blue-200 bg-blue-50 text-blue-700'}`}>
                {tr(
                  'Select a parachute in hierarchy to edit area/type/deploy range. Core requires one shared mode for all parachutes.',
                  'Выбери парашют в иерархии для настройки площади/типа/диапазона раскрытия. Ядро требует общий режим для всех парашютов.'
                )}
              </div>
              {uiParachutes.length === 0 && (
                <div className={`p-3 border rounded text-[10px] uppercase font-black tracking-[0.12em] ${isDark ? 'border-[#2a2a2a] bg-[#101010] text-gray-400' : 'border-gray-200 bg-gray-50 text-gray-600'}`}>
                  {tr('Parachutes are disabled (count = 0).', 'Парашюты отключены (число = 0).')}
                </div>
              )}
            </div>
          </div>
        );
      case 'PARACHUTE': {
        const parachute = uiParachutes[selection.parachuteIdx];
        if (!parachute) {
          return null;
        }
        return (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <header className={`border-b-2 pb-3 ${isDark ? 'border-blue-900/30' : 'border-blue-100'}`}>
              <h2 className={`font-black text-[16px] uppercase tracking-wider ${isDark ? 'text-white' : 'text-gray-900'}`}>
                {tr('Parachute', 'Парашют')} {selection.parachuteIdx + 1}
              </h2>
            </header>
            <div className="space-y-6">
              {renderField(
                tr('Type', 'Тип'),
                parachute.isDrogue ? 'drogue' : 'main',
                (v) => updateParachuteAt(selection.parachuteIdx, { isDrogue: v === 'drogue' }),
                'select',
                [
                  { value: 'main', label: tr('Main', 'Основной') },
                  { value: 'drogue', label: tr('Drogue', 'Тормозной') },
                ]
              )}
              {renderField(
                tr('Mode', 'Режим'),
                parachute.mode,
                (v) => updateParachuteModeForAll(v as ParachuteConfig['mode']),
                'select',
                [
                  { value: 'altitude', label: tr('Altitude', 'Высота') },
                  { value: 'time', label: tr('Time', 'Время') },
                  { value: 'speed', label: tr('Speed', 'Скорость') },
                ]
              )}
              {renderField(
                tr('Area (m^2)', 'Площадь (м^2)'),
                parachute.area,
                (v) => updateParachuteAt(selection.parachuteIdx, { area: Math.max(0, toFiniteNumber(v, parachute.area)) })
              )}
              {renderField(
                tr('Deploy start', 'Начало раскрытия'),
                parachute.start,
                (v) => updateParachuteAt(selection.parachuteIdx, { start: Math.max(0, toFiniteNumber(v, parachute.start)) })
              )}
              {renderField(
                tr('Deploy end', 'Конец раскрытия'),
                parachute.end,
                (v) => updateParachuteAt(selection.parachuteIdx, { end: Math.max(0, toFiniteNumber(v, parachute.end)) })
              )}
              <button
                onClick={() => removeParachuteAt(selection.parachuteIdx)}
                className="w-full p-3 text-[10px] font-black uppercase tracking-widest text-red-500 border border-red-500/40 rounded hover:bg-red-500/10 transition-colors"
              >
                {tr('Remove Parachute', 'Удалить парашют')}
              </button>
            </div>
          </div>
        );
      }
      case 'PITCH_POINT':
        return (
          <div className="h-full flex flex-col space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 overflow-hidden">
            <header className={`border-b-2 pb-3 shrink-0 ${isDark ? 'border-blue-900/30' : 'border-blue-100'}`}>
              <h2 className={`font-black text-[16px] uppercase tracking-wider ${isDark ? 'text-white' : 'text-gray-900'}`}>{tr('Pitch Program', 'Программа тангажа')}</h2>
            </header>
            <div className="flex-1 flex flex-col space-y-6 overflow-hidden">
              <div className="shrink-0">
                {renderField(tr('Enable Pitch Program', 'Включить программу тангажа'), config.pitchProgramEnabled, (v) => updateRocket('pitchProgramEnabled', v), 'checkbox')}
              </div>
              <div className="flex-1 overflow-hidden">
                {config.pitchProgramEnabled && renderProfileEditor(tr('Pitch Schedule', 'График тангажа'), config.pitchProgram, (v) => updateRocket('pitchProgram', v), tr('Angle (deg)', 'Угол (град)'))}
              </div>
            </div>
          </div>
        );
      case 'STAGE': {
        const stage = config.stages[selection.stageIdx];
        const isLastStage = selection.stageIdx === config.stages.length - 1;
        return (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <header className={`border-b-2 pb-3 ${isDark ? 'border-blue-900/30' : 'border-blue-100'}`}>
              <h2 className={`font-black text-[16px] uppercase tracking-wider ${isDark ? 'text-white' : 'text-gray-900'}`}>{tr('Stage', 'Ступень')} 0{stage.id}</h2>
            </header>
            <div className="space-y-6">
              {renderField(tr('Structural Mass (kg)', 'Структурная масса (кг)'), stage.structuralMass, (v) => updateStage(selection.stageIdx, 'structuralMass', v))}
              {renderField(tr('Payload Mass (kg)', 'Масса полезной нагрузки (кг)'), stage.payloadMass, (v) => updateStage(selection.stageIdx, 'payloadMass', v))}
              {renderField(tr('Diameter (m)', 'Диаметр (м)'), stage.diameter, (v) => updateStage(selection.stageIdx, 'diameter', v))}
              {!isLastStage ? (
                renderSeparation(stage.separation, (v) => updateStage(selection.stageIdx, 'separation', v))
              ) : (
                <div className={`p-3 border rounded text-[10px] uppercase font-black tracking-[0.12em] ${isDark ? 'border-[#1f2937] bg-[#0b1220] text-blue-300' : 'border-blue-200 bg-blue-50 text-blue-700'}`}>
                  {tr('Final stage remains attached until end of simulation', 'Последняя ступень не отделяется до конца симуляции')}
                </div>
              )}
            </div>
          </div>
        );
      }
      case 'TANK': {
        const tank = config.stages[selection.stageIdx].tank;
        return (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <header className={`border-b-2 pb-3 ${isDark ? 'border-blue-900/30' : 'border-blue-100'}`}>
              <h2 className={`font-black text-[16px] uppercase tracking-wider ${isDark ? 'text-white' : 'text-gray-900'}`}>{tr('Fuel Tank', 'Топливный бак')}</h2>
            </header>
            <div className="space-y-6">
              {renderField(tr('Dry Mass (kg)', 'Сухая масса (кг)'), tank.dryMass, (v) => updateTank(selection.stageIdx, 'dryMass', v))}
              {renderField(tr('Fuel Mass (kg)', 'Масса топлива (кг)'), tank.fuelMass, (v) => updateTank(selection.stageIdx, 'fuelMass', v))}
            </div>
          </div>
        );
      }
      case 'ENGINE_GROUP': {
        const group = config.stages[selection.stageIdx].engineGroup;
        return (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <header className={`border-b-2 pb-3 ${isDark ? 'border-blue-900/30' : 'border-blue-100'}`}>
              <h2 className={`font-black text-[16px] uppercase tracking-wider ${isDark ? 'text-white' : 'text-gray-900'}`}>{tr('Engine Group', 'Группа двигателей')}</h2>
            </header>
            <div className="space-y-6">
              {renderField(tr('Number of Engines', 'Число двигателей'), group.engineCount, (v) => updateEngineGroup(selection.stageIdx, 'engineCount', v))}
              {renderField(tr('Thrust (N)', 'Тяга (Н)'), group.thrust, (v) => updateEngineGroup(selection.stageIdx, 'thrust', v))}
              {renderField(tr('Mass Flow (kg/s)', 'Расход массы (кг/с)'), group.massFlow, (v) => updateEngineGroup(selection.stageIdx, 'massFlow', v))}
              {renderField(tr('Engine Mass (kg)', 'Масса двигателя (кг)'), group.engineMass, (v) => updateEngineGroup(selection.stageIdx, 'engineMass', v))}
            </div>
          </div>
        );
      }
      case 'ENGINE_INSTANCE': {
        const stage = config.stages[selection.stageIdx];
        const engine = stage.engineGroup.instances[selection.engineIdx!];
        const applyThrottleToStageEngines = () => {
          const sourcePoints = [...engine.throttlePoints].sort((a, b) => a.t - b.t);
          const newStages = [...config.stages];

          newStages[selection.stageIdx].engineGroup.instances = newStages[selection.stageIdx].engineGroup.instances.map((inst, engineIdx) => ({
            ...inst,
            throttlePoints: sourcePoints.map((point, pointIdx) => ({
              ...point,
              id: `stage-${selection.stageIdx}-engine-${engineIdx}-pt-${pointIdx}-${Date.now()}`
            })),
          }));

          onChange({ ...config, stages: newStages });
        };
        
        return (
          <div className="h-full flex flex-col space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 overflow-hidden">
            <header className={`border-b-2 pb-3 shrink-0 ${isDark ? 'border-blue-900/30' : 'border-blue-100'}`}>
              <h2 className={`font-black text-[16px] uppercase tracking-wider ${isDark ? 'text-white' : 'text-gray-900'}`}>{engine.id}</h2>
            </header>
            <div className="flex-1 flex flex-col overflow-hidden">
              {renderProfileEditor(tr('Throttle Schedule', 'График тяги'), engine.throttlePoints, (v) => {
                const newStages = [...config.stages];
                newStages[selection.stageIdx].engineGroup.instances[selection.engineIdx!].throttlePoints = v;
                onChange({ ...config, stages: newStages });
              }, tr('Thrust (%)', 'Тяга (%)'), true, applyThrottleToStageEngines)}
            </div>
          </div>
        );
      }
      default:
        return null;
    }
  };

  const renderSimulation = () => {
    return (
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Sim Controls */}
		        <div className={`p-4 border-b-2 flex items-center justify-between ${isDark ? 'bg-[#0d0d0d] border-[#333]' : 'bg-white border-gray-200'}`}>
		          <div className="flex items-center gap-4 relative" ref={simSettingsMenuRef}>
		            <button 
		              onClick={handleRunSim}
		              disabled={simStatus === 'LOADING'}
		              className={`px-4 py-2 rounded text-[10px] font-black uppercase tracking-widest flex items-center gap-2 transition-all ${simStatus === 'LOADING' ? 'bg-[#222] text-gray-600' : 'bg-blue-600 text-white hover:bg-blue-500 shadow-lg'}`}
		            >
		              <Play size={14} fill="currentColor" /> {t('editor_launch_simulation')}
		            </button>
                <button
                  onClick={() => setIsSimSettingsOpen((prev) => !prev)}
                  className={`p-2 rounded border transition-all ${isDark ? 'border-[#333] text-gray-500 hover:text-white' : 'border-gray-200 text-gray-500 hover:text-gray-900'}`}
                  title={tr('Simulation settings', 'Настройки симуляции')}
                >
                  <Settings size={14} />
                </button>

                {isSimSettingsOpen && (
                  <div className={`absolute left-0 top-[calc(100%+10px)] z-40 w-[380px] border-2 rounded p-5 shadow-2xl ${isDark ? 'bg-[#050505] border-[#222]' : 'bg-white border-gray-200'}`}>
                    <div className="flex items-center gap-2 mb-4">
                      <Settings size={14} className="text-blue-500" />
                      <span className={`text-[11px] font-black uppercase tracking-[0.18em] ${isDark ? 'text-white' : 'text-gray-800'}`}>{t('setup_sim_settings')}</span>
                    </div>

                    <div className="grid grid-cols-2 gap-4 mb-5">
                      <NumericInput
                        label={tr('Time Step', 'Шаг времени')}
                        unit={tr('s', 'с')}
                        value={config.simulation.dt}
                        onChange={(v) => updateSimulationSetting('dt', Math.max(0.0001, toFiniteNumber(v, config.simulation.dt)))}
                        isDark={isDark}
                      />
                      <NumericInput
                        label={tr('Simulation Time', 'Время симуляции')}
                        unit={tr('s', 'с')}
                        value={config.simulation.tMax}
                        onChange={(v) => updateSimulationSetting('tMax', Math.max(1, toFiniteNumber(v, config.simulation.tMax)))}
                        isDark={isDark}
                      />
                    </div>

                    <div className="mb-5">
                      <label className={`block mb-2 text-[10px] uppercase font-black tracking-[0.16em] ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                        {tr('Event Display Mode', 'Режим отображения событий')}
                      </label>
                      <select
                        value={eventDisplayMode}
                        onChange={(e) => updateSimulationSetting('eventDisplayMode', e.target.value as EventDisplayMode)}
                        className={`w-full border rounded px-3 py-2 text-[11px] font-black uppercase tracking-[0.08em] outline-none ${isDark ? 'bg-[#0a0a0a] border-[#333] text-white' : 'bg-gray-50 border-gray-200 text-gray-900'}`}
                      >
                        <option value="all">{tr('All', 'Все')}</option>
                        <option value="important">{tr('Important', 'Важные')}</option>
                        <option value="minimal">{tr('Minimal', 'Минимум')}</option>
                      </select>
                    </div>

                    <div className="mb-5">
                      <label className={`block mb-2 text-[10px] uppercase font-black tracking-[0.16em] ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                        {tr('Rocket marker size', 'Размер маркера ракеты')}
                      </label>
                      <div className="flex items-center gap-3">
                        <input
                          type="range"
                          min="0.4"
                          max="3"
                          step="0.05"
                          value={rocketMarkerScale}
                          onChange={(e) => updateSimulationSetting('rocketMarkerScale', clamp(toFiniteNumber(e.target.value, rocketMarkerScale), 0.4, 3))}
                          className="flex-1 h-1 bg-blue-900/20 rounded-lg appearance-none cursor-pointer accent-blue-600"
                        />
                        <span className="min-w-[48px] text-right text-[10px] font-black text-blue-500">
                          {rocketMarkerScale.toFixed(2)}x
                        </span>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <label className="flex items-center justify-between">
                        <span className={`text-[10px] uppercase font-black tracking-[0.16em] ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                          {tr('Simulate until ground impact', 'Симуляция до удара о землю')}
                        </span>
                        <input
                          type="checkbox"
                          checked={config.simulation.stopOnImpact}
                          onChange={(e) => updateSimulationSetting('stopOnImpact', e.target.checked)}
                          className="w-4 h-4 accent-blue-600"
                        />
                      </label>
                    </div>
                  </div>
                )}
		          </div>
          
	          <div className="flex items-center gap-6">
	             <div className="flex flex-col items-end">
	                <span className="text-[8px] text-gray-500 uppercase font-bold">{tr('Simulation Status', 'Статус симуляции')}</span>
	                <span className={`text-[10px] font-black uppercase ${
                    simStatus === 'LOADING'
                      ? 'text-yellow-500'
                      : simStatus === 'RUNNING'
                        ? 'text-blue-500 animate-pulse'
                        : simStatus === 'DONE'
                          ? 'text-green-500'
                          : simStatus === 'ERROR'
                            ? 'text-red-500'
                            : 'text-gray-500'
                  }`}>{simStatusLabel}</span>
	             </div>
             <div className="flex gap-2">
               <button 
                 onClick={() => handleExport('JSON')}
                 className={`flex items-center gap-2 px-3 py-1.5 rounded border text-[10px] font-bold uppercase tracking-widest ${isDark ? 'border-[#333] text-gray-400 hover:text-white' : 'border-gray-200 text-gray-600 hover:text-gray-900'}`}
               >
                  <Download size={14} /> JSON
               </button>
               <button 
                 onClick={() => handleExport('CSV')}
                 className={`flex items-center gap-2 px-3 py-1.5 rounded border text-[10px] font-bold uppercase tracking-widest ${isDark ? 'border-[#333] text-gray-400 hover:text-white' : 'border-gray-200 text-gray-600 hover:text-gray-900'}`}
               >
                  <FileText size={14} /> CSV
               </button>
             </div>
          </div>
        </div>

        {simErrors.length > 0 && (
          <div className={`mx-4 mt-4 mb-2 rounded border px-4 py-3 flex items-start gap-3 ${isDark ? 'bg-red-950/30 border-red-700/50 text-red-200' : 'bg-red-50 border-red-200 text-red-700'}`}>
            <AlertTriangle size={16} className="mt-0.5 shrink-0" />
            <div className="text-[11px] font-black tracking-wide">
              {simErrors[0]}
              {simErrors.length > 1 && (
                <div className="mt-1 opacity-80">{tr('More errors', 'Дополнительные ошибки')}: {simErrors.length - 1}</div>
              )}
            </div>
          </div>
        )}

        <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
          {/* Left: Visualization & Scrubber */}
	         <div className="flex-1 flex flex-col border-r-2 border-[#333] relative">
		            {/* 2D Trajectory */}
		            <div className="flex-1 relative">
		               <EarthFlightPlot
		                 trajectoryPoints={trajectoryPlotPoints}
                     eventMarkers={trajectoryEventMarkers}
                     eventDisplayMode={eventDisplayMode}
                     rocketMarkerScale={rocketMarkerScale}
                     language={language === 'ru' ? 'ru' : 'en'}
		                 currentPoint={currentTrajectoryPoint}
		                 centerXAtT0={true}
		                 downrangeAtT0={launchDownrange}
		                 showGrid={true}
		                 showPoints={false}
                     showEventMarkers={true}
		                 highlightMaxAltitude={true}
		                 showApoapsisLabel={true}
		                 minZoom={1e-7}
		                 maxZoom={20}
		               />
		            </div>

             {/* Scrubber */}
             <div className={`p-4 border-t-2 ${isDark ? 'bg-[#0d0d0d] border-[#333]' : 'bg-white border-gray-200'}`}>
                <div className="flex items-center gap-4 mb-2">
                   <span className="text-[10px] font-black text-blue-500 w-16">{playheadTime.toFixed(1)}s</span>
                   <button
                     onClick={handlePlaybackToggle}
                     disabled={telemetry.length === 0 || simStatus === 'LOADING'}
                     className={`p-2 rounded border transition-all ${isDark ? 'border-[#333] text-gray-500' : 'border-gray-200 text-gray-400'} ${telemetry.length === 0 || simStatus === 'LOADING' ? 'opacity-40 cursor-not-allowed' : ''}`}
                     title={simStatus === 'RUNNING' ? tr('Pause playback', 'Пауза воспроизведения') : tr('Start playback', 'Запуск воспроизведения')}
                   >
                     {simStatus === 'RUNNING' ? <Pause size={14} /> : <Play size={14} fill="currentColor" />}
                   </button>
	                   <input 
	                     type="range" 
	                     min="0" 
	                     max={simDuration > 0 ? simDuration : 100}
	                     step="0.1"
	                     value={playheadTime}
	                     onChange={(e) => setPlayheadTime(parseFloat(e.target.value))}
	                     className="flex-1 h-1 bg-blue-900/20 rounded-lg appearance-none cursor-pointer accent-blue-600"
                   />
                   <div className="flex items-center gap-1">
                      <input
                        type="number"
                        min="0.01"
                        step="0.1"
                        value={Number.isFinite(playbackSpeed) ? playbackSpeed : 1}
                        onChange={(e) => {
                          const nextSpeed = toFiniteNumber(e.target.value, playbackSpeed);
                          if (nextSpeed > 0) {
                            setPlaybackSpeed(nextSpeed);
                          }
                        }}
                        className={`w-16 border rounded px-2 py-1 text-[10px] font-black outline-none focus:border-blue-500 ${isDark ? 'bg-[#111] border-[#333] text-white' : 'bg-gray-50 border-gray-200 text-gray-900'}`}
                        title={tr('Playback speed multiplier', 'Множитель скорости воспроизведения')}
                      />
                      <span className={`text-[10px] font-black ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>x</span>
                   </div>
                </div>
             </div>
          </div>

          {/* Right: Telemetry Graphs & Logs */}
          <div className={`lg:w-[450px] flex flex-col overflow-y-auto custom-scrollbar ${isDark ? 'bg-[#080808]' : 'bg-gray-50'}`}>
             <div className="p-5 border-b-2 border-[#333] flex items-center gap-3">
                <Activity size={16} className="text-blue-500" />
                <span className="text-[12px] font-black uppercase tracking-[0.2em]">{t('editor_telemetry')}</span>
             </div>
                           <div className="p-6 space-y-8">
                {/* Mini Charts */}
                {[ 
                  { label: tr('Altitude', 'Высота'), key: 'altitude', color: '#3b82f6', unit: isRu ? 'м' : 'm' },
                  { label: tr('Vertical Velocity', 'Вертикальная скорость'), key: 'vVert', color: '#10b981', unit: isRu ? 'м/с' : 'm/s' },
                  { label: tr('Horizontal Velocity', 'Горизонтальная скорость'), key: 'vHor', color: '#06b6d4', unit: isRu ? 'м/с' : 'm/s' },
                  { label: tr('Downrange', 'Дальность'), key: 'downrange', color: '#8b5cf6', unit: isRu ? 'м' : 'm' },
                  { label: tr('Acceleration', 'Ускорение'), key: 'accel', color: '#f59e0b', unit: isRu ? 'м/с^2' : 'm/s^2' },
                  { label: tr('Mass', 'Масса'), key: 'mass', color: '#ef4444', unit: isRu ? 'кг' : 'kg' },
                  { label: tr('Thrust', 'Тяга'), key: 'thrust', color: '#f43f5e', unit: 'N' },
                  { label: 'Mach', key: 'mach', color: '#d946ef', unit: '' },
                  { label: tr('Total Velocity', 'Полная скорость'), key: 'vTotal', color: '#2dd4bf', unit: isRu ? 'м/с' : 'm/s' }
                ].map(chart => (
                  <div key={chart.key} className="space-y-3">
                    <div className="flex justify-between items-end">
                       <label className="text-[11px] text-gray-500 uppercase font-black tracking-widest">{chart.label}</label>
                       <span className={`text-sm font-black ${isDark ? 'text-white' : 'text-gray-900'}`}>
                          {currentTelemetryPoint ? toFiniteNumber(currentTelemetryPoint[chart.key as keyof TelemetryPoint]).toFixed(1) : '0.0'} {chart.unit}
                       </span>
                    </div>
                    <div className="h-24 w-full bg-[#050505] rounded border-2 border-[#222]">
                       <ResponsiveContainer width="100%" height="100%">
                          <AreaChart data={telemetry}>
                             <XAxis type="number" dataKey="t" hide domain={['dataMin', 'dataMax']} />
                             <YAxis hide />
                             <Tooltip content={<CustomTooltip unit={chart.unit} isDark={isDark} />} />
                             <ReferenceLine
                               x={toFiniteNumber(playheadTime)}
                               stroke={isDark ? '#334155' : '#94a3b8'}
                               strokeWidth={1}
                               strokeDasharray="3 3"
                               ifOverflow="extendDomain"
                             />
                             {currentTelemetryPoint && (
                               <ReferenceDot
                                 x={toFiniteNumber(currentTelemetryPoint.t)}
                                 y={toFiniteNumber(currentTelemetryPoint[chart.key as keyof TelemetryPoint])}
                                 r={3.5}
                                 fill={chart.color}
                                 stroke={isDark ? '#0b0b0b' : '#ffffff'}
                                 strokeWidth={1.5}
                                 ifOverflow="visible"
                                 isFront
                               />
                             )}
                             <Area type="monotone" dataKey={chart.key} stroke={chart.color} fill={chart.color} fillOpacity={0.1} isAnimationActive={false} />
                          </AreaChart>
                       </ResponsiveContainer>
                    </div>
                  </div>
                ))}

	                {/* Log Panel */}
	                <div className="space-y-4">
	                   <label className="text-[11px] text-gray-500 uppercase font-black tracking-widest flex items-center gap-2">
	                      <FileText size={16} className="text-blue-500" /> {t('editor_event_log')}
	                   </label>
	                   <div ref={eventLogRef} className={`h-80 border-2 rounded p-5 overflow-y-auto font-mono text-[11px] space-y-3 leading-relaxed ${isDark ? 'bg-[#050505] border-[#222] text-gray-300' : 'bg-white border-gray-200 text-gray-700'}`}>
	                      {visibleSimulationEvents.length === 0 && simErrors.length === 0 && (
	                        <div className="text-gray-500 font-black tracking-widest">[0.0s] {tr('Ready to start playback', 'Готово к запуску воспроизведения')}</div>
	                      )}
	                      {visibleSimulationEvents.map((event) => (
	                        <div
	                          key={event.id}
	                          className={`flex items-center gap-2 font-black tracking-widest ${
                              event.level === 'success'
                                ? 'text-green-500'
                                : event.level === 'warn'
                                  ? 'text-yellow-500'
                                  : event.level === 'error'
                                    ? 'text-red-500'
                                    : 'text-blue-500'
                            }`}
	                        >
	                          {event.level === 'warn' || event.level === 'error' ? <AlertTriangle size={12} /> : <Info size={12} />}
	                          [{event.t.toFixed(1)}s] {event.message}
	                        </div>
	                      ))}
	                      {simErrors.map((err, i) => (
	                        <div key={`error-${i}`} className="text-red-500 flex items-center gap-2 font-black tracking-widest">
	                           <AlertTriangle size={12} /> {err}
	                        </div>
	                      ))}
	                   </div>
	                </div>
              </div>
          </div>
        </div>
      </div>
    );
  };
  return (
    <div className={`flex flex-col h-full w-full font-mono transition-colors duration-300 ${isDark ? 'bg-[#0a0a0a] text-gray-400' : 'bg-gray-50 text-gray-600'}`}>
      {/* Top Header - Mobile Compact */}
      <div className={`flex items-center justify-between px-4 md:px-8 py-3 border-b-2 z-50 ${isDark ? 'bg-[#0d0d0d] border-[#333]' : 'bg-white border-gray-200 shadow-sm'}`}>
        <div className="flex items-center gap-4">
          <button onClick={onBack} className={`flex items-center gap-2 transition-all text-[10px] font-black uppercase tracking-[0.2em] ${isDark ? 'hover:text-white' : 'hover:text-blue-600'}`}>
            <ChevronLeft size={16} className="text-blue-500" /> <span className="hidden sm:inline">{tr('Back to Setup', 'К настройкам')}</span>
          </button>
          <div className="h-4 w-[1px] bg-gray-600/30"></div>
          <div className="flex items-center gap-2">
             <Rocket size={14} className="text-blue-500" />
             <span className={`text-[10px] font-black uppercase tracking-widest truncate max-w-[100px] md:max-w-none ${isDark ? 'text-white' : 'text-gray-800'}`}>{config.missionName}</span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex gap-2 mr-2">
            <button 
              onClick={handleSaveProject}
              className={`p-2 rounded border ${isDark ? 'border-[#333] text-gray-400 hover:text-white' : 'border-gray-200 text-gray-600 hover:text-gray-900'}`}
              title={tr('Save project', 'Сохранить проект')}
            >
              <Save size={16} />
            </button>
            <label className={`p-2 rounded border cursor-pointer ${isDark ? 'border-[#333] text-gray-400 hover:text-white' : 'border-gray-200 text-gray-600 hover:text-gray-900'}`} title={tr('Load project', 'Загрузить проект')}>
              <input type="file" accept=".json" onChange={handleLoadProject} className="hidden" />
              <Database size={16} />
            </label>
          </div>
          <div className={`flex p-1 rounded border ${isDark ? 'bg-[#111] border-[#333]' : 'bg-gray-100 border-gray-200'}`}>
            <button 
              onClick={() => setMode('BUILDER')}
              className={`px-3 py-1 text-[9px] font-black uppercase tracking-widest rounded transition-all flex items-center gap-2 ${mode === 'BUILDER' ? 'bg-blue-600 text-white shadow-lg' : 'text-gray-500 hover:text-gray-300'}`}
            >
              <Layout size={12} /> {tr('Builder', 'Конструктор')}
            </button>
            <button 
              onClick={() => setMode('SIMULATION')}
              className={`px-3 py-1 text-[9px] font-black uppercase tracking-widest rounded transition-all flex items-center gap-2 ${mode === 'SIMULATION' ? 'bg-blue-600 text-white shadow-lg' : 'text-gray-500 hover:text-gray-300'}`}
            >
              <PlayCircle size={12} /> {tr('Simulation', 'Симуляция')}
            </button>
          </div>
          <button onClick={() => setMobileUI('HIERARCHY')} className="lg:hidden p-2 hover:bg-blue-500/10 rounded transition-colors text-blue-500">
            <MenuIcon size={20} />
          </button>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden relative">
        {mode === 'BUILDER' ? (
          <>
            {/* Sidebar Hierarchy - Drawer on Mobile */}
            <div className={`
              lg:w-72 border-r-2 flex flex-col z-40 transition-all duration-300
              ${isDark ? 'bg-[#0d0d0d] border-[#333]' : 'bg-white border-gray-200'}
              ${mobileUI === 'HIERARCHY' ? 'fixed inset-y-0 left-0 w-4/5' : 'hidden lg:flex'}
            `}>
              <div className={`px-5 py-4 border-b-2 flex items-center justify-between ${isDark ? 'bg-[#0f0f0f] border-[#333]' : 'bg-gray-50 border-gray-100'}`}>
                <span className={`uppercase tracking-widest font-black text-[12px] ${isDark ? 'text-white' : 'text-gray-800'}`}>{t('editor_hierarchy')}</span>
                <button onClick={() => setMobileUI('NONE')} className="lg:hidden p-1">
                  <ChevronLeft size={20} />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto custom-scrollbar">
                {renderHierarchy()}
              </div>
            </div>

            {/* Property Drawer on Mobile */}
            <div className={`
              lg:w-[380px] border-r-2 p-6 md:p-8 flex flex-col z-40 transition-all duration-300
              ${isDark ? 'bg-[#0d0d0d] border-[#333]' : 'bg-white border-gray-100'}
              ${mobileUI === 'PROPERTIES' ? 'fixed inset-y-0 right-0 w-4/5' : 'hidden lg:flex'}
            `}>
              <button onClick={() => setMobileUI('NONE')} className="lg:hidden absolute top-4 left-4 p-2 text-blue-500">
                <ChevronRight size={24} />
              </button>
              {renderProperties()}
            </div>

            {/* Main Content Area */}
            <div className={`flex-1 flex flex-col overflow-hidden relative transition-colors duration-300 ${isDark ? 'bg-[#050505]' : 'bg-gray-50'}`}>
               {/* Grid Background */}
               <div className={`absolute inset-0 pointer-events-none ${isDark ? 'opacity-[0.4]' : 'opacity-[0.15]'}`} 
                    style={{ backgroundImage: `linear-gradient(${isDark ? '#444' : '#000'} 1px, transparent 1px), linear-gradient(90deg, ${isDark ? '#444' : '#000'} 1px, transparent 1px)`, backgroundSize: '60px 60px' }}></div>
               
               {/* Mobile View Indicators */}
                <div className="lg:hidden flex justify-center gap-4 py-3 z-10">
                   <button onClick={() => setMobileUI('HIERARCHY')} className="px-3 py-1 bg-blue-600/10 text-blue-500 rounded-full text-[8px] font-black uppercase tracking-widest flex items-center gap-1 border border-blue-500/30">
                    <MenuIcon size={10} /> {tr('Hierarchy', 'Иерархия')}
                   </button>
                   <button onClick={() => setMobileUI('PROPERTIES')} className="px-3 py-1 bg-blue-600/10 text-blue-500 rounded-full text-[8px] font-black uppercase tracking-widest flex items-center gap-1 border border-blue-500/30">
                    <Edit size={10} /> {tr('Properties', 'Свойства')}
                   </button>
                </div>

               <div className="flex-1 flex flex-col items-center justify-center relative p-8">
                  <div className={`w-full h-full border-2 backdrop-blur-sm rounded-sm flex flex-col p-10 transition-all duration-300 shadow-2xl relative ${isDark ? 'border-[#222] bg-[#070707]/90' : 'border-gray-200 bg-white/80'}`}>
                     <div className="absolute -top-3 -left-3 w-10 h-10 border-t-4 border-l-4 border-blue-500"></div>
                     <div className="absolute -bottom-3 -right-3 w-10 h-10 border-b-4 border-r-4 border-blue-500"></div>
                     
                     <div className="flex items-center gap-4 mb-10">
                        <Activity size={24} className="text-blue-500" />
                         <span className={`text-[14px] font-black uppercase tracking-[0.3em] ${isDark ? 'text-white' : 'text-gray-800'}`}>
                          {rightChartMode === 'PITCH'
                            ? tr('Flight Angle Profile', 'Профиль угла полёта')
                            : t('editor_throttle_profile')}
                        </span>
                      </div>

                     <div className="flex-1 w-full">
                        {rightChartMode ? (
                          <ResponsiveContainer width="100%" height="100%">
                            <LineChart
                              data={rightChartData}
                              onMouseDown={(e) => {
                                if (!e || !e.activePayload || !rightChartMode) return;
                                setDraggingPointId(e.activePayload[0].payload.id);
                              }}
                              margin={{ top: 20, right: 40, left: 20, bottom: 40 }}
                            >
                              <CartesianGrid strokeDasharray="3 3" stroke={isDark ? '#222' : '#eee'} vertical={true} />
                              <XAxis
                                dataKey="time"
                                type="number"
                                domain={['auto', 'auto']}
                                stroke="#666"
                                fontSize={12}
                                fontWeight="bold"
                                tickFormatter={(v) => `${v}s`}
                              >
                                <Label value="T(S)" offset={-20} position="insideBottom" fill="#3b82f6" fontSize={14} fontWeight="black" />
                              </XAxis>
                              <YAxis
                                domain={rightChartMode === 'PITCH' ? [0, 360] : [0, 100]}
                                stroke="#666"
                                fontSize={12}
                                fontWeight="bold"
                                tickFormatter={(v) => (rightChartMode === 'PITCH' ? `${v}°` : `${v}%`)}
                              >
                                <Label
                                  value={rightChartMode === 'PITCH' ? tr('ANGLE', 'УГОЛ') : tr('THRUST', 'ТЯГА')}
                                  angle={-90}
                                  position="insideLeft"
                                  offset={10}
                                  fill="#3b82f6"
                                  fontSize={14}
                                  fontWeight="black"
                                />
                              </YAxis>
                              <Tooltip content={<CustomTooltip unit={rightChartMode === 'PITCH' ? '°' : '%'} isDark={isDark} />} />
                              <Line
                                type="linear"
                                dataKey="value"
                                name={rightChartMode === 'PITCH' ? tr('Angle', 'Угол') : tr('Thrust', 'Тяга')}
                                stroke="#3b82f6"
                                strokeWidth={4}
                                dot={{ r: 6, fill: '#3b82f6', strokeWidth: 0, cursor: 'grab' }}
                                activeDot={{ r: 10, fill: '#fff', stroke: '#3b82f6', strokeWidth: 3 }}
                                isAnimationActive={false}
                              />
                              <Customized
                                component={DragLayer}
                                onUpdate={(newPoints: any) => {
                                  if (rightChartMode === 'THROTTLE' && (selection.type === 'ENGINE_INSTANCE' || selection.type === 'THROTTLE_POINT')) {
                                    const newStages = [...config.stages];
                                    newStages[selection.stageIdx].engineGroup.instances[selection.engineIdx!].throttlePoints = newPoints;
                                    onChange({ ...config, stages: newStages });
                                  } else if (rightChartMode === 'PITCH') {
                                    updateRocket('pitchProgram', newPoints);
                                  }
                                }}
                                points={
                                  rightChartMode === 'THROTTLE'
                                    ? ((selection.type === 'ENGINE_INSTANCE' || selection.type === 'THROTTLE_POINT')
                                      ? config.stages[selection.stageIdx].engineGroup.instances[selection.engineIdx!].throttlePoints
                                      : [])
                                    : config.pitchProgram
                                }
                                isThrottle={rightChartMode === 'THROTTLE'}
                                draggingId={draggingPointId}
                                setDraggingId={setDraggingPointId}
                              />
                            </LineChart>
                          </ResponsiveContainer>
                        ) : (
                          <div className="h-full w-full flex items-center justify-center text-center px-6">
                            <p className={`text-[11px] uppercase tracking-[0.16em] font-black ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                              {tr('Select an engine or pitch program to view profile', 'Выберите двигатель или программу тангажа для просмотра профиля')}
                            </p>
                          </div>
                        )}
                     </div>
                  </div>
               </div>
            </div>
          </>
        ) : (
          renderSimulation()
        )}
      </div>

    </div>
  );
};

export default EditorView;

