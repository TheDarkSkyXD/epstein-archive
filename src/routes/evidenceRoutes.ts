/**
 * Evidence API Routes
 * 
 * Provides endpoints for searching, retrieving, and managing evidence records
 * with full-text search, filtering, and entity relationships.
 */

import express, { Request, Response } from 'express';
import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const router = express.Router();

// Database connection
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const dbPath = path.join(__dirname, '../../epstein-archive.db');
let db: Database.Database;

try {
  db = new Database(dbPath);
  console.log('Evidence routes: Database connected');
} catch (error) {
  console.error('Evidence routes: Failed to connect to database:', error);
}

/**
 * GET /api/evidence/search
 * Search evidence with filtering and pagination
 */
router.get('/search', async (req: Request, res: Response) => {
  try {
    const {
      q = '',
      type,
      entityId,
      dateFrom,
      dateTo,
      redFlagMin,
      tags,
      page = '1',
      limit = '20',
    } = req.query;

    const pageNum = Math.max(1, parseInt(page as string, 10));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit as string, 10)));
    const offset = (pageNum - 1) * limitNum;

    // Build query
    let query = `
      SELECT DISTINCT
        e.id,
        e.title,
        e.evidence_type as evidenceType,
        e.red_flag_rating as redFlagRating,
        e.created_at as createdAt,
        e.evidence_tags as evidenceTags,
        SUBSTR(e.extracted_text, 1, 200) as snippet
      FROM evidence e
    `;

    const conditions: string[] = [];
    const params: any[] = [];

    // Full-text search
    if (q && q.toString().trim().length > 0) {
      query += ` INNER JOIN evidence_fts ON evidence_fts.rowid = e.id`;
      conditions.push(`evidence_fts MATCH ?`);
      params.push(q.toString().trim());
    }

    // Entity filter
    if (entityId) {
      query += ` INNER JOIN evidence_entity ee ON ee.evidence_id = e.id`;
      conditions.push(`ee.entity_id = ?`);
      params.push(parseInt(entityId as string, 10));
    }

    // Type filter
    if (type) {
      conditions.push(`e.evidence_type = ?`);
      params.push(type);
    }

    // Date range filter
    if (dateFrom) {
      conditions.push(`e.created_at >= ?`);
      params.push(dateFrom);
    }

    if (dateTo) {
      conditions.push(`e.created_at <= ?`);
      params.push(dateTo);
    }

    // Red flag minimum
    if (redFlagMin) {
      conditions.push(`e.red_flag_rating >= ?`);
      params.push(parseInt(redFlagMin as string, 10));
    }

    // Tags filter
    if (tags) {
      const tagArray = (tags as string).split(',');
      for (const tag of tagArray) {
        conditions.push(`e.evidence_tags LIKE ?`);
        params.push(`%${tag.trim()}%`);
      }
    }

    // Add conditions to query
    if (conditions.length > 0) {
      query += ` WHERE ` + conditions.join(' AND ');
    }

    // Count total results
    const countQuery = query.replace(/SELECT DISTINCT.*FROM evidence e/, 'SELECT COUNT(DISTINCT e.id) as total FROM evidence e');
    const totalResult = db.prepare(countQuery).get(...params) as { total: number };
    const total = totalResult.total;

    // Add pagination
    query += ` ORDER BY e.created_at DESC LIMIT ? OFFSET ?`;
    params.push(limitNum, offset);

    // Execute query
    const results = db.prepare(query).all(...params) as any[];

    // Enrich with entities
    for (const result of results) {
      // Get linked entities
      const entities = db.prepare(`
        SELECT 
          ent.id,
          ent.full_name as name,
          ent.primary_role as category,
          ee.role
        FROM evidence_entity ee
        INNER JOIN entities ent ON ent.id = ee.entity_id
        WHERE ee.evidence_id = ?
        LIMIT 10
      `).all(result.id);

      result.entities = entities;
      result.tags = result.evidenceTags ? JSON.parse(result.evidenceTags) : [];
      delete result.evidenceTags;
    }

    const totalPages = Math.ceil(total / limitNum);

    res.json({
      results,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages,
      },
    });
  } catch (error) {
    console.error('Evidence search error:', error);
    res.status(500).json({ error: 'Search failed', message: String(error) });
  }
});

