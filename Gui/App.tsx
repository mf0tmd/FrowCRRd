
import React, { useState, useEffect } from 'react';
import MainMenuView from './views/MainMenuView';
import EditorView from './views/EditorView';
import SettingsView from './views/SettingsView';
import RecentProjectsView from './views/RecentProjectsView';
import TutorialView from './views/TutorialView';
import ExamplesView from './views/ExamplesView';
import DocsView from './views/DocsView';
import SetupView from './views/SetupView';
import SplashScreen from './SplashScreen';
import { AppView, RocketConfig, StageConfig } from './types';
import { Language, translations } from './translations';
import { saveProjectToStorage } from './projectStorage';

const App: React.FC = () => {
  type ExamplePresetId = 'suborbital' | 'two-stage' | 'recovery';

  const [isInitializing, setIsInitializing] = useState(true);
  const [currentView, setCurrentView] = useState<AppView>('MENU');
  const [language, setLanguage] = useState<Language>(() => (localStorage.getItem('app_lang') as Language) || 'ru');
  const [theme, setTheme] = useState<'dark' | 'light'>(() => (localStorage.getItem('app_theme') as 'dark' | 'light') || 'dark');
  
  const t = (key: keyof typeof translations['en']) => translations[language][key] || key;

  useEffect(() => {
    // Initializing delay for Splash Screen
    const timer = setTimeout(() => {
      setIsInitializing(false);
    }, 2000);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    document.body.className = theme;
    localStorage.setItem('app_theme', theme);
  }, [theme]);

  useEffect(() => {
    localStorage.setItem('app_lang', language);
  }, [language]);

  const createInitialStage = (id: number): StageConfig => ({
    id,
    structuralMass: 2000,
    payloadMass: id === 1 ? 500 : 0,
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
    // Compatibility fields
    tanks: 1,
    hasFuelTank: true,
    fuelMass: 10,
    engineCount: 1,
    engineType: 'PHOENIX',
    engineInstances: [],
    fuelLevel: 1.0,
  });

  const createEngineInstances = (
    stageId: number,
    engineCount: number,
    throttleProfile: Array<{ t: number; v: number }>
  ) => {
    return Array.from({ length: Math.max(0, engineCount) }, (_, idx) => ({
      id: `S${stageId}-E${idx + 1}`,
      points: [],
      throttlePoints: throttleProfile.map((point, pointIdx) => ({
        id: `s${stageId}-e${idx + 1}-tp-${pointIdx}`,
        t: point.t,
        v: point.v,
      })),
    }));
  };

  const initialSimulation = {
    eventDisplayMode: 'all' as const,
    dt: 0.1,
    tMax: 600,
    rocketMarkerScale: 1,
    dragEnabled: true,
    parachuteEnabled: false,
    stopOnImpact: false,
    stopOnFuelDepleted: false
  };

  const initialParachutes: RocketConfig['parachutes'] = [];

  const [rocketConfig, setRocketConfig] = useState<RocketConfig>({
    id: '',
    missionName: '',
    missionType: 'Testing',
    stages: [createInitialStage(1)],
    simulation: initialSimulation,
    parachutes: initialParachutes,
    fairingMass: 200,
    fairingSeparation: { mode: 'altitude', value: 100000 },
    pitchProgram: [],
    pitchProgramEnabled: false
  });

  const handleStartSetup = (mission: string) => {
    setRocketConfig({
      id: Date.now().toString(),
      missionName: '',
      missionType: mission,
      stages: [createInitialStage(1)],
      simulation: initialSimulation,
      parachutes: initialParachutes,
      fairingMass: 200,
      fairingSeparation: { mode: 'altitude', value: 100000 },
      pitchProgram: [],
      pitchProgramEnabled: false
    });
    setCurrentView('SETUP');
  };

  const buildExamplePreset = (presetId: ExamplePresetId): RocketConfig => {
    const now = Date.now();

    const suborbitalThrottle = [
      { t: 0, v: 1.0 },
      { t: 35, v: 0.92 },
      { t: 70, v: 0.8 },
    ];
    const boosterThrottle = [
      { t: 0, v: 1.0 },
      { t: 60, v: 0.95 },
      { t: 95, v: 0.82 },
      { t: 120, v: 0.0 },
    ];
    const upperThrottle = [
      { t: 0, v: 1.0 },
      { t: 70, v: 0.9 },
      { t: 140, v: 0.8 },
    ];

    if (presetId === 'suborbital') {
      return {
        id: `${now}`,
        missionName: language === 'ru' ? 'Суборбитальный пример' : 'Suborbital Example',
        missionType: 'Testing',
        stages: [
          {
            ...createInitialStage(1),
            structuralMass: 2500,
            payloadMass: 400,
            diameter: 2.6,
            separation: { mode: 'time', value: 120 },
            tank: { dryMass: 500, fuelMass: 9000 },
            engineGroup: {
              engineType: 'PHOENIX',
              engineCount: 3,
              thrust: 320000,
              massFlow: 92,
              engineMass: 420,
              instances: createEngineInstances(1, 3, suborbitalThrottle),
            },
            engineCount: 3,
          },
        ],
        simulation: {
          ...initialSimulation,
          dt: 0.1,
          tMax: 420,
          stopOnImpact: true,
          parachuteEnabled: false,
        },
        parachutes: [],
        fairingMass: 150,
        fairingSeparation: { mode: 'altitude', value: 15000 },
        pitchProgramEnabled: true,
        pitchProgram: [
          { id: 'pitch-0', t: 0, v: 90 },
          { id: 'pitch-1', t: 12, v: 88 },
          { id: 'pitch-2', t: 28, v: 82 },
          { id: 'pitch-3', t: 46, v: 76 },
        ],
      };
    }

    if (presetId === 'two-stage') {
      return {
        id: `${now}`,
        missionName: language === 'ru' ? 'Двухступенчатый пример' : 'Two-Stage Example',
        missionType: 'Testing',
        stages: [
          {
            ...createInitialStage(1),
            structuralMass: 5200,
            payloadMass: 0,
            diameter: 3.4,
            separation: { mode: 'time', value: 125 },
            tank: { dryMass: 950, fuelMass: 21000 },
            engineGroup: {
              engineType: 'PHOENIX',
              engineCount: 5,
              thrust: 390000,
              massFlow: 105,
              engineMass: 500,
              instances: createEngineInstances(1, 5, boosterThrottle),
            },
            engineCount: 5,
          },
          {
            ...createInitialStage(2),
            structuralMass: 2200,
            payloadMass: 550,
            diameter: 2.4,
            separation: { mode: 'fuel', value: 0 },
            tank: { dryMass: 520, fuelMass: 6500 },
            engineGroup: {
              engineType: 'PHOENIX',
              engineCount: 1,
              thrust: 220000,
              massFlow: 55,
              engineMass: 280,
              instances: createEngineInstances(2, 1, upperThrottle),
            },
            engineCount: 1,
          },
        ],
        simulation: {
          ...initialSimulation,
          dt: 0.1,
          tMax: 600,
          stopOnImpact: false,
          parachuteEnabled: false,
        },
        parachutes: [],
        fairingMass: 260,
        fairingSeparation: { mode: 'altitude', value: 65000 },
        pitchProgramEnabled: true,
        pitchProgram: [
          { id: 'pitch-0', t: 0, v: 90 },
          { id: 'pitch-1', t: 18, v: 86 },
          { id: 'pitch-2', t: 45, v: 77 },
          { id: 'pitch-3', t: 80, v: 66 },
          { id: 'pitch-4', t: 120, v: 56 },
        ],
      };
    }

    return {
      id: `${now}`,
      missionName: language === 'ru' ? 'Тест посадки с парашютом' : 'Parachute Recovery Test',
      missionType: 'Testing',
      stages: [
        {
          ...createInitialStage(1),
          structuralMass: 1800,
          payloadMass: 250,
          diameter: 2.2,
          separation: { mode: 'fuel', value: 0 },
          tank: { dryMass: 450, fuelMass: 5000 },
          engineGroup: {
            engineType: 'PHOENIX',
            engineCount: 2,
            thrust: 230000,
            massFlow: 72,
            engineMass: 350,
            instances: createEngineInstances(1, 2, [
              { t: 0, v: 1.0 },
              { t: 45, v: 0.85 },
              { t: 80, v: 0.0 },
            ]),
          },
          engineCount: 2,
        },
      ],
      simulation: {
        ...initialSimulation,
        dt: 0.1,
        tMax: 500,
        stopOnImpact: true,
        parachuteEnabled: true,
      },
      parachutes: [
        {
          id: 'drogue-test',
          mode: 'altitude',
          isDrogue: true,
          area: 16,
          start: 8000,
          end: 3000,
        },
        {
          id: 'main-test',
          mode: 'altitude',
          isDrogue: false,
          area: 85,
          start: 1800,
          end: 0,
        },
      ],
      fairingMass: 120,
      fairingSeparation: { mode: 'time', value: 40 },
      pitchProgramEnabled: true,
      pitchProgram: [
        { id: 'pitch-0', t: 0, v: 90 },
        { id: 'pitch-1', t: 15, v: 87 },
        { id: 'pitch-2', t: 35, v: 82 },
      ],
    };
  };

  const handleApplyExamplePreset = (presetId: ExamplePresetId) => {
    const preset = buildExamplePreset(presetId);
    setRocketConfig(preset);
    void saveProject(preset);
    setCurrentView('SETUP');
  };

  const saveProject = async (config: RocketConfig) => {
    try {
      await saveProjectToStorage(config);
    } catch (error) {
      console.error('Failed to save project', error);
    }
  };

  const handleProjectUpdate = (newConfig: RocketConfig) => {
    setRocketConfig(newConfig);
    if (newConfig.id && newConfig.missionName) {
      void saveProject(newConfig);
    }
  };

  const loadProject = (project: RocketConfig) => {
    setRocketConfig(project);
    setCurrentView('EDITOR');
  };

  const renderView = () => {
    const commonProps = { language, theme, t };

    switch (currentView) {
      case 'MENU':
        return <MainMenuView onNavigate={setCurrentView} onStartSetup={handleStartSetup} {...commonProps} />;
      case 'SETUP':
        return (
          <SetupView 
            config={rocketConfig} 
            onChange={setRocketConfig} 
            onBack={() => setCurrentView('MENU')} 
            onConfirm={() => {
              void saveProject(rocketConfig);
              setCurrentView('EDITOR');
            }} 
            {...commonProps}
          />
        );
      case 'EDITOR':
        return (
          <EditorView 
            config={rocketConfig} 
            onChange={handleProjectUpdate} 
            onBack={() => setCurrentView('SETUP')} 
            {...commonProps}
          />
        );
      case 'SETTINGS':
        return (
          <SettingsView 
            onBack={() => setCurrentView('MENU')} 
            language={language}
            setLanguage={setLanguage}
            theme={theme}
            setTheme={setTheme}
            t={t}
          />
        );
      case 'RECENT':
        return <RecentProjectsView onBack={() => setCurrentView('MENU')} onLoadProject={loadProject} {...commonProps} />;
      case 'TUTORIAL':
        return (
          <TutorialView
            onBack={() => setCurrentView('MENU')}
            onOpenSetup={() => handleStartSetup('Testing')}
            onOpenExamples={() => setCurrentView('EXAMPLES')}
            onOpenDocs={() => setCurrentView('DOCS')}
            {...commonProps}
          />
        );
      case 'EXAMPLES':
        return (
          <ExamplesView
            onBack={() => setCurrentView('MENU')}
            onApplyPreset={handleApplyExamplePreset}
            onOpenDocs={() => setCurrentView('DOCS')}
            {...commonProps}
          />
        );
      case 'DOCS':
        return <DocsView onBack={() => setCurrentView('MENU')} {...commonProps} />;
      default:
        return <MainMenuView onNavigate={setCurrentView} onStartSetup={handleStartSetup} {...commonProps} />;
    }
  };

  return (
    <div className={`w-screen h-screen overflow-hidden transition-colors duration-300 ${theme === 'dark' ? 'bg-[#0d0d0d] text-gray-300' : 'bg-gray-100 text-gray-800'}`}>
      {isInitializing && <SplashScreen theme={theme} language={language} />}
      {!isInitializing && renderView()}
    </div>
  );
};

export default App;
