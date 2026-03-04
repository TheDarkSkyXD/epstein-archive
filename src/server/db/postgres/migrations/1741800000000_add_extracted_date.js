/* eslint-disable no-undef */
export const shorthands = undefined;

export async function up(pgm) {
  pgm.addColumn('documents', {
    extracted_date: { type: 'timestamp', notNull: false },
  });

  pgm.sql(`CREATE INDEX idx_documents_extracted_date ON documents(extracted_date)`);

  // Update mv_timeline_data to prefer extracted_date
  pgm.sql(`DROP MATERIALIZED VIEW IF EXISTS mv_timeline_data`);
  pgm.sql(`
    CREATE MATERIALIZED VIEW mv_timeline_data AS
    SELECT * FROM (
      SELECT
        CASE
          WHEN COALESCE(extracted_date, date_created) IS NULL THEN 'Unknown'
          WHEN COALESCE(extracted_date, date_created) > '2026-12-31'::date THEN 'Unknown'
          ELSE to_char(COALESCE(extracted_date, date_created), 'YYYY-MM')
        END AS period,
        COUNT(*)::bigint AS total,
        SUM(CASE WHEN file_type LIKE '%pdf%' THEN 1 ELSE 0 END)::bigint AS pdfs,
        SUM(CASE WHEN file_type LIKE '%image%' THEN 1 ELSE 0 END)::bigint AS images,
        SUM(CASE WHEN file_type LIKE '%email%' OR file_type = 'message/rfc822' THEN 1 ELSE 0 END)::bigint AS emails,
        SUM(CASE WHEN is_sensitive THEN 1 ELSE 0 END)::bigint AS sensitive
      FROM documents
      GROUP BY 1
    ) t
    ORDER BY (CASE WHEN period = 'Unknown' THEN '9999-99' ELSE period END) ASC;
  `);

  pgm.sql(`CREATE UNIQUE INDEX mv_timeline_data_period ON mv_timeline_data(period)`);
}

export async function down(pgm) {
  pgm.dropColumn('documents', 'extracted_date');

  // Revert mv_timeline_data to original
  pgm.sql(`DROP MATERIALIZED VIEW IF EXISTS mv_timeline_data`);
  pgm.sql(`
    CREATE MATERIALIZED VIEW mv_timeline_data AS
    SELECT * FROM (
      SELECT
        CASE
          WHEN date_created IS NULL THEN 'Unknown'
          WHEN date_created > '2026-12-31'::date THEN 'Unknown'
          ELSE to_char(date_created, 'YYYY-MM')
        END AS period,
        COUNT(*)::bigint AS total,
        SUM(CASE WHEN file_type LIKE '%pdf%' THEN 1 ELSE 0 END)::bigint AS pdfs,
        SUM(CASE WHEN file_type LIKE '%image%' THEN 1 ELSE 0 END)::bigint AS images,
        SUM(CASE WHEN file_type LIKE '%email%' OR file_type = 'message/rfc822' THEN 1 ELSE 0 END)::bigint AS emails,
        SUM(CASE WHEN is_sensitive THEN 1 ELSE 0 END)::bigint AS sensitive
      FROM documents
      GROUP BY 1
    ) t
    ORDER BY (CASE WHEN period = 'Unknown' THEN '9999-99' ELSE period END) ASC;
  `);
  pgm.sql(`CREATE UNIQUE INDEX mv_timeline_data_period ON mv_timeline_data(period)`);
}
