import { Router } from 'express';
import { graphRateLimiter } from '../middleware/rateLimit.js';
import {
  getEdgeEvidenceDocuments,
  getEdgeRelationship,
  getGlobalGraphEdges,
  getGlobalGraphNodes,
  getGraphCommunities,
  getGraphNeighbors,
  getGraphPathEdges,
  getGraphPathNodes,
} from '../db/routesDb.js';

const router = Router();

/**
 * Global Graph Data Endpoint
 * Supports Zoom-based LOD fetching.
 * Query Params:
 * - limit: number (default 150, max 2000)
 * - minRisk: number (default 0)
 * - includeEvidence: boolean (default false)
 */
router.get('/global', graphRateLimiter, async (req, res, next) => {
  try {
    const rawLimit = req.query.limit ? parseInt(req.query.limit as string) : 150;
    if (rawLimit > 2000) {
      return res.status(400).json({ error: 'Max nodes limit exceeded (<= 2000 allowed)' });
    }
    const limit = Math.max(10, rawLimit);

    // Phase 6.5 Query Discipline: Hard Caps
    const minRisk = parseInt(req.query.minRisk as string) || 0;
    const mode = req.query.mode as string; // 'cluster' or 'default'
    const startDate = req.query.startDate as string;
    const endDate = req.query.endDate as string;

    console.time('graph-global-fetch');

    if (mode === 'cluster') {
      // Super Cluster Mode: Aggregated by Structural Community (LPA)
      const clusters = getGraphCommunities();

      // Enhance labels (optional)

      console.timeEnd('graph-global-fetch');
      return res.json({
        nodes: clusters.map((c: any) => ({
          id: c.id,
          label: `${c.label} (${c.size})`,
          type: 'cluster',
          risk: c.risk,
          connectionCount: c.size * 10, // Fake degree for visual size
          community: parseInt(c.id.split('-')[1]),
        })),
        edges: [], // No edges in cluster view for clarity
      });
    }

    if (mode === 'path') {
      const sourceId = String(req.query.sourceId);
      const targetId = String(req.query.targetId);

      console.time('path-search');

      // Weighted Dijkstra with Temporal Filtering
      const distances = new Map<string, number>();
      const previous = new Map<string, string | null>();
      const visited = new Set<string>();

      const pq: { id: string; dist: number }[] = [];

      distances.set(sourceId, 0);
      pq.push({ id: sourceId, dist: 0 });

      let found = false;
      const maxNodes = 5000;
      let nodesExplored = 0;

      while (pq.length > 0 && nodesExplored < maxNodes) {
        pq.sort((a, b) => a.dist - b.dist);
        const { id: curr, dist } = pq.shift()!;

        if (visited.has(curr)) continue;
        visited.add(curr);
        nodesExplored++;

        if (curr === targetId) {
          found = true;
          break;
        }

        const neighbors = getGraphNeighbors(curr, startDate, endDate);
        for (const n of neighbors) {
          const nid = String(n.canonical_id);
          const weight = n.weight || 0.1;
          const cost = 1.0 / weight;

          const newDist = dist + cost;
          if (!distances.has(nid) || newDist < distances.get(nid)!) {
            distances.set(nid, newDist);
            previous.set(nid, curr);
            pq.push({ id: nid, dist: newDist });
          }
        }
      }

      if (!found) {
        console.timeEnd('path-search');
        return res.json({ nodes: [], edges: [] });
      }

      const pathNodes = new Set<string>();
      let curr: string | null = targetId;
      while (curr) {
        pathNodes.add(curr);
        curr = previous.get(curr) || null;
      }

      const nodes = getGraphPathNodes(pathNodes);
      const edges = getGraphPathEdges(pathNodes, startDate, endDate);

      console.timeEnd('path-search');
      return res.json({
        nodes: nodes.map((n: any) => ({
          id: String(n.id),
          label: n.label,
          type: n.type,
          risk: n.risk,
          val: n.val,
          community: n.community,
        })),
        edges: edges.map((e: any) => ({
          source: String(e.source),
          target: String(e.target),
          type: e.type,
          weight: e.weight,
          confidence: e.confidence,
          classification: e.classification,
        })),
      });
    }

    // 1. Fetch Top Entities (Nodes) - Aggregated by Canonical ID
    // Deterministic Sort: Risk DESC, Degree DESC, ID ASC
    const nodesArr = getGlobalGraphNodes({ minRisk, limit, startDate, endDate });

    const canonicalIds = nodesArr.map((n: any) => n.id);

    // Quick exit if no nodes
    if (canonicalIds.length === 0) {
      return res.json({ nodes: [], edges: [] });
    }

    // 2. Fetch Relationships between these nodes — injection-safe ANY($N::bigint[]) binding
    const edgesArr = getGlobalGraphEdges({ canonicalIds, startDate, endDate });

    console.timeEnd('graph-global-fetch');

    // Return formatting aligned with GraphService
    res.json({
      nodes: nodesArr.map((n: any) => ({
        id: String(n.id),
        label: n.label,
        type: n.type || 'unknown',
        risk: n.risk || 0,
        connectionCount: n.connectionCount,
        community: n.community_id || 0,
      })),
      edges: edgesArr.map((e: any) => ({
        id: `${e.source}-${e.target}-${e.type}`,
        source: String(e.source),
        target: String(e.target),
        type: e.type,
        weight: e.weight || 0.1,
        confidence: e.confidence || 1.0,
        classification: e.classification,
      })),
    });
  } catch (error) {
    console.error('❌ Error fetching global graph:', error);
    next(error);
  }
});

/**
 * Get Evidence for an Edge
 */
router.get('/edge-evidence', async (req, res, next) => {
  try {
    const { sourceId, targetId } = req.query;
    if (!sourceId || !targetId) {
      return res.status(400).json({ error: 'sourceId and targetId are required' });
    }

    const docs = getEdgeEvidenceDocuments(String(sourceId), String(targetId));
    const rel = getEdgeRelationship(String(sourceId), String(targetId));

    const evidence = docs.map((d: any) => ({
      id: `doc-${d.documentId}`,
      documentId: d.documentId,
      title: d.title,
      snippet: d.snippet || 'No snippet available',
      date: d.date,
      sourceType: d.sourceType || 'document',
      confidence: 1.0,
      extractionMethod: d.model ? 'LLM' : 'Manual/Heuristic',
      model: d.model || 'Legacy Pipeline',
      sourceId: d.documentId,
    }));

    res.json({
      documents: evidence,
      relationship: rel || null,
    });
  } catch (error) {
    console.error('❌ Error fetching edge evidence:', error);
    next(error);
  }
});

export default router;
