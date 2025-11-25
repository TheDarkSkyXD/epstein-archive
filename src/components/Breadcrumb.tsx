import React from 'react';
import { ChevronRight } from 'lucide-react';

interface BreadcrumbItem {
  label: string;
  href?: string;
  onClick?: () => void;
}

interface BreadcrumbProps {
  items: BreadcrumbItem[];
  className?: string;
}

export const Breadcrumb: React.FC<BreadcrumbProps> = ({ items, className = '' }) => {
  return (
    <nav className={`flex items-center text-[var(--font-size-caption)] ${className}`} aria-label="Breadcrumb">
      <ol className="flex items-center space-x-2">
        {items.map((item, index) => (
          <li key={index} className="flex items-center">
            {index > 0 && (
              <ChevronRight className="h-4 w-4 text-[var(--text-disabled)] mx-2" />
            )}
            {index === items.length - 1 ? (
              <span className="text-[var(--text-primary)] font-medium truncate max-w-xs">
                {item.label}
              </span>
            ) : item.onClick ? (
              <button
                onClick={item.onClick}
                className="text-[var(--text-secondary)] hover:text-[var(--accent-primary)] transition-colors truncate max-w-xs"
              >
                {item.label}
              </button>
            ) : (
              <span className="text-[var(--text-secondary)] truncate max-w-xs">
                {item.label}
              </span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
};