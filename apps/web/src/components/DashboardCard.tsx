import React, { ReactNode } from 'react';
import { ChevronRight } from 'lucide-react';
import { ErrorBoundary } from './ErrorBoundary';

interface DashboardCardProps {
  id?: string;
  title: string;
  children: ReactNode;
  legend?: ReactNode;
  defaultOpen?: boolean;
}

export function DashboardCard({ id, title, children, legend, defaultOpen = true }: DashboardCardProps) {
  return (
    <ErrorBoundary>
      <details className="chart-container" id={id} open={defaultOpen}>
        <summary className="section-header-line group">
          <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
            <div className="section-title">{title.toUpperCase()}</div>
            {legend && (
              <div className="section-legend">
                {legend}
              </div>
            )}
          </div>
          <ChevronRight size={16} className="chevron" color="var(--text-muted)" style={{ transition: 'transform 0.3s cubic-bezier(0.2, 0.8, 0.2, 1)' }} />
        </summary>
        {children}
      </details>
    </ErrorBoundary>
  );
}
