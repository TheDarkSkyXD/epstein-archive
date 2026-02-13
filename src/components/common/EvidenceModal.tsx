import React, { useState, useEffect, useMemo, useCallback, Profiler } from 'react';
import { createPortal } from 'react-dom';
import { Link } from 'react-router-dom';
import { X, Search, FileText, Activity, AlertTriangle, ExternalLink, Calendar } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { FixedSizeList as List } from 'react-window';
import { InfiniteLoader } from 'react-window-infinite-loader';
import { AutoSizer } from 'react-virtualized-auto-sizer/dist/react-virtualized-auto-sizer.cjs';

import { SignalPanel } from '../entities/cards/SignalPanel';
import { DriverChips } from '../entities/cards/DriverChips';
import { EvidenceBadge } from '../entities/cards/EvidenceBadge';
import { apiClient } from '../../services/apiClient';
import { cn } from '../../utils/cn';
import {
  calculateEvidenceLadder,
  calculateSignalMetrics,
  generateDriverChips,
} from '../../utils/forensics';
import { Skeleton } from './Skeleton';
import { NetworkGraph } from '../visualizations/NetworkGraph';
import Icon from './Icon';
import { useScrollLock } from '../../hooks/useScrollLock';

interface EvidenceModalProps {
  entityId: string;
  isOpen: boolean;
  onClose: () => void;
}

interface BlackBookEntry {
  id: number;
  phoneNumbers?: string[];
  notes?: string;
}

interface EntityDetails {
  id: string;
  fullName: string;
  primaryRole: string;
  bio: string;
  description?: string;
  mentions: number;
  likelihoodLevel: string;
  redFlagRating: number;
  fileReferences: any[]; // Kept for types but unused in virtualized view
  significant_passages: any[];
  photos: any[];
  evidenceTypes: string[];
  blackBookEntries?: BlackBookEntry[];
  birthDate?: string | null;
  deathDate?: string | null;
}

