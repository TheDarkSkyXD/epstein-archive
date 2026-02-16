import React, { useEffect, useState, useMemo } from 'react';
import EntityRelationshipMapper, { Entity, Relationship } from './EntityRelationshipMapper';

interface EntityGraphPanelProps {
  entityId: string | number;
}

interface GraphNode {
  id: number;
  label: string;
  type?: string;
}

interface GraphEdge {
  source_id: number;
  target_id: number;
  relationship_type: string;
  proximity_score: number;
  confidence: number;
}

export const EntityGraphPanel: React.FC<EntityGraphPanelProps> = ({ entityId }) => {
  const [nodes, setNodes] = useState<GraphNode[]>([]);
  const [edges, setEdges] = useState<GraphEdge[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchGraph = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/entities/${entityId}/graph`);
        if (!res.ok) {
          throw new Error(`Graph request failed with status ${res.status}`);
        }
        const data = await res.json();
        setNodes(Array.isArray(data.nodes) ? data.nodes : []);
        setEdges(Array.isArray(data.edges) ? data.edges : []);
      } catch (e) {
        console.error('Failed to load entity graph:', e);
        setError(e instanceof Error ? e.message : 'Failed to load graph');
      } finally {
        setLoading(false);
      }
    };

    fetchGraph();
  }, [entityId]);

  const mapperEntities: Entity[] = useMemo(
    () =>
      nodes.map((n) => ({
        id: String(n.id),
        label: n.label,
        type: (n.type as Entity['type']) || 'person',
        properties: {},
        confidence: 1.0,
        sources: [],
      })),
    [nodes],
  );

  const mapperRelationships: Relationship[] = useMemo(
    () =>
      edges.map((e, idx) => ({
        id: `edge-${idx}-${e.source_id}-${e.target_id}`,
        from: String(e.source_id),
        to: String(e.target_id),
        type: e.relationship_type || 'related_to',
        strength: e.proximity_score ?? 1,
        confidence: e.confidence ?? 1,
        evidence: [],
        properties: {},
      })),
    [edges],
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-sm text-slate-500">Loading entity graph333</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg p-4">
        Failed to load graph: {error}
      </div>
    );
  }

  if (!mapperEntities.length || !mapperRelationships.length) {
    return (
      <div className="bg-slate-900 border border-slate-800 rounded-lg p-4 text-sm text-slate-400">
        No graph data available yet for this entity.
      </div>
    );
  }

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-lg p-4">
      <EntityRelationshipMapper entities={mapperEntities} relationships={mapperRelationships} />
    </div>
  );
};

export default EntityGraphPanel;
