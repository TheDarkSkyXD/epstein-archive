import React from 'react';
import { EvidenceLadderLevel } from '../../../utils/forensics';
import Icon from '../../common/Icon';

interface EvidenceBadgeProps {
  level: EvidenceLadderLevel;
  rating?: number;
}

export const EvidenceBadge: React.FC<EvidenceBadgeProps> = ({ level, rating }) => {
  if (typeof rating === 'number' && rating > 0) {
    const band =
      rating >= 4 ? ('high' as const) : rating >= 3 ? ('medium' as const) : ('low' as const);
    const config = {
      high: {
        label: `Red Flag ${rating}/5`,
        color: 'bg-red-500/10 text-red-400 border-red-500/30',
        icon: 'AlertOctagon',
        tooltip: 'High red flag rating based on evidence and risk indicators',
      },
      medium: {
        label: `Red Flag ${rating}/5`,
        color: 'bg-amber-500/10 text-amber-300 border-amber-500/30',
        icon: 'AlertTriangle',
        tooltip: 'Medium red flag rating with notable indicators present',
      },
      low: {
        label: `Red Flag ${rating}/5`,
        color: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30',
        icon: 'Shield',
        tooltip: 'Low red flag rating; limited indicators',
      },
    }[band];

    return (
      <div
        className={`flex items-center gap-1.5 px-2 py-0.5 rounded border text-[9px] font-bold uppercase tracking-wider ${config.color}`}
        title={config.tooltip}
      >
        <Icon name={config.icon as any} size="xs" className="w-3 h-3" />
        {config.label}
      </div>
    );
  }

  const ladderConfig = {
    L1: {
      label: 'L1 Direct',
      color: 'bg-red-500/10 text-red-400 border-red-500/30',
      icon: 'AlertOctagon',
      tooltip: 'Direct evidence present (e.g., Black Book, Flight Logs, Photos)',
    },
    L2: {
      label: 'L2 Inferred',
      color: 'bg-amber-500/10 text-amber-300 border-amber-500/30',
      icon: 'AlertTriangle',
      tooltip: 'Inference from proximity or volume (no primary source)',
    },
    L3: {
      label: 'L3 Derived',
      color: 'bg-blue-500/10 text-blue-300 border-blue-500/30',
      icon: 'HelpCircle',
      tooltip: 'Derived association (agentic or indirect context)',
    },
    NONE: {
      label: 'No Signal',
      color: 'bg-slate-800 text-slate-500 border-slate-700',
      icon: 'Minus',
      tooltip: 'No significant evidence found',
    },
  };

  const { label, color, icon, tooltip } = ladderConfig[level] || ladderConfig.NONE;

  return (
    <div
      className={`flex items-center gap-1.5 px-2 py-0.5 rounded border text-[9px] font-bold uppercase tracking-wider ${color}`}
      title={tooltip}
    >
      <Icon name={icon as any} size="xs" className="w-3 h-3" />
      {label}
    </div>
  );
};
