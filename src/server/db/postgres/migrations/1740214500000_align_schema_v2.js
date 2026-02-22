/* eslint-disable no-undef */

export async function up(pgm) {
  // 1. Align documents table with legacy SQLite expectations
  pgm.sql(`
    DO $$
    BEGIN
      -- Rename columns if they exist with old names
      IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='documents' AND column_name='mime_type') THEN
        ALTER TABLE documents RENAME COLUMN mime_type TO file_type;
      END IF;
      
      IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='documents' AND column_name='file_size_bytes') THEN
        ALTER TABLE documents RENAME COLUMN file_size_bytes TO file_size;
      END IF;
      
      IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='documents' AND column_name='created_at') THEN
        ALTER TABLE documents RENAME COLUMN created_at TO date_created;
      END IF;

      -- Add missing columns to documents
      IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='documents' AND column_name='red_flag_rating') THEN
        ALTER TABLE documents ADD COLUMN red_flag_rating INTEGER DEFAULT 0;
      END IF;
      
      IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='documents' AND column_name='has_failed_redactions') THEN
        ALTER TABLE documents ADD COLUMN has_failed_redactions INTEGER DEFAULT 0;
      END IF;
      
      IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='documents' AND column_name='is_hidden') THEN
        ALTER TABLE documents ADD COLUMN is_hidden INTEGER DEFAULT 0;
      END IF;

      IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='documents' AND column_name='evidence_type') THEN
        ALTER TABLE documents ADD COLUMN evidence_type TEXT;
      END IF;

      IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='documents' AND column_name='content_refined') THEN
        ALTER TABLE documents ADD COLUMN content_refined TEXT;
      END IF;

      IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='documents' AND column_name='metadata_json') THEN
        ALTER TABLE documents ADD COLUMN metadata_json JSONB;
      END IF;

      IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='documents' AND column_name='word_count') THEN
        ALTER TABLE documents ADD COLUMN word_count INTEGER DEFAULT 0;
      END IF;
      
      -- 2. Align entities table
      IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='entities' AND column_name='was_agentic') THEN
        ALTER TABLE entities ADD COLUMN was_agentic INTEGER DEFAULT 0;
      END IF;
      
      IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='entities' AND column_name='junk_flag') THEN
        ALTER TABLE entities ADD COLUMN junk_flag INTEGER DEFAULT 0;
      END IF;

      -- 3. Align media_items table
      IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='media_items' AND column_name='media_type') THEN
        ALTER TABLE media_items RENAME COLUMN media_type TO file_type;
      END IF;
      
    END;
    $$;
  `);

  // 4. Create missing graph tables
  pgm.createTable('entity_adjacency', {
    entity_id: { type: 'bigint', notNull: true },
    neighbor_id: { type: 'bigint', notNull: true },
    weight: { type: 'real', default: 0 },
    bridge_score: { type: 'real', default: 0 },
    relationship_types: { type: 'text' },
  });
  pgm.addConstraint('entity_adjacency', 'pk_entity_adjacency', {
    primaryKey: ['entity_id', 'neighbor_id'],
  });

  pgm.createTable('graph_cache_state', {
    id: { type: 'serial', primaryKey: true },
    last_rebuild: { type: 'timestamp', default: pgm.func('current_timestamp') },
    is_dirty: { type: 'integer', default: 1 },
  });

  // Seed graph_cache_state
  pgm.sql(`INSERT INTO graph_cache_state (id, is_dirty) VALUES (1, 1) ON CONFLICT DO NOTHING`);
}

export async function down(pgm) {
  pgm.dropTable('graph_cache_state');
  pgm.dropTable('entity_adjacency');

  pgm.sql(`
    DO $$
    BEGIN
      IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='documents' AND column_name='file_type') THEN
        ALTER TABLE documents RENAME COLUMN file_type TO mime_type;
      END IF;
      
      IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='documents' AND column_name='file_size') THEN
        ALTER TABLE documents RENAME COLUMN file_size TO file_size_bytes;
      END IF;
      
      IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='documents' AND column_name='date_created') THEN
        ALTER TABLE documents RENAME COLUMN date_created TO created_at;
      END IF;
      
      IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='media_items' AND column_name='file_type') THEN
        ALTER TABLE media_items RENAME COLUMN file_type TO media_type;
      END IF;
    END;
    $$;
  `);
}
