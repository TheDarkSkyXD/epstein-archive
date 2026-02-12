export interface User {
  id: string;
  username: string;
  email: string;
  role: 'admin' | 'investigator' | 'viewer';
  lastActive?: string;
}

export interface Photo {
  id: string;
  filePath: string;
  url?: string;
  fullUrl?: string;
  title?: string;
  redFlagRating?: number;
  type?: 'image' | 'video';
  thumbnail_path?: string;
  file_path?: string;
  path?: string;
}

export interface Person {
  id: number | string;
  name: string;
  fullName: string;
  full_name?: string;
  title?: string;
  role?: string;
  primaryRole?: string;
  primary_role?: string;
  secondary_roles?: string;
  secondaryRoles?: string[];
  status?: string;
  connections?: string;
  title_variants?: string[];
  mentions: number;
  files: number;
  documentCount?: number;
  contexts: Array<{
    file: string;
    context: string;
    date: string;
    source?: string;
  }>;
  evidence_types: string[];
  evidenceTypes?: string[];
  significant_passages: Array<{
    keyword: string;
    passage: string;
    filename: string;
    source?: string;
  }>;
  likelihood_score?: 'HIGH' | 'MEDIUM' | 'LOW' | string;
  likelihood_level?: string;
  likelihoodLevel?: string;
  red_flag_rating?: number;
  red_flag_score?: number;
  red_flag_peppers?: string;
  red_flag_description?: string;
  redFlagRating?: number;
  redFlagDescription?: string;
  risk_level?: 'HIGH' | 'MEDIUM' | 'LOW' | string;
  riskLevel?: string;
  entity_type?: string;
  entityType?: string;
  is_vip?: boolean | number;
  isVip?: boolean;
  blackBookEntries?: {
    id: number;
    phoneNumbers?: string[];
    emailAddresses?: string[];
    addresses?: string[];
    entryText?: string;
    notes?: string;
    entry_category?: string;
    document_id?: number;
  }[];
  hasBlackBook?: boolean;

  fileReferences: {
    id?: string;
    filename: string;
    filePath: string;
    content?: string;
    contentPreview?: string;
  }[];
  bio?: string;
  description?: string;
  birthDate?: string;
  deathDate?: string;
  birth_date?: string;
  death_date?: string;
  photos?: Photo[];

  // DB & Internal Fields
  connectionsSummary?: string;
  significantPassages?: any[];
  mediaCount?: number;
  timelineEvents?: any[];
  networkConnections?: any[];
  connectionsToEpstein?: string;
  wasAgentic?: boolean;
  was_agentic?: boolean;
  ingestRunId?: string;
  ingest_run_id?: string;
}

export interface Mention {
  person: string;
  file: string;
  context: string;
  date?: string;
  type: 'email' | 'document' | 'testimony' | 'flight_record';
}

export interface Evidence {
  id: string;
  person: string;
  type: 'email' | 'document' | 'testimony' | 'flight_record' | 'photo';
  title: string;
  content: string;
  date?: string;
  fileReference: string;
  significance: 'high' | 'medium' | 'low';
  redFlagRating?: number;
  source_collection?: string;
  file_type?: string;
  mentions?: number;
  documentId?: string;
  source?: string;
  filePath?: string;
  file_path?: string;
  original_file_path?: string;
  fileUrl?: string;
  originalFileUrl?: string;
  isScannedDocument?: boolean;
  metadataJson?: string;
  fileName?: string;
  ingestRunId?: string;
  wasAgentic?: boolean;
}

export interface SearchFilters {
  likelihood?: 'all' | 'HIGH' | 'MEDIUM' | 'LOW';
  role?: 'all' | string;
  status?: 'all' | string;
  minMentions?: number;
  searchTerm?: string;
  likelihoodScore?: ('HIGH' | 'MEDIUM' | 'LOW')[];
  maxMentions?: number;
  evidenceTypes?: string[];
  sortBy?: SortOption;
  sortOrder?: 'asc' | 'desc';
  minRedFlagIndex?: number;
  maxRedFlagIndex?: number;
  entityType?: string;
  dataSource?: string;
}

export type SortOption =
  | 'name'
  | 'mentions'
  | 'red_flag'
  | 'recent'
  | 'risk'
  | 'date-desc'
  | 'date-asc'
  | 'relevance'
  | 'document-count';

export interface SubjectCardDTO {
  id: string;
  name: string;
  role: string;
  short_bio?: string;
  stats: {
    mentions: number;
    documents: number;
    distinct_sources: number;
    verified_media: number;
  };
  forensics: {
    risk_level: 'HIGH' | 'MEDIUM' | 'LOW' | string;
    evidence_ladder: 'L1' | 'L2' | 'L3' | 'NONE';
    red_flag_rating?: number;
    signal_strength: {
      exposure: number;
      connectivity: number;
      corroboration: number;
    };
    driver_labels: string[];
  };
  top_preview?: {
    id: string;
    type: 'document' | 'flight_log' | 'black_book' | 'testimony';
    title: string;
    citation: string;
    confidence: number;
    year?: number;
  };
}
