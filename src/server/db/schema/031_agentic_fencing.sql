-- Phase 2: Agentic Layer Fencing

-- 1. Entity and Relationship level markers
ALTER TABLE entities ADD COLUMN was_agentic BOOLEAN DEFAULT FALSE;
ALTER TABLE entity_relationships ADD COLUMN was_agentic BOOLEAN DEFAULT FALSE;
ALTER TABLE claim_triples ADD COLUMN was_agentic BOOLEAN DEFAULT FALSE;

-- 2. Review Queue for High-Impact Agentic Outputs
CREATE TABLE IF NOT EXISTS review_queue (
  id TEXT PRIMARY KEY,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  type TEXT CHECK(type IN ('entity_creation', 'relationship_discovery', 'summary_generation', 'conflicts_resolution')),
  subject_id TEXT NOT NULL, -- UUID or ID of the object being reviewed
  ingest_run_id TEXT,
  status TEXT CHECK(status IN ('pending', 'reviewed', 'rejected')) DEFAULT 'pending',
  priority TEXT CHECK(priority IN ('high', 'medium', 'low')) DEFAULT 'medium',
  payload_json JSON, -- Raw agentic output before approval
  assigned_to TEXT,
  reviewed_at DATETIME,
  reviewer_id TEXT,
  decision TEXT,
  notes TEXT,
  FOREIGN KEY (ingest_run_id) REFERENCES ingest_runs(id) ON DELETE SET NULL
);

-- Index for efficient queue management
CREATE INDEX idx_review_queue_status ON review_queue(status, priority);
CREATE INDEX idx_review_queue_run ON review_queue(ingest_run_id);
