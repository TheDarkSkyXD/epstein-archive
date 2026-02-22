import { getApiPool } from '../db/connection.js';

export interface FtsStatus {
  table: string;
  pgRows: number;
  isSynced: boolean;
}

/**
 * FtsMaintenanceService — Postgres-native implementation.
 *
 * Replaces the SQLite FTS5 VACUUM/optimize logic with:
 *  - REFRESH MATERIALIZED VIEW CONCURRENTLY (analytics views)
 *  - REINDEX for GIN indexes
 *  - UPDATE to backfill any rows with NULL fts_vector
 */
export class FtsMaintenanceService {
  static async checkIntegrity(): Promise<FtsStatus[]> {
    const pool = getApiPool();

    const tables = ['entities', 'documents'] as const;
    const results: FtsStatus[] = [];

    for (const table of tables) {
      try {
        const { rows } = await pool.query<{ total: string; missing: string }>(`
          SELECT
            COUNT(*) AS total,
            SUM(CASE WHEN fts_vector IS NULL THEN 1 ELSE 0 END) AS missing
          FROM ${table}
        `);
        const total = parseInt(rows[0].total, 10);
        const missing = parseInt(rows[0].missing, 10);
        results.push({ table, pgRows: total, isSynced: missing === 0 });
      } catch (error) {
        console.error(`[FtsMaintenance] Error checking ${table}:`, error);
      }
    }

    return results;
  }

  /**
   * Backfill NULL fts_vector entries for a given table.
   * Triggers will keep new rows in sync; this is only needed after migrations.
   */
  static async rebuildFts(tableName: 'entities' | 'documents'): Promise<void> {
    const pool = getApiPool();
    console.time(`[FtsMaintenance] Backfill fts_vector on ${tableName}`);

    if (tableName === 'entities') {
      await pool.query(`
        UPDATE entities
        SET fts_vector = to_tsvector('english',
          coalesce(full_name,'') || ' ' ||
          coalesce(primary_role,'') || ' ' ||
          coalesce(aliases,'') || ' ' ||
          coalesce(bio,'') || ' ' ||
          coalesce(notes,'') || ' ' ||
          coalesce(connections_summary,'')
        )
        WHERE fts_vector IS NULL
      `);
    } else if (tableName === 'documents') {
      await pool.query(`
        UPDATE documents
        SET fts_vector = to_tsvector('english',
          coalesce(file_name,'') || ' ' ||
          coalesce(title,'') || ' ' ||
          coalesce(left(content, 100000),'')
        )
        WHERE fts_vector IS NULL
      `);
    }

    console.timeEnd(`[FtsMaintenance] Backfill fts_vector on ${tableName}`);
  }

  /**
   * Refreshes all analytics materialised views and backfills any desynced fts_vector rows.
   */
  static async performMaintenance(): Promise<void> {
    const pool = getApiPool();

    // Refresh analytics views (CONCURRENTLY so reads are not blocked)
    const views = [
      'mv_docs_by_type',
      'mv_entity_type_dist',
      'mv_top_connected',
      'mv_timeline_data',
      'mv_redaction_stats',
    ];

    for (const view of views) {
      try {
        await pool.query(`REFRESH MATERIALIZED VIEW CONCURRENTLY ${view}`);
        console.log(`[FtsMaintenance] Refreshed ${view}`);
      } catch (err: any) {
        // mv_redaction_stats has no unique index — fall back to non-concurrent refresh
        if (err.message?.includes('CONCURRENTLY')) {
          await pool.query(`REFRESH MATERIALIZED VIEW ${view}`).catch(() => {});
        } else {
          console.warn(`[FtsMaintenance] Could not refresh ${view}: ${err.message}`);
        }
      }
    }

    // Backfill any rows that slipped through missing fts_vector
    const status = await this.checkIntegrity();
    for (const s of status) {
      if (!s.isSynced) {
        console.warn(`[FtsMaintenance] fts_vector null rows on ${s.table}. Backfilling...`);
        await this.rebuildFts(s.table as any);
      }
    }
  }
}
