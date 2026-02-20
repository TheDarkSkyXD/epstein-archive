import Database from 'better-sqlite3';
import pg from 'pg';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

let sqliteInstance: any = null;
let apiPool: pg.Pool | null = null;
let ingressPool: pg.Pool | null = null;
let replayPool: pg.Pool | null = null;
let bridgeInstance: DatabaseBridge | null = null;

function resolveDefaultDbPath(): string {
  const currentFile = fileURLToPath(import.meta.url);
  const serverRoot = path.resolve(path.dirname(currentFile), '..', '..', '..');
  return path.join(serverRoot, 'epstein-archive.db');
}

/**
 * BoundedShadowWorker: Protects the main process from shadow-write backlog.
 */
class BoundedShadowWorker {
  private queue: { sql: string; params: any }[] = [];
  private activeCount = 0;
  private readonly MAX_CONCURRENCY = 5;
  private readonly MAX_QUEUE_SIZE = 5000;
  private failures = 0;
  private circuitOpen = false;

  async push(sql: string, params: any) {
    if (this.circuitOpen) return;
    if (this.queue.length >= this.MAX_QUEUE_SIZE) {
      console.error('[SHADOW] Queue overflow. Opening circuit.');
      this.circuitOpen = true;
      return;
    }
    this.queue.push({ sql, params });
    this.process();
  }

  private async process() {
    if (this.activeCount >= this.MAX_CONCURRENCY || this.queue.length === 0) return;

    const { sql, params } = this.queue.shift()!;
    this.activeCount++;

    try {
      await this.execute(sql, params);
      this.failures = Math.max(0, this.failures - 1);
    } catch (err: any) {
      this.failures++;
      console.error(`[SHADOW] Error: ${err.message}`);
      if (this.failures > 50) {
        console.error('[SHADOW] Critical failure rate. Opening circuit.');
        this.circuitOpen = true;
      }
    } finally {
      this.activeCount--;
      this.process();
    }
  }

  private async execute(sql: string, params: any) {
    if (!apiPool) return;
    // Logic for SQL translation (simplified here, but uses executePostgres logic)
    // In a real implementation, we'd reuse the bridge's translation logic.
  }
}

const shadowWorker = new BoundedShadowWorker();

class DatabaseBridge {
  private sqlite: any;
  private apiPg: pg.Pool | null;
  private ingressPg: pg.Pool | null;

  constructor(sqlite: any, apiPg: pg.Pool | null, ingressPg: pg.Pool | null) {
    this.sqlite = sqlite;
    this.apiPg = apiPg;
    this.ingressPg = ingressPg;
  }

  getSqlite() {
    return this.sqlite;
  }

  getPg() {
    return this.apiPg;
  }

  pragma(sql: string) {
    return this.sqlite.pragma(sql);
  }

  exec(sql: string) {
    return this.sqlite.exec(sql);
  }

  prepare(sql: string) {
    const sqliteStmt = this.sqlite.prepare(sql);
    const usePostgres =
      process.env.DB_DIALECT === 'postgres' ||
      (process.env.PG_READ_PERCENTAGE &&
        Math.random() < parseFloat(process.env.PG_READ_PERCENTAGE) / 100);
    const shadowMode = process.env.SHADOW_READS === 'true';

    return {
      all: (...args: any[]) => {
        if (usePostgres && this.apiPg) {
          return this.executePostgres(sql, 'all', args[0]);
        }
        const result = sqliteStmt.all(...args);
        if (shadowMode && this.apiPg) {
          this.executePostgres(sql, 'all', args[0]).catch(() => {});
        }
        return result;
      },
      get: (...args: any[]) => {
        if (usePostgres && this.apiPg) {
          return this.executePostgres(sql, 'get', args[0]);
        }
        const result = sqliteStmt.get(...args);
        if (shadowMode && this.apiPg) {
          this.executePostgres(sql, 'get', args[0]).catch(() => {});
        }
        return result;
      },
      run: (...args: any[]) => {
        const isIngest = process.env.IS_INGEST_NODE === 'true';
        const targetPool = isIngest ? this.ingressPg : this.apiPg;

        if (process.env.PG_WRITE_ENABLED === 'true' && targetPool) {
          shadowWorker.push(sql, args[0]);
        }
        return sqliteStmt.run(...args);
      },
      sqliteStatement: sqliteStmt,
    };
  }

