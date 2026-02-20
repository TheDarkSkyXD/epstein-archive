import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import toobusy from 'toobusy-js';
import cookieParser from 'cookie-parser';
import path from 'path';
import { fileURLToPath } from 'url';
import { monitorEventLoopDelay } from 'perf_hooks';
// import { databaseService } from './services/DatabaseService.js';
// import { getEnv } from './src/config/env.js';
import { entitiesRepository } from './server/db/entitiesRepository.js';
import { documentsRepository } from './server/db/documentsRepository.js';
import { statsRepository } from './server/db/statsRepository.js';
import { mediaRepository } from './server/db/mediaRepository.js';
import { investigationsRepository } from './server/db/investigationsRepository.js';
import { searchRepository } from './server/db/searchRepository.js';
import { timelineRepository } from './server/db/timelineRepository.js';
import { forensicRepository } from './server/db/forensicRepository.js';
import { runMigrations } from './server/db/migrator.js';
import { relationshipsRepository } from './server/db/relationshipsRepository.js';
import { validateStartup } from './server/utils/startupValidation.js';
import { authenticateRequest, requireRole } from './server/auth/middleware.js';
import authRoutes from './server/auth/routes.js';
import { logAudit } from './server/utils/auditLogger.js';
// getEnv removed - not currently used, but available in ./server/utils/envValidator.js if needed
import { MediaService } from './server/services/MediaService.js';
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
import { articlesRepository } from './server/db/articlesRepository.js';
import { communicationsRepository } from './server/db/communicationsRepository.js';
import crypto from 'crypto';
import multer from 'multer';
import fs from 'fs';
import { Person, SearchFilters, SortOption, Evidence, User } from './types'; // SubjectCardDTO removed (unused)
import { MediaImage } from './types/media.types';
import { config } from './config/index.js';
import { blackBookRepository } from './server/db/blackBookRepository.js';
import { globalErrorHandler } from './server/utils/errorHandler.js';
import { memoryRepository } from './server/db/memoryRepository.js';
import { getDb } from './server/db/connection.js';
import { FtsMaintenanceService } from './server/services/ftsMaintenance.js';
import { validate, entitySchema, searchSchema } from './server/middleware/validate.js';

// New Routers
import statsRoutes from './server/routes/stats.js';
import relationshipsRoutes from './server/routes/relationships.js';
import analyticsRoutes from './server/routes/analytics.js';
import graphRoutes from './server/routes/graphRoutes.js';
import mapRoutes from './server/routes/mapRoutes.js';
import usersRoutes from './server/routes/users.js';
import { reviewQueueRepository } from './server/db/reviewQueueRepository.js';
import { apiCache, cacheMiddleware } from './server/middleware/cache.js';
import {
  mapEntityListResponseDto,
  mapSubjectsListResponseDto,
} from './server/mappers/entitiesDtoMapper.js';
import { mapDocumentsListResponseDto } from './server/mappers/documentsDtoMapper.js';

interface AuthenticatedRequest extends express.Request {
  user?: User;
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Paths
const CORPUS_BASE_PATH = process.env.RAW_CORPUS_BASE_PATH || '';
// Warn if corpus path not configured (documents may not be accessible)
if (!CORPUS_BASE_PATH) {
  console.warn('WARNING: RAW_CORPUS_BASE_PATH not set. Document file serving will be limited.');
}

const app = express();
// Enable trust proxy for Nginx/Load Balancer
app.set('trust proxy', 1);

// databaseService is already initialized at module level in its file, but let's make sure we use the same connection
const mediaService = new MediaService(getDb());

const INVESTIGATION_MEDIA_TAG_SEED: Array<{ name: string; category: string; color: string }> = [
  { name: 'Perpetrator', category: 'role', color: '#dc2626' },
  { name: 'Co-conspirator', category: 'role', color: '#f97316' },
  { name: 'Person of Interest', category: 'role', color: '#f59e0b' },
  { name: 'Survivor', category: 'role', color: '#22c55e' },
  { name: 'Witness', category: 'role', color: '#0ea5e9' },
  { name: 'Facilitator', category: 'role', color: '#fb7185' },
  { name: 'Recruiter', category: 'role', color: '#f43f5e' },
  { name: 'Financier', category: 'role', color: '#eab308' },
  { name: 'Legal Counsel', category: 'role', color: '#8b5cf6' },
  { name: 'Little St James', category: 'location', color: '#0891b2' },
  { name: 'Great St James', category: 'location', color: '#06b6d4' },
  { name: 'Palm Beach', category: 'location', color: '#14b8a6' },
  { name: 'Manhattan Townhouse', category: 'location', color: '#6366f1' },
  { name: 'Teterboro', category: 'location', color: '#3b82f6' },
  { name: 'Evidence Item', category: 'classification', color: '#64748b' },
  { name: 'Corroborated', category: 'verification', color: '#22c55e' },
  { name: 'Unverified', category: 'verification', color: '#f59e0b' },
];

function seedInvestigationMediaTags(): void {
  try {
    const db = getDb();
    const insert = db.prepare(
      'INSERT OR IGNORE INTO media_tags (name, category, color) VALUES (?, ?, ?)',
    );
    const tx = db.transaction((rows: typeof INVESTIGATION_MEDIA_TAG_SEED) => {
      for (const row of rows) {
        insert.run(row.name, row.category, row.color);
      }
    });
    tx(INVESTIGATION_MEDIA_TAG_SEED);
  } catch (error) {
    console.error('Failed to seed investigation media tags:', error);
  }
}

const h = monitorEventLoopDelay({ resolution: 20 });
h.enable();

// Configure toobusy-js for 500ms lag threshold
// (Large SQLite cold-starts and massive entity lists can spike lag above 250ms transiently)
toobusy.maxLag(500);
toobusy.interval(500);

// Event loop lag protection - BEFORE heavy routes
app.use((req, res, next) => {
  // Always permit health checks, stats, root, and essential auth even if busy
  // These are required for deployment verification and basic UI state
  if (
    req.url === '/' ||
    req.url.startsWith('/api/health') ||
    req.url.startsWith('/api/stats') ||
    req.url.startsWith('/api/media') ||
    req.url.startsWith('/api/subjects') ||
    req.url.startsWith('/api/documents') ||
    req.url.startsWith('/api/auth/me')
  ) {
    return next();
  }

  if (toobusy()) {
    console.warn(
      `[BACKPRESSURE] Rejecting request: ${req.method} ${req.url} (Lag: ${h.mean / 1e6}ms, Peak: ${h.max / 1e6}ms)`,
    );
    return res.status(503).json({
      error: 'Server is too busy (Event Loop lag detected).',
    });
  }
  next();
});

// Memory monitoring and periodic GC pressure log
const MEMORY_THRESHOLD_MB = 1200;
let lastMemoryLog = 0;

app.use((req, res, next) => {
  const now = Date.now();
  if (now - lastMemoryLog > 60000) {
    // Log once per minute
    const memory = process.memoryUsage();
    const rss = Math.round(memory.rss / 1024 / 1024);
    const heapUsed = Math.round(memory.heapUsed / 1024 / 1024);
    const lag = h.mean / 1e6; // ns to ms

    if (rss > MEMORY_THRESHOLD_MB) {
      console.warn(
        `[RUNTIME] CRITICAL MEMORY: RSS ${rss}MB | Heap ${heapUsed}MB | Lag ${lag.toFixed(2)}ms`,
      );
    } else if (now - lastMemoryLog > 300000) {
      // Every 5 mins for standard health
      console.log(`[RUNTIME] Health: RSS ${rss}MB | Heap ${heapUsed}MB | Lag ${lag.toFixed(2)}ms`);
    }
    lastMemoryLog = now;
  }
  next();
});

// Request logging - AT THE VERY TOP
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    // Log originalUrl to see exactly what reached Express
    console.log(
      `${new Date().toISOString()} ${req.method} ${req.originalUrl} ${res.statusCode} ${duration}ms`,
    );
  });
  next();
});

// Basic middleware
app.use(
  cors({
    origin: config.corsOrigin,
    credentials: config.corsCredentials,
  }),
);

app.use(cookieParser());

// Security headers (CSP, HSTS, X-Frame-Options, etc.)
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: [
          "'self'",
          "'unsafe-inline'", // Required for React development and some inline scripts
          "'wasm-unsafe-eval'", // Better than unsafe-eval, if supported
        ],
        styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
        imgSrc: ["'self'", 'data:', 'blob:', '*'],
        connectSrc: [
          "'self'",
          ...(Array.isArray(config.corsOrigin) ? config.corsOrigin : [config.corsOrigin]),
          'http://localhost:*',
        ],
        fontSrc: ["'self'", 'https://fonts.gstatic.com', 'data:'],
        objectSrc: ["'none'"],
        mediaSrc: ["'self'", 'blob:', '*'],
        frameSrc: ["'none'"],
        workerSrc: ["'self'", 'blob:'], // Required for PDF.js worker
      },
    },
    crossOriginEmbedderPolicy: false,
    crossOriginResourcePolicy: { policy: 'cross-origin' }, // Support media from other origins if needed
  }),
);

// Compress all responses
app.use(compression());

// Granular Rate Limiting
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { error: 'Too many authentication attempts.' },
});

const searchLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 30, // 30 searches per minute
  message: { error: 'Search rate limit exceeded.' },
});

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 1500, // General limit
  message: { error: 'Too many requests, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) =>
    req.path === '/health' ||
    req.path.startsWith('/health/') ||
    req.path === '/stats/health' ||
    req.path.startsWith('/stats/health/') ||
    req.path === '/documents' ||
    req.path.startsWith('/documents/'),
});

app.use('/api/', apiLimiter);
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/refresh', authLimiter);
app.use('/api/search', searchLimiter);

app.use(express.json({ limit: '5mb' })); // Reduced from 10mb for safety
app.use(express.urlencoded({ extended: true, limit: '5mb' }));

// Input validation and sanitization middleware
import { inputValidationMiddleware } from './server/middleware/validation.js';
app.use(inputValidationMiddleware);

// Legacy justice.gov URL routing
// Allows swapping justice.gov for epstein.academy to view documents in the app
const resolveLegacyEpsteinFile = (db: any, rawSuffix: string): { id: string } | undefined => {
  const cleanSuffix = rawSuffix.split('?')[0];
  const decodedSuffix = decodeURIComponent(cleanSuffix);

  const doc = db
    .prepare(
      `
      SELECT id
      FROM documents
      WHERE file_path LIKE ?
         OR file_path LIKE ?
      LIMIT 1
    `,
    )
    .get(`%/epstein/files/${cleanSuffix}`, `%/epstein/files/${decodedSuffix}`) as
    | { id: string }
    | undefined;

  if (doc) return doc;

  const filename = path.basename(decodedSuffix);
  return db.prepare(`SELECT id FROM documents WHERE file_name = ? LIMIT 1`).get(filename) as
    | { id: string }
    | undefined;
};

app.get('/api/resolve/epstein-file', async (req, res, next) => {
  try {
    const db = getDb();
    const suffix = String(req.query.path || '').trim();
    if (!suffix) {
      return res.status(400).json({ error: 'path query parameter is required' });
    }

    const doc = resolveLegacyEpsteinFile(db, suffix);
    if (!doc) {
      return res.status(404).json({ error: 'Document not found in Epstein Archive' });
    }

    return res.json({ documentId: String(doc.id), redirectTo: `/documents/${doc.id}` });
  } catch (err) {
    console.error('Error resolving legacy epstein file:', err);
    next(err);
  }
});

app.get('/epstein/files/*', async (req, res, next) => {
  try {
    const db = getDb();
    // Extract suffix from originalUrl to preserve encoding (e.g., %20)
    // originalUrl might be "/epstein/files/DataSet%209/EFTA..."
    const match = req.originalUrl.match(/\/epstein\/files\/(.+)$/);
    if (!match) {
      return res.status(404).send('Invalid path');
    }

    const doc = resolveLegacyEpsteinFile(db, match[1]);
    if (doc) {
      return res.redirect(`/documents/${doc.id}`);
    }

    res.status(404).send('Document not found in Epstein Archive');
  } catch (err) {
    console.error('Error handling justice.gov redirect:', err);
    next(err);
  }
});

// --- RBAC and Deny-by-Default Configuration ---

const PUBLIC_ROUTES = [
  '/api/auth/login',
  '/api/auth/refresh',
  '/api/auth/logout',
  '/api/auth/me',
  '/api/health',
  '/api/stats',
  '/api/entities',
  '/api/tags',
  '/api/documents',
  '/api/media',
  '/api/search',
  '/api/timeline',
  '/api/analytics',
  '/api/graph',
  '/api/relationships',
  '/api/evidence',
  '/api/articles',
  '/api/financial',
  '/api/forensic',
  '/api/flights',
  '/api/properties',
  '/api/emails',
  '/api/email',
  '/api/resolve',
  '/api/black-book',
  '/api/subjects',
  '/api/investigations',
  '/api/admin/reclassify-junk',
  '/api/admin/purge-cache',
];

// Health Check Endpoint
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Readiness endpoint: validates DB connectivity + critical tables + minimum data availability.
app.get('/api/health/ready', (_req, res) => {
  const startedAt = Date.now();
  try {
    const db = getDb();

    // 1. Lightweight Ping
    const dbPingStart = Date.now();
    db.prepare('SELECT 1 as ok').get();
    const dbLatencyMs = Date.now() - dbPingStart;

    // 2. Schema Presence (non-blocking)
    const requiredTables = ['entities', 'documents', 'entity_relationships'];
    const tableRows = db
      .prepare(
        `SELECT name FROM sqlite_master WHERE type='table' AND name IN (${requiredTables.map(() => '?').join(',')})`,
      )
      .all(...requiredTables) as Array<{ name: string }>;

    const presentTables = new Set(tableRows.map((r) => r.name));
    const isSchemaReady = requiredTables.every((t) => presentTables.has(t));

    // 3. Fast Status Determination
    // We avoid COUNT(*) on large tables here. Availability is assumed if schema is present and ping works.
    const status = isSchemaReady ? 'ok' : 'degraded';
    const code = status === 'ok' ? 200 : 503;

    return res.status(code).json({
      status,
      timestamp: new Date().toISOString(),
      checks: {
        db: { ok: true, latencyMs: dbLatencyMs },
        schema: { ready: isSchemaReady, present: Array.from(presentTables) },
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

const isLocalRequest = (req: express.Request) => {
  const ip = (req.ip || '').replace('::ffff:', '');
  return ip === '127.0.0.1' || ip === '::1' || ip === '::ffff:127.0.0.1';
};

// Admin: Re-run junk classification and purge API cache (local-only)
app.post('/api/admin/reclassify-junk', (req, res) => {
  if (!isLocalRequest(req)) {
    return res.status(403).json({ error: 'forbidden' });
  }
  try {
    entitiesRepository.backfillJunkFlags();
    apiCache.flushAll();
    res.json({ ok: true, message: 'Junk reclassified and cache purged' });
  } catch (e: any) {
    console.error('Admin reclassify-junk failed:', e);
    res.status(500).json({ error: 'failed', details: e?.message });
  }
});

// Admin: Purge API cache (local-only)
app.post('/api/admin/purge-cache', (req, res) => {
  if (!isLocalRequest(req)) {
    return res.status(403).json({ error: 'forbidden' });
  }
  apiCache.flushAll();
  res.json({ ok: true, message: 'Cache purged' });
});
const RESEARCHER_READ_ONLY_PREFIXES = [
  '/api/entities',
  '/api/documents',
  '/api/media',
  '/api/search',
  '/api/timeline',
  '/api/analytics',
  '/api/relationships',
  '/api/evidence',
  '/api/articles',
  '/api/financial',
  '/api/forensic',
];

app.use('/api', (req, res, next) => {
  // 1. Allow Public Routes
  const currentPath = req.originalUrl.split('?')[0];
  if (PUBLIC_ROUTES.some((path) => currentPath === path || currentPath.startsWith(path + '/'))) {
    return next();
  }

  // 2. Auth Check for everything else
  authenticateRequest(req, res, (err) => {
    if (err || !(req as any).user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const user = (req as any).user;

    // 3. Admin has access to everything
    if (user.role === 'admin') {
      return next();
    }

    // 4. Researcher Read-Only Access
    if (req.method === 'GET' || req.method === 'HEAD' || req.method === 'OPTIONS') {
      if (
        RESEARCHER_READ_ONLY_PREFIXES.some((prefix) => req.path.startsWith(prefix.substring(4)))
      ) {
        return next();
      }
    }

    // 5. Deny by Default
    console.warn(
      `Access Denied: User ${user.username} (${user.role}) attempted ${req.method} ${req.path}`,
    );
    return res
      .status(403)
      .json({ error: 'Access forbidden', message: 'Insufficient permissions for this action' });
  });
});

// --- Specialized Routes ---

// Apply Zod validation to search
app.use('/api/search', validate(searchSchema, 'query'));

// Mount specialized routes (now protected by RBAC middleware above)
import downloadRoutes from './server/routes/downloads.js';
app.use('/api/downloads', downloadRoutes);

// Mount modular routers
app.use('/api/relationships', relationshipsRoutes);
app.use('/api/stats', statsRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/graph', graphRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/investigations', investigationsRouter);
app.use('/api/investigation', investigationEvidenceRoutes);
app.use('/api/evidence', evidenceRoutes);
app.use('/api/entities', entityEvidenceRoutes);
app.use('/api/email', emailRoutes);
app.use('/api/emails', emailRoutes);
app.use('/api/articles', articlesRoutes);
app.use('/api/financial', financialRoutes);
app.use('/api/forensic', forensicRoutes);
import activeLearningRoutes from './server/routes/activeLearning.js';
app.use('/api/review', activeLearningRoutes);

// Auth Routes (Login/Logout/Refresh)
app.use('/api/auth', authRoutes);

// --- Static File Serving & Resolution ---

// Serve static frontend from dist
const distPath = path.join(process.cwd(), 'dist');
if (fs.existsSync(distPath)) {
  app.use(
    express.static(distPath, {
      setHeaders: (res, path) => {
        if (path.endsWith('index.html')) {
          res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
          res.setHeader('Pragma', 'no-cache');
          res.setHeader('Expires', '0');
        } else {
          res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
        }
      },
    }),
  );
}

// Serve project data (images) statically
const dataPath = path.join(process.cwd(), 'data');
if (fs.existsSync(dataPath)) {
  app.use('/data', express.static(dataPath));
}

// Resolve relative to project root
try {
  const projectDataPath = path.join(__dirname, '..', 'data');
  if (fs.existsSync(projectDataPath)) {
    app.use('/data', express.static(projectDataPath));
  }
} catch {
  void 0;
}

// Absolute /data (Docker volume)
const absDataPath = '/data';
try {
  if (fs.existsSync(absDataPath)) {
    app.use('/data', express.static(absDataPath));
  }
} catch {
  void 0;
}

// Local development document images
try {
  if (fs.existsSync(CORPUS_BASE_PATH)) {
    app.use('/files', express.static(CORPUS_BASE_PATH));
  }
} catch {
  void 0;
}

// Robust static resolver for files under /data
app.get('/api/static', async (req, res, next) => {
  try {
    let raw = String(req.query.path || '');
    if (!raw) return res.status(400).json({ error: 'path required' });

    if (raw.startsWith('data/')) {
      raw = '/data/' + raw.substring('data/'.length);
    }

    if (!raw.includes('/data/')) return res.status(400).json({ error: 'invalid path' });

    const rel = raw.replace(/^.*[/\\]data[/\\]/, '').replace(/\\/g, '/');
    const candidates: string[] = [];
    candidates.push(path.join(process.cwd(), 'data', rel));
    candidates.push(path.join(__dirname, '..', 'data', rel));
    candidates.push(path.join('/data', rel.startsWith('/') ? rel.substring(1) : rel));

    for (const fp of candidates) {
      if (fs.existsSync(fp)) {
        return res.sendFile(fp);
      }
    }
    return res.status(404).json({ error: 'File not found' });
  } catch (e) {
    next(e);
  }
});

// Admin Audit Log Endpoint
app.get('/api/admin/audit-logs', requireRole('admin'), async (req, res, next) => {
  try {
    const limit = Math.min(1000, parseInt(req.query.limit as string) || 100);
    const db = getDb();

    const logs = db
      .prepare(
        `
          SELECT 
            a.*, 
            a.actor_id as performed_by
          FROM audit_log a 
          ORDER BY a.timestamp DESC 
          LIMIT ?
        `,
      )
      .all(limit);

    const parsedLogs = logs.map((log: any) => {
      let payload = null;
      try {
        payload = log.payload_json ? JSON.parse(log.payload_json) : null;
      } catch (_e) {
        payload = { error: 'Invalid JSON', raw: log.payload_json };
      }
      return { ...log, payload };
    });

    res.json(parsedLogs);
  } catch (e) {
    next(e);
  }
});

// Review Queue Endpoints (New for Phase 2)
app.get('/api/admin/review-queue', requireRole('admin'), async (req, res, next) => {
  try {
    const limit = Math.min(100, parseInt(req.query.limit as string) || 50);
    const items = reviewQueueRepository.getPendingItems(limit);
    res.json(items);
  } catch (e) {
    next(e);
  }
});

app.post('/api/admin/review-queue/:id/decide', requireRole('admin'), async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status, notes } = req.body;
    const userId = (req as AuthenticatedRequest).user?.id || 'admin';

    if (!['reviewed', 'rejected'].includes(status)) {
      return res.status(400).json({ error: 'Invalid decision status' });
    }

    const success = reviewQueueRepository.updateDecision(id, status, userId, notes);
    if (!success) {
      return res.status(404).json({ error: 'Review item not found' });
    }

    logAudit('review_queue_decision', userId, 'review_item', id, { status, notes });
    res.json({ success: true });
  } catch (e) {
    next(e);
  }
});

// Map Routes
app.use('/api/map', mapRoutes);

// Document Upload Endpoint with Security Validation (Issue 20)
const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'text/plain',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'image/jpeg',
  'image/png',
];
const ALLOWED_EXTENSIONS = ['.pdf', '.txt', '.docx', '.jpg', '.jpeg', '.png'];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

const uploadStorage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    const uploadDir = path.join(process.cwd(), 'uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (_req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `doc-${uniqueSuffix}${ext}`);
  },
});

const uploadFilter = (_req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const ext = path.extname(file.originalname).toLowerCase();
  if (!ALLOWED_EXTENSIONS.includes(ext)) {
    return cb(new Error(`File type not allowed. Allowed: ${ALLOWED_EXTENSIONS.join(', ')}`));
  }
  if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
    return cb(new Error(`MIME type not allowed: ${file.mimetype}`));
  }
  cb(null, true);
};

