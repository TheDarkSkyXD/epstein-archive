import React, { useEffect, useState } from 'react';
import Icon from '../common/Icon';

interface EntityConfidence {
  entityId: string | number;
  entityName: string;
  confidenceScore: number;
  evidenceBreakdown: { evidence_type: string; count: number }[];
  totalMentions: number;
  confidenceLevel: 'High' | 'Medium' | 'Low';
}

interface EntityConfidenceDisplayProps {
  entityId: string | number;
  showBreakdown?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export const EntityConfidenceDisplay: React.FC<EntityConfidenceDisplayProps> = ({
  entityId,
  showBreakdown = false,
  size = 'md',
}) => {
  const [confidence, setConfidence] = useState<EntityConfidence | null>(null);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(showBreakdown);

  useEffect(() => {
    if (!entityId) return;

    fetch(`/api/entities/${entityId}/confidence`)
      .then((res) => (res.ok ? res.json() : Promise.reject('Failed')))
      .then(setConfidence)
      .catch(() => setConfidence(null))
      .finally(() => setLoading(false));
  }, [entityId]);

  if (loading) {
    return <div className="animate-pulse bg-slate-700 rounded h-5 w-16" />;
  }

  if (!confidence) {
    return null;
  }

  const getColor = (level: string) => {
    switch (level) {
      case 'High':
        return 'text-green-400 bg-green-500/20 border-green-500/30';
      case 'Medium':
        return 'text-yellow-400 bg-yellow-500/20 border-yellow-500/30';
      case 'Low':
        return 'text-orange-400 bg-orange-500/20 border-orange-500/30';
      default:
        return 'text-slate-400 bg-slate-500/20 border-slate-500/30';
    }
  };

  const getIcon = (level: string) => {
    switch (level) {
      case 'High':
        return 'ShieldCheck';
      case 'Medium':
        return 'Shield';
      case 'Low':
        return 'AlertTriangle';
      default:
        return 'HelpCircle';
    }
  };

  const sizeClasses = {
    sm: 'text-xs px-1.5 py-0.5',
    md: 'text-sm px-2 py-1',
    lg: 'text-base px-3 py-1.5',
  };

  // Simple badge
  if (!expanded) {
    return (
      <button
        onClick={() => setExpanded(true)}
        className={`inline-flex items-center gap-1 rounded border ${getColor(confidence.confidenceLevel)} ${sizeClasses[size]} hover:opacity-80 transition-opacity`}
        title={`Data confidence: ${confidence.confidenceScore}% based on ${confidence.totalMentions} mentions`}
      >
        <Icon name={getIcon(confidence.confidenceLevel)} size="xs" />
        <span>{confidence.confidenceLevel}</span>
        <span className="opacity-60">({confidence.confidenceScore}%)</span>
      </button>
    );
  }

  // Expanded breakdown
  return (
    <div className={`rounded-lg border ${getColor(confidence.confidenceLevel)} overflow-hidden`}>
      <div className="flex items-center justify-between px-3 py-2 bg-slate-800/50">
        <div className="flex items-center gap-2">
          <Icon name={getIcon(confidence.confidenceLevel)} size="sm" />
          <span className="font-medium">{confidence.confidenceLevel} Confidence</span>
          <span className="opacity-60">{confidence.confidenceScore}%</span>
        </div>
        <button onClick={() => setExpanded(false)} className="opacity-60 hover:opacity-100">
          <Icon name="X" size="sm" />
        </button>
      </div>

      <div className="p-3 bg-slate-900/50 space-y-3">
        <p className="text-xs text-slate-400">
          Based on {confidence.totalMentions.toLocaleString()} references across verified sources
        </p>

        {/* Evidence breakdown */}
        {confidence.evidenceBreakdown.length > 0 && (
          <div className="space-y-1">
            <span className="text-xs text-slate-500">Evidence Sources:</span>
            <div className="flex flex-wrap gap-1">
              {confidence.evidenceBreakdown.map((ev) => (
                <span
                  key={ev.evidence_type}
                  className="text-xs px-2 py-0.5 bg-slate-700/50 rounded text-slate-300"
                >
                  {ev.evidence_type?.replace(/_/g, ' ') || 'document'} ({ev.count})
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Confidence explanation */}
        <div className="text-xs text-slate-500 border-t border-slate-700/50 pt-2">
          <Icon name="Info" size="xs" className="inline mr-1" />
          Confidence is weighted by source type: legal documents (100%), testimony (90%), flight
          logs (85%), financial (80%), emails (70%), photos (50%).
        </div>
      </div>
    </div>
  );
};

// Compact inline badge version
export const EntityConfidenceBadge: React.FC<{ entityId: string | number }> = ({ entityId }) => {
  return <EntityConfidenceDisplay entityId={entityId} size="sm" />;
};

export default EntityConfidenceDisplay;
