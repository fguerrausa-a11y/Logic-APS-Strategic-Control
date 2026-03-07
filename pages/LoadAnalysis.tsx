
import React, { useState, useEffect } from 'react';
import TopHeader from '../components/TopHeader';
import { useTranslation } from '../services/languageService';
import { useSimulation } from '../services/SimulationContext';
import { supabase } from '../services/supabaseClient';
import { Activity, Clock, Zap, Anchor, Layers, Package, AlertTriangle, Calendar } from 'lucide-react';

const calculateShiftHours = (start: string, end: string): number => {
  if (!start || !end) return 8;
  const [h1, m1] = start.split(':').map(Number);
  const [h2, m2] = end.split(':').map(Number);
  return (h2 + m2 / 60) - (h1 + m1 / 60);
};

const calculateCapacityForPeriod = (start: Date, end: Date, machine: any): number => {
  const shift = machine.shift;
  if (!shift || !shift.days_of_week) return 8 * 60 * 30; // 30 days default

  let totalMinutes = 0;
  const curDate = new Date(start.getTime());
  const hours = calculateShiftHours(shift.start_time, shift.end_time);

  while (curDate <= end) {
    if (shift.days_of_week?.includes(curDate.getDay())) {
      totalMinutes += hours * 60;
    }
    curDate.setDate(curDate.getDate() + 1);
  }
  return totalMinutes;
};

