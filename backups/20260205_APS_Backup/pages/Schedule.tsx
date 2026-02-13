
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import { supabase } from '../services/supabaseClient';
import { scenarioService } from '../services/scenarioService';
import { apsAlgorithm } from '../services/apsAlgorithm';
import { exportGanttToPDF, calculateMachineUtilization, getUtilizationColor, getUtilizationBgColor, exportStockFlowToPDF } from '../utils/ganttUtils';
import {
  Calendar,
  Settings,
  Activity,
  Package,
  CheckCircle2,
  RefreshCw,
  GanttChart,
  ZoomIn,
  ZoomOut,
  X,
  AlertCircle,
  Download,
  BarChart3,
  TrendingUp,
  Sun,
  Moon,
  ArrowRight,
  FileText,
  RotateCcw,
  Trash2,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { useTranslation } from '../services/languageService';
import { useSimulation } from '../services/SimulationContext';
import TopHeader from '../components/TopHeader';

const WO_COLORS = [
  { bg: 'bg-indigo-600/40', border: 'border-indigo-500/60', hover: 'hover:bg-indigo-600/60', text: 'text-white' },
  { bg: 'bg-emerald-600/40', border: 'border-emerald-500/60', hover: 'hover:bg-emerald-600/60', text: 'text-white' },
  { bg: 'bg-amber-600/40', border: 'border-amber-500/60', hover: 'hover:bg-amber-600/60', text: 'text-white' },
  { bg: 'bg-rose-600/40', border: 'border-rose-500/60', hover: 'hover:bg-rose-600/60', text: 'text-white' },
  { bg: 'bg-cyan-600/40', border: 'border-cyan-500/60', hover: 'hover:bg-cyan-600/60', text: 'text-white' },
];

const OperationDetailPanel: React.FC<{ operation: any; onClose: () => void }> = ({ operation, onClose }) => {
  const { t } = useTranslation();
  if (!operation) return null;
  return (
    <div className="fixed right-0 top-0 bottom-0 w-96 bg-[var(--bg-card)] border-l border-[var(--border-color)] shadow-2xl z-50 overflow-y-auto animate-in slide-in-from-right">
      <div className="p-6 border-b border-[var(--border-color)] flex justify-between items-center bg-[var(--bg-sidebar)] sticky top-0">
        <h3 className="text-lg font-bold">{t('operation_detail')}</h3>
        <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-main)]"><X size={20} /></button>
      </div>
      <div className="p-6 space-y-6">
        <div>
          <span className="text-[10px] font-black uppercase text-[var(--text-muted)]">{t('op_product')}</span>
          <p className="text-lg font-bold">{operation.work_order_id}</p>
          <p className="text-sm text-indigo-500 font-bold">{operation.item?.name}</p>
        </div>
        <div>
          <span className="text-[10px] font-black uppercase text-[var(--text-muted)]">{t('aps_suggestion')}</span>
          <div className={`mt-2 p-3 rounded-xl border ${operation.suggestion?.action_type === 'advance' ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-500' : 'bg-amber-500/10 border-amber-500/30 text-amber-500'}`}>
            <p className="text-xs font-black uppercase tracking-widest">{operation.suggestion?.action_type || 'NEW'}</p>
            <p className="text-[10px] opacity-80 mt-1">Ref ERP: {operation.suggestion?.ref_erp_id || 'N/A'}</p>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="p-4 bg-[var(--bg-main)] rounded-xl border border-[var(--border-color)]">
            <span className="text-[8px] font-black uppercase text-[var(--text-muted)]">{t('start')}</span>
            <p className="text-xs font-bold mt-1">{new Date(operation.start_date).toLocaleString()}</p>
          </div>
          <div className="p-4 bg-[var(--bg-main)] rounded-xl border border-[var(--border-color)]">
            <span className="text-[8px] font-black uppercase text-[var(--text-muted)]">{t('end')}</span>
            <p className="text-xs font-bold mt-1">{new Date(operation.end_date).toLocaleString()}</p>
          </div>
        </div>
      </div>
    </div>
  );
};