export const EvidenceModal: React.FC<EvidenceModalProps> = ({ entityId, isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'evidence' | 'media' | 'network'>(
    'overview',
  );
  const [entity, setEntity] = useState<EntityDetails | null>(null);
  const [loading, setLoading] = useState(true);

  // Documents Pagination State
  const [documents, setDocuments] = useState<any[]>([]);
  const [totalDocs, setTotalDocs] = useState(0);
  const [isDocsLoading, setIsDocsLoading] = useState(false);
  const loadingCount = React.useRef(0);
  const [docsInitialized, setDocsInitialized] = useState(false);
  const [docFilters, setDocFilters] = useState({ search: '', source: 'all', sort: 'relevance' });

  // Lazy load tabs - only fetch data when tab is activated
  const [tabsLoaded, setTabsLoaded] = useState<Set<string>>(new Set(['overview']));

  // In-memory cache for tab data (prevents refetch on tab toggle)
  const tabDataCache = React.useRef<{
    documents?: any[];
    relationships?: any[];
    totalDocs?: number;
  }>({});

  // Mark tab as loaded when activated
  const handleTabChange = useCallback((tab: 'overview' | 'evidence' | 'media' | 'network') => {
    setActiveTab(tab);
    setTabsLoaded((prev) => new Set(prev).add(tab));
  }, []);

  // Relationships (Network) State
  const [relationships, setRelationships] = useState<
    Array<{
      entity_id: string;
      relationship_type: string;
      strength: number;
      confidence: number;
      name?: string;
    }>
  >([]);
  const [networkLoading, setNetworkLoading] = useState(false);

  const fetchEntityDetails = React.useCallback(async () => {
    setLoading(true);
    try {
      const data = (await apiClient.get(`/entities/${entityId}`)) as EntityDetails;
      setEntity(data);
    } catch (_err) {
      console.error('Failed to load entity details');
    } finally {
      setLoading(false);
    }
  }, [entityId]);

  const loadMoreDocuments = React.useCallback(
    async (startIndex: number, stopIndex: number) => {
      if (isDocsLoading) return;

      // Check cache first
      if (tabDataCache.current.documents && tabDataCache.current.documents.length > 0) {
        const allLoaded = Array.from({ length: stopIndex - startIndex + 1 }).every(
          (_, i) => !!tabDataCache.current.documents![startIndex + i],
        );
        if (allLoaded) return;
      }

      // Check if we already have these items to prevent redundant fetches
      const allLoaded = Array.from({ length: stopIndex - startIndex + 1 }).every(
        (_, i) => !!documents[startIndex + i],
      );
      if (allLoaded && docsInitialized) return;

      setIsDocsLoading(true);
      try {
        const limit = stopIndex - startIndex + 1;
        const offset = startIndex;

        const response = (await apiClient.get(`/entities/${entityId}/documents`, {
          params: {
            offset,
            limit,
            ...docFilters,
          },
        } as any)) as any;

        const newDocs = response.data;
        const total = response.total;
        setTotalDocs(total);

        setDocuments((prev) => {
          const next = [...prev];
          // Ensure the array is at least as large as the total count
          if (next.length < total) {
            next.length = total;
          }
          // Fill the specific range
          newDocs.forEach((doc: any, i: number) => {
            next[startIndex + i] = doc;
          });

          // Cache documents
          tabDataCache.current.documents = next;
          tabDataCache.current.totalDocs = total;

          return next;
        });
      } catch (err) {
        console.error('Error loading docs', err);
      } finally {
        setIsDocsLoading(false);
        setDocsInitialized(true);
      }
    },
    [entityId, docFilters, isDocsLoading, documents, docsInitialized],
  );

  useEffect(() => {
    if (isOpen && entityId) {
      fetchEntityDetails();
    }
  }, [isOpen, entityId, fetchEntityDetails]);

  useEffect(() => {
    // Only load documents if evidence tab has been activated
    if (isOpen && entityId && activeTab === 'evidence' && tabsLoaded.has('evidence')) {
      // Reset docs when tab or entity changes
      setDocuments([]);
      setTotalDocs(0);
      setDocsInitialized(false);
      // We rely on InfiniteLoader to trigger the initial load based on itemCount defaults
    }
  }, [isOpen, entityId, activeTab, docFilters, tabsLoaded]);

  useEffect(() => {
    // Only load relationships if network tab has been activated
    if (isOpen && entityId && activeTab === 'network' && tabsLoaded.has('network')) {
      const fetchRelationships = async () => {
        setNetworkLoading(true);
        try {
          const resp = (await apiClient.get(`/relationships?entityId=${entityId}`)) as {
            relationships: Array<{
              entity_id: string;
              relationship_type: string;
              strength: number;
              confidence: number;
            }>;
          };
          const rels = resp.relationships || [];
          // Fetch names for top relationships
          const top = rels.slice(0, 20);
          const withNames = await Promise.all(
            top.map(async (r) => {
              try {
                const e = await apiClient.get(`/entities/${r.entity_id}`);
                return { ...r, name: (e as any).fullName || (e as any).name || r.entity_id };
              } catch {
                return { ...r, name: r.entity_id };
              }
            }),
          );
          setRelationships(withNames);
        } catch (e) {
          console.error('Error loading relationships', e);
          setRelationships([]);
        } finally {
          setNetworkLoading(false);
        }
      };
      fetchRelationships();
    }
  }, [isOpen, entityId, activeTab]);

  // Helper to check if item is loaded
  const isItemLoaded = (index: number) => !!documents[index];

  // Forensic Calculations
  const forensicData = useMemo(() => {
    if (!entity) return null;
    const personAdapter = {
      ...entity,
      name: entity.fullName, // Required by PersonAdapter
      files: 0,
      contexts: [],
      evidence_types: entity.evidenceTypes || [],
    } as any;

    return {
      ladder: calculateEvidenceLadder(personAdapter),
      signals: calculateSignalMetrics(personAdapter),
      drivers: generateDriverChips(personAdapter),
    };
  }, [entity]);

  // Network Graph Data
  const graphData = useMemo(() => {
    if (!entity) return { entities: [], relationships: [] };

    const centralNode = {
      id: entity.id,
      name: entity.fullName,
      role: entity.primaryRole,
      type: 'Person',
      connectionCount: relationships.length,
      riskLevel: entity.redFlagRating || 0,
      photoUrl: entity.photos?.[0]?.url,
    };

    const relatedNodes = relationships.map((r) => ({
      id: r.entity_id,
      name: r.name || r.entity_id,
      role: 'Associate',
      type: 'Person',
      connectionCount: 1,
      riskLevel: 0,
    }));

    const links = relationships.map((r) => ({
      source: String(entity.id),
      target: String(r.entity_id),
      type: r.relationship_type,
      weight: r.strength,
    }));

    return {
      entities: [centralNode, ...relatedNodes],
      relationships: links,
    };
  }, [entity, relationships]);

  // Scroll Lock
  useScrollLock(isOpen);

  // Performance monitoring
  const onRenderCallback = useCallback(
    (id: string, phase: 'mount' | 'update', actualDuration: number) => {
      if (typeof window !== 'undefined' && actualDuration > 16) {
        import('../../utils/performanceMonitor.js')
          .then(({ PerformanceMonitor }) => {
            PerformanceMonitor.logRender(`EvidenceModal-${id}`, actualDuration, phase);
          })
          .catch(() => {});
      }
    },
    [],
  );

  if (!isOpen) return null;

  return createPortal(
    <Profiler id="EvidenceModal" onRender={onRenderCallback}>
      <AnimatePresence>
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            onClick={onClose}
          />

          <motion.div
            initial={{ scale: 0.95, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 20 }}
            className="relative w-full max-w-6xl h-[85vh] bg-slate-900 border border-slate-800 rounded-xl shadow-2xl overflow-hidden flex flex-col"
          >
            {/* HEADER */}
            <div className="flex bg-slate-950 p-6 border-b border-slate-800 items-start gap-6 shrink-0">
              {/* Profile Photo */}
              <div className="relative shrink-0">
                <div className="w-24 h-24 rounded-lg bg-slate-800 border-2 border-slate-700 overflow-hidden shadow-inner">
                  {loading ? (
                    <div className="w-full h-full animate-pulse bg-slate-800" />
                  ) : entity?.photos?.[0] ? (
                    <img
                      src={entity.photos[0].url}
                      alt={entity.fullName}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-slate-600">
                      <Search size={32} />
                    </div>
                  )}
                </div>
                {forensicData && (
                  <div className="absolute -bottom-3 -right-3">
                    <EvidenceBadge level={forensicData.ladder.level} />
                  </div>
                )}
              </div>

              <div className="flex-1 min-w-0">
                {loading ? (
                  <div className="space-y-3">
                    <div className="h-8 w-64 bg-slate-800 rounded animate-pulse" />
                    <div className="h-5 w-48 bg-slate-800 rounded animate-pulse" />
                    <div className="flex gap-3 pt-1">
                      <div className="h-4 w-20 bg-slate-800 rounded animate-pulse" />
                      <div className="h-4 w-20 bg-slate-800 rounded animate-pulse" />
                      <div className="h-4 w-20 bg-slate-800 rounded animate-pulse" />
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center gap-3 mb-1">
                      <h2 className="text-3xl font-bold text-slate-100 truncate">
                        {entity?.fullName}
                      </h2>
                      {entity?.likelihoodLevel === 'HIGH' && (
                        <span className="px-2 py-0.5 rounded text-xs font-bold bg-red-500/20 text-red-500 border border-red-500/30">
                          HIGH RISK
                        </span>
                      )}
                    </div>
                    <div className="text-slate-400 text-lg mb-4">
                      <span>{entity?.primaryRole}</span>
                      {(entity?.birthDate || entity?.deathDate) && (
                        <span className="ml-3 text-sm text-slate-500">
                          {entity?.birthDate ? `b. ${entity.birthDate}` : ''}
                          {entity?.deathDate ? ` • d. ${entity.deathDate}` : ''}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-3 mb-4">
                      <Link
                        to={
                          entity?.blackBookEntries?.[0]?.id
                            ? `/black-book/${entity.blackBookEntries[0].id}`
                            : `/black-book?search=${encodeURIComponent(entity?.fullName || '')}`
                        }
                        className="text-xs text-purple-400 hover:text-purple-300 hover:underline flex items-center gap-1 transition-colors"
                      >
                        <Icon name="Book" size="xs" />
                        Black Book
                      </Link>
                      <Link
                        to={`/timeline?search=${encodeURIComponent(entity?.fullName || '')}`}
                        className="text-xs text-blue-400 hover:text-blue-300 hover:underline flex items-center gap-1 transition-colors"
                      >
                        <Calendar size={12} />
                        Timeline
                      </Link>
                      <Link
                        to={`/search?q=${encodeURIComponent(entity?.fullName || '')}`}
                        className="text-xs text-cyan-400 hover:text-cyan-300 hover:underline flex items-center gap-1 transition-colors"
                      >
                        <Icon name="Link" size="xs" />
                        Search
                      </Link>
                    </div>
                  </>
                )}

                {/* ACTION TABS */}
                <div className="flex gap-1">
                  {['overview', 'evidence', 'media', 'network'].map((tab) => (
                    <button
                      key={tab}
                      onClick={() => handleTabChange(tab as any)}
                      className={cn(
                        'px-4 py-2 rounded-lg text-sm font-medium transition-colors border',
                        activeTab === tab
                          ? 'bg-indigo-600 text-white border-indigo-500'
                          : 'bg-slate-800/50 text-slate-400 border-transparent hover:bg-slate-800 hover:text-slate-200',
                      )}
                    >
                      {tab.charAt(0).toUpperCase() + tab.slice(1)}
                    </button>
                  ))}
                </div>
              </div>

              <button
                onClick={onClose}
                className="p-2 hover:bg-slate-800 rounded-full text-slate-500 hover:text-slate-300 transition-colors"
              >
                <X size={24} />
              </button>
            </div>

            {/* CONTENT AREA */}
            <div className="flex-1 min-h-0 relative bg-slate-900">
              {/* 1. OVERVIEW TAB */}
              {activeTab === 'overview' && (
                <div className="absolute inset-0 overflow-y-auto custom-scrollbar">
                  {loading && (
                    <div className="p-6 space-y-8">
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <Skeleton className="h-48 w-full rounded-xl bg-slate-900" />
                        <Skeleton className="h-48 w-full rounded-xl bg-slate-900" />
                      </div>
                      <div className="space-y-4">
                        <Skeleton className="h-6 w-48 bg-slate-900" />
                        <Skeleton className="h-24 w-full rounded-lg bg-slate-900" />
                        <Skeleton className="h-24 w-full rounded-lg bg-slate-900" />
                      </div>
                    </div>
                  )}

                  {!loading && entity && forensicData && (
                    <div className="p-6 space-y-8">
                      {/* METRICS & SIGNAL PANEL */}
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* LEFT: CORE STATS */}
                        <div className="bg-slate-950/50 rounded-xl p-5 border border-slate-800 flex flex-col justify-between">
                          <div className="grid grid-cols-3 gap-4 text-center">
                            <div className="p-3 bg-slate-900 rounded-lg">
                              <div className="text-2xl font-bold text-indigo-400">
                                {entity.mentions}
                              </div>
                              <div className="text-xs text-slate-500 uppercase tracking-wider mt-1">
                                Mentions
                              </div>
                            </div>
                            <div className="p-3 bg-slate-900 rounded-lg">
                              <div className="text-2xl font-bold text-sky-400">
                                {totalDocs > 0 ? totalDocs : entity.mentions /* Fallback */}
                              </div>
                              <div className="text-xs text-slate-500 uppercase tracking-wider mt-1">
                                Documents
                              </div>
                            </div>
                            <div className="p-3 bg-slate-900 rounded-lg">
                              <div className="text-2xl font-bold text-emerald-400">
                                {entity.photos?.length || 0}
                              </div>
                              <div className="text-xs text-slate-500 uppercase tracking-wider mt-1">
                                Media
                              </div>
                            </div>
                          </div>
                          <div className="mt-6 pt-6 border-t border-slate-800/50">
                            <h4 className="text-sm font-semibold text-slate-400 mb-3 flex items-center gap-2">
                              <Activity size={14} /> KEY DRIVERS
                            </h4>
                            <DriverChips chips={forensicData.drivers} />
                          </div>
                        </div>

                        {/* RIGHT: SIGNAL ANALYSIS */}
                        <div className="bg-slate-950/50 rounded-xl p-5 border border-slate-800">
                          <h4 className="text-sm font-semibold text-slate-300 mb-4 flex items-center justify-between">
                            <span>FORENSIC SIGNALS</span>
                            <span className="text-xs font-mono text-slate-500">EXO-METRICS v2</span>
                          </h4>
                          <SignalPanel metrics={forensicData.signals} />

                          <div className="mt-6 p-3 bg-slate-900/80 rounded-lg border border-slate-800/80">
                            <div className="text-xs text-slate-400 leading-relaxed">
                              <span className="text-indigo-400 font-medium">Analysis:</span>{' '}
                              {forensicData.ladder.description}
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* HIGH SIGNIFICANCE EVIDENCE (Formerly Spicy) */}
                      {entity.significant_passages && entity.significant_passages.length > 0 && (
                        <div>
                          <h3 className="text-slate-300 font-semibold flex items-center gap-2 font-mono uppercase tracking-widest text-xs mb-4">
                            <AlertTriangle size={14} className="text-amber-500" /> High Significance
                            Evidence
                          </h3>
                          <div className="grid gap-4">
                            {entity.significant_passages.map((passage, idx) => (
                              <div
                                key={idx}
                                className="bg-slate-950 border border-slate-800 rounded-lg p-4 hover:border-indigo-500/30 transition-colors cursor-pointer group"
                                onClick={() =>
                                  passage.documentId &&
                                  window.open(`/documents/${passage.documentId}`, '_blank')
                                }
                              >
                                <div className="flex items-start gap-4">
                                  <div className="mt-1 shrink-0 p-2 bg-slate-900 rounded text-slate-400 group-hover:text-indigo-400 transition-colors">
                                    <FileText size={16} />
                                  </div>
                                  <div>
                                    <p className="text-slate-300 text-sm leading-relaxed font-serif italic border-l-2 border-indigo-500/50 pl-4 mb-3">
                                      "
                                      {passage.passage ||
                                        passage.mention_context ||
                                        passage.contentSnippet ||
                                        passage.text ||
                                        passage.content ||
                                        'No text available'}
                                      "
                                    </p>
                                    <div className="flex items-center gap-3 text-xs text-slate-500">
                                      <span className="flex items-center gap-1">
                                        <FileText size={10} /> {passage.filename}
                                      </span>
                                      <span className="w-1 h-1 rounded-full bg-slate-700" />
                                      <span className="text-indigo-400">
                                        {passage.source || 'Document'}
                                      </span>
                                      {passage.documentId && (
                                        <span className="ml-auto opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 text-indigo-400">
                                          Open Document <ExternalLink size={10} />
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* BLACK BOOK ENTRY */}
                      {entity.blackBookEntries && entity.blackBookEntries.length > 0 && (
                        <div className="bg-purple-950/20 border border-purple-900/30 rounded-xl p-5 mb-8">
                          <div className="flex items-center justify-between mb-4">
                            <h3 className="text-purple-400 font-semibold flex items-center gap-2">
                              <Icon name="Book" size="sm" />
                              Black Book Entry
                            </h3>
                            <Link
                              to={
                                entity.blackBookEntries?.[0]?.id
                                  ? `/black-book/${entity.blackBookEntries[0].id}`
                                  : `/black-book?search=${encodeURIComponent(entity.fullName)}`
                              }
                              className="text-xs text-purple-400 hover:text-purple-300 hover:underline flex items-center gap-1 transition-colors"
                            >
                              View in Black Book <ExternalLink size={12} />
                            </Link>
                          </div>

                          <div className="space-y-4">
                            {entity.blackBookEntries.map((entry, idx) => (
                              <div key={idx} className="space-y-3">
                                {entry.phoneNumbers && entry.phoneNumbers.length > 0 && (
                                  <div className="flex flex-wrap gap-2">
                                    {entry.phoneNumbers.map((phone: string, i: number) => (
                                      <span
                                        key={i}
                                        className="px-2 py-1 bg-purple-900/40 text-purple-200 text-xs rounded border border-purple-800/50 flex items-center gap-1"
                                      >
                                        <Icon name="Phone" size="xs" /> {phone}
                                      </span>
                                    ))}
                                  </div>
                                )}

                                {entry.notes && (
                                  <p className="text-slate-400 text-sm italic border-l-2 border-purple-800/50 pl-3">
                                    {entry.notes}
                                  </p>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* BIO */}
                      <div>
                        <h3 className="text-slate-300 font-semibold mb-3">Biography</h3>
                        <p className="text-slate-400 text-sm leading-relaxed max-w-4xl">
                          {entity.bio || entity.description || 'No biographical data available.'}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* 2. EVIDENCE TAB (Virtualized) */}
              {activeTab === 'evidence' && (
                <div className="h-full flex flex-col min-h-0">
                  {/* FILTERS TOOLBAR */}
                  <div className="p-4 bg-slate-950/30 border-b border-slate-800 flex gap-4 shrink-0">
                    <div className="relative flex-1 max-w-md">
                      <Search
                        className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500"
                        size={16}
                      />
                      <input
                        type="text"
                        placeholder="Search relevant documents..."
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg pl-10 pr-4 py-2 text-sm text-slate-200 focus:outline-none focus:border-indigo-500"
                        value={docFilters.search}
                        onChange={(e) =>
                          setDocFilters((prev) => ({ ...prev, search: e.target.value }))
                        }
                      />
                    </div>
                    <select
                      className="bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-sm text-slate-200 focus:outline-none focus:border-indigo-500"
                      value={docFilters.source}
                      onChange={(e) =>
                        setDocFilters((prev) => ({ ...prev, source: e.target.value }))
                      }
                    >
                      <option value="all">All Sources</option>
                      <option value="court">Court Logs</option>
                      <option value="flight">Flight Logs</option>
                      <option value="email">Emails</option>
                    </select>
                  </div>

                  {/* VIRTUALIZED LIST */}
                  <div className="flex-1 min-h-0 relative bg-slate-900">
                    {docsInitialized && !isDocsLoading && totalDocs === 0 && (
                      <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-500">
                        <FileText size={48} className="mb-4 opacity-20" />
                        <p>No documents found matching your criteria.</p>
                      </div>
                    )}

                    <AutoSizer>
                      {({ height, width }) => {
                        // Workaround for react-window-infinite-loader types incompatibility
                        const InfiniteLoaderComponent = InfiniteLoader as any;
                        return (
                          <InfiniteLoaderComponent
                            isItemLoaded={isItemLoaded}
                            itemCount={docsInitialized ? totalDocs : totalDocs || 50}
                            loadMoreItems={loadMoreDocuments}
                          >
                            {({ onRowsRendered, registerChild }) => (
                              <List
                                className="List"
                                height={height}
                                itemCount={docsInitialized ? totalDocs : totalDocs || 50}
                                itemSize={100}
                                onItemsRendered={({ visibleStartIndex, visibleStopIndex }) => {
                                  onRowsRendered({
                                    startIndex: visibleStartIndex,
                                    stopIndex: visibleStopIndex,
                                  });
                                }}
                                ref={registerChild}
                                width={width}
                              >
                                {({ index, style }) => {
                                  const doc = documents[index];
                                  if (!doc)
                                    return (
                                      <div style={style} className="p-2">
                                        <div className="h-full bg-slate-950 border border-slate-800 rounded-lg p-3 flex gap-4 items-center animate-pulse">
                                          <div className="w-12 h-12 rounded bg-slate-800" />
                                          <div className="flex-1 space-y-2">
                                            <div className="h-4 w-3/4 bg-slate-800 rounded" />
                                            <div className="h-3 w-1/2 bg-slate-800 rounded" />
                                          </div>
                                        </div>
                                      </div>
                                    );

                                  return (
                                    <div style={style} className="p-2">
                                      <div
                                        className="h-full bg-slate-950 border border-slate-800 rounded-lg p-3 hover:border-slate-600 transition-colors flex gap-4 group cursor-pointer"
                                        onClick={() =>
                                          window.open(`/documents/${doc.id}`, '_blank')
                                        }
                                      >
                                        {/* Icon Box */}
                                        <div className="shrink-0 w-12 h-12 bg-slate-900 rounded flex items-center justify-center text-slate-500 group-hover:text-indigo-400 group-hover:bg-indigo-500/10 transition-colors">
                                          <FileText size={20} />
                                        </div>

                                        <div className="flex-1 min-w-0">
                                          <div className="flex justify-between items-start">
                                            <h4 className="text-slate-200 font-medium text-sm truncate pr-4">
                                              {doc.title || doc.fileName}
                                            </h4>
                                            <span className="text-xs text-slate-500 shrink-0 flex items-center gap-1">
                                              <Calendar size={10} />
                                              {doc.dateCreated
                                                ? new Date(doc.dateCreated).toLocaleDateString()
                                                : 'Unknown Date'}
                                            </span>
                                          </div>
                                          <p className="text-slate-500 text-xs mt-1 truncate">
                                            {doc.evidenceType || 'Unclassified Document'} •{' '}
                                            {doc.fileSize
                                              ? (doc.fileSize / 1024).toFixed(1) + ' KB'
                                              : ''}
                                          </p>
                                          <p className="text-slate-400 text-xs mt-2 line-clamp-1 italic opacity-70">
                                            {doc.contentPreview || doc.content?.substring(0, 100)
                                              ? `"...${doc.contentPreview || doc.content?.substring(0, 100)}..."`
                                              : '(No preview text available)'}
                                          </p>
                                        </div>

                                        <div className="shrink-0 self-center opacity-0 group-hover:opacity-100 transition-opacity">
                                          <ExternalLink size={16} className="text-slate-400" />
                                        </div>
                                      </div>
                                    </div>
                                  );
                                }}
                              </List>
                            )}
                          </InfiniteLoaderComponent>
                        );
                      }}
                    </AutoSizer>
                  </div>
                </div>
              )}

              {/* 3. MEDIA TAB */}
              {activeTab === 'media' && entity && (
                <div className="absolute inset-0 overflow-y-auto custom-scrollbar p-6">
                  {entity.photos && entity.photos.length > 0 ? (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      {entity.photos.map((photo, i) => (
                        <div
                          key={i}
                          className="aspect-square rounded-lg bg-slate-800 overflow-hidden relative group"
                        >
                          <img
                            src={photo.url}
                            alt={photo.title}
                            className="w-full h-full object-cover"
                          />
                          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                            <button className="px-3 py-1 bg-white text-black text-xs font-bold rounded-full">
                              VIEW
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-20 text-slate-500">
                      <Search size={48} className="mx-auto mb-4 opacity-20" />
                      <p>No media files found for this entity.</p>
                    </div>
                  )}
                </div>
              )}

              {/* 4. NETWORK TAB */}
              {activeTab === 'network' && (
                <div className="absolute inset-0 overflow-hidden bg-slate-900">
                  {networkLoading ? (
                    <div className="h-full flex flex-col items-center justify-center text-slate-500">
                      <Search size={32} className="mx-auto mb-4 opacity-20 animate-pulse" />
                      <p>Loading network graph...</p>
                    </div>
                  ) : relationships.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-slate-500">
                      <Search size={32} className="mx-auto mb-4 opacity-20" />
                      <p>No connections found.</p>
                    </div>
                  ) : (
                    <NetworkGraph
                      entities={graphData.entities}
                      relationships={graphData.relationships}
                      onEntityClick={(node) => {
                        if (String(node.id) !== String(entity?.id)) {
                          window.open(`/entities/${node.id}`, '_blank');
                        }
                      }}
                      maxNodes={50}
                    />
                  )}
                </div>
              )}
            </div>
          </motion.div>
        </div>
      </AnimatePresence>
    </Profiler>,
    document.body,
  );
};
