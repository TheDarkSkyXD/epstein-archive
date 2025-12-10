import express from 'express';
import cors from 'cors';
import { databaseService } from './services/DatabaseService';
import { InvestigationService } from './services/InvestigationService';
import { HypothesisService } from './services/HypothesisService';
import { EvidenceLinkService } from './services/EvidenceLinkService';
import { NoteService } from './services/NoteService';
import { TaskService } from './services/TaskService';
import { SearchFilters, SortOption } from './types';
import evidenceRoutes from './routes/evidenceRoutes';
import investigationEvidenceRoutes from './routes/investigationEvidenceRoutes';
import multer from 'multer';
import path from 'path';

import { fileURLToPath } from 'url';

const upload = multer({ dest: 'uploads/' });

const app = express();
const PORT = process.env.API_PORT || 3012;

// Middleware
app.use(cors());
app.use(express.json());

// Initialize services
const db = databaseService.getDatabase();
const investigationService = new InvestigationService(db);
const hypothesisService = new HypothesisService(db);
const evidenceLinkService = new EvidenceLinkService(db);
const noteService = new NoteService(db);
const taskService = new TaskService(db);

// Mount evidence routes
app.use('/api/evidence', evidenceRoutes);

// Mount investigation evidence routes
app.use('/api/investigation', investigationEvidenceRoutes);

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    database: databaseService.isInitialized() ? 'connected' : 'not_initialized'
  });
});