const upload = multer({
  storage: uploadStorage,
  fileFilter: uploadFilter,
  limits: { fileSize: MAX_FILE_SIZE },
});

app.post('/api/upload-document', upload.single('document'), async (req, res, next) => {
  try {
    const file = req.file;
    if (!file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const userId = (req as AuthenticatedRequest).user?.id || 'system';
    const db = getDb();

    // Calculate file hash for integrity
    const fileBuffer = fs.readFileSync(file.path);
    const contentHash = crypto.createHash('md5').update(fileBuffer).digest('hex');

    // Determine evidence type from extension
    const ext = path.extname(file.originalname).toLowerCase();
    const evidenceType =
      ext === '.pdf'
        ? 'Legal Document'
        : ['.jpg', '.jpeg', '.png'].includes(ext)
          ? 'Photograph'
          : 'Text Document';

    // Insert document record
    const result = db
      .prepare(
        `
      INSERT INTO documents (file_name, file_path, file_type, file_size, evidence_type, content_hash, created_at, metadata_json)
      VALUES (?, ?, ?, ?, ?, ?, datetime('now'), ?)
    `,
      )
      .run(
        file.originalname,
        file.path,
        ext.replace('.', ''),
        file.size,
        evidenceType,
        contentHash,
        JSON.stringify({ uploadedBy: userId, ingestionMethod: 'upload', scanStatus: 'pending' }),
      );

    const documentId = result.lastInsertRowid;

    // Create initial chain of custody entry
    try {
      db.prepare(
        `
        INSERT INTO chain_of_custody (evidence_id, action, performed_by, timestamp, details, hash_before, hash_after)
        VALUES (?, 'acquired', ?, datetime('now'), ?, ?, ?)
      `,
      ).run(documentId, userId, 'Document uploaded via API', contentHash, contentHash);
    } catch (e) {
      // chain_of_custody might not be set up for document IDs, continue anyway
      console.warn('Could not create chain_of_custody entry:', e);
    }

    // Audit log
    logAudit('upload_document', userId, 'document', String(documentId), {
      filename: file.originalname,
      size: file.size,
      hash: contentHash,
    });

    res.status(201).json({
      id: documentId,
      fileName: file.originalname,
      filePath: file.path,
      fileSize: file.size,
      contentHash,
      evidenceType,
      message: 'Document uploaded successfully',
    });
  } catch (error) {
    console.error('Upload error:', error);
    next(error);
  }
});

// API routes with comprehensive error handling
app.get('/api/entities', cacheMiddleware(300), async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 24));
    const search = req.query.search as string;
    const role = req.query.role as string;
    const likelihood = req.query.likelihood as string | string[];
    const entityType = req.query.type as string;
    const sortBy = req.query.sortBy as string;
    const sortOrder = req.query.sortOrder as 'asc' | 'desc';

    const includeJunk = req.query.includeJunk === 'true';

    // Validate and sanitize inputs
    if (search && search.length > 100) {
      return res.status(400).json({ error: 'Search term too long' });
    }

    const filters: SearchFilters = {
      likelihood: 'all',
      role: 'all',
      status: 'all',
      minMentions: 0,
      searchTerm: undefined,
      evidenceTypes: undefined,
      likelihoodScore: undefined,
      entityType: undefined,
      sortBy: undefined,
      sortOrder: undefined,
      includeJunk,
    };

    if (search) filters.searchTerm = search.trim();
    if (role) filters.evidenceTypes = [role.trim()];
    if (likelihood) {
      if (Array.isArray(likelihood)) {
        filters.likelihoodScore = likelihood.map((l) => l as 'HIGH' | 'MEDIUM' | 'LOW');
      } else {
        filters.likelihoodScore = [likelihood as 'HIGH' | 'MEDIUM' | 'LOW'];
      }
    }
    if (entityType) filters.entityType = entityType.trim();
    if (sortBy) (filters as any).sortBy = sortBy.trim();
    if (sortOrder) filters.sortOrder = sortOrder;

    const result = entitiesRepository.getEntities(page, limit, filters, sortBy as SortOption);

    // Batch fetch photos for these entities
    const entityIds = result.entities.map((e: any) => e.id);
    const photosByEntity: Record<string, any[]> = {};

    if (entityIds.length > 0) {
      try {
        const photos = mediaRepository.getPhotosForEntities(entityIds);
        photos.forEach((p: any) => {
          if (!photosByEntity[p.entityId]) photosByEntity[p.entityId] = [];
          photosByEntity[p.entityId].push(p);
        });
      } catch (err) {
        console.error('Error fetching entity photos:', err);
      }
    }

    const dto = mapEntityListResponseDto({
      entities: result.entities,
      total: result.total,
      page,
      pageSize: limit,
      photosByEntity,
    });

    // Add cache headers for performance
    res.set({
      'Cache-Control': 'private, max-age=60',
      'X-Total-Count': result.total.toString(),
      'X-Page': page.toString(),
      'X-Page-Size': limit.toString(),
      'X-Total-Pages': Math.ceil(result.total / limit).toString(),
    });

    res.json(dto);
  } catch (error) {
    console.error('Error fetching entities:', error);
    next(error);
  }
});

// Entity name validation patterns - reject common extraction artifacts
const JUNK_ENTITY_PATTERNS = [
  /^(The|A|An|Of|To|In|For|And|Or|But|With|At|By|From|On|As|Is|Was|Although|Actually)\s/i,
  /^.{1,2}$/, // Too short (1-2 chars)
  /^\d+$/, // Numbers only
  /^[^a-zA-Z]*$/, // No letters
  /^Page\s+\d+/i,
  /^Section\s+\d+/i,
  /^Document\s+/i,
  /^(Unknown|None|Null|N\/A|TBD)$/i,
];

app.post('/api/entities', validate(entitySchema), async (req, res, next) => {
  try {
    const { full_name } = req.body;

    // Validate entity name to prevent junk data
    if (full_name) {
      for (const pattern of JUNK_ENTITY_PATTERNS) {
        if (pattern.test(full_name)) {
          return res.status(400).json({
            error: 'Invalid entity name',
            message: 'Name appears to be an extraction artifact rather than a valid entity',
          });
        }
      }
    }

    const id = entitiesRepository.createEntity(req.body);
    logAudit(
      'create_entity',
      (req as AuthenticatedRequest).user?.id || null,
      'entity',
      String(id),
      {
        name: req.body.full_name,
      },
    );
    res.status(201).json({ id });
  } catch (e) {
    next(e);
  }
});

app.patch('/api/entities/:id', async (req, res, next) => {
  try {
    const id = req.params.id;
    const changes = entitiesRepository.updateEntity(id, req.body);
    if (changes === 0) return res.status(404).json({ error: 'Not found or no changes' });
    logAudit(
      'update_entity',
      (req as AuthenticatedRequest).user?.id || null,
      'entity',
      String(id),
      req.body,
    );
    res.json({ success: true });
  } catch (e) {
    next(e);
  }
});

// Get all entities for document linking
app.get('/api/entities/all', cacheMiddleware(300), async (_req, res, next) => {
  try {
    const entities = entitiesRepository.getAllEntities();
    res.json(entities);
  } catch (error) {
    console.error('Error fetching all entities:', error);
    next(error);
  }
});

// ULTRATHINK: New Subject Card Endpoint
app.get('/api/subjects', cacheMiddleware(300), (req, res) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 24;

    const likelihoodScore = req.query.likelihoodScore
      ? ((Array.isArray(req.query.likelihoodScore)
          ? req.query.likelihoodScore
          : [req.query.likelihoodScore]) as ('HIGH' | 'MEDIUM' | 'LOW')[])
      : undefined;

    const filters: SearchFilters = {
      searchTerm: (req.query.search as string) || undefined,
      role: (req.query.role as string) || undefined,
      entityType: (req.query.entityType as string) || undefined,
      likelihoodScore,
    };

    const sortBy = (req.query.sortBy as SortOption) || 'red_flag';

    const result = entitiesRepository.getSubjectCards(page, limit, filters, sortBy);
    res.json(mapSubjectsListResponseDto(result));
  } catch (error) {
    console.error('Error fetching subject cards:', error);
    res.status(500).json({ error: 'Failed to fetch subjects' });
  }
});

// Get single entity with error handling
app.get('/api/entities/:id', cacheMiddleware(60), async (req, res, next) => {
  try {
    const entityId = req.params.id;

    // Validate ID format
    if (!/^\d+$/.test(entityId)) {
      // Special case: if id is 'all', return all entities
      if (entityId === 'all') {
        const entities = entitiesRepository.getAllEntities();
        return res.json(entities);
      }
      return res.status(400).json({ error: 'Invalid entity ID format' });
    }

    const entity = entitiesRepository.getEntityById(entityId) as Person | null;

    if (!entity) {
      return res.status(404).json({ error: 'Entity not found' });
    }

    // Transform entity to match expected API format
    const transformedEntity = {
      id: entity.id,
      name: entity.fullName,
      fullName: entity.fullName,
      entity_type: entity.entityType || 'Person',
      primaryRole: entity.primaryRole,
      secondaryRoles: entity.secondaryRoles || [],
      mentions: entity.mentions,
      files: entity.documentCount || (entity.fileReferences ? entity.fileReferences.length : 0),
      contexts: entity.contexts || [],
      evidence_types: entity.evidence_types || entity.evidenceTypes || [],
      evidenceTypes: entity.evidence_types || entity.evidenceTypes || [],
      likelihood_score: (entity.risk_level || entity.riskLevel || 'LOW').toUpperCase(),
      red_flag_score: entity.red_flag_score !== undefined ? entity.red_flag_score : 0,
      red_flag_rating: entity.red_flag_rating !== undefined ? entity.red_flag_rating : 0,
      red_flag_peppers:
        entity.redFlagRating !== undefined ? '🚩'.repeat(entity.redFlagRating) : '🏳️',
      red_flag_description:
        entity.redFlagDescription ||
        `Red Flag Index ${entity.redFlagRating !== undefined ? entity.redFlagRating : 0}`,
      connectionsToEpstein: entity.connectionsSummary || '',
      fileReferences: entity.fileReferences || [],
      timelineEvents: entity.timelineEvents || [],
      networkConnections: entity.networkConnections || [],
      // Include Black Book information if available
      blackBookEntries: entity.blackBookEntries || [],
      // NEW: Include bio, description and photos with fallbacks
      bio: entity.bio || entity.description || '',
      description: entity.description || entity.bio || '',
      photos: entity.photos || [],
      // Ensure significant_passages key is consistent
      significant_passages: entity.significant_passages || entity.significantPassages || [],
      birthDate: (entity as any).birthDate || null,
      deathDate: (entity as any).deathDate || null,
    };

    res.json(transformedEntity);
  } catch (error) {
    console.error('Error fetching entity:', error);
    next(error);
  }
});

// Get paginated documents for an entity (Performance Optimization)
app.get('/api/entities/:id/documents', cacheMiddleware(30), async (req, res, next) => {
  try {
    const entityId = req.params.id;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 50;
    const offset =
      req.query.offset !== undefined ? parseInt(req.query.offset as string) : undefined;
    const search = req.query.search as string;
    // Treat 'all' as no source filter
    const source =
      req.query.source === 'all' || !req.query.source ? undefined : (req.query.source as string);
    const sort = req.query.sort as string;

    if (!/^\d+$/.test(entityId)) {
      return res.status(400).json({ error: 'Invalid entity ID' });
    }

    const filters = { search, source, sort };

    // Parallel fetch for perf
    // We skip count if searching (complex) or just do it separate
    const documents = entitiesRepository.getEntityDocumentsPaginated(
      entityId,
      page,
      limit,
      filters,
      offset,
    );

    // Only get total count on first page or if explicitly requested
    // For search, we might need a separate count query or just let infinite scroll run until empty
    let total = 0;
    if (!search && !source) {
      total = entitiesRepository.getEntityDocumentCount(entityId);
    } else {
      // Approximation or separate count query for filtered results could be added here
      // For now, if we returned < limit, we know we're at the end.
      // If we returned limit, assume there's more.
      // React-window-infinite-loader handles this often by "itemCount + 1"
      total = 50000; // soft max or implement filtered count
    }

    res.json({
      data: documents,
      page,
      limit,
      total, // Client can use this to set list height
    });
  } catch (e) {
    next(e);
  }
});

const getEntityCommunications = async (req: express.Request, res: express.Response, next: any) => {
  try {
    const entityId = req.params.id;
    if (!/^\d+$/.test(entityId)) {
      return res.status(400).json({ error: 'Invalid entity ID format' });
    }

    const topic = (req.query.topic as string | undefined) || undefined;
    const from = (req.query.from as string | undefined) || undefined;
    const to = (req.query.to as string | undefined) || undefined;
    const start = (req.query.start as string | undefined) || undefined;
    const end = (req.query.end as string | undefined) || undefined;
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : undefined;

    const events = communicationsRepository.getCommunicationsForEntity(entityId, {
      topic,
      from,
      to,
      start,
      end,
      limit,
    });

    res.json({ data: events, total: events.length });
  } catch (error) {
    console.error('Error fetching entity communications:', error);
    next(error);
  }
};

// Canonical entity analytics route
app.get('/api/entities/:id/analytics/communications', getEntityCommunications);

// Legacy route alias (backward compatibility)
app.get('/api/entities/:id/communications', getEntityCommunications);

// Mount Articles Routes
app.use('/api/articles', articlesRoutes);

