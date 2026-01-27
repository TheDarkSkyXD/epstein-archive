import { getDb } from './connection.js';

export const statsRepository = {
  getStatistics: () => {
    const db = getDb();

    // Aggregate stats query
    const stats = db
      .prepare(
        `
      SELECT 
        (SELECT COUNT(*) FROM entities) as totalEntities,
        (SELECT COUNT(*) FROM documents) as totalDocuments,
        (SELECT COALESCE(SUM(mentions), 0) FROM entities) as totalMentions,
        (SELECT AVG(red_flag_rating) FROM entities) as averageRedFlagRating,
        (SELECT COUNT(DISTINCT primary_role) FROM entities WHERE primary_role IS NOT NULL AND primary_role != '') as totalUniqueRoles,
        (SELECT COUNT(*) FROM entities WHERE mentions > 0) as entitiesWithDocuments,
        (SELECT COUNT(*) FROM documents WHERE metadata_json IS NOT NULL AND LENGTH(metadata_json) > 2) as documentsWithMetadata,
        (SELECT COUNT(*) FROM investigations WHERE status = 'active' OR status = 'open') as activeInvestigations
    `,
      )
      .get() as any;

    const topRoles = db
      .prepare(
        `
      SELECT primary_role as role, COUNT(*) as count 
      FROM entities 
      WHERE primary_role IS NOT NULL AND primary_role != ''
      GROUP BY primary_role 
      ORDER BY count DESC
      LIMIT 10
    `,
      )
      .all() as { role: string; count: number }[];

    // Get red_flag_rating distribution (1-5 scale)
    const redFlagDistribution = db
      .prepare(
        `
      SELECT red_flag_rating as rating, COUNT(*) as count
      FROM entities
      WHERE red_flag_rating IS NOT NULL
      GROUP BY red_flag_rating
      ORDER BY red_flag_rating ASC
    `,
      )
      .all() as { rating: number; count: number }[];

    // Compute likelihoodDistribution from red_flag_rating for better analytics
    const likelihoodDistribution = [
      {
        level: 'HIGH',
        count: redFlagDistribution.filter((r) => r.rating >= 4).reduce((a, b) => a + b.count, 0),
      },
      {
        level: 'MEDIUM',
        count: redFlagDistribution
          .filter((r) => r.rating >= 2 && r.rating < 4)
          .reduce((a, b) => a + b.count, 0),
      },
      {
        level: 'LOW',
        count: redFlagDistribution.filter((r) => r.rating < 2).reduce((a, b) => a + b.count, 0),
      },
    ];

    // Get top entities by mentions - ONLY Person type, with VIP name consolidation
    // Uses CASE to consolidate known variants into canonical names
    // AGGRESSIVE consolidation - only allow exact person references, not phrases
    const topEntities = db
      .prepare(
        `
      SELECT 
        CASE 
          -- Trump variants -> Donald Trump (ONLY actual person references)
          WHEN (full_name = 'Donald Trump' OR full_name = 'President Trump' OR full_name = 'Mr Trump'
                OR full_name = 'Trump' OR full_name = 'Donald J Trump' OR full_name = 'Donald J. Trump')
          THEN 'Donald Trump'
          -- Epstein variants -> Jeffrey Epstein  
          WHEN (full_name = 'Jeffrey Epstein' OR full_name = 'Epstein' OR full_name = 'Jeffrey'
                OR full_name = 'Jeff Epstein' OR full_name = 'Mr Epstein')
          THEN 'Jeffrey Epstein'
          -- Maxwell variants -> Ghislaine Maxwell
          WHEN (full_name = 'Ghislaine Maxwell' OR full_name = 'Maxwell' OR full_name = 'Ghislaine'
                OR full_name = 'Ms Maxwell' OR full_name = 'Miss Maxwell')
          THEN 'Ghislaine Maxwell'
          -- Clinton variants -> Bill Clinton (excluding Hillary)
          WHEN (full_name = 'Bill Clinton' OR full_name = 'President Clinton' OR full_name = 'Mr Clinton'
                OR full_name = 'Clinton' OR full_name = 'William Clinton')
               AND lower(full_name) NOT LIKE '%hillary%' AND lower(full_name) NOT LIKE '%chelsea%'
          THEN 'Bill Clinton'
          -- Prince Andrew
          WHEN (full_name = 'Prince Andrew' OR full_name = 'Duke of York' OR full_name = 'Andrew'
                OR lower(full_name) LIKE '%prince andrew%')
          THEN 'Prince Andrew'
          -- Dershowitz
          WHEN (full_name = 'Alan Dershowitz' OR full_name = 'Dershowitz' OR full_name = 'Mr Dershowitz')
          THEN 'Alan Dershowitz'
          -- Ivanka Trump (separate person)
          WHEN full_name = 'Ivanka Trump' OR full_name = 'Ivanka'
          THEN 'Ivanka Trump'
          -- Melania Trump (separate person)
          WHEN full_name = 'Melania Trump' OR full_name = 'Melania'
          THEN 'Melania Trump'
          ELSE full_name
        END as name,
        SUM(mentions) as mentions,
        MAX(red_flag_rating) as redFlagRating
      FROM entities
      WHERE mentions > 0 
      AND (entity_type = 'Person' OR entity_type IS NULL)
      AND full_name NOT LIKE 'The %'
      AND full_name NOT LIKE '% Like'
      AND full_name NOT LIKE '% Like %'
      AND full_name NOT LIKE 'They %'
      AND full_name NOT LIKE '% Printed%'
      AND full_name NOT LIKE '% Towers'
      AND full_name NOT LIKE 'Multiple %'
      AND full_name NOT LIKE '% Mac %'
      AND full_name NOT LIKE '%Desktop%'
      AND full_name NOT LIKE 'Estate %'
      AND full_name NOT LIKE '% Estate'
      AND full_name NOT LIKE 'Closed %'
      AND full_name NOT LIKE '%Contai%'
      AND full_name NOT LIKE '%sensit%'
      AND full_name NOT LIKE '% Street'
      AND full_name NOT LIKE '% Beach'
      AND full_name NOT LIKE '% Cliffs'
      AND full_name NOT LIKE '% James'
      AND full_name NOT LIKE '% Island'
      AND full_name NOT LIKE 'New %'
      AND full_name NOT LIKE '%Mexico'
      AND full_name NOT LIKE '%York%'
      AND full_name NOT LIKE '% Times'
      AND length(full_name) > 3
      AND full_name NOT GLOB '*[0-9]*'
      -- Additional junk filters for banking terms, companies, truncated names
      AND full_name NOT LIKE '%Pricing'
      AND full_name NOT LIKE '%Checking'
      AND full_name NOT LIKE '%Subtractions'
      AND full_name NOT LIKE '%Additions'
      AND full_name NOT LIKE '%Interest %'
      AND full_name NOT LIKE 'Your %'
      AND full_name NOT LIKE 'Other %'
      AND full_name NOT LIKE '%Advantage%'
      AND full_name NOT LIKE 'sted %'
      AND full_name NOT LIKE 'iered %'
      AND full_name NOT LIKE '%Automobiles'
      AND full_name NOT LIKE 'Zorro %'
      AND full_name NOT LIKE 'Zeero %'
      AND full_name NOT LIKE '%Management Group'
      AND full_name NOT LIKE 'estigative %'
      AND full_name NOT LIKE 'Contact Us'
      AND full_name NOT LIKE '% Group'
      AND full_name NOT LIKE '% Inc'
      AND full_name NOT LIKE '% LLC'
      AND full_name NOT LIKE '% Corp'
      AND full_name NOT LIKE '% Ltd'
      AND full_name NOT LIKE 'St Thomas'
      AND full_name NOT LIKE 'St %'
      -- Exclude phrase-based junk ("X And", "X Is", "X To", "With X", etc.)
      AND full_name NOT LIKE '% And'
      AND full_name NOT LIKE '% And %'
      AND full_name NOT LIKE '% Is'
      AND full_name NOT LIKE '% Is %'
      AND full_name NOT LIKE '% To'
      AND full_name NOT LIKE '% To %'
      AND full_name NOT LIKE 'With %'
      AND full_name NOT LIKE 'As %'
      AND full_name NOT LIKE 'After %'
      AND full_name NOT LIKE '% The'
      AND full_name NOT LIKE '% But'
      AND full_name NOT LIKE '% But %'
      AND full_name NOT LIKE 'Team %'
      AND full_name NOT LIKE '% Importance'
      AND full_name NOT LIKE '% Administration'
      AND full_name NOT LIKE '% Campaign'
      AND full_name NOT LIKE '% Tower'
      AND full_name NOT LIKE '% Towers'
      -- Explicit User Reported Junk
      AND full_name NOT LIKE 'They Like'
      AND full_name NOT LIKE 'Judge Prior'
      AND full_name NOT LIKE 'Judge Printed'
      AND full_name NOT LIKE 'New York Times' -- Should be Media
      AND full_name NOT LIKE 'New Mexico' -- Should be Location
      AND full_name NOT LIKE 'Estate %'
      AND full_name NOT LIKE '% Estate'
      AND full_name NOT LIKE 'Multiple %'
      AND full_name NOT LIKE 'Closed %'
      AND full_name NOT LIKE 'Other Additions%'
      AND full_name NOT LIKE '% Desktops'
      AND full_name NOT LIKE '% Mac %'
      -- Exclude names starting with lowercase (truncated/partial)
      AND full_name NOT GLOB '[a-z]*'
      GROUP BY name
      ORDER BY mentions DESC
      LIMIT 30
    `,
      )
      .all() as { name: string; mentions: number; redFlagRating: number }[];

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
      redFlagDistribution,
    };
  },

  getEnrichmentStats: () => {
    const db = getDb();
    const totals = db
      .prepare(
        `
      SELECT 
        (SELECT COUNT(*) FROM documents) as total_documents,
        (SELECT COUNT(*) FROM documents WHERE metadata_json IS NOT NULL AND metadata_json <> '') as documents_with_metadata_json,
        (SELECT COUNT(*) FROM entities) as total_entities,
        0 as entities_with_mentions
    `,
      )
      .get() as any;

    const last = db
      .prepare(
        `SELECT finished_at FROM jobs WHERE job_type='relationships_recompute' AND status='success' ORDER BY finished_at DESC LIMIT 1`,
      )
      .get() as any;

    return {
      total_documents: totals.total_documents || 0,
      documents_with_metadata_json: totals.documents_with_metadata_json || 0,
      total_entities: totals.total_entities || 0,
      entities_with_mentions: 0,
      last_enrichment_run: last ? last.finished_at : null,
    };
  },

  getAliasStats: () => {
    const db = getDb();
    const mergesRow = db
      .prepare(`SELECT COUNT(*) as merges FROM merge_log WHERE reason='alias_cluster'`)
      .get() as any;
    const lastRow = db
      .prepare(
        `SELECT finished_at FROM jobs WHERE job_type='alias_cluster' AND status='success' ORDER BY finished_at DESC LIMIT 1`,
      )
      .get() as any;
    return {
      total_clusters: mergesRow?.merges || 0,
      merges: mergesRow?.merges || 0,
      last_run: lastRow ? lastRow.finished_at : null,
    };
  },

  getTimelineEvents: () => {
    const db = getDb();
    try {
      // First try to get actual timeline events
      let rows = db
        .prepare(
          `
        SELECT 
          te.event_date as date,
          te.event_description as description,
          te.event_type as type,
          d.file_name as title,
          d.id as document_id,
          e.full_name as primary_entity,
          CASE 
            WHEN CAST(te.event_date AS INTEGER) >= 8 THEN 'high'
            WHEN CAST(te.event_date AS INTEGER) >= 5 THEN 'medium'
            ELSE 'low'
          END as significance_score
        FROM timeline_events te
        LEFT JOIN documents d ON te.document_id = d.id
        LEFT JOIN entities e ON te.entity_id = e.id
        WHERE te.event_date IS NOT NULL
        ORDER BY te.event_date DESC
        LIMIT 100
      `,
        )
        .all();

      // If no timeline events, try to generate from documents
      if (rows.length === 0) {
        rows = db
          .prepare(
            `
          SELECT 
            d.date_created as date,
            d.content_preview as description,
            d.evidence_type as type,
            d.file_name as title,
            d.id as document_id,
            NULL as primary_entity,
            CASE 
              WHEN d.red_flag_rating >= 8 THEN 'high'
              WHEN d.red_flag_rating >= 5 THEN 'medium'
              ELSE 'low'
            END as significance_score
          FROM documents d
          WHERE d.date_created IS NOT NULL AND d.date_created != ''
          ORDER BY d.date_created DESC
          LIMIT 50
        `,
          )
          .all();
      }

      return rows;
    } catch (e) {
      console.warn('Failed to fetch timeline events:', e);
      return [];
    }
  },
};
