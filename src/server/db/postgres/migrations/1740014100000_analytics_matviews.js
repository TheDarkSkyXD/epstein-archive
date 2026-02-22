/* eslint-disable no-undef */

/**
 * Migration: Materialised Views for Analytics Endpoints
 * Written against the real schema (documents, entities).
 * noTransaction() required for CONCURRENTLY unique index creation.
 */
export const shorthands = undefined;

export async function up(pgm) {
  pgm.noTransaction();

  // ── 1. Documents by MIME type ─────────────────────────────────────────────
  // documents has: mime_type, is_sensitive, signal_score, created_at, redaction_coverage_after
  pgm.sql(`
    CREATE MATERIALIZED VIEW IF NOT EXISTS mv_docs_by_type AS
    SELECT
      COALESCE(mime_type, 'unknown') AS type,
      COUNT(*)::bigint AS count,
      SUM(CASE WHEN is_sensitive THEN 1 ELSE 0 END)::bigint AS sensitive,
      ROUND(AVG(signal_score)::numeric, 2) AS avg_signal
    FROM documents
    GROUP BY COALESCE(mime_type, 'unknown');
  `);
  pgm.sql(`CREATE UNIQUE INDEX IF NOT EXISTS mv_docs_by_type_type ON mv_docs_by_type(type)`);

  // ── 2. Entity type distribution ───────────────────────────────────────────
  // entities has: entity_type, red_flag_rating
  pgm.sql(`
    CREATE MATERIALIZED VIEW IF NOT EXISTS mv_entity_type_dist AS
    SELECT
      entity_type AS type,
      COUNT(*)::bigint AS count,
      ROUND(AVG(red_flag_rating)::numeric, 2) AS avg_risk
    FROM entities
    WHERE entity_type IS NOT NULL
    GROUP BY entity_type;
  `);
  pgm.sql(`CREATE UNIQUE INDEX IF NOT EXISTS mv_entity_type_dist_type ON mv_entity_type_dist(type)`);

  // ── 3. Top-100 connected persons (most expensive live query) ──────────────
  pgm.sql(`
    CREATE MATERIALIZED VIEW IF NOT EXISTS mv_top_connected AS
    WITH rel_counts AS (
      SELECT entity_id, SUM(cnt) AS cnt FROM (
        SELECT source_entity_id AS entity_id, COUNT(*)::bigint AS cnt
          FROM entity_relationships GROUP BY source_entity_id
        UNION ALL
        SELECT target_entity_id AS entity_id, COUNT(*)::bigint AS cnt
          FROM entity_relationships GROUP BY target_entity_id
      ) t GROUP BY entity_id
    )
    SELECT
      e.id,
      e.full_name AS name,
      e.primary_role AS role,
      e.entity_type AS type,
      e.red_flag_rating AS risk_level,
      COALESCE(rc.cnt, 0) AS connection_count,
      COALESCE(e.mentions, 0) AS mentions
    FROM rel_counts rc
    JOIN entities e ON e.id = rc.entity_id
    WHERE e.entity_type = 'Person'
      AND COALESCE(e.junk_tier, 'clean') = 'clean'
    ORDER BY rc.cnt DESC
    LIMIT 100;
  `);
  pgm.sql(`CREATE UNIQUE INDEX IF NOT EXISTS mv_top_connected_id ON mv_top_connected(id)`);

  // ── 4. Timeline: month-bucket aggregation from created_at ─────────────────
  pgm.sql(`
    CREATE MATERIALIZED VIEW IF NOT EXISTS mv_timeline_data AS
    SELECT * FROM (
      SELECT
        CASE
          WHEN created_at IS NULL THEN 'Unknown'
          WHEN created_at > '2026-12-31'::date THEN 'Unknown'
          ELSE to_char(created_at, 'YYYY-MM')
        END AS period,
        COUNT(*)::bigint AS total,
        SUM(CASE WHEN mime_type LIKE '%pdf%' THEN 1 ELSE 0 END)::bigint AS pdfs,
        SUM(CASE WHEN mime_type LIKE '%image%' THEN 1 ELSE 0 END)::bigint AS images,
        SUM(CASE WHEN mime_type LIKE '%email%' OR mime_type = 'message/rfc822' THEN 1 ELSE 0 END)::bigint AS emails,
        SUM(CASE WHEN is_sensitive THEN 1 ELSE 0 END)::bigint AS sensitive
      FROM documents
      GROUP BY 1
    ) t
    ORDER BY (CASE WHEN period = 'Unknown' THEN '9999-99' ELSE period END) ASC;
  `);
  pgm.sql(`CREATE UNIQUE INDEX IF NOT EXISTS mv_timeline_data_period ON mv_timeline_data(period)`);

  // ── 5. Redaction / unredaction stats ──────────────────────────────────────
  // redaction_coverage_after IS the fraction; unredaction_succeeded counts successful unredactions
  pgm.sql(`
    CREATE MATERIALIZED VIEW IF NOT EXISTS mv_redaction_stats AS
    SELECT
      COUNT(*)::bigint AS total_documents,
      SUM(CASE WHEN is_sensitive THEN 1 ELSE 0 END)::bigint AS sensitive_documents,
      SUM(CASE WHEN redaction_coverage_after IS NOT NULL THEN 1 ELSE 0 END)::bigint AS redacted_documents,
      ROUND(
        SUM(CASE WHEN redaction_coverage_after IS NOT NULL THEN 1.0 ELSE 0 END)
        / NULLIF(COUNT(*), 0) * 100, 2
      )::numeric AS redaction_percentage,
      COALESCE(SUM(unredaction_succeeded), 0)::bigint AS total_unredactions
    FROM documents;
  `);
  // No unique index needed on single-row view — row count is always 1
}

export async function down(pgm) {
  pgm.sql(`DROP MATERIALIZED VIEW IF EXISTS mv_redaction_stats`);
  pgm.sql(`DROP MATERIALIZED VIEW IF EXISTS mv_timeline_data`);
  pgm.sql(`DROP MATERIALIZED VIEW IF EXISTS mv_top_connected`);
  pgm.sql(`DROP MATERIALIZED VIEW IF EXISTS mv_entity_type_dist`);
  pgm.sql(`DROP MATERIALIZED VIEW IF EXISTS mv_docs_by_type`);
}