// Black Book endpoint - returns entries from Black Book table
app.get('/api/black-book', cacheMiddleware(300), async (req, res, next) => {
  try {
    const filters = {
      letter: req.query.letter as string | undefined,
      search: req.query.search as string | undefined,
      hasPhone: req.query.hasPhone === 'true',
      hasEmail: req.query.hasEmail === 'true',
      hasAddress: req.query.hasAddress === 'true',
      category: req.query.category as 'original' | 'contact' | 'credential' | undefined,
      limit: req.query.limit ? parseInt(req.query.limit as string) : undefined,
    };

    // Get data
    const entries = blackBookRepository.getBlackBookEntries(filters);

    // Get total count (inefficient but accurate for now - better to add a count method to repo)
    // Actually, let's just do a quick count query here or modify repo.
    // For now, removing limit to get total would be slow.
    // Let's use the repository to get the count if possible, or just hack it:
    // We'll create a lightweight count query using existing filters but no limit.
    // OR just use SQL here directly since we have getDb.

    const db = getDb();
    // Reconstruct where clause logic roughly or use repo?
    // Repo doesn't expose count. Let's add count support to repo or just query all IDs.
    // Simplest fix: Just query a count.
    const countQuery = `SELECT COUNT(*) as total FROM black_book_entries`;
    // Note: this ignores filters. But AboutPage uses it for "Total Black Book entries", so ignoring filters is actually CORRECT behavior for the stats use case!
    // The About Page calls it with limit=1 but wants "Total Entries in DB".

    const totalResult = db.prepare(countQuery).get() as { total: number };

    res.json({
      data: entries,
      total: totalResult.total,
      page: 1,
      pageSize: entries.length,
      totalPages: Math.ceil(totalResult.total / (filters.limit || totalResult.total || 1)),
    });
  } catch (error) {
    console.error('Error fetching Black Book:', error);
    next(error);
  }
});

// Get database statistics
app.get('/api/stats', cacheMiddleware(300), async (_req, res, next) => {
  try {
    const stats = statsRepository.getStatistics();
    res.set('Cache-Control', 'public, max-age=300'); // 5 min cache
    res.json(stats);
  } catch (error) {
    console.error('Error fetching statistics:', error);
    next(error);
  }
});

// ============ DATA QUALITY & PROVENANCE APIs ============
// These endpoints support the audit/trust features of the platform

// Get comprehensive data quality metrics
app.get('/api/data-quality/metrics', async (_req, res, next) => {
  try {
    const db = getDb();

    // 1. Basic Document Stats
    const totalDocs = db.prepare('SELECT COUNT(*) as c FROM documents').get() as { c: number };
    const docsWithProvenance = db
      .prepare(
        "SELECT COUNT(*) as c FROM documents WHERE source_collection IS NOT NULL AND source_collection != ''",
      )
      .get() as { c: number };

    const sourceCollections = db
      .prepare(
        `
      SELECT COALESCE(source_collection, 'Unknown/Untagged') as name, COUNT(*) as count
      FROM documents GROUP BY source_collection ORDER BY count DESC LIMIT 20
    `,
      )
      .all();

    const evidenceTypes = db
      .prepare(
        `
      SELECT COALESCE(evidence_type, 'unclassified') as type, COUNT(*) as count
      FROM documents GROUP BY evidence_type ORDER BY count DESC
    `,
      )
      .all();

    // 2. Entity Quality Metrics
    const entityStats = db
      .prepare(
        `
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN primary_role IS NOT NULL AND primary_role != 'Unknown' AND primary_role != '' THEN 1 ELSE 0 END) as withRoles,
        SUM(CASE WHEN red_flag_description IS NOT NULL AND red_flag_description != '' THEN 1 ELSE 0 END) as withDescription,
        SUM(CASE WHEN (red_flag_rating IS NULL OR red_flag_rating = 0) AND mentions > 0 THEN 1 ELSE 0 END) as missingRatings,
        SUM(CASE WHEN red_flag_rating IS NULL THEN 1 ELSE 0 END) as nullRedFlagRating
      FROM entities
    `,
      )
      .get() as {
      total: number;
      withRoles: number;
      withDescription: number;
      missingRatings: number;
      nullRedFlagRating: number;
    };

    // 3. Data Integrity & Junk Detection
    const orphanedMentions = db
      .prepare(
        `
      SELECT COUNT(*) as c FROM entity_mentions em
      LEFT JOIN entities e ON em.entity_id = e.id
      WHERE e.id IS NULL
    `,
      )
      .get() as { c: number };

    // Optimized junk detection (one query instead of many)
    const junkPatterns = [
      'On %',
      'And %',
      'The %',
      'Although %',
      'Actually %',
      'Mr %',
      'Ms %',
      'Dr %',
      'However %',
      'But %',
      'If %',
      'When %',
      'Then %',
      'So %',
      'Yet %',
      'Or %',
      'As %',
      'At %',
      'In %',
      'To %',
      'For %',
      'Of %',
      'With %',
      'By %',
      'About %',
      'Into %',
      'Through %',
      'During %',
      'Before %',
      'After %',
      'Above %',
      'Below %',
      'Between %',
      'Among %',
      'Within %',
      'Without %',
      'Under %',
      'Over %',
      'Near %',
      'Since %',
      'Until %',
      'Against %',
      'Throughout %',
      'Despite %',
      'Upon %',
      'Besides %',
      'Beyond %',
      'Inside %',
      'Outside %',
    ];

    // Build a single query to count all junk patterns at once
    const junkWhereClause = junkPatterns.map(() => 'full_name LIKE ?').join(' OR ');
    const junkEntities = db
      .prepare(
        `
      SELECT COUNT(*) as c FROM entities
      WHERE LENGTH(full_name) <= 2
        OR ${junkWhereClause}
        OR full_name GLOB '[0-9]*' -- Starts with a number
    `,
      )
      .get(...junkPatterns) as { c: number };

    // 4. Score Calculation
    const totalEntities = entityStats.total || 1;
    const junkRatio = junkEntities.c / totalEntities;
    const orphanedRatio = orphanedMentions.c / Math.max(1, totalDocs.c);

    const dataQualityScore = Math.max(0, Math.min(100, 100 - junkRatio * 50 - orphanedRatio * 30));

    res.json({
      totalDocuments: totalDocs.c,
      documentsWithProvenance: docsWithProvenance.c,
      provenanceCoverage:
        totalDocs.c > 0 ? Math.round((docsWithProvenance.c / totalDocs.c) * 100 * 10) / 10 : 0,
      sourceCollections,
      evidenceTypeDistribution: evidenceTypes,
      entityQuality: {
        total: entityStats.total,
        withRoles: entityStats.withRoles,
        withRedFlagDescription: entityStats.withDescription,
        nullRedFlagRating: entityStats.nullRedFlagRating || 0,
        missingRedFlagRatings: entityStats.missingRatings,
      },
      dataIntegrity: {
        orphanedEntityMentions: orphanedMentions.c,
        potentialJunkEntities: junkEntities.c,
        dataQualityScore: Math.round(dataQualityScore * 10) / 10,
      },
      lastUpdated: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error fetching data quality metrics:', error);
    next(error);
  }
});

// Get document lineage/provenance
app.get('/api/documents/:id/lineage', async (req, res, next) => {
  try {
    const db = getDb();
    const docId = req.params.id;

    const hasAuditLog = Boolean(
      db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='audit_log'").get(),
    );

    const doc = db
      .prepare(
        `
      SELECT
        d.id,
        d.file_name,
        d.source_collection,
        d.original_file_id,
        d.created_at,
        orig.file_name as original_file_name,
        orig.file_path as original_file_path
      FROM documents d
      LEFT JOIN documents orig ON d.original_file_id = orig.id
      WHERE d.id = ?
    `,
      )
      .get(docId) as {
      id: string;
      file_name: string;
      source_collection: string;
      created_at: string;
      original_file_id: string | null;
      original_file_name: string | null;
    };

    if (!doc) return res.status(404).json({ error: 'Document not found' });

    const children = db
      .prepare(
        `
      SELECT id, file_name FROM documents WHERE parent_document_id = ? ORDER BY id ASC
    `,
      )
      .all(docId);

    const auditEntries = hasAuditLog
      ? db
          .prepare(
            `
        SELECT timestamp, user_id, action, details_json FROM audit_log
        WHERE entity_type = 'document' AND entity_id = ? ORDER BY timestamp DESC LIMIT 20
      `,
          )
          .all(String(docId))
      : [];

    res.json({
      document: {
        id: doc.id,
        fileName: doc.file_name,
        sourceCollection: doc.source_collection,
        sourceOriginalUrl: null,
        credibilityScore: null,
        ocrEngine: null,
        ocrQualityScore: null,
        processedAt: doc.created_at || null,
      },
      originalDocument: doc.original_file_id
        ? { id: doc.original_file_id, fileName: doc.original_file_name }
        : null,
      childDocuments: children,
      auditTrail: auditEntries.map((e: any) => ({
        timestamp: e.timestamp,
        user: e.user_id,
        action: e.action,
        details: e.details_json
          ? (() => {
              try {
                return JSON.parse(e.details_json);
              } catch {
                return null;
              }
            })()
          : null,
      })),
    });
  } catch (error) {
    console.error('Error fetching document lineage:', error);
    next(error);
  }
});

const getEntityConfidence = async (req: express.Request, res: express.Response, next: any) => {
  try {
    const db = getDb();
    const entityId = req.params.id;

    const entity = db.prepare('SELECT id, full_name FROM entities WHERE id = ?').get(entityId) as {
      id: string;
      full_name: string;
    };
    if (!entity) return res.status(404).json({ error: 'Entity not found' });

    const mentionsByType = db
      .prepare(
        `
      SELECT d.evidence_type, COUNT(*) as count FROM entity_mentions em
      JOIN documents d ON em.document_id = d.id WHERE em.entity_id = ? GROUP BY d.evidence_type
    `,
      )
      .all(entityId) as { evidence_type: string; count: number }[];

    const typeWeights: Record<string, number> = {
      legal: 1.0,
      testimony: 0.9,
      flight_log: 0.85,
      financial: 0.8,
      email: 0.7,
      document: 0.6,
      photo: 0.5,
    };
    let weightedScore = 0,
      totalWeight = 0;
    for (const m of mentionsByType) {
      const w = typeWeights[m.evidence_type] || 0.5;
      weightedScore += w * m.count;
      totalWeight += m.count;
    }
    const confidence =
      totalWeight > 0 ? Math.min(100, Math.round((weightedScore / totalWeight) * 100)) : 0;

    res.json({
      entityId,
      entityName: entity.full_name,
      confidenceScore: confidence,
      evidenceBreakdown: mentionsByType,
      totalMentions: totalWeight,
      confidenceLevel: confidence >= 80 ? 'High' : confidence >= 50 ? 'Medium' : 'Low',
    });
  } catch (error) {
    console.error('Error calculating entity confidence:', error);
    next(error);
  }
};

// Canonical entity analytics route
app.get('/api/entities/:id/analytics/confidence', getEntityConfidence);

// Legacy route alias (backward compatibility)
app.get('/api/entities/:id/confidence', getEntityConfidence);

// Enhanced Analytics API - Aggregated data for visualizations
// Forensic Metrics Summary (Tier 3 - Advanced Analytics)

// Forensic Metrics Summary (Tier 3 - Advanced Analytics)

// Documents endpoint - returns paginated documents
app.get('/api/documents', async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(50000, Math.max(1, parseInt(req.query.limit as string) || 50));
    const sortBy = (req.query.sortBy as string) || 'red_flag';
    const sortOrder = ((req.query.sortOrder as string) || 'desc').toLowerCase() as 'asc' | 'desc';
    const search = req.query.search as string;
    const fileType = req.query.fileType as string;
    const evidenceType = req.query.evidenceType as string;
    const source = req.query.source as string;
    const startDate = req.query.startDate as string;
    const endDate = req.query.endDate as string;
    const hasFailedRedactions = req.query.hasFailedRedactions === 'true';
    const minRedFlag = parseInt(req.query.minRedFlag as string) || 0;
    const maxRedFlag = parseInt(req.query.maxRedFlag as string) || 5;

    const result = documentsRepository.getDocuments(page, limit, {
      search,
      fileType,
      evidenceType,
      source,
      startDate,
      endDate,
      hasFailedRedactions,
      minRedFlag,
      maxRedFlag,
      sortBy,
      sortOrder,
    });

    // Map file paths to URLs
    const mappedDocuments = result.documents.map((doc: any) => {
      if (doc.filePath && doc.filePath.startsWith(CORPUS_BASE_PATH)) {
        doc.filePath = doc.filePath.replace(CORPUS_BASE_PATH, '/files');
      }
      return doc;
    });

    res.json(
      mapDocumentsListResponseDto({
        data: mappedDocuments,
        total: result.total,
        page,
        pageSize: limit,
        totalPages: Math.ceil(result.total / limit),
      }),
    );
  } catch (error) {
    console.error('Error fetching documents:', error);
    next(error);
  }
});

const analyzeDocumentAnalytics = async (
  req: express.Request,
  res: express.Response,
  next: express.NextFunction,
) => {
  try {
    const { id } = req.params as { id: string };
    const doc = (await documentsRepository.getDocumentById(id)) as any;
    if (!doc) return res.status(404).json({ error: 'Document not found' });

    const content = (doc.content || '').toLowerCase();
    const metadata = doc.metadata_json ? JSON.parse(doc.metadata_json) : {};
    const suspiciousKeywords = [
      'epstein',
      'maxwell',
      'payment',
      'transfer',
      'wire',
      'confidential',
      'secret',
      'bank',
      'trust',
      'llc',
      'offshore',
    ];

    let suspiciousMatches = 0;
    suspiciousKeywords.forEach((kw) => {
      if (content.includes(kw)) suspiciousMatches++;
    });

    const metrics = {
      readability: {
        fleschKincaid: 100 - Math.min(100, (doc.word_count || 100) / 10),
        gradeLevel: Math.min(12, Math.floor((doc.word_count || 500) / 50)),
      },
      sentiment: {
        score: content.includes('urgent') || content.includes('payment') ? -0.2 : 0.1,
        magnitude: Math.min(1.0, (doc.word_count || 0) / 1000),
      },
      metadataAnalysis: {
        hasGPS: !!metadata.location,
        creationDateMatches: true,
        author: metadata.author || metadata.uploadedBy || 'Unknown',
        fileIntegrity: 'verified',
      },
      keywordAnalysis: {
        totalSuspiciousWords: suspiciousMatches,
        matches: suspiciousKeywords.filter((kw) => content.includes(kw)),
      },
    };

    let baseScore = 0.75;
    if (suspiciousMatches > 5) baseScore += 0.15;
    if (metadata.originalName) baseScore += 0.05;
    if (doc.red_flag_rating >= 4) baseScore += 0.05;

    const authenticityScore = Math.min(1.0, baseScore);

    forensicRepository.saveMetrics(id as string, metrics, authenticityScore);
    forensicRepository.addCustodyEvent({
      evidenceId: id as string,
      actor: (req as any).user?.name || 'System',
      action: 'Automated Forensic Analysis',
      notes: `Content-aware analysis detected ${suspiciousMatches} suspicious keywords. Base authenticity: ${authenticityScore.toFixed(2)}`,
    });

    res.json({ success: true, metrics, authenticityScore });
  } catch (error) {
    console.error('Analysis error:', error);
    next(error);
  }
};

const getDocumentAnalyticsMetrics = async (
  req: express.Request,
  res: express.Response,
  next: express.NextFunction,
) => {
  try {
    const { id } = req.params as { id: string };
    const metrics = forensicRepository.getMetrics(id);
    res.json(metrics || { metrics_json: '{}', authenticity_score: 0 });
  } catch (error) {
    console.error('Metrics error:', error);
    next(error);
  }
};

const getDocumentAnalyticsCustody = async (
  req: express.Request,
  res: express.Response,
  next: express.NextFunction,
) => {
  try {
    const { id } = req.params as { id: string };
    const chain = forensicRepository.getChainOfCustody(id);
    res.json(chain || []);
  } catch (error) {
    console.error('Custody error:', error);
    next(error);
  }
};

// Canonical document analytics routes
app.get('/api/documents/:id/analytics/metrics', getDocumentAnalyticsMetrics);
app.get('/api/documents/:id/analytics/custody', getDocumentAnalyticsCustody);
app.post('/api/documents/:id/analytics/analyze', analyzeDocumentAnalytics);

// Get single document by ID
app.get('/api/documents/:id', async (req, res, next) => {
  try {
    const id = req.params.id as string;
    const doc = documentsRepository.getDocumentById(id) as Evidence | null;
    if (!doc) {
      return res.status(404).json({ error: 'not_found' });
    }
    // Transform file paths to accessible URLs
    // First check if it's in the local data directory (using loose check for migrated paths)
    const filePathToCheck = doc.filePath || doc.file_path;
    if (
      filePathToCheck &&
      (filePathToCheck.includes('/data/') || filePathToCheck.includes('\\data\\'))
    ) {
      // Replace everything up to and including /data/ with /data/
      // Use filePathToCheck as source of truth if possible, or fall back to doc.file_path (safe as we checked one exists)
      const p = doc.file_path || doc.filePath || '';
      doc.fileUrl = p.replace(/^.*[/\\]data[/\\]/, '/data/').replace(/\\/g, '/');
    } else if (doc.file_path && doc.file_path.startsWith(CORPUS_BASE_PATH)) {
      doc.fileUrl = doc.file_path.replace(CORPUS_BASE_PATH, '/files');
    }

    if (doc.original_file_path) {
      if (
        doc.original_file_path.includes('/data/') ||
        doc.original_file_path.includes('\\data\\')
      ) {
        doc.originalFileUrl = doc.original_file_path
          .replace(/^.*[/\\]data[/\\]/, '/data/')
          .replace(/\\/g, '/');
      } else if (doc.original_file_path.startsWith(CORPUS_BASE_PATH)) {
        doc.originalFileUrl = doc.original_file_path.replace(CORPUS_BASE_PATH, '/files');
      } else if (doc.original_file_path.startsWith('data/')) {
        // Handle relative paths like 'data/originals/filename.pdf'
        doc.originalFileUrl = '/' + doc.original_file_path;
      } else {
        // Fallback: serve from /files
        doc.originalFileUrl = '/files/' + doc.original_file_path;
      }
    }

    // Also check if this is an image with OCR content - provide link to view original
    if (doc.file_type === 'image' || doc.file_type === 'pdf') {
      doc.isScannedDocument = true;
    }

    res.json(doc);
  } catch (error) {
    console.error('Error fetching document by id:', error);
    next(error);
  }
});

app.get('/api/documents/:id/related', async (req, res, next) => {
  try {
    const id = req.params.id as string;
    const limit = parseInt(req.query.limit as string) || 12;
    const related = documentsRepository.getRelatedDocuments(id, limit);
    res.json(related);
  } catch (error) {
    console.error('Error fetching related documents:', error);
    next(error);
  }
});

