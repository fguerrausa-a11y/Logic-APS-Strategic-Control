
import React from 'react';
import TopHeader from '../components/TopHeader';
import { useTranslation } from '../services/languageService';
import { BarChart3, TrendingUp, Zap, PieChart, Activity, RefreshCw } from 'lucide-react';
import { analyticsService, AnalyticsData } from '../services/analyticsService';

const AnalyticsPage: React.FC = () => {
    const { t, language } = useTranslation();
    const [data, setData] = React.useState<AnalyticsData | null>(null);
    const [loading, setLoading] = React.useState(true);

    const fetchData = async () => {
        setLoading(true);
        console.log("Analytics: Fetching data...");
        try {
            const result = await analyticsService.fetchAnalytics();
            console.log("Analytics: Data received:", result);
            setData(result);
        } catch (error) {
            console.error("Analytics: Error fetching data:", error);
        } finally {
            setLoading(false);
        }
    };

    React.useEffect(() => {
        console.log("Analytics: Mounted");
        fetchData();
    }, []);

    if (loading) {
        return (
            <div className="flex h-full items-center justify-center bg-[#0a0a1a] text-white">
                <div className="flex flex-col items-center gap-4">
                    <RefreshCw className="animate-spin text-indigo-500" size={40} />
                    <p className="text-sm font-black uppercase tracking-widest opacity-50">Calculando analíticas...</p>
                </div>
            </div>
        );
    }

    if (!data) {
        return (
            <div className="flex h-full items-center justify-center bg-[#0a0a1a] text-white p-10">
                <div className="p-8 glass-panel border border-rose-500/20 rounded-[2rem] text-center">
                    <h2 className="text-2xl font-black text-rose-500 mb-4">Error al cargar datos</h2>
                    <p className="text-sm opacity-60">No se pudieron recuperar las métricas de producción.</p>
                    <button onClick={fetchData} className="mt-6 px-6 py-2 bg-rose-500 rounded-xl text-[10px] font-black uppercase">Reintentar</button>
                </div>
            </div>
        );
    }

    const COLORS = ['#6366f1', '#f43f5e', '#f59e0b'];
    let pieData = [];
    try {
        pieData = [
            { name: t('standard'), value: data.demandMix?.standard || 0 },
            { name: t('urgent'), value: data.demandMix?.urgent || 0 },
            { name: t('special'), value: data.demandMix?.special || 0 },
        ];
    } catch (err) {
        console.error("Error creating pieData", err);
    }

    return (
        <div className="flex h-full overflow-hidden bg-[var(--bg-main)] text-[var(--text-main)] transition-colors">
            <main className="flex-1 flex flex-col h-full overflow-hidden relative">
                <TopHeader title={t('intelligence_analytics')} icon="analytics" />
                <div className="flex-1 overflow-y-auto p-8 space-y-10 bg-[var(--bg-main)]">
                    <div className="flex flex-col gap-2">
                        <h2 className="text-4xl font-black uppercase tracking-tighter">{t('mfg_analytics')}</h2>
                        <p className="text-[var(--text-muted)] text-xs font-bold uppercase tracking-widest opacity-70">{t('deep_analysis_desc')}</p>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        {/* PLANT PERFORMANCE - CUSTOM SVG CHART */}
                        <div className="lg:col-span-2 glass-panel rounded-[2.5rem] p-8 min-h-[400px] border border-[var(--border-color)] flex flex-col relative overflow-hidden group">
                            <div className="flex justify-between items-center mb-10 z-10">
                                <h3 className="text-sm font-black uppercase tracking-widest flex items-center gap-2">
                                    <Activity size={18} className="text-indigo-500" /> {t('plant_performance')}
                                </h3>
                                <div className="flex gap-4">
                                    <div className="flex items-center gap-2 cursor-help group/p">
                                        <span className="size-2 rounded-full bg-indigo-500 shadow-[0_0_10px_rgba(99,102,241,0.5)]"></span>
                                        <span className="text-[9px] font-black uppercase opacity-60 group-hover/p:opacity-100 transition-opacity">{t('planned')}</span>
                                    </div>
                                    <div className="flex items-center gap-2 cursor-help group/r">
                                        <span className="size-2 rounded-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]"></span>
                                        <span className="text-[9px] font-black uppercase opacity-60 group-hover/r:opacity-100 transition-opacity">{t('real')}</span>
                                    </div>
                                </div>
                            </div>

                            <div className="flex-1 relative mt-10">
                                <svg viewBox="0 0 700 300" className="w-full h-full drop-shadow-2xl">
                                    {/* Grid Lines */}
                                    {[0, 1, 2, 3].map(i => (
                                        <line key={i} x1="0" y1={i * 100} x2="700" y2={i * 100} stroke="var(--border-color)" strokeWidth="1" strokeDasharray="5,5" opacity="0.3" />
                                    ))}

                                    {/* Area Gradient (Real) */}
                                    <defs>
                                        <linearGradient id="grad-real" x1="0%" y1="0%" x2="0%" y2="100%">
                                            <stop offset="0%" style={{ stopColor: '#10b981', stopOpacity: 0.2 }} />
                                            <stop offset="100%" style={{ stopColor: '#10b981', stopOpacity: 0 }} />
                                        </linearGradient>
                                        <linearGradient id="grad-planned" x1="0%" y1="0%" x2="0%" y2="100%">
                                            <stop offset="0%" style={{ stopColor: '#6366f1', stopOpacity: 0.1 }} />
                                            <stop offset="100%" style={{ stopColor: '#6366f1', stopOpacity: 0 }} />
                                        </linearGradient>
                                    </defs>

                                    {/* Paths would go here - simplified for stability */}
                                    <path
                                        d="M 0 250 Q 175 200 350 220 T 700 150 V 300 H 0 Z"
                                        fill="url(#grad-planned)"
                                        className="animate-pulse"
                                    />
                                    <path
                                        d="M 0 250 Q 175 200 350 220 T 700 150"
                                        fill="none"
                                        stroke="#6366f1"
                                        strokeWidth="4"
                                        strokeLinecap="round"
                                    />

                                    <path
                                        d="M 0 280 Q 175 150 350 260 T 700 100 V 300 H 0 Z"
                                        fill="url(#grad-real)"
                                    />
                                    <path
                                        d="M 0 280 Q 175 150 350 260 T 700 100"
                                        fill="none"
                                        stroke="#10b981"
                                        strokeWidth="4"
                                        strokeLinecap="round"
                                        strokeDasharray="1000"
                                        strokeDashoffset="0"
                                    />
                                </svg>

                                <div className="absolute inset-0 flex justify-between px-2 items-end pb-2">
                                    {['L', 'M', 'X', 'J', 'V', 'S', 'D'].map(day => (
                                        <span key={day} className="text-[9px] font-black opacity-30">{day}</span>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* DEMAND MIX - CSS CONIC GRADIENT */}
                        <div className="glass-panel rounded-[2.5rem] p-8 border border-[var(--border-color)] flex flex-col gap-8 relative group overflow-hidden">
                            <h3 className="text-sm font-black uppercase tracking-widest flex items-center gap-2">
                                <PieChart size={18} className="text-indigo-500" /> {t('demand_mix')}
                            </h3>

                            <div className="flex-1 flex flex-col justify-center items-center py-6">
                                <div
                                    className="size-48 rounded-full relative flex items-center justify-center shadow-[0_0_50px_rgba(0,0,0,0.3)] transition-transform duration-700 group-hover:rotate-12"
                                    style={{
                                        background: `conic-gradient(
                                            #6366f1 0% ${data.demandMix.standard}%, 
                                            #f43f5e ${data.demandMix.standard}% ${data.demandMix.standard + data.demandMix.urgent}%, 
                                            #f59e0b ${data.demandMix.standard + data.demandMix.urgent}% 100%
                                        )`
                                    }}
                                >
                                    {/* Inner Hole */}
                                    <div className="size-32 rounded-full bg-[var(--bg-main)] border border-[var(--border-color)] flex flex-col items-center justify-center p-4 text-center">
                                        <span className="text-[8px] font-black uppercase opacity-40 leading-none mb-1">Total</span>
                                        <span className="text-2xl font-black tracking-tight">100%</span>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 w-full gap-4 mt-10">
                                    {[
                                        { label: t('standard'), val: data.demandMix.standard, color: 'bg-indigo-500' },
                                        { label: t('urgent'), val: data.demandMix.urgent, color: 'bg-rose-500' },
                                        { label: t('special'), val: data.demandMix.special, color: 'bg-amber-500' }
                                    ].map((item, i) => (
                                        <div key={i} className="flex items-center justify-between group/item">
                                            <div className="flex items-center gap-3">
                                                <div className={`size-2 rounded-full ${item.color} shadow-lg`}></div>
                                                <span className="text-[10px] font-black uppercase opacity-60 group-hover/item:opacity-100 transition-opacity">{item.label}</span>
                                            </div>
                                            <span className="text-[10px] font-black">{item.val}%</span>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="mt-auto p-4 bg-indigo-500/5 border border-indigo-500/10 rounded-2xl relative overflow-hidden">
                                <div className="absolute top-0 left-0 w-1 h-full bg-indigo-500"></div>
                                <p className="text-[9px] font-bold leading-relaxed text-[var(--text-muted)] italic">
                                    {t('mix_efficiency_impact', { value: '4.2%' })}
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        {[
                            { label: t('mttr'), value: `${data.mttr}${t('hours_short')}`, icon: <Zap size={20} className="text-amber-500" /> },
                            { label: t('mtbf'), value: `${data.mtbf}${t('hours_short')}`, icon: <Activity size={20} className="text-emerald-500" /> },
                            { label: t('scrap_rate'), value: `${data.scrapRate}%`, icon: <ArrowDownRight size={20} className="text-rose-500" /> },
                            { label: t('cycle_time_variance'), value: `${data.cycleTimeVariance}${t('seconds_short')}`, icon: <TrendingUp size={20} className="text-indigo-500" /> },
                        ].map((stat, i) => (
                            <div key={i} className="bg-[var(--bg-sidebar)] border border-[var(--border-color)] rounded-[2rem] p-7 flex items-center gap-5 shadow-sm hover:translate-y-[-4px] transition-all duration-300 border-b-4 border-b-transparent hover:border-b-indigo-500">
                                <div className="p-4 bg-[var(--bg-main)] rounded-2xl border border-[var(--border-color)] text-indigo-500 group-hover:scale-110 transition-transform">
                                    {stat.icon}
                                </div>
                                <div>
                                    <p className="text-[9px] font-black text-[var(--text-muted)] uppercase tracking-[0.1em] mb-1 opacity-50">{stat.label}</p>
                                    <p className="text-2xl font-black tracking-tighter">{stat.value}</p>
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
