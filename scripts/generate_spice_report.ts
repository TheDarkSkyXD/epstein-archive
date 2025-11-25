import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

const DB_PATH = path.join(process.cwd(), 'epstein-archive.db');
const REPORT_PATH = path.join(process.cwd(), 'spice_report.md');

async function generateReport() {
  console.log('Generating spice report...');
  
  if (!fs.existsSync(DB_PATH)) {
    console.error('Database not found:', DB_PATH);
    process.exit(1);
  }

  const db = new Database(DB_PATH);

  try {
    // Get top 100 entities by spice score
    const entities = db.prepare(`
      SELECT id, full_name, spice_rating, mentions
      FROM entities
      ORDER BY spice_rating DESC
      LIMIT 100
    `).all() as any[];

    let report = '# Spice Score Review Report\n\n';
    report += 'Top 100 entities by spice score. Please review for accuracy.\n\n';
    report += '| Rank | Name | Spice Score | Mentions | Sample Context |\n';
    report += '|---|---|---|---|---|\n';

    for (let i = 0; i < entities.length; i++) {
      const entity = entities[i];
      
      // Get sample mentions
      const mentions = db.prepare(`
        SELECT context_text
        FROM entity_mentions
        WHERE entity_id = ? AND context_text IS NOT NULL AND context_text != ''
        LIMIT 3
      `).all(entity.id) as any[];

      let contextSample = '';
      if (mentions.length > 0) {
        contextSample = mentions.map(m => `> ...${m.context_text.substring(0, 100)}...`).join('<br><br>');
      } else {
        contextSample = 'No context available';
      }

      // Escape pipes in context
      contextSample = contextSample.replace(/\|/g, '\\|');

      report += `| ${i + 1} | **${entity.full_name}** | ${entity.spice_rating} | ${entity.mentions} | ${contextSample} |\n`;
    }

    fs.writeFileSync(REPORT_PATH, report);
    console.log(`Report generated at ${REPORT_PATH}`);

  } catch (error) {
    console.error('Error generating report:', error);
  } finally {
    db.close();
  }
}

generateReport();