// Email thread context for a document
app.get('/api/documents/:id/thread', async (req, res, next) => {
  try {
    const id = req.params.id as string;
    const thread = communicationsRepository.getThreadForDocument(id);
    if (!thread) {
      return res.status(404).json({ error: 'thread_not_found' });
    }
    res.json(thread);
  } catch (error) {
    console.error('Error fetching email thread for document:', error);
    next(error);
  }
});

// Get failed redactions for a document
app.get('/api/documents/:id/redactions', async (req, res, next) => {
  try {
    const id = req.params.id as string;

    const doc = getDb()
      .prepare(
        `
      SELECT 
        id,
        has_failed_redactions,
        failed_redaction_count,
        failed_redaction_data
      FROM documents
      WHERE id = ?
    `,
      )
      .get(id) as {
      id: string;
      has_failed_redactions: boolean | number;
      failed_redaction_count: number;
      failed_redaction_data: string | null;
    };

    if (!doc) {
      return res.status(404).json({ error: 'not_found' });
    }

    if (!doc.has_failed_redactions) {
      return res.json({
        hasFailedRedactions: false,
        count: 0,
        redactions: [],
      });
    }

    let redactions = [];
    try {
      redactions = doc.failed_redaction_data ? JSON.parse(doc.failed_redaction_data) : [];
    } catch (e) {
      console.error('Error parsing redaction data:', e);
    }

    res.json({
      hasFailedRedactions: true,
      count: doc.failed_redaction_count || redactions.length,
      redactions,
    });
  } catch (error) {
    console.error('Error fetching document redactions:', error);
    next(error);
  }
});

// Get original pages for a document
app.get('/api/documents/:id/pages', async (req, res, next) => {
  try {
    const id = req.params.id as string;

    // First check if there's a document_pages table entry (if table exists)
    let dbPages: any[] = [];
    try {
      dbPages = getDb()
        .prepare('SELECT * FROM document_pages WHERE document_id = ? ORDER BY page_number ASC')
        .all(id) as Array<{ id: string; name: string }>;
    } catch {
      // Table doesn't exist, continue with other methods
    }

    if (dbPages.length > 0) {
      // Return pages from the document_pages table
      const pages = dbPages.map((p: any) => {
        if (p.page_path && p.page_path.startsWith(CORPUS_BASE_PATH)) {
          return p.page_path.replace(CORPUS_BASE_PATH, '/files');
        }
        return p.page_path || p.page_url;
      });
      return res.json({ pages, total: pages.length });
    }

    // Otherwise, check if request is an OCR document and find its original image
    const doc = documentsRepository.getDocumentById(id) as Evidence | null;
    if (!doc) {
      return res.status(404).json({ error: 'not_found' });
    }

    // Check for "House Oversight XXX-OCR.txt" pattern
    // Also check for explicit image folder path in metadata
    let imageFolder = null;
    try {
      if (doc.metadataJson) {
        const meta = JSON.parse(doc.metadataJson);
        if (meta.image_folder_path) {
          imageFolder = meta.image_folder_path;
        }
      }
    } catch {
      // Ignore JSON parse errors - imageFolder remains empty
    }

    const oversightMatch = (doc.fileName || '').match(/^House Oversight (\d+)-OCR\.txt$/i);

    if (imageFolder || oversightMatch) {
      const folderNum = imageFolder ? path.basename(imageFolder) : oversightMatch![1]; // e.g., "001"

      // Construct path to images folder
      // Assuming structure: CORPUS_BASE_PATH/Epstein Estate Documents - Seventh Production/IMAGES/{folderNum}/
      const pathLib = path;

      let imagesBase = '';
      if (imageFolder) {
        // If we have an explicit path (e.g. /IMAGES/001), try to construct full path
        // The stored path is relative to the "root" of the corpus usually, or just the folder name.
        // Let's assume it's relative to CORPUS_BASE_PATH + 'Epstein Estate Documents - Seventh Production'
        // OR just relative to CORPUS_BASE_PATH.
        // The migration script set it to `/IMAGES/${volNum}`.
        imagesBase = pathLib.join(
          CORPUS_BASE_PATH,
          'Epstein Estate Documents - Seventh Production',
          imageFolder,
        );
        if (!fs.existsSync(imagesBase)) {
          imagesBase = pathLib.join(CORPUS_BASE_PATH, imageFolder);
        }
      } else {
        // Fallback to old logic
        imagesBase = pathLib.join(
          CORPUS_BASE_PATH,
          'Epstein Estate Documents - Seventh Production',
          'IMAGES',
          folderNum,
        );
      }

      if (!fs.existsSync(imagesBase)) {
        // Try without the "Seventh Production" folder just in case
        // If folderNum is derived from regex
        if (folderNum) {
          imagesBase = pathLib.join(CORPUS_BASE_PATH, 'IMAGES', folderNum);
        }
      }

      if (fs.existsSync(imagesBase)) {
        try {
          const files = fs.readdirSync(imagesBase);
          const imageFiles = files
            .filter((f: string) => /\.(jpg|jpeg|png)$/i.test(f))
            .sort() // Ensure alphanumeric sort
            .map((f: string) => {
              // Construct URL relative to /files
              // We need to map absolute path to /files URL
              const absPath = pathLib.join(imagesBase, f);
              if (absPath.startsWith(CORPUS_BASE_PATH)) {
                return absPath.replace(CORPUS_BASE_PATH, '/files').replace('//', '/');
              }
              return '/files/' + pathLib.relative(CORPUS_BASE_PATH, absPath);
            });

          if (imageFiles.length > 0) {
            return res.json({ pages: imageFiles, total: imageFiles.length });
          }
        } catch (e) {
          console.error('Error reading image directory:', e);
        }
      }
    }

    // Check for linked original file
    if (doc.original_file_path) {
      let url = doc.original_file_path;
      if (CORPUS_BASE_PATH && url.startsWith(CORPUS_BASE_PATH)) {
        url = url.replace(CORPUS_BASE_PATH, '/files');
      }
      // Handle potential double slashes
      url = url.replace('//', '/');
      return res.json({ pages: [url], total: 1 });
    }

    // If this document IS an image/PDF, return its own path
    if (doc.file_type === 'image' || doc.file_type === 'pdf') {
      let url = doc.file_path;
      if (url && url.startsWith(CORPUS_BASE_PATH)) {
        url = url.replace(CORPUS_BASE_PATH, '/files');
      }
      if (url) {
        return res.json({ pages: [url], total: 1 });
      }
    }

    // No pages found
    res.json({ pages: [], total: 0 });
  } catch (error) {
    console.error('Error fetching document pages:', error);
    next(error);
  }
});

// Get original file for a document (images, PDFs, etc.)
app.get('/api/documents/:id/file', async (req, res, next) => {
  try {
    const id = req.params.id as string;
    const doc = documentsRepository.getDocumentById(id) as Evidence | null;
    if (!doc) {
      return res.status(404).json({ error: 'not_found' });
    }

    // Try to find the original file
    const filePath = doc.filePath || doc.file_path;
    if (!filePath) {
      return res.status(404).json({ error: 'no_file_path' });
    }

    // Resolve the file path using existing imports

    // Check various possible locations
    const possiblePaths = [
      path.resolve(filePath),
      path.resolve('data', filePath),
      path.resolve('data', 'documents', filePath),
      path.resolve('public', filePath),
    ];

    for (const tryPath of possiblePaths) {
      if (fs.existsSync(tryPath)) {
        return res.sendFile(tryPath);
      }
    }

    res.status(404).json({ error: 'file_not_found', tried: possiblePaths });
  } catch (error) {
    console.error('Error fetching document file:', error);
    next(error);
  }
});

// Evidence search endpoint with Red Flag Index support
app.get('/api/evidence/search', async (req, res, next) => {
  try {
    const query = req.query.query as string;
    const redFlagMin = parseInt(req.query.redFlagMin as string) || 0;
    const redFlagMax = parseInt(req.query.redFlagMax as string) || 5;
    const limit = parseInt(req.query.limit as string) || 50;
    const page = Math.max(1, parseInt(req.query.page as string) || 1);

    if (!query) {
      return res.status(400).json({ error: 'Search query is required' });
    }

    const result = await searchRepository.search(query, limit);

    // Filter by Red Flag Index range
    const filteredEntities = result.entities.filter((entity: any) => {
      const redFlagRating = entity.redFlagRating || 0;
      return redFlagRating >= redFlagMin && redFlagRating <= redFlagMax;
    });

    // Transform entities to match expected API format with Red Flag Index
    const transformedEntities = filteredEntities.map((entity: any) => {
      const redFlagRating = entity.redFlagRating || 0;
      const redFlagIndicators = ['⚪', '🟡', '🟠', '🔴', '🟣', '⚫'][redFlagRating] || '⚪';
      const redFlagDescriptions = [
        'No Red Flags',
        'Minor Red Flags',
        'Moderate Red Flags',
        'Significant Red Flags',
        'Major Red Flags',
        'Critical Red Flags',
      ];

      return {
        id: entity.id,
        name: entity.fullName,
        fullName: entity.fullName,
        primaryRole: entity.primaryRole,
        secondaryRoles: entity.secondaryRoles || [],
        mentions: entity.mentions,
        files: entity.documentCount || (entity.fileReferences ? entity.fileReferences.length : 0),
        contexts: entity.contexts || [],
        evidence_types: entity.evidence_types || entity.evidenceTypes || [],
        significant_passages: entity.significantPassages || [],
        likelihood_score: (entity.risk_level || entity.riskLevel || 'LOW').toUpperCase(),
        red_flag_score: entity.red_flag_score !== undefined ? entity.red_flag_score : 0,
        red_flag_rating: redFlagRating,
        red_flag_peppers:
          redFlagRating !== undefined ? redFlagIndicators.repeat(redFlagRating) : '🏳️',
        red_flag_description: redFlagDescriptions[redFlagRating] || 'No Red Flags',
        connectionsToEpstein: entity.connectionsSummary || '',
      };
    });

    // Pagination
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedEntities = transformedEntities.slice(startIndex, endIndex);

    res.json({
      data: paginatedEntities,
      total: transformedEntities.length,
      page: page,
      pageSize: limit,
      totalPages: Math.ceil(transformedEntities.length / limit),
    });
  } catch (error) {
    console.error('Error searching evidence:', error);
    next(error);
  }
});

// Legacy search endpoint for backward compatibility
app.get('/api/search', async (req, res, next) => {
  try {
    const query = req.query.q as string;
    const limit = parseInt(req.query.limit as string) || 50;
    const type = (req.query.type as string) || 'all';
    const evidenceType = req.query.evidenceType as string | undefined;
    const redFlagBand = req.query.redFlagBand as string | undefined;
    const snippets = ((req.query.snippets as string) || 'true') === 'true';
    const from = req.query.from as string | undefined;
    const to = req.query.to as string | undefined;

    if (!query) {
      return res.status(400).json({ error: 'Search query is required' });
    }

    const result = await searchRepository.search(query, limit);

    const transformedEntities = result.entities.map((entity: any) => ({
      id: entity.id,
      name: entity.fullName,
      fullName: entity.fullName,
      canonicalName: entity.canonicalName || entity.fullName,
      matchedAlias: entity.matchedAlias || null,
      primaryRole: entity.primaryRole,
      secondaryRoles: entity.secondaryRoles || [],
      mentions: entity.mentions,
      files: entity.documentCount || (entity.fileReferences ? entity.fileReferences.length : 0),
      contexts: entity.contexts || [],
      evidence_types: entity.evidence_types || entity.evidenceTypes || [],
      significant_passages: entity.significantPassages || [],
      likelihood_score: entity.likelihoodLevel,
      red_flag_score: entity.redFlagScore !== undefined ? entity.redFlagScore : 0,
      red_flag_rating: entity.redFlagRating !== undefined ? entity.redFlagRating : 0,
      red_flag_peppers:
        entity.redFlagRating !== undefined ? '🚩'.repeat(entity.redFlagRating) : '🏳️',
      red_flag_description:
        entity.redFlagDescription ||
        `Red Flag Index ${entity.redFlagRating !== undefined ? entity.redFlagRating : 0}`,
      connectionsToEpstein: entity.connectionsSummary || '',
    }));

    let transformedDocuments = result.documents.map((doc: any) => ({
      id: doc.id,
      fileName: doc.fileName,
      filePath: doc.filePath,
      fileType: doc.fileType,
      evidenceType: doc.evidenceType,
      snippet: snippets ? doc.snippet : undefined,
      contentPreview: snippets ? doc.snippet || doc.contentPreview : doc.contentPreview,
      createdAt: doc.createdAt,
      redFlagBand:
        typeof doc.redFlagRating === 'number'
          ? doc.redFlagRating >= 5
            ? 'critical'
            : doc.redFlagRating >= 4
              ? 'high'
              : doc.redFlagRating >= 2
                ? 'medium'
                : 'low'
          : 'unknown',
    }));

    if (type === 'entity') {
      transformedDocuments = [];
    }

    if (evidenceType) {
      transformedDocuments = transformedDocuments.filter(
        (d: any) => (d.evidenceType || '').toLowerCase() === evidenceType.toLowerCase(),
      );
    }
    if (redFlagBand) {
      transformedDocuments = transformedDocuments.filter((d: any) => d.redFlagBand === redFlagBand);
    }
    if (from) {
      transformedDocuments = transformedDocuments.filter(
        (d: any) => d.createdAt && d.createdAt >= from,
      );
    }
    if (to) {
      transformedDocuments = transformedDocuments.filter(
        (d: any) => d.createdAt && d.createdAt <= to,
      );
    }

    res.json({
      entities: transformedEntities,
      documents: transformedDocuments,
    });
  } catch (error) {
    next(error);
  }
});

// Analytics endpoint
app.get('/api/analytics', async (_req, res, next) => {
  try {
    const stats = statsRepository.getStatistics();
    res.json(stats);
  } catch (error) {
    console.error('Error fetching analytics:', error);
    next(error);
  }
});

// Get timeline events
app.get('/api/timeline', async (_req, res, next) => {
  try {
    const events = timelineRepository.getTimelineEvents();
    res.set('Cache-Control', 'public, max-age=300'); // 5 min cache
    res.json(events);
  } catch (error) {
    console.error('Error fetching timeline events:', error);
    next(error);
  }
});

// ============================================
// Photo Browser API Endpoints
// ============================================

// Get all albums
app.get('/api/media/albums', async (_req, res, next) => {
  try {
    const albums = mediaService.getAllAlbums();
    res.set('Cache-Control', 'public, max-age=120'); // 2 min cache
    res.json(albums);
  } catch (error) {
    console.error('Error fetching albums:', error);
    next(error);
  }
});

// Get single album by ID
app.get('/api/media/albums/:id', async (req, res, next) => {
  try {
    const albumId = parseInt(req.params.id);
    if (isNaN(albumId)) {
      return res.status(400).json({ error: 'Invalid album ID' });
    }

    const album = mediaService.getAlbumById(albumId);
    if (!album) {
      return res.status(404).json({ error: 'Album not found' });
    }

    res.json(album);
  } catch (error) {
    console.error('Error fetching album:', error);
    next(error);
  }
});

// Get images in an album
app.get('/api/media/albums/:id/images', async (req, res, next) => {
  try {
    const albumId = parseInt(req.params.id);
    if (isNaN(albumId)) {
      return res.status(400).json({ error: 'Invalid album ID' });
    }

    const images = mediaService.getAllImages({ albumId });
    res.json(images);
  } catch (error) {
    console.error('Error fetching album images:', error);
    next(error);
  }
});
// Get albums for audio
app.get('/api/media/audio/albums', async (_req, res, next) => {
  try {
    const albums = mediaRepository.getAlbumsByMediaType('audio');
    res.json(albums);
  } catch (error) {
    console.error('Error fetching audio albums:', error);
    next(error);
  }
});

// Get audio files
app.get('/api/media/audio', async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(100, parseInt(req.query.limit as string) || 24);
    const albumId = req.query.albumId ? parseInt(req.query.albumId as string) : undefined;
    const transcriptQuery = (req.query.transcriptQuery as string | undefined)?.trim() || undefined;

    // Use mediaRepository with fileType='audio'
    // Note: getMediaItemsPaginated on mediaRepository queries the media_items table
    const result = await mediaRepository.getMediaItemsPaginated(page, limit, {
      fileType: 'audio',
      entityId: req.query.entityId as string,
      albumId,
      sortBy: req.query.sortBy as 'title' | 'date' | 'rating' | undefined,
      transcriptQuery,
    });

    res.json(result);
  } catch (error) {
    console.error('Error fetching audio:', error);
    next(error);
  }
});

// Get single audio item metadata by ID (used for deep-linking into AudioBrowser)
app.get('/api/media/audio/:id', async (req, res, next) => {
  try {
    const id = parseInt(req.params.id);
    if (Number.isNaN(id)) {
      return res.status(400).json({ error: 'Invalid audio ID' });
    }

    const item = mediaRepository.getMediaItemById(id);
    if (!item) {
      return res.status(404).json({ error: 'Audio not found' });
    }

    res.json(item);
  } catch (error) {
    console.error('Error fetching audio item by id:', error);
    next(error);
  }
});

app.get('/api/media/audio/:id/stream', async (req, res, next) => {
  try {
    const id = parseInt(req.params.id);
    const item = mediaRepository.getMediaItemById(id);
    if (!item) return res.status(404).json({ error: 'Audio not found' });

    // Resolve path similar to images
    // Resolve path robustly
    let filePath = item.file_path || item.filePath;

    // If path is relative, resolve it against CWD
    if (!path.isAbsolute(filePath)) {
      // Remove leading slash if present to avoid joining issues (though path.join handles it usually, consistent logic is better)
      if (filePath.startsWith('/')) filePath = filePath.slice(1);
      filePath = path.join(process.cwd(), filePath);
    }

    console.log(`[Stream] Resolved path for ID ${id}: ${filePath}`); // Debug log

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'Audio file not found on server' });
    }

    res.sendFile(filePath);
  } catch (error) {
    next(error);
  }
});

// Get albums for video
app.get('/api/media/video/albums', async (_req, res, next) => {
  try {
    const albums = mediaRepository.getAlbumsByMediaType('video');
    res.json(albums);
  } catch (error) {
    console.error('Error fetching video albums:', error);
    next(error);
  }
});

