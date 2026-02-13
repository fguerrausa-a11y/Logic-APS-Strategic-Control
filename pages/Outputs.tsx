
import React, { useState, useEffect } from 'react';
import { supabase } from '../services/supabaseClient';
import { apsAlgorithm } from '../services/apsAlgorithm';
import {
    FileText,
    Download,
    Calendar,
    Package,
    ShoppingCart,
    Activity,
    AlertTriangle,
    FileBarChart,
    X,
    RefreshCw,
    Search,
    CheckCircle2,
    Clock,
    ArrowRight,
    Layers,
    Zap,
    Tag,
    Eye
} from 'lucide-react';
import { useTranslation } from '../services/languageService';
import { useSimulation } from '../services/SimulationContext';
import { exportDetailedOpsToPDF } from '../utils/ganttUtils';

const OutputCard: React.FC<{
    title: string;
    description: string;
    icon: React.ReactNode;
    color: string;
    onClick: () => void;
    items: string[];
}> = ({ title, description, icon, color, onClick, items }) => {
    const { t } = useTranslation();
    return (
        <div
            onClick={onClick}
            className="group bg-[var(--bg-card)] border border-[var(--border-color)] rounded-[2.5rem] p-8 hover:border-indigo-500/50 transition-all cursor-pointer shadow-xl hover:shadow-indigo-500/10 flex flex-col h-full active:scale-[0.98]"
        >
            <div className={`p-4 ${color} bg-opacity-10 rounded-2xl w-fit mb-6 group-hover:scale-110 transition-transform`}>
                {React.isValidElement(icon) && React.cloneElement(icon as React.ReactElement<any>, { className: color.replace('bg-', 'text-') })}
            </div>
            <h3 className="text-xl font-black uppercase tracking-tighter mb-3">{title}</h3>
            <p className="text-[var(--text-muted)] text-xs font-medium leading-relaxed mb-6">
                {description}
            </p>
            <div className="flex-1 space-y-2 mb-8">
                {items.map((item, idx) => (
                    <div key={idx} className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] opacity-60">
                        <div className="w-1.5 h-1.5 rounded-full bg-indigo-500/40"></div>
                        {item}
                    </div>
                ))}
            </div>
            <div className="flex items-center justify-between pt-6 border-t border-[var(--border-color)]">
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-500">{t('view_real_report')}</span>
                <ArrowRight size={18} className="text-indigo-500 transform group-hover:translate-x-2 transition-transform" />
            </div>
        </div>
    );
};

