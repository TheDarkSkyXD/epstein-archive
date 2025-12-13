import { getDb } from './connection.js';

export const jobsRepository = {
  listJobs: (jobType?: string, status?: string) => {
    const db = getDb();
    const where: string[] = [];
    const params: any = {};
    
    if (jobType) { 
      where.push('job_type = @jobType'); 
      params.jobType = jobType;
    }
    
    if (status) { 
      where.push('status = @status'); 
      params.status = status;
    }
    
    const whereClause = where.length ? `WHERE ${where.join(' AND ')}` : '';
    return db.prepare(`SELECT id, uuid, job_type, payload_json, status, started_at, finished_at, error_message FROM jobs ${whereClause} ORDER BY started_at DESC`).all(params);
  }
};