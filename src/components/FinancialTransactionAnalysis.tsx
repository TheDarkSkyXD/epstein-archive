import React, { useState, useEffect } from 'react';
import { Investigation, EvidenceItem } from '../types/investigation';
import { DollarSign, TrendingUp, TrendingDown, Calendar, ArrowRight, Search, Filter, Download, AlertTriangle, Building, CreditCard, X, MapPin, Users } from 'lucide-react';

interface FinancialTransactionAnalysisProps {
  investigation: Investigation;
  evidence: EvidenceItem[];
  onTransactionPatternDetected?: (patterns: TransactionPattern[]) => void;
}

export interface TransactionPattern {
  id: string;
  type: 'flow' | 'timing' | 'amount' | 'geographic' | 'entity' | 'anomaly';
  title: string;
  description: string;
  confidence: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
  entities: string[];
  evidenceIds: string[];
  metadata: {
    totalAmount?: number;
    transactionCount?: number;
    timeRange?: { start: string; end: string };
    locations?: string[];
    averageAmount?: number;
    largestTransaction?: number;
    frequency?: number;
    anomalyScore?: number;
    flowDirection?: 'inflow' | 'outflow' | 'circular';
  };
  recommendations: string[];
}

interface FinancialTransaction {
  id: string;
  date: string;
  amount: number;
  type: 'transfer' | 'payment' | 'investment' | 'purchase' | 'sale';
  sender: string;
  recipient: string;
  location: string;
  description?: string;
  metadata: {
    currency?: string;
    method?: string;
    urgency?: 'low' | 'medium' | 'high';
    suspicious?: boolean;
  };
}

