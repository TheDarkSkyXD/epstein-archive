import { Router } from 'express';
import { documentsRepository } from '../db/documentsRepository.js';
import { documentPagesRepository } from '../db/documentPagesRepository.js';
import { z } from 'zod';
import { validate } from '../middleware/validate.js';
import { mapDocumentsListResponseDto } from '../mappers/documentsDtoMapper.js';
import fs from 'fs';
import path from 'path';

const router = Router();

const documentsListQuerySchema = z.object({
  query: z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(500).default(50),
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
    collectionId: z.string().optional(),
  }),
});

const documentIdSchema = z.object({
  params: z.object({
    id: z.string().min(1),
  }),
});

// GET /api/documents
router.get('/', validate(documentsListQuerySchema), async (req, res, next) => {
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
      collectionId: query.collectionId,
    });
    res.json(mapDocumentsListResponseDto(result));
  } catch (error) {
    next(error);
  }
});

// GET /api/documents/:id/pages
router.get('/:id/pages', validate(documentIdSchema), async (req, res, next) => {
  try {
    const { id } = req.params;
    const result = await documentPagesRepository.getDocumentPages(id);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

// GET /api/documents/:id/redactions
router.get('/:id/redactions', validate(documentIdSchema), async (req, res, next) => {
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
});

// GET /api/documents/:id/file
router.get('/:id/file', validate(documentIdSchema), async (req, res, next) => {
  try {
    const { id } = req.params;
    const variant = String((req.query as any).variant || 'dirty').toLowerCase();
    const doc = await documentsRepository.getDocumentById(id);
    if (!doc) return res.status(404).json({ error: 'Document not found' });

    const dirtyPath = (doc.filePath || (doc as any).file_path || '') as string;
    const originalPath = (doc.originalFilePath || (doc as any).original_file_path || '') as string;
    const cleanedPath = ((doc as any).cleanedPath ||
      (doc as any).cleaned_path ||
      (doc as any).metadata?.cleanedPath ||
      (doc as any).metadata?.cleaned_path ||
      '') as string;

    let selectedPath = dirtyPath;
    if (variant === 'original' && originalPath) selectedPath = originalPath;
    if (variant === 'cleaned' && cleanedPath) selectedPath = cleanedPath;

    if (!selectedPath) {
      return res.status(404).json({ error: 'No file path available for document' });
    }

    const dataRoot = path.resolve(process.cwd(), 'data');
    const normalizedRelative = selectedPath.replace(/^\/+/, '');
    const absolutePath = path.isAbsolute(selectedPath)
      ? selectedPath
      : path.resolve(process.cwd(), normalizedRelative);

    if (!absolutePath.startsWith(dataRoot)) {
      return res.status(400).json({ error: 'Invalid file path' });
    }

    if (!fs.existsSync(absolutePath)) {
      return res.status(404).json({ error: 'File not found on disk' });
    }

    res.setHeader('Content-Disposition', 'inline');
    return res.sendFile(absolutePath);
  } catch (error) {
    next(error);
  }
});

// GET /api/documents/:id (Alias to evidence route behavior if needed, or redirect)
router.get('/:id', validate(documentIdSchema), async (req, res, next) => {
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
