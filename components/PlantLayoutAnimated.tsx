import React, { useState, useRef, useEffect } from 'react';
import { Package, Activity, Cpu, Factory, Settings, Database, Server, HardDrive, Layers, Zap } from 'lucide-react';

interface Props {
    items: any[];
    routings: any[];
    workCenters: any[];
    machines: any[];
}

const MACHINE_ICONS = [Factory, Database, Server, HardDrive, Layers, Zap];

const PALETTE = [
    { bg: 'bg-orange-100', border: 'border-orange-500', text: 'text-orange-700', icon: 'text-orange-500', shadow: 'shadow-orange-500/20' },
    { bg: 'bg-blue-100', border: 'border-blue-500', text: 'text-blue-700', icon: 'text-blue-500', shadow: 'shadow-blue-500/20' },
    { bg: 'bg-emerald-100', border: 'border-emerald-500', text: 'text-emerald-700', icon: 'text-emerald-500', shadow: 'shadow-emerald-500/20' },
    { bg: 'bg-purple-100', border: 'border-purple-500', text: 'text-purple-700', icon: 'text-purple-500', shadow: 'shadow-purple-500/20' },
    { bg: 'bg-rose-100', border: 'border-rose-500', text: 'text-rose-700', icon: 'text-rose-500', shadow: 'shadow-rose-500/20' },
    { bg: 'bg-cyan-100', border: 'border-cyan-500', text: 'text-cyan-700', icon: 'text-cyan-500', shadow: 'shadow-cyan-500/20' },
    { bg: 'bg-amber-100', border: 'border-amber-500', text: 'text-amber-700', icon: 'text-amber-500', shadow: 'shadow-amber-500/20' },
];

