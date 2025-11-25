import React, { useState, useEffect, useRef } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import { FileText, Search, Fingerprint, Clock, User, MapPin, Phone, Mail, DollarSign, Camera, ZoomIn, ZoomOut, RotateCcw, Download, Eye, AlertTriangle, CheckCircle, XCircle } from 'lucide-react';
import { format } from 'date-fns';

// Set up PDF.js worker
pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`;

interface ForensicAnalysis {
  id: string;
  documentId: string;
  authenticity: {
    score: number;
    factors: AuthenticityFactor[];
    verdict: 'authentic' | 'suspicious' | 'forged' | 'inconclusive';
  };
  metadata: DocumentMetadata;
  entities: DetectedEntity[];
  patterns: DetectedPattern[];
  anomalies: DetectedAnomaly[];
  timestamp: string;
}

interface AuthenticityFactor {
  type: 'font' | 'formatting' | 'metadata' | 'language' | 'timeline' | 'cross_reference';
  score: number;
  description: string;
  severity: 'low' | 'medium' | 'high';
}

interface DocumentMetadata {
  fileInfo: {
    name: string;
    size: number;
    type: string;
    created: string;
    modified: string;
    hash: string;
  };
  documentProperties?: {
    author?: string;
    creationDate?: string;
    modificationDate?: string;
    producer?: string;
    creator?: string;
    pageCount?: number;
  };
  textAnalysis: {
    wordCount: number;
    characterCount: number;
    averageWordLength: number;
    readingLevel: string;
    sentiment: 'positive' | 'negative' | 'neutral';
    writingStyle: 'formal' | 'informal' | 'technical' | 'legal';
  };
}

interface DetectedEntity {
  type: 'person' | 'organization' | 'location' | 'date' | 'phone' | 'email' | 'money' | 'address' | 'url';
  text: string;
  position: { start: number; end: number };
  confidence: number;
  context: string;
  crossReferences: string[];
}

interface DetectedPattern {
  type: 'communication' | 'financial' | 'travel' | 'meeting' | 'relationship' | 'transaction';
  description: string;
  entities: string[];
  confidence: number;
  significance: 'low' | 'medium' | 'high';
  timeline?: {
    startDate?: string;
    endDate?: string;
    frequency?: 'once' | 'recurring' | 'ongoing';
  };
}

interface DetectedAnomaly {
  type: 'temporal' | 'linguistic' | 'formatting' | 'logical' | 'cross_reference';
  description: string;
  severity: 'minor' | 'significant' | 'critical';
  explanation: string;
  requiresInvestigation: boolean;
  relatedEvidence?: string[];
}

interface ForensicDocumentAnalyzerProps {
  documentUrl: string;
  documentId: string;
  onAnalysisComplete?: (analysis: ForensicAnalysis) => void;
  caseContext?: {
    caseId: string;
    investigationFocus: string[];
    keyEntities: string[];
    timelineRange: { start: string; end: string };
  };
}

export const ForensicDocumentAnalyzer: React.FC<ForensicDocumentAnalyzerProps> = ({
  documentUrl,
  documentId,
  onAnalysisComplete,
  caseContext
}) => {
  const [numPages, setNumPages] = useState<number>(0);
  const [pageNumber, setPageNumber] = useState<number>(1);
  const [scale, setScale] = useState<number>(1.0);
  const [rotation, setRotation] = useState<number>(0);
  const [analysis, setAnalysis] = useState<ForensicAnalysis | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [selectedEntity, setSelectedEntity] = useState<DetectedEntity | null>(null);
  const [selectedPattern, setSelectedPattern] = useState<DetectedPattern | null>(null);
  const [activeTab, setActiveTab] = useState<'document' | 'entities' | 'patterns' | 'anomalies' | 'metadata'>('document');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [highlightedText, setHighlightedText] = useState<string>('');
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Mock forensic analysis data
  const generateMockAnalysis = (): ForensicAnalysis => {
    return {
      id: `analysis-${Date.now()}`,
      documentId,
      authenticity: {
        score: 87,
        verdict: 'authentic',
        factors: [
          {
            type: 'font',
            score: 92,
            description: 'Consistent font usage throughout document matches period-appropriate typefaces',
            severity: 'low'
          },
          {
            type: 'metadata',
            score: 78,
            description: 'Some metadata fields missing, but core properties consistent with claimed origin',
            severity: 'medium'
          },
          {
            type: 'timeline',
            score: 95,
            description: 'Document content aligns with known historical timeline',
            severity: 'low'
          },
          {
            type: 'cross_reference',
            score: 85,
            description: 'Entities mentioned correlate with other verified documents from same period',
            severity: 'low'
          }
        ]
      },
      metadata: {
        fileInfo: {
          name: 'epstein_flight_logs_2002-2005.pdf',
          size: 2847563,
          type: 'application/pdf',
          created: '2005-12-15T14:30:00Z',
          modified: '2005-12-15T14:30:00Z',
          hash: 'sha256:a7f3b9c2d8e1f4a6c9b2d5e8f1a4c7b9d2e5f8a1c4b7d9e2f5a8c1b4d7e9f2a5c8'
        },
        documentProperties: {
          author: 'Epstein, Jeffrey',
          creationDate: '2005-12-15T14:30:00Z',
          modificationDate: '2005-12-15T14:30:00Z',
          producer: 'Adobe PDF Library 6.0',
          creator: 'Microsoft Word 2003',
          pageCount: 47
        },
        textAnalysis: {
          wordCount: 1247,
          characterCount: 8432,
          averageWordLength: 6.8,
          readingLevel: 'College',
          sentiment: 'neutral',
          writingStyle: 'formal'
        }
      },
      entities: [
        {
          type: 'person',
          text: 'Jeffrey Epstein',
          position: { start: 45, end: 60 },
          confidence: 99,
          context: 'Owner/Operator of aircraft, listed as primary contact',
          crossReferences: ['document-001', 'document-015', 'document-027']
        },
        {
          type: 'person',
          text: 'Ghislaine Maxwell',
          position: { start: 234, end: 251 },
          confidence: 97,
          context: 'Listed as passenger on multiple flights',
          crossReferences: ['document-001', 'document-008', 'document-019']
        },
        {
          type: 'location',
          text: 'Little St. James Island',
          position: { start: 456, end: 477 },
          confidence: 95,
          context: 'Destination of multiple flights',
          crossReferences: ['document-003', 'document-012']
        },
        {
          type: 'date',
          text: 'December 15, 2002',
          position: { start: 123, end: 140 },
          confidence: 98,
          context: 'Flight departure date',
          crossReferences: ['document-001', 'document-007']
        },
        {
          type: 'money',
          text: '$2,500',
          position: { start: 678, end: 684 },
          confidence: 94,
          context: 'Flight cost/charges',
          crossReferences: ['document-001', 'document-004']
        }
      ],
      patterns: [
        {
          type: 'travel',
          description: 'Repeated flights to private island with multiple passengers',
          entities: ['Jeffrey Epstein', 'Ghislaine Maxwell', 'Little St. James Island'],
          confidence: 92,
          significance: 'high',
          timeline: {
            startDate: '2002-01-15',
            endDate: '2005-11-30',
            frequency: 'recurring'
          }
        },
        {
          type: 'relationship',
          description: 'Consistent co-travel patterns suggesting close association',
          entities: ['Jeffrey Epstein', 'Ghislaine Maxwell'],
          confidence: 89,
          significance: 'high'
        }
      ],
      anomalies: [
        {
          type: 'temporal',
          description: 'Flight logged for date before aircraft registration date',
          severity: 'significant',
          explanation: 'One flight entry dated 2002-06-15 but aircraft N-number registration shows effective date of 2002-08-22',
          requiresInvestigation: true,
          relatedEvidence: ['document-001', 'fAA-registration-447N']
        },
        {
          type: 'linguistic',
          description: 'Inconsistent terminology used for same aircraft',
          severity: 'minor',
          explanation: 'Aircraft referred to as both "Gulfstream" and "G-1159A" in same document',
          requiresInvestigation: false
        }
      ],
      timestamp: new Date().toISOString()
    };
  };

  const onDocumentLoadSuccess = ({ numPages }: { numPages: number }) => {
    setNumPages(numPages);
    setPageNumber(1);
  };

  const goToPrevPage = () => {
    if (pageNumber > 1) {
      setPageNumber(pageNumber - 1);
    }
  };

  const goToNextPage = () => {
    if (pageNumber < numPages) {
      setPageNumber(pageNumber + 1);
    }
  };

  const zoomIn = () => setScale(scale + 0.1);
  const zoomOut = () => setScale(Math.max(0.5, scale - 0.1));
  const rotateClockwise = () => setRotation((rotation + 90) % 360);

  const startForensicAnalysis = async () => {
    setIsAnalyzing(true);
    
    // Simulate forensic analysis process
    const steps = [
      { progress: 10, message: 'Analyzing document metadata...' },
      { progress: 25, message: 'Extracting text content...' },
      { progress: 40, message: 'Identifying entities and patterns...' },
      { progress: 60, message: 'Cross-referencing with case database...' },
      { progress: 80, message: 'Detecting anomalies and inconsistencies...' },
      { progress: 95, message: 'Generating forensic report...' }
    ];

    for (const step of steps) {
      await new Promise(resolve => setTimeout(resolve, 800));
      // Update progress would go here
    }

    const mockAnalysis = generateMockAnalysis();
    setAnalysis(mockAnalysis);
    setIsAnalyzing(false);
    
    if (onAnalysisComplete) {
      onAnalysisComplete(mockAnalysis);
    }
  };

  const getEntityIcon = (type: DetectedEntity['type']) => {
    switch (type) {
      case 'person': return User;
      case 'organization': return FileText;
      case 'location': return MapPin;
      case 'date': return Clock;
      case 'phone': return Phone;
      case 'email': return Mail;
      case 'money': return DollarSign;
      case 'address': return MapPin;
      case 'url': return FileText;
      default: return FileText;
    }
  };

  const getAuthenticityColor = (score: number) => {
    if (score >= 90) return 'text-green-600';
    if (score >= 70) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'low': return 'text-green-600';
      case 'medium': return 'text-yellow-600';
      case 'high': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  const getAnomalySeverityColor = (severity: string) => {
    switch (severity) {
      case 'minor': return 'text-yellow-600';
      case 'significant': return 'text-orange-600';
      case 'critical': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  return (
    <div className="bg-gray-900 text-gray-100 min-h-screen p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Forensic Document Analyzer</h1>
          <p className="text-gray-400">Advanced document authentication and forensic analysis</p>
        </div>

        {/* Document Viewer and Analysis Panel */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Document Viewer */}
          <div className="bg-gray-800 rounded-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-white">Document Viewer</h2>
              <div className="flex items-center gap-2">
                <button
                  onClick={zoomOut}
                  className="p-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors"
                >
                  <ZoomOut className="w-4 h-4" />
                </button>
                <span className="text-sm text-gray-400 min-w-12 text-center">
                  {Math.round(scale * 100)}%
                </span>
                <button
                  onClick={zoomIn}
                  className="p-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors"
                >
                  <ZoomIn className="w-4 h-4" />
                </button>
                <button
                  onClick={rotateClockwise}
                  className="p-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors"
                >
                  <RotateCcw className="w-4 h-4" />
                </button>
                <button
                  onClick={startForensicAnalysis}
                  disabled={isAnalyzing}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 disabled:bg-gray-600 text-white rounded-lg transition-colors"
                >
                  <Fingerprint className="w-4 h-4 mr-2 inline" />
                  {isAnalyzing ? 'Analyzing...' : 'Analyze Document'}
                </button>
              </div>
            </div>

            {/* Search Bar */}
            <div className="mb-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search document..."
                  className="w-full pl-10 pr-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400"
                />
              </div>
            </div>

            {/* PDF Viewer */}
            <div className="border border-gray-700 rounded-lg overflow-hidden bg-white">
              <Document
                file={documentUrl}
                onLoadSuccess={onDocumentLoadSuccess}
                loading={<div className="p-8 text-center text-gray-600">Loading document...</div>}
                error={<div className="p-8 text-center text-red-600">Error loading document</div>}
              >
                <Page
                  pageNumber={pageNumber}
                  scale={scale}
                  rotate={rotation}
                  loading={<div className="p-8 text-center text-gray-600">Loading page...</div>}
                />
              </Document>
            </div>

            {/* Page Navigation */}
            {numPages > 0 && (
              <div className="flex items-center justify-between mt-4">
                <button
                  onClick={goToPrevPage}
                  disabled={pageNumber <= 1}
                  className="px-3 py-1 bg-gray-700 hover:bg-gray-600 disabled:bg-gray-800 disabled:text-gray-500 rounded-lg transition-colors"
                >
                  Previous
                </button>
                <span className="text-sm text-gray-400">
                  Page {pageNumber} of {numPages}
                </span>
                <button
                  onClick={goToNextPage}
                  disabled={pageNumber >= numPages}
                  className="px-3 py-1 bg-gray-700 hover:bg-gray-600 disabled:bg-gray-800 disabled:text-gray-500 rounded-lg transition-colors"
                >
                  Next
                </button>
              </div>
            )}
          </div>

          {/* Analysis Panel */}
          <div className="bg-gray-800 rounded-lg p-6">
            {/* Authenticity Score */}
            {analysis && (
              <div className="mb-6">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-lg font-semibold text-white">Authenticity Score</h3>
                  <span className={`text-2xl font-bold ${getAuthenticityColor(analysis.authenticity.score)}`}>
                    {analysis.authenticity.score}%
                  </span>
                </div>
                <div className="w-full bg-gray-700 rounded-full h-3">
                  <div
                    className={`h-3 rounded-full ${
                      analysis.authenticity.score >= 90 ? 'bg-green-600' :
                      analysis.authenticity.score >= 70 ? 'bg-yellow-600' : 'bg-red-600'
                    }`}
                    style={{ width: `${analysis.authenticity.score}%` }}
                  ></div>
                </div>
                <div className="flex items-center gap-2 mt-2">
                  {analysis.authenticity.verdict === 'authentic' && <CheckCircle className="w-5 h-5 text-green-600" />}
                  {analysis.authenticity.verdict === 'suspicious' && <AlertTriangle className="w-5 h-5 text-yellow-600" />}
                  {analysis.authenticity.verdict === 'forged' && <XCircle className="w-5 h-5 text-red-600" />}
                  <span className="text-sm text-gray-300 capitalize">{analysis.authenticity.verdict}</span>
                </div>
              </div>
            )}

            {/* Analysis Tabs */}
            <div className="mb-4">
              <div className="flex flex-wrap gap-1">
                {[
                  { id: 'entities', label: 'Entities', icon: User },
                  { id: 'patterns', label: 'Patterns', icon: FileText },
                  { id: 'anomalies', label: 'Anomalies', icon: AlertTriangle },
                  { id: 'metadata', label: 'Metadata', icon: FileText }
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as any)}
                    className={`flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                      activeTab === tab.id
                        ? 'bg-red-600 text-white'
                        : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                    }`}
                  >
                    <tab.icon className="w-4 h-4" />
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Tab Content */}
            {analysis && (
              <div className="space-y-4 max-h-96 overflow-y-auto">
                {activeTab === 'entities' && (
                  <div>
                    <h4 className="text-white font-medium mb-3">Detected Entities ({analysis.entities.length})</h4>
                    <div className="space-y-2">
                      {analysis.entities.map((entity, index) => (
                        <div
                          key={index}
                          className="p-3 bg-gray-700 rounded-lg cursor-pointer hover:bg-gray-650 transition-colors"
                          onClick={() => setSelectedEntity(entity)}
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-gray-600 rounded-full flex items-center justify-center">
                              {React.createElement(getEntityIcon(entity.type), { className: 'w-4 h-4 text-gray-300' })}
                            </div>
                            <div className="flex-1">
                              <p className="text-white font-medium">{entity.text}</p>
                              <p className="text-gray-400 text-sm capitalize">{entity.type}</p>
                            </div>
                            <div className="text-right">
                              <p className="text-sm text-gray-400">{Math.round(entity.confidence)}% confidence</p>
                              <p className="text-xs text-gray-500">{entity.crossReferences.length} refs</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {activeTab === 'patterns' && (
                  <div>
                    <h4 className="text-white font-medium mb-3">Detected Patterns ({analysis.patterns.length})</h4>
                    <div className="space-y-3">
                      {analysis.patterns.map((pattern, index) => (
                        <div
                          key={index}
                          className="p-3 bg-gray-700 rounded-lg cursor-pointer hover:bg-gray-650 transition-colors border-l-4"
                          style={{ borderLeftColor: pattern.significance === 'high' ? '#ef4444' : pattern.significance === 'medium' ? '#f59e0b' : '#10b981' }}
                          onClick={() => setSelectedPattern(pattern)}
                        >
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-xs text-gray-400 uppercase">{pattern.type}</span>
                            <span className={`text-xs px-2 py-1 rounded ${
                              pattern.significance === 'high' ? 'bg-red-900 text-red-300' :
                              pattern.significance === 'medium' ? 'bg-yellow-900 text-yellow-300' : 'bg-green-900 text-green-300'
                            }`}>
                              {pattern.significance}
                            </span>
                          </div>
                          <p className="text-white text-sm mb-2">{pattern.description}</p>
                          <div className="flex items-center justify-between text-xs text-gray-400">
                            <span>{pattern.entities.length} entities</span>
                            <span>{Math.round(pattern.confidence)}% confidence</span>
                          </div>
                          {pattern.timeline && (
                            <div className="mt-2 text-xs text-gray-500">
                              {pattern.timeline.frequency === 'recurring' && '↻ Recurring pattern'}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {activeTab === 'anomalies' && (
                  <div>
                    <h4 className="text-white font-medium mb-3">Detected Anomalies ({analysis.anomalies.length})</h4>
                    <div className="space-y-3">
                      {analysis.anomalies.map((anomaly, index) => (
                        <div
                          key={index}
                          className="p-3 bg-gray-700 rounded-lg border-l-4"
                          style={{ borderLeftColor: anomaly.severity === 'critical' ? '#ef4444' : anomaly.severity === 'significant' ? '#f59e0b' : '#6b7280' }}
                        >
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-xs text-gray-400 uppercase">{anomaly.type}</span>
                            <span className={`text-xs px-2 py-1 rounded ${
                              anomaly.severity === 'critical' ? 'bg-red-900 text-red-300' :
                              anomaly.severity === 'significant' ? 'bg-orange-900 text-orange-300' : 'bg-gray-700 text-gray-300'
                            }`}>
                              {anomaly.severity}
                            </span>
                          </div>
                          <p className="text-white text-sm mb-2">{anomaly.description}</p>
                          <p className="text-gray-400 text-xs mb-2">{anomaly.explanation}</p>
                          {anomaly.requiresInvestigation && (
                            <div className="flex items-center gap-1 text-xs text-red-400">
                              <AlertTriangle className="w-3 h-3" />
                              Requires investigation
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {activeTab === 'metadata' && (
                  <div>
                    <h4 className="text-white font-medium mb-3">Document Metadata</h4>
                    <div className="space-y-3">
                      <div className="p-3 bg-gray-700 rounded-lg">
                        <h5 className="text-white font-medium mb-2">File Information</h5>
                        <div className="space-y-1 text-sm">
                          <div className="flex justify-between">
                            <span className="text-gray-400">Filename:</span>
                            <span className="text-white">{analysis.metadata.fileInfo.name}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-400">Size:</span>
                            <span className="text-white">{(analysis.metadata.fileInfo.size / 1024 / 1024).toFixed(2)} MB</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-400">Type:</span>
                            <span className="text-white">{analysis.metadata.fileInfo.type}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-400">Hash:</span>
                            <span className="text-white text-xs font-mono">{analysis.metadata.fileInfo.hash.substring(0, 16)}...</span>
                          </div>
                        </div>
                      </div>
                      
                      {analysis.metadata.documentProperties && (
                        <div className="p-3 bg-gray-700 rounded-lg">
                          <h5 className="text-white font-medium mb-2">Document Properties</h5>
                          <div className="space-y-1 text-sm">
                            {analysis.metadata.documentProperties.author && (
                              <div className="flex justify-between">
                                <span className="text-gray-400">Author:</span>
                                <span className="text-white">{analysis.metadata.documentProperties.author}</span>
                              </div>
                            )}
                            {analysis.metadata.documentProperties.pageCount && (
                              <div className="flex justify-between">
                                <span className="text-gray-400">Pages:</span>
                                <span className="text-white">{analysis.metadata.documentProperties.pageCount}</span>
                              </div>
                            )}
                            {analysis.metadata.documentProperties.creationDate && (
                              <div className="flex justify-between">
                                <span className="text-gray-400">Created:</span>
                                <span className="text-white">{format(new Date(analysis.metadata.documentProperties.creationDate), 'PPP')}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                      
                      <div className="p-3 bg-gray-700 rounded-lg">
                        <h5 className="text-white font-medium mb-2">Text Analysis</h5>
                        <div className="space-y-1 text-sm">
                          <div className="flex justify-between">
                            <span className="text-gray-400">Word Count:</span>
                            <span className="text-white">{analysis.metadata.textAnalysis.wordCount.toLocaleString()}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-400">Reading Level:</span>
                            <span className="text-white">{analysis.metadata.textAnalysis.readingLevel}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-400">Sentiment:</span>
                            <span className="text-white capitalize">{analysis.metadata.textAnalysis.sentiment}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-400">Style:</span>
                            <span className="text-white capitalize">{analysis.metadata.textAnalysis.writingStyle}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {!analysis && !isAnalyzing && (
              <div className="text-center py-8">
                <Fingerprint className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-300 mb-2">No Analysis Yet</h3>
                <p className="text-gray-400 mb-4">
                  Click "Analyze Document" to perform forensic analysis
                </p>
              </div>
            )}

            {isAnalyzing && (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600 mx-auto mb-4"></div>
                <h3 className="text-lg font-medium text-gray-300 mb-2">Analyzing Document...</h3>
                <p className="text-gray-400">
                  Performing forensic analysis and cross-referencing with case database
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Detailed Entity/Pattern Modal */}
        {(selectedEntity || selectedPattern) && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-gray-800 rounded-lg p-6 w-full max-w-2xl max-h-[80vh] overflow-y-auto">
              {selectedEntity && (
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-xl font-semibold text-white">Entity Details</h3>
                    <button
                      onClick={() => setSelectedEntity(null)}
                      className="text-gray-400 hover:text-white"
                    >
                      <XCircle className="w-6 h-6" />
                    </button>
                  </div>
                  <div className="space-y-4">
                    <div>
                      <h4 className="text-white font-medium mb-2">{selectedEntity.text}</h4>
                      <p className="text-gray-400 capitalize">{selectedEntity.type}</p>
                    </div>
                    <div>
                      <h5 className="text-white font-medium mb-1">Context</h5>
                      <p className="text-gray-300 text-sm">{selectedEntity.context}</p>
                    </div>
                    <div>
                      <h5 className="text-white font-medium mb-1">Cross References</h5>
                      <div className="space-y-1">
                        {selectedEntity.crossReferences.map((ref, index) => (
                          <div key={index} className="text-sm text-blue-400 hover:text-blue-300 cursor-pointer">
                            {ref}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}
              
              {selectedPattern && (
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-xl font-semibold text-white">Pattern Analysis</h3>
                    <button
                      onClick={() => setSelectedPattern(null)}
                      className="text-gray-400 hover:text-white"
                    >
                      <XCircle className="w-6 h-6" />
                    </button>
                  </div>
                  <div className="space-y-4">
                    <div>
                      <h4 className="text-white font-medium mb-2">{selectedPattern.description}</h4>
                      <span className={`text-xs px-2 py-1 rounded ${
                        selectedPattern.significance === 'high' ? 'bg-red-900 text-red-300' :
                        selectedPattern.significance === 'medium' ? 'bg-yellow-900 text-yellow-300' : 'bg-green-900 text-green-300'
                      }`}>
                        {selectedPattern.significance} significance
                      </span>
                    </div>
                    <div>
                      <h5 className="text-white font-medium mb-1">Involved Entities</h5>
                      <div className="flex flex-wrap gap-2">
                        {selectedPattern.entities.map((entity, index) => (
                          <span key={index} className="px-2 py-1 bg-gray-700 text-gray-300 rounded text-sm">
                            {entity}
                          </span>
                        ))}
                      </div>
                    </div>
                    {selectedPattern.timeline && (
                      <div>
                        <h5 className="text-white font-medium mb-1">Timeline</h5>
                        <div className="text-sm text-gray-300">
                          {selectedPattern.timeline.frequency === 'recurring' && '↻ Recurring pattern'}
                          {selectedPattern.timeline.startDate && (
                            <div>Start: {format(new Date(selectedPattern.timeline.startDate), 'PPP')}</div>
                          )}
                          {selectedPattern.timeline.endDate && (
                            <div>End: {format(new Date(selectedPattern.timeline.endDate), 'PPP')}</div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};