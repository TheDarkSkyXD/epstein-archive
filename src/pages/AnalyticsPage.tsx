import React from 'react';
import { EnhancedAnalytics } from '../components/pages/EnhancedAnalytics';
import { DataVisualization } from '../components/visualizations/DataVisualization';
import ScopedErrorBoundary from '../components/common/ScopedErrorBoundary';

interface AnalyticsPageProps {
  filteredPeople?: any[];
  analyticsData: any;
  loading: boolean;
  error: any;
  onRetry: () => void;
  onPersonSelect: (person: any) => void;
}

export const AnalyticsPage: React.FC<AnalyticsPageProps> = ({
  filteredPeople = [],
  analyticsData,
  loading,
  error,
  onRetry,
  onPersonSelect,
}) => {
  return (
    <ScopedErrorBoundary>
      <div className="space-y-8">
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-white mb-2">Enhanced Analytics</h2>
          <p className="text-slate-400">
            Interactive visualizations of the Epstein Investigation dataset
          </p>
        </div>
        <EnhancedAnalytics
          onEntitySelect={(entityId) => {
            const person = filteredPeople.find((p) => Number(p.id) === entityId);
            if (person) {
              onPersonSelect(person);
            }
          }}
          onTypeFilter={(type) => {
            console.log('Filter by type:', type);
          }}
        />

        <div className="glass-card p-6 rounded-xl">
          <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-400">
              Classic Analytics
            </span>
          </h3>
          <DataVisualization
            people={filteredPeople}
            analyticsData={analyticsData}
            loading={loading}
            error={error}
            onRetry={onRetry}
            onPersonSelect={onPersonSelect}
          />
        </div>
      </div>
    </ScopedErrorBoundary>
  );
};
