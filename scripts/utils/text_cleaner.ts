/**
 * Text Cleaner Utility
 *
 * Provides specialized cleaning functions for:
 * 1. Email content (MIME decoding, unicode fixes, reply chain stripping)
 * 2. OCR content (fixing layout issues, removing garbage, normalizing characters)
 */

import { decode } from 'html-entities';
import quotedPrintable from 'quoted-printable';

export class TextCleaner {
  /**
   * Cleans text extracted from emails.
   * Focuses on encoding issues, HTML entities, and common email artifacts.
   */
  static cleanEmailText(text: string): string {
    if (!text) return '';

    let cleaned = text;

    // 0. Robust Quoted-Printable Decoding
    // Often email bodies come in partially decoded or with artifacts
    if (
      cleaned.includes('=') &&
      (cleaned.includes('=3D') || cleaned.includes('=\r\n') || cleaned.includes('=\n'))
    ) {
      try {
        cleaned = quotedPrintable.decode(cleaned);
      } catch (e) {
        // If standard decode fails, try to fix common softness
        cleaned = cleaned.replace(/=\r?\n/g, '');
      }
    }

    // Heuristic Fixes for specific corpus corruptions
    // 1. Fix "=9yo" -> "19yo" (User reported corruption where '1' became '=')
    cleaned = cleaned.replace(/=(\d)yo/gi, '1$1yo');

    // 2. Decode HTML entities (e.g., &nbsp;, &amp;)
    cleaned = decode(cleaned);

    // 3. Fix common Windows-1252 / UTF-8 Mojibake
    cleaned = cleaned
      .replace(/â€™/g, "'")
      .replace(/â€œ/g, '"')
      .replace(/â€/g, '"') // incomplete quote
      .replace(/â€“/g, '-')
      .replace(/â€¦/g, '...');

    // 3. Remove Null bytes and replacement characters
    cleaned = cleaned.replace(/\u0000/g, '').replace(/\uFFFD/g, '');

    // 4. Normalize Line Breaks
    // Collapse multiple empty lines into max 2
    cleaned = cleaned.replace(/\n\s*\n\s*\n/g, '\n\n');

    // 5. Remove commonly seen MIME boundary markers leaking into text
    cleaned = cleaned.replace(/--+[a-zA-Z0-9]+--+/g, '');
    cleaned = cleaned.replace(/Content-Type:.*$/gim, '');
    cleaned = cleaned.replace(/Content-Transfer-Encoding:.*$/gim, '');

    return cleaned.trim();
  }

  /**
   * Cleans text extracted via OCR (PDF or Image).
   * Focuses on layout repair, garbage character removal, and typo fixing.
   */
  static cleanOcrText(text: string): string {
    if (!text) return '';

    let cleaned = text;

    // 1. Remove Null bytes
    cleaned = cleaned.replace(/\u0000/g, '');

    // 2. Fix broken hyphenation at line ends
    // "com- \n plete" -> "complete"
    cleaned = cleaned.replace(/([a-z])-\s*\n\s*([a-z])/gi, '$1$2');

    // 3. Join lines that shouldn't be split
    // Heuristic: If line ends with a lower case letter and next starts with lower case, join them.
    // Be careful not to merge headers or lists.
    // This is simple/aggressive: "word \n word" -> "word word"
    // cleaned = cleaned.replace(/([a-z])\s*\n\s*([a-z])/g, '$1 $2');
    // ^ Commented out: too risky for structured docs without more context.

    // 4. Fix common OCR character confusion (mostly for numbers/letters in specific contexts if possible)
    // E.g. "l" as "1" or "O" as "0" is hard without a dictionary.
    // But we can clean "garbage" lines.

    // 5. Remove "Garbage" lines
    // Lines that are mostly symbols/numbers with few vowels/letters
    const lines = cleaned.split('\n');
    const validLines = lines.filter((line) => {
      const trimmed = line.trim();
      if (trimmed.length === 0) return true;
      if (trimmed.length < 3) return true; // keep page numbers etc

      // Calculate ratio of alphanumeric chars
      const alpha = (trimmed.match(/[a-zA-Z]/g) || []).length;
      const total = trimmed.length;

      // If line is long (>10 chars) but has very few letters (< 20%), it's likely noise/separators
      if (total > 10 && alpha / total < 0.2) {
        return false;
      }
      return true;
    });

    cleaned = validLines.join('\n');

    // 6. Normalize whitespace
    cleaned = cleaned.replace(/[ \t]+/g, ' '); // collapse horizontal whitespace

    return cleaned.trim();
  }
}
