import React from 'react';
import { SignalMetrics } from '../../../utils/forensics';
import Tooltip from '../../common/Tooltip';

interface SignalPanelProps {
  metrics: SignalMetrics;
}

export const SignalPanel: React.FC<SignalPanelProps> = ({ metrics }) => {
  return (
    <div className="flex flex-col gap-1 w-full py-1">
      <Tooltip
        content="Exposure: relative mention volume across the corpus. Computed from log10(mentions+1) scaled to 0–100."
        position="top-end"
      >
        <div className="flex items-center gap-2 text-[10px] font-medium tracking-wide">
          <span className="text-cyan-400 w-16 uppercase opacity-80">Exposure</span>
          <div className="flex-1 h-1 bg-slate-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-cyan-500 shadow-[0_0_6px_rgba(6,182,212,0.4)] transition-all duration-500 ease-out"
              style={{ width: `${Math.max(5, metrics.exposure)}%` }}
            />
          </div>
        </div>
      </Tooltip>

      <Tooltip
        content="Network: connectivity score from relationship density. Based on connection count, capped for visualization."
        position="top-end"
      >
        <div className="flex items-center gap-2 text-[10px] font-medium tracking-wide">
          <span className="text-purple-400 w-16 uppercase opacity-80">Network</span>
          <div className="flex-1 h-1 bg-slate-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-purple-500 shadow-[0_0_6px_rgba(168,85,247,0.4)] transition-all duration-500 ease-out"
              style={{ width: `${Math.max(5, metrics.connectivity)}%` }}
            />
          </div>
        </div>
      </Tooltip>

      <Tooltip
        content="Source: corroboration from distinct evidence types and document diversity contributing to the signal."
        position="top-end"
      >
        <div className="flex items-center gap-2 text-[10px] font-medium tracking-wide">
          <span className="text-emerald-400 w-16 uppercase opacity-80">Source</span>
          <div className="flex-1 h-1 bg-slate-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.4)] transition-all duration-500 ease-out"
              style={{ width: `${Math.max(5, metrics.corroboration)}%` }}
            />
          </div>
        </div>
      </Tooltip>
    </div>
  );
};