const LoadAnalysisPage: React.FC = () => {
  const { t } = useTranslation();
  const { selectedScenarioId, capacityHorizon, setCapacityHorizon } = useSimulation();
  const [wcLoads, setWcLoads] = useState<any[]>([]);
  const [buffers, setBuffers] = useState<any[]>([]);
  const [tocStatus, setTocStatus] = useState({ drum: '', buffer: 0, rope: 'Sync' });

  useEffect(() => {
    if (selectedScenarioId) {
      fetchWorkCenterLoads(selectedScenarioId);
      fetchBuffers();
    }
  }, [selectedScenarioId, capacityHorizon]);

  const fetchWorkCenterLoads = async (scenarioId: string) => {
    try {
      const { data: scenario } = await supabase.from('scenarios').select('*').eq('id', scenarioId).single();
      const { data: wcs } = await supabase.from('work_centers').select('*');
      const { data: ops } = await supabase.from('proposed_operations').select('*').eq('scenario_id', scenarioId);
      const { data: allMachines } = await supabase.from('machines').select('*, shift:shifts(*)');

      if (wcs && ops && scenario && allMachines) {
        const overrides = scenario.simulation_overrides?.machine_counts || {};

        // Use dynamic horizon from context
        const horizonDays = capacityHorizon;

        const loads = wcs.map((wc: any) => {
          const wcOps = ops.filter((o: any) => o.work_center_id === wc.id);
          const totalRunTime = wcOps.reduce((acc: number, o: any) => acc + (o.run_time_minutes || 0) + (o.setup_time_minutes || 0), 0);

          const dbMachines = allMachines.filter((m: any) => m.work_center_id === wc.id);
          const overrideCount = overrides[wc.id];
          const machineCount = overrideCount !== undefined ? Number(overrideCount) : dbMachines.length;

          // Per-machine capacity: use shift hours if available, matching Simulation.tsx exactly
          const perMachineCapacity = (m: any): number => {
            const shift = m?.shift;
            if (!shift) return 8 * 60 * horizonDays * (5 / 7); // default 8h × 5/7 working days
            const [sh, sm] = (shift.start_time || '08:00').split(':').map(Number);
            const [eh, em] = (shift.end_time || '16:00').split(':').map(Number);
            const hoursPerDay = Math.max(0, (eh * 60 + em - (sh * 60 + sm)) / 60);
            const daysPerWeek = shift.days_of_week?.length ?? 5;
            return hoursPerDay * 60 * horizonDays * (daysPerWeek / 7);
          };

          const totalCapacityMinutes = dbMachines.length > 0
            ? dbMachines.reduce((acc: number, m: any) => acc + perMachineCapacity(m), 0) / dbMachines.length * machineCount
            : 8 * 60 * horizonDays * (5 / 7) * machineCount;

          const loadPercent = totalCapacityMinutes > 0 ? Math.round((totalRunTime / totalCapacityMinutes) * 100) : 0;

          return {
            id: wc.id,
            name: wc.name,
            load: loadPercent,
            totalMinutes: totalRunTime,
            color: loadPercent > 85 ? 'bg-rose-500 shadow-rose-500/20' : loadPercent > 70 ? 'bg-amber-500 shadow-amber-500/20' : 'bg-indigo-600 shadow-indigo-600/20',
            drum: false
          };
        });

        // Determine the DRUM (Constraint)
        if (loads.length > 0) {
          const sorted = [...loads].sort((a, b) => b.load - a.load);
          const drumWc = sorted[0];
          drumWc.drum = true;

          const bufferHours = Math.round(drumWc.totalMinutes / 60);

          setTocStatus({
            drum: drumWc.name,
            buffer: bufferHours,
            rope: drumWc.load > 85 ? t('high_tension') : t('pulling')
          });
        }

        setWcLoads(loads);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchBuffers = async () => {
    if (!selectedScenarioId) return;
    try {
      const { data: items } = await supabase
        .from('items')
        .select('*')
        .in('item_type', ['COMPRADO', 'MP', 'INSUMO', 'PURCHASED'])
        .limit(10);

      const { data: ppos } = await supabase
        .from('proposed_purchase_orders')
        .select('*')
        .eq('scenario_id', selectedScenarioId);

      // Use proposed_work_orders for consumption as they contain the item_id being produced
      const { data: pwos } = await supabase
        .from('proposed_work_orders')
        .select('*')
        .eq('scenario_id', selectedScenarioId);

      const { data: bom } = await supabase.from('bom').select('*');

      if (items) {
        setBuffers(items.map(item => {
          // current_stock = stock en tiempo real; initial_stock = baseline de apertura
          const stock = item.current_stock ?? item.initial_stock ?? 0;
          // safety_stock es el buffer objetivo; fallback a min_purchase_qty o 10
          const safety = item.safety_stock || item.min_purchase_qty || 10;

          // Calculate simulated consumption for this item based on what we're producing (PWOs)
          const simulatedPurchases = ppos?.filter(p => p.item_id === item.id).reduce((acc, p) => acc + (p.quantity || 0), 0) || 0;

          const simulatedConsumption = pwos?.reduce((acc, pwo) => {
            const components = bom?.filter(b => b.parent_item_id === pwo.item_id && b.component_item_id === item.id) || [];
            const needed = components.reduce((cAcc, c) => cAcc + (c.quantity_required * (pwo.quantity || 0)), 0);
            return acc + needed;
          }, 0) || 0;

          const projectedStock = stock + simulatedPurchases - simulatedConsumption;

          // SCALING: Use 3 * safety as the "100%" mark for the bar
          const targetBuffer = safety * 3;
          const percentageOfTarget = Math.round((projectedStock / targetBuffer) * 100);

          return {
            name: item.name,
            val: Math.min(100, Math.max(8, percentageOfTarget)), // Ensure at least a visible "sliver"
            currentStock: Math.max(0, projectedStock),
            uom: item.uom || 'u',
            safety: safety,
            percentage: Math.round((projectedStock / safety) * 100),
            status: projectedStock < safety ? t('critical') : projectedStock < safety * 1.5 ? t('warning') : t('healthy'),
            color: projectedStock < safety ? 'text-rose-500' : projectedStock < safety * 1.5 ? 'text-amber-500' : 'text-emerald-500'
          };
        }).sort((a, b) => a.percentage - b.percentage).slice(0, 5));
      }
    } catch (e) { console.error(e); }
  };

  return (
    <div className="flex h-full overflow-hidden bg-[var(--bg-main)] transition-colors">
      <main className="flex-1 flex flex-col h-full overflow-hidden relative">
        <TopHeader title={t('wc_load_analysis')} icon="bar_chart" />
        <div className="flex-1 overflow-hidden p-4 lg:p-6">
          <div className="h-full max-w-[1600px] mx-auto flex flex-col gap-4">

            {/* TOC Dashboard Header - Compact */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 shrink-0">
              <div className="bg-indigo-600/10 border border-indigo-500/20 p-4 rounded-[1.5rem] flex items-center justify-between">
                <div>
                  <p className="text-[9px] font-black uppercase text-indigo-500 tracking-widest mb-0.5">{t('the_drum')}</p>
                  <h4 className="text-base font-black uppercase tracking-tighter truncate max-w-[180px]">{tocStatus.drum || 'N/A'}</h4>
                </div>
                <Zap className="text-indigo-500" size={24} />
              </div>
              <div className="bg-amber-600/10 border border-amber-500/20 p-4 rounded-[1.5rem] flex items-center justify-between">
                <div>
                  <p className="text-[9px] font-black uppercase text-amber-500 tracking-widest mb-0.5">{t('time_buffer')}</p>
                  <h4 className="text-base font-black uppercase tracking-tighter">{t('time_reserve', { hours: tocStatus.buffer })}</h4>
                </div>
                <Clock className="text-amber-500" size={24} />
              </div>
              <div className="bg-emerald-600/10 border border-emerald-500/20 p-4 rounded-[1.5rem] flex items-center justify-between">
                <div>
                  <p className="text-[9px] font-black uppercase text-emerald-500 tracking-widest mb-0.5">{t('the_rope')}</p>
                  <h4 className="text-base font-black uppercase tracking-tighter">{tocStatus.rope}</h4>
                </div>
                <Anchor className="text-emerald-500" size={24} />
              </div>
            </div>

            <section className="flex-1 grid grid-cols-1 xl:grid-cols-3 gap-4 min-h-0">
              <div className="xl:col-span-2 rounded-[2rem] border border-[var(--border-color)] bg-[var(--bg-card)] p-6 flex flex-col shadow-xl min-h-0 relative overflow-hidden">
                <div className="flex items-center justify-between mb-4 shrink-0">
                  <div>
                    <h3 className="text-[var(--text-main)] text-base font-black uppercase tracking-tighter flex items-center gap-2">
                      <Activity className="text-indigo-500" size={20} />
                      {t('wc_loading')}
                    </h3>
                    <p className="text-[var(--text-muted)] text-[10px] font-bold uppercase tracking-widest opacity-60 flex items-center gap-2">
                      {t('finite_vs_projected')} · (Proyección {capacityHorizon} Días)
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <p className="text-[7px] font-bold text-indigo-400 uppercase tracking-widest">Horizonte:</p>
                    <select
                      value={capacityHorizon}
                      onChange={e => setCapacityHorizon(parseInt(e.target.value, 10))}
                      className="bg-[var(--bg-card)] border border-[var(--border-color)] text-indigo-400 text-[8px] font-black uppercase rounded p-1 outline-none focus:border-indigo-500 cursor-pointer"
                    >
                      {[15, 30, 45, 60, 90].map(val => (
                        <option key={val} value={val}>{val} Días</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="flex-1 flex items-end justify-between gap-4 relative px-6 pb-16 mt-4 min-h-0 overflow-hidden">
                  {/* OVERLOAD LIMIT LINE (matched to 85% Saturation Threshold) */}
                  <div className="absolute left-0 right-0 bottom-[85%] h-px border-t border-dashed border-rose-500/40 flex items-center z-30 pointer-events-none">
                    <div className="px-2 py-0.5 bg-rose-500/10 backdrop-blur-md border border-rose-500/40 rounded text-[7px] font-black text-rose-500 absolute left-2 -translate-y-1/2 uppercase tracking-widest whitespace-nowrap shadow-md">
                      {t('overload_limit')}
                    </div>
                  </div>

                  {wcLoads.map((wc, i) => (
                    <div key={i} className="flex-1 flex flex-col justify-end group cursor-pointer relative z-10 h-full max-w-[120px]">
                      {wc.drum && (
                        <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-rose-600 text-white text-[7px] font-black uppercase tracking-[0.2em] px-2.5 py-1.5 rounded-lg shadow-lg shadow-rose-600/30 whitespace-nowrap animate-bounce z-40 border border-white/20">
                          DRUM
                        </div>
                      )}

                      <div className="relative flex-1 flex flex-col justify-end w-full min-h-0">
                        <div className={`w-full bg-indigo-500/5 rounded-t-[1.2rem] relative overflow-hidden flex items-end border border-[var(--border-color)]/20 ${wc.drum ? 'ring-2 ring-rose-500/40' : ''} h-full`}>
                          <div
                            className={`w-full ${wc.color} transition-all duration-1000 rounded-t-lg relative shadow-inner`}
                            style={{ height: `${Math.min(wc.load, 100)}%` }}
                          >
                            {wc.load > 85 && (
                              <div className="absolute inset-0 bg-white/10 animate-pulse"></div>
                            )}
                          </div>
                        </div>

                        <div className="absolute -bottom-14 left-0 right-0 text-center">
                          <p className={`text-[8px] font-black uppercase tracking-tighter leading-tight overflow-hidden ${wc.drum ? 'text-rose-500' : 'text-[var(--text-main)]'}`} style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                            {wc.name}
                          </p>
                          <p className={`text-[10px] font-bold font-mono mt-0.5 ${wc.load > 85 ? 'text-rose-500' : 'text-indigo-500 opacity-60'}`}>
                            {wc.load}%
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                  {wcLoads.length === 0 && <p className="absolute inset-0 flex items-center justify-center text-xs font-bold uppercase opacity-30">{t('no_data')}</p>}
                </div>
              </div>

              <div className="rounded-[2rem] border border-[var(--border-color)] bg-[var(--bg-card)] p-6 flex flex-col shadow-xl min-h-0 overflow-hidden">
                <div className="flex items-center justify-between mb-6 shrink-0">
                  <h3 className="text-[var(--text-main)] text-base font-black uppercase tracking-tighter flex items-center gap-3">
                    <Layers className="text-indigo-500" size={20} />
                    {t('material_buffers')}
                  </h3>
                </div>
                <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
                  <div className="flex flex-col gap-6">
                    {buffers.map((buf, i) => (
                      <div key={i} className="space-y-3 bg-white/[0.02] p-3 rounded-2xl border border-white/5">
                        <div className="flex justify-between items-start gap-3">
                          <div className="flex-1 min-w-0">
                            <h4 className="text-[10px] font-black text-[var(--text-main)] uppercase tracking-tight truncate" title={buf.name}>{buf.name}</h4>
                            <div className="flex items-center gap-2 mt-0.5">
                              <span className="text-[8px] font-bold text-[var(--text-muted)] uppercase tracking-widest">{t('current_stock_label')}</span>
                              <span className={`text-[9px] font-black ${buf.percentage < 50 ? 'text-rose-500' : 'text-emerald-500'}`}>{buf.currentStock} {buf.uom}</span>
                            </div>
                          </div>
                          <div className="text-right shrink-0">
                            <span className={`text-[8px] px-2 py-0.5 rounded-full font-black uppercase tracking-widest ${buf.status === t('low') ? 'bg-rose-500/20 text-rose-500' : buf.status === t('warning') ? 'bg-amber-500/20 text-amber-500' : 'bg-emerald-500/20 text-emerald-500'}`}>
                              {buf.status}
                            </span>
                            <div className="text-[7px] font-bold text-[var(--text-muted)] uppercase tracking-widest mt-1">{t('target_label')} {buf.safety * 2}</div>
                          </div>
                        </div>
                        <div className="h-4 bg-[var(--bg-main)] rounded-full relative overflow-hidden shadow-inner border border-[var(--border-color)]">
                          <div
                            className={`absolute top-0 bottom-0 left-0 transition-all duration-1000 rounded-full opacity-60 ${buf.percentage < 50 ? 'bg-rose-500' : buf.percentage < 80 ? 'bg-amber-500' : 'bg-emerald-500'}`}
                            style={{ width: `${buf.val}%` }}
                          ></div>
                          <div
                            className="absolute top-0 bottom-0 w-1.5 h-full bg-white shadow-[0_0_10px_rgba(255,255,255,0.8)] rounded-full z-10 transition-all duration-1000"
                            style={{ left: `${buf.val}%` }}
                          ></div>
                          {/* Neutral Safety Line */}
                          <div className="absolute left-[50%] top-0 bottom-0 w-px bg-white/20 z-0"></div>
                        </div>
                      </div>
                    ))}
                    {buffers.length === 0 && (
                      <div className="flex flex-col items-center justify-center py-10 opacity-20 text-center">
                        <Package size={32} className="mb-2" />
                        <p className="text-[10px] font-black uppercase tracking-widest">{t('no_inventory_data')}</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </section>
          </div>
        </div>
      </main>
    </div>
  );
};

export default LoadAnalysisPage;
