import type { DocumentListItemDto, DocumentsListResponseDto } from '@shared/dto/documents';

export const mapDocumentListItemDto = (doc: any): DocumentListItemDto => ({
  id: String(doc.id || ''),
  fileName: String(doc.fileName || ''),
  title: String(doc.title || doc.fileName || 'Untitled'),
  fileType: String(doc.fileType || 'unknown'),
  fileSize: Number(doc.fileSize || 0),
  dateCreated: doc.dateCreated || null,
  evidenceType: String(doc.evidenceType || 'document'),
  metadata: typeof doc.metadata === 'object' && doc.metadata ? doc.metadata : {},
  redFlagRating: Number(doc.redFlagRating || 0),
  wordCount: Number(doc.wordCount || 0),
  entitiesCount: Number(doc.entitiesCount || 0),
  keyEntities: Array.isArray(doc.keyEntities) ? doc.keyEntities.map((v: unknown) => String(v)) : [],
  sourceType: String(doc.sourceType || ''),
  previewText: String(doc.previewText || ''),
  previewKind: String(doc.previewKind || 'fallback'),
  whyFlagged: String(doc.whyFlagged || ''),
  entities_count: Number(doc.entities_count || doc.entitiesCount || 0),
  key_entities: Array.isArray(doc.key_entities)
    ? doc.key_entities.map((v: unknown) => String(v))
    : Array.isArray(doc.keyEntities)
      ? doc.keyEntities.map((v: unknown) => String(v))
      : [],
  source_type: String(doc.source_type || doc.sourceType || ''),
  preview_text: String(doc.preview_text || doc.previewText || ''),
  preview_kind: String(doc.preview_kind || doc.previewKind || 'fallback'),
  why_flagged: String(doc.why_flagged || doc.whyFlagged || ''),
});

export const mapDocumentsListResponseDto = (result: any): DocumentsListResponseDto => {
  const items = Array.isArray(result?.documents)
    ? result.documents
    : Array.isArray(result?.data)
      ? result.data
      : [];
  const pageSize = Number(result?.pageSize || result?.limit || 0);
  const total = Number(result?.total || 0);
  const page = Number(result?.page || 1);

  return {
    data: items.map(mapDocumentListItemDto),
    total,
    page,
    pageSize,
    totalPages: Number(result?.totalPages || Math.ceil(total / Math.max(1, pageSize))),
  };
};
