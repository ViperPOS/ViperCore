import React from 'react';
import { AlertTriangle } from 'lucide-react';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught:', error, errorInfo);
  }

  handleReload = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div
          style={{ backgroundColor: 'var(--color-a)', color: 'var(--text-on-dark)' }}
          className="min-h-screen flex items-center justify-center p-4"
        >
          <div className="max-w-md w-full text-center">
            <AlertTriangle className="w-12 h-12 mx-auto mb-4" />
            <h1 className="text-xl font-semibold mb-2">Something went wrong</h1>
            <p className="text-sm mb-6" style={{ color: 'var(--text-on-dark)', opacity: 0.7 }}>
              {this.state.error?.message || 'An unexpected error occurred.'}
            </p>
            <button
              onClick={this.handleReload}
              className="px-4 py-2 rounded-lg text-sm font-semibold transition-colors"
              style={{
                backgroundColor: 'var(--color-a)',
                color: 'var(--text-on-dark)',
              }}
            >
              Try Again
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}