import React, { useEffect, useState, useMemo } from 'react';
import EntityRelationshipMapper, { Entity, Relationship } from './EntityRelationshipMapper';
import { GraphService } from '../../services/GraphService';

interface EntityGraphPanelProps {
  entityId: string | number;
}

export const EntityGraphPanel: React.FC<EntityGraphPanelProps> = ({ entityId }) => {
  const [nodes, setNodes] = useState<any[]>([]);
  const [edges, setEdges] = useState<any[]>([]);
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

  const mapperEntities: Entity[] = useMemo(() => {
    // 1. Normalize
    const rawNodes = nodes.map((n) => GraphService.normalizeNode(n));

    // 2. Dedup (Merge by Label)
    const uniqueNodes = GraphService.deduplicateNodes(rawNodes, String(entityId));

    // 3. Map to Mapper Entity Interface
    return uniqueNodes.map((n) => ({
      id: n.id,
      label: n.label,
      type: n.type,
      properties: { riskScore: n.risk },
      confidence: 1.0,
      sources: [],
      isEgo: n.id === String(entityId),
      // Pass style hints if needed
    }));
  }, [nodes, entityId]);

  const mapperRelationships: Relationship[] = useMemo(() => {
    // 1. Remap Edges to Deduped IDs
    // We need to pass the *processed* nodes to ensuring mapping alignment
    // But GraphService.remapEdges expects the generic GraphNode
    // Let's reconstruct the GraphNode context or pass mapperEntities if compatible.
    // Actually, GraphService.remapEdges takes `GraphNode[]`.
    // mapperEntities is `Entity[]` which is compatiable-ish but let's be safe.

    const contextNodes = mapperEntities.map(
      (e) =>
        ({
          id: e.id,
          label: e.label,
          type: e.type,
          risk: e.properties.riskScore,
        }) as any,
    );

    const remapped = GraphService.remapEdges(edges, contextNodes);

    // 2. Map to Mapper Relationship Interface
    return remapped.map((e, _idx) => ({
      id: e.id,
      from: e.source,
      to: e.target,
      type: e.type,
      strength: GraphService.calculateEdgeWeight(e.weight, e.confidence, e.docCount),
      confidence: e.confidence,
      evidence: [],
      properties: { docCount: e.docCount },
    }));
  }, [edges, mapperEntities]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-sm text-slate-500">Loading entity graph...</div>
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
