import { getDb } from '../db/connection.js';

export interface FtsStatus {
  table: string;
  sourceCount: number;
  ftsCount: number;
  isSynced: boolean;
}

export class FtsMaintenanceService {
  /**
   * Check synchronization status of FTS tables
   */
  static async checkIntegrity(): Promise<FtsStatus[]> {
    const db = getDb();
    const tables = [
      { name: 'entities', fts: 'entities_fts' },
      // { name: 'documents', fts: 'documents_fts' },
      // { name: 'media_items', fts: 'media_items_fts' },
    ];

    const results: FtsStatus[] = [];

    for (const table of tables) {
      try {
        const sourceCount = (db.prepare(`SELECT COUNT(*) as count FROM ${table.name}`).get() as any)
          .count;
        const ftsCount = (db.prepare(`SELECT COUNT(*) as count FROM ${table.fts}`).get() as any)
          .count;

        results.push({
          table: table.name,
          sourceCount,
          ftsCount,
          isSynced: sourceCount === ftsCount,
        });
      } catch (error) {
        console.error(`Error checking integrity for ${table.name}:`, error);
      }
    }

    return results;
  }

  /**
   * Rebuild an FTS table from its source
   */
  static async rebuildFts(tableName: 'entities' | 'documents' | 'media_items'): Promise<void> {
    const db = getDb();
    const ftsName = tableName === 'media_items' ? 'media_items_fts' : `${tableName}_fts`;

    console.time(`Rebuilding ${ftsName}`);

    // We use a transaction for safety
    db.transaction(() => {
      // Clear FTS table
      db.prepare(`DELETE FROM ${ftsName}`).run();

      // Re-insert based on table type
      if (tableName === 'entities') {
        db.prepare(
          `
          INSERT INTO entities_fts (rowid, full_name, primary_role, connections_summary)
          SELECT id, full_name, primary_role, connections_summary FROM entities
        `,
        ).run();
      } else if (tableName === 'documents') {
        db.prepare(
          `
          INSERT INTO documents_fts (rowid, file_name, content_preview, evidence_type, content)
          SELECT id, file_name, content_preview, evidence_type, content FROM documents
        `,
        ).run();
      } else if (tableName === 'media_items') {
        db.prepare(
          `
          INSERT INTO media_items_fts (rowid, title, description)
          SELECT id, title, description FROM media_items
        `,
        ).run();
      }
    })();

    console.timeEnd(`Rebuilding ${ftsName}`);
  }

  /**
   * Run a full maintenance check and fix desyncs
   */
  static async performMaintenance(): Promise<void> {
    const status = await this.checkIntegrity();
    for (const s of status) {
      if (!s.isSynced) {
        console.warn(
          `Desync detected in ${s.table}: Source=${s.sourceCount}, FTS=${s.ftsCount}. Rebuilding...`,
        );
        await this.rebuildFts(s.table as any);
      }
    }

    // Optimize indices (VACUUM is handled elsewhere, but we can do it here too if needed)
    const db = getDb();
    db.exec("INSERT INTO entities_fts(entities_fts) VALUES('optimize')");
    db.exec("INSERT INTO documents_fts(documents_fts) VALUES('optimize')");
  }
}
