import React, { useState, useEffect } from 'react';
import { TrendingUp, TrendingDown, DollarSign, Clock, User, Building, AlertTriangle, Filter, Download, Search, Calendar, MapPin, Shield, ShieldAlert, ShieldCheck } from 'lucide-react';
import { AddToInvestigationButton } from './AddToInvestigationButton';

interface Transaction {
  id: string;
  fromEntity: string;
  toEntity: string;
  amount: number;
  currency: string;
  date: string;
  type: 'payment' | 'transfer' | 'investment' | 'loan' | 'shell_company' | 'offshore';
  method: 'wire' | 'cash' | 'check' | 'crypto' | 'shell';
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  suspiciousIndicators: string[];
  sourceDocuments: string[];
}

interface TransactionFlow {
  entity: string;
  inflow: number;
  outflow: number;
  netFlow: number;
  transactionCount: number;
  riskScore: number;
  connections: string[];
}

interface FinancialPattern {
  type: 'layering' | 'structuring' | 'integration' | 'shell_network' | 'round_trip';
  confidence: number;
  transactions: string[];
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

export default function FinancialTransactionMapper() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [flowAnalysis, setFlowAnalysis] = useState<TransactionFlow[]>([]);
  const [detectedPatterns, setDetectedPatterns] = useState<FinancialPattern[]>([]);
  const [viewMode, setViewMode] = useState<'flow' | 'network' | 'timeline' | 'patterns'>('flow');
  const [filterRisk, setFilterRisk] = useState<string>('all');
  const [filterAmount, setFilterAmount] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [dateRange, setDateRange] = useState({ start: '', end: '' });

