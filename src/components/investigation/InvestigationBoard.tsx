import React, { Profiler, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import { Target, FileText, BookOpen, GripVertical, Plus } from 'lucide-react';
import { EvidenceItem, Hypothesis } from '../../types/investigation';
import { apiClient } from '../../services/apiClient';
import { PerformanceMonitor } from '../../utils/performanceMonitor';
import { DocumentModal } from '../documents/DocumentModal';
import { BoardOnboarding } from './BoardOnboarding';

interface InvestigationBoardProps {
  investigationId: string;
}

const PAGE_SIZE = 120;

const ensureArray = <T,>(value: unknown): T[] => (Array.isArray(value) ? (value as T[]) : []);

const useVirtualWindow = (itemCount: number, rowHeight: number, overscan = 6) => {
  const [containerHeight, setContainerHeight] = useState(520);
  const [scrollTop, setScrollTop] = useState(0);

  const startIndex = Math.max(0, Math.floor(scrollTop / rowHeight) - overscan);
  const visibleCount = Math.ceil(containerHeight / rowHeight) + overscan * 2;
  const endIndex = Math.min(itemCount, startIndex + visibleCount);

  return {
    startIndex,
    endIndex,
    topSpacer: startIndex * rowHeight,
    bottomSpacer: Math.max(0, (itemCount - endIndex) * rowHeight),
    setContainerHeight,
    setScrollTop,
  };
};

const invokeIdle = (cb: () => void) => {
  if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
    (window as any).requestIdleCallback(cb, { timeout: 300 });
    return;
  }
  setTimeout(cb, 0);
};

