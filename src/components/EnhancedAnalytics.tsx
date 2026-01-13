import React, { useState, useEffect } from 'react';
import { Info, Users, Shield, Database, Activity } from 'lucide-react';
import { SunburstChart } from './SunburstChart';
import { AreaTimeline } from './AreaTimeline';
import { NetworkGraph } from './NetworkGraph';

interface EnhancedAnalyticsProps {
  onEntitySelect?: (entityId: number) => void;
  onTypeFilter?: (type: string) => void;
}

interface AnalyticsData {
  documentsByType: Array<{ type: string; count: number; redacted: number; avgRisk: number }>;
  timelineData: Array<{
    period: string;
    total: number;
    emails: number;
    photos: number;
    documents: number;
    financial: number;
  }>;
  topConnectedEntities: Array<{
    id: number;
    name: string;
    role: string;
    type: string;
    riskLevel: number;
    connectionCount: number;
    mentions: number;
  }>;
  entityTypeDistribution: Array<{ type: string; count: number; avgRisk: number }>;
  redactionStats: {
    totalDocuments: number;
    redactedDocuments: number;
    redactionPercentage: number;
    totalRedactions: number;
  };
  topRelationships: Array<{ source: string; target: string; type: string; weight: number }>;
}

export const EnhancedAnalytics: React.FC<EnhancedAnalyticsProps> = ({
  onEntitySelect,
  onTypeFilter,
}) => {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/analytics/enhanced', { credentials: 'include' });
      if (!response.ok) throw new Error('Failed to fetch analytics');
      const result = await response.json();

      // Filter out junk entities from Network Graph
      // These are entities that are likely false positives/parsing errors
      if (result.topConnectedEntities) {
        result.topConnectedEntities = result.topConnectedEntities.filter(
          (e: any) =>
            e.type !== 'Unknown' &&
            !e.name.includes('Unknown') &&
            // Specific junk names from user report
            !['Gues', 'Teme', 'Taki', 'Oping'].includes(e.name),
        );
      }

      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div
            className="animate-spin rounded-full h-16 w-16 border-b-2 border-cyan-500 mx-auto mb-4"
            style={{ boxShadow: '0 0 30px rgba(6, 182, 212, 0.5)' }}
          />
          <p className="text-slate-400 animate-pulse">Loading analytics...</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="text-center py-12">
        <p className="text-red-400 mb-4">{error || 'No data available'}</p>
        <button
          onClick={fetchAnalytics}
          className="px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg transition-colors"
        >
          Retry
        </button>
      </div>
    );
  }

  const { redactionStats, topConnectedEntities, topRelationships } = data;

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Hero Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          icon={<FileText className="h-5 w-5 text-cyan-400" />}
          value={redactionStats?.totalDocuments || 0}
          label="Total Documents"
          color="cyan"
        />
        <StatCard
          icon={<Shield className="h-5 w-5 text-orange-400" />}
          value={`${(redactionStats?.redactionPercentage || 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}%`}
          label="Redacted"
          color="orange"
          sublabel={`${(redactionStats?.redactedDocuments || 0).toLocaleString()} docs`}
        />
        <StatCard
          icon={<Users className="h-5 w-5 text-purple-400" />}
          value={topConnectedEntities?.length || 0}
          label="Connected Entities"
          color="purple"
        />
        <StatCard
          icon={<Activity className="h-5 w-5 text-emerald-400" />}
          value={topRelationships?.length || 0}
          label="Relationships"
          color="emerald"
        />
      </div>

      {/* Main Visualizations Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Document Types Sunburst */}
        <div className="glass-card p-6 rounded-xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <Database className="h-24 w-24 text-cyan-500" />
          </div>

          <h3 className="text-xl font-bold text-white mb-2 flex items-center gap-2 relative z-10">
            <FileText className="h-5 w-5 text-cyan-400" />
            <span className="neon-text-cyan">Document Types</span>
          </h3>

          <div className="text-xs text-slate-400 mb-4 flex items-start gap-2 bg-slate-900/50 p-3 rounded-lg border border-slate-700/50 relative z-10">
            <Info className="h-4 w-4 mt-0.5 flex-shrink-0 text-cyan-400" />
            <span>
              Breakdown of evidence by category. Click segments to filter. Hover for redaction
              stats.
            </span>
          </div>

          <div className="relative z-10">
            <SunburstChart
              data={data.documentsByType}
              onSegmentClick={(type) => onTypeFilter?.(type)}
            />
          </div>
        </div>

        {/* Timeline */}
        <div className="glass-card p-6 rounded-xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <TrendingUp className="h-24 w-24 text-purple-500" />
          </div>

          <h3 className="text-xl font-bold text-white mb-2 flex items-center gap-2 relative z-10">
            <TrendingUp className="h-5 w-5 text-purple-400" />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-400">
              Document Timeline
            </span>
          </h3>

          <div className="text-xs text-slate-400 mb-4 flex items-start gap-2 bg-slate-900/50 p-3 rounded-lg border border-slate-700/50 relative z-10">
            <Info className="h-4 w-4 mt-0.5 flex-shrink-0 text-purple-400" />
            <span>
              Evidence volume over time, stacked by document type. Shows activity patterns and
              peaks.
            </span>
          </div>

          <div className="relative z-10">
            <AreaTimeline data={data.timelineData} />
          </div>
        </div>
      </div>

      {/* Entity Network - Full Width */}
      <div className="glass-card p-6 rounded-xl relative overflow-hidden">
        <h3 className="text-xl font-bold text-white mb-2 flex items-center gap-2">
          <Users className="h-5 w-5 text-emerald-400" />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-cyan-400">
            Entity Connection Network
          </span>
          <span className="ml-auto text-xs font-medium px-3 py-1 bg-emerald-500/10 text-emerald-300 rounded-full border border-emerald-500/20">
            Top 500 by Connections
          </span>
        </h3>

        <div className="text-xs text-slate-400 mb-4 flex items-start gap-2 bg-slate-900/50 p-3 rounded-lg border border-slate-700/50">
          <Info className="h-4 w-4 mt-0.5 flex-shrink-0 text-emerald-400" />
          <span>
            Interactive network showing entity relationships. Node size = connections. Colors
            indicate risk level. Click to view entity details.
          </span>
        </div>

        <NetworkGraph
          entities={topConnectedEntities}
          relationships={topRelationships}
          onEntityClick={(entity) => onEntitySelect?.(entity.id)}
          maxNodes={500}
        />
      </div>
    </div>
  );
};

// Helper component for stat cards
const StatCard: React.FC<{
  icon: React.ReactNode;
  value: number | string;
  label: string;
  color: string;
  sublabel?: string;
}> = ({ icon, value, label, color, sublabel }) => (
  <div
    className={`glass-panel p-4 rounded-xl hover:bg-slate-800/60 transition-all duration-300 group relative overflow-hidden`}
  >
    <div
      className={`absolute inset-0 bg-gradient-to-br from-${color}-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity`}
    />
    <div className="relative z-10">
      <div className="flex items-center gap-2 mb-2">
        {icon}
        <span className="text-slate-400 text-xs font-medium uppercase tracking-wide">{label}</span>
      </div>
      <div
        className={`text-3xl font-bold text-white font-mono group-hover:text-${color}-400 transition-colors`}
      >
        {typeof value === 'number' ? value.toLocaleString() : value}
      </div>
      {sublabel && <div className="text-xs text-slate-500 mt-1">{sublabel}</div>}
    </div>
  </div>
);

export default EnhancedAnalytics;
