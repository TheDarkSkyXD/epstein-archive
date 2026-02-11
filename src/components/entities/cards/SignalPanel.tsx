import React from 'react';
import { SignalMetrics } from '../../../utils/forensics';

interface SignalPanelProps {
  metrics: SignalMetrics;
}

export const SignalPanel: React.FC<SignalPanelProps> = ({ metrics }) => {
  return (
    <div className="flex flex-col gap-1.5 w-full py-1">
      {/* Exposure Bar */}
      <div className="flex items-center gap-2 text-[10px] font-medium tracking-wide">
        <span className="text-cyan-400 w-16 uppercase opacity-80">Exposure</span>
        <div className="flex-1 h-1.5 bg-slate-800 rounded-full overflow-hidden">
          <div
            className="h-full bg-cyan-500 shadow-[0_0_8px_rgba(6,182,212,0.4)] transition-all duration-500 ease-out"
            style={{ width: `${Math.max(5, metrics.exposure)}%` }}
          />
        </div>
      </div>

      {/* Connectivity Bar */}
      <div className="flex items-center gap-2 text-[10px] font-medium tracking-wide">
        <span className="text-purple-400 w-16 uppercase opacity-80">Network</span>
        <div className="flex-1 h-1.5 bg-slate-800 rounded-full overflow-hidden">
          <div
            className="h-full bg-purple-500 shadow-[0_0_8px_rgba(168,85,247,0.4)] transition-all duration-500 ease-out"
            style={{ width: `${Math.max(5, metrics.connectivity)}%` }}
          />
        </div>
      </div>

      {/* Corroboration Bar */}
      <div className="flex items-center gap-2 text-[10px] font-medium tracking-wide">
        <span className="text-emerald-400 w-16 uppercase opacity-80">Source</span>
        <div className="flex-1 h-1.5 bg-slate-800 rounded-full overflow-hidden">
          <div
            className="h-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.4)] transition-all duration-500 ease-out"
            style={{ width: `${Math.max(5, metrics.corroboration)}%` }}
          />
        </div>
      </div>
    </div>
  );
};
