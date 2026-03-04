/* eslint-disable no-undef */

/**
 * Migration: Fix Timeline Data Source
 * Updates mv_timeline_data to use date_created (original document date)
 * instead of created_at (ingestion time).
 */
export const shorthands = undefined;

export async function up(pgm) {
  // Drop the old view
  pgm.sql(`DROP MATERIALIZED VIEW IF EXISTS mv_timeline_data`);

  // Create it again using date_created
  pgm.sql(`
    CREATE MATERIALIZED VIEW mv_timeline_data AS
    SELECT * FROM (
      SELECT
        CASE
          WHEN date_created IS NULL THEN 'Unknown'
          WHEN date_created > '2026-12-31'::date THEN 'Unknown'
          -- Basic year-month grouping for the timeline
          ELSE to_char(date_created, 'YYYY-MM')
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

  // Re-add the unique index
  pgm.sql(`CREATE UNIQUE INDEX mv_timeline_data_period ON mv_timeline_data(period)`);
}

export async function down(pgm) {
  // To revert, we go back to using created_at
  pgm.sql(`DROP MATERIALIZED VIEW IF EXISTS mv_timeline_data`);
  pgm.sql(`
    CREATE MATERIALIZED VIEW mv_timeline_data AS
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
  pgm.sql(`CREATE UNIQUE INDEX mv_timeline_data_period ON mv_timeline_data(period)`);
}
