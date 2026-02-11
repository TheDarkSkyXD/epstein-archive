import { Router } from 'express';

const router = Router();

// Relationships API
router.get('/', async (req, res, next) => {
  try {
    const entityId = req.query.entityId as string;
    if (!entityId) {
      return res.status(400).json({ error: 'entityId is required' });
    }

    const { relationshipsRepository } = await import('../db/relationshipsRepository.js');
    const limit = parseInt(req.query.limit as string) || 50;

    const relations = relationshipsRepository.getRelationships(entityId, {
      minWeight: req.query.minWeight ? parseFloat(req.query.minWeight as string) : undefined,
    });

    const mapped = relations.slice(0, limit).map((r) => ({
      entity_id: r.target_id,
      related_entity_id: r.target_id,
      relationship_type: r.relationship_type,
      strength: r.proximity_score,
      confidence: r.confidence,
      weight: r.proximity_score,
    }));

    res.json({ relationships: mapped });
  } catch (error) {
    next(error);
  }
});

export default router;
