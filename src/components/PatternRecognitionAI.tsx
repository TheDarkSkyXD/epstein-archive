import React, { useState, useEffect } from 'react';
import { Investigation, EvidenceItem, TimelineEvent } from '../types/investigation';
import { BarChart3, TrendingUp, AlertTriangle, Target, Clock, DollarSign, Users, MapPin, FileText, Activity, X } from 'lucide-react';

interface PatternRecognitionAIProps {
  investigation: Investigation;
  evidence: EvidenceItem[];
  timelineEvents: TimelineEvent[];
  onPatternDetected?: (patterns: DetectedPattern[]) => void;
}

export interface DetectedPattern {
  id: string;
  type: 'temporal' | 'financial' | 'communication' | 'behavioral' | 'geographic' | 'network';
  title: string;
  description: string;
  confidence: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
  evidenceIds: string[];
  timelineEventIds: string[];
  entities: string[];
  metadata: {
    frequency?: number;
    timeRange?: { start: string; end: string };
    locations?: string[];
    financialAmounts?: number[];
    communicationFrequency?: number;
    networkDensity?: number;
    anomalyScore?: number;
  };
  recommendations: string[];
}

export const PatternRecognitionAI: React.FC<PatternRecognitionAIProps> = ({
  investigation,
  evidence,
  timelineEvents,
  onPatternDetected
}) => {
  const [detectedPatterns, setDetectedPatterns] = useState<DetectedPattern[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [selectedPattern, setSelectedPattern] = useState<DetectedPattern | null>(null);
  const [analysisProgress, setAnalysisProgress] = useState(0);

  const analyzePatterns = async () => {
    setIsAnalyzing(true);
    setAnalysisProgress(0);

    // Simulate progressive analysis
    const progressSteps = [
      { progress: 20, message: 'Analyzing temporal patterns...' },
      { progress: 40, message: 'Detecting financial anomalies...' },
      { progress: 60, message: 'Mapping communication networks...' },
      { progress: 80, message: 'Identifying behavioral patterns...' },
      { progress: 100, message: 'Pattern analysis complete!' }
    ];

    for (const step of progressSteps) {
      await new Promise(resolve => setTimeout(resolve, 800));
      setAnalysisProgress(step.progress);
    }

    // Generate mock patterns based on Epstein investigation
    const mockPatterns: DetectedPattern[] = [
      {
        id: 'pattern-001',
        type: 'temporal',
        title: 'Suspicious Flight Pattern Clustering',
        description: 'Multiple flights to private island concentrated during specific time periods, suggesting coordinated activities.',
        confidence: 92,
        severity: 'critical',
        evidenceIds: ['evidence-1', 'evidence-2'],
        timelineEventIds: ['event-1', 'event-2'],
        entities: ['Jeffrey Epstein', 'Little St. James Island', 'Private Jet'],
        metadata: {
          frequency: 47,
          timeRange: { start: '2002-01-01', end: '2005-12-31' },
          locations: ['St. Thomas', 'Palm Beach', 'New York'],
          anomalyScore: 8.7
        },
        recommendations: [
          'Cross-reference flight logs with known victim testimonies',
          'Analyze passenger manifests for patterns',
          'Investigate ground transportation arrangements'
        ]
      },
      {
        id: 'pattern-002',
        type: 'financial',
        title: 'Unusual Financial Transaction Timing',
        description: 'Large financial transfers occurring immediately before or after significant events, suggesting potential influence operations.',
        confidence: 88,
        severity: 'high',
        evidenceIds: ['evidence-2'],
        timelineEventIds: ['event-2'],
        entities: ['Jeffrey Epstein', 'Les Wexner', 'Financial Accounts'],
        metadata: {
          financialAmounts: [5000000, 10000000, 2500000],
          timeRange: { start: '2007-03-01', end: '2007-04-30' },
          anomalyScore: 7.9
        },
        recommendations: [
          'Subpoena complete financial records',
          'Analyze transaction beneficiaries',
          'Trace fund origins and destinations'
        ]
      },
      {
        id: 'pattern-003',
        type: 'network',
        title: 'High-Profile Connection Density',
        description: 'Disproportionate number of connections to politically powerful individuals compared to typical social networks.',
        confidence: 85,
        severity: 'high',
        evidenceIds: ['evidence-3'],
        timelineEventIds: ['event-1'],
        entities: ['Jeffrey Epstein', 'Prince Andrew', 'Bill Clinton', 'Donald Trump'],
        metadata: {
          networkDensity: 0.73,
          communicationFrequency: 234,
          anomalyScore: 8.2
        },
        recommendations: [
          'Map complete social network topology',
          'Analyze introduction patterns',
          'Investigate mutual benefit relationships'
        ]
      },
      {
        id: 'pattern-004',
        type: 'behavioral',
        title: 'Victim Recruitment Pattern',
        description: 'Systematic recruitment of victims through trusted intermediaries, often targeting vulnerable populations.',
        confidence: 94,
        severity: 'critical',
        evidenceIds: ['evidence-1', 'evidence-3'],
        timelineEventIds: ['event-1'],
        entities: ['Ghislaine Maxwell', 'Recruitment Network', 'Victims'],
        metadata: {
          frequency: 67,
          timeRange: { start: '1995-01-01', end: '2010-12-31' },
          locations: ['Palm Beach', 'New York', 'Paris', 'London'],
          anomalyScore: 9.1
        },
        recommendations: [
          'Interview all identified recruitment intermediaries',
          'Analyze victim demographic patterns',
          'Map recruitment location geography'
        ]
      },
      {
        id: 'pattern-005',
        type: 'geographic',
        title: 'Cross-Border Activity Concentration',
        description: 'Frequent international travel and activities across multiple jurisdictions, potentially to exploit legal gaps.',
        confidence: 79,
        severity: 'medium',
        evidenceIds: ['evidence-1'],
        timelineEventIds: ['event-1', 'event-2'],
        entities: ['Jeffrey Epstein', 'International Properties', 'Multiple Countries'],
        metadata: {
          locations: ['United States', 'US Virgin Islands', 'France', 'United Kingdom'],
          frequency: 89,
          timeRange: { start: '2000-01-01', end: '2019-12-31' },
          anomalyScore: 6.8
        },
        recommendations: [
          'Coordinate with international law enforcement',
          'Analyze extradition treaty implications',
          'Map property ownership patterns'
        ]
      }
    ];

    setDetectedPatterns(mockPatterns);
    setIsAnalyzing(false);
    
    if (onPatternDetected) {
      onPatternDetected(mockPatterns);
    }
  };

  const getPatternIcon = (type: DetectedPattern['type']) => {
    const icons = {
      temporal: Clock,
      financial: DollarSign,
      communication: Activity,
      behavioral: Users,
      geographic: MapPin,
      network: Target
    };
    return icons[type];
  };

  const getSeverityColor = (severity: DetectedPattern['severity']) => {
    const colors = {
      low: 'bg-green-100 text-green-800 border-green-200',
      medium: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      high: 'bg-orange-100 text-orange-800 border-orange-200',
      critical: 'bg-red-100 text-red-800 border-red-200'
    };
    return colors[severity];
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 90) return 'text-green-600';
    if (confidence >= 70) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <div className="bg-white rounded-lg shadow-lg">
      {/* Header */}
      <div className="border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">
              AI Pattern Recognition
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              Advanced AI analysis to detect suspicious patterns and anomalies
            </p>
          </div>
          <button
            onClick={analyzePatterns}
            disabled={isAnalyzing}
            className="flex items-center px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <BarChart3 className="w-4 h-4 mr-2" />
            {isAnalyzing ? 'Analyzing...' : 'Start Pattern Analysis'}
          </button>
        </div>
      </div>

      {/* Analysis Progress */}
      {isAnalyzing && (
        <div className="px-6 py-4 bg-purple-50 border-b border-purple-200">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-purple-900">
              Analyzing patterns across evidence...
            </span>
            <span className="text-sm text-purple-700">{analysisProgress}%</span>
          </div>
          <div className="w-full bg-purple-200 rounded-full h-2">
            <div
              className="bg-purple-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${analysisProgress}%` }}
            />
          </div>
        </div>
      )}

      {/* Pattern Results */}
      {!isAnalyzing && detectedPatterns.length > 0 && (
        <div className="p-6">
          <div className="mb-4">
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Detected Patterns ({detectedPatterns.length})
            </h3>
            <p className="text-sm text-gray-600">
              AI has identified {detectedPatterns.length} suspicious patterns with varying confidence levels
            </p>
          </div>

          <div className="grid gap-4">
            {detectedPatterns.map((pattern) => {
              const Icon = getPatternIcon(pattern.type);
              return (
                <div
                  key={pattern.id}
                  className={`border rounded-lg p-4 cursor-pointer transition-all hover:shadow-md ${
                    selectedPattern?.id === pattern.id ? 'ring-2 ring-purple-500' : ''
                  }`}
                  onClick={() => setSelectedPattern(pattern)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start flex-1">
                      <div className={`p-2 rounded-lg ${getSeverityColor(pattern.severity)} mr-3`}>
                        <Icon className="w-5 h-5" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-1">
                          <h4 className="text-sm font-medium text-gray-900">
                            {pattern.title}
                          </h4>
                          <div className="flex items-center gap-2">
                            <span className={`text-sm font-medium ${getConfidenceColor(pattern.confidence)}`}>
                              {pattern.confidence}% confidence
                            </span>
                            <span className={`px-2 py-1 text-xs font-medium rounded-full ${getSeverityColor(pattern.severity)}`}>
                              {pattern.severity.toUpperCase()}
                            </span>
                          </div>
                        </div>
                        <p className="text-sm text-gray-600 mb-2">
                          {pattern.description}
                        </p>
                        <div className="flex items-center gap-4 text-xs text-gray-500">
                          <span>Type: {pattern.type}</span>
                          <span>Entities: {pattern.entities.length}</span>
                          <span>Evidence: {pattern.evidenceIds.length} items</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Pattern Detail Modal */}
      {selectedPattern && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-96 overflow-auto">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="text-lg font-medium text-gray-900">
                  {selectedPattern.title}
                </h3>
                <div className="flex items-center gap-2 mt-1">
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${getSeverityColor(selectedPattern.severity)}`}>
                    {selectedPattern.severity.toUpperCase()}
                  </span>
                  <span className={`text-sm font-medium ${getConfidenceColor(selectedPattern.confidence)}`}>
                    {selectedPattern.confidence}% confidence
                  </span>
                </div>
              </div>
              <button
                onClick={() => setSelectedPattern(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-1">Description</h4>
                <p className="text-sm text-gray-600">{selectedPattern.description}</p>
              </div>

              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-1">Involved Entities</h4>
                <div className="flex flex-wrap gap-2">
                  {selectedPattern.entities.map((entity, index) => (
                    <span key={index} className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded">
                      {entity}
                    </span>
                  ))}
                </div>
              </div>

              {selectedPattern.metadata.timeRange && (
                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-1">Time Range</h4>
                  <p className="text-sm text-gray-600">
                    {selectedPattern.metadata.timeRange.start} to {selectedPattern.metadata.timeRange.end}
                  </p>
                </div>
              )}

              {selectedPattern.metadata.locations && selectedPattern.metadata.locations.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-1">Locations</h4>
                  <div className="flex flex-wrap gap-2">
                    {selectedPattern.metadata.locations.map((location, index) => (
                      <span key={index} className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded">
                        {location}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-2">Investigation Recommendations</h4>
                <ul className="space-y-1">
                  {selectedPattern.recommendations.map((recommendation, index) => (
                    <li key={index} className="text-sm text-gray-600 flex items-start">
                      <span className="w-1.5 h-1.5 rounded-full bg-purple-600 mt-2 mr-2 flex-shrink-0"></span>
                      {recommendation}
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setSelectedPattern(null)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
              >
                Close
              </button>
              <button className="px-4 py-2 text-sm font-medium text-white bg-purple-600 rounded-md hover:bg-purple-700 transition-colors">
                Add to Investigation
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Empty State */}
      {!isAnalyzing && detectedPatterns.length === 0 && (
        <div className="p-12 text-center">
          <BarChart3 className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-sm font-medium text-gray-900 mb-2">
            No patterns detected yet
          </h3>
          <p className="text-sm text-gray-600 mb-4">
            Start pattern analysis to identify suspicious activities, behavioral patterns, and anomalies in your evidence.
          </p>
          <button
            onClick={analyzePatterns}
            className="px-4 py-2 bg-purple-600 text-white text-sm rounded-md hover:bg-purple-700 transition-colors"
          >
            Start Pattern Analysis
          </button>
        </div>
      )}
    </div>
  );
};