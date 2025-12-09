#!/usr/bin/env tsx

/**
 * Entity Extraction and Consolidation Pipeline
 * 
 * Purpose: Extract entities from evidence text and link them to existing entities
 * in the database with role-based relationships and confidence scores.
 * 
 * Processing:
 * 1. Iterate all evidence with extracted_text
 * 2. Extract entities using pattern-based detection
 * 3. Normalize entity names
 * 4. Match against existing entities (exact and fuzzy)
 * 5. Create Evidence_Entity links with roles
 * 6. Update entity mention counts
 * 7. Generate extraction report
 */

import * as fs from 'fs';
import * as path from 'path';
import Database from 'better-sqlite3';

// Type definitions
interface EntityMatch {
  entityId: number;
  name: string;
  normalizedName: string;
  confidence: number;
}

interface ExtractedEntity {
  rawName: string;
  normalizedName: string;
  role: string;
  contextSnippet: string;
  confidence: number;
}

interface ExtractionMetrics {
  evidenceProcessed: number;
  entitiesExtracted: number;
  entitiesLinked: number;
  entitiesCreated: number;
  linksCreated: number;
  errors: Array<{ evidenceId: number; error: string }>;
}

/**
 * Normalize entity name for matching
 */
function normalizeEntityName(name: string): string {
  let normalized = name.trim();
  
  // Remove titles
  const titles = ['Mr.', 'Ms.', 'Mrs.', 'Dr.', 'Prof.', 'President', 'Senator', 'Governor', 'Judge'];
  for (const title of titles) {
    normalized = normalized.replace(new RegExp(`^${title}\\s+`, 'i'), '');
  }
  
  // Convert to lowercase for comparison
  normalized = normalized.toLowerCase();
  
  // Remove extra whitespace
  normalized = normalized.replace(/\s+/g, ' ').trim();
  
  // Remove punctuation at ends
  normalized = normalized.replace(/^[.,;:!?]+|[.,;:!?]+$/g, '');
  
  return normalized;
}

/**
 * Calculate Levenshtein distance for fuzzy matching
 */
function levenshteinDistance(str1: string, str2: string): number {
  const matrix: number[][] = [];
  
  for (let i = 0; i <= str2.length; i++) {
    matrix[i] = [i];
  }
  
  for (let j = 0; j <= str1.length; j++) {
    matrix[0][j] = j;
  }
  
  for (let i = 1; i <= str2.length; i++) {
    for (let j = 1; j <= str1.length; j++) {
      if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substitution
          matrix[i][j - 1] + 1,     // insertion
          matrix[i - 1][j] + 1      // deletion
        );
      }
    }
  }
  
  return matrix[str2.length][str1.length];
}

/**
 * Extract person names from text using pattern matching
 */
function extractPersonNames(text: string): Array<{ name: string; position: number }> {
  const names: Array<{ name: string; position: number }> = [];
  
  // Pattern 1: Title + First + Last (e.g., "President Bill Clinton")
  const titlePattern = /(?:Mr\.|Ms\.|Mrs\.|Dr\.|Prof\.|President|Senator|Governor|Judge)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)/g;
  let match;
  
  while ((match = titlePattern.exec(text)) !== null) {
    names.push({
      name: match[1],
      position: match.index,
    });
  }
  
  // Pattern 2: First + Last name (capitalized words)
  const namePattern = /\b([A-Z][a-z]+\s+(?:[A-Z]\.\s+)?[A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)\b/g;
  
  while ((match = namePattern.exec(text)) !== null) {
    // Filter out common false positives
    const name = match[1];
    if (!isCommonPhrase(name)) {
      names.push({
        name,
        position: match.index,
      });
    }
  }
  
  return names;
}

/**
 * Check if a phrase is a common false positive
 */
function isCommonPhrase(phrase: string): boolean {
  const commonPhrases = [
    'United States', 'New York', 'Los Angeles', 'United Kingdom',
    'Palm Beach', 'House Oversight', 'District Court', 'Southern District',
    'Black Book', 'Virgin Islands', 'New Mexico', 'Santa Fe',
  ];
  
  return commonPhrases.some(common => phrase.includes(common));
}

