import React, { useState, useEffect } from 'react';
import { Investigation, EvidenceItem } from '../types/investigation';
import { Activity, Clock, Users, MessageSquare, TrendingUp, AlertTriangle, Filter, Calendar, Mail, Phone, X } from 'lucide-react';

interface CommunicationAnalysisProps {
  investigation: Investigation;
  evidence: EvidenceItem[];
  onCommunicationPatternDetected?: (patterns: CommunicationPattern[]) => void;
}

export interface CommunicationPattern {
  id: string;
  type: 'frequency' | 'timing' | 'content' | 'network' | 'anomaly';
  title: string;
  description: string;
  confidence: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
  participants: string[];
  evidenceIds: string[];
  metadata: {
    frequency?: number;
    timeRange?: { start: string; end: string };
    communicationChannels?: string[];
    messageCount?: number;
    responseTime?: number;
    anomalyScore?: number;
    networkDensity?: number;
  };
  recommendations: string[];
}

interface CommunicationEvent {
  id: string;
  timestamp: string;
  sender: string;
  recipients: string[];
  type: 'email' | 'phone' | 'text' | 'meeting';
  content?: string;
  metadata: {
    duration?: number;
    location?: string;
    urgency?: 'low' | 'medium' | 'high';
    encrypted?: boolean;
  };
}