// Get paginated entities
app.get('/api/entities', async (req, res) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 24;
    const search = req.query.search as string;
    const role = req.query.role as string;
    const likelihood = req.query.likelihood as string;
    const sortBy = req.query.sortBy as string;
    const sortOrder = req.query.sortOrder as 'asc' | 'desc';
    const minRedFlagIndex = req.query.minRedFlagIndex ? parseInt(req.query.minRedFlagIndex as string) : undefined;
    const maxRedFlagIndex = req.query.maxRedFlagIndex ? parseInt(req.query.maxRedFlagIndex as string) : undefined;

    const filters: SearchFilters = {
      likelihood: 'all',
      role: 'all',
      status: 'all',
      minMentions: 0
    };
    if (search) filters.searchTerm = search;
    if (role) filters.evidenceTypes = [role];
    if (likelihood) filters.likelihoodScore = [likelihood as 'HIGH' | 'MEDIUM' | 'LOW'];
    if (sortBy) filters.sortBy = sortBy as any;
    if (sortOrder) filters.sortOrder = sortOrder;
    if (minRedFlagIndex !== undefined) filters.minRedFlagIndex = minRedFlagIndex;
    if (maxRedFlagIndex !== undefined) filters.maxRedFlagIndex = maxRedFlagIndex;

    const result = await databaseService.getEntities(page, limit, filters, sortBy as SortOption);

    // Transform the result to match the expected format
    const transformedData = result.entities.map((entity: any) => ({
      id: entity.id,
      name: entity.fullName,
      fullName: entity.fullName,
      entity_type: entity.entityType,
      title: entity.title || entity.primaryRole,
      role: entity.role || entity.primaryRole,
      primaryRole: entity.primaryRole,
      secondaryRoles: entity.secondaryRoles || [],
      title_variants: entity.titleVariants,
      mentions: entity.mentions,
      files: entity.documentCount || (entity.fileReferences ? entity.fileReferences.length : 0),
      contexts: entity.contexts || [],
      evidence_types: entity.evidence_types || entity.evidenceTypes || [],
      spicy_passages: entity.spicyPassages || [],
      likelihood_score: entity.likelihoodLevel,
      red_flag_rating: entity.red_flag_rating || entity.redFlagRating || 0,
      connectionsToEpstein: entity.connectionsSummary || ''
    }));

    res.json({
      data: transformedData,
      total: result.total,
      page: page,
      pageSize: limit,
      totalPages: Math.ceil(result.total / limit)
    });
  } catch (error) {
    console.error('Error fetching entities:', error);
    res.status(500).json({ 
      error: 'Failed to fetch entities',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Get single entity by ID
app.get('/api/entities/:id', async (req, res) => {
  try {
    const entityId = req.params.id;
    const entity = await databaseService.getEntityById(entityId);
    
    if (!entity) {
      return res.status(404).json({ error: 'Entity not found' });
    }

    // Transform entity to match expected API format
    const transformedEntity = {
      id: entity.id,
      name: entity.fullName,
      fullName: entity.fullName,
      entity_type: entity.entityType,
      title: entity.title || entity.primaryRole,
      role: entity.role || entity.primaryRole,
      primaryRole: entity.primaryRole,
      secondaryRoles: entity.secondaryRoles || [],
      title_variants: entity.titleVariants,
      mentions: entity.mentions,
      files: entity.fileReferences ? entity.fileReferences.length : 0,
      contexts: entity.contexts || [],
      evidence_types: entity.evidence_types || entity.evidenceTypes || [],
      spicy_passages: entity.spicyPassages || [],
      likelihood_score: entity.likelihoodLevel,
      red_flag_rating: entity.red_flag_rating || entity.redFlagRating || 0,
      connectionsToEpstein: entity.connectionsSummary || '',
      fileReferences: entity.fileReferences || []
    };

    res.json(transformedEntity);
  } catch (error) {
    console.error('Error fetching entity:', error);
    res.status(500).json({ 
      error: 'Failed to fetch entity',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Get documents for an entity
app.get('/api/entities/:id/documents', async (req, res) => {
  try {
    const documents = await databaseService.getEntityDocuments(req.params.id);
    res.json(documents);
  } catch (error) {
    console.error('Error fetching entity documents:', error);
    res.status(500).json({ 
      error: 'Failed to fetch entity documents',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Get documents for a specific entity
app.get('/api/entities/:id/documents', async (req, res) => {
  try {
    const entityId = req.params.id;
    const entity = await databaseService.getEntityById(entityId);
    
    if (!entity) {
      return res.status(404).json({ error: 'Entity not found' });
    }

    // Return the file references as documents
    const documents = entity.fileReferences || [];
    
    res.json(documents);
  } catch (error) {
    console.error('Error fetching entity documents:', error);
    res.status(500).json({ 
      error: 'Failed to fetch entity documents',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Get paginated documents
app.get('/api/documents', async (req, res) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 50;
    const sortBy = req.query.sortBy as string;
    
    const filters: any = {};
    if (req.query.fileType) {
      filters.fileType = (req.query.fileType as string).split(',');
    }
    if (req.query.minRedFlag) {
      filters.redFlagLevel = { ...filters.redFlagLevel, min: parseInt(req.query.minRedFlag as string) };
    }
    if (req.query.maxRedFlag) {
      filters.redFlagLevel = { ...filters.redFlagLevel, max: parseInt(req.query.maxRedFlag as string) };
    }
    if (req.query.evidenceType) {
      filters.evidenceType = req.query.evidenceType as string;
    }
    if (req.query.search) {
      filters.search = req.query.search as string;
    }

    const result = await databaseService.getDocuments(page, limit, filters, sortBy);
    
    res.json({
      data: result.documents,
      total: result.total,
      page,
      pageSize: limit,
      totalPages: Math.ceil(result.total / limit)
    });
  } catch (error) {
    console.error('Error fetching documents:', error);
    res.status(500).json({ 
      error: 'Failed to fetch documents',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Get single document by ID
app.get('/api/documents/:id', async (req, res) => {
  try {
    const documentId = req.params.id;
    const document = await databaseService.getDocumentById(documentId);
    
    if (!document) {
      return res.status(404).json({ error: 'Document not found' });
    }

    res.json(document);
  } catch (error) {
    console.error('Error fetching document:', error);
    res.status(500).json({ 
      error: 'Failed to fetch document',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Search entities and documents
app.get('/api/search', async (req, res) => {
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

    const result = await databaseService.search(query, limit, { evidenceType, redFlagBand });

    // Transform entities to match expected API format
    const transformedEntities = result.entities.map((entity: any) => ({
      id: entity.id,
      name: entity.fullName,
      fullName: entity.fullName,
      entity_type: entity.entityType,
      title: entity.title || entity.primaryRole,
      role: entity.role || entity.primaryRole,
      primaryRole: entity.primaryRole,
      secondaryRoles: entity.secondaryRoles || [],
      title_variants: entity.titleVariants,
      mentions: entity.mentions,
      files: entity.fileReferences ? entity.fileReferences.length : 0,
      contexts: entity.contexts || [],
      evidence_types: entity.secondaryRoles || [],
      spicy_passages: entity.spicyPassages || [],
      likelihood_score: entity.likelihoodLevel,
      red_flag_rating: entity.red_flag_rating || entity.redFlagRating || 0,
      connectionsToEpstein: entity.connectionsSummary || ''
    }));

    // Transform documents to match expected API format
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

    if (type === 'entity') {
      transformedDocuments = []
    }

    if (evidenceType) {
      transformedDocuments = transformedDocuments.filter(d => (d.evidenceType || '').toLowerCase() === evidenceType.toLowerCase())
    }
    if (redFlagBand) {
      transformedDocuments = transformedDocuments.filter(d => d.redFlagBand === redFlagBand)
    }
    if (from) {
      transformedDocuments = transformedDocuments.filter(d => d.createdAt && d.createdAt >= from)
    }
    if (to) {
      transformedDocuments = transformedDocuments.filter(d => d.createdAt && d.createdAt <= to)
    }

    res.json({
      entities: transformedEntities,
      documents: transformedDocuments
    });
  } catch (error) {
    console.error('Error searching:', error);
    res.status(500).json({ 
      error: 'Failed to perform search',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Get database statistics
app.get('/api/stats', async (_req, res) => {
  try {
    const stats = await databaseService.getStatistics();
    res.json(stats);
  } catch (error) {
    console.error('Error fetching statistics:', error);
    res.status(500).json({ 
      error: 'Failed to fetch statistics',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Relationship stats
app.get('/api/stats/relationships', async (_req, res) => {
  try {
    const stats = await databaseService.getRelationshipStats();
    res.json(stats);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch relationship stats' });
  }
});

app.get('/api/stats/enrichment', async (_req, res) => {
  try {
    const stats = await databaseService.getEnrichmentStats();
    res.json(stats);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch enrichment stats' });
  }
});

app.get('/api/stats/aliases', async (_req, res) => {
  try {
    const stats = await databaseService.getAliasStats();
    res.json(stats);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch alias stats' });
  }
});

app.get('/api/jobs', async (req, res) => {
  try {
    const jobType = req.query.jobType as string | undefined;
    const status = req.query.status as string | undefined;
    const jobs = await databaseService.listJobs(jobType, status);
    res.json({ data: jobs });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch jobs' });
  }
});



const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Black Book endpoint
app.get('/api/black-book', async (req, res) => {
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
    res.json({ data: entries, total: entries.length });
  } catch (error) {
    console.error('Error fetching Black Book:', error);
    res.status(500).json({ error: 'Failed to fetch Black Book data' });
  }
});

// Forensic document analysis (real, based on DB content)
app.get('/api/forensic/analyze/:id', async (req, res) => {
  try {
    const id = req.params.id as string;
    const db = databaseService.getDatabase();
    const doc = await databaseService.getDocumentById(id);
    if (!doc) return res.status(404).json({ error: 'not_found' });

    const meta = doc.metadata || {};
    const fileInfo = {
      name: doc.fileName || doc.file_name,
      size: doc.fileSize || 0,
      type: doc.fileType || 'application/pdf',
      created: doc.dateCreated || '',
      modified: doc.dateModified || '',
      hash: doc.contentHash || ''
    };

    const mentions = db.prepare(
      `SELECT e.id, e.full_name as name, e.likelihood_level as likelihood, em.context_text as context
       FROM entity_mentions em
       JOIN entities e ON e.id = em.entity_id
       WHERE em.document_id = ?`
    ).all(id) as any[];

    const entities = mentions.map(m => ({
      type: 'person',
      text: m.name,
      position: { start: 0, end: 0 },
      confidence: 90,
      context: m.context || '',
      crossReferences: []
    }));

    const metaFields = ['source_collection','source_original_url','credibility_score'];
    const present = metaFields.filter(f => meta && meta[f] !== undefined).length;
    const authenticityScore = Math.min(100, 60 + present * 10 + Math.min(40, entities.length));

    const analysis = {
      id: `analysis-${Date.now()}`,
      documentId: id,
      authenticity: {
        score: authenticityScore,
        verdict: authenticityScore >= 90 ? 'authentic' : authenticityScore >= 70 ? 'suspicious' : 'inconclusive',
        factors: [
          { type: 'metadata', score: Math.round((present/metaFields.length)*100), description: 'Document metadata completeness', severity: 'low' },
          { type: 'cross_reference', score: Math.min(95, entities.length * 10), description: 'Entities referenced in database mentions', severity: 'low' }
        ]
      },
      metadata: {
        fileInfo,
        documentProperties: {
          author: meta.author,
          creationDate: meta.creationDate || doc.dateCreated,
          modificationDate: meta.modificationDate || doc.dateModified,
          producer: meta.producer,
          creator: meta.creator,
          pageCount: meta.pageCount
        },
        textAnalysis: {
          wordCount: doc.wordCount || 0,
          characterCount: (doc.content || '').length,
          averageWordLength: doc.wordCount ? Math.round(((doc.content || '').length / doc.wordCount) * 10) / 10 : 0,
          readingLevel: 'Unknown',
          sentiment: 'neutral',
          writingStyle: 'formal'
        }
      },
      entities,
      patterns: [],
      anomalies: [],
      timestamp: new Date().toISOString()
    };

    res.json(analysis);
  } catch (error) {
    console.error('Error analyzing document:', error);
    res.status(500).json({ error: 'analysis_failed' });
  }
});

// Black Book review endpoints
app.get('/api/black-book/review', async (req, res) => {
  try {
    const entries = databaseService.getBlackBookReviewEntries();
    const stats = databaseService.getBlackBookReviewStats();
    
    res.json({ entries, stats });
  } catch (error) {
    console.error('Error fetching review entries:', error);
    res.status(500).json({ error: 'Failed to fetch review entries' });
  }
});

app.post('/api/black-book/review/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { correctedName, action } = req.body;
    
    const result = databaseService.updateBlackBookReview(
      parseInt(id), 
      correctedName, 
      action
    );
    
    res.json(result);
  } catch (error) {
    console.error('Error saving review:', error);
    res.status(500).json({ error: 'Failed to save review' });
  }
});

// Get document pages
app.get('/api/documents/:id/pages', async (req, res) => {
  try {
    const result = await databaseService.getDocumentPages(req.params.id);
    res.json(result);
  } catch (error) {
    console.error('Error fetching analytics:', error);
    res.status(500).json({ error: 'Failed to fetch analytics data' });
  }
});

// Relationships API
app.get('/api/relationships', async (req, res) => {
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
    res.status(500).json({ error: 'Failed to fetch relationships' });
  }
});

// Graph API
app.get('/api/graph', async (req, res) => {
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
    res.status(500).json({ error: 'Failed to fetch graph' });
  }
});

// Entity summary-source
app.post('/api/entities/:id/summary-source', async (req, res) => {
  try {
    const id = parseInt(req.params.id)
    if (isNaN(id)) return res.status(400).json({ error: 'Invalid entity ID' })
    const top = req.body?.topN ? parseInt(String(req.body.topN)) : 10
    const data = await databaseService.getEntitySummarySource(id, isNaN(top) ? 10 : top)
    res.json(data)
  } catch (error) {
    res.status(500).json({ error: 'Failed to build summary source' })
  }
})

// Get media items for an entity
app.get('/api/entities/:id/media', async (req, res) => {
  try {
    const entityId = req.params.id;
    const mediaItems = await databaseService.getMediaItems(entityId);
    res.json(mediaItems);
  } catch (error) {
    console.error('Error fetching media items:', error);
    res.status(500).json({ 
      error: 'Failed to fetch media items',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Get paginated media items
app.get('/api/media', async (req, res) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 24;
    
    const filters: { entityId?: string, verificationStatus?: string, minRedFlagRating?: number } = {};
    if (req.query.entityId) filters.entityId = req.query.entityId as string;
    if (req.query.verificationStatus) filters.verificationStatus = req.query.verificationStatus as string;
    if (req.query.minRedFlagRating) filters.minRedFlagRating = parseInt(req.query.minRedFlagRating as string);
    
    const result = await databaseService.getMediaItemsPaginated(page, limit, filters);
    
    res.json({
      data: result.mediaItems,
      total: result.total,
      page,
      pageSize: limit,
      totalPages: Math.ceil(result.total / limit)
    });
  } catch (error) {
    console.error('Error fetching media items:', error);
    res.status(500).json({ 
      error: 'Failed to fetch media items',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Get timeline events
app.get('/api/timeline', async (req, res) => {
  try {
    const events = await databaseService.getTimelineEvents();
    res.json(events);
  } catch (error) {
    console.error('Error fetching timeline events:', error);
    res.status(500).json({ 
      error: 'Failed to fetch timeline events',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Get all articles
app.get('/api/articles', async (req, res) => {
  try {
    const articles = await databaseService.getArticles();
    res.json(articles);
  } catch (error) {
    console.error('Error fetching articles:', error);
    res.status(500).json({ 
      error: 'Failed to fetch articles',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Get all evidence media items
app.get('/api/evidence/media', async (_req, res) => {
  try {
    const mediaItems = await databaseService.getAllMediaItems();
    res.json(mediaItems);
  } catch (error) {
    console.error('Error fetching evidence media:', error);
    res.status(500).json({ 
      error: 'Failed to fetch evidence media',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Serve evidence media file
app.get('/api/evidence/media/:id/file', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const item = databaseService.getMediaItemById(id);
    
    if (!item || !item.file_path) {
      return res.status(404).json({ error: 'Media item not found' });
    }
    
    // Since all real data is in /data, we'll resolve paths relative to that
    let absPath = item.file_path;
    if (item.file_path.startsWith('/data/')) {
      // For paths starting with /data/, resolve relative to current working directory
      absPath = path.join(process.cwd(), item.file_path);
    } else if (item.file_path.startsWith('data/')) {
      // For paths starting with data/, resolve relative to current working directory
      absPath = path.join(process.cwd(), item.file_path);
    } else {
      // For other paths, assume they're relative to the data directory
      absPath = path.join(process.cwd(), 'data', item.file_path);
    }
    
    res.sendFile(absPath);
  } catch (error) {
    console.error('Error serving media file:', error);
    res.status(500).json({ error: 'Failed to serve media file' });
  }
});
// ============================================
// Photo Browser API Endpoints
// ============================================

import { MediaService } from './services/MediaService';
const mediaService = new MediaService(path.join(process.cwd(), 'epstein-archive.db'));

// Get all albums
app.get('/api/media/albums', async (_req, res) => {
  try {
    const albums = mediaService.getAllAlbums();
    res.json(albums);
  } catch (error) {
    console.error('Error fetching albums:', error);
    res.status(500).json({ 
      error: 'Failed to fetch albums',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Get single album by ID
app.get('/api/media/albums/:id', async (req, res) => {
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
    res.status(500).json({ 
      error: 'Failed to fetch album',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Get images in an album
app.get('/api/media/albums/:id/images', async (req, res) => {
  try {
    const albumId = parseInt(req.params.id);
    if (isNaN(albumId)) {
      return res.status(400).json({ error: 'Invalid album ID' });
    }
    
    const images = mediaService.getAllImages({ albumId });
    res.json(images);
  } catch (error) {
    console.error('Error fetching album images:', error);
    res.status(500).json({ 
      error: 'Failed to fetch album images',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Get all images with filtering and sorting
app.get('/api/media/images', async (req, res) => {
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
    res.status(500).json({ 
      error: 'Failed to fetch images',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Upload image
app.post('/api/media/upload', upload.single('file'), async (req: any, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
    const albumId = req.body.albumId ? parseInt(req.body.albumId) : undefined;
    const image = await mediaService.processUpload(req.file, albumId);
    res.json(image);
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ error: 'Upload failed' });
  }
});

// Get thumbnail
app.get('/api/media/thumbnails/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const image = mediaService.getImageById(id);
    if (!image || !image.path) return res.status(404).send('Not found');
    
    const thumbnailsDir = path.join(process.cwd(), 'thumbnails');
    const thumbPath = await mediaService.generateThumbnail(image.path, thumbnailsDir);
    res.sendFile(thumbPath);
  } catch (error) {
    console.error('Thumbnail error:', error);
    res.status(500).send('Error');
  }
});

// Batch delete
app.post('/api/media/batch/delete', async (req, res) => {
  try {
    const { ids } = req.body;
    if (!Array.isArray(ids)) return res.status(400).json({ error: 'Invalid IDs' });
    mediaService.batchDelete(ids);
    res.json({ success: true });
  } catch (error) {
    console.error('Batch delete error:', error);
    res.status(500).json({ error: 'Delete failed' });
  }
});

// Export album
app.get('/api/media/export/album/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    await mediaService.createAlbumArchive(id, res);
  } catch (error) {
    console.error('Export error:', error);
    res.status(500).send('Export failed');
  }
});

// Get single image by ID
app.get('/api/media/images/:id', async (req, res) => {
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
    res.status(500).json({ 
      error: 'Failed to fetch image',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Serve photo library image file
app.get('/api/media/images/:id/file', async (req, res) => {
  try {
    const imageId = parseInt(req.params.id);
    if (isNaN(imageId)) {
      return res.status(400).json({ error: 'Invalid image ID' });
    }
    
    const image = mediaService.getImageById(imageId);
    if (!image || !image.path) {
      return res.status(404).json({ error: 'Image not found' });
    }
    
    // Since all real data is in /data, we'll resolve paths relative to that
    let absPath = image.path;
    if (image.path.startsWith('/data/')) {
      // For paths starting with /data/, resolve relative to current working directory
      absPath = path.join(process.cwd(), image.path);
    } else if (image.path.startsWith('data/')) {
      // For paths starting with data/, resolve relative to current working directory
      absPath = path.join(process.cwd(), image.path);
    } else {
      // For other paths, assume they're relative to the data directory
      absPath = path.join(process.cwd(), 'data', image.path);
    }
    
    res.sendFile(absPath);
  } catch (error) {
    console.error('Error serving image file:', error);
    res.status(500).json({ 
      error: 'Failed to serve image file',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});
// Search images
app.get('/api/media/search', async (req, res) => {
  try {
    const query = req.query.q as string;
    if (!query) {
      return res.status(400).json({ error: 'Search query is required' });
    }
    
    const images = mediaService.searchImages(query);
    res.json(images);
  } catch (error) {
    console.error('Error searching images:', error);
    res.status(500).json({ 
      error: 'Failed to search images',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Get media statistics
app.get('/api/media/stats', async (_req, res) => {
  try {
    const stats = mediaService.getMediaStats();
    res.json(stats);
  } catch (error) {
    console.error('Error fetching media stats:', error);
    res.status(500).json({ 
      error: 'Failed to fetch media statistics',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});


// ============================================
// Investigation API Endpoints
// ============================================

// GET /api/investigations - List all investigations
app.get('/api/investigations', async (req, res) => {
  try {
    const { status, ownerId, page, limit } = req.query;
    
    const result = await investigationService.getInvestigations({
      status: status as string,
      ownerId: ownerId as string,
      page: page ? parseInt(page as string) : undefined,
      limit: limit ? parseInt(limit as string) : undefined
    });
    
    res.json(result);
  } catch (error) {
    console.error('Error fetching investigations:', error);
    res.status(500).json({ 
      error: 'Failed to fetch investigations',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// POST /api/investigations - Create new investigation
app.post('/api/investigations', async (req, res) => {
  try {
    const { title, description, ownerId, scope, collaboratorIds } = req.body;
    
    if (!title || !ownerId) {
      return res.status(400).json({ 
        error: 'Validation failed',
        details: 'title and ownerId are required' 
      });
    }
    
    const investigation = await investigationService.createInvestigation({
      title,
      description,
      ownerId,
      scope,
      collaboratorIds
    });
    
    res.status(201).json(investigation);
  } catch (error) {
    console.error('Error creating investigation:', error);
    res.status(500).json({ 
      error: 'Failed to create investigation',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// GET /api/investigations/:id - Get investigation by ID
app.get('/api/investigations/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    
    if (isNaN(id)) {
      return res.status(400).json({ error: 'Invalid investigation ID' });
    }
    
    const investigation = await investigationService.getInvestigationById(id);
    
    if (!investigation) {
      return res.status(404).json({ error: 'Investigation not found' });
    }
    
    res.json(investigation);
  } catch (error) {
    console.error('Error fetching investigation:', error);
    res.status(500).json({ 
      error: 'Failed to fetch investigation',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// PATCH /api/investigations/:id - Update investigation
app.patch('/api/investigations/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    
    if (isNaN(id)) {
      return res.status(400).json({ error: 'Invalid investigation ID' });
    }
    
    const { title, description, scope, status, collaboratorIds } = req.body;
    
    const investigation = await investigationService.updateInvestigation(id, {
      title,
      description,
      scope,
      status,
      collaboratorIds
    });
    
    if (!investigation) {
      return res.status(404).json({ error: 'Investigation not found' });
    }
    
    res.json(investigation);
  } catch (error) {
    console.error('Error updating investigation:', error);
    res.status(500).json({ 
      error: 'Failed to update investigation',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// DELETE /api/investigations/:id - Delete investigation
app.delete('/api/investigations/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    
    if (isNaN(id)) {
      return res.status(400).json({ error: 'Invalid investigation ID' });
    }
    
    const deleted = await investigationService.deleteInvestigation(id);
    
    if (!deleted) {
      return res.status(404).json({ error: 'Investigation not found' });
    }
    
    res.status(204).send();
  } catch (error) {
    console.error('Error deleting investigation:', error);
    res.status(500).json({ 
      error: 'Failed to delete investigation',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// POST /api/investigations/invite - Invite team member to investigation
app.post('/api/investigations/invite', async (req, res) => {
  try {
    const { investigationId, email, role, message, invitedBy } = req.body;
    
    if (!investigationId || !email || !invitedBy) {
      return res.status(400).json({ 
        error: 'Validation failed',
        details: 'investigationId, email, and invitedBy are required' 
      });
    }
    
    // In a real implementation, you would:
    // 1. Check if the investigation exists
    // 2. Verify the invitedBy user has permission to invite
    // 3. Send an email invitation
    // 4. Store the invitation in the database
    
    // For now, we'll simulate the process
    console.log(`Invitation sent to ${email} for investigation ${investigationId}`);
    
    // Generate a mock invitation ID
    const invitationId = `invite_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // In a real implementation, you would integrate with an email service here
    // For example, using nodemailer or a cloud email service
    
    res.status(201).json({ 
      invitationId,
      message: 'Invitation sent successfully',
      status: 'pending'
    });
  } catch (error) {
    console.error('Error sending invitation:', error);
    res.status(500).json({ 
      error: 'Failed to send invitation',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});
// ============================================
// Hypothesis API Endpoints
// ============================================

// GET /api/hypotheses - List hypotheses
app.get('/api/hypotheses', async (req, res) => {
  try {
    const { investigationId, page, limit } = req.query;
    
    const result = await hypothesisService.getHypotheses(
      investigationId ? parseInt(investigationId as string) : undefined,
      page ? parseInt(page as string) : undefined,
      limit ? parseInt(limit as string) : undefined
    );
    
    res.json(result);
  } catch (error) {
    console.error('Error fetching hypotheses:', error);
    res.status(500).json({ 
      error: 'Failed to fetch hypotheses',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// POST /api/hypotheses - Create hypothesis
app.post('/api/hypotheses', async (req, res) => {
  try {
    const { investigationId, title, description, priority, tags, createdBy } = req.body;
    
    if (!investigationId || !title || !createdBy) {
      return res.status(400).json({ 
        error: 'Validation failed',
        details: 'investigationId, title, and createdBy are required' 
      });
    }
    
    const hypothesis = await hypothesisService.createHypothesis({
      investigationId,
      title,
      description,
      priority,
      tags,
      createdBy
    });
    
    res.status(201).json(hypothesis);
  } catch (error) {
    console.error('Error creating hypothesis:', error);
    res.status(500).json({ 
      error: 'Failed to create hypothesis',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// GET /api/hypotheses/:id - Get hypothesis by ID
app.get('/api/hypotheses/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    
    if (isNaN(id)) {
      return res.status(400).json({ error: 'Invalid hypothesis ID' });
    }
    
    const hypothesis = await hypothesisService.getHypothesisById(id);
    
    if (!hypothesis) {
      return res.status(404).json({ error: 'Hypothesis not found' });
    }
    
    res.json(hypothesis);
  } catch (error) {
    console.error('Error fetching hypothesis:', error);
    res.status(500).json({ 
      error: 'Failed to fetch hypothesis',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// PATCH /api/hypotheses/:id - Update hypothesis
app.patch('/api/hypotheses/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    
    if (isNaN(id)) {
      return res.status(400).json({ error: 'Invalid hypothesis ID' });
    }
    
    const { title, description, status, priority, tags } = req.body;
    
    const hypothesis = await hypothesisService.updateHypothesis(id, {
      title,
      description,
      status,
      priority,
      tags
    });
    
    if (!hypothesis) {
      return res.status(404).json({ error: 'Hypothesis not found' });
    }
    
    res.json(hypothesis);
  } catch (error) {
    console.error('Error updating hypothesis:', error);
    res.status(500).json({ 
      error: 'Failed to update hypothesis',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// DELETE /api/hypotheses/:id - Delete hypothesis
app.delete('/api/hypotheses/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    
    if (isNaN(id)) {
      return res.status(400).json({ error: 'Invalid hypothesis ID' });
    }
    
    const deleted = await hypothesisService.deleteHypothesis(id);
    
    if (!deleted) {
      return res.status(404).json({ error: 'Hypothesis not found' });
    }
    
    res.status(204).send();
  } catch (error) {
    console.error('Error deleting hypothesis:', error);
    res.status(500).json({ 
      error: 'Failed to delete hypothesis',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// ============================================
// Evidence Link API Endpoints
// ============================================

// GET /api/hypotheses/:id/evidence - Get evidence links for hypothesis
app.get('/api/hypotheses/:id/evidence', async (req, res) => {
  try {
    const hypothesisId = parseInt(req.params.id);
    
    if (isNaN(hypothesisId)) {
      return res.status(400).json({ error: 'Invalid hypothesis ID' });
    }
    
    const links = await evidenceLinkService.getEvidenceLinks(hypothesisId);
    
    res.json({ data: links, total: links.length });
  } catch (error) {
    console.error('Error fetching evidence links:', error);
    res.status(500).json({ 
      error: 'Failed to fetch evidence links',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// POST /api/hypotheses/:id/evidence - Add evidence link
app.post('/api/hypotheses/:id/evidence', async (req, res) => {
  try {
    const hypothesisId = parseInt(req.params.id);
    
    if (isNaN(hypothesisId)) {
      return res.status(400).json({ error: 'Invalid hypothesis ID' });
    }
    
    const { evidenceType, evidenceId, role, note, addedBy } = req.body;
    
    if (!evidenceType || !evidenceId || !role || !addedBy) {
      return res.status(400).json({ 
        error: 'Validation failed',
        details: 'evidenceType, evidenceId, role, and addedBy are required' 
      });
    }
    
    const link = await evidenceLinkService.createEvidenceLink({
      hypothesisId,
      evidenceType,
      evidenceId,
      role,
      note,
      addedBy
    });
    
    res.status(201).json(link);
  } catch (error) {
    console.error('Error creating evidence link:', error);
    res.status(500).json({ 
      error: 'Failed to create evidence link',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// DELETE /api/hypotheses/:hypothesisId/evidence/:linkId - Delete evidence link
app.delete('/api/hypotheses/:hypothesisId/evidence/:linkId', async (req, res) => {
  try {
    const linkId = parseInt(req.params.linkId);
    
    if (isNaN(linkId)) {
      return res.status(400).json({ error: 'Invalid link ID' });
    }
    
    const deleted = await evidenceLinkService.deleteEvidenceLink(linkId);
    
    if (!deleted) {
      return res.status(404).json({ error: 'Evidence link not found' });
    }
    
    res.status(204).send();
  } catch (error) {
    console.error('Error deleting evidence link:', error);
    res.status(500).json({ 
      error: 'Failed to delete evidence link',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// ============================================
// Notes API Endpoints
// ============================================

// GET /api/notes - List notes
app.get('/api/notes', async (req, res) => {
  try {
    const { subjectType, subjectId, page, limit } = req.query;
    
    const result = await noteService.getNotes(
      subjectType as string,
      subjectId as string,
      page ? parseInt(page as string) : undefined,
      limit ? parseInt(limit as string) : undefined
    );
    
    res.json(result);
  } catch (error) {
    console.error('Error fetching notes:', error);
    res.status(500).json({ 
      error: 'Failed to fetch notes',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// POST /api/notes - Create note
app.post('/api/notes', async (req, res) => {
  try {
    const { subjectType, subjectId, authorId, body, visibility } = req.body;
    
    if (!subjectType || !subjectId || !authorId || !body) {
      return res.status(400).json({ 
        error: 'Validation failed',
        details: 'subjectType, subjectId, authorId, and body are required' 
      });
    }
    
    const note = await noteService.createNote({
      subjectType,
      subjectId,
      authorId,
      body,
      visibility
    });
    
    res.status(201).json(note);
  } catch (error) {
    console.error('Error creating note:', error);
    res.status(500).json({ 
      error: 'Failed to create note',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// PATCH /api/notes/:id - Update note
app.patch('/api/notes/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    
    if (isNaN(id)) {
      return res.status(400).json({ error: 'Invalid note ID' });
    }
    
    const { body, visibility } = req.body;
    
    const note = await noteService.updateNote(id, { body, visibility });
    
    if (!note) {
      return res.status(404).json({ error: 'Note not found' });
    }
    
    res.json(note);
  } catch (error) {
    console.error('Error updating note:', error);
    res.status(500).json({ 
      error: 'Failed to update note',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// DELETE /api/notes/:id - Delete note
app.delete('/api/notes/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    
    if (isNaN(id)) {
      return res.status(400).json({ error: 'Invalid note ID' });
    }
    
    const deleted = await noteService.deleteNote(id);
    
    if (!deleted) {
      return res.status(404).json({ error: 'Note not found' });
    }
    
    res.status(204).send();
  } catch (error) {
    console.error('Error deleting note:', error);
    res.status(500).json({ 
      error: 'Failed to delete note',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// ============================================
// Tasks API Endpoints
// ============================================

// GET /api/tasks - List tasks
app.get('/api/tasks', async (req, res) => {
  try {
    const { investigationId, status, assigneeId, page, limit } = req.query;
    
    const result = await taskService.getTasks(
      investigationId ? parseInt(investigationId as string) : undefined,
      status as string,
      assigneeId as string,
      page ? parseInt(page as string) : undefined,
      limit ? parseInt(limit as string) : undefined
    );
    
    res.json(result);
  } catch (error) {
    console.error('Error fetching tasks:', error);
    res.status(500).json({ 
      error: 'Failed to fetch tasks',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// POST /api/tasks - Create task
app.post('/api/tasks', async (req, res) => {
  try {
    const { investigationId, title, description, assigneeId, dueDate } = req.body;
    
    if (!investigationId || !title) {
      return res.status(400).json({ 
        error: 'Validation failed',
        details: 'investigationId and title are required' 
      });
    }
    
    const task = await taskService.createTask({
      investigationId,
      title,
      description,
      assigneeId,
      dueDate
    });
    
    res.status(201).json(task);
  } catch (error) {
    console.error('Error creating task:', error);
    res.status(500).json({ 
      error: 'Failed to create task',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// PATCH /api/tasks/:id - Update task
app.patch('/api/tasks/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    
    if (isNaN(id)) {
      return res.status(400).json({ error: 'Invalid task ID' });
    }
    
    const { title, description, status, assigneeId, dueDate } = req.body;
    
    const task = await taskService.updateTask(id, {
      title,
      description,
      status,
      assigneeId,
      dueDate
    });
    
    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }
    
    res.json(task);
  } catch (error) {
    console.error('Error updating task:', error);
    res.status(500).json({ 
      error: 'Failed to update task',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// DELETE /api/tasks/:id - Delete task
app.delete('/api/tasks/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    
    if (isNaN(id)) {
      return res.status(400).json({ error: 'Invalid task ID' });
    }
    
    const deleted = await taskService.deleteTask(id);
    
    if (!deleted) {
      return res.status(404).json({ error: 'Task not found' });
    }
    
    res.status(204).send();
  } catch (error) {
    console.error('Error deleting task:', error);
    res.status(500).json({ 
      error: 'Failed to delete task',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Serve static files from dist
app.use(express.static(path.join(__dirname, '../dist')));

// Serve documents if path is provided
const documentsPath = process.env.DOCUMENTS_PATH;
if (documentsPath) {
  app.use('/files', express.static(documentsPath));
}

// SPA fallback - must be last
app.get('*', (req, res) => {
  if (req.path.startsWith('/api')) {
    return res.status(404).json({ error: 'Not found' });
  }
  res.sendFile(path.join(__dirname, '../dist/index.html'));
});

// Start server
app.listen(PORT, async () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`📊 API endpoints available at http://localhost:${PORT}/api/*`);
  
  // Test database connection
  try {
    const stats = await databaseService.getStatistics();
    console.log(`📊 Database connected with ${stats.totalEntities} entities and ${stats.totalDocuments} documents`);
  } catch (error) {
    console.error('❌ Database connection failed:', error);
  }
});
