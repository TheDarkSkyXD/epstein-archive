import React, { useState } from 'react';
import { Clock, Plane } from 'lucide-react';
import Timeline from './Timeline';
import FlightTracker from './FlightTracker';

type ViewMode = 'events' | 'flights';

interface TimelineWithFlightsProps {
  className?: string;
}

/**
 * Wrapper component that provides view mode tabs for Timeline and Flight Tracker
 */
const TimelineWithFlights: React.FC<TimelineWithFlightsProps> = ({ className = '' }) => {
  const [viewMode, setViewMode] = useState<ViewMode>('events');

  return (
    <div className={`space-y-6 ${className}`}>
      {/* View Mode Tabs */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl md:text-3xl font-bold text-white mb-2">Investigation Timeline</h2>
          <p className="text-sm md:text-base text-slate-400">
            {viewMode === 'events' 
              ? 'Chronological sequence of significant events extracted from evidence files.'
              : 'Flight logs from Epstein private aircraft (1991-2006)'}
          </p>
        </div>
        
        <div className="flex gap-2">
          <button
            onClick={() => setViewMode('events')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all duration-200 ${
              viewMode === 'events'
                ? 'bg-gradient-to-r from-orange-600 to-orange-500 text-white shadow-lg shadow-orange-500/25'
                : 'bg-slate-800/60 text-slate-400 hover:text-white hover:bg-slate-700/60 border border-slate-700'
            }`}
          >
            <Clock className="w-4 h-4" />
            <span>Events</span>
          </button>
          <button
            onClick={() => setViewMode('flights')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all duration-200 ${
              viewMode === 'flights'
                ? 'bg-gradient-to-r from-cyan-600 to-cyan-500 text-white shadow-lg shadow-cyan-500/25'
                : 'bg-slate-800/60 text-slate-400 hover:text-white hover:bg-slate-700/60 border border-slate-700'
            }`}
          >
            <Plane className="w-4 h-4" />
            <span>Flight Logs</span>
          </button>
        </div>
      </div>

      {/* Content based on view mode */}
      {viewMode === 'events' ? (
        <Timeline />
      ) : (
        <FlightTracker />
      )}
    </div>
  );
};

export default TimelineWithFlights;
