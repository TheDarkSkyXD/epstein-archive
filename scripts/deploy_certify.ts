#!/usr/bin/env tsx
import fs from 'fs';
import path from 'path';

type Requirement = {
  key: string;
  label: string;
  ok: boolean;
  detail: string;
};

function indexOrNeg(haystack: string, needle: string): number {
  const i = haystack.indexOf(needle);
  return i >= 0 ? i : -1;
}

function main() {
  const cwd = process.cwd();
  const deployPath = path.resolve(cwd, 'deploy.sh');
  const goProdPath = path.resolve(cwd, 'scripts/go_prod.ts');

  if (!fs.existsSync(deployPath)) {
    console.error('[deploy_certify] deploy.sh not found');
    process.exit(1);
  }

  const deploy = fs.readFileSync(deployPath, 'utf8');
  const goProd = fs.existsSync(goProdPath) ? fs.readFileSync(goProdPath, 'utf8') : '';

  const reqs: Requirement[] = [];
  const add = (key: string, label: string, ok: boolean, detail: string) =>
    reqs.push({ key, label, ok, detail });

  add(
    'pg_connectivity',
    'PG connectivity test before migration',
    /CERT_STEP:\s*pg_connectivity_pre_migration/.test(deploy) && /pnpm db:check/.test(deploy),
    'deploy.sh must run db connectivity preflight before migrations',
  );

  const migrateMatches = deploy.match(/pnpm db:migrate:pg/g) ?? [];
  add(
    'migrations_idempotent',
    'Migrations idempotency gate',
    /CERT_STEP:\s*migrations_idempotent/.test(deploy) && migrateMatches.length >= 2,
    `found ${migrateMatches.length} occurrences of "pnpm db:migrate:pg"`,
  );

  add(
    'schema_hash',
    'Schema hash verification',
    /CERT_STEP:\s*schema_hash_verification/.test(deploy) && /schema:hash:check/.test(deploy),
    'schema hash check should run during deploy',
  );

  add(
    'pg_explain_gate',
    'pg_explain.ts plan gate',
    /CERT_STEP:\s*pg_explain_plan_gate/.test(deploy) && /pg_explain\.ts/.test(deploy),
    'deploy should execute pg_explain.ts as a gating step',
  );

  add(
    'extension_check',
    'Extension check (pg_stat_statements)',
    /CERT_STEP:\s*extension_check_pg_stat_statements/.test(deploy) &&
      /pg_stat_statements/.test(deploy),
    'deploy should verify pg_stat_statements extension',
  );

  add(
    'health_smoke',
    'Health endpoint smoke test',
    /CERT_STEP:\s*health_endpoint_smoke_test/.test(deploy) &&
      /\/api\/health/.test(deploy) &&
      /HTTP_STATUS/.test(deploy),
    'deploy should smoke-test /api/health after restart',
  );

  add(
    'rollback_safety',
    'Rollback safety (previous image/build retained)',
    /CERT_STEP:\s*rollback_safety_previous_image_retained/.test(deploy) &&
      /\.rollback_(dist|commit)/.test(deploy),
    'deploy should retain previous build artifact/commit',
  );

  const dbHealthyIdx = indexOrNeg(deploy, 'CERT_STEP: db_confirmed_healthy_before_restart');
  const restartIdx = indexOrNeg(deploy, 'CERT_STEP: app_restart_after_db_healthy');
  add(
    'restart_order',
    'App restart only AFTER DB confirmed healthy',
    dbHealthyIdx >= 0 && restartIdx > dbHealthyIdx,
    `dbHealthyIdx=${dbHealthyIdx} restartIdx=${restartIdx}`,
  );

  add(
    'fail_fast',
    'Failure aborts deploy immediately',
    /set -euo pipefail/.test(deploy) && /trap 'on_error \$LINENO' ERR/.test(deploy),
    'deploy.sh should fail fast and trap errors',
  );

  // Bonus visibility: go_prod.ts includes connectivity + migrations too (not a required target if deploy.sh is certified)
  const goProdSignals = [
    /SELECT version\(\)/.test(goProd),
    /db:migrate:pg/.test(goProd),
    /REFRESH MATERIALIZED VIEW/.test(goProd),
  ].filter(Boolean).length;

  const pass = reqs.filter((r) => r.ok).length;
  const fail = reqs.length - pass;

  console.log('== PHASE 3: DEPLOY SCRIPT CERTIFICATION ==');
  console.log(`target=${path.basename(deployPath)} (go_prod_signals=${goProdSignals})`);
  for (const r of reqs) {
    console.log(`${r.ok ? '[PASS]' : '[FAIL]'} ${r.label}`);
    console.log(`  ${r.detail}`);
  }
  console.log(`\n[SUMMARY] checks=${reqs.length} pass=${pass} fail=${fail}`);

  if (fail > 0) process.exit(1);
}

main();
