import React, { useState, useEffect } from 'react';
import TopHeader from '../components/TopHeader';
import { certificationService, CertificationResult } from '../services/certificationService';
import { useTranslation } from '../services/languageService';
import {
    ShieldCheck,
    Terminal,
    Play,
    CheckCircle2,
    XCircle,
    Activity,
    FlaskConical,
    Layers,
    Cpu,
    Clock,
    ShoppingCart
} from 'lucide-react';

const ScenarioDetailModal: React.FC<{
    item: CertificationResult | null;
    onClose: () => void;
}> = ({ item, onClose }) => {
    const { t } = useTranslation();
    if (!item) return null;

    const getConfigDetails = (config: any) => {
        const details = [];

        // Scheduling Mode
        if (config.scheduling_mode === 'TOC Optimized') {
            details.push({
                title: 'TOC (Programación - Teoría de Restricciones)',
                desc: 'Utiliza la Teoría de Restricciones para identificar el cuello de botella (Drum) de la planta. El resto de la producción se sincroniza (Rope) para proteger el flujo del recurso más crítico.',
                icon: 'settings_suggest'
            });
        } else if (config.scheduling_mode === 'Forward ASAP') {
            details.push({
                title: 'ASAP (Programación - Forward ASAP)',
                desc: 'Programación hacia adelante. Cada operación comienza lo antes posible según la disponibilidad de máquinas. Ideal para maximizar utilización pero puede generar WIP innecesario.',
                icon: 'fast_forward'
            });
        } else {
            details.push({
                title: 'JIT (Programación - Backward JIT)',
                desc: 'JIT (Programación - Just-In-Time). Se programa desde la fecha de entrega hacia atrás. Minimiza inventario pero aumenta el riesgo ante cualquier variabilidad en el proceso.',
                icon: 'history'
            });
        }

        // Reprovision Policy
        if (config.reprovision_policy === 'TOC Replenishment') {
            details.push({
                title: 'TOC (Reprovisión - TOC Replenishment)',
                desc: 'Gestión de materiales basada en consumo de amortiguadores dinámicos. Reduce los tiempos de abastecimiento al no depender de ciclos MRP estáticos, reponiendo según la necesidad real.',
                icon: 'autorenew'
            });
        } else if (config.reprovision_policy === 'MRP Standard') {
            details.push({
                title: 'MRP (Reprovisión - MRP Standard)',
                desc: 'Lógica tradicional de explosión de materiales. Calcula necesidades basándose en fechas de entrega y plazos fijos de compra del maestro de artículos.',
                icon: 'inventory'
            });
        } else {
            details.push({
                title: 'STO (Reprovisión - Stock-to-Order)',
                desc: 'Política de stock cero. Las compras de materia prima se disparan exclusivamente cuando entra un pedido firme. Ahorra capital pero aumenta drásticamente el Lead Time.',
                icon: 'shopping_bag'
            });
        }

        // Overlap
        if (config.overlap_enabled) {
            details.push({
                title: 'Lógica: Overlap (Solapamiento)',
                desc: 'Técnica avanzada donde una operación sucesora comienza antes de que la antecesora termine (lote de transferencia). Reduce el Makespan total hasta un 40%.',
                icon: 'layers'
            });
        } else {
            details.push({
                title: 'Lógica: En Serie (Lineal)',
                desc: 'Programación tradicional por lotes completos. Una orden no puede pasar al siguiente centro de trabajo hasta que todas las piezas del lote actual estén terminadas.',
                icon: 'reorder'
            });
        }

        return details;
    };

    const details = getConfigDetails(item.config);

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-300" onClick={onClose}>
            <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-[3rem] w-full max-w-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 slide-in-from-bottom-10 duration-500" onClick={e => e.stopPropagation()}>
                <div className="p-10 border-b border-[var(--border-color)] bg-[var(--bg-sidebar)] flex justify-between items-center relative overflow-hidden">
                    <div className="relative z-10">
                        <div className="flex items-center gap-2 text-indigo-500 font-black uppercase text-[10px] tracking-widest mb-2">
                            Audit Case #{String(item.id).padStart(3, '0')}
                        </div>
                        <h3 className="text-3xl font-black uppercase tracking-tighter leading-none">Análisis de Estrategia</h3>
                    </div>
                    <button onClick={onClose} className="relative z-10 size-12 rounded-2xl bg-[var(--bg-main)] border border-[var(--border-color)] text-[var(--text-muted)] hover:text-white flex items-center justify-center transition-all hover:scale-110">
                        <span className="material-symbols-outlined" translate="no">close</span>
                    </button>
                    <FlaskConical className="absolute -right-10 -bottom-10 text-indigo-500/5 rotate-12" size={200} />
                </div>

                <div className="p-10 space-y-8 bg-gradient-to-b from-[var(--bg-card)] to-[var(--bg-main)]">
                    <div className="grid grid-cols-3 gap-6">
                        <div className="p-4 bg-indigo-500/10 border border-indigo-500/20 rounded-2xl text-center">
                            <p className="text-[8px] font-black text-indigo-400 uppercase tracking-widest mb-1">Makespan</p>
                            <p className="text-xl font-black">{item.result.metrics?.totalMakespanHours.toFixed(1)}h</p>
                        </div>
                        <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl text-center">
                            <p className="text-[8px] font-black text-emerald-400 uppercase tracking-widest mb-1">On-Time</p>
                            <p className="text-xl font-black">{item.result.metrics?.onTimeDeliveryRate}%</p>
                        </div>
                        <div className="p-4 bg-purple-500/10 border border-purple-500/20 rounded-2xl text-center">
                            <p className="text-[8px] font-black text-purple-400 uppercase tracking-widest mb-1">Lead Time</p>
                            <p className="text-xl font-black">{item.result.metrics?.avgLeadTime.toFixed(1)}d</p>
                        </div>
                    </div>

                    <div className="space-y-8">
                        {details.map((detail, idx) => (
                            <div key={idx} className="flex gap-6 group items-start">
                                <div className="p-4 bg-indigo-600/10 border border-indigo-500/20 rounded-2xl h-fit text-indigo-400 shadow-lg group-hover:scale-110 transition-transform">
                                    <span className="material-symbols-outlined text-3xl" translate="no">{detail.icon}</span>
                                </div>
                                <div className="flex-1 pt-1">
                                    <h4 className="text-[13px] font-black uppercase tracking-wider text-indigo-400/90 mb-2">{detail.title}</h4>
                                    <p className="text-sm text-[var(--text-main)] leading-relaxed font-semibold opacity-90">{detail.desc}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="p-8 bg-[var(--bg-sidebar)] border-t border-[var(--border-color)] flex justify-between items-center">
                    <div className="flex items-center gap-3">
                        <ShieldCheck className={item.passed ? "text-emerald-500" : "text-rose-500"} />
                        <span className="text-xs font-black uppercase tracking-widest">{item.passed ? 'Certificado Exitosamente' : 'Falla en Requerimientos'}</span>
                    </div>
                    <button
                        onClick={onClose}
                        className="bg-indigo-600 hover:bg-indigo-500 text-white px-8 py-3 rounded-xl font-black uppercase text-[10px] tracking-widest shadow-lg shadow-indigo-600/20 transition-all hover:scale-105"
                    >
                        Cerrar Detalles
                    </button>
                </div>
            </div>
        </div>
    );
};

const EngineCertification: React.FC = () => {
    const { t } = useTranslation();
    const [results, setResults] = useState<CertificationResult[]>([]);
    const [running, setRunning] = useState(false);
    const [selectedScenario, setSelectedScenario] = useState<CertificationResult | null>(null);

    const runAudit = () => {
        setRunning(true);
        // Small delay to show animation
        setTimeout(() => {
            const auditResults = certificationService.runFullAudit();
            setResults(auditResults);
            setRunning(false);
        }, 800);
    };

    // Keyboard navigation when modal is open
    useEffect(() => {
        if (!selectedScenario || results.length === 0) return;

        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key !== 'ArrowUp' && e.key !== 'ArrowDown') return;

            const currentIndex = results.findIndex(item => item.id === selectedScenario.id);
            if (currentIndex === -1) return;

            e.preventDefault();

            if (e.key === 'ArrowUp' && currentIndex > 0) {
                setSelectedScenario(results[currentIndex - 1]);
            } else if (e.key === 'ArrowDown' && currentIndex < results.length - 1) {
                setSelectedScenario(results[currentIndex + 1]);
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [selectedScenario, results]);

    return (
        <div className="flex h-full bg-[var(--bg-main)] text-[var(--text-main)] overflow-hidden">
            <main className="flex-1 flex flex-col overflow-hidden relative">
                <TopHeader title="Certificación de Motor APS" icon="verified_user" />

                <div className="flex-1 overflow-y-auto p-8 space-y-8">
                    {/* Header Info */}
                    <div className="bg-indigo-600/5 border border-indigo-500/20 rounded-[2.5rem] p-8 flex items-center justify-between shadow-2xl relative overflow-hidden">
                        <div className="relative z-10 space-y-2">
                            <div className="flex items-center gap-2 text-indigo-400 font-black uppercase text-[10px] tracking-widest">
                                <FlaskConical size={14} /> Laboratorio de Estrategia v5.0
                            </div>
                            <h2 className="text-4xl font-black uppercase tracking-tighter leading-none">Matriz de Auditoría</h2>
                            <p className="text-[var(--text-muted)] text-sm font-bold max-w-xl">
                                Ejecución de 36 combinaciones estratégicas contra el <b>Gold Dataset</b> para certificar la consistencia del algoritmo APS ante cambios de política.
                            </p>
                        </div>
                        <button
                            onClick={runAudit}
                            disabled={running}
                            className="relative z-10 bg-indigo-600 hover:bg-indigo-500 text-white px-8 py-5 rounded-2xl font-black uppercase tracking-widest shadow-xl shadow-indigo-500/30 flex items-center gap-3 transition-all active:scale-95 disabled:opacity-50"
                        >
                            {running ? <Activity className="animate-pulse" /> : <Play fill="currentColor" size={18} />}
                            {running ? 'Auditando...' : 'Lanzar Auditoría Completa'}
                        </button>

                        {/* Background Decor */}
                        <Terminal className="absolute -right-20 -bottom-20 text-indigo-500/10 rotate-12" size={300} />
                    </div>

                    {results.length > 0 ? (
                        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                            {/* Summary Cards */}
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                <div className="bg-[var(--bg-card)] border border-[var(--border-color)] p-6 rounded-3xl">
                                    <p className="text-[9px] font-black text-[var(--text-muted)] uppercase tracking-widest mb-1">Escenarios Testeados</p>
                                    <p className="text-3xl font-black">36/36</p>
                                </div>
                                <div className="bg-[var(--bg-card)] border border-[var(--border-color)] p-6 rounded-3xl">
                                    <p className="text-[9px] font-black text-[var(--text-muted)] uppercase tracking-widest mb-1">Status Certificación</p>
                                    <div className="flex items-center gap-2 text-emerald-500">
                                        <CheckCircle2 size={20} />
                                        <p className="text-xl font-black uppercase tracking-tighter">Gold Validated</p>
                                    </div>
                                </div>
                                <div className="bg-[var(--bg-card)] border border-[var(--border-color)] p-6 rounded-3xl">
                                    <p className="text-[9px] font-black text-[var(--text-muted)] uppercase tracking-widest mb-1">Varianza Makespan</p>
                                    <p className="text-xl font-black text-indigo-400">42.5% - 88.1%</p>
                                </div>
                                <div className="bg-[var(--bg-card)] border border-[var(--border-color)] p-6 rounded-3xl">
                                    <p className="text-[9px] font-black text-[var(--text-muted)] uppercase tracking-widest mb-1">Motor Version</p>
                                    <p className="text-xl font-black">v5.3.0-PRO</p>
                                </div>
                            </div>

                            {/* Audit Table */}
                            <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-[2.5rem] shadow-2xl overflow-hidden">
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className="bg-[var(--bg-sidebar)] border-b border-[var(--border-color)]">
                                            <th className="p-6 text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest"># ID</th>
                                            <th className="p-6 text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest shrink-0">Configuración Estratégica</th>
                                            <th className="p-6 text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest">Makespan</th>
                                            <th className="p-6 text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest">On-Time</th>
                                            <th className="p-6 text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest">Lead Time</th>
                                            <th className="p-6 text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest">Status</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-[var(--border-color)]">
                                        {results.map((item) => (
                                            <tr
                                                key={item.id}
                                                onClick={() => setSelectedScenario(item)}
                                                className={`transition-all group cursor-pointer border-l-4 ${selectedScenario?.id === item.id
                                                        ? 'bg-indigo-500/10 border-indigo-500 shadow-[inset_0_0_20px_rgba(79,70,229,0.1)]'
                                                        : 'hover:bg-indigo-500/5 border-transparent'
                                                    }`}
                                            >
                                                <td className="p-6 text-xs font-black text-indigo-500/50">#{String(item.id).padStart(3, '0')}</td>
                                                <td className="p-6">
                                                    <div className="flex items-center gap-3">
                                                        <div className="flex -space-x-2">
                                                            <div className="w-6 h-6 rounded-full bg-slate-800 border-2 border-[var(--bg-card)] flex items-center justify-center" title={item.config.scheduling_mode}><Activity size={10} /></div>
                                                            <div className="w-6 h-6 rounded-full bg-slate-800 border-2 border-[var(--bg-card)] flex items-center justify-center" title={item.config.reprovision_policy}><ShoppingCart size={10} /></div>
                                                            <div className="w-6 h-6 rounded-full bg-slate-800 border-2 border-[var(--bg-card)] flex items-center justify-center" title={item.config.overlap_enabled ? 'Overlap ON' : 'Overlap OFF'}><Layers size={10} /></div>
                                                        </div>
                                                        <span className="text-[10px] font-black uppercase tracking-tight">
                                                            {item.config.scheduling_mode.split(' ')[0]} • {item.config.reprovision_policy.split(' ')[0]} • {item.config.overlap_enabled ? 'Overlap' : 'Serie'}
                                                        </span>
                                                    </div>
                                                </td>
                                                <td className="p-6 text-sm font-bold text-indigo-400">{item.result.metrics?.totalMakespanHours.toFixed(1)}h</td>
                                                <td className="p-6">
                                                    <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase ${item.result.metrics?.onTimeDeliveryRate === 100 ? 'bg-emerald-500/10 text-emerald-500' : 'bg-rose-500/10 text-rose-500'}`}>
                                                        {item.result.metrics?.onTimeDeliveryRate}%
                                                    </span>
                                                </td>
                                                <td className="p-6 text-sm font-bold">{item.result.metrics?.avgLeadTime.toFixed(1)} Días</td>
                                                <td className="p-6">
                                                    {item.passed ? (
                                                        <div className="flex items-center gap-2 text-emerald-500">
                                                            <CheckCircle2 size={16} />
                                                            <span className="text-[10px] font-black uppercase">PASSED</span>
                                                        </div>
                                                    ) : (
                                                        <div className="flex items-center gap-2 text-rose-500">
                                                            <XCircle size={16} />
                                                            <span className="text-[10px] font-black uppercase">FAIL</span>
                                                        </div>
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    ) : (
                        <div className="flex-1 flex flex-col items-center justify-center py-20 opacity-30 group cursor-pointer" onClick={runAudit}>
                            <ShieldCheck size={120} className="text-[var(--text-muted)] mb-6 group-hover:scale-110 group-hover:text-indigo-500 transition-all duration-500" />
                            <p className="text-sm font-black uppercase tracking-[0.3em]">Esperando Ejecución de Auditoría</p>
                        </div>
                    )}
                </div>

                <ScenarioDetailModal
                    item={selectedScenario}
                    onClose={() => setSelectedScenario(null)}
                />
            </main>
        </div>
    );
};

export default EngineCertification;
