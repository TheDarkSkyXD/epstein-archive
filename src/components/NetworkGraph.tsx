import React, { useMemo, useState, useRef, useEffect, useCallback } from 'react';
import { ZoomIn, ZoomOut, Move, RefreshCw, Filter, AlertTriangle, Link2 } from 'lucide-react';

interface EntityNode {
  id: number;
  name: string;
  role?: string;
  type?: string;
  riskLevel?: number;
  connectionCount: number;
  mentions?: number;
  photoUrl?: string;
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
  onFilterUpdate?: (stats: { visible: number; total: number; label: string }) => void;
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
  const minSize = 3;
  const maxSize = 12;
  const ratio = connectionCount / Math.max(maxConnections, 1);
  return minSize + (maxSize - minSize) * Math.sqrt(ratio);
};

// Simple collision resolution for main thread (small datasets)
const applyCollisionResolution = (nodes: GraphNode[], draggedNode: number | null): GraphNode[] => {
  const newNodes = nodes.map((n) => ({ ...n }));

  for (let i = 0; i < newNodes.length; i++) {
    const node = newNodes[i];
    if (node.id === draggedNode) continue;

    for (let j = 0; j < newNodes.length; j++) {
      if (i === j) continue;
      const other = newNodes[j];
      const dx = node.x - other.x;
      const dy = node.y - other.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const minDist = (node.radius / 2 + other.radius / 2) * 1.5;

      if (dist < minDist && dist > 0) {
        const overlap = minDist - dist;
        const moveX = (dx / dist) * overlap * 0.1;
        const moveY = (dy / dist) * overlap * 0.1;

        node.x += moveX;
        node.y += moveY;
      }
    }
  }
  return newNodes;
};

