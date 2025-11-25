import React from 'react';

interface RedFlagIndexProps {
  value: number;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  showDescription?: boolean;
  showLegend?: boolean;
}

const sizeClasses = {
  sm: 'text-xs',
  md: 'text-sm',
  lg: 'text-base'
};

const descriptions = {
  0: 'No Red Flags',
  1: 'Minor Concerns',
  2: 'Moderate Red Flags',
  3: 'Significant Red Flags',
  4: 'High Red Flags',
  5: 'Critical Red Flags'
};

const colors = {
  0: 'text-gray-400',
  1: 'text-yellow-400',
  2: 'text-orange-400',
  3: 'text-red-400',
  4: 'text-purple-400',
  5: 'text-pink-500'
};

export const RedFlagIndex: React.FC<RedFlagIndexProps> = ({ 
  value, 
  size = 'md',
  showLabel = false,
  showDescription = false,
  showLegend = false
}) => {
  const normalizedValue = Math.max(0, Math.min(5, Math.round(value)));
  const peppers = normalizedValue > 0 ? '🚩'.repeat(normalizedValue) : '⚪';
  const description = descriptions[normalizedValue as keyof typeof descriptions];
  const colorClass = colors[normalizedValue as keyof typeof colors];

  const getRiskCategory = (val: number) => {
    if (val <= 1) return 'Background noise';
    if (val <= 3) return 'Relevant';
    return 'Critical attention';
  };

  return (
    <div className="inline-flex flex-col">
      <div className="inline-flex items-center gap-2">
        <span 
          className={`${sizeClasses[size]} ${colorClass}`}
          title={`Red Flag Index: ${normalizedValue}/5 - ${description}`}
          aria-label={`Red Flag Index: ${normalizedValue} out of 5 - ${description}`}
        >
          {peppers}
        </span>
        {showLabel && (
          <span className={`${sizeClasses[size]} text-gray-400`}>
            {normalizedValue}/5
          </span>
        )}
        {showDescription && (
          <span className={`${sizeClasses[size]} ${colorClass}`}>
            {description}
          </span>
        )}
      </div>
      {showLegend && (
        <div className="mt-1 text-xs text-gray-500">
          {getRiskCategory(normalizedValue)}
        </div>
      )}
    </div>
  );
};
