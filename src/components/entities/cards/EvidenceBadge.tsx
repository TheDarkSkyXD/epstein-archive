import React from 'react';
import { EvidenceLadderLevel } from '../../../utils/forensics';
import Icon from '../../common/Icon';

interface EvidenceBadgeProps {
  level: EvidenceLadderLevel;
}

export const EvidenceBadge: React.FC<EvidenceBadgeProps> = ({ level }) => {
  const config = {
    L1: {
      label: 'L1 Direct',
      color: 'bg-red-500/10 text-red-400 border-red-500/30',
      icon: 'AlertOctagon',
      tooltip: 'Direct Evidence: Primary source documents (Logs, Black Book, Photos)',
    },
    L2: {
      label: 'L2 Inferred',
      color: 'bg-orange-500/10 text-orange-400 border-orange-500/30',
      icon: 'AlertTriangle',
      tooltip: 'Inferred: Strong network proximity or high volume of mentions',
    },
    L3: {
      label: 'L3 Derived',
      color: 'bg-blue-500/10 text-blue-400 border-blue-500/30',
      icon: 'HelpCircle',
      tooltip: 'Derived: Association suggested by AI summary or indirect context',
    },
    NONE: {
      label: 'No Signal',
      color: 'bg-slate-800 text-slate-500 border-slate-700',
      icon: 'Minus',
      tooltip: 'No significant evidence found',
    },
  };

  const { label, color, icon, tooltip } = config[level] || config.NONE;

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