const PlantLayoutAnimated: React.FC<Props> = ({ items, routings, workCenters, machines }) => {
    const [selectedItemId, setSelectedItemId] = useState<string>('');
    const gridRef = useRef<HTMLDivElement>(null);
    const wcRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});
    const [lines, setLines] = useState<{ x1: number, y1: number, x2: number, y2: number }[]>([]);

    const productsWithRoutings = items.filter(i => routings.some(r => r.item_id === i.id));

    const drawLines = () => {
        if (!selectedItemId || !gridRef.current) {
            setLines([]);
            return;
        }
        const curRoutings = routings
            .filter(r => r.item_id === selectedItemId)
            .sort((a, b) => a.operation_sequence - b.operation_sequence);

        const newLines = [];
        const parentRect = gridRef.current.getBoundingClientRect();

        for (let i = 0; i < curRoutings.length - 1; i++) {
            const w1 = curRoutings[i].work_center_id;
            const w2 = curRoutings[i + 1].work_center_id;
            const el1 = wcRefs.current[w1];
            const el2 = wcRefs.current[w2];

            if (el1 && el2) {
                const r1 = el1.getBoundingClientRect();
                const r2 = el2.getBoundingClientRect();

                // Calculate relative to the gridRef container
                const x1 = r1.left + r1.width / 2 - parentRect.left;
                const y1 = r1.top + r1.height / 2 - parentRect.top;
                const x2 = r2.left + r2.width / 2 - parentRect.left;
                const y2 = r2.top + r2.height / 2 - parentRect.top;
                newLines.push({ x1, y1, x2, y2 });
            }
        }
        setLines(newLines);
    };

    useEffect(() => {
        const timer = setTimeout(drawLines, 150); // slight delay to ensure DOM is settled
        window.addEventListener('resize', drawLines);
        return () => {
            clearTimeout(timer);
            window.removeEventListener('resize', drawLines);
        }
    }, [selectedItemId, workCenters, routings]);

    return (
        <div className="flex flex-col h-full space-y-6 w-full py-4 relative">
            <div className="flex items-center gap-4 bg-[var(--bg-card)] p-4 rounded-3xl border border-[var(--border-color)] shadow-sm shrink-0 z-20">
                <div className="p-3 bg-indigo-500/10 rounded-2xl text-indigo-400">
                    <Package size={24} />
                </div>
                <div className="flex-1">
                    <select
                        className="w-full bg-[var(--bg-input)] border border-[var(--border-color)] text-[var(--text-main)] rounded-xl py-3 px-4 shadow-inner focus:border-indigo-500 font-bold outline-none font-display uppercase tracking-wider text-xs cursor-pointer appearance-none"
                        value={selectedItemId}
                        onChange={e => setSelectedItemId(e.target.value)}
                    >
                        <option value="">-- Seleccionar flujo (Artículo) para ver recorrido --</option>
                        {productsWithRoutings.map(prod => (
                            <option key={prod.id} value={prod.id}>{prod.name} (Ref: {prod.id})</option>
                        ))}
                    </select>
                </div>
                {selectedItemId && (
                    <div className="text-[10px] bg-emerald-500/10 text-emerald-500 px-4 py-2 rounded-xl font-black border border-emerald-500/20 uppercase tracking-widest flex gap-2 items-center">
                        <Activity size={14} className="animate-pulse" />
                        Ruta Activa
                    </div>
                )}
            </div>

            <div className="relative flex-1 bg-[var(--bg-sidebar)]/50 rounded-3xl border border-[var(--border-color)] overflow-y-auto overflow-x-hidden p-8">
                <div
                    ref={gridRef}
                    className="relative w-full max-w-6xl mx-auto grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-12 gap-y-16 justify-items-center"
                >
                    {/* Líneas de conexión */}
                    <svg className="absolute top-0 left-0 w-full h-full pointer-events-none z-0 overflow-visible">
                        <defs>
                            <marker id="arrowhead" markerWidth="5" markerHeight="5" refX="28" refY="2.5" orient="auto">
                                <polygon points="0 0, 5 2.5, 0 5" fill="#818cf8" />
                            </marker>
                        </defs>
                        {lines.map((l, i) => {
                            // Curva de Bezier para una apariencia elegante
                            const dx = l.x2 - l.x1;
                            const dy = l.y2 - l.y1;
                            // Factor de curvatura basado en la distancia
                            const curveOffset = Math.min(Math.abs(dx), Math.abs(dy)) * 0.4 + 20;

                            // Asegurar que las curvas no sean siempre iguales
                            const cx1 = l.x1 + dx / 3;
                            const cy1 = l.y1 + (dy > 0 ? curveOffset : -curveOffset);
                            const cx2 = l.x2 - dx / 3;
                            const cy2 = l.y2 - (dy > 0 ? curveOffset : -curveOffset);

                            const path = `M ${l.x1} ${l.y1} C ${cx1} ${cy1}, ${cx2} ${cy2}, ${l.x2} ${l.y2}`;

                            return (
                                <g key={i}>
                                    {/* Línea base sutil punteada (Background route) */}
                                    <path d={path} fill="none" stroke="var(--border-color)" strokeWidth="1.5" strokeDasharray="4 4" className="opacity-40" />

                                    {/* Línea de ruta suave iluminada */}
                                    <path
                                        d={path}
                                        fill="none"
                                        stroke="#818cf8"
                                        strokeWidth="2.5"
                                        strokeLinecap="round"
                                        className="opacity-70"
                                        markerEnd="url(#arrowhead)"
                                    />

                                    {/* Partícula circular roja (indicador de flujo) */}
                                    <circle r="4" fill="#ef4444" className="drop-shadow-[0_0_4px_rgba(239,68,68,0.9)] z-10">
                                        <animateMotion dur="2.2s" repeatCount="indefinite" path={path} />
                                    </circle>
                                </g>
                            )
                        })}
                    </svg>

                    {/* Nodos de Centros de Trabajo */}
                    {workCenters.map((wc, index) => {
                        const curRoutings = selectedItemId ? routings.filter(r => r.item_id === selectedItemId).sort((a, b) => a.operation_sequence - b.operation_sequence) : [];
                        const steps = curRoutings.map((r, idx) => ({ wc: r.work_center_id, step: idx + 1 })).filter(x => x.wc === wc.id);
                        const inRoute = steps.length > 0;
                        const wcMachines = machines.filter(m => m.work_center_id === wc.id);

                        const styleOptions = PALETTE[index % PALETTE.length];
                        const IconComponent = MACHINE_ICONS[index % MACHINE_ICONS.length];
                        const isDimmed = selectedItemId && !inRoute;

                        return (
                            <div
                                key={wc.id}
                                ref={el => { wcRefs.current[wc.id] = el; }}
                                className={`relative flex flex-col items-center justify-center p-5 rounded-3xl transition-all duration-500 z-10 shadow-lg w-48 ${isDimmed
                                    ? 'bg-[var(--bg-main)] border-2 border-[var(--border-color)] opacity-60 grayscale'
                                    : `bg-[var(--bg-card)] border-2 ${styleOptions.border} ${inRoute ? styleOptions.shadow + ' scale-110 ring-4 ring-indigo-500/20' : ''}`
                                    }`}
                            >
                                {/* Ícono grande simulando la maquinaria */}
                                <div className={`p-4 rounded-2xl mb-3 ${isDimmed ? 'bg-[var(--bg-input)] text-[var(--text-muted)]' : styleOptions.bg + ' ' + styleOptions.icon}`}>
                                    <IconComponent size={40} className={inRoute ? 'animate-pulse' : ''} />
                                </div>

                                {/* Panel central de información legible */}
                                <div className="text-center w-full">
                                    <h4 className={`font-black text-[13px] leading-tight mb-2 uppercase tracking-wide px-1 ${isDimmed ? 'text-[var(--text-muted)]' : 'text-[var(--text-main)]'}`}>
                                        {wc.name}
                                    </h4>
                                    <div className="flex items-center justify-center gap-1.5 bg-[var(--bg-input)] rounded-lg py-1.5 px-3 border border-[var(--border-color)] mx-auto w-fit mt-1">
                                        <Cpu size={12} className={isDimmed ? 'text-[var(--text-muted)] opacity-50' : 'text-indigo-500'} />
                                        <span className={`text-[10px] font-bold ${isDimmed ? 'text-[var(--text-muted)] opacity-70' : 'text-[var(--text-main)]'}`}>{wcMachines.length} MÁQs</span>
                                    </div>
                                </div>

                                {/* Indicadores de paso (si está en la ruta) */}
                                {inRoute && steps.map((s, idx) => (
                                    <div
                                        key={s.step}
                                        className="absolute -top-4 -right-4 w-9 h-9 rounded-full bg-indigo-600 border-[3px] border-[var(--bg-card)] text-white flex items-center justify-center font-black text-xs shadow-lg z-50 animate-bounce"
                                        style={{ transform: `translate(${idx * -8}px, ${idx * -8}px)` }}
                                    >
                                        {s.step}
                                    </div>
                                ))}
                            </div>
                        )
                    })}
                </div>
            </div>

            <style dangerouslySetInnerHTML={{
                __html: `
        @keyframes dash {
          to { stroke-dashoffset: -24; }
        }
      `}} />
        </div>
    );
};

export default PlantLayoutAnimated;
