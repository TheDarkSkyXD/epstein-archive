import { Router } from 'express';
import { getDb } from '../db/connection.js';
import { entitiesRepository } from '../db/entitiesRepository.js';

const router = Router();

// Enhanced Analytics API (PUBLIC) - Aggregated data for visualizations
router.get('/enhanced', async (_req, res, next) => {
  try {
    console.log('📊 Starting Enhanced Analytics Fetch...');
    console.time('analytics-total');
    const db = getDb();

    // Document breakdown by type (including 'unclassified' bucket)
    console.time('analytics-docs-by-type');
    const documentsByType = db
      .prepare(
        `
      SELECT 
        COALESCE(evidence_type, 'unclassified') as type,
        COUNT(*) as count,
        SUM(CASE WHEN has_redactions = 1 THEN 1 ELSE 0 END) as redacted,
        AVG(red_flag_rating) as avgRisk
      FROM documents 
      GROUP BY COALESCE(evidence_type, 'unclassified')
      ORDER BY count DESC
    `,
      )
      .all();
    console.timeEnd('analytics-docs-by-type');

    console.time('analytics-timeline');
    // Improved timeline with 'Unknown' bucket for NULL or invalid dates
    // Valid dates must be between 1920 and 2026-12-31 to prevent ingest-date collapse spikes
    const currentYearStr = new Date().getFullYear().toString();
    const timelineData = db
      .prepare(
        `
      SELECT 
        CASE 
          WHEN date_created IS NULL OR length(date_created) < 7 OR date_created > '2026-12-31' THEN 'Unknown'
          ELSE substr(date_created, 1, 7) 
        END as period,
        COUNT(*) as total,
        SUM(CASE WHEN evidence_type = 'email' THEN 1 ELSE 0 END) as emails,
        SUM(CASE WHEN evidence_type = 'photo' THEN 1 ELSE 0 END) as photos,
        SUM(CASE WHEN evidence_type = 'document' THEN 1 ELSE 0 END) as documents,
        SUM(CASE WHEN evidence_type = 'financial' THEN 1 ELSE 0 END) as financial
      FROM documents 
      GROUP BY period 
      ORDER BY (CASE WHEN period = 'Unknown' THEN '9999-99' ELSE period END) ASC
    `,
      )
      .all();
    console.timeEnd('analytics-timeline');

    console.time('analytics-top-connected');
    const topConnectedEntities = db
      .prepare(
        `
      WITH rel_counts AS (
        SELECT entity_id, SUM(cnt) as cnt FROM (
          SELECT source_entity_id as entity_id, COUNT(*) as cnt FROM entity_relationships GROUP BY source_entity_id
          UNION ALL
          SELECT target_entity_id as entity_id, COUNT(*) as cnt FROM entity_relationships GROUP BY target_entity_id
        ) t
        GROUP BY entity_id
      )
      SELECT 
        e.id,
        e.full_name as name,
        e.primary_role as role,
        e.entity_type as type,
        e.red_flag_rating as riskLevel,
        COALESCE(rc.cnt, 0) as connectionCount,
        e.mentions
      FROM rel_counts rc
      JOIN entities e ON e.id = rc.entity_id
      WHERE e.entity_type = 'Person' AND COALESCE(e.junk_flag, 0) = 0
      ORDER BY rc.cnt DESC
      LIMIT 1000
    `,
      )
      .all();
    console.timeEnd('analytics-top-connected');

    console.time('analytics-entity-dist');
    const entityTypeDistribution = db
      .prepare(
        `
      SELECT 
        entity_type as type,
        COUNT(*) as count,
        AVG(red_flag_rating) as avgRisk
      FROM entities 
      WHERE entity_type IS NOT NULL 
      GROUP BY entity_type 
      ORDER BY count DESC
    `,
      )
      .all();
    console.timeEnd('analytics-entity-dist');

    console.time('analytics-risk-by-type');
    const riskByType = db
      .prepare(
        `
      SELECT 
        entity_type as type,
        red_flag_rating as riskLevel,
        COUNT(*) as count
      FROM entities 
      WHERE entity_type IS NOT NULL AND red_flag_rating IS NOT NULL
      GROUP BY entity_type, red_flag_rating 
      ORDER BY entity_type, red_flag_rating DESC
    `,
      )
      .all();
    console.timeEnd('analytics-risk-by-type');

    console.time('analytics-redaction-stats');
    const redactionStats = db
      .prepare(
        `
      SELECT 
        COUNT(*) as totalDocuments,
        SUM(CASE WHEN has_redactions = 1 THEN 1 ELSE 0 END) as redactedDocuments,
        (SUM(CASE WHEN has_redactions = 1 THEN 1.0 ELSE 0 END) / COUNT(*) * 100) as redactionPercentage,
        SUM(redaction_count) as totalRedactions
      FROM documents
    `,
      )
      .get();
    console.timeEnd('analytics-redaction-stats');

    const topRelationships = db
      .prepare(
        `
      SELECT 
        er.source_entity_id as sourceId,
        er.target_entity_id as targetId,
        e1.full_name as source,
        e2.full_name as target,
        er.relationship_type as type,
        er.strength as weight
      FROM entity_relationships er
      JOIN entities e1 ON er.source_entity_id = e1.id
      JOIN entities e2 ON er.target_entity_id = e2.id
      ORDER BY er.strength DESC
      LIMIT 2000
    `,
      )
      .all();
    console.timeEnd('analytics-top-relationships');

    res.set('Cache-Control', 'public, max-age=300'); // 5 min cache
    res.json({
      documentsByType,
      timelineData,
      topConnectedEntities,
      entityTypeDistribution,
      riskByType,
      redactionStats,
      topRelationships,
      totalCounts: {
        entities: (
          await db
            .prepare('SELECT COUNT(*) as count FROM entities WHERE COALESCE(junk_flag, 0) = 0')
            .get()
        ).count,
        documents: (await db.prepare('SELECT COUNT(*) as count FROM documents').get()).count,
        evidenceFiles: (
          await db
            .prepare('SELECT COUNT(*) as count FROM documents WHERE evidence_type IS NOT NULL')
            .get()
        ).count,
        relationships: (
          await db.prepare('SELECT COUNT(*) as count FROM entity_relationships').get()
        ).count,
      },
      reconciliation: {
        unclassifiedCount: (
          await db
            .prepare('SELECT COUNT(*) as count FROM documents WHERE evidence_type IS NULL')
            .get()
        ).count,
        unknownDateCount: (
          await db
            .prepare(
              "SELECT COUNT(*) as count FROM documents WHERE date_created IS NULL OR length(date_created) < 7 OR date_created > '2026-12-31'",
            )
            .get()
        ).count,
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
    const db = getDb();

    // Ensure the schema is ready
    db.prepare(
      `
      ALTER TABLE entities ADD COLUMN junk_flag INTEGER DEFAULT 0;
    `,
    ).run();
    db.prepare(
      `
      ALTER TABLE entities ADD COLUMN junk_reason TEXT;
    `,
    ).run();
    db.prepare(
      `
      ALTER TABLE entities ADD COLUMN junk_probability REAL DEFAULT 0;
    `,
    ).run();

    // Trigger background backfill
    entitiesRepository.startBackgroundJunkBackfill(1000);

    res.json({
      success: true,
      message: 'Junk reconciliation started in background',
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    // If table already has columns, just start the backfill
    if (error.message.includes('duplicate column name')) {
      entitiesRepository.startBackgroundJunkBackfill(1000);
      return res.json({
        success: true,
        message: 'Junk reconciliation restarted in background',
        timestamp: new Date().toISOString(),
      });
    }
    console.error('❌ Error in junk reconciliation:', error);
    next(error);
  }
});

// Admin Route: Reset Junk Flags
router.post('/reconcile/reset', async (_req, res, next) => {
  try {
    const db = getDb();
    const result = db
      .prepare('UPDATE entities SET junk_flag = 0, junk_reason = NULL, junk_probability = 0')
      .run();

    res.json({
      success: true,
      changes: result.changes,
      message: 'All junk flags have been reset',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('❌ Error resetting junk flags:', error);
    next(error);
  }
});

export default router;
