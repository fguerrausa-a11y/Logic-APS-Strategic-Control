
import React from 'react';
import Sidebar from '../components/Sidebar';
import TopHeader from '../components/TopHeader';
import { Package, AlertCircle, CheckCircle2, TrendingDown } from 'lucide-react';
import { BufferItem } from '../types';
import { useTranslation } from '../services/languageService';

const BuffersPage: React.FC = () => {
    const { t } = useTranslation();
    const buffers: BufferItem[] = [
        { workOrder: 'WO-4092', product: 'Eje Principal S-20', dueDate: '2026-02-05', consumption: 85, status: 'Critical' },
        { workOrder: 'WO-4105', product: 'Soporte Lateral L-Type', dueDate: '2026-02-08', consumption: 45, status: 'Watch' },
        { workOrder: 'WO-4112', product: 'Carcasa de Motor V8', dueDate: '2026-02-12', consumption: 12, status: 'Safe' },
        { workOrder: 'WO-4128', product: 'Válvula de Presión 1/2"', dueDate: '2026-02-15', consumption: 92, status: 'Critical' },
    ];

    return (
        <div className="flex h-screen overflow-hidden bg-[var(--bg-main)] text-[var(--text-main)] font-body transition-colors">
            <Sidebar />
            <main className="flex-1 flex flex-col h-full overflow-hidden relative">
                <TopHeader title={t('inventory_buffers_title')} icon="inventory_2" />
                <div className="flex-1 overflow-y-auto p-8 space-y-8 bg-grid-slate-900/[0.02]">
                    <div className="flex flex-col gap-2">
                        <h2 className="text-3xl font-black uppercase tracking-tighter">{t('buffer_status_dbm')}</h2>
                        <p className="text-[var(--text-muted)] text-xs font-bold uppercase tracking-widest opacity-70">{t('dbm_desc')}</p>
                    </div>

                    <div className="grid grid-cols-1 gap-4">
                        {buffers.map((item, idx) => (
                            <div key={idx} className="bg-[var(--bg-sidebar)] border border-[var(--border-color)] rounded-3xl p-6 flex flex-col md:flex-row items-center justify-between gap-6 hover:border-indigo-500/30 transition-all shadow-sm group">
                                <div className="flex items-center gap-6 flex-1">
                                    <div className={`p-4 rounded-2xl ${item.status === 'Critical' ? 'bg-rose-500/10 text-rose-500' : item.status === 'Watch' ? 'bg-amber-500/10 text-amber-500' : 'bg-emerald-500/10 text-emerald-500'}`}>
                                        <Package size={28} />
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-black uppercase tracking-tighter">{item.product}</h3>
                                        <p className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest">{t('reference')}: {item.workOrder} • {t('delivery')}: {new Date(item.dueDate).toLocaleDateString()}</p>
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
                        ))}
                    </div>

                    <div className="glass-panel rounded-[2.5rem] p-10 border border-[var(--border-color)] flex flex-col items-center justify-center text-center space-y-4 bg-gradient-to-b from-transparent to-indigo-500/5">
                        <div className="p-5 bg-indigo-500/10 rounded-full border border-indigo-500/20 text-indigo-500">
                            <TrendingDown size={40} />
                        </div>
                        <h4 className="text-xl font-black uppercase tracking-tighter text-[var(--text-main)]">{t('inventory_optimization')}</h4>
                        <p className="max-w-md text-[var(--text-muted)] text-sm font-medium leading-relaxed">{t('opt_suggestion', { item: <span className="text-indigo-500 font-bold">X-Material</span>, amount: '$12.5K' })}</p>
                    </div>
                </div>
            </main>
        </div>
    );
};

export default BuffersPage;
