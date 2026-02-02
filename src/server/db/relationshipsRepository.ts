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
    const where: string[] = ['source_entity_id = @entityId'];
    const params: any = { entityId };

    if (filters.minWeight !== undefined) {
      where.push('(COALESCE(proximity_score, weight) >= @minWeight)');
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
      SELECT source_entity_id as source_id, target_entity_id as target_id, relationship_type, strength as proximity_score,
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

  // TODO: Apply filters to graph traversal - see UNUSED_VARIABLES_RECOMMENDATIONS.md
  getGraphSlice: (
    entityId: number | string,
    depth: number = 2,
    _filters: { from?: string; to?: string } = {},
  ) => {
    const db = getDb();

    // Prefer the newer relations table when present; fall back to
    // legacy entity_relationships for older databases.
    const hasRelations = !!db
      .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='relations'")
      .get();

    const visited = new Set<number>();
    const queue: { id: number; d: number }[] = [{ id: Number(entityId), d: 0 }];
    const nodes: any[] = [];
    const edges: any[] = [];

    const getEntity = db.prepare('SELECT id, full_name FROM entities WHERE id = ?');

    const getRels = hasRelations
      ? db.prepare(`
          SELECT
            subject_entity_id as source_id,
            object_entity_id as target_id,
            predicate as relationship_type,
            weight as proximity_score,
            0 as risk_score,
            1 as confidence,
            NULL as metadata_json
          FROM relations
          WHERE (subject_entity_id = ? OR object_entity_id = ?)
          ORDER BY weight DESC
          LIMIT 200
        `)
      : db.prepare(`
          SELECT source_entity_id as source_id, target_entity_id as target_id, relationship_type, COALESCE(proximity_score, weight) as proximity_score,
                 risk_score, confidence, metadata_json
          FROM entity_relationships
          WHERE source_entity_id = ?
          ORDER BY proximity_score DESC
          LIMIT 200
        `);

    // Only process if queue is not empty
    let iterations = 0;
    while (queue.length > 0 && iterations < 1000) {
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
          type: 'entity',
        });
      }

      const rels = hasRelations ? (getRels.all(id, id) as any[]) : (getRels.all(id) as any[]);

      for (const r of rels) {
        const sourceId = r.source_id;
        const targetId = r.target_id;
        edges.push({
          source_id: sourceId,
          target_id: targetId,
          relationship_type: r.relationship_type,
          proximity_score: r.proximity_score,
          risk_score: r.risk_score,
          confidence: r.confidence,
        });

        const nextId = sourceId === id ? targetId : sourceId;
        if (!visited.has(nextId) && d + 1 <= depth) {
          queue.push({ id: nextId, d: d + 1 });
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
        AVG(COALESCE(proximity_score, weight)) as avg_proximity_score,
        AVG(COALESCE(risk_score, 0)) as avg_risk_score,
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
    const entity = db
      .prepare(`SELECT id, full_name, primary_role FROM entities WHERE id=?`)
      .get(entityId) as any;

    if (!entity) return null;

    const relationships = db
      .prepare(
        `
      SELECT 
        source_entity_id as source_id, 
        target_entity_id as target_id, 
        relationship_type,
        COALESCE(proximity_score, weight) as proximity_score,
        0 as risk_score, confidence, metadata_json
      FROM entity_relationships 
      WHERE source_entity_id=?
      ORDER BY proximity_score DESC
      LIMIT ?
    `,
      )
      .all(entityId, topN) as any[];

    const docs = db
      .prepare(
        `
      SELECT id, file_name as title, evidence_type, metadata_json, red_flag_rating, word_count, date_created
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
