import React from 'react';
import { logger } from '../utils/logger';

/**
 * Error Boundary Component
 * Catches React errors anywhere in the component tree and displays a fallback UI
 *
 * Usage: Wrap your app or specific components with <ErrorBoundary>
 */
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorCount: 0
    };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    logger.error('ErrorBoundary caught an error:', error, errorInfo);
    this.setState(prevState => ({
      error,
      errorInfo,
      errorCount: prevState.errorCount + 1
    }));
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null
    });
  };

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      const { error, errorInfo, errorCount } = this.state;

      return (
        <div className="min-h-screen flex items-center justify-center p-5 bg-[var(--color-bg)]">
          <div className="max-w-[600px] w-full p-8 rounded-[16px] bg-[var(--color-card-bg)] border border-[var(--color-border)] shadow-[var(--effect-card-shadow)]">

            {/* Error Icon */}
            <div className="text-5xl text-center mb-5">⚠️</div>

            {/* Title */}
            <h1 className="text-2xl font-bold text-[var(--color-text)] text-center mb-3 m-0">
              Oops! Something went wrong
            </h1>

            {/* Subtitle */}
            <p className="text-sm text-[var(--color-text-secondary)] text-center mb-6 leading-relaxed">
              We apologize for the inconvenience. The application encountered an unexpected error.
              {errorCount > 1 && ` (${errorCount} errors occurred)`}
            </p>

            {/* Error Details (Collapsible) */}
            {error && (
              <details className="mb-6 p-4 rounded-card bg-[var(--color-inner-bg)] border border-[var(--color-border)] cursor-pointer">
                <summary className="text-[13px] font-semibold text-[var(--color-text)] mb-3 cursor-pointer">
                  Error Details
                </summary>
                <div className="text-xs font-mono text-[var(--color-text-secondary)] whitespace-pre-wrap break-words max-h-[200px] overflow-y-auto p-3 rounded-button bg-[var(--color-subtle-bg)]">
                  <div className="mb-3">
                    <strong>Error:</strong> {error.toString()}
                  </div>
                  {errorInfo && errorInfo.componentStack && (
                    <div>
                      <strong>Component Stack:</strong>
                      {errorInfo.componentStack}
                    </div>
                  )}
                </div>
              </details>
            )}

            {/* Action Buttons */}
            <div className="flex gap-3 justify-center">
              <button
                onClick={this.handleReset}
                className="px-6 py-3 rounded-[10px] border border-[var(--color-border)] bg-[var(--color-card-bg)] text-[var(--color-text)] text-sm font-semibold cursor-pointer transition-all duration-200"
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow = '0 4px 12px rgba(255,255,255,0.1)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              >
                Try Again
              </button>

              <button
                onClick={this.handleReload}
                className="px-6 py-3 rounded-[10px] border-none bg-[var(--color-success)] text-white text-sm font-semibold cursor-pointer transition-all duration-200"
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow = '0 4px 12px rgba(16,185,129,0.35)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              >
                Reload Page
              </button>
            </div>

            {/* Help Text */}
            <p className="text-xs text-[var(--color-text-muted)] text-center mt-6 mb-0">
              If the problem persists, please contact support or check the browser console for more details.
            </p>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
