import { Router, Request, Response } from 'express';
import { entityEvidenceRepository } from '../server/db/entityEvidenceRepository.js';

const router = Router();

// GET /api/entities/:id/evidence
router.get('/:entityId/evidence', async (req: Request, res: Response) => {
  try {
    const { entityId } = req.params as { entityId: string };
    const result = await entityEvidenceRepository.getEntityMentionEvidence(entityId);

    if (!result) {
      return res.status(404).json({ error: 'Entity not found' });
    }

    res.json(result);
  } catch (error) {
    console.error('Error fetching entity mention evidence:', error);
    res.status(500).json({ error: 'Failed to fetch entity evidence' });
  }
});

// GET /api/entities/:id/relations
router.get('/:entityId/relations', async (req: Request, res: Response) => {
  try {
    const { entityId } = req.params as { entityId: string };
    const result = await entityEvidenceRepository.getRelationEvidenceForEntity(entityId);
    res.json(result);
  } catch (error) {
    console.error('Error fetching entity relation evidence:', error);
    res.status(500).json({ error: 'Failed to fetch relation evidence' });
  }
});

// GET /api/entities/:id/graph
router.get('/:entityId/graph', async (req: Request, res: Response) => {
  try {
    const { entityId } = req.params as { entityId: string };
    const dbEntityId = parseInt(entityId, 10);
    if (Number.isNaN(dbEntityId)) {
      return res.status(400).json({ error: 'Invalid entity id' });
    }

    // Use the shared relationshipsRepository graph slice so analytics and
    // UI graph components stay consistent.
    const { relationshipsRepository } = await import('../server/db/relationshipsRepository.js');
    const graph = relationshipsRepository.getGraphSlice(dbEntityId, 2);
    res.json(graph);
  } catch (error) {
    console.error('Error fetching entity graph:', error);
    res.status(500).json({ error: 'Failed to fetch entity graph' });
  }
});

export default router;