  // Mock Epstein financial data
  useEffect(() => {
    const mockTransactions: Transaction[] = [
      {
        id: 'tx-001',
        fromEntity: 'Jeffrey Epstein',
        toEntity: 'Ghislaine Maxwell',
        amount: 15000000,
        currency: 'USD',
        date: '2004-03-15',
        type: 'transfer',
        method: 'wire',
        riskLevel: 'critical',
        description: 'Large transfer to co-conspirator',
        suspiciousIndicators: ['Large amount', 'Co-conspirator', 'No clear business purpose'],
        sourceDocuments: ['wire-transfer-001.pdf', 'bank-statement-2004.pdf']
      },
      {
        id: 'tx-002',
        fromEntity: 'Epstein Virgin Islands Trust',
        toEntity: 'Southern Trust Company',
        amount: 8500000,
        currency: 'USD',
        date: '2006-08-22',
        type: 'investment',
        method: 'wire',
        riskLevel: 'high',
        description: 'Investment in shell company',
        suspiciousIndicators: ['Shell company', 'Offshore jurisdiction', 'Complex ownership'],
        sourceDocuments: ['trust-documents.pdf', 'company-registration.pdf']
      },
      {
        id: 'tx-003',
        fromEntity: 'Leslie Wexner',
        toEntity: 'Jeffrey Epstein',
        amount: 47000000,
        currency: 'USD',
        date: '2008-11-03',
        type: 'payment',
        method: 'wire',
        riskLevel: 'high',
        description: 'Property transaction - below market value',
        suspiciousIndicators: ['Below market value', 'High-profile individual', 'Questionable timing'],
        sourceDocuments: ['property-deed.pdf', 'appraisal-report.pdf']
      },
      {
        id: 'tx-004',
        fromEntity: 'Jeffrey Epstein',
        toEntity: 'Bank Leumi (Israel)',
        amount: 25000000,
        currency: 'USD',
        date: '2010-06-18',
        type: 'transfer',
        method: 'wire',
        riskLevel: 'critical',
        description: 'Offshore account funding',
        suspiciousIndicators: ['Large amount', 'Offshore bank', 'Secrecy jurisdiction'],
        sourceDocuments: ['wire-instructions.pdf', 'account-opening.pdf']
      },
      {
        id: 'tx-005',
        fromEntity: 'Epstein Interests LLC',
        toEntity: 'Ghislaine Maxwell',
        amount: 2500000,
        currency: 'USD',
        date: '2012-09-07',
        type: 'payment',
        method: 'check',
        riskLevel: 'medium',
        description: 'Consulting payment',
        suspiciousIndicators: ['Vague description', 'Related party', 'Round number'],
        sourceDocuments: ['invoice-2012-09.pdf', 'check-image.pdf']
      },
      {
        id: 'tx-006',
        fromEntity: 'Jeffrey Epstein',
        toEntity: 'Jean-Luc Brunel',
        amount: 1000000,
        currency: 'USD',
        date: '2014-12-14',
        type: 'payment',
        method: 'wire',
        riskLevel: 'high',
        description: 'Modeling agency investment',
        suspiciousIndicators: ['Associated with trafficking', 'Foreign national', 'Cash-intensive business'],
        sourceDocuments: ['modeling-contract.pdf', 'wire-receipt.pdf']
      },
      {
        id: 'tx-007',
        fromEntity: 'Cypress Trust Company',
        toEntity: 'Jeffrey Epstein',
        amount: 12000000,
        currency: 'USD',
        date: '2015-04-22',
        type: 'loan',
        method: 'wire',
        riskLevel: 'high',
        description: 'Loan repayment - suspicious circular flow',
        suspiciousIndicators: ['Circular transaction', 'Shell company', 'No interest terms'],
        sourceDocuments: ['loan-agreement.pdf', 'repayment-schedule.pdf']
      },
      {
        id: 'tx-008',
        fromEntity: 'Jeffrey Epstein',
        toEntity: 'Sarah Kellen',
        amount: 750000,
        currency: 'USD',
        date: '2016-07-30',
        type: 'payment',
        method: 'wire',
        riskLevel: 'medium',
        description: 'Assistant salary payment',
        suspiciousIndicators: ['High salary', 'Personal assistant', 'Cash payments'],
        sourceDocuments: ['employment-contract.pdf', 'payroll-records.pdf']
      },
      {
        id: 'tx-009',
        fromEntity: 'Epstein Aviation LLC',
        toEntity: 'Air Traffic Control Services',
        amount: 150000,
        currency: 'USD',
        date: '2017-03-12',
        type: 'payment',
        method: 'check',
        riskLevel: 'low',
        description: 'Aviation services payment',
        suspiciousIndicators: ['Legitimate business expense'],
        sourceDocuments: ['aviation-invoice.pdf', 'flight-logs.pdf']
      },
      {
        id: 'tx-010',
        fromEntity: 'Jeffrey Epstein',
        toEntity: 'Prince Andrew',
        amount: 15000,
        currency: 'USD',
        date: '2019-01-05',
        type: 'payment',
        method: 'check',
        riskLevel: 'medium',
        description: 'Charity donation',
        suspiciousIndicators: ['High-profile individual', 'Reputation management', 'Small amount'],
        sourceDocuments: ['charity-receipt.pdf', 'thank-you-letter.pdf']
      }
    ];

    setTransactions(mockTransactions);
    analyzeTransactionFlows(mockTransactions);
    detectFinancialPatterns(mockTransactions);
  }, []);

  const analyzeTransactionFlows = (transactions: Transaction[]) => {
    const entityMap = new Map<string, TransactionFlow>();

    transactions.forEach(tx => {
      // From entity analysis
      if (!entityMap.has(tx.fromEntity)) {
        entityMap.set(tx.fromEntity, {
          entity: tx.fromEntity,
          inflow: 0,
          outflow: 0,
          netFlow: 0,
          transactionCount: 0,
          riskScore: 0,
          connections: []
        });
      }

      // To entity analysis
      if (!entityMap.has(tx.toEntity)) {
        entityMap.set(tx.toEntity, {
          entity: tx.toEntity,
          inflow: 0,
          outflow: 0,
          netFlow: 0,
          transactionCount: 0,
          riskScore: 0,
          connections: []
        });
      }

      const fromFlow = entityMap.get(tx.fromEntity)!;
      const toFlow = entityMap.get(tx.toEntity)!;

      fromFlow.outflow += tx.amount;
      fromFlow.netFlow -= tx.amount;
      fromFlow.transactionCount++;
      fromFlow.riskScore += getRiskScore(tx.riskLevel);
      if (!fromFlow.connections.includes(tx.toEntity)) {
        fromFlow.connections.push(tx.toEntity);
      }

      toFlow.inflow += tx.amount;
      toFlow.netFlow += tx.amount;
      toFlow.transactionCount++;
      toFlow.riskScore += getRiskScore(tx.riskLevel);
      if (!toFlow.connections.includes(tx.fromEntity)) {
        toFlow.connections.push(tx.fromEntity);
      }
    });

    setFlowAnalysis(Array.from(entityMap.values()));
  };

