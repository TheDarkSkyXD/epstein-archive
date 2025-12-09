import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface EvidenceMetrics {
  evidenceId: number;
  evidenceType: string;
  wordCount: number;
  entityCount: number;
  highProfileEntityCount: number;
  victimMentions: number;
  legalTerms: number;
  financialTerms: number;
  locationMentions: number;
  dateReferences: number;
  redFlagKeywords: number;
}

interface EntityRiskMetrics {
  entityId: number;
  evidenceCount: number;
  highRiskEvidenceCount: number;
  roleVariety: number;
  coAppearanceCount: number;
  depositionCount: number;
  correspondenceCount: number;
  courtFilingCount: number;
}

const db = new Database(path.join(__dirname, '../epstein.db'));

// High-risk keywords for red flag assessment
const RED_FLAG_KEYWORDS = [
  'victim', 'minor', 'underage', 'trafficking', 'abuse', 'assault',
  'rape', 'molest', 'grooming', 'exploitation', 'coercion',
  'prostitution', 'sex', 'sexual', 'inappropriate', 'massage',
  'recruit', 'procure', 'transport', 'flight', 'island',
  'allegation', 'accused', 'complaint', 'testimony', 'deposition',
  'settlement', 'conviction', 'arrest', 'indictment', 'guilty'
];

// Legal terminology
const LEGAL_TERMS = [
  'deposition', 'testimony', 'affidavit', 'plaintiff', 'defendant',
  'attorney', 'counsel', 'court', 'judge', 'jury', 'trial',
  'verdict', 'settlement', 'subpoena', 'warrant', 'indictment'
];

// Financial terminology
const FINANCIAL_TERMS = [
  'payment', 'transaction', 'account', 'wire', 'transfer', 'cash',
  'check', 'deposit', 'withdrawal', 'investment', 'fund', 'estate',
  'trust', 'beneficiary', 'asset', 'liability', 'financial'
];

// High-profile entity indicators (roles/titles)
const HIGH_PROFILE_INDICATORS = [
  'president', 'prince', 'royal', 'duke', 'senator', 'governor',
  'minister', 'ambassador', 'ceo', 'chairman', 'billionaire',
  'celebrity', 'actor', 'model', 'scientist', 'professor'
];

function countKeywords(text: string | null, keywords: string[]): number {
  if (!text) return 0;
  const lowerText = text.toLowerCase();
  return keywords.reduce((count, keyword) => {
    const regex = new RegExp(`\\b${keyword}\\w*\\b`, 'gi');
    const matches = lowerText.match(regex);
    return count + (matches ? matches.length : 0);
  }, 0);
}

function calculateEvidenceRedFlag(metrics: EvidenceMetrics): number {
  let score = 0;
  
  // Evidence type weighting
  const typeWeights: Record<string, number> = {
    'court_deposition': 3,
    'testimony': 3,
    'court_filing': 2.5,
    'correspondence': 2,
    'financial_record': 1.5,
    'investigative_report': 2,
    'contact_directory': 1,
    'timeline_data': 1.5,
    'evidence_list': 1,
    'media_scan': 0.5
  };
  
  score += (typeWeights[metrics.evidenceType] || 1) * 0.5;
  
  // Red flag keyword density
  const keywordDensity = metrics.wordCount > 0 
    ? metrics.redFlagKeywords / metrics.wordCount * 100 
    : 0;
  score += Math.min(keywordDensity * 20, 2); // Cap at 2 points
  
  // Entity involvement
  score += Math.min(metrics.entityCount * 0.1, 1.5);
  score += Math.min(metrics.highProfileEntityCount * 0.3, 1.5);
  
  // Victim mentions (critical indicator)
  score += Math.min(metrics.victimMentions * 0.5, 2);
  
  // Legal context
  const legalDensity = metrics.wordCount > 0
    ? metrics.legalTerms / metrics.wordCount * 100
    : 0;
  score += Math.min(legalDensity * 10, 1);
  
  // Financial connections
  const financialDensity = metrics.wordCount > 0
    ? metrics.financialTerms / metrics.wordCount * 100
    : 0;
  score += Math.min(financialDensity * 5, 0.5);
  
  // Normalize to 0-5 scale
  return Math.min(Math.round(score * 10) / 10, 5);
}

