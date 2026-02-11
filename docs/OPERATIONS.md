# Epstein Archive: Pipeline Operations Guide

This document outlines how to manage the ingestion and enrichment pipeline using the high-performance 3-node Mac (exo) cluster.

## Cluster Architecture

The pipeline uses a **Shared Database / Shared Filesystem** model with a **Lease-Based Locking** mechanism (`JobManager.ts`).

- **Coordinator**: Any node can pull jobs from the queue.
- **Workers**: Individual `tsx scripts/ingest_intelligence.ts` processes.
- **Concurrency**: Handled via `documents.worker_id` and `documents.lease_expires_at` in SQLite.

## Operations Manual

### 1. Starting the Pipeline

On each of the 3 exo nodes, run:

```bash
# Set DB_PATH to the shared volume mount
export DB_PATH="/path/to/shared/epstein-archive.db"
export WORKER_ID="exo-node-1" # Use unique ID per node
npm run ingest:intelligence
```

### 2. Stopping the Pipeline

Processes can be safely terminated with `SIGINT` (Ctrl+C).

- Active jobs will eventually "time out" (lease expiry) and be automatically returned to the queue for other nodes to pick up.
- To immediately release jobs upon stopping, the process will attempt a `failJob` call during cleanup.

### 3. Restarting & Backfilling

If the pipeline crashes or schema changes are applied:

1. **Apply Migrations**: `npm run migrate` on the primary node.
2. **Clear Stuck Jobs**:
   ```sql
   UPDATE documents SET processing_status = 'queued', worker_id = NULL WHERE processing_status = 'processing' AND lease_expires_at < datetime('now');
   ```
3. **Restart Workers**: Relaunch processes on all nodes.

### 4. Continuous Ingestion

The pipeline supports `APPEND` mode. New records added to the `documents` table with `status = 'queued'` are automatically discovered by the next available worker.

## Scaling Best Practices

- **Batch Size**: Default is 100. For the 3-node cluster, keep this to avoid excessive DB lock contention.
- **Observability**: Monitor the `About Page` or run:
  ```sql
  SELECT worker_id, count(*) FROM documents WHERE processing_status = 'processing' GROUP BY worker_id;
  ```

---

_Last Updated: 2026-02-11_
