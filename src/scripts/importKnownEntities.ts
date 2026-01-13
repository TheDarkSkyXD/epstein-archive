import fs from 'fs';
import path from 'path';
import Database from 'better-sqlite3';

function parseRtfLines(rtf: string): string[] {
  const lines: string[] = [];
  rtf.split('\n').forEach((l) => {
    const cleaned = l
      .replace(/\\[a-z]+\d*/gi, '')
      .replace(/[{}]/g, '')
      .trim();
    if (cleaned) {
      // RTF list has names separated by backslash line breaks
      cleaned.split('\\').forEach((part) => {
        const name = part.trim();
        if (name) lines.push(name);
      });
    }
  });
  return Array.from(new Set(lines));
}

function upsertEntity(
  db: Database.Database,
  fullName: string,
  opts?: { primaryRole?: string; connectionsSummary?: string },
) {
  const existing = db.prepare('SELECT id FROM entities WHERE full_name = ?').get(fullName) as
    | { id: number }
    | undefined;
  if (existing) {
    if (opts?.primaryRole || opts?.connectionsSummary) {
      db.prepare(
        'UPDATE entities SET primary_role = COALESCE(?, primary_role), connections_summary = COALESCE(?, connections_summary), updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      ).run(opts?.primaryRole || null, opts?.connectionsSummary || null, existing.id);
    }
    return existing.id;
  }
  const result = db
    .prepare(
      'INSERT INTO entities (full_name, primary_role, likelihood_level, mentions, red_flag_rating, red_flag_score) VALUES (?, ?, ?, ?, ?, ?)',
    )
    .run(fullName, opts?.primaryRole || null, 'MEDIUM', 0, 0, 0);
  return Number(result.lastInsertRowid);
}

async function main() {
  const projectRoot = process.cwd();
  const rtfPathCandidates = [
    path.join(projectRoot, 'Known Entitites.rtf'),
    path.join(projectRoot, 'Known Entities.rtf'),
  ];
  const rtfPath = rtfPathCandidates.find((p) => fs.existsSync(p));
  if (!rtfPath) {
    console.error('Known Entities RTF not found');
    process.exit(1);
  }
  const rtfContent = fs.readFileSync(rtfPath, 'utf8');
  const names = parseRtfLines(rtfContent);
  if (!names.length) {
    console.error('No names parsed from RTF');
    process.exit(1);
  }

  const dbPath = path.join(projectRoot, 'epstein-archive.db');
  const db = new Database(dbPath);

  db.pragma('foreign_keys = ON');
  const insertTxn = db.transaction(() => {
    names.forEach((n) => {
      if (!n || n.length < 2) return;
      // Special handling for Bubba
      if (n.toLowerCase() === 'bubba') {
        const id = upsertEntity(db, 'Bubba', {
          primaryRole: 'Unknown Private Individual',
          connectionsSummary: 'Per Mark Epstein, not Bill Clinton; treat distinctly',
        });
        // Ensure Bill Clinton remains separate
        const bill = db
          .prepare('SELECT id FROM entities WHERE full_name = ?')
          .get('Bill Clinton') as { id: number } | undefined;
        if (bill) {
          // Optional: add note to avoid conflation
          db.prepare(
            'UPDATE entities SET connections_summary = COALESCE(connections_summary, ?) WHERE id = ?',
          ).run('Distinct from alias "Bubba"; do not merge', bill.id);
        }
        return;
      }
      upsertEntity(db, n);
    });
  });

  insertTxn();
  db.close();
  console.log(`Imported/ensured ${names.length} known entities (including Bubba mapping)`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
