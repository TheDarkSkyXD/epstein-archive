import React from 'react';
import { DriverChip } from '../../../utils/forensics';

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

        return (
          <span
            key={idx}
            className={`px-2 py-0.5 rounded text-[10px] uppercase font-medium tracking-wide border ${style}`}
          >
            {chip.label}
          </span>
        );
      })}
    </div>
  );
};
