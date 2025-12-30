import express from 'express';
import { getDb } from '../db/connection.js';

const router = express.Router();

router.get('/', async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 50));
    const offset = (page - 1) * limit;

    const db = getDb();
    
    // Query for emails - optimized to only fetch snippet portion of content
    const query = `
      SELECT 
        id,
        file_name as subject, -- using filename as subject for now if metadata subject is missing
        file_path,
        date_created as date,
        substr(content, 1, 250) as snippet, -- only fetch first 250 chars for speed
        metadata_json,
        'email' as type,
        0 as hasAttachments -- placeholder
      FROM documents 
      WHERE evidence_type = 'email'
      ORDER BY date_created DESC
      LIMIT ? OFFSET ?
    `;

    const countQuery = `
      SELECT COUNT(*) as total
      FROM documents 
      WHERE evidence_type = 'email'
    `;

    const emails = db.prepare(query).all(limit, offset) as any[];
    const totalResult = db.prepare(countQuery).get() as { total: number };

    // Process emails to match expected frontend format
    // The frontend likely expects: id, subject, from, to, date, snippet, attachments
    const processedEmails = emails.map(email => {
      let metadata: any = {};
      try {
        metadata = JSON.parse(email.metadata_json || '{}');
      } catch (e) {}

      // Truncate content for snippet
      const content = email.snippet || '';
      const snippet = content.length > 200 ? content.substring(0, 200) + '...' : content;

      return {
        id: email.id,
        subject: metadata.subject || email.subject || 'No Subject',
        from: metadata.from || 'Unknown Sender',
        to: metadata.to || 'Unknown Recipient',
        date: metadata.sent || email.date, // Use metadata date if available
        snippet: snippet,
        hasAttachments: false, // Default for now
        folder: 'inbox', // Default folder
        isRead: true,    // Default status
        labels: []
      };
    });

    res.json({
      data: processedEmails,
      total: totalResult.total,
      page,
      pageSize: limit,
      totalPages: Math.ceil(totalResult.total / limit)
    });

  } catch (error) {
    console.error('Error fetching emails:', error);
    next(error);
  }
});

export default router;
