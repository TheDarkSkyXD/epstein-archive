#!/usr/bin/env tsx
import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import { TextCleaner } from './utils/text_cleaner.js';
import { AIEnrichmentService } from '../src/server/services/AIEnrichmentService.js';

const DB_PATH = process.env.DB_PATH || 'epstein-archive.db';

async function runComparison() {
  const db = await open({
    filename: DB_PATH,
    driver: sqlite3.Database,
  });

  // Get 100 documents with corrupted characters, sorted to show variety
  const docs = await db.all(`
    SELECT id, file_path, content, metadata_json 
    FROM documents 
    WHERE content LIKE '%=%'
    ORDER BY (length(content) - length(replace(content, '=', ''))) ASC 
    LIMIT 100
  `);

  console.log(`=== Ingest Comparison: Regex vs GPU-Accelerated AI (100 Docs) ===\n`);
  console.log(`| ID | Doc Name | Regex Time | AI Time | Regex Diffs | AI Diffs | Depth Incr |`);
  console.log(`|----|----------|------------|---------|-------------|----------|------------|`);

  let totalRegexTime = 0;
  let totalAiTime = 0;
  let totalRegexDiffs = 0;
  let totalAiDiffs = 0;

  for (const doc of docs) {
    const filename = doc.file_path.split('/').pop()?.substring(0, 20) || 'unknown';
    const metadata = doc.metadata_json ? JSON.parse(doc.metadata_json) : {};
    const context = metadata.subject || '';

    // Legacy Regex Benchmark
    const startRegex = Date.now();
    const regexCleaned = TextCleaner.cleanEmailText(doc.content);
    const endRegex = Date.now();
    const regexTime = endRegex - startRegex;
    const regexDiffCount = Math.abs(regexCleaned.length - doc.content.length);

    // GPU-Accelerated AI Benchmark
    process.env.ENABLE_AI_ENRICHMENT = 'true';
    process.env.AI_PROVIDER = 'local_ollama';
    const startAi = Date.now();

    // FULL REPAIR (No line limits for GPU benchmark)
    const aiCleaned = await AIEnrichmentService.repairMimeWildcards(doc.content, context);

    const endAi = Date.now();
    const aiTime = endAi - startAi;
    const aiDiffCount = Math.abs(aiCleaned.length - doc.content.length);

    if (aiDiffCount === 0 && doc.content.includes('=')) {
      // AI might have decided no repair needed, or failed.
    }

    totalRegexTime += regexTime;
    totalAiTime += aiTime;
    totalRegexDiffs += regexDiffCount;
    totalAiDiffs += aiDiffCount;

    const depthIncr = aiDiffCount > regexDiffCount ? `+${aiDiffCount - regexDiffCount}` : '0';

    if (aiTime > 100 || regexDiffCount > 0 || aiDiffCount > 0) {
      console.log(
        `| ${doc.id} | ${filename} | ${regexTime}ms | ${aiTime}ms | ${regexDiffCount} | ${aiDiffCount} | ${depthIncr} |`,
      );
    }
  }

  console.log(`\n=== AGGREGATE STATS ===`);
  console.log(`Total Docs: 100`);
  console.log(`Avg Regex Time: ${(totalRegexTime / 100).toFixed(2)}ms`);
  console.log(`Avg AI Time: ${(totalAiTime / 100).toFixed(2)}ms`);
  console.log(`Total Regex Repairs: ${totalRegexDiffs}`);
  console.log(`Total AI Repairs: ${totalAiDiffs}`);
  console.log(
    `Fidelity Increase: ${(((totalAiDiffs - totalRegexDiffs) / totalRegexDiffs) * 100).toFixed(2)}%`,
  );
}

runComparison().catch(console.error);
