/**
 * Database Query Performance Analyzer
 *
 * Runs EXPLAIN QUERY PLAN on hot paths to identify:
 * - Full table scans
 * - Missing indexes
 * - Inefficient joins
 */

import Database from 'better-sqlite3';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const DB_PATH = process.env.DB_PATH || join(__dirname, '..', 'epstein-archive.db');

interface QueryPlan {
  id: number;
  parent: number;
  notused: number;
  detail: string;
}

interface QueryAnalysis {
  name: string;
  query: string;
  plan: QueryPlan[];
  hasTableScan: boolean;
  hasIndexScan: boolean;
  warnings: string[];
}

const HOT_QUERIES = [
  {
    name: 'Homepage Top Entities',
    query: `
      SELECT 
        id,
        full_name,
        primary_role,
        bio,
        mentions,
        risk_level,
        red_flag_rating,
        connections_summary as connections,
        (SELECT COUNT(*) FROM media_item_people WHERE entity_id = entities.id) as media_count,
        (SELECT COUNT(*) FROM black_book_entries WHERE person_id = entities.id) as black_book_count
      FROM entities
      WHERE COALESCE(junk_flag,0)=0
        AND entity_type = 'Person'
        AND is_vip = 1
        AND LENGTH(TRIM(full_name)) >= 3
      ORDER BY 
        (SELECT COUNT(*) FROM media_item_people WHERE entity_id = entities.id) > 0 DESC,
        COALESCE(mentions, 0) DESC,
        red_flag_rating DESC,
        full_name ASC
      LIMIT 24
    `,
  },
  {
    name: 'Entity Documents Tab',
    query: `
      SELECT 
        d.id,
        d.file_name,
        d.evidence_type,
        d.date_created,
        d.file_size,
        d.content_preview,
        em.mention_context
      FROM documents d
      JOIN entity_mentions em ON d.id = em.document_id
      WHERE em.entity_id = 1
      ORDER BY d.red_flag_rating DESC, d.date_created DESC
      LIMIT 50 OFFSET 0
    `,
  },
  {
    name: 'Entity Relationships',
    query: `
      SELECT 
        er.target_entity_id as entity_id,
        er.relationship_type,
        er.strength,
        er.confidence
      FROM entity_relationships er
      WHERE er.source_entity_id = 1
      ORDER BY er.strength DESC, er.confidence DESC
      LIMIT 20
    `,
  },
  {
    name: 'Entity Mentions Count',
    query: `
      SELECT COUNT(*) as total
      FROM entity_mentions
      WHERE entity_id = 1
    `,
  },
  {
    name: 'Full Text Search - Documents',
    query: `
      SELECT 
        d.id,
        d.file_name,
        d.evidence_type,
        d.red_flag_rating
      FROM documents_fts fts
      JOIN documents d ON fts.rowid = d.id
      WHERE documents_fts MATCH 'epstein'
      ORDER BY rank
      LIMIT 50
    `,
  },
  {
    name: 'Full Text Search - Entities',
    query: `
      SELECT 
        e.id,
        e.full_name,
        e.primary_role,
        e.mentions
      FROM entities_fts fts
      JOIN entities e ON fts.rowid = e.id
      WHERE entities_fts MATCH 'maxwell'
      ORDER BY rank
      LIMIT 50
    `,
  },
  {
    name: 'Media Items for Entity',
    query: `
      SELECT 
        mi.id,
        mi.title,
        mi.file_path,
        mi.file_type,
        mi.red_flag_rating
      FROM media_item_people mip
      JOIN media_items mi ON mip.media_item_id = mi.id
      WHERE mip.entity_id = 1
      ORDER BY mi.red_flag_rating DESC
      LIMIT 10
    `,
  },
  {
    name: 'Black Book Entries',
    query: `
      SELECT 
        id,
        entry_text,
        phone_numbers,
        addresses,
        notes
      FROM black_book_entries
      WHERE person_id = 1
    `,
  },
];

function analyzeQuery(db: Database.Database, name: string, query: string): QueryAnalysis {
  const plan = db.prepare(`EXPLAIN QUERY PLAN ${query}`).all() as QueryPlan[];

  const warnings: string[] = [];
  let hasTableScan = false;
  let hasIndexScan = false;

  for (const step of plan) {
    const detail = step.detail.toLowerCase();

    // Check for table scans
    if (detail.includes('scan table') && !detail.includes('using index')) {
      hasTableScan = true;
      warnings.push(`⚠️  Full table scan detected: ${step.detail}`);
    }

    // Check for index usage
    if (detail.includes('using index') || detail.includes('search table')) {
      hasIndexScan = true;
    }

    // Check for temp b-tree (expensive)
    if (detail.includes('use temp b-tree')) {
      warnings.push(`⚠️  Temporary B-tree created: ${step.detail}`);
    }
  }

  return {
    name,
    query: query.trim(),
    plan,
    hasTableScan,
    hasIndexScan,
    warnings,
  };
}

function printAnalysis(analysis: QueryAnalysis): void {
  console.log('\n' + '='.repeat(80));
  console.log(`📊 ${analysis.name}`);
  console.log('='.repeat(80));

  if (analysis.warnings.length > 0) {
    console.log('\n⚠️  WARNINGS:');
    analysis.warnings.forEach((w) => console.log(`  ${w}`));
  } else {
    console.log('\n✅ No performance warnings');
  }

  console.log('\n📋 Query Plan:');
  analysis.plan.forEach((step, i) => {
    const indent = '  '.repeat(step.parent);
    console.log(`  ${indent}${i}. ${step.detail}`);
  });

  console.log('\n📈 Summary:');
  console.log(`  - Table Scan: ${analysis.hasTableScan ? '❌' : '✅'}`);
  console.log(`  - Index Usage: ${analysis.hasIndexScan ? '✅' : '❌'}`);
}

function main(): void {
  console.log('🔍 Database Query Performance Analyzer\n');
  console.log(`Database: ${DB_PATH}\n`);

  const db = new Database(DB_PATH, { readonly: true });

  const analyses: QueryAnalysis[] = [];

  for (const { name, query } of HOT_QUERIES) {
    const analysis = analyzeQuery(db, name, query);
    analyses.push(analysis);
    printAnalysis(analysis);
  }

  // Summary
  console.log('\n' + '='.repeat(80));
  console.log('📊 OVERALL SUMMARY');
  console.log('='.repeat(80));

  const totalWarnings = analyses.reduce((sum, a) => sum + a.warnings.length, 0);
  const queriesWithTableScans = analyses.filter((a) => a.hasTableScan).length;
  const queriesWithIndexes = analyses.filter((a) => a.hasIndexScan).length;

  console.log(`\nTotal Queries Analyzed: ${analyses.length}`);
  console.log(`Queries with Index Usage: ${queriesWithIndexes}/${analyses.length}`);
  console.log(`Queries with Table Scans: ${queriesWithTableScans}/${analyses.length}`);
  console.log(`Total Warnings: ${totalWarnings}`);

  if (totalWarnings > 0) {
    console.log('\n⚠️  Performance issues detected. Review warnings above.');
  } else {
    console.log('\n✅ All queries are well-optimized!');
  }

  db.close();
}

main();
