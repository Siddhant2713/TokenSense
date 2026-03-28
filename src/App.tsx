import { useState, useMemo } from 'react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip,
  ResponsiveContainer, BarChart, Bar, Legend
} from 'recharts';
import { generateMockLogs, generateMockCloudLogs } from './mockData';
import { aggregateLogs, aggregateCloudLogs, computeDailyCosts } from './aggregator';
import { runAllRules } from './rules';
import { generateRecommendations } from './recommendations';
import type { Insight, Recommendation, TeamMetrics, CloudResourceMetrics } from './types';
import './App.css';

function App() {
  const [activeTab, setActiveTab] = useState<'overview' | 'llm' | 'cloud'>('overview');

  // Generate all data once
  const { dailyCosts, teamMetrics, cloudMetrics, insights, recommendations, totals } = useMemo(() => {
    const llmLogs = generateMockLogs();
    const cloudLogs = generateMockCloudLogs();
    const dailyCosts = computeDailyCosts(llmLogs, cloudLogs);
    const teamMetrics = aggregateLogs(llmLogs);
    const cloudMetrics = aggregateCloudLogs(cloudLogs);
    const insights = runAllRules(llmLogs, teamMetrics, cloudMetrics);
    const recommendations = generateRecommendations(insights, teamMetrics, cloudMetrics);

    const totalLLMCost = teamMetrics.reduce((s, m) => s + m.cost, 0);
    const totalCloudCost = cloudMetrics.reduce((s, m) => s + m.totalCost, 0);
    const totalSavings = recommendations.reduce((s, r) => s + r.monthlySaving, 0);
    const totalInsights = insights.length;

    return {
      dailyCosts, teamMetrics, cloudMetrics, insights, recommendations,
      totals: { totalLLMCost, totalCloudCost, totalSavings, totalInsights }
    };
  }, []);

  return (
    <div className="app-layout">
      {/* Header */}
      <header className="header" id="app-header">
        <div className="header-brand">
          <div className="header-logo">T</div>
          <div>
            <div className="header-title">TokenSense</div>
            <div className="header-subtitle">AI-Powered Cost Optimization</div>
          </div>
        </div>
        <div className="header-actions">
          <span className="header-badge">● Live — 30 Day Window</span>
        </div>
      </header>

      <main className="main-content">
        {/* KPI Cards */}
        <section className="metrics-grid" id="kpi-cards">
          <div className="metric-card animate-in">
            <div className="metric-label">Total LLM Spend</div>
            <div className="metric-value">${totals.totalLLMCost.toFixed(2)}</div>
            <div className="metric-change positive">↑ Last 30 days</div>
          </div>
          <div className="metric-card animate-in">
            <div className="metric-label">Total Cloud Spend</div>
            <div className="metric-value">${totals.totalCloudCost.toFixed(2)}</div>
            <div className="metric-change positive">↑ Cloudflare + AWS</div>
          </div>
          <div className="metric-card danger animate-in">
            <div className="metric-label">Issues Found</div>
            <div className="metric-value">{totals.totalInsights}</div>
            <div className="metric-change positive">⚠ Needs attention</div>
          </div>
          <div className="metric-card success animate-in">
            <div className="metric-label">Potential Savings</div>
            <div className="metric-value" style={{ color: 'var(--accent-green)' }}>${totals.totalSavings.toFixed(2)}</div>
            <div className="metric-change negative">↓ Per month</div>
          </div>
        </section>

        {/* Tab Bar */}
        <div className="tab-bar" id="tab-bar">
          <button className={`tab-btn ${activeTab === 'overview' ? 'active' : ''}`}
            onClick={() => setActiveTab('overview')}>Overview</button>
          <button className={`tab-btn ${activeTab === 'llm' ? 'active' : ''}`}
            onClick={() => setActiveTab('llm')}>LLM Usage</button>
          <button className={`tab-btn ${activeTab === 'cloud' ? 'active' : ''}`}
            onClick={() => setActiveTab('cloud')}>Cloud Resources</button>
        </div>

        {activeTab === 'overview' && (
          <>
            {/* Cost Chart */}
            <CostChart dailyCosts={dailyCosts} />

            {/* Insights + Recommendations */}
            <div className="two-col-grid">
              <InsightsPanel insights={insights} />
              <RecommendationsPanel recommendations={recommendations} />
            </div>
          </>
        )}

        {activeTab === 'llm' && (
          <>
            <TeamMetricsTable metrics={teamMetrics} />
          </>
        )}

        {activeTab === 'cloud' && (
          <>
            <CloudMetricsTable metrics={cloudMetrics} />
          </>
        )}
      </main>
    </div>
  );
}

