import React, { useState, useEffect } from 'react';
import {
  FileText,
  AlertTriangle,
  Calendar,
  Tag,
  ExternalLink,
  User,
  BarChart3,
  Network,
  Mail,
  MessageCircle,
  Clock3,
} from 'lucide-react';
import { apiClient } from '../services/apiClient';

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

interface RelationEvidenceEdge {
  id: string;
  subject_entity_id: number;
  object_entity_id: number;
  predicate: string;
  weight: number;
  evidence: {
    id: string;
    document_id: number | null;
    document_title?: string | null;
    quote_text?: string | null;
    confidence?: number | null;
  }[];
}

export const EntityEvidencePanel: React.FC<EntityEvidencePanelProps> = ({
  entityId,
  entityName,
}) => {
  const [evidence, setEvidence] = useState<Evidence[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState<string>('all');
  const [filterRole, setFilterRole] = useState<string>('all');
  const [relationEdges, setRelationEdges] = useState<RelationEvidenceEdge[]>([]);
  const [communications, setCommunications] = useState<
    {
      documentId: string;
      threadId: string;
      subject: string;
      date: string | null;
      from: string;
      to: string[];
      cc: string[];
      topic: string;
      snippet: string;
    }[]
  >([]);

  useEffect(() => {
    loadEntityEvidence();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- loadEntityEvidence is stable and only depends on entityId
  }, [entityId]);

  const loadEntityEvidence = async () => {
    setLoading(true);
    try {
      // Prefer the new entity-centric evidence endpoint backed by mentions/relations.
      const [evidenceRes, relationsRes, commsRes] = await Promise.all([
        fetch(`/api/entities/${entityId}/evidence`),
        fetch(`/api/entities/${entityId}/relations`),
        apiClient.getEntityCommunications(entityId, { limit: 50 }),
      ]);
      const evidenceData = await evidenceRes.json();
      const relationsData = await relationsRes.json();
      setEvidence(evidenceData.evidence || []);
      setStats(evidenceData.stats || null);
      setRelationEdges(Array.isArray(relationsData.relations) ? relationsData.relations : []);
      setCommunications(commsRes.data || []);
    } catch (error) {
      console.error('Error loading entity evidence:', error);
    } finally {
      setLoading(false);
    }
  };

  const getEvidenceTypeLabel = (type: string) => {
    return type
      .split('_')
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ');
  };

  const getRoleColor = (role: string) => {
    const colors: Record<string, string> = {
      sender: 'bg-blue-100 text-blue-800',
      recipient: 'bg-green-100 text-green-800',
      mentioned: 'bg-yellow-100 text-yellow-800',
      passenger: 'bg-purple-100 text-purple-800',
      deponent: 'bg-red-100 text-red-800',
      subject: 'bg-orange-100 text-orange-800',
    };
    return colors[role.toLowerCase()] || 'bg-gray-100 text-gray-800';
  };

  const filteredEvidence = evidence.filter((e) => {
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
        <p className="text-gray-600">No evidence has been linked to {entityName} yet.</p>
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
              <span className="text-sm text-gray-700">
                {getEvidenceTypeLabel(item.evidence_type)}
              </span>
              <div className="flex items-center space-x-3">
                <div className="w-32 bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-blue-500 h-2 rounded-full"
                    style={{ width: `${(item.count / stats.totalEvidence) * 100}%` }}
                  />
                </div>
                <span className="text-sm font-semibold text-gray-700 w-8 text-right">
                  {item.count}
                </span>
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

      {/* Email / Communications Activity */}
      {communications.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-lg p-5">
          <div className="flex items-center space-x-2 mb-4">
            <Mail className="w-5 h-5 text-gray-600" />
            <h3 className="text-lg font-semibold">Email Communications</h3>
          </div>
          <p className="text-sm text-gray-600 mb-3">
            Recent email threads where <span className="font-semibold">{entityName}</span> appears.
            Topics are heuristic but stable labels to help you scan conspiracies at a glance.
          </p>
          <div className="space-y-3 max-h-72 overflow-y-auto">
            {communications.slice(0, 25).map((c) => (
              <div
                key={`${c.threadId}-${c.documentId}`}
                className="border border-gray-200 rounded-lg p-3 hover:bg-gray-50 transition"
              >
                <div className="flex items-start justify-between gap-3 mb-1">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <MessageCircle className="w-4 h-4 text-gray-500" />
                      <span className="text-sm font-semibold text-gray-900 truncate max-w-xs">
                        {c.subject || 'No subject'}
                      </span>
                    </div>
                    <div className="text-xs text-gray-600 flex flex-wrap gap-1">
                      <span className="font-medium">{c.from}</span>
                      <span>→</span>
                      <span className="truncate max-w-[10rem]">
                        {c.to && c.to.length > 0 ? c.to.join(', ') : 'Unknown recipients'}
                      </span>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1 text-xs">
                    {c.date && (
                      <div className="flex items-center gap-1 text-gray-500">
                        <Clock3 className="w-3 h-3" />
                        <span>{c.date}</span>
                      </div>
                    )}
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200 capitalize text-[11px]">
                      <Tag className="w-3 h-3 mr-1" />
                      {c.topic.replace('_', ' ')}
                    </span>
                  </div>
                </div>
                {c.snippet && (
                  <p className="mt-1 text-xs text-gray-600 line-clamp-2">{c.snippet}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Relation Evidence (graph edges with quotes) */}
      {relationEdges.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-lg p-5">
          <div className="flex items-center space-x-2 mb-4">
            <Network className="w-5 h-5 text-gray-600" />
            <h3 className="text-lg font-semibold">Relation Evidence</h3>
          </div>
          <div className="space-y-3 max-h-72 overflow-y-auto">
            {relationEdges.slice(0, 25).map((rel) => (
              <div key={rel.id} className="border border-gray-200 rounded-lg p-3">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-semibold text-gray-800">
                    {rel.predicate || 'related_to'}
                  </span>
                  <span className="text-xs text-gray-500">weight {rel.weight ?? 1}</span>
                </div>
                {rel.evidence && rel.evidence.length > 0 && (
                  <ul className="mt-1 space-y-1">
                    {rel.evidence.slice(0, 3).map((ev) => (
                      <li key={ev.id} className="text-xs text-gray-600">
                        {ev.document_title && (
                          <span className="font-medium text-gray-800">{ev.document_title}</span>
                        )}
                        {ev.quote_text && (
                          <span className="block text-gray-500 italic truncate">
                            “{ev.quote_text}”
                          </span>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
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
          {filteredEvidence.map((item) => (
            <div
              key={item.id}
              className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition"
            >
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
                      <span className="text-xs font-semibold text-red-600">
                        {item.red_flag_rating}
                      </span>
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
