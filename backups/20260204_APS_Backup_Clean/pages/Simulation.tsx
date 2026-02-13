
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import AIAnalyst from '../components/AIAnalyst';
import { scenarioService } from '../services/scenarioService';
import { apsAlgorithm } from '../services/apsAlgorithm';
import { supabase } from '../services/supabaseClient';
import {
  Play,
  CheckCircle2,
  AlertCircle,
  Package,
  ShoppingCart,
  RefreshCw,
  Cpu,
  Filter,
  Calendar,
  Trash2,
  Database,
  X,
  Search,
  CheckSquare,
  Square,
  ChevronsUpDown,
  GanttChart,
  Settings,
  ShieldCheck,
  Sun,
  Moon
} from 'lucide-react';
import { useTranslation, languages } from '../services/languageService';

interface OrderSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (selectedIds: string[]) => void;
  fromDate: string;
  toDate: string;
  initialSelection: string[];
}

const OrderSelectionModal: React.FC<OrderSelectionModalProps> = ({ isOpen, onClose, onConfirm, fromDate, toDate, initialSelection }) => {
  const { t } = useTranslation();
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set(initialSelection));

  useEffect(() => {
    if (isOpen) {
      fetchOrders();
      setSelected(new Set(initialSelection));
    }
  }, [isOpen, fromDate, toDate]);

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('work_orders')
        .select('*')
        .gte('due_date', fromDate)
        .lte('due_date', toDate)
        .order('due_date', { ascending: true });
      if (error) throw error;
      setOrders(data || []);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const filteredOrders = orders.filter(o => o.id.toLowerCase().includes(searchTerm.toLowerCase()));
  const toggleOrder = (id: string) => {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id); else next.add(id);
    setSelected(next);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-[2rem] w-full max-w-2xl flex flex-col max-h-[80vh] shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="p-6 border-b border-[var(--border-color)] flex justify-between items-center bg-[var(--bg-sidebar)]">
          <h3 className="text-xl font-black uppercase tracking-tighter">{t('demand_filter')}</h3>
          <button onClick={onClose} className="text-[var(--text-muted)] hover:text-white"><X size={24} /></button>
        </div>
        <div className="p-4 bg-[var(--bg-main)] border-b border-[var(--border-color)]">
          <input type="text" placeholder={t('data_explorer') + "..."} className="w-full bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl px-4 py-2 text-sm text-[var(--text-main)] focus:border-indigo-500 outline-none" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {filteredOrders.map(order => (
            <div key={order.id} onClick={() => toggleOrder(order.id)} className={`p-4 rounded-2xl border cursor-pointer transition-all flex items-center gap-4 ${selected.has(order.id) ? 'bg-indigo-600/10 border-indigo-500/50' : 'bg-[var(--bg-main)] border-[var(--border-color)]'}`}>
              {selected.has(order.id) ? <CheckSquare className="text-indigo-500" /> : <Square className="text-[var(--text-muted)]" />}
              <div className="flex-1">
                <p className="font-black text-sm">{order.id}</p>
                <p className="text-[10px] text-[var(--text-muted)] uppercase font-bold">{order.item_id} • Cant: {order.quantity_ordered}</p>
              </div>
              <div className="text-right">
                <p className="text-[10px] text-[var(--text-muted)] font-black uppercase text-[var(--text-muted)]">{t('deadline')}</p>
                <p className="text-xs font-bold">{new Date(order.due_date).toLocaleDateString()}</p>
              </div>
            </div>
          ))}
        </div>
        <div className="p-6 bg-[var(--bg-sidebar)] border-t border-[var(--border-color)] flex justify-between items-center">
          <span className="text-xs font-bold text-[var(--text-muted)]">{selected.size} {t('history')}</span>
          <button onClick={() => onConfirm(Array.from(selected))} className="bg-indigo-600 hover:bg-indigo-500 text-white px-8 py-3 rounded-2xl font-black uppercase text-[10px] tracking-widest">Confirmar</button>
        </div>
      </div>
    </div>
  );
};

