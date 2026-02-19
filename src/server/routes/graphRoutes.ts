import { Router } from 'express';
import { getDb } from '../db/connection.js';

const router = Router();

/**
 * Global Graph Data Endpoint
 * Supports Zoom-based LOD fetching.
 * Query Params:
 * - limit: number (default 500, max 3000)
 * - minRisk: number (default 0)
 * - includeEvidence: boolean (default false)
 */
router.get('/global', async (req, res, next) => {
  try {
    const limit = Math.min(3000, Math.max(10, parseInt(req.query.limit as string) || 500));
    const minRisk = parseInt(req.query.minRisk as string) || 0;
    const mode = req.query.mode as string; // 'cluster' or 'default'
    const startDate = req.query.startDate as string;
    const endDate = req.query.endDate as string;

    console.time('graph-global-fetch');
    const db = getDb();

    if (mode === 'cluster') {
      // Super Cluster Mode: Aggregated by Structural Community (LPA)
      const clusters = db
        .prepare(
          `
            SELECT 
                'community-' || community_id as id,
                -- Get name of the highest risk/mentioned person in the cluster
                (
                    SELECT full_name 
                    FROM entities e2 
                    WHERE e2.community_id = entities.community_id 
                    ORDER BY red_flag_rating DESC, mentions DESC 
                    LIMIT 1
                ) || ' Group' as label,
                'cluster' as type,
                MAX(red_flag_rating) as risk,
                COUNT(*) as size,
                SUM(mentions) as mentions
            FROM entities
            WHERE community_id IS NOT NULL AND entity_type = 'Person'
            GROUP BY community_id
            HAVING size > 10 -- Filter for significant clusters
            ORDER BY size DESC
            LIMIT 50
        `,
        )
        .all();

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

      const getNeighbors = db.prepare(`
            SELECT t.canonical_id, MAX(er.strength) as weight 
            FROM entity_relationships er
            JOIN entities s ON er.source_entity_id = s.id
            JOIN entities t ON er.target_entity_id = t.id
            WHERE s.canonical_id = ?
              AND (? IS NULL OR er.first_seen_at <= ?)
              AND (? IS NULL OR er.last_seen_at >= ?)
            GROUP BY t.canonical_id
        `);

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

        const neighbors = getNeighbors.all(
          curr,
          endDate || null,
          endDate || null,
          startDate || null,
          startDate || null,
        ) as { canonical_id: number; weight: number }[];
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

      const placeholders = Array.from(pathNodes)
        .map(() => '?')
        .join(',');
      const nodes = db
        .prepare(
          `
            SELECT 
                canonical_id as id, 
                full_name as label, 
                MAX(red_flag_rating) as risk, 
                MAX(primary_role) as type,
                SUM(mentions) as val,
                MAX(community_id) as community
            FROM entities 
            WHERE canonical_id IN (${placeholders})
            GROUP BY canonical_id
        `,
        )
        .all(...pathNodes);

      const edges = db
        .prepare(
          `
            SELECT 
                s.canonical_id as source, 
                t.canonical_id as target, 
                er.relationship_type as type,
                MAX(er.strength) as weight,
                MAX(er.confidence) as confidence,
                CASE 
                    WHEN er.relationship_type LIKE '%infer%' OR er.confidence < 0.8 THEN 'INFERRED' 
                    ELSE 'EVIDENCE_BACKED' 
                END as classification
            FROM entity_relationships er
            JOIN entities s ON er.source_entity_id = s.id
            JOIN entities t ON er.target_entity_id = t.id
            WHERE s.canonical_id IN (${placeholders}) 
              AND t.canonical_id IN (${placeholders})
              AND (? IS NULL OR er.first_seen_at <= ?)
              AND (? IS NULL OR er.last_seen_at >= ?)
            GROUP BY s.canonical_id, t.canonical_id, er.relationship_type
        `,
        )
        .all(
          ...pathNodes,
          ...pathNodes,
          endDate || null,
          endDate || null,
          startDate || null,
          startDate || null,
        );

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
    const nodesArr = db
      .prepare(
        `
      WITH rel_counts AS (
        SELECT entity_id, SUM(cnt) as degree FROM (
          SELECT source_entity_id as entity_id, COUNT(*) as cnt FROM entity_relationships 
          WHERE (? IS NULL OR first_seen_at <= ?) AND (? IS NULL OR last_seen_at >= ?)
          GROUP BY source_entity_id
          UNION ALL
          SELECT target_entity_id as entity_id, COUNT(*) as cnt FROM entity_relationships 
          WHERE (? IS NULL OR first_seen_at <= ?) AND (? IS NULL OR last_seen_at >= ?)
          GROUP BY target_entity_id
        ) t
        GROUP BY entity_id
      )
      SELECT 
        e.canonical_id as id,
        MAX(e.full_name) as label, 
        MAX(e.primary_role) as type,
        MAX(e.red_flag_rating) as risk,
        SUM(COALESCE(rc.degree, 0)) as connectionCount,
        SUM(e.mentions) as mentions,
        MAX(e.entity_type) as entity_type,
        MAX(e.community_id) as community_id
      FROM entities e
      LEFT JOIN rel_counts rc ON e.id = rc.entity_id
      WHERE e.entity_type = 'Person' 
        AND (e.red_flag_rating >= ?)
      GROUP BY e.canonical_id
      ORDER BY risk DESC, connectionCount DESC
      LIMIT ?
    `,
      )
      .all(
        endDate || null,
        endDate || null,
        startDate || null,
        startDate || null,
        endDate || null,
        endDate || null,
        startDate || null,
        startDate || null,
        minRisk,
        limit,
      );

    const canonicalIds = nodesArr.map((n: any) => n.id);

    // Quick exit if no nodes
    if (canonicalIds.length === 0) {
      return res.json({ nodes: [], edges: [] });
    }

    // 2. Fetch Relationships between these nodes
    const query = `
        SELECT 
            s.canonical_id as source,
            t.canonical_id as target,
            er.relationship_type as type,
            MAX(er.strength) as weight,
            MAX(er.confidence) as confidence,
            CASE 
                WHEN er.relationship_type LIKE '%infer%' OR er.relationship_type LIKE '%agentic%' OR er.confidence < 0.8 
                THEN 'INFERRED' 
                ELSE 'EVIDENCE_BACKED' 
            END as classification
        FROM entity_relationships er
        JOIN entities s ON er.source_entity_id = s.id
        JOIN entities t ON er.target_entity_id = t.id
        WHERE s.canonical_id IN (${canonicalIds.join(',')})
          AND t.canonical_id IN (${canonicalIds.join(',')})
          AND s.canonical_id != t.canonical_id
          -- Temporal Filter
          AND (? IS NULL OR er.first_seen_at <= ?)
          AND (? IS NULL OR er.last_seen_at >= ?)
        GROUP BY s.canonical_id, t.canonical_id, er.relationship_type
        ORDER BY weight DESC
        LIMIT 5000
    `;

    const edgesArr = db
      .prepare(query)
      .all(endDate || null, endDate || null, startDate || null, startDate || null);

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

    const db = getDb();

    // Trace Lineage: Joined with ingest_runs for provenance
    const docs = db
      .prepare(
        `
      SELECT 
        d.id as documentId, 
        d.file_name as title, 
        d.evidence_type as sourceType, 
        d.red_flag_rating as risk,
        d.date_created as date,
        ir.agentic_model_id as model,
        ir.extractor_versions as pipeline,
        (
            SELECT mention_context
            FROM entity_mentions em
            JOIN entities e ON em.entity_id = e.id
            WHERE em.document_id = d.id
            AND e.canonical_id IN (?, ?)
            LIMIT 1
        ) as snippet
      FROM documents d
      JOIN entity_mentions em ON em.document_id = d.id
      JOIN entities e ON em.entity_id = e.id
      LEFT JOIN ingest_runs ir ON em.ingest_run_id = ir.id
      WHERE e.canonical_id IN (?, ?)
      GROUP BY d.id
      HAVING COUNT(DISTINCT e.canonical_id) >= 2 -- Both must be in same doc
      ORDER BY d.red_flag_rating DESC
      LIMIT 20
    `,
      )
      .all(sourceId, targetId, sourceId, targetId);

    // Metadata
    const rel = db
      .prepare(
        `
      SELECT er.relationship_type, er.proximity_score, er.confidence, er.was_agentic
      FROM entity_relationships er
      JOIN entities s ON er.source_entity_id = s.id
      JOIN entities t ON er.target_entity_id = t.id
      WHERE (s.canonical_id = ? AND t.canonical_id = ?)
         OR (s.canonical_id = ? AND t.canonical_id = ?)
      LIMIT 1
    `,
      )
      .get(sourceId, targetId, targetId, sourceId);

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
