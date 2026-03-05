
import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from '../services/languageService';
import { supabase } from '../services/supabaseClient';
import TopHeader from '../components/TopHeader';
import PlantLayoutAnimated from '../components/PlantLayoutAnimated';
import { erpMigrationService } from '../services/erpMigrationService';
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
    Trash2,
    Edit2,
    Shuffle,
    CheckCircle2,
    TrendingDown,
    X,
    CheckCircle,
    XCircle,
    Info,
    AlertTriangle,
    Factory,
    ShoppingBag,
    Layers
} from 'lucide-react';

// ─── Toast Notification System ──────────────────────────────────────────────
type ToastType = 'success' | 'error' | 'info' | 'warning';
interface Toast { id: number; type: ToastType; title: string; message?: string; }

const toastStyles: Record<ToastType, string> = {
    success: 'border-emerald-500/40 bg-emerald-500/10',
    error: 'border-rose-500/40 bg-rose-500/10',
    info: 'border-indigo-500/40 bg-indigo-500/10',
    warning: 'border-amber-500/40 bg-amber-500/10',
};
const toastIconColor: Record<ToastType, string> = {
    success: 'text-emerald-400',
    error: 'text-rose-400',
    info: 'text-indigo-400',
    warning: 'text-amber-400',
};
const ToastIcon: React.FC<{ type: ToastType }> = ({ type }) => {
    if (type === 'success') return <CheckCircle size={18} />;
    if (type === 'error') return <XCircle size={18} />;
    if (type === 'warning') return <AlertTriangle size={18} />;
    return <Info size={18} />;
};

const ToastContainer: React.FC<{ toasts: Toast[]; onRemove: (id: number) => void }> = ({ toasts, onRemove }) => (
    <div className="fixed bottom-6 right-6 z-[200] flex flex-col gap-3 pointer-events-none">
        {toasts.map(toast => (
            <div
                key={toast.id}
                className={`pointer-events-auto flex items-start gap-3 px-5 py-4 rounded-2xl border backdrop-blur-md shadow-2xl min-w-[300px] max-w-[380px] animate-in slide-in-from-right-5 fade-in duration-300 ${toastStyles[toast.type]}`}
            >
                <div className={`mt-0.5 shrink-0 ${toastIconColor[toast.type]}`}><ToastIcon type={toast.type} /></div>
                <div className="flex-1 min-w-0">
                    <p className="text-[11px] font-black uppercase tracking-widest text-[var(--text-main)]">{toast.title}</p>
                    {toast.message && <p className="text-[11px] text-[var(--text-muted)] mt-0.5 leading-relaxed break-words">{toast.message}</p>}
                </div>
                <button onClick={() => onRemove(toast.id)} className="shrink-0 text-[var(--text-muted)] hover:text-[var(--text-main)] transition-colors"><X size={14} /></button>
            </div>
        ))}
    </div>
);

// ─── Confirm Dialog ──────────────────────────────────────────────────────────
interface ConfirmDialogProps {
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    onCancel: () => void;
    confirmLabel?: string;
    danger?: boolean;
}
const ConfirmDialog: React.FC<ConfirmDialogProps> = ({ isOpen, title, message, onConfirm, onCancel, confirmLabel = 'Confirmar', danger = false }) => {
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={onCancel}>
            <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-3xl w-full max-w-md overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
                <div className="p-6 border-b border-[var(--border-color)] flex items-center gap-4">
                    <div className={`p-3 rounded-2xl ${danger ? 'bg-rose-500/10 text-rose-400' : 'bg-indigo-500/10 text-indigo-400'}`}>
                        {danger ? <Trash2 size={22} /> : <AlertTriangle size={22} />}
                    </div>
                    <div>
                        <h3 className="text-base font-black text-[var(--text-main)] uppercase tracking-tight">{title}</h3>
                        <p className="text-[11px] text-[var(--text-muted)] mt-0.5">{message}</p>
                    </div>
                </div>
                <div className="p-6 flex justify-end gap-3">
                    <button onClick={onCancel} className="px-5 py-2.5 rounded-xl border border-[var(--border-color)] text-xs font-black uppercase tracking-widest text-[var(--text-muted)] hover:bg-[var(--bg-main)] transition-all">
                        Cancelar
                    </button>
                    <button onClick={onConfirm} className={`px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest text-white transition-all active:scale-95 ${danger ? 'bg-rose-600 hover:bg-rose-500' : 'bg-indigo-600 hover:bg-indigo-500'}`}>
                        {confirmLabel}
                    </button>
                </div>
            </div>
        </div>
    );
};

