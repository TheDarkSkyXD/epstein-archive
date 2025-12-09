import React from 'react';
import Icon from './Icon';
import { RedFlagIndex } from './RedFlagIndex';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
  title?: string;
  subtitle?: string;
  icon?: string;
  iconColor?: 'primary' | 'secondary' | 'success' | 'warning' | 'danger' | 'info' | 'white' | 'gray';
  redFlagRating?: number;
  metadata?: Array<{
    label: string;
    value: string | number;
    icon?: string;
  }>;
  actionButtons?: Array<{
    label: string;
    onClick: () => void;
    variant?: 'primary' | 'secondary';
  }>;
}

export const Card: React.FC<CardProps> = ({ 
  children, 
  className = '', 
  onClick,
  title,
  subtitle,
  icon,
  iconColor = 'gray',
  redFlagRating,
  metadata = [],
  actionButtons = []
}) => {
  return (
    <div 
      onClick={onClick}
      className={`
        bg-gradient-to-br from-slate-800/70 to-slate-900/50 backdrop-blur-sm 
        border border-slate-600 rounded-2xl p-6 
        hover:from-slate-800/80 hover:to-slate-900/60 hover:border-slate-500 
        active:scale-[0.98] active:bg-slate-800/90 
        transition-all cursor-pointer group animate-fade-in
        ${onClick ? '' : ''}
        ${className}
      `}
    >
      {/* Header section with title, subtitle, and icon */}
      {(title || subtitle || icon || redFlagRating !== undefined) && (
        <div className="flex items-start justify-between mb-5">
          <div className="flex items-center space-x-4">
            {icon && (
              <div className="bg-gradient-to-br from-slate-700 to-slate-800 rounded-xl p-3.5 group-hover:from-slate-600 group-hover:to-slate-700 transition-all duration-300">
                <Icon name={icon} size="md" color={iconColor} />
              </div>
            )}
            <div>
              {title && (
                <h3 
                  className="text-xl font-bold text-white group-hover:text-blue-400 transition-colors truncate" 
                  title={title}
                >
                  {title}
                </h3>
              )}
              {subtitle && (
                <p 
                  className="text-sm text-slate-400 truncate mt-1" 
                  title={subtitle}
                >
                  {subtitle}
                </p>
              )}
            </div>
          </div>
          {redFlagRating !== undefined && (
            <div className="flex items-center">
              <RedFlagIndex value={redFlagRating} size="sm" showLabel={false} variant="combined" showTextLabel={true} />
            </div>
          )}
        </div>
      )}

      {/* Main content */}
      <div className="space-y-5">
        {children}
      </div>

      {/* Metadata section */}
      {metadata.length > 0 && (
        <div className="space-y-3 mt-4">
          <div className="flex flex-wrap gap-4 text-xs text-slate-400">
            {metadata.map((item, index) => (
              <div key={index} className="flex items-center">
                {item.icon && (
                  <Icon name={item.icon} size="xs" className="mr-1" />
                )}
                <span>{item.label}: <span className="text-slate-300">{item.value}</span></span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Action buttons */}
      {actionButtons.length > 0 && (
        <div className="mt-6 flex items-center justify-between pt-4 border-t border-slate-700/50">
          <div></div>
          <div className="flex items-center gap-2">
            {actionButtons.map((button, index) => (
              <button
                key={index}
                onClick={(e) => {
                  e.stopPropagation();
                  button.onClick();
                }}
                className={`
                  text-xs px-3 py-1.5 rounded-lg transition-colors
                  ${button.variant === 'primary' 
                    ? 'bg-blue-600 hover:bg-blue-700 text-white' 
                    : 'text-slate-400 hover:text-blue-400 hover:bg-slate-700/50'
                  }
                `}
              >
                {button.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};