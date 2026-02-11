-- Migration: Add aliases column to entities table for nickname/alias search
-- This allows searching entities by alternative names like "Jeff Epstein" to find "Jeffrey Epstein"

-- Step 1: Add aliases column (JSON array format)
ALTER TABLE entities ADD COLUMN aliases TEXT DEFAULT NULL;

-- Step 2: Drop existing FTS table and recreate with aliases
DROP TABLE IF EXISTS entities_fts;
CREATE VIRTUAL TABLE entities_fts USING fts5(
  full_name,
  primary_role,
  connections_summary,
  aliases,
  content='entities',
  content_rowid='id'
);

-- Step 3: Rebuild FTS index
INSERT INTO entities_fts(entities_fts) VALUES('rebuild');
