import { Router } from 'express';
import { documentsRepository } from '../db/documentsRepository.js';
import { documentPagesRepository } from '../db/documentPagesRepository.js';
import { authenticateRequest } from '../auth/middleware.js';
import { z } from 'zod';
import { validate } from '../middleware/validate.js';
import { mapDocumentsListResponseDto } from '../mappers/documentsDtoMapper.js';

const router = Router();

const documentsListQuerySchema = z.object({
  query: z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(200).default(50),
    search: z.string().optional(),
    fileType: z.string().optional(),
    evidenceType: z.string().optional(),
    source: z.string().optional(),
    startDate: z.string().optional(),
    endDate: z.string().optional(),
    hasFailedRedactions: z
      .preprocess(
        (val) =>
          typeof val === 'string'
            ? val.toLowerCase() === 'true'
            : typeof val === 'boolean'
              ? val
              : undefined,
        z.boolean().optional(),
      )
      .optional(),
    minRedFlag: z.coerce.number().int().min(0).max(5).optional(),
    maxRedFlag: z.coerce.number().int().min(0).max(5).optional(),
    sortBy: z.string().optional(),
    sortOrder: z.enum(['asc', 'desc']).optional(),
  }),
});

const documentIdSchema = z.object({
  params: z.object({
    id: z.string().min(1),
  }),
});

// GET /api/documents
router.get('/', authenticateRequest, validate(documentsListQuerySchema), async (req, res, next) => {
  try {
    const query = req.query as any;
    const page = Number(query.page || 1);
    const limit = Number(query.limit || 50);
    const result = await documentsRepository.getDocuments(page, limit, {
      search: query.search,
      fileType: query.fileType,
      evidenceType: query.evidenceType,
      source: query.source,
      startDate: query.startDate,
      endDate: query.endDate,
      hasFailedRedactions:
        typeof query.hasFailedRedactions === 'boolean' ? query.hasFailedRedactions : undefined,
      minRedFlag: query.minRedFlag,
      maxRedFlag: query.maxRedFlag,
      sortBy: query.sortBy,
      sortOrder: query.sortOrder,
    });
    res.json(mapDocumentsListResponseDto(result));
  } catch (error) {
    next(error);
  }
});

// GET /api/documents/:id/pages
router.get(
  '/:id/pages',
  authenticateRequest,
  validate(documentIdSchema),
  async (req, res, next) => {
    try {
      const { id } = req.params;
      const result = await documentPagesRepository.getDocumentPages(id);
      res.json(result);
    } catch (error) {
      next(error);
    }
  },
);

// GET /api/documents/:id/redactions
router.get(
  '/:id/redactions',
  authenticateRequest,
  validate(documentIdSchema),
  async (req, res, next) => {
    try {
      const { id } = req.params;
      const doc = await documentsRepository.getDocumentById(id);
      if (!doc) return res.status(404).json({ error: 'Document not found' });

      res.json({
        hasFailedRedactions: Boolean(doc.redaction_spans?.length > 0),
        count: doc.redaction_spans?.length || 0,
        redactions: (doc.redaction_spans || []).map((s: any) => ({
          page: s.page_index || 1,
          text: s.original_text || '',
          bbox: s.bbox || [0, 0, 0, 0],
        })),
      });
    } catch (error) {
      next(error);
    }
  },
);

// GET /api/documents/:id (Alias to evidence route behavior if needed, or redirect)
router.get('/:id', authenticateRequest, validate(documentIdSchema), async (req, res, next) => {
  try {
    const { id } = req.params;
    const doc = await documentsRepository.getDocumentById(id);
    if (!doc) return res.status(404).json({ error: 'Document not found' });
    res.json(doc);
  } catch (error) {
    next(error);
  }
});

export default router;
