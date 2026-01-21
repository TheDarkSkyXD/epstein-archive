import { getDb } from './connection.js';

// Common OCR errors in the Black Book and their corrections
// Format: [error, correction]
const OCR_CORRECTIONS: [string, string][] = [
  // Trump entries
  ['Trump, Donaic', 'Trump, Donald'],
  ['he Trump Organization', 'The Trump Organization'],
  ['Milania', 'Melania'],
  ['Truit Mas ne.', 'Trump Mansion'],
  ['Tomores Pa biasor Assoc.', 'Trump Plaza Business Assoc.'],
  // Common OCR pattern errors
  ['(и', '(h)'],
  ['(w)', '(w)'],
  ['(hf)', '(hf)'],
  ['฿', '(f)'], // Thai Baht symbol often misread
  // Name corrections
  ['AcDonald', 'McDonald'],
  ['Thoistrup', 'Tholstrup'],
];

/**
 * Apply OCR corrections to entry text
 */
function applyOcrCorrections(text: string): string {
  let corrected = text;
  for (const [error, correction] of OCR_CORRECTIONS) {
    corrected = corrected.replace(new RegExp(escapeRegExp(error), 'g'), correction);
  }
  return corrected;
}

function escapeRegExp(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Apply corrections to all entries in a result set
 */
function correctEntries<T extends { entry_text?: string; display_name?: string }>(
  entries: T[],
): T[] {
  return entries.map((entry) => ({
    ...entry,
    entry_text: entry.entry_text ? applyOcrCorrections(entry.entry_text) : entry.entry_text,
    display_name: entry.display_name ? applyOcrCorrections(entry.display_name) : entry.display_name,
  }));
}

export const blackBookRepository = {
  getBlackBookEntries: (filters?: {
    letter?: string;
    search?: string;
    hasPhone?: boolean;
    hasEmail?: boolean;
    hasAddress?: boolean;
    limit?: number;
  }) => {
    const db = getDb();
    const whereClauses: string[] = [];
    const params: any = {};

    // Build a computed display_name for filtering and sorting
    // Priority: linked entity name > first line of entry_text
    const displayNameExpr = `COALESCE(p.full_name, TRIM(SUBSTR(bb.entry_text, 1, CASE WHEN INSTR(bb.entry_text, char(10)) > 0 THEN INSTR(bb.entry_text, char(10)) - 1 ELSE LENGTH(bb.entry_text) END)))`;

    // Letter filter - match names that START with the letter (case-insensitive)
    if (filters?.letter && filters.letter !== 'ALL') {
      whereClauses.push(`UPPER(SUBSTR(${displayNameExpr}, 1, 1)) = UPPER(@letter)`);
      params.letter = filters.letter;
    }

    // Search filter - match anywhere in name, phone, email, or address
    if (filters?.search) {
      whereClauses.push(`(
        ${displayNameExpr} LIKE '%' || @search || '%' OR
        bb.phone_numbers LIKE '%' || @search || '%' OR
        bb.email_addresses LIKE '%' || @search || '%' OR
        bb.addresses LIKE '%' || @search || '%'
      )`);
      params.search = filters.search;
    }

    // Contact info filters
    if (filters?.hasPhone) {
      whereClauses.push(`bb.phone_numbers IS NOT NULL AND bb.phone_numbers != '[]'`);
    }
    if (filters?.hasEmail) {
      whereClauses.push(`bb.email_addresses IS NOT NULL AND bb.email_addresses != '[]'`);
    }
    if (filters?.hasAddress) {
      whereClauses.push(`bb.addresses IS NOT NULL AND bb.addresses != '[]'`);
    }

    const whereClause = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';
    const limitClause = filters?.limit ? `LIMIT ${filters.limit}` : '';

    const query = `
      SELECT
        bb.id,
        bb.person_id,
        bb.entry_text,
        bb.phone_numbers,
        bb.addresses,
        bb.email_addresses,
        bb.notes,
        p.full_name as person_name,
        ${displayNameExpr} as display_name
      FROM black_book_entries bb
      LEFT JOIN entities p ON bb.person_id = p.id
      ${whereClause}
      ORDER BY ${displayNameExpr} COLLATE NOCASE ASC
      ${limitClause}
    `;

    const entries = db.prepare(query).all(params) as any[];
    return correctEntries(entries);
  },

  getBlackBookReviewEntries: () => {
    const db = getDb();
    try {
      const entries = db
        .prepare(
          `
        SELECT 
          bb.id,
          bb.person_id,
          bb.entry_text,
          bb.phone_numbers,
          bb.addresses,
          bb.email_addresses,
          p.full_name as original_name,
          p.full_name as cleaned_name,
          p.needs_review
        FROM black_book_entries bb
        LEFT JOIN entities p ON bb.person_id = p.id
        WHERE 1=0
        ORDER BY bb.id ASC
      `,
        )
        .all();

      return entries;
    } catch (error) {
      console.error('Error fetching review entries:', error);
      return [];
    }
  },

  getBlackBookReviewStats: () => {
    const db = getDb();
    try {
      const stats = db
        .prepare(
          `
        SELECT 
          COUNT(*) as total,
          COUNT(CASE WHEN needs_review = 1 THEN 1 END) as remaining,
          COUNT(CASE WHEN needs_review = 0 OR manually_reviewed = 1 THEN 1 END) as reviewed
        FROM entities
        WHERE id IN (SELECT person_id FROM black_book_entries)
      `,
        )
        .get();

      return stats;
    } catch (error) {
      console.error('Error fetching review stats:', error);
      return { total: 0, remaining: 0, reviewed: 0 };
    }
  },

  updateBlackBookReview: (
    entryId: number,
    correctedName: string,
    action: 'approve' | 'skip' | 'delete',
  ) => {
    const db = getDb();
    try {
      // Get person_id from black_book_entry
      const entry = db
        .prepare(
          `
        SELECT person_id FROM black_book_entries WHERE id = ?
      `,
        )
        .get(entryId) as { person_id: number } | undefined;

      if (!entry) {
        throw new Error('Entry not found');
      }

      if (action === 'approve') {
        // Update name and mark as reviewed
        db.prepare(
          `
          UPDATE entities 
          SET full_name = ?, needs_review = 0, manually_reviewed = 1
          WHERE id = ?
        `,
        ).run(correctedName, entry.person_id);

        // Log the action
        db.prepare(
          `
          INSERT INTO data_quality_log (operation, entity_type, entity_id, details)
          VALUES (?, ?, ?, ?)
        `,
        ).run(
          'black_book_review',
          'person',
          entry.person_id,
          JSON.stringify({ action: 'approve', correctedName }),
        );
      } else if (action === 'skip') {
        // Just mark as manually reviewed but keep needs_review flag
        db.prepare(
          `
          UPDATE entities SET manually_reviewed = 1 WHERE id = ?
        `,
        ).run(entry.person_id);
      } else if (action === 'delete') {
        // Mark as deleted (soft delete)
        db.prepare(
          `
          UPDATE entities SET needs_review = 0, manually_reviewed = 1, full_name = '[DELETED]' WHERE id = ?
        `,
        ).run(entry.person_id);

        db.prepare(
          `
          INSERT INTO data_quality_log (operation, entity_type, entity_id, details)
          VALUES (?, ?, ?, ?)
        `,
        ).run('black_book_review', 'person', entry.person_id, JSON.stringify({ action: 'delete' }));
      }

      return { success: true };
    } catch (error) {
      console.error('Error updating review:', error);
      throw error;
    }
  },
};
