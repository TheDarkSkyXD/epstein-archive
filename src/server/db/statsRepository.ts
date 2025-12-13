import { getDb } from './connection.js';

export const statsRepository = {
  getStatistics: () => {
    const db = getDb();
    
    // Aggregate stats query
    const stats = db.prepare(`
      SELECT 
        (SELECT COUNT(*) FROM entities) as totalEntities,
        (SELECT COUNT(*) FROM documents) as totalDocuments,
        (SELECT COALESCE(SUM(mentions), 0) FROM entities) as totalMentions,
        (SELECT AVG(red_flag_rating) FROM entities) as averageRedFlagRating,
        (SELECT COUNT(DISTINCT role) FROM entities WHERE role IS NOT NULL AND role != '') as totalUniqueRoles,
        (SELECT COUNT(*) FROM entities WHERE mentions > 0) as entitiesWithDocuments,
        (SELECT COUNT(*) FROM documents WHERE metadata_json IS NOT NULL AND LENGTH(metadata_json) > 2) as documentsWithMetadata,
        (SELECT COUNT(*) FROM investigations WHERE status = 'active' OR status = 'open') as activeInvestigations
    `).get() as any;

    const topRoles = db.prepare(`
      SELECT role, COUNT(*) as count 
      FROM entities 
      WHERE role IS NOT NULL AND role != ''
      GROUP BY role 
      ORDER BY count DESC
      LIMIT 10
    `).all() as { role: string; count: number }[];

    // Get red_flag_rating distribution (1-5 scale)
    const redFlagDistribution = db.prepare(`
      SELECT red_flag_rating as rating, COUNT(*) as count
      FROM entities
      WHERE red_flag_rating IS NOT NULL
      GROUP BY red_flag_rating
      ORDER BY red_flag_rating ASC
    `).all() as { rating: number; count: number }[];

    // Compute likelihoodDistribution from red_flag_rating for better analytics
    const likelihoodDistribution = [
      { level: 'HIGH', count: redFlagDistribution.filter(r => r.rating >= 4).reduce((a, b) => a + b.count, 0) },
      { level: 'MEDIUM', count: redFlagDistribution.filter(r => r.rating >= 2 && r.rating < 4).reduce((a, b) => a + b.count, 0) },
      { level: 'LOW', count: redFlagDistribution.filter(r => r.rating < 2).reduce((a, b) => a + b.count, 0) }
    ];

    // Get top entities by mentions
    const topEntities = db.prepare(`
      SELECT full_name as name, mentions, red_flag_rating as redFlagRating
      FROM entities
      WHERE mentions > 0 
      AND full_name NOT LIKE 'The %'
      ORDER BY mentions DESC
      LIMIT 20
    `).all() as { name: string; mentions: number; redFlagRating: number }[];

    return {
      totalEntities: stats.totalEntities,
      totalDocuments: stats.totalDocuments,
      totalMentions: stats.totalMentions,
      averageRedFlagRating: Math.round((stats.averageRedFlagRating || 0) * 100) / 100,
      totalUniqueRoles: stats.totalUniqueRoles,
      entitiesWithDocuments: stats.entitiesWithDocuments,
      documentsWithMetadata: stats.documentsWithMetadata,
      activeInvestigations: stats.activeInvestigations,
      topRoles,
      topEntities,
      likelihoodDistribution,
      redFlagDistribution
    };
  },

  getEnrichmentStats: () => {
    const db = getDb();
    const totals = db.prepare(`
      SELECT 
        (SELECT COUNT(*) FROM documents) as total_documents,
        (SELECT COUNT(*) FROM documents WHERE metadata_json IS NOT NULL AND metadata_json <> '') as documents_with_metadata_json,
        (SELECT COUNT(*) FROM entities) as total_entities,
        0 as entities_with_mentions
    `).get() as any;
    
    const last = db.prepare(`SELECT finished_at FROM jobs WHERE job_type='relationships_recompute' AND status='success' ORDER BY finished_at DESC LIMIT 1`).get() as any;
    
    return {
      total_documents: totals.total_documents || 0,
      documents_with_metadata_json: totals.documents_with_metadata_json || 0,
      total_entities: totals.total_entities || 0,
      entities_with_mentions: 0,
      last_enrichment_run: last ? last.finished_at : null
    };
  },

  getAliasStats: () => {
    const db = getDb();
    const mergesRow = db.prepare(`SELECT COUNT(*) as merges FROM merge_log WHERE reason='alias_cluster'`).get() as any;
    const lastRow = db.prepare(`SELECT finished_at FROM jobs WHERE job_type='alias_cluster' AND status='success' ORDER BY finished_at DESC LIMIT 1`).get() as any;
    return { total_clusters: mergesRow?.merges || 0, merges: mergesRow?.merges || 0, last_run: lastRow ? lastRow.finished_at : null };
  },

  getTimelineEvents: () => {
    const db = getDb();
    try {
      return db.prepare(`
        SELECT 
          id, 
          title, 
          date, 
          description, 
          event_type as type,
          confidence
        FROM investigation_timeline_events 
        ORDER BY date DESC 
        LIMIT 50
      `).all();
    } catch (e) {
      console.warn('Failed to fetch timeline events (table might be missing):', e);
      return [];
    }
  }
};