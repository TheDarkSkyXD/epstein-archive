import React, { useMemo, useState } from 'react';
import {
  Investigation,
  EvidenceItem,
  TimelineEvent,
  Hypothesis,
  Annotation,
} from '../../types/investigation';
import { Download, ShieldAlert, CheckCircle2, Clock } from 'lucide-react';
import { format } from 'date-fns';
import { useToasts } from '../common/useToasts';
import {
  buildEvidenceCsv,
  buildExportIntegrityMeta,
  buildTimelineExportJson,
  prependMarkdownMetadata,
} from '../../utils/investigationExportIntegrity';

interface ExportToolsProps {
  investigation: Investigation;
  evidence: EvidenceItem[];
  timelineEvents: TimelineEvent[];
  hypotheses: Hypothesis[];
  annotations: Annotation[];
}

type ExportType = 'report' | 'bundle' | 'evidence-csv' | 'timeline';

interface ExportOption {
  id: ExportType;
  title: string;
  description: string;
  available: boolean;
  unavailableReason?: string;
}

const exportOptions: ExportOption[] = [
  {
    id: 'report',
    title: 'PDF report (via briefing markdown)',
    description: 'Generate investigation briefing from backend source with provenance sections.',
    available: true,
  },
  {
    id: 'bundle',
    title: 'Case bundle (zip)',
    description: 'Export evidence package as a single archive.',
    available: false,
    unavailableReason: 'Zip bundle generation endpoint is not available yet in this build.',
  },
  {
    id: 'evidence-csv',
    title: 'Evidence table (csv)',
    description: 'Export a structured evidence table for external review.',
    available: true,
  },
  {
    id: 'timeline',
    title: 'Timeline export',
    description: 'Export timeline events in machine-readable JSON.',
    available: true,
  },
];

