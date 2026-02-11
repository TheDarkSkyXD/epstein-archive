-- Migration 018: Add Bio and Birth Date
-- purpose: Store biographical details and birth dates for age calculation

ALTER TABLE entities ADD COLUMN bio TEXT;
ALTER TABLE entities ADD COLUMN birth_date TEXT; -- Store as YYYY-MM-DD
