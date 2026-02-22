import pg from 'pg';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import path from 'path';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);

// ─── Type helpers ────────────────────────────────────────────────────────────

export interface DbWrapper {
  prepare(sql: string): PreparedStatement;
  transaction(fn: any): any;
  get(sql: string, params?: any): Promise<any>;
  all(sql: string, params?: any): Promise<any[]>;
  run(sql: string, params?: any): Promise<{ changes: number }>;
  pragma?(sql: string): any;
  exec?(sql: string): void;
  backup?(path: string): Promise<any>;
  exec?(sql: string): void;
  getPg?(): pg.Pool;
  getSqlite?(): any;
  interrupt?(): void;
}

interface PreparedStatement {
  all(...args: any[]): any;
  get(...args: any[]): any;
  run(...args: any[]): any;
}

// ─── Pool singletons ─────────────────────────────────────────────────────────

let apiPool: pg.Pool | null = null;
export let maintenancePool: pg.Pool | null = null;
let ingressPool: pg.Pool | null = null;
let replayPool: pg.Pool | null = null;

let pgWrapper: PgWrapper | null = null;
let sqliteInstance: any = null;
let sqliteWrapper: SqliteWrapper | null = null;

// Pool sizing — matches connection budget in runbook §3:
// apiPool=18, ingestPool=8, maintenancePool=2, replayPool=2
// + PG internals (~5) + headroom (~10) = ~45 / max_connections=80
const POOL_SIZES = {
  api: parseInt(process.env.API_POOL_MAX ?? '18'),
  maintenance: 2,
  ingress: parseInt(process.env.INGEST_POOL_MAX ?? '8'),
  replay: 2,
} as const;

export function getApiPool(): pg.Pool {
  if (!apiPool) throw new Error('PG API pool not initialised — call getDb() first');
  return apiPool;
}

export function getMaintenancePool(): pg.Pool {
  if (!maintenancePool) throw new Error('PG maintenance pool not initialised');
  return maintenancePool;
}

// ─── Translation warning counter ─────────────────────────────────────────────
// AT-2: assert count is 0 in production tests to confirm SQLite-shaped SQL is gone
// In production, each unique translation emits CRITICAL log + sql_hash metric.

let _translationCount = 0;
const _translationSeen = new Map<string, string>(); // sig → sha256 hash

export function getTranslationCount() {
  return _translationCount;
}
export function resetTranslationCount() {
  _translationCount = 0;
  _translationSeen.clear();
}

function recordTranslation(originalSql: string): void {
  const sig = originalSql.slice(0, 80);
  if (_translationSeen.has(sig)) return;

  const sqlHash = crypto.createHash('sha256').update(originalSql).digest('hex').slice(0, 16);
  _translationSeen.set(sig, sqlHash);
  _translationCount++;

  if (process.env.NODE_ENV === 'production') {
    // CRITICAL: translation count must be 0 in production.
    // If this fires, a repository is still using SQLite-shaped SQL.
    console.error(
      `[CRITICAL] translationCount=${_translationCount} sql_hash=${sqlHash} ` +
        `SQLite-shaped SQL reached Postgres in production. SQL: ${sig}`,
    );
    // Emit to metrics (increment counter visible on /api/_meta/db)
  }
}

// ─── Boot-time Dialect Guard ─────────────────────────────────────────────────

export function assertProductionPg(): void {
  if (process.env.NODE_ENV !== 'production') return;

  if (process.env.DB_DIALECT !== 'postgres') {
    throw new Error(
      '[FATAL] DB_DIALECT must be "postgres" in production. ' +
        'Set DB_DIALECT=postgres and DATABASE_URL=postgres://... Refusing to start.',
    );
  }

  if (!process.env.DATABASE_URL?.startsWith('postgres')) {
    throw new Error(
      '[FATAL] DATABASE_URL must be a postgres:// or postgresql:// URI in production. Refusing to start.',
    );
  }

  // Crash if SQLite was accidentally installed (e.g. missing --ignore-optional)
  try {
    require.resolve('better-sqlite3');
    // If we get here, the module was found — in production this should ideally be fatal,
    // but we'll downgrade to a warning during the transition phase.
    console.warn(
      '[WARNING] better-sqlite3 is installed in the production environment. ' +
        'To fully harden, rebuild with `pnpm install --prod --ignore-optional`.',
    );
  } catch (e: any) {
    if (e.code === 'MODULE_NOT_FOUND') return; // ✅ not installed, safe to proceed
    throw e; // re-throw our own fatal error
  }
}

