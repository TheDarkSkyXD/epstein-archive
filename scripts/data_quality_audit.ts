#!/usr/bin/env tsx
/**
 * Comprehensive Data Quality Audit Script
 * 
 * Runs all Phase 1 audits:
 * 1. Broken Links - Verify document references
 * 2. Date Consistency - Audit temporal data
 * 3. Category Coverage - Analyze evidence distribution
 */

import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DB_PATH = path.join(__dirname, '../epstein-archive.db');
const DOCUMENTS_PATH = path.join(__dirname, '../data');
const REPORT_PATH = path.join(__dirname, '../data_quality_report.json');

interface AuditReport {
  timestamp: string;
  brokenLinks: {
    orphanedDocuments: number;
    missingFiles: string[];
    invalidEntityLinks: number;
  };
  dateConsistency: {
    totalDates: number;
    validFormats: number;
    invalidFormats: string[];
    conflictingDates: any[];
  };
  categoryDistribution: {
    evidenceTypes: Record<string, number>;
    underRepresented: string[];
    wellCovered: string[];
  };
  entityQuality: {
    totalPeople: number;
    withRoles: number;
    unknownRoles: number;
    withTitles: number;
  };
  relationships: {
    total: number;
    avgWeight: number;
    isolatedEntities: number;
  };
}

function auditBrokenLinks(db: Database.Database): AuditReport['brokenLinks'] {
  console.log('\n📎 Auditing Broken Links...');
  
  // Check for documents without file paths
  const orphanedDocs = db.prepare(`
    SELECT COUNT(*) as count FROM documents 
    WHERE file_path IS NULL OR file_path = ''
  `).get() as { count: number };
  
  // Check for invalid entity-document links
  const invalidLinks = db.prepare(`
    SELECT COUNT(*) as count FROM entity_mentions em
    LEFT JOIN documents d ON em.document_id = d.id
    WHERE d.id IS NULL
  `).get() as { count: number };
  
  // Sample of documents to check file existence
  const sampleDocs = db.prepare(`
    SELECT file_path FROM documents 
    WHERE file_path IS NOT NULL AND file_path != ''
    LIMIT 100
  `).all() as { file_path: string }[];
  
  const missingFiles: string[] = [];
  for (const doc of sampleDocs) {
    const fullPath = path.join(__dirname, '..', doc.file_path);
    if (!fs.existsSync(fullPath)) {
      missingFiles.push(doc.file_path);
    }
  }
  
  console.log(`   Orphaned documents (no file path): ${orphanedDocs.count}`);
  console.log(`   Invalid entity-document links: ${invalidLinks.count}`);
  console.log(`   Missing files (sample of 100): ${missingFiles.length}`);
  
  return {
    orphanedDocuments: orphanedDocs.count,
    missingFiles: missingFiles.slice(0, 20),
    invalidEntityLinks: invalidLinks.count,
  };
}

function auditDateConsistency(db: Database.Database): AuditReport['dateConsistency'] {
  console.log('\n📅 Auditing Date Consistency...');
  
  // Get all date entities
  const dateEntities = db.prepare(`
    SELECT id, full_name FROM entities WHERE entity_type = 'Date'
  `).all() as { id: number; full_name: string }[];
  
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  const validDates: string[] = [];
  const invalidDates: string[] = [];
  
  for (const entity of dateEntities) {
    if (dateRegex.test(entity.full_name)) {
      validDates.push(entity.full_name);
    } else {
      invalidDates.push(entity.full_name);
    }
  }
  
  // Check document dates
  const docDates = db.prepare(`
    SELECT date_created, COUNT(*) as count FROM documents 
    WHERE date_created IS NOT NULL AND date_created != ''
    GROUP BY date_created ORDER BY count DESC LIMIT 20
  `).all() as { date_created: string; count: number }[];
  
  console.log(`   Total date entities: ${dateEntities.length}`);
  console.log(`   Valid ISO format: ${validDates.length}`);
  console.log(`   Non-standard format: ${invalidDates.length}`);
  
  return {
    totalDates: dateEntities.length,
    validFormats: validDates.length,
    invalidFormats: invalidDates.slice(0, 20),
    conflictingDates: [],
  };
}

function auditCategoryDistribution(db: Database.Database): AuditReport['categoryDistribution'] {
  console.log('\n📊 Auditing Category Distribution...');
  
  // Evidence type distribution
  const evidenceTypes = db.prepare(`
    SELECT type_name as name, 
           (SELECT COUNT(*) FROM entity_evidence_types WHERE evidence_type_id = evidence_types.id) as count
    FROM evidence_types
    ORDER BY count DESC
  `).all() as { name: string; count: number }[];
  
  const distribution: Record<string, number> = {};
  const underRepresented: string[] = [];
  const wellCovered: string[] = [];
  
  for (const et of evidenceTypes) {
    distribution[et.name] = et.count;
    if (et.count < 100) {
      underRepresented.push(`${et.name} (${et.count})`);
    } else if (et.count > 1000) {
      wellCovered.push(`${et.name} (${et.count})`);
    }
  }
  
  // Document type distribution
  const docTypes = db.prepare(`
    SELECT evidence_type, COUNT(*) as count 
    FROM documents 
    WHERE evidence_type IS NOT NULL
    GROUP BY evidence_type 
    ORDER BY count DESC
  `).all() as { evidence_type: string; count: number }[];
  
  console.log(`   Evidence types found: ${evidenceTypes.length}`);
  console.log(`   Under-represented (<100): ${underRepresented.length}`);
  console.log(`   Well-covered (>1000): ${wellCovered.length}`);
  console.log('\n   Document Types:');
  docTypes.slice(0, 10).forEach(dt => {
    console.log(`      ${dt.evidence_type}: ${dt.count}`);
  });
  
  return {
    evidenceTypes: distribution,
    underRepresented,
    wellCovered,
  };
}