  const detectFinancialPatterns = (transactions: Transaction[]) => {
    const patterns: FinancialPattern[] = [];

    // Detect layering pattern (multiple transfers to obscure source)
    const layeringTxs = transactions.filter(tx => 
      tx.type === 'transfer' && 
      tx.riskLevel === 'critical' && 
      tx.amount > 5000000
    );

    if (layeringTxs.length >= 2) {
      patterns.push({
        type: 'layering',
        confidence: 85,
        transactions: layeringTxs.map(tx => tx.id),
        description: 'Multiple large transfers suggesting money laundering layering phase',
        severity: 'critical'
      });
    }

    // Detect shell network pattern
    const shellTxs = transactions.filter(tx => 
      tx.type === 'transfer' && 
      (tx.method === 'shell' || tx.toEntity.includes('Trust') || tx.toEntity.includes('LLC'))
    );

    if (shellTxs.length >= 2) {
      patterns.push({
        type: 'shell_network',
        confidence: 92,
        transactions: shellTxs.map(tx => tx.id),
        description: 'Network of shell companies used to obscure beneficial ownership',
        severity: 'high'
      });
    }

    // Detect round-trip pattern
    const epsteinTxs = transactions.filter(tx => 
      tx.fromEntity === 'Jeffrey Epstein' || tx.toEntity === 'Jeffrey Epstein'
    );

    const roundTripPattern = detectRoundTripPattern(epsteinTxs);
    if (roundTripPattern) {
      patterns.push(roundTripPattern);
    }

    setDetectedPatterns(patterns);
  };

  const detectRoundTripPattern = (transactions: Transaction[]): FinancialPattern | null => {
    // Simplified round-trip detection
    const epsteinOutflows = transactions.filter(tx => tx.fromEntity === 'Jeffrey Epstein');
    const epsteinInflows = transactions.filter(tx => tx.toEntity === 'Jeffrey Epstein');

    const suspiciousRoundTrip = epsteinOutflows.some(outTx => 
      epsteinInflows.some(inTx => {
        const outDate = new Date(outTx.date);
        const inDate = new Date(inTx.date);
        const daysDiff = Math.abs((inDate.getTime() - outDate.getTime()) / (1000 * 3600 * 24));
        
        return daysDiff < 365 && // Within a year
               Math.abs(inTx.amount - outTx.amount) < outTx.amount * 0.2; // Similar amounts
      })
    );

    if (suspiciousRoundTrip) {
      return {
        type: 'round_trip',
        confidence: 78,
        transactions: transactions.map(tx => tx.id),
        description: 'Suspicious round-trip transactions suggesting artificial fund movement',
        severity: 'high'
      };
    }

    return null;
  };

  const getRiskScore = (riskLevel: string): number => {
    switch (riskLevel) {
      case 'low': return 1;
      case 'medium': return 3;
      case 'high': return 7;
      case 'critical': return 10;
      default: return 0;
    }
  };

  const formatCurrency = (amount: number, currency: string = 'USD'): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  const filteredTransactions = transactions.filter(tx => {
    const matchesSearch = searchTerm === '' || 
      tx.fromEntity.toLowerCase().includes(searchTerm.toLowerCase()) ||
      tx.toEntity.toLowerCase().includes(searchTerm.toLowerCase()) ||
      tx.description.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesRisk = filterRisk === 'all' || tx.riskLevel === filterRisk;
    
    const matchesAmount = filterAmount === 'all' || 
      (filterAmount === 'small' && tx.amount < 100000) ||
      (filterAmount === 'medium' && tx.amount >= 100000 && tx.amount < 5000000) ||
      (filterAmount === 'large' && tx.amount >= 5000000);

    const matchesDate = (!dateRange.start || tx.date >= dateRange.start) &&
                        (!dateRange.end || tx.date <= dateRange.end);

    return matchesSearch && matchesRisk && matchesAmount && matchesDate;
  });

