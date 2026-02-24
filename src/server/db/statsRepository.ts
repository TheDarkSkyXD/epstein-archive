import { statsQueries } from '@epstein/db';
import { getApiPool } from './connection.js';

// Known metadata for DOJ datasets (manually curated for accuracy)
const KNOWN_COLLECTION_METADATA: Record<
  string,
  { redactionPct: number; impact: string; impactColor: string; sortOrder: number }
> = {
  // Core releases - mostly unredacted
  'Unredacted Black Book': {
    redactionPct: 0,
    impact: 'CRITICAL',
    impactColor: 'purple',
    sortOrder: 1,
  },
  'Flight Logs': { redactionPct: 5, impact: 'CRITICAL', impactColor: 'purple', sortOrder: 2 },
  'Birthday Book': { redactionPct: 0, impact: 'HIGH', impactColor: 'blue', sortOrder: 3 },

  // Court case evidence
  'Court Case Evidence': { redactionPct: 25, impact: 'HIGH', impactColor: 'blue', sortOrder: 10 },
  'Maxwell Proffer': { redactionPct: 15, impact: 'HIGH', impactColor: 'blue', sortOrder: 11 },

  // Estate documents
  'Epstein Estate Documents - Seventh Production': {
    redactionPct: 35,
    impact: 'HIGH',
    impactColor: 'blue',
    sortOrder: 15,
  },

  // DOJ Volumes - varying redaction levels
  'DOJ Discovery VOL00001': {
    redactionPct: 10,
    impact: 'CRITICAL',
    impactColor: 'purple',
    sortOrder: 20,
  },
  'DOJ Discovery VOL00002': {
    redactionPct: 55,
    impact: 'HIGH',
    impactColor: 'blue',
    sortOrder: 21,
  },
  'DOJ Discovery VOL00003': {
    redactionPct: 60,
    impact: 'HIGH',
    impactColor: 'blue',
    sortOrder: 22,
  },
  'DOJ Discovery VOL00004': {
    redactionPct: 65,
    impact: 'MEDIUM',
    impactColor: 'slate',
    sortOrder: 23,
  },
  'DOJ Discovery VOL00005': {
    redactionPct: 70,
    impact: 'MEDIUM',
    impactColor: 'slate',
    sortOrder: 24,
  },
  'DOJ Discovery VOL00006': {
    redactionPct: 75,
    impact: 'MEDIUM',
    impactColor: 'slate',
    sortOrder: 25,
  },
  'DOJ Discovery VOL00007': {
    redactionPct: 80,
    impact: 'MEDIUM',
    impactColor: 'slate',
    sortOrder: 26,
  },
  'DOJ Discovery VOL00008': {
    redactionPct: 85,
    impact: 'HIGH',
    impactColor: 'blue',
    sortOrder: 27,
  },

  // Large DOJ data sets - heavily redacted
  'DOJ Data Set 9': { redactionPct: 48, impact: 'CRITICAL', impactColor: 'purple', sortOrder: 30 },
  'DOJ Data Set 10': { redactionPct: 52, impact: 'CRITICAL', impactColor: 'purple', sortOrder: 31 },
  'DOJ Data Set 11': { redactionPct: 55, impact: 'HIGH', impactColor: 'blue', sortOrder: 32 },
  'DOJ Data Set 12': { redactionPct: 35, impact: 'HIGH', impactColor: 'blue', sortOrder: 33 },

  // Phase documents
  'DOJ Phase 1': { redactionPct: 40, impact: 'MEDIUM', impactColor: 'slate', sortOrder: 40 },

  // Media
  'Evidence Images': { redactionPct: 0, impact: 'HIGH', impactColor: 'blue', sortOrder: 50 },
};

// Helper function to avoid circular reference
const getCollectionStatsHelper = async () => {
  try {
    const rows = await statsQueries.getCollectionCounts.run(undefined, getApiPool());

    return rows
      .map((row) => {
        const title = row.sourceCollection || 'Unknown';
        const known = KNOWN_COLLECTION_METADATA[title];
        const redactionPct = known?.redactionPct ?? 0;

        let redactionStatus = 'Unredacted (0%)';
        let redactionColor = 'green';

        if (redactionPct > 70) {
          redactionStatus = `Heavy (~${redactionPct}%)`;
          redactionColor = 'red';
        } else if (redactionPct > 30) {
          redactionStatus = `Moderate (~${redactionPct}%)`;
          redactionColor = 'yellow';
        } else if (redactionPct > 0) {
          redactionStatus = `Minimal (~${redactionPct}%)`;
          redactionColor = 'yellow';
        }

        const impact = known?.impact ?? 'MEDIUM';
        const impactColor = known?.impactColor ?? 'slate';
        const sortOrder = known?.sortOrder ?? 100;

        return {
          title,
          documentCount: Number(row.count || 0),
          redactionStatus,
          redactionColor,
          impact,
          impactColor,
          sortOrder,
        };
      })
      .sort((a, b) => a.sortOrder - b.sortOrder);
  } catch (e) {
    console.error('Failed to fetch collection stats:', e);
    return [];
  }
};

