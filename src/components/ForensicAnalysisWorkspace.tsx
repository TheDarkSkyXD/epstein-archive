import React, { useState, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { Investigation, EvidenceItem, TimelineEvent } from '../types/investigation';
import {
  Microscope,
  FileSearch,
  Network,
  DollarSign,
  Link,
  BarChart3,
  Download,
  Settings,
  Eye,
  EyeOff,
  ArrowRight,
} from 'lucide-react';
import { ForensicDocumentAnalyzer } from './ForensicDocumentAnalyzer';
import EntityRelationshipMapper from './EntityRelationshipMapper';
import FinancialTransactionMapper from './FinancialTransactionMapper';
import MultiSourceCorrelationEngine from './MultiSourceCorrelationEngine';
import ForensicReportGenerator from './ForensicReportGenerator';
import { transformToNetwork } from '../utils/networkDataUtils';

interface ForensicAnalysisWorkspaceProps {
  investigation: Investigation;
  evidence: EvidenceItem[];
  onEvidenceUpdate: (evidence: EvidenceItem[]) => void;
  timelineEvents: TimelineEvent[];
  useGlobalContext?: boolean;
}

// TODO: Implement evidence update callback - see UNUSED_VARIABLES_RECOMMENDATIONS.md
export const ForensicAnalysisWorkspace: React.FC<ForensicAnalysisWorkspaceProps> = ({
  investigation,
  evidence,
  onEvidenceUpdate: _onEvidenceUpdate,
  timelineEvents,
  useGlobalContext = false,
}) => {
  const [activeTool, setActiveTool] = useState<
    'documents' | 'entities' | 'financial' | 'correlation' | 'reports'
  >('documents');
  const [showToolSettings, setShowToolSettings] = useState(false);
  const [toolsCollapsed, setToolsCollapsed] = useState(false);
  const [enabledTools, setEnabledTools] = useState({
    documents: true,
    entities: true,
    financial: true,
    correlation: true,
    reports: true,
  });

  // Generate network data for the Entity Mapper
  const networkData = useMemo(() => {
    const people: any[] = [];
    const documents = (evidence || []).map((ev) => ({
      id: ev.id,
      title: ev.title || ev.id,
      mentionedEntities: [],
    }));
    return transformToNetwork(people, documents);
  }, [evidence]);

  const forensicTools = [
    {
      id: 'documents',
      name: 'Document Analysis',
      description: 'Forensic document authentication and analysis',
      icon: FileSearch,
      component: ForensicDocumentAnalyzer,
      enabled: enabledTools.documents,
    },
    {
      id: 'entities',
      name: 'Entity Mapping',
      description: 'Network visualization and relationship analysis',
      icon: Network,
      component: EntityRelationshipMapper,
      enabled: enabledTools.entities,
    },
    {
      id: 'financial',
      name: 'Financial Analysis',
      description: 'Transaction flow and money laundering detection',
      icon: DollarSign,
      component: FinancialTransactionMapper,
      enabled: enabledTools.financial,
    },
    {
      id: 'correlation',
      name: 'Multi-Source Correlation',
      description: 'Cross-reference analysis and pattern detection',
      icon: Link,
      component: MultiSourceCorrelationEngine,
      enabled: enabledTools.correlation,
    },
    {
      id: 'reports',
      name: 'Report Generation',
      description: 'Automated forensic report creation',
      icon: BarChart3,
      component: ForensicReportGenerator,
      enabled: enabledTools.reports,
    },
  ];

  const enabledToolsList = forensicTools.filter((tool) => tool.enabled);

  const toggleTool = (toolId: string) => {
    setEnabledTools((prev) => ({
      ...prev,
      [toolId]: !prev[toolId as keyof typeof prev],
    }));
  };

  const getToolStats = () => {
    const financialCount = evidence.filter((e) =>
      (e.type || '').toLowerCase().includes('financial'),
    ).length;
    return {
      documents: {
        count: evidence.filter((e) => (e.type || '').toLowerCase().includes('document')).length,
        confidence: 94,
      },
      entities: { count: networkData.entities.length, confidence: 87 },
      financial: { count: financialCount, confidence: financialCount ? 91 : 0 },
      correlation: { count: 0, confidence: 0 },
      reports: { count: 1, confidence: 96 },
    };
  };

  const stats = getToolStats();
  const location = useLocation();
  const docIdParam = (() => {
    try {
      const p = new URLSearchParams(location.search);
      return p.get('docId') || '';
    } catch {
      return '';
    }
  })();

  return (
    <div className="min-h-full bg-gray-900 text-gray-100">
      {/* Header */}
      <div className="bg-gray-800 border-b border-gray-700 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Microscope className="w-6 h-6 text-red-400" />
            <div>
              <h1 className="text-xl font-semibold text-gray-100">Forensic Analysis Workspace</h1>
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
              {forensicTools.map((tool) => (
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

      <div className="flex flex-col md:flex-row">
        {/* Collapsible Sidebar */}
        <div
          className={`${toolsCollapsed ? 'w-16' : 'w-full md:w-80'} bg-gray-800 border-b md:border-b-0 md:border-r border-gray-700 transition-all duration-300`}
        >
          {/* Tool Selection */}
          <div className="p-4 border-b border-gray-700">
            <div className="flex items-center justify-between mb-4">
              <h2
                className={`text-lg font-semibold text-gray-100 ${toolsCollapsed ? 'hidden' : ''}`}
              >
                Forensic Tools
              </h2>
              <button
                onClick={() => setToolsCollapsed(!toolsCollapsed)}
                className="p-2 text-gray-400 hover:text-white transition-colors rounded-md hover:bg-gray-700"
                title={toolsCollapsed ? 'Expand tools' : 'Collapse tools'}
              >
                {toolsCollapsed ? (
                  <ArrowRight className="w-5 h-5" />
                ) : (
                  <ArrowRight className="w-5 h-5 rotate-180" />
                )}
              </button>
            </div>
            <div className="space-y-2">
              {enabledToolsList.map((tool) => {
                const Icon = tool.icon;
                const toolStats = stats[tool.id as keyof typeof stats];
                return (
                  <div key={tool.id} className="relative group">
                    <button
                      onClick={() => setActiveTool(tool.id as any)}
                      className={`w-full p-3 rounded-lg text-left transition-colors ${
                        activeTool === tool.id
                          ? 'bg-red-900 border border-red-600'
                          : 'bg-gray-700 hover:bg-gray-600 border border-gray-600'
                      } ${toolsCollapsed ? 'p-3 flex items-center justify-center' : ''}`}
                      title={toolsCollapsed ? `${tool.name}: ${tool.description}` : ''}
                    >
                      <div
                        className={`flex items-center ${toolsCollapsed ? 'justify-center' : 'gap-3 mb-2'}`}
                      >
                        <Icon className="w-5 h-5 text-red-400" />
                        {!toolsCollapsed && (
                          <span className="font-medium text-gray-100">{tool.name}</span>
                        )}
                      </div>
                      {!toolsCollapsed && (
                        <>
                          <p className="text-xs text-gray-400 mb-2 line-clamp-2 whitespace-nowrap overflow-hidden text-ellipsis">
                            {tool.description}
                          </p>
                          <div className="flex justify-between items-center text-xs">
                            <span className="text-gray-500">
                              {toolStats.count.toLocaleString()} items
                            </span>
                            <span
                              className={`px-2 py-1 rounded text-xs ${
                                toolStats.confidence >= 90
                                  ? 'bg-green-900 text-green-200'
                                  : toolStats.confidence >= 80
                                    ? 'bg-yellow-900 text-yellow-200'
                                    : 'bg-red-900 text-red-200'
                              }`}
                            >
                              {toolStats.confidence}% confidence
                            </span>
                          </div>
                        </>
                      )}
                    </button>

                    {/* Popover summary for collapsed view */}
                    {toolsCollapsed && (
                      <div className="absolute left-full ml-2 top-0 w-64 bg-gray-800 border border-gray-600 rounded-lg p-3 shadow-lg z-10 hidden group-hover:block">
                        <h4 className="font-medium text-gray-100 mb-1">{tool.name}</h4>
                        <p className="text-xs text-gray-400 mb-2">{tool.description}</p>
                        <div className="flex justify-between items-center text-xs">
                          <span className="text-gray-500">
                            {toolStats.count.toLocaleString()} items
                          </span>
                          <span
                            className={`px-2 py-1 rounded text-xs ${
                              toolStats.confidence >= 90
                                ? 'bg-green-900 text-green-200'
                                : toolStats.confidence >= 80
                                  ? 'bg-yellow-900 text-yellow-200'
                                  : 'bg-red-900 text-red-200'
                            }`}
                          >
                            {toolStats.confidence}% confidence
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
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
                <span
                  className={`px-2 py-1 rounded text-xs font-medium ${
                    investigation.status === 'active'
                      ? 'bg-green-900 text-green-200'
                      : investigation.status === 'review'
                        ? 'bg-yellow-900 text-yellow-200'
                        : 'bg-gray-900 text-gray-200'
                  }`}
                >
                  {investigation.status}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Priority</span>
                <span
                  className={`px-2 py-1 rounded text-xs font-medium ${
                    investigation.priority === 'critical'
                      ? 'bg-red-900 text-red-200'
                      : investigation.priority === 'high'
                        ? 'bg-orange-900 text-orange-200'
                        : investigation.priority === 'medium'
                          ? 'bg-yellow-900 text-yellow-200'
                          : 'bg-green-900 text-green-200'
                  }`}
                >
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
                <p className="text-xs text-gray-400 leading-relaxed">{investigation.hypothesis}</p>
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
                documentId={docIdParam || evidence[0]?.id || ''}
              />
            )}
            {activeTool === 'entities' && (
              <EntityRelationshipMapper
                entities={networkData.entities}
                relationships={networkData.relationships}
              />
            )}
            {activeTool === 'financial' && (
              <FinancialTransactionMapper
                investigationId={useGlobalContext ? undefined : investigation.id}
              />
            )}
            {activeTool === 'correlation' && <MultiSourceCorrelationEngine />}
            {activeTool === 'reports' && (
              <ForensicReportGenerator
                investigationId={useGlobalContext ? undefined : Number(investigation.id)}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ForensicAnalysisWorkspace;
