import { Router } from 'express';
import { propertiesRepository } from '../db/propertiesRepository.js';

const router = Router();

router.get('/', async (req, res, next) => {
  try {
    const page = Math.max(1, Number((req.query as any).page || 1));
    const limit = Math.min(500, Math.max(1, Number((req.query as any).limit || 50)));

    const payload = await propertiesRepository.getProperties({
      page,
      limit,
      ownerSearch: String((req.query as any).search || '').trim() || undefined,
      minValue:
        (req.query as any).minValue !== undefined ? Number((req.query as any).minValue) : undefined,
      maxValue:
        (req.query as any).maxValue !== undefined ? Number((req.query as any).maxValue) : undefined,
      propertyUse: String((req.query as any).type || '').trim() || undefined,
      knownAssociatesOnly: String((req.query as any).associatesOnly || '').toLowerCase() === 'true',
      sortBy: (String((req.query as any).sortBy || '').trim() as any) || undefined,
      sortOrder: (String((req.query as any).sortOrder || '').trim() as any) || undefined,
    });

    res.json(payload);
  } catch (error) {
    next(error);
  }
});

router.get('/stats', async (_req, res, next) => {
  try {
    const stats = await propertiesRepository.getPropertyStats();
    res.json(stats);
  } catch (error) {
    next(error);
  }
});

router.get('/value-distribution', async (_req, res, next) => {
  try {
    const rows = await propertiesRepository.getValueDistribution();
    res.json(rows);
  } catch (error) {
    next(error);
  }
});

router.get('/top-owners', async (req, res, next) => {
  try {
    const limit = Math.min(100, Math.max(1, Number((req.query as any).limit || 20)));
    const rows = await propertiesRepository.getTopOwners(limit);
    res.json(rows);
  } catch (error) {
    next(error);
  }
});

router.get('/known-associates', async (_req, res, next) => {
  try {
    const rows = await propertiesRepository.getKnownAssociateProperties();
    res.json(rows);
  } catch (error) {
    next(error);
  }
});

router.get('/:id', async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) return res.status(400).json({ error: 'Invalid property id' });
    const property = await propertiesRepository.getPropertyById(id);
    if (!property) return res.status(404).json({ error: 'Property not found' });
    res.json(property);
  } catch (error) {
    next(error);
  }
});

export default router;
