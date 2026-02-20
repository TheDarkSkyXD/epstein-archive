/* eslint-disable no-undef */

export const shorthands = undefined;

export async function up(pgm) {
  // 1. Users & Auth
  pgm.createTable('users', {
    id: { type: 'text', primaryKey: true },
    username: { type: 'text', unique: true },
    email: { type: 'text' },
    role: { type: 'text' },
    password_hash: { type: 'text' },
    created_at: { type: 'timestamp', default: pgm.func('current_timestamp') },
    last_login_at: { type: 'timestamp' },
  });

  // 1b. Auth Audit & Sessions (Hardening)
  pgm.createTable('audit_log', {
    id: { type: 'bigserial', primaryKey: true },
    timestamp: { type: 'timestamp', default: pgm.func('current_timestamp') },
    actor_id: { type: 'text' },
    action: { type: 'text', notNull: true },
    target_type: { type: 'text' },
    target_id: { type: 'text' },
    payload_json: { type: 'jsonb' },
    ip_address: { type: 'text' },
    user_agent: { type: 'text' },
  });
  pgm.createIndex('audit_log', 'actor_id');
  pgm.createIndex('audit_log', 'timestamp');

  // 2. Documents
  pgm.createTable('documents', {
    id: { type: 'bigserial', primaryKey: true },
    file_name: { type: 'text' },
    file_path: { type: 'text', unique: true },
    title: { type: 'text' },
    content: { type: 'text' },
    mime_type: { type: 'text' },
    file_size_bytes: { type: 'bigint' },
    page_count: { type: 'integer', default: 0 },
    is_sensitive: { type: 'boolean', default: false },
    signal_score: { type: 'real', default: 0 },
    processing_status: { type: 'text', default: 'queued' },
    processing_error: { type: 'text' },
    processing_attempts: { type: 'integer', default: 0 },
    worker_id: { type: 'text' },
    lease_expires_at: { type: 'timestamp' },
    last_processed_at: { type: 'timestamp' },
    created_at: { type: 'timestamp', default: pgm.func('current_timestamp') },
    analyzed_at: { type: 'timestamp' },
    unredaction_attempted: { type: 'integer', default: 0 },
    unredaction_succeeded: { type: 'integer', default: 0 },
    redaction_coverage_before: { type: 'real' },
    redaction_coverage_after: { type: 'real' },
    unredacted_text_gain: { type: 'real' },
    unredaction_baseline_vocab: { type: 'text' },
    source_collection: { type: 'text' },
    content_hash: { type: 'text' },
  });

  // 3. Entities
  pgm.createTable('entities', {
    id: { type: 'bigserial', primaryKey: true },
    full_name: { type: 'text', notNull: true },
    entity_type: { type: 'text', default: 'Person' },
    type: { type: 'text', default: 'Person' },
    entity_category: { type: 'text' },
    risk_level: { type: 'text' },
    red_flag_rating: { type: 'integer', default: 1 },
    red_flag_description: { type: 'text' },
    bio: { type: 'text' },
    birth_date: { type: 'text' },
    death_date: { type: 'text' },
    aliases: { type: 'text' },
    notes: { type: 'text' },
    primary_role: { type: 'text' },
    connections_summary: { type: 'text' },
    canonical_id: { type: 'bigint', references: 'entities(id)' },
    junk_tier: { type: 'text', default: 'clean' },
    quarantine_status: { type: 'integer', default: 0 },
    entity_metadata_json: { type: 'jsonb' },
    is_vip: { type: 'integer', default: 0 },
    created_at: { type: 'timestamp', default: pgm.func('current_timestamp') },
    updated_at: { type: 'timestamp', default: pgm.func('current_timestamp') },
  });

  // 3b. Evidence Types (Lookup)
  pgm.createTable('evidence_types', {
    id: { type: 'bigserial', primaryKey: true },
    type_name: { type: 'text', unique: true, notNull: true },
    description: { type: 'text' },
  });

  pgm.createTable('entity_evidence_types', {
    entity_id: { type: 'bigint', references: 'entities(id)', onDelete: 'CASCADE' },
    evidence_type_id: { type: 'bigint', references: 'evidence_types(id)', onDelete: 'CASCADE' },
  });
  pgm.addConstraint('entity_evidence_types', 'pk_entity_evidence_types', {
    primaryKey: ['entity_id', 'evidence_type_id'],
  });

  // 4. Mentions (Unified Rich Schema)
  pgm.createTable('entity_mentions', {
    id: { type: 'text', primaryKey: true },
    entity_id: { type: 'bigint', references: 'entities(id)', onDelete: 'CASCADE' },
    document_id: { type: 'bigint', references: 'documents(id)', onDelete: 'CASCADE' },
    span_id: { type: 'text' },
    start_offset: { type: 'integer' },
    end_offset: { type: 'integer' },
    surface_text: { type: 'text' },
    mention_type: { type: 'text' },
    mention_context: { type: 'text' },
    confidence: { type: 'real', default: 1.0 },
    ingest_run_id: { type: 'text' },
    page_number: { type: 'integer' },
    position_start: { type: 'integer' },
    position_end: { type: 'integer' },
    significance_score: { type: 'real', default: 1.0 },
    created_at: { type: 'timestamp', default: pgm.func('current_timestamp') },
  });

  // 5. Relationships & Graph
  pgm.createTable('entity_relationships', {
    source_entity_id: { type: 'bigint', references: 'entities(id)', onDelete: 'CASCADE' },
    target_entity_id: { type: 'bigint', references: 'entities(id)', onDelete: 'CASCADE' },
    relationship_type: { type: 'text', default: 'co_occurrence' },
    strength: { type: 'real', default: 0 },
    confidence: { type: 'real', default: 0.5 },
    proximity_score: { type: 'real', default: 0.0 },
    risk_score: { type: 'real', default: 0.0 },
    first_seen_at: { type: 'timestamp' },
    last_seen_at: { type: 'timestamp' },
    ingest_run_id: { type: 'text' },
    evidence_pack_json: { type: 'jsonb' },
    created_at: { type: 'timestamp', default: pgm.func('current_timestamp') },
    updated_at: { type: 'timestamp', default: pgm.func('current_timestamp') },
  });
  pgm.addConstraint('entity_relationships', 'pk_entity_relationships', {
    primaryKey: ['source_entity_id', 'target_entity_id', 'relationship_type'],
  });

  // Detailed Relations (Standard Shape)
  pgm.createTable('relations', {
    id: { type: 'text', primaryKey: true },
    subject_entity_id: { type: 'bigint', references: 'entities(id)', onDelete: 'CASCADE' },
    object_entity_id: { type: 'bigint', references: 'entities(id)', onDelete: 'CASCADE' },
    predicate: { type: 'text' },
    direction: { type: 'text' },
    weight: { type: 'real', default: 1.0 },
    first_seen_at: { type: 'timestamp', default: pgm.func('current_timestamp') },
    last_seen_at: { type: 'timestamp', default: pgm.func('current_timestamp') },
    status: { type: 'text', default: 'active' },
  });

  // 6. Investigations
  pgm.createTable('investigations', {
    id: { type: 'bigserial', primaryKey: true },
    uuid: { type: 'text', unique: true },
    title: { type: 'text', notNull: true },
    description: { type: 'text' },
    status: { type: 'text', default: 'active' },
    priority: { type: 'text', default: 'medium' },
    owner_id: { type: 'text' },
    created_by: { type: 'text' },
    assigned_to: { type: 'text' },
    created_at: { type: 'timestamp', default: pgm.func('current_timestamp') },
    updated_at: { type: 'timestamp', default: pgm.func('current_timestamp') },
    metadata_json: { type: 'jsonb' },
  });

  pgm.createTable('investigation_evidence', {
    investigation_id: { type: 'bigint', references: 'investigations(id)', onDelete: 'CASCADE' },
    document_id: { type: 'bigint', references: 'documents(id)', onDelete: 'CASCADE' },
    added_by: { type: 'text' },
    added_at: { type: 'timestamp', default: pgm.func('current_timestamp') },
    notes: { type: 'text' },
  });
  pgm.addConstraint('investigation_evidence', 'pk_investigation_evidence', {
    primaryKey: ['investigation_id', 'document_id'],
  });

  // 7. Media & Evidence
  pgm.createTable('media_albums', {
    id: { type: 'bigserial', primaryKey: true },
    name: { type: 'text', notNull: true },
    description: { type: 'text' },
    cover_image_id: { type: 'text' },
    created_at: { type: 'timestamp', default: pgm.func('current_timestamp') },
    date_modified: { type: 'timestamp', default: pgm.func('current_timestamp') },
    is_sensitive: { type: 'boolean', default: false },
  });

  pgm.createTable('media_items', {
    id: { type: 'text', primaryKey: true },
    entity_id: { type: 'bigint', references: 'entities(id)', onDelete: 'CASCADE' },
    document_id: { type: 'bigint', references: 'documents(id)', onDelete: 'CASCADE' },
    album_id: { type: 'bigint', references: 'media_albums(id)', onDelete: 'SET NULL' },
    media_type: { type: 'text' },
    file_path: { type: 'text', notNull: true },
    thumbnail_path: { type: 'text' },
    original_url: { type: 'text' },
    title: { type: 'text' },
    caption: { type: 'text' },
    description: { type: 'text' },
    verification_status: { type: 'text', default: 'unverified' },
    red_flag_rating: { type: 'integer', default: 1 },
    is_sensitive: { type: 'boolean', default: false },
    exif_json: { type: 'jsonb' },
    metadata_json: { type: 'jsonb' },
    created_at: { type: 'timestamp', default: pgm.func('current_timestamp') },
  });

  pgm.createTable('media_tags', {
    id: { type: 'bigserial', primaryKey: true },
    name: { type: 'text', unique: true, notNull: true },
    category: { type: 'text' },
    color: { type: 'text', default: '#6366f1' },
  });

  pgm.createTable('media_album_items', {
    album_id: { type: 'bigint', references: 'media_albums(id)', onDelete: 'CASCADE' },
    media_item_id: { type: 'text', references: 'media_items(id)', onDelete: 'CASCADE' },
    order: { type: 'integer', default: 0 },
    added_at: { type: 'timestamp', default: pgm.func('current_timestamp') },
  });
  pgm.addConstraint('media_album_items', 'pk_media_album_items', {
    primaryKey: ['album_id', 'media_item_id'],
  });

  // 8. Ingest Runs
  pgm.createTable('ingest_runs', {
    id: { type: 'text', primaryKey: true },
    status: { type: 'text', default: 'queued' },
    git_commit: { type: 'text' },
    pipeline_version: { type: 'text' },
    agentic_enabled: { type: 'integer', default: 0 },
    notes: { type: 'text' },
    created_at: { type: 'timestamp', default: pgm.func('current_timestamp') },
    finished_at: { type: 'timestamp' },
  });

  // 9. Claims & Statements
  pgm.createTable('claim_triples', {
    id: { type: 'bigserial', primaryKey: true },
    subject_entity_id: { type: 'bigint', references: 'entities(id)', onDelete: 'CASCADE' },
    predicate: { type: 'text' },
    object_entity_id: { type: 'bigint', references: 'entities(id)', onDelete: 'CASCADE' },
    object_text: { type: 'text' },
    document_id: { type: 'bigint', references: 'documents(id)', onDelete: 'CASCADE' },
    sentence_id: { type: 'bigint' },
    confidence: { type: 'real', default: 0.5 },
    modality: { type: 'text', default: 'asserted' },
    evidence_json: { type: 'jsonb' },
    created_at: { type: 'timestamp', default: pgm.func('current_timestamp') },
  });

  // 10. Financial Transactions (Forensic-Grade)
  pgm.createTable('financial_transactions', {
    id: { type: 'bigserial', primaryKey: true },
    from_entity: { type: 'text', notNull: true },
    to_entity: { type: 'text', notNull: true },
    amount: { type: 'numeric(18, 2)', notNull: true },
    currency: { type: 'text', default: 'USD' },
    transaction_date: { type: 'timestamp', notNull: true },
    transaction_type: { type: 'text', notNull: true }, // payment, transfer, offshore
    method: { type: 'text', notNull: true }, // wire, crypto, cash
    risk_level: { type: 'text', default: 'medium' },
    description: { type: 'text' },
    investigation_id: { type: 'bigint', references: 'investigations(id)' },
    source_document_id: { type: 'bigint', references: 'documents(id)' },
    metadata_json: { type: 'jsonb' },
    created_at: { type: 'timestamp', default: pgm.func('current_timestamp') },
  });

  // 11. Support Tables for Granular Provenance
  pgm.createTable('document_pages', {
    id: { type: 'bigserial', primaryKey: true },
    document_id: { type: 'bigint', references: 'documents(id)', onDelete: 'CASCADE' },
    page_number: { type: 'integer' },
    content: { type: 'text' },
    signal_score: { type: 'real', default: 0 },
    ocr_quality_score: { type: 'real' },
    text_source: { type: 'text' },
    created_at: { type: 'timestamp', default: pgm.func('current_timestamp') },
  });

  pgm.createTable('document_sentences', {
    id: { type: 'bigserial', primaryKey: true },
    document_id: { type: 'bigint', references: 'documents(id)', onDelete: 'CASCADE' },
    page_id: { type: 'bigint', references: 'document_pages(id)', onDelete: 'CASCADE' },
    sentence_text: { type: 'text' },
    sentence_index: { type: 'integer' },
    signal_score: { type: 'real', default: 0 },
    is_boilerplate: { type: 'integer', default: 0 },
    created_at: { type: 'timestamp', default: pgm.func('current_timestamp') },
  });

  // 12. Timeline & Analytics
  pgm.createTable('timeline_events', {
    id: { type: 'bigserial', primaryKey: true },
    entity_id: { type: 'bigint', references: 'entities(id)', onDelete: 'CASCADE' },
    event_date: { type: 'timestamp' },
    event_description: { type: 'text' },
    event_type: { type: 'text' },
    document_id: { type: 'bigint', references: 'documents(id)', onDelete: 'SET NULL' },
    created_at: { type: 'timestamp', default: pgm.func('current_timestamp') },
  });

  // 13. Advanced Graph Tables
  pgm.createTable('document_spans', {
    id: { type: 'text', primaryKey: true },
    document_id: { type: 'bigint', references: 'documents(id)', onDelete: 'CASCADE' },
    page_num: { type: 'integer' },
    span_start_char: { type: 'integer' },
    span_end_char: { type: 'integer' },
    raw_text: { type: 'text' },
    cleaned_text: { type: 'text' },
    ocr_confidence: { type: 'real' },
    layout_json: { type: 'jsonb' },
  });

  pgm.createTable('mentions', {
    id: { type: 'text', primaryKey: true },
    document_id: { type: 'bigint', references: 'documents(id)', onDelete: 'CASCADE' },
    span_id: { type: 'text', references: 'document_spans(id)', onDelete: 'CASCADE' },
    mention_start_char: { type: 'integer' },
    mention_end_char: { type: 'integer' },
    surface_text: { type: 'text' },
    normalised_text: { type: 'text' },
    entity_type: { type: 'text' },
    ner_model: { type: 'text' },
    ner_confidence: { type: 'real' },
    context_window_before: { type: 'text' },
    context_window_after: { type: 'text' },
    sentence_id: { type: 'text' },
    paragraph_id: { type: 'text' },
    extracted_features_json: { type: 'jsonb' },
  });

  pgm.createTable('resolution_candidates', {
    id: { type: 'text', primaryKey: true },
    left_entity_id: { type: 'bigint', references: 'entities(id)', onDelete: 'CASCADE' },
    right_entity_id: { type: 'bigint', references: 'entities(id)', onDelete: 'CASCADE' },
    mention_id: { type: 'text', references: 'mentions(id)', onDelete: 'CASCADE' },
    candidate_type: { type: 'text' },
    score: { type: 'real' },
    feature_vector_json: { type: 'jsonb' },
    decision: { type: 'text' },
    decided_at: { type: 'timestamp' },
    decided_by: { type: 'text' },
  });

  pgm.createTable('quality_flags', {
    id: { type: 'text', primaryKey: true },
    target_type: { type: 'text' },
    target_id: { type: 'text' },
    flag_type: { type: 'text' },
    severity: { type: 'text' },
    details_json: { type: 'jsonb' },
    created_at: { type: 'timestamp', default: pgm.func('current_timestamp') },
    resolved_at: { type: 'timestamp' },
  });

  pgm.createTable('relation_evidence', {
    id: { type: 'text', primaryKey: true },
    relation_id: { type: 'text', references: 'relations(id)', onDelete: 'CASCADE' },
    document_id: { type: 'bigint', references: 'documents(id)', onDelete: 'CASCADE' },
    span_id: { type: 'text', references: 'document_spans(id)', onDelete: 'CASCADE' },
    quote_text: { type: 'text' },
    confidence: { type: 'real' },
    mention_ids: { type: 'text' },
  });

  // 14. Indexes & Performance
  pgm.createIndex('documents', 'file_name');
  pgm.createIndex('documents', 'processing_status');
  pgm.createIndex('entities', 'full_name');
  pgm.createIndex('entities', 'type');
  pgm.createIndex('entities', 'is_vip');
  pgm.createIndex('entities', 'canonical_id');
  pgm.createIndex('entity_mentions', 'entity_id');
  pgm.createIndex('entity_mentions', 'document_id');
  pgm.createIndex('entity_relationships', 'source_entity_id');
  pgm.createIndex('entity_relationships', 'target_entity_id');
  pgm.createIndex('financial_transactions', 'from_entity');
  pgm.createIndex('financial_transactions', 'to_entity');
  pgm.createIndex('financial_transactions', 'investigation_id');

  // GIN Index for JSONB
  pgm.createIndex('entities', 'entity_metadata_json', { method: 'gin' });
  pgm.createIndex('entity_relationships', 'evidence_pack_json', { method: 'gin' });

  // FTS via tsvector (Postgres-Native)
  pgm.addColumns('entities', {
    fts_vector: { type: 'tsvector' },
  });
  pgm.createIndex('entities', 'fts_vector', { method: 'gin' });

  pgm.addColumns('documents', {
    fts_vector: { type: 'tsvector' },
  });
  pgm.createIndex('documents', 'fts_vector', { method: 'gin' });

  pgm.createIndex('document_pages', 'document_id');
  pgm.createIndex('document_sentences', 'document_id');
  pgm.createIndex('document_sentences', 'page_id');

  // 15. Migration Infrastructure
  pgm.createTable('migration_watermarks', {
    source_table: { type: 'text', primaryKey: true },
    last_record_id: { type: 'bigint', notNull: true, default: 0 },
    last_processed_at: { type: 'timestamp', default: pgm.func('current_timestamp') },
  });

  // Online Index Creation (Conceptual - for larger migrations)
  // pgm.createIndex('entities', 'primary_role', { concurrently: true });
}

export async function down(pgm) {
  // Drop in reverse order to respect FKs
  pgm.dropTable('migration_watermarks');
  pgm.dropTable('relation_evidence');
  pgm.dropTable('quality_flags');
  pgm.dropTable('resolution_candidates');
  pgm.dropTable('mentions');
  pgm.dropTable('document_spans');
  pgm.dropTable('timeline_events');
  pgm.dropTable('document_sentences');
  pgm.dropTable('document_pages');
  pgm.dropTable('financial_transactions');
  pgm.dropTable('claim_triples');
  pgm.dropTable('ingest_runs');
  pgm.dropTable('media_album_items');
  pgm.dropTable('media_tags');
  pgm.dropTable('media_items');
  pgm.dropTable('media_albums');
  pgm.dropTable('investigation_evidence');
  pgm.dropTable('investigations');
  pgm.dropTable('relations');
  pgm.dropTable('entity_relationships');
  pgm.dropTable('entity_mentions');
  pgm.dropTable('entity_evidence_types');
  pgm.dropTable('evidence_types');
  pgm.dropTable('entities');
  pgm.dropTable('documents');
  pgm.dropTable('audit_log');
  pgm.dropTable('users');
}
