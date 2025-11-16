export interface Document {
  id: string;
  filename: string;
  title: string;
  content: string;
  fileType: 'email' | 'pdf' | 'txt' | 'doc' | 'image' | 'other';
  fileSize: number;
  dateCreated?: string;
  dateModified?: string;
  metadata: DocumentMetadata;
  entities: Entity[];
  passages: Passage[];
  spiceScore: number;
  spiceRating: number;
  spicePeppers: string;
  spiceDescription: string;
}

export interface DocumentMetadata {
  author?: string;
  recipient?: string;
  subject?: string;
  emailThread?: string;
  flightNumber?: string;
  flightDate?: string;
  flightFrom?: string;
  flightTo?: string;
  legalCase?: string;
  testimonyDate?: string;
  depositionDate?: string;
  tags: string[];
  categories: string[];
  confidentiality: 'public' | 'confidential' | 'sealed' | 'classified';
  source: string;
}

export interface Entity {
  name: string;
  type: 'person' | 'organization' | 'location' | 'email' | 'phone' | 'address' | 'date' | 'amount';
  mentions: number;
  contexts: EntityContext[];
  significance: 'high' | 'medium' | 'low';
  relatedEntities: string[];
}

export interface EntityContext {
  passage: string;
  context: string;
  position: number;
  file: string;
  date?: string;
  significance: 'high' | 'medium' | 'low';
}

export interface Passage {
  id: string;
  content: string;
  context: string;
  keywords: string[];
  entities: string[];
  spiceLevel: number;
  significance: 'high' | 'medium' | 'low';
  file: string;
  position: number;
  date?: string;
}

export interface DocumentSearchResult {
  document: Document;
  relevanceScore: number;
  matchingPassages: Passage[];
  matchingEntities: Entity[];
  searchHighlights: SearchHighlight[];
}

export interface SearchHighlight {
  field: string;
  text: string;
  start: number;
  end: number;
}

export interface DocumentCollection {
  documents: Document[];
  entities: Map<string, Entity>;
  totalFiles: number;
  totalSize: number;
  dateRange: {
    earliest?: string;
    latest?: string;
  };
  fileTypes: Map<string, number>;
  categories: Map<string, number>;
}

export interface BrowseFilters {
  fileType?: string[];
  dateRange?: {
    start?: string;
    end?: string;
  };
  entities?: string[];
  categories?: string[];
  spiceLevel?: {
    min: number;
    max: number;
  };
  confidentiality?: string[];
  source?: string[];
}

export interface BrowseOptions {
  filters: BrowseFilters;
  sortBy: 'relevance' | 'date' | 'spice' | 'fileType' | 'size';
  sortOrder: 'asc' | 'desc';
  page: number;
  pageSize: number;
}