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
import {
  LayoutDashboard, BarChart2, Cloud, Cpu, Sparkles, AlertCircle, CircleDollarSign, TrendingUp, TrendingDown, ChevronRight
} from 'lucide-react';

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
    <div className="app-root">
      {/* Sidebar */}
      <aside className="sidebar">
        <div className="sidebar-topbar">
          <div className="brand-line"></div>
          <div className="brand-text">TOKEN<span>SENSE</span></div>
          <div className="brand-text sub">COST INTELLIGENCE</div>
        </div>

        <nav className="nav-menu">
          <button
            className={`nav-item ${activeTab === 'overview' ? 'active' : ''}`}
            onClick={() => setActiveTab('overview')}
            style={{ display: 'flex', alignItems: 'center', gap: '10px' }}
          >
            <LayoutDashboard size={18} /> Overview
          </button>
          <button
            className={`nav-item ${activeTab === 'llm' ? 'active' : ''}`}
            onClick={() => setActiveTab('llm')}
            style={{ display: 'flex', alignItems: 'center', gap: '10px' }}
          >
            <BarChart2 size={18} /> LLM Usage
          </button>
          <button
            className={`nav-item ${activeTab === 'cloud' ? 'active' : ''}`}
            onClick={() => setActiveTab('cloud')}
            style={{ display: 'flex', alignItems: 'center', gap: '10px' }}
          >
            <Cloud size={18} /> Cloud Resources
          </button>
          <button
            className={`nav-item ${activeTab === 'router' ? 'active' : ''}`}
            onClick={() => setActiveTab('router')}
            style={{ display: 'flex', alignItems: 'center', gap: '10px' }}
          >
            <Cpu size={18} /> Smart Router
          </button>
        </nav>

        <div className="status-block">
          <div className="status-live">LIVE</div>
          <div className="status-window">30-DAY WINDOW</div>
        </div>
      </aside>

      {/* Topbar */}
      <header className="topbar">
        <div className="topbar-title">
          {activeTab === 'overview' ? 'Overview' :
            activeTab === 'llm' ? 'LLM Usage' :
              activeTab === 'cloud' ? 'Cloud Resources' :
                'Smart Router'}
        </div>
        <div className="topbar-right">
          <span className="org-id">ORG-8F92A</span>
          <span className="date-badge">Oct 1 - Oct 30</span>
        </div>
      </header>

      {/* Canvas */}
      <main className="canvas">
        {/* KPI Strip */}
        <div className="kpi-strip">
          <div className="kpi-block group">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div className="kpi-label">Total LLM Spend</div>
              <TrendingUp className="kpi-icon" size={16} color="var(--accent)" />
            </div>
            <div className="kpi-value">${totals.totalLLMCost.toFixed(2)}</div>
            <div className="kpi-sublabel">Last 30 days</div>
          </div>
          <div className="kpi-block group">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div className="kpi-label">Total Cloud Spend</div>
              <TrendingDown className="kpi-icon" size={16} color="var(--violet)" />
            </div>
            <div className="kpi-value">${totals.totalCloudCost.toFixed(2)}</div>
            <div className="kpi-sublabel">Cloudflare + AWS</div>
          </div>
          <div className="kpi-block group">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div className="kpi-label">Issues Found</div>
              <AlertCircle className="kpi-icon" size={16} color="var(--red)" />
            </div>
            <div className="kpi-value red">{totals.totalInsights}</div>
            <div className="kpi-sublabel">Needs attention</div>
          </div>
          <div className="kpi-block group">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div className="kpi-label">Potential Savings</div>
              <CircleDollarSign className="kpi-icon" size={16} color="var(--green)" />
            </div>
            <div className="kpi-value green">
              {isAiLoading ? '...' : `$${totalSavings.toFixed(2)}`}
            </div>
            <div className="kpi-sublabel">Per month</div>
          </div>
        </div>

        {/* Executive Summary Line */}
        <div className="exec-summary-line group">
          <Sparkles className="exec-icon" size={16} color="var(--accent)" />
          {isAiLoading ? (
            <div className="shimmer-bar"></div>
          ) : (
            <div className="exec-text">
              {enhancedData ? enhancedData.executiveSummary : 'Run AI analyst to get deeper insights.'}
            </div>
          )}
        </div>

        {activeTab === 'overview' ? (
          <div className="tab-content" style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
            <CostChart dailyCosts={dailyCosts} />
            <div className="two-col-grid">
              <InsightsPanel insights={insights} />
              <RecommendationsPanel
                enhancedRecommendations={enhancedData?.recommendations}
                isLoading={isAiLoading}
                error={aiError}
              />
            </div>
          </div>
        ) : activeTab === 'llm' ? (
          <div className="tab-content" style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
            <TeamMetricsTable metrics={teamMetrics} />
          </div>
        ) : activeTab === 'cloud' ? (
          <div className="tab-content">
            <CloudMetricsTable metrics={cloudMetrics} />
          </div>
        ) : activeTab === 'router' ? (
          <div className="tab-content" style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
            <RouterDashboard data={routerData} />
          </div>
        ) : (
          <div style={{ color: 'var(--text-muted)' }}>
            {activeTab} content placeholder...
          </div>
        )}
      </main>
    </div>
  );
}

