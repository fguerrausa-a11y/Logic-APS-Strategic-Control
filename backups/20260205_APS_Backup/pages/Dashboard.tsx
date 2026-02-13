
import React, { useState, useEffect } from 'react';
import TopHeader from '../components/TopHeader';
import Sidebar from '../components/Sidebar';
import { supabase } from '../services/supabaseClient';
import { useSimulation } from '../services/SimulationContext';
import {
  Activity,
  CheckCircle2,
  AlertCircle,
  DollarSign,
  TrendingUp,
  BarChart3,
  Factory,
  Zap,
  ArrowUpRight,
  ArrowDownRight
} from 'lucide-react';
import { useTranslation } from '../services/languageService';

interface DrillDownData {
  title: string;
  description: string;
  details: { label: string; value: string; color?: string }[];
}

const KPIDetailModal: React.FC<{ isOpen: boolean; onClose: () => void; data: DrillDownData | null }> = ({ isOpen, onClose, data }) => {
  const { t } = useTranslation();
  if (!isOpen || !data) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm transition-all animate-in fade-in" onClick={onClose}>
      <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-[2.5rem] w-full max-w-lg overflow-hidden shadow-2xl animate-in zoom-in duration-300" onClick={e => e.stopPropagation()}>
        <div className="p-8 border-b border-[var(--border-color)] flex justify-between items-center bg-[var(--bg-sidebar)]">
          <div>
            <h3 className="text-xl font-black uppercase tracking-tighter">{data.title}</h3>
            <p className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest mt-1">{data.description}</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-xl transition-colors"><AlertCircle size={24} className="rotate-45" /></button>
        </div>
        <div className="p-8 space-y-4 bg-[var(--bg-main)]">
          {data.details.map((detail, idx) => (
            <div key={idx} className="flex justify-between items-center p-5 bg-[var(--bg-card)] rounded-2xl border border-[var(--border-color)] shadow-sm hover:border-indigo-500/30 transition-all group">
              <span className="text-[var(--text-muted)] font-bold text-xs uppercase tracking-widest group-hover:text-[var(--text-main)] transition-colors">{detail.label}</span>
              <span className={`font-black font-mono text-lg ${detail.color || 'text-[var(--text-main)]'}`}>{detail.value}</span>
            </div>
          ))}
        </div>
        <div className="p-6 bg-[var(--bg-sidebar)] text-center border-t border-[var(--border-color)]">
          <p className="text-[9px] font-black text-[var(--text-muted)] uppercase tracking-[0.2em] opacity-50">{t('data_sync')}</p>
        </div>
      </div>
    </div>
  );
};

