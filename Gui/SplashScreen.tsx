
import React, { useMemo } from 'react';

interface SplashScreenProps {
  theme: 'dark' | 'light';
  language?: 'ru' | 'en';
}

const SplashScreen: React.FC<SplashScreenProps> = ({ theme, language }) => {
  const isDark = theme === 'dark';
  const isRu = language === 'ru';

  // Генерируем звезды один раз с помощью useMemo для стабильности анимации
  const stars = useMemo(() => Array.from({ length: 80 }).map((_, i) => ({
    id: i,
    left: `${Math.random() * 100}%`,
    delay: `${Math.random() * 2}s`,
    duration: `${0.3 + Math.random() * 0.7}s`, // Разная скорость для эффекта глубины
    size: Math.random() > 0.7 ? (Math.random() > 0.9 ? '3px' : '2px') : '1.5px',
    opacity: 0.4 + Math.random() * 0.6
  })), []);

  return (
    <div className={`fixed inset-0 z-[100] flex flex-col items-center justify-center overflow-hidden transition-colors duration-500 ${isDark ? 'bg-[#0a0a0a]' : 'bg-gray-50'}`}>
      
      {/* Звездное поле: звезды летят вниз */}
      <div className="absolute inset-0 pointer-events-none">
        {stars.map((star) => (
          <div
            key={star.id}
            className="absolute bg-white rounded-full animate-star-flow"
            style={{
              left: star.left,
              top: '-20px',
              width: star.size,
              height: star.size,
              opacity: star.opacity,
              animationDelay: star.delay,
              animationDuration: star.duration,
            }}
          />
        ))}
      </div>

      <div className="relative flex flex-col items-center justify-center z-10">
        {/* Ракета: центрирована, с эффектом вибрации двигателя */}
        <div className="w-14 h-20 md:w-16 md:h-24 mb-10 animate-rocket-thrust">
          <svg viewBox="0 0 24 24" fill="none" stroke={isDark ? "white" : "black"} strokeWidth="1.2" className="drop-shadow-[0_0_8px_rgba(255,255,255,0.3)]">
            <path d="M12 2L15 8V18L12 22L9 18V8L12 2Z" />
            <path d="M9 12H15" strokeWidth="0.8" opacity="0.2" />
            {/* Имитация сопла */}
            <path d="M10 22L12 20L14 22" strokeWidth="0.8" opacity="0.5" />
          </svg>
        </div>

        {/* Название приложения: появляется плавно во второй половине цикла */}
        <div className="flex flex-col items-center opacity-0 animate-reveal-content">
          <h1 className={`text-3xl md:text-4xl font-black tracking-tighter italic ${isDark ? 'text-white' : 'text-blue-600'}`}>
            FrowCRRD
          </h1>
          <div className="mt-2 h-[1px] w-16 bg-blue-600"></div>
          
          <div className="mt-8 flex flex-col items-center gap-2">
            <span className={`text-[8px] font-mono font-bold tracking-[0.6em] uppercase opacity-40 ${isDark ? 'text-white' : 'text-black'}`}>
              {isRu ? 'Инициализация системы' : 'System Initialization'}
            </span>
          </div>
        </div>
      </div>

      <style>{`
        /* Эффект пролетающих звезд (ракета летит вверх) */
        @keyframes star-flow {
          0% { transform: translateY(-10vh); opacity: 0; }
          10% { opacity: 1; }
          90% { opacity: 1; }
          100% { transform: translateY(110vh); opacity: 0; }
        }
        .animate-star-flow {
          animation: star-flow linear infinite;
        }

        /* Вибрация корпуса от работы двигателей */
        @keyframes rocket-thrust {
          0%, 100% { transform: translate(0, 0); }
          25% { transform: translate(0.5px, -0.5px); }
          50% { transform: translate(-0.5px, 0.5px); }
          75% { transform: translate(-0.5px, -0.5px); }
        }
        .animate-rocket-thrust {
          animation: rocket-thrust 0.05s linear infinite;
        }

        /* Плавное появление контента после 1.2 секунд */
        @keyframes reveal-content {
          0%, 60% { opacity: 0; transform: translateY(15px); }
          100% { opacity: 1; transform: translateY(0); }
        }
        .animate-reveal-content {
          animation: reveal-content 2s cubic-bezier(0.2, 0.8, 0.2, 1) forwards;
        }
      `}</style>
    </div>
  );
};

export default SplashScreen;
