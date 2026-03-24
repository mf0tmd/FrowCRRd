import React, { useMemo, useState } from 'react';
import { ChevronLeft, Search, BookOpen, Wrench, AlertTriangle, Compass } from 'lucide-react';

interface DocsViewProps {
  onBack: () => void;
  theme: 'dark' | 'light';
  language?: 'ru' | 'en';
}

type GuideSection = {
  id: string;
  title: string;
  lines: string[];
};

const DocsView: React.FC<DocsViewProps> = ({ onBack, theme, language }) => {
  const [search, setSearch] = useState('');
  const isDark = theme === 'dark';
  const isRu = language === 'ru';
  const tr = (en: string, ru: string) => (isRu ? ru : en);

  const sections = useMemo<GuideSection[]>(() => ([
    {
      id: 'quick-start',
      title: tr('Quick Start', 'Быстрый старт'),
      lines: [
        tr('Open "Run" in the main menu to enter SetupView.', 'Нажми "Запуск" в главном меню и откроется SetupView.'),
        tr('Set mission name, stage count, fuel mass, and number of engines.', 'Задай название миссии, число ступеней, массу топлива и число двигателей.'),
        tr('For the final stage, set parachute count and parachute type in SetupView.', 'Для последней ступени задай число парашютов и тип каждого прямо в SetupView.'),
        tr('Press "Confirm Project" to open EditorView.', 'Нажми "Подтвердить проект", чтобы перейти в EditorView.'),
        tr('In Builder, tune masses, separations, throttle profiles, and pitch program.', 'В Builder настрой массы, разделение, графики тяги и программу тангажа.'),
        tr('Go to Simulation and press "Launch Simulation".', 'Перейди в Simulation и нажми "Запуск симуляции".'),
      ],
    },
    {
      id: 'setup',
      title: tr('SetupView Reference', 'Справка по SetupView'),
      lines: [
        tr('Stages: choose total count; each stage has structural mass, diameter, fuel mass, and engine count.', 'Ступени: выбери их количество; у каждой ступени есть структурная масса, диаметр, масса топлива и число двигателей.'),
        tr('For the final stage, set parachute count and type directly in SetupView.', 'Для последней ступени настраивай число парашютов и их тип прямо в SetupView.'),
        tr('Total wet mass is recalculated automatically at the top.', 'Общая влажная масса пересчитывается автоматически вверху.'),
        tr('Drag is always enabled in simulation (no toggle needed).', 'Аэродинамическое сопротивление всегда включено (отдельный переключатель не нужен).'),
        tr('Use SetupView for rough assembly, then fine-tune in EditorView.', 'Используй SetupView для грубой сборки, а точную настройку делай в EditorView.'),
      ],
    },
    {
      id: 'editor',
      title: tr('EditorView Reference', 'Справка по EditorView'),
      lines: [
        tr('Builder mode: hierarchy + property panels for rocket, stages, tanks, and engine groups.', 'Режим Builder: иерархия и панель свойств ракеты, ступеней, баков и группы двигателей.'),
        tr('Parachutes are configured in Builder hierarchy (Parachutes node), not in simulation settings.', 'Парашюты настраиваются в иерархии Builder (узел Parachutes), а не в настройках симуляции.'),
        tr('All parachutes in one config must use one shared mode: time / altitude / speed.', 'Все парашюты в одной конфигурации должны использовать один общий режим: время / высота / скорость.'),
        tr('Throttle profile: editable points (time vs thrust %), with drag-and-drop on chart.', 'Профиль тяги: редактируемые точки (время vs тяга %), с перетаскиванием на графике.'),
        tr('Pitch program: editable angle schedule in degrees, used by core dynamics.', 'Программа тангажа: редактируемый график угла в градусах, используется ядром динамики.'),
        tr('Simulation settings include dt, max time, event display mode, marker size, and "simulate until impact".', 'Настройки симуляции: dt, максимальное время, режим событий, размер маркера и "симуляция до удара о землю".'),
      ],
    },
    {
      id: 'simulation',
      title: tr('Simulation & Graphs', 'Симуляция и графики'),
      lines: [
        tr('Main trajectory graph supports pan/zoom with mouse; rocket marker rotation follows core heading.', 'Главный график траектории поддерживает панорамирование/зум мышью; поворот ракеты берётся из расчёта ядра.'),
        tr('Playback slider is synced with telemetry mini-charts and event log.', 'Ползунок воспроизведения синхронизирован с мини-графиками телеметрии и журналом событий.'),
        tr('Engine burnout events are shown in both the event log and trajectory markers.', 'События выгорания двигателей показываются и в журнале событий, и маркерами на траектории.'),
        tr('Compass near stats shows current heading in degrees.', 'Компас рядом со статистикой показывает текущий курс в градусах.'),
        tr('Event markers can be filtered by display mode: All / Important / Minimal.', 'Маркеры событий фильтруются по режиму: Все / Важные / Минимум.'),
      ],
    },
    {
      id: 'troubleshooting',
      title: tr('Troubleshooting', 'Разбор проблем'),
      lines: [
        tr('If launch does not happen, check warning about initial vertical thrust vs weight.', 'Если старта нет, проверь предупреждение о начальной вертикальной тяге и весе ракеты.'),
        tr('Common fix: increase thrust/engine count, reduce mass, keep initial pitch near 90°.', 'Частое решение: увеличить тягу/число двигателей, уменьшить массу, держать стартовый тангаж около 90°.'),
        tr('If "simulate until impact" is enabled, run time may extend beyond tMax while impact is searched.', 'Если включена "симуляция до удара о землю", расчёт может идти дольше tMax, пока ищется касание поверхности.'),
        tr('If parachute is enabled, ensure area > 0 and deploy start/end values are different.', 'Если включен парашют, площадь должна быть > 0 и значения начала/конца раскрытия должны отличаться.'),
        tr('If UI language looks mixed, switch language in Settings and reopen target screen.', 'Если язык интерфейса смешался, переключи язык в Settings и заново открой экран.'),
      ],
    },
  ]), [isRu]);

  const filteredSections = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return sections;

    return sections
      .map((section) => ({
        ...section,
        lines: section.lines.filter((line) => line.toLowerCase().includes(q)),
      }))
      .filter((section) => section.title.toLowerCase().includes(q) || section.lines.length > 0);
  }, [sections, search]);

  return (
    <div className={`w-full h-full flex flex-col p-8 overflow-hidden font-mono transition-colors duration-300 ${isDark ? 'bg-[#0a0a0a]' : 'bg-gray-50'}`}>
      <div className="flex items-center justify-between mb-8 max-w-6xl mx-auto w-full">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className={`p-2 rounded transition-colors text-blue-500 ${isDark ? 'hover:bg-[#1a1a1a]' : 'hover:bg-gray-200'}`}>
            <ChevronLeft size={24} />
          </button>
          <h1 className={`text-3xl font-black uppercase tracking-tighter ${isDark ? 'text-white' : 'text-gray-900'}`}>
            {tr('Documentation', 'Документация')}
          </h1>
        </div>

        <div className="relative w-[320px] group">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-600 group-focus-within:text-blue-500 transition-colors" size={14} />
          <input
            type="text"
            placeholder={tr('Search in user guide...', 'Поиск по user guide...')}
            className={`w-full border-2 pl-10 pr-4 py-2 text-xs font-bold outline-none transition-all rounded ${isDark ? 'bg-[#111] border-[#333] text-gray-300 focus:border-blue-500/50' : 'bg-white border-gray-200 text-gray-800 focus:border-blue-500'}`}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      <div className="max-w-6xl mx-auto w-full mb-5 grid grid-cols-1 md:grid-cols-4 gap-3">
        {[
          { icon: <BookOpen size={16} />, text: tr('Practical and synced with current UI', 'Практично и синхронизировано с текущим UI') },
          { icon: <Compass size={16} />, text: tr('Covers trajectory graph and heading tools', 'Описывает график траектории и инструменты курса') },
          { icon: <Wrench size={16} />, text: tr('Includes setup/editor parameter reference', 'Есть справка по параметрам setup/editor') },
          { icon: <AlertTriangle size={16} />, text: tr('Contains common failure diagnostics', 'Содержит диагностику частых проблем') },
        ].map((item, idx) => (
          <div key={idx} className={`border rounded px-3 py-2 flex items-center gap-2 text-[11px] font-bold ${isDark ? 'border-[#222] bg-[#0f0f0f] text-gray-300' : 'border-gray-200 bg-white text-gray-700'}`}>
            <span className="text-blue-500">{item.icon}</span>
            <span>{item.text}</span>
          </div>
        ))}
      </div>

      <div className="max-w-6xl mx-auto w-full flex-1 overflow-y-auto custom-scrollbar pr-3">
        <div className="grid gap-4">
          {filteredSections.map((section) => (
            <section key={section.id} className={`border-2 rounded p-5 ${isDark ? 'bg-[#111] border-[#2a2a2a]' : 'bg-white border-gray-100'}`}>
              <h2 className={`text-[14px] font-black uppercase tracking-widest mb-4 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                {section.title}
              </h2>
              <div className="space-y-2">
                {section.lines.map((line, idx) => (
                  <div key={`${section.id}-${idx}`} className={`text-[12px] leading-relaxed ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                    {idx + 1}. {line}
                  </div>
                ))}
              </div>
            </section>
          ))}

          {filteredSections.length === 0 && (
            <div className={`border-2 border-dashed rounded p-8 text-center text-[12px] font-bold ${isDark ? 'border-[#333] text-gray-500' : 'border-gray-200 text-gray-500'}`}>
              {tr('No results. Try a broader query.', 'Ничего не найдено. Попробуй более общий запрос.')}
            </div>
          )}
        </div>
      </div>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: ${isDark ? '#0a0a0a' : '#f9fafb'}; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: ${isDark ? '#222' : '#ddd'}; border-radius: 10px; }
      `}</style>
    </div>
  );
};

export default DocsView;
