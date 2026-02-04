import { getDb } from './connection.js';

export const documentsRepository = {
  getDocuments: (
    page: number = 1,
    limit: number = 50,
    filters: {
      search?: string;
      fileType?: string;
      evidenceType?: string;
      minRedFlag?: number;
      maxRedFlag?: number;
      sortBy?: string;
    } = {},
  ) => {
    const db = getDb();
    const whereConditions: string[] = [];
    const params: any[] = [];

    if (filters.search && filters.search.trim()) {
      try {
        // Simple check if table exists (cached or checked once)
        // For now, just try-catch the query construction later?
        // Better to assume FTS if we are in "production" mode or fallback.
        // Let's stick to LIKE for simple browse, but if search term is complex, FTS is better.
        // For now, I'll keep LIKE for robustness as per previous patterns unless I can guarantee FTS table.
        whereConditions.push('(file_name LIKE ? OR content LIKE ?)');
        const searchPattern = `%${filters.search.trim()}%`;
        params.push(searchPattern, searchPattern);
      } catch (_e) {
        // Fallback
      }
    }

    if (filters.fileType && filters.fileType !== 'all') {
      const types = filters.fileType.split(',');
      whereConditions.push(`file_type IN (${types.map(() => '?').join(',')})`);
      params.push(...types);
    }

    if (filters.evidenceType && filters.evidenceType !== 'all') {
      whereConditions.push('evidence_type = ?');
      params.push(filters.evidenceType);
    }

    if (filters.minRedFlag || filters.maxRedFlag) {
      const min = filters.minRedFlag || 0;
      const max = filters.maxRedFlag || 5;
      whereConditions.push(
        '(red_flag_rating IS NULL OR (red_flag_rating >= ? AND red_flag_rating <= ?))',
      );
      params.push(min, max);
    }

    // Default to hiding child pages unless specifically requested or searching deeply
    if (!filters.search) {
      // whereConditions.push('(is_hidden = 0 OR is_hidden IS NULL)');
      // Temporarily disable hiding pages to debug email count regression (Issue #4769)
      // Many emails might be marked as hidden pages incorrectly?
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

    let orderByClause = 'ORDER BY ';
    switch (filters.sortBy) {
      case 'date':
        orderByClause += 'date_created DESC';
        break;
      case 'title':
        orderByClause += 'file_name ASC';
        break;
      case 'red_flag':
      default:
        orderByClause += 'red_flag_rating DESC, date_created DESC';
        break;
    }

    const offset = (page - 1) * limit;

    const countQuery = `SELECT COUNT(*) as total FROM documents ${whereClause}`;
    const totalResult = db.prepare(countQuery).get(...params) as { total: number };

    const sql = `
      SELECT 
        id,
        file_name as fileName,
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
        content_hash as contentHash,
        file_name as title
      FROM documents
      ${whereClause}
      ${orderByClause}
      LIMIT ? OFFSET ?
    `;

    const documents = db.prepare(sql).all(...params, limit, offset);

    return {
      documents: documents.map((doc: any) => {
        let metadata = {};
        try {
          if (typeof doc.metadata === 'string') {
            metadata = JSON.parse(doc.metadata);
          } else if (typeof doc.metadata === 'object') {
            metadata = doc.metadata;
          }
        } catch (_e) {
          /* ignore */
        }
        return { ...doc, metadata };
      }),
      total: totalResult.total,
      page,
      pageSize: limit,
      totalPages: Math.ceil(totalResult.total / limit),
    };
  },

  // Get document by ID with full content
  getDocumentById: (id: string): any | null => {
    const db = getDb();

    const query = `
      SELECT 
        d.id,
        d.file_name as fileName,
        d.file_path as filePath,
        d.file_type as fileType,
        d.file_size as fileSize,
        d.date_created as dateCreated,
        d.content_hash as contentHash,
        d.word_count as wordCount,
        d.red_flag_rating as redFlagRating,
        d.metadata_json as metadataJson,
        d.content,
        d.title,
        d.evidence_type as evidenceType,
        d.original_file_id as originalFileId,
        d.unredaction_attempted as unredactionAttempted,
        d.unredaction_succeeded as unredactionSucceeded,
        d.redaction_coverage_before as redactionCoverageBefore,
        d.redaction_coverage_after as redactionCoverageAfter,
        d.unredacted_text_gain as unredactedTextGain,
        d.unredaction_baseline_vocab as unredactionBaselineVocab,
        COALESCE(orig.file_path, d.original_file_path) as original_file_path
      FROM documents d
      LEFT JOIN documents orig ON d.original_file_id = orig.id
      WHERE d.id = ?
    `;

    const document = db.prepare(query).get(id) as any;

    if (!document) return null;

    // Parse metadata if it's a JSON string
    if (document.metadataJson && typeof document.metadataJson === 'string') {
      try {
        document.metadata = JSON.parse(document.metadataJson);
      } catch (e) {
        console.error('Error parsing document metadata:', e);
        document.metadata = {};
      }
    }

    // Transform original_file_path to URL
    if (document && document.original_file_path) {
      // Assume /data/ is mapped to /files/data/ or similar.
      // The server maps RAW_CORPUS_BASE_PATH to /files.
      // If standard path is /data/originals/..., we want /files/originals/... if RAW_CORPUS_BASE_PATH is /data
      // OR if full path is /app/data/originals, and CORPUS is /app/data.
      // Safest bet for now: If it starts with /data/, map to /files/data/ (or just /files/ if it's relative).
      // Actually, looking at Timeline.tsx: event.original_file_path.replace('/data/originals/', '')
      // and href={`/files/${...}`}

      // Let's standardise on returning a usable URL path if possible, OR just passed the raw path and let frontend handle it?
      // The plan said "transform... into a web-accessible URL".

      const rawPath = document.original_file_path;
      // Quick fix for standard /data/originals structure
      if (rawPath.includes('/data/originals/')) {
        document.source_original_url = `/files/${rawPath.split('/data/originals/')[1]}`;
      } else {
        // Fallback or leave as is
        document.source_original_url = `/files/${rawPath}`;
      }
      // Also keep the raw path
    }

    return {
      ...document,
      source_collection: 'Epstein Files',
      // Ensure top-level access to the URL
      original_file_path: document.source_original_url || document.original_file_path,
      redaction_spans: db
        .prepare(`SELECT * FROM redaction_spans WHERE document_id = ? ORDER BY span_start ASC`)
        .all(id),
      claims: db
        .prepare(
          `SELECT ct.*, s.full_name as subject_name, o.full_name as object_name 
           FROM claim_triples ct
           LEFT JOIN entities s ON ct.subject_entity_id = s.id
           LEFT JOIN entities o ON ct.object_entity_id = o.id
           WHERE ct.document_id = ? 
           ORDER BY ct.confidence DESC`,
        )
        .all(id),
      sentences: db
        .prepare(
          `SELECT id, sentence_index, sentence_text, is_boilerplate, signal_score 
           FROM document_sentences 
           WHERE document_id = ? 
           ORDER BY sentence_index ASC`,
        )
        .all(id),
      unredaction_metrics: {
        attempted: Boolean(document.unredactionAttempted),
        succeeded: Boolean(document.unredactionSucceeded),
        redactionCoverageBefore: document.redactionCoverageBefore,
        redactionCoverageAfter: document.redactionCoverageAfter,
        unredactedTextGain: document.unredactedTextGain,
        baselineVocab: document.unredactionBaselineVocab || null,
      },
    };
  },

  search: (query: string, limit: number = 50) => {
    // FTS or LIKE search
    // documentsRepository.getDocuments implies filters, but FTS logic often separate.
    // documentsRepository.getDocuments implies filters, but FTS logic often separate.
    const db = getDb();
    // If documents_fts exists, use it? Currently it's broken or not reliable without title triggers.
    // Fallback to LIKE
    const sql = `
        SELECT id, file_name, substr(content, 1, 300) as contentPreview 
        FROM documents 
        WHERE content LIKE ? OR file_name LIKE ? 
        LIMIT ?
     `;
    const pattern = `%${query}%`;
    return db.prepare(sql).all(pattern, pattern, limit);
  },
};