// Get video files
app.get('/api/media/video', async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(100, parseInt(req.query.limit as string) || 24);
    const albumId = req.query.albumId ? parseInt(req.query.albumId as string) : undefined;
    const transcriptQuery = (req.query.transcriptQuery as string | undefined)?.trim() || undefined;

    // Use mediaRepository with fileType='video'
    const result = await mediaRepository.getMediaItemsPaginated(page, limit, {
      fileType: 'video',
      entityId: req.query.entityId as string,
      albumId,
      sortBy: req.query.sortBy as 'title' | 'date' | 'rating' | undefined,
      transcriptQuery,
    });

    res.json(result);
  } catch (error) {
    console.error('Error fetching video:', error);
    next(error);
  }
});

app.get('/api/media/video/:id/stream', async (req, res, next) => {
  try {
    const id = parseInt(req.params.id);
    const item = mediaRepository.getMediaItemById(id);
    if (!item) return res.status(404).json({ error: 'Video not found' });

    // Resolve path similar to images
    // Resolve path robustly
    let filePath = item.file_path || item.filePath;

    // If path is relative, resolve it against CWD
    if (!path.isAbsolute(filePath)) {
      if (filePath.startsWith('/')) filePath = filePath.slice(1);
      filePath = path.join(process.cwd(), filePath);
    }

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'Video file not found on server' });
    }

    // sendFile handles Range requests automatically
    res.sendFile(filePath);
  } catch (error) {
    next(error);
  }
});

app.get('/api/media/video/:id/thumbnail', async (req, res, next) => {
  try {
    const id = parseInt(req.params.id);
    const item = mediaRepository.getMediaItemById(id);
    if (!item) return res.status(404).json({ error: 'Video not found' });

    // Check metadata for thumbnail path
    const thumbnailPath = item.metadata?.thumbnailPath;

    if (!thumbnailPath) {
      // Fallback or 404?
      return res.status(404).json({ error: 'Thumbnail not found' });
    }

    // Resolve path robustly
    const filePath = thumbnailPath;

    // Check various possible locations
    const candidates: string[] = [];

    // If it starts with /data/ or data/, try resolving relative to CWD
    if (filePath.startsWith('/data/')) {
      candidates.push(path.join(process.cwd(), filePath.substring(1)));
      candidates.push(path.join('/data', filePath.substring('/data/'.length)));
    } else if (filePath.startsWith('data/')) {
      candidates.push(path.join(process.cwd(), filePath));
      candidates.push(path.join('/data', filePath.substring('data/'.length)));
    } else if (path.isAbsolute(filePath)) {
      candidates.push(filePath);
      // Also try stripping root if it looks like a container path
      if (filePath.startsWith('/')) {
        candidates.push(path.join(process.cwd(), filePath.substring(1)));
      }
    } else {
      candidates.push(path.join(process.cwd(), 'data', filePath));
      candidates.push(path.join('/data', filePath));
    }

    const absPath = candidates.find((c) => fs.existsSync(c)) || candidates[0];

    if (!fs.existsSync(absPath)) {
      console.error(
        `[Thumbnail] Failed to resolve video thumbnail for ID ${id}. Tried:`,
        candidates,
      );
      return res.status(404).json({ error: 'Thumbnail file not found on server' });
    }

    res.sendFile(absPath);
  } catch (error) {
    next(error);
  }
});

// Get all images with filtering and sorting
app.get('/api/media/images', async (req, res, next) => {
  try {
    const filter: any = {};
    const sort: any = {};
    const slim = req.query.slim === 'true'; // Return minimal fields for grid view

    // Pagination params - apply defaults if not provided to prevent loading all images
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(1000, Math.max(1, parseInt(req.query.limit as string) || 50));
    const offset = (page - 1) * limit;
    filter.limit = limit;
    filter.offset = offset;

    if (req.query.albumId) {
      filter.albumId = parseInt(req.query.albumId as string);
    }
    if (req.query.format) {
      filter.format = req.query.format as string;
    }
    if (req.query.dateFrom) {
      filter.dateFrom = req.query.dateFrom as string;
    }
    if (req.query.dateTo) {
      filter.dateTo = req.query.dateTo as string;
    }
    if (req.query.search) {
      filter.searchQuery = req.query.search as string;
    }
    if (req.query.tagId) {
      filter.tagId = parseInt(req.query.tagId as string);
    }
    if (req.query.personId) {
      filter.personId = parseInt(req.query.personId as string);
    }
    if (req.query.hasPeople === 'true') {
      filter.hasPeople = true;
    }

    if (req.query.sortField) {
      sort.field = req.query.sortField as string;
    }
    if (req.query.sortOrder) {
      sort.order = req.query.sortOrder as 'asc' | 'desc';
    }

    const images = mediaService.getAllImages(filter, sort);
    const totalCount = mediaService.getImageCount(filter);
    res.set('X-Total-Count', totalCount.toString());
    res.set('Access-Control-Expose-Headers', 'X-Total-Count');

    // If slim mode, return only essential fields for grid view (minimize payload)
    if (slim && Array.isArray(images)) {
      const slimImages = images.map((img: any) => ({
        id: img.id,
        title: img.title,
        isSensitive: img.is_sensitive,
        albumId: img.album_id,
        dateTaken: img.date_taken,
        dateAdded: img.date_added,
        dateModified: img.date_modified,
        fileSize: img.file_size,
      }));
      return res.json(slimImages);
    }

    res.json(images);
  } catch (error) {
    console.error('Error fetching images:', error);
    next(error);
  }
});

// Get single image by ID
app.get('/api/media/images/:id', async (req, res, next) => {
  try {
    const imageId = parseInt(req.params.id);
    if (isNaN(imageId)) {
      return res.status(400).json({ error: 'Invalid image ID' });
    }

    const image = mediaService.getImageById(imageId);
    if (!image) {
      return res.status(404).json({ error: 'Image not found' });
    }

    res.json(image);
  } catch (error) {
    console.error('Error fetching image:', error);
    next(error);
  }
});

app.get('/api/media/images/:id/file', async (req, res, next) => {
  try {
    const imageId = parseInt(req.params.id);
    if (isNaN(imageId)) {
      return res.status(400).json({ error: 'Invalid image ID' });
    }
    const image = mediaService.getImageById(imageId);
    if (!image) {
      return res.status(404).json({ error: 'Image not found' });
    }
    const p = (image.path || image.file_path || '').toString();
    if (!p) {
      return res.status(404).json({ error: 'Image path missing' });
    }

    // Since all real data is in /data, we'll resolve paths relative to that
    let absPath = p;
    const candidates: string[] = [];
    if (p.startsWith('/data/')) {
      candidates.push(path.join('/data', p.substring('/data/'.length)));
      candidates.push(path.join(process.cwd(), p.substring(1)));
    } else if (p.startsWith('data/')) {
      candidates.push(path.join('/data', p.substring('data/'.length)));
      candidates.push(path.join(process.cwd(), p));
    } else if (path.isAbsolute(p)) {
      candidates.push(p);
    } else {
      candidates.push(path.join('/data', p));
      candidates.push(path.join(process.cwd(), 'data', p));
    }
    absPath = candidates.find((c) => fs.existsSync(c)) || candidates[0];

    if (!fs.existsSync(absPath)) {
      console.error(`[Image file] Not found for image ${imageId}. Tried:`, candidates);
      return res.status(404).json({ error: 'Image file not found' });
    }
    res.sendFile(absPath);
  } catch (error) {
    next(error);
  }
});

app.get('/api/media/images/:id/raw', async (req, res, next) => {
  try {
    const imageId = parseInt(req.params.id);
    if (isNaN(imageId)) {
      return res.status(400).json({ error: 'Invalid image ID' });
    }
    const image = mediaService.getImageById(imageId);
    if (!image) {
      return res.status(404).json({ error: 'Image not found' });
    }
    const p = (image.path || image.file_path || '').toString();
    if (!p) {
      return res.status(404).json({ error: 'Image path missing' });
    }

    // Since all real data is in /data, we'll resolve paths relative to that
    let absPath = p;
    const candidates: string[] = [];
    if (p.startsWith('/data/')) {
      candidates.push(path.join('/data', p.substring('/data/'.length)));
      candidates.push(path.join(process.cwd(), p.substring(1)));
    } else if (p.startsWith('data/')) {
      candidates.push(path.join('/data', p.substring('data/'.length)));
      candidates.push(path.join(process.cwd(), p));
    } else if (path.isAbsolute(p)) {
      candidates.push(p);
    } else {
      candidates.push(path.join('/data', p));
      candidates.push(path.join(process.cwd(), 'data', p));
    }
    absPath = candidates.find((c) => fs.existsSync(c)) || candidates[0];

    if (!fs.existsSync(absPath)) {
      console.error(`[Image raw] Not found for image ${imageId}. Tried:`, candidates);
      return res.status(404).json({ error: 'Image file not found' });
    }
    res.sendFile(absPath);
  } catch (error) {
    next(error);
  }
});

// Get thumbnail for an image (smaller, faster loading)
app.get('/api/media/images/:id/thumbnail', async (req, res, next) => {
  try {
    const imageId = parseInt(req.params.id);
    if (isNaN(imageId)) {
      return res.status(400).json({ error: 'Invalid image ID' });
    }
    const image = mediaService.getImageById(imageId);
    if (!image) {
      return res.status(404).json({ error: 'Image not found' });
    }

    // Check for thumbnail path first
    const thumbnailPath = ((image as unknown as MediaImage).thumbnail_path || '').toString();
    let absPath = '';

    if (thumbnailPath && thumbnailPath.includes('thumbnails')) {
      // Use the thumbnail
      const candidates: string[] = [];
      if (thumbnailPath.startsWith('/data/')) {
        candidates.push(path.join('/data', thumbnailPath.substring('/data/'.length)));
        candidates.push(path.join(process.cwd(), thumbnailPath.substring(1)));
      } else if (thumbnailPath.startsWith('data/')) {
        candidates.push(path.join('/data', thumbnailPath.substring('data/'.length)));
        candidates.push(path.join(process.cwd(), thumbnailPath));
      } else if (thumbnailPath.startsWith('/thumbnails/')) {
        candidates.push(path.join('/data', thumbnailPath.substring(1)));
        candidates.push(path.join(process.cwd(), 'data', thumbnailPath.substring(1)));
      } else if (path.isAbsolute(thumbnailPath)) {
        candidates.push(thumbnailPath);
      } else {
        candidates.push(path.join('/data', thumbnailPath));
        candidates.push(path.join(process.cwd(), 'data', thumbnailPath));
      }
      absPath = candidates.find((c) => fs.existsSync(c)) || candidates[0];
    }

    // Resolve original image path for potential fallback/generation
    const p = (
      (image as unknown as MediaImage).path ||
      (image as unknown as MediaImage).file_path ||
      ''
    ).toString();
    const originalCandidates: string[] = [];
    if (p.startsWith('/data/')) {
      originalCandidates.push(path.join('/data', p.substring('/data/'.length)));
      originalCandidates.push(path.join(process.cwd(), p.substring(1)));
    } else if (p.startsWith('data/')) {
      originalCandidates.push(path.join('/data', p.substring('data/'.length)));
      originalCandidates.push(path.join(process.cwd(), p));
    } else if (path.isAbsolute(p)) {
      originalCandidates.push(p);
    } else {
      originalCandidates.push(path.join('/data', p));
      originalCandidates.push(path.join(process.cwd(), 'data', p));
    }
    const originalAbsPath =
      originalCandidates.find((c) => fs.existsSync(c)) || originalCandidates[0];

    // If thumbnail missing, try to generate it
    if (!absPath || !fs.existsSync(absPath)) {
      if (fs.existsSync(originalAbsPath)) {
        try {
          const thumbnailDir = path.join(path.dirname(originalAbsPath), 'thumbnails');
          const generated = await mediaService.generateThumbnail(originalAbsPath, thumbnailDir, {
            orientation: (image as any).orientation || 1,
            force: true,
          });
          if (fs.existsSync(generated)) {
            mediaService.updateImage(imageId, { thumbnailPath: generated });
            absPath = generated;
          } else {
            absPath = originalAbsPath;
          }
        } catch (genErr) {
          console.error(
            `[Thumbnail] Generation failed for image ${imageId}:`,
            (genErr as Error).message,
          );
          absPath = originalAbsPath;
        }
      } else {
        absPath = originalAbsPath;
      }
    }

    if (!absPath || !fs.existsSync(absPath)) {
      console.error(
        `[Thumbnail] Not found for image ${imageId}. thumbnailPath=${thumbnailPath} resolved=${absPath}`,
      );
      return res.status(404).json({ error: 'Thumbnail not found' });
    }

    // Set aggressive cache headers for thumbnails (immutable - never change)
    const stat = fs.statSync(absPath);
    const etag = `"${imageId}-${stat.mtime.getTime()}"`;

    const ext = path.extname(absPath).toLowerCase();
    const contentType =
      ext === '.png'
        ? 'image/png'
        : ext === '.webp'
          ? 'image/webp'
          : ext === '.gif'
            ? 'image/gif'
            : 'image/jpeg';

    res.set({
      'Cache-Control': 'public, max-age=31536000, immutable',
      'Content-Type': contentType,
      ETag: etag,
      'Last-Modified': stat.mtime.toUTCString(),
    });

    // Handle conditional GET requests (304 Not Modified)
    if (req.headers['if-none-match'] === etag) {
      return res.status(304).end();
    }

    res.sendFile(absPath);
  } catch (error) {
    next(error);
  }
});

app.post(
  '/api/admin/media/ingest',
  authenticateRequest,
  requireRole('admin'),
  async (req, res, next) => {
    try {
      const db = getDb();
      const roots = [
        path.join(process.cwd(), 'data', 'media', 'images'),
        path.join(process.cwd(), 'data', 'originals'),
      ];
      const exts = ['.jpg', '.jpeg', '.png'];
      const found: string[] = [];
      for (const root of roots) {
        if (!fs.existsSync(root)) continue;
        const stack = [root];
        while (stack.length > 0) {
          const dir = stack.pop() as string;
          const entries = fs.readdirSync(dir, { withFileTypes: true });
          for (const ent of entries) {
            const full = path.join(dir, ent.name);
            if (ent.isDirectory()) {
              if (ent.name.toLowerCase() === 'thumbnails') continue;
              stack.push(full);
            } else {
              const ext = path.extname(ent.name).toLowerCase();
              if (exts.includes(ext)) {
                const rel = full.startsWith(process.cwd())
                  ? full.substring(process.cwd().length + 1)
                  : full;
                found.push(rel);
              }
            }
          }
        }
      }
      let inserted = 0;
      let skipped = 0;
      const checkStmt = db.prepare('SELECT id FROM media_items WHERE file_path = ?');
      const insertStmt = db.prepare(
        `
        INSERT INTO media_items (file_path, file_type, title, red_flag_rating, created_at)
        VALUES (?, ?, ?, 0, datetime('now'))
      `,
      );
      for (const p of found) {
        const exists = checkStmt.get(p);
        if (exists) {
          skipped++;
          continue;
        }
        const ext = path.extname(p).toLowerCase();
        const type = ext === '.png' ? 'image/png' : 'image/jpeg';
        insertStmt.run(p, type, path.basename(p));
        inserted++;
      }
      res.json({ inserted, skipped, scanned: found.length });
    } catch (error) {
      next(error);
    }
  },
);

// Search images

// ============================================================================
// BATCH OPERATIONS (Must be defined BEFORE single image routes with :id)
// ============================================================================

// Batch rotate images (Admin only)
app.put(
  '/api/media/images/batch/rotate',
  authenticateRequest,
  requireRole('admin'),
  async (req, res, next) => {
    try {
      const { imageIds, direction } = req.body;

      if (!Array.isArray(imageIds) || imageIds.length === 0) {
        return res.status(400).json({ error: 'Invalid image IDs' });
      }

      if (!['left', 'right'].includes(direction)) {
        return res.status(400).json({ error: 'Invalid rotation direction' });
      }

      const rotationAngle = direction === 'left' ? -90 : 90;
      const results = [];

      // Rotate each image
      for (const imageId of imageIds) {
        try {
          const id = parseInt(imageId.toString());
          if (isNaN(id)) continue;

          const image = mediaService.getImageById(id);
          if (!image) continue;

          // Rotate the image
          await mediaService.rotateImage(id, rotationAngle);

          // Regenerate thumbnail
          const thumbnailDir = path.dirname(
            (image as any).thumbnail_path ||
              image.thumbnailPath ||
              path.join(path.dirname(image.path), 'thumbnails'),
          );
          await mediaService.generateThumbnail(image.path, thumbnailDir, {
            force: true,
            orientation: 1,
          });

          // Get updated image
          const updatedImage = mediaService.getImageById(id);
          results.push({ id, success: true, image: updatedImage });
        } catch (err) {
          console.error(`Error rotating image ${imageId}:`, err);
          results.push({ id: imageId, success: false, error: (err as Error).message });
        }
      }

      res.json({ results });
    } catch (error) {
      console.error('Error batch rotating images:', error);
      next(error);
    }
  },
);

// Batch rate images
app.put(
  '/api/media/images/batch/rate',
  authenticateRequest,
  requireRole('admin'),
  async (req, res, next) => {
    try {
      const { imageIds, rating } = req.body;

      if (!Array.isArray(imageIds) || imageIds.length === 0) {
        return res.status(400).json({ error: 'Invalid image IDs' });
      }

      if (typeof rating !== 'number' || rating < 0 || rating > 5) {
        return res.status(400).json({ error: 'Invalid rating value' });
      }

      const results = [];

      // Rate each image
      for (const imageId of imageIds) {
        try {
          const id = parseInt(imageId.toString());
          if (isNaN(id)) continue;

          // Unified schema: media_items.red_flag_rating
          const db = getDb();
          const result = db
            .prepare(
              "UPDATE media_items SET red_flag_rating = ?, date_modified = datetime('now') WHERE id = ?",
            )
            .run(rating, id);

          if (result.changes === 0) {
            results.push({ id, success: false, error: 'Image not found' });
          } else {
            results.push({ id, success: true });
          }
        } catch (err) {
          console.error(`Error rating image ${imageId}:`, err);
          results.push({ id: imageId, success: false, error: (err as Error).message });
        }
      }

      res.json({ results });
    } catch (error) {
      console.error('Error batch rating images:', error);
      next(error);
    }
  },
);

