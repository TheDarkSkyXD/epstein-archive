import express from 'express';
import { getDb } from '../db/connection.js';
import {
  classifyEmail,
  buildCategoryWhereClause,
  getEntitiesInEmail,
  getKnownEntitySenders,
  type EmailCategory,
} from '../services/emailClassificationService.js';

const router = express.Router();

// Gmail-style category counts
router.get('/categories', async (_req, res, next) => {
  try {
    const db = getDb();

    // Get counts for each category using optimized queries
    const totalResult = db
      .prepare(
        `
      SELECT COUNT(*) as count FROM documents WHERE evidence_type = 'email'
    `,
      )
      .get() as { count: number };

    const primaryResult = db
      .prepare(
        `
      SELECT COUNT(*) as count FROM documents 
      WHERE evidence_type = 'email'
      AND (
        json_extract(metadata_json, '$.from') LIKE '%ehbarak1@gmail.com%'
        OR json_extract(metadata_json, '$.from') LIKE '%jeevacation@gmail.com%'
      )
    `,
      )
      .get() as { count: number };

    const updatesResult = db
      .prepare(
        `
      SELECT COUNT(*) as count FROM documents 
      WHERE evidence_type = 'email'
      AND (
        json_extract(metadata_json, '$.from') LIKE '%amazon.com%'
        OR json_extract(metadata_json, '$.from') LIKE '%noreply@%'
        OR json_extract(metadata_json, '$.from') LIKE '%no-reply@%'
        OR file_name LIKE '%order%'
        OR file_name LIKE '%shipping%'
      )
    `,
      )
      .get() as { count: number };

    const promotionsResult = db
      .prepare(
        `
      SELECT COUNT(*) as count FROM documents 
      WHERE evidence_type = 'email'
      AND (
        json_extract(metadata_json, '$.from') LIKE '%@houzz.com%'
        OR json_extract(metadata_json, '$.from') LIKE '%@response.cnbc.com%'
        OR json_extract(metadata_json, '$.from') LIKE '%dailynews%'
        OR json_extract(metadata_json, '$.from') LIKE '%washingtonpost%'
        OR json_extract(metadata_json, '$.from') LIKE '%fab.com%'
        OR content LIKE '%unsubscribe%'
      )
    `,
      )
      .get() as { count: number };

    res.json({
      all: totalResult.count,
      primary: primaryResult.count,
      updates: updatesResult.count,
      promotions: promotionsResult.count,
      social: 0, // Low volume in this dataset
    });
  } catch (error) {
    console.error('Error fetching email categories:', error);
    next(error);
  }
});

// Get entities mentioned in an email
router.get('/:id/entities', async (req, res, next) => {
  try {
    const db = getDb();
    const email = db
      .prepare(
        `
      SELECT content FROM documents WHERE id = ? AND evidence_type = 'email'
    `,
      )
      .get(req.params.id) as { content: string } | undefined;

    if (!email) {
      return res.status(404).json({ error: 'Email not found' });
    }

    const entities = await getEntitiesInEmail(email.content || '');
    res.json({ entities });
  } catch (error) {
    console.error('Error fetching email entities:', error);
    next(error);
  }
});

// Known entity senders for UI display
router.get('/known-senders', async (_req, res) => {
  res.json(getKnownEntitySenders());
});

router.get('/', async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 50));
    const offset = (page - 1) * limit;
    const category = (req.query.category as EmailCategory) || 'all';
    const search = (req.query.search as string) || '';

    const db = getDb();

    // Build category filter
    const categoryFilter =
      category !== 'all' ? buildCategoryWhereClause(category) : { clause: '', isComplex: false };

    // Build search filter
    let searchClause = '';
    if (search) {
      searchClause = `
        AND (
          file_name LIKE '%' || @search || '%'
          OR json_extract(metadata_json, '$.from') LIKE '%' || @search || '%'
          OR json_extract(metadata_json, '$.to') LIKE '%' || @search || '%'
          OR json_extract(metadata_json, '$.subject') LIKE '%' || @search || '%'
          OR content LIKE '%' || @search || '%'
        )
      `;
    }

    // Query for emails - optimized to only fetch snippet portion of content
    const query = `
      SELECT 
        id,
        file_name as subject,
        file_path,
        date_created as date,
        substr(content, 1, 250) as snippet,
        metadata_json,
        'email' as type,
        0 as hasAttachments
      FROM documents 
      WHERE evidence_type = 'email'
      ${categoryFilter.clause}
      ${searchClause}
      ORDER BY date_created DESC
      LIMIT @limit OFFSET @offset
    `;

    const countQuery = `
      SELECT COUNT(*) as total
      FROM documents 
      WHERE evidence_type = 'email'
      ${categoryFilter.clause}
      ${searchClause}
    `;

    const params = { limit, offset, search: search || '' };
    const emails = db.prepare(query).all(params) as any[];
    const totalResult = db.prepare(countQuery).get(params) as { total: number };

    // Process emails to match expected frontend format
    // The frontend likely expects: id, subject, from, to, date, snippet, attachments
    const processedEmails = emails.map((email) => {
      let metadata: any = {};
      try {
        metadata = JSON.parse(email.metadata_json || '{}');
      } catch {
        // Invalid JSON - use empty metadata object
      }

      // Truncate content for snippet
      const content = email.snippet || '';
      const snippet = content.length > 200 ? content.substring(0, 200) + '...' : content;

      // Classify the email
      const from = metadata.from || 'Unknown Sender';
      const subj = metadata.subject || email.subject || 'No Subject';
      const classification = classifyEmail(from, subj, email.snippet);

      return {
        id: email.id,
        subject: subj,
        from: from,
        to: metadata.to || 'Unknown Recipient',
        date: metadata.sent || email.date,
        snippet: snippet,
        hasAttachments: false,
        folder: 'inbox',
        isRead: true,
        labels: [],
        // Classification data
        category: classification.category,
        isFromKnownEntity: classification.isFromKnownEntity,
        knownEntityName: classification.knownEntityName,
      };
    });

    res.json({
      data: processedEmails,
      total: totalResult.total,
      page,
      pageSize: limit,
      totalPages: Math.ceil(totalResult.total / limit),
    });
  } catch (error) {
    console.error('Error fetching emails:', error);
    next(error);
  }
});

export default router;