function auditEntityQuality(db: Database.Database): AuditReport['entityQuality'] {
  console.log('\n👤 Auditing Entity Quality...');
  
  const stats = db.prepare(`
    SELECT 
      COUNT(*) as total,
      SUM(CASE WHEN primary_role IS NOT NULL AND primary_role != 'Unknown' THEN 1 ELSE 0 END) as with_roles,
      SUM(CASE WHEN primary_role = 'Unknown' OR primary_role IS NULL THEN 1 ELSE 0 END) as unknown_roles,
      SUM(CASE WHEN title IS NOT NULL AND title != '' THEN 1 ELSE 0 END) as with_titles
    FROM entities WHERE entity_type = 'Person'
  `).get() as any;
  
  console.log(`   Total people: ${stats.total}`);
  console.log(`   With assigned roles: ${stats.with_roles} (${(stats.with_roles/stats.total*100).toFixed(1)}%)`);
  console.log(`   Unknown roles: ${stats.unknown_roles}`);
  console.log(`   With titles: ${stats.with_titles}`);
  
  return {
    totalPeople: stats.total,
    withRoles: stats.with_roles,
    unknownRoles: stats.unknown_roles,
    withTitles: stats.with_titles,
  };
}

function auditRelationships(db: Database.Database): AuditReport['relationships'] {
  console.log('\n🔗 Auditing Relationships...');
  
  const relStats = db.prepare(`
    SELECT COUNT(*) as total, AVG(weight) as avg_weight
    FROM entity_relationships
  `).get() as { total: number; avg_weight: number };
  
  // Find isolated entities (no relationships)
  const isolated = db.prepare(`
    SELECT COUNT(*) as count FROM entities e
    WHERE entity_type = 'Person'
    AND NOT EXISTS (
      SELECT 1 FROM entity_relationships r 
      WHERE r.source_id = e.id OR r.target_id = e.id
    )
  `).get() as { count: number };
  
  console.log(`   Total relationships: ${relStats.total.toLocaleString()}`);
  console.log(`   Average weight: ${relStats.avg_weight?.toFixed(1) || 0}`);
  console.log(`   Isolated entities: ${isolated.count}`);
  
  return {
    total: relStats.total,
    avgWeight: relStats.avg_weight || 0,
    isolatedEntities: isolated.count,
  };
}

async function main() {
  console.log('\n🔍 Comprehensive Data Quality Audit\n');
  console.log('═'.repeat(50));
  
  const db = new Database(DB_PATH);
  
  const report: AuditReport = {
    timestamp: new Date().toISOString(),
    brokenLinks: auditBrokenLinks(db),
    dateConsistency: auditDateConsistency(db),
    categoryDistribution: auditCategoryDistribution(db),
    entityQuality: auditEntityQuality(db),
    relationships: auditRelationships(db),
  };
  
  // Save report
  fs.writeFileSync(REPORT_PATH, JSON.stringify(report, null, 2));
  console.log(`\n📝 Report saved: ${REPORT_PATH}`);
  
  // Summary
  console.log('\n' + '═'.repeat(50));
  console.log('\n📋 AUDIT SUMMARY\n');
  
  const issues: string[] = [];
  
  if (report.brokenLinks.orphanedDocuments > 0) {
    issues.push(`⚠️  ${report.brokenLinks.orphanedDocuments} documents without file paths`);
  }
  if (report.brokenLinks.invalidEntityLinks > 0) {
    issues.push(`⚠️  ${report.brokenLinks.invalidEntityLinks} invalid entity-document links`);
  }
  if (report.dateConsistency.invalidFormats.length > 0) {
    issues.push(`⚠️  ${report.dateConsistency.invalidFormats.length} dates with non-standard format`);
  }
  if (report.entityQuality.unknownRoles > report.entityQuality.totalPeople * 0.5) {
    issues.push(`⚠️  ${report.entityQuality.unknownRoles} entities still have Unknown role`);
  }
  if (report.relationships.isolatedEntities > 0) {
    issues.push(`⚠️  ${report.relationships.isolatedEntities} isolated entities with no relationships`);
  }
  
  if (issues.length === 0) {
    console.log('✅ No critical issues found');
  } else {
    console.log('Issues requiring attention:');
    issues.forEach(i => console.log(`   ${i}`));
  }
  
  console.log('\n' + '═'.repeat(50));
  
  db.close();
}

main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
