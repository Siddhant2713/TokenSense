import React from 'react';
import type { CloudResourceMetrics } from '@tokensense/types';
import { DashboardCard } from './DashboardCard';

export function CloudMetricsTable({ metrics }: { metrics: CloudResourceMetrics[] }) {
  const sorted = [...metrics].sort((a, b) => b.wastedCost - a.wastedCost);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
      <DashboardCard id="cloud-resources" title="CLOUD RESOURCES">
        <div className="cloud-grid" style={{ marginTop: '24px' }}>
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
                  <span style={{ color: 'var(--text-muted)' }}>{m.avgUsedRAM_MB}/{m.avgAllocatedRAM_MB}MB</span>
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
      </DashboardCard>
    </div>
  );
}
