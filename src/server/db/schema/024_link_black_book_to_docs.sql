-- Migration to link Black Book entries back to source documents
ALTER TABLE black_book_entries ADD COLUMN document_id INTEGER REFERENCES documents(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_black_book_document ON black_book_entries(document_id);
