import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import cookieParser from 'cookie-parser';
import path from 'path';
import { fileURLToPath } from 'url';
// import { databaseService } from './services/DatabaseService.js';
import { getDb } from './server/db/connection.js';
import { entitiesRepository } from './server/db/entitiesRepository.js';
import { documentsRepository } from './server/db/documentsRepository.js';
import { relationshipsRepository } from './server/db/relationshipsRepository.js';
import { investigationsRepository } from './server/db/investigationsRepository.js';
import { statsRepository } from './server/db/statsRepository.js';
import { searchRepository } from './server/db/searchRepository.js';
import { jobsRepository } from './server/db/jobsRepository.js';
import { forensicRepository } from './server/db/forensicRepository.js';
import { runMigrations } from './server/db/migrator.js';
import { validateStartup } from './server/utils/startupValidation.js';
import { authenticateRequest, requireRole } from './server/auth/middleware.js';
import authRoutes from './server/auth/routes.js';
import { logAudit } from './server/utils/auditLogger.js';
import { validateEnvironment, getEnv } from './server/utils/envValidator.js';
import { InvestigationService } from './services/InvestigationService.js';
import { MediaService } from './services/MediaService.js';
import investigationEvidenceRoutes from './routes/investigationEvidenceRoutes.js';
import investigationsRouter from './server/routes/investigations.js';
import evidenceRoutes from './routes/evidenceRoutes.js';
import crypto from 'crypto';
import multer from 'multer';
import fs from 'fs';
import pdf from 'pdf-parse';
import bcrypt from 'bcryptjs';
import { SearchFilters, SortOption } from './types';
import { config } from './config/index.js';
import { blackBookRepository } from './server/db/blackBookRepository.js';
import { globalErrorHandler } from './server/utils/errorHandler.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Paths
const DB_PATH = getEnv('DB_PATH', path.join(__dirname, '../../epstein-archive-production.db'));
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

// Basic middleware
app.use(cors({
  origin: config.corsOrigin,
  credentials: config.corsCredentials
}));

app.use(cookieParser());

// Security headers (CSP, HSTS, X-Frame-Options, etc.)
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"], // Required for React
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "blob:", "*"],
      connectSrc: ["'self'", "http://localhost:*"],
      fontSrc: ["'self'", "data:"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"]
    }
  },
  crossOriginEmbedderPolicy: false, // Required for some media
}));

// Compress all responses
app.use(compression());

// Rate limiting (100 requests per 15 minutes per IP)
const apiLimiter = rateLimit({
  windowMs: config.rateLimitWindowMs,
  max: config.rateLimitMaxRequests,
  message: { error: 'Too many requests, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/', apiLimiter);

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Mount specialized routes
app.use('/api/investigations', investigationsRouter);
app.use('/api/investigation', investigationEvidenceRoutes);
app.use('/api/evidence', evidenceRoutes);
app.use('/api/auth', authRoutes);

// Protected Media Routes
app.put('/api/media/images/:id', authenticateRequest, requireRole('admin'), async (req, res, next) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ error: 'Invalid ID' });
    
    mediaService.updateImage(id, req.body);
    const updated = mediaService.getImageById(id);
    res.json(updated);
  } catch (err) {
    next(err);
  }
});

