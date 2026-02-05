import React, { useState } from 'react';
import { Investigation, EvidenceItem } from '../../types/investigation';
import { apiClient } from '../../services/apiClient';
import {
  Activity,
  Clock,
  Users,
  MessageSquare,
  TrendingUp,
  AlertTriangle,
  Filter,
  Mail,
  Phone,
  X,
} from 'lucide-react';

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

export const CommunicationAnalysis: React.FC<CommunicationAnalysisProps> = ({
  investigation: _investigation,
  evidence,
  onCommunicationPatternDetected,
}) => {
  const [communicationPatterns, setCommunicationPatterns] = useState<CommunicationPattern[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [selectedPattern, setSelectedPattern] = useState<CommunicationPattern | null>(null);
  const [analysisProgress, setAnalysisProgress] = useState(0);
  const [filterType, setFilterType] = useState<
    'all' | 'frequency' | 'timing' | 'content' | 'network' | 'anomaly'
  >('all');

  const analyzeCommunications = async () => {
    setIsAnalyzing(true);
    setAnalysisProgress(5);

    // 1. Collect unique entity IDs from investigation evidence
    const entityIds = Array.from(
      new Set(
        evidence
          .filter((item) =>
            ['entity', 'person', 'organization'].includes(
              (item.type || '').toString().toLowerCase(),
            ),
          )
          .map((item) => String(item.sourceId || item.id))
          .filter(Boolean),
      ),
    );

    if (entityIds.length === 0) {
      setCommunicationPatterns([]);
      setAnalysisProgress(100);
      setIsAnalyzing(false);
      if (onCommunicationPatternDetected) onCommunicationPatternDetected([]);
      return;
    }

    // 2. Fetch communications per entity using the real API
    const allEvents: Array<{
      entityId: string;
      documentId: string;
      threadId: string;
      subject: string;
      date: string | null;
      from: string;
      to: string[];
      cc: string[];
      topic: string;
    }> = [];

    for (let i = 0; i < entityIds.length; i++) {
      const entityId = entityIds[i];
      try {
        const res = await apiClient.getEntityCommunications(entityId, {
          limit: 500,
        });
        const events = (res.data || []).map((e: any) => ({
          entityId,
          documentId: String(e.documentId || e.document_id || ''),
          threadId: String(e.threadId || e.thread_id || ''),
          subject: String(e.subject || ''),
          date: e.date || null,
          from: String(e.from || ''),
          to: Array.isArray(e.to) ? e.to : [],
          cc: Array.isArray(e.cc) ? e.cc : [],
          topic: String(e.topic || 'misc'),
        }));
        allEvents.push(...events);
      } catch (err) {
        // If one entity fails, continue with others
        // eslint-disable-next-line no-console
        console.warn('Failed to load communications for entity', entityId, err);
      }
      setAnalysisProgress(5 + Math.round(((i + 1) / entityIds.length) * 45));
    }

    if (allEvents.length === 0) {
      setCommunicationPatterns([]);
      setAnalysisProgress(100);
      setIsAnalyzing(false);
      if (onCommunicationPatternDetected) onCommunicationPatternDetected([]);
      return;
    }

    // 3. Aggregate patterns from real events
    const byTopic = new Map<string, number>();
    const byPair = new Map<string, number>();
    const byHour: number[] = Array.from({ length: 24 }, () => 0);

    for (const ev of allEvents) {
      const topic = ev.topic || 'misc';
      byTopic.set(topic, (byTopic.get(topic) || 0) + 1);

      const participants = Array.from(
        new Set([ev.from, ...ev.to].filter((v) => typeof v === 'string' && v.trim().length > 0)),
      );
      if (participants.length >= 2) {
        const [a, b] = participants.slice(0, 2).sort();
        const key = `${a} ↔ ${b}`;
        byPair.set(key, (byPair.get(key) || 0) + 1);
      }

      if (ev.date) {
        const d = new Date(ev.date);
        if (!isNaN(d.getTime())) {
          const h = d.getHours();
          if (h >= 0 && h < 24) {
            byHour[h] += 1;
          }
        }
      }
    }

    setAnalysisProgress(70);

    const totalMessages = allEvents.length;

    // Top topic frequency pattern
    const sortedTopics = Array.from(byTopic.entries()).sort((a, b) => b[1] - a[1]);
    const topTopic = sortedTopics[0];

    // Late-night spike: 0-5h
    const lateNightCount = byHour.slice(0, 6).reduce((a, b) => a + b, 0);

    // Top communication pair
    const sortedPairs = Array.from(byPair.entries()).sort((a, b) => b[1] - a[1]);
    const topPair = sortedPairs[0];

    const patterns: CommunicationPattern[] = [];

    if (topTopic) {
      patterns.push({
        id: 'frequency-topic',
        type: 'frequency',
        title: `Dominant Topic: ${topTopic[0].replace('_', ' ')}`,
        description: `Most common email topic in this investigation is “${topTopic[0].replace(
          '_',
          ' ',
        )}” with ${topTopic[1]} messages.`,
        confidence: Math.min(100, Math.round((topTopic[1] / totalMessages) * 100) || 50),
        severity:
          topTopic[1] / totalMessages > 0.4
            ? 'high'
            : topTopic[1] / totalMessages > 0.2
              ? 'medium'
              : 'low',
        participants: [],
        evidenceIds: allEvents
          .filter((e) => e.topic === topTopic[0])
          .map((e) => e.documentId)
          .slice(0, 50),
        metadata: {
          frequency: topTopic[1],
          messageCount: totalMessages,
          communicationChannels: ['email'],
        },
        recommendations: [
          'Review all high-volume threads for this topic.',
          'Cross-reference with investigation timeline and key entities.',
        ],
      });
    }

    if (lateNightCount > 0) {
      patterns.push({
        id: 'timing-late-night',
        type: 'timing',
        title: 'Late-night communication clusters',
        description: `Detected ${lateNightCount} messages sent between 00:00 and 05:59, which may indicate covert or off-hours coordination.`,
        confidence: Math.min(100, 60 + lateNightCount),
        severity: lateNightCount > 50 ? 'high' : lateNightCount > 10 ? 'medium' : 'low',
        participants: [],
        evidenceIds: allEvents
          .filter((e) => {
            if (!e.date) return false;
            const d = new Date(e.date);
            return !isNaN(d.getTime()) && d.getHours() < 6;
          })
          .map((e) => e.documentId)
          .slice(0, 50),
        metadata: {
          timeRange: {
            start: '',
            end: '',
          },
          communicationChannels: ['email'],
        },
        recommendations: ['Inspect these threads for sensitive coordination or escalation.'],
      });
    }

    if (topPair) {
      patterns.push({
        id: 'network-top-pair',
        type: 'network',
        title: `Central communication pair: ${topPair[0]}`,
        description: `The pair ${topPair[0]} appears in ${topPair[1]} messages, suggesting a central communication link within this investigation.`,
        confidence: Math.min(100, 70 + topPair[1]),
        severity: topPair[1] > 40 ? 'critical' : topPair[1] > 15 ? 'high' : 'medium',
        participants: topPair[0].split(' ↔ ').filter(Boolean),
        evidenceIds: [],
        metadata: {
          communicationChannels: ['email'],
          messageCount: topPair[1],
        },
        recommendations: [
          'Map all threads involving this pair of participants.',
          'Cross-reference with relationship graph and entity risk levels.',
        ],
      });
    }

    setCommunicationPatterns(patterns);
    setAnalysisProgress(100);
    setIsAnalyzing(false);

    if (onCommunicationPatternDetected) {
      onCommunicationPatternDetected(patterns);
    }
  };

  const getPatternIcon = (type: CommunicationPattern['type']) => {
    const icons = {
      frequency: TrendingUp,
      timing: Clock,
      content: MessageSquare,
      network: Users,
      anomaly: AlertTriangle,
    };
    return icons[type];
  };

  const getCommunicationIcon = (channel: string) => {
    const icons = {
      email: Mail,
      phone: Phone,
      text: MessageSquare,
      meeting: Users,
    };
    return icons[channel as keyof typeof icons] || MessageSquare;
  };

  const getSeverityColor = (severity: CommunicationPattern['severity']) => {
    const colors = {
      low: 'bg-green-100 text-green-800 border-green-200',
      medium: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      high: 'bg-orange-100 text-orange-800 border-orange-200',
      critical: 'bg-red-100 text-red-800 border-red-200',
    };
    return colors[severity];
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 90) return 'text-green-600';
    if (confidence >= 70) return 'text-yellow-600';
    return 'text-red-600';
  };

  const filteredPatterns =
    filterType === 'all'
      ? communicationPatterns
      : communicationPatterns.filter((pattern) => pattern.type === filterType);

  return (
    <div className="bg-white rounded-lg shadow-lg">
      {/* Header */}
      <div className="border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Communication Forensics</h2>
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
                          <h4 className="text-sm font-medium text-gray-900">{pattern.title}</h4>
                          <div className="flex items-center gap-2">
                            <span
                              className={`text-sm font-medium ${getConfidenceColor(pattern.confidence)}`}
                            >
                              {pattern.confidence}% confidence
                            </span>
                            <span
                              className={`px-2 py-1 text-xs font-medium rounded-full ${getSeverityColor(pattern.severity)}`}
                            >
                              {pattern.severity.toUpperCase()}
                            </span>
                          </div>
                        </div>
                        <p className="text-sm text-gray-600 mb-2">{pattern.description}</p>
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
                <h3 className="text-lg font-medium text-gray-900">{selectedPattern.title}</h3>
                <div className="flex items-center gap-2 mt-1">
                  <span
                    className={`px-2 py-1 text-xs font-medium rounded-full ${getSeverityColor(selectedPattern.severity)}`}
                  >
                    {selectedPattern.severity.toUpperCase()}
                  </span>
                  <span
                    className={`text-sm font-medium ${getConfidenceColor(selectedPattern.confidence)}`}
                  >
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
                    <span
                      key={index}
                      className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded"
                    >
                      {participant}
                    </span>
                  ))}
                </div>
              </div>

              {selectedPattern.metadata.timeRange && (
                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-1">Time Range</h4>
                  <p className="text-sm text-gray-600">
                    {selectedPattern.metadata.timeRange.start} to{' '}
                    {selectedPattern.metadata.timeRange.end}
                  </p>
                </div>
              )}

              {selectedPattern.metadata.communicationChannels &&
                selectedPattern.metadata.communicationChannels.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium text-gray-700 mb-1">
                      Communication Channels
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {selectedPattern.metadata.communicationChannels.map((channel, index) => {
                        const ChannelIcon = getCommunicationIcon(channel.toLowerCase());
                        return (
                          <span
                            key={index}
                            className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded flex items-center gap-1"
                          >
                            <ChannelIcon className="w-3 h-3" />
                            {channel}
                          </span>
                        );
                      })}
                    </div>
                  </div>
                )}

              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-2">
                  Investigation Recommendations
                </h4>
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
            Start communication analysis to identify suspicious patterns in timing, frequency,
            content, and network behavior.
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
