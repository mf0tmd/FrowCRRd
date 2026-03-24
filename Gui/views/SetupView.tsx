
import React, { useState, useEffect } from 'react';
import { ChevronLeft, Play, Boxes, Zap, Plus, Minus, Settings2, Edit3, ChevronDown, Trash2 } from 'lucide-react';
import { RocketConfig, StageConfig, TankConfig, EngineGroupConfig, ParachuteConfig } from '../types';

const NumericInput: React.FC<{
  value: any;
  onChange: (val: number) => void;
  isDark: boolean;
  className?: string;
  min?: number;
  max?: number;
  label?: string;
  unit?: string;
  step?: string;
}> = ({ value, onChange, isDark, className, min, max, label, unit, step }) => {
  const [draft, setDraft] = useState<string>(
    value === '' || value === undefined || value === null ? '' : value.toString()
  );

  useEffect(() => {
    if (value !== '' && value !== undefined && value !== null) {
      if (parseFloat(draft) !== parseFloat(value)) {
        setDraft(value.toString());
      }
    } else {
      setDraft('');
    }
  }, [value]);

  const commit = () => {
    if (draft === '') {
      setDraft(value.toString());
      return;
    }
    let num = parseFloat(draft);
    if (isNaN(num)) {
      setDraft(value.toString());
      return;
    }
    if (min !== undefined) num = Math.max(min, num);
    if (max !== undefined) num = Math.min(max, num);
    onChange(num);
    setDraft(num.toString());
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
        className={className || `w-full border p-2 text-xs font-bold outline-none focus:border-blue-500 rounded transition-colors ${isDark ? 'bg-[#0a0a0a] border-[#333] text-white' : 'bg-gray-50 border-gray-200 text-gray-900'}`}
      />
    </div>
  );
};

interface SetupViewProps {
  config: RocketConfig;
  onChange: (config: RocketConfig) => void;
  onBack: () => void;
  onConfirm: () => void;
  t: (key: any) => string;
  theme: 'dark' | 'light';
  language?: 'ru' | 'en';
}

const createDefaultParachute = (index: number, type: 'main' | 'drogue'): ParachuteConfig => {
  const isDrogue = type === 'drogue';
  return {
    id: `${isDrogue ? 'drogue' : 'main'}-setup-${index + 1}`,
    mode: 'altitude',
    isDrogue,
    area: isDrogue ? 16 : 80,
    start: isDrogue ? 8000 : 2500,
    end: isDrogue ? 3000 : 0,
  };
};

