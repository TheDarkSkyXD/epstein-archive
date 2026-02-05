import React, { useState, useEffect, useMemo } from 'react';
import Icon from '../common/Icon';
import { Link } from 'react-router-dom';

interface EvidenceItem {
  id: number;
  type: string;
  title: string;
  description: string;
  source_path: string;
  red_flag_rating: number;
  relevance: string;
  added_at: string;
  added_by: string;
  notes: string;
}

interface EvidenceByType {
  all: EvidenceItem[];
  byType: Record<string, EvidenceItem[]>;
  counts: Record<string, number>;
  total: number;
}

interface InvestigationCaseFolderProps {
  investigationId: number | string;
  onEvidenceClick?: (evidence: EvidenceItem) => void;
}

const typeConfig: Record<string, { icon: string; label: string; color: string }> = {
  entity: { icon: 'User', label: 'Entities', color: 'cyan' },
  document: { icon: 'FileText', label: 'Documents', color: 'blue' },
  flight_log: { icon: 'Navigation', label: 'Flights', color: 'purple' },
  property_record: { icon: 'Building', label: 'Properties', color: 'emerald' },
  email: { icon: 'Mail', label: 'Emails', color: 'amber' },
  testimony: { icon: 'MessageSquare', label: 'Testimonies', color: 'pink' },
  financial: { icon: 'DollarSign', label: 'Financial', color: 'green' },
  legal: { icon: 'Scale', label: 'Legal', color: 'red' },
  photo: { icon: 'Image', label: 'Photos', color: 'indigo' },
  other: { icon: 'File', label: 'Other', color: 'slate' },
};

const relevanceColors: Record<string, string> = {
  high: 'bg-red-500/20 text-red-300 border-red-500/30',
  medium: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30',
  low: 'bg-green-500/20 text-green-300 border-green-500/30',
};

