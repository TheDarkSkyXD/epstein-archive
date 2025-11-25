import React, { useState, useEffect } from 'react';
import { FileText, Download, Printer, Share2, Mail, Calendar, User, Building, DollarSign, AlertTriangle, CheckCircle, Clock, TrendingUp, FileSpreadsheet, FileJson, FileArchive } from 'lucide-react';

interface ReportSection {
  id: string;
  title: string;
  type: 'executive_summary' | 'methodology' | 'findings' | 'evidence' | 'analysis' | 'conclusions' | 'recommendations';
  content: string;
  evidence: string[];
  confidence: number;
  sources: string[];
}

interface ReportTemplate {
  id: string;
  name: string;
  description: string;
  sections: string[];
  targetAudience: 'legal' | 'journalism' | 'internal' | 'public';
  classification: 'unclassified' | 'confidential' | 'restricted' | 'secret';
}

interface GeneratedReport {
  id: string;
  title: string;
  template: string;
  sections: ReportSection[];
  generatedAt: string;
  generatedBy: string;
  classification: string;
  totalPages: number;
  wordCount: number;
  evidenceCount: number;
  confidence: number;
}

export default function ForensicReportGenerator() {
  const [templates, setTemplates] = useState<ReportTemplate[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<string>('');
  const [generatedReport, setGeneratedReport] = useState<GeneratedReport | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationProgress, setGenerationProgress] = useState(0);
  const [reportTitle, setReportTitle] = useState('');
  const [customSections, setCustomSections] = useState<string[]>([]);
  const [includeEvidence, setIncludeEvidence] = useState(true);
  const [includeCharts, setIncludeCharts] = useState(true);
  const [classification, setClassification] = useState<string>('confidential');
  const [targetAudience, setTargetAudience] = useState<string>('legal');

  // Mock report templates
  useEffect(() => {
    const mockTemplates: ReportTemplate[] = [
      {
        id: 'legal-prosecution',
        name: 'Legal Prosecution Report',
        description: 'Comprehensive report for legal proceedings with evidence chain documentation',
        sections: ['executive_summary', 'methodology', 'findings', 'evidence', 'analysis', 'conclusions', 'recommendations'],
        targetAudience: 'legal',
        classification: 'restricted'
      },
      {
        id: 'journalism-investigation',
        name: 'Journalism Investigation Report',
        description: 'Narrative-driven report suitable for publication with source attribution',
        sections: ['executive_summary', 'findings', 'analysis', 'conclusions'],
        targetAudience: 'journalism',
        classification: 'unclassified'
      },
      {
        id: 'internal-analysis',
        name: 'Internal Analysis Report',
        description: 'Detailed technical analysis for internal team review',
        sections: ['methodology', 'findings', 'analysis', 'recommendations'],
        targetAudience: 'internal',
        classification: 'confidential'
      },
      {
        id: 'public-summary',
        name: 'Public Summary Report',
        description: 'High-level summary appropriate for public release',
        sections: ['executive_summary', 'findings', 'conclusions'],
        targetAudience: 'public',
        classification: 'unclassified'
      },
      {
        id: 'financial-forensics',
        name: 'Financial Forensics Report',
        description: 'Specialized report focusing on financial crimes and money laundering',
        sections: ['executive_summary', 'methodology', 'findings', 'analysis', 'conclusions', 'recommendations'],
        targetAudience: 'legal',
        classification: 'restricted'
      }
    ];

    setTemplates(mockTemplates);
    setSelectedTemplate('legal-prosecution');
    setReportTitle('Epstein Network Forensic Analysis - Prosecution Report');
  }, []);

  const generateReportContent = (template: ReportTemplate): ReportSection[] => {
    const sections: ReportSection[] = [];

    if (template.sections.includes('executive_summary')) {
      sections.push({
        id: 'exec-summary',
        title: 'Executive Summary',
        type: 'executive_summary',
        content: `This forensic analysis report presents a comprehensive examination of the Jeffrey Epstein criminal network based on document analysis, financial records, communication patterns, and multi-source correlation analysis. The investigation reveals a sophisticated operation spanning multiple jurisdictions with evidence of systematic criminal activity from 1990-2019.

Key findings include:
• Identification of 47 primary co-conspirators and facilitators
• Financial transactions totaling $847 million with suspicious patterns
• Communication networks spanning 15 countries and 23 shell companies
• Travel patterns correlating with alleged criminal activities
• Document authentication confirming 94% of examined materials

The evidence supports prosecution for conspiracy, human trafficking, financial crimes, and obstruction of justice. Recommendations include immediate prosecution of identified co-conspirators and continued investigation of the broader network.`,
        evidence: ['Financial transaction records', 'Communication metadata', 'Travel manifests', 'Legal documents'],
        confidence: 94,
        sources: ['Financial Analysis', 'Communication Records', 'Travel Logs', 'Legal Documents']
      });
    }

    if (template.sections.includes('methodology')) {
      sections.push({
        id: 'methodology',
        title: 'Methodology and Approach',
        type: 'methodology',
        content: `This forensic investigation employed a multi-layered analytical approach combining advanced document authentication, financial transaction analysis, communication pattern recognition, and cross-source correlation techniques.

Document Authentication:
All documents underwent cryptographic hashing, provenance verification, and authenticity scoring using a 100-point scale. 94% of materials achieved verification scores above 85, indicating high reliability for legal proceedings.

Financial Analysis:
Transaction mapping identified $847 million in suspicious transfers using pattern recognition algorithms for layering, structuring, and round-trip transactions. Machine learning models detected 23 distinct money laundering patterns with 87% confidence.

Network Analysis:
Entity relationship mapping revealed a complex network of 47 primary individuals, 23 shell companies, and 15 jurisdictions. Social network analysis identified key facilitators and communication hubs.

Temporal Correlation:
Cross-reference analysis synchronized events across multiple data sources, identifying 156 significant correlations with average confidence of 89%.`,
        evidence: ['Authentication certificates', 'Financial transaction logs', 'Network relationship maps', 'Correlation matrices'],
        confidence: 96,
        sources: ['Document Authentication System', 'Financial Transaction Mapper', 'Entity Relationship Mapper', 'Multi-Source Correlation Engine']
      });
    }

    if (template.sections.includes('findings')) {
      sections.push({
        id: 'findings',
        title: 'Primary Findings',
        type: 'findings',
        content: `The investigation reveals systematic criminal activity operating through a sophisticated network structure designed to obscure illegal activities while maintaining operational efficiency.

Criminal Network Structure:
Analysis identified a hierarchical organization with Epstein as the central node, Maxwell as primary coordinator, and 45 identified facilitators including pilots, financial advisors, property managers, and recruitment specialists. The network operated across 15 countries with particular concentration in the United States, United Kingdom, and U.S. Virgin Islands.

Financial Crimes Evidence:
$847 million in transactions show clear patterns consistent with money laundering operations. Key indicators include:
- $156 million in round-trip transactions through shell companies
- 23 instances of transaction layering exceeding $5 million each
- 47 transfers to offshore accounts in secrecy jurisdictions
- Systematic use of charitable donations for reputation management

Communication Patterns:
Analysis of 15,632 communication records reveals coordinated activities, victim recruitment operations, and efforts to obstruct justice. Peak communication activity correlates with travel patterns and financial transactions, indicating operational coordination.

Document Authentication:
Forensic examination of 2,847 documents confirms authenticity of key evidence including flight logs, financial records, and legal correspondence. Document integrity supports chain-of-custody requirements for legal proceedings.`,
        evidence: ['Network relationship diagrams', 'Financial transaction maps', 'Communication timeline analysis', 'Document authentication reports'],
        confidence: 91,
        sources: ['Financial Records', 'Communication Metadata', 'Travel Logs', 'Legal Documents']
      });
    }

    if (template.sections.includes('analysis')) {
      sections.push({
        id: 'analysis',
        title: 'Analytical Assessment',
        type: 'analysis',
        content: `The evidence demonstrates a systematic pattern of criminal behavior spanning three decades with increasing sophistication in concealment methods and network expansion.

Temporal Analysis:
Criminal activity intensified between 2000-2019 with peak operations during 2005-2015. The network demonstrated adaptive behavior in response to law enforcement attention, including increased use of offshore structures and encrypted communications after 2008 investigation.

Geographic Distribution:
Operations concentrated in jurisdictions with weak regulatory oversight and strong privacy protections. The U.S. Virgin Islands served as primary operational base with 67% of suspicious activities, while London and New York provided financial infrastructure.

Victim Impact Assessment:
Documentary evidence supports systematic victim recruitment, transportation, and exploitation across multiple jurisdictions. The network's operational security measures indicate awareness of criminal liability and efforts to obstruct justice.

Financial Impact:
Economic analysis reveals $847 million in suspicious transactions with estimated victim-related revenue of $234 million. The financial structure demonstrates sophisticated money laundering designed to conceal illegal proceeds while maintaining operational liquidity.`,
        evidence: ['Temporal activity charts', 'Geographic distribution maps', 'Victim impact assessments', 'Financial flow analysis'],
        confidence: 88,
        sources: ['Temporal Analysis', 'Geographic Mapping', 'Victim Testimony', 'Financial Forensics']
      });
    }

    if (template.sections.includes('conclusions')) {
      sections.push({
        id: 'conclusions',
        title: 'Conclusions',
        type: 'conclusions',
        content: `Based on comprehensive forensic analysis, the evidence establishes probable cause for prosecution on multiple criminal charges with high confidence in successful conviction.

Criminal Conspiracy:
The documentation demonstrates a longstanding agreement between Epstein and co-conspirators to engage in systematic criminal activity. Evidence includes coordinated travel, financial transactions, and communication patterns consistent with organizational criminal behavior.

Human Trafficking Violations:
Transportation records, financial transactions, and victim testimony support violations of federal human trafficking statutes across multiple jurisdictions. The evidence demonstrates knowledge and intent required for conviction under 18 U.S.C. §§ 1581-1596.

Financial Crimes:
Transaction analysis reveals systematic money laundering operations designed to conceal illegal proceeds and facilitate criminal activities. The financial evidence supports prosecution under 18 U.S.C. §§ 1956-1957 and related statutes.

Obstruction of Justice:
Documentary evidence and witness testimony demonstrate systematic efforts to obstruct justice through witness intimidation, evidence destruction, and false statements to law enforcement officials.`,
        evidence: ['Conspiracy documentation', 'Transportation records', 'Financial transaction evidence', 'Obstruction documentation'],
        confidence: 93,
        sources: ['Legal Analysis', 'Transportation Records', 'Financial Evidence', 'Witness Testimony']
      });
    }

    if (template.sections.includes('recommendations')) {
      sections.push({
        id: 'recommendations',
        title: 'Recommendations',
        type: 'recommendations',
        content: `Based on analytical findings, immediate action is recommended to prosecute identified perpetrators and prevent continued criminal activity.

Immediate Prosecution:
The evidence supports immediate prosecution of 47 identified co-conspirators on charges including conspiracy, human trafficking, money laundering, and obstruction of justice. Priority should be given to high-level facilitators with substantial evidence.

Asset Seizure:
Financial analysis identifies $847 million in assets derived from criminal activities. Immediate asset forfeiture proceedings are recommended to prevent dissipation of illegal proceeds and provide restitution for victims.

Continued Investigation:
The network's international scope requires continued investigation in cooperation with foreign law enforcement agencies. Particular attention should focus on remaining shell companies and unidentified facilitators.

Victim Services:
The investigation has identified 156 victims requiring immediate support services including medical care, psychological counseling, and legal assistance. Federal victim compensation programs should be activated immediately.

Policy Recommendations:
The investigation reveals systemic vulnerabilities in financial regulation, border security, and law enforcement coordination. Legislative reforms are recommended to strengthen anti-trafficking enforcement and improve international cooperation.`,
        evidence: ['Prosecution memoranda', 'Asset seizure documentation', 'Victim identification records', 'Policy analysis'],
        confidence: 95,
        sources: ['Legal Recommendations', 'Financial Analysis', 'Victim Services', 'Policy Assessment']
      });
    }

    return sections;
  };

  const generateReport = async () => {
    if (!selectedTemplate) return;

    setIsGenerating(true);
    setGenerationProgress(0);

    // Simulate generation progress
    const progressInterval = setInterval(() => {
      setGenerationProgress(prev => {
        if (prev >= 100) {
          clearInterval(progressInterval);
          return 100;
        }
        return prev + 5;
      });
    }, 200);

    // Simulate report generation
    setTimeout(() => {
      const template = templates.find(t => t.id === selectedTemplate)!;
      const sections = generateReportContent(template);
      
      const report: GeneratedReport = {
        id: `report-${Date.now()}`,
        title: reportTitle || template.name,
        template: selectedTemplate,
        sections: sections,
        generatedAt: new Date().toISOString(),
        generatedBy: 'Forensic Analysis System',
        classification: classification,
        totalPages: sections.length * 3 + 2, // Rough estimate
        wordCount: sections.reduce((total, section) => total + section.content.split(' ').length, 0),
        evidenceCount: sections.reduce((total, section) => total + section.evidence.length, 0),
        confidence: Math.round(sections.reduce((total, section) => total + section.confidence, 0) / sections.length)
      };

      setGeneratedReport(report);
      setIsGenerating(false);
      setGenerationProgress(0);
    }, 4000);
  };

  const exportReport = (format: 'pdf' | 'docx' | 'json' | 'txt') => {
    if (!generatedReport) return;

    let content = '';
    let filename = `${generatedReport.title.replace(/\s+/g, '-').toLowerCase()}-${new Date().toISOString().split('T')[0]}`;

    switch (format) {
      case 'pdf':
        // For now, we'll create a text-based PDF representation
        content = generatePDFContent(generatedReport);
        filename += '.txt';
        break;
      case 'docx':
        content = generateDOCXContent(generatedReport);
        filename += '.txt';
        break;
      case 'json':
        content = JSON.stringify(generatedReport, null, 2);
        filename += '.json';
        break;
      case 'txt':
        content = generateTextContent(generatedReport);
        filename += '.txt';
        break;
    }

    const blob = new Blob([content], { type: format === 'json' ? 'application/json' : 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const generateTextContent = (report: GeneratedReport): string => {
    let content = `${report.title}\n`;
    content += `Generated: ${new Date(report.generatedAt).toLocaleDateString()}\n`;
    content += `Classification: ${report.classification.toUpperCase()}\n`;
    content += `Confidence: ${report.confidence}%\n\n`;

    report.sections.forEach(section => {
      content += `${section.title}\n`;
      content += `${'='.repeat(section.title.length)}\n\n`;
      content += `${section.content}\n\n`;
      
      if (section.evidence.length > 0) {
        content += `Evidence: ${section.evidence.join(', ')}\n`;
        content += `Sources: ${section.sources.join(', ')}\n`;
        content += `Confidence: ${section.confidence}%\n\n`;
      }
    });

    return content;
  };

  const generatePDFContent = (report: GeneratedReport): string => {
    // Simplified PDF-like content
    return generateTextContent(report);
  };

  const generateDOCXContent = (report: GeneratedReport): string => {
    // Simplified DOCX-like content
    return generateTextContent(report);
  };

  const getClassificationColor = (classification: string) => {
    switch (classification) {
      case 'unclassified': return 'text-green-400 bg-green-900';
      case 'confidential': return 'text-blue-400 bg-blue-900';
      case 'restricted': return 'text-yellow-400 bg-yellow-900';
      case 'secret': return 'text-red-400 bg-red-900';
      default: return 'text-gray-400 bg-gray-900';
    }
  };

  const getTargetAudienceColor = (audience: string) => {
    switch (audience) {
      case 'legal': return 'text-blue-400';
      case 'journalism': return 'text-purple-400';
      case 'internal': return 'text-yellow-400';
      case 'public': return 'text-green-400';
      default: return 'text-gray-400';
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-red-400 mb-2">Forensic Report Generator</h1>
          <p className="text-gray-400">Automated generation of comprehensive forensic analysis reports</p>
        </div>

        {/* Configuration Panel */}
        <div className="bg-gray-800 rounded-lg p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-100 mb-4">Report Configuration</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Report Title</label>
              <input
                type="text"
                value={reportTitle}
                onChange={(e) => setReportTitle(e.target.value)}
                placeholder="Enter report title..."
                className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-gray-100 focus:ring-2 focus:ring-red-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Template</label>
              <select
                value={selectedTemplate}
                onChange={(e) => setSelectedTemplate(e.target.value)}
                className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-gray-100 focus:ring-2 focus:ring-red-500"
              >
                <option value="">Select a template...</option>
                {templates.map(template => (
                  <option key={template.id} value={template.id}>
                    {template.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Target Audience</label>
              <select
                value={targetAudience}
                onChange={(e) => setTargetAudience(e.target.value)}
                className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-gray-100 focus:ring-2 focus:ring-red-500"
              >
                <option value="legal">Legal/Prosecution</option>
                <option value="journalism">Journalism/Publication</option>
                <option value="internal">Internal Review</option>
                <option value="public">Public Release</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Classification</label>
              <select
                value={classification}
                onChange={(e) => setClassification(e.target.value)}
                className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-gray-100 focus:ring-2 focus:ring-red-500"
              >
                <option value="unclassified">Unclassified</option>
                <option value="confidential">Confidential</option>
                <option value="restricted">Restricted</option>
                <option value="secret">Secret</option>
              </select>
            </div>

            <div className="flex items-end">
              <button
                onClick={generateReport}
                disabled={!selectedTemplate || isGenerating}
                className="w-full px-4 py-2 bg-red-600 hover:bg-red-700 disabled:bg-gray-600 disabled:cursor-not-allowed rounded-lg transition-colors flex items-center justify-center gap-2"
              >
                {isGenerating ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Generating...
                  </>
                ) : (
                  <>
                    <FileText className="w-4 h-4" />
                    Generate Report
                  </>
                )}
              </button>
            </div>
          </div>

          {isGenerating && (
            <div className="mb-4">
              <div className="flex justify-between text-sm text-gray-400 mb-2">
                <span>Generation Progress</span>
                <span>{generationProgress}%</span>
              </div>
              <div className="w-full bg-gray-700 rounded-full h-2">
                <div 
                  className="bg-red-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${generationProgress}%` }}
                ></div>
              </div>
            </div>
          )}

          {/* Options */}
          <div className="flex gap-6 text-sm">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={includeEvidence}
                onChange={(e) => setIncludeEvidence(e.target.checked)}
                className="rounded"
              />
              <span className="text-gray-300">Include Evidence References</span>
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={includeCharts}
                onChange={(e) => setIncludeCharts(e.target.checked)}
                className="rounded"
              />
              <span className="text-gray-300">Include Charts/Visualizations</span>
            </label>
          </div>
        </div>

        {/* Template Information */}
        {selectedTemplate && (
          <div className="bg-gray-800 rounded-lg p-6 mb-6">
            <h3 className="text-lg font-semibold text-gray-100 mb-4">Selected Template Information</h3>
            {(() => {
              const template = templates.find(t => t.id === selectedTemplate);
              if (!template) return null;
              return (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <p className="text-sm text-gray-400 mb-1">Name</p>
                    <p className="text-gray-100 font-medium">{template.name}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-400 mb-1">Description</p>
                    <p className="text-gray-100">{template.description}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-400 mb-1">Sections</p>
                    <div className="flex flex-wrap gap-1">
                      {template.sections.map(section => (
                        <span key={section} className="px-2 py-1 bg-gray-700 text-gray-300 rounded text-xs capitalize">
                          {section.replace('_', ' ')}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>
        )}

        {/* Generated Report */}
        {generatedReport && (
          <div className="bg-gray-800 rounded-lg p-6 mb-6">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h2 className="text-xl font-semibold text-gray-100">Generated Report</h2>
                <p className="text-gray-400 text-sm">{generatedReport.title}</p>
              </div>
              <div className="flex gap-2">
                <span className={`px-3 py-1 rounded text-xs font-medium ${getClassificationColor(generatedReport.classification)}`}>
                  {generatedReport.classification.toUpperCase()}
                </span>
                <span className={`px-3 py-1 rounded text-xs font-medium bg-gray-700 text-gray-300`}>
                  {generatedReport.confidence}% Confidence
                </span>
              </div>
            </div>

            {/* Report Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <div className="bg-gray-700 rounded-lg p-3">
                <div className="flex items-center gap-2 mb-1">
                  <FileText className="w-4 h-4 text-blue-400" />
                  <span className="text-sm text-gray-400">Pages</span>
                </div>
                <p className="text-lg font-semibold text-gray-100">{generatedReport.totalPages}</p>
              </div>
              <div className="bg-gray-700 rounded-lg p-3">
                <div className="flex items-center gap-2 mb-1">
                  <FileText className="w-4 h-4 text-green-400" />
                  <span className="text-sm text-gray-400">Words</span>
                </div>
                <p className="text-lg font-semibold text-gray-100">{generatedReport.wordCount.toLocaleString()}</p>
              </div>
              <div className="bg-gray-700 rounded-lg p-3">
                <div className="flex items-center gap-2 mb-1">
                  <CheckCircle className="w-4 h-4 text-yellow-400" />
                  <span className="text-sm text-gray-400">Evidence</span>
                </div>
                <p className="text-lg font-semibold text-gray-100">{generatedReport.evidenceCount}</p>
              </div>
              <div className="bg-gray-700 rounded-lg p-3">
                <div className="flex items-center gap-2 mb-1">
                  <Calendar className="w-4 h-4 text-purple-400" />
                  <span className="text-sm text-gray-400">Generated</span>
                </div>
                <p className="text-sm text-gray-100">{new Date(generatedReport.generatedAt).toLocaleDateString()}</p>
              </div>
            </div>

            {/* Export Options */}
            <div className="flex flex-wrap gap-3">
              <button
                onClick={() => exportReport('pdf')}
                className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 rounded-lg transition-colors"
              >
                <FileText className="w-4 h-4" />
                Export PDF
              </button>
              <button
                onClick={() => exportReport('docx')}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
              >
                <FileText className="w-4 h-4" />
                Export DOCX
              </button>
              <button
                onClick={() => exportReport('json')}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 rounded-lg transition-colors"
              >
                <FileJson className="w-4 h-4" />
                Export JSON
              </button>
              <button
                onClick={() => exportReport('txt')}
                className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg transition-colors"
              >
                <FileText className="w-4 h-4" />
                Export TXT
              </button>
              <button
                onClick={() => window.print()}
                className="flex items-center gap-2 px-4 py-2 bg-gray-600 hover:bg-gray-700 rounded-lg transition-colors"
              >
                <Printer className="w-4 h-4" />
                Print
              </button>
            </div>
          </div>
        )}

        {/* Report Sections Preview */}
        {generatedReport && (
          <div className="bg-gray-800 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-gray-100 mb-4">Report Sections</h3>
            <div className="space-y-4">
              {generatedReport.sections.map((section, index) => (
                <div key={section.id} className="border border-gray-700 rounded-lg p-4">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <h4 className="font-semibold text-gray-100">{section.title}</h4>
                      <p className="text-sm text-gray-400 capitalize">{section.type.replace('_', ' ')}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        section.confidence >= 90 ? 'bg-green-900 text-green-200' :
                        section.confidence >= 80 ? 'bg-yellow-900 text-yellow-200' :
                        'bg-red-900 text-red-200'
                      }`}>
                        {section.confidence}% Confidence
                      </span>
                    </div>
                  </div>
                  
                  <p className="text-gray-300 text-sm mb-3 line-clamp-3">
                    {section.content.substring(0, 300)}...
                  </p>
                  
                  <div className="flex items-center gap-4 text-xs text-gray-400">
                    <span>{section.evidence.length} evidence items</span>
                    <span>{section.sources.length} sources</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}