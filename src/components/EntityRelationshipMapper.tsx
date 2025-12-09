import React, { useState, useEffect, useRef, useMemo } from 'react';
import * as d3Selection from 'd3-selection';
import * as d3Scale from 'd3-scale';
import { ZoomIn, ZoomOut, RefreshCw, Maximize, Filter } from 'lucide-react';

export interface Entity {
  id: string;
  type: 'person' | 'organization' | 'location' | 'document' | 'communication' | 'financial';
  label: string;
  properties: Record<string, any>;
  confidence: number;
  sources: string[];
  x?: number;
  y?: number;
  vx?: number;
  vy?: number;
}

export interface Relationship {
  id: string;
  from: string;
  to: string;
  type: string;
  strength: number;
  confidence: number;
  evidence: string[];
  properties: Record<string, any>;
}

interface EntityRelationshipMapperProps {
  entities: Entity[];
  relationships: Relationship[];
  onEntitySelect?: (entity: Entity) => void;
  onRelationshipSelect?: (relationship: Relationship) => void;
}

export const EntityRelationshipMapper: React.FC<EntityRelationshipMapperProps> = ({
  entities,
  relationships,
  onEntitySelect,
  onRelationshipSelect
}) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [selectedEntity, setSelectedEntity] = useState<Entity | null>(null);
  const [transform, setTransform] = useState({ x: 0, y: 0, k: 1 });
  const [simulationRunning, setSimulationRunning] = useState(true);
  const [exporting, setExporting] = useState(false);

  // Memoize nodes with positions
  const nodes = useMemo(() => {
    return entities.map(e => ({
      ...e,
      x: e.x ?? Math.random() * 800,
      y: e.y ?? Math.random() * 600,
      vx: 0,
      vy: 0
    }));
  }, [entities]);

  // Memoize links
  const links = useMemo(() => {
    return relationships.map(r => ({ ...r }));
  }, [relationships]);

  // Memoize link colors to avoid recomputing on every render
  const getLinkColor = useMemo(() => {
    return (d: Relationship) => {
      const risk = typeof d.properties?.riskScore === 'number' ? d.properties.riskScore : undefined
      if (risk === undefined) return '#475569'
      if (risk >= 8) return '#ef4444'
      if (risk >= 5) return '#f59e0b'
      if (risk >= 3) return '#eab308'
      return '#10b981'
    };
  }, []);

  // Memoize node colors to avoid recomputing on every render
  const getNodeColor = useMemo(() => {
    return (type: string) => {
      switch (type) {
        case 'person': return '#3b82f6';
        case 'organization': return '#8b5cf6';
        case 'location': return '#06b6d4';
        case 'document': return '#10b981';
        default: return '#64748b';
      }
    };
  }, []);

  // Custom simple force simulation since d3-force is not available
  useEffect(() => {
    if (!simulationRunning) return;

    const width = containerRef.current?.clientWidth || 800;
    const height = containerRef.current?.clientHeight || 600;
    const center = { x: width / 2, y: height / 2 };

    let animationFrameId: number;

    const tick = () => {
      // 1. Repulsion (Nodes push each other away)
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const dx = nodes[i].x! - nodes[j].x!;
          const dy = nodes[i].y! - nodes[j].y!;
          const distSq = dx * dx + dy * dy || 1;
          const force = 5000 / distSq; // Repulsion strength
          
          if (distSq < 40000) { // Only calculate for nearby nodes
            const fx = (dx / Math.sqrt(distSq)) * force;
            const fy = (dy / Math.sqrt(distSq)) * force;
            
            nodes[i].vx! += fx * 0.05;
            nodes[i].vy! += fy * 0.05;
            nodes[j].vx! -= fx * 0.05;
            nodes[j].vy! -= fy * 0.05;
          }
        }
      }

      // 2. Attraction (Links pull connected nodes together)
      links.forEach(link => {
        const source = nodes.find(n => n.id === link.from);
        const target = nodes.find(n => n.id === link.to);
        
        if (source && target) {
          const dx = target.x! - source.x!;
          const dy = target.y! - source.y!;
          const dist = Math.sqrt(dx * dx + dy * dy) || 1;
          const targetDist = 100; // Desired link length
          
          const force = (dist - targetDist) * 0.05; // Spring constant
          
          const fx = (dx / dist) * force;
          const fy = (dy / dist) * force;
          
          source.vx! += fx;
          source.vy! += fy;
          target.vx! -= fx;
          target.vy! -= fy;
        }
      });

      // 3. Center Gravity (Pull everything to center)
      nodes.forEach(node => {
        node.vx! += (center.x - node.x!) * 0.005;
        node.vy! += (center.y - node.y!) * 0.005;
        
        // Apply velocity
        node.x! += node.vx!;
        node.y! += node.vy!;
        
        // Damping
        node.vx! *= 0.9;
        node.vy! *= 0.9;
      });

      // Update DOM directly for performance
      const svg = d3Selection.select(svgRef.current);
      
      svg.selectAll('.node-group')
        .attr('transform', (d: any) => `translate(${d.x},${d.y})`);
        
      svg.selectAll('.link')
        .attr('x1', (d: any) => {
          const source = nodes.find(n => n.id === d.from);
          return source ? source.x : 0;
        })
        .attr('y1', (d: any) => {
          const source = nodes.find(n => n.id === d.from);
          return source ? source.y : 0;
        })
        .attr('x2', (d: any) => {
          const target = nodes.find(n => n.id === d.to);
          return target ? target.x : 0;
        })
        .attr('y2', (d: any) => {
          const target = nodes.find(n => n.id === d.to);
          return target ? target.y : 0;
        });

      animationFrameId = requestAnimationFrame(tick);
    };

    tick();

    // Stop simulation after 5 seconds to save resources
    const timeout = setTimeout(() => {
      cancelAnimationFrame(animationFrameId);
      setSimulationRunning(false);
    }, 5000);

    return () => {
      cancelAnimationFrame(animationFrameId);
      clearTimeout(timeout);
    };
  }, [nodes, links, simulationRunning]);

  // Handle node click
  const handleNodeClick = (entity: Entity) => {
    setSelectedEntity(entity);
    if (onEntitySelect) {
      onEntitySelect(entity);
    }
  };

  // Initial Render
  useEffect(() => {
    if (!svgRef.current) return;
    
    const svg = d3Selection.select(svgRef.current);
    svg.selectAll('*').remove(); // Clear previous

    const g = svg.append('g')
      .attr('class', 'zoom-layer')
      .attr('transform', `translate(${transform.x},${transform.y}) scale(${transform.k})`);

    // Draw Links
    g.selectAll('.link')
      .data(links)
      .enter()
      .append('line')
      .attr('class', 'link')
      .attr('stroke', (d: Relationship) => getLinkColor(d))
      .attr('stroke-width', (d: Relationship) => Math.sqrt(d.strength || 1))
      .attr('opacity', 0.6);

    // Draw Nodes
    const nodeGroups = g.selectAll('.node-group')
      .data(nodes)
      .enter()
      .append('g')
      .attr('class', 'node-group')
      .attr('cursor', 'pointer')
      .on('click', (event: any, d: Entity) => {
        event.stopPropagation();
        handleNodeClick(d);
      });

    // Node Circles
    nodeGroups.append('circle')
      .attr('r', (d: Entity) => d.type === 'person' ? 15 : 10)
      .attr('fill', (d: Entity) => getNodeColor(d.type))
      .attr('stroke', '#fff')
      .attr('stroke-width', 2);

    // Node Labels
    nodeGroups.append('text')
      .text((d: Entity) => d.label)
      .attr('dy', 25)
      .attr('text-anchor', 'middle')
      .attr('fill', '#cbd5e1')
      .attr('font-size', '10px')
      .style('pointer-events', 'none');

  }, [nodes, links]); // Re-render when data changes (positions handled by tick)

  // Update transform
  useEffect(() => {
    if (!svgRef.current) return;
    const svg = d3Selection.select(svgRef.current);
    svg.select('.zoom-layer')
      .attr('transform', `translate(${transform.x},${transform.y}) scale(${transform.k})`);
  }, [transform]);

  // Handle zoom
  const handleZoom = (delta: number) => {
    setTransform(prev => ({
      ...prev,
      k: Math.max(0.1, Math.min(5, prev.k + delta * 0.1))
    }));
  };

  // Handle pan
  const handlePan = (dx: number, dy: number) => {
    setTransform(prev => ({
      ...prev,
      x: prev.x + dx,
      y: prev.y + dy
    }));
  };

  // Export as PNG
  const exportAsPNG = async () => {
    if (!containerRef.current) return;
    
    setExporting(true);
    try {
      // Implementation would go here
      console.log('Exporting as PNG...');
    } catch (error) {
      console.error('Error exporting as PNG:', error);
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold text-white">Entity Relationship Map</h2>
        <div className="flex space-x-2">
          <button 
            onClick={() => handleZoom(1)}
            className="px-3 py-1 bg-slate-700 text-white rounded hover:bg-slate-600 transition-colors"
            aria-label="Zoom in"
          >
            +
          </button>
          <button 
            onClick={() => handleZoom(-1)}
            className="px-3 py-1 bg-slate-700 text-white rounded hover:bg-slate-600 transition-colors"
            aria-label="Zoom out"
          >
            -
          </button>
          <button 
            onClick={exportAsPNG}
            disabled={exporting}
            className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {exporting ? 'Exporting...' : 'Export PNG'}
          </button>
        </div>
      </div>
      
      <div 
        ref={containerRef}
        className="w-full h-[600px] bg-slate-900 rounded-lg border border-slate-700 overflow-hidden relative"
        onMouseDown={(e) => {
          const startX = e.clientX;
          const startY = e.clientY;
          const startTransform = { ...transform };
          
          const handleMouseMove = (moveEvent: MouseEvent) => {
            const dx = moveEvent.clientX - startX;
            const dy = moveEvent.clientY - startY;
            handlePan(dx, dy);
          };
          
          const handleMouseUp = () => {
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
          };
          
          document.addEventListener('mousemove', handleMouseMove);
          document.addEventListener('mouseup', handleMouseUp);
        }}
      >
        <svg 
          ref={svgRef}
          className="w-full h-full"
          viewBox="0 0 800 600"
        />
        
        {simulationRunning && (
          <div className="absolute top-4 left-4 bg-slate-800/80 text-white px-3 py-1 rounded text-sm">
            Simulating...
          </div>
        )}
      </div>
      
      {selectedEntity && (
        <div className="bg-slate-800 p-4 rounded-lg border border-slate-700">
          <h3 className="text-lg font-bold text-white mb-2">{selectedEntity.label}</h3>
          <p className="text-slate-300">Type: {selectedEntity.type}</p>
          {selectedEntity.properties && (
            <div className="mt-2">
              {Object.entries(selectedEntity.properties).map(([key, value]) => (
                <p key={key} className="text-slate-400 text-sm">
                  <span className="font-medium">{key}:</span> {String(value)}
                </p>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default EntityRelationshipMapper;