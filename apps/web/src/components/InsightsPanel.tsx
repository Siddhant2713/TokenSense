import React from 'react';
import type { Insight } from '@tokensense/types';
import { DashboardCard } from './DashboardCard';

export function InsightsPanel({ insights }: { insights: Insight[] }) {
  return (
    <DashboardCard id="insights-panel" title="ISSUES DETECTED">
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
    </DashboardCard>
  );
}