  const exportTransactionData = () => {
    const data = {
      transactions: filteredTransactions,
      flowAnalysis: flowAnalysis,
      detectedPatterns: detectedPatterns,
      exportDate: new Date().toISOString()
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `epstein-financial-analysis-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-red-400 mb-2">Financial Transaction Mapper</h1>
          <p className="text-gray-400">Advanced forensic analysis of financial flows and suspicious patterns</p>
        </div>

        {/* Controls - Stacked Layout */}
        <div className="bg-gray-800 rounded-lg p-6 mb-6">
          {/* Search Row */}
          <div className="mb-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search entities, descriptions, or transaction details..."
                className="w-full pl-10 pr-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-gray-100 focus:ring-2 focus:ring-red-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Filters Row - Stacked Layout */}
          <div className="flex flex-col gap-3 mb-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1">Risk Level</label>
                <select
                  value={filterRisk}
                  onChange={(e) => setFilterRisk(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-gray-100 focus:ring-2 focus:ring-red-500 text-sm"
                >
                  <option value="all">All Risk Levels</option>
                  <option value="low">Low Risk</option>
                  <option value="medium">Medium Risk</option>
                  <option value="high">High Risk</option>
                  <option value="critical">Critical Risk</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1">Amount Range</label>
                <select
                  value={filterAmount}
                  onChange={(e) => setFilterAmount(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-gray-100 focus:ring-2 focus:ring-red-500 text-sm"
                >
                  <option value="all">All Amounts</option>
                  <option value="small">Under $100K</option>
                  <option value="medium">$100K - $5M</option>
                  <option value="large">Over $5M</option>
                </select>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1">Start Date</label>
                <input
                  type="date"
                  value={dateRange.start}
                  onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-gray-100 focus:ring-2 focus:ring-red-500 text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1">End Date</label>
                <input
                  type="date"
                  value={dateRange.end}
                  onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-gray-100 focus:ring-2 focus:ring-red-500 text-sm"
                />
              </div>
            </div>
          </div>

          {/* Actions Row */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <div className="flex items-center gap-3">
              <select
                value={viewMode}
                onChange={(e) => setViewMode(e.target.value as any)}
                className="px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-gray-100 focus:ring-2 focus:ring-red-500 text-sm"
              >
                <option value="flow">Flow Analysis</option>
                <option value="network">Network View</option>
                <option value="timeline">Timeline</option>
                <option value="patterns">Detected Patterns</option>
              </select>
              
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-500">{filteredTransactions.length} transactions</span>
              </div>
            </div>
            
            <button
              onClick={exportTransactionData}
              className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 rounded-lg transition-colors text-sm"
            >
              <Download className="w-4 h-4" />
              Export Data
            </button>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-gray-800 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">Total Transactions</p>
                <p className="text-2xl font-bold text-blue-400">{filteredTransactions.length}</p>
              </div>
              <TrendingUp className="w-8 h-8 text-blue-400" />
            </div>
          </div>

          <div className="bg-gray-800 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">Total Value</p>
                <p className="text-2xl font-bold text-green-400">
                  {formatCurrency(filteredTransactions.reduce((sum, tx) => sum + tx.amount, 0))}
                </p>
              </div>
              <DollarSign className="w-8 h-8 text-green-400" />
            </div>
          </div>

          <div className="bg-gray-800 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">High Risk</p>
                <p className="text-2xl font-bold text-yellow-400">
                  {filteredTransactions.filter(tx => tx.riskLevel === 'high' || tx.riskLevel === 'critical').length}
                </p>
              </div>
              <AlertTriangle className="w-8 h-8 text-yellow-400" />
            </div>
          </div>

          <div className="bg-gray-800 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">Patterns Detected</p>
                <p className="text-2xl font-bold text-red-400">{detectedPatterns.length}</p>
              </div>
              <Filter className="w-8 h-8 text-red-400" />
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Transaction List */}
          <div className="lg:col-span-2">
            <div className="bg-gray-800 rounded-lg p-6">
              <h2 className="text-xl font-semibold text-gray-100 mb-4">Transactions</h2>
              <div className="space-y-4 max-h-96 overflow-y-auto">
                {filteredTransactions.map((transaction) => (
                  <div
                    key={transaction.id}
                    onClick={() => setSelectedTransaction(transaction)}
                    className={`p-4 rounded-lg cursor-pointer transition-colors ${
                      selectedTransaction?.id === transaction.id
                        ? 'bg-red-900 border border-red-500'
                        : 'bg-gray-700 hover:bg-gray-600'
                    }`}
                  >
                    <div className="flex flex-col gap-2">
                      <div className="flex justify-between items-start">
                        <div className="flex items-center gap-2">
                          <User className="w-4 h-4 text-gray-400" />
                          <span className="font-medium text-gray-100 break-words max-w-[150px]" title={transaction.fromEntity}>{transaction.fromEntity}</span>
                          <TrendingDown className="w-4 h-4 text-red-400" />
                          <User className="w-4 h-4 text-gray-400" />
                          <span className="font-medium text-gray-100 break-words max-w-[150px]" title={transaction.toEntity}>{transaction.toEntity}</span>
                        </div>
                        <div className="flex items-center gap-1" title={`Risk Level: ${transaction.riskLevel.toUpperCase()}`}>
                          {transaction.riskLevel === 'critical' && <ShieldAlert className="w-5 h-5 text-red-400" />}
                          {transaction.riskLevel === 'high' && <Shield className="w-5 h-5 text-yellow-400" />}
                          {transaction.riskLevel === 'medium' && <ShieldCheck className="w-5 h-5 text-blue-400" />}
                          {transaction.riskLevel === 'low' && <Shield className="w-5 h-5 text-green-400" />}
                          <div onClick={(e) => e.stopPropagation()}>
                            <AddToInvestigationButton 
                              item={{
                                id: transaction.id,
                                title: `Transaction: ${transaction.fromEntity} -> ${transaction.toEntity}`,
                                description: transaction.description,
                                type: 'evidence',
                                sourceId: transaction.id,
                                metadata: {
                                  amount: transaction.amount,
                                  date: transaction.date,
                                  type: transaction.type
                                }
                              }}
                              investigations={[]} // This needs to be populated from context or props
                              onAddToInvestigation={(invId, item, relevance) => {
                                console.log('Add to investigation', invId, item, relevance);
                                const event = new CustomEvent('add-to-investigation', { 
                                  detail: { investigationId: invId, item, relevance } 
                                });
                                window.dispatchEvent(event);
                              }}
                              variant="icon"
                              className="hover:bg-slate-600 p-1"
                            />
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex justify-between items-center text-sm text-gray-400">
                        <span className="font-semibold">{formatCurrency(transaction.amount, transaction.currency)}</span>
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {transaction.date}
                        </span>
                        <span className="capitalize">{transaction.type.replace('_', ' ')}</span>
                      </div>
                      
                      <p className="text-sm text-gray-300 whitespace-normal break-words">{transaction.description}</p>
                    </div>
                    
                    {transaction.suspiciousIndicators.length > 0 && (
                      <div className="mt-2">
                        <div className="flex flex-wrap gap-2">
                          {transaction.suspiciousIndicators.map((indicator, index) => (
                            <span key={index} className="relative overflow-hidden px-2 py-1 bg-red-900/40 text-red-200 rounded text-xs border border-red-800/50 group">
                              <span className="relative z-10 whitespace-normal">{indicator}</span>
                              <AlertTriangle className="absolute -right-1 -bottom-1 w-6 h-6 text-red-500/10 rotate-12" />
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Side Panel */}
          <div className="space-y-6">
            {/* Entity Flow Analysis */}
            <div className="bg-gray-800 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-gray-100 mb-4">Entity Flow Analysis</h3>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {flowAnalysis.slice(0, 5).map((flow, index) => (
                  <div key={index} className="p-2 bg-gray-700 rounded">
                    <div className="flex justify-between items-center mb-1">
                      <span className="font-medium text-gray-100 text-xs truncate max-w-[120px]" title={flow.entity}>{flow.entity}</span>
                      <span className={`text-xs px-1 py-0.5 rounded ${
                        flow.riskScore > 20 ? 'bg-red-900 text-red-200' :
                        flow.riskScore > 10 ? 'bg-yellow-900 text-yellow-200' :
                        'bg-green-900 text-green-200'
                      }`}>
                        {flow.riskScore}
                      </span>
                    </div>
                    <div className="grid grid-cols-3 gap-1 text-xs text-gray-400">
                      <div className="truncate" title={`In: ${formatCurrency(flow.inflow)}`}>In: {formatCurrency(flow.inflow)}</div>
                      <div className="truncate" title={`Out: ${formatCurrency(flow.outflow)}`}>Out: {formatCurrency(flow.outflow)}</div>
                      <div className="truncate" title={`Net: ${formatCurrency(Math.abs(flow.netFlow))}`}>Net: {formatCurrency(Math.abs(flow.netFlow))}</div>
                    </div>
                    <div className="text-xs text-gray-500 mt-1 truncate">
                      {flow.transactionCount} tx • {flow.connections.length} conn
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Detected Patterns */}
            {detectedPatterns.length > 0 && (
              <div className="bg-gray-800 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-gray-100 mb-4">Detected Patterns</h3>
                <div className="space-y-2">
                  {detectedPatterns.map((pattern, index) => (
                    <div key={index} className="p-2 bg-gray-700 rounded border-l-2 border-red-500">
                      <div className="flex justify-between items-center mb-1">
                        <span className="font-medium text-gray-100 capitalize text-xs">
                          {pattern.type.replace('_', ' ')}
                        </span>
                        <span className={`text-xs px-1 py-0.5 rounded ${
                          pattern.severity === 'critical' ? 'bg-red-900 text-red-200' :
                          pattern.severity === 'high' ? 'bg-yellow-900 text-yellow-200' :
                          'bg-blue-900 text-blue-200'
                        }`}>
                          {pattern.severity.substring(0, 1).toUpperCase()}
                        </span>
                      </div>
                      <p className="text-xs text-gray-300 mb-1 line-clamp-2" title={pattern.description}>{pattern.description}</p>
                      <div className="flex justify-between items-center text-xs text-gray-400">
                        <span>{pattern.confidence}% conf</span>
                        <span>{pattern.transactions.length} tx</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Transaction Details */}
            {selectedTransaction && (
              <div className="bg-gray-800 rounded-lg p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-100">Transaction Details</h3>
                  <AddToInvestigationButton 
                    item={{
                      id: selectedTransaction.id,
                      title: `Transaction: ${selectedTransaction.fromEntity} -> ${selectedTransaction.toEntity}`,
                      description: selectedTransaction.description,
                      type: 'evidence',
                      sourceId: selectedTransaction.id,
                      metadata: {
                        amount: selectedTransaction.amount,
                        date: selectedTransaction.date,
                        type: selectedTransaction.type
                      }
                    }}
                    investigations={[]} // This needs to be populated from context or props
                    onAddToInvestigation={(invId, item, relevance) => {
                      console.log('Add to investigation', invId, item, relevance);
                      const event = new CustomEvent('add-to-investigation', { 
                        detail: { investigationId: invId, item, relevance } 
                      });
                      window.dispatchEvent(event);
                    }}
                    variant="button"
                    className="text-xs"
                  />
                </div>
                <div className="space-y-2">
                  <div>
                    <label className="block text-xs font-medium text-gray-400">From</label>
                    <p className="text-gray-100 text-sm" title={selectedTransaction.fromEntity}>{selectedTransaction.fromEntity}</p>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-400">To</label>
                    <p className="text-gray-100 text-sm" title={selectedTransaction.toEntity}>{selectedTransaction.toEntity}</p>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-400">Amount</label>
                    <p className="text-gray-100 font-semibold">
                      {formatCurrency(selectedTransaction.amount, selectedTransaction.currency)}
                    </p>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-400">Date</label>
                    <p className="text-gray-100 text-sm">{selectedTransaction.date}</p>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-400">Type</label>
                    <p className="text-gray-100 text-sm capitalize">{selectedTransaction.type.replace('_', ' ')}</p>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-400">Method</label>
                    <p className="text-gray-100 text-sm capitalize">{selectedTransaction.method}</p>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-400">Description</label>
                    <p className="text-gray-100 text-sm">{selectedTransaction.description}</p>
                  </div>
                  
                  {selectedTransaction.sourceDocuments.length > 0 && (
                    <div>
                      <label className="block text-xs font-medium text-gray-400 mb-1">Source Documents</label>
                      <div className="space-y-1">
                        {selectedTransaction.sourceDocuments.map((doc, index) => (
                          <button
                            key={index}
                            className="block w-full text-left px-2 py-1 bg-gray-700 hover:bg-gray-600 rounded text-xs text-blue-400 hover:text-blue-300 transition-colors truncate"
                            onClick={() => {/* TODO: Open document */}}
                            title={doc}
                          >
                            📄 {doc}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}