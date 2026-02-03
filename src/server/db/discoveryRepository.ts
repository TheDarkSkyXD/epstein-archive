import { getDb } from './connection.js';

export interface DocumentPage {
  id?: number;
  document_id: number;
  page_number: number;
  extracted_text?: string;
  text_source: 'visible_layer' | 'hidden_layer' | 'ocr' | 'hybrid';
  ocr_confidence_avg?: number;
  ocr_quality_score?: number;
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
        document_id, page_number, extracted_text, text_source, ocr_confidence_avg, ocr_quality_score
      ) VALUES (?, ?, ?, ?, ?, ?)
    `,
      )
      .run(
        page.document_id,
        page.page_number,
        page.extracted_text || null,
        page.text_source,
        page.ocr_confidence_avg || null,
        page.ocr_quality_score || null,
      );
    return result.lastInsertRowid as number;
  },

  /**
   * Add a sentence record.
   */
  addSentence: (sentence: DocumentSentence): void => {
    const db = getDb();
    db.prepare(
      `
      INSERT INTO document_sentences (
        document_id, page_id, sentence_index, sentence_text
      ) VALUES (?, ?, ?, ?)
    `,
    ).run(
      sentence.document_id,
      sentence.page_id || null,
      sentence.sentence_index,
      sentence.sentence_text,
    );
  },
};
