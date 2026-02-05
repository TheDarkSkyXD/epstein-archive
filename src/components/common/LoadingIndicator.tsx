import React from 'react';

interface LoadingIndicatorProps {
  isLoading: boolean;
  label?: string;
}

/**
 * A single subtle loading indicator that shows in the top-right corner.
 * Only renders when isLoading is true.
 */
const LoadingIndicator: React.FC<LoadingIndicatorProps> = ({ isLoading, label }) => {
  if (!isLoading) return null;

  return (
    <div className="fixed top-3 right-3 z-50 flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-900/80 border border-slate-700/50 shadow-lg backdrop-blur-sm">
      <div className="w-3 h-3 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
      {label && <span className="text-xs text-slate-300 max-w-[100px] truncate">{label}</span>}
    </div>
  );
};

export default LoadingIndicator;
