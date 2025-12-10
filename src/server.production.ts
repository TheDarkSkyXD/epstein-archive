import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { databaseService } from './services/DatabaseService.js';
import { InvestigationService } from './services/InvestigationService.js';
import { MediaService } from './services/MediaService.js';
import investigationEvidenceRoutes from './routes/investigationEvidenceRoutes.js';
import crypto from 'crypto';
import multer from 'multer';
import fs from 'fs';
import pdf from 'pdf-parse';
import { SearchFilters, SortOption } from './types';
import { config } from './config/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const mediaService = new MediaService(config.databaseUrl);

// Basic middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Mount specialized routes
app.use('/api/investigation', investigationEvidenceRoutes);

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
const localDocsBase = '/Users/veland/Downloads/Epstein Files/Epstein Estate Documents - Seventh Production';
try {
  if (fs.existsSync(localDocsBase)) {
    app.use('/files', express.static(localDocsBase));
  }
} catch {}

// Health check endpoint
app.get('/api/health', (_req, res) => {
  const healthCheck = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    database: databaseService.isInitialized() ? 'connected' : 'not_initialized',
    memory: process.memoryUsage(),
    environment: config.nodeEnv,
  };
  
  res.status(200).json(healthCheck);
});

// Readiness check for Kubernetes/Docker
app.get('/api/ready', (_req, res) => {
  if (databaseService.isInitialized()) {
    res.status(200).json({ status: 'ready' });
  } else {
    res.status(503).json({ status: 'not_ready', reason: 'database_not_initialized' });
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

    const result = await databaseService.getEntities(page, limit, filters, sortBy as SortOption);

    // Transform the result to match the expected format
    const transformedData = result.entities.map((entity: any) => ({
      id: entity.id,
      name: entity.fullName,
      fullName: entity.fullName,
      entity_type: entity.entityType || 'Person',
      primaryRole: entity.primaryRole,
      secondaryRoles: entity.secondaryRoles || [],
      mentions: entity.mentions,
      files: entity.files || entity.documentCount || (entity.fileReferences ? entity.fileReferences.length : 0),
      contexts: entity.contexts || [],
      evidence_types: entity.evidence_types || entity.evidenceTypes || [],
      evidenceTypes: entity.evidence_types || entity.evidenceTypes || [],
      spicy_passages: entity.spicyPassages || [],
      likelihood_score: entity.likelihoodLevel,
      red_flag_score: entity.redFlagScore !== undefined ? entity.redFlagScore : entity.spiceScore,
      red_flag_rating: entity.redFlagRating !== undefined ? entity.redFlagRating : entity.spiceRating,
      red_flag_peppers: entity.redFlagRating !== undefined ? '🚩'.repeat(entity.redFlagRating) : (entity.spiceRating !== undefined ? '🚩'.repeat(entity.spiceRating) : '🏳️'),
      red_flag_description: entity.redFlagDescription || entity.spiceDescription || `Red Flag Index ${entity.redFlagRating !== undefined ? entity.redFlagRating : (entity.spiceRating || 0)}`,
      connectionsToEpstein: entity.connectionsSummary || ''
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

// Get single entity with error handling
app.get('/api/entities/:id', async (req, res, next) => {
  try {
    const entityId = req.params.id;
    
    // Validate ID format
    if (!/^\d+$/.test(entityId)) {
      return res.status(400).json({ error: 'Invalid entity ID format' });
    }
    
    const entity = await databaseService.getEntityById(entityId);
    
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
      red_flag_score: entity.redFlagScore !== undefined ? entity.redFlagScore : entity.spiceScore,
      red_flag_rating: entity.redFlagRating !== undefined ? entity.redFlagRating : entity.spiceRating,
      red_flag_peppers: entity.redFlagRating !== undefined ? '🚩'.repeat(entity.redFlagRating) : (entity.spiceRating !== undefined ? '🚩'.repeat(entity.spiceRating) : '🏳️'),
      red_flag_description: entity.redFlagDescription || entity.spiceDescription || `Red Flag Index ${entity.redFlagRating !== undefined ? entity.redFlagRating : (entity.spiceRating || 0)}`,
      connectionsToEpstein: entity.connectionsSummary || '',
      fileReferences: entity.fileReferences || [],
      timelineEvents: entity.timelineEvents || [],
      networkConnections: entity.networkConnections || []
    };

    res.json(transformedEntity);
  } catch (error) {
    console.error('Error fetching entity:', error);
    next(error);
  }
});

// Get database// Get all articles
app.get('/api/articles', async (_req, res, next) => {
  try {
    const articles = await databaseService.getArticles();
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
    const entity = databaseService.getDatabase().prepare('SELECT name FROM entities WHERE id = ?').get(entityId) as { name: string };
    
    if (!entity) {
         return res.json({ data: [], total: 0, page, pageSize: limit, totalPages: 0 });
    }

    // Query documents that mention this entity (using simple name search)
    const offset = (page - 1) * limit;
    const searchTerm = `%${entity.name}%`;

    const query = `
      SELECT 
        d.id,
        d.title as fileName,
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
        d.md5_hash as contentHash,
        d.title,
        0 as entityMentions
      FROM documents d
      WHERE d.content LIKE ? OR d.title LIKE ?
      ORDER BY d.red_flag_rating DESC
      LIMIT ? OFFSET ?
    `;
    
    const countQuery = `
      SELECT COUNT(*) as total
      FROM documents d
      WHERE d.content LIKE ? OR d.title LIKE ?
    `;
    
    const documents = databaseService.getDatabase().prepare(query).all(searchTerm, searchTerm, limit, offset) as any[];
    const totalResult = databaseService.getDatabase().prepare(countQuery).get(searchTerm, searchTerm) as { total: number };
    
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
    
    const entries = databaseService.getBlackBookEntries(filters);
    
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
    const stats = await databaseService.getStatistics();
    res.json(stats);
  } catch (error) {
    console.error('Error fetching statistics:', error);
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
      whereConditions.push('(title LIKE ? OR content LIKE ? OR file_name LIKE ?)');
      const searchPattern = `%${search}%`;
      params.push(searchPattern, searchPattern, searchPattern);
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
        orderByClause += 'title ASC';
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
        title as fileName,
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
        '' as contentHash,
        title,
        parent_document_id as parentDocumentId,
        thread_id as threadId,
        thread_position as threadPosition
      FROM documents
      ${whereClause}
      ORDER BY dateCreated DESC
      LIMIT ? OFFSET ?
    `;
    
    // Use simple count
    const countQuery = `SELECT COUNT(*) as total FROM documents ${whereClause}`;
    
    params.push(limit, offset);
    // Use try-catch for the query itself to catch column errors specifically
    const documents = databaseService.getDatabase().prepare(query).all(...params) as any[];
    
    // Remove limit/offset for count query
    const countParams = params.slice(0, -2);
    const totalResult = databaseService.getDatabase().prepare(countQuery).get(...countParams) as { total: number };
    
    res.json({
      data: documents,
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
    const doc = await databaseService.getDocumentById(id);
    if (!doc) {
      return res.status(404).json({ error: 'not_found' });
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
    const pages = await databaseService.getDocumentPages(id);
    res.json(pages);
  } catch (error) {
    console.error('Error fetching document pages:', error);
    next(error);
  }
});

// Get original file for a document (images, PDFs, etc.)
app.get('/api/documents/:id/file', async (req, res, next) => {
  try {
    const id = req.params.id as string;
    const doc = await databaseService.getDocumentById(id);
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

    const result = await databaseService.search(query, limit);

    // Filter by Red Flag Index range
    const filteredEntities = result.entities.filter((entity: any) => {
      const redFlagRating = entity.redFlagRating || entity.spiceRating || 0;
      return redFlagRating >= redFlagMin && redFlagRating <= redFlagMax;
    });

    // Transform entities to match expected API format with Red Flag Index
    const transformedEntities = filteredEntities.map((entity: any) => {
      const redFlagRating = entity.redFlagRating || entity.spiceRating || 0;
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
        red_flag_score: entity.redFlagScore !== undefined ? entity.redFlagScore : entity.spiceScore,
        red_flag_rating: redFlagRating,
        red_flag_peppers: redFlagRating !== undefined ? redFlagIndicators.repeat(redFlagRating) : '🏳️',
        red_flag_description: redFlagDescriptions[redFlagRating] || entity.spiceDescription || 'No Red Flags',
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

    const result = await databaseService.search(query, limit);

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
      red_flag_score: entity.redFlagScore !== undefined ? entity.redFlagScore : entity.spiceScore,
      red_flag_rating: entity.redFlagRating !== undefined ? entity.redFlagRating : entity.spiceRating,
      red_flag_peppers: entity.redFlagRating !== undefined ? '🚩'.repeat(entity.redFlagRating) : (entity.spiceRating !== undefined ? '🚩'.repeat(entity.spiceRating) : '🏳️'),
      red_flag_description: entity.redFlagDescription || entity.spiceDescription || `Red Flag Index ${entity.redFlagRating !== undefined ? entity.redFlagRating : (entity.spiceRating || 0)}`,
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
      transformedDocuments = transformedDocuments.filter(d => (d.evidenceType || '').toLowerCase() === evidenceType.toLowerCase());
    }
    if (redFlagBand) {
      transformedDocuments = transformedDocuments.filter(d => d.redFlagBand === redFlagBand);
    }
    if (from) {
      transformedDocuments = transformedDocuments.filter(d => d.createdAt && d.createdAt >= from);
    }
    if (to) {
      transformedDocuments = transformedDocuments.filter(d => d.createdAt && d.createdAt <= to);
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
    const stats = await databaseService.getStatistics();
    res.json(stats);
  } catch (error) {
    console.error('Error fetching analytics:', error);
    next(error);
  }
});

// Get timeline events
app.get('/api/timeline', async (_req, res, next) => {
  try {
    const events = await databaseService.getTimelineEvents();
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
      absPath = path.join(process.cwd(), p);
    } else if (p.startsWith('data/')) {
      // For paths starting with data/, resolve relative to current working directory
      absPath = path.join(process.cwd(), p);
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
        absPath = path.join(process.cwd(), thumbnailPath);
      } else if (thumbnailPath.startsWith('data/')) {
        absPath = path.join(process.cwd(), thumbnailPath);
      } else {
        absPath = path.join(process.cwd(), 'data', thumbnailPath);
      }
    }
    
    // Fall back to original image if thumbnail doesn't exist
    if (!absPath || !fs.existsSync(absPath)) {
      const p = ((image as any).path || (image as any).file_path || '').toString();
      if (p.startsWith('/data/')) {
        absPath = path.join(process.cwd(), p);
      } else if (p.startsWith('data/')) {
        absPath = path.join(process.cwd(), p);
      } else {
        absPath = path.join(process.cwd(), 'data', p);
      }
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

// Error handling middleware (must be last)
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

// SPA fallback to index.html for non-API routes
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api/')) return next();
  const indexFile = path.join(distPath, 'index.html');
  if (fs.existsSync(indexFile)) {
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
const server = app.listen(config.apiPort, () => {
  console.log(`🚀 Production API server running on port ${config.apiPort}`);
  console.log(`📊 Environment: ${config.nodeEnv}`);
});

export default server;
app.get('/api/stats/relationships', async (_req, res, next) => {
  try {
    const stats = await databaseService.getRelationshipStats();
    res.json(stats);
  } catch (error) {
    next(error);
  }
});

app.get('/api/stats/enrichment', async (_req, res, next) => {
  try {
    const stats = await databaseService.getEnrichmentStats();
    res.json(stats);
  } catch (error) {
    next(error);
  }
});

app.get('/api/stats/aliases', async (_req, res, next) => {
  try {
    const stats = await databaseService.getAliasStats();
    res.json(stats);
  } catch (error) {
    next(error);
  }
});

app.get('/api/jobs', async (req, res, next) => {
  try {
    const jobType = req.query.jobType as string | undefined;
    const status = req.query.status as string | undefined;
    const jobs = await databaseService.listJobs(jobType, status);
    res.json({ data: jobs });
  } catch (error) {
    next(error);
  }
});

app.get('/api/relationships', async (req, res, next) => {
  try {
    const entityId = parseInt(req.query.entityId as string);
    if (isNaN(entityId)) {
      return res.status(400).json({ error: 'entityId is required' });
    }
    const minWeight = req.query.minWeight ? Number(req.query.minWeight) : undefined;
    const minConfidence = req.query.minConfidence ? Number(req.query.minConfidence) : undefined;
    const from = req.query.from as string | undefined;
    const to = req.query.to as string | undefined;
    const includeBreakdown = (req.query.includeBreakdown as string | undefined) === 'true';
    const data = await databaseService.getRelationships(entityId, { minWeight, minConfidence, from, to, includeBreakdown });
    res.json({ relationships: data });
  } catch (error) {
    next(error);
  }
});

app.get('/api/graph', async (req, res, next) => {
  try {
    const entityId = parseInt(req.query.entityId as string);
    if (isNaN(entityId)) {
      return res.status(400).json({ error: 'entityId is required' });
    }
    const depth = req.query.depth ? parseInt(req.query.depth as string) : 2;
    const from = req.query.from as string | undefined;
    const to = req.query.to as string | undefined;
    const { nodes, edges } = await databaseService.getGraphSlice(entityId, depth, { from, to });
    res.json({ nodes, edges });
  } catch (error) {
    next(error);
  }
});

app.post('/api/entities/:id/summary-source', async (req, res, next) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ error: 'Invalid entity ID' });
    const top = req.body?.topN ? parseInt(String(req.body.topN)) : 10;
    const data = await databaseService.getEntitySummarySource(id, isNaN(top) ? 10 : top);
    res.json(data);
  } catch (error) {
    next(error);
  }
});
const invService = new InvestigationService(databaseService.getDatabase());
const upload = multer({ dest: 'uploads/' });
app.get('/api/investigations', async (req, res, next) => {
  try {
    const { status, ownerId, page, limit } = req.query as any;
    const result = await invService.getInvestigations({ status, ownerId, page: page ? parseInt(page) : undefined, limit: limit ? parseInt(limit) : undefined });
    res.json(result);
  } catch (e) { next(e); }
});

app.post('/api/investigations', async (req, res, next) => {
  try {
    const { title, description, ownerId, scope, collaboratorIds } = req.body;
    if (!title || !ownerId) return res.status(400).json({ error: 'Validation failed', details: 'title and ownerId are required' });
    const inv = await invService.createInvestigation({ title, description, ownerId, scope, collaboratorIds });
    res.status(201).json(inv);
  } catch (e) { next(e); }
});

// Get investigation by ID or UUID (for shareable URLs)
app.get('/api/investigations/:idOrUuid', async (req, res, next) => {
  try {
    const param = req.params.idOrUuid;
    let inv;
    
    // Check if param is numeric ID or UUID string
    const numericId = parseInt(param);
    if (!isNaN(numericId) && param === numericId.toString()) {
      inv = await invService.getInvestigationById(numericId);
    } else {
      // Treat as UUID
      inv = await invService.getInvestigationByUuid(param);
    }
    
    if (!inv) return res.status(404).json({ error: 'Investigation not found' });
    res.json(inv);
  } catch (e) { next(e); }
});

app.patch('/api/investigations/:id', async (req, res, next) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ error: 'Invalid investigation ID' });
    const { title, description, scope, status, collaboratorIds } = req.body;
    const inv = await invService.updateInvestigation(id, { title, description, scope, status, collaboratorIds });
    if (!inv) return res.status(404).json({ error: 'Investigation not found' });
    res.json(inv);
  } catch (e) { next(e); }
});

app.delete('/api/investigations/:id', async (req, res, next) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ error: 'Invalid investigation ID' });
    const ok = await invService.deleteInvestigation(id);
    if (!ok) return res.status(404).json({ error: 'Investigation not found' });
    res.status(204).send();
  } catch (e) { next(e); }
});

app.post('/api/upload-document', upload.single('file'), async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'file_missing' });
    const f = req.file;
    const buf = await (await import('fs')).promises.readFile(f.path);
    const hash = crypto.createHash('sha256').update(buf).digest('hex');
    const db = databaseService.getDatabase();
    // Corrected INSERT to use 'title' instead of 'file_name' and valid columns
    const stmt = db.prepare(`INSERT INTO documents (title, file_path, file_type, file_size, date_created, content, metadata_json, word_count, red_flag_rating, md5_hash) VALUES (@title,@file_path,@file_type,@file_size,@date_created,@content,@metadata_json,@word_count,@red_flag_rating,@md5_hash)`);
    
    const meta = JSON.stringify({ 
        source_collection: 'uploads', 
        source_original_filename: f.originalname 
    });
    
    const result = stmt.run({ 
        title: f.originalname, 
        file_path: f.path, 
        file_type: f.mimetype, 
        file_size: f.size, 
        date_created: new Date().toISOString(), 
        content: '', 
        metadata_json: meta, 
        word_count: 0, 
        red_flag_rating: 0, 
        md5_hash: hash 
    });
    
    res.status(201).json({ id: result.lastInsertRowid, fileName: f.originalname });
  } catch (e) { next(e); }
});

app.get('/api/investigations/:id/evidence', async (req, res, next) => {
  try {
    const id = parseInt(req.params.id);
    const db = databaseService.getDatabase();
    const rows = db.prepare('SELECT * FROM investigation_evidence WHERE investigation_id = ? ORDER BY id DESC').all(id) as any[];
    res.json(rows);
  } catch (e) { next(e); }
});

// Get financial transactions for an investigation
app.get('/api/investigations/:id/transactions', async (req, res, next) => {
  try {
    const id = parseInt(req.params.id);
    const { riskLevel, type, minAmount, maxAmount } = req.query;
    const db = databaseService.getDatabase();
    
    let query = 'SELECT * FROM financial_transactions WHERE investigation_id = ?';
    const params: any[] = [id];
    
    if (riskLevel && riskLevel !== 'all') {
      query += ' AND risk_level = ?';
      params.push(riskLevel);
    }
    if (type && type !== 'all') {
      query += ' AND transaction_type = ?';
      params.push(type);
    }
    if (minAmount) {
      query += ' AND amount >= ?';
      params.push(parseFloat(minAmount as string));
    }
    if (maxAmount) {
      query += ' AND amount <= ?';
      params.push(parseFloat(maxAmount as string));
    }
    
    query += ' ORDER BY amount DESC';
    
    const rows = db.prepare(query).all(...params) as any[];
    
    // Parse JSON fields
    const transactions = rows.map(row => ({
      ...row,
      suspiciousIndicators: row.suspicious_indicators ? JSON.parse(row.suspicious_indicators) : [],
      sourceDocumentIds: row.source_document_ids ? JSON.parse(row.source_document_ids) : []
    }));
    
    res.json(transactions);
  } catch (e) { next(e); }
});

// Get all financial transactions (for global financial analysis)
app.get('/api/financial/transactions', async (req, res, next) => {
  try {
    const { riskLevel, limit } = req.query;
    const db = databaseService.getDatabase();
    
    let query = 'SELECT * FROM financial_transactions';
    const params: any[] = [];
    
    if (riskLevel && riskLevel !== 'all') {
      query += ' WHERE risk_level = ?';
      params.push(riskLevel);
    }
    
    query += ' ORDER BY amount DESC';
    
    if (limit) {
      query += ' LIMIT ?';
      params.push(parseInt(limit as string));
    }
    
    const rows = db.prepare(query).all(...params) as any[];
    
    const transactions = rows.map(row => ({
      ...row,
      suspiciousIndicators: row.suspicious_indicators ? JSON.parse(row.suspicious_indicators) : [],
      sourceDocumentIds: row.source_document_ids ? JSON.parse(row.source_document_ids) : []
    }));
    
    res.json(transactions);
  } catch (e) { next(e); }
});

// Get hypotheses for an investigation
app.get('/api/investigations/:id/hypotheses', async (req, res, next) => {
  try {
    const id = parseInt(req.params.id);
    const db = databaseService.getDatabase();
    const rows = db.prepare('SELECT * FROM investigation_hypotheses WHERE investigation_id = ? ORDER BY confidence DESC').all(id) as any[];
    res.json(rows);
  } catch (e) { next(e); }
});

// Create a new hypothesis
app.post('/api/investigations/:id/hypotheses', async (req, res, next) => {
  try {
    const id = parseInt(req.params.id);
    const { title, description, status, confidence } = req.body;
    const db = databaseService.getDatabase();
    const stmt = db.prepare('INSERT INTO investigation_hypotheses (investigation_id, title, description, status, confidence) VALUES (?,?,?,?,?)');
    const result = stmt.run(id, title, description || '', status || 'proposed', confidence || 50);
    res.status(201).json({ id: result.lastInsertRowid });
  } catch (e) { next(e); }
});

// Update a hypothesis
app.patch('/api/investigations/:invId/hypotheses/:hypId', async (req, res, next) => {
  try {
    const hypId = parseInt(req.params.hypId);
    const { title, description, status, confidence } = req.body;
    const db = databaseService.getDatabase();
    const existing = db.prepare('SELECT * FROM investigation_hypotheses WHERE id = ?').get(hypId) as any;
    if (!existing) return res.status(404).json({ error: 'Hypothesis not found' });
    
    const stmt = db.prepare('UPDATE investigation_hypotheses SET title = ?, description = ?, status = ?, confidence = ?, updated_at = ? WHERE id = ?');
    stmt.run(
      title || existing.title,
      description || existing.description,
      status || existing.status,
      confidence !== undefined ? confidence : existing.confidence,
      new Date().toISOString(),
      hypId
    );
    res.json({ id: hypId, ...existing, title: title || existing.title, description: description || existing.description, status: status || existing.status, confidence: confidence !== undefined ? confidence : existing.confidence });
  } catch (e) { next(e); }
});

app.post('/api/investigations/:id/evidence', async (req, res, next) => {
  try {
    const id = parseInt(req.params.id);
    const { documentId, title, description } = req.body;
    const db = databaseService.getDatabase();
    const stmt = db.prepare('INSERT INTO evidence_items (investigation_id, document_id, title, type, source_id, source, description, relevance, credibility, extracted_at, extracted_by, authenticity_score, hash, sensitivity) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)');
    const result = stmt.run(id, documentId || null, title || '', 'document', documentId || '', '', description || '', 'high', 'verified', new Date().toISOString(), 'system', null, null, 'public');
    const evId = Number(result.lastInsertRowid);
    db.prepare('INSERT INTO chain_of_custody (evidence_id, date, actor, action, notes) VALUES (?,?,?,?,?)').run(evId, new Date().toISOString(), 'system', 'acquired', 'Initial upload');
    res.status(201).json({ id: result.lastInsertRowid });
  } catch (e) { next(e); }
});

app.get('/api/evidence/:id/custody', async (req, res, next) => {
  try {
    const id = parseInt(req.params.id);
    const rows = databaseService.getDatabase().prepare('SELECT id, evidence_id, date, actor, action, notes, signature FROM chain_of_custody WHERE evidence_id = ? ORDER BY date ASC').all(id) as any[];
    res.json(rows);
  } catch (e) { next(e); }
});

app.get('/api/evidence/:id/custody/report', async (req, res, next) => {
  try {
    const id = parseInt(req.params.id);
    const rows = databaseService.getDatabase().prepare('SELECT id, date, actor, action, notes FROM chain_of_custody WHERE evidence_id = ? ORDER BY date ASC').all(id) as any[];
    const lines = rows.map(r => `${r.date} | ${r.actor} | ${r.action} | ${r.notes || ''}`);
    res.setHeader('Content-Type', 'text/plain');
    res.send(lines.join('\n'));
  } catch (e) { next(e); }
});

app.get('/api/evidence/:id/custody/report.csv', async (req, res, next) => {
  try {
    const id = parseInt(req.params.id);
    const rows = databaseService.getDatabase().prepare('SELECT id, date, actor, action, notes FROM chain_of_custody WHERE evidence_id = ? ORDER BY date ASC').all(id) as any[];
    const csv = ['id,date,actor,action,notes', ...rows.map(r => `${r.id},"${r.date}","${(r.actor||'').replace(/"/g,'""')}","${(r.action||'').replace(/"/g,'""')}","${(r.notes||'').replace(/"/g,'""')}"`)].join('\n');
    res.setHeader('Content-Type', 'text/csv');
    res.send(csv);
  } catch (e) { next(e); }
});

app.get('/api/evidence/:id/custody/report.html', async (req, res, next) => {
  try {
    const id = parseInt(req.params.id);
    const rows = databaseService.getDatabase().prepare('SELECT id, date, actor, action, notes FROM chain_of_custody WHERE evidence_id = ? ORDER BY date ASC').all(id) as any[];
    const items = rows.map(r => `<tr><td>${r.date}</td><td>${r.actor||''}</td><td>${r.action||''}</td><td>${r.notes||''}</td></tr>`).join('');
    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Chain of Custody ${id}</title><style>body{font-family:system-ui,Arial,sans-serif;padding:24px;}table{width:100%;border-collapse:collapse}th,td{border:1px solid #ccc;padding:8px;text-align:left}th{background:#f5f5f5}h1{font-size:18px;margin-bottom:12px}</style></head><body><h1>Chain of Custody #${id}</h1><table><thead><tr><th>Date</th><th>Actor</th><th>Action</th><th>Notes</th></tr></thead><tbody>${items}</tbody></table></body></html>`;
    res.setHeader('Content-Type', 'text/html');
    res.send(html);
  } catch (e) { next(e); }
});

app.post('/api/evidence/:id/custody', async (req, res, next) => {
  try {
    const id = parseInt(req.params.id);
    const { actor, action, notes, signature } = req.body;
    const result = databaseService.getDatabase().prepare('INSERT INTO chain_of_custody (evidence_id, date, actor, action, notes, signature) VALUES (?,?,?,?,?,?)').run(id, new Date().toISOString(), actor || 'system', action || 'analyzed', notes || '', signature || null);
    res.status(201).json({ id: result.lastInsertRowid });
  } catch (e) { next(e); }
});

app.get('/api/investigations/:id/timeline-events', async (req, res, next) => {
  try {
    const id = parseInt(req.params.id);
    const db = databaseService.getDatabase();
    const rows = db.prepare('SELECT * FROM investigation_timeline_events WHERE investigation_id = ? ORDER BY start_date ASC').all(id) as any[];
    res.json(rows);
  } catch (e) { next(e); }
});

app.post('/api/investigations/:id/timeline-events', async (req, res, next) => {
  try {
    const id = parseInt(req.params.id);
    const { title, description, type, startDate, endDate } = req.body;
    const db = databaseService.getDatabase();
    const stmt = db.prepare('INSERT INTO investigation_timeline_events (investigation_id, title, description, type, start_date, end_date) VALUES (?,?,?,?,?,?)');
    const result = stmt.run(id, title || '', description || '', type || 'document', startDate || '', endDate || null);
    res.status(201).json({ id: result.lastInsertRowid });
  } catch (e) { next(e); }
});

// Forensic Analysis Endpoints (Stubbed until schema support for metrics)
app.get('/api/forensic/analyze/:id', async (req, res, next) => {
    res.json({ status: 'not_implemented', message: 'Forensic analysis temporarily disabled pending schema update.' });
});

function computeFKGL(text: string) {
    if (!text) return 0;
  const sentences = text.split(/[.!?]+/).filter(s=>s.trim().length>0).length || 1;
  const wordsArr = (text.match(/\b[\w']+\b/g) || []);
  const words = wordsArr.length || 1;
  // Simplified for stub
  return 0;
}

function simpleSentiment(text: string) {
  const pos = ['good','excellent','positive','beneficial','success','credibility'];
  const neg = ['bad','poor','negative','fraud','crime','risk','issue','problem'];
  const t = text.toLowerCase();
  const score = pos.reduce((s,w)=>s + (t.includes(w)?1:0),0) - neg.reduce((s,w)=>s + (t.includes(w)?1:0),0);
  return score > 1 ? 'positive' : score < -1 ? 'negative' : 'neutral';
}

app.get('/api/forensic/metrics/:id', async (req, res, next) => {
    res.json({ status: 'not_implemented' });
});

app.post('/api/forensic/reindex', async (req, res, next) => {
    res.json({ reindexed: 0 });
});

app.get('/api/forensic/metrics/:id/download', async (req, res, next) => {
    res.status(404).json({ error: 'Not implemented' });
});

app.get('/api/forensic/metrics-summary', async (_req, res, next) => {
  try {
    const db = databaseService.getDatabase();
    const rows = db.prepare('SELECT metrics_json FROM document_forensic_metrics').all() as any[];
    const readability: number[] = [];
    const sentimentCounts: Record<string, number> = { positive: 0, negative: 0, neutral: 0 };
    for (const r of rows) {
      try {
        const m = JSON.parse(r.metrics_json);
        if (m?.linguistic?.readabilityFKGL !== undefined && m.linguistic.readabilityFKGL !== null) readability.push(Number(m.linguistic.readabilityFKGL));
        const s = m?.linguistic?.sentiment || 'neutral';
        if (sentimentCounts[s] === undefined) sentimentCounts[s] = 0;
        sentimentCounts[s]++;
      } catch {}
    }
    readability.sort((a,b)=>a-b);
    const buckets: { range: string; count: number }[] = [];
    const ranges = [-10, 0, 5, 10, 15, 20, 30];
    for (let i=0;i<ranges.length-1;i++) {
      const from = ranges[i];
      const to = ranges[i+1];
      const count = readability.filter(v => v >= from && v < to).length;
      buckets.push({ range: `${from}–${to}`, count });
    }
    res.json({ readabilityBuckets: buckets, sentimentCounts });
  } catch (e) { next(e); }
});

app.get('/api/forensic/metrics-list/top', async (req, res, next) => {
  try {
    const by = (req.query.by as string) || 'js';
    const limit = Math.min(100, Math.max(1, parseInt((req.query.limit as string) || '10')));
    const db = databaseService.getDatabase();
    const rows = db.prepare('SELECT d.id as id, d.file_name as fileName, m.metrics_json as metrics FROM documents d JOIN document_forensic_metrics m ON d.id = m.document_id').all() as any[];
    const ranked = rows.map(r => {
      let val = 0;
      try {
        const m = JSON.parse(r.metrics);
        if (by === 'js') {
          const jsIds = Array.isArray(m?.structural?.jsObjectIds) ? m.structural.jsObjectIds.length : 0;
          const jsFlag = m?.structural?.containsJavascript ? 1 : 0;
          val = jsIds + jsFlag;
        } else if (by === 'density') {
          val = Number(m?.network?.entityDensityPer1000Words || 0);
        } else if (by === 'risk') {
          val = Number(m?.network?.riskScore || 0);
        } else {
          val = 0;
        }
      } catch {}
      return { id: r.id, fileName: r.fileName, score: val };
    }).sort((a,b)=>b.score - a.score).slice(0, limit);
    res.json({ by, limit, data: ranked });
  } catch (e) { next(e); }
});
function extractPdfStructure(filePath: string) {
  try {
    const buf = fs.readFileSync(filePath);
    const txt = buf.toString('latin1');
    const versionMatch = txt.match(/%PDF-(\d\.\d)/);
    const version = versionMatch ? versionMatch[1] : null;
    const containsJavascript = /\/JS\b|\/JavaScript\b/.test(txt);
    const fontCount = (txt.match(/\/Font\b/g) || []).length;
    const jsObjectIds: number[] = [];
    const objRegex = /(\d+)\s+0\s+obj[\s\S]*?endobj/g;
    let m;
    while ((m = objRegex.exec(txt)) !== null) {
      const objText = m[0];
      const id = parseInt(m[1]);
      if (/\/JS\b|\/JavaScript\b/.test(objText)) jsObjectIds.push(id);
    }
    return { pdfVersion: version, containsJavascript, fontCount, jsObjectIds };
  } catch {
    return { pdfVersion: null, containsJavascript: false, fontCount: null, jsObjectIds: [] } as any;
  }
}