export const CommunicationAnalysis: React.FC<CommunicationAnalysisProps> = ({
  investigation,
  evidence,
  onCommunicationPatternDetected
}) => {
  const [communicationPatterns, setCommunicationPatterns] = useState<CommunicationPattern[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [selectedPattern, setSelectedPattern] = useState<CommunicationPattern | null>(null);
  const [analysisProgress, setAnalysisProgress] = useState(0);
  const [filterType, setFilterType] = useState<'all' | 'frequency' | 'timing' | 'content' | 'network' | 'anomaly'>('all');

  const analyzeCommunications = async () => {
    setIsAnalyzing(true);
    setAnalysisProgress(0);

    // Simulate progressive analysis
    const progressSteps = [
      { progress: 15, message: 'Scanning communication metadata...' },
      { progress: 30, message: 'Analyzing frequency patterns...' },
      { progress: 45, message: 'Detecting timing anomalies...' },
      { progress: 60, message: 'Mapping communication networks...' },
      { progress: 75, message: 'Identifying suspicious content patterns...' },
      { progress: 90, message: 'Cross-referencing with known associates...' },
      { progress: 100, message: 'Communication analysis complete!' }
    ];

    for (const step of progressSteps) {
      await new Promise(resolve => setTimeout(resolve, 700));
      setAnalysisProgress(step.progress);
    }

    // Generate mock communication patterns based on Epstein investigation
    const mockPatterns: CommunicationPattern[] = [
      {
        id: 'comm-001',
        type: 'frequency',
        title: 'Unusual Communication Frequency Spikes',
        description: 'Significant increases in communication frequency during key investigation periods, suggesting coordination efforts.',
        confidence: 91,
        severity: 'high',
        participants: ['Jeffrey Epstein', 'Legal Team', 'Ghislaine Maxwell'],
        evidenceIds: ['evidence-1', 'evidence-2'],
        metadata: {
          frequency: 347,
          timeRange: { start: '2006-07-01', end: '2006-08-31' },
          communicationChannels: ['Email', 'Phone', 'Encrypted Messaging'],
          messageCount: 1247,
          anomalyScore: 8.3
        },
        recommendations: [
          'Subpoena complete communication records for identified period',
          'Analyze message content for coordination language',
          'Cross-reference with investigation milestones'
        ]
      },
      {
        id: 'comm-002',
        type: 'timing',
        title: 'Late-Night Communication Clusters',
        description: 'Concentrated communication activity during late-night hours, potentially indicating covert coordination.',
        confidence: 87,
        severity: 'medium',
        participants: ['Jeffrey Epstein', 'International Contacts'],
        evidenceIds: ['evidence-3'],
        metadata: {
          frequency: 89,
          timeRange: { start: '2005-01-01', end: '2007-12-31' },
          communicationChannels: ['Phone', 'Encrypted Email'],
          responseTime: 2.3,
          anomalyScore: 7.1
        },
        recommendations: [
          'Analyze time zone differences for international contacts',
          'Map communication timing to significant events',
          'Investigate encryption methods used'
        ]
      },
      {
        id: 'comm-003',
        type: 'network',
        title: 'Hub-and-Spoke Communication Pattern',
        description: 'Epstein acts as central hub with direct communication to key nodes, minimizing direct contact between associates.',
        confidence: 93,
        severity: 'critical',
        participants: ['Jeffrey Epstein', 'Ghislaine Maxwell', 'Les Wexner', 'Prince Andrew'],
        evidenceIds: ['evidence-1', 'evidence-2', 'evidence-3'],
        metadata: {
          networkDensity: 0.15,
          communicationChannels: ['Phone', 'Email', 'In-Person'],
          messageCount: 2341,
          anomalyScore: 8.9
        },
        recommendations: [
          'Map complete communication network topology',
          'Identify intermediary communication channels',
          'Analyze message routing patterns'
        ]
      },
      {
        id: 'comm-004',
        type: 'content',
        title: 'Evasive Language Patterns',
        description: 'Use of coded language, euphemisms, and deliberately vague terminology in communications.',
        confidence: 82,
        severity: 'high',
        participants: ['Jeffrey Epstein', 'Ghislaine Maxwell', 'Recruitment Network'],
        evidenceIds: ['evidence-2'],
        metadata: {
          frequency: 156,
          communicationChannels: ['Text', 'Email'],
          messageCount: 892,
          anomalyScore: 7.6
        },
        recommendations: [
          'Conduct linguistic analysis of message content',
          'Cross-reference coded terms with known activities',
          'Interview participants about terminology meaning'
        ]
      },
      {
        id: 'comm-005',
        type: 'anomaly',
        title: 'Communication Blackout Periods',
        description: 'Unusual periods of complete communication silence followed by intense activity, suggesting deliberate avoidance.',
        confidence: 89,
        severity: 'high',
        participants: ['Jeffrey Epstein', 'Key Associates'],
        evidenceIds: ['evidence-1', 'evidence-3'],
        metadata: {
          timeRange: { start: '2008-06-01', end: '2008-07-15' },
          communicationChannels: ['All Channels'],
          frequency: 0,
          anomalyScore: 8.7
        },
        recommendations: [
          'Investigate reasons for communication gaps',
          'Cross-reference with external investigation timing',
          'Analyze alternative communication methods'
        ]
      }
    ];

    setCommunicationPatterns(mockPatterns);
    setIsAnalyzing(false);
    
    if (onCommunicationPatternDetected) {
      onCommunicationPatternDetected(mockPatterns);
    }
  };

  const getPatternIcon = (type: CommunicationPattern['type']) => {
    const icons = {
      frequency: TrendingUp,
      timing: Clock,
      content: MessageSquare,
      network: Users,
      anomaly: AlertTriangle
    };
    return icons[type];
  };

  const getCommunicationIcon = (channel: string) => {
    const icons = {
      email: Mail,
      phone: Phone,
      text: MessageSquare,
      meeting: Users
    };
    return icons[channel as keyof typeof icons] || MessageSquare;
  };

  const getSeverityColor = (severity: CommunicationPattern['severity']) => {
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

  const filteredPatterns = filterType === 'all' 
    ? communicationPatterns 
    : communicationPatterns.filter(pattern => pattern.type === filterType);

  return (
    <div className="bg-white rounded-lg shadow-lg">
      {/* Header */}
      <div className="border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">
              Communication Forensics
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              Analyze communication patterns, timing, and network effects
            </p>
          </div>
          <button
            onClick={analyzeCommunications}
            disabled={isAnalyzing}
            className="flex items-center px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <Activity className="w-4 h-4 mr-2" />
            {isAnalyzing ? 'Analyzing...' : 'Start Communication Analysis'}
          </button>
        </div>
      </div>

      {/* Analysis Progress */}
      {isAnalyzing && (
        <div className="px-6 py-4 bg-red-50 border-b border-red-200">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-red-900">
              Analyzing communication patterns...
            </span>
            <span className="text-sm text-red-700">{analysisProgress}%</span>
          </div>
          <div className="w-full bg-red-200 rounded-full h-2">
            <div
              className="bg-red-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${analysisProgress}%` }}
            />
          </div>
        </div>
      )}

      {/* Filters */}
      {!isAnalyzing && communicationPatterns.length > 0 && (
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center gap-4">
            <Filter className="w-4 h-4 text-gray-500" />
            <span className="text-sm font-medium text-gray-700">Filter by type:</span>
            <div className="flex gap-2">
              {['all', 'frequency', 'timing', 'content', 'network', 'anomaly'].map((type) => (
                <button
                  key={type}
                  onClick={() => setFilterType(type as any)}
                  className={`px-3 py-1 text-xs font-medium rounded-full transition-colors ${
                    filterType === type
                      ? 'bg-red-100 text-red-700'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {type.charAt(0).toUpperCase() + type.slice(1)}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Pattern Results */}
      {!isAnalyzing && filteredPatterns.length > 0 && (
        <div className="p-6">
          <div className="mb-4">
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Detected Communication Patterns ({filteredPatterns.length})
            </h3>
            <p className="text-sm text-gray-600">
              Analysis identified {communicationPatterns.length} suspicious communication patterns
              {filterType !== 'all' && ` (${filteredPatterns.length} matching current filter)`}
            </p>
          </div>

          <div className="grid gap-4">
            {filteredPatterns.map((pattern) => {
              const Icon = getPatternIcon(pattern.type);
              return (
                <div
                  key={pattern.id}
                  className={`border rounded-lg p-4 cursor-pointer transition-all hover:shadow-md ${
                    selectedPattern?.id === pattern.id ? 'ring-2 ring-red-500' : ''
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
                          <span>Participants: {pattern.participants.length}</span>
                          <span>Evidence: {pattern.evidenceIds.length} items</span>
                          {pattern.metadata.communicationChannels && (
                            <span>Channels: {pattern.metadata.communicationChannels.length}</span>
                          )}
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
                className="p-2 rounded-full hover:bg-slate-100 text-gray-400 hover:text-gray-600 transition-colors"
                aria-label="Close"
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
                <h4 className="text-sm font-medium text-gray-700 mb-1">Participants</h4>
                <div className="flex flex-wrap gap-2">
                  {selectedPattern.participants.map((participant, index) => (
                    <span key={index} className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded">
                      {participant}
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

              {selectedPattern.metadata.communicationChannels && selectedPattern.metadata.communicationChannels.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-1">Communication Channels</h4>
                  <div className="flex flex-wrap gap-2">
                    {selectedPattern.metadata.communicationChannels.map((channel, index) => {
                      const ChannelIcon = getCommunicationIcon(channel.toLowerCase());
                      return (
                        <span key={index} className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded flex items-center gap-1">
                          <ChannelIcon className="w-3 h-3" />
                          {channel}
                        </span>
                      );
                    })}
                  </div>
                </div>
              )}

              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-2">Investigation Recommendations</h4>
                <ul className="space-y-1">
                  {selectedPattern.recommendations.map((recommendation, index) => (
                    <li key={index} className="text-sm text-gray-600 flex items-start">
                      <span className="w-1.5 h-1.5 rounded-full bg-red-600 mt-2 mr-2 flex-shrink-0"></span>
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
              <button className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700 transition-colors">
                Add to Investigation
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Empty State */}
      {!isAnalyzing && communicationPatterns.length === 0 && (
        <div className="p-12 text-center">
          <Activity className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-sm font-medium text-gray-900 mb-2">
            No communication patterns detected yet
          </h3>
          <p className="text-sm text-gray-600 mb-4">
            Start communication analysis to identify suspicious patterns in timing, frequency, content, and network behavior.
          </p>
          <button
            onClick={analyzeCommunications}
            className="px-4 py-2 bg-red-600 text-white text-sm rounded-md hover:bg-red-700 transition-colors"
          >
            Start Communication Analysis
          </button>
        </div>
      )}
    </div>
  );
};