import React from 'react';
import { DriverChip } from '../../../utils/forensics';
import Tooltip from '../../common/Tooltip';

interface DriverChipsProps {
  chips: DriverChip[];
}

export const DriverChips: React.FC<DriverChipsProps> = ({ chips }) => {
  if (!chips || chips.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-1.5 mt-2">
      {chips.map((chip, idx) => {
        const style =
          chip.type === 'critical'
            ? 'bg-red-950/40 text-red-200 border-red-500/20'
            : chip.type === 'verified'
              ? 'bg-cyan-950/40 text-cyan-200 border-cyan-500/20'
              : 'bg-slate-800/60 text-slate-400 border-slate-700/50';
        const descriptions: Record<string, string> = {
          critical: 'Direct evidence driver (e.g., Black Book, Flight Logs).',
          verified: 'Verified media driver (e.g., photos).',
          context: 'Context indicator (e.g., high exposure or network hub).',
          unverified: 'Agentic or inferred-only indicator.',
        };
        const content = `${chip.label} — ${descriptions[chip.type] || ''}`;

        return (
          <Tooltip key={idx} content={content} position="top-end">
            <span
              className={`px-2 py-0.5 rounded text-[10px] uppercase font-medium tracking-wide border ${style}`}
            >
              {chip.label}
            </span>
          </Tooltip>
        );
      })}
    </div>
  );
};
