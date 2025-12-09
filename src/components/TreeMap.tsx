import React, { useState } from 'react';
import { Person } from '../types';

interface TreeMapProps {
  people: Person[];
  onPersonClick?: (person: Person) => void;
}

interface TreeMapNode {
  name: string;
  value: number;
  redFlagRating: number;
  person: Person;
}

export const TreeMap: React.FC<TreeMapProps> = ({ people, onPersonClick }) => {
  const [hoveredNode, setHoveredNode] = useState<TreeMapNode | null>(null);

  // Prepare data - top 50 entities by mentions
  const nodes: TreeMapNode[] = people
    .sort((a, b) => (b.mentions || 0) - (a.mentions || 0))
    .slice(0, 50)
    .map(p => ({
      name: p.name,
      value: p.mentions || 0,
      redFlagRating: p.red_flag_rating !== undefined ? p.red_flag_rating : 0,
      person: p
    }));

  // Calculate total for percentage
  const total = nodes.reduce((sum, node) => sum + node.value, 0);

  // Simple squarified treemap layout
  const layout = squarify(nodes, 800, 600);

  // Color based on Red Flag rating
  const getColor = (rating: number) => {
    if (rating >= 5) return 'from-pink-600 to-red-600';
    if (rating >= 4) return 'from-purple-600 to-pink-600';
    if (rating >= 3) return 'from-blue-600 to-purple-600';
    if (rating >= 2) return 'from-cyan-600 to-blue-600';
    if (rating >= 1) return 'from-teal-600 to-cyan-600';
    return 'from-slate-600 to-slate-500';
  };

  return (
    <div className="relative w-full h-[600px] bg-slate-900/50 rounded-xl border border-slate-700 overflow-hidden">
      <svg width="100%" height="100%" viewBox="0 0 800 600" className="w-full h-full">
        {layout.map((node, index) => {
          const isHovered = hoveredNode?.name === node.name;
          const percentage = ((node.value / total) * 100).toFixed(1);
          
          return (
            <g
              key={index}
              onMouseEnter={() => setHoveredNode(node)}
              onMouseLeave={() => setHoveredNode(null)}
              onClick={() => onPersonClick?.(node.person)}
              className="cursor-pointer transition-all duration-200"
              style={{ opacity: hoveredNode && !isHovered ? 0.6 : 1 }}
            >
              {/* Background rect with gradient */}
              <defs>
                <linearGradient id={`gradient-${index}`} x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" className={getColor(node.redFlagRating).split(' ')[0].replace('from-', '')} />
                  <stop offset="100%" className={getColor(node.redFlagRating).split(' ')[1].replace('to-', '')} />
                </linearGradient>
              </defs>
              
              <rect
                x={node.x}
                y={node.y}
                width={node.width}
                height={node.height}
                className={`bg-gradient-to-br ${getColor(node.redFlagRating)}`}
                fill={`url(#gradient-${index})`}
                stroke="#1e293b"
                strokeWidth={isHovered ? 3 : 1}
                rx={4}
                style={{
                  transition: 'all 0.2s ease',
                  transform: isHovered ? 'scale(1.02)' : 'scale(1)',
                  transformOrigin: `${node.x + node.width / 2}px ${node.y + node.height / 2}px`
                }}
              />
              
              {/* Text - only show if box is large enough */}
              {node.width > 60 && node.height > 40 && (
                <>
                  <text
                    x={node.x + node.width / 2}
                    y={node.y + node.height / 2 - 8}
                    textAnchor="middle"
                    className="fill-white font-semibold text-xs pointer-events-none"
                    style={{ fontSize: Math.min(12, node.width / 8) }}
                  >
                    {node.name.length > 20 ? node.name.substring(0, 18) + '...' : node.name}
                  </text>
                  <text
                    x={node.x + node.width / 2}
                    y={node.y + node.height / 2 + 8}
                    textAnchor="middle"
                    className="fill-white/80 text-xs pointer-events-none"
                    style={{ fontSize: Math.min(10, node.width / 10) }}
                  >
                    {node.value.toLocaleString()} ({percentage}%)
                  </text>
                  <text
                    x={node.x + node.width / 2}
                    y={node.y + node.height / 2 + 22}
                    textAnchor="middle"
                    className="fill-white/60 text-xs pointer-events-none"
                    style={{ fontSize: Math.min(9, node.width / 12) }}
                  >
                    {'🚩'.repeat(node.redFlagRating)}
                  </text>
                </>
              )}
            </g>
          );
        })}
      </svg>

      {/* Hover tooltip */}
      {hoveredNode && (
        <div className="absolute top-4 right-4 bg-slate-900/95 backdrop-blur-sm border border-slate-700 rounded-lg p-4 shadow-xl max-w-xs z-10">
          <h4 className="text-white font-bold text-sm mb-2">{hoveredNode.name}</h4>
          <div className="space-y-1 text-xs">
            <div className="flex justify-between">
              <span className="text-slate-400">Mentions:</span>
              <span className="text-white font-mono">{hoveredNode.value.toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Percentage:</span>
              <span className="text-white font-mono">{((hoveredNode.value / total) * 100).toFixed(2)}%</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Red Flag Index:</span>
              <span className="text-white">{hoveredNode.redFlagRating}/5 {'🚩'.repeat(hoveredNode.redFlagRating)}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Simple squarified treemap algorithm
function squarify(nodes: TreeMapNode[], width: number, height: number) {
  const result: Array<TreeMapNode & { x: number; y: number; width: number; height: number }> = [];
  
  // Sort by value descending
  const sorted = [...nodes].sort((a, b) => b.value - a.value);
  
  let x = 0;
  let y = 0;
  let rowHeight = 0;
  let rowWidth = 0;
  const totalValue = sorted.reduce((sum, node) => sum + node.value, 0);
  
  sorted.forEach((node, index) => {
    const area = (node.value / totalValue) * (width * height);
    const nodeWidth = Math.sqrt(area * (width / height));
    const nodeHeight = area / nodeWidth;
    
    // Simple row-based layout
    if (x + nodeWidth > width) {
      x = 0;
      y += rowHeight;
      rowHeight = 0;
    }
    
    result.push({
      ...node,
      x,
      y,
      width: Math.min(nodeWidth, width - x),
      height: nodeHeight
    });
    
    x += nodeWidth;
    rowHeight = Math.max(rowHeight, nodeHeight);
  });
  
  return result;
}
