import { getDb } from '../db/connection.js';

export class JobManager {
  private workerId: string;

  constructor(workerId?: string) {
    this.workerId = workerId || `worker-${process.pid}-${Date.now()}`;
  }

  /**
   * Acquires a lock on the next available document
   */
  acquireJob(ttlSeconds: number = 300) {
    const db = getDb();

    // 1. Find a candidate
    // We look for 'queued' items OR 'processing' items with expired leases (stuck jobs)
    const candidate = db
      .prepare(
        `
      SELECT id, file_path, processing_attempts 
      FROM documents 
      WHERE processing_status = 'queued' 
         OR (processing_status = 'processing' AND lease_expires_at < datetime('now'))
      ORDER BY 
         CASE WHEN processing_status = 'processing' THEN 0 ELSE 1 END, -- Prioritize stuck jobs
         created_at ASC
      LIMIT 1
    `,
      )
      .get();

    if (!candidate) return null;

    // 2. Try to lock it
    // We use a transactional update to ensure safety
    const updates = db
      .prepare(
        `
      UPDATE documents 
      SET 
        processing_status = 'processing',
        worker_id = ?,
        lease_expires_at = datetime('now', '+' || ? || ' seconds'),
        processing_attempts = processing_attempts + 1,
        last_processed_at = datetime('now')
      WHERE id = ?
    `,
      )
      .run(this.workerId, ttlSeconds, candidate.id);

    if (updates.changes === 0) {
      // Race condition lost
      return null;
    }

    return candidate;
  }

  /**
   * Heartbeat to keep the job alive
   */
  renewLease(documentId: number | string, ttlSeconds: number = 300) {
    const db = getDb();
    db.prepare(
      `
      UPDATE documents 
      SET lease_expires_at = datetime('now', '+' || ? || ' seconds')
      WHERE id = ? AND worker_id = ?
    `,
    ).run(ttlSeconds, documentId, this.workerId);
  }

  /**
   * Mark job as complete
   */
  completeJob(documentId: number | string) {
    const db = getDb();
    db.prepare(
      `
      UPDATE documents 
      SET 
        processing_status = 'completed',
        worker_id = NULL,
        lease_expires_at = NULL,
        processing_error = NULL
      WHERE id = ?
    `,
    ).run(documentId);
  }

  /**
   * Fail the job (with retry logic handled by caller or next acquire)
   */
  failJob(documentId: number | string, error: string) {
    const db = getDb();
    db.prepare(
      `
      UPDATE documents 
      SET 
        processing_status = 'failed',
        processing_error = ?,
        worker_id = NULL,
        lease_expires_at = NULL
      WHERE id = ?
    `,
    ).run(error, documentId);
  }

  getWorkerId() {
    return this.workerId;
  }
}
