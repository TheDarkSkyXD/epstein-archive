import React from 'react';
import { ChevronRight, Home } from 'lucide-react';

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
    <nav className={`flex items-center text-sm ${className}`} aria-label="Breadcrumb">
      <ol className="flex items-center gap-1">
        {items.map((item, index) => (
          <li key={index} className="flex items-center min-w-0">
            {index > 0 && (
              <ChevronRight className="w-4 h-4 text-slate-500 mx-1 shrink-0" />
            )}
            {index === 0 && (
              <Home className="w-3.5 h-3.5 text-slate-400 mr-1.5 shrink-0" />
            )}
            {index === items.length - 1 ? (
              <span className="text-white font-medium truncate">
                {item.label}
              </span>
            ) : item.onClick ? (
              <button
                onClick={item.onClick}
                className="text-slate-400 hover:text-cyan-400 transition-colors truncate"
              >
                {item.label}
              </button>
            ) : (
              <span className="text-slate-400 truncate">
                {item.label}
              </span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
};