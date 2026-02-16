import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Calendar,
  ChevronDown,
  Download,
  FileText,
  Flag,
  Link2,
  PlusCircle,
  Sparkles,
  Users,
  X,
} from 'lucide-react';
import { apiClient } from '../../services/apiClient';
import { useModalFocusTrap } from '../../hooks/useModalFocusTrap';
import { useScrollLock } from '../../hooks/useScrollLock';
import { AddToInvestigationButton } from '../common/AddToInvestigationButton';
import { CollapsibleSplitPane } from '../common/CollapsibleSplitPane';
import { EvidenceModal } from '../common/EvidenceModal';
import { DocumentAnnotationSystem } from './DocumentAnnotationSystem';
import { InvestigationTextRenderer } from './InvestigationTextRenderer';
import { DocumentDiffView } from './DocumentDiffView';
import { ProvenancePanel } from './ProvenancePanel';

interface Props {
  id: string;
  searchTerm?: string;
  onClose: () => void;
  initialDoc?: any;
}

type ViewerTab = 'summary' | 'clean' | 'ocr' | 'diff' | 'entities' | 'annotations' | 'provenance';

const VIEWER_TABS: Array<{ key: ViewerTab; label: string }> = [
  { key: 'summary', label: 'Summary' },
  { key: 'clean', label: 'Clean Text' },
  { key: 'ocr', label: 'Original OCR' },
  { key: 'diff', label: 'Diff View' },
  { key: 'entities', label: 'Entities' },
  { key: 'annotations', label: 'Annotations' },
  { key: 'provenance', label: 'Provenance' },
];

const normalizeScore = (doc: any): number => {
  const raw =
    typeof doc?.redFlagScore === 'number'
      ? doc.redFlagScore
      : typeof doc?.red_flag_score === 'number'
        ? doc.red_flag_score
        : typeof doc?.redFlagRating === 'number'
          ? doc.redFlagRating
          : Number(doc?.red_flag_rating || 0);

  if (!Number.isFinite(raw)) return 0;
  if (raw <= 5) return Math.max(0, raw);
  if (raw <= 100) return Math.max(0, Math.min(5, raw / 20));
  return 5;
};

const severityLabel = (score: number): 'Low' | 'Medium' | 'High' => {
  if (score >= 3.5) return 'High';
  if (score >= 2.0) return 'Medium';
  return 'Low';
};

const formatDate = (value: string | null | undefined): string => {
  if (!value) return 'N/A';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toISOString();
};

const normalizeList = (candidate: unknown): string[] => {
  if (!candidate) return [];
  if (Array.isArray(candidate)) {
    return candidate.map((entry) => String(entry || '').trim()).filter((entry) => entry.length > 0);
  }
  if (typeof candidate === 'string') {
    return candidate
      .split(/[\n;,]/)
      .map((entry) => entry.trim())
      .filter((entry) => entry.length > 0);
  }
  return [];
};

const toSentenceBullets = (text: string, max = 5): string[] => {
  if (!text) return [];

  const lineBullets = text
    .split(/\n+/)
    .map((line) => line.replace(/^[-*\u2022\d.)\s]+/, '').trim())
    .filter((line) => line.length > 20);
  if (lineBullets.length >= 2) return lineBullets.slice(0, max);

  const sentenceBullets = text
    .split(/(?<=[.!?])\s+/)
    .map((line) => line.trim())
    .filter((line) => line.length > 35)
    .slice(0, max);

  return sentenceBullets;
};

const deriveSummary = (doc: any): { bullets: string[]; sourceLabel: string } => {
  const metadata = doc?.metadata || {};
  const aiSummary =
    (typeof metadata.ai_summary === 'string' && metadata.ai_summary.trim()) ||
    (typeof metadata.summary === 'string' && metadata.summary.trim()) ||
    (typeof doc?.ai_summary === 'string' && doc.ai_summary.trim()) ||
    '';

  const aiBullets = toSentenceBullets(aiSummary, 5);
  if (aiBullets.length > 0) {
    return { bullets: aiBullets, sourceLabel: 'AI summary' };
  }

  const extractedText = String(doc?.contentRefined || doc?.content || '').trim();
  const extractedBullets = toSentenceBullets(extractedText, 5);
  if (extractedBullets.length > 0) {
    return { bullets: extractedBullets, sourceLabel: 'Derived from extracted text' };
  }

  return { bullets: [], sourceLabel: 'No summary available for this document.' };
};

