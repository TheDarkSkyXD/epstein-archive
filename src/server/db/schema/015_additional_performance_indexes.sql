-- Additional Performance Indexes for Common Query Patterns
-- Conservative approach - only indexing columns we're certain exist

-- Composite index for entity sorting by rating + mentions + name
-- Used in entities.getEntities() with sortBy='default' and 'risk'
CREATE INDEX IF NOT EXISTS idx_entities_rating_mentions_name
ON entities(red_flag_rating DESC, mentions DESC, full_name ASC);

-- Entity mentions by entity_id for document association lookups
CREATE INDEX IF NOT EXISTS idx_entity_mentions_entity_id
ON entity_mentions(entity_id);

-- Entity mentions by document_id for reverse lookup
CREATE INDEX IF NOT EXISTS idx_entity_mentions_document_id
ON entity_mentions(document_id);