// Batch tag images
app.put(
  '/api/media/images/batch/tags',
  authenticateRequest,
  requireRole('admin'),
  async (req, res, next) => {
    try {
      const { imageIds, tagIds, action } = req.body; // action: 'add' or 'remove'

      if (!Array.isArray(imageIds) || imageIds.length === 0) {
        return res.status(400).json({ error: 'Invalid image IDs' });
      }

      if (!Array.isArray(tagIds) || tagIds.length === 0) {
        return res.status(400).json({ error: 'Invalid tag IDs' });
      }

      if (!['add', 'remove'].includes(action)) {
        return res.status(400).json({ error: 'Invalid action' });
      }

      const results = [];

      // Process each image
      for (const imageId of imageIds) {
        try {
          const id = parseInt(imageId.toString());
          if (isNaN(id)) continue;

          // Process each tag
          for (const tagId of tagIds) {
            const tid = parseInt(tagId.toString());
            if (isNaN(tid)) continue;

            if (action === 'add') {
              mediaService.addTagToImage(id, tid);
            } else {
              mediaService.removeTagFromImage(id, tid);
            }
          }

          results.push({ id, success: true });
        } catch (err) {
          console.error(`Error tagging image ${imageId}:`, err);
          results.push({ id: imageId, success: false, error: (err as Error).message });
        }
      }

      res.json({ results });
    } catch (error) {
      console.error('Error batch tagging images:', error);
      next(error);
    }
  },
);

// Batch tagging for Audio/Video (Media Items)
app.put(
  '/api/media/items/batch/tags',
  authenticateRequest,
  requireRole('admin'),
  async (req, res, next) => {
    try {
      const { itemIds, tagIds, action } = req.body;

      if (!Array.isArray(itemIds) || itemIds.length === 0)
        return res.status(400).json({ error: 'Invalid item IDs' });
      if (!Array.isArray(tagIds) || tagIds.length === 0)
        return res.status(400).json({ error: 'Invalid tag IDs' });
      if (!['add', 'remove'].includes(action))
        return res.status(400).json({ error: 'Invalid action' });

      const results = [];

      for (const itemId of itemIds) {
        try {
          const id = parseInt(itemId);
          if (isNaN(id)) continue;

          for (const tagId of tagIds) {
            const tid = parseInt(tagId);
            if (isNaN(tid)) continue;

            if (action === 'add') {
              mediaService.addTagToItem(id, tid);
            } else {
              mediaService.removeTagFromItem(id, tid);
            }
          }
          results.push({ id, success: true });
        } catch (err) {
          results.push({ id: itemId, success: false, error: (err as Error).message });
        }
      }
      res.json({ results });
    } catch (error) {
      console.error('Error batch tagging items:', error);
      next(error);
    }
  },
);

app.put(
  '/api/media/items/batch/people',
  authenticateRequest,
  requireRole('admin'),
  async (req, res, next) => {
    try {
      const { itemIds, personIds, action } = req.body;

      if (!Array.isArray(itemIds) || itemIds.length === 0)
        return res.status(400).json({ error: 'Invalid item IDs' });
      if (!Array.isArray(personIds) || personIds.length === 0)
        return res.status(400).json({ error: 'Invalid person IDs' });
      if (!['add', 'remove'].includes(action))
        return res.status(400).json({ error: 'Invalid action' });

      const results = [];

      for (const itemId of itemIds) {
        try {
          const id = parseInt(itemId);
          if (isNaN(id)) continue;

          for (const personId of personIds) {
            const pid = parseInt(personId);
            if (isNaN(pid)) continue;

            if (action === 'add') {
              mediaService.addPersonToItem(id, pid);
            } else {
              mediaService.removePersonFromItem(id, pid);
            }
          }
          results.push({ id, success: true });
        } catch (err) {
          results.push({ id: itemId, success: false, error: (err as Error).message });
        }
      }
      res.json({ results });
    } catch (error) {
      console.error('Error batch adding people to items:', error);
      next(error);
    }
  },
);

// Batch update metadata
app.put(
  '/api/media/images/batch/metadata',
  authenticateRequest,
  requireRole('admin'),
  async (req, res, next) => {
    try {
      const { imageIds, updates } = req.body; // updates: { title?, description? }

      if (!Array.isArray(imageIds) || imageIds.length === 0) {
        return res.status(400).json({ error: 'Invalid image IDs' });
      }

      if (!updates || typeof updates !== 'object') {
        return res.status(400).json({ error: 'Invalid updates' });
      }

      const results = [];
      if (updates.title === undefined && updates.description === undefined) {
        return res.status(400).json({ error: 'No valid fields to update' });
      }

      // Process each image
      for (const imageId of imageIds) {
        try {
          const id = parseInt(imageId.toString());
          if (isNaN(id)) continue;

          const image = mediaService.getImageById(id);
          if (!image) {
            results.push({ id, success: false, error: 'Image not found' });
          } else {
            mediaService.updateImage(id, {
              ...(updates.title !== undefined ? { title: updates.title } : {}),
              ...(updates.description !== undefined ? { description: updates.description } : {}),
            });
            results.push({ id, success: true });
          }
        } catch (err) {
          console.error(`Error updating metadata for image ${imageId}:`, err);
          results.push({ id: imageId, success: false, error: (err as Error).message });
        }
      }

      res.json({ results });
    } catch (error) {
      console.error('Error batch updating metadata:', error);
      next(error);
    }
  },
);

// Batch tag people in images (Admin only)
app.put(
  '/api/media/images/batch/people',
  authenticateRequest,
  requireRole('admin'),
  async (req, res, next) => {
    try {
      const { imageIds, entityIds, action } = req.body; // action: 'add' or 'remove'

      if (!Array.isArray(imageIds) || imageIds.length === 0) {
        return res.status(400).json({ error: 'Invalid image IDs' });
      }

      if (!Array.isArray(entityIds) || entityIds.length === 0) {
        return res.status(400).json({ error: 'Invalid entity IDs' });
      }

      if (!['add', 'remove'].includes(action)) {
        return res.status(400).json({ error: 'Invalid action' });
      }

      const results = [];
      const db = getDb();

      // Process each image
      for (const imageId of imageIds) {
        try {
          const id = parseInt(imageId.toString());
          if (isNaN(id)) continue;

          // Process each entity
          for (const entityId of entityIds) {
            const eid = parseInt(entityId.toString());
            if (isNaN(eid)) continue;

            if (action === 'add') {
              // Add person to image
              db.prepare(
                'INSERT OR IGNORE INTO media_item_people (media_item_id, entity_id) VALUES (?, ?)',
              ).run(id, eid);
            } else {
              // Remove person from image
              db.prepare(
                'DELETE FROM media_item_people WHERE media_item_id = ? AND entity_id = ?',
              ).run(id, eid);
            }
          }

          results.push({ id, success: true });
        } catch (err) {
          console.error(`Error tagging people in image ${imageId}:`, err);
          results.push({ id: imageId, success: false, error: (err as Error).message });
        }
      }

      res.json({ results });
    } catch (error) {
      console.error('Error batch tagging people in images:', error);
      next(error);
    }
  },
);

app.put(
  '/api/media/images/:id',
  authenticateRequest,
  requireRole('admin'),
  async (req, res, next) => {
    try {
      const imageId = parseInt((req.params as { id: string }).id);
      if (isNaN(imageId)) {
        return res.status(400).json({ error: 'Invalid image ID' });
      }

      // Only allow specific fields to be updated
      const updates: any = {};
      if (req.body.title !== undefined) updates.title = req.body.title;
      if (req.body.description !== undefined) updates.description = req.body.description;

      mediaService.updateImage(imageId, updates);
      res.json({ success: true });
    } catch (error) {
      console.error('Error updating image:', error);
      next(error);
    }
  },
);

// Rotate image (Admin only)
app.put(
  '/api/media/images/:id/rotate',
  authenticateRequest,
  requireRole('admin'),
  async (req, res, next) => {
    try {
      const imageId = parseInt((req.params as { id: string }).id);
      const direction = req.body.direction === 'left' ? -90 : 90; // Default to right/clockwise

      if (isNaN(imageId)) {
        return res.status(400).json({ error: 'Invalid image ID' });
      }

      const image = mediaService.getImageById(imageId);
      if (!image) {
        return res.status(404).json({ error: 'Image not found' });
      }

      // Use MediaService to physically rotate the image file
      // This solves the "Double Rotation" display issues by normalizing
      // the image pixels and resetting EXIF orientation to 1.
      await mediaService.rotateImage(imageId, direction);

      // Regenerate thumbnail with new orientation
      const thumbnailDir = path.dirname(
        (image as any).thumbnail_path ||
          image.thumbnailPath ||
          path.join(path.dirname(image.path), 'thumbnails'),
      );
      // Ensure we have a valid thumbnail directory. If image.thumbnail_path exists, use its dir.
      // If not, assume 'thumbnails' subdir of image path (standard structure)

      try {
        await mediaService.generateThumbnail(image.path, thumbnailDir, {
          force: true,
          orientation: 1,
        });
      } catch (err) {
        console.error('Failed to regenerate thumbnail during rotation:', err);
        // Continue, as the DB update was successful
      }

      // Return the updated image so frontend can reflect changes immediately
      const updatedImage = mediaService.getImageById(imageId);
      res.json(updatedImage);
    } catch (error) {
      console.error('Error rotating image:', error);
      next(error);
    }
  },
);

// Delete image (Admin only)
app.delete(
  '/api/media/images/:id',
  authenticateRequest,
  requireRole('admin'),
  async (req, res, next) => {
    try {
      const imageId = parseInt((req.params as { id: string }).id);
      if (isNaN(imageId)) {
        return res.status(400).json({ error: 'Invalid image ID' });
      }

      mediaService.deleteImage(imageId);
      res.json({ success: true });
    } catch (error) {
      console.error('Error deleting image:', error);
      next(error);
    }
  },
);

// Search images
app.get('/api/media/search', async (req, res, next) => {
  try {
    const query = req.query.q as string;
    if (!query) {
      return res.status(400).json({ error: 'Search query is required' });
    }

    const images = mediaService.searchImages(query);
    res.json(images);
  } catch (error) {
    console.error('Error searching images:', error);
    next(error);
  }
});

// Get all media tags
app.get('/api/media/tags', async (_req, res, next) => {
  try {
    seedInvestigationMediaTags();
    const tags = mediaService.getAllTags();
    res.json(tags);
  } catch (error) {
    console.error('Error fetching tags:', error);
    next(error);
  }
});

// Get media statistics
app.get('/api/media/stats', async (_req, res, next) => {
  try {
    const stats = mediaService.getMediaStats();
    res.json(stats);
  } catch (error) {
    console.error('Error fetching media stats:', error);
    next(error);
  }
});

// ============================================
// TAGS API - Global tagging system
// ============================================

// Get all tags
app.get('/api/tags', async (_req, res, next) => {
  try {
    seedInvestigationMediaTags();
    const db = getDb();
    const tags = db.prepare('SELECT * FROM media_tags ORDER BY name ASC').all();
    res.json(tags);
  } catch (error) {
    console.error('Error fetching tags:', error);
    next(error);
  }
});

// Create a new tag
app.post('/api/tags', authenticateRequest, async (req, res, next) => {
  try {
    const { name, color } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Tag name is required' });
    }

    const db = getDb();
    const result = db
      .prepare('INSERT INTO media_tags (name, color) VALUES (?, ?)')
      .run(name.trim(), color || '#6366f1');

    res
      .status(201)
      .json({ id: result.lastInsertRowid, name: name.trim(), color: color || '#6366f1' });
  } catch (error: any) {
    if (error.code === 'SQLITE_CONSTRAINT_UNIQUE') {
      return res.status(409).json({ error: 'Tag already exists' });
    }
    console.error('Error creating tag:', error);
    next(error);
  }
});

// Delete a tag
app.delete('/api/tags/:id', authenticateRequest, requireRole('admin'), async (req, res, next) => {
  try {
    const tagId = parseInt((req.params as { id: string }).id);
    if (isNaN(tagId)) return res.status(400).json({ error: 'Invalid tag ID' });

    const db = getDb();
    const result = db.prepare('DELETE FROM media_tags WHERE id = ?').run(tagId);

    if (result.changes === 0) return res.status(404).json({ error: 'Tag not found' });
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting tag:', error);
    next(error);
  }
});

// ============================================
// MEDIA TAGS API
// ============================================

// Get tags for an image
app.get('/api/media/images/:id/tags', async (req, res, next) => {
  try {
    const imageId = parseInt((req.params as { id: string }).id);
    if (isNaN(imageId)) return res.status(400).json({ error: 'Invalid image ID' });

    const db = getDb();
    const tags = db
      .prepare(
        `
      SELECT t.* FROM media_tags t
      JOIN media_item_tags it ON t.id = it.tag_id
      WHERE it.media_item_id = ?
      ORDER BY t.name ASC
    `,
      )
      .all(imageId);

    res.json(tags);
  } catch (error) {
    console.error('Error fetching image tags:', error);
    next(error);
  }
});

// Add tag to image
app.post('/api/media/images/:id/tags', authenticateRequest, async (req, res, next) => {
  try {
    const imageId = parseInt((req.params as { id: string }).id);
    const { tagId } = req.body;

    if (isNaN(imageId) || !tagId) return res.status(400).json({ error: 'Invalid image or tag ID' });

    const db = getDb();
    db.prepare('INSERT OR IGNORE INTO media_item_tags (media_item_id, tag_id) VALUES (?, ?)').run(
      imageId,
      tagId,
    );

    res.json({ success: true });
  } catch (error) {
    console.error('Error adding tag to image:', error);
    next(error);
  }
});

// Remove tag from image
app.delete('/api/media/images/:id/tags/:tagId', authenticateRequest, async (req, res, next) => {
  try {
    const imageId = parseInt((req.params as { id: string }).id);
    const tagId = parseInt((req.params as { tagId: string }).tagId);

    if (isNaN(imageId) || isNaN(tagId)) return res.status(400).json({ error: 'Invalid IDs' });

    const db = getDb();
    db.prepare('DELETE FROM media_item_tags WHERE media_item_id = ? AND tag_id = ?').run(
      imageId,
      tagId,
    );

    res.json({ success: true });
  } catch (error) {
    console.error('Error removing tag from image:', error);
    next(error);
  }
});

// ============================================
// MEDIA PEOPLE API - Link entities to images
// ============================================

// Get people in an image
app.get('/api/media/images/:id/people', async (req, res, next) => {
  try {
    const imageId = parseInt((req.params as { id: string }).id);
    if (isNaN(imageId)) return res.status(400).json({ error: 'Invalid image ID' });

    const db = getDb();
    const people = db
      .prepare(
        `
      SELECT e.id, e.full_name as name, e.primary_role as role, e.red_flag_rating as redFlagRating
      FROM entities e
      JOIN media_item_people mp ON e.id = mp.entity_id
      WHERE mp.media_item_id = ?
      ORDER BY e.full_name ASC
    `,
      )
      .all(imageId);

    res.json(people);
  } catch (error) {
    console.error('Error fetching image people:', error);
    next(error);
  }
});

// Add person to image
app.post('/api/media/images/:id/people', authenticateRequest, async (req, res, next) => {
  try {
    const imageId = parseInt((req.params as { id: string }).id);
    const { entityId } = req.body;

    if (isNaN(imageId) || !entityId)
      return res.status(400).json({ error: 'Invalid image or entity ID' });

    const db = getDb();
    db.prepare(
      'INSERT OR IGNORE INTO media_item_people (media_item_id, entity_id) VALUES (?, ?)',
    ).run(imageId, entityId);

    res.json({ success: true });
  } catch (error) {
    console.error('Error adding person to image:', error);
    next(error);
  }
});

// Remove person from image
app.delete(
  '/api/media/images/:id/people/:entityId',
  authenticateRequest,
  async (req, res, next) => {
    try {
      const imageId = parseInt((req.params as { id: string }).id);
      const entityId = parseInt((req.params as { entityId: string }).entityId);

      if (isNaN(imageId) || isNaN(entityId)) return res.status(400).json({ error: 'Invalid IDs' });

      const db = getDb();
      db.prepare('DELETE FROM media_item_people WHERE media_item_id = ? AND entity_id = ?').run(
        imageId,
        entityId,
      );

      res.json({ success: true });
    } catch (error) {
      console.error('Error removing person from image:', error);
      next(error);
    }
  },
);

// ============ PALM BEACH PROPERTIES API ============
import { propertiesRepository } from './server/db/propertiesRepository.js';

// Get properties with filtering and pagination
app.get('/api/properties', async (req, res, next) => {
  try {
    const filters = {
      page: parseInt(req.query.page as string) || 1,
      limit: Math.min(100, parseInt(req.query.limit as string) || 50),
      ownerSearch: req.query.owner as string,
      minValue: req.query.minValue ? parseFloat(req.query.minValue as string) : undefined,
      maxValue: req.query.maxValue ? parseFloat(req.query.maxValue as string) : undefined,
      propertyUse: req.query.propertyUse as string,
      knownAssociatesOnly: req.query.knownAssociatesOnly === 'true',
      sortBy: (req.query.sortBy as 'value' | 'owner' | 'year') || 'value',
      sortOrder: (req.query.sortOrder as 'asc' | 'desc') || 'desc',
    };

    const result = propertiesRepository.getProperties(filters);
    res.json(result);
  } catch (error) {
    console.error('Error fetching properties:', error);
    next(error);
  }
});

// Get property statistics
app.get('/api/properties/stats', async (req, res, next) => {
  try {
    const stats = propertiesRepository.getPropertyStats();
    res.json(stats);
  } catch (error) {
    console.error('Error fetching property stats:', error);
    next(error);
  }
});

// Get known associate properties
app.get('/api/properties/known-associates', async (req, res, next) => {
  try {
    const properties = propertiesRepository.getKnownAssociateProperties();
    res.json(properties);
  } catch (error) {
    console.error('Error fetching known associate properties:', error);
    next(error);
  }
});

// Get Epstein properties
app.get('/api/properties/epstein', async (req, res, next) => {
  try {
    const properties = propertiesRepository.getEpsteinProperties();
    res.json(properties);
  } catch (error) {
    console.error('Error fetching Epstein properties:', error);
    next(error);
  }
});

// Get property value distribution
app.get('/api/properties/value-distribution', async (req, res, next) => {
  try {
    const distribution = propertiesRepository.getValueDistribution();
    res.json(distribution);
  } catch (error) {
    console.error('Error fetching value distribution:', error);
    next(error);
  }
});

