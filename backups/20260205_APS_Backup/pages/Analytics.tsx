
import React from 'react';
import Sidebar from '../components/Sidebar';
import TopHeader from '../components/TopHeader';
import { useTranslation } from '../services/languageService';
import { BarChart3, TrendingUp, Zap, PieChart, Activity } from 'lucide-react';

const AnalyticsPage: React.FC = () => {
    const { t, language } = useTranslation();
    return (
        <div className="flex h-screen overflow-hidden bg-[var(--bg-main)] text-[var(--text-main)] font-body transition-colors">
            <Sidebar />
            <main className="flex-1 flex flex-col h-full overflow-hidden relative">
                <TopHeader title={t('intelligence_analytics')} icon="analytics" />
                <div className="flex-1 overflow-y-auto p-8 space-y-10 bg-[var(--bg-main)]">
                    <div className="flex flex-col gap-2">
                        <h2 className="text-4xl font-black uppercase tracking-tighter">{t('mfg_analytics')}</h2>
                        <p className="text-[var(--text-muted)] text-xs font-bold uppercase tracking-widest opacity-70">{t('deep_analysis_desc')}</p>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        <div className="lg:col-span-2 glass-panel rounded-[2.5rem] p-8 min-h-[400px] border border-[var(--border-color)] flex flex-col">
                            <div className="flex justify-between items-center mb-10">
                                <h3 className="text-sm font-black uppercase tracking-widest flex items-center gap-2"><Activity size={18} className="text-indigo-500" /> {t('plant_performance')}</h3>
                                <div className="flex gap-4">
                                    <div className="flex items-center gap-2"><span className="size-2 rounded-full bg-indigo-500"></span> <span className="text-[9px] font-black uppercase opacity-60">{t('planned')}</span></div>
                                    <div className="flex items-center gap-2"><span className="size-2 rounded-full bg-emerald-500"></span> <span className="text-[9px] font-black uppercase opacity-60">{t('real')}</span></div>
                                </div>
                            </div>
                            <div className="flex-1 bg-[var(--bg-main)]/50 rounded-3xl border border-dashed border-[var(--border-color)] flex items-center justify-center relative overflow-hidden">
                                <TrendingUp size={100} className="text-indigo-500/10 absolute -bottom-10 -right-10" />
                                <p className="text-[10px] font-black uppercase tracking-[0.3em] opacity-30">{t('predictive_trend_chart')}</p>
                            </div>
                        </div>

                        <div className="glass-panel rounded-[2.5rem] p-8 border border-[var(--border-color)] flex flex-col gap-8">
                            <h3 className="text-sm font-black uppercase tracking-widest flex items-center gap-2"><PieChart size={18} className="text-indigo-500" /> {t('demand_mix')}</h3>
                            <div className="flex-1 flex flex-col justify-center gap-6">
                                {[
                                    { label: t('standard'), value: 65, color: 'bg-indigo-500' },
                                    { label: t('urgent'), value: 20, color: 'bg-rose-500' },
                                    { label: t('special'), value: 15, color: 'bg-amber-500' },
                                ].map((item, i) => (
                                    <div key={i} className="space-y-2">
                                        <div className="flex justify-between text-[9px] font-black uppercase tracking-widest">
                                            <span className="text-[var(--text-muted)]">{item.label}</span>
                                            <span>{item.value}%</span>
                                        </div>
                                        <div className="w-full bg-[var(--bg-main)] h-2 rounded-full overflow-hidden border border-[var(--border-color)]">
                                            <div className={`h-full ${item.color} rounded-full`} style={{ width: `${item.value}%` }}></div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                            <div className="p-5 bg-indigo-500/5 border border-indigo-500/10 rounded-2xl">
                                <p className="text-[9px] font-bold text-center leading-relaxed">{t('mix_efficiency_impact', { value: <span className="text-rose-500 font-black">4.2%</span> })}</p>
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        {[
                            { label: t('mttr'), value: '1.2h', icon: <Zap size={20} className="text-amber-500" /> },
                            { label: t('mtbf'), value: '142h', icon: <Activity size={20} className="text-emerald-500" /> },
                            { label: t('scrap_rate'), value: '1.4%', icon: <ArrowDownRight size={20} className="text-rose-500" /> },
                            { label: t('cycle_time_variance'), value: '-0.3s', icon: <TrendingUp size={20} className="text-indigo-500" /> },
                        ].map((stat, i) => (
                            <div key={i} className="bg-[var(--bg-sidebar)] border border-[var(--border-color)] rounded-3xl p-6 flex items-center gap-4 shadow-sm hover:scale-[1.02] transition-all cursor-pointer">
                                <div className="p-3 bg-[var(--bg-main)] rounded-2xl border border-[var(--border-color)]">
                                    {stat.icon}
                                </div>
                                <div>
                                    <p className="text-[8px] font-black text-[var(--text-muted)] uppercase tracking-widest mb-1">{stat.label}</p>
                                    <p className="text-xl font-black tracking-tight">{stat.value}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </main>
        </div>
    );
};

const ArrowDownRight = ({ size, className }: { size: number; className?: string }) => (
    <svg
        xmlns="http://www.w3.org/2000/svg"
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={className}
    >
        <path d="m7 7 10 10" />
        <path d="M17 7v10H7" />
    </svg>
);

export default AnalyticsPage;