/**
 * Extract email addresses from text
 */
function extractEmails(text: string): Array<{ email: string; position: number }> {
  const emails: Array<{ email: string; position: number }> = [];
  const emailPattern = /\b([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})\b/g;
  let match;
  
  while ((match = emailPattern.exec(text)) !== null) {
    emails.push({
      email: match[1],
      position: match.index,
    });
  }
  
  return emails;
}

/**
 * Extract organizations from text
 */
function extractOrganizations(text: string): Array<{ name: string; position: number }> {
  const orgs: Array<{ name: string; position: number }> = [];
  
  // Pattern: Words ending with Inc., Ltd., Corp., Foundation, etc.
  const orgPattern = /\b([A-Z][A-Za-z\s&]+(?:Inc\.|Ltd\.|Corp\.|Foundation|Institute|Company|Organization|Association))/g;
  let match;
  
  while ((match = orgPattern.exec(text)) !== null) {
    orgs.push({
      name: match[1].trim(),
      position: match.index,
    });
  }
  
  return orgs;
}

/**
 * Determine role based on evidence type and context
 */
function determineRole(evidenceType: string, metadata: any, context: string): string {
  const contextLower = context.toLowerCase();
  
  // Email-specific roles
  if (evidenceType === 'correspondence') {
    if (contextLower.includes('from:')) return 'sender';
    if (contextLower.includes('to:') || contextLower.includes('cc:')) return 'recipient';
  }
  
  // Deposition-specific roles
  if (evidenceType === 'court_deposition') {
    if (contextLower.includes('deposition of')) return 'deponent';
    if (contextLower.includes('attorney for')) return 'legal_representative';
  }
  
  // Flight log-specific roles
  if (evidenceType === 'financial_record' && metadata?.columnHeaders?.toLowerCase().includes('passenger')) {
    return 'passenger';
  }
  
  // Default role
  return 'mentioned';
}

/**
 * Get context snippet around entity mention
 */
function getContextSnippet(text: string, position: number, entityLength: number): string {
  const before = Math.max(0, position - 50);
  const after = Math.min(text.length, position + entityLength + 50);
  
  let snippet = text.substring(before, after);
  
  if (before > 0) snippet = '...' + snippet;
  if (after < text.length) snippet = snippet + '...';
  
  return snippet.trim();
}

/**
 * Find or create entity in database
 */
function findOrCreateEntity(
  db: Database.Database,
  rawName: string,
  normalizedName: string
): EntityMatch | null {
  // Try exact match first
  const exactMatch = db.prepare(`
    SELECT id, full_name, LOWER(full_name) as normalized_name
    FROM entities
    WHERE LOWER(full_name) = ?
    LIMIT 1
  `).get(normalizedName) as { id: number; full_name: string; normalized_name: string } | undefined;
  
  if (exactMatch) {
    return {
      entityId: exactMatch.id,
      name: exactMatch.full_name,
      normalizedName: exactMatch.normalized_name,
      confidence: 1.0,
    };
  }
  
  // Try fuzzy match (Levenshtein distance <= 2)
  const allEntities = db.prepare(`
    SELECT id, full_name, LOWER(full_name) as normalized_name
    FROM entities
  `).all() as Array<{ id: number; full_name: string; normalized_name: string }>;
  
  for (const entity of allEntities) {
    const distance = levenshteinDistance(normalizedName, entity.normalized_name);
    if (distance <= 2 && distance > 0) {
      // Fuzzy match found
      return {
        entityId: entity.id,
        name: entity.full_name,
        normalizedName: entity.normalized_name,
        confidence: 1.0 - (distance / 10), // Confidence decreases with distance
      };
    }
  }
  
  // No match found, create new entity
  const stmt = db.prepare(`
    INSERT INTO entities (full_name, mentions, created_at, updated_at)
    VALUES (?, 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
  `);
  
  const result = stmt.run(rawName);
  
  return {
    entityId: Number(result.lastInsertRowid),
    name: rawName,
    normalizedName,
    confidence: 0.8, // Lower confidence for new entities
  };
}

