import { getApiPool } from './connection.js';

export interface IngestRun {
  id: string;
  startedAt: string;
  finishedAt: string | null;
  status: 'running' | 'success' | 'failed';
  gitCommit: string | null;
  schemaVersion: string | null;
  pipelineVersion: string | null;
  extractorVersions: any;
  ocrVersions: any;
  agenticEnabled: boolean;
  agenticModelId: string | null;
  agenticPromptVersion: string | null;
  agenticParams: any;
  notes: string | null;
}

export class IngestRunsRepository {
  /**
   * Get all ingest runs
   */
  static async getRuns(limit: number = 20): Promise<IngestRun[]> {
    const pool = getApiPool();

    const res = await pool.query(
      `
      SELECT 
        id,
        started_at as "startedAt",
        finished_at as "finishedAt",
        status,
        git_commit as "gitCommit",
        schema_version as "schemaVersion",
        pipeline_version as "pipelineVersion",
        extractor_versions as "extractorVersions",
        ocr_versions as "ocrVersions",
        agentic_enabled as "agenticEnabled",
        agentic_model_id as "agenticModelId",
        agentic_prompt_version as "agenticPromptVersion",
        agentic_params as "agenticParams",
        notes
      FROM ingest_runs 
      ORDER BY started_at DESC 
      LIMIT $1
    `,
      [limit],
    );

    return res.rows.map((row: any) => ({
      ...row,
      agenticEnabled: Boolean(row.agenticEnabled),
      extractorVersions:
        typeof row.extractorVersions === 'string'
          ? JSON.parse(row.extractorVersions)
          : row.extractorVersions,
      ocrVersions:
        typeof row.ocrVersions === 'string' ? JSON.parse(row.ocrVersions) : row.ocrVersions,
      agenticParams:
        typeof row.agenticParams === 'string' ? JSON.parse(row.agenticParams) : row.agenticParams,
    }));
  }

  /**
   * Get latest successful run
   */
  static async getLatestSuccess(): Promise<IngestRun | null> {
    const pool = getApiPool();

    const res = await pool.query(
      `
      SELECT * FROM ingest_runs 
      WHERE status = 'success' 
      ORDER BY finished_at DESC 
      LIMIT 1
    `,
    );

    const row = res.rows[0];
    if (!row) return null;

    return {
      id: row.id,
      startedAt: row.started_at,
      finishedAt: row.finished_at,
      status: row.status,
      gitCommit: row.git_commit,
      schemaVersion: row.schema_version,
      pipelineVersion: row.pipeline_version,
      extractorVersions:
        typeof row.extractor_versions === 'string'
          ? JSON.parse(row.extractor_versions)
          : row.extractor_versions,
      ocrVersions:
        typeof row.ocr_versions === 'string' ? JSON.parse(row.ocr_versions) : row.ocr_versions,
      agenticEnabled: Boolean(row.agentic_enabled),
      agenticModelId: row.agentic_model_id,
      agenticPromptVersion: row.agentic_prompt_version,
      agenticParams:
        typeof row.agentic_params === 'string'
          ? JSON.parse(row.agentic_params)
          : row.agentic_params,
      notes: row.notes,
    };
  }
}

export const ingestRunsRepository = IngestRunsRepository;