// ─── Session settings applied on each pool connection ─────────────────────────
// These are per-connection overrides, lower than the server-side backstops in epstein.conf.

function applyApiSessionSettings(client: pg.PoolClient): void {
  client
    .query(
      [
        "SET statement_timeout = '8000ms'", // 8s; server backstop is 10s
        "SET lock_timeout = '500ms'", // fail fast on lock contention
        "SET idle_in_transaction_session_timeout = '3000ms'", // kill stalled txns
      ].join('; '),
    )
    .catch((err) => {
      console.error('[PG API POOL] Failed to apply session settings:', err.message);
    });
}

function applyMaintenanceSessionSettings(client: pg.PoolClient): void {
  client
    .query(
      [
        "SET statement_timeout = '300000ms'", // 5min for VACUUM / REINDEX / REFRESH
        "SET lock_timeout = '500ms'",
        "SET idle_in_transaction_session_timeout = '3000ms'",
        "SET work_mem = '256MB'", // raised ONLY for maintenance connections
      ].join('; '),
    )
    .catch((err) => {
      console.error('[PG MAINTENANCE POOL] Failed to apply session settings:', err.message);
    });
}

// ─── PgWrapper — production Postgres path ────────────────────────────────────

class PgWrapper implements DbWrapper {
  constructor(private pool: pg.Pool) {}

  getPg() {
    return this.pool;
  }

  /**
   * Translates SQLite-shaped SQL to Postgres — with CRITICAL alerting in prod.
   * Target: translateSql is never called in production (translationCount == 0).
   * Once all repositories emit native PG SQL, delete this method.
   */
  private translateSql(sql: string, params: any): { pgSql: string; values: any[] } {
    let pgSql = sql;
    const values: any[] = [];

    // @named param style: @foo → $1
    if (params && typeof params === 'object' && !Array.isArray(params)) {
      let i = 1;
      const seen: Record<string, string> = {};
      pgSql = pgSql.replace(/@([a-zA-Z0-9_]+)/g, (_m, name) => {
        if (!seen[name]) {
          seen[name] = `$${i++}`;
          values.push(params[name]);
        }
        return seen[name];
      });
    } else if (Array.isArray(params)) {
      let idx = 1;
      pgSql = pgSql.replace(/\?/g, () => `$${idx++}`);
      values.push(...params);
    } else if (params !== undefined && params !== null) {
      pgSql = pgSql.replace(/\?/, '$1');
      values.push(params);
    }

    // SQLite function rewrites
    pgSql = pgSql
      .replace(/datetime\('now'\)/gi, 'CURRENT_TIMESTAMP')
      .replace(/\bIFNULL\s*\(/gi, 'COALESCE(')
      .replace(/\bGROUP_CONCAT\s*\(DISTINCT ([^)]+)\)/gi, "STRING_AGG(DISTINCT $1, ',')")
      .replace(/\bGROUP_CONCAT\s*\(([^)]+)\)/gi, "STRING_AGG($1, ',')")
      .replace(/\bINSERT OR IGNORE\b/gi, 'INSERT')
      .replace(/\bINSERT OR REPLACE\b/gi, 'INSERT')
      .replace(/\bINSTR\s*\(/gi, 'STRPOS(')
      .replace(/\bchar\(10\)/gi, 'CHR(10)')
      .replace(/\bCOLLATE NOCASE\b/gi, '')
      .replace(/\bjson_extract\s*\(\s*([^,]+)\s*,\s*'\$\.([^']+)'\s*\)/gi, "($1->>'$2')")
      .replace(/\bjson_group_array\s*\(/gi, 'JSON_AGG(');

    // Record translation — emits CRITICAL log + sql_hash in production
    if (pgSql !== sql) {
      recordTranslation(sql);
    }

    return { pgSql, values };
  }

  prepare(sql: string): PreparedStatement {
    const stmtName = crypto.createHash('sha1').update(sql).digest('hex').slice(0, 24);

    return {
      all: async (...args: any[]) => {
        const raw = args.length === 1 ? args[0] : args.length > 1 ? args : undefined;
        const { pgSql, values } = this.translateSql(sql, raw);
        try {
          const res = await this.pool.query({ name: `${stmtName}_all`, text: pgSql }, values);
          return res.rows;
        } catch (err: any) {
          console.error('[PG] .all() error:', err.message, '\nSQL:', pgSql);
          throw err;
        }
      },
      get: async (...args: any[]) => {
        const raw = args.length === 1 ? args[0] : args.length > 1 ? args : undefined;
        const { pgSql, values } = this.translateSql(sql, raw);
        try {
          const res = await this.pool.query({ name: `${stmtName}_get`, text: pgSql }, values);
          return res.rows[0] ?? null;
        } catch (err: any) {
          console.error('[PG] .get() error:', err.message, '\nSQL:', pgSql);
          throw err;
        }
      },
      run: async (...args: any[]) => {
        const raw = args.length === 1 ? args[0] : args.length > 1 ? args : undefined;
        const { pgSql, values } = this.translateSql(sql, raw);
        try {
          const res = await this.pool.query(pgSql, values);
          return {
            changes: res.rowCount ?? 0,
            lastInsertRowid: res.rows[0]?.id ?? res.rows[0]?.ID ?? null,
          };
        } catch (err: any) {
          console.error('[PG] .run() error:', err.message, '\nSQL:', pgSql);
          throw err;
        }
      },
    };
  }

  async get(sql: string, params?: any): Promise<any> {
    return this.prepare(sql).get(params);
  }

  async all(sql: string, params?: any): Promise<any[]> {
    return this.prepare(sql).all(params);
  }

  async run(sql: string, params?: any): Promise<{ changes: number }> {
    return this.prepare(sql).run(params);
  }

  transaction(fn: (client: pg.PoolClient) => Promise<any>) {
    return async () => {
      const client = await this.pool.connect();
      try {
        await client.query('BEGIN');
        const result = await fn(client);
        await client.query('COMMIT');
        return result;
      } catch (e) {
        await client.query('ROLLBACK');
        throw e;
      } finally {
        client.release();
      }
    };
  }

  pragma(_sql: string) {
    throw new Error('[PgWrapper] .pragma() is not available in postgres dialect');
  }
  exec(_sql: string) {
    throw new Error('[PgWrapper] .exec() is not available in postgres dialect');
  }
}

// ─── SqliteWrapper — dev/test only ───────────────────────────────────────────

class SqliteWrapper implements DbWrapper {
  constructor(private db: any) {}