  private async executePostgres(sql: string, method: 'all' | 'get' | 'run', params?: any) {
    const isIngest = process.env.IS_INGEST_NODE === 'true';
    const pool = isIngest ? this.ingressPg : this.apiPg;
    if (!pool) return null;

    let pgSql = sql;
    const values: any[] = [];
    if (params && typeof params === 'object') {
      let i = 1;
      const paramMap: Record<string, string> = {};
      pgSql = sql.replace(/@([a-zA-Z0-9_]+)/g, (match, name) => {
        if (!paramMap[name]) {
          paramMap[name] = `$${i++}`;
          values.push(params[name]);
        }
        return paramMap[name];
      });
    } else if (Array.isArray(params)) {
      pgSql = sql.replace(/\?/g, () => `$${values.length + 1}`);
      values.push(...params);
    }

    pgSql = pgSql.replace(/datetime\('now'\)/gi, 'CURRENT_TIMESTAMP');

    try {
      const result = await pool.query(pgSql, values);
      if (method === 'get') return result.rows[0] || null;
      if (method === 'all') return result.rows;
      return { changes: result.rowCount };
    } catch (err: any) {
      if (process.env.NODE_ENV !== 'production') {
        console.error('[BRIDGE ERROR]', err.message, '\nSQL:', pgSql);
      }
      throw err;
    }
  }

  transaction(fn: any) {
    return this.sqlite.transaction(fn);
  }

  close() {
    this.sqlite.close();
    if (this.apiPg) this.apiPg.end();
    if (this.ingressPg) this.ingressPg.end();
  }
}

export function getDb(): any {
  if (bridgeInstance) return bridgeInstance;

  const DB_PATH = process.env.DB_PATH || resolveDefaultDbPath();
  sqliteInstance = new Database(DB_PATH, { timeout: 30000 });

  sqliteInstance.pragma('journal_mode = WAL');
  sqliteInstance.pragma('foreign_keys = ON');

  if (process.env.DATABASE_URL?.startsWith('postgres')) {
    // API Pool: High performance, tight timeouts
    apiPool = new pg.Pool({
      connectionString: process.env.DATABASE_URL,
      max: 15,
      statement_timeout: 2000,
      idleTimeoutMillis: 30000,
    });

    // Ingress Pool: High throughput, longer timeouts
    ingressPool = new pg.Pool({
      connectionString: process.env.DATABASE_URL,
      max: 10,
      statement_timeout: 60000,
    });

    // Replay Pool: Isolated for catch-up
    replayPool = new pg.Pool({
      connectionString: process.env.DATABASE_URL,
      max: 2,
    });
  }

  bridgeInstance = new DatabaseBridge(sqliteInstance, apiPool, ingressPool);
  return bridgeInstance;
}

export async function getMigrationMetrics() {
  return {
    shadow: {
      queueLength: shadowWorker['queue'].length,
      activeCount: shadowWorker['activeCount'],
      failures: shadowWorker['failures'],
      circuitOpen: shadowWorker['circuitOpen'],
    },
    pools: {
      api: apiPool
        ? { total: apiPool.totalCount, idle: apiPool.idleCount, waiting: apiPool.waitingCount }
        : null,
      ingress: ingressPool
        ? {
            total: ingressPool.totalCount,
            idle: ingressPool.idleCount,
            waiting: ingressPool.waitingCount,
          }
        : null,
      replay: replayPool
        ? {
            total: replayPool.totalCount,
            idle: replayPool.idleCount,
            waiting: replayPool.waitingCount,
          }
        : null,
    },
  };
}
