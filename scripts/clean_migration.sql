-- Clean Database Migration Script
-- Removes conflicting triggers and prepares for high-quality data enhancement

-- Step 1: Drop conflicting triggers
DROP TRIGGER IF EXISTS documents_ai;
DROP TRIGGER IF EXISTS documents_ad;
DROP TRIGGER IF EXISTS documents_au;

-- Step 2: Verify people table has required columns
-- The people table already has: primary_title, primary_role
-- No migration needed for people table

-- Step 3: Add any missing indexes
CREATE INDEX IF NOT EXISTS idx_people_primary_title ON people(primary_title);
CREATE INDEX IF NOT EXISTS idx_people_primary_role ON people(primary_role);
CREATE INDEX IF NOT EXISTS idx_people_full_name ON people(full_name);

-- Step 4: Add source tracking column to people table
ALTER TABLE people ADD COLUMN data_source TEXT DEFAULT 'seventh_production';

-- Step 5: Verify entity_documents table structure
-- Already exists with correct schema

-- Step 6: Verify timeline_events table structure  
-- Already exists with correct schema

-- Step 7: Create Black Book import tracking table
CREATE TABLE IF NOT EXISTS black_book_entries (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  person_id INTEGER,
  entry_text TEXT,
  phone_numbers TEXT, -- JSON array
  addresses TEXT, -- JSON array
  email_addresses TEXT, -- JSON array
  notes TEXT,
  page_number INTEGER,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (person_id) REFERENCES people(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_black_book_person ON black_book_entries(person_id);

-- Step 8: Add quality tracking fields
ALTER TABLE people ADD COLUMN quality_score INTEGER DEFAULT 0; -- 0-100
ALTER TABLE people ADD COLUMN needs_review BOOLEAN DEFAULT 0;
ALTER TABLE people ADD COLUMN is_consolidated BOOLEAN DEFAULT 0;

-- Step 9: Create data quality log table
CREATE TABLE IF NOT EXISTS data_quality_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  operation TEXT NOT NULL,
  entity_id INTEGER,
  details TEXT,
  timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
);

PRAGMA foreign_keys = ON;
