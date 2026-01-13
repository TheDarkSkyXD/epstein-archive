import { getDb } from './connection.js';

export const forensicRepository = {
  /**
   * Get forensic metrics for a document
   */
  getMetrics: (documentId: number | string) => {
    const db = getDb();
    return db
      .prepare('SELECT * FROM document_forensic_metrics WHERE document_id = ?')
      .get(documentId);
  },

  /**
   * Save or update forensic metrics
   */
  saveMetrics: (documentId: number | string, metrics: any, authenticityScore?: number) => {
    const db = getDb();
    const existing = db
      .prepare('SELECT id FROM document_forensic_metrics WHERE document_id = ?')
      .get(documentId);

    if (existing) {
      db.prepare(
        `
        UPDATE document_forensic_metrics 
        SET metrics_json = @metrics, 
            authenticity_score = @score, 
            last_analyzed_at = CURRENT_TIMESTAMP 
        WHERE document_id = @docId
      `,
      ).run({
        metrics: JSON.stringify(metrics),
        score: authenticityScore || 0,
        docId: documentId,
      });
    } else {
      db.prepare(
        `
        INSERT INTO document_forensic_metrics (document_id, metrics_json, authenticity_score)
        VALUES (@docId, @metrics, @score)
      `,
      ).run({
        docId: documentId,
        metrics: JSON.stringify(metrics),
        score: authenticityScore || 0,
      });
    }
  },

  /**
   * Get chain of custody for an evidence item (or document)
   * Note: In our schema, chain_of_custody links to 'evidence', but often we use 'document' IDs.
   * We might need to resolve document_id -> evidence_id or store document_id in chain directly.
   * For now, assuming evidence_id corresponds to document_id in simple cases or we handle mapping elsewhere.
   */
  getChainOfCustody: (evidenceId: number | string) => {
    const db = getDb();
    return db
      .prepare('SELECT * FROM chain_of_custody WHERE evidence_id = ? ORDER BY date DESC')
      .all(evidenceId);
  },

  /**
   * Add an event to the chain of custody
   */
  addCustodyEvent: (event: {
    evidenceId: number | string;
    actor: string;
    action: string;
    date?: string;
    notes?: string;
    signature?: string;
  }) => {
    const db = getDb();
    db.prepare(
      `
      INSERT INTO chain_of_custody (evidence_id, actor, action, date, notes, signature)
      VALUES (@evidenceId, @actor, @action, @date, @notes, @signature)
    `,
    ).run({
      evidenceId: event.evidenceId,
      actor: event.actor,
      action: event.action,
      date: event.date || new Date().toISOString(),
      notes: event.notes || '',
      signature: event.signature || '',
    });
  },

  /**
   * Get aggregated forensic metrics summary (Tier 3.3 - Advanced Analytics)
   */
  getMetricsSummary: () => {
    const db = getDb();

    // Total documents analyzed
    const totalAnalyzed = db
      .prepare(
        `
      SELECT COUNT(*) as count FROM document_forensic_metrics
    `,
      )
      .get() as { count: number };

    // Average authenticity score
    const avgScore = db
      .prepare(
        `
      SELECT AVG(authenticity_score) as avg FROM document_forensic_metrics 
      WHERE authenticity_score IS NOT NULL AND authenticity_score > 0
    `,
      )
      .get() as { avg: number | null };

    // Risk distribution from documents table
    const riskDistribution = db
      .prepare(
        `
      SELECT 
        SUM(CASE WHEN red_flag_rating <= 1 THEN 1 ELSE 0 END) as low,
        SUM(CASE WHEN red_flag_rating = 2 THEN 1 ELSE 0 END) as medium,
        SUM(CASE WHEN red_flag_rating = 3 OR red_flag_rating = 4 THEN 1 ELSE 0 END) as high,
        SUM(CASE WHEN red_flag_rating >= 5 THEN 1 ELSE 0 END) as critical
      FROM documents
    `,
      )
      .get() as { low: number; medium: number; high: number; critical: number };

    // Top 10 high-risk documents with forensic metrics
    const topRiskDocuments = db
      .prepare(
        `
      SELECT 
        d.id, d.file_name as fileName, d.red_flag_rating as redFlagRating,
        d.evidence_type as evidenceType, d.word_count as wordCount,
        dfm.authenticity_score as authenticityScore,
        dfm.last_analyzed_at as lastAnalyzedAt
      FROM documents d
      LEFT JOIN document_forensic_metrics dfm ON dfm.document_id = d.id
      WHERE d.red_flag_rating >= 3
      ORDER BY d.red_flag_rating DESC, dfm.authenticity_score ASC
      LIMIT 10
    `,
      )
      .all();

    // Documents needing analysis (no forensic metrics yet)
    const pendingAnalysis = db
      .prepare(
        `
      SELECT COUNT(*) as count FROM documents d
      LEFT JOIN document_forensic_metrics dfm ON dfm.document_id = d.id
      WHERE dfm.id IS NULL
    `,
      )
      .get() as { count: number };

    return {
      totalDocumentsAnalyzed: totalAnalyzed.count,
      averageAuthenticityScore: avgScore.avg ? Math.round(avgScore.avg * 100) / 100 : null,
      riskDistribution: {
        low: riskDistribution?.low || 0,
        medium: riskDistribution?.medium || 0,
        high: riskDistribution?.high || 0,
        critical: riskDistribution?.critical || 0,
      },
      topRiskDocuments,
      pendingAnalysisCount: pendingAnalysis.count,
      lastUpdated: new Date().toISOString(),
    };
  },
};
