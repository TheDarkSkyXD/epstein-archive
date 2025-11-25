import express from 'express';
import cors from 'cors';
import { databaseService } from './services/DatabaseService';
import { SearchFilters, SortOption } from './types';
import { config } from './config';

const app = express();

// Basic middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request logging
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} ${req.method} ${req.url}`);
  next();
});

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
    const likelihood = req.query.likelihood as string;
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
      minMentions: 0
    };
    
    if (search) filters.searchTerm = search.trim();
    if (role) filters.evidenceTypes = [role.trim()];
    if (likelihood) filters.likelihoodScore = [likelihood as 'HIGH' | 'MEDIUM' | 'LOW'];
    if (sortBy) filters.sortBy = sortBy.trim() as any;
    if (sortOrder) filters.sortOrder = sortOrder;

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
      spice_peppers: '🌶️'.repeat(entity.spiceRating || 1),
      spice_description: `Red Flag Index ${entity.spiceRating || 1}`,
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
      spice_peppers: '🌶️'.repeat(entity.spiceRating || 1),
      spice_description: `Red Flag Index ${entity.spiceRating || 1}`,
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

// Search entities and documents
app.get('/api/search', async (req, res, next) => {
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
      files: entity.documentCount || (entity.fileReferences ? entity.fileReferences.length : 0),
      contexts: entity.contexts || [],
      evidence_types: entity.secondaryRoles || [],
      spicy_passages: entity.spicyPassages || [],
      likelihood_score: entity.likelihoodLevel,
      spice_score: entity.spiceScore,
      spice_rating: entity.spiceRating,
      spice_peppers: '🌶️'.repeat(entity.spiceRating || 1),
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

// Error handling middleware (must be last)
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
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