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
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [lastPan, setLastPan] = useState({ x: 0, y: 0 });

  // Initialize with force-directed layout
  useEffect(() => {
    // Spread nodes more evenly across the canvas initially
    const spreadNodes = initialNodes.map((node, index) => {
      const angle = (index / initialNodes.length) * 2 * Math.PI;
      const radius = 200 + (index % 5) * 50; // Vary radius to create layers
      
      return {
        ...node,
        position: node.position || { 
          x: 400 + Math.cos(angle) * radius, 
          y: 300 + Math.sin(angle) * radius 
        },
        color: node.color || getNodeColor(node.type, node.metadata.riskLevel),
        size: node.size || getNodeSize(node.importance)
      };
    });
    
    setNodes(spreadNodes);
    setEdges(initialEdges);
    
    // Apply force-directed layout with more iterations for better spacing
    applyForceLayout(spreadNodes, initialEdges, 150);
    
    // Center the network after layout
    setTimeout(() => centerNetwork(), 1000);
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

  const applyForceLayout = (nodes: NetworkNode[], edges: NetworkEdge[], iterations = 150) => {
    const centerX = 400;
    const centerY = 300;
    const repulsionStrength = 3000; // Further increased repulsion to spread nodes further apart
    const attractionStrength = 0.03; // Further reduced attraction to prevent clustering
    const damping = 0.9;
    
    for (let i = 0; i < iterations; i++) {
      // Apply repulsion between all nodes (increased to spread out more)
      for (let j = 0; j < nodes.length; j++) {
        for (let k = j + 1; k < nodes.length; k++) {
          const nodeA = nodes[j];
          const nodeB = nodes[k];
          
          if (!nodeA.position || !nodeB.position) continue;
          
          const dx = nodeB.position.x - nodeA.position.x;
          const dy = nodeB.position.y - nodeA.position.y;
          const distance = Math.sqrt(dx * dx + dy * dy) || 1;
          
          // Increase minimum distance to prevent overlap
          const minDistance = (nodeA.size || 12) + (nodeB.size || 12) + 30;
          const force = (repulsionStrength * 4) / (distance * distance + 1);
          const fx = (dx / (distance + 1)) * force;
          const fy = (dy / (distance + 1)) * force;
          
          nodeA.position.x -= fx;
          nodeA.position.y -= fy;
          nodeB.position.x += fx;
          nodeB.position.y += fy;
          
          // Additional separation if nodes are too close
          if (distance < minDistance) {
            const separationX = (dx / (distance + 1)) * (minDistance - distance);
            const separationY = (dy / (distance + 1)) * (minDistance - distance);
            nodeA.position.x -= separationX * 0.7;
            nodeA.position.y -= separationY * 0.7;
            nodeB.position.x += separationX * 0.7;
            nodeB.position.y += separationY * 0.7;
          }
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
        
        // Reduce attraction strength to prevent tight clustering
        const force = attractionStrength * distance * edge.strength * 0.3;
        const fx = (dx / (distance + 1)) * force;
        const fy = (dy / (distance + 1)) * force;
        
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
        
        node.position.x += dx * 0.003; // Further reduced center gravity
        node.position.y += dy * 0.003;
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
    
    // Get canvas center position
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const rect = canvas.getBoundingClientRect();
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    
    // Convert screen coordinates to world coordinates
    const worldCenterX = (centerX - pan.x) / zoom;
    const worldCenterY = (centerY - pan.y) / zoom;
    
    // Apply zoom
    const newZoom = Math.max(0.1, Math.min(3, zoom * delta));
    
    // Adjust pan to keep center fixed
    const newPanX = centerX - worldCenterX * newZoom;
    const newPanY = centerY - worldCenterY * newZoom;
    
    setZoom(newZoom);
    setPan({ x: newPanX, y: newPanY });
  };

  // Enhanced zoom to center on mouse position
  const handleWheelEnhanced = (event: React.WheelEvent<HTMLCanvasElement>) => {
    if (!interactive) return;
    
    event.preventDefault();
    const delta = event.deltaY > 0 ? 0.9 : 1.1;
    
    // Get mouse position relative to canvas
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const rect = canvas.getBoundingClientRect();
    const mouseX = event.clientX - rect.left;
    const mouseY = event.clientY - rect.top;
    
    // Convert screen coordinates to world coordinates
    const worldMouseX = (mouseX - pan.x) / zoom;
    const worldMouseY = (mouseY - pan.y) / zoom;
    
    // Apply zoom
    const newZoom = Math.max(0.1, Math.min(3, zoom * delta));
    
    // Adjust pan to keep mouse position fixed
    const newPanX = mouseX - worldMouseX * newZoom;
    const newPanY = mouseY - worldMouseY * newZoom;
    
    setZoom(newZoom);
    setPan({ x: newPanX, y: newPanY });
  };

  const centerNetwork = () => {
    if (filteredNodes.length === 0) return;
    
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    // Calculate center of all nodes
    const bounds = filteredNodes.reduce((acc, node) => {
      if (!node.position) return acc;
      return {
        minX: Math.min(acc.minX, node.position.x),
        maxX: Math.max(acc.maxX, node.position.x),
        minY: Math.min(acc.minY, node.position.y),
        maxY: Math.max(acc.maxY, node.position.y)
      };
    }, { minX: Infinity, maxX: -Infinity, minY: Infinity, maxY: -Infinity });
    
    const centerX = (bounds.minX + bounds.maxX) / 2;
    const centerY = (bounds.minY + bounds.maxY) / 2;
    
    // Center the network on canvas
    const canvasCenterX = canvas.width / 2;
    const canvasCenterY = canvas.height / 2;
    
    setPan({
      x: canvasCenterX - centerX * zoom,
      y: canvasCenterY - centerY * zoom
    });
  };

  const handleMouseDown = (event: React.MouseEvent<HTMLCanvasElement>) => {
    if (!interactive) return;
    
    setIsDragging(true);
    setDragStart({ x: event.clientX, y: event.clientY });
    setLastPan({ x: pan.x, y: pan.y });
  };

  const handleMouseMove = (event: React.MouseEvent<HTMLCanvasElement>) => {
    if (!interactive || !isDragging) return;
    
    const deltaX = event.clientX - dragStart.x;
    const deltaY = event.clientY - dragStart.y;
    
    setPan({
      x: lastPan.x + deltaX,
      y: lastPan.y + deltaY
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
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
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-3 p-4 border-b border-gray-700">
        <div className="flex items-center gap-3 whitespace-nowrap flex-shrink-0">
          <Network className="w-5 h-5 text-blue-400 flex-shrink-0" />
          <h3 className="text-lg font-semibold text-white">Network Analysis</h3>
          <span className="text-sm text-gray-400">
            {filteredNodes.length} nodes, {filteredEdges.length} connections
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto">
          {showFilters && (
            <>
              <div className="relative flex-1 lg:flex-none min-w-[160px]">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search nodes..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full h-10 pl-10 pr-4 bg-gray-800 border border-gray-600 rounded-lg text-white text-sm focus:outline-none focus:border-blue-500"
                />
              </div>
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="h-10 px-3 bg-gray-800 border border-gray-600 rounded-lg text-white text-sm focus:outline-none focus:border-blue-500"
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
                className="h-10 px-3 bg-gray-800 border border-gray-600 rounded-lg text-white text-sm focus:outline-none focus:border-blue-500"
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
            className="h-10 w-10 flex items-center justify-center bg-gray-800 border border-gray-600 rounded-lg text-gray-300 hover:text-white hover:bg-gray-700 flex-shrink-0"
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
          className="w-full h-full cursor-grab active:cursor-grabbing"
          onClick={handleCanvasClick}
          onWheel={handleWheelEnhanced}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          style={{ maxWidth: '100%', height: 'auto' }}
        />
        
        {/* Controls */}
        {interactive && (
          <div className="absolute top-4 right-4 flex flex-col space-y-2">
            <button
              onClick={() => setZoom(prev => Math.min(3, prev * 1.2))}
              className="p-2 bg-gray-800 border border-gray-600 rounded-lg text-white hover:bg-gray-700"
              title="Zoom In"
            >
              +
            </button>
            <button
              onClick={() => setZoom(prev => Math.max(0.1, prev * 0.8))}
              className="p-2 bg-gray-800 border border-gray-600 rounded-lg text-white hover:bg-gray-700"
              title="Zoom Out"
            >
              -
            </button>
            <button
              onClick={() => { setZoom(1); setPan({ x: 0, y: 0 }); }}
              className="p-2 bg-gray-800 border border-gray-600 rounded-lg text-white hover:bg-gray-700 text-xs"
              title="Reset View"
            >
              Reset
            </button>
            <button
              onClick={centerNetwork}
              className="p-2 bg-gray-800 border border-gray-600 rounded-lg text-white hover:bg-gray-700 text-xs"
              title="Center Network"
            >
              Center
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