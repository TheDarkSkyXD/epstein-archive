
-- Fix authentication schema
-- This migration ensures the users table has the password_hash column

-- Check if column exists is hard in strict SQL without stored procedures, 
-- but SQLite allows adding columns that might duplicate if not careful.
-- However, running this file blindly might error if column exists.
-- We will use a safe approach for SQLite usually:

-- Since SQLite ALTER TABLE ADD COLUMN is safe even if we run it multiple times? 
-- No, it errors if column exists. 
-- But for the schema.sql flow, we usually use IF NOT EXISTS checks or just letting it fail safely in migration scripts.

-- However, for this specific patch file, we'll simpler assume it runs once or use the app's migration runner if it existed.
-- Given we don't have a rigid migration runner, we'll mostly rely on `002_ensure_tables.sql` being correct in future.
-- But we should keep this file for record.

-- We can't really do "IF NOT EXISTS" for columns in SQLite easily in pure SQL script without logic.
-- So we will comment this out and rely on the script for the active fix, 
-- but update 002_ensure_tables.sql if we want fresh installs to work?
-- 002_ensure_tables.sql ALREADY had password_hash in the CREATE statement.
-- The issue was the table was created BEFORE that column was added to the CREATE statement in a previous version,
-- and SQLite doesn't auto-migrate existing tables when the CREATE statement changes.

-- So this file is just valid SQL to run manually if needed.
ALTER TABLE users ADD COLUMN password_hash TEXT;
