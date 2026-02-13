
import React, { useState, useEffect } from 'react';
import { useTranslation } from '../services/languageService';
import { supabase } from '../services/supabaseClient';
import Sidebar from '../components/Sidebar';
import {
    Database,
    Package,
    Settings,
    FileText,
    ShoppingCart,
    Search,
    RefreshCw,
    ChevronRight,
    ChevronDown,
    LayoutGrid,
    GitBranch,
    Timer,
    Cpu,
    AlertCircle,
    Plus,
    Minus,
    CheckCircle2
} from 'lucide-react';

// --- Modals for Drill Down ---

const ArticleMasterModal: React.FC<{ isOpen: boolean; onClose: () => void; article: any; onSave?: () => void }> = ({ isOpen, onClose, article, onSave }) => {
    const [minLot, setMinLot] = useState(article?.min_purchase_qty || 1);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (article) setMinLot(article.min_purchase_qty || 1);
    }, [article]);

    if (!isOpen || !article) return null;

    const handleSave = async () => {
        setSaving(true);
        try {
            const { error } = await supabase.from('items').update({ min_purchase_qty: minLot }).eq('id', article.id);
            if (error) throw error;
            if (onSave) onSave();
            onClose();
        } catch (e) { console.error(e); alert(t('error_saving')); }
        finally { setSaving(false); }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={onClose}>
            <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-[2.5rem] w-full max-w-2xl overflow-hidden shadow-2xl animate-in fade-in zoom-in duration-200" onClick={e => e.stopPropagation()}>
                <div className="p-8 border-b border-[var(--border-color)] flex justify-between items-center bg-[var(--bg-sidebar)]">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-indigo-500/10 rounded-2xl border border-indigo-500/20 text-indigo-500">
                            <Package size={24} />
                        </div>
                        <div>
                            <h3 className="text-xl font-black uppercase tracking-tighter text-[var(--text-main)]">{article.name}</h3>
                            <p className="text-[10px] text-[var(--text-muted)] font-black uppercase tracking-widest">{article.id}</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="text-[var(--text-muted)] hover:text-[var(--text-main)] transition-colors"><Minus size={24} className="rotate-45" /></button>
                </div>
                <div className="p-8 grid grid-cols-2 gap-8">
                    <div className="space-y-6">
                        <h4 className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest border-b border-[var(--border-color)] pb-2 flex items-center gap-2">
                            <FileText size={12} /> {t('planning_params')}
                        </h4>
                        <div className="space-y-4">
                            <div>
                                <label className="text-[9px] font-black text-[var(--text-muted)] uppercase tracking-widest mb-2 block">{t('item_moq')}</label>
                                <div className="flex items-center gap-3">
                                    <input
                                        type="number"
                                        value={minLot}
                                        onChange={e => setMinLot(Number(e.target.value))}
                                        className="flex-1 bg-[var(--bg-main)] border border-[var(--border-color)] rounded-xl px-4 py-3 text-sm font-bold text-indigo-500 outline-none focus:border-indigo-500"
                                    />
                                </div>
                                <p className="text-[8px] text-[var(--text-muted)] font-medium mt-2 leading-relaxed">{t('moq_desc')}</p>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div><p className="text-[9px] font-black text-[var(--text-muted)] uppercase tracking-widest mb-1">{t('safety_stock')}</p><p className="text-sm font-bold text-[var(--text-main)]">{article.safety_stock || 0}</p></div>
                                <div><p className="text-[9px] font-black text-[var(--text-muted)] uppercase tracking-widest mb-1">{t('lead_time')}</p><p className="text-sm font-bold text-[var(--text-main)]">{article.lead_time_days || 'N/D'}</p></div>
                            </div>
                        </div>
                    </div>
                    <div className="space-y-6">
                        <h4 className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest border-b border-[var(--border-color)] pb-2 flex items-center gap-2">
                            <ShoppingCart size={12} /> {t('stock_info')}
                        </h4>
                        <div className="space-y-4">
                            <div className="p-4 bg-[var(--bg-main)] border border-[var(--border-color)] rounded-2xl">
                                <p className="text-[9px] font-black text-[var(--text-muted)] uppercase tracking-widest mb-1">{t('current_stock')}</p>
                                <p className="text-2xl font-black text-emerald-500">{article.current_stock || 0} {article.uom || 'UN'}</p>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div><p className="text-[9px] font-black text-[var(--text-muted)] uppercase tracking-widest mb-1">{t('item_type')}</p><p className="text-sm font-bold text-[var(--text-main)] uppercase tracking-tight">{article.item_type || 'COMPRADO'}</p></div>
                                <div><p className="text-[9px] font-black text-[var(--text-muted)] uppercase tracking-widest mb-1">{t('unit_cost')}</p><p className="text-sm font-bold text-emerald-500">${article.unit_cost || '0.00'}</p></div>
                            </div>
                        </div>
                    </div>
                </div>
                <div className="p-8 bg-[var(--bg-sidebar)] border-t border-[var(--border-color)] flex justify-end gap-3">
                    <button onClick={onClose} className="px-6 py-3 rounded-xl border border-[var(--border-color)] text-xs font-black uppercase tracking-widest text-[var(--text-muted)] hover:bg-[var(--bg-main)]">{t('cancel')}</button>
                    <button onClick={handleSave} disabled={saving} className="bg-indigo-600 hover:bg-indigo-500 text-white px-8 py-3 rounded-xl font-black uppercase text-[10px] tracking-widest shadow-lg flex items-center gap-2">
                        {saving ? <RefreshCw className="animate-spin" size={14} /> : <CheckCircle2 size={14} />}
                        {saving ? t('saving') + '...' : t('save_changes')}
                    </button>
                </div>
            </div>
        </div>
    );
};

