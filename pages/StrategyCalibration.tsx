
import React, { useState, useEffect } from 'react';
import TopHeader from '../components/TopHeader';
import AIAnalyst from '../components/AIAnalyst';
import { apsAlgorithm, APSResult } from '../services/apsAlgorithm';
import { supabase } from '../services/supabaseClient';
import { useTranslation } from '../services/languageService';
import {
    Zap,
    Target,
    TrendingUp,
    Layers,
    Clock,
    Box,
    Cpu,
    Play,
    ArrowRight,
    ShieldCheck,
    AlertTriangle,
    RotateCcw,
    Calendar
} from 'lucide-react';

const calculateShiftHours = (start: string, end: string): number => {
    if (!start || !end) return 8;
    const [h1, m1] = start.split(':').map(Number);
    const [h2, m2] = end.split(':').map(Number);
    return (h2 + m2 / 60) - (h1 + m1 / 60);
};

const calculateCapacityForPeriod = (start: Date, end: Date, machine: any): number => {
    const shift = machine.shift;
    if (!shift || !shift.days_of_week) return 8 * 60 * 30; // Default 30 days if no shift

    let totalMinutes = 0;
    const curDate = new Date(start.getTime());
    const hours = calculateShiftHours(shift.start_time, shift.end_time);

    while (curDate <= end) {
        if (shift.days_of_week.includes(curDate.getDay())) {
            totalMinutes += hours * 60;
        }
        curDate.setDate(curDate.setDate() + 1);
    }
    return totalMinutes;
};