export const DocumentModal: React.FC<Props> = ({ id, searchTerm, onClose, initialDoc }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const contentRef = useRef<HTMLDivElement>(null);

  const urlParams = new URLSearchParams(location.search);
  const caseIdFromQuery = urlParams.get('caseId');
  const canReturnToCase =
    location.pathname.startsWith('/investigations') ||
    location.pathname.startsWith('/investigate/case/') ||
    !!caseIdFromQuery;

  const handleBackToCase = () => {
    if (caseIdFromQuery) {
      navigate(`/investigations/${caseIdFromQuery}?tab=casefolder`);
      return;
    }
    onClose();
  };

  const readTab = (): ViewerTab => {
    const current = urlParams.get('modalTab');
    if (current && VIEWER_TABS.some((tab) => tab.key === current)) {
      return current as ViewerTab;
    }
    return 'summary';
  };

  const activeTab = readTab();

  const setActiveTab = (tab: ViewerTab) => {
    const params = new URLSearchParams(location.search);
    params.set('modalTab', tab);
    navigate(`${location.pathname}?${params.toString()}`);
  };

  const [doc, setDoc] = useState<any | null>(initialDoc || null);
  const [thread, setThread] = useState<{ threadId: string; messages: any[] } | null>(null);
  const [selectedEntity, setSelectedEntity] = useState<any | null>(null);
  const [entityModalId, setEntityModalId] = useState<string | null>(null);
  const [showRecoveryHighlights, setShowRecoveryHighlights] = useState(true);
  const [showRiskDetails, setShowRiskDetails] = useState(false);
  const [expandedEntities, setExpandedEntities] = useState(false);
  const [rightPaneCollapsed, setRightPaneCollapsed] = useState(false);
  const [rightPaneWidth, setRightPaneWidth] = useState(320);

  const { modalRef } = useModalFocusTrap(true);
  useScrollLock(true);

  useEffect(() => {
    let mounted = true;
    apiClient
      .getDocument(id)
      .then((nextDoc) => {
        if (mounted) setDoc(nextDoc);
      })
      .catch(() => {
        // Keep initial doc if request fails.
      });

    apiClient
      .getDocumentThread(id)
      .then((nextThread) => {
        if (mounted) setThread(nextThread);
      })
      .catch(() => {
        // optional
      });

    return () => {
      mounted = false;
    };
  }, [id]);

  useEffect(() => {
    const announcement = document.createElement('div');
    announcement.setAttribute('aria-live', 'polite');
    announcement.setAttribute('aria-atomic', 'true');
    announcement.className = 'sr-only';
    announcement.textContent = `Opened document ${doc?.title || doc?.fileName || 'untitled'}`;
    document.body.appendChild(announcement);
    return () => {
      document.body.removeChild(announcement);
    };
  }, [doc?.title, doc?.fileName]);

  useEffect(() => {
    if (!searchTerm || !contentRef.current || !['clean', 'ocr'].includes(activeTab)) return;
    const timeout = setTimeout(() => {
      const firstMark = contentRef.current?.querySelector('mark');
      if (firstMark) firstMark.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 120);
    return () => clearTimeout(timeout);
  }, [activeTab, searchTerm, doc?.content, doc?.contentRefined]);

  const entities = useMemo(() => {
    const fromDoc = Array.isArray(doc?.entities) ? doc.entities : [];
    const fromMentioned = Array.isArray(doc?.mentionedEntities) ? doc.mentionedEntities : [];
    const byName = new Map<string, any>();

    [...fromDoc, ...fromMentioned].forEach((entity: any) => {
      const name = String(entity?.full_name || entity?.name || '').trim();
      if (!name) return;
      if (!byName.has(name.toLowerCase())) {
        byName.set(name.toLowerCase(), { ...entity, name });
      }
    });

    return Array.from(byName.values());
  }, [doc]);

  const caseLinks = useMemo(
    () =>
      normalizeList(
        doc?.caseLinks ||
          doc?.metadata?.caseLinks ||
          doc?.metadata?.case_refs ||
          doc?.metadata?.legalCase,
      ),
    [doc],
  );

  const timelineReferences = useMemo(
    () =>
      normalizeList(
        doc?.timelineReferences ||
          doc?.metadata?.timelineReferences ||
          doc?.metadata?.timeline_refs ||
          doc?.metadata?.timeline,
      ),
    [doc],
  );

  const summary = useMemo(() => deriveSummary(doc || {}), [doc]);

  const riskScore = useMemo(() => normalizeScore(doc || {}), [doc]);
  const riskSeverity = severityLabel(riskScore);

  const riskDrivers = useMemo(() => {
    const metadata = doc?.metadata || {};
    const candidates = [
      ...(Array.isArray(doc?.redFlagIndicators) ? doc.redFlagIndicators : []),
      ...(Array.isArray(metadata?.red_flag_drivers) ? metadata.red_flag_drivers : []),
      ...(Array.isArray(metadata?.sensitivity_flags) ? metadata.sensitivity_flags : []),
    ];

    const sanitized = candidates
      .map((driver) => String(driver || '').trim())
      .filter((driver) => driver.length > 0);

    if (sanitized.length > 0) return sanitized;

    const fallback: string[] = [];
    if (entities.length >= 10) fallback.push('High entity density in document text');
    if (summary.sourceLabel === 'AI summary')
      fallback.push('AI summary detected material findings');
    if (doc?.evidenceType === 'email') fallback.push('Communication evidence category');
    if (doc?.unredaction_metrics?.unredactedTextGain) {
      fallback.push(
        `Recovered text gain: ${Math.round((doc.unredaction_metrics.unredactedTextGain || 0) * 100)}%`,
      );
    }
    return fallback.length > 0 ? fallback : ['No explicit driver metadata available.'];
  }, [doc, entities.length, summary.sourceLabel]);

  if (!doc) {
    return createPortal(
      <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-[1050] flex items-center justify-center p-4">
        <div className="surface-glass p-6 pointer-events-auto">
          <div className="text-white font-semibold mb-2">Unable to load document</div>
          <div className="text-slate-400 mb-4">
            Please try again or open in the Document Browser.
          </div>
          <button onClick={onClose} className="control px-4 text-white">
            Close
          </button>
        </div>
      </div>,
      document.body,
    );
  }

  const downloadText = () => {
    const blob = new Blob([String(doc.content || '')], { type: 'text/plain' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${doc.fileName || 'document'}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const cleanText = String(doc.contentRefined || doc.content || '');
  const ocrText = String(doc.content || '');

  const mainPanel = () => {
    if (activeTab === 'summary') {
      return (
        <div className="space-y-4">
          <section className="surface-quiet p-4">
            <h3 className="text-sm font-semibold text-slate-100 mb-2 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-violet-300" />
              Summary
            </h3>
            {summary.bullets.length > 0 ? (
              <ul className="list-disc pl-5 space-y-1 text-slate-200 text-sm leading-relaxed">
                {summary.bullets.slice(0, 5).map((bullet, index) => (
                  <li key={`summary-${index}`}>{bullet}</li>
                ))}
              </ul>
            ) : (
              <p className="text-slate-400 text-sm">No summary available for this document.</p>
            )}
            <div className="text-xs text-slate-500 mt-3">{summary.sourceLabel}</div>
          </section>

          <InvestigationTextRenderer
            document={doc}
            mode="clean"
            searchTerm={searchTerm}
            showRecoveryHighlights={showRecoveryHighlights}
            onToggleRecoveryHighlights={setShowRecoveryHighlights}
            onEntitySelect={(entity) => setSelectedEntity(entity)}
          />
        </div>
      );
    }

    if (activeTab === 'clean') {
      return (
        <InvestigationTextRenderer
          document={doc}
          mode="clean"
          searchTerm={searchTerm}
          showRecoveryHighlights={showRecoveryHighlights}
          onToggleRecoveryHighlights={setShowRecoveryHighlights}
          onEntitySelect={(entity) => setSelectedEntity(entity)}
        />
      );
    }

    if (activeTab === 'ocr') {
      return (
        <InvestigationTextRenderer
          document={doc}
          mode="ocr"
          searchTerm={searchTerm}
          showRecoveryHighlights={false}
          onToggleRecoveryHighlights={setShowRecoveryHighlights}
          onEntitySelect={(entity) => setSelectedEntity(entity)}
        />
      );
    }

    if (activeTab === 'diff') {
      return <DocumentDiffView cleanText={cleanText} originalText={ocrText} />;
    }

    if (activeTab === 'entities') {
      return (
        <div className="surface-quiet p-4 space-y-3">
          <h3 className="text-sm font-semibold text-slate-100">Entities ({entities.length})</h3>
          {entities.length === 0 ? (
            <p className="text-sm text-slate-400">
              No extracted entities available for this document.
            </p>
          ) : (
            <ul className="space-y-2">
              {entities.map((entity, index) => (
                <li
                  key={`${entity.id || entity.name}-${index}`}
                  className="flex items-center justify-between gap-3"
                >
                  <button
                    type="button"
                    className="text-left text-sm text-cyan-300 hover:text-cyan-200 underline decoration-cyan-500/60"
                    onClick={() => setSelectedEntity(entity)}
                  >
                    {entity.name}
                  </button>
                  <span className="text-xs text-slate-500">
                    {entity.entity_type || entity.type || 'entity'}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      );
    }

    if (activeTab === 'annotations') {
      return (
        <DocumentAnnotationSystem
          documentId={String(doc.id || id)}
          content={cleanText || ocrText}
          searchTerm={searchTerm}
          mode="full"
        />
      );
    }

    return <ProvenancePanel document={doc} />;
  };

  const rightRail = (
    <div className="h-full flex flex-col items-center py-3 gap-2">
      <button
        type="button"
        onClick={() => setRightPaneCollapsed(false)}
        className="control h-8 w-8 p-0 flex items-center justify-center text-cyan-300 hover:text-cyan-100"
        title="Expand details panel"
        aria-label="Expand details panel"
      >
        <FileText className="w-4 h-4" />
      </button>
      <span className="h-px w-5 bg-slate-700/80" />
      <Users className="w-4 h-4 text-slate-500" aria-hidden="true" />
      <Link2 className="w-4 h-4 text-slate-500" aria-hidden="true" />
      <Calendar className="w-4 h-4 text-slate-500" aria-hidden="true" />
      <PlusCircle className="w-4 h-4 text-slate-500" aria-hidden="true" />
    </div>
  );

  const rightPaneContent = (
    <div className="lg:sticky lg:top-4 space-y-3">
      <section className="surface-quiet p-3">
        <h3 className="text-xs uppercase tracking-wide text-slate-400 mb-2">Document info</h3>
        <dl className="space-y-2 text-xs">
          <div>
            <dt className="text-slate-500">Document id</dt>
            <dd className="font-mono text-slate-200">{String(doc.id || id)}</dd>
          </div>
          <div>
            <dt className="text-slate-500">Source collection</dt>
            <dd className="text-slate-200">{doc.metadata?.source_collection || 'N/A'}</dd>
          </div>
          <div>
            <dt className="text-slate-500">Thread messages</dt>
            <dd className="text-slate-200">{thread?.messages?.length || 0}</dd>
          </div>
        </dl>
      </section>

      <section className="surface-quiet p-3">
        <button
          type="button"
          onClick={() => setExpandedEntities((previous) => !previous)}
          className="w-full flex items-center justify-between text-left"
        >
          <h3 className="text-xs uppercase tracking-wide text-slate-400">
            Entities ({entities.length})
          </h3>
          <ChevronDown
            className={`w-4 h-4 text-slate-400 transition-transform ${expandedEntities ? 'rotate-180' : ''}`}
          />
        </button>
        {expandedEntities && (
          <div className="mt-2 space-y-1">
            {entities.length === 0 && (
              <p className="text-xs text-slate-500">No entities extracted.</p>
            )}
            {entities.map((entity, index) => (
              <button
                key={`${entity.id || entity.name}-${index}`}
                className={`w-full text-left px-2 py-1.5 rounded text-xs transition-colors ${
                  selectedEntity?.name === entity.name
                    ? 'bg-slate-700/70 text-cyan-200'
                    : 'bg-slate-800/65 text-slate-300 hover:bg-slate-700/70'
                }`}
                onClick={() => setSelectedEntity(entity)}
              >
                <span className="font-medium">{entity.name}</span>
                <span className="ml-1 text-slate-500">
                  {entity.entity_type || entity.type || 'entity'}
                </span>
              </button>
            ))}
          </div>
        )}
        {selectedEntity && (
          <div className="mt-3 pt-3 border-t border-slate-700/70 space-y-2">
            <div className="text-sm text-slate-100 font-medium">{selectedEntity.name}</div>
            <div className="text-xs text-slate-500">{selectedEntity.entity_type || 'Entity'}</div>
            <div className="flex items-center gap-2">
              <AddToInvestigationButton
                item={{
                  id: String(selectedEntity.id || selectedEntity.entity_id || selectedEntity.name),
                  title: selectedEntity.name,
                  description: selectedEntity.summary || selectedEntity.role || '',
                  type: 'entity',
                  sourceId: String(
                    selectedEntity.id || selectedEntity.entity_id || selectedEntity.name,
                  ),
                  metadata: {
                    entity_id: selectedEntity.id || selectedEntity.entity_id || null,
                  },
                }}
                variant="quick"
                className="text-slate-200"
              />
              {Number.isFinite(Number(selectedEntity.id)) && (
                <button
                  className="control h-8 px-2 text-xs"
                  onClick={() => setEntityModalId(String(selectedEntity.id))}
                >
                  Open entity
                </button>
              )}
            </div>
          </div>
        )}
      </section>

      <section className="surface-quiet p-3">
        <h3 className="text-xs uppercase tracking-wide text-slate-400 mb-2">Case links</h3>
        {caseLinks.length === 0 ? (
          <p className="text-xs text-slate-500">No case links attached.</p>
        ) : (
          <ul className="space-y-1 text-xs text-slate-200">
            {caseLinks.map((entry, index) => (
              <li key={`case-link-${index}`}>• {entry}</li>
            ))}
          </ul>
        )}
      </section>

      <section className="surface-quiet p-3">
        <h3 className="text-xs uppercase tracking-wide text-slate-400 mb-2">Timeline references</h3>
        {timelineReferences.length === 0 ? (
          <p className="text-xs text-slate-500">No timeline references attached.</p>
        ) : (
          <ul className="space-y-1 text-xs text-slate-200">
            {timelineReferences.map((entry, index) => (
              <li key={`timeline-ref-${index}`}>• {entry}</li>
            ))}
          </ul>
        )}
      </section>

      <section className="surface-quiet p-3">
        <h3 className="text-xs uppercase tracking-wide text-slate-400 mb-2">
          Add to investigation
        </h3>
        <AddToInvestigationButton
          item={{
            id: String(doc.id || id),
            title: doc.title || doc.fileName || `Document ${id}`,
            description: doc.description || doc.contentPreview || '',
            type: 'document',
            sourceId: String(doc.id || id),
            metadata: {
              document_id: doc.id || id,
              ingest_run_id: doc.ingestRunId || doc.ingest_run_id || null,
            },
          }}
          variant="quick"
          className="text-slate-200"
        />
      </section>
    </div>
  );

  const portal = createPortal(
    <div
      id="DocumentModal"
      ref={modalRef}
      className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-[10000] flex items-center justify-center p-0 md:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="document-modal-title"
      onClick={onClose}
    >
      <div
        className="surface-glass rounded-none md:rounded-[var(--radius-lg)] w-full h-full md:max-w-7xl md:max-h-[95vh] overflow-hidden flex flex-col border-0 md:border pointer-events-auto"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between p-4 border-b border-slate-700/60 bg-slate-900/75 gap-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <FileText className="w-5 h-5 text-cyan-400" />
              <h2 id="document-modal-title" className="text-lg font-semibold text-white truncate">
                {doc.title || doc.fileName}
              </h2>
            </div>
            <div className="flex flex-wrap items-center gap-2 text-xs text-slate-300">
              <span className="chip px-2 py-1">
                {doc.evidenceType || doc.fileType || 'Document'}
              </span>
              <span className="chip px-2 py-1">
                Updated {formatDate(doc.dateModified || doc.updatedAt)}
              </span>
              <button
                type="button"
                onClick={() => setShowRiskDetails((previous) => !previous)}
                className="chip px-2 py-1 text-rose-200 hover:text-white inline-flex items-center gap-1"
                aria-expanded={showRiskDetails}
              >
                <Flag className="w-3.5 h-3.5" /> {riskScore.toFixed(1)} / 5 · {riskSeverity}
                <ChevronDown
                  className={`w-3.5 h-3.5 transition-transform ${showRiskDetails ? 'rotate-180' : ''}`}
                />
              </button>
            </div>
            {showRiskDetails && (
              <div className="mt-2 text-xs text-slate-300 space-y-1">
                {riskDrivers.map((driver, index) => (
                  <div key={`risk-driver-${index}`} className="leading-relaxed">
                    • {driver}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {canReturnToCase && (
              <button
                onClick={handleBackToCase}
                className="control h-10 px-3 flex items-center justify-center text-slate-300 hover:text-white gap-1.5"
                title="Back to case"
              >
                <ArrowLeft className="w-4 h-4" />
                <span className="text-xs">Case</span>
              </button>
            )}
            <AddToInvestigationButton
              item={{
                id: String(doc.id || id),
                title: doc.title || doc.fileName || `Document ${id}`,
                description: doc.description || doc.contentPreview || '',
                type: 'document',
                sourceId: String(doc.id || id),
                metadata: {
                  document_id: doc.id || id,
                  ingest_run_id: doc.ingestRunId || doc.ingest_run_id || null,
                  pipeline_version: doc.pipelineVersion || doc.pipeline_version || null,
                },
              }}
              variant="quick"
              className="text-slate-200"
            />
            <button
              onClick={downloadText}
              className="control h-10 w-10 p-0 flex items-center justify-center text-slate-300 hover:text-white"
              title="Download OCR text"
            >
              <Download className="w-4 h-4" />
            </button>
            <button
              onClick={onClose}
              className="control h-10 w-10 p-0 flex items-center justify-center text-slate-300 hover:text-white"
              aria-label="Close document"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="flex border-b border-slate-700/60 bg-slate-900/65 overflow-x-auto px-3 py-2 gap-2">
          {VIEWER_TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`h-10 px-4 text-sm chip ${
                activeTab === tab.key
                  ? 'text-cyan-200 border-cyan-300/45 bg-slate-700/70'
                  : 'text-slate-300 hover:text-white hover:bg-slate-700/60'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="flex-1 min-h-0">
          <div className="h-full">
            <div className="h-full lg:hidden">
              <div ref={contentRef} className="h-full overflow-y-auto p-4 md:p-6">
                {mainPanel()}
                <div className="mt-4 pt-4 border-t border-slate-700/60">{rightPaneContent}</div>
              </div>
            </div>
            <div className="hidden lg:block h-full">
              <CollapsibleSplitPane
                left={
                  <div ref={contentRef} className="h-full overflow-y-auto p-4 md:p-6">
                    {mainPanel()}
                  </div>
                }
                right={<aside className="h-full p-4">{rightPaneContent}</aside>}
                collapsedRight={rightRail}
                defaultRightWidth={rightPaneWidth}
                minRightWidth={280}
                maxRightWidth={520}
                collapsedWidth={84}
                rightCollapsed={rightPaneCollapsed}
                onRightCollapsedChange={setRightPaneCollapsed}
                onRightWidthChange={setRightPaneWidth}
                dividerAriaLabel="Resize document details panel"
                collapseAriaLabel="Collapse document details panel"
                expandAriaLabel="Expand document details panel"
              />
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );

  return entityModalId ? (
    <>
      {portal}
      <EvidenceModal
        entityId={entityModalId}
        isOpen={true}
        onClose={() => setEntityModalId(null)}
      />
    </>
  ) : (
    portal
  );
};

export default DocumentModal;
