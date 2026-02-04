import express from 'express';
import { getDb } from '../db/connection.js';
import { authenticateRequest } from '../auth/middleware.js';
import { z } from 'zod';

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
    const db = getDb();
    const limit = parseInt(req.query.limit as string) || 20;

    // Join with sentences/documents to get signal score
    const queue = db
      .prepare(
        `
      SELECT 
        m.id, m.entity_id, m.document_id, m.mention_context, m.confidence_score, 
        e.full_name as entity_name, d.file_name, ds.signal_score
      FROM entity_mentions m
      JOIN entities e ON m.entity_id = e.id
      JOIN documents d ON m.document_id = d.id
      LEFT JOIN document_sentences ds ON m.sentence_id = ds.id
      WHERE m.verified = 0
      ORDER BY ds.signal_score DESC, m.confidence_score ASC
      LIMIT ?
    `,
      )
      .all(limit);

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
    const db = getDb();

    db.prepare(
      `
      UPDATE entity_mentions 
      SET verified = 1, verified_by = ?, verified_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `,
    ).run(body.verified_by || (req as any).user?.username || 'reviewer', id);

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
    const db = getDb();

    db.prepare(
      `
      UPDATE entity_mentions 
      SET verified = -1, verified_by = ?, verified_at = CURRENT_TIMESTAMP, rejection_reason = ?
      WHERE id = ?
    `,
    ).run(body.verified_by || (req as any).user?.username || 'reviewer', body.rejection_reason, id);

    res.json({ success: true });
  } catch (e) {
    next(e);
  }
});

// 2. Claims Queue
router.get('/claims/queue', authenticateRequest, (req, res, next) => {
  try {
    const db = getDb();
    const limit = parseInt(req.query.limit as string) || 20;

    const queue = db
      .prepare(
        `
      SELECT 
        c.id, c.subject_entity_id, c.predicate, c.object_text, c.confidence,
        ds.signal_score, d.file_name
      FROM claim_triples c
      JOIN documents d ON c.document_id = d.id
      LEFT JOIN document_sentences ds ON c.sentence_id = ds.id
      WHERE c.verified = 0
      ORDER BY ds.signal_score DESC, c.confidence ASC
      LIMIT ?
    `,
      )
      .all(limit);

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
    const db = getDb();

    db.prepare(
      `
      UPDATE claim_triples 
      SET verified = 1, verified_by = ?, verified_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `,
    ).run(body.verified_by || (req as any).user?.username || 'reviewer', id);

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
    const db = getDb();

    db.prepare(
      `
      UPDATE claim_triples 
      SET verified = -1, verified_by = ?, verified_at = CURRENT_TIMESTAMP, rejection_reason = ?
      WHERE id = ?
    `,
    ).run(body.verified_by || (req as any).user?.username || 'reviewer', body.rejection_reason, id);

    res.json({ success: true });
  } catch (e) {
    next(e);
  }
});

export default router;
