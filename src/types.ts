export interface User {
  id: string;
  username: string;
  email: string;
  role: 'admin' | 'investigator' | 'viewer';
  lastActive?: string;
}

export interface Person {
  id?: string; // Add optional ID field
  name: string;
  title?: string; // Extracted title (e.g., "President", "Senator")
  role?: string; // Full role description (e.g., "President of the United States")
  primaryRole?: string; // Primary role from DB
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
  red_flag_rating?: number; // Red Flag Rating (0-5) - current field
  red_flag_score?: number; // Red Flag Score
  red_flag_peppers?: string; // Red Flag Peppers visualization
  red_flag_description?: string; // Red Flag Description
  risk_level?: 'HIGH' | 'MEDIUM' | 'LOW'; // Risk level
  entity_type?: string;
  entityType?: string;
  blackBookEntry?: {
    phoneNumbers?: string[];
    emailAddresses?: string[];
    addresses?: string[];
    notes?: string;
  };
  fileReferences: {
    id?: string;
    filename: string;
    filePath: string;
    content?: string;
    contentPreview?: string;
  }[];
  photos?: {
    id: string;
    filePath: string;
    title?: string;
    redFlagRating?: number;
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
  sortBy?: 'name' | 'mentions' | 'red_flag' | 'risk';
  sortOrder?: 'asc' | 'desc';
  minRedFlagIndex?: number;
  maxRedFlagIndex?: number;
  entityType?: string;
  dataSource?: string; // Filter by data source (e.g., 'black_book', 'seventh_production')
}

export type SortOption = 'name' | 'mentions' | 'red_flag' | 'recent' | 'spice' | 'risk';
