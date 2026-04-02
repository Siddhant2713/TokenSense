import React, { Component, ReactNode } from 'react';
import { AlertCircle } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }
      return (
        <div style={{ padding: '24px', background: 'var(--bg-panel)', borderRadius: 'var(--radius)', borderLeft: '4px solid var(--red)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', color: 'var(--red)', marginBottom: '8px' }}>
            <AlertCircle size={20} />
            <span style={{ fontWeight: 600 }}>Something went wrong.</span>
          </div>
          <div style={{ color: 'var(--text-secondary)', fontSize: '13px', fontFamily: 'var(--font-mono)' }}>
            {this.state.error?.message}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
