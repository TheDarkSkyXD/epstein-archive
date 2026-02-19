import { getDb } from './connection.js';

export const relationshipsRepository = {
  getRelationships: (
    entityId: number | string,
    filters: {
      minWeight?: number;
      minConfidence?: number;
      from?: string;
      to?: string;
      includeBreakdown?: boolean;
    } = {},
  ) => {
    const db = getDb();
    const where: string[] = ['(source_entity_id = @entityId OR target_entity_id = @entityId)'];
    const params: any = { entityId };

    if (filters.minWeight !== undefined) {
      where.push('(proximity_score >= @minWeight)');
      params.minWeight = filters.minWeight;
    }
    if (filters.minConfidence !== undefined) {
      where.push('confidence >= @minConfidence');
      params.minConfidence = filters.minConfidence;
    }
    // Date filters (if columns support it, reusing logic from DatabaseService)
    if (filters.from) {
      where.push('(last_seen_at IS NULL OR last_seen_at >= @from)');
      params.from = filters.from;
    }
    if (filters.to) {
      where.push('(first_seen_at IS NULL OR first_seen_at <= @to)');
      params.to = filters.to;
    }

    const sql = `
      SELECT source_entity_id as source_id, target_entity_id as target_id, relationship_type, proximity_score,
             0 as risk_score, 1 as confidence, NULL as metadata_json
      FROM entity_relationships
      WHERE ${where.join(' AND ')}
      ORDER BY proximity_score DESC
    `;

    const rows = db.prepare(sql).all(params) as any[];

    return rows.map((r) => ({
      source_id: r.source_id,
      target_id: r.target_id,
      relationship_type: r.relationship_type,
      proximity_score: r.proximity_score,
      risk_score: r.risk_score,
      confidence: r.confidence,
      metadata_json: filters.includeBreakdown
        ? r.metadata_json
          ? JSON.parse(r.metadata_json)
          : null
        : undefined,
      disclaimer:
        'This reflects data connections and evidence categories, not a legal determination.',
    }));
  },

  /**
   * REBUILD ADJACENCY CACHE: Precomputes entity-to-entity neighbors.
   * Accelerates high-depth graph traverses.
   */
  rebuildAdjacencyCache: () => {
    const db = getDb();
    console.log('⏳ [GRAPH] Rebuilding adjacency cache...');

    db.transaction(() => {
      db.prepare('DELETE FROM entity_adjacency').run();
      db.prepare(
        `
        INSERT INTO entity_adjacency (entity_id, neighbor_id, weight, bridge_score, relationship_types)
        SELECT 
          s.canonical_id as entity_id,
          t.canonical_id as neighbor_id,
          MAX(er.proximity_score) as weight,
          CASE WHEN s.community_id != t.community_id THEN 1.0 ELSE 0.0 END as bridge_score,
          GROUP_CONCAT(DISTINCT er.relationship_type) as relationship_types
        FROM entity_relationships er
        JOIN entities s ON er.source_entity_id = s.id
        JOIN entities t ON er.target_entity_id = t.id
        WHERE s.canonical_id != t.canonical_id
        GROUP BY s.canonical_id, t.canonical_id
      `,
      ).run();

      db.prepare(
        'UPDATE graph_cache_state SET last_rebuild = CURRENT_TIMESTAMP, is_dirty = 0 WHERE id = 1',
      ).run();
    })();
    console.log('✅ [GRAPH] Adjacency cache rebuilt successfully.');
  },

  getGraphSlice: (
    entityId: number | string,
    depth: number = 2,
    _filters: { from?: string; to?: string } = {},
  ) => {
    // Phase 6.5 Query Discipline: Hard Caps
    const MAX_DEPTH = 3;
    const MAX_QUEUE_ITERATIONS = 500;
    const safeDepth = Math.min(depth, MAX_DEPTH);

    const db = getDb();

    // 0. Resolve to Canonical ID
    const startNode = db
      .prepare('SELECT COALESCE(canonical_id, id) as cid FROM entities WHERE id = ?')
      .get(entityId) as { cid: number };
    if (!startNode) return { nodes: [], edges: [] };

    const startId = startNode.cid;

    const visited = new Set<number>();
    const queue: { id: number; d: number; bridge_score?: number }[] = [
      { id: Number(startId), d: 0, bridge_score: 0 },
    ];
    const nodes: any[] = [];
    const edges: any[] = [];

    // Get Entity Details (Aggregated by Canonical ID)
    const getEntity = db.prepare(`
        SELECT 
            canonical_id as id, 
            MAX(full_name) as full_name, 
            MAX(primary_role) as primary_role, 
            MAX(red_flag_rating) as red_flag_rating,
            (
              SELECT mi.id
              FROM media_item_people mip
              JOIN media_items mi ON mip.media_item_id = mi.id
              WHERE mip.entity_id = entities.id
              AND (mi.file_type LIKE 'image/%' OR mi.file_type IS NULL)
              ORDER BY mi.red_flag_rating DESC, mi.id DESC
              LIMIT 1
            ) as top_photo_id
        FROM entities 
        WHERE canonical_id = ?
        GROUP BY canonical_id
    `);

    // USE CACHED ADJACENCY (Optimized for Depth 2+)
    const getNeighborsCached = db.prepare(`
      SELECT 
        neighbor_id as target_id,
        weight as proximity_score,
        bridge_score,
        relationship_types
      FROM entity_adjacency
      WHERE entity_id = ?
      ORDER BY bridge_score DESC, weight DESC
      LIMIT 100
    `);

    // Only process if queue is not empty
    let iterations = 0;
    while (queue.length > 0 && iterations < MAX_QUEUE_ITERATIONS) {
      iterations++;
      const item = queue.shift();
      if (!item) break;
      const { id, d } = item;

      if (visited.has(id) || d > depth) continue;
      visited.add(id);

      const entity = getEntity.get(id) as any;
      if (entity) {
        nodes.push({
          id: entity.id,
          label: entity.full_name,
          type: entity.primary_role || 'person',
          risk: entity.red_flag_rating || 0,
          top_photo_id: entity.top_photo_id,
        });
      }

      if (d >= safeDepth) continue;

      const rels = getNeighborsCached.all(id) as any[];

      for (const r of rels) {
        const targetId = r.target_id;

        edges.push({
          source_id: id,
          target_id: targetId,
          relationship_type: r.relationship_types?.split(',')[0] || 'connected',
          proximity_score: r.proximity_score,
          risk_score: 0,
          confidence: 1,
        });

        if (!visited.has(targetId) && d + 1 <= safeDepth) {
          queue.push({ id: targetId, d: d + 1, bridge_score: r.bridge_score || 0 });
          // Priority: lower depth first, then higher bridge score
          queue.sort((a: any, b: any) => a.d - b.d || b.bridge_score - a.bridge_score);
        }
      }
    }

    return { nodes, edges };
  },

  getStats: () => {
    const db = getDb();
    const totals = db
      .prepare(
        `
      SELECT 
        COUNT(*) as total_relationships,
        AVG(proximity_score) as avg_proximity_score,
        AVG(risk_score) as avg_risk_score,
        AVG(confidence) as avg_confidence
      FROM entity_relationships
    `,
      )
      .get() as any;

    const top = db
      .prepare(
        `
      SELECT source_entity_id as entity_id, COUNT(*) as count
      FROM entity_relationships
      GROUP BY source_entity_id
      ORDER BY count DESC
      LIMIT 10
    `,
      )
      .all() as { entity_id: number; count: number }[];

    return {
      total_relationships: totals.total_relationships || 0,
      avg_proximity_score: Number((totals.avg_proximity_score || 0).toFixed(2)),
      avg_risk_score: Number((totals.avg_risk_score || 0).toFixed(2)),
      avg_confidence: Number((totals.avg_confidence || 0).toFixed(2)),
      top_entities_by_relationship_count: top,
    };
  },

  getEntitySummarySource: (entityId: number | string, topN: number = 10) => {
    const db = getDb();

    // Resolve Canonical ID
    const startNode = db
      .prepare('SELECT COALESCE(canonical_id, id) as cid FROM entities WHERE id = ?')
      .get(entityId) as { cid: number };
    if (!startNode) return null;
    const canonicalId = startNode.cid;

    const entity = db
      .prepare(
        `SELECT canonical_id as id, MAX(full_name) as full_name, MAX(primary_role) as primary_role FROM entities WHERE canonical_id=? GROUP BY canonical_id`,
      )
      .get(canonicalId) as any;

    if (!entity) return null;

    const relationships = db
      .prepare(
        `
      SELECT 
        s.canonical_id as source_id, 
        t.canonical_id as target_id, 
        er.relationship_type,
        MAX(er.proximity_score) as proximity_score,
        0 as risk_score, 1 as confidence
      FROM entity_relationships er
      JOIN entities s ON er.source_entity_id = s.id
      JOIN entities t ON er.target_entity_id = t.id
      WHERE s.canonical_id=?
      GROUP BY s.canonical_id, t.canonical_id, er.relationship_type
      ORDER BY proximity_score DESC
      LIMIT ?
    `,
      )
      .all(canonicalId, topN) as any[];

    // Docs search still uses LIKE name, but we should probably use mentions on canonical ID
    // Keep wildcard search for now as it's broader
    const docs = db
      .prepare(
        `
      SELECT id, file_name as title, evidence_type, NULL as metadata_json, red_flag_rating, word_count, date_created
      FROM documents
      WHERE file_name LIKE ? OR content LIKE ?
      LIMIT ?
    `,
      )
      .all(`%${entity.full_name}%`, `%${entity.full_name}%`, topN) as any[];

    return {
      entity,
      relationships: relationships.map((r) => ({
        id: r.source_id,
        target_id: r.target_id,
        proximity: r.proximity_score,
        risk: r.risk_score,
        confidence: r.confidence,
        type: r.relationship_type,
      })),
      documents: docs.map((d) => ({
        id: d.id,
        title: d.title,
        evidence_type: d.evidence_type,
        risk: d.red_flag_rating,
      })),
    };
  },
};
