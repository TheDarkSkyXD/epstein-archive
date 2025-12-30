#!/bin/bash
set -e

# Auto-detect defaults if not present
if [ -z "$APP_DIR" ]; then
  # Local dev environment
  APP_DIR=$(pwd)
fi
DB_PATH=${DB_PATH:-$APP_DIR/epstein-archive.db}

echo "Using APP_DIR=$APP_DIR"
echo "Using DB_PATH=$DB_PATH"

export APP_DIR
export DB_PATH



# 0. Pre-processing
echo "0) Clean OCR Text (Name Repairs)"
npx tsx scripts/cleanOcrText.ts

echo "1) Ingest All Documents (FS Scan)"
# Replaces static import_documents using ingest_from_fs for direct PDF support
npx tsx src/scripts/ingest_from_fs.ts

echo "2) Enrich documents (titles, dates, categories, consolidation)"
npx tsx src/scripts/enrich_documents.ts

echo "2.5) Link Unredacted Versions"
npx tsx src/scripts/link_unredacted_versions.ts

echo "2.6) Consolidate Entities (Jeffrey Epstein, etc.)"
npx tsx src/scripts/entity_consolidation.ts

echo "2.7) Seed Entity Aliases & Update Search Index"
npx tsx scripts/seed_entity_aliases.ts

echo "3) Reindex forensic metrics"
npx tsx src/scripts/reindexForensicMetadata.ts

echo "4) Import media images"
SOURCE_DIR=$APP_DIR/data/media/images DB_PATH=$DB_PATH npx tsx scripts/importRealMediaToDatabase.ts

echo "4.5) Handle Fake/Unconfirmed Media (Watermark & Deduplicate)"
DB_PATH=$DB_PATH npx tsx scripts/fix_fakes.ts

echo "4.6) Detect Failed PDF Redactions (hidden text under black boxes)"
if [ -f ".venv/bin/activate" ]; then
  source .venv/bin/activate
  DATA_DIR=$APP_DIR/data/originals DB_PATH=$DB_PATH python3 scripts/detect_failed_redactions.py || echo "Warning: Redaction detection had issues, continuing..."
  deactivate 2>/dev/null || true
else
  echo "Warning: Python venv not found, skipping redaction detection. Run: python3 -m venv .venv && source .venv/bin/activate && pip install x-ray"
fi

echo "5) Data Integrity Verification"
npx tsx scripts/verify_data_integrity.ts

echo "6) Sample verification output"
sqlite3 "$DB_PATH" "SELECT id,file_name,substr(content,1,120) AS preview FROM documents ORDER BY id DESC LIMIT 3" -column -header
sqlite3 "$DB_PATH" "SELECT COUNT(*) AS total_docs FROM documents" -column -header
sqlite3 "$DB_PATH" "SELECT COUNT(*) AS total_images FROM media_images" -column -header

echo "Completed ingest & enrich with 100% Data Integrity"