// ─── Cost Chart ────────────────────────────────────────────────
function CostChart({ dailyCosts }: { dailyCosts: { date: string; llmCost: number; cloudCost: number; totalCost: number }[] }) {
  return (
    <div className="chart-container animate-in" id="cost-chart">
      <div className="section-header">
        <h2 className="section-title"><span className="icon">📊</span> Daily Cost Breakdown (30 Days)</h2>
      </div>
      <ResponsiveContainer width="100%" height={320}>
        <AreaChart data={dailyCosts}>
          <defs>
            <linearGradient id="gradLLM" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.25} />
              <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="gradCloud" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.25} />
              <stop offset="95%" stopColor="#06b6d4" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
          <XAxis dataKey="date" tick={{ fill: '#5a6480', fontSize: 11 }}
            tickFormatter={(v: string) => v.slice(5)} />
          <YAxis tick={{ fill: '#5a6480', fontSize: 11 }}
            tickFormatter={(v: number) => `$${v}`} />
          <RechartsTooltip
            contentStyle={{ background: '#1a1f35', border: '1px solid rgba(59,130,246,0.3)', borderRadius: 8, fontSize: 12 }}
            labelStyle={{ color: '#f0f4ff' }}
            formatter={(value: number) => [`$${value.toFixed(2)}`, '']}
          />
          <Legend />
          <Area type="monotone" dataKey="llmCost" name="LLM Spend" stroke="#8b5cf6" fill="url(#gradLLM)" strokeWidth={2} />
          <Area type="monotone" dataKey="cloudCost" name="Cloud Spend" stroke="#06b6d4" fill="url(#gradCloud)" strokeWidth={2} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

// ─── Insights Panel ────────────────────────────────────────────
function InsightsPanel({ insights }: { insights: Insight[] }) {
  return (
    <div className="insights-panel animate-in" id="insights-panel">
      <div className="section-header">
        <h2 className="section-title"><span className="icon">🔍</span> Issues Detected</h2>
      </div>
      {insights.map((insight, i) => (
        <div className="insight-card" key={i}>
          <div className="insight-header">
            <span className={`insight-rule ${insight.rule}`}>{insight.rule.replace(/_/g, ' ')}</span>
            <span className={`insight-severity ${insight.severity}`}>{insight.severity}</span>
          </div>
          <div className="insight-team">{insight.team}</div>
          <div className="insight-evidence">{insight.evidence}</div>
          {insight.suggestedFix && (
            <div className="insight-fix">{insight.suggestedFix}</div>
          )}
        </div>
      ))}
    </div>
  );
}

