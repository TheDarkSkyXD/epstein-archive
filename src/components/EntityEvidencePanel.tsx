import React, { useState, useEffect } from 'react';
import { 
  FileText, 
  AlertTriangle, 
  Calendar,
  Tag,
  ExternalLink,
  User,
  BarChart3,
  TrendingUp,
  Network
} from 'lucide-react';

interface Evidence {
  id: number;
  evidence_type: string;
  title: string;
  description: string;
  source_path: string;
  cleaned_path: string;
  red_flag_rating: number;
  created_at: string;
  role: string;
  confidence: number;
  context_snippet: string;
}

interface RelatedEntity {
  id: number;
  full_name: string;
  entity_category: string;
  shared_evidence_count: number;
}

interface EntityEvidencePanelProps {
  entityId: string;
  entityName: string;
}

export const EntityEvidencePanel: React.FC<EntityEvidencePanelProps> = ({
  entityId,
  entityName
}) => {
  const [evidence, setEvidence] = useState<Evidence[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState<string>('all');
  const [filterRole, setFilterRole] = useState<string>('all');

  useEffect(() => {
    loadEntityEvidence();
  }, [entityId]);

  const loadEntityEvidence = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/investigation/evidence/${entityId}`);
      const data = await response.json();
      setEvidence(data.evidence || []);
      setStats(data.stats || null);
    } catch (error) {
      console.error('Error loading entity evidence:', error);
    } finally {
      setLoading(false);
    }
  };

  const getEvidenceTypeLabel = (type: string) => {
    return type.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
  };

  const getRoleColor = (role: string) => {
    const colors: Record<string, string> = {
      sender: 'bg-blue-100 text-blue-800',
      recipient: 'bg-green-100 text-green-800',
      mentioned: 'bg-yellow-100 text-yellow-800',
      passenger: 'bg-purple-100 text-purple-800',
      deponent: 'bg-red-100 text-red-800',
      subject: 'bg-orange-100 text-orange-800'
    };
    return colors[role.toLowerCase()] || 'bg-gray-100 text-gray-800';
  };

  const filteredEvidence = evidence.filter(e => {
    const matchesType = filterType === 'all' || e.evidence_type === filterType;
    const matchesRole = filterRole === 'all' || e.role === filterRole;
    return matchesType && matchesRole;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-gray-500">Loading evidence...</div>
      </div>
    );
  }

  if (!stats || evidence.length === 0) {
    return (
      <div className="bg-gray-50 rounded-lg p-8 text-center">
        <FileText className="w-12 h-12 text-gray-400 mx-auto mb-3" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">No Evidence Found</h3>
        <p className="text-gray-600">
          No evidence has been linked to {entityName} yet.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="text-sm text-gray-600 mb-1">Total Evidence</div>
          <div className="text-2xl font-bold text-blue-600">{stats.totalEvidence}</div>
        </div>
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="text-sm text-gray-600 mb-1">High Risk Items</div>
          <div className="text-2xl font-bold text-red-600">{stats.highRiskCount}</div>
        </div>
        <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
          <div className="text-sm text-gray-600 mb-1">Avg Confidence</div>
          <div className="text-2xl font-bold text-purple-600">
            {Math.round(stats.averageConfidence * 100)}%
          </div>
        </div>
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="text-sm text-gray-600 mb-1">Evidence Types</div>
          <div className="text-2xl font-bold text-green-600">{stats.typeBreakdown.length}</div>
        </div>
      </div>

      {/* Type Breakdown */}
      <div className="bg-white border border-gray-200 rounded-lg p-5">
        <div className="flex items-center space-x-2 mb-4">
          <BarChart3 className="w-5 h-5 text-gray-600" />
          <h3 className="text-lg font-semibold">Evidence Type Distribution</h3>
        </div>
        <div className="space-y-2">
          {stats.typeBreakdown.map((item: any) => (
            <div key={item.evidence_type} className="flex items-center justify-between">
              <span className="text-sm text-gray-700">{getEvidenceTypeLabel(item.evidence_type)}</span>
              <div className="flex items-center space-x-3">
                <div className="w-32 bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-blue-500 h-2 rounded-full"
                    style={{ width: `${(item.count / stats.totalEvidence) * 100}%` }}
                  />
                </div>
                <span className="text-sm font-semibold text-gray-700 w-8 text-right">{item.count}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Role Breakdown */}
      {stats.roleBreakdown.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-lg p-5">
          <div className="flex items-center space-x-2 mb-4">
            <User className="w-5 h-5 text-gray-600" />
            <h3 className="text-lg font-semibold">Role Distribution</h3>
          </div>
          <div className="flex flex-wrap gap-2">
            {stats.roleBreakdown.map((item: any) => (
              <span 
                key={item.role}
                className={`px-3 py-1 text-sm rounded-full ${getRoleColor(item.role)}`}
              >
                {item.role}: {item.count}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Related Entities */}
      {stats.relatedEntities.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-lg p-5">
          <div className="flex items-center space-x-2 mb-4">
            <Network className="w-5 h-5 text-gray-600" />
            <h3 className="text-lg font-semibold">Frequently Co-appears With</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {stats.relatedEntities.slice(0, 10).map((entity: RelatedEntity) => (
              <a
                key={entity.id}
                href={`/entity/${entity.id}`}
                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition"
              >
                <span className="text-sm font-medium text-gray-900">{entity.full_name}</span>
                <span className="text-xs font-semibold text-blue-600">
                  {entity.shared_evidence_count} shared
                </span>
              </a>
            ))}
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white border border-gray-200 rounded-lg p-5">
        <div className="flex items-center space-x-3 mb-4">
          <h3 className="text-lg font-semibold">Evidence Items</h3>
          <span className="text-sm text-gray-500">({filteredEvidence.length})</span>
        </div>
        <div className="flex items-center space-x-3 mb-4">
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
          >
            <option value="all">All Types</option>
            {stats.typeBreakdown.map((item: any) => (
              <option key={item.evidence_type} value={item.evidence_type}>
                {getEvidenceTypeLabel(item.evidence_type)}
              </option>
            ))}
          </select>
          <select
            value={filterRole}
            onChange={(e) => setFilterRole(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
          >
            <option value="all">All Roles</option>
            {stats.roleBreakdown.map((item: any) => (
              <option key={item.role} value={item.role}>
                {item.role}
              </option>
            ))}
          </select>
        </div>

        {/* Evidence List */}
        <div className="space-y-3">
          {filteredEvidence.map(item => (
            <div key={item.id} className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition">
              <div className="flex items-start justify-between mb-2">
                <div className="flex-1">
                  <div className="flex items-center space-x-2 mb-1">
                    <FileText className="w-4 h-4 text-gray-400" />
                    <h4 className="font-semibold text-gray-900">{item.title || 'Untitled'}</h4>
                  </div>
                  {item.description && (
                    <p className="text-sm text-gray-600 line-clamp-2 mb-2">{item.description}</p>
                  )}
                  {item.context_snippet && (
                    <p className="text-xs text-gray-500 italic bg-yellow-50 p-2 rounded border-l-2 border-yellow-400">
                      "{item.context_snippet}"
                    </p>
                  )}
                </div>
                <div className="flex flex-col items-end space-y-1 ml-4">
                  {item.role && (
                    <span className={`text-xs px-2 py-1 rounded ${getRoleColor(item.role)}`}>
                      {item.role}
                    </span>
                  )}
                  {item.red_flag_rating > 0 && (
                    <div className="flex items-center space-x-1">
                      <AlertTriangle className="w-4 h-4 text-red-500" />
                      <span className="text-xs font-semibold text-red-600">{item.red_flag_rating}</span>
                    </div>
                  )}
                  {item.confidence && (
                    <span className="text-xs text-gray-500">
                      {Math.round(item.confidence * 100)}% conf
                    </span>
                  )}
                </div>
              </div>
              <div className="flex items-center justify-between text-xs text-gray-500 pt-2 border-t border-gray-100">
                <div className="flex items-center space-x-3">
                  <span className="flex items-center space-x-1">
                    <Tag className="w-3 h-3" />
                    <span>{getEvidenceTypeLabel(item.evidence_type)}</span>
                  </span>
                  <span className="flex items-center space-x-1">
                    <Calendar className="w-3 h-3" />
                    <span>{new Date(item.created_at).toLocaleDateString()}</span>
                  </span>
                </div>
                <a
                  href={`/evidence/${item.id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center space-x-1 text-blue-600 hover:text-blue-800"
                >
                  <span>View</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
