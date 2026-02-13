
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
    <div className="flex flex-col gap-1 rounded-xl p-5 border border-[#3b4754] bg-surface-darker relative overflow-hidden group">
      <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
        <span className="material-symbols-outlined text-4xl text-white">{icon}</span>
      </div>
      <p className="text-[#9dabb9] text-sm font-medium uppercase tracking-wider font-display">{label}</p>
      <div className="flex items-baseline gap-2 mt-1">
        <p className="text-white text-3xl font-bold tracking-tight font-display">
          {value}
          {unit && <span className="text-lg text-[#5c6b7f] font-normal">{unit}</span>}
        </p>
      </div>
      <div className="flex items-center gap-1 mt-2">
        <span className={`material-symbols-outlined text-sm ${trendPositive ? 'text-accent-green' : 'text-accent-red'}`}>
          {trendPositive ? 'trending_up' : 'trending_down'}
        </span>
        <p className={`${trendPositive ? 'text-accent-green' : 'text-accent-red'} text-sm font-medium`}>
          {trend} <span className="text-[#5c6b7f] font-normal">{statusLabel}</span>
        </p>
      </div>
      <div className="h-1 w-full bg-[#283039] mt-4 rounded-full overflow-hidden">
        <div className={`h-full ${progressColor} transition-all duration-1000`} style={{ width: progressWidth }}></div>
      </div>
    </div>
  );
};

export default KPICard;