const Dashboard: React.FC = () => {
  const { t } = useTranslation();
  const { selectedScenarioId, scenarios } = useSimulation();
  const [selectedKPI, setSelectedKPI] = useState<DrillDownData | null>(null);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    oee: 87,
    compliance: 0,
    delays: 0,
    cost: 0,
    totalOrders: 0,
    onTimeOrders: 0,
    load: 92
  });
  const [alerts, setAlerts] = useState<any[]>([]);
  const [chartData, setChartData] = useState<{ label: string, value: number }[]>([]);

  useEffect(() => {
    if (selectedScenarioId) {
      fetchDashboardData(selectedScenarioId);
    } else if (!loading && !scenarios.length) {
      setLoading(false);
    }
  }, [selectedScenarioId, scenarios]);

  const fetchDashboardData = async (scenarioId: string) => {
    setLoading(true);
    try {
      // 1. Fetch Proposed Work Orders
      const { data: pwos, error: pwoError } = await supabase
        .from('proposed_work_orders')
        .select('*')
        .eq('scenario_id', scenarioId);

      if (pwoError) throw pwoError;

      if (pwos) {
        const total = pwos.length;
        const delayed = pwos.filter((p: any) => (p.delay_days || 0) > 0).length;
        const onTime = total - delayed;
        const compliance = total > 0 ? Math.round((onTime / total) * 100) : 0;

        // 2. Costs
        const itemIds = Array.from(new Set(pwos.map(p => p.item_id).filter(Boolean)));
        let totalCost = 0;
        if (itemIds.length > 0) {
          const { data: items } = await supabase.from('items').select('id, unit_cost').in('id', itemIds);
          if (items) {
            const costMap = items.reduce((acc: any, it: any) => ({ ...acc, [it.id]: it.unit_cost || 0 }), {});
            totalCost = pwos.reduce((acc: number, p: any) => acc + (costMap[p.item_id] || 0) * (p.quantity || 0), 0);
          }
        }

        // 3. Load
        const { data: ops } = await supabase
          .from('proposed_operations')
          .select('run_time_minutes, setup_time_minutes')
          .eq('scenario_id', scenarioId);

        let estimatedLoad = 92;
        if (ops && ops.length > 0) {
          const totalWorkMinutes = ops.reduce((acc, o) => acc + (o.run_time_minutes || 0) + (o.setup_time_minutes || 0), 0);
          estimatedLoad = Math.min(98, Math.max(30, Math.round((totalWorkMinutes / 50000) * 100)));
        }

        const oeeBase = 85;
        const oeeImpact = total > 0 ? (delayed > 0 ? Math.max(-15, -(delayed / total) * 20) : 5) : 0;
        const estimatedOEE = Math.min(98, Math.max(60, oeeBase + oeeImpact));

        setStats({
          oee: Math.round(estimatedOEE),
          compliance,
          delays: delayed,
          cost: totalCost,
          totalOrders: total,
          onTimeOrders: onTime,
          load: estimatedLoad
        });

        // 4. Alerts
        const realAlerts = pwos
          .filter(p => p.severity === 'red' || p.severity === 'yellow')
          .map(p => {
            const orderId = (p.work_order_id && p.work_order_id !== 'null') ? p.work_order_id : (p.ref_erp_id || 'NEW');
            return {
              title: p.severity === 'red' ? t('alert_delay_line') : t('alert_warning'),
              desc: `${orderId}: ${p.delay_reason || (p.delay_days + ' ' + t('days_plural', { count: p.delay_days }))}`,
              time: 'Simulated',
              type: p.severity === 'red' ? 'error' : 'warning'
            };
          });

        if (realAlerts.length === 0) {
          realAlerts.push({ title: t('alert_new_order'), desc: t('alert_scenario_applied'), time: 'Just now', type: 'success' });
        }
        setAlerts(realAlerts);

        // 5. Chart
        const dayCounts: Record<string, number> = {};
        pwos.forEach(p => {
          if (p.end_date) {
            const dateStr = p.end_date.split('T')[0];
            const qty = Number(p.quantity || p.quantity_ordered || 0);
            dayCounts[dateStr] = (dayCounts[dateStr] || 0) + qty;
          }
        });
        const sortedDays = Object.entries(dayCounts)
          .sort((a, b) => a[0].localeCompare(b[0]))
          .slice(0, 7)
          .map(([date, value]) => ({
            label: date.split('-').reverse().slice(0, 2).join('/'),
            value
          }));
        setChartData(sortedDays);
      }
    } catch (err) {
      console.error("fetchDashboardData Error", err);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value: number) => {
    if (value >= 1000000) return (value / 1000000).toFixed(1) + 'M';
    if (value >= 1000) return (value / 1000).toFixed(1) + 'K';
    return value.toString();
  };

  const kpis = [
    {
      label: t('oee_efficiency'),
      value: stats.oee.toString(),
      unit: '%',
      trend: stats.oee > 80 ? '+1.2%' : '-2.4%',
      trendPositive: stats.oee > 80,
      progressColor: stats.oee > 80 ? 'bg-emerald-500' : 'bg-amber-500',
      progressWidth: `${stats.oee}%`,
      icon: <Activity size={24} />,
      drillDown: {
        title: t('oee_efficiency'),
        description: t('ops_monitoring'),
        details: [
          { label: t('availability'), value: '92%', color: 'text-emerald-500' },
          { label: t('performance'), value: `${stats.oee + 5}%`, color: 'text-indigo-500' },
          { label: t('quality'), value: '98.5%', color: 'text-purple-500' },
          { label: t('global_oee'), value: `${stats.oee}.0%`, color: 'text-[var(--text-main)]' }
        ]
      }
    },
    {
      label: t('compliance'),
      value: stats.compliance.toString(),
      unit: '%',
      trend: stats.compliance > 90 ? '+0.4%' : '-3.2%',
      trendPositive: stats.compliance > 90,
      progressColor: 'bg-indigo-500',
      progressWidth: `${stats.compliance}%`,
      icon: <CheckCircle2 size={24} />,
      drillDown: {
        title: t('compliance'),
        description: t('ops_monitoring'),
        details: [
          { label: t('scheduled_ops'), value: `${stats.totalOrders} Ops` },
          { label: t('on_time'), value: `${stats.onTimeOrders} Ops`, color: 'text-indigo-500' },
          { label: t('deviation'), value: `${-stats.delays} Ops`, color: stats.delays > 0 ? 'text-rose-500' : 'text-emerald-500' },
          { label: t('otif'), value: `${stats.compliance}%`, color: 'text-[var(--text-main)]' }
        ]
      }
    },
    {
      label: t('active_delays'),
      value: stats.delays.toString(),
      unit: t('orders'),
      trend: stats.delays > 5 ? 'High' : 'Low',
      trendPositive: stats.delays <= 2,
      progressColor: stats.delays > 0 ? 'bg-amber-500' : 'bg-emerald-500',
      progressWidth: stats.totalOrders > 0 ? `${(stats.delays / stats.totalOrders) * 100}%` : '0%',
      icon: <AlertCircle size={24} />,
      drillDown: {
        title: t('active_delays'),
        description: t('root_cause'),
        details: [
          { label: t('total_delayed'), value: stats.delays.toString(), color: 'text-rose-500' },
          { label: t('avg_delay'), value: '1.4 ' + t('days'), color: 'text-amber-500' }
        ]
      }
    },
    {
      label: t('operative_cost'),
      value: formatCurrency(stats.cost),
      unit: 'USD',
      trend: '-2%',
      trendPositive: true,
      progressColor: 'bg-cyan-500',
      progressWidth: '70%',
      icon: <DollarSign size={24} />,
      drillDown: {
        title: t('operative_cost'),
        description: t('ops_monitoring'),
        details: [
          { label: t('estimated_total'), value: `$ ${formatCurrency(stats.cost)}` },
          { label: t('order_count'), value: stats.totalOrders.toString() }
        ]
      }
    },
  ];

  return (
    <div className="flex h-screen overflow-hidden bg-[var(--bg-main)] text-[var(--text-main)] font-body transition-colors">
      <Sidebar />
      <main className="flex-1 flex flex-col h-full overflow-hidden relative">
        <TopHeader title={t('strategic_control')} icon="hub" showSimulationButton={true} />

        <div className="flex-1 overflow-y-auto p-8 space-y-10 bg-[var(--bg-main)]">

          <div className="flex flex-col md:flex-row justify-between items-end gap-6">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="h-1 w-12 bg-indigo-500 rounded-full"></span>
                <span className="text-[10px] font-black uppercase tracking-[0.3em] text-indigo-500">{t('global_overview')}</span>
              </div>
              <h2 className="text-4xl font-black uppercase tracking-tighter leading-none">{t('ops_status')}</h2>
              <p className="text-[var(--text-muted)] text-xs font-bold uppercase tracking-widest mt-3 opacity-70">{t('ops_monitoring')}</p>
            </div>
            <div className="flex gap-4">
              <div className="flex flex-col items-end">
                <span className="text-[9px] font-black text-[var(--text-muted)] uppercase tracking-widest mb-1">{t('network_load')}</span>
                <div className="flex items-center gap-2 bg-[var(--bg-card)] px-4 py-2 rounded-xl border border-[var(--border-color)]">
                  <Zap size={12} className={`transition-colors ${stats.load > 85 ? 'text-rose-500 fill-rose-500' : 'text-amber-500 fill-amber-500'}`} />
                  <span className={`text-xs font-black uppercase ${stats.load > 85 ? 'text-rose-500' : ''}`}>{stats.load}% {t('capacity')}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {kpis.map((kpi, idx) => (
              <div
                key={idx}
                className="bg-[var(--bg-sidebar)] border border-[var(--border-color)] rounded-[2rem] p-6 shadow-sm relative overflow-hidden group hover:border-indigo-500/40 transition-all cursor-pointer hover:shadow-2xl hover:shadow-indigo-500/5 hover:-translate-y-1"
                onClick={() => setSelectedKPI(kpi.drillDown)}
              >
                <div className="flex justify-between items-start mb-6">
                  <div className="p-3.5 rounded-2xl bg-[var(--bg-main)] border border-[var(--border-color)] text-[var(--text-muted)] group-hover:text-indigo-500 group-hover:border-indigo-500/20 transition-all shadow-inner">
                    {kpi.icon}
                  </div>
                  <div className={`flex items-center gap-1 text-[10px] font-black px-2.5 py-1 rounded-full ${kpi.trendPositive ? 'bg-emerald-500/10 text-emerald-500' : 'bg-rose-500/10 text-rose-500'}`}>
                    {kpi.trendPositive ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
                    {kpi.trend}
                  </div>
                </div>
                <h3 className="text-[var(--text-muted)] text-[10px] font-black uppercase tracking-widest mb-2">{kpi.label}</h3>
                <div className="flex items-baseline gap-1.5 mb-6">
                  <span className="text-4xl font-black tracking-tighter text-[var(--text-main)]">{kpi.value}</span>
                  {kpi.unit && <span className="text-xs font-black text-[var(--text-muted)] uppercase">{kpi.unit}</span>}
                </div>
                <div className="w-full bg-[var(--bg-main)] h-1.5 rounded-full overflow-hidden shadow-inner border border-[var(--border-color)]">
                  <div className={`h-full rounded-full ${kpi.progressColor} shadow-[0_0_8px_rgba(0,0,0,0.2)]`} style={{ width: kpi.progressWidth }}></div>
                </div>
              </div>
            ))}
          </div>

          <KPIDetailModal isOpen={!!selectedKPI} onClose={() => setSelectedKPI(null)} data={selectedKPI} />

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 bg-[var(--bg-sidebar)] border border-[var(--border-color)] rounded-[2.5rem] p-8 h-[450px] shadow-sm flex flex-col overflow-hidden relative group">
              <div className="flex justify-between items-center mb-8">
                <h3 className="text-sm font-black uppercase tracking-widest flex items-center gap-2">
                  <BarChart3 size={18} className="text-indigo-500" /> {t('historical_performance')}
                </h3>
              </div>
              <div className="flex-1 flex flex-col items-center justify-end px-2 pb-6">
                <div className="flex items-end justify-between w-full h-[300px] gap-3 px-4">
                  {chartData.length > 0 ? chartData.map((d, i) => {
                    const maxVal = Math.max(...chartData.map(cd => cd.value));
                    const barHeight = maxVal > 0 ? Math.max(d.value > 0 ? 5 : 0, (d.value / maxVal) * 90) : 0;
                    return (
                      <div key={i} className="flex-1 flex flex-col items-center group/bar h-full justify-end">
                        <div className="relative w-full flex flex-col items-center justify-end h-full">
                          <div className={`absolute -top-8 transition-all duration-300 opacity-0 group-hover/bar:opacity-100 bg-indigo-600 text-[10px] font-black px-2 py-1 rounded-lg text-white whitespace-nowrap z-20 shadow-xl shadow-indigo-500/20 translate-y-2 group-hover/bar:translate-y-0`}>
                            {d.value.toLocaleString()} U
                          </div>
                          <div
                            className="w-full max-w-[45px] bg-gradient-to-t from-indigo-600/40 via-indigo-500 to-cyan-400 rounded-t-xl transition-all duration-1000 ease-out hover:brightness-125 hover:shadow-[0_0_20px_rgba(99,102,241,0.4)]"
                            style={{ height: `${barHeight}%` }}
                          ></div>
                        </div>
                        <span className="text-[9px] font-black text-[var(--text-muted)] mt-4 uppercase tracking-tighter whitespace-nowrap">{d.label}</span>
                      </div>
                    );
                  }) : (
                    <div className="w-full h-full flex flex-col items-center justify-center opacity-30">
                      <Factory size={48} className="mb-4 text-indigo-500" />
                      <p className="font-black uppercase tracking-widest text-[10px]">{t('waiting_engine')}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="bg-[var(--bg-sidebar)] border border-[var(--border-color)] rounded-[2.5rem] p-8 h-[450px] shadow-sm flex flex-col">
              <h3 className="text-sm font-black uppercase tracking-widest mb-8 flex items-center gap-2">
                <TrendingUp size={18} className="text-emerald-500" /> {t('direct_traceability')}
              </h3>
              <div className="space-y-4 flex-1 overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-[var(--border-color)]">
                {alerts.map((alert, i) => (
                  <div key={i} className="flex gap-4 items-start p-5 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-color)] hover:border-indigo-500/20 transition-all group cursor-pointer shadow-sm">
                    <div className={`p-2 rounded-xl ${alert.type === 'error' ? 'bg-rose-500/10 text-rose-500' :
                      alert.type === 'warning' ? 'bg-amber-500/10 text-amber-500' :
                        alert.type === 'success' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-blue-500/10 text-blue-500'
                      }`}>
                      {alert.type === 'error' ? <AlertCircle size={16} /> : <CheckCircle2 size={16} />}
                    </div>
                    <div className="flex-1">
                      <p className="text-xs font-black uppercase tracking-tight text-[var(--text-main)] leading-none mb-1">{alert.title}</p>
                      <p className="text-[10px] text-[var(--text-muted)] font-bold">{alert.desc}</p>
                      <div className="flex justify-between items-center mt-3">
                        <span className="text-[8px] font-black uppercase tracking-widest opacity-40">{alert.time}</span>
                        <ArrowUpRight size={10} className="opacity-0 group-hover:opacity-100 transition-all text-indigo-500" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

        </div>
      </main>
    </div>
  );
};

export default Dashboard;
