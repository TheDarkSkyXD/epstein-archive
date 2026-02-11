-- Full Text Search
-- Dropping existing virtual tables to ensure schema match
DROP TABLE IF EXISTS entities_fts;
DROP TABLE IF EXISTS documents_fts;

CREATE VIRTUAL TABLE entities_fts USING fts5(
  full_name,
  primary_role,
  connections_summary,
  content='entities',
  content_rowid='id'
);

CREATE VIRTUAL TABLE documents_fts USING fts5(
  file_name,
  content,
  content='documents',
  content_rowid='id'
);

-- Triggers to keep FTS in sync
DROP TRIGGER IF EXISTS entities_ai;
CREATE TRIGGER entities_ai AFTER INSERT ON entities BEGIN
  INSERT INTO entities_fts(rowid, full_name, primary_role, connections_summary)
  VALUES (new.id, new.full_name, new.primary_role, new.connections_summary);
END;

DROP TRIGGER IF EXISTS entities_ad;
CREATE TRIGGER entities_ad AFTER DELETE ON entities BEGIN
  INSERT INTO entities_fts(entities_fts, rowid, full_name, primary_role, connections_summary)
  VALUES('delete', old.id, old.full_name, old.primary_role, old.connections_summary);
END;

DROP TRIGGER IF EXISTS entities_au;
CREATE TRIGGER entities_au AFTER UPDATE ON entities BEGIN
  INSERT INTO entities_fts(entities_fts, rowid, full_name, primary_role, connections_summary)
  VALUES('delete', old.id, old.full_name, old.primary_role, old.connections_summary);
  INSERT INTO entities_fts(rowid, full_name, primary_role, connections_summary)
  VALUES (new.id, new.full_name, new.primary_role, new.connections_summary);
END;

DROP TRIGGER IF EXISTS documents_ai;
CREATE TRIGGER documents_ai AFTER INSERT ON documents BEGIN
  INSERT INTO documents_fts(rowid, file_name, content)
  VALUES (new.id, new.file_name, new.content);
END;

DROP TRIGGER IF EXISTS documents_ad;
CREATE TRIGGER documents_ad AFTER DELETE ON documents BEGIN
  INSERT INTO documents_fts(documents_fts, rowid, file_name, content)
  VALUES('delete', old.id, old.file_name, old.content);
END;

DROP TRIGGER IF EXISTS documents_au;
CREATE TRIGGER documents_au AFTER UPDATE ON documents BEGIN
  INSERT INTO documents_fts(documents_fts, rowid, file_name, content)
  VALUES('delete', old.id, old.file_name, old.content);
  INSERT INTO documents_fts(rowid, file_name, content)
  VALUES (new.id, new.file_name, new.content);
END;
