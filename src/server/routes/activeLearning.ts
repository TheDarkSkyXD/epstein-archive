import express from 'express';
import { authenticateRequest } from '../auth/middleware.js';
import { z } from 'zod';
import {
  getClaimsQueue,
  getMentionsQueue,
  rejectClaim,
  rejectMention,
  verifyClaim,
  verifyMention,
} from '../db/routesDb.js';

const router = express.Router();

// validation schemas
const VerifySchema = z.object({
  verified_by: z.string().optional(),
});

const RejectSchema = z.object({
  verified_by: z.string().optional(),
  rejection_reason: z.string(),
});

// 1. Mentions Queue
// Fetch mentions that are high signal (entity relevant) but unverified
// Priority: Signal Score (via document/sentence) + Confidence < 1.0
router.get('/mentions/queue', authenticateRequest, (req, res, next) => {
  try {
    const limit = parseInt(req.query.limit as string) || 20;

    const queue = getMentionsQueue(limit);

    res.json(queue);
  } catch (e) {
    next(e);
  }
});

// Verify Mention
router.post('/mentions/:id/verify', authenticateRequest, (req, res, next) => {
  try {
    const { id } = req.params;
    const body = VerifySchema.parse(req.body);
    const verifiedBy = body.verified_by || (req as any).user?.username || 'reviewer';
    verifyMention(id, verifiedBy);

    res.json({ success: true });
  } catch (e) {
    next(e);
  }
});

// Reject Mention
router.post('/mentions/:id/reject', authenticateRequest, (req, res, next) => {
  try {
    const { id } = req.params;
    const body = RejectSchema.parse(req.body);
    const verifiedBy = body.verified_by || (req as any).user?.username || 'reviewer';
    rejectMention(id, verifiedBy, body.rejection_reason);

    res.json({ success: true });
  } catch (e) {
    next(e);
  }
});

// 2. Claims Queue
router.get('/claims/queue', authenticateRequest, (req, res, next) => {
  try {
    const limit = parseInt(req.query.limit as string) || 20;

    const queue = getClaimsQueue(limit);

    res.json(queue);
  } catch (e) {
    next(e);
  }
});

// Verify Claim
router.post('/claims/:id/verify', authenticateRequest, (req, res, next) => {
  try {
    const { id } = req.params;
    const body = VerifySchema.parse(req.body);
    const verifiedBy = body.verified_by || (req as any).user?.username || 'reviewer';
    verifyClaim(id, verifiedBy);

    res.json({ success: true });
  } catch (e) {
    next(e);
  }
});

// Reject Claim
router.post('/claims/:id/reject', authenticateRequest, (req, res, next) => {
  try {
    const { id } = req.params;
    const body = RejectSchema.parse(req.body);
    const verifiedBy = body.verified_by || (req as any).user?.username || 'reviewer';
    rejectClaim(id, verifiedBy, body.rejection_reason);

    res.json({ success: true });
  } catch (e) {
    next(e);
  }
});

export default router;
