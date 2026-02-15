import { getDb } from './connection.js';

const PREVIEW_MAX_CHARS = 320;

const OCR_NOISE_PATTERNS = [
  /textify-ocr/gi,
  /temp[-_]/gi,
  /\bEFTA\d{3,}\b/g,
  /\b[A-Z]{2,}\d{4,}\b/g,
  /[_]{2,}/g,
];

const deriveHumanTitle = (rawTitle: string): string => {
  const stripped = rawTitle
    .replace(/\.[a-z0-9]{2,5}$/i, '')
    .replace(/textify-ocr/gi, ' ')
    .replace(/temp[-_]/gi, ' ')
    .replace(/[_-]+/g, ' ')
    .replace(/\b\d{6,}\b/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  if (!stripped) return 'Untitled document';

  const lower = stripped.toLowerCase();
  if (lower.includes('deposition')) return 'Deposition transcript';
  if (lower.includes('flight') && lower.includes('log')) return 'Flight log';
  if (lower.includes('black') && lower.includes('book')) return 'Black book page';
  if (lower.includes('email') || lower.includes('message')) return 'Email correspondence';
  if (lower.includes('doj') || lower.includes('justice')) return 'DOJ filing';
  return stripped.slice(0, 96);
};

const looksLikeJunk = (text: string): boolean => {
  if (!text) return true;
  const sample = text.trim().slice(0, 900);
  if (sample.length < 28) return true;

  const digits = (sample.match(/\d/g) || []).length;
  const letters = (sample.match(/[a-z]/gi) || []).length;
  const underscores = (sample.match(/_/g) || []).length;
  const longRuns = (sample.match(/[A-Za-z0-9]{32,}/g) || []).length;
  const idNoiseHits = OCR_NOISE_PATTERNS.reduce(
    (acc, pattern) => acc + ((sample.match(pattern) || []).length > 0 ? 1 : 0),
    0,
  );
  const words = sample.split(/\s+/).filter(Boolean);
  const alphaWords = words.filter((w) => /[a-z]{3,}/i.test(w)).length;
  const dictishRatio = words.length > 0 ? alphaWords / words.length : 0;
  const symbolNoise = (sample.match(/[|~`^<>]{2,}/g) || []).length;

  return (
    underscores / sample.length > 0.035 ||
    digits > letters * 1.1 ||
    longRuns > 0 ||
    idNoiseHits >= 2 ||
    dictishRatio < 0.42 ||
    symbolNoise > 0
  );
};

const firstMeaningfulExcerpt = (text: string): string => {
  const paragraphs = text
    .replace(/\s+/g, ' ')
    .split(/(?<=[.?!])\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 35);

  const candidate =
    paragraphs.find((line) => !looksLikeJunk(line)) || text.slice(0, PREVIEW_MAX_CHARS);
  return candidate.slice(0, PREVIEW_MAX_CHARS).trim();
};

const normalizeSourceType = (evidenceType?: string | null, fileType?: string | null): string => {
  const value = (evidenceType || fileType || 'document').toLowerCase();
  if (value.includes('email')) return 'Email';
  if (value.includes('legal')) return 'Legal';
  if (value.includes('deposition')) return 'Deposition';
  if (value.includes('photo') || value.includes('image')) return 'Photo';
  if (value.includes('financial')) return 'Financial';
  if (value.includes('flight')) return 'Flight';
  return 'Document';
};

const buildPreview = (doc: {
  title?: string | null;
  fileName?: string | null;
  contentRefined?: string | null;
  cleanedText?: string | null;
  contentPreview?: string | null;
  metadata?: Record<string, any>;
}) => {
  const curatedTitle =
    typeof doc.title === 'string' && doc.title.trim() && doc.title !== doc.fileName
      ? doc.title.trim()
      : '';
  const title = curatedTitle || deriveHumanTitle(doc.fileName || 'Untitled document');

  const refined = (doc.contentRefined || '').trim();
  const cleaned = (doc.cleanedText || '').trim();
  const raw = (doc.contentPreview || '').trim();
  const aiSummary =
    (typeof doc.metadata?.ai_summary === 'string' && doc.metadata.ai_summary.trim()) ||
    (typeof doc.metadata?.summary === 'string' && doc.metadata.summary.trim()) ||
    '';

  if (refined && !looksLikeJunk(refined)) {
    return { title, previewText: firstMeaningfulExcerpt(refined), previewKind: 'excerpt' as const };
  }
  if (cleaned && !looksLikeJunk(cleaned)) {
    return { title, previewText: firstMeaningfulExcerpt(cleaned), previewKind: 'excerpt' as const };
  }
  if (aiSummary) {
    return {
      title,
      previewText: aiSummary.slice(0, PREVIEW_MAX_CHARS),
      previewKind: 'ai_summary' as const,
    };
  }
  if (raw && !looksLikeJunk(raw)) {
    return { title, previewText: firstMeaningfulExcerpt(raw), previewKind: 'excerpt' as const };
  }

  return {
    title,
    previewText: 'OCR-heavy document; open to view extracted text.',
    previewKind: 'fallback' as const,
  };
};

export const documentsRepository = {
  getDocuments: (
    page: number = 1,
    limit: number = 50,
    filters: {
      search?: string;
      fileType?: string;
      evidenceType?: string;
      source?: string;
      startDate?: string;
      endDate?: string;
      hasFailedRedactions?: boolean;
      minRedFlag?: number;
      maxRedFlag?: number;
      sortBy?: string;
      sortOrder?: 'asc' | 'desc';
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

    if (filters.source && filters.source !== 'all') {
      const sources = filters.source
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
      if (sources.length > 0) {
        whereConditions.push(`source_collection IN (${sources.map(() => '?').join(',')})`);
        params.push(...sources);
      }
    }

    if (filters.startDate) {
      whereConditions.push('date_created >= ?');
      params.push(filters.startDate);
    }
    if (filters.endDate) {
      whereConditions.push('date_created <= ?');
      params.push(filters.endDate);
    }

    if (filters.hasFailedRedactions) {
      whereConditions.push('has_failed_redactions = 1');
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

    const sortOrder = filters.sortOrder === 'asc' ? 'ASC' : 'DESC';
    let orderByClause = 'ORDER BY ';
    switch (filters.sortBy) {
      case 'date':
        orderByClause += `date_created ${sortOrder}`;
        break;
      case 'title':
        orderByClause += 'file_name ASC';
        break;
      case 'red_flag':
      default:
        orderByClause += `red_flag_rating DESC, date_created ${sortOrder}`;
        break;
    }

    const offset = (page - 1) * limit;

    const countQuery = `SELECT COUNT(*) as total FROM documents ${whereClause}`;
    const totalResult = db.prepare(countQuery).get(...params) as { total: number };

    const sql = `
      SELECT 
        id,
        file_name as fileName,
        file_type as fileType,
        file_size as fileSize,
        date_created as dateCreated,
        substr(content, 1, 1800) as contentPreview,
        evidence_type as evidenceType,
        content_refined as contentRefined,
        metadata_json as metadata,
        word_count as wordCount,
        red_flag_rating as redFlagRating,
        COALESCE(NULLIF(title, ''), file_name) as title,
        source_collection as sourceCollection,
        (SELECT COUNT(DISTINCT em.entity_id) FROM entity_mentions em WHERE em.document_id = documents.id) as entitiesCount
      FROM documents
      ${whereClause}
      ${orderByClause}
      LIMIT ? OFFSET ?
    `;

    const rawDocuments = db.prepare(sql).all(...params, limit, offset) as Array<
      Record<string, any>
    >;

    const docIds = rawDocuments.map((doc) => Number(doc.id)).filter((id) => Number.isFinite(id));
    const entitiesByDoc = new Map<number, string[]>();

    if (docIds.length > 0) {
      const placeholders = docIds.map(() => '?').join(',');
      const entityRows = db
        .prepare(
          `
          WITH ranked_entities AS (
            SELECT
              em.document_id as documentId,
              e.full_name as entityName,
              COUNT(*) as mentionCount,
              ROW_NUMBER() OVER (
                PARTITION BY em.document_id
                ORDER BY COUNT(*) DESC, e.full_name ASC
              ) as rankWithinDoc
            FROM entity_mentions em
            JOIN entities e ON e.id = em.entity_id
            WHERE em.document_id IN (${placeholders})
            GROUP BY em.document_id, e.id, e.full_name
          )
          SELECT documentId, entityName
          FROM ranked_entities
          WHERE rankWithinDoc <= 3
          ORDER BY documentId ASC, rankWithinDoc ASC
        `,
        )
        .all(...docIds) as Array<{ documentId: number; entityName: string }>;

      for (const row of entityRows) {
        const existing = entitiesByDoc.get(row.documentId) || [];
        existing.push(row.entityName);
        entitiesByDoc.set(row.documentId, existing);
      }
    }

    return {
      documents: rawDocuments.map((doc: any) => {
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
        const preview = buildPreview({
          title: doc.title,
          fileName: doc.fileName,
          contentRefined: doc.contentRefined,
          contentPreview: doc.contentPreview,
          metadata,
        });
        const entityCount = Number(doc.entitiesCount || 0);
        const sourceType = normalizeSourceType(doc.evidenceType, doc.fileType);
        const whyFlagged =
          entityCount >= 8
            ? `High significance from dense entity mentions (${entityCount}).`
            : Number(doc.redFlagRating || 0) >= 4
              ? 'High significance due to elevated risk scoring.'
              : 'High significance due to risk scoring and entity density.';

        return {
          id: String(doc.id),
          fileName: doc.fileName,
          title: preview.title,
          fileType: doc.fileType,
          fileSize: doc.fileSize || 0,
          dateCreated: doc.dateCreated,
          evidenceType: doc.evidenceType || 'document',
          metadata,
          redFlagRating: doc.redFlagRating || 0,
          wordCount: doc.wordCount || 0,
          entitiesCount: entityCount,
          keyEntities: entitiesByDoc.get(Number(doc.id)) || [],
          sourceType,
          previewText: preview.previewText,
          previewKind: preview.previewKind,
          whyFlagged,
          entities_count: entityCount,
          key_entities: entitiesByDoc.get(Number(doc.id)) || [],
          source_type: sourceType,
          preview_text: preview.previewText,
          preview_kind: preview.previewKind,
          why_flagged: whyFlagged,
        };
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
        d.content_refined as contentRefined,
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

    // Hydrate entity evidence for document viewers (entities tab / evidence context).
    // This was dropped during schema transitions, causing empty evidence tabs.
    const entityRows = db
      .prepare(
        `
      SELECT
        e.id as entityId,
        e.full_name as name,
        COALESCE(e.entity_type, e.type, 'unknown') as entityType,
        COALESCE(e.red_flag_rating, 0) as redFlagRating,
        COUNT(*) as mentions
      FROM entity_mentions em
      JOIN entities e ON e.id = em.entity_id
      WHERE em.document_id = ?
      GROUP BY e.id, e.full_name, e.entity_type, e.type, e.red_flag_rating
      ORDER BY mentions DESC, redFlagRating DESC, e.full_name ASC
      LIMIT 200
    `,
      )
      .all(id) as Array<{
      entityId: number;
      name: string;
      entityType: string;
      redFlagRating: number;
      mentions: number;
    }>;

    const entities = entityRows.map((row) => {
      const contextRows = db
        .prepare(
          `
        SELECT mention_context
        FROM entity_mentions
        WHERE document_id = ? AND entity_id = ? AND mention_context IS NOT NULL AND mention_context != ''
        LIMIT 3
      `,
        )
        .all(id, row.entityId) as Array<{ mention_context: string }>;

      const significance =
        row.mentions >= 20 ? 'high' : row.mentions >= 5 ? 'medium' : ('low' as const);

      return {
        id: row.entityId,
        name: row.name,
        type: row.entityType,
        mentions: row.mentions,
        significance,
        contexts: contextRows.map((c) => ({
          context: c.mention_context,
          source: document.source_collection || 'Document',
        })),
      };
    });

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
      entities,
      mentionedEntities: entities,
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
