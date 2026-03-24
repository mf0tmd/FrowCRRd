
import React, { useState, useEffect } from 'react';
import { ChevronLeft, FileCode, Clock, Trash2, FolderOpen, Search } from 'lucide-react';
import { RocketConfig } from '../types';
import { deleteProjectFromStorage, listProjectsFromStorage } from '../projectStorage';

interface RecentProjectsViewProps {
  onBack: () => void;
  onLoadProject: (project: RocketConfig) => void;
  theme: 'dark' | 'light';
  language?: 'ru' | 'en';
  t: (key: any) => string;
}

const RecentProjectsView: React.FC<RecentProjectsViewProps> = ({ onBack, onLoadProject, theme, language, t }) => {
  const [projects, setProjects] = useState<RocketConfig[]>([]);
  const [search, setSearch] = useState('');
  const isDark = theme === 'dark';
  const isRu = language === 'ru';
  const tr = (en: string, ru: string) => (isRu ? ru : en);
  const localizeMissionType = (missionType: string) => {
    if (missionType === 'Testing') {
      return tr('Testing', 'Тестирование');
    }
    return missionType;
  };

  useEffect(() => {
    const loadProjects = async () => {
      try {
        const storedProjects = await listProjectsFromStorage();
        setProjects(storedProjects);
      } catch (error) {
        console.error('Failed to load projects', error);
      }
    };

    void loadProjects();
  }, []);

  const deleteProject = async (id: string) => {
    try {
      await deleteProjectFromStorage(id);
      setProjects((prevProjects) => prevProjects.filter((project) => project.id !== id));
    } catch (error) {
      console.error('Failed to delete project', error);
    }
  };

  const filteredProjects = projects.filter((project) => {
    const missionName = (project.missionName || '').toLowerCase();
    const missionType = (project.missionType || '').toLowerCase();
    const query = search.toLowerCase();
    return missionName.includes(query) || missionType.includes(query);
  });

  return (
    <div className={`w-full h-full flex flex-col p-8 overflow-hidden font-mono transition-colors duration-300 ${isDark ? 'bg-[#0a0a0a]' : 'bg-gray-50'}`}>
      <div className="flex items-center justify-between mb-12 max-w-5xl mx-auto w-full">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className={`p-2 rounded transition-colors text-blue-500 ${isDark ? 'hover:bg-[#1a1a1a]' : 'hover:bg-gray-200'}`}>
            <ChevronLeft size={24} />
          </button>
          <h1 className={`text-3xl font-black uppercase tracking-tighter ${isDark ? 'text-white' : 'text-gray-900'}`}>{t('recent_title')}</h1>
        </div>

        <div className="relative w-64 group">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-600 group-focus-within:text-blue-500 transition-colors" size={14} />
          <input 
            type="text"
            placeholder={t('recent_search')}
            className={`w-full border-2 pl-10 pr-4 py-2 text-xs font-bold outline-none transition-all rounded ${isDark ? 'bg-[#111] border-[#333] text-gray-300 focus:border-blue-500/50' : 'bg-white border-gray-200 text-gray-800 focus:border-blue-500'}`}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      <div className="max-w-5xl mx-auto w-full flex-1 overflow-y-auto custom-scrollbar pr-4">
        <div className="grid gap-4">
          {filteredProjects.length > 0 ? filteredProjects.map((p, i) => (
            <div key={p.id} className={`group border-2 p-5 flex items-center justify-between transition-all shadow-xl rounded ${isDark ? 'bg-[#111] border-[#333] hover:border-blue-500' : 'bg-white border-gray-100 hover:border-blue-500'}`}>
               <div className="flex items-center gap-6">
                  <div className={`p-4 border-2 shadow-[0_0_15px_rgba(59,130,246,0.1)] rounded ${isDark ? 'bg-[#0a0a0a] border-blue-900/40 text-blue-500' : 'bg-blue-50 border-blue-100 text-blue-600'}`}>
                    <FileCode size={28} />
                  </div>
                  <div>
                    <h3 className={`font-black uppercase tracking-widest text-sm ${isDark ? 'text-white' : 'text-gray-900'}`}>{p.missionName}</h3>
                    <div className="flex items-center gap-4 text-[10px] text-gray-500 mt-1 uppercase font-bold tracking-tighter">
                      <span className="flex items-center gap-1.5"><Clock size={12} className="text-blue-500/50" /> {new Date(parseInt(p.id)).toLocaleString(isRu ? 'ru-RU' : 'en-US')}</span>
                      <span className={`px-2 py-0.5 border-2 rounded ${isDark ? 'bg-blue-900/10 border-blue-900/50 text-blue-400' : 'bg-blue-100 border-blue-200 text-blue-700'}`}>{localizeMissionType(p.missionType || '')}</span>
                      <span>{tr('Stages', 'Ступеней')}: {p.stages.length}</span>
                    </div>
                  </div>
               </div>

               <div className="flex gap-3">
                  <button 
                    onClick={() => onLoadProject(p)}
                    className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-6 py-2.5 text-[10px] font-black uppercase tracking-widest transition-all shadow-[0_0_10px_rgba(37,99,235,0.2)] rounded-sm"
                  >
                    <FolderOpen size={14} /> {t('recent_restore')}
                  </button>
                  <button 
                    onClick={() => deleteProject(p.id)}
                    className={`flex items-center justify-center w-10 h-10 border-2 transition-all rounded-sm ${isDark ? 'bg-[#1a1a1a] border-[#333] text-gray-600 hover:bg-red-900/40 hover:text-red-400' : 'bg-gray-50 border-gray-200 text-gray-400 hover:bg-red-50 hover:text-red-600'}`}
                    title={tr('Delete from archive', 'Удалить из архива')}
                  >
                    <Trash2 size={16} />
                  </button>
               </div>
            </div>
          )) : (
            <div className={`h-64 flex flex-col items-center justify-center border-2 border-dashed opacity-50 rounded ${isDark ? 'border-[#333]' : 'border-gray-300'}`}>
               <FileCode size={48} className="text-gray-700 mb-4" />
               <span className="text-xs uppercase font-black tracking-[0.3em] text-gray-600">{t('recent_empty')}</span>
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

export default RecentProjectsView;
