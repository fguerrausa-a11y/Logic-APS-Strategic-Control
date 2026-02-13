
export interface NavItem {
  name: string;
  icon: string;
  path: string;
}

export interface KPIProps {
  label: string;
  value: string;
  unit?: string;
  trend?: string;
  trendPositive?: boolean;
  statusLabel?: string;
  progressColor: string;
  progressWidth: string;
  icon: string;
}

export interface BufferItem {
  workOrder: string;
  product: string;
  dueDate: string;
  consumption: number;
  status: 'Critical' | 'Watch' | 'Safe' | 'Crítico' | 'Advertencia' | 'Seguro';
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  key?: string;
}