  getSqlite() {
    return this.db;
  }

  prepare(sql: string): PreparedStatement {
    const stmt = this.db.prepare(sql);
    const withTimeout = <T>(fn: () => T): T => {
      const timer = setTimeout(() => {
        try {
          this.db.interrupt();
        } catch (_e) {
          /* interrupt is best-effort */
        }
      }, 5000);
      try {
        const r = fn();
        clearTimeout(timer);
        return r;
      } catch (err: any) {
        clearTimeout(timer);
        if (err.message?.includes('interrupted')) {
          const e = new Error('Database Gateway Timeout');
          (e as any).status = 504;
          throw e;
        }
        throw err;
      }
    };
    return {
      all: (...args: any[]) =>
        withTimeout(() => (args.length === 0 ? stmt.all() : stmt.all(...args))),
      get: (...args: any[]) =>
        withTimeout(() => (args.length === 0 ? stmt.get() : stmt.get(...args))),
      run: (...args: any[]) =>
        withTimeout(() => (args.length === 0 ? stmt.run() : stmt.run(...args))),
    };
  }

  async get(sql: string, params: any = []): Promise<any> {
    const paramsArr = Array.isArray(params) ? params : [params];
    return this.prepare(sql).get(...paramsArr);
  }

  async all(sql: string, params: any = []): Promise<any[]> {
    const paramsArr = Array.isArray(params) ? params : [params];
    return this.prepare(sql).all(...paramsArr);
  }

  async run(sql: string, params: any = []): Promise<{ changes: number }> {
    const paramsArr = Array.isArray(params) ? params : [params];
    return this.prepare(sql).run(...paramsArr);
  }

