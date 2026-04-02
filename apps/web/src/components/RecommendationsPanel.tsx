import { useState } from 'react';
import { DashboardCard } from './DashboardCard';
import type { EnhancedRecommendation } from '../types';

export function RecommendationsPanel({
  enhancedRecommendations,
  isLoading,
  error
}: {
  enhancedRecommendations?: EnhancedRecommendation[],
  isLoading: boolean,
  error?: string | null
}) {
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);

  if (isLoading) {
    return (
      <DashboardCard id="recommendations-panel" title="AI RECOMMENDATIONS">
        <div className="shimmer-bar" style={{ marginTop: 24 }}></div>
      </DashboardCard>
    );
  }

  if (error) {
    return (
      <DashboardCard id="recommendations-panel" title="AI RECOMMENDATIONS">
        <div style={{ color: 'var(--text-muted)' }}>{error}</div>
      </DashboardCard>
    );
  }

  const sorted = [...(enhancedRecommendations || [])].sort(
    (a, b) => b.recommendation.monthlySaving - a.recommendation.monthlySaving
  );

  return (
    <DashboardCard id="recommendations-panel" title="AI RECOMMENDATIONS">
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
    </DashboardCard>
  );
}
