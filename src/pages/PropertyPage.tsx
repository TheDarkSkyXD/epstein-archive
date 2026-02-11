import React from 'react';
import PropertyBrowser from '../components/PropertyBrowser';

export const PropertyPage: React.FC = () => {
  return (
    <div className="bg-slate-900/50 rounded-xl p-6 border border-slate-700/50">
      <PropertyBrowser />
    </div>
  );
};