const MachineMasterModal: React.FC<{ isOpen: boolean; onClose: () => void; machine: any; shifts: any[]; onSave?: () => void }> = ({ isOpen, onClose, machine, shifts, onSave }) => {
    const [shiftId, setShiftId] = useState(machine?.shift_id || '');
    const [ignoreShifts, setIgnoreShifts] = useState(machine?.ignore_shifts || false);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (machine) {
            setShiftId(machine.shift_id || '');
            setIgnoreShifts(machine.ignore_shifts || false);
        }
    }, [machine]);

    if (!isOpen || !machine) return null;

    const handleSave = async () => {
        setSaving(true);
        try {
            const { error } = await supabase.from('machines').update({
                shift_id: shiftId || null,
                ignore_shifts: ignoreShifts
            }).eq('id', machine.id);
            if (error) throw error;
            if (onSave) onSave();
            onClose();
        } catch (e) { console.error(e); alert(t('error_saving')); }
        finally { setSaving(false); }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={onClose}>
            <div className="bg-[#0f172a] border border-slate-700 rounded-[2.5rem] w-full max-w-2xl overflow-hidden shadow-2xl animate-in fade-in zoom-in duration-200" onClick={e => e.stopPropagation()}>
                <div className="p-8 border-b border-slate-700 flex justify-between items-center bg-slate-900/50">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-emerald-500/10 rounded-2xl border border-emerald-500/20 text-emerald-400">
                            <Cpu size={24} />
                        </div>
                        <div>
                            <h3 className="text-xl font-black uppercase tracking-tighter text-white">{machine.name}</h3>
                            <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest">{machine.id}</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="text-slate-500 hover:text-white transition-colors"><Minus size={24} className="rotate-45" /></button>
                </div>
                <div className="p-8 space-y-8">
                    <div className="grid grid-cols-2 gap-8">
                        <div className="space-y-6">
                            <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest border-b border-slate-800 pb-2 flex items-center gap-2">
                                <Timer size={12} /> {t('availability_shifts')}
                            </h4>
                            <div className="space-y-4">
                                <div>
                                    <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-2 block">{t('assigned_shift')}</label>
                                    <select
                                        value={shiftId}
                                        onChange={e => setShiftId(e.target.value)}
                                        disabled={ignoreShifts}
                                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm font-bold text-emerald-400 outline-none focus:border-emerald-500 disabled:opacity-30 transition-all"
                                    >
                                        <option value="">{t('select_shift')}</option>
                                        {shifts.map(s => <option key={s.id} value={s.id}>{s.name} ({s.start_time}-{s.end_time})</option>)}
                                    </select>
                                </div>
                                <div className="flex items-center gap-3 p-4 bg-slate-950/50 border border-slate-800 rounded-2xl group cursor-pointer" onClick={() => setIgnoreShifts(!ignoreShifts)}>
                                    <div className={`w-10 h-5 rounded-full transition-colors relative ${ignoreShifts ? 'bg-emerald-500' : 'bg-slate-700'}`}>
                                        <div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all ${ignoreShifts ? 'left-6' : 'left-1'}`} />
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-black text-white uppercase tracking-tight">{t('free_from_shifts')}</p>
                                        <p className="text-[8px] text-slate-500 font-medium">{t('continuous_plan_desc')}</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="space-y-6">
                            <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest border-b border-slate-800 pb-2 flex items-center gap-2">
                                <Settings size={12} /> {t('technical_params')}
                            </h4>
                            <div className="grid grid-cols-1 gap-4">
                                <div className="p-4 bg-slate-950/50 border border-slate-800 rounded-2xl">
                                    <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">{t('work_center')}</p>
                                    <p className="text-sm font-bold text-white">{machine.work_center_id || 'N/A'}</p>
                                </div>
                                <div className="p-4 bg-slate-950/50 border border-slate-800 rounded-2xl">
                                    <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">{t('max_daily_capacity')}</p>
                                    <p className="text-sm font-bold text-emerald-500">{machine.max_capacity || '24'} {t('hours')}</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                <div className="p-8 bg-slate-900/50 border-t border-slate-800 flex justify-end gap-3">
                    <button onClick={onClose} className="px-6 py-3 rounded-xl border border-slate-800 text-xs font-black uppercase tracking-widest text-slate-500 hover:bg-slate-800">{t('cancel')}</button>
                    <button onClick={handleSave} disabled={saving} className="bg-emerald-600 hover:bg-emerald-500 text-white px-8 py-3 rounded-xl font-black uppercase text-[10px] tracking-widest shadow-lg flex items-center gap-2 transition-all active:scale-95">
                        {saving ? <RefreshCw className="animate-spin" size={14} /> : <CheckCircle2 size={14} />}
                        {saving ? t('saving') + '...' : t('confirm_changes')}
                    </button>
                </div>
            </div>
        </div>
    );
};

// --- Sub-Tabla para BOM ---
const BOMSubTable: React.FC<{ parentId: string, bom: any[], onItemClick: (id: string) => void }> = ({ parentId, bom, onItemClick }) => {
    const children = bom.filter(b => b.parent_item_id === parentId);
    return (
        <div className="bg-slate-950/40 p-4 border-l-4 border-indigo-500/50 m-2 rounded-r-xl">
            <h5 className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-3">{t('formula_components')}</h5>
            <table className="w-full text-xs">
                <thead>
                    <tr className="text-slate-500 border-b border-slate-800">
                        <th className="px-4 py-2 text-left">{t('component')}</th>
                        <th className="px-4 py-2 text-right">{t('required_qty')}</th>
                    </tr>
                </thead>
                <tbody>
                    {children.map((c, i) => (
                        <tr key={i} className="border-b border-slate-800/30 hover:bg-white/5 transition-colors cursor-pointer" onClick={() => onItemClick(c.component_item_id)}>
                            <td className="px-4 py-2 text-slate-300 font-medium flex items-center gap-2">
                                <Package size={12} className="text-indigo-500" />
                                <span className="underline decoration-slate-700 underline-offset-4 group-hover:decoration-indigo-500">{c.component_item?.name || c.component_item_id}</span>
                            </td>
                            <td className="px-4 py-2 text-right text-indigo-400 font-bold">{c.quantity_required}</td>
                        </tr>
                    ))}
                    {children.length === 0 && <tr><td colSpan={2} className="px-4 py-4 text-center text-slate-600 italic">{t('no_components')}</td></tr>}
                </tbody>
            </table>
        </div>
    );
};

// --- Sub-Tabla DE "Dónde se Usa" (Where Used) ---
const WhereUsedSubTable: React.FC<{ itemId: string, bom: any[], items: any[], onItemClick: (id: string) => void }> = ({ itemId, bom, items, onItemClick }) => {
    // Buscar en qué BOMs aparece este item como componente
    const usages = bom.filter(b => b.component_item_id === itemId);

    return (
        <div className="bg-slate-950/40 p-4 border-l-4 border-purple-500/50 m-2 rounded-r-xl">
            <h5 className="text-[10px] font-black text-purple-400 uppercase tracking-widest mb-3">{t('where_used')}</h5>
            <table className="w-full text-xs">
                <thead>
                    <tr className="text-slate-500 border-b border-slate-800">
                        <th className="px-4 py-2 text-left">{t('parent_product')}</th>
                        <th className="px-4 py-2 text-right">{t('qty_in_formula')}</th>
                    </tr>
                </thead>
                <tbody>
                    {usages.map((u, i) => {
                        const parent = items.find(it => it.id === u.parent_item_id);
                        return (
                            <tr key={i} className="border-b border-slate-800/30 hover:bg-white/5 transition-colors cursor-pointer" onClick={() => onItemClick(u.parent_item_id)}>
                                <td className="px-4 py-2 text-slate-300 font-medium flex items-center gap-2">
                                    <GitBranch size={12} className="text-purple-500" />
                                    <span className="underline decoration-slate-700 underline-offset-4 group-hover:decoration-purple-500">{parent?.name || u.parent_item_id}</span>
                                </td>
                                <td className="px-4 py-2 text-right text-purple-400 font-bold">{u.quantity_required}</td>
                            </tr>
                        );
                    })}
                    {usages.length === 0 && <tr><td colSpan={2} className="px-4 py-4 text-center text-slate-600 italic">{t('not_in_any_formula')}</td></tr>}
                </tbody>
            </table>
        </div>
    );
};

// --- Sub-Tabla para Máquinas ---
const MachineSubTable: React.FC<{ wcId: string, machines: any[], onMachineClick: (m: any) => void }> = ({ wcId, machines, onMachineClick }) => {
    const wcMachines = machines.filter(m => m.work_center_id === wcId);
    return (
        <div className="bg-slate-950/40 p-4 border-l-4 border-emerald-500/50 m-2 rounded-r-xl">
            <h5 className="text-[10px] font-black text-emerald-400 uppercase tracking-widest mb-3">{t('integrated_machinery')}</h5>
            <table className="w-full text-xs">
                <thead>
                    <tr className="text-slate-500 border-b border-slate-800">
                        <th className="px-4 py-2 text-left">{t('machine_id')}</th>
                        <th className="px-4 py-2 text-left">{t('name_denomination')}</th>
                        <th className="px-4 py-2 text-center">{t('status')}</th>
                    </tr>
                </thead>
                <tbody>
                    {wcMachines.map((m, i) => (
                        <tr key={i} className="border-b border-slate-800/30 hover:bg-white/5 transition-colors cursor-pointer" onClick={() => onMachineClick(m)}>
                            <td className="px-4 py-2 text-slate-500 font-mono">{m.id}</td>
                            <td className="px-4 py-2 text-slate-300 font-bold flex items-center gap-2">
                                <Settings size={12} className="text-emerald-500" />
                                <span className="underline decoration-slate-700 underline-offset-4">{m.name}</span>
                            </td>
                            <td className="px-4 py-2 text-center">
                                <span className="bg-emerald-500/10 text-emerald-500 px-2 py-0.5 rounded-md text-[9px] font-black uppercase">{t('active')}</span>
                            </td>
                        </tr>
                    ))}
                    {wcMachines.length === 0 && <tr><td colSpan={3} className="px-4 py-4 text-center text-slate-600 italic">{t('no_machines_assigned')}</td></tr>}
                </tbody>
            </table>
        </div>
    );
};

// --- Sub-Tabla para Detalle de Pedido (Explosión) ---
const OrderDetailsSubTable: React.FC<{ order: any, bom: any[], routings: any[], onItemClick: (id: string) => void }> = ({ order, bom, routings, onItemClick }) => {
    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 m-2">
            <div className="bg-slate-950/40 p-4 border-l-4 border-indigo-500/50 rounded-r-xl">
                <h5 className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-3">{t('material_explosion')}</h5>
                <BOMSubTable parentId={order.item_id} bom={bom} onItemClick={onItemClick} />
            </div>
            <div className="bg-slate-950/40 p-4 border-l-4 border-amber-500/50 rounded-r-xl">
                <h5 className="text-[10px] font-black text-amber-400 uppercase tracking-widest mb-3">{t('product_routing')}</h5>
                <RoutingSubTable itemId={order.item_id} routings={routings} />
            </div>
        </div>
    );
};

// --- Sub-Tabla para Detalle de Turno ---
const ShiftDetailsSubTable: React.FC<{ shiftId: string, machines: any[], onMachineClick: (m: any) => void }> = ({ shiftId, machines, onMachineClick }) => {
    const shiftMachines = machines.filter(m => m.shift_id === shiftId);
    return (
        <div className="bg-slate-950/40 p-4 border-l-4 border-cyan-500/50 m-2 rounded-r-xl">
            <h5 className="text-[10px] font-black text-cyan-400 uppercase tracking-widest mb-3">{t('machines_with_shift')}</h5>
            <div className="flex flex-wrap gap-2">
                {shiftMachines.map(m => (
                    <div
                        key={m.id}
                        className="flex items-center gap-2 bg-slate-900 border border-slate-700 px-3 py-2 rounded-xl text-xs text-slate-300 cursor-pointer hover:border-cyan-500 hover:text-white transition-all"
                        onClick={() => onMachineClick(m)}
                    >
                        <Cpu size={14} className="text-cyan-500" />{m.name}
                    </div>
                ))}
                {shiftMachines.length === 0 && <p className="text-slate-600 italic text-xs">{t('no_machines_this_shift')}</p>}
            </div>
        </div>
    );
};

// --- Sub-Tabla para Detalle de Mantenimiento ---
const MaintenanceDetailsSubTable: React.FC<{ plan: any, machines: any[], onMachineClick: (m: any) => void }> = ({ plan, machines, onMachineClick }) => {
    const machine = machines.find(m => m.id === plan.machine_id);
    return (
        <div className="bg-slate-950/40 p-6 border-l-4 border-rose-500/50 m-2 rounded-r-xl">
            <h5 className="text-[10px] font-black text-rose-400 uppercase tracking-widest mb-4">{t('maint_plan_detail')}</h5>
            <div className="flex items-start gap-8">
                <div onClick={() => machine && onMachineClick(machine)} className="flex items-center gap-3 bg-slate-900 border border-slate-700 p-4 rounded-2xl cursor-pointer hover:border-rose-500/50 transition-all">
                    <div className="p-2 bg-rose-500/10 rounded-lg text-rose-500"><Cpu size={20} /></div>
                    <div>
                        <p className="text-[10px] text-slate-500 font-bold uppercase">{t('affects_to')}</p>
                        <p className="text-sm font-black text-slate-200">{machine?.name || plan.machine_id}</p>
                    </div>
                </div>
                <div className="flex-1 space-y-2">
                    <p className="text-[10px] text-slate-500 font-bold uppercase">{t('work_description')}</p>
                    <p className="text-sm text-slate-300 bg-black/20 p-4 rounded-xl border border-white/5">{plan.description || t('no_tech_desc')}</p>
                </div>
            </div>
        </div>
    );
};

// --- Sub-Tabla para Operaciones (Ruteo) ---
const RoutingSubTable: React.FC<{ itemId: string, routings: any[] }> = ({ itemId, routings }) => {
    const ops = routings.filter(r => r.item_id === itemId).sort((a, b) => a.operation_sequence - b.operation_sequence);
    return (
        <div className="bg-slate-950/40 p-4 border-l-4 border-amber-500/50 m-2 rounded-r-xl">
            <h5 className="text-[10px] font-black text-amber-400 uppercase tracking-widest mb-3">{t('op_sequence_title')}</h5>
            <table className="w-full text-xs">
                <thead>
                    <tr className="text-slate-500 border-b border-slate-800">
                        <th className="px-4 py-2 text-left w-16">{t('step')}</th>
                        <th className="px-4 py-2 text-left">{t('process_description')}</th>
                        <th className="px-4 py-2 text-left">{t('work_center')}</th>
                        <th className="px-4 py-2 text-right">{t('setup_time')}</th>
                        <th className="px-4 py-2 text-right">{t('run_time')}</th>
                    </tr>
                </thead>
                <tbody>
                    {ops.map((o, i) => (
                        <tr key={i} className="border-b border-slate-800/30">
                            <td className="px-4 py-2 text-amber-500 font-black">#{o.operation_sequence}</td>
                            <td className="px-4 py-2 text-slate-300">{o.operation_description}</td>
                            <td className="px-4 py-2 text-slate-400 font-bold">{o.work_center?.name || o.work_center_id}</td>
                            <td className="px-4 py-2 text-right text-slate-500 italic">{o.setup_time_minutes}</td>
                            <td className="px-4 py-2 text-right text-indigo-400 font-bold">{o.run_time_minutes_per_unit}</td>
                        </tr>
                    ))}
                    {ops.length === 0 && <tr><td colSpan={5} className="px-4 py-4 text-center text-slate-600 italic">{t('no_routing_ops')}</td></tr>}
                </tbody>
            </table>
        </div>
    );
};

const BOMTree: React.FC<{ items: any[], bom: any[], rootId: string, depth?: number }> = ({ items, bom, rootId, depth = 0 }) => {
    const parent = items.find(i => i.id === rootId);
    const children = bom.filter(b => b.parent_item_id === rootId);
    const [isOpen, setIsOpen] = useState(true);

    if (!parent) return null;

    return (
        <div className={`ml-${depth * 4} border-l border-slate-700/50 pl-4 py-2`}>
            <div
                className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${depth === 0 ? 'bg-indigo-500/10 border-indigo-500/30' : 'bg-slate-800/30 border-slate-700/50'}`}
                onClick={() => setIsOpen(!isOpen)}
            >
                {children.length > 0 ? (isOpen ? <ChevronDown size={14} className="text-slate-500" /> : <ChevronRight size={14} className="text-slate-500" />) : <div className="w-[14px]" />}
                <Package size={16} className={depth === 0 ? 'text-indigo-400' : 'text-slate-400'} />
                <div>
                    <p className="text-sm font-bold text-slate-200">{parent.name}</p>
                    <p className="text-[10px] text-slate-500 uppercase font-bold tracking-widest">{rootId}</p>
                </div>
            </div>
            {isOpen && children.length > 0 && (
                <div className="mt-2 space-y-2">
                    {children.map(child => (
                        <div key={child.id} className="relative">
                            <div className="absolute top-4 -left-4 w-4 h-px bg-slate-700/50" />
                            <div className="flex items-center gap-2 mb-1 ml-4 py-1 px-2 bg-slate-800/20 rounded-lg w-fit border border-slate-700/30">
                                <span className="text-[10px] font-bold text-indigo-400">x{child.quantity_required}</span>
                            </div>
                            <BOMTree items={items} bom={bom} rootId={child.component_item_id} depth={depth + 1} />
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

const RoutingFlow: React.FC<{ items: any[], routings: any[], workCenters: any[], machines: any[] }> = ({ items, routings, workCenters, machines }) => {
    const productsWithRoutings = items.filter(i => routings.some(r => r.item_id === i.id));

    return (
        <div className="space-y-12 p-4">
            {productsWithRoutings.map(prod => (
                <div key={prod.id} className="space-y-6">
                    <div className="flex items-center gap-3 pb-4 border-b border-slate-800">
                        <div className="p-2 bg-indigo-500/10 rounded-lg text-indigo-400">
                            <Package size={20} />
                        </div>
                        <h3 className="text-lg font-bold text-white">{prod.name} <span className="text-slate-600 font-normal text-sm ml-2">{prod.id}</span></h3>
                    </div>

                    <div className="flex flex-wrap items-center gap-4">
                        {routings
                            .filter(r => r.item_id === prod.id)
                            .sort((a, b) => a.operation_sequence - b.operation_sequence)
                            .map((op, idx, arr) => {
                                const wc = workCenters.find(w => w.id === op.work_center_id);
                                const wcMachines = machines.filter(m => m.work_center_id === op.work_center_id);
                                return (
                                    <React.Fragment key={op.id}>
                                        <div className="relative group">
                                            <div className="bg-slate-800 border border-slate-700 p-4 rounded-2xl w-64 shadow-xl group-hover:border-indigo-500/50 transition-all">
                                                <div className="flex items-center justify-between mb-3 text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                                                    <span>OP {op.operation_sequence}</span>
                                                    <Timer size={14} className="text-indigo-400" />
                                                </div>
                                                <p className="text-sm font-bold text-slate-200 mb-4 h-10 line-clamp-2">{op.operation_description}</p>

                                                <div className="space-y-2 border-t border-slate-700/50 pt-3">
                                                    <div className="flex items-center gap-2 text-xs text-slate-400">
                                                        <Settings size={14} />
                                                        <span className="font-bold">{wc?.name || 'WC?'}</span>
                                                    </div>
                                                    <div className="flex flex-wrap gap-1 mt-2">
                                                        {wcMachines.map(m => (
                                                            <div key={m.id} className="size-6 bg-slate-900 border border-slate-700 rounded flex items-center justify-center text-indigo-400">
                                                                <Cpu size={12} />
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                        {idx < arr.length - 1 && <ChevronRight size={24} className="text-slate-700 animate-pulse" />}
                                    </React.Fragment>
                                );
                            })}
                    </div>
                </div>
            ))}
        </div>
    );
};

// --- Main Explorer ---

const DataExplorer: React.FC = () => {
    const [viewMode, setViewMode] = useState<'table' | 'visual'>('table');
    const [activeTab, setActiveTab] = useState<'inputs' | 'outputs'>('inputs');
    const { t } = useTranslation();
    const [subTab, setSubTab] = useState('items');
    const [data, setData] = useState<any[]>([]);
    const [allData, setAllData] = useState<{ items: any[], bom: any[], workCenters: any[], machines: any[], routings: any[], shifts: any[], scenarios: any[] }>({
        items: [], bom: [], workCenters: [], machines: [], routings: [], shifts: [], scenarios: []
    });
    const [selectedScenarioId, setSelectedScenarioId] = useState<string>('');
    const [resultsLoaded, setResultsLoaded] = useState(false);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [errorMsg, setErrorMsg] = useState<string | null>(null);
    const [expandedRows, setExpandedRows] = useState<Record<string, boolean>>({});

    const tabs = {
        inputs: [
            { id: 'items', label: t('items_tab'), icon: Package, table: 'items' },
            { id: 'work_orders', label: t('demand_tab'), icon: FileText, table: 'work_orders' },
            { id: 'erp_ppo', label: t('erp_purchases_tab'), icon: ShoppingCart, table: 'erp_purchase_orders' },
            { id: 'bom', label: t('structure_bom_tab'), icon: GitBranch, table: 'items', pivot: true },
            { id: 'work_centers', label: t('plants_equipment_tab'), icon: Settings, table: 'work_centers' },
            { id: 'routings', label: t('flows_routings_tab'), icon: 'items' },
            { id: 'shifts', label: t('shifts_tab'), icon: Timer, table: 'shifts' },
            { id: 'maintenance_plans', label: t('maintenance_tab'), icon: AlertCircle, table: 'maintenance_plans' },
        ],
        outputs: [
            { id: 'pwo', label: t('pwo_proposals_tab'), icon: FileText, table: 'proposed_work_orders' },
            { id: 'ppo', label: t('ppo_proposals_tab'), icon: ShoppingCart, table: 'proposed_purchase_orders' },
        ]
    };

    useEffect(() => {
        fetchAll();
    }, []);

    useEffect(() => {
        if (activeTab === 'outputs' && !resultsLoaded) {
            setData([]);
        } else {
            fetchData();
        }
        setExpandedRows({});
    }, [subTab, activeTab, resultsLoaded]);

    useEffect(() => {
        if (activeTab === 'outputs' && !resultsLoaded) {
            setData([]);
        }
    }, [activeTab]);

    const fetchAll = async () => {
        const [items, bom, wcs, machines, routings, shifts, scenarios] = await Promise.all([
            supabase.from('items').select('*'),
            supabase.from('bom').select('*'),
            supabase.from('work_centers').select('*'),
            supabase.from('machines').select('*'),
            supabase.from('routings').select(`*, work_center:work_centers(name)`),
            supabase.from('shifts').select('*'),
            supabase.from('scenarios').select('*').order('created_at', { ascending: false })
        ]);
        setAllData({
            items: items.data || [],
            bom: bom.data || [],
            workCenters: wcs.data || [],
            machines: machines.data || [],
            routings: routings.data || [],
            shifts: shifts.data || [],
            scenarios: scenarios.data || []
        });
        if (scenarios.data?.length > 0) setSelectedScenarioId(scenarios.data[0].id);
    };

    const fetchData = async () => {
        setLoading(true);
        setErrorMsg(null);

        // Determinamos qué tabla base usar
        let tableName = 'items';
        if (subTab === 'work_centers') tableName = 'work_centers';
        if (subTab === 'work_orders') tableName = 'work_orders';
        if (subTab === 'shifts') tableName = 'shifts';
        if (subTab === 'maintenance_plans') tableName = 'maintenance_plans';
        if (subTab === 'pwo') tableName = 'proposed_work_orders';
        if (subTab === 'ppo') tableName = 'proposed_purchase_orders';
        if (subTab === 'erp_ppo') tableName = 'erp_purchase_orders';

        try {
            let query = supabase.from(tableName).select('*');

            // Si es un tab de salida, unimos con items para el nombre y filtramos por escenario
            if (subTab === 'pwo' || subTab === 'ppo' || subTab === 'erp_ppo') {
                query = supabase.from(tableName).select(`*, item:items(name)`);
                if (selectedScenarioId && (subTab === 'pwo' || subTab === 'ppo')) {
                    query = query.eq('scenario_id', selectedScenarioId);
                }
            }

            const { data: result, error } = await query;
            if (error) throw error;

            const flattened = (result || []).map((row: any) => {
                const newRow = { ...row };
                if (row.item) newRow.item = row.item.name;
                return newRow;
            });
            setData(flattened);
        } catch (err: any) {
            setErrorMsg(err.message);
        }
        setLoading(false);
    };

    const toggleRow = (id: string) => {
        setExpandedRows(prev => ({ ...prev, [id]: !prev[id] }));
    };

    const [isSyncing, setIsSyncing] = useState(false);
    const handleToggleFixed = async (rowId: string, currentFixed: boolean) => {
        try {
            const { error } = await supabase
                .from('erp_purchase_orders')
                .update({ is_fixed: !currentFixed })
                .eq('id', rowId);
            if (error) throw error;
            await fetchData();
        } catch (e) {
            console.error(e);
            alert(t('error_saving'));
        }
    };

    const filteredData = data.filter(row =>
        Object.values(row).some(val => String(val).toLowerCase().includes(searchTerm.toLowerCase()))
    );

    const getColumns = () => {
        if (data.length === 0) return [];
        return Object.keys(data[0]).filter(c => !['id', 'scenario_id', 'created_at'].includes(c));
    };

    const [selectedArticle, setSelectedArticle] = useState<any | null>(null);
    const [selectedMachine, setSelectedMachine] = useState<any | null>(null);

    const handleArticleClick = (idOrName: string) => {
        // Try to find by ID first, then name
        const article = allData.items.find(i => i.id === idOrName || i.name === idOrName);
        if (article) {
            setSelectedArticle(article);
        } else {
            // Fallback if we only have an ID but it's not in the loaded list (unlikely if strictly referential)
            // We could fetch it here if needed, but for now let's assume it's in allData
            console.warn("Article not found:", idOrName);
        }
    };

    const handleMachineClick = (machine: any) => {
        setSelectedMachine(machine);
    };

    const handleMainRowClick = (row: any, col: string) => {
        if (subTab === 'items' && col === 'name') {
            handleArticleClick(row.id);
        } else if (subTab === 'work_centers' && col === 'machines') {
            // Logic handled in sub-table usually, but if there's a machine column...
        }
    };

    return (
        <div className="flex h-screen overflow-hidden bg-background-dark font-body">
            <Sidebar />
            <main className="flex-1 flex flex-col h-full overflow-hidden relative">
                {/* Fixed Header section */}
                <div className="p-6 lg:p-8 pb-4 shrink-0 bg-background-dark/80 backdrop-blur-md z-20">
                    <div className="max-w-[1400px] mx-auto">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-slate-900/40 p-6 rounded-3xl border border-slate-800 shadow-2xl">
                            <div className="flex items-center gap-5">
                                <div className="p-3 bg-indigo-500/20 rounded-2xl border border-indigo-500/30 text-indigo-400">
                                    <Database size={32} />
                                </div>
                                <div className="min-w-0">
                                    <h1 className="text-3xl font-bold text-white tracking-tight font-display truncate">{t('plant_engineering')}</h1>
                                    <p className="text-slate-400 text-sm truncate">{t('audit_desc')}</p>
                                    {allData.machines.some(m => !m.shift_id && !m.ignore_shifts) && (
                                        <div className="mt-2 flex items-center gap-2 bg-rose-500/10 border border-rose-500/20 px-3 py-1.5 rounded-xl text-[10px] font-bold text-rose-400 animate-pulse w-fit">
                                            <AlertCircle size={14} />
                                            <span>{t('no_shift_alert')}</span>
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="flex items-center gap-4 shrink-0 min-w-[340px] justify-end">
                                <div className="flex bg-slate-950/50 p-1.5 rounded-2xl border border-slate-800 shadow-inner">
                                    <button onClick={() => setViewMode('visual')} className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all ${viewMode === 'visual' ? 'bg-indigo-600 text-white shadow-xl' : 'text-slate-500 hover:text-slate-300'}`}><GitBranch size={16} /> {t('visual')}</button>
                                    <button onClick={() => setViewMode('table')} className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all ${viewMode === 'table' ? 'bg-indigo-600 text-white shadow-xl' : 'text-slate-500 hover:text-slate-300'}`}><LayoutGrid size={16} /> {t('tab_tables')}</button>
                                </div>
                                <div className="flex bg-slate-950/50 p-1.5 rounded-2xl border border-slate-800 shadow-inner h-fit">
                                    <button onClick={() => { setActiveTab('inputs'); setSubTab('items'); }} className={`px-5 py-2 rounded-xl transition-all text-[10px] font-black uppercase tracking-[0.1em] ${activeTab === 'inputs' ? 'bg-slate-800 text-indigo-400 border border-slate-700 shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}>{t('source')}</button>
                                    <button onClick={() => { setActiveTab('outputs'); setSubTab('pwo'); }} className={`px-5 py-2 rounded-xl transition-all text-[10px] font-black uppercase tracking-[0.1em] ${activeTab === 'outputs' ? 'bg-slate-800 text-indigo-400 border border-slate-700 shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}>{t('results')}</button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Scrollable Content */}
                <div className="flex-1 overflow-y-auto p-6 lg:p-8 pt-0">
                    <div className="max-w-[1400px] mx-auto space-y-6">

                        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none">
                            {tabs[activeTab].map((t) => (
                                <button key={t.id} onClick={() => setSubTab(t.id)} className={`flex items-center gap-3 px-5 py-3 rounded-2xl border transition-all text-sm font-bold ${subTab === t.id ? 'bg-slate-800 border-indigo-500 text-indigo-400 shadow-2xl' : 'border-slate-800/50 bg-slate-900/30 text-slate-500 hover:border-slate-700'}`}>
                                    <Plus size={14} className={subTab === t.id ? 'text-indigo-500' : 'text-slate-700'} />
                                    <span>{t.label}</span>
                                </button>
                            ))}
                        </div>

                        <div className="bg-slate-900/50 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl">
                            {loading ? (
                                <div className="flex flex-col items-center justify-center py-40 gap-6"><div className="w-12 h-12 border-4 border-indigo-500/10 border-t-indigo-500 rounded-full animate-spin"></div><p className="text-slate-500 text-sm font-bold uppercase tracking-widest animate-pulse">{t('syncing_engineering')}</p></div>
                            ) : errorMsg ? (
                                <div className="text-center py-32"><AlertCircle size={48} className="mx-auto mb-4 text-red-500 opacity-50" /><p className="text-slate-300 font-bold">{errorMsg}</p></div>
                            ) : viewMode === 'table' ? (
                                <div className="overflow-x-auto">
                                    <div className="p-4 border-b border-slate-800 flex justify-between items-center bg-slate-900/20">
                                        <div className="relative w-full md:w-96">
                                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-600" size={16} />
                                            <input type="text" placeholder={t('quick_search')} className="w-full bg-slate-950/50 border border-slate-800 rounded-xl py-2 pl-10 pr-4 text-white text-sm outline-none focus:border-indigo-500/50 transition-all" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
                                        </div>
                                    </div>
                                    <table className="w-full text-left">
                                        <thead>
                                            <tr className="bg-slate-950/20 border-b border-slate-800">
                                                <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest w-12 text-center">+/-</th>
                                                {getColumns().map(col => (
                                                    <th key={col} className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">
                                                        {col === 'is_fixed' ? t('reprogrammable') : col.replace(/_/g, ' ')}
                                                    </th>
                                                ))}
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-800/50">
                                            {filteredData.map((row, idx) => (
                                                <React.Fragment key={row.id || idx}>
                                                    <tr className="hover:bg-indigo-500/[0.02] transition-colors group">
                                                        <td className="px-6 py-4 text-center cursor-pointer" onClick={() => toggleRow(row.id)}>
                                                            {expandedRows[row.id] ? <Minus size={14} className="text-red-400 mx-auto" /> : <Plus size={14} className="text-indigo-400 mx-auto group-hover:scale-125 transition-transform" />}
                                                        </td>
                                                        {getColumns().map((col, vIdx) => (
                                                            <td key={vIdx} className="px-6 py-4 text-sm text-slate-400 group-hover:text-slate-200">
                                                                {col === 'name' ? (
                                                                    <span
                                                                        className="font-bold text-white cursor-pointer hover:text-indigo-400 hover:underline underline-offset-4"
                                                                        onClick={() => handleArticleClick(row.id)}
                                                                    >
                                                                        {row[col]}
                                                                    </span>
                                                                ) : col === 'is_fixed' ? (
                                                                    <button
                                                                        onClick={() => handleToggleFixed(row.id, row.is_fixed)}
                                                                        className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase transition-all ${!row.is_fixed ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' : 'bg-rose-500/10 text-rose-500 border border-rose-500/20'}`}
                                                                    >
                                                                        {!row.is_fixed ? 'Si' : 'No'}
                                                                    </button>
                                                                ) : String(row[col] ?? '-')}
                                                            </td>
                                                        ))}
                                                    </tr>
                                                    {expandedRows[row.id] && (
                                                        <tr>
                                                            <td colSpan={getColumns().length + 1} className="bg-slate-900/80">
                                                                {(subTab === 'bom' || subTab === 'items') && (
                                                                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                                                                        <BOMSubTable parentId={row.id} bom={allData.bom} onItemClick={handleArticleClick} />
                                                                        <WhereUsedSubTable itemId={row.id} bom={allData.bom} items={allData.items} onItemClick={handleArticleClick} />
                                                                    </div>
                                                                )}
                                                                {subTab === 'work_centers' && <MachineSubTable wcId={row.id} machines={allData.machines} onMachineClick={handleMachineClick} />}
                                                                {subTab === 'routings' && <RoutingSubTable itemId={row.id} routings={allData.routings} />}
                                                                {subTab === 'work_orders' && <OrderDetailsSubTable order={row} bom={allData.bom} routings={allData.routings} onItemClick={handleArticleClick} />}
                                                                {subTab === 'shifts' && <ShiftDetailsSubTable shiftId={row.id} machines={allData.machines} onMachineClick={handleMachineClick} />}
                                                                {subTab === 'maintenance_plans' && <MaintenanceDetailsSubTable plan={row} machines={allData.machines} onMachineClick={handleMachineClick} />}
                                                            </td>
                                                        </tr>
                                                    )}
                                                </React.Fragment>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            ) : (
                                <div className="p-8">
                                    {subTab === 'bom' ? (
                                        <div className="space-y-12">
                                            {allData.items.filter(i => allData.bom.some(b => b.parent_item_id === i.id)).map(prod => (
                                                <div key={prod.id} className="bg-slate-950/20 p-6 rounded-3xl border border-slate-800/50">
                                                    <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-3"><div className="size-2 rounded-full bg-indigo-500"></div> Estructura: {prod.name}</h3>
                                                    <BOMTree items={allData.items} bom={allData.bom} rootId={prod.id} />
                                                </div>
                                            ))}
                                        </div>
                                    ) : subTab === 'routings' ? (
                                        <RoutingFlow items={allData.items} routings={allData.routings} workCenters={allData.workCenters} machines={allData.machines} />
                                    ) : subTab === 'work_centers' ? (
                                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                            {allData.workCenters.map(wc => {
                                                const wcMachines = allData.machines.filter(m => m.work_center_id === wc.id);
                                                return (
                                                    <div key={wc.id} className="bg-slate-800/30 border border-slate-700 p-6 rounded-3xl group hover:border-indigo-500/50 transition-all">
                                                        <div className="flex justify-between items-start mb-6"><div className="p-3 bg-indigo-500/10 rounded-2xl text-indigo-400"><Settings size={24} /></div></div>
                                                        <h4 className="text-lg font-bold text-white mb-1">{wc.name}</h4>
                                                        <p className="text-slate-500 text-xs font-bold uppercase tracking-widest mb-6">{wc.id}</p>
                                                        <div className="space-y-4">
                                                            <p className="text-[10px] font-black text-slate-600 uppercase tracking-[0.2em] mb-2">Maquinaria ({wcMachines.length})</p>
                                                            <div className="flex flex-wrap gap-2">
                                                                {wcMachines.map(m => (
                                                                    <div
                                                                        key={m.id}
                                                                        className={`flex items-center gap-2 bg-slate-950/50 border px-3 py-2 rounded-xl text-xs transition-all cursor-pointer ${(!m.shift_id && !m.ignore_shifts) ? 'border-rose-500/50 text-rose-400 hover:bg-rose-500/10' : 'border-slate-800 text-slate-300 hover:border-emerald-500/50 hover:text-white'}`}
                                                                        onClick={() => handleMachineClick(m)}
                                                                    >
                                                                        <Cpu size={14} className={(!m.shift_id && !m.ignore_shifts) ? 'text-rose-500' : 'text-indigo-500'} />
                                                                        {m.name}
                                                                        {(!m.shift_id && !m.ignore_shifts) && <AlertCircle size={12} className="ml-1" />}
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    ) : (
                                        <div className="text-center py-20 bg-slate-950/20 rounded-3xl border border-dashed border-slate-800"><LayoutGrid size={48} className="mx-auto mb-4 text-slate-700" /><p className="text-slate-500 font-bold uppercase tracking-widest">Vista no disponible</p></div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                <ArticleMasterModal isOpen={!!selectedArticle} onClose={() => setSelectedArticle(null)} article={selectedArticle} onSave={fetchData} />
                <MachineMasterModal isOpen={!!selectedMachine} onClose={() => setSelectedMachine(null)} machine={selectedMachine} shifts={allData.shifts} onSave={fetchAll} />

            </main>
        </div>
    );
};

export default DataExplorer;
