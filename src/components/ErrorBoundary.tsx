import React, { Component, ReactNode } from 'react';

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

interface ErrorBoundaryProps {
  children: ReactNode;
}

export default class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: any) {
    try {
      console.error('ErrorBoundary caught:', error, info);
    } catch {}
  }

  render() {
    if (this.state.hasError) {
      const msg = this.state.error?.message || 'Unexpected error';
      return (
        <div className="min-h-screen bg-gray-950 text-slate-200 flex items-center justify-center p-6">
          <div className="max-w-lg w-full bg-slate-900 border border-slate-700 rounded-xl p-6 shadow-lg">
            <h1 className="text-xl font-bold text-red-400 mb-2">Something went wrong</h1>
            <p className="text-slate-300 text-sm mb-4">{msg}</p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => window.location.reload()}
                className="px-3 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg"
              >
                Reload
              </button>
              <button
                onClick={() => {
                  try {
                    localStorage.clear();
                  } catch {}
                  window.location.reload();
                }}
                className="px-3 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg"
              >
                Clear cache & reload
              </button>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
