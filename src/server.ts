import express from 'express';
import cors from 'cors';
import { databaseService } from './services/DatabaseService';
import { SearchFilters, SortOption } from './types';

const app = express();
const PORT = process.env.API_PORT || 3012;

// Middleware
app.use(cors());
app.use(express.json());

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
      primaryRole: entity.primaryRole,
      secondaryRoles: entity.secondaryRoles || [],
      mentions: entity.mentions,
      files: entity.documentCount || (entity.fileReferences ? entity.fileReferences.length : 0),
      contexts: entity.contexts || [],
      evidence_types: entity.secondaryRoles || [],
      spicy_passages: entity.spicyPassages || [],
      likelihood_score: entity.likelihoodLevel,
      spice_score: entity.spiceScore,
      spice_rating: entity.spiceRating,
      spice_peppers: '🚩'.repeat(entity.spiceRating || 1),
      spice_description: `Red Flag Index ${entity.spiceRating || 1}`,
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
      primaryRole: entity.primaryRole,
      secondaryRoles: entity.secondaryRoles || [],
      mentions: entity.mentions,
      files: entity.fileReferences ? entity.fileReferences.length : 0,
      contexts: entity.contexts || [],
      evidence_types: entity.secondaryRoles || [],
      spicy_passages: entity.spicyPassages || [],
      likelihood_score: entity.likelihoodLevel,
      spice_score: entity.spiceScore,
      spice_rating: entity.spiceRating,
      spice_peppers: '🚩'.repeat(entity.spiceRating || 1),
      spice_description: `Red Flag Index ${entity.spiceRating || 1}`,
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
    if (req.query.minSpice) {
      filters.spiceLevel = { ...filters.spiceLevel, min: parseInt(req.query.minSpice as string) };
    }
    if (req.query.maxSpice) {
      filters.spiceLevel = { ...filters.spiceLevel, max: parseInt(req.query.maxSpice as string) };
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

    if (!query) {
      return res.status(400).json({ error: 'Search query is required' });
    }

    const result = await databaseService.search(query, limit);

    // Transform entities to match expected API format
    const transformedEntities = result.entities.map((entity: any) => ({
      id: entity.id,
      name: entity.fullName,
      fullName: entity.fullName,
      primaryRole: entity.primaryRole,
      secondaryRoles: entity.secondaryRoles || [],
      mentions: entity.mentions,
      files: entity.fileReferences ? entity.fileReferences.length : 0,
      contexts: entity.contexts || [],
      evidence_types: entity.secondaryRoles || [],
      spicy_passages: entity.spicyPassages || [],
      likelihood_score: entity.likelihoodLevel,
      spice_score: entity.spiceScore,
      spice_rating: entity.spiceRating,
      spice_peppers: '🚩'.repeat(entity.spiceRating || 1),
      spice_description: `Red Flag Index ${entity.spiceRating || 1}`,
      connectionsToEpstein: entity.connectionsSummary || ''
    }));

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

import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Black Book endpoint
app.get('/api/black-book', async (req, res) => {
  try {
    const entries = databaseService.getBlackBookEntries();
    res.json(entries);
  } catch (error) {
    console.error('Error fetching Black Book:', error);
    res.status(500).json({ error: 'Failed to fetch Black Book data' });
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
    
    const filters: { entityId?: string, verificationStatus?: string, minSpiceRating?: number } = {};
    if (req.query.entityId) filters.entityId = req.query.entityId as string;
    if (req.query.verificationStatus) filters.verificationStatus = req.query.verificationStatus as string;
    if (req.query.minSpiceRating) filters.minSpiceRating = parseInt(req.query.minSpiceRating as string);
    
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