const SetupView: React.FC<SetupViewProps> = ({ config, onChange, onBack, onConfirm, t, theme, language }) => {
  const [selectedStageIdx, setSelectedStageIdx] = useState(0);
  const [mobilePanel, setMobilePanel] = useState<'SETUP' | 'NONE'>('NONE');
  const isDark = theme === 'dark';
  const isRu = language === 'ru';
  const tr = (en: string, ru: string) => (isRu ? ru : en);
  const selectedStage = config.stages[selectedStageIdx];
  const uiParachutes: ParachuteConfig[] = (Array.isArray(config.parachutes) ? config.parachutes : []).map((parachute, idx) => ({
    id: (typeof parachute?.id === 'string' && parachute.id.trim().length > 0) ? parachute.id : `parachute-${idx + 1}`,
    mode: parachute?.mode === 'time' || parachute?.mode === 'speed' || parachute?.mode === 'altitude'
      ? parachute.mode
      : 'altitude',
    isDrogue: !!parachute?.isDrogue,
    area: Math.max(0, Number(parachute?.area) || 0),
    start: Math.max(0, Number(parachute?.start) || 0),
    end: Math.max(0, Number(parachute?.end) || 0),
  }));
  const localizedMissionType = config.missionType === 'Testing'
    ? tr('Testing', 'Тестирование')
    : config.missionType;

  useEffect(() => {
    if (config.simulation.dragEnabled) return;

    onChange({
      ...config,
      simulation: {
        ...config.simulation,
        dragEnabled: true,
      },
    });
  }, [
    config,
    onChange,
    config.simulation.dragEnabled,
  ]);

  const updateGlobalStages = (count: number) => {
    const newCount = Math.max(1, Math.min(5, count));
    let newStages = [...config.stages];
    if (newCount > newStages.length) {
      for (let i = newStages.length; i < newCount; i++) {
        newStages.push({
          id: i + 1,
          structuralMass: 2000,
          payloadMass: 0,
          diameter: 3.0,
          separation: { mode: 'time', value: 120 },
          tank: { dryMass: 500, fuelMass: 10000 },
          engineGroup: {
            engineType: 'PHOENIX',
            engineCount: 1,
            thrust: 250000,
            massFlow: 80,
            engineMass: 400,
            instances: []
          },
          // Compatibility
          tanks: 1,
          hasFuelTank: true,
          fuelMass: 10,
          engineCount: 1,
          engineType: 'PHOENIX',
          engineInstances: [],
          fuelLevel: 1.0,
        });
      }
    } else {
      newStages = newStages.slice(0, newCount);
    }
    if (selectedStageIdx >= newCount) setSelectedStageIdx(newCount - 1);
    onChange({ ...config, stages: newStages });
  };

  const deleteStage = (idx: number) => {
    if (config.stages.length <= 1) return;
    const newStages = config.stages.filter((_, i) => i !== idx);
    const indexedStages = newStages.map((s, i) => ({ ...s, id: i + 1 }));
    
    let newSelectedIdx = selectedStageIdx;
    if (selectedStageIdx === idx) {
      newSelectedIdx = Math.max(0, idx - 1);
    } else if (selectedStageIdx > idx) {
      newSelectedIdx = selectedStageIdx - 1;
    }
    
    setSelectedStageIdx(newSelectedIdx);
    onChange({ ...config, stages: indexedStages });
  };

  const updateStageProperty = (idx: number, key: keyof StageConfig, val: any) => {
    const newStages = config.stages.map((s, i) => i === idx ? { ...s, [key]: val } : s);
    onChange({ ...config, stages: newStages });
  };

  const updateTankProperty = (idx: number, key: keyof TankConfig, val: any) => {
    const newStages = [...config.stages];
    newStages[idx] = { ...newStages[idx], tank: { ...newStages[idx].tank, [key]: val } };
    onChange({ ...config, stages: newStages });
  };

  const updateEngineProperty = (idx: number, key: keyof EngineGroupConfig, val: any) => {
    const newStages = [...config.stages];
    newStages[idx] = { ...newStages[idx], engineGroup: { ...newStages[idx].engineGroup, [key]: val } };
    onChange({ ...config, stages: newStages });
  };

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

  const updateParachuteCount = (requestedCount: number) => {
    const targetCount = Math.max(0, Math.min(6, Math.round(Number(requestedCount) || 0)));
    if (targetCount === uiParachutes.length) return;

    if (targetCount < uiParachutes.length) {
      commitParachutes(uiParachutes.slice(0, targetCount));
      return;
    }

    const nextParachutes = [...uiParachutes];
    while (nextParachutes.length < targetCount) {
      const nextIndex = nextParachutes.length;
      const defaultType: 'main' | 'drogue' = targetCount > 1 && nextIndex === 0 ? 'drogue' : 'main';
      nextParachutes.push(createDefaultParachute(nextIndex, defaultType));
    }
    commitParachutes(nextParachutes);
  };

  const updateParachuteType = (index: number, type: 'main' | 'drogue') => {
    if (index < 0 || index >= uiParachutes.length) return;
    const isDrogue = type === 'drogue';
    const nextParachutes = uiParachutes.map((parachute, idx) => {
      if (idx !== index) return parachute;
      return {
        ...parachute,
        isDrogue,
      };
    });
    commitParachutes(nextParachutes);
  };

  const engineSpecs = {
    PHOENIX: { label: 'Phoenix', color: '#3b82f6', desc: 'Standard liquid engine.', thrust: 1.2 },
    RAPTOR: { label: 'Raptor', color: '#f97316', desc: 'Methane high pressure engine.', thrust: 2.1 },
    ION: { label: 'Ion', color: '#a855f7', desc: 'Deep space plasma engine.', thrust: 0.15 }
  };

  // Mass calculation logic
  const calculateTotalMass = () => {
    const baseMass = config.fairingMass / 1000; 
    const total = config.stages.reduce((acc, s) => {
      const stageDryMass = s.structuralMass / 1000;
      const payloadMass = s.payloadMass / 1000;
      const engineMass = (s.engineGroup.engineCount * s.engineGroup.engineMass) / 1000;
      const tankDryMass = s.tank.dryMass / 1000;
      const fuelMass = s.tank.fuelMass / 1000;
      return acc + stageDryMass + payloadMass + engineMass + tankDryMass + fuelMass;
    }, baseMass);
    return total;
  };

  const RocketPreview = () => {
    const segments = [];
    const stagesToRender = [...config.stages].reverse();
    
    segments.push(
      <path 
        key="fairing" 
        d="M50 5 L68 25 L32 25 Z" 
        fill={isDark ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.03)"}
        stroke={isDark ? "#555" : "#ccc"} 
        strokeWidth="1" 
      />
    );

    let currentY = 25;

    stagesToRender.forEach((stage, idx) => {
      const originalIdx = config.stages.length - 1 - idx;
      const isSelected = selectedStageIdx === originalIdx;
      
      const stageBodyHeight = 10 + (stage.tank.fuelMass / 1000) * 0.4;

      segments.push(
        <g key={`stage-grp-${stage.id}`} onClick={() => setSelectedStageIdx(originalIdx)} className="cursor-pointer group">
          {/* Main Stage Body */}
          <rect 
            x="32" y={currentY} width="36" height={stageBodyHeight} 
            fill={isSelected ? (isDark ? "rgba(59, 130, 246, 0.08)" : "rgba(59, 130, 246, 0.1)") : (isDark ? "rgba(255,255,255,0.02)" : "white")} 
            stroke={isSelected ? "#3b82f6" : (isDark ? "#444" : "#ddd")} 
            strokeWidth={isSelected ? "1.5" : "1"}
            className="transition-all duration-300"
          />
          
          {/* Visual Tank Detail */}
          <g>
            {/* Tank Outline */}
            <rect x="34" y={currentY + 2} width="32" height={stageBodyHeight - 4} fill="none" stroke={isSelected ? "rgba(59, 130, 246, 0.3)" : (isDark ? "#222" : "#eee")} strokeWidth="0.5" />
            {/* Fuel Level Visualization */}
            <rect 
              x="34.5" y={currentY + 2.5} 
              width="31" height={stageBodyHeight - 5} 
              fill={isDark ? "rgba(59, 130, 246, 0.15)" : "rgba(59, 130, 246, 0.1)"} 
              className="transition-all duration-500"
            />
          </g>

          {/* Engines */}
          {stage.engineGroup.engineCount > 0 && (
            <g>
              {Array.from({ length: stage.engineGroup.engineCount }).map((_, eIdx) => {
                const clusterWidth = 30;
                const eWidth = clusterWidth / stage.engineGroup.engineCount;
                const startX = 35 + (eIdx * eWidth);
                const nozzleW = eWidth * 0.8;
                const nozzleCenterX = startX + (eWidth/2);
                const eColor = engineSpecs[stage.engineGroup.engineType].color;
                return <path key={`e-${stage.id}-${eIdx}`} d={`M${startX + 2} ${currentY + stageBodyHeight} L${nozzleCenterX - (nozzleW/2)} ${currentY + stageBodyHeight + 5} L${nozzleCenterX + (nozzleW/2)} ${currentY + stageBodyHeight + 5} L${startX + eWidth - 2} ${currentY + stageBodyHeight} Z`} fill="none" stroke={eColor} strokeWidth="1" />;
              })}
            </g>
          )}

          {/* Connection Ring */}
          {idx < stagesToRender.length - 1 && <rect x="31" y={currentY + stageBodyHeight + (stage.engineGroup.engineCount > 0 ? 5 : 0)} width="38" height="2" fill={isDark ? "#111" : "#f0f0f0"} stroke={isDark ? "#333" : "#ddd"} strokeWidth="0.5" />}
          
          {/* Active Selection Pulse */}
          {isSelected && <rect x="29" y={currentY - 2} width="42" height={stageBodyHeight + (stage.engineGroup.engineCount > 0 ? 9 : 4)} fill="none" stroke="#3b82f6" strokeWidth="0.5" strokeDasharray="3 3" className="animate-pulse" />}
        </g>
      );
      currentY += stageBodyHeight + (stage.engineGroup.engineCount > 0 ? 7 : 2);
    });

    return (
      <svg viewBox="0 0 100 200" className="w-full h-full max-h-[500px] lg:max-h-[800px] drop-shadow-[0_0_20px_rgba(0,0,0,0.5)] transition-all duration-500">
        {segments}
        <line x1="10" y1={currentY + 5} x2="90" y2={currentY + 5} stroke={isDark ? "#111" : "#eee"} strokeWidth="0.5" />
      </svg>
    );
  };

  const isNameValid = config.missionName.trim().length > 0;

  return (
    <div className={`w-full h-full flex flex-col font-mono overflow-hidden transition-colors duration-300 ${isDark ? 'bg-[#0a0a0a] text-gray-400' : 'bg-gray-50 text-gray-600'}`}>
      {/* Top Header */}
      <div className={`flex flex-col md:flex-row items-center justify-between px-4 md:px-8 py-3 md:py-6 border-b-2 z-50 gap-4 md:gap-0 ${isDark ? 'bg-[#0d0d0d] border-[#333]' : 'bg-white border-gray-200 shadow-sm'}`}>
        <div className="flex items-center gap-4 w-full md:w-auto">
          <button onClick={onBack} className={`flex items-center justify-center gap-2 px-4 py-2 border-2 rounded transition-all text-[10px] md:text-xs font-black uppercase tracking-widest group ${isDark ? 'border-[#333] text-gray-400 hover:text-white hover:border-blue-500' : 'border-gray-200 text-gray-600 hover:text-blue-600 hover:border-blue-600'}`}>
            <ChevronLeft size={16} className="group-hover:-translate-x-1 transition-transform" /> <span className="hidden sm:inline">{t('setup_back')}</span>
          </button>
          <div className="h-6 w-[1px] bg-[#333]"></div>
          <div className="flex flex-col">
            <h1 className={`text-[12px] md:text-lg font-black tracking-widest uppercase truncate max-w-[150px] md:max-w-none ${isDark ? 'text-white' : 'text-gray-900'}`}>{localizedMissionType}</h1>
            <p className="text-[9px] text-blue-500 font-black uppercase tracking-[0.3em]">FrowCRRD Aerospace</p>
          </div>
        </div>
        
        <div className="flex items-center justify-between md:justify-end gap-4 md:gap-12 w-full md:w-auto border-t md:border-t-0 pt-3 md:pt-0 border-[#333]">
           <div className="flex flex-col items-start md:items-end">
              <span className="text-[10px] text-gray-500 uppercase font-black tracking-widest">{t('setup_mass')}</span>
              <span className={`text-xl md:text-3xl font-black tracking-tighter ${isDark ? 'text-white' : 'text-gray-900'}`}>
                {calculateTotalMass().toFixed(1)} <span className="text-blue-500 text-[14px] font-black">{isRu ? 'т' : 't'}</span>
              </span>
           </div>
           <button 
              onClick={onConfirm} 
              disabled={!isNameValid}
              className={`px-6 md:px-10 py-3 md:py-4 text-[11px] md:text-xs font-black uppercase tracking-widest transition-all flex items-center gap-3 group rounded-sm ${
                isNameValid 
                ? 'bg-blue-600 hover:bg-blue-500 text-white shadow-[0_0_30px_rgba(37,99,235,0.4)] cursor-pointer' 
                : 'bg-[#1a1a1a] text-gray-700 cursor-not-allowed border border-[#333]'
              }`}
            >
              <span className="hidden xs:inline">{t('setup_confirm')}</span> <Play size={16} className={`fill-current group-hover:translate-x-1 transition-transform`} />
           </button>
        </div>
      </div>

      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden relative">
        {/* Sidebar Left */}
        <div className={`
          lg:w-[420px] border-r-2 flex flex-col overflow-y-auto custom-scrollbar transition-all duration-300 z-40
          ${isDark ? 'bg-[#0d0d0d] border-[#333]' : 'bg-white border-gray-200'}
          ${mobilePanel === 'SETUP' ? 'fixed inset-0 top-[110px] md:top-[70px]' : 'hidden lg:flex'}
        `}>
          <button onClick={() => setMobilePanel('NONE')} className="lg:hidden absolute top-4 right-4 p-2 bg-blue-600 text-white rounded-full">
            <ChevronDown size={20} />
          </button>

          <div className="p-6 md:p-10 border-b-2 border-[#333]">
             <div className="flex items-center gap-2 mb-6">
                <Edit3 size={16} className="text-blue-500" />
                <h2 className={`text-[13px] font-black uppercase tracking-[0.2em] ${isDark ? 'text-white' : 'text-gray-900'}`}>{t('setup_exp_name')}</h2>
             </div>
             <input 
               type="text"
               placeholder={t('setup_exp_placeholder')}
               className={`w-full border-2 p-4 md:p-5 text-xs md:text-sm font-black outline-none focus:border-blue-500 rounded transition-all ${isDark ? 'bg-[#0a0a0a] border-[#222] text-white' : 'bg-gray-50 border-gray-200 text-gray-900'}`}
               value={config.missionName}
               onChange={(e) => onChange({...config, missionName: e.target.value})}
             />
          </div>

          <div className={`p-6 md:p-10 border-b-2 ${isDark ? 'border-[#333]' : 'border-gray-100'}`}>
            <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-2">
                  <Boxes size={16} className="text-blue-500" />
                  <h2 className={`text-[13px] font-black uppercase tracking-[0.2em] ${isDark ? 'text-white' : 'text-gray-900'}`}>{t('setup_stages')}</h2>
                </div>
              <div className={`flex items-center gap-4 border-2 p-1.5 rounded ${isDark ? 'bg-[#111] border-[#222]' : 'bg-gray-50 border-gray-200'}`}>
                <button onClick={() => updateGlobalStages(config.stages.length - 1)} className="w-8 h-8 flex items-center justify-center hover:text-blue-500 transition-colors"><Minus size={16}/></button>
                <span className={`font-black text-sm w-6 text-center ${isDark ? 'text-white' : 'text-gray-900'}`}>{config.stages.length}</span>
                <button onClick={() => updateGlobalStages(config.stages.length + 1)} className="w-8 h-8 flex items-center justify-center hover:text-blue-500 transition-colors"><Plus size={16}/></button>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3">
              {config.stages.map((s, i) => (
                <div key={s.id} className="flex items-center gap-2 group/stage">
                  <button 
                    onClick={() => setSelectedStageIdx(i)}
                    className={`flex-1 relative p-4 md:p-5 text-left border-2 rounded-sm transition-all ${selectedStageIdx === i ? 'border-blue-500 bg-blue-500/10' : (isDark ? 'border-[#1a1a1a] bg-[#0f0f0f] hover:border-[#333]' : 'border-gray-100 bg-gray-50 hover:border-gray-200')}`}
                  >
                    <span className={`text-[11px] font-black uppercase tracking-[0.2em] ${selectedStageIdx === i ? (isDark ? 'text-white' : 'text-blue-600') : 'text-gray-500'}`}>{t('setup_stage')} 0{s.id}</span>
                  </button>

                  <button 
                    onClick={(e) => { e.stopPropagation(); deleteStage(i); }} 
                    disabled={config.stages.length <= 1} 
                    className={`p-3 border-2 rounded transition-all ${isDark ? 'border-red-900/20 bg-red-900/5 text-red-900/60 hover:bg-red-600 hover:text-white hover:border-red-600 disabled:opacity-10' : 'border-red-100 bg-red-50 text-red-300 hover:bg-red-500 hover:text-white hover:border-red-500 disabled:opacity-30'}`}
                    title={tr('Delete stage', 'Удалить ступень')}
                  >
                    <Trash2 size={18}/>
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="p-6 md:p-10 space-y-10">
             <div className="flex items-center gap-2 mb-6">
                <Settings2 size={16} className="text-blue-500" />
                <h2 className={`text-[13px] font-black uppercase tracking-[0.2em] ${isDark ? 'text-white' : 'text-gray-900'}`}>{t('setup_params')} 0{selectedStageIdx + 1}</h2>
             </div>

             {/* Stage Parameters Section */}
             <div className="space-y-8">
                <div className="grid grid-cols-2 gap-6">
                    <NumericInput 
                      label={t('setup_struct_mass')}
                      unit="kg"
                      value={selectedStage.structuralMass}
                      onChange={(v) => updateStageProperty(selectedStageIdx, 'structuralMass', v)}
                      isDark={isDark}
                      className={`w-full border-2 p-3 text-xs font-black outline-none focus:border-blue-500 rounded transition-colors ${isDark ? 'bg-[#0a0a0a] border-[#222] text-white' : 'bg-gray-50 border-gray-200 text-gray-900'}`}
                    />
                    <NumericInput 
                      label={t('setup_diameter')}
                      unit="m"
                      value={selectedStage.diameter}
                      onChange={(v) => updateStageProperty(selectedStageIdx, 'diameter', v)}
                      isDark={isDark}
                      className={`w-full border-2 p-3 text-xs font-black outline-none focus:border-blue-500 rounded transition-colors ${isDark ? 'bg-[#0a0a0a] border-[#222] text-white' : 'bg-gray-50 border-gray-200 text-gray-900'}`}
                    />
                </div>

                <NumericInput
                  label={t('setup_fuel_mass_kg')}
                  unit="kg"
                  value={selectedStage.tank.fuelMass}
                  onChange={(v) => updateTankProperty(selectedStageIdx, 'fuelMass', Math.max(0, v))}
                  isDark={isDark}
                  min={0}
                  className={`w-full border-2 p-3 text-xs font-black outline-none focus:border-blue-500 rounded transition-colors ${isDark ? 'bg-[#0a0a0a] border-[#222] text-white' : 'bg-gray-50 border-gray-200 text-gray-900'}`}
                />
             </div>

             <NumericInput
                label={tr('Number of Engines', 'Число двигателей')}
                value={selectedStage.engineGroup.engineCount}
                onChange={(v) => updateEngineProperty(selectedStageIdx, 'engineCount', Math.max(0, Math.round(v)))}
                isDark={isDark}
                min={0}
                className={`w-full border-2 p-3 text-xs font-black outline-none focus:border-blue-500 rounded transition-colors ${isDark ? 'bg-[#0a0a0a] border-[#222] text-white' : 'bg-gray-50 border-gray-200 text-gray-900'}`}
              />

              {selectedStageIdx === config.stages.length - 1 && (
                <div className={`space-y-4 border-2 rounded p-4 ${isDark ? 'border-[#1f2937] bg-[#0b1220]' : 'border-blue-100 bg-blue-50/40'}`}>
                  <h3 className={`text-[11px] font-black uppercase tracking-[0.2em] ${isDark ? 'text-blue-300' : 'text-blue-700'}`}>
                    {tr('Final Stage Recovery', 'Спуск последней ступени')}
                  </h3>

                  <NumericInput
                    label={tr('Number of Parachutes', 'Число парашютов')}
                    value={uiParachutes.length}
                    onChange={updateParachuteCount}
                    isDark={isDark}
                    min={0}
                    max={6}
                    className={`w-full border-2 p-3 text-xs font-black outline-none focus:border-blue-500 rounded transition-colors ${isDark ? 'bg-[#0a0a0a] border-[#222] text-white' : 'bg-gray-50 border-gray-200 text-gray-900'}`}
                  />

                  {uiParachutes.map((parachute, idx) => (
                    <div key={`setup-parachute-${idx}`} className="grid grid-cols-2 gap-3 items-center">
                      <label className={`text-[10px] uppercase font-black tracking-widest ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                        {tr('Parachute', 'Парашют')} {idx + 1}
                      </label>
                      <select
                        value={parachute.isDrogue ? 'drogue' : 'main'}
                        onChange={(e) => updateParachuteType(idx, e.target.value === 'drogue' ? 'drogue' : 'main')}
                        className={`w-full border-2 p-2 text-xs font-black outline-none focus:border-blue-500 rounded transition-colors ${isDark ? 'bg-[#0a0a0a] border-[#222] text-white' : 'bg-gray-50 border-gray-200 text-gray-900'}`}
                      >
                        <option value="main">{tr('Main', 'Основной')}</option>
                        <option value="drogue">{tr('Drogue', 'Тормозной')}</option>
                      </select>
                    </div>
                  ))}

                  <p className={`text-[10px] font-black uppercase tracking-[0.12em] ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                    {tr(
                      'Detailed parachute parameters are edited in EditorView hierarchy.',
                      'Детальные параметры парашютов настраиваются в иерархии EditorView.'
                    )}
                  </p>
                </div>
              )}
           </div>
         </div>

         {/* Mobile View Toggles */}
         <div className="lg:hidden flex border-b border-[#333] z-20">
          <button onClick={() => setMobilePanel('SETUP')} className={`flex-1 py-4 text-[10px] font-black uppercase tracking-widest border-r border-[#333] flex items-center justify-center gap-2 ${mobilePanel === 'SETUP' ? 'bg-blue-600 text-white' : ''}`}>
             <Settings2 size={16} /> {t('setup_params')}
          </button>
        </div>

        {/* Center Visualizer */}
        <div className={`flex-1 relative flex items-center justify-center min-h-[400px] lg:min-h-0 ${isDark ? 'bg-[#050505]' : 'bg-white'}`}>
           <div className={`absolute inset-0 pointer-events-none ${isDark ? 'opacity-[0.3]' : 'opacity-[0.08]'}`} style={{ backgroundImage: `radial-gradient(${isDark ? '#444' : '#000'} 1px, transparent 1px)`, backgroundSize: '50px 50px' }}></div>
           <div className="w-full h-full max-w-sm lg:max-w-2xl flex items-center justify-center z-10 p-10 lg:p-24 overflow-visible">
              <RocketPreview />
           </div>
        </div>
      </div>
    </div>
  );
};

export default SetupView;

