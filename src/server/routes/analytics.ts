import { Router } from 'express';
import { getApiPool } from '../db/connection.js';
import { entitiesRepository } from '../db/entitiesRepository.js';
import { analyticsRateLimiter } from '../middleware/rateLimit.js';
import { cacheResponse } from '../utils/perfCache.js';

const router = Router();

/**
 * Enhanced Analytics — reads from materialised views for O(1) response times.
 * Views are refreshed every 5 minutes by the setInterval in server.ts.
 */
router.get('/enhanced', analyticsRateLimiter, cacheResponse(60), async (_req, res, next) => {
  try {
    console.log('📊 [Analytics] Fetching from materialised views...');
    console.time('analytics-total');
    const pool = getApiPool();

    const [
      docsByType,
      timeline,
      topConnected,
      entityDist,
      redactionStats,
      topRelationships,
      totalCounts,
      reconciliation,
    ] = await Promise.all([
      // From mv_docs_by_type
      pool.query<any>(`
        SELECT type, count, redacted, avg_risk AS "avgRisk"
        FROM mv_docs_by_type
        ORDER BY count DESC
      `),
      // From mv_timeline_data
      pool.query<any>(`
        SELECT period, total, emails, photos, documents, financial
        FROM mv_timeline_data
        ORDER BY (CASE WHEN period = 'Unknown' THEN '9999-99' ELSE period END) ASC
      `),
      // From mv_top_connected
      pool.query<any>(`
        SELECT id, name, role, type, risk_level AS "riskLevel",
               connection_count AS "connectionCount", mentions
        FROM mv_top_connected
        ORDER BY "connectionCount" DESC
        LIMIT 100
      `),
      // From mv_entity_type_dist
      pool.query<any>(`
        SELECT type, count, avg_risk AS "avgRisk"
        FROM mv_entity_type_dist
        ORDER BY count DESC
      `),
      // From mv_redaction_stats (single row)
      pool.query<any>(`
        SELECT total_documents AS "totalDocuments",
               redacted_documents AS "redactedDocuments",
               redaction_percentage AS "redactionPercentage",
               total_redactions AS "totalRedactions"
        FROM mv_redaction_stats
      `),
      // Top relationships — live (capped at 500)
      pool.query<any>(`
        SELECT
          er.source_entity_id AS "sourceId",
          er.target_entity_id AS "targetId",
          e1.full_name AS source,
          e2.full_name AS target,
          er.relationship_type AS type,
          er.strength AS weight
        FROM entity_relationships er
        JOIN entities e1 ON er.source_entity_id = e1.id
        JOIN entities e2 ON er.target_entity_id = e2.id
        ORDER BY er.strength DESC
        LIMIT 500
      `),
      // Total counts — live (fast PK scans)
      pool.query<any>(`
        SELECT
          (SELECT COUNT(*) FROM entities  WHERE COALESCE(junk_tier,'clean') = 'clean') AS entities,
          (SELECT COUNT(*) FROM documents)                                               AS documents,
          (SELECT COUNT(*) FROM documents WHERE evidence_type IS NOT NULL)               AS evidence_files,
          (SELECT COUNT(*) FROM entity_relationships)                                    AS relationships
      `),
      // Reconciliation — live
      pool.query<any>(`
        SELECT
          (SELECT COUNT(*) FROM documents WHERE evidence_type IS NULL) AS unclassified,
          (SELECT COUNT(*) FROM documents
             WHERE date_created IS NULL
               OR date_created > '2026-12-31'::date) AS unknown_date
      `),
    ]);

    const tc = totalCounts.rows[0];
    const rc = reconciliation.rows[0];

    res.set('Cache-Control', 'public, max-age=300');
    res.json({
      documentsByType: docsByType.rows,
      timelineData: timeline.rows,
      topConnectedEntities: topConnected.rows,
      entityTypeDistribution: entityDist.rows,
      riskByType: [], // not in mat-view; omit or calculate on demand
      redactionStats: redactionStats.rows[0] ?? null,
      topRelationships: topRelationships.rows,
      totalCounts: {
        entities: Number(tc.entities),
        documents: Number(tc.documents),
        evidenceFiles: Number(tc.evidence_files),
        relationships: Number(tc.relationships),
      },
      reconciliation: {
        unclassifiedCount: Number(rc.unclassified),
        unknownDateCount: Number(rc.unknown_date),
      },
      generatedAt: new Date().toISOString(),
    });
    console.timeEnd('analytics-total');
  } catch (error) {
    console.error('❌ Error fetching enhanced analytics:', error);
    next(error);
  }
});

// Admin Route: Trigger Junk Entity Reconciliation
router.post('/reconcile/junk', async (_req, res, next) => {
  try {
    entitiesRepository.startBackgroundJunkBackfill(1000);
    res.json({
      success: true,
      message: 'Junk reconciliation started in background',
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('❌ Error in junk reconciliation:', error);
    next(error);
  }
});

// Admin Route: Reset Junk Flags
router.post('/reconcile/reset', async (_req, res, next) => {
  try {
    const pool = getApiPool();
    const result = await pool.query(
      "UPDATE entities SET junk_tier = 'clean', junk_reason = NULL, junk_probability = 0",
    );
    res.json({
      success: true,
      changes: result.rowCount,
      message: 'All junk flags have been reset',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('❌ Error resetting junk flags:', error);
    next(error);
  }
});

export default router;
