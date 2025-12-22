
import fs from 'fs';
import pdfParse from 'pdf-parse';
import { OCREngine, OCRResult } from './types.js';

export class PDFExtractEngine implements OCREngine {
  name = 'PDF Text Extraction (Native)';

  supports(mimeType: string): boolean {
    return mimeType === 'application/pdf';
  }

  async process(filePath: string): Promise<OCRResult> {
    const start = Date.now();
    try {
      const dataBuffer = fs.readFileSync(filePath);
      const data = await pdfParse(dataBuffer);
      
      const text = data.text;
      
      // Heuristic confidence:
      // If text is very short but PDF has many pages, confidence is low (likely scanned images)
      // If text density is high, confidence is high.
      const pageCount = data.numpages;
      const charCount = text.length;
      
      // Arbitrary heuristic: < 50 chars per page suggests it might be a scan with no text layer
      const charsPerPage = pageCount > 0 ? charCount / pageCount : 0;
      let confidence = 95; // Default high for native extraction
      
      if (charsPerPage < 50) {
        confidence = 10; // Very low confidence, probably just headers/footers or empty
      } else if (charsPerPage < 200) {
        confidence = 50; // Medium
      }

      return {
        text,
        confidence,
        engine: this.name,
        durationMs: Date.now() - start,
        metadata: {
          pages: pageCount,
          info: data.info,
          version: data.version
        }
      };
    } catch (error) {
      // Return error result or throw?
      // For competition, throwing is fine, the manager catches it.
      throw new Error(`PDF Extract failed: ${error}`);
    }
  }
}
