import { getDb } from '../src/server/db/connection.js';
import { FtsMaintenanceService } from '../src/server/services/ftsMaintenance.js';
import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

/**
 * v13.0.0 Release Certification Suite
 *
 * Validates:
 * 1. Coverage: Entity vs Document density
 * 2. Schema Hygiene: No legacy/deprecated artifacts
 * 3. Metadata Utilization: ai_summary, mention_context, etc.
 * 4. Discoverability: FTS index integrity
 * 5. Forensic Case Battery: Deterministic truth queries
 */

interface GateResult {
  name: string;
  status: 'PASS' | 'FAIL' | 'WARN';
  message: string;
  details?: any;
}

async function runCertification() {
  console.log('🛡️  EPSTEIN ARCHIVE RELEASE CERTIFICATION (v13.0.0)\n');
  const db = getDb();
  const results: GateResult[] = [];

  // GATE 1: Coverage Density
  try {
    const stats = db
      .prepare(
        `
      SELECT 
        (SELECT COUNT(*) FROM entities) as ec,
        (SELECT COUNT(*) FROM documents) as dc,
        (SELECT COUNT(*) FROM entity_mentions) as mc
    `,
      )
      .get() as any;

    const density = stats.mc / stats.dc;
    results.push({
      name: 'Coverage Density',
      status: density > 1 ? 'PASS' : 'WARN',
      message: `Density: ${density.toFixed(2)} mentions/doc`,
      details: stats,
    });
  } catch (e: any) {
    results.push({ name: 'Coverage Density', status: 'FAIL', message: e.message });
  }

  // GATE 2: Schema Hygiene (Forensic Integrity)
  try {
    const legacyTables = ['evidence_entity_new', 'entity_mentions_legacy'];
    let foundLegacy = [];
    for (const table of legacyTables) {
      const exists = db
        .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name=?")
        .get(table);
      if (exists) foundLegacy.push(table);
    }

    results.push({
      name: 'Schema Hygiene',
      status: foundLegacy.length === 0 ? 'PASS' : 'WARN',
      message:
        foundLegacy.length === 0
          ? 'No legacy tables found'
          : `Legacy tables present: ${foundLegacy.join(', ')}`,
    });
  } catch (e: any) {
    results.push({ name: 'Schema Hygiene', status: 'FAIL', message: e.message });
  }

  // GATE 3: Metadata Utilization (Enrichment)
  try {
    const enrichment = db
      .prepare(
        `
      SELECT 
        COUNT(*) as total,
        COUNT(CASE WHEN metadata_json LIKE '%ai_summary%' THEN 1 END) as enriched,
        COUNT(CASE WHEN content_refined IS NOT NULL THEN 1 END) as refined
      FROM documents
    `,
      )
      .get() as any;

    const percentage = (enrichment.enriched / enrichment.total) * 100;
    results.push({
      name: 'Metadata Utilization',
      status: percentage > 80 ? 'PASS' : 'WARN',
      message: `Enrichment: ${percentage.toFixed(1)}% | Refined: ${enrichment.refined}`,
      details: enrichment,
    });
  } catch (e: any) {
    results.push({ name: 'Metadata Utilization', status: 'FAIL', message: e.message });
  }

  // GATE 4: Discoverability (FTS5)
  try {
    const ftsStatus = await FtsMaintenanceService.checkIntegrity();
    const allSynced = ftsStatus.every((s) => s.isSynced);
    results.push({
      name: 'Discoverability',
      status: allSynced ? 'PASS' : 'FAIL',
      message: allSynced ? 'All FTS tables synchronized' : 'FTS index desync detected',
    });
  } catch (e: any) {
    results.push({ name: 'Discoverability', status: 'FAIL', message: e.message });
  }

  // GATE 5: Forensic Case Battery
  try {
    const battery = [
      {
        name: 'Consolidation: Trump',
        query: "SELECT count(*) as c FROM entities WHERE full_name = 'Donald Trump'",
        target: 1,
      },
      {
        name: 'Consolidation: Epstein',
        query: "SELECT count(*) as c FROM entities WHERE full_name = 'Jeffrey Epstein'",
        target: 1,
      },
      {
        name: 'Provenance: Mentions Context',
        query: 'SELECT count(*) as c FROM entity_mentions WHERE mention_context IS NOT NULL',
        min: 100,
      },
    ];

    let batteryPass = true;
    for (const test of battery) {
      const res = db.prepare(test.query).get() as any;
      if (test.target !== undefined && res.c !== test.target) batteryPass = false;
      if (test.min !== undefined && res.c < test.min) batteryPass = false;
    }

    results.push({
      name: 'Forensic Case Battery',
      status: batteryPass ? 'PASS' : 'FAIL',
      message: batteryPass ? 'All canary queries passed' : 'Canary query failure',
    });
  } catch (e: any) {
    results.push({ name: 'Forensic Case Battery', status: 'FAIL', message: e.message });
  }

  // PRINT SUMMARY
  console.table(results.map((r) => ({ Gate: r.name, Status: r.status, Message: r.message })));

  const isGo = results.every((r) => r.status !== 'FAIL');
  console.log(isGo ? '\n🟢 CERTIFICATION: GO' : '\n🔴 CERTIFICATION: NO-GO');

  return isGo;
}

if (import.meta.url.endsWith('certify.ts')) {
  runCertification()
    .then((isGo) => process.exit(isGo ? 0 : 1))
    .catch((e) => {
      console.error(e);
      process.exit(1);
    });
}

export { runCertification };
