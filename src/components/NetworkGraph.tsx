import React, { useMemo, useState, useRef, useEffect } from 'react';
import { ZoomIn, ZoomOut, Move, RefreshCw } from 'lucide-react';

interface EntityNode {
  id: number;
  name: string;
  role?: string;
  type?: string;
  riskLevel?: number;
  connectionCount: number;
  mentions?: number;
}

interface Relationship {
  source: string;
  target: string;
  type?: string;
  weight?: number;
}

interface NetworkGraphProps {
  entities: EntityNode[];
  relationships: Relationship[];
  onEntityClick?: (entity: EntityNode) => void;
  maxNodes?: number;
}

interface Point {
  x: number;
  y: number;
}

interface GraphNode extends EntityNode {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
}

// Risk-based colors with better visibility
const getRiskColor = (riskLevel: number): string => {
  if (riskLevel >= 5) return '#a855f7'; // Purple - Critical
  if (riskLevel >= 4) return '#ef4444'; // Red - High
  if (riskLevel >= 3) return '#f59e0b'; // Amber - Medium
  if (riskLevel >= 2) return '#3b82f6'; // Blue - Low
  return '#10b981'; // Green - Minimal
};

const getNodeSize = (connectionCount: number, maxConnections: number): number => {
  const minSize = 3; // larger base size
  const maxSize = 12; // larger max size
  const ratio = connectionCount / Math.max(maxConnections, 1);
  return minSize + (maxSize - minSize) * Math.sqrt(ratio);
};

