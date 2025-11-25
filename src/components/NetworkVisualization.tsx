import React, { useState, useEffect, useRef } from 'react';
import { Network, Link, Users, FileText, AlertTriangle, Search, Filter, Download } from 'lucide-react';

export interface NetworkNode {
  id: string;
  type: 'person' | 'document' | 'organization' | 'location' | 'event' | 'evidence';
  label: string;
  description?: string;
  importance: number; // 1-5 scale
  metadata: {
    mentions?: number;
    documents?: string[];
    connections?: string[];
    category?: string;
    riskLevel?: 'low' | 'medium' | 'high' | 'critical';
    evidenceStrength?: 'weak' | 'moderate' | 'strong' | 'crucial';
  };
  position?: { x: number; y: number };
  color?: string;
  size?: number;
}

export interface NetworkEdge {
  id: string;
  source: string;
  target: string;
  type: 'connection' | 'communication' | 'financial' | 'legal' | 'family' | 'business' | 'evidence';
  strength: number; // 1-10 scale
  direction?: 'unidirectional' | 'bidirectional';
  metadata: {
    frequency?: number;
    dates?: string[];
    context?: string;
    evidence?: string[];
    confidence?: number;
  };
}

export interface NetworkVisualizationProps {
  nodes: NetworkNode[];
  edges: NetworkEdge[];
  onNodeClick?: (node: NetworkNode) => void;
  onEdgeClick?: (edge: NetworkEdge) => void;
  selectedNodeId?: string;
  selectedEdgeId?: string;
  showFilters?: boolean;
  showLegend?: boolean;
  interactive?: boolean;
  height?: number;
}

