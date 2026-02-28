import { Router } from 'express';
import { authenticateRequest } from '../auth/middleware.js';
import { financialRepository } from '../db/financialRepository.js';
import { z } from 'zod';
import { validate } from '../middleware/validate.js';

const router = Router();

// Schemas
const transactionsSchema = z.object({
  query: z.object({
    limit: z.coerce.number().int().min(1).max(500).default(100),
  }),
});

// Get all transactions (with limit)
router.get(
  '/transactions',
  authenticateRequest,
  validate(transactionsSchema),
  async (req, res, next) => {
    try {
      const { limit } = req.query as any;
      const transactions = await financialRepository.getTransactions(limit);
      res.json(transactions);
    } catch (error) {
      next(error);
    }
  },
);

// Get financial stats
router.get('/stats', authenticateRequest, async (_req, res, next) => {
  try {
    const summary = await financialRepository.getFinancialSummary();
    res.json(summary);
  } catch (error) {
    next(error);
  }
});

// NOTE: The /seed endpoint has been removed. It populated the financial module with
// hardcoded mock transactions that could be mistaken for real evidentiary data.
// Wire the financial module to corpus-extracted transaction data before re-enabling.

export default router;