function calculateEntityRiskLevel(metrics: EntityRiskMetrics): {
  riskLevel: 'HIGH' | 'MEDIUM' | 'LOW';
  riskScore: number;
} {
  let score = 0;
  
  // Evidence volume
  score += Math.min(metrics.evidenceCount * 0.2, 3);
  
  // High-risk evidence proportion
  const highRiskProportion = metrics.evidenceCount > 0
    ? metrics.highRiskEvidenceCount / metrics.evidenceCount
    : 0;
  score += highRiskProportion * 4;
  
  // Role variety (more roles = more involvement)
  score += Math.min(metrics.roleVariety * 0.3, 2);
  
  // Co-appearance with other entities
  score += Math.min(metrics.coAppearanceCount * 0.05, 2);
  
  // Specific evidence type counts
  score += metrics.depositionCount * 0.5;
  score += metrics.correspondenceCount * 0.2;
  score += metrics.courtFilingCount * 0.4;
  
  // Normalize to 0-10 scale
  const riskScore = Math.min(score, 10);
  
  // Determine risk level
  let riskLevel: 'HIGH' | 'MEDIUM' | 'LOW';
  if (riskScore >= 6.5) {
    riskLevel = 'HIGH';
  } else if (riskScore >= 3.5) {
    riskLevel = 'MEDIUM';
  } else {
    riskLevel = 'LOW';
  }
  
  return { riskLevel, riskScore: Math.round(riskScore * 10) / 10 };
}

async function enrichEvidenceMetadata() {
  console.log('Starting evidence metadata enrichment...\n');
  
  // Get all evidence records
  const evidence = db.prepare(`
    SELECT 
      e.id,
      e.evidence_type,
      e.extracted_text,
      e.word_count,
      COUNT(DISTINCT ee.entity_id) as entity_count
    FROM evidence e
    LEFT JOIN evidence_entity ee ON e.id = ee.evidence_id
    GROUP BY e.id
  `).all() as any[];
  
  console.log(`Processing ${evidence.length} evidence records...`);
  
  let processed = 0;
  let enriched = 0;
  
  const updateStmt = db.prepare(`
    UPDATE evidence 
    SET red_flag_rating = ?,
        metadata_json = json_set(
          COALESCE(metadata_json, '{}'),
          '$.enrichment',
          json_object(
            'redFlagKeywords', ?,
            'legalTerms', ?,
            'financialTerms', ?,
            'highProfileEntities', ?,
            'enrichedAt', datetime('now')
          )
        )
    WHERE id = ?
  `);
  
  for (const ev of evidence) {
    const text = ev.extracted_text || '';
    
    // Count various indicators
    const redFlagKeywords = countKeywords(text, RED_FLAG_KEYWORDS);
    const legalTerms = countKeywords(text, LEGAL_TERMS);
    const financialTerms = countKeywords(text, FINANCIAL_TERMS);
    
    // Count high-profile entity mentions
    const highProfileCount = db.prepare(`
      SELECT COUNT(DISTINCT ee.entity_id)
      FROM evidence_entity ee
      JOIN entities ent ON ent.id = ee.entity_id
      WHERE ee.evidence_id = ?
        AND (
          LOWER(ent.primary_role) LIKE '%president%'
          OR LOWER(ent.primary_role) LIKE '%prince%'
          OR LOWER(ent.primary_role) LIKE '%royal%'
          OR LOWER(ent.primary_role) LIKE '%senator%'
          OR LOWER(ent.primary_role) LIKE '%ceo%'
          OR LOWER(ent.primary_role) LIKE '%billionaire%'
        )
    `).get(ev.id) as any;
    
    const metrics: EvidenceMetrics = {
      evidenceId: ev.id,
      evidenceType: ev.evidence_type,
      wordCount: ev.word_count || 0,
      entityCount: ev.entity_count || 0,
      highProfileEntityCount: highProfileCount?.['COUNT(DISTINCT ee.entity_id)'] || 0,
      victimMentions: countKeywords(text, ['victim', 'minor', 'underage']),
      legalTerms,
      financialTerms,
      locationMentions: countKeywords(text, ['island', 'palm beach', 'new york', 'paris', 'london']),
      dateReferences: (text.match(/\b\d{4}\b/g) || []).length,
      redFlagKeywords
    };
    
    const redFlagRating = calculateEvidenceRedFlag(metrics);
    
    updateStmt.run(
      redFlagRating,
      redFlagKeywords,
      legalTerms,
      financialTerms,
      metrics.highProfileEntityCount,
      ev.id
    );
    
    processed++;
    if (redFlagRating > 0) enriched++;
    
    if (processed % 1000 === 0) {
      console.log(`  Processed ${processed}/${evidence.length} evidence records (${enriched} enriched)...`);
    }
  }
  
  console.log(`\n✓ Evidence enrichment complete: ${processed} processed, ${enriched} with red flags\n`);
}