const StrategyCalibration: React.FC = () => {
    const { t } = useTranslation();
    const [loading, setLoading] = useState(false);
    const [calibrating, setCalibrating] = useState(false);
    const [data, setData] = useState<any>(null);

    // Baseline results vs Simulated results
    const [baseline, setBaseline] = useState<APSResult | null>(null);
    const [simulation, setSimulation] = useState<APSResult | null>(null);

    // Configuration for "What-If"
    const [config, setConfig] = useState({
        scheduling_mode: 'TOC Optimized',
        bottleneck_management: 'Drum-Buffer-Rope',
        overlap_enabled: true,
        reprovision_policy: 'MRP Standard'
    });

    useEffect(() => {
        fetchBaseData();
    }, []);

    const fetchBaseData = async () => {
        setLoading(true);
        try {
            const [
                { data: items }, { data: bom }, { data: routings },
                { data: machines }, { data: workOrders },
                { data: erpPurchases }, { data: currentSettings },
                { data: maintenancePlans }, { data: workCenters }
            ] = await Promise.all([
                supabase.from('items').select('*'),
                supabase.from('bom').select('*'),
                supabase.from('routings').select('*'),
                supabase.from('machines').select('*, shift:shifts(*)'),
                supabase.from('work_orders').select('*'),
                supabase.from('erp_purchase_orders').select('*'),
                supabase.from('aps_settings').select('*').limit(1).single(),
                supabase.from('maintenance_plans').select('*'),
                supabase.from('work_centers').select('*')
            ]);

            const baseData = {
                items: items || [],
                bom: bom || [],
                routings: routings || [],
                machines: machines || [],
                workOrders: workOrders || [],
                erpPurchases: erpPurchases || [],
                existingOps: [],
                maintenancePlans: maintenancePlans || [],
                workCenters: workCenters || [],
                settings: { simulation_overrides: {} }
            };

            setData(baseData);

            // Initial run with current settings
            const initial = apsAlgorithm.calculateAPS({
                ...baseData,
                settings: {
                    scheduling_mode: currentSettings?.scheduling_mode || 'TOC Optimized',
                    bottleneck_management: currentSettings?.bottleneck_management || 'Drum-Buffer-Rope',
                    overlap_enabled: currentSettings?.overlap_enabled ?? true
                }
            });
            setBaseline(initial);
            setSimulation(initial);

            if (currentSettings) {
                setConfig({
                    scheduling_mode: currentSettings.scheduling_mode,
                    bottleneck_management: currentSettings.bottleneck_management,
                    overlap_enabled: currentSettings.overlap_enabled,
                    reprovision_policy: currentSettings.reprovision_policy || 'TOC Replenishment'
                });
            }

        } catch (err) {
            console.error("Error fetching data:", err);
        } finally {
            setLoading(false);
        }
    };

    const runAnalysis = () => {
        if (!data) return;
        setCalibrating(true);
        setTimeout(() => {
            const result = apsAlgorithm.calculateAPS({
                ...data,
                settings: config
            });
            setSimulation(result);
            setCalibrating(false);
        }, 800);
    };

    if (loading) {
        return (
            <div className="flex h-full bg-[var(--bg-main)]">
                <main className="flex-1 flex items-center justify-center">
                    <div className="text-center">
                        <RotateCcw className="animate-spin text-indigo-500 mb-4 mx-auto" size={48} />
                        <p className="text-[var(--text-muted)] font-black uppercase tracking-widest text-xs animate-pulse">Cargando Motor...</p>
                    </div>
                </main>
            </div>
        );
    }

    const MetricCard = ({ title, value, unit, icon: Icon, color, diff }: any) => {
        const isPositive = diff > 0;
        const isBetter = title.includes('Entrega') ? isPositive : !isPositive;

        return (
            <div className="bg-[var(--bg-card)] border border-[var(--border-color)] p-6 rounded-[2.5rem] relative overflow-hidden group hover:border-indigo-500/50 transition-all duration-500 shadow-xl">
                <div className={`absolute top-0 right-0 w-32 h-32 opacity-5 rounded-full -mr-16 -mt-16 bg-${color}-500 blur-3xl group-hover:opacity-20 transition-opacity`} />
                <div className="flex items-center gap-4 mb-4">
                    <div className={`p-3 rounded-2xl bg-${color}-500/10 text-${color}-400`}>
                        <Icon size={24} />
                    </div>
                    <h4 className="text-[var(--text-muted)] text-[10px] font-black uppercase tracking-[0.2em]">{title}</h4>
                </div>
                <div className="flex items-baseline gap-2">
                    <span className="text-4xl font-black font-display text-[var(--text-main)]">{value}</span>
                    <span className="text-sm font-bold text-[var(--text-muted)]">{unit}</span>
                </div>
                {diff !== 0 && (
                    <div className={`mt-4 inline-flex items-center gap-1 px-3 py-1 rounded-full text-[10px] font-black uppercase ${isBetter ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'}`}>
                        {isPositive ? '+' : ''}{diff.toFixed(1)}% {isBetter ? 'Mejor' : 'Crítico'}
                    </div>
                )}
            </div>
        );
    };

    return (
        <div className="flex h-full bg-[var(--bg-main)] text-[var(--text-main)]">
            <main className="flex-1 flex flex-col overflow-hidden relative">
                <TopHeader title={t('calibration')} icon="tune" />

                <div className="flex-1 overflow-y-auto p-8 space-y-8">
                    {/* Dashboard Header */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        <MetricCard
                            title="KPI Entrega a Tiempo"
                            value={simulation?.metrics?.onTimeDeliveryRate.toFixed(1)}
                            unit="%"
                            icon={Target}
                            color="indigo"
                            diff={((simulation?.metrics?.onTimeDeliveryRate || 0) - (baseline?.metrics?.onTimeDeliveryRate || 0))}
                        />
                        <MetricCard
                            title="Lead Time Promedio"
                            value={simulation?.metrics?.avgLeadTime.toFixed(1)}
                            unit="Días"
                            icon={Clock}
                            color="amber"
                            diff={((simulation?.metrics?.avgLeadTime || 0) - (baseline?.metrics?.avgLeadTime || 0)) / (baseline?.metrics?.avgLeadTime || 1) * 100}
                        />
                        <MetricCard
                            title="Utilización Media"
                            value={(() => {
                                if (!simulation || !data) return "0";
                                const start = new Date();
                                const end = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
                                let totalCap = 0;
                                let totalUsage = 0;

                                (data.workCenters || []).forEach((wc: any) => {
                                    const wcMachines = data.machines.filter((m: any) => m.work_center_id === wc.id);
                                    const wcOps = (simulation.proposedOperations || []).filter((o: any) => o.work_center_id === wc.id);
                                    totalUsage += wcOps.reduce((acc: number, o: any) => acc + (o.run_time_minutes || 0) + (o.setup_time_minutes || 0), 0);
                                    totalCap += wcMachines.reduce((acc: number, m: any) => acc + calculateCapacityForPeriod(start, end, m), 0);
                                });
                                return totalCap > 0 ? Math.round((totalUsage / totalCap) * 100) : 0;
                            })()}
                            unit="%"
                            icon={Cpu}
                            color="emerald"
                            diff={0}
                        />
                    </div>

                    <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
                        {/* Configuration Panel */}
                        <div className="xl:col-span-4 space-y-6">
                            <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-[2.5rem] p-8 space-y-8 shadow-2xl relative">
                                <div className="flex items-center gap-3 border-b border-[var(--border-color)] pb-6">
                                    <div className="w-10 h-10 rounded-2xl bg-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
                                        <Zap className="text-white" size={20} />
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-black uppercase tracking-tighter">Motor Virtual</h3>
                                        <p className="text-[10px] text-[var(--text-muted)] font-bold">AJUSTA LOS PARÁMETROS DE IA</p>
                                    </div>
                                </div>

                                <div className="space-y-6">
                                    <div className="space-y-3">
                                        <label className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest pl-2">Modalidad de Programación</label>
                                        <select
                                            className="w-full bg-[var(--bg-main)] border border-[var(--border-color)] rounded-2xl p-4 text-sm font-bold focus:border-indigo-500 outline-none appearance-none"
                                            value={config.scheduling_mode}
                                            onChange={(e) => setConfig({ ...config, scheduling_mode: e.target.value })}
                                        >
                                            <option value="TOC Optimized">TOC Optimized (Protección Cuello Botella)</option>
                                            <option value="Forward ASAP">Forward ASAP (Lo antes posible)</option>
                                            <option value="Backward JIT">Backward JIT (Justo a tiempo)</option>
                                        </select>
                                    </div>

                                    <div className="space-y-3">
                                        <label className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest pl-2">Gestión de Restricciones</label>
                                        <select
                                            className="w-full bg-[var(--bg-main)] border border-[var(--border-color)] rounded-2xl p-4 text-sm font-bold focus:border-indigo-500 outline-none appearance-none"
                                            value={config.bottleneck_management}
                                            onChange={(e) => setConfig({ ...config, bottleneck_management: e.target.value })}
                                        >
                                            <option value="Drum-Buffer-Rope">Drum-Buffer-Rope (DBR)</option>
                                            <option value="Infinite Capacity">Capacidad Infinita</option>
                                        </select>
                                    </div>

                                    <div className="space-y-3">
                                        <label className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest pl-2">Política de Reposición</label>
                                        <select
                                            className="w-full bg-[var(--bg-main)] border border-[var(--border-color)] rounded-2xl p-4 text-sm font-bold focus:border-indigo-500 outline-none appearance-none"
                                            value={config.reprovision_policy}
                                            onChange={(e) => setConfig({ ...config, reprovision_policy: e.target.value })}
                                        >
                                            <option value="TOC Replenishment">TOC Replenishment (MTS/Buffer)</option>
                                            <option value="MRP Standard">MRP Standard (Lead Time Fijo)</option>
                                            <option value="Stock-to-Order">Stock-to-Order (MTO Puro)</option>
                                        </select>
                                    </div>

                                    <div className="p-1 bg-[var(--bg-main)] rounded-2xl border border-[var(--border-color)] flex gap-1">
                                        <button
                                            onClick={() => setConfig({ ...config, overlap_enabled: true })}
                                            className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl transition-all font-black text-[10px] uppercase ${config.overlap_enabled ? 'bg-indigo-600 text-white shadow-lg' : 'text-[var(--text-muted)] hover:bg-[var(--bg-card)]'}`}
                                        >
                                            <Layers size={14} /> Solapar (Overlap)
                                        </button>
                                        <button
                                            onClick={() => setConfig({ ...config, overlap_enabled: false })}
                                            className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl transition-all font-black text-[10px] uppercase ${!config.overlap_enabled ? 'bg-slate-700 text-white shadow-lg' : 'text-[var(--text-muted)] hover:bg-[var(--bg-card)]'}`}
                                        >
                                            <Box size={14} /> Serie Única
                                        </button>
                                    </div>
                                </div>

                                <button
                                    onClick={runAnalysis}
                                    disabled={calibrating}
                                    className="w-full bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white rounded-2xl py-5 font-black uppercase tracking-[0.2em] shadow-xl shadow-indigo-500/20 flex items-center justify-center gap-3 group disabled:opacity-50"
                                >
                                    {calibrating ? <RotateCcw className="animate-spin" /> : <Play fill="currentColor" size={18} className="group-hover:scale-110 transition-transform" />}
                                    Lanzar Predicción
                                </button>
                            </div>

                            <div className="bg-emerald-500/5 border border-emerald-500/20 p-6 rounded-[2rem] flex items-start gap-4">
                                <ShieldCheck className="text-emerald-500 shrink-0" size={24} />
                                <p className="text-[10px] font-bold text-emerald-400 uppercase leading-relaxed">Entorno Seguro: Los cambios en este panel no afectan el plan de producción actual de Supabase.</p>
                            </div>
                        </div>

                        {/* Impact Visualization */}
                        <div className="xl:col-span-8 flex flex-col gap-6">
                            <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-[2.5rem] flex-1 flex flex-col p-8 shadow-2xl relative overflow-hidden">
                                <div className="flex items-center justify-between mb-8">
                                    <div>
                                        <h3 className="text-xl font-black uppercase tracking-tighter">Impacto en Entregas</h3>
                                        <p className="text-[10px] text-[var(--text-muted)] font-bold">COMPARATIVA DE ÓRDENES DE TRABAJO</p>
                                    </div>
                                    <div className="flex items-center gap-4">
                                        <div className="flex items-center gap-2">
                                            <div className="w-3 h-3 rounded-full bg-rose-500" />
                                            <span className="text-[10px] font-black uppercase text-[var(--text-muted)]">Retraso</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <div className="w-3 h-3 rounded-full bg-emerald-500" />
                                            <span className="text-[10px] font-black uppercase text-[var(--text-muted)]">A Tiempo</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex-1 space-y-4">
                                    {simulation?.proposedWorkOrders.slice(0, 8).map((wo: any, idx: number) => {
                                        const baselineWO = baseline?.proposedWorkOrders.find(b => b.item_id === wo.item_id);
                                        const isBetter = wo.delay_days < (baselineWO?.delay_days || 0);

                                        return (
                                            <div key={idx} className="bg-[var(--bg-main)] border border-[var(--border-color)] rounded-2xl p-4 flex items-center gap-6 group hover:translate-x-2 transition-transform duration-300">
                                                <div className={`w-2 h-10 rounded-full ${wo.delay_days > 0 ? 'bg-rose-500' : 'bg-emerald-500'}`} />
                                                <div className="flex-1">
                                                    <p className="font-black text-sm uppercase tracking-tighter">{wo.work_order_id || 'REPOSICIÓN'}</p>
                                                    <p className="text-[10px] text-[var(--text-muted)] font-bold uppercase">{wo.item_id}</p>
                                                </div>
                                                <div className="text-right">
                                                    <p className="text-[10px] font-black uppercase text-[var(--text-muted)]">Retraso</p>
                                                    <div className="flex items-center gap-2 justify-end">
                                                        <span className="text-xs font-bold text-[var(--text-muted)] line-through">{baselineWO?.delay_days}d</span>
                                                        <ArrowRight size={12} className="text-[var(--text-muted)]" />
                                                        <span className={`text-sm font-black ${wo.delay_days > 0 ? 'text-rose-400' : 'text-emerald-400'}`}>{wo.delay_days}d</span>
                                                    </div>
                                                </div>
                                                {isBetter && (
                                                    <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-400">
                                                        <TrendingUp size={20} />
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>

                                <div className="mt-8 p-6 bg-indigo-600/5 border border-indigo-500/20 rounded-2xl flex items-center gap-4">
                                    <Zap className="text-indigo-400" size={20} />
                                    <p className="text-xs font-medium text-indigo-300/80 italic">La IA sugiere que con "{config.scheduling_mode}" y "{config.overlap_enabled ? 'Overlap Activado' : 'Serie Única'}", optimizas el flujo en el Centro de Mecanizado, reduciendo cuellos de botella.</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
};

export default StrategyCalibration;
