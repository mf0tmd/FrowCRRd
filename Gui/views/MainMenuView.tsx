
import React, { useState, useEffect, useCallback } from 'react';
import { AppView } from '../types';
import { Rocket, Settings, FolderOpen, BookOpen, Layers, LogOut } from 'lucide-react';

interface Flight {
  id: number;
  path: string;
  duration: number;
  rotation: number;
}

const BackgroundTelemetry: React.FC<{ theme: 'dark' | 'light' }> = ({ theme }) => {
  const [activeFlights, setActiveFlights] = useState<Flight[]>([]);
  const isDark = theme === 'dark';

  const spawnRocket = useCallback(() => {
    const id = Date.now();
    
    // Randomize path: Start from one edge, curve through center, end at another edge
    const startSide = Math.floor(Math.random() * 4); // 0:T, 1:R, 2:B, 3:L
    const width = window.innerWidth;
    const height = window.innerHeight;

    let sx = 0, sy = 0, ex = 0, ey = 0, cx = 0, cy = 0;

    if (startSide === 0) { // Top
      sx = Math.random() * width; sy = -50;
      ex = Math.random() * width; ey = height + 50;
    } else if (startSide === 1) { // Right
      sx = width + 50; sy = Math.random() * height;
      ex = -50; ey = Math.random() * height;
    } else if (startSide === 2) { // Bottom
      sx = Math.random() * width; sy = height + 50;
      ex = Math.random() * width; ey = -50;
    } else { // Left
      sx = -50; sy = Math.random() * height;
      ex = width + 50; ey = Math.random() * height;
    }

    // Control point for curve (roughly middle with offset)
    cx = (sx + ex) / 2 + (Math.random() - 0.5) * 400;
    cy = (sy + ey) / 2 + (Math.random() - 0.5) * 400;

    const path = `M ${sx} ${sy} Q ${cx} ${cy} ${ex} ${ey}`;
    const duration = 15000 + Math.random() * 15000; // 15-30s flight
    const rotation = Math.atan2(ey - sy, ex - sx) * (180 / Math.PI) + 90;

    const newFlight: Flight = { id, path, duration, rotation };
    setActiveFlights(prev => [...prev, newFlight]);

    // Cleanup after duration
    setTimeout(() => {
      setActiveFlights(prev => prev.filter(f => f.id !== id));
    }, duration + 1000);
  }, []);

  useEffect(() => {
    const scheduleNext = () => {
      const delay = 30000 + Math.random() * 60000; // 30-90 seconds
      return setTimeout(() => {
        spawnRocket();
        timerId = scheduleNext();
      }, delay);
    };

    let timerId = scheduleNext();
    
    // Optional: spawn one shortly after start for visibility during testing
    const initialTimer = setTimeout(spawnRocket, 5000);

    return () => {
      clearTimeout(timerId);
      clearTimeout(initialTimer);
    };
  }, [spawnRocket]);

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
      {activeFlights.map(flight => (
        <div
          key={flight.id}
          className="absolute"
          style={{
            offsetPath: `path('${flight.path}')`,
            animation: `moveAcross ${flight.duration}ms linear forwards`,
            opacity: 0,
          }}
        >
          <svg
            width="14"
            height="22"
            viewBox="0 0 24 24"
            fill="none"
            stroke={isDark ? "rgba(59, 130, 246, 0.25)" : "rgba(37, 99, 235, 0.15)"}
            strokeWidth="0.8"
            style={{ transform: `rotate(${flight.rotation}deg)` }}
          >
            <path d="M12 2L15 8V18L12 22L9 18V8L12 2Z" />
            <path d="M9 12H15" />
            <path d="M7 18L9 15" />
            <path d="M17 18L15 15" />
          </svg>
        </div>
      ))}
      <style>{`
        @keyframes moveAcross {
          0% { offset-distance: 0%; opacity: 0; }
          5% { opacity: 0.6; }
          95% { opacity: 0.6; }
          100% { offset-distance: 100%; opacity: 0; }
        }
      `}</style>
    </div>
  );
};

interface MainMenuViewProps {
  onNavigate: (view: AppView) => void;
  onStartSetup: (mission: string) => void;
  t: (key: any) => string;
  theme: 'dark' | 'light';
}