// ─── Recommendations Panel ─────────────────────────────────────
function RecommendationsPanel({ recommendations }: { recommendations: Recommendation[] }) {
  const sorted = [...recommendations].sort((a, b) => b.monthlySaving - a.monthlySaving);
  return (
    <div className="insights-panel animate-in" id="recommendations-panel">
      <div className="section-header">
        <h2 className="section-title"><span className="icon">💰</span> Top Savings</h2>
      </div>
      {sorted.slice(0, 6).map((rec, i) => (
        <div className="insight-card" key={i}>
          <div className="insight-header">
            <span className={`rec-category ${rec.category}`}>{rec.category.toUpperCase()}</span>
            <span className="rec-saving">-${rec.monthlySaving.toFixed(2)}/mo</span>
          </div>
          <div className="insight-team">{rec.team}</div>
          <div className="rec-issue">{rec.issue}</div>
          <div className="insight-evidence">{rec.action}</div>
          <div className="rec-meta" style={{ marginTop: 8 }}>
            <span className="rec-meta-tag">Effort: <span>{rec.effort}</span></span>
            <span className="rec-meta-tag">Confidence: <span>{rec.confidence}</span></span>
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Team Metrics Table (LLM) ──────────────────────────────────
function TeamMetricsTable({ metrics }: { metrics: TeamMetrics[] }) {
  const sorted = [...metrics].sort((a, b) => b.cost - a.cost);
  return (
    <div className="table-container animate-in" id="team-metrics-table">
      <div className="section-header">
        <h2 className="section-title"><span className="icon">🤖</span> LLM Spend by Team</h2>
      </div>
      <table className="data-table">
        <thead>
          <tr>
            <th>Team</th>
            <th>Total Calls</th>
            <th>Avg Input Tokens</th>
            <th>Avg Output Tokens</th>
            <th>Models Used</th>
            <th>Total Cost</th>
            <th>vs Last Week</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map(m => (
            <tr key={m.team}>
              <td style={{ fontWeight: 600 }}>{m.team}</td>
              <td>{m.totalCalls.toLocaleString()}</td>
              <td>{Math.round(m.averageInputTokens).toLocaleString()}</td>
              <td>{Math.round(m.averageOutputTokens).toLocaleString()}</td>
              <td>
                <div className="model-badges">
                  {Object.entries(m.modelsUsed).filter(([, v]) => (v ?? 0) > 0).map(([model, count]) => (
                    <span key={model} className="model-badge">{model} ({count?.toLocaleString()})</span>
                  ))}
                </div>
              </td>
              <td className="cost-cell">${m.cost.toFixed(2)}</td>
              <td>
                <span className={`change-badge ${m.costVsLastWeek > 0 ? 'up' : m.costVsLastWeek < 0 ? 'down' : 'flat'}`}>
                  {m.costVsLastWeek > 0 ? '↑' : m.costVsLastWeek < 0 ? '↓' : '—'} {Math.abs(m.costVsLastWeek)}%
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── Cloud Metrics Table ───────────────────────────────────────
function CloudMetricsTable({ metrics }: { metrics: CloudResourceMetrics[] }) {
  const sorted = [...metrics].sort((a, b) => b.wastedCost - a.wastedCost);
  return (
    <div className="table-container animate-in" id="cloud-metrics-table">
      <div className="section-header">
        <h2 className="section-title"><span className="icon">☁️</span> Cloud Resource Usage</h2>
      </div>
      <table className="data-table">
        <thead>
          <tr>
            <th>Provider</th>
            <th>Service</th>
            <th>Resource</th>
            <th>Team</th>
            <th>RAM Utilization</th>
            <th>Avg Exec Time</th>
            <th>Total Cost</th>
            <th>Wasted Cost</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((m, i) => (
            <tr key={i}>
              <td><span className={`provider-badge ${m.provider}`}>{m.provider}</span></td>
              <td>{m.service}</td>
              <td style={{ fontWeight: 600 }}>{m.resourceName}</td>
              <td>{m.team}</td>
              <td>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div className="utilization-bar">
                    <div
                      className={`utilization-fill ${m.ramUtilization < 30 ? 'low' : m.ramUtilization < 70 ? 'medium' : 'high'}`}
                      style={{ width: `${Math.min(m.ramUtilization, 100)}%` }}
                    />
                  </div>
                  <span style={{ fontSize: 12, color: m.ramUtilization < 30 ? 'var(--accent-red)' : 'var(--text-secondary)' }}>
                    {m.avgUsedRAM_MB > 0 ? `${m.avgUsedRAM_MB}/${m.avgAllocatedRAM_MB}MB (${m.ramUtilization}%)` : 'N/A'}
                  </span>
                </div>
              </td>
              <td>{m.avgExecutionTimeMs < 86400000 ? `${m.avgExecutionTimeMs}ms` : 'Always On'}</td>
              <td className="cost-cell">${m.totalCost.toFixed(2)}</td>
              <td className="cost-cell" style={{ color: m.wastedCost > 0 ? 'var(--accent-red)' : 'var(--accent-green)' }}>
                ${m.wastedCost.toFixed(2)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default App;
