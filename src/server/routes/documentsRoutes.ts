import { Router } from 'express';
import { documentsRepository } from '../db/documentsRepository.js';
import { documentPagesRepository } from '../db/documentPagesRepository.js';
import { authenticateRequest } from '../auth/middleware.js';
import { z } from 'zod';
import { validate } from '../middleware/validate.js';

const router = Router();

const documentIdSchema = z.object({
  params: z.object({
    id: z.string().min(1),
  }),
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
