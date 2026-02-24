import React from 'react';

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
    // Update state so the next render will show the fallback UI
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    // Log error details
    console.error('ErrorBoundary caught an error:', error, errorInfo);

    // Update state with error details
    this.setState(prevState => ({
      error,
      errorInfo,
      errorCount: prevState.errorCount + 1
    }));

    // Optional: Send error to error reporting service
    // logErrorToService(error, errorInfo);
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
      const isDarkMode = document.body.style.background === '#0A0A0A' ||
                         window.matchMedia('(prefers-color-scheme: dark)').matches;

      return (
        <div
          style={{
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px',
            background: isDarkMode ? '#0A0A0A' : '#F9F9F7',
          }}
        >
          <div
            style={{
              maxWidth: '600px',
              width: '100%',
              padding: '32px',
              borderRadius: '16px',
              background: isDarkMode
                ? 'linear-gradient(135deg, rgba(255,255,255,0.04), rgba(255,255,255,0.01))'
                : 'linear-gradient(155deg, rgba(255,255,255,0.95), rgba(255,255,255,0.88))',
              border: isDarkMode ? '1px solid rgba(255,255,255,0.08)' : '1px solid rgba(0,0,0,0.06)',
              boxShadow: isDarkMode
                ? '0 8px 32px rgba(0,0,0,0.4)'
                : '0 0 0 1px rgba(0,0,0,0.06), 0 16px 32px rgba(0,0,0,0.05)',
            }}
          >
            {/* Error Icon */}
            <div
              style={{
                fontSize: '48px',
                textAlign: 'center',
                marginBottom: '20px',
              }}
            >
              ⚠️
            </div>

            {/* Title */}
            <h1
              style={{
                fontSize: '24px',
                fontWeight: '700',
                color: isDarkMode ? '#ffffff' : '#111827',
                textAlign: 'center',
                marginBottom: '12px',
                margin: 0,
              }}
            >
              Oops! Something went wrong
            </h1>

            {/* Subtitle */}
            <p
              style={{
                fontSize: '14px',
                color: isDarkMode ? '#a0a0a0' : '#6B7280',
                textAlign: 'center',
                marginBottom: '24px',
                lineHeight: '1.5',
              }}
            >
              We apologize for the inconvenience. The application encountered an unexpected error.
              {errorCount > 1 && ` (${errorCount} errors occurred)`}
            </p>

            {/* Error Details (Collapsible) */}
            {error && (
              <details
                style={{
                  marginBottom: '24px',
                  padding: '16px',
                  borderRadius: '12px',
                  background: isDarkMode ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)',
                  border: isDarkMode ? '1px solid rgba(255,255,255,0.08)' : '1px solid rgba(0,0,0,0.06)',
                  cursor: 'pointer',
                }}
              >
                <summary
                  style={{
                    fontSize: '13px',
                    fontWeight: '600',
                    color: isDarkMode ? '#ffffff' : '#111827',
                    marginBottom: '12px',
                    cursor: 'pointer',
                  }}
                >
                  Error Details
                </summary>
                <div
                  style={{
                    fontSize: '12px',
                    fontFamily: 'monospace',
                    color: isDarkMode ? '#a0a0a0' : '#6B7280',
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-word',
                    maxHeight: '200px',
                    overflowY: 'auto',
                    padding: '12px',
                    borderRadius: '8px',
                    background: isDarkMode ? 'rgba(0,0,0,0.3)' : 'rgba(0,0,0,0.03)',
                  }}
                >
                  <div style={{ marginBottom: '12px' }}>
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
            <div
              style={{
                display: 'flex',
                gap: '12px',
                justifyContent: 'center',
              }}
            >
              <button
                onClick={this.handleReset}
                style={{
                  padding: '12px 24px',
                  borderRadius: '10px',
                  border: isDarkMode ? '1px solid rgba(255,255,255,0.08)' : '1px solid rgba(0,0,0,0.06)',
                  background: isDarkMode
                    ? 'linear-gradient(135deg, rgba(255,255,255,0.04), rgba(255,255,255,0.01))'
                    : 'linear-gradient(155deg, rgba(255,255,255,0.95), rgba(255,255,255,0.88))',
                  color: isDarkMode ? '#ffffff' : '#111827',
                  fontSize: '14px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow = isDarkMode
                    ? '0 4px 12px rgba(255,255,255,0.1)'
                    : '0 4px 12px rgba(0,0,0,0.1)';
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
                style={{
                  padding: '12px 24px',
                  borderRadius: '10px',
                  border: 'none',
                  background: isDarkMode ? '#10B981' : '#047857',
                  color: '#ffffff',
                  fontSize: '14px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow = isDarkMode
                    ? '0 4px 12px rgba(16, 185, 129, 0.4)'
                    : '0 4px 12px rgba(6, 95, 70, 0.25)';
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
            <p
              style={{
                fontSize: '12px',
                color: isDarkMode ? '#606060' : '#9CA3AF',
                textAlign: 'center',
                marginTop: '24px',
                marginBottom: 0,
              }}
            >
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
