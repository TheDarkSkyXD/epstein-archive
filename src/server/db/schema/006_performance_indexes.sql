-- Performance Indexes Migration
-- Composite indexes for common query patterns

-- Entity queries by type and rating
CREATE INDEX IF NOT EXISTS idx_entities_type_rating ON entities(entity_type, red_flag_rating DESC);

-- Entity lookup by full_name (for search)
CREATE INDEX IF NOT EXISTS idx_entities_full_name ON entities(full_name);

-- Documents by evidence type and rating
CREATE INDEX IF NOT EXISTS idx_documents_type_rating ON documents(evidence_type, red_flag_rating DESC);

-- Documents by file type
CREATE INDEX IF NOT EXISTS idx_documents_file_type ON documents(file_type);

-- Entity relationships composite index for graph queries
-- Entity relationships composite index for graph queries
CREATE INDEX IF NOT EXISTS idx_relationships_source_type ON entity_relationships(source_entity_id, relationship_type);
CREATE INDEX IF NOT EXISTS idx_relationships_target_type ON entity_relationships(target_entity_id, relationship_type);

-- Investigations by status for listing
CREATE INDEX IF NOT EXISTS idx_investigations_status ON investigations(status, created_at DESC);

-- Evidence by investigation
CREATE INDEX IF NOT EXISTS idx_investigation_evidence ON investigation_evidence(investigation_id);

-- Audit log by timestamp (for recent activity)
CREATE INDEX IF NOT EXISTS idx_audit_log_timestamp ON audit_log(timestamp DESC);
