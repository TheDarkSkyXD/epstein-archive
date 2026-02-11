-- Migration: Add confidence scoring and verification for auto-entity linking
-- CTO Priority: MEDIUM #8 - Auto-entity linking with confidence scores
-- Enables automatic entity detection with fuzzy matching and human verification

-- Add confidence and linking method tracking to entity_mentions
ALTER TABLE entity_mentions ADD COLUMN confidence_score REAL DEFAULT 1.0 CHECK(confidence_score >= 0.0 AND confidence_score <= 1.0);
ALTER TABLE entity_mentions ADD COLUMN link_method TEXT DEFAULT 'manual' CHECK(link_method IN ('manual', 'exact_match', 'fuzzy_match', 'alias_match', 'ai_detected'));
ALTER TABLE entity_mentions ADD COLUMN verified INTEGER DEFAULT 0;
ALTER TABLE entity_mentions ADD COLUMN verified_by INTEGER;
ALTER TABLE entity_mentions ADD COLUMN verified_at DATETIME;
ALTER TABLE entity_mentions ADD COLUMN rejection_reason TEXT;

-- Foreign key for verified_by
-- Note: We can't add FK constraints to existing columns in SQLite, so this is informational
-- CREATE INDEX to support queries by verifier
CREATE INDEX IF NOT EXISTS idx_entity_mentions_verified_by
  ON entity_mentions(verified_by);

-- Index for filtering by confidence score (useful for finding low-confidence links)
CREATE INDEX IF NOT EXISTS idx_entity_mentions_confidence
  ON entity_mentions(confidence_score);

-- Index for filtering by verification status
CREATE INDEX IF NOT EXISTS idx_entity_mentions_verified
  ON entity_mentions(verified);

-- Composite index for finding unverified automatic links
CREATE INDEX IF NOT EXISTS idx_entity_mentions_auto_unverified
  ON entity_mentions(link_method, verified, confidence_score);

-- Create entity_link_candidates table for tracking potential matches before committing
CREATE TABLE IF NOT EXISTS entity_link_candidates (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  document_id INTEGER NOT NULL,
  mention_text TEXT NOT NULL,
  mention_context TEXT,
  start_offset INTEGER,
  end_offset INTEGER,
  candidate_entity_id INTEGER NOT NULL,
  confidence_score REAL NOT NULL CHECK(confidence_score >= 0.0 AND confidence_score <= 1.0),
  match_method TEXT CHECK(match_method IN ('exact', 'fuzzy', 'alias', 'ai', 'pattern')),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  processed INTEGER DEFAULT 0,
  accepted INTEGER DEFAULT 0,
  rejected INTEGER DEFAULT 0,
  reviewed_by INTEGER,
  reviewed_at DATETIME,
  notes TEXT,
  FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE,
  FOREIGN KEY (candidate_entity_id) REFERENCES entities(id) ON DELETE CASCADE,
  FOREIGN KEY (reviewed_by) REFERENCES users(id) ON DELETE SET NULL
);

-- Indexes for entity_link_candidates
CREATE INDEX IF NOT EXISTS idx_link_candidates_document
  ON entity_link_candidates(document_id);

CREATE INDEX IF NOT EXISTS idx_link_candidates_entity
  ON entity_link_candidates(candidate_entity_id);

CREATE INDEX IF NOT EXISTS idx_link_candidates_processed
  ON entity_link_candidates(processed, confidence_score DESC);

CREATE INDEX IF NOT EXISTS idx_link_candidates_pending
  ON entity_link_candidates(processed, accepted, rejected);

-- Add entity matching configuration table
CREATE TABLE IF NOT EXISTS entity_link_config (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  config_key TEXT UNIQUE NOT NULL,
  config_value TEXT NOT NULL,
  description TEXT,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_by INTEGER,
  FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE SET NULL
);

-- Default configuration values for auto-linking
INSERT INTO entity_link_config (config_key, config_value, description) VALUES
  ('min_confidence_auto_accept', '0.95', 'Minimum confidence score to automatically accept a link without review'),
  ('min_confidence_suggest', '0.70', 'Minimum confidence score to suggest a link for review'),
  ('fuzzy_match_threshold', '0.85', 'Levenshtein similarity threshold for fuzzy name matching'),
  ('enable_auto_linking', 'true', 'Master switch for automatic entity linking'),
  ('enable_ai_detection', 'false', 'Enable AI-based entity detection (requires API keys)'),
  ('max_candidates_per_document', '100', 'Maximum number of entity candidates to generate per document')
ON CONFLICT(config_key) DO NOTHING;
