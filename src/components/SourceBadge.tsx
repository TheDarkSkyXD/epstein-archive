import React from 'react';

interface SourceBadgeProps {
  source: 'Seventh Production' | 'Black Book' | 'Public Record' | string;
  className?: string;
}

export const SourceBadge: React.FC<SourceBadgeProps> = ({ source, className = '' }) => {
  // Get source badge color
  const getSourceColor = (source: string) => {
    switch (source) {
      case 'Black Book':
        return 'bg-[var(--accent-soft-danger)] text-[var(--accent-danger)] border-[var(--accent-danger)]';
      case 'Seventh Production':
        return 'bg-[var(--accent-soft-primary)] text-[var(--accent-primary)] border-[var(--accent-primary)]';
      case 'Public Record':
        return 'bg-[var(--accent-soft-secondary)] text-[var(--accent-secondary)] border-[var(--accent-secondary)]';
      default:
        return 'bg-[var(--bg-subtle)] text-[var(--text-secondary)] border-[var(--border-subtle)]';
    }
  };

  return (
    <span className={`
      px-[var(--space-2)] 
      py-[var(--space-1)] 
      rounded-full 
      text-[var(--font-size-small)] 
      border 
      ${getSourceColor(source)}
      ${className}
    `}>
      {source}
    </span>
  );
};