export const InvestigationCaseFolder: React.FC<InvestigationCaseFolderProps> = ({
  investigationId,
  onEvidenceClick,
}) => {
  const [evidence, setEvidence] = useState<EvidenceByType | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [relevanceFilter, setRelevanceFilter] = useState<string | null>(null);

  useEffect(() => {
    const fetchEvidence = async () => {
      try {
        setLoading(true);
        const res = await fetch(`/api/investigations/${investigationId}/evidence-by-type`);
        if (!res.ok) throw new Error('Failed to fetch evidence');
        const data = await res.json();
        setEvidence(data);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load evidence');
      } finally {
        setLoading(false);
      }
    };

    fetchEvidence();

    // Listen for new items
    const handleItemAdded = () => setTimeout(fetchEvidence, 500);
    window.addEventListener('investigation-item-added', handleItemAdded);
    return () => window.removeEventListener('investigation-item-added', handleItemAdded);
  }, [investigationId]);

  const filteredEvidence = useMemo(() => {
    if (!evidence) return [];

    let items = selectedType ? evidence.byType[selectedType] || [] : evidence.all;

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      items = items.filter(
        (e) =>
          e.title?.toLowerCase().includes(term) ||
          e.description?.toLowerCase().includes(term) ||
          e.notes?.toLowerCase().includes(term),
      );
    }

    if (relevanceFilter) {
      items = items.filter((e) => e.relevance === relevanceFilter);
    }

    return items;
  }, [evidence, selectedType, searchTerm, relevanceFilter]);

  const getSourceLink = (item: EvidenceItem): string | null => {
    const [type, id] = (item.source_path || '').split(':');
    if (type === 'entity' && id) return `/entity/${id}`;
    if (type === 'document' && id) return `/documents/${id}`;
    if (type === 'flight' && id) return `/flights?id=${id}`;
    if (type === 'property' && id) return `/properties?id=${id}`;
    if (type === 'email' && id) return `/emails?id=${id}`;
    return null;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-400" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8 text-red-400">
        <Icon name="AlertCircle" size="lg" className="mx-auto mb-2" />
        <p>{error}</p>
      </div>
    );
  }

  if (!evidence || evidence.total === 0) {
    return (
      <div className="text-center py-12 text-slate-400">
        <Icon name="FolderOpen" size="xl" className="mx-auto mb-3 opacity-50" />
        <h3 className="text-lg font-medium text-slate-300 mb-2">Case Folder is Empty</h3>
        <p className="text-sm">
          Add evidence from Subjects, Documents, Flights, Properties, or Emails
          <br />
          using the "Add to Investigation" button.
        </p>
      </div>
    );
  }

  const types = Object.keys(evidence.byType);

  return (
    <div className="case-folder space-y-6">
      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
        {/* All Evidence */}
        <button
          onClick={() => setSelectedType(null)}
          className={`p-4 rounded-lg border transition-all ${
            selectedType === null
              ? 'bg-cyan-600/20 border-cyan-500/50 ring-2 ring-cyan-500/30'
              : 'bg-slate-800/50 border-slate-700 hover:border-slate-600'
          }`}
        >
          <Icon name="Folder" size="md" className="mx-auto mb-2 text-cyan-400" />
          <div className="text-2xl font-bold text-white">{evidence.total}</div>
          <div className="text-xs text-slate-400">All Evidence</div>
        </button>

        {/* Type Cards */}
        {types.map((type) => {
          const config = typeConfig[type] || typeConfig.other;
          const count = evidence.counts[type] || 0;
          return (
            <button
              key={type}
              onClick={() => setSelectedType(type === selectedType ? null : type)}
              className={`p-4 rounded-lg border transition-all ${
                selectedType === type
                  ? `bg-${config.color}-600/20 border-${config.color}-500/50 ring-2 ring-${config.color}-500/30`
                  : 'bg-slate-800/50 border-slate-700 hover:border-slate-600'
              }`}
            >
              <Icon
                name={config.icon as any}
                size="md"
                className={`mx-auto mb-2 text-${config.color}-400`}
              />
              <div className="text-2xl font-bold text-white">{count}</div>
              <div className="text-xs text-slate-400">{config.label}</div>
            </button>
          );
        })}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 p-4 bg-slate-800/30 rounded-lg">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px]">
          <Icon
            name="Search"
            size="sm"
            className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500"
          />
          <input
            type="text"
            placeholder="Search evidence..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-900/50 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
          />
        </div>

        {/* Relevance Filter */}
        <div className="flex items-center gap-2">
          <span className="text-sm text-slate-400">Relevance:</span>
          {['high', 'medium', 'low'].map((rel) => (
            <button
              key={rel}
              onClick={() => setRelevanceFilter(rel === relevanceFilter ? null : rel)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                relevanceFilter === rel
                  ? relevanceColors[rel]
                  : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-white'
              }`}
            >
              {rel.charAt(0).toUpperCase() + rel.slice(1)}
            </button>
          ))}
        </div>

        {/* Clear Filters */}
        {(searchTerm || relevanceFilter || selectedType) && (
          <button
            onClick={() => {
              setSearchTerm('');
              setRelevanceFilter(null);
              setSelectedType(null);
            }}
            className="px-3 py-1.5 text-xs text-slate-400 hover:text-white"
          >
            Clear Filters
          </button>
        )}
      </div>

      {/* Evidence List */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-white">
            {selectedType ? typeConfig[selectedType]?.label || selectedType : 'All Evidence'}
            <span className="ml-2 text-sm font-normal text-slate-400">
              ({filteredEvidence.length} items)
            </span>
          </h3>
        </div>

        {filteredEvidence.length === 0 ? (
          <div className="text-center py-8 text-slate-400">
            <p>No evidence matches your filters</p>
          </div>
        ) : (
          <div className="grid gap-3">
            {filteredEvidence.map((item) => {
              const config = typeConfig[item.type] || typeConfig.other;
              const link = getSourceLink(item);

              return (
                <div
                  key={item.id}
                  className="p-4 bg-slate-800/50 border border-slate-700 rounded-lg hover:border-slate-600 transition-colors"
                >
                  <div className="flex items-start gap-4">
                    {/* Type Icon */}
                    <div
                      className={`flex-shrink-0 w-10 h-10 rounded-lg bg-${config.color}-900/30 flex items-center justify-center`}
                    >
                      <Icon
                        name={config.icon as any}
                        size="md"
                        className={`text-${config.color}-400`}
                      />
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-medium text-white truncate">{item.title}</h4>
                        <span
                          className={`px-2 py-0.5 text-xs rounded border ${relevanceColors[item.relevance] || 'bg-slate-700 text-slate-300'}`}
                        >
                          {item.relevance}
                        </span>
                        {item.red_flag_rating > 0 && (
                          <span className="flex items-center gap-1 text-xs text-red-400">
                            <Icon name="Flag" size="xs" />
                            {item.red_flag_rating}
                          </span>
                        )}
                      </div>

                      {item.description && (
                        <p className="text-sm text-slate-400 line-clamp-2 mb-2">
                          {item.description}
                        </p>
                      )}

                      {item.notes && (
                        <p className="text-xs text-slate-500 italic mb-2">Note: {item.notes}</p>
                      )}

                      <div className="flex items-center gap-4 text-xs text-slate-500">
                        <span>Added {new Date(item.added_at).toLocaleDateString()}</span>
                        <span>by {item.added_by}</span>
                        {link && (
                          <Link
                            to={link}
                            className="text-cyan-400 hover:text-cyan-300 flex items-center gap-1"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <Icon name="ExternalLink" size="xs" />
                            View Source
                          </Link>
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2">
                      {onEvidenceClick && (
                        <button
                          onClick={() => onEvidenceClick(item)}
                          className="p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition-colors"
                          title="View Details"
                        >
                          <Icon name="Eye" size="sm" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default InvestigationCaseFolder;