async function enrichEntityRiskLevels() {
  console.log('Starting entity risk level calculation...\n');
  
  // Get all entities with their evidence metrics
  const entities = db.prepare(`
    SELECT 
      ent.id,
      ent.full_name,
      COUNT(DISTINCT ee.evidence_id) as evidence_count,
      COUNT(DISTINCT ee.role) as role_variety,
      COUNT(DISTINCT CASE WHEN e.red_flag_rating >= 3 THEN ee.evidence_id END) as high_risk_evidence_count,
      COUNT(DISTINCT CASE WHEN e.evidence_type = 'court_deposition' THEN ee.evidence_id END) as deposition_count,
      COUNT(DISTINCT CASE WHEN e.evidence_type = 'correspondence' THEN ee.evidence_id END) as correspondence_count,
      COUNT(DISTINCT CASE WHEN e.evidence_type = 'court_filing' THEN ee.evidence_id END) as court_filing_count
    FROM entities ent
    LEFT JOIN evidence_entity ee ON ent.id = ee.entity_id
    LEFT JOIN evidence e ON e.id = ee.evidence_id
    GROUP BY ent.id
  `).all() as any[];
  
  console.log(`Processing ${entities.length} entities...`);
  
  let processed = 0;
  let highRisk = 0;
  let mediumRisk = 0;
  let lowRisk = 0;
  
  const updateStmt = db.prepare(`
    UPDATE entities 
    SET likelihood_level = ?,
        spice_rating = ?,
        spice_score = CAST(? * 10 AS INTEGER)
    WHERE id = ?
  `);
  
  for (const entity of entities) {
    // Get co-appearance count
    const coAppearance = db.prepare(`
      SELECT COUNT(DISTINCT ee2.entity_id) as count
      FROM evidence_entity ee1
      JOIN evidence_entity ee2 ON ee1.evidence_id = ee2.evidence_id
      WHERE ee1.entity_id = ? AND ee2.entity_id != ?
    `).get(entity.id, entity.id) as any;
    
    const metrics: EntityRiskMetrics = {
      entityId: entity.id,
      evidenceCount: entity.evidence_count || 0,
      highRiskEvidenceCount: entity.high_risk_evidence_count || 0,
      roleVariety: entity.role_variety || 0,
      coAppearanceCount: coAppearance?.count || 0,
      depositionCount: entity.deposition_count || 0,
      correspondenceCount: entity.correspondence_count || 0,
      courtFilingCount: entity.court_filing_count || 0
    };
    
    const { riskLevel, riskScore } = calculateEntityRiskLevel(metrics);
    
    // Map to spice_rating (legacy field, now represents red flag index)
    const spiceRating = Math.min(Math.ceil(riskScore / 2), 5);
    
    updateStmt.run(riskLevel, spiceRating, riskScore, entity.id);
    
    if (riskLevel === 'HIGH') highRisk++;
    else if (riskLevel === 'MEDIUM') mediumRisk++;
    else lowRisk++;
    
    processed++;
    
    if (processed % 1000 === 0) {
      console.log(`  Processed ${processed}/${entities.length} entities...`);
    }
  }
  
  console.log(`\n✓ Entity risk enrichment complete:`);
  console.log(`  - HIGH risk: ${highRisk}`);
  console.log(`  - MEDIUM risk: ${mediumRisk}`);
  console.log(`  - LOW risk: ${lowRisk}`);
  console.log(`  - Total: ${processed}\n`);
}

