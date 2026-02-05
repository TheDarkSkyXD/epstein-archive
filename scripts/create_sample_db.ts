import Database from 'better-sqlite3';
import { readFileSync, unlinkSync, existsSync } from 'fs';
import { join } from 'path';

const SOURCE_DB_PATH = process.env.DB_PATH || 'epstein-archive.db';
const SAMPLE_DB_PATH = 'sample.db';
const SCHEMA_PATH = 'schema.sql';

console.log(`Creating sample database from ${SOURCE_DB_PATH}...`);

// 1. Clean up old sample
if (existsSync(SAMPLE_DB_PATH)) {
  unlinkSync(SAMPLE_DB_PATH);
  console.log('Removed existing sample.db');
}

// 2. Initialize Sample DB with Schema
const sampleDb = new Database(SAMPLE_DB_PATH);
const schema = readFileSync(SCHEMA_PATH, 'utf-8');
sampleDb.exec(schema);
console.log('Initialized sample.db with schema.');

// 3. Connect to Source DB
const sourceDb = new Database(SOURCE_DB_PATH);

// 4. Select Sample Documents (50 random)
const documents = sourceDb
  .prepare(
    `
    SELECT DISTINCT d.* 
    FROM documents d 
    JOIN entity_mentions em ON d.id = em.document_id 
    ORDER BY RANDOM() 
    LIMIT 50
`,
  )
  .all();
console.log(`Selected ${documents.length} documents.`);

if (documents.length === 0) {
  console.error('No documents found in source DB!');
  process.exit(1);
}

// 5. Insert Documents
const insertDoc = sampleDb.prepare(`
  INSERT INTO documents (
    id, file_name, file_path, file_type, file_size, date_created, date_modified, 
    content_preview, evidence_type, mentions_count, content, metadata_json, 
    word_count, spice_rating, content_hash, original_file_id, original_file_path, 
    created_at, title, source_collection, red_flag_rating, type
  ) VALUES (
    @id, @file_name, @file_path, @file_type, @file_size, @date_created, @date_modified, 
    @content_preview, @evidence_type, @mentions_count, @content, @metadata_json, 
    @word_count, @spice_rating, @content_hash, @original_file_id, @original_file_path, 
    @created_at, @title, @source_collection, @red_flag_rating, @type
  )
`);

// insertPage skipped because table is missing
/*
const insertPage = sampleDb.prepare(`
  INSERT INTO document_pages (
    document_id, page_number, extracted_text, text_source, ocr_quality_score, phash
  ) VALUES (
    @document_id, @page_number, @extracted_text, @text_source, @ocr_quality_score, @phash
  )
`);
*/

// We need to check if document_pages table exists in source schema, assuming it does based on previous context
// Wait, looking at schema.sql I pulled earlier... I don't see `document_pages` in the CREATE TABLE list in the first view!
// Let me double check if I missed it or if it schema.sql was incomplete in the view.
// Ah, `schema.sql` in the view I got earlier went up to line 433 and `document_pages` was NOT there.
// But `ingest_intelligence.ts` referenced it.
// I should rely on what `ingest_intelligence.ts` uses or check `sqlite_master`.
// For safety, I will check if tables exist before querying source.

function tableExists(db: Database.Database, tableName: string) {
  return (
    db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name=?").get(tableName) !==
    undefined
  );
}

const hasPages = tableExists(sourceDb, 'document_pages');
const hasSentences = tableExists(sourceDb, 'document_sentences');

const insertMention = sampleDb.prepare(`
  INSERT INTO entity_mentions (
    entity_id, document_id, mention_context, mention_type, page_number, 
    position_in_text, created_at, context_type, context_text, keyword, 
    position_start, position_end, significance_score, assigned_by, score
  ) VALUES (
    @entity_id, @document_id, @mention_context, @mention_type, @page_number, 
    @position_in_text, @created_at, @context_type, @context_text, @keyword, 
    @position_start, @position_end, @significance_score, @assigned_by, @score
  )
`);

const insertEntity = sampleDb.prepare(`
  INSERT OR IGNORE INTO entities (
    id, full_name, primary_role, secondary_roles, likelihood_level, mentions, 
    current_status, connections_summary, spice_rating, spice_score, title, 
    role, date_taken, date_added, date_modified, title_variants, created_at, 
    updated_at, risk_factor, entity_type, type, entity_category, risk_level, 
    red_flag_rating, red_flag_score, red_flag_description, aliases, death_date, 
    notes, bio, birth_date, aliases_json, handles_json, status_last_updated, 
    evidence_type_distribution
  ) VALUES (
    @id, @full_name, @primary_role, @secondary_roles, @likelihood_level, @mentions, 
    @current_status, @connections_summary, @spice_rating, @spice_score, @title, 
    @role, @date_taken, @date_added, @date_modified, @title_variants, @created_at, 
    @updated_at, @risk_factor, @entity_type, @type, @entity_category, @risk_level, 
    @red_flag_rating, @red_flag_score, @red_flag_description, @aliases, @death_date, 
    @notes, @bio, @birth_date, @aliases_json, @handles_json, @status_last_updated, 
    @evidence_type_distribution
  )
`);

sampleDb.transaction(() => {
  for (const doc of documents as any[]) {
    insertDoc.run(doc);

    // Pages - Skipped as table missing in schema.sql
    /*
    if (hasPages) {
       // ...
    }
    */

    // Mentions & Entities
    const mentions = sourceDb
      .prepare('SELECT * FROM entity_mentions WHERE document_id = ?')
      .all(doc.id) as any[];
    for (const mention of mentions) {
      // Get the entity
      const entity = sourceDb.prepare('SELECT * FROM entities WHERE id = ?').get(mention.entity_id);
      if (entity) {
        // Explicitly polyfill all columns expected by the INSERT statement
        const safeEntity = {
          ...entity,
          secondary_roles: entity.secondary_roles || null,
          likelihood_level: entity.likelihood_level || null,
          primary_role: entity.primary_role || null,
          title: entity.title || null,
          role: entity.role || null,
          current_status: entity.current_status || null,
          connections_summary: entity.connections_summary || null,
          title_variants: entity.title_variants || null,
          risk_factor: entity.risk_factor || 0,
          entity_type: entity.entity_type || 'Person',
          type: entity.type || 'Person',
          entity_category: entity.entity_category || null,
          risk_level: entity.risk_level || null,
          red_flag_rating: entity.red_flag_rating || 0,
          red_flag_score: entity.red_flag_score || 0,
          red_flag_description: entity.red_flag_description || null,
          aliases: entity.aliases || null,
          death_date: entity.death_date || null,
          notes: entity.notes || null,
          bio: entity.bio || null,
          birth_date: entity.birth_date || null,
          status_last_updated: entity.status_last_updated || null,
          aliases_json: entity.aliases_json || '[]',
          handles_json: entity.handles_json || '[]',
          evidence_type_distribution: entity.evidence_type_distribution || '{}',
        };
        insertEntity.run(safeEntity);
        // Polyfill mention
        const safeMention = {
          ...mention,
          page_number: mention.page_number || null,
          position_in_text: mention.position_in_text || null,
          context_type: mention.context_type || 'mention',
          context_text: mention.context_text || '',
          keyword: mention.keyword || null,
          position_start: mention.position_start || null,
          position_end: mention.position_end || null,
          significance_score: mention.significance_score || 1,
          assigned_by: mention.assigned_by || null,
          score: mention.score || null,
        };

        try {
          insertMention.run(safeMention);
        } catch (e) {
          console.error('Failed to insert mention:', e);
        }
      }
    }
  }
})();

console.log('Sample database created successfully.');
