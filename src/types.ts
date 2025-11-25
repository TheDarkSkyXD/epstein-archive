export interface Person {
  id?: string; // Add optional ID field
  name: string;
  title?: string; // Extracted title (e.g., "President", "Senator")
  role?: string; // Full role description (e.g., "President of the United States")
  secondary_roles?: string; // Comma-separated list of secondary roles
  secondaryRoles?: string[]; // Array of secondary roles from API
  status?: string; // Current status
  connections?: string; // Summary of connections
  title_variants?: string[]; // JSON array of all title variants found
  mentions: number;
  files: number;
  contexts: Array<{
    file: string;
    context: string;
    date: string;
    source?: string;
  }>;
  evidence_types: string[];
  spicy_passages: Array<{
    keyword: string;
    passage: string;
    filename: string;
    source?: string;
  }>;
  likelihood_score: 'HIGH' | 'MEDIUM' | 'LOW';
  spice_score: number;
  spice_rating: number;
  spice_peppers: string;
  spice_description: string;
  red_flag_index?: number; // Red Flag Index (0-5)
  risk_level?: 'HIGH' | 'MEDIUM' | 'LOW'; // Risk level
  fileReferences: {
    id?: string;
    filename: string;
    filePath: string;
    content?: string;
    contentPreview?: string;
    contextText?: string;
    aiSummary?: string;
    spiceRating?: number;
  }[];
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
  sortBy?: 'name' | 'mentions' | 'spice' | 'risk';
  sortOrder?: 'asc' | 'desc';
  minRedFlagIndex?: number;
  maxRedFlagIndex?: number;
}

export type SortOption = 'name' | 'mentions' | 'spice' | 'recent';