async function generateEnrichmentReport() {
  console.log('Generating enrichment report...\n');
  
  const stats = db.prepare(`
    SELECT 
      'Total Evidence' as metric,
      COUNT(*) as value
    FROM evidence
    UNION ALL
    SELECT 'Evidence with Red Flags', COUNT(*)
    FROM evidence WHERE red_flag_rating > 0
    UNION ALL
    SELECT 'High Red Flag (4-5)', COUNT(*)
    FROM evidence WHERE red_flag_rating >= 4
    UNION ALL
    SELECT 'Medium Red Flag (2-3)', COUNT(*)
    FROM evidence WHERE red_flag_rating BETWEEN 2 AND 3.99
    UNION ALL
    SELECT 'Low Red Flag (0-1)', COUNT(*)
    FROM evidence WHERE red_flag_rating BETWEEN 0.1 AND 1.99
    UNION ALL
    SELECT 'Total Entities', COUNT(*)
    FROM entities
    UNION ALL
    SELECT 'HIGH Risk Entities', COUNT(*)
    FROM entities WHERE likelihood_level = 'HIGH'
    UNION ALL
    SELECT 'MEDIUM Risk Entities', COUNT(*)
    FROM entities WHERE likelihood_level = 'MEDIUM'
    UNION ALL
    SELECT 'LOW Risk Entities', COUNT(*)
    FROM entities WHERE likelihood_level = 'LOW'
  `).all();
  
  console.log('=== ENRICHMENT SUMMARY ===\n');
  stats.forEach((row: any) => {
    console.log(`${row.metric}: ${row.value}`);
  });
  
  // Top red flag evidence
  const topRedFlags = db.prepare(`
    SELECT 
      id,
      title,
      evidence_type,
      red_flag_rating,
      word_count
    FROM evidence
    WHERE red_flag_rating > 0
    ORDER BY red_flag_rating DESC
    LIMIT 10
  `).all();
  
  console.log('\n=== TOP 10 RED FLAG EVIDENCE ===\n');
  topRedFlags.forEach((ev: any, idx) => {
    console.log(`${idx + 1}. [${ev.red_flag_rating.toFixed(1)}★] ${ev.title || `Evidence #${ev.id}`}`);
    console.log(`   Type: ${ev.evidence_type} | Words: ${ev.word_count || 'N/A'}\n`);
  });
  
  // Top high-risk entities
  const topRisk = db.prepare(`
    SELECT 
      id,
      full_name,
      primary_role,
      likelihood_level,
      spice_score,
      mentions
    FROM entities
    WHERE likelihood_level = 'HIGH'
    ORDER BY spice_score DESC
    LIMIT 10
  `).all();
  
  console.log('=== TOP 10 HIGH-RISK ENTITIES ===\n');
  topRisk.forEach((ent: any, idx) => {
    console.log(`${idx + 1}. ${ent.full_name} (${ent.likelihood_level})`);
    console.log(`   Risk Score: ${(ent.spice_score / 10).toFixed(1)}/10 | Role: ${ent.primary_role || 'Unknown'} | Mentions: ${ent.mentions}\n`);
  });
}

async function verifyDataIntegrity() {
  console.log('Running data integrity checks...\n');
  
  const checks = [
    {
      name: 'Orphaned evidence entities',
      query: `SELECT COUNT(*) as count FROM evidence_entity ee 
              WHERE NOT EXISTS (SELECT 1 FROM evidence e WHERE e.id = ee.evidence_id)
              OR NOT EXISTS (SELECT 1 FROM entities ent WHERE ent.id = ee.entity_id)`
    },
    {
      name: 'Evidence without text',
      query: `SELECT COUNT(*) as count FROM evidence 
              WHERE extracted_text IS NULL OR length(extracted_text) = 0`
    },
    {
      name: 'Entities without evidence',
      query: `SELECT COUNT(*) as count FROM entities ent
              WHERE NOT EXISTS (SELECT 1 FROM evidence_entity ee WHERE ee.entity_id = ent.id)`
    },
    {
      name: 'Invalid red flag ratings',
      query: `SELECT COUNT(*) as count FROM evidence 
              WHERE red_flag_rating < 0 OR red_flag_rating > 5`
    },
    {
      name: 'Invalid risk levels',
      query: `SELECT COUNT(*) as count FROM entities 
              WHERE likelihood_level NOT IN ('HIGH', 'MEDIUM', 'LOW', NULL)`
    }
  ];
  
  let allPassed = true;
  
  for (const check of checks) {
    const result = db.prepare(check.query).get() as any;
    const count = result?.count || 0;
    const status = count === 0 ? '✓ PASS' : '✗ FAIL';
    console.log(`${status} ${check.name}: ${count}`);
    if (count > 0) allPassed = false;
  }
  
  console.log(`\n${allPassed ? '✓ All integrity checks passed' : '⚠ Some integrity checks failed'}\n`);
  
  return allPassed;
}

async function main() {
  console.log('\n=== METADATA ENRICHMENT & DATA INTEGRITY VERIFICATION ===\n');
  console.log('Starting comprehensive metadata enrichment...\n');
  
  try {
    // Step 1: Verify data integrity first
    console.log('STEP 1: Data Integrity Verification\n');
    await verifyDataIntegrity();
    
    // Step 2: Enrich evidence with red flag ratings
    console.log('\nSTEP 2: Evidence Red Flag Assessment\n');
    await enrichEvidenceMetadata();
    
    // Step 3: Calculate entity risk levels
    console.log('STEP 3: Entity Risk Level Calculation\n');
    await enrichEntityRiskLevels();
    
    // Step 4: Generate comprehensive report
    console.log('STEP 4: Enrichment Report\n');
    await generateEnrichmentReport();
    
    // Step 5: Final integrity check
    console.log('\nSTEP 5: Final Integrity Verification\n');
    await verifyDataIntegrity();
    
    console.log('\n✓ Metadata enrichment complete!\n');
    
  } catch (error) {
    console.error('Error during enrichment:', error);
    process.exit(1);
  } finally {
    db.close();
  }
}

main().catch(console.error);