/**
 * GET /api/evidence/:id
 * Get single evidence record with full details
 */
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const evidence = db.prepare(`
      SELECT 
        id,
        evidence_type as evidenceType,
        title,
        description,
        original_filename as originalFilename,
        source_path as sourcePath,
        extracted_text as extractedText,
        created_at as createdAt,
        modified_at as modifiedAt,
        red_flag_rating as redFlagRating,
        evidence_tags as evidenceTags,
        metadata_json as metadataJson,
        word_count as wordCount,
        file_size as fileSize
      FROM evidence
      WHERE id = ?
    `).get(id) as any;

    if (!evidence) {
      return res.status(404).json({ error: 'Evidence not found' });
    }

    // Parse JSON fields
    evidence.tags = evidence.evidenceTags ? JSON.parse(evidence.evidenceTags) : [];
    evidence.metadata = evidence.metadataJson ? JSON.parse(evidence.metadataJson) : {};
    delete evidence.evidenceTags;
    delete evidence.metadataJson;

    // Get linked entities
    const entities = db.prepare(`
      SELECT 
        ent.id,
        ent.full_name as name,
        ent.primary_role as category,
        ee.role,
        ee.confidence,
        ee.context_snippet as contextSnippet
      FROM evidence_entity ee
      INNER JOIN entities ent ON ent.id = ee.entity_id
      WHERE ee.evidence_id = ?
    `).all(id);

    evidence.entities = entities;

    res.json(evidence);
  } catch (error) {
    console.error('Evidence retrieval error:', error);
    res.status(500).json({ error: 'Retrieval failed', message: String(error) });
  }
});

/**
 * GET /api/evidence/types
 * List all evidence types with counts
 */
router.get('/types', async (req: Request, res: Response) => {
  try {
    const types = db.prepare(`
      SELECT 
        evidence_type as type,
        COUNT(*) as count
      FROM evidence
      GROUP BY evidence_type
      ORDER BY count DESC
    `).all();

    // Add descriptions
    const typeDescriptions: Record<string, string> = {
      court_deposition: 'Legal depositions and sworn testimony',
      court_filing: 'Indictments, motions, court exhibits',
      contact_directory: 'Address books, contact lists',
      correspondence: 'Emails, messages',
      financial_record: 'Flight logs, cash ledgers, expense records',
      investigative_report: 'House Oversight Committee productions',
      testimony: 'Victim testimony and witness statements',
      timeline_data: 'Chronological event records',
      media_scan: 'Image scans of documents',
      evidence_list: 'Catalogued evidence inventories',
    };

    const enrichedTypes = types.map((t: any) => ({
      ...t,
      description: typeDescriptions[t.type] || '',
    }));

    res.json(enrichedTypes);
  } catch (error) {
    console.error('Evidence types error:', error);
    res.status(500).json({ error: 'Failed to retrieve types', message: String(error) });
  }
});

/**
 * GET /api/entities/:id/evidence
 * Get all evidence associated with an entity
 */
router.get('/entities/:id/evidence', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { page = '1', limit = '20', type } = req.query;

    const pageNum = Math.max(1, parseInt(page as string, 10));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit as string, 10)));
    const offset = (pageNum - 1) * limitNum;

    let query = `
      SELECT DISTINCT
        e.id,
        e.title,
        e.evidence_type as evidenceType,
        e.red_flag_rating as redFlagRating,
        e.created_at as createdAt,
        SUBSTR(e.extracted_text, 1, 200) as snippet,
        ee.role
      FROM evidence e
      INNER JOIN evidence_entity ee ON ee.evidence_id = e.id
      WHERE ee.entity_id = ?
    `;

    const params: any[] = [parseInt(id, 10)];

    if (type) {
      query += ` AND e.evidence_type = ?`;
      params.push(type);
    }

    // Count total
    const countQuery = query.replace(/SELECT DISTINCT.*FROM evidence e/, 'SELECT COUNT(DISTINCT e.id) as total FROM evidence e');
    const totalResult = db.prepare(countQuery).get(...params) as { total: number };
    const total = totalResult.total;

    // Add pagination
    query += ` ORDER BY e.created_at DESC LIMIT ? OFFSET ?`;
    params.push(limitNum, offset);

    const results = db.prepare(query).all(...params);

    const totalPages = Math.ceil(total / limitNum);

    res.json({
      results,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages,
      },
    });
  } catch (error) {
    console.error('Entity evidence error:', error);
    res.status(500).json({ error: 'Failed to retrieve entity evidence', message: String(error) });
  }
});

export default router;
