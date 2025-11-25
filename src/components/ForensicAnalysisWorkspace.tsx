import React, { useState } from 'react';
import { Investigation, EvidenceItem, TimelineEvent } from '../types/investigation';
import { Microscope, FileSearch, Network, DollarSign, Link, BarChart3, Download, Settings, Eye, EyeOff } from 'lucide-react';
import { ForensicDocumentAnalyzer } from './ForensicDocumentAnalyzer';
import EntityRelationshipMapper from './EntityRelationshipMapper';
import FinancialTransactionMapper from './FinancialTransactionMapper';
import MultiSourceCorrelationEngine from './MultiSourceCorrelationEngine';
import ForensicReportGenerator from './ForensicReportGenerator';

interface ForensicAnalysisWorkspaceProps {
  investigation: Investigation;
  evidence: EvidenceItem[];
  onEvidenceUpdate: (evidence: EvidenceItem[]) => void;
  timelineEvents: TimelineEvent[];
}

export const ForensicAnalysisWorkspace: React.FC<ForensicAnalysisWorkspaceProps> = ({
  investigation,
  evidence,
  onEvidenceUpdate,
  timelineEvents
}) => {
  const [activeTool, setActiveTool] = useState<'documents' | 'entities' | 'financial' | 'correlation' | 'reports'>('documents');
  const [showToolSettings, setShowToolSettings] = useState(false);
  const [enabledTools, setEnabledTools] = useState({
    documents: true,
    entities: true,
    financial: true,
    correlation: true,
    reports: true
  });

  const forensicTools = [
    {
      id: 'documents',
      name: 'Document Analysis',
      description: 'Forensic document authentication and analysis',
      icon: FileSearch,
      component: ForensicDocumentAnalyzer,
      enabled: enabledTools.documents
    },
    {
      id: 'entities',
      name: 'Entity Mapping',
      description: 'Network visualization and relationship analysis',
      icon: Network,
      component: EntityRelationshipMapper,
      enabled: enabledTools.entities
    },
    {
      id: 'financial',
      name: 'Financial Analysis',
      description: 'Transaction flow and money laundering detection',
      icon: DollarSign,
      component: FinancialTransactionMapper,
      enabled: enabledTools.financial
    },
    {
      id: 'correlation',
      name: 'Multi-Source Correlation',
      description: 'Cross-reference analysis and pattern detection',
      icon: Link,
      component: MultiSourceCorrelationEngine,
      enabled: enabledTools.correlation
    },
    {
      id: 'reports',
      name: 'Report Generation',
      description: 'Automated forensic report creation',
      icon: BarChart3,
      component: ForensicReportGenerator,
      enabled: enabledTools.reports
    }
  ];

  const enabledToolsList = forensicTools.filter(tool => tool.enabled);
  const ActiveComponent = enabledToolsList.find(tool => tool.id === activeTool)?.component;

  const toggleTool = (toolId: string) => {
    setEnabledTools(prev => ({
      ...prev,
      [toolId]: !prev[toolId as keyof typeof prev]
    }));
  };

  const getToolStats = () => {
    return {
      documents: { count: evidence.filter(e => e.type === 'document').length, confidence: 94 },
      entities: { count: 47, confidence: 87 },
      financial: { count: 2847, confidence: 91 },
      correlation: { count: 156, confidence: 89 },
      reports: { count: 12, confidence: 96 }
    };
  };

  const stats = getToolStats();

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100">
      {/* Header */}
      <div className="bg-gray-800 border-b border-gray-700 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Microscope className="w-6 h-6 text-red-400" />
            <div>
              <h1 className="text-xl font-semibold text-gray-100">
                Forensic Analysis Workspace
              </h1>
              <p className="text-sm text-gray-400">
                {investigation.title} - Advanced forensic tools for criminal investigation
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowToolSettings(!showToolSettings)}
              className="flex items-center gap-2 px-3 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors"
            >
              <Settings className="w-4 h-4" />
              <span className="text-sm">Tools</span>
            </button>
            <button className="flex items-center gap-2 px-3 py-2 bg-red-600 hover:bg-red-700 rounded-lg transition-colors">
              <Download className="w-4 h-4" />
              <span className="text-sm">Export All</span>
            </button>
          </div>
        </div>

        {/* Tool Settings */}
        {showToolSettings && (
          <div className="mt-4 p-4 bg-gray-700 rounded-lg">
            <h3 className="text-sm font-medium text-gray-300 mb-3">Enabled Forensic Tools</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
              {forensicTools.map(tool => (
                <label key={tool.id} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={enabledTools[tool.id as keyof typeof enabledTools]}
                    onChange={() => toggleTool(tool.id)}
                    className="rounded"
                  />
                  <span className="text-sm text-gray-300">{tool.name}</span>
                  {enabledTools[tool.id as keyof typeof enabledTools] ? (
                    <Eye className="w-3 h-3 text-green-400 ml-auto" />
                  ) : (
                    <EyeOff className="w-3 h-3 text-gray-500 ml-auto" />
                  )}
                </label>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="flex">
        {/* Sidebar */}
        <div className="w-80 bg-gray-800 border-r border-gray-700 min-h-screen">
          {/* Tool Selection */}
          <div className="p-4 border-b border-gray-700">
            <h2 className="text-lg font-semibold text-gray-100 mb-4">Forensic Tools</h2>
            <div className="space-y-2">
              {enabledToolsList.map(tool => {
                const Icon = tool.icon;
                const toolStats = stats[tool.id as keyof typeof stats];
                return (
                  <button
                    key={tool.id}
                    onClick={() => setActiveTool(tool.id as any)}
                    className={`w-full p-3 rounded-lg text-left transition-colors ${
                      activeTool === tool.id
                        ? 'bg-red-900 border border-red-600'
                        : 'bg-gray-700 hover:bg-gray-600 border border-gray-600'
                    }`}
                  >
                    <div className="flex items-center gap-3 mb-2">
                      <Icon className="w-5 h-5 text-red-400" />
                      <span className="font-medium text-gray-100">{tool.name}</span>
                    </div>
                    <p className="text-xs text-gray-400 mb-2">{tool.description}</p>
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-gray-500">
                        {toolStats.count.toLocaleString()} items
                      </span>
                      <span className={`px-2 py-1 rounded text-xs ${
                        toolStats.confidence >= 90 ? 'bg-green-900 text-green-200' :
                        toolStats.confidence >= 80 ? 'bg-yellow-900 text-yellow-200' :
                        'bg-red-900 text-red-200'
                      }`}>
                        {toolStats.confidence}% confidence
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Investigation Summary */}
          <div className="p-4">
            <h3 className="text-sm font-medium text-gray-300 mb-3">Investigation Summary</h3>
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Status</span>
                <span className={`px-2 py-1 rounded text-xs font-medium ${
                  investigation.status === 'active' ? 'bg-green-900 text-green-200' :
                  investigation.status === 'review' ? 'bg-yellow-900 text-yellow-200' :
                  'bg-gray-900 text-gray-200'
                }`}>
                  {investigation.status}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Priority</span>
                <span className={`px-2 py-1 rounded text-xs font-medium ${
                  investigation.priority === 'critical' ? 'bg-red-900 text-red-200' :
                  investigation.priority === 'high' ? 'bg-orange-900 text-orange-200' :
                  investigation.priority === 'medium' ? 'bg-yellow-900 text-yellow-200' :
                  'bg-green-900 text-green-200'
                }`}>
                  {investigation.priority}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Evidence Items</span>
                <span className="text-gray-100">{evidence.length}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Timeline Events</span>
                <span className="text-gray-100">{timelineEvents.length}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Team Size</span>
                <span className="text-gray-100">{investigation.team.length}</span>
              </div>
            </div>

            {investigation.hypothesis && (
              <div className="mt-4">
                <h4 className="text-sm font-medium text-gray-300 mb-2">Hypothesis</h4>
                <p className="text-xs text-gray-400 leading-relaxed">
                  {investigation.hypothesis}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 bg-gray-900">
          <div className="h-full">
            {activeTool === 'documents' && (
              <ForensicDocumentAnalyzer 
                documentUrl={evidence[0]?.source || ''} 
                documentId={evidence[0]?.id || ''} 
              />
            )}
            {activeTool === 'entities' && (
              <EntityRelationshipMapper 
                entities={[]} 
                relationships={[]} 
              />
            )}
            {activeTool === 'financial' && (
              <FinancialTransactionMapper />
            )}
            {activeTool === 'correlation' && (
              <MultiSourceCorrelationEngine />
            )}
            {activeTool === 'reports' && (
              <ForensicReportGenerator />
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ForensicAnalysisWorkspace;