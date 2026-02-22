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
  createJob: async (job: Omit<ProcessingJob, 'id' | 'status' | 'attempts' | 'priority'>) => {
    const db = getDb();
    return await db
      .prepare(
        `
      INSERT INTO processing_jobs (run_id, step_name, target_type, target_id)
      VALUES (?, ?, ?, ?)
      RETURNING id
    `,
      )
      .get(job.run_id, job.step_name, job.target_type, job.target_id);
  },

  /**
   * List jobs with filtering.
   */
  listJobs: async (status?: string, targetType?: string) => {
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
    return await db.all(
      `SELECT * FROM processing_jobs ${whereClause} ORDER BY priority DESC, created_at ASC`,
      params,
    );
  },

  /**
   * Update job status and record attempt.
   */
  updateJobStatus: async (id: number, status: ProcessingJob['status'], error?: string) => {
    const db = getDb();

    await db.transaction(async (client) => {
      await client.query(
        `
        UPDATE processing_jobs 
        SET status = $1, last_error = $2, attempts = attempts + 1, updated_at = CURRENT_TIMESTAMP
        WHERE id = $3
      `,
        [status, error || null, id],
      );

      await client.query(
        `
        INSERT INTO job_attempts (job_id, attempt_number, status, error_message)
        SELECT id, attempts, status, last_error FROM processing_jobs WHERE id = $1
      `,
        [id],
      );
    })();
  },

  /**
   * Lease a queued job for processing.
   * Atomically finds and locks a job.
   */
  leaseJob: async (workerId: string, leaseTimeMinutes: number = 15) => {
    const db = getDb();

    // PG uses internal 'now() - interval' syntax which translateSql handles
    const leaseExpirySql = `now() - interval '${leaseTimeMinutes} minutes'`;

    return await db.transaction(async (client) => {
      // Use FOR UPDATE SKIP LOCKED for high-concurrency safety
      const findSql = `
        SELECT id FROM processing_jobs 
        WHERE (status = 'queued' OR (status = 'running' AND locked_at < ${leaseExpirySql}))
        ORDER BY priority DESC, created_at ASC 
        LIMIT 1
        FOR UPDATE SKIP LOCKED
      `;

      const res = await client.query(findSql);
      const job = res.rows[0];
      if (!job) return null;

      const lockSql = `
        UPDATE processing_jobs 
        SET status = 'running', 
            locked_by = $1, 
            locked_at = CURRENT_TIMESTAMP,
            attempts = attempts + 1,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = $2
        RETURNING *
      `;

      const updateRes = await client.query(lockSql, [workerId, job.id]);
      return updateRes.rows[0] as ProcessingJob;
    })();
  },
};
