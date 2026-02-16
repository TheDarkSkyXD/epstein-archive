export interface DocumentListItemDto {
  id: string;
  fileName: string;
  title: string;
  fileType: string;
  fileSize: number;
  dateCreated: string | null;
  evidenceType: string;
  metadata: Record<string, unknown>;
  redFlagRating: number;
  wordCount: number;
  entitiesCount: number;
  keyEntities: string[];
  sourceType: string;
  previewText: string;
  previewKind: 'ai_summary' | 'excerpt' | 'fallback' | string;
  whyFlagged: string;
  entities_count: number;
  key_entities: string[];
  source_type: string;
  preview_text: string;
  preview_kind: string;
  why_flagged: string;
}

export interface DocumentsListResponseDto {
  data: DocumentListItemDto[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface DocumentDetailDto {
  id: string;
  fileName?: string;
  filePath?: string;
  fileType?: string;
  fileSize?: number;
  dateCreated?: string | null;
  title?: string;
  content?: string;
  contentRefined?: string;
  contentPreview?: string;
  metadata?: Record<string, unknown>;
  evidenceType?: string;
  redFlagRating?: number;
  sourceCollection?: string;
  fileUrl?: string;
  originalFileUrl?: string;
}
