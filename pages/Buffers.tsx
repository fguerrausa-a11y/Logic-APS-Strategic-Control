
import React, { useState, useEffect } from 'react';
import TopHeader from '../components/TopHeader';
import { Package, AlertCircle, CheckCircle2, TrendingDown } from 'lucide-react';
import { BufferItem } from '../types';
import { useTranslation } from '../services/languageService';
import { useSimulation } from '../services/SimulationContext';
import { supabase } from '../services/supabaseClient';

const BuffersPage: React.FC = () => {
    const { t, language } = useTranslation();
    const { selectedScenarioId } = useSimulation();
    const [buffers, setBuffers] = useState<BufferItem[]>([]);
    const [optimizationItem, setOptimizationItem] = useState<{ id?: string, itemId?: string, name: string; amount: string; stock?: number } | null>(null);

    useEffect(() => {
        if (selectedScenarioId) {
            fetchWorkOrderBuffers(selectedScenarioId);
            fetchOptimizationSuggestion();
        }
    }, [selectedScenarioId]);

    const fetchOptimizationSuggestion = async () => {
        try {
            // 1. Check if we already have a pending or approved suggestion for this scenario/context in the new table
            // For simplicity, we just check if ANY suggestion exists for the top item to avoid spamming
            // In a real app, this logic would be more complex

            // First, find the top item candidate
            const { data: items } = await supabase
                .from('items')
                .select('id, name, initial_stock')
                .order('initial_stock', { ascending: false })
                .limit(1);

            if (items && items.length > 0) {
                const item = items[0];
                const savings = ((item.initial_stock || 0) * 0.5).toFixed(1);

                // Check if this specific suggestion was already acted upon
                const { data: existing } = await supabase
                    .from('optimization_suggestions')
                    .select('*')
                    .eq('item_id', item.id)
                    .eq('type', 'purchase_lot_reduction')
                    .in('status', ['approved', 'rejected']);

                if (!existing || existing.length === 0) {
                    setOptimizationItem({
                        id: undefined, // New suggestion
                        itemId: item.id,
                        name: item.name,
                        amount: `$${savings}K`,
                        stock: item.initial_stock
                    });
                } else {
                    setOptimizationItem(null);
                }
            }
        } catch (e) {
            console.error(e);
        }
    };

    const handleApplyOptimization = async () => {
        if (!optimizationItem || !selectedScenarioId) return;

        try {
            // Insert into optimization_suggestions table
            const { error } = await supabase
                .from('optimization_suggestions')
                .insert({
                    scenario_id: selectedScenarioId,
                    item_id: optimizationItem.itemId,
                    type: 'purchase_lot_reduction',
                    parameter_name: 'min_purchase_qty',
                    current_value: optimizationItem.stock, // Simplification
                    suggested_value: (optimizationItem.stock || 0) / 2,
                    reason: 'Excess inventory detected by DBM analysis',
                    impact: `Projected savings: ${optimizationItem.amount}`,
                    status: 'approved'
                });

            if (error) throw error;

            // Clear notification
            setOptimizationItem(null);
            // Ideally show a success toaster
            alert(t('changes_applied_success') || 'Optimization applied successfully');

        } catch (e) {
            console.error(e);
            alert('Error applying optimization');
        }
    };

    const handleDismissOptimization = () => {
        // Just hide it for session
        setOptimizationItem(null);
    };

    const fetchWorkOrderBuffers = async (scenarioId: string) => {
        try {
            // Get proposed WOs from simulation
            const { data: pwos } = await supabase
                .from('proposed_work_orders')
                .select(`
                    *,
                    item:items!item_id(name)
                `)
                .eq('scenario_id', scenarioId);

            if (pwos) {
                const bufferData = pwos.map((pwo: any) => {
                    const dueDate = new Date(pwo.due_date);
                    const endDate = new Date(pwo.end_date);
                    const startDate = new Date(pwo.start_date);
                    const now = new Date();

                    // Simplify Buffer Calculation for Demo:
                    // Total Lead Time = Due Date - Start Date
                    // Buffer Consumed % = (End Date - Start Date) / Total Lead Time * 100
                    // If End Date > Due Date (Lateness), Consumption > 100%

                    const totalTime = dueDate.getTime() - startDate.getTime();
                    const usedTime = endDate.getTime() - startDate.getTime();

                    let consumption = 0;
                    if (totalTime > 0) {
                        consumption = Math.round((usedTime / totalTime) * 100);
                    } else {
                        // Edge case: Start = Due or inconsistent dates
                        consumption = endDate > dueDate ? 110 : 100;
                    }

                    // Determine Status
                    let status: BufferItem['status'] = 'Safe';
                    if (consumption > 100) status = 'Critical';
                    else if (consumption > 66) status = 'Watch';
                    else status = 'Safe';

                    return {
                        workOrder: pwo.work_order_id || 'N/A',
                        product: pwo.item?.name || 'Unknown Product',
                        dueDate: pwo.due_date,
                        consumption: consumption,
                        status: status
                    };
                });

                // Sort by consumption descending (most critical first)
                setBuffers(bufferData.sort((a, b) => b.consumption - a.consumption));
            }
        } catch (error) {
            console.error('Error fetching buffers:', error);
        }
    };

    return (
        <div className="flex h-full overflow-hidden bg-[var(--bg-main)] text-[var(--text-main)] transition-colors">
            <main className="flex-1 flex flex-col h-full overflow-hidden relative">
                <TopHeader
                    title={t('inventory_buffers_title')}
                    icon="inventory_2"
                    notificationContent={optimizationItem ? {
                        title: t('inventory_optimization'),
                        message: t('opt_suggestion', { item: optimizationItem.name, amount: optimizationItem.amount }),
                        type: 'info',
                        onApply: handleApplyOptimization,
                        onDismiss: handleDismissOptimization
                    } : null}
                />
                <div className="flex-1 overflow-y-auto p-8 space-y-8 bg-grid-slate-900/[0.02]">
                    <div className="flex flex-col gap-2">
                        <h2 className="text-3xl font-black uppercase tracking-tighter">{t('buffer_status_dbm')}</h2>
                        <p className="text-[var(--text-muted)] text-xs font-bold uppercase tracking-widest opacity-70">{t('dbm_desc')}</p>
                    </div>

                    <div className="grid grid-cols-1 gap-4">
                        {buffers.length === 0 ? (
                            <div className="text-center p-10 text-[var(--text-muted)] uppercase font-bold tracking-widest">{t('no_data')}</div>
                        ) : (
                            buffers.map((item, idx) => (
                                <div key={idx} className="bg-[var(--bg-sidebar)] border border-[var(--border-color)] rounded-3xl p-6 flex flex-col md:flex-row items-center justify-between gap-6 hover:border-indigo-500/30 transition-all shadow-sm group">
                                    <div className="flex items-center gap-6 flex-1">
                                        <div className={`p-4 rounded-2xl ${item.status === 'Critical' ? 'bg-rose-500/10 text-rose-500' : item.status === 'Watch' ? 'bg-amber-500/10 text-amber-500' : 'bg-emerald-500/10 text-emerald-500'}`}>
                                            <Package size={28} />
                                        </div>
                                        <div>
                                            <h3 className="text-lg font-black uppercase tracking-tighter">{item.product}</h3>
                                            <p className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest">{t('reference')}: {item.workOrder} • {t('delivery')}: {new Date(item.dueDate).toLocaleDateString(language === 'es' ? 'es-AR' : 'en-US')}</p>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-10 w-full md:w-auto">
                                        <div className="flex-1 md:w-64 space-y-2">
                                            <div className="flex justify-between text-[10px] font-black uppercase tracking-widest mb-1">
                                                <span className="text-[var(--text-muted)]">{t('buffer_consumption')}</span>
                                                <span className={item.status === 'Critical' ? 'text-rose-500' : 'text-indigo-500'}>{item.consumption}%</span>
                                            </div>
                                            <div className="w-full bg-[var(--bg-main)] h-2.5 rounded-full overflow-hidden border border-[var(--border-color)] shadow-inner">
                                                <div
                                                    className={`h-full rounded-full transition-all duration-1000 ${item.status === 'Critical' ? 'bg-gradient-to-r from-rose-600 to-rose-400' :
                                                        item.status === 'Watch' ? 'bg-gradient-to-r from-amber-600 to-amber-400' :
                                                            'bg-gradient-to-r from-emerald-600 to-emerald-400'
                                                        }`}
                                                    style={{ width: `${item.consumption}%` }}
                                                ></div>
                                            </div>
                                        </div>

                                        <div className={`px-5 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border ${item.status === 'Critical' ? 'bg-rose-500/10 border-rose-500/20 text-rose-500' :
                                            item.status === 'Watch' ? 'bg-amber-500/10 border-amber-500/20 text-amber-500' :
                                                'bg-emerald-500/10 border-emerald-500/20 text-emerald-500'
                                            }`}>
                                            {t(`status_${item.status.toLowerCase()}` as any)}
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </main >
        </div >
    );
};

export default BuffersPage;
