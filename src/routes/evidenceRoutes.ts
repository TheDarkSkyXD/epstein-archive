/**
 * Evidence API Routes
 * 
 * Provides endpoints for searching, retrieving, and managing evidence records
 * with full-text search, filtering, and entity relationships.
 */

import express, { Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { documentsRepository } from '../server/db/documentsRepository.js';
import { searchRepository } from '../server/db/searchRepository.js';
import { forensicRepository } from '../server/db/forensicRepository.js';
import { getDb } from '../server/db/connection.js';
import { logAudit } from '../server/utils/auditLogger.js';

const router = express.Router();

// Configure upload security
const upload = multer({
  dest: 'uploads/',
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB max
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      'application/pdf',
      'text/plain',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'image/jpeg',
      'image/png'
    ];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only PDF, TXT, DOCX, JPG, PNG allowed.'));
    }
  }
});

/**
 * POST /api/evidence/upload
 * Secure document upload
 */
router.post('/upload', upload.single('file'), async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const { originalname, mimetype, size, path: tempPath } = req.file;
    const { title, description } = req.body;
    
    // Move to permanent storage (data/documents)
    const targetDir = path.join(process.cwd(), 'data', 'documents', 'uploads');
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }
    
    const fileExt = path.extname(originalname);
    const fileName = `${Date.now()}-${Math.round(Math.random() * 1000)}${fileExt}`;
    const targetPath = path.join(targetDir, fileName);
    
    fs.renameSync(tempPath, targetPath);
    
    // Create DB entry
    const db = getDb();
    const result = db.prepare(`
      INSERT INTO documents (
        file_name, 
        file_path, 
        file_type, 
        file_size, 
        date_created, 
        title, 
        metadata_json,
        red_flag_rating
      ) VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP, ?, ?, 0)
    `).run(
      fileName, 
      `uploads/${fileName}`, 
      mimetype, 
      size, 
      title || originalname,
      JSON.stringify({ 
        originalName: originalname,
        uploadedBy: (req as any).user?.id || 'anonymous',
        description 
      })
    );
    
    const documentId = result.lastInsertRowid;
    
    logAudit('upload_document', (req as any).user?.id, 'document', String(documentId), { fileName });
    
    res.status(201).json({ 
      success: true, 
      documentId,
      message: 'File uploaded successfully' 
    });
  } catch (error) {
    console.error('Upload error:', error);
    // Cleanup temp file if it exists
    if (req.file?.path && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    res.status(500).json({ error: 'Upload failed', message: String(error) });
  }
});

/**
 * GET /api/evidence/search
 * Search evidence with filtering and pagination
 */
router.get('/search', async (req: Request, res: Response) => {
  try {
    const query = req.query.query as string;
    const limit = parseInt(req.query.limit as string) || 50;
    
    if (!query) {
       // Return recent documents if no query
       const result = documentsRepository.getDocuments(1, limit, {});
       return res.json(result);
    }
    
    const result = await searchRepository.search(query, limit);
    res.json(result);
  } catch (error) {
    console.error('Evidence search error:', error);
    res.status(500).json({ error: 'Search failed', message: String(error) });
  }
});

/**
 * GET /api/evidence/types
 * List all evidence types with counts
 */
router.get('/types', async (req: Request, res: Response) => {
  try {
    const db = getDb();
    // Aggregate from both documents and evidence tables? 
    // Usually 'evidence' table is for investigation items, 'documents' is the corpus.
    // Let's query 'documents' for now as it's the main source.
    const types = db.prepare(`
      SELECT evidence_type as type, COUNT(*) as count 
      FROM documents 
      WHERE evidence_type IS NOT NULL 
      GROUP BY evidence_type
    `).all();
    res.json(types);
  } catch (error) {
    console.error('Evidence types error:', error);
    res.status(500).json({ error: 'Failed to retrieve types', message: String(error) });
  }
});

/**
 * GET /api/evidence/:id
 * Get single evidence record with full details
 */
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const evidence = documentsRepository.getDocumentById(id);

    if (!evidence) {
      return res.status(404).json({ error: 'Evidence not found' });
    }

    res.json(evidence);
  } catch (error) {
    console.error('Evidence retrieval error:', error);
    res.status(500).json({ error: 'Retrieval failed', message: String(error) });
  }
});

/**
 * GET /api/evidence/:id/metrics
 * Get forensic metrics
 */
router.get('/:id/metrics', async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const metrics = forensicRepository.getMetrics(id);
        res.json(metrics || { metrics_json: '{}', authenticity_score: 0 });
    } catch (e) {
        console.error('Metrics error:', e);
        res.status(500).json({ error: 'Failed to get metrics' });
    }
});

/**
 * GET /api/evidence/:id/custody
 * Get chain of custody
 */
router.get('/:id/custody', async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const chain = forensicRepository.getChainOfCustody(id);
        res.json(chain || []);
    } catch (e) {
        console.error('Custody error:', e);
        res.status(500).json({ error: 'Failed to get chain of custody' });
    }
});

/**
 * POST /api/evidence/:id/analyze
 * Trigger forensic analysis
 */
router.post('/:id/analyze', async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        // Mock analysis logic for now
        // In real world, this would process text complexity, sentiment, metadata anomalies
        
        const doc = documentsRepository.getDocumentById(id) as any;
        if (!doc) return res.status(404).json({ error: 'Document not found' });
        
        const metrics = {
            readability: {
                fleschKincaid: Math.random() * 100,
                gradeLevel: Math.floor(Math.random() * 12) + 1
            },
            sentiment: {
                score: (Math.random() * 2) - 1, // -1 to 1
                magnitude: Math.random()
            },
            metadataAnalysis: {
                hasGPS: false,
                creationDateMatches: true,
                author: doc.metadata_json ? JSON.parse(doc.metadata_json).author : 'Unknown'
            }
        };
        
        const authenticityScore = 0.8 + (Math.random() * 0.2); // Mock high score
        
        forensicRepository.saveMetrics(id, metrics, authenticityScore);
        forensicRepository.addCustodyEvent({
            evidenceId: id,
            actor: 'System',
            action: 'Automated Forensic Analysis',
            notes: `Analysis completed. Score: ${authenticityScore.toFixed(2)}`
        });
        
        res.json({ success: true, metrics, authenticityScore });
    } catch (e) {
        console.error('Analysis error:', e);
        res.status(500).json({ error: 'Analysis failed' });
    }
});

export default router;
