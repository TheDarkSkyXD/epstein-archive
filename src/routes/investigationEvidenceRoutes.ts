import { Router, Request, Response } from 'express';
import { databaseService } from '../services/DatabaseService.js';

const router = Router();

/**
 * GET /api/investigation/evidence/:entityId
 * Get evidence summary for a specific entity
 */
router.get('/evidence/:entityId', async (req: Request, res: Response) => {
  try {
    const { entityId } = req.params;

    const result = await databaseService.getEntityEvidence(entityId);

    if (!result) {
      return res.status(404).json({ error: 'Entity not found' });
    }

    res.json(result);
  } catch (error) {
    console.error('Error fetching entity evidence:', error);
    res.status(500).json({ error: 'Failed to fetch entity evidence' });
  }
});

/**
 * POST /api/investigation/add-evidence
 * Add evidence to an investigation session
 */
router.post('/add-evidence', async (req: Request, res: Response) => {
  try {
    const { investigationId, evidenceId, notes, relevance } = req.body;
    if (!investigationId || !evidenceId) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    const result = await databaseService.addEvidenceToInvestigation(
      investigationId,
      evidenceId,
      notes,
      relevance,
    );
    res.json({ success: true, ...result });
  } catch (error: any) {
    if (error.message === 'Evidence not found') {
      return res.status(404).json({ error: 'Evidence not found' });
    }
    console.error('Error adding evidence to investigation:', error);
    res.status(500).json({ error: 'Failed to add evidence to investigation' });
  }
});

router.post('/add-media', async (req: Request, res: Response) => {
  try {
    const { investigationId, mediaItemId, notes, relevance } = req.body;
    if (!investigationId || !mediaItemId) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    const result = await databaseService.addMediaToInvestigation(
      investigationId,
      mediaItemId,
      notes,
      relevance,
    );
    res.json({ success: true, ...result });
  } catch (error: any) {
    if (error.message === 'Media not found') {
      return res.status(404).json({ error: 'Media not found' });
    }
    console.error('Error adding media to investigation:', error);
    res.status(500).json({ error: 'Failed to add media to investigation' });
  }
});

/**
 * POST /api/investigation/add-snippet
 * Add a text snippet from a document to an investigation
 */
router.post('/add-snippet', async (req: Request, res: Response) => {
  try {
    const { investigationId, documentId, snippetText, notes, relevance } = req.body;
    if (!investigationId || !documentId || !snippetText) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    const result = await databaseService.addSnippetToInvestigation(
      investigationId,
      documentId,
      snippetText,
      notes,
      relevance,
    );
    res.json({ success: true, ...result });
  } catch (error: any) {
    if (error.message === 'Document not found') {
      return res.status(404).json({ error: 'Document not found' });
    }
    console.error('Error adding snippet to investigation:', error);
    res.status(500).json({ error: 'Failed to add snippet to investigation' });
  }
});
/**
 * GET /api/investigation/:investigationId/evidence-summary
 * Get evidence summary for an investigation
 */
router.get('/:investigationId/evidence-summary', async (req: Request, res: Response) => {
  try {
    const { investigationId } = req.params;

    const result = await databaseService.getInvestigationEvidenceSummary(investigationId);

    res.json(result);
  } catch (error) {
    console.error('Error fetching investigation evidence summary:', error);
    res.status(500).json({ error: 'Failed to fetch investigation evidence summary' });
  }
});

/**
 * DELETE /api/investigation/remove-evidence/:investigationEvidenceId
 * Remove evidence from an investigation
 */
router.delete('/remove-evidence/:investigationEvidenceId', async (req: Request, res: Response) => {
  try {
    const { investigationEvidenceId } = req.params;

    const success = await databaseService.removeEvidenceFromInvestigation(investigationEvidenceId);

    res.json({ success });
  } catch (error) {
    console.error('Error removing evidence from investigation:', error);
    res.status(500).json({ error: 'Failed to remove evidence from investigation' });
  }
});

export default router;