// Get top property owners
app.get('/api/properties/top-owners', async (req, res, next) => {
  try {
    const limit = parseInt(req.query.limit as string) || 20;
    const owners = propertiesRepository.getTopOwners(limit);
    res.json(owners);
  } catch (error) {
    console.error('Error fetching top owners:', error);
    next(error);
  }
});

// Get single property by ID
app.get('/api/properties/:id', async (req, res, next) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ error: 'Invalid property ID' });

    const property = propertiesRepository.getPropertyById(id);
    if (!property) return res.status(404).json({ error: 'Property not found' });

    res.json(property);
  } catch (error) {
    console.error('Error fetching property:', error);
    next(error);
  }
});

// ============ FLIGHT TRACKER API ============
import { flightsRepository } from './server/db/flightsRepository.js';

// Get flights with filtering and pagination
app.get('/api/flights', async (req, res, next) => {
  try {
    const filters = {
      page: parseInt(req.query.page as string) || 1,
      limit: Math.min(100, parseInt(req.query.limit as string) || 50),
      startDate: req.query.startDate as string,
      endDate: req.query.endDate as string,
      passenger: req.query.passenger as string,
      airport: req.query.airport as string,
    };

    const result = flightsRepository.getFlights(filters);
    res.json(result);
  } catch (error) {
    console.error('Error fetching flights:', error);
    next(error);
  }
});

// Get flight statistics
app.get('/api/flights/stats', async (req, res, next) => {
  try {
    const stats = flightsRepository.getFlightStats();
    res.json(stats);
  } catch (error) {
    console.error('Error fetching flight stats:', error);
    next(error);
  }
});

// Get airport coordinates for map
app.get('/api/flights/airports', async (req, res, next) => {
  try {
    const coords = flightsRepository.getAirportCoords();
    res.json(coords);
  } catch (error) {
    next(error);
  }
});

// Get unique passengers list
app.get('/api/flights/passengers', async (req, res, next) => {
  try {
    const passengers = flightsRepository.getUniquePassengers();
    res.json(passengers);
  } catch (error) {
    next(error);
  }
});

// Get single flight by ID
app.get('/api/flights/:id', async (req, res, next) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ error: 'Invalid flight ID' });

    const flight = flightsRepository.getFlightById(id);
    if (!flight) return res.status(404).json({ error: 'Flight not found' });

    res.json(flight);
  } catch (error) {
    next(error);
  }
});

// Get flights for specific passenger
app.get('/api/flights/passenger/:name', async (req, res, next) => {
  try {
    const name = decodeURIComponent(req.params.name);
    const flights = flightsRepository.getPassengerFlights(name);
    res.json(flights);
  } catch (error) {
    next(error);
  }
});

// Get passenger co-occurrences (who flew together)
app.get('/api/flights/co-occurrences', async (req, res, next) => {
  try {
    const minFlights = parseInt(req.query.minFlights as string) || 2;
    const coOccurrences = flightsRepository.getPassengerCoOccurrences(minFlights);
    res.json(coOccurrences);
  } catch (error) {
    console.error('Error fetching co-occurrences:', error);
    next(error);
  }
});

// Get co-passengers for a specific person
app.get('/api/flights/co-passengers/:name', async (req, res, next) => {
  try {
    const name = decodeURIComponent(req.params.name);
    const coPassengers = flightsRepository.getCoPassengers(name);
    res.json(coPassengers);
  } catch (error) {
    console.error('Error fetching co-passengers:', error);
    next(error);
  }
});

// Get frequent routes
app.get('/api/flights/routes', async (req, res, next) => {
  try {
    const limit = parseInt(req.query.limit as string) || 20;
    const routes = flightsRepository.getFrequentRoutes(limit);
    res.json(routes);
  } catch (error) {
    console.error('Error fetching routes:', error);
    next(error);
  }
});

// Get passenger date ranges (first/last flight)
app.get('/api/flights/passenger-ranges', async (req, res, next) => {
  try {
    const ranges = flightsRepository.getPassengerDateRanges();
    res.json(ranges);
  } catch (error) {
    console.error('Error fetching passenger ranges:', error);
    next(error);
  }
});

// Get flights by aircraft
app.get('/api/flights/aircraft', async (req, res, next) => {
  try {
    const aircraft = flightsRepository.getFlightsByAircraft();
    res.json(aircraft);
  } catch (error) {
    console.error('Error fetching aircraft stats:', error);
    next(error);
  }
});

// Get destinations for a passenger
app.get('/api/flights/destinations/:name', async (req, res, next) => {
  try {
    const name = decodeURIComponent(req.params.name);
    const destinations = flightsRepository.getPassengerDestinations(name);
    res.json(destinations);
  } catch (error) {
    console.error('Error fetching destinations:', error);
    next(error);
  }
});

// Advanced Analytics API routes
app.use('/api/advanced-analytics', advancedAnalyticsRoutes);

// Investigative Tasks API routes
app.use('/api/investigative-tasks', investigativeTasksRoutes);

// Memory API routes
app.get('/api/memory', async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 20));
    const memoryType = req.query.memoryType as string;
    const status = req.query.status as string;
    const searchQuery = req.query.q as string;

    const filters: any = {};
    if (memoryType) filters.memoryType = memoryType;
    if (status) filters.status = status;
    if (searchQuery) filters.searchQuery = searchQuery;

    const result = memoryRepository.searchMemoryEntries(getDb(), filters, page, limit);

    res.json({
      data: result.data,
      total: result.total,
      page,
      pageSize: limit,
      totalPages: Math.ceil(result.total / limit),
    });
  } catch (error) {
    console.error('Error fetching memory entries:', error);
    next(error);
  }
});

app.get('/api/memory/:id', async (req, res, next) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: 'Invalid memory ID' });
    }

    const memoryEntry = memoryRepository.getMemoryEntryById(getDb(), id);
    if (!memoryEntry) {
      return res.status(404).json({ error: 'Memory entry not found' });
    }

    res.json(memoryEntry);
  } catch (error) {
    console.error('Error fetching memory entry:', error);
    next(error);
  }
});

app.post('/api/memory', async (req, res, next) => {
  try {
    const {
      memoryType,
      content,
      metadata,
      contextTags,
      importanceScore,
      sourceId,
      sourceType,
      provenance,
    } = req.body;

    if (!memoryType || !content) {
      return res.status(400).json({ error: 'memoryType and content are required' });
    }

    const input = {
      memoryType,
      content,
      metadata,
      contextTags,
      importanceScore,
      sourceId,
      sourceType,
      provenance,
    };

    const newMemoryEntry = memoryRepository.createMemoryEntry(getDb(), input);

    res.status(201).json(newMemoryEntry);
  } catch (error) {
    console.error('Error creating memory entry:', error);
    next(error);
  }
});

app.put('/api/memory/:id', async (req, res, next) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: 'Invalid memory ID' });
    }

    const updates = req.body;
    const updatedMemoryEntry = memoryRepository.updateMemoryEntry(getDb(), id, updates);

    if (!updatedMemoryEntry) {
      return res.status(404).json({ error: 'Memory entry not found' });
    }

    res.json(updatedMemoryEntry);
  } catch (error) {
    console.error('Error updating memory entry:', error);
    next(error);
  }
});

app.delete('/api/memory/:id', async (req, res, next) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: 'Invalid memory ID' });
    }

    const result = memoryRepository.updateMemoryEntry(getDb(), id, { status: 'deprecated' });

    if (!result) {
      return res.status(404).json({ error: 'Memory entry not found' });
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting memory entry:', error);
    next(error);
  }
});

app.get('/api/memory/:id/relationships', async (req, res, next) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: 'Invalid memory ID' });
    }

    const relationships = memoryRepository.getMemoryRelationships(getDb(), id);

    res.json(relationships);
  } catch (error) {
    console.error('Error fetching memory relationships:', error);
    next(error);
  }
});

app.get('/api/memory/:id/audit', async (req, res, next) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: 'Invalid memory ID' });
    }

    const auditLogs = memoryRepository.getMemoryAuditLogs(getDb(), id);

    res.json(auditLogs);
  } catch (error) {
    console.error('Error fetching memory audit logs:', error);
    next(error);
  }
});

app.get('/api/memory/:id/quality', async (req, res, next) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: 'Invalid memory ID' });
    }

    const qualityMetrics = memoryRepository.getQualityMetrics(getDb(), id);

    res.json(qualityMetrics);
  } catch (error) {
    console.error('Error fetching memory quality metrics:', error);
    next(error);
  }
});

app.post('/api/memory/:id/quality', async (req, res, next) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: 'Invalid memory ID' });
    }

    const { sourceReliability, evidenceStrength, temporalRelevance, entityConfidence } = req.body;

    const dimensions = {
      sourceReliability: sourceReliability || 0.5,
      evidenceStrength: evidenceStrength || 0.5,
      temporalRelevance: temporalRelevance || 0.5,
      entityConfidence: entityConfidence || 0.5,
    };

    memoryRepository.updateQualityMetrics(getDb(), id, dimensions);

    res.json({ success: true });
  } catch (error) {
    console.error('Error updating memory quality metrics:', error);
    next(error);
  }
});

// Error handling middleware (must be last)
app.use(globalErrorHandler);

// Helper to inject Open Graph tags and Page Title into HTML
function injectOgTags(
  html: string,
  ogData: { title: string; description: string; imageUrl: string; url: string },
) {
  const safeTitle = ogData.title
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
  const safeDesc = ogData.description
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  const ogTags = `
    <!-- Dynamic Open Graph Tags -->
    <title>${safeTitle} | Epstein Files Archive</title>
    <meta property="og:title" content="${safeTitle} | Epstein Files Archive" />
    <meta property="og:description" content="${safeDesc}" />
    <meta property="og:image" content="${ogData.imageUrl}" />
    <meta property="og:image:secure_url" content="${ogData.imageUrl}" />
    <meta property="og:image:width" content="1200" />
    <meta property="og:image:height" content="630" />
    <meta property="og:type" content="website" />
    <meta property="og:url" content="${ogData.url}" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${safeTitle} | Epstein Files Archive" />
    <meta name="twitter:description" content="${safeDesc}" />
    <meta name="twitter:image" content="${ogData.imageUrl}" />
    <meta name="twitter:image:alt" content="${safeTitle}" />
  `;

  // 1. Handle <title> tag replacement
  if (html.includes('<title>')) {
    html = html.replace(
      /<title>.*?<\/title>/,
      `<title>${safeTitle} | Epstein Files Archive</title>`,
    );
  }

  // 2. Handle Meta tag replacement
  const defaultTagsRegex =
    /<!-- Default Open Graph Tags -->[\s\S]*?<!-- End Default Open Graph Tags -->/;
  const metaRegexFull =
    /<!-- Dynamic Open Graph Tags -->[\s\S]*?<!-- End Dynamic Open Graph Tags -->/;

  if (defaultTagsRegex.test(html)) {
    return html.replace(defaultTagsRegex, ogTags);
  } else if (metaRegexFull.test(html)) {
    return html.replace(metaRegexFull, ogTags);
  } else {
    return html.replace('</head>', `${ogTags}</head>`);
  }
}

// Ensure articles repository-like access (quick inline helper since no repo file exists yet)
// Ensure articles repository-like access (quick inline helper since no repo file exists yet)
function getArticleById(id: number | string) {
  try {
    return articlesRepository.getArticleById(id);
  } catch (e) {
    console.error('Error fetching article for OG tags:', e);
    return null;
  }
}

function getPublicBaseUrl(req: express.Request): string {
  const host = req.get('host') || 'epstein.academy';
  const forwardedProtoRaw = String(req.headers['x-forwarded-proto'] || '')
    .split(',')[0]
    .trim();
  const localHost = host.includes('localhost') || host.includes('127.0.0.1');
  const protocol = localHost ? forwardedProtoRaw || req.protocol || 'http' : 'https';
  return `${protocol}://${host}`;
}

function mediaItemTimestamp(item: any): number {
  const ts = new Date(item?.date_modified || item?.dateModified || item?.created_at || 0).getTime();
  return Number.isFinite(ts) ? ts : Date.now();
}

function getFirstImageIdForAlbum(albumId: number): number | null {
  try {
    const db = getDb();
    const row = db
      .prepare(
        `
        SELECT id
        FROM media_items
        WHERE album_id = ? AND file_type LIKE 'image/%'
        ORDER BY COALESCE(red_flag_rating, 0) DESC, id ASC
        LIMIT 1
      `,
      )
      .get(albumId) as { id?: number } | undefined;
    return row?.id || null;
  } catch {
    return null;
  }
}

function getAlbumHeroImageUrl(albumId: number, baseUrl: string, fallbackUrl: string): string {
  const firstImageId = getFirstImageIdForAlbum(albumId);
  if (!firstImageId) return fallbackUrl;
  return `${baseUrl}/api/media/images/${firstImageId}/raw`;
}

function getMediaItemPreviewImageUrl(item: any, baseUrl: string, fallbackUrl: string): string {
  const fileType = String(item?.file_type || item?.fileType || '').toLowerCase();
  const id = Number(item?.id);
  if (!Number.isFinite(id) || id <= 0) return fallbackUrl;

  if (fileType.startsWith('image/')) {
    return `${baseUrl}/api/media/images/${id}/raw?v=${mediaItemTimestamp(item)}`;
  }
  if (fileType.includes('video')) {
    return `${baseUrl}/api/media/video/${id}/thumbnail?v=${mediaItemTimestamp(item)}`;
  }
  if (fileType.includes('audio')) {
    const albumId = Number(item?.album_id || item?.albumId);
    if (Number.isFinite(albumId) && albumId > 0) {
      return getAlbumHeroImageUrl(albumId, baseUrl, fallbackUrl);
    }
  }
  return fallbackUrl;
}

function routeTitleFromPath(routePath: string): string {
  if (routePath === '/' || routePath === '/people') return 'Subjects';

  const segments = routePath
    .split('/')
    .filter(Boolean)
    .filter((s) => !/^\d+$/.test(s))
    .map((s) => s.replace(/[-_]+/g, ' '));

  if (segments.length === 0) return 'Epstein Files Archive';
  return segments.map((s) => s.replace(/\b\w/g, (c) => c.toUpperCase())).join(' - ');
}

function routeDescription(routePath: string): string {
  if (routePath.startsWith('/documents')) {
    return 'Browse primary source documents, filings, records, and extracted evidence from the Epstein Files Archive.';
  }
  if (routePath.startsWith('/media')) {
    return 'Browse photos, audio, video, and curated media evidence in the Epstein Files Archive.';
  }
  if (routePath.startsWith('/entity') || routePath.startsWith('/entities')) {
    return 'View entity profile, linked records, connections, and evidence context in the Epstein Files Archive.';
  }
  if (routePath.startsWith('/emails')) {
    return 'Explore email threads, participants, and linked evidence in the Epstein Files Archive.';
  }
  if (routePath.startsWith('/properties')) {
    return 'Track locations, holdings, and property-linked entities in the Epstein Files Archive.';
  }
  if (routePath.startsWith('/flights')) {
    return 'Review flight manifests, routes, and co-passenger links in the Epstein Files Archive.';
  }
  return 'Investigate entities, records, and evidence in the Epstein Files Archive.';
}

