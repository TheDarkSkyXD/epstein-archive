/* eslint-disable no-undef */

/**
 * Migration: analytics_refresh_log — tracks mat-view refresh health
 */
export const shorthands = undefined;

export async function up(pgm) {
  pgm.sql(`
    CREATE TABLE IF NOT EXISTS analytics_refresh_log (
      view_name     text PRIMARY KEY,
      refreshed_at  timestamp NOT NULL DEFAULT now(),
      duration_ms   integer   NOT NULL DEFAULT 0,
      status        text      NOT NULL DEFAULT 'pending'
    );
  `);

  pgm.sql(`
    INSERT INTO analytics_refresh_log (view_name) VALUES
      ('mv_docs_by_type'),
      ('mv_entity_type_dist'),
      ('mv_top_connected'),
      ('mv_timeline_data'),
      ('mv_redaction_stats')
    ON CONFLICT DO NOTHING;
  `);

  // Per-table autovacuum overrides for hot tables
  pgm.sql(`
    ALTER TABLE entities SET (
      autovacuum_vacuum_scale_factor = 0.005,
      autovacuum_analyze_scale_factor = 0.002
    );
    ALTER TABLE entity_relationships SET (
      autovacuum_vacuum_scale_factor = 0.005,
      autovacuum_analyze_scale_factor = 0.002
    );
    ALTER TABLE entity_mentions SET (
      autovacuum_vacuum_scale_factor = 0.01,
      autovacuum_analyze_scale_factor = 0.005
    );
    ALTER TABLE documents SET (
      autovacuum_vacuum_scale_factor = 0.01,
      autovacuum_analyze_scale_factor = 0.005
    );
  `);
}

export async function down(pgm) {
  pgm.sql(`DROP TABLE IF EXISTS analytics_refresh_log`);
  pgm.sql(`
    ALTER TABLE entities RESET (autovacuum_vacuum_scale_factor, autovacuum_analyze_scale_factor);
    ALTER TABLE entity_relationships RESET (autovacuum_vacuum_scale_factor, autovacuum_analyze_scale_factor);
    ALTER TABLE entity_mentions RESET (autovacuum_vacuum_scale_factor, autovacuum_analyze_scale_factor);
    ALTER TABLE documents RESET (autovacuum_vacuum_scale_factor, autovacuum_analyze_scale_factor);
  `);
}