export const InvestigationExportTools: React.FC<ExportToolsProps> = ({
  investigation,
  evidence,
  timelineEvents,
  hypotheses,
  annotations,
}) => {
  const { addToast } = useToasts();
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [selectedType, setSelectedType] = useState<ExportType>('report');
  const [includeSummary, setIncludeSummary] = useState(true);
  const [includeEvidence, setIncludeEvidence] = useState(true);
  const [includeEntities, setIncludeEntities] = useState(true);
  const [includeTimeline, setIncludeTimeline] = useState(true);
  const [includeComms, setIncludeComms] = useState(true);
  const [redactSensitive, setRedactSensitive] = useState(true);
  const [includeAuditTrail, setIncludeAuditTrail] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [generatedMeta, setGeneratedMeta] = useState<null | {
    filename: string;
    checksum: string;
    generatedAt: string;
    version: string;
  }>(null);
  const sectionToggles: Array<{
    label: string;
    value: boolean;
    setter: React.Dispatch<React.SetStateAction<boolean>>;
  }> = [
    { label: 'Include summary', value: includeSummary, setter: setIncludeSummary },
    { label: 'Include evidence list', value: includeEvidence, setter: setIncludeEvidence },
    { label: 'Include key entities', value: includeEntities, setter: setIncludeEntities },
    { label: 'Include timeline', value: includeTimeline, setter: setIncludeTimeline },
    { label: 'Include communications', value: includeComms, setter: setIncludeComms },
    {
      label: 'Include provenance / audit trail',
      value: includeAuditTrail,
      setter: setIncludeAuditTrail,
    },
  ];

  const selectedOption =
    exportOptions.find((option) => option.id === selectedType) || exportOptions[0];

  const estimatedSizeKb = useMemo(() => {
    const base = 18;
    const evidenceWeight = includeEvidence ? evidence.length * 0.7 : 0;
    const timelineWeight = includeTimeline ? timelineEvents.length * 0.4 : 0;
    const hypothesisWeight = includeSummary ? hypotheses.length * 0.3 : 0;
    const annotationsWeight = includeAuditTrail ? annotations.length * 0.15 : 0;
    return Math.max(
      8,
      Math.round(base + evidenceWeight + timelineWeight + hypothesisWeight + annotationsWeight),
    );
  }, [
    annotations.length,
    evidence.length,
    hypotheses.length,
    includeAuditTrail,
    includeEvidence,
    includeSummary,
    includeTimeline,
    timelineEvents.length,
  ]);

  const downloadBlob = (content: string, filename: string, mimeType: string) => {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = filename;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    URL.revokeObjectURL(url);
  };

  const runGeneration = async () => {
    if (!selectedOption.available) {
      addToast({
        text: selectedOption.unavailableReason || 'Export option is not available yet.',
        type: 'warning',
      });
      return;
    }

    setIsGenerating(true);
    setProgress(10);
    setGeneratedMeta(null);

    try {
      let content = '';
      let filename = `investigation-${investigation.id}.txt`;
      let mimeType = 'text/plain';
      const generatedAt = new Date().toISOString();
      const pipelineVersion =
        import.meta.env.VITE_GIT_COMMIT ||
        import.meta.env.VITE_COMMIT_SHA ||
        import.meta.env.VITE_APP_VERSION ||
        'N/A';
      const timelineOrderingMode = (() => {
        try {
          const key = `investigation_timeline_order_mode_${investigation.id}`;
          const mode = window.localStorage.getItem(key);
          return mode === 'narrative' || mode === 'chronological' ? mode : 'unknown';
        } catch {
          return 'unknown';
        }
      })();
      const integrity = await buildExportIntegrityMeta({
        caseId: investigation.id,
        generatedAt,
        evidence,
        pipelineVersion,
        timelineOrderingMode,
      });

      await new Promise((resolve) => setTimeout(resolve, 120));
      setProgress(35);

      if (selectedType === 'report') {
        const response = await fetch(`/api/investigations/${investigation.id}/briefing`);
        if (!response.ok) throw new Error('Failed to fetch backend briefing');
        const markdown = await response.text();
        content = prependMarkdownMetadata(markdown, integrity);
        filename = `investigation-briefing-${investigation.id}.md`;
        mimeType = 'text/markdown';
      } else if (selectedType === 'evidence-csv') {
        content = buildEvidenceCsv(evidence, integrity);
        filename = `evidence-table-${investigation.id}.csv`;
        mimeType = 'text/csv';
      } else if (selectedType === 'timeline') {
        content = buildTimelineExportJson(timelineEvents, integrity);
        filename = `timeline-${investigation.id}.json`;
        mimeType = 'application/json';
      }

      setProgress(70);
      downloadBlob(content, filename, mimeType);
      setProgress(100);

      setGeneratedMeta({
        filename,
        checksum: `${integrity.checksumAlgorithm}:${integrity.checksum}`,
        generatedAt,
        version: integrity.pipelineVersion,
      });
      addToast({ text: 'Export generated successfully.', type: 'success' });
    } catch (_error) {
      addToast({ text: 'Export generation failed.', type: 'error' });
    } finally {
      setIsGenerating(false);
    }
  };

  const canProceed =
    (step === 1 && selectedOption.available) ||
    (step === 2 && true) ||
    (step === 3 && true) ||
    step === 4;

  return (
    <div className="w-full bg-slate-900 border border-slate-700 rounded-xl p-4 md:p-6 space-y-6">
      <div>
        <h3 className="text-xl font-semibold text-white">Export Workflow</h3>
        <p className="text-sm text-slate-400 mt-1">
          Step-based export flow: choose output, configure content, preview, then generate.
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        {[1, 2, 3, 4].map((idx) => (
          <button
            key={idx}
            onClick={() => setStep(idx as 1 | 2 | 3 | 4)}
            className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
              step === idx
                ? 'bg-blue-600 text-white'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            Step {idx}
          </button>
        ))}
      </div>

      {step === 1 && (
        <div className="space-y-3">
          <h4 className="text-white font-medium">1. Choose output type</h4>
          {exportOptions.map((option) => (
            <button
              key={option.id}
              onClick={() => setSelectedType(option.id)}
              data-gated-reason={
                option.available ? '' : option.unavailableReason || 'Not available yet'
              }
              className={`w-full text-left p-4 rounded-lg border transition-colors ${
                selectedType === option.id
                  ? 'border-blue-500 bg-blue-900/20'
                  : 'border-slate-700 bg-slate-800 hover:bg-slate-700'
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-medium text-white">{option.title}</p>
                {option.available ? (
                  <span className="text-xs px-2 py-1 rounded bg-emerald-900/40 text-emerald-200">
                    Available
                  </span>
                ) : (
                  <span className="text-xs px-2 py-1 rounded bg-amber-900/40 text-amber-200">
                    Not available yet
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400 mt-1">{option.description}</p>
              {!option.available && option.unavailableReason && (
                <p className="text-xs text-amber-300 mt-2">{option.unavailableReason}</p>
              )}
            </button>
          ))}
        </div>
      )}

      {step === 2 && (
        <div className="space-y-3">
          <h4 className="text-white font-medium">2. Configure content</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {sectionToggles.map(({ label, value, setter }) => (
              <label
                key={String(label)}
                className="flex items-center gap-2 p-3 bg-slate-800 rounded-lg border border-slate-700"
              >
                <input type="checkbox" checked={value} onChange={(e) => setter(e.target.checked)} />
                <span className="text-sm text-slate-200">{label}</span>
              </label>
            ))}
          </div>
          <label className="flex items-center gap-2 p-3 bg-slate-800 rounded-lg border border-slate-700">
            <input
              type="checkbox"
              checked={redactSensitive}
              onChange={(e) => setRedactSensitive(e.target.checked)}
            />
            <span className="text-sm text-slate-200">Apply redaction for sensitive content</span>
          </label>
        </div>
      )}

      {step === 3 && (
        <div className="space-y-3">
          <h4 className="text-white font-medium">3. Preview</h4>
          <div className="bg-slate-800 border border-slate-700 rounded-lg p-4 space-y-2">
            <p className="text-sm text-slate-200">
              <span className="text-slate-400">Type:</span> {selectedOption.title}
            </p>
            <p className="text-sm text-slate-200">
              <span className="text-slate-400">Estimated size:</span> ~{estimatedSizeKb} KB
            </p>
            <p className="text-sm text-slate-200">
              <span className="text-slate-400">Sections:</span>{' '}
              {[
                includeSummary && 'summary',
                includeEvidence && 'evidence',
                includeEntities && 'entities',
                includeTimeline && 'timeline',
                includeComms && 'comms',
              ]
                .filter(Boolean)
                .join(', ') || 'none'}
            </p>
            <p className="text-sm text-slate-200">
              <span className="text-slate-400">Redaction:</span>{' '}
              {redactSensitive ? 'enabled' : 'off'}
            </p>
            <p className="text-sm text-slate-200">
              <span className="text-slate-400">Audit trail:</span>{' '}
              {includeAuditTrail ? 'included' : 'excluded'}
            </p>
          </div>
        </div>
      )}

      {step === 4 && (
        <div className="space-y-4">
          <h4 className="text-white font-medium">4. Generate</h4>
          <button
            onClick={runGeneration}
            disabled={isGenerating || !selectedOption.available}
            className="inline-flex items-center gap-2 px-5 py-3 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:bg-slate-600 disabled:cursor-not-allowed text-white"
          >
            <Download className="w-4 h-4" />
            {isGenerating ? 'Generating...' : 'Generate artifact'}
          </button>

          {isGenerating && (
            <div className="bg-slate-800 border border-slate-700 rounded-lg p-3">
              <div className="flex justify-between text-xs text-slate-300 mb-2">
                <span>Generation progress</span>
                <span>{progress}%</span>
              </div>
              <div className="w-full h-2 rounded-full bg-slate-700 overflow-hidden">
                <div
                  className="h-full bg-blue-500 transition-all"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          )}

          {generatedMeta && (
            <div className="bg-emerald-900/20 border border-emerald-700 rounded-lg p-4 space-y-2">
              <div className="flex items-center gap-2 text-emerald-200 text-sm font-medium">
                <CheckCircle2 className="w-4 h-4" />
                Export generated
              </div>
              <p className="text-xs text-emerald-100">
                <span className="text-emerald-300">File:</span> {generatedMeta.filename}
              </p>
              <p className="text-xs text-emerald-100">
                <span className="text-emerald-300">Checksum:</span> {generatedMeta.checksum}
              </p>
              <p className="text-xs text-emerald-100">
                <span className="text-emerald-300">Generated at:</span>{' '}
                {format(new Date(generatedMeta.generatedAt), 'PPpp')}
              </p>
              <p className="text-xs text-emerald-100">
                <span className="text-emerald-300">Version:</span> {generatedMeta.version}
              </p>
            </div>
          )}

          {!selectedOption.available && (
            <div className="bg-amber-900/20 border border-amber-700 rounded-lg p-3 text-xs text-amber-200 flex items-start gap-2">
              <ShieldAlert className="w-4 h-4 mt-0.5" />
              <span>
                {selectedOption.unavailableReason || 'Not available yet.'} Use an available export
                type now and keep provenance enabled for auditability.
              </span>
            </div>
          )}

          <div className="text-xs text-slate-500 flex items-center gap-2">
            <Clock className="w-3 h-3" />
            Generated files are local downloads. No automatic publish endpoint is active in this
            module.
          </div>
        </div>
      )}

      <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-700">
        <button
          onClick={() => setStep((prev) => Math.max(1, prev - 1) as 1 | 2 | 3 | 4)}
          disabled={step === 1}
          className="px-3 py-2 text-sm rounded bg-slate-800 text-slate-200 disabled:opacity-50"
        >
          Back
        </button>
        <button
          onClick={() => setStep((prev) => Math.min(4, prev + 1) as 1 | 2 | 3 | 4)}
          disabled={step === 4 || !canProceed}
          className="px-3 py-2 text-sm rounded bg-blue-600 text-white disabled:opacity-50"
        >
          Next
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
        <div className="bg-slate-800 border border-slate-700 rounded p-3">
          <p className="text-slate-400">Evidence items</p>
          <p className="text-white text-lg font-semibold">{evidence.length}</p>
        </div>
        <div className="bg-slate-800 border border-slate-700 rounded p-3">
          <p className="text-slate-400">Timeline events</p>
          <p className="text-white text-lg font-semibold">{timelineEvents.length}</p>
        </div>
        <div className="bg-slate-800 border border-slate-700 rounded p-3">
          <p className="text-slate-400">Hypotheses</p>
          <p className="text-white text-lg font-semibold">{hypotheses.length}</p>
        </div>
        <div className="bg-slate-800 border border-slate-700 rounded p-3">
          <p className="text-slate-400">Annotations</p>
          <p className="text-white text-lg font-semibold">{annotations.length}</p>
        </div>
      </div>
    </div>
  );
};
