import React from 'react';
import FlightTracker from '../components/FlightTracker';

export const FlightsPage: React.FC = () => {
  return (
    <div className="bg-slate-900/50 rounded-xl p-6 border border-slate-700/50">
      <FlightTracker />
    </div>
  );
};