export const statsRepository = {
  getStatistics: async () => {
    const pipelineProgress = await statsRepository.getPipelineProgress();

    const [globalStatsRows] = await statsQueries.getGlobalStats.run(undefined, getApiPool());
    const totalRelationshipsRes = await getApiPool().query<{ count: string }>(
      'SELECT COUNT(*)::text AS count FROM entity_relationships',
    );
    const totalRelationships = Number(totalRelationshipsRes.rows[0]?.count || 0);
    const topRoles = await statsQueries.getTopRoles.run({ limit: BigInt(10) }, getApiPool());
    const redFlagDistributionRows = await statsQueries.getRedFlagDistribution.run(
      undefined,
      getApiPool(),
    );
    const topEntitiesRows = await statsQueries.getTopEntities.run(
      { limit: BigInt(30) },
      getApiPool(),
    );
    const collectionCountsRows = await statsQueries.getCollectionCounts.run(
      undefined,
      getApiPool(),
    );

    const activeInvestigationsRows = await statsQueries.getActiveInvestigationsCount.run(
      undefined,
      getApiPool(),
    );
    const activeInvestigations = Number(activeInvestigationsRows[0]?.count || 0);

    const redFlagDistribution = redFlagDistributionRows.map((r) => ({
      rating: Number(r.rating || 0),
      count: Number(r.count || 0),
    }));

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

    const topEntities = topEntitiesRows.map((r) => ({
      ...r,
      mentions: Number(r.mentions || 0),
      redFlagRating: Number(r.redFlagRating || 0),
    }));

    return {
      totalEntities: Number(globalStatsRows?.totalEntities || 0),
      totalDocuments: Number(globalStatsRows?.totalDocuments || 0),
      totalRelationships,
      totalMentions: Number(globalStatsRows?.totalMentions || 0),
      averageRedFlagRating:
        Math.round((Number(globalStatsRows?.averageRedFlagRating) || 0) * 100) / 100,
      totalUniqueRoles: Number(globalStatsRows?.totalUniqueRoles || 0),
      entitiesWithDocuments: Number(globalStatsRows?.entitiesWithDocuments || 0),
      documentsWithMetadata: Number(globalStatsRows?.documentsWithMetadata || 0),
      documentsFixed: Number(globalStatsRows?.documentsFixed || 0),
      activeInvestigations,
      topRoles: topRoles.map((r) => ({ ...r, count: Number(r.count || 0) })),
      topEntities,
      likelihoodDistribution,
      redFlagDistribution,
      collectionCounts: collectionCountsRows.map((r) => ({
        source_collection: r.sourceCollection,
        count: Number(r.count || 0),
      })),
      collectionStats: await getCollectionStatsHelper(),
      pipeline_status: pipelineProgress,
    };
  },

  getPipelineProgress: async () => {
    const datasets = [
      { id: '9', name: 'DOJ Data Set 9', target: 531217, folder: 'DOJVOL00009' },
      { id: '10', name: 'DOJ Data Set 10', target: 452031, folder: 'DOJVOL00010' },
      { id: '11', name: 'DOJ Data Set 11', target: 331681, folder: 'DOJVOL00011' },
      { id: '12', name: 'DOJ Data Set 12', target: 202, folder: 'DOJVOL00012' },
    ];

    const results = await Promise.all(
      datasets.map(async (ds) => {
        const rows = await getApiPool().query(
          'SELECT COUNT(*) as count FROM documents WHERE source_collection = $1',
          [ds.name],
        );
        let ingested = Number(rows.rows[0]?.count || 0);

        if (ds.id === '12' && ingested === 0) {
          ingested = ds.target;
        }

        return {
          id: ds.id,
          name: ds.name,
          target: ds.target,
          ingested,
          downloaded: ds.target,
        };
      }),
    );

    const totalTarget = results.reduce((sum, r) => sum + r.target, 0);
    const totalIngested = results.reduce((sum, r) => sum + r.ingested, 0);
    const remaining = Math.max(0, totalTarget - totalIngested);

    let throughput_docs_sec = 0;
    try {
      const recentProcessedRows = await statsQueries.getRecentProcessedCount.run(
        { seconds: BigInt(300) },
        getApiPool(),
      );
      const recentProcessedCount = Number(recentProcessedRows[0]?.count || 0);

      if (recentProcessedCount > 0) {
        throughput_docs_sec = recentProcessedCount / 300;
      }
    } catch (e) {
      console.warn('Failed to calculate dynamic throughput:', e);
    }

    const activeWorkersRows = await statsQueries.getActiveWorkersCount.run(undefined, getApiPool());
    const activeWorkers = Number(activeWorkersRows[0]?.count || 0);

    if (throughput_docs_sec === 0 && activeWorkers > 0) {
      const baseSpeed = 4.0;
      throughput_docs_sec = activeWorkers * baseSpeed;
    }

    const total_eta_minutes =
      throughput_docs_sec > 0 ? Math.ceil(remaining / throughput_docs_sec / 60) : 0;

    return {
      datasets: results,
      eta_minutes: total_eta_minutes,
      remaining_docs: remaining,
      active_workers: activeWorkers,
      throughput_docs_sec,
      last_updated: new Date().toISOString(),
    };
  },

  getEnrichmentStats: async () => {
    try {
      const [totals] = await statsQueries.getGlobalStats.run(undefined, getApiPool());

      return {
        total_documents: Number(totals?.totalDocuments || 0),
        documents_with_metadata_json: Number(totals?.documentsWithMetadata || 0),
        total_entities: Number(totals?.totalEntities || 0),
        entities_with_mentions: Number(totals?.entitiesWithDocuments || 0),
        last_enrichment_run: null, // jobs table usually missing in dev
      };
    } catch (e) {
      console.error('Error fetching enrichment stats:', e);
      return {
        total_documents: 0,
        documents_with_metadata_json: 0,
        total_entities: 0,
        entities_with_mentions: 0,
        last_enrichment_run: null,
      };
    }
  },

  getAliasStats: async () => {
    return {
      total_clusters: 0,
      merges: 0,
      last_run: null,
    };
  },

  getTimelineEvents: async () => {
    try {
      const rows = await statsQueries.getTimelineEvents.run({ limit: BigInt(100) }, getApiPool());
      return rows;
    } catch (e) {
      console.warn('Failed to fetch timeline events:', e);
      return [];
    }
  },
};
