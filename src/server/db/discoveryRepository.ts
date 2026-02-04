import { getDb } from './connection.js';
import { createHash } from 'crypto';

export interface DocumentPage {
  id?: number;
  document_id: number;
  page_number: number;
  extracted_text?: string;
  text_source: 'visible_layer' | 'hidden_layer' | 'ocr' | 'hybrid';
  ocr_confidence_avg?: number;
  ocr_quality_score?: number;
  phash?: string;
}

export interface DocumentSentence {
  id?: number;
  document_id: number;
  page_id?: number;
  sentence_index: number;
  sentence_text: string;
}

export const discoveryRepository = {
  /**
   * Add a page record.
   */
  addPage: (page: DocumentPage): number => {
    const db = getDb();
    const result = db
      .prepare(
        `
      INSERT INTO document_pages (
        document_id, page_number, extracted_text, text_source, ocr_confidence_avg, ocr_quality_score, phash
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `,
      )
      .run(
        page.document_id,
        page.page_number,
        page.extracted_text || null,
        page.text_source,
        page.ocr_confidence_avg || null,
        page.ocr_quality_score || null,
        page.phash || null,
      );
    return result.lastInsertRowid as number;
  },

  /**
   * Add a sentence record.
   */
  addSentence: (sentence: DocumentSentence): void => {
    const db = getDb();

    // 1. Normalize & Hash
    const norm = sentence.sentence_text.toLowerCase().replace(/\s+/g, ' ').trim();
    const hash = createHash('sha256').update(norm).digest('hex');

    // 2. Upsert Phrase & Get Status
    // We use get() because of RETURNING
    const phrase = db
      .prepare(
        `
      INSERT INTO boilerplate_phrases (sentence_hash, sentence_text_sample, frequency)
      VALUES (?, ?, 1)
      ON CONFLICT(sentence_hash) DO UPDATE SET frequency = frequency + 1
      RETURNING status
    `,
      )
      .get(hash, sentence.sentence_text) as { status: string };

    const isBoilerplate = phrase && phrase.status === 'confirmed' ? 1 : 0;

    // 3. Insert Sentence
    db.prepare(
      `
      INSERT INTO document_sentences (
        document_id, page_id, sentence_index, sentence_text, is_boilerplate, signal_score
      ) VALUES (?, ?, ?, ?, ?, 0.0)
    `,
    ).run(
      sentence.document_id,
      sentence.page_id || null,
      sentence.sentence_index,
      sentence.sentence_text,
      isBoilerplate,
    );
  },
};
