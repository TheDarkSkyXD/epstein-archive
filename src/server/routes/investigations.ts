import { Router } from 'express';
import { investigationsRepository } from '../db/investigationsRepository.js';
import { authenticateRequest } from '../auth/middleware.js';

const router = Router();

// Get all investigations
// Get all investigations
router.get('/', async (req, res, next) => {
  try {
    const filters = {
      status: req.query.status as string,
      ownerId: req.query.ownerId as string,
      page: parseInt(req.query.page as string) || 1,
      limit: parseInt(req.query.limit as string) || 20,
    };

    const result = await investigationsRepository.getInvestigations(filters);
    res.json(result);
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
    const { id } = req.params;
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
    const { id } = req.params;
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
    const { id } = req.params;
    const events = await investigationsRepository.getTimelineEvents(parseInt(id));
    res.json(events);
  } catch (error) {
    next(error);
  }
});

router.post('/:id/timeline-events', authenticateRequest, async (req, res, next) => {
  try {
    const { id } = req.params;
    const eventId = await investigationsRepository.addTimelineEvent(parseInt(id), req.body);
    res.status(201).json({ id: eventId, ...req.body });
  } catch (error) {
    next(error);
  }
});

router.patch('/:id/timeline-events/:eventId', authenticateRequest, async (req, res, next) => {
  try {
    const { eventId } = req.params;
    const success = await investigationsRepository.updateTimelineEvent(parseInt(eventId), req.body);
    if (!success) return res.status(404).json({ error: 'Event not found' });
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

router.delete('/:id/timeline-events/:eventId', authenticateRequest, async (req, res, next) => {
  try {
    const { eventId } = req.params;
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
    const { id } = req.params;
    const evidence = await investigationsRepository.getEvidence(parseInt(id));
    res.json(evidence);
  } catch (error) {
    next(error);
  }
});

router.post('/:id/evidence', authenticateRequest, async (req, res, next) => {
  try {
    const { id } = req.params;
    const evidenceId = await investigationsRepository.addEvidence(parseInt(id), req.body);
    res.status(201).json({ id: evidenceId, ...req.body });
  } catch (error) {
    next(error);
  }
});

export default router;
