import { Router, Request, Response } from 'express';
import { entityEvidenceRepository } from '../db/entityEvidenceRepository.js';

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

const getEntityGraph = async (req: Request, res: Response) => {
  try {
    const { entityId } = req.params as { entityId: string };
    const dbEntityId = parseInt(entityId, 10);
    if (Number.isNaN(dbEntityId)) {
      return res.status(400).json({ error: 'Invalid entity id' });
    }

    // Use the shared relationshipsRepository graph slice so analytics and
    // UI graph components stay consistent.
    const depth = req.query.depth
      ? Math.min(4, Math.max(1, parseInt(req.query.depth as string)))
      : 2;
    const { relationshipsRepository } = await import('../db/relationshipsRepository.js');
    const graph = relationshipsRepository.getGraphSlice(dbEntityId, depth);
    res.json(graph);
  } catch (error) {
    console.error('Error fetching entity graph:', error);
    res.status(500).json({ error: 'Failed to fetch entity graph' });
  }
};

// Canonical entity analytics route
router.get('/:entityId/analytics/graph', getEntityGraph);

// Legacy route alias (backward compatibility)
router.get('/:entityId/graph', getEntityGraph);

// GET /api/entities/:id/documents
router.get('/:entityId/documents', async (req: Request, res: Response) => {
  try {
    const { entityId } = req.params as { entityId: string };
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 50;
    const search = (req.query.search as string) || '';
    const source = (req.query.source as string) || 'all';
    const sort = (req.query.sort as string) || 'relevance';

    const { entitiesRepository } = await import('../db/entitiesRepository.js');

    // If no pagination requested and using legacy style, we could still support old way
    // But better to always return standardized format if we are refactoring.

    const docs = await entitiesRepository.getEntityDocumentsPaginated(entityId, page, limit, {
      search,
      source,
      sort,
    });
    const total = await entitiesRepository.getEntityDocumentCount(entityId);

    res.json({
      data: docs,
      total,
      page,
      limit,
    });
  } catch (error) {
    console.error('Error fetching entity documents:', error);
    res.status(500).json({ error: 'Failed to fetch entity documents' });
  }
});

// GET /api/entities/:id/investigations
router.get('/:entityId/investigations', async (req: Request, res: Response) => {
  try {
    const { entityId } = req.params as { entityId: string };
    const { investigationsRepository } = await import('../db/investigationsRepository.js');
    const result = await investigationsRepository.getInvestigationsByEntityId(entityId);
    res.json(result);
  } catch (error) {
    console.error('Error fetching entity investigations:', error);
    res.status(500).json({ error: 'Failed to fetch entity investigations' });
  }
});

export default router;
