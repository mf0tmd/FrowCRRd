
import React, { useState } from 'react';
import { ChevronLeft, Globe, Palette, FolderOpen } from 'lucide-react';
import { Language } from '../translations';

interface SettingsViewProps {
  onBack: () => void;
  language: Language;
  setLanguage: (lang: Language) => void;
  theme: 'dark' | 'light';
  setTheme: (theme: 'dark' | 'light') => void;
  t: (key: any) => string;
}

const SettingsView: React.FC<SettingsViewProps> = ({ onBack, language, setLanguage, theme, setTheme, t }) => {
  const [savePath, setSavePath] = useState(localStorage.getItem('save_path') || '');
  const [isPickingPath, setIsPickingPath] = useState(false);
  const isRu = language === 'ru';
  const tr = (en: string, ru: string) => (isRu ? ru : en);

  const handlePathChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSavePath(e.target.value);
    localStorage.setItem('save_path', e.target.value);
  };

  const handleSelectFolder = async () => {
    if (!window.desktopApp?.selectDirectory || isPickingPath) return;

    try {
      setIsPickingPath(true);
      const selectedPath = await window.desktopApp.selectDirectory();
      if (!selectedPath) return;
      setSavePath(selectedPath);
      localStorage.setItem('save_path', selectedPath);
    } catch (error) {
      console.error('Failed to select folder', error);
    } finally {
      setIsPickingPath(false);
    }
  };

  const isDark = theme === 'dark';

  return (
    <div className={`w-full h-full flex flex-col p-8 transition-colors duration-300 ${isDark ? 'bg-[#0a0a0a]' : 'bg-gray-50'}`}>
      <div className="flex items-center gap-4 mb-12">
        <button onClick={onBack} className={`p-2 rounded transition-colors ${isDark ? 'hover:bg-[#1a1a1a] text-white' : 'hover:bg-gray-200 text-gray-900'}`}>
          <ChevronLeft size={24} />
        </button>
        <h1 className={`text-3xl font-bold uppercase tracking-tight ${isDark ? 'text-white' : 'text-gray-900'}`}>
          {t('settings_title')}
        </h1>
      </div>

      <div className="max-w-4xl mx-auto w-full space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Language Selection */}
          <div className={`${isDark ? 'bg-[#141414] border-2 border-[#333]' : 'bg-white border-gray-200 shadow-sm'} border p-6 rounded-sm`}>
            <div className="flex items-center gap-3 mb-6 text-blue-400">
              <Globe size={20} />
              <h2 className="font-bold uppercase">{t('settings_lang')}</h2>
            </div>
            <select 
              value={language}
              onChange={(e) => setLanguage(e.target.value as Language)}
              className={`w-full border p-3 text-sm outline-none focus:border-blue-500 rounded ${isDark ? 'bg-[#1a1a1a] border-[#333] text-white' : 'bg-gray-50 border-gray-300 text-gray-900'}`}
            >
              <option value="ru">{tr('Russian', 'Русский')}</option>
              <option value="en">{tr('English', 'Английский')}</option>
            </select>
          </div>

          {/* Theme Selection */}
          <div className={`${isDark ? 'bg-[#141414] border-2 border-[#333]' : 'bg-white border-gray-200 shadow-sm'} border p-6 rounded-sm`}>
            <div className="flex items-center gap-3 mb-6 text-blue-400">
              <Palette size={20} />
              <h2 className="font-bold uppercase">{t('settings_theme')}</h2>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button 
                onClick={() => setTheme('dark')}
                className={`p-2 text-xs border transition-all ${isDark ? 'bg-blue-600 text-white border-blue-400' : 'bg-gray-100 text-gray-500 border-gray-200 hover:bg-gray-200'}`}
              >
                {tr('Dark', 'Тёмная')}
              </button>
              <button 
                onClick={() => setTheme('light')}
                className={`p-2 text-xs border transition-all ${!isDark ? 'bg-blue-600 text-white border-blue-400' : 'bg-[#1a1a1a] text-gray-400 border-[#333] hover:bg-[#252525]'}`}
              >
                {tr('Light', 'Светлая')}
              </button>
            </div>
          </div>
        </div>

        {/* Save Folder Selection */}
        <div className={`${isDark ? 'bg-[#141414] border-2 border-[#333]' : 'bg-white border-gray-200 shadow-sm'} border p-6 rounded-sm`}>
            <div className="flex items-center gap-3 mb-6 text-blue-400">
              <FolderOpen size={20} />
              <h2 className="font-bold uppercase">{t('settings_storage')}</h2>
            </div>
            <div className="space-y-4">
               <div className="flex flex-col gap-2">
                  <span className={`text-sm ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>{tr('Local project path', 'Локальный путь проекта')}</span>
                  <div className="relative group">
                    <input 
                      type="text" 
                      placeholder={t('settings_storage_placeholder')}
                      value={savePath}
                      onChange={handlePathChange}
                      className={`w-full border p-3 pr-11 text-sm outline-none focus:border-blue-500 rounded transition-all ${isDark ? 'bg-[#1a1a1a] border-[#333] text-white' : 'bg-gray-50 border-gray-200 text-gray-900'}`} 
                    />
                    <button
                      type="button"
                      onClick={handleSelectFolder}
                      disabled={!window.desktopApp?.selectDirectory || isPickingPath}
                      className={`absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded transition-colors ${
                        isDark
                          ? 'text-gray-500 hover:text-blue-400 disabled:text-gray-700'
                          : 'text-gray-500 hover:text-blue-600 disabled:text-gray-300'
                      }`}
                      title={tr('Select folder', 'Выбрать папку')}
                    >
                      <FolderOpen size={16} />
                    </button>
                  </div>
               </div>
            </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsView;
