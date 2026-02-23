# Postgres Hardening Certification

## Purpose

This document defines the reproducible audit flow for Postgres-era correctness, safety, and determinism checks.

`CERTIFIED` means all audit suite steps pass:

- Type-check
- Lint
- Postgres system audit
- Query plan gate (`pg_explain`)
- Ingest audit
- Stress check (backpressure + recovery)
- Tech debt scan

If any step fails, the system is `BLOCKED`.

## Local Setup

1. Create `/Users/veland/Downloads/Epstein Files/epstein-archive/.env.audit` (template is committed).
2. Set:
   - `DATABASE_URL=postgresql://USER:PASS@HOST:5432/epstein_archive`
   - `API_BASE_URL=http://localhost:3012`
3. Start the API server locally (or point `API_BASE_URL` at a running instance).
4. Ensure the target Postgres has `pg_stat_statements` installed.

## Run Locally

```bash
pnpm audit:pg
```

This runs `/Users/veland/Downloads/Epstein Files/epstein-archive/scripts/run_audit_suite.sh`, which:

- loads `.env.audit`
- redacts the DB password when printing the connection URI
- runs the audit steps in fixed order
- prints a final certification table
- exits non-zero on any failure

## Run In Production

1. SSH to the production host or run in CI with production-safe credentials.
2. Prepare `.env.audit` with the production `DATABASE_URL` and the internal API URL (for example `http://127.0.0.1:3012`).
3. Run:

```bash
pnpm audit:pg
```

Use the production host's local API address to avoid external load balancers skewing stress/backpressure results.

## Common Failure Modes And Fixes

## `pg_system_audit` fails

- Missing `DATABASE_URL`: export it via `.env.audit`.
- Missing `pg_stat_statements`: install extension in target DB.
- FK violations: repair orphaned rows before deploy.
- Long-running transactions: terminate stuck sessions and identify source pool/client.

## `pg_explain` fails

- Seq scans on hot paths: add/repair indexes and re-run `ANALYZE`.
- External merge spill: reduce result set, improve sort index coverage, or tune `work_mem` for maintenance workloads.

## `ingest_audit` fails

- Ingest path still uses `getDb()` API wrapper instead of dedicated ingest pool.
- Duplicate documents/entities detected.
- Ingest path not marking matviews dirty or not running post-ingest `ANALYZE`.

## `stress_check` fails

- API not running at `API_BASE_URL`.
- No 503 under saturation: load shedding not triggering.
- Recovery failed: check `pgSaturationShed`, route caps, retry policies, and pool leaks.
- `waitingCount` tail persists: inspect long-running requests and idle-in-transaction sessions.

## `tech_debt_scan` fails

- SQLite imports/usages outside `src/dev/sqlite/*`.
- Raw SQL in routes (move to repositories).
- TODO comments without ticket references.
- `console.log` in server code.
- Oversized files/routes/functions.
- React `useEffect` dependency issues or eslint suppressions.

## Notes

- The audit suite fails closed: missing API or DB prerequisites produce `FAIL`, not `SKIP`.
- `deploy.sh` deploy certification is validated separately by `/Users/veland/Downloads/Epstein Files/epstein-archive/scripts/deploy_certify.ts`.
