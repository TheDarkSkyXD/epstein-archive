import Database from 'better-sqlite3';
import path from 'path';
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

  // Performance Pragmas
  dbInstance.pragma('journal_mode = WAL');
  dbInstance.pragma('foreign_keys = ON');
  dbInstance.pragma('synchronous = NORMAL');
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
        try {
          return originalMethod.apply(stmt, args);
        } finally {
          const duration = Date.now() - start;
          if (duration > SLOW_QUERY_THRESHOLD_MS) {
            console.warn(
              `[SLOW QUERY] ${duration}ms | ${sql.substring(0, 100)}${sql.length > 100 ? '...' : ''}`,
            );
            if (args.length > 0) {
              console.warn(`  Params: ${JSON.stringify(args)}`);
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
