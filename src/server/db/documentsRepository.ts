import { db, documentsQueries } from '@epstein/db';

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
  getDocuments: async (
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
    const offset = (page - 1) * limit;
    const search = filters.search?.trim() || null;
    const fileTypes =
      filters.fileType && filters.fileType !== 'all' ? filters.fileType.split(',') : null;
    const sources =
      filters.source && filters.source !== 'all'
        ? filters.source.split(',').map((s) => s.trim())
        : null;

    const docs = await documentsQueries.getDocuments.run(
      {
        search: search ? `%${search}%` : null,
        fileTypes,
        evidenceType:
          filters.evidenceType && filters.evidenceType !== 'all' ? filters.evidenceType : null,
        sources,
        startDate: filters.startDate || null,
        endDate: filters.endDate || null,
        hasFailedRedactions: filters.hasFailedRedactions ? 1 : null,
        minRedFlag: filters.minRedFlag || null,
        maxRedFlag: filters.maxRedFlag || null,
        sortBy: filters.sortBy || 'red_flag',
        limit: BigInt(limit),
        offset: BigInt(offset),
      },
      db,
    );

    const countResult = await documentsQueries.countDocuments.run(
      {
        search: search ? `%${search}%` : null,
        fileTypes,
        evidenceType:
          filters.evidenceType && filters.evidenceType !== 'all' ? filters.evidenceType : null,
        sources,
      },
      db,
    );

    const total = Number(countResult[0]?.total || 0);

    const transformedDocs = await Promise.all(
      docs.map(async (doc) => {
        const metadata =
          typeof doc.metadata === 'string' ? JSON.parse(doc.metadata) : doc.metadata || {};
        const preview = buildPreview({
          title: doc.title,
          fileName: doc.fileName,
          contentRefined: doc.contentRefined,
          contentPreview: (doc as any).contentPreview || '',
          metadata,
        });

        // Get top entities
        const entities = await documentsQueries.getDocumentEntities.run(
          { documentId: Number(doc.id) },
          db,
        );
        const entityCount = entities.reduce((acc, e) => acc + Number(e.mentions), 0);
        const keyEntities = entities.slice(0, 3).map((e) => e.name || 'Unknown');

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
          fileSize: Number(doc.fileSize || 0),
          dateCreated: doc.dateCreated,
          evidenceType: doc.evidenceType || 'document',
          metadata,
          redFlagRating: Number(doc.redFlagRating || 0),
          wordCount: Number(doc.wordCount || 0),
          entitiesCount: entityCount,
          keyEntities,
          sourceType,
          previewText: preview.previewText,
          previewKind: preview.previewKind,
          whyFlagged,
        };
      }),
    );

    return {
      documents: transformedDocs,
      total,
      page,
      pageSize: limit,
      totalPages: Math.ceil(total / limit),
    };
  },

  getDocumentById: async (id: string): Promise<any | null> => {
    const docId = Number(id);
    const rows = await documentsQueries.getDocumentById.run({ id: BigInt(docId) }, db);
    const document = rows[0];

    if (!document) return null;

    let metadata: any = {};
    if (document.metadataJson && typeof document.metadataJson === 'string') {
      try {
        metadata = JSON.parse(document.metadataJson);
      } catch (_e) {
        metadata = {};
      }
    } else if (document.metadataJson) {
      metadata = document.metadataJson;
    }

    const entityRows = await documentsQueries.getDocumentEntities.run({ documentId: docId }, db);

    const entities = [];
    for (const row of entityRows) {
      const contextRows = await documentsQueries.getMentionContexts.run(
        { documentId: docId, entityId: Number(row.entityId) },
        db,
      );

      const significance =
        Number(row.mentions) >= 20
          ? 'high'
          : Number(row.mentions) >= 5
            ? 'medium'
            : ('low' as const);

      entities.push({
        id: Number(row.entityId),
        name: row.name,
        type: row.entityType,
        mentions: Number(row.mentions),
        significance,
        contexts: contextRows.map((c) => ({
          context: c.mention_context,
          source: (document as any).source_collection || 'Document',
        })),
      });
    }

    const redactionSpans = await documentsQueries.getRedactionSpans.run({ documentId: docId }, db);
    const claims = await documentsQueries.getClaimTriples.run({ documentId: docId }, db);
    const sentences = await documentsQueries.getDocumentSentences.run({ documentId: docId }, db);

    const normalizedDocument = {
      ...document,
      id: String(document.id),
      fileName: document.fileName,
      filePath: document.filePath,
      fileType: document.fileType,
      fileSize: Number(document.fileSize || 0),
      dateCreated: document.dateCreated,
      evidenceType: document.evidenceType || 'document',
      content: document.content || '',
      contentRefined: document.content || '', // In PG version we only have content_refined usually
      metadata,
      redFlagRating: Number(document.redFlagRating || 0),
      wordCount: Number(document.wordCount || 0),
    };

    return {
      ...normalizedDocument,
      source_collection: 'Epstein Files',
      entities,
      mentionedEntities: entities,
      original_file_path: (document as any).original_file_path || (document as any).filePath,
      redaction_spans: redactionSpans.map((s) => ({
        ...s,
        id: Number(s.id),
        document_id: Number(s.document_id),
      })),
      claims: claims.map((c) => ({ ...c, id: Number(c.id), document_id: Number(c.document_id) })),
      sentences: sentences.map((s) => ({
        ...s,
        id: Number(s.id),
        document_id: Number(s.document_id),
      })),
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

  getRelatedDocuments: async (documentId: string, limit: number = 10) => {
    const docId = Number(documentId);
    const related = await documentsQueries.getRelatedDocuments.run(
      { documentId: docId, limit: BigInt(limit) },
      db,
    );

    return related.map((doc) => ({
      id: String(doc.id),
      title: doc.title,
      fileName: doc.fileName,
      fileType: doc.fileType,
      evidenceType: doc.evidenceType || 'document',
      redFlagRating: Number(doc.redFlagRating || 0),
      dateCreated: doc.dateCreated,
      sharedCount: Number(doc.sharedEntityCount),
      reasons: (doc.sharedEntitiesList || '')
        .split(',')
        .slice(0, 3)
        .map((name: string) => `Shared entity: ${name.trim()}`),
      sharedEntities: (doc.sharedEntitiesList || '')
        .split(',')
        .map((s) => s.trim())
        .slice(0, 5),
    }));
  },
};
