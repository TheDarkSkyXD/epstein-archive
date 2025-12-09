import { Router, Request, Response } from 'express';
import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { config } from '../config/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const router = Router();

// Database connection
const db = new Database(config.databaseUrl);

/**
 * GET /api/investigation/evidence/:entityId
 * Get evidence summary for a specific entity
 */
router.get('/evidence/:entityId', async (req: Request, res: Response) => {
  try {
    const { entityId } = req.params;

    // Get entity details
    const entity = db.prepare(`
      SELECT id, full_name, primary_role, entity_category, risk_level
      FROM entities
      WHERE id = ?
    `).get(entityId);

    if (!entity) {
      return res.status(404).json({ error: 'Entity not found' });
    }

    // Get evidence linked to this entity
    const evidenceRecords = db.prepare(`
      SELECT 
        e.id,
        e.evidence_type,
        e.title,
        e.description,
        e.source_path,
        e.cleaned_path,
        e.red_flag_rating,
        e.created_at,
        ee.role,
        ee.confidence,
        ee.context_snippet
      FROM evidence e
      INNER JOIN evidence_entity ee ON ee.evidence_id = e.id
      WHERE ee.entity_id = ?
      ORDER BY e.created_at DESC
      LIMIT 100
    `).all(entityId);

    // Get evidence type breakdown
    const typeBreakdown = db.prepare(`
      SELECT 
        e.evidence_type,
        COUNT(*) as count
      FROM evidence e
      INNER JOIN evidence_entity ee ON ee.evidence_id = e.id
      WHERE ee.entity_id = ?
      GROUP BY e.evidence_type
      ORDER BY count DESC
    `).all(entityId);

    // Get role breakdown
    const roleBreakdown = db.prepare(`
      SELECT 
        ee.role,
        COUNT(*) as count
      FROM evidence_entity ee
      WHERE ee.entity_id = ?
      GROUP BY ee.role
      ORDER BY count DESC
    `).all(entityId);

    // Get red flag distribution
    const redFlagDistribution = db.prepare(`
      SELECT 
        e.red_flag_rating,
        COUNT(*) as count
      FROM evidence e
      INNER JOIN evidence_entity ee ON ee.evidence_id = e.id
      WHERE ee.entity_id = ? AND e.red_flag_rating IS NOT NULL
      GROUP BY e.red_flag_rating
      ORDER BY e.red_flag_rating DESC
    `).all(entityId);

    // Get related entities (entities that appear in same evidence)
    const relatedEntities = db.prepare(`
      SELECT 
        ent.id,
        ent.full_name,
        ent.entity_category,
        COUNT(DISTINCT ee1.evidence_id) as shared_evidence_count
      FROM evidence_entity ee1
      INNER JOIN evidence_entity ee2 ON ee1.evidence_id = ee2.evidence_id
      INNER JOIN entities ent ON ent.id = ee2.entity_id
      WHERE ee1.entity_id = ? AND ee2.entity_id != ?
      GROUP BY ent.id, ent.full_name, ent.entity_category
      ORDER BY shared_evidence_count DESC
      LIMIT 20
    `).all(entityId, entityId);

    res.json({
      entity,
      evidence: evidenceRecords,
      stats: {
        totalEvidence: evidenceRecords.length,
        typeBreakdown,
        roleBreakdown,
        redFlagDistribution,
        relatedEntities,
        highRiskCount: evidenceRecords.filter((e: any) => (e.red_flag_rating || 0) >= 4).length,
        averageConfidence: evidenceRecords.reduce((sum: number, e: any) => sum + (e.confidence || 0), 0) / evidenceRecords.length || 0
      }
    });
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

    // Get evidence details
    const evidence = db.prepare(`
      SELECT 
        id,
        evidence_type,
        title,
        description,
        source_path,
        red_flag_rating,
        created_at
      FROM evidence
      WHERE id = ?
    `).get(evidenceId);

    if (!evidence) {
      return res.status(404).json({ error: 'Evidence not found' });
    }

    // Get entities linked to this evidence
    const entities = db.prepare(`
      SELECT 
        ent.id,
        ent.full_name,
        ent.entity_category,
        ee.role
      FROM evidence_entity ee
      INNER JOIN entities ent ON ent.id = ee.entity_id
      WHERE ee.evidence_id = ?
    `).all(evidenceId);

    // Insert into investigation_evidence table
    const result = db.prepare(`
      INSERT INTO investigation_evidence (
        investigation_id, 
        evidence_id, 
        notes, 
        relevance,
        added_at
      ) VALUES (?, ?, ?, ?, datetime('now'))
    `).run(investigationId, evidenceId, notes || '', relevance || 'medium');

    res.json({
      success: true,
      investigationEvidenceId: result.lastInsertRowid,
      evidence,
      entities
    });
  } catch (error: any) {
    if (error.code === 'SQLITE_CONSTRAINT') {
      return res.status(409).json({ error: 'Evidence already added to this investigation' });
    }
    console.error('Error adding evidence to investigation:', error);
    res.status(500).json({ error: 'Failed to add evidence to investigation' });
  }
});

/**
 * GET /api/investigation/:investigationId/evidence-summary
 * Get evidence summary for an investigation
 */
router.get('/:investigationId/evidence-summary', async (req: Request, res: Response) => {
  try {
    const { investigationId } = req.params;

    // Get all evidence for this investigation
    const evidence = db.prepare(`
      SELECT 
        e.id,
        e.evidence_type,
        e.title,
        e.description,
        e.red_flag_rating,
        e.created_at,
        ie.notes,
        ie.relevance,
        ie.added_at
      FROM investigation_evidence ie
      INNER JOIN evidence e ON e.id = ie.evidence_id
      WHERE ie.investigation_id = ?
      ORDER BY ie.added_at DESC
    `).all(investigationId);

    // Get entity coverage
    const entityCoverage = db.prepare(`
      SELECT 
        ent.id,
        ent.full_name,
        ent.entity_category,
        COUNT(DISTINCT ee.evidence_id) as evidence_count
      FROM investigation_evidence ie
      INNER JOIN evidence_entity ee ON ee.evidence_id = ie.evidence_id
      INNER JOIN entities ent ON ent.id = ee.entity_id
      WHERE ie.investigation_id = ?
      GROUP BY ent.id, ent.full_name, ent.entity_category
      ORDER BY evidence_count DESC
      LIMIT 50
    `).all(investigationId);

    res.json({
      totalEvidence: evidence.length,
      evidence,
      entityCoverage,
      typeBreakdown: evidence.reduce((acc: any, e: any) => {
        acc[e.evidence_type] = (acc[e.evidence_type] || 0) + 1;
        return acc;
      }, {}),
      relevanceBreakdown: evidence.reduce((acc: any, e: any) => {
        acc[e.relevance || 'medium'] = (acc[e.relevance || 'medium'] || 0) + 1;
        return acc;
      }, {})
    });
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

    db.prepare(`
      DELETE FROM investigation_evidence
      WHERE id = ?
    `).run(investigationEvidenceId);

    res.json({ success: true });
  } catch (error) {
    console.error('Error removing evidence from investigation:', error);
    res.status(500).json({ error: 'Failed to remove evidence from investigation' });
  }
});

export default router;
