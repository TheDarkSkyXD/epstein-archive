import React, { useEffect, useState } from 'react';
import Icon from './Icon';

interface DataQualityMetrics {
  totalDocuments: number;
  documentsWithProvenance: number;
  provenanceCoverage: number;
  sourceCollections: { name: string; count: number }[];
  evidenceTypeDistribution: { type: string; count: number }[];
  entityQuality: {
    total: number;
    withRoles: number;
    withRedFlagDescription: number;
    nullRedFlagRating?: number;
  };
  dataIntegrity?: {
    orphanedEntityMentions: number;
    potentialJunkEntities: number;
  };
  lastUpdated: string;
}

export const DataQualityDashboard: React.FC = () => {
  const [metrics, setMetrics] = useState<DataQualityMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/data-quality/metrics')
      .then((res) => {
        if (!res.ok) throw new Error('Failed to fetch metrics');
        return res.json();
      })
      .then(setMetrics)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-500" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-900/20 border border-red-500/30 rounded-lg p-4 text-red-300">
        <Icon name="AlertTriangle" size="sm" className="inline mr-2" />
        Error loading metrics: {error}
      </div>
    );
  }

  if (!metrics) return null;

  const coverageColor =
    metrics.provenanceCoverage >= 90
      ? 'text-green-400'
      : metrics.provenanceCoverage >= 70
        ? 'text-yellow-400'
        : 'text-red-400';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-white flex items-center gap-2">
          <Icon name="BarChart3" size="md" />
          Data Quality Dashboard
        </h2>
        <span className="text-xs text-slate-500">
          Updated: {new Date(metrics.lastUpdated).toLocaleString()}
        </span>
      </div>

      {/* Key Metrics Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <MetricCard
          title="Total Documents"
          value={metrics.totalDocuments.toLocaleString()}
          icon="FileText"
          color="cyan"
        />
        <MetricCard
          title="Provenance Coverage"
          value={`${metrics.provenanceCoverage}%`}
          icon="Shield"
          color={
            metrics.provenanceCoverage >= 90
              ? 'green'
              : metrics.provenanceCoverage >= 70
                ? 'yellow'
                : 'red'
          }
        />
        <MetricCard
          title="Total Entities"
          value={metrics.entityQuality.total.toLocaleString()}
          icon="Users"
          color="purple"
        />
        <MetricCard
          title="Entities with Roles"
          value={`${Math.round((metrics.entityQuality.withRoles / metrics.entityQuality.total) * 100)}%`}
          icon="UserCheck"
          color="blue"
        />
      </div>

      {/* Source Collections */}
      <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700/50">
        <h3 className="text-sm font-medium text-slate-300 mb-3 flex items-center gap-2">
          <Icon name="Database" size="sm" />
          Source Collections
        </h3>
        <div className="space-y-2">
          {metrics.sourceCollections.slice(0, 8).map((src) => {
            const percentage = ((src.count / metrics.totalDocuments) * 100).toFixed(1);
            return (
              <div key={src.name} className="flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-slate-300 truncate">{src.name}</span>
                    <span className="text-slate-500">
                      {src.count.toLocaleString()} ({percentage}%)
                    </span>
                  </div>
                  <div className="h-1.5 bg-slate-700 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 rounded-full"
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Evidence Types */}
      <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700/50">
        <h3 className="text-sm font-medium text-slate-300 mb-3 flex items-center gap-2">
          <Icon name="Tag" size="sm" />
          Evidence Type Distribution
        </h3>
        <div className="flex flex-wrap gap-2">
          {metrics.evidenceTypeDistribution.slice(0, 10).map((ev) => (
            <span
              key={ev.type}
              className="px-2 py-1 bg-slate-700/50 rounded text-xs text-slate-300 flex items-center gap-1"
            >
              <span className="capitalize">{ev.type.replace(/_/g, ' ')}</span>
              <span className="text-slate-500">({ev.count.toLocaleString()})</span>
            </span>
          ))}
        </div>
      </div>

      {/* Trust Indicator */}
      <div
        className={`bg-gradient-to-r ${
          metrics.provenanceCoverage >= 90
            ? 'from-green-900/30 to-green-800/10 border-green-500/30'
            : 'from-yellow-900/30 to-yellow-800/10 border-yellow-500/30'
        } rounded-lg p-4 border`}
      >
        <div className="flex items-center gap-3">
          <Icon
            name={metrics.provenanceCoverage >= 90 ? 'CheckCircle' : 'AlertCircle'}
            size="lg"
            className={coverageColor}
          />
          <div>
            <p className={`font-medium ${coverageColor}`}>
              {metrics.provenanceCoverage >= 90 ? 'High Data Quality' : 'Data Quality Notice'}
            </p>
            <p className="text-xs text-slate-400">
              {metrics.provenanceCoverage}% of documents have verified source attribution
            </p>
          </div>
        </div>
      </div>

      {/* Data Integrity Issues */}
      {metrics.dataIntegrity &&
        (metrics.dataIntegrity.orphanedEntityMentions > 0 ||
          metrics.dataIntegrity.potentialJunkEntities > 0) && (
          <div className="bg-slate-800/50 rounded-lg p-4 border border-amber-500/30">
            <h3 className="text-sm font-medium text-amber-300 mb-3 flex items-center gap-2">
              <Icon name="AlertTriangle" size="sm" />
              Data Integrity Issues
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center">
                <p className="text-2xl font-bold text-amber-400">
                  {metrics.dataIntegrity.orphanedEntityMentions.toLocaleString()}
                </p>
                <p className="text-xs text-slate-400">Orphaned Entity Mentions</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-amber-400">
                  {metrics.dataIntegrity.potentialJunkEntities.toLocaleString()}
                </p>
                <p className="text-xs text-slate-400">Potential Junk Entities</p>
              </div>
            </div>
          </div>
        )}
    </div>
  );
};

// Helper component for metric cards
const MetricCard: React.FC<{
  title: string;
  value: string;
  icon: string;
  color: 'cyan' | 'green' | 'yellow' | 'red' | 'purple' | 'blue';
}> = ({ title, value, icon, color }) => {
  const colorClasses = {
    cyan: 'from-cyan-500/20 to-cyan-600/10 border-cyan-500/30 text-cyan-400',
    green: 'from-green-500/20 to-green-600/10 border-green-500/30 text-green-400',
    yellow: 'from-yellow-500/20 to-yellow-600/10 border-yellow-500/30 text-yellow-400',
    red: 'from-red-500/20 to-red-600/10 border-red-500/30 text-red-400',
    purple: 'from-purple-500/20 to-purple-600/10 border-purple-500/30 text-purple-400',
    blue: 'from-blue-500/20 to-blue-600/10 border-blue-500/30 text-blue-400',
  };

  return (
    <div className={`bg-gradient-to-br ${colorClasses[color]} rounded-lg p-4 border`}>
      <div className="flex items-center gap-2 mb-2">
        <Icon name={icon as any} size="sm" className={colorClasses[color].split(' ').pop()} />
        <span className="text-xs text-slate-400">{title}</span>
      </div>
      <p className="text-2xl font-bold text-white">{value}</p>
    </div>
  );
};

export default DataQualityDashboard;