export const NetworkGraph: React.FC<NetworkGraphProps> = ({
  entities,
  relationships,
  onEntityClick,
  maxNodes = 600,
  onFilterUpdate,
}) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const [nodes, setNodes] = useState<GraphNode[]>([]);
  const [transform, setTransform] = useState({ x: 0, y: 0, k: 0.8 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState<Point>({ x: 0, y: 0 });
  const [draggedNode, setDraggedNode] = useState<number | null>(null);
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);
  const [modifierKeyPressed, setModifierKeyPressed] = useState(false);
  const [spacePressed, setSpacePressed] = useState(false);
  const [totalDragDistance, setTotalDragDistance] = useState(0);
  const workerRef = useRef<Worker | null>(null);
  const useWorkerRef = useRef(false);

  // Filter state
  const [minSeverity, setMinSeverity] = useState(0);
  const [minConnections, setMinConnections] = useState(0);
  const [showFilters, setShowFilters] = useState(false);
  const [hasInteractedWithFilter, setHasInteractedWithFilter] = useState(false);

  // Track modifier keys (Shift or Alt for forced node dragging)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.shiftKey || e.altKey) setModifierKeyPressed(true);
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      if (!e.shiftKey && !e.altKey) setModifierKeyPressed(false);
    };
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  // Compute max values for sliders
  const maxSeverityInData = useMemo(
    () => Math.max(1, ...entities.map((e) => e.riskLevel || 0)),
    [entities],
  );
  const maxConnectionsInData = useMemo(
    () => Math.max(1, ...entities.map((e) => e.connectionCount)),
    [entities],
  );

  // Initialize nodes with Spiral Layout
  useEffect(() => {
    const topEntities = entities.slice(0, maxNodes);

    const goldenAngle = Math.PI * (3 - Math.sqrt(5));
    const count = topEntities.length;
    const rStep = count > 100 ? 4 : 6;

    const initialNodes = topEntities.map((entity, index) => {
      const r = rStep * Math.sqrt(index + 2);
      const theta = index * goldenAngle;

      const x = 50 + r * Math.cos(theta);
      const y = 50 + r * Math.sin(theta);

      const maxConn = Math.max(1, ...topEntities.map((n) => n.connectionCount));
      const size = getNodeSize(entity.connectionCount, maxConn);

      return {
        ...entity,
        x,
        y,
        vx: 0,
        vy: 0,
        radius: size,
      };
    });
    setNodes(initialNodes);
    useWorkerRef.current = initialNodes.length > 40;
  }, [entities, maxNodes]);

  // Filtered nodes based on sliders
  const filteredNodes = useMemo(() => {
    return nodes.filter(
      (n) => (n.riskLevel || 0) >= minSeverity && n.connectionCount >= minConnections,
    );
  }, [nodes, minSeverity, minConnections]);

  // Update parent with filter stats
  useEffect(() => {
    if (onFilterUpdate) {
      const total = nodes.length;
      const visible = filteredNodes.length;
      let label = `Showing ${visible} of ${total} Nodes`;

      if (minSeverity > 0) label += ` • Min Severity: ${minSeverity}`;
      if (minConnections > 0) label += ` • Min Conn: ${minConnections}`;

      onFilterUpdate({ visible, total, label });
    }
  }, [filteredNodes.length, nodes.length, minSeverity, minConnections, onFilterUpdate]);

  // Links data
  const links = useMemo(() => {
    if (filteredNodes.length === 0) return [];

    const nodeMap = new Map(filteredNodes.map((n) => [n.name, n]));

    // Normalize weights if available, otherwise default
    const maxWeight = Math.max(1, ...relationships.map((r) => r.weight || 1));

    return relationships
      .filter((r) => nodeMap.has(r.source) && nodeMap.has(r.target))
      .map((r) => ({
        source: nodeMap.get(r.source)!,
        target: nodeMap.get(r.target)!,
        type: r.type,
        weight: r.weight || 1,
        normalizedWeight: (r.weight || 1) / maxWeight,
      }))
      .slice(0, 500);
  }, [filteredNodes, relationships]);

  // Physics simulation
  useEffect(() => {
    if (nodes.length === 0) return;

    if (useWorkerRef.current && typeof Worker !== 'undefined') {
      try {
        workerRef.current = new Worker(
          new URL('../workers/networkGraph.worker.ts', import.meta.url),
          { type: 'module' },
        );

        workerRef.current.onmessage = (e) => {
          if (e.data.type === 'nodes' && e.data.nodes) {
            setNodes(e.data.nodes);
          }
        };

        workerRef.current.postMessage({ type: 'init', nodes });

        return () => {
          workerRef.current?.postMessage({ type: 'stop' });
          workerRef.current?.terminate();
          workerRef.current = null;
        };
      } catch (e) {
        console.warn('Web Worker failed, using main thread:', e);
        useWorkerRef.current = false;
      }
    }

    let tickCount = 0;
    const maxTicks = 60;

    const tick = () => {
      if (tickCount >= maxTicks) return;
      setNodes((prevNodes) => applyCollisionResolution(prevNodes, draggedNode));
      tickCount++;
    };

    const interval = setInterval(tick, 33);
    const timeout = setTimeout(() => clearInterval(interval), 2000);

    return () => {
      clearInterval(interval);
      clearTimeout(timeout);
    };
  }, [nodes.length, draggedNode]);

  // Update worker when node is dragged
  useEffect(() => {
    if (workerRef.current && draggedNode !== null) {
      const node = nodes.find((n) => n.id === draggedNode);
      if (node) {
        workerRef.current.postMessage({
          type: 'updateNode',
          nodeUpdate: { id: node.id, x: node.x, y: node.y },
          draggedNodeId: draggedNode,
        });
      }
    }
  }, [draggedNode, nodes]);

  // Find nearest node to a point (for modifier key drag)
  const findNearestNode = useCallback(
    (clientX: number, clientY: number): GraphNode | null => {
      if (!svgRef.current || filteredNodes.length === 0) return null;

      const rect = svgRef.current.getBoundingClientRect();
      const svgX = (((clientX - rect.left) / rect.width) * 100 - transform.x) / transform.k;
      const svgY = (((clientY - rect.top) / rect.height) * 100 - transform.y) / transform.k;

      let nearest: GraphNode | null = null;
      let minDist = Infinity;

      for (const node of filteredNodes) {
        const dx = node.x - svgX;
        const dy = node.y - svgY;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < minDist) {
          minDist = dist;
          nearest = node;
        }
      }

      return nearest;
    },
    [filteredNodes, transform],
  );

  // Pan/Zoom handlers
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    if (!svgRef.current) return;

    const scaleFactor = 1.1;
    const direction = e.deltaY < 0 ? 1 : -1;
    const factor = direction > 0 ? scaleFactor : 1 / scaleFactor;

    const newK = Math.max(0.2, Math.min(5, transform.k * factor));

    const rect = svgRef.current.getBoundingClientRect();
    const relX = ((e.clientX - rect.left) / rect.width) * 100;
    const relY = ((e.clientY - rect.top) / rect.height) * 100;

    const newX = relX - (relX - transform.x) * (newK / transform.k);
    const newY = relY - (relY - transform.y) * (newK / transform.k);

    setTransform({ x: newX, y: newY, k: newK });
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return;

    setTotalDragDistance(0);

    // Space key = Pan mode
    if (spacePressed) {
      setIsDragging(true);
      setDragStart({ x: e.clientX, y: e.clientY });
      return;
    }

    // Modifier key = Drag node mode
    if (modifierKeyPressed) {
      const nearest = findNearestNode(e.clientX, e.clientY);
      if (nearest) {
        setDraggedNode(nearest.id);
        setDragStart({ x: e.clientX, y: e.clientY });
        return;
      }
    }

    // Default - start pan, but check for node click later
    setIsDragging(true);
    setDragStart({ x: e.clientX, y: e.clientY });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (draggedNode !== null) {
      const dx = (e.clientX - dragStart.x) / transform.k;
      const dy = (e.clientY - dragStart.y) / transform.k;

      const svgWidth = svgRef.current?.getBoundingClientRect().width || 1;
      const scaleToUnits = 100 / svgWidth;

      // Accumulate drag distance
      setTotalDragDistance((prev) => prev + Math.abs(dx) + Math.abs(dy));

      setNodes((prev) =>
        prev.map((n) => {
          if (n.id === draggedNode) {
            return {
              ...n,
              x: n.x + dx * scaleToUnits,
              y: n.y + dy * scaleToUnits,
            };
          }
          return n;
        }),
      );
      setDragStart({ x: e.clientX, y: e.clientY });
    } else if (isDragging) {
      const svgWidth = svgRef.current?.getBoundingClientRect().width || 1;
      const scaleToUnits = 100 / svgWidth;

      const dx = (e.clientX - dragStart.x) * scaleToUnits;
      const dy = (e.clientY - dragStart.y) * scaleToUnits;

      setTransform((prev) => ({ ...prev, x: prev.x + dx, y: prev.y + dy }));
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
  const zoomOut = () => zoomFromCenter(1 / 1.2);
  const resetView = () => setTransform({ x: 0, y: 0, k: 1 });

  return (
    <div
      className={`relative w-full h-[600px] bg-slate-900/50 rounded-xl border border-slate-700/50 overflow-hidden select-none ${spacePressed ? 'cursor-grab active:cursor-grabbing' : ''}`}
    >
      {/* Controls */}
      <div className="absolute top-4 right-4 z-20 flex flex-col gap-2">
        <button
          onClick={zoomIn}
          className="p-2 bg-slate-800 hover:bg-slate-700 rounded-lg border border-slate-700 text-slate-300"
        >
          <ZoomIn className="w-5 h-5" />
        </button>
        <button
          onClick={zoomOut}
          className="p-2 bg-slate-800 hover:bg-slate-700 rounded-lg border border-slate-700 text-slate-300"
        >
          <ZoomOut className="w-5 h-5" />
        </button>
        <button
          onClick={resetView}
          className="p-2 bg-slate-800 hover:bg-slate-700 rounded-lg border border-slate-700 text-slate-300"
        >
          <RefreshCw className="w-5 h-5" />
        </button>
        <button
          onClick={() => {
            setShowFilters(!showFilters);
            setHasInteractedWithFilter(true);
          }}
          className={`p-2 rounded-lg border text-slate-300 relative ${showFilters ? 'bg-cyan-700 border-cyan-600' : 'bg-slate-800 hover:bg-slate-700 border-slate-700'}`}
        >
          <Filter className="w-5 h-5" />
          {!hasInteractedWithFilter && !showFilters && (
            <span className="absolute -top-1 -right-1 w-3 h-3 bg-cyan-500 rounded-full animate-ping" />
          )}
          {!hasInteractedWithFilter && !showFilters && (
            <span className="absolute -top-1 -right-1 w-3 h-3 bg-cyan-500 rounded-full" />
          )}
        </button>
      </div>

      {/* Filter Panel */}
      {showFilters && (
        <div className="absolute top-4 right-16 z-20 bg-slate-800/95 backdrop-blur-sm rounded-lg p-4 border border-slate-700/50 shadow-xl w-64">
          <p className="text-xs text-slate-400 mb-3 font-bold uppercase tracking-wider flex items-center gap-2">
            <Filter className="w-3 h-3" /> Node Filters
          </p>

          <div className="space-y-4">
            {/* Severity Filter */}
            <div>
              <label className="flex items-center gap-2 text-xs text-slate-300 mb-2">
                <AlertTriangle className="w-3 h-3 text-amber-400" />
                Min Severity: {minSeverity}
              </label>
              <input
                type="range"
                min={0}
                max={maxSeverityInData}
                value={minSeverity}
                onChange={(e) => setMinSeverity(parseInt(e.target.value))}
                className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-amber-500"
              />
              <div className="flex justify-between text-[10px] text-slate-500 mt-1">
                <span>All</span>
                <span>{maxSeverityInData}</span>
              </div>
            </div>

            {/* Connections Filter */}
            <div>
              <label className="flex items-center gap-2 text-xs text-slate-300 mb-2">
                <Link2 className="w-3 h-3 text-cyan-400" />
                Min Connections: {minConnections}
              </label>
              <input
                type="range"
                min={0}
                max={Math.min(50, maxConnectionsInData)}
                value={minConnections}
                onChange={(e) => setMinConnections(parseInt(e.target.value))}
                className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-cyan-500"
              />
              <div className="flex justify-between text-[10px] text-slate-500 mt-1">
                <span>All</span>
                <span>{Math.min(50, maxConnectionsInData)}+</span>
              </div>
            </div>

            {/* Stats */}
            <div className="pt-2 border-t border-slate-700/50 text-xs text-slate-400">
              Showing {filteredNodes.length} of {nodes.length} nodes
            </div>
          </div>
        </div>
      )}

      {/* Legend */}
      <div className="absolute top-4 left-4 z-20 bg-slate-800/90 backdrop-blur-sm rounded-lg p-4 border border-slate-700/50 shadow-xl pointer-events-none sm:pointer-events-auto opacity-80 sm:opacity-100 hover:opacity-100 transition-opacity">
        <p className="text-xs text-slate-400 mb-3 font-bold uppercase tracking-wider">
          Risk Levels
        </p>
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
          <div className="flex items-center gap-2 text-xs text-cyan-400 mt-1">
            <span className="text-[10px] bg-slate-700 px-1 rounded">Shift</span>
            <span>+ Drag = Force Move Nearest</span>
          </div>
        </div>
      </div>

      {/* Graph Area */}
      <svg
        ref={svgRef}
        viewBox="0 0 100 100"
        className={`w-full h-full ${modifierKeyPressed ? 'cursor-crosshair' : 'cursor-move'}`}
        style={{
          background:
            'radial-gradient(circle at 50% 50%, rgba(15, 23, 42, 0.5) 0%, rgba(2, 6, 23, 0.8) 100%)',
        }}
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        <defs>
          <filter id="nodeGlow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="0.5" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          {filteredNodes
            .filter((n) => n.photoUrl)
            .map((n) => (
              <pattern
                key={`photo-${n.id}`}
                id={`photo-${n.id}`}
                x="0"
                y="0"
                height="1"
                width="1"
                viewBox="0 0 100 100"
                preserveAspectRatio="xMidYMid slice"
              >
                <image
                  href={n.photoUrl}
                  x="0"
                  y="0"
                  width="100"
                  height="100"
                  preserveAspectRatio="xMidYMid slice"
                />
              </pattern>
            ))}
        </defs>

        <g transform={`translate(${transform.x}, ${transform.y}) scale(${transform.k})`}>
          {/* Links */}
          <g className="links">
            {links.map((link, i) => {
              const isHighlight =
                hoveredNode === link.source.name || hoveredNode === link.target.name;
              // Dynamic width based on weight (0.05 to 0.3 base)
              // @ts-ignore - normalizedWeight added in useMemo
              const weightBonus = (link.normalizedWeight || 0) * 0.15;
              const baseWidth = 0.05 + weightBonus;
              const highlightWidth = 0.3 + weightBonus;

              return (
                <line
                  key={i}
                  x1={link.source.x}
                  y1={link.source.y}
                  x2={link.target.x}
                  y2={link.target.y}
                  stroke={isHighlight ? '#bae6fd' : '#334155'}
                  strokeWidth={isHighlight ? highlightWidth : baseWidth}
                  strokeOpacity={isHighlight ? 0.8 : 0.2 + (link.normalizedWeight || 0) * 0.2}
                  className="transition-all duration-300"
                />
              );
            })}
          </g>

          {/* Nodes */}
          <g className="nodes">
            {filteredNodes.map((node) => {
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
                    // Only drag node if NOT panning with space
                    if (!spacePressed) {
                      setDraggedNode(node.id);
                      setDragStart({ x: e.clientX, y: e.clientY });
                      setTotalDragDistance(0);
                    }
                  }}
                  onClick={(e) => {
                    // Only trigger click if drag distance is small (was just a click)
                    if (totalDragDistance < 5) {
                      onEntityClick?.(node);
                    }
                  }}
                  className={`${spacePressed ? '' : 'cursor-pointer'}`}
                  style={{
                    transition:
                      isDragging && draggedNode === node.id ? 'none' : 'transform 0.1s ease-out',
                  }}
                >
                  {/* Outer Glow */}
                  <circle
                    r={(size / 2) * 2.5}
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

                  {/* Photo or Default Fill */}
                  {node.photoUrl ? (
                    <circle
                      r={size / 2}
                      fill={`url(#photo-${node.id})`}
                      className="pointer-events-none"
                    />
                  ) : null}

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
