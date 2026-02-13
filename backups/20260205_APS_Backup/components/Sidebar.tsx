
import React, { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { NavItem } from '../types';
import { supabase } from '../services/supabaseClient';
import { useTranslation, languages } from '../services/languageService';
import { useSimulation } from '../services/SimulationContext';
import { ChevronsUpDown, Cpu, Trash2, CheckSquare, Square, X } from 'lucide-react';

const Sidebar: React.FC = () => {
  const { t, language, setLanguage } = useTranslation();
  const { selectedScenarioId, setSelectedScenarioId, scenarios, deleteScenarios } = useSimulation();
  const location = useLocation();
  const activePage = location.pathname;
  const [userName, setUserName] = useState('Cargando...');
  const [userRole, setUserRole] = useState(t('settings'));
  const [isSimDropdownOpen, setIsSimDropdownOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [lastSelectedIndex, setLastSelectedIndex] = useState<number | null>(null);

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
    setUserName(t('plant_manager'));
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
          <p className="text-[var(--text-muted)] text-[10px] font-black uppercase tracking-widest">{t('version')} 5.3.0</p>
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

      <div className="p-4 border-t border-[var(--border-color)] space-y-4 bg-gradient-to-t from-[var(--bg-main)]/20 to-transparent">
        <div className="px-1">
          <p className="text-[9px] font-black text-[var(--text-muted)] uppercase tracking-widest mb-2 flex items-center gap-2">
            <Cpu size={12} className="text-indigo-500" /> {t('active_scenario')}
          </p>
          <div className="relative">
            <div
              onClick={() => setIsSimDropdownOpen(!isSimDropdownOpen)}
              className="w-full bg-[var(--bg-main)] border border-indigo-500/30 rounded-xl px-3 py-2 flex items-center justify-between cursor-pointer hover:border-indigo-500 group transition-all"
            >
              <span className="text-[11px] font-black text-indigo-500 truncate max-w-[140px]">
                {scenarios.find(s => s.id === selectedScenarioId)?.name || t('select_simulation')}
              </span>
              <ChevronsUpDown size={12} className="text-indigo-500/50 group-hover:text-indigo-500" />
            </div>

            {isSimDropdownOpen && (
              <div className="absolute bottom-full left-0 mb-2 w-[240px] bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl shadow-2xl z-50 overflow-hidden animate-in fade-in slide-in-from-bottom-2">
                <div className="p-3 border-b border-[var(--border-color)] bg-[var(--bg-sidebar)] flex justify-between items-center">
                  <span className="text-[9px] font-black text-[var(--text-muted)] uppercase tracking-widest">
                    {selectedIds.length > 0 ? `${selectedIds.length} seleccionados` : t('select_simulation')}
                  </span>
                  {selectedIds.length > 0 && (
                    <button
                      onClick={async (e) => {
                        e.stopPropagation();
                        if (confirm(t('delete_msg_multiple', { count: selectedIds.length }))) {
                          await deleteScenarios(selectedIds);
                          setSelectedIds([]);
                        }
                      }}
                      className="text-rose-500 p-1 hover:bg-rose-500/10 rounded-lg transition-all"
                      title={t('delete')}
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                  <button onClick={(e) => { e.stopPropagation(); setIsSimDropdownOpen(false); }} className="text-[var(--text-muted)] hover:text-[var(--text-main)] transition-colors">
                    <X size={14} />
                  </button>
                </div>
                <div className="max-h-[300px] overflow-y-auto custom-scrollbar p-1">
                  {scenarios.map((s, idx) => (
                    <div
                      key={s.id}
                      onClick={(e) => {
                        e.stopPropagation();
                        if (e.shiftKey && lastSelectedIndex !== null) {
                          const start = Math.min(lastSelectedIndex, idx);
                          const end = Math.max(lastSelectedIndex, idx);
                          const rangeIds = scenarios.slice(start, end + 1).map(sc => sc.id);
                          setSelectedIds(prev => Array.from(new Set([...prev, ...rangeIds])));
                        } else {
                          setSelectedScenarioId(s.id);
                          setLastSelectedIndex(idx);
                        }
                      }}
                      className={`flex items-center gap-3 p-2.5 rounded-xl cursor-pointer transition-all group ${selectedScenarioId === s.id ? 'bg-indigo-600/10 text-indigo-500' : 'hover:bg-indigo-500/5 text-[var(--text-main)]'}`}
                    >
                      <div
                        onClick={(e) => {
                          e.stopPropagation();
                          const next = selectedIds.includes(s.id)
                            ? selectedIds.filter(id => id !== s.id)
                            : [...selectedIds, s.id];
                          setSelectedIds(next);
                          setLastSelectedIndex(idx);
                        }}
                        className={`shrink-0 transition-colors ${selectedIds.includes(s.id) ? 'text-indigo-500' : 'text-[var(--text-muted)] group-hover:text-indigo-400'}`}
                      >
                        {selectedIds.includes(s.id) ? <CheckSquare size={14} /> : <Square size={14} />}
                      </div>
                      <div className="flex-1 overflow-hidden">
                        <p className="text-[11px] font-bold truncate leading-none">{s.name}</p>
                        <p className="text-[8px] font-bold opacity-40 uppercase mt-1">{new Date(s.created_at).toLocaleDateString()}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="h-px bg-gradient-to-r from-transparent via-[var(--border-color)] to-transparent"></div>

        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 flex-1 overflow-hidden">
            <div className="size-8 rounded-full bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-xs font-black text-indigo-500 shrink-0">
              {userName.substring(0, 2).toUpperCase()}
            </div>
            <div className="flex flex-col overflow-hidden">
              <p className="text-[var(--text-main)] text-sm font-bold truncate">{userName}</p>
              <p className="text-[var(--text-muted)] text-[10px] font-bold uppercase truncate">{userRole}</p>
            </div>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <button
              onClick={() => {
                const current = (document.documentElement.getAttribute('data-theme') as 'light' | 'dark') || 'dark';
                const next = current === 'dark' ? 'light' : 'dark';
                document.documentElement.setAttribute('data-theme', next);
                localStorage.setItem('theme', next);
                window.dispatchEvent(new Event('storage'));
              }}
              className="size-9 flex items-center justify-center rounded-xl bg-[var(--bg-main)] border border-[var(--border-color)] text-[var(--text-muted)] hover:text-[var(--text-main)] transition-all hover:border-indigo-500/50"
              title={t('visual_aesthetic')}
            >
              <span className="material-symbols-outlined text-[20px]">
                {document.documentElement.getAttribute('data-theme') === 'light' ? 'light_mode' : 'dark_mode'}
              </span>
            </button>
            <button
              onClick={handleSignOut}
              className="size-9 flex items-center justify-center rounded-xl text-[var(--text-muted)] hover:text-rose-500 hover:bg-rose-500/5 transition-all"
              title={t('logout')}
            >
              <span className="material-symbols-outlined text-[20px]">logout</span>
            </button>
          </div>
        </div>
      </div>
    </aside>

  );
};

export default Sidebar;
