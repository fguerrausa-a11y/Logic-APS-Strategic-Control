
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import AIAnalyst from '../components/AIAnalyst';
import { scenarioService } from '../services/scenarioService';
import { apsAlgorithm } from '../services/apsAlgorithm';
import { supabase } from '../services/supabaseClient';
import { useSimulation } from '../services/SimulationContext';
import {
  Play,
  CheckCircle2,
  AlertCircle,
  Package,
  ShoppingCart,
  RefreshCw,
  Cpu,
  Filter,
  Trash2,
  Database,
  X,
  CheckSquare,
  Square,
  GanttChart,
  Settings,
  ShieldCheck,
  Sun,
  Zap,
  Calendar,
  RotateCcw
} from 'lucide-react';
import { useTranslation } from '../services/languageService';

const calculateWorkingDays = (start: Date, end: Date): number => {
  let count = 0;
  const curDate = new Date(start.getTime());
  while (curDate <= end) {
    const dayOfWeek = curDate.getDay();
    if (dayOfWeek !== 0 && dayOfWeek !== 6) { // Not Sunday or Saturday
      count++;
    }
    curDate.setDate(curDate.getDate() + 1);
  }
  return count;
};

const calculateShiftHours = (start: string, end: string): number => {
  if (!start || !end) return 8;
  const [h1, m1] = start.split(':').map(Number);
  const [h2, m2] = end.split(':').map(Number);
  return (h2 + m2 / 60) - (h1 + m1 / 60);
};

const calculateCapacityForPeriod = (start: Date, end: Date, machine: any): number => {
  const shift = machine.shift;
  if (!shift || !shift.days_of_week) return 8 * 60 * calculateWorkingDays(start, end);

  let totalMinutes = 0;
  const curDate = new Date(start.getTime());
  const hours = calculateShiftHours(shift.start_time, shift.end_time);
  const activeDays = Array.isArray(shift.days_of_week) ? shift.days_of_week.map(Number) : [];

  while (curDate <= end) {
    if (activeDays.includes(curDate.getDay())) {
      totalMinutes += hours * 60;
    }
    curDate.setDate(curDate.getDate() + 1);
  }
  return totalMinutes;
};

interface OrderSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (selectedIds: string[]) => void;
  fromDate: string;
  toDate: string;
  initialSelection: string[];
}

const OrderSelectionModal: React.FC<OrderSelectionModalProps> = ({ isOpen, onClose, onConfirm, fromDate, toDate, initialSelection }) => {
  const { t, language } = useTranslation();
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
          <input type="text" placeholder={t('quick_search')} className="w-full bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl px-4 py-2 text-sm text-[var(--text-main)] focus:border-indigo-500 outline-none" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {filteredOrders.map(order => (
            <div key={order.id} onClick={() => toggleOrder(order.id)} className={`p-4 rounded-2xl border cursor-pointer transition-all flex items-center gap-4 ${selected.has(order.id) ? 'bg-indigo-600/10 border-indigo-500/50' : 'bg-[var(--bg-main)] border-[var(--border-color)]'}`}>
              {selected.has(order.id) ? <CheckSquare className="text-indigo-500" /> : <Square className="text-[var(--text-muted)]" />}
              <div className="flex-1">
                <p className="font-black text-sm">{order.id}</p>
                <p className="text-[10px] text-[var(--text-muted)] uppercase font-bold">{order.item_id} • {t('qty_ordered_prefix')} {order.quantity_ordered}</p>
              </div>
              <div className="text-right">
                <p className="text-[10px] text-[var(--text-muted)] font-black uppercase text-[var(--text-muted)]">{t('deadline')}</p>
                <p className="text-xs font-bold">{new Date(order.due_date).toLocaleDateString(language === 'es' ? 'es-AR' : 'en-US')}</p>
              </div>
            </div>
          ))}
        </div>
        <div className="p-6 bg-[var(--bg-sidebar)] border-t border-[var(--border-color)] flex justify-between items-center">
          <span className="text-xs font-bold text-[var(--text-muted)]">{t('selected_count', { count: selected.size })}</span>
          <button onClick={() => onConfirm(Array.from(selected))} className="bg-indigo-600 hover:bg-indigo-500 text-white px-8 py-3 rounded-2xl font-black uppercase text-[10px] tracking-widest">{t('confirm_btn')}</button>
        </div>
      </div>
    </div>
  );
};

/** Unified saturation threshold (%).
 *  A work center is considered "saturated" when its load percentage exceeds this value.
 *  Used by BOTH the left sidebar cards AND the right work-center load cards — keep in sync. */