const SimulationPage: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [scenarios, setScenarios] = useState<any[]>([]);
  const [activeScenario, setActiveScenario] = useState<any>(null);
  const [isExecuting, setIsExecuting] = useState(false);
  const [workCenters, setWorkCenters] = useState<any[]>([]);
  const [bottlenecks, setBottlenecks] = useState<string[]>([]);
  const [proposedOrders, setProposedOrders] = useState<{ pwos: any[], ppos: any[] }>({ pwos: [], ppos: [] });
  const [proposedOperations, setProposedOperations] = useState<any[]>([]);
  const [loadingProposed, setLoadingProposed] = useState(false);
  const [showOrderPicker, setShowOrderPicker] = useState(false);
  const [simulationProgress, setSimulationProgress] = useState(0);
  const [theme, setTheme] = useState<'light' | 'dark'>(() => (localStorage.getItem('theme') as 'light' | 'dark') || 'dark');

  // Parámetros
  const [virtualMachines, setVirtualMachines] = useState<Record<string, number>>({});
  const [includeMaintenance, setIncludeMaintenance] = useState(true);
  const [filters, setFilters] = useState({
    fromDate: '2026-03-01',
    toDate: '2026-03-31',
    orderIds: ''
  });

  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [lastSelectedIndex, setLastSelectedIndex] = useState<number | null>(null);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  // Cerrar dropdown al hacer click afuera
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (isDropdownOpen && !(e.target as HTMLElement).closest('.custom-dropdown')) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isDropdownOpen]);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      const [scens, wcs, machs] = await Promise.all([
        scenarioService.getScenarios(),
        supabase.from('work_centers').select('*'),
        supabase.from('machines').select('id, work_center_id, shift:shifts(daily_capacity_hours)')
      ]);
      setScenarios(scens || []);
      setWorkCenters(wcs.data || []);

      // Inicializar contador real de máquinas por WC
      const realCounts: Record<string, number> = {};
      wcs.data?.forEach(wc => {
        realCounts[wc.id] = machs.data?.filter(m => m.work_center_id === wc.id).length || 0;
      });
      setVirtualMachines(realCounts);

      if (scens && scens.length > 0 && !activeScenario) {
        handleSelectScenario(scens[0]);
      }
    } catch (e) { console.error(e); }
  };

  const handleSelectScenario = async (scenario: any) => {
    if (!scenario?.id) return;
    console.log("APS: Iniciando carga de datos para escenario:", scenario.id);
    setActiveScenario(scenario);
    setLoadingProposed(true);
    setProposedOrders({ pwos: [], ppos: [] });
    setProposedOperations([]);

    try {
      setVirtualMachines(scenario.simulation_overrides?.machine_counts || {});
      setIncludeMaintenance(scenario.include_maintenance ?? true);

      const savedFilters = scenario.simulation_overrides?.filters || filters;
      if (Array.isArray(savedFilters.orderIds)) {
        savedFilters.orderIds = savedFilters.orderIds.join(', ');
      }
      setFilters(savedFilters);

      // Consultas paralelas
      const [pwosRes, pposRes, itemsRes] = await Promise.all([
        supabase.from('proposed_work_orders').select('*').eq('scenario_id', scenario.id),
        supabase.from('proposed_purchase_orders').select('*').eq('scenario_id', scenario.id),
        supabase.from('items').select('id, name')
      ]);

      if (pwosRes.error) console.error("APS: Error PWOs:", pwosRes.error);
      if (pposRes.error) console.error("APS: Error PPOs:", pposRes.error);

      // Join manual en memoria
      const itemsMap = (itemsRes.data || []).reduce((acc: any, it: any) => ({ ...acc, [it.id]: it.name }), {});

      const pwosWithNames = (pwosRes.data || []).map(p => ({
        ...p,
        item: { name: itemsMap[p.item_id] || p.item_id }
      }));

      const pposWithNames = (pposRes.data || []).map(p => ({
        ...p,
        item: { name: itemsMap[p.item_id] || p.item_id }
      }));

      console.log(`APS: Carga finalizada. PWOs: ${pwosWithNames.length}, PPOs: ${pposWithNames.length}`);
      setProposedOrders({ pwos: pwosWithNames, ppos: pposWithNames });

      // Fetch and set operations
      const { data: ops } = await supabase.from('proposed_operations').select('*').eq('scenario_id', scenario.id);
      setProposedOperations(ops || []);

      // Fetch machines with shift hours to calculate capacity
      const { data: scenarioMachines } = await supabase.from('machines').select('id, work_center_id, shift:shifts(daily_capacity_hours)');
      (activeScenario as any).machines_data = scenarioMachines;

      // Identify bottlenecks from delayed PWOs
      const saturatedWCs = new Set<string>();

      if (ops) {
        // High heuristic: Work centers with red PWOs are likely bottlenecks
        const delayedWCs = (pwosRes.data || [])
          .filter(p => p.delay_days > 0 && p.delay_reason?.includes('Saturación'))
          .map(p => p.item_id); // This is not quite right as it's item_id

        // Let's just use the ops from scenario
        const wcCounts: Record<string, number> = {};
        ops.forEach(o => { wcCounts[o.work_center_id] = (wcCounts[o.work_center_id] || 0) + 1; });
        // Saturated if many ops or specific flag in future. 
        // For now, let's highlight WCs that are the cause of any red PWO
        const redWCs = new Set<string>();
        const redPWOs = (pwosRes.data || []).filter(p => p.severity === 'red' && p.delay_reason?.includes('Saturación'));
        if (redPWOs.length > 0) {
          const { data: redOps } = await supabase.from('proposed_operations')
            .select('work_center_id')
            .eq('scenario_id', scenario.id)
            .in('item_id', redPWOs.map(p => p.item_id));
          redOps?.forEach(o => redWCs.add(o.work_center_id));
        }
        setBottlenecks(Array.from(redWCs));
      }
    } catch (err) {
      console.error("APS: Error crítico en carga:", err);
    } finally {
      setLoadingProposed(false);
    }
  };

  const [isSyncing, setIsSyncing] = useState(false);
  const handleSyncERP = async () => {
    if (!activeScenario) {
      alert(t('select_scenario_sync'));
      return;
    }

    if (!confirm(`Se va a proceder a sincronizar el escenario [${activeScenario.name}] con el ERP. Se ajustarán las fechas de entrega reales en las órdenes de producción y compras según el cálculo del APS. ¿Continuar?`)) return;

    setIsSyncing(true);

    try {
      // 1. Obtener propuestas del escenario
      const { data: pwos } = await supabase.from('proposed_work_orders').select('*').eq('scenario_id', activeScenario.id);
      const { data: ppos } = await supabase.from('proposed_purchase_orders').select('*').eq('scenario_id', activeScenario.id);

      // 2. Lógica de Actualización de Origen (Impacto Real en DB)
      if (pwos) {
        for (const p of pwos) {
          if (p.work_order_id && !p.work_order_id.startsWith('REP-')) {
            // Es una orden original del ERP, actualizamos su fecha final según APS
            await supabase.from('work_orders').update({
              due_date: p.end_date,
              status: 'Scheduled'
            }).eq('id', p.work_order_id);
          }
        }
      }

      if (ppos) {
        for (const p of ppos) {
          if (p.erp_ref_id) {
            // Es una reprogramación sugerida de una OC ya existente
            await supabase.from('erp_purchase_orders').update({
              expected_delivery_date: p.delivery_date
            }).eq('id', p.erp_ref_id);
          }
        }
      }

      alert(t('erp_sync_success'));
    } catch (e) {
      console.error(e);
      alert(t('erp_sync_error'));
    } finally {
      setIsSyncing(false);
    }
  };

  const handleRunNewSimulation = async () => {
    setIsExecuting(true);
    setSimulationProgress(0);
    try {
      const name = `Simulación ${new Date().toLocaleString('es-AR')}`;
      const { data: newScenario, error: scnErr } = await supabase.from('scenarios').insert({
        name,
        user_id: (await supabase.auth.getUser()).data.user?.id || '00000000-0000-4000-8000-000000000001',
        include_maintenance: includeMaintenance,
        simulation_overrides: {
          machine_counts: virtualMachines,
          filters: { ...filters, orderIds: typeof filters.orderIds === 'string' ? (filters.orderIds ? filters.orderIds.split(',').map(s => s.trim()) : []) : filters.orderIds }
        }
      }).select().single();

      if (scnErr) throw scnErr;
      if (!newScenario) throw new Error("Error creando escenario.");

      await apsAlgorithm.runSimulation(newScenario.id, (p) => setSimulationProgress(p));

      // Refrescar historial
      const scens = await scenarioService.getScenarios();
      setScenarios(scens || []);

      // Cargar resultados
      await handleSelectScenario(newScenario);
    } catch (error: any) {
      console.error("APS: Error en simulación:", error);
      alert(t('error') + ": " + error.message);
    }
    setIsExecuting(false);
  };

  const handleDeleteScenario = async (e: React.MouseEvent | null, ids: string | string[]) => {
    if (e) e.stopPropagation();
    const idList = Array.isArray(ids) ? ids : [ids];
    if (idList.length === 0) return;

    const msg = idList.length === 1
      ? t('delete_msg_single')
      : t('delete_msg_multiple', { count: idList.length });

    if (!confirm(msg)) return;

    try {
      const { error } = await supabase.from('scenarios').delete().in('id', idList);
      if (error) throw error;

      const nextScenarios = scenarios.filter(s => !idList.includes(s.id));
      setScenarios(nextScenarios);
      setSelectedIds([]);

      if (activeScenario && idList.includes(activeScenario.id)) {
        // Encontrar el indice de la primera ID borrada en la lista original para el "nearest"
        const firstId = idList[0];
        const currentIndex = scenarios.findIndex(s => s.id === firstId);
        const nearest = nextScenarios[currentIndex] || nextScenarios[currentIndex - 1];
        if (nearest) {
          handleSelectScenario(nearest);
        } else {
          setActiveScenario(null);
          setProposedOrders({ pwos: [], ppos: [] });
          setProposedOperations([]);
        }
      }
    } catch (err) {
      console.error(err);
      alert('Error al eliminar');
    }
  };

  const handleItemClick = (e: React.MouseEvent, scenario: any, index: number) => {
    e.stopPropagation();

    if (e.shiftKey && lastSelectedIndex !== null) {
      const start = Math.min(lastSelectedIndex, index);
      const end = Math.max(lastSelectedIndex, index);
      const rangeIds = scenarios.slice(start, end + 1).map(s => s.id);
      setSelectedIds(prev => Array.from(new Set([...prev, ...rangeIds])));
    } else if (e.ctrlKey || e.metaKey) {
      setSelectedIds(prev =>
        prev.includes(scenario.id) ? prev.filter(id => id !== scenario.id) : [...prev, scenario.id]
      );
    } else {
      setSelectedIds([scenario.id]);
      handleSelectScenario(scenario);
    }
    setLastSelectedIndex(index);
  };

  return (
    <div className="flex h-screen overflow-hidden bg-[var(--bg-main)] text-[var(--text-main)] font-body transition-colors">
      <Sidebar />
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">

        <header className="px-8 py-6 border-b border-[var(--border-color)] bg-[var(--bg-sidebar)] flex justify-between items-center shadow-sm z-[1000] relative">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-indigo-500/10 rounded-2xl text-indigo-500 border border-indigo-500/20">
              <Settings size={22} />
            </div>
            <div>
              <h1 className="text-xl font-black uppercase tracking-tighter">{t('simulation_console')}</h1>
              <p className="text-[10px] text-[var(--text-muted)] font-black uppercase tracking-widest">{t('advanced_planning')}</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="relative custom-dropdown">
              <div
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                className="flex items-center justify-between gap-3 px-4 py-2 bg-[var(--bg-input)] border border-[var(--border-color)] rounded-xl cursor-pointer min-w-[280px] hover:border-indigo-500/50 transition-all group"
              >
                <div className="flex flex-col">
                  <span className="text-[7px] font-black text-[var(--text-muted)] uppercase tracking-wider">{t('active_scenario')}:</span>
                  <span className="text-[11px] font-black text-indigo-500 truncate max-w-[200px]">
                    {activeScenario?.name || t('select_simulation')}
                  </span>
                </div>
                <ChevronsUpDown size={14} className="text-[var(--text-muted)] group-hover:text-indigo-500 transition-colors" />
              </div>

              {isDropdownOpen && (
                <div className="absolute top-full right-0 mt-2 w-[350px] bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl shadow-2xl z-[100] overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                  <div className="p-3 border-b border-[var(--border-color)] bg-[var(--bg-sidebar)] flex justify-between items-center">
                    <p className="text-[9px] font-black text-[var(--text-muted)] uppercase tracking-widest">{t('select_simulation')}</p>
                    {selectedIds.length > 1 && (
                      <button
                        onClick={(e) => { e.stopPropagation(); handleDeleteScenario(null, selectedIds); }}
                        className="bg-rose-500 hover:bg-rose-600 text-white text-[8px] font-black px-2 py-1 rounded flex items-center gap-1 shadow-lg shadow-rose-900/40 transition-all uppercase"
                      >
                        <Trash2 size={10} /> {t('delete_btn')} {selectedIds.length}
                      </button>
                    )}
                  </div>
                  <div className="max-h-[400px] overflow-y-auto custom-scrollbar p-2 space-y-1">
                    {scenarios.map((s, idx) => (
                      <div
                        key={s.id}
                        onClick={(e) => handleItemClick(e, s, idx)}
                        className={`flex items-center justify-between p-3 rounded-xl cursor-pointer group transition-all ${selectedIds.includes(s.id) ? (activeScenario?.id === s.id ? 'bg-indigo-600 text-white' : 'bg-indigo-600/40 text-white shadow-inner') : 'hover:bg-indigo-500/10 text-[var(--text-main)]'}`}
                      >
                        <div className="flex flex-col min-w-0 pr-2">
                          <p className="text-[11px] font-bold truncate">{s.name}</p>
                          <p className={`text-[8px] font-medium opacity-60 ${selectedIds.includes(s.id) ? 'text-white' : ''}`}>
                            {new Date(s.created_at).toLocaleString()}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          {activeScenario?.id === s.id && <div className="size-1.5 bg-white rounded-full animate-pulse mr-1"></div>}
                          <button
                            onClick={(e) => { e.stopPropagation(); handleDeleteScenario(null, s.id); }}
                            className={`p-2 rounded-lg transition-all ${selectedIds.includes(s.id) ? 'hover:bg-rose-500/20 text-white/40 hover:text-white' : 'opacity-0 group-hover:opacity-100 hover:bg-rose-500/10 text-rose-500'}`}
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </div>
                    ))}
                    {scenarios.length === 0 && (
                      <p className="text-center py-8 text-xs text-[var(--text-muted)] font-bold italic">{t('no_simulations')}</p>
                    )}
                  </div>
                </div>
              )}
            </div>
            <button onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')} className="p-2.5 rounded-xl bg-[var(--bg-input)] border border-[var(--border-color)] hover:border-indigo-500/50 transition-all text-[var(--text-muted)]">
              {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
            </button>
            <button onClick={() => navigate('/schedule')} className="bg-emerald-600 hover:bg-emerald-500 text-white px-6 py-3 rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-lg shadow-emerald-900/30 flex items-center gap-2">
              <GanttChart size={18} /> {t('gantt_chart')}
            </button>
            <button onClick={handleRunNewSimulation} disabled={isExecuting} className="bg-indigo-600 hover:bg-indigo-500 text-white px-8 py-3 rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-lg shadow-indigo-900/30 flex items-center gap-2 transition-all min-w-[180px] justify-center">
              {isExecuting ? <RefreshCw className="animate-spin" size={16} /> : <Play size={18} />}
              {isExecuting ? `${t('calculating')} ${simulationProgress}%` : t('launch_simulation')}
            </button>
          </div>
        </header>

        <div className="flex-1 flex overflow-hidden">
          {/* Controls Panel */}
          <aside className="w-[200px] border-r border-[var(--border-color)] bg-[var(--bg-sidebar)] p-3 overflow-y-auto space-y-4 shrink-0">
            <section className="space-y-4">
              <h3 className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest flex items-center gap-2 border-b border-[var(--border-color)] pb-2"><Database size={14} /> {t('simulation_strategy')}</h3>
              <div className="space-y-5">
                <div onClick={() => setIncludeMaintenance(!includeMaintenance)} className={`flex items-center justify-between p-4 rounded-2xl border cursor-pointer transition-all ${includeMaintenance ? 'bg-indigo-600/10 border-indigo-500/30 text-indigo-500' : 'bg-[var(--bg-main)] border-[var(--border-color)] opacity-40'}`}>
                  <div className="flex items-center gap-3">
                    <ShieldCheck size={18} />
                    <span className="text-xs font-black uppercase tracking-widest">{t('consider_maintenance')}</span>
                  </div>
                  <div className={`w-3 h-3 rounded-full ${includeMaintenance ? 'bg-indigo-500 shadow-[0_0_8px_rgba(99,102,241,0.5)]' : 'bg-slate-700'}`}></div>
                </div>
                <div className="space-y-2">
                  <p className="text-[9px] font-black text-[var(--text-muted)] uppercase tracking-widest px-1">{t('deadline')}</p>
                  <input type="date" value={filters.toDate} onChange={e => setFilters({ ...filters, toDate: e.target.value })} className="w-full bg-[var(--bg-input)] border border-[var(--border-color)] rounded-xl p-3 text-xs font-bold outline-none focus:border-indigo-500" />
                </div>
                <div onClick={() => setShowOrderPicker(true)} className="p-4 bg-[var(--bg-input)] border border-[var(--border-color)] rounded-2xl cursor-pointer hover:border-indigo-500/50 transition-all flex justify-between items-center group">
                  <div>
                    <p className="text-[9px] font-black text-[var(--text-muted)] uppercase tracking-widest">{t('demand_filter')}</p>
                    <p className="text-xs font-bold text-indigo-500 mt-0.5">{filters.orderIds ? t('history') : t('all_demand')}</p>
                  </div>
                  <Filter size={14} className="text-[var(--text-muted)] group-hover:text-indigo-500" />
                </div>
              </div>
            </section>

            <section className="space-y-6">
              <h3 className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest flex items-center gap-2 border-b border-[var(--border-color)] pb-2"><Cpu size={14} /> {t('installed_capacity')}</h3>
              <div className="space-y-3">
                {workCenters.map(wc => {
                  const isSaturated = bottlenecks.includes(wc.id);
                  return (
                    <div key={wc.id} className={`flex justify-between items-center p-4 rounded-2xl border transition-all duration-500 ${isSaturated ? 'bg-rose-500/10 border-rose-500/50 shadow-[0_0_15px_rgba(244,63,94,0.2)] animate-pulse-soft' : 'bg-[var(--bg-card)] border-[var(--border-color)] shadow-sm'}`}>
                      <div className="flex-1 min-w-0 pr-2">
                        <span className={`text-xs font-black uppercase tracking-tighter truncate block ${isSaturated ? 'text-rose-500' : ''}`}>{wc.name}</span>
                        <p className="text-[8px] font-bold text-[var(--text-muted)] mt-0.5 uppercase">{t('active_machines')}</p>
                        {isSaturated && (
                          <div className="flex items-center gap-1 mt-1">
                            <AlertCircle size={10} className="text-rose-500" />
                            <span className="text-[7px] font-black text-rose-500 uppercase tracking-widest">{t('saturation_detected')}</span>
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-2 bg-[var(--bg-input)] border border-[var(--border-color)] rounded-xl p-1 shrink-0">
                        <button onClick={() => setVirtualMachines(v => ({ ...v, [wc.id]: Math.max(0, (v[wc.id] || 0) - 1) }))} className="w-8 h-8 rounded-lg bg-[var(--bg-card)] hover:border-indigo-500/30 border border-transparent font-black text-sm transition-all">-</button>
                        <span className={`w-6 text-center text-xs font-black ${virtualMachines[wc.id] === 0 ? 'text-rose-500' : isSaturated ? 'text-rose-500' : 'text-indigo-600'}`}>{virtualMachines[wc.id] || 0}</span>
                        <button onClick={() => setVirtualMachines(v => ({ ...v, [wc.id]: (v[wc.id] || 0) + 1 }))} className="w-8 h-8 rounded-lg bg-[var(--bg-card)] hover:border-indigo-500/30 border border-transparent font-black text-sm transition-all">+</button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>

            <section className="space-y-4 pt-10">
              <h3 className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest border-b border-[var(--border-color)] pb-2 flex justify-between items-center">
                {t('history')}
                <span className="bg-indigo-500/10 text-indigo-500 px-2 py-0.5 rounded-full text-[8px]">{scenarios.length}</span>
              </h3>
              <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1 custom-scrollbar">
                {scenarios.map(s => (
                  <div
                    key={s.id}
                    onClick={() => handleSelectScenario(s)}
                    className={`p-3 rounded-xl border cursor-pointer transition-all flex flex-col gap-1 group relative ${activeScenario?.id === s.id ? 'bg-indigo-600/10 border-indigo-500/50 text-indigo-500 ring-1 ring-indigo-500/20' : 'bg-[var(--bg-input)] border-[var(--border-color)] text-[var(--text-muted)] hover:border-indigo-500/30 hover:bg-[var(--bg-card)]'}`}
                  >
                    <div className="flex justify-between items-center gap-2">
                      <div className="min-w-0 flex-1">
                        <p className={`text-[11px] font-black truncate ${activeScenario?.id === s.id ? 'text-indigo-400' : ''}`}>{s.name}</p>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        {activeScenario?.id === s.id && <div className="size-1.5 bg-indigo-500 rounded-full animate-pulse"></div>}
                        <button
                          onClick={(e) => handleDeleteScenario(e, s.id)}
                          className="p-1.5 hover:bg-rose-500/10 text-rose-500/40 hover:text-rose-500 rounded-lg transition-all"
                          title={t('delete_simulation')}
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                    <p className="text-[8px] font-bold opacity-60 uppercase">{new Date(s.created_at).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}</p>
                  </div>
                ))}
              </div>
            </section>
          </aside>

          {/* Results Area */}
          <div className="flex-1 p-4 overflow-y-auto bg-grid-slate-900/[0.02]">
            {activeScenario ? (
              <div className="max-w-full mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="bg-indigo-600/5 rounded-[1.5rem] p-6 border border-indigo-500/10 relative overflow-hidden flex flex-col md:flex-row items-center justify-between gap-6 shadow-2xl">
                  <div className="absolute top-0 right-0 bg-indigo-500/10 blur-[100px] w-96 h-96 rounded-full -translate-y-1/2 translate-x-1/2"></div>
                  <div className="relative z-10 space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded-full bg-indigo-600 text-[7px] font-black uppercase text-white">{t('selected_scenario_tag')}</span>
                      <span className="text-[10px] font-black text-[var(--text-muted)]">{new Date(activeScenario.created_at).toLocaleString()}</span>
                    </div>
                    <h2 className="text-4xl font-black uppercase tracking-tighter leading-none">{activeScenario.name}</h2>
                    <p className="text-[var(--text-muted)] text-sm font-medium leading-relaxed max-w-xl">
                      {t('simulation_success_msg', { count: proposedOrders.pwos.length })}
                    </p>
                  </div>
                  <button
                    onClick={handleSyncERP}
                    disabled={isSyncing}
                    className="relative z-10 bg-emerald-600 hover:bg-emerald-500 text-white px-6 py-3 rounded-[1rem] font-black uppercase text-[10px] tracking-widest shadow-2xl transition-all hover:scale-105 active:scale-95 shadow-emerald-900/40 flex items-center gap-2"
                  >
                    <RefreshCw className={isSyncing ? 'animate-spin' : ''} size={14} />
                    {isSyncing ? t('calculating') + '...' : t('sync_erp')}
                  </button>
                </div>

                <div className="grid grid-cols-1 xl:grid-cols-[1.4fr_0.6fr] gap-6">
                  <div className="glass-panel rounded-[1.5rem] overflow-hidden flex flex-col border border-[var(--border-color)] shadow-xl">
                    <div className="p-3 bg-[var(--bg-sidebar)] border-b border-[var(--border-color)] flex justify-between items-center">
                      <h4 className="text-[9px] font-black uppercase tracking-widest text-[var(--text-muted)]">Propuesta de Producción</h4>
                      <Package size={16} className="text-indigo-500" />
                    </div>
                    <div className="max-h-[600px] overflow-auto">
                      <table className="w-full text-left border-collapse">
                        <thead className="bg-[var(--bg-main)] text-[8px] font-black uppercase text-[var(--text-muted)] sticky top-0 border-b border-[var(--border-color)]">
                          <tr>
                            <th className="px-2 py-2">Producto / Cantidad</th>
                            <th className="px-1 py-2 text-center">Inicio</th>
                            <th className="px-2 py-2 text-right">Fin</th>
                          </tr>
                        </thead>
                        <tbody>
                          {loadingProposed ? <tr><td colSpan={3} className="p-10 text-center"><RefreshCw className="animate-spin mx-auto text-indigo-500" /></td></tr> : proposedOrders.pwos.map((p, i) => (
                            <tr key={i} className="border-b border-[var(--border-color)] hover:bg-indigo-500/[0.02] transition-colors">
                              <td className="px-3 py-2">
                                <div className="flex items-center gap-2 mb-0.5">
                                  <div className={`w-2 h-2 rounded-full shadow-sm ${p.severity === 'red' ? 'bg-rose-500 shadow-rose-500/50' : p.severity === 'yellow' ? 'bg-amber-500 shadow-amber-500/50' : 'bg-emerald-500 shadow-emerald-500/50'}`}></div>
                                  <div>
                                    <p className="text-[11px] font-black truncate max-w-[150px]">{p.item?.name || p.item_id}</p>
                                    {p.delay_days > 0 && (
                                      <p className="text-[8px] font-black text-rose-500 uppercase tracking-widest leading-none">Retraso: {p.delay_days}d</p>
                                    )}
                                  </div>
                                </div>
                                <div className="flex items-center gap-1.5">
                                  <span className={`px-1 py-0.5 rounded text-[6px] font-black uppercase ${p.action_type === 'cancel' ? 'bg-rose-500/20 text-rose-500' : p.status === 'firm' ? 'bg-indigo-500/20 text-indigo-400' : 'bg-amber-500/20 text-amber-500'}`}>
                                    {p.action_type === 'cancel' ? 'Anular' : p.status === 'firm' ? 'Firme' : 'Propuesta'}
                                  </span>
                                  <p className="text-[8px] font-bold text-indigo-500/40 uppercase tracking-tighter truncate max-w-[100px]">Lote: {p.quantity} • {p.ref_erp_id || 'NUEVA'}</p>
                                </div>
                              </td>
                              <td className="px-2 py-2 text-center">
                                <p className="text-[9px] font-black font-mono text-indigo-400 bg-indigo-500/5 px-2 py-0.5 rounded-md inline-block">{new Date(p.start_date || p.end_date).toLocaleDateString()}</p>
                              </td>
                              <td className="px-3 py-2 text-right">
                                <p className="text-[10px] font-black font-mono text-emerald-500 bg-emerald-500/5 px-2 py-0.5 rounded-md inline-block">{new Date(p.end_date).toLocaleDateString()}</p>
                                {p.due_date && (
                                  <p className="text-[7px] text-[var(--text-muted)] font-black uppercase mt-0.5">Comp: {new Date(p.due_date).toLocaleDateString()}</p>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  <div className="glass-panel rounded-[1.5rem] overflow-hidden flex flex-col border border-[var(--border-color)] shadow-xl">
                    <div className="p-3 bg-[var(--bg-sidebar)] border-b border-[var(--border-color)] flex justify-between items-center">
                      <h4 className="text-[9px] font-black uppercase tracking-widest text-[var(--text-muted)]">Necesidad de Compras</h4>
                      <ShoppingCart size={16} className="text-amber-500" />
                    </div>
                    <div className="max-h-[600px] overflow-auto">
                      <table className="w-full text-left border-collapse">
                        <thead className="bg-[var(--bg-main)] text-[8px] font-black uppercase text-[var(--text-muted)] sticky top-0 border-b border-[var(--border-color)]">
                          <tr><th className="px-3 py-2">Suministro</th><th className="px-3 py-2 text-right">Cant / Arribo</th></tr>
                        </thead>
                        <tbody>
                          {loadingProposed ? <tr><td colSpan={2} className="p-10 text-center"><RefreshCw className="animate-spin mx-auto text-amber-500" /></td></tr> : proposedOrders.ppos.map((p, i) => (
                            <tr key={i} className="border-b border-[var(--border-color)] hover:bg-amber-500/[0.02] transition-colors">
                              <td className="px-3 py-2">
                                <p className="text-[11px] font-black truncate max-w-[150px]">{p.item?.name || p.item_id}</p>
                                <div className="flex items-center gap-2 mt-1">
                                  <span className={`px-1 py-0.5 rounded text-[6px] font-black uppercase ${p.change_type === 'reprogram' ? 'bg-indigo-500/20 text-indigo-400' : 'bg-emerald-500/20 text-emerald-500'}`}>
                                    {p.change_type === 'reprogram' ? 'REPROG.' : 'NUEVA'}
                                  </span>
                                  <p className="text-[8px] font-bold text-amber-500/60 uppercase tracking-tighter">Ref: {p.item_id}</p>
                                </div>
                              </td>
                              <td className="px-3 py-2 text-right">
                                <p className="text-[11px] font-black text-amber-500">{p.quantity}</p>
                                <p className="text-[9px] font-black opacity-40 font-mono">{new Date(p.delivery_date).toLocaleDateString()}</p>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>

                {/* Center Load Analysis section */}
                <div className="glass-panel rounded-[2rem] p-8 border border-[var(--border-color)] shadow-2xl space-y-8 bg-gradient-to-br from-[var(--bg-card)] to-[var(--bg-main)]">
                  <div className="flex items-center justify-between border-b border-[var(--border-color)] pb-6">
                    <div>
                      <h3 className="text-2xl font-black uppercase tracking-tighter">Carga de Centros de Trabajo</h3>
                      <p className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-[0.2em] mt-1">Análisis de saturación y capacidad simulada</p>
                    </div>
                    <div className="p-4 bg-indigo-500/10 rounded-2xl text-indigo-500 border border-indigo-500/20">
                      <Cpu size={28} />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {workCenters.map(wc => {
                      const wcOps = proposedOperations.filter(op => op.work_center_id === wc.id);
                      const totalRunTime = wcOps.reduce((acc, op) => acc + (op.run_time_minutes || 0) + (op.setup_time_minutes || 0), 0);

                      // Get all machines for this WC to calculate shift-based capacity
                      const wcMachines = (activeScenario as any)?.machines_data?.filter((m: any) => m.work_center_id === wc.id) || [];
                      const machineCount = virtualMachines[wc.id] || wcMachines.length || 1;

                      // Average hours from machines in this WC, or default to 8
                      const avgDailyHours = wcMachines.length > 0
                        ? wcMachines.reduce((acc: number, m: any) => acc + (m.shift?.daily_capacity_hours || 8), 0) / wcMachines.length
                        : 8;

                      // Capacity = Virtual Machines * Avg Shift Hours * 30 days (standard horizon)
                      const totalCapacityMinutes = machineCount * avgDailyHours * 60 * 30;
                      const loadPercentage = Math.min(100, Math.round((totalRunTime / totalCapacityMinutes) * 100));
                      const isHighLoad = loadPercentage > 85;

                      return (
                        <div key={wc.id} className="bg-[var(--bg-sidebar)] p-5 rounded-3xl border border-[var(--border-color)] group hover:border-indigo-500/40 transition-all shadow-lg relative overflow-hidden">
                          {isHighLoad && (
                            <div className="absolute top-0 right-0 p-2">
                              <div className="w-2 h-2 rounded-full bg-rose-500 animate-pulse shadow-[0_0_10px_rgba(244,63,94,0.8)]"></div>
                            </div>
                          )}

                          <div className="space-y-4">
                            <div className="flex justify-between items-start">
                              <div>
                                <h5 className="text-xs font-black uppercase text-[var(--text-muted)] tracking-widest leading-none mb-1">{wc.name}</h5>
                                <p className="text-[10px] font-bold text-indigo-400">{machineCount} Equipos • {avgDailyHours}h Turno</p>
                              </div>
                              <span className={`text-lg font-black ${isHighLoad ? 'text-rose-500' : 'text-indigo-500'}`}>{loadPercentage}%</span>
                            </div>

                            <div className="h-3 bg-[var(--bg-main)] rounded-full overflow-hidden border border-[var(--border-color)]">
                              <div
                                className={`h-full transition-all duration-1000 ease-out rounded-full ${isHighLoad ? 'bg-gradient-to-r from-rose-600 to-rose-400' : 'bg-gradient-to-r from-indigo-600 to-indigo-400'}`}
                                style={{ width: `${loadPercentage}%` }}
                              ></div>
                            </div>

                            <div className="flex justify-between text-[9px] font-black uppercase tracking-widest">
                              <span className="text-[var(--text-muted)]">Carga: {Math.round(totalRunTime / 60)}h / {Math.round(totalCapacityMinutes / 60)}h</span>
                              <span className={isHighLoad ? 'text-rose-500 animate-pulse' : 'text-emerald-500'}>
                                {isHighLoad ? 'Saturado' : 'Operativo'}
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-[var(--text-muted)] opacity-30 animate-pulse">
                <Play size={150} strokeWidth={1} />
                <p className="text-2xl font-black uppercase tracking-[1.5em] mt-10">Proyección APS</p>
                <p className="text-xs font-bold uppercase tracking-widest mt-4">Listo para procesar nuevo escenario corporativo</p>
              </div>
            )}
          </div>
          <AIAnalyst simulationData={{
            retrasos: proposedOrders.pwos.filter(p => p.severity === 'red').map(p => ({
              orden: p.work_order_id,
              producto: p.item?.name || p.item_id,
              retraso_dias: p.delay_days,
              razon: p.delay_reason,
              final_proyectado: p.end_date,
              compromiso: p.due_date
            })),
            compras_pendientes: proposedOrders.ppos.map(p => ({
              producto: p.item?.name || p.item_id,
              entrega: p.delivery_date
            }))
          }} />
        </div>

        <OrderSelectionModal
          isOpen={showOrderPicker}
          onClose={() => setShowOrderPicker(false)}
          fromDate={filters.fromDate}
          toDate={filters.toDate}
          initialSelection={filters.orderIds ? filters.orderIds.split(',').map(s => s.trim()) : []}
          onConfirm={ids => { setFilters({ ...filters, orderIds: ids.join(', ') }); setShowOrderPicker(false); }}
        />
      </main>
    </div>
  );
};

export default SimulationPage;
