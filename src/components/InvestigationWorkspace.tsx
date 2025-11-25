import React, { useState, useEffect } from 'react';
import { Investigation, EvidenceItem, TimelineEvent, Hypothesis, Annotation, Investigator } from '../types/investigation';
import { EvidenceChainService } from '../services/evidenceChainService';
import { MessageSquare, Phone, Mail, Calendar, User, ArrowRight, Search, Filter, Download, AlertTriangle, X, Plus, Users, Target, FileText, BarChart3, Settings, Share2, Lock, Microscope, Network, FileSearch, Database } from 'lucide-react';
import { NetworkVisualization, NetworkNode, NetworkEdge } from './NetworkVisualization';
import { InvestigationTimelineBuilder } from './InvestigationTimelineBuilder';
import { InvestigationExportTools } from './InvestigationExportTools';
import { ForensicAnalysisWorkspace } from './ForensicAnalysisWorkspace';
import { useInvestigationOnboarding } from '../hooks/useInvestigationOnboarding';
import { InvestigationOnboarding } from './InvestigationOnboarding';
import { ExampleInvestigationCard } from './ExampleInvestigationCard';
import { DataIntegrityPanel } from './DataIntegrityPanel';
import { EvidencePacketExporter } from './EvidencePacketExporter';

interface InvestigationWorkspaceProps {
  investigationId?: string;
  onInvestigationSelect?: (investigation: Investigation) => void;
  currentUser: Investigator;
}

