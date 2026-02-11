import { Router } from 'express';
import { statsRepository } from '../db/statsRepository.js';
import { getDb } from '../db/connection.js';
import { config } from '../../config/index.js';
import fs from 'fs';
import path from 'path';

const router = Router();

// API Response Cache helper would normally be here if we wanted per-route caching,
// but for simplicity we'll assume it's passed or handled by the requester.

// Public Stats Endpoint (for About page)
router.get('/', async (_req, res, next) => {
  try {
    const stats = statsRepository.getStatistics();
    res.json(stats);
  } catch (e) {
    next(e);
  }
});

// Health check endpoint - Basic
router.get('/health', (_req, res) => {
  let dbStatus = 'not_initialized';
  let stats = { entities: 0, documents: 0 };

  try {
    const db = getDb();
    if (db) {
      dbStatus = 'connected';
      const entityCount = db.prepare('SELECT COUNT(*) as count FROM entities').get() as {
        count: number;
      };
      const docCount = db.prepare('SELECT COUNT(*) as count FROM documents').get() as {
        count: number;
      };
      stats = { entities: entityCount.count, documents: docCount.count };
    }
  } catch (e) {
    dbStatus = 'error';
    console.error('Health check DB error:', e);
  }

  const healthCheck = {
    status: dbStatus === 'connected' && stats.entities > 0 ? 'healthy' : 'degraded',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    database: dbStatus,
    data: stats,
    memory: process.memoryUsage(),
    environment: config.nodeEnv,
  };

  res.status(healthCheck.status === 'healthy' ? 200 : 503).json(healthCheck);
});

// Deep health check
router.get('/health/deep', (_req, res) => {
  const checks: Record<
    string,
    { status: 'pass' | 'fail' | 'warn'; message: string; duration?: number }
  > = {};
  let overallStatus: 'healthy' | 'degraded' | 'critical' = 'healthy';

  const startTime = Date.now();

  try {
    const db = getDb();

    // 1. Database connection check
    const dbStart = Date.now();
    try {
      db.prepare('SELECT 1').get();
      checks.database_connection = {
        status: 'pass',
        message: 'Database connected',
        duration: Date.now() - dbStart,
      };
    } catch (e: any) {
      checks.database_connection = {
        status: 'fail',
        message: `DB connection failed: ${e.message}`,
      };
      overallStatus = 'critical';
    }

    // 2. Database integrity check
    const integrityStart = Date.now();
    try {
      const integrity = db.pragma('integrity_check') as Array<{ integrity_check: string }>;
      if (integrity[0]?.integrity_check === 'ok') {
        checks.database_integrity = {
          status: 'pass',
          message: 'Database integrity OK',
          duration: Date.now() - integrityStart,
        };
      } else {
        checks.database_integrity = {
          status: 'fail',
          message: `Integrity check failed: ${integrity[0]?.integrity_check}`,
        };
        overallStatus = 'critical';
      }
    } catch (e: any) {
      checks.database_integrity = {
        status: 'fail',
        message: `Integrity check error: ${e.message}`,
      };
      overallStatus = 'critical';
    }

    // 3. Critical tables exist and have data
    const criticalTables = [
      'entities',
      'documents',
      'entity_relationships',
      'investigations',
      'black_book_entries',
    ];
    for (const table of criticalTables) {
      const tableStart = Date.now();
      try {
        const count = db.prepare(`SELECT COUNT(*) as count FROM ${table}`).get() as {
          count: number;
        };
        if (count.count > 0) {
          checks[`table_${table}`] = {
            status: 'pass',
            message: `${count.count} rows`,
            duration: Date.now() - tableStart,
          };
        } else {
          checks[`table_${table}`] = {
            status: 'warn',
            message: 'Table empty',
            duration: Date.now() - tableStart,
          };
          if (overallStatus === 'healthy') overallStatus = 'degraded';
        }
      } catch (e: any) {
        checks[`table_${table}`] = { status: 'fail', message: `Table check failed: ${e.message}` };
        overallStatus = 'critical';
      }
    }

    // 4. Test a real query
    const queryStart = Date.now();
    try {
      const entity = db
        .prepare('SELECT id, full_name FROM entities WHERE mentions > 0 LIMIT 1')
        .get();
      if (entity) {
        checks.query_execution = {
          status: 'pass',
          message: 'Query executed successfully',
          duration: Date.now() - queryStart,
        };
      } else {
        checks.query_execution = { status: 'warn', message: 'No entities with mentions found' };
      }
    } catch (e: any) {
      checks.query_execution = { status: 'fail', message: `Query failed: ${e.message}` };
      overallStatus = 'critical';
    }

    // 5. Check WAL mode
    try {
      const journalMode = db.pragma('journal_mode') as Array<{ journal_mode: string }>;
      const mode = journalMode[0]?.journal_mode;
      checks.journal_mode = {
        status: mode === 'wal' ? 'pass' : 'warn',
        message: `Journal mode: ${mode}`,
      };
    } catch (e: any) {
      checks.journal_mode = {
        status: 'warn',
        message: `Could not check journal mode: ${e.message}`,
      };
    }

    // 6. Memory check
    const memUsage = process.memoryUsage();
    const heapUsedMB = Math.round(memUsage.heapUsed / 1024 / 1024);
    const heapTotalMB = Math.round(memUsage.heapTotal / 1024 / 1024);
    const heapPercentage = Math.round((memUsage.heapUsed / memUsage.heapTotal) * 100);
    if (heapPercentage > 90) {
      checks.memory = {
        status: 'warn',
        message: `High memory usage: ${heapUsedMB}MB / ${heapTotalMB}MB (${heapPercentage}%)`,
      };
      if (overallStatus === 'healthy') overallStatus = 'degraded';
    } else {
      checks.memory = {
        status: 'pass',
        message: `${heapUsedMB}MB / ${heapTotalMB}MB (${heapPercentage}%)`,
      };
    }

    // 7. Disk space check
    try {
      const dbPath = process.env.DB_PATH || './epstein-archive.db';
      if (fs.existsSync(dbPath)) {
        const stats = fs.statSync(dbPath);
        const dbSizeMB = Math.round(stats.size / 1024 / 1024);
        checks.database_size = { status: 'pass', message: `${dbSizeMB} MB` };
      }
    } catch (e: any) {
      checks.database_size = { status: 'warn', message: `Could not check DB size: ${e.message}` };
    }
  } catch (e: any) {
    checks.fatal_error = { status: 'fail', message: `Health check crashed: ${e.message}` };
    overallStatus = 'critical';
  }

  const totalDuration = Date.now() - startTime;

  const response = {
    status: overallStatus,
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    totalCheckDuration: `${totalDuration}ms`,
    environment: config.nodeEnv,
    version: process.env.npm_package_version || 'unknown',
    checks,
  };

  const httpStatus = overallStatus === 'healthy' ? 200 : overallStatus === 'degraded' ? 200 : 503;
  res.status(httpStatus).json(response);
});

// Readiness check
router.get('/ready', (_req, res) => {
  if (getDb()) {
    res.status(200).json({ status: 'ready' });
  } else {
    res.status(503).json({ status: 'not_ready', reason: 'database_not_initialized' });
  }
});

export default router;
