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
import { authenticateRequest } from './server/auth/middleware.js';
import { initPools, assertProductionPg } from './server/db/connection.js';
import { validateStartup } from './server/utils/startupValidation.js';
import { runMigrations } from './server/db/migrator.js';

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
    this.app.use(express.static(path.join(__dirname, '../dist')));
    this.app.use('/data', express.static(path.join(__dirname, '../data')));

    // 7. Secure File Serving
    // This replicates the logic from server.ts for handling /files/*
    this.app.get('/files/*', authenticateRequest, (req, res) => {
      const filePath = req.params[0];

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

    // Mount routes
    router.use('/auth', authRoutes);
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
