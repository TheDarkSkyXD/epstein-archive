import { Router } from 'express';
import { authenticateRequest } from '../auth/middleware.js';
import { financialRepository } from '../db/financialRepository.js';

const router = Router();

// Get all transactions (with limit)
router.get('/transactions', authenticateRequest, async (req, res, next) => {
  try {
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 100;
    const transactions = financialRepository.getTransactions(limit);
    res.json(transactions);
  } catch (error) {
    next(error);
  }
});

// Get financial statistics/summary
router.get('/stats', authenticateRequest, async (req, res, next) => {
  try {
    const summary = financialRepository.getFinancialSummary();
    res.json(summary);
  } catch (error) {
    next(error);
  }
});

// Seed some mock data if empty (for demonstration in the workspace)
router.post('/seed', authenticateRequest, async (req, res, next) => {
  try {
    const existing = financialRepository.getTransactions(1);
    if (existing.length > 0) {
      return res.json({ message: 'Database already has transaction data' });
    }

    // Mock transactions for Epstein investigation context
    const mockTxs = [
      {
        from_entity: 'Jeffrey Epstein',
        to_entity: 'Southern Trust Company',
        amount: 12500000,
        transaction_date: '2018-05-12T10:00:00Z',
        transaction_type: 'offshore_transfer',
        method: 'wire',
        risk_level: 'high',
        description: 'Repatriation of trust funds from US Virgin Islands entities',
      },
      {
        from_entity: 'Southern Trust Company',
        to_entity: 'Butterfly Trust',
        amount: 8000000,
        transaction_date: '2019-02-15T14:30:00Z',
        transaction_type: 'layering',
        method: 'wire',
        risk_level: 'critical',
        description: 'Subscription for administrative services in shell network',
      },
      {
        from_entity: 'Jeffrey Epstein',
        to_entity: 'Ghislaine Maxwell',
        amount: 500000,
        transaction_date: '2017-11-20T09:15:00Z',
        transaction_type: 'payment',
        method: 'wire',
        risk_level: 'medium',
        description: 'Operational expenses for international travel',
      },
    ];

    for (const tx of mockTxs) {
      financialRepository.saveTransaction(tx as any);
    }

    res.json({ success: true, count: mockTxs.length });
  } catch (error) {
    next(error);
  }
});

export default router;