export const InvestigationWorkspace: React.FC<InvestigationWorkspaceProps> = ({
  investigationId,
  onInvestigationSelect,
  currentUser
}) => {
  const [investigations, setInvestigations] = useState<Investigation[]>([]);
  const [selectedInvestigation, setSelectedInvestigation] = useState<Investigation | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'evidence' | 'hypotheses' | 'timeline' | 'team' | 'analytics' | 'forensic' | 'export'>('overview');
  const [isLoading, setIsLoading] = useState(false);
  const [showNewInvestigationModal, setShowNewInvestigationModal] = useState(false);
  const [newInvestigation, setNewInvestigation] = useState({
    title: '',
    description: '',
    hypothesis: '',
    priority: 'medium' as const,
    dueDate: ''
  });
  const [timelineEvents, setTimelineEvents] = useState<TimelineEvent[]>([]);
  const [evidenceItems, setEvidenceItems] = useState<EvidenceItem[]>([]);
  const [hypotheses, setHypotheses] = useState<Hypothesis[]>([]);
  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  const [showExampleInvestigation, setShowExampleInvestigation] = useState(false);

  // Investigation onboarding hook
  const { hasSeenOnboarding, markOnboardingAsSeen } = useInvestigationOnboarding();

  const evidenceChainService = EvidenceChainService.getInstance();

  useEffect(() => {
    loadInvestigations();
    // Initialize with some mock timeline events for demonstration
    setTimelineEvents([
      {
        id: 'event-1',
        title: 'Epstein Arrested in Florida',
        description: 'Jeffrey Epstein was arrested in Florida on multiple charges related to sex trafficking.',
        startDate: new Date('2006-07-01T10:00:00Z'),
        layerId: 'layer-1',
        entities: [],
        evidence: [],
        importance: 'high',
        tags: ['arrest', 'florida'],
        sources: ['source-1'],
        createdBy: 'system',

        confidence: 95,
        documents: ['doc-1'],
        createdAt: new Date('2006-07-01T12:00:00Z'),
        updatedAt: new Date('2006-07-01T12:00:00Z'),
        type: 'document',

      },
      {
        id: 'event-2',
        title: 'Plea Deal Negotiations Begin',
        description: 'Federal prosecutors begin plea deal negotiations with Epstein\'s legal team.',
        startDate: new Date('2007-03-15T14:30:00Z'),
        layerId: 'layer-1',
        entities: [],
        evidence: [],
        importance: 'medium',
        tags: ['plea_deal', 'negotiation'],
        sources: ['source-2'],
        createdBy: 'system',

        confidence: 85,
        documents: ['doc-2'],
        createdAt: new Date('2008-01-15T09:00:00Z'),
        updatedAt: new Date('2008-01-15T09:00:00Z'),
        type: 'document',

      }
    ]);
    
    // Mock evidence items
    setEvidenceItems([
      {
        id: 'evidence-1',
        title: 'Police Report - Florida Arrest',
        description: 'Official police report documenting Epstein\'s arrest in Florida',
        type: 'document',
        source: 'Palm Beach Police Department',
        sourceId: 'source-1',
        relevance: 'high',
        credibility: 'verified',
        extractedBy: 'system',
        extractedAt: new Date('2024-01-01T00:00:00Z'),



      },
      {
        id: 'evidence-2',
        title: 'Plea Deal Documents',
        description: 'Federal plea deal negotiation documents',
        type: 'document',
        source: 'Federal Prosecutors Office',
        sourceId: 'source-2',
        relevance: 'high',
        credibility: 'likely',
        extractedBy: 'system',
        extractedAt: new Date('2024-01-01T00:00:00Z'),



      }
    ]);
    
    // Mock hypotheses
    setHypotheses([
      {
        id: 'hyp-1',
        title: 'Systemic Corruption in Plea Deal',
        description: 'The 2008 plea deal was the result of systemic corruption involving high-level officials.',
        confidence: 75,
        status: 'testing',
        evidenceIds: ['evidence-1', 'evidence-2'],
        timelineEventIds: ['event-1', 'event-2'],
        investigationId: '1',
        evidence: [],
        createdBy: 'system',
        relatedHypotheses: [],
        createdAt: new Date('2024-01-01T00:00:00Z'),

      },
      {
        id: 'hyp-2',
        title: 'Political Influence on Prosecution',
        description: 'Political connections influenced the decision to offer a lenient plea deal.',
        confidence: 65,
        status: 'testing',
        evidenceIds: ['evidence-2'],
        timelineEventIds: ['event-2'],
        investigationId: '1',
        evidence: [],
        createdBy: 'system',
        relatedHypotheses: [],
        createdAt: new Date('2024-01-01T00:00:00Z'),

      }
    ]);
    
    // Mock annotations
    setAnnotations([
      {
        id: 'ann-1',
        documentId: 'doc-1',
        investigatorId: currentUser.id,
        visibility: 'team',
        relatedAnnotations: [],
        content: 'This section indicates potential coordination between federal and state prosecutors.',
        position: { start: 100, end: 200 },
        type: 'evidence',

        tags: ['plea_deal', 'coordination'],
        createdAt: new Date('2024-01-01T00:00:00Z'),
        updatedAt: new Date('2024-01-01T00:00:00Z')
      }
    ]);
  }, []);

  useEffect(() => {
    if (investigationId) {
      loadInvestigation(investigationId);
    }
  }, [investigationId]);

  const loadInvestigations = async () => {
    setIsLoading(true);
    try {
      // This would come from an API call
      const mockInvestigations: Investigation[] = [
        {
          id: '1',
          title: 'Epstein Network Analysis',
          description: 'Investigation into the network of associates and enablers surrounding Jeffrey Epstein',
          hypothesis: 'Epstein operated a sophisticated intelligence gathering and blackmail operation with high-level political and business connections',
          status: 'active',
          createdAt: new Date('2024-01-15'),
          updatedAt: new Date('2024-01-20'),
          team: [
            {
              id: '1',
              name: 'Sarah Johnson',
              email: 'sarah@investigation.com',
              role: 'lead',
              permissions: ['read', 'write', 'admin'],
              joinedAt: new Date('2024-01-15'),
              organization: 'Investigative News Network',
              expertise: ['financial crimes', 'network analysis']
            }
          ],
          leadInvestigator: 'Sarah Johnson',
          permissions: [],
          tags: ['epstein', 'trafficking', 'intelligence', 'blackmail'],
          priority: 'critical'
        }
      ];
      setInvestigations(mockInvestigations);
    } catch (error) {
      console.error('Error loading investigations:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadInvestigation = async (id: string) => {
    setIsLoading(true);
    try {
      // This would come from an API call
      const investigation = investigations.find(inv => inv.id === id);
      if (investigation) {
        setSelectedInvestigation(investigation);
        if (onInvestigationSelect) {
          onInvestigationSelect(investigation);
        }
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
      const investigation: Investigation = {
        id: Date.now().toString(),
        title: newInvestigation.title,
        description: newInvestigation.description,
        hypothesis: newInvestigation.hypothesis,
        status: 'draft',
        createdAt: new Date(),
        updatedAt: new Date(),
        team: [currentUser],
        leadInvestigator: currentUser.name,
        permissions: [],
        tags: [],
        priority: newInvestigation.priority,
        dueDate: newInvestigation.dueDate ? new Date(newInvestigation.dueDate) : undefined
      };

      setInvestigations([...investigations, investigation]);
      setSelectedInvestigation(investigation);
      setShowNewInvestigationModal(false);
      setNewInvestigation({
        title: '',
        description: '',
        hypothesis: '',
        priority: 'medium',
        dueDate: ''
      });
    } catch (error) {
      console.error('Error creating investigation:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadExampleInvestigation = () => {
    // Create a mock example investigation with high Red Flag Index entities
    const exampleInvestigation: Investigation = {
      id: 'example-1',
      title: 'Example: Flight logs and deposition cross-check',
      description: 'Demonstrates how Red Flag Index + evidence types can be used to build a case trail.',
      hypothesis: 'Cross-referencing flight logs with deposition testimony reveals inconsistencies in key witness accounts.',
      status: 'active',
      createdAt: new Date(),
      updatedAt: new Date(),
      team: [currentUser],
      leadInvestigator: currentUser.name,
      permissions: [],
      tags: ['example', 'flight-logs', 'deposition'],
      priority: 'high',
      dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days from now
    };

    // Set example data
    setSelectedInvestigation(exampleInvestigation);
    
    // Mock example evidence items with high Red Flag Index
    const exampleEvidence: EvidenceItem[] = [
      {
        id: 'example-evidence-1',
        title: 'Private Jet Flight Logs (2002-2005)',
        description: 'Flight logs showing frequent trips between Palm Beach and New York with unlisted passengers',
        type: 'document',
        source: 'FAA Records',
        sourceId: 'faa-records-1',
        relevance: 'high',
        credibility: 'verified',
        extractedBy: 'system',
        extractedAt: new Date('2024-01-01T00:00:00Z'),
      },
      {
        id: 'example-evidence-2',
        title: 'Virginia Roberts Deposition Transcript',
        description: 'Testimony from key witness about meetings at Epstein\'s properties',
        type: 'document',
        source: 'Court Records',
        sourceId: 'court-records-1',
        relevance: 'high',
        credibility: 'verified',
        extractedBy: 'system',
        extractedAt: new Date('2024-01-01T00:00:00Z'),
      },
      {
        id: 'example-evidence-3',
        title: 'Financial Transaction Records',
        description: 'Bank records showing large cash transactions with no clear business purpose',
        type: 'document',
        source: 'SEC Filings',
        sourceId: 'sec-filings-1',
        relevance: 'high',
        credibility: 'verified',
        extractedBy: 'system',
        extractedAt: new Date('2024-01-01T00:00:00Z'),
      }
    ];
    
    setEvidenceItems(exampleEvidence);
    
    // Mock example timeline events
    const exampleTimelineEvents: TimelineEvent[] = [
      {
        id: 'example-event-1',
        title: 'First Alleged Encounter',
        description: 'Based on deposition testimony and flight logs',
        startDate: new Date('2001-03-15T10:00:00Z'),
        layerId: 'example-layer-1',
        entities: ['epstein', 'roberts'],
        evidence: [exampleEvidence[0], exampleEvidence[1]],
        importance: 'high',
        tags: ['first_contact', 'palm_beach'],
        sources: ['deposition-1', 'flight-log-1'],
        createdBy: 'system',
        confidence: 85,
        documents: ['example-evidence-1', 'example-evidence-2'],
        createdAt: new Date('2001-03-15T12:00:00Z'),
        updatedAt: new Date('2001-03-15T12:00:00Z'),
        type: 'document',
      },
      {
        id: 'example-event-2',
        title: 'Pattern of Behavior Established',
        description: 'Regular meetings documented in flight logs and financial records',
        startDate: new Date('2002-06-01T10:00:00Z'),
        layerId: 'example-layer-1',
        entities: ['epstein', 'roberts', 'maxwell'],
        evidence: [exampleEvidence[0], exampleEvidence[2]],
        importance: 'critical',
        tags: ['pattern', 'financial'],
        sources: ['flight-log-2', 'financial-1'],
        createdBy: 'system',
        confidence: 95,
        documents: ['example-evidence-1', 'example-evidence-3'],
        createdAt: new Date('2002-06-01T12:00:00Z'),
        updatedAt: new Date('2002-06-01T12:00:00Z'),
        type: 'document',
      }
    ];
    
    setTimelineEvents(exampleTimelineEvents);
    
    // Mock example hypotheses
    const exampleHypotheses: Hypothesis[] = [
      {
        id: 'example-hyp-1',
        investigationId: 'example-1',
        title: 'Inconsistencies in Witness Testimony',
        description: 'Flight logs contradict deposition testimony about meeting locations and dates',
        status: 'testing',
        evidence: [exampleEvidence[0], exampleEvidence[1]],
        evidenceIds: ['example-evidence-1', 'example-evidence-2'],
        timelineEventIds: ['example-event-1'],
        confidence: 80,
        createdBy: 'system',
        createdAt: new Date('2024-01-01T00:00:00Z'),
        relatedHypotheses: [],
      }
    ];
    
    setHypotheses(exampleHypotheses);
    
    // Hide the example card once loaded
    setShowExampleInvestigation(false);
  };

  const getStatusColor = (status: Investigation['status']) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'review': return 'bg-yellow-100 text-yellow-800';
      case 'published': return 'bg-blue-100 text-blue-800';
      case 'archived': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getPriorityColor = (priority: Investigation['priority']) => {
    switch (priority) {
      case 'critical': return 'bg-red-100 text-red-800';
      case 'high': return 'bg-orange-100 text-orange-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'low': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
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
    <div className="bg-slate-900 rounded-lg shadow-lg border border-slate-700 h-[calc(100vh-8rem)] flex flex-col">
      {/* Investigation Onboarding Overlay */}
      {!hasSeenOnboarding && !selectedInvestigation && (
        <InvestigationOnboarding
          onComplete={markOnboardingAsSeen}
          onSkip={markOnboardingAsSeen}
        />
      )}

      {/* Header */}
      <div className="border-b border-slate-700 px-6 py-4 shrink-0">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-white">
              Investigation Workspace
            </h2>
            <p className="text-sm text-slate-400 mt-1">
              Collaborative investigation platform for journalists and researchers
            </p>
          </div>
          <button
            onClick={() => setShowNewInvestigationModal(true)}
            className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors shadow-lg shadow-blue-900/20"
          >
            <Plus className="w-4 h-4 mr-2" />
            New Investigation
          </button>
        </div>
      </div>

      {/* Investigation List */}
      {!selectedInvestigation && (
        <div className="p-6 overflow-y-auto flex-1">
          {/* Example Investigation Card - shown when there are no investigations */}
          {investigations.length === 0 && !showExampleInvestigation ? (
            <ExampleInvestigationCard onLoadExample={loadExampleInvestigation} />
          ) : (
            <>
              {/* Example Investigation Toggle Button */}
              <div className="mb-4">
                <button
                  onClick={() => setShowExampleInvestigation(!showExampleInvestigation)}
                  className="text-sm text-blue-400 hover:text-blue-300 flex items-center"
                >
                  {showExampleInvestigation ? 'Hide' : 'Show'} Example Investigation
                </button>
              </div>

              {/* Example Investigation Card */}
              {showExampleInvestigation && (
                <div className="mb-6">
                  <ExampleInvestigationCard onLoadExample={loadExampleInvestigation} />
                </div>
              )}

              <div className="grid gap-4">
                {investigations.map((investigation) => (
                  <div
                    key={investigation.id}
                    className="border border-slate-700 bg-slate-800/50 rounded-lg p-4 hover:bg-slate-800 hover:border-slate-600 transition-all cursor-pointer group"
                    onClick={() => loadInvestigation(investigation.id)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h3 className="text-lg font-medium text-white group-hover:text-blue-400 transition-colors">
                          {investigation.title}
                        </h3>
                        <p className="text-sm text-slate-400 mt-1">
                          {investigation.description}
                        </p>
                        <div className="flex items-center gap-2 mt-3">
                          <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(investigation.status)}`}>
                            {investigation.status}
                          </span>
                          <span className={`px-2 py-1 text-xs font-medium rounded-full ${getPriorityColor(investigation.priority)}`}>
                            {investigation.priority} priority
                          </span>
                          <span className="text-xs text-slate-500 flex items-center gap-1">
                            <Users className="w-3 h-3" />
                            {investigation.team.length} team members
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
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {/* Selected Investigation Workspace */}
      {selectedInvestigation && (
        <div className="flex flex-1 overflow-hidden flex-col md:flex-row">
          {/* Sidebar */}
          <div className="w-full md:w-64 border-r-0 border-b md:border-b-0 md:border-r border-slate-700 bg-slate-800/50 shrink-0 overflow-x-auto md:overflow-x-visible">
            <div className="p-4">
              <button
                onClick={() => setSelectedInvestigation(null)}
                className="text-sm text-blue-400 hover:text-blue-300 mb-6 flex items-center gap-1 transition-colors"
              >
                <ArrowRight className="w-4 h-4 rotate-180" />
                Back to Investigations
              </button>
              
              <h3 className="font-medium text-white mb-6 px-2">
                {selectedInvestigation.title}
              </h3>
              
              <nav className="space-y-1">
                {[
                  { id: 'overview', label: 'Overview', icon: Search },
                  { id: 'evidence', label: 'Evidence', icon: FileText },
                  { id: 'hypotheses', label: 'Hypotheses', icon: Target },
                  { id: 'timeline', label: 'Timeline', icon: Calendar },
                  { id: 'forensic', label: 'Forensic Analysis', icon: Microscope },
                  { id: 'team', label: 'Team', icon: Users },
                  { id: 'analytics', label: 'Analytics', icon: BarChart3 },
                  { id: 'export', label: 'Export & Publish', icon: Download }
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as any)}
                    className={`w-full flex items-center px-3 py-2 text-sm font-medium rounded-md transition-all ${
                      activeTab === tab.id
                        ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30'
                        : 'text-slate-400 hover:bg-slate-700/50 hover:text-slate-200'
                    }`}
                  >
                    <tab.icon className="w-4 h-4 mr-3" />
                    {tab.label}
                  </button>
                ))}
              </nav>
            </div>
          </div>

          {/* Main Content */}
          <div className="flex-1 p-6 overflow-y-auto bg-slate-900">
            {activeTab === 'overview' && (
              <div className="max-w-4xl">
                <h3 className="text-xl font-bold text-white mb-6">
                  Investigation Overview
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                  <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-5">
                    <h4 className="text-sm font-medium text-slate-400 mb-3 uppercase tracking-wider">Hypothesis</h4>
                    <p className="text-slate-200 leading-relaxed">
                      {selectedInvestigation.hypothesis}
                    </p>
                  </div>
                  
                  <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-5">
                    <h4 className="text-sm font-medium text-slate-400 mb-3 uppercase tracking-wider">Status & Priority</h4>
                    <div className="space-y-4">
                      <div className="flex items-center gap-3">
                        <span className={`px-3 py-1 text-sm font-medium rounded-full ${getStatusColor(selectedInvestigation.status)}`}>
                          {selectedInvestigation.status}
                        </span>
                        <span className={`px-3 py-1 text-sm font-medium rounded-full ${getPriorityColor(selectedInvestigation.priority)}`}>
                          {selectedInvestigation.priority} priority
                        </span>
                      </div>
                      {selectedInvestigation.dueDate && (
                        <div className="flex items-center gap-2 text-slate-400">
                          <Calendar className="w-4 h-4" />
                          <span className="text-sm">Due: {selectedInvestigation.dueDate.toLocaleDateString()}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                
                {/* Data Integrity Panel */}
                <div className="mb-8">
                  <DataIntegrityPanel 
                    stats={{
                      entitiesWithDocuments: 42,
                      totalEntities: 50,
                      documentsWithMetadata: 187,
                      totalDocuments: 200,
                      lastRefresh: '2024-01-15 14:30 UTC'
                    }}
                  />
                </div>
                
                <div>
                  <h4 className="text-sm font-medium text-slate-400 mb-3 uppercase tracking-wider">Recent Activity</h4>
                  <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-5">
                    <div className="flex items-start gap-4">
                      <div className="w-8 h-8 rounded-full bg-blue-900/30 flex items-center justify-center border border-blue-500/30">
                        <User className="w-4 h-4 text-blue-400" />
                      </div>
                      <div>
                        <p className="text-slate-200 text-sm">
                          Investigation created by <span className="text-white font-medium">{selectedInvestigation.leadInvestigator}</span>
                        </p>
                        <p className="text-xs text-slate-500 mt-1">
                          {selectedInvestigation.createdAt.toLocaleDateString()} at {selectedInvestigation.createdAt.toLocaleTimeString()}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'evidence' && (
              <div>
                <h3 className="text-xl font-bold text-white mb-6">
                  Evidence Collection
                </h3>
                
                <div className="bg-yellow-900/20 border border-yellow-500/30 rounded-xl p-4 mb-6">
                  <div className="flex">
                    <Lock className="w-5 h-5 text-yellow-500 mt-0.5" />
                    <div className="ml-3">
                      <h3 className="text-sm font-medium text-yellow-400">
                        Evidence Chain Tracking
                      </h3>
                      <p className="text-sm text-yellow-200/70 mt-1">
                        Advanced evidence chain tracking and authenticity scoring coming soon.
                        This will include cryptographic hashing, provenance tracking, and
                        chain-of-custody documentation.
                      </p>
                    </div>
                  </div>
                </div>
                
                <div className="text-center py-12 bg-slate-800/30 rounded-xl border border-slate-700 border-dashed">
                  <FileText className="w-12 h-12 text-slate-600 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-white">No evidence yet</h3>
                  <p className="text-slate-400 mt-2">
                    Start adding documents and entities to build your evidence collection.
                  </p>
                  <button className="mt-4 px-4 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-600 transition-colors text-sm">
                    Add Evidence
                  </button>
                </div>
              </div>
            )}

            {activeTab === 'hypotheses' && (
              <div>
                <h3 className="text-xl font-bold text-white mb-6">
                  Investigation Hypotheses
                </h3>
                
                <div className="bg-blue-900/20 border border-blue-500/30 rounded-xl p-4 mb-6">
                  <div className="flex">
                    <Target className="w-5 h-5 text-blue-400 mt-0.5" />
                    <div className="ml-3">
                      <h3 className="text-sm font-medium text-blue-400">
                        Hypothesis Testing Framework
                      </h3>
                      <p className="text-sm text-blue-200/70 mt-1">
                        Systematic hypothesis testing with evidence linking, confidence scoring,
                        and revision tracking coming soon.
                      </p>
                    </div>
                  </div>
                </div>
                
                <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6">
                  <h4 className="text-sm font-medium text-slate-400 mb-3 uppercase tracking-wider">Current Hypothesis</h4>
                  <p className="text-lg text-white leading-relaxed">
                    {selectedInvestigation.hypothesis}
                  </p>
                  <div className="mt-6 pt-4 border-t border-slate-700 flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-yellow-500 animate-pulse"></div>
                      <span className="text-sm text-slate-300">Status: Testing</span>
                    </div>
                    <div className="w-px h-4 bg-slate-700"></div>
                    <span className="text-sm text-slate-400">Confidence: TBD</span>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'timeline' && selectedInvestigation && (
              <InvestigationTimelineBuilder
                investigation={selectedInvestigation}
                events={timelineEvents}
                evidence={evidenceItems}
                hypotheses={hypotheses}
                onEventsUpdate={setTimelineEvents}
              />
            )}

            {activeTab === 'forensic' && selectedInvestigation && (
              <ForensicAnalysisWorkspace
                investigation={selectedInvestigation}
                evidence={evidenceItems}
                onEvidenceUpdate={setEvidenceItems}
                timelineEvents={timelineEvents}
              />
            )}

            {activeTab === 'team' && (
              <div>
                <h3 className="text-xl font-bold text-white mb-6">
                  Investigation Team
                </h3>
                
                <div className="grid gap-4">
                  {selectedInvestigation.team.map((member) => (
                    <div key={member.id} className="flex items-center justify-between p-4 bg-slate-800/50 border border-slate-700 rounded-xl">
                      <div className="flex items-center">
                        <div className="w-12 h-12 bg-blue-900/30 rounded-full flex items-center justify-center border border-blue-500/30">
                          <Users className="w-6 h-6 text-blue-400" />
                        </div>
                        <div className="ml-4">
                          <p className="text-lg font-medium text-white">{member.name}</p>
                          <p className="text-sm text-slate-400">{member.role}</p>
                          {member.organization && (
                            <p className="text-xs text-slate-500 mt-0.5">{member.organization}</p>
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-slate-500">
                          Joined {member.joinedAt.toLocaleDateString()}
                        </p>
                        <button className="mt-2 text-xs text-blue-400 hover:text-blue-300">
                          Manage Permissions
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
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
                      <h4 className="text-lg font-semibold text-white mb-4">Evidence Packet Export</h4>
                      <p className="text-slate-400 mb-4">
                        Export this investigation as a comprehensive evidence packet containing entities, documents, 
                        metadata, and Red Flag Index scores.
                      </p>
                      <EvidencePacketExporter 
                        investigationId={selectedInvestigation.id}
                        investigationTitle={selectedInvestigation.title}
                        onExport={(format: 'json' | 'zip') => {
                          console.log(`Exporting investigation ${selectedInvestigation.id} as ${format}`);
                          // In a real implementation, this would trigger the actual export
                          alert(`Exporting investigation as ${format.toUpperCase()} format`);
                        }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'analytics' && (
              <div>
                <h3 className="text-xl font-bold text-white mb-6">
                  Investigation Analytics & Network Analysis
                </h3>
                
                {/* Network Visualization */}
                <div className="bg-slate-800/50 border border-slate-700 rounded-xl overflow-hidden mb-8">
                  <NetworkVisualization
                    nodes={mockNetworkNodes}
                    edges={mockNetworkEdges}
                    onNodeClick={(node) => {
                      console.log('Node clicked:', node);
                    }}
                    onEdgeClick={(edge) => {
                      console.log('Edge clicked:', edge);
                    }}
                    height={500}
                    showFilters={true}
                    showLegend={true}
                    interactive={true}
                  />
                </div>
                
                {/* Summary Statistics */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="bg-slate-800/50 border border-slate-700 p-4 rounded-xl">
                    <h4 className="text-sm font-medium text-slate-400 uppercase tracking-wider">People Identified</h4>
                    <p className="text-3xl font-bold text-white mt-2">{mockNetworkNodes.filter(n => n.type === 'person').length}</p>
                  </div>
                  <div className="bg-slate-800/50 border border-slate-700 p-4 rounded-xl">
                    <h4 className="text-sm font-medium text-slate-400 uppercase tracking-wider">Organizations</h4>
                    <p className="text-3xl font-bold text-white mt-2">{mockNetworkNodes.filter(n => n.type === 'organization').length}</p>
                  </div>
                  <div className="bg-slate-800/50 border border-slate-700 p-4 rounded-xl">
                    <h4 className="text-sm font-medium text-slate-400 uppercase tracking-wider">Key Documents</h4>
                    <p className="text-3xl font-bold text-white mt-2">{mockNetworkNodes.filter(n => n.type === 'document').length}</p>
                  </div>
                  <div className="bg-slate-800/50 border border-slate-700 p-4 rounded-xl">
                    <h4 className="text-sm font-medium text-slate-400 uppercase tracking-wider">Connections</h4>
                    <p className="text-3xl font-bold text-white mt-2">{mockNetworkEdges.length}</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* New Investigation Modal */}
      {showNewInvestigationModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-xl p-6 w-full max-w-md shadow-2xl">
            <h3 className="text-xl font-bold text-white mb-6">
              Create New Investigation
            </h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">
                  Title *
                </label>
                <input
                  type="text"
                  value={newInvestigation.title}
                  onChange={(e) => setNewInvestigation({ ...newInvestigation, title: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-white placeholder-slate-500"
                  placeholder="Enter investigation title"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">
                  Description *
                </label>
                <textarea
                  value={newInvestigation.description}
                  onChange={(e) => setNewInvestigation({ ...newInvestigation, description: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-white placeholder-slate-500"
                  rows={3}
                  placeholder="Describe the investigation focus"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">
                  Hypothesis
                </label>
                <textarea
                  value={newInvestigation.hypothesis}
                  onChange={(e) => setNewInvestigation({ ...newInvestigation, hypothesis: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-white placeholder-slate-500"
                  rows={2}
                  placeholder="What do you aim to prove or disprove?"
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">
                    Priority
                  </label>
                  <select
                  value={newInvestigation.priority}
                  onChange={(e) => setNewInvestigation({ ...newInvestigation, priority: e.target.value as any })}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-white"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="critical">Critical</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">
                    Due Date
                  </label>
                  <input
                    type="date"
                    value={newInvestigation.dueDate}
                    onChange={(e) => setNewInvestigation({ ...newInvestigation, dueDate: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-white"
                  />
                </div>
              </div>
            </div>
            
            <div className="flex justify-end gap-3 mt-8">
              <button
                onClick={() => setShowNewInvestigationModal(false)}
                className="px-4 py-2 text-sm font-medium text-slate-300 bg-slate-800 rounded-lg hover:bg-slate-700 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={createInvestigation}
                disabled={!newInvestigation.title || !newInvestigation.description}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-lg shadow-blue-900/20"
              >
                Create Investigation
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Mock network data for demonstration
const mockNetworkNodes: NetworkNode[] = [
  {
    id: 'epstein',
    type: 'person',
    label: 'Jeffrey Epstein',
    description: 'Financier and convicted sex offender',
    importance: 5,
    metadata: {
      mentions: 1250,
      riskLevel: 'critical',
      category: 'Primary Target',
      documents: ['doc-001', 'doc-002', 'doc-003'],
      connections: ['maxwell', 'wexner', 'andrew', 'clinton', 'trump']
    }
  },
  {
    id: 'maxwell',
    type: 'person',
    label: 'Ghislaine Maxwell',
    description: 'Socialite and convicted accomplice',
    importance: 4,
    metadata: {
      mentions: 890,
      riskLevel: 'high',
      category: 'Key Accomplice',
      documents: ['doc-001', 'doc-004'],
      connections: ['epstein', 'wexner']
    }
  },
  {
    id: 'wexner',
    type: 'person',
    label: 'Les Wexner',
    description: 'L Brands founder and Epstein associate',
    importance: 3,
    metadata: {
      mentions: 340,
      riskLevel: 'medium',
      category: 'Financial Backer',
      documents: ['doc-002', 'doc-005'],
      connections: ['epstein', 'maxwell']
    }
  },
  {
    id: 'andrew',
    type: 'person',
    label: 'Prince Andrew',
    description: 'Duke of York',
    importance: 3,
    metadata: {
      mentions: 280,
      riskLevel: 'high',
      category: 'High-Profile Associate',
      documents: ['doc-006'],
      connections: ['epstein']
    }
  },
  {
    id: 'clinton',
    type: 'person',
    label: 'Bill Clinton',
    description: 'Former U.S. President',
    importance: 3,
    metadata: {
      mentions: 180,
      riskLevel: 'medium',
      category: 'Political Associate',
      documents: ['doc-007'],
      connections: ['epstein']
    }
  },
  {
    id: 'trump',
    type: 'person',
    label: 'Donald Trump',
    description: 'Former U.S. President',
    importance: 2,
    metadata: {
      mentions: 95,
      riskLevel: 'low',
      category: 'Social Associate',
      documents: ['doc-008'],
      connections: ['epstein']
    }
  },
  {
    id: 'l-brands',
    type: 'organization',
    label: 'L Brands',
    description: 'Victoria\'s Secret parent company',
    importance: 3,
    metadata: {
      mentions: 125,
      riskLevel: 'medium',
      category: 'Corporate Entity',
      documents: ['doc-009'],
      connections: ['wexner', 'epstein']
    }
  },
  {
    id: 'doc-001',
    type: 'document',
    label: 'Flight Logs',
    description: 'Epstein\'s private jet flight records',
    importance: 4,
    metadata: {
      mentions: 45,
      riskLevel: 'high',
      category: 'Travel Evidence',
      evidenceStrength: 'strong',
      documents: [],
      connections: ['epstein', 'maxwell', 'andrew', 'clinton']
    }
  },
  {
    id: 'doc-002',
    type: 'document',
    label: 'Financial Records',
    description: 'Epstein\'s financial transactions',
    importance: 5,
    metadata: {
      mentions: 67,
      riskLevel: 'critical',
      category: 'Financial Evidence',
      evidenceStrength: 'crucial',
      documents: [],
      connections: ['epstein', 'wexner']
    }
  },
  {
    id: 'doc-003',
    type: 'document',
    label: 'Black Book',
    description: 'Epstein\'s contact directory',
    importance: 4,
    metadata: {
      mentions: 89,
      riskLevel: 'high',
      category: 'Contact Evidence',
      evidenceStrength: 'strong',
      documents: [],
      connections: ['epstein', 'maxwell', 'andrew', 'clinton', 'trump']
    }
  },
  {
    id: 'palm-beach',
    type: 'location',
    label: 'Palm Beach Mansion',
    description: 'Epstein\'s Florida residence',
    importance: 3,
    metadata: {
      mentions: 234,
      riskLevel: 'high',
      category: 'Crime Location',
      documents: ['doc-010'],
      connections: ['epstein', 'maxwell']
    }
  },
  {
    id: 'manhattan',
    type: 'location',
    label: 'Manhattan Mansion',
    description: 'Epstein\'s New York residence',
    importance: 3,
    metadata: {
      mentions: 189,
      riskLevel: 'high',
      category: 'Crime Location',
      documents: ['doc-011'],
      connections: ['epstein', 'maxwell']
    }
  },
  {
    id: 'little-st-james',
    type: 'location',
    label: 'Little St. James Island',
    description: 'Epstein\'s private island',
    importance: 4,
    metadata: {
      mentions: 312,
      riskLevel: 'critical',
      category: 'Crime Location',
      documents: ['doc-012'],
      connections: ['epstein', 'maxwell', 'andrew']
    }
  }
];

const mockNetworkEdges: NetworkEdge[] = [
  {
    id: 'edge-001',
    source: 'epstein',
    target: 'maxwell',
    type: 'connection',
    strength: 9,
    direction: 'bidirectional',
    metadata: {
      frequency: 890,
      context: 'Long-term associates and co-conspirators',
      confidence: 0.95,
      dates: ['1990-2019'],
      evidence: ['doc-001', 'doc-002', 'doc-003']
    }
  },
  {
    id: 'edge-002',
    source: 'epstein',
    target: 'wexner',
    type: 'financial',
    strength: 8,
    direction: 'unidirectional',
    metadata: {
      frequency: 340,
      context: 'Financial relationship and power of attorney',
      confidence: 0.9,
      dates: ['1990-2007'],
      evidence: ['doc-002']
    }
  },
  {
    id: 'edge-003',
    source: 'epstein',
    target: 'andrew',
    type: 'connection',
    strength: 6,
    direction: 'bidirectional',
    metadata: {
      frequency: 280,
      context: 'Social relationship and visits',
      confidence: 0.85,
      dates: ['1999-2010'],
      evidence: ['doc-001', 'doc-003']
    }
  },
  {
    id: 'edge-004',
    source: 'epstein',
    target: 'clinton',
    type: 'connection',
    strength: 5,
    direction: 'bidirectional',
    metadata: {
      frequency: 180,
      context: 'Political and social relationship',
      confidence: 0.8,
      dates: ['2002-2005'],
      evidence: ['doc-001', 'doc-003']
    }
  },
  {
    id: 'edge-005',
    source: 'epstein',
    target: 'trump',
    type: 'connection',
    strength: 3,
    direction: 'bidirectional',
    metadata: {
      frequency: 95,
      context: 'Social acquaintance in Palm Beach',
      confidence: 0.7,
      dates: ['1990-2005'],
      evidence: ['doc-003']
    }
  },
  {
    id: 'edge-006',
    source: 'epstein',
    target: 'doc-001',
    type: 'evidence',
    strength: 9,
    direction: 'unidirectional',
    metadata: {
      frequency: 45,
      context: 'Flight logs directly implicate Epstein',
      confidence: 0.95,
      dates: ['1995-2019'],
      evidence: []
    }
  },
  {
    id: 'edge-007',
    source: 'epstein',
    target: 'doc-002',
    type: 'evidence',
    strength: 10,
    direction: 'unidirectional',
    metadata: {
      frequency: 67,
      context: 'Financial records show Epstein\'s transactions',
      confidence: 0.98,
      dates: ['1990-2019'],
      evidence: []
    }
  },
  {
    id: 'edge-008',
    source: 'epstein',
    target: 'little-st-james',
    type: 'connection',
    strength: 8,
    direction: 'bidirectional',
    metadata: {
      frequency: 312,
      context: 'Ownership and frequent visits to the island',
      confidence: 0.9,
      dates: ['1998-2019'],
      evidence: ['doc-012']
    }
  },
  {
    id: 'edge-009',
    source: 'maxwell',
    target: 'doc-001',
    type: 'evidence',
    strength: 7,
    direction: 'unidirectional',
    metadata: {
      frequency: 45,
      context: 'Maxwell present on many flights',
      confidence: 0.85,
      dates: ['1995-2019'],
      evidence: []
    }
  },
  {
    id: 'edge-010',
    source: 'wexner',
    target: 'l-brands',
    type: 'connection',
    strength: 10,
    direction: 'bidirectional',
    metadata: {
      frequency: 125,
      context: 'Wexner founded and controlled L Brands',
      confidence: 1.0,
      dates: ['1963-present'],
      evidence: ['doc-009']
    }
  }
];