import React, { useState, useEffect } from 'react';
import {
  Investigation,
  EvidenceItem,
  TimelineEvent,
  Annotation,
  Investigator,
} from '../types/investigation';
import { EvidenceChainService } from '../services/evidenceChainService';
import {
  Calendar,
  User,
  ArrowRight,
  Search,
  Download,
  Plus,
  Users,
  Target,
  FileText,
  BarChart3,
  Share2,
  Microscope,
  Network,
  DollarSign,
} from 'lucide-react';
import FinancialTransactionMapper from './FinancialTransactionMapper';
// Removed unused ChainOfCustodyModal import
import { NetworkVisualization, NetworkNode, NetworkEdge } from './NetworkVisualization';
import { InvestigationTimelineBuilder } from './InvestigationTimelineBuilder';
import { InvestigationExportTools } from './InvestigationExportTools';
import { ForensicAnalysisWorkspace } from './ForensicAnalysisWorkspace';
import { useInvestigationOnboarding } from '../hooks/useInvestigationOnboarding';
import { InvestigationOnboarding } from './InvestigationOnboarding';
import { useLocation, useNavigate } from 'react-router-dom';
import { DataIntegrityPanel } from './DataIntegrityPanel';
import { EvidencePacketExporter } from './EvidencePacketExporter';
import { InvestigationEvidencePanel } from './InvestigationEvidencePanel';
import { EvidenceNotebook } from './EvidenceNotebook';
import { HypothesisTestingFramework } from './HypothesisTestingFramework';
import { InvestigationTeamManagement } from './InvestigationTeamManagement';
import { AddToInvestigationButton } from './AddToInvestigationButton';
import { useToasts } from './ToastProvider';
import { CreateRelationshipModal } from './CreateRelationshipModal';

interface InvestigationWorkspaceProps {
  investigationId?: string;
  onInvestigationSelect?: (investigation: Investigation) => void;
  currentUser: Investigator;
}

