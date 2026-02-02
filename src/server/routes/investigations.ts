import { Router } from 'express';
import { investigationsRepository } from '../db/investigationsRepository.js';
import { authenticateRequest } from '../auth/middleware.js';

const router = Router();

// Get all investigations
// Get all investigations
router.get('/', async (req, res, next) => {
  try {
    const filters = {
      status: (req.query.status as string) || undefined,
      ownerId: (req.query.ownerId as string) || undefined,
      page: parseInt(req.query.page as string) || 1,
      limit: parseInt(req.query.limit as string) || 20,
    };

    const result = await investigationsRepository.getInvestigations(filters);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

// Find investigation by exact title
router.get('/by-title', async (req, res, next) => {
  try {
    const { title } = req.query as any;
    if (!title) return res.status(400).json({ error: 'title required' });
    const dbResult = await investigationsRepository.getInvestigations({ page: 1, limit: 5 } as any);
    const match = Array.isArray(dbResult?.data)
      ? dbResult.data.find((inv: any) => inv.title === String(title))
      : null;
    if (!match) return res.status(404).json({ error: 'Investigation not found' });
    res.json(match);
  } catch (error) {
    next(error);
  }
});

// Create investigation
router.post('/', authenticateRequest, async (req, res, next) => {
  try {
    const { title, description, scope, ownerId, collaboratorIds } = req.body;

    if (!title) {
      return res.status(400).json({ error: 'Title is required' });
    }

    // Default owner to current user if not specified
    const finalOwnerId = ownerId || (req as any).user?.id;

    const investigation = await investigationsRepository.createInvestigation({
      title,
      description,
      scope,
      ownerId: finalOwnerId,
      collaboratorIds,
    });

    res.status(201).json(investigation);
  } catch (error) {
    next(error);
  }
});

// Get single investigation
// Get single investigation
router.get('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    // Try by ID first, then UUID if it looks like one or if ID lookup fails
    let investigation = await investigationsRepository.getInvestigationById(id);

    if (!investigation) {
      investigation = await investigationsRepository.getInvestigationByUuid(id);
    }

    if (!investigation) {
      return res.status(404).json({ error: 'Investigation not found' });
    }

    res.json(investigation);
  } catch (error) {
    next(error);
  }
});

// Update investigation
router.put('/:id', authenticateRequest, async (req, res, next) => {
  try {
    const { id } = req.params as { id: string };
    const updates = req.body;

    const updated = await investigationsRepository.updateInvestigation(parseInt(id), updates);

    if (!updated) {
      return res.status(404).json({ error: 'Investigation not found' });
    }

    res.json(updated);
  } catch (error) {
    next(error);
  }
});

// Delete investigation
router.delete('/:id', authenticateRequest, async (req, res, next) => {
  try {
    const { id } = req.params as { id: string };
    const success = await investigationsRepository.deleteInvestigation(parseInt(id));

    if (!success) {
      return res.status(404).json({ error: 'Investigation not found' });
    }

    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

// --- Timeline Events ---

router.get('/:id/timeline-events', async (req, res, next) => {
  try {
    const { id } = req.params as { id: string };
    const events = await investigationsRepository.getTimelineEvents(parseInt(id));
    res.json(events);
  } catch (error) {
    next(error);
  }
});

router.post('/:id/timeline-events', authenticateRequest, async (req, res, next) => {
  try {
    const { id } = req.params as { id: string };
    const eventId = await investigationsRepository.addTimelineEvent(parseInt(id), req.body);
    res.status(201).json({ id: eventId, ...req.body });
  } catch (error) {
    next(error);
  }
});

router.patch('/:id/timeline-events/:eventId', authenticateRequest, async (req, res, next) => {
  try {
    const { eventId } = req.params as { eventId: string };
    const success = await investigationsRepository.updateTimelineEvent(parseInt(eventId), req.body);
    if (!success) return res.status(404).json({ error: 'Event not found' });
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

router.delete('/:id/timeline-events/:eventId', authenticateRequest, async (req, res, next) => {
  try {
    const { eventId } = req.params as { eventId: string };
    const success = await investigationsRepository.deleteTimelineEvent(parseInt(eventId));
    if (!success) return res.status(404).json({ error: 'Event not found' });
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

// --- Evidence ---

router.get('/:id/evidence', async (req, res, next) => {
  try {
    const { id } = req.params as { id: string };
    const evidence = await investigationsRepository.getEvidence(parseInt(id));
    res.json(evidence);
  } catch (error) {
    next(error);
  }
});

router.post('/:id/evidence', authenticateRequest, async (req, res, next) => {
  try {
    const { id } = req.params as { id: string };
    const evidenceId = await investigationsRepository.addEvidence(parseInt(id), req.body);
    res.status(201).json({ id: evidenceId, ...req.body });
  } catch (error) {
    next(error);
  }
});

router.get('/:id/evidence-summary', async (req, res, next) => {
  try {
    const { id } = req.params;
    const repoModule = await import('../db/evidenceRepository.js');
    const summary = await repoModule.evidenceRepository.getInvestigationEvidenceSummary(id);
    res.json(summary);
  } catch (error) {
    next(error);
  }
});

// --- Hypotheses ---

router.get('/:id/hypotheses', async (req, res, next) => {
  try {
    const { id } = req.params as { id: string };
    const hypotheses = await investigationsRepository.getHypotheses(parseInt(id));
    res.json(hypotheses);
  } catch (error) {
    next(error);
  }
});

router.post('/:id/hypotheses', authenticateRequest, async (req, res, next) => {
  try {
    const { id } = req.params as { id: string };
    const { title, description } = req.body;
    const newId = await investigationsRepository.addHypothesis(parseInt(id), {
      title,
      description,
    });
    res.status(201).json({ id: newId, title, description, investigationId: id, status: 'draft' });
  } catch (error) {
    next(error);
  }
});

router.put('/:id/hypotheses/:hypId', authenticateRequest, async (req, res, next) => {
  try {
    const { hypId } = req.params;
    const updates = req.body;
    const success = await investigationsRepository.updateHypothesis(parseInt(hypId), updates);
    if (!success) return res.status(404).json({ error: 'Hypothesis not found' });
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

router.delete('/:id/hypotheses/:hypId', authenticateRequest, async (req, res, next) => {
  try {
    const { hypId } = req.params;
    const success = await investigationsRepository.deleteHypothesis(parseInt(hypId));
    if (!success) return res.status(404).json({ error: 'Hypothesis not found' });
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

router.post('/:id/hypotheses/:hypId/evidence', authenticateRequest, async (req, res, next) => {
  try {
    const { hypId } = req.params;
    const { evidenceId, relevance } = req.body;
    await investigationsRepository.addEvidenceToHypothesis(
      parseInt(hypId),
      parseInt(evidenceId),
      relevance,
    );
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

router.delete(
  '/:id/hypotheses/:hypId/evidence/:evidenceId',
  authenticateRequest,
  async (req, res, next) => {
    try {
      const { hypId, evidenceId } = req.params as { hypId: string; evidenceId: string };
      await investigationsRepository.removeEvidenceFromHypothesis(
        parseInt(hypId),
        parseInt(evidenceId),
      );
      res.json({ success: true });
    } catch (error) {
      next(error);
    }
  },
);

// Activity Feed
router.get('/:id/activity', async (req, res, next) => {
  try {
    const { id } = req.params;
    const limit = parseInt(req.query.limit as string) || 50;
    const activity = await investigationsRepository.getActivity(parseInt(id), limit);

    // Parse metadata JSON for each activity
    const parsed = activity.map((a: any) => ({
      ...a,
      metadata: a.metadata_json ? JSON.parse(a.metadata_json) : null,
    }));

    res.json(parsed);
  } catch (error) {
    next(error);
  }
});

// Evidence grouped by type (for Case Folder)
router.get('/:id/evidence-by-type', async (req, res, next) => {
  try {
    const { id } = req.params;
    const evidence = await investigationsRepository.getEvidenceByType(parseInt(id));
    res.json(evidence);
  } catch (error) {
    next(error);
  }
});

// Notebook persistence
router.get('/:id/notebook', async (req, res, next) => {
  try {
    const { id } = req.params;
    const notebook = await investigationsRepository.getNotebook(parseInt(id));
    res.json(notebook);
  } catch (error) {
    next(error);
  }
});

router.put('/:id/notebook', authenticateRequest, async (req, res, next) => {
  try {
    const { id } = req.params;
    const { order, annotations } = req.body || {};
    await investigationsRepository.saveNotebook(parseInt(id), { order, annotations });
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

// Publish Briefing (Markdown)
router.get('/:id/briefing', async (req, res, next) => {
  try {
    const { id } = req.params;
    const repoModule = await import('../db/evidenceRepository.js');
    const summary = await repoModule.evidenceRepository.getInvestigationEvidenceSummary(id);
    let md = `# Investigation Briefing\\n\\nTotal Evidence: ${summary.totalEvidence}\\n\\n`;
    const byType: Record<string, any[]> = {};
    for (const e of summary.evidence) {
      const t = e.evidence_type || 'unknown';
      byType[t] = byType[t] || [];
      byType[t].push(e);
    }
    for (const [type, list] of Object.entries(byType)) {
      md += `## ${type.toUpperCase()}\\n`;
      for (const e of list) {
        const title = e.title || 'Untitled';
        const desc = e.description || '';
        md += `- ${title}\\n`;
        if (desc) md += `  - ${desc}\\n`;
      }
      md += `\\n`;
    }
    res.header('Content-Type', 'text/markdown').send(md);
  } catch (error) {
    next(error);
  }
});

export default router;
