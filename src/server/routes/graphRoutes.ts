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

class MinPriorityQueue<T> {
  private heap: Array<{ value: T; priority: number }> = [];

  push(value: T, priority: number): void {
    this.heap.push({ value, priority });
    this.bubbleUp(this.heap.length - 1);
  }

  pop(): { value: T; priority: number } | undefined {
    if (this.heap.length === 0) return undefined;
    const top = this.heap[0];
    const last = this.heap.pop()!;
    if (this.heap.length > 0) {
      this.heap[0] = last;
      this.bubbleDown(0);
    }
    return top;
  }

  get size(): number {
    return this.heap.length;
  }

  private bubbleUp(index: number): void {
    let i = index;
    while (i > 0) {
      const parent = Math.floor((i - 1) / 2);
      if (this.heap[parent].priority <= this.heap[i].priority) break;
      [this.heap[parent], this.heap[i]] = [this.heap[i], this.heap[parent]];
      i = parent;
    }
  }

  private bubbleDown(index: number): void {
    let i = index;
    // eslint-disable-next-line no-constant-condition
    while (true) {
      const left = 2 * i + 1;
      const right = 2 * i + 2;
      let smallest = i;
      if (left < this.heap.length && this.heap[left].priority < this.heap[smallest].priority) {
        smallest = left;
      }
      if (right < this.heap.length && this.heap[right].priority < this.heap[smallest].priority) {
        smallest = right;
      }
      if (smallest === i) break;
      [this.heap[i], this.heap[smallest]] = [this.heap[smallest], this.heap[i]];
      i = smallest;
    }
  }
}

async function computeShortestPathNodeIds(
  sourceId: string,
  targetId: string,
  startDate?: string,
  endDate?: string,
): Promise<string[] | null> {
  const distances = new Map<string, number>([[sourceId, 0]]);
  const previous = new Map<string, string | null>();
  const visited = new Set<string>();
  const queue = new MinPriorityQueue<string>();
  queue.push(sourceId, 0);

  const maxNodes = 5000;
  let explored = 0;

  while (queue.size > 0 && explored < maxNodes) {
    const item = queue.pop();
    if (!item) break;
    const { value: current, priority: distance } = item;
    if (visited.has(current)) continue;

    visited.add(current);
    explored++;

    if (current === targetId) {
      const path: string[] = [];
      let cursor: string | null = targetId;
      while (cursor) {
        path.unshift(cursor);
        cursor = previous.get(cursor) || null;
      }
      return path;
    }

    const neighbors = await getGraphNeighbors(current, startDate, endDate);
    for (const neighbor of neighbors) {
      const nextId = String(neighbor.canonical_id);
      const weight = Math.max(0.0001, Number(neighbor.weight || 0.1));
      const nextDistance = distance + 1 / weight;

      if (nextDistance < (distances.get(nextId) ?? Number.POSITIVE_INFINITY)) {
        distances.set(nextId, nextDistance);
        previous.set(nextId, current);
        queue.push(nextId, nextDistance);
      }
    }
  }

  return null;
}

// Legacy root alias for older clients/tests expecting /api/graph to return the global graph payload.
router.get('/', (req, res) => {
  const params = new URLSearchParams();
  for (const [key, raw] of Object.entries(req.query)) {
    if (raw == null) continue;
    if (Array.isArray(raw)) {
      for (const value of raw) params.append(key, String(value));
      continue;
    }
    params.set(key, String(raw));
  }
  const qs = params.toString();
  res.redirect(307, `/api/graph/global${qs ? `?${qs}` : ''}`);
});

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

    if (mode === 'cluster') {
      // Super Cluster Mode: Aggregated by Structural Community (LPA)
      const clusters = await getGraphCommunities();

      // Enhance labels (optional)

      return res.json({
        nodes: clusters.map((c: any) => ({
          id: c.id,
          label: `${c.label} (${c.size})`,
          type: 'cluster',
          risk: c.risk,
          memberCount: c.size,
          community: parseInt(c.id.split('-')[1]),
        })),
        edges: [], // No edges in cluster view for clarity
      });
    }

    if (mode === 'path') {
      if (!req.query.sourceId || !req.query.targetId) {
        return res.status(400).json({ error: 'sourceId and targetId are required for path mode' });
      }
      const sourceId = String(req.query.sourceId);
      const targetId = String(req.query.targetId);
      const pathNodeArray = await computeShortestPathNodeIds(
        sourceId,
        targetId,
        startDate,
        endDate,
      );
      if (!pathNodeArray || pathNodeArray.length === 0) {
        return res.json({ nodes: [], edges: [] });
      }
      const nodes = await getGraphPathNodes(pathNodeArray);
      const edges = await getGraphPathEdges(pathNodeArray, startDate, endDate);

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
    const nodesArr = await getGlobalGraphNodes({ minRisk, limit, startDate, endDate });

    const canonicalIds = nodesArr.map((n: any) => n.id);

    // Quick exit if no nodes
    if (canonicalIds.length === 0) {
      return res.json({ nodes: [], edges: [] });
    }

    // 2. Fetch Relationships between these nodes — injection-safe ANY($N::bigint[]) binding
    const edgesArr = await getGlobalGraphEdges({ canonicalIds, startDate, endDate });

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

    const docs = await getEdgeEvidenceDocuments(String(sourceId), String(targetId));
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