const SchedulePage: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { scenarios, selectedScenarioId, setSelectedScenarioId, refreshScenarios } = useSimulation();
  const [machines, setMachines] = useState<any[]>([]);
  const [operations, setOperations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewRange, setViewRange] = useState({ start: new Date('2026-03-01'), days: 90 });
  const [timeGrain, setTimeGrain] = useState<'hours' | 'days' | 'weeks'>('days');
  const [pixelsPerUnit, setPixelsPerUnit] = useState(120);
  const [selectedOperation, setSelectedOperation] = useState<any | null>(null);
  const [theme, setTheme] = useState<'light' | 'dark'>(() => (localStorage.getItem('theme') as 'light' | 'dark') || 'dark');
  const [stockFlowData, setStockFlowData] = useState<Record<string, any>>({});
  const [showStockFlow, setShowStockFlow] = useState(false);
  const [selectedStockItem, setSelectedStockItem] = useState<string | null>(null);
  const [activeBottlenecks, setActiveBottlenecks] = useState<any[]>([]);
  const [draggingOperation, setDraggingOperation] = useState<any | null>(null);
  const [dragPreview, setDragPreview] = useState<{ id: string, left: number, start: Date, machineId: string } | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const headerScrollRef = useRef<HTMLDivElement>(null);
  const footerScrollRef = useRef<HTMLDivElement>(null);

  const syncScroll = (e: React.UIEvent<HTMLDivElement>, ...targetRefs: React.RefObject<HTMLDivElement>[]) => {
    if (e.currentTarget) {
      const left = e.currentTarget.scrollLeft;
      targetRefs.forEach(ref => {
        if (ref.current && ref.current !== e.currentTarget) {
          ref.current.scrollLeft = left;
        }
      });
    }
  };

  const ROW_HEIGHT = 40;
  const SIDEBAR_WIDTH = 180;

  useEffect(() => { document.documentElement.setAttribute('data-theme', theme); localStorage.setItem('theme', theme); }, [theme]);

  useEffect(() => {
    if (selectedScenarioId) {
      loadScenarioOperations(selectedScenarioId);
    }
  }, [selectedScenarioId]);

  const loadScenarioOperations = async (id: string | null) => {
    if (!id) return;
    setLoading(true);
    try {
      const { data: itemsRaw } = await supabase.from('items').select('*');
      const itemsData = itemsRaw || [];
      const res = await apsAlgorithm.runSimulation(id);

      const flowWithNames: any = {};
      Object.keys(res.stockFlow || {}).forEach(itemId => {
        const item = itemsData.find(i => i.id === itemId);
        flowWithNames[itemId] = {
          name: item?.name || itemId,
          events: res.stockFlow[itemId]
        };
      });
      setStockFlowData(flowWithNames);

      // Use operations from result primarily, fallback to DB if needed
      const { data: dbOps } = await supabase.from('proposed_operations').select('*').eq('scenario_id', id);
      const opsToUse = (dbOps && dbOps.length > 0) ? dbOps : res.proposedOperations;

      const finalOpsMapped = (opsToUse || []).map((dbOp: any) => {
        const item = itemsData.find(i => i.id === dbOp.item_id);
        const suggestion = res.proposedWorkOrders?.find(p =>
          p.item_id === dbOp.item_id &&
          (p.work_order_id === dbOp.work_order_id || p.quantity === dbOp.quantity)
        );
        return {
          ...dbOp,
          item,
          suggestion: suggestion || { action_type: 'new' }
        };
      });
      setOperations(finalOpsMapped);

      // --- EXHAUSTIVE MACHINE RESOLUTION ---
      const { data: scenData } = await supabase.from('scenarios').select('*').eq('id', id).single();
      const overrides = scenData?.simulation_overrides?.machine_counts || {};

      const { data: fullMachinesData } = await supabase.from('machines').select('*, work_center:work_centers(name)');
      const allDBMachines = fullMachinesData || [];

      const relevantWCs = Array.from(new Set([...allDBMachines.map(m => m.work_center_id), ...Object.keys(overrides)]));

      const finalMachineList: any[] = [];
      relevantWCs.forEach(wcId => {
        const dbWCMachines = allDBMachines.filter(m => m.work_center_id === wcId);
        const overrideCount = overrides[wcId];
        const count = overrideCount !== undefined ? Number(overrideCount) : dbWCMachines.length;

        for (let i = 0; i < count; i++) {
          const realM = dbWCMachines[i];
          finalMachineList.push({
            id: realM ? realM.id : `v-mach-${wcId}-${i}`,
            name: realM ? realM.name : `Mesa Virtual ${i + 1} (${wcId})`,
            work_center: realM?.work_center || { name: wcId }
          });
        }
      });

      setMachines(finalMachineList);

      if (Object.keys(flowWithNames).length > 0) {
        setSelectedStockItem(Object.keys(flowWithNames)[0]);
      }

      if (finalOpsMapped.length > 0) {
        const opTimes = finalOpsMapped.map(o => new Date(o.start_date).getTime()).filter(t => !isNaN(t));
        if (opTimes.length > 0) {
          const firstOpTime = Math.min(...opTimes);
          setViewRange({
            start: new Date(firstOpTime - 6 * 60 * 60 * 1000),
            days: 120
          });
        }
      }
    } catch (e: any) {
      console.error("Error loading scenario:", e);
    } finally {
      setLoading(false);
    }
  };

  const handleUnlockAll = async () => {
    if (!selectedScenarioId) return;
    if (!window.confirm("¿Deseas quitar el candado a TODAS las operaciones?")) return;
    try {
      setLoading(true);
      await supabase.from('proposed_operations').update({ is_locked: false }).eq('scenario_id', selectedScenarioId);
      await loadScenarioOperations(selectedScenarioId);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleOperationDrop = async (op: any, newStartDate: Date, machineId: string) => {
    if (!selectedScenarioId) return;
    if (!op.id) {
      alert(t('error_no_op_id'));
      return;
    }

    const durationMs = new Date(op.end_date).getTime() - new Date(op.start_date).getTime();
    const newEndDate = new Date(newStartDate.getTime() + durationMs);

    const updatedOps = operations.map(o => {
      if (o.id === op.id) {
        return {
          ...o,
          start_date: newStartDate.toISOString(),
          end_date: newEndDate.toISOString(),
          machine_id: machineId,
          is_locked: true
        };
      }
      return { ...o, is_locked: false };
    });
    setOperations(updatedOps);
    setDragPreview(null);

    const confirmReschedule = window.confirm(
      `¿Deseas MOVER esta operación y crear un NUEVO ESCENARIO? (Se liberarán el resto de los candados)`
    );

    if (!confirmReschedule) {
      loadScenarioOperations(selectedScenarioId);
      return;
    }

    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuario no autenticado");

      const currentScenario = scenarios.find(s => s.id === selectedScenarioId);
      const newName = `${currentScenario?.name || 'Simulación'} (v. Manual ${new Date().toLocaleTimeString()})`;

      const { data: newScenario, error: scenErr } = await supabase
        .from('scenarios')
        .insert({
          user_id: user.id,
          name: newName,
          description: `Ajuste manual de ${op.work_order_id}`,
          simulation_overrides: currentScenario?.simulation_overrides || {},
          include_maintenance: currentScenario?.include_maintenance ?? true
        })
        .select().single();

      if (scenErr) throw scenErr;

      const opsToClone = updatedOps.map(o => {
        return {
          scenario_id: newScenario.id,
          item_id: o.item_id,
          work_order_id: o.work_order_id,
          operation_sequence: o.operation_sequence,
          work_center_id: o.work_center_id,
          machine_id: o.machine_id,
          start_date: o.start_date,
          end_date: o.end_date,
          setup_time_minutes: o.setup_time_minutes,
          run_time_minutes: o.run_time_minutes,
          quantity: o.quantity,
          is_locked: o.is_locked
        };
      });

      await supabase.from('proposed_operations').insert(opsToClone);
      await apsAlgorithm.runSimulation(newScenario.id);
      await refreshScenarios();
      setSelectedScenarioId(newScenario.id);

      alert(`Planificación recalculada en nuevo escenario.`);
    } catch (e: any) {
      console.error(e);
      alert(t('error_process_change'));
      loadScenarioOperations(selectedScenarioId);
    } finally {
      setLoading(false);
    }
  };

  const getPos = (dateStr: string) => {
    const d = new Date(dateStr);
    const msPerUnit = timeGrain === 'hours' ? 3600000 : timeGrain === 'weeks' ? 604800000 : 86400000;
    return ((d.getTime() - viewRange.start.getTime()) / msPerUnit) * pixelsPerUnit;
  };

  const getWidth = (startStr: string, endStr: string) => {
    const s = new Date(startStr); const e = new Date(endStr);
    const msPerUnit = timeGrain === 'hours' ? 3600000 : timeGrain === 'weeks' ? 604800000 : 86400000;
    return Math.max(20, ((e.getTime() - s.getTime()) / msPerUnit) * pixelsPerUnit);
  };

  const unitsArray = Array.from({ length: viewRange.days }, (_, i) => {
    const d = new Date(viewRange.start);
    if (timeGrain === 'hours') d.setHours(d.getHours() + i);
    else if (timeGrain === 'weeks') d.setDate(d.getDate() + i * 7);
    else d.setDate(d.getDate() + i);
    return d;
  });

  return (
    <div className="flex h-screen overflow-hidden bg-[var(--bg-main)] text-[var(--text-main)] font-body transition-colors">
      <Sidebar />
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
        <header className="h-20 px-8 border-b border-[var(--border-color)] bg-[var(--bg-sidebar)] flex items-center justify-between shrink-0 shadow-sm z-40">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-indigo-500/10 rounded-2xl text-indigo-500 border border-indigo-500/20">
              <GanttChart size={24} />
            </div>
            <div>
              <h1 className="text-xl font-black tracking-tighter uppercase">{t('tactical_planning')}</h1>
              <div className="flex items-center gap-2 text-[var(--text-muted)] text-[9px] font-black uppercase tracking-widest">
                <span className="flex items-center gap-1"><Activity size={10} className="text-emerald-500" /> {t('finite_capacity')}</span>
                <span className="w-1 h-2 bg-[var(--border-color)] rounded-full"></span>
                <span>{t('operations_count', { count: operations.length })}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')} className="p-2.5 rounded-xl bg-[var(--bg-input)] border border-[var(--border-color)] hover:border-indigo-500/50 transition-all text-[var(--text-muted)]">
              {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
            </button>
            <div className="flex bg-[var(--bg-input)] rounded-xl p-1 border border-[var(--border-color)] gap-1">
              <button title="Gantt" onClick={() => setShowStockFlow(false)} className={`p-1.5 rounded-lg transition-all ${!showStockFlow ? 'bg-indigo-600 text-white shadow-lg' : 'text-[var(--text-muted)] hover:text-indigo-400'}`}><GanttChart size={16} /></button>
              <button title="StockFlow" onClick={() => setShowStockFlow(true)} className={`p-1.5 rounded-lg transition-all ${showStockFlow ? 'bg-indigo-600 text-white shadow-lg' : 'text-[var(--text-muted)] hover:text-indigo-400'}`}><RefreshCw size={16} /></button>
            </div>
            <div className="flex bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl p-1 gap-1 shadow-inner">
              {(['hours', 'days', 'weeks'] as const).map(g => (
                <button
                  key={g}
                  onClick={() => setTimeGrain(g)}
                  className={`px-3 py-1 text-[8px] font-black uppercase rounded-lg transition-all ${timeGrain === g ? 'bg-indigo-600 text-white shadow-lg' : 'text-[var(--text-muted)] hover:bg-white/5'}`}
                  title={t(g)}
                >
                  {g === 'hours' ? 'H' : g === 'days' ? 'D' : 'S'}
                </button>
              ))}
              <div className="w-px h-4 bg-[var(--border-color)] self-center"></div>
              <button onClick={() => setPixelsPerUnit(prev => Math.max(20, prev - 10))} className="p-1.5 hover:bg-white/5 rounded-lg text-[var(--text-muted)] hover:text-indigo-500 transition-all" title="Alejar"><ZoomOut size={16} /></button>
              <button onClick={() => setPixelsPerUnit(prev => Math.min(800, prev + 20))} className="p-1.5 hover:bg-white/5 rounded-lg text-[var(--text-muted)] hover:text-indigo-500 transition-all" title="Acercar"><ZoomIn size={16} /></button>
            </div>

            <button
              onClick={() => setViewRange(prev => ({ ...prev, start: new Date() }))}
              className="px-4 py-2 bg-indigo-500/10 text-[10px] font-black uppercase text-indigo-500 hover:bg-indigo-500/20 rounded-xl transition-all border border-indigo-500/20"
            >
              {t('today')}
            </button>

            <button
              onClick={handleUnlockAll}
              className="flex items-center gap-2 bg-amber-500/10 hover:bg-amber-500/20 text-amber-500 border border-amber-500/20 px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all"
              title="Quitar todos los candados"
            >
              <AlertCircle size={14} />
            </button>
            <button
              onClick={() => {
                const scenario = scenarios.find(s => s.id === selectedScenarioId);
                exportGanttToPDF(machines, operations, viewRange, scenario?.name || 'Simulación');
              }}
              className="bg-indigo-600 hover:bg-indigo-700 text-white p-2.5 rounded-xl transition-all shadow-lg active:scale-95"
            >
              <FileText size={16} />
            </button>
          </div>
        </header>

        <div className="flex-1 overflow-hidden relative flex flex-col">
          {showStockFlow ? (
            <div className="flex-1 overflow-hidden flex flex-col bg-[var(--bg-main)] animate-in fade-in duration-300">
              <div className="p-8 border-b border-[var(--border-color)] bg-[var(--bg-sidebar)] flex justify-between items-center">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-emerald-500/10 rounded-2xl text-emerald-500"><RefreshCw /></div>
                  <div>
                    <h2 className="text-xl font-black uppercase tracking-tighter">{t('stockflow_projected')}</h2>
                    <p className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest">{t('inventory_traceability')}</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-3">
                    <span className="text-[10px] font-black uppercase text-[var(--text-muted)]">Artículo:</span>
                    <select
                      className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl px-4 py-2 text-xs font-bold outline-none focus:border-indigo-500 transition-all min-w-[300px]"
                      value={selectedStockItem || ''}
                      onChange={e => setSelectedStockItem(e.target.value)}
                    >
                      {Object.keys(stockFlowData).map(id => (
                        <option key={id} value={id}>{id} - {stockFlowData[id].name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="flex gap-2 border-l border-[var(--border-color)] pl-4 ml-4">
                    <button
                      onClick={() => {
                        if (!selectedStockItem) return;
                        const rows = stockFlowData[selectedStockItem].events.map(e => `${new Date(e.date).toLocaleString()},${e.type},${e.delta},${e.total},"${e.ref}"`);
                        const csv = "\ufeffFecha,Tipo,Delta,Total,Referencia\n" + rows.join("\n");
                        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement('a'); a.href = url; a.download = `StockFlow_${selectedStockItem}.csv`; a.click();
                      }}
                      className="p-2 border border-[var(--border-color)] rounded-xl text-[var(--text-muted)] hover:text-emerald-500 hover:bg-emerald-500/10 transition-all"
                      title="Exportar Excel (CSV)"
                    ><Download size={18} /></button>
                    <button
                      onClick={() => {
                        if (!selectedStockItem || !stockFlowData[selectedStockItem]) return;
                        const scenario = scenarios.find(s => s.id === selectedScenarioId);
                        exportStockFlowToPDF(
                          selectedStockItem,
                          stockFlowData[selectedStockItem].name,
                          stockFlowData[selectedStockItem].events,
                          scenario?.name || 'Simulación'
                        );
                      }}
                      className="p-2 border border-[var(--border-color)] rounded-xl text-[var(--text-muted)] hover:text-indigo-500 hover:bg-indigo-500/10 transition-all"
                      title="Exportar PDF"
                    >
                      <FileText size={18} />
                    </button>
                  </div>
                </div>
              </div>
              <div className="flex-1 overflow-auto p-10 bg-grid-slate-900/[0.03]">
                <div className="max-w-6xl mx-auto glass-panel rounded-[2.5rem] overflow-hidden shadow-2xl">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-indigo-600/10 text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] border-b border-[var(--border-color)]">
                        <th className="px-8 py-6">Cronología / Evento</th>
                        <th className="px-8 py-5 text-center">Tipo</th>
                        <th className="px-8 py-5 text-right">Variación</th>
                        <th className="px-8 py-5 text-right bg-indigo-600/5">Saldo Acumulado</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedStockItem && stockFlowData[selectedStockItem]?.events.map((ev, i) => (
                        <tr key={i} className="border-b border-[var(--border-color)] hover:bg-[var(--row-hover)] transition-colors group">
                          <td className="px-8 py-5">
                            <p className="text-xs font-black text-indigo-500">{new Date(ev.date).toLocaleString()}</p>
                            <p className="text-[10px] font-bold opacity-60 mt-1">{ev.ref}</p>
                          </td>
                          <td className="px-8 py-5 text-center">
                            <span className={`text-[8px] font-black px-2.5 py-1 rounded-xl uppercase tracking-widest ${ev.type === 'CONSUMPTION' ? 'bg-rose-500/20 text-rose-500' : ev.type === 'INITIAL' ? 'bg-slate-500/20 text-slate-500' : 'bg-emerald-500/20 text-emerald-500'}`}>
                              {ev.type}
                            </span>
                          </td>
                          <td className={`px-8 py-5 text-right font-black ${ev.delta > 0 ? 'text-emerald-500' : ev.delta < 0 ? 'text-rose-500' : 'text-[var(--text-muted)]'}`}>
                            {ev.delta > 0 ? '+' : ''}{ev.delta.toFixed(1)}
                          </td>
                          <td className={`px-8 py-5 text-right font-black text-sm bg-indigo-600/5 ${ev.total < 0 ? 'text-rose-600' : ''}`}>
                            {ev.total.toFixed(1)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex-1 overflow-hidden flex flex-col relative" id="gantt-container">
              {operations.length === 0 && !loading && (
                <div className="absolute inset-0 z-50 flex items-center justify-center bg-[var(--bg-main)]/80 backdrop-blur-sm">
                  <div className="text-center p-12 glass-panel rounded-[3rem] border border-indigo-500/20 max-w-sm animate-in zoom-in duration-300">
                    <BarChart3 size={64} className="mx-auto text-indigo-500 opacity-30 mb-6" />
                    <h3 className="text-xl font-black uppercase tracking-tighter mb-2">{t('empty_simulation')}</h3>
                    <p className="text-sm text-[var(--text-muted)] font-medium leading-relaxed">{t('empty_simulation_desc')}</p>
                    <div className="flex flex-col gap-3 mt-8">
                      <button onClick={() => selectedScenarioId && loadScenarioOperations(selectedScenarioId)} className="bg-indigo-600 hover:bg-indigo-500 text-white px-10 py-4 rounded-[1.5rem] font-black uppercase text-[10px] tracking-widest shadow-xl flex items-center justify-center gap-2">
                        <RefreshCw size={14} /> {t('refresh')}
                      </button>
                      <button onClick={() => navigate('/simulation')} className="bg-[var(--bg-card)] border border-[var(--border-color)] text-[var(--text-main)] px-10 py-4 rounded-[1.5rem] font-black uppercase text-[10px] tracking-widest hover:bg-[var(--bg-input)] transition-colors">
                        {t('simulation_strategy')}
                      </button>
                    </div>
                  </div>
                </div>
              )}
              <div className="flex h-16 border-b border-[var(--border-color)] bg-[var(--bg-sidebar)] shrink-0 z-30 shadow-md">
                <div className="w-[180px] border-r border-[var(--border-color)] shrink-0 p-3 sticky left-0 z-40 bg-[var(--bg-sidebar)] flex items-center shadow-[4px_0_10px_rgba(0,0,0,0.2)]">
                  <span className="text-[10px] font-black text-indigo-500 uppercase tracking-widest">{t('resources')}</span>
                </div>
                <div className="flex-1 overflow-hidden" ref={headerScrollRef}>
                  <div className="flex" style={{ width: `${viewRange.days * pixelsPerUnit}px` }}>
                    {unitsArray.map((unit, i) => {
                      const isNewDay = i === 0 || unit.getDate() !== unitsArray[i - 1].getDate();
                      return (
                        <div
                          key={i}
                          className={`border-r border-[var(--border-color)] flex flex-col shrink-0 ${unit.getDay() === 0 || unit.getDay() === 6 ? 'bg-black/10' : ''}`}
                          style={{ width: `${pixelsPerUnit}px` }}
                        >
                          <div className={`h-8 flex flex-col items-center justify-center border-b border-[var(--border-color)] transition-colors ${isNewDay ? 'bg-indigo-500/20' : ''}`}>
                            <span className={`text-[8px] font-black uppercase tracking-tighter ${isNewDay ? 'text-indigo-400' : 'text-[var(--text-muted)] opacity-40'}`}>
                              {isNewDay ? unit.toLocaleDateString('es-AR', { weekday: 'short', day: 'numeric', month: 'short' }) : `${unit.getHours()}h`}
                            </span>
                          </div>
                          <div className="flex-1 flex items-center justify-center bg-black/5">
                            <span className="text-[10px] font-black text-[var(--text-muted)] opacity-30">
                              {unit.getHours()}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
              <div
                className="flex-1 overflow-auto bg-grid-white/[0.01] scrollbar-premium"
                ref={scrollContainerRef}
                onScroll={(e) => {
                  syncScroll(e, headerScrollRef, footerScrollRef);
                }}
              >
                <div className="relative" style={{ width: `${viewRange.days * pixelsPerUnit + SIDEBAR_WIDTH}px`, height: `${machines.length * ROW_HEIGHT}px` }}>
                  <svg className="absolute top-0 bottom-0 pointer-events-none z-50" style={{ left: `${SIDEBAR_WIDTH}px`, width: `${viewRange.days * pixelsPerUnit}px`, height: '100%' }}>
                    <defs>
                      <marker id="arrowhead" markerWidth="6" markerHeight="6" refX="6" refY="3" orientation="auto">
                        <path d="M0,0 L6,3 L0,6" fill="none" stroke="var(--accent)" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
                      </marker>
                    </defs>
                    {operations.map(op => {
                      const clean = (id: any) => String(id || '').toUpperCase().replace(/^(WO\-|OP\-|O\-)/i, '').trim();
                      const opWO = clean(op.work_order_id);

                      // Find ALL operations belonging to this production flow (same WO tree)
                      const treeFlow = operations
                        .filter(o => clean(o.work_order_id) === opWO)
                        .sort((a, b) => {
                          const timeA = new Date(a.start_date).getTime();
                          const timeB = new Date(b.start_date).getTime();
                          if (timeA !== timeB) return timeA - timeB;
                          return Number(a.operation_sequence) - Number(b.operation_sequence);
                        });

                      const myIdx = treeFlow.findIndex(o => o.id === op.id);
                      const next = treeFlow[myIdx + 1];

                      if (!next) return null;

                      // Edge alignment
                      const x1 = getPos(op.end_date);
                      const x2 = getPos(next.start_date) - 2;
                      const mIdx1 = machines.findIndex(m => String(m.id) === String(op.machine_id));
                      const mIdx2 = machines.findIndex(m => String(m.id) === String(next.machine_id));

                      if (mIdx1 < 0 || mIdx2 < 0) return null;

                      const y1 = mIdx1 * ROW_HEIGHT + ROW_HEIGHT / 2;
                      const y2 = mIdx2 * ROW_HEIGHT + ROW_HEIGHT / 2;

                      let d = "";
                      if (mIdx1 === mIdx2) {
                        d = `M ${x1} ${y1} L ${x2} ${y2}`;
                      } else {
                        // Intelligent pathing: mid-point elbow unless they are too close or overlapping
                        const gap = x2 - x1;
                        const turnX = gap > 10 ? x1 + gap / 2 : x1 + 5;
                        d = `M ${x1} ${y1} L ${turnX} ${y1} L ${turnX} ${y2} L ${x2} ${y2}`;
                      }

                      return (
                        <path
                          key={`link-${op.id}-${next.id}`}
                          d={d}
                          stroke="var(--accent)"
                          strokeWidth="1"
                          strokeDasharray="2,2"
                          strokeOpacity="0.5"
                          fill="none"
                          markerEnd="url(#arrowhead)"
                          style={{ transition: 'all 0.3s ease' }}
                        />
                      );
                    })}
                  </svg>
                  {machines.map((machine, mIdx) => {
                    const machineOps = operations.filter(op => String(op.machine_id) === String(machine.id));
                    return (
                      <div key={machine.id} className={`flex border-b border-[var(--border-color)] h-[${ROW_HEIGHT}px] group transition-colors relative ${mIdx % 2 === 0 ? 'bg-white/[0.01]' : 'bg-black/[0.02]'}`} style={{ height: `${ROW_HEIGHT}px` }}>
                        <div className={`w-[${SIDEBAR_WIDTH}px] border-r border-[var(--border-color)] shrink-0 px-4 sticky left-0 z-20 bg-[var(--bg-sidebar)] group-hover:bg-[var(--row-hover)] flex flex-col justify-center shadow-[4px_0_10px_rgba(0,0,0,0.2)]`} style={{ width: `${SIDEBAR_WIDTH}px` }}>
                          <h4 className="font-black text-[10px] uppercase tracking-tighter text-[var(--text-main)] w-full mb-0.5 whitespace-nowrap truncate">{machine.name}</h4>
                          <p className="text-[7px] text-indigo-500 font-black uppercase tracking-widest opacity-80 whitespace-nowrap truncate">{machine.work_center?.name || 'CENTRO'}</p>
                        </div>
                        <div
                          className="flex-1 relative"
                          onDragOver={(e) => {
                            e.preventDefault();
                            if (!draggingOperation) return;
                            const rect = e.currentTarget.getBoundingClientRect();
                            const x = e.clientX - rect.left;
                            const msPerUnit = timeGrain === 'hours' ? 3600000 : timeGrain === 'weeks' ? 604800000 : 86400000;
                            const units = x / pixelsPerUnit;
                            const currentStart = new Date(viewRange.start.getTime() + units * msPerUnit);
                            setDragPreview({
                              id: draggingOperation.id,
                              left: x,
                              start: currentStart,
                              machineId: machine.id
                            });
                          }}
                          onDrop={(e) => {
                            e.preventDefault();
                            if (!draggingOperation) return;
                            const rect = e.currentTarget.getBoundingClientRect();
                            const x = e.clientX - rect.left;
                            const msPerUnit = timeGrain === 'hours' ? 3600000 : timeGrain === 'weeks' ? 604800000 : 86400000;
                            const units = x / pixelsPerUnit;
                            const newStartDate = new Date(viewRange.start.getTime() + units * msPerUnit);
                            handleOperationDrop(draggingOperation, newStartDate, machine.id);
                            setDraggingOperation(null);
                            setDragPreview(null);
                          }}
                        >
                          {dragPreview && dragPreview.machineId === machine.id && draggingOperation && (
                            <div
                              className="absolute top-[4px] h-[32px] border-2 border-dashed border-indigo-400 bg-indigo-400/20 rounded-xl z-50 pointer-events-none flex flex-col justify-center px-4 shadow-[0_0_20px_rgba(129,140,248,0.3)]"
                              style={{ left: `${dragPreview.left}px`, width: `${getWidth(draggingOperation.start_date, draggingOperation.end_date)}px` }}
                            >
                              <span className="text-[8px] font-black text-white uppercase tracking-tighter">{dragPreview.start.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}</span>
                            </div>
                          )}
                          {machineOps.map((op) => {
                            const left = getPos(op.start_date);
                            const width = getWidth(op.start_date, op.end_date);
                            const idNum = parseInt(op.work_order_id.replace(/\D/g, '')) || 0;
                            const colors = WO_COLORS[idNum % WO_COLORS.length];
                            const actionColor = op.suggestion?.action_type === 'advance' ? 'border-emerald-500' : op.suggestion?.action_type === 'delay' ? 'border-amber-500' : 'border-indigo-500/50';

                            return (
                              <div
                                key={`${machine.id}-${op.id}-${op.operation_sequence}`}
                                onClick={() => setSelectedOperation(op)}
                                draggable
                                onDragStart={(e) => {
                                  setDraggingOperation(op);
                                  const img = new Image();
                                  img.src = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';
                                  e.dataTransfer.setDragImage(img, 0, 0);
                                  e.dataTransfer.effectAllowed = "move";
                                }}
                                className={`absolute h-[32px] border rounded-lg px-2 py-0.5 flex flex-col justify-between cursor-pointer transition-all hover:z-40 hover:brightness-110 active:scale-95 shadow-sm overflow-hidden ${colors.bg} ${actionColor}`}
                                style={{
                                  left: `${left + 1}px`,
                                  width: `${width - 2}px`,
                                  minWidth: '40px',
                                  top: '4px'
                                }}
                              >
                                <div className="flex justify-between items-center gap-1">
                                  <span className={`text-[8px] font-black leading-none truncate ${colors.text}`}>
                                    {op.work_order_id}
                                  </span>
                                  {op.suggestion?.action_type && op.suggestion.action_type !== 'new' && (
                                    <div className={`text-[5px] font-black px-1 rounded-full uppercase shrink-0 ${op.suggestion.action_type === 'advance' ? 'bg-emerald-500 text-white' : 'bg-amber-500 text-white'}`}>
                                      {op.suggestion.action_type.substring(0, 3)}
                                    </div>
                                  )}
                                </div>

                                <p className={`text-[7px] font-bold truncate leading-tight opacity-90 ${colors.text}`}>
                                  {op.item?.name || 'Item'}
                                </p>

                                <div className="flex justify-between items-center mt-auto border-t border-white/10 pt-0.5">
                                  <span className={`text-[6px] font-black uppercase tracking-tighter ${colors.text}`}>S{op.operation_sequence}</span>
                                  <span className={`text-[6px] font-black ${colors.text} opacity-70`}>{op.quantity}U</span>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                  <div className="absolute top-0 bottom-0 w-px bg-rose-500 shadow-[0_0_15px_red] z-40 pointer-events-none" style={{ left: `${getPos(new Date().toISOString()) + SIDEBAR_WIDTH}px` }}>
                    <div className="bg-rose-500 text-[8px] font-black text-white px-2 py-0.5 rounded-full absolute -top-3 -translate-x-1/2 whitespace-nowrap">AHORA</div>
                  </div>
                </div>
              </div>
              {/* Barra de desplazamiento auxiliar al pie - Ahora más ancha y con color diferenciado */}
              {!showStockFlow && (
                <div
                  className="h-8 bg-indigo-900/10 border-t border-indigo-500/30 overflow-x-auto overflow-y-hidden shrink-0 scrollbar-premium"
                  ref={footerScrollRef}
                  onScroll={(e) => syncScroll(e, scrollContainerRef, headerScrollRef)}
                >
                  <div style={{ width: `${viewRange.days * pixelsPerUnit + SIDEBAR_WIDTH}px`, height: '1px' }}></div>
                </div>
              )}
            </div>
          )}
        </div>

        <OperationDetailPanel operation={selectedOperation} onClose={() => setSelectedOperation(null)} />
      </main>
    </div>
  );
};

export default SchedulePage;
