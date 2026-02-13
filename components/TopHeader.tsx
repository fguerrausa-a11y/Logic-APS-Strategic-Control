
import React from 'react';
import { Link } from 'react-router-dom';

interface TopHeaderProps {
  title: string;
  icon?: string;
  showSimulationButton?: boolean;
  notificationContent?: {
    title: string;
    message: React.ReactNode;
    type?: 'info' | 'warning' | 'success';
    onApply?: () => void;
    onDismiss?: () => void;
  } | null;
}

import { useTranslation } from '../services/languageService';
import { useState } from 'react';

const TopHeader: React.FC<TopHeaderProps> = ({ title, icon, showSimulationButton, notificationContent }) => {
  const { t } = useTranslation();
  const [showNotifications, setShowNotifications] = useState(false);

  return (
    <header className="h-20 border-b border-[var(--border-color)] bg-[var(--bg-sidebar)] flex items-center justify-between px-8 shrink-0 z-20 shadow-sm transition-colors relative">
      <h2 className="text-[var(--text-main)] text-xl font-black uppercase tracking-tighter flex items-center gap-3">
        {icon && (
          <div className="p-2.5 bg-indigo-500/10 rounded-xl text-indigo-500 border border-indigo-500/20">
            <span className="material-symbols-outlined text-xl" translate="no">{icon}</span>
          </div>
        )}
        {title}
      </h2>
      <div className="flex items-center gap-6">
        {showSimulationButton && (
          <Link to="/simulation" className="hidden lg:flex items-center gap-3 px-6 py-2.5 rounded-[1.25rem] bg-indigo-600 hover:bg-indigo-500 text-white font-black uppercase text-[10px] tracking-widest shadow-lg shadow-indigo-600/20 transition-all hover:scale-105 active:scale-95">
            <span className="material-symbols-outlined text-[18px]" translate="no">play_circle</span>
            <span>{t('launch_simulation')}</span>
          </Link>
        )}
        {showSimulationButton && <div className="w-px h-8 bg-[var(--border-color)]"></div>}
        <div className="flex items-center gap-2.5 px-4 py-2 bg-[var(--bg-card)] rounded-full border border-[var(--border-color)] shadow-inner">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
          <span className="text-[9px] font-black text-[var(--text-muted)] uppercase tracking-widest text-[#10b981]">{t('live')}</span>
        </div>

        <div className="relative">
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className={`text-[var(--text-muted)] hover:text-[var(--text-main)] transition-colors relative p-2 rounded-xl hover:bg-[var(--row-hover)] ${showNotifications ? 'bg-[var(--bg-active)] text-indigo-500' : ''}`}
          >
            <span className="material-symbols-outlined text-2xl" translate="no">notifications</span>
            {notificationContent && (
              <span className="absolute top-2 right-2 w-2 h-2 bg-rose-500 rounded-full border-2 border-[var(--bg-sidebar)] animate-pulse"></span>
            )}
          </button>

          {showNotifications && (
            <div className="absolute right-0 top-full mt-4 w-96 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-3xl shadow-2xl overflow-hidden z-50 backdrop-blur-3xl animate-in fade-in zoom-in-95 duration-200 origin-top-right">
              <div className="p-4 border-b border-[var(--border-color)] bg-[var(--bg-sidebar)] flex items-center justify-between">
                <h4 className="text-sm font-black uppercase tracking-tighter text-[var(--text-main)]">{t('notifications')}</h4>
                <button onClick={() => setShowNotifications(false)} className="text-[var(--text-muted)] hover:text-[var(--text-main)]">
                  <span className="material-symbols-outlined text-lg">close</span>
                </button>
              </div>
              <div className="p-2 max-h-[400px] overflow-y-auto">
                {notificationContent ? (
                  <div className="p-4 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 hover:bg-indigo-500/15 transition-colors cursor-pointer group">
                    <div className="flex items-start gap-4">
                      <div className="p-2.5 bg-indigo-500/20 rounded-xl text-indigo-500 border border-indigo-500/20 group-hover:scale-110 transition-transform">
                        <span className="material-symbols-outlined text-xl">trending_down</span>
                      </div>
                      <div>
                        <h5 className="text-[11px] font-black uppercase tracking-widest text-indigo-400 mb-1">{notificationContent.title}</h5>
                        <p className="text-xs font-medium text-[var(--text-secondary)] leading-relaxed">
                          {notificationContent.message}
                        </p>
                        <div className="mt-3 flex gap-2">
                          <button
                            onClick={() => {
                              notificationContent.onApply && notificationContent.onApply();
                              setShowNotifications(false);
                            }}
                            className="px-3 py-1.5 rounded-lg bg-indigo-600 text-white text-[9px] font-black uppercase tracking-widest hover:bg-indigo-500 transition-colors shadow-lg shadow-indigo-600/20"
                          >
                            {t('apply_changes')}
                          </button>
                          <button
                            onClick={() => {
                              notificationContent.onDismiss && notificationContent.onDismiss();
                              setShowNotifications(false);
                            }}
                            className="px-3 py-1.5 rounded-lg border border-[var(--border-color)] text-[var(--text-muted)] text-[9px] font-black uppercase tracking-widest hover:bg-[var(--bg-hover)] transition-colors"
                          >
                            {t('dismiss')}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="py-10 text-center text-[var(--text-muted)]">
                    <span className="material-symbols-outlined text-4xl opacity-20 mb-2">notifications_off</span>
                    <p className="text-[10px] font-black uppercase tracking-widest opacity-60">{t('no_notifications')}</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center gap-3 pl-2">
          <div className="size-10 rounded-2xl bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-indigo-500 shadow-sm">
            <span className="material-symbols-outlined text-2xl" translate="no">account_circle</span>
          </div>
        </div>
      </div>
    </header>
  );
};

export default TopHeader;