export const FinancialTransactionAnalysis: React.FC<FinancialTransactionAnalysisProps> = ({
  investigation,
  evidence,
  onTransactionPatternDetected
}) => {
  const [transactionPatterns, setTransactionPatterns] = useState<TransactionPattern[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [selectedPattern, setSelectedPattern] = useState<TransactionPattern | null>(null);
  const [analysisProgress, setAnalysisProgress] = useState(0);
  const [filterType, setFilterType] = useState<'all' | 'flow' | 'timing' | 'amount' | 'geographic' | 'entity' | 'anomaly'>('all');
  const [sortBy, setSortBy] = useState<'date' | 'amount' | 'confidence' | 'severity'>('confidence');

  const analyzeTransactions = async () => {
    setIsAnalyzing(true);
    setAnalysisProgress(0);

    // Simulate progressive analysis
    const progressSteps = [
      { progress: 12, message: 'Parsing financial documents...' },
      { progress: 25, message: 'Analyzing transaction flows...' },
      { progress: 38, message: 'Detecting timing patterns...' },
      { progress: 51, message: 'Mapping geographic distribution...' },
      { progress: 64, message: 'Identifying entity relationships...' },
      { progress: 77, message: 'Calculating anomaly scores...' },
      { progress: 90, message: 'Cross-referencing with known patterns...' },
      { progress: 100, message: 'Transaction analysis complete!' }
    ];

    for (const step of progressSteps) {
      await new Promise(resolve => setTimeout(resolve, 600));
      setAnalysisProgress(step.progress);
    }

    // Generate mock financial patterns based on Epstein investigation
    const mockPatterns: TransactionPattern[] = [
      {
        id: 'finance-001',
        type: 'flow',
        title: 'Unusual Circular Money Flows',
        description: 'Complex circular transaction patterns where funds move through multiple entities before returning to origin, suggesting money laundering.',
        confidence: 94,
        severity: 'critical',
        entities: ['Jeffrey Epstein', 'Shell Company A', 'Offshore Account', 'Real Estate LLC'],
        evidenceIds: ['evidence-2'],
        metadata: {
          totalAmount: 15000000,
          transactionCount: 47,
          timeRange: { start: '2005-01-01', end: '2008-12-31' },
          locations: ['US Virgin Islands', 'Delaware', 'New York'],
          averageAmount: 319149,
          largestTransaction: 2500000,
          flowDirection: 'circular',
          anomalyScore: 9.2
        },
        recommendations: [
          'Subpoena complete transaction records for all identified entities',
          'Investigate beneficial ownership of shell companies',
          'Coordinate with international financial intelligence units'
        ]
      },
      {
        id: 'finance-002',
        type: 'timing',
        title: 'Investigation-Linked Transactions',
        description: 'Large financial transfers occurring immediately before or after key investigation milestones, suggesting influence attempts.',
        confidence: 89,
        severity: 'high',
        entities: ['Jeffrey Epstein', 'Legal Defense Fund', 'Political Donations'],
        evidenceIds: ['evidence-2'],
        metadata: {
          totalAmount: 8500000,
          transactionCount: 23,
          timeRange: { start: '2006-07-01', end: '2007-04-30' },
          locations: ['Florida', 'New York', 'Washington DC'],
          averageAmount: 369565,
          largestTransaction: 2000000,
          frequency: 23,
          anomalyScore: 8.1
        },
        recommendations: [
          'Cross-reference transaction dates with investigation timeline',
          'Analyze recipients of political donations',
          'Trace ultimate beneficiaries of legal payments'
        ]
      },
      {
        id: 'finance-003',
        type: 'amount',
        title: 'Structured Transactions Below Reporting Threshold',
        description: 'Multiple transactions just below $10,000 reporting threshold, consistent with structuring to avoid detection.',
        confidence: 91,
        severity: 'high',
        entities: ['Jeffrey Epstein', 'Multiple Cash Recipients'],
        evidenceIds: ['evidence-2'],
        metadata: {
          totalAmount: 485000,
          transactionCount: 52,
          timeRange: { start: '2009-01-01', end: '2009-12-31' },
          locations: ['Palm Beach', 'New York', 'St. Thomas'],
          averageAmount: 9327,
          largestTransaction: 9950,
          frequency: 52,
          anomalyScore: 8.6
        },
        recommendations: [
          'Review all transactions in $9,000-$10,000 range',
          'Interview bank personnel about suspicious activity reports',
          'Analyze cash withdrawal patterns'
        ]
      },
      {
        id: 'finance-004',
        type: 'geographic',
        title: 'High-Risk Jurisdiction Activity',
        description: 'Concentrated financial activity in jurisdictions with weak financial oversight and strong banking secrecy laws.',
        confidence: 86,
        severity: 'high',
        entities: ['Jeffrey Epstein', 'Offshore Banks', 'Trust Companies'],
        evidenceIds: ['evidence-2'],
        metadata: {
          totalAmount: 32000000,
          transactionCount: 78,
          timeRange: { start: '2000-01-01', end: '2019-12-31' },
          locations: ['British Virgin Islands', 'Cayman Islands', 'Switzerland', 'Luxembourg'],
          averageAmount: 410256,
          largestTransaction: 8500000,
          flowDirection: 'outflow',
          anomalyScore: 7.9
        },
        recommendations: [
          'Request mutual legal assistance from relevant jurisdictions',
          'Analyze beneficial ownership disclosure requirements',
          'Map complete offshore corporate structure'
        ]
      },
      {
        id: 'finance-005',
        type: 'entity',
        title: 'Rapid Entity Creation and Dissolution',
        description: 'Pattern of creating and dissolving corporate entities in rapid succession, potentially to obscure transaction trails.',
        confidence: 83,
        severity: 'medium',
        entities: ['Jeffrey Epstein', 'Multiple Shell Companies'],
        evidenceIds: ['evidence-2'],
        metadata: {
          transactionCount: 34,
          timeRange: { start: '2010-01-01', end: '2015-12-31' },
          locations: ['Delaware', 'Nevada', 'Wyoming'],
          averageAmount: 127500,
          largestTransaction: 750000,
          frequency: 34,
          anomalyScore: 7.2
        },
        recommendations: [
          'Review corporate formation and dissolution timeline',
          'Analyze transaction patterns for each entity',
          'Investigate registered agents and legal representatives'
        ]
      }
    ];

    setTransactionPatterns(mockPatterns);
    setIsAnalyzing(false);
    
    if (onTransactionPatternDetected) {
      onTransactionPatternDetected(mockPatterns);
    }
  };

  const getPatternIcon = (type: TransactionPattern['type']) => {
    const icons = {
      flow: ArrowRight,
      timing: Calendar,
      amount: DollarSign,
      geographic: MapPin,
      entity: Users,
      anomaly: AlertTriangle
    };
    return icons[type];
  };

  const getFlowIcon = (direction: string) => {
    if (direction === 'inflow') return TrendingUp;
    if (direction === 'outflow') return TrendingDown;
    return ArrowRight;
  };

  const getSeverityColor = (severity: TransactionPattern['severity']) => {
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

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  const filteredPatterns = filterType === 'all' 
    ? transactionPatterns 
    : transactionPatterns.filter(pattern => pattern.type === filterType);

  const sortedPatterns = [...filteredPatterns].sort((a, b) => {
    switch (sortBy) {
      case 'confidence':
        return b.confidence - a.confidence;
      case 'severity': {
        const severityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
        return severityOrder[b.severity] - severityOrder[a.severity];
      }
      case 'amount':
        return (b.metadata.totalAmount || 0) - (a.metadata.totalAmount || 0);
      default:
        return 0;
    }
  });

  return (
    <div className="bg-white rounded-lg shadow-lg">
      {/* Header */}
      <div className="border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">
              Financial Transaction Analysis
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              Analyze financial flows, timing patterns, and transaction anomalies
            </p>
          </div>
          <button
            onClick={analyzeTransactions}
            disabled={isAnalyzing}
            className="flex items-center px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <DollarSign className="w-4 h-4 mr-2" />
            {isAnalyzing ? 'Analyzing...' : 'Start Financial Analysis'}
          </button>
        </div>
      </div>

      {/* Analysis Progress */}
      {isAnalyzing && (
        <div className="px-6 py-4 bg-green-50 border-b border-green-200">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-green-900">
              Analyzing financial transaction patterns...
            </span>
            <span className="text-sm text-green-700">{analysisProgress}%</span>
          </div>
          <div className="w-full bg-green-200 rounded-full h-2">
            <div
              className="bg-green-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${analysisProgress}%` }}
            />
          </div>
        </div>
      )}

      {/* Filters and Sorting */}
      {!isAnalyzing && transactionPatterns.length > 0 && (
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Filter className="w-4 h-4 text-gray-500" />
              <span className="text-sm font-medium text-gray-700">Filter by type:</span>
              <div className="flex gap-2">
                {['all', 'flow', 'timing', 'amount', 'geographic', 'entity', 'anomaly'].map((type) => (
                  <button
                    key={type}
                    onClick={() => setFilterType(type as any)}
                    className={`px-3 py-1 text-xs font-medium rounded-full transition-colors ${
                      filterType === type
                        ? 'bg-green-100 text-green-700'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {type.charAt(0).toUpperCase() + type.slice(1)}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-gray-700">Sort by:</span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="px-3 py-1 text-xs border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-green-500"
              >
                <option value="confidence">Confidence</option>
                <option value="severity">Severity</option>
                <option value="amount">Total Amount</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {/* Summary Statistics */}
      {!isAnalyzing && transactionPatterns.length > 0 && (
        <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900">
                {formatCurrency(transactionPatterns.reduce((sum, pattern) => sum + (pattern.metadata.totalAmount || 0), 0))}
              </div>
              <div className="text-sm text-gray-600">Total Analyzed</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900">
                {transactionPatterns.reduce((sum, pattern) => sum + (pattern.metadata.transactionCount || 0), 0)}
              </div>
              <div className="text-sm text-gray-600">Transactions</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900">
                {transactionPatterns.filter(p => p.severity === 'critical').length}
              </div>
              <div className="text-sm text-gray-600">Critical Patterns</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900">
                {Math.round(transactionPatterns.reduce((sum, pattern) => sum + pattern.confidence, 0) / transactionPatterns.length)}%
              </div>
              <div className="text-sm text-gray-600">Avg Confidence</div>
            </div>
          </div>
        </div>
      )}

      {/* Pattern Results */}
      {!isAnalyzing && sortedPatterns.length > 0 && (
        <div className="p-6">
          <div className="mb-4">
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Detected Financial Patterns ({sortedPatterns.length})
            </h3>
            <p className="text-sm text-gray-600">
              Analysis identified {transactionPatterns.length} suspicious financial patterns
              {filterType !== 'all' && ` (${sortedPatterns.length} matching current filter)`}
            </p>
          </div>

          <div className="grid gap-4">
            {sortedPatterns.map((pattern) => {
              const Icon = getPatternIcon(pattern.type);
              const FlowIcon = pattern.metadata.flowDirection ? getFlowIcon(pattern.metadata.flowDirection) : null;
              
              return (
                <div
                  key={pattern.id}
                  className={`border rounded-lg p-4 cursor-pointer transition-all hover:shadow-md ${
                    selectedPattern?.id === pattern.id ? 'ring-2 ring-green-500' : ''
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
                            {pattern.metadata.totalAmount && (
                              <span className="text-sm font-medium text-gray-900">
                                {formatCurrency(pattern.metadata.totalAmount)}
                              </span>
                            )}
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
                          {pattern.metadata.transactionCount && (
                            <span>Transactions: {pattern.metadata.transactionCount}</span>
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
                <h4 className="text-sm font-medium text-gray-700 mb-1">Involved Entities</h4>
                <div className="flex flex-wrap gap-2">
                  {selectedPattern.entities.map((entity, index) => (
                    <span key={index} className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded">
                      {entity}
                    </span>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {selectedPattern.metadata.totalAmount && (
                  <div>
                    <h4 className="text-sm font-medium text-gray-700 mb-1">Total Amount</h4>
                    <p className="text-sm text-gray-900 font-medium">
                      {formatCurrency(selectedPattern.metadata.totalAmount)}
                    </p>
                  </div>
                )}
                {selectedPattern.metadata.transactionCount && (
                  <div>
                    <h4 className="text-sm font-medium text-gray-700 mb-1">Transaction Count</h4>
                    <p className="text-sm text-gray-900 font-medium">
                      {selectedPattern.metadata.transactionCount}
                    </p>
                  </div>
                )}
                {selectedPattern.metadata.averageAmount && (
                  <div>
                    <h4 className="text-sm font-medium text-gray-700 mb-1">Average Amount</h4>
                    <p className="text-sm text-gray-900 font-medium">
                      {formatCurrency(selectedPattern.metadata.averageAmount)}
                    </p>
                  </div>
                )}
                {selectedPattern.metadata.largestTransaction && (
                  <div>
                    <h4 className="text-sm font-medium text-gray-700 mb-1">Largest Transaction</h4>
                    <p className="text-sm text-gray-900 font-medium">
                      {formatCurrency(selectedPattern.metadata.largestTransaction)}
                    </p>
                  </div>
                )}
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
                      <span className="w-1.5 h-1.5 rounded-full bg-green-600 mt-2 mr-2 flex-shrink-0"></span>
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
              <button className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700 transition-colors">
                Add to Investigation
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Empty State */}
      {!isAnalyzing && transactionPatterns.length === 0 && (
        <div className="p-12 text-center">
          <DollarSign className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-sm font-medium text-gray-900 mb-2">
            No financial patterns detected yet
          </h3>
          <p className="text-sm text-gray-600 mb-4">
            Start financial transaction analysis to identify suspicious patterns in money flows, timing, amounts, and geographic distribution.
          </p>
          <button
            onClick={analyzeTransactions}
            className="px-4 py-2 bg-green-600 text-white text-sm rounded-md hover:bg-green-700 transition-colors"
          >
            Start Financial Analysis
          </button>
        </div>
      )}
    </div>
  );
};