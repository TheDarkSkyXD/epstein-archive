import React, { useState } from 'react';
import {
  Investigation,
  EvidenceItem,
  TimelineEvent,
  Hypothesis,
  Annotation,
} from '../types/investigation';
import {
  FileText,
  Download,
  Share2,
  Lock,
  Globe,
  Newspaper,
  Gavel,
  FileSpreadsheet,
  Image,
  Code,
  Check,
  Copy,
  Printer,
  Microscope,
} from 'lucide-react';
import { format } from 'date-fns';
import { useToasts } from './ToastProvider';

interface ExportToolsProps {
  investigation: Investigation;
  evidence: EvidenceItem[];
  timelineEvents: TimelineEvent[];
  hypotheses: Hypothesis[];
  annotations: Annotation[];
}

interface ExportFormat {
  id: string;
  name: string;
  description: string;
  icon: React.ElementType;
  color: string;
  category: 'document' | 'legal' | 'journalism' | 'data' | 'visual';
}

interface PublishingOption {
  id: string;
  name: string;
  description: string;
  icon: React.ElementType;
  security: 'public' | 'private' | 'secure';
}

const exportFormats: ExportFormat[] = [
  {
    id: 'investigation-report',
    name: 'Investigation Report',
    description: 'Comprehensive report with evidence, timeline, and analysis',
    icon: FileText,
    color: 'bg-blue-600',
    category: 'document',
  },
  {
    id: 'forensic-report',
    name: 'Forensic Analysis Report',
    description:
      'Professional forensic analysis with authenticity verification and pattern detection',
    icon: Microscope,
    color: 'bg-red-600',
    category: 'legal',
  },
  {
    id: 'legal-brief',
    name: 'Legal Brief',
    description: 'Court-ready document with evidence chain and citations',
    icon: Gavel,
    color: 'bg-purple-600',
    category: 'legal',
  },
  {
    id: 'journalism-package',
    name: 'Journalism Package',
    description: 'News-ready package with story, quotes, and multimedia',
    icon: Newspaper,
    color: 'bg-green-600',
    category: 'journalism',
  },
  {
    id: 'evidence-spreadsheet',
    name: 'Evidence Spreadsheet',
    description: 'Structured data export of all evidence and metadata',
    icon: FileSpreadsheet,
    color: 'bg-orange-600',
    category: 'data',
  },
  {
    id: 'timeline-visual',
    name: 'Timeline Visualization',
    description: 'Interactive timeline with events and connections',
    icon: Image,
    color: 'bg-pink-600',
    category: 'visual',
  },
  {
    id: 'network-graph',
    name: 'Network Analysis',
    description: 'Entity relationship graph and connection analysis',
    icon: Code,
    color: 'bg-indigo-600',
    category: 'visual',
  },
];

const publishingOptions: PublishingOption[] = [
  {
    id: 'public-web',
    name: 'Public Web Publication',
    description: 'Publish investigation as interactive web story',
    icon: Globe,
    security: 'public',
  },
  {
    id: 'secure-portal',
    name: 'Secure Investigation Portal',
    description: 'Private portal for team collaboration and review',
    icon: Lock,
    security: 'secure',
  },
  {
    id: 'newsroom-share',
    name: 'Newsroom Collaboration',
    description: 'Share with newsroom for editorial review and publication',
    icon: Share2,
    security: 'private',
  },
];

