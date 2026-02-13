
import React, { useState } from 'react';
import TopHeader from '../components/TopHeader';
import Sidebar from '../components/Sidebar';
import { KPIProps } from '../types';
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
  const [selectedKPI, setSelectedKPI] = useState<DrillDownData | null>(null);

  const kpis = [
    {
      label: t('oee_efficiency'),
      value: '87',
      unit: '%',
      trend: '+2.4%',
      trendPositive: true,
      progressColor: 'bg-emerald-500',
      progressWidth: '87%',
      icon: <Activity size={24} />,
      drillDown: {
        title: t('oee_efficiency'),
        description: t('ops_monitoring'),
        details: [
          { label: 'Disponibilidad (A)', value: '92%', color: 'text-emerald-500' },
          { label: 'Rendimiento (P)', value: '96%', color: 'text-indigo-500' },
          { label: 'Calidad (Q)', value: '98.5%', color: 'text-purple-500' },
          { label: 'OEE Global', value: '87.0%', color: 'text-[var(--text-main)]' }
        ]
      }
    },
    {
      label: t('compliance'),
      value: '94',
      unit: '%',
      trend: '-1.1%',
      trendPositive: false,
      progressColor: 'bg-indigo-500',
      progressWidth: '94%',
      icon: <CheckCircle2 size={24} />,
      drillDown: {
        title: t('compliance'),
        description: t('ops_monitoring'),
        details: [
          { label: t('scheduled_ops'), value: '145 Ops' },
          { label: t('on_time'), value: '136 Ops', color: 'text-indigo-500' },
          { label: t('deviation'), value: '-9 Ops', color: 'text-rose-500' },
          { label: 'OTIF', value: '93.8%', color: 'text-[var(--text-main)]' }
        ]
      }
    },
    {
      label: t('active_delays'),
      value: '3',
      unit: 'Orders',
      trend: '...',
      trendPositive: true,
      progressColor: 'bg-amber-500',
      progressWidth: '12%',
      icon: <AlertCircle size={24} />,
      drillDown: {
        title: t('active_delays'),
        description: t('root_cause'),
        details: [
          { label: 'OP-4092', value: '+2 Días', color: 'text-amber-500' },
          { label: 'OP-4105', value: '+1 Día', color: 'text-amber-500' },
          { label: 'OP-4112', value: 'Critical', color: 'text-rose-500' }
        ]
      }
    },
    {
      label: t('operative_cost'),
      value: '1.2M',
      unit: 'USD',
      trend: '-5%',
      trendPositive: true,
      progressColor: 'bg-cyan-500',
      progressWidth: '65%',
      icon: <DollarSign size={24} />,
      drillDown: {
        title: t('operative_cost'),
        description: t('ops_monitoring'),
        details: [
          { label: 'Raw Material', value: '$ 650K' },
          { label: 'Labor', value: '$ 320K' },
          { label: 'Overheads', value: '$ 180K' },
          { label: 'Saving', value: '$ 50K', color: 'text-emerald-500' }
        ]
      }
    },
  ];

  return (
    <div className="flex h-screen overflow-hidden bg-[var(--bg-main)] text-[var(--text-main)] font-body transition-colors">
      <Sidebar />
      <main className="flex-1 flex flex-col h-full overflow-hidden relative">
        <TopHeader title={t('strategic_control')} icon="hub" showSimulationButton={true} />

        <div className="flex-1 overflow-y-auto p-8 space-y-10 bg-grid-slate-900/[0.02]">

          {/* Welcome Header Section */}
          <div className="flex flex-col md:flex-row justify-between items-end gap-6">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="h-1 w-12 bg-indigo-500 rounded-full"></span>
                <span className="text-[10px] font-black uppercase tracking-[0.3em] text-indigo-500">{t('global_overview')}</span>
              </div>
              <h2 className="text-4xl font-black uppercase tracking-tighter leading-none">{t('ops_status')}</h2>
              <p className="text-[var(--text-muted)] text-xs font-bold uppercase tracking-widest mt-3 opacity-70">{t('ops_monitoring')}</p>
            </div>
            <div className="flex gap-3">
              <div className="flex flex-col items-end">
                <span className="text-[9px] font-black text-[var(--text-muted)] uppercase tracking-widest mb-1">{t('network_load')}</span>
                <div className="flex items-center gap-2 bg-[var(--bg-card)] px-4 py-2 rounded-xl border border-[var(--border-color)]">
                  <Zap size={12} className="text-amber-500 fill-amber-500" />
                  <span className="text-xs font-black uppercase">92% {t('capacity')}</span>
                </div>
              </div>
            </div>
          </div>

          {/* KPI Grid */}
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

          {/* Bottom Analytics Section */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 bg-[var(--bg-sidebar)] border border-[var(--border-color)] rounded-[2.5rem] p-8 h-[450px] shadow-sm flex flex-col overflow-hidden relative group">
              <div className="flex justify-between items-center mb-8">
                <h3 className="text-sm font-black uppercase tracking-widest flex items-center gap-2">
                  <BarChart3 size={18} className="text-indigo-500" /> {t('historical_performance')}
                </h3>
                <div className="flex gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-indigo-500"></span>
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
                </div>
              </div>
              <div className="flex-1 flex flex-col items-center justify-center text-[var(--text-muted)] bg-[var(--bg-main)]/50 rounded-3xl border border-dashed border-[var(--border-color)] m-2 group-hover:bg-indigo-500/[0.02] transition-colors">
                <div className="p-6 bg-[var(--bg-card)] rounded-full mb-4 border border-[var(--border-color)] shadow-xl shadow-black/10">
                  <Factory size={48} className="opacity-40 text-indigo-500" />
                </div>
                <p className="font-black uppercase tracking-widest text-[10px]">{t('real_time_load')}</p>
                <p className="text-[9px] opacity-40 mt-1 uppercase font-bold tracking-tighter">{t('waiting_engine')}</p>
              </div>
            </div>

            <div className="bg-[var(--bg-sidebar)] border border-[var(--border-color)] rounded-[2.5rem] p-8 h-[450px] shadow-sm flex flex-col">
              <h3 className="text-sm font-black uppercase tracking-widest mb-8 flex items-center gap-2">
                <TrendingUp size={18} className="text-emerald-500" /> {t('direct_traceability')}
              </h3>
              <div className="space-y-4 flex-1 overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-[var(--border-color)]">
                {[
                  { title: t('alert_delay_line'), desc: t('alert_material_shortage'), time: '15 min ago', type: 'error' },
                  { title: t('alert_maint_cnc'), desc: t('alert_maint_done'), time: '1 hr ago', type: 'info' },
                  { title: t('alert_new_order'), desc: t('alert_scenario_applied'), time: '2 hrs ago', type: 'success' },
                  { title: t('alert_warehouse_buffer'), desc: t('alert_min_stock'), time: '4 hrs ago', type: 'warning' },
                ].map((alert, i) => (
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
