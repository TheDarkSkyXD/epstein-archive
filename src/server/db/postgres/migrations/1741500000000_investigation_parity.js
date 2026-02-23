/* eslint-disable no-undef */

export const shorthands = undefined;

export async function up(pgm) {
  // 1. Evidence (Polymorphic-ish link)
  pgm.createTable('evidence', {
    id: { type: 'bigserial', primaryKey: true },
    title: { type: 'text', notNull: true },
    description: { type: 'text' },
    evidence_type: { type: 'text', default: 'document' },
    source_path: { type: 'text', unique: true },
    original_filename: { type: 'text' },
    extracted_text: { type: 'text' },
    evidence_tags: { type: 'text' },
    red_flag_rating: { type: 'integer', default: 0 },
    is_sensitive: { type: 'boolean', default: false },
    metadata_json: { type: 'jsonb' },
    created_at: { type: 'timestamp', default: pgm.func('current_timestamp') },
  });

  // 2. Align investigation_evidence to use evidence_id
  // Drop existing PK pk_investigation_evidence (investigation_id, document_id)
  pgm.dropConstraint('investigation_evidence', 'pk_investigation_evidence');

  pgm.addColumns('investigation_evidence', {
    id: { type: 'bigserial', primaryKey: true },
    evidence_id: { type: 'bigint', references: 'evidence(id)', onDelete: 'CASCADE' },
    relevance: { type: 'text', default: 'medium' },
  });

  // 3. Hypotheses
  pgm.createTable('hypotheses', {
    id: { type: 'bigserial', primaryKey: true },
    investigation_id: { type: 'bigint', references: 'investigations(id)', onDelete: 'CASCADE' },
    title: { type: 'text', notNull: true },
    description: { type: 'text' },
    status: { type: 'text', default: 'active' },
    confidence: { type: 'real', default: 0.5 },
    created_at: { type: 'timestamp', default: pgm.func('current_timestamp') },
    updated_at: { type: 'timestamp', default: pgm.func('current_timestamp') },
  });

  pgm.createTable('hypothesis_evidence', {
    id: { type: 'bigserial', primaryKey: true },
    hypothesis_id: { type: 'bigint', references: 'hypotheses(id)', onDelete: 'CASCADE' },
    evidence_id: { type: 'bigint', references: 'evidence(id)', onDelete: 'CASCADE' },
    relevance: { type: 'text', default: 'supporting' },
    created_at: { type: 'timestamp', default: pgm.func('current_timestamp') },
  });

  // 4. Activity & Logging
  pgm.createTable('investigation_activity', {
    id: { type: 'bigserial', primaryKey: true },
    investigation_id: { type: 'bigint', references: 'investigations(id)', onDelete: 'CASCADE' },
    user_id: { type: 'text' },
    user_name: { type: 'text' },
    action_type: { type: 'text', notNull: true },
    target_type: { type: 'text' },
    target_id: { type: 'text' },
    target_title: { type: 'text' },
    metadata_json: { type: 'jsonb' },
    created_at: { type: 'timestamp', default: pgm.func('current_timestamp') },
  });

  // 5. Notebook
  pgm.createTable('investigation_notebook', {
    investigation_id: {
      type: 'bigint',
      primaryKey: true,
      references: 'investigations(id)',
      onDelete: 'CASCADE',
    },
    order_json: { type: 'jsonb', default: '[]' },
    annotations_json: { type: 'jsonb', default: '[]' },
    updated_at: { type: 'timestamp', default: pgm.func('current_timestamp') },
  });

  // 6. Detailed Timelines
  pgm.createTable('investigation_timeline_events', {
    id: { type: 'bigserial', primaryKey: true },
    investigation_id: { type: 'bigint', references: 'investigations(id)', onDelete: 'CASCADE' },
    title: { type: 'text', notNull: true },
    description: { type: 'text' },
    type: { type: 'text', default: 'event' },
    start_date: { type: 'text' },
    end_date: { type: 'text' },
    confidence: { type: 'real', default: 1.0 },
    entities_json: { type: 'jsonb', default: '[]' },
    documents_json: { type: 'jsonb', default: '[]' },
    created_at: { type: 'timestamp', default: pgm.func('current_timestamp') },
  });

  // 7. Chain of Custody
  pgm.createTable('chain_of_custody', {
    id: { type: 'bigserial', primaryKey: true },
    evidence_id: { type: 'bigint', references: 'evidence(id)', onDelete: 'CASCADE' },
    date: { type: 'timestamp', default: pgm.func('current_timestamp') },
    actor: { type: 'text' },
    action: { type: 'text' },
    notes: { type: 'text' },
    signature: { type: 'text' },
  });
}

export async function down(pgm) {
  pgm.dropTable('chain_of_custody');
  pgm.dropTable('investigation_timeline_events');
  pgm.dropTable('investigation_notebook');
  pgm.dropTable('investigation_activity');
  pgm.dropTable('hypothesis_evidence');
  pgm.dropTable('hypotheses');
  pgm.dropColumn('investigation_evidence', ['id', 'evidence_id', 'relevance']);
  pgm.dropTable('evidence');
}
