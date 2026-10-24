import React from 'react';
import { AlertTriangle, RotateCcw } from 'lucide-react';

interface ErrorBoundaryProps {
  children: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  message: string | null;
}

/**
 * Catches render-time failures so a single broken view never leaves the user
 * with a blank screen. Local data is untouched — the user can retry the render
 * or reload the app.
 */
export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false, message: null };

  static getDerivedStateFromError(error: unknown): ErrorBoundaryState {
    return {
      hasError: true,
      message: error instanceof Error ? error.message : 'An unexpected error occurred.',
    };
  }

  componentDidCatch(error: unknown, info: React.ErrorInfo): void {
    console.error('[ErrorBoundary] Unhandled render error:', error, info);
  }

  private handleRetry = (): void => {
    this.setState({ hasError: false, message: null });
  };

  private handleReload = (): void => {
    window.location.reload();
  };

  render(): React.ReactNode {
    if (!this.state.hasError) return this.props.children;

    return (
      <div className="min-h-screen bg-surface flex items-center justify-center p-6">
        <div className="w-full max-w-md rounded-2xl border border-surface-border bg-surface-card p-6 text-center space-y-4">
          <div className="mx-auto w-12 h-12 rounded-full bg-red-500/10 border border-red-500/30 flex items-center justify-center">
            <AlertTriangle className="w-6 h-6 text-red-400" />
          </div>
          <div className="space-y-1">
            <h1 className="text-lg font-semibold text-text">Something went wrong</h1>
            <p className="text-sm text-text-secondary">
              The screen failed to render. Your study data is safe on this device.
            </p>
            {this.state.message && (
              <p className="text-xs text-text-muted font-mono break-words pt-2">{this.state.message}</p>
            )}
          </div>
          <div className="flex gap-2 justify-center pt-2">
            <button
              onClick={this.handleRetry}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-surface-elevated border border-surface-border text-sm font-medium text-text hover:bg-surface-hover transition-colors"
            >
              <RotateCcw className="w-4 h-4" />
              Try again
            </button>
            <button
              onClick={this.handleReload}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-accent text-surface text-sm font-semibold hover:bg-accent-light transition-colors"
            >
              Reload app
            </button>
          </div>
        </div>
      </div>
    );
  }
}
