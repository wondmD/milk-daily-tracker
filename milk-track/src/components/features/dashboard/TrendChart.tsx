'use client';

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend
} from 'recharts';
import { TrendSummary } from '@/services/reports';
import { useTranslation } from '@/hooks/useTranslation';

interface TrendChartProps {
  data: TrendSummary[];
}

export default function TrendChart({ data }: TrendChartProps) {
  const { t } = useTranslation();

  const formatData = data.map(item => ({
    name: `${item.date.split(' ')[0]} ${item.day}`, // e.g. "Meskerem 5"
    Collected: item.collected,
    Delivered: item.delivered,
  }));

  if (!data || data.length === 0) {
    return (
      <div className="h-full w-full flex items-center justify-center text-muted text-sm bg-surface-secondary/20 rounded-[14px]">
        {t('common', 'noDataAvailable')}
      </div>
    );
  }

  return (
    <div className="h-[300px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart
          data={formatData}
          margin={{
            top: 10,
            right: 0,
            left: -20,
            bottom: 0,
          }}
        >
          <defs>
            <linearGradient id="colorCollected" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#1E3A8A" stopOpacity={0.8}/>
              <stop offset="95%" stopColor="#1E3A8A" stopOpacity={0}/>
            </linearGradient>
            <linearGradient id="colorDelivered" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#059669" stopOpacity={0.8}/>
              <stop offset="95%" stopColor="#059669" stopOpacity={0}/>
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
          <XAxis 
            dataKey="name" 
            axisLine={false} 
            tickLine={false} 
            tick={{ fill: 'hsl(var(--muted))', fontSize: 12 }} 
            dy={10}
          />
          <YAxis 
            axisLine={false} 
            tickLine={false} 
            tick={{ fill: 'hsl(var(--muted))', fontSize: 12 }} 
          />
          <Tooltip 
            contentStyle={{ 
              backgroundColor: 'hsl(var(--surface))', 
              borderColor: 'hsl(var(--border))',
              borderRadius: '8px',
              boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
            }}
            itemStyle={{ fontWeight: 600 }}
          />
          <Legend verticalAlign="top" height={36} wrapperStyle={{ fontSize: 13 }} />
          <Area 
            type="monotone" 
            dataKey="Collected" 
            stroke="#1E3A8A" 
            strokeWidth={3}
            fillOpacity={1} 
            fill="url(#colorCollected)" 
          />
          <Area 
            type="monotone" 
            dataKey="Delivered" 
            stroke="#059669" 
            strokeWidth={3}
            fillOpacity={1} 
            fill="url(#colorDelivered)" 
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