// ─── Create Item Modal ───────────────────────────────────────────────────────
interface CreateItemModalProps {
    isOpen: boolean;
    onClose: () => void;
    availableItems: any[];
    onSave: (item: any, components: { item_id: string; qty: number }[]) => Promise<void>;
}
const CreateItemModal: React.FC<CreateItemModalProps> = ({ isOpen, onClose, availableItems, onSave }) => {
    const { t } = useTranslation();
    const [form, setForm] = useState({
        id: '', name: '', item_type: 'COMPRADO', uom: 'UN',
        description: '', lead_time_days: 7, min_purchase_qty: 1,
        initial_stock: 0, current_stock: 0, safety_stock: 0, unit_cost: 0,
    });
    const [components, setComponents] = useState<{ item_id: string; name: string; uom: string; qty: number }[]>([]);
    const [saving, setSaving] = useState(false);
    const [pickerOpen, setPickerOpen] = useState(false);
    const [pickerSearch, setPickerSearch] = useState('');
    const [selectedInPicker, setSelectedInPicker] = useState<Set<string>>(new Set());

    useEffect(() => {
        if (isOpen) {
            const newId = `MAN-${Math.random().toString(36).substr(2, 5).toUpperCase()}`;
            setForm({ id: newId, name: '', item_type: 'COMPRADO', uom: 'UN', description: '', lead_time_days: 7, min_purchase_qty: 1, initial_stock: 0, current_stock: 0, safety_stock: 0, unit_cost: 0 });
            setComponents([]);
            setPickerSearch('');
            setSelectedInPicker(new Set());
        }
    }, [isOpen]);

    if (!isOpen) return null;

    const filteredPicker = availableItems.filter(i =>
        !components.some(c => c.item_id === i.id) &&
        (i.name?.toLowerCase().includes(pickerSearch.toLowerCase()) || i.id?.toLowerCase().includes(pickerSearch.toLowerCase()))
    );

    const addComponent = (item: any) => {
        setComponents(prev => [...prev, { item_id: item.id, name: item.name, uom: item.uom || 'UN', qty: 1 }]);
    };
    const removeComponent = (item_id: string) => {
        setComponents(prev => prev.filter(c => c.item_id !== item_id));
    };
    const updateQty = (item_id: string, qty: number) => {
        setComponents(prev => prev.map(c => c.item_id === item_id ? { ...c, qty } : c));
    };
    const togglePickerItem = (itemId: string) => {
        setSelectedInPicker(prev => {
            const next = new Set(prev);
            if (next.has(itemId)) next.delete(itemId);
            else next.add(itemId);
            return next;
        });
    };
    const addSelectedComponents = () => {
        const toAdd = availableItems.filter(i => selectedInPicker.has(i.id) && !components.some(c => c.item_id === i.id));
        setComponents(prev => [
            ...prev,
            ...toAdd.map(item => ({ item_id: item.id, name: item.name, uom: item.uom || 'UN', qty: 1 }))
        ]);
        setSelectedInPicker(new Set());
        setPickerOpen(false);
        setPickerSearch('');
    };

    const handleSubmit = async () => {
        if (!form.name.trim()) return;
        setSaving(true);
        try {
            await onSave(form, components.map(c => ({ item_id: c.item_id, qty: c.qty })));
            onClose();
        } finally {
            setSaving(false);
        }
    };

    const inputClass = "w-full bg-[var(--bg-main)] border border-[var(--border-color)] rounded-xl px-4 py-2.5 text-sm font-bold text-[var(--text-main)] outline-none focus:border-indigo-500 transition-all placeholder:text-[var(--text-muted)]/40";
    const labelClass = "text-[9px] font-black text-[var(--text-muted)] uppercase tracking-widest mb-1.5 block";

    return (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm" onClick={onClose}>
            <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-[2.5rem] w-full max-w-3xl max-h-[90vh] overflow-hidden shadow-2xl flex flex-col animate-in fade-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>

                {/* Header */}
                <div className="p-7 border-b border-[var(--border-color)] flex justify-between items-center bg-[var(--bg-sidebar)] shrink-0">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-emerald-500/10 rounded-2xl border border-emerald-500/20 text-emerald-400">
                            <Package size={24} />
                        </div>
                        <div>
                            <h3 className="text-lg font-black uppercase tracking-tight text-[var(--text-main)]">Nuevo Artículo</h3>
                            <p className="text-[10px] text-[var(--text-muted)] font-bold uppercase tracking-widest">Configuración completa del maestro</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 rounded-xl text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--bg-main)] transition-all"><X size={20} /></button>
                </div>

                {/* Body */}
                <div className="overflow-y-auto custom-scrollbar flex-1 p-7 space-y-8">

                    {/* Identidad */}
                    <div>
                        <h4 className="text-[10px] font-black text-emerald-400 uppercase tracking-widest border-b border-[var(--border-color)] pb-2 mb-4 flex items-center gap-2"><FileText size={12} /> Identificación</h4>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="col-span-2">
                                <label className={labelClass}>Nombre del Artículo *</label>
                                <input className={inputClass} placeholder="Ej: Tapa Lateral Izquierda" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
                            </div>
                            <div>
                                <label className={labelClass}>Código / ID</label>
                                <input className={inputClass} value={form.id} onChange={e => setForm(f => ({ ...f, id: e.target.value }))} />
                            </div>
                            <div>
                                <label className={labelClass}>Unidad de Medida</label>
                                <select className={inputClass} value={form.uom} onChange={e => setForm(f => ({ ...f, uom: e.target.value }))}>
                                    {['UN', 'KG', 'M', 'M2', 'M3', 'LT', 'HS', 'PACK', 'JUEGO'].map(u => <option key={u} value={u}>{u}</option>)}
                                </select>
                            </div>
                            <div className="col-span-2">
                                <label className={labelClass}>Descripción</label>
                                <input className={inputClass} placeholder="Descripción técnica opcional..." value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
                            </div>
                        </div>
                    </div>

                    {/* Tipo de Artículo */}
                    <div>
                        <h4 className="text-[10px] font-black text-indigo-400 uppercase tracking-widest border-b border-[var(--border-color)] pb-2 mb-4 flex items-center gap-2"><Layers size={12} /> Tipo de Artículo</h4>
                        <div className="grid grid-cols-2 gap-4">
                            {[
                                {
                                    val: 'COMPRADO',
                                    icon: ShoppingBag,
                                    label: 'Comprado',
                                    desc: 'Se adquiere a un proveedor. El motor genera una Orden de Compra cuando hay demanda.',
                                    color: 'amber',
                                    detail: 'No tiene fórmula de componentes (BOM).'
                                },
                                {
                                    val: 'FABRICADO',
                                    icon: Factory,
                                    label: 'Fabricado',
                                    desc: 'Se produce internamente. El motor genera una Orden de Trabajo cuando hay demanda.',
                                    color: 'emerald',
                                    detail: 'Requiere definir su fórmula de componentes (BOM) a continuación.'
                                },
                            ].map(opt => (
                                <button
                                    key={opt.val}
                                    onClick={() => setForm(f => ({ ...f, item_type: opt.val }))}
                                    className={`p-5 rounded-2xl border text-left transition-all ${form.item_type === opt.val
                                        ? `border-${opt.color}-500/50 bg-${opt.color}-500/10 shadow-lg`
                                        : 'border-[var(--border-color)] hover:border-[var(--border-color)]/80 hover:bg-[var(--bg-main)]/40'
                                        }`}
                                >
                                    <div className="flex items-center gap-3 mb-2">
                                        <div className={`p-2 rounded-xl ${form.item_type === opt.val ? `bg-${opt.color}-500/20` : 'bg-[var(--bg-main)]'}`}>
                                            <opt.icon size={18} className={form.item_type === opt.val ? `text-${opt.color}-400` : 'text-[var(--text-muted)]'} />
                                        </div>
                                        <p className={`text-sm font-black ${form.item_type === opt.val ? `text-${opt.color}-400` : 'text-[var(--text-main)]'}`}>{opt.label}</p>
                                    </div>
                                    <p className="text-[10px] text-[var(--text-muted)] leading-relaxed">{opt.desc}</p>
                                    <p className={`text-[9px] font-bold mt-2 ${form.item_type === opt.val ? `text-${opt.color}-400/70` : 'text-[var(--text-muted)]/50'}`}>{opt.detail}</p>
                                </button>
                            ))}
                        </div>
                        {/* Nota aclaratoria */}
                        <p className="text-[9px] text-[var(--text-muted)] mt-3 pl-1 leading-relaxed">
                            💡 La posición del artículo en la jerarquía (si es componente de otro fabricado) la determina el BOM, no este campo.
                        </p>
                    </div>

                    {/* Parámetros de Planificación */}
                    <div>
                        <h4 className="text-[10px] font-black text-purple-400 uppercase tracking-widest border-b border-[var(--border-color)] pb-2 mb-4 flex items-center gap-2"><Settings size={12} /> Parámetros de Planificación</h4>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className={labelClass}>Lead Time (días)</label>
                                <input type="number" className={inputClass} value={form.lead_time_days} onChange={e => setForm(f => ({ ...f, lead_time_days: Number(e.target.value) }))} />
                            </div>
                            <div>
                                <label className={labelClass}>Lote Mínimo de Compra / Producción</label>
                                <input type="number" className={inputClass} value={form.min_purchase_qty} onChange={e => setForm(f => ({ ...f, min_purchase_qty: Number(e.target.value) }))} />
                            </div>
                            <div>
                                <label className={labelClass}>Stock Actual (unidades en inventario hoy)</label>
                                <input type="number" className={inputClass} value={form.current_stock} onChange={e => setForm(f => ({ ...f, current_stock: Number(e.target.value), initial_stock: Number(e.target.value) }))} />
                            </div>
                            <div>
                                <label className={labelClass}>Stock de Seguridad (mínimo a mantener)</label>
                                <input type="number" className={inputClass} value={form.safety_stock} onChange={e => setForm(f => ({ ...f, safety_stock: Number(e.target.value) }))} />
                            </div>
                            <div className="col-span-2">
                                <label className={labelClass}>Costo Unitario ($)</label>
                                <input type="number" step="0.01" className={inputClass} value={form.unit_cost} onChange={e => setForm(f => ({ ...f, unit_cost: Number(e.target.value) }))} />
                            </div>
                        </div>
                    </div>

                    {/* Componentes (solo si es FABRICADO o SEMIELABORADO) */}
                    {(form.item_type === 'FABRICADO' || form.item_type === 'SEMIELABORADO') && (
                        <div>
                            <h4 className="text-[10px] font-black text-rose-400 uppercase tracking-widest border-b border-[var(--border-color)] pb-2 mb-4 flex items-center gap-2"><GitBranch size={12} /> Componentes de la Fórmula (BOM)</h4>

                            {/* Componentes agregados */}
                            {components.length > 0 && (
                                <div className="space-y-2 mb-4">
                                    {components.map(c => (
                                        <div key={c.item_id} className="flex items-center gap-3 bg-[var(--bg-main)] border border-[var(--border-color)] rounded-xl px-4 py-2.5">
                                            <Package size={14} className="text-indigo-400 shrink-0" />
                                            <span className="text-sm font-bold text-[var(--text-main)] flex-1 truncate">{c.name}</span>
                                            <span className="text-[9px] text-[var(--text-muted)] uppercase tracking-widest shrink-0">Cantidad:</span>
                                            <input
                                                type="number" min="0.01" step="0.01"
                                                value={c.qty}
                                                onChange={e => updateQty(c.item_id, Number(e.target.value))}
                                                className="w-20 bg-[var(--bg-card)] border border-indigo-500/30 rounded-lg px-2 py-1 text-sm font-black text-indigo-400 text-center outline-none focus:border-indigo-500"
                                            />
                                            <span className="text-[10px] font-black text-indigo-300 shrink-0 min-w-[28px]">{c.uom}</span>
                                            <button onClick={() => removeComponent(c.item_id)} className="text-rose-400 hover:text-rose-300 transition-colors shrink-0"><X size={16} /></button>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {/* Selector de componentes con multi-select */}
                            <div className="border border-dashed border-[var(--border-color)] rounded-2xl overflow-hidden">
                                <button
                                    onClick={() => { setPickerOpen(!pickerOpen); if (pickerOpen) { setSelectedInPicker(new Set()); setPickerSearch(''); } }}
                                    className="w-full flex items-center justify-between px-5 py-3.5 text-[11px] font-black uppercase tracking-widest text-indigo-400 hover:bg-indigo-500/5 transition-all"
                                >
                                    <span className="flex items-center gap-2"><Plus size={14} /> Agregar componentes</span>
                                    <ChevronDown size={14} className={`transition-transform ${pickerOpen ? 'rotate-180' : ''}`} />
                                </button>
                                {pickerOpen && (
                                    <div className="border-t border-[var(--border-color)] p-4 space-y-3">
                                        <div className="relative">
                                            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
                                            <input
                                                className="w-full bg-[var(--bg-main)] border border-[var(--border-color)] rounded-xl py-2 pl-9 pr-4 text-sm outline-none focus:border-indigo-500"
                                                placeholder="Buscar artículo por nombre o código..."
                                                value={pickerSearch}
                                                onChange={e => setPickerSearch(e.target.value)}
                                                autoFocus
                                            />
                                        </div>
                                        <div className="max-h-52 overflow-y-auto custom-scrollbar space-y-1">
                                            {filteredPicker.length === 0 && (
                                                <p className="text-center text-[var(--text-muted)] text-xs py-4 italic">No hay artículos disponibles</p>
                                            )}
                                            {filteredPicker.map(item => {
                                                const isChecked = selectedInPicker.has(item.id);
                                                return (
                                                    <label
                                                        key={item.id}
                                                        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all cursor-pointer select-none ${isChecked ? 'bg-indigo-500/15 border border-indigo-500/30' : 'hover:bg-[var(--bg-main)] border border-transparent'
                                                            }`}
                                                    >
                                                        {/* Checkbox */}
                                                        <div
                                                            onClick={() => togglePickerItem(item.id)}
                                                            className={`w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 transition-all ${isChecked ? 'bg-indigo-500 border-indigo-500' : 'border-[var(--border-color)] hover:border-indigo-400'
                                                                }`}
                                                        >
                                                            {isChecked && <CheckCircle2 size={12} className="text-white" />}
                                                        </div>
                                                        {/* Icono tipo */}
                                                        <div className={`p-1.5 rounded-lg shrink-0 ${item.item_type === 'COMPRADO' ? 'bg-amber-500/10 text-amber-400' :
                                                            item.item_type === 'SEMIELABORADO' ? 'bg-indigo-500/10 text-indigo-400' :
                                                                'bg-emerald-500/10 text-emerald-400'
                                                            }`} onClick={() => togglePickerItem(item.id)}>
                                                            <Package size={12} />
                                                        </div>
                                                        {/* Info */}
                                                        <div className="flex-1 min-w-0" onClick={() => togglePickerItem(item.id)}>
                                                            <p className={`text-xs font-bold truncate ${isChecked ? 'text-indigo-300' : 'text-[var(--text-main)]'}`}>{item.name}</p>
                                                            <p className="text-[9px] text-[var(--text-muted)] font-mono">{item.id} · <span className="text-indigo-400 font-bold">{item.uom}</span></p>
                                                        </div>
                                                        {/* Badge tipo */}
                                                        <span className={`text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md shrink-0 ${item.item_type === 'COMPRADO' ? 'bg-amber-500/10 text-amber-400' :
                                                            item.item_type === 'SEMIELABORADO' ? 'bg-indigo-500/10 text-indigo-400' :
                                                                'bg-emerald-500/10 text-emerald-400'
                                                            }`}>{item.item_type}</span>
                                                    </label>
                                                );
                                            })}
                                        </div>
                                        {/* Barra de acción multi-select */}
                                        <div className="flex items-center justify-between pt-2 border-t border-[var(--border-color)]">
                                            <span className="text-[10px] text-[var(--text-muted)]">
                                                {selectedInPicker.size > 0 ? `${selectedInPicker.size} artículo${selectedInPicker.size > 1 ? 's' : ''} seleccionado${selectedInPicker.size > 1 ? 's' : ''}` : 'Ningún artículo seleccionado'}
                                            </span>
                                            <button
                                                onClick={addSelectedComponents}
                                                disabled={selectedInPicker.size === 0}
                                                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-30 disabled:cursor-not-allowed text-white text-[10px] font-black uppercase tracking-widest transition-all active:scale-95"
                                            >
                                                <Plus size={12} />
                                                Agregar {selectedInPicker.size > 0 ? selectedInPicker.size : ''} seleccionado{selectedInPicker.size !== 1 ? 's' : ''}
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-7 bg-[var(--bg-sidebar)] border-t border-[var(--border-color)] flex justify-between items-center shrink-0">
                    <p className="text-[10px] text-[var(--text-muted)]">Los campos marcados con * son obligatorios</p>
                    <div className="flex gap-3">
                        <button onClick={onClose} className="px-5 py-2.5 rounded-xl border border-[var(--border-color)] text-xs font-black uppercase tracking-widest text-[var(--text-muted)] hover:bg-[var(--bg-main)] transition-all">Cancelar</button>
                        <button
                            onClick={handleSubmit}
                            disabled={saving || !form.name.trim()}
                            className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed text-white px-8 py-2.5 rounded-xl font-black uppercase text-[10px] tracking-widest shadow-lg flex items-center gap-2 transition-all active:scale-95"
                        >
                            {saving ? <RefreshCw className="animate-spin" size={14} /> : <CheckCircle2 size={14} />}
                            {saving ? 'Guardando...' : 'Crear Artículo'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};


// --- Modals for Drill Down ---

const ArticleMasterModal: React.FC<{ isOpen: boolean; onClose: () => void; article: any; onSave?: () => void }> = ({ isOpen, onClose, article, onSave }) => {
    const { t } = useTranslation();
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
        } catch (e) { console.error(e); }
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
                                <p className="text-2xl font-black text-emerald-500">{article.current_stock || 0} {article.uom || t('unit_un')}</p>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div><p className="text-[9px] font-black text-[var(--text-muted)] uppercase tracking-widest mb-1">{t('item_type')}</p><p className="text-sm font-bold text-[var(--text-main)] uppercase tracking-tight">{article.item_type === 'FABRICADO' ? t('manufactured') : t('purchased')}</p></div>
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
    const { t } = useTranslation();
    const [shiftId, setShiftId] = useState(machine?.shift_id || '');
    const [ignoreShifts, setIgnoreShifts] = useState(machine?.ignore_shifts || false);
    const [efficiency, setEfficiency] = useState(machine?.efficiency_factor || 1.0);
    const [isActive, setIsActive] = useState(machine?.is_active !== false); // undefined = active
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (machine) {
            setShiftId(machine.shift_id || '');
            setIgnoreShifts(machine.ignore_shifts || false);
            setEfficiency(machine.efficiency_factor || 1.0);
            setIsActive(machine.is_active !== false);
        }
    }, [machine]);

    if (!isOpen || !machine) return null;

    const handleSave = async () => {
        setSaving(true);
        try {
            const { error } = await supabase.from('machines').update({
                shift_id: shiftId || null,
                ignore_shifts: ignoreShifts,
                efficiency_factor: efficiency,
                is_active: isActive
            }).eq('id', machine.id);
            if (error) throw error;
            if (onSave) onSave();
            onClose();
        } catch (e) { console.error(e); }
        finally { setSaving(false); }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={onClose}>
            <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-[2.5rem] w-full max-w-2xl overflow-hidden shadow-2xl animate-in fade-in zoom-in duration-200" onClick={e => e.stopPropagation()}>
                <div className="p-8 border-b border-[var(--border-color)] flex justify-between items-center bg-[var(--bg-sidebar)]">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-emerald-500/10 rounded-2xl border border-emerald-500/20 text-emerald-400">
                            <Cpu size={24} />
                        </div>
                        <div>
                            <h3 className="text-xl font-black uppercase tracking-tighter text-[var(--text-main)]">{machine.name}</h3>
                            <p className="text-[10px] text-[var(--text-muted)] font-black uppercase tracking-widest">{machine.id}</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="text-[var(--text-muted)] hover:text-[var(--text-main)] transition-colors"><Minus size={24} className="rotate-45" /></button>
                </div>
                <div className="p-8 space-y-8">
                    <div className="grid grid-cols-2 gap-8">
                        <div className="space-y-6">
                            <h4 className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest border-b border-[var(--border-color)] pb-2 flex items-center gap-2">
                                <Timer size={12} /> {t('availability_shifts')}
                            </h4>
                            <div className="space-y-4">
                                <div>
                                    <label className="text-[9px] font-black text-[var(--text-muted)] uppercase tracking-widest mb-2 block">{t('assigned_shift')}</label>
                                    <select
                                        value={shiftId}
                                        onChange={e => setShiftId(e.target.value)}
                                        disabled={ignoreShifts}
                                        className="w-full bg-[var(--bg-main)] border border-[var(--border-color)] rounded-xl px-4 py-3 text-sm font-bold text-emerald-400 outline-none focus:border-emerald-500 disabled:opacity-30 transition-all"
                                    >
                                        <option value="">{t('select_shift')}</option>
                                        {shifts.map(s => <option key={s.id} value={s.id}>{s.name} ({s.start_time}-{s.end_time})</option>)}
                                    </select>
                                </div>
                                <div className="flex items-center gap-3 p-4 bg-[var(--bg-main)] border border-[var(--border-color)] rounded-2xl group cursor-pointer" onClick={() => setIgnoreShifts(!ignoreShifts)}>
                                    <div className={`w-10 h-5 rounded-full transition-colors relative ${ignoreShifts ? 'bg-emerald-500' : 'bg-slate-700'}`}>
                                        <div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all ${ignoreShifts ? 'left-6' : 'left-1'}`} />
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-black text-[var(--text-main)] uppercase tracking-tight">{t('free_from_shifts')}</p>
                                        <p className="text-[8px] text-[var(--text-muted)] font-medium">{t('continuous_plan_desc')}</p>
                                    </div>
                                </div>
                                {/* is_active toggle */}
                                <div className="flex items-center gap-3 p-4 bg-[var(--bg-main)] border border-[var(--border-color)] rounded-2xl group cursor-pointer" onClick={() => setIsActive(!isActive)}>
                                    <div className={`w-10 h-5 rounded-full transition-colors relative ${isActive ? 'bg-emerald-500' : 'bg-rose-600'}`}>
                                        <div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all ${isActive ? 'left-6' : 'left-1'}`} />
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-black text-[var(--text-main)] uppercase tracking-tight">Equipo Activo</p>
                                        <p className="text-[8px] text-[var(--text-muted)] font-medium">{isActive ? 'Disponible para planificación APS' : 'Excluido del scheduling (inactivo)'}</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="space-y-6">
                            <h4 className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest border-b border-[var(--border-color)] pb-2 flex items-center gap-2">
                                <Settings size={12} /> {t('technical_params')}
                            </h4>
                            <div className="grid grid-cols-1 gap-4">
                                <div className="p-4 bg-[var(--bg-main)] border border-[var(--border-color)] rounded-2xl">
                                    <p className="text-[9px] font-black text-[var(--text-muted)] uppercase tracking-widest mb-1">{t('work_center')}</p>
                                    <p className="text-sm font-bold text-[var(--text-main)]">{machine.work_center_id || 'N/A'}</p>
                                </div>
                                <div className="p-4 bg-[var(--bg-main)] border border-[var(--border-color)] rounded-2xl">
                                    <p className="text-[9px] font-black text-[var(--text-muted)] uppercase tracking-widest mb-1">{t('max_daily_capacity')}</p>
                                    <p className="text-sm font-bold text-emerald-500">{machine.max_capacity || '24'} {t('hours')}</p>
                                </div>
                                <div className="p-4 bg-[var(--bg-main)] border border-[var(--border-color)] rounded-2xl">
                                    <label className="text-[9px] font-black text-[var(--text-muted)] uppercase tracking-widest mb-2 block">{t('efficiency_factor')}</label>
                                    <div className="flex items-center gap-3">
                                        <input
                                            type="number"
                                            step="0.01"
                                            min="0.1"
                                            max="1.5"
                                            value={efficiency}
                                            onChange={e => setEfficiency(Number(e.target.value))}
                                            className="w-full bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl px-4 py-2 text-sm font-bold text-emerald-400 outline-none focus:border-emerald-500"
                                        />
                                    </div>
                                    <p className="text-[8px] text-[var(--text-muted)] font-medium mt-2">{t('efficiency_desc')}</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                <div className="p-8 bg-[var(--bg-sidebar)] border-t border-[var(--border-color)] flex justify-end gap-3">
                    <button onClick={onClose} className="px-6 py-3 rounded-xl border border-[var(--border-color)] text-xs font-black uppercase tracking-widest text-[var(--text-muted)] hover:bg-[var(--bg-main)]">{t('cancel')}</button>
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
const BOMSubTable: React.FC<{ parentId: string, bom: any[], items: any[], onItemClick: (id: string) => void }> = ({ parentId, bom, items, onItemClick }) => {
    const { t } = useTranslation();
    const children = bom.filter(b => b.parent_item_id === parentId);
    return (
        <div className="bg-[var(--bg-sidebar)] p-4 border-l-4 border-indigo-500/50 m-2 rounded-r-xl">
            <h5 className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-3">{t('formula_components')}</h5>
            <table className="w-full text-xs">
                <thead>
                    <tr className="text-[var(--text-muted)] border-b border-[var(--border-color)]">
                        <th className="px-4 py-2 text-left">{t('component')}</th>
                        <th className="px-4 py-2 text-right">{t('required_qty')}</th>
                    </tr>
                </thead>
                <tbody>
                    {children.map((c, i) => {
                        const item = items.find(it => it.id === c.component_item_id);
                        return (
                            <tr key={i} className="border-b border-[var(--border-color)] hover:bg-[var(--accent)]/5 transition-colors cursor-pointer" onClick={() => onItemClick(c.component_item_id)}>
                                <td className="px-4 py-2 text-[var(--text-main)] font-medium flex items-center gap-2">
                                    <Package size={12} className="text-indigo-500" />
                                    <span className="underline decoration-[var(--border-color)] underline-offset-4 group-hover:decoration-indigo-500">{item?.name || c.component_item_id}</span>
                                </td>
                                <td className="px-4 py-2 text-right text-indigo-400 font-bold">{c.quantity_required}</td>
                            </tr>
                        );
                    })}
                    {children.length === 0 && <tr><td colSpan={2} className="px-4 py-4 text-center text-[var(--text-muted)] italic">{t('no_components')}</td></tr>}
                </tbody>
            </table>
        </div>
    );
};

// --- Sub-Tabla DE "Dónde se Usa" (Where Used) ---
const WhereUsedSubTable: React.FC<{ itemId: string, bom: any[], items: any[], onItemClick: (id: string) => void }> = ({ itemId, bom, items, onItemClick }) => {
    const { t } = useTranslation();
    // Buscar en qué BOMs aparece este item como componente
    const usages = bom.filter(b => b.component_item_id === itemId);

    return (
        <div className="bg-[var(--bg-sidebar)] p-4 border-l-4 border-purple-500/50 m-2 rounded-r-xl">
            <h5 className="text-[10px] font-black text-purple-400 uppercase tracking-widest mb-3">{t('where_used')}</h5>
            <table className="w-full text-xs">
                <thead>
                    <tr className="text-[var(--text-muted)] border-b border-[var(--border-color)]">
                        <th className="px-4 py-2 text-left">{t('parent_product')}</th>
                        <th className="px-4 py-2 text-right">{t('qty_in_formula')}</th>
                    </tr>
                </thead>
                <tbody>
                    {usages.map((u, i) => {
                        const parent = items.find(it => it.id === u.parent_item_id);
                        return (
                            <tr key={i} className="border-b border-[var(--border-color)] hover:bg-[var(--accent)]/5 transition-colors cursor-pointer" onClick={() => onItemClick(u.parent_item_id)}>
                                <td className="px-4 py-2 text-[var(--text-main)] font-medium flex items-center gap-2">
                                    <GitBranch size={12} className="text-purple-500" />
                                    <span className="underline decoration-[var(--border-color)] underline-offset-4 group-hover:decoration-purple-500">{parent?.name || u.parent_item_id}</span>
                                </td>
                                <td className="px-4 py-2 text-right text-purple-400 font-bold">{u.quantity_required}</td>
                            </tr>
                        );
                    })}
                    {usages.length === 0 && <tr><td colSpan={2} className="px-4 py-4 text-center text-[var(--text-muted)] italic">{t('not_in_any_formula')}</td></tr>}
                </tbody>
            </table>
        </div>
    );
};

// --- Sub-Tabla para Máquinas ---
const MachineSubTable: React.FC<{ wcId: string, machines: any[], onMachineClick: (m: any) => void, onAddMachine?: (wcId: string) => void }> = ({ wcId, machines, onMachineClick, onAddMachine }) => {
    const { t } = useTranslation();
    const wcMachines = machines.filter(m => m.work_center_id === wcId);
    return (
        <div className="bg-[var(--bg-sidebar)] p-4 border-l-4 border-emerald-500/50 m-2 rounded-r-xl">
            <div className="flex items-center justify-between mb-3">
                <h5 className="text-[10px] font-black text-emerald-400 uppercase tracking-widest">{t('integrated_machinery')}</h5>
                {onAddMachine && (
                    <button
                        onClick={() => onAddMachine(wcId)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[9px] font-black uppercase tracking-widest hover:bg-emerald-500/20 transition-all"
                    >
                        <Plus size={10} /> Máquina
                    </button>
                )}
            </div>
            <table className="w-full text-xs">
                <thead>
                    <tr className="text-[var(--text-muted)] border-b border-[var(--border-color)]">
                        <th className="px-4 py-2 text-left">{t('machine_id')}</th>
                        <th className="px-4 py-2 text-left">{t('name_denomination')}</th>
                        <th className="px-4 py-2 text-center">{t('efficiency_factor')}</th>
                        <th className="px-4 py-2 text-center">{t('status')}</th>
                    </tr>
                </thead>
                <tbody>
                    {wcMachines.map((m, i) => (
                        <tr key={i} className="border-b border-[var(--border-color)] hover:bg-[var(--accent)]/5 transition-colors cursor-pointer" onClick={() => onMachineClick(m)}>
                            <td className="px-4 py-2 text-[var(--text-muted)] font-mono">{m.id}</td>
                            <td className="px-4 py-2 text-[var(--text-main)] font-bold flex items-center gap-2">
                                <Settings size={12} className="text-emerald-500" />
                                <span className="underline decoration-[var(--border-color)] underline-offset-4">{m.name}</span>
                            </td>
                            <td className="px-4 py-2 text-center font-bold text-emerald-400">
                                {(m.efficiency_factor || 1.0).toFixed(2)}
                            </td>
                            <td className="px-4 py-2 text-center">
                                <span className={`px-2 py-0.5 rounded-md text-[9px] font-black uppercase ${m.is_active === false ? 'bg-rose-500/10 text-rose-400' : 'bg-emerald-500/10 text-emerald-500'}`}>
                                    {m.is_active === false ? 'Inactivo' : t('active')}
                                </span>
                            </td>
                        </tr>
                    ))}
                    {wcMachines.length === 0 && <tr><td colSpan={4} className="px-4 py-4 text-center text-[var(--text-muted)] italic">{t('no_machines_assigned')}</td></tr>}
                </tbody>
            </table>
        </div>
    );
};

// --- Sub-Tabla para Detalle de Pedido (Explosión) ---
const OrderDetailsSubTable: React.FC<{ order: any, bom: any[], items: any[], routings: any[], onItemClick: (id: string) => void }> = ({ order, bom, items, routings, onItemClick }) => {
    const { t } = useTranslation();
    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 m-2">
            <div className="bg-[var(--bg-sidebar)] p-4 border-l-4 border-indigo-500/50 rounded-r-xl">
                <h5 className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-3">{t('material_explosion')}</h5>
                <BOMSubTable parentId={order.item_id} bom={bom} items={items} onItemClick={onItemClick} />
            </div>
            <div className="bg-[var(--bg-sidebar)] p-4 border-l-4 border-amber-500/50 rounded-r-xl">
                <h5 className="text-[10px] font-black text-amber-400 uppercase tracking-widest mb-3">{t('product_routing')}</h5>
                <RoutingSubTable itemId={order.item_id} routings={routings} />
            </div>
        </div>
    );
};

// --- Sub-Tabla para Detalle de Turno ---
const ShiftDetailsSubTable: React.FC<{ shiftId: string, machines: any[], onMachineClick: (m: any) => void }> = ({ shiftId, machines, onMachineClick }) => {
    const { t } = useTranslation();
    const shiftMachines = machines.filter(m => m.shift_id === shiftId);
    return (
        <div className="bg-[var(--bg-sidebar)] p-4 border-l-4 border-cyan-500/50 m-2 rounded-r-xl">
            <h5 className="text-[10px] font-black text-cyan-400 uppercase tracking-widest mb-3">{t('machines_with_shift')}</h5>
            <div className="flex flex-wrap gap-2">
                {shiftMachines.map(m => (
                    <div
                        key={m.id}
                        className="flex items-center gap-2 bg-[var(--bg-main)] border border-[var(--border-color)] px-3 py-2 rounded-xl text-xs text-[var(--text-main)] cursor-pointer hover:border-cyan-500 hover:text-cyan-400 transition-all"
                        onClick={() => onMachineClick(m)}
                    >
                        <Cpu size={14} className="text-cyan-500" />{m.name}
                    </div>
                ))}
                {shiftMachines.length === 0 && <p className="text-[var(--text-muted)] italic text-xs">{t('no_machines_this_shift')}</p>}
            </div>
        </div>
    );
};

// --- Sub-Tabla para Detalle de Mantenimiento ---
const MaintenanceDetailsSubTable: React.FC<{ plan: any, machines: any[], onMachineClick: (m: any) => void }> = ({ plan, machines, onMachineClick }) => {
    const { t } = useTranslation();
    const machine = machines.find(m => m.id === plan.machine_id);
    return (
        <div className="bg-[var(--bg-sidebar)] p-6 border-l-4 border-rose-500/50 m-2 rounded-r-xl">
            <h5 className="text-[10px] font-black text-rose-400 uppercase tracking-widest mb-4">{t('maint_plan_detail')}</h5>
            <div className="flex items-start gap-8">
                <div onClick={() => machine && onMachineClick(machine)} className="flex items-center gap-3 bg-[var(--bg-card)] border border-[var(--border-color)] p-4 rounded-2xl cursor-pointer hover:border-rose-500/50 transition-all">
                    <div className="p-2 bg-rose-500/10 rounded-lg text-rose-500"><Cpu size={20} /></div>
                    <div>
                        <p className="text-[10px] text-[var(--text-muted)] font-bold uppercase">{t('affects_to')}</p>
                        <p className="text-sm font-black text-[var(--text-main)]">{machine?.name || plan.machine_id}</p>
                    </div>
                </div>
                <div className="flex-1 space-y-2">
                    <p className="text-[10px] text-[var(--text-muted)] font-bold uppercase">{t('work_description')}</p>
                    <p className="text-sm text-[var(--text-main)] bg-[var(--bg-main)] p-4 rounded-xl border border-[var(--border-color)]">{plan.description || t('no_tech_desc')}</p>
                </div>
            </div>
        </div>
    );
};

// --- Sub-Tabla para Operaciones (Ruteo) ---
const RoutingSubTable: React.FC<{ itemId: string, routings: any[] }> = ({ itemId, routings }) => {
    const { t } = useTranslation();
    const ops = routings.filter(r => r.item_id === itemId).sort((a, b) => a.operation_sequence - b.operation_sequence);
    return (
        <div className="bg-[var(--bg-sidebar)] p-4 border-l-4 border-amber-500/50 m-2 rounded-r-xl">
            <h5 className="text-[10px] font-black text-amber-400 uppercase tracking-widest mb-3">{t('op_sequence_title')}</h5>
            <table className="w-full text-xs">
                <thead>
                    <tr className="text-[var(--text-muted)] border-b border-[var(--border-color)]">
                        <th className="px-4 py-2 text-left w-16">{t('step')}</th>
                        <th className="px-4 py-2 text-left">{t('process_description')}</th>
                        <th className="px-4 py-2 text-left">{t('work_center')}</th>
                        <th className="px-4 py-2 text-right">{t('setup_time')}</th>
                        <th className="px-4 py-2 text-right">{t('run_time')}</th>
                    </tr>
                </thead>
                <tbody>
                    {ops.map((o, i) => (
                        <tr key={i} className="border-b border-[var(--border-color)]">
                            <td className="px-4 py-2 text-amber-500 font-black">#{o.operation_sequence}</td>
                            <td className="px-4 py-2 text-[var(--text-main)]">{o.operation_description}</td>
                            <td className="px-4 py-2 text-[var(--text-muted)] font-bold">{o.work_center?.name || o.work_center_id}</td>
                            <td className="px-4 py-2 text-right text-[var(--text-muted)] italic">{o.setup_time_minutes}</td>
                            <td className="px-4 py-2 text-right text-indigo-400 font-bold">{o.run_time_minutes_per_unit}</td>
                        </tr>
                    ))}
                    {ops.length === 0 && <tr><td colSpan={5} className="px-4 py-4 text-center text-[var(--text-muted)] italic">{t('no_routing_ops')}</td></tr>}
                </tbody>
            </table>
        </div>
    );
};

const BOMTree: React.FC<{ items: any[], bom: any[], rootId: string, depth?: number }> = ({ items, bom, rootId, depth = 0 }) => {
    const { t } = useTranslation();
    const parent = items.find(i => i.id === rootId);
    const children = bom.filter(b => b.parent_item_id === rootId);
    const [isOpen, setIsOpen] = useState(true);

    if (!parent) return null;

    return (
        <div className={`ml-${depth * 4} border-l border-[var(--border-color)] pl-4 py-2`}>
            <div
                className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${depth === 0 ? 'bg-indigo-500/10 border-indigo-500/30' : 'bg-[var(--bg-sidebar)] border-[var(--border-color)]'}`}
                onClick={() => setIsOpen(!isOpen)}
            >
                {children.length > 0 ? (isOpen ? <ChevronDown size={14} className="text-[var(--text-muted)]" /> : <ChevronRight size={14} className="text-[var(--text-muted)]" />) : <div className="w-[14px]" />}
                <Package size={16} className={depth === 0 ? 'text-indigo-400' : 'text-[var(--text-muted)]'} />
                <div>
                    <p className="text-sm font-bold text-[var(--text-main)]">{parent.name}</p>
                    <p className="text-[10px] text-[var(--text-muted)] uppercase font-bold tracking-widest">{rootId}</p>
                </div>
            </div>
            {isOpen && children.length > 0 && (
                <div className="mt-2 space-y-2">
                    {children.map(child => (
                        <div key={child.id} className="relative">
                            <div className="absolute top-4 -left-4 w-4 h-px bg-[var(--border-color)]" />
                            <div className="flex items-center gap-2 mb-1 ml-4 py-1 px-2 bg-[var(--bg-sidebar)] rounded-lg w-fit border border-[var(--border-color)]">
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
    const { t } = useTranslation();
    const productsWithRoutings = items.filter(i => routings.some(r => r.item_id === i.id));

    return (
        <div className="space-y-12 p-4">
            {productsWithRoutings.map(prod => (
                <div key={prod.id} className="space-y-6">
                    <div className="flex items-center gap-3 pb-4 border-b border-[var(--border-color)]">
                        <div className="p-2 bg-indigo-500/10 rounded-lg text-indigo-400">
                            <Package size={20} />
                        </div>
                        <h3 className="text-lg font-bold text-[var(--text-main)]">{prod.name} <span className="text-[var(--text-muted)] font-normal text-sm ml-2">{prod.id}</span></h3>
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
                                            <div className="bg-[var(--bg-card)] border border-[var(--border-color)] p-4 rounded-2xl w-64 shadow-xl group-hover:border-indigo-500/50 transition-all">
                                                <div className="flex items-center justify-between mb-3 text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest">
                                                    <span>{t('op_label')} {op.operation_sequence}</span>
                                                    <Timer size={14} className="text-indigo-400" />
                                                </div>
                                                <p className="text-sm font-bold text-[var(--text-main)] mb-4 h-10 line-clamp-2">{op.operation_description}</p>
                                                <div className="space-y-2 border-t border-[var(--border-color)] pt-3">
                                                    <div className="flex items-center gap-2 text-xs text-[var(--text-muted)]">
                                                        <Settings size={14} />
                                                        <span className="font-bold">{wc?.name || t('wc_unknown')}</span>
                                                    </div>
                                                    <div className="flex flex-wrap gap-1 mt-2">
                                                        {wcMachines.map(m => (
                                                            <div key={m.id} className="size-6 bg-[var(--bg-main)] border border-[var(--border-color)] rounded flex items-center justify-center text-indigo-400">
                                                                <Cpu size={12} />
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                        {idx < arr.length - 1 && <ChevronRight size={24} className="text-[var(--border-color)] animate-pulse" />}
                                    </React.Fragment>
                                );
                            })}
                    </div>
                </div>
            ))}
        </div>
    );
};

// ─── Create / Edit Work Center Modal ─────────────────────────────────────────
// Handles both NEW work center creation (with machines inline) and
// adding a single machine to an EXISTING work center.
type WCModalMode = { type: 'create' } | { type: 'add_machine'; wcId: string; wcName: string };

const CreateWorkCenterModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    mode: WCModalMode;
    shifts: any[];
    onSave: () => Promise<void>;
    onError: (msg: string) => void;
}> = ({ isOpen, onClose, mode, shifts, onSave, onError }) => {
    const genId = (prefix: string) => `${prefix}-${Math.random().toString(36).substr(2, 5).toUpperCase()}`;

    const [wcId, setWcId] = useState(() => genId('WC'));
    const [wcName, setWcName] = useState('');
    const [machines, setMachines] = useState<any[]>([]);
    const [saving, setSaving] = useState(false);
    const [errors, setErrors] = useState<string[]>([]);

    // Reset when modal opens/mode changes
    useEffect(() => {
        if (isOpen) {
            if (mode.type === 'create') {
                setWcId(genId('WC'));
                setWcName('');
                setMachines([]);
            } else {
                // add_machine: pre-populate one empty machine row
                setMachines([{ id: genId('M'), name: '', shift_id: '', efficiency_factor: 1.0, is_active: true, ignore_shifts: false }]);
            }
            setErrors([]);
        }
    }, [isOpen]);

    const addMachineRow = () => {
        setMachines(prev => [...prev, { id: genId('M'), name: '', shift_id: '', efficiency_factor: 1.0, is_active: true, ignore_shifts: false }]);
    };

    const removeMachineRow = (idx: number) => {
        setMachines(prev => prev.filter((_, i) => i !== idx));
    };

    const updateMachine = (idx: number, field: string, value: any) => {
        setMachines(prev => prev.map((m, i) => i === idx ? { ...m, [field]: value } : m));
    };

    const validate = (): boolean => {
        const errs: string[] = [];
        if (mode.type === 'create') {
            if (!wcId.trim()) errs.push('El ID del centro de trabajo es requerido.');
            if (!wcName.trim()) errs.push('El nombre del centro de trabajo es requerido.');
        }
        machines.forEach((m, i) => {
            if (!m.name.trim()) errs.push(`Máquina #${i + 1}: el nombre es requerido.`);
            if (!m.id.trim()) errs.push(`Máquina #${i + 1}: el ID es requerido.`);
        });
        setErrors(errs);
        return errs.length === 0;
    };

    const handleSave = async () => {
        if (!validate()) return;
        setSaving(true);
        try {
            if (mode.type === 'create') {
                const { error: wcErr } = await supabase.from('work_centers').insert([{ id: wcId.trim(), name: wcName.trim() }]);
                if (wcErr) throw new Error(wcErr.message || wcErr.details);
            }
            const targetWcId = mode.type === 'create' ? wcId.trim() : mode.wcId;
            for (const m of machines) {
                if (!m.name.trim()) continue;
                const { error: mErr } = await supabase.from('machines').insert([{
                    id: m.id.trim(),
                    name: m.name.trim(),
                    work_center_id: targetWcId,
                    shift_id: m.shift_id || null,
                    efficiency_factor: Number(m.efficiency_factor) || 1.0,
                    is_active: m.is_active,
                    ignore_shifts: m.ignore_shifts,
                }]);
                if (mErr) throw new Error(`Máquina "${m.name}": ${mErr.message || mErr.details}`);
            }
            await onSave();
            onClose();
        } catch (e: any) {
            onError(e.message);
        } finally {
            setSaving(false);
        }
    };

    if (!isOpen) return null;

    const isCreate = mode.type === 'create';
    const title = isCreate ? 'Nuevo Centro de Trabajo' : `Agregar Máquina a ${(mode as any).wcName}`;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={onClose}>
            <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-[2.5rem] w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden shadow-2xl animate-in fade-in zoom-in duration-200" onClick={e => e.stopPropagation()}>
                {/* Header */}
                <div className="p-8 border-b border-[var(--border-color)] flex justify-between items-center bg-[var(--bg-sidebar)] shrink-0">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-indigo-500/10 rounded-2xl border border-indigo-500/20 text-indigo-400"><Settings size={24} /></div>
                        <div>
                            <h3 className="text-xl font-black uppercase tracking-tighter text-[var(--text-main)]">{title}</h3>
                            <p className="text-[10px] text-[var(--text-muted)] font-bold uppercase tracking-widest mt-0.5">
                                {isCreate ? 'Complete los datos y agregue los equipos del centro' : 'Ingrese los datos del nuevo equipo'}
                            </p>
                        </div>
                    </div>
                    <button onClick={onClose} className="text-[var(--text-muted)] hover:text-[var(--text-main)] transition-colors"><Minus size={24} className="rotate-45" /></button>
                </div>

                {/* Body */}
                <div className="flex-1 overflow-y-auto p-8 space-y-8 custom-scrollbar">
                    {/* WC fields — only in create mode */}
                    {isCreate && (
                        <div className="grid grid-cols-2 gap-6">
                            <div>
                                <label className="text-[9px] font-black text-[var(--text-muted)] uppercase tracking-widest mb-2 block">ID del Centro *</label>
                                <input value={wcId} onChange={e => setWcId(e.target.value.toUpperCase())}
                                    className="w-full bg-[var(--bg-main)] border border-[var(--border-color)] rounded-xl px-4 py-3 text-sm font-bold text-indigo-400 outline-none focus:border-indigo-500 font-mono transition-all" />
                            </div>
                            <div>
                                <label className="text-[9px] font-black text-[var(--text-muted)] uppercase tracking-widest mb-2 block">Nombre del Centro *</label>
                                <input value={wcName} onChange={e => setWcName(e.target.value)}
                                    placeholder="Ej: Línea de Corte 1"
                                    className="w-full bg-[var(--bg-main)] border border-[var(--border-color)] rounded-xl px-4 py-3 text-sm font-bold text-[var(--text-main)] outline-none focus:border-indigo-500 transition-all" />
                            </div>
                        </div>
                    )}

                    {/* Machines section */}
                    <div>
                        <div className="flex items-center justify-between mb-4">
                            <h4 className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest flex items-center gap-2">
                                <Cpu size={12} /> {isCreate ? 'Equipos / Máquinas' : 'Nuevo Equipo'}
                            </h4>
                            {isCreate && (
                                <button onClick={addMachineRow}
                                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[9px] font-black uppercase tracking-widest hover:bg-emerald-500/20 transition-all">
                                    <Plus size={10} /> Agregar equipo
                                </button>
                            )}
                        </div>

                        {machines.length === 0 && isCreate && (
                            <div className="text-center py-8 border border-dashed border-[var(--border-color)] rounded-2xl">
                                <Cpu size={24} className="mx-auto mb-2 text-[var(--text-muted)]" />
                                <p className="text-[var(--text-muted)] text-xs">Sin equipos aún. Podes agregar máquinas ahora o después.</p>
                            </div>
                        )}

                        <div className="space-y-4">
                            {machines.map((m, idx) => (
                                <div key={idx} className="bg-[var(--bg-sidebar)] border border-[var(--border-color)] rounded-2xl p-5 space-y-4">
                                    <div className="flex items-center justify-between">
                                        <span className="text-[9px] font-black text-emerald-400 uppercase tracking-widest">Equipo #{idx + 1}</span>
                                        {machines.length > 1 && isCreate && (
                                            <button onClick={() => removeMachineRow(idx)} className="p-1.5 text-rose-400 hover:bg-rose-500/10 rounded-lg transition-all"><Minus size={14} /></button>
                                        )}
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="text-[8px] font-black text-[var(--text-muted)] uppercase tracking-widest mb-1.5 block">ID Equipo *</label>
                                            <input value={m.id} onChange={e => updateMachine(idx, 'id', e.target.value.toUpperCase())}
                                                className="w-full bg-[var(--bg-main)] border border-[var(--border-color)] rounded-xl px-3 py-2 text-xs font-bold text-indigo-400 outline-none focus:border-indigo-500 font-mono transition-all" />
                                        </div>
                                        <div>
                                            <label className="text-[8px] font-black text-[var(--text-muted)] uppercase tracking-widest mb-1.5 block">Nombre Equipo *</label>
                                            <input value={m.name} onChange={e => updateMachine(idx, 'name', e.target.value)}
                                                placeholder="Ej: Prensa Hidráulica #1"
                                                className="w-full bg-[var(--bg-main)] border border-[var(--border-color)] rounded-xl px-3 py-2 text-xs font-bold text-[var(--text-main)] outline-none focus:border-indigo-500 transition-all" />
                                        </div>
                                        <div>
                                            <label className="text-[8px] font-black text-[var(--text-muted)] uppercase tracking-widest mb-1.5 block">Turno Asignado</label>
                                            <select value={m.shift_id} onChange={e => updateMachine(idx, 'shift_id', e.target.value)}
                                                disabled={m.ignore_shifts}
                                                className="w-full bg-[var(--bg-main)] border border-[var(--border-color)] rounded-xl px-3 py-2 text-xs font-bold text-emerald-400 outline-none focus:border-emerald-500 disabled:opacity-30 transition-all">
                                                <option value="">Sin turno asignado</option>
                                                {shifts.map(s => <option key={s.id} value={s.id}>{s.name} ({s.start_time}-{s.end_time})</option>)}
                                            </select>
                                        </div>
                                        <div>
                                            <label className="text-[8px] font-black text-[var(--text-muted)] uppercase tracking-widest mb-1.5 block">Factor de Eficiencia</label>
                                            <input type="number" step="0.05" min="0.1" max="2.0" value={m.efficiency_factor}
                                                onChange={e => updateMachine(idx, 'efficiency_factor', Number(e.target.value))}
                                                className="w-full bg-[var(--bg-main)] border border-[var(--border-color)] rounded-xl px-3 py-2 text-xs font-bold text-emerald-400 outline-none focus:border-emerald-500 transition-all" />
                                        </div>
                                    </div>
                                    <div className="flex gap-3">
                                        <div className="flex items-center gap-2 bg-[var(--bg-main)] border border-[var(--border-color)] rounded-xl px-3 py-2 cursor-pointer flex-1"
                                            onClick={() => updateMachine(idx, 'ignore_shifts', !m.ignore_shifts)}>
                                            <div className={`w-8 h-4 rounded-full transition-colors relative shrink-0 ${m.ignore_shifts ? 'bg-emerald-500' : 'bg-slate-700'}`}>
                                                <div className={`absolute top-0.5 w-3 h-3 bg-white rounded-full transition-all ${m.ignore_shifts ? 'left-4' : 'left-0.5'}`} />
                                            </div>
                                            <span className="text-[8px] font-black text-[var(--text-muted)] uppercase">Opera 24/7</span>
                                        </div>
                                        <div className="flex items-center gap-2 bg-[var(--bg-main)] border border-[var(--border-color)] rounded-xl px-3 py-2 cursor-pointer flex-1"
                                            onClick={() => updateMachine(idx, 'is_active', !m.is_active)}>
                                            <div className={`w-8 h-4 rounded-full transition-colors relative shrink-0 ${m.is_active ? 'bg-emerald-500' : 'bg-rose-600'}`}>
                                                <div className={`absolute top-0.5 w-3 h-3 bg-white rounded-full transition-all ${m.is_active ? 'left-4' : 'left-0.5'}`} />
                                            </div>
                                            <span className="text-[8px] font-black text-[var(--text-muted)] uppercase">Activo</span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Validation errors */}
                    {errors.length > 0 && (
                        <div className="bg-rose-500/10 border border-rose-500/20 rounded-2xl p-4 space-y-1">
                            {errors.map((e, i) => <p key={i} className="text-xs text-rose-400 font-bold flex items-center gap-2"><AlertCircle size={12} />{e}</p>)}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-6 bg-[var(--bg-sidebar)] border-t border-[var(--border-color)] flex justify-end gap-3 shrink-0">
                    <button onClick={onClose} className="px-6 py-3 rounded-xl border border-[var(--border-color)] text-xs font-black uppercase tracking-widest text-[var(--text-muted)] hover:bg-[var(--bg-main)] transition-all">Cancelar</button>
                    <button onClick={handleSave} disabled={saving}
                        className="bg-indigo-600 hover:bg-indigo-500 text-white px-8 py-3 rounded-xl font-black uppercase text-[10px] tracking-widest shadow-lg flex items-center gap-2 transition-all active:scale-95 disabled:opacity-60">
                        {saving ? <RefreshCw className="animate-spin" size={14} /> : <CheckCircle2 size={14} />}
                        {saving ? 'Guardando...' : (isCreate ? 'Crear Centro de Trabajo' : 'Agregar Máquina')}
                    </button>
                </div>
            </div>
        </div>
    );
};

// --- Main Explorer ---

const DataExplorer: React.FC = () => {
    const [viewMode, setViewMode] = useState<'table' | 'visual'>('table');
    const [routingViewMode, setRoutingViewMode] = useState<'cards' | 'layout'>('cards');
    const [activeTab, setActiveTab] = useState<'inputs' | 'outputs'>('inputs');
    const { t } = useTranslation();
    const [subTab, setSubTab] = useState('items');
    const [data, setData] = useState<any[]>([]);
    const [allData, setAllData] = useState<{ items: any[], bom: any[], workCenters: any[], machines: any[], routings: any[], shifts: any[], scenarios: any[] }>({
        items: [], bom: [], workCenters: [], machines: [], routings: [], shifts: [], scenarios: []
    });
    const [selectedScenarioId, setSelectedScenarioId] = useState<string>('');
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [errorMsg, setErrorMsg] = useState<string | null>(null);
    const [expandedRows, setExpandedRows] = useState<Record<string, boolean>>({});
    const [erpSyncLoading, setErpSyncLoading] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    // ─ Toast system ───────────────────────────────────────
    const [toasts, setToasts] = useState<Toast[]>([]);
    const showToast = useCallback((type: ToastType, title: string, message?: string) => {
        const id = Date.now();
        setToasts(prev => [...prev, { id, type, title, message }]);
        setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 5000);
    }, []);
    const removeToast = useCallback((id: number) => setToasts(prev => prev.filter(t => t.id !== id)), []);

    // ─ Confirm dialog ──────────────────────────────────
    const [confirmDialog, setConfirmDialog] = useState<{ open: boolean; id: string }>({ open: false, id: '' });

    // ─ Create Item Modal ───────────────────────────────
    const [createItemOpen, setCreateItemOpen] = useState(false);

    // ─ Create / Edit Work Center Modal ────────────────
    const [wcModalOpen, setWcModalOpen] = useState(false);
    const [wcModalMode, setWcModalMode] = useState<WCModalMode>({ type: 'create' });

    const handleAddMachineToWC = (wcId: string) => {
        const wc = allData.workCenters.find(w => w.id === wcId);
        setWcModalMode({ type: 'add_machine', wcId, wcName: wc?.name || wcId });
        setWcModalOpen(true);
    };

    const handleERPSync = async () => {
        setErpSyncLoading(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('User not authenticated');

            const { data: settings } = await supabase
                .from('aps_settings')
                .select('*')
                .eq('user_id', user.id)
                .single();

            if (!settings?.erp_endpoint) {
                showToast('warning', 'ERP no configurado', 'Configure el endpoint ERP en Ajustes primero');
                return;
            }

            // Example mapping for the currently active tab if applicable, 
            // or just trigger a general sync. For now, let's map 'items' as an example.
            const result = await erpMigrationService.migrateTable(subTab === 'items' ? 'items' : 'items', {
                endpoint: settings.erp_endpoint,
                apiKey: settings.erp_api_key,
                mapping: {
                    // This mapping should ideally come from configuration or be hardcoded for the specific ERP
                    'id': 'id',
                    'name': 'name',
                    'uom': 'unit_of_measure',
                    'stock': 'current_stock'
                }
            });

            if (result.success) {
                showToast('success', 'Sincronización completada', result.message);
                await fetchData();
            } else {
                showToast('warning', 'Sincronización', result.message);
            }
        } catch (e: any) {
            console.error(e);
            showToast('error', 'Error de sincronización', e.message);
        } finally {
            setErpSyncLoading(false);
        }
    };

    const tabs = {
        inputs: [
            { id: 'items', label: t('items_tab'), icon: Package, table: 'items' },
            { id: 'work_orders', label: t('demand_tab'), icon: FileText, table: 'work_orders' },
            { id: 'erp_ppo', label: t('erp_purchases_tab'), icon: ShoppingCart, table: 'erp_purchase_orders' },
            { id: 'bom', label: t('structure_bom_tab'), icon: GitBranch, table: 'items', pivot: true },
            { id: 'work_centers', label: t('plants_equipment_tab'), icon: Settings, table: 'work_centers' },
            { id: 'routings', label: t('flows_routings_tab'), icon: Shuffle, table: 'routings' },
            { id: 'shifts', label: t('shifts_tab'), icon: Timer, table: 'shifts' },
            { id: 'maintenance_plans', label: t('maintenance_tab'), icon: AlertCircle, table: 'maintenance_plans' },
        ],
        outputs: [
            { id: 'pwo', label: t('pwo_proposals_tab'), icon: FileText, table: 'proposed_work_orders' },
            { id: 'ppo', label: t('ppo_proposals_tab'), icon: ShoppingCart, table: 'proposed_purchase_orders' },
            { id: 'optimization', label: t('optimization_tab'), icon: TrendingDown, table: 'optimization_suggestions' },
        ]
    };

    useEffect(() => {
        fetchAll();
    }, []);

    useEffect(() => {
        fetchData();
        setExpandedRows({});
    }, [subTab, activeTab, selectedScenarioId]);

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
        if (subTab === 'optimization') tableName = 'optimization_suggestions';
        if (subTab === 'routings') tableName = 'routings';
        if (subTab === 'bom') tableName = 'bom';

        try {
            let query = supabase.from(tableName).select('*');

            // Si es un tab de salida, unimos con items para el nombre y filtramos por escenario
            if (subTab === 'pwo' || subTab === 'ppo' || subTab === 'erp_ppo' || subTab === 'optimization') {
                query = supabase.from(tableName).select(`*, item:items!item_id(name)`);
                if (selectedScenarioId && (subTab === 'pwo' || subTab === 'ppo' || subTab === 'optimization')) {
                    query = query.eq('scenario_id', selectedScenarioId);
                }
            }

            const { data: result, error } = await query;
            if (error) throw error;

            const flattened = (result || []).map((row: any) => {
                const newRow = { ...row };
                if (row.item) newRow.item = row.item.name;

                // --- Cálculo de Saldo ---
                if (subTab === 'work_orders') {
                    const ordered = Number(row.quantity_ordered || 0);
                    const completed = Number(row.quantity_completed || 0);
                    newRow.balance = Math.max(0, ordered - completed);
                }

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
            showToast('error', 'Error al actualizar', 'No se pudo cambiar el estado de la OC');
        }
    };

    const handleDeleteRecord = (id: string) => {
        setConfirmDialog({ open: true, id });
    };

    const doDelete = async () => {
        const id = confirmDialog.id;
        setConfirmDialog({ open: false, id: '' });
        try {
            const tableName = tabs[activeTab].find(t => t.id === subTab)?.table || subTab;
            const { error } = await supabase.from(tableName).delete().eq('id', id);
            if (error) throw error;
            showToast('success', 'Registro eliminado', 'El registro fue borrado correctamente');
            fetchData();
        } catch (e: any) {
            console.error(e);
            showToast('error', 'Error al eliminar', e.message);
        }
    };

    const handleCreateRecord = () => {
        if (subTab === 'items') {
            setCreateItemOpen(true);
        } else if (subTab === 'work_centers') {
            setWcModalMode({ type: 'create' });
            setWcModalOpen(true);
        } else {
            // Para otras tablas, inserción rápida con defaults
            handleQuickCreate();
        }
    };

    const handleQuickCreate = async () => {
        setIsSaving(true);
        try {
            const activeTabData = tabs[activeTab].find(tab => tab.id === subTab);
            const tableName = activeTabData?.table || subTab;
            const newId = `MAN-${Math.random().toString(36).substr(2, 5).toUpperCase()}`;
            let payload: any = { id: newId };
            if (tableName === 'work_centers') { payload.name = 'NUEVO CENTRO PRODUCTIVO'; }
            else if (tableName === 'machines') { payload.name = 'NUEVA MAQUINA'; payload.work_center_id = allData.workCenters[0]?.id || 'WC-01'; payload.efficiency_factor = 1.0; }
            else if (tableName === 'routings') { payload.id = undefined; payload.item_id = allData.items[0]?.id; payload.operation_sequence = 10; payload.operation_description = 'OPERACION MANUAL'; payload.work_center_id = allData.workCenters[0]?.id || 'WC-01'; payload.setup_time_minutes = 0; payload.run_time_minutes_per_unit = 1; }
            else if (tableName === 'shifts') { payload.name = 'NUEVO TURNO'; payload.start_time = '08:00'; payload.end_time = '17:00'; }
            else if (tableName === 'erp_purchase_orders') { payload.item_id = allData.items[0]?.id; payload.quantity_ordered = 1; payload.expected_delivery_date = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(); payload.status = 'Open'; }
            else if (tableName === 'work_orders') { payload.item_id = allData.items[0]?.id; payload.quantity_ordered = 1; payload.quantity_completed = 0; payload.due_date = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(); payload.status = 'New'; }
            const { error } = await supabase.from(tableName).insert([payload]);
            if (error) throw error;
            showToast('success', 'Registro creado', 'Editá los datos haciendo click en el lápiz');
            await fetchData();
            await fetchAll();
        } catch (e: any) {
            console.error('Error creating record:', e);
            showToast('error', 'Error al crear', e.message || e.details || 'Error de validación');
        } finally {
            setIsSaving(false);
        }
    };

    const handleSaveNewItem = async (form: any, components: { item_id: string; qty: number }[]) => {
        const payload = {
            id: form.id,
            name: form.name,
            item_type: form.item_type,
            uom: form.uom,
            description: form.description || null,
            lead_time_days: form.lead_time_days ? Number(form.lead_time_days) : null,
            min_purchase_qty: form.min_purchase_qty ? Number(form.min_purchase_qty) : 1,
            initial_stock: Number(form.current_stock || 0),   // alias: mismo valor
            current_stock: Number(form.current_stock || 0),
            safety_stock: Number(form.safety_stock || 0),
            unit_cost: Number(form.unit_cost || 0),
        };
        const { error: itemErr } = await supabase.from('items').insert([payload]);
        if (itemErr) {
            const msg = itemErr.message || itemErr.details || JSON.stringify(itemErr);
            showToast('error', 'Error al guardar artículo', msg);
            throw new Error(msg);
        }
        if (components.length > 0) {
            const bomRows = components.map(c => ({ parent_item_id: form.id, component_item_id: c.item_id, quantity_required: c.qty }));
            const { error: bomErr } = await supabase.from('bom').insert(bomRows);
            if (bomErr) { showToast('warning', 'Artículo creado, error en BOM', bomErr.message || bomErr.details || 'Error desconocido'); }
        }
        showToast('success', 'Artículo creado', `"${form.name}" fue guardado correctamente`);
        await fetchData();
        await fetchAll();
    };

    const filteredData = data.filter(row =>
        Object.values(row).some(val => String(val).toLowerCase().includes(searchTerm.toLowerCase()))
    );

    const getColumns = () => {
        if (data.length === 0) return [];
        const baseCols = Object.keys(data[0]).filter(c => !['id', 'scenario_id', 'created_at'].includes(c));

        // Re-ordenar columnas para Demanda si es necesario
        if (subTab === 'work_orders') {
            const order = ['item_id', 'quantity_ordered', 'quantity_completed', 'balance', 'due_date', 'status', 'priority'];
            return order.filter(c => baseCols.includes(c) || c === 'balance');
        }

        return baseCols;
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
        } else if (subTab === 'work_centers') {
            // Expand the row to show the machine sub-table so the user can click a machine
            toggleRow(row.id);
        } else if (subTab === 'shifts') {
            // Expand the row to show machines assigned to this shift
            toggleRow(row.id);
        }
    };

    return (
        <div className="flex h-full overflow-hidden bg-[var(--bg-main)] transition-colors">
            <main className="flex-1 flex flex-col h-full overflow-hidden relative text-[var(--text-main)] transition-colors">
                <TopHeader title={t('master_explorer')} icon="database" />
                {/* Fixed Header section */}
                <div className="p-6 lg:p-8 pb-4 shrink-0 bg-[var(--bg-main)]/80 backdrop-blur-md z-20">
                    <div className="max-w-[1400px] mx-auto">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-[var(--bg-card)] p-6 rounded-3xl border border-[var(--border-color)] shadow-2xl">
                            <div className="flex items-center gap-5">
                                <div className="p-3 bg-indigo-500/20 rounded-2xl border border-indigo-500/30 text-indigo-400">
                                    <Database size={32} />
                                </div>
                                <div className="min-w-0">
                                    <h1 className="text-3xl font-bold text-[var(--text-main)] tracking-tight font-display truncate">{t('plant_engineering')}</h1>
                                    <p className="text-[var(--text-muted)] text-sm truncate">{t('audit_desc')}</p>
                                    {allData.machines.some(m => !m.shift_id && !m.ignore_shifts) && (
                                        <div className="mt-2 flex items-center gap-2 bg-rose-500/10 border border-rose-500/20 px-3 py-1.5 rounded-xl text-[10px] font-bold text-rose-400 animate-pulse w-fit">
                                            <AlertCircle size={14} />
                                            <span>{t('no_shift_alert')}</span>
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="flex items-center gap-4 shrink-0 min-w-[340px] justify-end">
                                <div className="flex bg-[var(--bg-input)] p-1.5 rounded-2xl border border-[var(--border-color)] shadow-inner">
                                    <button onClick={() => setViewMode('visual')} className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all ${viewMode === 'visual' ? 'bg-indigo-600 text-white shadow-xl' : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'}`}><GitBranch size={16} /> {t('visual')}</button>
                                    <button onClick={() => setViewMode('table')} className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all ${viewMode === 'table' ? 'bg-indigo-600 text-white shadow-xl' : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'}`}><LayoutGrid size={16} /> {t('tab_tables')}</button>
                                </div>
                                <div className="flex bg-[var(--bg-input)] p-1.5 rounded-2xl border border-[var(--border-color)] shadow-inner h-fit">
                                    <button onClick={() => { setActiveTab('inputs'); setSubTab('items'); }} className={`px-5 py-2 rounded-xl transition-all text-[10px] font-black uppercase tracking-[0.1em] ${activeTab === 'inputs' ? 'bg-[var(--bg-card)] text-indigo-400 border border-[var(--border-color)] shadow-lg' : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'}`}>{t('source')}</button>
                                    <button onClick={() => { setActiveTab('outputs'); setSubTab('pwo'); }} className={`px-5 py-2 rounded-xl transition-all text-[10px] font-black uppercase tracking-[0.1em] ${activeTab === 'outputs' ? 'bg-[var(--bg-card)] text-indigo-400 border border-[var(--border-color)] shadow-lg' : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'}`}>{t('results')}</button>
                                </div>
                                <div className="flex items-center gap-4 shrink-0 justify-end">
                                    <button
                                        onClick={handleERPSync}
                                        disabled={erpSyncLoading}
                                        className="flex items-center gap-2 px-5 py-2 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-[10px] font-black uppercase tracking-widest hover:bg-indigo-500/20 transition-all disabled:opacity-50"
                                    >
                                        {erpSyncLoading ? <RefreshCw className="animate-spin" size={14} /> : <Database size={14} />}
                                        {erpSyncLoading ? t('sync_in_progress') : t('sync_with_erp')}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Content Quadrant */}
                <div className="flex-1 flex flex-col p-6 lg:p-8 pt-0 overflow-hidden">
                    <div className="max-w-[1400px] w-full mx-auto flex-1 flex flex-col gap-6 overflow-hidden">

                        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none shrink-0">
                            {tabs[activeTab].map((t) => (
                                <button key={t.id} onClick={() => setSubTab(t.id)} className={`flex items-center gap-3 px-5 py-3 rounded-2xl border transition-all text-sm font-bold shrink-0 ${subTab === t.id ? 'bg-[var(--bg-card)] border-indigo-500 text-indigo-400 shadow-2xl' : 'border-[var(--border-color)] bg-[var(--bg-sidebar)]/30 text-[var(--text-muted)] hover:border-[var(--text-muted)]'}`}>
                                    <Plus size={14} className={subTab === t.id ? 'text-indigo-500' : 'text-[var(--text-muted)]'} />
                                    <span>{t.label}</span>
                                </button>
                            ))}
                        </div>

                        <div className="bg-[var(--bg-sidebar)]/50 border border-[var(--border-color)] rounded-3xl overflow-hidden shadow-2xl flex-1 flex flex-col">
                            {loading ? (
                                <div className="flex flex-col items-center justify-center flex-1 gap-6"><div className="w-12 h-12 border-4 border-indigo-500/10 border-t-indigo-500 rounded-full animate-spin"></div><p className="text-[var(--text-muted)] text-sm font-bold uppercase tracking-widest animate-pulse">{t('syncing_engineering')}</p></div>
                            ) : errorMsg ? (
                                <div className="text-center py-32 flex-1 flex flex-col justify-center"><AlertCircle size={48} className="mx-auto mb-4 text-red-500 opacity-50" /><p className="text-[var(--text-main)] font-bold">{errorMsg}</p></div>
                            ) : viewMode === 'table' ? (
                                <div className="flex-1 flex flex-col overflow-hidden">
                                    <div className="p-4 border-b border-[var(--border-color)] flex justify-between items-center bg-[var(--bg-sidebar)] min-w-max sticky top-0 z-20">
                                        <div className="relative w-full md:w-96">
                                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" size={16} />
                                            <input type="text" placeholder={t('quick_search')} className="w-full bg-[var(--bg-input)] border border-[var(--border-color)] rounded-xl py-2 pl-10 pr-4 text-[var(--text-main)] text-sm outline-none focus:border-indigo-500/50 transition-all font-bold" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
                                        </div>

                                        {activeTab === 'inputs' && (
                                            <button
                                                onClick={handleCreateRecord}
                                                disabled={isSaving}
                                                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 text-[10px] font-black uppercase tracking-widest hover:bg-emerald-500/20 transition-all"
                                            >
                                                {isSaving ? <RefreshCw size={14} className="animate-spin" /> : <Plus size={14} />}
                                                {t('create_new')}
                                            </button>
                                        )}
                                    </div>
                                    <div className="flex-1 overflow-auto custom-scrollbar">
                                        <table className="w-full text-left border-collapse min-w-max relative">
                                            <thead className="sticky top-0 z-10 bg-[var(--bg-sidebar)]">
                                                <tr className="border-b border-[var(--border-color)] bg-[var(--bg-sidebar)]">
                                                    {activeTab !== 'outputs' && subTab !== 'bom' && subTab !== 'routings' && <th className="px-6 py-4 text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest w-12 text-center bg-[var(--bg-sidebar)]">+/-</th>}
                                                    {getColumns().map(col => (
                                                        <th key={col} className="px-6 py-4 text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest bg-[var(--bg-sidebar)]">
                                                            {col === 'is_fixed' ? t('reprogrammable') : (t(col as any) !== col ? t(col as any) : col.replace(/_/g, ' '))}
                                                        </th>
                                                    ))}
                                                    {activeTab === 'inputs' && <th className="px-6 py-4 text-[10px] font-black text-indigo-400 uppercase tracking-widest bg-[var(--bg-sidebar)] text-right">{t('actions')}</th>}
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-[var(--border-color)]/50">
                                                {filteredData.map((row, idx) => (
                                                    <React.Fragment key={row.id || idx}>
                                                        <tr className="hover:bg-indigo-500/[0.02] transition-colors group">
                                                            {activeTab !== 'outputs' && subTab !== 'bom' && subTab !== 'routings' && (
                                                                <td className="px-6 py-4 text-center cursor-pointer" onClick={() => toggleRow(row.id)}>
                                                                    {expandedRows[row.id] ? <Minus size={14} className="text-red-400 mx-auto" /> : <Plus size={14} className="text-indigo-400 mx-auto group-hover:scale-125 transition-transform" />}
                                                                </td>
                                                            )}
                                                            {getColumns().map((col, vIdx) => (
                                                                <td key={vIdx} className="px-6 py-4 text-sm text-[var(--text-muted)] group-hover:text-[var(--text-main)]">
                                                                    {(col === 'name' || col === 'parent_item_id' || col === 'component_item_id' || col === 'item_id') ? (
                                                                        <span
                                                                            className="font-bold text-[var(--text-main)] cursor-pointer hover:text-indigo-400 hover:underline underline-offset-4"
                                                                            onClick={() => handleArticleClick(row[col])}
                                                                        >
                                                                            {row[col]}
                                                                        </span>
                                                                    ) : col === 'is_fixed' ? (
                                                                        <button
                                                                            onClick={() => handleToggleFixed(row.id, row.is_fixed)}
                                                                            className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase transition-all ${!row.is_fixed ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' : 'bg-rose-500/10 text-rose-500 border border-rose-500/20'}`}
                                                                        >
                                                                            {row[col] ? t('fixed_status') : t('flexible_status')}
                                                                        </button>
                                                                    ) : col === 'severity' || col === 'status' ? (
                                                                        <div className="flex items-center gap-2">
                                                                            <div className={`size-4 rounded-full shadow-lg ${String(row[col]).toLowerCase().includes('high') ||
                                                                                String(row[col]).toLowerCase().includes('critical') ||
                                                                                String(row[col]).toLowerCase().includes('red') ||
                                                                                String(row[col]).toLowerCase().includes('retrag') ||
                                                                                String(row[col]).toLowerCase().includes('crit') ? 'bg-rose-500 shadow-rose-500/40 border border-rose-400/30' :
                                                                                String(row[col]).toLowerCase().includes('medium') ||
                                                                                    String(row[col]).toLowerCase().includes('watch') ||
                                                                                    String(row[col]).toLowerCase().includes('yellow') ||
                                                                                    String(row[col]).toLowerCase().includes('warning') ||
                                                                                    String(row[col]).toLowerCase().includes('aler') ? 'bg-amber-500 shadow-amber-500/40 border border-amber-400/30' :
                                                                                    'bg-emerald-500 shadow-emerald-500/40 border border-emerald-400/30'
                                                                                }`} title={row[col]} />
                                                                        </div>
                                                                    ) : col === 'balance' ? (
                                                                        <span className="font-black text-indigo-400">
                                                                            {row[col]}
                                                                        </span>
                                                                    ) : String(row[col] ?? '-')}
                                                                </td>
                                                            ))}
                                                            {activeTab === 'inputs' && (
                                                                <td className="px-6 py-4 text-right">
                                                                    <div className="flex justify-end gap-2">
                                                                        <button
                                                                            onClick={(e) => { e.stopPropagation(); handleMainRowClick(row, subTab === 'items' ? 'name' : 'machines'); }}
                                                                            className="p-2 text-indigo-400 hover:bg-indigo-500/10 rounded-lg transition-all"
                                                                            title={t('edit_btn')}
                                                                        >
                                                                            <Edit2 size={16} />
                                                                        </button>
                                                                        <button
                                                                            onClick={(e) => { e.stopPropagation(); handleDeleteRecord(row.id); }}
                                                                            className="p-2 text-rose-500 hover:bg-rose-500/10 rounded-lg transition-all"
                                                                            title={t('delete_btn')}
                                                                        >
                                                                            <Trash2 size={16} />
                                                                        </button>
                                                                    </div>
                                                                </td>
                                                            )}
                                                        </tr>
                                                        {expandedRows[row.id] && (
                                                            <tr>
                                                                <td colSpan={getColumns().length + 1} className="bg-[var(--bg-main)]/80">
                                                                    {(subTab === 'bom' || subTab === 'items') && (
                                                                        <div className={`grid grid-cols-1 ${row.item_type === 'COMPRADO' ? '' : 'lg:grid-cols-2'} gap-4`}>
                                                                            {row.item_type !== 'COMPRADO' && (
                                                                                <BOMSubTable parentId={row.id} bom={allData.bom} items={allData.items} onItemClick={handleArticleClick} />
                                                                            )}
                                                                            <WhereUsedSubTable itemId={row.id} bom={allData.bom} items={allData.items} onItemClick={handleArticleClick} />
                                                                        </div>
                                                                    )}
                                                                    {subTab === 'work_centers' && <MachineSubTable wcId={row.id} machines={allData.machines} onMachineClick={handleMachineClick} onAddMachine={handleAddMachineToWC} />}
                                                                    {subTab === 'routings' && <RoutingSubTable itemId={row.id} routings={allData.routings} />}
                                                                    {subTab === 'work_orders' && <OrderDetailsSubTable order={row} bom={allData.bom} items={allData.items} routings={allData.routings} onItemClick={handleArticleClick} />}

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
                                </div>
                            ) : (
                                <div className="p-8 flex-1 overflow-auto custom-scrollbar">
                                    {subTab === 'bom' ? (
                                        <div className="space-y-12 overflow-x-auto custom-scrollbar pb-6">
                                            {allData.items.filter(i => allData.bom.some(b => b.parent_item_id === i.id)).map(prod => (
                                                <div key={prod.id} className="bg-[var(--bg-sidebar)]/20 p-6 rounded-3xl border border-[var(--border-color)] min-w-max">
                                                    <h3 className="text-xl font-bold text-[var(--text-main)] mb-6 flex items-center gap-3"><div className="size-2 rounded-full bg-indigo-500"></div> {t('structure_label')} {prod.name}</h3>
                                                    <BOMTree items={allData.items} bom={allData.bom} rootId={prod.id} />
                                                </div>
                                            ))}
                                        </div>
                                    ) : subTab === 'routings' ? (
                                        <div className="flex flex-col h-full overflow-hidden">
                                            <div className="flex bg-[var(--bg-input)] p-1.5 rounded-2xl border border-[var(--border-color)] shadow-inner w-fit mb-4 shrink-0">
                                                <button onClick={() => setRoutingViewMode('cards')} className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all ${routingViewMode === 'cards' ? 'bg-indigo-600 text-white shadow-xl' : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'}`}><LayoutGrid size={16} /> Tarjetas</button>
                                                <button onClick={() => setRoutingViewMode('layout')} className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all ${routingViewMode === 'layout' ? 'bg-indigo-600 text-white shadow-xl' : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'}`}><Factory size={16} /> Layout Interactivo</button>
                                            </div>
                                            <div className="flex-1 overflow-hidden relative">
                                                {routingViewMode === 'cards' ? (
                                                    <div className="overflow-x-auto custom-scrollbar pb-6 h-full absolute inset-0">
                                                        <RoutingFlow items={allData.items} routings={allData.routings} workCenters={allData.workCenters} machines={allData.machines} />
                                                    </div>
                                                ) : (
                                                    <div className="h-full absolute inset-0">
                                                        <PlantLayoutAnimated items={allData.items} routings={allData.routings} workCenters={allData.workCenters} machines={allData.machines} />
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    ) : subTab === 'work_centers' ? (
                                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                            {allData.workCenters.map(wc => {
                                                const wcMachines = allData.machines.filter(m => m.work_center_id === wc.id);
                                                return (
                                                    <div key={wc.id} className="bg-[var(--bg-card)] border border-[var(--border-color)] p-6 rounded-3xl group hover:border-indigo-500/50 transition-all">
                                                        <div className="flex justify-between items-start mb-6"><div className="p-3 bg-indigo-500/10 rounded-2xl text-indigo-400"><Settings size={24} /></div></div>
                                                        <h4 className="text-lg font-bold text-[var(--text-main)] mb-1">{wc.name}</h4>
                                                        <p className="text-[var(--text-muted)] text-xs font-bold uppercase tracking-widest mb-6">{wc.id}</p>
                                                        <div className="space-y-4">
                                                            <p className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-[0.2em] mb-2">{t('machinery_label')} ({wcMachines.length})</p>
                                                            <div className="flex flex-wrap gap-2">
                                                                {wcMachines.map(m => (
                                                                    <div
                                                                        key={m.id}
                                                                        className={`flex items-center gap-2 bg-[var(--bg-main)]/50 border px-3 py-2 rounded-xl text-xs transition-all cursor-pointer ${(!m.shift_id && !m.ignore_shifts) ? 'border-rose-500/50 text-rose-400 hover:bg-rose-500/10' : 'border-[var(--border-color)] text-[var(--text-muted)] hover:border-emerald-500/50 hover:text-[var(--text-main)]'}`}
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
                                        <div className="text-center py-20 bg-[var(--bg-main)]/20 rounded-3xl border border-dashed border-[var(--border-color)] w-full flex-1 flex flex-col justify-center">
                                            <LayoutGrid size={48} className="mx-auto mb-4 text-[var(--text-muted)]" />
                                            <p className="text-[var(--text-muted)] font-bold uppercase tracking-widest">{t('view_not_available')}</p>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                <ArticleMasterModal isOpen={!!selectedArticle} onClose={() => setSelectedArticle(null)} article={selectedArticle} onSave={fetchData} />
                <MachineMasterModal isOpen={!!selectedMachine} onClose={() => setSelectedMachine(null)} machine={selectedMachine} shifts={allData.shifts} onSave={fetchAll} />
                <CreateWorkCenterModal
                    isOpen={wcModalOpen}
                    onClose={() => setWcModalOpen(false)}
                    mode={wcModalMode}
                    shifts={allData.shifts}
                    onSave={async () => { await fetchData(); await fetchAll(); }}
                    onError={(msg) => showToast('error', 'Error al guardar', msg)}
                />
            </main>

            {/* Sistema global de notificaciones y diálogos */}
            <ToastContainer toasts={toasts} onRemove={removeToast} />

            <ConfirmDialog
                isOpen={confirmDialog.open}
                title="Eliminar Registro"
                message="Esta acción es irreversible. ¿Seguro que querés borrar este registro?"
                confirmLabel="Sí, eliminar"
                danger={true}
                onConfirm={doDelete}
                onCancel={() => setConfirmDialog({ open: false, id: '' })}
            />

            <CreateItemModal
                isOpen={createItemOpen}
                onClose={() => setCreateItemOpen(false)}
                availableItems={allData.items}
                onSave={handleSaveNewItem}
            />
        </div>
    );
};

export default DataExplorer;