export const InvestigationBoard: React.FC<InvestigationBoardProps> = ({ investigationId }) => {
  const [hypotheses, setHypotheses] = useState<Hypothesis[]>([]);
  const [evidence, setEvidence] = useState<EvidenceItem[]>([]);
  const [notebook, setNotebook] = useState<number[]>([]);
  const [evidenceTotal, setEvidenceTotal] = useState(0);
  const [draggedEvidence, setDraggedEvidence] = useState<EvidenceItem | null>(null);
  const [loadingShell, setLoadingShell] = useState(true);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [hasLoadedDetails, setHasLoadedDetails] = useState(false);
  const [isLoadingMoreEvidence, setIsLoadingMoreEvidence] = useState(false);
  const [evidenceOffset, setEvidenceOffset] = useState(0);

  const [viewingEvidence, setViewingEvidence] = useState<EvidenceItem | null>(null);
  const [showHypothesisModal, setShowHypothesisModal] = useState(false);
  const [newHypothesisTitle, setNewHypothesisTitle] = useState('');
  const [newHypothesisDesc, setNewHypothesisDesc] = useState('');
  const [showOnboarding, setShowOnboarding] = useState(false);

  const evidenceContainerRef = useRef<HTMLDivElement | null>(null);
  const hypothesesContainerRef = useRef<HTMLDivElement | null>(null);

  const evidenceVirtual = useVirtualWindow(evidence.length, 88);
  const hypothesesVirtual = useVirtualWindow(hypotheses.length, 134);

  useEffect(() => {
    const seen = localStorage.getItem('board_onboarding_seen');
    if (!seen) setShowOnboarding(true);
  }, []);

  const handleOnboardingComplete = () => {
    setShowOnboarding(false);
    localStorage.setItem('board_onboarding_seen', 'true');
  };

  const loadEvidencePage = useCallback(
    async (offset: number, reset = false) => {
      setIsLoadingMoreEvidence(true);
      try {
        const page = await apiClient.getInvestigationEvidencePage(investigationId, {
          limit: PAGE_SIZE,
          offset,
        });
        const nextRows = ensureArray<any>(page?.data);
        const normalized = nextRows.map((row: any) => ({
          id: String(row.id),
          title: row.title || 'Untitled evidence',
          description: row.description || '',
          type: (row.type || 'document') as EvidenceItem['type'],
          sourceId: String(row.source_id || row.sourceId || row.id || ''),
          source: row.source_path || row.source || '',
          relevance: (row.relevance || 'medium') as EvidenceItem['relevance'],
          credibility: 'verified' as const,
          extractedAt: new Date(row.extracted_at || Date.now()),
          extractedBy: row.extracted_by || 'system',
        }));

        setEvidence((prev) => (reset ? normalized : [...prev, ...normalized]));
        setEvidenceOffset(offset + normalized.length);
        setEvidenceTotal(Number(page?.total || normalized.length));
      } finally {
        setIsLoadingMoreEvidence(false);
      }
    },
    [investigationId],
  );

  useEffect(() => {
    let mounted = true;

    const hydrateBoard = async () => {
      PerformanceMonitor.mark('investigation-board-fetch-start');
      setLoadingShell(true);
      setHasLoadedDetails(false);
      setEvidence([]);
      setEvidenceOffset(0);

      try {
        const snapshot = await apiClient.getInvestigationBoard(investigationId, {
          evidenceLimit: 80,
          hypothesisLimit: 24,
        });

        if (!mounted) return;

        const previewEvidence = ensureArray<any>(snapshot?.evidencePreview).map((row: any) => ({
          id: String(row.id),
          title: row.title || 'Untitled evidence',
          description: row.description || '',
          type: (row.type || 'document') as EvidenceItem['type'],
          sourceId: String(row.source_id || row.sourceId || row.id || ''),
          source: row.source_path || row.source || '',
          relevance: (row.relevance || 'medium') as EvidenceItem['relevance'],
          credibility: 'verified' as const,
          extractedAt: new Date(row.extracted_at || Date.now()),
          extractedBy: row.extracted_by || 'system',
        }));

        const previewHypotheses = ensureArray<any>(snapshot?.hypothesesPreview).map((h: any) => ({
          id: String(h.id),
          investigationId,
          title: h.title || 'Untitled hypothesis',
          description: h.description || '',
          status: h.status || 'proposed',
          evidence: [],
          confidence: Number(h.confidence || 0),
          createdBy: 'system',
          createdAt: new Date(),
          relatedHypotheses: [],
        }));

        setHypotheses(previewHypotheses as Hypothesis[]);
        setEvidence(previewEvidence as EvidenceItem[]);
        setEvidenceOffset(previewEvidence.length);
        setEvidenceTotal(Number(snapshot?.evidenceCount || previewEvidence.length));

        const initialOrder = ensureArray<number>(snapshot?.notebookOrder || []);
        setNotebook(initialOrder);

        PerformanceMonitor.mark('investigation-board-shell-visible');
        PerformanceMonitor.measure(
          'investigation-board-shell-visible-duration',
          'investigation-board-fetch-start',
          'investigation-board-shell-visible',
        );
      } finally {
        if (mounted) setLoadingShell(false);
      }

      invokeIdle(async () => {
        if (!mounted) return;
        setLoadingDetails(true);
        PerformanceMonitor.mark('investigation-board-hydration-start');
        try {
          const [hypRes, nbRes] = await Promise.all([
            apiClient.get(`/investigations/${investigationId}/hypotheses`, { useCache: false }),
            apiClient.getInvestigationNotebook(investigationId),
          ]);

          if (!mounted) return;

          const fullHypotheses = ensureArray<any>(hypRes).map((h: any) => ({
            ...h,
            id: String(h.id),
            investigationId,
            evidence: ensureArray(h.evidence),
            relatedHypotheses: ensureArray(h.relatedHypotheses),
            createdAt: new Date(h.created_at || Date.now()),
            createdBy: h.created_by || 'system',
            confidence: Number(h.confidence || 0),
            status: h.status || 'proposed',
          }));
          setHypotheses(fullHypotheses as Hypothesis[]);

          if (Array.isArray(nbRes?.order)) setNotebook(nbRes.order);

          await loadEvidencePage(0, true);

          PerformanceMonitor.mark('investigation-board-hydration-end');
          PerformanceMonitor.measure(
            'investigation-board-hydration-duration',
            'investigation-board-hydration-start',
            'investigation-board-hydration-end',
          );
          setHasLoadedDetails(true);
        } catch (error) {
          console.error('Failed to hydrate investigation board details', error);
        } finally {
          if (mounted) setLoadingDetails(false);
        }
      });
    };

    hydrateBoard();

    return () => {
      mounted = false;
    };
  }, [investigationId, loadEvidencePage]);

  useEffect(() => {
    const node = evidenceContainerRef.current;
    if (!node) return;
    const onScroll = () => evidenceVirtual.setScrollTop(node.scrollTop);
    evidenceVirtual.setContainerHeight(node.clientHeight || 520);
    onScroll();
    node.addEventListener('scroll', onScroll, { passive: true });
    return () => node.removeEventListener('scroll', onScroll);
  }, [evidenceVirtual]);

  useEffect(() => {
    const node = hypothesesContainerRef.current;
    if (!node) return;
    const onScroll = () => hypothesesVirtual.setScrollTop(node.scrollTop);
    hypothesesVirtual.setContainerHeight(node.clientHeight || 520);
    onScroll();
    node.addEventListener('scroll', onScroll, { passive: true });
    return () => node.removeEventListener('scroll', onScroll);
  }, [hypothesesVirtual]);

  const displayedHypotheses = useMemo(
    () => hypotheses.slice(hypothesesVirtual.startIndex, hypothesesVirtual.endIndex),
    [hypotheses, hypothesesVirtual.endIndex, hypothesesVirtual.startIndex],
  );

  const displayedEvidence = useMemo(
    () => evidence.slice(evidenceVirtual.startIndex, evidenceVirtual.endIndex),
    [evidence, evidenceVirtual.endIndex, evidenceVirtual.startIndex],
  );

  const handleCreateHypothesis = async () => {
    if (!newHypothesisTitle.trim()) return;

    try {
      const created = await apiClient.post<any>(`/investigations/${investigationId}/hypotheses`, {
        title: newHypothesisTitle,
        description: newHypothesisDesc,
        status: 'draft',
      });

      setHypotheses((prev) => [
        {
          id: String(created.id),
          investigationId,
          title: created.title,
          description: created.description || '',
          status: created.status || 'proposed',
          evidence: [],
          confidence: 0,
          createdBy: 'current-user',
          createdAt: new Date(),
          relatedHypotheses: [],
        } as Hypothesis,
        ...prev,
      ]);
      setShowHypothesisModal(false);
      setNewHypothesisTitle('');
      setNewHypothesisDesc('');
    } catch (err) {
      console.error('Failed to create hypothesis', err);
    }
  };

  const handleDragStart = (e: React.DragEvent, item: EvidenceItem) => {
    setDraggedEvidence(item);
    e.dataTransfer.setData('application/json', JSON.stringify(item));
    e.dataTransfer.effectAllowed = 'copy';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
  };

  const handleDropOnHypothesis = async (e: React.DragEvent, hypothesisId: string) => {
    e.preventDefault();
    if (!draggedEvidence) return;

    try {
      await apiClient.post(
        `/investigations/${investigationId}/hypotheses/${hypothesisId}/evidence`,
        {
          evidenceId: draggedEvidence.id,
          relevance: 'supporting',
        },
      );

      setHypotheses((prev) =>
        prev.map((h) => {
          if (String(h.id) !== String(hypothesisId)) return h;
          return {
            ...h,
            evidenceLinks: [
              ...((h as any).evidenceLinks || []),
              {
                id: `temp-${Date.now()}`,
                evidenceId: draggedEvidence.id,
                evidence_title: draggedEvidence.title,
                relevance: 'supporting',
              },
            ],
          };
        }),
      );
    } catch (err) {
      console.error('Failed to link evidence', err);
    }
    setDraggedEvidence(null);
  };

  const handleDropOnNotebook = async (e: React.DragEvent) => {
    e.preventDefault();
    if (!draggedEvidence) return;
    const evidenceId = Number(draggedEvidence.id);
    if (!Number.isFinite(evidenceId)) return;

    try {
      const newOrder = [...notebook, evidenceId];
      await apiClient.updateInvestigationNotebook(investigationId, { order: newOrder });
      setNotebook(newOrder);
    } catch (err) {
      console.error('Failed to update notebook', err);
    }
    setDraggedEvidence(null);
  };

  const onBoardRender = (_id: string, phase: 'mount' | 'update', actualDuration: number): void => {
    PerformanceMonitor.logRender('InvestigationBoard', actualDuration, phase);
  };

  return (
    <Profiler id="InvestigationBoard" onRender={onBoardRender}>
      <div className="flex h-full bg-slate-950 overflow-hidden">
        <div className="absolute top-4 right-4 z-10">
          <button
            onClick={() => window.open(`/api/investigations/${investigationId}/briefing`, '_blank')}
            className="flex items-center gap-2 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm rounded-lg shadow-lg transition-colors"
          >
            <FileText className="w-4 h-4" />
            Export Briefing
          </button>
        </div>

        <div className="w-1/3 border-r border-slate-800 flex flex-col min-w-[300px]">
          <div className="p-4 border-b border-slate-800 bg-slate-900/50 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Target className="w-5 h-5 text-purple-400" />
              <h3 className="font-semibold text-white">Hypotheses</h3>
            </div>
            <button
              onClick={() => setShowHypothesisModal(true)}
              className="p-1 hover:bg-slate-800 rounded text-slate-400 hover:text-white"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>

          {showHypothesisModal && (
            <div className="p-4 bg-slate-800/50 border-b border-slate-700 animate-in slide-in-from-top-2">
              <input
                type="text"
                placeholder="Theory title..."
                className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-2 text-sm text-white mb-2 focus:ring-2 focus:ring-purple-500 outline-none"
                value={newHypothesisTitle}
                onChange={(e) => setNewHypothesisTitle(e.target.value)}
                autoFocus
              />
              <textarea
                placeholder="Description..."
                className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-2 text-sm text-white mb-2 focus:ring-2 focus:ring-purple-500 outline-none resize-none"
                rows={2}
                value={newHypothesisDesc}
                onChange={(e) => setNewHypothesisDesc(e.target.value)}
              />
              <div className="flex justify-end gap-2">
                <button
                  onClick={() => setShowHypothesisModal(false)}
                  className="text-xs text-slate-400 hover:text-white px-2 py-1"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateHypothesis}
                  disabled={!newHypothesisTitle.trim()}
                  className="bg-purple-600 hover:bg-purple-500 text-white text-xs px-3 py-1 rounded disabled:opacity-50"
                >
                  Add Theory
                </button>
              </div>
            </div>
          )}

          <div
            ref={hypothesesContainerRef}
            className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-900/20"
          >
            {loadingShell && (
              <div className="space-y-3">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div
                    key={`hyp-skeleton-${i}`}
                    className="h-28 rounded-lg bg-slate-800/70 border border-slate-700 animate-pulse"
                  />
                ))}
              </div>
            )}

            {!loadingShell && hypotheses.length > 0 && (
              <>
                {hypothesesVirtual.topSpacer > 0 && (
                  <div style={{ height: hypothesesVirtual.topSpacer }} />
                )}
                {displayedHypotheses.map((h: any) => (
                  <div
                    key={h.id}
                    onDragOver={handleDragOver}
                    onDrop={(e) => handleDropOnHypothesis(e, String(h.id))}
                    className="p-4 rounded-lg bg-slate-800 border border-slate-700 hover:border-purple-500/50 transition-colors group"
                  >
                    <h4 className="font-medium text-white mb-2">{h.title}</h4>
                    <p className="text-sm text-slate-400 line-clamp-2">{h.description}</p>
                    <div className="mt-3 text-xs text-slate-500 space-y-2">
                      <div className="flex items-center justify-between">
                        <span>{(h as any).evidenceLinks?.length || 0} Evidence</span>
                        <span
                          className={`px-2 py-0.5 rounded-full ${h.status === 'confirmed' ? 'bg-green-900/50 text-green-400' : 'bg-slate-700'}`}
                        >
                          {h.status}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
                {hypothesesVirtual.bottomSpacer > 0 && (
                  <div style={{ height: hypothesesVirtual.bottomSpacer }} />
                )}
              </>
            )}

            {!loadingShell && hypotheses.length === 0 && (
              <div className="text-center p-8 text-slate-500 border-2 border-dashed border-slate-800 rounded-lg flex flex-col items-center gap-2">
                <Target className="w-8 h-8 text-slate-600 mb-2" />
                <p className="font-medium text-slate-400">No hypotheses yet</p>
                <p className="text-sm">Click the + button above to define a theory to test.</p>
              </div>
            )}
          </div>
        </div>

        <div className="w-1/3 border-r border-slate-800 flex flex-col min-w-[300px] bg-slate-950">
          <div className="p-4 border-b border-slate-800 bg-slate-900/50 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-blue-400" />
              <h3 className="font-semibold text-white">Evidence Pool</h3>
            </div>
            <div className="text-xs text-slate-400">
              {evidence.length}/{evidenceTotal} loaded
            </div>
          </div>
          <div ref={evidenceContainerRef} className="flex-1 overflow-y-auto p-4 space-y-3">
            {loadingShell && (
              <div className="space-y-3">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div
                    key={`ev-skeleton-${i}`}
                    className="h-20 rounded bg-slate-900 border border-slate-800 animate-pulse"
                  />
                ))}
              </div>
            )}

            {!loadingShell && evidence.length > 0 && (
              <>
                {evidenceVirtual.topSpacer > 0 && (
                  <div style={{ height: evidenceVirtual.topSpacer }} />
                )}
                {displayedEvidence.map((e) => (
                  <div
                    key={e.id}
                    draggable
                    onDragStart={(ev) => handleDragStart(ev, e)}
                    onClick={() => setViewingEvidence(e)}
                    className="p-3 rounded bg-slate-900 border border-slate-800 hover:border-blue-500/50 cursor-grab active:cursor-grabbing flex items-start gap-3 group hover:bg-slate-800/50 transition-colors"
                  >
                    <GripVertical className="w-4 h-4 text-slate-600 mt-1" />
                    <div>
                      <h4 className="text-sm font-medium text-slate-200 group-hover:text-blue-300 transition-colors">
                        {e.title}
                      </h4>
                      <p className="text-xs text-slate-500 line-clamp-1 mt-1">{e.description}</p>
                      <span className="inline-block mt-2 px-1.5 py-0.5 bg-slate-800 rounded text-[10px] text-slate-400 uppercase tracking-wider">
                        {e.type}
                      </span>
                    </div>
                  </div>
                ))}
                {evidenceVirtual.bottomSpacer > 0 && (
                  <div style={{ height: evidenceVirtual.bottomSpacer }} />
                )}
              </>
            )}

            {!loadingShell && evidence.length === 0 && (
              <div className="text-center p-8 text-slate-500 flex flex-col items-center gap-2">
                <FileText className="w-8 h-8 text-slate-600 mb-2" />
                <p className="font-medium text-slate-400">Evidence Pool is empty</p>
                <p className="text-sm max-w-[200px]">
                  Browse documents or entities and click "Add to Investigation" to collect them
                  here.
                </p>
              </div>
            )}

            {!loadingShell && evidence.length < evidenceTotal && (
              <button
                onClick={() => loadEvidencePage(evidenceOffset, false)}
                disabled={isLoadingMoreEvidence}
                className="w-full py-2 rounded-md border border-slate-700 text-sm text-slate-200 hover:bg-slate-800 disabled:opacity-60"
              >
                {isLoadingMoreEvidence ? 'Loading more evidence...' : 'Load more evidence'}
              </button>
            )}
          </div>
        </div>

        <div className="w-1/3 flex flex-col min-w-[300px]">
          <div className="p-4 border-b border-slate-800 bg-slate-900/50 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-amber-400" />
              <h3 className="font-semibold text-white">Case Narrative</h3>
            </div>
          </div>
          <div
            className="flex-1 overflow-y-auto p-4 bg-slate-900/20"
            onDragOver={handleDragOver}
            onDrop={handleDropOnNotebook}
          >
            <div className="min-h-[200px] p-4 border-2 border-dashed border-slate-800/50 rounded-lg flex flex-col items-center justify-center text-slate-500 hover:bg-slate-800/30 transition-colors">
              {notebook.length === 0 && (
                <span className="mb-2">Drag evidence here to build your case</span>
              )}

              <div className="w-full space-y-2 mt-4">
                {notebook.map((itemId, idx) => {
                  const ev = evidence.find((entry) => Number(entry.id) === Number(itemId));
                  return (
                    <div
                      key={`${itemId}-${idx}`}
                      className="p-3 bg-slate-800 rounded border border-slate-700 flex flex-col gap-2"
                    >
                      <div className="flex items-start gap-2">
                        <span className="text-slate-500 font-mono text-xs mt-0.5">{idx + 1}.</span>
                        {ev ? (
                          <div>
                            <h4 className="text-sm font-medium text-slate-200">{ev.title}</h4>
                            <p className="text-xs text-slate-400 line-clamp-2">{ev.description}</p>
                          </div>
                        ) : (
                          <span className="text-sm text-slate-500">Loading item {itemId}...</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
            {(loadingDetails || !hasLoadedDetails) && (
              <p className="mt-3 text-xs text-slate-500">Hydrating full board details...</p>
            )}
          </div>
        </div>

        {viewingEvidence && (
          <DocumentModal id={String(viewingEvidence.id)} onClose={() => setViewingEvidence(null)} />
        )}

        <AnimatePresence>
          {showOnboarding && (
            <BoardOnboarding
              onComplete={handleOnboardingComplete}
              onSkip={handleOnboardingComplete}
            />
          )}
        </AnimatePresence>
      </div>
    </Profiler>
  );
};
