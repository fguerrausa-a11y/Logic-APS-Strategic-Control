
import React, { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { NavItem } from '../types';
import { supabase } from '../services/supabaseClient';
import { useTranslation, languages } from '../services/languageService';
import { useSimulation } from '../services/SimulationContext';
import { ChevronsUpDown, Cpu, Trash2, CheckSquare, Square, X, ChevronDown } from 'lucide-react';

interface MenuSectionProps {
  id: string;
  label: string;
  items: NavItem[];
  icon: string;
  isExpanded: boolean;
  toggleSection: (id: string) => void;
  activePage: string;
}

const MenuSection: React.FC<MenuSectionProps> = ({
  id,
  label,
  items,
  icon,
  isExpanded,
  toggleSection,
  activePage
}) => {
  const hasActiveItem = items.some(i => i.path === activePage);

  return (
    <div className="flex flex-col gap-1">
      <button
        onClick={() => toggleSection(id)}
        className={`flex items-center justify-between px-3 py-4 rounded-xl transition-all group ${hasActiveItem ? 'text-indigo-500 font-extrabold' : 'text-[var(--text-muted)] hover:bg-[var(--row-hover)] hover:text-[var(--text-main)]'
          }`}
      >
        <div className="flex items-center gap-3">
          <span className={`material-symbols-outlined text-2xl transition-colors ${hasActiveItem ? 'text-indigo-500' : 'text-slate-500 opacity-60 group-hover:opacity-100'
            }`} translate="no">{icon}</span>
          <span className="text-[13px] font-black uppercase tracking-[0.15em]">{label}</span>
        </div>
        <ChevronDown
          size={18}
          className={`transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''} ${hasActiveItem ? 'text-indigo-500' : 'opacity-40'}`}
        />
      </button>

      <div className={`overflow-hidden transition-all duration-300 flex flex-col gap-1.5 pl-6 ${isExpanded ? 'max-h-[500px] opacity-100 mb-6' : 'max-h-0 opacity-0'}`}>
        <div className="absolute left-7 top-0 bottom-0 w-px bg-indigo-500/20 ml-1"></div>
        {items.map((item) => (
          <Link
            key={item.path}
            to={item.path}
            className={`flex items-center gap-4 px-4 py-3 rounded-xl transition-all border border-transparent ${activePage === item.path
              ? 'bg-indigo-600/10 border-indigo-500/20 text-indigo-500 shadow-sm'
              : 'text-[var(--text-muted)] hover:text-indigo-400 hover:translate-x-1.5'
              }`}
          >
            <span className={`material-symbols-outlined text-[20px] ${activePage === item.path ? '' : 'opacity-50'}`} translate="no">{item.icon}</span>
            <span className="text-[14px] font-extrabold tracking-tight">{item.name}</span>
          </Link>
        ))}
      </div>
    </div>
  );
};

const Sidebar: React.FC = () => {
  const { t, language, setLanguage } = useTranslation();
  const { selectedScenarioId, setSelectedScenarioId, scenarios, deleteScenarios } = useSimulation();
  const location = useLocation();
  const activePage = location.pathname;
  const [userName, setUserName] = useState(t('loading'));
  const [userRole, setUserRole] = useState('');
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
    setUserRole(t('operations_manager'));
  }, [t]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
  };

  const [expandedSections, setExpandedSections] = useState<string[]>(['operation']);

  const toggleSection = (section: string) => {
    setExpandedSections(prev =>
      prev.includes(section)
        ? prev.filter(s => s !== section)
        : [...prev, section]
    );
  };

  const operationItems: NavItem[] = [
    { name: t('dashboard'), icon: 'grid_view', path: '/' },
    { name: t('schedule'), icon: 'calendar_clock', path: '/schedule' },
    { name: t('work_centers'), icon: 'precision_manufacturing', path: '/load' },
  ];

  const intelligenceItems: NavItem[] = [
    { name: t('strategic_ia'), icon: 'psychology', path: '/simulation' },
    { name: t('analytics'), icon: 'analytics', path: '/analytics' },
    { name: t('calibration'), icon: 'tune', path: '/calibration' },
    { name: t('certification'), icon: 'verified_user', path: '/certification' },
  ];

  const dataItems: NavItem[] = [
    { name: t('inventory_buffers'), icon: 'inventory_2', path: '/buffers' },
    { name: t('master_explorer'), icon: 'database', path: '/data-explorer' },
    { name: t('reports'), icon: 'description', path: '/outputs' },
  ];

  const configItems: NavItem[] = [
    { name: t('settings'), icon: 'settings', path: '/settings' },
  ];

  useEffect(() => {
    if (operationItems.some(i => i.path === activePage)) setExpandedSections(p => Array.from(new Set([...p, 'operation'])));
    if (intelligenceItems.some(i => i.path === activePage)) setExpandedSections(p => Array.from(new Set([...p, 'intelligence'])));
    if (dataItems.some(i => i.path === activePage)) setExpandedSections(p => Array.from(new Set([...p, 'data'])));
    if (configItems.some(i => i.path === activePage)) setExpandedSections(p => Array.from(new Set([...p, 'config'])));
  }, [activePage]);


  return (
    <aside className="hidden lg:flex w-[290px] flex-col bg-[var(--bg-sidebar)] border-r border-[var(--border-color)] h-full shrink-0 transition-colors shadow-2xl relative z-50">
      <div className="p-6 flex items-center gap-4">
        <div
          className="bg-center bg-no-repeat bg-cover rounded-2xl size-11 shadow-xl shadow-indigo-500/40 border-2 border-white/10"
          style={{ backgroundImage: 'url("https://lh3.googleusercontent.com/aida-public/AB6AXuDBaAaLOwN9NJO1l9OflRaFXTkw-TWnbi9Hl4zELKASFxHvZ61Ihkujk9dcmGtqjhJl4lvgI5BKlOJH1DD6BMRgFZjiEdR46M54cdH7pnYVEnLB--IyQ0AH3kZAVm1ofUSsIHP8tbVSgI5h9o7MMn0eG7vKkfEePvEkOXUazZSFNxmjKILJ5-AqooT9lVcFw9K6odGcig26flhuCW4q6Qd9F4_cG1Azls")' }}
        ></div>
        <div>
          <h1 className="text-[var(--text-main)] text-xl font-black tracking-tighter leading-none">Logic APS</h1>
          <p className="text-indigo-500 text-[10px] font-black uppercase tracking-[0.2em] mt-1.5">{t('version')} 5.3.0</p>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-1 custom-scrollbar">
        <MenuSection
          id="operation"
          label={t('nav_operation')}
          items={operationItems}
          icon="package_2"
          isExpanded={expandedSections.includes('operation')}
          toggleSection={toggleSection}
          activePage={activePage}
        />
        <MenuSection
          id="intelligence"
          label={t('nav_intelligence')}
          items={intelligenceItems}
          icon="psychology"
          isExpanded={expandedSections.includes('intelligence')}
          toggleSection={toggleSection}
          activePage={activePage}
        />
        <MenuSection
          id="data"
          label={t('nav_data')}
          items={dataItems}
          icon="database"
          isExpanded={expandedSections.includes('data')}
          toggleSection={toggleSection}
          activePage={activePage}
        />
        <MenuSection
          id="config"
          label={t('nav_config')}
          items={configItems}
          icon="settings"
          isExpanded={expandedSections.includes('config')}
          toggleSection={toggleSection}
          activePage={activePage}
        />
      </nav>

      <div className="p-4 border-t border-[var(--border-color)] space-y-4 bg-gradient-to-t from-[var(--bg-main)]/20 to-transparent">
        <div className="px-1">
          <p className="text-[9px] font-black text-[var(--text-muted)] uppercase tracking-widest mb-2 flex items-center gap-2">
            <Cpu size={12} className="text-indigo-500" /> {t('active_scenario')}
          </p>
          <div className="relative" onMouseLeave={() => setIsSimDropdownOpen(false)}>
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
              <div className="absolute bottom-full left-0 w-[280px] pb-2 z-50 animate-in fade-in slide-in-from-bottom-2">
                <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl shadow-2xl overflow-hidden">
                  <div className="p-3 border-b border-[var(--border-color)] bg-[var(--bg-sidebar)] flex justify-between items-center">
                    <span className="text-[9px] font-black text-[var(--text-muted)] uppercase tracking-widest">
                      {selectedIds.length > 0 ? t('selected_count', { count: selectedIds.length }) : t('select_simulation')}
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
                          <div className="flex items-center gap-2">
                            <p className="text-[11px] font-bold truncate leading-none">
                              {s.name.replace(' (Real)', '')}
                            </p>
                            {s.name.includes('(Real)') && (
                              <span className="px-1.5 py-0.5 rounded-md bg-emerald-500/10 text-emerald-500 text-[8px] font-black uppercase tracking-tighter shrink-0 border border-emerald-500/20">
                                Real
                              </span>
                            )}
                          </div>
                          <p className="text-[8px] font-bold opacity-40 uppercase mt-1">{new Date(s.created_at).toLocaleDateString(language === 'es' ? 'es-AR' : 'en-US')}</p>
                        </div>
                      </div>
                    ))}
                  </div>
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
              <span className="material-symbols-outlined text-[20px]" translate="no">
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
