import React from 'react';
import { EvidenceLadderLevel } from '../../../utils/forensics';
import Icon from '../../common/Icon';
import { riskToneFromRating } from '../../../utils/riskSemantics';

interface EvidenceBadgeProps {
  level: EvidenceLadderLevel;
  ratingObjective?: number;
  ratingSubjective?: number;
}

const FlagStack = ({ count, colorVar }: { count: number; colorVar: string }) => {
  const n = Math.max(0, Math.min(5, count || 0));
  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: n }).map((_, i) => (
        <span key={i} style={{ color: colorVar }} className="inline-flex">
          <Icon name="Flag" size="xs" className="w-3 h-3" />
        </span>
      ))}
    </div>
  );
};

export const EvidenceBadge: React.FC<EvidenceBadgeProps> = ({
  level,
  ratingObjective,
  ratingSubjective,
}) => {
  if ((ratingObjective && ratingObjective > 0) || (ratingSubjective && ratingSubjective > 0)) {
    return (
      <div className="flex items-center gap-2 px-2 py-0.5 rounded border border-slate-700 bg-slate-800/40">
        {ratingObjective ? (
          <div className="flex items-center gap-1" title="Objective Risk Rating">
            <FlagStack
              count={ratingObjective}
              colorVar={riskToneFromRating(ratingObjective).cssVar}
            />
          </div>
        ) : null}
        {ratingSubjective ? (
          <div className="flex items-center gap-1" title="Subjective Risk Rating">
            <FlagStack
              count={ratingSubjective}
              colorVar={riskToneFromRating(ratingSubjective).cssVar}
            />
          </div>
        ) : null}
      </div>
    );
  }

  const ladderConfig = {
    L1: { color: 'evidence-direct', icon: 'AlertOctagon', label: 'Direct Evidence' },
    L2: { color: 'evidence-inferred', icon: 'AlertTriangle', label: 'Inferred Evidence' },
    L3: { color: 'evidence-agentic', icon: 'HelpCircle', label: 'Agentic Evidence' },
    NONE: { color: 'text-slate-500', icon: 'Minus', label: 'No Signal' },
  } as const;
  const cfg = ladderConfig[level] || ladderConfig.NONE;

  return (
    <div className={`semantic-chip ${cfg.color}`} title={`Evidence Level: ${cfg.label}`}>
      <Icon name={cfg.icon as any} size="xs" className="w-3 h-3" />
      <span className="text-[10px] uppercase tracking-wide">{cfg.label}</span>
    </div>
  );
};