const OutputsPage: React.FC = () => {
    const { t, language } = useTranslation();
    const { scenarios, selectedScenarioId } = useSimulation();
    const [processing, setProcessing] = useState(false);
    const [activeTab, setActiveTab] = useState<string | null>(null);

    // Data for reports
    const [reportData, setReportData] = useState<{
        ops: any[],
        pwos: any[],
        ppos: any[],
        items: any[],
        machines: any[],
        workCenters: any[],
        maintenance: any[],
        wos: any[],
        bom: any[]
    }>({ ops: [], pwos: [], ppos: [], items: [], machines: [], workCenters: [], maintenance: [], wos: [], bom: [] });

    useEffect(() => {
        if (selectedScenarioId) {
            loadReportData(selectedScenarioId);
        }
    }, [selectedScenarioId]);

    const loadReportData = async (id: string) => {
        setProcessing(true);
        try {
            const [
                { data: ops },
                { data: pwos },
                { data: ppos },
                { data: items },
                { data: machines },
                { data: workCenters },
                { data: maintenance },
                { data: wos },
                { data: bom }
            ] = await Promise.all([
                supabase.from('proposed_operations').select('*').eq('scenario_id', id).order('start_date', { ascending: true }),
                supabase.from('proposed_work_orders').select('*').eq('scenario_id', id),
                supabase.from('proposed_purchase_orders').select('*').eq('scenario_id', id),
                supabase.from('items').select('*'),
                supabase.from('machines').select('*'),
                supabase.from('work_centers').select('*'),
                supabase.from('maintenance_plans').select('*'),
                supabase.from('work_orders').select('*'),
                supabase.from('bom').select('*')
            ]);

            setReportData({
                ops: ops || [],
                pwos: pwos || [],
                ppos: ppos || [],
                items: items || [],
                machines: machines || [],
                workCenters: workCenters || [],
                maintenance: maintenance || [],
                wos: wos || [],
                bom: bom || []
            });
        } catch (e) {
            console.error(e);
        } finally {
            setProcessing(false);
        }
    };

    const getReportContent = () => {
        if (!activeTab) return null;

        switch (activeTab) {
            case 'mps':
                return (
                    <table className="w-full text-left">
                        <thead className="bg-indigo-600/10 text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] sticky top-0">
                            <tr>
                                <th className="px-8 py-5">{t('order_ref')}</th>
                                <th className="px-8 py-5 text-center">{t('status')}</th>
                                <th className="px-8 py-5">{t('product')}</th>
                                <th className="px-8 py-5">{t('start_date')}</th>
                                <th className="px-8 py-5">{t('promise_date_aps')}</th>
                                <th className="px-8 py-5 text-right">{t('qty')}</th>
                            </tr>
                        </thead>
                        <tbody className="text-xs font-bold divide-y divide-white/5">
                            {reportData.pwos.map((p, i) => {
                                const item = reportData.items.find(it => it.id === p.item_id);
                                const isFirm = p.status === 'firm';
                                return (
                                    <tr key={i} className="hover:bg-white/5 transition-colors">
                                        <td className="px-8 py-5">
                                            <span className={`font-black ${isFirm ? 'text-indigo-400' : 'text-amber-500'}`}>
                                                {p.work_order_id || 'SUG-MRP-' + (i + 1)}
                                            </span>
                                            <p className="text-[8px] opacity-40 uppercase tracking-widest mt-0.5">{p.action_type}</p>
                                        </td>
                                        <td className="px-8 py-5 text-center">
                                            <span className={`px-2 py-1 rounded-md text-[9px] font-black uppercase tracking-tighter ${isFirm ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20' : 'bg-amber-500/10 text-amber-500 border border-amber-500/20'
                                                }`}>
                                                {isFirm ? t('firm') : t('proposal')}
                                            </span>
                                        </td>
                                        <td className="px-8 py-5 text-[var(--text-main)] truncate max-w-[200px]">{item?.name || p.item_id}</td>
                                        <td className="px-8 py-5 text-[var(--text-muted)]">{new Date(p.start_date).toLocaleDateString(language === 'es' ? 'es-AR' : 'en-US')}</td>
                                        <td className="px-8 py-5 text-emerald-500 font-black">{new Date(p.end_date).toLocaleDateString(language === 'es' ? 'es-AR' : 'en-US')}</td>
                                        <td className="px-8 py-5 text-right font-black">{p.quantity}</td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                );
            case 'detailed':
                return (
                    <table className="w-full text-left">
                        <thead className="bg-emerald-600/10 text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] sticky top-0">
                            <tr>
                                <th className="px-8 py-5">{t('seq_column')}</th>
                                <th className="px-8 py-5">{t('order_machine')}</th>
                                <th className="px-8 py-5">{t('product')}</th>
                                <th className="px-8 py-5">{t('start_end_time')}</th>
                                <th className="px-8 py-5 text-center">{t('lock_column')}</th>
                            </tr>
                        </thead>
                        <tbody className="text-xs font-bold divide-y divide-white/5">
                            {reportData.ops.map((op, i) => {
                                const item = reportData.items.find(it => it.id === op.item_id);
                                const machine = reportData.machines.find(m => m.id === op.machine_id);
                                return (
                                    <tr key={i} className="hover:bg-white/5 transition-colors">
                                        <td className="px-8 py-5 text-emerald-500 font-black">S{op.operation_sequence}</td>
                                        <td className="px-8 py-5">
                                            <p className="text-[var(--text-main)] font-black">{op.work_order_id}</p>
                                            <p className="text-[10px] text-[var(--text-muted)] uppercase mt-0.5">{machine?.name}</p>
                                        </td>
                                        <td className="px-8 py-5 text-[var(--text-muted)]">{item?.name}</td>
                                        <td className="px-8 py-5">
                                            <div className="flex gap-2 items-center">
                                                <span className="text-emerald-500">{new Date(op.start_date).toLocaleTimeString(language === 'es' ? 'es-AR' : 'en-US', { hour: '2-digit', minute: '2-digit' })}</span>
                                                <ArrowRight size={10} className="opacity-30" />
                                                <span className="text-rose-500">{new Date(op.end_date).toLocaleTimeString(language === 'es' ? 'es-AR' : 'en-US', { hour: '2-digit', minute: '2-digit' })}</span>
                                            </div>
                                            <p className="text-[10px] opacity-40 mt-0.5">{new Date(op.start_date).toLocaleDateString(language === 'es' ? 'es-AR' : 'en-US')}</p>
                                        </td>
                                        <td className="px-8 py-5 text-center">
                                            {op.is_locked ? '🔒' : ''}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                );
            case 'materials':
                return (
                    <table className="w-full text-left">
                        <thead className="bg-amber-600/10 text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] sticky top-0">
                            <tr>
                                <th className="px-8 py-5">{t('item')} / {t('material')}</th>
                                <th className="px-8 py-5 text-center">{t('action')}</th>
                                <th className="px-8 py-5">{t('delivery_date')}</th>
                                <th className="px-8 py-5 text-right">{t('input_qty_req')}</th>
                                <th className="px-8 py-5 text-right">{t('min_lot_qty')}</th>
                            </tr>
                        </thead>
                        <tbody className="text-xs font-bold divide-y divide-white/5">
                            {reportData.ppos.map((p, i) => {
                                const item = reportData.items.find(it => it.id === p.item_id);
                                return (
                                    <tr key={i} className="hover:bg-white/5 transition-colors">
                                        <td className="px-8 py-5">
                                            <p className="text-amber-500 font-black">{p.item_id}</p>
                                            <p className="text-[10px] text-[var(--text-muted)] uppercase mt-0.5">{item?.name}</p>
                                        </td>
                                        <td className="px-8 py-5 text-center text-[9px] font-black uppercase text-amber-500 bg-amber-500/5 px-2 py-1 rounded-lg">
                                            {p.action_type || t('purchase')}
                                        </td>
                                        <td className="px-8 py-5 text-[var(--text-main)]">{new Date(p.delivery_date).toLocaleDateString(language === 'es' ? 'es-AR' : 'en-US')}</td>
                                        <td className="px-8 py-5 text-right font-black text-rose-500">{p.quantity}</td>
                                        <td className="px-8 py-5 text-right text-[var(--text-muted)]">{item?.min_purchase_qty || 0}</td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                );
            case 'dispatch':
                return (
                    <div className="space-y-8 p-8">
                        <h4 className="text-sm font-black uppercase tracking-widest text-blue-400 mb-6">{t('kitting_title')}</h4>
                        {reportData.workCenters.map(wc => {
                            const wcOps = reportData.ops.filter(o => o.work_center_id === wc.id);
                            if (wcOps.length === 0) return null;
                            return (
                                <div key={wc.id} className="bg-white/5 rounded-3xl overflow-hidden border border-white/10 mb-8">
                                    <div className="px-8 py-4 bg-blue-500/10 border-b border-white/10 flex justify-between items-center">
                                        <span className="text-xs font-black uppercase tracking-tighter text-blue-400">{wc.name}</span>
                                        <span className="text-[10px] font-bold opacity-50">{t('pending_ops', { count: wcOps.length })}</span>
                                    </div>
                                    <table className="w-full text-left text-xs">
                                        <thead>
                                            <tr className="border-b border-white/5 opacity-50 bg-black/20">
                                                <th className="px-8 py-3">{t('start')}</th>
                                                <th className="px-8 py-3">{t('order')}</th>
                                                <th className="px-8 py-3">{t('product')}</th>
                                                <th className="px-8 py-3">{t('kitting_components')}</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {wcOps.map((op, idx) => {
                                                const kit = reportData.bom.filter(b => b.parent_item_id === op.item_id);
                                                return (
                                                    <tr key={idx} className="border-b border-white/5 hover:bg-white/5">
                                                        <td className="px-8 py-4 font-mono text-blue-400">{new Date(op.start_date).toLocaleTimeString(language === 'es' ? 'es-AR' : 'en-US', { hour: '2-digit', minute: '2-digit' })}</td>
                                                        <td className="px-8 py-4 font-black">{op.work_order_id}</td>
                                                        <td className="px-8 py-4">{reportData.items.find(i => i.id === op.item_id)?.name}</td>
                                                        <td className="px-8 py-4">
                                                            <div className="flex flex-wrap gap-1">
                                                                {kit.map((k, ki) => (
                                                                    <span key={ki} className="px-2 py-0.5 bg-black/30 border border-white/10 rounded text-[8px] font-bold">
                                                                        {k.component_item_id} (x{k.quantity_required * op.quantity})
                                                                    </span>
                                                                ))}
                                                                {kit.length === 0 && <span className="opacity-30 italic">{t('no_components_italic')}</span>}
                                                            </div>
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            );
                        })}
                    </div>
                );
            case 'exceptions':
                const lateOrders = reportData.pwos.filter(p => {
                    const originalWO = reportData.wos.find(w => w.id === p.work_order_id);
                    if (!originalWO || !originalWO.due_date) return false;
                    return new Date(p.end_date).getTime() > new Date(originalWO.due_date).getTime() + 3600000;
                });
                return (
                    <div className="p-8 space-y-10">
                        <section>
                            <h4 className="text-sm font-black uppercase tracking-widest text-rose-500 mb-6 flex items-center gap-2">
                                <AlertTriangle size={18} /> {t('late_orders_title')}
                            </h4>
                            <div className="grid grid-cols-1 gap-4">
                                {lateOrders.map((l, i) => {
                                    const original = reportData.wos.find(w => w.id === l.work_order_id);
                                    const delayDays = Math.ceil((new Date(l.end_date).getTime() - new Date(original?.due_date).getTime()) / 86400000);
                                    return (
                                        <div key={i} className="bg-rose-500/5 border border-rose-500/20 p-6 rounded-[2rem] flex justify-between items-center">
                                            <div>
                                                <p className="text-sm font-black text-rose-400">{l.work_order_id}</p>
                                                <p className="text-[10px] text-white/40 uppercase mt-1">{t('promised_aps_dates', { promised: new Date(original?.due_date).toLocaleDateString(), aps: new Date(l.end_date).toLocaleDateString() })}</p>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-xl font-black text-rose-500">{t('days_delay', { days: delayDays })}</p>
                                                <p className="text-[8px] font-black uppercase text-rose-500/60">{t('estimated_delay')}</p>
                                            </div>
                                        </div>
                                    );
                                })}
                                {lateOrders.length === 0 && <p className="text-emerald-500 text-sm font-bold bg-emerald-500/10 p-4 rounded-xl text-center">{t('no_late_orders')}</p>}
                            </div>
                        </section>
                        <section>
                            <h4 className="text-sm font-black uppercase tracking-widest text-amber-500 mb-6 flex items-center gap-2">
                                <RefreshCw size={18} /> {t('bottlenecks_title')}
                            </h4>
                            <div className="grid grid-cols-2 gap-6">
                                {reportData.machines.map(m => {
                                    const mOps = reportData.ops.filter(o => o.machine_id === m.id);
                                    const totalMinutes = mOps.reduce((acc, o) => acc + (o.setup_time_minutes || 0) + (o.run_time_minutes || 0), 0);
                                    if (totalMinutes < 480) return null; // Solo mostrar si tiene más de 8hs de carga
                                    return (
                                        <div key={m.id} className="bg-amber-500/5 border border-amber-500/20 p-6 rounded-[2.5rem]">
                                            <div className="flex justify-between items-start mb-4">
                                                <span className="text-xs font-black uppercase text-amber-500">{m.name}</span>
                                                <Activity size={16} className="text-amber-500 opacity-50" />
                                            </div>
                                            <div className="h-2 bg-white/5 rounded-full mb-3">
                                                <div className="h-full bg-amber-500 rounded-full" style={{ width: `${Math.min(100, (totalMinutes / 1440) * 100)}%` }}></div>
                                            </div>
                                            <p className="text-[10px] font-bold text-white/50 uppercase tracking-widest">{t('projected_load', { hours: (totalMinutes / 60).toFixed(1) })}</p>
                                        </div>
                                    );
                                })}
                            </div>
                        </section>
                    </div>
                );
            case 'performance':
                const totOps = reportData.ops.length;
                const totMinutes = reportData.ops.reduce((acc, o) => acc + (o.setup_time_minutes || 0) + (o.run_time_minutes || 0), 0);
                const avgLeadTime = reportData.pwos.length > 0 ? (reportData.pwos.reduce((acc, p) => acc + (new Date(p.end_date).getTime() - new Date(p.start_date).getTime()), 0) / reportData.pwos.length / 86400000).toFixed(1) : 0;
                return (
                    <div className="p-12 space-y-12">
                        <div className="grid grid-cols-3 gap-8">
                            <div className="glass-panel p-8 rounded-[3rem] border border-white/5 flex flex-col items-center justify-center text-center">
                                <Clock size={32} className="text-indigo-500 mb-4" />
                                <p className="text-3xl font-black tracking-tighter">{(totMinutes / 60).toFixed(0)}h</p>
                                <p className="text-[10px] uppercase font-black tracking-[0.2em] text-white/40 mt-1">{t('total_prod_time')}</p>
                            </div>
                            <div className="glass-panel p-8 rounded-[3rem] border border-white/5 flex flex-col items-center justify-center text-center">
                                <Zap size={32} className="text-emerald-500 mb-4" />
                                <p className="text-3xl font-black tracking-tighter">{avgLeadTime}d</p>
                                <p className="text-[10px] uppercase font-black tracking-[0.2em] text-white/40 mt-1">{t('avg_lead_time_mfg')}</p>
                            </div>
                            <div className="glass-panel p-8 rounded-[3rem] border border-white/5 flex flex-col items-center justify-center text-center">
                                <Activity size={32} className="text-amber-500 mb-4" />
                                <p className="text-3xl font-black tracking-tighter">{totOps}</p>
                                <p className="text-[10px] uppercase font-black tracking-[0.2em] text-white/40 mt-1">{t('total_scheduled_ops')}</p>
                            </div>
                        </div>

                        <div className="space-y-6">
                            <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-indigo-500 border-b border-indigo-500/20 pb-2">{t('capacity_dist_plant')}</h4>
                            <div className="space-y-4">
                                {reportData.workCenters.map(wc => {
                                    const wcOps = reportData.ops.filter(o => o.work_center_id === wc.id);
                                    const wcMins = wcOps.reduce((acc, o) => acc + (o.setup_time_minutes || 0) + (o.run_time_minutes || 0), 0);
                                    const pct = Math.min(100, (wcMins / (wc.machine_count * 24 * 60)) * 100);
                                    return (
                                        <div key={wc.id} className="flex items-center gap-6">
                                            <span className="w-48 text-xs font-bold truncate opacity-80">{wc.name}</span>
                                            <div className="flex-1 h-1.5 bg-white/5 rounded-full relative overflow-hidden">
                                                <div className="absolute top-0 left-0 h-full bg-indigo-500 rounded-full" style={{ width: `${pct}%` }}></div>
                                            </div>
                                            <span className="w-12 text-xs font-black text-indigo-400">{pct.toFixed(1)}%</span>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                );
            default:
                return <div className="p-20 text-center opacity-30 text-xl font-black uppercase tracking-[0.5em]">{t('module_in_dev')}</div>;
        }
    };

    const outputCategories = [
        {
            id: 'mps',
            title: t('mps_report_title'),
            description: t('mps_report_desc'),
            icon: <Calendar size={24} />,
            color: 'bg-indigo-500',
            items: [t('promise_dates_atp_ctp'), t('suggested_reschedule'), t('mps_by_product')]
        },
        {
            id: 'detailed',
            title: t('detailed_prod_title'),
            description: t('detailed_prod_desc'),
            icon: <Layers size={24} />,
            color: 'bg-emerald-500',
            items: [t('resource_sequencing'), t('detailed_dispatch_list'), t('capacity_calendar')]
        },
        {
            id: 'materials',
            title: t('materials_supply_title'),
            description: t('materials_supply_desc'),
            icon: <ShoppingCart size={24} />,
            color: 'bg-amber-500',
            items: [t('purchase_needs'), t('mrp_by_scenario'), t('supply_alerts')]
        },
        {
            id: 'dispatch',
            title: t('dispatch_work_title'),
            description: t('dispatch_work_desc'),
            icon: <FileText size={24} />,
            color: 'bg-blue-500',
            items: [t('op_routing_sheet'), t('dispatch_list_by_wc'), t('kitting_prep')]
        },
        {
            id: 'exceptions',
            title: t('exceptions_alerts_title'),
            description: t('exceptions_alerts_desc'),
            icon: <AlertTriangle size={24} />,
            color: 'bg-rose-500',
            items: [t('delay_alerts'), t('bottleneck_identification'), t('supply_risks')]
        },
        {
            id: 'performance',
            title: t('performance_costs_title'),
            description: t('performance_costs_desc'),
            icon: <FileBarChart size={24} />,
            color: 'bg-purple-500',
            items: [t('oee_theoretical_util'), t('scenario_lead_times'), t('compliance_kpis')]
        }
    ];

    return (
        <div className="flex h-full overflow-hidden bg-[var(--bg-main)] text-[var(--text-main)] transition-colors">
            <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
                <header className="px-8 py-8 border-b border-[var(--border-color)] bg-[var(--bg-sidebar)] flex justify-between items-center shadow-sm z-10 shrink-0">
                    <div className="flex items-center gap-5">
                        <div className="p-4 bg-indigo-600/10 rounded-[1.5rem] text-indigo-500 border border-indigo-500/20 shadow-inner">
                            <FileText size={28} />
                        </div>
                        <div>
                            <h1 className="text-2xl font-black uppercase tracking-tighter leading-none">{t('outputs_reports_title')}</h1>
                            <div className="flex items-center gap-3 mt-2 text-[10px] text-[var(--text-muted)] font-black uppercase tracking-widest">
                                <span className="flex items-center gap-1.5"><Tag size={12} className="text-indigo-500" /> {t('industrial_plant')}</span>
                                <span className="w-1 h-3 bg-[var(--border-color)] rounded-full"></span>
                                <span>{t('data_export_hub')}</span>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => {
                                if (reportData.ops.length === 0) return alert(t('nothing_to_export'));
                                const csvRows = [
                                    [t('csv_ref'), t('csv_order'), t('csv_seq'), t('csv_start'), t('csv_end'), t('csv_machine'), t('csv_item')],
                                    ...reportData.ops.map(o => [
                                        o.id,
                                        o.work_order_id,
                                        o.operation_sequence,
                                        o.start_date,
                                        o.end_date,
                                        o.machine_id,
                                        o.item_id
                                    ])
                                ];
                                const csvContent = csvRows.map(e => e.join(",")).join("\n");
                                const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
                                const link = document.createElement("a");
                                link.href = URL.createObjectURL(blob);
                                link.download = `Full_APS_Output_${selectedScenarioId}.csv`;
                                link.click();
                            }}
                            className="bg-indigo-600 hover:bg-indigo-500 text-white px-8 py-4 rounded-[1.5rem] font-black uppercase text-[10px] tracking-widest shadow-xl flex items-center gap-3 active:scale-95 transition-all"
                        >
                            <Download size={16} /> {t('export_full_csv')}
                        </button>
                    </div>
                </header>

                <div className="flex-1 overflow-y-auto p-12 bg-grid-slate-900/[0.02]">
                    {processing && (
                        <div className="absolute inset-0 bg-[var(--bg-main)]/50 backdrop-blur-sm z-50 flex items-center justify-center">
                            <div className="flex flex-col items-center gap-4">
                                <RefreshCw size={40} className="text-indigo-500 animate-spin" />
                                <p className="text-xs font-black uppercase tracking-widest text-indigo-500">{t('processing_real_data')}</p>
                            </div>
                        </div>
                    )}

                    <div className="max-w-7xl mx-auto space-y-12">

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                            <div className="md:col-span-2 glass-panel p-10 rounded-[3rem] border border-indigo-500/10 relative overflow-hidden flex flex-col justify-center">
                                <div className="absolute top-0 right-0 bg-indigo-500/10 blur-[80px] w-64 h-64 rounded-full -translate-y-1/2 translate-x-1/2"></div>
                                <h2 className="text-3xl font-black uppercase tracking-tighter mb-4 relative z-10">{t('output_intelligence_title')}</h2>
                                <p className="text-sm text-[var(--text-muted)] font-medium leading-relaxed max-w-lg relative z-10">
                                    {t('output_intelligence_desc')}
                                </p>
                            </div>
                            <div className="bg-emerald-500/5 p-10 rounded-[3rem] border border-emerald-500/10 flex flex-col items-center justify-center text-center">
                                <div className="size-16 bg-emerald-500/10 rounded-2xl flex items-center justify-center text-emerald-500 mb-4">
                                    <Package size={32} />
                                </div>
                                <p className="text-4xl font-black tracking-tighter text-emerald-500">{reportData.ops.length}</p>
                                <p className="text-[10px] font-black uppercase tracking-widest text-emerald-500 mt-1">{t('scheduled_operations')}</p>
                                <p className="text-[10px] text-[var(--text-muted)] font-bold mt-4 uppercase">{t('in_selected_scenario')}</p>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                            {outputCategories.map((cat) => (
                                <OutputCard
                                    key={cat.id}
                                    {...cat}
                                    onClick={() => setActiveTab(cat.id)}
                                />
                            ))}
                        </div>
                    </div>
                </div>

                {activeTab && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-8 bg-[var(--bg-main)]/90 backdrop-blur-md animate-in fade-in duration-300 transition-all">
                        <div className="glass-panel w-full max-w-6xl h-[85vh] rounded-[3.5rem] overflow-hidden flex flex-col shadow-2xl border border-indigo-500/30">
                            <div className="p-10 border-b border-[var(--border-color)] bg-[var(--bg-sidebar)] flex justify-between items-center shrink-0">
                                <div className="flex items-center gap-6">
                                    <div className={`p-4 ${outputCategories.find(c => c.id === activeTab)?.color} bg-opacity-20 rounded-2xl text-indigo-500`}>
                                        {outputCategories.find(c => c.id === activeTab)?.icon}
                                    </div>
                                    <div>
                                        <h3 className="text-2xl font-black uppercase tracking-tighter">{outputCategories.find(c => c.id === activeTab)?.title}</h3>
                                        <div className="flex items-center gap-3 mt-1 text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest">
                                            <span className="flex items-center gap-1"><Eye size={12} /> {t('firm_data')}</span>
                                            <span className="w-1 h-3 bg-[var(--border-color)] rounded-full"></span>
                                            <span>{t('version')}: {scenarios.find(s => s.id === selectedScenarioId)?.name}</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-4">
                                    <button
                                        onClick={() => {
                                            if (activeTab === 'detailed') {
                                                const scenario = scenarios.find(s => s.id === selectedScenarioId);
                                                exportDetailedOpsToPDF(reportData.ops, reportData.items, reportData.machines, scenario?.name || t('simulation'));
                                            } else {
                                                const headers = activeTab === 'mps' ? "Orden,Producto,Inicio,Entrega,Cant" : "Insumo,Producto,Arribo,Cant";
                                                alert(`${t('simulating_download')} ${activeTab.toUpperCase()}...`);
                                            }
                                        }}
                                        className="bg-indigo-600 hover:bg-indigo-500 text-white px-8 py-4 rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-xl flex items-center gap-3"
                                    >
                                        <Download size={14} /> {t('download_pdf')}
                                    </button>
                                    <button
                                        onClick={() => setActiveTab(null)}
                                        className="p-3 text-[var(--text-muted)] hover:text-white transition-colors"
                                    ><X size={32} /></button>
                                </div>
                            </div>
                            <div className="flex-1 overflow-auto bg-grid-white/[0.02]">
                                {getReportContent()}
                                {reportData.ops.length === 0 && !processing && (
                                    <div className="flex flex-col items-center justify-center h-full opacity-30 p-20">
                                        <AlertTriangle size={80} strokeWidth={1} className="mb-6" />
                                        <p className="text-xl font-black uppercase tracking-[0.3em]">{t('no_data_scenario')}</p>
                                        <p className="text-xs font-bold mt-2">{t('no_records_cat_desc')}</p>
                                    </div>
                                )}
                            </div>
                            <div className="p-6 bg-[var(--bg-sidebar)] border-t border-[var(--border-color)] shrink-0 flex justify-between items-center text-[var(--text-muted)]">
                                <p className="text-[10px] font-black uppercase tracking-widest italic">{t('confidential_label')}</p>
                                <p className="text-[10px] font-black uppercase tracking-widest">{t('generated_at', { date: new Date().toLocaleString(language === 'es' ? 'es-AR' : 'en-US') })}</p>
                            </div>
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
};

export default OutputsPage;
