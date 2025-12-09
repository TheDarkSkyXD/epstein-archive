import React, { Component, ReactNode } from 'react'
import { TailoredErrorFallback } from './TailoredErrorFallback';

interface ScopedErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error) => void;
  retryLabel?: string;
}

type State = { hasError: boolean, error?: Error }

class ScopedErrorBoundary extends Component<ScopedErrorBoundaryProps, State> {
  state: State = { hasError: false }
  
  static getDerivedStateFromError(error: Error) { 
    return { hasError: true, error } 
  }
  
  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) { 
    try { 
      console.error('ScopedErrorBoundary caught an error:', error, errorInfo)
      if (this.props.onError) {
        this.props.onError(error)
      }
    } catch (e) {
      // Silently ignore logging errors to prevent infinite loops
    }
  }
  
  handleRetry = () => {
    this.setState({ hasError: false, error: undefined })
  }
  
  handleGoHome = () => {
    window.location.href = '/';
  }
  
  render() {
    if (this.state.hasError) {
      // Use custom fallback if provided
      if (this.props.fallback) {
        return this.props.fallback
      }
      
      const msg = this.state.error?.message || 'An unexpected error occurred'
      
      // Determine error type and provide tailored message
      let errorType: 'network' | 'database' | 'document' | 'generic' = 'generic';
      
      if (msg.includes('API') || msg.includes('fetch') || msg.includes('network') || msg.includes('Failed to fetch')) {
        errorType = 'network';
      } else if (msg.includes('database') || msg.includes('DB') || msg.includes('SQL')) {
        errorType = 'database';
      } else if (msg.includes('document') || msg.includes('file') || msg.includes('not found')) {
        errorType = 'document';
      }
      
      return (
        <TailoredErrorFallback
          errorType={errorType}
          onRetry={this.handleRetry}
          onGoHome={this.handleGoHome}
        />
      );
    }
    return this.props.children
  }
}

export default ScopedErrorBoundary