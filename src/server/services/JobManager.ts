import { getDb } from '../db/connection.js';
import os from 'os';

export class JobManager {
  private workerId: string;

  constructor(workerId?: string) {
    const hostname = os.hostname() || 'unknown-host';
    this.workerId = workerId || `${hostname}-worker-${process.pid}-${Date.now()}`;
  }

  /**
   * Acquires a lock on the next available document
   */
  async acquireJob(ttlSeconds: number = 300) {
    const db = getDb();

    // 1. Find and lock a candidate atomically using FOR UPDATE SKIP LOCKED
    // We look for 'queued' items OR 'processing' items with expired leases
    return await db.transaction(async (client) => {
      const findSql = `
        SELECT id, file_path, processing_attempts 
        FROM documents 
        WHERE processing_status = 'queued' 
           OR (processing_status = 'processing' AND lease_expires_at < now())
        ORDER BY 
           CASE WHEN processing_status = 'processing' THEN 0 ELSE 1 END,
           created_at ASC
        LIMIT 1
        FOR UPDATE SKIP LOCKED
      `;

      const res = await client.query(findSql);
      const candidate = res.rows[0];

      if (!candidate) return null;

      // 2. Lock it
      const lockSql = `
        UPDATE documents 
        SET 
          processing_status = 'processing',
          worker_id = $1,
          lease_expires_at = now() + interval '$2 seconds',
          processing_attempts = processing_attempts + 1,
          last_processed_at = now()
        WHERE id = $3
      `;

      await client.query(lockSql, [this.workerId, ttlSeconds, candidate.id]);

      return candidate;
    })();
  }

  /**
   * Heartbeat to keep the job alive
   */
  async renewLease(documentId: number | string, ttlSeconds: number = 300) {
    const db = getDb();
    await db.run(
      `
      UPDATE documents 
      SET lease_expires_at = now() + interval '$1 seconds'
      WHERE id = $2 AND worker_id = $3
    `,
      [ttlSeconds, documentId, this.workerId],
    );
  }

  /**
   * Mark job as complete
   */
  async completeJob(documentId: number | string) {
    const db = getDb();
    await db.run(
      `
      UPDATE documents 
      SET 
        processing_status = 'completed',
        worker_id = NULL,
        lease_expires_at = NULL,
        processing_error = NULL
      WHERE id = $1
    `,
      [documentId],
    );
  }

  /**
   * Fail the job
   */
  async failJob(documentId: number | string, error: string) {
    const db = getDb();
    await db.run(
      `
      UPDATE documents 
      SET 
        processing_status = 'failed',
        processing_error = $1,
        worker_id = NULL,
        lease_expires_at = NULL
      WHERE id = $2
    `,
      [error, documentId],
    );
  }

  getWorkerId() {
    return this.workerId;
  }
}
