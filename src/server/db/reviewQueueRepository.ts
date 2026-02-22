import { getDb } from './connection.js';

export interface ReviewItem {
  id: string;
  type: string;
  subject_id: string;
  ingest_run_id: string;
  status: 'pending' | 'reviewed' | 'rejected';
  priority: 'high' | 'medium' | 'low';
  payload_json: any;
  notes?: string;
  created_at: string;
}

export const reviewQueueRepository = {
  async getPendingItems(limit = 100): Promise<ReviewItem[]> {
    const db = getDb();
    const rows = (await db
      .prepare(
        `
      SELECT * FROM review_queue 
      WHERE status = 'pending' 
      ORDER BY 
        CASE priority WHEN 'high' THEN 1 WHEN 'medium' THEN 2 ELSE 3 END,
        created_at ASC
      LIMIT ?
    `,
      )
      .all(limit)) as any[];

    return rows.map((row) => ({
      ...row,
      payload_json: JSON.parse(row.payload_json),
    }));
  },

  async updateDecision(
    id: string,
    decision: 'reviewed' | 'rejected',
    reviewerId: string,
    notes?: string,
  ) {
    const db = getDb();
    const result = (await db
      .prepare(
        `
      UPDATE review_queue 
      SET status = ?, 
          decision = ?, 
          reviewer_id = ?, 
          notes = ?, 
          reviewed_at = CURRENT_TIMESTAMP 
      WHERE id = ?
    `,
      )
      .run(decision, decision, reviewerId, notes, id)) as any;

    return result.changes > 0;
  },
};
