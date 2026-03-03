import express, { Express } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import path from 'path';
import { fileURLToPath } from 'url';
import toobusy from 'toobusy-js';
import rateLimit from 'express-rate-limit';
import { logger } from './server/services/Logger.js';
import { requestIdMiddleware } from './server/middleware/requestId.js';
import { globalErrorHandler } from './server/utils/errorHandler.js';
import {
  initPools,
  assertProductionPg,
  getApiPool,
  getMigrationMetrics,
} from './server/db/connection.js';
import { validateStartup } from './server/utils/startupValidation.js';
import { runMigrations } from './server/db/migrator.js';
import { getEntityAndDocumentCounts } from './server/db/routesDb.js';

// Route imports
import authRoutes from './server/auth/routes.js';
import statsRoutes from './server/routes/stats.js';
import relationshipsRoutes from './server/routes/relationships.js';
import analyticsRoutes from './server/routes/analytics.js';
import graphRoutes from './server/routes/graphRoutes.js';
import mapRoutes from './server/routes/mapRoutes.js';
import mediaRoutes from './server/routes/mediaRoutes.js';
import usersRoutes from './server/routes/users.js';
import investigationEvidenceRoutes from './server/routes/investigationEvidenceRoutes.js';
import investigationsRouter from './server/routes/investigations.js';
import evidenceRoutes from './server/routes/evidenceRoutes.js';
import advancedAnalyticsRoutes from './server/routes/advancedAnalytics.js';
import entityEvidenceRoutes from './server/routes/entityEvidenceRoutes.js';
import investigativeTasksRoutes from './server/routes/investigativeTasks.js';
import articlesRoutes from './server/routes/articlesRoutes.js';
import emailRoutes from './server/routes/emailRoutes.js';
import financialRoutes from './server/routes/financialRoutes.js';
import forensicRoutes from './server/routes/forensicRoutes.js';
import documentsRoutes from './server/routes/documentsRoutes.js';
import { entitiesRepository } from './server/db/entitiesRepository.js';
import { mapSubjectsListResponseDto } from './server/mappers/entitiesDtoMapper.js';
import { validate, subjectsQuerySchema } from './server/middleware/validate.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export class App {
  public app: Express;

  constructor() {
    this.app = express();
  }

  public async init() {
    await this.initializeDatabase();
    this.initializeMiddleware();
    this.initializeRoutes();
    this.initializeErrorHandling();
  }

  private async initializeDatabase() {
    initPools();
    assertProductionPg();

    // Validate environment (throws on failure)
    try {
      await validateStartup();
    } catch (error) {
      logger.error({ err: error }, 'Startup validation failed');
      process.exit(1);
    }

    try {
      await runMigrations();
      logger.info('Database migrations completed');
    } catch (error) {
      logger.error({ err: error }, 'Failed to run migrations');
      process.exit(1);
    }
  }

  private initializeMiddleware() {
    // 1. Core Security & Performance
    this.app.use(requestIdMiddleware);
    this.app.use(
      helmet({
        contentSecurityPolicy: false,
        crossOriginEmbedderPolicy: false,
      }),
    );
    this.app.use(cors());
    this.app.use(compression());

    // 2. Load Shedding
    this.app.use((_req, res, next) => {
      if (toobusy()) {
        res.status(503).send('Server Too Busy');
      } else {
        next();
      }
    });

    // 3. Rate Limiting
    const limiter = rateLimit({
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 500, // Limit each IP to 500 requests per windowMs
      standardHeaders: true,
      legacyHeaders: false,
    });
    this.app.use(limiter);

    // 4. Parsing
    this.app.use(express.json({ limit: '50mb' }));
    this.app.use(express.urlencoded({ extended: true, limit: '50mb' }));
    this.app.use(cookieParser());

    // 5. Custom Headers
    this.app.use((_req, res, next) => {
      res.setHeader('X-DB-Dialect', 'postgres');
      next();
    });

    // 6. Static files
    this.app.use((req, res, next) => {
      if (req.method === 'GET' && (req.path === '/' || req.path.endsWith('.html'))) {
        res.setHeader('Cache-Control', 'no-store, max-age=0, must-revalidate');
        res.setHeader('Pragma', 'no-cache');
        res.setHeader('Expires', '0');
      }
      next();
    });
    this.app.use(express.static(path.join(__dirname, '../dist')));
    this.app.use('/data', express.static(path.join(__dirname, '../data')));

    // 7. Secure File Serving
    // This replicates the logic from server.ts for handling /files/*
    this.app.get('/files/*', (req, res) => {
      const wildcardPath = (req.params as Record<string, string | undefined>)['0'];
      const filePath = wildcardPath ?? '';

      // Basic security check to prevent directory traversal
      if (filePath.includes('..')) {
        return res.status(400).send('Invalid path');
      }

      // Map /files/path/to/doc -> /data/path/to/doc or CORPUS_BASE_PATH
      // For now, we assume files are in /data/
      // In a real scenario, we'd use the mapping logic more robustly
      const absolutePath = path.join(process.cwd(), 'data', filePath);

      res.sendFile(absolutePath, (err) => {
        if (err) {
          if (!res.headersSent) {
            res.status(404).send('File not found');
          }
        }
      });
    });
  }

  private initializeRoutes() {
    const router = express.Router();

    // Health check
    router.get('/health', (_req, res) => {
      res.json({ status: 'ok', timestamp: new Date().toISOString() });
    });

    // Legacy readiness alias retained for older clients and scripts.
    router.get('/ready', (_req, res) => {
      res.redirect(307, '/api/health/ready');
    });

    // Readiness endpoint: validates DB connectivity + core data path availability.
    router.get('/health/ready', async (_req, res) => {
      const startedAt = Date.now();
      const timeoutMs = Math.max(100, Number(process.env.READINESS_TIMEOUT_MS || 1200) || 1200);

      const withTimeout = async <T>(promise: Promise<T>, label: string): Promise<T> => {
        const timeoutPromise = new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error(`${label} timeout after ${timeoutMs}ms`)), timeoutMs),
        );
        return Promise.race([promise, timeoutPromise]);
      };

      try {
        const pool = getApiPool();

        const dbPingStart = Date.now();
        await withTimeout(pool.query('SELECT 1 AS ok'), 'db ping');
        const dbLatencyMs = Date.now() - dbPingStart;

        const countsStart = Date.now();
        const counts = await withTimeout(getEntityAndDocumentCounts(), 'core counts');
        const countsLatencyMs = Date.now() - countsStart;
        const hasMinimumData = counts.entities > 0 && counts.documents > 0;

        const migrationMetrics = await getMigrationMetrics();
        const apiPoolMetrics = migrationMetrics.pools.api;
        const saturated = Boolean(apiPoolMetrics && apiPoolMetrics.waiting >= 3);
        const status: 'ok' | 'degraded' = !hasMinimumData || saturated ? 'degraded' : 'ok';

        return res.status(status === 'ok' ? 200 : 503).json({
          status,
          timestamp: new Date().toISOString(),
          checks: {
            db: { ok: true, latencyMs: dbLatencyMs, dialect: 'postgres' },
            data: {
              ok: hasMinimumData,
              entities: counts.entities,
              documents: counts.documents,
              latencyMs: countsLatencyMs,
              error: hasMinimumData ? undefined : 'Core data unavailable',
            },
            pool: apiPoolMetrics,
            readiness: { mode: 'o1-plus-core-counts', timeoutMs },
          },
          durationMs: Date.now() - startedAt,
        });
      } catch (error: any) {
        return res.status(503).json({
          status: 'down',
          timestamp: new Date().toISOString(),
          checks: { db: { ok: false, error: error?.message || 'unknown' } },
          durationMs: Date.now() - startedAt,
        });
      }
    });

    // Canonical DB metadata endpoint used by monitors and deploy verification.
    router.get('/_meta/db', async (_req, res, next) => {
      try {
        const pool = getApiPool();
        const { rows } = await pool.query<{
          server_version: string;
          statement_timeout: string;
          lock_timeout: string;
        }>(`
          SELECT
            version() AS server_version,
            current_setting('statement_timeout') AS statement_timeout,
            current_setting('lock_timeout') AS lock_timeout
        `);
        const metrics = await getMigrationMetrics();
        res.json({
          dialect: 'postgres',
          server_version: rows[0]?.server_version,
          statement_timeout: rows[0]?.statement_timeout,
          lock_timeout: rows[0]?.lock_timeout,
          pools: metrics.pools,
        });
      } catch (error) {
        next(error);
      }
    });

    // Mount routes
    router.use('/auth', authRoutes);
    router.get('/subjects', validate(subjectsQuerySchema), async (req, res, next) => {
      try {
        const query = req.query as any;
        const page = Number(query.page || 1);
        const limit = Number(query.limit || 24);
        const likelihoodRaw = query.likelihoodScore;
        const likelihoodScore = Array.isArray(likelihoodRaw)
          ? likelihoodRaw
          : typeof likelihoodRaw === 'string' && likelihoodRaw.length > 0
            ? [likelihoodRaw]
            : undefined;

        const result = await entitiesRepository.getSubjectCards(
          page,
          limit,
          {
            searchTerm: query.search,
            role: query.role,
            entityType: query.entityType,
            likelihoodScore,
            sortOrder: String(query.sortOrder || 'desc').toLowerCase() === 'asc' ? 'asc' : 'desc',
          } as any,
          (query.sortBy as any) || 'risk',
        );

        res.json(mapSubjectsListResponseDto(result));
      } catch (error) {
        next(error);
      }
    });
    router.use('/stats', statsRoutes);
    router.use('/relationships', relationshipsRoutes);
    router.use('/analytics', analyticsRoutes);
    router.use('/graph', graphRoutes);
    router.use('/map', mapRoutes);
    router.use('/media', mediaRoutes);
    router.use('/users', usersRoutes);
    router.use('/investigations', investigationsRouter);
    router.use('/evidence', evidenceRoutes);
    router.use('/advanced-analytics', advancedAnalyticsRoutes);
    router.use('/entity-evidence', entityEvidenceRoutes);
    router.use('/tasks', investigativeTasksRoutes);
    router.use('/articles', articlesRoutes);
    router.use('/email', emailRoutes);
    router.use('/financial', financialRoutes);
    router.use('/forensic', forensicRoutes);
    router.use('/documents', documentsRoutes);

    // Legacy/Direct routes that might need adjustment
    router.use('/investigation-evidence', investigationEvidenceRoutes);

    this.app.use('/api', router);

    // SPA Fallback
    this.app.get('*', (_req, res) => {
      res.setHeader('Cache-Control', 'no-store, max-age=0, must-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
      res.sendFile(path.join(__dirname, '../dist/index.html'));
    });
  }

  private initializeErrorHandling() {
    this.app.use(globalErrorHandler);
  }

  public async listen(port: number) {
    return new Promise<void>((resolve) => {
      this.app.listen(port, () => {
        logger.info(`Server running on port ${port}`);
        resolve();
      });
    });
  }
}