/**
 * Create evidence-entity link
 */
function createEvidenceEntityLink(
  db: Database.Database,
  evidenceId: number,
  entityId: number,
  role: string,
  confidence: number,
  contextSnippet: string
): void {
  // Check if link already exists
  const existing = db.prepare(`
    SELECT id FROM evidence_entity
    WHERE evidence_id = ? AND entity_id = ? AND role = ?
  `).get(evidenceId, entityId, role);
  
  if (existing) {
    return; // Already linked
  }
  
  // Create link
  db.prepare(`
    INSERT INTO evidence_entity (evidence_id, entity_id, role, confidence, context_snippet)
    VALUES (?, ?, ?, ?, ?)
  `).run(evidenceId, entityId, role, confidence, contextSnippet);
}

/**
 * Process a single evidence record
 */
function processEvidence(
  db: Database.Database,
  evidence: any,
  metrics: ExtractionMetrics
): void {
  try {
    const { id, extracted_text, evidence_type, metadata_json } = evidence;
    
    if (!extracted_text || extracted_text.length === 0) {
      return;
    }
    
    const metadata = metadata_json ? JSON.parse(metadata_json) : {};
    const extractedEntities: ExtractedEntity[] = [];
    
    // Extract person names
    const personNames = extractPersonNames(extracted_text);
    for (const { name, position } of personNames) {
      const normalizedName = normalizeEntityName(name);
      const context = getContextSnippet(extracted_text, position, name.length);
      const role = determineRole(evidence_type, metadata, context);
      
      extractedEntities.push({
        rawName: name,
        normalizedName,
        role,
        contextSnippet: context,
        confidence: 0.9,
      });
    }
    
    // Extract email addresses (as identifiers for people)
    const emails = extractEmails(extracted_text);
    for (const { email, position } of emails) {
      const context = getContextSnippet(extracted_text, position, email.length);
      const role = determineRole(evidence_type, metadata, context);
      
      extractedEntities.push({
        rawName: email,
        normalizedName: email.toLowerCase(),
        role,
        contextSnippet: context,
        confidence: 1.0, // High confidence for email addresses
      });
    }
    
    // Extract organizations
    const organizations = extractOrganizations(extracted_text);
    for (const { name, position } of organizations) {
      const normalizedName = normalizeEntityName(name);
      const context = getContextSnippet(extracted_text, position, name.length);
      
      extractedEntities.push({
        rawName: name,
        normalizedName,
        role: 'organization',
        contextSnippet: context,
        confidence: 0.85,
      });
    }
    
    // Process each extracted entity
    const processedEntities = new Set<string>(); // Prevent duplicates
    
    for (const extracted of extractedEntities) {
      const key = `${extracted.normalizedName}:${extracted.role}`;
      if (processedEntities.has(key)) {
        continue;
      }
      processedEntities.add(key);
      
      // Find or create entity
      const match = findOrCreateEntity(db, extracted.rawName, extracted.normalizedName);
      
      if (match) {
        // Create link
        createEvidenceEntityLink(
          db,
          id,
          match.entityId,
          extracted.role,
          extracted.confidence * match.confidence,
          extracted.contextSnippet
        );
        
        metrics.entitiesLinked++;
        metrics.linksCreated++;
      }
      
      metrics.entitiesExtracted++;
    }
    
    metrics.evidenceProcessed++;
    
    if (metrics.evidenceProcessed % 100 === 0) {
      console.log(`  Processed ${metrics.evidenceProcessed} evidence records...`);
    }
    
  } catch (error) {
    metrics.errors.push({
      evidenceId: evidence.id,
      error: String(error),
    });
  }
}

/**
 * Update entity mention counts
 */
function updateMentionCounts(db: Database.Database): void {
  console.log('Updating entity mention counts...');
  
  db.prepare(`
    UPDATE entities
    SET mentions = (
      SELECT COUNT(DISTINCT ee.evidence_id)
      FROM evidence_entity ee
      WHERE ee.entity_id = entities.id
    )
  `).run();
  
  console.log('  ✓ Mention counts updated');
}

