
import React from 'react';
import { Link } from 'react-router-dom';

interface TopHeaderProps {
  title: string;
  icon?: string;
  showSimulationButton?: boolean;
}

import { useTranslation } from '../services/languageService';

const TopHeader: React.FC<TopHeaderProps> = ({ title, icon, showSimulationButton }) => {
  const { t } = useTranslation();
  return (
    <header className="h-20 border-b border-[var(--border-color)] bg-[var(--bg-sidebar)] flex items-center justify-between px-8 shrink-0 z-20 shadow-sm transition-colors">
      <h2 className="text-[var(--text-main)] text-xl font-black uppercase tracking-tighter flex items-center gap-3">
        {icon && (
          <div className="p-2.5 bg-indigo-500/10 rounded-xl text-indigo-500 border border-indigo-500/20">
            <span className="material-symbols-outlined text-xl">{icon}</span>
          </div>
        )}
        {title}
      </h2>
      <div className="flex items-center gap-6">
        {showSimulationButton && (
          <Link to="/simulation" className="hidden lg:flex items-center gap-3 px-6 py-2.5 rounded-[1.25rem] bg-indigo-600 hover:bg-indigo-500 text-white font-black uppercase text-[10px] tracking-widest shadow-lg shadow-indigo-600/20 transition-all hover:scale-105 active:scale-95">
            <span className="material-symbols-outlined text-[18px]">play_circle</span>
            <span>{t('launch_simulation')}</span>
          </Link>
        )}
        {showSimulationButton && <div className="w-px h-8 bg-[var(--border-color)]"></div>}
        <div className="flex items-center gap-2.5 px-4 py-2 bg-[var(--bg-card)] rounded-full border border-[var(--border-color)] shadow-inner">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
          <span className="text-[9px] font-black text-[var(--text-muted)] uppercase tracking-widest text-[#10b981]">Live</span>
        </div>
        <button className="text-[var(--text-muted)] hover:text-[var(--text-main)] transition-colors relative p-2 rounded-xl hover:bg-[var(--row-hover)]">
          <span className="material-symbols-outlined text-2xl">notifications</span>
          <span className="absolute top-2 right-2 w-2 h-2 bg-rose-500 rounded-full border-2 border-[var(--bg-sidebar)]"></span>
        </button>
        <div className="flex items-center gap-3 pl-2">
          <div className="size-10 rounded-2xl bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-indigo-500 shadow-sm">
            <span className="material-symbols-outlined text-2xl">account_circle</span>
          </div>
        </div>
      </div>
    </header>
  );
};

export default TopHeader;
