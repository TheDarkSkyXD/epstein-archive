-- Add entry_category to black_book_entries
ALTER TABLE black_book_entries ADD COLUMN entry_category TEXT DEFAULT 'original';
CREATE INDEX idx_black_book_category ON black_book_entries(entry_category);
