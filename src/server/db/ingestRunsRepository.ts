import { getDb } from './connection.js';

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
  static getRuns(limit: number = 20): IngestRun[] {
    const db = getDb();

    const rows = db
      .prepare(
        `
      SELECT 
        id,
        started_at as startedAt,
        finished_at as finishedAt,
        status,
        git_commit as gitCommit,
        schema_version as schemaVersion,
        pipeline_version as pipelineVersion,
        extractor_versions as extractorVersions,
        ocr_versions as ocrVersions,
        agentic_enabled as agenticEnabled,
        agentic_model_id as agenticModelId,
        agentic_prompt_version as agenticPromptVersion,
        agentic_params as agenticParams,
        notes
      FROM ingest_runs 
      ORDER BY started_at DESC 
      LIMIT ?
    `,
      )
      .all(limit);

    return rows.map((row: any) => ({
      ...row,
      agenticEnabled: Boolean(row.agenticEnabled),
      extractorVersions: row.extractorVersions ? JSON.parse(row.extractorVersions) : null,
      ocrVersions: row.ocrVersions ? JSON.parse(row.ocrVersions) : null,
      agenticParams: row.agenticParams ? JSON.parse(row.agenticParams) : null,
    }));
  }

  /**
   * Get latest successful run
   */
  static getLatestSuccess(): IngestRun | null {
    const db = getDb();

    const row = db
      .prepare(
        `
      SELECT * FROM ingest_runs 
      WHERE status = 'success' 
      ORDER BY finished_at DESC 
      LIMIT 1
    `,
      )
      .get();

    if (!row) return null;

    return {
      id: row.id,
      startedAt: row.started_at,
      finishedAt: row.finished_at,
      status: row.status,
      gitCommit: row.git_commit,
      schemaVersion: row.schema_version,
      pipelineVersion: row.pipeline_version,
      extractorVersions: row.extractor_versions ? JSON.parse(row.extractor_versions) : null,
      ocrVersions: row.ocr_versions ? JSON.parse(row.ocr_versions) : null,
      agenticEnabled: Boolean(row.agentic_enabled),
      agenticModelId: row.agentic_model_id,
      agenticPromptVersion: row.agentic_prompt_version,
      agenticParams: row.agentic_params ? JSON.parse(row.agentic_params) : null,
      notes: row.notes,
    };
  }
}

export const ingestRunsRepository = IngestRunsRepository;