const MainMenuView: React.FC<MainMenuViewProps> = ({ onNavigate, onStartSetup, t, theme }) => {
  const isDark = theme === 'dark';

  const missionButtons = [
    { label: t('setup_run'), mission: 'Testing', icon: <Rocket size={18} /> },
  ];

  const rightButtons = [
    { label: t('menu_recent'), view: 'RECENT' as AppView, icon: <FolderOpen size={18} />, action: 'NAV' as const },
    { label: t('menu_settings'), view: 'SETTINGS' as AppView, icon: <Settings size={18} />, action: 'NAV' as const },
    { label: t('menu_examples'), view: 'EXAMPLES' as AppView, icon: <Layers size={18} />, action: 'NAV' as const },
    { label: t('menu_tutorial'), view: 'TUTORIAL' as AppView, icon: <BookOpen size={18} />, action: 'NAV' as const },
    { label: t('menu_docs'), view: 'DOCS' as AppView, icon: <BookOpen size={18} />, action: 'NAV' as const },
    { label: t('menu_exit'), view: 'MENU' as AppView, icon: <LogOut size={18} />, color: 'text-red-400', action: 'EXIT' as const },
  ];

  const handleExit = async () => {
    if (window.desktopApp?.quitApp) {
      try {
        await window.desktopApp.quitApp();
        return;
      } catch (error) {
        console.error('Failed to quit via desktop bridge', error);
      }
    }

    window.close();
  };

  return (
    <div className={`relative w-full h-full flex flex-col items-center justify-center p-4 md:p-8 transition-colors duration-300 overflow-y-auto ${isDark ? 'bg-[#0a0a0a]' : 'bg-gray-50'}`}>
      
      {/* Subtle Background Telemetry Animation */}
      <BackgroundTelemetry theme={theme} />

      {/* Background Graphic Mockup - Static */}
      <div className="absolute right-20 top-20 opacity-20 pointer-events-none hidden lg:block z-0">
        <svg width="400" height="400" viewBox="0 0 100 100" className={`fill-none ${isDark ? 'stroke-white' : 'stroke-blue-600'}`}>
           <circle cx="50" cy="50" r="40" strokeWidth="0.5" strokeDasharray="2 2" />
           <path d="M50 10 L60 40 L90 50 L60 60 L50 90 L40 60 L10 50 L40 40 Z" strokeWidth="0.5" />
           <circle cx="80" cy="20" r="5" strokeWidth="0.5" />
        </svg>
      </div>

      <div className="z-10 w-full max-w-6xl flex flex-col lg:flex-row justify-between items-stretch lg:items-start gap-8 md:gap-12 py-8">
        {/* Left Nav Section */}
        <div className="flex flex-col gap-3 w-full max-w-xs order-2 lg:order-1">
          <div className={`text-[10px] uppercase tracking-[0.2em] mb-2 border-b-2 pb-1 text-center lg:text-left font-black ${isDark ? 'text-gray-500 border-[#333]' : 'text-gray-400 border-gray-200'}`}>
            {t('menu_mission_type')}
          </div>
          <div className="grid grid-cols-1 gap-3">
            {missionButtons.map((btn, idx) => (
              <button
                key={idx}
                onClick={() => onStartSetup(btn.mission)}
                className={`group flex items-center gap-4 border-2 px-6 py-4 transition-all text-left text-xs uppercase tracking-widest font-black rounded-sm h-14 ${isDark ? 'bg-[#1a1a1a] hover:bg-[#252525] border-[#333] text-gray-300 hover:text-white shadow-[0_4px_20px_rgba(0,0,0,0.3)]' : 'bg-white hover:bg-blue-50 border-gray-200 text-gray-700 hover:text-blue-600 shadow-sm'}`}
              >
                <span className={`shrink-0 ${isDark ? 'text-gray-500 group-hover:text-blue-400' : 'text-gray-400 group-hover:text-blue-500'}`}>{btn.icon}</span>
                <span className="truncate">{btn.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Center Logo/Title */}
        <div className="flex flex-col items-center text-center order-1 lg:order-2 mb-4 lg:mb-0 flex-1">
          <h1 className={`text-4xl md:text-6xl font-black tracking-tighter mb-4 italic ${isDark ? 'text-white' : 'text-blue-600'}`}>
            FrowCRRD <span className={isDark ? 'text-blue-600' : 'text-gray-400'}>v0.6.0beta</span>
          </h1>
          <p className={`${isDark ? 'text-gray-500' : 'text-gray-400'} max-w-xs md:max-w-sm uppercase text-[10px] md:text-[11px] tracking-[0.3em] font-black px-4 leading-relaxed`}>
            {t('menu_desc')}
          </p>
        </div>

        {/* Right Nav Section */}
        <div className="flex flex-col gap-3 w-full max-w-xs order-3">
          <div className={`text-[10px] uppercase tracking-[0.2em] mb-2 border-b-2 pb-1 w-full text-center lg:text-right font-black ${isDark ? 'text-gray-500 border-[#333]' : 'text-gray-400 border-gray-200'}`}>
            {t('menu_control')}
          </div>
          <div className="grid grid-cols-1 gap-3">
            {rightButtons.map((btn, idx) => (
              <button
                key={idx}
                onClick={() => (btn.action === 'EXIT' ? handleExit() : onNavigate(btn.view))}
                className={`group flex items-center gap-4 border-2 px-6 py-4 w-full justify-start lg:justify-end transition-all text-xs uppercase tracking-widest font-black rounded-sm h-14 ${isDark ? 'bg-[#1a1a1a] hover:bg-[#252525] border-[#333] text-gray-300 hover:text-white shadow-[0_4px_20px_rgba(0,0,0,0.3)]' : 'bg-white hover:bg-gray-50 border-gray-200 text-gray-700 hover:text-blue-600 shadow-sm'} ${btn.color || ''}`}
              >
                <span className="truncate order-2 lg:order-1">{btn.label}</span>
                <span className={`shrink-0 order-1 lg:order-2 ${isDark ? 'text-gray-500 group-hover:text-blue-400' : 'text-gray-400 group-hover:text-blue-500'}`}>{btn.icon}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className={`mt-8 lg:absolute lg:bottom-8 text-[9px] md:text-[10px] uppercase tracking-[0.3em] lg:tracking-[0.5em] font-black text-center ${isDark ? 'text-gray-700' : 'text-gray-300'}`}>
        Copyright (c) 2026 FrowCRRd Authors.
      </div>
    </div>
  );
};

export default MainMenuView;