export const InvestigationWorkspace: React.FC<InvestigationWorkspaceProps> = ({
  investigationId,
  onInvestigationSelect,
  currentUser,
}) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { addToast } = useToasts();

  const [investigations, setInvestigations] = useState<Investigation[]>([]);
  const [selectedInvestigation, setSelectedInvestigation] = useState<Investigation | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showNewInvestigationModal, setShowNewInvestigationModal] = useState(false);
  const [showCreateRelationshipModal, setShowCreateRelationshipModal] = useState(false);
  const [newInvestigation, setNewInvestigation] = useState({
    title: '',
    description: '',
    hypothesis: '',
    priority: 'medium' as const,
    dueDate: '',
  });
  const [timelineEvents, setTimelineEvents] = useState<TimelineEvent[]>([]);
  const [evidenceItems, setEvidenceItems] = useState<EvidenceItem[]>([]);
  const [hypotheses, setHypotheses] = useState<any[]>([]);
  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  const [evidenceLoading, setEvidenceLoading] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [selectedNetworkNode, setSelectedNetworkNode] = useState<NetworkNode | null>(null);
  const [selectedNetworkEdge, setSelectedNetworkEdge] = useState<NetworkEdge | null>(null);
  const [networkNodes, setNetworkNodes] = useState<NetworkNode[]>([]);
  const [networkEdges, setNetworkEdges] = useState<NetworkEdge[]>([]);
  const [dbStats, setDbStats] = useState({
    totalEntities: 0,
    totalDocuments: 0,
    entitiesWithDocuments: 0,
    documentsWithMetadata: 0,
  });
  const [shareCopied, setShareCopied] = useState(false);
  const [useGlobalContext, setUseGlobalContext] = useState(false);

  // Determine active tab from URL
  type ActiveTab =
    | 'overview'
    | 'evidence'
    | 'hypotheses'
    | 'financial'
    | 'timeline'
    | 'team'
    | 'analytics'
    | 'forensic'
    | 'export';

  const getActiveTab = (): ActiveTab => {
    const params = new URLSearchParams(location.search);
    const tab = params.get('tab') as ActiveTab | null;
    const did = params.get('docId');

    if (did) return 'forensic'; // Special handling for docId
    if (
      tab &&
      [
        'overview',
        'evidence',
        'hypotheses',
        'financial',
        'timeline',
        'team',
        'analytics',
        'forensic',
        'export',
      ].includes(tab)
    ) {
      return tab;
    }
    return 'overview'; // default
  };

  const activeTab = getActiveTab();

  // Navigate to a tab
  const navigateToTab = (tab: string) => {
    const params = new URLSearchParams(location.search);
    params.set('tab', tab);
    navigate(`${location.pathname}?${params.toString()}`);
  };

  // Copy shareable URL to clipboard
  const copyShareUrl = () => {
    if (selectedInvestigation) {
      // Use uuid if available (format: maxwell-epstein-network-001), otherwise use id
      const shareId = (selectedInvestigation as any).uuid || selectedInvestigation.id;
      const shareUrl = `${window.location.origin}/investigations/${shareId}`;
      navigator.clipboard.writeText(shareUrl).then(() => {
        setShareCopied(true);
        setTimeout(() => setShareCopied(false), 2000);
      });
    }
  };
  // Handle special URL parameters (focus on entity)
  useEffect(() => {
    try {
      const params = new URLSearchParams(location.search);
      const focusId = params.get('focus');

      if (focusId) {
        // If focusing on an entity, ensure we're on the analytics tab
        const tab = params.get('tab');
        if (!tab) {
          navigateToTab('analytics');
        }

        // Fetch validity of the ID and get details
        fetch(`/api/entities/${focusId}`)
          .then((res) => res.json())
          .then((entity) => {
            if (entity && !entity.error) {
              const node: NetworkNode = {
                id: String(entity.id),
                type:
                  entity.entity_type === 'ORGANIZATION'
                    ? 'organization'
                    : entity.entity_type === 'LOCATION'
                      ? 'location'
                      : 'person',
                label: entity.full_name,
                description: entity.primary_role || entity.title || 'Person of Interest',
                importance: entity.red_flag_rating || 0,
                metadata: {
                  mentions: entity.mentions || 0,
                  riskLevel:
                    (entity.red_flag_rating || 0) >= 5
                      ? 'critical'
                      : (entity.red_flag_rating || 0) >= 4
                        ? 'high'
                        : (entity.red_flag_rating || 0) >= 2
                          ? 'medium'
                          : 'low',
                  category: entity.primary_role || entity.title || 'Person of Interest',
                  documents: [],
                  connections: [],
                },
              };
              setSelectedNetworkNode(node);
            }
          })
          .catch((err) => console.error('Error fetching focused entity:', err));
      }

      // Auto-select first investigation if needed
      if (!selectedInvestigation && investigations.length > 0) {
        setSelectedInvestigation(investigations[0]);
      }
    } catch (error) {
      console.error('Error parsing URL parameters:', error);
    }
  }, [location.search, investigations.length, selectedInvestigation]);

  // Handle "Add to Investigation" custom event
  useEffect(() => {
    const handleAddToInvestigation = async (event: CustomEvent) => {
      const { investigationId, item, relevance } = event.detail;

      // If no investigation ID provided, use the currently selected one if available
      const targetInvestigationId = investigationId || selectedInvestigation?.id;

      if (!targetInvestigationId) {
        // Prompt user to select investigation or create new one (could be improved)
        addToast({ text: 'Please select an investigation first.', type: 'error' });
        return;
      }

      try {
        const response = await fetch(`/api/investigations/${targetInvestigationId}/evidence`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: item.title,
            description: item.description,
            type: item.type,
            sourceId: item.sourceId,
            documentId: item.sourceId, // Assuming sourceId is documentId for documents
            relevance: relevance || 'high',
          }),
        });

        if (response.ok) {
          // If we are currently viewing this investigation, refresh evidence
          if (selectedInvestigation?.id === targetInvestigationId) {
            const ev = await fetch(`/api/investigations/${targetInvestigationId}/evidence`).then(
              (r) => r.json(),
            );
            setEvidenceItems(
              ev.map((row: any) => ({
                id: String(row.id),
                title: row.title,
                description: row.description || '',
                type: 'document',
                sourceId: String(row.document_id || ''),
                source: '',
                relevance: row.relevance || 'high',
                credibility: row.credibility || 'verified',
                extractedAt: new Date(row.extracted_at),
                extractedBy: row.extracted_by || 'system',
              })),
            );
            addToast({ text: 'Item added to investigation successfully.', type: 'success' });
          } else {
            addToast({ text: 'Item added to investigation successfully.', type: 'success' });
          }
        } else {
          console.error('Failed to add item to investigation');
          addToast({ text: 'Failed to add item to investigation.', type: 'error' });
        }
      } catch (error) {
        console.error('Error adding to investigation:', error);
        addToast({ text: 'Error adding item to investigation.', type: 'error' });
      }
    };

    window.addEventListener('add-to-investigation' as any, handleAddToInvestigation as any);
    return () => {
      window.removeEventListener('add-to-investigation' as any, handleAddToInvestigation as any);
    };
  }, [selectedInvestigation]);

  // Investigation onboarding hook
  const { hasSeenOnboarding, markOnboardingAsSeen } = useInvestigationOnboarding();

  useEffect(() => {
    loadInvestigations();
  }, []);

  useEffect(() => {
    const fetchEvidence = async () => {
      if (!selectedInvestigation) return;
      try {
        setEvidenceLoading(true);
        const ev = await fetch(`/api/investigations/${selectedInvestigation.id}/evidence`).then(
          (r) => r.json(),
        );
        setEvidenceItems(
          ev.map((row: any) => ({
            id: String(row.id),
            title: row.title,
            description: row.description || '',
            type: 'document',
            sourceId: String(row.document_id || ''),
            source: '',
            relevance: row.relevance || 'high',
            credibility: row.credibility || 'verified',
            extractedAt: new Date(row.extracted_at),
            extractedBy: row.extracted_by || 'system',
          })),
        );
      } catch (error) {
        console.error('Error fetching evidence:', error);
      } finally {
        setEvidenceLoading(false);
      }
    };
    fetchEvidence();
  }, [selectedInvestigation?.id]);

  useEffect(() => {
    if (investigationId) {
      loadInvestigation(investigationId);
    }
  }, [investigationId]);

  // Fetch real network data and database stats
  useEffect(() => {
    const fetchNetworkData = async () => {
      try {
        let entities: any[] = [];

        if (useGlobalContext) {
          // Fetch top global entities
          const entitiesResp = await fetch(
            '/api/entities?limit=100&sortBy=red_flag_rating&sortOrder=desc',
          );
          const entitiesData = await entitiesResp.json();
          entities = entitiesData.data || [];
        } else {
          // Fetch entities scoped to investigation evidence
          // Filter evidenceItems for entities
          const entityEvidence = evidenceItems.filter(
            (e) => e.type === 'entity' || e.type === 'person' || e.type === 'organization',
          );

          if (entityEvidence.length > 0) {
            // Fetch details for each entity
            const entityPromises = entityEvidence.map((e) =>
              fetch(`/api/entities/${e.sourceId}`).then((r) => (r.ok ? r.json() : null)),
            );
            const results = await Promise.all(entityPromises);
            entities = results.filter((e) => e !== null);
          }
        }

        // Transform entities to network nodes
        const nodes: NetworkNode[] = entities.map((e: any) => ({
          id: String(e.id),
          type:
            e.entity_type === 'ORGANIZATION'
              ? 'organization'
              : e.entity_type === 'LOCATION'
                ? 'location'
                : 'person',
          label: e.full_name,
          description: e.primary_role || e.title || 'Person of Interest',
          importance: e.red_flag_rating || 0,
          metadata: {
            mentions: e.mentions || 0,
            riskLevel:
              (e.red_flag_rating || 0) >= 5
                ? 'critical'
                : (e.red_flag_rating || 0) >= 4
                  ? 'high'
                  : (e.red_flag_rating || 0) >= 2
                    ? 'medium'
                    : 'low',
            category: e.primary_role || e.title || 'Person of Interest',
            documents: [],
            connections: [],
          },
        }));

        // Fetch real relationships for nodes
        const edges: NetworkEdge[] = [];
        // Limit to top nodes to prevent exploding requests if list is huge
        const nodeIds = nodes.slice(0, 20).map((n) => n.id);

        for (const entityId of nodeIds) {
          try {
            const relResp = await fetch(`/api/relationships?entityId=${entityId}&limit=5`);
            const relData = await relResp.json();
            const relationships = relData.relationships || [];

            for (const rel of relationships) {
              const targetId = String(rel.related_entity_id || rel.entity_id);
              // Only add edge if target is in our nodes list
              if (
                nodes.some((n) => n.id === targetId) &&
                !edges.some(
                  (e) =>
                    (e.source === entityId && e.target === targetId) ||
                    (e.source === targetId && e.target === entityId),
                )
              ) {
                edges.push({
                  id: `edge-${entityId}-${targetId}`,
                  source: entityId,
                  target: targetId,
                  type: 'connection',
                  strength: Math.min(10, rel.weight || rel.strength || 5),
                  direction: 'bidirectional',
                  metadata: {
                    frequency: rel.co_occurrences || rel.frequency || 0,
                    context: rel.relationship_type || 'Document co-occurrence',
                    confidence: rel.confidence || 0.8,
                    dates: [],
                    evidence: [],
                  },
                });
              }
            }
          } catch (relError) {
            // Skip this entity's relationships on error
          }
        }

        setNetworkNodes(nodes);
        setNetworkEdges(edges);

        // Fetch database stats
        const statsResp = await fetch('/api/stats');
        const stats = await statsResp.json();
        setDbStats({
          totalEntities: stats.totalEntities || 0,
          totalDocuments: stats.totalDocuments || 0,
          entitiesWithDocuments: stats.entitiesWithDocuments || 0,
          documentsWithMetadata: stats.documentsWithMetadata || 0,
        });
      } catch (error) {
        console.error('Error fetching network data:', error);
        // Set empty arrays on error - no mock data
        setNetworkNodes([]);
        setNetworkEdges([]);
      }
    };

    if (selectedInvestigation) {
      fetchNetworkData();
    }
  }, [selectedInvestigation?.id, evidenceItems, useGlobalContext]);

  const loadInvestigations = async () => {
    setIsLoading(true);
    try {
      const resp = await fetch('/api/investigations');
      const data = await resp.json();
      const mapped: Investigation[] = (data.data || []).map((inv: any) => ({
        id: String(inv.id),
        title: inv.title,
        description: inv.description || '',
        hypothesis: inv.scope || '',
        status:
          inv.status === 'open'
            ? 'active'
            : inv.status === 'in_review'
              ? 'review'
              : inv.status === 'closed'
                ? 'published'
                : 'archived',
        createdAt: new Date(inv.created_at),
        updatedAt: new Date(inv.updated_at),
        team: inv.team || [
          {
            id: inv.owner_id,
            name: inv.owner_name || 'Investigation Owner',
            email: inv.owner_email || '',
            role: 'lead',
            permissions: ['read', 'write', 'admin'],
            joinedAt: new Date(inv.created_at),
            organization: inv.owner_organization || '',
            expertise: [],
          },
        ],
        leadInvestigator: inv.owner_id,
        permissions: [],
        tags: [],
        priority: 'medium',
        uuid: inv.uuid, // Include UUID for shareable links
      }));
      setInvestigations(mapped);
    } catch (error) {
      console.error('Error loading investigations:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadInvestigation = async (id: string) => {
    setIsLoading(true);
    try {
      const resp = await fetch(`/api/investigations/${id}`);
      if (resp.ok) {
        const inv = await resp.json();
        const investigation: Investigation = {
          id: String(inv.id),
          title: inv.title,
          description: inv.description || '',
          hypothesis: inv.scope || '',
          status:
            inv.status === 'open'
              ? 'active'
              : inv.status === 'in_review'
                ? 'review'
                : inv.status === 'closed'
                  ? 'published'
                  : 'archived',
          createdAt: new Date(inv.created_at),
          updatedAt: new Date(inv.updated_at),
          team: [
            {
              id: inv.owner_id,
              name: inv.owner_name || 'Investigation Creator',
              email: inv.owner_email || '',
              role: 'lead',
              permissions: ['read', 'write', 'admin'],
              joinedAt: new Date(inv.created_at),
              organization: inv.owner_organization || '',
              expertise: [],
            },
          ],
          leadInvestigator: inv.owner_id,
          permissions: [],
          tags: [],
          priority: 'medium',
          uuid: inv.uuid, // Include UUID for shareable links
        } as Investigation & { uuid?: string };
        setSelectedInvestigation(investigation);

        // Update URL to shareable investigation path
        const shareId = inv.uuid || inv.id;
        navigate(`/investigations/${shareId}`, { replace: true });

        // Fetch timeline events
        try {
          const timelineResp = await fetch(`/api/investigations/${id}/timeline-events`);
          if (timelineResp.ok) {
            const timelineData = await timelineResp.json();
            const events = timelineData.map((e: any) => ({
              id: String(e.id),
              title: e.title,
              date: e.start_date, // Assuming backend returns start_date
              description: e.description || '',
              type: e.type,
              confidence: e.confidence || 'medium', // Default to medium if not present
              relatedEntities: JSON.parse(e.entities_json || '[]'),
              relatedDocuments: JSON.parse(e.documents_json || '[]'),
            }));
            setTimelineEvents(events);
          }
        } catch (err) {
          console.error('Error fetching timeline events:', err);
        }

        if (onInvestigationSelect) onInvestigationSelect(investigation);
      }
    } catch (error) {
      console.error('Error loading investigation:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const createInvestigation = async () => {
    if (!newInvestigation.title || !newInvestigation.description) {
      return;
    }

    setIsLoading(true);
    try {
      const resp = await fetch('/api/investigations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: newInvestigation.title,
          description: newInvestigation.description,
          ownerId: currentUser.id,
          scope: newInvestigation.hypothesis,
        }),
      });
      const inv = await resp.json();
      await loadInvestigations();
      setSelectedInvestigation({
        id: String(inv.id),
        title: inv.title,
        description: inv.description || '',
        hypothesis: inv.scope || '',
        status:
          inv.status === 'open'
            ? 'active'
            : inv.status === 'in_review'
              ? 'review'
              : inv.status === 'closed'
                ? 'published'
                : 'archived',
        createdAt: new Date(inv.created_at),
        updatedAt: new Date(inv.updated_at),
        team: [
          {
            id: currentUser.id,
            name: currentUser.name || 'Current User',
            email: currentUser.email || '',
            role: 'lead',
            permissions: ['read', 'write', 'admin'],
            joinedAt: new Date(inv.created_at),
            organization: currentUser.organization || '',
            expertise: currentUser.expertise || [],
            status: 'active',
          },
        ],
        leadInvestigator: currentUser.id,
        permissions: [],
        tags: [],
        priority: 'medium',
      });
      setShowNewInvestigationModal(false);
      setNewInvestigation({
        title: '',
        description: '',
        hypothesis: '',
        priority: 'medium',
        dueDate: '',
      });
    } catch (error) {
      console.error('Error creating investigation:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusColor = (status: Investigation['status']) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800';
      case 'review':
        return 'bg-yellow-100 text-yellow-800';
      case 'published':
        return 'bg-blue-100 text-blue-800';
      case 'archived':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getPriorityColor = (priority: Investigation['priority']) => {
    switch (priority) {
      case 'critical':
        return 'bg-red-100 text-red-800';
      case 'high':
        return 'bg-orange-100 text-orange-800';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800';
      case 'low':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const deleteTimelineEvent = async (eventId: string) => {
    if (!selectedInvestigation) return;
    try {
      await fetch(`/api/investigations/${selectedInvestigation.id}/timeline-events/${eventId}`, {
        method: 'DELETE',
      });
      // Refresh
      const timelineResp = await fetch(
        `/api/investigations/${selectedInvestigation.id}/timeline-events`,
      );
      if (timelineResp.ok) {
        const timelineData = await timelineResp.json();
        const events = timelineData.map((e: any) => ({
          id: String(e.id),
          title: e.title,
          startDate: new Date(e.start_date),
          description: e.description || '',
          type: e.type,
          confidence: e.confidence || 80,
          documents: JSON.parse(e.documents_json || '[]'),
          hypothesisIds: [], // Add if schema supports
          entities: JSON.parse(e.entities_json || '[]'),
          evidence: [],
          importance: 'medium',
          tags: [],
          sources: [],
          createdBy: 'system',
          updatedAt: new Date(),
        }));
        setTimelineEvents(events);
      }
    } catch (e) {
      console.error('Error deleting event:', e);
    }
  };

  const saveTimelineEvent = async (event: Partial<TimelineEvent>) => {
    if (!selectedInvestigation) return;
    try {
      const isNew = !event.id || event.id.startsWith('event-');
      const url = isNew
        ? `/api/investigations/${selectedInvestigation.id}/timeline-events`
        : `/api/investigations/${selectedInvestigation.id}/timeline-events/${event.id}`;

      const method = isNew ? 'POST' : 'PATCH';

      await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: event.title,
          description: event.description,
          type: event.type,
          startDate: event.startDate?.toISOString(),
          confidence: event.confidence,
          documents: event.documents,
          entities: event.entities,
        }),
      });

      // Refresh
      const timelineResp = await fetch(
        `/api/investigations/${selectedInvestigation.id}/timeline-events`,
      );
      if (timelineResp.ok) {
        const timelineData = await timelineResp.json();
        const events = timelineData.map((e: any) => ({
          id: String(e.id),
          title: e.title,
          startDate: new Date(e.start_date),
          description: e.description || '',
          type: e.type,
          confidence: e.confidence || 80,
          documents: JSON.parse(e.documents_json || '[]'),
          hypothesisIds: [],
          entities: JSON.parse(e.entities_json || '[]'),
          evidence: [],
          importance: 'medium',
          tags: [],
          sources: [],
          createdBy: 'system',
          updatedAt: new Date(),
        }));
        setTimelineEvents(events);
      }
    } catch (e) {
      console.error('Error saving event:', e);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="investigation-workspace liquid-glass-workspace rounded-xl h-[calc(100vh-8rem)] flex flex-col phthalo-gradient-bottom">
      {/* Investigation Onboarding Overlay */}
      {!hasSeenOnboarding && !selectedInvestigation && (
        <InvestigationOnboarding onComplete={markOnboardingAsSeen} onSkip={markOnboardingAsSeen} />
      )}

      {/* Example Investigation Link - REMOVED per user request */}

      {/* Header */}
      <div className="border-b border-slate-700 px-6 py-4 shrink-0">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-white">Investigation Workspace</h2>
            <p className="text-sm text-slate-400 mt-1">
              Collaborative investigation platform for journalists and researchers
            </p>
          </div>

          <div className="flex items-center gap-4">
            {selectedInvestigation && (
              <div className="flex items-center bg-slate-800 rounded-lg p-1 border border-slate-700">
                <button
                  onClick={() => setUseGlobalContext(false)}
                  className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                    !useGlobalContext
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Investigation Scope
                </button>
                <button
                  onClick={() => setUseGlobalContext(true)}
                  className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                    useGlobalContext
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Global Context
                </button>
              </div>
            )}

            <button
              onClick={() => setShowNewInvestigationModal(true)}
              className="flex items-center justify-center sm:justify-start px-3 sm:px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors shadow-lg shadow-blue-900/20 h-10 whitespace-nowrap"
            >
              <Plus className="w-5 h-5 sm:w-4 sm:h-4 sm:mr-2 shrink-0" />
              <span className="hidden sm:inline">New Investigation</span>
            </button>
          </div>
        </div>
      </div>

      {/* Investigation List */}
      {!selectedInvestigation && (
        <div className="p-6 overflow-y-auto flex-1">
          {investigations.length === 0 ? (
            <div className="text-center py-12 border border-slate-700 rounded-xl bg-slate-800/30">
              <h3 className="text-lg font-medium text-white">No investigations yet</h3>
              <p className="text-slate-400 mt-2">
                Create your first investigation to start building evidence.
              </p>
              <button
                onClick={() => setShowNewInvestigationModal(true)}
                className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
              >
                New Investigation
              </button>
            </div>
          ) : (
            <div className="grid gap-4">
              {investigations.map((investigation) => (
                <div
                  key={investigation.id}
                  className="liquid-glass-card rounded-xl p-4 cursor-pointer group"
                  onClick={() => loadInvestigation(investigation.id)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="text-lg font-medium text-white group-hover:text-blue-400 transition-colors">
                        {investigation.title}
                      </h3>
                      <p className="text-sm text-slate-400 mt-1">{investigation.description}</p>
                      <div className="flex items-center gap-2 mt-3">
                        <span
                          className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(investigation.status)}`}
                        >
                          {investigation.status}
                        </span>
                        <span
                          className={`px-2 py-1 text-xs font-medium rounded-full ${getPriorityColor(investigation.priority)}`}
                        >
                          {investigation.priority} priority
                        </span>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-slate-500">
                        Created {investigation.createdAt.toLocaleDateString()}
                      </p>
                      <p className="text-xs text-slate-500 mt-1">
                        Lead: {investigation.leadInvestigator}
                      </p>
                      {/* Only show delete button for admin/moderator users */}
                      {currentUser.permissions?.includes('admin') && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            if (confirm('Are you sure you want to delete this investigation?')) {
                              // Call API to delete
                              fetch(`/api/investigations/${investigation.id}`, {
                                method: 'DELETE',
                              }).then(() => loadInvestigations());
                            }
                          }}
                          className="mt-2 text-xs text-red-400 hover:text-red-300 hover:underline"
                        >
                          Delete
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Main Layout - Column on mobile, Row on desktop */}
      {selectedInvestigation && (
        <div className="flex flex-1 overflow-hidden flex-col md:flex-row">
          {/* Navigation - Horizontal scroll on mobile, Vertical sidebar on desktop */}
          <div
            className={`
              shrink-0 bg-slate-900/50 backdrop-blur-sm border-b md:border-b-0 md:border-r border-slate-700/50
              md:transition-all md:duration-300
              ${sidebarCollapsed ? 'md:w-16' : 'md:w-64'}
              w-full overflow-x-auto md:overflow-x-visible
            `}
          >
            <div className="p-2 md:p-4 flex md:block items-center md:space-y-0 gap-2 md:gap-0">
              {/* Desktop Expand/Collapse & Back - Hidden on Mobile */}
              <div className="hidden md:flex items-center justify-between mb-6">
                <button
                  onClick={() => setSelectedInvestigation(null)}
                  className={`text-sm text-blue-400 hover:text-blue-300 flex items-center gap-1 transition-colors h-10 px-2 ${sidebarCollapsed ? 'hidden' : ''}`}
                >
                  <ArrowRight className="w-5 h-5 rotate-180" />
                  Back
                </button>
                <button
                  onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                  className="p-2 text-slate-400 hover:text-white transition-colors rounded-md hover:bg-slate-700"
                  title={sidebarCollapsed ? 'Expand menu' : 'Collapse menu'}
                >
                  {sidebarCollapsed ? (
                    <ArrowRight className="w-5 h-5" />
                  ) : (
                    <ArrowRight className="w-5 h-5 rotate-180" />
                  )}
                </button>
              </div>

              {/* Desktop Title - Hidden on Mobile */}
              <div className={`hidden md:block mb-6 px-2 ${sidebarCollapsed ? 'hidden' : ''}`}>
                <h3 className="font-medium text-white truncate" title={selectedInvestigation.title}>
                  {selectedInvestigation.title}
                </h3>
                <button
                  onClick={copyShareUrl}
                  className="mt-2 flex items-center gap-1.5 text-xs text-slate-400 hover:text-blue-400 transition-colors"
                >
                  <Share2 className="w-3.5 h-3.5" />
                  {shareCopied ? 'Copied!' : 'Share'}
                </button>
              </div>

              {/* Mobile Back Button */}
              <button
                onClick={() => setSelectedInvestigation(null)}
                className="md:hidden p-2 text-slate-400 hover:text-white shrink-0 h-10 w-10 flex items-center justify-center rounded-lg hover:bg-slate-800"
              >
                <ArrowRight className="w-5 h-5 rotate-180" />
              </button>

              {/* Mobile Navigation - Horizontal Scrollable Pills */}
              <div className="md:hidden w-full overflow-x-auto border-b border-slate-700/50 bg-slate-900/95 no-scrollbar">
                <div className="flex px-4 py-3 gap-2 min-w-max">
                  {[
                    { id: 'overview', label: 'Overview' },
                    { id: 'evidence', label: 'Evidence' },
                    { id: 'hypotheses', label: 'Hypotheses' },
                    { id: 'notebook', label: 'Notebook' },
                    { id: 'financial', label: 'Financial' },
                    { id: 'timeline', label: 'Timeline' },
                    { id: 'forensic', label: 'Forensic' },
                    { id: 'team', label: 'Team' },
                    { id: 'analytics', label: 'Analytics' },
                    { id: 'export', label: 'Export' },
                  ].map((option) => (
                    <button
                      key={option.id}
                      onClick={() => navigateToTab(option.id)}
                      className={`
                          px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all
                          ${
                            activeTab === option.id
                              ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/30'
                              : 'bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-white border border-slate-700'
                          }
                        `}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Desktop Navigation Sidebar */}
              <nav className="hidden md:block space-y-1 min-w-max p-1">
                {[
                  { id: 'overview', label: 'Overview', icon: Search },
                  { id: 'evidence', label: 'Evidence', icon: FileText },
                  { id: 'hypotheses', label: 'Hypotheses', icon: Target },
                  { id: 'notebook', label: 'Notebook', icon: FileText },
                  { id: 'financial', label: 'Financial', icon: DollarSign },
                  { id: 'timeline', label: 'Timeline', icon: Calendar },
                  { id: 'forensic', label: 'Forensic', icon: Microscope },
                  { id: 'team', label: 'Team', icon: Users },
                  { id: 'analytics', label: 'Analytics', icon: BarChart3 },
                  { id: 'export', label: 'Export', icon: Download },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => navigateToTab(tab.id)}
                    className={`
                        flex items-center px-3 py-3 text-sm font-medium rounded-lg transition-all
                        whitespace-nowrap
                        ${
                          activeTab === tab.id
                            ? 'bg-blue-900/40 text-blue-400 border border-blue-500/30 shadow-sm relative z-10'
                            : 'text-slate-400 hover:bg-slate-700/50 hover:text-slate-200'
                        }
                        ${sidebarCollapsed ? 'justify-center px-2 py-4' : 'w-full'}
                      `}
                    title={tab.label}
                  >
                    <tab.icon
                      className={`${sidebarCollapsed ? 'w-6 h-6 shrink-0' : 'w-5 h-5 mr-3 shrink-0'}`}
                    />
                    <span className={`${sidebarCollapsed ? 'hidden' : 'block'}`}>{tab.label}</span>
                  </button>
                ))}
              </nav>
            </div>
          </div>

          {/* Main Content */}
          <div className="flex-1 p-6 overflow-y-auto bg-slate-900">
            {activeTab === 'overview' && (
              <div className="max-w-4xl">
                <h3 className="text-xl font-bold text-white mb-6">Investigation Overview</h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                  <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-5">
                    <h4 className="text-sm font-medium text-slate-400 mb-3 uppercase tracking-wider">
                      Hypothesis
                    </h4>
                    <p className="text-slate-200 leading-relaxed">
                      {selectedInvestigation.hypothesis}
                    </p>
                  </div>

                  <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-5">
                    <h4 className="text-sm font-medium text-slate-400 mb-3 uppercase tracking-wider">
                      Status & Priority
                    </h4>
                    <div className="space-y-4">
                      <div className="flex items-center gap-3">
                        <span
                          className={`px-3 py-1 text-sm font-medium rounded-full ${getStatusColor(selectedInvestigation.status)}`}
                        >
                          {selectedInvestigation.status}
                        </span>
                        <span
                          className={`px-3 py-1 text-sm font-medium rounded-full ${getPriorityColor(selectedInvestigation.priority)}`}
                        >
                          {selectedInvestigation.priority} priority
                        </span>
                      </div>
                      {selectedInvestigation.dueDate && (
                        <div className="flex items-center gap-2 text-slate-400">
                          <Calendar className="w-4 h-4" />
                          <span className="text-sm">
                            Due: {selectedInvestigation.dueDate.toLocaleDateString()}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Data Integrity Panel */}
                <div className="mb-8">
                  <DataIntegrityPanel
                    stats={{
                      entitiesWithDocuments: dbStats.entitiesWithDocuments,
                      totalEntities: dbStats.totalEntities,
                      documentsWithMetadata: dbStats.documentsWithMetadata,
                      totalDocuments: dbStats.totalDocuments,
                      lastRefresh: new Date().toISOString().replace('T', ' ').slice(0, 19) + ' UTC',
                    }}
                  />
                </div>

                <div>
                  <h4 className="text-sm font-medium text-slate-400 mb-3 uppercase tracking-wider">
                    Recent Activity
                  </h4>
                  <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-5">
                    <div className="flex items-start gap-4">
                      <div className="w-8 h-8 rounded-full bg-blue-900/30 flex items-center justify-center border border-blue-500/30">
                        <User className="w-4 h-4 text-blue-400" />
                      </div>
                      <div>
                        <p className="text-slate-200 text-sm">
                          Investigation created by{' '}
                          <span className="text-white font-medium">
                            {selectedInvestigation.leadInvestigator}
                          </span>
                        </p>
                        <p className="text-xs text-slate-500 mt-1">
                          {selectedInvestigation.createdAt.toLocaleDateString()} at{' '}
                          {selectedInvestigation.createdAt.toLocaleTimeString()}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'evidence' && selectedInvestigation && (
              <div>
                <InvestigationEvidencePanel investigationId={selectedInvestigation.id} />
              </div>
            )}

            {activeTab === 'hypotheses' && (
              <HypothesisTestingFramework
                investigationId={selectedInvestigation.id}
                initialHypothesis={selectedInvestigation.hypothesis}
                evidenceItems={evidenceItems}
                onHypothesesUpdate={setHypotheses}
              />
            )}
            {activeTab === 'notebook' && selectedInvestigation && (
              <div>
                <EvidenceNotebook investigationId={selectedInvestigation.id} />
              </div>
            )}

            {activeTab === 'financial' && (
              <FinancialTransactionMapper
                investigationId={useGlobalContext ? undefined : selectedInvestigation?.id}
              />
            )}

            {activeTab === 'timeline' && selectedInvestigation && (
              <InvestigationTimelineBuilder
                investigation={selectedInvestigation}
                events={timelineEvents}
                evidence={evidenceItems}
                hypotheses={hypotheses}
                onEventsUpdate={setTimelineEvents}
                onSaveEvent={saveTimelineEvent}
                onDeleteEvent={deleteTimelineEvent}
              />
            )}

            {activeTab === 'forensic' && selectedInvestigation && (
              <ForensicAnalysisWorkspace
                investigation={selectedInvestigation}
                evidence={evidenceItems}
                onEvidenceUpdate={setEvidenceItems}
                timelineEvents={timelineEvents}
                useGlobalContext={useGlobalContext}
              />
            )}

            {activeTab === 'team' && (
              <InvestigationTeamManagement
                investigation={selectedInvestigation}
                currentUser={currentUser}
                onTeamUpdate={(updatedInvestigation) => {
                  setSelectedInvestigation(updatedInvestigation);
                  // Update the investigations list as well
                  setInvestigations(
                    investigations.map((inv) =>
                      inv.id === updatedInvestigation.id ? updatedInvestigation : inv,
                    ),
                  );
                }}
              />
            )}

            {activeTab === 'export' && selectedInvestigation && (
              <div>
                <h3 className="text-xl font-bold text-white mb-6">
                  Export & Publish Investigation
                </h3>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                  <InvestigationExportTools
                    investigation={selectedInvestigation}
                    evidence={evidenceItems}
                    timelineEvents={timelineEvents}
                    hypotheses={hypotheses}
                    annotations={annotations}
                  />

                  <div>
                    <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6 mb-6">
                      <h4 className="text-lg font-semibold text-white mb-4">
                        Evidence Packet Export
                      </h4>
                      <p className="text-slate-400 mb-4">
                        Export this investigation as a comprehensive evidence packet containing
                        entities, documents, metadata, and Red Flag Index scores.
                      </p>
                      <EvidencePacketExporter
                        investigationId={selectedInvestigation.id}
                        investigationTitle={selectedInvestigation.title}
                        onExport={(format: 'json' | 'zip') => {
                          console.log(
                            `Exporting investigation ${selectedInvestigation.id} as ${format}`,
                          );
                          // In a real implementation, this would trigger the actual export
                          addToast({
                            text: `Exporting investigation as ${format.toUpperCase()} format`,
                            type: 'info',
                          });
                        }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'analytics' && (
              <div>
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-xl font-bold text-white">
                    Investigation Analytics & Network Analysis
                  </h3>
                  <button
                    onClick={() => setShowCreateRelationshipModal(true)}
                    className="flex items-center gap-2 px-3 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors text-sm font-medium shadow-lg shadow-purple-500/20"
                  >
                    <Network className="w-4 h-4" />
                    <span>Add Connection</span>
                  </button>
                </div>

                {/* Network Visualization */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
                  <div className="lg:col-span-2 liquid-glass-card rounded-xl overflow-hidden">
                    <NetworkVisualization
                      nodes={networkNodes}
                      edges={networkEdges}
                      onNodeClick={(node) => {
                        console.log('Node clicked:', node);
                        setSelectedNetworkNode(node);
                        setSelectedNetworkEdge(null);
                      }}
                      onEdgeClick={(edge) => {
                        console.log('Edge clicked:', edge);
                        setSelectedNetworkEdge(edge);
                        setSelectedNetworkNode(null);
                      }}
                      selectedNodeId={selectedNetworkNode?.id}
                      selectedEdgeId={selectedNetworkEdge?.id}
                      height={500}
                      showFilters={true}
                      showLegend={true}
                      interactive={true}
                    />
                  </div>

                  {/* Selected Node/Edge Details */}
                  <div className="liquid-glass-card rounded-xl p-6">
                    <h4 className="text-lg font-semibold text-white mb-4">
                      {selectedNetworkNode
                        ? 'Node Details'
                        : selectedNetworkEdge
                          ? 'Connection Details'
                          : 'Details'}
                    </h4>
                    {selectedNetworkNode ? (
                      <div className="space-y-4">
                        <div className="flex items-start justify-between">
                          <div>
                            <h5 className="text-base font-medium text-white">
                              {selectedNetworkNode.label}
                            </h5>
                            <p className="text-sm text-slate-400 capitalize">
                              {selectedNetworkNode.type}
                            </p>
                          </div>
                          <AddToInvestigationButton
                            item={{
                              id: selectedNetworkNode.id,
                              title: selectedNetworkNode.label,
                              description: selectedNetworkNode.description || 'Network entity',
                              type: 'entity',
                              sourceId: selectedNetworkNode.id,
                              metadata: selectedNetworkNode.metadata,
                            }}
                            investigations={[]} // This needs to be populated from context or props
                            onAddToInvestigation={(invId, item, relevance) => {
                              console.log('Add to investigation', invId, item, relevance);
                              const event = new CustomEvent('add-to-investigation', {
                                detail: { investigationId: invId, item, relevance },
                              });
                              window.dispatchEvent(event);
                            }}
                            variant="icon"
                            className="hover:bg-slate-700"
                          />
                        </div>

                        <p className="text-sm text-slate-300">{selectedNetworkNode.description}</p>

                        <div className="space-y-2">
                          <div className="flex justify-between text-sm">
                            <span className="text-slate-400">Risk Level</span>
                            <span
                              className={`px-2 py-0.5 rounded text-xs font-medium ${
                                selectedNetworkNode.metadata.riskLevel === 'critical'
                                  ? 'bg-red-900 text-red-200'
                                  : selectedNetworkNode.metadata.riskLevel === 'high'
                                    ? 'bg-orange-900 text-orange-200'
                                    : selectedNetworkNode.metadata.riskLevel === 'medium'
                                      ? 'bg-yellow-900 text-yellow-200'
                                      : 'bg-green-900 text-green-200'
                              }`}
                            >
                              {(selectedNetworkNode.metadata.riskLevel || 'low').toUpperCase()}
                            </span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-slate-400">Mentions</span>
                            <span className="text-white">
                              {selectedNetworkNode.metadata.mentions || 0}
                            </span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-slate-400">Category</span>
                            <span className="text-white">
                              {selectedNetworkNode.metadata.category || 'Uncategorized'}
                            </span>
                          </div>
                        </div>

                        {selectedNetworkNode.metadata.documents &&
                          selectedNetworkNode.metadata.documents.length > 0 && (
                            <div>
                              <h6 className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-2">
                                Related Documents
                              </h6>
                              <div className="space-y-1">
                                {selectedNetworkNode.metadata.documents.map((doc, idx) => (
                                  <div
                                    key={idx}
                                    className="flex items-center gap-2 text-sm text-blue-400 hover:text-blue-300 cursor-pointer"
                                  >
                                    <FileText className="w-3 h-3" />
                                    <span>{doc}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                      </div>
                    ) : selectedNetworkEdge ? (
                      <div className="space-y-4">
                        <div>
                          <h5 className="text-base font-medium text-white capitalize">
                            {selectedNetworkEdge.type}
                          </h5>
                          <p className="text-sm text-slate-400">
                            Strength: {selectedNetworkEdge.strength}/10
                          </p>
                        </div>

                        <div className="space-y-2">
                          <div className="flex justify-between text-sm">
                            <span className="text-slate-400">Confidence</span>
                            <span className="text-white">
                              {Math.round((selectedNetworkEdge.metadata.confidence || 0) * 100)}%
                            </span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-slate-400">Evidence Count</span>
                            <span className="text-white">
                              {(selectedNetworkEdge.metadata as any).evidence_count || 0}
                            </span>
                          </div>
                          {(selectedNetworkEdge.metadata as any).date_range && (
                            <div className="flex justify-between text-sm">
                              <span className="text-slate-400">Timeframe</span>
                              <span className="text-white">
                                {(selectedNetworkEdge.metadata as any).date_range}
                              </span>
                            </div>
                          )}
                        </div>

                        {(selectedNetworkEdge.metadata as any).evidence_types &&
                          (selectedNetworkEdge.metadata as any).evidence_types.length > 0 && (
                            <div>
                              <h6 className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-2">
                                Evidence Types
                              </h6>
                              <div className="flex flex-wrap gap-2">
                                {(selectedNetworkEdge.metadata as any).evidence_types.map(
                                  (type: string, idx: number) => (
                                    <span
                                      key={idx}
                                      className="px-2 py-1 bg-slate-800 rounded text-xs text-slate-300 border border-slate-700"
                                    >
                                      {type}
                                    </span>
                                  ),
                                )}
                              </div>
                            </div>
                          )}
                      </div>
                    ) : (
                      <div className="text-center py-8 text-slate-500">
                        <Network className="w-12 h-12 mx-auto mb-3 opacity-20" />
                        <p>Select a node or connection to view details</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Summary Statistics */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="liquid-glass-card p-4 rounded-xl">
                    <h4 className="text-sm font-medium text-slate-400 uppercase tracking-wider">
                      People Identified
                    </h4>
                    <p className="text-3xl font-bold text-white mt-2">
                      {networkNodes.filter((n) => n.type === 'person').length}
                    </p>
                  </div>
                  <div className="liquid-glass-card p-4 rounded-xl">
                    <h4 className="text-sm font-medium text-slate-400 uppercase tracking-wider">
                      Organizations
                    </h4>
                    <p className="text-3xl font-bold text-white mt-2">
                      {networkNodes.filter((n) => n.type === 'organization').length}
                    </p>
                  </div>
                  <div className="liquid-glass-card p-4 rounded-xl">
                    <h4 className="text-sm font-medium text-slate-400 uppercase tracking-wider">
                      Key Locations
                    </h4>
                    <p className="text-3xl font-bold text-white mt-2">
                      {networkNodes.filter((n) => n.type === 'location').length}
                    </p>
                  </div>
                  <div className="liquid-glass-card p-4 rounded-xl">
                    <h4 className="text-sm font-medium text-slate-400 uppercase tracking-wider">
                      Connections
                    </h4>
                    <p className="text-3xl font-bold text-white mt-2">{networkEdges.length}</p>
                  </div>
                </div>

                {/* Relationship Legend */}
                <div className="mt-6 liquid-glass-panel p-4 rounded-xl border border-white/5">
                  <h4 className="text-sm font-medium text-slate-400 uppercase tracking-wider mb-3">
                    Connection Types
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="flex items-center gap-3">
                      <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                      <div className="text-sm">
                        <span className="text-slate-200 font-medium">Email</span>
                        <p className="text-slate-500 text-xs">
                          Direct communication (From/To/CC) from metadata
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="w-3 h-3 rounded-full bg-purple-500"></div>
                      <div className="text-sm">
                        <span className="text-slate-200 font-medium">Co-occurrence</span>
                        <p className="text-slate-500 text-xs">
                          Appearing in the same document (weighted by frequency)
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="w-3 h-3 rounded-full bg-red-500"></div>
                      <div className="text-sm">
                        <span className="text-slate-200 font-medium">Flight Log</span>
                        <p className="text-slate-500 text-xs">
                          Appearing on the same flight manifest
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* New Investigation Modal */}
      {showNewInvestigationModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center z-50 p-4">
          <div className="liquid-glass-modal rounded-xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
            <h3 className="text-xl font-bold text-white mb-6">Create New Investigation</h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Title *</label>
                <input
                  type="text"
                  name="title"
                  value={newInvestigation.title}
                  onChange={(e) =>
                    setNewInvestigation({ ...newInvestigation, title: e.target.value })
                  }
                  className="w-full px-3 h-10 bg-slate-800 border border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-white placeholder-slate-500"
                  placeholder="Enter investigation title"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">
                  Description *
                </label>
                <textarea
                  value={newInvestigation.description}
                  name="description"
                  onChange={(e) =>
                    setNewInvestigation({ ...newInvestigation, description: e.target.value })
                  }
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-white placeholder-slate-500"
                  rows={3}
                  placeholder="Describe the investigation focus"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Hypothesis</label>
                <textarea
                  value={newInvestigation.hypothesis}
                  onChange={(e) =>
                    setNewInvestigation({ ...newInvestigation, hypothesis: e.target.value })
                  }
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-white placeholder-slate-500"
                  rows={2}
                  placeholder="What do you aim to prove or disprove?"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">Priority</label>
                  <select
                    value={newInvestigation.priority}
                    onChange={(e) =>
                      setNewInvestigation({ ...newInvestigation, priority: e.target.value as any })
                    }
                    className="w-full px-3 h-10 bg-slate-800 border border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-white"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="critical">Critical</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">Due Date</label>
                  <input
                    type="date"
                    value={newInvestigation.dueDate}
                    onChange={(e) =>
                      setNewInvestigation({ ...newInvestigation, dueDate: e.target.value })
                    }
                    className="w-full px-3 h-10 bg-slate-800 border border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-white"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-8">
              <button
                onClick={() => setShowNewInvestigationModal(false)}
                className="px-4 h-10 flex items-center justify-center text-sm font-medium text-slate-300 bg-slate-800 rounded-lg hover:bg-slate-700 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={createInvestigation}
                disabled={!newInvestigation.title || !newInvestigation.description}
                className="px-4 h-10 flex items-center justify-center text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-lg shadow-blue-900/20"
              >
                Create Investigation
              </button>
            </div>
          </div>
        </div>
      )}

      {showCreateRelationshipModal && (
        <CreateRelationshipModal
          onClose={() => setShowCreateRelationshipModal(false)}
          onSuccess={() => {
            // Refresh network data logic would go here
            // Since we use useEffect based on selectedInvestigation, we might need to force a refresh
            // But for now, user can manually refresh or navigate back/forth
            // A better way would be to expose a refresh function from the effect
            // or toggle a version counter
          }}
          initialSourceId={selectedNetworkNode?.id}
        />
      )}
    </div>
  );
};