// Request logging
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} ${req.method} ${req.url}`);
  next();
});

// Serve static frontend from dist
const distPath = path.join(process.cwd(), 'dist');
if (fs.existsSync(distPath)) {
  // Serve static frontend from dist
  app.use(express.static(distPath, {
    setHeaders: (res, path) => {
      // Don't cache index.html to ensure updates are seen immediately
      if (path.endsWith('index.html')) {
        res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
        res.setHeader('Pragma', 'no-cache');
        res.setHeader('Expires', '0');
      } else {
        // Cache other assets (they have hash chunks)
        res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
      }
    }
  }));
}
// Serve project data (images) statically
const dataPath = path.join(process.cwd(), 'data');
if (fs.existsSync(dataPath)) {
  app.use('/data', express.static(dataPath));
}
// Local development document images (
// maps absolute dataset folder to /files)
try {
  if (fs.existsSync(CORPUS_BASE_PATH)) {
    app.use('/files', express.static(CORPUS_BASE_PATH));
  }
} catch {}

// Health check endpoint
app.get('/api/health', (_req, res) => {
  const healthCheck = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    database: typeof getDb === 'function' ? 'connected' : 'not_initialized',
    memory: process.memoryUsage(),
    environment: config.nodeEnv,
  };
  
  res.status(200).json(healthCheck);
});

// Readiness check for Kubernetes/Docker
app.get('/api/ready', (_req, res) => {
  if (getDb()) {
    res.status(200).json({ status: 'ready' });
  } else {
    res.status(503).json({ status: 'not_ready', reason: 'database_not_initialized' });
  }
});

// Auth Login Endpoint (Public)
// Auth Routes (Login/Logout)
app.use('/api/auth', authRoutes);

// Apply Auth Middleware to all other API routes
app.use('/api', authenticateRequest);

// User Management Endpoints
app.get('/api/users', async (_req, res, next) => {
  try {
    const db = getDb();
    const users = db.prepare('SELECT * FROM users ORDER BY username ASC').all();
    res.json(users);
  } catch (e) { next(e); }
});

app.get('/api/users/current', async (req, res, next) => {
  // Simple simulation of session/auth
  try {
    const db = getDb();
    // Default to the first user if no header (in real app, would use session/token)
    const userId = req.headers['x-user-id'] || 'user-1'; 
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId);
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json(user);
  } catch (e) { next(e); }
});

// Create new user (Admin only)
app.post('/api/users', authenticateRequest, requireRole('admin'), async (req, res, next) => {
  try {
    const { username, password, email, role } = req.body;
    
    if (!username || !password) {
        return res.status(400).json({ error: 'Username and password required' });
    }

    const id = `user-${Date.now()}`;
    const db = getDb();
    
    // Hash password
    const passwordHash = bcrypt.hashSync(password, 10);
    
    db.prepare(`
      INSERT INTO users (id, username, email, role, password_hash, created_at, last_active)
      VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    `).run(id, username, email || null, role || 'viewer', passwordHash);
    
    logAudit('create_user', (req as any).user?.id, 'user', id, { username, role });
    res.status(201).json({ id, username, email, role });
  } catch (e) { next(e); }
});

// Update user (Admin only)
app.put('/api/users/:id', authenticateRequest, requireRole('admin'), async (req, res, next) => {
  try {
    const { id } = req.params;
    const { email, role, password } = req.body;
    const db = getDb();
    
    let query = 'UPDATE users SET last_active = CURRENT_TIMESTAMP';
    const params: any[] = [];
    
    if (email !== undefined) {
      query += ', email = ?';
      params.push(email);
    }
    
    if (role !== undefined) {
       // Prevent self-lockout? simplified for now
       query += ', role = ?';
       params.push(role);
    }
    
    if (password) {
      const hash = bcrypt.hashSync(password, 10);
      query += ', password_hash = ?';
      params.push(hash);
    }
    
    query += ' WHERE id = ?';
    params.push(id);
    
    const result = db.prepare(query).run(...params);
    
    if (result.changes === 0) return res.status(404).json({ error: 'User not found' });
    
    logAudit('update_user', (req as any).user?.id, 'user', id, { role, emailUpdated: !!email, passwordUpdated: !!password });
    res.json({ success: true });
  } catch (e) { next(e); }
});

// Delete user (Admin only)
app.delete('/api/users/:id', authenticateRequest, requireRole('admin'), async (req, res, next) => {
  try {
    const { id } = req.params;
    const db = getDb();
    
    // Prevent self-deletion
    if ((req as any).user?.id === id) {
       return res.status(400).json({ error: 'Cannot delete yourself' });
    }

    const result = db.prepare('DELETE FROM users WHERE id = ?').run(id);
    
    if (result.changes === 0) return res.status(404).json({ error: 'User not found' });
    
    logAudit('delete_user', (req as any).user?.id, 'user', id, {});
    res.json({ success: true });
  } catch (e) { next(e); }
});

// Document Upload Endpoint with Security Validation (Issue 20)
const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'text/plain',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'image/jpeg',
  'image/png'
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
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `doc-${uniqueSuffix}${ext}`);
  }
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
  limits: { fileSize: MAX_FILE_SIZE }
});

app.post('/api/upload-document', upload.single('document'), async (req, res, next) => {
  try {
    const file = req.file;
    if (!file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const userId = (req as any).user?.id || 'system';
    const db = getDb();
    
    // Calculate file hash for integrity
    const fileBuffer = fs.readFileSync(file.path);
    const contentHash = crypto.createHash('md5').update(fileBuffer).digest('hex');
    
    // Determine evidence type from extension
    const ext = path.extname(file.originalname).toLowerCase();
    const evidenceType = ext === '.pdf' ? 'Legal Document' : 
                         ['.jpg', '.jpeg', '.png'].includes(ext) ? 'Photograph' : 'Text Document';
    
    // Insert document record
    const result = db.prepare(`
      INSERT INTO documents (file_name, file_path, file_type, file_size, evidence_type, content_hash, created_at, metadata_json)
      VALUES (?, ?, ?, ?, ?, ?, datetime('now'), ?)
    `).run(
      file.originalname,
      file.path,
      ext.replace('.', ''),
      file.size,
      evidenceType,
      contentHash,
      JSON.stringify({ uploadedBy: userId, ingestionMethod: 'upload', scanStatus: 'pending' })
    );
    
    const documentId = result.lastInsertRowid;
    
    // Create initial chain of custody entry
    try {
      db.prepare(`
        INSERT INTO chain_of_custody (evidence_id, action, performed_by, timestamp, details, hash_before, hash_after)
        VALUES (?, 'acquired', ?, datetime('now'), ?, ?, ?)
      `).run(documentId, userId, 'Document uploaded via API', contentHash, contentHash);
    } catch (e) {
      // chain_of_custody might not be set up for document IDs, continue anyway
      console.warn('Could not create chain_of_custody entry:', e);
    }
    
    // Audit log
    logAudit('upload_document', userId, 'document', String(documentId), { 
      filename: file.originalname, 
      size: file.size,
      hash: contentHash 
    });
    
    res.status(201).json({
      id: documentId,
      fileName: file.originalname,
      filePath: file.path,
      fileSize: file.size,
      contentHash,
      evidenceType,
      message: 'Document uploaded successfully'
    });
  } catch (error) {
    console.error('Upload error:', error);
    next(error);
  }
});

// API routes with comprehensive error handling
app.get('/api/entities', async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 24));
    const search = req.query.search as string;
    const role = req.query.role as string;
    const likelihood = req.query.likelihood as string | string[];
    const entityType = req.query.type as string;
    const sortBy = req.query.sortBy as string;
    const sortOrder = req.query.sortOrder as 'asc' | 'desc';

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
      sortOrder: undefined
    };
    
    if (search) filters.searchTerm = search.trim();
    if (role) filters.evidenceTypes = [role.trim()];
    if (likelihood) {
      if (Array.isArray(likelihood)) {
         filters.likelihoodScore = likelihood.map(l => l as 'HIGH' | 'MEDIUM' | 'LOW');
      } else {
         filters.likelihoodScore = [likelihood as 'HIGH' | 'MEDIUM' | 'LOW'];
      }
    }
    if (entityType) filters.entityType = entityType.trim();
    if (sortBy) filters.sortBy = sortBy.trim() as any;
    if (sortOrder) filters.sortOrder = sortOrder;

    const result = entitiesRepository.getEntities(page, limit, filters, sortBy as SortOption);

    // Transform the result to match the expected format
    const transformedData = result.entities.map((entity: any) => ({
      id: entity.id,
      name: entity.full_name || entity.fullName,
      fullName: entity.full_name || entity.fullName,
      entity_type: entity.entity_type || entity.entityType || 'Person',
      primaryRole: entity.primary_role || entity.primaryRole || 'Person of Interest',
      secondaryRoles: entity.secondary_roles || entity.secondaryRoles || [],
      mentions: entity.mentions,
      files: entity.document_count || entity.files || entity.documentCount || 0,
      contexts: entity.contexts || [],
      evidence_types: entity.evidence_types || entity.evidenceTypes || [],
      evidenceTypes: entity.evidence_types || entity.evidenceTypes || [],
      spicy_passages: entity.red_flag_passages || entity.spicyPassages || [],
      likelihood_score: entity.likelihood_level || entity.likelihoodScore || entity.likelihoodLevel || 'LOW',
      red_flag_score: entity.red_flag_score || entity.redFlagScore || 0,
      red_flag_rating: entity.red_flag_rating || entity.redFlagRating || 0,
      red_flag_peppers: (entity.red_flag_rating || entity.redFlagRating) ? '🚩'.repeat(entity.red_flag_rating || entity.redFlagRating) : '🏳️',
      red_flag_description: entity.red_flag_description || entity.redFlagDescription || `Red Flag Index ${entity.red_flag_rating || entity.redFlagRating || 0}`,
      connectionsToEpstein: entity.connections_summary || entity.connectionsSummary || ''
    }));

    // Add cache headers for performance
    res.set({
      'Cache-Control': 'private, max-age=60',
      'X-Total-Count': result.total.toString(),
      'X-Page': page.toString(),
      'X-Page-Size': limit.toString(),
      'X-Total-Pages': Math.ceil(result.total / limit).toString(),
    });

    res.json({
      data: transformedData,
      total: result.total,
      page: page,
      pageSize: limit,
      totalPages: Math.ceil(result.total / limit)
    });
  } catch (error) {
    console.error('Error fetching entities:', error);
    next(error);
  }
});

app.post('/api/entities', async (req, res, next) => {
    try {
        const id = entitiesRepository.createEntity(req.body);
        logAudit('create_entity', (req as any).user?.id, 'entity', String(id), { name: req.body.full_name });
        res.status(201).json({ id });
    } catch (e) { next(e); }
});

app.patch('/api/entities/:id', async (req, res, next) => {
    try {
        const id = req.params.id;
        const changes = entitiesRepository.updateEntity(id, req.body);
        if (changes === 0) return res.status(404).json({ error: 'Not found or no changes' });
        logAudit('update_entity', (req as any).user?.id, 'entity', String(id), req.body);
        res.json({ success: true });
    } catch (e) { next(e); }
});

// Get all entities for document linking
app.get('/api/entities/all', async (_req, res, next) => {
  try {
    const entities = entitiesRepository.getAllEntities();
    res.json(entities);
  } catch (error) {
    console.error('Error fetching all entities:', error);
    next(error);
  }
});

// Get single entity with error handling
app.get('/api/entities/:id', async (req, res, next) => {
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
    
    const entity = entitiesRepository.getEntityById(entityId) as any;
    
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
      spicy_passages: entity.spicyPassages || [],
      likelihood_score: entity.likelihoodLevel,
      red_flag_score: entity.redFlagScore !== undefined ? entity.redFlagScore : 0,
      red_flag_rating: entity.redFlagRating !== undefined ? entity.redFlagRating : 0,
      red_flag_peppers: entity.redFlagRating !== undefined ? '🚩'.repeat(entity.redFlagRating) : '🏳️',
      red_flag_description: entity.redFlagDescription || `Red Flag Index ${entity.redFlagRating !== undefined ? entity.redFlagRating : 0}`,
      connectionsToEpstein: entity.connectionsSummary || '',
      fileReferences: entity.fileReferences || [],
      timelineEvents: entity.timelineEvents || [],
      networkConnections: entity.networkConnections || [],
      // Include Black Book information if available
      blackBookEntry: entity.blackBookEntry || null
    };
    res.json(transformedEntity);
  } catch (error) {
    console.error('Error fetching entity:', error);
    next(error);
  }
});

// Get all articles
app.get('/api/articles', async (_req, res, next) => {
  try {
    // statsRepository doesn't have getArticles, need to migrate or keep using DB
    const articles = getDb().prepare('SELECT * FROM articles ORDER BY red_flag_rating DESC, pub_date DESC').all();
    res.json(articles);
  } catch (error) {
    console.error('Error fetching articles:', error);
    next(error);
  }
});

// Get documents for a specific entity
app.get('/api/entities/:id/documents', async (req, res, next) => {
  try {
    const entityId = req.params.id;
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 50));
    const sortBy = (req.query.sortBy as string) || 'mentions';
    
    // Get entity name first
    const entity = getDb().prepare('SELECT full_name as name FROM entities WHERE id = ?').get(entityId) as { name: string };
    
    if (!entity) {
         return res.json({ data: [], total: 0, page, pageSize: limit, totalPages: 0 });
    }

    // Query documents that mention this entity (using simple name search)
    const offset = (page - 1) * limit;
    const searchTerm = `%${entity.name}%`;

    const query = `
      SELECT 
        d.id,
        d.file_name as fileName,
        d.file_path as filePath,
        d.file_type as fileType,
        d.file_size as fileSize,
        d.date_created as dateCreated,
        substr(d.content, 1, 300) as contentPreview,
        d.evidence_type as evidenceType,
        0 as mentionsCount,
        d.content,
        d.metadata_json as metadata,
        d.word_count as wordCount,
        d.red_flag_rating as redFlagRating,
        d.content_hash as contentHash,
        d.file_name as title,
        0 as entityMentions
      FROM documents d
      WHERE d.content LIKE ? OR d.file_name LIKE ?
      ORDER BY d.red_flag_rating DESC
      LIMIT ? OFFSET ?
    `;
    
    const countQuery = `
      SELECT COUNT(*) as total
      FROM documents d
      WHERE d.content LIKE ? OR d.file_name LIKE ?
    `;
    
    let documents = getDb().prepare(query).all(searchTerm, searchTerm, limit, offset) as any[];
    
    // Map file paths to URLs
    documents = documents.map(doc => {
        if (doc.filePath && doc.filePath.startsWith(CORPUS_BASE_PATH)) {
            doc.filePath = doc.filePath.replace(CORPUS_BASE_PATH, '/files');
        }
        return doc;
    });

    const totalResult = getDb().prepare(countQuery).get(searchTerm, searchTerm) as { total: number };
    
    res.json({
      data: documents,
      total: totalResult.total,
      page,
      pageSize: limit,
      totalPages: Math.ceil(totalResult.total / limit)
    });
  } catch (error) {
    console.error('Error fetching entity documents:', error);
    next(error);
  }
});

// Black Book endpoint - returns entries from Black Book table
app.get('/api/black-book', async (req, res, next) => {
  try {
    const filters = {
      letter: req.query.letter as string | undefined,
      search: req.query.search as string | undefined,
      hasPhone: req.query.hasPhone === 'true',
      hasEmail: req.query.hasEmail === 'true',
      hasAddress: req.query.hasAddress === 'true',
      limit: req.query.limit ? parseInt(req.query.limit as string) : undefined
    };
    
    const entries = blackBookRepository.getBlackBookEntries(filters);
    
    res.json({
      data: entries,
      total: entries.length,
      page: 1,
      pageSize: entries.length,
      totalPages: 1
    });
  } catch (error) {
    console.error('Error fetching Black Book:', error);
    next(error);
  }
});

// Get database statistics
app.get('/api/stats', async (_req, res, next) => {
  try {
    const stats = statsRepository.getStatistics();
    res.json(stats);
  } catch (error) {
    console.error('Error fetching statistics:', error);
    next(error);
  }
});

// Forensic Metrics Summary (Tier 3 - Advanced Analytics)
app.get('/api/forensic/metrics-summary', async (_req, res, next) => {
  try {
    const summary = forensicRepository.getMetricsSummary();
    res.json(summary);
  } catch (error) {
    console.error('Error fetching forensic metrics summary:', error);
    next(error);
  }
});

// Documents endpoint - returns paginated documents
app.get('/api/documents', async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 50));
    const sortBy = (req.query.sortBy as string) || 'red_flag';
    const search = req.query.search as string;
    const fileType = req.query.fileType as string;
    const evidenceType = req.query.evidenceType as string;
    const minRedFlag = parseInt(req.query.minRedFlag as string) || 0;
    const maxRedFlag = parseInt(req.query.maxRedFlag as string) || 5;
    
    // Build WHERE clause
    const whereConditions: string[] = [];
    const params: any[] = [];
    
    if (search && search.trim()) {
      whereConditions.push('(file_name LIKE ? OR content LIKE ?)');
      const searchPattern = `%${search}%`;
      params.push(searchPattern, searchPattern);
    }
    
    if (fileType && fileType !== 'all') {
      const types = fileType.split(',');
      whereConditions.push(`file_type IN (${types.map(() => '?').join(',')})`);
      params.push(...types);
    }
    
    // Evidence type filter (category)
    if (evidenceType && evidenceType !== 'all') {
      whereConditions.push('evidence_type = ?');
      params.push(evidenceType);
    }
    
    // Only apply Red Flag filter if explicitly requested (not default values)
    if (req.query.minRedFlag || req.query.maxRedFlag) {
      whereConditions.push('(red_flag_rating IS NULL OR (red_flag_rating >= ? AND red_flag_rating <= ?))');
      params.push(minRedFlag, maxRedFlag);
    }
    
    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';
    
    // Build ORDER BY clause
    let orderByClause = 'ORDER BY ';
    switch (sortBy) {
      case 'date':
        orderByClause += 'date_created DESC';
        break;
      case 'title':
        orderByClause += 'file_name ASC';
        break;
      case 'red_flag':
      default:
        orderByClause += 'red_flag_rating DESC, date_created DESC';
        break;
    }
    
    // Query documents from database
    const offset = (page - 1) * limit;
    
    // Explicitly select columns to avoid ambiguities
    const query = `
      SELECT 
        id,
        file_name as fileName,
        file_path as filePath,
        file_type as fileType,
        file_size as fileSize,
        date_created as dateCreated,
        substr(content, 1, 300) as contentPreview,
        evidence_type as evidenceType,
        0 as mentionsCount,
        content,
        metadata_json as metadata,
        word_count as wordCount,
        red_flag_rating as redFlagRating,
        content_hash as contentHash,
        file_name as title
      FROM documents
      ${whereClause}
      ${orderByClause}
      LIMIT ? OFFSET ?
    `;
    
    // Use simple count
    const countQuery = `SELECT COUNT(*) as total FROM documents ${whereClause}`;
    
    params.push(limit, offset);
    // Use try-catch for the query itself to catch column errors specifically
    const result = documentsRepository.getDocuments(page, limit, {
        search: search,
        fileType: fileType,
        evidenceType: evidenceType,
        minRedFlag: minRedFlag,
        maxRedFlag: maxRedFlag,
        sortBy: sortBy
    });

    // Map file paths to URLs
    const mappedDocuments = result.documents.map((doc: any) => {
        if (doc.filePath && doc.filePath.startsWith(CORPUS_BASE_PATH)) {
            doc.filePath = doc.filePath.replace(CORPUS_BASE_PATH, '/files');
        }
        return doc;
    });
    
    // Remove limit/offset for count query
    const countParams = params.slice(0, -2);
    const totalResult = getDb().prepare(countQuery).get(...countParams) as { total: number };
    
    res.json({
      data: mappedDocuments,
      total: totalResult.total,
      page,
      pageSize: limit,
      totalPages: Math.ceil(totalResult.total / limit)
    });
  } catch (error) {
    console.error('Error fetching documents:', error);
    next(error);
  }
});

// Get single document by ID
app.get('/api/documents/:id', async (req, res, next) => {
  try {
    const id = req.params.id as string;
    const doc = documentsRepository.getDocumentById(id) as any;
    if (!doc) {
      return res.status(404).json({ error: 'not_found' });
    }
    
    // Transform file paths to accessible URLs
    // First check if it's in the local data directory (using loose check for migrated paths)
    if (doc.file_path && (doc.file_path.includes('/data/') || doc.file_path.includes('\\data\\'))) {
        // Replace everything up to and including /data/ with /data/
        doc.fileUrl = doc.file_path.replace(/^.*[/\\]data[/\\]/, '/data/').replace(/\\/g, '/');
    } else if (doc.file_path && doc.file_path.startsWith(CORPUS_BASE_PATH)) {
      doc.fileUrl = doc.file_path.replace(CORPUS_BASE_PATH, '/files');
    }

    if (doc.original_file_path) {
        if (doc.original_file_path.includes('/data/') || doc.original_file_path.includes('\\data\\')) {
             doc.originalFileUrl = doc.original_file_path.replace(/^.*[/\\]data[/\\]/, '/data/').replace(/\\/g, '/');
        } else if (doc.original_file_path.startsWith(CORPUS_BASE_PATH)) {
            doc.originalFileUrl = doc.original_file_path.replace(CORPUS_BASE_PATH, '/files');
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

// Get original pages for a document
app.get('/api/documents/:id/pages', async (req, res, next) => {
  try {
    const id = req.params.id as string;
    
    // First check if there's a document_pages table entry (if table exists)
    let dbPages: any[] = [];
    try {
      dbPages = getDb().prepare('SELECT * FROM document_pages WHERE document_id = ? ORDER BY page_number ASC').all(id) as any[];
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
    const doc = documentsRepository.getDocumentById(id) as any;
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
    } catch(e) {}

    const oversightMatch = doc.fileName.match(/^House Oversight (\d+)-OCR\.txt$/i);
    
    if (imageFolder || oversightMatch) {
      const folderNum = imageFolder ? path.basename(imageFolder) : oversightMatch![1]; // e.g., "001"
      
      // Construct path to images folder
      // Assuming structure: CORPUS_BASE_PATH/Epstein Estate Documents - Seventh Production/IMAGES/{folderNum}/
      const fs = require('fs');
      const pathLib = require('path');
      
      let imagesBase = '';
      if (imageFolder) {
          // If we have an explicit path (e.g. /IMAGES/001), try to construct full path
          // The stored path is relative to the "root" of the corpus usually, or just the folder name.
          // Let's assume it's relative to CORPUS_BASE_PATH + 'Epstein Estate Documents - Seventh Production'
          // OR just relative to CORPUS_BASE_PATH.
          // The migration script set it to `/IMAGES/${volNum}`.
          imagesBase = pathLib.join(CORPUS_BASE_PATH, 'Epstein Estate Documents - Seventh Production', imageFolder);
          if (!fs.existsSync(imagesBase)) {
              imagesBase = pathLib.join(CORPUS_BASE_PATH, imageFolder);
          }
      } else {
          // Fallback to old logic
          imagesBase = pathLib.join(CORPUS_BASE_PATH, 'Epstein Estate Documents - Seventh Production', 'IMAGES', folderNum);
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
    const doc = documentsRepository.getDocumentById(id) as any;
    if (!doc) {
      return res.status(404).json({ error: 'not_found' });
    }
    
    // Try to find the original file
    const filePath = doc.filePath || doc.file_path;
    if (!filePath) {
      return res.status(404).json({ error: 'no_file_path' });
    }
    
    // Resolve the file path
    const path = require('path');
    const fs = require('fs');
    
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
        'Critical Red Flags'
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
        spicy_passages: entity.spicyPassages || [],
        likelihood_score: entity.likelihoodLevel,
        red_flag_score: entity.redFlagScore !== undefined ? entity.redFlagScore : 0,
        red_flag_rating: redFlagRating,
        red_flag_peppers: redFlagRating !== undefined ? redFlagIndicators.repeat(redFlagRating) : '🏳️',
        red_flag_description: redFlagDescriptions[redFlagRating] || 'No Red Flags',
        connectionsToEpstein: entity.connectionsSummary || ''
      };
    });

    // Transform documents to match expected API format
    const transformedDocuments = result.documents.map((doc: any) => ({
      id: doc.id,
      fileName: doc.fileName,
      filePath: doc.filePath,
      fileType: doc.fileType,
      evidenceType: doc.evidenceType,
      contentPreview: doc.contentPreview,
      mentionsCount: doc.mentionsCount,
      createdAt: doc.createdAt
    }));

    // Pagination
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedEntities = transformedEntities.slice(startIndex, endIndex);

    res.json({
      data: paginatedEntities,
      total: transformedEntities.length,
      page: page,
      pageSize: limit,
      totalPages: Math.ceil(transformedEntities.length / limit)
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
      primaryRole: entity.primaryRole,
      secondaryRoles: entity.secondaryRoles || [],
      mentions: entity.mentions,
      files: entity.documentCount || (entity.fileReferences ? entity.fileReferences.length : 0),
      contexts: entity.contexts || [],
      evidence_types: entity.evidence_types || entity.evidenceTypes || [],
      spicy_passages: entity.spicyPassages || [],
      likelihood_score: entity.likelihoodLevel,
      red_flag_score: entity.redFlagScore !== undefined ? entity.redFlagScore : 0,
      red_flag_rating: entity.redFlagRating !== undefined ? entity.redFlagRating : 0,
      red_flag_peppers: entity.redFlagRating !== undefined ? '🚩'.repeat(entity.redFlagRating) : '🏳️',
      red_flag_description: entity.redFlagDescription || `Red Flag Index ${entity.redFlagRating !== undefined ? entity.redFlagRating : 0}`,
      connectionsToEpstein: entity.connectionsSummary || ''
    }));

    let transformedDocuments = result.documents.map((doc: any) => ({
      id: doc.id,
      fileName: doc.fileName,
      filePath: doc.filePath,
      fileType: doc.fileType,
      evidenceType: doc.evidenceType,
      snippet: snippets ? doc.snippet : undefined,
      contentPreview: snippets ? (doc.snippet || doc.contentPreview) : doc.contentPreview,
      createdAt: doc.createdAt,
      redFlagBand: typeof doc.redFlagRating === 'number' ? (doc.redFlagRating >= 5 ? 'critical' : doc.redFlagRating >= 4 ? 'high' : doc.redFlagRating >= 2 ? 'medium' : 'low') : 'unknown'
    }));

    if (type === 'document') {
      transformedDocuments = transformedDocuments;
    } else if (type === 'entity') {
      transformedDocuments = [];
    }

    if (evidenceType) {
      transformedDocuments = transformedDocuments.filter((d: any) => (d.evidenceType || '').toLowerCase() === evidenceType.toLowerCase());
    }
    if (redFlagBand) {
      transformedDocuments = transformedDocuments.filter((d: any) => d.redFlagBand === redFlagBand);
    }
    if (from) {
      transformedDocuments = transformedDocuments.filter((d: any) => d.createdAt && d.createdAt >= from);
    }
    if (to) {
      transformedDocuments = transformedDocuments.filter((d: any) => d.createdAt && d.createdAt <= to);
    }

    res.json({
      entities: transformedEntities,
      documents: transformedDocuments
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
    const events = statsRepository.getTimelineEvents();
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

// Get all images with filtering and sorting
app.get('/api/media/images', async (req, res, next) => {
  try {
    const filter: any = {};
    const sort: any = {};
    
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
    
    if (req.query.sortField) {
      sort.field = req.query.sortField as string;
    }
    if (req.query.sortOrder) {
      sort.order = req.query.sortOrder as 'asc' | 'desc';
    }
    
    const images = mediaService.getAllImages(filter, sort);
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
    const p = ((image as any).path || (image as any).file_path || '').toString();
    if (!p) {
      return res.status(404).json({ error: 'Image path missing' });
    }
    
    // Since all real data is in /data, we'll resolve paths relative to that
    let absPath = p;
    
    if (p.startsWith('/data/')) {
      // For paths starting with /data/, resolve relative to current working directory
      // Must remove leading slash for path.join to append correctly
      absPath = path.join(process.cwd(), p.substring(1));
    } else if (p.startsWith('data/')) {
      // For paths starting with data/, resolve relative to current working directory
      absPath = path.join(process.cwd(), p);
    } else if (path.isAbsolute(p)) {
      // Absolute paths (like from new ingestion) that don't start with /data/
      absPath = p;
    } else {
      // For other paths, assume they're relative to the data directory
      absPath = path.join(process.cwd(), 'data', p);
    }
    
    if (!fs.existsSync(absPath)) {
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
    const p = ((image as any).path || (image as any).file_path || '').toString();
    if (!p) {
      return res.status(404).json({ error: 'Image path missing' });
    }
    
    // Since all real data is in /data, we'll resolve paths relative to that
    let absPath = p;
    
    if (p.startsWith('/data/')) {
      absPath = path.join(process.cwd(), p.substring(1));
    } else if (p.startsWith('data/')) {
      absPath = path.join(process.cwd(), p);
    } else if (path.isAbsolute(p)) {
      absPath = p;
    } else {
      absPath = path.join(process.cwd(), 'data', p);
    }
    
    if (!fs.existsSync(absPath)) {
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
    const thumbnailPath = ((image as any).thumbnail_path || '').toString();
    let absPath = '';
    
    if (thumbnailPath && thumbnailPath.includes('thumbnails')) {
      // Use the thumbnail
      if (thumbnailPath.startsWith('/data/')) {
        absPath = path.join(process.cwd(), thumbnailPath.substring(1));
      } else if (thumbnailPath.startsWith('data/')) {
        absPath = path.join(process.cwd(), thumbnailPath);
      } else if (path.isAbsolute(thumbnailPath)) {
        absPath = thumbnailPath;
      } else {
        absPath = path.join(process.cwd(), 'data', thumbnailPath);
      }
    }
    
    // Fall back to original image if thumbnail doesn't exist
    if (!absPath || !fs.existsSync(absPath)) {
      const p = ((image as any).path || (image as any).file_path || '').toString();
      let fallbackPath = '';
      
      if (p.startsWith('/data/')) {
        fallbackPath = path.join(process.cwd(), p.substring(1));
      } else if (p.startsWith('data/')) {
        fallbackPath = path.join(process.cwd(), p);
      } else if (path.isAbsolute(p)) {
        fallbackPath = p;
      } else {
        fallbackPath = path.join(process.cwd(), 'data', p);
      }
      absPath = fallbackPath;
    }
    
    if (!absPath || !fs.existsSync(absPath)) {
      return res.status(404).json({ error: 'Thumbnail not found' });
    }
    
    // Set cache headers for thumbnails
    res.set({
      'Cache-Control': 'public, max-age=31536000',
      'Content-Type': 'image/jpeg'
    });
    res.sendFile(absPath);
  } catch (error) {
    next(error);
  }
});

// Search images

// Update image metadata (Admin only)
app.put('/api/media/images/:id', authenticateRequest, requireRole('admin'), async (req, res, next) => {
  try {
    const imageId = parseInt(req.params.id);
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
});

// Rotate image (Admin only)
app.put('/api/media/images/:id/rotate', authenticateRequest, requireRole('admin'), async (req, res, next) => {
  try {
    const imageId = parseInt(req.params.id);
    const direction = req.body.direction === 'left' ? -90 : 90; // Default to right/clockwise
    
    if (isNaN(imageId)) {
      return res.status(400).json({ error: 'Invalid image ID' });
    }
    
    const image = mediaService.getImageById(imageId);
    if (!image) {
      return res.status(404).json({ error: 'Image not found' });
    }
    
    // Calculate new orientation based on current EXIF orientation
    // Standard EXIF Orientations:
    // 1: Normal (0 deg)
    // 3: 180 deg
    // 6: 90 deg CW
    // 8: 90 deg CCW (270 deg CW)
    
    let currentOrientation = image.orientation || 1;
    let newOrientation = 1;

    // Simple state machine for rotation
    // 1 -> (CW) -> 6 -> (CW) -> 3 -> (CW) -> 8 -> (CW) -> 1
    // 1 -> (CCW) -> 8 -> (CCW) -> 3 -> (CCW) -> 6 -> (CCW) -> 1
    
    if (direction === 90) { // Clockwise
      switch (currentOrientation) {
        case 1: newOrientation = 6; break;
        case 6: newOrientation = 3; break;
        case 3: newOrientation = 8; break;
        case 8: newOrientation = 1; break;
        default: newOrientation = 6; // Reset to 90 if unknown
      }
    } else { // Counter-clockwise
      switch (currentOrientation) {
        case 1: newOrientation = 8; break;
        case 8: newOrientation = 3; break;
        case 3: newOrientation = 6; break;
        case 6: newOrientation = 1; break;
        default: newOrientation = 8; // Reset to 270 if unknown
      }
    }
    
    // Save new orientation
    mediaService.updateImage(imageId, { orientation: newOrientation });
    
    // Regenerate thumbnail with new orientation
    const thumbnailDir = path.dirname((image as any).thumbnail_path || image.thumbnailPath || path.join(path.dirname(image.path), 'thumbnails'));
    // Ensure we have a valid thumbnail directory. If image.thumbnail_path exists, use its dir. 
    // If not, assume 'thumbnails' subdir of image path (standard structure)
    
    try {
      await mediaService.generateThumbnail(
        image.path, 
        thumbnailDir, 
        { force: true, orientation: newOrientation }
      );
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
});

// Delete image (Admin only)
app.delete('/api/media/images/:id', authenticateRequest, requireRole('admin'), async (req, res, next) => {
  try {
    const imageId = parseInt(req.params.id);
    if (isNaN(imageId)) {
      return res.status(400).json({ error: 'Invalid image ID' });
    }
    
    mediaService.deleteImage(imageId);
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting image:', error);
    next(error);
  }
});

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
    const db = getDb();
    const tags = db.prepare('SELECT * FROM tags ORDER BY name ASC').all();
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
    const result = db.prepare('INSERT INTO tags (name, color) VALUES (?, ?)').run(
      name.trim(),
      color || '#6366f1'
    );
    
    res.status(201).json({ id: result.lastInsertRowid, name: name.trim(), color: color || '#6366f1' });
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
    const tagId = parseInt(req.params.id);
    if (isNaN(tagId)) return res.status(400).json({ error: 'Invalid tag ID' });
    
    const db = getDb();
    const result = db.prepare('DELETE FROM tags WHERE id = ?').run(tagId);
    
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
    const imageId = parseInt(req.params.id);
    if (isNaN(imageId)) return res.status(400).json({ error: 'Invalid image ID' });
    
    const db = getDb();
    const tags = db.prepare(`
      SELECT t.* FROM tags t
      JOIN media_tags mt ON t.id = mt.tag_id
      WHERE mt.media_id = ?
      ORDER BY t.name ASC
    `).all(imageId);
    
    res.json(tags);
  } catch (error) {
    console.error('Error fetching image tags:', error);
    next(error);
  }
});

// Add tag to image
app.post('/api/media/images/:id/tags', authenticateRequest, async (req, res, next) => {
  try {
    const imageId = parseInt(req.params.id);
    const { tagId } = req.body;
    
    if (isNaN(imageId) || !tagId) return res.status(400).json({ error: 'Invalid image or tag ID' });
    
    const db = getDb();
    db.prepare('INSERT OR IGNORE INTO media_tags (media_id, tag_id) VALUES (?, ?)').run(imageId, tagId);
    
    res.json({ success: true });
  } catch (error) {
    console.error('Error adding tag to image:', error);
    next(error);
  }
});

// Remove tag from image
app.delete('/api/media/images/:id/tags/:tagId', authenticateRequest, async (req, res, next) => {
  try {
    const imageId = parseInt(req.params.id);
    const tagId = parseInt(req.params.tagId);
    
    if (isNaN(imageId) || isNaN(tagId)) return res.status(400).json({ error: 'Invalid IDs' });
    
    const db = getDb();
    db.prepare('DELETE FROM media_tags WHERE media_id = ? AND tag_id = ?').run(imageId, tagId);
    
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
    const imageId = parseInt(req.params.id);
    if (isNaN(imageId)) return res.status(400).json({ error: 'Invalid image ID' });
    
    const db = getDb();
    const people = db.prepare(`
      SELECT e.id, e.full_name as name, e.primary_role as role, e.red_flag_rating as redFlagRating
      FROM entities e
      JOIN media_people mp ON e.id = mp.entity_id
      WHERE mp.media_id = ?
      ORDER BY e.full_name ASC
    `).all(imageId);
    
    res.json(people);
  } catch (error) {
    console.error('Error fetching image people:', error);
    next(error);
  }
});

// Add person to image
app.post('/api/media/images/:id/people', authenticateRequest, async (req, res, next) => {
  try {
    const imageId = parseInt(req.params.id);
    const { entityId } = req.body;
    
    if (isNaN(imageId) || !entityId) return res.status(400).json({ error: 'Invalid image or entity ID' });
    
    const db = getDb();
    db.prepare('INSERT OR IGNORE INTO media_people (media_id, entity_id) VALUES (?, ?)').run(imageId, entityId);
    
    res.json({ success: true });
  } catch (error) {
    console.error('Error adding person to image:', error);
    next(error);
  }
});

// Remove person from image
app.delete('/api/media/images/:id/people/:entityId', authenticateRequest, async (req, res, next) => {
  try {
    const imageId = parseInt(req.params.id);
    const entityId = parseInt(req.params.entityId);
    
    if (isNaN(imageId) || isNaN(entityId)) return res.status(400).json({ error: 'Invalid IDs' });
    
    const db = getDb();
    db.prepare('DELETE FROM media_people WHERE media_id = ? AND entity_id = ?').run(imageId, entityId);
    
    res.json({ success: true });
  } catch (error) {
    console.error('Error removing person from image:', error);
    next(error);
  }
});

// Error handling middleware (must be last)
app.use(globalErrorHandler);

// SPA fallback to index.html for non-API routes
app.get('*', async (req, res, next) => {
  if (req.path.startsWith('/api/')) return next();
  
  const indexFile = path.join(distPath, 'index.html');
  if (fs.existsSync(indexFile)) {
    // Check if we need to inject Open Graph tags for deep links
    const photoId = req.query.photoId;
    
    if (photoId) {
      try {
        const id = parseInt(photoId as string);
        if (!isNaN(id)) {
          const image = mediaService.getImageById(id);
          if (image) {
            let html = fs.readFileSync(indexFile, 'utf8');
            const baseUrl = `${req.protocol}://${req.get('host')}`;
            const imageUrl = `${baseUrl}/api/media/images/${id}/thumbnail?v=${new Date(image.dateModified || image.dateAdded || 0).getTime()}`;
            const title = image.title || image.filename;
            const description = image.description || `Photo from Epstein Archive - ${image.filename}`;
            
            // Generate OG Tags
            const ogTags = `
              <!-- Dynamic Open Graph Tags -->
              <meta property="og:title" content="${title.replace(/"/g, '&quot;')}" />
              <meta property="og:description" content="${description.replace(/"/g, '&quot;')}" />
              <meta property="og:image" content="${imageUrl}" />
              <meta property="og:type" content="website" />
              <meta property="og:url" content="${baseUrl}${req.originalUrl}" />
              <meta name="twitter:card" content="summary_large_image" />
              <meta name="twitter:title" content="${title.replace(/"/g, '&quot;')}" />
              <meta name="twitter:description" content="${description.replace(/"/g, '&quot;')}" />
              <meta name="twitter:image" content="${imageUrl}" />
            `;
            
            // Replace default tags
            // We look for the block starting with our comment and ending with the last twitter tag
            const defaultTagsRegex = /<!-- Default Open Graph Tags -->[\s\S]*?<meta name="twitter:image" content=".*?" \/>/;
            if (defaultTagsRegex.test(html)) {
                html = html.replace(defaultTagsRegex, ogTags);
            } else {
                // Fallback: append to head if regex fails (shouldn't happen if index.html is synced)
                html = html.replace('</head>', `${ogTags}</head>`);
            }
            
            return res.send(html);
          }
        }
      } catch (err) {
        console.error('Error injecting OG tags:', err);
        // Fallback to sending file normally
      }
    }
    
    res.sendFile(indexFile);
  } else {
    next();
  }
});

// Graceful shutdown handling
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully');
  process.exit(0);
});

// Start server
// Ensure migrations are run before starting
try {
  validateStartup();
  runMigrations();
} catch (err) {
  console.error('Failed to run migrations:', err);
  // Continue anyway? Or exit? For now, log and continue as per plan to be robust.
}

const server = app.listen(config.apiPort, () => {
  console.log(`🚀 Production API server running on port ${config.apiPort}`);
  console.log(`📊 Environment: ${config.nodeEnv}`);
});

export default server;
