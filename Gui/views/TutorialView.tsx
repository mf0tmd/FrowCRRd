import React, { useMemo, useState } from 'react';
import { ChevronLeft, CheckCircle2, Circle, Compass, BookOpen, Wrench, Rocket } from 'lucide-react';

interface TutorialViewProps {
  onBack: () => void;
  theme: 'dark' | 'light';
  language?: 'ru' | 'en';
  onOpenSetup?: () => void;
  onOpenExamples?: () => void;
  onOpenDocs?: () => void;
}

type TutorialStep = {
  id: string;
  title: string;
  details: string;
};

const TutorialView: React.FC<TutorialViewProps> = ({
  onBack,
  theme,
  language,
  onOpenSetup,
  onOpenExamples,
  onOpenDocs,
}) => {
  const isDark = theme === 'dark';
  const isRu = language === 'ru';
  const tr = (en: string, ru: string) => (isRu ? ru : en);

  const steps = useMemo<TutorialStep[]>(() => ([
    {
      id: 'step-1',
      title: tr('Create project in SetupView', 'Создай проект в SetupView'),
      details: tr(
        'Set mission name, stage count, fuel mass, and number of engines. Keep initial mass realistic.',
        'Задай название миссии, число ступеней, массу топлива и число двигателей. Держи начальную массу реалистичной.'
      ),
    },
    {
      id: 'step-2',
      title: tr('Tune rocket in Builder', 'Настрой ракету в Builder'),
      details: tr(
        'Edit stage masses, separation logic, engine thrust/mass-flow, and throttle schedules.',
        'Отредактируй массы ступеней, логику разделения, тягу/расход двигателей и графики тяги.'
      ),
    },
    {
      id: 'step-3',
      title: tr('Configure pitch program', 'Настрой программу тангажа'),
      details: tr(
        'Enable pitch program and shape angle-vs-time profile. Initial point near 90° is typical for vertical liftoff.',
        'Включи программу тангажа и задай профиль угол-время. Обычно для вертикального старта первая точка близка к 90°.'
      ),
    },
    {
      id: 'step-4',
      title: tr('Run simulation and inspect events', 'Запусти симуляцию и проверь события'),
      details: tr(
        'Use simulation settings (dt, total time, event mode), then run and inspect event log + telemetry.',
        'Используй настройки симуляции (dt, общее время, режим событий), затем запусти и смотри журнал + телеметрию.'
      ),
    },
    {
      id: 'step-5',
      title: tr('Analyze trajectory and iterate', 'Анализируй траекторию и улучшай'),
      details: tr(
        'Use trajectory graph, heading compass, and mini charts. Adjust design and rerun.',
        'Используй график траектории, компас курса и мини-графики. Подкрути конфиг и запусти снова.'
      ),
    },
  ]), [isRu]);

  const [done, setDone] = useState<Record<string, boolean>>({});

  const completedCount = steps.reduce((acc, step) => acc + (done[step.id] ? 1 : 0), 0);

  return (
    <div className={`w-full h-full flex flex-col p-8 transition-colors duration-300 ${isDark ? 'bg-[#0a0a0a]' : 'bg-gray-50'}`}>
      <div className="flex items-center justify-between mb-10">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className={`p-2 rounded transition-colors text-blue-500 ${isDark ? 'hover:bg-[#1a1a1a]' : 'hover:bg-gray-200'}`}>
            <ChevronLeft size={24} />
          </button>
          <h1 className={`text-3xl font-black uppercase tracking-tighter ${isDark ? 'text-white' : 'text-gray-900'}`}>
            {tr('Training', 'Обучение')}
          </h1>
        </div>

        <div className={`px-4 py-2 rounded border text-[11px] font-black uppercase tracking-widest ${isDark ? 'border-[#333] bg-[#111] text-gray-300' : 'border-gray-200 bg-white text-gray-700'}`}>
          {tr('Progress', 'Прогресс')}: {completedCount}/{steps.length}
        </div>
      </div>

      <div className="max-w-6xl mx-auto w-full grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-8 flex-1 overflow-hidden">
        <div className="overflow-y-auto custom-scrollbar pr-2 space-y-4">
          {steps.map((step, index) => {
            const isDone = !!done[step.id];
            return (
              <div key={step.id} className={`border-2 rounded p-5 ${isDark ? 'bg-[#111] border-[#2a2a2a]' : 'bg-white border-gray-100'}`}>
                <button
                  type="button"
                  onClick={() => setDone((prev) => ({ ...prev, [step.id]: !prev[step.id] }))}
                  className="w-full flex items-start gap-3 text-left"
                >
                  <span className={`mt-0.5 ${isDone ? 'text-green-500' : (isDark ? 'text-gray-500' : 'text-gray-400')}`}>
                    {isDone ? <CheckCircle2 size={18} /> : <Circle size={18} />}
                  </span>
                  <div className="flex-1">
                    <div className={`text-[14px] font-black uppercase tracking-wider mb-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                      {index + 1}. {step.title}
                    </div>
                    <div className={`text-[12px] leading-relaxed ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                      {step.details}
                    </div>
                  </div>
                </button>
              </div>
            );
          })}
        </div>

        <aside className="space-y-4">
          <div className={`border-2 rounded p-5 ${isDark ? 'bg-[#111] border-[#2a2a2a]' : 'bg-white border-gray-100'}`}>
            <div className="flex items-center gap-2 mb-3 text-blue-500">
              <Rocket size={16} />
              <span className="text-[11px] font-black uppercase tracking-widest">{tr('Quick Actions', 'Быстрые действия')}</span>
            </div>
            <div className="space-y-2">
              <button
                onClick={onOpenSetup}
                className="w-full text-left px-3 py-2 rounded text-[11px] font-black uppercase tracking-wider bg-blue-600 hover:bg-blue-500 text-white transition-colors"
              >
                {tr('Open SetupView', 'Открыть SetupView')}
              </button>
              <button
                onClick={onOpenExamples}
                className={`w-full text-left px-3 py-2 rounded text-[11px] font-black uppercase tracking-wider border transition-colors ${isDark ? 'border-[#333] text-gray-300 hover:bg-[#1a1a1a]' : 'border-gray-200 text-gray-700 hover:bg-gray-50'}`}
              >
                {tr('Open Examples', 'Открыть примеры')}
              </button>
              <button
                onClick={onOpenDocs}
                className={`w-full text-left px-3 py-2 rounded text-[11px] font-black uppercase tracking-wider border transition-colors ${isDark ? 'border-[#333] text-gray-300 hover:bg-[#1a1a1a]' : 'border-gray-200 text-gray-700 hover:bg-gray-50'}`}
              >
                {tr('Open Documentation', 'Открыть документацию')}
              </button>
            </div>
          </div>

          <div className={`border-2 rounded p-5 ${isDark ? 'bg-[#111] border-[#2a2a2a]' : 'bg-white border-gray-100'}`}>
            <div className="flex items-center gap-2 mb-3 text-blue-500">
              <BookOpen size={16} />
              <span className="text-[11px] font-black uppercase tracking-widest">{tr('What Is Covered', 'Что покрыто')}</span>
            </div>
            <div className={`text-[12px] space-y-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
              <div className="flex items-start gap-2">
                <Wrench size={14} className="mt-0.5 text-blue-500" />
                <span>{tr('Setup + Builder workflow', 'Workflow Setup + Builder')}</span>
              </div>
              <div className="flex items-start gap-2">
                <Compass size={14} className="mt-0.5 text-blue-500" />
                <span>{tr('Simulation, trajectory, and heading analysis', 'Симуляция, траектория и анализ курса')}</span>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle2 size={14} className="mt-0.5 text-blue-500" />
                <span>{tr('Practical checks to avoid invalid launch setups', 'Практические проверки для валидного старта')}</span>
              </div>
            </div>
          </div>
        </aside>
      </div>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: ${isDark ? '#0a0a0a' : '#f9fafb'}; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: ${isDark ? '#222' : '#ddd'}; border-radius: 10px; }
      `}</style>
    </div>
  );
};

export default TutorialView;
