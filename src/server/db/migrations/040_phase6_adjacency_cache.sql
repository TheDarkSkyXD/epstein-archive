-- Phase 6: Adjacency Cache for Graph Optimization
CREATE TABLE IF NOT EXISTS entity_adjacency (
    entity_id INTEGER NOT NULL,
    neighbor_id INTEGER NOT NULL,
    weight REAL DEFAULT 1.0,
    relationship_types TEXT, -- Comma-separated or JSON
    last_updated DATETIME DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (entity_id, neighbor_id)
);

CREATE INDEX IF NOT EXISTS idx_entity_adjacency_entity ON entity_adjacency(entity_id);
CREATE INDEX IF NOT EXISTS idx_entity_adjacency_neighbor ON entity_adjacency(neighbor_id);

-- Optional: Add a tracking table for cache state
CREATE TABLE IF NOT EXISTS graph_cache_state (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    last_rebuild DATETIME,
    is_dirty INTEGER DEFAULT 1
);

INSERT OR IGNORE INTO graph_cache_state (id, last_rebuild, is_dirty) VALUES (1, NULL, 1);
