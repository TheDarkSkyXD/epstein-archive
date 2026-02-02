import { Router } from 'express';
import { authenticateRequest } from '../auth/middleware.js';
import { forensicRepository } from '../db/forensicRepository.js';

const router = Router();

// Aggregated forensic metrics summary
router.get('/metrics-summary', authenticateRequest, async (req, res, next) => {
  try {
    const summary = forensicRepository.getMetricsSummary();
    res.json(summary);
  } catch (error) {
    next(error);
  }
});

export default router;