/**
 * Generate extraction report
 */
function generateReport(metrics: ExtractionMetrics, outputPath: string, db: Database.Database): void {
  // Query database for totals
  const totalEntities = db.prepare('SELECT COUNT(*) as count FROM entities').get() as { count: number };
  const totalLinks = db.prepare('SELECT COUNT(*) as count FROM evidence_entity').get() as { count: number };
  
  const roleBreakdown = db.prepare(`
    SELECT role, COUNT(*) as count
    FROM evidence_entity
    GROUP BY role
    ORDER BY count DESC
  `).all() as Array<{ role: string; count: number }>;
  
  const report = {
    timestamp: new Date().toISOString(),
    extraction: {
      evidenceProcessed: metrics.evidenceProcessed,
      entitiesExtracted: metrics.entitiesExtracted,
      entitiesLinked: metrics.entitiesLinked,
      entitiesCreated: metrics.entitiesCreated,
      linksCreated: metrics.linksCreated,
    },
    database: {
      totalEntities: totalEntities.count,
      totalLinks: totalLinks.count,
    },
    roleBreakdown: roleBreakdown.reduce((acc, { role, count }) => {
      acc[role] = count;
      return acc;
    }, {} as Record<string, number>),
    errors: metrics.errors,
  };
  
  fs.writeFileSync(outputPath, JSON.stringify(report, null, 2), 'utf-8');
  
  console.log(`\n📊 Extraction Summary:`);
  console.log(`   Evidence processed: ${report.extraction.evidenceProcessed}`);
  console.log(`   Entities extracted: ${report.extraction.entitiesExtracted}`);
  console.log(`   Entities linked: ${report.extraction.entitiesLinked}`);
  console.log(`   Links created: ${report.extraction.linksCreated}`);
  console.log(`   Total entities in DB: ${report.database.totalEntities}`);
  console.log(`   Total evidence-entity links: ${report.database.totalLinks}`);
  console.log(`\n   Role breakdown:`);
  for (const [role, count] of Object.entries(report.roleBreakdown)) {
    console.log(`     ${role}: ${count}`);
  }
  console.log(`\n📄 Full report saved to: ${outputPath}`);
}

/**
 * Main execution
 */
async function main() {
  const workspaceRoot = '/Users/veland/Downloads/Epstein Files';
  const dbPath = path.join(workspaceRoot, 'epstein-archive', 'epstein.db');
  const reportPath = path.join(workspaceRoot, 'data', 'entity_extraction_report.json');

  console.log('🔍 Entity Extraction Pipeline');
  console.log('━'.repeat(50));
  console.log(`Database: ${dbPath}`);
  console.log('━'.repeat(50));
  console.log();

  // Open database
  const db = new Database(dbPath);

  // Initialize metrics
  const metrics: ExtractionMetrics = {
    evidenceProcessed: 0,
    entitiesExtracted: 0,
    entitiesLinked: 0,
    entitiesCreated: 0,
    linksCreated: 0,
    errors: [],
  };

  // Get all evidence with extracted text
  const evidenceRecords = db.prepare(`
    SELECT id, extracted_text, evidence_type, metadata_json
    FROM evidence
    WHERE extracted_text IS NOT NULL AND LENGTH(extracted_text) > 0
  `).all();

  console.log(`Found ${evidenceRecords.length} evidence records with text`);
  console.log();

  // Process all evidence
  const startTime = Date.now();
  
  for (const evidence of evidenceRecords) {
    processEvidence(db, evidence, metrics);
  }
  
  const endTime = Date.now();
  const duration = ((endTime - startTime) / 1000).toFixed(2);

  console.log();
  console.log('━'.repeat(50));
  console.log(`✅ Extraction complete in ${duration}s`);
  console.log();

  // Update mention counts
  updateMentionCounts(db);

  // Generate report
  generateReport(metrics, reportPath, db);

  // Close database
  db.close();
}

// Run main function
main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
