
import React from 'react';
import { KPIProps } from '../types';

const KPICard: React.FC<KPIProps> = ({
  label,
  value,
  unit,
  trend,
  trendPositive,
  statusLabel,
  progressColor,
  progressWidth,
  icon
}) => {
  return (
    <div className="flex flex-col gap-1 rounded-xl p-5 border border-[var(--border-color)] bg-[var(--bg-card)] relative overflow-hidden group">
      <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
        <span className="material-symbols-outlined text-4xl text-[var(--accent)]" translate="no">{icon}</span>
      </div>
      <p className="text-[var(--text-muted)] text-sm font-medium uppercase tracking-wider font-display">{label}</p>
      <div className="flex items-baseline gap-2 mt-1">
        <p className="text-[var(--text-main)] text-3xl font-bold tracking-tight font-display">
          {value}
          {unit && <span className="text-lg text-[var(--text-muted)] font-normal">{unit}</span>}
        </p>
      </div>
      <div className="flex items-center gap-1 mt-2">
        <span className={`material-symbols-outlined text-sm ${trendPositive ? 'text-emerald-500' : 'text-rose-500'}`} translate="no">
          {trendPositive ? 'trending_up' : 'trending_down'}
        </span>
        <p className={`${trendPositive ? 'text-emerald-500' : 'text-rose-500'} text-sm font-medium`}>
          {trend} <span className="text-[var(--text-muted)] font-normal">{statusLabel}</span>
        </p>
      </div>
      <div className="h-1 w-full bg-[var(--bg-input)] mt-4 rounded-full overflow-hidden">
        <div className={`h-full ${progressColor} transition-all duration-1000`} style={{ width: progressWidth }}></div>
      </div>
    </div>
  );
};

export default KPICard;
