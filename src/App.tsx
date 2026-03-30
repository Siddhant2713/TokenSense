import { useState, useMemo, useEffect } from 'react';
import { CostChart } from './components/CostChart';
import { InsightsPanel } from './components/InsightsPanel';
import { RecommendationsPanel } from './components/RecommendationsPanel';
import { TeamMetricsTable } from './components/TeamMetricsTable';
import { CloudMetricsTable } from './components/CloudMetricsTable';
import { RouterDashboard } from './components/RouterDashboard';
import { generateMockLogs, generateMockCloudLogs } from './mockData';
import { aggregateLogs, aggregateCloudLogs, computeDailyCosts } from './aggregator';
import { runAllRules } from './rules';
import { generateAIRecommendations } from './recommendations';
import type { EnhancedOutput } from './types';

import { generateRouterMockData } from './routerMockData';
import {
  LayoutDashboard, BarChart2, Cloud, Cpu, Sparkles, AlertCircle, CircleDollarSign, TrendingUp, TrendingDown
} from 'lucide-react';

import './App.css';
import AskTokenSense from './components/AskTokenSense';

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
      <AskTokenSense
        teamMetrics={teamMetrics}
        insights={insights}
        totals={totals}
      />
    </div>
  );
}

// Component extraction complete.

export default App;
