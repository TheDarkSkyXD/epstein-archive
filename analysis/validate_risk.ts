import Database from 'better-sqlite3';
import { join } from 'path';
import * as fs from 'fs';

const DB_PATH = join(process.cwd(), 'epstein-archive.db');
const db = new Database(DB_PATH);

console.log('='.repeat(80));
console.log('RISK VALIDATION (SPOT-CHECK HIGH RISK ENTITIES)');
console.log('='.repeat(80));

function validateRisk() {
  console.log('\n[1/1] Generating report for top 100 HIGH risk entities...');
  
  const highRiskEntities = db.prepare(`
    SELECT full_name, spice_score, spice_rating, mentions, likelihood_level
    FROM entities
    WHERE likelihood_level = 'HIGH'
    ORDER BY spice_score DESC
    LIMIT 100
  `).all() as any[];
  
  console.log(`Found ${highRiskEntities.length} HIGH risk entities for review`);
  
  const reportPath = join(process.cwd(), 'analysis', 'high_risk_validation_report.md');
  let reportContent = '# High Risk Entity Validation Report\n\n';
  reportContent += `Generated on: ${new Date().toLocaleString()}\n\n`;
  reportContent += '| Rank | Name | Spice Score | Rating | Mentions | Risk Level |\n';
  reportContent += '|------|------|-------------|--------|----------|------------|\n';
  
  highRiskEntities.forEach((entity, index) => {
    const peppers = '🌶️'.repeat(entity.spice_rating);
    reportContent += `| ${index + 1} | ${entity.full_name} | ${entity.spice_score} | ${peppers} (${entity.spice_rating}) | ${entity.mentions} | ${entity.likelihood_level} |\n`;
    
    // Print to console as well
    console.log(`${index + 1}. ${entity.full_name}`);
    console.log(`   Spice: ${entity.spice_score} (${peppers}) | Mentions: ${entity.mentions}`);
  });
  
  fs.writeFileSync(reportPath, reportContent);
  console.log(`\n✓ Report generated: ${reportPath}`);
  
  // Also check for potential false positives (High spice but low mentions)
  console.log('\nChecking for potential false positives (High Spice / Low Mentions)...');
  const falsePositives = db.prepare(`
    SELECT full_name, spice_score, mentions
    FROM entities
    WHERE spice_score > 50 AND mentions < 3
    ORDER BY spice_score DESC
    LIMIT 20
  `).all() as any[];
  
  if (falsePositives.length > 0) {
    console.log('Potential False Positives (Review Required):');
    falsePositives.forEach(e => {
      console.log(`  ${e.full_name}: Spice ${e.spice_score}, Mentions ${e.mentions}`);
    });
  } else {
    console.log('  None found.');
  }
}

validateRisk();
db.close();
