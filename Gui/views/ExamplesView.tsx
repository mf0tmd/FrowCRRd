import React, { useMemo } from 'react';
import { ChevronLeft, Rocket, Download, BookOpen, Fuel, Gauge, Layers } from 'lucide-react';

interface ExamplesViewProps {
  onBack: () => void;
  theme: 'dark' | 'light';
  language?: 'ru' | 'en';
  onApplyPreset?: (presetId: 'suborbital' | 'two-stage' | 'recovery') => void;
  onOpenDocs?: () => void;
}

type ExampleCard = {
  id: 'suborbital' | 'two-stage' | 'recovery';
  title: string;
  summary: string;
  stats: string[];
};

const ExamplesView: React.FC<ExamplesViewProps> = ({ onBack, theme, language, onApplyPreset, onOpenDocs }) => {
  const isDark = theme === 'dark';
  const isRu = language === 'ru';
  const tr = (en: string, ru: string) => (isRu ? ru : en);

  const examples = useMemo<ExampleCard[]>(() => ([
    {
      id: 'suborbital',
      title: tr('Suborbital Hop', 'Суборбитальный прыжок'),
      summary: tr(
        'Single-stage baseline with clean ascent and simple pitch profile. Good first test.',
        'Базовый одноступенчатый вариант с чистым набором высоты и простым тангажом. Подходит для первого теста.'
      ),
      stats: [
        tr('1 stage', '1 ступень'),
        tr('3 engines', '3 двигателя'),
        tr('Pitch program enabled', 'Программа тангажа включена'),
      ],
    },
    {
      id: 'two-stage',
      title: tr('Two-Stage Ascent', 'Двухступенчатый набор'),
      summary: tr(
        'Booster + upper stage preset to test staging logic and long trajectory behavior.',
        'Пресет бустер + вторая ступень для проверки логики отделения и длительной траектории.'
      ),
      stats: [
        tr('2 stages', '2 ступени'),
        tr('5 + 1 engines', '5 + 1 двигатель'),
        tr('Timed separation', 'Разделение по времени'),
      ],
    },
    {
      id: 'recovery',
      title: tr('Parachute Recovery Test', 'Тест посадки с парашютом'),
      summary: tr(
        'Recovery-oriented preset with drogue/main parachute behavior and impact-stop simulation.',
        'Пресет с акцентом на восстановление: тормозной/основной парашют и симуляция до удара о землю.'
      ),
      stats: [
        tr('Parachute enabled', 'Парашют включён'),
        tr('Ground impact mode', 'Режим до удара о землю'),
        tr('Compact single stage', 'Компактная 1 ступень'),
      ],
    },
  ]), [isRu]);

  return (
    <div className={`w-full h-full flex flex-col p-8 overflow-hidden transition-colors duration-300 ${isDark ? 'bg-[#0a0a0a]' : 'bg-gray-50'}`}>
      <div className="flex items-center justify-between mb-10 max-w-6xl mx-auto w-full">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className={`p-2 rounded transition-colors text-blue-500 ${isDark ? 'hover:bg-[#1a1a1a]' : 'hover:bg-gray-200'}`}>
            <ChevronLeft size={24} />
          </button>
          <h1 className={`text-3xl font-black uppercase tracking-tighter ${isDark ? 'text-white' : 'text-gray-900'}`}>
            {tr('Configuration Examples', 'Примеры конфигурации')}
          </h1>
        </div>

        <button
          onClick={onOpenDocs}
          className={`flex items-center gap-2 px-4 py-2 rounded border text-[11px] font-black uppercase tracking-wider transition-colors ${isDark ? 'border-[#333] text-gray-300 hover:bg-[#151515]' : 'border-gray-200 text-gray-700 hover:bg-gray-100'}`}
        >
          <BookOpen size={14} />
          {tr('Open Docs', 'Открыть документацию')}
        </button>
      </div>

      <div className="max-w-6xl mx-auto w-full grid grid-cols-1 md:grid-cols-3 gap-6">
        {examples.map((ex) => (
          <div key={ex.id} className={`border-2 p-6 flex flex-col rounded ${isDark ? 'bg-[#111] border-[#2a2a2a]' : 'bg-white border-gray-100'}`}>
            <div className={`w-full aspect-video mb-5 flex items-center justify-center border-2 rounded ${isDark ? 'bg-[#0a0a0a] border-[#333]' : 'bg-gray-50 border-gray-200'}`}>
              {ex.id === 'suborbital' && <Rocket size={52} className="text-blue-500" />}
              {ex.id === 'two-stage' && <Layers size={52} className="text-blue-500" />}
              {ex.id === 'recovery' && <Fuel size={52} className="text-blue-500" />}
            </div>

            <h3 className={`text-lg font-black uppercase tracking-wider mb-3 ${isDark ? 'text-white' : 'text-gray-900'}`}>
              {ex.title}
            </h3>
            <p className={`text-[12px] leading-relaxed flex-1 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
              {ex.summary}
            </p>

            <div className="mt-4 space-y-1.5">
              {ex.stats.map((stat, idx) => (
                <div key={idx} className={`text-[11px] font-bold flex items-center gap-2 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                  <Gauge size={12} className="text-blue-500" />
                  <span>{stat}</span>
                </div>
              ))}
            </div>

            <button
              onClick={() => onApplyPreset?.(ex.id)}
              className="mt-6 flex items-center justify-center gap-2 py-2 text-xs font-black uppercase tracking-widest transition-colors border-2 rounded bg-blue-600 hover:bg-blue-500 text-white border-blue-500"
            >
              <Download size={14} />
              {tr('Load Preset', 'Загрузить пресет')}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ExamplesView;
