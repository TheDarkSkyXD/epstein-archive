import express from 'express';
import cors from 'cors';
import { databaseService } from '../src/services/DatabaseService';
import { SearchFilters } from '../src/types';

// Use require for Node.js built-ins
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.API_PORT || 3012;

// Middleware
app.use(cors());
app.use(express.json());

// Health check
app.get('/api/health', (req, res) => {
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
    const sortBy = req.query.sortBy as string || 'spice';
    const sortOrder = req.query.sortOrder as 'asc' | 'desc';

    const filters: SearchFilters = {};
    if (search) filters.searchTerm = search;
    if (role) filters.evidenceTypes = [role];
    if (likelihood) filters.likelihoodScore = [likelihood as 'HIGH' | 'MEDIUM' | 'LOW'];
    if (sortBy) filters.sortBy = sortBy as any;
    if (sortOrder) filters.sortOrder = sortOrder;

    const result = await databaseService.getEntities(page, limit, filters, sortBy as any);

    // Transform the result to match the expected format
    const transformedData = result.entities.map((entity: any) => ({
      id: entity.id,
      name: entity.name || entity.fullName,
      fullName: entity.name || entity.fullName,
      primaryRole: entity.primaryRole,
      secondaryRoles: entity.secondaryRoles || [],
      title: entity.title,
      role: entity.role,
      titleVariants: entity.titleVariants,
      mentions: entity.mentions,
      files: entity.fileReferences ? entity.fileReferences.length : 0,
      contexts: entity.contexts || [],
      evidence_types: entity.evidenceTypes || entity.secondaryRoles || [],
      spicy_passages: entity.spicyPassages || [],
      likelihood_score: entity.likelihoodLevel,
      red_flag_rating: entity.red_flag_rating,
      red_flag_score: entity.red_flag_score,
      red_flag_peppers: entity.red_flag_peppers || '🏳️',
      red_flag_description: entity.red_flag_description_text || 'No Red Flags',
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
    
    // Validate entity ID format
    if (!entityId || !/^[1-9]\d*$/.test(entityId)) {
      return res.status(400).json({ error: 'Invalid entity ID format' });
    }
    
    const entity = await databaseService.getEntityById(entityId);
    
    if (!entity) {
      return res.status(404).json({ error: 'Entity not found' });
    }

    // Transform entity to match expected API format
    const transformedEntity = {
      id: entity.id,
      name: entity.name || entity.fullName,
      fullName: entity.name || entity.fullName,
      primaryRole: entity.primaryRole,
      secondaryRoles: entity.secondaryRoles || [],
      mentions: entity.mentions,
      files: entity.fileReferences ? entity.fileReferences.length : 0,
      contexts: entity.contexts || [],
      evidence_types: entity.evidenceTypes || entity.secondaryRoles || [],
      spicy_passages: entity.spicyPassages || [],
      likelihood_score: entity.likelihoodLevel,
      red_flag_rating: entity.red_flag_rating,
      red_flag_score: entity.red_flag_score,
      red_flag_peppers: entity.red_flag_peppers || '🏳️',
      red_flag_description: entity.red_flag_description_text || 'No Red Flags',
      connectionsToEpstein: entity.connectionsSummary || '',
      fileReferences: entity.fileReferences?.map((ref: any) => ({
        ...ref,
        content: ref.content // Ensure content is passed through
      })) || []
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

// Get documents for a specific entity
app.get('/api/entities/:id/documents', async (req, res) => {
  try {
    const entityId = req.params.id;
    
    // Validate entity ID format
    if (!entityId || !/^[1-9]\d*$/.test(entityId)) {
      return res.status(400).json({ error: 'Invalid entity ID format' });
    }
    
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
      name: entity.name || entity.fullName,
      fullName: entity.name || entity.fullName,
      primaryRole: entity.primaryRole,
      secondaryRoles: entity.secondaryRoles || [],
      mentions: entity.mentions,
      files: entity.fileReferences ? entity.fileReferences.length : 0,
      contexts: entity.contexts || [],
      evidence_types: entity.secondaryRoles || [],
      spicy_passages: entity.spicyPassages || [],
      likelihood_score: entity.likelihoodLevel,
      red_flag_rating: entity.red_flag_rating,
      red_flag_score: entity.red_flag_score,
      red_flag_peppers: entity.red_flag_peppers || '🏳️',
      red_flag_description: entity.red_flag_description_text || 'No Red Flags',
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
      content: doc.content, // Add full content
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
app.get('/api/stats', async (req, res) => {
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

// Serve static files
app.use('/files', express.static('/Users/veland/Downloads/Epstein Files/data/originals'));
// Serve PDF files
app.get('/api/media/pdf', (req, res) => {
  console.log('PDF endpoint hit with query:', req.query);
  try {
    const filePath = decodeURIComponent(req.query.filePath as string);
    console.log('Decoded file path:', filePath);
    
    // Security check - ensure file is within allowed directories
    if (!filePath || !filePath.startsWith('/Users/veland/Downloads/Epstein Files/data/')) {
      console.log('Security check failed for path:', filePath);
      return res.status(403).json({ error: 'Access denied' });
    }
    
    // Check if file exists
    if (!fs.existsSync(filePath)) {
      console.log('File not found:', filePath);
      return res.status(404).json({ error: 'File not found' });
    }
    
    console.log('Streaming file:', filePath);
    // Set appropriate headers for PDF
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="${path.basename(filePath)}"`);
    
    // Stream the file
    const fileStream = fs.createReadStream(filePath);
    fileStream.pipe(res);
    
    fileStream.on('error', (err) => {
      console.error('Error streaming PDF:', err);
      res.status(500).json({ error: 'Failed to stream PDF' });
    });
  } catch (error) {
    console.error('Error serving PDF:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get document pages
app.get('/api/documents/:id/pages', async (req, res) => {
  try {
    const result = databaseService.getDocumentPages(req.params.id);
    res.json(result);
  } catch (error) {
    console.error('Error fetching document pages:', error);
    res.status(500).json({ error: 'Failed to fetch document pages' });
  }
});

// Get document by ID
app.get('/api/documents/:id', async (req, res) => {
  try {
    const document = await databaseService.getDocumentById(req.params.id);
    if (document) {
      res.json(document);
    } else {
      res.status(404).json({ error: 'Document not found' });
    }
  } catch (error) {
    console.error('Error fetching document:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
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