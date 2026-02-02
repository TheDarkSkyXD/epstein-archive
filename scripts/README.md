# Epstein Archive Scripts

> **SINGLE SOURCE OF TRUTH** - All operations are consolidated into canonical scripts.

## Deployment & Sync

### `deploy.sh` - **THE ONLY DEPLOY COMMAND**

```bash
./scripts/deploy.sh              # Full deploy (sync + code + restart)
./scripts/deploy.sh --sync-only  # Database sync only
./scripts/deploy.sh --dry-run    # Preview without changes
```

**Pipeline:**

1. Pre-flight checks (SSH, DB)
2. Local backup with timestamp
3. Pull production DB snapshot
4. Bidirectional merge (prod → local)
5. Push merged DB to production (atomic swap)
6. Code deploy (build + git + pm2)
7. Health check with auto-rollback

### `sync-db.ts` - Schema & Data Synchronization

```bash
npx tsx scripts/sync-db.ts --source=prod.db --target=local.db [--dry-run]
```

- Automatically syncs schema (adds missing columns)
- Merges documents, entities, relationships, mentions
- Used internally by `deploy.sh`

---

## Ingestion Pipeline

### `ingest_pipeline.ts` - **PRIMARY INGESTION**

```bash
npx tsx scripts/ingest_pipeline.ts
```

Processes all documents: OCR, metadata extraction, entity detection.

### `ingest_intelligence.ts` - **ENTITY INTELLIGENCE**

```bash
npx tsx scripts/ingest_intelligence.ts
```

Entity resolution, VIP consolidation, junk filtering, relationship mapping.

### `reprocess_emails.ts` - Email Reprocessing

```bash
npx tsx scripts/reprocess_emails.ts
```

---

## Utilities

| Script                       | Purpose                   |
| ---------------------------- | ------------------------- |
| `migrate.ts`                 | Database migrations       |
| `maintenance.ts`             | Routine maintenance tasks |
| `verify_deployment.ts`       | Post-deploy verification  |
| `watermark_fakes.ts`         | Mark fake/AI images       |
| `generate_transcripts.ts`    | Audio transcription       |
| `populate-evidence-types.ts` | Evidence classification   |
| `ensure_structure.ts`        | Directory structure setup |

---

## Python Utilities (DOJ Scraping)

| Script                 | Purpose               |
| ---------------------- | --------------------- |
| `download_doj_pdfs.py` | Download DOJ PDFs     |
| `scrape_doj_links.py`  | Extract DOJ links     |
| `fetch_links.py`       | General link fetching |

---

## Migrations

All database schema changes live in `scripts/migrations/`.

---

## ⚠️ Deprecated Scripts

The following have been **permanently removed** to prevent confusion:

- `deploy_safe.sh`, `deploy-to-production.sh`
- `sync_down_safe.sh`, `sync_prod_to_local.sh`
- `emergency_rollback.sh`, `post_deploy_verify.sh`
- `backup_db.sh`, `clean_server.sh`
- All one-off debug/test scripts

**Use `deploy.sh` for ALL deployment operations.**
