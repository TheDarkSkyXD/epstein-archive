-- Phase 6: Backend Resilience & Scale Hardening
-- Covering indexes for common hot paths (Entities, Relationships, Media)

-- 1. Optimized Entity Lookups (Canonical & Risk)
-- This covers getEntityById, canonicalization logic, and risk-based listing
CREATE INDEX IF NOT EXISTS idx_entities_canonical_cover 
ON entities(canonical_id, id, full_name, red_flag_rating);

-- 2. Optimized Graph Connectivity (Ego-Graph Hot Path)
-- Covering source-to-target lookup with metadata included to avoid table access
CREATE INDEX IF NOT EXISTS idx_relationships_graph_cover_source
ON entity_relationships(source_entity_id, target_entity_id, relationship_type, strength)
WHERE strength > 0;

CREATE INDEX IF NOT EXISTS idx_relationships_graph_cover_target
ON entity_relationships(target_entity_id, source_entity_id, relationship_type, strength)
WHERE strength > 0;

-- 3. Optimized Media Integration (Subject Card Photos)
-- Prevents table scan when SubjectCardV2 fetches first media icon
CREATE INDEX IF NOT EXISTS idx_media_items_entity_type_cover
ON media_items(entity_id, file_type, id, thumbnail_path)
WHERE file_type LIKE 'image/%';

-- 4. Optimized Mention Linkage (Document-Entity Mapping)
-- Covers the most expensive JOIN in the application (1M+ rows)
CREATE INDEX IF NOT EXISTS idx_entity_mentions_coverage
ON entity_mentions(entity_id, document_id, doc_red_flag_rating DESC);
