
import React from 'react';
import Sidebar from '../components/Sidebar';
import TopHeader from '../components/TopHeader';
import { useTranslation } from '../services/languageService';

const LoadAnalysisPage: React.FC = () => {
  const { t } = useTranslation();
  return (
    <div className="flex h-screen overflow-hidden bg-background-dark font-body">
      <Sidebar />
      <main className="flex-1 flex flex-col h-full overflow-hidden relative">
        <TopHeader title={t('wc_load_analysis')} icon="bar_chart" />
        <div className="flex-1 overflow-y-auto p-6 lg:p-8">
          <div className="max-w-[1400px] mx-auto flex flex-col gap-6">
            <section className="grid grid-cols-1 xl:grid-cols-3 gap-6">
              <div className="xl:col-span-2 rounded-xl border border-[#3b4754] bg-surface-darker p-6 flex flex-col">
                <div className="flex items-center justify-between mb-8">
                  <div>
                    <h3 className="text-white text-lg font-bold flex items-center gap-2 font-display">
                      <span className="material-symbols-outlined text-primary">bar_chart</span>
                      {t('wc_loading')}
                    </h3>
                    <p className="text-[#9dabb9] text-xs mt-1">{t('wc_load_desc')}</p>
                  </div>
                </div>
                <div className="flex-1 min-h-[300px] flex items-end justify-between gap-4 md:gap-10 relative px-4 border-b border-[#283039]">
                  <div className="absolute left-0 right-0 bottom-[100%] h-px border-t border-dashed border-red-500/50 flex items-center z-0">
                    <span className="text-red-400 text-[10px] font-bold bg-surface-darker pr-2 -ml-2">{t('overload')}</span>
                  </div>
                  <div className="absolute left-0 right-0 bottom-[80%] h-px border-t border-dashed border-[#5c6b7f]/60 flex items-center z-0">
                    <span className="text-[#5c6b7f] text-[10px] font-bold bg-surface-darker pr-2 -ml-2">{t('eighty_cap')}</span>
                  </div>

                  {[
                    { name: 'Corte Láser', load: 56, color: 'bg-primary/80' },
                    { name: 'Fresa CNC A', load: 115, color: 'bg-accent-red', drum: true },
                    { name: 'Soldadura', load: 41, color: 'bg-primary/80' },
                    { name: 'Ensamble', load: 78, color: 'bg-primary/80' },
                    { name: 'Control y Pack', load: 32, color: 'bg-primary/80' },
                  ].map((wc, i) => (
                    <div key={i} className="flex-1 flex flex-col justify-end group cursor-pointer relative z-10">
                      {wc.drum && (
                        <div className="absolute -top-14 left-1/2 -translate-x-1/2 bg-accent-red text-white text-[10px] uppercase font-bold px-2 py-0.5 rounded shadow-lg shadow-accent-red/20 whitespace-nowrap animate-pulse">{t('the_drum')}</div>
                      )}
                      <div className={`w-full bg-[#283039] rounded-t-sm relative h-full overflow-hidden flex items-end ${wc.drum ? 'border-x border-t border-accent-red/30' : ''}`}>
                        <div className={`w-full ${wc.color} transition-all duration-1000 rounded-t-sm relative`} style={{ height: `${Math.min(wc.load, 100)}%` }}>
                          {wc.load > 100 && (
                            <div className="absolute inset-0 bg-red-400 animate-pulse" style={{ height: '100%' }}></div>
                          )}
                        </div>
                      </div>
                      <p className={`text-xs font-medium text-center mt-3 uppercase tracking-wide truncate ${wc.drum ? 'text-white font-bold' : 'text-[#9dabb9]'}`}>
                        {wc.name}
                      </p>
                      <p className="text-[10px] text-center text-[#5c6b7f] mt-1">{wc.load}%</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-xl border border-[#3b4754] bg-surface-darker p-6 flex flex-col">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-white text-lg font-bold flex items-center gap-2 font-display">
                    <span className="material-symbols-outlined text-primary">inventory</span>
                    {t('material_buffers')}
                  </h3>
                </div>
                <div className="flex-1 flex flex-col justify-center gap-8">
                  {[
                    { name: 'Chapa Acero (3mm)', val: 18, status: t('low'), color: 'text-accent-red' },
                    { name: 'Líquido Hidráulico ISO-46', val: 82, status: t('safe'), color: 'text-accent-green' },
                    { name: 'Motores Elec. (Servo X)', val: 45, status: t('warning'), color: 'text-accent-yellow' },
                  ].map((buf, i) => (
                    <div key={i}>
                      <div className="flex justify-between text-xs font-medium mb-2">
                        <span className="text-slate-200">{buf.name}</span>
                        <span className={`${buf.color} font-bold`}>{buf.val}% ({buf.status})</span>
                      </div>
                      <div className="h-3 bg-[#283039] rounded-full relative overflow-hidden">
                        <div className="absolute inset-0 bg-gradient-to-r from-accent-red from-30% via-accent-yellow via-50% to-accent-green to-80% opacity-30"></div>
                        <div
                          className="absolute top-0 bottom-0 w-1.5 h-full bg-white shadow-[0_0_10px_rgba(255,255,255,1)] rounded-full z-10 transition-all duration-1000"
                          style={{ left: `${buf.val}%` }}
                        ></div>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-8 flex justify-center gap-4 text-[10px] font-bold text-[#5c6b7f] uppercase tracking-wider">
                  <div className="flex items-center gap-1.5"><div className="size-2 rounded-full bg-accent-red"></div><span>{t('critical')}</span></div>
                  <div className="flex items-center gap-1.5"><div className="size-2 rounded-full bg-accent-yellow"></div><span>{t('warning')}</span></div>
                  <div className="flex items-center gap-1.5"><div className="size-2 rounded-full bg-accent-green"></div><span>{t('healthy')}</span></div>
                </div>
              </div>
            </section>
          </div>
        </div>
      </main>
    </div>
  );
};

export default LoadAnalysisPage;
