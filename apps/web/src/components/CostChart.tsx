import React from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer } from 'recharts';
import { DashboardCard } from './DashboardCard';

interface Props {
  dailyCosts: { date: string; llmCost: number; cloudCost: number; totalCost: number }[];
}

export function CostChart({ dailyCosts }: Props) {
  const legend = (
    <>
      <div className="legend-item"><span className="legend-dot llm"></span>LLM</div>
      <div className="legend-item"><span className="legend-dot cloud"></span>Cloud</div>
    </>
  );

  return (
    <DashboardCard id="cost-chart" title="DAILY COST BREAKDOWN" legend={legend}>
      <ResponsiveContainer width="100%" height={260}>
        <AreaChart data={dailyCosts}>
          <defs>
            <linearGradient id="gradLLM" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--accent)" stopOpacity={0.08} />
              <stop offset="100%" stopColor="var(--accent)" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="gradCloud" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--violet)" stopOpacity={0.08} />
              <stop offset="100%" stopColor="var(--violet)" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="1 4" stroke="var(--border-base)" />
          <XAxis dataKey="date" tick={{ fill: 'var(--text-muted)', fontSize: 10 }} tickLine={false} axisLine={false}
            tickFormatter={(v: string) => v.slice(5)} />
          <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 10 }} tickLine={false} axisLine={false}
            tickFormatter={(v: number) => `$${v}`} />
          <RechartsTooltip
            contentStyle={{ background: '#0b0f1a', border: '1px solid var(--border-base)', borderRadius: 'var(--radius)', boxShadow: 'none', fontSize: 12 }}
            labelStyle={{ color: 'var(--text-primary)' }}
            itemStyle={{ color: 'var(--text-secondary)' }}
            formatter={(value: number) => [`$${value.toFixed(2)}`, '']}
          />
          <Area type="monotone" dataKey="llmCost" name="LLM Spend" stroke="var(--accent)" fill="url(#gradLLM)" strokeWidth={1.5} />
          <Area type="monotone" dataKey="cloudCost" name="Cloud Spend" stroke="var(--violet)" fill="url(#gradCloud)" strokeWidth={1.5} />
        </AreaChart>
      </ResponsiveContainer>
    </DashboardCard>
  );
}