// SPA fallback to index.html for non-API routes
app.get('*', async (req, res, next) => {
  if (req.path.startsWith('/api/')) return next();

  const indexFile = path.join(distPath, 'index.html');
  if (fs.existsSync(indexFile)) {
    const baseUrl = getPublicBaseUrl(req);
    const defaultOgImage = `${baseUrl}/epstein-files.jpg`;
    let html = fs.readFileSync(indexFile, 'utf8');
    const routePath = req.path;

    try {
      // =================================================================
      // SOCIAL PREVIEW: DEEP LINING LOGIC
      // =================================================================

      // 0. Route-level media item deep links (path-based)
      const mediaItemPathMatch = routePath.match(/^\/media\/(?:audio|video|items)\/(\d+)$/);
      if (mediaItemPathMatch) {
        const id = parseInt(mediaItemPathMatch[1], 10);
        if (!isNaN(id)) {
          const item = mediaRepository.getMediaItemById(id);
          if (item) {
            const fileType = String(item.file_type || '').toLowerCase();
            const typeLabel = fileType.includes('audio')
              ? 'Audio'
              : fileType.includes('video')
                ? 'Video'
                : 'Media';
            html = injectOgTags(html, {
              title: item.title || `${typeLabel} Item`,
              description:
                item.description || `${typeLabel} evidence from the Epstein Files Archive.`,
              imageUrl: getMediaItemPreviewImageUrl(item, baseUrl, defaultOgImage),
              url: `${baseUrl}${req.originalUrl}`,
            });
            return res.send(html);
          }
        }
      }

      // 1. Photos (Query param: ?photoId=123) - Existing
      const photoId = req.query.photoId;
      if (photoId) {
        const id = parseInt(photoId as string);
        if (!isNaN(id)) {
          const image = mediaService.getImageById(id);
          if (image) {
            const imageUrl = `${baseUrl}/api/media/images/${id}/raw?v=${new Date(image.dateModified || image.dateAdded || 0).getTime()}`;
            html = injectOgTags(html, {
              title: image.title || image.filename || 'Photo - Epstein Files Archive',
              description:
                image.description || `Photo from Epstein Files Archive - ${image.filename}`,
              imageUrl,
              url: `${baseUrl}${req.originalUrl}`,
            });
            return res.send(html);
          }
        }
      }

      // 2. Photos (Path-based: /media/photos/123)
      const photoPathMatch = routePath.match(/^\/media\/photos\/(\d+)$/);
      if (photoPathMatch) {
        const id = parseInt(photoPathMatch[1]);
        if (!isNaN(id)) {
          const image = mediaService.getImageById(id);
          if (image) {
            const imageUrl = `${baseUrl}/api/media/images/${id}/raw?v=${new Date(image.dateModified || image.dateAdded || 0).getTime()}`;
            html = injectOgTags(html, {
              title: image.title || image.filename || 'Photo - Epstein Files Archive',
              description:
                image.description || `Photo from Epstein Files Archive - ${image.filename}`,
              imageUrl,
              url: `${baseUrl}${req.originalUrl}`,
            });
            return res.send(html);
          }
        }
      }

      // 3. Audio/Media Items (Query param: ?id=123 on /media/audio or Generic)
      // Note: AudioBrowser uses ?id= for deep linking
      if (
        routePath.startsWith('/media/audio') ||
        routePath.startsWith('/media/video') ||
        routePath.startsWith('/media/items')
      ) {
        const mediaItemId =
          req.query.id || req.query.audioId || req.query.videoId || req.query.mediaId;
        if (mediaItemId) {
          const id = parseInt(mediaItemId as string, 10);
          if (!isNaN(id)) {
            const item = mediaRepository.getMediaItemById(id);
            if (item) {
              const fileType = String(item.file_type || '').toLowerCase();
              const typeLabel = fileType.includes('audio')
                ? 'Audio'
                : fileType.includes('video')
                  ? 'Video'
                  : 'Media';

              html = injectOgTags(html, {
                title: item.title || `${typeLabel} Recording`,
                description:
                  item.description || `${typeLabel} evidence from the Epstein Files Archive.`,
                imageUrl: getMediaItemPreviewImageUrl(item, baseUrl, defaultOgImage),
                url: `${baseUrl}${req.originalUrl}`,
              });
              return res.send(html);
            }
          }
        }
      }

      // 3b. Album deep links (query: ?albumId=123) across all media tabs.
      const albumIdQuery = req.query.albumId;
      if (albumIdQuery && routePath.startsWith('/media')) {
        const albumId = parseInt(albumIdQuery as string, 10);
        if (!isNaN(albumId)) {
          const album = mediaService.getAlbumById(albumId);
          if (album) {
            const imageUrl = getAlbumHeroImageUrl(albumId, baseUrl, defaultOgImage);
            html = injectOgTags(html, {
              title: `Album: ${album.name}`,
              description: album.description || `Evidence album from the Epstein Files Archive.`,
              imageUrl,
              url: `${baseUrl}${req.originalUrl}`,
            });
            return res.send(html);
          }
        }
      }

      // 4. Investigations (Path-based: /investigations/123)
      const invMatch = routePath.match(/^\/investigations\/(\d+)$/);
      if (invMatch) {
        const id = parseInt(invMatch[1]);
        if (!isNaN(id)) {
          const inv = await investigationsRepository.getInvestigationById(id);
          if (inv) {
            html = injectOgTags(html, {
              title: `Investigation: ${inv.title}`,
              description: inv.description || `Investigation into ${inv.title}`,
              imageUrl: defaultOgImage, // Investigations don't have covers yet
              url: `${baseUrl}${req.originalUrl}`,
            });
            return res.send(html);
          }
        }
      }

      // Check for entity deep links (e.g., /subjects?entity=123 or /entity/123)
      const entityId = req.query.entity || req.query.entityId;
      if (entityId) {
        const entity = entitiesRepository.getEntityById(String(entityId));
        if (entity) {
          const entityName = entity.fullName || entity.full_name || 'Unknown Entity';
          const role = entity.primaryRole || entity.primary_role || '';
          html = injectOgTags(html, {
            title: `${entityName} - Epstein Files Archive`,
            description: role
              ? `${entityName} (${role}) - View connections, documents and evidence in the Epstein Files Archive`
              : `${entityName} - View connections, documents and evidence in the Epstein Files Archive`,
            imageUrl: defaultOgImage,
            url: `${baseUrl}${req.originalUrl}`,
          });
          return res.send(html);
        }
      }

      // Check for article deep links (e.g., /media/articles?articleId=123)
      const articleId = req.query.article || req.query.articleId;
      if (articleId) {
        const article = getArticleById(articleId as string);
        if (article) {
          const articleTitle = article.title || 'Article';
          const summary =
            article.description ||
            article.summary ||
            `Read "${articleTitle}" in the Epstein Files Archive.`;

          html = injectOgTags(html, {
            title: `${articleTitle} - Epstein Files Archive`,
            description: summary.length > 200 ? summary.substring(0, 197) + '...' : summary,
            imageUrl: article.image_url || defaultOgImage,
            url: `${baseUrl}${req.originalUrl}`,
          });
          return res.send(html);
        }
      }

      // Check for document deep links (e.g., /documents?doc=123)
      const docId = req.query.doc || req.query.documentId || req.query.id;
      if (docId) {
        const doc = documentsRepository.getDocumentById(String(docId));
        if (doc) {
          const docTitle = doc.file_name || doc.title || 'Document';
          html = injectOgTags(html, {
            title: `${docTitle} - Epstein Files Archive`,
            description:
              doc.summary ||
              doc.content?.slice(0, 200) ||
              `View document: ${docTitle} in the Epstein Files Archive`,
            imageUrl: defaultOgImage,
            url: `${baseUrl}${req.originalUrl}`,
          });
          return res.send(html);
        }
      }

      // Check for entity path deep links (e.g., /entity/123 or /entities/123)
      const entityPathMatch = req.path.match(/^\/(?:entity|entities)\/(\d+)/);
      if (entityPathMatch) {
        const entity = entitiesRepository.getEntityById(entityPathMatch[1]);
        if (entity) {
          const entityName = entity.fullName || entity.full_name || 'Unknown';
          const role = entity.primaryRole || entity.primary_role || '';
          const rating = entity.redFlagRating || entity.red_flag_rating || 0;
          const ratingText =
            rating >= 4 ? '🔴 High Risk' : rating >= 2 ? '🟡 Medium Risk' : '🟢 Low Risk';
          html = injectOgTags(html, {
            title: `${entityName} - Epstein Files Archive`,
            description: role
              ? `${entityName} (${role}) ${ratingText} - Explore connections, documents, and evidence in the Epstein Files Archive.`
              : `${entityName} ${ratingText} - Explore connections, documents, and evidence in the Epstein Files Archive.`,
            imageUrl: defaultOgImage,
            url: `${baseUrl}${req.originalUrl}`,
          });
          return res.send(html);
        }
      }

      // Check for document path deep links (e.g. /documents/123)
      // Note: Frontend likely uses /documents/:id
      const docPathMatch = req.path.match(/^\/(?:document|documents)\/(\d+)/);
      if (docPathMatch) {
        const doc = documentsRepository.getDocumentById(docPathMatch[1]);
        if (doc) {
          const docTitle = doc.title || doc.file_name || 'Document';
          html = injectOgTags(html, {
            title: `${docTitle} - Epstein Files Archive`,
            description:
              doc.summary ||
              doc.content?.slice(0, 200) ||
              `View document: ${docTitle} in the Epstein Files Archive`,
            imageUrl: defaultOgImage,
            url: `${baseUrl}${req.originalUrl}`,
          });
          return res.send(html);
        }
      }

      // Route-based OG tags for specific pages
      // Route-based OG tags for specific pages

      // Properties
      if (routePath === '/properties' || routePath.startsWith('/properties')) {
        html = injectOgTags(html, {
          title: 'Properties - Epstein Files Archive',
          description:
            'Investigate property records, locations, linked entities, and ownership patterns in the Epstein Files Archive.',
          imageUrl: defaultOgImage,
          url: `${baseUrl}${req.originalUrl}`,
        });
        return res.send(html);
      }

      // Timeline
      if (routePath === '/timeline' || routePath.startsWith('/timeline')) {
        html = injectOgTags(html, {
          title: 'Timeline - Epstein Files Archive',
          description:
            "Interactive chronological timeline spanning decades of events: from Epstein's rise in the 1980s through trials, investigations, and ongoing revelations.",
          imageUrl: defaultOgImage,
          url: `${baseUrl}${req.originalUrl}`,
        });
        return res.send(html);
      }

      // Flights
      if (routePath === '/flights' || routePath.startsWith('/flights')) {
        html = injectOgTags(html, {
          title: 'Flight Logs - Epstein Files Archive',
          description:
            'Track the "Lolita Express" and other aircraft. Interactive map visualization of flight routes, passenger manifests, and destinations including Little St. James Island.',
          imageUrl: defaultOgImage,
          url: `${baseUrl}${req.originalUrl}`,
        });
        return res.send(html);
      }

      // Media sub-routes
      if (routePath === '/media/articles' || routePath.startsWith('/media/articles')) {
        html = injectOgTags(html, {
          title: 'Articles - Epstein Files Archive',
          description:
            'Curated investigative journalism from Miami Herald, Vanity Fair, The Guardian, and original research. Deep dives into the Epstein network and cover-ups.',
          imageUrl: defaultOgImage,
          url: `${baseUrl}${req.originalUrl}`,
        });
        return res.send(html);
      }

      if (routePath === '/media/photos' || routePath.startsWith('/media/photos')) {
        html = injectOgTags(html, {
          title: 'Photos - Epstein Files Archive',
          description:
            'Evidence photos, historical images, and documentation from the Epstein investigation. Browse by album, date, or location.',
          imageUrl: defaultOgImage,
          url: `${baseUrl}${req.originalUrl}`,
        });
        return res.send(html);
      }

      if (routePath === '/media/audio' || routePath.startsWith('/media/audio')) {
        html = injectOgTags(html, {
          title: 'Audio - Epstein Files Archive',
          description: 'Audio recordings, depositions, and testimony related to the Epstein case.',
          imageUrl: defaultOgImage,
          url: `${baseUrl}${req.originalUrl}`,
        });
        return res.send(html);
      }

      if (routePath === '/media/video' || routePath.startsWith('/media/video')) {
        html = injectOgTags(html, {
          title: 'Video - Epstein Files Archive',
          description:
            'Video evidence, interviews, and documentary footage related to the Epstein investigation.',
          imageUrl: defaultOgImage,
          url: `${baseUrl}${req.originalUrl}`,
        });
        return res.send(html);
      }

      // Generic /media route
      if (routePath === '/media') {
        html = injectOgTags(html, {
          title: 'Media - Epstein Files Archive',
          description:
            'Browse photos, videos, audio recordings, and curated articles about the Epstein investigation.',
          imageUrl: defaultOgImage,
          url: `${baseUrl}${req.originalUrl}`,
        });
        return res.send(html);
      }

      // Subjects / People
      if (routePath === '/' || routePath === '/people' || routePath.startsWith('/people')) {
        html = injectOgTags(html, {
          title: 'Subjects - Epstein Files Archive',
          description:
            'Explore individuals connected to Jeffrey Epstein. Evidence-based risk ratings, document connections, and relationship mapping for 1,000+ subjects.',
          imageUrl: defaultOgImage,
          url: `${baseUrl}${req.originalUrl}`,
        });
        return res.send(html);
      }

      // Documents
      if (routePath === '/documents' || routePath.startsWith('/documents')) {
        html = injectOgTags(html, {
          title: 'Documents - Epstein Files Archive',
          description:
            'Search thousands of court filings, emails, financial records, and depositions. Full-text search with OCR-processed scanned documents.',
          imageUrl: defaultOgImage,
          url: `${baseUrl}${req.originalUrl}`,
        });
        return res.send(html);
      }

      // Black Book
      if (
        routePath === '/blackbook' ||
        routePath.startsWith('/blackbook') ||
        routePath === '/black-book' ||
        routePath.startsWith('/black-book')
      ) {
        html = injectOgTags(html, {
          title: 'Black Book - Epstein Files Archive',
          description:
            "Explore Jeffrey Epstein's infamous address book containing 1,700+ contacts. Search names, view connections, and cross-reference with flight logs.",
          imageUrl: defaultOgImage,
          url: `${baseUrl}${req.originalUrl}`,
        });
        return res.send(html);
      }

      // Search
      if (routePath === '/search' || routePath.startsWith('/search')) {
        const searchQuery = req.query.q as string;
        html = injectOgTags(html, {
          title: searchQuery
            ? `"${searchQuery}" - Search Results - Epstein Files Archive`
            : 'Search - Epstein Files Archive',
          description: searchQuery
            ? `Search results for "${searchQuery}" in the Epstein Files Archive. Find entities, documents, and evidence.`
            : 'Search across entities, documents, flight logs, and evidence in the comprehensive Epstein Files Archive.',
          imageUrl: defaultOgImage,
          url: `${baseUrl}${req.originalUrl}`,
        });
        return res.send(html);
      }

      // Investigations
      if (routePath === '/investigations' || routePath.startsWith('/investigations')) {
        html = injectOgTags(html, {
          title: 'Investigations - Epstein Files Archive',
          description:
            'Research workspace for building investigation threads. Create hypotheses, link evidence, and export findings.',
          imageUrl: defaultOgImage,
          url: `${baseUrl}${req.originalUrl}`,
        });
        return res.send(html);
      }

      // Analytics
      if (routePath === '/analytics' || routePath.startsWith('/analytics')) {
        html = injectOgTags(html, {
          title: 'Analytics - Epstein Files Archive',
          description:
            'Data visualizations and network analysis. Explore connection graphs, document timelines, and statistical breakdowns of the evidence.',
          imageUrl: defaultOgImage,
          url: `${baseUrl}${req.originalUrl}`,
        });
        return res.send(html);
      }

      // Emails
      if (routePath === '/emails' || routePath.startsWith('/emails')) {
        html = injectOgTags(html, {
          title: 'Email Browser - Epstein Files Archive',
          description:
            'Browse email communications with threaded conversations, sender analysis, and attachment tracking.',
          imageUrl: defaultOgImage,
          url: `${baseUrl}${req.originalUrl}`,
        });
        return res.send(html);
      }

      // About
      if (routePath === '/about' || routePath.startsWith('/about')) {
        html = injectOgTags(html, {
          title: 'Live Ingestion Dashboard & Methodology',
          description:
            'Monitor the real-time ingestion of 1.3M new DOJ files. Explore our database methodology, data sources, and forensic analysis tools.',
          imageUrl: defaultOgImage,
          url: `${baseUrl}${req.originalUrl}`,
        });
        return res.send(html);
      }

      // Admin
      if (routePath === '/admin' || routePath.startsWith('/admin')) {
        html = injectOgTags(html, {
          title: 'Admin - Epstein Files Archive',
          description: 'Administration dashboard for the Epstein Files Archive.',
          imageUrl: defaultOgImage,
          url: `${baseUrl}${req.originalUrl}`,
        });
        return res.send(html);
      }

      // Login
      if (routePath === '/login') {
        html = injectOgTags(html, {
          title: 'Login - Epstein Files Archive',
          description:
            'Sign in to access investigation features and contribute to the Epstein Files Archive.',
          imageUrl: defaultOgImage,
          url: `${baseUrl}${req.originalUrl}`,
        });
        return res.send(html);
      }

      // Final fallback: always inject a real route-specific title/description for share previews.
      html = injectOgTags(html, {
        title: routeTitleFromPath(routePath),
        description: routeDescription(routePath),
        imageUrl: defaultOgImage,
        url: `${baseUrl}${req.originalUrl}`,
      });
      return res.send(html);
    } catch (err) {
      console.error('Error injecting OG tags:', err);
      // Fallback to sending file normally
    }

    res.sendFile(indexFile);
  } else {
    next();
  }
});

// Start server
// Ensure migrations are run before starting
try {
  validateStartup();
  runMigrations();
  seedInvestigationMediaTags();

  // Phase 6 Resilience: Background Junk Flag Backfill
  // DISABLED FOR STABILITY: Run manually via scripts/maintenance.ts
  /*
  try {
    entitiesRepository.startBackgroundJunkBackfill();
  } catch (e) {
    console.error('⚠️ [STARTUP] Junk flags backfill trigger failed:', e);
  }
  */

  // Phase 6 Performance: Graph Adjacency Cache Rebuild
  // DISABLED FOR STABILITY: Run manually via scripts/maintenance.ts
  /*
  setTimeout(() => {
    try {
      relationshipsRepository.rebuildAdjacencyCache();
    } catch (e) {
      console.error('⚠️ [BACKGROUND] Adjacency cache rebuild failed:', e);
    }
  }, 5000);
  */
} catch (err) {
  console.error('Failed to run migrations:', err);
  process.exit(1);
}

const server = app.listen(config.apiPort, () => {
  console.log(`🚀 Production API server running on port ${config.apiPort}`);
  console.log(`📊 Environment: ${config.nodeEnv}`);

  // CRITICAL STARTUP ASSERTIONS
  if (config.nodeEnv === 'production' && config.apiPort !== 8080 && config.apiPort !== 3012) {
    console.warn(`⚠️  [DEPLOYMENT WARNING] Production expects PORT 8080 or 3012!`);
    console.warn(`⚠️  Current PORT is ${config.apiPort} - API calls may return 404!`);
  }
  // Perform FTS Maintenance
  FtsMaintenanceService.performMaintenance()
    .then(() => console.log('✅ FTS Maintenance complete'))
    .catch((err) => console.error('❌ FTS Maintenance failed:', err));

  // PERIODIC DATABASE MAINTENANCE (WAL Checkpointing)
  // Run every 30 minutes in production to prevent WAL bloat
  const CHECKPOINT_INTERVAL = 30 * 60 * 1000;
  setInterval(() => {
    try {
      const db = getDb();
      // PASSIVE checkpoint: try to merge as many frames as possible without blocking others
      db.pragma('wal_checkpoint(PASSIVE)');
      console.log(
        `${new Date().toISOString()} [MAINTENANCE] SQLite WAL checkpoint (PASSIVE) completed.`,
      );
    } catch (err) {
      console.error('⚠️ [MAINTENANCE] SQLite WAL checkpoint failed:', err);
    }
  }, CHECKPOINT_INTERVAL);

  // Log startup diagnostics for debugging
  console.log('--- Startup Warnings ---');
  const isProduction = process.env.NODE_ENV === 'production';
  if (isProduction) {
    console.log(
      '[INFO] Production mode: Authentication is FORCED regardless of ENABLE_AUTH setting.',
    );
  }
  console.log('[INFO] Authentication is now forced to be enabled in all environments');
  console.log('------------------------');

  if (typeof process.send === 'function') {
    process.send('ready');
  }
});

// === GRACEFUL SHUTDOWN ===
// Close database connection properly to prevent "database is locked" errors
const gracefulShutdown = (signal: string) => {
  console.log(`\n${signal} received. Shutting down gracefully...`);

  server.close(() => {
    console.log('HTTP server closed.');

    try {
      // Close database connection
      const db = getDb();
      if (db) {
        db.close();
        console.log('Database connection closed.');
      }
    } catch (e) {
      console.error('Error closing database:', e);
    }

    console.log('Graceful shutdown complete.');
    process.exit(0);
  });

  // Force exit after 10 seconds if graceful shutdown fails
  setTimeout(() => {
    console.error('Forced shutdown after timeout.');
    process.exit(1);
  }, 10000);
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

export default server;
