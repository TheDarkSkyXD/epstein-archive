import type {
  EntityListItemDto,
  EntityListResponseDto,
  SubjectCardListItemDto,
  SubjectsListResponseDto,
} from '@shared/dto/entities';

export const mapSubjectCardDto = (subject: any): SubjectCardListItemDto => ({
  id: String(subject.id),
  name: String(subject.name || subject.displayName || ''),
  role: String(subject.role || 'Unknown'),
  short_bio: subject.short_bio
    ? String(subject.short_bio)
    : subject.bio
      ? String(subject.bio)
      : undefined,
  stats: {
    mentions: Number(subject?.stats?.mentions ?? subject?.mentions ?? 0),
    documents: Number(subject?.stats?.documents ?? subject?.documents ?? 0),
    distinct_sources: Number(
      subject?.stats?.distinct_sources ??
        subject?.distinct_sources ??
        subject?.distinctSources ??
        0,
    ),
    verified_media: Number(
      subject?.stats?.verified_media ?? subject?.verified_media ?? subject?.mediaCount ?? 0,
    ),
  },
  forensics: {
    risk_level: String(subject?.forensics?.risk_level || subject?.riskLevel || 'LOW').toUpperCase(),
    evidence_ladder: (subject?.forensics?.evidence_ladder || subject?.ladder || 'NONE') as
      | 'L1'
      | 'L2'
      | 'L3'
      | 'NONE',
    red_flag_objective:
      typeof subject?.forensics?.red_flag_objective === 'number'
        ? subject.forensics.red_flag_objective
        : typeof subject?.redFlagRating === 'number'
          ? subject.redFlagRating
          : undefined,
    red_flag_subjective:
      typeof subject?.forensics?.red_flag_subjective === 'number'
        ? subject.forensics.red_flag_subjective
        : typeof subject?.redFlagRating === 'number'
          ? subject.redFlagRating
          : undefined,
    signal_strength: {
      exposure: Number(
        subject?.forensics?.signal_strength?.exposure ?? subject?.signals?.exposure ?? 0,
      ),
      connectivity: Number(
        subject?.forensics?.signal_strength?.connectivity ?? subject?.signals?.connectivity ?? 0,
      ),
      corroboration: Number(
        subject?.forensics?.signal_strength?.corroboration ?? subject?.signals?.corroboration ?? 0,
      ),
    },
    driver_labels: Array.isArray(subject?.forensics?.driver_labels)
      ? subject.forensics.driver_labels.map((value: unknown) => String(value))
      : Array.isArray(subject?.drivers)
        ? subject.drivers.map((value: unknown) => String(value))
        : [],
  },
  top_preview: subject?.top_preview,
});

export const mapSubjectsListResponseDto = (result: any): SubjectsListResponseDto => ({
  subjects: Array.isArray(result?.subjects) ? result.subjects.map(mapSubjectCardDto) : [],
  total: Number(result?.total || 0),
});

export const mapEntityListItemDto = (
  entity: any,
  photosByEntity: Record<string, any[]> = {},
): EntityListItemDto => ({
  id: entity.id,
  name: entity.full_name || entity.fullName || entity.name || 'Unknown',
  fullName: entity.full_name || entity.fullName || entity.name || 'Unknown',
  bio: entity.bio || '',
  entity_type: entity.entity_type || entity.entityType || 'Person',
  primaryRole: entity.primary_role || entity.primaryRole || 'Person of Interest',
  secondaryRoles: Array.isArray(entity.secondary_roles || entity.secondaryRoles)
    ? entity.secondary_roles || entity.secondaryRoles
    : [],
  mentions: Number(entity.mentions || 0),
  files: Number(entity.document_count || entity.files || entity.documentCount || 0),
  contexts: Array.isArray(entity.contexts) ? entity.contexts : [],
  evidence_types: Array.isArray(entity.evidence_types || entity.evidenceTypes)
    ? entity.evidence_types || entity.evidenceTypes
    : [],
  evidenceTypes: Array.isArray(entity.evidence_types || entity.evidenceTypes)
    ? entity.evidence_types || entity.evidenceTypes
    : [],
  photos: photosByEntity[String(entity.id)] || [],
  significant_passages: Array.isArray(entity.red_flag_passages || entity.significantPassages)
    ? entity.red_flag_passages || entity.significantPassages
    : [],
  likelihood_score: String((entity.risk_level || entity.riskLevel || 'LOW').toUpperCase()),
  red_flag_score: Number(entity.red_flag_score ?? 0),
  red_flag_rating: Number(entity.red_flag_rating ?? 0),
  red_flag_peppers:
    typeof entity.red_flag_rating === 'number' && entity.red_flag_rating > 0
      ? '🚩'.repeat(entity.red_flag_rating)
      : '🏳️',
  red_flag_description:
    entity.red_flag_description ||
    entity.redFlagDescription ||
    `Red Flag Index ${entity.red_flag_rating || entity.redFlagRating || 0}`,
  connectionsToEpstein: entity.connections_summary || entity.connectionsSummary || '',
});

export const mapEntityListResponseDto = (input: {
  entities: any[];
  total: number;
  page: number;
  pageSize: number;
  photosByEntity: Record<string, any[]>;
}): EntityListResponseDto => ({
  data: input.entities.map((entity) => mapEntityListItemDto(entity, input.photosByEntity)),
  total: Number(input.total || 0),
  page: Number(input.page || 1),
  pageSize: Number(input.pageSize || 0),
  totalPages: Math.ceil(Number(input.total || 0) / Math.max(1, Number(input.pageSize || 1))),
});
