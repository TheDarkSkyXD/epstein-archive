CREATE VIRTUAL TABLE IF NOT EXISTS entities_fts USING fts5(
  full_name,
  primary_role,
  secondary_roles,
  connections_summary,
  content='entities',
  content_rowid='id'
);

CREATE VIRTUAL TABLE IF NOT EXISTS documents_fts USING fts5(
  file_name,
  content_preview,
  evidence_type,
  content,
  content='documents',
  content_rowid='id'
);

INSERT INTO entities_fts(entities_fts) VALUES('rebuild');
INSERT INTO documents_fts(documents_fts) VALUES('rebuild');
