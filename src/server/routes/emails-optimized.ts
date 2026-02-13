/**
 * EMAIL HOT PATH OPTIMIZATION
 *
 * Optimized email endpoint that returns metadata only (no bodies)
 * Message bodies fetched lazily when thread is opened
 *
 * Ensures:
 * - No N+1 queries
 * - Lean payloads for list view
 * - Fast thread list rendering
 */

import { Router, Request, Response } from 'express';
import Database from 'better-sqlite3';
import { performanceCache } from '../performanceCache';

const router = Router();

interface EmailMetadata {
  id: number;
  threadId: string;
  subject: string;
  from: string;
  to: string;
  date: string;
  snippet: string;
  hasAttachments: boolean;
  category?: 'primary' | 'updates' | 'promotions';
}

/**
 * GET /api/emails
 *
 * Returns email thread metadata only (no bodies)
 * Optimized for fast list rendering
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const db = (req as any).db as Database;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 500;
    const category = req.query.category as string;
    const offset = (page - 1) * limit;

    // Check cache
    const cacheKey = `emails:${category || 'all'}:page${page}:limit${limit}`;
    const cached = performanceCache.get<{ data: EmailMetadata[]; total: number }>(cacheKey);
    if (cached) {
      return res.json(cached);
    }

    // Build query
    let whereClause = "WHERE type = 'email'";
    if (category && category !== 'all') {
      whereClause += ` AND json_extract(metadata_json, '$.category') = '${category}'`;
    }

    // Get total count
    const countQuery = `SELECT COUNT(*) as count FROM documents ${whereClause}`;
    const { count: total } = db.prepare(countQuery).get() as { count: number };

    // Get emails with metadata only (NO body_raw, NO content)
    const query = `
      SELECT 
        id,
        json_extract(metadata_json, '$.thread_id') as threadId,
        json_extract(metadata_json, '$.subject') as subject,
        json_extract(metadata_json, '$.from') as "from",
        json_extract(metadata_json, '$.to') as "to",
        date_created as date,
        SUBSTR(content_preview, 1, 150) as snippet,
        0 as hasAttachments,
        json_extract(metadata_json, '$.category') as category
      FROM documents
      ${whereClause}
      ORDER BY date_created DESC
      LIMIT ? OFFSET ?
    `;

    const emails = db.prepare(query).all(limit, offset) as EmailMetadata[];

    const result = { data: emails, total };

    // Cache for 30s
    performanceCache.set(cacheKey, result, 30);

    res.json(result);
  } catch (error: any) {
    console.error('Error fetching emails:', error);
    res.status(500).json({ error: 'Failed to fetch emails' });
  }
});

/**
 * GET /api/emails/:id/body
 *
 * Lazy-load message body when thread is opened
 * Only fetches body for specific message
 */
router.get('/:id/body', async (req: Request, res: Response) => {
  try {
    const db = (req as any).db as Database;
    const { id } = req.params;

    // Check cache
    const cacheKey = `email:${id}:body`;
    const cached = performanceCache.get<{ body: string }>(cacheKey);
    if (cached) {
      return res.json(cached);
    }

    // Fetch body only
    const query = `
      SELECT content as body
      FROM documents
      WHERE id = ? AND type = 'email'
    `;

    const result = db.prepare(query).get(id) as { body: string } | undefined;

    if (!result) {
      return res.status(404).json({ error: 'Email not found' });
    }

    // Cache for 60s
    performanceCache.set(cacheKey, result, 60);

    res.json(result);
  } catch (error: any) {
    console.error('Error fetching email body:', error);
    res.status(500).json({ error: 'Failed to fetch email body' });
  }
});

/**
 * GET /api/emails/categories
 *
 * Get email counts by category
 */
router.get('/categories', async (req: Request, res: Response) => {
  try {
    const db = (req as any).db as Database;

    // Check cache
    const cached = performanceCache.get<Record<string, number>>('email:categories');
    if (cached) {
      return res.json(cached);
    }

    const query = `
      SELECT 
        json_extract(metadata_json, '$.category') as category,
        COUNT(*) as count
      FROM documents
      WHERE type = 'email'
      GROUP BY category
    `;

    const rows = db.prepare(query).all() as Array<{ category: string; count: number }>;

    const counts: Record<string, number> = {
      all: 0,
      primary: 0,
      updates: 0,
      promotions: 0,
    };

    for (const row of rows) {
      const category = row.category || 'primary';
      counts[category] = row.count;
      counts.all += row.count;
    }

    // Cache for 60s
    performanceCache.set('email:categories', counts, 60);

    res.json(counts);
  } catch (error: any) {
    console.error('Error fetching email categories:', error);
    res.status(500).json({ error: 'Failed to fetch categories' });
  }
});

export default router;
