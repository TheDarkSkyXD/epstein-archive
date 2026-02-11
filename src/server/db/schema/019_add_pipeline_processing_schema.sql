-- Pipeline runs tracking
CREATE TABLE IF NOT EXISTS pipeline_runs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    run_uuid TEXT UNIQUE NOT NULL,
    pipeline_version TEXT NOT NULL,
    git_commit TEXT,
    config_json TEXT,
    environment_json TEXT,
    status TEXT CHECK(status IN ('running', 'succeeded', 'failed', 'cancelled')) DEFAULT 'running',
    started_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    finished_at DATETIME,
    error_message TEXT
);

-- Pipeline steps metadata
CREATE TABLE IF NOT EXISTS pipeline_steps (
    step_name TEXT PRIMARY KEY,
    description TEXT
);

-- Processing jobs for granular tracking
CREATE TABLE IF NOT EXISTS processing_jobs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    run_id INTEGER,
    step_name TEXT NOT NULL,
    target_type TEXT CHECK(target_type IN ('document', 'evidence', 'media')) NOT NULL,
    target_id INTEGER NOT NULL,
    priority INTEGER DEFAULT 0,
    status TEXT CHECK(status IN ('queued', 'running', 'succeeded', 'failed_retryable', 'failed_permanent', 'skipped', 'cancelled')) DEFAULT 'queued',
    attempts INTEGER DEFAULT 0,
    max_attempts INTEGER DEFAULT 5,
    last_error TEXT,
    locked_by TEXT,
    locked_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (run_id) REFERENCES pipeline_runs(id) ON DELETE SET NULL,
    FOREIGN KEY (step_name) REFERENCES pipeline_steps(step_name)
);

-- Individual job attempts log
CREATE TABLE IF NOT EXISTS job_attempts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    job_id INTEGER NOT NULL,
    attempt_number INTEGER NOT NULL,
    status TEXT NOT NULL,
    error_message TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (job_id) REFERENCES processing_jobs(id) ON DELETE CASCADE
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_processing_jobs_status ON processing_jobs(status, priority, created_at);
CREATE INDEX IF NOT EXISTS idx_processing_jobs_target ON processing_jobs(target_type, target_id);
CREATE INDEX IF NOT EXISTS idx_processing_jobs_run ON processing_jobs(run_id);
