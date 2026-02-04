import { createHash } from 'crypto';

export class BoilerplateService {
  private static instance: BoilerplateService;
  private knownBoilerplateHashes: Set<string>;

  private constructor() {
    this.knownBoilerplateHashes = new Set();
    // Initialize with known signatures
    this.addSignature('PRIVILEGED AND CONFIDENTIAL');
    this.addSignature('ATTORNEY CLIENT WORK PRODUCT');
    this.addSignature('UNITED STATES DISTRICT COURT');
    this.addSignature('SOUTHERN DISTRICT OF NEW YORK');
  }

  static getInstance(): BoilerplateService {
    if (!BoilerplateService.instance) {
      BoilerplateService.instance = new BoilerplateService();
    }
    return BoilerplateService.instance;
  }

  /**
   * Normalizes text for fuzzy matching:
   * - Lowercase
   * - Remove digits (OCR noise)
   * - Collapse whitespace
   * - Remove punctuation
   */
  normalize(text: string): string {
    return text
      .toLowerCase()
      .replace(/\d+/g, '') // Strip numbers (often vary in headers/dates)
      .replace(/[^\w\s]/g, '') // Strip punctuation
      .replace(/\s+/g, ' ')
      .trim();
  }

  generateHash(text: string): string {
    const normalized = this.normalize(text);
    return createHash('sha1').update(normalized).digest('hex');
  }

  addSignature(text: string) {
    this.knownBoilerplateHashes.add(this.generateHash(text));
  }

  isBoilerplate(text: string): boolean {
    if (text.length < 10) return false; // Too short to be boilerplate block

    const hash = this.generateHash(text);
    if (this.knownBoilerplateHashes.has(hash)) return true;

    // Heuristics for non-exact matches
    const normalized = this.normalize(text);

    // Legal headers
    if (
      normalized.includes('case') &&
      normalized.includes('document') &&
      normalized.includes('filed')
    )
      return true;
    if (normalized.includes('exhibit') && normalized.length < 50) return true;

    return false;
  }
}
