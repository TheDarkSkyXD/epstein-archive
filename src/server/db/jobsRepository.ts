import { getDb } from './connection.js';

export interface ProcessingJob {
  id: number;
  run_id: number;
  step_name: string;
  target_type: 'document' | 'evidence' | 'media';
  target_id: number;
  priority: number;
  status:
    | 'queued'
    | 'running'
    | 'succeeded'
    | 'failed_retryable'
    | 'failed_permanent'
    | 'skipped'
    | 'cancelled';
  attempts: number;
  max_attempts: number;
  last_error?: string;
}

export const jobsRepository = {
  /**
   * Create a new processing job.
   */
  createJob: (job: Omit<ProcessingJob, 'id' | 'status' | 'attempts' | 'priority'>) => {
    const db = getDb();
    return db
      .prepare(
        `
      INSERT INTO processing_jobs (run_id, step_name, target_type, target_id)
      VALUES (?, ?, ?, ?)
    `,
      )
      .run(job.run_id, job.step_name, job.target_type, job.target_id);
  },

  /**
   * List jobs with filtering.
   */
  listJobs: (status?: string, targetType?: string) => {
    const db = getDb();
    const where: string[] = [];
    const params: any = [];

    if (status) {
      where.push('status = ?');
      params.push(status);
    }

    if (targetType) {
      where.push('target_type = ?');
      params.push(targetType);
    }

    const whereClause = where.length ? `WHERE ${where.join(' AND ')}` : '';
    return db.all(
      `SELECT * FROM processing_jobs ${whereClause} ORDER BY priority DESC, created_at ASC`,
      ...params,
    );
  },

  /**
   * Update job status and record attempt.
   */
  updateJobStatus: (id: number, status: ProcessingJob['status'], error?: string) => {
    const db = getDb();
    const update = db.prepare(`
      UPDATE processing_jobs 
      SET status = ?, last_error = ?, attempts = attempts + 1, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `);

    db.transaction(() => {
      update.run(status, error || null, id);
      // Also log to job_attempts
      db.prepare(
        `
        INSERT INTO job_attempts (job_id, attempt_number, status, error_message)
        SELECT id, attempts, status, last_error FROM processing_jobs WHERE id = ?
      `,
      ).run(id);
    })();
  },

  /**
   * Lease a queued job for processing.
   * Atomically finds and locks a job.
   */
  leaseJob: (workerId: string, leaseTimeMinutes: number = 15) => {
    const db = getDb();
    const leaseExpiry = new Date(Date.now() - leaseTimeMinutes * 60000)
      .toISOString()
      .replace('T', ' ')
      .replace('Z', '');

    // Find a job that is either 'queued', or 'running' but has expired lease
    const findSql = `
      SELECT id FROM processing_jobs 
      WHERE status = 'queued' 
         OR (status = 'running' AND locked_at < ?)
      ORDER BY priority DESC, created_at ASC 
      LIMIT 1
    `;

    const lockSql = `
      UPDATE processing_jobs 
      SET status = 'running', 
          locked_by = ?, 
          locked_at = CURRENT_TIMESTAMP,
          attempts = attempts + 1,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `;

    return db.transaction(() => {
      const job = db.prepare(findSql).get(leaseExpiry) as { id: number } | undefined;
      if (!job) return null;

      db.prepare(lockSql).run(workerId, job.id);

      // Fetch full job details
      return db.prepare('SELECT * FROM processing_jobs WHERE id = ?').get(job.id) as ProcessingJob;
    })();
  },
};
