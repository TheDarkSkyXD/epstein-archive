import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

// Use 'any' for the database instance type to avoid TypeScript namespace issues
// with better-sqlite3 in this environment
let dbInstance: any = null;

function resolveDefaultDbPath(): string {
  const currentFile = fileURLToPath(import.meta.url);
  const serverRoot = path.resolve(path.dirname(currentFile), '..', '..', '..');
  return path.join(serverRoot, 'epstein-archive.db');
}

export function getDb(): any {
  if (dbInstance) return dbInstance;

  // Use DB_PATH from env or default to repository root.
  // Avoid process.cwd()-based ambiguity when scripts run from different directories.
  const DB_PATH = process.env.DB_PATH || resolveDefaultDbPath();

  // Note: better-sqlite3 uses blocking IO by default but is very fast.
  dbInstance = new Database(DB_PATH, {
    timeout: 30000,
    verbose: process.env.NODE_ENV === 'development' ? console.log : undefined,
  });

  // Performance & Reliability Pragmas
  dbInstance.pragma('journal_mode = WAL');
  dbInstance.pragma('foreign_keys = ON');

  // Use FULL synchronicity in production for data safety on cloud storage.
  // NORMAL is faster but can lead to corruption on power failure/OS crash.
  const isProd = process.env.NODE_ENV === 'production';
  dbInstance.pragma(`synchronous = ${isProd ? 'FULL' : 'NORMAL'}`);

  dbInstance.pragma('temp_store = MEMORY');

  // Optional: Optimize memory mapping
  // dbInstance.pragma('mmap_size = 30000000000');

  // Diagnostic Wrapper: Slow Query Logger
  const SLOW_QUERY_THRESHOLD_MS = 200;
  const originalPrepare = dbInstance.prepare;

  dbInstance.prepare = function (sql: string) {
    const stmt = originalPrepare.call(dbInstance, sql);

    const wrapMethod = (methodName: string) => {
      const originalMethod = (stmt as any)[methodName];
      (stmt as any)[methodName] = function (...args: any[]) {
        const start = Date.now();
        let result: any;
        try {
          result = originalMethod.apply(stmt, args);
          return result;
        } finally {
          const duration = Date.now() - start;
          if (duration > SLOW_QUERY_THRESHOLD_MS) {
            const rowCount =
              methodName === 'all' && Array.isArray(result)
                ? result.length
                : methodName === 'get' && result
                  ? 1
                  : 'N/A';
            const logMsg = `[SLOW QUERY] ${duration}ms | Rows: ${rowCount} | SQL: ${sql.substring(0, 200)}${sql.length > 200 ? '...' : ''}`;
            console.warn(logMsg);

            // Append to slow_queries.log
            try {
              const logEntry = `${new Date().toISOString()} ${logMsg}${args.length > 0 ? ` | Params: ${JSON.stringify(args)}` : ''}\n`;
              fs.appendFileSync(path.join(process.cwd(), 'logs', 'slow_queries.log'), logEntry);
            } catch (e) {
              // Ignore file log errors to prevent crashing the app
            }
          }
        }
      };
    };

    ['all', 'get', 'run'].forEach(wrapMethod);
    return stmt;
  };

  return dbInstance;
}
