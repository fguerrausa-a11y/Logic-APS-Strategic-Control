
import React, { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { NavItem } from '../types';
import { supabase } from '../services/supabaseClient';
import { useTranslation, languages } from '../services/languageService';

const Sidebar: React.FC = () => {
  const { t, language, setLanguage } = useTranslation();
  const location = useLocation();
  const activePage = location.pathname;
  const [userName, setUserName] = useState('Cargando...');
  const [userRole, setUserRole] = useState(t('settings')); // Fallback translation

  /* 
  // Disable Supabase profile fetching for now to prevent crashes
  useEffect(() => {
    const fetchProfile = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data } = await supabase
          .from('profiles')
          .select('full_name, role')
          .eq('id', user.id)
          .single();

        if (data) {
          setUserName(data.full_name || user.email?.split('@')[0] || 'Usuario');
          setUserRole(data.role === 'Planner' ? 'Planificador' : data.role || 'Planificador');
        } else {
          setUserName(user.email?.split('@')[0] || 'Usuario');
        }
      }
    };
    fetchProfile();
  }, []);
  */

  // Initialize with mock data
  useEffect(() => {
    setUserName('Jefe de Planta');
    const roles: Record<string, string> = {
      es: 'Gerente de Operaciones',
      en: 'Operations Manager',
      fr: 'Directeur des Opérations',
      de: 'Betriebsleiter',
      pt: 'Gerente de Operações',
      zh: '运营经理'
    };
    setUserRole(roles[language] || roles['en']);
  }, [language]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
  };

  const navItems: NavItem[] = [
    { name: t('dashboard'), icon: 'dashboard', path: '/' },
    { name: t('schedule'), icon: 'calendar_clock', path: '/schedule' },
    { name: t('work_centers'), icon: 'factory', path: '/load' },
    { name: t('inventory_buffers'), icon: 'inventory_2', path: '/buffers' },
    { name: t('data_explorer'), icon: 'database', path: '/data-explorer' },
    { name: t('reports'), icon: 'description', path: '/outputs' },
  ];

  const intelligenceItems: NavItem[] = [
    { name: t('strategic_ia'), icon: 'psychology', path: '/simulation' },
    { name: t('analytics'), icon: 'analytics', path: '/analytics' },
    { name: t('settings'), icon: 'settings', path: '/settings' },
  ];

  return (
    <aside className="hidden lg:flex w-[240px] flex-col bg-[var(--bg-sidebar)] border-r border-[var(--border-color)] h-full shrink-0 transition-colors">
      <div className="p-6 flex items-center gap-3">
        <div
          className="bg-center bg-no-repeat bg-cover rounded-lg size-10 shadow-lg shadow-indigo-500/20"
          style={{ backgroundImage: 'url("https://lh3.googleusercontent.com/aida-public/AB6AXuDBaAaLOwN9NJO1l9OflRaFXTkw-TWnbi9Hl4zELKASFxHvZ61Ihkujk9dcmGtqjhJl4lvgI5BKlOJH1DD6BMRgFZjiEdR46M54cdH7pnYVEnLB--IyQ0AH3kZAVm1ofUSsIHP8tbVSgI5h9o7MMn0eG7vKkfEePvEkOXUazZSFNxmjKILJ5-AqooT9lVcFw9K6odGcig26flhuCW8QrfHdvSrJoqo3nMevVsz9ymKRwbsJaBsyxxXFUEViwEmo4q6Qd9F4_cG1Azls")' }}
        ></div>
        <div>
          <h1 className="text-[var(--text-main)] text-lg font-black tracking-tighter">Logic APS</h1>
          <p className="text-[var(--text-muted)] text-[10px] font-black uppercase tracking-widest">Ver. 5.3.0</p>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto px-4 py-2 flex flex-col gap-2">
        <p className="px-3 text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest mb-2 mt-2">{t('main_menu')}</p>
        {navItems.map((item) => (
          <Link
            key={item.path}
            to={item.path}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all ${activePage === item.path ? 'bg-indigo-600/10 border border-indigo-500/20 text-indigo-500 shadow-sm' : 'text-[var(--text-muted)] hover:bg-[var(--row-hover)] hover:text-[var(--text-main)]'}`}
          >
            <span className="material-symbols-outlined text-xl">{item.icon}</span>
            <span className="text-lg font-bold tracking-tight">{item.name}</span>
          </Link>
        ))}

        <div className="h-px bg-[var(--border-color)] my-4"></div>
        <p className="px-3 text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest mb-2">{t('intelligence')}</p>
        {intelligenceItems.map((item) => (
          <Link
            key={item.path}
            to={item.path}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all group ${activePage === item.path ? 'bg-indigo-600/10 border border-indigo-500/20 text-indigo-500' : 'text-[var(--text-muted)] hover:bg-[var(--row-hover)] hover:text-[var(--text-main)]'}`}
          >
            <span className={`material-symbols-outlined text-xl transition-colors ${activePage === item.path ? '' : 'text-indigo-400 group-hover:text-white'}`}>{item.icon}</span>
            <span className="text-lg font-bold tracking-tight">{item.name}</span>
          </Link>
        ))}
      </nav>

      <div className="p-4 border-t border-[var(--border-color)] space-y-3">
        {/* Language Selector */}
        <div className="flex flex-col gap-1.5">
          <p className="px-3 text-[8px] font-black text-[var(--text-muted)] uppercase tracking-widest">{t('language')}</p>
          <div className="grid grid-cols-3 gap-1 px-1">
            {languages.map(lang => (
              <button
                key={lang.code}
                onClick={() => setLanguage(lang.code)}
                className={`flex flex-col items-center p-1.5 rounded-lg border transition-all ${language === lang.code ? 'bg-indigo-600/10 border-indigo-500/50 shadow-sm shadow-indigo-500/10' : 'bg-[var(--bg-main)] border-[var(--border-color)] grayscale hover:grayscale-0 hover:border-indigo-500/30'}`}
                title={lang.name}
              >
                <span className="text-sm">{lang.flag}</span>
                <span className={`text-[7px] font-black uppercase mt-0.5 ${language === lang.code ? 'text-indigo-500' : 'text-[var(--text-muted)]'}`}>{lang.code}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Real-time Theme Toggle inside Sidebar */}
        <button
          onClick={() => {
            const current = document.documentElement.getAttribute('data-theme') || 'dark';
            const next = current === 'dark' ? 'light' : 'dark';
            document.documentElement.setAttribute('data-theme', next);
            localStorage.setItem('theme', next);
            window.dispatchEvent(new Event('storage')); // Trigger update in other tabs/components
          }}
          className="w-full flex items-center justify-between px-4 py-2.5 rounded-xl bg-[var(--bg-main)] border border-[var(--border-color)] text-[var(--text-muted)] hover:text-[var(--text-main)] transition-all"
        >
          <span className="text-[10px] font-black uppercase tracking-widest">{t('visual_aesthetic')}</span>
          <span className="material-symbols-outlined text-xl">
            {document.documentElement.getAttribute('data-theme') === 'light' ? 'light_mode' : 'dark_mode'}
          </span>
        </button>

        <div className="flex items-center justify-between gap-3 px-3 py-2 rounded-xl bg-[var(--bg-card)] border border-[var(--border-color)]">
          <div className="flex items-center gap-3">
            <div className="size-8 rounded-full bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-xs font-black text-indigo-500">
              {userName.substring(0, 2).toUpperCase()}
            </div>
            <div className="flex flex-col">
              <p className="text-[var(--text-main)] text-sm font-bold truncate max-w-[120px]">{userName}</p>
              <p className="text-[var(--text-muted)] text-[10px] font-bold uppercase">{userRole}</p>
            </div>
          </div>
          <button
            onClick={handleSignOut}
            className="text-[var(--text-muted)] hover:text-rose-500 transition-colors"
            title={t('logout')}
          >
            <span className="material-symbols-outlined text-xl">logout</span>
          </button>
        </div>
      </div>
    </aside>

  );
};

export default Sidebar;
