
export interface OCREngine {
  name: string;
  supports(mimeType: string): boolean;
  process(filePath: string): Promise<OCRResult>;
}

export interface OCRResult {
  text: string;
  confidence: number; // 0 to 100
  engine: string;
  metadata?: Record<string, any>;
  durationMs: number;
  hasRedactions?: boolean;
  redactionRatio?: number; // 0 to 1, percentage of text that is redacted
}
