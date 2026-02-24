import { relationshipsQueries } from '@epstein/db';
import { getApiPool } from './connection.js';
import {
  IGetRelationshipsResult,
  IGetNeighborsCachedResult,
  IGetTopEntitiesByRelationshipCountResult,
} from '@epstein/db/src/queries/__generated__/relationships.js';

export const relationshipsRepository = {
  getRelationships: async (
    entityId: number | string,
    filters: {
      minWeight?: number;
      minConfidence?: number;
      from?: string;
      to?: string;
      includeBreakdown?: boolean;
    } = {},
  ) => {
    const rows = await relationshipsQueries.getRelationships.run(
      {
        entityId: Number(entityId),
        minWeight: filters.minWeight ?? null,
        minConfidence: filters.minConfidence ?? null,
      },
      getApiPool(),
    );

    return rows.map((r: IGetRelationshipsResult) => ({
      source_id: Number(r.sourceId),
      target_id: Number(r.targetId),
      relationship_type: r.relationshipType,
      proximity_score: r.proximityScore,
      risk_score: Number(r.riskScore),
      confidence: r.confidence,
      metadata_json: filters.includeBreakdown
        ? r.metadataJson
          ? JSON.parse(r.metadataJson as string)
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
  rebuildAdjacencyCache: async () => {
    console.log('⏳ [GRAPH] Rebuilding adjacency cache...');

    // Use a real pg client transaction; the @epstein/db helper requires explicit pool/client.
    const client = await getApiPool().connect();
    try {
      await client.query('BEGIN');
      await client.query('DELETE FROM entity_adjacency');
      await relationshipsQueries.rebuildAdjacencyCache.run(undefined, client as any);
      await client.query(
        'UPDATE graph_cache_state SET last_rebuild = CURRENT_TIMESTAMP, is_dirty = 0 WHERE id = 1',
      );
      await client.query('COMMIT');
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }

    console.log('✅ [GRAPH] Adjacency cache rebuilt successfully.');
  },

  getGraphSlice: async (
    entityId: number | string,
    depth: number = 2,
    _filters: { from?: string; to?: string } = {},
  ) => {
    const MAX_DEPTH = 3;
    const MAX_QUEUE_ITERATIONS = 500;
    const safeDepth = Math.min(depth, MAX_DEPTH);

    // 0. Resolve to Canonical ID
    const startNodeRows = await relationshipsQueries.getEntityCanonical.run(
      { id: Number(entityId) },
      getApiPool(),
    );
    if (startNodeRows.length === 0) return { nodes: [], edges: [] };

    const startId = startNodeRows[0].cid;

    const visited = new Set<number>();
    const queue: { id: number; d: number; bridge_score?: number }[] = [
      { id: Number(startId), d: 0, bridge_score: 0 },
    ];
    const nodes: any[] = [];
    const edges: any[] = [];

    // Only process if queue is not empty
    let iterations = 0;
    while (queue.length > 0 && iterations < MAX_QUEUE_ITERATIONS) {
      iterations++;
      const item = queue.shift();
      if (!item) break;
      const { id, d } = item;

      if (visited.has(id) || d > depth) continue;
      visited.add(id);

      const entityRows = await relationshipsQueries.getEntityDetailsAggregated.run(
        { canonicalId: BigInt(id) },
        getApiPool(),
      );
      const entity = entityRows[0];

      if (entity) {
        const photoRows = await relationshipsQueries.getTopPhotoForEntity.run(
          { entityId: BigInt(id) },
          getApiPool(),
        );

        nodes.push({
          id: Number(entity.id),
          label: entity.fullName,
          type: entity.primaryRole || 'person',
          risk: entity.redFlagRating || 0,
          top_photo_id: photoRows[0]?.id || null,
        });
      }

      if (d >= safeDepth) continue;

      const rels = await relationshipsQueries.getNeighborsCached.run(
        { entityId: BigInt(id), limit: 100 },
        getApiPool(),
      );

      for (const r of rels as IGetNeighborsCachedResult[]) {
        const targetId = Number(r.targetId);

        edges.push({
          source_id: id,
          target_id: targetId,
          relationship_type: r.relationshipTypes?.split(',')[0] || 'connected',
          proximity_score: r.proximityScore,
          risk_score: 0,
          confidence: 1,
        });

        if (!visited.has(targetId) && d + 1 <= safeDepth) {
          queue.push({ id: targetId, d: d + 1, bridge_score: r.bridgeScore || 0 });
          // Priority: lower depth first, then higher bridge score
          queue.sort((a: any, b: any) => a.d - b.d || b.bridge_score - a.bridge_score);
        }
      }
    }

    return { nodes, edges };
  },

  getStats: async () => {
    const statsRows = await relationshipsQueries.getRelationshipStats.run(undefined, getApiPool());
    const totals = statsRows[0];

    const topRows = await relationshipsQueries.getTopEntitiesByRelationshipCount.run(
      { limit: 10 },
      getApiPool(),
    );

    return {
      total_relationships: Number(totals?.totalRelationships || 0),
      avg_proximity_score: Number((totals?.avgProximityScore || 0).toFixed(2)),
      avg_risk_score: Number((totals?.avgRiskScore || 0).toFixed(2)),
      avg_confidence: Number((totals?.avgConfidence || 0).toFixed(2)),
      top_entities_by_relationship_count: topRows.map(
        (r: IGetTopEntitiesByRelationshipCountResult) => ({
          entity_id: Number(r.entityId),
          count: Number(r.count),
        }),
      ),
    };
  },

  getEntitySummarySource: async (entityId: number | string, topN: number = 10) => {
    // Resolve Canonical ID
    const startNodeRows = await relationshipsQueries.getEntityCanonical.run(
      { id: Number(entityId) },
      getApiPool(),
    );
    if (startNodeRows.length === 0) return null;
    const canonicalId = startNodeRows[0].cid;

    const entityRows = await relationshipsQueries.getEntityDetailsAggregated.run(
      { canonicalId: BigInt(canonicalId!) },
      getApiPool(),
    );
    const entity = entityRows[0];

    if (!entity) return null;

    // Use consolidated SQL queries for relationships
    const relationships = await relationshipsQueries.getRelationships.run(
      { entityId: Number(canonicalId), minWeight: 0, minConfidence: 0 },
      getApiPool(),
    );

    // Docs search is still tricky, but we can use searchQueries if available
    // For now, keep it simple or use a placeholder if not critical
    // Actually, I'll use the existing search functionality if possible

    return {
      entity: {
        id: Number(entity.id),
        full_name: entity.fullName,
        primary_role: entity.primaryRole,
      },
      relationships: (relationships as IGetRelationshipsResult[]).slice(0, topN).map((r) => ({
        id: Number(r.sourceId),
        target_id: Number(r.targetId),
        proximity: r.proximityScore,
        risk: Number(r.riskScore),
        confidence: r.confidence,
        type: r.relationshipType,
      })),
      documents: [], // To be populated by a separate documents search call if needed
    };
  },
};