// ─── Cost Chart ────────────────────────────────────────────────
function CostChart({ dailyCosts }: { dailyCosts: { date: string; llmCost: number; cloudCost: number; totalCost: number }[] }) {
  return (
    <details className="chart-container" id="cost-chart" open>
      <summary className="section-header-line group">
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          <div className="section-title">DAILY COST BREAKDOWN</div>
          <div className="section-legend">
            <div className="legend-item"><span className="legend-dot llm"></span>LLM</div>
            <div className="legend-item"><span className="legend-dot cloud"></span>Cloud</div>
          </div>
        </div>
        <ChevronRight size={16} className="chevron" color="var(--text-muted)" />
      </summary>
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
    </details>
  );
}

// ─── Insights Panel ────────────────────────────────────────────
function InsightsPanel({ insights }: { insights: Insight[] }) {
  return (
    <details className="chart-container" id="insights-panel" open>
      <summary className="section-header-line group">
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          <div className="section-title">ISSUES DETECTED</div>
          <div className="section-legend"></div>
        </div>
        <ChevronRight size={16} className="chevron" color="var(--text-muted)" />
      </summary>
      <div>
        {insights.map((insight, i) => (
          <div className="issue-row" key={i}>
            <div className={`status-pill pill-${insight.severity.toLowerCase()}`}>
              {insight.severity}
            </div>
            <div className="issue-rule" title={insight.rule}>{insight.rule}</div>
            <div className="issue-team" title={insight.team}>{insight.team}</div>
            <div className="issue-evidence" title={insight.evidence}>{insight.evidence}</div>
          </div>
        ))}
      </div>
    </details>
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
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);

  if (isLoading) {
    return (
      <details className="chart-container" id="recommendations-panel" open>
        <summary className="section-header-line group">
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <div className="section-title">AI RECOMMENDATIONS</div>
          </div>
          <ChevronRight size={16} className="chevron" color="var(--text-muted)" />
        </summary>
        <div className="shimmer-bar" style={{ marginTop: 24 }}></div>
      </details>
    );
  }

  if (error) {
    return (
      <details className="chart-container" id="recommendations-panel" open>
        <summary className="section-header-line group">
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <div className="section-title">AI RECOMMENDATIONS</div>
          </div>
          <ChevronRight size={16} className="chevron" color="var(--text-muted)" />
        </summary>
        <div style={{ color: 'var(--text-muted)' }}>{error}</div>
      </details>
    );
  }

  const sorted = [...(enhancedRecommendations || [])].sort(
    (a, b) => b.recommendation.monthlySaving - a.recommendation.monthlySaving
  );

  return (
    <details className="chart-container" id="recommendations-panel" open>
      <summary className="section-header-line group">
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <div className="section-title">AI RECOMMENDATIONS</div>
        </div>
        <ChevronRight size={16} className="chevron" color="var(--text-muted)" />
      </summary>
      <div>
        {sorted.length === 0 && <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>No recommendations available.</p>}
        {sorted.map((rec, i) => {
          const isExpanded = expandedIndex === i;
          return (
            <div className={`rec-row ${isExpanded ? 'expanded' : ''}`} key={i} onClick={() => setExpandedIndex(isExpanded ? null : i)}>
              <div className="rec-header-top">
                <div className="rec-team">{rec.recommendation.team}</div>
                <div className="rec-saving">${rec.recommendation.monthlySaving?.toLocaleString()}/mo</div>
              </div>
              <div className="rec-header-bottom">
                <div className="rec-issue-title">{rec.recommendation.rule || rec.recommendation.issue}</div>
                <div style={{ flex: 1, height: 1, background: 'var(--border-dim)', margin: '0 12px' }}></div>
                <div className="rec-effort">{rec.recommendation.effort}</div>
              </div>
              <div className="rec-expandable">
                <div className="rec-content">
                  <div className="rec-text-block">
                    <strong>Expected Action</strong>
                    <span>{rec.recommendation.action}</span>
                  </div>
                  <div className="rec-text-block">
                    <strong>AI Analysis</strong>
                    <span>{rec.explanation}</span>
                  </div>
                  <div className="rec-text-block">
                    <strong>Why it happened</strong>
                    <span>{rec.whyItHappened}</span>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </details>
  );
}

function TeamMetricsTable({ metrics }: { metrics: TeamMetrics[] }) {
  const sortedByCost = [...metrics].sort((a, b) => b.cost - a.cost);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
      {/* Section 1: Team Cost Bar Chart */}
      <details className="chart-container" id="team-cost-chart" open>
        <summary className="section-header-line group">
          <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
            <div className="section-title">TEAM COST BREAKDOWN</div>
            <div className="section-legend">
              <div className="legend-item"><span className="legend-dot" style={{ background: 'var(--accent)' }}></span>Cost</div>
            </div>
          </div>
          <ChevronRight size={16} className="chevron" color="var(--text-muted)" />
        </summary>
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
      </details>

      {/* Section 2: Slim Team Table */}
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

// ─── Cloud Metrics Table ───────────────────────────────────────
function CloudMetricsTable({ metrics }: { metrics: CloudResourceMetrics[] }) {
  const sorted = [...metrics].sort((a, b) => b.wastedCost - a.wastedCost);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
      <details className="chart-container" style={{ padding: 0, background: 'transparent', border: 'none' }} open>
        <summary className="section-header-line group" style={{ marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <div className="section-title">CLOUD RESOURCES</div>
          </div>
          <ChevronRight size={16} className="chevron" color="var(--text-muted)" />
        </summary>
        <div className="cloud-grid">
          {sorted.map((m, i) => {
            const wasteHigh = m.ramUtilization < 25;
            const wasteLow = m.ramUtilization > 70;

            let fillClass = 'good';
            if (m.ramUtilization < 30) fillClass = 'danger';
            else if (m.ramUtilization < 70) fillClass = 'warn';

            return (
              <div key={i} className={`cloud-card ${wasteHigh ? 'waste-high' : wasteLow ? 'waste-low' : ''}`}>
                <div className="cc-header">
                  <div>
                    <div className="cc-title">{m.resourceName}</div>
                    <div className="cc-team">{m.team}</div>
                  </div>
                  <div className={`cc-provider ${m.provider.toLowerCase()}`}>{m.provider}</div>
                </div>

                <div className="cc-ram">
                  <span className="ram-label">RAM</span>
                  <div className="ram-track">
                    <div className={`ram-fill ${fillClass}`} style={{ width: `${m.ramUtilization}%` }}></div>
                  </div>
                  <span>{m.ramUtilization}%</span>
                  <span style={{ color: 'var(--text-muted)' }}>{Math.round((m.ramUtilization / 100) * (m.provider === 'aws' ? 128 : 64))}/{m.provider === 'aws' ? 128 : 64}MB</span>
                </div>

                <div className="cc-cost">
                  <span><span className="label">Cost</span>${m.totalCost.toFixed(2)}</span>
                  <span className={`cc-wasted ${wasteHigh ? 'danger' : ''}`}>
                    <span className="label">Wasted</span>${m.wastedCost.toFixed(2)} {wasteHigh ? '↑' : ''}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </details>
    </div>
  );
}

// ─── Router Dashboard ─────────────────────────────────────────
const ROUTER_COLORS = ['#60a5fa', '#3b82f6', '#2563eb', '#1d4ed8', '#1e40af', '#1e3a8a'];

function RouterDashboard({ data }: { data: RouterMockData }) {
  const { metrics, logs, models, latencyStats } = data;

  const costByModelData = Object.entries(metrics.costByModel)
    .map(([name, value]) => ({ name, value: parseFloat(value.toFixed(4)) }))
    .sort((a, b) => b.value - a.value);

  const taskTypeData = Object.entries(metrics.requestsByTaskType)
    .map(([name, value]) => ({ name, value }));

  const recentLogs = logs.slice(-20).reverse();

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
      {/* Section 1: KPI Strip */}
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

      {/* Section 2: Charts Row */}
      <div className="two-col-grid">
        <details className="chart-container" open>
          <summary className="section-header-line group">
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <div className="section-title">COST BY MODEL</div>
            </div>
            <ChevronRight size={16} className="chevron" color="var(--text-muted)" />
          </summary>
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
        </details>

        <details className="chart-container" open>
          <summary className="section-header-line group">
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <div className="section-title">REQUESTS BY TASK TYPE</div>
            </div>
            <ChevronRight size={16} className="chevron" color="var(--text-muted)" />
          </summary>
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
        </details>
      </div>

      {/* Model Registry */}
      <details className="chart-container" style={{ borderTop: 'none', paddingTop: 0 }} open>
        <summary className="section-header-line group">
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <div className="section-title">MODEL REGISTRY</div>
          </div>
          <ChevronRight size={16} className="chevron" color="var(--text-muted)" />
        </summary>
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
      </details>

      {/* Routing Log */}
      <details className="chart-container" open>
        <summary className="section-header-line group">
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <div className="section-title">RECENT ROUTING LOGS</div>
          </div>
          <ChevronRight size={16} className="chevron" color="var(--text-muted)" />
        </summary>
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
                let statusText = log.cached ? 'cached' : log.fallback ? 'fallback' : !log.success ? 'error' : 'ok';

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
      </details>
    </div>
  );
}

export default App;
