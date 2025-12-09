#!/bin/bash
set -e
APP_DIR=${APP_DIR:-/opt/epstein-archive}
DB_PATH=${DB_PATH:-$APP_DIR/epstein-archive.db}

echo "Using APP_DIR=$APP_DIR"
echo "Using DB_PATH=$DB_PATH"

export DB_PATH

echo "1) Import OCR documents"
node -e "console.log('Node version', process.version)"
npx tsx src/scripts/import_documents.ts

echo "2) Enrich documents (titles, dates, categories)"
npx tsx src/scripts/enrich_documents.ts

echo "3) Reindex forensic metrics"
npx tsx src/scripts/reindexForensicMetadata.ts

echo "4) Import media images"
SOURCE_DIR=$APP_DIR/data/media/images DB_PATH=$DB_PATH npx tsx scripts/importRealMediaToDatabase.ts

echo "5) Verification samples"
sqlite3 "$DB_PATH" "SELECT id,file_name,substr(content,1,120) AS preview FROM documents ORDER BY id DESC LIMIT 3" -column -header
sqlite3 "$DB_PATH" "SELECT COUNT(*) AS total_docs FROM documents" -column -header
sqlite3 "$DB_PATH" "SELECT COUNT(*) AS total_images FROM media_images" -column -header

echo "Completed ingest & enrich"

