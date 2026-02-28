
import React, { useState, useEffect } from 'react';
import TopHeader from '../components/TopHeader';
import AIAnalyst from '../components/AIAnalyst';
import { apsAlgorithm, APSResult } from '../services/apsAlgorithm';
import { supabase } from '../services/supabaseClient';
import { useTranslation } from '../services/languageService';
import { sendMessageToGemini } from '../services/geminiService';
import { useSimulation } from '../services/SimulationContext';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import {
    Zap,
    Target,
    TrendingUp,
    Clock,
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
        curDate.setDate(curDate.getDate() + 1);
    }
    return totalMinutes;
};

const StrategyCalibration: React.FC = () => {
    const { t } = useTranslation();
    const { scenarios, selectedScenarioId } = useSimulation();
    const [loading, setLoading] = useState(false);
    const [calibrating, setCalibrating] = useState(false);
    const [data, setData] = useState<any>(null);

    // Baseline results vs Simulated results
    const [baseline, setBaseline] = useState<APSResult | null>(null);
    const [simulation, setSimulation] = useState<APSResult | null>(null);

    // El escenario activo que hereda Calibración (de Simulación)
    const activeScenario = scenarios.find(s => s.id === selectedScenarioId) || scenarios[0] || null;
    const scenarioOverrides = activeScenario?.simulation_overrides || {};

    // Únicos parámetros editables en Calibración: la estrategia pura
    const [config, setConfig] = useState({
        scheduling_mode: 'TOC Optimized',
        bottleneck_management: 'Drum-Buffer-Rope',
        reprovision_policy: 'MRP Standard',
    });

    const [aiAnalysisHistory, setAiAnalysisHistory] = useState<Array<{ id: string, content: string, timestamp: string, config: any, result: APSResult | null, isError?: boolean }>>([]);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [rawSettings, setRawSettings] = useState<any>(null);

    // Re-calcular baseline cuando cambia el escenario activo
    useEffect(() => {
        if (activeScenario) fetchBaseData();
    }, [selectedScenarioId]);

    useEffect(() => {
        if (!selectedScenarioId && scenarios.length > 0) fetchBaseData();
    }, [scenarios]);

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

            if (currentSettings) setRawSettings(currentSettings);

            // Resolver el escenario activo para obtener sus simulation_overrides
            const scenario = scenarios.find(s => s.id === selectedScenarioId) || scenarios[0] || null;
            const scOverrides = scenario?.simulation_overrides || {};

            // Construir las máquinas simuladas: si el escenario tiene machine_counts,
            // expandir/contraer la lista de máquinas para reflejar la capacidad virtual.
            const realMachines: any[] = machines || [];
            let simulatedMachines = realMachines;
            if (scOverrides.machine_counts && Object.keys(scOverrides.machine_counts).length > 0) {
                const expanded: any[] = [];
                workCenters?.forEach((wc: any) => {
                    const wcMachines = realMachines.filter(m => m.work_center_id === wc.id);
                    const targetCount = scOverrides.machine_counts[wc.id] ?? wcMachines.length;
                    if (targetCount <= wcMachines.length) {
                        expanded.push(...wcMachines.slice(0, Math.max(1, targetCount)));
                    } else {
                        expanded.push(...wcMachines);
                        // Añadir máquinas virtuales clonando la primera del WC
                        const template = wcMachines[0];
                        if (template) {
                            for (let i = wcMachines.length; i < targetCount; i++) {
                                expanded.push({ ...template, id: `${template.id}-V${i}`, is_virtual: true });
                            }
                        }
                    }
                });
                simulatedMachines = expanded;
            }

            const baseData = {
                items: items || [],
                bom: bom || [],
                routings: routings || [],
                machines: simulatedMachines,  // ← máquinas del escenario activo
                workOrders: workOrders || [],
                erpPurchases: erpPurchases || [],
                existingOps: [],
                maintenancePlans: maintenancePlans || [],
                workCenters: workCenters || [],
                settings: { simulation_overrides: {} }
            };

            setData(baseData);

            // Baseline = escenario activo con su estrategia guardada en aps_settings
            // (hereda machine_counts, splits y overlap del escenario)
            const baselineSettings = {
                scheduling_mode: currentSettings?.scheduling_mode || 'TOC Optimized',
                bottleneck_management: currentSettings?.bottleneck_management || 'Drum-Buffer-Rope',
                reprovision_policy: currentSettings?.reprovision_policy || 'MRP Standard',
                overlap_enabled: scOverrides.overlap_enabled ?? currentSettings?.overlap_enabled ?? false,
                include_maintenance: scenario?.include_maintenance ?? true,
                default_buffer_days: currentSettings?.default_buffer_days || 2,
                planning_horizon_days: currentSettings?.planning_horizon_days || 90,
                simulation_overrides: {
                    overlap_enabled: scOverrides.overlap_enabled ?? false,
                    work_center_configs: scOverrides.work_center_configs || {},
                    infinite_capacity: currentSettings?.bottleneck_management === 'Infinite Capacity',
                }
            };

            const initial = apsAlgorithm.calculateAPS({ ...baseData, settings: baselineSettings });
            setBaseline(initial);
            setSimulation(initial);

            // Inicializar el config con la estrategia actual de la BD
            if (currentSettings) {
                setConfig({
                    scheduling_mode: currentSettings.scheduling_mode || 'TOC Optimized',
                    bottleneck_management: currentSettings.bottleneck_management || 'Drum-Buffer-Rope',
                    reprovision_policy: currentSettings.reprovision_policy || 'MRP Standard',
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
            const isInfiniteCapacity = config.bottleneck_management === 'Infinite Capacity';
            // Heredar TODOS los overrides del escenario activo
            const overrides = activeScenario?.simulation_overrides || {};

            const result = apsAlgorithm.calculateAPS({
                ...data, // ← data ya tiene las máquinas del escenario (simulatedMachines)
                settings: {
                    // ── Estrategia: lo único que cambia en Calibración ──
                    scheduling_mode: config.scheduling_mode,
                    bottleneck_management: config.bottleneck_management,
                    reprovision_policy: config.reprovision_policy,
                    // ── Del escenario: se hereda sin modificar ──
                    overlap_enabled: overrides.overlap_enabled ?? false,
                    include_maintenance: activeScenario?.include_maintenance ?? true,
                    default_buffer_days: rawSettings?.default_buffer_days || 2,
                    planning_horizon_days: rawSettings?.planning_horizon_days || 90,
                    simulation_overrides: {
                        infinite_capacity: isInfiniteCapacity,
                        overlap_enabled: overrides.overlap_enabled ?? false,
                        work_center_configs: overrides.work_center_configs || {},
                        // machine_counts ya está en data.machines (se expandieron en fetchBaseData)
                    }
                }
            });
            setSimulation(result);
            setCalibrating(false);
            generateAIAnalysis(result);
        }, 800);
    };

    const generateAIAnalysis = async (currentResult: APSResult, retryCount = 0, targetId?: string) => {
        setIsAnalyzing(true);
        const splitsActive = Object.entries(scenarioOverrides.work_center_configs || {})
            .filter(([_, c]: any) => c.enabled).map(([id]) => id).join(', ') || 'Ninguno';
        const machineCounts = Object.entries(scenarioOverrides.machine_counts || {})
            .map(([wc, n]) => `${wc}: ${n}`).join(', ') || 'Real (sin overrides)';
        try {
            const prompt = `Actúa como el Analista IA Logic.
            Este es un análisis HISTÓRICO. Comenta qué está cambiando con esta nueva PREDICCIÓN comparada con la situación base y las anteriores.

            ESCENARIO BASE (heredado de Simulación - NO cambia entre runs):
            - Escenario: "${activeScenario?.name || 'sin escenario'}"
            - Máquinas virtuales: ${machineCounts}
            - Splits activos: ${splitsActive}
            - Overlap: ${scenarioOverrides.overlap_enabled ? 'SÍ' : 'NO'}

            ESTRATEGIA PROBADA EN ESTA PREDICCIÓN:
            - Modalidad: ${config.scheduling_mode}
            - Restricciones: ${config.bottleneck_management}
            - Reposición: ${config.reprovision_policy}

            MÉTRICAS:
            - Base (estrategia guardada): OTDR ${baseline?.metrics?.onTimeDeliveryRate?.toFixed(1)}%, LeadTime ${baseline?.metrics?.avgLeadTime?.toFixed(1)}d.
            - Predicción (nueva estrategia): OTDR ${currentResult.metrics.onTimeDeliveryRate?.toFixed(1)}%, LeadTime ${currentResult.metrics.avgLeadTime?.toFixed(1)}d.

            Analiza el impacto del cambio de estrategia y sugiere el próximo paso técnico. Sé directo y usa Markdown.`;

            const analysis = await sendMessageToGemini(prompt, {
                config,
                baselineMetrics: baseline?.metrics,
                currentMetrics: currentResult.metrics,
                topDelays: currentResult.proposedWorkOrders.slice(0, 5)
            });

            if (targetId) {
                // Updating an existing error entry
                setAiAnalysisHistory(prev => prev.map(entry =>
                    entry.id === targetId ? { ...entry, content: analysis, isError: false } : entry
                ));
            } else {
                // Adding a new entry
                const newEntry = {
                    id: Math.random().toString(36).substr(2, 9),
                    content: analysis,
                    timestamp: new Date().toLocaleTimeString(),
                    config: { ...config },
                    result: currentResult,
                    isError: false
                };
                setAiAnalysisHistory(prev => [newEntry, ...prev]);
            }
        } catch (error) {
            console.error("AI Analysis failed:", error);
            if (retryCount < 1 && !targetId) { // Auto-retry only for new entries
                console.log(`Reintentando análisis (${retryCount + 1}/1)...`);
                setTimeout(() => generateAIAnalysis(currentResult, retryCount + 1), 2000);
            } else {
                const errorContent = "⚠️ **Error de conexión con la IA.** La predicción se calculó correctamente pero el análisis no pudo generarse.";

                if (targetId) {
                    setAiAnalysisHistory(prev => prev.map(entry =>
                        entry.id === targetId ? { ...entry, content: errorContent, isError: true } : entry
                    ));
                } else {
                    const errorEntry = {
                        id: 'error-' + Date.now(),
                        content: errorContent,
                        timestamp: new Date().toLocaleTimeString(),
                        config: { ...config },
                        result: currentResult,
                        isError: true
                    };
                    setAiAnalysisHistory(prev => [errorEntry, ...prev]);
                }
            }
        } finally {
            setIsAnalyzing(false);
        }
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
                                    // FIX 2: excluir máquinas inactivas del cálculo de capacidad
                                    const wcMachines = data.machines.filter((m: any) =>
                                        m.work_center_id === wc.id && m.is_active !== false
                                    );
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
                                        <p className="text-[10px] text-[var(--text-muted)] font-bold">AJUSTA LA ESTRATEGIA DE SCHEDULING</p>
                                    </div>
                                </div>

                                {/* Escenario heredado — read-only */}
                                {activeScenario && (
                                    <div className="bg-[var(--bg-main)] border border-[var(--border-color)] rounded-2xl p-4 space-y-2">
                                        <p className="text-[8px] font-black text-[var(--text-muted)] uppercase tracking-widest flex items-center gap-1.5">
                                            <Calendar size={10} /> Escenario Activo (heredado)
                                        </p>
                                        <p className="text-sm font-black text-indigo-400 truncate">{activeScenario.name}</p>
                                        <div className="flex flex-wrap gap-2 pt-1">
                                            {scenarioOverrides.overlap_enabled && (
                                                <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 text-[8px] font-black uppercase">Overlap ✓</span>
                                            )}
                                            {Object.values(scenarioOverrides.work_center_configs || {}).some((c: any) => c.enabled) && (
                                                <span className="px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 text-[8px] font-black uppercase">Splits ✓</span>
                                            )}
                                            {Object.keys(scenarioOverrides.machine_counts || {}).length > 0 && (
                                                <span className="px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 text-[8px] font-black uppercase">Máquinas Virtuales ✓</span>
                                            )}
                                        </div>
                                    </div>
                                )}

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
                                            <option value="Infinite Capacity">Capacidad Infinita (Sin restricciones)</option>
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

                                    {/* Nota informativa */}
                                    <div className="bg-indigo-500/5 border border-indigo-500/15 rounded-2xl p-4">
                                        <p className="text-[9px] font-bold text-indigo-400/80 uppercase leading-relaxed">
                                            Overlap, Splits y Capacidad se heredan del escenario activo.
                                            Para modificarlos, cambiá la configuración en la pantalla de Simulación.
                                        </p>
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

                        {/* Evolution & Analysis Panel */}
                        <div className="xl:col-span-8 flex flex-col gap-8">
                            {/* NEW: AI Analysis Frame */}
                            <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-[2.5rem] p-8 shadow-2xl relative overflow-hidden transition-all">
                                <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/5 blur-[80px] -mr-32 -mt-32" />
                                <div className="flex items-center gap-3 mb-6 relative z-10">
                                    <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-indigo-600 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-600/20">
                                        <span className="material-symbols-outlined text-white text-xl" translate="no">psychology</span>
                                    </div>
                                    <div>
                                        <h3 className="text-xl font-black uppercase tracking-tighter">Análisis del Analista IA</h3>
                                        <div className="flex items-center gap-1.5">
                                            <span className={`block size-1.5 rounded-full ${isAnalyzing ? 'bg-indigo-400 animate-pulse' : 'bg-emerald-500'} `}></span>
                                            <span className="text-[var(--text-muted)] text-[9px] font-black uppercase tracking-widest">{isAnalyzing ? 'Generando Insights...' : 'Análisis Estratégico'}</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="relative z-10 min-h-[100px]">
                                    {aiAnalysisHistory.length > 0 ? (
                                        <div className="flex flex-col gap-6 overflow-y-auto max-h-[600px] pr-4 custom-scrollbar">
                                            {aiAnalysisHistory.map((entry, idx) => (
                                                <div key={entry.id} className={`p-6 rounded-3xl border ${idx === 0 ? 'bg-indigo-600/10 border-indigo-500/30 ring-1 ring-indigo-500/20' : 'bg-[var(--bg-main)] border-[var(--border-color)] opacity-60'}`}>
                                                    <div className="flex justify-between items-center mb-4">
                                                        <span className="text-[9px] font-black uppercase px-3 py-1 bg-[var(--bg-sidebar)] rounded-full text-indigo-400 border border-indigo-500/20">
                                                            {idx === 0 ? 'Ejecución más reciente' : `Análisis previo #${aiAnalysisHistory.length - idx}`}
                                                        </span>
                                                        <span className="text-[10px] font-bold text-[var(--text-muted)]">{entry.timestamp}</span>
                                                    </div>
                                                    <div className="prose prose-invert prose-sm max-w-none text-[var(--text-main)]">
                                                        <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                                            {entry.content}
                                                        </ReactMarkdown>
                                                    </div>
                                                    {entry.isError && (
                                                        <button
                                                            onClick={() => entry.result && generateAIAnalysis(entry.result, 0, entry.id)}
                                                            className="mt-4 flex items-center gap-2 px-4 py-2 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all"
                                                        >
                                                            <RotateCcw size={12} /> Reintentar Análisis
                                                        </button>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="h-full flex flex-col items-center justify-center text-center py-10 opacity-30">
                                            <Cpu size={32} className="mb-4 text-indigo-500" />
                                            <p className="text-[10px] font-black uppercase tracking-widest">Lanza una predicción para obtener el análisis de la IA</p>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Impact Visualization Frame */}
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
                            </div>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
};

export default StrategyCalibration;
