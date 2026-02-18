import { Router } from 'express';
import { getDb } from '../db/connection.js';

const router = Router();

// Enhanced Analytics API (PUBLIC) - Aggregated data for visualizations
router.get('/enhanced', async (_req, res, next) => {
  try {
    console.log('📊 Starting Enhanced Analytics Fetch...');
    console.time('analytics-total');
    const db = getDb();

    // Document breakdown by type
    console.time('analytics-docs-by-type');
    const documentsByType = db
      .prepare(
        `
      SELECT 
        evidence_type as type,
        COUNT(*) as count,
        SUM(CASE WHEN has_redactions = 1 THEN 1 ELSE 0 END) as redacted,
        AVG(red_flag_rating) as avgRisk
      FROM documents 
      WHERE evidence_type IS NOT NULL 
      GROUP BY evidence_type 
      ORDER BY count DESC
    `,
      )
      .all();
    console.timeEnd('analytics-docs-by-type');

    console.time('analytics-timeline');
    const timelineData = db
      .prepare(
        `
      SELECT 
        substr(date_created, 1, 7) as period,
        COUNT(*) as total,
        SUM(CASE WHEN evidence_type = 'email' THEN 1 ELSE 0 END) as emails,
        SUM(CASE WHEN evidence_type = 'photo' THEN 1 ELSE 0 END) as photos,
        SUM(CASE WHEN evidence_type = 'document' THEN 1 ELSE 0 END) as documents,
        SUM(CASE WHEN evidence_type = 'financial' THEN 1 ELSE 0 END) as financial
      FROM documents 
      WHERE date_created IS NOT NULL AND length(date_created) >= 7
      GROUP BY period 
      ORDER BY period ASC
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
      WHERE e.entity_type = 'Person'
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
        entities: db.prepare('SELECT COUNT(*) as count FROM entities').get().count,
        documents: db.prepare('SELECT COUNT(*) as count FROM documents').get().count,
        relationships: db.prepare('SELECT COUNT(*) as count FROM entity_relationships').get().count,
      },
      generatedAt: new Date().toISOString(),
    });
    console.timeEnd('analytics-total');
  } catch (error) {
    console.error('❌ Error fetching enhanced analytics:', error);
    next(error);
  }
});

export default router;