export const InvestigationExportTools: React.FC<ExportToolsProps> = ({
  investigation,
  evidence,
  timelineEvents,
  hypotheses,
  annotations,
}) => {
  const [selectedFormat, setSelectedFormat] = useState<string>('');
  const [selectedPublishing, setSelectedPublishing] = useState<string>('');
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  const [copiedLink, setCopiedLink] = useState<string>('');
  const [includeConfidential, setIncludeConfidential] = useState(false);
  const [redactSensitive, setRedactSensitive] = useState(true);
  const [includeEvidenceChain, setIncludeEvidenceChain] = useState(true);
  const [includeAnnotations, setIncludeAnnotations] = useState(true);
  const [includeTimeline, setIncludeTimeline] = useState(true);
  const [includeHypotheses, setIncludeHypotheses] = useState(true);
  const { addToast } = useToasts();

  const generateInvestigationReport = (): string => {
    let report = `# ${investigation.title}\n\n`;
    report += `**Investigation ID:** ${investigation.id}\n`;
    report += `**Created:** ${format(new Date(investigation.createdAt), 'PPP')}\n`;
    report += `**Status:** ${investigation.status}\n`;
    report += `**Lead Investigator:** ${investigation.leadInvestigator}\n\n`;

    if (investigation.description) {
      report += `## Executive Summary

${investigation.description}

`;
    }

    if (includeHypotheses && hypotheses.length > 0) {
      report += `## Key Hypotheses\n\n`;
      hypotheses.forEach((hyp) => {
        report += `### ${hyp.title}\n`;
        report += `${hyp.description}\n\n`;
        report += `**Confidence:** ${hyp.confidence}%\n`;
        report += `**Status:** ${hyp.status}\n\n`;
      });
    }

    if (includeTimeline && timelineEvents.length > 0) {
      report += `## Timeline of Events\n\n`;
      const sortedEvents = [...timelineEvents].sort(
        (a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime(),
      );

      sortedEvents.forEach((event) => {
        report += `### ${format(new Date(event.startDate), 'PPP')}: ${event.title}\n`;
        if (event.description) {
          report += `${event.description}\n\n`;
        }
        report += `**Type:** ${event.type} | **Confidence:** ${event.confidence}%\n\n`;
      });
    }

    if (includeEvidenceChain && evidence.length > 0) {
      report += `## Evidence Summary\n\n`;
      evidence.forEach((ev) => {
        if (!includeConfidential && (ev.sensitivity || 'confidential') === 'confidential') return;

        report += `### ${ev.title}\n`;
        report += `${ev.description}\n\n`;
        report += `**Source:** ${ev.source} | **Type:** ${ev.type}\n`;
        report += `**Authenticity Score:** ${ev.authenticityScore || 'N/A'}/100\n`;
        report += `**Chain of Custody:** ${ev.chainOfCustody?.length || 0} events\n\n`;
      });
    }

    return report;
  };

  const generateLegalBrief = (): string => {
    let brief = `# LEGAL BRIEF: ${investigation.title}\n\n`;
    brief += `**Case Reference:** ${investigation.id}\n`;
    brief += `**Date:** ${format(new Date(), 'PPP')}\n`;
    brief += `**Prepared by:** ${investigation.leadInvestigator}\n\n`;

    brief += `## STATEMENT OF FACTS\n\n`;
    if (investigation.description) {
      brief += `${investigation.description}\n\n`;
    }

    brief += `## EVIDENCE PRESENTATION\n\n`;
    evidence.forEach((ev, index) => {
      brief += `### Exhibit ${String.fromCharCode(65 + index)}: ${ev.title}\n`;
      brief += `- **Source:** ${ev.source}\n`;
      brief += `- **Date Acquired:** ${ev.acquiredAt ? format(new Date(ev.acquiredAt), 'PPP') : 'N/A'}\n`;
      brief += `- **Authenticity Score:** ${ev.authenticityScore || 'N/A'}/100\n`;
      brief += `- **Chain of Custody Verified:** ${ev.chainOfCustody?.length || 0} documented transfers\n`;
      brief += `- **Hash Verification:** ${ev.hash || 'Pending'}\n\n`;

      if (ev.legalAdmissibility?.notes) {
        brief += `**Admissibility Notes:** ${ev.legalAdmissibility?.notes}\n\n`;
      }
    });

    brief += `## TIMELINE OF EVENTS\n\n`;
    const sortedEvents = [...timelineEvents].sort(
      (a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime(),
    );

    sortedEvents.forEach((event) => {
      brief += `${format(new Date(event.startDate), 'PPP')}: ${event.title}\n`;
      if (event.description) {
        brief += `  ${event.description}\n`;
      }
    });

    return brief;
  };

  const generateEvidenceSpreadsheet = (): string => {
    const headers = [
      'Evidence ID',
      'Title',
      'Description',
      'Type',
      'Relevance',
      'Source',
      'Date Acquired',
      'Authenticity Score',
      'Chain of Custody Events',
      'Legal Admissibility',
      'Sensitivity',
      'Hash',
    ];

    let csv = headers.join(',') + '\n';

    evidence.forEach((ev) => {
      const row = [
        ev.id,
        `"${(ev.title || '').replace(/"/g, '""')}"`,
        `"${(ev.description || '').replace(/"/g, '""')}"`,
        ev.type,
        ev.relevance,
        `"${(ev.source || '').replace(/"/g, '""')}"`,
        ev.acquiredAt ? format(new Date(ev.acquiredAt), 'yyyy-MM-dd') : '',
        ev.authenticityScore || 0,
        ev.chainOfCustody?.length || 0,
        ev.legalAdmissibility?.status || 'unknown',
        ev.sensitivity || 'confidential',
        ev.hash || '',
      ];
      csv += row.join(',') + '\n';
    });

    return csv;
  };

  const generateForensicReport = (): string => {
    let report = `# FORENSIC ANALYSIS REPORT\n\n`;
    report += `**Investigation:** ${investigation.title}\n`;
    report += `**Case Reference:** ${investigation.id}\n`;
    report += `**Date:** ${format(new Date(), 'PPP')}\n`;
    report += `**Lead Forensic Analyst:** ${investigation.leadInvestigator}\n\n`;

    report += `## EXECUTIVE SUMMARY\n\n`;
    report += `This forensic analysis report provides a comprehensive examination of digital evidence, \n`;
    report += `document authenticity verification, entity relationship mapping, and pattern detection \n`;
    report += `related to the ${investigation.title} investigation.\n\n`;

    report += `## DOCUMENT AUTHENTICITY ANALYSIS\n\n`;
    if (evidence.length > 0) {
      const avgAuthenticity =
        evidence.reduce((sum, ev) => sum + (ev.authenticityScore || 0), 0) / evidence.length;

      report += `### Evidence Reliability Assessment\n`;
      report += `**Average Authenticity Score:** ${Math.round(avgAuthenticity)}/100\n\n`;

      evidence.forEach((ev) => {
        report += `#### ${ev.title || 'Untitled Evidence'}\n`;
        report += `- **Authenticity Score:** ${ev.authenticityScore || 'N/A'}/100\n`;
        report += `- **Hash Verification:** ${ev.hash || 'Pending'}\n`;
        report += `- **Chain of Custody:** ${ev.chainOfCustody?.length || 0} documented transfers\n`;
        report += `- **Legal Admissibility:** ${ev.legalAdmissibility?.status || 'unknown'}\n`;
        if (ev.legalAdmissibility?.notes) {
          report += `- **Admissibility Notes:** ${ev.legalAdmissibility?.notes}\n`;
        }
        report += `\n`;
      });
    }

    report += `## ENTITY RELATIONSHIP ANALYSIS\n\n`;
    report += `**Total Entities Identified:** [To be populated from forensic analysis]\n`;
    report += `**Network Connections:** [To be populated from forensic analysis]\n`;
    report += `**Key Relationships:** [To be populated from forensic analysis]\n\n`;

    report += `## PATTERN DETECTION\n\n`;
    report += `**Suspicious Patterns Identified:** [To be populated from forensic analysis]\n`;
    report += `**Communication Anomalies:** [To be populated from forensic analysis]\n`;
    report += `**Financial Irregularities:** [To be populated from forensic analysis]\n\n`;

    report += `## FINANCIAL TRANSACTION ANALYSIS\n\n`;
    report += `**Transaction Volume:** [To be populated from forensic analysis]\n`;
    report += `**Suspicious Transactions:** [To be populated from forensic analysis]\n`;
    report += `**Money Laundering Indicators:** [To be populated from forensic analysis]\n\n`;

    report += `## MULTI-SOURCE CORRELATION\n\n`;
    report += `**Cross-References Identified:** [To be populated from forensic analysis]\n`;
    report += `**Temporal Correlations:** [To be populated from forensic analysis]\n`;
    report += `**Spatial Connections:** [To be populated from forensic analysis]\n\n`;

    report += `## CONCLUSIONS AND RECOMMENDATIONS\n\n`;
    report += `Based on the forensic analysis conducted, the following conclusions and recommendations \n`;
    report += `are provided for further investigation and legal proceedings.\n\n`;

    report += `### Key Findings:\n`;
    report += `1. Document authenticity verification completed with ${evidence.length} items analyzed\n`;
    report += `2. Evidence chain of custody properly documented and verified\n`;
    report += `3. [Additional findings to be populated from forensic analysis]\n\n`;

    report += `### Recommendations:\n`;
    report += `1. Continue forensic analysis with additional tools and techniques\n`;
    report += `2. Cross-reference findings with external databases and sources\n`;
    report += `3. Consult with digital forensics experts for specialized analysis\n`;
    report += `4. Prepare evidence for potential legal proceedings\n\n`;

    report += `---\n**Report Generated:** ${format(new Date(), 'PPP')} at ${format(new Date(), 'p')}\n`;
    report += `**Forensic Tools:** Epstein Archive Forensic Analysis Platform\n`;
    report += `**Report Status:** Preliminary - Pending Additional Analysis\n`;

    return report;
  };

  const handleExport = async (formatId: string) => {
    setIsExporting(true);
    setExportProgress(0);

    try {
      let content = '';
      let filename = '';
      let mimeType = 'text/plain';

      // Simulate export progress
      const progressSteps = [
        { progress: 10, message: 'Gathering evidence...' },
        { progress: 30, message: 'Analyzing timeline...' },
        { progress: 50, message: 'Processing annotations...' },
        { progress: 70, message: 'Generating report...' },
        { progress: 90, message: 'Finalizing export...' },
      ];

      for (const step of progressSteps) {
        setExportProgress(step.progress);
        await new Promise((resolve) => setTimeout(resolve, 500));
      }

      switch (formatId) {
        case 'investigation-report':
          content = generateInvestigationReport();
          filename = `investigation-report-${investigation.id}.md`;
          mimeType = 'text/markdown';
          break;

        case 'forensic-report':
          content = generateForensicReport();
          filename = `forensic-report-${investigation.id}.md`;
          mimeType = 'text/markdown';
          break;

        case 'legal-brief':
          content = generateLegalBrief();
          filename = `legal-brief-${investigation.id}.md`;
          mimeType = 'text/markdown';
          break;

        case 'evidence-spreadsheet':
          content = generateEvidenceSpreadsheet();
          filename = `evidence-data-${investigation.id}.csv`;
          mimeType = 'text/csv';
          break;

        case 'journalism-package':
          content = generateInvestigationReport(); // Placeholder
          filename = `journalism-package-${investigation.id}.md`;
          mimeType = 'text/markdown';
          break;

        default:
          content = generateInvestigationReport();
          filename = `export-${investigation.id}.md`;
          mimeType = 'text/markdown';
      }

      // Create and download file
      const blob = new Blob([content], { type: mimeType });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      setExportProgress(100);
    } catch (error) {
      console.error('Export failed:', error);
      addToast({ text: 'Export failed. Please try again.', type: 'error' });
    } finally {
      setIsExporting(false);
      setTimeout(() => setExportProgress(0), 2000);
    }
  };

  const handlePublish = async (publishingId: string) => {
    // Simulate publishing process
    setIsExporting(true);
    setExportProgress(0);

    const progressSteps = [
      { progress: 20, message: 'Preparing investigation...' },
      { progress: 40, message: 'Securing sensitive data...' },
      { progress: 60, message: 'Generating publication...' },
      { progress: 80, message: 'Setting up access controls...' },
      { progress: 95, message: 'Finalizing publication...' },
    ];

    for (const step of progressSteps) {
      setExportProgress(step.progress);
      await new Promise((resolve) => setTimeout(resolve, 800));
    }

    // Generate mock publication link
    const mockLink = `https://epstein-archive.org/investigation/${investigation.id}/${publishingId}`;
    setCopiedLink(mockLink);
    setExportProgress(100);
    setIsExporting(false);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedLink(text);
    setTimeout(() => setCopiedLink(''), 3000);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="bg-gray-900 text-gray-100 min-h-screen p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Export & Publishing Tools</h1>
          <p className="text-gray-400">
            Generate professional reports and publish your investigation findings
          </p>
        </div>

        {/* Export Progress */}
        {isExporting && (
          <div className="mb-6 bg-gray-800 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-white font-medium">Exporting Investigation...</span>
              <span className="text-gray-400">{exportProgress}%</span>
            </div>
            <div className="w-full bg-gray-700 rounded-full h-2">
              <div
                className="bg-red-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${exportProgress}%` }}
              ></div>
            </div>
          </div>
        )}

        {/* Export Options - Stacked Layout */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-white mb-4">Export Formats</h2>
          <div className="flex flex-col gap-3">
            {exportFormats.map((format) => (
              <div
                key={format.id}
                className={`bg-gray-800 rounded-lg p-4 border-2 cursor-pointer transition-all ${
                  selectedFormat === format.id
                    ? 'border-red-500 bg-gray-750'
                    : 'border-gray-700 hover:border-gray-600'
                }`}
                onClick={() => setSelectedFormat(format.id)}
              >
                <div className="flex items-center gap-3 mb-2">
                  <div
                    className={`w-10 h-10 rounded-lg ${format.color} flex items-center justify-center`}
                  >
                    <format.icon className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h3 className="text-white font-semibold">{format.name}</h3>
                    <span className="text-xs text-gray-400 uppercase">{format.category}</span>
                  </div>
                </div>
                <p className="text-gray-400 text-xs">{format.description}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Export Settings - Stacked Layout */}
        <div className="mb-8 bg-gray-800 rounded-lg p-6">
          <h2 className="text-xl font-semibold text-white mb-4">Export Settings</h2>
          <div className="flex flex-col gap-6">
            <div>
              <h3 className="text-lg font-medium text-white mb-3">Content Options</h3>
              <div className="space-y-3">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={includeEvidenceChain}
                    onChange={(e) => setIncludeEvidenceChain(e.target.checked)}
                    className="rounded"
                  />
                  <span className="text-gray-400 text-sm">
                    Include evidence chain documentation
                  </span>
                </label>
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={includeAnnotations}
                    onChange={(e) => setIncludeAnnotations(e.target.checked)}
                    className="rounded"
                  />
                  <span className="text-gray-400 text-sm">Include document annotations</span>
                </label>
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={includeTimeline}
                    onChange={(e) => setIncludeTimeline(e.target.checked)}
                    className="rounded"
                  />
                  <span className="text-gray-400 text-sm">Include timeline events</span>
                </label>
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={includeHypotheses}
                    onChange={(e) => setIncludeHypotheses(e.target.checked)}
                    className="rounded"
                  />
                  <span className="text-gray-400 text-sm">Include hypotheses and analysis</span>
                </label>
              </div>
            </div>
            <div>
              <h3 className="text-lg font-medium text-white mb-3">Security Options</h3>
              <div className="space-y-3">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={redactSensitive}
                    onChange={(e) => setRedactSensitive(e.target.checked)}
                    className="rounded"
                  />
                  <span className="text-gray-400 text-sm">Redact sensitive information</span>
                </label>
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={includeConfidential}
                    onChange={(e) => setIncludeConfidential(e.target.checked)}
                    className="rounded"
                  />
                  <span className="text-gray-400 text-sm">Include confidential evidence</span>
                </label>
              </div>
            </div>
          </div>
        </div>

        {/* Export Actions */}
        <div className="mb-8 flex flex-wrap gap-4">
          <button
            onClick={() => selectedFormat && handleExport(selectedFormat)}
            disabled={!selectedFormat || isExporting}
            className="flex items-center gap-2 px-6 py-3 bg-red-600 hover:bg-red-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
          >
            <Download className="w-5 h-5" />
            Export Investigation
          </button>
          <button
            onClick={handlePrint}
            className="flex items-center gap-2 px-6 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
          >
            <Printer className="w-5 h-5" />
            Print Report
          </button>
        </div>

        {/* Publishing Options - Stacked Layout */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-white mb-4">Publishing Options</h2>
          <div className="flex flex-col gap-3">
            {publishingOptions.map((option) => (
              <div
                key={option.id}
                className={`bg-gray-800 rounded-lg p-4 border-2 cursor-pointer transition-all ${
                  selectedPublishing === option.id
                    ? 'border-red-500 bg-gray-750'
                    : 'border-gray-700 hover:border-gray-600'
                }`}
                onClick={() => setSelectedPublishing(option.id)}
              >
                <div className="flex items-center gap-3 mb-2">
                  <div
                    className={`w-10 h-10 rounded-lg ${
                      option.security === 'public'
                        ? 'bg-green-600'
                        : option.security === 'secure'
                          ? 'bg-red-600'
                          : 'bg-yellow-600'
                    } flex items-center justify-center`}
                  >
                    <option.icon className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h3 className="text-white font-semibold">{option.name}</h3>
                    <span className="text-xs text-gray-400 uppercase">{option.security}</span>
                  </div>
                </div>
                <p className="text-gray-400 text-xs">{option.description}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Publishing Actions */}
        {selectedPublishing && (
          <div className="mb-8">
            <button
              onClick={() => handlePublish(selectedPublishing)}
              disabled={isExporting}
              className="flex items-center gap-2 px-6 py-3 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
            >
              <Share2 className="w-5 h-5" />
              Publish Investigation
            </button>
          </div>
        )}

        {/* Published Link */}
        {copiedLink && (
          <div className="mb-8 bg-green-900 border border-green-600 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-green-200 font-semibold mb-1">
                  Investigation Published Successfully!
                </h3>
                <p className="text-green-300 text-sm mb-2">
                  Your investigation is now available at:
                </p>
                <code className="text-green-100 bg-green-800 px-2 py-1 rounded text-sm break-all">
                  {copiedLink}
                </code>
              </div>
              <button
                onClick={() => copyToClipboard(copiedLink)}
                className="flex items-center gap-2 px-3 py-2 bg-green-700 hover:bg-green-600 text-white rounded-lg transition-colors"
              >
                {copiedLink === copiedLink ? (
                  <Check className="w-4 h-4" />
                ) : (
                  <Copy className="w-4 h-4" />
                )}
                Copy Link
              </button>
            </div>
          </div>
        )}

        {/* Investigation Summary - Stacked Layout */}
        <div className="bg-gray-800 rounded-lg p-6">
          <h2 className="text-xl font-semibold text-white mb-4">Investigation Summary</h2>
          <div className="flex flex-col gap-3">
            <div className="flex justify-between items-center pb-2 border-b border-gray-700">
              <span className="text-gray-400">Evidence Items</span>
              <span className="text-xl font-bold text-red-400">{evidence.length}</span>
            </div>
            <div className="flex justify-between items-center pb-2 border-b border-gray-700">
              <span className="text-gray-400">Timeline Events</span>
              <span className="text-xl font-bold text-blue-400">{timelineEvents.length}</span>
            </div>
            <div className="flex justify-between items-center pb-2 border-b border-gray-700">
              <span className="text-gray-400">Hypotheses</span>
              <span className="text-xl font-bold text-green-400">{hypotheses.length}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-400">Annotations</span>
              <span className="text-xl font-bold text-purple-400">{annotations.length}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
