import { Router } from 'express';
import { mediaRepository } from '../db/mediaRepository.js';
import { cacheResponse } from '../utils/perfCache.js';
import crypto from 'crypto';
import { z } from 'zod';
import { validate } from '../middleware/validate.js';

const router = Router();

// Schemas
const batchAvatarsSchema = z.object({
  query: z.object({
    ids: z.string().min(1, 'ids parameter required'),
  }),
});

router.get(
  '/batch-avatars',
  cacheResponse(300),
  validate(batchAvatarsSchema),
  async (req, res, next) => {
    try {
      const idsStr = req.query.ids as string;
      const rawIds = idsStr.split(',').filter(Boolean);
      if (rawIds.length > 50) {
        return res.status(400).json({ error: 'Max 50 ids allowed per batch request' });
      }

      const items = await mediaRepository.getPhotosForEntities(rawIds);

      const formatted = items.map((m: any) => {
        const key = `${m.id}-${m.filePath}`;
        const etag = crypto.createHash('md5').update(key).digest('hex');
        return {
          entityId: String(m.entityId),
          url: `/api/entities/${m.entityId}/media`,
          etag,
        };
      });

      res.json({ items: formatted });
    } catch (error) {
      next(error);
    }
  },
);

export default router;