const SATURATION_THRESHOLD = 85; // %

const SimulationPage: React.FC = () => {
  const { t, language } = useTranslation();
  const navigate = useNavigate();
  const { scenarios, selectedScenarioId, setSelectedScenarioId, refreshScenarios } = useSimulation();

  const [activeScenario, setActiveScenario] = useState<any>(null);
  const [isExecuting, setIsExecuting] = useState(false);
  const [workCenters, setWorkCenters] = useState<any[]>([]);
  const [bottlenecks, setBottlenecks] = useState<string[]>([]);
  const [bottleneckData, setBottleneckData] = useState<any[]>([]); // Full motor data: {work_center_id, utilization_ratio, is_ccr, load_minutes, capacity_minutes}
  const [proposedOrders, setProposedOrders] = useState<{ pwos: any[], ppos: any[] }>({ pwos: [], ppos: [] });
  const [proposedOperations, setProposedOperations] = useState<any[]>([]);
  const [loadingProposed, setLoadingProposed] = useState(false);
  const [showOrderPicker, setShowOrderPicker] = useState(false);
  const [simulationProgress, setSimulationProgress] = useState(0);
  const [theme, setTheme] = useState<'light' | 'dark'>(() => (localStorage.getItem('theme') as 'light' | 'dark') || 'light');

  const [virtualMachines, setVirtualMachines] = useState<Record<string, number>>({});
  const [scenarioMachinesData, setScenarioMachinesData] = useState<any[]>([]);  // ← fuente de verdad para wcLoadMap
  const [includeMaintenance, setIncludeMaintenance] = useState(true);
  const [overlapEnabled, setOverlapEnabled] = useState(false);
  const [wcSplitConfigs, setWcSplitConfigs] = useState<Record<string, { enabled: boolean, maxSplit: number }>>({});
  const [filters, setFilters] = useState({
    fromDate: new Date().toISOString().split('T')[0],
    toDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    orderIds: ''
  });

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  const [defaultMachineCounts, setDefaultMachineCounts] = useState<Record<string, number>>({});

  useEffect(() => {
    loadBaseData();
  }, []);

  // Ensure defaults are applied if no scenario is active, or if scenario overrides are missing
  useEffect(() => {
    if (Object.keys(defaultMachineCounts).length > 0) {
      if (!selectedScenarioId) {
        setVirtualMachines(defaultMachineCounts);
      }
    }
  }, [defaultMachineCounts, selectedScenarioId]);

  useEffect(() => {
    if (selectedScenarioId && scenarios.length > 0) {
      const scenario = scenarios.find(s => s.id === selectedScenarioId);
      if (scenario) {
        handleSelectScenario(scenario);
      }
    }
  }, [selectedScenarioId, scenarios]);

  const loadBaseData = async () => {
    try {
      const { data: wcs } = await supabase.from('work_centers').select('*');
      setWorkCenters(wcs || []);

      const { data: machs } = await supabase.from('machines').select('id, work_center_id');
      const realCounts: Record<string, number> = {};
      wcs?.forEach(wc => {
        realCounts[wc.id] = machs?.filter(m => m.work_center_id === wc.id).length || 0;
      });
      setDefaultMachineCounts(realCounts);
      // Only set virtual if not already set or no scenario active (handled by effect)
      if (!selectedScenarioId) {
        setVirtualMachines(realCounts);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleSelectScenario = async (scenario: any) => {
    if (!scenario?.id) return;
    setActiveScenario(scenario);
    setLoadingProposed(true);
    setProposedOrders({ pwos: [], ppos: [] });
    setProposedOperations([]);
    setScenarioMachinesData([]);

    try {
      // Use overrides if present, otherwise fallback to defaults (real capacity)
      const overrides = scenario.simulation_overrides?.machine_counts;
      if (overrides && Object.keys(overrides).length > 0) {
        setVirtualMachines(overrides);
      } else {
        setVirtualMachines(defaultMachineCounts);
      }
      setIncludeMaintenance(scenario.include_maintenance ?? true);
      setOverlapEnabled(scenario.simulation_overrides?.overlap_enabled ?? false);
      setWcSplitConfigs(scenario.simulation_overrides?.work_center_configs || {});

      const savedFilters = scenario.simulation_overrides?.filters || filters;
      if (Array.isArray(savedFilters.orderIds)) {
        savedFilters.orderIds = savedFilters.orderIds.join(', ');
      }
      setFilters(savedFilters);

      const [pwosRes, pposRes, itemsRes] = await Promise.all([
        supabase.from('proposed_work_orders').select('*').eq('scenario_id', scenario.id),
        supabase.from('proposed_purchase_orders').select('*').eq('scenario_id', scenario.id),
        supabase.from('items').select('id, name')
      ]);

      const itemsMap = (itemsRes.data || []).reduce((acc: any, it: any) => ({ ...acc, [it.id]: it.name }), {});
      const pwosWithNames = (pwosRes.data || []).map(p => ({
        ...p,
        item: { name: itemsMap[p.item_id] || p.item_id }
      }));
      const pposWithNames = (pposRes.data || []).map(p => ({
        ...p,
        item: { name: itemsMap[p.item_id] || p.item_id }
      }));

      setProposedOrders({ pwos: pwosWithNames, ppos: pposWithNames });

      const { data: ops } = await supabase.from('proposed_operations').select('*').eq('scenario_id', scenario.id);
      setProposedOperations(ops || []);

      const { data: scenarioMachines } = await supabase.from('machines').select('id, work_center_id, shift:shifts(*)');
      setScenarioMachinesData(scenarioMachines || []);   // ← setState en lugar de mutación directa

      // Use bottlenecks persisted by the APS motor (utilization_ratio-based, accurate)
      // Fallback to the old heuristic only if data pre-dates this improvement
      const motorBottlenecks: any[] = scenario.simulation_overrides?.last_bottlenecks || [];
      if (motorBottlenecks.length > 0) {
        // Motor result contains ALL work centers with load, ordered by utilization_ratio.
        // Only mark as "saturated" (red) those with ratio > SATURATION_THRESHOLD/100.
        // This MUST match the isHighLoad threshold used in the work center load cards below.
        const saturatedWCs = motorBottlenecks
          .filter((b: any) => b.utilization_ratio * 100 > SATURATION_THRESHOLD)
          .map((b: any) => b.work_center_id);
        setBottlenecks(saturatedWCs);
        setBottleneckData(motorBottlenecks); // All WCs with load, for showing utilization %
      } else {
        // Legacy fallback: heuristic detection via red PWOs with saturation reason
        const redWCs = new Set<string>();
        const redPWOs = (pwosRes.data || []).filter(p => p.severity === 'red' && p.delay_reason?.toLowerCase().includes('satur'));
        if (redPWOs.length > 0 && ops) {
          redPWOs.forEach(rp => {
            ops.filter(o => o.work_order_id === rp.work_order_id).forEach(o => redWCs.add(o.work_center_id));
          });
        }
        setBottlenecks(Array.from(redWCs));
        setBottleneckData([]);
      }
    } catch (err) {
      console.error("APS Error:", err);
    } finally {
      setLoadingProposed(false);
    }
  };


  const [isSyncing, setIsSyncing] = useState(false);
  const handleSyncERP = async () => {
    if (!activeScenario) return;
    if (!confirm(t('confirm_sync_erp', { name: activeScenario.name }))) return;
    setIsSyncing(true);
    try {
      const { data: pwos } = await supabase.from('proposed_work_orders').select('*').eq('scenario_id', activeScenario.id);
      if (pwos) {
        for (const p of pwos) {
          if (p.work_order_id && !p.work_order_id.startsWith('REP-')) {
            await supabase.from('work_orders').update({ due_date: p.end_date, status: 'Scheduled' }).eq('id', p.work_order_id);
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
      let name = `${t('simulation_name_prefix')} ${new Date().toLocaleString(language === 'es' ? 'es-AR' : 'en-US')}`;
      if (isRealCapacity && !overlapEnabled && Object.keys(wcSplitConfigs).length === 0) {
        name += ' (Real)';
      }
      const { data: { user } } = await supabase.auth.getUser();
      // Fallback ID for development stability (matches existing data)
      const userId = user?.id || "44f60375-a5e9-4c37-a52e-92db947dafd9";

      const { data: newScenario, error: scnErr } = await supabase.from('scenarios').insert({
        name,
        user_id: userId,
        include_maintenance: includeMaintenance,
        simulation_overrides: {
          machine_counts: virtualMachines,
          overlap_enabled: overlapEnabled,
          work_center_configs: wcSplitConfigs,
          filters: { ...filters, orderIds: typeof filters.orderIds === 'string' ? (filters.orderIds ? filters.orderIds.split(',').map(s => s.trim()) : []) : filters.orderIds }
        }
      }).select().single();

      if (scnErr) throw scnErr;
      await apsAlgorithm.runSimulation(newScenario.id, (p) => setSimulationProgress(p));
      await refreshScenarios();
      setSelectedScenarioId(newScenario.id);
    } catch (error: any) {
      console.error("APS Error:", error);
      alert(t('error') + ": " + error.message);
    }
    setIsExecuting(false);
  };

  const isRealCapacity = JSON.stringify(virtualMachines) === JSON.stringify(defaultMachineCounts);
  const handleResetToReal = () => {
    setVirtualMachines(defaultMachineCounts);
    setOverlapEnabled(false);
    setWcSplitConfigs({});
    setIncludeMaintenance(true);
  };

  // ─────────────────────────────────────────────────────────────────────
  // SINGLE SOURCE OF TRUTH: WC load percentages
  // Computed from actual proposedOperations vs real machine capacity.
  // Both the left sidebar AND the right load cards read from this map.
  // ─────────────────────────────────────────────────────────────────────
  const wcLoadMap = React.useMemo(() => {
    const map: Record<string, { loadPct: number; loadMinutes: number; capacityMinutes: number; machineCount: number }> = {};
    const dtFrom = new Date(filters.fromDate || new Date());
    const dtTo = new Date(filters.toDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000));
    const horizonDays = Math.max(1, Math.round((dtTo.getTime() - dtFrom.getTime()) / 86400000));

    workCenters.forEach(wc => {
      const wcOps = proposedOperations.filter(op => op.work_center_id === wc.id);
      const loadMinutes = wcOps.reduce((acc, op) => acc + (op.run_time_minutes || 0) + (op.setup_time_minutes || 0), 0);

      const wcMachines: any[] = scenarioMachinesData.filter((m: any) => m.work_center_id === wc.id);
      const machineCount = virtualMachines[wc.id] || wcMachines.length || 1;

      // Per-machine capacity: use shift hours if available, otherwise 8h/day × 5d/week
      const perMachineCapacity = (m: any): number => {
        const shift = m?.shift;
        if (!shift) return 8 * 60 * horizonDays * (5 / 7); // default 8h × 5/7 working days
        const [sh, sm] = (shift.start_time || '08:00').split(':').map(Number);
        const [eh, em] = (shift.end_time || '16:00').split(':').map(Number);
        const hoursPerDay = Math.max(0, (eh * 60 + em - (sh * 60 + sm)) / 60);
        const daysPerWeek = shift.days_of_week?.length ?? 5;
        return hoursPerDay * 60 * horizonDays * (daysPerWeek / 7);
      };

      const totalCapacityMinutes = wcMachines.length > 0
        ? wcMachines.reduce((acc, m) => acc + perMachineCapacity(m), 0) / wcMachines.length * machineCount
        : 8 * 60 * horizonDays * (5 / 7) * machineCount;

      const loadPct = totalCapacityMinutes > 0
        ? Math.round((loadMinutes / totalCapacityMinutes) * 100)
        : 0;

      map[wc.id] = { loadPct, loadMinutes, capacityMinutes: Math.round(totalCapacityMinutes), machineCount };
    });
    return map;
  }, [workCenters, proposedOperations, scenarioMachinesData, virtualMachines, filters.fromDate, filters.toDate]);

  return (
    <div className="flex h-full overflow-hidden bg-[var(--bg-main)] text-[var(--text-main)] transition-colors">
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <header className="px-8 py-6 border-b border-[var(--border-color)] bg-[var(--bg-sidebar)] flex justify-between items-center shadow-sm z-[10] relative">
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

                <div onClick={() => setOverlapEnabled(!overlapEnabled)} className={`flex items-center justify-between p-4 rounded-2xl border cursor-pointer transition-all ${overlapEnabled ? 'bg-emerald-600/10 border-emerald-500/30 text-emerald-500' : 'bg-[var(--bg-main)] border-[var(--border-color)] opacity-40'}`}>
                  <div className="flex items-center gap-3">
                    <Zap size={18} />
                    <span className="text-xs font-black uppercase tracking-widest">{t('overlap_enabled') || 'Solapamiento (Overlap)'}</span>
                  </div>
                  <div className={`w-3 h-3 rounded-full ${overlapEnabled ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'bg-slate-700'}`}></div>
                </div>
                <div className="space-y-2">
                  <p className="text-[9px] font-black text-[var(--text-muted)] uppercase tracking-widest px-1">{t('deadline')}</p>
                  <input type="date" value={filters.toDate} onChange={e => setFilters({ ...filters, toDate: e.target.value })} className="w-full bg-[var(--bg-input)] border border-[var(--border-color)] rounded-xl p-3 text-xs font-bold outline-none focus:border-indigo-500" />
                </div>
                <div onClick={() => setShowOrderPicker(true)} className="p-4 bg-[var(--bg-input)] border border-[var(--border-color)] rounded-2xl cursor-pointer hover:border-indigo-500/50 transition-all flex justify-between items-center group">
                  <div>
                    <p className="text-[9px] font-black text-[var(--text-muted)] uppercase tracking-widest">{t('demand_filter')}</p>
                    <p className="text-xs font-bold text-indigo-500 mt-0.5">{filters.orderIds ? t('selected_count', { count: filters.orderIds.split(',').filter(Boolean).length }) : t('all_demand')}</p>
                  </div>
                  <Filter size={14} className="text-[var(--text-muted)] group-hover:text-indigo-500" />
                </div>
              </div>
            </section>

            <section className="space-y-6">
              <div className="flex items-center justify-between border-b border-[var(--border-color)] pb-2 mb-2">
                <h3 className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest flex items-center gap-2">
                  <Cpu size={14} /> {t('installed_capacity')}
                </h3>
                {!isRealCapacity && (
                  <button
                    onClick={handleResetToReal}
                    className="text-[8px] font-black text-amber-500 hover:text-amber-400 uppercase flex items-center gap-1 transition-all group"
                    title="Volver a Capacidad ERP (Real)"
                  >
                    <RotateCcw size={10} className="group-hover:rotate-[-180deg] transition-transform duration-500" /> {t('reset') || 'Real'}
                  </button>
                )}
              </div>
              <div className="space-y-3">
                {workCenters.map(wc => {
                  const wcLoad = wcLoadMap[wc.id];
                  const utilizationPct = wcLoad?.loadPct ?? 0;
                  const isSaturated = utilizationPct > SATURATION_THRESHOLD;
                  const isDanger = utilizationPct > 70 && !isSaturated;
                  // is_ccr comes from the motor's bottleneckData (structural info, not load %)
                  const isCCR = bottleneckData.find((b: any) => b.work_center_id === wc.id)?.is_ccr === true;
                  return (
                    <div key={wc.id} className={`flex flex-col p-4 rounded-2xl border transition-all duration-500 gap-3 ${isSaturated
                      ? 'bg-rose-500/10 border-rose-500/50 shadow-[0_0_15px_rgba(244,63,94,0.2)]'
                      : isDanger
                        ? 'bg-amber-500/8 border-amber-500/40'
                        : 'bg-[var(--bg-card)] border-[var(--border-color)] shadow-sm'
                      }`}>
                      <div className="flex justify-between items-center">
                        <div className="flex-1 min-w-0 pr-2">
                          <span className={`text-xs font-black uppercase tracking-tighter truncate block ${isSaturated ? 'text-rose-500' : isDanger ? 'text-amber-500' : ''}`}>
                            {wc.name}
                            {isCCR && <span className="ml-1.5 text-[8px] font-black bg-rose-500 text-white px-1.5 py-0.5 rounded-full uppercase tracking-widest">CCR</span>}
                          </span>
                          <p className="text-[8px] font-bold text-[var(--text-muted)] mt-0.5 uppercase flex items-center gap-1.5">
                            {t('machines')}
                            {wcLoad && (
                              <span className={`font-black ${utilizationPct > SATURATION_THRESHOLD ? 'text-rose-500' : utilizationPct > 70 ? 'text-amber-500' : 'text-emerald-500'}`}>
                                · {utilizationPct}% util.
                              </span>
                            )}
                          </p>
                        </div>
                        <div className="flex items-center gap-1 bg-[var(--bg-input)] border border-[var(--border-color)] rounded-xl p-1 shrink-0 scale-90">
                          <button onClick={() => setVirtualMachines(v => ({ ...v, [wc.id]: Math.max(0, (v[wc.id] || 0) - 1) }))} className="w-6 h-6 rounded-lg bg-[var(--bg-card)] hover:border-indigo-500/30 border border-transparent font-black text-xs transition-all">-</button>
                          <div className="relative">
                            <span className={`w-5 text-center text-[10px] font-black flex justify-center ${virtualMachines[wc.id] === 0 ? 'text-rose-500' : isSaturated ? 'text-rose-500' : virtualMachines[wc.id] !== defaultMachineCounts[wc.id] ? 'text-amber-500' : 'text-indigo-600'}`}>
                              {virtualMachines[wc.id] || 0}
                            </span>
                            {virtualMachines[wc.id] !== defaultMachineCounts[wc.id] && (
                              <div className="absolute -top-1 -right-1 w-1 h-1 rounded-full bg-amber-500 animate-pulse" title="Diferente a Real"></div>
                            )}
                          </div>
                          <button onClick={() => setVirtualMachines(v => ({ ...v, [wc.id]: (v[wc.id] || 0) + 1 }))} className="w-6 h-6 rounded-lg bg-[var(--bg-card)] hover:border-indigo-500/30 border border-transparent font-black text-xs transition-all">+</button>
                        </div>
                      </div>

                      <div className="flex items-center justify-between border-t border-[var(--border-color)] pt-3">
                        <div className="flex items-center gap-2 cursor-pointer group" onClick={() => setWcSplitConfigs(c => ({ ...c, [wc.id]: { enabled: !c[wc.id]?.enabled, maxSplit: c[wc.id]?.maxSplit || 2 } }))}>
                          <div className={`w-8 h-4 rounded-full relative transition-all duration-300 ${wcSplitConfigs[wc.id]?.enabled ? 'bg-blue-600' : 'bg-slate-700'}`}>
                            <div className={`absolute top-0.5 w-3 h-3 rounded-full bg-white transition-all duration-300`} style={{ left: wcSplitConfigs[wc.id]?.enabled ? '18px' : '2px' }} />
                          </div>
                          <span className={`text-[8px] font-bold uppercase tracking-widest ${wcSplitConfigs[wc.id]?.enabled ? 'text-blue-500' : 'text-[var(--text-muted)]'}`}>Split</span>
                        </div>

                        {wcSplitConfigs[wc.id]?.enabled && (
                          <div className="flex items-center gap-1 bg-blue-500/5 border border-blue-500/10 rounded-lg p-0.5 animate-in fade-in slide-in-from-right-1">
                            <span className="text-[7px] font-black text-blue-500 p-1 uppercase">Máx</span>
                            <button onClick={() => setWcSplitConfigs(c => ({ ...c, [wc.id]: { ...c[wc.id], maxSplit: Math.max(1, (c[wc.id]?.maxSplit || 1) - 1) } }))} className="w-5 h-5 rounded bg-blue-500/10 text-blue-500 font-bold text-[10px]">-</button>
                            <span className="w-4 text-center text-[10px] font-black text-blue-500">{Math.min(wcSplitConfigs[wc.id]?.maxSplit || 1, virtualMachines[wc.id] || 1)}</span>
                            <button onClick={() => setWcSplitConfigs(c => ({ ...c, [wc.id]: { ...c[wc.id], maxSplit: Math.min(virtualMachines[wc.id] || 1, (c[wc.id]?.maxSplit || 1) + 1) } }))} className="w-5 h-5 rounded bg-blue-500/10 text-blue-500 font-bold text-[10px]">+</button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          </aside>

          <div className="flex-1 p-4 overflow-y-auto bg-grid-indigo-500/[0.02]">
            {activeScenario ? (
              <div className="max-w-full mx-auto space-y-6">
                <div className="bg-indigo-600/5 rounded-[1.5rem] p-6 border border-indigo-500/10 relative overflow-hidden flex flex-col md:flex-row items-center justify-between gap-6 shadow-2xl">
                  <div className="relative z-10 space-y-2">
                    <h2 className="text-4xl font-black uppercase tracking-tighter leading-none">{activeScenario.name}</h2>
                    <p className="text-[var(--text-muted)] text-sm font-medium leading-relaxed max-w-xl">
                      {t('simulation_success_msg', { count: proposedOrders.pwos.length })}
                    </p>
                  </div>
                  <button onClick={handleSyncERP} disabled={isSyncing} className="relative z-10 bg-emerald-600 hover:bg-emerald-500 text-white px-6 py-3 rounded-[1rem] font-black uppercase text-[10px] tracking-widest shadow-2xl transition-all hover:scale-105 active:scale-95 shadow-emerald-900/40 flex items-center gap-2">
                    <RefreshCw className={isSyncing ? 'animate-spin' : ''} size={14} />
                    {isSyncing ? t('calculating') + '...' : t('sync_erp')}
                  </button>
                </div>

                {/* Center Load Analysis section */}
                <div className="glass-panel rounded-[2rem] p-8 border border-[var(--border-color)] shadow-2xl space-y-8 bg-gradient-to-br from-[var(--bg-card)] to-[var(--bg-main)]">
                  <div className="flex items-center justify-between border-b border-[var(--border-color)] pb-6">
                    <div>
                      <h3 className="text-2xl font-black uppercase tracking-tighter">{t('work_center_load')}</h3>
                      <p className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-[0.2em] mt-1">{t('saturation_analysis')}</p>
                    </div>
                    <div className="p-4 bg-indigo-500/10 rounded-2xl text-indigo-500 border border-indigo-500/20">
                      <Cpu size={28} />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {workCenters.map(wc => {
                      // Read from the shared wcLoadMap — same data as the left sidebar
                      const wcLoad = wcLoadMap[wc.id];
                      const totalRunTime = wcLoad?.loadMinutes ?? 0;
                      const totalCapacityMinutes = wcLoad?.capacityMinutes ?? 0;
                      const machineCount = wcLoad?.machineCount ?? (virtualMachines[wc.id] || 1);
                      const realLoadPercentage = wcLoad?.loadPct ?? 0;
                      const loadBarWidth = Math.min(100, realLoadPercentage);
                      const isHighLoad = realLoadPercentage > SATURATION_THRESHOLD;
                      const isDanger = realLoadPercentage > 70 && !isHighLoad; // 70–85%: warning zone

                      // Date range for display only
                      const dtFrom = new Date(filters.fromDate || new Date());
                      const dtTo = new Date(filters.toDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000));

                      return (
                        <div key={wc.id} className="bg-[var(--bg-sidebar)] p-5 rounded-3xl border border-[var(--border-color)] group hover:border-indigo-500/40 transition-all shadow-lg relative overflow-hidden">
                          {(isHighLoad || isDanger) && (
                            <div className="absolute top-0 right-0 p-2">
                              <div className={`w-2 h-2 rounded-full animate-pulse ${isHighLoad ? 'bg-rose-500 shadow-[0_0_10px_rgba(244,63,94,0.8)]' : 'bg-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.8)]'}`}></div>
                            </div>
                          )}

                          <div className="space-y-4">
                            <div className="flex justify-between items-start">
                              <div>
                                <h5 className="text-xs font-black uppercase text-[var(--text-muted)] tracking-widest leading-none mb-1">{wc.name}</h5>
                                <p className="text-[10px] font-bold text-indigo-400">
                                  {t('machines_count', { count: machineCount })} • {Math.round(totalCapacityMinutes / 60)}h Total
                                </p>
                                <p className="text-[9px] font-medium text-[var(--text-muted)] flex items-center gap-1 mt-1">
                                  <Calendar size={10} className="text-indigo-400/60" />
                                  {dtFrom.toLocaleDateString(undefined, { day: 'numeric', month: 'short' })} - {dtTo.toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}
                                </p>
                              </div>
                              <span className={`text-lg font-black ${isHighLoad ? 'text-rose-500' : isDanger ? 'text-amber-500' : 'text-emerald-500'}`}>
                                {isNaN(realLoadPercentage) ? 0 : realLoadPercentage}%
                              </span>
                            </div>

                            <div className="h-3 bg-[var(--bg-main)] rounded-full overflow-hidden border border-[var(--border-color)]">
                              <div
                                className={`h-full transition-all duration-1000 ease-out rounded-full ${isHighLoad ? 'bg-gradient-to-r from-rose-600 to-rose-400'
                                  : isDanger ? 'bg-gradient-to-r from-amber-500 to-amber-400'
                                    : 'bg-gradient-to-r from-emerald-600 to-emerald-400'
                                  }`}
                                style={{ width: `${loadBarWidth}%` }}
                              ></div>
                            </div>

                            <div className="flex justify-between text-[9px] font-black uppercase tracking-widest">
                              <span className="text-[var(--text-muted)]">{t('load')}: {Math.round(totalRunTime / 60)}h / {Math.round(totalCapacityMinutes / 60)}h</span>
                              <span className={isHighLoad ? 'text-rose-500 animate-pulse' : isDanger ? 'text-amber-500' : 'text-emerald-500'}>
                                {isHighLoad ? t('saturated') : isDanger ? t('warning') || 'Precaución' : t('operational')}
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="grid grid-cols-1 xl:grid-cols-[1.4fr_0.6fr] gap-6">
                  <div className="glass-panel rounded-[1.5rem] overflow-hidden flex flex-col border border-[var(--border-color)] shadow-xl">
                    <div className="p-3 bg-[var(--bg-sidebar)] border-b border-[var(--border-color)] flex justify-between items-center">
                      <h4 className="text-[9px] font-black uppercase tracking-widest text-[var(--text-muted)]">{t('production_proposal')}</h4>
                      <Package size={16} className="text-indigo-500" />
                    </div>
                    <div className="max-h-[600px] overflow-auto">
                      <table className="w-full text-left border-collapse">
                        <thead className="bg-[var(--bg-main)] text-[8px] font-black uppercase text-[var(--text-muted)] sticky top-0 border-b border-[var(--border-color)]">
                          <tr>
                            <th className="px-2 py-2">{t('product_quantity')}</th>
                            <th className="px-1 py-2 text-center">{t('start')}</th>
                            <th className="px-2 py-2 text-right">{t('end')}</th>
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
                                      <p className="text-[8px] font-black text-rose-500 uppercase tracking-widest leading-none">{t('delay')}: {p.delay_days}d</p>
                                    )}
                                  </div>
                                </div>
                                <div className="flex items-center gap-1.5">
                                  <span className={`px-1 py-0.5 rounded text-[6px] font-black uppercase ${p.action_type === 'cancel' ? 'bg-rose-500/20 text-rose-500' : p.status === 'firm' ? 'bg-indigo-500/20 text-indigo-400' : 'bg-amber-500/20 text-amber-500'}`}>
                                    {p.action_type === 'cancel' ? t('cancel_action') : p.status === 'firm' ? t('firm') : t('proposed')}
                                  </span>
                                  <p className="text-[8px] font-bold text-indigo-500/40 uppercase tracking-tighter truncate max-w-[100px]">{t('batch')}: {p.quantity} • {p.ref_erp_id || t('new_action')}</p>
                                </div>
                              </td>
                              <td className="px-2 py-2 text-center">
                                <p className="text-[9px] font-black font-mono text-indigo-400 bg-indigo-500/5 px-2 py-0.5 rounded-md inline-block">{new Date(p.start_date || p.end_date).toLocaleDateString()}</p>
                              </td>
                              <td className="px-3 py-2 text-right">
                                <p className="text-[10px] font-black font-mono text-emerald-500 bg-emerald-500/5 px-2 py-0.5 rounded-md inline-block">{new Date(p.end_date).toLocaleDateString(language === 'es' ? 'es-AR' : 'en-US')}</p>
                                {p.due_date && (
                                  <p className="text-[7px] text-[var(--text-muted)] font-black uppercase mt-0.5">{t('comp')}: {new Date(p.due_date).toLocaleDateString(language === 'es' ? 'es-AR' : 'en-US')}</p>
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
                      <h4 className="text-[9px] font-black uppercase tracking-widest text-[var(--text-muted)]">{t('purchasing_needs')}</h4>
                      <ShoppingCart size={16} className="text-amber-500" />
                    </div>
                    <div className="max-h-[600px] overflow-auto">
                      <table className="w-full text-left border-collapse">
                        <thead className="bg-[var(--bg-main)] text-[8px] font-black uppercase text-[var(--text-muted)] sticky top-0 border-b border-[var(--border-color)]">
                          <tr><th className="px-3 py-2">{t('item')}</th><th className="px-3 py-2 text-right">{t('qty_arrival')}</th></tr>
                        </thead>
                        <tbody>
                          {loadingProposed ? <tr><td colSpan={2} className="p-10 text-center"><RefreshCw className="animate-spin mx-auto text-amber-500" /></td></tr> : proposedOrders.ppos.map((p, i) => (
                            <tr key={i} className="border-b border-[var(--border-color)] hover:bg-amber-500/[0.02] transition-colors">
                              <td className="px-3 py-2">
                                <p className="text-[11px] font-black truncate max-w-[150px]">{p.item?.name || p.item_id}</p>
                                <div className="flex items-center gap-2 mt-1">
                                  <span className={`px-1 py-0.5 rounded text-[6px] font-black uppercase ${p.change_type === 'reprogram' ? 'bg-indigo-500/20 text-indigo-400' : 'bg-emerald-500/20 text-emerald-500'}`}>
                                    {p.change_type === 'reprogram' ? t('reprogram_action') : t('new_action')}
                                  </span>
                                  <p className="text-[8px] font-bold text-amber-500/60 uppercase tracking-tighter">{t('ref')}: {p.item_id}</p>
                                </div>
                              </td>
                              <td className="px-3 py-2 text-right">
                                <p className="text-[11px] font-black text-amber-500">{p.quantity}</p>
                                <p className="text-[9px] font-black opacity-40 font-mono">{new Date(p.delivery_date).toLocaleDateString(language === 'es' ? 'es-AR' : 'en-US')}</p>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-[var(--text-muted)] opacity-30 animate-pulse">
                <Play size={100} />
                <p className="text-xl font-black uppercase tracking-[1em] mt-10">{t('aps_projection')}</p>
              </div>
            )}
          </div>
          <AIAnalyst simulationData={{
            retrasos: proposedOrders.pwos.filter(p => p.severity === 'red').map(p => ({
              orden: p.work_order_id,
              producto: p.item?.name || p.item_id,
              retraso_dias: p.delay_days,
              razon: p.delay_reason
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
