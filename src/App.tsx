import { useState, useMemo, useEffect } from 'react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip,
  ResponsiveContainer, BarChart, Bar, Legend, PieChart, Pie, Cell
} from 'recharts';
import { generateMockLogs, generateMockCloudLogs } from './mockData';
import { aggregateLogs, aggregateCloudLogs, computeDailyCosts } from './aggregator';
import { runAllRules } from './rules';
import { generateAIRecommendations } from './recommendations';
import type { Insight, TeamMetrics, CloudResourceMetrics, EnhancedOutput } from './types';

import { generateRouterMockData, type RouterMockData } from './routerMockData';

import './App.css';

function App() {
  const [activeTab, setActiveTab] = useState<'overview' | 'llm' | 'cloud' | 'router'>('overview');
  const [enhancedData, setEnhancedData] = useState<EnhancedOutput | null>(null);
  const [isAiLoading, setIsAiLoading] = useState(false);

  const [aiError, setAiError] = useState<string | null>(null);

  // Generate all data once
  const { dailyCosts, teamMetrics, cloudMetrics, insights, totals, routerData } = useMemo(() => {
    const llmLogs = generateMockLogs();
    const cloudLogs = generateMockCloudLogs();
    const dailyCosts = computeDailyCosts(llmLogs, cloudLogs);
    const teamMetrics = aggregateLogs(llmLogs);
    const cloudMetrics = aggregateCloudLogs(cloudLogs);
    const insights = runAllRules(llmLogs, teamMetrics, cloudMetrics);

    const totalLLMCost = teamMetrics.reduce((s, m) => s + m.cost, 0);
    const totalCloudCost = cloudMetrics.reduce((s, m) => s + m.totalCost, 0);
    const totalInsights = insights.length;

    const routerData = generateRouterMockData();

    return {
      dailyCosts, teamMetrics, cloudMetrics, insights,
      totals: { totalLLMCost, totalCloudCost, totalInsights },
      routerData,
    };
  }, []);

  const totalSavings = enhancedData 
    ? enhancedData.recommendations.reduce((acc, curr) => acc + (curr.recommendation.monthlySaving || 0), 0)
    : 0;

  useEffect(() => {
    async function getAiInsights() {
      setIsAiLoading(true);
      setAiError(null);
      try {
        const data = await generateAIRecommendations({
          insights,
          metrics: teamMetrics,
          cloudMetrics
        });
        setEnhancedData(data);
      } catch (error: any) {
        console.error('Failed to fetch AI insights:', error);
        setAiError(error.message || 'TokenSense AI Analyst is currently unavailable.');
      } finally {
        setIsAiLoading(false);
      }
    }
    getAiInsights();
  }, [insights, teamMetrics, cloudMetrics]);

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
            <div className="metric-value" style={{ color: 'var(--accent-green)' }}>
              {isAiLoading ? <span className="loading-spinner-inline" /> : `$${totalSavings.toFixed(2)}`}
            </div>
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
          <button className={`tab-btn ${activeTab === 'router' ? 'active' : ''}`}
            onClick={() => setActiveTab('router')}>Smart Router</button>
        </div>

        {activeTab === 'overview' && (
          <>
            {/* AI Executive Summary */}
            <section className="ai-summary-card animate-in">
              <div className="section-header">
                <h2 className="section-title">
                  <span className="icon">✨</span> AI Executive Summary
                  {isAiLoading && <span className="loading-spinner-inline"></span>}
                </h2>
              </div>
              <div className="ai-summary-text">
                {isAiLoading ? 'TokenSense AI is analyzing your infrastructure spend...' : 
                 enhancedData ? enhancedData.executiveSummary : 'Run AI analyst to get deeper insights.'}
              </div>
            </section>

            {/* Cost Chart */}
            <CostChart dailyCosts={dailyCosts} />

            {/* Insights + Recommendations */}
            <div className="two-col-grid">
              <InsightsPanel insights={insights} />
              <RecommendationsPanel 
                enhancedRecommendations={enhancedData?.recommendations}
                isLoading={isAiLoading}
                error={aiError}
              />
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

        {activeTab === 'router' && (
          <>
            <RouterDashboard data={routerData} />
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
function RecommendationsPanel({ 
  enhancedRecommendations,
  isLoading,
  error
}: { 
  enhancedRecommendations?: any[],
  isLoading: boolean,
  error?: string | null
}) {
  if (isLoading) {
    return (
      <div className="insights-panel animate-in" id="recommendations-panel">
        <div className="section-header">
          <h2 className="section-title"><span className="icon">⏳</span> TokenSense AI is analyzing...</h2>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="insights-panel animate-in" id="recommendations-panel">
        <div className="section-header">
          <h2 className="section-title"><span className="icon">⚠️</span> AI Analyst Unavailable</h2>
        </div>
        <div className="insight-card">
          <p style={{ color: 'var(--text-muted)' }}>{error}</p>
        </div>
      </div>
    );
  }

  const sorted = [...(enhancedRecommendations || [])].sort(
    (a, b) => b.recommendation.monthlySaving - a.recommendation.monthlySaving
  );

  return (
    <div className="insights-panel animate-in" id="recommendations-panel">
      <div className="section-header">
        <h2 className="section-title"><span className="icon">💡</span> AI Recommendations</h2>
      </div>
      {sorted.length === 0 && <p style={{ color: 'var(--text-muted)' }}>No recommendations available.</p>}
      {sorted.map((rec, i) => (
        <div className="insight-card" key={i}>
          <div className="insight-header">
            <span className={`rec-category ${rec.recommendation.category}`}>{rec.recommendation.category.toUpperCase()}</span>
            <span className="rec-saving">-${rec.recommendation.monthlySaving?.toFixed(2)}/mo</span>
          </div>
          <div className="insight-team">{rec.recommendation.team}</div>
          <div className="rec-issue">{rec.recommendation.issue}</div>
          
          <div className="ai-enhanced-content">
            <div className="ai-explanation">
              <strong>Expected Action:</strong> {rec.recommendation.action}
            </div>
            <div className="ai-explanation" style={{ marginTop: '0.5rem' }}>
              <strong>AI Analysis:</strong> {rec.explanation}
            </div>
            <div className="ai-why" style={{ marginTop: '0.5rem' }}>
              <strong>Why it happened:</strong> {rec.whyItHappened}
            </div>
          </div>

          <div className="rec-meta" style={{ marginTop: 8 }}>
            <span className="rec-meta-tag">Effort: <span>{rec.recommendation.effort}</span></span>
            <span className="rec-meta-tag">Confidence: <span>{rec.recommendation.confidence}</span></span>
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
            <th>Avg Latency</th>
            <th>Providers</th>
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
              <td>{m.averageLatency}ms</td>
              <td>
                <div className="model-badges">
                  {Object.entries(m.providersUsed).filter(([, v]) => (v ?? 0) > 0).map(([provider]) => (
                    <span key={provider} className={`provider-badge ${provider}`}>{provider}</span>
                  ))}
                </div>
              </td>
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

// ─── Router Dashboard ─────────────────────────────────────────
const COLORS = ['#8b5cf6', '#06b6d4', '#10b981', '#f59e0b', '#ef4444', '#ec4899', '#3b82f6'];

function RouterDashboard({ data }: { data: RouterMockData }) {
  const { metrics, logs, models, latencyStats } = data;

  const costByModelData = Object.entries(metrics.costByModel)
    .map(([name, value]) => ({ name, value: parseFloat(value.toFixed(4)) }))
    .sort((a, b) => b.value - a.value);

  const taskTypeData = Object.entries(metrics.requestsByTaskType)
    .map(([name, value]) => ({ name, value }));

  const recentLogs = logs.slice(-20).reverse();

  return (
    <div className="router-dashboard animate-in">
      {/* Router KPI Cards */}
      <div className="metrics-grid" style={{ marginBottom: 24 }}>
        <div className="metric-card animate-in">
          <div className="metric-label">Total Routed Requests</div>
          <div className="metric-value">{metrics.totalRequests.toLocaleString()}</div>
          <div className="metric-change negative">Smart routing active</div>
        </div>
        <div className="metric-card success animate-in">
          <div className="metric-label">Total Router Cost</div>
          <div className="metric-value">${metrics.totalCost.toFixed(4)}</div>
          <div className="metric-change negative">Optimized routing</div>
        </div>
        <div className="metric-card animate-in">
          <div className="metric-label">Avg Latency</div>
          <div className="metric-value">{metrics.avgLatencyMs}ms</div>
          <div className="metric-change negative">P95 tracked</div>
        </div>
        <div className="metric-card animate-in">
          <div className="metric-label">Cache Hit Rate</div>
          <div className="metric-value">{(metrics.cacheHitRate * 100).toFixed(1)}%</div>
          <div className="metric-change negative">↓ Reduced API calls</div>
        </div>
      </div>

      {/* Charts Row */}
      <div className="two-col-grid">
        {/* Cost by Model */}
        <div className="chart-container animate-in">
          <div className="section-header">
            <h2 className="section-title"><span className="icon">🎯</span> Cost by Model</h2>
          </div>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={costByModelData}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="name" tick={{ fill: '#5a6480', fontSize: 10 }} angle={-20} textAnchor="end" height={60} />
              <YAxis tick={{ fill: '#5a6480', fontSize: 11 }} tickFormatter={(v: number) => `$${v}`} />
              <RechartsTooltip
                contentStyle={{ background: '#1a1f35', border: '1px solid rgba(59,130,246,0.3)', borderRadius: 8, fontSize: 12 }}
                formatter={(value: number) => [`$${value.toFixed(4)}`, 'Cost']}
              />
              <Bar dataKey="value" name="Cost" radius={[4, 4, 0, 0]}>
                {costByModelData.map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Requests by Task Type */}
        <div className="chart-container animate-in">
          <div className="section-header">
            <h2 className="section-title"><span className="icon">📊</span> Requests by Task Type</h2>
          </div>
          <ResponsiveContainer width="100%" height={280}>
            <PieChart>
              <Pie
                data={taskTypeData}
                cx="50%"
                cy="50%"
                outerRadius={100}
                dataKey="value"
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                labelLine={true}
              >
                {taskTypeData.map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Pie>
              <RechartsTooltip
                contentStyle={{ background: '#1a1f35', border: '1px solid rgba(59,130,246,0.3)', borderRadius: 8, fontSize: 12 }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Model Registry */}
      <div className="table-container animate-in" style={{ marginBottom: 24 }}>
        <div className="section-header">
          <h2 className="section-title"><span className="icon">🗂️</span> Model Registry</h2>
        </div>
        <table className="data-table">
          <thead>
            <tr>
              <th>Model</th>
              <th>Provider</th>
              <th>Tier</th>
              <th>Input $/1K tok</th>
              <th>Output $/1K tok</th>
              <th>Avg Latency</th>
              <th>Strengths</th>
            </tr>
          </thead>
          <tbody>
            {models.map(m => (
              <tr key={m.id}>
                <td style={{ fontWeight: 600 }}>{m.displayName}</td>
                <td><span className={`provider-badge ${m.provider}`}>{m.provider}</span></td>
                <td>
                  <span className={`tier-badge ${m.tier}`}>{m.tier}</span>
                </td>
                <td className="cost-cell">${(m.costPerInputToken * 1000).toFixed(4)}</td>
                <td className="cost-cell">${(m.costPerOutputToken * 1000).toFixed(4)}</td>
                <td>{latencyStats[m.id]
                  ? `${latencyStats[m.id].avg}ms (p95: ${latencyStats[m.id].p95}ms)`
                  : `${m.avgLatencyMs}ms`
                }</td>
                <td>
                  <div className="model-badges">
                    {m.strengths.map(s => (
                      <span key={s} className="model-badge">{s}</span>
                    ))}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Recent Routing Logs */}
      <div className="table-container animate-in">
        <div className="section-header">
          <h2 className="section-title"><span className="icon">📋</span> Recent Routing Decisions</h2>
        </div>
        <table className="data-table">
          <thead>
            <tr>
              <th>Time</th>
              <th>Task</th>
              <th>Complexity</th>
              <th>Model</th>
              <th>Tokens</th>
              <th>Cost</th>
              <th>Latency</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {recentLogs.map(log => (
              <tr key={log.requestId}>
                <td style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                  {new Date(log.timestamp).toLocaleTimeString()}
                </td>
                <td>
                  <span className={`task-badge ${log.taskType}`}>{log.taskType}</span>
                </td>
                <td>
                  <span className={`complexity-badge ${log.complexity}`}>{log.complexity}</span>
                </td>
                <td style={{ fontWeight: 600 }}>{log.model}</td>
                <td>{log.inputTokens + log.outputTokens}</td>
                <td className="cost-cell">${log.cost.toFixed(6)}</td>
                <td>{log.latencyMs}ms</td>
                <td>
                  {log.cached && <span className="status-badge cached">cached</span>}
                  {log.fallback && <span className="status-badge fallback">fallback</span>}
                  {!log.cached && !log.fallback && log.success && <span className="status-badge success">ok</span>}
                  {!log.success && <span className="status-badge error">error</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default App;
