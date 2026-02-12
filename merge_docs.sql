ATTACH 'epstein-archive.db.prod' AS remote;

BEGIN TRANSACTION;

-- Insert new documents from remote.
-- Include file_name as it is NOT NULL.
-- reset processing_status to 'pending' and analyzed_at to NULL.
INSERT INTO documents (file_path, file_name, content, metadata_json, processing_status, analyzed_at)
SELECT file_path, file_name, content, metadata_json, 'pending', NULL
FROM remote.documents
WHERE file_path NOT IN (SELECT file_path FROM documents);

COMMIT;
DETACH remote;
