import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, Cell, PieChart, Pie } from 'recharts';
import type { RouterMockData } from '../routerMockData';
import { DashboardCard } from './DashboardCard';

const ROUTER_COLORS = ['#60a5fa', '#3b82f6', '#2563eb', '#1d4ed8', '#1e40af', '#1e3a8a'];

export function RouterDashboard({ data }: { data: RouterMockData }) {
  const { metrics, logs, models, latencyStats } = data;

  const costByModelData = Object.entries(metrics.costByModel)
    .map(([name, value]) => ({ name, value: parseFloat(value.toFixed(4)) }))
    .sort((a, b) => b.value - a.value);

  const taskTypeData = Object.entries(metrics.requestsByTaskType)
    .map(([name, value]) => ({ name, value }));

  const recentLogs = logs.slice(-20).reverse();

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
      <div className="kpi-strip">
        <div className="kpi-block">
          <div className="kpi-label">Routed Requests</div>
          <div className="kpi-value mono">{metrics.totalRequests.toLocaleString()}</div>
          <div className="kpi-sublabel">Smart routing active</div>
        </div>
        <div className="kpi-block">
          <div className="kpi-label">Router Cost</div>
          <div className="kpi-value mono">${metrics.totalCost.toFixed(4)}</div>
          <div className="kpi-sublabel">Optimized routing</div>
        </div>
        <div className="kpi-block">
          <div className="kpi-label">Avg Latency</div>
          <div className="kpi-value mono">{metrics.avgLatencyMs}ms</div>
          <div className="kpi-sublabel">P95 tracked</div>
        </div>
        <div className="kpi-block">
          <div className="kpi-label">Cache Hit Rate</div>
          <div className="kpi-value mono">{(metrics.cacheHitRate * 100).toFixed(1)}%</div>
          <div className="kpi-sublabel">Reduced API calls</div>
        </div>
      </div>

      <div className="two-col-grid">
        <DashboardCard id="router-cost-by-model" title="COST BY MODEL">
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={costByModelData}>
              <CartesianGrid strokeDasharray="1 4" stroke="var(--border-base)" />
              <XAxis dataKey="name" tick={{ fill: 'var(--text-muted)', fontSize: 10 }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 10 }} tickLine={false} axisLine={false} tickFormatter={(v) => `$${v}`} />
              <RechartsTooltip formatter={(value: number) => [`$${value.toFixed(4)}`, 'Cost']} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
              <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                {costByModelData.map((_, i) => (
                  <Cell key={i} fill={ROUTER_COLORS[i % ROUTER_COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </DashboardCard>

        <DashboardCard id="router-task-type" title="REQUESTS BY TASK TYPE">
          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Pie
                data={taskTypeData}
                cx="50%"
                cy="50%"
                outerRadius={90}
                dataKey="value"
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                labelLine={true}
                stroke="var(--bg-panel)"
                strokeWidth={2}
                style={{ fontSize: 10, fill: 'var(--text-secondary)' }}
              >
                {taskTypeData.map((_, i) => (
                  <Cell key={i} fill={ROUTER_COLORS[i % ROUTER_COLORS.length]} />
                ))}
              </Pie>
              <RechartsTooltip />
            </PieChart>
          </ResponsiveContainer>
        </DashboardCard>
      </div>

      <DashboardCard id="router-model-registry" title="MODEL REGISTRY">
        <div className="table-container" style={{ padding: 0, background: 'transparent', border: 'none' }}>
          <table className="slim-table registry-table">
            <thead>
              <tr>
                <th>Model</th>
                <th>Provider</th>
                <th>Tier</th>
                <th className="right-align">Input $/1M</th>
                <th className="right-align">Output $/1M</th>
                <th>Avg Latency</th>
                <th>Strengths</th>
              </tr>
            </thead>
            <tbody>
              {models.map(m => (
                <tr key={m.id}>
                  <td className="mono" style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{m.displayName}</td>
                  <td className="mono" style={{ color: 'var(--text-muted)' }}>{m.provider}</td>
                  <td className="mono">
                    <span style={{ color: m.tier === 'premium' ? 'var(--violet)' : m.tier === 'standard' ? '#3b82f6' : 'var(--text-muted)' }}>
                      [{m.tier}]
                    </span>
                  </td>
                  <td className="mono right-align">${(m.costPerInputToken * 1000000).toFixed(2)}</td>
                  <td className="mono right-align">${(m.costPerOutputToken * 1000000).toFixed(2)}</td>
                  <td className="mono">
                    {m.avgLatencyMs}ms <span style={{ color: 'var(--text-ghost)' }}>(p95: {latencyStats[m.id]?.p95 || m.avgLatencyMs + 50}ms)</span>
                  </td>
                  <td style={{ color: 'var(--text-secondary)' }}>
                    {m.strengths.join(', ')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </DashboardCard>

      <DashboardCard id="router-logs" title="RECENT ROUTING LOGS">
        <div className="table-container" style={{ padding: 0, background: 'transparent', border: 'none' }}>
          <table className="slim-table log-table">
            <thead>
              <tr>
                <th>Time</th>
                <th>Task</th>
                <th>Complexity</th>
                <th>Model</th>
                <th className="right-align">Tokens</th>
                <th className="right-align">Cost</th>
                <th className="right-align">Status</th>
              </tr>
            </thead>
            <tbody>
              {recentLogs.map(log => {
                const statusText = log.cached ? 'cached' : log.fallback ? 'fallback' : !log.success ? 'error' : 'ok';
                return (
                  <tr key={log.requestId}>
                    <td className="mono" style={{ color: 'var(--text-muted)' }}>
                      {new Date(log.timestamp).toLocaleTimeString([], { hour12: false })}
                    </td>
                    <td className="mono" style={{ color: 'var(--text-secondary)' }}>
                      {log.taskType}
                    </td>
                    <td className="mono" style={{ color: 'var(--text-secondary)' }}>
                      {log.complexity}
                    </td>
                    <td className="mono" style={{ color: 'var(--text-primary)', fontWeight: 500 }}>
                      {log.model}
                    </td>
                    <td className="mono right-align">
                      {(log.inputTokens + log.outputTokens).toLocaleString()}
                    </td>
                    <td className="mono right-align">
                      ${log.cost.toFixed(6)}
                    </td>
                    <td className="mono right-align">
                      <span className={`status-pill pill-${statusText}`}>{statusText}</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </DashboardCard>
    </div>
  );
}
