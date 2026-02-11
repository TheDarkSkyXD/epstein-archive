-- Document Collections for organizing evidence by investigation
-- CTO Priority: HIGH #1

CREATE TABLE IF NOT EXISTS document_collections (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    description TEXT,
    investigation_id INTEGER,
    created_by INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    is_archived INTEGER DEFAULT 0,
    metadata_json TEXT,
    FOREIGN KEY (investigation_id) REFERENCES investigations(id) ON DELETE CASCADE,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
);

-- Junction table for documents in collections (many-to-many)
CREATE TABLE IF NOT EXISTS collection_documents (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    collection_id INTEGER NOT NULL,
    document_id INTEGER NOT NULL,
    added_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    added_by INTEGER,
    notes TEXT,
    sort_order INTEGER DEFAULT 0,
    FOREIGN KEY (collection_id) REFERENCES document_collections(id) ON DELETE CASCADE,
    FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE,
    FOREIGN KEY (added_by) REFERENCES users(id) ON DELETE SET NULL,
    UNIQUE(collection_id, document_id)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_document_collections_investigation ON document_collections(investigation_id);
CREATE INDEX IF NOT EXISTS idx_collection_documents_collection ON collection_documents(collection_id);
CREATE INDEX IF NOT EXISTS idx_collection_documents_document ON collection_documents(document_id);
CREATE INDEX IF NOT EXISTS idx_collection_documents_sort ON collection_documents(collection_id, sort_order);
