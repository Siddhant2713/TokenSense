import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, Cell } from 'recharts';
import type { TeamMetrics } from '../types';
import { DashboardCard } from './DashboardCard';

export function TeamMetricsTable({ metrics }: { metrics: TeamMetrics[] }) {
  const sortedByCost = [...metrics].sort((a, b) => b.cost - a.cost);

  const legend = (
    <div className="legend-item">
      <span className="legend-dot" style={{ background: 'var(--accent)' }}></span>Cost
    </div>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
      <DashboardCard id="team-cost-chart" title="TEAM COST BREAKDOWN" legend={legend}>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={sortedByCost}>
            <CartesianGrid strokeDasharray="1 4" stroke="var(--border-base)" />
            <XAxis dataKey="team" tick={{ fill: 'var(--text-muted)', fontSize: 10 }} tickLine={false} axisLine={false} />
            <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 10 }} tickLine={false} axisLine={false} tickFormatter={(v) => `$${v}`} />
            <RechartsTooltip
              contentStyle={{ background: '#0b0f1a', border: '1px solid var(--border-base)', borderRadius: 'var(--radius)', boxShadow: 'none', fontSize: 12 }}
              labelStyle={{ color: 'var(--text-primary)' }}
              itemStyle={{ color: 'var(--text-secondary)' }}
              formatter={(value: number) => [`$${value.toFixed(2)}`, 'Cost']}
              cursor={{ fill: 'rgba(255,255,255,0.03)' }}
            />
            <Bar dataKey="cost" radius={[4, 4, 0, 0]}>
              {sortedByCost.map((_, i) => (
                <Cell key={i} className="bar-chart-fill" />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </DashboardCard>

      <div className="table-container" style={{ padding: 0, background: 'transparent', border: 'none' }}>
        <table className="slim-table">
          <thead>
            <tr>
              <th>Team</th>
              <th>Calls</th>
              <th>Avg Input</th>
              <th>Primary Model</th>
              <th className="right-align">Cost</th>
              <th className="right-align">WoW</th>
            </tr>
          </thead>
          <tbody>
            {sortedByCost.map(m => {
              const primaryModel = Object.entries(m.modelsUsed).sort((a, b) => (b[1] ?? 0) - (a[1] ?? 0))[0]?.[0] || 'Unknown';
              return (
                <tr key={m.team}>
                  <td style={{ fontWeight: 600 }}>{m.team}</td>
                  <td className="mono">{m.totalCalls.toLocaleString()}</td>
                  <td className="mono">{Math.round(m.averageInputTokens).toLocaleString()}</td>
                  <td className="mono">{primaryModel}</td>
                  <td className="mono right-align">${m.cost.toFixed(2)}</td>
                  <td className={`mono right-align ${m.costVsLastWeek > 0 ? 'wow-positive' : m.costVsLastWeek < 0 ? 'wow-negative' : 'wow-neutral'}`}>
                    {m.costVsLastWeek > 0 ? `+${m.costVsLastWeek}%` : m.costVsLastWeek < 0 ? `${m.costVsLastWeek}%` : '0%'}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