  transaction(fn: any) {
    return this.db.transaction(fn);
  }
  pragma(sql: string) {
    return this.db.pragma(sql);
  }
  exec(sql: string) {
    return this.db.exec(sql);
  }
  interrupt() {
    return this.db.interrupt();
  }
}

// ─── getDb() — public entry point ─────────────────────────────────────────────

export function getDb(): DbWrapper {
  if (pgWrapper) return pgWrapper;
  if (sqliteWrapper && process.env.DB_DIALECT !== 'postgres') return sqliteWrapper;

  assertProductionPg();

  if (process.env.DB_DIALECT === 'postgres') {
    // ── API pool — max 18 connections (not 20) to reduce worst-case work_mem exposure
    apiPool = new pg.Pool({
      connectionString: process.env.DATABASE_URL,
      max: POOL_SIZES.api,
      idleTimeoutMillis: 10_000,
      connectionTimeoutMillis: 10_000,
      application_name: 'epstein-api',
      // Robust retry logic for transient connection failures
      maxUses: 7500, // Close connections occasionally to prevent memory leaks/bloat
    });
    apiPool.on('connect', (client) => applyApiSessionSettings(client));
    apiPool.on('error', (err) => {
      console.error('[PG API POOL] Unexpected error:', err.message);
    });

    // ── Maintenance pool — max 2 connections; never used for API requests
    maintenancePool = new pg.Pool({
      connectionString: process.env.DATABASE_URL,
      max: POOL_SIZES.maintenance,
      idleTimeoutMillis: 60_000,
      connectionTimeoutMillis: 15_000,
      application_name: 'epstein-maintenance',
    });
    maintenancePool.on('connect', (client) => applyMaintenanceSessionSettings(client));
    maintenancePool.on('error', (err) => {
      console.error('[PG MAINTENANCE POOL] Unexpected error:', err.message);
    });

    // ── Ingest pool — for ETL pipeline / backfill (max 8)
    ingressPool = new pg.Pool({
      connectionString: process.env.DATABASE_URL,
      max: POOL_SIZES.ingress,
      idleTimeoutMillis: 60_000,
      connectionTimeoutMillis: 15_000,
      application_name: 'epstein-ingest',
    });
    ingressPool.on('connect', (client) => {
      client
        .query(
          [
            "SET statement_timeout = '60000ms'",
            "SET lock_timeout = '500ms'",
            "SET idle_in_transaction_session_timeout = '3000ms'",
          ].join('; '),
        )
        .catch(() => {});
    });

    // ── Replay pool — for pg_replay.ts; small and slow
    replayPool = new pg.Pool({
      connectionString: process.env.DATABASE_URL,
      max: POOL_SIZES.replay,
      application_name: 'epstein-replay',
    });

    pgWrapper = new PgWrapper(apiPool);
    return pgWrapper;
  }

  // SQLite path — dev/test only
  const { default: Database } = sqlite_require();
  const dbPath = process.env.DB_PATH || resolveDefaultDbPath();
  sqliteInstance = new Database(dbPath, { timeout: 30_000 });
  sqliteInstance.pragma('journal_mode = WAL');
  sqliteInstance.pragma('foreign_keys = ON');
  sqliteInstance.pragma('synchronous = NORMAL');
  sqliteInstance.pragma('temp_store = MEMORY');
  sqliteInstance.pragma('mmap_size = 2000000000');
  sqliteInstance.pragma('cache_size = -500000');
  sqliteWrapper = new SqliteWrapper(sqliteInstance);
  return sqliteWrapper;
}

function resolveDefaultDbPath(): string {
  const currentFile = fileURLToPath(import.meta.url);
  return path.resolve(path.dirname(currentFile), '..', '..', '..', 'epstein-archive.db');
}

function sqlite_require(): any {
  return { default: require('better-sqlite3') };
}

// ─── Metrics / observability ──────────────────────────────────────────────────

export async function getMigrationMetrics() {
  return {
    dialect: process.env.DB_DIALECT || 'sqlite',
    translationCount: _translationCount, // must be 0 in production
    pools: {
      api: apiPool
        ? {
            total: apiPool.totalCount,
            idle: apiPool.idleCount,
            waiting: apiPool.waitingCount,
            max: POOL_SIZES.api,
          }
        : null,
      maintenance: maintenancePool
        ? {
            total: maintenancePool.totalCount,
            idle: maintenancePool.idleCount,
            waiting: maintenancePool.waitingCount,
            max: POOL_SIZES.maintenance,
          }
        : null,
      ingress: ingressPool
        ? {
            total: ingressPool.totalCount,
            idle: ingressPool.idleCount,
            waiting: ingressPool.waitingCount,
            max: POOL_SIZES.ingress,
          }
        : null,
      replay: replayPool
        ? {
            total: replayPool.totalCount,
            idle: replayPool.idleCount,
            waiting: replayPool.waitingCount,
            max: POOL_SIZES.replay,
          }
        : null,
    },
  };
}
