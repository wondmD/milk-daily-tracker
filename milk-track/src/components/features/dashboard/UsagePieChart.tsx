'use client';

import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  Legend
} from 'recharts';
import { useTranslation } from '@/hooks/useTranslation';

interface UsagePieChartProps {
  delivered: number;
  processed: number;
  stored: number;
  wasted: number;
}

export default function UsagePieChart({ delivered, processed, stored, wasted }: UsagePieChartProps) {
  const { t } = useTranslation();

  const data = [
    { name: t('dashboard', 'delivered'), value: delivered, color: '#059669' }, // success
    { name: t('dashboard', 'processing'), value: processed, color: '#0284C7' }, // info
    { name: t('dashboard', 'storage'), value: stored, color: '#F59E0B' }, // warning
    { name: t('dashboard', 'waste'), value: wasted, color: '#DC2626' }, // danger
  ].filter(item => item.value > 0);

  if (data.length === 0) {
    return (
      <div className="h-[200px] w-full flex items-center justify-center text-muted text-sm">
        {t('common', 'noDataAvailable')}
      </div>
    );
  }

  return (
    <div className="h-[240px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={60}
            outerRadius={80}
            paddingAngle={5}
            dataKey="value"
            stroke="none"
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip 
            contentStyle={{ 
              backgroundColor: 'hsl(var(--surface))', 
              borderColor: 'hsl(var(--border))',
              borderRadius: '8px',
              boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
            }}
            itemStyle={{ fontWeight: 600 }}
          />
          <Legend verticalAlign="bottom" height={36} wrapperStyle={{ fontSize: 13 }} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