export const NetworkGraph: React.FC<NetworkGraphProps> = ({ 
  entities, 
  relationships,
  onEntityClick,
  maxNodes = 60
}) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const [nodes, setNodes] = useState<GraphNode[]>([]);
  const [transform, setTransform] = useState({ x: 0, y: 0, k: 1 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState<Point>({ x: 0, y: 0 });
  const [draggedNode, setDraggedNode] = useState<number | null>(null);
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);

  // Initialize nodes with Spiral Layout
  useEffect(() => {
    const topEntities = entities.slice(0, maxNodes);
    
    // Golden Spiral Layout (Phyllotaxis)
    // r = c * sqrt(n)
    // theta = n * 137.508... degrees
    const goldenAngle = Math.PI * (3 - Math.sqrt(5)); 
    
    const initialNodes = topEntities.map((entity, index) => {
      // Calculate dynamic radius/spacing
      // We want spacing to increase slightly as we go out
      const rStep = 6; // Spacing parameter
      const r = rStep * Math.sqrt(index + 2); // Start not at 0 to avoid center clump
      const theta = index * goldenAngle;
      
      const x = 50 + r * Math.cos(theta);
      const y = 50 + r * Math.sin(theta);
      
      const maxConn = Math.max(1, ...topEntities.map(n => n.connectionCount));
      const size = getNodeSize(entity.connectionCount, maxConn);

      return {
        ...entity,
        x,
        y,
        vx: 0,
        vy: 0,
        radius: size
      };
    });
    setNodes(initialNodes);
  }, [entities, maxNodes]);

  // Links data
  const links = useMemo(() => {
    if (nodes.length === 0) return [];
    const nodeMap = new Map(nodes.map(n => [n.name, n]));
    return relationships
      .filter(r => nodeMap.has(r.source) && nodeMap.has(r.target))
      .map(r => ({
        source: nodeMap.get(r.source)!,
        target: nodeMap.get(r.target)!,
        type: r.type
      }))
      .slice(0, 500);
  }, [nodes, relationships]);

  // Gentle collision resolution only (keep the spiral mostly intact)
  useEffect(() => {
    if (nodes.length === 0) return;
    
    const tick = () => {
      setNodes(prevNodes => {
        const newNodes = prevNodes.map(n => ({ ...n }));
        
        // Only apply collision detection, no gravity/centering to preserve spiral
        for (let i = 0; i < newNodes.length; i++) {
          const node = newNodes[i];
          if (node.id === draggedNode) continue;

          for (let j = 0; j < newNodes.length; j++) {
            if (i === j) continue;
            const other = newNodes[j];
            const dx = node.x - other.x;
            const dy = node.y - other.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            const minDist = (node.radius/2 + other.radius/2) * 1.5; // Padding

            if (dist < minDist && dist > 0) {
              const overlap = minDist - dist;
              const moveX = (dx / dist) * overlap * 0.1; // Gentle push
              const moveY = (dy / dist) * overlap * 0.1;
              
              node.x += moveX;
              node.y += moveY;
            }
          }
        }
        return newNodes;
      });
    };

    // Short simulation to just fix overlaps
    const interval = setInterval(tick, 30);
    const timeout = setTimeout(() => clearInterval(interval), 2000); 
    
    return () => {
      clearInterval(interval);
      clearTimeout(timeout);
    };
  }, [nodes.length, draggedNode]);

  // Pan/Zoom handlers (Same optimized Center Zoom)
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    if (!svgRef.current) return;

    const scaleFactor = 1.1;
    const direction = e.deltaY < 0 ? 1 : -1;
    const factor = direction > 0 ? scaleFactor : 1 / scaleFactor;
    
    const newK = Math.max(0.2, Math.min(5, transform.k * factor));
    
    const rect = svgRef.current.getBoundingClientRect();
    const relX = (e.clientX - rect.left) / rect.width * 100;
    const relY = (e.clientY - rect.top) / rect.height * 100;

    const newX = relX - (relX - transform.x) * (newK / transform.k);
    const newY = relY - (relY - transform.y) * (newK / transform.k);

    setTransform({ x: newX, y: newY, k: newK });
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return;
    setIsDragging(true);
    setDragStart({ x: e.clientX, y: e.clientY });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (draggedNode !== null) {
      const dx = (e.clientX - dragStart.x) / transform.k;
      const dy = (e.clientY - dragStart.y) / transform.k;
      
      const svgWidth = svgRef.current?.getBoundingClientRect().width || 1;
      const scaleToUnits = 100 / svgWidth;

      setNodes(prev => prev.map(n => {
        if (n.id === draggedNode) {
          return { 
            ...n, 
            x: n.x + dx * scaleToUnits, 
            y: n.y + dy * scaleToUnits 
          };
        }
        return n;
      }));
      setDragStart({ x: e.clientX, y: e.clientY });
    } else if (isDragging) {
      const svgWidth = svgRef.current?.getBoundingClientRect().width || 1;
      const scaleToUnits = 100 / svgWidth;

      const dx = (e.clientX - dragStart.x) * scaleToUnits;
      const dy = (e.clientY - dragStart.y) * scaleToUnits;

      setTransform(prev => ({ ...prev, x: prev.x + dx, y: prev.y + dy }));
      setDragStart({ x: e.clientX, y: e.clientY });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
    setDraggedNode(null);
  };

  const zoomFromCenter = (factor: number) => {
    const newK = Math.max(0.2, Math.min(5, transform.k * factor));
    const center = 50;
    const newX = center - (center - transform.x) * (newK / transform.k);
    const newY = center - (center - transform.y) * (newK / transform.k);
    setTransform({ x: newX, y: newY, k: newK });
  };

  const zoomIn = () => zoomFromCenter(1.2);
  const zoomOut = () => zoomFromCenter(1/1.2);
  const resetView = () => setTransform({ x: 0, y: 0, k: 1 });

  return (
    <div className="relative w-full h-[600px] bg-slate-900/50 rounded-xl border border-slate-700/50 overflow-hidden select-none">
      {/* Controls */}
      <div className="absolute top-4 right-4 z-20 flex flex-col gap-2">
        <button onClick={zoomIn} className="p-2 bg-slate-800 hover:bg-slate-700 rounded-lg border border-slate-700 text-slate-300">
          <ZoomIn className="w-5 h-5" />
        </button>
        <button onClick={zoomOut} className="p-2 bg-slate-800 hover:bg-slate-700 rounded-lg border border-slate-700 text-slate-300">
          <ZoomOut className="w-5 h-5" />
        </button>
        <button onClick={resetView} className="p-2 bg-slate-800 hover:bg-slate-700 rounded-lg border border-slate-700 text-slate-300">
          <RefreshCw className="w-5 h-5" />
        </button>
      </div>

      {/* Legend */}
      <div className="absolute top-4 left-4 z-20 bg-slate-800/90 backdrop-blur-sm rounded-lg p-4 border border-slate-700/50 shadow-xl pointer-events-none sm:pointer-events-auto opacity-80 sm:opacity-100 hover:opacity-100 transition-opacity">
        <p className="text-xs text-slate-400 mb-3 font-bold uppercase tracking-wider">Risk Levels</p>
        <div className="space-y-2">
          {[
            { level: 5, label: 'Critical Risk', color: '#a855f7' },
            { level: 4, label: 'High Risk', color: '#ef4444' },
            { level: 3, label: 'Medium Risk', color: '#f59e0b' },
            { level: 2, label: 'Low Risk', color: '#3b82f6' },
            { level: 1, label: 'Minimal', color: '#10b981' },
          ].map(({ level, label, color }) => (
            <div key={level} className="flex items-center gap-3">
              <div 
                className="w-3 h-3 rounded-full shadow-[0_0_8px]" 
                style={{ backgroundColor: color, boxShadow: `0 0 8px ${color}` }}
              />
              <span className="text-xs text-slate-300">{label}</span>
            </div>
          ))}
        </div>
        <div className="mt-4 pt-3 border-t border-slate-700/50">
           <div className="flex items-center gap-2 text-xs text-slate-400">
             <Move className="w-3 h-3" />
             <span>Drag Background to Pan</span>
           </div>
           <div className="flex items-center gap-2 text-xs text-slate-400 mt-1">
             <span className="w-3 h-3 rounded-full border border-slate-500 block"></span>
             <span>Drag Nodes to Rearrange</span>
           </div>
        </div>
      </div>
      
      {/* Graph Area */}
      <svg 
        ref={svgRef}
        viewBox="0 0 100 100" 
        className="w-full h-full cursor-move"
        style={{ 
          background: 'radial-gradient(circle at 50% 50%, rgba(15, 23, 42, 0.5) 0%, rgba(2, 6, 23, 0.8) 100%)' 
        }}
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        <defs>
          <filter id="nodeGlow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="0.5" result="blur"/>
            <feMerge>
              <feMergeNode in="blur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
        </defs>
        
        <g transform={`translate(${transform.x}, ${transform.y}) scale(${transform.k})`}>
          {/* Links */}
          <g className="links">
            {links.map((link, i) => {
              const isHighlight = hoveredNode === link.source.name || hoveredNode === link.target.name;
              return (
                <line
                  key={i}
                  x1={link.source.x}
                  y1={link.source.y}
                  x2={link.target.x}
                  y2={link.target.y}
                  stroke={isHighlight ? '#bae6fd' : '#334155'}
                  strokeWidth={isHighlight ? 0.3 : 0.05}
                  strokeOpacity={isHighlight ? 0.8 : 0.2}
                  className="transition-all duration-300"
                />
              );
            })}
          </g>
          
          {/* Nodes */}
          <g className="nodes">
            {nodes.map((node) => {
              const color = getRiskColor(node.riskLevel || 0);
              const isHovered = hoveredNode === node.name;
              const size = node.radius || 4;
              
              return (
                <g 
                  key={node.id}
                  transform={`translate(${node.x}, ${node.y})`}
                  onMouseEnter={() => setHoveredNode(node.name)}
                  onMouseLeave={() => setHoveredNode(null)}
                  onMouseDown={(e) => {
                     e.stopPropagation();
                     setDraggedNode(node.id);
                     setDragStart({ x: e.clientX, y: e.clientY });
                  }}
                  onClick={() => onEntityClick?.(node)}
                  className="cursor-pointer"
                  style={{ transition: isDragging && draggedNode === node.id ? 'none' : 'transform 0.1s ease-out' }}
                >
                  {/* Outer Glow */}
                  <circle
                    r={size / 2 * 2.5}
                    fill={color}
                    opacity={isHovered ? 0.3 : 0.05}
                    className="transition-opacity duration-300"
                  />
                  
                  {/* Node Body */}
                  <circle
                    r={size / 2}
                    fill={color}
                    stroke="white"
                    strokeWidth={isHovered ? 0.2 : 0.05}
                    filter="url(#nodeGlow)"
                    className="transition-all duration-300"
                  />
                  
                  {/* Label */}
                  {(size > 4 || isHovered || transform.k > 2) && (
                    <text
                      y={size / 2 + 2}
                      textAnchor="middle"
                      fill={isHovered ? 'white' : '#94a3b8'}
                      fontSize={Math.max(1, 4 / Math.sqrt(transform.k))} 
                      className="pointer-events-none select-none"
                      style={{ textShadow: '0 1px 2px rgba(0,0,0,0.8)' }}
                    >
                      {node.name}
                    </text>
                  )}
                </g>
              );
            })}
          </g>
        </g>
      </svg>
    </div>
  );
};

export default NetworkGraph;