export const NetworkVisualization: React.FC<NetworkVisualizationProps> = ({
  nodes: initialNodes,
  edges: initialEdges,
  onNodeClick,
  onEdgeClick,
  selectedNodeId,
  selectedEdgeId,
  showFilters = true,
  showLegend = true,
  interactive = true,
  height = 600
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [nodes, setNodes] = useState<NetworkNode[]>([]);
  const [edges, setEdges] = useState<NetworkEdge[]>([]);
  const [filteredNodes, setFilteredNodes] = useState<NetworkNode[]>([]);
  const [filteredEdges, setFilteredEdges] = useState<NetworkEdge[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [filterRisk, setFilterRisk] = useState<string>('all');
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });

  // Initialize with force-directed layout
  useEffect(() => {
    const processedNodes = initialNodes.map(node => ({
      ...node,
      position: node.position || { x: Math.random() * 800, y: Math.random() * 600 },
      color: node.color || getNodeColor(node.type, node.metadata.riskLevel),
      size: node.size || getNodeSize(node.importance)
    }));
    
    setNodes(processedNodes);
    setEdges(initialEdges);
    
    // Apply force-directed layout
    applyForceLayout(processedNodes, initialEdges);
  }, [initialNodes, initialEdges]);

  // Apply filters
  useEffect(() => {
    let filtered = nodes;
    
    if (searchTerm) {
      filtered = filtered.filter(node => 
        node.label.toLowerCase().includes(searchTerm.toLowerCase()) ||
        node.description?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    if (filterType !== 'all') {
      filtered = filtered.filter(node => node.type === filterType);
    }
    
    if (filterRisk !== 'all') {
      filtered = filtered.filter(node => node.metadata.riskLevel === filterRisk);
    }
    
    setFilteredNodes(filtered);
    
    // Filter edges to only show connections between filtered nodes
    const filteredNodeIds = new Set(filtered.map(n => n.id));
    setFilteredEdges(edges.filter(edge => 
      filteredNodeIds.has(edge.source) && filteredNodeIds.has(edge.target)
    ));
  }, [nodes, edges, searchTerm, filterType, filterRisk]);

  const getNodeColor = (type: NetworkNode['type'], riskLevel?: string): string => {
    const baseColors = {
      person: '#3b82f6',      // Blue
      document: '#10b981',    // Green
      organization: '#f59e0b', // Amber
      location: '#8b5cf6',     // Purple
      event: '#ef4444',        // Red
      evidence: '#f97316'      // Orange
    };
    
    const riskColors: Record<string, string> = {
      low: '#22c55e',     // Green
      medium: '#eab308',  // Yellow
      high: '#f97316',    // Orange
      critical: '#dc2626' // Red
    };
    
    return riskLevel ? riskColors[riskLevel] || baseColors[type] : baseColors[type];
  };

  const getNodeSize = (importance: number): number => {
    return 8 + (importance * 4); // 12-28px
  };

  const getEdgeColor = (type: NetworkEdge['type']): string => {
    const colors = {
      connection: '#6b7280',
      communication: '#3b82f6',
      financial: '#10b981',
      legal: '#dc2626',
      family: '#ec4899',
      business: '#f59e0b',
      evidence: '#f97316'
    };
    return colors[type];
  };

  const applyForceLayout = (nodes: NetworkNode[], edges: NetworkEdge[], iterations = 50) => {
    const centerX = 400;
    const centerY = 300;
    const repulsionStrength = 1000;
    const attractionStrength = 0.1;
    const damping = 0.9;
    
    for (let i = 0; i < iterations; i++) {
      // Apply repulsion between all nodes
      for (let j = 0; j < nodes.length; j++) {
        for (let k = j + 1; k < nodes.length; k++) {
          const nodeA = nodes[j];
          const nodeB = nodes[k];
          
          if (!nodeA.position || !nodeB.position) continue;
          
          const dx = nodeB.position.x - nodeA.position.x;
          const dy = nodeB.position.y - nodeA.position.y;
          const distance = Math.sqrt(dx * dx + dy * dy) || 1;
          
          const force = repulsionStrength / (distance * distance);
          const fx = (dx / distance) * force;
          const fy = (dy / distance) * force;
          
          nodeA.position.x -= fx;
          nodeA.position.y -= fy;
          nodeB.position.x += fx;
          nodeB.position.y += fy;
        }
      }
      
      // Apply attraction for connected nodes
      edges.forEach(edge => {
        const source = nodes.find(n => n.id === edge.source);
        const target = nodes.find(n => n.id === edge.target);
        
        if (!source?.position || !target?.position) return;
        
        const dx = target.position.x - source.position.x;
        const dy = target.position.y - source.position.y;
        const distance = Math.sqrt(dx * dx + dy * dy) || 1;
        
        const force = attractionStrength * distance * edge.strength;
        const fx = (dx / distance) * force;
        const fy = (dy / distance) * force;
        
        source.position.x += fx;
        source.position.y += fy;
        target.position.x -= fx;
        target.position.y -= fy;
      });
      
      // Apply center gravity
      nodes.forEach(node => {
        if (!node.position) return;
        
        const dx = centerX - node.position.x;
        const dy = centerY - node.position.y;
        
        node.position.x += dx * 0.01;
        node.position.y += dy * 0.01;
      });
      
      // Apply damping
      nodes.forEach(node => {
        if (!node.position) return;
        
        // Simulate velocity damping (simplified)
        const dx = node.position.x - centerX;
        const dy = node.position.y - centerY;
        
        node.position.x = centerX + dx * damping;
        node.position.y = centerY + dy * damping;
      });
    }
  };

  const drawNetwork = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Apply zoom and pan
    ctx.save();
    ctx.translate(pan.x, pan.y);
    ctx.scale(zoom, zoom);
    
    // Draw edges
    filteredEdges.forEach(edge => {
      const source = filteredNodes.find(n => n.id === edge.source);
      const target = filteredNodes.find(n => n.id === edge.target);
      
      if (!source?.position || !target?.position) return;
      
      ctx.beginPath();
      ctx.moveTo(source.position.x, source.position.y);
      ctx.lineTo(target.position.x, target.position.y);
      
      ctx.strokeStyle = getEdgeColor(edge.type);
      ctx.lineWidth = edge.strength;
      ctx.globalAlpha = 0.6;
      
      if (edge.direction === 'bidirectional') {
        ctx.setLineDash([]);
      } else {
        ctx.setLineDash([5, 5]);
      }
      
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.globalAlpha = 1;
      
      // Draw edge strength indicator
      const midX = (source.position.x + target.position.x) / 2;
      const midY = (source.position.y + target.position.y) / 2;
      
      ctx.fillStyle = '#ffffff';
      ctx.font = '12px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(edge.strength.toString(), midX, midY - 5);
    });
    
    // Draw nodes
    filteredNodes.forEach(node => {
      if (!node.position) return;
      
      const isSelected = node.id === selectedNodeId;
      
      // Draw node circle
      ctx.beginPath();
      ctx.arc(node.position.x, node.position.y, node.size || 12, 0, 2 * Math.PI);
      
      ctx.fillStyle = node.color || '#3b82f6';
      ctx.fill();
      
      if (isSelected) {
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 3;
        ctx.stroke();
      }
      
      // Draw node icon
      ctx.fillStyle = '#ffffff';
      ctx.font = '14px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      
      const icon = getNodeIcon(node.type);
      ctx.fillText(icon, node.position.x, node.position.y);
      
      // Draw node label
      ctx.fillStyle = '#ffffff';
      ctx.font = '12px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(node.label, node.position.x, node.position.y + (node.size || 12) + 15);
      
      // Draw importance indicator
      if (node.importance > 3) {
        ctx.beginPath();
        ctx.arc(node.position.x + (node.size || 12) - 3, node.position.y - (node.size || 12) + 3, 3, 0, 2 * Math.PI);
        ctx.fillStyle = '#fbbf24';
        ctx.fill();
      }
    });
    
    ctx.restore();
  };

  const getNodeIcon = (type: NetworkNode['type']): string => {
    const icons = {
      person: '👤',
      document: '📄',
      organization: '🏢',
      location: '📍',
      event: '📅',
      evidence: '🔍'
    };
    return icons[type];
  };

  useEffect(() => {
    drawNetwork();
  }, [filteredNodes, filteredEdges, selectedNodeId, selectedEdgeId, zoom, pan]);

  const handleCanvasClick = (event: React.MouseEvent<HTMLCanvasElement>) => {
    if (!interactive) return;
    
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const rect = canvas.getBoundingClientRect();
    const x = (event.clientX - rect.left - pan.x) / zoom;
    const y = (event.clientY - rect.top - pan.y) / zoom;
    
    // Check if click is on a node
    const clickedNode = filteredNodes.find(node => {
      if (!node.position) return false;
      const distance = Math.sqrt(
        Math.pow(x - node.position.x, 2) + Math.pow(y - node.position.y, 2)
      );
      return distance <= (node.size || 12);
    });
    
    if (clickedNode) {
      onNodeClick?.(clickedNode);
    }
  };

  const handleWheel = (event: React.WheelEvent<HTMLCanvasElement>) => {
    if (!interactive) return;
    
    event.preventDefault();
    const delta = event.deltaY > 0 ? 0.9 : 1.1;
    setZoom(prev => Math.max(0.1, Math.min(3, prev * delta)));
  };

  const exportNetwork = () => {
    const data = {
      nodes: filteredNodes,
      edges: filteredEdges,
      exportDate: new Date().toISOString(),
      totalNodes: nodes.length,
      totalEdges: edges.length
    };
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `network-analysis-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="bg-gray-900 rounded-lg border border-gray-700 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-700">
        <div className="flex items-center space-x-3">
          <Network className="w-5 h-5 text-blue-400" />
          <h3 className="text-lg font-semibold text-white">Network Analysis</h3>
          <span className="text-sm text-gray-400">
            {filteredNodes.length} nodes, {filteredEdges.length} connections
          </span>
        </div>
        <div className="flex items-center space-x-2">
          {showFilters && (
            <>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search nodes..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 pr-4 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white text-sm focus:outline-none focus:border-blue-500"
                />
              </div>
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white text-sm focus:outline-none focus:border-blue-500"
              >
                <option value="all">All Types</option>
                <option value="person">People</option>
                <option value="document">Documents</option>
                <option value="organization">Organizations</option>
                <option value="location">Locations</option>
                <option value="event">Events</option>
                <option value="evidence">Evidence</option>
              </select>
              <select
                value={filterRisk}
                onChange={(e) => setFilterRisk(e.target.value)}
                className="px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white text-sm focus:outline-none focus:border-blue-500"
              >
                <option value="all">All Risk</option>
                <option value="low">Low Risk</option>
                <option value="medium">Medium Risk</option>
                <option value="high">High Risk</option>
                <option value="critical">Critical Risk</option>
              </select>
            </>
          )}
          <button
            onClick={exportNetwork}
            className="p-2 bg-gray-800 border border-gray-600 rounded-lg text-gray-300 hover:text-white hover:bg-gray-700"
            title="Export Network Data"
          >
            <Download className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Canvas */}
      <div className="relative" style={{ height }}>
        <canvas
          ref={canvasRef}
          width={800}
          height={height}
          className="w-full h-full cursor-pointer"
          onClick={handleCanvasClick}
          onWheel={handleWheel}
          style={{ maxWidth: '100%', height: 'auto' }}
        />
        
        {/* Controls */}
        {interactive && (
          <div className="absolute top-4 right-4 flex flex-col space-y-2">
            <button
              onClick={() => setZoom(prev => Math.min(3, prev * 1.2))}
              className="p-2 bg-gray-800 border border-gray-600 rounded-lg text-white hover:bg-gray-700"
            >
              +
            </button>
            <button
              onClick={() => setZoom(prev => Math.max(0.1, prev * 0.8))}
              className="p-2 bg-gray-800 border border-gray-600 rounded-lg text-white hover:bg-gray-700"
            >
              -
            </button>
            <button
              onClick={() => { setZoom(1); setPan({ x: 0, y: 0 }); }}
              className="p-2 bg-gray-800 border border-gray-600 rounded-lg text-white hover:bg-gray-700 text-xs"
            >
              Reset
            </button>
          </div>
        )}
      </div>

      {/* Legend */}
      {showLegend && (
        <div className="p-4 border-t border-gray-700">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            <div className="text-sm">
              <div className="flex items-center space-x-2 mb-2">
                <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                <span className="text-gray-300">Person</span>
              </div>
            </div>
            <div className="text-sm">
              <div className="flex items-center space-x-2 mb-2">
                <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                <span className="text-gray-300">Document</span>
              </div>
            </div>
            <div className="text-sm">
              <div className="flex items-center space-x-2 mb-2">
                <div className="w-3 h-3 bg-amber-500 rounded-full"></div>
                <span className="text-gray-300">Organization</span>
              </div>
            </div>
            <div className="text-sm">
              <div className="flex items-center space-x-2 mb-2">
                <div className="w-3 h-3 bg-purple-500 rounded-full"></div>
                <span className="text-gray-300">Location</span>
              </div>
            </div>
            <div className="text-sm">
              <div className="flex items-center space-x-2 mb-2">
                <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                <span className="text-gray-300">Event</span>
              </div>
            </div>
            <div className="text-sm">
              <div className="flex items-center space-x-2 mb-2">
                <div className="w-3 h-3 bg-orange-500 rounded-full"></div>
                <span className="text-gray-300">Evidence</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};