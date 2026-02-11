-- Cleanup Audit Trail for tracking deletions with rollback capability
-- CTO Priority: HIGH #3

CREATE TABLE IF NOT EXISTS cleanup_audit (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    table_name TEXT NOT NULL,
    record_id INTEGER NOT NULL,
    operation TEXT CHECK(operation IN ('DELETE', 'UPDATE', 'MERGE')) NOT NULL,
    before_data TEXT NOT NULL, -- JSON snapshot of record before deletion
    after_data TEXT, -- JSON snapshot after operation (for updates)
    deleted_by INTEGER,
    deleted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    reason TEXT,
    is_rolled_back INTEGER DEFAULT 0,
    rolled_back_at DATETIME,
    rolled_back_by INTEGER,
    metadata_json TEXT,
    FOREIGN KEY (deleted_by) REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY (rolled_back_by) REFERENCES users(id) ON DELETE SET NULL
);

-- Indexes for querying audit trail
CREATE INDEX IF NOT EXISTS idx_cleanup_audit_table ON cleanup_audit(table_name);
CREATE INDEX IF NOT EXISTS idx_cleanup_audit_record ON cleanup_audit(table_name, record_id);
CREATE INDEX IF NOT EXISTS idx_cleanup_audit_deleted_at ON cleanup_audit(deleted_at DESC);
CREATE INDEX IF NOT EXISTS idx_cleanup_audit_deleted_by ON cleanup_audit(deleted_by);
CREATE INDEX IF NOT EXISTS idx_cleanup_audit_rollback ON cleanup_audit(is_rolled_back);
